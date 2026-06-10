# Fiori To-Do App

A tutorial SAP Fiori application built with OpenUI5. Covers the core Fiori development patterns: MVC, XML views, data binding, routing, and REST API integration.

> **Full tutorial:** [tutorial.md](tutorial.md) — a step-by-step blog post covering everything from blank folder to running on a Synology NAS via Docker.

## Features

- Add, complete, and delete tasks
- Optional due date per task (formatted with `sap.ui.core.format.DateFormat`)
- Filter tasks by All / Active / Done
- Detail page per task with a done toggle
- Data persisted to a `json-server` REST backend (`db.json`)
- Dark theme (`sap_horizon_dark`)

## Project structure

```
fiori-tutorial-1/
├── db.json                         # json-server database (source of truth)
├── package.json
├── ui5.yaml                        # UI5 Tooling config (framework, libraries)
└── webapp/
    ├── index.html                  # Bootstrap entry point
    ├── Component.js                # UIComponent — creates model, starts router
    ├── manifest.json               # App descriptor: routing, models, i18n, CSS
    ├── view/
    │   ├── App.view.xml            # Root shell (Shell + App container)
    │   ├── Main.view.xml           # To-do list page
    │   └── Detail.view.xml        # Single task detail page
    ├── controller/
    │   ├── App.controller.js       # Minimal shell controller
    │   ├── Main.controller.js      # List logic + navigation
    │   └── Detail.controller.js   # Route matching, bindElement, done toggle
    ├── i18n/
    │   └── i18n.properties         # All UI text (localisation-ready)
    └── css/
        └── style.css               # Done strikethrough, due date styling
```

## Prerequisites

- Node.js 22+
- `@ui5/cli` and `json-server` (installed via `npm install`)

## Getting started

```bash
# Install dependencies
npm install

# Start both the UI5 dev server (port 8080) and the API server (port 3001)
npm run dev
```

Open **http://localhost:8080**

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts UI5 dev server + json-server together |
| `npm start` | Starts UI5 dev server only (port 8080) |
| `npm run server` | Starts json-server only (port 3001) |
| `npm run build` | Produces a self-contained production build in `dist/` |

## API

json-server exposes a standard REST API on port 3001:

| Method | Path | Description |
|---|---|---|
| GET | `/todos` | List all tasks |
| POST | `/todos` | Create a task (id auto-assigned) |
| PATCH | `/todos/:id` | Partial update (e.g. `{ done: true }`) |
| DELETE | `/todos/:id` | Delete a task |

Changes are written back to `db.json` automatically.

## Docker (Synology)

Two images: `fiori-todo-app` (nginx serving the built app) and `fiori-todo-api` (json-server). nginx proxies `/todos` to the API container internally — only port 8080 is exposed.

```bash
# Build and export images for Synology
docker build -t fiori-todo-app:latest -f Dockerfile .
docker build -t fiori-todo-api:latest -f Dockerfile.api .
docker save fiori-todo-app:latest | gzip > fiori-todo-app.tar.gz
docker save fiori-todo-api:latest | gzip > fiori-todo-api.tar.gz
```

Import both `.tar.gz` files in **Container Manager → Image → Add → Import from file**, then deploy using `docker-compose.synology.yml`.

See [tutorial.md](tutorial.md) for the full walkthrough.

## Key concepts covered

| Concept | Where to look |
|---|---|
| `JSONModel` + two-way binding | `Component.js`, `Main.view.xml` |
| XML views and MVC | `view/` and `controller/` folders |
| Template binding (`items="{/todos}"`) | `Main.view.xml` — List control |
| Expression binding | `class="{= ${done} ? 'todoItemDone' : 'todoItem'}"` |
| Formatter function | `formatDate` in each controller |
| `sap.ui.model.Filter` | `_applyFilter()` in `Main.controller.js` |
| Routing + `navTo` | `manifest.json` routing section, `Main.controller.js` |
| `bindElement` | `Detail.controller.js` — binds the view to one todo |
| `DatePicker` with `valueFormat`/`displayFormat` | `Main.view.xml` toolbar |
| `sap.ui.core.format.DateFormat` | `formatDate()` in controllers |
| i18n resource model | `i18n/i18n.properties`, `{i18n>key}` bindings in views |
| REST API with `fetch` | All controllers — POST / PATCH / DELETE |
