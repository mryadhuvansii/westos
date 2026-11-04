import {getStoreData} from '@/server/store-data';
export const dynamic = 'force-dynamic';
export async function GET() {
  const {products}=await getStoreData();
  const published=products.filter(p=>p.status==='published');
  const base='https://westos-denim-studio.westosjeans.chatgpt.site';
  const routes=['','/shop/','/cart/','/wishlist/','/account/','/fit-guide/','/help/','/story/','/buyback/','/payment/'].map(route=>`
    <url><loc>${base}${route}</loc><lastmod>${new Date().toISOString()}</lastmod><changefreq>weekly</changefreq><priority>${route==='/'?'1.0':'0.8'}</priority></url>`).join('');
  const productRoutes=published.map(p=>`
    <url><loc>${base}/product/${p.slug}/</loc><lastmod>${p.updatedAt?new Date(p.updatedAt):new Date().toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>`).join('');
  const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes}${productRoutes}</urlset>`;
  return new Response(xml,{headers:{'Content-Type':'application/xml','Cache-Control':'no-store'}});
}