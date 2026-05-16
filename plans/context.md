# Project Context

This file is the stable, high-level repository context for future sprint plans. It should reflect what is already in the codebase, what the product is intended to become, and which areas are still incomplete.

## What We Are Building

Polaris is a Cursor-like web IDE and code workspace product built with Next.js, Convex, Clerk, Inngest, Firecrawl, Sentry, and related UI/tooling.

The repo is structured around authenticated project workspaces. The current codebase already contains the dashboard shell and the beginnings of a project workspace surface, with supporting backend and integration pieces in place for later IDE features.

## Product Goal

The intended final product is a deployment-ready portfolio app for building in the browser. At a high level, it is meant to support:

- authenticated users
- a project dashboard
- a browser-based IDE workspace
- a file explorer
- a code editor
- AI assistant and agent features
- a conversation system
- tool execution
- terminal and preview via WebContainers
- GitHub import and export
- billing and subscription polish
- deployment-ready portfolio app presentation

These goals are the product direction implied by the repository structure and course progression, not finished functionality in the current codebase.

## Current Course/Build Progress

The repository appears to be completed roughly through the Projects phase. The IDE Layout phase has only been started as a placeholder/shell, and later phases are not yet implemented.

Course order:

1. Intro
2. Project Setup
3. Authentication
4. Database Setup
5. Background Jobs
6. Firecrawl AI
7. Error Tracking
8. Projects
9. IDE Layout
10. File Explorer
11. Code Editor State
12. AI Features
13. Conversation System
14. AI Agent Tools
15. Webcontainers Terminal Preview
16. Github Import & Export
17. Billing & Final Polish
18. Deployment

Current mapping to the repo:

- Intro through Authentication are represented by the app shell, Clerk wiring, and protected routes.
- Database Setup is represented by Convex schema, queries, and mutations for projects.
- Background Jobs is present as Inngest wiring, but only demo functions exist today.
- Firecrawl AI is present as a Firecrawl helper, but it is not wired into a finished user flow.
- Error Tracking is present through Sentry configuration and instrumentation.
- Projects is implemented as the dashboard, project creation, project listing, and project navigation.
- IDE Layout has begun with a project route that renders a VS Code-like placeholder shell.
- File Explorer, Code Editor State, AI Features, Conversation System, AI Agent Tools, Webcontainers Terminal Preview, GitHub Import & Export, Billing & Final Polish, and Deployment are not yet implemented.

## Sprint 09 Progress

The IDE Layout sprint has now been implemented at the shell level.

Completed in this sprint:

- the project route was aligned to `src/app/projects/[projectId]`
- the project page now renders through a project-level layout and workspace view
- the global `UserButton` was removed from the app shell and moved into the project navbar
- Convex now exposes authenticated `getById` and `rename` project operations
- project hooks now include single-project loading and rename mutation support
- the IDE layout now uses `allotment` for resizable split panes
- the navbar now includes the project title, inline rename, save/import status, and user menu
- the workspace view now contains Code and Preview placeholder tabs plus inert GitHub export UI

This sprint still intentionally leaves later course sections unimplemented.

## Current Architecture

- Next.js App Router structure under `src/app`
- Convex backend, schema, queries, mutations, and generated API bindings under `convex`
- Clerk authentication and route protection
- Inngest background job client and functions
- Firecrawl integration wrapper
- Sentry error tracking and request instrumentation
- feature-based frontend folders under `src/features`
- shadcn-style UI components under `src/components/ui`

## Instructor Dependency Baseline

Future sprint work should only introduce or align dependencies from the instructor-approved package baseline provided by the user. Treat that list as the canonical source when adding new packages or matching versions.

Relevant examples from that baseline:

- IDE layout: `allotment@^1.20.5`
- Auth and backend: `@clerk/nextjs@^6.36.5`, `convex@^1.31.2`, `inngest@^3.49.3`, `@inngest/agent-kit@^0.13.2`
- AI and scraping: `ai@^6.0.6`, `@ai-sdk/anthropic@^3.0.1`, `@ai-sdk/google@^3.0.1`, `@mendable/firecrawl-js@^4.10.0`
- Editor/runtime: `codemirror@^6.0.2`, `@webcontainer/api@^1.6.1`, `@xterm/addon-fit@^0.11.0`, `@xterm/xterm@^6.0.0`
- UI and state: `lucide-react@^0.562.0`, `react-icons@^5.5.0`, `date-fns@^4.1.0`, `zustand@^5.0.9`

If the local `package.json` differs from that instructor baseline, future sprint work should prefer the instructor list when introducing new dependencies or reconciling version drift.

## Important Existing Features

- app shell and root layout
- auth provider wiring
- project dashboard
- project creation and listing
- project route
- basic IDE placeholder page
- Convex project model
- demo Inngest functions
- Firecrawl helper
- Sentry setup

## Known Incomplete Areas

These are explicitly not done yet:

- real IDE layout implementation
- persistent file explorer
- code editor state
- AI assistant features
- conversation/message system
- AI agent tools
- WebContainers terminal and preview
- GitHub import/export
- billing
- deployment polish

## Cleanup Notes Before Future Sprint Work

Future cleanup should verify:

- auth redirects and routes
- Convex project ownership checks
- project detail query
- lint and typecheck health
- hardcoded env and config values
- demo-only Inngest functions
- Sentry env setup
- `.env.example` completeness

This section is context only. It is not a cleanup sprint plan and should not be treated as implementation guidance.

## How Future Sprint Plans Should Use This File

Each sprint plan should:

- read this context first
- focus only on its assigned course section
- avoid jumping ahead to later phases
- define the exact files to inspect or change
- define acceptance criteria clearly
- preserve existing working functionality
- update this context only when the repository architecture or a milestone actually changes

## Non-Goals For Context File

This file should not contain:

- implementation details for future features
- speculative architecture
- long code snippets
- secrets or env values
- completed claims for unfinished features
