/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 *
 */
var ALLOWED_TRIGGER_MODES = ["create", "edit"];

define(['N/record', 'N/runtime', 'N/search'],
    function (record, runtime, search) {

        function beforeLoad(context) {
            try {
                return;
                var triggerMode = context.type;
                if (ALLOWED_TRIGGER_MODES.indexOf(triggerMode) == -1) {
                    return;
                }
                var rec = context.newRecord;
                var form = context.form;
                var itemSublist = form.getSublist({
                    id: 'item'
                });
                itemSublist.addButton({
                    id: 'custpage_cust_history',
                    label: 'Customer History',
                    functionName: 'getCustHistory'
                });
               // form.clientScriptFileId = 13825;
                form.clientScriptFileId = 5749;
            } catch (error) {
                log.error('ERROR in beforeLoad', error.toString());
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
            beforeLoad: beforeLoad
        };
    }); 