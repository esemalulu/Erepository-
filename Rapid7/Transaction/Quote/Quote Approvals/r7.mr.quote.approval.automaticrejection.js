/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */

define([
    'N/config',
    'N/email',
    'N/log',
    'N/record',
    'N/runtime',
    'N/search',
    'N/url',
    'N/https'
], function (config, email, log, record, runtime, search, url, https) {
    function getInputData() {
        //log.debug('***inside getinputdata***');
        let scriptparam = runtime.getCurrentScript();
        // noinspection JSCheckFunctionSignatures
        let quoteapprovalsavedsearchid = scriptparam.getParameter('custscript_reject_saved_search');
        if (quoteapprovalsavedsearchid) {
            let searchobj = search.load({
                id: quoteapprovalsavedsearchid
            });
            // noinspection JSCheckFunctionSignatures
            let rejectdays = scriptparam.getParameter('custscript_reject_days');
            let rejectexpression = (rejectdays)? ('daysago' + rejectdays): 'daysago90';
            searchobj.filters.push(
                search.createFilter({
                    name: 'custrecordr7approvaldaterequested',
                    operator: search.Operator.ONORBEFORE,
                    values: rejectexpression
                })
            )
            return searchobj;
        }

    }

    function map(context) {
        //log.debug('***inside map***');
        let mapdata = JSON.parse(context.value);
        let mapdatavalues = mapdata.values;

        let quoteId = mapdatavalues['custrecordr7approvalquote']['value'];
        let quoteApprovalId = mapdatavalues['internalid']['value'];

        context.write({
            key: quoteId,
            value: quoteApprovalId
        });
    }

    // noinspection JSCheckFunctionSignatures
    function reduce(context) {
        log.debug('***inside reduce***');
        //log.debug('context', JSON.stringify(context));
        let quoteId = context.key;
        let quoteApprovalIdArr = context.values;
        log.debug('quoteId',quoteId);
        log.debug('quoteApprovalIdArr',quoteApprovalIdArr);

        quoteApprovalIdArr.forEach(function (quoteApprovalId){
            record.submitFields({
                type: 'customrecordr7approvalrecord',
                id: quoteApprovalId,
                values: {
                    'custrecordr7approvalstatus': 4, //Rejected
                    'custrecordr7approvalcomments': 'Auto rejection - quote approval clean-up'
                }
            });
        })

        let quoteFields = search.lookupFields({
            type: record.Type.ESTIMATE,
            id: quoteId,
            columns: [
                'number',
                'custbodyr7quoteapprovalrequester',
                'salesrep',
                'entity'
            ]
        });
        let quoteNumber = quoteFields['number'];
        let customerName = quoteFields['entity'][0].text;

        let appUrl = config.load({ type: config.Type.COMPANY_INFORMATION })
            .getValue({ fieldId: 'appurl' });
        let recordUrl = url.resolveRecord({ recordType: 'estimate', recordId: quoteId });
        let quoteURL = appUrl + recordUrl;

        let recordURL = `<a href="${quoteURL}">${quoteNumber}</a>`;
        let salesRepText = quoteFields['salesrep'][0].text;

        //Set QUOTE APPROVAL STATUS on Quote to Rejected
        let rec_id = record.submitFields({
            type: record.Type.ESTIMATE,
            id: quoteId,
            values: {
                'custbodyr7quoteorderapprovalstatus': 4 //Rejected
            }
        });
        log.debug('quote rec_id', rec_id);

        //Rejection Notification
        let subject = 'Quote ' + quoteNumber + ' has been rejected';
        let body = '' +
            'CUSTOMER: ' +
            customerName +
            '<br>QUOTE: ' +
            recordURL +
            '<br>SALES REP: ' +
            salesRepText +
            '<br>COMMENTS: Auto rejection - quote approval clean-up';

        // noinspection JSCheckFunctionSignatures
        let netsuiteAdmin = config.load({ type: config.Type.COMPANY_PREFERENCES })
            .getValue({ fieldId: 'custscriptr7_system_info_email_sender' });
        let requester = quoteFields['custbodyr7quoteapprovalrequester'][0].value;
        if (requester == null || requester === '') {
            requester = 55011;
        }
        email.send({
            author: netsuiteAdmin,
            recipients: requester,
            subject: subject,
            body: body,
            relatedRecords: {
                transactionId: quoteId
            }
        })
    }

    function summarize(context) {
        if (context.inputSummary.error) {
            log.debug({ title: 'context.inputSummary.error', details: context.inputSummary.error });
        }

        context.mapSummary.errors.iterator().each(function (key, error) {
            log.error({ title: `Map error: ${key}`, details: error });
        });

        context.reduceSummary.errors.iterator().each(function (key, error) {
            log.error({ title: `Reduce error: ${key}`, details: error });
        });
    }

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});