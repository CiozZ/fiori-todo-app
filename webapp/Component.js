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
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      var oModel = new JSONModel({
        todos: [],
        newTodo: "",
        newDueDate: "",
        activeCount: 0,
        usingApi: false
      });
      this.setModel(oModel);

      // Try the API first; fall back to localStorage → default todos
      fetch(API)
        .then(function (res) { return res.json(); })
        .then(function (aTodos) {
          oModel.setProperty("/todos", aTodos);
          oModel.setProperty("/activeCount", aTodos.filter(function (t) { return !t.done; }).length);
          oModel.setProperty("/usingApi", true);
        })
        .catch(function () {
          // API not available — use localStorage or default data
          var aTodos = DEFAULT_TODOS;
          try {
            var sSaved = localStorage.getItem("fiori-todo-items");
            if (sSaved) aTodos = JSON.parse(sSaved);
          } catch (e) { /* ignore */ }
          oModel.setProperty("/todos", aTodos);
          oModel.setProperty("/activeCount", aTodos.filter(function (t) { return !t.done; }).length);
        });

      this.getRouter().initialize();
    }
  });
});
