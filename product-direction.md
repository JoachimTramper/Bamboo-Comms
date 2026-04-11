# Product Direction: AI Customer Support Assistant for SaaS

## Current Repository Assessment

This repository is currently a real-time team chat product with:

- multi-user channels and direct messages
- presence, typing indicators, reactions, search, replies, and uploads
- JWT auth, email verification, Google login, and avatars
- an AI bot that responds inside chat and generates summaries/digests

The strongest reusable assets are:

- the authenticated NestJS + Next.js + Prisma foundation
- realtime messaging infrastructure
- file upload support
- existing AI service patterns

The main mismatch is product focus. The app is optimized for internal team chat, while a SaaS support assistant should be optimized for customer conversations, agent workflows, and answer quality.

---

## Core Product Scope

Transform the product into a lightweight **AI Customer Support Assistant for SaaS teams** that helps support agents answer customer questions faster and lets customers get immediate help before escalation.

The MVP should focus on one clear loop:

1. A customer asks a support question.
2. The AI suggests or sends an answer using approved knowledge.
3. If confidence is low or the issue is complex, the conversation is handed to a human agent.
4. The team can review the thread, respond, and close it.

This should be positioned as a **shared support inbox with AI assistance**, not as a general collaboration chat app.

---

## Target User

### Primary User

Small to mid-sized SaaS companies that need a simple support system with AI assistance but do not want the complexity of a full enterprise help desk.

### User Personas

- **Support agent**: handles inbound customer questions, edits AI drafts, and resolves conversations.
- **Support lead / founder**: monitors support quality, defines basic knowledge sources, and tracks whether AI is reducing workload.
- **End customer**: asks product, billing, onboarding, or troubleshooting questions through a chat-style interface.

---

## MVP Features

### 1. Shared Support Inbox

Replace channels/DMs with **customer conversations**.

- one thread per customer issue
- thread states: `open`, `pending`, `resolved`
- visible assignee for each thread
- conversation list with latest message, status, and waiting-on indicator

### 2. AI Reply Assistant

Repurpose the current bot into an agent-facing support copilot.

- generate draft replies from conversation context
- answer in the company's preferred tone
- suggest clarifying questions when the request is ambiguous
- refuse to invent product facts when knowledge is missing
- allow agent review before send

For MVP, AI should assist agents first. Fully autonomous customer-facing resolution can come later.

### 3. Basic Knowledge Source Ingestion

The AI needs bounded support knowledge.

- upload or paste help-center content / FAQs
- store internal support snippets or canned answers
- retrieve relevant knowledge for each draft reply

Without this, the current mention-based bot will sound generic and unreliable for support.

### 4. Human Handoff

Escalation must be explicit.

- flag low-confidence cases
- mark thread as needing human attention
- let an agent take over and respond manually
- preserve full conversation history

### 5. Internal Notes

Support teams need a private workspace inside each customer thread.

- internal notes visible only to agents
- AI can use notes as context for future draft replies

This is more valuable for support than public reactions, social chat behavior, or presence signals.

### 6. Basic Customer and Conversation Metadata

Track minimal context needed to support customers well.

- customer profile: name, email, company, plan tier
- conversation tags such as `billing`, `bug`, `how-to`
- timestamps for first response and resolution

---

## What Should Be Removed or Simplified

### Remove General Team Chat Concepts

These are core to the current product but not core to the new one:

- public channels
- direct messages between users
- workspace-style channel creation
- unread counts across many social conversations
- presence states (`online`, `idle`, `offline`)
- typing indicators between many internal users

Support threads are not the same as Slack channels. Keeping both models will blur the product.

### Remove Social Messaging Features

These add complexity without helping MVP support outcomes:

- emoji reactions
- reply threads inside message threads
- mention-heavy bot interaction model
- daily digest features for channels
- generic chat commands like `!help`, `!ping`, `!digest`, `!whoami`

The AI should be invoked through clear support actions such as `Generate reply`, not chat commands.

### Simplify Authentication and Onboarding

Current auth is broader than needed for MVP.

- keep email/password auth for internal agents
- keep invite-based team access if useful
- defer Google login unless it is already required for launch
- simplify email verification flows if they slow down setup

The product's early value is support workflow, not auth surface area.

### Simplify File Handling

Keep attachments, but narrow the use case.

- keep customer attachment upload support
- keep internal file evidence if needed
- de-emphasize avatar management and profile customization

### Remove the Extra `apps/docs` App

`apps/docs` is still a default scaffold and does not contribute to the product. It should be removed or postponed to reduce maintenance noise.

### Simplify the Frontend Information Architecture

The current UI is centered around sidebar channels and a chat canvas. For support MVP, simplify to:

- left pane: conversation inbox
- main pane: selected customer thread
- right pane or modal: customer context, AI suggestions, internal notes

This is a better fit than adapting the current collaboration-first layout indefinitely.

---

## Recommended Product Reframing for This Codebase

### Keep

- NestJS API foundation
- Prisma/Postgres data layer
- realtime transport where useful
- message storage and file upload infrastructure
- existing AI service integration pattern

### Reshape

- `Channel` -> `Conversation`
- `Message` -> shared model for customer messages, agent replies, internal notes
- bot mention flow -> explicit AI-assist actions
- channel membership -> agent assignment / team access

### Add

- customer entity
- conversation status and assignee
- private internal notes
- knowledge source records and retrieval layer
- AI confidence / escalation state

---

## MVP Outcome

If the transformation is successful, the product should no longer feel like "a chat app with a bot." It should feel like:

**an AI-assisted support inbox for SaaS teams that helps answer customers faster, escalates cleanly to humans, and stays grounded in approved support knowledge.**

That is the narrowest credible direction that fits the current repository and can be delivered by simplifying existing chat infrastructure instead of building a help desk platform from scratch.
