import { randomUUID } from 'crypto';
import EmailTemplate from '../models/EmailTemplate.js';
import MailJob from '../models/MailJob.js';
import Event from '../models/Event.js';

function renderTemplate(template, payload) { if (!template) return { subject: '', body: '' }; return { subject: (template.subject || '').replace(/{{(\w+)}}/g, (_, k) => payload?.[k] ?? ''), body: (template.body || '').replace(/{{(\w+)}}/g, (_, k) => payload?.[k] ?? '') }; }
const loadTemplate = (key) => EmailTemplate.findOne({ key }).lean();

async function ensureDefaultTemplates() {
  await EmailTemplate.findOneAndUpdate({ key: 'winner_notice' }, { $setOnInsert: { _id: randomUUID(), key: 'winner_notice', subject: 'You won a prize at {{eventName}}!', body: 'Hi {{winnerName}},\n\nCongratulations - you have been selected as a winner at {{eventName}}.\n\nDetails will follow shortly.\n\n- Raffle Team', requiredPlaceholders: ['winnerName', 'eventName'] } }, { upsert: true });
  await EmailTemplate.findOneAndUpdate({ key: 'operator_alert' }, { $setOnInsert: { _id: randomUUID(), key: 'operator_alert', subject: '[Raffle] {{summary}}', body: 'Activity in {{eventName}}: {{summary}}.', requiredPlaceholders: ['summary'] } }, { upsert: true });
}

export async function enqueueMail({ toEmail, toName = null, templateKey, payload = {}, contextType = null, contextId = null }) {
  if (!toEmail || !templateKey) return null;
  const job = await MailJob.create({ _id: randomUUID(), toEmail, toName, templateKey, payload, contextType, contextId, status: 'PENDING', attempts: 0 });
  await sendQueuedMailJob(job.toObject());
  return job.toObject();
}

export async function enqueueWinnerEmail({ winner, entry }) {
  if (!entry?.email) return null;
  const event = await Event.findById(winner.eventId).lean();
  return enqueueMail({ toEmail: entry.email, toName: entry.fullName, templateKey: 'winner_notice', payload: { winnerName: entry.fullName, eventName: event?.name || '', entryCode: entry.entryCode }, contextType: 'WINNER', contextId: winner.id || winner._id });
}

async function actualSend({ to, subject }) { console.info(`[mail] Email sent (simulated) to ${to}: ${subject}`); return true; }

async function sendQueuedMailJob(job) {
  await ensureDefaultTemplates();
  try {
    const template = await loadTemplate(job.templateKey); if (!template) throw new Error(`Template not found: ${job.templateKey}`);
    const rendered = renderTemplate(template, job.payload || {}); await actualSend({ to: job.toEmail, subject: rendered.subject, body: rendered.body });
    await MailJob.updateOne({ _id: job._id || job.id }, { $set: { status: 'SENT', sentAt: new Date() } });
  } catch (e) {
    await MailJob.updateOne({ _id: job._id || job.id }, { $set: { attempts: (job.attempts || 0) + 1, status: 'FAILED', lastError: e.message } });
  }
}

export async function testEmailSimulation() { return { ok: true, message: 'Email sent (simulated).' }; }
