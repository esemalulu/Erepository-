/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', './GD_Constants.js'],
    /**
 * @param{query} query
 */
    (query, GD_Constants) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            // We'll grab the data for the filters that need to be sent over
            let allFilters = {};
            
            // ** LOCATIONS QUERY ** //
            let locationsQuery =   `SELECT
                                        id,
                                        name
                                    FROM
                                        location
                                    WHERE
                                        isinactive = 'F'`;
            var locationsResultSet = query.runSuiteQL({query: locationsQuery}).asMappedResults();
            allFilters['locationRecords'] = locationsResultSet;

            // ** SERIES AND MODELS QUERY ** //
            const suiteQL = `SELECT 
                                SERIES.id, 
                                SERIES.name, 
                                MODEL.id AS modelId, 
                                MODEL.itemid AS modelName
                            FROM 
                                customrecordrvsseries SERIES
                                JOIN item MODEL 
                                    ON SERIES.id = MODEL.custitemrvsmodelseries
                            WHERE 
                                SERIES.isinactive = 'F'
                                AND SERIES.custrecordgd_series_department = ${GD_Constants.GD_DEPARTMENT_MOTORHOME}
                                AND MODEL.isinactive = 'F'
                                AND MODEL.custitemrvsitemtype = ?`;

            const results = query.runSuiteQL({
                query: suiteQL,
                params: [GD_Constants.GD_ITEM_TYPE_MODEL]
            }).asMappedResults();

            let series = [];
            // Loop through the results and build the response object.
            results.forEach((result) => {
                const seriesIndex = series.findIndex((series) => series.id === result.id);

                if (seriesIndex === -1) {
                    series.push({
                        name: result.name,
                        id: result.id,
                        models: [
                            {model: result.modelname, id: result.modelid}
                        ]
                    });
                } else {
                    series[seriesIndex].models.push({
                        model: result.modelname,
                        id: result.modelid
                    });
                }
            });

            allFilters['series'] = series;

            // Return the data
            log.debug('allFilters', JSON.stringify(allFilters));
            scriptContext.response.write(JSON.stringify(allFilters));
        }

        return {onRequest}

    });
