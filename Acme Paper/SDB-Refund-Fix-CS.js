/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/record', 'N/ui/dialog', 'N/search'], function (record, dialog, search) {

    function fieldChanged(context) {
        try {
            return
            var rec = context.currentRecord;
            var sublistName = context.sublistId;
            var fieldName = context.fieldId;
            if (sublistName == 'item' && fieldName == 'quantity') {

                var quantity = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "quantity",
                });
                if (quantity) rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_quantity_returned',
                    value: quantity,
                    ignoreFieldChange: true
                });

            }

            if (sublistName == 'item' && fieldName == 'custcol_sdb_quantity_returned') {

                var quantityReturned = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "custcol_sdb_quantity_returned",
                });
                var rate = rec.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "rate",
                });
                if ((quantityReturned || quantityReturned == 0) && rate) rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: (quantityReturned * rate),
                    ignoreFieldChange: true
                });

            }
        } catch (e) {
            console.log("ERROR fieldChanged", e);
        }
    }

    function pageInit(context) {
        try {
            return
            var standarFormId = 322;
            var newRecord = context.currentRecord;
            var currentForm = newRecord.getValue('customform');
            log.debug('INIT FORM: ', { currentForm, cmId: newRecord.id });
            if (currentForm != standarFormId) setDefaultForm(newRecord, standarFormId);
            var endForm = newRecord.getValue('customform');
            log.debug('END FORM: ', { endForm, cmId: newRecord.id });
        } catch (pageInitError) {
            log.error("ERROR: pageInit", pageInitError);
        }
    }

    function setDefaultForm(newRecord, standarFormId) {
        var invoice = newRecord.getValue('createdfrom');
        if (!invoice) return;

        var invoiceHasReturn = getInvoiceHasReturn(invoice);
        if (invoiceHasReturn) newRecord.setValue('customform', standarFormId);
    }

    function getInvoiceHasReturn(invoice) {
        var returnauthorizationSearchObj = search.create({
            type: "invoice",
            filters:
                [
                    ["type","anyof","CustInvc"], 
                    "AND",
                    ["internalid", "anyof", invoice],
                    "AND",
                    ["mainline", "is", "T"]
                ],
            columns: []
        });
        var searchResultCount = returnauthorizationSearchObj.runPaged().count;
        returnauthorizationSearchObj.run().each(function (result) {
            log.debug("RETURNS RELATED TO - " + invoice, result.id);
            return true;
        });
        return searchResultCount > 0;
    }


    return {
        fieldChanged: fieldChanged,
        pageInit: pageInit
    }
});
