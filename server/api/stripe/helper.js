const { getIntegrationSdk } = require('../../api-util/sdk');
const { awardJobForTransaction } = require('../../api-util/negotiation');

// The push payment methods this marketplace accepts. A card PaymentIntent is
// confirmed by the browser, so it must never be touched from here.
const pushPaymentMethods = ['ideal'];

/**
 * What to do with a succeeded push PaymentIntent, per transaction process.
 *
 * `confirmTransition` is the operator transition that moves the money on in
 * Sharetribe. `awardsJob` says whether winning this payment also settles the
 * job it belongs to - true only for the job itself, never for an extra payment
 * on a job that was already awarded.
 *
 * `from` is the transition the transaction must be sitting on for the confirm
 * to be valid. It is what makes a repeated webhook delivery a no-op instead of
 * an error.
 */
const PUSH_PAYMENT_PROCESSES = {
  'default-negotiation': {
    confirmTransition: 'transition/confirm-push-payment',
    from: ['transition/request-push-payment-to-accept-offer'],
    awardsJob: true,
  },
  'extra-payment': {
    confirmTransition: 'transition/confirm-push-payment',
    from: ['transition/initiate-push-payment'],
    awardsJob: false,
  },
};

/**
 * Confirms a push payment (iDEAL) against the Marketplace API.
 *
 * Push payments are captured at the customer's bank and the browser never comes
 * back through the client to confirm them, so the confirm transition is made
 * here, as the operator, off Stripe's payment_intent.succeeded event.
 *
 * @param {Object} data the Stripe PaymentIntent from the event
 * @returns {Promise<Object>} { handled } - handled is false when the event was
 *   not ours to act on, which the caller treats as success.
 * @throws when the transition should have happened but didn't, so that the
 *   webhook can answer non-2xx and Stripe retries.
 */
const confirmPaymentTransition = async data => {
  const { metadata, payment_method_types: paymentMethodTypes } = data;

  const isPushPayment = (paymentMethodTypes || []).some(t => pushPaymentMethods.includes(t));
  if (!isPushPayment) {
    // A card payment. The browser confirms those itself.
    return { handled: false };
  }

  const transactionId = metadata && metadata['sharetribe-transaction-id'];
  if (!transactionId) {
    // Not a Sharetribe-created intent. Nothing to do, and nothing wrong.
    console.log('Push payment intent has no sharetribe-transaction-id', data.id);
    return { handled: false };
  }

  const iSdk = getIntegrationSdk();
  const txRes = await iSdk.transactions.show({ id: transactionId });
  const tx = txRes.data.data;
  const { processName, lastTransition } = tx.attributes;

  const processConfig = PUSH_PAYMENT_PROCESSES[processName];
  if (!processConfig) {
    // A process that has push transitions we don't know about. Better to be
    // told about it than to guess at a transition name.
    throw new Error(
      `Push payment succeeded for transaction ${transactionId} on unsupported process "${processName}"`
    );
  }

  if (!processConfig.from.includes(lastTransition)) {
    if (lastTransition === processConfig.confirmTransition) {
      // Stripe delivers the same event more than once. Already done.
      return { handled: true, alreadyConfirmed: true };
    }
    // The money is captured but the transaction has moved somewhere it can no
    // longer be confirmed from - declined or expired while the payment was in
    // flight. Both of those refund, so this is not lost money, but it is not
    // normal either and someone should look.
    console.error(
      `Push payment succeeded for transaction ${transactionId} (${processName}), but its last transition is "${lastTransition}" - not confirming.`
    );
    return { handled: false, unexpectedState: true };
  }

  await iSdk.transactions.transition({
    id: tx.id.uuid,
    transition: processConfig.confirmTransition,
    params: {},
  });

  if (processConfig.awardsJob) {
    // The job is awarded now: close it so it stops taking new offers, and
    // reject the offers still on the table.
    //
    // Deliberately not awaited. It is the open-ended part of this handler - a
    // paginated query over the job's transactions plus one transition per
    // losing offer - and Stripe wants a 2xx back promptly. It also cannot fail
    // the payment: by this point the money is confirmed either way, and the
    // offer-availability check covers a job that stays open. Holding the
    // response for it would risk a timeout without buying any safety.
    awardJobForTransaction(iSdk, tx.id.uuid).catch(error => {
      console.error('Failed to award job after push payment', error);
    });
  }

  return { handled: true };
};

module.exports = {
  confirmPaymentTransition,
  PUSH_PAYMENT_PROCESSES,
};
