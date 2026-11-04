export const dynamic = 'force-dynamic';
export async function GET() {
  const txt=`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /cart/\nDisallow: /checkout/\nDisallow: /account/\nDisallow: /payment/\nSitemap: https://westos-denim-studio.westosjeans.chatgpt.site/api/sitemap`;
  return new Response(txt,{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
}