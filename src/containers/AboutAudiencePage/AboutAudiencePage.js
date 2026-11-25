import React, { useState } from 'react';
import css from './AboutAudiencePage.module.css';

const Icon = ({ name, size = 25 }) => {
  const shapes = {
    shield: <><path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" /><path d="m8 12 2.5 2.5L16 9" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    star: <path d="m12 2 3 7h7l-5.5 4.5 2 7.5-6.5-4.5L5.5 21l2-7.5L2 9h7l3-7Z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
    search: <><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    check: <path d="m4 12 5 5L20 6" />,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M3 9V6a2 2 0 0 1 2-2h13M16 14h5M17 14h.01" /></>,
    euro: <><path d="M19 5a8 8 0 1 0 0 14M4 10h11M4 14h10" /></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h2M14 7h2M9 11h2M14 11h2M9 15h2M14 15h2M10 21v-3h4v3" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" /></>,
    starBadge: <><circle cx="12" cy="12" r="9" /><path d="m12 6 2 4h4l-3 3 1 4-4-2.5L8 17l1-4-3-3h4l2-4Z" /></>,
    certificate: <><path d="M5 3h14v14H5zM8 7h8M8 11h5" /><path d="m9 17-1 5 4-2 4 2-1-5" /></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name] || shapes.check}
    </svg>
  );
};

const company = {
  label: 'Bedrijf',
  eyebrow: 'HET PLATFORM VOOR TECHNISCHE OPDRACHTEN',
  title: 'Het platform voor technische opdrachten dat voor jou werkt.',
  description:
    'Montoo brengt bedrijven en vakmensen samen op één betrouwbaar platform. Plaats een opdracht of vind opdrachten die perfect bij jouw expertise passen.',
  image: '/static/montoo-bedrijf-hero.webp',
  imageAlt: 'Monteur installeert een airconditioning',
  primary: 'Plaats een opdracht',
  secondary: 'Bekijk hoe het werkt',
  trust: [
    { icon: 'shield', text: 'Geverifieerde bedrijven & monteurs' },
    { icon: 'lock', text: 'Veilige betalingen via Montoo' },
    { icon: 'star', text: 'Reviews & beoordelingen' },
    { icon: 'clock', text: '24/7 support' },
  ],
  stepsTitle: 'Van opdracht tot afgeronde klus in 5 simpele stappen',
  stepsIntro: 'ZO WERKT MONTOO VOOR BEDRIJVEN',
  steps: [
    ['document', 'Plaats je opdracht', 'Beschrijf je opdracht, voeg foto’s toe en geef je wensen en planning aan.'],
    ['users', 'Ontvang reacties', 'Gekwalificeerde monteurs reageren op jouw opdracht. Je ontvangt een melding.'],
    ['search', 'Vergelijk vakmensen', 'Bekijk profielen, certificaten, reviews en eerdere klussen. Vergelijk en kies de beste match.'],
    ['shield', 'Kies & betaal veilig', 'Kies jouw vakman en betaal veilig via Montoo. De betaling staat in beheer.'],
    ['check', 'Opdracht afgerond', 'De klus is afgerond en jij keurt goed. Daarna wordt de betaling vrijgegeven.'],
  ],
  dashboardEyebrow: 'PLAATS JE OPDRACHT IN ENKELE MINUTEN',
  dashboardTitle: 'Een opdracht plaatsen was nog nooit zo makkelijk',
  dashboardDescription: 'Maak eenvoudig een opdracht aan en ontvang reacties van beschikbare, gekwalificeerde monteurs.',
  dashboardBenefits: [
    'Beschrijf de werkzaamheden',
    'Voeg foto’s en documenten toe',
    'Geef locatie en planning aan',
    'Stel je voorwaarden in',
    'Ontvang reacties van geschikte monteurs',
  ],
  profileEyebrow: 'VIND DE JUISTE VAKMAN',
  profileTitle: 'Alle info die je nodig hebt, op één profiel',
  profileDescription: 'Bekijk certificaten, ervaring, reviews en eerder werk. Zo kies je altijd een vakman die bij jouw opdracht past.',
  profileBenefits: [
    'Geverifieerde identiteit & bedrijf',
    'Certificaten altijd actueel',
    'Echte reviews van andere bedrijven',
    'Portfolio met afgeronde klussen',
    'Reactietijd & beschikbaarheid',
  ],
  paymentEyebrow: 'VEILIG BETALEN VIA MONTOO',
  paymentTitle: 'Jouw betaling is in goede handen',
  paymentDescription: 'Montoo zorgt voor een veilige en transparante afhandeling. Pas wanneer jij tevreden bent, ontvangt de vakman zijn betaling.',
  paymentSteps: [
    ['document', 'Opdracht geplaatst'],
    ['users', 'Monteur accepteert'],
    ['wallet', 'Betaling in beheer'],
    ['check', 'Opdracht afgerond'],
    ['euro', 'Uitbetaling'],
  ],
  ctaTitle: 'Klaar om de juiste vakman te vinden?',
  ctaDescription: 'Sluit je aan bij bedrijven die al slimmer werken met Montoo.',
  ctaButton: 'Plaats een opdracht',
};

