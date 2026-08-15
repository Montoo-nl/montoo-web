import React from 'react';

/**
 * The few icons this page needs that the shared set doesn't have. They are kept
 * here rather than in src/components because nothing else uses them yet.
 *
 * All of them stroke/fill with currentColor, so a class on the <svg> is enough
 * to colour them - unlike IconLocation, which hard-codes fill on its path.
 */

// Shield with a check: the "Verified" badge over the avatar.
export const IconVerifiedBadge = props => (
  <svg className={props.className} width="13" height="14" viewBox="0 0 13 14" fill="none">
    <path
      d="M6.5 1L11.5 2.6v4.2c0 3-2.1 5.4-5 6.2-2.9-.8-5-3.2-5-6.2V2.6L6.5 1z"
      fill="currentColor"
    />
    <path
      d="M4.3 6.9l1.6 1.6 3-3.2"
      stroke="#fff"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Crossed spanner and screwdriver: the Skills heading.
export const IconTools = props => (
  <svg className={props.className} width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path
      d="M9.6 1.6a3 3 0 00-.7 5.3l-6 6a1.2 1.2 0 001.7 1.7l6-6a3 3 0 003.6-4.1l-1.9 1.9-1.7-.4-.4-1.7 1.9-1.9a3 3 0 00-1.5-.8z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

// Rosette: the Years of Experience heading.
export const IconAward = props => (
  <svg className={props.className} width="14" height="16" viewBox="0 0 14 16" fill="none">
    <circle cx="7" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M4.3 10.2L3.4 15l3.6-1.8L10.6 15l-.9-4.8"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconVan = props => (
  <svg className={props.className} width="18" height="16" viewBox="0 0 18 16" fill="none">
    <path
      d="M1 4.2c0-.7.5-1.2 1.2-1.2h6.9c.6 0 1.1.5 1.1 1.2v6.9H1V4.2zM10.2 5.9h2.9c.4 0 .8.2 1 .6l1.7 2.7c.1.2.2.4.2.6v1.3h-5.8V5.9z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <circle cx="4.4" cy="12.4" r="1.6" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="12.8" cy="12.4" r="1.6" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

// A check inside a soft circle - reads as a confirmation mark rather than the
// bare tick, which looked like a stray glyph next to the chip text.
export const IconTick = props => (
  <svg className={props.className} width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="7" fill="currentColor" opacity="0.12" />
    <path
      d="M4.2 7.1l2 2 3.6-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconBuilding = props => (
  <svg className={props.className} width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 14V3.2c0-.4.3-.7.7-.7h5.6c.4 0 .7.3.7.7V14M9.5 14V6.8h3.3c.4 0 .7.3.7.7V14M1 14h14M4.8 5.3h1.6M4.8 7.8h1.6M4.8 10.3h1.6M11.2 9.3h.6M11.2 11.5h.6"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
