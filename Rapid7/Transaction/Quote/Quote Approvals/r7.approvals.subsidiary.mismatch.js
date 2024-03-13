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
            const subsidiary = recQuote.getValue({fieldId: 'subsidiary'});
            log.debug('subsidiary', subsidiary);

            if(subsidiary === '10' || subsidiary === '1'){ //Rapid7 International Limited OR Rapid7 LLC

                const scriptparam = runtime.getCurrentScript();
                const ruleId = scriptparam.getParameter({name: 'custscript_approvalrule_subs'});
                const approverId = scriptparam.getParameter({name: 'custscript_approver_subs'});
                const approvalDescription = "Subsidiary Not Matching with Billing Country on Quote";

                if (isSubsidiaryMismatch(subsidiary, quoteId) && !isDuplicate(quoteId, ruleId, approvalDescription, approverId) && !isInactive(approverId)) {

                    log.debug('Inside If Condition', 'isSubsidiaryMismatch');
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

          return 1;
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

        const isSubsidiaryMismatch = (subsidiary, quoteId) => {

            let fieldLookUp = search.lookupFields({
                type: search.Type.ESTIMATE,
                id: quoteId,
                columns: ['billcountry']
            });

            let billcountry = fieldLookUp['billcountry'];
            if (Array.isArray(billcountry) && billcountry.length > 0){
                billcountry = billcountry[0].value;
            }else{
                billcountry = null;
            }

            log.debug('billcountry', billcountry);

            let international_subs_countries = ['US', 'AS', 'GU', 'MP', 'PR', 'VI'];
            log.debug('billcountry matching subsidiary', international_subs_countries.indexOf(billcountry));

            if(subsidiary === '1'){
                return international_subs_countries.indexOf(billcountry) === -1;

            }else{
                return international_subs_countries.indexOf(billcountry) > -1;
            }
        }

        return { onAction: onAction};
    });
