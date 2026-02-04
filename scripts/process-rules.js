/* eslint-disable no-console */
const admin = require('firebase-admin');
const mustache = require('mustache');

// Date helper function (inline to avoid TS import issues)
function addRelativeTime(baseDate, value, unit) {
  const date = new Date(baseDate);
  switch (unit) {
    case 'days': date.setDate(date.getDate() + value); return date;
    case 'weeks': date.setDate(date.getDate() + value * 7); return date;
    case 'months': date.setMonth(date.getMonth() + value); return date;
    case 'years': date.setFullYear(date.getFullYear() + value); return date;
    default: return date;
  }
}

// Initialize firebase-admin using service account JSON from env
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('FIREBASE_SERVICE_ACCOUNT env var is required');
  process.exit(1);
}

const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

async function loadTemplatesMap() {
  const snap = await db.collection('templates').get();
  const map = {};
  snap.forEach(d => map[d.id] = d.data());
  return map;
}

function render(tpl, data) {
  const subject = mustache.render(tpl.subject || tpl.name || '', data);
  const body = mustache.render(tpl.htmlBody || tpl.html || '', data);
  return { subject, body };
}

function now() { return admin.firestore.Timestamp.now(); }

async function processRule(ruleDoc, templates) {
  const rule = { id: ruleDoc.id, ...ruleDoc.data() };
  const triggeredIds = [];
  const maxResults = 100;

  try {
    const coll = db.collection(rule.trigger.collection);
    let q = coll;

    const lastTs = rule.lastTriggeredAt || null;

    if (rule.trigger.event === 'created') {
      if (lastTs) q = q.where('createdAt', '>', lastTs);
      else {
        // first run: skip existing documents
        console.log(`Rule ${rule.id}: no lastTriggeredAt, skipping existing docs`);
        return { scheduled: 0 };
      }
    } else if (rule.trigger.event === 'updated') {
      if (lastTs) q = q.where('updatedAt', '>', lastTs);
      else {
        console.log(`Rule ${rule.id}: no lastTriggeredAt for updated event, skipping`);
        return { scheduled: 0 };
      }
    }

    // apply condition if present
    if (rule.condition && rule.condition.field) {
      q = q.where(rule.condition.field, rule.condition.operator, rule.condition.value);
    }

    q = q.limit(maxResults);
    const snap = await q.get();

    let scheduled = 0;
    for (const d of snap.docs) {
      const docData = d.data();
      // dedupe
      if (Array.isArray(rule.lastTriggeredStaff) && rule.lastTriggeredStaff.includes(d.id)) continue;
      // recipient
      const recipientField = rule.emailConfig.recipientField || 'email';
      const to = docData[recipientField];
      if (!to) continue;

      const tpl = templates[rule.emailConfig.templateId];
      if (!tpl) {
        console.warn(`Template ${rule.emailConfig.templateId} not found for rule ${rule.id}`);
        continue;
      }

      // compute scheduledFor
      const base = docData[rule.emailConfig.baseTimeField];
      if (!base) {
        console.warn(`Document ${d.id} missing baseTimeField ${rule.emailConfig.baseTimeField}`);
        continue;
      }

      const scheduledForDate = addRelativeTime(base.toDate ? base.toDate() : new Date(base), rule.emailConfig.relativeTime.value, rule.emailConfig.relativeTime.unit);
      const rendered = render(tpl, docData);

      // create email_queue entry
      const queueEntry = {
        to,
        subject: rendered.subject,
        body: rendered.body,
        status: 'pending',
        createdAt: now(),
        scheduledFor: admin.firestore.Timestamp.fromDate(scheduledForDate),
        sentAt: null,
        error: null,
        ruleId: rule.id,
        triggeredBy: d.id,
      };

      // Add BCC if configured on the rule
      if (rule.emailConfig && rule.emailConfig.bcc) {
        queueEntry.bcc = rule.emailConfig.bcc;
      }

      await db.collection('email_queue').add(queueEntry);

      triggeredIds.push(d.id);
      scheduled++;
    }

    // update rule
    const update = { lastTriggeredAt: now() };
    const existing = Array.isArray(rule.lastTriggeredStaff) ? rule.lastTriggeredStaff.slice() : [];
    update.lastTriggeredStaff = existing.concat(triggeredIds).slice(-1000); // keep recent 1000
    await db.collection('rules').doc(rule.id).update(update);
    return { scheduled };
  } catch (err) {
    console.error('Error processing rule', ruleDoc.id, err);
    await db.collection('rules').doc(ruleDoc.id).update({ lastError: String(err), lastTriggeredAt: now() });
    return { scheduled: 0 };
  }
}

(async function main(){
  console.log('Process rules start');
  const templates = await loadTemplatesMap();
  const rulesSnap = await db.collection('rules').where('enabled', '==', true).get();
  let totalRules = 0, totalScheduled = 0;
  for (const r of rulesSnap.docs) {
    totalRules++;
    const res = await processRule(r, templates);
    totalScheduled += res.scheduled || 0;
    console.log(`Rule ${r.id}: scheduled ${res.scheduled}`);
  }
  console.log(`Done. Rules processed: ${totalRules}, emails scheduled: ${totalScheduled}`);
  process.exit(0);
})();
