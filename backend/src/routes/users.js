const express = require('express');
const supabase = require('../lib/supabase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/me', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, avatar_url, subscription_status, subscription_expires_at, token_balance, is_admin, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/me', verifyToken, async (req, res) => {
  try {
    const { username, avatar_url } = req.body;
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, email, username, avatar_url, subscription_status, subscription_expires_at, token_balance, is_admin')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
