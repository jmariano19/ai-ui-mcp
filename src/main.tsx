import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import { comparisonSchema, localize, sampleComparison, type Comparison, type Language } from '../shared/comparison';
import { SmartCompare } from './SmartCompare';
import './style.css';
const preview = window.parent === window;
function Root() {
  const [data, setData] = useState<Comparison | null>(preview ? sampleComparison : null);
  const [error, setError] = useState<string | null>(null);
  const [bridge, setBridge] = useState<App | null>(null);
  useEffect(() => {
    if (preview) return;
    const app = new App({ name: 'SmartCompare', version: '0.1.0' }, {}, { autoResize: true });
    app.ontoolresult = result => {
      const parsed = comparisonSchema.safeParse(result.structuredContent);
      if (parsed.success) { setData(parsed.data); setError(null); }
      else { setData(null); setError('The comparison data is invalid. / Los datos de comparación no son válidos.'); }
    };
    app.ontoolcancelled = () => setError('Comparison cancelled. / Comparación cancelada.');
    let mounted = true;
    void app.connect().then(() => { if (mounted) setBridge(app); }).catch(() => {
      if (mounted) setError('Unable to connect to your assistant. / No se pudo conectar con tu asistente.');
    });
    return () => { mounted = false; void app.close(); };
  }, []);
  async function reportSelection(id: string | null, language: Language) {
    if (!bridge || !data) throw new Error('Bridge unavailable');
    const option = data.options.find(item => item.id === id);
    await bridge.updateModelContext({
      content: [{ type: 'text', text: option ? `User preference: ${localize(option.name, language)} (id: ${option.id}).` : 'User cleared their comparison preference.' }],
      structuredContent: { selectedOptionId: id, comparison: data, language },
    });
  }
  return error ? <p className="message" role="alert">{error}</p> : data ? <SmartCompare key={JSON.stringify(data)} data={data} onSelect={preview ? undefined : reportSelection} /> : <p className="message" role="status">Waiting for your comparison… / Esperando tu comparación…</p>;
}
createRoot(document.getElementById('root')!).render(<Root />);
