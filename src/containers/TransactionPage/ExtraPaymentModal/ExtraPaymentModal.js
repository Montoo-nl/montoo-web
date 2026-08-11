import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import { formatMoney } from '../../../util/currency';
import { denormalisedResponseEntities } from '../../../util/data';
import { confirmCardPayment } from '../../../ducks/stripe.duck';
import { transitions } from '../../../transactions/transactionProcessExtraPayment';

import { IconSpinner, Modal, PrimaryButton, SecondaryButton } from '../../../components';

import { stripeCustomer } from '../../CheckoutPage/CheckoutPage.duck';
import EnhancedPaymentMethodsForm from '../../PaymentMethodsPage/PaymentMethodsForm/PaymentMethodsForm';

import { makeTransition } from '../TransactionPage.duck';
import css from './ExtraPaymentModal.module.css';

/**
 * The company reviews an extra payment a technician asked for, and pays it.
 *
 * The request is a transaction of its own on the extra-payment process. Paying
 * it takes three steps, the same shape as the main checkout:
 *   1. 'initiate-payment' creates the Stripe payment intent
 *   2. the browser confirms the card with Stripe
 *   3. 'confirm-payment' captures it and pays the technician out
 *
 * Both card cases are handled here: a saved card is charged with one button,
 * and without one the card form is shown in the modal so the payment can be
 * made without leaving the page.
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

  // The saved card lives on the Stripe customer, which isn't part of the
  // currentUser the page already has - it has to be fetched.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setLoadingCard(true);
    Promise.resolve(dispatch(stripeCustomer())).finally(() => setLoadingCard(false));

    const publishableKey = config.stripe.publishableKey;
    if (window.Stripe && publishableKey) {
      setStripe(window.Stripe(publishableKey));
    }
  }, [isOpen, config.stripe.publishableKey, dispatch]);

  if (!extraPaymentTx) {
    return null;
  }

  const { protectedData, payinTotal, lastTransition } = extraPaymentTx.attributes || {};
  const { extraPaymentReason } = protectedData || {};

  const savedPaymentMethodId =
    currentUser?.stripeCustomer?.defaultPaymentMethod?.attributes?.stripePaymentMethodId;
  const { firstName, lastName } = currentUser?.attributes?.profile || {};

  /**
   * Creates the payment intent if it isn't there yet, confirms the card, and
   * completes the transaction.
   *
   * @param {Object} [cardData] - { stripe, card, paymentParams } from the card
   * form. Omitted when paying with the saved card.
   */
  const handlePay = async cardData => {
    try {
      setPayError(null);
      setPayInProgress(true);

      let tx = extraPaymentTx;
      let paymentIntents = tx.attributes?.protectedData?.stripePaymentIntents;

      if (!paymentIntents) {
        const response = await dispatch(
          makeTransition(tx.id, transitions.INITIATE_PAYMENT, {})
        ).unwrap();
        tx = denormalisedResponseEntities(response)[0];
        paymentIntents = tx?.attributes?.protectedData?.stripePaymentIntents;
      }

      if (!paymentIntents) {
        throw new Error(
          `Missing stripePaymentIntents in the transaction's protectedData. Check that the extra-payment process creates a payment intent.`
        );
      }

      const { stripePaymentIntentClientSecret } = paymentIntents.default;

      const paymentResponse = await dispatch(
        confirmCardPayment({
          stripePaymentIntentClientSecret,
          orderId: tx.id,
          // A card typed into the form comes with its own stripe instance
          ...(cardData?.card
            ? cardData
            : { stripe, paymentParams: { payment_method: savedPaymentMethodId } }),
        })
      );

      const status = paymentResponse?.paymentIntent?.status;
      if (status === 'requires_capture' || status === 'succeeded') {
        await dispatch(makeTransition(tx.id, transitions.CONFIRM_PAYMENT, {}));
        onPaid?.();
        onCloseModal();
      } else {
        setPayError(intl.formatMessage({ id: 'ExtraPaymentModal.paymentFailed' }));
      }
    } catch (e) {
      setPayError(intl.formatMessage({ id: 'ExtraPaymentModal.paymentFailed' }));
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
      await dispatch(makeTransition(extraPaymentTx.id, transitions.DECLINE, {}));
      onPaid?.();
      onCloseModal();
    } catch (e) {
      setPayError(intl.formatMessage({ id: 'ExtraPaymentModal.declineFailed' }));
    } finally {
      setPayInProgress(false);
    }
  };

  const formattedAmount = payinTotal ? formatMoney(intl, payinTotal) : null;
  const isPayable = [transitions.REQUEST_EXTRA_PAYMENT, transitions.INITIATE_PAYMENT].includes(
    lastTransition
  );

  const classes = classNames(rootClassName || css.root, className);

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

      {isLoadingCard ? (
        <div className={css.loading}>
          <IconSpinner />
        </div>
      ) : !isPayable ? (
        <p className={css.error}>
          <FormattedMessage id="ExtraPaymentModal.notPayable" />
        </p>
      ) : savedPaymentMethodId ? (
        <div className={css.actions}>
          <PrimaryButton
            onClick={() => handlePay()}
            inProgress={payInProgress}
            disabled={payInProgress || !stripe}
          >
            <FormattedMessage
              id="ExtraPaymentModal.payButton"
              values={{ amount: formattedAmount }}
            />
          </PrimaryButton>
          <SecondaryButton onClick={handleDecline} disabled={payInProgress}>
            <FormattedMessage id="ExtraPaymentModal.declineButton" />
          </SecondaryButton>
        </div>
      ) : (
        <>
          <EnhancedPaymentMethodsForm
            className={css.paymentForm}
            formId="ExtraPaymentMethodsForm"
            initialValues={{ name: `${firstName || ''} ${lastName || ''}`.trim() }}
            onSubmit={handleCardFormSubmit}
            hasDefaultPaymentMethod={false}
            handleRemovePaymentMethod={() => {}}
            inProgress={payInProgress}
            submitText={intl.formatMessage(
              { id: 'ExtraPaymentModal.payButton' },
              { amount: formattedAmount }
            )}
          />
          <div className={css.actions}>
            <SecondaryButton onClick={handleDecline} disabled={payInProgress}>
              <FormattedMessage id="ExtraPaymentModal.declineButton" />
            </SecondaryButton>
          </div>
        </>
      )}
    </Modal>
  );
};

export default ExtraPaymentModal;
