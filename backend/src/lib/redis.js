const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const pipelineQueue = new Queue('pipeline', { connection });

// BullMQ Worker to forward queued job to Python Pipeline Service HTTP endpoint
const pipelineWorker = new Worker(
  'pipeline',
  async (job) => {
    const pipelineServiceUrl = process.env.PIPELINE_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${pipelineServiceUrl}/jobs/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.data),
      });

      if (!response.ok) {
        throw new Error(`Pipeline service responded with HTTP status ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`Pipeline job ${job.id} failed dispatching to service:`, err.message);
      throw err;
    }
  },
  { connection }
);

pipelineWorker.on('failed', (job, err) => {
  console.error(`Pipeline queue worker job ${job?.id} failed:`, err);
});

module.exports = { connection, pipelineQueue };
