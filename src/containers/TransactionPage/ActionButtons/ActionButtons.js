import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { getStartOf } from '../../../util/dates';
import { allowCustomerCounterOffer, allowProviderUpdateOffer } from '../../../util/configHelpers';
import { formatMoney } from '../../../util/currency';
import { types as sdkTypes } from '../../../util/sdkLoader';
import {
  isPaid as isExtraPaymentPaid,
  isPayable as isExtraPaymentPayable,
} from '../../../transactions/transactionProcessExtraPayment';
import { transitions as negotiationTransitions } from '../../../transactions/transactionProcessNegotiation';

import { PrimaryButton, SecondaryButton, Button } from '../../../components';

import RequestExtraPaymentModal from '../RequestExtraPaymentModal/RequestExtraPaymentModal';
import ExtraPaymentModal from '../ExtraPaymentModal/ExtraPaymentModal';
import css from './ActionButtons.module.css';

const { Money } = sdkTypes;

export const ACTION_BUTTON_1_ID = 'actionButton1';
export const ACTION_BUTTON_2_ID = 'actionButton2';
export const ACTION_BUTTON_3_ID = 'actionButton3';

const hasReachedMaxDurationSinceTransition = (condition, transitions, timeZone) => {
  // sinceTransition may name several transitions, for a milestone that can be
  // reached in more than one way - e.g. a payment confirmed by card or by a
  // push payment method. The first one found is the one that happened.
  const sinceTransitionNames = Array.isArray(condition.sinceTransition)
    ? condition.sinceTransition
    : [condition.sinceTransition];
  const sinceTransition = transitions.find(t => sinceTransitionNames.includes(t.transition));
  if (sinceTransition) {
    const enteredAt = getStartOf(sinceTransition.createdAt, 'day', timeZone);
    const expiresAt = getStartOf(enteredAt, 'day', timeZone, condition.days, 'days');
    const today = getStartOf(new Date(), 'day', timeZone);
    return today > expiresAt;
  }
  return false;
};
const hasReachedMaxTransitions = (condition, transitions) => {
  return transitions.length >= condition.max;
};
const checkCondition = (condition, additionalInfo) => {
  const { transitions, timeZone, listingTypeConfig } = additionalInfo;

  if (condition.type === 'durationSinceTransition') {
    return hasReachedMaxDurationSinceTransition(condition, transitions, timeZone);
  }
  if (condition.type === 'maxTransitions') {
    return hasReachedMaxTransitions(condition, transitions);
  }
  if (condition.type === 'providerUpdateOfferHidden') {
    // hide the button if the provider update offer is not allowed
    return condition.action === 'hide' && !allowProviderUpdateOffer(listingTypeConfig);
  }
  if (condition.type === 'customerCounterOfferHidden') {
    // hide the button if the customer counter offer is not allowed
    return condition.action === 'hide' && !allowCustomerCounterOffer(listingTypeConfig);
  }
  return false;
};

const getButtonStatus = (buttonProps, additionalInfo) => {
  const { transitions, timeZone, intl, listingTypeConfig, isCounterpartyInactive } = additionalInfo;

  if (isCounterpartyInactive) {
    return { disabled: true, reason: '', hidden: false };
  }

  if (!buttonProps?.conditions) {
    return { disabled: false, reason: '', hidden: false };
  }

  return buttonProps.conditions.reduce(
    (acc, c) => {
      const extra = { transitions, timeZone, listingTypeConfig };
      if (!acc.hidden && c.action === 'hide' && checkCondition(c, extra)) {
        return { disabled: false, hidden: true, reason: '' };
      } else if (!acc.disabled && c.action === 'disable' && checkCondition(c, extra)) {
        // Use disabledReason.translationKey if present
        const translationKey = c.disabledReason?.translationKey;
        const fallbackReason = 'You cannot perform this action right now.'; // This should not be shown ever.

        if (!translationKey) {
          console.warn(`Translation key not found for condition: ${c.type}`);
        }

        return {
          hidden: acc.hidden,
          disabled: true,
          reason: translationKey ? intl.formatMessage({ id: translationKey }) : fallbackReason,
        };
      }
      return acc;
    },
    { disabled: false, reason: '', hidden: false }
  );
};

