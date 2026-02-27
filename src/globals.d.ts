// Augment browser globals that TypeScript's built-in lib does not include.
declare global {
  interface Navigator {
    /** IE/old-Edge non-standard property (used as fallback in detectLang) */
    readonly userLanguage?: string
  }
  interface Window {
    /** pdf.js loaded dynamically from CDN */
    pdfjsLib: any // eslint-disable-line @typescript-eslint/no-explicit-any
    /** JSZip loaded dynamically from CDN */
    JSZip: any // eslint-disable-line @typescript-eslint/no-explicit-any
    /** SheetJS loaded dynamically from CDN */
    XLSX: any // eslint-disable-line @typescript-eslint/no-explicit-any
    /** PptxGenJS loaded dynamically from CDN */
    PptxGenJS: any // eslint-disable-line @typescript-eslint/no-explicit-any
    /** Tesseract.js loaded dynamically from CDN */
    Tesseract: any // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

export {}
