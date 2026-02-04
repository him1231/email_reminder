Troubleshooting Scheduled Sending

This document covers issues where the GitHub Actions workflow for sending queued emails doesn't run on schedule.

1. Manual trigger
- The workflow supports manual runs via the "Run workflow" button in the Actions tab because it includes `workflow_dispatch`.

2. Why scheduled runs may not occur
- GitHub may disable scheduled workflows on forks or inactive repositories. If this repository is a fork or private, scheduled triggers may be disabled by default.
- Repository Action permissions may prevent scheduled workflows. Check Settings → Actions → General → "Actions permissions" and "Workflow permissions".
- If the default branch name in the workflow doesn't match the actual default branch, scheduled runs may not trigger.

3. How to check
- Open the Actions tab in GitHub, find the workflow named "Send queued emails" and check the run history and any warnings.
- Check the workflow YAML for syntax errors or invalid cron expressions. The current cron is `*/5 * * * *` (every 5 minutes) which is valid.

4. Workarounds
- Use the manual `workflow_dispatch` trigger to run the sender job on demand.
- If scheduling is unreliable, consider running an external scheduler or a small serverless job to dispatch the workflow using the GitHub Actions API.

5. Notes for maintainers
- The workflow file (.github/workflows/send-emails.yml) includes a comment noting GitHub may disable scheduled workflows on forks/private repos. If automatic scheduling doesn't work, use workflow_dispatch (manual trigger).
- To allow scheduled workflows, ensure repository is active and Actions permissions allow scheduled triggers.

Links:
- Actions settings: https://github.com/him1231/email_reminder/settings/actions
