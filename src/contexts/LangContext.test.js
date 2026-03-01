import { describe, it, expect, vi, afterEach } from 'vitest'
import { detectLang, LANGS } from './LangContext'

afterEach(() => vi.unstubAllGlobals())

// ─────────────────────────────────────────────────────────────────
// detectLang
// ─────────────────────────────────────────────────────────────────
describe('detectLang', () => {
  const setLang = (lang) => {
    Object.defineProperty(navigator, 'language', { value: lang, configurable: true })
  }

  it('returns "es" for "es-ES"', () => {
    setLang('es-ES')
    expect(detectLang()).toBe('es')
  })

  it('returns "en" for "en-US"', () => {
    setLang('en-US')
    expect(detectLang()).toBe('en')
  })

  it('returns "fr" for "fr-FR"', () => {
    setLang('fr-FR')
    expect(detectLang()).toBe('fr')
  })

  it('returns "de" for "de-DE"', () => {
    setLang('de-DE')
    expect(detectLang()).toBe('de')
  })

  it('returns "pt" for "pt-PT"', () => {
    setLang('pt-PT')
    expect(detectLang()).toBe('pt')
  })

  it('falls back to "en" for an unsupported language', () => {
    setLang('zh-TW')
    expect(detectLang()).toBe('en')
  })

  it('falls back to "en" for "ja"', () => {
    setLang('ja')
    expect(detectLang()).toBe('en')
  })

  it('uses navigator.userLanguage when navigator.language is undefined', () => {
    // Simulate IE-style userLanguage
    Object.defineProperty(navigator, 'language', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'userLanguage', { value: 'es-ES', configurable: true })
    expect(detectLang()).toBe('es')
  })

  it('falls back to "en" when both navigator.language and userLanguage are undefined', () => {
    Object.defineProperty(navigator, 'language', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'userLanguage', { value: undefined, configurable: true })
    expect(detectLang()).toBe('en')
  })
})

// ─────────────────────────────────────────────────────────────────
// LANGS — i18n completeness
// ─────────────────────────────────────────────────────────────────
describe('LANGS structure', () => {
  const REQUIRED_KEYS = [
    'tagline', 'hero_h1a', 'hero_h1b', 'hero_sub', 'hero_cta',
    'convert', 'cancel', 'processing',
    'err_title', 'err_retry', 'err_generic',
    'plan_free', 'plan_pro', 'pricing_title',
    'faq_title', 'hist_title', 'hist_empty',
    'nav_privacy', 'footer_copy',
  ]

  Object.keys(LANGS).forEach((code) => {
    it(`locale "${code}" has all required keys`, () => {
      const locale = LANGS[code]
      REQUIRED_KEYS.forEach((key) => {
        expect(locale[key], `Missing key "${key}" in locale "${code}"`).toBeTruthy()
      })
    })
  })
})
