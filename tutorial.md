# Building a Fiori To-Do App and Deploying it to Synology NAS

This is a full walkthrough of building a real SAP Fiori application from scratch — a To-Do app with a REST backend — and deploying it as a Docker container on a Synology NAS. No SAP backend required. No BTP account. Just Node.js, OpenUI5, and a NAS you already have.

By the end you will have:

- A dark-themed Fiori app with routing, data binding, a detail page, and due dates
- A json-server REST backend that persists data to a file
- Two Docker images running on your Synology, accessible from your local network

---

## Prerequisites

- **Node.js 22+** and **npm** — install via [NodeSource](https://github.com/nodesource/distributions)
- **@ui5/cli** and **@sap/ux-ui5-tooling** — installed below
- **Docker** — `curl -fsSL https://get.docker.com | sudo sh`
- A **Synology NAS** with Container Manager installed

---

## 1. Project structure

Create a folder and initialise it:

```bash
mkdir fiori-todo-app && cd fiori-todo-app
```

The final layout will be:

```
fiori-todo-app/
├── db.json                   # json-server database
├── package.json
├── ui5.yaml                  # UI5 Tooling config
├── Dockerfile                # App image (nginx)
├── Dockerfile.api            # API image (json-server)
├── nginx.conf
├── docker-compose.yml        # For building locally
├── docker-compose.synology.yml
├── start-api.sh
└── webapp/
    ├── index.html
    ├── Component.js
    ├── manifest.json
    ├── view/
    │   ├── App.view.xml
    │   ├── Main.view.xml
    │   └── Detail.view.xml
    ├── controller/
    │   ├── App.controller.js
    │   ├── Main.controller.js
    │   └── Detail.controller.js
    ├── i18n/
    │   └── i18n.properties
    └── css/
        └── style.css
```

---

## 2. package.json and tooling

```json
{
  "name": "todo",
  "version": "0.0.1",
  "description": "Fiori To-Do app",
  "scripts": {
    "start": "fiori run --open \"index.html\"",
    "server": "json-server --watch db.json --port 3001",
    "dev": "concurrently \"npm run start\" \"npm run server\"",
    "build": "ui5 build -a --clean-dest"
  },
  "devDependencies": {
    "@ui5/cli": "^4.0.0",
    "@sap/ux-ui5-tooling": "1",
    "json-server": "^0.17.4",
    "concurrently": "^10.0.0"
  }
}
```

Install:

```bash
npm install
```

---

## 3. ui5.yaml

This file tells the UI5 toolchain which libraries to use, how to serve the app locally, and how to proxy API requests so you don't hit CORS issues in development.

```yaml
specVersion: "4.0"
metadata:
  name: todo
type: application
framework:
  name: OpenUI5
  version: "1.120.0"
  libraries:
    - name: sap.m
    - name: sap.ui.core
    - name: sap.ui.layout
    - name: sap.ui.unified
    - name: themelib_sap_horizon
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        backend:
          - path: /todos
            url: http://localhost:3001
        ui5:
          path:
            - /resources
            - /test-resources
          url: https://ui5.sap.com
    - name: fiori-tools-appreload
      afterMiddleware: compression
      configuration:
        port: 35729
        path: webapp
        delay: 300
```

The `backend` entry is key: any request your app makes to `/todos` gets forwarded by the dev server to `http://localhost:3001` (json-server). In production, nginx handles the same proxy.

---

## 4. The database

json-server turns this JSON file into a full REST API automatically:

```json
{
  "todos": [
    { "id": 1, "title": "Learn Fiori basics",       "done": false, "dueDate": "2026-06-15" },
    { "id": 2, "title": "Build a To-Do app",         "done": false, "dueDate": "2026-06-20" },
    { "id": 3, "title": "Explore SAP UI5 controls", "done": false, "dueDate": "" }
  ]
}
```

Save this as `db.json` in the project root.

---

## 5. webapp/index.html

The entry point. The `data-sap-ui-bootstrap` script tag loads the UI5 core and wires up the component.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fiori To-Do</title>
  <style>
    html, body, body > div, #container, #container-uiarea { height: 100%; }
  </style>
  <script
    id="sap-ui-bootstrap"
    src="resources/sap-ui-core.js"
    data-sap-ui-theme="sap_horizon_dark"
    data-sap-ui-resourceroots='{"todo": "."}'
    data-sap-ui-oninit="module:sap/ui/core/ComponentSupport"
    data-sap-ui-compatVersion="edge"
    data-sap-ui-async="true"
    data-sap-ui-libs="sap.m">
  </script>
</head>
<body class="sapUiBody sapUiSizeCompact" id="content">
  <div data-sap-ui-component
       data-name="todo"
       data-id="container"
       data-settings='{"id" : "todo"}'
       data-handle-validation="true">
  </div>
</body>
</html>
```

The `data-sap-ui-theme="sap_horizon_dark"` gives the modern dark Horizon theme. `sapUiSizeCompact` makes controls smaller and denser — standard for desktop Fiori apps.

---

## 6. webapp/manifest.json

The app descriptor. Every Fiori app has one. It declares routing, models, dependencies, and CSS. Routing is the most important part here — it maps URL hash patterns to views.

```json
{
  "_version": "1.58.0",
  "sap.app": {
    "id": "todo",
    "type": "application",
    "title": "My To-Do App",
    "applicationVersion": { "version": "1.0.0" }
  },
  "sap.ui": {
    "technology": "UI5",
    "deviceTypes": { "desktop": true, "tablet": true, "phone": true }
  },
  "sap.ui5": {
    "rootView": {
      "viewName": "todo.view.App",
      "type": "XML",
      "async": true,
      "id": "app"
    },
    "dependencies": {
      "minUI5Version": "1.120.0",
      "libs": { "sap.m": {}, "sap.ui.core": {} }
    },
    "models": {
      "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": {
          "bundleName": "todo.i18n.i18n",
          "supportedLocales": [""],
          "fallbackLocale": ""
        }
      }
    },
    "resources": {
      "css": [{ "uri": "css/style.css" }]
    },
    "routing": {
      "config": {
        "routerClass": "sap.m.routing.Router",
        "type": "View",
        "viewType": "XML",
        "path": "todo.view",
        "controlId": "app",
        "controlAggregation": "pages",
        "async": true
      },
      "routes": [
        { "name": "main",   "pattern": "",             "target": ["main"] },
        { "name": "detail", "pattern": "detail/{id}",  "target": ["detail"] }
      ],
      "targets": {
        "main":   { "id": "main",   "name": "Main" },
        "detail": { "id": "detail", "name": "Detail" }
      }
    }
  }
}
```

> **Note on `controlId`:** The router injects views into the `<App>` NavContainer. The value `"app"` works correctly when using `fiori run` or `ui5 serve` because the tooling controls how component IDs are generated. It does **not** work with a plain Python or static file server — if you ever switch back to those, you will get a white screen.

---

## 7. webapp/Component.js

The UIComponent is the application's entry point. It creates the central `JSONModel`, loads todos from the API, and starts the router.

```javascript
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  var API = "/todos";

  var DEFAULT_TODOS = [
    { id: 1, title: "Learn Fiori basics",       done: false, dueDate: "2026-06-15" },
    { id: 2, title: "Build a To-Do app",         done: false, dueDate: "2026-06-20" },
    { id: 3, title: "Explore SAP UI5 controls", done: false, dueDate: "" }
  ];

  return UIComponent.extend("todo.Component", {
    metadata: { manifest: "json" },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      var oModel = new JSONModel({
        todos: [], newTodo: "", newDueDate: "", activeCount: 0
      });
      this.setModel(oModel);

      // Load todos from the API; fall back to localStorage or defaults
      fetch(API)
        .then(function (res) { return res.json(); })
        .then(function (aTodos) {
          oModel.setProperty("/todos", aTodos);
          oModel.setProperty("/activeCount",
            aTodos.filter(function (t) { return !t.done; }).length);
        })
        .catch(function () {
          var aTodos = DEFAULT_TODOS;
          try {
            var sSaved = localStorage.getItem("fiori-todo-items");
            if (sSaved) aTodos = JSON.parse(sSaved);
          } catch (e) { /* ignore */ }
          oModel.setProperty("/todos", aTodos);
          oModel.setProperty("/activeCount",
            aTodos.filter(function (t) { return !t.done; }).length);
        });

      this.getRouter().initialize();
    }
  });
});
```

The API URL is `/todos` — a relative path. The dev server proxies it to json-server; nginx does the same in Docker.

---

## 8. The root view and shell controller

`App.view.xml` is the navigation container. The router injects `Main` and `Detail` pages into `<App id="app">` at runtime.

**webapp/view/App.view.xml**

```xml
<mvc:View
  controllerName="todo.controller.App"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  displayBlock="true">
  <Shell>
    <App id="app" />
  </Shell>
