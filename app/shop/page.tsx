import type {Metadata} from 'next';
import {Suspense} from 'react';
import Link from 'next/link';
import Catalog from '@/components/catalog';
export const metadata:Metadata={title:'Shop the denim collection',description:'Find your everyday fit. Explore WESTOS men’s and women’s denim in the sample collection.'};
export default function Shop(){return <div className="container catalog-page"><div className="page-heading"><div className="breadcrumb"><Link href="/">Home</Link><span>/</span><span>The denim collection</span></div><p className="eyebrow">GOOD DENIM STARTS HERE</p><h1>Denim for your everyday.</h1><p>Different fits. Different washes. All kinds of you.<br/>Find the pair that feels like your kind of day.</p></div><Suspense fallback={<div className="loading-page">Finding your next favourite…</div>}><Catalog/></Suspense></div>;}
