'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useRef,useState,type CSSProperties,type PointerEvent} from 'react';
import {products,formatPrice,type Product} from '@/lib/catalog';
import ProductOptions from './product-options';
import {Icon} from './icon';

// ponytail: perspective image planes cannot show a real reverse side; use validated glTF garment models for a genuine 360° viewer.
const railImage=(p:Product)=>p.color==='Indigo'?'/images/rail-indigo.webp':'/images/rail-faded-blue.webp';

export default function DenimRoom(){
  const [category,setCategory]=useState('All'),[selected,setSelected]=useState<Product|null>(null),[dragging,setDragging]=useState(false);
  const viewport=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null);
  const gesture=useRef({x:0,left:0,down:false,moved:false});
  const visible=products.filter(p=>category==='All'||p.category===category);
  useEffect(()=>{if(selected)dialog.current?.showModal();},[selected]);
  function selectCategory(value:string){setCategory(value);viewport.current?.scrollTo({left:0,behavior:'instant'});}
  function pointerDown(e:PointerEvent<HTMLDivElement>){gesture.current.moved=false;if(e.pointerType!=='mouse'||e.button!==0)return;gesture.current={x:e.clientX,left:e.currentTarget.scrollLeft,down:true,moved:false};}
  function pointerMove(e:PointerEvent<HTMLDivElement>){const g=gesture.current;if(!g.down)return;if(!(e.buttons&1)){pointerEnd(e);return;}const delta=e.clientX-g.x;if(!g.moved&&Math.abs(delta)<6)return;if(!g.moved){g.moved=true;setDragging(true);e.currentTarget.setPointerCapture(e.pointerId);}e.currentTarget.scrollLeft=g.left-delta;}
  function pointerEnd(e:PointerEvent<HTMLDivElement>){gesture.current.down=false;setDragging(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
  function moveRail(direction:number){const el=viewport.current;if(el)el.scrollBy({left:direction*el.clientWidth*.6,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  function openPair(p:Product){setSelected(p);}
  return <>
    <section className="denim-room" aria-labelledby="room-title">
      <div className="room-light room-light-left" aria-hidden="true"/><div className="room-light room-light-right" aria-hidden="true"/>
      <div className="room-intro"><div><p className="room-kicker"><span/> WESTOS STUDIO / COLLECTION 01</p><h1 id="room-title">THE DENIM <span>ROOM.</span></h1></div><div className="room-intro-right"><p>Your life. Your fit. Your WESTOS.</p><div className="room-filters" role="group" aria-label="Show jeans on the rail">{['All','Men','Women'].map(value=><button key={value} className={category===value?'active':''} aria-pressed={category===value} onClick={()=>selectCategory(value)}>{value}<sup>{value==='All'?products.length:products.filter(p=>p.category===value).length}</sup></button>)}</div></div></div>
      <div className="room-wall-word" aria-hidden="true">EVERYDAY, REIMAGINED.</div>
      <div className="room-rail" aria-hidden="true"><i/><i/></div>
      <div ref={viewport} className={`rail-viewport ${dragging?'is-dragging':''}`} role="region" aria-label="Interactive jeans rail" tabIndex={0} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onClickCapture={e=>{const moved=gesture.current.moved;gesture.current.moved=false;if(moved&&e.detail>0){e.preventDefault();e.stopPropagation();}}}>
        <div className="rail-track">
          {visible.map((p,i)=><button key={p.id} className={`rail-pair wash-${p.color.toLowerCase().replaceAll(' ','-')}`} style={{'--lean':`${i%2===0?-17:17}deg`,'--pair-width':p.fit==='Slim'?'.87':p.fit==='Baggy'?'1.10':'1'} as CSSProperties} aria-label={`Explore ${p.name}, ${p.fit} fit, ${formatPrice(p.price)}`} onClick={()=>openPair(p)}><span className="pair-figure"><Image src={railImage(p)} alt={`${p.color} denim hanging from a chrome trouser hanger`} fill sizes="(max-width:640px) 220px, 250px" priority={i<4} draggable={false}/></span><span className="pair-caption"><span className="pair-number">0{products.indexOf(p)+1}</span><span>{p.fit}<small>{p.color}</small></span><Icon name="plus" size={17}/></span></button>)}
        </div>
      </div>
      <div className="room-floor" aria-hidden="true"/>
      <div className="room-bottom"><div className="rail-instruction"><span aria-hidden="true">↔</span><p>Drag the rail. Pick a pair.<small>Or use the arrows to explore.</small></p></div><Link href="/shop/" className="room-collection-link">View the collection <Icon name="arrow" size={18}/></Link><div className="rail-arrows"><button onClick={()=>moveRail(-1)} aria-label="Slide rail left"><Icon name="arrow" style={{transform:'rotate(180deg)'}}/></button><button onClick={()=>moveRail(1)} aria-label="Slide rail right"><Icon name="arrow"/></button></div></div>
      <div className="room-edition"><span>THE EVERYDAY DENIM COLLECTION</span><span>8 PIECES. ENDLESS POSSIBILITIES.</span><span>WESTOS® — MADE TO BE YOURS.</span></div>
    </section>
    <dialog ref={dialog} className="rail-dialog" aria-label={selected?`${selected.name} preview`:'Jeans preview'} onClose={()=>setSelected(null)} onClick={e=>{if(e.target===e.currentTarget||(e.target instanceof Element&&e.target.closest('a[href]')))e.currentTarget.close();}}>
      {selected&&<><button className="icon-button rail-dialog-close" aria-label="Return to the rail" onClick={()=>dialog.current?.close()}><Icon name="close"/></button><div className={`rail-preview-figure wash-${selected.color.toLowerCase().replaceAll(' ','-')}`}><span className="eyebrow">WESTOS / THE EVERYDAY EDIT</span><Image src={railImage(selected)} alt={`${selected.name} hanging jeans illustration`} width={1024} height={1536} sizes="(max-width:640px) 90vw, 420px"/><span className="rail-preview-note">Illustrative showroom image</span></div><div className="rail-preview-details"><p className="eyebrow">{selected.category.toUpperCase()} / {selected.fit.toUpperCase()} FIT</p><h2>{selected.name}</h2><div className="product-price"><span>{formatPrice(selected.price)}</span><del>{formatPrice(selected.mrp)}</del></div><p>{selected.description}</p><ProductOptions key={selected.id} product={selected}/><Link className="text-link" href={`/product/${selected.slug}/`} onClick={()=>dialog.current?.close()}>See the details <Icon name="arrow" size={18}/></Link><small className="rail-sample-note">Sample collection · Orders are not live.</small></div></>}
    </dialog>
  </>;
}