</mvc:View>
```

**webapp/controller/App.controller.js**

```javascript
sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";
  return Controller.extend("todo.controller.App", {});
});
```

---

## 9. i18n and CSS

All user-visible text lives in one file. Bind it in views with `{i18n>key}`.

**webapp/i18n/i18n.properties**

```properties
appTitle=My To-Do List
inputPlaceholder=What needs to be done?
addButton=Add
filterAll=All
filterActive=Active
filterDone=Done
noItems=Nothing here. Add a task above!
dueDatePlaceholder=Due date (optional)
deleteButton=Delete task
clearCompleted=Clear Completed
detailTitle=Task Details
labelDueDate=Due Date
noDueDate=No due date set
labelStatus=Status
statusDone=Done
statusActive=Active
```

**webapp/css/style.css**

```css
.todoItem     { padding: 0 0.5rem; }
.todoItemDone { padding: 0 0.5rem; text-decoration: line-through; color: #8c8c8c; }
.dueDateText  { font-size: 0.75rem; color: #6a6a6a; }
```

---

## 10. Main view

This is where most of the Fiori concepts live. Read the comments carefully — each binding technique is labelled.

**webapp/view/Main.view.xml**

```xml
<mvc:View
  controllerName="todo.controller.Main"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  displayBlock="true">

  <Page title="{i18n>appTitle}" showNavButton="false">

    <!-- Filter tabs -->
    <subHeader>
      <Bar>
        <contentMiddle>
          <SegmentedButton id="filterBtn" selectionChange=".onFilterChange">
            <items>
              <SegmentedButtonItem key="all"    text="{i18n>filterAll}" />
              <SegmentedButtonItem key="active" text="{i18n>filterActive}" />
              <SegmentedButtonItem key="done"   text="{i18n>filterDone}" />
            </items>
          </SegmentedButton>
        </contentMiddle>
      </Bar>
    </subHeader>

    <content>
      <!-- Input toolbar -->
      <Toolbar>
        <Input
          id="newTodoInput"
          value="{/newTodo}"
          placeholder="{i18n>inputPlaceholder}"
          submit=".onAddTodo"
          width="55%" />
        <DatePicker
          value="{/newDueDate}"
          valueFormat="yyyy-MM-dd"
          displayFormat="MMM d, yyyy"
          placeholder="{i18n>dueDatePlaceholder}"
          width="11rem" />
        <Button text="{i18n>addButton}" type="Emphasized" press=".onAddTodo" />
      </Toolbar>

      <!--
        Template binding: items="{/todos}" creates one row per object in the array.
        type="Navigation" shows the chevron; itemPress fires when a row is tapped.
      -->
      <List
        id="todoList"
        items="{/todos}"
        noDataText="{i18n>noItems}"
        itemPress=".onItemPress">
        <CustomListItem type="Navigation">
          <HBox alignItems="Center" width="100%">

            <!-- Two-way binding: toggling this checkbox writes back to {done} immediately -->
            <CheckBox selected="{done}" select=".onToggleDone" />

            <VBox>
              <layoutData><FlexItemData growFactor="1" /></layoutData>
              <!-- Expression binding: switches CSS class based on runtime value -->
              <Text text="{title}" class="{= ${done} ? 'todoItemDone' : 'todoItem'}" />
              <!-- Formatter: controller method transforms "2026-06-15" → "Jun 15, 2026" -->
              <Text
                text="{path: 'dueDate', formatter: '.formatDate'}"
                visible="{= !!${dueDate} }"
                class="sapUiTinyMarginTop dueDateText" />
            </VBox>

            <Button
              icon="sap-icon://delete"
              type="Transparent"
              tooltip="{i18n>deleteButton}"
              press=".onDeleteTodo" />
          </HBox>
        </CustomListItem>
      </List>
    </content>

    <footer>
      <Bar>
        <contentLeft><Text text="{= ${/activeCount} + ' item(s) left'}" /></contentLeft>
        <contentRight>
          <Button text="{i18n>clearCompleted}" type="Transparent" press=".onClearCompleted" />
        </contentRight>
      </Bar>
    </footer>

  </Page>
</mvc:View>
```

---

## 11. Main controller

Every mutation calls the API immediately. Optimistic updates keep the UI responsive — the model changes first, then the request fires in the background.

**webapp/controller/Main.controller.js**

```javascript
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast",
  "sap/ui/core/format/DateFormat"
], function (Controller, Filter, FilterOperator, MessageToast, DateFormat) {
  "use strict";

  var API = "/todos";

  return Controller.extend("todo.controller.Main", {

    formatDate: function (sValue) {
      if (!sValue) return "";
      var oDate = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).parse(sValue);
      return oDate ? DateFormat.getDateInstance({ style: "medium" }).format(oDate) : "";
    },

    _updateActiveCount: function () {
      var oModel = this.getView().getModel();
      oModel.setProperty("/activeCount",
        oModel.getProperty("/todos").filter(function (t) { return !t.done; }).length);
    },

    _applyFilter: function () {
      var sKey = this.byId("filterBtn").getSelectedKey();
      var aFilters = [];
      if (sKey === "active") aFilters = [new Filter("done", FilterOperator.EQ, false)];
      if (sKey === "done")   aFilters = [new Filter("done", FilterOperator.EQ, true)];
      this.byId("todoList").getBinding("items").filter(aFilters);
    },

    onAddTodo: function () {
      var oModel = this.getView().getModel();
      var sTitle = oModel.getProperty("/newTodo").trim();
      if (!sTitle) { MessageToast.show("Please enter a task first."); return; }

      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: sTitle, done: false, dueDate: oModel.getProperty("/newDueDate") })
      })
      .then(function (res) { return res.json(); })
      .then(function (oCreated) {
        var aTodos = oModel.getProperty("/todos");
        aTodos.push(oCreated);
        oModel.setProperty("/todos", aTodos);
        oModel.setProperty("/newTodo", "");
        oModel.setProperty("/newDueDate", "");
        this._updateActiveCount();
        this._applyFilter();
      }.bind(this));
    },

    onToggleDone: function (oEvent) {
      var oCtx = oEvent.getSource().getBindingContext();
      fetch(API + "/" + oCtx.getProperty("id"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: oCtx.getProperty("done") })
      });
      this._updateActiveCount();
    },

    onDeleteTodo: function (oEvent) {
      var oCtx   = oEvent.getSource().getBindingContext();
      var iIndex = parseInt(oCtx.getPath().split("/").pop(), 10);
      fetch(API + "/" + oCtx.getProperty("id"), { method: "DELETE" });
      var oModel = this.getView().getModel();
      var aTodos = oModel.getProperty("/todos");
      aTodos.splice(iIndex, 1);
      oModel.setProperty("/todos", aTodos);
      this._updateActiveCount();
      this._applyFilter();
    },

    onClearCompleted: function () {
      var oModel = this.getView().getModel();
      var aTodos = oModel.getProperty("/todos");
      aTodos.filter(function (t) { return t.done; })
            .forEach(function (t) { fetch(API + "/" + t.id, { method: "DELETE" }); });
      oModel.setProperty("/todos", aTodos.filter(function (t) { return !t.done; }));
      this._updateActiveCount();
      this._applyFilter();
    },

    onFilterChange: function () { this._applyFilter(); },

    onItemPress: function (oEvent) {
      var iId = oEvent.getParameter("listItem").getBindingContext().getProperty("id");
      this.getOwnerComponent().getRouter().navTo("detail", { id: iId });
    }
  });
});
```

---

## 12. Detail view

`bindElement` (called in the controller) binds the entire view to one specific todo. Every binding — `{title}`, `{done}`, `{dueDate}` — resolves against that object without any path prefix.

**webapp/view/Detail.view.xml**

```xml
<mvc:View
  controllerName="todo.controller.Detail"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  displayBlock="true">

  <Page title="{i18n>detailTitle}" showNavButton="true" navButtonPress=".onNavBack">
    <content>
      <VBox class="sapUiMediumMargin">

        <ObjectHeader title="{title}" backgroundDesign="Transparent" />

        <VBox class="sapUiSmallMarginTop">
          <Label text="{i18n>labelDueDate}" />
          <Text text="{path: 'dueDate', formatter: '.formatDate'}" visible="{= !!${dueDate} }" />
          <Text text="{i18n>noDueDate}" visible="{= !${dueDate} }" />
        </VBox>

        <VBox class="sapUiSmallMarginTop">
          <Label text="{i18n>labelStatus}" />
          <Switch
            state="{done}"
            change=".onToggleDone"
            customTextOn="{i18n>statusDone}"
            customTextOff="{i18n>statusActive}" />
        </VBox>

      </VBox>
    </content>
  </Page>
