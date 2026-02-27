// src/utils/convert.ts
// Conversiones reales 100% en el navegador. Sin servidor, sin APIs de pago.
// Librerías: pdf-lib, mammoth (instaladas vía npm)

import { PDFDocument, degrees as pdfDegrees, rgb, StandardFonts } from "pdf-lib";
import mammoth from "mammoth";

/** Wrap pdf-lib Uint8Array output (which uses ArrayBufferLike) into a Blob. */
const pdfBlob = (out: Uint8Array, type = "application/pdf") =>
  new Blob([out as unknown as ArrayBuffer], { type });

/* ── Descarga un Blob como fichero ── */
function download(blob: Blob, filename: string): void {
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
export const basename = (f: { name: string }): string => f.name.replace(/\.[^.]+$/, "");

// ─────────────────────────────────────────────────────────────────
// 1. UNIR PDFs
// ─────────────────────────────────────────────────────────────────
export async function mergePdfs(files: File[]): Promise<void> {
  const merged = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  const out = await merged.save();
  download(pdfBlob(out), "merged.pdf");
}

// ─────────────────────────────────────────────────────────────────
// Parsear rango "1-3, 5, 7-9" → índices base-0: [0,1,2,4,6,7,8]
// ─────────────────────────────────────────────────────────────────
export function parsePageRange(rangeStr: string, total: number): number[] {
  let indices: number[] = [];
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
export async function splitPdf(file: File, rangeStr: string): Promise<void> {
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
      pdfBlob(out),
      `${basename(file)}-p${idx + 1}.pdf`
    );
    await new Promise(r => setTimeout(r, 120));
  }
}

// ─────────────────────────────────────────────────────────────────
// Escalar dimensiones al tamaño A4 (595×842 pt) manteniendo aspecto
// ─────────────────────────────────────────────────────────────────
export function scaleToA4(w: number, h: number, maxW = 595, maxH = 842): { w: number; h: number } {
  if (w <= maxW && h <= maxH) return { w, h };
  const scale = Math.min(maxW / w, maxH / h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

// ─────────────────────────────────────────────────────────────────
// 3. IMÁGENES → PDF
// ─────────────────────────────────────────────────────────────────
export async function imagesToPdf(files: File[]): Promise<void> {
  const doc = await PDFDocument.create();

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const ext   = file.name.split(".").pop()!.toLowerCase();
    let image;

    if (ext === "jpg" || ext === "jpeg") {
      image = await doc.embedJpg(bytes);
    } else if (ext === "png") {
      image = await doc.embedPng(bytes);
    } else if (ext === "webp") {
      const blob  = new Blob([bytes], { type: "image/webp" });
      const url   = URL.createObjectURL(blob);
      const img   = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("Image load error"));
        img.src = url;
      });
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngBlob  = await new Promise<Blob>(r => cv.toBlob(b => r(b!), "image/png"));
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
  download(pdfBlob(out), "imagenes.pdf");
}

// ─────────────────────────────────────────────────────────────────
// 4. COMPRIMIR PDF
// ─────────────────────────────────────────────────────────────────
export async function compressPdf(file: File, level: string): Promise<void> {
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
    pdfBlob(out),
    `${basename(file)}-comprimido.pdf`
  );
}

