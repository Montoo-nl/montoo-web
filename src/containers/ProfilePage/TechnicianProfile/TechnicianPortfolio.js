import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { AspectRatioWrapper } from '../../../components';

import { getPortfolioItems } from './technicianProfileData';
import css from './TechnicianProfile.module.css';

const PortfolioTile = props => {
  const { item } = props;
  return (
    <li className={css.portfolioCard}>
      <AspectRatioWrapper width={4} height={3} className={css.portfolioImageWrapper}>
        {item.url ? (
          <img className={css.portfolioImage} src={item.url} alt={item.title || ''} />
        ) : (
          // A placeholder entry has no url on purpose - showing an empty tile is
          // better than borrowing an image from a host the CSP would block.
          <div className={css.portfolioImagePlaceholder} aria-hidden="true" />
        )}
      </AspectRatioWrapper>
      {item.title ? <p className={css.portfolioTitle}>{item.title}</p> : null}
      {item.city ? <p className={css.portfolioCity}>{item.city}</p> : null}
    </li>
  );
};

/**
 * Examples of the technician's recent work, as a carousel over everything they
 * have uploaded.
 *
 * The rail is a plain scroll-snap list, so it stays swipeable on a touch screen
 * and keyboard-scrollable everywhere; the arrows are there for a mouse, and
 * hide themselves when there is nothing to scroll to.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData - The profile's public data
 * @returns {JSX.Element}
 */
const TechnicianPortfolio = props => {
  const { publicData } = props;
  const intl = useIntl();

  const railRef = useRef(null);
  const [scrollState, setScrollState] = useState({ canScrollBack: false, canScrollOn: false });

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = rail;
    setScrollState({
      canScrollBack: scrollLeft > 1,
      // A pixel of slack: sub-pixel widths can leave scrollLeft a hair short of
      // the end, which would keep the arrow enabled with nowhere to go.
      canScrollOn: scrollLeft + clientWidth < scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState]);

  const items = getPortfolioItems(publicData);

  if (items.length === 0) {
    return null;
  }

  const scrollByCard = direction => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }
    // One card plus the gap, so a click lands the next tile in the same place
    // the last one was.
    const card = rail.firstElementChild;
    const step = card ? card.offsetWidth + 12 : rail.clientWidth;
    rail.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const arrow = (direction, labelId, canScroll) => (
    <button
      className={classNames(css.carouselArrow, {
        [css.carouselArrowDisabled]: !canScroll,
      })}
      type="button"
      disabled={!canScroll}
      aria-label={intl.formatMessage({ id: labelId })}
      onClick={() => scrollByCard(direction)}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d={direction < 0 ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  return (
    <section className={css.portfolio}>
      <div className={css.portfolioHeader}>
        <h2 className={css.sectionTitle}>
          <FormattedMessage id="TechnicianProfile.portfolioTitle" />
        </h2>
        {items.length > 1 ? (
          <div className={css.carouselControls}>
            {arrow(-1, 'TechnicianProfile.previousPhotos', scrollState.canScrollBack)}
            {arrow(1, 'TechnicianProfile.nextPhotos', scrollState.canScrollOn)}
          </div>
        ) : null}
      </div>

      <ul className={css.portfolioRow} ref={railRef} onScroll={updateScrollState}>
        {items.map(item => (
          <PortfolioTile item={item} key={item.key} />
        ))}
      </ul>
    </section>
  );
};

export default TechnicianPortfolio;
