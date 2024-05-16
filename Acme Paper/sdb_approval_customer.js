/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(["N/log", "N/url", "N/https"], function (log, url, https) {

    function saveRecord(context) {
        try {
            var currentRecord = context.currentRecord;
            if (!currentRecord) return true;
            alert("Your role does not have permission to perform this action");
            log.debug("Status", "Pass");
            try {
                //sendEmail();
            } catch (error) {
                log.error("ERROR sending email", error);
            }
            return false;

        } catch (error) {
            log.error(error);
            return true;
        }

    }

    function sendEmail() {
        var suiteletURL = url.resolveScript({
            scriptId: 'customscript_sdb_send_emai_buyer',
            deploymentId: 'customdeploy_sdb_send_emai_buyer',
        });
        https.get({ url: suiteletURL });
    }

    return {
        saveRecord: saveRecord
    }
});