// ─────────────────────────────────────────────────────────────────
// 5. WORD → PDF
// ─────────────────────────────────────────────────────────────────
export async function wordToPdf(file: File): Promise<string> {
  const bytes  = await file.arrayBuffer();

  // convertImage is a valid mammoth option not yet reflected in its TS types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (mammoth as any).convertToHtml({
    arrayBuffer: bytes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    convertImage: (mammoth as any).images.imgElement((img: any) =>
      img.read("base64").then((data: string) => ({
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
export function escapeRtf(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\{/g,  "\\{")
    .replace(/\}/g,  "\\}")
    .replace(/[^\x00-\x7F]/g, c => `\\u${c.charCodeAt(0)}?`);
}

// ─────────────────────────────────────────────────────────────────
// 6. PDF → WORD
// ─────────────────────────────────────────────────────────────────
export async function pdfToWord(file: File): Promise<void> {
  if (!window.pdfjsLib) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => res();
      s.onerror = () => rej(new Error("pdf.js load error"));
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const bytes = await file.arrayBuffer();
  const pdf   = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lines: Record<number, string[]> = {};
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push(item.str);
    }

    const text = Object.keys(lines)
      .sort((a, b) => Number(b) - Number(a))
      .map(y => lines[Number(y)].join(" "))
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
export function convertOdtNode(node: Node): string {
  if (node.nodeType === 3) return node.textContent ?? "";

  const el  = node as Element;
  const tag = el.localName;
  const children = Array.from(node.childNodes).map(convertOdtNode).join("");

  if (tag === "p")           return `<p>${children}</p>`;
  if (tag === "h")           return `<h2>${children}</h2>`;
  if (tag === "span")        return children;
  if (tag === "s")           return " ".repeat(parseInt(el.getAttribute("text:c") || "1"));
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
// ─────────────────────────────────────────────────────────────────
export async function odtToPdf(file: File): Promise<string> {
  if (!window.JSZip) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = () => res();
      s.onerror = () => rej(new Error("JSZip load error"));
      document.head.appendChild(s);
    });
  }

  const bytes  = await file.arrayBuffer();
  const zip    = await window.JSZip.loadAsync(bytes);

  const contentXml = await zip.file("content.xml")?.async("string") as string | undefined;
  if (!contentXml) throw new Error("No se encontró content.xml en el ODT");

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
// BATCH HELPERS — devuelven Blob en lugar de descargar
// ─────────────────────────────────────────────────────────────────
export async function compressPdfToBlob(file: File, level: string): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out   = await doc.save({
    useObjectStreams: level !== "low",
    addDefaultPage:  false,
    objectsPerTick:  level === "high" ? 100 : level === "medium" ? 50 : 20,
  });
  return pdfBlob(out);
}

export async function rotatePdfToBlob(file: File, degrees = 90): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  doc.getPages().forEach(page => {
    const current = page.getRotation().angle;
    page.setRotation(pdfDegrees((current + degrees) % 360));
  });
  const out = await doc.save();
  return pdfBlob(out);
}

export async function pngToJpgBlob(file: File, quality = 0.92): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const blob  = new Blob([bytes], { type: "image/png" });
  const url   = URL.createObjectURL(blob);
  const img   = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Image load error"));
    img.src = url;
  });
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return new Promise<Blob>(r => cv.toBlob(b => r(b!), "image/jpeg", quality));
}

export async function jpgToPngBlob(file: File): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const blob  = new Blob([bytes], { type: "image/jpeg" });
  const url   = URL.createObjectURL(blob);
  const img   = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Image load error"));
    img.src = url;
  });
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  cv.getContext("2d")!.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return new Promise<Blob>(r => cv.toBlob(b => r(b!), "image/png"));
}

/** Empaqueta varios Blobs en un ZIP y lo descarga como "morf_lote.zip" */
export async function downloadAsZip(items: Array<{ filename: string; blob: Blob }>): Promise<void> {
  if (!window.JSZip) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = () => res();
      s.onerror = () => rej(new Error("JSZip load error"));
      document.head.appendChild(s);
    });
  }
  const zip = new window.JSZip();
  for (const { filename, blob } of items) {
    zip.file(filename, await blob.arrayBuffer());
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  download(zipBlob, "morf_lote.zip");
}

// ─────────────────────────────────────────────────────────────────
// 8. PNG → JPG
// ─────────────────────────────────────────────────────────────────
export async function pngToJpg(file: File, quality = 0.92): Promise<void> {
  const bytes = await file.arrayBuffer();
  const blob  = new Blob([bytes], { type: "image/png" });
  const url   = URL.createObjectURL(blob);
  const img   = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Image load error"));
    img.src = url;
  });

  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  const jpgBlob = await new Promise<Blob>(r => cv.toBlob(b => r(b!), "image/jpeg", quality));
  download(jpgBlob, `${basename(file)}.jpg`);
}

