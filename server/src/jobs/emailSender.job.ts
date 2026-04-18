import fs from 'node:fs';
import path from 'node:path';

import type { Job } from 'bullmq';
import Handlebars from 'handlebars';
import nodemailer, { type Transporter } from 'nodemailer';

import { logger } from '../common/middleware/requestLogger';
import { env } from '../config/env';
import {
  notificationRepository,
  type NotificationRepository,
} from '../modules/notification/notification.repository';
import type { EmailJobPayload } from '../modules/notification/notification.service';

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

const mailTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

function resolveTemplatePath(templateName: string): string {
  const bundledTemplatePath = path.resolve(__dirname, '../modules/notification/templates', `${templateName}.hbs`);

  if (fs.existsSync(bundledTemplatePath)) {
    return bundledTemplatePath;
  }

  return path.resolve(__dirname, '../../src/modules/notification/templates', `${templateName}.hbs`);
}

export function renderEmailTemplate(templateName: string, context: Record<string, unknown>): string {
  const cachedTemplate = templateCache.get(templateName);

  if (cachedTemplate) {
    return cachedTemplate(context);
  }

  const templateSource = fs.readFileSync(resolveTemplatePath(templateName), 'utf8');
  const compiledTemplate = Handlebars.compile(templateSource);
  templateCache.set(templateName, compiledTemplate);

  return compiledTemplate(context);
}

export async function processEmailSenderJob(
  job: Pick<Job<EmailJobPayload>, 'data' | 'attemptsMade' | 'opts' | 'id'>,
  options: {
    repository?: NotificationRepository;
    transporter?: Pick<Transporter, 'sendMail'>;
    now?: Date;
  } = {},
): Promise<{ notificationLogId: string; deliveredAt: Date }> {
  const repository = options.repository ?? notificationRepository;
  const transporter = options.transporter ?? mailTransporter;
  const deliveredAt = options.now ?? new Date();

  try {
    const html = renderEmailTemplate(job.data.template, job.data.context);

    await transporter.sendMail({
      from: env.SMTP_USER,
      to: job.data.to,
      subject: job.data.subject,
      html,
    });

    await repository.markNotificationSent(job.data.notificationLogId, deliveredAt);

    logger.info(
      { job: 'email-sender', jobId: job.id, notificationLogId: job.data.notificationLogId },
      'Email sender job completed',
    );

    return {
      notificationLogId: job.data.notificationLogId,
      deliveredAt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    await repository.markNotificationFailed(job.data.notificationLogId, errorMessage);
    const maxAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : undefined;
    const isFinalAttempt = maxAttempts !== undefined && job.attemptsMade + 1 >= maxAttempts;

    logger.error(
      {
        err: error,
        job: 'email-sender',
        jobId: job.id,
        notificationLogId: job.data.notificationLogId,
        attemptsMade: job.attemptsMade + 1,
        maxAttempts,
        isFinalAttempt,
      },
      'Email sender job failed',
    );

    throw error;
  }
}
