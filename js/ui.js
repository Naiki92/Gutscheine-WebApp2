/* ui.js – UI‑Helfer: Modal, Toast, Formatierung, Progress */
(function(global){
    'use strict';
  
    const modalRoot = document.getElementById('modal-root');
    const toastContainer = document.getElementById('toast-container');
    let activeModal = null;
    let lastFocused = null;
  
    // ---- Modal ----
    function openModal(contentEl, opts={}){
      if (activeModal) closeModal();
      lastFocused = document.activeElement;
  
      modalRoot.setAttribute('aria-hidden', 'false');
      modalRoot.innerHTML = `
        <div class="modal-backdrop" data-dismiss></div>
        <div class="modal" role="dialog" aria-modal="true">
        </div>
      `;
      const modal = modalRoot.querySelector('.modal');
      modal.appendChild(contentEl);
      activeModal = modal;
  
      // Fokusfalle
      trapFocus(modal);
      // ESC & Klick außerhalb
      modalRoot.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKeyDown);
      // Fokus initial
      setTimeout(() => {
        const firstFocusable = getFocusable(modal)[0] || modal;
        firstFocusable.focus();
      }, 0);
  
      function onBackdrop(e){
        if (e.target && e.target.hasAttribute('data-dismiss')) closeModal();
      }
      function onKeyDown(e){
        if (e.key === 'Escape') {
          closeModal();
        } else if (e.key === 'Tab') {
          maintainFocus(e, modal);
        }
      }
    }
  
    function closeModal(){
      if (!activeModal) return;
      modalRoot.setAttribute('aria-hidden', 'true');
      modalRoot.innerHTML = '';
      activeModal = null;
      document.removeEventListener('keydown', onDocKey);
      modalRoot.removeEventListener('click', onBackdropClick);
      if (lastFocused && typeof lastFocused.focus === 'function') {
        try { lastFocused.focus(); } catch {}
      }
    }
    // Dummy handler refs for removeEventListener safety
    function onDocKey(){} function onBackdropClick(){}
  
    function getFocusable(root){
      return [...root.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])')]
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    }
    function maintainFocus(e, root){
      const f = getFocusable(root);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus(); e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus(); e.preventDefault();
      }
    }
    function trapFocus(root){
      // nothing extra (handled in keydown)
    }
  
    // ---- Toast ----
    function toast(message, timeout=2600){
      if (!toastContainer) return;
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = message;
      toastContainer.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; }, timeout - 400);
      setTimeout(() => { el.remove(); }, timeout);
    }
  
    // ---- Formatierung ----
    function formatDateTime(iso){
      try{
        const d = new Date(iso);
        return d.toLocaleString('de-DE', { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
      }catch{ return iso; }
    }
  
    // Expose
    global.ui = { openModal, closeModal, toast, formatDateTime };
  })(window);
  