// ─────────────────────────────────────────────────────────────────
// 9. JPG → PNG
// ─────────────────────────────────────────────────────────────────
export async function jpgToPng(file: File): Promise<void> {
  const bytes = await file.arrayBuffer();
  const blob  = new Blob([bytes], { type: "image/jpeg" });
  const url   = URL.createObjectURL(blob);
  const img   = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Image load error"));
    img.src = url;
  });

  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  cv.getContext("2d")!.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  const pngBlob = await new Promise<Blob>(r => cv.toBlob(b => r(b!), "image/png"));
  download(pngBlob, `${basename(file)}.png`);
}

// ─────────────────────────────────────────────────────────────────
// 10. ROTAR PDF
// ─────────────────────────────────────────────────────────────────
export async function rotatePdf(file: File, degrees = 90): Promise<void> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });

  doc.getPages().forEach(page => {
    const current = page.getRotation().angle;
    page.setRotation(pdfDegrees((current + degrees) % 360));
  });

  const out = await doc.save();
  download(pdfBlob(out), `${basename(file)}-rotado.pdf`);
}

// ─────────────────────────────────────────────────────────────────
// Helper: cargar pdf.js dinámicamente
// ─────────────────────────────────────────────────────────────────
async function ensurePdfJs(): Promise<void> {
  if (!window.pdfjsLib) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => res();
      s.onerror = () => rej(new Error("pdf.js load error"));
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
}

// ─────────────────────────────────────────────────────────────────
// 11. EXCEL → PDF
// ─────────────────────────────────────────────────────────────────
export async function excelToPdf(file: File): Promise<string> {
  if (!window.XLSX) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = () => res();
      s.onerror = () => rej(new Error("XLSX load error"));
      document.head.appendChild(s);
    });
  }

  const bytes    = await file.arrayBuffer();
  const workbook = window.XLSX.read(bytes, { type: "array" });

  let allSheets = "";
  for (const sheetName of workbook.SheetNames as string[]) {
    const sheet = workbook.Sheets[sheetName];
    const html  = window.XLSX.utils.sheet_to_html(sheet, { editable: false }) as string;
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

// ─────────────────────────────────────────────────────────────────
// 12. DESBLOQUEAR PDF (quitar restricciones de propietario)
// ─────────────────────────────────────────────────────────────────
export async function unlockPdf(file: File): Promise<void> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out   = await doc.save();
  download(pdfBlob(out), `${basename(file)}-unlocked.pdf`);
}

export async function unlockPdfToBlob(file: File): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out   = await doc.save();
  return pdfBlob(out);
}

// ─────────────────────────────────────────────────────────────────
// 13. MARCA DE AGUA PDF
// ─────────────────────────────────────────────────────────────────
export async function watermarkPdf(file: File, text: string, opacity = 0.15): Promise<void> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font  = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize  = Math.max(20, Math.min(width, height) * 0.07);
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x:       (width  - textWidth) / 2,
      y:       (height - fontSize)  / 2,
      size:    fontSize,
      font,
      color:   rgb(0.5, 0.5, 0.5),
      opacity,
      rotate:  pdfDegrees(45),
    });
  }

  const out = await doc.save();
  download(pdfBlob(out), `${basename(file)}-watermark.pdf`);
}

export async function watermarkPdfToBlob(file: File, text: string, opacity = 0.15): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font  = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize  = Math.max(20, Math.min(width, height) * 0.07);
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x:       (width  - textWidth) / 2,
      y:       (height - fontSize)  / 2,
      size:    fontSize,
      font,
      color:   rgb(0.5, 0.5, 0.5),
      opacity,
      rotate:  pdfDegrees(45),
    });
  }

  const out = await doc.save();
  return pdfBlob(out);
}

