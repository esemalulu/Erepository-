/**
 * Module Description
 * 
 * This script contains function that will change the value in Export
 * Classification hidden field based on selected value from another "Export
 * Classification" page field. It is happened only if form in "EDIT" mode and
 * License Request is Grey Listed
 * 
 * Version Date Author Remarks 
 * 
 * 1.00 13 Jul 2016 akuznetsov
 * 
 */

var msgECCanNotBeEmpty = 'Export Classification can not be empty. Please select non empty option.';
var msgConfirmSendGraylistedEmail = 'Do you want to send a Reject email?';
/**
 * Checks for Export Classification option selected and if request is Gray Listed,
 * copy value to custrecordr7licreq_exportclassification field
 * 
 * @appliedtorecord License Request Processing
 * 
 * @param {String}
 *            type Sublist internal id
 * @param {String}
 *            name Field internal id
 * @param {Number}
 *            linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function clientFieldChanged(type, name, linenum) {
    this.inEditMode = false;
    if (type != 'edit' && name != 'custpage_rejectreason') {
        return;
    }
    // Set class field saying that we are in edit mode - for saveRecord function
    this.inEditMode = true;

    var theClassification = {
        value: null
    };
    if (isExportClassificationEmpty(this.inEditMode ? 'custpage_rejectreason'
            : 'custrecordr7licreq_exportclassification', theClassification)) {
        alert(msgECCanNotBeEmpty);
        return;
    }
    nlapiSetFieldValue('custrecordr7licreq_exportclassification',
            theClassification.value);
}

/**
 * Checks if request was Grey Listed - it must
 * contain Export Classification option selected
 * 
 * @returns {Boolean}
 */
function saveRecord() {
    var theClassification = {
        value: null
    };
    if (isExportClassificationEmpty(this.inEditMode ? 'custpage_rejectreason'
            : 'custrecordr7licreq_exportclassification', theClassification)) {
        alert(msgECCanNotBeEmpty);
        return false;
    }

    /*
     * Code Block was developed for task "Send Reject email to Government user"
     * Egor Karmanov, BostonSD 25.07.2016 
     */

    var exportClassification = nlapiGetFieldValue('custrecordr7licreq_exportclassification');
    var graylisted = nlapiGetFieldValue('custrecordr7_licreqproc_graylisted');
    var unprocessable = nlapiGetFieldValue('custrecordr7licreq_unprocessable');
    var reviewedByLegal = nlapiGetFieldValue('custrecordr7licreq_legalreviewed');
    if (exportClassification == 7 && graylisted == 'T' && unprocessable == 'T' && reviewedByLegal == 'T')
    {
        if (confirm(msgConfirmSendGraylistedEmail))
        {
            nlapiSetFieldValue('custpagesendemail', 'T');
        }
    }
    //--------------------------------------------------------------------------
    return true;
}

/**
 * Perform main logic of check for Export Classification is empty
 * 
 * @param fieldname
 * @param anExportClassification
 * @returns {Boolean}
 */
function isExportClassificationEmpty(fieldname, anExportClassification) {
    anExportClassification.value = nlapiGetFieldValue(fieldname);
    var isGraylisted = nlapiGetFieldValue('custrecordr7_licreqproc_graylisted') == 'T';
    // var typeOfUse = nlapiGetFieldValue('custrecord7licreq_typeofuse');
    nlapiLogExecution('DEBUG', 'isExportClassificationEmpty', 'isGraylisted = ' + isGraylisted + ', anExportClassification.value(' + fieldname + ') = ' + anExportClassification.value);
    return isGraylisted // && typeOfUse == '2'
            && (anExportClassification.value == undefined
                    || anExportClassification.value == null || anExportClassification.value == '');
}
