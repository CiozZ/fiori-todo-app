# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start both servers: fiori run (port 8080) + json-server (port 3001)
npm start            # UI5/Fiori dev server only — opens FLP sandbox
npm run start-noflp  # Dev server only — opens index.html directly (no FLP)
npm run server       # json-server only — watches db.json on port 3001
npm run build        # Production build → dist/ (bundles UI5 + app code)
```

For Docker:
```bash
docker build -t fiori-todo-app:latest -f Dockerfile .
docker build -t fiori-todo-api:latest -f Dockerfile.api .
docker save fiori-todo-app:latest | gzip > fiori-todo-app.tar.gz
docker save fiori-todo-api:latest | gzip > fiori-todo-api.tar.gz
docker compose up -d --build   # Run locally with docker-compose.yml
```

## Architecture

The app follows the standard SAP Fiori MVC pattern via OpenUI5.

**Bootstrap flow:** `index.html` → loads UI5 via `fiori-tools-proxy` (proxied from ui5.sap.com) → instantiates `Component.js` via `ComponentSupport` → Component creates the JSONModel, fetches todos from `/todos`, then calls `getRouter().initialize()` → router navigates to the `main` route → injects `Main.view.xml` into the `<App id="app">` NavContainer in `App.view.xml`.

**Two-server setup (dev):**
- `fiori run` (8080, `@sap/ux-ui5-tooling`) — serves webapp files with live reload; `fiori-tools-proxy` forwards `/todos` to port 3001 and proxies UI5 resources from ui5.sap.com
- `json-server` (3001) — REST API backed by `db.json`

**API URL:** All three controllers use `var API = "/todos"` (relative). In dev, `fiori-tools-proxy` handles the forwarding. In Docker, nginx proxies `/todos` to the `api` container (service name resolved by Docker DNS).

**Model:** A single `JSONModel` is created in `Component.js` and set on the component. All views inherit it automatically. Properties: `/todos` (array), `/newTodo`, `/newDueDate`, `/activeCount`. The component tries `fetch("/todos")` first; falls back to localStorage then hardcoded defaults if the API is unreachable.

**Routing:** Defined in `manifest.json`. Two routes — `main` (pattern `""`) and `detail` (pattern `"detail/{id}"`). The `controlId: "app"` works correctly with `fiori run` / `ui5 serve` because the tooling controls component ID generation. It breaks with plain static file servers (Python http.server etc.) due to unpredictable ID prefixing.

**Detail page state:** On `itemPress`, `Main.controller.js` calls `router.navTo("detail", { id })`. `Detail.controller.js` listens via `attachPatternMatched`, finds the matching todo index in `/todos`, and calls `this.getView().bindElement("/todos/" + iIndex)` — this binds the entire view context to that object so `{title}`, `{done}`, `{dueDate}` resolve without path prefixes.

**Persistence:** All mutations call the json-server API with `fetch`. Strategy is optimistic: model updates immediately, API call fires in background. POST waits for the response to use the server-assigned `id`. On the Detail page, `Switch` two-way binding updates the model automatically; `onToggleDone` only needs to PATCH the API and recompute `activeCount`.

**Formatters:** Each controller has its own `formatDate(sValue)` method — parses the stored `yyyy-MM-dd` string and returns a locale-aware medium-style string via `sap.ui.core.format.DateFormat`. No shared formatter module; duplication is intentional for simplicity.

**Docker:** Two images. `Dockerfile` is multi-stage — Node.js builds via `ui5 build -a` (bundles all UI5 framework files into `dist/`), nginx serves the result. `Dockerfile.api` runs json-server; `start-api.sh` seeds `/data/db.json` from the image's copy on first run. `docker-compose.synology.yml` references pre-imported images by name (no build context) for use in Synology Container Manager.
