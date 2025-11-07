/**
 * @author Sergio Arce - sarce@veic.org
 * @date   01/15/25
 * Script File:	pto_percentage_lib.js
 * Script Name:	pto_percentage_lib.js
 * Script Type:	Library
 * Description:	This will have all the functions/logic related to PTO %
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 01/15/25   Sergio Arce        File Creation
 * 02/24/25   Sergio Arce        Added the criteria to filter by project on account 500 and 508
 */

define(['N/record', 'N/search', 'N/error', 'SuiteScripts/Lib/veic_master_lib.js'], function (record, search, error, lib) {

    function dateValidation(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {

            log.error({
                title: 'Invalid Value Detected',
                details: 'The field value is invalid and the record cannot be submitted.'
            });
              
          throw error.create({
            name: 'Invalid Date Range',
            message: 'From date must be before or equal to the As-Of Date',
            notifyOff: false
        });
        } 
    }

    function getMonthsBetween(startDate, endDate) {
        // List of months starting from "Jan" to "Dec"
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Parse the input date strings into Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);
      
        // Array to hold the formatted months
        const result = [];
      
        // Loop through each month between start and end
        let current = new Date(start);
        while (current <= end) {
          // Get the month and year
          const monthName = months[current.getMonth()]; // Get month name from array
          const year = current.getFullYear();
          
          // Push the formatted string in "Mon YYYY" format to the result array
          let nameM = monthName+" "+year;
          result.push(nameM);
      
          // Move to the next month
          current.setMonth(current.getMonth() + 1);
        }
      
        return result;
    }

    function getPostingPeriodId(postingPeriodName){
        let accountingperiodSearchObj = search.create({
        type: "accountingperiod",
        filters:
        [
        ["periodname","startswith",postingPeriodName]
        ],
        columns:
        [
        search.createColumn({name: "internalid", label: "Internal ID"})
        ]
        });

        let searchResult = accountingperiodSearchObj.run().getRange({ start: 0, end: 1 });
        let ppId = 0;
        if (searchResult.length > 0) {
        ppId = searchResult[0].getValue({ name: 'internalid' });
        } 

        return ppId;
    }

    function postingPeriodLogicForAccount508(startDate, endDate){
        let postingPeriodNameRange = getMonthsBetween(startDate, endDate);
        const ppIds = [];
        for (let i = 0; i < postingPeriodNameRange.length; i++) {
            ppIds.push(getPostingPeriodId(postingPeriodNameRange[i]));
          }

          log.debug('ppIds', ppIds);
          return ppIds
    }

    function totalForAccount508(ppIds, projectId){
        let journalentrySearchObj = search.create({
            type: "journalentry",
            filters:
            [
               ["mainline","is","T"], 
               "AND", 
               ["type","anyof","Journal"], 
               "AND", 
               ["account","anyof","326"], 
               "AND", 
               ["custbody_veic_pto_p","is","T"], 
               "AND", 
               ["accountingperiod.internalid","anyof",ppIds],
               "AND", 
               ["name","anyof",projectId]
            ],
            columns:
            [
               search.createColumn({
                  name: "debitamount",
                  summary: "SUM",
                  label: "Amount (Debit)"
               })
            ]
        });

        let searchResult = journalentrySearchObj.run().getRange({ start: 0, end: 1 });
        let total508 = 0;
        if (searchResult.length > 0) {
            total508 = searchResult[0].getValue({ name: "debitamount", summary: "SUM", label: "Amount (Debit)" });
        } 

        log.debug('total508', total508);
 
         return total508;
    }

    function totalForAccount500(startDate, endDate, projectId){
        log.debug('totalForAccount500 - Dates', lib.formatDate(startDate)+" - "+lib.formatDate(endDate));
        let journalentrySearchObj = search.create({
            type: "journalentry",
            filters:
            [
               ["mainline","is","T"], 
               "AND", 
               ["type","anyof","Journal"], 
               "AND", 
               ["account","anyof","322"], 
               "AND", 
               ["custbody_veic_pto_p","is","T"], 
               "AND", 
               ["custcol_veic_je_timesheet_date","within",lib.formatDate(startDate),lib.formatDate(endDate)],
               "AND", 
               ["name","anyof",projectId]
               //["custcol_veic_je_timesheet_date","within","09/11/2024","10/04/2024"]
            ],
            columns:
            [
               search.createColumn({
                  name: "debitamount",
                  summary: "SUM",
                  label: "Amount (Debit)"
               })
            ]
         });

        let searchResult = journalentrySearchObj.run().getRange({ start: 0, end: 1 });
        let total500 = 0;
        if (searchResult.length > 0) {
            total500 = searchResult[0].getValue({ name: "debitamount", summary: "SUM", label: "Amount (Debit)" });
        } 

        log.debug('total500', total500);
 
         return total500;
    }

    function ptoPercentageMasterLogic(invId, projectId){
        let invRec = record.load({
            type: record.Type.INVOICE,
            id: invId
        });

        let fromDate = invRec.getValue({
            fieldId: 'custbody_from_date'
        });
        
        let asOfDate = invRec.getValue({
            fieldId: 'asofdate'
        });

        let project = invRec.getValue({
            fieldId: 'job'
        });

        //Here we are doing the validation of the dates
        dateValidation(fromDate, asOfDate);

        if(lib.isNotEmpty(fromDate) && lib.isNotEmpty(asOfDate)){
            //508 Logic
            let ppIds = postingPeriodLogicForAccount508(fromDate, asOfDate);
            let total508 = totalForAccount508(ppIds, projectId);

            //508 Logic
            let total500 = totalForAccount500(fromDate, asOfDate, projectId);

            let ptoP = ((total508 / total500) * 100).toFixed(2);

            log.debug('PTO %', ptoP);

            let projectRecord = record.load({
                type: record.Type.JOB,
                id: project
            });

            projectRecord.setValue({
                fieldId: 'custentity_cp_ptorate',
                value: ptoP
            });

            projectRecord.save();
            
        }

    }

    return {
        // dateValidation: dateValidation,
        // postingPeriodLogicForAccount508: postingPeriodLogicForAccount508,
        // totalForAccount508: totalForAccount508,
        // totalForAccount500: totalForAccount500
        ptoPercentageMasterLogic: ptoPercentageMasterLogic
    }
});

