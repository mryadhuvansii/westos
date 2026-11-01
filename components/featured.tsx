'use client';
import {useState} from 'react';
import Link from 'next/link';
import {products} from '@/lib/catalog';
import ProductCard from './product-card';
import {Icon} from './icon';
export default function Featured(){const [category,setCategory]=useState('All');const selected=category==='All'?[products[0],products[2],products[6],products[4]]:products.filter(p=>p.category===category).slice(0,4);return <section className="container section-space" id="the-edit"><div className="section-heading"><div><p className="eyebrow">THE EVERYDAY EDIT</p><h2>Your next favourite pair.</h2></div><Link className="text-link" href="/shop/">Explore all denim <Icon name="arrow" size={19}/></Link></div><div className="edit-tabs" role="group" aria-label="Featured products category">{['All','Men','Women'].map(c=><button key={c} className={c===category?'active':''} aria-pressed={c===category} onClick={()=>setCategory(c)}>{c==='All'?'All denim':`For ${c.toLowerCase()}`}</button>)}<span>A few good places to start.</span></div><div className="product-grid">{selected.map(p=><ProductCard product={p} key={p.id}/>)}</div></section>;}
