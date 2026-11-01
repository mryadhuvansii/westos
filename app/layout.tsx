import type {Metadata} from 'next';
import {StoreProvider} from '@/components/store';
import Header from '@/components/header';
import Footer from '@/components/footer';
import './globals.css';
import './secondary.css';
export const metadata: Metadata={metadataBase:new URL('https://westos-denim-studio.heartytune5.chatgpt.site'),title:{default:'WESTOS — Made for your everyday',template:'%s | WESTOS'},description:'Discover your everyday denim. Explore the WESTOS sample collection, find your fit, and meet Wear. Return. Renew.',robots:{index:false,follow:false},openGraph:{title:'WESTOS — Made for your everyday',description:'Good denim. Great stories.',images:['/images/hero.webp']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><StoreProvider><a className="skip-link" href="#main-content">Skip to content</a><Header/><main id="main-content">{children}</main><Footer/></StoreProvider></body></html>;}
