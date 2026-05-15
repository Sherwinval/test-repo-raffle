import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { connectDB } from '../src/config/db.js';
import Event from '../src/models/Event.js';
import Participant from '../src/models/Participant.js';
import Entry from '../src/models/Entry.js';
import UploadBatch from '../src/models/UploadBatch.js';
import Winner from '../src/models/Winner.js';
import AuditLog from '../src/models/AuditLog.js';
import BrandAsset from '../src/models/BrandAsset.js';
import EmailTemplate from '../src/models/EmailTemplate.js';
import MailJob from '../src/models/MailJob.js';
import Notification from '../src/models/Notification.js';
import NotificationPreference from '../src/models/NotificationPreference.js';
import SystemSetting from '../src/models/SystemSetting.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const exportsDir = path.resolve(process.cwd(), 'exports');

function readCsv(fileName) {
  const filePath = path.join(exportsDir, fileName);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true });
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
function parseArray(value) {
  if (!value) return [];
  if (value.startsWith('{') && value.endsWith('}')) return value.slice(1, -1).split(',').map((v) => v.replace(/^"|"$/g, '').trim()).filter(Boolean);
  return parseJson(value, []);
}
const toBool = (v) => String(v).toLowerCase() === 'true';
const toNumber = (v, f = 0) => (v === '' || v == null ? f : Number(v));
const toDate = (v) => (v ? new Date(v) : undefined);
const id = (v) => String(v || randomUUID());

async function safeInsertMany(Model, docs, name) {
  if (!docs?.length) return console.log(`${name}: 0`);
  try {
    const res = await Model.insertMany(docs, { ordered: false });
    console.log(`${name}: ${res.length}`);
  } catch (err) {
    const n = err?.insertedDocs?.length || 0;
    console.log(`${name}: ${n} (with duplicates/errors skipped)`);
  }
}

async function main() {
  await connectDB();

  const events = readCsv('Event.csv') || [];
  const categories = readCsv('PrizeCategory.csv') || [];
  const prizes = readCsv('Prize.csv') || [];
  const ruleSets = readCsv('DrawRuleSet.csv') || [];
  const constraints = readCsv('DrawConstraint.csv') || [];
  const weights = readCsv('WeightRule.csv') || [];

  const eventDocs = events.map((e) => {
    const eventId = id(e.id);
    const eventCategories = categories.filter((c) => c.eventId === e.id).map((c) => ({
      _id: id(c.id), name: c.name, tier: c.tier, prizeCount: toNumber(c.prizeCount, 0), displayOrder: toNumber(c.displayOrder, 0),
      createdAt: toDate(c.createdAt), updatedAt: toDate(c.updatedAt),
      prizes: prizes.filter((p) => p.prizeCategoryId === c.id).map((p) => ({ _id: id(p.id), label: p.label, description: p.description, createdAt: toDate(p.createdAt) }))
    }));

    const rs = ruleSets.find((r) => r.eventId === e.id);
    const drawRuleSet = rs ? {
      _id: id(rs.id), crossCategoryExclusion: toBool(rs.crossCategoryExclusion), weightCapMultiplier: toNumber(rs.weightCapMultiplier, 10), excludeInactive: rs.excludeInactive === '' ? true : toBool(rs.excludeInactive),
      constraints: constraints.filter((c) => c.ruleSetId === rs.id).map((c) => ({ _id: id(c.id), attribute: c.attribute, maxPerValue: toNumber(c.maxPerValue, 1), type: c.type, categoryScope: c.categoryScope || null })),
      weightRules: weights.filter((w) => w.ruleSetId === rs.id).map((w) => ({ _id: id(w.id), attribute: w.attribute, operator: w.operator, value: w.value, multiplier: toNumber(w.multiplier, 1) })),
      updatedAt: toDate(rs.updatedAt)
    } : undefined;

    return { _id: eventId, name: e.name, status: e.status || 'Draft', createdAt: toDate(e.createdAt), updatedAt: toDate(e.updatedAt), prizeCategories: eventCategories, drawRuleSet };
  });
  await safeInsertMany(Event, eventDocs, 'events');

  await safeInsertMany(Participant, (readCsv('Participant.csv') || []).map((r) => ({ _id: id(r.id), employeeId: r.employeeId, email: r.email, role: r.role, site: r.site, firstName: r.firstName, lastName: r.lastName, rawData: parseJson(r.rawData, {}), status: r.status || 'ACTIVE', tags: parseArray(r.tags), createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt) })), 'participants');
  await safeInsertMany(Entry, (readCsv('Entry.csv') || []).map((r) => ({ _id: id(r.id), eventId: r.eventId, employeeId: r.employeeId, fullName: r.fullName, department: r.department, email: r.email, entryCode: r.entryCode, uploadBatchId: r.uploadBatchId, participantId: r.participantId, createdAt: toDate(r.createdAt) })), 'entries');
  await safeInsertMany(UploadBatch, (readCsv('UploadBatch.csv') || []).map((r) => ({ _id: id(r.id), eventId: r.eventId, status: r.status, totalRows: toNumber(r.totalRows, 0), insertedRows: toNumber(r.insertedRows, 0), skippedRows: toNumber(r.skippedRows, 0), errors: parseJson(r.errors, []), fileName: r.fileName, lastProcessedRow: toNumber(r.lastProcessedRow, 0), createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt) })), 'uploadBatches');
  await safeInsertMany(Winner, (readCsv('Winner.csv') || []).map((r) => ({ _id: id(r.id), eventId: r.eventId, entryId: r.entryId, participantId: r.participantId, prizeCategoryId: r.prizeCategoryId, prizeId: r.prizeId, operator: r.operator, operatorId: r.operatorId, rngFingerprint: r.rngFingerprint, ruleSnapshot: parseJson(r.ruleSnapshot, {}), status: r.status, voidReason: r.voidReason, createdAt: toDate(r.createdAt), voidedAt: toDate(r.voidedAt) })), 'winners');

  await safeInsertMany(AuditLog, (readCsv('AuditLog.csv') || []).map((r) => ({ _id: id(r.id), eventId: r.eventId, action: r.action, operator: r.operator, userId: r.userId, details: parseJson(r.details, {}), createdAt: toDate(r.createdAt) })), 'auditLogs');
  await safeInsertMany(BrandAsset, (readCsv('BrandAsset.csv') || []).map((r) => ({ _id: id(r.id), ...r })), 'brandAssets');
  await safeInsertMany(EmailTemplate, (readCsv('EmailTemplate.csv') || []).map((r) => ({ _id: id(r.id), ...r })), 'emailTemplates');
  await safeInsertMany(MailJob, (readCsv('MailJob.csv') || []).map((r) => ({ _id: id(r.id), ...r, scheduledAt: toDate(r.scheduledAt) })), 'mailJobs');
  await safeInsertMany(Notification, (readCsv('Notification.csv') || []).map((r) => ({ _id: id(r.id), ...r, readAt: toDate(r.readAt) })), 'notifications');
  await safeInsertMany(NotificationPreference, (readCsv('NotificationPreference.csv') || []).map((r) => ({ _id: id(r.id), ...r })), 'notificationPreferences');
  await safeInsertMany(SystemSetting, (readCsv('SystemSetting.csv') || []).map((r) => ({ _id: id(r.id), key: r.key, value: parseJson(r.value, r.value) })), 'systemSettings');

  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
