const express = require('express');
const stripeWebhooks = require('./stripe-webhooks');

const stripeRouter = express.Router();

stripeRouter.post('/webhooks', express.raw({ type: 'application/json' }), stripeWebhooks);

module.exports = stripeRouter;