// ─────────────────────────────────────────────────────────────────
// 14. NUMERAR PÁGINAS PDF
// ─────────────────────────────────────────────────────────────────
export async function numberPagesPdf(file: File): Promise<void> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font  = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page     = pages[i];
    const { width } = page.getSize();
    const text      = `${i + 1} / ${total}`;
    const fontSize  = 9;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x:    (width - textWidth) / 2,
      y:    20,
      size: fontSize,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const out = await doc.save();
  download(pdfBlob(out), `${basename(file)}-numerado.pdf`);
}

export async function numberPagesPdfToBlob(file: File): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font  = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page      = pages[i];
    const { width } = page.getSize();
    const text      = `${i + 1} / ${total}`;
    const fontSize  = 9;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x:    (width - textWidth) / 2,
      y:    20,
      size: fontSize,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const out = await doc.save();
  return pdfBlob(out);
}

// ─────────────────────────────────────────────────────────────────
// 15. RECORTAR PDF (crop)
// ─────────────────────────────────────────────────────────────────
interface CropMargins { top: number; bottom: number; left: number; right: number; }
const MM = 2.8346; // 1 mm en puntos PDF

export async function cropPdf(file: File, margins: CropMargins): Promise<void> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const x = margins.left   * MM;
    const y = margins.bottom * MM;
    const w = width  - (margins.left  + margins.right)  * MM;
    const h = height - (margins.top   + margins.bottom) * MM;
    if (w > 0 && h > 0) page.setCropBox(x, y, w, h);
  }

  const out = await doc.save();
  download(pdfBlob(out), `${basename(file)}-recortado.pdf`);
}

export async function cropPdfToBlob(file: File, margins: CropMargins): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const x = margins.left   * MM;
    const y = margins.bottom * MM;
    const w = width  - (margins.left  + margins.right)  * MM;
    const h = height - (margins.top   + margins.bottom) * MM;
    if (w > 0 && h > 0) page.setCropBox(x, y, w, h);
  }

  const out = await doc.save();
  return pdfBlob(out);
}

// ─────────────────────────────────────────────────────────────────
// 16. PDF A ESCALA DE GRISES
// ─────────────────────────────────────────────────────────────────
export async function grayscalePdf(file: File): Promise<void> {
  await ensurePdfJs();
  const bytes  = await file.arrayBuffer();
  const pdfSrc = await window.pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= pdfSrc.numPages; i++) {
    const page     = await pdfSrc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas   = document.createElement("canvas");
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    const ctx      = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convertir a escala de grises pixel a pixel
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let j = 0; j < d.length; j += 4) {
      const g = Math.round(0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]);
      d[j] = d[j + 1] = d[j + 2] = g;
    }
    ctx.putImageData(imgData, 0, 0);

    const pngBlob  = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), "image/png"));
    const pngBytes = await pngBlob.arrayBuffer();
    const img      = await newDoc.embedPng(pngBytes);
    const w        = viewport.width  / 2;
    const h        = viewport.height / 2;
    const newPage  = newDoc.addPage([w, h]);
    newPage.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }

  const out = await newDoc.save();
  download(pdfBlob(out), `${basename(file)}-grises.pdf`);
}

export async function grayscalePdfToBlob(file: File): Promise<Blob> {
  await ensurePdfJs();
  const bytes  = await file.arrayBuffer();
  const pdfSrc = await window.pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= pdfSrc.numPages; i++) {
    const page     = await pdfSrc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas   = document.createElement("canvas");
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    const ctx      = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let j = 0; j < d.length; j += 4) {
      const g = Math.round(0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]);
      d[j] = d[j + 1] = d[j + 2] = g;
    }
    ctx.putImageData(imgData, 0, 0);

    const pngBlob  = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), "image/png"));
    const pngBytes = await pngBlob.arrayBuffer();
    const img      = await newDoc.embedPng(pngBytes);
    const w        = viewport.width  / 2;
    const h        = viewport.height / 2;
    const newPage  = newDoc.addPage([w, h]);
    newPage.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }

  const out = await newDoc.save();
  return pdfBlob(out);
}

