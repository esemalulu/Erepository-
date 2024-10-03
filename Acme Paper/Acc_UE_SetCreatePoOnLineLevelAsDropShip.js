/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/********************************************************************************************************************************************************************                    
 **@Author      : Farhan Shaikh
 **@Dated       : 15/10/2020   DD/MM/YYYY
 **@Version     : 
 **@Description : UserEvent Script Deployed On Sales Order to Get The Value Of Checkbox from body and accordingly set Create PO Value to Drop Shipment on line level. 
*******************************************************************************************************************************************************************/
define(['N/search', 'N/record', 'N/error', 'N/runtime'], function (search, record, error, runtime) {
    function beforeSubmit(scriptContext) {
        try {
            //log.debug('scriptContext.type',scriptContext.type)
            if (scriptContext.type == 'DELETE') {
                return;
            }
            var currRecord = scriptContext.newRecord;
            var dropShipCheckboxValue = currRecord.getValue('custbody_dropship_order')
            if (dropShipCheckboxValue == 'T' || dropShipCheckboxValue == true) {
                var lineCount = currRecord.getLineCount('item');
                for (var i = 0; i < lineCount; i++) {
                    //itemtype
                    if (currRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i }) != "Service") {
                        var createPo = currRecord.getSublistValue({ sublistId: 'item', fieldId: 'createpo', line: i });
                        var amount = currRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i });
                        if (createPo != 'DropShip' && amount > 0) {
                            currRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'createpo',
                                line: i,
                                value: 'DropShip'
                            });
                        }
                    }
                }
            }
        }
        catch (e) {
            log.debug("ERROR OCCURED", JSON.stringify(e));
        }

    }

    return {
        beforeSubmit: beforeSubmit
    };
})