</mvc:View>
```

**webapp/controller/Detail.controller.js**

```javascript
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/format/DateFormat"
], function (Controller, DateFormat) {
  "use strict";

  var API = "/todos";

  return Controller.extend("todo.controller.Detail", {

    onInit: function () {
      this.getOwnerComponent().getRouter()
        .getRoute("detail")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      var iId    = parseInt(oEvent.getParameter("arguments").id, 10);
      var aTodos = this.getView().getModel().getProperty("/todos");
      var iIndex = aTodos.findIndex(function (t) { return t.id === iId; });
      if (iIndex >= 0) {
        this.getView().bindElement("/todos/" + iIndex);
      } else {
        this.getOwnerComponent().getRouter().navTo("main");
      }
    },

    formatDate: function (sValue) {
      if (!sValue) return "";
      var oDate = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).parse(sValue);
      return oDate ? DateFormat.getDateInstance({ style: "medium" }).format(oDate) : "";
    },

    onToggleDone: function () {
      var oCtx  = this.getView().getBindingContext();
      var oModel = this.getView().getModel();
      fetch(API + "/" + oCtx.getProperty("id"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: oCtx.getProperty("done") })
      });
      oModel.setProperty("/activeCount",
        oModel.getProperty("/todos").filter(function (t) { return !t.done; }).length);
    },

    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("main", {}, true);
    }
  });
});
```

---

## 13. Run it locally

Start both servers with one command:

```bash
npm run dev
```

Open **http://localhost:8080**. The app loads, fetches todos from json-server, and you can add, complete, delete, and filter tasks. Every change is written back to `db.json` automatically.

The `fiori-tools-proxy` middleware forwards `/todos` requests from the browser to `http://localhost:3001`, so there are no CORS issues.

