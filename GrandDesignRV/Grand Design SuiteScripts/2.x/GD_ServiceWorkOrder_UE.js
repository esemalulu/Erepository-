/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

var SRV_PAYMENTTYPE_WARRANTY = 1;
var SRV_PAYMENTTYPE_GOODWILL = 4;
var SALESTAX = .07;

define(['N/record', 'N/search', 'N/runtime', 'N/ui/serverWidget', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 */
function(record, search, runtime, serverWidget, SSLib_Task) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
        if (scriptContext.type == scriptContext.UserEventType.EDIT) {
            // Get the Service Work Order statuses from the script record deploy parameter, check if any of the statuses is set on the record, check if any of the part lines are locked, then disable the customer pay override field accordingly.
            var swoStatusesDisableCustomerPayOverrideFieldArray = runtime.getCurrentScript().getParameter({name: 'custscriptgd_swostatus'}).split(',');
            var isStatusSelectedOnParameter =  swoStatusesDisableCustomerPayOverrideFieldArray.indexOf(scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_gdstatus'})) > -1; //True if one of the statues in the parameter is set.
            var isPartLineLocked = JSON.parse(scriptContext.newRecord.getValue({fieldId: 'custpage_lockedsrvparts'}) || '[]').length < 1; //True if at least one part line is locked
            // The override field should be disabled if any of the statues from the script parameter is set or if none are set and at least one part line is locked due to the line being partially fulfilled or fully fulfilled.
            if (isStatusSelectedOnParameter || (!isStatusSelectedOnParameter && isPartLineLocked)) {
                // Set the field to disabled.
                scriptContext.form.getField({id: 'custrecordgd_swo_totalsoverride'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
            } else {
                scriptContext.form.addField({id: 'custpage_originaloverridevalue', label: 'Original Total Override Value', type: serverWidget.FieldType.INLINEHTML}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            }
        }
    }

    /**
     * Function definition to be triggered before record is submitted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
        // Load the knockOut data string from the temporary field.
        var koDataStr = scriptContext.newRecord.getValue({fieldId: 'custpage_srvkodata'}) || '';
        if (koDataStr != '') {
            // parse the string into a JSON object.
            var koData = JSON.parse(koDataStr);
            
            // get the values for the regular total field and the override field.
            var totalsOverrideValue = scriptContext.newRecord.getValue({fieldId: 'custrecordgd_swo_totalsoverride'}) || 0;
            var customerPayValue = scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_customerpay'}) || 0;
            var amtDifference = 0;
            var prctChange = 1;
            var lineAmount = 0;
            var newLineAmount = 0;
            var laborTotal = 0;
            var subletTotal = 0;
            var paymentType = '';
            var warrantyPay = 0;
            var customerPay = 0;
            var customerTax = 0;
            var partsTotal = 0;
            
            var custPayOverride = scriptContext.newRecord.getValue({fieldId: 'custrecordgd_swo_totalsoverride'}) || 0;
            var oldRecord = scriptContext.oldRecord || null;
            if (custPayOverride == 0 && oldRecord != null) {
                var oldCustPayOverride = oldRecord.getValue({fieldId: 'custrecordgd_swo_totalsoverride'}) || 0;
                if (oldCustPayOverride != 0) {
                    var opLineHashTable = new Object();
                    var lineId = 0;
                    
                    // Go through the operation lines and get all the original amounts for each item
                    for (var i = 0; i < scriptContext.newRecord.getLineCount({sublistId: 'recmachcustrecordsrv_opline_swo'}); i++) {
                        lineId = scriptContext.newRecord.getSublistValue({sublistId: 'recmachcustrecordsrv_opline_swo', fieldId: 'id', line: i});
                        
                        //Set both the amount and the sublet amount on the hash table to be accessed on the op line loop
                        opLineHashTable["'" + lineId + "'"] = { 
                            originalAmount: scriptContext.newRecord.getSublistValue({sublistId: 'recmachcustrecordsrv_opline_swo', fieldId: 'custrecordgd_opline_originalamount', line: i}),
                            subletOriginalAmount: scriptContext.newRecord.getSublistValue({sublistId: 'recmachcustrecordsrv_opline_swo', fieldId: 'custrecordgd_opline_origsubletamnt', line: i})
                        };
                    }
                    
                    // Now set the original values of the amoutn and sublet amount.  Set all totals body fields as well.
                    for (var i = 0; i < koData.operationLines.length; i++) {
                        koData.operationLines[i].amount = parseFloat(opLineHashTable["'" + koData.operationLines[i].id + "'"].originalAmount || 0);
                        koData.operationLines[i].subletAmount = parseFloat(opLineHashTable["'" + koData.operationLines[i].id + "'"].subletOriginalAmount || 0);

                        paymentType = koData.operationLines[i].selectedPaymentType.id;
                        laborTotal += koData.operationLines[i].amount;
                        subletTotal += koData.operationLines[i].subletAmount;
                        if (paymentType == SRV_PAYMENTTYPE_WARRANTY || paymentType == SRV_PAYMENTTYPE_GOODWILL) {
                            warrantyPay += koData.operationLines[i].amount + koData.operationLines[i].subletAmount;
                        }
                        else {
                            customerPay += koData.operationLines[i].amount + koData.operationLines[i].subletAmount;
                        }
                        
                        // Go through the part lines and recalculate the amount from the qty and rate.
                        for (var j = 0; j < koData.operationLines[i].partLines.length; j++) {
                            koData.operationLines[i].partLines[j].amount = parseFloat((koData.operationLines[i].partLines[j].quantity * koData.operationLines[i].partLines[j].rate).toFixed(2));
                            
                            partsTotal += koData.operationLines[i].partLines[j].amount;
                            if (paymentType == SRV_PAYMENTTYPE_WARRANTY || paymentType == SRV_PAYMENTTYPE_GOODWILL){
                                warrantyPay += koData.operationLines[i].partLines[j].amount;
                            }
                            else {
                                customerPay += koData.operationLines[i].partLines[j].amount;
                            }
                        }
                    }
                    
                    //Get the sales tax.
                    customerTax = partsTotal * SALESTAX;
                    
                    //Update the body field totals.
                    scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_totallabor', value: laborTotal.toFixed(2) || 0});
                    scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_sublettotal', value: subletTotal.toFixed(2) || 0});
                    scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_totalparts', value: partsTotal.toFixed(2) || 0});
                    scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_totaltax', value: customerTax.toFixed(2) || 0});
                    scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_totalamount', value: (warrantyPay + customerPay + customerTax).toFixed(2) || 0});
                    scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_warrantypay', value: warrantyPay.toFixed(2) || 0});
                    scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_customerpay', value: (customerPay + customerTax).toFixed(2) || 0});
                    
                    scriptContext.newRecord.setValue({fieldId: 'custpage_srvkodata', value: JSON.stringify(koData)});
                }
            } else {
                // There are two scenarios: 
                // 1. The override field is greater than the regular total field so we handle that by adding 1 to the percent difference. 
                // 2. If the regular total field is greater than the ovverride value, we handle this by subtracting the percent difference from 1, which gives the percentage of what the value should be.
                if (customerPayValue != 0 && totalsOverrideValue > 0 && customerPayValue != totalsOverrideValue && totalsOverrideValue > customerPayValue) {
                    amtDifference = totalsOverrideValue - customerPayValue;
                    prctChange = 1 + (amtDifference / customerPayValue);
                } else if (customerPayValue != 0 && totalsOverrideValue > 0 && customerPayValue != totalsOverrideValue && customerPayValue > totalsOverrideValue) { 
                    amtDifference = customerPayValue - totalsOverrideValue;
                    prctChange = 1 - (amtDifference / customerPayValue);
                }
                
                // If percent change is 1 then the values are the same, don't do anything.
                if (prctChange != 1) {
                    
                    var partsTotalToFixedDifference = 0;
                    var calculatedCustomerPay = 0;
                    var opLineIndexForPartIndexAdjustment = 0;
                    var partLineIndexForAdjustment = 0;

                    //Loop over the operation lines from the knockOut tab and submit actual operation line records. You must do this instead of submitting records on the SWO
                    // b/c the part line is both a child and a grand child of the SWO. It is also a child of the operation Line, which would make it
                    // impossible to link the part line to the operation line if the operation line is new (b/c then the operation line doesn't have an id).
                    //We also have to do this in AfterSubmit so that the SWO actually has an ID, which it doesn't have on BeforeSubmit if it is new.
                    for (var i = 0; i < koData.operationLines.length; i++) {
                        koData.operationLines[i].amount = parseFloat((koData.operationLines[i].amount * prctChange).toFixed(2));
                        koData.operationLines[i].subletAmount = parseFloat((koData.operationLines[i].subletAmount * prctChange).toFixed(2));
                        
                        paymentType = koData.operationLines[i].selectedPaymentType.id;
                        laborTotal += koData.operationLines[i].amount;
                        subletTotal += koData.operationLines[i].subletAmount;
                        if (paymentType == SRV_PAYMENTTYPE_WARRANTY || paymentType == SRV_PAYMENTTYPE_GOODWILL) {
                            warrantyPay += koData.operationLines[i].amount + koData.operationLines[i].subletAmount;
                        }
                        else {
                            customerPay += koData.operationLines[i].amount + koData.operationLines[i].subletAmount;
                        }
                        
                        // Loop through the part lines and calculate the warranty or customer pay totals or both.
                        for (var j = 0; j < koData.operationLines[i].partLines.length; j++) {
                            koData.operationLines[i].partLines[j].amount = parseFloat((koData.operationLines[i].partLines[j].amount * prctChange).toFixed(2));
                            partsTotal += koData.operationLines[i].partLines[j].amount;
                            if (paymentType == SRV_PAYMENTTYPE_WARRANTY || paymentType == SRV_PAYMENTTYPE_GOODWILL){
                                warrantyPay += koData.operationLines[i].partLines[j].amount;
                            }
                            else {
                                customerPay += koData.operationLines[i].partLines[j].amount;
                            }
                            
                            if (partLineIndexForAdjustment == 0 && koData.operationLines[i].amount > 0) {
                                opLineIndexForPartIndexAdjustment = i;
                                partLineIndexForAdjustment = j;
                            }
                        }
                    }
                    
                    //Calculate taxes
                    customerTax = partsTotal * SALESTAX;
                    
                    calculatedCustomerPay = parseFloat((parseFloat(customerPay + customerTax)).toFixed(2));
                    
                    //recalculate any differences into the one of the part line item if it is larger than or equal to 0.01
                    if (totalsOverrideValue != calculatedCustomerPay) {
                        koData.operationLines[opLineIndexForPartIndexAdjustment].partLines[partLineIndexForAdjustment].amount += totalsOverrideValue - calculatedCustomerPay;
                        customerPay += totalsOverrideValue - calculatedCustomerPay;
                    }
                }
                
                //Update the body field totals.
                scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_totallabor', value: laborTotal.toFixed(2) || 0});
                scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_sublettotal', value: subletTotal.toFixed(2) || 0});
                scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_totalparts', value: partsTotal.toFixed(2) || 0});
                scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_totaltax', value: customerTax.toFixed(2) || 0});
                scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_totalamount', value: (warrantyPay + customerPay + customerTax).toFixed(2) || 0});
                scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_warrantypay', value: warrantyPay.toFixed(2)}) || 0;
                scriptContext.newRecord.setValue({fieldId: 'custrecordsrv_swo_customerpay', value: totalsOverrideValue || 0});
                
                scriptContext.newRecord.setValue({fieldId: 'custpage_srvkodata', value: JSON.stringify(koData)});
            }
        }
    }

    /**
     * Function definition to be triggered after record is submitted. 
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
