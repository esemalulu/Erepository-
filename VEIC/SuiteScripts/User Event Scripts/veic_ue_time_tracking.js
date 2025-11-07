/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript

 * @author Sergio Arce - sarce@veic.org
 * @date   12/26/24
 * Script File:	veic_ue_time_tracking.js
 * Script Name:	veic_ue_time_tracking.js
 * Script Type:	UserEventScript
 * Description:	This will be the main User Event for the Time Tracking Record
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 12/26/24   Sergio Arce        File Creation
 * 01/06/25   Sergio Arce        Line Logic
 */

 define(['N/record', 'N/search', 'N/task', 'SuiteScripts/Lib/veic_master_lib.js'],(record, search, task, lib) => {    
    const beforeSubmit = (scriptContext) => {
        try{
            if (scriptContext.type === 'post'){
                let ttRec = scriptContext.newRecord;

                let tranId = ttRec.getValue({
                    fieldId: 'transactionid'
                });

                if(lib.isNotEmpty(tranId)){
                    let employee = ttRec.getValue({
                        fieldId: 'employee'
                    });
                    
                    let timeSheet = ttRec.getValue({
                        fieldId: 'timesheet'
                    });
                   
                    //Here we are going to update the JE Record
                    //updateJERec(tranId, timeSheet, employee);
                    
                }
             }
        }catch(ex){
            log.error({
                title: 'Error on beforeSubmit',
                details: ex.message
            });
        }
    }

    function getLaborCostByEmployee(employeeId){
        let employeeSearchObj = search.create({
            type: "employee",
            filters:
            [
               ["internalid","anyof",employeeId]
            ],
            columns:
            [
               search.createColumn({name: "laborcost", label: "Labor Cost"})
            ]
         });

         let searchResult = employeeSearchObj.run().getRange({ start: 0, end: 1 });
        let laborCost = 0;

        if (searchResult.length > 0) {
            laborCost = searchResult[0].getValue({ name: 'laborcost' });
        } 

        return laborCost;
    }

    function updateJERec(jeRecId, timeSheet, employee){
        try{
            let jeRec = record.load({
                type: record.Type.JOURNAL_ENTRY,
                id: jeRecId
            });

            // let timeSheetValue = jeRec.getValue({
            //     fieldId: 'custbody_veic_timesheet_rec'
            // });

            // let laborCostValue = jeRec.getValue({
            //     fieldId: 'custbody_veic_labor_cost'
            // });

            let pto = jeRec.getValue({
                fieldId: 'custbody_veic_pto_p'
            });

            
            let flag = false;
            // if(!lib.isNotEmpty(timeSheetValue)){
            //     jeRec.setValue({
            //         fieldId: 'custbody_veic_timesheet_rec',
            //         value: timeSheet
            //     });

            //     flag = true;

            // }

            // if(!lib.isNotEmpty(laborCostValue)){
            //     let laborCost = getLaborCostByEmployee(employee);

            //     jeRec.setValue({
            //         fieldId: 'custbody_veic_labor_cost',
            //         value: laborCost
            //     });
            // }

            if(!lib.isNotEmpty(pto)){
                jeRec.setValue({
                    fieldId: 'custbody_veic_pto_p',
                    value: true
                });
                flag = true;
            }
            
            if(flag){
                log.debug('Transaction Id', "jeRecId: "+jeRecId);
                let jeCount = jeRec.getLineCount({
                    sublistId: 'line'
                });

                let ttData = timeTrackingData(jeRecId);
                for (let ii = 0; ii < jeCount; ii++) {
                    let debit = jeRec.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'debit',
                        line: ii
                    });

                    let credit = jeRec.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'credit',
                        line: ii
                    });

                    let lineJE = jeRec.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'line',
                        line: ii
                    });

                    for (let i = 0; i < ttData.length; i++) {
                        const ttDataF = ttData[i];
                    
                        let internalid = ttDataF.internalid;
                        let memo = ttDataF.memo;
                        let hours = ttDataF.hours;
                        let hrsValue = ttDataF.hrTransformation;
                        let laborCost = ttDataF.laborCost;
                        let date = ttDataF.date;
                        let total = ttDataF.total;
                        let type = ttDataF.type;
                        let line = ttDataF.line;
                        let timesheet = ttDataF.timesheet;
                      
                        //if ((debit == total || credit == total) && lineJE == line) {
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
                                value: internalid
                            });
                        }
                    }
                }
        
                jeRec.save();

                log.debug('How many times?', 'times');
            }

        }catch(ex){
            log.error({
                title: 'Error on afterSubmit',
                details: ex.message
            });
        }
    }

    function timeTrackingData(jeRecId){
        let timebillSearchObj = search.create({
            type: "timebill",
            filters:
            [
            //    ["timesheet.internalid","anyof",ttID],
            //     "AND", 
               ["posted","is","T"],
               "AND", 
               ["journal.internalid","anyof",jeRecId]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}),
               search.createColumn({name: "memo", label: "Note"}),
               search.createColumn({name: "hours", label: "Duration"}),
               search.createColumn({ name: "laborcost", join: "employee", label: "Labor Cost" }),
               search.createColumn({name: "date", label: "Date"}),
               search.createColumn({name: "timesheet", label: "Timesheet"})
            ]
         });
         let searchResultCount = timebillSearchObj.runPaged().count;
         let searchResults = timebillSearchObj.run().getRange({start:0,end:searchResultCount});
         let ttData = [];
         for (let i = 0 ; i<searchResults.length;i++){
             let internalid = searchResults[i].getValue({name:'internalid'});
             let memo = searchResults[i].getValue({name:'memo'});
             let hours = searchResults[i].getValue({name:'hours'});
             let laborCost = searchResults[i].getValue({name: "laborcost", join: "employee"});
             let date = searchResults[i].getValue({name:'date'});
             let timesheet = searchResults[i].getValue({name:'timesheet'});
         
            // Example usage:
            let hrTransformation = convertTimeStringToFloat(hours);
            let total = (hrTransformation * laborCost).toFixed(2);
            //log.debug('total', total);
            // console.log(result); // Outputs: 3.25
             ttData.push({
                "jeRecId": jeRecId,
                "internalid": internalid, 
                "memo": memo, 
                "hours": hours,
                "hrTransformation": hrTransformation,
                "laborCost": laborCost,
                "total": total,
                "date": date, 
                "timesheet": timesheet,
                "type": "debit",
                "line": ""
             });

             ttData.push({
                "jeRecId": jeRecId,
                "internalid": internalid, 
                "memo": memo, 
                "hours": hours,
                "hrTransformation": hrTransformation,
                "laborCost": laborCost,
                "total": total,
                "date": date, 
                "timesheet": timesheet,
                "type": "credit",
                "line": ""
             });
         }

        //Looping the array again to assign a line
        for (let i = 0; i < ttData.length; i++) {
            ttData[i].line = i; // Assign the index (i) to the 'line' property
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

    return {
        beforeSubmit: beforeSubmit
    }
});