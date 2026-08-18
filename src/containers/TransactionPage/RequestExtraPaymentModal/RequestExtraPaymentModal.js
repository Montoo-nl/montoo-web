import React from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';

import appSettings from '../../../config/settings';
import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import { required } from '../../../util/validators';
import { findDisallowedContent, getDisallowedContentMessage } from '../../../util/contentFilter';
import { formatMoney } from '../../../util/currency';
import { types as sdkTypes } from '../../../util/sdkLoader';
import {
  STRIPE_CARD_FEE_PERCENTAGE,
  splitExtraPaymentAmount,
} from '../../../transactions/transactionProcessExtraPayment';

import {
  Button,
  ExternalLink,
  FieldCurrencyInput,
  FieldTextInput,
  Form,
  Modal,
} from '../../../components';

import css from './RequestExtraPaymentModal.module.css';

const { Money } = sdkTypes;

// Where the fees below come from, so a technician can check them for themselves.
const STRIPE_PRICING_URL = 'https://stripe.com/nl/pricing';

/**
 * What the technician is left with once Stripe has taken its cut. Shown while
 * they type, so the amount they ask for isn't a surprise on the payout side.
 *
 * Both figures are shown because the deduction isn't settled yet: the company
 * chooses card or iDEAL when they come to pay, and the fee is worked out then.
 * Showing one number would be a promise this side can't keep.
 *
 * @param {Object} props
 * @param {Money} [props.amount] - The amount currently in the form
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element|null}
 */
const PayoutBreakdown = props => {
  const { amount, intl } = props;
  const split = splitExtraPaymentAmount(amount);

  if (!split) {
    return null;
  }

  const { currency, card, ideal } = split;
  const money = subunits => formatMoney(intl, new Money(subunits, currency));

  return (
    <div className={css.breakdown}>
      <div className={classNames(css.breakdownRow, css.breakdownTotal)}>
        <span>
          <FormattedMessage id="RequestExtraPaymentForm.amountAskedLabel" />
        </span>
        <span>{money(amount.amount)}</span>
      </div>

      <div className={css.breakdownRow}>
        <span>
          <FormattedMessage id="RequestExtraPaymentForm.idealFeeLabel" />
        </span>
        <span>-{money(ideal.feeInSubunits)}</span>
      </div>

      <div className={css.breakdownRow}>
        <span>
          <FormattedMessage
            id="RequestExtraPaymentForm.cardFeeLabel"
            values={{ percentage: STRIPE_CARD_FEE_PERCENTAGE }}
          />
        </span>
        <span>-{money(card.feeInSubunits)}</span>
      </div>

      <p className={css.breakdownNote}>
        <FormattedMessage
          id="RequestExtraPaymentForm.stripeFeeNote"
          values={{
            stripePricingLink: (
              <ExternalLink className={css.breakdownLink} href={STRIPE_PRICING_URL}>
                <FormattedMessage id="RequestExtraPaymentForm.stripePricingLinkText" />
              </ExternalLink>
            ),
          }}
        />
      </p>
    </div>
  );
};

