sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("upload.controller.upload", {

    onInit: function () {
      this.getView().setModel(new JSONModel({
        FileName: "",
        FileMimeType: "",
        Note: "",
        ToHeaders: []
      }), "draft");
    },

    _ensureXLSXLoaded: function () {
      return new Promise((resolve, reject) => {
        if (window.XLSX) return resolve();
        jQuery.getScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js")
          .done(() => resolve())
          .fail(() => reject(new Error("Không thể tải XLSX")));
      });
    },

   onDownload: function () {
  // Đường dẫn tương đối đến file trong thư mục webapp
  const sTemplatePath = sap.ui.require.toUrl("upload/model/JournalEntry_Template.xlsx");

  // Tạo thẻ <a> ẩn để trigger tải file
  const link = document.createElement("a");
  link.href = sTemplatePath;
  link.download = "Template_Upload.xlsx"; // tên file tải về
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  sap.m.MessageToast.show("Đang tải file template...");
},

    onFileSelected: async function (oEvent) {
      const file = oEvent.getParameter("files")?.[0];
      if (!file) return;
      const reader = new FileReader();

      await this._ensureXLSXLoaded();
      reader.onload = (e) => {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        this._ingestExcel(rows, file);
      };
      reader.readAsArrayBuffer(file);
    },

    /** 🧩 Parse Excel thành nhiều khối header */
    _ingestExcel: function (rows, file) {
      const norm = (r) => (r || []).map(c => (c == null ? "" : String(c)).trim());
      const isBlank = (r) => norm(r).every(c => !c);
      const headers = [];
      let currentHeader = null;
      let mode = "";

      for (let i = 0; i < rows.length; i++) {
        const row = norm(rows[i]);
        if (isBlank(row)) continue;
        const first = row[0].toLowerCase();

        // --- Header block ---
        if (first.includes("header")) {
          if (currentHeader) headers.push(currentHeader);
          currentHeader = { ToItems: [] };
          mode = "header";
          const headerDataRow = norm(rows[i + 2] || []);
          currentHeader.CompanyCode = headerDataRow[0] || "";
          currentHeader.DocType = headerDataRow[1] || "";
          currentHeader.DocDate = this._toEdmDateDMY(headerDataRow[2]);
          currentHeader.PostDate = this._toEdmDateDMY(headerDataRow[3]);
          currentHeader.FiscalPeriod = headerDataRow[4] || "";
          currentHeader.DocText = headerDataRow[5] || "";
          currentHeader.Currency = headerDataRow[6] || "";
          currentHeader.LedgerGroup = headerDataRow[7] || "0L";
          currentHeader.RefDocNo = headerDataRow[8] || "";
          currentHeader.BusinessArea = headerDataRow[9] || "";
          currentHeader.AutoCalcTax = headerDataRow[10] || "";
          i += 2;
          continue;
        }

        // --- Line Items section ---
        if (first.includes("line items")) {
  mode = "items";
  // Bỏ qua các dòng trắng hoặc tiêu đề cột
  while (i + 1 < rows.length && isBlank(rows[i + 1]) === false && rows[i + 1][0].toLowerCase().includes("company code")) {
    i += 1;
  }
  continue;
}

        // --- Item rows ---
        if (mode === "items" && currentHeader && row[0] && row[1]) {
          currentHeader.ToItems.push({
            CompanyCode: row[0],
            GlAccount: row[1],
            ItemText: row[2],
            AmountDebit: row[3],
            AmountCredit: row[4],
            AmountLc1: row[5],
            TaxCode: row[6],
            OrderNumber: row[7],
            ValueDate: this._toEdmDateDMY(row[9]),
            HouseBank: row[10],
            BankAccountId: row[11],
            AssignmentNo: row[12],
            TradingPartner: row[13]
          });
        }
      }

      if (currentHeader) headers.push(currentHeader);

      console.log("✅ Parsed headers:", headers);

      this.getView().getModel("draft").setData({
        FileName: file.name,
        FileMimeType: file.type,
        Note: "Đọc từ Excel",
        ToHeaders: headers
      });

      MessageToast.show(`Đã import ${headers.length} khối Header từ Excel.`);
    },

    /** 📅 Chuyển dd/MM/yyyy sang /Date() format */
    _toEdmDateDMY: function (s) {
      if (!s) return null;
      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
      if (!m) return null;
      const d = Date.UTC(+m[3], +m[2] - 1, +m[1]);
      return `/Date(${d})/`;
    },
    onSubmit: async function () {
      const oModel = this.getView().getModel("draft");
      const data = oModel.getData();
      const file = this.byId("fuFile").oFileUpload.files?.[0];
      if (!file) {
        MessageBox.error("Vui lòng chọn file trước khi submit.");
        return;
      }

      let hasError = false;
      data.ToHeaders.forEach(h => {
        h.CompanyCodeState = h.DocTypeState = h.DocDateState = h.PostDateState =
        h.FiscalPeriodState = h.DocTextState = h.RefDocNoState = 
        h.BusinessAreaState = h.CurrencyState = "None";

        if (!h.CompanyCode) { h.CompanyCodeState = "Error"; hasError = true; }
        if (!h.DocType) { h.DocTypeState = "Error"; hasError = true; }
        if (!h.DocDate) { h.DocDateState = "Error"; hasError = true; }
        if (!h.PostDate) { h.PostDateState = "Error"; hasError = true; }
        if (!h.FiscalPeriod) { h.FiscalPeriodState = "Error"; hasError = true; }
        if (!h.DocText) { h.DocTextState = "Error"; hasError = true; }
        if (!h.RefDocNo) { h.RefDocNoState = "Error"; hasError = true; }
        if (!h.BusinessArea) { h.BusinessAreaState = "Error"; hasError = true; }
        if (!h.Currency) { h.CurrencyState = "Error"; hasError = true; }

        (h.ToItems || []).forEach(i => {
          i.GlAccountState = i.ItemTextState = i.AmountDebitState = i.AmountCreditState = i.AmountLc1State =
          i.HouseBankState = i.BankAccountIdState = "None";

          if (!i.GlAccount) { i.GlAccountState = "Error"; hasError = true; }
          if (!i.ItemText) { i.ItemTextState = "Error"; hasError = true; }
          if (!i.AmountDebit && !i.AmountCredit && !i.AmountLc1) {
            i.AmountLc1State = i.AmountDebitState = i.AmountCreditState = "Error"; hasError = true;
          }
          if (!i.HouseBank) { i.HouseBankState = "Error"; hasError = true; }
          if (!i.BankAccountId) { i.BankAccountIdState = "Error"; hasError = true; }
        });
      });

      oModel.refresh(true);
      if (hasError) {
        MessageBox.error("❌ Vui lòng nhập đủ các trường bắt buộc (ô đỏ).");
        return;
      }

      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

     const shortMime =
  (file.type && file.type.length > 40)
    ? file.type.substring(0, 40)
    : (file.type || "application/octet-stream");
const fnToODataDate = function(sDate) {
  if (!sDate) return null;
  if (sDate.startsWith("/Date")) return sDate;
  const d = new Date(sDate);
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return `/Date(${utc})/`;
};

// ép convert toàn bộ ngày trước khi gửi
data.ToHeaders.forEach(h => {
  h.DocDate = fnToODataDate(h.DocDate);
  h.PostDate = fnToODataDate(h.PostDate);
  (h.ToItems || []).forEach(i => {
    i.ValueDate = fnToODataDate(i.ValueDate);
  });
});
  // 🔥 Xóa hết các field *State không có trong OData
  data.ToHeaders.forEach(h => {
    Object.keys(h).forEach(k => {
      if (k.endsWith("State")) delete h[k];
    });
    (h.ToItems || []).forEach(i => {
      Object.keys(i).forEach(k => {
        if (k.endsWith("State")) delete i[k];
      });
    });
  });
data.ToHeaders.forEach(h => {
  (h.ToItems || []).forEach(i => {
    ["AmountDebit", "AmountCredit", "AmountLc1"].forEach(f => {
      const raw = i[f];
      if (raw !== undefined && raw !== null && raw !== "") {
        // Bỏ dấu phẩy, ép về số, rồi format về dạng string có 2 chữ số thập phân
        const clean = String(raw).replace(/,/g, "").trim();
        const num = parseFloat(clean);
        i[f] = isNaN(num) ? "" : num.toFixed(2); // <-- gửi dạng "5000000.00" (string)
      } else {
        i[f] = "0.00"; // hoặc null tùy SEGW cho phép
      }
    });
  });
});



  
const payload = {
  FileName: data.FileName,
  FileMimeType: shortMime, // <= cắt ngắn MIME
  FileContent: base64Data,
  Note: data.Note,
  ToHeaders: data.ToHeaders
};

      const odataModel = this.getView().getModel();
      odataModel.create("/BatchCreateSet", payload, {
          success: () => {
    MessageToast.show("🎉 Gửi Batch thành công!");

    // 🔄 Reset model "draft" về trạng thái ban đầu
    const resetModel = new JSONModel({
      FileName: "",
      FileMimeType: "",
      Note: "",
      ToHeaders: []
    });
    this.getView().setModel(resetModel, "draft");

    // 🧹 Xóa file chọn trong file uploader (nếu có)
    const fu = this.byId("fuFile");
    if (fu) {
      fu.clear();          // Xóa file đã chọn trong control
      fu.setValue("");     // Reset input file về trống
    }

    // 🔁 Optional: Refresh lại trang nếu muốn reload hoàn toàn
    // location.reload();
  },
        error: (e) => {
          let msg = " Gửi thất bại.";
          try { msg = JSON.parse(e.responseText).error.message.value; } catch {}
          MessageBox.error(msg);
        }
      });
    },

    /** Xóa đỏ realtime khi người dùng sửa */
    onLiveValidate: function (oEvent) {
      const input = oEvent.getSource();
      const val = input.getValue();
      input.setValueState(val ? "None" : "Error");
    },
  onDateChange: function (oEvent) {
  const oDP = oEvent.getSource();
  const oDate = oDP.getDateValue();
  const oCtx = oDP.getBindingContext("draft");

  if (!oDate || !oCtx) {
    oDP.setValueState("Error");
    return;
  }

  // Tạo đúng format /Date(<epoch_millis>)/ UTC 00:00
  const utcMillis = Date.UTC(
    oDate.getUTCFullYear(),
    oDate.getUTCMonth(),
    oDate.getUTCDate()
  );
  const sODataDate = `/Date(${utcMillis})/`;

  // Cập nhật vào model "draft"
  const sProp = oDP.getBindingInfo("value").parts[0].path;
  oCtx.getModel().setProperty(sProp, sODataDate);

  // Cập nhật lại text hiển thị
  oDP.setValue(oDP.getValue()); 
  oDP.setValueState("None");
}





  });
});