---

## 14. Docker — the app image

The `Dockerfile` uses a two-stage build. Stage one uses Node.js to build the UI5 app (`ui5 build -a` bundles everything including the UI5 framework files). Stage two copies only the compiled output into a lightweight nginx image.

**Dockerfile**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

**nginx.conf**

nginx does two things: serves the static UI5 app, and proxies `/todos` to the json-server container. The hostname `api` is the Docker Compose service name — Docker's internal DNS resolves it automatically.

```nginx
events {}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  server {
    listen 80;
    root /usr/share/nginx/html;

    location /todos {
      proxy_pass http://api:3001;
    }

    location / {
      try_files $uri $uri/ /index.html;
    }
  }
}
```

---

## 15. Docker — the API image

json-server needs `--host 0.0.0.0` to listen on all interfaces inside the container, not just localhost. The entrypoint script seeds `db.json` on the first run if the mounted volume is empty.

**Dockerfile.api**

```dockerfile
FROM node:22-alpine
RUN npm install -g json-server@0.17.4
COPY db.json /seed/db.json
RUN mkdir -p /data
COPY start-api.sh /start.sh
RUN chmod +x /start.sh
EXPOSE 3001
VOLUME ["/data"]
CMD ["/start.sh"]
```

**start-api.sh**

```bash
#!/bin/sh
if [ ! -f /data/db.json ]; then
  cp /seed/db.json /data/db.json
fi
exec json-server --watch /data/db.json --host 0.0.0.0 --port 3001
```

