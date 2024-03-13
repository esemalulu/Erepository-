/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/runtime', 'N/search'], function (runtime, search) {

    function beforeLoad(context) {

        if (context.type === context.UserEventType.CREATE)
            return;
        var form = context.form
        var cur_record = context.newRecord

        var context_data = {}
        context_data.type = context.type
        context_data.recordtype = runtime.getCurrentScript().getParameter('custscript_record_type')

        var pp = cur_record.getValue({
            fieldId: 'postingperiod'
        })

        var fieldLookUp = search.lookupFields({
            type: 'accountingperiod',
            id: pp,
            columns: ['alllocked']
        });

        log.debug("TEST SEARCH",fieldLookUp )
        var rgl_line = ((fieldLookUp.alllocked) ? true : false);
        log.debug("TEST SEARCH",rgl_line )

        context_data.customer = cur_record.getValue({
            fieldId: 'customer'
        })
        context_data.department = cur_record.getValue({
            fieldId: 'department'
        })
        context_data.location = cur_record.getValue({
            fieldId: 'location'
        })
        context_data.debitaccount = cur_record.getValue({
            fieldId: 'aracct'
        })
        context_data.creditaccount = cur_record.getValue({
            fieldId: 'account'
        })
        context_data.currency = cur_record.getValue({
            fieldId: 'currency'
        })
        context_data.exchangerate = cur_record.getValue({
            fieldId: 'exchangerate'
        })
        context_data.postingperiod = rgl_line
        context_data.total = cur_record.getValue({
            fieldId: 'payment'
        })
        
        context_data.total = context_data.total.toFixed(2);
        
        log.debug("data", context_data)

        form.clientScriptModulePath = 'SuiteScripts/ACS_DebitMemo/NS_ACS_CS_createDebitMemo.js';
        form.addButton({
            id: 'custpage_debitmemo',
            label: 'Debit Memo',
            functionName: 'createDebitMemo('+JSON.stringify(context_data)+')'
        })
    }

    return {
        beforeLoad: beforeLoad
    }
});
