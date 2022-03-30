/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 */

define(["N/http", "N/file", "N/record", "N/render", "N/redirect", "N/runtime", "N/search", "N/error", "N/email","N/format"],
    function(http, file, record, render, redirect, runtime, search, error,email,format) {
        function afterSubmit(context) {
            log.debug('got here where I am running the original ue script after a save of the record');
            //Make sure this je search is pushed to sandbox so I can test
            //Need to think of a way that if one of the records will succesfully create but the other
            //will not, to stop both from being saved. Otherwise, could run into UI/admin issues.
            //Best idea I can come up with now is something like a throw or continue to
            //move the script to a place where it will delete whichever record was created if the other fails

            //TODO: running into a weird issue where I set the account value to the correct account id number
            //TODO: which is what it looks like it needs to on the JE, but get told its an invalid field value
            //TODO: even when hardcoding with a value I know is correct

            //NS help says amort schedules are auto created if a transaction needs it, so I will not set that
            //on the JE

            //to set currency, normally inherits from subsidiary, so I can have script pull the sub currency
            //or, I can see if they want to add that field to the policy record/workflow overall
            var script = runtime.getCurrentScript();
          log.audit('script', JSON.stringify(script));
            var policyRecord=context.newRecord;
            var policyId = policyRecord.getValue('id');
            var policyNamedInsured = policyRecord.getValue('custrecord_insured_name');
            var policyNumber = policyRecord.getValue('custrecord_policy_number');
            var coalitionPolicyNumber = policyRecord.getValue('custrecord_coalition_policy_number');
            var policyMarket = policyRecord.getValue('custrecord_market');
            var policyDetails = policyRecord.getValue('custrecord_tran_type');
            var policyCurrency = policyRecord.getValue('custrecord_nsts_policy_currency');
            var policyEffectiveDate = policyRecord.getValue('custrecord_policy_eff_date');
            var policyExpirationDate = policyRecord.getValue('custrecord_policy_exp_date');
            var policyLob = policyRecord.getValue('custrecord_lob');
            var totalBoundPremium = policyRecord.getValue('custrecord_total_premium_bound');
            var policySubsidiary = policyRecord.getValue('custrecord_subsidiary_customer');
            var policyCurrency = policyRecord.getValue('custrecord_nsts_policy_currency');
            var policyCustomer = policyRecord.getValue('custrecord_agency_name');
            var policyPartner = policyRecord.getValue('custrecord_broker_partner');
            var policyPaymentMethod = policyRecord.getValue('custrecord_payment_method');
            var policyCreditMemoCheck = policyRecord.getValue('custrecord_credit_memo');
            var negativesParam = script.getParameter({name: 'custscript_nsts_discount_items_beta'});
            var policyActualDate = policyRecord.getValue('custrecord_nsts_actual_date');
            var negativesArray = negativesParam.split(",");
            var errEmail    = {hasFailure: false, failMessage: '', failId: ''};

            log.debug('this is the negatives array', negativesArray);

            if (!isEmpty(policyActualDate)) {
                log.debug('got here in the first check to see if actual date is not empty');

                var parsedActualDate = format.parse({
                    value: policyActualDate,
                    type: format.Type.DATE
                });
                log.debug('the parsed actual date is', parsedActualDate);
            }

            var loadedPolicyRecord = record.load({
                type: 'customrecord_coalition_policy',
                id: policyId,
                isDynamic: true,
            });

            var jeCheck = policyRecord.getValue('custrecord_journal_entry_created');
            var soCheck = policyRecord.getValue('custrecord_sales_order_created');
            log.debug('this is the je check',jeCheck);
            log.debug('this is the so check',soCheck);

            //should only try creating a JE from the policy record if it hasn't been done already
            if (!jeCheck) {
                try {
                  var test = yes;
                    var policySubRecordSearch = search.load({
                        id:  'customsearch_col_policy_je_lines_new',
                    });
                    var policyIdFilter = search.createFilter({
                        name: 'internalid',
                        join: 'custrecord_policy_parent',
                        operator: search.Operator.ANYOF,
                        values: policyId
                    });
                    log.debug('this is the id filter',policyIdFilter);
                    policySubRecordSearch.filters.push(policyIdFilter);

                    var jePrintingResults = policySubRecordSearch.run();
                    var jePrintingRange = jePrintingResults.getRange({
                        start: 0,
                        end: 999
                    });
                    log.debug('this is the search format itself',policySubRecordSearch);
                    log.debug('these are all the search results',jePrintingRange);

                    //Next, I will go through all the JE lines on the policy subrecord and set them as lines on the JE
                    //Need to check if I want to add info all to one JE, or if there is a sorting criteria I need to make
                    //to create multiple JEs

                    //before trying to make a je with the lines, need to check if the je sublist has content
                    if (jePrintingRange.length > 1) {

                        var newJERecord = record.create({
                            type: record.Type.JOURNAL_ENTRY,
                            isDynamic: true
                        });

                        newJERecord.setValue({
                            fieldId: 'subsidiary',
                            value: policySubsidiary,
                            ignoreFieldChange: true
                        });

                        newJERecord.setValue({
                            fieldId: 'currency',
                            value: policyCurrency
                        });
                        newJERecord.setValue({
                            fieldId: 'custbody_policy_number',
                            value: policyId
                        });

                        if (!isEmpty(policyActualDate)) {
                            log.debug('this is the policy actual date before trying to set on je',policyActualDate);
                            newJERecord.setValue({
                                fieldId: 'trandate',
                                value: parsedActualDate
                            });
                        }

                        //there seem to be multiple customers in the line on the policy, need to see how to handle
                        for (var i = 0; i < jePrintingRange.length; i++) {
                            var currentJELine = jePrintingRange[i];
                            log.debug('this is the current je line', currentJELine);
                            var jeAccount = currentJELine.getValue('custrecord_policy_je_account');
                            log.debug('this is the JE account', jeAccount);
                            var jeDebit = currentJELine.getValue('custrecord_je_debit');
                            if (!isEmpty(jeDebit)) {
                                log.debug('this is the je debit, it is not empty', jeDebit);
                            }
                            var jeCredit = currentJELine.getValue('custrecord_je_credit');
                            if (!isEmpty(jeDebit)) {
                                log.debug('this is the je debit, it is not empty', jeCredit);
                            }
                            var jeLineType = currentJELine.getValue('custrecord_je_line_type');
                            log.debug('this is the jeLineType', jeLineType);
                            if (!isEmpty(currentJELine.getValue('custrecord_start_date'))) {
                                var jeStartDate = format.parse({
                                    value: currentJELine.getValue('custrecord_start_date'),
                                    type: format.Type.DATE
                                });
                            }

                            if (!isEmpty(jeStartDate)) {
                                log.debug('this is the start date', jeStartDate);
                            }
                            if(!isEmpty(currentJELine.getValue('custrecord_end_date'))) {
                                var jeEndDate = format.parse({
                                    value: currentJELine.getValue('custrecord_end_date'),
                                    type: format.Type.DATE
                                });
                            }

                            if (!isEmpty(jeEndDate)) {
                                log.debug('this is the start date', jeEndDate);
                            }
                            var jeAmortizationSchedule = currentJELine.getValue('custrecord_nsts_amort_id');
                            if (!isEmpty(jeAmortizationSchedule)) {
                                log.debug('this is the amort sched', jeAmortizationSchedule);
                            }
                            var jeVendor = currentJELine.getValue('custrecord_vendor');
                            if (!isEmpty(jeVendor)) {
                                log.debug('this is the vendor', jeVendor);
                            }
                            var jeCustomer = currentJELine.getValue('custrecord_customer');
                            if (!isEmpty(jeCustomer)) {
                                log.debug('this is the je customer', jeCustomer);
                            }
                            var jeInsuredName = currentJELine.getValue('custrecord_insured_name_lines');
                            if (!isEmpty(jeInsuredName)) {
                                log.debug('this is the je name', jeInsuredName);
                            }
                            var jePolicyLine = currentJELine.getValue('custrecord_coalition_policy_number_lines');
                            if (!isEmpty(jePolicyLine)) {
                                log.debug('this is the je policy line info', jePolicyLine);
                            }
                            //Now that I have all the values for this current line, I should add them all to a JE I create
                            //before the loop runs, then save the JE after running through all lines.
                            newJERecord.insertLine({
                                sublistId: 'line',
                                line: 0,
                            });
                            newJERecord.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: jeAccount
                            });
                            if (!isEmpty(jeDebit)) {
                                newJERecord.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'debit',
                                    value: jeDebit
                                });
                            }
                            if (!isEmpty(jeCredit)) {
                                newJERecord.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'credit',
                                    value: jeCredit
                                });
                            }
                            //Marcy said there will only be either a vendor or customer, not both.
                            //vend/cust is used to set the name, or entity, field on the JE line

                            log.debug('this is the jevendor before trying to set it',jeVendor);
                            if (!isEmpty(jeVendor)) {
                                newJERecord.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'entity',
                                    value: jeVendor
                                });
                            }
                            log.debug('this is the jecustomer before trying to set it',jeCustomer);
                            if (!isEmpty(jeCustomer)) {
                                newJERecord.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'entity',
                                    value: jeCustomer
                                });
                            }

                            //Doug said will hardcode dept and class to Rev/cogs
                            //id 22 and 23 are for class and dept respectively for rev/cogs

                            newJERecord.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'class',
                                value: 22
                            });
                            newJERecord.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'department',
                                value: 23
                            });

                            if (!isEmpty(jeStartDate)) {
                                newJERecord.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'startdate',
                                    value: jeStartDate
                                });
                            }
                            if (!isEmpty(jeEndDate)) {
                                newJERecord.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'enddate',
                                    value: jeEndDate
                                });
                            }
                            //Here I am assuming schedule matches with amortization schedule
                            if (!isEmpty(jeAmortizationSchedule)) {
                                newJERecord.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'schedule',
                                    value: jeAmortizationSchedule
                                });
                            }
                            newJERecord.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'custcol_coalition_policy_line',
                                value: policyId
                            });

                            if (!isEmpty(jeInsuredName)) {
                                newJERecord.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'custcol_coalition_named_insured',
                                    value: jeInsuredName
                                });
                            }
                            newJERecord.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'custcol_coalition_policy_line',
                                value: policyId
                            });
                            if (!isEmpty(coalitionPolicyNumber)) {
                                newJERecord.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'custcol_col_policy_number',
                                    value: coalitionPolicyNumber
                                });
                            };
                            newJERecord.commitLine({
                                sublistId: 'line'
                            });
                        }
                        jeCheck = true;
                        loadedPolicyRecord.setValue({
                            fieldId: 'custrecord_journal_entry_created',
                            value: true
                        });
                        newJERecord.save();


                        var jeId = newJERecord.id;
                        loadedPolicyRecord.setValue({
                            fieldId: 'custrecord_coal_je_id_kp',
                            value: jeId
                        });
                    }
                }
                catch (error) {
                    log.error({title : 'Journal Entry creation error, this will stop both JE and SO creation', details: error});
                    var errorMsg = error.message;
                    log.debug('logging error', errorMsg);
                    errEmail.hasFailure  = true;
                    errEmail.failMessage = 'Journal Entry creation error. ';
                    errEmail.failId      = loadedPolicyRecord.id

                    //throw error;
                }

            }

            //now that I have fully made and saved the je record, do the same for the SO record, keeping in mind
            //that many of the values will be changed.
            //only want to do this if an SO is not already created
            if (!soCheck) {
                try {
                    var policySOSubSearch = search.load({
                        id:  'customsearch_col_create_sales_order_new',
                    });
                    log.debug('this is the so search without added filter',policySOSubSearch);
                    var policyIdFilter2 = search.createFilter({
                        name: 'internalid',
                        join: 'custrecord_policy_parent_so',
                        operator: search.Operator.ANYOF,
                        values: policyId
                    });
                    log.debug('this is the id filter',policyIdFilter2);
                    policySOSubSearch.filters.push(policyIdFilter2);
                    log.debug('this is the so search with added filter',policySOSubSearch);

                    var soPrintingResults = policySOSubSearch.run();
                    log.debug('this is the so printing results',soPrintingResults);
                    var soPrintingRange = soPrintingResults.getRange({
                        start: 0,
                        end: 999
                    });

                    log.debug('this is the so printing range', soPrintingRange);

                    //Next, I will go through all the JE lines on the policy subrecord and set them as lines on the JE
                    //Need to check if I want to add info all to one JE, or if there is a sorting criteria I need to make
                    //to create multiple JEs

                    //before doing any so lines creation, check if the lines actually exist
                    if (soPrintingRange.length > 0) {

                        if (!policyCreditMemoCheck){
                            var newSORecord = record.create({
                                type: record.Type.SALES_ORDER,
                                isDynamic: true
                            });

                            //set the order type to new, or 1
                            newSORecord.setValue({
                                fieldId: 'custbody_nsts_order_type',
                                value: 1
                            });
                            newSORecord.setValue({
                                fieldId: 'entity',
                                value: policyCustomer
                            });
                            newSORecord.setValue({
                                fieldId: 'currency',
                                value: policyCurrency
                            });
                            newSORecord.setValue({
                                fieldId: 'partner',
                                value: policyPartner
                            });
                            newSORecord.setValue({
                                fieldId: 'custbody_policy_number',
                                value: policyId
                            });

                            if (!isEmpty(policyActualDate)) {
                                log.debug('this is the policy actual date before trying to set on je',policyActualDate);
                                newSORecord.setValue({
                                    fieldId: 'trandate',
                                    value: parsedActualDate
                                });
                            }

                            if (!isEmpty(policyExpirationDate)) {
                                newSORecord.setValue({
                                    fieldId: 'custbody_coa_exp_date',
                                    value: policyExpirationDate
                                });
                            }
                            //there seem to be multiple customers in the line on the policy, need to see how to handle
                            for (var j=0; j<soPrintingRange.length; j++) {
                                var currentSOLine = soPrintingRange[j];
                                var soCustomer = currentSOLine.getValue('custrecord_customer_so');
                                if (!isEmpty(soCustomer)) {
                                    log.debug('this is the so customer',soCustomer);
                                }
                                var soRate = currentSOLine.getValue('custrecord_rate_so');
                                if (!isEmpty(soRate)) {
                                    log.debug('this is the so Rate',soRate);
                                }
                                soRate = Math.abs(soRate);
                                var soStartDate = currentSOLine.getValue('custrecord_term_start_date');
                                if (!isEmpty(soStartDate)) {
                                    log.debug('this is the so start date',soStartDate);
                                }
                                var soEndDate = currentSOLine.getValue('custrecord_term_end_date');
                                if (!isEmpty(soEndDate)) {
                                    log.debug('this is the so end date',soEndDate);
                                }
                                var soItem = currentSOLine.getValue('custrecord_item_so');
                                if (!isEmpty(soItem)) {
                                    log.debug('this is the so item',soItem);
                                }
                                var soPolicyNum = currentSOLine.getValue('custrecord_policy_number_so');
                                if (!isEmpty(soPolicyNum)) {
                                    log.debug('this is the so Policy number',soPolicyNum);
                                }
                                var soPolicyName = currentSOLine.getValue('custrecord_policy_name_so_lines');
                                if (!isEmpty(soPolicyName)) {
                                    log.debug('this is the so Policy name',soPolicyName);
                                }


                                //Now that I have all the values for this current line, I should add them all to a SO I create
                                //before the loop runs, then save the SO after running through all lines.
                                newSORecord.insertLine({
                                    sublistId: 'item',
                                    line: j,
                                });

                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: soItem
                                });
                                log.debug('got here where I have just inserted a line to the so');

                                //go through the negatives array to see if this value is one that should appear as negative
                                //if so, set price level to custom and the value as negative
                                //-1 is the value for a custom price level
                                for (var n=0; n<negativesArray.length;n++) {
                                    if (negativesArray[n]==soItem) {
                                        log.debug('got here where the item is in the negatives array');
                                        newSORecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'price',
                                            value: -1
                                        });
                                        soRate = soRate * -1;
                                        log.debug('this is the soRate after negative adjustment',soRate);
                                    }
                                }

                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'amount',
                                    value: soRate
                                });

                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coalition_policy_line',
                                    value: policyId
                                });

                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'class',
                                    value: 22
                                });
                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'department',
                                    value: 23
                                });

                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coa_tran_pol_det',
                                    value: policyDetails
                                });

                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coa_tran_ins_mar',
                                    value: policyMarket
                                });

                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coalition_named_insured',
                                    value: policyNamedInsured
                                });

                                if (!isEmpty(soStartDate)) {
                                    newSORecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_atlas_contract_start_date',
                                        value: new Date (soStartDate)
                                    });
                                }

                                if (!isEmpty(soEndDate)) {
                                    newSORecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_atlas_contract_end_date',
                                        value: new Date (soEndDate)
                                    });
                                }

                                if (!isEmpty(policyEffectiveDate)) {
                                    newSORecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_coa_tran_eff_date',
                                        value: policyEffectiveDate
                                    });
                                }

                                log.debug('this is the policy effective date',policyEffectiveDate);
                                log.debug('this is the policy expiration date',policyExpirationDate);

                                if (!isEmpty(policyExpirationDate)) {
                                    log.debug('got here where there is a policy expiration date, and set the value')
                                    newSORecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_coa_tran_expir_date',
                                        value: policyExpirationDate
                                    });
                                }

                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coalition_lob',
                                    value: policyLob
                                });

                                newSORecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_total_premium_bound_so',
                                    value: totalBoundPremium
                                });

                                newSORecord.commitLine({
                                    sublistId: 'item'
                                });
                            }

                            soCheck=true;
                            loadedPolicyRecord.setValue({
                                fieldId: 'custrecord_sales_order_created',
                                value: true
                            });

                            newSORecord.save();
                            var soId = newSORecord.id;
                            //now that the SO is saved, I want to create an invoice from that SO.
                            //5 is the internal id of the credit card payment method, if cred, then normal invoice
                            if (policyPaymentMethod == '7') {
                                var invoiceRecord = record.transform({
                                    fromType: record.Type.SALES_ORDER,
                                    fromId: soId,
                                    toType: record.Type.INVOICE,
                                    isDynamic: true,
                                });

                                //In this case, the currency is canadian, so we want the invoice form to be canada form
                                if (policySubsidiary == 10) {
                                    invoiceRecord.setValue({
                                        fieldId: 'customform',
                                        value: 158
                                    });
                                }

                                invoiceRecord.setValue({
                                    fieldId: 'approvalstatus',
                                    value: 2
                                });

                                if (!isEmpty(policyActualDate)) {
                                    log.debug('this is the policy actual date before trying to set on je',policyActualDate);
                                    invoiceRecord.setValue({
                                        fieldId: 'trandate',
                                        value: parsedActualDate
                                    });
                                }

                                invoiceRecord.save();

                                //now that I saved the invoice record, I want to load it from it's id, and save that id to the
                                //policy record
                                var invoiceId = invoiceRecord.id;
                                log.debug('this is the invoice id',invoiceId);
                                loadedPolicyRecord.setValue({
                                    fieldId: 'custrecord_nsts_invoice_id',
                                    value: invoiceId
                                });
                                loadedPolicyRecord.setValue({
                                    fieldId: 'custrecord_coal_je_id_kp',
                                    value: jeId
                                });
                                loadedPolicyRecord.setValue({
                                    fieldId: 'custrecord_ns_sales_order',
                                    value: soId
                                });
                            }
                            //In this case, the payment method is invoice, should just make a cash sale
                            if (policyPaymentMethod == '5') {
                                var cashSaleRecord = record.create({
                                    type: record.Type.CASH_SALE,
                                    isDynamic: true
                                });

                                cashSaleRecord.setValue({
                                    fieldId: 'custbody_nsts_order_type',
                                    value: 1
                                });
                                cashSaleRecord.setValue({
                                    fieldId: 'entity',
                                    value: policyCustomer
                                });
                                cashSaleRecord.setValue({
                                    fieldId: 'currency',
                                    value: policyCurrency
                                });
                                cashSaleRecord.setValue({
                                    fieldId: 'createdfrom',
                                    value: soId
                                });

                                if (!isEmpty(policyActualDate)) {
                                    log.debug('this is the policy actual date before trying to set on je',policyActualDate);
                                    cashSaleRecord.setValue({
                                        fieldId: 'trandate',
                                        value: parsedActualDate
                                    });
                                }

                                for (var c=0; c<soPrintingRange.length; c++) {
                                    var currentCashLine = soPrintingRange[c];
                                    var cashCustomer = currentCashLine.getValue('custrecord_customer_so');
                                    if (!isEmpty(cashCustomer)) {
                                        log.debug('this is the cash customer',cashCustomer);
                                    }
                                    var cashRate = currentCashLine.getValue('custrecord_rate_so');
                                    if (!isEmpty(cashRate)) {
                                        log.debug('this is the cash Rate',cashRate);
                                    }
                                    cashRate = Math.abs(cashRate);
                                    var cashStartDate = currentCashLine.getValue('custrecord_term_start_date');
                                    if (!isEmpty(cashStartDate)) {
                                        log.debug('this is the cash start date',cashStartDate);
                                    }
                                    var cashEndDate = currentCashLine.getValue('custrecord_term_end_date');
                                    if (!isEmpty(cashEndDate)) {
                                        log.debug('this is the cash end date',cashEndDate);
                                    }
                                    var cashItem = currentCashLine.getValue('custrecord_item_so');
                                    if (!isEmpty(cashItem)) {
                                        log.debug('this is the cash item',cashItem);
                                    }
                                    var cashPolicyNum = currentCashLine.getValue('custrecord_policy_number_so');
                                    if (!isEmpty(cashPolicyNum)) {
                                        log.debug('this is the cash Policy number',cashPolicyNum);
                                    }
                                    var cashPolicyName = currentCashLine.getValue('custrecord_policy_name_so_lines');
                                    if (!isEmpty(cashPolicyName)) {
                                        log.debug('this is the cash Policy name',cashPolicyName);
                                    }



                                    //Now that I have all the values for this current line, I should add them all to a SO I create
                                    //before the loop runs, then save the SO after running through all lines.
                                    cashSaleRecord.insertLine({
                                        sublistId: 'item',
                                        line: c,
                                    });

                                    cashSaleRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        value: cashItem
                                    });

                                    cashSaleRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_coalition_policy_line',
                                        value: policyId
                                    });

                                    for (var l=0; l<negativesArray.length;l++) {
                                        if (negativesArray[l]==cashItem) {
                                            log.debug('got here where the item is in the negatives array');
                                            cashSaleRecord.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'price',
                                                value: -1
                                            });
                                            cashRate = cashRate * -1;
                                            log.debug('this is the cashRate after negative adjustment',cashRate);
                                        }
                                    }

                                    cashSaleRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'amount',
                                        value: cashRate
                                    });

                                    cashSaleRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'class',
                                        value: 22
                                    });
                                    cashSaleRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'department',
                                        value: 23
                                    });

                                    cashSaleRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_coalition_lob',
                                        value: policyLob
                                    });

                                    cashSaleRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_total_premium_bound_so',
                                        value: totalBoundPremium
                                    });

                                    if (!isEmpty(cashStartDate)) {
                                        cashSaleRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'custcol_atlas_contract_start_date',
                                            value: new Date (cashStartDate)
                                        });
                                    }

                                    if(!isEmpty(cashEndDate)) {
                                        cashSaleRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'custcol_atlas_contract_end_date',
                                            value: new Date (cashEndDate)
                                        });
                                    }

                                    //cashSaleRecord.setCurrentSublistValue({
                                    //sublistId: 'item',
                                    //fieldId: 'custcol_coa_tran_eff_date',
                                    //  value: policyEffectiveDate
                                    //});

                                    //log.debug('this is the policy effective date',policyEffectiveDate);
                                    //log.debug('this is the policy expiration date',policyExpirationDate);

                                    //cashSaleRecord.setCurrentSublistValue({
                                    //sublistId: 'item',
                                    //fieldId: 'custcol_coa_tran_expir_date',
                                    //  value: policyExpirationDate
                                    //});

                                    //cashSaleRecord.setCurrentSublistValue({
                                    //  sublistId: 'item',
                                    //fieldId: 'custcol_coalition_named_insured',
                                    //value: policyNamedInsured
                                    //});
                                    log.debug('this is the total bound premium I am about to set as teh insured pays',totalBoundPremium);

                                    cashSaleRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_coalition_insured_pays',
                                        value: totalBoundPremium
                                    });

                                    cashSaleRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_coalition_named_insured',
                                        value: policyNamedInsured
                                    });

                                    cashSaleRecord.commitLine({
                                        sublistId: 'item'
                                    });
                                }
                                cashSaleRecord.save();
                            }
                        }
                        if (policyCreditMemoCheck) {
                            var creditMemoRecord = record.create({
                                type: record.Type.CREDIT_MEMO,
                                isDynamic: true
                            });

                            if (policySubsidiary == 10) {
                                creditMemoRecord.setValue({
                                    fieldId: 'customform',
                                    value: 157
                                });
                            }

                            creditMemoRecord.setValue({
                                fieldId: 'custbody_nsts_order_type',
                                value: 1
                            });
                            creditMemoRecord.setValue({
                                fieldId: 'entity',
                                value: policyCustomer
                            });
                            creditMemoRecord.setValue({
                                fieldId: 'currency',
                                value: policyCurrency
                            });
                            creditMemoRecord.setValue({
                                fieldId: 'createdfrom',
                                value: soId
                            });
                            creditMemoRecord.setValue({
                                fieldId: 'partner',
                                value: policyPartner
                            });
                            creditMemoRecord.setValue({
                                fieldId: 'custbody_policy_number',
                                value: policyId
                            });
                            var expirFormattedDateHeader = format.format({
                                value: policyExpirationDate,
                                type: format.Type.DATE
                            });
                            if(!isEmpty(policyExpirationDate)) {
                                creditMemoRecord.setValue({
                                    fieldId: 'custbody_coa_exp_date',
                                    value: policyExpirationDate
                                });
                            }

                            if (!isEmpty(policyActualDate)) {
                                log.debug('this is the policy actual date before trying to set on je',policyActualDate);
                                creditMemoRecord.setValue({
                                    fieldId: 'trandate',
                                    value: parsedActualDate
                                });
                            }

                            //By default will set to 1 to represent insured value, as policy has a lot of insured name info
                            creditMemoRecord.setValue({
                                fieldId: 'custbody2',
                                value: 1
                            });

                            for (var cr = 0; cr < soPrintingRange.length; cr++) {
                                var currentCreditLine = soPrintingRange[cr];
                                var creditCustomer = currentCreditLine.getValue('custrecord_customer_so');
                                if (!isEmpty(creditCustomer)) {
                                    log.debug('this is the credit customer', creditCustomer);
                                }
                                var creditStartDate = currentCreditLine.getValue('custrecord_term_start_date');
                                if (!isEmpty(creditStartDate)) {
                                    log.debug('this is the credit start date', creditStartDate);
                                }
                                var creditEndDate = currentCreditLine.getValue('custrecord_term_end_date');
                                if (!isEmpty(creditEndDate)) {
                                    log.debug('this is the credit end date', creditEndDate);
                                }
                                var creditItem = currentCreditLine.getValue('custrecord_item_so');
                                if (!isEmpty(creditItem)) {
                                    log.debug('this is the credit item', creditItem);
                                }
                                var creditPolicyNum = currentCreditLine.getValue('custrecord_policy_number_so');
                                if (!isEmpty(creditPolicyNum)) {
                                    log.debug('this is the credit Policy number', creditPolicyNum);
                                }
                                var creditPolicyName = currentCreditLine.getValue('custrecord_policy_name_so_lines');
                                if (!isEmpty(creditPolicyName)) {
                                    log.debug('this is the credit Policy name', creditPolicyName);
                                }
                                var creditRate = currentCreditLine.getValue('custrecord_rate_so');
                                if (!isEmpty(creditRate)) {
                                    log.debug('this is the credit Rate', creditRate);
                                }
                                creditRate = Math.abs(creditRate);
                                //Now that I have all the values for this current line, I should add them all to a SO I create
                                //before the loop runs, then save the SO after running through all lines.
                                creditMemoRecord.insertLine({
                                    sublistId: 'item',
                                    line: cr,
                                });

                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: creditItem
                                });

                                for (var m = 0; m < negativesArray.length; m++) {
                                    if (negativesArray[m] == creditItem) {
                                        log.debug('got here where the item is in the negatives array');
                                        creditMemoRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'price',
                                            value: -1
                                        });
                                        creditRate = creditRate * -1;
                                        log.debug('this is the creditRate after negative adjustment', creditRate);
                                    }
                                }

                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'amount',
                                    value: creditRate
                                });

                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'class',
                                    value: 22
                                });
                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'department',
                                    value: 23
                                });

                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coalition_policy_line',
                                    value: policyId
                                });

                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coa_tran_pol_det',
                                    value: policyDetails
                                });

                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coa_tran_ins_mar',
                                    value: policyMarket
                                });

                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coalition_named_insured',
                                    value: policyNamedInsured
                                });

                                var effectiveFormattedDate = format.format({
                                    value: policyEffectiveDate,
                                    type: format.Type.DATE
                                });

                                var expirFormattedDate = format.format({
                                    value: policyExpirationDate,
                                    type: format.Type.DATE
                                });

                                log.debug('this is the cred mem policy effective date',policyEffectiveDate);
                                log.debug('this is the cred mem policy format eff date',effectiveFormattedDate);

                                if(!isEmpty(policyEffectiveDate)) {
                                    creditMemoRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_atlas_contract_start_date',
                                        value: policyEffectiveDate
                                    });
                                }


                                log.debug('this is the cred mem policy expir date',policyExpirationDate);
                                log.debug('this is the cred mem policy format expir date',expirFormattedDate);

                                if (!isEmpty(policyExpirationDate)) {
                                    creditMemoRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_atlas_contract_end_date',
                                        value: policyExpirationDate
                                    });
                                }


                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_coalition_lob',
                                    value: policyLob
                                });

                                creditMemoRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_total_premium_bound_so',
                                    value: totalBoundPremium
                                });

                                creditMemoRecord.commitLine({
                                    sublistId: 'item'
                                });
                            }
                            if(!isEmpty(loadedPolicyRecord.getValue({fieldId:'custrecord_nsts_invoice_id'}))) {
                                log.audit({title: 'Apply Credit Memo: Invoice ID Found', details: loadedPolicyRecord.getValue({fieldId: 'custrecord_nsts_invoice_id'})});
                                creditMemoRecord = ApplyCreditMemo(creditMemoRecord, loadedPolicyRecord.getValue('custrecord_nsts_invoice_id'));
                            }
                            else{
                                log.audit({title: 'Apply Credit Memo: Invoice Not Found', details: ''});
                                var tranDesc = loadedPolicyRecord.getValue({fieldId: 'custrecord_tran_description'});
                                var extId   = loadedPolicyRecord.getValue({fieldId: 'custrecord_externalid_visible'});
                                //log.audit({title: 'tranDesc', details: tranDesc});///////
                                //log.audit({title: 'extId', details: extId});
                                if(tranDesc == 4 || tranDesc == 5 || tranDesc == 7){

                                    invoiceId = getInvoiceId(extId, tranDesc);
                                    //log.audit({title: 'Apply Credit Memo: invoiceId', details: invoiceId});
                                    creditMemoRecord = ApplyCreditMemo(creditMemoRecord, invoiceId);

                                }


                            }
                            creditMemoRecord.save();

                            var cmId = creditMemoRecord.id;
                            loadedPolicyRecord.setValue({
                                fieldId: 'custrecord_credit_memo_nbr',
                                value: cmId
                            });
                            loadedPolicyRecord.setValue({
                                fieldId: 'custrecord_sales_order_created',
                                value: true
                            });

                            loadedPolicyRecord.setValue({
                                fieldId: 'custrecord_coal_je_id_kp',
                                value: jeId
                            });

                            //set the CM record field on the JE using jeId and cmRecId
                            !isEmpty(jeId) && !isEmpty(cmId) ? setCMLink(jeId, cmId) : null;

                        }
                    }

                }
                    //in this catch block, could have the JE successfully made, but if error out want to delete it.
                    //So, in catch, delete the JE and set both their checkboxes to unchecked
                catch (error) {
                    //loadedPolicyRecord.setValue({
                    // fieldId: 'custrecord_journal_entry_created',
                    //  value: false
                    //});
                    //var deletedJERecord = record.delete({
                    //type: record.Type.JOURNAL_ENTRY,
                    //  id: jeId,
                    //});
                    log.error({title : 'Sales Order/invoice/cash sale creation/credit memo error, this will stop both JE and SO creation', details: error});
                    var errorMsg = error.message;
                    log.debug('logging error', errorMsg);
                    throw error;

                    errEmail.hasFailure  = true;
                    errEmail.failMessage = errEmail.failMessage + 'Sales Order/invoice/cash sale creation/credit memo creation error. ';
                    errEmail.failId      = loadedPolicyRecord.id
                }

            }

            errEmail.failId ? sendEmail(errEmail) : null;

            loadedPolicyRecord.save();

            //For negative logic, if it is a normal item set negative it will naturally show up as negative. To fix
            //if the value is negative and not on the list, have script set to positive. If it is negative and
            //is on the list, set the price level to custom, then set the value of the amount/rate



            //I may need to update the search with a filter only on the policy record that is triggering this.
            //Can't really do that in a WA unless in the workflow I somehow make a worfklow field to store the
            //current record id information.

            //Or, I could go the UE first route, and I can have it trigger on save of the policy, and then
            //it can pull the JE info from within the policy itself.

            //Third idea, I could have just a UE, have it trigger on save and if the status is the desired status
            //and only if the status changed from the old status to new status. Or, I could just have the script
            //check a box once it enters the status and triggers the script the first time, and then it won't
            //trigger again unless a user unchecks the box and saves it. I believe this idea may be best.
            //This way, I can easily log and use the current record id as a filter on the saved search.

        }

        //Use the externID of the cancellation policy to find the original policy Invoice
        function getInvoiceId(extId, tranDesc){ //updated 7-16-2021

            var invoiceId   = '';
            if(tranDesc != 7) {
                var occ = (extId.match(/-/g) || []).length;
                var newExtId = occ == 4 ?
                    extId.substring(0, extId.indexOf("-", extId.indexOf("-", extId.indexOf("-") + 1) + 1) + 1) + "1000" :
                    extId.substring(0, extId.indexOf("-", extId.indexOf("-", extId.indexOf("-", extId.indexOf("-") + 1) + 1) + 1) + 1) + "1000";
            }
            else{
                var newExtId = extId.substring(0, extId.length-1);

            }
            log.audit({title: "newExtId",details: newExtId});//////
            var customrecord_coalition_policySearchObj = search.create({
                type: "customrecord_coalition_policy",
                filters:
                    [
                        ["externalidstring","startswith",newExtId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        }),
                        search.createColumn({name: "internalid", label: "Internal ID"}),
                        search.createColumn({name: "custrecord_nsts_invoice_id", label: "Invoice ID"})
                    ]
            });
            var searchResultCount = customrecord_coalition_policySearchObj.runPaged().count;
            //log.audit("customrecord_coalition_policySearchObj result count",searchResultCount);
            customrecord_coalition_policySearchObj.run().each(function(result){
                if(!isEmpty(result.getValue('custrecord_nsts_invoice_id'))){
                    invoiceId = result.getValue('custrecord_nsts_invoice_id');
                }
                // .run().each has a limit of 4,000 results
                return true;
            });

            //log.audit({title: "invoiceId",details: invoiceId});
            return invoiceId;

        }

        function ApplyCreditMemo(creditMemo, invoiceId){
            log.audit({title: 'Apply Credit Memo: Start', Details: invoiceId});

            var lineCount   = creditMemo.getLineCount({sublistId: 'apply'});

            log.audit({title: 'Apply Credit Memo: lineCount', details: lineCount});
            for(var l = 0; l < lineCount; l++){

                var lineRecId   = creditMemo.getSublistValue({sublistId: 'apply', fieldId: 'internalid', line: l});

                if(lineRecId == invoiceId){
                    log.audit({title: 'Apply Credit Memo: Found Invoice', details: 'Applying'});
                    creditMemo.selectLine({sublistId: 'apply', line: l});
                    creditMemo.setCurrentSublistValue({sublistId:'apply', fieldId: 'apply', value: true});
                    creditMemo.setCurrentSublistValue({sublistId:'apply', fieldId: 'total', value: creditMemo.getValue({fieldId: 'unapplied'})});
                    creditMemo.commitLine({sublistId: 'apply'});
                    break;

                }

            }

            return creditMemo;
        }


        function setCMLink(jeId, cmRecId){

            var jeRec   = record.load({
                type: record.Type.JOURNAL_ENTRY,
                id: jeId,
                isDynamic: true
            });
            jeRec.setValue({fieldId: 'custbody_credit_memo_number', value: cmRecId});

            var jeLineCount = jeRec.getLineCount({sublistId: 'line'});

            for(var j = 0; j < jeLineCount; j++){

                jeRec.selectLine({sublistId: 'line', line: j});
                jeRec.setCurrentSublistValue({sublistId: 'line', fieldId: 'custcol_credit_memo_number', value: cmRecId});
                jeRec.commitLine({sublistId: 'line'});

            }

            jeRec.save();

        }


        function sendEmail(errEmail){

            email.send({
                author: 428,
                recipients: 276073,
                subject: 'Transaction Creation Failure for Policy',
                body: 'Policy Internal Id: ' + errEmail.failId + '. ' + errEmail.failMessage
            });


        }


        function isEmpty(value){
            return value === '' || value === null || value === undefined;
        }

        return {
            afterSubmit : afterSubmit
        };
    });
