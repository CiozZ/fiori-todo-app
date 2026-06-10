sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageToast",
  "sap/ui/core/format/DateFormat",
  "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, MessageToast, DateFormat, MessageBox) {
  "use strict";

  var API = "/todos";

  return Controller.extend("todo.controller.Main", {

    // ── Formatter ────────────────────────────────────────────────────────────

    formatDate: function (sValue) {
      if (!sValue) return "";
      var oParser    = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
      var oFormatter = DateFormat.getDateInstance({ style: "medium" });
      var oDate = oParser.parse(sValue);
      return oDate ? oFormatter.format(oDate) : "";
    },

    // ── Helpers ──────────────────────────────────────────────────────────────

    _updateActiveCount: function () {
      var oModel = this.getView().getModel();
      oModel.setProperty("/activeCount",
        oModel.getProperty("/todos").filter(function (t) { return !t.done; }).length
      );
    },

    _applyFilter: function () {
      var sKey = this.byId("filterBtn").getSelectedKey();
      var oBinding = this.byId("todoList").getBinding("items");
      var aFilters = [];
      if (sKey === "active") aFilters = [new Filter("done", FilterOperator.EQ, false)];
      if (sKey === "done")   aFilters = [new Filter("done", FilterOperator.EQ, true)];
      oBinding.filter(aFilters);
    },

    // ── Event handlers ────────────────────────────────────────────────────────

    onAddTodo: function () {
      var oModel = this.getView().getModel();
      var sTitle = oModel.getProperty("/newTodo").trim();
      if (!sTitle) { MessageToast.show("Please enter a task first."); return; }

      var oNewTodo = {
        title: sTitle,
        done: false,
        dueDate: oModel.getProperty("/newDueDate")
      };

      // POST → wait for the server's response to get the auto-assigned id
      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(oNewTodo)
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
      }.bind(this))
      .catch(function () {
        MessageToast.show("Could not save — is the API server running?");
      });
    },

    // Two-way binding already updated the model before this fires.
    // Just PATCH the changed field and refresh the count.
    onToggleDone: function (oEvent) {
      var oCtx  = oEvent.getSource().getBindingContext();
      var iId   = oCtx.getProperty("id");
      var bDone = oCtx.getProperty("done");

      fetch(API + "/" + iId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: bDone })
      });

      this._updateActiveCount();
    },

    onDeleteTodo: function (oEvent) {
      var oCtx   = oEvent.getSource().getBindingContext();
      var iId    = oCtx.getProperty("id");
      var iIndex = parseInt(oCtx.getPath().split("/").pop(), 10);

      // Optimistic update: remove from model immediately, then DELETE on the server
      fetch(API + "/" + iId, { method: "DELETE" });

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
      var aDone = aTodos.filter(function (t) {return t.done; });

      var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

      if (aDone.length === 0) {
        MessageToast.show(oBundle.getText("nothingToClear"));
        return;
      }

      MessageBox.confirm(oBundle.getText("clearCompletedConfirmText", [aDone.length]), {
        title: oBundle.getText("clearCompletedConfirmTitle"),
        onClose: function (sAction) {
          if (sAction !== MessageBox.Action.OK) {
            return;   // user cancelled — do nothing
          }

          aDone.forEach(function (t) {
            fetch(API + "/" + t.id, { method: "DELETE" });
          });

          oModel.setProperty("/todos", aTodos.filter(function (t) { return !t.done; }));
          this._updateActiveCount();
          this._applyFilter();
        }.bind(this)
      });
    },

    onFilterChange: function () {
      this._applyFilter();
    },

    onItemPress: function (oEvent) {
      var iId = oEvent.getParameter("listItem").getBindingContext().getProperty("id");
      this.getOwnerComponent().getRouter().navTo("detail", { id: iId });
    }

  });
});
