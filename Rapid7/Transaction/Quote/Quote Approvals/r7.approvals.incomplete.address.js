/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/log', 'N/search', 'N/runtime', 'N/record'],

    (log, search, runtime, record) => {
        const onAction = (context) => {

            const recQuote = context.newRecord;
            const quoteId = recQuote.id;
            const oppId = recQuote.getValue({fieldId: 'opportunity'});
            //log.debug('oppId', oppId);
            const scriptparam = runtime.getCurrentScript();
            const ruleId = scriptparam.getParameter({name: 'custscript_approvalrule'});
            const approverId = scriptparam.getParameter({name: 'custscript_approver'});
            const approvalDescription = "Missing ̏ Address Fields on Quote";

            if (isIncompleteAddress(quoteId) && !isDuplicate(quoteId, ruleId, approvalDescription, approverId) && !isInactive(approverId)) {

                let recApproval = record.create({
                    type: 'customrecordr7approvalrecord'
                });

                recApproval.setValue({fieldId: 'custrecordr7approvalrule', value: ruleId});
                recApproval.setValue({fieldId: 'custrecordr7approveopportunity', value: oppId});
                recApproval.setValue({fieldId: 'custrecordr7approvalquote', value: quoteId});
                recApproval.setValue({fieldId: 'custrecordr7approvaldescription', value: approvalDescription});
                recApproval.setValue({fieldId: 'custrecordr7approvalapprover', value: approverId});
                recApproval.setValue({fieldId: 'custrecordr7approvalstatus', value: '1'});

                let recApprovalId = recApproval.save();
                log.debug('recApprovalId', recApprovalId);
            }

        }

        const isDuplicate = (quoteId, rule, description, approver) => {

            const customrecordr7approvalrecordSearchObj = search.create({
                type: "customrecordr7approvalrecord",
                filters:
                    [
                        ["custrecordr7approvalquote","anyof",quoteId],
                        "AND",
                        ["custrecordr7approvalstatus","anyof","3","2","7"],
                        "AND",
                        ["custrecordr7approvalrule","anyof",rule],
                        "AND",
                        ["custrecordr7approvaldescription","is",description],
                        "AND",
                        ["custrecordr7approvalapprover","anyof",approver]
                    ],
                columns:
                    [
                        search.createColumn({name: "custrecordr7approvalrule", label: "Rule"}),
                        search.createColumn({name: "custrecordr7approvaldescription", label: "Description"}),
                        search.createColumn({name: "custrecordr7approvalapprover", label: "Approver"})
                    ]
            });
            const searchResultCount = customrecordr7approvalrecordSearchObj.runPaged().count;
            log.debug("customrecordr7approvalrecordSearchObj result count",searchResultCount);

            return searchResultCount > 0;
        }

        const isInactive = (employeeId) => {

            const isInactive = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: employeeId,
                columns: ['isinactive']
            })['isinactive'];

            log.debug('isInactive', isInactive);
            return isInactive;
        }

        const isIncompleteAddress = (quoteId) => {

             let fieldLookUp = search.lookupFields({
                type: search.Type.ESTIMATE,
                id: quoteId,
                columns: ['billaddress1', 'billaddressee', 'billcity', 'billcountry', 'shipaddress1', 'shipaddressee', 'shipcity', 'shipcountry']
            });

            let billaddress1 = fieldLookUp['billaddress1'];
            let billaddressee = fieldLookUp['billaddressee'];
            let billcity = fieldLookUp['billcity'];
            let billcountry = fieldLookUp['billcountry'];
            if (Array.isArray(billcountry) && billcountry.length > 0){
                billcountry = billcountry[0].value;
            }else{
                billcountry = null;
            }

            let shipaddress1 = fieldLookUp['shipaddress1'];
            let shipaddressee = fieldLookUp['shipaddressee'];
            let shipcity = fieldLookUp['shipcity'];
            let shipcountry = fieldLookUp['shipcountry'];
            if (Array.isArray(shipcountry) && shipcountry.length > 0){
                shipcountry = shipcountry[0].value;
            }else{
                shipcountry = null;
            }

            log.debug('billaddress1', billaddress1);
            log.debug('billaddressee', billaddressee);
            log.debug('billcity', billcity);
            log.debug('billcountry', billcountry);

            log.debug('shipaddress1', shipaddress1);
            log.debug('shipaddressee', shipaddressee);
            log.debug('shipcity', shipcity);
            log.debug('shipcountry', shipcountry);

            log.debug('Boolean Value of Address', (isEmpty(billaddress1) || isEmpty(billaddressee) || isEmpty(billcity) || isEmpty(billcountry) || isEmpty(shipaddress1) || isEmpty(shipaddressee) || isEmpty(shipcity) || isEmpty(shipcountry)));

            return (isEmpty(billaddress1) || isEmpty(billaddressee) || isEmpty(billcity) || isEmpty(billcountry) || isEmpty(shipaddress1) || isEmpty(shipaddressee) || isEmpty(shipcity) || isEmpty(shipcountry));
        }

        const isEmpty = (str) => {

            if (str != null && str !== '') {
                str = str.replace(/\s/g, '');
            }
            return str == null || str === '' || str.length < 1;
        }

        return {onAction};
    });
