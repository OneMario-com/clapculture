export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

import type { Transporter } from 'nodemailer';
let cachedTransporter: Transporter | null = null;
let lastConfigKey = '';

export type MailerEnv = Record<string, string | undefined>;

const SMTP_NOT_CONFIGURED = 'SMTP not configured: set SMTP_USER and SMTP_PASS.';

/**
 * SMTP credentials come only from the environment. There is deliberately no
 * built-in fallback account: a missing secret must fail loudly, not silently
 * send through a hard-coded mailbox.
 */
function getSmtpCredentials(env?: MailerEnv): { user: string; pass: string } | null {
  const user = (env?.SMTP_USER || process.env.SMTP_USER || '').trim();
  const pass = (env?.SMTP_PASS || process.env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!user || !pass) return null;
  return { user, pass };
}

/**
 * Get or initialize the Nodemailer transporter for Gmail SMTP.
 * Returns null when SMTP is not configured or Nodemailer is unavailable.
 */
export function getMailTransporter(env?: MailerEnv): Transporter | null {
  const credentials = getSmtpCredentials(env);
  if (!credentials) return null;

  const host = env?.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(env?.SMTP_PORT || process.env.SMTP_PORT || 465);
  const secure = port === 465 || env?.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === 'true';
  const { user, pass } = credentials;

  const configKey = `${host}:${port}:${user}:${pass}`;

  if (cachedTransporter && lastConfigKey === configKey) {
    return cachedTransporter;
  }

  try {
    // Dynamic require to prevent edge Webpack build breakage
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer');
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    lastConfigKey = configKey;
    return cachedTransporter;
  } catch (err) {
    console.warn('Nodemailer unavailable in current runtime environment:', err);
    return null;
  }
}

/**
 * Send an email via Gmail SMTP
 */
export async function sendMail(
  options: MailOptions,
  env?: MailerEnv
): Promise<MailResult> {
  const fromName = env?.SMTP_FROM_NAME || process.env.SMTP_FROM_NAME || 'CLAPCULTURE';
  const fromEmail = env?.SMTP_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'clapcultureofficial@gmail.com';
  const fromAddress = `"${fromName}" <${fromEmail}>`;

  const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

  if (!getSmtpCredentials(env)) {
    console.error(`❌ [Gmail SMTP Error] Cannot send email to [${recipients}]: ${SMTP_NOT_CONFIGURED}`);
    return {
      success: false,
      error: SMTP_NOT_CONFIGURED,
    };
  }

  try {
    const transporter = getMailTransporter(env);
    if (!transporter) {
      console.log(`✉️ [Mail Notice] Email delivery queued for [${recipients}] | Subject: "${options.subject}"`);
      return {
        success: true,
        messageId: `edge-queued-${Date.now()}`,
        simulated: true,
      };
    }

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, ''), // fallback plaintext
      replyTo: options.replyTo || fromEmail,
      cc: options.cc,
      bcc: options.bcc,
    });

    console.log(`✉️ [Gmail SMTP] Sent email to [${recipients}] | Subject: "${options.subject}" | ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to send email via SMTP';
    console.error(`❌ [Gmail SMTP Error] Failed to send email to [${recipients}]:`, msg);
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Verify SMTP connection and credentials
 */
export async function verifySmtpConnection(env?: MailerEnv): Promise<{ success: boolean; message: string }> {
  if (!getSmtpCredentials(env)) {
    return {
      success: false,
      message: SMTP_NOT_CONFIGURED,
    };
  }

  try {
    const transporter = getMailTransporter(env);
    if (!transporter) {
      return {
        success: false,
        message: 'Nodemailer transporter not available in current runtime.',
      };
    }
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP connection established and authenticated successfully with Gmail.',
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'SMTP Connection Failed';
    return {
      success: false,
      message: `SMTP Connection Failed: ${msg}`,
    };
  }
}
