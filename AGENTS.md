# AGENTS.md

Guidance for Codex and other AI coding agents working in this repository.

## Project Context

Storycraft is an early-stage AI SaaS project. The technical stack, build commands,
test commands, deployment flow, and project structure are not established yet.

Do not invent project conventions. When a stack or workflow is added, update this
file with the exact commands and constraints agents should follow.

## Working Rules

- Inspect the repository before making changes.
- Keep edits small, focused, and tied to the user's request.
- Prefer existing project patterns once they exist.
- Do not assume frameworks, package managers, services, database choices, or test
  commands until they are present in the repo.
- Do not perform destructive operations unless the user explicitly asks for them.
- Preserve user work and unrelated local changes.
- Do not modify generated, vendored, or build output files unless the task clearly
  requires it.

## Development Commands

No canonical commands are defined yet.

When commands are introduced, document them here. Include at minimum:

- how to install dependencies;
- how to run the app locally;
- how to run tests;
- how to run linting or formatting;
- how to build for production.

## Verification

Before finishing a task:

- run the relevant tests or checks if they exist;
- if no checks exist, say that clearly in the final response;
- summarize the commands run and the result.

## Communication

- State assumptions when the repo does not provide an answer.
- Report important constraints or missing setup instead of silently guessing.
- Mention files changed and verification performed in the final response.
