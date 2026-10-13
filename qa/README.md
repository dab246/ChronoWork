# QA gate

Every pull request runs the [QA Agent Kit](https://github.com/dab246/qa-agent-kit)
release gate ([`.github/workflows/qa-gate.yml`](../.github/workflows/qa-gate.yml)).
It traces the product rules to tests and decides **GO** or **NO_GO**; the job
summary shows why.

| File | What it holds | Who updates it |
| --- | --- | --- |
| [`source-manifest.yaml`](source-manifest.yaml) | Phase 0: ADR-0002 and SECURITY.md, pinned by sha256 | maintainer, when the rules change |
| [`test-packs/chronowork.md`](test-packs/chronowork.md) | Test cases: automated ones link Vitest tests, manual ones describe steps | whoever changes behaviour |
| [`qa-route.yaml`](qa-route.yaml) | Route (S0): scope, risk, gaps, intake and cost/value decisions | maintainer |
| [`manual-results.yaml`](manual-results.yaml) | Manual E2E results on the deployed app | the tester |
| [`release-policy.yaml`](release-policy.yaml) | What blocks a release | maintainer |

## Sign-offs still open

The gate reports **NO_GO (needs review)** until these are done:

1. **Phase 0.** Read ADR-0002 and SECURITY.md, set both sources to `status: VERIFIED`,
   resolve the assumption (`resolved: true`) and set
   `approval: { status: APPROVED, approvedBy: dab246, approvedAt: <date> }`.
2. **Intake and cost/value.** In `qa-route.yaml` set `intake.status: ACCEPTED` and
   `costValue.decision: GO` (add `decidedBy` / `decidedAt`).
3. **Manual E2E.** Run TC-E2E-001 to TC-E2E-005 on https://dab246.github.io/ChronoWork/
   and record each result in `manual-results.yaml`.
4. Make **QA gate / release gate** a required status check for `main`.

## When things change

- **ADR-0002 or SECURITY.md edited:** the gate blocks with "changed since approval".
  Run `qa-agent-kit sources rehash -c qa/qa-agent-kit.yaml`, review, approve again.
- **A test renamed or moved:** the gate reports a traceability gap; update the
  `Automation:` link (copy the key from `run.json` in the run artifacts).
- **New rule or feature:** add a case to the test pack, linked to its tests, or a
  manual case.

Run it locally (with a kit checkout next to this repo):

```bash
bunx vitest run --reporter=default --reporter=junit --outputFile.junit=qa/reports/unit-junit.xml
node ../qa-agent-kit/dist/cli/main.js run -c qa/qa-agent-kit.yaml --ci local
```
