---
name: codex-review
description: Run one independent, read-only Codex review of the current uncommitted change after implementation and targeted validation. Invoke only when the user requests a final review.
disable-model-invocation: true
allowed-tools: Bash(codex review --uncommitted)
---

Run this workflow only after the implementation is coherent and the relevant validation has completed.

1. Run `codex review --uncommitted` exactly once from the repository root.
2. Do not modify files while reviewing.
3. Report only actionable correctness, security, regression, or missing-test findings. Separate confirmed findings from suggestions.
4. If there are no findings, say so plainly. Do not invent issues or repeat the review output verbatim.