---

## 16. Docker Compose

**docker-compose.yml** — for building locally:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    depends_on:
      - api
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    volumes:
      - todo-data:/data
    restart: unless-stopped

volumes:
  todo-data:
```

**docker-compose.synology.yml** — for Synology (uses pre-imported images, no build):

```yaml
services:
  app:
    image: fiori-todo-app:latest
    ports:
      - "8080:80"
    depends_on:
      - api
    restart: unless-stopped

  api:
    image: fiori-todo-api:latest
    volumes:
      - todo-data:/data
    restart: unless-stopped

volumes:
  todo-data:
```

---

## 17. Build the images and export

Run these on your development machine (Docker must be installed):

```bash
# Build both images
docker build -t fiori-todo-app:latest -f Dockerfile .
docker build -t fiori-todo-api:latest -f Dockerfile.api .

# Export to compressed tar archives
docker save fiori-todo-app:latest | gzip > fiori-todo-app.tar.gz
docker save fiori-todo-api:latest | gzip > fiori-todo-api.tar.gz
```

Each archive will be around 60 MB.

---

## 18. Deploy to Synology

1. Copy both `.tar.gz` files to your Synology (via File Station or `scp`)
2. Open **Container Manager → Image → Add → Import from file**
3. Import `fiori-todo-app.tar.gz` → appears as `fiori-todo-app:latest`
4. Import `fiori-todo-api.tar.gz` → appears as `fiori-todo-api:latest`
5. Go to **Container Manager → Project → Create**
6. Paste the contents of `docker-compose.synology.yml`
7. Click **Deploy**

The app will be available at **http://your-synology-ip:8080**.

The `todo-data` Docker volume persists `db.json` across container restarts and image updates. Your tasks survive everything except explicitly deleting the volume.

---

## Key concepts summary

| Concept | Where it appears |
|---|---|
| `JSONModel` + two-way binding | `Component.js` creates the model; `{done}` on CheckBox syncs automatically |
| Template binding | `items="{/todos}"` — one row per array entry |
| Expression binding | `class="{= ${done} ? 'todoItemDone' : 'todoItem'}"` |
| Formatter function | `formatDate()` converts `"2026-06-15"` → `"Jun 15, 2026"` |
| `sap.ui.model.Filter` | `_applyFilter()` filters the list binding without touching model data |
| Routing + `navTo` | Defined in `manifest.json`; `Main.controller.js` calls `router.navTo("detail", { id })` |
| `bindElement` | `Detail.controller.js` binds the whole view to one todo object |
| `DatePicker` valueFormat / displayFormat | Storage format vs display format are kept separate |
| `fetch` with optimistic updates | Model updates immediately; API call fires in background |
| nginx reverse proxy | Single port for app + API; Docker service name used as hostname |
| Multi-stage Docker build | Node.js builds the app; nginx serves it — final image has no Node.js |
