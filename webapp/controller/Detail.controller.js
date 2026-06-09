sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/format/DateFormat"
], function (Controller, DateFormat) {
  "use strict";

  var API = "http://localhost:3001/todos";

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
      var oParser    = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
      var oFormatter = DateFormat.getDateInstance({ style: "medium" });
      var oDate = oParser.parse(sValue);
      return oDate ? oFormatter.format(oDate) : "";
    },

    // Two-way binding updated /todos/N/done before this fires.
    // PATCH just the done field, then recompute the count.
    onToggleDone: function () {
      var oCtx  = this.getView().getBindingContext();
      var iId   = oCtx.getProperty("id");
      var bDone = oCtx.getProperty("done");

      fetch(API + "/" + iId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: bDone })
      });

      var oModel = this.getView().getModel();
      oModel.setProperty("/activeCount",
        oModel.getProperty("/todos").filter(function (t) { return !t.done; }).length
      );
    },

    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("main", {}, true);
    }

  });
});
