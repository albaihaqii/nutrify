# 0002. C4.5 as the primary model

| Field  | Value                                                             |
| ------ | ----------------------------------------------------------------- |
| Status | Accepted (switching the primary model needs supervisor agreement) |
| Date   | 2026-11-05                                                        |

## Context

The project title names the C4.5 algorithm. The supervisor also asked for additional models to
compare against. The classifier must explain its result to non-experts, and it should run
without heavy dependencies on the machine that hosts the system.

The dataset is small and imbalanced, with only a few real nitrogen-deficiency samples. Which
algorithm scores highest cannot be known in advance.

## Decision

- **C4.5** is the primary model and the only one used at runtime.
- **SVM**, **Gaussian Naive Bayes**, and **Random Forest** are comparators, evaluated offline
  on the same features, split, and metrics ([ML](../ML.md) section 8).
- The runtime tree is exported to JSON and evaluated in plain Python, so it needs no machine
  learning library. Confidence is leaf purity; the rule path of each prediction is stored.
- The six model features are Mean R, Mean G, Mean B, pH, EC, and temperature.

## Consequences

- Every result comes with a readable rule path that the dashboard and the advisor can use.
- A comparator may score higher on the final data. That result is reported as a finding. Changing
  the primary model is a deliberate decision with the supervisor and a new ADR that supersedes
  this one, because the title names C4.5.
- A single tree can be unstable on small data. Mitigations: pruning, grouped cross-validation,
  and the frame stabiliser ([ML](../ML.md) sections 6.1 and 6.3).
- Comparator models are not deployed, so their libraries are not runtime dependencies.

## Alternatives considered

| Option                                               | Why not                                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Pick whichever model scores highest                  | Conflicts with the project title; loses the readable rule path; the best model on a tiny dataset is unreliable |
| Random Forest at runtime                             | Accurate but not human-readable per prediction                                                                 |
| Deep learning or object detection (for example YOLO) | Needs much more labelled data and compute; not justified by the dataset                                        |
| Run all four models and vote                         | Adds complexity; kept only as an optional consensus check, off by default                                      |
