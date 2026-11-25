import React, { useState } from 'react';
import css from './AboutAudiencePage.module.css';

const audiences = {
  company: {
    label: 'VOOR BEDRIJVEN',
    title: 'Vind snel de juiste monteur voor jouw opdrachten.',
    description:
      'Plaats je opdracht, kies uit beschikbare en gekwalificeerde monteurs en laat het werk efficiënt uitvoeren. Zonder tussenpersonen.',
    image: '/static/montoo-bedrijf-hero.webp',
    imageAlt: 'Monteur die een airconditioning installeert',
    profileTitle: 'Voorbeeldprofiel',
    profileRole: 'Gecertificeerd monteur',
    profileLocation: 'Regio Utrecht',
    profileExperience: '8 jaar ervaring',
    primary: 'Plaats een opdracht',
    secondary: 'Bekijk hoe het werkt',
    trust: [
      'Geverifieerde monteurs',
      'Veilig betalen via Montoo',
      'Reviews en beoordelingen',
      'Persoonlijke support',
    ],
    benefitsTitle: 'Waarom bedrijven kiezen voor Montoo',
    benefits: [
      ['↗', 'Snel vakmensen vinden', 'Bereik gekwalificeerde monteurs voor jouw technische opdrachten.'],
      ['✓', 'Zelf de keuze maken', 'Vergelijk profielen, certificaten en beoordelingen.'],
      ['♧', 'Veilig betalen', 'De betaling verloopt veilig via Montoo.'],
      ['☆', 'Alles overzichtelijk', 'Beheer opdrachten en reacties op één plek.'],
    ],
    stepsTitle: 'Van opdracht tot afgeronde klus in 5 simpele stappen',
    steps: [
      ['▤', 'Plaats je opdracht', 'Beschrijf je opdracht, voeg foto’s toe en stel je wensen en planning aan.'],
      ['☷', 'Ontvang reacties', 'Gekwalificeerde monteurs reageren op jouw opdracht.'],
      ['⌕', 'Vergelijk vakmensen', 'Bekijk profielen, certificaten, reviews en eerdere klussen.'],
      ['♧', 'Kies en betaal veilig', 'Kies jouw vakman en betaal veilig via Montoo.'],
      ['✓', 'Opdracht afgerond', 'De klus is afgerond en de betaling wordt vrijgegeven.'],
    ],
    plansTitle: 'Kies het plan dat bij jouw bedrijf past',
    plansSubtitle: 'Start gratis en upgrade wanneer je bedrijf groeit.',
    plans: [
      {
        name: 'Starter',
        price: '€0',
        period: '/ maand',
        description: 'Perfect voor bedrijven die af en toe een monteur nodig hebben.',
        features: [
          'Geen maandelijkse kosten',
          'Opdrachten plaatsen',
          'Toegang tot geverifieerde monteurs',
          'Profielen, reviews en certificaten bekijken',
          'Veilig betalen via Montoo',
          '10% service fee per afgeronde opdracht',
        ],
        button: 'Gratis starten',
      },
      {
        name: 'Pro',
        price: '€19,95',
        period: '/ maand',
        description: 'Voor bedrijven die regelmatig gekwalificeerde monteurs nodig hebben.',
        features: [
          'Alles in Starter',
          'Verlaagde service fee van 7,5%',
          'Onbeperkt opdrachten plaatsen',
          'Priority support',
          'Snellere toegang tot geschikte monteurs',
          'Extra bedrijfsfuncties',
        ],
        button: 'Kies Pro',
        popular: true,
      },
      {
        name: 'Business',
        price: '€49,95',
        period: '/ maand',
        description: 'Voor bedrijven met een hoog volume aan technische opdrachten.',
        features: [
          'Alles in Pro',
          'Verlaagde service fee van 5%',
          'Onbeperkt opdrachten plaatsen',
          'Priority matching',
          'Meerdere gebruikers binnen één account',
          'Geavanceerde bedrijfsfuncties',
          'Priority customer support',
        ],
        button: 'Kies Business',
      },
    ],
    faqTitle: 'Veelgestelde vragen',
    faqs: [
      ['Wat is de service fee?', 'De service fee wordt alleen in rekening gebracht wanneer een opdracht succesvol is afgerond via Montoo.'],
      ['Zijn er verborgen kosten?', 'Nee. Je werkt met transparante prijzen. Je betaalt alleen de kosten die vooraf duidelijk worden gecommuniceerd.'],
      ['Kan ik mijn abonnement wijzigen?', 'Ja, je kunt op elk moment upgraden of wijzigen naar een ander abonnement.'],
      ['Kan ik mijn abonnement opzeggen?', 'Ja, je kunt je abonnement op elk moment opzeggen.'],
    ],
    ctaTitle: 'Klaar om jouw opdrachten sneller uit te besteden?',
    ctaDescription: 'Vind betrouwbare monteurs en houd grip op je technische opdrachten.',
    ctaButton: 'Plaats een opdracht',
  },

  technician: {
    label: 'VOOR MONTEURS',
    title: 'Meer opdrachten. Meer vrijheid. Meer verdienen.',
    description:
      'Ontdek technische opdrachten die bij jouw vakmanschap passen. Maak gratis je profiel aan, reageer op opdrachten en bouw aan je reputatie.',
    image: '/static/6bff572b-5631-490b-9aee-5f7328838f22.png',
    imageAlt: 'Monteur bij zijn servicebus met gereedschap',
    profileTitle: 'Voorbeeldprofiel',
    profileRole: 'Technisch vakman',
    profileLocation: 'Regio Nederland',
    profileExperience: 'Ervaren monteur',
    primary: 'Maak je gratis profiel aan',
    secondary: 'Bekijk opdrachten',
    trust: [
      '100% gratis starten',
      'Jij kiest je opdrachten',
      'Veilige betalingen via Montoo',
      'Bouw je reputatie op',
    ],
    benefitsTitle: 'Waarom monteurs kiezen voor Montoo',
    benefits: [
      ['€', '100% gratis starten', 'Maak kennis met Montoo zonder direct abonnementskosten.'],
      ['✓', 'Jij bepaalt', 'Kies zelf op welke opdrachten je reageert.'],
      ['♧', 'Veilig betaald', 'Betalingen verlopen veilig via Montoo.'],
      ['☆', 'Bouw je reputatie op', 'Verzamel beoordelingen en vergroot je zichtbaarheid.'],
    ],
    stepsTitle: 'Van profiel tot betaling in 5 eenvoudige stappen',
    steps: [
      ['▤', 'Maak je profiel aan', 'Vul je gegevens in en voeg certificaten en ervaring toe.'],
      ['⌕', 'Ontdek opdrachten', 'Bekijk opdrachten die passen bij jouw vakgebied en regio.'],
      ['☷', 'Reageer op opdrachten', 'Vertel waarom jij de juiste vakman bent.'],
      ['✓', 'Word geselecteerd', 'Ontvang de details en plan samen de opdracht in.'],
      ['€', 'Voer uit en ontvang betaling', 'Voer de opdracht uit en ontvang veilig je betaling via Montoo.'],
    ],
    plansTitle: 'Eenvoudige en eerlijke prijzen',
    plansSubtitle: 'De eerste 3 maanden gratis. Kies daarna het plan dat bij jou past.',
    plans: [
      {
        name: 'Starter',
        price: '€0',
        period: '/ 3 maanden',
        description: 'Ontdek Montoo zonder kosten en begin met het vinden van opdrachten.',
        features: [
          'Eerste 3 maanden gratis',
          'Onbeperkt opdrachten bekijken',
          'Reageren op opdrachten',
          'Basisprofiel aanmaken',
          'Certificaten en ervaring tonen',
          'Veilige betalingen via Montoo',
        ],
        button: 'Gratis starten',
        note: 'Geen betaalgegevens nodig',
      },
      {
        name: 'Pro',
        price: '€14,95',
        period: '/ maand',
        description: 'Voor monteurs die meer opdrachten willen en hun bedrijf willen laten groeien.',
        features: [
          'Alles in Starter',
          'Prioriteit bij bedrijven',
          'Meer zichtbaarheid in zoekresultaten',
          'Statistieken en inzichten',
          'Portfolio met foto’s van je werk',
          'Persoonlijke support',
        ],
        button: 'Kies Pro',
        popular: true,
        note: 'Na de gratis periode',
      },
      {
        name: 'Premium',
        price: '€24,95',
        period: '/ maand',
        description: 'Voor ervaren monteurs en specialisten die het maximale uit Montoo willen halen.',
        features: [
          'Alles in Pro',
          'Toppositie in zoekresultaten',
          'Exclusieve opdrachten',
          'Uitgebreide statistieken',
          'Persoonlijke accountmanager',
          'Voorrang bij support',
        ],
        button: 'Kies Premium',
      },
    ],
    faqTitle: 'Veelgestelde vragen',
    faqs: [
      ['Hoe werkt de gratis periode?', 'Je krijgt de eerste 3 maanden toegang tot de mogelijkheden van Montoo. Daarna kies je zelf een passend abonnement.'],
      ['Zijn er verborgen kosten?', 'Nee. Montoo werkt met transparante prijzen.'],
      ['Kan ik mijn abonnement op elk moment opzeggen?', 'Ja, je kunt je abonnement op elk moment opzeggen.'],
      ['Hoe ontvang ik mijn betalingen?', 'Betalingen worden via Montoo verwerkt na afronding van de opdracht.'],
    ],
    ctaTitle: 'Klaar voor meer opdrachten?',
    ctaDescription: 'Maak je profiel aan en ontdek welke opdrachten bij jouw vakmanschap passen.',
    ctaButton: 'Maak je gratis profiel aan',
  },
};

