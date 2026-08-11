import React from 'react';
import classNames from 'classnames';

import css from './IconLocation.module.css';

/**
 * Map pin icon.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @returns {JSX.Element} SVG icon
 */
const IconLocation = props => {
  const { rootClassName, className } = props;
  const classes = classNames(rootClassName || css.root, className);
  return (
    <svg
      className={classes}
      width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.00005 1C3.79505 1 2.00005 2.795 2.00005 5C1.98505 8.22 5.56005 10.8 5.71005 10.91C5.79505 10.97 5.90005 11.005 6.00005 11.005C6.10005 11.005 6.20505 10.975 6.29005 10.91C6.44005 10.8 10.015 8.225 10 5C10 2.795 8.20505 1 6.00005 1ZM6.00005 7C4.89505 7 4.00005 6.105 4.00005 5C4.00005 3.895 4.89505 3 6.00005 3C7.10505 3 8.00005 3.895 8.00005 5C8.00005 6.105 7.10505 7 6.00005 7Z" fill="white" />
    </svg>

  );
};

export default IconLocation;
