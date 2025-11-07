/**
* @NApiVersion 2.x
* @NScriptType ClientScript
*/
define(['N/search', 'N/log'],
    function(search, log) {
 
        function pageInit(context) {
            var currentRecord = context.currentRecord;
            var invoiceId = currentRecord.id;
            log.debug('Invoice ID', invoiceId);
            if (invoiceId) {
                var invoiceSearchObj = search.create({
                    type: "invoice",
                    filters: [
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["job.internalid", "anyof", invoiceId]
                    ],
                    columns: [
                        search.createColumn({
                            name: "trandate",
                            summary: "MAX",
                            label: "Date"
                        })
                    ],
                    sort: [
                        { name: 'trandate', sort: search.Sort.DESC }
                    ]
                });
 
                var searchResult = invoiceSearchObj.run().getRange({ start: 0, end: 1 });
 
                if (searchResult.length > 0) {
                    var latestDate = searchResult[0].getValue({ name: 'trandate', summary: 'MAX' });
                    log.debug('Latest Invoice Date', latestDate);
 
                    currentRecord.setValue({
                        fieldId: 'custbody_from_date',
                        value: latestDate
                    });
                } else {
                    log.debug('No Invoices Found', 'No invoices found for the given job.');
                }
            } else {
                log.debug('Field ID Missing', 'Field ID value is missing.');
            }
        }
 
        return {
            pageInit: pageInit
        };
    });
