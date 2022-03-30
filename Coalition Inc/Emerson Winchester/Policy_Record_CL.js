/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(["N/currentRecord", "N/email", "N/log", "N/record", "N/search"],

    function(currentRecord, email, log, record, search) {

        function lineInit(context) {
            // context.currentRecord;
            // context.sublistId;
            return;
        }

        function pageInit(context) {
            // context.currentRecord;
            // context.mode;
            return;
        }

        function postSourcing(context) {
            // context.currentRecord;
            // context.sublistId;
            // context.fieldId;
            return;
        }

        function saveRecord(ctx) {
            // context.currentRecord;

            var contSaving = true;
            var cRecord = ctx.currentRecord;
            var notice = cRecord.getValue({
                fieldId: 'custrecord_binder_edit_notification'
            });
            var jeProcess = cRecord.getValue({
                fieldId: 'custrecord_je_so_lines_processed'
            });
            var nonGlBinderEdit = cRecord.getValue({
                fieldId: 'custrecord_binder_edit_non_gl'
            });

            if(!isEmpty(notice) && jeProcess){
                contSaving = confirm('If this binder edit is complete, please uncheck the JE/SO Lines Processed field to finish procesing the binder edit.  Continue Saving?')

            }

          


            return contSaving;


        }

        function sublistChanged(context) {
            // context.currentRecord;
            // context.sublistId;
        }

        function validateDelete(context) {
            // context.currentRecord;
            // context.sublistId;
            return true; //Return true if the line deletion is valid.
        }

        function validateField(ctx) {
            // context.currentRecord;
            // context.sublistId;
            // context.fieldId;
            // context.line;
            // context.column;

            var cRecord = ctx.currentRecord;
            var notice = cRecord.getValue({fieldId: 'custrecord_binder_edit_notification'});
            var jeProcessed = cRecord.getValue({fieldId: 'custrecord_je_so_lines_processed'});
           var fieldId = ctx.fieldId;

           if(fieldId == 'custrecord_je_so_lines_processed' &&jeProcessed == false && !isEmpty(notice)){
               alert('Unchecking this box will finish processing this policy record.  Any additional changes will need to be made through a new binder edit.')
           }

          

            return true; //Return true to continue with the change.
        }

        function validateInsert(context) {
            // context.currentRecord;
            // context.sublistId;
            return true; //Return true if the line insertion is valid.
        }

        function validateLine(context) {
            // context.currentRecord;
            // context.sublistId;
            return true; //Return true if the line is valid.
        }

        function fieldChanged(ctx) {
            // context.currentRecord;
            // context.sublistId;
            // context.fieldId;
            // context.line;
            // context.column;



            return;
        }

        function isEmpty(param) {
            if (param === '' || param === null || param === undefined || param.length <= 0 || param ==='null') {
                return true;
            }
            return false;
        }


        return {
            saveRecord: saveRecord,
            validateField: validateField
            //fieldChanged: fieldChanged
        };
    });


