import { z } from 'zod';
import { localizedTextSchema, localize, type Language } from './comparison.js';

const planSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: localizedTextSchema,
  description: localizedTextSchema,
  price: z.union([
    z.object({
      amount: z.number().finite().nonnegative().max(1e12),
      currency: z.string().regex(/^[A-Z]{3}$/),
      suffix: localizedTextSchema.optional(),
    }),
    z.object({ label: localizedTextSchema }),
  ]),
  billingNote: localizedTextSchema,
  badge: localizedTextSchema.optional(),
});

const featureValueSchema = z.union([z.boolean(), localizedTextSchema]);

export const planComparisonSchema = z.object({
  component: z.literal('plan-comparison'),
  title: localizedTextSchema,
  subtitle: localizedTextSchema,
  featureHeading: localizedTextSchema,
  featureHint: localizedTextSchema,
  language: z.enum(['en', 'es']).default('en'),
  recommendedPlanId: z.string().trim().min(1).max(80).optional(),
  plans: z.tuple([planSchema, planSchema, planSchema]),
  groups: z.array(z.object({
    title: localizedTextSchema,
    features: z.array(z.object({
      label: localizedTextSchema,
      values: z.tuple([featureValueSchema, featureValueSchema, featureValueSchema]),
    })).min(1).max(12),
  })).min(1).max(8),
  note: localizedTextSchema.optional(),
}).superRefine((data, ctx) => {
  const ids = data.plans.map(plan => plan.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', message: 'Plan IDs must be distinct', path: ['plans'] });
  }
  if (data.recommendedPlanId && !ids.includes(data.recommendedPlanId)) {
    ctx.addIssue({ code: 'custom', message: 'Recommended plan must match a plan ID', path: ['recommendedPlanId'] });
  }
});

export type PlanComparison = z.infer<typeof planComparisonSchema>;
export type PlanFeatureValue = PlanComparison['groups'][number]['features'][number]['values'][number];

function formatPlanPrice(plan: PlanComparison['plans'][number], language: Language) {
  if ('label' in plan.price) return localize(plan.price.label, language);
  return new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US', {
    style: 'currency',
    currency: plan.price.currency,
    maximumFractionDigits: 2,
  }).format(plan.price.amount);
}

function fallbackValue(value: PlanFeatureValue, language: Language) {
  if (value === true) return language === 'es' ? 'Incluido' : 'Included';
  if (value === false) return language === 'es' ? 'No incluido' : 'Not included';
  return localize(value, language);
}

export function planComparisonTextFallback(data: PlanComparison) {
  const language = data.language;
  const planLines = data.plans.map(plan => {
    const suffix = 'suffix' in plan.price && plan.price.suffix ? ` ${localize(plan.price.suffix, language)}` : '';
    return `${localize(plan.name, language)} (${plan.id}): ${formatPlanPrice(plan, language)}${suffix}\n${localize(plan.description, language)}\n${localize(plan.billingNote, language)}`;
  });
  const featureLines = data.groups.flatMap(group => [
    localize(group.title, language),
    ...group.features.map(feature => `${localize(feature.label, language)}: ${feature.values.map((value, index) => `${localize(data.plans[index].name, language)} — ${fallbackValue(value, language)}`).join('; ')}`),
  ]);
  return [localize(data.title, language), localize(data.subtitle, language), ...planLines, ...featureLines].join('\n\n');
}

export const samplePlanComparison: PlanComparison = {
  component: 'plan-comparison',
  title: { en: 'Compare plans', es: 'Compara planes' },
  subtitle: { en: 'A clear view of what’s included in each plan.', es: 'Una vista clara de lo que incluye cada plan.' },
  featureHeading: { en: 'Features', es: 'Funciones' },
  featureHint: { en: 'Find the right fit for your team', es: 'Encuentra la opción ideal para tu equipo' },
  language: 'en',
  recommendedPlanId: 'pro',
  plans: [
    { id: 'basic', name: 'Basic', description: { en: 'For individuals getting started', es: 'Para personas que están comenzando' }, price: { amount: 12, currency: 'USD', suffix: { en: '/ user / mo', es: '/ usuario / mes' } }, billingNote: { en: 'Billed monthly', es: 'Facturado mensualmente' } },
    { id: 'pro', name: 'Pro', description: { en: 'For growing teams', es: 'Para equipos en crecimiento' }, price: { amount: 29, currency: 'USD', suffix: { en: '/ user / mo', es: '/ usuario / mes' } }, billingNote: { en: 'Billed monthly', es: 'Facturado mensualmente' }, badge: { en: 'POPULAR', es: 'POPULAR' } },
    { id: 'enterprise', name: 'Enterprise', description: { en: 'For organizations at scale', es: 'Para organizaciones a gran escala' }, price: { label: { en: 'Custom', es: 'Personalizado' } }, billingNote: { en: 'Tailored to your organization', es: 'Adaptado a tu organización' } },
  ],
  groups: [
    {
      title: { en: 'Workspace & collaboration', es: 'Espacio de trabajo y colaboración' },
      features: [
        { label: { en: 'Team members', es: 'Miembros del equipo' }, values: [{ en: '1 member', es: '1 miembro' }, { en: 'Up to 20', es: 'Hasta 20' }, { en: 'Unlimited', es: 'Ilimitados' }] },
        { label: { en: 'Projects', es: 'Proyectos' }, values: [{ en: '3 projects', es: '3 proyectos' }, { en: 'Unlimited', es: 'Ilimitados' }, { en: 'Unlimited', es: 'Ilimitados' }] },
        { label: { en: 'Storage', es: 'Almacenamiento' }, values: ['5 GB', '100 GB', '1 TB'] },
        { label: { en: 'Shared workspaces', es: 'Espacios compartidos' }, values: [false, true, true] },
        { label: { en: 'Version history', es: 'Historial de versiones' }, values: [{ en: '7 days', es: '7 días' }, { en: '90 days', es: '90 días' }, { en: 'Unlimited', es: 'Ilimitado' }] },
      ],
    },
    {
      title: { en: 'Control & support', es: 'Control y soporte' },
      features: [
        { label: { en: 'Advanced analytics', es: 'Análisis avanzados' }, values: [false, true, true] },
        { label: { en: 'Custom roles & permissions', es: 'Roles y permisos personalizados' }, values: [false, false, true] },
        { label: { en: 'Single sign-on (SSO)', es: 'Inicio de sesión único (SSO)' }, values: [false, false, true] },
        { label: { en: 'Customer support', es: 'Atención al cliente' }, values: [{ en: 'Email', es: 'Correo electrónico' }, { en: 'Priority email', es: 'Correo prioritario' }, { en: 'Dedicated manager', es: 'Gerente dedicado' }] },
      ],
    },
  ],
  note: { en: 'Sample pricing and features for comparison purposes only.', es: 'Precios y funciones de muestra solo con fines comparativos.' },
};
