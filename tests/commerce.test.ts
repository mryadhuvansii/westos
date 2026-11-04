import assert from 'node:assert/strict';
import {products,filterProducts,formatPrice} from '../lib/catalog.ts';
import {previewProducts,variantId,type ManagedProduct} from '../lib/operations.ts';
import {addItem,availableQuantity,cartTotal,changeQuantity,normalizeCart} from '../lib/cart.ts';

const sample=previewProducts()[0];
const default28=variantId(sample.id,'default',28),black28=variantId(sample.id,'black',28),black30=variantId(sample.id,'black',30);
const product:ManagedProduct={...sample,price:3000,sizes:[28,30],colors:[
 {id:'default',name:'Indigo',hex:'#354e69',images:['/images/product-1.webp','/images/product-2.webp']},
 {id:'black',name:'Black',hex:'#222222',images:['/images/product-4.webp']},
],variants:[
 {id:default28,colorId:'default',size:28,sku:'WESTOS-INDIGO-28',onHand:8,reserved:6,available:2,revision:3},
 {id:black28,colorId:'black',size:28,sku:'WESTOS-BLACK-28',onHand:10,reserved:1,available:9,revision:2},
 {id:black30,colorId:'black',size:30,sku:'WESTOS-BLACK-30',onHand:7,reserved:7,available:0,revision:2},
]};
const catalog=[product],item={productId:product.id,variantId:default28,size:28,quantity:1};
assert.equal(availableQuantity(product,default28),2,'Use available stock after holds, not physical stock');
assert.equal(availableQuantity(product,black28),5,'Preview bag limit remains five per variant');
assert.equal(availableQuantity(product,black30),0,'Fully reserved stock cannot be added');
assert.deepEqual(normalizeCart(null,catalog),[]);
assert.deepEqual(normalizeCart({items:[item]},catalog),[]);
assert.deepEqual(normalizeCart([
 null,false,'tampered',{}, {...item,productId:'unknown'}, {...item,variantId:'wrong-variant'},
 {...item,size:30}, {...item,size:'28'}, {...item,quantity:'5'}, {...item,quantity:Infinity},
 {...item,quantity:NaN}, {...item,quantity:-2}, {...item,quantity:0},
],catalog),[]);
assert.deepEqual(normalizeCart([{...item,quantity:999,price:1}],catalog),[{...item,quantity:2}]);
assert.deepEqual(normalizeCart([{...item,quantity:1.8}],catalog),[item]);
assert.deepEqual(normalizeCart([item,item,item],catalog),[{...item,quantity:2}]);
let cart=addItem([],product.id,default28,catalog);
cart=addItem(cart,product.id,black28,catalog);
assert.equal(cart.length,2,'Two colours in the same size remain distinct lines');
assert.deepEqual(cart.map(line=>line.variantId),[default28,black28]);
assert.equal(cartTotal(cart,catalog),6000,'Subtotal uses managed product price');
assert.deepEqual(changeQuantity(cart,black28,2,catalog).map(line=>line.quantity),[1,3],'Only the selected colour changes');
assert.deepEqual(changeQuantity(cart,default28,-1,catalog).map(line=>line.variantId),[black28]);
assert.deepEqual(changeQuantity(cart,default28,99,catalog).map(line=>line.quantity),[2,1]);
assert.deepEqual(changeQuantity(cart,black28,NaN,catalog),cart);
assert.deepEqual(addItem(cart,product.id,black30,catalog),cart);
assert.deepEqual(addItem(cart,product.id,'wrong-variant',catalog),cart);
assert.deepEqual(normalizeCart(cart,[{...product,status:'archived'}]),[]);
assert.deepEqual(normalizeCart(cart,[]),[]);
assert.deepEqual(normalizeCart([{productId:product.id,size:28,quantity:1}],catalog),[item],'Legacy bags map to the original default colour');
const withoutDefault={...product,colors:product.colors.filter(color=>color.id!=='default'),variants:product.variants.filter(variant=>variant.colorId!=='default')};
assert.deepEqual(normalizeCart([{productId:product.id,size:28,quantity:1}],[withoutDefault]),[],'Legacy bags never silently switch to another colour');
assert.deepEqual(normalizeCart([{...item,variantId:'unknown'}],catalog),[],'Invalid explicit variants do not fall back to legacy size');
const held={...product,variants:product.variants.map(variant=>({...variant,available:0,reserved:variant.onHand}))};
assert.deepEqual(normalizeCart(cart,[held]),[],'A refreshed hold updates bag availability');
const released={...held,variants:held.variants.map(variant=>({...variant,available:variant.onHand,reserved:0}))};
assert.equal(availableQuantity(released,default28),5,'A refreshed expired hold exposes available stock again');
assert.deepEqual(addItem([],product.id,default28,[released]),[item]);
assert.equal(product.variants[0].reserved,6,'Bag operations never create or release reservations');
assert.deepEqual(cart.map(line=>line.quantity),[1,1],'Operations must not mutate source carts');

const original=products[0];
assert.equal(filterProducts(products,{category:'Women'}).length,4);
assert.equal(filterProducts(products,{category:'Men'}).length,4);
assert.deepEqual(filterProducts(products,{query:'  DAYBREAK  '}),[original]);
assert.deepEqual(filterProducts(catalog,{query:'black'}),catalog,'Search includes secondary colours');
assert.deepEqual(filterProducts(products,{query:'no matching denim'}),[]);
assert.ok(filterProducts(products,{fit:'Straight',category:'Women'}).every(entry=>entry.fit==='Straight'&&entry.category==='Women'));
assert.deepEqual(filterProducts(products,{sort:'price-asc'}).map(entry=>entry.price),products.map(entry=>entry.price).sort((a,b)=>a-b));
assert.deepEqual(filterProducts(products,{sort:'price-desc'}).map(entry=>entry.price),products.map(entry=>entry.price).sort((a,b)=>b-a));
assert.deepEqual(filterProducts(products,{sort:'featured'}),products);
assert.equal(formatPrice(1499),'₹1,499');
console.log('Commerce checks passed: variant identity, colour search, stock holds, legacy bags and current pricing.');
