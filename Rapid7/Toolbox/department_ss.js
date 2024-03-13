/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', '/SuiteScripts/Toolbox/Message_Queue_Library_2.0.js'],
    function(record, MQLib) {
        function beforeLoad(context) {

        }
        function beforeSubmit(context) {

        }
        function afterSubmit(context) {
            if (context.type == 'create' || context.type == 'edit') {
                log.debug({
                    title: 'attemping to queue message for department ' + context.newRecord.id
                });
                try {
                    var success = MQLib.QueueNewMessage('workatoDepartmentCoupa', {
                        departmentInternalId: context.newRecord.id
                    });
                    log.debug({
                        title: 'success',
                        details: success
                    });
                }
                catch (e) {
                    log.debug({
                        title: 'e',
                        details: e
                    });
                }
            }
        }
        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });