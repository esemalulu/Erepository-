/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @author Caravel
 * @date   09/12/24
 * Script File:	cp_veic_adjusted_calculation_button_ue.js
 * Script Name:	cp_veic_adjusted_calculation_button_ue.js
 * Script Type:	Library
 * Description:	This will be the main User Event for the Journa Record
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 09/24/24   Abiola Taiwo       File Creation
 * 10/29/24   Sergio Arce        Moved this logic from the project to the Invoice Record
 */
define(['N/record', 'SuiteScripts/Lib/veic_master_lib.js'],

    (record, lib) => {

        const beforeLoad = (context) => {
            try{
                if (context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT ){
                    const recordObject = context.newRecord;
                    const invoiceId = context.newRecord.id;

                    //Now in here we are going to grab the Project ID
                    const recordObjectId = recordObject.getValue({
                        fieldId: 'job'
                    });

                    if(lib.isNotEmpty(recordObjectId)){
                        // Load the Project Record
                        let projectRecord = record.load({
                            type: record.Type.JOB,
                            id: recordObjectId
                        });

                        const costReimbursement = new Boolean(projectRecord.getValue('custentity_cp_cost_reimbursement')) ;
                        log.debug('beforeLoad costReimbursement','costReimbursement:'+costReimbursement)

                        if(costReimbursement){
                            context.form.addButton({
                                id: "custpage_adjusted_calculation",
                                label: "Calculate Cost Reimbursable",
                                functionName: 'calculateAdjustedRate(' + recordObjectId + ', ' + invoiceId + ')'
                            });
                        }
                        context.form.clientScriptModulePath = "SuiteScripts/Caravel Partner/cp_veic_adjusted_calculation_button_cs.js";
                    }
                }
            }catch (e) { log.debug('Error', e.message) }

        }

        const beforeSubmit = (context) => {}

        const afterSubmit = (context) => {}

        //Data Validation
        const dataValidation = (value) => {
            if (value != null && value != '' && value != undefined && value.toString() != 'NaN' && value != NaN && value != 'undefined' && value!= "- None -") {
                return true;
            } else {
                return false;
            }
        }

        return {beforeLoad}

    });