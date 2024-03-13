/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/record', 'N/format'], function (record, format) {
    function beforeLoad(scriptContext) {
        //Only execute if invoice is being saved for the first time
        //from a create or copy
        log.audit({ title: 'Current Execution Type', details: scriptContext.type });

        const { type } = scriptContext;
        const { CREATE, COPY, TRANSFORM } = scriptContext.UserEventType;

        if ( type === CREATE || type === COPY || type === TRANSFORM ) {
            //Get new record being saved
            const invNewRec = scriptContext.newRecord;

            let billingSchedId;
            let origSo;
            //Get SO invoice was created from
            const origSoId = invNewRec.getValue({ fieldId: 'createdfrom' });
            if (origSoId) {
                origSo = record.load({
                    type: record.Type.SALES_ORDER,
                    id: origSoId,
                });
                //Lookup billing schedule
                billingSchedId = origSo.getValue('billingschedule');
            }
            log.audit({ title: 'Billing Schedule', details: billingSchedId });

            let inlineDisc = false;
            let inlinePartnerDisc = false;
            let inlinePromoAmt = false;

            if (billingSchedId) { // if SF billing sched is not 100% billed on signature, then check inline discounts
                for (let i = 0; i < invNewRec.getLineCount({ sublistId: 'item' }); i++) {
                    log.audit({ title: 'Item Line Count', details: invNewRec.getLineCount({ sublistId: 'item' }) });
                    const disc = invNewRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7inlinediscount',
                        line: i,
                    });
                    log.audit({ title: 'Inline Discount Line #' + i, details: disc });
                    const partnerDisc = invNewRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7inlinepartnerdiscount',
                        line: i,
                    });
                    log.audit({ title: 'Inline Partner Discount Line #' + i, details: partnerDisc });
                    const promoAmt = invNewRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7_promo_amount',
                        line: i,
                    });
                    log.audit({ title: 'Promotion Amount Line #' + i, details: promoAmt });

                    if (disc < 0) {
                        inlineDisc = true;
                    }

                    if (partnerDisc < 0) {
                        inlinePartnerDisc = true;
                    }

                    if(promoAmt < 0) {
                        inlinePromoAmt = true;
                    }
                }
                if (inlineDisc || inlinePartnerDisc || inlinePromoAmt) {
                    log.audit({
                        title: 'Inline Discounts present',
                        details: `inlineDis:${inlineDisc}, inlinePartnerDisc:${inlinePartnerDisc}, inlinePromoAmt:${inlinePromoAmt}`
                    });
                    //Get amount from new record
                    const invTotalAmt = invNewRec.getValue({ fieldId: 'subtotal' });

                    //Get SO amount
                    const origSoAmt = origSo.getValue('subtotal');
                    log.audit({ title: 'Invoice Amount', details: invTotalAmt });
                    log.audit({ title: 'SO Amount', details: origSoAmt });
                    //Compare SO amount to Invoice amount
                    if (invTotalAmt !== origSoAmt) {
                        log.audit({ title: 'Invoice Amount does not match SO Amount.', details: 'Moving to calculate discount percentages' });
                        //If amounts are different, load in the billing schedule
                        const billingSchedRec = record.load({
                            type: record.Type.BILLING_SCHEDULE,
                            id: billingSchedId,
                        });
                        //Using invoice transaction date,
                        const invoiceTranDate = format.format({
                            value: invNewRec.getValue({ fieldId: 'trandate' }),
                            type: format.Type.DATE,
                        });

                        //get line percentage.
                        const lineNum = billingSchedRec.findSublistLineWithValue({
                            sublistId: 'recurrence',
                            fieldId: 'recurrencedate',
                            value: invoiceTranDate,
                        });
                        log.audit({ title: 'Found line for invoice transaction date: ' + invoiceTranDate, details: lineNum });
                        var billedPct = billingSchedRec.getSublistValue({
                            sublistId: 'recurrence',
                            fieldId: 'amount',
                            line: lineNum,
                        });
                        log.audit({ title: 'Returning Percentage from Billing Schedule ID:' + billingSchedId, details: billedPct });
                        //Iterate through invoice lines
                        for (let i = 0; i < invNewRec.getLineCount('item'); i++) {
                            //Get inline dicsount values
                            const currInlineDisc = invNewRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcolr7inlinediscount',
                                line: i,
                            });
                            const currInlineParDisc = invNewRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcolr7inlinepartnerdiscount',
                                line: i,
                            });
                            const currInlinePromoAmt = invNewRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcolr7_promo_amount',  // This is not a real field id
                                line: i,
                            });
                            log.audit({
                                title: 'Current Invoice Line: ' +i,
                                details: `Inline Discount: ${currInlineDisc}. Inline Partner Discount: ${currInlineParDisc}. Inline Promo Amount: ${currInlinePromoAmt}`
                            });
                            if (!currInlineDisc || !currInlineParDisc || !currInlinePromoAmt || currInlineDisc !== '' || currInlineParDisc !== '' || currInlinePromoAmt !== '') {
                                //Calculate relative percentage discounts
                                const newInlineDisc = Number(currInlineDisc) * (Number(billedPct) / 100);
                                const newInlineParDisc = Number(currInlineParDisc) * (Number(billedPct) / 100);
                                const newInlinePromoAmt = Number(currInlinePromoAmt) * (Number(billedPct) / 100);
                                log.audit({
                                    title: 'Updated Invoice Line: ' +i,
                                    details: `Inline Discount: ${newInlineDisc}. Inline Partner Discount: ${newInlineParDisc}. Inline Promo Amount: ${newInlinePromoAmt}`
                                });
                                //Set correct inline discount amounts
                                invNewRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcolr7inlinediscount',
                                    line: i,
                                    value: newInlineDisc,
                                });
                                invNewRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcolr7inlinepartnerdiscount',
                                    line: i,
                                    value: newInlineParDisc,
                                });
                                invNewRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcolr7_promo_amount',
                                    line: i,
                                    value: newInlinePromoAmt,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    return {
        beforeLoad
    };
});