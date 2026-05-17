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

The repository is completed through Sprint 13: Conversation System at the implementation level. The IDE Layout, File Explorer, Code Editor State, all three AI Features sub-sprints 12A, 12B, and 12C, and the Conversation System foundation now exist as working workspace foundations, while later phases are still intentionally unimplemented.

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
- IDE Layout is implemented as a project route shell with split panes, project navbar, and editor workspace chrome.
- File Explorer is implemented with Convex-backed files/folders, recursive tree rendering, folder CRUD, and file open/delete wiring into editor tabs.
- Code Editor State is implemented with project-scoped tab state, preview vs pinned tabs, breadcrumbs, CodeMirror 6 editing, autosave, and binary-file placeholders.
- AI Features is fully implemented for Sprint 12, with Ollama-backed editor suggestions, quick-edit rewriting, a selection action tooltip, and final request-path hardening now wired into the editor. Sprint 12 is complete in full, including 12A, 12B, and 12C. Conversation System is implemented as a storage-first foundation with conversation/message persistence, a sidebar, a send-message route, internal Convex system functions, and an Inngest processing stub. AI Agent Tools, Webcontainers Terminal Preview, GitHub Import & Export, Billing & Final Polish, and Deployment are not yet implemented.

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

## Sprint 10 Progress

The File Explorer sprint has now been implemented.

Completed in this sprint:

- Convex now includes a `files` table and file-tree queries/mutations
- recursive file/folder explorer rendering now exists inside the Code tab
- folder expand/collapse, create, rename, and delete behaviors work in the tree
- file rows now open the editor workspace instead of acting as placeholders
- deleting files closes associated tabs when needed
- project `updatedAt` now advances when file trees change

## Sprint 11 Progress

The Code Editor State sprint has now been implemented.

Completed in this sprint:

- project-scoped editor tab state now tracks open tabs, active tab, and preview tab
- single-click opens preview tabs and double-click pins files
- tab closing, active-tab switching, and delete-driven tab cleanup now work
- editor breadcrumbs resolve paths from the file tree
- CodeMirror 6 now renders text files with OneDark, language-aware highlighting, minimap, indentation markers, and tab indentation support
- editor autosave writes file content back to Convex with debounce and cleanup on active-file change/unmount
- binary/storage-backed files render an unsupported placeholder instead of text editing UI
- the conversation sidebar now defaults closed and can be toggled from the workspace header
- the dashboard "Recently Updated" section now sorts by `updatedAt`, and file saves optimistically update project recency in the dashboard caches

This sprint still intentionally leaves later course sections unimplemented.

## Sprint 12A Progress

The AI Suggestions Foundation sub-sprint has now been implemented.

Completed in this sub-sprint:

- the app shell now mounts Sonner to support editor-surface AI failure toasts
- a new authenticated `POST /api/suggestion` route now validates request bodies and generates code suggestions through Ollama
- shared Zod schemas now define the suggestion request and response contract
- CodeMirror now includes a ghost-text suggestion extension with debounce, `AbortController` cancellation, and Tab-to-accept behavior
- a root `.env.example` now documents the Ollama suggestion env placeholders
- optimistic cache timestamps from earlier project/file hooks were adjusted to satisfy current lint purity rules without losing immediate recency updates

This sub-sprint still intentionally leaves Quick Edit, Firecrawl-backed editing, selection tooltips, Add to Chat, conversations, and agent tooling unimplemented.

## Sprint 12B Progress

The Quick Edit + Firecrawl sub-sprint has now been implemented.

Completed in this sub-sprint:

- the editor now supports a `Cmd/Ctrl+K` quick-edit tooltip for non-empty selections
- a new authenticated `POST /api/ai/quick-edit` route validates request bodies and returns structured replacement text
- bounded Firecrawl URL extraction and scraping now support quick-edit prompts that reference external URLs
- quick-edit requests are cancellable and selected code is replaced atomically on success
- the quick-edit server path uses the existing Ollama-backed AI integration style instead of introducing a separate hosted provider
- quick-edit and suggestion generation now prefer structured JSON output with `think: false`, and suggestion failures are logged in development rather than surfaced as noisy toasts