const technician = {
  label: 'Monteur',
  eyebrow: 'HET PLATFORM VOOR TECHNISCHE VAKMENSEN',
  title: 'Vind opdrachten die perfect bij jouw vakmanschap passen.',
  description:
    'Maak deel uit van het Montoo-netwerk. Ontdek technische opdrachten, reageer op werk dat bij je past en bouw aan je professionele reputatie.',
  image: '/static/6bff572b-5631-490b-9aee-5f7328838f22.png',
  imageAlt: 'Monteur bij zijn servicebus met gereedschap',
  primary: 'Word monteur',
  secondary: 'Ontdek opdrachten',
  trust: [
    { icon: 'shield', text: 'Geverifieerde opdrachtgevers' },
    { icon: 'lock', text: 'Veilige betalingen via Montoo' },
    { icon: 'star', text: 'Reviews & beoordelingen' },
    { icon: 'clock', text: 'Werk op jouw voorwaarden' },
  ],
  stepsTitle: 'Van profiel tot uitbetaling in 5 simpele stappen',
  stepsIntro: 'ZO WERKT MONTOO VOOR MONTEURS',
  steps: [
    ['document', 'Maak je profiel aan', 'Vul je gegevens in en voeg certificaten en ervaring toe.'],
    ['search', 'Ontdek opdrachten', 'Bekijk technische opdrachten die passen bij jouw vakgebied en regio.'],
    ['users', 'Reageer op opdrachten', 'Laat bedrijven weten waarom jij de juiste vakman bent.'],
    ['briefcase', 'Voer de opdracht uit', 'Maak afspraken met het bedrijf en voer de klus professioneel uit.'],
    ['euro', 'Ontvang je betaling', 'Na afronding wordt de betaling veilig aan jou vrijgegeven.'],
  ],
  dashboardEyebrow: 'ONTDEK OPDRACHTEN IN JOUW REGIO',
  dashboardTitle: 'Vind opdrachten die passen bij jouw vakmanschap',
  dashboardDescription: 'Bekijk beschikbare opdrachten, vergelijk de werkzaamheden en reageer op klussen die bij jouw planning passen.',
  dashboardBenefits: [
    'Bekijk nieuwe technische opdrachten',
    'Filter op vakgebied en locatie',
    'Bekijk planning en vergoeding',
    'Reageer wanneer het jou uitkomt',
    'Houd je reacties overzichtelijk bij',
  ],
  profileEyebrow: 'JOUW VAKMANSCHAP IN BEELD',
  profileTitle: 'Een professioneel profiel dat voor je werkt',
  profileDescription: 'Laat bedrijven zien wat je kunt. Toon je ervaring, certificaten, beoordelingen en afgeronde projecten op één plek.',
  profileBenefits: [
    'Laat je specialisaties zien',
    'Voeg geldige certificaten toe',
    'Verzamel reviews van bedrijven',
    'Toon foto’s van je projecten',
    'Laat je beschikbaarheid zien',
  ],
  paymentEyebrow: 'VEILIG BETALEN VIA MONTOO',
  paymentTitle: 'Jouw inzet wordt veilig uitbetaald',
  paymentDescription: 'Werk met duidelijke afspraken. De betaling wordt via Montoo beheerd en na afronding van de opdracht aan je vrijgegeven.',
  paymentSteps: [
    ['document', 'Opdracht gekozen'],
    ['users', 'Jij accepteert'],
    ['wallet', 'Betaling in beheer'],
    ['check', 'Opdracht afgerond'],
    ['euro', 'Jij ontvangt betaling'],
  ],
  ctaTitle: 'Klaar voor de volgende opdracht?',
  ctaDescription: 'Maak je profiel aan en ontdek de mogelijkheden van Montoo.',
  ctaButton: 'Word monteur',
};

