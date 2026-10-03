const express = require('express');
const supabase = require('../lib/supabase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: episode, error: epErr } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', id)
      .single();

    if (epErr || !episode) return res.status(404).json({ error: 'Episode not found' });

    // All episodes are unlocked and accessible
    const hasAccess = true;

    if (!hasAccess && !req.user.is_admin) {
      return res.status(403).json({ error: 'Episode locked.' });
    }

    res.json({ episode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/unlock', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: episode, error: epErr } = await supabase
      .from('episodes')
      .select('id, token_cost')
      .eq('id', id)
      .single();

    if (epErr || !episode) return res.status(404).json({ error: 'Episode not found' });

    const { data: existingAccess } = await supabase
      .from('episode_access')
      .select('*')
      .eq('user_id', userId)
      .eq('episode_id', id)
      .single();

    if (existingAccess) {
      return res.json({ message: 'Episode already unlocked' });
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('token_balance')
      .eq('id', userId)
      .single();

    if (userErr || !user) return res.status(404).json({ error: 'User not found' });

    const cost = episode.token_cost || 3;
    if (user.token_balance < cost) {
      return res.status(400).json({ error: `Insufficient tokens. Costs ${cost} tokens, balance is ${user.token_balance}` });
    }

    const newBalance = user.token_balance - cost;
    const { error: updateErr } = await supabase
      .from('users')
      .update({ token_balance: newBalance })
      .eq('id', userId);

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    await supabase.from('episode_access').insert([{ user_id: userId, episode_id: id }]);

    await supabase.from('token_transactions').insert([
      {
        user_id: userId,
        amount: -cost,
        reason: 'episode_unlock',
        episode_id: id,
      },
    ]);

    res.json({ message: 'Episode unlocked successfully', token_balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
