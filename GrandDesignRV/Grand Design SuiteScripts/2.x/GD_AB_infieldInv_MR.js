/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/query', 'N/file', 'N/log', 'N/record', 'N/search', 'N/runtime', 'N/format'],
    /**
     * @param{file} file
     * @param{log} log
     * @param{record} record
     * @param{search} search
     * @param{runtime} runtime
     * @param{format} format
     */
    (query, file, log, record, search, runtime, format) => {
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
            log.debug(inputContext);
            try {
                var config_SuiteQLStatement = `Select custrecordgd_ab_infieldinv_lastproc as lastDate from customrecordgd_ab_infieldinv_config where id = 1`
                var config_ResultSet = query.runSuiteQL({
                    query: config_SuiteQLStatement
                }).asMappedResults();
                log.debug('config_ResultSet', config_ResultSet);
                const [month, day, year] = config_ResultSet[0].lastdate.split('/');
                var endDate = new Date(+year, month - 1, +day);
                var startDate = new Date(+year, month - 1, day - 1);
                log.debug(`Dates`, `start: ${startDate.toLocaleDateString()}, end: ${endDate.toLocaleDateString()}`);
                startDate = format.format({
                    value: startDate,
                    type: format.Type.DATE
                });
                endDate = format.format({
                    value: endDate,
                    type: format.Type.DATE
                });
                log.debug(`Dates`, `start: ${startDate}, end: ${endDate}`);
                // DATE OVERRIDES - These should be uncommented and changed only to override the daily script functions.
                //startDate = '1/1/2022';
                //endDate = '9/1/2022';
                mainSuiteQL = `SELECT customrecordrvsunit.custrecordunit_uvw, customrecordrvsunit.custrecordunit_hitchweight, customrecordrvsunit.custrecordunit_gvwrlbs, item.custitemrvsextlengthdecimal, item.custitemrvsmodelextheight, customrecordrvsunit.custrecordunit_freshwatercapacity, (SELECT SUM(ROUND(memdoctransactiontemplateline.custcolrvsmsrpamount)) FROM memdoctransactiontemplateline, item WHERE memdoctransactiontemplateline.transaction = customrecordrvsunit.custrecordunit_salesorder AND item.custitemrvsmsrp = 'T' AND item.id = memdoctransactiontemplateline.item) AS msrp, BUILTIN.DF(customer.entitytitle) AS dealer, CONCAT(CONCAT(CONCAT(CONCAT(CONCAT(CONCAT(CONCAT(CONCAT('{',EntityAddress.addr1), CONCAT(', ', EntityAddress.addr2)), CONCAT(', ', EntityAddress.city)), CONCAT(', ', EntityAddress.state)), CONCAT(', ', EntityAddress.country)), CONCAT(', ', EntityAddress.zip)), CONCAT(', ', EntityAddress.addrphone)), '}') AS dealerAddr, BUILTIN.DF(item.custitemrvsmodelyear) AS model_year, BUILTIN.DF(customrecordrvsunit.custrecordunit_series) AS series, BUILTIN.DF(customrecordrvsunit.custrecordunit_model) AS model, customrecordrvsunit.custrecordunit_serialnumber, customrecordrvsunit.name, customrecordrvsunit.custrecordunit_shipdate, BUILTIN.DF(customrecordrvsunit.custrecordunit_shippingstatus) AS shippingstatus, BUILTIN.DF(customrecordrvsunit.custrecordunit_typeofvehicle) AS typeofvehicle, customrecordrvsunit.custrecordunit_salesorder AS Options FROM customrecordrvsunit, item, CUSTOMER, EntityAddress WHERE customrecordrvsunit.custrecordunit_shippingstatus = '3' AND customrecordrvsunit.custrecordunit_receiveddate is not null AND(customrecordrvsunit.custrecordunit_shipdate >= '${startDate}' AND customrecordrvsunit.custrecordunit_shipdate <= '${endDate}') AND customrecordrvsunit.custrecordunit_model = item.id AND CUSTOMRECORDRVSUNIT.custrecordunit_dealer = Customer.id AND EntityAddress.nkey = customer.defaultshippingaddress AND customrecordrvsunit.isinactive = 'F'`;

                let data = [];
                var mainSuiteQLResult = query.runSuiteQLPaged({
                    query: mainSuiteQL,
                    pageSize: 1000
                }).iterator();
                // Fetch results using an iterator
                mainSuiteQLResult.each(function (pagedData) {
                    data = data.concat(pagedData.value.data.asMappedResults());
                    return true;
                });
                LogToFile('mainSuiteQLResult',JSON.stringify(data))

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

        const map = (mapContext) => {
            try {
                var optionsAry = new Array;
                var pagedData = JSON.parse(mapContext.value);
                var optionsSuiteQL = `SELECT memdoctransactiontemplateline.item AS itemId, BUILTIN.DF(memdoctransactiontemplateline.item) AS itemName, memdoctransactiontemplateline.memo AS itemDesc FROM memdoctransactiontemplateline, customrecordrvsunit WHERE memdoctransactiontemplateline.transaction = customrecordrvsunit.custrecordunit_salesorder AND memdoctransactiontemplateline.memo IS NOT null AND memdoctransactiontemplateline.transaction = ${pagedData.options}`;
                var optionsSuiteQLResults = query.runSuiteQL({
                    query: optionsSuiteQL,
                }).asMappedResults();
                for (let j = 0; j < optionsSuiteQLResults.length; j++) {
                    var currentResult = optionsSuiteQLResults[j];
                    optionsAry = optionsAry.concat(currentResult);
                }
                pagedData.options = optionsAry;
                optionsAry = [];

                try {
                    var vinSuiteQL = `SELECT id from CUSTOMRECORDGD_AB_INFIELDINV_QUEUE where custrecordgd_ab_infieldinv_queue_vin = '${pagedData.name}' and isinactive = 'F'`;
                    var vinSuiteQLResults = query.runSuiteQL({
                        query: vinSuiteQL,
                    }).asMappedResults();
                    let myQueueRecord;
                    if (vinSuiteQLResults.length > 0) {
                        log.audit(`GD AB InfieldInv. Queue Vin Found`, pagedData.name)
                        myQueueRecord = record.load({
                            type: 'CUSTOMRECORDGD_AB_INFIELDINV_QUEUE',
                            id: vinSuiteQLResults[0].id
                        });
                    } else {
                        myQueueRecord = record.create({
                            type: 'CUSTOMRECORDGD_AB_INFIELDINV_QUEUE',
                            isDynamic: true,
                        });
                        myQueueRecord.setText({ //vin
                            fieldId: 'custrecordgd_ab_infieldinv_queue_vin',
                            text: pagedData.name,
                            ignoreFieldChange: true
                        });
                    }
                    myQueueRecord.setText({ //ship date
                        fieldId: 'custrecordgd_ab_infieldinv_queue_shpdate',
                        text: pagedData.custrecordunit_shipdate,
                        ignoreFieldChange: true
                    });
                    myQueueRecord.setText({
                        fieldId: 'custrecordgd_ab_infieldinv_queue_data',
                        text: JSON.stringify(pagedData),
                        ignoreFieldChange: true
                    });
                    myQueueRecord.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });

                } catch (e) {
                    log.error('Queue Record error: ', e);
                }
            } catch (e) {
                log.error('error: ', e);
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
            log.debug('reduceContext', JSON.parse(reduceContext));
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
            // updates the Config Record
            try {
                var today = new Date();
                var todayFormatted = format.format({
                    value: today,
                    type: format.Type.DATETIMETZ
                });
                var myConfigRec = record.load({
                    type: 'customrecordgd_ab_infieldinv_config',
                    id: 1
                });
                myConfigRec.setText({
                    fieldId: 'custrecordgd_ab_infieldinv_lastproc',
                    text: todayFormatted,
                    ignoreFieldChange: true
                });
                myConfigRec.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: false
                });
            } catch (summarizeE) {
                log.error('Summarize Error: ', summarizeE);
            }
        }

        return {
            getInputData,
            map,
            reduce,
            summarize
        }

    });

    const LogToFile = (fileName, contents) => {
        try {
            var fileObj = file.create({
                name: fileName,
                fileType: file.Type.PLAINTEXT,
                contents: contents,
                encoding: file.Encoding.UTF8,
                folder: 4665305, //Log Files Sub folder in GD test
                isOnline: true
            });
            // Save the file
            fileObj.save();
            log.debug(`${fileName} File Saved`);
        } catch (fileErr) {
            log.debug(`${fileName} File error: `, fileErr);
        }
    }