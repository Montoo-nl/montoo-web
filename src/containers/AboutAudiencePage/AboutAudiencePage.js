import React, { useState } from 'react';
import css from './AboutAudiencePage.module.css';

const content = {
  company: {
    label: 'VOOR BEDRIJVEN',
    title: 'De juiste vakmensen. Zonder gedoe.',
    description:
      'Vind gekwalificeerde monteurs voor jouw technische opdrachten. Plaats eenvoudig een opdracht, ontvang reacties en kies de vakman die bij jouw bedrijf past.',
    primaryButton: 'Plaats een opdracht',
    secondaryButton: 'Ontdek hoe het werkt',
    benefitsTitle: 'Waarom bedrijven kiezen voor Montoo',
    benefits: [
      {
        icon: '⚡',
        title: 'Snel vakmensen vinden',
        description: 'Bereik gekwalificeerde monteurs voor jouw opdrachten.',
      },
      {
        icon: '✓',
        title: 'Zelf de keuze maken',
        description: 'Vergelijk profielen, certificaten en beoordelingen.',
      },
      {
        icon: '♧',
        title: 'Veilig betalen',
        description: 'De betaling verloopt veilig via Montoo.',
      },
      {
        icon: '☆',
        title: 'Alles overzichtelijk',
        description: 'Beheer opdrachten en reacties op één plek.',
      },
    ],
    stepsTitle: 'Van opdracht tot afgeronde klus in 5 stappen',
    steps: [
      'Plaats je opdracht',
      'Ontvang reacties',
      'Vergelijk vakmensen',
      'Kies en betaal veilig',
      'Opdracht afgerond',
    ],
    ctaTitle: 'Op zoek naar de juiste monteur?',
    ctaDescription:
      'Ontdek hoe eenvoudig je via Montoo geschikte vakmensen vindt.',
  },
  technician: {
    label: 'VOOR MONTEURS',
    title: 'Meer opdrachten. Meer vrijheid. Meer verdienen.',
    description:
      'Ontdek technische opdrachten die bij jouw vakmanschap passen. Maak gratis je profiel aan, reageer op opdrachten en bouw aan je reputatie.',
    primaryButton: 'Maak je profiel aan',
    secondaryButton: 'Bekijk hoe het werkt',
    benefitsTitle: 'Waarom monteurs kiezen voor Montoo',
    benefits: [
      {
        icon: '€',
        title: 'Start gratis',
        description: 'Maak kennis met Montoo zonder direct abonnementskosten.',
      },
      {
        icon: '✓',
        title: 'Jij bepaalt',
        description: 'Kies zelf op welke opdrachten je reageert.',
      },
      {
        icon: '♧',
        title: 'Veilig betaald',
        description: 'Betalingen verlopen veilig via Montoo.',
      },
      {
        icon: '☆',
        title: 'Bouw je reputatie op',
        description: 'Verzamel beoordelingen en vergroot je zichtbaarheid.',
      },
    ],
    stepsTitle: 'Van profiel tot betaling in 5 eenvoudige stappen',
    steps: [
      'Maak je profiel aan',
      'Ontdek opdrachten',
      'Reageer op opdrachten',
      'Word geselecteerd',
      'Voer uit en ontvang betaling',
    ],
    ctaTitle: 'Klaar voor meer opdrachten?',
    ctaDescription:
      'Maak je profiel aan en ontdek welke opdrachten bij jouw vakmanschap passen.',
  },
};

const AboutAudiencePage = () => {
  const [audience, setAudience] = useState('company');
  const activeContent = content[audience];

  return (
    <div className={css.page}>
      <section className={css.hero}>
        <div className={css.heroContent}>
          <span className={css.eyebrow}>{activeContent.label}</span>

          <div className={css.switcher} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={audience === 'company'}
              className={`${css.switchButton} ${
                audience === 'company' ? css.active : ''
              }`}
              onClick={() => setAudience('company')}
            >
              Bedrijf
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={audience === 'technician'}
              className={`${css.switchButton} ${
                audience === 'technician' ? css.active : ''
              }`}
              onClick={() => setAudience('technician')}
            >
              Monteur
            </button>
          </div>

          <h1 className={css.heading}>{activeContent.title}</h1>

          <p className={css.description}>
            {activeContent.description}
          </p>

          <a href="#werkwijze" className={css.primaryButton}>
            {activeContent.primaryButton}
          </a>
          <a href="#werkwijze" className={css.secondaryButton}>
            {activeContent.secondaryButton}
          </a>
        </div>

        <div className={css.heroVisual}>
          <div className={css.visualCircle}></div>
          <div className={css.profileCard}>
            <span className={css.verified}>✓ Geverifieerd via Montoo</span>
            <div className={css.profileIcon}>M</div>
            <h3>Montoo</h3>
            <p>Techniek. Vakmanschap. Verbinding.</p>
            <div className={css.profileTag}>
              ✓ Gecertificeerde vakmensen
            </div>
            <div className={css.profileTag}>
              ✓ Veilig via Montoo
            </div>
          </div>
        </div>
      </section>

      <section className={css.benefits}>
        <span className={css.eyebrow}>ONTDEK DE MOGELIJKHEDEN</span>
        <h2>{activeContent.benefitsTitle}</h2>

        <div className={css.benefitGrid}>
          {activeContent.benefits.map((benefit, index) => (
            <article className={css.benefitCard} key={index}>
              <div className={css.benefitIcon}>{benefit.icon}</div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={css.steps} id="werkwijze">
        <span className={css.eyebrow}>ZO WERKT MONTOO</span>
        <h2>{activeContent.stepsTitle}</h2>

        <div className={css.stepGrid}>
          {activeContent.steps.map((step, index) => (
            <div className={css.step} key={index}>
              <div className={css.stepNumber}>{index + 1}</div>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={css.cta}>
        <div>
          <h2>{activeContent.ctaTitle}</h2>
          <p>{activeContent.ctaDescription}</p>
        </div>
        <a href="#werkwijze" className={css.primaryButton}>
          {activeContent.secondaryButton}
        </a>
      </section>
    </div>
  );
};

export default AboutAudiencePage;