const CompanyDashboard = () => (
  <div className={css.laptop}>
    <div className={css.laptopScreen}>
      <div className={css.appTop}>
        <strong className={css.appBrand}>MONTOO</strong>
        <span>Dashboard</span>
        <span>●</span>
        <span className={css.appUser}>Jan Jansen</span>
      </div>

      <div className={css.appBody}>
        <aside className={css.appSidebar}>
          <div>⌂　Dashboard</div>
          <div className={css.appNavActive}>＋　Nieuwe opdracht</div>
          <div>▤　Mijn opdrachten</div>
          <div>▣　Berichten</div>
          <div>♡　Favorieten</div>
          <div>⚙　Instellingen</div>
        </aside>

        <div className={css.appMain}>
          <h3>Nieuwe opdracht plaatsen</h3>
          <div className={css.formLabel}>Categorie</div>
          <div className={css.fakeInput}>Airco & klimaatbeheersing　⌄</div>
          <div className={css.formGrid}>
            <div>
              <div className={css.formLabel}>Titel van de opdracht</div>
              <div className={css.fakeInput}>Airco installeren woonkamer</div>
            </div>
            <div>
              <div className={css.formLabel}>Gewenste datum</div>
              <div className={css.fakeInput}>Kies een datum　▦</div>
            </div>
          </div>
          <div className={css.formLabel}>Beschrijving</div>
          <div className={`${css.fakeInput} ${css.fakeTextarea}`}>
            Beschrijf hier de werkzaamheden en de situatie...
          </div>
          <div className={css.formGrid}>
            <div>
              <div className={css.formLabel}>Locatie</div>
              <div className={css.fakeInput}>Deventer, Nederland</div>
            </div>
            <div>
              <div className={css.formLabel}>Planning</div>
              <div className={css.fakeInput}>In overleg</div>
            </div>
          </div>
          <div className={css.uploadField}>＋　Foto’s en documenten toevoegen</div>
          <div className={css.appSubmit}>Plaats opdracht →</div>
        </div>

        <aside className={css.appTips}>
          <strong>Tips voor een goede opdracht</strong>
          <p>✓ Wees zo duidelijk mogelijk</p>
          <p>✓ Voeg foto’s toe</p>
          <p>✓ Geef je planning aan</p>
          <p>✓ Vermeld speciale wensen</p>
        </aside>
      </div>
    </div>
    <div className={css.laptopBase} />
  </div>
);

const TechnicianDashboard = () => (
  <div className={css.laptop}>
    <div className={css.laptopScreen}>
      <div className={css.appTop}>
        <strong className={css.appBrand}>MONTOO</strong>
        <span>Opdrachten</span>
        <span>Berichten</span>
        <span className={css.appUser}>Mijn account</span>
      </div>

      <div className={css.technicianApp}>
        <aside className={css.appSidebar}>
          <div>⌂　Dashboard</div>
          <div className={css.appNavActive}>⌕　Opdrachten zoeken</div>
          <div>▤　Mijn reacties</div>
          <div>▣　Mijn planning</div>
          <div>♙　Mijn profiel</div>
          <div>⚙　Instellingen</div>
        </aside>

        <div className={css.opportunityList}>
          <h3>Opdrachten voor jou</h3>
          <div className={css.fakeInput}>⌕　Zoek op vakgebied of locatie</div>
          {[
            ['Airco installeren', 'Deventer · Deze week', 'Airco'],
            ['Onderhoud warmtepomp', 'Apeldoorn · In overleg', 'Warmtepomp'],
            ['Elektrotechnische installatie', 'Zutphen · Volgende week', 'Elektro'],
          ].map(([title, location, category]) => (
            <article className={css.opportunity} key={title}>
              <div className={css.opportunityIcon}>⌂</div>
              <div>
                <strong>{title}</strong>
                <span>{location}</span>
                <small>{category}</small>
              </div>
              <span className={css.opportunityArrow}>→</span>
            </article>
          ))}
        </div>
      </div>
    </div>
    <div className={css.laptopBase} />
  </div>
);

