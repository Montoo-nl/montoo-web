import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import { formatMoney } from '../../../util/currency';
import { denormalisedResponseEntities } from '../../../util/data';
import { STRIPE_JS_LOADED_EVENT } from '../../../util/includeScripts';
import { confirmCardPayment, retrievePaymentIntent } from '../../../ducks/stripe.duck';
import { isPaid, transitions } from '../../../transactions/transactionProcessExtraPayment';

import { IconSpinner, Modal, PrimaryButton, SecondaryButton } from '../../../components';

import { stripeCustomer } from '../../CheckoutPage/CheckoutPage.duck';
import {
  PAYMENT_METHOD_TYPE_CARD,
  PAYMENT_METHOD_TYPE_IDEAL,
} from '../../CheckoutPage/CheckoutPageTransactionHelpers';
import EnhancedPaymentMethodsForm from '../../PaymentMethodsPage/PaymentMethodsForm/PaymentMethodsForm';

import { makeTransition } from '../TransactionPage.duck';
import css from './ExtraPaymentModal.module.css';

/**
 * The first version of the extra-payment process that has the push-payment
 * transitions in their current shape. Requests created before it stay on their
 * own version for up to a week and cannot be paid with iDEAL - the transition
 * simply isn't there - so the choice is not offered for them.
 */
const PUSH_PAYMENT_MIN_PROCESS_VERSION = 4;

// PaymentIntent statuses where the customer's money is already with Stripe.
// For a push payment that means captured - there is nothing left to pay, and
// nothing safe to decline.
const SETTLED_PI_STATUSES = ['processing', 'requires_capture', 'succeeded'];

/**
 * The company reviews an extra payment a technician asked for, and pays it.
 *
 * The request is a transaction of its own on the extra-payment process. Paying
 * it takes three steps, the same shape as the main checkout:
 *   1. 'initiate-payment' (or 'initiate-push-payment') creates the payment intent
 *   2. the browser confirms it with Stripe
 *   3. 'confirm-payment' captures it and pays the technician out
 *
 * Card and iDEAL both end up here, and they part ways at step 2. A card is
 * confirmed in this window and the transaction is completed straight after. An
 * iDEAL payment sends the customer to their own bank, so the browser leaves the
 * page entirely; Stripe brings them back to the job page, and the transaction is
 * confirmed by the operator from the Stripe webhook rather than from here.
 *
 * Because of that, the modal has to be resumable. Whatever it finds when it
 * opens - an intent half-paid, an intent the customer walked away from, money
 * already taken and waiting on the webhook - it has to say so and offer only the
 * actions that are actually safe.
 *
 * @component
 * @param {Object} props
 * @param {string} props.id - The modal id
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onCloseModal - Called when the modal is closed
 * @param {Function} props.onManageDisableScrolling - Manage disable scrolling function
 * @param {propTypes.transaction} props.extraPaymentTx - The extra payment transaction
 * @param {propTypes.currentUser} props.currentUser - The current user, for the saved card
 * @param {Function} [props.onPaid] - Called once the payment went through
 * @returns {JSX.Element}
 */
