/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/search'],
    (log, search) => {

        const beforeSubmit = (context) => {
            const {newRecord, UserEventType, type} = context;
            const {DELETE} = UserEventType;
            if(type === DELETE) {
                return;
            }

            try{
                let lineCount = newRecord.getLineCount({sublistId: 'item'});
                let updateIndex = null;
                for (let x = 0; x < lineCount; x++) {
                    let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId :'item', line: x});
                    let lineType = newRecord.getSublistValue({sublistId: 'item', fieldId :'itemtype', line: x});

                    if (lineType === "Subtotal")
                        continue;

                    if (lineType === 'Group') {
                        updateIndex = x;

                        log.debug('Line Index', updateIndex);
                        continue;
                    }
                    else if (lineType === 'EndGroup') {
                        updateIndex = null;
                        continue;
                    }

                    let itemLookupFlds = search.lookupFields({
                        type: search.Type.ITEM,
                        id: itemId,
                        columns: 'custitem_arm_upgrade_pricing_line'
                    });
                    let armPricingLine = itemLookupFlds['custitem_arm_upgrade_pricing_line'];

                    if (armPricingLine === true) {

                        log.debug('Pulling From Line ', x);
                        let lineQty = newRecord.getSublistValue({sublistId: 'item', fieldId :'quantity', line: x});
                        let lineRate = newRecord.getSublistValue({sublistId: 'item', fieldId :'rate', line: x});
                        let lineTaxRate = newRecord.getSublistValue({sublistId: 'item', fieldId :'taxrate1', line: x});

                        if (updateIndex != null) {
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_arm_qty_line_value', line: updateIndex, value: lineQty});
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_arm_amount_line_value', line: updateIndex, value: lineRate});
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_arm_tax_rate_line_value', line: updateIndex, value: lineTaxRate});
                            updateIndex = null;
                        }
                    }
                    else if (updateIndex == null) {
                        let lineQty = newRecord.getSublistValue({sublistId: 'item', fieldId :'quantity', line: x});
                        let lineRate = newRecord.getSublistValue({sublistId: 'item', fieldId :'rate', line: x});
                        let lineTaxRate = newRecord.getSublistValue({sublistId: 'item', fieldId :'taxrate1', line: x});

                        if (lineType === "Discount") {
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_arm_qty_line_value', line: x, value: lineQty});
                            //newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_arm_amount_line_value', line: x, value: lineRate});
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_arm_tax_rate_line_value', line: x, value: lineTaxRate});
                        }
                        else {
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_arm_qty_line_value', line: x, value: lineQty});
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_arm_amount_line_value', line: x, value: lineRate});
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_arm_tax_rate_line_value', line: x, value: lineTaxRate});
                        }
                    }
                }
            }
            catch (err) {
                log.error('Unknown Error Occurred', err);
            }
        }

        return {beforeSubmit}

    });