const AboutAudiencePage = () => {
  const [audience, setAudience] = useState('company');
  const data = audiences[audience];

  return (
    <div className={css.page}>
      <section className={css.hero}>
        <div className={css.heroContent}>
          <span className={css.eyebrow}>{data.label}</span>

          <div className={css.switcher} role="tablist" aria-label="Kies doelgroep">
            <button
              type="button"
              role="tab"
              aria-selected={audience === 'company'}
              className={`${css.switchButton} ${audience === 'company' ? css.active : ''}`}
              onClick={() => setAudience('company')}
            >
              <span>▦</span> Bedrijf
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={audience === 'technician'}
              className={`${css.switchButton} ${audience === 'technician' ? css.active : ''}`}
              onClick={() => setAudience('technician')}
            >
              <span>♙</span> Monteur
            </button>
          </div>

          <h1 className={css.heading}>{data.title}</h1>
          <p className={css.description}>{data.description}</p>

          <div className={css.heroActions}>
            <a href="#prijzen" className={css.primaryButton}>{data.primary} <span>→</span></a>
            <a href="#werkwijze" className={css.secondaryButton}>▷ {data.secondary}</a>
          </div>

          <div className={css.trustRow}>
            {data.trust.map((item, index) => (
              <div className={css.trustItem} key={item}>
                <span className={css.trustIcon}>{['♧', '✓', '☆', '◷'][index]}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={css.heroVisual}>
          <img className={css.heroImage} src={data.image} alt={data.imageAlt} />
          <div className={css.profileCard}>
            <span className={css.profileBadge}>✓ Geverifieerd via Montoo</span>
            <div className={css.profileHeader}>
              <div className={css.avatar}>M</div>
              <div>
                <strong>{data.profileTitle}</strong>
                <span>{data.profileRole}</span>
                <span className={css.rating}>★★★★★ <small>(voorbeeld)</small></span>
              </div>
            </div>
            <div className={css.profileLine}>⌖ {data.profileLocation}</div>
            <div className={css.profileLine}>◷ {data.profileExperience}</div>
            <div className={css.profileLine}>✓ Gecertificeerd profiel</div>
            <div className={css.available}>Beschikbaar</div>
          </div>
        </div>
      </section>

      <section className={css.benefits}>
        <span className={css.sectionEyebrow}>ONTDEK DE MOGELIJKHEDEN</span>
        <h2>{data.benefitsTitle}</h2>
        <div className={css.benefitGrid}>
          {data.benefits.map(([icon, title, description]) => (
            <article className={css.benefitCard} key={title}>
              <div className={css.benefitIcon}>{icon}</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={css.steps} id="werkwijze">
        <span className={css.sectionEyebrow}>ZO WERKT MONTOO</span>
        <h2>{data.stepsTitle}</h2>
        <div className={css.stepGrid}>
          {data.steps.map(([icon, title, description], index) => (
            <article className={css.step} key={title}>
              <div className={css.stepIcon}>{icon}</div>
              <span className={css.stepNumber}>{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={css.pricing} id="prijzen">
        <span className={css.sectionEyebrow}>SIMPLE, TRANSPARANT PRICING</span>
        <h2>{data.plansTitle}</h2>
        <p className={css.pricingSubtitle}>{data.plansSubtitle}</p>

        <div className={css.planGrid}>
          {data.plans.map(plan => (
            <article
              className={`${css.planCard} ${plan.popular ? css.popularPlan : ''}`}
              key={plan.name}
            >
              {plan.popular && <span className={css.popularBadge}>Meest gekozen</span>}
              <h3>{plan.name}</h3>
              <p className={css.planDescription}>{plan.description}</p>
              <div className={css.price}>
                <strong>{plan.price}</strong>
                <span>{plan.period}</span>
              </div>
              <ul>
                {plan.features.map(feature => (
                  <li key={feature}><span>✓</span>{feature}</li>
                ))}
              </ul>
              <a href="#aanmelden" className={plan.popular ? css.planPrimary : css.planSecondary}>
                {plan.button}
              </a>
              {plan.note && <small className={css.planNote}>{plan.note}</small>}
            </article>
          ))}
        </div>
      </section>

      <section className={css.faq}>
        <span className={css.sectionEyebrow}>HEB JE VRAGEN?</span>
        <h2>{data.faqTitle}</h2>
        <div className={css.faqGrid}>
          {data.faqs.map(([question, answer]) => (
            <details className={css.faqItem} key={question}>
              <summary>{question}<span>⌄</span></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={css.cta} id="aanmelden">
        <div className={css.ctaLogo}>M</div>
        <div className={css.ctaText}>
          <h2>{data.ctaTitle}</h2>
          <p>{data.ctaDescription}</p>
        </div>
        <a href="#prijzen" className={css.ctaButton}>{data.ctaButton} →</a>
      </section>
    </div>
  );
};

export default AboutAudiencePage;
