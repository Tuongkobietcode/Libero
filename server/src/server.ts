import http from 'node:http';

import { app } from './app';
import { logger } from './common/middleware/requestLogger';
import { closeDatabaseConnection, connectToDatabase } from './config/database';
import { env } from './config/env';
import { closeJobQueues } from './config/queue';
import { closeRedisConnection, connectToRedis } from './config/redis';
import { registerJobs, runOverdueFineMaintenance, type JobRuntime } from './jobs';
import { disconnectRealtime, initializeRealtime } from './realtime/realtime';

const server = http.createServer(app);
initializeRealtime(server);

let shuttingDown = false;
let jobRuntime: JobRuntime | null = null;

async function listenHttpServer(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };

    const onListening = (): void => {
      server.off('error', onError);
      logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'HTTP server listening');
      resolve();
    };

    server.once('error', onError);
    server.listen(env.PORT, onListening);
  });
}

async function cleanupStartupResources(): Promise<void> {
  disconnectRealtime();

  if (server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await jobRuntime?.close();
  jobRuntime = null;
  await closeJobQueues();
  await closeDatabaseConnection();
  await closeRedisConnection();
}

async function startServer(): Promise<void> {
  try {
    await connectToDatabase();
    await listenHttpServer();

    try {
      await connectToRedis();
      try {
        await runOverdueFineMaintenance();
      } catch (error: unknown) {
        logger.warn(
          { err: error },
          'Initial overdue fine maintenance failed; background jobs will retry when available',
        );
      }
      jobRuntime = await registerJobs();
    } catch (error: unknown) {
      if (env.NODE_ENV === 'production') {
        throw error;
      }

      logger.warn(
        { err: error },
        'Redis unavailable; starting HTTP server without background jobs',
      );
      await closeRedisConnection();
    }
  } catch (error: unknown) {
    await cleanupStartupResources();
    throw error;
  }
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
