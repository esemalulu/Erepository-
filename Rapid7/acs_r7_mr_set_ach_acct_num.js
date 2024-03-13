/**
 *    Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define(["N/runtime", "N/search", "N/record"], function (runtime, search, record) {

    var PAGE_SIZE = 500;

    function getInputData() {

        var intSearchId = runtime.getCurrentScript().getParameter("custscript_r7_saved_search")

        var objSearch = search.load({id: intSearchId})

        var pagedRun = objSearch.runPaged({pageSize: PAGE_SIZE});

        var pageCount = pagedRun.pageRanges.length;
        var results = new Array();

        for (var i=0; i < pageCount; i++){
            var searchPage = pagedRun.fetch({index: i});

            searchPage.data.forEach(function(result){

                results.push(result.id)

            })
        }

        return results;

    }

    function map(context) {
        log.debug("MAP context", JSON.stringify(context));

        try {
            
            var intVendorId = context.value;

            var objVendor = record.load({
                type: record.Type.VENDOR,
                id: intVendorId
            })

                var intACHCount = objVendor.getLineCount('achacct');
                if (intACHCount > 0) {
                    var strAccountNumber = objVendor.getSublistValue('achacct', 'accountnumber', 0);
                    record.submitFields({type: record.Type.VENDOR, id: intVendorId, values: {'custentity_r7_ach_acct_number' : strAccountNumber}});
                }
            
        }catch(e){
            log.error('Error: not possible to set Account Number', JSON.stringify(e));
        }
    }

    function summarize(summary) {
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    }
})