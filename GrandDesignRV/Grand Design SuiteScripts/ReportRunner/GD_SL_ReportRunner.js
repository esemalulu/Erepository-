/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/https'],
    /**
 * @param{https} https
 */
    (https) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if(scriptContext.request.method === 'GET') {
                const reportURL = 'https://3598857-sb2.app.netsuite.com/app/reporting/reportrunner.nl?cr=292&whence='
                const reportResponse = https.get({
                    url: reportURL
                });
                log.debug('ReportRunner', reportResponse);
                scriptContext.response.write(reportResponse.body);
            }
        }

        return {onRequest}

    });
