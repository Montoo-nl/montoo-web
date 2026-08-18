import React from 'react';

import Field, { hasDataInFields } from './Field';
import { hasContent } from './Field/Field.helpers';
import { H1, H2, H3, H4, H5, H6 } from './Primitives/Heading';
import { Ingress } from './Primitives/Ingress';
import { Text } from './Primitives/Text';

import css from './DualToneField.module.css';

/**
 * Substrings to paint blue inside each section's description.
 * Matching is case-insensitive against the CMS string (display case is preserved).
 * Update these phrases if Console copy changes.
 */
const SECTION_DESCRIPTION_HIGHLIGHTS = {
  'landing-hero': ['assignments & professionals'],
  'why-choose-mento': ['TWO SIDES OF THE WORK'],
  features: ['IN ONE PLACE'],
  'the-process': ['MONTOO'],
  'section-listing': ['JOB LISTINGS'],
  testimonials: ['SAY'],
  faq: ['QUESTIONS?'],
  assignment: ['TWO SIDES OF THE WORK'],
};

const FIELD_TYPE_COMPONENTS = {
  heading1: H1,
  heading2: H2,
  heading3: H3,
  heading4: H4,
  heading5: H5,
  heading6: H6,
  paragraph: Ingress,
  text: Text,
};

/**
 * Wrap the first matching highlight phrase in a span.
 *
 * @param {string} text
 * @param {Array<string>} phrases
 * @param {string} highlightClassName
 * @returns {React.ReactNode}
 */
export const highlightPhrases = (text, phrases = [], highlightClassName) => {
  if (!text || !phrases.length) {
    return text;
  }

  const lowerText = text.toLowerCase();
  for (const phrase of phrases) {
    if (!phrase) {
      continue;
    }
    const idx = lowerText.indexOf(phrase.toLowerCase());
    if (idx === -1) {
      continue;
    }
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + phrase.length);
    const after = text.slice(idx + phrase.length);
    return (
      <>
        {before}
        <span className={highlightClassName}>{match}</span>
        {after}
      </>
    );
  }

  return text;
};

/**
 * Renders a Page Builder field, applying a blue highlight to a configured
 * phrase when the section has a dual-tone heading in the design.
 *
 * @param {Object} props
 * @param {Object} props.data field config from CMS
 * @param {string} props.sectionId
 * @param {string?} props.className
 * @param {Object?} props.options
 * @returns {JSX.Element|null}
 */
const DualToneField = props => {
  const { data, sectionId, className, options } = props;
  const phrases = SECTION_DESCRIPTION_HIGHLIGHTS[sectionId];
  const canHighlight = Array.isArray(phrases) && phrases.length > 0 && hasContent(data);

  if (!canHighlight) {
    return <Field data={data} className={className} options={options} />;
  }

  const Component = FIELD_TYPE_COMPONENTS[data.fieldType];
  if (!Component) {
    // Unknown / markdown / etc. — fall back to default Field rendering
    return <Field data={data} className={className} options={options} />;
  }

  // Skip rendering empty fields the same way Field does
  if (!hasDataInFields([data], options)) {
    return null;
  }

  return (
    <Component className={className}>
      {highlightPhrases(data.content, phrases, css.highlight)}
    </Component>
  );
};

export default DualToneField;
