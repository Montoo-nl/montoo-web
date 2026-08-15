import React from 'react';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage } from '../../../util/reactIntl';

import { IconAward, IconTick, IconTools, IconVan } from './TechnicianIcons';
import {
  getEquipmentItems,
  getSkillLabels,
  getYearsOfExperience,
} from './technicianProfileData';
import css from './TechnicianProfile.module.css';

const SkillsColumn = props => {
  const { skills } = props;
  return (
    <div className={css.bandColumnSkills}>
      <h2 className={css.bandHeading}>
        <IconTools className={css.bandHeadingIcon} />
        <FormattedMessage id="TechnicianProfile.skillsTitle" />
      </h2>
      <ul className={css.chips}>
        {skills.map(skill => (
          <li className={css.chip} key={skill}>
            {skill}
            <IconTick className={css.chipTick} />
          </li>
        ))}
      </ul>
    </div>
  );
};

const ExperienceColumn = props => {
  const { years } = props;

  return (
    <div className={css.bandColumn}>
      <h2 className={css.bandHeading}>
        <IconAward className={css.bandHeadingIcon} />
        <FormattedMessage id="TechnicianProfile.experienceTitle" />
      </h2>
      <div className={css.experienceBody}>
        <p className={css.experienceValue}>{years}+</p>
        <p className={css.experienceUnit}>
          <FormattedMessage id="TechnicianProfile.years" />
        </p>
      </div>
    </div>
  );
};

const TransportationColumn = props => {
  const { items } = props;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={css.bandColumn}>
      <h2 className={css.bandHeading}>
        <IconVan className={css.bandHeadingIcon} />
        <FormattedMessage id="TechnicianProfile.transportationTitle" />
      </h2>
      <ul className={css.transportList}>
        {items.map(item => (
          <li className={css.transportItem} key={item.key}>
            <span>{item.label}</span>
            <IconTick className={css.transportTick} />
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * The three-column band: skills, experience and what the technician can bring.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData - The profile's public data
 * @returns {JSX.Element}
 */
const TechnicianSkillsBand = props => {
  const { publicData } = props;
  const config = useConfiguration();

  return (
    <section className={css.band}>
      <SkillsColumn skills={getSkillLabels(publicData, config)} />
      <ExperienceColumn years={getYearsOfExperience(publicData)} />
      <TransportationColumn items={getEquipmentItems(publicData, config)} />
    </section>
  );
};

export default TechnicianSkillsBand;
