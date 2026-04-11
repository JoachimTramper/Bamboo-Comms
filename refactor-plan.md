# Refactor Plan: Transform Chat Platform into an AI Customer Support Assistant

## Objective

Refactor the existing team chat platform into an AI-assisted customer support product without changing the core technical foundation. The plan keeps the overall direction intact while making the work incremental, safe, and easy to execute.

## Guiding Principles

- Keep changes small and reversible.
- Preserve existing behavior until the replacement path is ready.
- Prefer additive schema and API changes before destructive cleanup.
- Use feature flags or compatibility layers during transitions where possible.
- Verify each step before moving to the next one.

## Phase Overview

### Phase 1: Data Model Foundation

Introduce support-specific entities and metadata while preserving current chat data.

### Phase 2: Backend Module Restructuring

Shift backend concepts from channels and chat semantics to conversations and support workflows.

### Phase 3: Frontend Interface Transformation

Replace collaboration-first UI patterns with support inbox and conversation workflows.

### Phase 4: Support Workflow Integration

Add AI-assisted support flows, internal collaboration, and escalation logic.

---

## Phase 1: Data Model Foundation

### Step 1: Add Support-Oriented Schema Without Replacing Existing Models

**This is the first implementation step.**

**Goal**

Add the minimum new schema required for support workflows while keeping current `Channel` and `Message` behavior intact.

**Files**

- `apps/api/prisma/schema.prisma`
- new migration under `apps/api/prisma/migrations/`

**Why first**

- It is additive and low-risk.
- It creates the foundation for every later API and UI change.
- It avoids early breakage in current chat flows.

**Changes**

- Add `Conversation` model with support metadata.
- Add `Customer` model if customer identity is separate from internal users.
- Add conversation status fields such as `OPEN`, `PENDING`, `RESOLVED`, `CLOSED`.
- Add assignment fields such as `assigneeId`.
- Add priority and tags support if planned in later steps.
- Add optional compatibility fields needed for migration from channels.

**Safety**

- Additive only.
- No removal or rename of current production tables.
- Existing endpoints remain untouched.

**Verification**

- Prisma schema validates.
- Migration applies cleanly.
- Existing chat tables and flows still work.

### Step 2: Create a Safe Data Migration Strategy

**Goal**

Prepare a reversible migration path from channels to conversations.

**Files**

- migration scripts
- `apps/api/scripts/migrate-channels-to-conversations.ts`

**Changes**

- Map public channels to internal support/team conversations where applicable.
- Map direct messages to customer conversations where applicable.
- Preserve message history, authorship, and timestamps.
- Create rollback strategy and backup instructions.

**Safety**

- Backup-first migration.
- Rollback script required before execution in shared environments.

**Verification**

- Test migration on development data.
- Confirm referential integrity.
- Confirm rollback works.

### Step 3: Extend Authentication for Support Use Cases

**Goal**

Support customer-facing workflows without breaking internal agent auth.

**Files**

- auth module
- user model extensions if needed

**Changes**

- Add customer authentication or customer identity support as planned.
- Preserve existing agent login flows.
- Keep current auth working during transition.

**Safety**

- Additive changes only.
- No breaking changes to existing login flows.

**Verification**

- Existing agent auth still works.
- New customer auth path works if enabled.

### Step 4: Add Conversation Metadata Management

**Goal**

Create a dedicated conversations module for support-specific operations.

**Files**

- `apps/api/src/conversations/`

**API Endpoints**

- `GET /conversations`
- `GET /conversations/:id`
- `POST /conversations`
- `PATCH /conversations/:id/status`
- `PATCH /conversations/:id/assign`
- `POST /conversations/:id/tags`

**Changes**

- Support filtering by status, assignee, and priority.
- Support conversation creation and metadata updates.
- Add real-time update hooks where needed.

**Safety**

- New module, isolated from current channel endpoints.

**Verification**

- CRUD operations work.
- Metadata updates persist correctly.
- Real-time updates function if enabled.

### Step 5: Add Development Seed Data

**Goal**

Create realistic support-oriented test data.

**Files**

- `apps/api/prisma/seed.ts`

**Changes**

- Add sample customers.
- Add conversations in different statuses and priorities.
- Add representative support message history.
- Add agent assignments.

**Verification**

- Seed completes successfully.
- Seed data supports API and UI testing.

---

## Phase 2: Backend Module Restructuring

### Step 6: Transform the Channels Module into a Conversations Module

**Goal**

