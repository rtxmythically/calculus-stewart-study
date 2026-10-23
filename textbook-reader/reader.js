(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('textbook-reader-data').textContent);
  const readers = [...document.querySelectorAll('[data-reader]')];
  const storageKey = 'calculus-textbook-reading-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) {}
  function remember(reader, section, index) {
    saved[reader.id] = {section, index};
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch (_) {}
  }
  function render(reader, section, index) {
    const content = data[section];
    index = Math.max(0, Math.min(index, content.pages.length - 1));
    const page = content.pages[index];
    const chooser = reader.querySelector('[data-reader-page]');
    reader.querySelector('[data-reader-section]').value = section;
    chooser.replaceChildren(...content.pages.map((p,i) => {
      const option = document.createElement('option');
      option.value = String(i); option.textContent = `書頁 ${p.book_page} / PDF ${p.pdf_page}`;
      return option;
    }));
    chooser.value = String(index);
    const image = reader.querySelector('[data-reader-image]');
    image.src = page.image;
    image.alt = `Stewart ${section === 'D' ? 'Appendix D' : '§' + section}，原書第 ${page.book_page} 頁（PDF 第 ${page.pdf_page} 頁），完整原文、公式與圖表`;
    reader.querySelector('[data-reader-caption]').textContent = `Stewart ${section === 'D' ? 'Appendix D' : '§' + section} · 書頁 ${page.book_page} / PDF 第 ${page.pdf_page} 頁`;
    reader.querySelector('.reader-status').textContent = `本節第 ${index + 1} / ${content.pages.length} 頁`;
    reader.querySelector('[data-reader-prev]').disabled = index === 0;
    reader.querySelector('[data-reader-next]').disabled = index === content.pages.length - 1;
    const blocks = reader.querySelector('[data-reader-blocks]');
    blocks.replaceChildren(...page.blocks.map((block,i) => {
      const article = document.createElement('section'); article.className = 'reader-block';
      const anchor = document.createElement('div'); anchor.className = 'reader-anchor';
      anchor.textContent = `${i + 1}. ${block.anchor}`;
      const zh = document.createElement('p'); zh.className = 'reader-zh'; zh.textContent = block.zh;
      article.append(anchor,zh); return article;
    }));
    reader.dataset.section = section; reader.dataset.index = String(index);
    remember(reader,section,index);
  }
  readers.forEach(reader => {
    const allowed = reader.dataset.sections.split(',');
    const record = saved[reader.id];
    const section = record && allowed.includes(record.section) ? record.section : allowed[0];
    render(reader,section,record && Number.isInteger(record.index) ? record.index : 0);
    reader.querySelector('[data-reader-section]').addEventListener('change',event => render(reader,event.target.value,0));
    reader.querySelector('[data-reader-page]').addEventListener('change',event => render(reader,reader.dataset.section,Number(event.target.value)));
    reader.querySelector('[data-reader-prev]').addEventListener('click',() => render(reader,reader.dataset.section,Number(reader.dataset.index)-1));
    reader.querySelector('[data-reader-next]').addEventListener('click',() => render(reader,reader.dataset.section,Number(reader.dataset.index)+1));
  });
  document.querySelectorAll('[data-reader-open]').forEach(button => button.addEventListener('click', () => {
    const reader = button.dataset.readerOwner ? document.getElementById(button.dataset.readerOwner) : button.closest('[data-reader]');
    const reference = reader.closest('details.reader-reference');
    if (reference) reference.open = true;
    const section = button.dataset.readerOpen;
    const pageIndex = data[section].pages.findIndex(page => page.pdf_page === Number(button.dataset.sourcePage));
    render(reader,section,Math.max(0,pageIndex));
    reader.scrollIntoView({block:'start',behavior:'smooth'});
  }));

  const dialog = document.getElementById('reader-image-dialog');
  const viewport = dialog.querySelector('.reader-zoom-viewport');
  const zoomImage = dialog.querySelector('[data-zoom-image]');
  const zoomOut = dialog.querySelector('[data-zoom-out]');
  const zoomIn = dialog.querySelector('[data-zoom-in]');
  let zoom = 1;
  let opener = null;
  let returnPosition = null;
  function updateZoom(next, keepPosition = true) {
    const previous = zoom;
    zoom = Math.max(1, Math.min(3, next));
    const focusX = (viewport.scrollLeft + viewport.clientWidth / 2) / previous;
    const focusY = (viewport.scrollTop + viewport.clientHeight / 2) / previous;
    zoomImage.style.width = Math.max(1, viewport.clientWidth - 32) * zoom + 'px';
    dialog.querySelector('[data-zoom-percent]').textContent = Math.round(zoom * 100) + '%';
    zoomOut.disabled = zoom === 1;
    zoomIn.disabled = zoom === 3;
    viewport.scrollLeft = keepPosition ? focusX * zoom - viewport.clientWidth / 2 : 0;
    viewport.scrollTop = keepPosition ? focusY * zoom - viewport.clientHeight / 2 : 0;
  }
  document.querySelectorAll('[data-reader-zoom]').forEach(button => button.addEventListener('click', () => {
    const reader = button.closest('[data-reader]');
    const source = reader.querySelector('[data-reader-image]');
    opener = button;
    returnPosition = {x:window.scrollX, y:window.scrollY};
    zoomImage.src = source.src;
    zoomImage.alt = source.alt;
    dialog.querySelector('[data-zoom-caption]').textContent = reader.querySelector('[data-reader-caption]').textContent;
    document.documentElement.classList.add('reader-image-open');
    dialog.showModal();
    updateZoom(1, false);
  }));
  zoomIn.addEventListener('click', () => updateZoom(zoom + 0.25));
  zoomOut.addEventListener('click', () => updateZoom(zoom - 0.25));
  dialog.querySelector('[data-zoom-fit]').addEventListener('click', () => updateZoom(1, false));
  dialog.querySelector('[data-zoom-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not([disabled]), [tabindex="0"]')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('reader-image-open');
    if (returnPosition) window.scrollTo(returnPosition.x, returnPosition.y);
    if (opener && opener.isConnected) opener.focus({preventScroll:true});
  });
  window.addEventListener('resize', () => { if (dialog.open) updateZoom(zoom); });
  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); });
})();
