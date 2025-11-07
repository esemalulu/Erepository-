/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/record', 'N/currentRecord','N/ui/dialog','N/search'],

    function(record, currentRecord, dialog, search) {

        const fieldChanged = (context) =>{}
        const validateLine = (context) => {
            let transactionRecord = context.currentRecord;
            let sublistName = context.sublistId;


            if (sublistName === 'assignee') {
                //****************************STARTS************************************
                let projectId = transactionRecord.getValue('company');
                let projectName = transactionRecord.getText('company');
                let actualWork = parseFloat( transactionRecord.getValue('actualwork') );

                // Load the project record
                let projectLookUp = search.lookupFields({
                    type: search.Type.JOB,
                    id: projectId,
                    columns: ['custentity_cp_ptorate', 'custentity_cp_fringepercent','custentity_cp_garate','custentity_cp_indirectrate']
                });

                // Get the PTO,Fringe, G&A and Indirect values from project record
                let ptoRate = calculateRatePercentage( projectLookUp.custentity_cp_ptorate );
                let fringeRate = calculateRatePercentage( projectLookUp.custentity_cp_fringepercent );
                let gaRate = calculateRatePercentage( projectLookUp.custentity_cp_garate );
                let indirectRate = calculateRatePercentage( projectLookUp.custentity_cp_indirectrate );
                //alert('The Actual Work:'+actualWork)
                log.debug('actualWork:'+actualWork+', Rate Status','ptoRate:'+ptoRate+', fringeRate:'+fringeRate+', gaRate:'+gaRate+', indirectRate:'+indirectRate);

                alert('actualWork:'+actualWork+', ptoRate:', +ptoRate+', fringeRate:'+fringeRate+', gaRate:'+gaRate+', indirectRate:'+indirectRate)

                let lineCount = transactionRecord.getLineCount('assignee');
                //Check the number of items in the sublist
                log.debug('STATUS','Items in sublist: ' + lineCount);

                if( dataValidation( ptoRate ) && dataValidation( indirectRate ) ){
                    //oldRate used for comparison purposes
                    let oldRate = transactionRecord.getCurrentSublistValue('assignee', 'unitcost');
                    log.debug('STATUS','Old Rate: ' + oldRate);

                    let cost = parseFloat( transactionRecord.getCurrentSublistValue({ sublistId: 'assignee', fieldId: 'cost'}));

                    //Labour billing Rate = Cost Rate + PTO rate + Fringe rate.
                    let costRate = cost / actualWork + ptoRate; // (amount per pay period )/ (number of hours worked) + (PTO rate)
                    let ptoRateToCalculate = costRate * ptoRate //PTO rate = cost rate * PTO %
                    let fringeRateToCalculate = costRate * ptoRateToCalculate * indirectRate //Fringe rate = cost rate * pto rate ( cost rate * PTO %) *indirect %

                    let newRate = costRate + ptoRateToCalculate + fringeRateToCalculate;

                    log.debug('STATUS','costRate: ' + costRate+', PTO Rate To Calculate:'+ptoRateToCalculate+', Fringe Rate To Calculate:'+fringeRateToCalculate+', New Unit Cost:'+newRate);

                    transactionRecord.setCurrentSublistValue('assignee', 'unitcost', newRate)
                }

                //****************************ENDS************************************
            }

            return true;
        }

        const saveRecord = (context) =>{
            let transactionRecord = context.currentRecord;
            let sublistName = context.sublistId;


            if (sublistName === 'assignee') {
                //****************************STARTS************************************
                let projectId = transactionRecord.getValue('company');
                let projectName = transactionRecord.getText('company');
                let actualWork = transactionRecord.getValue('actualwork');

                // Load the project record
                // Load the project record
                let projectLookUp = search.lookupFields({
                    type: search.Type.JOB,
                    id: projectId,
                    columns: ['custentity_cp_ptorate', 'custentity_cp_fringepercent','custentity_cp_garate','custentity_cp_indirectrate']
                });

                // Get the PTO,Fringe, G&A and Indirect values from project record
                let ptoRate = calculateRatePercentage( projectLookUp.custentity_cp_ptorate );
                let fringeRate = calculateRatePercentage( projectLookUp.custentity_cp_fringepercent );
                let gaRate = calculateRatePercentage( projectLookUp.custentity_cp_garate );
                let indirectRate = calculateRatePercentage( projectLookUp.custentity_cp_indirectrate );

                log.debug('Rate Status','ptoRate:'+ptoRate+', fringeRate:'+fringeRate+', gaRate:'+gaRate+', indirectRate:'+indirectRate);

                let lineCount = transactionRecord.getLineCount('assignee');
                //Check the number of items in the sublist
                log.debug('STATUS','Items in sublist: ' + lineCount);

                if( dataValidation( ptoRate ) && dataValidation( indirectRate ) ){
                    for (let i = 0; i < lineCount; i++) {
                        //selectLine is used to iterate through all the items
                        transactionRecord.selectLine({ sublistId: 'assignee', line: i });

                        //oldRate used for comparison purposes
                        let oldRate = transactionRecord.getCurrentSublistValue('assignee', 'unitcost');
                        log.debug('STATUS','Old Rate: ' + oldRate);

                        let cost = parseFloat( transactionRecord.getCurrentSublistValue({ sublistId: 'assignee', fieldId: 'cost'}));

                        //Labour billing Rate = Cost Rate + PTO rate + Fringe rate.
                        let costRate = cost / actualWork + ptoRate; // (amount per pay period )/ (number of hours worked) + (PTO rate)
                        let ptoRateToCalculate = costRate * ptoRate //PTO rate = cost rate * PTO %
                        let fringeRateToCalculate = costRate * ptoRateToCalculate * indirectRate //Fringe rate = cost rate * pto rate ( cost rate * PTO %) *indirect %

                        let newRate = costRate + ptoRateToCalculate + fringeRateToCalculate;

                        log.debug('STATUS','costRate: ' + costRate+', PTO Rate To Calculate:'+ptoRateToCalculate+', Fringe Rate To Calculate:'+fringeRateToCalculate+', New Unit Cost:'+newRate);

                        transactionRecord.setCurrentSublistValue('assignee', 'unitcost', newRate)

                        transactionRecord.commitLine('assignee')
                    }
                }

                //****************************ENDS************************************
            }

            return true;
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
            const cleanedString = valueString.replace('%', '');
            // Convert string to a float number
            const value = parseFloat(cleanedString);
            return value / 100;
        }

        return {
            validateLine: validateLine,
            //fieldChanged: fieldChanged,
            //saveRecord: saveRecord,
        };

    }
);