const RequestExtraPaymentForm = props => (
  <FinalForm
    {...props}
    render={fieldRenderProps => {
      const {
        className,
        rootClassName,
        disabled,
        handleSubmit,
        intl,
        formId,
        invalid,
        requestSubmitted,
        requestError,
        requestInProgress,
        currencyConfig,
        values,
      } = fieldRenderProps;


      const errorMessageMaybe = requestError ? (
        <FormattedMessage id="RequestExtraPaymentForm.submitFailed" />
      ) : null;

      const classes = classNames(rootClassName || css.formRoot, className);
      const submitDisabled = invalid || disabled || requestInProgress;

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <FieldCurrencyInput
            className={css.amount}
            id={formId ? `${formId}.amount` : 'amount'}
            name="amount"
            label={intl.formatMessage({ id: 'RequestExtraPaymentForm.amountLabel' })}
            placeholder={intl.formatMessage({ id: 'RequestExtraPaymentForm.amountPlaceholder' })}
            currencyConfig={currencyConfig}
            validate={required(
              intl.formatMessage({ id: 'RequestExtraPaymentForm.amountRequired' })
            )}
          />

          <PayoutBreakdown amount={values?.amount} intl={intl} />

          <FieldTextInput
            className={css.reason}
            id={formId ? `${formId}.reason` : 'reason'}
            name="reason"
            type="textarea"
            label={intl.formatMessage({ id: 'RequestExtraPaymentForm.reasonLabel' })}
            placeholder={intl.formatMessage({ id: 'RequestExtraPaymentForm.reasonPlaceholder' })}
            validate={required(
              intl.formatMessage({ id: 'RequestExtraPaymentForm.reasonRequired' })
            )}
          />

          <p className={css.errorPlaceholder}>{errorMessageMaybe}</p>

          <Button
            className={css.submitButton}
            type="submit"
            inProgress={requestInProgress}
            disabled={submitDisabled}
            ready={requestSubmitted}
          >
            {intl.formatMessage({ id: 'RequestExtraPaymentForm.submit' })}
          </Button>
        </Form>
      );
    }}
  />
);

/**
 * Lets a technician ask the company for an extra amount on a job that has
 * already been paid for - unforeseen work, extra materials, a longer day than
 * quoted.
 *
 * The request becomes a transaction of its own on the extra-payment process,
 * which is what the company then pays.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} props.id - The modal id
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onCloseModal - Called when the modal is closed
 * @param {Function} props.onManageDisableScrolling - Manage disable scrolling function
 * @param {Function} props.onSubmit - Called with { amount, reason }
 * @param {boolean} props.requestSubmitted - Whether the request went through
 * @param {boolean} props.requestInProgress - Whether the request is in flight
 * @param {propTypes.error} props.requestError - The request error
 * @param {Object} props.currencyConfig - The currency configuration
 * @returns {JSX.Element}
 */
const RequestExtraPaymentModal = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const {
    className,
    rootClassName,
    id,
    isOpen = false,
    onCloseModal,
    focusElementId,
    onManageDisableScrolling,
    onSubmit,
    requestSubmitted = false,
    requestInProgress = false,
    requestError,
    currencyConfig,
  } = props;
  const classes = classNames(rootClassName || css.root, className);

  // Note: getCurrencyFormatting throws when the currency is missing, and the
  // page passes null whenever the listing has no price of its own.
  const safeCurrencyConfig = currencyConfig || appSettings.getCurrencyFormatting(config.currency);

  // Contact details and payment methods stay on the platform, same as in every
  // other free-text field the two sides write to each other.
  const handleSubmit = values => {
    const error = getDisallowedContentMessage(intl, findDisallowedContent(values?.reason));

    if (error) {
      window.alert(error);
      return;
    }
    return onSubmit(values);
  };

  return (
    <Modal
      id={id}
      containerClassName={classes}
      contentClassName={css.modalContent}
      isOpen={isOpen}
      onClose={onCloseModal}
      onManageDisableScrolling={onManageDisableScrolling}
      focusElementId={focusElementId}
      usePortal
    >
      <p className={css.modalTitle}>
        <FormattedMessage id="RequestExtraPaymentModal.title" />
      </p>
      <p className={css.modalMessage}>
        <FormattedMessage id="RequestExtraPaymentModal.description" />
      </p>

      <RequestExtraPaymentForm
        onSubmit={handleSubmit}
        intl={intl}
        formId="RequestExtraPaymentForm"
        currencyConfig={safeCurrencyConfig}
        requestSubmitted={requestSubmitted}
        requestInProgress={requestInProgress}
        requestError={requestError}
      />
    </Modal>
  );
};

export default RequestExtraPaymentModal;
