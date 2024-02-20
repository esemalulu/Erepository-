/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/record', 'N/log','N/ui/dialog'], 
    function(record, log,dialog) {
        function saveRecord(scriptContext) {
            //var currentRecord = scriptContext.currentRecord;
            var questionOne = scriptContext.currentRecord.getValue({
                fieldId: 'custpage_svc_exp'
            });
            var questionTwo = scriptContext.currentRecord.getValue({
                fieldId: 'custpage_svc_appt'
            });
            var questionThree = scriptContext.currentRecord.getValue({
                fieldId: 'custpage_svc_dealer_review'
            });
            var questionFour = scriptContext.currentRecord.getValue({
                fieldId: 'custpage_svc_adv_comm'
            });
            var questionFive = scriptContext.currentRecord.getValue({
                fieldId: 'custpage_svc_svs_duration'
            });
            var questionSix = scriptContext.currentRecord.getValue({
                fieldId: 'custpage_svc_repair_satisfaction'
            });
            var questionSeven = scriptContext.currentRecord.getValue({
                fieldId: 'custpage_svc_repair_order'
            });
            var questionEight = scriptContext.currentRecord.getValue({
                fieldId: 'custpage_svc_dealer_recom'
            });

            //var fieldValue = field.getValue();

            if (!questionOne||!questionTwo||!questionThree||!questionFour||!questionFive||!questionSix||!questionSeven||!questionEight) {
                log.error({
                    title: 'Validation Error',
                    details: 'Please enter all the mandatory fields.'
                });

                dialog.alert({
                    title: 'Validation Error',
                    message: 'Please enter all the mandatory fields.'
                });
                return false;
            }

            return true;
        }

          function validateField(scriptContext) {
            // Your client script logic here
           // alert('Client Script Logic Executed!');
            return true;
        }

        return {
            saveRecord:saveRecord,
          validateField:validateField
        };
    }
);
