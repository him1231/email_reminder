## Triggering Rules

### Automatic Monitoring
When you create a new rule, it starts monitoring **from the moment it's created**. It will not process existing documents.

### Processing Existing Documents
If you want a rule to process documents that already exist (backfill), use the **"Trigger Now"** button:

1. Go to the Rules list
2. Click the ▶️ (play) icon next to the rule
3. Confirm the action
4. The next workflow run (within 10 minutes) will process all matching documents

**Warning:** This may schedule many emails. Use with caution.

### How It Works
- When you click "Trigger Now", the rule's `lastTriggeredAt` is set to 1 year ago
- The next process-rules workflow run will query all documents created/updated since then
- After processing, `lastTriggeredAt` is updated to now
- Future runs will only process new changes
