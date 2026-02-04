#!/usr/bin/env node
// scripts/send-pending-emails.js
// Sends pending emails from Firestore using Nodemailer

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

async function main() {
  try {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

    if (!sa) {
      console.error('FIREBASE_SERVICE_ACCOUNT env var is required');
      process.exit(1);
    }
    if (!smtpUser || !smtpPass) {
      console.error('SMTP_USER and SMTP_PASS env vars are required');
      process.exit(1);
    }

    // Support both raw JSON and base64-encoded JSON
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(sa);
    } catch (e) {
      // Try base64 decode
      const decoded = Buffer.from(sa, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
    }
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const db = admin.firestore();

    const now = new Date();
    // Query pending emails where scheduledFor <= now
    const q = db.collection('email_queue')
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', admin.firestore.Timestamp.fromDate(now))
      .orderBy('scheduledFor')
      .limit(50);

    const snap = await q.get();
    if (snap.empty) {
      console.log('No pending emails to send.');
      process.exit(0);
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass }
    });

    let sent = 0, failed = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      console.log('Sending:', doc.id, data.to, data.subject);
      if (dryRun) {
        console.log('[DRY RUN] would send email to', data.to);
        continue;
      }
      try {
        const mailOptions = { from: smtpUser, to: data.to, subject: data.subject, text: data.body };
        if (data.bcc) mailOptions.bcc = data.bcc;
        await transporter.sendMail(mailOptions);
        await doc.ref.update({ status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp(), error: null });
        sent++;
      } catch (err) {
        failed++;
        console.error('Send failed for', doc.id, err.message || err);
        await doc.ref.update({ status: 'failed', error: String(err.message || err) });
      }
    }

    console.log(`Done: ${sent} sent, ${failed} failed`);
    process.exit(0);
  } catch (err) {
    console.error('Critical error', err);
    process.exit(1);
  }
}

main();
