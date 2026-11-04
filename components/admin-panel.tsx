'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {Icon} from '@/components/icon';
import {formatPrice} from '@/lib/catalog';
import {compatibilityFields, legacyProduct, variantId, type AdminState, type ManagedProduct, type StoreSettings, type ProductColor} from '@/lib/operations';
import InventoryDesk from './inventory-desk';

const sections = ['Products', 'Inventory', 'Settings', 'Activity', 'Guide'] as const;
type Section = typeof sections[number];
type Feedback = {error: boolean; message: string};
const activityNames: Record<string, string> = {initialize: 'Store management set up', product_created: 'Product added', product_updated: 'Product updated', stock_adjusted: 'Stock counted', inventory_upgraded: 'Colour-size inventory enabled', stock_reserved: 'Stock reserved', stock_committed: 'Stock sale recorded', stock_released: 'Stock hold released', stock_returned: 'Inspected stock returned', settings: 'Settings updated'};
const fits = ['Slim', 'Straight', 'Relaxed', 'Baggy', 'Bootcut', 'Comfort'] as const;
const collections = ['Everyday', 'New arrivals', 'The essentials'] as const;
const dateFormat = new Intl.DateTimeFormat('en-IN', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata'});

async function readResponse(response: Response): Promise<AdminState> {
  const raw: unknown = await response.json().catch(() => null);
  const body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
  if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : response.status === 401 ? 'Please sign in again with your owner account.' : 'The request could not be completed. Try again.');
  if (!body || !Array.isArray(body.products) || !body.settings) throw new Error('The store returned an incomplete response. Please reload.');
  return body as unknown as AdminState;
}

