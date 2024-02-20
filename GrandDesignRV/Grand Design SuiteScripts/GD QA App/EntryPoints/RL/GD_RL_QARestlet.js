/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', '../../lib/GD_LIB_QAData', 'N/runtime'],
    /**
     * @param{record} record
     * @param{search} search
     * @param {QAData} QAData
     * @param {runtime} runtime
     */
    (record, search, QAData, runtime) => {
        
        let qaData = new QAData();
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {
            let results = [];
            qaData.useCache = runtime.getCurrentScript().getParameter('custscript_gd_use_cache');
            try {
                results = executeGetMethod(requestParams);
            } catch (e) {
                log.error('Error in doGet', e);
            }
            return results;
        }
        const executeGetMethod = (datain) => {
            log.debug({title: 'executeGetMethod datain', details: datain});

            let results = [];

            const methodRouter = {
                'getTestTypes': qaData.getTestTypes,
                'getLocations': qaData.getLocations,
                'getUnits': qaData.getUnits,
                'getTest': qaData.getTest,
                'getCompletedTests': qaData.getCompletedTests,
            };

            if (datain.method)
                results = methodRouter[datain.method](datain);

            return results;
        }
        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const put = (requestBody) => {

        }

        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const post = (requestBody) => {
            let results = [];
            log.debug('POST DATA', requestBody);
            const methodRouter = {
                'saveTest': qaData.saveTest,
                'setFileOnTestLine': qaData.setFileOnTestLine,
            };

            if (typeof methodRouter[requestBody.method] !== 'function') {
                log.debug({title: 'QAApp POST', details: 'PostData: Bad method specified: ' + requestBody.method});
                return;
            }

            results = methodRouter[requestBody.method](requestBody);
            return results;
        }

        /**
         * Defines the function that is executed when a DELETE request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const doDelete = (requestParams) => {
            let results = [];
            log.debug('DELETE DATA', requestParams);
            const methodRouter = {
                'deleteFile': qaData.deleteFile,
            };

            if (typeof methodRouter[requestParams.method] !== 'function') {
                log.debug({title: 'QAApp DELETE', details: 'DeleteData: Bad method specified: ' + requestParams.method});
                return;
            }

            results = methodRouter[requestParams.method](requestParams);
            return results;
        }

        return {get, put, post, delete: doDelete}

    });
