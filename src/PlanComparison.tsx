import includedIcon from './assets/included.svg';
import { localize, type Language } from '../shared/comparison';
import type { PlanComparison as PlanComparisonData, PlanFeatureValue } from '../shared/plan-comparison';

const legendCopy = {
  en: { included: 'Included', notIncluded: 'Not included' },
  es: { included: 'Incluido', notIncluded: 'No incluido' },
};

function PlanPrice({ plan, language }: { plan: PlanComparisonData['plans'][number]; language: Language }) {
  if ('label' in plan.price) return <p className="plan-table-price plan-table-price-label">{localize(plan.price.label, language)}</p>;
  const amount = new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US', {
    style: 'currency', currency: plan.price.currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(plan.price.amount);
  return <p className="plan-table-price"><strong>{amount}</strong>{plan.price.suffix && <span> {localize(plan.price.suffix, language)}</span>}</p>;
}

function FeatureValue({ value, language }: { value: PlanFeatureValue; language: Language }) {
  if (value === true) return <img className="plan-table-check" src={includedIcon} alt={legendCopy[language].included} />;
  if (value === false) return <span className="plan-table-empty" aria-label={legendCopy[language].notIncluded}>—</span>;
  return <span>{localize(value, language)}</span>;
}

export function PlanComparison({ data }: { data: PlanComparisonData }) {
  const language = data.language;
  const copy = legendCopy[language];

  return <main className="plan-table-shell">
    <section className="plan-table" aria-labelledby="plan-table-title">
      <header className="plan-table-titlebar">
        <div>
          <h1 id="plan-table-title">{localize(data.title, language)}</h1>
          <p>{localize(data.subtitle, language)}</p>
        </div>
      </header>
      <div className="plan-table-scroll" tabIndex={0} aria-label={localize(data.title, language)}>
        <div className="plan-table-grid">
          <div className="plan-table-feature-heading">
            <strong>{localize(data.featureHeading, language)}</strong>
            <span>{localize(data.featureHint, language)}</span>
          </div>
          {data.plans.map(plan => {
            const recommended = data.recommendedPlanId === plan.id;
            return <article className={`plan-table-plan ${recommended ? 'is-recommended' : ''}`} key={plan.id}>
              <div className="plan-table-plan-name">
                <h2>{localize(plan.name, language)}</h2>
                {plan.badge && <span>{localize(plan.badge, language)}</span>}
              </div>
              <p className="plan-table-description">{localize(plan.description, language)}</p>
              <PlanPrice plan={plan} language={language} />
              <p className="plan-table-billing">{localize(plan.billingNote, language)}</p>
            </article>;
          })}
          {data.groups.map((group, groupIndex) => <div className="plan-table-group" key={groupIndex}>
            <h3>{localize(group.title, language)}</h3>
            {group.features.map((feature, featureIndex) => <div className="plan-table-row" key={featureIndex}>
              <div className="plan-table-label">{localize(feature.label, language)}</div>
              {feature.values.map((value, planIndex) => <div className={`plan-table-value ${data.recommendedPlanId === data.plans[planIndex].id ? 'is-recommended' : ''}`} key={planIndex}>
                <FeatureValue value={value} language={language} />
              </div>)}
            </div>)}
          </div>)}
          <footer className="plan-table-notes">
            <p>{data.note ? localize(data.note, language) : ''}</p>
            <div className="plan-table-legend">
              <span><img src={includedIcon} alt="" /> {copy.included}</span>
              <span>—&nbsp; {copy.notIncluded}</span>
            </div>
          </footer>
        </div>
      </div>
    </section>
  </main>;
}
