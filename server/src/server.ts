import http from 'node:http';

import { app } from './app';
import { logger } from './common/middleware/requestLogger';
import { closeDatabaseConnection, connectToDatabase } from './config/database';
import { env } from './config/env';
import { closeJobQueues } from './config/queue';
import { closeRedisConnection, connectToRedis } from './config/redis';
import { registerJobs, type JobRuntime } from './jobs';
import { disconnectRealtime, initializeRealtime } from './realtime/realtime';

const server = http.createServer(app);
initializeRealtime(server);

let shuttingDown = false;
let jobRuntime: JobRuntime | null = null;

async function startServer(): Promise<void> {
  await connectToDatabase();
  await connectToRedis();
  jobRuntime = await registerJobs();

  await new Promise<void>((resolve) => {
    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'HTTP server listening');
      resolve();
    });
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');
  disconnectRealtime();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await jobRuntime?.close();
  await closeJobQueues();
  await closeDatabaseConnection();
  await closeRedisConnection();

  logger.info('Graceful shutdown completed');
}

void startServer().catch((error: unknown) => {
  logger.error({ err: error }, 'Server startup failed');
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal)
      .catch((error: unknown) => {
        logger.error({ err: error, signal }, 'Graceful shutdown failed');
        process.exitCode = 1;
      })
      .finally(() => {
        process.exit();
      });
  });
}
