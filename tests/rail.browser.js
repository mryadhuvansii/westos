// Open the WESTOS homepage and paste this file into the browser console.
// This checks the real UI without dependencies, navigation, or changing the bag.
(async () => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const filters = [...document.querySelectorAll('.room-filters button')];
  assert(filters.length === 3, 'Run this check on the WESTOS denim-room homepage.');
  filters[2].click();
  await settle();
  assert(document.querySelectorAll('.rail-pair').length === Number(filters[2].querySelector('sup').textContent), 'Women filter must match the current catalogue count.');
  filters[0].click();
  await settle();
  assert(document.querySelectorAll('.rail-pair').length === Number(filters[0].querySelector('sup').textContent), 'All filter must restore the current catalogue.');
  assert(document.querySelector('.rail-pair'), 'Publish at least one product before running this rail check.');
  document.querySelector('.rail-pair').click();
  await settle();
  const dialog = document.querySelector('.rail-dialog');
  assert(dialog.open, 'A pair must open its preview.');
  assert(document.activeElement === dialog.querySelector('.rail-dialog-close'), 'Preview must focus its close control.');
  const viewer = dialog.querySelector('.jeans-360-view');
  assert(viewer, 'The Denim Room must open a rotatable fit preview.');
  const angle = viewer.querySelector('input[type="range"]');
  viewer.querySelector('[aria-label="Rotate jeans right 45 degrees"]').click();
  await settle();
  assert(angle.value === '45', 'The rotation button must move the model.');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(angle, '180');
  angle.dispatchEvent(new Event('input', {bubbles:true}));
  await settle();
  assert(angle.getAttribute('aria-valuetext') === 'back view, 180 degrees', 'The accessible slider must select the back view.');
  assert([...dialog.querySelectorAll('a')].some(link => link.textContent.includes('View product photos') && link.href.includes('/product/')), 'The rail must link to the real catalog photo page.');
  const add = dialog.querySelector('.add-row .button');
  assert(add.disabled, 'A size must be required before adding a pair.');
  const availableSize = dialog.querySelector('.size-options button:not(:disabled)');
  if (availableSize) {
    availableSize.click();
    await settle();
    assert(!add.disabled || add.textContent.includes('Available quantity in bag'), 'Choosing stocked size must enable adding unless the bag already contains the available quantity.');
  } else assert(add.disabled, 'Out-of-stock pieces cannot be added.');
  const fitGuide = dialog.querySelector('a[href="/fit-guide/"]');
  fitGuide.addEventListener('click', event => event.preventDefault(), { capture: true, once: true });
  fitGuide.click();
  await settle();
  assert(!dialog.open, 'Links inside shared product options must close the preview.');
  document.querySelector('.rail-pair').click();
  await settle();
  assert(dialog.open, 'The same pair must reopen after closing.');
  dialog.querySelector('.rail-dialog-close').click();
  console.log('WESTOS rail UI checks passed; shopping bag unchanged.');
})();
