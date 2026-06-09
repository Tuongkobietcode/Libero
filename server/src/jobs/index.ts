import { Worker, type JobsOptions } from 'bullmq';

import { logger } from '../common/middleware/requestLogger';
import { jobQueueNames, jobQueues, queueConnection } from '../config/queue';
import { processEmailSenderJob } from './emailSender.job';
import { runDueReminderJob } from './dueReminder.job';
import { runFineCalculationJob } from './fineCalculation.job';
import { runHoldExpiryJob } from './holdExpiry.job';
import { runHoldReminderJob } from './holdReminder.job';
import { runOverdueMarkerJob } from './overdueMarker.job';
import { runOverdueReminderJob } from './overdueReminder.job';

const recurringJobs: Array<{
  queue: keyof typeof jobQueues;
  jobName: string;
  options: JobsOptions;
}> = [
  {
    queue: 'overdueMarker',
    jobName: 'run',
    options: {
      jobId: 'cron:overdue-marker',
      repeat: {
        pattern: '0 0 * * *',
        tz: 'Asia/Ho_Chi_Minh',
      },
    },
  },
  {
    queue: 'fineCalculation',
    jobName: 'run',
    options: {
      jobId: 'cron:fine-calculation',
      repeat: {
        pattern: '5 0 * * *',
        tz: 'Asia/Ho_Chi_Minh',
      },
    },
  },
  {
    queue: 'holdExpiry',
    jobName: 'run',
    options: {
      jobId: 'cron:hold-expiry',
      repeat: {
        pattern: '*/30 * * * *',
      },
    },
  },
  {
    queue: 'dueReminder',
    jobName: 'run',
    options: {
      jobId: 'cron:due-reminder',
      repeat: {
        pattern: '0 8 * * *',
        tz: 'Asia/Ho_Chi_Minh',
      },
    },
  },
  {
    queue: 'overdueReminder',
    jobName: 'run',
    options: {
      jobId: 'cron:overdue-reminder',
      repeat: {
        pattern: '30 8 * * *',
        tz: 'Asia/Ho_Chi_Minh',
      },
    },
  },
  {
    queue: 'holdReminder',
    jobName: 'run',
    options: {
      jobId: 'cron:hold-reminder',
      repeat: {
        pattern: '0 * * * *',
      },
    },
  },
];

function bindWorkerLogging(worker: Worker): void {
  worker.on('completed', (job) => {
    logger.info({ queue: worker.name, jobId: job.id, jobName: job.name }, 'Worker job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error(
      { queue: worker.name, jobId: job?.id, jobName: job?.name, err: error },
      'Worker job failed',
    );
  });

  worker.on('error', (error) => {
    logger.error({ queue: worker.name, err: error }, 'Worker emitted error');
  });
}

export interface JobRuntime {
  workers: Worker[];
  close(): Promise<void>;
}

export async function runOverdueFineMaintenance(now: Date = new Date()): Promise<{
  overdueMarker: Awaited<ReturnType<typeof runOverdueMarkerJob>>;
  fineCalculation: Awaited<ReturnType<typeof runFineCalculationJob>>;
  durationMs: number;
}> {
  const startedAt = Date.now();
  const overdueMarker = await runOverdueMarkerJob(now);
  const fineCalculation = await runFineCalculationJob({ now });
  const summary = {
    overdueMarker,
    fineCalculation,
    durationMs: Date.now() - startedAt,
  };

  logger.info(
    { job: 'overdue-fine-maintenance', ...summary },
    'Overdue fine maintenance completed',
  );

  return summary;
}

export async function registerJobs(): Promise<JobRuntime> {
  for (const recurringJob of recurringJobs) {
    await jobQueues[recurringJob.queue].add(recurringJob.jobName, {}, recurringJob.options);
  }

  const workers = [
    new Worker(jobQueueNames.overdueMarker, async () => runOverdueMarkerJob(), {
      connection: queueConnection,
      concurrency: 1,
    }),
    new Worker(jobQueueNames.fineCalculation, async () => runFineCalculationJob(), {
      connection: queueConnection,
      concurrency: 1,
    }),
    new Worker(jobQueueNames.holdExpiry, async () => runHoldExpiryJob(), {
      connection: queueConnection,
      concurrency: 1,
    }),
    new Worker(jobQueueNames.dueReminder, async () => runDueReminderJob(), {
      connection: queueConnection,
      concurrency: 1,
    }),
    new Worker(jobQueueNames.overdueReminder, async () => runOverdueReminderJob(), {
      connection: queueConnection,
      concurrency: 1,
    }),
    new Worker(jobQueueNames.holdReminder, async () => runHoldReminderJob(), {
      connection: queueConnection,
      concurrency: 1,
    }),
    new Worker(jobQueueNames.emailSender, async (job) => processEmailSenderJob(job), {
      connection: queueConnection,
      concurrency: 3,
    }),
  ];

  for (const worker of workers) {
    bindWorkerLogging(worker);
  }

  logger.info(
    {
      queues: recurringJobs.map((job) => ({
        queue: job.queue,
        cron: job.options.repeat?.pattern,
        timezone: job.options.repeat?.tz,
      })),
      workerCount: workers.length,
    },
    'Background jobs registered',
  );

  return {
    workers,
    async close(): Promise<void> {
      await Promise.all(workers.map(async (worker) => worker.close()));
    },
  };
}
