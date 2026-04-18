import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';

import { env } from './env';

const redisUrl = new URL(env.REDIS_URL);
const redisDatabase = redisUrl.pathname ? Number(redisUrl.pathname.slice(1) || '0') : 0;

export const queueConnection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || '6379'),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: Number.isNaN(redisDatabase) ? 0 : redisDatabase,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
};

export const queueDefaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 60_000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

export const jobQueueNames = {
  overdueMarker: 'overdue-marker',
  fineCalculation: 'fine-calculation',
  holdExpiry: 'hold-expiry',
  dueReminder: 'due-reminder',
  overdueReminder: 'overdue-reminder',
  holdReminder: 'hold-reminder',
  emailSender: 'email-sender',
} as const;

type JobQueueKey = keyof typeof jobQueueNames;

const queueCache: Partial<Record<JobQueueKey, Queue>> = {};

function createQueue(queueKey: JobQueueKey): Queue {
  return new Queue(jobQueueNames[queueKey], {
    connection: queueConnection,
    defaultJobOptions: queueDefaultJobOptions,
  });
}

export function getJobQueue(queueKey: JobQueueKey): Queue {
  const existingQueue = queueCache[queueKey];

  if (existingQueue) {
    return existingQueue;
  }

  const queue = createQueue(queueKey);
  queueCache[queueKey] = queue;

  return queue;
}

export const jobQueues = {
  get overdueMarker() {
    return getJobQueue('overdueMarker');
  },
  get fineCalculation() {
    return getJobQueue('fineCalculation');
  },
  get holdExpiry() {
    return getJobQueue('holdExpiry');
  },
  get dueReminder() {
    return getJobQueue('dueReminder');
  },
  get overdueReminder() {
    return getJobQueue('overdueReminder');
  },
  get holdReminder() {
    return getJobQueue('holdReminder');
  },
  get emailSender() {
    return getJobQueue('emailSender');
  },
};

export async function closeJobQueues(): Promise<void> {
  await Promise.all(
    Object.values(queueCache).map(async (queue) => queue?.close()),
  );
}