const ExtraPaymentModal = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const dispatch = useDispatch();

  const {
    className,
    rootClassName,
    id,
    isOpen = false,
    onCloseModal,
    onManageDisableScrolling,
    extraPaymentTx,
    currentUser,
    onPaid,
  } = props;

  const [stripe, setStripe] = useState(null);
  const [payInProgress, setPayInProgress] = useState(false);
  const [payError, setPayError] = useState(null);
  // Whether the saved card is known yet. Starts true so the modal never shows
  // the card form for a moment before finding out there is a saved card.
  const [isLoadingCard, setLoadingCard] = useState(true);
  // The transaction as this modal last saw it. The prop is a snapshot taken when
  // the modal was opened, and a transition made in here moves the transaction on
  // without the parent refetching - so the snapshot goes stale mid-session and
  // every decision below (which decline is legal, whether the method is locked)
  // would be made against the wrong state.
  const [txOverride, setTxOverride] = useState(null);
  // iDEAL by default: it is what companies here overwhelmingly pay with, and it
  // is much cheaper to process than a card.
  const [paymentMethodChoice, setPaymentMethodChoice] = useState(PAYMENT_METHOD_TYPE_IDEAL);
  const [idealName, setIdealName] = useState(null);
  // Status of an intent that already exists, once we've asked Stripe for it.
  const [paymentIntentStatus, setPaymentIntentStatus] = useState(null);
  const [isCheckingPaymentIntent, setCheckingPaymentIntent] = useState(false);

  const tx = txOverride || extraPaymentTx;
  const paymentIntents = tx?.attributes?.protectedData?.stripePaymentIntents;
  const clientSecret = paymentIntents?.default?.stripePaymentIntentClientSecret;

  // Stripe.js is deferred on this route, so it may not be there when the modal
  // opens. Without the event the Pay button can end up permanently disabled.
  useEffect(() => {
    const publishableKey = config.stripe.publishableKey;
    if (!isOpen || !publishableKey) {
      return;
    }

    const initStripe = () => {
      if (typeof window !== 'undefined' && window.Stripe) {
        setStripe(prev => prev || window.Stripe(publishableKey));
      }
    };

    initStripe();
    window.addEventListener(STRIPE_JS_LOADED_EVENT, initStripe);
    return () => window.removeEventListener(STRIPE_JS_LOADED_EVENT, initStripe);
  }, [isOpen, config.stripe.publishableKey]);

  // The saved card lives on the Stripe customer, which isn't part of the
  // currentUser the page already has - it has to be fetched.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setLoadingCard(true);
    Promise.resolve(dispatch(stripeCustomer())).finally(() => setLoadingCard(false));
  }, [isOpen, dispatch]);

  // Reset per-session state whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      setTxOverride(null);
      setPayError(null);
      setIdealName(null);
      setPaymentMethodChoice(PAYMENT_METHOD_TYPE_IDEAL);
      setPaymentIntentStatus(null);
    }
  }, [isOpen]);

  // If an intent already exists, Stripe is the only source of truth for whether
  // the money has moved - the transaction can't tell us, because a push payment
  // is confirmed by a webhook that may not have arrived yet.
  useEffect(() => {
    if (!isOpen || !stripe || !clientSecret) {
      return;
    }
    let cancelled = false;
    setCheckingPaymentIntent(true);
    dispatch(retrievePaymentIntent({ stripe, stripePaymentIntentClientSecret: clientSecret }))
      .then(response => {
        if (!cancelled) {
          setPaymentIntentStatus(response?.paymentIntent?.status || null);
        }
      })
      .catch(() => {
        // Leave the status unknown and let the normal pay path deal with it.
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingPaymentIntent(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, stripe, clientSecret, dispatch]);

  if (!extraPaymentTx) {
    return null;
  }

  const { protectedData, payinTotal, lastTransition, processVersion } = tx.attributes || {};
  const { extraPaymentReason, parentTxId } = protectedData || {};

  const savedPaymentMethodId =
    currentUser?.stripeCustomer?.defaultPaymentMethod?.attributes?.stripePaymentMethodId;
  const { firstName, lastName } = currentUser?.attributes?.profile || {};
  const defaultBillingName = `${firstName || ''} ${lastName || ''}`.trim();
  const billingName = idealName ?? defaultBillingName;

  // Once an intent exists the method is fixed: a card intent cannot be confirmed
  // as a push payment, or the other way round.
  const hasPaymentIntent = !!paymentIntents;
  const lockedPaymentMethodType = protectedData?.paymentMethodType || PAYMENT_METHOD_TYPE_CARD;
  // Derived during render rather than synced in an effect, so the very first
  // render after opening is already correct and no card element gets mounted
  // just to be torn down again.
  const paymentMethodType = hasPaymentIntent ? lockedPaymentMethodType : paymentMethodChoice;
  const isIdeal = paymentMethodType === PAYMENT_METHOD_TYPE_IDEAL;

  // iDEAL has to be able to send the customer back to this job page afterwards,
  // and the process version has to be one that knows the push transitions.
  const supportsPushPayment =
    !!parentTxId && (processVersion == null || processVersion >= PUSH_PAYMENT_MIN_PROCESS_VERSION);

  const returnUrl =
    typeof window !== 'undefined' && parentTxId
      ? `${window.location.origin}/order/${parentTxId}?extraPayment=${tx.id?.uuid}`
      : null;

  // The money is with Stripe already and the transaction just hasn't caught up.
  // Offering Pay here would charge nothing and say nothing; offering Decline
  // would send a captured payment to a terminal state.
  const isAwaitingConfirmation = SETTLED_PI_STATUSES.includes(paymentIntentStatus);

  // transition/decline is only legal from :state/payment-requested. Once either
  // kind of payment intent exists the transaction has moved to
  // pending-confirmation, where the process offers no way to decline - so the
  // button is not shown there rather than failing when pressed.
  const declineTransition =
    lastTransition === transitions.REQUEST_EXTRA_PAYMENT ? transitions.DECLINE : null;

  /**
   * Creates the payment intent if it isn't there yet, confirms it with Stripe,
   * and completes the transaction.
   *
   * For iDEAL the last part doesn't happen here: confirming sends the browser to
   * the customer's bank and the webhook takes it from there.
   *
   * @param {Object} [cardData] - { stripe, card, paymentParams } from the card
   * form. Omitted when paying with the saved card or with iDEAL.
   */
  const handlePay = async cardData => {
    try {
      setPayError(null);
      setPayInProgress(true);

      let currentTx = tx;
      let intents = currentTx.attributes?.protectedData?.stripePaymentIntents;

      if (!intents) {
        const initiateTransition = isIdeal
          ? transitions.INITIATE_PUSH_PAYMENT
          : transitions.INITIATE_PAYMENT;

        // Both initiate transitions are privileged: the Stripe fee line item is
        // worked out on the server from the method chosen here, and for iDEAL
        // the mandatory paymentMethodTypes param is added there too. Only the
        // choice itself travels, in orderData.
        const response = await dispatch(
          makeTransition(currentTx.id, initiateTransition, {
            orderData: { paymentMethodType },
          })
        ).unwrap();
        currentTx = denormalisedResponseEntities(response)[0];
        setTxOverride(currentTx);
        intents = currentTx?.attributes?.protectedData?.stripePaymentIntents;
      }

      if (!intents) {
        throw new Error(
          `Missing stripePaymentIntents in the transaction's protectedData. Check that the extra-payment process creates a payment intent.`
        );
      }

      const { stripePaymentIntentClientSecret } = intents.default;

      if (isIdeal) {
        // Hands the window over to the customer's bank. On success this never
        // returns - the page is gone before the promise settles.
        await dispatch(
          confirmCardPayment({
            stripePaymentIntentClientSecret,
            orderId: currentTx.id,
            stripe,
            mode: PAYMENT_METHOD_TYPE_IDEAL,
            paymentParams: {
              payment_method: {
                billing_details: { name: billingName, email: currentUser?.attributes?.email },
                ideal: {},
              },
              return_url: returnUrl,
            },
          })
        );
        // Still here, so the intent had already been confirmed. The webhook owns
        // it from this point; say so rather than closing on a silent no-op.
        setPaymentIntentStatus('processing');
        return;
      }

      const paymentResponse = await dispatch(
        confirmCardPayment({
          stripePaymentIntentClientSecret,
          orderId: currentTx.id,
          // A card typed into the form comes with its own stripe instance
          ...(cardData?.card
            ? cardData
            : { stripe, paymentParams: { payment_method: savedPaymentMethodId } }),
        })
      );

      const status = paymentResponse?.paymentIntent?.status;
      if (status === 'requires_capture' || status === 'succeeded') {
        await dispatch(makeTransition(currentTx.id, transitions.CONFIRM_PAYMENT, {}));
        onPaid?.();
        onCloseModal();
      } else {
        setPayError(intl.formatMessage({ id: 'ExtraPaymentModal.paymentFailed' }));
      }
    } catch (e) {
      setPayError(intl.formatMessage({ id: 'ExtraPaymentModal.paymentFailed' }));
      // The transaction may well have moved on even though the payment didn't
      // finish, so let the page refetch. Without this the next attempt is made
      // against a stale state and fails for a second, confusing reason.
      onPaid?.();
    } finally {
      setPayInProgress(false);
    }
  };

  // Card typed into the form: build the billing details Stripe wants
  const handleCardFormSubmit = values => {
    const { addressLine1, addressLine2, postal, state, city, country, name } =
      values.formValues || {};

    const addressMaybe =
      addressLine1 && postal
        ? {
            address: {
              city,
              country,
              line1: addressLine1,
              line2: addressLine2,
              postal_code: postal,
              state,
            },
          }
        : {};

    handlePay({
      stripe: values.stripe,
      card: values.card,
      paymentParams: {
        payment_method: {
          billing_details: {
            name,
            email: currentUser?.attributes?.email,
            ...addressMaybe,
          },
        },
      },
    });
  };

  const handleDecline = async () => {
    try {
      setPayInProgress(true);
      await dispatch(makeTransition(extraPaymentTx.id, declineTransition, {}));
      onPaid?.();
      onCloseModal();
    } catch (e) {
      setPayError(intl.formatMessage({ id: 'ExtraPaymentModal.declineFailed' }));
    } finally {
      setPayInProgress(false);
    }
  };

  const formattedAmount = payinTotal ? formatMoney(intl, payinTotal) : null;
  const isPayable = [
    transitions.REQUEST_EXTRA_PAYMENT,
    transitions.INITIATE_PAYMENT,
    transitions.INITIATE_PUSH_PAYMENT,
  ].includes(lastTransition);
  // Coming back from an iDEAL redirect can land on a request the webhook has
  // already confirmed. That is a success, not a request that closed without
  // being paid, and it needs saying - the customer has just been sent back here
  // from their bank and has no other confirmation that it worked.
  const isAlreadyPaid = isPaid(lastTransition);

  const classes = classNames(rootClassName || css.root, className);

  const declineButton = declineTransition ? (
    <SecondaryButton onClick={handleDecline} disabled={payInProgress}>
      <FormattedMessage id="ExtraPaymentModal.declineButton" />
    </SecondaryButton>
  ) : null;

  // Plain elements rather than the FieldSelect/FieldTextInput components: those
  // are react-final-form fields and there is no Form around this part of the
  // modal - the card form below is its own.
  const paymentMethodSelector =
    supportsPushPayment && !isAwaitingConfirmation ? (
      <div className={css.paymentMethodType}>
        <label className={css.detailLabel} htmlFor={`${id}-paymentMethodType`}>
          <FormattedMessage id="StripePaymentForm.paymentMethodTypeHeading" />
        </label>
        <select
          id={`${id}-paymentMethodType`}
          value={paymentMethodType}
          disabled={hasPaymentIntent || payInProgress}
          onChange={e => setPaymentMethodChoice(e.currentTarget.value)}
        >
          <option value={PAYMENT_METHOD_TYPE_CARD}>
            {intl.formatMessage({ id: 'StripePaymentForm.paymentMethodTypeCard' })}
          </option>
          <option value={PAYMENT_METHOD_TYPE_IDEAL}>
            {intl.formatMessage({ id: 'StripePaymentForm.paymentMethodTypeIdeal' })}
          </option>
        </select>
      </div>
    ) : null;

  const paymentBody = isAwaitingConfirmation ? (
    // Money taken, transaction not caught up. No actions - both of them would
    // do damage here.
    <p className={css.awaitingConfirmation}>
      <FormattedMessage id="ExtraPaymentModal.awaitingConfirmation" />
    </p>
  ) : isIdeal ? (
    <>
      <p className={css.idealInfo}>
        <FormattedMessage id="StripePaymentForm.idealInfo" />
      </p>
      <div className={css.idealName}>
        <label className={css.detailLabel} htmlFor={`${id}-idealName`}>
          <FormattedMessage id="StripePaymentForm.billingDetailsNameLabel" />
        </label>
        <input
          id={`${id}-idealName`}
          type="text"
          autoComplete="name"
          placeholder={intl.formatMessage({
            id: 'StripePaymentForm.billingDetailsNamePlaceholder',
          })}
          value={billingName}
          onChange={e => setIdealName(e.currentTarget.value)}
        />
      </div>
      <div className={css.actions}>
        <PrimaryButton
          onClick={() => handlePay()}
          inProgress={payInProgress}
          disabled={payInProgress || !stripe || !billingName || !returnUrl}
        >
          <FormattedMessage id="ExtraPaymentModal.payButton" values={{ amount: formattedAmount }} />
        </PrimaryButton>
        {declineButton}
      </div>
    </>
  ) : savedPaymentMethodId ? (
    <div className={css.actions}>
      <PrimaryButton
        onClick={() => handlePay()}
        inProgress={payInProgress}
        disabled={payInProgress || !stripe}
      >
        <FormattedMessage id="ExtraPaymentModal.payButton" values={{ amount: formattedAmount }} />
      </PrimaryButton>
      {declineButton}
    </div>
  ) : (
    <>
      <EnhancedPaymentMethodsForm
        className={css.paymentForm}
        formId="ExtraPaymentMethodsForm"
        initialValues={{ name: defaultBillingName }}
        onSubmit={handleCardFormSubmit}
        hasDefaultPaymentMethod={false}
        handleRemovePaymentMethod={() => {}}
        inProgress={payInProgress}
        submitText={intl.formatMessage(
          { id: 'ExtraPaymentModal.payButton' },
          { amount: formattedAmount }
        )}
      />
      <div className={css.actions}>{declineButton}</div>
    </>
  );

  return (
    <Modal
      id={id}
      containerClassName={classes}
      contentClassName={css.modalContent}
      isOpen={isOpen}
      onClose={onCloseModal}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
    >
      <p className={css.modalTitle}>
        <FormattedMessage id="ExtraPaymentModal.title" />
      </p>
      <p className={css.modalMessage}>
        <FormattedMessage id="ExtraPaymentModal.description" />
      </p>

      <div className={css.details}>
        <div className={css.detailRow}>
          <span className={css.detailLabel}>
            <FormattedMessage id="ExtraPaymentModal.amountLabel" />
          </span>
          <span className={css.detailValue}>{formattedAmount}</span>
        </div>
        <div className={css.detailReason}>
          <span className={css.detailLabel}>
            <FormattedMessage id="ExtraPaymentModal.reasonLabel" />
          </span>
          <p className={css.reasonText}>{extraPaymentReason}</p>
        </div>
      </div>

      {payError ? <p className={css.error}>{payError}</p> : null}

      {isLoadingCard || isCheckingPaymentIntent ? (
        <div className={css.loading}>
          <IconSpinner />
        </div>
      ) : isAlreadyPaid ? (
        <p className={css.paidConfirmation}>
          <FormattedMessage
            id="ExtraPaymentModal.paidConfirmation"
            values={{ amount: formattedAmount }}
          />
        </p>
      ) : !isPayable ? (
        <p className={css.error}>
          <FormattedMessage id="ExtraPaymentModal.notPayable" />
        </p>
      ) : (
        <>
          {paymentMethodSelector}
          {paymentBody}
        </>
      )}
    </Modal>
  );
};

export default ExtraPaymentModal;
