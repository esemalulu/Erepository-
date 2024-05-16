/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/record'], function (currentRecord, record) {

    function pageInit(context) {
        return
    }

    function markAllCustomer() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_customer_rebate_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    fieldId: 'custrecord_sdb_selected_2',
                    value: true,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                })
            }
        } catch (e) {
            console.log('error marAllCustomer', e)
        }
    }
    function unmarkAllCustomer() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_customer_rebate_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    fieldId: 'custrecord_sdb_selected_2',
                    value: false,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                })
            }
        } catch (e) {
            console.log('error unmarkAllCustomer', e)
        }
    }
    function removeCustomer() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_customer_rebate_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    line: i
                });
                var isSelected = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                    fieldId: 'custrecord_sdb_selected_2'
                })
                if (isSelected) {
                    var rebateCustomerId = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_rebate_customer_rebate_parent',
                        fieldId: 'id'
                    })
                    record.submitFields({
                        type: 'customrecord_rebate_customer',
                        id: rebateCustomerId,
                        values: {
                            'custrecord_rebate_customer_rebate_parent': '',
                        }
                    })
                }
            }
            location.reload()
        } catch (e) {
            console.log('error removeCustomer', e)
        }
    }
    function markAllItem() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_items_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    fieldId: 'custrecord_sdb_selected',
                    value: true,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                })
            }
        } catch (e) {
            console.log('error markAllItem', e)
        }
    }
    function unmarkAllItem() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_items_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    fieldId: 'custrecord_sdb_selected',
                    value: false,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                })
            }
        } catch (e) {
            console.log('error unmarkAllItem', e)
        }
    }
    function removeItem() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_rebate_items_parent'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    line: i
                });
                var isSelected = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_rebate_items_parent',
                    fieldId: 'custrecord_sdb_selected'
                })
                if (isSelected) {
                    var rebateItemId = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_rebate_items_parent',
                        fieldId: 'id'
                    })
                    record.submitFields({
                        type: 'customrecord_rebate_item_details',
                        id: rebateItemId,
                        values: {
                            'custrecord_rebate_items_parent': '',
                        }
                    })
                }
            }
            location.reload()
        } catch (e) {
            console.log('error removeItem', e)
        }
    }

    function markAllCPCLine() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_item_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    fieldId: 'custrecord_sdb_selected_cpc_line',
                    value: true,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                })
            }
        } catch (e) {
            console.log('error markAllCPCLine', e)
        }
    }

    function unmarkAllCPCLine() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_item_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    fieldId: 'custrecord_sdb_selected_cpc_line',
                    value: false,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                })
            }
        } catch (e) {
            console.log('error unmarkAllCPCLine', e)
        }
    }

    function removeCPCLine() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_item_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    line: i
                });
                var isSelected = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_item_header',
                    fieldId: 'custrecord_sdb_selected_cpc_line'
                })
                if (isSelected) {
                    var rebateCustomerId = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_acme_cpc_item_header',
                        fieldId: 'id'
                    })
                    record.submitFields({
                        type: 'customrecord_acme_cust_price_contract_ln',
                        id: rebateCustomerId,
                        values: {
                            'custrecord_acme_cpc_item_header': '',
                        }
                    })
                }
            }
            location.reload()
        } catch (e) {
            console.log('error removeCustomer', e)
        }
    }

    function markAllCPCCust() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_cust_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    fieldId: 'custrecord_sdb_selected_cpc_customer',
                    value: true,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                })
            }
        } catch (e) {
            console.log('error markAllCPCLine', e)
        }
    }

    function unmarkAllCPCCust() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_cust_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    line: i
                });
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    fieldId: 'custrecord_sdb_selected_cpc_customer',
                    value: false,
                })
                rec.commitLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                })
            }
        } catch (e) {
            console.log('error unmarkAllCPCLine', e)
        }
    }

    function removeCPCCust() {
        try {
            var rec = currentRecord.get();
            var lineCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_acme_cpc_cust_header'
            });
            for (let i = 0; i < lineCount; i++) {
                rec.selectLine({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    line: i
                });
                var isSelected = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                    fieldId: 'custrecord_sdb_selected_cpc_customer'
                })
                if (isSelected) {
                    var rebateCustomerId = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_acme_cpc_cust_header',
                        fieldId: 'id'
                    })
                    record.submitFields({
                        type: 'customrecord_acme_cpc_customer',
                        id: rebateCustomerId,
                        values: {
                            'custrecord_acme_cpc_cust_header': '',
                        }
                    })
                }
            }
            location.reload()
        } catch (e) {
            console.log('error removeCustomer', e)
        }
    }

    return {
        pageInit: pageInit,
        markAllCustomer: markAllCustomer,
        unmarkAllCustomer: unmarkAllCustomer,
        removeCustomer: removeCustomer,
        markAllItem: markAllItem,
        unmarkAllItem: unmarkAllItem,
        removeItem: removeItem,
        markAllCPCLine: markAllCPCLine,
        unmarkAllCPCLine: unmarkAllCPCLine,
        removeCPCLine: removeCPCLine,
        markAllCPCCust: markAllCPCCust,
        unmarkAllCPCCust: unmarkAllCPCCust,
        removeCPCCust: removeCPCCust
    }
});
