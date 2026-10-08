import { useEffect, useState } from 'react';
import { formatPrice, localize, type Comparison, type Language } from '../shared/comparison';
const copy = {
  en: { eyebrow: 'A clearer choice', subtitle: 'Two options. One decision. Choose what works for you.', features: 'What’s included', choose: 'Choose', selected: 'Selected', preference: 'Your preference', saved: 'Shared with your assistant.', local: 'Selected for this preview.', failed: 'Selected here. Your assistant could not be updated.', reset: 'Clear selection' },
  es: { eyebrow: 'Una elección más clara', subtitle: 'Dos opciones. Una decisión. Elige lo que más te convenga.', features: 'Qué incluye', choose: 'Elegir', selected: 'Elegido', preference: 'Tu preferencia', saved: 'Compartido con tu asistente.', local: 'Seleccionado en esta vista previa.', failed: 'Seleccionado aquí. No se pudo actualizar tu asistente.', reset: 'Borrar selección' },
};
export function SmartCompare({ data, onSelect }: { data: Comparison; onSelect?: (id: string | null, language: Language) => Promise<void> }) {
  const [language, setLanguage] = useState<Language>(data.language);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'local' | 'saved' | 'failed' | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const t = copy[language];
  async function select(id: string | null) {
    setSelected(id); setStatus(null);
    if (!onSelect) { setStatus('local'); return; }
    setBusy(true);
    try { await onSelect(id, language); setStatus('saved'); }
    catch { setStatus('failed'); }
    finally { setBusy(false); }
  }
  const choice = data.options.find(option => option.id === selected);
  return <main className="comparison">
    <header>
      <div className="topline"><span className="brand"><span aria-hidden="true">◈</span> SmartCompare</span>
        <div className="languages" role="group" aria-label="Language / Idioma">{(['en', 'es'] as const).map(lang => <button key={lang} aria-pressed={language === lang} onClick={() => setLanguage(lang)}>{lang === 'en' ? 'EN' : 'ES'}</button>)}</div>
      </div>
      <p className="eyebrow">{t.eyebrow}</p><h1>{localize(data.title, language)}</h1><p className="subtitle">{t.subtitle}</p>
    </header>
    <div className="options">{data.options.map((option, index) => <article className={`option ${selected === option.id ? 'active' : ''}`} key={option.id}>
      <div className="option-label">{String(index + 1).padStart(2, '0')} <span aria-hidden="true">{selected === option.id ? '✓' : '↗'}</span></div>
      <h2>{localize(option.name, language)}</h2><p className="description">{localize(option.description, language)}</p>
      <p className="price">{formatPrice(option.price, language)}{option.price.period && <span> / {localize(option.price.period, language)}</span>}</p>
      <div className="feature-section"><h3>{t.features}</h3><ul>{option.features.map((feature, i) => <li key={i}><span aria-hidden="true">✓</span>{localize(feature, language)}</li>)}</ul></div>
      <button className="choose" disabled={busy} aria-pressed={selected === option.id} onClick={() => void select(option.id)}>{selected === option.id ? `${t.selected} ✓` : `${t.choose} ${localize(option.name, language)}`}</button>
    </article>)}</div>
    <footer aria-live="polite">{choice ? <><div><span className="selection-label">{t.preference}</span><strong>{localize(choice.name, language)}</strong>{status && <span className="status">{t[status]}</span>}</div><button className="reset" disabled={busy} onClick={() => void select(null)}>{t.reset}</button></> : <span>{t.subtitle}</span>}</footer>
  </main>;
}
