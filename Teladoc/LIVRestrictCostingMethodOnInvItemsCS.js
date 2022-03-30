/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/runtime'],
    function(runtime) {
        function validateField(context) {
        	/*var accountingPref = config.load({
                type: config.Type.ACCOUNTING_PREFERENCES
            });
            var defaultInvCostingMethod = accountingPref.getValue({
                fieldId: 'INVTCOSTMETHOD'
            });
            alert('defaultInvCostingMethod = '+defaultInvCostingMethod);*/
        	
            var currentRecord = context.currentRecord;
            var fieldName = context.fieldId;
            
            var userRole = runtime.getCurrentUser().role;
            //alert('userRole = '+userRole);
            
            //alert('costingMethodValue = '+currentRecord.getValue({ fieldId: 'costingmethod' }));
            
            if (fieldName == 'costingmethod') {
            	var costingMethodValue = currentRecord.getValue({ fieldId: fieldName });
                //alert('costingMethodValue = '+costingMethodValue);
            	
                if (costingMethodValue != 'AVG' || userRole != 3){
                	alert('Only Administrator can create items with Costing Method other than "Average". Please contact NetSuite Administrator.');
                	return false;
                }
            }
            return true;
        }
        return {
            validateField: validateField
        };
    }); 