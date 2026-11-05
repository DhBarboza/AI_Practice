<!--
Sync Impact Report
Version: unversioned -> 1.0.0 (initial formal version; SQLite persistence governance established)
Modified principles:
- Segurança nas fronteiras -> Boundary Security
- Domínio previsível -> Predictable Domain
- Arquitetura em camadas -> Layered Architecture
- Qualidade verificável -> Verifiable Quality
- Especificações versionadas -> Versioned Specifications
Added sections: Additional Constraints; Development Workflow
Removed sections: none; existing guidance was carried into the template structure
Follow-up TODOs: none
-->

# OpsPilot Constitution

## Core Principles

### 1. Boundary Security
Validate external inputs and outputs with Zod at HTTP, CLI, and agent boundaries. Never read or
expose `.env` files or other secrets. This keeps untrusted data and credentials out of domain logic
and user-visible output.

### 2. Predictable Domain
Prefer pure functions for domain logic and isolate side effects, including HTTP and database access,
at application boundaries. Model business failures as domain error classes and translate them at
the HTTP or CLI edge.

### 3. Layered Architecture
Organize application code into Model, Service, and Controller layers. Keep responsibilities explicit
and prevent infrastructure concerns from leaking into domain behavior.

### 4. Verifiable Quality
Every new logic path MUST have `node:test` tests executed via `tsx`. `npm run typecheck` and
`npm test` MUST pass before changes are considered complete.

### 5. Versioned Specifications
Use the Spec Kit workflow for features and keep feature specifications, plans, and tasks versioned
with the code under `specs/`. Treat the project constitution as the source of permanent engineering
constraints.

## Additional Constraints

- Use Node.js 24 LTS and TypeScript ESM with `strict: true`.
- Use Express for the HTTP application and LangChain/LangGraph with OpenRouter for agent workflows.
- SQLite is the project's database for persistent operational data. Use Node.js `node:sqlite`
  (`DatabaseSync`) rather than a traditional database server such as MySQL.
- Keep database access behind store interfaces and application boundaries so domain logic remains
  predictable and testable.
- Never add secrets to source code, specifications, or test fixtures.

## Development Workflow

- For each feature, execute and review `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`,
  `/speckit-implement`, and `/speckit-converge` in that order; repeat convergence until confirmed.
- Add or update tests alongside the implementation, then run `npm run typecheck` and `npm test`.
- Review changes for constitution compliance, especially external-boundary validation, persistence
  through SQLite, and reproducible tests.

## Governance

This constitution supersedes conflicting project practices. Amendments MUST be documented in this
file, reviewed for compatibility with existing features, and applied with any required migration or
specification updates. Use semantic versioning: MAJOR for backward-incompatible principle changes,
MINOR for new principles or materially expanded requirements, and PATCH for clarifications and
non-semantic refinements. Every change MUST update the version and last-amended date. Feature
reviews MUST verify compliance with these rules; any exception requires explicit justification in
the relevant specification.

**Version**: 1.0.0 | **Ratified**: 2026-10-26 | **Last Amended**: 2026-11-04
