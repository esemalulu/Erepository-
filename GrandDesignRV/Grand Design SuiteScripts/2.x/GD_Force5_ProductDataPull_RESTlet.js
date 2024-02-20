/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/query', 'N/record', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
    /**
     * @param{log} log
     * @param{query} query
     * @param{record} record
     */
    (log, query, record, SSLib_Task) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {

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
            try {
            var isSuccess = true;
            var errorMessage = '';
                mainSuiteQL = `SELECT custrecordgd_f5_product_queue_data, id FROM customrecordgd_f5_product_queue WHERE custrecordgd_f5_product_queue_pending = 'T' AND isinactive = 'F'`;

                var data = [];
                var sentData = [];
                var rawdata = [];
                var mainSuiteQLResult = query.runSuiteQLPaged({
                    query: mainSuiteQL,
                    pageSize: 1000
                }).iterator();
                // Fetch results using an iterator
                mainSuiteQLResult.each(function (pagedData) {
                    rawdata = rawdata.concat(pagedData.value.data.asMappedResults());
                    return true;
                });
                try {
                    rawdata.forEach(custrecordgd_f5_product_queue_data => {
                        innerData = custrecordgd_f5_product_queue_data.custrecordgd_f5_product_queue_data;
                        innerDataid = custrecordgd_f5_product_queue_data.id;
                        try {
                            innerData = JSON.parse(innerData);
                        } catch (f) {
                            log.error(`JSON ERROR innerData`, innerData);
                        }
                        data = data.concat(innerData);
                        sentData = sentData.concat(innerDataid);
                        return true;
                    });
                } catch (feError) {
                    log.error(`Error`, `rawdata.forEach(custrecordgd_f5_product_queue_data`)
                }

                try {
                    let params = {};
                    params['custscriptgd_f5_apisent'] = JSON.stringify(sentData);
                    SSLib_Task.startMapReduceScript('customscriptgd_force5_productupdater_mr', 'customdeploygd_force5_pu_clearpending_mr', params, '1', '5', '60');
                } catch (e) {
                    log.error('Error starting Map/Reduce', e)
                }

            } catch (ex) {
                log.error(`ex`, ex);
                errorMessage = ex;
                isSuccess = false;
            }
            return isSuccess ? {
                status: "Success",
                data: data
            } : {
                status: "Failure:",
                error: errorMessage
            };
        };

        /**
         * Defines the function that is executed when a DELETE request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const doDelete = (requestParams) => {

        }

        return {
            //get,
            //put,
            post,
            //delete: doDelete
        }

    });