const DashboardPreview = ({ audience }) =>
  audience === 'company' ? <CompanyDashboard /> : <TechnicianDashboard />;

const ProfilePreview = ({ audience }) => (
  <div className={css.profileMockup}>
    <div className={css.profileSummary}>
      <div className={css.profileIdentity}>
        <div className={css.profileAvatar}>EV</div>
        <div>
          <strong>{audience === 'company' ? 'Erik de Vries' : 'Jouw profiel'}</strong>
          <span>{audience === 'company' ? 'Gecertificeerd monteur' : 'Technisch vakman'}</span>
          <span className={css.profileRating}>★★★★★ <small>4.9 (47 reviews)</small></span>
        </div>
      </div>
      <div className={css.profileMeta}>
        <span>Specialisaties</span>
        <strong>Airco · Warmtepompen · Elektro</strong>
        <span>Ervaring</span>
        <strong>8 jaar</strong>
        <span>Reactietijd</span>
        <strong>Binnen 2 uur</strong>
        <span>Beschikbaarheid</span>
        <strong className={css.availableTag}>Beschikbaar</strong>
      </div>
    </div>

    <div className={css.profileDetails}>
      <div className={css.profileTabs}>
        <span>Overzicht</span>
        <span className={css.selectedTab}>Certificaten</span>
        <span>Reviews</span>
        <span>Portfolio</span>
      </div>
      <div className={css.certificateHeading}>
        <strong>{audience === 'company' ? 'Gecertificeerde vakbekwaamheid' : 'Jouw certificaten'}</strong>
        <span>Status</span>
      </div>
      {[
        'STEK koudetechniek',
        'F-gassen Cat. I',
        'VCA VOL',
        'BRL 100',
      ].map(item => (
        <div className={css.certificateRow} key={item}>
          <span><Icon name="certificate" size={17} /> {item}</span>
          <strong>Geldig ✓</strong>
        </div>
      ))}
      <div className={css.profileLink}>Bekijk volledig profiel →</div>
    </div>
  </div>
);

