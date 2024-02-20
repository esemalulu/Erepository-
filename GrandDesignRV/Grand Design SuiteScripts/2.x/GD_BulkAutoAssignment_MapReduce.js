/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/query', 'N/record', 'N/redirect', 'N/runtime', './GD_Common'],
    /**
 * @param{query} query
 * @param{record} record
 * @param{redirect} redirect
 * @param{runtime} runtime
 * @param{GD_Common} GD_Common
 */
    (query, record, redirect, runtime, GD_Common) => {

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

        const getInputData = (inputContext) => {
            const PROCRECID = runtime.getCurrentScript().getParameter({name: 'custscriptgd_baa_procrecid'});
            let fields = [
                "custrecordgd_baaprocessor_recordtype",
                "TO_CHAR(custrecordgd_baaprocessor_startdate, 'MM/DD/YYYY HH:MM:SS AM') AS datetime",
                "custrecordgd_baaprocessor_employees",
                "custrecordgd_baaprocessor_quantity",
                "custrecordgd_baaprocessor_claimstatuses",
                "custrecordgd_baaprocessor_preauthstatus",
                "custrecordgd_baaprocessor_reverse",
                "custrecordgd_baaprocessor_records",
                "custrecordgd_baaprocessor_startingindex"
            ];
            let procRecFields = GD_Common.queryLookupFields('customrecordgd_bulkautoassignmentprocrec', PROCRECID, fields);

            if (procRecFields.custrecordgd_baaprocessor_reverse == 'T'){
                return JSON.parse(procRecFields.custrecordgd_baaprocessor_records);
            }

            // Randomly Pick Starting Employee
         let employeeIds = '(' + procRecFields['custrecordgd_baaprocessor_employees'] + ')';
         var employeeQueryString = 'select id,entityid from employee WHERE id in ' + employeeIds + ' ORDER BY entityid';
         var employees = query.runSuiteQL({
             query: employeeQueryString
         }).asMappedResults();
         let employeeIndex = procRecFields.custrecordgd_baaprocessor_startingindex;

            // Get Query Parameters
            let recordType = procRecFields['custrecordgd_baaprocessor_recordtype'];
            let dateTime = procRecFields['datetime'];
            let quantityToAssign = procRecFields['custrecordgd_baaprocessor_quantity'];
            let statuses = [];
            let assignedFieldId = '';
            let assignedDateFieldId = '';
            let statusFieldId = '';
            if (recordType == 'customrecordrvsclaim') {
                assignedFieldId = 'custrecordgd_claim_assignedto';
                assignedDateFieldId = 'custrecordgd_claim_assigneddate';
                statusFieldId = 'custrecordclaim_status';
                statuses = procRecFields['custrecordgd_baaprocessor_claimstatuses'].split(', ');
            } else if (recordType == 'customrecordrvspreauthorization') {
                assignedFieldId = 'custrecordgd_preauth_assignedto';
                assignedDateFieldId = 'custrecordgd_preauth_assigneddate';
                statusFieldId = 'custrecordpreauth_status';
                statuses = procRecFields['custrecordgd_baaprocessor_preauthstatus'].split(', ');
            }
            log.debug('recordType',recordType);
            log.debug('assignedDate',assignedDateFieldId);
            log.debug('statuses',statuses);
            log.debug('fieldId',assignedFieldId);
            // Create Query Object
            let recordQuery = query.create({
                type: recordType
            });

            // Conditions
            let conditionOne = recordQuery.createCondition({
                fieldId: assignedFieldId,
                operator: query.Operator.EMPTY
            });

            let conditionTwo = recordQuery.createCondition({
                fieldId: 'created',
                operator: query.Operator.ON_OR_BEFORE,
                values: dateTime
            });
            log.debug('condition2',conditionTwo);

            let conditionThree = recordQuery.createCondition({
                fieldId: statusFieldId,
                operator: query.Operator.ANY_OF,
                values: statuses
            });

            recordQuery.condition = recordQuery.and(conditionOne, conditionTwo, conditionThree);

            recordQuery.columns = [
                recordQuery.createColumn({fieldId: "id"}),
                recordQuery.createColumn({fieldId: "created"}),
                recordQuery.createColumn({fieldId:'name'})
            ];

            // Sort By Submit Date Field to start with the oldest record.
            recordQuery.sort = [
                recordQuery.createSort({
                    column: recordQuery.columns[1]
                })
            ];

            let results = recordQuery.runPaged({pageSize: 1000});
            log.debug('results',results);
            let selectedRecordIds = [];
            try {
                results.iterator().each(function (pagedData) {
                    let page = pagedData.value;
                    page.data.asMappedResults().forEach(function (result) {
                        let resultObj = {
                            'recordId': result.id,
                            'employeeId': employees[employeeIndex],
                            'recordType': recordType,
                            'assignedFieldId': assignedFieldId,
                            'assignedDateFieldId': assignedDateFieldId,
                            'createdDate':result.created,
                            'name':result.name
                        };
                        log.debug('resultObj',resultObj);
                        selectedRecordIds.push(resultObj);
                        if (employeeIndex + 1 >= employees.length) {
                            employeeIndex = 0;
                        } else {
                            employeeIndex++;
                        }
                        if (selectedRecordIds.length >= quantityToAssign) {
                            throw('Quantity Reached');
                        }
                    });
                });
            } catch (err) {
                if (err != 'Quantity Reached') {
                    log.error('Error in Query', err);
                }
            }
            record.submitFields({
                type:'customrecordgd_bulkautoassignmentprocrec', 
                id:PROCRECID,
                values:{
                    'custrecordgd_baaprocessor_records':JSON.stringify(selectedRecordIds)
                }
            });
            return selectedRecordIds;
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

        const map = (mapContext) => {
            try{
                const PROCRECID = runtime.getCurrentScript().getParameter({name: 'custscriptgd_baa_procrecid'});
                
                let fields = [
                    "custrecordgd_baaprocessor_reverse"
                ];
   
                let procRecFields = GD_Common.queryLookupFields('customrecordgd_bulkautoassignmentprocrec', PROCRECID, fields);
   
                let data = JSON.parse(mapContext.value);
                let recordId = data.recordId;
                let employeeId = data.employeeId.id;
                let recordType = data.recordType;
                let assignedFieldId = data.assignedFieldId;
                let assignedDateFieldId = data.assignedDateFieldId;
                let values = {};
   
                if (procRecFields.custrecordgd_baaprocessor_reverse == 'T'){
                    values[assignedFieldId] = null;
                    values[assignedDateFieldId] = null;
                } else {
                    values[assignedFieldId] = employeeId;
                    values[assignedDateFieldId] = new Date();
                }
   
                record.submitFields({
                    type: recordType,
                    id: recordId,
                    values: values,
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    }
                });
            } catch(err){
                log.error('error in map',err);
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

        }

        return {getInputData, map/*, reduce, summarize*/}

    });