Move backend semantics from channels to conversations without abrupt removal of legacy APIs.

**Files**

- `apps/api/src/channels/`
- `apps/api/src/conversations/`

**Changes**

- Rename service methods to conversation-oriented terminology.
- Add support-specific queries such as status and assignee filtering.
- Maintain temporary compatibility with legacy endpoints where needed.
- Add conversation lifecycle operations.

**Safety**

- Gradual replacement.
- Compatibility layer during transition.

**Verification**

- New conversation APIs work.
- Legacy endpoints continue to function until cutover.

### Step 7: Extract the AI Bot into a Dedicated Assistant Service

**Goal**

Refactor the current bot into a reusable support assistant service.

**Files**

- `apps/api/src/bot/`
- `apps/api/src/ai-assistant/`

**Changes**

- Remove hardcoded channel assumptions.
- Remove dependence on direct message or mention-specific behavior.
- Prepare the service for knowledge base integration.
- Keep current AI logic working during migration.

**Safety**

- Parallel implementation before switchover.

**Verification**

- AI can respond in support conversations.
- No dependency on channel-specific bot behavior remains.

### Step 8: Update Message Flow for Support Context

**Goal**

Add support semantics to message handling.

**Files**

- `apps/api/src/messages/messages.service.ts`

**Changes**

- Track message role or type such as customer message, agent reply, or internal note.
- Update conversation metadata on message activity.
- Trigger AI workflows when appropriate.
- Capture response-time metrics if needed.

**Safety**

- Backward-compatible message handling where possible.

**Verification**

- Message creation still works.
- Conversation metadata updates correctly.
- AI triggers only in the intended cases.

### Step 9: Add a Knowledge Base Foundation

**Goal**

Create the minimal backend needed for AI-grounded support replies.

**Files**

- `apps/api/src/knowledge-base/`

**Changes**

- Add CRUD for knowledge documents.
- Add basic text search or retrieval interface.
- Add upload support for documentation if planned.
- Expose retrieval interface to the AI assistant.

**Safety**

- New optional module.

**Verification**

- Knowledge entries can be created and retrieved.
- AI assistant can access relevant documents.

### Step 10: Update WebSocket Events for Conversations

**Goal**

Align realtime infrastructure with conversation semantics.

**Files**

- `apps/api/src/ws/ws.gateway.ts`

**Changes**

- Change room naming from `chan:{channelId}` to `conv:{conversationId}`.
- Add conversation-specific events.
- Preserve realtime reliability during transition.

**Verification**

- Conversation updates propagate in real time.
- Existing socket behavior is not unintentionally broken during cutover.

### Step 11: Implement Assignment and Status Management

**Goal**

Add support workflow rules around ownership and lifecycle.

**Files**

- `apps/api/src/conversations/conversations.service.ts`

**Changes**

- Add assignment logic.
- Add status transition validation.
- Add escalation hooks if needed.

**Business Rules**

- `OPEN -> PENDING`
- `PENDING -> RESOLVED`
- `RESOLVED -> CLOSED`
- urgent conversations can auto-assign to the appropriate agent tier if that behavior is retained

**Verification**

- Status transitions are validated.
- Assignment changes persist and broadcast correctly.

---

## Phase 3: Frontend Interface Transformation

### Step 12: Transform the Sidebar into a Conversation Inbox

**Goal**

Replace the channel list with a support inbox.

**Files**

- `apps/web/app/chat/components/Sidebar.tsx`
- related hooks and new conversation components

**Changes**

- Show conversations instead of channels.
- Display status, assignee, and latest message.
- Add filtering by status, priority, and assignee.

**New Components**

- `ConversationList.tsx`
- `ConversationItem.tsx`
- `ConversationFilters.tsx`
- `WorkloadIndicator.tsx`

**Verification**

- Conversation list renders correctly.
- Filtering works and remains responsive.

### Step 13: Update the Main Chat Interface for Support Context

**Goal**

Make the main conversation view support-oriented instead of team-chat-oriented.

**Files**

- chat header and message components

**Changes**

- Add conversation status controls.
- Add customer information display.
- Add assignment and priority indicators.
- Show support metadata in the thread view.

**New Components**

- `ConversationHeader.tsx`
- `CustomerPanel.tsx`
- `ConversationMeta.tsx`
- `ResponseTimeTracker.tsx`

**Verification**

- Metadata is visible and accurate.
- Status and assignment updates work from the UI.

### Step 14: Replace Bot Mention UX with an AI Assistant Panel

**Goal**

