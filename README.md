# Crayon Colorizer

Automated and manual HTTP traffic coloring with batch context-menu actions and a settings UI.

## Domain Context

- **Rule-Based Coloring**: Implements automated coloring rules based on response metadata (status, content-type).
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
│       ├── index.ts          # Settings slot registration, command/menu setup
│       └── src/
│           └── components/
│               └── Configuration.vue # Vue settings UI + preview
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

TypeScript | Vue 3 | Bun | Caido SDK 0.55+

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

## Releasing

To publish a new version of the plugin, follow these steps:

1. **Bump Version**: Update the version in `package.json` and `manifest.json`.
   ```json
   "version": "1.0.x"
   ```
2. **Commit and Push**:
   ```bash
   git add package.json manifest.json
   git commit -m "chore: bump version to 1.0.x"
   git push origin main
   ```
3. **Create Tag**: Push a tag matching `v*` to trigger the release workflow.
   ```bash
   git tag v1.0.x
   git push origin v1.0.x
   ```
4. **Automated Release**: GitHub Actions will automatically:
   - Build the plugin.
   - Sign the package using the `PRIVATE_KEY` secret.
   - Create a new GitHub release with the signed `plugin_package.zip`.
