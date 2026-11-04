import {notFound} from 'next/navigation';
import {getStoreData} from '@/server/store-data';
import ProductDetail from '@/components/product-detail';
import {formatPrice} from '@/lib/catalog';
const digitsOnly=(s:string)=>s.split('').filter(c=>'0123456789.'.includes(c)).join('');
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {products}=await getStoreData();const product=products.find(p=>p.slug===slug);return {title:product?.name||'Product not found',description:product?.description};}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {products}=await getStoreData();const product=products.find(p=>p.slug===slug);if(!product)notFound();return <><div className="product-json-ld" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org/','@type':'Product',name:product.name,slug:product.slug,brand:{'@type':'Brand',name:product.brand||'WESTOS'},sku:product.article_code||product.id,description:product.description,image:product.colors?.[0]?.images?.[0]??product.image,offers:{'@type':'AggregateOffer',priceCurrency:'INR',lowPrice:digitsOnly(formatPrice(product.price)),highPrice:digitsOnly(formatPrice(product.mrp)),offerCount:product.variants.length}})}}/><ProductDetail key={slug} slug={slug}/></>;}
