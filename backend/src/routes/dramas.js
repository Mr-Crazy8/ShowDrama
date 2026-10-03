const express = require('express');
const supabase = require('../lib/supabase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ dramas: [] });

    const { data: dramas, error } = await supabase
      .from('dramas')
      .select('*')
      .eq('status', 'published')
      .ilike('title', `%${q}%`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ dramas: dramas || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { genre, sort, page = 1, limit = 10 } = req.query;
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    let query = supabase
      .from('dramas')
      .select('*', { count: 'exact' })
      .eq('status', 'published');

    if (genre) query = query.eq('genre', genre);

    if (sort === 'trending') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(from, to);

    const { data: dramas, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({ dramas: dramas || [], total: count || 0, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let userId = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-min-32-chars-long');
        userId = decoded.id;
      } catch (e) {
        // Guest user fallback
      }
    }

    const { data: drama, error: dramaErr } = await supabase
      .from('dramas')
      .select('*')
      .eq('id', id)
      .single();

    if (dramaErr || !drama) return res.status(404).json({ error: 'Drama not found' });

    const { data: episodes, error: epErr } = await supabase
      .from('episodes')
      .select('id, episode_number, title, duration_seconds, token_cost, status, created_at')
      .eq('drama_id', id)
      .eq('status', 'published')
      .order('episode_number', { ascending: true });

    if (epErr) return res.status(500).json({ error: epErr.message });

    let unlockedEpisodeIds = new Set();
    let isSubscriber = false;

    if (userId) {
      const { data: user } = await supabase
        .from('users')
        .select('subscription_status, subscription_expires_at')
        .eq('id', userId)
        .single();

      if (user && (user.subscription_status === 'monthly' || user.subscription_status === 'yearly')) {
        if (!user.subscription_expires_at || new Date(user.subscription_expires_at) > new Date()) {
          isSubscriber = true;
        }
      }

      if (!isSubscriber) {
        const { data: access } = await supabase
          .from('episode_access')
          .select('episode_id')
          .eq('user_id', userId);

        if (access) {
          access.forEach((a) => unlockedEpisodeIds.add(a.episode_id));
        }
      }
    }

    const formattedEpisodes = (episodes || []).map((ep) => ({
      ...ep,
      is_unlocked: true,
    }));

    res.json({ drama, episodes: formattedEpisodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