/**
 * @typedef {Object} DisabledReason
 * @property {string} translationKey - Translation key for the disabled reason message
 */

/**
 * @typedef {Object} DurationSinceTransitionCondition
 * @property {'durationSinceTransition'} type - Type of condition
 * @property {'disable'} action - Action to take when condition is met
 * @property {string|Array<string>} sinceTransition - The transition name to check duration since, or several names when the milestone can be reached in more than one way
 * @property {number} days - Number of days after which the condition applies
 * @property {DisabledReason} disabledReason - Reason for disabling the button
 */

/**
 * @typedef {Object} MaxTransitionsCondition
 * @property {'maxTransitions'} type - Type of condition
 * @property {'disable'} action - Action to take when condition is met
 * @property {number} max - Maximum number of transitions allowed
 * @property {DisabledReason} disabledReason - Reason for disabling the button
 */

/**
 * @typedef {DurationSinceTransitionCondition|MaxTransitionsCondition} ButtonCondition
 */

/**
 * @typedef {Object} ButtonProps
 * @property {boolean} [inProgress] - Whether the button action is currently in progress
 * @property {Object} [error] - Error object if the button action failed
 * @property {string} [error.type] - Error type (should be 'error')
 * @property {string} [error.name] - Error name
 * @property {string} [error.message] - Error message
 * @property {Function} onAction - Function to call when the button is clicked
 * @property {string} [buttonText] - Text to display on the button
 * @property {string} [errorText] - Text to display when there's an error
 * @property {Array<ButtonCondition>} [conditions] - Array of conditions that can disable the button
 */

/**
 * ActionButtons component is used to show the action buttons for the transaction panel.
 * It checks if the buttons should be disabled based on the conditions and transitions.
 * It also shows the error message if the button is disabled.
 *
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @param {string} [props.containerId] - The id of the container that the buttons are in
 * @param {boolean} props.showButtons
 * @param {ButtonProps} [props.primaryButtonProps]
 * @param {ButtonProps} [props.secondaryButtonProps]
 * @param {ButtonProps} [props.tertiaryButtonProps]
 * @param {boolean} props.isListingDeleted
 * @param {boolean} props.isProvider
 * @param {Array} props.transitions
 * @param {Array} [props.actionButtonOrder] - The order of the action buttons
 * @param {boolean} [props.hasValidData] - Whether the data is valid
 * @param {string} [props.errorMessageId] - The translation id of the error message
 * @param {string} [props.timeZone] - The time zone
 * @param {boolean} [props.isCounterpartyInactive] - Whether the counterparty is inactive
 */
