import {MetadataRoute} from 'next';
import {getStoreData} from '@/server/store-data';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const {products}=await getStoreData();
  const published=products.filter(p=>p.status==='published');
  const base='https://westos-denim-studio.westosjeans.chatgpt.site';
  const routes=['','/shop/','/cart/','/wishlist/','/account/','/fit-guide/','/help/','/story/','/buyback/','/payment/'].map(route=>({
    url:`${base}${route}`,
    lastModified:new Date().toISOString(),
    changeFrequency:'weekly' as const,
    priority:route==='/'?1:0.8,
  }));
  const productRoutes=published.map(p=>({
    url:`${base}/product/${p.slug}/`,
    lastModified:p.updatedAt?new Date(p.updatedAt):new Date().toISOString(),
    changeFrequency:'monthly' as const,
    priority:0.9,
  }));
  return [...routes,...productRoutes];
}