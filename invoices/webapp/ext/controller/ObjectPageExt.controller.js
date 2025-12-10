sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/TextArea",
    "sap/m/Button"
], function (MessageToast, Dialog, TextArea, Button) {
    "use strict";

    return {

        /**
         * ==============================================
         * APPROVE HANDLER (Manager)
         * ==============================================
         */
        Approve: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel();
            const oData = oEvent.getSource().getBindingContext().getObject();

            // ❌ Các trạng thái không cho approve
            const aBlocked = ["P", "B", "R"];
            if (aBlocked.includes(oData.HeaderStatus)) {
                MessageToast.show("This document cannot be approved.");
                return;
            }

            // ✔ Chỉ cho approve khi NEW
            if (oData.HeaderStatus !== "N") {
                MessageToast.show("This document cannot be approved.");
                return;
            }

            const sPath = `/HeadersSet(HeaderId=${oData.HeaderId},BatchId=${oData.BatchId})`;

            oModel.update(sPath, {
                HeaderStatus: "P"
            }, {
                success: () => {
                    MessageToast.show("Document approved successfully!");
                    oModel.refresh(true);
                },
                error: (oError) => {
                    const iStatus = oError.statusCode || oError.status;
                    if (iStatus === 202) {
                        MessageToast.show("Document approved successfully!");
                        oModel.refresh(true);
                    } else {
                        MessageToast.show("Error approving document!");
                        console.error(oError);
                    }
                }
            });
        },

        /**
         * ==============================================
         * REJECT HANDLER (Manager)
         * ==============================================
         */
        Reject: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel();
            const oData = oEvent.getSource().getBindingContext().getObject();

            // ❌ Các trạng thái không cho reject
            const aBlocked = ["P", "B", "R"];
            if (aBlocked.includes(oData.HeaderStatus)) {
                MessageToast.show("This document cannot be rejected.");
                return;
            }

            // ✔ Chỉ reject khi NEW
            if (oData.HeaderStatus !== "N") {
                MessageToast.show("This document cannot be rejected.");
                return;
            }

            const sHeaderId = oData.HeaderId;
            const sBatchId = oData.BatchId;

            const oDialog = new Dialog({
                title: "Reject Reason",
                type: "Message",
                contentWidth: "400px",
                content: [
                    new TextArea("rejectReasonInput", {
                        width: "100%",
                        placeholder: "Enter reason for rejection...",
                        rows: 4
                    })
                ],
                beginButton: new Button({
                    text: "Submit",
                    press: () => {
                        const sReason = sap.ui.getCore().byId("rejectReasonInput").getValue();
                        if (!sReason) {
                            MessageToast.show("Please enter a rejection reason.");
                            return;
                        }

                        const sPath = `/HeadersSet(HeaderId=${sHeaderId},BatchId=${sBatchId})`;

                        oModel.update(sPath, {
                            HeaderStatus: "R",
                            ReasonReject: sReason
                        }, {
                            success: () => {
                                MessageToast.show("Document rejected successfully!");
                                oModel.refresh(true);
                            },
                            error: (oError) => {
                                const iStatus = oError.statusCode || oError.status;
                                if (iStatus === 202) {
                                    MessageToast.show("Document rejected successfully!");
                                    oModel.refresh(true);
                                } else {
                                    MessageToast.show("Error rejecting document!");
                                    console.error(oError);
                                }
                            }
                        });

                        oDialog.close();
                    }
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: () => {
                        oDialog.close();
                    }
                }),
                afterClose: () => {
                    oDialog.destroy();
                }
            });

            oDialog.open();
        }
    };
});
