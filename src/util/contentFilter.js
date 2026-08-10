/**
 * Screens free-text the users write to each other (offer messages, chat
 * messages, inquiries, ...) for attempts to take the deal off the platform:
 * contact details and payment methods.
 *
 * The marketplace runs in the Netherlands, so the word lists cover Dutch as
 * well as English, and the local payment methods (iDEAL, Tikkie, Wero, ...)
 * next to the international ones.
 *
 * Usage:
 *   const matches = findDisallowedContent(text);      // -> [{ category, term }]
 *   const error = validateNoDisallowedContent(intl);  // Final Form validator
 *
 * Tuning: the rules are plain exported arrays. Add or remove entries there
 * rather than at the call sites, so that every input filters the same way.
 */

// What a match is about. Used to group the terms in the error message.
export const CONTACT_DETAILS = 'contactDetails';
export const PAYMENT_METHOD = 'paymentMethod';

// Escape a literal so it can be embedded in a regular expression.
const escapeRegExp = term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Words that give away contact details, in English and Dutch. Matched as whole
// words, case-insensitively.
export const CONTACT_TERMS = [
  // English
  'phone',
  'phone number',
  'telephone',
  'mobile',
  'cell',
  'email',
  'e-mail',
  'mail me',
  'text me',
  'call me',
  'dm me',
  // Dutch
  'telefoon',
  'telefoonnummer',
  'telefoonnr',
  'mobiel',
  'mobiele nummer',
  'gsm',
  'bel me',
  'bel mij',
  'bellen',
  'opbellen',
  'mailtje',
  'mail mij',
  'mailadres',
  'e-mailadres',
  'contactgegevens',
  'nummer sturen',
  'stuur je nummer',
  // Channels people move to
  'whatsapp',
  'whats app',
  'appje',
  'app me',
  'app mij',
  'sms',
  'telegram',
  'signal',
  'skype',
  'instagram',
  'insta',
  'facebook',
  'messenger',
  'linkedin',
  'snapchat',
];

// Payment methods and off-platform payment talk. Matched as whole words,
// case-insensitively.
export const PAYMENT_TERMS = [
  // Dutch / European methods
  // Note: 'ideal' is matched case-insensitively, so it also rejects the English
  // adjective ("an ideal candidate"). That is deliberate for a Dutch
  // marketplace, where iDEAL the payment method is the far likelier meaning.
  'ideal',
  'tikkie',
  'wero',
  'bunq',
  'bancontact',
  'mollie',
  'sofort',
  'klarna',
  'sepa',
  'iban',
  'overboeking',
  'overmaken',
  'betaalverzoek',
  'contant',
  'contant betalen',
  'zwart betalen',
  'buiten het platform',
  'buiten platform',
  'onderhands',
  // International methods
  'paypal',
  'venmo',
  'cash app',
  'cashapp',
  'revolut',
  'transferwise',
  'zelle',
  'western union',
  'moneygram',
  'bitcoin',
  'crypto',
  // English off-platform talk
  'cash',
  'bank transfer',
  'wire transfer',
  'off platform',
  'off-platform',
  'pay directly',
  'pay outside',
];

// Patterns for details that don't come as words: phone numbers, emails, links
// and bank accounts.
const PATTERN_RULES = [
  {
    category: CONTACT_DETAILS,
    // someone@example.com, also written as "someone (at) example dot com"
    pattern: /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[a-z0-9.-]+\s*(?:\.|\sdot\s)\s*[a-z]{2,}/gi,
  },
  {
    category: CONTACT_DETAILS,
    // Dutch and international phone numbers, incl. spaced or dashed grouping.
    // The digit count keeps prices and years ("1 200 euro", "2024 - 2026")
    // from being read as a phone number.
    pattern: /(?:\+?\d[\d\s().-]{6,}\d)/g,
    isMatchValid: match => (match.match(/\d/g) || []).length >= 8,
  },
  {
    category: CONTACT_DETAILS,
    // Links, with or without a protocol
    pattern: /(?:https?:\/\/|www\.)[^\s]+/gi,
  },
  {
    category: PAYMENT_METHOD,
    // IBAN, e.g. NL91ABNA0417164300
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g,
  },
];

