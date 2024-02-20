/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/record', 'N/search', './GD_Common'],

    function (record, search, GD_Common) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @Since 2016.1
         */
        function onAction(scriptContext) {
            var newCreditMemoId = '';
            try {
                var newCreditMemo = record.create({
                    type: record.Type.CREDIT_MEMO,
                    isDynamic: true,
                });
                newCreditMemo.setValue({fieldId: 'custbodyrvscreatedfromclaim', value: scriptContext.newRecord.id});
                AddCreditMemoData(newCreditMemo, scriptContext.newRecord);
                newCreditMemoId = newCreditMemo.save({
                    enableSourcing: true,
                    ignoreManditoryFields: true
                });
            } catch (err) {
                log.error('Error creating new Credit Memo', err);
                var errorMessage = 'Error: Failed to generate Credit Memo from this Claim. Error logs can be found '
                    + 'in the Execution Log for the script: GD Create Credit Memo From Claim WA';
                record.submitFields({
                    type: 'customrecordrvsclaim',
                    id: scriptContext.newRecord.id,
                    values: {
                        custrecordgd_createcreditmemomessage: errorMessage
                    }
                });
            }

            if (newCreditMemoId != '') {
                var Constants = {
                    CLAIM_OPLINE_SUBLIST: 'recmachcustrecordclaimoperationline_claim',
                }
                var successMessage = 'Success: Credit Memo successfully created. New Credit Memo Id: ' + newCreditMemoId;
                record.submitFields({
                    type: 'customrecordrvsclaim',
                    id: scriptContext.newRecord.id,
                    values: {
                        custrecordgd_createcreditmemomessage: successMessage
                    }
                });
                // Do not need to check the status of the Claim because the workflow runs on Approve.

                var flatRateCodes = [];
                for (var i = 0; i < scriptContext.newRecord.getLineCount({sublistId: Constants.CLAIM_OPLINE_SUBLIST}); i++) {
                    var flatRateCodeStatus = scriptContext.newRecord.getSublistValue({
                        sublistId: Constants.CLAIM_OPLINE_SUBLIST,
                        fieldId: 'custrecordclaimoperationline_status',
                        line: i
                    });
                    if(flatRateCodeStatus == '2') {
                        flatRateCodes.push(scriptContext.newRecord.getSublistValue({
                            sublistId: Constants.CLAIM_OPLINE_SUBLIST,
                            fieldId: 'custrecordclaimoperationline_flatratecod',
                            line: i
                        }));
                    }
                }
                if(flatRateCodes.length > 0) {
                    var recallCodeFilters = [
                        search.createFilter({
                            name: 'custrecordrecallunit_recallcode',
                            operator: search.Operator.ANYOF,
                            values: flatRateCodes
                        }),
                        search.createFilter({
                            name: 'custrecordrecallunit_unit',
                            operator: search.Operator.IS,
                            values: scriptContext.newRecord.getValue('custrecordclaim_unit')
                        }),
                        search.createFilter({
                            name: 'custrecordrecallunit_status',
                            operator: search.Operator.IS,
                            values: 'Open'
                        })
                    ];

                    var recallResults = search.create({
                        type: 'customrecordrvs_recallunit',
                        filters: recallCodeFilters
                    }).run().getRange({start: 0, end: 1000});
                   
                    if (recallResults.length > 0) {
                        for (var i = 0; i < recallResults.length; i++) {
                            var recallUnitId = recallResults[i].id;
                            if (recallUnitId) {
                                //Set the claim on the recall unit, and set the status to Complete.
                                var values = {
                                    custrecordrecallunit_claim: scriptContext.newRecord.id,
                                    custrecordrecallunit_status: 'Complete'
                                }
                                record.submitFields({
                                    type: 'customrecordrvs_recallunit',
                                    id: recallUnitId,
                                    values: values
                                });
                            }
                        }
                    }
                }
            }
        }

        /**
         * Code copied from CreditMemo.js in RVS to set fields upon record creation.
         * It had to be copied over here because we could not set the created from claim field
         * before the BeforeLoad function ran.
         *
         * @param {record.Record} creditMemoRec - The new Credit Memo
         * @param {record.Record} claimRec - The Claim
         */
        function AddCreditMemoData(creditMemoRec, claimRec) {
            // set the header data from the claim
            // we need to find the "credit" subdealer for the dealer on the claim
            var claimDealerId = claimRec.getValue({fieldId: 'custrecordclaim_customer'});
            var creditOnlyDealerId = GetCreditOnlySubDealer(claimDealerId);
            // if no credit only dealer is found, then create one
            if (creditOnlyDealerId == null) {
                var dealer = record.create({
                    type: 'customer',
                    isDynamic: true
                });
                var lookupTable = search.lookupFields({
                    type: 'customer',
                    id: claimDealerId,
                    columns: ['isperson', 'entityid', 'companyname']
                });
                dealer.setValue({fieldId: 'entityid', value: 'Credit'});
                if (lookupTable.isperson == 'T') {
                    dealer.setValue({fieldId: 'firstname', value: 'Credit'});
                    dealer.setValue({fieldId: 'lastname', value: 'Individual'});
                    dealer.setValue('printoncheckas', lookupTable.entityid);
                } else {
                    dealer.setValue({fieldId: 'companyname', value: 'Credit'});
                    dealer.setValue({fieldId: 'printoncheckas', value: lookupTable.companyname});
                }
                dealer.setValue({
                    fieldId: 'custentityrvsdealertype',
                    value: GD_Common.GetCompanyPreference('custscriptdealertypewarrantyonly')
                });  // set the dealer type to be Claim Credit (Id #9)
                dealer.setValue({fieldId: 'parent', value: claimDealerId});
                dealer.setValue({fieldId: 'custentityrvscreditdealer', value: true});

                creditOnlyDealerId = dealer.save({
                    enableSourcing: true,
                    ignoreManditoryFields: true
                });
            }

            creditMemoRec.setValue({fieldId: 'entity', value: creditOnlyDealerId});

            creditMemoRec.setValue({fieldId: 'custbodyrvsunit', value: claimRec.getValue({fieldId: 'custrecordclaim_unit'})});
            creditMemoRec.setValue({
                fieldId: 'custbodyrvscreditmemotype',
                value: GD_Common.GetCompanyPreference('custscriptcreditmemotypewarrantyclaim')
            }); // credit memo type should be "Warranty Claim"
            creditMemoRec.setValue({fieldId: 'location', value: GD_Common.GetCompanyPreference('custscriptpartsandwarrantylocation')}); // location is parts/warranty

            // set the dealer claim # to the PO# field on the credit memo
            var dealerClaimNumber = claimRec.getValue({fieldId: 'custrecordclaim_dealerclaimnumber'});
            if (dealerClaimNumber != null) {
                creditMemoRec.setValue({fieldId: 'otherrefnum', value: dealerClaimNumber});
            }

            var laborTotal = parseFloat(claimRec.getValue({fieldId: 'custrecordclaim_operationstotal'}));
            var subletTotal = parseFloat(claimRec.getValue({fieldId: 'custrecordclaim_sublettotal'}));
            var partsTotal = parseFloat(claimRec.getValue({fieldId: 'custrecordclaim_partstotal'}));
            var shippingTotal = parseFloat(claimRec.getValue({fieldId: 'custrecordclaim_shippingtotal'}));

            var customPriceLevelId = GD_Common.GetCompanyPreference('custscriptcustompricelevel');

            if (laborTotal != 0) {
                creditMemoRec.selectNewLine({sublistId: 'item'});
                creditMemoRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: GD_Common.GetCompanyPreference('custscriptrvsclaimlabornoninvt')
                });
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: customPriceLevelId});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: '1'});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: laborTotal});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: laborTotal});
                creditMemoRec.commitLine({sublistId: 'item'});
            }

            if (subletTotal != 0) {
                creditMemoRec.selectNewLine({sublistId: 'item'});
                creditMemoRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: GD_Common.GetCompanyPreference('custscriptrvsclaimsubletnoninvt')
                });
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: customPriceLevelId});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: '1'});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: subletTotal});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: subletTotal});
                creditMemoRec.commitLine({sublistId: 'item'});
            }

            if (partsTotal != 0) {
                creditMemoRec.selectNewLine({sublistId: 'item'});
                creditMemoRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: GD_Common.GetCompanyPreference('custscriptrvsclaimpartsnoninvt')
                });
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: customPriceLevelId});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: '1'});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: partsTotal});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: partsTotal});
                creditMemoRec.commitLine({sublistId: 'item'});
            }

            if (shippingTotal != 0) {
                creditMemoRec.selectNewLine({sublistId: 'item'});
                creditMemoRec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: GD_Common.GetCompanyPreference('custscriptrvsclaimshippingnoninvt')
                });
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: customPriceLevelId});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: '1'});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: shippingTotal});
                creditMemoRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: shippingTotal});
                creditMemoRec.commitLine({sublistId: 'item'});
            }
        }

        /**
         * Another copied helper function from RVS
         *
         * @param {string} parentDealerId - Id of the parent dealer
         * @returns {string} -
         */
        function GetCreditOnlySubDealer(parentDealerId) {
            var dealerSearch = search.create({
                type: 'customer',
                filters:
                    [
                        ['custentityrvsdealertype', 'anyof', GD_Common.GetCompanyPreference('custscriptdealertypewarrantyonly')],
                        'AND',
                        ['parentcustomer.internalid', 'anyof', parentDealerId]
                    ],
                columns:
                    [
                        search.createColumn({name: 'internalid', label: 'Internal ID', sort: search.Sort.ASC})
                    ]
            });
            if (dealerSearch.runPaged().count <= 0) {
                return null;
            } else {
                var creditDealerId = '';
                dealerSearch.run().each(function (result) {
                    creditDealerId = result.getValue({name: 'internalid'});
                    // Only need the first credit dealer
                    return false;
                });
                return creditDealerId;
            }
        }

        return {
            onAction: onAction
        };

    });
