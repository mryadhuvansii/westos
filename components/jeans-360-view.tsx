'use client';

import {useId,useRef,useState,type PointerEvent} from 'react';
import {normalizeAngle,turntableView} from '@/lib/turntable';
import type {ProductColor} from '@/lib/operations';
import {Icon} from './icon';

function darken(hex:string,amount:number) {
  const value=Number.parseInt(hex.slice(1),16),r=value>>16,g=value>>8&255,b=value&255;
  return `#${[r,g,b].map(channel=>Math.round(channel*(1-amount)).toString(16).padStart(2,'0')).join('')}`;
}

function DenimFace({color,back,gradientId}:{color:ProductColor;back:boolean;gradientId:string}) {
  const dark=darken(color.hex,.32),edge=darken(color.hex,.48),stitch='#d5ae78';
  return <svg className="jeans-360-face-art" viewBox="0 0 400 560" role="img" aria-label={`${color.name} denim, ${back?'back':'front'} illustration`}>
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2=".2"><stop stopColor={dark}/><stop offset=".18" stopColor={color.hex}/><stop offset=".47" stopColor={dark}/><stop offset=".7" stopColor={color.hex}/><stop offset="1" stopColor={edge}/></linearGradient>
      <linearGradient id={`${gradientId}-shine`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#fff" stopOpacity=".02"/><stop offset=".24" stopColor="#fff" stopOpacity=".14"/><stop offset=".5" stopColor="#000" stopOpacity=".14"/><stop offset=".76" stopColor="#fff" stopOpacity=".09"/><stop offset="1" stopColor="#000" stopOpacity=".2"/></linearGradient>
    </defs>
    <g stroke={edge} strokeWidth="2" strokeLinejoin="round">
      <path d="M103 81Q200 99 297 81L307 198Q305 215 288 233L301 523Q256 536 218 522L200 255L181 522Q143 536 99 523L112 233Q95 215 93 198Z" fill={`url(#${gradientId})`}/>
      <path d="M103 81Q200 99 297 81L300 119Q200 136 100 119Z" fill={dark}/>
      <path d="M104 91Q200 109 296 91M101 115Q200 132 299 115" fill="none" stroke={stitch} strokeWidth="2"/>
      <path d="M108 99L112 117M150 105L151 124M198 109L198 128M247 105L246 124M292 99L288 117" fill="none" stroke={stitch} strokeWidth="5"/>
      <path d="M111 124Q146 135 184 129L178 151Q145 158 114 147ZM216 129Q254 135 289 124L286 147Q254 158 222 151Z" fill="none" stroke={stitch} strokeWidth="2.5"/>
      <path d="M115 228L124 514M285 228L277 514M185 225Q192 238 200 255Q208 238 216 225" fill="none" stroke={stitch} strokeWidth="2"/>
      <path d="M105 519Q147 530 181 519M218 519Q260 530 299 519" fill="none" stroke={stitch} strokeWidth="4"/>
      {back?<>
        <path d="M118 167Q149 183 188 167L179 192Q146 207 121 192ZM212 167Q251 183 282 167L279 192Q252 207 221 192Z" fill="none" stroke={stitch} strokeWidth="3"/>
        <path d="M120 191L176 205M280 191L224 205M120 195Q147 222 180 211M280 195Q253 222 220 211" fill="none" stroke={stitch} strokeWidth="2"/>
        <path d="M132 138Q200 155 268 138L246 165Q200 177 154 165Z" fill={dark} stroke={stitch} strokeWidth="2"/>
        <path d="M132 138Q200 155 268 138M153 165Q200 177 246 165" fill="none" stroke={stitch} strokeWidth="2"/>
        <path d="M140 225L131 510M260 225L269 510" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="5"/>
      </>:<>
        <path d="M116 137Q141 148 174 142L169 168Q143 179 119 164ZM226 142Q259 148 284 137L281 164Q257 179 231 168Z" fill="none" stroke={stitch} strokeWidth="2.5"/>
        <path d="M128 139Q146 146 162 143L160 158Q143 164 127 157Z" fill="none" stroke={stitch} strokeWidth="2"/>
        <path d="M200 131L198 220Q200 233 211 240" fill="none" stroke={stitch} strokeWidth="3"/>
        <circle cx="201" cy="139" r="6" fill={stitch}/><circle cx="118" cy="156" r="4" fill={stitch}/><circle cx="282" cy="156" r="4" fill={stitch}/>
        <path d="M139 225L130 510M261 225L270 510" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="5"/>
      </>}
    </g>
    <path d="M103 81Q200 99 297 81L307 198Q305 215 288 233L301 523Q256 536 218 522L200 255L181 522Q143 536 99 523L112 233Q95 215 93 198Z" fill={`url(#${gradientId}-shine)`} pointerEvents="none"/>
  </svg>;
}

export default function Jeans360View({color,fit,threedeeAsset}:{color:ProductColor;fit:string;threedeeAsset?:string}) {
  const [angle,setAngle]=useState(0),drag=useRef<{pointerId:number;x:number;angle:number}|null>(null),uid=useId().replaceAll(':','');
  const view=turntableView(angle),width=fit==='Baggy'?1.1:fit==='Slim'?.88:fit==='Bootcut'?1.02:1;
  function begin(event:PointerEvent<HTMLDivElement>) {
    if(event.button!==0)return;
    drag.current={pointerId:event.pointerId,x:event.clientX,angle};event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event:PointerEvent<HTMLDivElement>) {
    if(drag.current?.pointerId!==event.pointerId)return;
    setAngle(normalizeAngle(drag.current.angle+(drag.current.x-event.clientX)*.7));
  }
  function end(event:PointerEvent<HTMLDivElement>) {
    if(drag.current?.pointerId!==event.pointerId)return;
    drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function rotate(delta:number) {setAngle(value=>normalizeAngle(value+delta));}
  return <div className="jeans-360-view">
    <div className="jeans-360-stage" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <div className="jeans-360-ground" aria-hidden="true"/>
      <div className="jeans-360-orbit" aria-hidden="true"/>
      <div className="jeans-360-object" style={{transform:`translateY(-7px) rotateY(${angle}deg) scaleX(${width})`}}>
        <div className="jeans-360-side jeans-360-left" aria-hidden="true"/>
        <div className="jeans-360-side jeans-360-right" aria-hidden="true"/>
        <div className="jeans-360-face jeans-360-front"><DenimFace color={color} back={false} gradientId={`${uid}-front`}/></div>
        <div className="jeans-360-face jeans-360-back"><DenimFace color={color} back gradientId={`${uid}-back`}/></div>
      </div>
      <span className="jeans-360-view-label" aria-live="polite">{view} view</span>
      <span className="jeans-360-angle" aria-hidden="true">{angle}°</span>
    </div>
    <div className="jeans-360-controls">
      <button type="button" className="jeans-360-turn" onClick={()=>rotate(-45)} aria-label="Rotate jeans left 45 degrees"><Icon name="arrow" style={{transform:'rotate(180deg)'}}/></button>
      <label className="jeans-360-slider"><span className="sr-only">Rotate the jeans through 360 degrees</span><input type="range" min="0" max="359" step="1" value={angle} onChange={event=>setAngle(Number(event.target.value))} aria-valuetext={`${view} view, ${angle} degrees`}/></label>
      <button type="button" className="jeans-360-turn" onClick={()=>rotate(45)} aria-label="Rotate jeans right 45 degrees"><Icon name="arrow"/></button>
    </div>
    <p className="jeans-360-note">Illustrative 3D fit view · color and fit preview only</p>
    {threedeeAsset && <div className="jeans-360-asset"><a href={threedeeAsset} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} style={{marginRight:6}}/>Open custom 3D model ({threedeeAsset.split('.').pop()?.toUpperCase()})</a></div>}
  </div>;
}
