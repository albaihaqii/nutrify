# 0004. LLM gives advice only

| Field  | Value      |
| ------ | ---------- |
| Status | Accepted   |
| Date   | 2026-11-05 |

## Context

The supervisor requires a large language model in the system. A language model can write fluent
guidance, but it can state wrong facts with confidence, it needs network access and an API key,
its provider and quota can change, and it must not be the reason a plant is labelled sick.
Plant status must be reproducible and explainable, which the C4.5 classifier provides.

The project owner has no API access yet and has not chosen a provider. Free tiers exist but
their limits and data-use terms change.

## Decision

- The LLM is an **advisor**. It receives measured facts only: plant position and status,
  confidence and rule path, sensor values with their status, how long the status has lasted, and
  active alerts. It never receives images, credentials, or personal data.
- The LLM **never decides the class** and never controls any device.
- Output must be JSON with `summary`, `likely_causes`, `suggested_actions`, and `severity`. The
  backend validates it. Invalid or failed output falls back to the rule-based advice
  ([Domain](../Domain.md) section 4).
- Advice is cached by plant status and sensor band to limit calls.
- The advisor sits behind a provider-agnostic interface, so the provider can be changed by
  configuration.
- Every advice item records its source (`llm` or `rules`), and the UI shows it together with a
  notice that the advice is not an automatic action.
- A chatbot is not part of version 1.

## Consequences

- The system works fully without any API key: the rule-based advisor is the baseline.
- Tests use a fake provider and never call a real service ([Rules](../Rules.md) section 12).
- The advice wording needs validation by an agronomy expert before being relied on.
- Sending only facts keeps data-protection concerns small, but the chosen provider's data-use
  terms still need to be read before configuring a key (for example whether free-tier inputs
  may be used to improve the provider's models).
- Calls cost time and possibly money; the cache and on-demand limits keep both small.

## Alternatives considered

| Option                                  | Why not                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| LLM classifies the plant from the image | Not reproducible, not explainable, harder to evaluate, and needs the image to leave the machine |
| LLM as a chatbot                        | More surface, more cost, and no clear value over targeted advice for this scope                 |
| No LLM                                  | Does not meet the supervisor's requirement                                                      |
