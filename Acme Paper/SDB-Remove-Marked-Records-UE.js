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
                    var sublistCust = context.form.getSublist({ id: 'recmachcustrecord_rebate_customer_rebate_parent' });
                    context.form.clientScriptModulePath = "SuiteScripts/SDB-Remove-Marked-Records-CS.js";
                    sublistCust.addButton({
                        id: "custpage_markall",
                        label: "Mark All",
                        functionName: "markAllCustomer()"
                    });
                    sublistCust.addButton({
                        id: "custpage_unmarkall",
                        label: "Unmark All",
                        functionName: "unmarkAllCustomer()"
                    });
                    sublistCust.addButton({
                        id: "custpage_removemarked",
                        label: "Remove Marked Records",
                        functionName: "removeCustomer()"
                    });

                    var sublistItem = context.form.getSublist({ id: 'recmachcustrecord_rebate_items_parent' });
                    sublistItem.addButton({
                        id: "custpage_markallitem",
                        label: "Mark All",
                        functionName: "markAllItem()"
                    });
                    sublistItem.addButton({
                        id: "custpage_unmarkallitem",
                        label: "Unmark All",
                        functionName: "unmarkAllItem()"
                    });
                    sublistItem.addButton({
                        id: "custpage_removemarkeditem",
                        label: "Remove Marked Records",
                        functionName: "removeItem()"
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