const ActionButtons = props => {
  const {
    className,
    rootClassName,
    containerId = '',
    listingTypeConfig,
    showButtons,
    primaryButtonProps,
    secondaryButtonProps,
    tertiaryButtonProps,
    isListingDeleted,
    isProvider,
    transitions = [],
    hasValidData = true,
    errorMessageId,
    timeZone = 'Etc/UTC',
    isCounterpartyInactive,
    // Extra payments: everything the two sides do about an amount asked for
    // after the job was paid for lives here, next to the process's own actions.
    extraPaymentTxs = [],
    // Set when the customer is coming back from an iDEAL redirect, so the modal
    // they left can be put back in front of them. Only one of the two rendered
    // ActionButtons is given this - the modal is portalled, so opening it from
    // both would put two of them on the page.
    autoOpenExtraPaymentId,
    onRequestExtraPayment,
    onExtraPaymentUpdated,
    onManageDisableScrolling,
    currentUser,
    currencyConfig,
  } = props;

  const intl = useIntl();

  const [isRequestModalOpen, setRequestModalOpen] = useState(false);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [reviewedExtraPayment, setReviewedExtraPayment] = useState(null);

  // A job only takes one extra payment for now, so the whole thing is driven by
  // that single child transaction: its last transition says whether it is still
  // waiting, was paid, or was turned down.
  const extraPayment = extraPaymentTxs[0] || null;

  // Reopen the modal after a redirect away to the customer's bank. Done once
  // per id: closing it should stay closed even though the URL still says so.
  const autoOpenedRef = useRef(null);
  useEffect(() => {
    const matches = autoOpenExtraPaymentId && extraPayment?.id?.uuid === autoOpenExtraPaymentId;
    if (matches && autoOpenedRef.current !== autoOpenExtraPaymentId) {
      autoOpenedRef.current = autoOpenExtraPaymentId;
      setReviewedExtraPayment(extraPayment);
    }
  }, [autoOpenExtraPaymentId, extraPayment]);
  const extraPaymentLastTransition = extraPayment?.attributes?.lastTransition;
  const extraPaymentAmount = extraPayment?.attributes?.payinTotal;
  const formattedExtraPayment = extraPaymentAmount ? formatMoney(intl, extraPaymentAmount) : '';

  const isExtraPaymentOpen = isExtraPaymentPayable(extraPaymentLastTransition);
  const wasExtraPaymentPaid = isExtraPaymentPaid(extraPaymentLastTransition);

  // Asking for more only makes sense once the job itself has been paid for -
  // before that, the amount is still being negotiated. These are the job's own
  // transitions: a card payment and a push payment (iDEAL) are confirmed by
  // different ones, and either means the job is paid.
  const jobPaidTransitions = [
    negotiationTransitions.CONFIRM_PAYMENT,
    negotiationTransitions.CONFIRM_PUSH_PAYMENT,
  ];
  const isJobPaidFor = transitions.some(t => jobPaidTransitions.includes(t.transition));
  const canRequestExtraPayment = isProvider && isJobPaidFor && !extraPayment;

  const handleOpenRequestModal = () => {
    setRequestError(null);
    setRequestSubmitted(false);
    setRequestModalOpen(true);
  };

  const handleSubmitRequest = values => {
    setRequestInProgress(true);
    setRequestError(null);

    return onRequestExtraPayment(values)
      .then(() => {
        setRequestSubmitted(true);
        setRequestModalOpen(false);
      })
      .catch(e => {
        setRequestError(e);
      })
      .finally(() => {
        setRequestInProgress(false);
      });
  };

  if (isListingDeleted && isProvider) {
    return null;
  }

  // Additional data passed for the button status calculation
  const extraData = { transitions, timeZone, intl, listingTypeConfig, isCounterpartyInactive };

  const buttonsDisabled = primaryButtonProps?.inProgress || secondaryButtonProps?.inProgress;

  const primaryErrorMessage = primaryButtonProps?.error ? (
    <p className={css.actionError}>{primaryButtonProps?.errorText}</p>
  ) : null;

  const secondaryErrorMessage = secondaryButtonProps?.error ? (
    <p className={css.actionError}>{secondaryButtonProps?.errorText}</p>
  ) : null;

  const tertiaryErrorMessage = tertiaryButtonProps?.error ? (
    <p className={css.actionError}>{tertiaryButtonProps?.errorText}</p>
  ) : null;

  const actionButtonOrder = props.actionButtonOrder || ['primary', 'secondary', 'tertiary'];
  const primaryButtonStatus = getButtonStatus(primaryButtonProps, extraData);
  const secondaryButtonStatus = getButtonStatus(secondaryButtonProps, extraData);
  const tertiaryButtonStatus = getButtonStatus(tertiaryButtonProps, extraData);
  const isVisible = (actionButtonName, buttonStatus) =>
    actionButtonOrder.includes(actionButtonName) && !buttonStatus.hidden;

  const hasMultipleButtons =
    isVisible('primary', primaryButtonStatus) &&
    isVisible('secondary', secondaryButtonStatus) &&
    isVisible('tertiary', tertiaryButtonStatus);
  const renderingOrder =
    hasMultipleButtons || containerId === 'desktop'
      ? actionButtonOrder
      : [...actionButtonOrder].reverse();

  const classes = classNames(rootClassName || css.root, className);

  // Neither asking for an extra payment nor answering one is a transition of
  // the job's own process - the job is already paid for and usually has no
  // action buttons left at all - so these sit outside the showButtons gate.
  // The technician sees what actually reaches them: the transaction's own
  // payout total, rather than the percentage worked out again on this side.
  const extraPaymentPayout = extraPayment?.attributes?.payoutTotal;
  // The fee is only worked out when the company pays, because it depends on
  // whether they use a card or iDEAL. Until then the payout equals the amount,
  // which would otherwise be shown as a '-0,00' fee and a payout that isn't
  // settled yet.
  const isFeeSettled = extraPaymentAmount && extraPaymentPayout
    ? extraPaymentPayout.amount < extraPaymentAmount.amount
    : false;

  const providerBreakdown =
    isProvider && extraPaymentAmount && extraPaymentPayout ? (
      <div className={css.extraPaymentBreakdown}>
        <div className={css.extraPaymentRow}>
          <span>
            <FormattedMessage id="ActionButtons.extraPaymentAmountLabel" />
          </span>
          <span>{formattedExtraPayment}</span>
        </div>
        <div className={css.extraPaymentRow}>
          <span>
            <FormattedMessage id="ActionButtons.extraPaymentFeeLabel" />
          </span>
          {isFeeSettled ? (
            <span>
              -
              {formatMoney(
                intl,
                new Money(
                  extraPaymentAmount.amount - extraPaymentPayout.amount,
                  extraPaymentAmount.currency
                )
              )}
            </span>
          ) : (
            <span className={css.extraPaymentPending}>
              <FormattedMessage id="ActionButtons.extraPaymentFeePending" />
            </span>
          )}
        </div>
        {isFeeSettled ? (
          <div className={classNames(css.extraPaymentRow, css.extraPaymentTotal)}>
            <span>
              <FormattedMessage id="ActionButtons.extraPaymentPayoutLabel" />
            </span>
            <span>{formatMoney(intl, extraPaymentPayout)}</span>
          </div>
        ) : (
          <p className={css.extraPaymentPendingNote}>
            <FormattedMessage id="ActionButtons.extraPaymentFeePendingNote" />
          </p>
        )}
      </div>
    ) : null;

  const extraPaymentStatus = !extraPayment ? null : isExtraPaymentOpen ? (
    // The company answers it; the technician just waits
    isProvider ? (
      <>
        <p className={css.extraPaymentStatus}>
          <FormattedMessage
            id="ActionButtons.extraPaymentPending"
            values={{ amount: formattedExtraPayment }}
          />
        </p>
        {providerBreakdown}
      </>
    ) : (
      <SecondaryButton onClick={() => setReviewedExtraPayment(extraPayment)}>
        <FormattedMessage
          id="ActionButtons.reviewExtraPayment"
          values={{ amount: formattedExtraPayment }}
        />
      </SecondaryButton>
    )
  ) : wasExtraPaymentPaid ? (
    <>
      <p className={css.extraPaymentStatus}>
        <FormattedMessage
          id={
            isProvider ? 'ActionButtons.extraPaymentPaidProvider' : 'ActionButtons.extraPaymentPaid'
          }
          values={{ amount: formattedExtraPayment }}
        />
      </p>
      {providerBreakdown}
    </>
  ) : (
    <p className={css.extraPaymentStatus}>
      <FormattedMessage id="ActionButtons.extraPaymentClosed" />
    </p>
  );

  const extraPaymentActions =
    canRequestExtraPayment || extraPaymentStatus ? (
      <div className={css.extraPayments} key="extraPayments">
        {canRequestExtraPayment ? (
          <SecondaryButton onClick={handleOpenRequestModal}>
            {intl.formatMessage({ id: 'ActionButtons.requestExtraPayment' })}
          </SecondaryButton>
        ) : null}

        {extraPaymentStatus}
      </div>
    ) : null;

  const extraPaymentModals = (
    <>
      <RequestExtraPaymentModal
        id="RequestExtraPaymentModal"
        isOpen={isRequestModalOpen}
        onCloseModal={() => setRequestModalOpen(false)}
        onManageDisableScrolling={onManageDisableScrolling}
        onSubmit={handleSubmitRequest}
        requestSubmitted={requestSubmitted}
        requestInProgress={requestInProgress}
        requestError={requestError}
        currencyConfig={currencyConfig}
      />

      <ExtraPaymentModal
        id="ExtraPaymentModal"
        isOpen={!!reviewedExtraPayment}
        onCloseModal={() => setReviewedExtraPayment(null)}
        onManageDisableScrolling={onManageDisableScrolling}
        extraPaymentTx={reviewedExtraPayment}
        currentUser={currentUser}
        onPaid={() => {
          setReviewedExtraPayment(null);
          // The list of requests is a snapshot taken when the page loaded, so
          // paying or declining one has to reload it - otherwise the button
          // stays as it was.
          onExtraPaymentUpdated?.();
        }}
      />
    </>
  );

  if (!showButtons) {
    return extraPaymentActions ? (
      <div className={classes}>
        {extraPaymentActions}
        {extraPaymentModals}
      </div>
    ) : null;
  }

  return (
    <div className={classes}>
      <div className={css.actionErrors}>
        {primaryErrorMessage || secondaryErrorMessage || tertiaryErrorMessage}
      </div>
      <div
        className={classNames(css.actionButtonsWrapper, {
          [css.multipleButtons]: !!hasMultipleButtons,
        })}
      >
        {renderingOrder.map(buttonType => {
          if (buttonType === 'primary') {
            const { disabled, reason, hidden } = primaryButtonStatus;
            return primaryButtonProps && hasValidData && !hidden ? (
              <div className={css.actionButtonWrapper} key={buttonType}>
                <PrimaryButton
                  id={`${containerId}_${ACTION_BUTTON_1_ID}`}
                  inProgress={primaryButtonProps.inProgress}
                  disabled={buttonsDisabled || disabled}
                  onClick={primaryButtonProps.onAction}
                >
                  {primaryButtonProps.buttonText}
                </PrimaryButton>
                {disabled && <div className={css.finePrint}>{reason}</div>}
              </div>
            ) : null;
          }
          if (buttonType === 'secondary') {
            const { disabled, reason, hidden } = secondaryButtonStatus;
            return secondaryButtonProps && hasValidData && !hidden ? (
              <div className={css.actionButtonWrapper} key={buttonType}>
                <SecondaryButton
                  id={`${containerId}_${ACTION_BUTTON_2_ID}`}
                  inProgress={secondaryButtonProps?.inProgress}
                  disabled={buttonsDisabled || disabled}
                  onClick={secondaryButtonProps.onAction}
                >
                  {secondaryButtonProps.buttonText}
                </SecondaryButton>
                {disabled && <div className={css.finePrint}>{reason}</div>}
              </div>
            ) : null;
          }
          if (buttonType === 'tertiary') {
            const { disabled, reason, hidden } = tertiaryButtonStatus;
            return tertiaryButtonProps && hasValidData && !hidden ? (
              <div className={css.actionButtonWrapper} key={buttonType}>
                <Button
                  id={`${containerId}_${ACTION_BUTTON_3_ID}`}
                  inProgress={tertiaryButtonProps?.inProgress}
                  disabled={buttonsDisabled || disabled}
                  onClick={tertiaryButtonProps.onAction}
                >
                  {tertiaryButtonProps.buttonText}
                </Button>
                {disabled && <div className={css.finePrint}>{reason}</div>}
              </div>
            ) : null;
          }
          return null;
        })}

        {!hasValidData ? (
          <div className={css.actionButtonWrapper}>
            <p className={css.error}>{intl.formatMessage({ id: errorMessageId })}</p>
          </div>
        ) : null}
      </div>

      {extraPaymentActions}
      {extraPaymentModals}
    </div>
  );
};

export default ActionButtons;
