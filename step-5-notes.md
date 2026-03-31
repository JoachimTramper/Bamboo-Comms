# Step 5 Notes

## Completed changes

- Added support-oriented backend data foundations in Prisma: `Customer`, `Conversation`, conversation status/priority enums, message-to-conversation linkage, and supporting indexes.
- Added a new `conversations` module with guarded list/get/create/update/delete flows plus dedicated status and assignee updates.
- Added a `customers` service for customer lookup, creation, and profile updates, and extended auth typing/token handling to distinguish `user` and `customer` subjects.
- Updated message creation and bot reply flows so messages can stay attached to a conversation, including reply validation against the same conversation.
- Added a migration planning script entry for channel-to-conversation rollout: `db:plan:channels-to-conversations`.

## Successful verification

- `apps/api` compiled successfully with `.\node_modules\.bin\nest.CMD build`.
- `git diff --check` completed without whitespace or conflict-marker errors.
