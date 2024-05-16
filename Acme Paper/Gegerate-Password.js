/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

// This script creates a form with a credential field.
define(['N/ui/serverWidget', 'N/https', 'N/url'], (ui, https, url) => {
    function onRequest(context) {
        if (context.request.method === 'GET') {
            const form = ui.createForm({
                  title: 'Password Form'
            });

            const credField = form.addCredentialField({
                id: 'password',
                label: 'Password',
                restrictToDomains: ['5774630.app.netsuite.com'],
                restrictToCurrentUser: false,
                restrictToScriptIds: 'customscript_acc_mr_uofmd_integration'
            });

            credField.maxLength = 32;

            form.addSubmitButton();

            context.response.writePage({
                pageObject: form
                });
        }
        else {
            // Request to an existing Suitelet with credentials
            let passwordGuid = context.request.parameters.password;

            // Replace SCRIPTID and DEPLOYMENTID with the internal ID of the suitelet script and deployment in your account
            let baseUrl = url.resolveScript({
                scriptId: "customscript_acc_mr_uofmd_integration",
                deploymentId: "customdeploy_sdb_uofmd_connection_sl",
                returnExternalURL: true
            });
           log.debug("baseUrl: ", baseUrl)

            let authUrl = "https://5774630.app.netsuite.com" + baseUrl + '&pwd={' + passwordGuid + '}';

            let secureStringUrl = https.createSecureString({
                input: authUrl
            });

            let headers = ({
               'pwd': passwordGuid
            });

            let response = https.post({
                credentials: [passwordGuid],
                url: secureStringUrl,
                body: {authorization:' '+ passwordGuid + '', data:'anything can be here'},
                headers: headers
            });
        }
    }
    return {
        onRequest: onRequest
    };
});