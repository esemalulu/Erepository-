define(['N/error', 'N/email', 'N/url', 'N/https', 'N/config'],
    function(error,  email, url, https, config) {


        /**
         * Check if given value is undefined, null or empty string
         *
         * @param value {any}
         *
         * @returns {Boolean}
         */
        function isNullOrEmpty(value) {
            return (value === undefined || value === null || value === '');
        }


        /**
         * Sends Error message with error information and link to ARR inbound event
         * @param ex (object)
         * @param ARRinboundEventId
         * @returns
         */
        function sendErrorEmail(ex, ARRinboundEventId) {
            log.debug('sendErrorEmail start');

            var adminUser = config.load({ type: config.Type.COMPANY_PREFERENCES, isDynamic: false })
                .getValue({ fieldId: 'custscriptr7_system_info_email_sender' });

            var toURL = url.resolveRecord({
                recordType: 'customrecord_arr_event',
                recordId: ARRinboundEventId,
            });

            email.send({
                author: adminUser,
                recipients: adminUser,
                subject: 'ARR Inbound Event Error',
                body: 'ARR Inbound event error happened for the ARR inbound event object with the id = ' + ARRinboundEventId + ' . You can find it by the following link:\n ' + toURL + '/app/common/custom/custrecordentry.nl?id=' + ARRinboundEventId + '&rectype=1337&whence=\nerror message is\n' + JSON.stringify(ex)
            })

            log.debug('sendErrorEmail end');
        }

        function throwError(error, message){
            throw error.create({
                name: error,
                message: message
            });
        }

        return {
            isNullOrEmpty:isNullOrEmpty,
            sendErrorEmail:sendErrorEmail
        }
    })
