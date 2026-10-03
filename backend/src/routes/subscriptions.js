const express = require('express');
const supabase = require('../lib/supabase');
const stripe = require('../lib/stripe');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/status', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_expires_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({
      subscription_status: user.subscription_status,
      subscription_expires_at: user.subscription_expires_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create', verifyToken, async (req, res) => {
  try {
    const { plan } = req.body; // 'monthly' | 'yearly'
    const prices = {
      monthly: { amount: 499, title: 'ShowDrama Monthly Unlimited Pass' },
      yearly: { amount: 3999, title: 'ShowDrama Yearly Unlimited Pass' },
    };

    const selectedPlan = prices[plan];
    if (!selectedPlan) return res.status(400).json({ error: 'Invalid subscription plan' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: selectedPlan.title },
            unit_amount: selectedPlan.amount,
            recurring: { interval: plan === 'yearly' ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      metadata: {
        user_id: req.user.id,
        type: 'subscription',
        plan,
      },
      success_url: process.env.STRIPE_SUCCESS_URL || 'https://example.com/success',
      cancel_url: process.env.STRIPE_CANCEL_URL || 'https://example.com/cancel',
    });

    res.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (sub && sub.stripe_subscription_id) {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    res.json({ message: 'Subscription will cancel at period end' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
