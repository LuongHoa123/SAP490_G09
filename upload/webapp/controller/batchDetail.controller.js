sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, MessageBox, MessageToast) {
  "use strict";

  return Controller.extend("upload.controller.batchDetail", {

    onInit: function () {
      const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
      oRouter.getRoute("BatchDetail").attachPatternMatched(this._onObjectMatched, this);
    },

    /**
     * Khi người dùng chọn 1 batch trong Batch List
     * Router sẽ truyền BatchId vào đây => load dữ liệu chi tiết
     */
    _onObjectMatched: function (oEvent) {
      const sBatchId = decodeURIComponent(oEvent.getParameter("arguments").BatchId);
      const oModel = this.getView().getModel();

      // Kiểm tra loại khóa (chuỗi hay số)
      const sPath = isNaN(sBatchId)
        ? `/BatchCreateSet('${sBatchId}')`
        : `/BatchCreateSet(${sBatchId})`;

      // 🔹 Bind dữ liệu từ OData + expand headers & items
      this.getView().bindElement({
        path: sPath,
        parameters: {
          expand: "ToHeaders,ToHeaders/ToItems"
        },
        events: {
          dataRequested: () => this.getView().setBusy(true),
          dataReceived: (oEvent) => {
            this.getView().setBusy(false);
            const oData = oEvent.getParameter("data");
            console.log("📦 Batch Detail Data:", oData);
            if (!oData) MessageBox.warning("No batch data found.");
          }
        }
      });
    },

    /**
     * ⬇ Tải xuống file gốc mà người dùng đã upload (Excel)
     */
    onDownloadFile: function () {
      const oCtx = this.getView().getBindingContext();
      if (!oCtx) {
        MessageBox.warning("No file context available.");
        return;
      }

      const sFileName = oCtx.getProperty("FileName");
      const sBatchId = oCtx.getProperty("BatchId");
      const oModel = this.getView().getModel();

      const sPath = isNaN(sBatchId)
        ? `/BatchCreateSet('${sBatchId}')`
        : `/BatchCreateSet(${sBatchId})`;

      oModel.read(sPath, {
        success: function (oData) {
          if (oData.FileContent) {
            try {
              const byteChars = atob(oData.FileContent);
              const byteNumbers = new Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) {
                byteNumbers[i] = byteChars.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: oData.FileMimeType });
              const url = window.URL.createObjectURL(blob);

              const a = document.createElement("a");
              a.href = url;
              a.download = sFileName || "UploadedFile.xlsx";
              a.click();
              window.URL.revokeObjectURL(url);

              MessageBox.success("File downloaded successfully.");
            } catch (err) {
              MessageBox.error("Error decoding file content.");
              console.error(err);
            }
          } else {
            MessageBox.warning("No file content found in backend.");
          }
        },
        error: function () {
          MessageBox.error("Failed to download the file.");
        }
      });
    },

    /**
     * ==========================
     * HEADER EDIT/UPDATE LOGIC
     * ==========================
     */

    /**
     * Định dạng màu trạng thái header
     */
    formatHeaderState: function (sStatus) {
      switch (sStatus) {
        case "P": return "Success"; // Posted
        case "R": return "Error";   // Rejected
        case "B": return "Warning"; // Blocked
        case "N": return "Information"; // New
        default: return "None";
      }
    },

    /**
     * ✅ Chỉ cho phép edit khi HeaderStatus = 'R'
     */
    isHeaderEditable: function (sStatus) {
      return sStatus === "R";
    },

    /**
     * Gửi update khi bấm Save (set lại HeaderStatus = 'N')
     */
    onSaveHeader: function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext();
      const oModel = oContext.getModel();
      const oData = oContext.getObject();

      const sPath = oContext.getPath(); // /HeadersSet(HeaderId=...,BatchId=...)
      console.log("📝 Update Path:", sPath);

      oModel.update(sPath, {
        ReasonReject: oData.ReasonReject,
        HeaderStatus: "N"
      }, {
        success: function () {
          MessageToast.show("Header updated and reset to 'N' successfully!");
          oModel.refresh(true);
        },
        error: function (oError) {
          MessageBox.error("Error updating header!");
          console.error(oError);
        }
      });
    }

  });
});
