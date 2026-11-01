import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PaymentLedger } from './payment-ledger.ts';
import { createYoupiPayment, getYoupiPayment, verifyYoupiWebhook, classifyYoupiPayment, type YoupiConfig } from './youpi.ts';

export type PaymentApiConfig = YoupiConfig & { enabled:boolean; storefrontOrigin:string; internalKey:string; webhookSecret:string };
const MAX_BODY = 16_384;
const CREATION_BUDGET_MS = 16_000; // The gateway adapter allows 15 seconds before aborting creation.
const bearer = (req:IncomingMessage) => /^Bearer ([A-Za-z0-9_-]+)$/.exec(req.headers.authorization || '')?.[1] || '';
function matches(a:string,b:string) { return !!b && a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b)); }
async function bodyBytes(req:IncomingMessage) { const chunks:Buffer[]=[];let size=0;for await (const chunk of req){size+=chunk.length;if(size>MAX_BODY)throw new Error('Request is too large.');chunks.push(Buffer.from(chunk));}return Buffer.concat(chunks); }
function jsonObject(raw:Buffer): Record<string,unknown> { const value=JSON.parse(raw.toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('A JSON object is required.');return value; }
function respond(res:ServerResponse,code:number,value:unknown) { res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value)); }

/** Separate API: prices enter only through the authenticated order-service boundary. */
export function createPaymentApi(config:PaymentApiConfig,ledger:PaymentLedger,fetcher:typeof fetch=fetch){
  const storefront=new URL(config.storefrontOrigin),origin=storefront.origin;
  const loopback=['localhost','127.0.0.1','[::1]'].includes(storefront.hostname);
  if((storefront.protocol!=='https:'&&!(storefront.protocol==='http:'&&loopback))||storefront.username||storefront.password||storefront.pathname!=='/'||storefront.search||storefront.hash)throw new Error('Configure a bare HTTPS storefront origin (HTTP is allowed on loopback only).');
  if(config.enabled&&(!/^[A-Za-z0-9_-]{32,}$/.test(config.internalKey)||config.webhookSecret.length<32))throw new Error('Configure strong server-only payment secrets before enabling the bridge.');
  // ponytail: one-process request coalescing; use a database lease if running multiple payment API replicas.
  const creating=new Map<string,Promise<string>>();
  const server=createServer(async(req,res)=>{
    const requestOrigin=req.headers.origin;
    if(requestOrigin&&requestOrigin!==origin){respond(res,403,{error:'Origin not allowed.'});return;}
    if(requestOrigin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'});res.end();return;}
    let pathname='';
    try {
      pathname=new URL(req.url||'/', 'http://localhost').pathname;
      if(req.method==='GET'&&pathname==='/v1/payments/config'){respond(res,200,{provider:'YouPI-PG',enabled:config.enabled});return;}
      if(!config.enabled){respond(res,503,{error:'Payments are not configured yet.',code:'PAYMENTS_NOT_READY'});return;}
      if(req.method==='POST'&&pathname==='/internal/checkouts'){
        if(requestOrigin||!matches(bearer(req),config.internalKey)){respond(res,401,{error:'Server authorization required.'});return;}
        const body=jsonObject(await bodyBytes(req));
        if(Object.keys(body).some(k=>!['orderId','amountPaise','expiresAt'].includes(k)))throw new Error('Unexpected checkout fields.');
        if(typeof body.orderId!=='string'||typeof body.amountPaise!=='number'||typeof body.expiresAt!=='number')throw new Error('Invalid approved checkout.');
        // Only the trusted order backend can register totals after stock, shipping, tax and discount validation.
        const approved=ledger.register({orderId:body.orderId,amountPaise:body.amountPaise,expiresAt:body.expiresAt});
        const hash=new URLSearchParams({orderId:approved.orderId,token:approved.accessToken});
        respond(res,201,{...approved,handoffUrl:`${origin}/payment/#${hash}`});return;
      }
      if(req.method==='POST'&&pathname==='/v1/payments/session'){
        const body=jsonObject(await bodyBytes(req));
        if(Object.keys(body).length!==1||typeof body.orderId!=='string')throw new Error('Only the approved order ID may be supplied.');
        let order;try{order=ledger.get(body.orderId,bearer(req));}catch{respond(res,401,{error:'Payment session is unavailable. Please return to checkout.'});return;}
        if(order.status!=='pending'||order.expiresAt<=Date.now()+(order.paymentId?0:CREATION_BUDGET_MS)){respond(res,409,{error:'This checkout cannot start a new payment. Please obtain a fresh checkout approval.'});return;}
        let checkoutUrl=order.checkoutUrl;
        if(!checkoutUrl){
          let job=creating.get(order.orderId);
          if(!job){
            const expected=order;
            job=(async()=>{const payment=await createYoupiPayment(config,{orderId:expected.orderId,amountPaise:expected.amountPaise,returnUrl:`${origin}/payment/?return=1`},fetcher);ledger.setAttempt(expected.orderId,payment.paymentId,payment.checkoutUrl);return payment.checkoutUrl;})();
            creating.set(order.orderId,job);
          }
          try{checkoutUrl=await job;}finally{creating.delete(order.orderId);}
        }
        respond(res,200,{checkoutUrl});return;
      }
      if(req.method==='POST'&&pathname==='/v1/payments/webhook'){
        const raw=await bodyBytes(req);
        const headers=Object.fromEntries(Object.entries(req.headers).filter((pair):pair is [string,string]=>typeof pair[1]==='string'));
        const event=verifyYoupiWebhook(raw,headers,config.webhookSecret);
        const order=ledger.getInternal(event.orderId);
        if(!order.paymentId)throw new Error('Payment attempt is not registered yet.');
        const status=classifyYoupiPayment(event,{orderId:order.orderId,paymentId:order.paymentId,amountPaise:order.amountPaise});
        const result=ledger.record({deliveryId:event.deliveryId,orderId:event.orderId,paymentId:event.paymentId,amountPaise:event.amountPaise,status,utr:event.utr});
        respond(res,200,{received:true,...result});return;
      }
      if(req.method==='GET'&&pathname.startsWith('/v1/payments/')){
        const id=decodeURIComponent(pathname.slice('/v1/payments/'.length));
        let order;try{order=ledger.get(id,bearer(req));}catch{respond(res,401,{error:'Payment session is unavailable. Please return to checkout.'});return;}
        let gatewayStatus:string|undefined;
        if(order.paymentId&&order.status!=='paid'){
          try{const payment=await getYoupiPayment(config,order.paymentId,fetcher);classifyYoupiPayment(payment,{orderId:order.orderId,paymentId:order.paymentId,amountPaise:order.amountPaise});gatewayStatus=payment.status;}catch{/* The durable state remains authoritative when the gateway cannot be reached. */}
        }
        // Status lookup lacks UTR in this upstream revision: reconciliation alone cannot bypass the verified receipt journal.
        const resumable=!order.paymentId||['INITIATED','QUEUED','ACTIVE'].includes(gatewayStatus||'');
        respond(res,200,{orderId:order.orderId,amountPaise:order.amountPaise,status:order.status,gatewayStatus,canPay:order.status==='pending'&&resumable&&order.expiresAt>Date.now()+(order.paymentId?0:CREATION_BUDGET_MS)});return;
      }
      respond(res,404,{error:'Not found.'});
    }catch{respond(res,400,{error:pathname.endsWith('/webhook')?'Payment notification could not be verified.':'The request could not be completed. Check the approved checkout or try again.'});}
  });
  server.requestTimeout=15_000;server.headersTimeout=10_000;
  return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const filename=resolve(process.env.WESTOS_PAYMENT_DB||'.local/payments.sqlite');mkdirSync(dirname(filename),{recursive:true});
  const config:PaymentApiConfig={enabled:process.env.WESTOS_PAYMENTS_ENABLED==='true',apiUrl:process.env.YOUPI_API_URL||'',checkoutOrigin:process.env.YOUPI_CHECKOUT_ORIGIN||'',merchantId:process.env.YOUPI_MERCHANT_ID||'',merchantKey:process.env.YOUPI_MERCHANT_KEY||'',webhookSecret:process.env.YOUPI_WEBHOOK_SECRET||'',internalKey:process.env.WESTOS_CHECKOUT_INTERNAL_KEY||'',storefrontOrigin:process.env.WESTOS_STOREFRONT_ORIGIN||'http://127.0.0.1:3000'};
  if(config.enabled&&[config.apiUrl,config.checkoutOrigin,config.merchantId,config.merchantKey].some(v=>!v))throw new Error('Complete the YouPI configuration before enabling payments.');
  const ledger=new PaymentLedger(filename),server=createPaymentApi(config,ledger),port=Number(process.env.WESTOS_PAYMENT_PORT||8787);
  server.listen(port,'127.0.0.1',()=>console.log(`WESTOS payment bridge: http://127.0.0.1:${port} (${config.enabled?'configured':'disabled — setup required'})`));
  for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(()=>{ledger.close();process.exit(0);}));
}
