/**
 * @NApiVersion 2.1
 */
/*******************************************************************************
 *
 * Name: Coupa-InvoiceIntegration-CNModule.js
 *
 * Script Type: SuiteScript 2.1 Module
 *
 * Description: This module handle the import functionality for creating Vendor Credit from Coupa Credit Note
 *
 * Parent Script Id/s: customscript_coupa_invoice_mr
 *
 * Parent Deployment Id/s: customdeploy_coupa_invoice_mr
 ********************************************************************************/
define(['N/email', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/url', './Coupa-UtilityFunctionsModule'],
    /**
     * @param{email} email
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     * @param{url} url
     */
    (email, https, record, runtime, search, url, utility) => {


        const createVendorCreditFromCN = (invoicePayload, configuration) => {
            try {
                if (configuration.skipCreditNotes) {
                    log.audit({
                        title: "Invoice Integration skipped, Skip Credit Notes is set to " + configuration.skipCreditNotes,
                        details: "Coupa Credit Note ID: " + invoicePayload.id
                    });
                    return false;
                }
                if (utility.validateDocument(invoicePayload)) {
                    let entity = invoicePayload["supplier"]["number"] ? invoicePayload["supplier"]["number"] : '';              //set the vendor id as default value
                    let vendorID = entity;
                    let coaID = invoicePayload["account-type"]["id"] ? invoicePayload["account-type"]["id"] : invoicePayload["account-type"]["name"];
                    let defaultValue = {
                        entity: entity,
                    };
                    let customForm = configuration.customForm; // @  TODO verify the script param with Eshwar
                    if (customForm) {
                        let customFormMap = {};
                        let list = customForm.split(';');
                        for (let i = 0; i < list.length; i++) {
                            let keyValueList = list[i].split('==');
                            customFormMap[keyValueList[0]] = keyValueList[1];
                        }
                        let customFormID = customFormMap[coaID]
                        defaultValue['customform'] = customFormID;                                                              //set the custom form id as default value
                    }
                    log.audit({
                        title: 'Creating Vendor Credit with following default values: ',
                        details: defaultValue
                    });

                    /******************************
                     *
                     *  Create Vendor Credit Record
                     *
                     ******************************/

                    let vendorCreditRecord = record.create({
                        type: record.Type.VENDOR_CREDIT,
                        defaultValues: defaultValue,
                        ignorecache: true,
                        isDynamic: true
                    });

                    /************************
                     *
                     *  Setting Body/Header Fields
                     *
                     ************************/

                    if (!entity) {                                                                                              //set the vendor name as text if the vendor id was not set as default value
                        vendorID = invoicePayload["supplier"]["name"]
                        vendorCreditRecord.setText({
                            fieldId: 'entity',
                            value: invoicePayload["supplier"]["name"]
                        });
                    }
                    let existingTransactionID = utility.searchTransactionInNetSuite(vendorID, invoicePayload.id, configuration, true);
                    let paymentChannelCoupaPay = invoicePayload['payment-channel'] == 'coupapay_invoice_payment' ? true : false;
                    if (existingTransactionID) {                                                                                                  //Update the paymenthold value
                        let id = record.submitFields({
                            type: record.Type.VENDOR_CREDIT,
                            id: existingTransactionID,
                            values: {
                                paymenthold: paymentChannelCoupaPay
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                        return;
                    }
                    let subsidiaryID = "";
                    if (configuration.subsidiarySegment) {                                                           // Subsidiary Segment Parameter Value: Segment-1 --> Subsidiary searched using segment value
                        if (invoicePayload["invoice-lines"][0] && invoicePayload["invoice-lines"][0]['account']) {
                            subsidiaryID = (invoicePayload["invoice-lines"][0] ? invoicePayload["invoice-lines"][0].account[configuration.subsidiarySegment] : '');
                        } else {
                            subsidiaryID = (invoicePayload["invoice-lines"][0] ? invoicePayload["invoice-lines"][0]['account-allocations'][0].account[configuration.subsidiarySegment] : '');
                        }
                        if (!configuration.useDynamicAccounting) {                                                               // Subsidiary Segment Parameter Value: 3 --> Subsidiary set as parameter value
                            log.debug({
                                title: 'Using Subsidiary ID from script parameter: ',
                                details: configuration.subsidiarySegment
                            });
                            subsidiaryID = subsidiaryID ? subsidiaryID : subsidiaryID.split(':')[1];
                        }
                    } else {                                                                                                // Subsidiary Segment Parameter Value: blank --> Subsidiary searched using COA Name
                        if (invoicePayload["invoice-lines"][0] && invoicePayload["invoice-lines"][0]['account']) {
                            subsidiaryID = (invoicePayload["invoice-lines"][0] ? invoicePayload["invoice-lines"][0].account['account-type']['name'] : '');
                            subsidiaryID = configuration.isOneWorldAccount ? utility.getRecordIdbyName(record.Type.SUBSIDIARY, subsidiaryID) : '';
                        } else {
                            subsidiaryID = (invoicePayload["invoice-lines"][0] ? invoicePayload["invoice-lines"][0]['account-allocations'][0].account['account-type']['name'] : '');
                            subsidiaryID = configuration.isOneWorldAccount ? utility.getRecordIdbyName(record.Type.SUBSIDIARY, subsidiaryID) : '';
                        }
                    }
                    if (configuration.useExternalID) {
                        subsidiaryID = utility.getInternalIDByExternalID(subsidiaryID, 'subsidiary');
                    }
                    if (subsidiaryID && configuration.isOneWorldAccount) {
                        vendorCreditRecord.setValue({                                                                                 //set the subsidiary from accounting segment
                            fieldId: 'subsidiary',
                            value: subsidiaryID
                        });
                    }
                    log.debug({
                        title: 'setting subsidiary',
                        details: 'subsidiary:' + subsidiaryID
                    });
                    let accountID = utility.getAccountIDByNumber(configuration.accountsPayableAccountNumber);                   //set the account by searching account id by account number
                    vendorCreditRecord.setValue({
                        fieldId: 'account',
                        value: accountID
                    });

                    let currencyID = utility.getCurrencyIDByCode(invoicePayload['currency']['code']);                           //set the currency by searching currency id by currency symbol
                    if (configuration.isMulticurrencyAccount) {
                        vendorCreditRecord.setValue({
                            fieldId: 'currency',
                            value: currencyID
                        });
                    }

                    let invoiceDate = utility.convertCoupaDateToNetSuiteDate(invoicePayload['invoice-date']);                   //set the Coupa Invoice Date as Vendor Credit Date
                    vendorCreditRecord.setValue({
                        fieldId: 'trandate',
                        value: invoiceDate
                    });

                    let isPaymentChannelCoupaPay = invoicePayload['payment-channel'] == 'coupapay_invoice_payment' ? true : false;
                    if (isPaymentChannelCoupaPay) {                                                                             //set the paymenthold checkbox as true if payment channel is CoupaPay
                        vendorCreditRecord.setValue({
                            fieldId: 'paymenthold',
                            value: isPaymentChannelCoupaPay
                        });
                    }

                    vendorCreditRecord.setValue({
                        fieldId: 'tranid',
                        value: invoicePayload['invoice-number']
                    });

                    vendorCreditRecord.setValue({                                                                                 //set the body memo based on the Invoice line memo
                        fieldId: 'memo',
                        value: "Coupa Invoice ID: " + invoicePayload.id + " - " + invoicePayload["supplier"]["name"]
                    });

                    /********************************
                     *
                     *  Setting URLS
                     *
                     ********************************/

                    if (configuration.invoiceURLLink) {
                        let invoiceURL = configuration.host + '/invoices/' + invoicePayload.id;
                        vendorCreditRecord.setValue({
                            fieldId: configuration.invoiceURLLink,
                            value: invoiceURL
                        });
                    }

                    if (configuration.invoiceImageURLLink && invoicePayload['image-scan']) {
                        let imageScan = invoicePayload['image-scan'].split('/');
                        if (imageScan && imageScan.length == 6 && imageScan[5]) {
                            let imageScanURL = configuration.host + '/invoice/' + invoicePayload.id + '/image_scan/' + invoicePayload['image-scan'] + imageScan[5];
                            vendorCreditRecord.setValue({
                                fieldId: configuration.invoiceImageURLLink,
                                value: imageScanURL
                            });
                        }
                    }

                    /********************************
                     *
                     *  Setting Billing Term
                     *
                     ********************************/
                    let billingTerm = "Net 30";
                    if (invoicePayload['payment-term']) {
                        billingTerm = invoicePayload['payment-term']["code"];
                        let utilityID = utility.searchTermID(billingTerm);
                        vendorCreditRecord.setValue({
                            fieldId: 'terms',
                            value: utilityID
                        });
                    } else {
                        let utilityID = utility.searchTermID(billingTerm);
                        vendorCreditRecord.setValue({
                            fieldId: 'terms',
                            value: utilityID
                        });
                    }

                    let postingPeriodID = utility.processCutOff(invoicePayload['invoice-date'], configuration);
                    if (postingPeriodID) {
                        log.debug({
                            title: 'Setting Posting period ID returned by processCutOff: ',
                            details: "accountingperiod:" + postingPeriodID
                        });
                        vendorCreditRecord.setValue({                                                                             //set the posting period based on the cutoff param
                            fieldId: 'postingperiod',
                            value: postingPeriodID
                        });
                    } else {
                        log.debug({
                            title: 'Posting period ID returned by processCutOff: ' + postingPeriodID,
                            details: 'NetSuite will default current month as posting period'
                        });
                    }

                    /********************************
                     *
                     *  Setting Header Custom Fields
                     *
                     ********************************/

                    vendorCreditRecord = utility.setHeaderLevelCustomFields(vendorCreditRecord, invoicePayload, configuration);

                    /********************************
                     *
                     *  Getting Invoice Tax Details
                     *
                     ********************************/

                    let taxAmount = Math.abs(utility.parseFloatOrZero(invoicePayload['tax-amount']));
                    let lineLevelTaxationFlag = invoicePayload['line-level-taxation'];

                    /*****************************************
                     *
                     *  Getting charges and taxes on charges
                     *
                     *****************************************/
                    let chargeTaxTotal = 0;
                    let invoiceCharges = invoicePayload['invoice-charges'];
                    let chargesArray = [];
                    for (let ic in invoiceCharges) {
                        let charge = {};
                        charge.type = invoiceCharges[ic].type;
                        charge.description = invoiceCharges[ic].type.replace(/([A-Z])/g, ' $1').trim()
                        charge.total = Math.abs(utility.parseFloatOrZero(invoiceCharges[ic].total));
                        charge.totalWithTaxes = Math.abs(utility.parseFloatOrZero(charge.total));
                        let taxLines = invoiceCharges[ic]['tax-lines'];
                        let taxLinesArray = [];
                        charge.hasTaxes = taxLines && taxLines.length > 0 ? true : false;
                        for (let tl in taxLines) {
                            let taxLine = {};
                            taxLine.amount = Math.abs(utility.parseFloatOrZero(taxLines[tl].amount));
                            chargeTaxTotal += Math.abs(utility.parseFloatOrZero(taxLines[tl].amount));
                            charge.totalWithTaxes += Math.abs(utility.parseFloatOrZero(taxLine.amount));
                            taxLine.code = taxLines[tl].code;
                            let taxCodeSplitArray = taxLines[tl].code ? taxLines[tl].code.split(':') : [];
                            taxLine.codeID = taxCodeSplitArray.length == 2 ? taxCodeSplitArray[1] : '';
                            charge.hasTaxCode = taxLine.codeID ? true : false;
                            taxLine.rate = taxLines[tl].rate;
                            taxLinesArray.push(taxLine)
                        }
                        charge.taxLines = taxLinesArray;
                        chargesArray.push(charge)
                    }
                    log.debug({
                        title: 'Invoice Charges extracted from payload: ',
                        details: JSON.stringify(chargesArray)
                    });

                    /***************************************
                     *
                     *  Charges and Tax Distribution Logic
                     *
                     ***************************************/

                    let totalMiscAmount = Math.abs(utility.parseFloatOrZero(invoicePayload["misc-amount"]));
                    let totalHandlingAmount = Math.abs(utility.parseFloatOrZero(invoicePayload["handling-amount"]));
                    let totalShippingAmount = Math.abs(utility.parseFloatOrZero(invoicePayload["shipping-amount"]));

                    let linesNetTotal = Math.abs(utility.parseFloatOrZero(invoicePayload["total-with-taxes"])) - (taxAmount + totalMiscAmount + totalHandlingAmount + totalShippingAmount);
                    log.debug({
                        title: 'Lines Net Total: ' + linesNetTotal,
                        details: 'Charge tax total:' + chargeTaxTotal
                    });
                    log.debug({
                        title: 'Total Tax: ' + taxAmount,
                        details: 'Charge tax total:' + chargeTaxTotal
                    });

                    /*****************************************
                     *
                     *  Getting invoice line details & line taxes
                     *
                     *****************************************/

                    let invoiceLines = invoicePayload["invoice-lines"];
                    let invoiceLinesArray = [];
                    for (let il in invoiceLines) {

                        /*****************************************
                         *
                         *  Getting invoice line details & line taxes with send tax code OFF
                         *
                         *****************************************/

                        if (!configuration.sendTaxCode && invoiceLines[il] && invoiceLines[il] ['account']) {                                             //Get Line detail JSON for non-split condition
                            log.debug({
                                title: 'Invoice ID: ' + invoicePayload.id + ' Line#' + (utility.parseFloatOrZero(il) + 1),
                                details: 'is Split account: False'
                            });
                            let headerTaxArray = invoicePayload['tax-lines'];
                            let tempObject = {
                                "linesNetTotal": linesNetTotal,
                                "taxAmount": taxAmount,
                                "totalShippingAmount": totalShippingAmount,
                                "totalMiscAmount": totalMiscAmount,
                                "totalHandlingAmount": totalHandlingAmount,
                                "invoiceLineID": "Invoice: " + invoicePayload.id + " Line - " + (utility.parseFloatOrZero(il) + 1)
                            };
                            let absoluteObject = convertAmountToAbsolute(invoiceLines[il]);
                            invoiceLinesArray.push(utility.getNonSplitAccountExpenseLine(absoluteObject, tempObject, configuration, false, headerTaxArray, lineLevelTaxationFlag));
                        } else if (!configuration.sendTaxCode && invoiceLines[il] && !invoiceLines[il] ['account']) {                                                                                                  //Get Line detail JSON for split condition
                            log.debug({
                                title: 'Invoice ID: ' + invoicePayload.id + ' Line#' + (utility.parseFloatOrZero(il) + 1),
                                details: 'is Split account: True'
                            });
                            let headerTaxArray = invoicePayload['tax-lines'];
                            let tempObject = {
                                "linesNetTotal": linesNetTotal,
                                "taxAmount": taxAmount,
                                "totalShippingAmount": totalShippingAmount,
                                "totalMiscAmount": totalMiscAmount,
                                "totalHandlingAmount": totalHandlingAmount,
                                "invoiceLineID": "Invoice: " + invoicePayload.id + " Line - " + (utility.parseFloatOrZero(il) + 1)
                            };
                            let absoluteObject = convertAmountToAbsolute(invoiceLines[il]);
                            let tempArray = utility.getSplitAccountExpenseLine(absoluteObject, tempObject, configuration, false, headerTaxArray, lineLevelTaxationFlag);
                            invoiceLinesArray.push(...tempArray);
                        }

                        /*****************************************
                         *
                         *  Getting invoice line details & line taxes with send tax code ON
                         *
                         *****************************************/

                        else if (configuration.sendTaxCode && invoiceLines[il] && invoiceLines[il]['account']) {                                             //Get Line detail JSON for non-split condition
                            log.debug({
                                title: 'Invoice ID: ' + invoicePayload.id + ' Line#' + (utility.parseFloatOrZero(il) + 1),
                                details: 'is Split account: False'
                            });
                            let headerTaxArray = invoicePayload['tax-lines'];
                            let tempObject = {
                                "linesNetTotal": linesNetTotal
                            };
                            if (!configuration.useCoupaChargeDistribution) {
                                tempObject.taxAmount = utility.formatCurrency(utility.calculateProportion(Math.abs(invoiceLines[il]['total']), linesNetTotal, taxAmount));
                                tempObject.totalShippingAmount = utility.formatCurrency(utility.calculateProportion(Math.abs(invoiceLines[il]['total']), linesNetTotal, utility.getChargeTotal(chargesArray, 'InvoiceShippingCharge')));
                                tempObject.totalHandlingAmount = utility.formatCurrency(utility.calculateProportion(Math.abs(invoiceLines[il]['total']), linesNetTotal, utility.getChargeTotal(chargesArray, 'InvoiceHandlingCharge')));
                                tempObject.totalMiscAmount = utility.formatCurrency(utility.calculateProportion(Math.abs(invoiceLines[il]['total']), linesNetTotal, utility.getChargeTotal(chargesArray, 'InvoiceMiscCharge')));
                            } else {
                                tempObject.taxAmount = utility.formatCurrency(Math.abs(utility.parseFloatOrZero(invoiceLines[il]['tax-distribution-total'])));
                                tempObject.totalShippingAmount = utility.formatCurrency(Math.abs(utility.parseFloatOrZero(invoiceLines[il]['shipping-distribution-total'])));
                                tempObject.totalHandlingAmount = utility.formatCurrency(Math.abs(utility.parseFloatOrZero(invoiceLines[il]['handling-distribution-total'])));
                                tempObject.totalMiscAmount = utility.formatCurrency(Math.abs(utility.parseFloatOrZero(invoiceLines[il]['misc-distribution-total'])));
                            }
                            tempObject["invoiceLineID"] = "Invoice: " + invoicePayload.id + " - " + (utility.parseFloatOrZero(il) + 1);
                            let absoluteObject = convertAmountToAbsolute(invoiceLines[il]);
                            let tempArray = utility.getNonSplitAccExpnsLineWithTaxCode(absoluteObject, tempObject, configuration, chargesArray, false, headerTaxArray);
                            invoiceLinesArray.push(...tempArray);
                        } else if (configuration.sendTaxCode && invoiceLines[il] && !invoiceLines[il] ['account']) {                                                                                                  //Get Line detail JSON for split condition
                            log.debug({
                                title: 'Invoice ID: ' + invoicePayload.id + ' Line#' + (utility.parseFloatOrZero(il) + 1),
                                details: 'is Split account: True'
                            });
                            let headerTaxArray = invoicePayload['tax-lines'];
                            for (let acc in invoiceLines[il]['account-allocations']) {
                                let tempObject = {
                                    "linesNetTotal": linesNetTotal,
                                };
                                if (!configuration.useCoupaChargeDistribution) {
                                    tempObject.taxAmount = utility.formatCurrency(utility.calculateProportion(Math.abs(invoiceLines[il]['account-allocations'][acc]['amount']), linesNetTotal, taxAmount));
                                    tempObject.totalShippingAmount = utility.formatCurrency(utility.calculateProportion(Math.abs(invoiceLines[il]['account-allocations'][acc]['amount']), linesNetTotal, utility.getChargeTotal(chargesArray, 'InvoiceShippingCharge')));
                                    tempObject.totalHandlingAmount = utility.formatCurrency(utility.calculateProportion(Math.abs(invoiceLines[il]['account-allocations'][acc]['amount']), linesNetTotal, utility.getChargeTotal(chargesArray, 'InvoiceHandlingCharge')));
                                    tempObject.totalMiscAmount = utility.formatCurrency(utility.calculateProportion(Math.abs(invoiceLines[il]['account-allocations'][acc]['amount']), linesNetTotal, utility.getChargeTotal(chargesArray, 'InvoiceMiscCharge')));
                                } else {
                                    tempObject.taxAmount = utility.formatCurrency(Math.abs(utility.parseFloatOrZero(invoiceLines[il]['account-allocations'][acc]['tax-distribution-total'])));
                                    tempObject.totalShippingAmount = utility.formatCurrency(Math.abs(utility.parseFloatOrZero(invoiceLines[il]['account-allocations'][acc]['shipping-distribution-total'])));
                                    tempObject.totalHandlingAmount = utility.formatCurrency(Math.abs(utility.parseFloatOrZero(invoiceLines[il]['account-allocations'][acc]['handling-distribution-total'])));
                                    tempObject.totalMiscAmount = utility.formatCurrency(Math.abs(utility.parseFloatOrZero(invoiceLines[il]['account-allocations'][acc]['misc-distribution-total'])));
                                }
                                tempObject["invoiceLineID"] = "Invoice: " + invoicePayload.id + " - " + (utility.parseFloatOrZero(il) + 1);
                                let absoluteObject = convertAmountToAbsolute(invoiceLines[il]);
                                let tempArray = utility.getSplitAccExpnsLineWithTaxCode(absoluteObject, invoiceLines[il]['account-allocations'][acc], tempObject, configuration, chargesArray, false, headerTaxArray);
                                invoiceLinesArray.push(...tempArray);
                            }
                        }
                    }

                    /*log.debug({
                        title: 'Invoice: ' + invoicePayload.id + ' - Invoice Lines extracted from payload: ',
                        details: JSON.stringify(invoiceLinesArray)
                    });*/

                    /*****************************************
                     *
                     *  Setting Expense Sublist Lines
                     *
                     *****************************************/
                    vendorCreditRecord = utility.setExpenseSublist(configuration, vendorCreditRecord, chargesArray, invoiceLinesArray, invoicePayload);

                    if (!vendorCreditRecord) {
                        return false;
                    }
                    log.debug({
                        title: 'Invoice: ' + invoicePayload.id + ' - Invoice Lines extracted from payload: ',
                        details: JSON.stringify(invoiceLinesArray)
                    });

                    if (configuration.isVBApprovalEnabled) {                                                                      //set the approvalstatus as approved if VB Routing Enabled
                        vendorCreditRecord.setText({
                            fieldId: 'approvalstatus',
                            text: 'Approved'
                        });
                    }

                    vendorCreditRecord.setValue({
                        fieldId: 'externalid',
                        value: 'Coupa-VendorCredit-' + invoicePayload.id
                    })

                    let vendorCreditId = vendorCreditRecord.save();
                    return vendorCreditId;
                } else {
                    log.audit({
                        title: "Invoice Integration skipped due to inconsistent signs for line and total amount",
                        details: "Coupa Credit Note ID: " + invoicePayload.id
                    });
                }
            } catch (e) {
                log.error({
                    title: 'Error occurred while creating Vendor Credit From Invoice',
                    details: JSON.stringify(e)
                });
                log.debug({
                    title: 'Error occurred while creating Vendor Credit From Invoice',
                    details: e
                });
                throw e;
            }
        }

        const convertAmountToAbsolute = (invoiceLines) => {
            if (!invoiceLines ['account']) {
                for (let acc in invoiceLines['account-allocations']) {
                    invoiceLines['price'] = utility.parseFloatOrZero(invoiceLines['price']) < 0 ? Math.abs(utility.parseFloatOrZero(invoiceLines['price'])) : invoiceLines['price'];
                    invoiceLines['account-allocations'][acc]['amount'] = utility.parseFloatOrZero(invoiceLines['account-allocations'][acc]['amount']) < 0 ? Math.abs(utility.parseFloatOrZero(invoiceLines['account-allocations'][acc]['amount'])) : invoiceLines['account-allocations'][acc]['amount'];
                }
            } else {
                invoiceLines['price'] = utility.parseFloatOrZero(invoiceLines['price']) < 0 ? Math.abs(utility.parseFloatOrZero(invoiceLines['price'])) : utility.parseFloatOrZero(invoiceLines['price']);
                invoiceLines['total'] = utility.parseFloatOrZero(invoiceLines['total']) < 0 ? Math.abs(utility.parseFloatOrZero(invoiceLines['total'])) : utility.parseFloatOrZero(invoiceLines['total']);
            }
            return invoiceLines;
        }
        return {
            createVendorCreditFromCN,
            convertAmountToAbsolute
        }

    }
);