/**
 * @NApiVersion 2.1
 */
define(['N/file', 'N/record', 'N/search', 'N/query', 'N/runtime', 'N/render', './GD_LIB_ExportData', './moment.min'],
    /**
     * @param{file} file
     * @param{record} record
     * @param{search} search
     * @param{query} query
     * @param{runtime} runtime
     * @param{render} render
     * @param{ExportData} ExportData
     * @param moment
     */
    (file, record, search, query, runtime, render, ExportData, moment) => {

        class ExportPaymentFileHandler {
            constructor() {
                this.fields = ['internalid', 'refnum', 'amount', 'due', 'disc', 'applydate', 'total'];
                /*  this.applyFieldIds = {
                      amount:"2353.00"
                      apply:"T"
                      applydate:"1/28/2023"
                      disc:"500.00"
                      doc:"17328279"
                      due:"2995.65"
                      duedate:"1/28/2023"
                      internalid:"17328279"
                      line:"0"
                      refnum:"check_Export1234"
                      sys_id:"5120067203279278"
                      sys_parentid:"5120067203237334"
                      total:"2995.65"
                      trantype:"VendBill"
                      type:"Bill"
                      userentereddiscount:"T"
                  }*/
            }

            roundNumber(number) {
                // Make sure number is a number
                number = parseFloat(number);
                return Math.round((number + Number.EPSILON) * 100) / 100
            }
            shortenString(str, length) {
                if (!str) return '';
                const temp = str.toString();
                if (temp.length > length) {
                    return temp.substring(0, length);
                }
                return temp;
            }
            /**
             * Gets vendor payment details, including the bills and credits that are applied to the payment.
             * @param vendorPaymentRecordId
             * @returns {{internalId, total: string, checkNo: (number|Date|string|Array|boolean|*), vendorId: (number|Date|string|Array|boolean|*)}}
             */
            processVendorPayment(vendorPaymentRecordId) {
                let vendorPaymentRecord = record.load({
                    type: record.Type.VENDOR_PAYMENT,
                    id: vendorPaymentRecordId
                });
                const lineCount = vendorPaymentRecord.getLineCount({
                    sublistId: 'apply'
                });
                const paymentInfo = {
                    vendorId: vendorPaymentRecord.getValue('entity'),
                    total: parseFloat(vendorPaymentRecord.getValue('total')).toFixed(2),
                    checkNo: vendorPaymentRecord.getValue('tranid'),
                    internalId: vendorPaymentRecordId,
                }
                paymentInfo.vendorInfo = this.getEntityInfo('vendor', paymentInfo.vendorId);
                const dataHandler = new ExportData();
                const billInfos = [];
                const vendorBillInfo = dataHandler.getExtendedBillInfo([vendorPaymentRecordId]);
                for (let i = 0; i < lineCount; i++) {
                    const applied = vendorPaymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        line: i
                    });
                    if (!applied) continue;
                    const amount = vendorPaymentRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'amount',
                        line: i
                    });
                    //if (!amount) continue;
                    const billInfo = this.fields.reduce((acc, field) => {
                        acc[field] = vendorPaymentRecord.getSublistValue({
                            sublistId: 'apply',
                            fieldId: field,
                            line: i
                        });
                        return acc;
                    }, {});
                    billInfo.amount = Number(billInfo.amount) || 0;
                    billInfo.total = Number(billInfo.total) || 0;
                    billInfo.netAmount = Number(billInfo.total) || 0;
                    if (billInfo.disc) {
                        billInfo.disc = Number(billInfo.disc);
                        billInfo.netAmount = billInfo.total - billInfo.disc;
                    }
                    billInfo.applydate = moment(billInfo.applydate).format('MM/DD/YYYY');
                    billInfo.memo = '';
                    if (vendorBillInfo.length) {
                        const temp = vendorBillInfo.find(bill => bill.internalId === billInfo.internalid);
                        if (temp) {
                            billInfo.memo = temp.memo.substring(0, 30);
                        }
                    }
                    billInfo.refnum = billInfo.refnum.substring(0, 30);
                    billInfo.due = billInfo.due?.toString().substring(0, 11) || 0;
                    billInfo.grossAmount = billInfo.total?.toString().substring(0, 11) || 0;
                    billInfo.disc = billInfo.disc?.toString().substring(0, 11) || 0;
                    billInfo.netAmount = parseFloat(billInfo.netAmount?.toString()).toFixed(2);
                    billInfos.push(billInfo);
                }
                paymentInfo.creditInfos = dataHandler.getAppliedCredits(billInfos.map(bill => bill.internalid));
                // If there are credits, adjust the amount of the bill to reflect the credit.
                if (paymentInfo.creditInfos.length) {
                    const temp = [];
                    paymentInfo.creditInfos.forEach((credit) => {
                        const i = temp.findIndex(x => x.internalId === credit.internalId);
                        if (i <= -1) {
                            temp.push(credit);
                        }
                    });
                    paymentInfo.creditInfos = temp;
                    /*billInfos.forEach(bill => {
                        const credits = paymentInfo.creditInfos.filter(credit => Math.abs(credit.amount) > 0 && credit.appliedToTransactionId === bill.internalid);
                        if (credits.length) {
                            bill.amount = (bill.amount + Math.abs(credits.reduce((acc, credit) => acc + Number(credit.amount), 0)));
                        }
                    });*/
                }
                billInfos.sort((a, b) => (a.refnum > b.refnum) ? 1 : ((b.refnum > a.refnum) ? -1 : 0))
                paymentInfo.billInfos = billInfos;
                // Check that the total of the bills and credits equals the payment total.
                const billTotal = billInfos.reduce((acc, bill) => acc + parseFloat(bill.netAmount), 0);
                const creditTotal = paymentInfo.creditInfos.reduce((acc, credit) => acc + parseFloat(credit.amount), 0);
                const paymentTotal = parseFloat(paymentInfo.total);
                paymentInfo.billTotal = this.roundNumber(billTotal);
                paymentInfo.creditTotal = this.roundNumber(creditTotal);
                paymentInfo.paymentTotal = this.roundNumber(paymentTotal);
                paymentInfo.calculatedTotal = this.roundNumber(paymentInfo.billTotal + paymentInfo.creditTotal);
                paymentInfo.balanced = paymentInfo.calculatedTotal.toFixed(2) === paymentInfo.paymentTotal.toFixed(2);

                log.audit(`paymentTotals ${paymentInfo.checkNo}`,
                    `creditTotal: ${paymentInfo.creditTotal} billTotal: ${paymentInfo.billTotal} paymentTotal: ${paymentInfo.paymentTotal} calTotal: ${paymentInfo.calculatedTotal} 
                    paymentTotal === creditTotal + billTotal: ${paymentInfo.balanced}`);
                if(!paymentInfo.balanced)
                    this.renderVendorPayment(paymentInfo);
                return paymentInfo;
            }

            processDealerRefund(refundRecordId) {
                log.debug('refundRecordId', refundRecordId);
                let refundRecord = record.load({
                    type: record.Type.CUSTOMER_REFUND,
                    id: refundRecordId
                });
                const lineCount = refundRecord.getLineCount({
                    sublistId: 'apply'
                });
                // Get the header level information for the refund
                const refundInfo = {
                    dealerId: refundRecord.getValue('customer'),
                    total: parseFloat(refundRecord.getValue('total')).toFixed(2),
                    checkNo: refundRecord.getValue('checknumber'),
                    internalId: refundRecordId,
                }
                log.debug('refundInfo', refundInfo);
                // Get the dealer information - address, phone, etc.
                refundInfo.dealerInfo = this.getEntityInfo('customer', refundInfo.dealerId);
                const dataHandler = new ExportData();
                const creditMemos = [];
                const extendedCreditMemoInfo = dataHandler.getExtendedCreditMemoInfo([refundRecordId]);
                log.debug('extendedCreditMemoInfo', extendedCreditMemoInfo);
                for (let i = 0; i < lineCount; i++) {
                    const applied = refundRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        line: i
                    });
                    if (!applied) continue;
                    const amount = refundRecord.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'amount',
                        line: i
                    });
                    if (!amount) continue;
                    const creditMemoInfo = this.fields.reduce((acc, field) => {
                        acc[field] = refundRecord.getSublistValue({
                            sublistId: 'apply',
                            fieldId: field,
                            line: i
                        });
                        return acc;
                    }, {});
                    creditMemoInfo.applydate = moment(creditMemoInfo.applydate).format('MM/DD/YYYY');
                    creditMemoInfo.memo = '';
                    if (extendedCreditMemoInfo.length) {
                        const temp = extendedCreditMemoInfo.find(credit => credit.internalid === creditMemoInfo.internalid);
                        if (temp) {
                            creditMemoInfo.memo = temp.memo.substring(0, 30);
                            creditMemoInfo.poNumber = temp.poNumber.substring(0, 30);
                        }
                    }
                    creditMemoInfo.internalid = creditMemoInfo.internalid * 1;
                    creditMemoInfo.refnum = creditMemoInfo.refnum.substring(0, 30);
                    creditMemoInfo.due = creditMemoInfo.due?.toString().substring(0, 11) || 0;
                    creditMemoInfo.disc = creditMemoInfo.disc?.toString().substring(0, 11) || 0;
                    log.debug('creditMemoInfo', creditMemoInfo);
                    creditMemos.push(creditMemoInfo);
                }
                log.debug('creditMemos', creditMemos);
                // get the additional credit memo information
                const claimInfo = dataHandler.getClaimInfoFromCreditMemos(creditMemos);
                log.debug('claimInfo', claimInfo);
                claimInfo.forEach(claim => {
                    log.debug('claim', claim);
                    const creditMemo = creditMemos.find(credit => Number(credit.internalid) === Number(claim.internalid));
                    log.debug('creditMemo', creditMemo)
                    if (creditMemo) {
                        creditMemo.claimNo = claim.claimid;
                        creditMemo.spiffNo = claim.spiffid;
                        creditMemo.vin = claim.vin;
                    } else {
                        // Not associated with a claim or spiff. 
                        creditMemo.claimNo = '';
                        creditMemo.spiffNo = '';
                        creditMemo.vin = '';
                    }
                });
                
                // Edge case - These are not associated with a claim or spiff.
                // Set the claimNo, spiffNo, and vin to blank so that the export does not fail.
                if(!claimInfo || !claimInfo.length) {
                    creditMemos.forEach(creditMemo => {
                        creditMemo.claimNo = '';
                        creditMemo.spiffNo = '';
                        creditMemo.vin = '';                        
                    });    
                }
                
                refundInfo.creditMemos = creditMemos;
                return refundInfo;
            }

            renderVendorPayment(paymentInfo) {
                let billString = '';
                log.audit('RENDERING PAYMENT', paymentInfo.internalId);
                const credits = [];
                const billPaymentRec = record.load({type: record.Type.VENDOR_PAYMENT, id: paymentInfo.internalId, isDynamic: true});
                const lineCount = billPaymentRec.getLineCount({
                    sublistId: 'apply'
                });
                
                // Get the bill credits on the bill payment record using the render PDF template as this is the only way to get this data as of 2020.1 Release.
                const vendorBillPaymentFile = render.transaction({
                    entityId: parseInt(paymentInfo.internalId),
                    printMode: render.PrintMode.HTML,
                    formId: 222,
                    inCustLocale: true
                });
                // Code taken from GD_ExportBillPyamentDetail_Suitelet.js. 
                // The form id 222 is a custom form for the bill payment record that is inactive but is used to generate the bill credits for the bill payment record.  The form Name is "GD Bill Payment (FOR SUITELET USE)"
                // The advanced PDF Template set on this Bill Payment Transaction Form is "GD Bill Payment - Bill Credit Data Generator (script use only)" with script ID "CUSTTMPLGD_BILLPAYMENTBILLCREDITDATAGENERATOR"
                // The advanced PDF template is very simple and constructs a JSON Array text of all the Bill Credits data.
                // JSON Array model: [{"creditdate": "${credit.creditdate}", "type": "${credit.type}", "refnum": "${credit.refnum}", "appliedto": "${credit.appliedto}", "amount": "${credit.amount}"}]
                const vendorBillPaymentsHTML = vendorBillPaymentFile.getContents();
                const vendorBillPaymentsHTMLSubstring = vendorBillPaymentsHTML.substring(vendorBillPaymentsHTML.indexOf('(firstIndex)') + 12, vendorBillPaymentsHTML.indexOf(',(lastIndex)')) + ']';
                const vendorBillCreditsArray = JSON.parse(vendorBillPaymentsHTMLSubstring);
                log.debug('vendorBillCreditsArray', vendorBillCreditsArray);

                log.debug('paymentInfo.billInfos', paymentInfo.billInfos);
                const creditRefNumObjects = vendorBillCreditsArray.reduce((acc, creditInfo) => {
                    if (acc[creditInfo.refnum]) {
                        acc[creditInfo.refnum].amount += parseFloat(creditInfo.amount.replace('$', '').replace(',', ''));
                    } else {
                        acc[creditInfo.refnum] = {date: '', amount: 0};
                        acc[creditInfo.refnum].amount = parseFloat(creditInfo.amount.replace('$', '').replace(',', ''));
                        acc[creditInfo.refnum].date = creditInfo.creditdate;
                    }
                    return acc;
                }, {});
                
                paymentInfo.creditInfos = [];
                log.debug('creditRefNumObjects', creditRefNumObjects);
                
                // Add the bill credits to the CSV
                Object.entries(creditRefNumObjects).forEach(([key, value]) => {
                    paymentInfo.creditInfos.push({
                        tranId: key,
                        memo: '',
                        tranDate: value.date,
                        amount: -this.roundNumber(value.amount),
                    });
                });
                log.debug('paymentInfo.creditInfos', paymentInfo.creditInfos);
                const billArray = paymentInfo.billInfos.map(bill => {
                    return bill.refnum;
                });
                log.debug('billArray', billArray);
                const additionalBills = [];
                // These are bills that are fully applied but do not show up on the bill payment record.
                for(let i = 0; i < vendorBillCreditsArray.length; i++) {
                    try {
                        const billInfo = paymentInfo.billInfos.find(bill => {
                            const appliedTo = vendorBillCreditsArray[i].appliedto.slice(-bill.refnum.length);
                            return bill.refnum === appliedTo;
                        });
                        if (!billInfo) {
                            // Check to see if the bill is already in the additionalBills array
                            const existingBill = additionalBills.find(bill => {
                                return bill.refnum === vendorBillCreditsArray[i].appliedto.replace('Bill #', '');
                            });
                            // If the bill is already in the additionalBills array, add the amount to the existing bill
                            if (existingBill) {
                                existingBill.amount += this.roundNumber(vendorBillCreditsArray[i].amount.replace('$', '').replace(',', ''));
                                existingBill.netAmount = existingBill.amount;
                                existingBill.grossAmount = existingBill.amount;
                            } else {
                                // If the bill is not in the additionalBills array, add it to the array
                                additionalBills.push({
                                    refnum: vendorBillCreditsArray[i].appliedto.replace('Bill #', ''),
                                    memo: '',
                                    applydate: vendorBillCreditsArray[i].creditdate,
                                    amount: this.roundNumber(vendorBillCreditsArray[i].amount.replace('$', '').replace(',', '')),
                                    netAmount: this.roundNumber(vendorBillCreditsArray[i].amount.replace('$', '').replace(',', '')),
                                    grossAmount: this.roundNumber(vendorBillCreditsArray[i].amount.replace('$', '').replace(',', '')),
                                    disc: 0
                                });
                            }
                        }
                    } catch (e) {
                        log.error('Error processing bill', e);
                    }
                }
                paymentInfo.billInfos = paymentInfo.billInfos.concat(additionalBills);
                const billTotal = paymentInfo.billInfos.reduce((acc, bill) => acc + parseFloat(bill.netAmount), 0);
                const creditTotal = paymentInfo.creditInfos.reduce((acc, credit) => acc + parseFloat(credit.amount), 0);
                const paymentTotal = parseFloat(paymentInfo.total);
                paymentInfo.billTotal = this.roundNumber(billTotal);
                paymentInfo.creditTotal = this.roundNumber(creditTotal);
                paymentInfo.paymentTotal = this.roundNumber(paymentTotal);
                paymentInfo.calculatedTotal = this.roundNumber(paymentInfo.billTotal + paymentInfo.creditTotal);
                paymentInfo.balanced = paymentInfo.calculatedTotal.toFixed(2) === paymentInfo.paymentTotal.toFixed(2);
                log.debug('paymentInfo', paymentInfo);
            }

            getEntityInfo(entityType, entityId) {

                // if addresss is empty, check to see if the dealer is a credit dealer (custentityrvsdealertype = credit)
                // if so, get the address from the parent.
                //custentityrvsdealertype:"9"
                const getPrintOnCheckAs = (entityType, entityId) => {
                    const sQuery = `SELECT printoncheckas FROM ${entityType} WHERE id = ?`;
                    const oQueryResults = query.runSuiteQL({
                        query: sQuery,
                        params: [entityId]
                    }).asMappedResults();
                    return oQueryResults.length ? oQueryResults[0].printoncheckas : '';
                }

                const getChildInfo = (entityType, entityId) => {
                    const sQuery = `SELECT entityid, entitytitle, parent, printoncheckas, custentityrvsdealertype FROM ${entityType} WHERE id = ?`;
                    const oQueryResults = query.runSuiteQL({
                        query: sQuery,
                        params: [entityId]
                    }).asMappedResults();
                    return oQueryResults.length ? oQueryResults[0] : {};
                }

                const shortenString = (str, length) => {
                    if (!str) return '';
                    const temp = str.toString();
                    if (temp.length > length) {
                        return temp.substring(0, length);
                    }
                    return temp;
                }

                const trimToFirstComma = (str) => {
                    if (!str) return '';
                    const temp = str.toString();
                    return temp.split(',')[0];
                }

                const runSearch = () => {
                    entitySearch.run().each((result) => {
                        // log.debug('result', result.toJSON());
                        entityInfo.addressee = result.getValue({name: 'addressee', join: 'Address'});
                        entityInfo.add1 = result.getValue({name: 'address1', join: 'Address', label: 'Address 1'});
                        entityInfo.add2 = result.getValue({name: 'address2', join: 'Address', label: 'Address 2'});
                        entityInfo.add3 = result.getValue({name: 'address3', join: 'Address', label: 'Address 3'});
                        entityInfo.city = result.getValue({name: 'city', join: 'Address', label: 'City'});
                        entityInfo.country = result.getValue({name: 'country', join: 'Address', label: 'Country'});
                        entityInfo.state = result.getValue({name: 'state', join: 'Address', label: 'State/Province'});
                        entityInfo.name = result.getValue('entityid');
                        entityInfo.basename = result.getValue('entityid');
                        entityInfo.zipCode = result.getValue({name: 'zipcode', join: 'Address', label: 'Zip Code'});
                        entityInfo.internalId = result.getValue({name: 'internalid'});
                        entityInfo.phone_no = result.getValue({name: 'addressphone', join: 'Address', label: 'Address Phone'});
                        entityInfo.deliveryMethod = result.getText({name: 'custentity_gd_jpm_delivery_method'});
                        return false;
                    });
                }

                const filters = [
                    ['internalid', 'anyof', parseInt(entityId, 10).toString()],
                ];
                filters.push('AND', ['address.isdefaultbilling', 'is', 'T'])
                const columns = [
                    search.createColumn({name: 'addressee', join: 'Address', label: 'Addressee'}),
                    search.createColumn({name: 'address1', join: 'Address', label: 'Address 1'}),
                    search.createColumn({name: 'address2', join: 'Address', label: 'Address 2'}),
                    search.createColumn({name: 'address3', join: 'Address', label: 'Address 3'}),
                    search.createColumn({name: 'city', join: 'Address', label: 'City'}),
                    search.createColumn({name: 'country', join: 'Address', label: 'Country'}),
                    search.createColumn({name: 'state', join: 'Address', label: 'State/Province'}),
                    search.createColumn({name: 'entityid', sort: search.Sort.ASC, label: 'Name'}),
                    search.createColumn({name: 'zipcode', join: 'Address', label: 'Zip Code'}),
                    search.createColumn({name: 'internalid'}),
                    search.createColumn({name: 'addressphone', join: 'Address', label: 'Address Phone'}),
                    search.createColumn({name: 'custentity_gd_jpm_delivery_method', label: 'Delivery Method'}),
                ]

                let entitySearch = search.create({
                    type: entityType,
                    filters: filters,
                    columns: columns
                });

                const entityInfo = {};
                let childInfo = undefined;
                runSearch();
                // Handle no address
                if (entityType === 'customer' && !entityInfo.add1) {
                    childInfo = getChildInfo(entityType, entityId);
                    if (childInfo.parent && childInfo['custentityrvsdealertype'] === 9) {
                        entitySearch = search.create({
                            type: entityType,
                            filters: [
                                ['internalid', 'anyof', childInfo.parent],
                                'AND',
                                ['address.isdefaultbilling', 'is', 'T']
                            ],
                            columns: columns
                        });
                        runSearch();
                        childInfo.isCreditDealer = true;
                        entityInfo.internalId = entityId;
                        entityInfo.name = childInfo.entitytitle;
                        entityInfo.basename = childInfo.entitytitle;
                    }
                }

                if (entityType === 'customer')
                    entityInfo.name = getPrintOnCheckAs(entityType, entityId);

                // Check if the name has a comma
                if (entityInfo.name && entityInfo.name.includes(',')) {
                    // Check if the entity has a print on check as value
                    let tempName = getPrintOnCheckAs(entityType, entityId);
                    entityInfo.name = tempName ? tempName : entityInfo.name;
                }
                // If there is no print on check as value, use the parent's print on check as value
                if (!entityInfo.name && childInfo && childInfo.isCreditDealer) {
                    entityInfo.name = getPrintOnCheckAs(entityType, childInfo.parent);
                }

                // No print on check as value, use the addressee
                if (!entityInfo.name && entityInfo.addressee) {
                    entityInfo.name = entityInfo.addressee;
                }

                // Still no name?
                if (!entityInfo.name) {
                    entityInfo.name = entityInfo.basename;
                }
                entityInfo.name = entityInfo.name.replace(/  +/g, ' ');
                entityInfo.name = shortenString(entityInfo.name, 35);
                entityInfo.internalId = shortenString(entityInfo.internalId, 19);
                entityInfo.add1 = trimToFirstComma(shortenString(entityInfo.add1, 35));
                entityInfo.add2 = trimToFirstComma(shortenString(entityInfo.add2, 35));
                entityInfo.add3 = trimToFirstComma(shortenString(entityInfo.add3, 35));
                entityInfo.city = trimToFirstComma(shortenString(entityInfo.city, 35));
                entityInfo.state = shortenString(entityInfo.state, 35);
                entityInfo.zipCode = shortenString(entityInfo.zipCode, 10);
                entityInfo.country = shortenString(entityInfo.country, 3);
                if (entityInfo.phone_no && Number(entityInfo.phone_no) !== 0) {
                    entityInfo.phone_no = entityInfo.phone_no.toString().replace('-', '');
                    entityInfo.phone_no = entityInfo.phone_no.toString().replace('-', '');
                    entityInfo.phone_no = entityInfo.phone_no.substring(0, 20);
                } else {
                    entityInfo.phone_no = '';
                }
                log.debug('entityInfo', entityInfo);
                return entityInfo;
            }

            /**
             * Generate the payment file. Loops through the Bill Payments or Dealer Refunds and generates the file.
             * @param payments
             * @param isDealerRefund
             * @returns {*}
             */
            generatePaymentFile(payments, isDealerRefund) {
                const config = this.getFileHeaderConfig(isDealerRefund);
                const self = this;
                log.debug('config', config);
                log.debug('isDealerRefund', isDealerRefund);
                const currentDate = moment().format('MM/DD/YYYY');
                let fileContent = `FILHDR,${config.fileHeaderCol2},${config.fileHeaderCol3},${currentDate},,\r\n`;
                let lineCount = 2;
                if (!isDealerRefund) {
                    payments.forEach((payment) => {
                        fileContent += `PMTHDR,${payment.vendorInfo.deliveryMethod || config.payHeaderCol2},${config.payHeaderCol3},${currentDate},${payment.total},${config.payHeaderCol6},${payment.checkNo}\r\n`;
                        fileContent += `PAYENM,|${payment.vendorInfo.name}|,,${payment.vendorInfo.internalId}\r\n`
                        fileContent += `PYEADD,|${payment.vendorInfo.add1}|,|${payment.vendorInfo.add2}|,${payment.vendorInfo.phone_no}\r\n`;
                        fileContent += `ADDPYE,|${payment.vendorInfo.add3}|\r\n`;
                        fileContent += `PYEPOS,|${payment.vendorInfo.city}|,${payment.vendorInfo.state},${payment.vendorInfo.zipCode},${payment.vendorInfo.country}\r\n`;

                        lineCount += 5;
                        payment.creditInfos.forEach((creditInfo) => {
                            // Removed this due to possible length issues
                            //const creditDesc = `Credit #${creditInfo.tranId} for ${creditInfo.appliedToText}`.substring(0,30);
                            fileContent += `RMTDTL,|${(`Bill Credit #${creditInfo.tranId}`).substring(0,30)}|,|${creditInfo.memo?.substring(0,30)}|,${creditInfo.tranDate},${parseFloat(creditInfo.amount).toFixed(2)},${parseFloat(creditInfo.amount).toFixed(2)},0\r\n`;
                            lineCount++;
                        });

                        payment.billInfos.forEach((billInfo) => {
                            fileContent += `RMTDTL,${billInfo.refnum?.substring(0,30)},|${billInfo.memo?.substring(0,30)}|,${billInfo.applydate},${parseFloat(billInfo.netAmount).toFixed(2)},${parseFloat(billInfo.grossAmount).toFixed(2)},${parseFloat(billInfo.disc).toFixed(2)}\r\n`;
                            lineCount++;
                        });
                    });
                } else {
                    // Dealer refunds
                    payments.forEach((payment) => {
                        fileContent += `PMTHDR,${payment.dealerInfo.deliveryMethod || config.payHeaderCol2},${config.payHeaderCol3},${currentDate},${payment.total},${config.payHeaderCol6},${payment.checkNo}\r\n`;
                        fileContent += `PAYENM,|${payment.dealerInfo.name}|,,${payment.dealerInfo.internalId}\r\n`
                        fileContent += `PYEADD,|${payment.dealerInfo.add1}|,|${payment.dealerInfo.add2}|,${payment.dealerInfo.phone_no}\r\n`;
                        fileContent += `ADDPYE,|${payment.dealerInfo.add3}|\r\n`;
                        fileContent += `PYEPOS,|${payment.dealerInfo.city}|,${payment.dealerInfo.state},${payment.dealerInfo.zipCode},${payment.dealerInfo.country}\r\n`;
                        lineCount += 5;
                        payment.creditMemos.forEach((creditMemo) => {
                            log.debug('creditMemo', creditMemo);
                            let claimNo = '';
                            let vin = '';
                            // Need to handle edge case where both spiff and claim are not present
                            if(creditMemo.spiffNo || creditMemo.claimNo) {
                                claimNo = creditMemo.claimNo ? `Claim:${creditMemo.claimNo}` : `Spiff:${creditMemo.spiffNo}`;
                            } else {
                                claimNo = creditMemo.poNumber;
                            }
                            // If there is a vin, use it, otherwise use the po number
                            if(creditMemo.vin) {
                                vin = `VIN:${creditMemo?.vin.slice(-8)}`
                            } else {
                                // poNumber is the memo field when there is no vin
                                creditMemo.poNumber = creditMemo.memo;
                            }
                            const docIdentifier = `${claimNo} ${vin}`.substring(0,30);
                            // Record identifier, Invoice Number, Memo, Date, Net Amount, Gross Amount, Discount Amount
                            fileContent += `RMTDTL,|${docIdentifier}|,|${creditMemo.poNumber?.substring(0,30)}|,${creditMemo.applydate},${parseFloat(creditMemo.amount).toFixed(2)},${parseFloat(creditMemo.total).toFixed(2)},${parseFloat(creditMemo.disc).toFixed(2)}\r\n`;
                            lineCount++;
                        });
                    });
                }
                fileContent += `FILTRL,${lineCount},`;
                const fileObj = file.create({
                    name: `Payment_Details_${moment().format('YYYY.MM.DD HHmmss')}.csv`,
                    fileType: file.Type.CSV,
                    contents: fileContent,
                    folder: runtime.envType === runtime.EnvType.PRODUCTION ? 52234608 : 52234608
                });
                const savedId = fileObj.save();
                log.debug('savedId:==', savedId);
                return savedId;
            }

            generateUpdateCheckNumberFile(payments) {
                let fileContent = `internalid,tranid\r\n`;
                payments.forEach((payment) => {
                    fileContent += `${payment.internalId},${payment.checkNo}\r\n`;
                });
                const filename = `Update_Check_Number_${moment().format('YYYY.MM.DD HHmmss')}.csv`;
                const fileObj = file.create({
                    name: filename,
                    fileType: file.Type.CSV,
                    contents: fileContent,
                    folder: runtime.envType === runtime.EnvType.PRODUCTION ? 52234608 : 51142174
                });
                const savedId = fileObj.save();
                log.debug('Update Check Number savedId:==', savedId);
                return {
                    updateFileId: savedId,
                    filename: filename
                };
            }

            getFileHeaderConfig(isDealerRefund) {
                const shortenString = (str, length) => {
                    if (!str) return '';
                    const temp = str.toString();
                    if (temp.length > length) {
                        return temp.substring(0, length);
                    }
                    return temp;
                }
                const searchObj = search.create({
                    type: 'customrecord_vendor_export',
                    filters:
                        [
                            ['internalidnumber', 'equalto', !isDealerRefund ? 1 : 2]
                        ],
                    columns:
                        [
                            search.createColumn({name: 'custrecord_fileheader_col_2', label: 'FILHDR Col 2 Static Value'}),
                            search.createColumn({name: 'custrecord_fileheader_col_3', label: 'FILHDR Col 3 Static Value'}),
                            search.createColumn({name: 'custrecord_pmt_col_2', label: 'PMTHDR Col 2 Static value'}),
                            search.createColumn({name: 'custrecord_pmt_col_3', label: 'PMTHDR Col 3 Static value'}),
                            search.createColumn({name: 'custrecordpmt_col_5', label: 'PMTHDR Col 5 Static value'}),
                            search.createColumn({name: 'custrecord_file_header_col_6_static_valu'}),
                            search.createColumn({name: 'custrecord_file_header_col_7_static_valu'}),
                            search.createColumn({name: 'custrecord_pmt_col_6_header_value'}),
                            search.createColumn({name: 'custrecord_pmt_col_7_header_value'})
                        ]
                });
                const config = {};
                searchObj.run().each((result) => {
                    config.fileHeaderCol2 = result.getValue({name: 'custrecord_fileheader_col_2', label: 'FILHDR Col 2 Static Value'});
                    config.fileHeaderCol3 = result.getValue({name: 'custrecord_fileheader_col_3', label: 'FILHDR Col 3 Static Value'});
                    config.fileHeaderCol6 = result.getValue({name: 'custrecord_file_header_col_6_static_valu'});
                    config.fileHeaderCol7 = result.getValue({name: 'custrecord_file_header_col_7_static_valu'});
                    config.payHeaderCol2 = result.getValue({name: 'custrecord_pmt_col_2', label: 'PMTHDR Col 2 Static value'});
                    config.payHeaderCol3 = result.getValue({name: 'custrecord_pmt_col_3', label: 'PMTHDR Col 3 Static value'});
                    config.payHeaderCol6 = result.getValue({name: 'custrecord_pmt_col_6_header_value'});
                    config.payHeaderCol7 = result.getValue({name: 'custrecord_pmt_col_7_header_value'});
                    return false;
                });
                config.fileHeaderCol3 = shortenString(config.fileHeaderCol3, 32);
                config.payHeaderCol2 = shortenString(config.payHeaderCol2, 8);
                config.payHeaderCol3 = shortenString(config.payHeaderCol3, 8);
                return config;
            }
        }

        return ExportPaymentFileHandler;
    });
