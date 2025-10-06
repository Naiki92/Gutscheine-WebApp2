# Gutschein‑WebApp (statisch, iPhone‑tauglich)

Eine **liebevoll gestaltete, statische Web‑App** zur Verwaltung und Einlösung persönlicher Gutscheine – mit **QR‑Scanner**, **Historie**, **Kategorien‑Filtern** und **CSV‑Export**. Komplett ohne Build‑Tools oder Frameworks: reines **HTML/CSS/JS**, sofort **per Drag & Drop** auf jeden Webhost deploybar.

---

## 🚀 Deployment

1. Das gesamte Verzeichnis so wie geliefert hochladen:
```
/
├─ index.html
├─ scan.html
├─ css/style.css
├─ js/{app.js,scanner.js,storage.js,ui.js}
├─ data/Gutscheine.json
└─ assets/icons.svg
```
2. **HTTPS ist erforderlich**, damit der Kamera‑Zugriff (Scanner) auf iOS funktioniert.  
Auf vielen Hosts ist HTTPS automatisch aktiv. Prüfe, ob `https://` genutzt wird.

> Hinweis: Falls `data/Gutscheine.json` wegen CORS oder `file://` nicht geladen werden kann, wird automatisch das **Fallback‑Dataset** aus `index.html` genutzt.

---

## 🧪 Lokal testen (mit HTTPS)

Beispiel mit Node.js:

npx http-server --ssl
# oder ein beliebiger lokaler HTTPS-Dev-Server
Dann im Browser https://localhost:8080 (oder Port des Servers) öffnen.
🗂 Daten pflegen (data/Gutscheine.json)
Format: JSON‑Array aus Objekten:
{
  "code": "A2F9K",
  "category": "ROMANTIK",   // eine von: ROMANTIK | CHILL | GENUSS | FUN
  "title": "Titel",
  "description": "Kurze Beschreibung",
  "media_url": ""           // optional, leer lassen wenn unklar
}
Code‑Regeln:
exakt 5 Zeichen, Base36, also A–Z, 0–9, Großbuchstaben.
keine Duplikate.
Kategorien sollten gleichmäßig verteilt werden, damit die Fortschrittsanzeige sinnvoll ist.
📱 iOS‑Troubleshooting (Safari, iOS 15+)
Kamera funktioniert nur über HTTPS oder lokal mit speziellen Flags/Servern.
Scanner startet erst nach Button‑Klick (User‑Gesture).
<video playsinline muted> sorgt dafür, dass die Vorschau ohne Vollbild läuft.
Bei verweigerten Rechten oder Tabwechsel: App stoppt Kamera‑Streams automatisch (visibilitychange/pagehide).
Wenn die Kamera „hängt“: Seite neu laden oder in iOS Einstellungen → Safari → Website‑Daten leeren.
🧭 Bedienung & UX
Startseite:
Primär‑CTA „Code scannen“ öffnet die eigene Scanner‑Seite.
Fortschrittsanzeige zeigt „X von N“ und animierten Balken.
Kategorien‑Chips filtern Fortschritt & Historie (Mehrfachauswahl).
Historie‑Teaser zeigt die letzten 3 Einlösungen.
Scanner (scan.html):
Reihenfolge: BarcodeDetector → ZXing → Bilddatei‑Fallback.
Bei Treffer: Sofort Kamera/Controls stoppen, keine URL öffnen, zurück zu index.html#code=XXXXX.
Einlösen:
index.html erkennt #code oder ?code, zeigt eine Modal‑Karte.
„Einlösen“ speichert in localStorage (vouchers_redeemed_v1), UI aktualisiert.
URL wird danach bereinigt, damit Refresh nicht erneut öffnet.
💾 CSV‑Export & Reset
In der Historie:
CSV exportieren erstellt eine Datei gutschein-historie-YYYY-MM-DD.csv (UTF‑8 mit BOM, Semikolon‑Spalten).
Zurücksetzen löscht alle Einlösungen nach Bestätigung.
Daten werden nur lokal im Browser gespeichert (kein Server).
🔒 Qualität & Sicherheit
QR‑Inhalt wird ausschließlich als Gutschein‑Code interpretiert.
Keine externen Links werden geöffnet.
Code‑Validierung: nur [A-Z0-9]{5} wird akzeptiert.
Defensive Fehlerbehandlung (freundliche Meldungen), keine unhandled Promises.
Kamera‑Lebenszyklus: Tracks werden immer gestoppt – bei Treffer, Tabwechsel, Seitenverlassen.
♿️ Zugänglichkeit
Semantische Rollen, aria-*, sichtbare :focus-visible‑Ringe.
Modal hat role="dialog", aria-modal="true", ESC schließt, Fokus‑Falle aktiv.
🔧 Einzige externe Bibliothek
ZXing (@zxing/browser UMD) wird nur auf scan.html eingebunden:
https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js
Globale Variable: window.ZXingBrowser.
Viel Freude beim Einlösen! ❤️
