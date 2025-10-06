/* scanner.js – QR‑Scanner Flow (iOS‑kompatibel)
   Vorgehen:
   1) BarcodeDetector (falls verfügbar)
   2) ZXing @zxing/browser (Video)
   3) Datei‑Upload mit ZXing aus Bild
   – Immer: nach Treffer ALLE Tracks stoppen & Controls schließen; dann Redirect.
*/
(function(){
    'use strict';
  
    const video = document.getElementById('video');
    const btnStart = document.getElementById('btn-start');
    const fileInput = document.getElementById('file');
    const statusEl = document.getElementById('scan-status');
  
    let mediaStream = null;
    let rafId = 0;
    let detector = null;
    let zxingReader = null;
    let zxingControls = null;
    let foundOnce = false;
  
    const ZX = window.ZXingBrowser; // über CDN
    const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));
  
    btnStart.addEventListener('click', startScanning);
    fileInput.addEventListener('change', onFileChosen);
  
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') stopAll();
    });
    window.addEventListener('pagehide', stopAll);
  
    function updateStatus(msg){
      statusEl.innerHTML = msg;
    }
  
    async function startScanning(){
      foundOnce = false;
      updateStatus('Starte Kamera…');
      // 1) BarcodeDetector
      if ('BarcodeDetector' in window) {
        try {
          const formats = (await window.BarcodeDetector.getSupportedFormats?.()) || ['qr_code'];
          if (!formats.includes('qr_code')) throw new Error('qr_code nicht unterstützt');
          detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          await startStream();
          await startDetectorLoop();
          return;
        } catch (err) {
          console.warn('BarcodeDetector nicht nutzbar, fallback:', err);
          await stopAll();
        }
      }
  
      // 2) ZXing Video
      try {
        await startZXingVideo();
        return;
      } catch (err) {
        console.warn('ZXing Video fehlgeschlagen:', err);
        await stopAll();
        updateStatus('Kamera‑Zugriff nicht möglich. Du kannst eine Bilddatei wählen.');
      }
    }
  
    async function startStream(){
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      video.srcObject = mediaStream;
      await video.play();
    }
  
    async function startDetectorLoop(){
      updateStatus('Scanner aktiv – QR in den Rahmen halten.');
      const loop = async () => {
        if (foundOnce) return;
        try {
          const barcodes = await detector.detect(video);
          const qr = barcodes.find(b => (b.format || b.rawValue) && (b.format === 'qr_code' || true));
          if (qr && qr.rawValue) {
            onCode(qr.rawValue);
            return;
          }
        } catch (e) {
          // still retry
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }
  
    async function startZXingVideo(){
      if (!ZX) throw new Error('ZXing nicht geladen');
      zxingReader = new ZX.BrowserMultiFormatReader();
      updateStatus('ZXing aktiv – QR in den Rahmen halten.');
      zxingControls = await zxingReader.decodeFromVideoDevice(null, 'video', (result, err) => {
        if (foundOnce) return;
        if (result) {
          const text = result.text || result.getText?.() || '';
          if (text) onCode(text);
        }
        // err kann NotFoundException sein – ignorieren
      });
    }
  
    async function onFileChosen(ev){
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      await stopAll();
      if (!ZX) { updateStatus('ZXing nicht verfügbar.'); return; }
      try {
        updateStatus('Lese Bild…');
        const reader = new ZX.BrowserMultiFormatReader();
        const url = URL.createObjectURL(file);
        const result = await reader.decodeFromImageUrl(url);
        URL.revokeObjectURL(url);
        const text = result.text || result.getText?.() || '';
        if (text) onCode(text);
        else updateStatus('Kein QR‑Code im Bild gefunden.');
      } catch (e) {
        console.warn(e);
        updateStatus('Kein QR‑Code im Bild gefunden.');
      } finally {
        // nix
      }
    }
  
    function normalizeCode(raw){
      const cleaned = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
      return cleaned.length === 5 ? cleaned : '';
    }
  
    async function onCode(rawText){
      if (foundOnce) return;
      const code = normalizeCode(rawText);
      if (!code) {
        updateStatus('Gefundener Inhalt ist kein 5‑stelliger Code.');
        return;
      }
      foundOnce = true;
      await stopAll();
      updateStatus('Code erkannt – weiterleiten…');
      // Redirect zur Startseite (kein Öffnen von URLs!)
      location.href = 'index.html#code=' + encodeURIComponent(code);
    }
  
    async function stopAll(){
      try { cancelAnimationFrame(rafId); } catch {}
      try { if (zxingControls && typeof zxingControls.stop === 'function') await zxingControls.stop(); } catch {}
      try { if (zxingReader && typeof zxingReader.reset === 'function') zxingReader.reset(); } catch {}
      if (mediaStream) {
        try { mediaStream.getTracks().forEach(t => t.stop()); } catch {}
        mediaStream = null;
      }
      video.srcObject = null;
    }
  
  })();
  