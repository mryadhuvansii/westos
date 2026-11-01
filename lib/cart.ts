import { products } from './catalog.ts';

export type CartItem = { productId: string; size: number; quantity: number };

export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const items = new Map<string, CartItem>();
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue;
    const { productId, size, quantity } = item as Record<string, unknown>;
    const product = products.find((entry) => entry.id === productId);
    if (!product || typeof size !== 'number' || !product.sizes.includes(size) ||
      typeof quantity !== 'number' || !Number.isFinite(quantity)) continue;
    const key = `${product.id}:${size}`;
    const count = Math.max(1, Math.min(5, Math.trunc(quantity)));
    items.set(key, { productId: product.id, size, quantity: Math.min(5, (items.get(key)?.quantity ?? 0) + count) });
  }
  return [...items.values()];
}

export function changeQuantity(cart: readonly CartItem[], productId: string, size: number, delta: number): CartItem[] {
  const items = normalizeCart(cart);
  if (!Number.isInteger(delta)) return items;
  return items.map((item) => item.productId === productId && item.size === size
    ? { ...item, quantity: Math.min(5, item.quantity + delta) }
    : item).filter((item) => item.quantity > 0);
}

export function addItem(cart: readonly CartItem[], productId: string, size: number): CartItem[] {
  return normalizeCart([...cart, { productId, size, quantity: 1 }]);
}

export function cartTotal(cart: readonly CartItem[]): number {
  return normalizeCart(cart).reduce((total, item) =>
    total + products.find((product) => product.id === item.productId)!.price * item.quantity, 0);
}
