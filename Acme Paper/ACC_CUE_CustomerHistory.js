/**
 * @NApiVersion 2.x
 * @NScriptType clientScript
 * @NModuleScope Public
 */

define(["N/currentRecord", "N/search", "N/ui/dialog","N/url"], function (currentRecord, search, dialog, url) {

    function pageInit(context){
        try{

        }
        catch(error){
            console.log('Error in pageInit: '+error.toString());
        }
    }

    function getCustHistory(){
             
        try{
            
            var rec = currentRecord.get();
            var customer = rec.getValue({fieldId:'entity'});
            var sURL = url.resolveScript({
                scriptId: 'customscript_acc_sl_customer_history',
                deploymentId: 'customdeploy_acc_sl_customer_history'
            });
   
          
            nlExtOpenWindow(sURL + '&customer=' + customer, 'custpage_customer_history', 1300, 700, null, true, 'Customer History', null);

        }
        catch(error){
            console.log('Error in getCustHistory: '+error.toString());
        }
    }

    function isEmpty(stValue) {
        if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
            return true;
        }
        else {
            if (stValue instanceof String) {
                if ((stValue == '')) {
                    return true;
                }
            }
            else if (stValue instanceof Array) {
                if (stValue.length == 0) {
                    return true;
                }
            }
            return false;
        }
    }

    return {
        pageInit: pageInit,
        getCustHistory: getCustHistory
    };
});