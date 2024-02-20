/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

function() {
    let emailValid = true;
    const EMAIL_FIELD_ID = 'custrecordunitretailcustomer_email';
    function validateEmail(value) {
        const input = document.createElement('input');

        input.type = 'email';
        input.required = true;
        input.value = value;

        return typeof input.checkValidity === 'function' ? input.checkValidity() : /\S+@\S+\.\S+/.test(value);
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
        // credit: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript
        if(scriptContext.fieldId === EMAIL_FIELD_ID){
            const email = scriptContext.currentRecord.getValue(EMAIL_FIELD_ID);
            emailValid = validateEmail(email);
        }
        return true;
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
        const email = scriptContext.currentRecord.getValue(EMAIL_FIELD_ID);
        emailValid = validateEmail(email);
        if(!emailValid){
            alert('Please enter a valid email address.');
            setTimeout(function(){
                document.getElementById("custrecordunitretailcustomer_email").focus({ focusVisible: true });
            }, 250);
            return false;
        }
        return true;
    }

    return {
        //fieldChanged: fieldChanged,
        saveRecord: saveRecord,
        validateField: validateField,
    };
    
});
