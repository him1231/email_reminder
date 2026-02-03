# Sample data (Phase‑1 fixtures)

Use these records to populate the Firestore emulator for demos and CI.

Staff
- staff-001
  - name: Asha Tan
  - staffNo: HR-1001
  - email: asha.tan+demo@gmail.com
  - contractEffectiveDate: 2026-05-01T00:00:00Z
  - timezone: Asia/Singapore

- staff-002
  - name: Ben Carter
  - staffNo: FIN-232
  - email: ben.carter+demo@gmail.com
  - contractEffectiveDate: 2025-11-15T00:00:00Z
  - timezone: UTC

Template
- tpl-001
  - subject: "Welcome, {{name}} — next steps"
  - htmlBody: |
      <p>Hi {{name}},</p>
      <p>Your staff no. is {{staffNo}}. Your contract is effective {{contractEffectiveDate}}.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>

Rule (demo/manual)
- rule-001

Example: rule-002
- name: "Weekly digest (beta)"
- templateId: "tpl-1"
- filter: { tag: "beta-users" }
- state: "manual"
- createdBy: "user-1"
  - name: "90-day follow-up (demo)"
  - triggerType: relativeDate
  - field: contractEffectiveDate
  - offset: "+3 months"
  - templateId: tpl-001
  - enabled: false

Unsubscribe token (emulator)
- tok-demo-123
  - email: asha.tan+demo@gmail.com
  - expiresAt: (now + 30 days)
  - used: false
