sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/TextArea",
    "sap/m/Button"
], function (MessageToast, Dialog, TextArea, Button) {
    "use strict";

    return {

        /**
         * ====================================================
         * 👉 CFO APPROVE BUTTON (Remove Payment Block)
         * ====================================================
         */
        Post: function (oEvent) {

            const oCtx = oEvent.getSource().getBindingContext();
            const oData = oCtx.getObject();
            const oModel = oCtx.getModel();

            // =============================================
            // ⭐ RULES FOR CFO APPROVE
            // =============================================
            if (oData.HeaderStatus !== "B") {
                MessageToast.show("Only documents in status B can be approved by CFO.");
                return;
            }

            if (oData.RequireCfoApproval !== "X") {
                MessageToast.show("This document does not require CFO approval.");
                return;
            }

            if (!oData.FiDocNo) {
                MessageToast.show("FI document not yet created. Cannot remove payment block.");
                return;
            }

            // =============================================
            // 🔥 CALL UPDATE ODATA (trigger backend logic)
            // CFO APPROVE = set HeaderStatus = 'P'
            // =============================================

            oModel.update(oCtx.getPath(), {
                HeaderStatus: "P"  // CFO APPROVE
            }, {
                success: function () {
                    MessageToast.show("CFO approved successfully. Payment block removed.");
                    oModel.refresh(true);
                },
                error: function (oErr) {
                    MessageToast.show("Error while approving.");
                    console.error(oErr);
                }
            });

        },

        /**
         * ====================================================
         * 👉 CFO REJECT BUTTON
         * ====================================================
         */
        Reject: function (oEvent) {

    const oCtx = oEvent.getSource().getBindingContext();
    const oData = oCtx.getObject();
    const oModel = oCtx.getModel();

    // =============================================
    // ⭐ RULES FOR CFO REJECT
    // =============================================
    if (oData.HeaderStatus !== "B") {
        MessageToast.show("Only documents in status B can be rejected by CFO.");
        return;
    }

    if (oData.RequireCfoApproval !== "X") {
        MessageToast.show("This document does not require CFO approval.");
        return;
    }

    // =============================================
    // 🔥 Dialog nhập lý do reject
    // =============================================
    const oDialog = new Dialog({
        title: "Reject Reason",
        contentWidth: "400px",
        type: "Message",
        content: [
            new TextArea("cfoRejectReason", {
                rows: 4,
                width: "100%",
                liveChange: function () {
                    const sValue = sap.ui.getCore().byId("cfoRejectReason").getValue();
                    oDialog.getBeginButton().setEnabled(sValue.trim().length > 0);
                },
                placeholder: "Enter reject reason..."
            })
        ],
        beginButton: new Button({
            text: "Submit",
            enabled: false,
            press: function () {

                const sReason = sap.ui.getCore().byId("cfoRejectReason").getValue().trim();

                if (!sReason) {
                    MessageToast.show("Reject reason is required.");
                    return;
                }

                // =============================================
                // 🔥 CALL ODATA UPDATE
                // =============================================
                oModel.update(oCtx.getPath(), {
                    HeaderStatus: "R",
                    ReasonReject: sReason
                }, {
                    success: function () {
                        MessageToast.show("CFO rejected successfully.");
                        oModel.refresh(true);
                    },
                    error: function (oErr) {
                        MessageToast.show("Error while rejecting.");
                        console.error(oErr);
                    }
                });

                oDialog.close();
            }
        }),
        endButton: new Button({
            text: "Cancel",
            press: function () {
                oDialog.close();
            }
        }),
        afterClose: function () {
            oDialog.destroy();
        }
    });

    oDialog.open();
}

    };
});
