import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';

import { NamedLink } from '../..';

import css from './MissingJobRequirements.module.css';

/**
 * Spells out what a job asks for that the technician's profile doesn't cover,
 * and points them at the page where they can add it. Renders nothing when the
 * profile covers everything, so callers can render it unconditionally.
 *
 * Use `getMissingJobRequirements` from config/configTechnician.js to build the
 * lists - it also takes care of leaving logged out visitors alone.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Overrides the default root class
 * @param {string} [props.className] - Added to the root class
 * @param {Object} [props.missingRequirements] - From getMissingJobRequirements
 * @param {Array<string>} [props.missingRequirements.specialisations] - missing specialisation labels
 * @param {Array<string>} [props.missingRequirements.certifications] - missing certification labels
 * @returns {JSX.Element|null}
 */
const MissingJobRequirements = props => {
  const { rootClassName, className, missingRequirements } = props;
  const { specialisations = [], certifications = [] } = missingRequirements || {};

  if (specialisations.length === 0 && certifications.length === 0) {
    return null;
  }

  const classes = classNames(rootClassName || css.root, className);

  return (
    <div className={classes}>
      <p className={css.title}>
        <FormattedMessage id="MissingJobRequirements.title" />
      </p>
      <p className={css.info}>
        <FormattedMessage id="MissingJobRequirements.info" />
      </p>

      <ul className={css.list}>
        {specialisations.map(label => (
          <li key={`specialisation_${label}`}>
            <FormattedMessage id="MissingJobRequirements.specialisation" values={{ label }} />
          </li>
        ))}
        {certifications.map(label => (
          <li key={`certification_${label}`}>
            <FormattedMessage id="MissingJobRequirements.certification" values={{ label }} />
          </li>
        ))}
      </ul>

      <NamedLink className={css.link} name="ProfileSettingsPage">
        <FormattedMessage id="MissingJobRequirements.updateProfileLink" />
      </NamedLink>
    </div>
  );
};

export default MissingJobRequirements;
