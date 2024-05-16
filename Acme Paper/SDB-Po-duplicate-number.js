/**
 * @NApiVersion 2.x
 * @NScriptType clientScript
 * @NModuleScope Public
 */

define(["N/currentRecord", "N/search"], function (currentRecord, search) {
    // functionality to prevento duplicates PO Numbers
    function fieldChanged(context){
      debugger;
        var field = context.fieldId;
        var currentRecord = context.currentRecord;
        if(field == "otherrefnum" && currentRecord.getValue("otherrefnum") != ""){
            var requirePo = nlapiLookupField("customer",currentRecord.getValue("entity"),"custentity_po_flag",true);
            var salesOrders = nlapiSearchRecord("salesorder", null, ["otherrefnum","equalto",currentRecord.getValue("otherrefnum")],null);
            if((requirePo == "REQUIRED PO WITH DUPLICATE ALLOWED" || requirePo == "REQUIRED PO WITH NO DUPLICATE ALLOWED") && (salesOrders && salesOrders.length>0)){
                var confirm = window.confirm("This PO# Number is already in use, do you want to use anyway?");
                if(!confirm){
                    currentRecord.setValue("otherrefnum","");
                }
            }
            /*else if (requirePo == "REQUIRED PO WITH NO DUPLICATE ALLOWED" && salesOrders && salesOrders.length>0) {
              alert("This PO# Number is already in use, you can not duplicate");
              currentRecord.setValue("otherrefnum","");
            }*/
        }
        
    }

    return {
        fieldChanged: fieldChanged
    };
});
