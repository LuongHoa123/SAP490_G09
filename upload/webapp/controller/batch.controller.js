sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function(Controller, MessageToast, Filter, FilterOperator) {
  "use strict";

  return Controller.extend("upload.controller.batch", {

    onInit: function() {
      // OData model đã được định nghĩa trong manifest.json
    },

    // 🔹 Chuyển sang trang chi tiết batch
    onBatchPress: function(oEvent) {
      var oItem = oEvent.getSource();
      var sBatchId = oItem.getBindingContext().getProperty("BatchId");

      this.getOwnerComponent().getRouter()
        .navTo("BatchDetail", { BatchId: sBatchId });
    },

    // 🔹 Chuyển sang trang upload file
    onUploadPress: function() {
      this.getOwnerComponent().getRouter().navTo("Upload");
      MessageToast.show("Navigating to Upload page...");
    },

    // 🔹 Nút "Go" - Lọc dữ liệu
    onSearchPress: function() {
      var oView = this.getView();
      var aFilters = [];

      var sFileName = oView.byId("fileNameFilter").getValue();
      var sStatus = oView.byId("statusFilter").getSelectedKey();
      var oDateRange = oView.byId("dateFilter");
      var oDateFrom = oDateRange.getDateValue();
      var oDateTo = oDateRange.getSecondDateValue();

      // Filter: File Name
      if (sFileName) {
        aFilters.push(new Filter("FileName", FilterOperator.Contains, sFileName));
      }

      // Filter: Status (S, E, D)
      if (sStatus) {
        aFilters.push(new Filter("BatchStatus", FilterOperator.EQ, sStatus));
      }

      // Filter: Date Range
      if (oDateFrom && oDateTo) {
        aFilters.push(new Filter("CreatedAt", FilterOperator.BT, oDateFrom, oDateTo));
      }

      // Apply filter vào table
      var oTable = oView.byId("batchTable");
      var oBinding = oTable.getBinding("items");

      if (oBinding) {
        oBinding.filter(aFilters, "Application");
        MessageToast.show("Data filtered successfully");
      } else {
        MessageToast.show("Table binding not found");
      }
    }

  });
});
