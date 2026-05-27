import nodemailer from 'nodemailer';

import { env } from './env';

type MailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function createTransport() {
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    secure: parseInt(env.SMTP_PORT, 10) === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
}

export async function sendMail(options: MailOptions): Promise<boolean> {
  const transport = createTransport();
  if (!transport) {
    return false;
  }

  try {
    await transport.sendMail({
      from: env.SMTP_USER ?? 'noreply@voicedoc',
      ...options,
    });
    return true;
  } catch {
    return false;
  }
}
