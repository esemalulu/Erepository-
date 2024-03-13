var MQLib = (function () {
    var mq = {
        QueueNewMessage: function (queueName, messageContent) {
            try {
                if (queueName && messageContent) {
                    var newRecord = nlapiCreateRecord('customrecordr7messagequeue');
                    newRecord.setFieldValue('custrecordr7mq_name', queueName);
                    newRecord.setFieldValue('custrecordr7mq_messagecontent', JSON.stringify(messageContent));
                    newRecord.setFieldValue('custrecordr7mq_status', 1);
                    var newRecordId = nlapiSubmitRecord(newRecord);
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
    }

    return mq;
})();