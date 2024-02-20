/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['../../lib/GD_LIB_QAConstants', '../../lib/GD_LIB_QAData'],
    /**
     * @param {Constants} Constants
     * @param {QAData} QAData
     * @returns {{onRequest: onRequest}}
     */
    (Constants, QAData) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            if(scriptContext.request.method === 'GET') {
                const qaData = new QAData();
                const testTypes = qaData.getTestTypes();
                scriptContext.response.write(JSON.stringify(testTypes));
                const units = qaData.getUnits();
                if(units && units.records.length) {
                    scriptContext.response.write(`<br />----------------------------------<br />`);
                    scriptContext.response.write(JSON.stringify(units.records[0]));
                }
            }
        }

        return {onRequest}

    });
