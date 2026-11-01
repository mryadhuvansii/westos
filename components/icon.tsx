import type { CSSProperties } from 'react';
const paths: Record<string, React.ReactNode> = {
  arrow: <><path d="M4 12h15M13 5l7 7-7 7" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
  bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  user: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  recycle: <><path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/></>,
  weave: <><path d="m3 8 5-5 13 13-5 5L3 8ZM16 3l5 5L8 21l-5-5L16 3Z"/></>,
  ruler: <><path d="m3 16 13-13 5 5L8 21l-5-5Z"/><path d="m12 7 2 2m-6 2 2 2m-6 2 2 2"/></>,
  tune: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></>,
  chevron: <path d="m6 9 6 6 6-6"/>,
};
export function Icon({name, size=22, style, className}: {name:string,size?:number,style?:CSSProperties,className?:string}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style} className={className}>{paths[name] || paths.arrow}</svg>;
}
