/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/email', 'N/file', 'N/record', 'N/runtime', 'N/search', 
    'SuiteScripts/Lib/veic_master_lib.js',
    'SuiteScripts/Lib/Overtime_Laws/overtime_laws_main_function.js',
    'SuiteScripts/Lib/Overtime_Laws/overtime_laws_extra_functions.js'
    ],
    /**
 * @param{email} email
 * @param{file} file
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */
    (email, file, record, runtime, search, lib, libotl, libotlef) => {

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
            let recordSearch = search.create({
                type: "timebill",
                filters:
                    [
                        ["charge.id","isempty",""],
                        "AND",
                        ["approvalstatus","anyof","3"],
                        "AND",
                        ["type","anyof","A"],
                        "AND",
                        ["posted","is","F"],
                        "AND",
                        ["employee.custentity_cp_employee_contract_type","noneof","@NONE@"],
                        "AND",
                        ["employee.custentity_cp_job_cost_type","noneof","@NONE@"],
                        "AND",
                        ["customer","anyof","26971"]

                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", summary: "MAX", label: "Internal ID"}),
                        search.createColumn({name: "timesheet", summary: "MAX", label: "TimeSheet"}),
                        search.createColumn({name: "employee", summary: "GROUP", label: "Employee"}),
                        search.createColumn({name: "durationdecimal", summary: "SUM", label: "Duration (Decimal)"}),
                        search.createColumn({name: "approvalstatus", summary: "GROUP", label: "Approval Status"}),
                        search.createColumn({name: "laborcost", summary: "MAX", label: "Labor Cost"}),
                        search.createColumn({name: "laborcost", join: "employee", summary: "MAX", label: "Labor Cost"}),
                        search.createColumn({name: "custentity_cp_provisional_rate", join: "employee", summary: "MAX", label: "Provisional Rate"}),
                        search.createColumn({name: "custentity_cp_ftehours", join: "employee", summary: "MAX", label: "FTE Hours"}),
                        search.createColumn({name: "cseg_veic_emp_loc", join: "employee", summary: "MAX", label: "Work Location"}),
                        search.createColumn({name: "payfrequency", join: "employee", summary: "GROUP", label: "Pay Frequency"}),
                        search.createColumn({name: "custentity_cp_job_cost_type", join: "employee", summary: "GROUP", label: "Job Cost Type"}),
                        search.createColumn({name: "custentity_cp_ftesalary", join: "employee", summary: "MAX", label: "FTE Salary"}),
                        search.createColumn({name: "custentity_cp_employee_contract_type", join: "employee", summary: "GROUP", label: "Employee Contract Type"})
                    ]
            });
            let tbData = [];
            let tbResults = recordSearch.run().getRange({ start: 0, end: 1000 });

            for (let i = 0; i < tbResults.length; i++) {
                tbData.push({
                    "internalid": tbResults[i].getValue({name: "internalid", summary: "MAX", label: "Internal ID"}),
                    "timeSheetId": tbResults[i].getValue({name: "timesheet", summary: "MAX", label: "TimeSheet"}),
                    "employeeId": tbResults[i].getValue({name: "employee", summary: "GROUP", label: "Employee"}),
                    "employee": tbResults[i].getText({name: "employee", summary: "GROUP", label: "Employee"}),
                    "durationdecimal": tbResults[i].getValue({name: "durationdecimal", summary: "SUM", label: "Duration (Decimal)"}),
                    "approvalstatus": tbResults[i].getValue({name: "approvalstatus", summary: "GROUP", label: "Approval Status"}),
                    "laborcost": tbResults[i].getValue({name: "laborcost", summary: "MAX", label: "Labor Cost"}),
                    "laborcostE": tbResults[i].getValue({name: "laborcost", join: "employee", summary: "MAX", label: "Labor Cost"}),
                    "custentity_cp_provisional_rate": tbResults[i].getValue({name: "custentity_cp_provisional_rate", join: "employee", summary: "MAX", label: "Provisional Rate"}),
                    "custentity_cp_ftehours": tbResults[i].getValue({name: "custentity_cp_ftehours", join: "employee", summary: "MAX", label: "FTE Hours"}),
                    "cseg_veic_emp_loc": tbResults[i].getValue({name: "cseg_veic_emp_loc", join: "employee", summary: "MAX", label: "Work Location"}),
                    "payfrequency": tbResults[i].getValue({name: "payfrequency", join: "employee", summary: "GROUP", label: "Pay Frequency"}),
                    "custentity_cp_job_cost_type": tbResults[i].getValue({name: "custentity_cp_job_cost_type", join: "employee", summary: "GROUP", label: "Job Cost Type"}),
                    "custentity_cp_ftesalary": tbResults[i].getValue({name: "custentity_cp_ftesalary", join: "employee", summary: "MAX", label: "FTE Salary"}),
                    "custentity_cp_employee_contract_type": tbResults[i].getValue({name: "custentity_cp_employee_contract_type", join: "employee", summary: "GROUP", label: "Employee Contract Type"})
                });
            }

            return tbData;
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
                let data = {
                    internalid: JSON.parse(mapContext.value).internalid,
                    timeSheetId: JSON.parse(mapContext.value).timeSheetId,
                    employeeId: JSON.parse(mapContext.value).employeeId,
                    employee: JSON.parse(mapContext.value).employee,
                    durationdecimal: JSON.parse(mapContext.value).durationdecimal,
                    approvalstatus: JSON.parse(mapContext.value).approvalstatus, 
                    laborcost: JSON.parse(mapContext.value).laborcost, 
                    laborcostE: JSON.parse(mapContext.value).laborcostE,
                    custentity_cp_provisional_rate: JSON.parse(mapContext.value).custentity_cp_provisional_rate,
                    custentity_cp_ftehours: JSON.parse(mapContext.value).custentity_cp_ftehours,
                    cseg_veic_emp_loc: JSON.parse(mapContext.value).cseg_veic_emp_loc,
                    payfrequency: JSON.parse(mapContext.value).payfrequency,
                    custentity_cp_job_cost_type: JSON.parse(mapContext.value).custentity_cp_job_cost_type,
                    custentity_cp_ftesalary: JSON.parse(mapContext.value).custentity_cp_ftesalary,
                    custentity_cp_employee_contract_type: JSON.parse(mapContext.value).custentity_cp_employee_contract_type,
                };

                mapContext.write({
                    key: JSON.parse(mapContext.value).internalid,
                    value: JSON.stringify(data)
                });

            } catch (e) {
                log.error("error Message in Map Stage: " + e.message);
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
                let contextValues = reduceContext.values.map(JSON.parse);
                let resultTB;
                let contextData = contextValues.map(function(data) {
                    resultTB = {
                        internalid:data['internalid'],
                        timeSheetId: data['timeSheetId'],
                        employeeId: data['employeeId'],
                        employee: data['employee'],
                        durationdecimal:data['durationdecimal'],
                        approvalstatus:data['approvalstatus'],
                        laborcost:data['laborcost'],
                        laborcostE:data['laborcostE'],
                        custentity_cp_provisional_rate: data['custentity_cp_provisional_rate'],
                        custentity_cp_ftehours:data['custentity_cp_ftehours'],
                        cseg_veic_emp_loc:data['cseg_veic_emp_loc'],
                        payfrequency:data['payfrequency'],
                        custentity_cp_job_cost_type: data['custentity_cp_job_cost_type'],
                        custentity_cp_ftesalary:data['custentity_cp_ftesalary'],
                        custentity_cp_employee_contract_type:data['custentity_cp_employee_contract_type'],
                        
                    };
                });

                // let internalid = resultTB.internalid;
                // let employee = resultTB.employee;
                // let employeeId = resultTB.employeeId;
                // let durationdecimal = resultTB.durationdecimal;
                // let approvalstatus = resultTB.approvalstatus;
                // let laborcost = resultTB.laborcost;
                // let laborcostE = resultTB.laborcostE;
                // let custentity_cp_provisional_rate = resultTB.custentity_cp_provisional_rate;
                // let custentity_cp_ftehours = resultTB.custentity_cp_ftehours;
                // let cseg_veic_emp_loc = resultTB.cseg_veic_emp_loc;
                // let payfrequency = resultTB.payfrequency;
                // let custentity_cp_job_cost_type = resultTB.custentity_cp_job_cost_type;
                // let custentity_cp_ftesalary = resultTB.custentity_cp_ftesalary;
                // let custentity_cp_employee_contract_type = resultTB.custentity_cp_employee_contract_type;


                let timeId = resultTB.internalid;
                let timeSheetId = resultTB.timeSheetId;
                let employee = resultTB.employee;
                let employeeId = resultTB.employeeId;
                let laborCost = parseFloat(resultTB.laborcost);
                let employeeLaborCost = parseFloat(resultTB.laborcostE);
                let employeeProvisionalRate = parseFloat(resultTB.custentity_cp_provisional_rate);
                let fteHours = parseFloat(resultTB.custentity_cp_ftehours);
                let fteSalary = parseFloat(resultTB.custentity_cp_ftesalary);
                let workLocation = resultTB.cseg_veic_emp_loc;
                let jobCostType = resultTB.custentity_cp_job_cost_type;
                let employeeContractType = resultTB.custentity_cp_employee_contract_type;

                if(lib.isNotEmpty(workLocation)){
                    workLocation = libotlef.getLocationId( workLocation ) ;
                }
                if(lib.isNotEmpty(employeeId) ){
                    let hours = libotlef.calculateProjectDurationSumByEmployeeAndProject( employee, employeeId, employeeContractType, jobCostType);
                    let dailyHours = libotlef.calculateDailyProjectDurationSumByEmployeeAndProject( employee, employeeId, employeeContractType, jobCostType);
                    let dailyHoursValues = libotlef.calculateDailyProjectDurationSumByEmployeeAndProjectValues(employeeId, employeeContractType, jobCostType)

                    if(lib.isNotEmpty(hours)){
                        let costRateControlObject = libotlef.getDatesFromAdjustedSalariedCostRateControl( employeeContractType, jobCostType);
                        let fromDate = costRateControlObject.fromDate;
                        let toDate = costRateControlObject.toDate;


                        let adjustedParam = {timeId,timeSheetId,employeeId,fromDate,toDate,employee,laborCost,employeeLaborCost,employeeProvisionalRate,fteHours,workLocation,jobCostType,fteSalary,employeeContractType,hours,dailyHours,dailyHoursValues}
                        
                        let adjustedLabourCostRate = libotl.calculateAdjustedRate(adjustedParam);
                        //log.debug('adjustedResultArray',adjustedResultArray)
                        //let adjustedLabourCostRate = adjustedResultArray.adjustedLabourCostRate

                        if(lib.isNotEmpty(adjustedLabourCostRate)){
                            //Save Time Entry Record to reflect the new adjusted salary/hour
                            libotlef.updateTimesheet(employee, employeeId, employeeContractType, jobCostType, adjustedLabourCostRate)
                        }
                    }
                }else{
                    log.error('REDUCE STATUS','Employee Name:'+employee+' must be provided')
                }

            } catch (e) {
                log.error("Error Message in Reduce Stage", e.message);
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


        return {getInputData, map, reduce, summarize}

    });