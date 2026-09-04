# CI and Branch Protection

`dev` is the integration branch and `main` is the protected release-ready branch. Use merge
commits for feature branches so contribution history remains visible.

## Required checks

| Pull request | Required checks | Coverage |
|---|---|---|
| feature → `dev` | `quality`, `compatibility-gate` | Repository tests plus 10 current-profile smoke projects |
| `dev` → `main` | `quality`, `compatibility-gate` | Every current/previous profile, stack, architecture, and applicable auth model |

Configure both branches to require pull requests, resolve conversations, reject force pushes and
deletions, and require branches to be current before merging. Restrict direct pushes to `main`.
Do not require individual matrix job names; require the stable `compatibility-gate` aggregator.

Required workflows intentionally have no path filters. A skipped workflow cannot report its check,
which can leave a required pull request waiting forever or accidentally encourage bypasses.

## Manual verification

`Generated compatibility` can be started with `workflow_dispatch`. Choose `full` before changing a
compatibility default or investigating a release candidate; choose `smoke` for a quick diagnostic.
The pull-request base branch still determines automatic scope: `dev` gets smoke, `main` gets full.

The quality suite runs once per revision. Matrix jobs only generate and verify projects, avoiding
the previous duplication of repository tests, content validation, and package dry-runs in every job.
