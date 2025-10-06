/* storage.js – kapselt localStorage & CSV */
(function(global){
    'use strict';
  
    const KEY = 'vouchers_redeemed_v1';
  
    function getRedeemed(){
      try{
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return [];
        // Grobe Validierung
        return list.filter(x => x && x.code && x.title && x.category && x.redeemed_at);
      }catch{
        return [];
      }
    }
  
    function setRedeemed(list){
      try{
        localStorage.setItem(KEY, JSON.stringify(list));
      }catch(e){
        console.warn('Konnte LocalStorage nicht schreiben:', e);
      }
    }
  
    function addRedeemed(entry){
      const list = getRedeemed();
      if (list.some(x => x.code === entry.code)) return; // Duplikate vermeiden
      list.push(entry);
      setRedeemed(list);
    }
  
    function isRedeemed(code){
      return getRedeemed().some(x => x.code === code);
    }
  
    // CSV Export – nutzt nur redeemed; vouchers ist für evtl. Lookup reserviert
    function exportCSV(vouchers, redeemed){
      const SEP = ';'; // deutschfreundlich
      const lines = [];
      lines.push('\uFEFF' + ['Datum','Code','Kategorie','Titel'].join(SEP)); // BOM + Header
      for (const r of redeemed) {
        lines.push([r.redeemed_at, r.code, r.category, r.title.replaceAll(SEP, ',')].join(SEP));
      }
      return lines.join('\r\n');
    }
  
    function resetRedeemed(){
      try{
        localStorage.removeItem(KEY);
      }catch{}
    }
  
    global.storage = { getRedeemed, setRedeemed, addRedeemed, isRedeemed, exportCSV, resetRedeemed };
  })(window);
  