This sub-sprint still intentionally leaves the selection tooltip action UI, Add to Chat behavior, conversations, and agent tooling unimplemented.

## Sprint 12C Progress

The Selection Tooltip + Hardening sub-sprint has now been implemented.

Completed in this sub-sprint:

- the editor now shows a lightweight selection tooltip for non-empty selections
- the selection tooltip exposes Quick Edit directly from the selected code
- Add to Chat is now present as a visual-only placeholder and does not introduce conversation behavior yet
- quick-edit and suggestion request aborts are now treated as expected cancellations instead of noisy server failures
- Firecrawl timeout cleanup is now explicit so timed requests do not leave stray timeout state behind

This sub-sprint still intentionally leaves real conversation flows, agent tooling, Webcontainers Terminal Preview, GitHub Import & Export, Billing & Final Polish, and Deployment unimplemented.

## Sprint 13 Progress

The Conversation System sprint has now been implemented as a storage-first foundation.

Completed in this sprint:

- Convex now has `conversations` and `messages` tables with project-scoped ownership checks
- public conversation queries and creation support now exist in `convex/conversations.ts`
- internal-key-protected system functions now exist for route and background-job use
- the project IDE shell now mounts a real conversation sidebar instead of a placeholder
- the sidebar supports creating a conversation, sending a message, and rendering user/assistant message rows
- the `/api/messages` route now creates user messages and assistant processing placeholders
- the Inngest processing stub now marks assistant responses completed after a delay and applies a friendly fallback on failure
- the project conversation boundary remains storage-first; full history dialog, full cancellation, and the real AI/tool loop are still deferred

This sprint still intentionally leaves past-conversation history, full cancellation, real AI response generation, AI agent tools, tool loops, WebContainers terminal and preview, GitHub import/export, Billing & Final Polish, and Deployment unimplemented.

## Current Architecture

- Next.js App Router structure under `src/app`
- Convex backend, schema, queries, mutations, and generated API bindings under `convex`
- Clerk authentication and route protection
- Inngest background job client and functions
- Firecrawl integration wrapper
- Sentry error tracking and request instrumentation
- feature-based frontend folders under `src/features`
- shadcn-style UI components under `src/components/ui`
- project workspace state managed with Zustand
- editor runtime built on CodeMirror 6 extensions
- editor AI suggestion path via app route plus CodeMirror ghost-text extension
- dedicated Ollama helper for editor suggestions through `src/lib/ollama.ts`
- quick-edit AI path via `src/app/api/ai/quick-edit/route.ts` plus CodeMirror quick-edit tooltip extension
- selection action UI via a dedicated CodeMirror selection-tooltip extension
- conversation/message persistence through Convex plus an Inngest processing stub

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

## Sprint 14: Token Efficiency Requirement

This sprint uses local Ollama only. Keep prompts, tool output, retries, and loops small, but do not remove any required feature.

- Use only recent conversation context, ideally the last 6-10 messages, and exclude processing placeholders.
- Do not send all project files to the model. Call `list-files` first, then read only the files needed.
- Keep `list-files` lightweight: return only `id`, `name`, `type`, and `parentId`, with folders first and files second.
- Keep `read-files` selective and bounded. Require explicit file IDs and truncate very large files instead of dumping everything.
- Keep tool results short and structured. Return IDs, names, and success/error status, not large raw payloads.
- Use a modest loop limit, around 8-12 iterations, and stop as soon as the assistant has a final answer with no more tool calls.
- Keep final responses concise and mention only what changed and which files were touched.
- Prefer a smaller Ollama model for title generation when configured, and the stronger local model for coding/tool work.
- If Ollama returns invalid tool JSON, retry once at most, then surface a recoverable error.
- Cancel existing processing for the project before starting a new message to avoid duplicate jobs.
- Keep destructive actions safe. If a delete or bulk action is ambiguous, ask a short clarification first.

Required features must remain intact:

- cancellation
- past conversations dialog
- title generation
- list files
- read files
- create file
- bulk create files
- create folder
- update file
- rename file/folder
- delete file/folder
- final assistant response update

Do not switch away from Ollama or introduce Anthropic, OpenAI, or Google providers.

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
