/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/https', 'N/sftp', 'N/ui/serverWidget', 'N/runtime'],
    /**
     * @param{https} https
     * @param{sftp} sftp
     */
    (https, sftp, serverWidget, runtime) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if (scriptContext.request.method === 'GET') {
                if(scriptContext.request.parameters?.guid === 'T') {
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
                        restrictToScriptIds: ['customscript_gd_mr_upload_export_files','customscript_gd_sl_sftp_guid'],
                        restrictToDomains: 'wgogdrvns.blob.core.windows.net'
                    });
                    form.addSubmitButton({
                        label: 'Submit Button'
                    });
                    scriptContext.response.writePage(form);
                    return;
                } else {
                    let nameToken = 'custsecret_gdrv_username';
                    let passwordSecretID = 'custsecret_test_password';
                    const guid = runtime.envType === runtime.EnvType.SANDBOX ? '55d89eed22b14c6cb65a8d6cfbea17bc' : '38955cfd1d314a68aa254a7bdad0d796';
                    try {
                        const connection = sftp.createConnection({
                            username: 'wgogdrvns.gdrvnetsuite',
                            //secret: passwordSecretID, // Is 'password' in the secret for test.rebex.net
                            passwordGuid: guid,
                            url: 'wgogdrvns.blob.core.windows.net',
                            port: 22,
                            hostKeyType: 'ecdsa',
                            hostKey: 'AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBN6KpNy9XBIlV6jsqyRDSxPO2niTAEesFjIScsq8q36bZpKTXOLV4MjML0rOTD4VLm0mPGCwhY5riLZ743fowWA='
                        });
                        if (connection) {
                            log.debug('CONNECTION', connection);
                            scriptContext.response.write('CONNECTION SUCCESSFUL');
                        }
                    } catch (e) {
                        scriptContext.response.write(`CONNECTION FAILED:<br \>`);
                        scriptContext.response.write(e.message);
                        return null;
                    }
                }
            } else {
                var requset = scriptContext.request;
                var myPwdGuid = requset.parameters.password;
                log.debug("myPwdGuid", myPwdGuid);
                scriptContext.response.write(myPwdGuid);
            }
            
            
        }

        return {onRequest}

    });
