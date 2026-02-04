# Rules Engine

This document describes the Rules Engine for automated email scheduling.

Overview
- Rules are stored in the `rules` collection.
- A GitHub Actions workflow (`.github/workflows/process-rules.yml`) runs every 10 minutes and executes `scripts/process-rules.js`.
- The script loads enabled rules, queries target collections, renders templates with Mustache, and creates `email_queue` entries scheduled for the calculated time.

Rule schema (summary)
- name: string
- enabled: boolean
- trigger: { collection, event: 'created'|'updated', field? }
- condition?: { field, operator, value }
- emailConfig: { templateId, recipientField (default: 'email'), relativeTime: {value, unit}, baseTimeField }
- lastTriggeredAt: timestamp | null
- lastTriggeredStaff: string[]
- createdAt, createdBy

First-run behavior
- If a rule's `lastTriggeredAt` is null the processor will skip existing documents for safety. Use the UI to provide a backfill option in the future.

Testing
- Create a test rule with small relative time (e.g. 1 minute), create a test document in the target collection, and run the workflow manually (workflow_dispatch) or run `npm run process-rules` with FIREBASE_SERVICE_ACCOUNT set.

Troubleshooting
- Check the workflow logs in GitHub Actions.
- `rules` documents will have `lastError` populated if processing fails.

Notes
- Deduplication uses `lastTriggeredStaff` array stored on the rule. The script keeps the most recent 1000 entries to avoid unbounded growth.
- The relative time calculation uses a simple add algorithm (days/weeks/months/years).
