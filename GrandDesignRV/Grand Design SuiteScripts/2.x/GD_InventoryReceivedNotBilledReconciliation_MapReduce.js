/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * @NAmdConfig ./GD_InventoryReceivedNotBilledReconciliation_Config.json
 */
define(['N/file', 'N/runtime', 'N/search', 'lzstring'],
/**
 * @param {file} file
 * @param {runtime} runtime
 * @param {search} search
 */
function(file, runtime, search, LZString) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
        var poFromDate = runtime.getCurrentScript().getParameter({name: 'custscriptgd_pofromdate'});
        var postingPeriod = runtime.getCurrentScript().getParameter({name: 'custscriptgd_postingperiod'});

        log.debug('poFromDate', poFromDate)

        var postingPeriodEndDate = search.lookupFields({
            type: search.Type.ACCOUNTING_PERIOD,
            id: postingPeriod,
            columns: ['enddate']
        }).enddate;

        var results = [];

        // PO Search
        var purchaseorderSearchObj = search.create({
            type: "purchaseorder",
            filters:
            [
                ["type","anyof","PurchOrd"], 
                "AND", 
                ["datecreated","onorafter",poFromDate], 
                "AND", 
                ["mainline","is","T"]
            ],
            columns:
            [
                search.createColumn({name: "datecreated", label: "Date Created"}),
                search.createColumn({name: "trandate", label: "Date"}),
                search.createColumn({name: "postingperiod", label: "Period"}),
                search.createColumn({name: "tranid", label: "Document Number"}),
                search.createColumn({name: "entity", label: "Name"}),
                search.createColumn({name: "amount", label: "Amount"}),
            ]
        });
        var searchResultCount = purchaseorderSearchObj.runPaged().count;
        var data = purchaseorderSearchObj.runPaged({pageSize: 1000});
        data.pageRanges.forEach(function(pageRange) {
            var page = data.fetch({index: pageRange.index});
            page.data.forEach(function(result){

                results.push(result);

                return true;
            });
        });

        // Bills with PO# by created date and period
        var vendorbillSearchObj = search.create({
            type: "vendorbill",
            filters:
            [
                ["account","anyof","114"], 
                "AND", 
                ["mainline","any",""], 
                "AND", 
                ["type","anyof","VendBill"], 
                "AND", 
                ["datecreated","onorafter",poFromDate], 
                "AND", 
                ["accountingperiod.enddate","onorbefore",postingPeriodEndDate],
            ],
            columns:
            [
                search.createColumn({
                    name: "trandate",
                    summary: "GROUP",
                    label: "Date"
                }),
                search.createColumn({
                    name: "postingperiod",
                    summary: "GROUP",
                    label: "Period"
                }),
                search.createColumn({
                    name: "tranid",
                    summary: "GROUP",
                    label: "Document Number"
                }),
                search.createColumn({
                    name: "amount",
                    summary: "SUM",
                    label: "Amount"
                }),
                search.createColumn({
                    name: "internalid",
                    join: "createdFrom",
                    summary: "GROUP",
                    label: "Internal ID"
                }),
                search.createColumn({
                    name: "entity",
                    join: "createdFrom",
                    summary: "GROUP",
                    label: "Vendor"
                }),
            ]
        });
        var searchResultCount = vendorbillSearchObj.runPaged().count;
        var data = vendorbillSearchObj.runPaged({pageSize: 1000});
        data.pageRanges.forEach(function(pageRange) {
            var page = data.fetch({index: pageRange.index});
            page.data.forEach(function(result){
                var bill = JSON.parse(JSON.stringify(result));
                bill.recordType = search.Type.VENDOR_BILL;
                results.push(bill);

                return true;
            });
        });

        // Receipts with PO #
        var itemreceiptSearchObj = search.create({
            type: "itemreceipt",
            filters:
            [
                ["account","anyof","114"], 
                "AND", 
                ["mainline","any",""], 
                "AND", 
                ["type","anyof","ItemRcpt"], 
                "AND", 
                ["datecreated","onorafter",poFromDate], 
                "AND", 
                ["accountingperiod.enddate","onorbefore",postingPeriodEndDate]
            ],
            columns:
            [
                search.createColumn({name: "trandate", label: "Date"}),
                search.createColumn({
                    name: "datecreated",
                    sort: search.Sort.DESC,
                    label: "Date Created"
                }),
                search.createColumn({name: "postingperiod", label: "Period"}),
                search.createColumn({name: "tranid", label: "Document Number"}),
                search.createColumn({name: "amount", label: "Amount"}),
                search.createColumn({
                    name: "internalid",
                    join: "createdFrom",
                    label: "Internal ID"
                }),
                search.createColumn({name: "entity", label: "Vendor"}),
            ]
        });
        var searchResultCount = itemreceiptSearchObj.runPaged().count;
        var data = itemreceiptSearchObj.runPaged({pageSize: 1000});
        data.pageRanges.forEach(function(pageRange) {
            var page = data.fetch({index: pageRange.index});
            page.data.forEach(function(result){

                results.push(result);

                return true;
            });
        });

        // Variances - so if it's a po, then link that way. If applied to transaction is a Bill then we have to link to the PO through the bill
        var journalentrySearchObj = search.create({
            type: "journalentry",
            filters:
            [
                ["type","anyof","Journal"], 
                "AND", 
                ["trandate","within",poFromDate,postingPeriodEndDate], 
                "AND", 
                ["appliedtolinktype","anyof","BillVar"], 
                "AND", 
                ["appliedtotransaction.type","anyof","VendBill","PurchOrd"], 
                "AND", 
                ["account","anyof","114"]
            ],
            columns:
            [
                search.createColumn({name: "datecreated", label: "Date Created"}),
                search.createColumn({name: "trandate", label: "Date"}),
                search.createColumn({name: "postingperiod", label: "Period"}),
                search.createColumn({name: "tranid", label: "Document Number"}),
                search.createColumn({name: "entity", label: "Name"}),
                search.createColumn({name: "amount", label: "Amount"}),
                search.createColumn({
                    name: "type",
                    join: "appliedToTransaction",
                    label: "Type"
                }),
                search.createColumn({
                    name: "internalid",
                    join: "appliedToTransaction",
                    label: "Internal ID"
                }),
                search.createColumn({
                    name: "createdfrom",
                    join: "appliedToTransaction",
                    label: "Type"
                }),
            ]
        });
        var searchResultCount = journalentrySearchObj.runPaged().count;
        var data = journalentrySearchObj.runPaged({pageSize: 1000});
        data.pageRanges.forEach(function(pageRange) {
            var page = data.fetch({index: pageRange.index});
            page.data.forEach(function(result){

                results.push(result);

                return true;
            });
        });

        return results;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        var result = JSON.parse(context.value);

        try {
            // Group transactions by PO
            switch (result.recordType) {
                case search.Type.PURCHASE_ORDER:
                    context.write({
                        key: result.id,
                        value: JSON.stringify(result)
                    });
                    break;
                case search.Type.VENDOR_BILL:
                    // Get the PO from createdFrom
                    context.write({
                        key: result.values['GROUP(createdFrom.internalid)'][0].value,
                        value: JSON.stringify(result)
                    });
                    break;
                case search.Type.ITEM_RECEIPT:
                    // Get the PO from createdFrom
                    context.write({
                        key: result.values['createdFrom.internalid'][0].value,
                        value: JSON.stringify(result)
                    });
                    break;
                case search.Type.JOURNAL_ENTRY:

                    var appliedToTransactionType = result.values['appliedToTransaction.type'][0].value;
                    if (appliedToTransactionType == 'PurchOrd') {
                        // The Journal Entry is applied to the PO so get the PO id
                        // from the appliedToTransaction

                        // TODO I've never technically seen this condition be true.
                        // Once I've gotten further along in the processing code
                        // I should come back and make sure that this works.
                        // Hopefully there are just no Journal Entries for POs in
                        // my date range.
                        log.debug('journal entry', JSON.stringify(result));
                        context.write({
                            key: result.values['appliedToTransaction.internalid'][0].value,
                            value: JSON.stringify(result)
                        });
                    }
                    else if (appliedToTransactionType == 'VendBill') {
                        // The Journal Entry is applied to a Vendor Bill so get the
                        // PO id off of the Vendor Bill
                        context.write({
                            key: result.values['appliedToTransaction.createdfrom'][0].value,
                            value: JSON.stringify(result)
                        });
                    }
                    break;
                default:
                    log.debug('default', JSON.stringify(result));
                    break;
            }
        }
        catch (error) {
            log.error('error', JSON.stringify(error));
        }
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
        var values = [];

        var foundPO = false;
        for (var i = 0; i < context.values.length; i++) {
            var result = JSON.parse(context.values[i]);

            if (result.recordType == search.Type.PURCHASE_ORDER)
                foundPO = true;

            values.push(JSON.parse(context.values[i]));
        }

        // Only pass along if the PO wasn't filtered out of our PO search.
        if (foundPO && context.values.length != 1) {
            context.write({
                key: context.key,
                value: values
            });
        }
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        // Log details about the script's execution.
        log.audit({
            title: 'Usage units consumed',
            details: summary.usage
        });
        log.audit({
            title: 'Concurrency',
            details: summary.concurrency
        });
        log.audit({
            title: 'Number of yields',
            details: summary.yields
        });

        var showZero = runtime.getCurrentScript().getParameter({name: 'custscriptgd_showzero'});

        // Build the JSON result data
        var contents = [];
        summary.output.iterator().each(function (key, value)
        {
            // This object contains the data for our report
            // The properties of this object have 'pretty' names because they are
            // the header labels that will appear in the report
            line = {};
            var transactions = JSON.parse(value);

            line['PO #'] = '';
            line['Date'] = '';
            line['Amount'] = 0;
            line['Total Receipts'] = 0;
            line['Total Bills'] = 0;
            line['Total Variance'] = 0;
            line['Net $'] = 0;
            line.bills = [];
            line.receipts = [];

            for (var i = 0; i < transactions.length; i++) {
                switch (transactions[i].recordType) {
                    case search.Type.PURCHASE_ORDER:
                        line['Amount'] += parseFloat(transactions[i].values.amount);

                        line['PO #'] = transactions[i].values.tranid;
                        line['Date'] = transactions[i].values.trandate;

                        break;
                    case search.Type.VENDOR_BILL:
                        line['Total Bills'] += parseFloat(transactions[i].values['SUM(amount)']);

                        line.bills.push({
                            'Bill #': transactions[i].values['GROUP(tranid)'],
                            'Bill Date': transactions[i].values['GROUP(trandate)'],
                            'Bill Period': transactions[i].values['GROUP(postingperiod)'][0].text,
                            'Bill Vendor': transactions[i].values['GROUP(createdFrom.entity)'][0].text,
                            'Bill $': transactions[i].values['SUM(amount)'],
                        });

                        break;
                    case search.Type.ITEM_RECEIPT:
                        line['Total Receipts'] += parseFloat(transactions[i].values.amount);

                        line.receipts.push({
                            'Receipt #': transactions[i].values.tranid,
                            'Receipt Date': transactions[i].values.trandate,
                            'Receipt Period': transactions[i].values.postingperiod[0].text,
                            'Receipt Vendor': transactions[i].values.entity[0].text,
                            'Receipt $': transactions[i].values.amount,
                        });

                        break;
                    case search.Type.JOURNAL_ENTRY:
                        line['Total Variance'] += parseFloat(transactions[i].values.amount);

                        break;
                    default:
                        log.debug('default', JSON.stringify(result));
                        break;
                }
            }

            line['Amount'] = parseFloat(line['Amount'].toFixed(2));
            line['Total Receipts'] = parseFloat(line['Total Receipts'].toFixed(2));
            line['Total Bills'] = parseFloat(line['Total Bills'].toFixed(2));
            line['Total Variance'] = parseFloat(line['Total Variance'].toFixed(2));
            line['Net $'] = parseFloat((line['Total Receipts'] + line['Total Bills'] + line['Total Variance']).toFixed(2));

            // Exclude zero lines optionally
            if (line['Net $'] != 0 || showZero)
                contents.push(line);

             return true;
        });

        var fileObj = file.create({
            name: 'IRNB.json',
            fileType: file.Type.PLAINTEXT,
            contents: LZString.compressToUTF16(JSON.stringify(contents))
        });

        fileObj.folder = 9248563;
        var fileId = fileObj.save();
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
