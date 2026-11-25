
import React from 'react';
import AboutAudiencePage from '../AboutAudiencePage/AboutAudiencePage';

import { IconSpinner, LayoutComposer } from '../../components/index.js';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer.js';
import FooterContainer from '../FooterContainer/FooterContainer.js';

import { validProps } from './Field';

import SectionBuilder from './SectionBuilder/SectionBuilder.js';
import StaticPage from './StaticPage.js';

import css from './PageBuilder.module.css';

const getMetadata = (meta, schemaType, fieldOptions) => {
  const { pageTitle, pageDescription, socialSharing } = meta;

  const title = validProps(pageTitle, fieldOptions)?.content;
  const description = validProps(pageDescription, fieldOptions)?.content;
  const openGraph = validProps(socialSharing, fieldOptions);
  const schemaImage = openGraph?.images1200?.[0]?.url;
  const schemaImageMaybe = schemaImage ? { image: [schemaImage] } : {};
  const isArticle = ['Article', 'NewsArticle', 'TechArticle'].includes(schemaType);
  const schemaHeadlineMaybe = isArticle ? { headline: title } : {};

  const pageSchemaForSEO = {
    '@context': 'http://schema.org',
    '@type': schemaType || 'WebPage',
    description: description,
    name: title,
    ...schemaHeadlineMaybe,
    ...schemaImageMaybe,
  };

  return {
    title,
    description,
    schema: pageSchemaForSEO,
    socialSharing: openGraph,
  };
};

const LoadingSpinner = () => {
  return (
    <div className={css.loading}>
      <IconSpinner delay={600} />
    </div>
  );
};

const PageBuilder = props => {
  const {
    pageAssetsData,
    inProgress,
    error,
    fallbackPage,
    schemaType,
    options,
    currentPage,
    featuredListings,
    pageId,
    ...pageProps
  } = props;

  if (!pageAssetsData && fallbackPage && !inProgress && error) {
    return fallbackPage;
  }

  const { sections = [], meta = {} } = pageAssetsData || {};
  const pageMetaProps = getMetadata(meta, schemaType, options?.fieldComponents);

  const isCustomAboutPage = pageId === 'about';

  const layoutAreas = `
    topbar
    main
    footer
  `;

  return (
    <StaticPage {...pageMetaProps} {...pageProps}>
      <LayoutComposer areas={layoutAreas} className={css.layout}>
        {props => {
          const { Topbar, Main, Footer } = props;

          return (
            <>
              <Topbar as="header" className={css.topbar}>
                <TopbarContainer currentPage={currentPage} />
              </Topbar>

              <Main as="main" id="main-content" className={css.main}>
                {sections.length === 0 && inProgress ? (
                  <LoadingSpinner />
                ) : isCustomAboutPage ? (
                  <AboutAudiencePage />
                ) : (
                  <SectionBuilder
                    sections={sections}
                    options={{ ...options, featuredListings }}
                  />
                )}
              </Main>

              <Footer>
                <FooterContainer />
              </Footer>
            </>
          );
        }}
      </LayoutComposer>
    </StaticPage>
  );
};

export { LayoutComposer, StaticPage, SectionBuilder };

export default PageBuilder;
