---
name: planitforme-agent
description: Use a connected PlanItForMe agent account to read plans and manage tasks, events, routines, tags, placements, and planning settings through the bounded MCP tools. Apply when the user asks an AI agent to work with their PlanItForMe data; do not use for configuring models or administering the PlanItForMe service.
---

# PlanItForMe Agent

Use the connected PlanItForMe tools as the source of truth. The named access
value authorizes one workspace; never ask the user to paste it into the task or
include it in tool arguments, output, logs, or files.

## Start

1. Confirm that `planner_access`, `planner_read`, `planner_preview`, and
   `planner_apply` are available from the connected PlanItForMe MCP server.
2. Call `planner_access` before the first operation that depends on supported
   actions or argument shapes. Use its returned manifest instead of assuming a
   fixed action inventory.
3. If the four tools are unavailable, do not fall back to legacy PlanItForMe
   tools. Read [references/mcp-connection.md](references/mcp-connection.md)
   and explain the missing one-time connection step without requesting the
   credential in chat.

## Read

Translate the user's request into one manifest-listed read action and call
`planner_read`. Prefer stable public references from results when a later
request targets an existing object. Present the result in ordinary language;
hide transport envelopes and internal storage coordinates unless the user asks
for technical detail.

If the request is ambiguous in a way that changes the target or date, ask one
short question before calling a mutation tool. Do not invent a task, event,
routine, time, timezone, recurrence, or target reference.

### Notes on tasks

PlanItForMe does not expose notes as an independent planner entity. A note that
belongs to a task is the task's `description` field.

- For a new task, put the user's optional note in `description` on
  `create_task`.
- To add a note to an existing task, first read the current item, preserve its
  existing description, and preview `update_task` with the combined text and
  current `expected_revision`.
- Append with a blank line unless the user explicitly asks to replace or clear
  the existing notes.
- If the user asks for a standalone note without identifying a task, ask which
  task it belongs to. Do not create another entity as a substitute.

## Change

Every change has two separate user-visible stages:

1. Call `planner_preview` with one manifest-listed mutation and the exact
   arguments supported by the current manifest.
2. Summarize the proposed object, changed fields, time or recurrence, and known
   effects in human language. Keep the preview token private.
3. Wait for the user to approve this displayed preview. An initial request such
   as “создай” or “перенеси” authorizes preparation of the preview, not its
   application.
4. After approval, call `planner_apply` with the exact preview token,
   `confirmation="apply"`, and one stable command ID. Reuse that command ID only
   when retrying the same uncertain apply; use a new one for a new preview.
5. Report the terminal result. If the preview is stale, expired, or conflicts
   with newer data, prepare a fresh preview and show it again instead of applying
   automatically.

Never convert an unsupported request into a different action. Account,
credential, integration, payment, export, deletion, session, and legal-consent
administration are outside this skill.

## Conversation style

Answer in the user's language. For ordinary use, describe entities by title,
date/time, recurrence, and short public reference only when it helps identify
the object. Do not repeatedly print provider names, raw JSON, credential state,
or the complete capability manifest.
