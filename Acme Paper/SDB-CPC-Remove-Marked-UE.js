/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([],

    function () {
        function beforeLoad(context) {
            try {
                if (context.type == context.UserEventType.EDIT) {
                    var sublistCust = context.form.getSublist({ id: 'recmachcustrecord_acme_cpc_item_header' });
                    context.form.clientScriptModulePath = "SuiteScripts/SDB-Remove-Marked-Records-CS.js";
                    sublistCust.addButton({
                        id: "custpage_cpcmarkall",
                        label: "Mark All",
                        functionName: "markAllCPCLine()"
                    });
                    sublistCust.addButton({
                        id: "custpage_cpcunmarkall",
                        label: "Unmark All",
                        functionName: "unmarkAllCPCLine()"
                    });
                    sublistCust.addButton({
                        id: "custpage_cpcremovemarked",
                        label: "Remove Marked Records",
                        functionName: "removeCPCLine()"
                    });

                    var sublistItem = context.form.getSublist({ id: 'recmachcustrecord_acme_cpc_cust_header' });
                    sublistItem.addButton({
                        id: "custpage_cpcmarkallcust",
                        label: "Mark All",
                        functionName: "markAllCPCCust()"
                    });
                    sublistItem.addButton({
                        id: "custpage_cpcunmarkallcust",
                        label: "Unmark All",
                        functionName: "unmarkAllCPCCust()"
                    });
                    sublistItem.addButton({
                        id: "custpage_cpcremovemarkedcust",
                        label: "Remove Marked Records",
                        functionName: "removeCPCCust()"
                    });
                    return;
                }
            } catch (e) {
                log.debug('Error at beforeLoad', e)
            }
        }

        return {
            beforeLoad: beforeLoad
        }



    })