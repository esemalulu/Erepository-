/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime'],
    /**
     //* @param{record} record
     //* @param{search} search
     //* @param{runtime} runtime
     */
    (record, search, runtime) => {

        //Declare Contract Type Values
        const SALARIED = '1'
        const HOURLY = '2'

        //Overtime Law for Special Work Location Values
        const ALASKA = '2'
        const CALIFORNIA = '5'
        const COLORADO = '6'
        const MINNESOTA = '23'
        const NEVADA = '28'
        const OREGON = '37'

        let specialWorkLocationArray = [ALASKA,CALIFORNIA,COLORADO,MINNESOTA,NEVADA,OREGON]
        let specialWorkLocationWithDailyHoursArray = [ALASKA,CALIFORNIA,COLORADO,OREGON]

        // Set Values for Overtime law Category
        const STANDARD = '1';
        const SPECIAL = '2';

        //Declare Job Cost Type Values
        const WEEKLY = '1'
        const BIWEEKLY = '2'
        const MONTHLY = '3'

        // Declare Charge Type Value
        const EXPENSE_BASED = '-98' // Expense based
        const TIME_BASED = '-13' // Time based
        const FIXED_DATE = '-10' // Fixed date

            const getInputData = (inputContext) => {
                    // Get the project ID from the script parameter
                    //let projectId = runtime.getCurrentScript().getParameter({ name: 'custscript_projectid_param' });
                    const projectId = runtime.getCurrentScript().getParameter('custscript_cp_projectid_from_suitelet');
                    log.debug('Project ID', 'Project ID:'+projectId);

                    try{
                            log.audit({ title: 'START', details: '<--------------------------------START-------------------------------->' });

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
                                        //"AND",
                                        //["casetaskevent","noneof","@NONE@"],
                                        "AND",
                                        ["customer","anyof","93001"]
                                        // "AND",
                                        // ["employee","anyof","7"]
                                        // "AND",
                                        // ["customer","noneof","@NONE@"]

                                    ],
                                columns:
                                    [
                                        search.createColumn({name: "internalid", summary: "MAX", label: "Internal ID"}),
                                        search.createColumn({name: "employee", summary: "GROUP", label: "Employee"}),
                                        //search.createColumn({name: "customer", summary: "GROUP", label: "Client"}),
                                        search.createColumn({name: "durationdecimal", summary: "SUM", label: "Duration (Decimal)"}),
                                        search.createColumn({name: "approvalstatus", summary: "GROUP", label: "Approval Status"}),
                                        //search.createColumn({name: "casetaskevent", summary: "GROUP", label: "Case/Task/Event"}),
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

                            // Process a customer based calculation from the button action from project record;
                            if(dataValidation(projectId)){
                                let customerFilter = search.createFilter({name: 'customer',operator:'anyof',values: projectId});
                                recordSearch.filters.push(customerFilter);
                            }


                            let searchResultCount = recordSearch.runPaged().count;
                            log.debug("Time entry For Adjusted Salaried Job Cost and Overtime rate count",searchResultCount);


                            return recordSearch;

                    } catch (errorObj) {
                            if (errorObj.name === undefined){
                                    log.error({ title: `(GID) Error: Generic`, details: `Message: ${errorObj.toString()}` });
                            } else {
                                    log.error({ title: `(GID) Error: ${errorObj.name}`, details: `Message: ${errorObj.message}, Stack: ${errorObj.stack}` });
                            }
                            throw errorObj;
                    }
            }


            const map = (mapContext) => {
                    try{} catch (errorObj) {
                            if (errorObj.name === undefined){
                                    log.error({ title: `(GID) Error: Generic`, details: `Message: ${errorObj.toString()}` });
                            } else {
                                    log.error({ title: `(GID) Error: ${errorObj.name}`, details: `Message: ${errorObj.message}, Stack: ${errorObj.stack}` });
                            }
                            throw errorObj;
                    }
            }

            const reduce = (reduceContext) => {

                    try{
                            // Process the Record result from the Saved Search loaded in getInputData stage
                            let searchResult = JSON.parse(reduceContext.values);
                            //log.debug('RAW REDUCE Data', searchResult);

                            //****************************STARTS************************************

                            let timesheetId = searchResult.values["MAX(internalid)"];
                            let employee = searchResult.values["GROUP(employee)"].text;
                            let employeeId = searchResult.values["GROUP(employee)"].value;
                            //let projectId = searchResult.values["GROUP(customer)"].value;
                            //let projectName = searchResult.values["GROUP(customer)"].text;
                            //let taskId = searchResult.values["GROUP(casetaskevent)"].value;
                            let laborCost = parseFloat( searchResult.values["MAX(laborcost)"]);
                            let employeeLaborCost = parseFloat( searchResult.values["MAX(laborcost.employee)"]);
                            let employeeProvisionalRate = parseFloat( searchResult.values["MAX(custentity_cp_provisional_rate.employee)"]);
                            let fteHours = parseFloat( searchResult.values["MAX(custentity_cp_ftehours.employee)"]);
                            let fteSalary = parseFloat( searchResult.values["MAX(custentity_cp_ftesalary.employee)"]);
                            let workLocation = searchResult.values["MAX(cseg_veic_emp_loc.employee)"];
                            //let payFrequency = searchResult.values["GROUP(payfrequency.employee)"];
                            let jobCostType = searchResult.values["GROUP(custentity_cp_job_cost_type.employee)"].value;
                            let employeeContractType = searchResult.values["GROUP(custentity_cp_employee_contract_type.employee)"].value;
                            //let hours = parseFloat( searchResult.values["SUM(durationdecimal)"]);

                            if(dataValidation(workLocation)){
                                workLocation = getLocationId( searchResult.values["MAX(cseg_veic_emp_loc.employee)"] ) ;
                            }

                            //if( dataValidation(projectId) && dataValidation(employeeId) ){
                            if( dataValidation(employeeId) ){
                                //let hours = calculateProjectDurationSumByEmployeeAndProject(projectId,employeeId);
                                let hours = calculateProjectDurationSumByEmployeeAndProject( employee, employeeId, employeeContractType, jobCostType);
                                let dailyHours = calculateDailyProjectDurationSumByEmployeeAndProject( employee, employeeId, employeeContractType, jobCostType);

                                if( dataValidation(hours)){
                                    let costRateControlObject = getDatesFromAdjustedSalariedCostRateControl( employeeContractType, jobCostType);
                                    let fromDate = costRateControlObject.fromDate;
                                    let toDate = costRateControlObject.toDate;


                                    let adjustedParam = {timesheetId,employeeId,fromDate,toDate,employee,laborCost,employeeLaborCost,employeeProvisionalRate,fteHours,workLocation,jobCostType,fteSalary,employeeContractType,hours,dailyHours}
                                    log.debug('adjustedParam',adjustedParam)




                                    let adjustedResultArray = calculateAdjustedRate( adjustedParam )
                                    //log.debug('adjustedResultArray',adjustedResultArray)
                                    let adjustedLabourCostRate = adjustedResultArray.adjustedLabourCostRate

                                    if(dataValidation(adjustedLabourCostRate)){
                                        //Save Time Entry Record to reflect the new adjusted salary/hour
                                        updateTimesheet(employee, employeeId, employeeContractType, jobCostType, adjustedLabourCostRate)
                                    }


                                }
                            }else{
                                log.debug('REDUCE STATUS','Employee Name:'+employee+' must be provided')
                            }




                            //****************************ENDS************************************


                    }catch (errorObj) {
                            if (errorObj.name === undefined){
                                    log.error({ title: `(GID) Error: Generic`, details: `Message: ${errorObj.toString()}` });
                            } else {
                                    log.error({ title: `(GID) Error: ${errorObj.name}`, details: `Message: ${errorObj.message}, Stack: ${errorObj.stack}` });
                            }
                            throw errorObj;
                    }

            }

            //Data Validation
            const dataValidation = (value) => {
                    if (value != null && value != '' && value != undefined && value.toString() != 'NaN' && value != NaN && value != 'undefined' && value!= "- None -") {
                            return true;
                    } else {
                            return false;
                    }
            }

            // Calculate Total Sum By Employee and Project
            //const calculateProjectDurationSumByEmployeeAndProject = (projectId,employeeId) =>{
            const calculateProjectDurationSumByEmployeeAndProject = (employee, employeeId, employeeContractType, jobCostType) =>{
                let costRateControlObject = getDatesFromAdjustedSalariedCostRateControl( employeeContractType, jobCostType);
                let fromDate = costRateControlObject.fromDate;
                let toDate = costRateControlObject.toDate;

                let totalHours = 0;
                let durationSumObj = search.create({
                    type: "timebill",
                    filters:
                        [
                            ["charge.id","isempty",""],
                            "AND",
                            ["approvalstatus","anyof","3"],
                            // "AND",
                            // ["customer","anyof",projectId],
                            "AND",
                            ["employee","anyof",employeeId],
                            // "AND",
                            // ["casetaskevent","noneof","@NONE@"],
                            "AND",
                            ["type","anyof","A"],
                            "AND",
                            ["posted","is","F"],
                            "AND",
                            ["employee.custentity_cp_employee_contract_type","anyof",employeeContractType],
                            "AND",
                            ["employee.custentity_cp_job_cost_type","anyof",jobCostType],
                            "AND",
                            ["date","within",fromDate,toDate]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "employee",
                                summary: "GROUP",
                                label: "Employee"
                            }),
                            search.createColumn({
                                name: "durationdecimal",
                                summary: "SUM",
                                label: "Duration (Decimal)"
                            })
                        ]
                });
                durationSumObj.run().each(function(result){
                    totalHours = result.getValue({ name: 'durationdecimal', summary: 'SUM' });
                    log.debug("calculateProjectDurationSumByEmployeeAndProject STATUS",'Total Hours:'+totalHours+', fromDate:'+fromDate+', toDate:'+toDate+', employee:'+employee);
                    return true;
                });
                //log.debug("calculateProjectDurationSumByEmployeeAndProject STATUS",'Total Expense:'+totalAmount);

                return parseFloat(totalHours);
            }

            const calculateDailyProjectDurationSumByEmployeeAndProject = (employee, employeeId, employeeContractType, jobCostType) =>{
                let costRateControlObject = getDatesFromAdjustedSalariedCostRateControl( employeeContractType, jobCostType);
                let fromDate = costRateControlObject.fromDate;
                let toDate = costRateControlObject.toDate;

                let totalHours = 0;
                let dailyDurationObj = search.create({
                    type: "timebill",
                    filters:
                        [
                            ["charge.id","isempty",""],
                            "AND",
                            ["approvalstatus","anyof","3"],
                            // "AND",
                            // ["customer","anyof",projectId],
                            "AND",
                            ["employee","anyof",employeeId],
                            // "AND",
                            // ["casetaskevent","noneof","@NONE@"],
                            "AND",
                            ["type","anyof","A"],
                            "AND",
                            ["posted","is","F"],
                            "AND",
                            ["employee.custentity_cp_employee_contract_type","anyof",employeeContractType],
                            "AND",
                            ["employee.custentity_cp_job_cost_type","anyof",jobCostType],
                            "AND",
                            ["date","within",fromDate,toDate]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "employee", label: "Employee"}),
                            search.createColumn({ name: "durationdecimal", label: "Duration (Decimal)" }),
                            search.createColumn({ name: "date", label: "Date" })
                        ]
                });

                return dailyDurationObj.run().getRange({start:0,end:1000});
            }

            // Update Timesheet for Employee
            const updateTimesheet = (employee, employeeId, employeeContractType, jobCostType, adjustedLabourCostRate) =>{
                let costRateControlObject = getDatesFromAdjustedSalariedCostRateControl( employeeContractType, jobCostType);
                let fromDate = costRateControlObject.fromDate;
                let toDate = costRateControlObject.toDate;

                let timesheetObj = search.create({
                    type: "timebill",
                    filters:
                        [
                            ["charge.id","isempty",""],
                            "AND",
                            ["approvalstatus","anyof","3"],
                            "AND",
                            ["employee","anyof",employeeId],
                            "AND",
                            ["type","anyof","A"],
                            "AND",
                            ["posted","is","F"],
                            "AND",
                            ["employee.custentity_cp_employee_contract_type","anyof",employeeContractType],
                            "AND",
                            ["employee.custentity_cp_job_cost_type","anyof",jobCostType],
                            "AND",
                            ["date","within",fromDate,toDate]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal Id" }),
                            search.createColumn({ name: "casetaskevent", label: "Task Id" })
                        ]
                });
                timesheetObj.run().each(function(result){

                    //Update Task Record with the New Unit Cost
                    updateTaskUnitCost( employeeId, parseInt( result.getValue('casetaskevent') ) , adjustedLabourCostRate )

                    //Save Time Entry Record to reflect the new adjusted salary/hour
                    record.submitFields({
                        type: record.Type.TIME_BILL,
                        id: parseInt( result.getValue('internalid') ),
                        values: { memo: 'Salary/Hour adjusted', custcol_cp_labour_billing_rate:adjustedLabourCostRate },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });

                    return true;
                });
            }


            // Calculate Adjusted Salary Job Cost and Overtime rate
            const calculateAdjustedRate = ( adjustedParam ) =>{

                let FTESalary = 0;
                let actualSalary = 0;
                let jobCostVariance = 0;
                let adjustedLabourCostRate = 0;
                let dailyAdjustedLabourCostRate = 0;
                let overTime = 0
                let overtimeRateCalculation = 0;

                let FTEHours = adjustedParam.fteHours;
                let hours = adjustedParam.hours;
                let dailyHoursArray = adjustedParam.dailyHours;


                // Calculate Salaried
                if( adjustedParam.employeeContractType === SALARIED ){

                    //Adjust Entered Hours to match FTE Hours in a case where entered hours is less than FTE hours
                    // if( hours < FTEHours ){
                    //     let hoursShortage = FTEHours - hours;
                    //     hours += hoursShortage;
                    // }

                    //FTESalary = ( FTEHours * adjustedParam.fteSalary );
                    //actualSalary = ( hours * adjustedParam.fteSalary );

                    log.debug('calculateAdjustedRate Calculation', 'FTEHours:'+FTEHours+', hours:'+hours+', fteSalary from employee record:'+adjustedParam.fteSalary)

                    adjustedLabourCostRate = adjustedParam.fteSalary/hours

                    log.debug('adjustedLabourCostRate Calculation', 'adjustedLabourCostRate:'+adjustedLabourCostRate)

                    //Update Employee Record Labor Cost Value with adjustedLabourCostRate
                    if(dataValidation(adjustedLabourCostRate)){
                        updateEmployeeRecord(adjustedParam.employeeId,adjustedLabourCostRate)
                    }

                }

                // Calculate Hourly
                if( adjustedParam.employeeContractType === HOURLY ){
                    let averageCostRate = adjustedParam.employeeProvisionalRate
                    let dailyAverageCostRateSum = 0
                    FTESalary = ( adjustedParam.fteHours * adjustedParam.employeeProvisionalRate );
                    actualSalary = ( adjustedParam.hours * adjustedParam.employeeProvisionalRate );
                    //overTime = adjustedParam.hours - adjustedParam.fteHours
                    overTime = adjustedParam.hours - 40;
                    let dailyOverTime = 0,dailyDoubleTime = 0,tenDailyDoubleTime = 0;
                    let overtimeRate = 0, hourlyOvertimeRate, dailyOvertimeRate = 0,dailyOvertimeRateForCalc = 0;


                    if (specialWorkLocationWithDailyHoursArray.includes(adjustedParam.workLocation)){
                        let dailyHours = 0 ;
                        let daysTotal = dailyHoursArray.length;
                        log.audit('calculateAdjustedRate daysTotal Calculation', 'Days Total dailyHours.length:'+daysTotal);

                        // Get the first 6 days for the Sunday calculation for California
                        //const sixDaysObjectArray = JSON.parse(JSON.stringify(dailyHoursArray.slice(-1,1)));
                        log.audit('dailyHoursArray Status','dailyHoursArray:'+JSON.stringify(dailyHoursArray))
                        const sixDaysObjectArray = dailyHoursArray.slice(0,-1);
                        log.audit('sixDaysObjectArray Status','sixDaysObjectArray:'+JSON.stringify(sixDaysObjectArray))

                          //Sergio Logic Begins
                          let dateTimeSheet = dailyHoursArray.values.date;
                          log.debug('dateTimeSheet', dateTimeSheet);
                          let dayName = getDateName(dateTimeSheet);
                          log.debug('dayName', dayName);
                          //Sergio Logic Ends


                        // Get the last day hours to be used for the Sunday calculation for California
                        const lastHoursObject = JSON.parse(JSON.stringify(dailyHoursArray.slice(-1)[0]));
                        log.audit('lastHoursObject Status','lastHoursObject:'+JSON.stringify(lastHoursObject))
                        const lastDayHours = lastHoursObject.values.durationdecimal;
                        log.audit('lastDayHours Status','lastDayHours:'+lastDayHours)
                        log.audit('daysTotal',daysTotal);
                        // 7 days in a week calculation for California
                        /*if( ( adjustedParam.workLocation === CALIFORNIA && daysTotal > 5 )){

                            log.debug('Test Sergio', 'Test1');
                            sixDaysObjectArray.forEach(function(result) {
                                dailyHours = parseFloat(result.getValue({name: 'durationdecimal'}));
                                log.debug('calculateAdjustedRate dailyHours Calculation', 'dailyHours:' + dailyHours)
                                log.audit('dailyAverageCostRateSum Calculation', 'dailyAverageCostRateSum:' + dailyAverageCostRateSum)
                                // dailyOvertimeRate += dailyHour * dailyOvertimeRateForCalc;
                                dailyOvertimeRateForCalc = getOvertimeRate(adjustedParam.hours, dailyHours, SPECIAL, adjustedParam.workLocation, 'Daily')
                                log.audit('dailyOvertimeRateForCalc Calculation', 'dailyOvertimeRateForCalc:' + dailyOvertimeRateForCalc)

                                dailyOverTime = dailyHours - 8;
                                dailyDoubleTime = dailyHours - 12;

                                log.debug('Test 1, dailyHours', dailyHours);
                                if(  dailyHours <= 8 ){
                                    log.debug('Test 1', 'Test1.1');
                                    dailyAverageCostRateSum += ( dailyHours * adjustedParam.employeeProvisionalRate );
                                }
                                if(  dailyHours > 8 && dailyHours <= 12  ){
                                    log.debug('Test 1', 'Test1.2');
                                    dailyAverageCostRateSum += ( dailyOverTime * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc ) + ( 8 * adjustedParam.employeeProvisionalRate);
                                }

                                if( dailyHours > 12 ){
                                    log.debug('Test 1', 'Test1.3');
                                    dailyAverageCostRateSum += ( dailyDoubleTime * adjustedParam.employeeProvisionalRate * 2 ) + ( 12 * adjustedParam.employeeProvisionalRate);
                                }
                            });

                            if(  lastDayHours < 8  ){
                                //dailyAverageCostRateSum += ( dailyHours * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc ) + ( 8 * adjustedParam.employeeProvisionalRate);
                                dailyAverageCostRateSum += ( dailyHours * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc );
                            }

                            if( lastDayHours > 8 ){
                                let standardHours = lastDayHours - 8;
                                let standardHoursCalculation = ( 8 * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc );
                                dailyAverageCostRateSum += ( standardHours * adjustedParam.employeeProvisionalRate * 2 ) + standardHoursCalculation;
                            }*/

                        //}else{
                            log.debug('Test Sergio', 'Test2');
                            let totalTime = 0;
                            dailyHoursArray.forEach(function(result){
                                dailyHours = parseFloat(result.getValue({ name: 'durationdecimal' }));
                                //Here we are adding the hrs
                                totalTime+=dailyHours;
                                log.debug('calculateAdjustedRate dailyHours Calculation', 'dailyHours:'+dailyHours)
                                log.audit('dailyAverageCostRateSum Calculation', 'dailyAverageCostRateSum:'+dailyAverageCostRateSum)
                                // dailyOvertimeRate += dailyHour * dailyOvertimeRateForCalc;
                                dailyOvertimeRateForCalc = getOvertimeRate( adjustedParam.hours, dailyHours, SPECIAL, adjustedParam.workLocation, 'Daily')

                                dailyOverTime = dailyHours - 8;
                                dailyDoubleTime = dailyHours - 12;
                                tenDailyDoubleTime = dailyHours - 10;

                                if( ( adjustedParam.workLocation === ALASKA || adjustedParam.workLocation === NEVADA ) && dailyHours > 8 ){
                                    dailyAverageCostRateSum += ( dailyOverTime * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc ) + ( 8 * adjustedParam.employeeProvisionalRate);
                                }

                                else if( ( adjustedParam.workLocation === COLORADO ) && dailyHours > 12 ){
                                    dailyAverageCostRateSum += ( dailyDoubleTime * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc ) + ( 12 * adjustedParam.employeeProvisionalRate);
                                }

                                else if( ( adjustedParam.workLocation === OREGON ) && dailyHours > 10 ){
                                    dailyAverageCostRateSum += ( tenDailyDoubleTime * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc ) + ( 10 * adjustedParam.employeeProvisionalRate);
                                }

                                // 5 days in a week calculation for California
                                else if( adjustedParam.workLocation === CALIFORNIA ){
                                    log.debug('Test 2', 'Test2.1');
                                    log.debug('totalTime', 'totalTime:'+totalTime)
                                    //Here we are going to make sure that 
                                    if(  dailyHours <= 8 )   {
                                        log.debug('Test 2', 'Test2.2');
                                        log.debug('adjustedParam.employeeProvisionalRate', adjustedParam.employeeProvisionalRate);
                                        
                                        dailyAverageCostRateSum += ( dailyHours * adjustedParam.employeeProvisionalRate );
                                    }
                                    if(  dailyHours > 8 && dailyHours <= 12  ){
                                        log.debug('Test 2', 'Test2.3');
                                        log.debug('adjustedParam.employeeProvisionalRate', adjustedParam.employeeProvisionalRate);
                                        log.debug('dailyOvertimeRateForCalc', dailyOvertimeRateForCalc);
                                        dailyAverageCostRateSum += ( dailyOverTime * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc ) + ( 8 * adjustedParam.employeeProvisionalRate);
                                    }
                                    if( dailyHours > 12 ){
                                        log.debug('Test 2', 'Test2.4');
                                        //dailyAverageCostRateSum += ( dailyOverTime * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc ) + ( 8 * adjustedParam.employeeProvisionalRate);
                                        dailyAverageCostRateSum += ( 4 * adjustedParam.employeeProvisionalRate * dailyOvertimeRateForCalc ) + ( 8 * adjustedParam.employeeProvisionalRate);

                                        let standardHours = dailyHours - 12;
                                        let standardHoursCalculation = standardHours * 2 * adjustedParam.employeeProvisionalRate ;
                                        dailyAverageCostRateSum += standardHoursCalculation;
                                    }

                                }
                                else{
                                    dailyAverageCostRateSum += ( dailyHours * adjustedParam.employeeProvisionalRate );
                                }

                                return true;
                            });
                        //}

                        log.audit('dailyAverageCostRateSum Calculation', 'dailyAverageCostRateSum:'+dailyAverageCostRateSum);

                    }


                    if( adjustedParam.hours > 40 ){
                        // Get Overtime Rate
                        if (specialWorkLocationArray.includes(adjustedParam.workLocation)){
                            log.debug('adjustedParam.hours', 'Test1');
                            overtimeRate = getOvertimeRate( adjustedParam.hours, adjustedParam.dailyHours, SPECIAL, adjustedParam.workLocation, 'Weekly')
                        }else{
                            log.debug('adjustedParam.hours', 'Test2');
                            overtimeRate = getOvertimeRate( adjustedParam.hours, adjustedParam.dailyHours, STANDARD, adjustedParam.workLocation, 'Weekly')
                        }
                        if(adjustedParam.workLocation === MINNESOTA){
                            overTime = adjustedParam.hours - 48;
                            averageCostRate = ( overTime * adjustedParam.employeeProvisionalRate * overtimeRate ) + ( 48 * adjustedParam.employeeProvisionalRate);
                            log.debug('adjustedParam.hours', 'Test3');
                        }else{
                            log.debug('adjustedParam.hours', 'Test4');
                            averageCostRate = ( overTime * adjustedParam.employeeProvisionalRate * overtimeRate ) + ( 40 * adjustedParam.employeeProvisionalRate);
                        }

                    }else{
                        adjustedLabourCostRate = averageCostRate
                    }

                    log.audit('averageCostRate Calculation', 'averageCostRate:'+averageCostRate);
                    log.audit('dailyAverageCostRateSum Calculation', 'dailyAverageCostRateSum:'+dailyAverageCostRateSum);
                    
                    let overtimeRateMax = Math.max( dailyAverageCostRateSum,averageCostRate );
                    log.audit('overtimeRateMax Calculation', 'overtimeRateMax:'+overtimeRateMax);

                    adjustedLabourCostRate = overtimeRateMax / adjustedParam.hours

                    //overtimeRate = Math.max( dailyOvertimeRate,hourlyOvertimeRate );



                    //Update Employee Record Labor Cost Value with adjustedLabourCostRate
                    updateEmployeeRecord(adjustedParam.employeeId,adjustedLabourCostRate)

                    //Save Time Entry Record to reflect the new adjusted salary/hour
                    // record.submitFields({
                    //     type: record.Type.TIME_BILL,
                    //     id: parseInt( adjustedParam.timesheetId),
                    //     values: { memo: 'Salary/Hour adjusted' },
                    //     options: {
                    //         enableSourcing: false,
                    //         ignoreMandatoryFields: true
                    //     }
                    // });


                    // if( overTime > 0 ){
                    //     jobCostVariance = actualSalary - FTESalary
                    //
                    //     // Labor Cost x 75 x FTE Multiplier / Hours per Timesheets = Average Cost Rate
                    //
                    //     let averageCostRate = ( overTime * adjustedParam.employeeProvisionalRate * overtimeRate ) + FTESalary;
                    //     adjustedLabourCostRate = averageCostRate / adjustedParam.hours
                    //
                    //     //Update Employee Record Labor Cost Value with adjustedLabourCostRate
                    //     updateEmployeeRecord(adjustedParam.employeeId,adjustedLabourCostRate)
                    //
                    //     //Update Task Record with the New Unit Cost
                    //     //updateTaskUnitCost(adjustedParam.employeeId,adjustedParam.taskId,adjustedLabourCostRate)
                    // }else{
                    //     log.debug('calculateAdjustedRate Status', 'No Adjustment needed because there is no overtime calculated')
                    // }
                }

                return {jobCostVariance,adjustedLabourCostRate,overtimeRateCalculation}

            }

            //Update Employee Record
            const updateEmployeeRecord = (employeeId,adjustedLabourCostRate) => {

                try {

                    if (adjustedLabourCostRate) {

                        // Save the employee record
                        record.submitFields({
                            type: record.Type.EMPLOYEE,
                            id: employeeId,
                            values: { laborcost:adjustedLabourCostRate },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });

                    } else {
                        log.debug('updateEmployeeRecord Status','Adjusted Labour Cost Rate Not available for Employee ID: ' + employeeId);
                    }

                } catch (e) {
                    log.error('Error updating employee record', e.message);
                }
            }

            //Update Task Unit Cost
            const updateTaskUnitCost = (employeeId,taskId,adjustedLabourCostRate) => {

                try {

                    if (adjustedLabourCostRate) {

                        // Load the task record
                        let task = record.load({type: 'projecttask', id: taskId});

                        let assigneeSublistId = 'assignee';
                        let assigneeFieldId = 'resource';
                        let unitCostFieldId = 'unitcost';
                        let totalCostFieldId = 'cost';
                        let plannedWorkFieldId = 'plannedwork';


                        let lineCount = task.getLineCount({ sublistId: 'assignee' });

                        log.debug('assignee lineCount','lineCount:'+lineCount)

                        for (let i = 0; i < lineCount; i++) {
                            // Get the assignee ID for the current line
                            let assigneeId = task.getSublistValue({ sublistId: assigneeSublistId, fieldId: assigneeFieldId, line: i });
                            let plannedWork = task.getSublistValue({ sublistId: 'assignee', fieldId: 'plannedwork', line: i });

                            //log.debug('assignee Status','(assigneeId == employeeId):'+(assigneeId == employeeId))

                            if (assigneeId == employeeId) {

                                log.debug('assignee Status','assigneeId:'+assigneeId+', employeeId:'+employeeId+', plannedWork:'+plannedWork)

                                // Set the unit cost on the task record
                                task.setSublistValue({sublistId: assigneeSublistId, fieldId: unitCostFieldId, line: i, value: adjustedLabourCostRate});
                                task.setSublistValue({sublistId: assigneeSublistId, fieldId: totalCostFieldId, line: i, value: adjustedLabourCostRate * plannedWork });
                                log.debug('Task Updated', 'Task ID: ' +taskId + ' - Line: ' + (i + 1) +' - Unit Cost: ' + adjustedLabourCostRate);

                                // Save the updated task record
                                task.save();
                            }
                        }

                    } else {
                        log.debug('updateTaskUnitCost Status','Unit Cost Not Found for Employee ID: ' + employeeId);
                    }

                } catch (e) {
                    log.error('Error updating unit cost', e.message);
                }
            }

            // Get Overtime rate to use for overtime calculation from Overtime Law Custom record
            const getOvertimeRate = ( hours, dailyHours, category, workLocation, calculationType) => {
                const OVER_FORTY_HOURS_PER_WEEK = '1' // >40 hours per week
                const OVER_EIGHT_HOURS_PER_DAY = '8' // > 8 hours in a workday
                const OVER_TWELVE_HOURS_PER_DAY = '4' // > 12 hours in a workday
                // const OVER_FORTY_HOURS_PER_WEEK = '3' // >6 consecutive days in a workweek, and you work no more than 8 hours on the 7th consecutive day
                // const OVER_FORTY_HOURS_PER_WEEK = '4' // 12 hours per workday
                // const OVER_FORTY_HOURS_PER_WEEK = '5' // 12 consecutive hours of work (regardless of the time started and ended)
                const OVER_FORTY_HOURS_PER_WEEK_OR_8_DAYS = '6' // >40 hours per week OR 8 in a day, but only if they don't meet a certain min pay amount
                const OVER_FORTY_HOURS_PER_WEEK_OR_10_HOURS = '7' // Greater of >10 hours a day and/or >40 hours in a workweek
                const OVER_HOURS_HOURS_PER_DAY = '8' // > 8 hours per day
                const OVER_FORTY_EIGHT_HOURS_PER_WEEK = '9' // >48 hours per week

                let overtimeRate = 0;
                let overtimeThreshold = '1';

                if( calculationType === 'Daily'){
                    if( dailyHours > 8  && category === SPECIAL && workLocation === ALASKA ){ overtimeThreshold = OVER_EIGHT_HOURS_PER_DAY }
                    if( dailyHours > 12  && category === SPECIAL && workLocation === COLORADO ){ overtimeThreshold = OVER_TWELVE_HOURS_PER_DAY }
                }

                if( calculationType === 'Weekly'){
                    if( hours > 40  && category === STANDARD ){ overtimeThreshold = OVER_FORTY_HOURS_PER_WEEK }
                    if( hours > 40  && category === SPECIAL && workLocation === ALASKA ){ overtimeThreshold = OVER_FORTY_HOURS_PER_WEEK }
                    if( hours > 40  && category === SPECIAL && workLocation === COLORADO ){ overtimeThreshold = OVER_FORTY_HOURS_PER_WEEK }
                    if( hours > 48  && category === SPECIAL && workLocation === MINNESOTA ){ overtimeThreshold = OVER_FORTY_EIGHT_HOURS_PER_WEEK }
                    if( hours > 40  && category === SPECIAL && workLocation === NEVADA ){ overtimeThreshold = OVER_FORTY_HOURS_PER_WEEK_OR_8_DAYS }
                    if( hours > 40  && category === SPECIAL && workLocation === OREGON ){ overtimeThreshold = OVER_FORTY_HOURS_PER_WEEK_OR_10_HOURS }
                }





                let customrecord_cp_emp_overtime_lawsSearchObj = search.create({
                    type: "customrecord_cp_emp_overtime_laws",
                    filters:
                        [
                            ["custrecord_cp_cusrec_work_location","anyof",workLocation],
                            "AND",
                            ["custrecord_cp_cusrec_ot_threshold","anyof",overtimeThreshold],
                            "AND",
                            ["custrecord_cp_cusrec_std_special","anyof",category]
                        ],
                    columns:
                        [
                            // search.createColumn({name: "name", label: "Name"}),
                            // search.createColumn({name: "custrecord_cusrec_dt_rate", label: "Doubletime Rate"}),
                            // search.createColumn({name: "custrecord_cp_cusrec_ot_threshold", label: "Overtime Threshold"}),
                            // search.createColumn({name: "custrecord_cp_cusrec_std_special", label: "Standard Or Special"}),
                            // search.createColumn({name: "custrecord_cp_cusrec_work_location", label: "Work Location"}),
                            // search.createColumn({name: "custrecord_cusrec_dt_threshold", label: "Doubletime Threshold"}),
                            search.createColumn({name: "custrecord_cusrec_ot_rate", label: "Overtime Rate"})
                        ]
                });
                let searchResultCount = customrecord_cp_emp_overtime_lawsSearchObj.runPaged().count;
                //log.debug("customrecord_cp_emp_overtime_lawsSearchObj result count",searchResultCount);

                customrecord_cp_emp_overtime_lawsSearchObj.run().each(function(result){
                    overtimeRate = parseFloat( result.getValue('custrecord_cusrec_ot_rate'));
                    return true;
                });

                return overtimeRate;

            }

            // Get Dates From Adjusted Salaried Cost Rate Control Custom record
            const getDatesFromAdjustedSalariedCostRateControl = ( employeeContractType, jobCostType) => {

                let fromDate, toDate

                let customrecord_cp_adjusted_sal_cost_rateSearchObj = search.create({
                    type: "customrecord_cp_adjusted_sal_cost_rate",
                    filters:
                        [
                            ["custrecord_cp_adjsc_contract_type","anyof",employeeContractType],
                            "AND",
                            ["custrecord_cp_adjsc_job_cost_type","anyof",jobCostType]
                        ],
                    columns:
                        [
                            search.createColumn({name: "name", label: "Name"}),
                            search.createColumn({name: "id", label: "ID"}),
                            search.createColumn({name: "custrecord_cp_adjsc_contract_type", label: "Employee Contract Type"}),
                            search.createColumn({name: "custrecord_cp_adjsc_job_cost_type", label: "Job Cost Type"}),
                            search.createColumn({name: "custrecord_cp_adjsc_date_from", label: "Date from"}),
                            search.createColumn({name: "custrecord_cp_adjsc_date_to", label: "Date To"})
                        ]
                });
                let searchResultCount = customrecord_cp_adjusted_sal_cost_rateSearchObj.runPaged().count;
                log.debug("customrecord_cp_adjusted_sal_cost_rateSearchObj result count",searchResultCount);

                customrecord_cp_adjusted_sal_cost_rateSearchObj.run().each(function(result){
                    fromDate = result.getValue('custrecord_cp_adjsc_date_from');
                    toDate = result.getValue('custrecord_cp_adjsc_date_to');
                    return true;
                });

                return {fromDate,toDate};

            }

            // Get Location ID
            const getLocationId = ( workLocation ) => {

                let workLocationId;
                let workLocationSearchObj = search.create({
                    type: "customrecord_cseg_veic_emp_loc",
                    filters:
                        [
                            ["name","is", workLocation ]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid", label: "Internal ID"}),
                            search.createColumn({name: "name", label: "Name"})
                        ]
                });
                let searchResultCount = workLocationSearchObj.runPaged().count;
                log.debug("workLocationSearchObj result count",searchResultCount);

                workLocationSearchObj.run().each(function(result){
                    workLocationId = result.getValue('internalid');
                    return true;
                });

                return workLocationId;

            }

            const summarize = (summaryContext) => {
                try {
                    logMRQueuesInSummary(summaryContext);
                    log.audit({ title: 'END', details: '<---------------------------------END--------------------------------->' });
                } catch (errorObj) {
                    log.error({ title: '(Summary) You were so close Error', details: errorObj.toString() });
                    throw errorObj;
                }
            }

            const logMRQueuesInSummary = (summaryContext) => {

                    if (summaryContext.inputSummary.error){
                            let inputError = JSON.parse(summaryContext.inputSummary.error);
                            log.debug({title:'Input Error', details:summaryContext.inputSummary.error });
                    }

                    let mapKeysProcessed = 0;
                    let mapKeysProcessedSuccessfully = 0;
                    let reduceKeysProcessed = 0;
                    let reduceKeysProcessedSuccessfully = 0;
                    let mapErrorCount = 0;
                    let reduceErrorCount = 0;

                    summaryContext.mapSummary.errors.iterator().each(function() {
                            mapErrorCount++;
                            // formattedErrorFormat(error, key, 'Map');
                            return true;
                    });

                    summaryContext.mapSummary.keys.iterator().each(function (key, executionCount, completionState){
                            if (completionState === 'COMPLETE'){
                                    mapKeysProcessedSuccessfully++;
                            }
                            mapKeysProcessed++
                            return true;
                    });

                    summaryContext.reduceSummary.errors.iterator().each(function (key, error){
                            reduceErrorCount++;
                            return true;
                    });

                    summaryContext.reduceSummary.keys.iterator().each(function (key, executionCount, completionState){
                            if (completionState === 'COMPLETE'){
                                    reduceKeysProcessedSuccessfully++;
                            }
                            reduceKeysProcessed++
                            return true;
                    });

                    if (mapErrorCount > 0){
                            log.error({
                                    title: 'Map stage errors',
                                    details: 'Total number of errors: ' + mapErrorCount
                            });
                    }

                    log.audit({
                            title: 'Map statistics',
                            details: `${mapKeysProcessedSuccessfully} / ${mapKeysProcessed} completed.`
                    });

                    if (reduceErrorCount > 0){
                            log.error({
                                    title: 'Reduce stage errors',
                                    details: 'Total number of errors: ' + reduceErrorCount
                            });
                    }

                    log.audit({
                            title: 'Reduce statistics',
                            details: `${reduceKeysProcessedSuccessfully} / ${reduceKeysProcessed} completed.`
                    });
            }

            function getDateName(dateString){
                var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                var d = new Date(dateString);
                var dayName = days[d.getDay()];
                return dayName
            }

            return {getInputData, reduce, summarize}
    });