/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/keyControl'],
    /**
 * @param{keyControl} keyControl
 */
    (keyControl) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var key = keyControl.loadKey({
                scriptId: 'custkey_ACMEKEY'
            });
            log.debug("onRequest() key is: ", key);
            log.debug("onRequest() file is: ", {
                value: key.file.getContents()
            });
        }

        return {onRequest}

    });
