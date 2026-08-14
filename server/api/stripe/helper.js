const { getIntegrationSdk } = require('../../api-util/sdk');
const { awardJobForTransaction } = require('../../api-util/negotiation');

const paymentMethodsAvailable = ['ideal'];

const confirmPaymentTransition = async data => {
  try {
    const iSdk = getIntegrationSdk();
    const { metadata, payment_method_types } = data;

    if (!paymentMethodsAvailable.includes(payment_method_types[0])) {
      console.log('Payment method not supported', payment_method_types[0]);
      return;
    }

    const txRes = await iSdk.transactions.show({
      id: metadata['sharetribe-transaction-id'],
    });

    const transactionId = txRes.data.data.id.uuid;

    await iSdk.transactions.transition({
      id: transactionId,
      transition: 'transition/confirm-push-payment',
      params: {},
    });

    // The job is awarded now: close it so it stops taking new offers, and
    // reject the offers still on the table. For card payments the client does
    // this after confirming; a push payment is confirmed here instead, so it
    // has to happen here too. Deliberately not allowed to fail the webhook -
    // the payment went through either way, and the offer-availability check
    // covers a job that stays open.
    try {
      await awardJobForTransaction(iSdk, transactionId);
    } catch (error) {
      console.log('Failed to award job after push payment', error);
    }
  } catch (error) {
    console.log('Failed to update confirm payment transition', error);
  }
};

module.exports = {
  confirmPaymentTransition,
};
