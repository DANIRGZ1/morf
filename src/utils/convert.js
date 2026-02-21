// src/utils/convert.js
// ─────────────────────────────────────────────────────────────────
// Conversiones reales 100% en el navegador. Sin servidor, sin APIs de pago.
//
// Librerías usadas (cargadas dinámicamente desde CDN):
//   · pdf-lib  v1.17  → merge, split, imágenes→PDF, comprimir
//   · mammoth  v1.6   → Word (DOCX) → PDF  (vía HTML + impresión)
//   · pdf.js   v3.11  → PDF → texto extraído → RTF (abre en Word)
// ─────────────────────────────────────────────────────────────────

/* ── Cargador de scripts CDN ── */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing._ready) { resolve(); return; }
      existing.addEventListener('load',  resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload  = () => { s._ready = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function getPdfLib() {
  if (!window.PDFLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
  }
  return window.PDFLib;
}

async function getMammoth() {
  if (!window.mammoth) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  }
  return window.mammoth;
}

async function getPdfJs() {
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return window.pdfjsLib;
}

/* ── Descarga un Blob como fichero ── */
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ── Nombre limpio sin extensión ── */
const basename = (f) => f.name.replace(/\.[^.]+$/, '');

// ─────────────────────────────────────────────────────────────────
// 1. UNIR PDFs  →  un solo PDF en el orden dado
// ─────────────────────────────────────────────────────────────────
export async function mergePdfs(files) {
  const { PDFDocument } = await getPdfLib();
  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  const out = await merged.save();
  download(new Blob([out], { type: 'application/pdf' }), 'merged.pdf');
}

// ─────────────────────────────────────────────────────────────────
// 2. DIVIDIR PDF  →  un PDF por página (o por rango)
// ─────────────────────────────────────────────────────────────────
export async function splitPdf(file, rangeStr) {
  const { PDFDocument } = await getPdfLib();
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = doc.getPageCount();

  // Parsear rango  "1-3, 5, 7-9"  →  [0,1,2,4,6,7,8]
  let indices = [];
  if (rangeStr.trim()) {
    for (const part of rangeStr.split(',')) {
      const [a, b] = part.trim().split('-').map(n => parseInt(n.trim()) - 1);
      if (!isNaN(b)) {
        for (let i = a; i <= Math.min(b, total - 1); i++) indices.push(i);
      } else if (!isNaN(a) && a >= 0 && a < total) {
        indices.push(a);
      }
    }
    indices = [...new Set(indices)].sort((a, b) => a - b);
  } else {
    indices = Array.from({ length: total }, (_, i) => i);
  }

  if (indices.length === 0) throw new Error('Rango de páginas inválido');

  for (const idx of indices) {
    const newDoc  = await PDFDocument.create();
    const [page]  = await newDoc.copyPages(doc, [idx]);
    newDoc.addPage(page);
    const out = await newDoc.save();
    download(new Blob([out], { type: 'application/pdf' }), `${basename(file)}-p${idx + 1}.pdf`);
    // Pequeña pausa para no saturar descargas simultáneas
    await new Promise(r => setTimeout(r, 120));
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. IMÁGENES → PDF  (JPG, PNG, WEBP)
// ─────────────────────────────────────────────────────────────────
export async function imagesToPdf(files) {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const ext   = file.name.split('.').pop().toLowerCase();
    let image;

    if (ext === 'jpg' || ext === 'jpeg') {
      image = await doc.embedJpg(bytes);
    } else if (ext === 'png') {
      image = await doc.embedPng(bytes);
    } else if (ext === 'webp') {
      // WEBP → PNG via Canvas (pdf-lib no soporta WEBP directamente)
      const blob  = new Blob([bytes], { type: 'image/webp' });
      const url   = URL.createObjectURL(blob);
      const img   = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const cv    = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngBlob  = await new Promise(r => cv.toBlob(r, 'image/png'));
      const pngBytes = await pngBlob.arrayBuffer();
      image = await doc.embedPng(pngBytes);
    }

    if (image) {
      // Ajustar al tamaño de la imagen; máx A4
      const maxW = 595, maxH = 842;
      let w = image.width, h = image.height;
      if (w > maxW || h > maxH) {
        const scale = Math.min(maxW / w, maxH / h);
        w = Math.round(w * scale); h = Math.round(h * scale);
      }
      const page = doc.addPage([w, h]);
      page.drawImage(image, { x: 0, y: 0, width: w, height: h });
    }
  }

  const out = await doc.save();
  download(new Blob([out], { type: 'application/pdf' }), 'imagenes.pdf');
}

// ─────────────────────────────────────────────────────────────────
// 4. COMPRIMIR PDF
// ─────────────────────────────────────────────────────────────────
export async function compressPdf(file, level) {
  const { PDFDocument } = await getPdfLib();
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const out = await doc.save({
    useObjectStreams: level !== 'low',     // streams comprimidos
    addDefaultPage:  false,
    objectsPerTick:  level === 'high' ? 100 : level === 'medium' ? 50 : 20,
  });

  const original = file.size;
  const result   = out.byteLength;
  const saving   = Math.round((1 - result / original) * 100);
  console.info(`[morf] Compresión: ${(original/1024).toFixed(0)} KB → ${(result/1024).toFixed(0)} KB (${saving}% menos)`);

  download(
    new Blob([out], { type: 'application/pdf' }),
    `${basename(file)}-comprimido.pdf`
  );
}

// ─────────────────────────────────────────────────────────────────
// 5. WORD → PDF  (DOCX → HTML con mammoth → impresión del navegador)
//
//    Calidad: muy buena para texto y tablas básicas.
//    Imágenes dentro del DOCX: incluidas si mammoth las extrae.
//    El usuario ve el diálogo "Imprimir" del navegador → "Guardar como PDF"
// ─────────────────────────────────────────────────────────────────
export async function wordToPdf(file) {
  const mammoth = await getMammoth();
  const bytes   = await file.arrayBuffer();

  // Convertir imágenes incrustadas a base64 para que aparezcan en la vista previa
  const result  = await mammoth.convertToHtml({
    arrayBuffer: bytes,
    convertImage: mammoth.images.imgElement(img =>
      img.read('base64').then(data => ({
        src: `data:${img.contentType};base64,${data}`,
      }))
    ),
  });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${basename(file)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt; line-height: 1.6;
      color: #111; margin: 0; padding: 0;
    }
    .page { max-width: 21cm; margin: 0 auto; padding: 2.5cm; }
    h1 { font-size: 18pt; margin: 0 0 .5em; }
    h2 { font-size: 14pt; margin: 1em 0 .4em; }
    h3 { font-size: 12pt; margin: .8em 0 .3em; }
    p  { margin: 0 0 .6em; }
    table { border-collapse: collapse; width: 100%; margin: .8em 0; }
    td, th { border: 1px solid #CCC; padding: 5px 8px; font-size: 10pt; }
    th { background: #F0F0F0; font-weight: 600; }
    img { max-width: 100%; height: auto; }
    ul, ol { margin: .5em 0 .8em 1.5em; }
    li { margin-bottom: .25em; }
    @media print {
      body { padding: 0; }
      .page { max-width: 100%; padding: 0; }
      @page { margin: 2.5cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="page">${result.value}</div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    // El navegador bloqueó el pop-up: descargar como HTML (fallback)
    download(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `${basename(file)}.html`
    );
    return 'popup-blocked';
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return 'print-dialog';
}

// ─────────────────────────────────────────────────────────────────
// 6. PDF → WORD  (extrae texto con pdf.js → genera RTF)
//
//    RTF es un formato que Word, LibreOffice y Pages abren sin problema.
//    Limitación: no conserva el layout exacto, solo el texto estructurado.
// ─────────────────────────────────────────────────────────────────
export async function pdfToWord(file) {
  const pdfjsLib = await getPdfJs();
  const bytes    = await file.arrayBuffer();
  const pdf      = await pdfjsLib.getDocument({ data: bytes }).promise;

  // Extraer texto página a página
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Reconstruir líneas agrupando por posición Y
    const lines = {};
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push(item.str);
    }

    const text = Object.keys(lines)
      .sort((a, b) => b - a)                    // mayor Y = arriba
      .map(y => lines[y].join(' '))
      .join('\n');

    pages.push(text);
  }

  // Escapar caracteres especiales RTF
  const esc = (s) => s
    .replace(/\\/g, '\\\\')
    .replace(/\{/g,  '\\{')
    .replace(/\}/g,  '\\}')
    .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`);

  const rtfBody = pages
    .map((p, i) => {
      const lines = p.split('\n').map(l => esc(l) + '\\par').join('\n');
      return i > 0 ? `\\page\n${lines}` : lines;
    })
    .join('\n');

  const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1034
{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}{\\f1\\fswiss\\fcharset0 Calibri;}}
{\\colortbl ;\\red0\\green0\\blue0;}
\\widowctrl\\hyphauto
\\f1\\fs22\\cf1
${rtfBody}
}`;

  download(
    new Blob([rtf], { type: 'application/rtf' }),
    `${basename(file)}.rtf`
  );
}
