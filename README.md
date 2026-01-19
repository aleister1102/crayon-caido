# Crayon Colorizer

Caido plugin for automated and manual HTTP traffic coloring. Mirrors the "Request Colorizer" workflow logic with extended support for context-menu batch operations and a dedicated settings UI.

## Domain Context

- **Workflow Parity**: Implements the same coloring rules as the standard Request Colorizer workflow.
- **Batch Processing**: Allows colorizing multiple selected requests simultaneously via context menus.
- **Auto-Coloring**: Background poller identifies and colors new history items based on response metadata.

## Architecture

### System Components
- **Backend (QuickJS)**: Handles the auto-coloring poller, GraphQL mutations, and RPC for settings.
- **Frontend**: Provides the settings UI and registers command/menu items.
- **API**: Communicates via Caido's plugin RPC system for settings and selection processing.

### Data Flow
1. **Manual**: User selects rows -> Frontend calls `applyCrayonColors` RPC -> Backend fetches response details -> Backend executes GraphQL `updateRequestMetadata`.
2. **Auto**: Backend poller query `sdk.requests` -> Checks Content-Type/Status -> Executes GraphQL `updateRequestMetadata`.

## Project Structure

```
Crayon/
├── src/
│   ├── backend/
│   │   └── src/index.ts      # Poller logic, GraphQL mutations, RPC handlers
│   └── frontend/
│       └── index.ts          # Settings UI (caido.ui), Command/Menu registration
├── dist/                     # Compiled JavaScript (QuickJS compatible)
├── scripts/
│   └── package.mjs           # Plugin packaging script
├── manifest.json             # Plugin definition and permissions
└── package.json              # Build scripts and dependencies
```

## Key Packages

| Package | Purpose |
|---------|---------|
| `src/backend/` | core logic, poller, graphql integration |
| `src/frontend/` | settings dashboard, live preview, commands |
| `@caido/sdk-backend` | Caido backend plugin types |
| `@caido/sdk-frontend` | Caido frontend plugin types |

## Key Conventions

- **No `console.info`**: Use `sdk.console.log` or `warn/error` (QuickJS backend limitation).
- **GraphQL Error Surfacing**: Always check for `errors` array in GraphQL responses to avoid silent failures.
- **Responsive UI**: Settings UI must be full-width and centered with a live preview panel.
- **Persistence**: fallback to in-memory persistence when durable storage is unavailable.

## Tech Stack

TypeScript | Bun | Caido SDK 0.54+

## Build & Package

```bash
# Install dependencies
bun install

# Build TypeScript to JS
bun run build

# Package for Caido (.zip)
bun run package
```

The resulting `dist/plugin_package.zip` can be installed directly into Caido.
