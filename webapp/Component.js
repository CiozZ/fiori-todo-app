sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("todo.Component", {
    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      // Start with an empty model — the API call below fills it asynchronously
      var oModel = new JSONModel({
        todos: [],
        newTodo: "",
        newDueDate: "",
        activeCount: 0
      });
      this.setModel(oModel);

      // Load all todos from the json-server REST API
      fetch("http://localhost:3001/todos")
        .then(function (res) { return res.json(); })
        .then(function (aTodos) {
          oModel.setProperty("/todos", aTodos);
          oModel.setProperty("/activeCount",
            aTodos.filter(function (t) { return !t.done; }).length
          );
        });

      this.getRouter().initialize();
    }
  });
});
