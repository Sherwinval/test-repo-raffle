import { randomUUID } from 'crypto';
import Event from './models/Event.js';
import Entry from './models/Entry.js';
import Participant from './models/Participant.js';
import UploadBatch from './models/UploadBatch.js';
import Winner from './models/Winner.js';
import AuditLog from './models/AuditLog.js';
import BrandAsset from './models/BrandAsset.js';
import EmailTemplate from './models/EmailTemplate.js';
import MailJob from './models/MailJob.js';
import Notification from './models/Notification.js';
import NotificationPreference from './models/NotificationPreference.js';
import SystemSetting from './models/SystemSetting.js';

const models = { event: Event, entry: Entry, participant: Participant, uploadBatch: UploadBatch, winner: Winner, auditLog: AuditLog, brandAsset: BrandAsset, emailTemplate: EmailTemplate, mailJob: MailJob, notification: Notification, notificationPreference: NotificationPreference, systemSetting: SystemSetting };

function idDoc(data) { return { _id: data.id || data._id || randomUUID(), ...data, id: undefined }; }
function normalize(doc) { if (!doc) return null; const o = doc.toObject ? doc.toObject() : doc; return { ...o, id: o._id }; }
function whereToQuery(where = {}) { return { ...where, id: undefined }; }

function delegate(model) {
  return {
    async findUnique({ where, include, select }) { const q = model.findOne(whereToQuery(where)); if (select) q.select(Object.keys(select).filter((k) => select[k]).join(' ')); const doc = await q.lean(); return doc ? { ...doc, id: doc._id } : null; },
    async findFirst({ where }) { const doc = await model.findOne(whereToQuery(where)).lean(); return doc ? { ...doc, id: doc._id } : null; },
    async findMany({ where, orderBy, take, skip, select }) { let q = model.find(whereToQuery(where || {})); if (orderBy) { const sort = {}; const arr = Array.isArray(orderBy) ? orderBy : [orderBy]; for (const s of arr) { const [k,v]=Object.entries(s)[0]; sort[k==='id'?'_id':k]=v==='desc'?-1:1; } q=q.sort(sort);} if (typeof skip==='number') q=q.skip(skip); if (typeof take==='number') q=q.limit(take); if (select) q=q.select(Object.keys(select).filter((k)=>select[k]).map((k)=>k==='id'?'_id':k).join(' ')); const docs=await q.lean(); return docs.map((d)=>({ ...d, id:d._id })); },
    async count({ where } = {}) { return model.countDocuments(whereToQuery(where || {})); },
    async create({ data }) { const created = await model.create(idDoc(data)); return normalize(created); },
    async createMany({ data }) { const docs = (data || []).map(idDoc); const res = await model.insertMany(docs, { ordered: false }); return { count: res.length }; },
    async update({ where, data }) { const doc = await model.findOneAndUpdate(whereToQuery(where), data, { new: true }); return normalize(doc); },
    async updateMany({ where, data }) { const res = await model.updateMany(whereToQuery(where||{}), data); return { count: res.modifiedCount }; },
    async delete({ where }) { const doc = await model.findOneAndDelete(whereToQuery(where)); return normalize(doc); },
    async deleteMany({ where }) { const res = await model.deleteMany(whereToQuery(where||{})); return { count: res.deletedCount }; },
    async upsert({ where, create, update }) { const found = await model.findOne(whereToQuery(where)); if (found) { Object.assign(found, update); await found.save(); return normalize(found); } const created = await model.create(idDoc({ ...(create||{}), ...(where||{}) })); return normalize(created); },
    async groupBy() { return []; }
  };
}

const prisma = {
  ...Object.fromEntries(Object.entries(models).map(([k, m]) => [k, delegate(m)])),
  async $disconnect() {},
  async $queryRaw() { return 1; },
  async $transaction(ops) { return Promise.all(ops); }
};

export default prisma;
