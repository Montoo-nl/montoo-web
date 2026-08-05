import React from 'react';
import { LinkedLogo } from '../../../../components';

import Field from '../../Field';
import BlockBuilder from '../../BlockBuilder';

import SectionContainer from '../SectionContainer';
import css from './SectionFooter.module.css';

const MAX_MOBILE_SCREEN_WIDTH = 1024;

/**
 * @typedef {Object} SocialMediaLinkConfig
 * @property {'socialMediaLink'} fieldType
 * @property {string} platform
 * @property {string} url
 */

/**
 * @typedef {Object} BlockConfig
 * @property {string} blockId
 * @property {string} blockName
 * @property {'defaultBlock' | 'footerBlock' | 'socialMediaLink'} blockType
 */

/**
 * @typedef {Object} FieldComponentConfig
 * @property {ReactNode} component
 * @property {Function} pickValidProps
 */

/**
 * Section component that's able to show blocks in multiple different columns (defined by "numberOfColumns" prop)
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string} props.sectionId id of the section
 * @param {'footer'} props.sectionType
 * @param {number} props.numberOfColumns columns for blocks in footer (1-4)
 * @param {Array<SocialMediaLinkConfig>?} props.socialMediaLinks array of social media link configs
 * @param {Object?} props.slogan
 * @param {Object?} props.copyright
 * @param {Object?} props.appearance
 * @param {Array<BlockConfig>?} props.blocks array of block configs
 * @param {Object} props.options extra options for the section component (e.g. custom fieldComponents)
 * @param {Object<string,FieldComponentConfig>?} props.options.fieldComponents custom fields
 * @returns {JSX.Element} Section for article content
 */
const SectionFooter = props => {
  const {
    sectionId,
    className,
    rootClassName,
    socialMediaLinks = [],
    slogan,
    appearance,
    copyright,
    blocks = [],
    options,
    linkLogoToExternalSite,
  } = props;

  // If external mapping has been included for fields
  // E.g. { h1: { component: MyAwesomeHeader } }
  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };
  const linksWithBlockId = socialMediaLinks?.map(sml => {
    return {
      ...sml,
      blockId: sml.link.platform,
    };
  });

  const showSocialMediaLinks = socialMediaLinks?.length > 0;
  const hasBlocks = blocks?.length > 0;
  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  const isMobileLayout = hasMatchMedia
    ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
    : true;
  const logoLayout = isMobileLayout ? 'mobile' : 'desktop';

  return (
    <SectionContainer
      as="footer"
      id={sectionId}
      className={className || css.root}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
    >
      <div className={css.footer}>
        <div className={css.content}>
          <div className={css.brand}>
            <LinkedLogo
              rootClassName={css.logoLink}
              logoClassName={css.logoWrapper}
              logoImageClassName={css.logoImage}
              linkToExternalSite={linkLogoToExternalSite}
              layout={logoLayout}
            />
            <Field data={slogan} className={css.slogan} />
          </div>

          {showSocialMediaLinks ? (
            <div className={css.icons}>
              <BlockBuilder blocks={linksWithBlockId} sectionId={sectionId} options={options} />
            </div>
          ) : null}

          {hasBlocks ? (
            <div className={css.nav}>
              <BlockBuilder
                blocks={blocks}
                sectionId={sectionId}
                options={options}
                rootClassName={css.navBlock}
                textClassName={css.navText}
              />
            </div>
          ) : null}

          <Field data={copyright} className={css.copyright} />
        </div>
      </div>
    </SectionContainer>
  );
};

export default SectionFooter;