export default function AdminPanel() {
  const [data, setData] = useState<AdminState | null>(null);
  const [section, setSection] = useState<Section>('Products');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<ManagedProduct | null>(null);
  const [upload, setUpload] = useState<{file: File; colorId: string} | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [inventoryDirty, setInventoryDirty] = useState(false);
  const [inventoryReset, setInventoryReset] = useState(0);
  const [referenceQuery, setReferenceQuery] = useState('');
  const adminUrl = referenceQuery ? `/api/admin?reference=${encodeURIComponent(referenceQuery)}` : '/api/admin';
  const dialog = useRef<HTMLDialogElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const sectionHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin', {cache: 'no-store', signal: controller.signal})
      .then(readResponse).then(next => {setData(next); setSettings(next.settings);})
      .catch(error => {if (!controller.signal.aborted) setFeedback({error: true, message: error instanceof Error ? error.message : 'Store management could not be loaded.'});});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (editing && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [editing]);

  useEffect(() => {if (feedback?.error) feedbackRef.current?.focus();}, [feedback]);

  useEffect(() => {
    if (!data || busy || editing || inventoryDirty) return;
    const controller = new AbortController();
    async function refresh() {
      if (document.visibilityState !== 'visible' || busyRef.current) return;
      try {
        const next = await readResponse(await fetch(adminUrl, {cache: 'no-store', signal: controller.signal}));
        if (!controller.signal.aborted && !busyRef.current) setData(next);
      } catch { /* Keep the current view; explicit reload reports connection failures. */ }
    }
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh);};
  }, [!!data, busy, editing, inventoryDirty, adminUrl]);

  async function reload() {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setFeedback(null);
    try {
      const next = await readResponse(await fetch(adminUrl, {cache: 'no-store', signal: AbortSignal.timeout(15000)}));
      setData(next); setSettings(next.settings); setInventoryReset(value => value + 1); setInventoryDirty(false); setEditing(null); dialog.current?.close();
      setFeedback({error: false, message: 'Saved values reloaded. Your store is up to date.'});
    } catch (error) {setFeedback({error: true, message: error instanceof Error ? error.message : 'Could not reload the store.'});}
    finally {busyRef.current = false; setBusy(false);}
  }

  async function searchReference(reference: string) {
    if (busyRef.current || inventoryDirty) return;
    busyRef.current = true; setBusy(true); setFeedback(null);
    try {
      const query = reference.trim();
      const next = await readResponse(await fetch(query ? `/api/admin?reference=${encodeURIComponent(query)}` : '/api/admin', {cache: 'no-store', signal: AbortSignal.timeout(15000)}));
      setData(next); setReferenceQuery(query);
      setFeedback({error: false, message: query ? next.reservations.length ? `Showing saved reference ${query}.` : `No saved reference matches ${query}. Check the complete reference and try again.` : 'Showing the most recent references.'});
    } catch (error) {setFeedback({error: true, message: error instanceof Error ? error.message : 'Reference search could not be completed.'});}
    finally {busyRef.current = false; setBusy(false);}
  }

  async function save(payload: object, message: string): Promise<AdminState | null> {
    if (busyRef.current) return null;
    busyRef.current = true; setBusy(true); setFeedback(null);
    try {
      let next = await readResponse(await fetch('/api/admin', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000),
      }));
      if (referenceQuery) {
        try {next = await readResponse(await fetch(adminUrl, {cache: 'no-store', signal: AbortSignal.timeout(15000)}));}
        catch {setReferenceQuery(''); message += ' Recent references are shown; search again to refresh your earlier reference.';}
      }
      setData(next); setFeedback({error: false, message});
      window.dispatchEvent(new Event('westos:store-updated'));
      return next;
    } catch (error) {setFeedback({error: true, message: error instanceof Error ? error.message : 'Your change could not be saved. Please retry.'}); return null;}
    finally {busyRef.current = false; setBusy(false);}
  }

  function openEditor(product?: ManagedProduct) {
    const next = product || legacyProduct({
      id: crypto.randomUUID(), slug: '', name: '', fit: 'Straight', category: 'Men', price: 1, mrp: 1,
      image: '/images/product-1.webp', color: 'Indigo', colorHex: '#354e69', sizes: [28, 30, 32, 34, 36],
      description: '', collection: 'Everyday', status: 'draft', stock: {}, revision: 0, updatedAt: '',
    });
    setEditing(next); setUpload(null); setFeedback(null);
  }

  function changeColor(colorId: string, patch: Partial<ProductColor>) {
    setEditing(current => current && {...current, colors: current.colors.map(color => color.id === colorId ? {...color, ...patch} : color)});
  }
  function addSize(colorId: string, size: number) {
    setEditing(current => {
      if (!current || current.variants.length >= 100 || current.variants.some(variant => variant.colorId === colorId && variant.size === size)) return current;
      const id = variantId(current.id, colorId, size);
      const original = data?.products.find(product => product.id === current.id)?.variants.find(variant => variant.id === id);
      return {...current, variants: [...current.variants, original || {id, colorId, size, sku: `${current.id}-${colorId}-${size}`.toUpperCase(), onHand: 0, reserved: 0, available: 0, revision: 0}]};
    });
  }
  function addColor() {
    if (!editing || editing.colors.length >= 12 || editing.variants.length >= 100) return;
    const id = `color-${crypto.randomUUID().slice(0, 8)}`;
    setEditing({...editing, colors: [...editing.colors, {id, name: '', hex: '#334559', images: ['/images/product-1.webp']}], variants: [...editing.variants, {id: variantId(editing.id, id, 32), colorId: id, size: 32, sku: `${editing.id}-${id}-32`.toUpperCase(), onHand: 0, reserved: 0, available: 0, revision: 0}]});
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    if (upload) {setFeedback({error: true, message: 'Upload the selected photo first, or clear the photo selection before saving.'}); return;}
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim();
    const product = compatibilityFields({
      ...editing, name: value('name'), slug: value('slug'), description: value('description'),
      fit: value('fit') as ManagedProduct['fit'], category: value('category') as ManagedProduct['category'],
      price: Number(value('price')), mrp: Number(value('mrp')),
      collection: value('collection') as ManagedProduct['collection'], badge: value('badge'),
      status: value('status') as ManagedProduct['status'],
    });
    if (await save({action: 'saveProduct', product, expectedRevision: editing.revision}, 'Product saved. Published changes are ready on the storefront.')) dialog.current?.close();
  }

  async function uploadPhoto() {
    if (!upload || busyRef.current) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(upload.file.type) || upload.file.size > 5 * 1024 * 1024) {
      setFeedback({error: true, message: 'Choose a JPG, PNG or WebP image no larger than 5 MB.'}); return;
    }
    busyRef.current = true; setBusy(true); setFeedback(null);
    try {
      const response = await fetch('/api/admin/media', {method: 'POST', headers: {'Content-Type': upload.file.type}, body: upload.file, signal: AbortSignal.timeout(30000)});
      const raw: unknown = await response.json().catch(() => null);
      const body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
      if (!response.ok || typeof body?.url !== 'string' || !/^\/api\/media\/[a-zA-Z0-9_-]+\.(webp|png|jpe?g)$/.test(body.url)) throw new Error(typeof body?.error === 'string' ? body.error : 'The photo could not be uploaded. Please try again.');
      const url = body.url;
      setEditing(current => current && {...current, colors: current.colors.map(color => color.id === upload.colorId ? {...color, images: [...color.images, url].slice(0, 6)} : color)});
      setUpload(null);
      setFeedback({error: false, message: 'Photo uploaded. Save the product to use this image.'});
    } catch (error) {setFeedback({error: true, message: error instanceof Error ? error.message : 'The photo could not be uploaded.'});}
    finally {busyRef.current = false; setBusy(false);}
  }

  const visibleProducts = data?.products.filter(product => (status === 'all' || product.status === status) && `${product.name} ${product.colors.map(color => color.name).join(' ')} ${product.fit}`.toLowerCase().includes(query.trim().toLowerCase())) || [];
  const stockCount = data?.products.reduce((sum, product) => sum + product.variants.reduce((total, variant) => total + variant.onHand, 0), 0) || 0;
  const notice = feedback && <div ref={feedbackRef} tabIndex={-1} className={`admin-feedback ${feedback.error ? 'is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.message}{feedback.error && <span> Unsaved edits are kept. Reload saved values if another tab has changed this record.</span>}</div>;

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div><p className="eyebrow">WESTOS STUDIO</p><strong className="admin-sidebar-title">Store<br />management<span>.</span></strong><span className="admin-owner-badge">OWNER ACCESS</span></div>
      <nav aria-label="Store management sections">{sections.map((name, index) => <button key={name} type="button" aria-current={section === name ? 'page' : undefined} onClick={() => {setSection(name); setFeedback(null); requestAnimationFrame(() => sectionHeading.current?.focus());}}><span>0{index + 1}</span>{name}<Icon name="arrow" size={17} /></button>)}</nav>
      <div className="admin-sidebar-bottom"><span className="admin-status-dot" /><strong>Store setup in progress</strong><p>Product management is available.<br />Orders and payments are closed.</p><Link href="/">Visit storefront ↗</Link></div>
    </aside>

    <div className="admin-main">
      <div className="admin-topbar"><span>{data?.user.email || 'Owner workspace'}</span><a href="/signout-with-chatgpt?return_to=%2Fadmin%2F" target="_top">Sign out ↗</a></div>
      <header className="admin-page-title"><div><p className="eyebrow">YOUR DAILY STORE DESK</p><h1>Everything in order.</h1><p>Apne products, stock aur store settings yahan manage karein.</p></div><button className="admin-button secondary" disabled={busy} onClick={reload}>{inventoryDirty || settings && data && (settings.upiId !== data.settings.upiId || settings.buybackEnabled !== data.settings.buybackEnabled) ? 'Discard edits & reload' : 'Reload saved values'} <Icon name="recycle" size={17} /></button></header>
      {!editing && notice}
      {!data ? <div className="admin-card admin-loading"><p>{feedback?.error ? 'Owner access is required to open store management.' : 'Loading your store…'}</p>{feedback?.error && <a className="admin-button" href="/signin-with-chatgpt?return_to=%2Fadmin%2F" target="_top">Sign in again ↗</a>}</div> : data.needsSetup ? <section className="admin-card admin-setup"><p className="eyebrow">ONE SIMPLE START</p><h2>Set up your store desk.</h2><p>This creates your shared product, inventory and settings records and connects this owner account. The eight sample products start with <strong>zero stock</strong>; enter your actual quantities before using the inventory.</p><p>Receiving UPI: <strong>vijay@upi</strong> · Buyback page: <strong>Off</strong> · Payments: <strong>Not active</strong></p><button className="admin-button" disabled={busy} onClick={async () => {const next = await save({action: 'initialize'}, 'Store management is ready. Add real product details and counted stock.'); if (next) setSettings(next.settings);}}>{busy ? 'Setting up…' : 'Set up store management'} <Icon name="arrow" size={17} /></button></section> : <>
        <div className="admin-metrics" aria-label="Store overview"><div><span>Published products</span><strong>{data.products.filter(product => product.status === 'published').length.toString().padStart(2, '0')}</strong><small>{data.products.length} products in your catalogue</small></div><div><span>Stock on hand</span><strong>{stockCount.toLocaleString('en-IN')}</strong><small>Counted units across colours and sizes</small></div><div><span>Receiving UPI</span><strong className="admin-metric-upi">{data.settings.upiId}</strong><small>Saved · gateway setup pending</small></div><div><span>Buyback page</span><strong>{data.settings.buybackEnabled ? 'On' : 'Off'}</strong><small>Information only · no claims</small></div></div>

        <section className="admin-workspace" aria-labelledby="admin-section-title">
          <div className="admin-section-heading"><div><p className="eyebrow">0{sections.indexOf(section) + 1} / STORE MANAGEMENT</p><h2 id="admin-section-title" ref={sectionHeading} tabIndex={-1}>{section}</h2></div>{section === 'Products' && <button className="admin-button" disabled={busy || !data.inventoryReady} onClick={() => openEditor()}><Icon name="plus" size={18} /> Add product</button>}</div>

          {section === 'Products' && <>
            <div className="admin-filters"><label className="admin-search"><Icon name="search" size={18} /><input aria-label="Search products" type="search" placeholder="Search by name, fit or wash" value={query} onChange={event => setQuery(event.target.value)} /></label><label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All products</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label></div>
            <div className="admin-product-list">{visibleProducts.map(product => <article className="admin-product-row" key={product.id}><img src={product.image} alt="" width="60" height="78" /><div className="admin-product-name"><h3>{product.name}</h3><p>{product.category} · {product.fit} · {product.colors.map(color => color.name).join(', ')}</p><span className={`admin-badge ${product.status}`}>{product.status}</span></div><div className="admin-product-price"><span>Price</span><strong>{formatPrice(product.price)}</strong><small>MRP {formatPrice(product.mrp)}</small></div><div className="admin-product-stock"><span>On hand</span><strong>{product.variants.reduce((sum, variant) => sum + variant.onHand, 0)}</strong><small>{product.variants.length} colour-size SKUs</small></div><button className="admin-button secondary" disabled={busy || !data.inventoryReady} aria-label={`Edit ${product.name}`} onClick={() => openEditor(product)}>Edit <Icon name="arrow" size={16} /></button></article>)}{!visibleProducts.length && <p className="admin-empty">No products match. Try another search or add your first product.</p>}</div>
            <p className="admin-help">Published = website par dikhai dega. Draft aur archived products shopping se hidden rehte hain. Product badalne ke baad Save zaroor karein.</p>
          </>}

          <div hidden={section !== 'Inventory'}><InventoryDesk key={inventoryReset} data={data} busy={busy} save={save} onDirtyChange={setInventoryDirty} referenceQuery={referenceQuery} searchReference={searchReference} /></div>
          {!data.inventoryReady && section === 'Products' && <div className="admin-info"><strong>Upgrade your existing stock records first.</strong><p>Open Inventory and choose Upgrade inventory. Your existing quantities will be preserved; colour and size editing unlocks afterwards.</p><button className="admin-button secondary" type="button" onClick={() => setSection('Inventory')}>Open Inventory</button></div>}

          {section === 'Settings' && settings && <form className="admin-settings" onSubmit={async event => {event.preventDefault(); const next = await save({action: 'saveSettings', upiId: settings.upiId.trim(), buybackEnabled: settings.buybackEnabled, expectedRevision: settings.revision}, 'Store settings saved. Changes apply across devices.'); if (next) setSettings(next.settings);}}>
            <div className="admin-card"><div className="admin-card-heading"><span className="admin-section-number">01</span><div><h3>Receiving UPI</h3><p>Your intended payment destination</p></div><span className="admin-badge low">Setup pending</span></div><label>UPI ID<input name="upiId" disabled={busy} required maxLength={100} value={settings.upiId} onChange={event => setSettings({...settings, upiId: event.target.value})} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="name@bank" /></label><p className="admin-help">UPI ID badalne ke liye yahan edit karke Save settings dabayein. Format check hota hai; bank account ownership verify nahi hoti.</p><div className="admin-info"><strong>Payments are not active.</strong><p>This saves the intended receiving ID. It does not change an active YouPI account or enable checkout. When YouPI is hosted, its receiving account must match this ID before payments open.</p></div></div>
            <div className="admin-card"><div className="admin-card-heading"><span className="admin-section-number">02</span><div><h3>Buyback</h3><p>Control what shoppers can see</p></div></div><label className="admin-switch"><span><strong>Show buyback page &amp; eligibility checker</strong><small>{settings.buybackEnabled ? 'On — program information is visible.' : 'Off — promotions and the checklist are hidden.'}</small></span><input type="checkbox" disabled={busy} role="switch" checked={settings.buybackEnabled} onChange={event => setSettings({...settings, buybackEnabled: event.target.checked})} /></label><p className="admin-help">On karne se sirf program ki information aur preliminary checklist dikhegi. Claims, credit aur discount approval abhi available nahi hain.</p></div>
            <div className="admin-save-row"><span>Changes save to the shared store database.</span><button className="admin-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'} <Icon name="check" size={18} /></button></div>
          </form>}

          {section === 'Activity' && <><p className="admin-help">Recent saved changes, with the owner and reason. Dates are shown in India time.</p><ol className="admin-activity">{data.audit.map(entry => <li key={entry.id}><span className="admin-activity-mark"><Icon name={entry.action.includes('stock') ? 'bag' : 'check'} size={18} /></span><div><h3>{activityNames[entry.action] || 'Store updated'}</h3>{entry.productId && <p>{data.products.find(product => product.id === entry.productId)?.name || entry.productId}</p>}<p>{entry.reason}</p>{entry.action === 'stock_adjusted' && typeof (entry.after as {onHand?: unknown} | null)?.onHand === 'number' && <p>{String((entry.after as {sku?: string}).sku || 'Stock')}: {String((entry.before as {onHand?: number} | null)?.onHand ?? 0)} → {String((entry.after as {onHand: number}).onHand)} units</p>}<small>{entry.actorEmail}</small></div><time dateTime={entry.createdAt}>{Number.isNaN(Date.parse(entry.createdAt)) ? entry.createdAt : dateFormat.format(new Date(entry.createdAt))}</time></li>)}</ol>{!data.audit.length && <p className="admin-empty">Saved changes will appear here.</p>}</>}

          {section === 'Guide' && <div className="admin-guide">{[
            ['01', 'Admin login', 'Website ke address ke baad /admin/ kholein aur apne owner ChatGPT account se sign in karein. Koi default admin password nahi hai. Customer account page alag hai.'],
            ['02', 'Products update karna', 'Products → Add product ya Edit. Har colour ki photos aur sizes ek hi product mein add karein. Har colour-size ka apna fixed SKU hota hai. Name, fit, price aur MRP update karein. Published select karke Save product dabayein. Naya product address create hone ke baad fixed rehta hai.'],
            ['03', 'Inventory maintain karna', 'Inventory → colour-size SKU → Count stock → actual total aur reason → Save stock count. Reserve stock se temporary hold, Record stock sale se deduction, Release se cancellation aur Return stock se inspected units wapas add hote hain. Expiry par hold khud release hota hai. Sale record payment confirmation nahi hai.'],
            ['04', 'UPI ID badalna', `Settings → Receiving UPI → nayi ID → Save settings. Abhi ${data.settings.upiId} configured hai. YouPI setup hone par gateway ka receiving account bhi isi ID se connect karna hoga.`],
            ['05', 'Buyback on / off', 'Settings → Buyback switch → Save settings. Off se promotion aur checklist hide hote hain. On se information wapas aati hai; claims aur buyback discounts abhi activate nahi hote.'],
            ['06', 'Payment ka flow', 'Real order ka approved total → YouPI checkout → customer pays → bank reconciliation → verified confirmation. Screenshot ya success redirect se payment confirm nahi hota. Gateway aur order system ready hone tak checkout payment nahi lega.'],
            ['07', 'Doosre device par changes', 'Changes shared database mein save hote hain. Storefront reload karein. Admin mein Reload saved values se latest data lein; isse unsaved edits replace honge. Conflict aaye to latest values reload karke dobara edit karein.'],
          ].map(([number, title, body]) => <article className="admin-card" key={number}><span className="admin-section-number">{number}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>}
        </section>
      </>}
    </div>

    <dialog ref={dialog} className="admin-editor" aria-labelledby="admin-editor-title" onCancel={event => {if (busy) event.preventDefault();}} onClose={() => {setEditing(null); setUpload(null);}}>
      {editing && <form key={`${editing.id}:${editing.revision}`} onSubmit={saveProduct}>
        <div className="admin-editor-heading"><div><p className="eyebrow">WESTOS / PRODUCT DETAILS</p><h2 id="admin-editor-title">{editing.revision ? 'Edit your product.' : 'A new piece of WESTOS.'}</h2></div><button className="admin-close" type="button" disabled={busy} aria-label="Close product editor" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div>
        {notice}
        {feedback?.error && <button type="button" className="admin-button secondary admin-editor-reload" disabled={busy} onClick={reload}>Discard edits &amp; reload saved values</button>}
        <fieldset disabled={busy} className="admin-form-grid"><label className="admin-full">Product name<input name="name" required maxLength={120} defaultValue={editing.name} placeholder="e.g. The Daybreak Straight" /></label><label className="admin-full">Product address<input name="slug" required readOnly={editing.revision > 0} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} defaultValue={editing.slug} placeholder="e.g. daybreak-straight" /><small>{editing.revision ? 'This address stays fixed so product links keep working.' : 'Lowercase words separated by hyphens. This becomes /product/your-address/.'}</small></label><label>Category<select name="category" defaultValue={editing.category}><option>Men</option><option>Women</option></select></label><label>Fit<select name="fit" defaultValue={editing.fit}>{fits.map(fit => <option key={fit}>{fit}</option>)}</select></label><label>Price (₹)<input name="price" type="number" required min="1" max="1000000" step="1" defaultValue={editing.revision ? editing.price : ''} /></label><label>MRP (₹)<input name="mrp" type="number" required min="1" max="1000000" step="1" defaultValue={editing.revision ? editing.mrp : ''} /><small>Must be at least the selling price.</small></label><label className="admin-full">Description<textarea name="description" required rows={4} maxLength={2000} defaultValue={editing.description} /></label><label>Collection<select name="collection" defaultValue={editing.collection}>{collections.map(collection => <option key={collection}>{collection}</option>)}</select></label><label>Badge (optional)<input name="badge" maxLength={40} defaultValue={editing.badge || ''} placeholder="e.g. New" /></label>
          <section className="admin-full admin-colours" aria-label="Product colours and sizes">
            <div className="admin-colour-heading"><div><h3>Colours, photos &amp; sizes</h3><p className="admin-help">Each colour-size has its own stock. First photo is the main photo; the first colour is shown on product cards.</p></div><button type="button" className="admin-button secondary" disabled={editing.colors.length >= 12 || editing.variants.length >= 100 || !!upload} onClick={addColor}><Icon name="plus" size={16} /> Add colour</button></div>
            {editing.colors.map((color, colorIndex) => {
              const variants = editing.variants.filter(variant => variant.colorId === color.id).sort((a, b) => a.size - b.size);
              const stocked = variants.some(variant => variant.onHand || variant.reserved);
              return <fieldset className="admin-colour-card" key={color.id}><legend>Colour {colorIndex + 1}{color.name ? ` · ${color.name}` : ''}</legend>
                <div className="admin-form-grid"><label>Colour name<input required maxLength={60} value={color.name} onChange={event => changeColor(color.id, {name: event.target.value})} placeholder="e.g. Washed black" /></label><label>Colour swatch<input type="color" value={color.hex} onChange={event => changeColor(color.id, {hex: event.target.value})} /></label></div>
                <div className="admin-colour-photos">{color.images.map((image, index) => <div key={`${image}-${index}`}><img src={image} alt={`${color.name || 'New colour'}, photo ${index + 1}`} width="88" height="112" /><span>{index === 0 ? 'Main photo' : `Photo ${index + 1}`}</span><div>{index > 0 && <button type="button" className="admin-button secondary" onClick={() => changeColor(color.id, {images: [image, ...color.images.filter((_, position) => position !== index)]})}>Make main</button>}<button type="button" className="admin-button secondary" disabled={color.images.length === 1 || !!upload} aria-label={`Remove ${color.name} photo ${index + 1}`} onClick={() => changeColor(color.id, {images: color.images.filter((_, position) => position !== index)})}>Remove</button></div></div>)}</div>
                <div className="admin-photo-tools"><label>Add sample photo<select disabled={color.images.length >= 6 || !!upload} value="" onChange={event => {if (event.target.value) changeColor(color.id, {images: [...color.images, event.target.value]});}}><option value="">Choose a photo</option>{[1, 2, 3, 4].map(number => <option key={number} disabled={color.images.includes(`/images/product-${number}.webp`)} value={`/images/product-${number}.webp`}>Sample photo {number}</option>)}</select></label><label>Add your photo<input key={`${color.id}-${upload?.colorId === color.id ? upload.file.name : 'empty'}`} disabled={color.images.length >= 6 || !!upload} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {const file = event.target.files?.[0]; if (file) setUpload({file, colorId: color.id});}} /><small>Up to 6 photos per colour · JPG, PNG or WebP · 5 MB each</small></label></div>
                {upload?.colorId === color.id && <div className="admin-stock-actions"><span>{upload.file.name}</span><button type="button" className="admin-button secondary" onClick={() => setUpload(null)}>Clear selection</button><button type="button" className="admin-button" onClick={uploadPhoto}>{busy ? 'Uploading…' : 'Upload selected photo'}</button></div>}
                <div className="admin-variant-list">{variants.map(variant => <div className="admin-variant-row" key={variant.id}><strong>Size {variant.size}</strong><label>SKU<input required maxLength={120} pattern="[A-Z0-9]+(?:-[A-Z0-9]+)*" readOnly={variant.revision > 0} value={variant.sku} onChange={event => setEditing({...editing, variants: editing.variants.map(item => item.id === variant.id ? {...item, sku: event.target.value.toUpperCase()} : item)})} /><small>{variant.revision > 0 ? 'Saved SKU stays fixed.' : 'Unique stock code. You may edit it before saving.'}</small></label><button type="button" className="admin-close" disabled={variants.length === 1 || !!variant.onHand || !!variant.reserved} aria-label={`Remove ${color.name} size ${variant.size}`} onClick={() => setEditing({...editing, variants: editing.variants.filter(item => item.id !== variant.id)})}><Icon name="close" size={16} /></button></div>)}</div>
                <div className="admin-colour-actions"><label>Add waist size<select value="" disabled={editing.variants.length >= 100} onChange={event => {if (event.target.value) addSize(color.id, Number(event.target.value));}}><option value="">Choose a size</option>{Array.from({length: 41}, (_, index) => index + 20).filter(size => !variants.some(variant => variant.size === size)).map(size => <option key={size} value={size}>{size}</option>)}</select></label><button type="button" className="admin-button secondary" disabled={editing.colors.length === 1 || stocked || !!upload} onClick={() => setEditing({...editing, colors: editing.colors.filter(item => item.id !== color.id), variants: editing.variants.filter(variant => variant.colorId !== color.id)})}>Remove colour</button></div>
                <p className="admin-help">New sizes start at zero. Enter counted quantities in Inventory after saving. Stocked, reserved or previously sold sizes cannot be removed. Archive the product when it is no longer sold.</p>
              </fieldset>;
            })}
          </section>
          <label className="admin-full">Visibility<select name="status" defaultValue={editing.status}><option value="draft">Draft — hidden from shoppers</option><option value="published">Published — visible on the website</option><option value="archived">Archived — no longer listed</option></select></label>
        </fieldset>
        <div className="admin-editor-actions"><button className="admin-button secondary" type="button" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button className="admin-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'} <Icon name="check" size={18} /></button></div>
      </form>}
    </dialog>
  </div>;
}
