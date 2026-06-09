# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start both servers: ui5 serve (port 8080) + json-server (port 3001)
npm start        # UI5 dev server only
npm run server   # json-server only — watches db.json
npm run build    # Production build → dist/
```

## Architecture

The app follows the standard SAP Fiori MVC pattern via OpenUI5.

**Bootstrap flow:** `index.html` → loads UI5, instantiates `Component.js` via `ComponentSupport` → Component creates the JSONModel, fetches todos from the API, then calls `getRouter().initialize()` → router navigates to the `main` route → injects `Main.view.xml` into the `<App id="app">` control in `App.view.xml`.

**Two-server setup:**
- `ui5 serve` (8080) — serves the webapp files
- `json-server` (3001) — REST API backed by `db.json`; CORS is enabled by default so the browser fetches directly to port 3001

**Model:** A single `JSONModel` is created in `Component.js` and set on the component. All views inherit it automatically. Properties: `/todos` (array), `/newTodo`, `/newDueDate`, `/activeCount`.

**Routing:** Defined in `manifest.json`. Two routes — `main` (pattern `""`) and `detail` (pattern `"detail/{id}"`). Both target views are injected into the `<App>` NavContainer. The `controlId` in routing config must be `"app"` (not `"app--app"`) when served via `ui5 serve` — the tooling controls id generation making it predictable.

**Detail page state:** On `itemPress`, `Main.controller.js` calls `router.navTo("detail", { id })`. `Detail.controller.js` listens via `attachPatternMatched`, finds the index of the matching todo in `/todos`, and calls `this.getView().bindElement("/todos/" + iIndex)` — this binds the entire view's context to that one object so `{title}`, `{done}`, `{dueDate}` resolve without path prefixes.

**Persistence:** All mutations (add, toggle, delete, clear) call the json-server API directly with `fetch`. Strategy is optimistic: model updates immediately, API call fires in background. POST waits for the response to use the server-assigned `id`.

**Formatters:** Each controller that displays dates has its own `formatDate(sValue)` method. It parses the stored `yyyy-MM-dd` string and returns a locale-aware medium-style string via `sap.ui.core.format.DateFormat`.
