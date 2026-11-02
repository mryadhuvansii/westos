// Open the WESTOS homepage and paste this file into the browser console.
// This checks the real UI without dependencies, navigation, or changing the bag.
(async () => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const filters = [...document.querySelectorAll('.room-filters button')];
  assert(filters.length === 3, 'Run this check on the WESTOS denim-room homepage.');
  filters[2].click();
  await settle();
  assert(document.querySelectorAll('.rail-pair').length === 4, 'Women filter must show four pairs.');
  filters[0].click();
  await settle();
  assert(document.querySelectorAll('.rail-pair').length === 8, 'All filter must restore eight pairs.');
  document.querySelector('.rail-pair').click();
  await settle();
  const dialog = document.querySelector('.rail-dialog');
  assert(dialog.open, 'A pair must open its preview.');
  assert(document.activeElement === dialog.querySelector('.rail-dialog-close'), 'Preview must focus its close control.');
  const add = dialog.querySelector('.add-row .button');
  assert(add.disabled, 'A size must be required before adding a pair.');
  dialog.querySelector('.size-options button').click();
  await settle();
  assert(!add.disabled, 'Choosing a size must enable adding.');
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
