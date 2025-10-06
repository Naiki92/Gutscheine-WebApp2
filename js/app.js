/* app.js – Startseite: Daten laden, Filter/Progress, Modal, Historie
   Anforderungen:
   - lädt data/Gutscheine.json, bei Fehler Fallback verwenden
   - erkennt #code= / ?code=
   - validiert Codes, öffnet Modal, Einlösen -> localStorage
   - URL nach Einlösen bereinigen
*/

(function () {
    'use strict';
  
    const CATEGORIES = ["ROMANTIK", "CHILL", "GENUSS", "FUN"];
    const qs = (sel, el = document) => el.querySelector(sel);
    const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];
  
    let ALL_VOUCHERS = [];
    let SELECTED = new Set(CATEGORIES); // Multi-Filter standard: alle aktiv
  
    // ------- Boot -------
    document.addEventListener('DOMContentLoaded', init);
  
    async function init() {
      try {
        ALL_VOUCHERS = await loadVouchers();
      } catch (e) {
        console.error(e);
        ui.toast("Konnte Daten nicht laden – Fallback genutzt.");
        ALL_VOUCHERS = (window.GUTSCHEINE_FALLBACK || []);
      }
  
      buildCategoryChips();
      updateProgressAndCounts();
      renderHistoryTeaser();
      renderHistoryFull();
  
      // URL Code prüfen
      const urlCode = getCodeFromURL();
      if (urlCode) {
        const normalized = normalizeCode(urlCode);
        if (normalized && findVoucher(normalized)) {
          openVoucherByCode(normalized);
        } else {
          ui.toast("Unbekannter oder ungültiger Code.");
          clearCodeFromURL(); // aufräumen
        }
      }
  
      // Buttons
      qs('#btn-export')?.addEventListener('click', onExportCSV);
      qs('#btn-reset')?.addEventListener('click', onReset);
    }
  
    // ------- Daten laden -------
    async function loadVouchers() {
      const res = await fetch('data/Gutscheine.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = await res.json();
      // leichte Validierung
      const ok = Array.isArray(list) && list.every(v => isValidCode(v.code) && CATEGORIES.includes(v.category));
      if (!ok) throw new Error('Ungültiges Datenformat');
      return list;
    }
  
    // ------- Kategorien & Filter -------
    function buildCategoryChips() {
      const row = qs('#category-filters');
      row.innerHTML = '';
      const redeemed = storage.getRedeemed();
  
      for (const cat of CATEGORIES) {
        const total = ALL_VOUCHERS.filter(v => v.category === cat).length;
        const redeemedCount = redeemed.filter(r => r.category === cat).length;
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.type = 'button';
        chip.setAttribute('role', 'switch');
        chip.setAttribute('aria-pressed', 'true');
        chip.dataset.cat = cat;
        chip.innerHTML = `
          <span class="dot" aria-hidden="true"></span>
          <span class="label">${cat}</span>
          <span class="count" aria-label="eingelöst von gesamt"> ${redeemedCount}/${total}</span>
        `;
        chip.addEventListener('click', () => {
          const active = chip.getAttribute('aria-pressed') === 'true';
          if (active) {
            chip.setAttribute('aria-pressed', 'false');
            SELECTED.delete(cat);
          } else {
            chip.setAttribute('aria-pressed', 'true');
            SELECTED.add(cat);
          }
          if (SELECTED.size === 0) {
            ui.toast("Keine Kategorie ausgewählt – Anzeige leer.");
          }
          updateProgressAndCounts();
          renderHistoryTeaser();
          renderHistoryFull();
        });
        row.appendChild(chip);
      }
    }
  
    function updateProgressAndCounts() {
      const redeemed = storage.getRedeemed().filter(r => SELECTED.has(r.category));
      const totalInFilter = ALL_VOUCHERS.filter(v => SELECTED.has(v.category)).length;
      const redeemedInFilter = redeemed.length;
  
      const label = qs('#progress-label');
      label.textContent = `${redeemedInFilter} von ${totalInFilter} eingelöst`;
  
      const sub = qs('#progress-sub');
      sub.textContent = `Kategorie‑Filter aktiv: ${SELECTED.size === CATEGORIES.length ? 'alle' : [...SELECTED].join(', ')}`;
  
      const percent = totalInFilter === 0 ? 0 : Math.round((redeemedInFilter / totalInFilter) * 100);
      const fill = qs('#progressbar-fill');
      fill.style.width = percent + '%';
      const pb = fill.parentElement;
      pb.setAttribute('aria-valuenow', String(percent));
  
      // Update Zahlen auf Chips
      qsa('.chip').forEach(chip => {
        const cat = chip.dataset.cat;
        const t = ALL_VOUCHERS.filter(v => v.category === cat).length;
        const r = storage.getRedeemed().filter(x => x.category === cat).length;
        chip.querySelector('.count').textContent = ` ${r}/${t}`;
      });
    }
  
    // ------- Historie -------
    function renderHistoryTeaser() {
      const list = qs('#history-teaser');
      const redeemed = storage.getRedeemed()
        .filter(r => SELECTED.has(r.category))
        .sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at))
        .slice(0, 3);
  
      list.innerHTML = '';
      if (!redeemed.length) {
        list.innerHTML = `<li class="history-item"><div class="h-left"><span class="h-title">Noch keine Einlösungen</span></div><span class="h-meta">Sobald du einen Gutschein einlöst, erscheint er hier.</span></li>`;
        return;
      }
      for (const r of redeemed) {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
          <div class="h-left">
            <span class="code-badge" aria-label="Code">${r.code}</span>
            <div>
              <div class="h-title">${escapeHTML(r.title)}</div>
              <div class="h-meta"><span class="cat-badge cat-${r.category}">${r.category}</span> · ${ui.formatDateTime(r.redeemed_at)}</div>
            </div>
          </div>
          <div aria-hidden="true">
            <svg width="18" height="18"><use href="assets/icons.svg#check"></use></svg>
          </div>
        `;
        list.appendChild(li);
      }
    }
  
    function renderHistoryFull() {
      const list = qs('#history-full');
      const redeemed = storage.getRedeemed()
        .filter(r => SELECTED.has(r.category))
        .sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at));
  
      list.innerHTML = '';
      if (!redeemed.length) {
        list.innerHTML = `<li class="history-item"><div class="h-left"><span class="h-title">Noch keine Einlösungen</span></div><span class="h-meta">Tippe auf „Code scannen“, um zu starten.</span></li>`;
        return;
      }
      for (const r of redeemed) {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
          <div class="h-left">
            <span class="code-badge">${r.code}</span>
            <div>
              <div class="h-title">${escapeHTML(r.title)}</div>
              <div class="h-meta"><span class="cat-badge cat-${r.category}">${r.category}</span> · ${ui.formatDateTime(r.redeemed_at)}</div>
            </div>
          </div>
        `;
        list.appendChild(li);
      }
    }
  
    // ------- Code aus URL -------
    function getCodeFromURL() {
      // Hash: #code=XXXXX
      if (location.hash && location.hash.startsWith('#code=')) {
        return decodeURIComponent(location.hash.slice('#code='.length + 1 - 1)); // robust
      }
      // Query: ?code=XXXXX
      const p = new URLSearchParams(location.search);
      if (p.has('code')) return p.get('code');
      return '';
    }
  
    function clearCodeFromURL() {
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch {}
    }
  
    function isValidCode(str) {
      return /^[A-Z0-9]{5}$/.test(str);
    }
    function normalizeCode(str) {
      if (!str) return '';
      const v = String(str).toUpperCase().replace(/[^A-Z0-9]/g, '');
      return v.length === 5 ? v : '';
    }
  
    function findVoucher(code) {
      return ALL_VOUCHERS.find(v => v.code === code) || null;
    }
  
    async function openVoucherByCode(code) {
      const voucher = findVoucher(code);
      if (!voucher) {
        ui.toast("Unbekannter Code.");
        clearCodeFromURL();
        return;
      }
      const already = storage.isRedeemed(code);
      const modalEl = buildVoucherModal(voucher, already);
      ui.openModal(modalEl, { onClose: () => {} });
    }
  
    function buildVoucherModal(voucher, alreadyRedeemed) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">
            <span class="cat-badge cat-${voucher.category}">${voucher.category}</span>
            ${escapeHTML(voucher.title)}
          </h3>
          <button class="btn btn-ghost" type="button" data-close aria-label="Modal schließen">Schließen</button>
        </div>
        <div class="modal-body">
          ${voucher.media_url ? `<img src="${escapeAttr(voucher.media_url)}" alt="" loading="lazy">` : ''}
          <p>${escapeHTML(voucher.description || 'Ohne Beschreibung')}</p>
          <p class="muted small">Code: <strong>${voucher.code}</strong></p>
          <div class="modal-actions">
            <button class="btn btn-primary" type="button" id="btn-redeem" aria-label="Gutschein einlösen">
              <svg aria-hidden="true" width="18" height="18"><use href="assets/icons.svg#check"></use></svg>
              Einlösen
            </button>
            <button class="btn" type="button" data-close aria-label="Abbrechen">Abbrechen</button>
          </div>
        </div>
      `;
      const redeemBtn = wrapper.querySelector('#btn-redeem');
  
      if (alreadyRedeemed) {
        redeemBtn.disabled = true;
        redeemBtn.textContent = 'Bereits eingelöst';
      }
  
      redeemBtn?.addEventListener('click', () => {
        if (storage.isRedeemed(voucher.code)) {
          ui.toast('Dieser Gutschein wurde bereits eingelöst.');
          clearCodeFromURL();
          ui.closeModal();
          return;
        }
        storage.addRedeemed({
          code: voucher.code,
          title: voucher.title,
          category: voucher.category,
          redeemed_at: new Date().toISOString()
        });
        ui.toast('Gutschein gespeichert 🎉');
        updateProgressAndCounts();
        renderHistoryTeaser();
        renderHistoryFull();
        clearCodeFromURL();
        ui.closeModal();
      });
  
      wrapper.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', ui.closeModal));
      return wrapper;
    }
  
    // ------- CSV Export / Reset -------
    function onExportCSV() {
      const redeemed = storage.getRedeemed();
      if (!redeemed.length) {
        ui.toast('Keine Einträge zum Exportieren.');
        return;
      }
      const csv = storage.exportCSV(ALL_VOUCHERS, redeemed);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gutschein-historie-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 100);
    }
  
    function onReset() {
      if (confirm('Wirklich alle Einlösungen löschen?')) {
        storage.resetRedeemed();
        ui.toast('Historie gelöscht.');
        updateProgressAndCounts();
        renderHistoryTeaser();
        renderHistoryFull();
      }
    }
  
    // ------- Utils -------
    function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
    function escapeAttr(s){ return escapeHTML(s).replace(/"/g, '&quot;'); }
  
    // Exponiere für Debug optional
    window.__APP__ = { get vouchers(){return ALL_VOUCHERS;} };
  
  })();
  