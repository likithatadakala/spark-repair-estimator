// Pure parser — extracts a candidate serial + 4-digit manufacture year from OCR text.
// Exported separately so it can be unit-tested without a browser/Tesseract.
export function parseSerialText(text){
  const raw = String(text || '');
  // Plausible manufacture year: 1970..current+1.
  const nowYear = 2026; // build-time constant; OCR years beyond this+1 are implausible
  let year = '';
  const yearMatches = raw.match(/\b(19[7-9]\d|20\d{2})\b/g) || [];
  for (const y of yearMatches){ const n = +y; if (n >= 1970 && n <= nowYear + 1){ year = y; break; } }
  // Serial heuristic: the longest token containing BOTH a letter and a digit,
  // length >= 5 (data-plate serials/models are alphanumeric); fall back to ''.
  const tokens = raw.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  let serial = '';
  for (const t of tokens){
    if (t.length >= 5 && /[A-Z]/.test(t) && /\d/.test(t) && t.length > serial.length) serial = t;
  }
  return { text: raw.trim(), serial, year };
}

let _tessPromise = null;
const TESS_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

// Lazily inject Tesseract.js from CDN on first use (keeps initial app load light).
// The service worker (Task 13) will runtime-cache this + the worker/wasm/lang assets
// so repeat use works offline. Rejects if it cannot load (e.g. offline first run).
export function loadTesseract(){
  if (_tessPromise) return _tessPromise;
  _tessPromise = new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);
    const s = document.createElement('script');
    s.src = TESS_CDN; s.async = true;
    s.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Tesseract failed to initialize'));
    s.onerror = () => { _tessPromise = null; reject(new Error('Could not load OCR engine')); };
    document.head.appendChild(s);
  });
  return _tessPromise;
}

// Run OCR on an image Blob and return {text, serial, year}. Browser-only.
export async function readSerial(blob){
  const Tesseract = await loadTesseract();
  const { data } = await Tesseract.recognize(blob, 'eng');
  return parseSerialText(data?.text || '');
}
