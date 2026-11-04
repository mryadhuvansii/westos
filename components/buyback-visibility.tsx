'use client';
import type {ReactNode} from 'react';
import {useStore} from './store';

export default function BuybackVisibility({children,fallback=null}:{children:ReactNode;fallback?:ReactNode}){
  return useStore().settings.buybackEnabled?children:fallback;
}
