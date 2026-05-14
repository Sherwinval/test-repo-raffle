import prisma from '../prisma.js';

const POLL_INTERVAL_MS = 15000;
const MAX_ATTEMPTS = 3;

async function getSettings() {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'system' } });
  return row?.value || {};
}

function renderTemplate(template, payload) {
  if (!template) return { subject: '', body: '' };
  const subject = (template.subject || '').replace(/{{(\w+)}}/g, (_, k) => payload?.[k] ?? '');
  const body = (template.body || '').replace(/{{(\w+)}}/g, (_, k) => payload?.[k] ?? '');
  return { subject, body };
}

async function loadTemplate(key) {
  return prisma.emailTemplate.findUnique({ where: { key } });
}

async function ensureDefaultTemplates() {
  await prisma.emailTemplate.upsert({
    where: { key: 'winner_notice' },
    create: {
      key: 'winner_notice',
      subject: 'You won a prize at {{eventName}}!',
      body: 'Hi {{winnerName}},\n\nCongratulations — you have been selected as a winner at {{eventName}}.\n\nDetails will follow shortly.\n\n— Raffle Team',
      requiredPlaceholders: ['winnerName', 'eventName']
    },
    update: {}
  });
  await prisma.emailTemplate.upsert({
    where: { key: 'operator_alert' },
    create: {
      key: 'operator_alert',
      subject: '[Raffle] {{summary}}',
      body: 'Activity in {{eventName}}: {{summary}}.',
      requiredPlaceholders: ['summary']
    },
    update: {}
  });
}

export async function enqueueMail({ toEmail, toName = null, templateKey, payload = {}, contextType = null, contextId = null }) {
  if (!toEmail || !templateKey) return null;
  return prisma.mailJob.create({
    data: { toEmail, toName, templateKey, payload, contextType, contextId }
  });
}

export async function enqueueWinnerEmail({ winner, entry }) {
  if (!entry?.email) return null;
  const event = await prisma.event.findUnique({ where: { id: winner.eventId } });
  return enqueueMail({
    toEmail: entry.email,
    toName: entry.fullName,
    templateKey: 'winner_notice',
    payload: {
      winnerName: entry.fullName,
      eventName: event?.name || '',
      entryCode: entry.entryCode
    },
    contextType: 'WINNER',
    contextId: winner.id
  });
}

async function actualSend({ to, subject, body }) {
  // Real SMTP would happen here via nodemailer. We don't ship that dependency
  // in this scaffold — log the send and return success.
  console.info(`[mail] would send to ${to}: ${subject}`);
  return true;
}

async function processOnce() {
  await ensureDefaultTemplates();
  const settings = await getSettings();
  const draftMode = !!settings.draftMode;

  const jobs = await prisma.mailJob.findMany({
    where: { status: 'PENDING', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { scheduledAt: 'asc' },
    take: 20
  });

  for (const job of jobs) {
    try {
      if (draftMode) {
        await prisma.mailJob.update({
          where: { id: job.id },
          data: { status: 'SKIPPED', sentAt: new Date(), lastError: 'draft mode' }
        });
        continue;
      }
      const template = await loadTemplate(job.templateKey);
      if (!template) throw new Error(`Template not found: ${job.templateKey}`);
      const rendered = renderTemplate(template, job.payload || {});
      await actualSend({ to: job.toEmail, subject: rendered.subject, body: rendered.body });
      await prisma.mailJob.update({
        where: { id: job.id },
        data: { status: 'SENT', sentAt: new Date() }
      });
    } catch (e) {
      await prisma.mailJob.update({
        where: { id: job.id },
        data: {
          attempts: job.attempts + 1,
          status: job.attempts + 1 >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          lastError: e.message
        }
      });
    }
  }
}

let workerHandle = null;

export function startMailWorker() {
  if (workerHandle) return workerHandle;
  workerHandle = setInterval(() => {
    processOnce().catch((err) => console.warn('mail worker tick failed:', err.message));
  }, POLL_INTERVAL_MS);
  // Run once at startup
  processOnce().catch(() => {});
  return workerHandle;
}

export async function smtpTest() {
  const settings = await getSettings();
  if (settings.draftMode) return { ok: false, draft: true };
  return { ok: true };
}
