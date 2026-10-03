const express = require('express');
const stripe = require('../lib/stripe');
const supabase = require('../lib/supabase');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { user_id, type, tokens, plan } = session.metadata || {};

    if (user_id) {
      if (type === 'token_pack' && tokens) {
        const tokenAmount = parseInt(tokens);
        const { data: user } = await supabase.from('users').select('token_balance').eq('id', user_id).single();
        if (user) {
          const newBalance = user.token_balance + tokenAmount;
          await supabase.from('users').update({ token_balance: newBalance }).eq('id', user_id);
          await supabase.from('token_transactions').insert([
            {
              user_id,
              amount: tokenAmount,
              reason: 'token_purchase',
            },
          ]);
        }
      } else if (type === 'subscription' && plan) {
        const expiresAt = new Date();
        if (plan === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        await supabase.from('users').update({
          subscription_status: plan,
          subscription_expires_at: expiresAt.toISOString(),
        }).eq('id', user_id);

        await supabase.from('subscriptions').insert([
          {
            user_id,
            plan,
            stripe_subscription_id: session.subscription,
            status: 'active',
            expires_at: expiresAt.toISOString(),
          },
        ]);
      }
    }
  }

  res.json({ received: true });
});

router.post('/revenuecat', express.json(), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const expectedHeader = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;
    if (expectedHeader && authHeader !== expectedHeader) {
      return res.status(401).json({ error: 'Unauthorized webhook request' });
    }

    const { event } = req.body;
    if (event) {
      const { type, app_user_id, product_id } = event;
      if (app_user_id) {
        if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
          const plan = product_id.includes('yearly') ? 'yearly' : 'monthly';
          const expiresAt = new Date();
          if (plan === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          else expiresAt.setMonth(expiresAt.getMonth() + 1);

          await supabase.from('users').update({
            subscription_status: plan,
            subscription_expires_at: expiresAt.toISOString(),
          }).eq('id', app_user_id);
        } else if (type === 'CANCELLATION' || type === 'EXPIRATION') {
          await supabase.from('users').update({
            subscription_status: 'free',
            subscription_expires_at: null,
          }).eq('id', app_user_id);
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
