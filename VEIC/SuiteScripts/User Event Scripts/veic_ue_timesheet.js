/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript

 * @author Sergio Arce - sarce@veic.org
 * @date   06/24/25
 * Script File:	veic_ue_timesheet.js
 * Script Name:	veic_ue_timesheet.js
 * Script Type:	User Event
 * Description:	This will be the main User Event for the Timesheet Record
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 06/24/25   Sergio Arce        File Creation
 */

 define(['N/record', 'N/search', 'SuiteScripts/Lib/veic_master_lib.js', 'SuiteScripts/Lib/PTO_Percentage/pto_percentage_lib.js'],(record, search, lib, ptoLib) => {
    const beforeLoad = (scriptContext) => {
        //if(scriptContext.type === 'view') {

            let form = scriptContext.form;
            // Remove the print button from the form
            var subtab = form.getSubtab({ id: 'plannedtime' });
                if (subtab) {
                    subtab.isHidden = true;
                    log.debug('Success', 'Planned Time subtab hidden for non-admin');
                } else {
                    log.debug('Not Found', 'Planned Time subtab not found on the form');
                }

            //form.getSubtab({ id: 'actions' }).isHidden = true;

            // scriptContext.form.clientScriptFileId = getFileId();

            // scriptContext.form.addButton({
            //     id: 'custpage_invoice_print_pdf',
            //     label: 'Print Invoice',
            //     functionName: 'callPDf(' + scriptContext.newRecord.id + ')'
            // });

            // scriptContext.form.addButton({
            //     id: 'custpage_invoice_download_excel',
            //     label: 'Download Invoice Excel',
            //     functionName: 'downloadExcel(' + scriptContext.newRecord.id + ')'
            // });

        //}
    }
    const beforeSubmit = (scriptContext) => {
        try{
            if (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.EDIT){
                let invRec = scriptContext.newRecord;
                
                let fromDate = invRec.getValue({
                    fieldId: 'custbody_from_date'
                });
                
                let asOfDate = invRec.getValue({
                    fieldId: 'asofdate'
                });

                //Here we are doing the validation of the dates
                // ptoLib.dateValidation(fromDate, asOfDate);

                // if(lib.isNotEmpty(fromDate) && lib.isNotEmpty(asOfDate)){
                //     //508 Logic
                //     let ppIds = ptoLib.postingPeriodLogicForAccount508(fromDate, asOfDate);
                //     let total508 = ptoLib.totalForAccount508(ppIds);

                //     //508 Logic
                //     let total500 = ptoLib.totalForAccount500(fromDate, asOfDate);

                //     let ptoP = ((total508 / total500) * 100).toFixed(2);

                //     log.debug('PTO %', ptoP);
                // }

            }

        }catch(e){
            log.error({
                title: 'Error on BeforeSubmit',
                details: e.message
            });

            throw e;
        }
    }

         //With this function we are getting the script id without having it as default or parameter.
         function getFileId() {
            try {
                let fileSearchObj = search.create({
                    type: "file",
                    filters: [
                        ["name", "is", "veic_cl_invoice.js"]
                    ],
                    columns: [
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
                });

                let searchResult = fileSearchObj.run().getRange({
                    start: 0,
                    end: 100
                });

                let file_Id = 0;
                for (let i = 0; i < searchResult.length; i++) {
                    let fileId = searchResult[0].getValue({
                        name: "internalid"
                    });

                    file_Id = parseInt(fileId);
                }

                return file_Id;

            } catch (e) {
                log.audit("error", e);
            }
        }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit
    }
});