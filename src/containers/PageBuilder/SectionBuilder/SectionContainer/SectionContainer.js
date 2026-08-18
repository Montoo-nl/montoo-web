import React from 'react';
import classNames from 'classnames';

import Field from '../../Field';

import css from './SectionContainer.module.css';

// Section id of the landing page hero, as set in Console.
const HERO_SECTION_ID = 'landing-hero';

/**
 * @typedef {Object} FieldComponentConfig
 * @property {ReactNode} component
 * @property {Function} pickValidProps
 */

/**
 * This component can be used to wrap some common styles and features of Section-level components.
 * E.g: const SectionHero = props => (<SectionContainer><H1>Hello World!</H1></SectionContainer>);
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.id id of the section
 * @param {string?} props.as tag/element name. Defaults to 'section'.
 * @param {ReactNode} props.children
 * @param {Object} props.appearance
 * @param {Object} props.options extra options for the section component (e.g. custom fieldComponents)
 * @param {Object<string,FieldComponentConfig>?} props.options.fieldComponents custom fields
 * @returns {JSX.Element} containing wrapper that can be used inside Block components.
 */
const SectionContainer = props => {
  const { className, rootClassName, id, as, children, appearance, options, ...otherProps } = props;
  const Tag = as || 'section';
  const classes = classNames(rootClassName || css.root, className);

  // The hero's background is the largest thing on the landing page and sits at
  // the top of it, so it is almost always what decides the largest contentful
  // paint. Telling the browser to fetch it first gets it started before the
  // rest of the page competes for bandwidth.
  //
  // Keyed on the section id rather than on the template, so it keeps working if
  // the hero is rebuilt with a different section type.
  const isPriorityBackground = id === HERO_SECTION_ID;

  return (
    <Tag className={classes} id={id} {...otherProps}>
      {appearance?.fieldType === 'customAppearance' ? (
        <Field
          data={{ alt: `Background image for ${id}`, ...appearance }}
          className={className}
          options={options}
          {...(isPriorityBackground
            ? { fetchpriority: 'high' }
            : // Everything below the hero can wait. Left eager, these compete
              // with it for the same connections while being off screen.
              { loading: 'lazy' })}
        />
      ) : null}

      <div className={css.sectionContent}>{children}</div>
    </Tag>
  );
};

export default SectionContainer;
