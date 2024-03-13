/*
 * @author efagone
 */
function zc_srp_project_beforeLoad(type, form, request){

    try {
    
        var context = nlapiGetContext();
        
        if (context.getExecutionContext() == 'userinterface') {
        
            form.setScript('customscriptzc_srp_project_cs');
            
            if (type == 'view') {
                checkPendingAssignments(form);
                
                if (userHasPermission('send_srp_surveys')) {
                    var sendSurveySuiteletURL = nlapiResolveURL('SUITELET', 'customscriptzc_srp_survey_send_suitelet', 'customdeployzc_srp_survey_send_suitelet', false);
                    sendSurveySuiteletURL += '&custparam_job_id=' + nlapiGetRecordId();
                    sendSurveySuiteletURL += '&custparam_popup=T';
                    form.addButton('custpage_r7btn_send_srp_survey', 'Send Survey', 'zc_openPopupCenter(\'' + sendSurveySuiteletURL + '\', null, 600, 500); return false;');
                }
            }
            
            if (type == 'edit' || type == 'create') {
                buildSourcedSOWField(form);
            }
            
        }
        
        if (type == 'create') {
            var currentStatus = nlapiGetFieldValue('entitystatus');
            if (!currentStatus) {
                nlapiSetFieldValue('entitystatus', 4); //Pending
            }
        }
    } 
    catch (err) {
        nlapiLogExecution('ERROR', 'Problem zc_srp_project_beforeLoad', err);
    }
}

function zc_srp_project_beforeSubmit(type){

    try {
        if (type == 'create' || type == 'edit' || type == 'xedit') {
        
            zc_cgsm.init(type);
            var context = nlapiGetContext();
            
            //CREATE ONLY
            if (type == 'create') {
                if (!nlapiGetFieldValue('entitystatus')) {
                    zc_cgsm.setFieldValue_always('entitystatus', 4); //Pending
                }
            }
            
            //CREATE|EDIT
            if (type == 'edit' || type == 'create') {
                if (!nlapiGetFieldValue('custentityr7_project_sid')) {
                    zc_cgsm.setFieldValue_always('custentityr7_project_sid', getRandomString(40));
                }
                
				stampProjectedEndDate();
				
                if (context.getExecutionContext() == 'userinterface') {
                    if (zc_cgsm.updated_fields.indexOf('custpager7_sowdoc_temp') != -1) {
                        zc_cgsm.setFieldValue_always('custentityr7sowdoc', nlapiGetFieldValue('custpager7_sowdoc_temp'));
                    }
                }
            }
        }
    } 
    catch (err) {
        nlapiLogExecution('ERROR', 'Problem zc_srp_project_beforeSubmit', err);
    }
}

function zc_srp_project_afterSubmit(type) {

    if (nlapiGetContext().getExecutionContext() != 'scheduled') {
        try {
            if (type == 'create' || type == 'edit') {

                var jobRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
                nlapiLogExecution('DEBUG', 'jobRecord', jobRecord);
                var relatedProjects = jobRecord.getFieldValue('custentityr7relatedprojects');
                if (relatedProjects != '') {
                    nlapiScheduleScript('customscript_zc_srp_project_relatedproje', 'customdeploy_zc_srp_project_relatedproje', { custscript_projectinternalid: nlapiGetRecordId() });
                }
            }
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'afterSubmit Error', e);
        }
    } 
}

function stampProjectedEndDate(){
    try {
        if (!zc_cgsm.getNewFieldValue('projectedenddate')) {
            var startDate = zc_cgsm.getNewFieldValue('startdate');
            var dtStartDate = new Date();
            if (startDate) {
                dtStartDate = nlapiStringToDate(startDate);
            }
            zc_cgsm.setFieldValue_always('projectedenddate', nlapiDateToString(nlapiAddMonths(dtStartDate, 12))); //Pending
        }
    } 
    catch (err) {
        nlapiLogExecution('ERROR', 'Problem stampProjectedEndDate', err);
    }
}

function buildSourcedSOWField(form){

    try {
    
        if (form.getField('custentityr7sowdoc')) {
            form.getField('custentityr7sowdoc').setDisplayType('hidden');
            form.addField('custpager7_sowdoc_temp', 'select', form.getField('custentityr7sowdoc').getLabel() || 'SOW Document', 'document');
            form.getField('custpager7_sowdoc_temp').setDisplayType('normal');
            form.getField('custpager7_sowdoc_temp').setHelpText('Select the SOW document for this project. \n\n**NOTE: The SOW file must be attached to the Sales Order to appear in this list.');
            form.insertField(form.getField('custpager7_sowdoc_temp'), 'custentityr7sowdoc');
            
            sourceSalesOrderFiles(form.getField('custpager7_sowdoc_temp'));
            
            form.getField('custpager7_sowdoc_temp').setDefaultValue(nlapiGetFieldValue('custentityr7sowdoc'));
        }
    } 
    catch (e) {
        nlapiLogExecution('ERROR', 'Problem buildSourcedSOWField', e);
    }
}

