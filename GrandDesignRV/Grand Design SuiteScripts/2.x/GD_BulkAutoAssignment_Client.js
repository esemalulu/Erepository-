/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

() => {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    const pageInit = (scriptContext) => {
        let field = scriptContext.currentRecord.getField({fieldId: 'custpage_preauthstatuses'});
        if (field && field.isDisplay) {
            field.isDisplay = false;
        }
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
    const fieldChanged = (scriptContext) => {
        if (scriptContext.fieldId == 'custpage_type') {
            var claimStatusField = scriptContext.currentRecord.getField({fieldId: 'custpage_claimstatuses'});
            var preAuthStatusField = scriptContext.currentRecord.getField({fieldId: 'custpage_preauthstatuses'});
            console.log(scriptContext.currentRecord.getValue({fieldId: 'custpage_type'}));
            console.log(typeof scriptContext.currentRecord.getValue({fieldId: 'custpage_type'}));
            if (scriptContext.currentRecord.getValue({fieldId: 'custpage_type'}) == '0') {
                claimStatusField.isDisplay = true;
                preAuthStatusField.isDisplay = false;
            } else if (scriptContext.currentRecord.getValue({fieldId: 'custpage_type'}) == '1') {
                claimStatusField.isDisplay = false;
                preAuthStatusField.isDisplay = true;
            }
        }
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
    const postSourcing = (scriptContext) => {

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
    const sublistChanged = (scriptContext) => {

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
    const lineInit = (scriptContext) => {

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
    const validateField = (scriptContext) => {
        if (scriptContext.fieldId == 'custpage_quantitytoassign') {
            let qta = scriptContext.currentRecord.getValue({fieldId: 'custpage_quantitytoassign'});
            let qty = scriptContext.currentRecord.getValue({fieldId: 'custpage_totalrecords'});
            if (qta < 1) {
                alert('You cannot assign less than 1 record.');
                return false;
            } else if (qta > qty) {
                alert('You cannot assign more records than the total number of records.');
                return false;
            } else {
                return true;
            }
        }
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
    const validateLine = (scriptContext) => {

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
    const validateInsert = (scriptContext) => {

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
    const validateDelete = (scriptContext) => {

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
    const saveRecord = (scriptContext) => {
        if(scriptContext.currentRecord.getValue({fieldId:'custpage_step'}) == '2'){
            var numLines = scriptContext.currentRecord.getLineCount({
                sublistId: 'custpage_employeesublist'
            });

            let casesToAssign = scriptContext.currentRecord.getValue({fieldId: 'custpage_quantitytoassign'});

            
            
            let names = []
            let selectedCount = 0
            for (let i = 0; i < numLines;i++){
                if (scriptContext.currentRecord.getSublistValue({sublistId: 'custpage_employeesublist',fieldId: 'custpage_sublist_select',line: i}) == true){
                    selectedCount += 1
                    names.push(scriptContext.currentRecord.getSublistValue({
                        sublistId: 'custpage_employeesublist',
                        fieldId: 'custpage_sublist_name',
                        line: i
                    }))
                }
            }

            let startingIndex = Math.floor(Math.random() * names.length);
            scriptContext.currentRecord.setValue({fieldId: 'custpage_startingindex',value:startingIndex});

            let sortedNames = names.slice(startingIndex, names.length);
            sortedNames = sortedNames.concat(names.slice(0, startingIndex));

            let message = '';
            let leftOver = casesToAssign % selectedCount;
            let leftOverCount = casesToAssign %selectedCount;
            for (let i = 0;i<sortedNames.length;i++){
                if (leftOverCount > 0){
                    message += 'You are about to assign ' + sortedNames[i] + ' ' +(Math.floor(((casesToAssign-leftOver)/selectedCount)) + 1) + ' records\n';
                    leftOverCount -= 1
                } else {
                    message += 'You are about to assign ' + sortedNames[i] + ' ' +(Math.floor((casesToAssign-leftOver)/selectedCount)) + ' records\n';
                }

            }
            // checks to see if anyone is selected and asks for confirmation.
            if (selectedCount > 0){
                if(confirm(message + 'Are you Sure?')==true){
                    return true
                }else{
                    return false
                }
            }else if(selectedCount == 0){
                if(confirm("You are about to assign 0 records, Are you sure?")){
                    return true
                } else {
                    return false
                }
            } 
            else{
                return true
            }
        }else{
            return true
        }
    }

    return {
        pageInit,
        fieldChanged,
        /*postSourcing,
        sublistChanged,
        lineInit,*/
        validateField,/*,
        validateLine,
        validateInsert,
        validateDelete,*/
        saveRecord
    }
    
});
