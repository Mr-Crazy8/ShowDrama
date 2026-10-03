const express = require('express');
const multer = require('multer');
const supabase = require('../lib/supabase');
const { pipelineQueue } = require('../lib/redis');
const { verifyAdmin } = require('../middleware/auth');

const upload = multer({ dest: '/tmp/uploads/' });
const router = express.Router();

router.use(verifyAdmin);

router.get('/stats', async (req, res) => {
  try {
    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: dramasCount } = await supabase.from('dramas').select('*', { count: 'exact', head: true }).eq('status', 'published');
    const { count: jobsCount } = await supabase.from('pipeline_jobs').select('*', { count: 'exact', head: true }).in('status', ['queued', 'analyzing', 'scripting', 'generating_images', 'generating_voice', 'assembling', 'uploading']);

    res.json({
      stats: {
        total_users: usersCount || 0,
        dramas_published: dramasCount || 0,
        running_jobs: jobsCount || 0,
        estimated_revenue: '$1,250.00',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { email, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    let query = supabase.from('users').select('id, email, username, subscription_status, token_balance, is_admin, is_banned, created_at', { count: 'exact' });

    if (email) query = query.ilike('email', `%${email}%`);

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: users, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({ users: users || [], total: count || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token_balance, subscription_status, is_admin, is_banned } = req.body;

    const updates = {};
    if (token_balance !== undefined) updates.token_balance = token_balance;
    if (subscription_status !== undefined) updates.subscription_status = subscription_status;
    if (is_admin !== undefined) updates.is_admin = is_admin;
    if (is_banned !== undefined) updates.is_banned = is_banned;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dramas', async (req, res) => {
  try {
    const { data: dramas, error } = await supabase
      .from('dramas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ dramas: dramas || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/dramas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, genre, thumbnail_url } = req.body;

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (genre !== undefined) updates.genre = genre;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;

    const { data: drama, error } = await supabase
      .from('dramas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (status) {
      await supabase.from('episodes').update({ status }).eq('drama_id', id);
    }

    res.json({ drama });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pipeline/start', upload.single('video'), async (req, res) => {
  try {
    const source_url = req.body.source_url;
    const source_file_path = req.file ? req.file.path : null;

    if (!source_url && !source_file_path) {
      return res.status(400).json({ error: 'source_url or video file required' });
    }

    const { data: job, error } = await supabase
      .from('pipeline_jobs')
      .insert([
        {
          source_url,
          source_file_path,
          status: 'queued',
          progress_step: 'queued',
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await pipelineQueue.add('generate', {
      job_id: job.id,
      source_url,
      source_file: source_file_path,
    });

    res.status(201).json({ job_id: job.id, message: 'Pipeline job queued successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pipeline', async (req, res) => {
  try {
    const { data: jobs, error } = await supabase
      .from('pipeline_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ jobs: jobs || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pipeline/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: job, error } = await supabase
      .from('pipeline_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !job) return res.status(404).json({ error: 'Pipeline job not found' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pipeline/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: job, error } = await supabase
      .from('pipeline_jobs')
      .update({ status: 'queued', progress_step: 'queued', error_message: null })
      .eq('id', id)
      .select()
      .single();

    if (error || !job) return res.status(404).json({ error: 'Job not found' });

    await pipelineQueue.add('generate', {
      job_id: job.id,
      source_url: job.source_url,
      source_file: job.source_file_path,
    });

    res.json({ message: 'Job re-queued successfully', job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