function checkPendingAssignments(form){

    try {
        var objPendingAssignments = getPendingAssignment();
        if (objPendingAssignments) {
            form.addField('custpagezc_srp_project_pagescript', 'inlinehtml');
            form.getField('custpagezc_srp_project_pagescript').setDefaultValue(getProcessingAlert(objPendingAssignments));
            form.insertField(form.getField('custpagezc_srp_project_pagescript'), 'entityid');
            form.removeButton('edit');
        }
    } 
    catch (e) {
        nlapiLogExecution('ERROR', 'Problem checkPendingAssignments', e);
    }
}

function sourceSalesOrderFiles(fld){

    try {
    
        fld.addSelectOption('', '');
        
        var salesOrderId = nlapiGetFieldValue('custentityr7salesorder');
        if (!salesOrderId) {
            return;
        }
        
        var arrFilters = [];
        arrFilters.push(new nlobjSearchFilter('internalid', null, 'is', salesOrderId));
        arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
        
        var arrColumns = [];
        arrColumns.push(new nlobjSearchColumn('internalid'));
        arrColumns.push(new nlobjSearchColumn('internalid', 'file'));
        arrColumns.push(new nlobjSearchColumn('name', 'file').setSort(true));
        arrColumns.push(new nlobjSearchColumn('modified', 'file'));
        
        var arrResults = nlapiSearchRecord('transaction', null, arrFilters, arrColumns);
        
        for (var i = 0; arrResults && i < arrResults.length; i++) {
            var id = arrResults[i].getValue('internalid', 'file');
            if (id) {
                var label = arrResults[i].getValue('name', 'file') + ' (' + arrResults[i].getValue('modified', 'file') + ')';
                fld.addSelectOption(id, label);
            }
        }
    } 
    catch (e) {
        nlapiLogExecution('ERROR', 'Problem sourceSalesOrderFiles', e);
    }
    
    return;
}

function getPendingAssignment(){

    try {
        if (nlapiGetRecordId() == null) {
            return null;
        }
        
        var arrFilters = [];
        arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
        arrFilters.push(new nlobjSearchFilter('custrecordzc_srp_projassign_projectlink', null, 'is', nlapiGetRecordId()));
        arrFilters.push(new nlobjSearchFilter('custrecordzc_srp_projassign_proj_updated', null, 'is', 'F'));
        
        var arrColumns = [];
        arrColumns.push(new nlobjSearchColumn('internalid'));
        arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_proj_error'));
        arrColumns.push(new nlobjSearchColumn('custrecordzc_srp_projassign_link_error'));
        
        var arrResults = nlapiSearchRecord('customrecordzc_srp_project_assignments', null, arrFilters, arrColumns);
        
        if (arrResults && arrResults.length > 0) {
        
            var objResponse = processProjectFields(arrResults[0].getValue('internalid'));
            nlapiScheduleScript('customscriptzc_srp_scheduled');
            if (objResponse.success) {
                nlapiSetRedirectURL('RECORD', 'job', nlapiGetRecordId());
                return null;
            }
            
            return {
                id: arrResults[0].getValue('internalid'),
                underconstruction: objResponse.underconstruction,
                error: (arrResults[0].getValue('custrecordzc_srp_projassign_proj_error') || arrResults[0].getValue('custrecordzc_srp_projassign_link_error')) ? true : false
            };
        }
    } 
    catch (e) {
    
    }
    
    return null;
}

function getProcessingAlert(objPendingAssignments){

    var alertId = 1;
    var msg = '';
    if (objPendingAssignments.error) {
        msg += 'There was an error processing assignment for project. ';
        msg += 'For more information, please refer to the&nbsp;<a class="dottedlink" href="' + nlapiResolveURL('RECORD', 'customrecordzc_srp_project_assignments', objPendingAssignments.id, false) + '">Assignment Record</a>';
        alertId = 3;
    }
    else {
        msg += 'This project record is still being assigned. ';
        msg += 'Until this process is complete, some actions within the project record are not available. Please allow up to 15 minutes.&nbsp;<a class="dottedlink" href="javascript:document.location.reload(true);">Reload</a>';
    }
    
    var alertHTML = '';
    alertHTML += '<script type="text/javascript">';
    alertHTML += '	showAlertBox(\'alert_box_zc_srp_01\', null, \'' + msg + '\', ' + alertId + ', null, null, null);';
    alertHTML += '</script>';
    
    return alertHTML;
}

