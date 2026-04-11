# Channel to Conversation Migration Strategy

## Purpose

This document defines the safe, non-destructive migration strategy for transforming existing `Channel` records into future `Conversation` records.

This step does **not** perform any writes. It only documents the mapping rules and the dry-run planning process.

## Principles

- Treat the first pass as analysis, not execution.
- Preserve all existing `Channel`, `Message`, and membership data.
- Prefer skipping ambiguous records over guessing.
- Make execution reversible later by requiring backups and transaction boundaries.

## Dry-Run Script

Script file:

- `apps/api/scripts/migrate-channels-to-conversations.ts`

Package command:

- `pnpm -F api db:plan:channels-to-conversations`

Current behavior:

- reads channels, members, and message counts
- classifies each channel into a migration bucket
- prints a dry-run summary
- refuses execution mode

## Planned Transformation Rules

### 1. Public Channels -> Internal Conversations

Safe default rule:

- any `Channel` with `isDirect = false` becomes an internal conversation candidate

Planned conversation shape:

- `subject`: derived from channel name
- `status`: `OPEN`
- `priority`: `NORMAL`
- `tags`: `imported`, `internal`
- `assignee`: first admin member if one exists
- `customer`: none

### 2. Direct Messages -> Customer Conversation Candidates

Safe default rule:

- any direct channel with exactly two non-bot members and at least one admin member becomes a customer conversation candidate

Planned conversation shape:

- `subject`: derived from channel name
- `status`: `OPEN`
- `priority`: `NORMAL`
- `tags`: `imported`, `dm-candidate`
- `assignee`: first admin member
- `customer`: inferred from the non-admin participant

### 3. Ambiguous Direct Messages -> Manual Review

A direct message is skipped in the planning output when:

- it has an unexpected member count
- it has no admin member
- it cannot safely infer a customer/agent split

These records should be reviewed before any future execute mode is added.

## Customer Creation Strategy

When execute mode is implemented later:

- create or reuse a `Customer` record using inferred customer email
- connect the new `Conversation` to that `Customer`
- keep original user and message data untouched until the migration result is verified

## Message Preservation Strategy

No message data is modified in Step 2.

When execution is implemented later:

- message history remains in `Message`
- timestamps are preserved
- authorship is preserved
- channel history is used as source material for imported conversations

## Reversibility Requirements for Later

Before any execution mode is enabled:

- create a database backup
- run the migration in a transaction where practical
- write imported conversation identifiers in a way that supports rollback
- test rollback on a copy of production-like data first

## Recommended Test Path Later

1. Run the dry-run planner and capture output.
2. Review all `skip` cases manually.
3. Refine classification rules if needed.
4. Test execute mode against a cloned development database.
5. Compare counts:
   - channels inspected
   - conversations created
   - customers created
   - skipped records
6. Verify that legacy `Channel` and `Message` data is unchanged.
7. Only then consider running against a shared environment.
