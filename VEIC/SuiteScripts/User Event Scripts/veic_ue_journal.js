/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript

 * @author Sergio Arce - sarce@veic.org
 * @date   09/12/24
 * Script File:	veic_ue_journal.js
 * Script Name:	veic_ue_journal.js
 * Script Type:	UserEventScript
 * Description:	This will be the main User Event for the Journal Entry Record
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 10/29/24   Sergio Arce        File Creation
 * 12/31/24   Sergio Arce        Updated the account validation and cleanup of the script
 * 01/06/25   Sergio Arce        Line Logic
 * 01/20/25   Sergio Arce        Added the Employee, Start Date and End Date logic
 * 04/03/25   Sergio Arce        Commented out the account logic - line 74
 */

 define(['N/record', 'N/search', 'SuiteScripts/Lib/veic_master_lib.js'],(record, search, lib) => {
    const afterSubmit = (scriptContext) => {
        try{
            // log.debug('scriptContext.type', scriptContext.type);
            let jeRecId = scriptContext.newRecord.id;
            let jeRec = record.load({
                type: record.Type.JOURNAL_ENTRY,
                id: jeRecId
            });
            if (scriptContext.type === scriptContext.UserEventType.CREATE){
                

                //For testing purposes only
                // jeRec.setValue({
                //     fieldId: 'custbody_veic_pto_p',
                //     value: true
                // });

                
                let createdFromTimeEntry = jeRec.getValue({
                    fieldId: 'timebillflag'
                });

                let jeCount = jeRec.getLineCount({
                    sublistId: 'line'
                });
                
                let ttData = '';
                if(createdFromTimeEntry == 'T'){
                    ttData = timeTrackingData(jeRecId);
                }

                for (let ii = 0; ii < jeCount; ii++) {
                    let account = jeRec.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        line: ii
                    });
                    
                    let project = jeRec.getSublistValue({
                        sublistId: 'line', 
                        fieldId: 'entity',
                        line: ii
                    });

                    let lineJE = jeRec.getSublistValue({
                        sublistId: 'line', 
                        fieldId: 'line',
                        line: ii
                    });

                    // if(account == '214'){
                    //     //log.debug('account NS12', 'This account is the NS12');
                    //     //Here I am going to load the project
                    //     let account = checkAccountForProject(project);
                    //     if(lib.isNotEmpty(account)){
                    //         jeRec.setSublistValue({sublistId:"line",fieldId:"account",line:ii,value:account})
                    //     }else{
                    //         jeRec.setSublistValue({sublistId:"line",fieldId:"account",line:ii,value:322})
                    //     }
                    // }

                    if(lib.isNotEmpty(ttData)){
                        for (let i = 0; i < ttData.length; i++) {
                            const ttDataF = ttData[i];
                        
                            let timeId = ttDataF.timeId;
                            let memo = ttDataF.memo;
                            let hours = ttDataF.hours;
                            let hrsValue = ttDataF.hrTransformation;
                            let laborCost = ttDataF.laborCost;
                            let date = ttDataF.date;
                            let line = ttDataF.line;
                            let timesheet = ttDataF.timesheet;
                            let employee = ttDataF.employee;
                            let startDate = ttDataF.startDate;
                            let endDate = ttDataF.endDate;

                            if (lineJE == line) {
                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"memo",
                                    line:ii,
                                    value: memo
                                });

                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"custcol_veic_je_timesheet_hrs",
                                    line:ii,
                                    value: hours
                                });

                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"custcol_veic_je_timesheet_hrs_value",
                                    line:ii,
                                    value: hrsValue
                                });

                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"custcol_veic_labor_cost",
                                    line:ii,
                                    value: laborCost
                                });

                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"custcol_veic_timesheet_rec",
                                    line:ii,
                                    value: timesheet
                                });

                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"custcol_veic_je_timesheet_date",
                                    line:ii,
                                    value:new Date(date)
                                });

                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"custcol_veic_time_tracking_rec",
                                    line:ii,
                                    value: timeId
                                });

                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"custcol_veic_employee_rec_je",
                                    line:ii,
                                    value: employee
                                });

                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"custcol_veic_date_range_start",
                                    line:ii,
                                    value: new Date(startDate)
                                });

                                jeRec.setSublistValue({
                                    sublistId:"line",
                                    fieldId:"custcol_veic_date_range_end",
                                    line:ii,
                                    value: new Date(endDate)
                                });
                            }
                        }
                    }
                }

                jeRec.save();
            }

        }catch(ex){
            log.error({
                title: 'Error on afterSubmit',
                details: ex.message
            });
        }
    }

    function checkAccountForProject(projectID){
        let jobSearchObj = search.create({
            type: "job",
            filters:
            [
               ["internalid","anyof",projectID]
            ],
            columns:
            [
               search.createColumn({name: "custentity_veic_account", label: "Account"})
            ]
         });

        let searchResult = jobSearchObj.run().getRange({ start: 0, end: 1 });
        let account = '';

        if (searchResult.length > 0) {
            account = searchResult[0].getValue({ name: 'custentity_veic_account' });
        } 

        return account;
    }

    function timeTrackingData(jeRecId){
        var journalentrySearchObj = search.create({
            type: "journalentry",
            filters:
            [
               ["type","anyof","Journal"], 
               "AND", 
               ["internalid","anyof",jeRecId]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}),
               search.createColumn({name: "line", label: "Line ID"}),
               search.createColumn({
                  name: "memo",
                  join: "time",
                  label: "Note"
               }),
               search.createColumn({
                  name: "hours",
                  join: "time",
                  label: "Duration"
               }),
               search.createColumn({
                  name: "laborcost",
                  join: "time",
                  label: "Labor Cost"
               }),
               search.createColumn({
                  name: "date",
                  join: "time",
                  label: "Date"
               }),
               search.createColumn({
                  name: "internalid",
                  join: "time",
                  label: "Internal ID"
               }),
               search.createColumn({
                  name: "timesheet",
                  join: "time",
                  label: "Timesheet"
               }),
               search.createColumn({
                name: "employee",
                join: "time",
                label: "Employee"
               }),
               search.createColumn({
                name: "startdate",
                join: "CUSTCOL_VEIC_TIMESHEET_REC",
                label: "Start Date"
               }),
               search.createColumn({
                name: "enddate",
                join: "CUSTCOL_VEIC_TIMESHEET_REC",
                label: "End Date"
               })
            ]
         });
         let searchResultCount = journalentrySearchObj.runPaged().count;
         let searchResults = journalentrySearchObj.run().getRange({start:0,end:searchResultCount});
         let ttData = [];
         for (let i = 0 ; i<searchResults.length;i++){
             let line = searchResults[i].getValue({name: "line", label: "Line ID"});
             let timeId = searchResults[i].getValue({name: "internalid", join: "time", label: "Internal ID"});
             let memo = searchResults[i].getValue({name: "memo", join: "time", label: "Note"});
             let hours = searchResults[i].getValue({name: "hours", join: "time", label: "Duration"});
             let laborCost = searchResults[i].getValue({name: "laborcost", join: "time", label: "Labor Cost"});
             let date = searchResults[i].getValue({name: "date", join: "time", label: "Date"});
             let timesheet = searchResults[i].getValue({name: "timesheet", join: "time", label: "Timesheet"});
             let employee = searchResults[i].getValue({name: "employee", join: "time", label: "Employee"});
             
            
            // Example usage:
            let hrTransformation = convertTimeStringToFloat(hours);
            if(lib.isNotEmpty(timeId)){
                //Date Range Logic Begins
                let timesheetDR = getWeekStartAndEnd(lib.formatDate(date));
                log.debug('timesheetDR', timesheetDR);
                //Date Range Logic Ends

                ttData.push({
                "jeRecId": jeRecId,
                "line": line,
                "memo": memo, 
                "hours": hours,
                "hrTransformation": hrTransformation,
                "laborCost": laborCost,
                "date": date,
                "timeId": timeId,
                "timesheet": timesheet,
                "employee": employee,
                "startDate": timesheetDR.startDate,
                "endDate": timesheetDR.endDate
                });
            }
         }

        log.debug('ttData', ttData);
         
         return ttData;
    }

    function convertTimeStringToFloat(timeString) {
        // Split the time string by the colon
        let [hours, minutes] = timeString.split(':').map(Number);
    
        // Convert the time into a float
        return hours + (minutes / 60);
    }

    function getWeekStartAndEnd(dateStr) {
        // Parse the given date string into a Date object
        const inputDate = new Date(dateStr);
    
        // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        const dayOfWeek = inputDate.getDay();
    
        // Calculate the difference in days to get to the Monday (start of the week)
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; // If Sunday (0), go back 6 days; otherwise, go back to Monday
    
        // Get the start date (Monday)
        const startDate = new Date(inputDate);
        startDate.setDate(inputDate.getDate() + diffToMonday);
    
        // Get the end date (Sunday)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Sunday is 6 days after Monday
    
        // Format the dates as MM/DD/YYYY
        const formatDate = (date) => {
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const year = date.getFullYear();
            
            return month+'/'+day+'/'+year;
        };
    
        return {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
        };
    }

    return {
        afterSubmit: afterSubmit
    }
});


