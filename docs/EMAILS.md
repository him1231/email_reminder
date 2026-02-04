# Email queue and GitHub Actions sender

This document explains how the email queue and scheduled sending works.

Required repository secrets (set in GitHub Settings → Secrets):
- FIREBASE_SERVICE_ACCOUNT — JSON service account key (full JSON blob) from Firebase Console → Service accounts → Create private key
- SMTP_USER — Gmail address used to send (e.g. example@gmail.com)
- SMTP_PASS — Gmail app password (generate under Google Account → Security → App passwords)

How it works
- The client UI writes queued emails to the Firestore collection `email_queue` with schema:
  {
    to: string,
    subject: string,
    body: string,
    status: 'pending' | 'sent' | 'failed',
    createdAt: timestamp,
    scheduledFor: timestamp,
    sentAt: timestamp | null,
    error: string | null
  }
- A GitHub Actions workflow (.github/workflows/send-emails.yml) runs on schedule (every 5 minutes) and on manual dispatch. It checks for pending emails where scheduledFor <= now and sends them using Nodemailer (Gmail SMTP) and the FIREBASE_SERVICE_ACCOUNT to authenticate to Firestore.

Testing manually
- You can trigger the workflow manually from the Actions tab → select "Send queued emails" → Run workflow.
- Locally: set the environment variables FIREBASE_SERVICE_ACCOUNT (JSON string), SMTP_USER and SMTP_PASS and run:
  npm run send-emails
- For dry-run testing, set env var DRY_RUN=1 to avoid actually sending emails.

Firestore rules
- Ensure the service account used by the workflow has permissions to read/write the `email_queue` collection.
- The client must have Firestore rules that allow authenticated users to add documents to `email_queue` and read their status. Example rules may be needed depending on your security model.

Adjust schedule
- Edit .github/workflows/send-emails.yml and change the cron expression under `on.schedule`.

Secrets must not be committed to the repository.