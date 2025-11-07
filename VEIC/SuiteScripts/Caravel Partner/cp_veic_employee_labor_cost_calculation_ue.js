/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record'],

    (record) => {

        const beforeLoad = (context) => {
            try{
                if (context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT ){
                    const recordObject = context.newRecord;
                    const recordObjectId = recordObject.id;

                    const shipToAddress = recordObject.getValue('custbody_bio_log_ship_to_address');

                    if(dataValidation(shipToAddress)){
                        context.form.addButton({
                            id: "custpage_adjusted_calculation",
                            label: "Calculate Adjusted Rate",
                            functionName: 'printPDF(' + recordObjectId + ',"pdf")'
                        });
                    }
                    context.form.clientScriptModulePath = "SuiteScripts/Caravel Partner/cp_veic_adjusted_calculation_button_cs.js";
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