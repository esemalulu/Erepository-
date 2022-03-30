/*
***********************************************************************
*
* The following Script is developed by ERP Buddies Inc.,
* a NetSuite Solution Provider.
*
* Company: ERP Buddies Inc., www.erpbuddies.com
*              Cloud Solution Partners
* Author:      bhavik.bhavsar@erpbuddies.com
* Date:        Jan 15, 2020
* File:        Manage Purchase Order Checkbox.js
*
***********************************************************************/
/**
* The following entry point is deployed on Purchase Order
* @author bhavik.bhavsar@erpbuddies.com
* @return {Object} User Event Object.
*
* @NApiVersion 2.x
* @NScriptType UserEventScript
*/
// Variable declaration
var FLAG = false;

define(['N/record','N/log', 'N/error'], function(record,log, error){
  function afterSubmit(context) {
    
    
    try{
      // Get the Record information from purchase order
    //  var purchaseOrderRecord = context.newRecord;
      
      var purchaseOrderRecord = record.load({
type: context.newRecord.type,
id: context.newRecord.id,
isDynamic: true
})
      // Get the line item count form the purchase order at sublist level
      var lineCount = purchaseOrderRecord.getLineCount({sublistId:'item'});
      // Get the current value of checkbox if it true or false and stored in variable supervisor_approal
      var supervisor_approal = purchaseOrderRecord.getValue({fieldId:'supervisorapproval'});
      
      
     
        //Get the sublist value and stored in linked_order
        var item         = purchaseOrderRecord.getSublistValue({sublistId:'item',fieldId:'item',line:0});
        var linked_order = purchaseOrderRecord.getSublistValue({sublistId:'item',fieldId:'linkedorder',line:0});
                           
        if(linked_order > 0) // Condition to check if linked_order is empty/null
           FLAG = false;  // Generated by requisition
        else  //// Condition to check if linked_order has any value
           FLAG = true;  //generated via req
      
      
       log.debug("before if statement");
        log.debug(linked_order);
        log.debug(item);
         log.debug(lineCount);
        
        log.debug(FLAG);
      
      // Condition to check if flag is true then the checkbox will be set to true (checkbox will be checked)
      
           
      if(FLAG == false) { //requisition
       
        log.debug("requisition");
        log.debug(linked_order);
        log.debug(item);
         log.debug(lineCount);
        
        log.debug(FLAG);
 purchaseOrderRecord.setValue({fieldId:'supervisorapproval', value: true});
purchaseOrderRecord.setValue({fieldId: 'custbody_tjinc_dwvpur_requiresapproval', value: false});
        /*record.submitFields({
          type: context.newRecord.type,
          id: context.newRecord.id,
          values:{
            supervisorapproval:true,  
            custbody_tjinc_dwvpur_requiresapproval: false
          }
        });*/
      }
      // Condition to check if flag is false and the checkbox is true then the checkbox will be set to false (checkbox will be unchecked)
      //else if (FLAG==false) && (supervisor_approal ==false)
      else
      //
      {
        log.debug("purchase order");
        log.debug(FLAG);
        log.debug(linked_order);
        log.debug(item);
        log.debug(lineCount);
        purchaseOrderRecord.setValue({fieldId:'supervisorapproval', value: false});
        purchaseOrderRecord.setValue({fieldId: 'custbody_tjinc_dwvpur_requiresapproval', value: true});
        purchaseOrderRecord.setValue({fieldId:'department', value: 16});
    /*    record.submitFields({
          type: context.newRecord.type,
          id: context.newRecord.id,
          values:{
            supervisorapproval:false,
            custbody_tjinc_dwvpur_requiresapproval: true
          }
        });*/
      }
purchaseOrderRecord.save();
    }catch(error){
      if (error instanceof nlobjError) {
        var errorMsg = "Code: " + error.getCode() + " Details: " + error.getDetails();
        log.error('An error occurred.', errorMsg);
      }
      else {
        log.error('An unknown error occurred.', error.toString());
      }
    }
  
  // function to check different conditions of the field
  function isEmpty(value) {
    if (value === null) {
      return true;
    } else if (value === undefined) {
      return true;
    } else if (value === '') {
      return true;
    } else if (value === ' ') {
      return true;
    } else if (value === 'null') {
      return true;
    } else {
      return false;
    }
  }
  }
  return {
    afterSubmit: afterSubmit
  };
});
