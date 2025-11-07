/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime', 'SuiteScripts/Lib/veic_master_lib.js', 'SuiteScripts/Lib/PTO_Percentage/pto_percentage_lib.js'],
    /**
     //* @param{record} record
     //* @param{search} search
     * @param{runtime} runtime
     */
    (record, search, runtime, lib, ptoLib) => {

            // Set Charge Type Value
            const EXPENSE_BASED = '-98' // Expense based
            const TIME_BASED = '-13' // Time based
            const FIXED_DATE = '-10' // Fixed date

            // Set Billing Item Value
            const consulting = 756 // Consulting
            const consultingHoursOne = 5 // Consulting Hours I
            const fringe = 322 // Allocated Fringe
            const pto = 248 // BU PTO Received
            const employeeSupport = 645 // Allocated Indirect Employee Support
            const generalSupport = 646 // Allocated Indirect General Support
            const federalSupport = 647 // Allocated Indirect General Support

            const getInputData = (inputContext) => {
                    // Get the project ID from the script parameter
                    //let projectId = runtime.getCurrentScript().getParameter({ name: 'custscript_projectid_param' });
                    const invoiceId = runtime.getCurrentScript().getParameter('custscript_cp_invoiceid_from_suitelet');
                    const projectId = runtime.getCurrentScript().getParameter('custscript_cp_projectid_from_suitelet');
                    
                    log.debug('Invoice ID', 'Invoice ID:'+invoiceId);
                    log.debug('projectId ID', 'projectId ID:'+projectId);

                    try{
                        //Here we are calculating the PTO %
                        if(lib.isNotEmpty(invoiceId) && lib.isNotEmpty(projectId)){
                          ptoLib.ptoPercentageMasterLogic(invoiceId, projectId);  
                        }
                    }catch (e) {
                        throw e;
                    }

                    try{
                            log.audit({ title: 'START', details: '<--------------------------------START-------------------------------->' });

                            let recordSearch = search.create({
                                    type: "timebill",
                                    filters:
                                        [
                                                ["type","anyof","A"],
                                                "AND",
                                                //26332 = 10116 Residential HPWH Focus Pilot
                                                //26243 = 10028 U.S. Department of Energy : DOE ZEM MF
                                                ["customer","anyof","26243"],
                                                "AND",
                                                ["approvalstatus","anyof","3"],
                                                "AND",
                                                ["billable","is","T"],
                                                "AND",
                                                ["posted","is","T"],
                                                "AND",
                                                ["job.custentity_cp_cost_reimbursement","is","T"],
                                                "AND",
                                                ["charge.id","isempty",""],
                                                // "AND",
                                                // ["projecttaskassignment.unitcost","isnotempty",""]
                                        ],
                                    columns:
                                        [
                                                search.createColumn({name: "internalid", label: "Internal ID"}),
                                                search.createColumn({
                                                        name: "date",
                                                        sort: search.Sort.ASC,
                                                        label: "Date"
                                                }),
                                                search.createColumn({name: "employee", label: "Employee"}),
                                                search.createColumn({name: "customer", label: "Client"}),
                                                search.createColumn({name: "item", label: "Item"}),
                                                search.createColumn({name: "durationdecimal", label: "Duration"}),
                                                search.createColumn({name: "type", label: "Type"}),
                                                search.createColumn({name: "approvalstatus", label: "Approval Status"}),
                                                search.createColumn({name: "casetaskevent", label: "Case/Task/Event"}),
                                                search.createColumn({name: "isbillable", label: "Billable"}),
                                                search.createColumn({name: "cost", join: "projectTaskAssignment", label: "Cost"}),
                                                search.createColumn({name: "custcol_cp_labour_billing_rate", label: "Labour Billing Rate"}),
                                                search.createColumn({name: "custcol_cp_time_jcr", label: "Job Cost Rate"}),
                                                search.createColumn({name: "laborcost", join: "employee", label: "Labor Cost"}),
                                                search.createColumn({name: "unitcost", join: "projectTaskAssignment", label: "Unit Cost"}),
                                                search.createColumn({name: "custentity_cp_cost_reimbursement", join: "job", label: "Cost Reimbursement"}),
                                                search.createColumn({name: "custentity_cp_garate", join: "job", label: "G&A %"}),
                                                search.createColumn({name: "custentity_cp_fringepercent", join: "job", label: "Fringe %"}),
                                                search.createColumn({name: "custentity_cp_indirectrate", join: "job", label: "Indirect %"}),
                                                //search.createColumn({name: "custentity_cp_ptorate", join: "job", label: "PTO %"}),
                                                search.createColumn({name: "custentity_cp_emp_support_oh_rate", join: "job", label: "Employee Support OH %"}),
                                                search.createColumn({name: "custentity_cp_gen_org_oh_rate", join: "job", label: "General Org OH %"}),
                                                search.createColumn({name: "custentity_cp_fed_support_oh_rate", join: "job", label: "Federal Support OH %"}),
                                                search.createColumn({name: "custentity_cp_core_it_rate", join: "job", label: "Core IT %"}),
                                                search.createColumn({name: "custentity_cp_ops_fee_rate", join: "job", label: "Ops Fee %"}),
                                                search.createColumn({name: "custentity_cp_prj_tcv", join: "job", label: "Project Total Contract Value"}),
                                                // search.createColumn({name: "custentity_cp_mark_up", join: "job", label: "Mark Up %"}),
                                                // search.createColumn({name: "custentity_cp_discount", join: "job", label: "Discount %"}),
                                        ]
                            });

                            // Process a customer based calculation from the button action from project record;
                            if(dataValidation(projectId)){
                                    let customerFilter = search.createFilter({name: 'customer',operator:'anyof',values: projectId});
                                    recordSearch.filters.push(customerFilter);
                            }

                            let searchResultCount = recordSearch.runPaged().count;
                            log.debug("Time entry For Project Billing result count",searchResultCount);

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

                            let timeEntryId = searchResult.values["internalid"].value;
                            let employee = searchResult.values["employee"].text;
                            let employeeId = searchResult.values["employee"].value;
                            let itemId = searchResult.values["item"].value;
                            let projectId = searchResult.values["customer"].value;
                            let jobCostRate = parseFloat( searchResult.values["custcol_cp_time_jcr"]);
                            let hours = parseFloat( searchResult.values["durationdecimal"]);
                            let rate = parseFloat( searchResult.values["unitcost.projectTaskAssignment"]);
                            //let laborCostRate = parseFloat( searchResult.values["laborcost.employee"]);
                            let laborCostRate = parseFloat( searchResult.values["custcol_cp_labour_billing_rate"]);
                            let costReimbursement = searchResult.values["custentity_cp_cost_reimbursement.job"];

                            //****************************STARTS************************************

                            // Use Job Cost Rate to replace Project Unit Cost for Corrected Entries
                            //if( dataValidation(jobCostRate) ){ rate = jobCostRate; }
                            if( dataValidation(laborCostRate) ){ rate = laborCostRate; }

                            // Calculate Labor Cost rate
                            //let laborCostRate = rate * hours

                            // Get the PTO,Fringe, G&A and Indirect values from project record
                            //let ptoRate = calculateRatePercentage(searchResult.values["custentity_cp_ptorate.job"]);
                            let fringeRate = calculateRatePercentage( searchResult.values["custentity_cp_fringepercent.job"]);
                            let gaRate = calculateRatePercentage( searchResult.values["custentity_cp_garate.job"]);
                            let indirectRate = calculateRatePercentage( searchResult.values["custentity_cp_indirectrate.job"]);
                            let employeeSupportOHRate = calculateRatePercentage( searchResult.values["custentity_cp_emp_support_oh_rate.job"]);
                            let generalOrgOHRate = calculateRatePercentage( searchResult.values["custentity_cp_gen_org_oh_rate.job"]);
                            let federalSupportOHRate = calculateRatePercentage( searchResult.values["custentity_cp_fed_support_oh_rate.job"]);
                            let coreITRate = calculateRatePercentage( searchResult.values["custentity_cp_core_it_rate.job"]);
                            let opsFeeRate = calculateRatePercentage( searchResult.values["custentity_cp_ops_fee_rate.job"]);
                            let totalContractValue = parseFloat( searchResult.values["custentity_cp_prj_tcv.job"]);
                            // let markUpRate = calculateRatePercentage( searchResult.values["custentity_cp_mark_up.job"]);
                            // let discountRate = calculateRatePercentage( searchResult.values["custentity_cp_discount.job"]);
                            //log.debug('Cost Reimbursement Status','costReimbursement:'+costReimbursement+', hours:'+hours+', ptoRate:'+ptoRate+', fringeRate:'+fringeRate+', gaRate:'+gaRate+', indirectRate:'+indirectRate);

                            //let projectParam = {projectId,laborCostRate,ptoRate,fringeRate,gaRate,indirectRate,employeeSupportOHRate,generalOrgOHRate,federalSupportOHRate,coreITRate,opsFeeRate}
                            let projectParam = {projectId,laborCostRate,fringeRate,gaRate,indirectRate,employeeSupportOHRate,generalOrgOHRate,federalSupportOHRate,coreITRate,opsFeeRate}
                            log.debug('projectParam Status',projectParam)

                            if( costReimbursement === 'T' && dataValidation(laborCostRate)){
                                    let markUpRateObject = calculateMarkUpRate(projectParam);
                                    //ptoMarkUpRate,fringeMarkUpRate, labourBillingRate, employeeSupportOHMarkUpRate, generalOrgOHMarkUpRate, federalSupportOHMarkUpRate,gaMarkUpRate,opsFeeMarkUpRate
                                    let ptoMarkUpRate = markUpRateObject.ptoMarkUpRate;
                                    let fringeMarkUpRate = markUpRateObject.fringeMarkUpRate;
                                    let labourBillingRate = markUpRateObject.labourBillingRate;
                                    let employeeSupportOHMarkUpRate = markUpRateObject.employeeSupportOHMarkUpRate;
                                    let generalOrgOHMarkUpRate = markUpRateObject.generalOrgOHMarkUpRate;
                                    let federalSupportOHMarkUpRate = markUpRateObject.federalSupportOHMarkUpRate;
                                    let gaMarkUpRate = markUpRateObject.gaMarkUpRate;
                                    let opsFeeMarkUpRate = markUpRateObject.opsFeeMarkUpRate;
                                    let coreITMarkUpRate = markUpRateObject.coreITMarkUpRate;

                                    log.debug('markUpRateObject Status',markUpRateObject)

                                    let chargeParam = {timeEntryId,projectId,employeeId,hours,rate}


                                    // Create Time Entry Charge for Labour Billing Rate
                                    // if(dataValidation(labourBillingRate)){
                                    //         //Set the calculated Labour Billing Rate on Time Entry Record before Charge is committed
                                    //         record.submitFields({
                                    //                 type: record.Type.TIME_BILL,
                                    //                 id: parseInt(timeEntryId),
                                    //                 values: { custcol_cp_labour_billing_rate: labourBillingRate.toFixed(2) },
                                    //                 options: {
                                    //                         enableSourcing: false,
                                    //                         ignoreMandatoryFields: true
                                    //                 }
                                    //         });
                                    //
                                    //         createCharge(chargeParam,labourBillingRate,TIME_BASED,consultingHoursOne)
                                    // }

                                    // Create Charge for Labour Cost Rate
                                    createCharge(chargeParam,laborCostRate,TIME_BASED,consultingHoursOne,'Labour Cost Rate')

                                    // Create Charge for PTO Mark Up Rate
                                    if(dataValidation(ptoMarkUpRate)){
                                            createCharge(chargeParam,ptoMarkUpRate,FIXED_DATE, pto, 'PTO Mark Up Rate')
                                    }

                                    // Create Charge for Fringe Mark Up Rate
                                    if(dataValidation(fringeMarkUpRate)){
                                            createCharge(chargeParam,fringeMarkUpRate,FIXED_DATE, fringe, 'Fringe Mark Up Rate')
                                    }

                                    // Create Time Entry Charge for Employee Support OH
                                    if(dataValidation(employeeSupportOHMarkUpRate)){
                                            createCharge(chargeParam,employeeSupportOHMarkUpRate,FIXED_DATE, employeeSupport, 'Employee Support OH')
                                    }

                                    // Create Time Entry Charge for General Org OH
                                    if(dataValidation(generalOrgOHMarkUpRate)){
                                            createCharge(chargeParam,generalOrgOHMarkUpRate,FIXED_DATE, generalSupport, 'General Org OH')
                                    }

                                    // Create Time Entry Charge for Federal Support OH
                                    if(dataValidation(federalSupportOHMarkUpRate)){
                                            createCharge(chargeParam,federalSupportOHMarkUpRate,FIXED_DATE, federalSupport, 'Federal Support OH')
                                    }

                                    // Create Time Entry Charge for GA
                                    if(dataValidation(gaMarkUpRate)){
                                            createCharge(chargeParam,gaMarkUpRate,FIXED_DATE, consultingHoursOne, 'GA Rate')
                                    }

                                    // Create Time Entry Charge for Ops Fee
                                    if(dataValidation(opsFeeMarkUpRate)){
                                            createCharge(chargeParam,opsFeeMarkUpRate,FIXED_DATE, consultingHoursOne, 'Ops Fee')
                                    }

                                    // Create Time Entry Charge for Core IT
                                    if(dataValidation(coreITMarkUpRate)){
                                            createCharge(chargeParam,coreITMarkUpRate,FIXED_DATE, consultingHoursOne, 'Core IT')
                                    }

                            }else{
                                    log.error('Cost Reimbursement Status','Project is not Cost Reimbursement or Labor Cost Rate is yet to be calculated')
                            }


                            // Calculate Mark Up or Discount Rate
                            //calculateMarkUpOrDiscount(projectId);

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

            const summarize = (summaryContext) => {
                    try {
                            logMRQueuesInSummary(summaryContext);
                            log.audit({ title: 'END', details: '<---------------------------------END--------------------------------->' });
                    } catch (errorObj) {
                            log.error({ title: '(Summary) You were so close Error', details: errorObj.toString() });
                            throw errorObj;
                    }
            }

            const calculateRatePercentage = (valueString) =>{
                    // Remove the "%" character
                    const cleanedString = valueString.replace('%','');
                    // Convert string to a float number
                    const value = parseFloat(cleanedString);
                    return value / 100;
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
                                        ["id","isnotempty",""]
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
                    log.debug("calculateCharges STATUS",'Total Expense:'+totalAmount);

                    return parseFloat(totalAmount);
            }

            // Calculate Core IT Expense By Account
            const getCoreITExpenseByAccount = (projectId) =>{
                    let coreITAccountArray = ['511.10', '511.11', '520.00', '521.00'];
                    let account;
                    let totalAmount = 0;
                    let chargeSearchObj = search.create({
                            type: "charge",
                            filters:
                                [
                                        ["use","anyof","Actual"],
                                        "AND",
                                        ["chargetype","anyof",EXPENSE_BASED],
                                        "AND",
                                        ["billto","anyof",projectId],
                                        "AND",
                                        ["id","isnotempty",""]
                                ],
                            columns:
                                [
                                        // search.createColumn({name: "id", label: "Charge ID"}),
                                        // search.createColumn({name: "chargedate", label: "Date"}),
                                        // search.createColumn({name: "use", label: "Charge Use"}),
                                        // search.createColumn({name: "chargetype", label: "Charge Type"}),
                                        // search.createColumn({name: "billto", label: "Client:Project"}),
                                        // search.createColumn({name: "billdate", label: "Bill Date"}),
                                        // search.createColumn({name: "billingitem", label: "Item"}),
                                        // search.createColumn({name: "quantity", label: "Quantity"}),
                                        // search.createColumn({name: "rate", label: "Rate"}),
                                        // search.createColumn({name: "currency", label: "Currency"}),
                                        // search.createColumn({name: "stage", label: "Charge Stage"}),
                                        search.createColumn({name: "amount", label: "Amount"}),
                                        search.createColumn({
                                                name: "account",
                                                join: "transaction",
                                                label: "Account"
                                        }),
                                        search.createColumn({
                                                name: "debitamount",
                                                join: "transaction",
                                                label: "Amount (Debit)"
                                        })
                                ]
                    });
                    let searchResultCount = chargeSearchObj.runPaged().count;
                    log.debug("chargeSearchObj result count",searchResultCount);

                    chargeSearchObj.run().each(function(result){
                            account = result.getValue({ name: 'account', join: 'transaction' });
                            if( coreITAccountArray.includes(account)){
                                    totalAmount += parseFloat( result.getValue({ name: 'debitamount', join: 'transaction' }));
                            }
                            return true;
                    });
                    log.debug("getCoreITExpenseByAccount STATUS",'Total CORE IT Expense Amount:'+totalAmount);

                    return totalAmount
            }

            //Calculate MarkUp Rate
            const calculateMarkUpRate = (projectParam) => {
                    let ptoMarkUpRate = 0;
                    let fringeMarkUpRate = 0;
                    let employeeSupportOHMarkUpRate = 0;
                    let generalOrgOHMarkUpRate = 0;
                    let federalSupportOHMarkUpRate = 0;
                    let gaMarkUpRate = 0;
                    let coreITMarkUpRate = 0;
                    let opsFeeMarkUpRate = 0;

                    // Get The Expense Amount
                    let expenses = parseFloat( calculateCharges(projectParam.projectId, EXPENSE_BASED) );

                    //Calculate PTO MarkUp
                //     if( dataValidation( projectParam.ptoRate ) ){
                //             ptoMarkUpRate = projectParam.ptoRate * projectParam.laborCostRate;
                //     }

                    //Calculate Fringe MarkUp
                    if( dataValidation( ptoMarkUpRate ) && dataValidation( projectParam.fringeRate ) ){
                            fringeMarkUpRate = ( projectParam.laborCostRate + ptoMarkUpRate ) * projectParam.fringeRate ;
                    }

                    //Calculate Employee Support OH MarkUp Rate
                    if( dataValidation( ptoMarkUpRate ) && dataValidation( projectParam.employeeSupportOHRate ) ){
                            employeeSupportOHMarkUpRate = ( projectParam.laborCostRate + ptoMarkUpRate ) * projectParam.employeeSupportOHRate ;
                            opsFeeMarkUpRate += employeeSupportOHMarkUpRate;
                    }

                    //Calculate General Org OH MarkUp Rate
                    if( dataValidation( ptoMarkUpRate ) && dataValidation( fringeMarkUpRate ) && dataValidation( projectParam.generalOrgOHRate ) && dataValidation( expenses ) ){
                            generalOrgOHMarkUpRate = ( projectParam.laborCostRate + ptoMarkUpRate + fringeMarkUpRate + expenses ) * projectParam.generalOrgOHRate ;
                            opsFeeMarkUpRate += generalOrgOHMarkUpRate;
                    }

                    //Calculate Federal Support OH MarkUp Rate
                    if( dataValidation( ptoMarkUpRate ) && dataValidation( fringeMarkUpRate ) && dataValidation( projectParam.federalSupportOHRate ) && dataValidation( expenses ) ){
                            federalSupportOHMarkUpRate = ( projectParam.laborCostRate + ptoMarkUpRate + fringeMarkUpRate + expenses ) * projectParam.federalSupportOHRate ;
                            opsFeeMarkUpRate += federalSupportOHMarkUpRate;
                    }

                    //Calculate G&A MarkUp Rate
                    if( dataValidation( ptoMarkUpRate ) && dataValidation( fringeMarkUpRate ) && dataValidation( employeeSupportOHMarkUpRate ) && dataValidation( generalOrgOHMarkUpRate ) && dataValidation( projectParam.gaRate ) ){
                            gaMarkUpRate = ( projectParam.laborCostRate + ptoMarkUpRate + fringeMarkUpRate + employeeSupportOHMarkUpRate + generalOrgOHMarkUpRate ) * projectParam.gaRate ;
                            opsFeeMarkUpRate += gaMarkUpRate;
                    }

                    // Calculate Labour Billing Rate
                    let labourBillingRate = projectParam.laborCostRate + ptoMarkUpRate + fringeMarkUpRate;
                    opsFeeMarkUpRate += labourBillingRate;

                    // Calculate Core IT Rate
                    if( dataValidation(projectParam.coreITRate) ){
                            let totalExpenseAmount = getCoreITExpenseByAccount(projectParam.projectId)
                            coreITMarkUpRate = totalExpenseAmount * projectParam.coreITRate
                            //opsFeeMarkUpRate += coreITMarkUpRate;
                    }

                    // Calculate Ops Fee Rate
                    if( dataValidation(projectParam.opsFeeRate) ){
                            opsFeeMarkUpRate *= projectParam.opsFeeRate;
                    }

                    return {ptoMarkUpRate,fringeMarkUpRate, labourBillingRate, employeeSupportOHMarkUpRate, generalOrgOHMarkUpRate, federalSupportOHMarkUpRate,gaMarkUpRate,coreITMarkUpRate,opsFeeMarkUpRate}
            }

            //Create Charge
            const createCharge = (chargeParam, markUpRate, chargeType, billingItem, memo ) => {

                    try {
                            let chargeRecord = record.create({
                                    type: record.Type.CHARGE,
                                    isDynamic: true
                            });
                            chargeRecord.setValue({
                                    fieldId: 'billto',
                                    value: chargeParam.projectId
                            });
                            chargeRecord.setValue({
                                    fieldId: 'stage',
                                    value: 'READY_FOR_BILLING'
                            });
                            chargeRecord.setValue({
                                    fieldId: 'chargedate',
                                    value: new Date(Date.now())
                            });
                            chargeRecord.setValue({
                                    fieldId: 'chargetype',
                                    value: chargeType
                            });
                            if( chargeType === TIME_BASED ){
                                    chargeRecord.setValue({
                                            fieldId: 'timerecord',
                                            value: chargeParam.timeEntryId
                                    });
                                    // chargeRecord.setValue({
                                    //         fieldId: 'rule',
                                    //         value: 27 //Default Time Rule
                                    // });
                            }

                            chargeRecord.setValue({
                                    fieldId: 'chargeemployee',
                                    value: chargeParam.employeeId
                            });
                            chargeRecord.setValue({
                                    fieldId: 'billingitem',
                                    value: billingItem
                                    //value: 5 // Consulting Hours
                            });

                            chargeRecord.setValue({
                                    fieldId: 'currency',
                                    value: 1 //USD
                            });
                            chargeRecord.setValue({
                                    fieldId: 'quantity',
                                    value: chargeParam.hours
                            });

                            chargeRecord.setValue({
                                    fieldId: 'rate',
                                    value: markUpRate
                            });

                            chargeRecord.setValue({
                                    fieldId: 'amount',
                                    value: ( chargeParam.hours * markUpRate)
                            });
                            chargeRecord.setValue({
                                    fieldId: 'memo',
                                    value: memo
                            });

                            let chargeId = chargeRecord.save();
                            log.debug('Charge Created', 'Charge ID: ' + chargeId);
                    } catch (e) {
                            log.error('Error creating charge', e.message);
                    }
            }

            // Calculate MarkUp or Discount
            const calculateMarkUpOrDiscount = (projectId) =>{
                    let rate = 0;
                    let chargeType;
                    let expenseBasedChargeSum = 0, timeBasedChargeSum = 0, fixedDateChargeSum = 0;
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
                                        search.createColumn({name: "custrecord_cp_markup_discount_value", label: "Markup / Discount %"}),
                                        search.createColumn({name: "custrecord_cp_markup_discount_type", label: "Charge Type"})
                                ]
                    });
                    let searchResultCount = markUpOrDiscountSearchObj.runPaged().count;
                    log.debug("calculateMarkUpOrDiscount result count",searchResultCount);

                    markUpOrDiscountSearchObj.run().each(function(result){
                            rate = calculateRatePercentage(result.getValue('custrecord_cp_markup_discount_value'));
                            chargeType = result.getValue('custrecord_cp_markup_discount_type');

                            if( dataValidation(rate) && dataValidation(chargeType)){
                                    if( chargeType === EXPENSE_BASED){
                                            expenseBasedChargeSum += calculateCharges(projectId,EXPENSE_BASED)  * rate
                                    }
                                    if( chargeType === TIME_BASED){
                                            timeBasedChargeSum += calculateCharges(projectId,TIME_BASED)  * rate
                                    }
                                    if( chargeType === FIXED_DATE){
                                            fixedDateChargeSum += calculateCharges(projectId,FIXED_DATE)  * rate
                                    }
                            }

                            return true;
                    });

                    log.debug("calculateCharges STATUS",'expenseBasedChargeSum:'+expenseBasedChargeSum+', timeBasedChargeSum:'+timeBasedChargeSum+', fixedDateChargeSum:'+fixedDateChargeSum);

                    return { expenseBasedChargeSum, timeBasedChargeSum, fixedDateChargeSum }
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