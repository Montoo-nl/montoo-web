const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;

const stripe = require('stripe')(STRIPE_SECRET_KEY);
const { confirmPaymentTransition } = require('./helper');

const stripeWebhooks = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    // The signature is computed over the body exactly as Stripe sent it, so it
    // has to be verified against the unparsed bytes. Which middleware got there
    // first decides where those live: the CSP body parser in server/index.js
    // stashes them on req.rawBody, and when that parser isn't in play (CSP off,
    // or the dev api server) express.raw() below leaves them on req.body.
    const rawBody = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('error', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      try {
        // Awaited on purpose. The customer's money is already captured at this
        // point, so if the confirm transition doesn't happen the payment is in
        // limbo - answering non-2xx makes Stripe redeliver instead of losing it.
        // confirmPaymentTransition is a no-op on a repeat delivery.
        await confirmPaymentTransition(event.data.object);
      } catch (e) {
        console.error('Failed to confirm push payment', e);
        res.status(500).send('Failed to confirm push payment');
        return;
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).send();
};

module.exports = stripeWebhooks;