// ─────────────────────────────────────────────────────────────────
// 17. PDF → POWERPOINT
// ─────────────────────────────────────────────────────────────────
export async function pdfToPptx(file: File): Promise<void> {
  await ensurePdfJs();

  if (!window.PptxGenJS) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
      s.onload = () => res();
      s.onerror = () => rej(new Error("PptxGenJS load error"));
      document.head.appendChild(s);
    });
  }

  const bytes  = await file.arrayBuffer();
  const pdfSrc = await window.pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;

  // Determinar relación de aspecto por la primera página
  const firstPage = await pdfSrc.getPage(1);
  const firstVp   = firstPage.getViewport({ scale: 1 });
  const ratio     = firstVp.width / firstVp.height;
  const W         = 10; // pulgadas
  const H         = parseFloat((W / ratio).toFixed(4));

  const pptx = new window.PptxGenJS();
  pptx.defineLayout({ name: "CUSTOM", width: W, height: H });
  pptx.layout = "CUSTOM";

  for (let i = 1; i <= pdfSrc.numPages; i++) {
    const page     = await pdfSrc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas   = document.createElement("canvas");
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    const ctx      = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgData = canvas.toDataURL("image/jpeg", 0.85);
    const slide   = pptx.addSlide();
    slide.addImage({ data: imgData, x: 0, y: 0, w: "100%", h: "100%" });
  }

  await pptx.writeFile({ fileName: `${basename(file)}.pptx` });
}

// ─────────────────────────────────────────────────────────────────
// 18. PDF → EXCEL
// ─────────────────────────────────────────────────────────────────
export async function pdfToExcel(file: File): Promise<void> {
  await ensurePdfJs();

  if (!window.XLSX) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = () => res();
      s.onerror = () => rej(new Error("XLSX load error"));
      document.head.appendChild(s);
    });
  }

  const bytes  = await file.arrayBuffer();
  const pdfSrc = await window.pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const wb     = window.XLSX.utils.book_new();

  for (let i = 1; i <= pdfSrc.numPages; i++) {
    const page    = await pdfSrc.getPage(i);
    const content = await page.getTextContent();

    // Agrupar elementos de texto por línea (posición Y)
    const lineMap: Record<number, Array<{ x: number; str: string }>> = {};
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      if (!lineMap[y]) lineMap[y] = [];
      lineMap[y].push({ x, str: item.str });
    }

    // Ordenar líneas de arriba a abajo, elementos izq a der
    const rows = Object.keys(lineMap)
      .sort((a, b) => Number(b) - Number(a))
      .map(y => lineMap[Number(y)].sort((a, b) => a.x - b.x).map(it => it.str));

    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    window.XLSX.utils.book_append_sheet(wb, ws, `Pag ${i}`);
  }

  window.XLSX.writeFile(wb, `${basename(file)}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────
// 19. FIRMAR PDF
// ─────────────────────────────────────────────────────────────────
export async function signPdf(file: File, signatureDataUrl: string): Promise<void> {
  const bytes   = await file.arrayBuffer();
  const doc     = await PDFDocument.load(bytes, { ignoreEncryption: true });

  // Decodificar PNG base64
  const base64  = signatureDataUrl.split(",")[1];
  const sigBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const sigImage = await doc.embedPng(sigBytes);

  const pages    = doc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();

  // Colocar firma en esquina inferior derecha
  const sigW = Math.min(160, width * 0.28);
  const sigH = (sigW / sigImage.width) * sigImage.height;
  lastPage.drawImage(sigImage, {
    x:      width - sigW - 28,
    y:      28,
    width:  sigW,
    height: sigH,
  });

  const out = await doc.save();
  download(pdfBlob(out), `${basename(file)}-firmado.pdf`);
}
