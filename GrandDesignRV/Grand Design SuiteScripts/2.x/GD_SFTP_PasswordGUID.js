/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/log', 'N/record', 'N/ui/serverWidget'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{serverWidget} serverWidget
 */
    (log, record, serverWidget) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if (scriptContext.request.method === 'GET') {
                var form = serverWidget.createForm({
                    title: 'Guid Form'
                });
                form.addField({
                    id: 'username',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Username'
                });
                form.addCredentialField({
                    id: 'password',
                    label: 'Password',
                    restrictToScriptIds: 'customscript_gd_sch_wgo_upload',    
                    restrictToDomains: 'wgogdrvns.blob.core.windows.net'
                });
                form.addSubmitButton({
                    label: 'Submit Button'
                });
                scriptContext.response.writePage(form);
                return;
            } else {
                var requset = scriptContext.request;
                var myPwdGuid = requset.parameters.password;
                log.debug("myPwdGuid", myPwdGuid);
                scriptContext.response.write(myPwdGuid);
            }
        }

        return {onRequest}

    });
