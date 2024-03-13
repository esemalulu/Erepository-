/**
 * Message_Queue_Library_2.0.js
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/record'],
    function (record) {
        function QueueNewMessage(queueName, messageContent) {
            try {
                if (queueName && messageContent) {
                    var newRecord = record.create({ type: 'customrecordr7messagequeue' });
                    newRecord.setValue({ fieldId: 'custrecordr7mq_name', value: queueName });
                    newRecord.setValue({ fieldId: 'custrecordr7mq_messagecontent', value: JSON.stringify(messageContent) });
                    newRecord.setValue({ fieldId: 'custrecordr7mq_status', value: 1 });
                    var newRecordId = newRecord.save();
                    return {
                        success: true,
                        response: newRecordId
                    }
                }
                else {
                    return {
                        success: false,
                        response: null
                    }
                }
            }
            catch (e) {
                return {
                    success: false,
                    response: e
                }
            }
        }

        return {
            QueueNewMessage: QueueNewMessage
        }
    });