import React, { useState } from 'react';
import classNames from 'classnames';

import Field, { hasDataInFields } from '../../Field';
import BlockBuilder from '../../BlockBuilder';
import DualToneField from '../../DualToneField';

import SectionContainer from '../SectionContainer';

import css from './SectionFeatures.module.css';

const ProcessSmileyIcon = () => (
  <svg width="34" height="20" viewBox="0 0 34 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.32995 3.44992C6.32995 2.40992 6.60995 1.56992 7.16995 0.929922C7.74995 0.309922 8.47995 -7.80597e-05 9.35995 -7.80597e-05C10.2399 -7.80597e-05 10.9699 0.309922 11.5499 0.929922C12.1299 1.56992 12.4199 2.40992 12.4199 3.44992C12.4199 4.46992 12.1299 5.28992 11.5499 5.90992C10.9699 6.54992 10.2399 6.86992 9.35995 6.86992C8.49995 6.86992 7.77995 6.54992 7.19995 5.90992C6.61995 5.28992 6.32995 4.46992 6.32995 3.44992ZM18.3899 3.44992C18.3899 2.40992 18.6699 1.56992 19.2299 0.929922C19.8099 0.309922 20.5399 -7.80597e-05 21.4199 -7.80597e-05C22.2999 -7.80597e-05 23.0299 0.309922 23.6099 0.929922C24.1899 1.56992 24.4799 2.40992 24.4799 3.44992C24.4799 4.46992 24.1899 5.28992 23.6099 5.90992C23.0299 6.54992 22.2999 6.86992 21.4199 6.86992C20.5599 6.86992 19.8399 6.54992 19.2599 5.90992C18.6799 5.28992 18.3899 4.46992 18.3899 3.44992ZM-5.40614e-05 8.03266H0.539946C2.59995 10.0127 5.05995 11.5527 7.91995 12.6527C10.7799 13.7727 13.7299 14.3327 16.7699 14.3327C19.8499 14.3327 22.8299 13.7627 25.7099 12.6227C28.6099 11.5027 31.0899 9.92266 33.1499 7.88266H33.6899V13.6427C31.8499 15.6227 29.4299 17.1627 26.4299 18.2627C23.4499 19.3827 20.2299 19.9427 16.7699 19.9427C13.3499 19.9427 10.1599 19.3927 7.19995 18.2927C4.23995 17.1927 1.83995 15.6827 -5.40614e-05 13.7627V8.03266Z"
      fill="white"
    />
  </svg>
);

const ProcessTimeline = () => (
  <div className={css.processTimeline} aria-hidden="true">
    <ol className={css.processSteps}>
      <li className={css.processStep}>
        <span className={css.processStepInner}>1</span>
      </li>
      <li className={css.processStep}>
        <span className={css.processStepInner}>2</span>
      </li>
      <li className={css.processStep}>
        <span className={css.processStepInner}>3</span>
      </li>
      <li className={css.processStep}>
        <span className={css.processStepInner}>
          <ProcessSmileyIcon />
        </span>
      </li>
    </ol>
  </div>
);

/**
 * FAQ accordion built from Page Builder blocks (title = question, text = answer).
 * The last block is reserved for the bottom CTA button.
 *
 * @param {Object} props
 * @param {Array} props.blocks
 * @param {Object} props.options
 * @param {string} props.sectionId
 * @param {string?} props.ctaButtonClass
 */
const FaqAccordion = props => {
  const { blocks = [], options, sectionId, ctaButtonClass } = props;
  const [openIndex, setOpenIndex] = useState(0);

  const faqBlocks = blocks.length > 1 ? blocks.slice(0, -1) : blocks;
  const ctaBlock = blocks.length > 1 ? blocks[blocks.length - 1] : null;
  const ctaField = ctaBlock?.callToAction;

  const toggleItem = index => {
    setOpenIndex(current => (current === index ? -1 : index));
  };

  return (
    <div className={css.faq}>
      <ul className={css.faqList}>
        {faqBlocks.map((block, index) => {
          const blockId = block.blockId || `${sectionId}-faq-${index + 1}`;
          const question = block.title?.content || block.blockName || '';
          const isOpen = openIndex === index;
          const panelId = `${blockId}-panel`;
          const buttonId = `${blockId}-button`;

          return (
            <li key={blockId} className={classNames(css.faqItem, { [css.faqItemOpen]: isOpen })}>
              <button
                id={buttonId}
                type="button"
                className={css.faqQuestion}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(index)}
              >
                <span className={css.faqQuestionText}>{question}</span>
              <span className={css.faqToggleContainer}>
              <span className={css.faqToggle} aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </span>
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={classNames(css.faqAnswer, { [css.faqAnswerOpen]: isOpen })}
              >
                <Field data={block.text} options={options} />
              </div>
            </li>
          );
        })}
      </ul>

      {hasDataInFields([ctaField], { fieldComponents: options?.fieldComponents }) ? (
        <div className={css.faqCta}>
          <Field data={ctaField} className={classNames(ctaButtonClass, css.faqCtaButton)} options={options} />
        </div>
      ) : null}
    </div>
  );
};

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
 * Section component that shows features.
 * Block content are shown in a row-like way:
 * [image] text
 * text [image]
 * [image] text
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Object} props.defaultClasses
 * @param {string} props.defaultClasses.sectionDetails
 * @param {string} props.defaultClasses.title
 * @param {string} props.defaultClasses.description
 * @param {string} props.defaultClasses.ctaButton
 * @param {string} props.sectionId id of the section
 * @param {'features'} props.sectionType
 * @param {Object?} props.title
 * @param {Object?} props.description
 * @param {Object?} props.appearance
 * @param {Object?} props.callToAction
 * @param {Array<BlockConfig>?} props.blocks array of block configs
 * @param {boolean?} props.isInsideContainer
 * @param {Object} props.options extra options for the section component (e.g. custom fieldComponents)
 * @param {Object<string,FieldComponentConfig>?} props.options.fieldComponents custom fields
 * @returns {JSX.Element} Section for article content
 */
const SectionFeatures = props => {
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    title,
    description,
    appearance,
    callToAction,
    blocks = [],
    isInsideContainer = false,
    options,
  } = props;

  // If external mapping has been included for fields
  // E.g. { h1: { component: MyAwesomeHeader } }
  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };

  const hasHeaderFields = hasDataInFields([title, description, callToAction], fieldOptions);
  const hasBlocks = blocks?.length > 0;
  const isProcessSection = sectionId === 'the-process';
  const isFaqSection = sectionId === 'faq';

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
    >
      {hasHeaderFields ? (
        <header className={defaultClasses.sectionDetails}>
          <Field data={title} className={defaultClasses.title} options={fieldOptions} />
          <DualToneField
            data={description}
            sectionId={sectionId}
            className={defaultClasses.description}
            options={fieldOptions}
          />
          <Field data={callToAction} className={defaultClasses.ctaButton} options={fieldOptions} />
        </header>
      ) : null}

      {isFaqSection && hasBlocks ? (
        <FaqAccordion
          blocks={blocks}
          options={options}
          sectionId={sectionId}
          ctaButtonClass={defaultClasses.ctaButton}
        />
      ) : null}

      {!isFaqSection && hasBlocks ? (
        <div
          className={classNames(defaultClasses.blockContainer, css.featuresMain, {
            [css.noSidePaddings]: isInsideContainer,
            [css.processLayout]: isProcessSection,
          })}
        >
          <BlockBuilder
            rootClassName={css.block}
            ctaButtonClass={defaultClasses.ctaButton}
            blocks={blocks}
            sectionId={sectionId}
            responsiveImageSizes="(max-width: 767px) 100vw, 568px"
            options={options}
          />
          {isProcessSection ? <ProcessTimeline /> : null}
        </div>
      ) : null}
    </SectionContainer>
  );
};

export default SectionFeatures;
