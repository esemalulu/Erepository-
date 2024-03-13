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
            const billingresponsibleparty = recQuote.getValue({fieldId: 'custbodyr7billingresponsibleparty'});
            log.debug('billingresponsibleparty', billingresponsibleparty);

            if(!isEmpty(billingresponsibleparty)){

                const scriptparam = runtime.getCurrentScript();
                const ruleId = scriptparam.getParameter({name: 'custscript_approvalrule_brp'});
                const approverId = scriptparam.getParameter({name: 'custscript_approver_brp'});
                const approvalDescription = "Bill To Address Does not aligns with Billing Responsible Party";

                if (!isBillToAligned(recQuote, quoteId, billingresponsibleparty) && !isDuplicate(quoteId, ruleId, approvalDescription, approverId) && !isInactive(approverId)) {

                    log.debug('Inside If Condition', 'isBillToAligned');
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

        const isBillToAligned = (recQuote, quoteId, billingresponsibleparty) => {

            const billaddresslist = recQuote.getValue({
                fieldId: 'billaddresslist'
            });
            log.debug('billaddresslist', billaddresslist);

            if(billingresponsibleparty === '1'){ //Customer/Self
                const customer = recQuote.getValue({
                    fieldId: 'entity'
                });
                log.debug('customer', customer);

                let defaultBillingAddressCustomer = null;
                let customerSearchObj = search.create({
                    type: "customer",
                    filters:
                        [
                            ["internalid","anyof",customer],
                            "AND",
                            ["address.isdefaultbilling","is","T"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "addressinternalid",
                                join: "Address",
                                label: "Address Internal ID"
                            })
                        ]
                });
                let searchResultCount = customerSearchObj.runPaged().count;
                log.debug("customerSearchObj result count",searchResultCount);
                customerSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results

                    defaultBillingAddressCustomer = result.getValue({name: "addressinternalid", join: "Address"})
                    return true;
                });
                log.debug('defaultBillingAddressCustomer', defaultBillingAddressCustomer);

                if(!isEmpty(defaultBillingAddressCustomer) && billaddresslist === defaultBillingAddressCustomer){
                    return true;
                }else if(isEmpty(defaultBillingAddressCustomer) && billaddresslist !== -2){
                    return true;
                }
                return false;
            }
            else{ //Partner/Reseller

                const partner = recQuote.getValue({
                    fieldId: 'partner'
                });
                log.debug('partner', partner);
                if(!isEmpty(partner) && (billaddresslist === -2 || isEmpty(billaddresslist))){

                    let partner_billaddressee , partner_billaddress1, partner_billcity, partner_billcountry;
                    let partnerSearchObj = search.create({
                        type: "partner",
                        filters:
                            [
                                ["internalid","anyof",partner]
                            ],
                        columns:
                            [
                                search.createColumn({name: "billaddressee", label: "Billing Addressee"}),
                                search.createColumn({name: "billaddress1", label: "Billing Address 1"}),
                                search.createColumn({name: "billcity", label: "Billing City"}),
                                search.createColumn({name: "billcountry", label: "Billing Country"})
                            ]
                    });
                    let searchResultCount = partnerSearchObj.runPaged().count;
                    log.debug("partnerSearchObj result count",searchResultCount);
                    partnerSearchObj.run().each(function(result){
                        // .run().each has a limit of 4,000 results

                        partner_billaddressee = result.getValue({name: "billaddressee"});
                        partner_billaddress1 = result.getValue({name: "billaddress1"});
                        partner_billcity = result.getValue({name: "billcity"});
                        partner_billcountry = result.getValue({name: "billcountry"});

                        return true;
                    });

                    let fieldLookUp = search.lookupFields({
                        type: search.Type.ESTIMATE,
                        id: quoteId,
                        columns: ['billaddress1', 'billaddressee', 'billcity', 'billcountry']
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

                    log.debug('billaddressee', billaddressee);
                    log.debug('billaddress1', billaddress1);
                    log.debug('billcity', billcity);
                    log.debug('billcountry', billcountry);

                    log.debug('partner_billaddressee', partner_billaddressee);
                    log.debug('partner_billaddress1', partner_billaddress1);
                    log.debug('partner_billcity', partner_billcity);
                    log.debug('partner_billcountry', partner_billcountry);

                    return (billaddressee === partner_billaddressee && billaddress1 === partner_billaddress1 && billcity === partner_billcity && billcountry === partner_billcountry);
                }
                return false;
            }

        }

        const isEmpty = (str) => {

            if (str != null && str !== '') {
                str = str.replace(/\s/g, '');
            }
            return str == null || str === '' || str.length < 1;
        }

        return {onAction};
    });
