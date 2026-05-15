import prisma from '../prisma.js';

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
      body: 'Hi {{winnerName}},\n\nCongratulations - you have been selected as a winner at {{eventName}}.\n\nDetails will follow shortly.\n\n- Raffle Team',
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
  const job = await prisma.mailJob.create({
    data: { toEmail, toName, templateKey, payload, contextType, contextId }
  });
  await sendQueuedMailJob(job);
  return job;
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
  console.info(`[mail] Email sent (simulated) to ${to}: ${subject}`);
  void body;
  return true;
}

async function sendQueuedMailJob(job) {
  await ensureDefaultTemplates();
  try {
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
        status: 'FAILED',
        lastError: e.message
      }
    });
  }
}

export async function testEmailSimulation() {
  return { ok: true, message: 'Email sent (simulated).' };
}
