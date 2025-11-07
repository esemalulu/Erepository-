/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime'],
    /**
     //* @param{record} record
     //* @param{search} search
     * @param{runtime} runtime
     */
    (record, search, runtime) => {

            //Declare Contract Type Values
            const SALARIED = '1'
            const HOURLY = '2'

            // Set Values for Overtime law Category
            const STANDARD = '1';
            const SPECIAL = '2';

            //Declare Job Cost Type Values
            const WEEKLY = '1'
            const BIWEEKLY = '2'
            const MONTHLY = '3'

            // Declare Charge Stage Value
            const HOLD_FOR_BILLING	= 'HOLD_FOR_BILLING'//Hold
            const READY_FOR_BILLING	 = 'READY_FOR_BILLING'//Ready
            const NON_BILLABLE	= 'NON_BILLABLE' //Non-Billable


            // Declare Charge Type Value
            const EXPENSE_BASED = '-98' // Expense based
            const TIME_BASED = '-13' // Time based
            const FIXED_DATE = '-10' // Fixed date

            // Set Billing Item Value
            const consultingHoursOne = 5 // Consulting Hours I
            const percentageComplete = 15 // % Complete item
            const fringe = 322 // Allocated Fringe
            const pto = 248 // BU PTO Received
            const employeeSupport = 645 // Allocated Indirect Employee Support
            const generalSupport = 646 // Allocated Indirect General Support
            const federalSupport = 647 // Allocated Indirect General Support

            const getInputData = (inputContext) => {
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
                                                ["casetaskevent","noneof","@NONE@"],
                                                "AND",
                                                //["customer","anyof","30975"],
                                                // ["customer","anyof","91696"],
                                                // "AND",
                                                // ["employee","anyof","7"]
                                                //["employee","anyof","2797"]
                                                ["employee","anyof","328"]

                                        ],
                                    columns:
                                        [
                                                search.createColumn({name: "customer", summary: "GROUP", label: "Client"}),
                                                search.createColumn({ name: "custentity_cp_prj_tcv", join: "job", summary: "MAX", label: "Project Total Contract Value" }),
                                                search.createColumn({ name: "custentity_cp_previously_billed", join: "job", summary: "MAX", label: "Previously Billed" })
                                                // search.createColumn({name: "employee", summary: "GROUP", label: "Employee"}),
                                                // search.createColumn({name: "durationdecimal", summary: "SUM", label: "Duration (Decimal)"}),
                                                // search.createColumn({name: "approvalstatus", summary: "GROUP", label: "Approval Status"}),
                                                // search.createColumn({name: "casetaskevent", summary: "GROUP", label: "Case/Task/Event"}),
                                                // search.createColumn({name: "laborcost", summary: "MAX", label: "Labor Cost"}),
                                                // search.createColumn({name: "laborcost", join: "employee", summary: "MAX", label: "Labor Cost"}),
                                                // search.createColumn({name: "custentity_cp_ftehours", join: "employee", summary: "MAX", label: "FTE Hours"}),
                                                // search.createColumn({name: "cseg_veic_emp_loc", join: "employee", summary: "MAX", label: "Work Location"}),
                                                // search.createColumn({name: "payfrequency", join: "employee", summary: "GROUP", label: "Pay Frequency"}),
                                                // search.createColumn({name: "custentity_cp_job_cost_type", join: "employee", summary: "GROUP", label: "Job Cost Type"}),
                                                // search.createColumn({name: "custentity_cp_ftesalary", join: "employee", summary: "MAX", label: "FTE Salary"}),
                                                // search.createColumn({name: "custentity_cp_employee_contract_type", join: "employee", summary: "GROUP", label: "Employee Contract Type"})

                                        ]
                            });

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

                            let projectId = searchResult.values["GROUP(customer)"].value;
                            let totalContractValue = parseFloat( searchResult.values["custentity_cp_prj_tcv.job"]);
                            let previouslyBilled = parseFloat( searchResult.values["custentity_cp_previously_billed.job"]);

                        //     log.debug('projectId', projectId);
                        //     log.debug('totalContractValue', totalContractValue);
                        //     log.debug('previouslyBilled', previouslyBilled);
                            
                            // let employee = searchResult.values["GROUP(employee)"].text;
                            // let employeeId = searchResult.values["GROUP(employee)"].value;
                            // let taskId = searchResult.values["GROUP(casetaskevent)"].value;
                            // let laborCost = parseFloat( searchResult.values["MAX(laborcost)"]);
                            // let employeeLaborCost = parseFloat( searchResult.values["MAX(laborcost.employee)"]);
                            // let fteHours = parseFloat( searchResult.values["MAX(custentity_cp_ftehours.employee)"]);
                            // let fteSalary = parseFloat( searchResult.values["MAX(custentity_cp_ftesalary.employee)"]);
                            // let workLocation = searchResult.values["MAX(cseg_veic_emp_loc.employee)"];
                            // //let payFrequency = searchResult.values["GROUP(payfrequency.employee)"];
                            // let jobCostType = searchResult.values["GROUP(custentity_cp_job_cost_type.employee)"].value;
                            // let employeeContractType = searchResult.values["GROUP(custentity_cp_employee_contract_type.employee)"].value;
                            //let hours = parseFloat( searchResult.values["SUM(durationdecimal)"]);

                            //log.debug('REDUCE STATUS','projectId:'+projectId)

                            // let hours = calculateProjectDurationSumByEmployeeAndProject(projectId,employeeId);
                            //
                            // if( dataValidation(hours)){
                            //         let adjustedParam = {employeeId,employee,taskId,laborCost,employeeLaborCost,fteHours,workLocation,jobCostType,fteSalary,employeeContractType,hours}
                            //         log.debug('adjustedParam',adjustedParam)
                            //
                            //         let adjustedResultArray = calculateAdjustedRate( adjustedParam )
                            //         log.debug('adjustedResultArray',adjustedResultArray)
                            // }

                            let chargeStage = READY_FOR_BILLING;
                            let currentProjectSpend = 0;

                            // Get the sum of all charges on a project
                            let allChargesValue  = getAllChargesValue(projectId);
                        //     log.debug('dataValidation(allChargesValue)', dataValidation(allChargesValue));
                        //     log.debug('dataValidation(totalContractValue)', dataValidation(totalContractValue));
                        //     log.debug('dataValidation(previouslyBilled)', dataValidation(previouslyBilled));
                            if(dataValidation(allChargesValue) && dataValidation(totalContractValue) && dataValidation(previouslyBilled)){

                                    log.debug('Test', 'Test1');
                                    currentProjectSpend = allChargesValue + previouslyBilled;
                                    updateProjectRecord(projectId,currentProjectSpend)

                                    if( totalContractValue >= allChargesValue){
                                            chargeStage = READY_FOR_BILLING;
                                    }else{
                                            //Create non-billable charge of the balance
                                            //let chargesBalance =  allChargesValue - totalContractValue;
                                            //createCharge(projectId, chargesBalance, FIXED_DATE, consultingHoursOne)
                                            chargeStage = NON_BILLABLE;
                                    }
                            }



                            // Calculate Mark Up or Discount Rate
                            //calculateMarkUpOrDiscount(projectId, chargeStage);

                            //Process Task Complete Value
                            processTaskCompleteValue( projectId, chargeStage )


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

            const calculateRatePercentage = (valueString) =>{
                    // Remove the "%" character
                    const cleanedString = valueString.replace('%','');
                    // Convert string to a float number
                    const value = parseFloat(cleanedString);
                    return value / 100;
            }

            // Calculate Total Sum By Employee and Project
            const calculateProjectDurationSumByEmployeeAndProject = (projectId,employeeId) =>{
                    let totalAmount = 0;
                    let durationSumObj = search.create({
                            type: "timebill",
                            filters:
                                [
                                        ["charge.id","isempty",""],
                                        "AND",
                                        ["approvalstatus","anyof","3"],
                                        "AND",
                                        ["customer","anyof",projectId],
                                        "AND",
                                        ["employee","anyof",employeeId],
                                        "AND",
                                        ["casetaskevent","noneof","@NONE@"],
                                        "AND",
                                        ["type","anyof","A"]
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
                            totalAmount = result.getValue({ name: 'durationdecimal', summary: 'SUM' });
                            return true;
                    });
                    log.debug("calculateProjectDurationSumByEmployeeAndProject STATUS",'Total Expense:'+totalAmount);

                    return parseFloat(totalAmount);
            }

            //Update Project Record
            const updateProjectRecord = (projectId,currentProjectSpend) => {

                    try {
                            // Save the project record
                            record.submitFields({
                                    type: record.Type.JOB,
                                    id: projectId,
                                    values: { custentity_cp_current_spend: currentProjectSpend },
                                    options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields : true
                                    }
                            });

                    } catch (e) {
                            log.error('Error updating employee record', e.message);
                    }
            }

            // Get The Sum of All Charges
            const getAllChargesValue = (projectId) =>{
                    let totalAmount = 0;
                    let chargeSearchObj = search.create({
                            type: "charge",
                            filters:
                                [
                                        ["use","anyof","Actual"],
                                        "AND",
                                        // ["chargetype","anyof",chargeType],
                                        // "AND",
                                        ["billto","anyof", projectId],
                                        "AND",
                                        ["id","isnotempty",""],
                                        "AND",
                                        ["stage","noneof","NON_BILLABLE"]
                                ],
                            columns:
                                [
                                        search.createColumn({
                                                name: "billto",
                                                summary: "GROUP",
                                                label: "Client:Project"
                                        }),
                                        search.createColumn({
                                                name: "amount",
                                                summary: "SUM",
                                                label: "Amount"
                                        })
                                ]
                    });
                    //let searchResultCount = chargeSearchObj.runPaged().count;
                    //log.debug("chargeSearchObj result count",searchResultCount);
                    chargeSearchObj.run().each(function(result){
                            totalAmount = result.getValue({ name: 'amount', summary: 'SUM' });
                            return true;
                    });
                    log.debug("getAllChargesValue STATUS",'All Charges Total Value:'+totalAmount);

                    return parseFloat(totalAmount);
            }

            // Calculate Charges
            const calculateCharges = (projectId, chargeType) =>{
                    let totalAmount = 0;
                    let chargeSearchObj = search.create({
                            type: "charge",
                            filters:
                                [
                                        ["use","anyof","Actual"],
                                        "AND",
                                        ["chargetype","anyof",chargeType],
                                        "AND",
                                        ["billto","anyof", projectId],
                                        "AND",
                                        ["id","isnotempty",""],
                                        "AND",
                                        ["custrecord_cp_markedup_complete","is","F"],
                                        "AND",
                                        ["stage","noneof","NON_BILLABLE"]
                                ],
                            columns:
                                [
                                        search.createColumn({
                                                name: "billto",
                                                summary: "GROUP",
                                                label: "Client:Project"
                                        }),
                                        search.createColumn({
                                                name: "amount",
                                                summary: "SUM",
                                                label: "Amount"
                                        })
                                ]
                    });
                    //let searchResultCount = chargeSearchObj.runPaged().count;
                    //log.debug("chargeSearchObj result count",searchResultCount);
                    chargeSearchObj.run().each(function(result){
                            totalAmount = result.getValue({ name: 'amount', summary: 'SUM' });
                            return true;
                    });
                    log.debug("calculateCharges STATUS",'Total Charge:'+totalAmount);

                    return parseFloat(totalAmount);
            }


            // Calculate MarkUp or Discount
            const calculateMarkUpOrDiscount = (projectId, chargeStage ) =>{
                    let rate = 0, markupRate = 0, discountRate = 0;
                    let chargeType, billingItem;
                    let expenseBasedChargeSum_MarkUp = 0, timeBasedChargeSum_MarkUp = 0, fixedDateChargeSum_MarkUp = 0, expenseBasedChargeSum_Discount = 0, timeBasedChargeSum_Discount = 0, fixedDateChargeSum_Discount = 0;
                    //let expenseBasedChargeRate = 0, timeBasedChargeRate = 0, fixedDateChargeRate = 0;

                    let markUpOrDiscountSearchObj = search.create({
                            type: "customrecord_cp_markup_discount_table",
                            filters:
                                [
                                        ["custrecord_cp_project_discount_mark","anyof",projectId]
                                ],
                            columns:
                                [
                                        search.createColumn({name: "internalid", label: "Internal ID"}),
                                        search.createColumn({name: "custrecord_cp_project_discount_mark", label: "Project"}),
                                        search.createColumn({name: "custrecord_cp_markup_discount_value", label: "Markup%"}),
                                        search.createColumn({name: "custrecord_cp_prj_discount", label: "Discount %"}),
                                        search.createColumn({name: "custrecord_cp_prj_service_bill", label: "Billing Item"}),
                                        search.createColumn({name: "custrecord_cp_markup_discount_type", label: "Charge Type"})
                                ]
                    });
                    let searchResultCount = markUpOrDiscountSearchObj.runPaged().count;
                    log.debug("calculateMarkUpOrDiscount result count",searchResultCount);

                    markUpOrDiscountSearchObj.run().each(function(result){
                            markupRate = calculateRatePercentage(result.getValue('custrecord_cp_markup_discount_value'));
                            discountRate = calculateRatePercentage(result.getValue('custrecord_cp_prj_discount'));
                            billingItem = result.getValue('custrecord_cp_prj_service_bill');
                            chargeType = result.getValue('custrecord_cp_markup_discount_type');

                            // Markup Rate Calculation
                            if( dataValidation(markupRate) && dataValidation(chargeType)){
                                    if( chargeType === EXPENSE_BASED){
                                            expenseBasedChargeSum_MarkUp += calculateCharges(projectId,EXPENSE_BASED)  * markupRate
                                    }
                                    if( chargeType === TIME_BASED){
                                            timeBasedChargeSum_MarkUp += calculateCharges(projectId,TIME_BASED)  * markupRate
                                    }
                                    if( chargeType === FIXED_DATE){
                                            fixedDateChargeSum_MarkUp += calculateCharges(projectId,FIXED_DATE)  * markupRate
                                    }
                            }

                            // Discount Rate Calculation
                            if( dataValidation(discountRate) && dataValidation(chargeType)){
                                    if( chargeType === EXPENSE_BASED){
                                            expenseBasedChargeSum_Discount += calculateCharges(projectId,EXPENSE_BASED)  * discountRate
                                    }
                                    if( chargeType === TIME_BASED){
                                            timeBasedChargeSum_Discount += calculateCharges(projectId,TIME_BASED)  * discountRate
                                    }
                                    if( chargeType === FIXED_DATE){
                                            fixedDateChargeSum_Discount += calculateCharges(projectId,FIXED_DATE)  * discountRate
                                    }
                            }

                            return true;
                    });

                    log.debug("MarkUp STATUS",'expenseBasedChargeSum_MarkUp:'+expenseBasedChargeSum_MarkUp+', timeBasedChargeSum_MarkUp:'+timeBasedChargeSum_MarkUp+', fixedDateChargeSum_MarkUp:'+fixedDateChargeSum_MarkUp);
                    log.debug("Discount STATUS",'expenseBasedChargeSum_Discount:'+expenseBasedChargeSum_Discount+', timeBasedChargeSum_Discount:'+timeBasedChargeSum_Discount+', fixedDateChargeSum_MarkUp:'+fixedDateChargeSum_Discount);

                    if( expenseBasedChargeSum_MarkUp > 0 ){ createCharge(projectId, expenseBasedChargeSum_MarkUp, FIXED_DATE, billingItem, chargeStage, null) }
                    if( timeBasedChargeSum_MarkUp > 0 ){ createCharge(projectId, timeBasedChargeSum_MarkUp, FIXED_DATE, billingItem, chargeStage, null) }
                    if( fixedDateChargeSum_MarkUp > 0 ){ createCharge(projectId, fixedDateChargeSum_MarkUp, FIXED_DATE, billingItem, chargeStage, null) }
                    if( expenseBasedChargeSum_Discount > 0 ){ createCharge(projectId, expenseBasedChargeSum_Discount, FIXED_DATE, billingItem, chargeStage, null) }
                    if( timeBasedChargeSum_Discount > 0 ){ createCharge(projectId, timeBasedChargeSum_Discount, FIXED_DATE, billingItem, chargeStage, null) }
                    if( fixedDateChargeSum_Discount > 0 ){ createCharge(projectId, fixedDateChargeSum_Discount, FIXED_DATE, billingItem, chargeStage, null) }

                    //return { expenseBasedChargeSum_MarkUp, timeBasedChargeSum_MarkUp, fixedDateChargeSum_MarkUp, expenseBasedChargeSum_Discount, timeBasedChargeSum_Discount, fixedDateChargeSum_Discount }
            }


            //Process Task Complete Value
            const processTaskCompleteValue = (projectId, chargeStage) => {

                    //let taskCompleteCalculated, newCompleteCalculated = 0;
                    //let taskId, taskTCV, percentageTaskCompleteOverride;

                    try {
                            if (dataValidation(projectId)) {

                                    // Get tasks in a project record
                                    let projecttaskSearchObj = search.create({
                                            type: "projecttask",
                                            filters:
                                                [
                                                        ["project","anyof",projectId]
                                                ],
                                            columns:
                                                [
                                                        search.createColumn({name: "internalid", label: "Internal ID"}),
                                                        search.createColumn({name: "custevent_cp_task_tcv", label: "Task TCV"}),
                                                        search.createColumn({name: "custevent_cp_task_pct_complete", label: "Task % Complete Override"}),
                                                        search.createColumn({name: "custevent_cp_task_complete_calculated", label: "Task Completed Calculated"}),
                                                        search.createColumn({name: "custevent_cp_use_task_complete", label: "Use Task Complete for Billing"})
                                                ]
                                    });
                                    let projectTaskCount = projecttaskSearchObj.runPaged().count;
                                    log.debug('processTaskCompleteValue Status','projectTaskCount total:'+projectTaskCount);


                                    projecttaskSearchObj.run().each(function(result){

                                            let useTaskCompleteForBilling = result.getValue('custevent_cp_use_task_complete');
                                            let taskTCV = result.getValue('custevent_cp_task_tcv');
                                            const percentageTaskCompleteOverride = calculateRatePercentage( result.getValue('custevent_cp_task_pct_complete'));
                                            let taskCompleteCalculated = parseFloat(result.getValue('custevent_cp_task_complete_calculated'));
                                            let previousBilling = parseFloat(result.getValue('custevent_prev_bill_amount'));
                                            let currentFee = parseFloat(result.getValue('custevent_current_fee'));

                                            //log.debug('useTaskCompleteForBilling','useTaskCompleteForBilling:'+useTaskCompleteForBilling)

                                            if( useTaskCompleteForBilling ){
                                                    if( dataValidation(percentageTaskCompleteOverride) && dataValidation(taskTCV) ){

                                                            const taskId = result.getValue('internalid');

                                                            if( !dataValidation(taskCompleteCalculated) ) { taskCompleteCalculated = 0.00 }
                                                            if( !dataValidation(previousBilling) ) { previousBilling = 0.00 }
                                                            if( !dataValidation(currentFee) ) { currentFee = 0.00 }

                                                            previousBilling = taskCompleteCalculated;

                                                            //taskTCV -= taskCompleteCalculated;

                                                            if( taskTCV >= taskCompleteCalculated ){
                                                                    currentFee = Math.abs(( taskTCV * percentageTaskCompleteOverride ) - taskCompleteCalculated );
                                                                    taskCompleteCalculated += currentFee;

                                                                    if( currentFee > 0){
                                                                            // Calculate charge
                                                                            createCharge(projectId, currentFee, FIXED_DATE, percentageComplete, chargeStage, taskId)

                                                                            // Save the task record
                                                                            record.submitFields({
                                                                                    type: record.Type.PROJECT_TASK,
                                                                                    id: taskId,
                                                                                    values: { custevent_cp_task_complete_calculated:taskCompleteCalculated, custevent_prev_bill_amount: previousBilling, custevent_current_fee:currentFee },
                                                                                    // values: { custevent_cp_task_complete_calculated:0 },
                                                                                    options: {
                                                                                            enableSourcing: false,
                                                                                            ignoreMandatoryFields : true
                                                                                    }
                                                                            });
                                                                            log.debug('processTaskCompleteValue Status','Task Id:'+taskId+', taskTCV:'+taskTCV+', percentageTaskCompleteOverride:'+percentageTaskCompleteOverride+', taskCompleteCalculated:'+taskCompleteCalculated+', currentFee:'+currentFee);
                                                                    }


                                                            }

                                                    }
                                            }

                                            return true;
                                    });

                                    // let sublists = project.getSublists();
                                    // log.debug('Available Sublists', sublists);

                            } else {
                                    log.debug('processTaskCompleteValue Status','Project ID Not Found');
                            }

                    } catch (e) {
                            log.error('processTaskCompleteValue Error Process', e.message);
                    }
            }

            //Create Charge
            const createCharge = (projectId, rate, chargeType, billingItem, chargeStage, taskId) => {
                
                    log.debug('Inside createCharge', 'is entering in here')
                    if(!dataValidation(billingItem)){ billingItem = consultingHoursOne }

                    try {
                            let chargeRecord = record.create({
                                    type: record.Type.CHARGE,
                                    isDynamic: true
                            });
                            chargeRecord.setValue({
                                    fieldId: 'billto',
                                    value: projectId
                            });
                            chargeRecord.setValue({
                                    fieldId: 'custrecord_cp_project_task_billing',
                                    value: taskId
                            });
                            chargeRecord.setValue({
                                    fieldId: 'stage',
                                    //value: 'READY_FOR_BILLING'
                                    value: chargeStage
                            });
                            chargeRecord.setValue({
                                    fieldId: 'chargedate',
                                    value: new Date(Date.now())
                            });
                            chargeRecord.setValue({
                                    fieldId: 'chargetype',
                                    value: chargeType
                            });
                            chargeRecord.setValue({
                                    fieldId: 'billingitem',
                                    value: billingItem
                                    // value: 5 // Consulting Hours
                            });

                            chargeRecord.setValue({
                                    fieldId: 'currency',
                                    value: 1 //USD
                            });
                            chargeRecord.setValue({
                                    fieldId: 'quantity',
                                    value: 1
                            });

                            chargeRecord.setValue({
                                    fieldId: 'rate',
                                    value: rate
                            });

                            chargeRecord.setValue({
                                    fieldId: 'amount',
                                    value: rate
                            });
                            if( chargeType === TIME_BASED ){
                                    chargeRecord.setValue({
                                            fieldId: 'timerecord',
                                            value: timeEntryId
                                    });
                                    chargeRecord.setValue({
                                            fieldId: 'rule',
                                            value: 27 //Default Time Rule
                                    });
                            }

                            // chargeRecord.setValue({
                            //         fieldId: 'chargeemployee',
                            //         value: chargeParam.employeeId
                            // });

                            let chargeId = chargeRecord.save();
                            log.debug('Charge Created', 'Charge ID: ' + chargeId);

                            // Set Markup/Discount Applied field (custrecord_cp_markedup_complete) to True
                            if(dataValidation(chargeId)){
                                    // Save the charge record
                                    record.submitFields({
                                            type: record.Type.CHARGE,
                                            id: chargeId,
                                            values: { custrecord_cp_markedup_complete:true},
                                            options: {
                                                    enableSourcing: false,
                                                    ignoreMandatoryFields : true
                                            }
                                    });
                            }

                    } catch (e) {
                            log.error('Error creating charge', e.message);
                    }
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

            return {getInputData, reduce, summarize}
    });