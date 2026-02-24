// src/utils/convert.js
// Conversiones reales 100% en el navegador. Sin servidor, sin APIs de pago.
// Librerías: pdf-lib, mammoth (instaladas vía npm)

import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";

/* ── Descarga un Blob como fichero ── */
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ── Nombre sin extensión ── */
export const basename = (f) => f.name.replace(/\.[^.]+$/, "");

// ─────────────────────────────────────────────────────────────────
// 1. UNIR PDFs
// ─────────────────────────────────────────────────────────────────
export async function mergePdfs(files) {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  const out = await merged.save();
  download(new Blob([out], { type: "application/pdf" }), "merged.pdf");
}

// ─────────────────────────────────────────────────────────────────
// Parsear rango "1-3, 5, 7-9" → índices base-0: [0,1,2,4,6,7,8]
// ─────────────────────────────────────────────────────────────────
export function parsePageRange(rangeStr, total) {
  let indices = [];
  if (rangeStr.trim()) {
    for (const part of rangeStr.split(",")) {
      const [a, b] = part.trim().split("-").map(n => parseInt(n.trim()) - 1);
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
  if (indices.length === 0) throw new Error("Rango de páginas inválido");
  return indices;
}

// ─────────────────────────────────────────────────────────────────
// 2. DIVIDIR PDF
// ─────────────────────────────────────────────────────────────────
export async function splitPdf(file, rangeStr) {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = doc.getPageCount();

  const indices = parsePageRange(rangeStr, total);

  for (const idx of indices) {
    const newDoc  = await PDFDocument.create();
    const [page]  = await newDoc.copyPages(doc, [idx]);
    newDoc.addPage(page);
    const out = await newDoc.save();
    download(
      new Blob([out], { type: "application/pdf" }),
      `${basename(file)}-p${idx + 1}.pdf`
    );
    await new Promise(r => setTimeout(r, 120));
  }
}

// ─────────────────────────────────────────────────────────────────
// Escalar dimensiones al tamaño A4 (595×842 pt) manteniendo aspecto
// ─────────────────────────────────────────────────────────────────
export function scaleToA4(w, h, maxW = 595, maxH = 842) {
  if (w <= maxW && h <= maxH) return { w, h };
  const scale = Math.min(maxW / w, maxH / h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

// ─────────────────────────────────────────────────────────────────
// 3. IMÁGENES → PDF
// ─────────────────────────────────────────────────────────────────
export async function imagesToPdf(files) {
  const doc = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const ext   = file.name.split(".").pop().toLowerCase();
    let image;

    if (ext === "jpg" || ext === "jpeg") {
      image = await doc.embedJpg(bytes);
    } else if (ext === "png") {
      image = await doc.embedPng(bytes);
    } else if (ext === "webp") {
      // WEBP → PNG via Canvas (pdf-lib no soporta WEBP directamente)
      const blob  = new Blob([bytes], { type: "image/webp" });
      const url   = URL.createObjectURL(blob);
      const img   = new Image();
      await new Promise((res, rej) => {
        img.onload = res; img.onerror = rej; img.src = url;
      });
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngBlob  = await new Promise(r => cv.toBlob(r, "image/png"));
      const pngBytes = await pngBlob.arrayBuffer();
      image = await doc.embedPng(pngBytes);
    }

    if (image) {
      const { w, h } = scaleToA4(image.width, image.height);
      const page = doc.addPage([w, h]);
      page.drawImage(image, { x: 0, y: 0, width: w, height: h });
    }
  }

  const out = await doc.save();
  download(new Blob([out], { type: "application/pdf" }), "imagenes.pdf");
}

// ─────────────────────────────────────────────────────────────────
// 4. COMPRIMIR PDF
// ─────────────────────────────────────────────────────────────────
export async function compressPdf(file, level) {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const out = await doc.save({
    useObjectStreams: level !== "low",
    addDefaultPage:  false,
    objectsPerTick:  level === "high" ? 100 : level === "medium" ? 50 : 20,
  });

  const saving = Math.round((1 - out.byteLength / file.size) * 100);
  console.info(
    `[morf] ${(file.size/1024).toFixed(0)} KB → ${(out.byteLength/1024).toFixed(0)} KB (${saving}% menos)`
  );

  download(
    new Blob([out], { type: "application/pdf" }),
    `${basename(file)}-comprimido.pdf`
  );
}

// ─────────────────────────────────────────────────────────────────
// 5. WORD → PDF
// Convierte DOCX a HTML con mammoth → abre diálogo de impresión
// El usuario selecciona "Guardar como PDF" en el diálogo
// ─────────────────────────────────────────────────────────────────
export async function wordToPdf(file) {
  const bytes  = await file.arrayBuffer();

  const result = await mammoth.convertToHtml({
    arrayBuffer: bytes,
    convertImage: mammoth.images.imgElement(img =>
      img.read("base64").then(data => ({
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
      font-size: 11pt; line-height: 1.6; color: #111;
      margin: 0; padding: 0;
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
      .page { max-width: 100%; padding: 0; }
      @page { margin: 2.5cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="page">${result.value}</div>
  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 400));
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    // Navegador bloqueó el popup → descargar como HTML
    download(
      new Blob([html], { type: "text/html;charset=utf-8" }),
      `${basename(file)}.html`
    );
    return "popup-blocked";
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return "print-dialog";
}

// ─────────────────────────────────────────────────────────────────
// Escapar caracteres especiales de RTF
// ─────────────────────────────────────────────────────────────────
export function escapeRtf(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\{/g,  "\\{")
    .replace(/\}/g,  "\\}")
    .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`);
}

// ─────────────────────────────────────────────────────────────────
// 6. PDF → WORD  (extrae texto → genera RTF que Word abre directamente)
// ─────────────────────────────────────────────────────────────────
export async function pdfToWord(file) {
  // Cargamos pdf.js desde CDN solo para esta función (es muy pesado para instalar)
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const bytes = await file.arrayBuffer();
  const pdf   = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lines = {};
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push(item.str);
    }

    const text = Object.keys(lines)
      .sort((a, b) => b - a)
      .map(y => lines[y].join(" "))
      .join("\n");

    pages.push(text);
  }

  const rtfBody = pages
    .map((p, i) => {
      const lines = p.split("\n").map(l => escapeRtf(l) + "\\par").join("\n");
      return i > 0 ? `\\page\n${lines}` : lines;
    })
    .join("\n");

  const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0
{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}}
\\f0\\fs22
${rtfBody}
}`;

  download(
    new Blob([rtf], { type: "application/rtf" }),
    `${basename(file)}.rtf`
  );
}

// ─────────────────────────────────────────────────────────────────
// Convertir un nodo XML de ODT a HTML
// ─────────────────────────────────────────────────────────────────
export function convertOdtNode(node) {
  if (node.nodeType === 3) return node.textContent; // texto plano

  const tag = node.localName;
  const children = Array.from(node.childNodes).map(convertOdtNode).join("");

  if (tag === "p")           return `<p>${children}</p>`;
  if (tag === "h")           return `<h2>${children}</h2>`;
  if (tag === "span")        return children;
  if (tag === "s")           return " ".repeat(parseInt(node.getAttribute("text:c")||"1"));
  if (tag === "tab")         return "&nbsp;&nbsp;&nbsp;&nbsp;";
  if (tag === "line-break")  return "<br/>";
  if (tag === "list")        return `<ul>${children}</ul>`;
  if (tag === "list-item")   return `<li>${children}</li>`;
  if (tag === "table")       return `<table>${children}</table>`;
  if (tag === "table-row")   return `<tr>${children}</tr>`;
  if (tag === "table-cell")  return `<td>${children}</td>`;
  if (tag === "a")           return `<a>${children}</a>`;

  return children;
}

// ─────────────────────────────────────────────────────────────────
// 7. ODT → PDF
// ODT es un ZIP con content.xml dentro. Extraemos el texto con JSZip,
// lo renderizamos como HTML y abrimos el diálogo de impresión.
// ─────────────────────────────────────────────────────────────────
export async function odtToPdf(file) {
  // Cargar JSZip desde CDN
  if (!window.JSZip) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const bytes  = await file.arrayBuffer();
  const zip    = await window.JSZip.loadAsync(bytes);

  // content.xml contiene el texto del documento
  const contentXml = await zip.file("content.xml")?.async("string");
  if (!contentXml) throw new Error("No se encontró content.xml en el ODT");

  // Parsear el XML
  const parser = new DOMParser();
  const doc    = parser.parseFromString(contentXml, "text/xml");

  const body = doc.querySelector("body") || doc.querySelector("text");
  const html_body = body ? convertOdtNode(body) : "<p>No se pudo extraer el contenido.</p>";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${basename(file)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #111; margin: 0; }
    .page { max-width: 21cm; margin: 0 auto; padding: 2.5cm; }
    h2 { font-size: 14pt; margin: 1em 0 .4em; }
    p  { margin: 0 0 .6em; }
    table { border-collapse: collapse; width: 100%; margin: .8em 0; }
    td, th { border: 1px solid #CCC; padding: 5px 8px; }
    ul { margin: .5em 0 .8em 1.5em; }
    li { margin-bottom: .25em; }
    @media print { .page { max-width: 100%; padding: 0; } @page { margin: 2.5cm; size: A4; } }
  </style>
</head>
<body>
  <div class="page">${html_body}</div>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 400));</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    download(new Blob([html], { type: "text/html;charset=utf-8" }), `${basename(file)}.html`);
    return "popup-blocked";
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return "print-dialog";
}

// ─────────────────────────────────────────────────────────────────
// 8. PNG → JPG
// ─────────────────────────────────────────────────────────────────
export async function pngToJpg(file, quality = 0.92) {
  const bytes = await file.arrayBuffer();
  const blob  = new Blob([bytes], { type: "image/png" });
  const url   = URL.createObjectURL(blob);
  const img   = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#FFFFFF"; // fondo blanco (JPG no tiene transparencia)
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  const jpgBlob = await new Promise(r => cv.toBlob(r, "image/jpeg", quality));
  download(jpgBlob, `${basename(file)}.jpg`);
}

// ─────────────────────────────────────────────────────────────────
// 9. JPG → PNG
// ─────────────────────────────────────────────────────────────────
export async function jpgToPng(file) {
  const bytes = await file.arrayBuffer();
  const blob  = new Blob([bytes], { type: "image/jpeg" });
  const url   = URL.createObjectURL(blob);
  const img   = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  cv.getContext("2d").drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  const pngBlob = await new Promise(r => cv.toBlob(r, "image/png"));
  download(pngBlob, `${basename(file)}.png`);
}

// ─────────────────────────────────────────────────────────────────
// 10. ROTAR PDF
// ─────────────────────────────────────────────────────────────────
export async function rotatePdf(file, degrees = 90) {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });

  doc.getPages().forEach(page => {
    const current = page.getRotation().angle;
    page.setRotation({ type: "degrees", angle: (current + degrees) % 360 });
  });

  const out = await doc.save();
  download(new Blob([out], { type: "application/pdf" }), `${basename(file)}-rotado.pdf`);
}

// ─────────────────────────────────────────────────────────────────
// 11. EXCEL → PDF
// Usa SheetJS para leer el Excel → genera tabla HTML → impresión
// ─────────────────────────────────────────────────────────────────
export async function excelToPdf(file) {
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const bytes    = await file.arrayBuffer();
  const workbook = window.XLSX.read(bytes, { type: "array" });

  let allSheets = "";
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const html  = window.XLSX.utils.sheet_to_html(sheet, { editable: false });
    allSheets += `
      <div class="sheet">
        <div class="sheet-name">${sheetName}</div>
        ${html}
      </div>`;
  }

  const htmlDoc = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${basename(file)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; margin: 0; padding: 0; }
    .page { padding: 1.5cm; }
    .sheet { margin-bottom: 2em; page-break-after: always; }
    .sheet:last-child { page-break-after: avoid; }
    .sheet-name { font-size: 12pt; font-weight: 600; margin-bottom: 10px; color: #1C3042; border-bottom: 2px solid #1C3042; padding-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; font-size: 9pt; }
    td, th { border: 1px solid #CCC; padding: 4px 8px; text-align: left; white-space: nowrap; }
    tr:nth-child(even) { background: #F5F5F5; }
    th, tr:first-child td { background: #E8EDF2; font-weight: 600; }
    @media print { body { padding: 0; } .page { padding: 0; } @page { margin: 1.5cm; size: A4 landscape; } }
  </style>
</head>
<body>
  <div class="page">${allSheets}</div>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 400));</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1000,height=700");
  if (!win) {
    download(new Blob([htmlDoc], { type: "text/html;charset=utf-8" }), `${basename(file)}.html`);
    return "popup-blocked";
  }
  win.document.open();
  win.document.write(htmlDoc);
  win.document.close();
  return "print-dialog";
}
