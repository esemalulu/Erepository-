/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/record', 'N/error', 'N/search', 'SuiteScripts/r7_mod/searchFormat'],
    (runtime, record, error, search, searchFormat) => {
        const getInputData = inputContext => {
            const adpSearch = runtime.getCurrentScript().getParameter({name: 'custscript_r7_adp_search'});
            return {
                type: 'search',
                id: adpSearch
            }
        };
        /**
         * Sets up a config object which gets the search values out of the mapContext. If the adp employee id is not unique
         * it will log an error message, otherwise it will update the externalid to match the adp employee id value.
         */
        const map = mapContext => {
            const configObj = setConfigObj(mapContext);
            if (adpValueIsNotUnique(configObj)) {
                createDupeEmployeeIds(configObj);
            } else {
                syncFields(configObj);
            }
            mapContext.write({
                key: configObj.id,
                value: configObj
            });
        }

        function createDupeEmployeeIds(configObj) {
            const dupeEmployees = getDupeEmployeeIds(configObj);
            if(dupeEmployees.length > 2){
                checkForDupeSubs(dupeEmployees);
            }
            setNewExternalIdValues(dupeEmployees, configObj);
        }

        const checkForDupeSubs = dupeEmployees => {
            let subs = {};
            let count = 0;
            for(employee of dupeEmployees.reverse()){
                if(count++ != dupeEmployees.length-1) {
                    let [, subId] = employee;
                    if (subs[subId] == null)
                        subs[subId] = 0;
                    else {
                        let count = subs[subId];
                        employee[1] = subId + '_' + ++count;
                        subs[subId] = count;
                    }
                }
            }
            dupeEmployees.reverse();
        }

        const setNewExternalIdValues = (dupeEmployees, configObj) => {
            let dupeStr = '_DUPE'
            for (let i = 0; i < dupeEmployees.length; i++) {
                let employeeIds = dupeEmployees[i];
                if (i == dupeEmployees.length-1) {
                    dupeStr = '';
                }
                let dupeConfigObj = Object.assign({}, configObj);
                updateConfigWithDupeIds(employeeIds, dupeConfigObj, dupeStr);
                syncFields(dupeConfigObj);

            }
        }

        const updateConfigWithDupeIds = (employeeIds, configObj, dupeStr) => {
            const [internalId, subId, adpId] = employeeIds;
            configObj.id = internalId;
            configObj.adpValue = adpId + dupeStr + subId;
        }

        const setConfigObj = mapContext => {
            const mapContextValue = JSON.parse(mapContext.value);
            //dynmaically getting the column names, so if we change the saved search columns there's no code change.
            const [adpValueColumnName, adpCountColumnName, employeeId] = Object.keys(mapContextValue.values);
            const configObj = {
                type: runtime.getCurrentScript().getParameter({name: 'custscript_r7_adp_sync_rec'}),
                syncField: runtime.getCurrentScript().getParameter({name: 'custscript_r7_adp_sync_field'}),
                id: mapContextValue.values[employeeId],
                adpValue: mapContextValue.values[adpValueColumnName],
                adpCount: mapContextValue.values[adpCountColumnName]
            }
            log.debug({title: 'adpconfig', details: JSON.stringify(configObj)});
            return configObj;
        };

        const adpValueIsNotUnique = configObj => {
            const valueIsUnique = configObj.adpCount !== '1';
            log.debug({title: 'adpValueIsNotUnique', details: valueIsUnique})
            return valueIsUnique;
        }

        const getDupeEmployeeIds = configObj => {
            let subIdsSearch = search.load({id: 'customsearch_r7_adp_sub_ids'});
            subIdsSearch.filters.push(
                search.createFilter({
                    name: 'custentityr7_adpemployeeid',
                    operator: search.Operator.EQUALTO,
                    values: configObj.adpValue
                })
            );
            const searchResults = subIdsSearch.run().getRange({start: 0, end: configObj.adpCount});
            return searchFormat.valuesOnly(searchResults);
        }

        const syncFields = configObj => {
            const id = record.submitFields({
                type: configObj.type,
                id: configObj.id,
                values: {
                    [configObj.syncField]: configObj.adpValue
                },
                options: {
                    ignoreMandatoryFields: true
                }
            });
            log.audit({
                title: 'setExternalId',
                details: 'internalid: ' + id + ' | updated ' + configObj.syncField + ': ' + configObj.adpValue
            });
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

        return {getInputData, map, summarize}

    });
