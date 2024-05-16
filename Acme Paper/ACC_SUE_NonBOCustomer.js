/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 *
 */
var ALLOWED_TRIGGER_MODES = ["create"];

define(['N/record', 'N/runtime', 'N/search'],
    function (record, runtime, search) {

        function afterSubmit(context){
            try{
                var rec = context.newRecord;
                var createdFrom = rec.getValue({fieldId:'createdfrom'});
                var nonBOCustomer = rec.getValue({fieldId:'custbody_acc_nonbo'});
                if(!isEmpty(createdFrom) && nonBOCustomer == true){
                    var soRec = record.load({type:'salesorder', id: createdFrom});
                    var lineCount = soRec.getLineCount({sublistId:'item'});
                    for (var i=0;i<lineCount;i++){
                        soRec.setSublistValue({sublistId:'item', fieldId:'isclosed', value: true, line:i});
                    }
                    soRec.save();
                }
            }
            catch(error){
                log.error('Error in afterSubmit',error.toString());
            }
        }

        function isEmpty(stValue) {
            if ((stValue == null) || (stValue == '') || (stValue == ' ') || (stValue == undefined)) {
                return true;
            } else {
                return false;
            }
        }

        return {
            afterSubmit: afterSubmit
        };
    }); 