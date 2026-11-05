# Architecture Decision Records

An ADR records one significant decision: the situation, what was decided, and what follows from
it. ADRs explain _why_, so the reasons are not lost. How the system works is described in
[Architecture](../Architecture.md).

## Rules

- File name: `NNNN-short-title.md`, numbered in order and never renumbered.
- One decision per file. Short: a page or less.
- An accepted ADR is not edited to change the decision. A new ADR supersedes it, and the old
  one is marked `Superseded by NNNN` (the old text stays).
- Statuses: `Proposed`, `Accepted`, `Superseded`, `Rejected`.

## Index

| ADR                                    | Title                           | Status   |
| -------------------------------------- | ------------------------------- | -------- |
| [0001](0001-flask-and-mysql.md)        | Flask and MySQL for the backend | Accepted |
| [0002](0002-c45-as-primary-model.md)   | C4.5 as the primary model       | Accepted |
| [0003](0003-separate-vision-worker.md) | Separate vision worker process  | Accepted |
| [0004](0004-advice-only-llm.md)        | LLM gives advice only           | Accepted |

Candidates for later ADRs: web login token storage; comparator consensus at runtime.

## Template

```markdown
# NNNN. Title

| Field  | Value                                    |
| ------ | ---------------------------------------- |
| Status | Proposed / Accepted / Superseded by NNNN |
| Date   | YYYY-MM-DD                               |

## Context

What situation and constraints led to this decision.

## Decision

What was decided, in one or two clear statements.

## Consequences

What becomes easier, what becomes harder, what must be done as a result.

## Alternatives considered

Other options and why they were not chosen.
```
