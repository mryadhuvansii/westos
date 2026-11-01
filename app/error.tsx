'use client';
export default function Error({reset}:{error:Error,reset:()=>void}){return <div className="container empty-state"><h1>Something didn&apos;t load.</h1><p>Your saved bag is still on this browser. Please try again.</p><button className="button" onClick={reset}>Try again</button></div>;}
