/**
 * @author Sergio Arce - sarce@veic.org
 * @date   11/15/24
 * Script File:	overtime_laws_extra_functions.js
 * Script Name:	overtime_laws_extra_functions.js
 * Script Type:	Library
 * Description:	This will have all the extra functions for the Overtime Laws project 
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 11/15/24   Sergio Arce        File Creation
 * 04/02/25   Sergio Arce        Added the field Labor Cost Audit Log Record into the logic of the function updateEmployeeRecord
 */

define(['N/record', 'N/search'], function (record,search) {

    function getLocationId( workLocation){

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
        
        workLocationSearchObj.run().each(function(result){
            workLocationId = result.getValue('internalid');
            return true;
        });

        return workLocationId;
    }

    function getDatesFromAdjustedSalariedCostRateControl ( employeeContractType, jobCostType){
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
        
        customrecord_cp_adjusted_sal_cost_rateSearchObj.run().each(function(result){
            fromDate = result.getValue('custrecord_cp_adjsc_date_from');
            toDate = result.getValue('custrecord_cp_adjsc_date_to');
            return true;
        });

        return {fromDate,toDate};

    }

    function calculateProjectDurationSumByEmployeeAndProject (employee, employeeId, employeeContractType, jobCostType){
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

    function calculateDailyProjectDurationSumByEmployeeAndProject (employee, employeeId, employeeContractType, jobCostType) {
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

    function calculateDailyProjectDurationSumByEmployeeAndProjectValues (employeeId, employeeContractType, jobCostType) {
        //log.debug('calculateDailyProjectDurationSumByEmployeeAndProjectValues', employeeId+' - '+employeeContractType+' - '+jobCostType)
        let costRateControlObject = getDatesFromAdjustedSalariedCostRateControl( employeeContractType, jobCostType);
        let fromDate = costRateControlObject.fromDate;
        let toDate = costRateControlObject.toDate;

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
                    search.createColumn({ name: "internalid", label: "Internal ID"}),
                    search.createColumn({ name: "employee", label: "Employee"}),
                    search.createColumn({ name: "durationdecimal", label: "Duration (Decimal)" }),
                    search.createColumn({ name: "date", label: "Date" })
                ]
        });

        let tbCount = dailyDurationObj.runPaged().count;
        let searchResults = dailyDurationObj.run().getRange({start:0,end:tbCount});
        let timeBillData = [];
        for (let i = 0 ; i<searchResults.length;i++){
            let tbId = searchResults[i].getValue({name:'internalid'});
            let employee = searchResults[i].getValue({name:'employee'});
            let durationDecimal = searchResults[i].getValue({name:'durationdecimal'});
            let date = searchResults[i].getValue({name:'date'});
            timeBillData.push({"tbId": tbId, 'employee': employee, 'durationDecimal': durationDecimal, 'date': date});      
        }
        
        log.debug('timeBillData', timeBillData);
        return timeBillData;
    }

    function updateTimesheet (employee, employeeId, employeeContractType, jobCostType, adjustedLabourCostRate) {
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

    function updateTaskUnitCost (employeeId,taskId,adjustedLabourCostRate) {

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

    function getExtraTimeValues(workLocation, category){
        let customrecord_cp_emp_overtime_lawsSearchObj = search.create({
            type: "customrecord_cp_emp_overtime_laws",
            filters:
                [
                    ["custrecord_cp_cusrec_work_location","anyof",workLocation],
                    "AND",
                    ["custrecord_cp_cusrec_std_special","anyof",category]
                ],
            columns:
                [
                    search.createColumn({name: "custrecord_cusrec_ot_rate", label: "Overtime Rate"}),
                    search.createColumn({name: "custrecord_cusrec_dt_rate", label: "Doubletime Rate"}),
                ]
        });
        let searchResultCount = customrecord_cp_emp_overtime_lawsSearchObj.runPaged().count;
        let searchResults = customrecord_cp_emp_overtime_lawsSearchObj.run().getRange({start:0,end:searchResultCount});
        let extraTimeData = [];
        for (let i = 0 ; i<searchResults.length;i++){
            let hrRateOT = searchResults[i].getValue({name:'custrecord_cusrec_ot_rate'});
            let hrRateDT = searchResults[i].getValue({name:'custrecord_cusrec_dt_rate'});
        
            extraTimeData.push({"hrRateOT": hrRateOT, 'hrRateDT': hrRateDT});   
        }
        
        log.debug('extraTimeData', extraTimeData);
        return extraTimeData;
    }

    function updateEmployeeRecord (employeeId, adjustedLabourCostRate, newLCALRecId){
        try {
            if (adjustedLabourCostRate) {
                // Save the employee record
                record.submitFields({
                    type: record.Type.EMPLOYEE,
                    id: employeeId,
                    values: { 
                        "laborcost":adjustedLabourCostRate,
                        "custentity_veic_lcal_rec":newLCALRecId 
                    },
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

    function specialStateCheck(worklocation){
        let customrecord_cp_emp_overtime_lawsSearchObj = search.create({
            type: "customrecord_cp_emp_overtime_laws",
            filters:
            [
               ["custrecord_cp_cusrec_work_location","anyof",worklocation]
            ],
            columns:
            [
               search.createColumn({name: "custrecord_cp_cusrec_std_special", label: "Standard Or Special"})
            ]
         });

        let searchResult = customrecord_cp_emp_overtime_lawsSearchObj.run().getRange({ start: 0, end: 1 });
        let special = '';

        if (searchResult.length > 0) {
            special = searchResult[0].getValue({ name: 'custrecord_cp_cusrec_std_special' });
        } 

        return special;
    }

    //The calculation of OT for:
    //Special States: Oregon and Colorado
    //and all the Regular States is going to be the same
    function calculateOvertime(workedHrs, totalHrs) {
        // Calculate the sum of worked hours from position 0 all the way to position 6
        let sumWorkedHrs = workedHrs.reduce((acc, hours) => acc + hours, 0);

        // Calculate the final result sumWorkedHrs - totalHrs)
        let result = sumWorkedHrs - totalHrs;
        
        return result;
    }

    return {
        getLocationId: getLocationId,
        getDatesFromAdjustedSalariedCostRateControl: getDatesFromAdjustedSalariedCostRateControl,
        calculateProjectDurationSumByEmployeeAndProject: calculateProjectDurationSumByEmployeeAndProject,
        calculateDailyProjectDurationSumByEmployeeAndProject: calculateDailyProjectDurationSumByEmployeeAndProject,
        calculateDailyProjectDurationSumByEmployeeAndProjectValues: calculateDailyProjectDurationSumByEmployeeAndProjectValues,
        updateTimesheet: updateTimesheet,
        getExtraTimeValues: getExtraTimeValues,
        updateEmployeeRecord: updateEmployeeRecord,
        specialStateCheck: specialStateCheck,
        calculateOvertime: calculateOvertime
    }
});

