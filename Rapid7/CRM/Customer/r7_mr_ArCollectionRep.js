/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/runtime'],

    (search, record, runtime) => {
        const paramNames = {
            refreshAll: 'custscript_r7_ar_cust_collection_refresh',
            savedSearchId: 'custscript_r7_ar_collect_rep_search'
        }

        /**
         * Gets all [customer|parnter] record where AR Collection Rep is not set.
         * If the Refresh All deployment parameter is checked, then regardless of the AR Collection Rep value, this script will
         * try to set it again. Useful when changing the AR Collection Rep for a country.
         * The logic for which AR Collection Rep is assigned to which country is within the saved searches.
         */

        const getInputData = (inputContext) => {
            const savedSearchId = runtime.getCurrentScript().getParameter({name: paramNames.savedSearchId});
            let arRepSearch =  search.load({
                id: savedSearchId
            });
            setFilters(arRepSearch.filters);
            return arRepSearch;
        }

        /**
         * If refresh all is checked, run for all [customer|partner] records, otherwise only for
         * records where AR Collection Rep is null.
         */
        const setFilters = (filters) => {
            if(refreshAllParameterChecked()){
                if(runtime.getCurrentScript().deploymentId != 'customdeploy_r7_set_cust_ar_rep_all'){
                    setRefreshAllBackToUnchecked();
                }
            } else {
                filters.push(
                    search.createFilter({
                        name: 'custentityr7arcollectionrep',
                        operator: search.Operator.ANYOF,
                        values: '@NONE@'
                    })
                );
            }
        }

        const refreshAllParameterChecked = () => {
            const refreshAll = runtime.getCurrentScript().getParameter({name: paramNames.refreshAll});
            log.debug({name: 'refreshAll', details: refreshAll});
            return refreshAll;
        }

        const setRefreshAllBackToUnchecked = () => {
            let deploymentId = search.create({
                type: search.Type.SCRIPT_DEPLOYMENT,
                filters: ['scriptid', search.Operator.IS, runtime.getCurrentScript().deploymentId]
            }).run().getRange({ start: 0, end: 1 })[0].id;

            const id = record.submitFields({
                type: record.Type.SCRIPT_DEPLOYMENT,
                id: deploymentId,
                values: {
                    [paramNames.refreshAll]: false
                },
                enableSourcing: false
            });
        }

        /**
         * Set the AR Collection Rep to the value returned in the getInputData saved search.
         */
        const map = (mapContext) => {
            const configObj = setConfigObj(mapContext);
            if(configObj.hasOwnProperty('arCollectionRep')) {
                const id = record.submitFields({
                    type: configObj.type,
                    id: configObj.id,
                    values: {
                        'custentityr7arcollectionrep': configObj.arCollectionRep
                    },
                    enableSourcing: false
                });
            }

            //Useful in the summarize function for logging. By default logging is on Audit.
            mapContext.write({
                key: id,
                value: configObj
            });
        }

        const setConfigObj = mapContext => {
            const mapContextValue = JSON.parse(mapContext.value);
            log.debug('mapContextValue',JSON.stringify(mapContextValue))
            const [arCollectionRep] = Object.keys(mapContextValue.values);
            return {
                type: mapContextValue.recordType,
                id: mapContextValue.id,
                arCollectionRep: mapContextValue.recordType ==='partner' ? mapContextValue.values[arCollectionRep] : getArRep(mapContextValue.values['custentityr7managerlevelteam'])
            }
        };


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         */
        const summarize = summaryContext => {
            let totalRecordsUpdated = 0;
            summaryContext.output.iterator().each((key, value) => {
                log.debug({
                    title: key + ' ',
                    details: value
                });
                totalRecordsUpdated += 1;
                return true;
            });

            log.audit({
                title: 'Total records updated',
                details: totalRecordsUpdated
            });
        }
        function getArRep(customerDivision){
            var arRep;
            if(customerDivision.value){
                var customrecord_ar_collection_rep_mappingSearchObj = search.create({
                    type: "customrecord_ar_collection_rep_mapping",
                    filters:
                        [
                            ["isinactive","is","F"]
                        ],
                    columns:
                        [
                            "custrecord_ar_collection_rep_assignee",
                            "custrecord_ar_collection_par_or_cust",
                            "custrecord_ar_collection_sales_divs"
                        ]
                });
                customrecord_ar_collection_rep_mappingSearchObj.run().each(function(result){
                    var salesDivisions = result.getValue({name: 'custrecord_ar_collection_sales_divs'});
                    if(salesDivisions.indexOf(customerDivision.value) !== -1){
                        arRep = result.getValue({name: 'custrecord_ar_collection_rep_assignee'});
                    }
                    return true;
                });
                return arRep;
            }
        }

        return {getInputData, map, summarize}

    });