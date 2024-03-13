/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/email','N/search'],
        function(email, search) {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
        var eventType = scriptContext.type;
        log.debug('eventType',eventType);
        var sendEmail = false;
        var vendor;
        if(eventType=='create'){
            var newRecord = scriptContext.newRecord;            
            if(newRecord.getValue('isinactive')!=true){
                vendor = scriptContext.newRecord.getValue('entityid');
                sendEmail = true
            }
        }if(eventType=='edit'&&scriptContext.oldRecord){
            vendor = scriptContext.newRecord.getText('entityid');
            var oldInactive = scriptContext.oldRecord.getValue('isinactive');
            var newInactive = scriptContext.newRecord.getValue('isinactive');
            log.debug('edit oldInactive', oldInactive);
            log.debug('edit newInactive', newInactive);
            if(newInactive!==true&&oldInactive===true){
                sendEmail = true
            }
        }
        log.debug('sending email?', sendEmail);
        if(sendEmail&&scriptContext.newRecord.getValue('custentityr7_vendor_requestor')){
            var vendorId = scriptContext.newRecord.getValue('entityid');
            log.debug('vendorId',vendorId);
            var requestor = scriptContext.newRecord.getValue('custentityr7_vendor_requestor');
            log.debug('requestor',requestor);
            var requestorName = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: requestor,
                columns: ['firstname', 'lastname']
            })
            log.debug('requestorName',requestorName)
            email.send({
                author: '106223954',
                recipients: requestor,
                subject: vendor+' is now Active',
                body: 'Hi '+requestorName.firstname+' '+requestorName.lastname+', \n\n'+
                    'Vendor '+ scriptContext.newRecord.getValue('entityid')+' has been set up as a vendor in NetSuite.  You can now create a purchase order in Coupa. \n\n'+
                    'Thank you,\n'+
                    'Accounts Payable'
                ,
                relatedRecords: {
                    entityId: scriptContext.newRecord.id
                }
            })
        }
    }
    return {
        afterSubmit:afterSubmit
    }
})