Shift AI interaction from chat commands and mentions to explicit support actions.

**Files**

- composer and AI-related UI components

**Changes**

- Add `Generate Reply` action.
- Add draft review workflow.
- Add confidence display if retained in the plan.
- Remove dependence on `@mention` bot interaction.

**New Components**

- `AiAssistantPanel.tsx`
- `DraftReply.tsx`
- `ConfidenceIndicator.tsx`
- `AiActions.tsx`

**Remove or De-emphasize**

- `@BambooBob` mention workflow
- hardcoded bot commands in the composer
- channel-specific AI restrictions

**Verification**

- Draft generation works.
- Agents can review and edit before sending.
- The approval path prevents accidental AI auto-send behavior.

### Step 15: Add Conversation Management Controls

**Goal**

Expose support workflow controls directly in the UI.

**Files**

- new conversation management components

**Changes**

- Add status controls.
- Add assignment selector.
- Add priority controls.
- Add tag management.
- Add internal notes entry point.

**New Components**

- `ConversationControls.tsx`
- `PrioritySelector.tsx`
- `TagManager.tsx`
- `InternalNotes.tsx`
- `AssignmentSelector.tsx`

**Verification**

- Agents can update conversation metadata without leaving the thread.

---

## Phase 4: Support Workflow Integration

### Step 16: Implement AI Draft Generation Workflow

**Goal**

Turn the assistant into a support draft generator grounded in conversation context.

**Files**

- `apps/api/src/ai-assistant/draft-generation.service.ts`

**Changes**

- Generate replies from conversation history.
- Include customer and knowledge base context.
- Add confidence scoring if retained.
- Support agent review and edits before send.

**Confidence Levels**

- High: minimal review needed
- Medium: review recommended
- Low: likely escalation or manual rewrite

**Verification**

- Drafts are contextually relevant.
- Knowledge is incorporated when available.

### Step 17: Add an Internal Notes System

**Goal**

Enable private collaboration between agents inside a customer conversation.

**Files**

- `apps/api/src/internal-notes/`
- UI integration files

**Changes**

- Create, edit, and delete internal notes.
- Keep notes private from customers.
- Make notes available to AI where intended.

**Optional Enhancements**

- Markdown support
- agent mentions
- timeline integration
- note search

**Verification**

- Notes stay private.
- Agents can collaborate in real time if that behavior is enabled.

### Step 18: Add Human Handoff and Escalation Flow

**Goal**

Support cases where AI or the assigned agent cannot resolve the issue cleanly.

**Files**

- `apps/api/src/escalation/`

**Changes**

- Add manual escalation.
- Add automatic escalation triggers where planned.
- Add supervisor or advanced routing if part of the current direction.

**Possible Triggers**

- low AI confidence
- urgent customer language
- SLA breach
- agent requests assistance
- repeated unresolved exchanges

**Verification**

- Escalations preserve context.
- Routing and notifications work as expected.

---

## End-to-End Verification

### Support Flow

- Customer starts a conversation.
- Conversation is assigned or queued.
- Agent receives the thread in the inbox.
- Agent generates an AI draft, edits it, and replies.
- Conversation status progresses through the intended lifecycle.

### Collaboration Flow

- Agents add internal notes.
- Notes remain private.
- Handoffs preserve full context.

### Performance Checks

- Realtime messaging remains stable.
- Conversation list remains responsive with realistic data volume.
- AI draft generation completes within an acceptable response window.

---

## Risk Mitigation

### Data Safety

- Back up the database before each migration run.
- Test rollback before shared-environment rollout.
- Avoid destructive schema changes until the new flow is proven.

### Deployment Safety

- Use feature flags where practical.
- Prefer parallel APIs before removing legacy endpoints.
- Roll out UI transitions progressively.

### User Experience Safety

- Keep existing chat behavior working until support flows are validated.
- Provide graceful fallback when AI fails or is unavailable.
- Avoid forcing users into the new workflow all at once.

---

## Open Assumptions

- How will support knowledge be populated initially?
- Will customers authenticate, or will conversations allow lighter-weight identity?
- Is the product single-tenant or multi-tenant?
- What exact escalation rules should be automated?
- Is prompt-based customization enough, or is deeper model customization planned?
- Are external integrations required in this phase?

---

## Summary

This plan preserves the existing direction: evolve the current chat platform into an AI-assisted customer support product by introducing support-specific data models, reshaping backend modules, replacing chat-first UI patterns, and layering in AI-assisted workflows incrementally.
