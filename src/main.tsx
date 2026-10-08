import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import { comparisonSchema, localize, sampleComparison, type Comparison, type Language } from '../shared/comparison';
import { planComparisonSchema, samplePlanComparison, type PlanComparison as PlanComparisonData } from '../shared/plan-comparison';
import { SmartCompare } from './SmartCompare';
import { PlanComparison } from './PlanComparison';
import './style.css';
const preview = window.parent === window;
function Root() {
  const previewData = new URLSearchParams(window.location.search).get('component') === 'smartcompare' ? sampleComparison : samplePlanComparison;
  const [data, setData] = useState<Comparison | PlanComparisonData | null>(preview ? previewData : null);
  const [error, setError] = useState<string | null>(null);
  const [bridge, setBridge] = useState<App | null>(null);
  useEffect(() => {
    if (preview) return;
    const app = new App({ name: 'MCP Components', version: '0.2.0' }, {}, { autoResize: true });
    app.ontoolresult = result => {
      const planParsed = planComparisonSchema.safeParse(result.structuredContent);
      const comparisonParsed = comparisonSchema.safeParse(result.structuredContent);
      if (planParsed.success) { setData(planParsed.data); setError(null); }
      else if (comparisonParsed.success) { setData(comparisonParsed.data); setError(null); }
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
    if (!bridge || !data || 'component' in data) throw new Error('Bridge unavailable');
    const option = data.options.find(item => item.id === id);
    await bridge.updateModelContext({
      content: [{ type: 'text', text: option ? `User preference: ${localize(option.name, language)} (id: ${option.id}).` : 'User cleared their comparison preference.' }],
      structuredContent: { selectedOptionId: id, comparison: data, language },
    });
  }
  if (error) return <p className="message" role="alert">{error}</p>;
  if (!data) return <p className="message" role="status">Waiting for your comparison… / Esperando tu comparación…</p>;
  return 'component' in data
    ? <PlanComparison key={JSON.stringify(data)} data={data} />
    : <SmartCompare key={JSON.stringify(data)} data={data} onSelect={preview ? undefined : reportSelection} />;
}
createRoot(document.getElementById('root')!).render(<Root />);
