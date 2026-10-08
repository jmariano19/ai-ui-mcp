import { z } from 'zod';
const text = z.string().trim().min(1).max(1000);
// Bilingual values are optional: plain strings work for assistant-provided data.
export const localizedTextSchema = z.union([text, z.object({ en: text, es: text })]);
const optionSchema = z.object({
  id: z.string().trim().min(1).max(80), name: localizedTextSchema,
  description: localizedTextSchema,
  price: z.object({ amount: z.number().finite().nonnegative().max(1e12), currency: z.string().regex(/^[A-Z]{3}$/), period: localizedTextSchema.optional() }),
  features: z.array(localizedTextSchema).min(1).max(20),
});
export const comparisonSchema = z.object({
  title: localizedTextSchema,
  language: z.enum(['en', 'es']).default('en'),
  options: z.tuple([optionSchema, optionSchema]),
}).refine(data => data.options[0].id !== data.options[1].id, { message: 'Option IDs must be distinct', path: ['options'] });
export type Comparison = z.infer<typeof comparisonSchema>;
export type Language = Comparison['language'];
export function localize(value: z.infer<typeof localizedTextSchema>, language: Language) {
  return typeof value === 'string' ? value : value[language];
}
export function formatPrice(price: Comparison['options'][number]['price'], language: Language) {
  return new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US', { style: 'currency', currency: price.currency, maximumFractionDigits: 2 }).format(price.amount);
}
export function textFallback(data: Comparison) {
  const language = data.language;
  return [localize(data.title, language), ...data.options.map(option =>
    `${localize(option.name, language)} (${option.id}): ${formatPrice(option.price, language)}${option.price.period ? ` / ${localize(option.price.period, language)}` : ''}\n${localize(option.description, language)}\n${option.features.map(feature => `- ${localize(feature, language)}`).join('\n')}`
  )].join('\n\n');
}
export const sampleComparison: Comparison = {
  title: { en: 'Find your perfect workspace', es: 'Encuentra tu espacio de trabajo ideal' }, language: 'en',
  options: [
    { id: 'essential', name: 'Essential', description: { en: 'A focused space for your everyday ideas.', es: 'Un espacio para tus ideas de cada día.' }, price: { amount: 12, currency: 'USD', period: { en: 'month', es: 'mes' } }, features: [{ en: 'Unlimited personal projects', es: 'Proyectos personales ilimitados' }, { en: '5 GB of storage', es: '5 GB de almacenamiento' }, { en: 'Community support', es: 'Soporte de la comunidad' }] },
    { id: 'studio', name: 'Studio', description: { en: 'More room to create, collaborate, and grow.', es: 'Más espacio para crear, colaborar y crecer.' }, price: { amount: 24, currency: 'USD', period: { en: 'month', es: 'mes' } }, features: [{ en: 'Everything in Essential', es: 'Todo lo incluido en Essential' }, { en: '100 GB of storage', es: '100 GB de almacenamiento' }, { en: 'Team collaboration', es: 'Colaboración en equipo' }, { en: 'Priority support', es: 'Soporte prioritario' }] },
  ],
};
