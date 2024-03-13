/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/currency',
    'N/log',
    'N/runtime',
    'N/search',
    'N/url',
    '../../../Common/r7.transaction.library.functions'
], function (currency, log, runtime, search, url, library) {
    function beforeLoad(context) {
        const { type, form } = context;
        const { COPY } = context.UserEventType;

        if (type === COPY) {
            library.zc_runCategoryPurchasedCopyRoutine(context);
        }

        const internalId = context.newRecord.id;
        if (internalId != null) {
            const createPdfUrl = url.resolveScript({
                scriptId: 'customscript_r7_pck_transaction_suitelet',
                deploymentId: 'customdeploy_r7_pck_transaction_suitelet',
                params: {
                    'id': internalId
                }
            });

            form.addButton({
                id: 'custpage_r7_pck_transaction_suitelet',
                label: 'Print Package Invoice',
                functionName: "popUpWindow('" + createPdfUrl + "');"
            });
        }
    }

    function beforeSubmit(context) {
        const { type, newRecord, oldRecord } = context;
        const { CREATE, EDIT, VIEW } = context.UserEventType;

        const { executionContext } = runtime;
        const { USER_INTERFACE } = runtime.ContextType;

        const session = runtime.getCurrentSession();

        /**
         * <Set value in Cross Exchange Rate field
         * for Vat(GBP) calculation>.
         */
        if (type === CREATE || type === EDIT || type === VIEW) {
            const sourceCurrency = newRecord.getValue({ fieldId: 'currency' });
            const transactionDate = newRecord.getValue({ fieldId: 'trandate' });

            const foreignGbpRate = currency.exchangeRate({
                source: sourceCurrency,
                target: 'GBP',
                date: transactionDate
            });

            newRecord.setValue({
                fieldId: 'custbodyr7crossexchangerate',
                value: foreignGbpRate
            });
        }

        if (session.get({ name: 'r7noscript' }) === 'T') {
            return;
        }

        if (executionContext === USER_INTERFACE) {
            if (type === CREATE || type === EDIT) {
                library.setTotalDiscount(newRecord); //library script
            }
        }

        if (type === CREATE || type === EDIT) {
            if (!isPriodWasClosed(newRecord)) {
                library.setLocations(newRecord);
            }
            library.stampACV(newRecord);
            library.zc_stampCategoryPurchased(oldRecord, newRecord);
        }

        if (type === CREATE) {
            updateIDRLineDescription(newRecord);
            updateMdrpLineDescription(newRecord);
            flagOnePriceInvoice(newRecord);
        }

        if (type === CREATE) {
            removeDescItems(newRecord);
        }
    }

    ////////////////////////////////////////////////

    /* isPriodWasClosed checks if period is closed.
     * Gets posting period from posting period field.
     * If period is closed function returns true, else false
     */
    function isPriodWasClosed(newRecord) {
        const postingPeriod = newRecord.getValue({ fieldId: 'postingperiod' });
        log.debug({ title: 'postingPeriod', details: postingPeriod });

        const results = search.create({
            type: 'accountingperiod',
            filters: [
                ['internalid', 'is', postingPeriod],
                'and', ['closed', 'is', 'T']
            ]
        }).run().getRange({ start: 0, end: 1 });

        return results && results.length > 0;
    }

    /**
     * https://issues.corp.rapid7.com/browse/APPS-5211
     * remove DESC-AUTOREN, DESC-EXPENSE, DESC-SUBCON items from created invoice
     */
    function removeDescItems(newRecord) {
        // correct prod IDs
        const DESC_AUTOREN = '7401';
        const DESC_EXPENSE = '7402';
        const DESC_SUBCON = '7403';
        const DESC_3PRTY = '7415';

        const itemIdsToRemove = [DESC_AUTOREN, DESC_EXPENSE, DESC_SUBCON, DESC_3PRTY];

        const itemCount = Number(newRecord.getLineCount({ sublistId: 'item' }));

        for (let i = itemCount - 1; i >= 0; i--) {
            const itemId = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });

            if (itemIdsToRemove.indexOf(itemId) >= 0) {
                newRecord.removeLine({ sublistId: 'item', line: i });
            }
        }
    }

    /* Checks if invoice is a OnePrice invoice,
       Sets 'OnePrice Invoice' flag, sets 'R7 OnePrice Invoice' form
    */
    function flagOnePriceInvoice(invoiceRec) {
        const lineCount = invoiceRec.getLineCount({ sublistId: 'item' });
        for (let i = 0; i < lineCount; i++) {
            const oneItemFlow = invoiceRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcolr7_one_item_flow',
                line: i
            });

            if (oneItemFlow === '1' || oneItemFlow === '2' || oneItemFlow === '3') {
                invoiceRec.setValue({ fieldId: 'custbodyr7onepriceinvoice', value: true });
                invoiceRec.setValue({ fieldId: 'customform', value: 177 });
            }
        }
    }

    /* For any IDR item lines on invoice,
       add 'Monthly Data Limit', 'Data Center Location', and 'Data Retention Length'
       to the IDR line description
    */
    function updateIDRLineDescription(invoiceRec) {
        var lineCount = invoiceRec.getLineCount({ sublistId: 'item' });
        for (var i = 0; i < lineCount; i++) {
            var itemId = invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            if (itemId === '2689') {
                var monthlyDataLimit = invoiceRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7_monthlydatalimit_gb',
                    line: i
                });
                var dataCenterLocation = invoiceRec.getSublistText({
                    sublistId: 'item',
                    fieldId: 'custcolr7datacenterlocation',
                    line: i
                });
                var dataRetentionLength = invoiceRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcolr7dataretentionlengthdays',
                    line: i
                });

                var description = invoiceRec.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i });
                description += '\n' + 'Fair Use Monthly Data Limit: ' + monthlyDataLimit + 'GB'
                    + '\n' + 'Data Center Location: ' + dataCenterLocation
                    + '\n' + 'Data Retention Length: ' + dataRetentionLength + ' Days Hot'

                invoiceRec.setSublistValue({ sublistId: 'item', fieldId: 'description', line: i, value: description });
            }
        }
    }

    // For any MDRP item lines on invoice, add 'Digital Asset Limit' to the line description
    function updateMdrpLineDescription(newRecord) {
        var mdrpItemName = ['MDRP', 'RMDRP', 'MDRP-SUB'];
        var lineCount = newRecord.getLineCount({ sublistId: 'item' });
        log.audit('lineCount', lineCount);
        for (var i = 0; i < lineCount; i++) {
            
          
            var itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
            var itemName = search.lookupFields({
              type: search.Type.ITEM, 
              id: itemId,
              columns: ['itemid'] 
            }).itemid;
            log.audit("itemName", itemName);
            if(mdrpItemName.indexOf(itemName) != -1){
              log.audit("mdrpItemName.indexOf(itemName) != -1", mdrpItemName.indexOf(itemName) != -1);
              var mdrpDescription = "Fair Use MDRP Digital Asset Limit: ";
              var quantity = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
              var description = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i });
              
              if(quantity > 30000){
                 mdrpDescription += "2000"
              }
              else if (quantity > 10000) {
                mdrpDescription += "1500"
              }
              else if (quantity > 2500){
                mdrpDescription += "1000"
              } 
              else {
                mdrpDescription += "500"
              }
              
              log.audit("mdrpDescription", mdrpDescription);
              if(description.indexOf("Fair Use") == -1){
                description += "\n"+ mdrpDescription;
                log.audit("description", description);
                newRecord.setSublistValue({ sublistId: 'item', fieldId: 'description', line: i, value: description });
              }
            }
        }
    }


    return {
        beforeLoad,
        beforeSubmit
    };
});