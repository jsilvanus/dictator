import nodemailer from 'nodemailer';

import { env } from './env';

type MailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let _transport: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransport() {
  if (_transport === undefined) {
    if (!env.SMTP_HOST || !env.SMTP_PORT) {
      _transport = null;
    } else {
      const port = parseInt(env.SMTP_PORT, 10);
      _transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port,
        secure: port === 465,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
      });
    }
  }
  return _transport;
}

export async function sendMail(options: MailOptions): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    return false;
  }

  try {
    await transport.sendMail({
      from: env.SMTP_USER ?? `noreply@${env.SMTP_HOST}`,
      ...options,
    });
    return true;
  } catch {
    return false;
  }
}