// Build one whole-word regex per term list. The lookarounds are on letters and
// digits rather than \b, so that terms containing '-' or a space ('e-mail',
// 'cash app') still match as whole words while 'cash' doesn't match 'cashew'.
// Longest terms come first: JS alternation takes the first branch that matches,
// so without sorting 'phone' would win over 'phone number'.
const toWordPattern = terms => {
  const escaped = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  return new RegExp(`(?<![\\p{L}\\d])(?:${escaped})(?![\\p{L}\\d])`, 'giu');
};

const TERM_RULES = [
  { category: CONTACT_DETAILS, pattern: toWordPattern(CONTACT_TERMS) },
  { category: PAYMENT_METHOD, pattern: toWordPattern(PAYMENT_TERMS) },
];

const ALL_RULES = [...TERM_RULES, ...PATTERN_RULES];

/**
 * Everything in the text that isn't allowed to be shared.
 *
 * @param {string} text the text the user wrote
 * @returns {Array<Object>} [{ category, term }] - term is what was matched, as
 * it was written. Empty when the text is fine.
 */
export const findDisallowedContent = text => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const seen = new Set();

  const found = ALL_RULES.reduce((collected, { category, pattern, isMatchValid }) => {
    // Note: String.match resets a global regex's lastIndex itself, so these
    // module-level patterns are safe to reuse across calls.
    const matches = text.match(pattern) || [];

    const newMatches = matches.reduce((picked, rawMatch) => {
      const term = rawMatch.trim();
      const key = `${category}:${term.toLowerCase()}`;
      if (!term || seen.has(key) || (isMatchValid && !isMatchValid(term))) {
        return picked;
      }
      seen.add(key);
      return [...picked, { category, term }];
    }, []);

    return [...collected, ...newMatches];
  }, []);

  // Patterns overlap - the digits of an IBAN also look like a phone number - so
  // only report the longest match of each overlapping pair.
  return found.filter(
    ({ term }) =>
      !found.some(
        other =>
          other.term.length > term.length && other.term.toLowerCase().includes(term.toLowerCase())
      )
  );
};

/**
 * Whether the text is safe to send.
 *
 * @param {string} text the text the user wrote
 * @returns {boolean} true when nothing disallowed was found
 */
export const hasDisallowedContent = text => findDisallowedContent(text).length > 0;

/**
 * Turns the matches into a message that names what has to go.
 *
 * @param {intlShape} intl
 * @param {Array<Object>} matches from findDisallowedContent
 * @returns {string|null} null when there is nothing to report
 */
export const getDisallowedContentMessage = (intl, matches) => {
  if (matches.length === 0) {
    return null;
  }

  const hasContactDetails = matches.some(m => m.category === CONTACT_DETAILS);
  const hasPaymentMethod = matches.some(m => m.category === PAYMENT_METHOD);
  const messageId =
    hasContactDetails && hasPaymentMethod
      ? 'ContentFilter.errorBoth'
      : hasPaymentMethod
      ? 'ContentFilter.errorPaymentMethod'
      : 'ContentFilter.errorContactDetails';

  return intl.formatMessage(
    { id: messageId },
    { terms: matches.map(m => m.term).join(', '), count: matches.length }
  );
};

/**
 * Final Form field-level validator. Compose it with the field's other
 * validators, e.g.
 *   validate={composeValidators(required(msg), validateNoDisallowedContent(intl))}
 *
 * @param {intlShape} intl
 * @returns {Function} value => error message, or undefined when the value is fine
 */
export const validateNoDisallowedContent = intl => value =>
  getDisallowedContentMessage(intl, findDisallowedContent(value)) || undefined;
