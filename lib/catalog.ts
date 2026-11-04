export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  article_code: string;
  fit: 'Slim' | 'Straight' | 'Relaxed' | 'Baggy' | 'Bootcut' | 'Comfort';
  category: 'Men' | 'Women';
  price: number;
  mrp: number;
  image: string;
  color: string;
  colorHex: string;
  sizes: number[];
  description: string;
  badge?: string;
  collection: 'Everyday' | 'New arrivals' | 'The essentials';
};

// Sample catalogue for the storefront preview; replace with the public catalogue API.
export const products: Product[] = [
  {
    id: 'westos-001', slug: 'daybreak-straight', name: 'The Daybreak Straight',
    brand: 'WESTOS', article_code: 'WS-001',
    fit: 'Straight', category: 'Men', price: 1899, mrp: 2299,
    image: '/images/product-1.webp', color: 'Indigo', colorHex: '#354e69',
    sizes: [28, 30, 32, 34, 36], collection: 'The essentials', badge: 'Signature fit',
    description: 'An easy straight leg in an indigo wash. A familiar silhouette for early starts and late plans.',
  },
  {
    id: 'westos-002', slug: 'afterhours-slim', name: 'The Afterhours Slim',
    brand: 'WESTOS', article_code: 'WS-002',
    fit: 'Slim', category: 'Men', price: 1799, mrp: 2199,
    image: '/images/product-1.webp', color: 'Indigo', colorHex: '#354e69',
    sizes: [28, 30, 32, 34, 36], collection: 'Everyday',
    description: 'A clean slim shape with an indigo finish. Made for a simple tee, a favorite shirt, and everything between.',
  },
  {
    id: 'westos-003', slug: 'off-duty-relaxed', name: 'The Off-duty Relaxed',
    brand: 'WESTOS', article_code: 'WS-003',
    fit: 'Relaxed', category: 'Men', price: 2199, mrp: 2599,
    image: '/images/product-2.webp', color: 'Faded blue', colorHex: '#90a9bd',
    sizes: [28, 30, 32, 34, 36, 38], collection: 'New arrivals', badge: 'New',
    description: 'A relaxed leg and a faded blue wash. Room to move, with an everyday denim attitude.',
  },
  {
    id: 'westos-004', slug: 'daily-comfort', name: 'The Daily Comfort',
    brand: 'WESTOS', article_code: 'WS-004',
    fit: 'Comfort', category: 'Men', price: 1499, mrp: 1899,
    image: '/images/product-2.webp', color: 'Faded blue', colorHex: '#90a9bd',
    sizes: [30, 32, 34, 36, 38, 40], collection: 'Everyday',
    description: 'Faded blue denim with an easy, understated shape. Your starting point for a wardrobe that works every day.',
  },
  {
    id: 'westos-005', slug: 'weekender-baggy', name: 'The Weekender Baggy',
    brand: 'WESTOS', article_code: 'WS-005',
    fit: 'Baggy', category: 'Women', price: 2299, mrp: 2699,
    image: '/images/product-4.webp', color: 'Charcoal', colorHex: '#4a4b4d',
    sizes: [26, 28, 30, 32, 34], collection: 'New arrivals', badge: 'New',
    description: 'A wide, laid-back leg in charcoal. Pair with a close-fitting top or give the whole look a little more room.',
  },
  {
    id: 'westos-006', slug: 'sundown-bootcut', name: 'The Sundown Bootcut',
    brand: 'WESTOS', article_code: 'WS-006',
    fit: 'Bootcut', category: 'Women', price: 2499, mrp: 2899,
    image: '/images/product-3.webp', color: 'Light blue', colorHex: '#b0c7d7',
    sizes: [26, 28, 30, 32, 34, 36], collection: 'New arrivals',
    description: 'A fitted upper leg that opens into a subtle bootcut. A light blue wash brings an easy feel to this familiar silhouette.',
  },
  {
    id: 'westos-007', slug: 'muse-straight', name: 'The Muse Straight',
    brand: 'WESTOS', article_code: 'WS-007',
    fit: 'Straight', category: 'Women', price: 1999, mrp: 2399,
    image: '/images/product-3.webp', color: 'Light blue', colorHex: '#b0c7d7',
    sizes: [26, 28, 30, 32, 34, 36], collection: 'The essentials', badge: 'Signature fit',
    description: 'A straight-leg classic in a light blue wash. Easy to dress up, easy to live in, and always your own.',
  },
  {
    id: 'westos-008', slug: 'slow-morning-relaxed', name: 'The Slow Morning Relaxed',
    brand: 'WESTOS', article_code: 'WS-008',
    fit: 'Relaxed', category: 'Women', price: 1699, mrp: 2099,
    image: '/images/product-4.webp', color: 'Charcoal', colorHex: '#4a4b4d',
    sizes: [26, 28, 30, 32, 34], collection: 'Everyday',
    description: 'An unhurried shape in charcoal denim. Relaxed through the leg for the days that unfold at your pace.',
  },
];

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return rupees.format(value);
}

export type FilterableProduct = Product & Partial<{colors:{id:string;name:string}[];collection:string;brand:string;article_code:string}>;
export function filterProducts(
  source: readonly FilterableProduct[],
  options: { query?: string; fit?: string; category?: string; collection?: string; sort?: string } = {},
): FilterableProduct[] {
  const query = options.query?.trim().toLocaleLowerCase('en-IN') ?? '';
  const result = source.filter((product) =>
    (!options.fit || product.fit === options.fit) &&
    (!options.category || product.category === options.category) &&
    (!options.collection || product.collection === options.collection) &&
    (!query || `${product.name} ${product.fit} ${product.color} ${'colors' in product && Array.isArray(product.colors) ? product.colors.map(color=>color?.name).join(' ') : ''} ${product.brand||''} ${product.article_code||''} ${product.category} ${product.collection} ${product.description}`
      .toLocaleLowerCase('en-IN').includes(query)),
  );
  if (options.sort === 'price-asc') result.sort((a, b) => a.price - b.price);
  if (options.sort === 'price-desc') result.sort((a, b) => b.price - a.price);
  return result;
}
