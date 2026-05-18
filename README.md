  # Polaris

  Polaris is an AI-powered coding workspace built with Next.js, Convex, Clerk, Inngest, and WebContainers. It gives you a project dashboard, file explorer, code editor, AI chat, live preview, and GitHub import/export flows in one place.

  ## Features

  - Project dashboard with search, create, rename, and delete actions
  - File explorer with folders, text files, and binary file support
  - Code editor powered by CodeMirror
  - AI chat for project-aware coding assistance
  - AI suggestion and quick-edit endpoints
  - Live in-browser preview using WebContainers
  - Project settings for preview install/dev commands
  - GitHub import from existing repositories
  - GitHub export back to a new repository
  - Clerk authentication with GitHub OAuth integration
  - Inngest-powered background workflows
  - Convex for realtime data, storage, and mutations

  ## Tech Stack

  - Next.js 16
  - React 19
  - TypeScript
  - Convex
  - Clerk
  - Inngest
  - WebContainers
  - CodeMirror
  - Tailwind CSS
  - shadcn/ui
  - Sentry
  - Ollama / OpenAI / Google AI SDK integrations
  - Firecrawl

  ## Getting Started

  ### Prerequisites

  - Node.js 20+ recommended
  - npm
  - A Convex project
  - A Clerk application
  - GitHub OAuth configured in Clerk
  - API keys for the services you want to use

  ### Installation

  bash
  git clone https://github.com/ughsal/polaris
  cd polaris
  npm install

  ### Environment Variables

  Create a .env.local file based on .env.example.

  NEXT_PUBLIC_CONVEX_URL=
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
  CLERK_SECRET_KEY=
  FIRECRAWL_API_KEY=
  GOOGLE_GENERATIVE_AI_API_KEY=
  OLLAMA_BASE_URL=http://0.0.0.0:11434
  OLLAMA_MODEL=nemotron-3-super:cloud
  POLARIS_CONVEX_INTERNAL_KEY=

  Notes:

  - POLARIS_CONVEX_INTERNAL_KEY should be a strong random secret you generate yourself.
  - GitHub import/export expects the authenticated user to connect GitHub in Clerk and grant repo access.
  - If you are not using Ollama locally, update OLLAMA_BASE_URL and OLLAMA_MODEL accordingly.

  ### Development

  npm run dev

  Open:

  http://localhost:3000

  ### Build

  npm run build
  npm run start

  ### Lint

  npm run lint

  ## How It Works

  - The home page is the project dashboard.
  - Creating or importing a project opens the project workspace.
  - Each project contains:
      - a file explorer
      - a code editor
      - an AI conversation sidebar
      - a live preview tab
  - Preview settings let you control the install and dev commands used by WebContainers.
  - GitHub import/export runs through Inngest background jobs and Convex system mutations.

  ## GitHub Import and Export

  ### Import

  Paste a GitHub repository URL into the import dialog. Polaris will:

  - validate the URL
  - verify GitHub is connected in Clerk
  - create a new project
  - import the repository files into Convex
  - mark import progress on the project

  ### Export

  From a project, open the export menu and create a new GitHub repository. Polaris will:

  - validate repository settings
  - verify GitHub access
  - create a new repo
  - push the project files
  - update the project export status

  ## Project Structure

  - src/app - Next.js app routes and API routes
  - src/features/projects - dashboard, project workspace, GitHub import/export
  - src/features/editor - editor UI and extensions
  - src/features/conversations - AI chat and message processing
  - src/features/preview - WebContainer preview runtime
  - convex - database schema, mutations, and system helpers

  ## Deployment Notes

  Make sure the following are configured in production:

  - Convex deployment
  - Clerk auth keys and GitHub OAuth
  - Inngest
  - Sentry
  - AI provider credentials
  - Firecrawl credentials if using quick edit features
  - POLARIS_CONVEX_INTERNAL_KEY