const AboutAudiencePage = () => {
  const [audience, setAudience] = useState('company');
  const data = audience === 'company' ? company : technician;

  return (
    <div className={css.page}>
      {/* HERO */}
      <section className={css.hero}>
        <div className={css.heroContent}>
          <span className={css.heroEyebrow}>{data.eyebrow}</span>
          <h1>{data.title}</h1>
          <p className={css.heroDescription}>{data.description}</p>

          <span className={css.audiencePrompt}>Ik ben een...</span>
          <div className={css.switcher}>
            <button
              type="button"
              className={audience === 'company' ? css.switchActive : css.switchButton}
              onClick={() => setAudience('company')}
            >
              <Icon name="building" size={18} /> Bedrijf
            </button>
            <button
              type="button"
              className={audience === 'technician' ? css.switchActive : css.switchButton}
              onClick={() => setAudience('technician')}
            >
              <Icon name="users" size={18} /> Monteur
            </button>
          </div>

          <div className={css.heroActions}>
            <a href="#dashboard" className={css.primaryButton}>{data.primary} →</a>
            <a href="#werkwijze" className={css.secondaryButton}>▷ {data.secondary}</a>
          </div>

          <div className={css.trustRow}>
            {data.trust.map(item => (
              <div className={css.trustItem} key={item.text}>
                <Icon name={item.icon} size={22} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={css.heroVisual}>
          <img src={data.image} alt={data.imageAlt} className={css.heroImage} />
          <div className={css.heroProfileCard}>
            <span className={css.verified}>✓ Geverifieerd via Montoo</span>
            <div className={css.heroProfileIdentity}>
              <div className={css.profileAvatar}>EV</div>
              <div>
                <strong>{audience === 'company' ? 'Erik de Vries' : 'Jouw profiel'}</strong>
                <span>{audience === 'company' ? 'Gecertificeerd monteur' : 'Professioneel vakman'}</span>
                <span className={css.profileRating}>★★★★★ <small>(47 reviews)</small></span>
              </div>
            </div>
            <div className={css.heroProfileLine}><Icon name="pin" size={17} /> Regio Deventer</div>
            <div className={css.heroProfileLine}><Icon name="briefcase" size={17} /> 8 jaar ervaring</div>
            <div className={css.heroProfileLine}><Icon name="certificate" size={17} /> Gecertificeerd profiel</div>
            <div className={css.availableButton}>Beschikbaar</div>
          </div>
        </div>
      </section>

      {/* FIVE STEPS */}
      <section className={css.steps} id="werkwijze">
        <span className={css.sectionEyebrow}>{data.stepsIntro}</span>
        <h2>{data.stepsTitle}</h2>
        <div className={css.stepGrid}>
          {data.steps.map(([icon, title, description], index) => (
            <article className={css.step} key={title}>
              <div className={css.stepIcon}>
                <span className={css.stepNumber}>{index + 1}</span>
                <Icon name={icon} size={32} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <a href="#dashboard" className={css.stepsLink}>Meer over hoe het werkt →</a>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className={css.featureSection} id="dashboard">
        <div className={css.featureText}>
          <span className={css.sectionEyebrow}>{data.dashboardEyebrow}</span>
          <h2>{data.dashboardTitle}</h2>
          <p>{data.dashboardDescription}</p>
          <ul className={css.featureList}>
            {data.dashboardBenefits.map(item => (
              <li key={item}><Icon name="check" size={17} /> {item}</li>
            ))}
          </ul>
        </div>
        <div className={css.featureVisual}>
          <DashboardPreview audience={audience} />
        </div>
      </section>

      {/* PROFILE PREVIEW */}
      <section className={`${css.featureSection} ${css.profileSection}`}>
        <div className={css.featureText}>
          <span className={css.sectionEyebrow}>{data.profileEyebrow}</span>
          <h2>{data.profileTitle}</h2>
          <p>{data.profileDescription}</p>
          <ul className={css.featureList}>
            {data.profileBenefits.map(item => (
              <li key={item}><Icon name="check" size={17} /> {item}</li>
            ))}
          </ul>
        </div>
        <div className={css.featureVisual}>
          <ProfilePreview audience={audience} />
        </div>
      </section>

      {/* PAYMENT PROCESS */}
      <section className={css.paymentSection}>
        <div className={css.paymentIntro}>
          <span className={css.sectionEyebrow}>{data.paymentEyebrow}</span>
          <h2>{data.paymentTitle}</h2>
          <p>{data.paymentDescription}</p>
        </div>
        <div className={css.paymentFlow}>
          {data.paymentSteps.map(([icon, label], index) => (
            <React.Fragment key={label}>
              <div className={css.paymentStep}>
                <span className={css.paymentIcon}><Icon name={icon} size={27} /></span>
                <strong>{index + 1}. {label}</strong>
              </div>
              {index < data.paymentSteps.length - 1 && (
                <span className={css.paymentArrow}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={css.cta}>
        <div className={css.ctaText}>
          <h2>{data.ctaTitle}</h2>
          <p>{data.ctaDescription}</p>
        </div>
        <div className={css.ctaActions}>
          <a href="#dashboard" className={css.ctaPrimary}>{data.ctaButton} →</a>
          <a href="#werkwijze" className={css.ctaSecondary}>Bekijk hoe het werkt</a>
        </div>
        <div className={css.ctaTrust}>
          <span>✓ Geen verborgen kosten</span>
          <span>✓ Geen langdurige verplichtingen</span>
          <span>✓ Altijd transparant</span>
        </div>
      </section>
    </div>
  );
};

export default AboutAudiencePage;
