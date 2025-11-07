/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/search', 'SuiteScripts/Lib/veic_master_lib.js'],
    /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (record, runtime, search, lib) => {

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
            try {
                let ttData = JSON.parse(runtime.getCurrentScript().getParameter({ name: 'custscript_ttdata' }));
                log.debug('ttData getInputData', ttData);
                log.debug('ttData[0].jeRecId', ttData[0].jeRecId);
                
                let jeRec = record.load({
                    type: record.Type.JOURNAL_ENTRY,
                    id: ttData[0].jeRecId
                });
                for (let i = 0; i < ttData.length; i++) {    
                    const ttDataF = ttData[i];

                    let internalid = ttDataF.internalid;
                    let memo = ttDataF.memo;
                    let hours = ttDataF.hours;
                    let date = ttDataF.date;

                    let formattedDate = lib.formatDate(date);
                    log.debug('formattedDate', formattedDate);
                    let stringDate = formattedDate.toString()
                    log.debug('stringDate', stringDate);
                    let dayName = getDayByFormattedDate(stringDate);
                    log.debug('dayName', dayName);
                    line = getTransactionValue(dayName, 'debit');
                    log.debug('line', line);

                    jeRec.setSublistValue({
                        sublistId:"line",
                        fieldId:"memo",
                        line:line,
                        value: memo
                    });

                    jeRec.setSublistValue({
                        sublistId:"line",
                        fieldId:"custcol_veic_je_timesheet_hrs",
                        line:line,
                        value: hours
                    });

                    jeRec.setSublistValue({
                        sublistId:"line",
                        fieldId:"custcol_veic_je_timesheet_date",
                        line:line,
                        value:new Date(date)
                    });

                    jeRec.setSublistValue({
                        sublistId:"line",
                        fieldId:"custcol_veic_time_tracking_rec",
                        line:line,
                        value: internalid
                    });
                }

                

                
                // let formattedDate = lib.formatDate(date);
                // log.debug('formattedDate', formattedDate);
                // let stringDate = formattedDate.toString()
                // log.debug('stringDate', stringDate);
                // let dayName = getDayByFormattedDate(stringDate);
                // log.debug('dayName', dayName);
                // line = getTransactionValue(dayName, 'debit');
                // log.debug('line', line);

                // updateJERec(jeRecId, memo, hours, lib.formatDate(date), internalid.toString(), line);
                return jeRec.save();
            } catch (e) {
                log.error("error Message in updateJERec function: " + e.message);
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

        const map = (mapContext) => {
            try {
            // let jeRecId = JSON.parse(mapContext.value).jeRecId;
            // let internalid = JSON.parse(mapContext.value).internalid;
            // let memo = JSON.parse(mapContext.value).memo;
            // let hours = JSON.parse(mapContext.value).hours;
            // let date = JSON.parse(mapContext.value).date;
            // let timesheet = JSON.parse(mapContext.value).timesheet;

            // log.debug('jeRecId', JSON.parse(mapContext.value).jeRecId);
            // log.debug('internalid', JSON.parse(mapContext.value).internalid);
            // log.debug('memo', JSON.parse(mapContext.value).memo);
            // log.debug('hours', JSON.parse(mapContext.value).hours);
            // log.debug('date', JSON.parse(mapContext.value).date);
            // log.debug('timesheet', JSON.parse(mapContext.value).timesheet);

                

            } catch (e) {
                log.error("Error Message in Map Stage: " + e.message);
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
            try {
     
            } catch (e) {
                log.error("error Message in Reduce Stage: " + e.message);
            }
        }

        function updateJERec(jeRecId, memo, hours, date, internalid, line){
            try {
                let jeRec = record.load({
                    type: record.Type.JOURNAL_ENTRY,
                    id: jeRecId
                });

                jeRec.setSublistValue({
                        sublistId:"line",
                        fieldId:"memo",
                        line:line,
                        value: memo
                    });

                jeRec.setSublistValue({
                    sublistId:"line",
                    fieldId:"custcol_veic_je_timesheet_hrs",
                    line:line,
                    value: hours
                });

                jeRec.setSublistValue({
                    sublistId:"line",
                    fieldId:"custcol_veic_je_timesheet_date",
                    line:line,
                    value:new Date(date)
                });

                jeRec.setSublistValue({
                    sublistId:"line",
                    fieldId:"custcol_veic_time_tracking_rec",
                    line:line,
                    value: internalid
                });

                jeRec.save();

            } catch (e) {
                log.error("error Message in updateJERec function: " + e.message);
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
            log.audit("Summary Time", "Total Seconds: " + summaryContext.seconds);
            log.audit("Summary Usage", "Total Usage: " + summaryContext.usage);
            log.audit("Summary Yields", "Total Yields: " + summaryContext.yields);
            log.audit("Input Summary: ", JSON.stringify(summaryContext.inputSummary));
            log.audit("Map Summary: ", JSON.stringify(summaryContext.mapSummary));

            //Grab Map errors
            summaryContext.mapSummary.errors.iterator().each(function(key, value) {
                log.error(key, "ERROR String: " + value);
                return true;
            });
        }


        function getDayByFormattedDate(dateString) {
            // Parse the input date in MM-DD-YYYY format
            const dateParts = dateString.split('/');
            const formattedDate = new Date(`${dateParts[2]}/${dateParts[0]}/${dateParts[1]}`); // YYYY-MM-DD format
        
            // Array of days of the week
            const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            
            // Get the day of the week index (0 - Sunday, 1 - Monday, ..., 6 - Saturday)
            const dayIndex = formattedDate.getDay();
            
            // Return the corresponding day name
            return daysOfWeek[dayIndex];
        }
    
        
        function getTransactionValue(day, transactionType) {
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            const transactionValues = {
                "Monday": { "debit": 0},
                "Tuesday": { "debit": 2},
                "Wednesday": { "debit": 4},
                "Thursday": { "debit": 6},
                "Friday": { "debit": 8},
                "Saturday": { "debit": 10},
                "Sunday": { "debit": 12}
            };
        
            // Ensure valid input
            if (!days.includes(day)) {
                return "Invalid day!";
            }
            if (transactionType !== "debit") {
                return "Invalid transaction type!";
            }
        
            // Return the corresponding value
            return transactionValues[day][transactionType];
        }

        return {getInputData, map, reduce, summarize}

    });