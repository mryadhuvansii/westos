import {apiError, getStoreData} from '@/server/store-data';
import {filterProducts} from '@/lib/catalog';
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;
function paginate<T>(items:readonly T[],page:number,limit:number){const start=(page-1)*limit;return items.slice(start,start+limit);}
export async function GET(request:Request) {
  try {
    const {products,settings,initialized}=await getStoreData();
    const url=new URL(request.url);
    const hasFilter=url.searchParams.has('q')||url.searchParams.has('category')||url.searchParams.has('fit')||url.searchParams.has('collection')||url.searchParams.has('sort')||url.searchParams.has('page')||url.searchParams.has('limit');
    if(!hasFilter)return Response.json({products,settings,initialized},{headers:{'Cache-Control':'no-store'}});
    const query=url.searchParams.get('q')||'';
    const category=url.searchParams.get('category')||'';
    const fit=url.searchParams.get('fit')||'';
    const collection=url.searchParams.get('collection')||'';
    const sort=url.searchParams.get('sort')||'';
    const page=Math.max(1,parseInt(url.searchParams.get('page')??'1',10));
    const limit=Math.min(100,Math.max(1,parseInt(url.searchParams.get('limit')??PAGE_SIZE.toString(),10)));
    const published=products.filter(product=>product.status==='published');
    const filtered=filterProducts(published,{query,category,fit,collection,sort});
    return Response.json({products:paginate(filtered,page,limit),total:filtered.length,page,limit,pageCount:Math.ceil(filtered.length/limit),settings,initialized},{headers:{'Cache-Control':'no-store'}});
  } catch (error) { return apiError(error); }
}
