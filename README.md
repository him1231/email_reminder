# Team Process Wizard (TPW)

This project is a small demo for queuing and sending reminder emails using Firestore and a scheduled backend.

Admin: managing staff groups

- A new Firestore collection `staff_groups` stores groups with fields: name, description, createdBy, createdAt, updatedAt.
- Staff documents now support `groupIds` (array of group document IDs).

To manage groups in the web UI (admins only):
- Open the app and sign in as an admin user.
- Go to the "Staff groups" page (top navigation or visit `#/staff-groups`).
- Create, edit, or delete groups. Deleting a group will remove its id from any staff.groupIds (no staff documents are deleted).

Firestore rules and indexes

- Firestore rules updated to allow CRUD for `staff_groups` and to accept `groupIds` on staff writes. Only admins may create/update/delete groups.
- An index entry for querying staff by `groupIds` has been added to `firestore.indexes.json`.

Testing / manual steps

1. As an admin user, create a few staff groups via `#/staff-groups`.
2. Add a staff via "Add staff" and select groups (multi-select) when editing the staff.
3. Edit a staff via the Edit button on the staff card and change group assignments.
4. Delete a group and verify that existing staff documents no longer contain that group id in their `groupIds` array.

Branch

Changes are on branch `feature/multi-group-staff`.
