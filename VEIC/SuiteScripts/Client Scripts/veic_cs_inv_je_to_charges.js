/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search'],
/**
 * @param{search} search
 */
function(search) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {

    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        debugger;
        const rec = scriptContext.currentRecord;
        const fieldId = scriptContext.fieldId;
        const sublistId = scriptContext.sublistId;
        const lineNum = scriptContext.lineNum;
        const columnNum = scriptContext.columnNum;

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {
        debugger;
        const rec = scriptContext.currentRecord;
        const fieldId = scriptContext.fieldId;
        const sublistId = scriptContext.sublistId;
    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {
        debugger;
        const rec = scriptContext.currentRecord;
        const sublistId = scriptContext.sublistId;
        let lineCount = rec.getLineCount({ sublistId: sublistId });
        while (lineCount-->=0){
            log.debug('Line Count', lineCount);
            const item = rec.getSublistValue({ sublistId: sublistId, fieldId: 'item', line: lineCount });
            const charges = rec.getSublistValue({ sublistId: sublistId, fieldId: 'charges', line: lineCount });
            let descriptionExisting = rec.getSublistValue({ sublistId: sublistId, fieldId: 'description', line: lineCount });
            const projectTaskExisting = rec.getSublistValue({ sublistId: sublistId, fieldId: 'custcol_cp_projecttask', line: lineCount });
            const chargeFromExisting = rec.getSublistValue({ sublistId: sublistId, fieldId: 'department', line: lineCount });
            const amount = rec.getSublistValue({ sublistId: sublistId, fieldId: 'amount', line: lineCount });

            if(charges){
                log.debug('Charges', charges);
                const chargeFields = search.lookupFields({
                    type: 'charge',
                    id: charges,
                    columns: ['custrecord_cp_project_task_billing', 'description', 'custrecord_veic_chrg_je']
                });
                const description = chargeFields.description || descriptionExisting;
                const projectTask = chargeFields.custrecord_cp_project_task_billing? chargeFields.custrecord_cp_project_task_billing[0].value : null; 
                const jeId = chargeFields.custrecord_veic_chrg_je? chargeFields.custrecord_veic_chrg_je[0].value : null; 
                log.debug('Description', description);
                log.debug('Project Task', projectTask);
                log.debug('JE ID', jeId);

                if (jeId && !projectTaskExisting && projectTask) {
                   /*
                    rec.selectLine({ sublistId: sublistId, line: lineCount });
                    rec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'description', value: description, ignoreFieldChange: true });
                    rec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'custcol_cp_projecttask',  value: projectTask, ignoreFieldChange: true });
                    rec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'department', value: chargeFromExisting, ignoreFieldChange: true });
                    rec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'item', value: item, ignoreFieldChange: true });
                    rec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'amount', value: amount, ignoreFieldChange: true });
                    rec.commitLine({ sublistId: sublistId, ignoreRecalc: true });
                    */
                }
            }
           
        }
        
    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {
        debugger;
        const rec = scriptContext.currentRecord;
        const sublistId = scriptContext.sublistId;
    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
        debugger;
        const rec = scriptContext.currentRecord;
        const fieldId = scriptContext.fieldId;
        const sublistId = scriptContext.sublistId;
        const lineNum = scriptContext.lineNum;
        const columnNum = scriptContext.columnNum;
        return true;
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
        debugger;
        const rec = scriptContext.currentRecord;
        const sublistId = scriptContext.sublistId;
        return true;

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {
        debugger;
        const rec = scriptContext.currentRecord;
        const sublistId = scriptContext.sublistId;
        return true;
    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    return {
        //pageInit: pageInit,
        //fieldChanged: fieldChanged,
        //postSourcing: postSourcing,
        //sublistChanged: sublistChanged,
        //lineInit: lineInit,
        //validateField: validateField,
        //validateLine: validateLine,
        //validateInsert: validateInsert,
        //validateDelete: validateDelete,
        //saveRecord: saveRecord
    };
    
});
