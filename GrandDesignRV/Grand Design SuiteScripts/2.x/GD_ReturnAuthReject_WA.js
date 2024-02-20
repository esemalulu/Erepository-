/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
define(['N/error', 'N/record', 'N/email', 'N/runtime', 'SuiteScripts/SSLib/2.x/SSLib_Util'],
/**
 * @param {record} record
 */
function(error, record, email, runtime, SSLib_Task) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(scriptContext) {
        // RGA was rejected by internal user.
        var retAuthRecord = record.load({type: record.Type.RETURN_AUTHORIZATION, id: scriptContext.newRecord.id});
        
        for (var i = 0; i < retAuthRecord.getLineCount('item'); i++) {
            retAuthRecord.setSublistValue({sublistId: 'item', fieldId: 'isclosed', line: i, value: true});
        }
        
        var rejectReason = retAuthRecord.getValue({fieldId: 'custbodygd_returnauthrejectreason'}) || '';
        var contactRecId = retAuthRecord.getValue({fieldId: 'custbodygd_retauthcreatedbycontact'}) || '';
        var tranId = retAuthRecord.getValue({fieldId: 'tranid'});
        var entityName = scriptContext.newRecord.getValue({fieldId: 'entityname'});
        
        var maxTryCount = 5;
        var curTryCount = 0;
        
        var retAuthRecordId = null;
        while(curTryCount < maxTryCount) {
            try {                   
                retAuthRecordId = retAuthRecord.save({
                    enableSourcing:         true,
                    ignoreMandatoryFields:  true
                });
                
                break;
            } catch(err) {
                if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
                    curTryCount++;
                    continue;
                } else if (err.name == 'USER_ERROR') {
                    throw new nlobjError(err.name, err.message, true);
                }
                
                throw err;
            }
        }
        
        if (contactRecId != '') {
            var contactRecord = record.load({
                type: record.Type.CONTACT,
                id: contactRecId
            });
            
            var bodyMessage = '<span style="color:red">ATTENTION:</span> The return authorization was rejected.<br/><br/>*if more information is being requested, please respond to this message*<br/><br/>Thank you for reaching out, have a Grand day!';
            
            if (rejectReason != '')
                bodyMessage = '<span style="color:red">ATTENTION:</span> The return authorization was rejected for the following reasons:<br/>' + SSLib_Task.convertNSFieldToString(rejectReason) + '<br/><br/>*if more information is being requested, please respond to this message*<br/><br/>Thank you for reaching out, have a Grand day!';
            
            // Send an email with the reject reason to the contact that created the Return Authorization when an internal NetSuite User cancels the RGA
            var contactEmail = contactRecord.getValue({fieldId: 'email'}) || '';
            if (contactEmail != '') {
                email.send({
                    author: runtime.getCurrentUser().id,
                    recipients: contactEmail,
                    subject: 'Rejected: Return Authorization ' + tranId + ' (' + entityName + ')',
                    body: bodyMessage,
                    relatedRecords : {
                        transactionId : retAuthRecordId
                    }
                });
            }
        }
    }

    return {
        onAction : onAction
    };
    
});