function getRandomString(string_length){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz_';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}

var zc_cgsm = {
    type: null,
    updated_fields: [],
    newly_updated_fields: [],
    newRec: null,
    oldRec: null,
    init: function(type){
    
        this.type = type;
        this.newRec = nlapiGetNewRecord();
        this.oldRec = nlapiGetOldRecord();
        this.updated_fields = this.newRec.getAllFields();
        this.newly_updated_fields = [];
        return;
    },
    fieldIsChanged: function(fieldId){
        var newValue = this.getNewFieldValue(fieldId);
        var oldValue = this.getOldFieldValue(fieldId);
        
        if (newValue == null) {
            newValue = '';
        }
        if (oldValue == null) {
            oldValue = '';
        }
        return (fieldId && newValue != oldValue);
    },
    getNewFieldValue: function(fieldId){
    
        // if the record is direct list edited or mass updated, run the script
        if (this.type == 'xedit') {
        
            if (this.updated_fields.indexOf(fieldId) != -1 || this.newly_updated_fields.indexOf(fieldId) != -1 || !this.oldRec) {
                return this.newRec.getFieldValue(fieldId);
            }
            
            return this.oldRec.getFieldValue(fieldId);
        }
        
        return this.newRec.getFieldValue(fieldId);
    },
    getOldFieldValue: function(fieldId){
    
        return (this.oldRec) ? this.oldRec.getFieldValue(fieldId) : null;
    },
    getNewFieldValues: function(fieldId){
    
        // if the record is direct list edited or mass updated, run the script
        if (this.type == 'xedit') {
        
            if (this.updated_fields.indexOf(fieldId) != -1 || this.newly_updated_fields.indexOf(fieldId) != -1 || !this.oldRec) {
                return this.newRec.getFieldValues(fieldId);
            }
            
            return this.oldRec.getFieldValues(fieldId);
        }
        
        return this.newRec.getFieldValues(fieldId);
    },
    getOldFieldValues: function(fieldId){
    
        return (this.oldRec) ? this.oldRec.getFieldValues(fieldId) : null;
    },
    getNewFieldText: function(fieldId){
    
        // if the record is direct list edited or mass updated, run the script
        if (this.type == 'xedit') {
        
            if (this.updated_fields.indexOf(fieldId) != -1 || this.newly_updated_fields.indexOf(fieldId) != -1 || !this.oldRec) {
                return this.newRec.getFieldText(fieldId);
            }
            
            return this.oldRec.getFieldText(fieldId);
        }
        
        return this.newRec.getFieldText(fieldId);
    },
    getOldFieldText: function(fieldId){
    
        return (this.oldRec) ? this.oldRec.getFieldText(fieldId) : null;
    },
    setFieldValue_ifBlank: function(fieldId, newValue, options){
    
        try {
        
            if (this.getNewFieldValue(fieldId) == null || this.getNewFieldValue(fieldId) === '') {
                this.newly_updated_fields.push(fieldId);
                switch (options) {
                    case 'text':
                        this.newRec.setFieldText(fieldId, newValue);
                        break;
                    case 'multi':
                        this.newRec.setFieldValues(fieldId, newValue);
                        break;
                    default:
                        this.newRec.setFieldValue(fieldId, newValue);
                        break;
                }
            }
        } 
        catch (err) {
            nlapiLogExecution('ERROR', 'Error updateField_ifBlank', 'fieldId: ' + fieldId + '\nnewValue: ' + newValue + '\noptions: ' + options + '\nError: ' + err);
        }
    },
    setFieldValue_always: function(fieldId, newValue, options){
    
        try {
        
            this.newly_updated_fields.push(fieldId);
            
            switch (options) {
                case 'text':
                    this.newRec.setFieldText(fieldId, newValue);
                    break;
                case 'multi':
                    this.newRec.setFieldValues(fieldId, newValue);
                    break;
                default:
                    this.newRec.setFieldValue(fieldId, newValue);
                    break;
            }
            
        } 
        catch (err) {
            nlapiLogExecution('ERROR', 'Error updateField_always', 'fieldId: ' + fieldId + '\nnewValue: ' + newValue + '\noptions: ' + options + '\nError: ' + err);
        }
    }
};
