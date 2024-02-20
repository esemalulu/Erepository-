/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/query', 'N/record'],
    /**
 * @param{log} log
 * @param{query} query
 * @param{record} record
 */
    (log, query, record) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */
        //Get the internal IDs of units that had an online date between 5/24/22 and 8/4/22 since only units created in that time frame may have an issue with appliance entries
        //these unitIds will be checked in the map to determine if the unit was impacted by the duplication of appliances issue
        const getInputData = (inputContext) => {
            try {
                let getInputData_SuiteQL = `SELECT CUSTOMRECORDRVSUNIT.id as unit_id FROM CUSTOMRECORDRVSUNIT WHERE CUSTOMRECORDRVSUNIT.custrecordunit_onlinedate >= '05/24/2022' AND CUSTOMRECORDRVSUNIT.custrecordunit_onlinedate <= '08/04/2022'`;
                
                let data = [];
                var getInputData_SuiteQLResult = [];
                getInputData_SuiteQLResult = query.runSuiteQLPaged({
                    query: getInputData_SuiteQL,
                    pageSize: 1000
                }).iterator();
                // Fetch results using an iterator
                if (getInputData_SuiteQLResult != []) {
                    getInputData_SuiteQLResult.each(function (pagedData) {
                        data = data.concat(pagedData.value.data.asMappedResults());
                        return true;
                    });
                }
                return data;
            } catch (e) {
                log.error('error: ', e);
            }
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */
        //For each unit ID found in input section check percent of unit appliances with a null category.  This happened when the users entered appliances with just a serial.  If >=.40 and <=.95 of this unit's 
        //appliance entries don't have a category flag this unit to have the appliance entries matched and merged into one entry in the reduce function
        const map = (mapContext) => {
            try {
                let pagedData = JSON.parse(mapContext.value);

                let map_SuiteQL = `SELECT SUM(CASE WHEN CUSTOMRECORDRVSUNITAPPLIANCES.custrecordgd_unitappliances_category is null THEN 1 ELSE 0 END) AS null_categ, COUNT(CUSTOMRECORDRVSUNITAPPLIANCES.id) AS total_categ FROM CUSTOMRECORDRVSUNITAPPLIANCES WHERE CUSTOMRECORDRVSUNITAPPLIANCES.custrecordunitappliances_unit = ${pagedData.unit_id}`

                var map_SuiteQLResults = [];
                map_SuiteQLResults = query.runSuiteQL({
                    query: map_SuiteQL,
                }).asMappedResults();

                if( ((map_SuiteQLResults[0].null_categ / map_SuiteQLResults[0].total_categ).toFixed(2) >= 0.40) && ((map_SuiteQLResults[0].null_categ / map_SuiteQLResults[0].total_categ).toFixed(2) <= 0.90) ){

                    //if 40-90% of all unit appliances don't have a category we need to match/merge the unit appliances in the reduce section so return the unit id.
                    mapContext.write({
                        key: pagedData.unit_id,
                        value: {affectedUnit: 'T', unitId: pagedData.unit_id},
                    });
                }
                return pagedData;
            } catch (err) {
                log.error('error: ', err);
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            try{
                var pagedData = JSON.parse(reduceContext.values);
                log.debug('Reduce data: ', pagedData);

                //All units that make it to the reduce stage should be affected units, but double check that we don't have a unit here 
                //that doesn't need fixed.
                if(pagedData.affectedUnit == 'T'){
                    //this unit was affected so we should find which unit appliances have 2 entries
                    var unitAppliances = GetAffectedAppliances(pagedData.unitId);
                    if(unitAppliances != null && unitAppliances != ''){
                        for(i=0; i<unitAppliances.length; i++){
                            MergeUnitAppliances(unitAppliances[i].unit, unitAppliances[i].internalid);
                        }
                    }
                }
            }
            catch(err){
                log.error('Error: ', err);
            }
        }


        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            // Log details about script execution
            log.audit('Usage units consumed', summaryContext.usage);
            log.audit('Concurrency', summaryContext.concurrency);
            log.audit('Number of yields', summaryContext.yields);
        }

        //***************************************Start of Helper Functions************************************************************/

        //Helper function to find unitAppliance categories where we have exactly 2 entries and returs the unitApplianceType ids
        const GetAffectedAppliances = (unitId) => {
            var appliancesSQL = `SELECT COUNT(custrecordunitappliances_type) as counttype, 
            BUILTIN.DF(custrecordunitappliances_type) as Appl_type , 
            custrecordunitappliances_unit as unit,
            CUSTOMRECORDRVSAPPLIANCETYPE.ID as internalid
        FROM CUSTOMRECORDRVSUNITAPPLIANCES, CUSTOMRECORDRVSAPPLIANCETYPE
        WHERE custrecordunitappliances_unit = ${unitId} and CUSTOMRECORDRVSUNITAPPLIANCES.custrecordunitappliances_type = CUSTOMRECORDRVSAPPLIANCETYPE.ID(+) and CUSTOMRECORDRVSUNITAPPLIANCES.isinactive = 'F'
            GROUP BY BUILTIN.DF(custrecordunitappliances_type), custrecordunitappliances_unit, CUSTOMRECORDRVSAPPLIANCETYPE.ID HAVING COUNT(custrecordunitappliances_type) = 2`;

            var map_SuiteQLResults = [];
            map_SuiteQLResults = query.runSuiteQL({
                query: appliancesSQL,
            }).asMappedResults();

            return map_SuiteQLResults;
        }

        //Helper function to use unit id and unit appliance type id to search for 2 entries in a unit. 
        //Load the record that has a blank serial number. Get the serial number and appliance categories from the other record (duplicated record) and update the 
        //loaded record with these values.  Save the loaded record. Inactivate the other record.
        const MergeUnitAppliances = (unitId, applianceType) => {
            var appliancesSQL = `SELECT custrecordgd_unitappliances_category,  custrecordunitappliances_desc, custrecordunitappliances_serialnumber, id
            	FROM CUSTOMRECORDRVSUNITAPPLIANCES WHERE isinactive != 'T' AND custrecordunitappliances_unit = ${unitId} AND  custrecordunitappliances_type = ${applianceType} ORDER BY created ASC`;

            var map_SuiteQLResults = [];
            map_SuiteQLResults = query.runSuiteQL({
                query: appliancesSQL,
            }).asMappedResults();

            //load the record that has a serialNumber set.  SubmitFields the category and serialNum onto the record without a serial number.  
            //then inactivate the loaded record and save. 
            if(map_SuiteQLResults[0].custrecordunitappliances_serialnumber && !map_SuiteQLResults[1].custrecordunitappliances_serialnumber){
                var updateRecord = record.load({type: 'customrecordrvsunitappliances', id: map_SuiteQLResults[0].id});
                log.debug('Update record: ', updateRecord);

                record.submitFields({
                    type: 'customrecordrvsunitappliances',
                    id: map_SuiteQLResults[1].id,
                    values: {
                        custrecordunitappliances_serialnumber : updateRecord.getValue({fieldId: 'custrecordunitappliances_serialnumber'}),
                        custrecordgd_unitappliances_category : updateRecord.getValue({fieldId: 'custrecordgd_unitappliances_category'})
                    }
                });

                //inactivate this record
                updateRecord.setValue({fieldId: 'isinactive', value: true});
                updateRecord.save();
            }
            else if(map_SuiteQLResults[1].custrecordunitappliances_serialnumber  && !map_SuiteQLResults[0].custrecordunitappliances_serialnumber){
                var updateRecord = record.load({type: 'customrecordrvsunitappliances', id: map_SuiteQLResults[1].id});
                log.debug('Update record: ', updateRecord);

                record.submitFields({
                    type: 'customrecordrvsunitappliances',
                    id: map_SuiteQLResults[0].id,
                    values: {
                        custrecordunitappliances_serialnumber : updateRecord.getValue({fieldId: 'custrecordunitappliances_serialnumber'}),
                        custrecordgd_unitappliances_category : updateRecord.getValue({fieldId: 'custrecordgd_unitappliances_category'})
                    }
                });

                //inactivate this record
                updateRecord.setValue({fieldId: 'isinactive', value: true});
                updateRecord.save();
            }
        }

        return { getInputData, map, reduce, summarize }

    });
