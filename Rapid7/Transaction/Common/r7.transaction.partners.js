/**
 * r7.transaction.partners.js
 * @NApiVersion 2.1
 */
define(['N/record', 'N/error', 'N/search'],
    (record, error, search) => {

        /**
         * When a SO/Inv/RA/CM is created in NS, look to see if it has partners already present.
         * If not, then check if it has been created from a NS Quote/SO/etc.
         * If yes, then get all partners from the quote & populate
         * all partner lines on SO/Inv/etc. with corresponding partner info.
         */
        function tranPageInit(context) {
            setTranPartnerObject(context);
            if(context.currentRecord.type == 'opportunity') {
                setBillToPartner(context, 'recmachcustrecord_transaction_link');
            }
        }

        function setTranPartnerObject(context) {
            let thisRec = context.currentRecord;
            let thisRecType = thisRec.type;
            let createdFromType = "";
            let createdFromSublistId = "";
            switch (thisRecType) {
                case 'estimate':
                    createdFromType = 'opportunity';
                    createdFromSublistId = 'recmachcustrecord_opportunity_link';
                    break;
                case 'invoice':
                    createdFromType = 'salesorder';
                    createdFromSublistId = 'recmachcustrecord_transaction_link';
                    break;
                case 'salesorder':
                    createdFromType = 'estimate';
                    createdFromSublistId = 'recmachcustrecord_transaction_link';
                    break;
                case 'creditmemo':
                    createdFromType = 'invoice';
                    createdFromSublistId = 'recmachcustrecord_transaction_link';
                    break;
                case 'returnauthorization':
                    createdFromType = 'salesorder';
                    createdFromSublistId = 'recmachcustrecord_transaction_link';
                    break;
                default:
                    createdFromType = 'salesorder';
                    createdFromSublistId = 'recmachcustrecord_transaction_link';
            }

            let partnersSublistLen;
            //check if partners are already present?
            try {
                partnersSublistLen = thisRec.getLineCount({
                    sublistId: 'recmachcustrecord_transaction_link'
                });
            } catch (e) {
                log.error("MISSING_SUBLIST", "Cannot access partner sublist.");
            }

            log.debug("Partners Sublist Present?", partnersSublistLen);
            if (partnersSublistLen == 0) {
                //No partner sublist, now check quote for partners
                //If quote has partners, get all partners.
                let createdFromId = thisRec.getValue('createdfrom');
                const copiedFrom = thisRec.getValue('copiedfrom');
                let copyScenario = false;
                log.debug('createdFromId', createdFromId);
                try {
                    if(context.mode == 'copy' && copiedFrom && !createdFromId) {
                      copyScenario = true;
                      createdFromId = copiedFrom;
                      createdFromType = thisRec.type;
                      createdFromSublistId = createdFromType == 'opportunity' ? 'recmachcustrecord_opportunity_link' : 'recmachcustrecord_transaction_link';
                    }
                    if(!createdFromId){
                        return;
                    }
                    let createdFromRec = record.load({
                        type: createdFromType,
                        id: createdFromId
                    });
                    //check quote partner list
                    try {
                        quotePartnerSublistLen = createdFromRec.getLineCount({
                            sublistId: createdFromSublistId
                        });
                    } catch (e) {
                        log.error("MISSING_SUBLIST", "Cannot access partner sublist.");
                    }
                    log.debug("Quote Partners List Length", quotePartnerSublistLen);
                    //if quote has partners
                    if (quotePartnerSublistLen > 0) {
                        if(thisRecType == 'estimate' && !copyScenario){
                            //find primary partner on opp partners list
                            let primaryIndex = createdFromRec.findSublistLineWithValue({
                                sublistId: 'recmachcustrecord_opportunity_link',
                                fieldId: 'custrecord_is_primary',
                                value: true
                            });
                            //get partner & partner type from opp
                            if (primaryIndex !== -1) {
                                let primaryPartner = createdFromRec.getSublistValue({
                                    sublistId: 'recmachcustrecord_opportunity_link',
                                    fieldId: 'custrecord_partner',
                                    line: primaryIndex
                                });
                                let primaryPartnerType = createdFromRec.getSublistValue({
                                    sublistId: 'recmachcustrecord_opportunity_link',
                                    fieldId: 'custrecord_partner_type',
                                    line: primaryIndex
                                });

                                //on new quote, set these values on new partner line
                                thisRec.selectNewLine({
                                    sublistId: 'recmachcustrecord_transaction_link'
                                });
                                thisRec.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_transaction_link',
                                    fieldId: 'custrecord_partner',
                                    value: primaryPartner,
                                    forceSyncSourcing: true,
                                    ignoreFieldChange: false
                                });
                                thisRec.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_transaction_link',
                                    fieldId: 'custrecord_partner_type',
                                    value: primaryPartnerType,
                                    ignoreFieldChange: false
                                });
                                thisRec.setCurrentSublistValue({
                                    sublistId: 'recmachcustrecord_transaction_link',
                                    fieldId: 'custrecord_is_primary',
                                    value: true,
                                    ignoreFieldChange: true
                                });
                                thisRec.commitLine({
                                    sublistId: 'recmachcustrecord_transaction_link'
                                });
                            }
                        }
                        else {
                            //get all partners from quote, then set line on SO
                            for (let i = 0; i < quotePartnerSublistLen; i++) {
                                //get this line partner info
                                const sublistId = thisRecType == 'opportunity' ? 'recmachcustrecord_opportunity_link' : 'recmachcustrecord_transaction_link';
                                let quotePartner = createdFromRec.getSublistValue({
                                    sublistId,
                                    fieldId: 'custrecord_partner',
                                    line: i
                                });
                                let quotePartnerType = createdFromRec.getSublistValue({
                                    sublistId,
                                    fieldId: 'custrecord_partner_type',
                                    line: i
                                });
                                let quotePartnerPrimary = createdFromRec.getSublistValue({
                                    sublistId,
                                    fieldId: 'custrecord_is_primary',
                                    line: i
                                });
                                log.debug("Quote Partner Info", quotePartner + "," + quotePartnerType + "," + quotePartnerPrimary);
                                //create new partner line on SO
                                thisRec.selectNewLine({
                                    sublistId
                                });
                                thisRec.setCurrentSublistValue({
                                    sublistId,
                                    fieldId: 'custrecord_partner',
                                    value: quotePartner,
                                    forceSyncSourcing: true,
                                    ignoreFieldChange: false
                                });
                                thisRec.setCurrentSublistValue({
                                    sublistId,
                                    fieldId: 'custrecord_partner_type',
                                    value: quotePartnerType,
                                    ignoreFieldChange: false
                                });
                                thisRec.setCurrentSublistValue({
                                    sublistId,
                                    fieldId: 'custrecord_is_primary',
                                    value: quotePartnerPrimary,
                                    ignoreFieldChange: true
                                });
                                thisRec.commitLine({
                                    sublistId
                                });
                            }
                        }
                    }
                } catch (e) {
                    log.error("CANNOT_SET_PARTNERS", e.message);
                    // throw error.create({
                    //     name: "CANNOT SET PARTNERS",
                    //     message: e.message
                    // });
                }
            }
        }

        function tranSaveRecord(context) {
            clearHeaderPartnerFields(context, 'recmachcustrecord_transaction_link');
            let validPartnerCombo = validatePartnerCombinations(context, 'recmachcustrecord_transaction_link');

            if (validPartnerCombo.status) {
                setSecondaryPartner(context);
                return true;
            } else {
                let message = '';
                if (!validPartnerCombo.status) {
                    message = message + validPartnerCombo.message;
                }

                alert(message);
                return false;
            }
        }

        function oppSaveRecord(context) {
            setDistributorToPrimary(context, 'recmachcustrecord_opportunity_link');
            setBillToPartner(context, 'recmachcustrecord_opportunity_link');
            setSecondaryPartner(context);
            clearHeaderPartnerFields(context, 'recmachcustrecord_opportunity_link');
            updateBillToAddress(context);
            return true;
        }

        function quoteSaveRecord(context) {
            //update reseller address field
            setResellerAddress(context, 'recmachcustrecord_transaction_link'); 
            setDistributorToPrimary(context, 'recmachcustrecord_transaction_link');
            setBillToPartner(context, 'recmachcustrecord_transaction_link');
            setSecondaryPartner(context);
            clearHeaderPartnerFields(context, 'recmachcustrecord_transaction_link');
            return true;
        }

        function clearHeaderPartnerFields(context, sublistId){
            let thisRec = context.currentRecord;
            let partnerSublistLen = thisRec.getLineCount({
                sublistId: sublistId
            });
            if(partnerSublistLen === 0){
                thisRec.setValue({
                    fieldId: 'partner',
                    value: null
                });

                thisRec.setValue({
                    fieldId: 'custbodyr7oppdistributor',
                    value: null
                });
            }
        }

        function setDistributorToPrimary(context, sublistId) {
            const thisRec = context.currentRecord;
            const distributorLine = thisRec.findSublistLineWithValue({
                sublistId: sublistId,
                fieldId: 'custrecord_partner_type',
                value: 7 //Distributor
            });
            const currPrimaryLine = thisRec.findSublistLineWithValue({
                sublistId: sublistId,
                fieldId: 'custrecord_is_primary',
                value: 'T'
            });

            if(distributorLine > -1 && distributorLine != currPrimaryLine) {
               if(currPrimaryLine > -1) {
                    thisRec.selectLine({
                        sublistId: sublistId,
                        line: currPrimaryLine
                    });
                    thisRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custrecord_is_primary',
                        value: false,
                        ignoreFieldChange: true
                    });
                    thisRec.commitLine({
                        sublistId: sublistId
                    });
                }
                
                //now set distributor as primary
                thisRec.selectLine({
                    sublistId: sublistId,
                    line: distributorLine
                });

                thisRec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_is_primary',
                    value: true,
                    ignoreFieldChange: true
                });
                thisRec.commitLine({
                    sublistId: sublistId
                });
            }
        }

        function setResellerAddress(context, sublistId) {
            const thisRec = context.currentRecord;
            const indirectResellerLine = thisRec.findSublistLineWithValue({
                sublistId: sublistId,
                fieldId: 'custrecord_partner_type',
                value: 4 //4 = Indirect Reseller
            });

            const indirectMSSPLine = thisRec.findSublistLineWithValue({
                sublistId: sublistId,
                fieldId: 'custrecord_partner_type',
                value: 3 //3 = indirect mssp
            });

            const directResellerLine = thisRec.findSublistLineWithValue({
                sublistId: sublistId,
                fieldId: 'custrecord_partner_type',
                value: 2 //2 = Direct Reseller
            });

            const directMSSPLine = thisRec.findSublistLineWithValue({
                sublistId: sublistId,
                fieldId: 'custrecord_partner_type',
                value: 1 //1 = Direct MSSP
            });

            const distributorLine = thisRec.findSublistLineWithValue({
                sublistId: sublistId,
                fieldId: 'custrecord_partner_type',
                value: 7 //7 = distributor
            });

            if((directResellerLine > -1 || directMSSPLine > -1 || indirectResellerLine > -1 || indirectMSSPLine > -1) && distributorLine > -1) {
                let indirectPartnerLine;
                if(directResellerLine > -1){
                    indirectPartnerLine = directResellerLine;
                }else if(directMSSPLine > -1){
                    indirectPartnerLine = directMSSPLine;
                }else if(indirectResellerLine > -1){
                    indirectPartnerLine = indirectResellerLine;
                }else{
                    indirectPartnerLine = indirectMSSPLine;
                }

                const indirectPartner = thisRec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_partner',
                    line: indirectPartnerLine
                });

                const partnerRec = record.load({
                    type: 'partner',
                    id: indirectPartner
                });
                const defaultAddressLine = partnerRec.findSublistLineWithValue({
                    sublistId: 'addressbook',
                    fieldId: 'defaultbilling',
                    value: true
                });

                if(defaultAddressLine > -1) {
                    const addressText = partnerRec.getSublistValue({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress_text',
                        line: defaultAddressLine
                    });
                    console.log('defaultIndirectAddress' + addressText);
                    thisRec.setValue({
                        fieldId: 'custbody_r7_reseller_address',
                        value: addressText
                    });
                }
            } else {
                thisRec.setValue({
                    fieldId: 'custbody_r7_reseller_address',
                    value: null
                });
            }
        }

        /**
         * When a transaction is loaded (quote, SO, Invoice, etc.) we need to populate the header level
         * "Partner" field with the Bill To partner value. This means it will be carried through to subsequent transactions
         * and will also ensure the correct Bill To address is being used. Partner marked as Primart on R7 Transactions Tab
         * will be set as Header Level Partner.
         */
        function setBillToPartner(context, sublistId) {
            let thisRec = context.currentRecord;
            const billToPartnerLine = thisRec.findSublistLineWithValue({
                sublistId: sublistId,
                fieldId: 'custrecord_is_primary',
                value: 'T'
            });
            log.debug("Bill To Partner line found?", billToPartnerLine);
            let billToPartner = null;
            if (billToPartnerLine !== -1) {
                billToPartner = thisRec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_partner',
                    line: billToPartnerLine
                });
                log.debug("Found primary. Setting in header level", billToPartner);
            }

            if(billToPartner){
                const currBillToPartner = thisRec.getValue('partner');
                if(billToPartner !== currBillToPartner) {
                    thisRec.setValue({
                        fieldId: 'partner',
                        value: billToPartner
                    });
                }
                thisRec.setValue({
                    fieldId: 'custbodyr7billingresponsibleparty',
                    value: 3 //3: Partner/Reseller
                });
            }
        }

        function updateBillToAddress(context){
            let thisRec = context.currentRecord;
            let billToPartner = thisRec.getValue({fieldId: 'partner'});
            if(billToPartner){
                setBillToAddress(billToPartner, thisRec);
            }
        }

        function setBillToAddress(billToPartner, thisRec){
            let partnerRec = record.load({
                type: 'partner',
                id: billToPartner
            });
            let findBillToAddress = partnerRec.findSublistLineWithValue({
                sublistId: 'addressbook',
                fieldId: 'defaultbilling',
                value: true
            });
            log.debug("Found default billing address", "Line: "+findBillToAddress);
            if(findBillToAddress != -1){
                let partnerBillAddr = partnerRec.getSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress',
                    line: findBillToAddress
                });
                let soBillAddr = thisRec.getSubrecord({
                    fieldId: 'billingaddress'
                });
                soBillAddr.setValue({
                    fieldId: 'country',
                    value: partnerBillAddr.getValue('country')
                });
                soBillAddr.setValue({
                    fieldId: 'state',
                    value: partnerBillAddr.getValue('state')
                });
                soBillAddr.setValue({
                    fieldId: 'zip',
                    value: partnerBillAddr.getValue('zip')
                });
                soBillAddr.setValue({
                    fieldId: 'addressee',
                    value: partnerBillAddr.getValue('addressee')
                });
                soBillAddr.setValue({
                    fieldId: 'addr1',
                    value: partnerBillAddr.getValue('addr1')
                });
                soBillAddr.setValue({
                    fieldId: 'addr2',
                    value: partnerBillAddr.getValue('addr2')
                });
                soBillAddr.setValue({
                    fieldId: 'city',
                    value: partnerBillAddr.getValue('city')
                });
                soBillAddr.commit();
            }
        }

        function validatePartnerCombinations(context, sublistId) {
            let thisRec = context.currentRecord;
            let partnerSublistLen = thisRec.getLineCount({
                sublistId: sublistId
            });
            log.debug(thisRec.type + " Validating partners.", "Found: " + partnerSublistLen + " partners listed.");
            if (partnerSublistLen > 0) {
                //find if any of the partner types are present
                let distributorLine = thisRec.findSublistLineWithValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_partner_type',
                    value: 7 //7 = Distributor
                });
                let directResellerLine = thisRec.findSublistLineWithValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_partner_type',
                    value: 2 //2 = Direct Reseller
                });
                let indirectResellerLine = thisRec.findSublistLineWithValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_partner_type',
                    value: 4 //4 = Indirect Reseller
                });
                let directMsspLine = thisRec.findSublistLineWithValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_partner_type',
                    value: 1 //1 = Direct MSSP
                });
                let indirectMsspLine = thisRec.findSublistLineWithValue({
                    sublistId: sublistId,
                    fieldId: 'custrecord_partner_type',
                    value: 3 //3 = Indirect MSSP
                });

                return partnerCombinationValidations({
                    distributorLine,
                    indirectResellerLine,
                    directResellerLine,
                    indirectMsspLine,
                    directMsspLine
                });
            }
            return {
                message: "Success",
                status: true
            };
        }

        function validatePartnerCombinationsForPartnerTranObject(context) {
            const thisRec = context.currentRecord;
            const transactionId = Number(thisRec.getValue('custrecord_transaction_link'));
            const opportunityId = Number(thisRec.getValue('custrecord_opportunity_link'));
            
            let filters = [ 
                ["isinactive","is","F"],
                "AND"
            ];

            if(opportunityId && opportunityId > 0) {
                filters.push(["custrecord_opportunity_link.internalidnumber", "equalto", opportunityId]);
            } else if(transactionId && transactionId > 0) {
                filters.push(["custrecord_transaction_link.internalidnumber", "equalto", transactionId]);
            } else {
                return {
                    message: "Success",
                    status: true
                };
            }


             if(thisRec.id) {
                filters.push("AND",
                ["internalid", "noneof", thisRec.id])
             }

            const customrecord_r7_transaction_partnersSearchObj = search.create({
                type: "customrecord_r7_transaction_partners",
                filters,
                columns:
                [
                   "custrecord_partner",
                   "custrecord_partner_type",
                   "custrecord_is_primary"
                ]
             });
             if(thisRec.id) {
                filters.push("AND",
                ["internalid", "noneof", thisRec.id])
             }
             const searchResultCount = customrecord_r7_transaction_partnersSearchObj.runPaged().count;

             if(searchResultCount <= 0) {
                return {
                    message: "Success",
                    status: true
                };
             }

             const partnerTypes = {
                distributorLine: -1, 
                indirectResellerLine: -1,  
                directResellerLine: -1,  
                indirectMsspLine: -1,  
                directMsspLine: -1
             };

             const currPartnerType = thisRec.getValue('custrecord_partner_type');
             assignPartnerTypeCount(currPartnerType, partnerTypes);

             customrecord_r7_transaction_partnersSearchObj.run().each(function(result){
                assignPartnerTypeCount(result.getValue('custrecord_partner_type'), partnerTypes);
                return true;
             });

            const partnerTypeMap = {
                no7: 'distributorLine',
                no2: 'directResellerLine',
                no4: 'indirectResellerLine',
                no1: 'directMsspLine',
                no3: 'indirectMsspLine'
             };

             if(partnerTypes[partnerTypeMap['no'+currPartnerType]] > 0) { //count starts at -1, so 2 of the same partner type would be a count of 1 not 2
                return {
                    message: "Cannot set multiple partners of the same type on this transaction.",
                    status: false
                };
             }      
             return partnerCombinationValidations(partnerTypes);
        }

        function assignPartnerTypeCount(partnerTypeId, partnerTypes) {
            switch (Number(partnerTypeId)) {
                case 7:
                    partnerTypes.distributorLine += 1;
                    break;
                case 2:
                    partnerTypes.directResellerLine += 1;
                    break;
                case 4:
                    partnerTypes.indirectResellerLine += 1;
                    break;
                case 1:
                    partnerTypes.directMsspLine += 1;
                    break;
                case 3:
                    partnerTypes.indirectMsspLine += 1;
                    break;
                default:
                    break;
            }
        }

        function partnerCombinationValidations(partnerTypeLineIds) {
            const distributorLine =  partnerTypeLineIds.distributorLine; 
            const indirectResellerLine =  partnerTypeLineIds.indirectResellerLine;  
            const directResellerLine =  partnerTypeLineIds.directResellerLine;  
            const indirectMsspLine =  partnerTypeLineIds.indirectMsspLine;  
            const directMsspLine =  partnerTypeLineIds.directMsspLine; 
            
            //if distributor is present
            if (distributorLine != -1) {
                //if no reseller or MSSP present, return validation message
                if (indirectResellerLine == -1 && directResellerLine == -1 && indirectMsspLine == -1 && directMsspLine == -1 ) {
                    return {
                        message: "No Reseller or MSSP selected with Distributor.",
                        status: false
                    };
                }
            }
            //if reseller & MSSP are both present, return validation message
            if ((directResellerLine != -1 || indirectResellerLine != -1) &&
                (directMsspLine != -1 || indirectMsspLine != -1)) {
                return {
                    message: "Cannot have both Reseller and MSSP Partners on deal.",
                    status: false
                };
            }

            if(directResellerLine != -1 && indirectResellerLine != -1) {
                return {
                    message: "Cannot have both Direct & Indirect Reseller Partners on deal.",
                    status: false
                };
            }

            if(directMsspLine != -1 && indirectMsspLine != -1) {
                return {
                    message: "Cannot have both Direct & Indirect MSSP Partners on deal.",
                    status: false
                };
            }

            if((indirectMsspLine != -1 || indirectResellerLine != -1) && distributorLine == -1) {
                return {
                    message: "Distributor must be selected for Indirect MSSP or Reseller.",
                    status: false
                };
            }

            return {
                message: "Success",
                status: true
            };
        }

        /**
         * we want to check if the field being changed is the "is primary" field on the partners sublist.
         * If this field is changed, and now set to true, we want to check all other lines on the sublist
         * to ensure that only one line is set as the primary partner. If another field is found with
         * is primary = true, then that line will be set to false, and only the current line will remain with
         * is primary = true.
         */
        function oppFieldChanged(context) {
            let currentRec = context.currentRecord;
            let sublistId = context.sublistId;
            let fieldId = context.fieldId;
            let line = context.line;
            let column = context.column;
            log.debug("sublistId", sublistId);
            log.debug("fieldId", fieldId);
            log.debug("line", line);
            //is partner sublist & field is is primary
            if (sublistId === "recmachcustrecord_opportunity_link" && fieldId === "custrecord_is_primary") {
                log.debug("Field changed is primary");
                let currIsPriFldVal = currentRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId
                });
                if (currIsPriFldVal == true) {
                    //this line is primary parter, now check other lines in case multi-primaries
                    let partnerLineCount = currentRec.getLineCount({
                        sublistId: 'recmachcustrecord_opportunity_link'
                    });
                    for (let i = 0; i < partnerLineCount && partnerLineCount >= 0; i++) {
                        let thisLinePrimary = currentRec.getSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldId,
                            line: i
                        });

                        if (thisLinePrimary == true && i != line) {
                            currentRec.selectLine({
                                sublistId: sublistId,
                                line: i
                            });
                            currentRec.setCurrentSublistValue({
                                sublistId: sublistId,
                                fieldId: fieldId,
                                value: false,
                                ignoreFieldChange: true
                            });
                            currentRec.commitLine({
                                sublistId: sublistId
                            });
                        }
                    }
                    //reset current line to is primary = true
                    currentRec.selectLine({
                        sublistId: sublistId,
                        line: line
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldId,
                        value: true,
                        ignoreFieldChange: true
                    });
                }
            }
        }

        /**
         * Replicate isPrimary logic across all transactions (quote, SO, Invoice, etc.)
         * Also add another field changed logic for these transactions to check the partner type.
         * We can only have one of each type of partner on these deals.
         */

        function tranFieldChanged(context) {
            let currentRec = context.currentRecord;
            let sublistId = context.sublistId;
            let fieldId = context.fieldId;
            let line = context.line;
            let column = context.column;
            log.debug("sublistId", sublistId);
            log.debug("fieldId", fieldId);
            log.debug("line", line);
            //is partner sublist & field is is primary
            if (sublistId === "recmachcustrecord_transaction_link" && fieldId === "custrecord_is_primary") {
                log.debug("Field changed is primary");
                let currIsPriFldVal = currentRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId
                });
                if (currIsPriFldVal == true) {
                    //this line is primary parter, now check other lines in case multi-primaries
                    let partnerLineCount = currentRec.getLineCount({
                        sublistId: 'recmachcustrecord_transaction_link'
                    });
                    for (let i = 0; i < partnerLineCount && partnerLineCount >= 0; i++) {
                        let thisLinePrimary = currentRec.getSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldId,
                            line: i
                        });

                        if (thisLinePrimary == true && i != line) {
                            currentRec.selectLine({
                                sublistId: sublistId,
                                line: i
                            });
                            currentRec.setCurrentSublistValue({
                                sublistId: sublistId,
                                fieldId: fieldId,
                                value: false,
                                ignoreFieldChange: true
                            });
                            currentRec.commitLine({
                                sublistId: sublistId
                            });
                        }
                    }
                    //reset current line to is primary = true
                    currentRec.selectLine({
                        sublistId: sublistId,
                        line: line
                    });
                    currentRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldId,
                        value: true,
                        ignoreFieldChange: true
                    });
                }
            }
            //is partner sublist & field is partner type
             else if (sublistId === "recmachcustrecord_transaction_link" && fieldId === "custrecord_partner_type") {
                log.debug("Field changed is partner type");
                let currPartnerTypeFldVal = currentRec.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId
                });
                let partnerLineCount = currentRec.getLineCount({
                    sublistId: 'recmachcustrecord_transaction_link'
                });
                for (let i = 0; i < partnerLineCount && partnerLineCount >= 0; i++) {
                    let thisLinePartnerType = currentRec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldId,
                        line: i
                    });

                    if (thisLinePartnerType && thisLinePartnerType == currPartnerTypeFldVal && i != line) {
                        alert("Cannot set multiple partners of the same type on this transaction.");
                        //reset current line to partner type = null
                        currentRec.selectLine({
                            sublistId: sublistId,
                            line: line
                        });
                        currentRec.setCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldId,
                            value: "",
                            ignoreFieldChange: true
                        });
                        break;
                    }
                }
            } //if partner was updated then set the billing address
            else if ( fieldId === 'partner') {
                const billToPartner = currentRec.getValue('partner');
                if(billToPartner) {
                    setBillToAddress(billToPartner, currentRec);
                }
            }
        }

        function setSecondaryPartner(context) {
            const thisRec = context.currentRecord;
            const sublistId = thisRec.type == 'opportunity' ? 'recmachcustrecord_opportunity_link' : 'recmachcustrecord_transaction_link';
            const secondaryPartnerFieldId = 'custbodyr7oppdistributor';
            const partnerSublistLen = thisRec.getLineCount({
                sublistId
            });
            const primaryPartnerIndex = thisRec.findSublistLineWithValue({
                sublistId,
                fieldId: 'custrecord_is_primary',
                value: 'T'
            });
            const primaryPartnerPresent = primaryPartnerIndex != -1;

            // IF only PRIMARY PARTNER THEN ‘Secondary Partner’ = BLANK
            if((primaryPartnerPresent && partnerSublistLen == 1) || partnerSublistLen == 0) {
                thisRec.setValue({
                    fieldId: secondaryPartnerFieldId,
                    value: null
                });
            } else if(primaryPartnerPresent && partnerSublistLen == 2) { //IF only 2 Partners then non-primary partner = ‘Secondary Partner’
                const secondaryPartnerIndex = thisRec.findSublistLineWithValue({
                    sublistId,
                    fieldId: 'custrecord_is_primary',
                    value: 'F'
                });
                const secondaryPartner = thisRec.getSublistValue({
                    sublistId,
                    fieldId: 'custrecord_partner',
                    line: secondaryPartnerIndex
                });
                thisRec.setValue({
                    fieldId: secondaryPartnerFieldId,
                    value: secondaryPartner
                });
            } else if (partnerSublistLen > 2) {
                /* IF 3 or more partners, then follow this logic in this order:
                    IF ‘Direct Reseller’ OR ‘Direct MSSP’ THEN = ‘Secondary Partner’
                    IF ‘Indirect Reseller’ OR ‘Indirect MSSP’ THEN = ‘Secondary Partner’
                    IF ‘Marketplace Enabled’ OR ‘Technology Partner’ THEN = ‘Secondary Partner’
                */

                let directResellerLine = thisRec.findSublistLineWithValue({
                    sublistId,
                    fieldId: 'custrecord_partner_type',
                    value: 2 //2 = Direct Reseller
                });
                let directMsspLine = thisRec.findSublistLineWithValue({
                    sublistId,
                    fieldId: 'custrecord_partner_type',
                    value: 1 //1 = Direct MSSP
                });

                let secondaryPartnerIndex = directResellerLine > -1 && directResellerLine != primaryPartnerIndex ? directResellerLine : directMsspLine != primaryPartnerIndex ? directMsspLine : -1;

                if(secondaryPartnerIndex == -1) {
                    let indirectResellerLine = thisRec.findSublistLineWithValue({
                        sublistId,
                        fieldId: 'custrecord_partner_type',
                        value: 4 //4 = Indirect Reseller
                    });
                    let indirectMsspLine = thisRec.findSublistLineWithValue({
                        sublistId,
                        fieldId: 'custrecord_partner_type',
                        value: 3 //3 = Indirect MSSP
                    });
                    secondaryPartnerIndex = indirectResellerLine > -1  && indirectResellerLine != primaryPartnerIndex ? indirectResellerLine : indirectMsspLine != primaryPartnerIndex ? indirectMsspLine : -1;
                }

                if(secondaryPartnerIndex == -1) {
                    let marketPlaceEnabledLine = thisRec.findSublistLineWithValue({
                        sublistId,
                        fieldId: 'custrecord_partner_type',
                        value: 5 //5 = Marketplace Enabled
                    });
                    let technologyPartnerLine = thisRec.findSublistLineWithValue({
                        sublistId,
                        fieldId: 'custrecord_partner_type',
                        value: 6 //6 = Technology Partner
                    });
                    secondaryPartnerIndex = marketPlaceEnabledLine > -1 && marketPlaceEnabledLine != primaryPartnerIndex ? marketPlaceEnabledLine : technologyPartnerLine != primaryPartnerIndex ? technologyPartnerLine : -1;
                }

                if(secondaryPartnerIndex > -1) {
                    const secondaryPartner = thisRec.getSublistValue({
                        sublistId,
                        fieldId: 'custrecord_partner',
                        line: secondaryPartnerIndex
                    });
                    thisRec.setValue({
                        fieldId: secondaryPartnerFieldId,
                        value: secondaryPartner
                    });
                }
            }
        }

        function afterSubmit(context) {
            syncPartnersToLinkedTransaction(Number(context.newRecord.id), 0); 
        }

        function syncPartnersToLinkedTransaction(transactionId, opportunityId) {
            let filters = [
                ["custrecord_transaction_link.internalid","anyof", transactionId]
            ]
            if(opportunityId > 0){
                filters = [
                    ["custrecord_opportunity_link.internalid","anyof", opportunityId]
                ]
            }
            const columns = [
                search.createColumn({
                   name: "formulatext",
                   summary: "MAX",
                   formula: "CASE WHEN {custrecord_is_primary} = 'T' THEN  {custrecord_partner.internalid} ELSE null END"
                }),
                search.createColumn({
                   name: "formulatext",
                   summary: "MAX",
                   formula: "CASE  WHEN {custrecord_is_primary} = 'F'  AND {custrecord_partner_type} = 'Direct Reseller'  THEN {custrecord_partner.internalid}WHEN {custrecord_is_primary} = 'F'  AND  {custrecord_partner_type} = 'Direct MSSP' THEN {custrecord_partner.internalid}ELSE -1 END "
                }),
                search.createColumn({
                   name: "formulatext",
                   summary: "MAX",
                   formula: "CASE  WHEN {custrecord_is_primary} = 'F'  AND {custrecord_partner_type} = 'Indirect Reseller'  THEN {custrecord_partner.internalid}WHEN {custrecord_is_primary} = 'F'  AND  {custrecord_partner_type} = 'Indirect MSSP' THEN {custrecord_partner.internalid}ELSE -1 END "
                }),
                search.createColumn({
                   name: "formulatext",
                   summary: "MAX",
                   formula: "CASE   WHEN {custrecord_is_primary} = 'F'  AND {custrecord_partner_type} = 'Marketplace Enabled'  THEN {custrecord_partner.internalid} WHEN {custrecord_is_primary} = 'F'  AND  {custrecord_partner_type} = 'Technology Partner' THEN {custrecord_partner.internalid} ELSE -1 END "
                }),
                search.createColumn({
                    name: "formulatext",
                    summary: "GROUP",
                    formula: "{custrecord_transaction_link.type}",
                    label: "Formula (Text)"
                 })
             ];
        
            const customrecord_r7_transaction_partnersSearchObj = search.create({
                type: "customrecord_r7_transaction_partners",
                filters,
                columns
             });
             let primaryPartnerId = null;
             let secondaryPartnerId = null;
             let transactionType = null;
             customrecord_r7_transaction_partnersSearchObj.run().each(function(result){
                primaryPartnerId = result.getValue(columns[0]); //primary partner id column
                if(transactionId > 0) {
                    transactionType = result.getValue(columns[4]);
                    transactionType = transactionType == 'Sales Order' ? 'salesorder' : (transactionType == 'Estimate'|| transactionType == 'Quote') ? 'estimate' : null;
                }
                const directPartner = result.getValue(columns[1]); //direct partner id column
                const indirectPartner = result.getValue(columns[2]); //indirect partner id column
                const otherPartner = result.getValue(columns[3]); //other partner id column
                secondaryPartnerId = directPartner > -1 ? directPartner : indirectPartner > -1 ? indirectPartner : otherPartner > -1 ? otherPartner : null;
                log.audit('directPartner', directPartner);
                log.audit('indirectPartner', indirectPartner);
                log.audit('otherPartner', otherPartner);
                return false;
             });
            
             log.audit('primaryPartnerId', primaryPartnerId);
             log.audit('secondaryPartnerId', secondaryPartnerId);
             log.audit('transactionType', transactionType);
             
             //update secondary and primary partner of the linked transaction
             if(primaryPartnerId || secondaryPartnerId) {
                record.submitFields({
                    type: transactionId > opportunityId ? transactionType : 'OPPORTUNITY',
                    id: transactionId > opportunityId ? transactionId : opportunityId,
                    values: {
                        partner: primaryPartnerId,
                        custbodyr7oppdistributor: secondaryPartnerId
                    }
                });
            }
        }

        return {
            tranPageInit,
            oppFieldChanged,
            tranSaveRecord,
            tranFieldChanged,
            oppSaveRecord,
            quoteSaveRecord,
            validatePartnerCombinationsForPartnerTranObject,
            syncPartnersToLinkedTransaction,
            afterSubmit
        }

    });
