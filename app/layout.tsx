import type {Metadata} from 'next';
import {StoreProvider} from '@/components/store';
import Header from '@/components/header';
import Footer from '@/components/footer';
import {getStoreData} from '@/server/store-data';
import './globals.css';
import './secondary.css';
export const metadata: Metadata={metadataBase:new URL('https://westos-denim-studio.westosjeans.chatgpt.site'),title:{default:'WESTOS — Made for your everyday',template:'%s | WESTOS'},description:'Discover your everyday denim. Explore the WESTOS sample collection, find your fit, and meet Wear. Return. Renew.',robots:{index:false,follow:false},openGraph:{title:'WESTOS — Made for your everyday',description:'Good denim. Great stories.',images:['/images/hero.webp']}};
export const dynamic='force-dynamic';
export default async function RootLayout({children}:{children:React.ReactNode}){const initialData=await getStoreData();return <html lang="en" data-scroll-behavior="smooth"><body><StoreProvider initialData={initialData}><a className="skip-link" href="#main-content">Skip to content</a><Header/><main id="main-content">{children}</main><Footer/></StoreProvider></body></html>;}
