const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

router.post('/pipeline/complete', async (req, res) => {
  try {
    const internalSecret = req.headers['x-internal-secret'];
    const expectedSecret = process.env.PIPELINE_INTERNAL_SECRET || 'shared-secret-between-backend-and-pipeline';

    if (internalSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized internal access' });
    }

    const { job_id, drama_id, r2_url, error_message } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'job_id required' });
    }

    if (error_message) {
      await supabase
        .from('pipeline_jobs')
        .update({
          status: 'failed',
          error_message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job_id);

      return res.json({ message: 'Job failure recorded' });
    }

    await supabase
      .from('pipeline_jobs')
      .update({
        status: 'done',
        progress_step: 'done',
        drama_id: drama_id || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job_id);

    if (drama_id) {
      await supabase
        .from('dramas')
        .update({ status: 'pending' })
        .eq('id', drama_id);
    }

    res.json({ message: 'Pipeline job completion recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
