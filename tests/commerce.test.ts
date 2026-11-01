import assert from 'node:assert/strict';
import { products, filterProducts, formatPrice } from '../lib/catalog.ts';
import { addItem, cartTotal, changeQuantity, normalizeCart } from '../lib/cart.ts';

const product = products[0];
const item = { productId: product.id, size: product.sizes[0], quantity: 1 };

assert.deepEqual(normalizeCart(null), []);
assert.deepEqual(normalizeCart({ items: [item] }), []);
assert.deepEqual(normalizeCart([
  null, false, 'tampered', {},
  { ...item, productId: 'unknown-product', price: 1 },
  { ...item, size: 999 }, { ...item, size: String(item.size) },
  { ...item, quantity: '5' }, { ...item, quantity: Infinity }, { ...item, quantity: NaN },
]), []);
assert.deepEqual(normalizeCart([{ ...item, quantity: 999, price: 1 }]), [{ ...item, quantity: 5 }]);
assert.deepEqual(normalizeCart([{ ...item, quantity: -2 }]), [item]);
assert.deepEqual(normalizeCart([{ ...item, quantity: 2.8 }]), [{ ...item, quantity: 2 }]);
assert.deepEqual(normalizeCart([{ ...item, quantity: 4 }, { ...item, quantity: 4 }]), [{ ...item, quantity: 5 }]);

const cart = addItem(addItem([], product.id, item.size), product.id, item.size);
assert.deepEqual(cart, [{ ...item, quantity: 2 }]);
assert.deepEqual(addItem(cart, product.id, 999), cart);
assert.deepEqual(addItem(cart, 'unknown-product', item.size), cart);
assert.deepEqual(addItem([{ ...item, quantity: 5 }], product.id, item.size), [{ ...item, quantity: 5 }]);
assert.equal(addItem(cart, product.id, product.sizes[1]).length, 2);
assert.equal(cartTotal(cart), product.price * 2);
assert.equal(cartTotal([{ ...item, quantity: 999 }]), product.price * 5);
assert.deepEqual(changeQuantity(cart, product.id, item.size, -2), []);
assert.deepEqual(changeQuantity(cart, product.id, item.size, -999), []);
assert.deepEqual(changeQuantity(cart, product.id, item.size, 999), [{ ...item, quantity: 5 }]);
assert.deepEqual(changeQuantity(cart, product.id, item.size, NaN), cart);
assert.deepEqual(cart, [{ ...item, quantity: 2 }], 'Operations must not mutate source carts');

assert.equal(products.length, 8);
assert.equal(filterProducts(products, { category: 'Women' }).length, 4);
assert.equal(filterProducts(products, { category: 'Men' }).length, 4);
assert.deepEqual(filterProducts(products, { query: '  DAYBREAK  ' }), [product]);
assert.deepEqual(filterProducts(products, { query: 'no matching denim' }), []);
assert.ok(filterProducts(products, { fit: 'Straight', category: 'Women' })
  .every((entry) => entry.fit === 'Straight' && entry.category === 'Women'));
assert.deepEqual(filterProducts(products, { sort: 'price-asc' }).map((entry) => entry.price),
  products.map((entry) => entry.price).sort((a, b) => a - b));
assert.deepEqual(filterProducts(products, { sort: 'price-desc' }).map((entry) => entry.price),
  products.map((entry) => entry.price).sort((a, b) => b - a));
assert.deepEqual(filterProducts(products, { sort: 'featured' }), products);
assert.equal(formatPrice(1499), '₹1,499');

console.log('Commerce checks passed.');
