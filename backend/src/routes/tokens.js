const express = require('express');
const supabase = require('../lib/supabase');
const stripe = require('../lib/stripe');
const { connection: redis } = require('../lib/redis');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/balance', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('token_balance')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ token_balance: user.token_balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/earn-from-ad', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const redisKey = `ad_reward:${userId}:${today}`;

    const currentCount = await redis.incr(redisKey);
    if (currentCount === 1) {
      await redis.expire(redisKey, 86400); // 24 hours
    }

    if (currentCount > 5) {
      return res.status(429).json({ error: 'Daily ad reward limit reached (max 5/day)' });
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('token_balance')
      .eq('id', userId)
      .single();

    if (userErr || !user) return res.status(404).json({ error: 'User not found' });

    const newBalance = user.token_balance + 2;
    await supabase.from('users').update({ token_balance: newBalance }).eq('id', userId);

    await supabase.from('token_transactions').insert([
      {
        user_id: userId,
        amount: 2,
        reason: 'ad_watch',
      },
    ]);

    res.json({ message: 'Rewarded 2 tokens', token_balance: newBalance, remaining_ads_today: 5 - currentCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/purchase', verifyToken, async (req, res) => {
  try {
    const { pack } = req.body; // '10_tokens', '50_tokens', '100_tokens'
    const packs = {
      '10_tokens': { amount: 99, tokens: 10, title: '10 Token Pack' },
      '50_tokens': { amount: 399, tokens: 50, title: '50 Token Pack' },
      '100_tokens': { amount: 699, tokens: 100, title: '100 Token Pack' },
    };

    const selectedPack = packs[pack];
    if (!selectedPack) return res.status(400).json({ error: 'Invalid token pack' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: selectedPack.title },
            unit_amount: selectedPack.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        user_id: req.user.id,
        type: 'token_pack',
        tokens: selectedPack.tokens.toString(),
      },
      success_url: process.env.STRIPE_SUCCESS_URL || 'https://example.com/success',
      cancel_url: process.env.STRIPE_CANCEL_URL || 'https://example.com/cancel',
    });

    res.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
