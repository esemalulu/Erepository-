/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/ui/message','N/search', 'N/ui/serverWidget', 'N/error','N/render','N/email', 'SuiteScripts/SSLib/2.x/SSLib_Util', './GD_Common', '/.bundle/102084/2.x/RVS_Common'],

function(record, runtime, message, search ,serverWidget, error,render,email, SSLib_Util, GD_Common, RVS_Common) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
        if (scriptContext.type == 'create' || scriptContext.type == 'edit' || scriptContext.type == 'view')
        {
            var unitId = scriptContext.newRecord.getValue('custrecordclaim_unit');
            if (unitId && unitId != '')
            {
                var hasLegalPermission = GD_Common.CheckLegalPermission(runtime.getCurrentUser().id);
                var needsLegalPermission = GD_Common.CheckLegalFlag(unitId);
                if (needsLegalPermission && !hasLegalPermission)
                {
                    if (RVS_Common.IsDealerLoggedIn())
                    {
                        var messageField = scriptContext.form.addField({
                            id: 'custpage_custhtmlmessage', 
                            label: ' ', 
                            type: serverWidget.FieldType.INLINEHTML
                        });

                        messageField.defaultValue = '<span style="font-size:12px;font-weight:bold;color:red;">'+
                                                                'This unit file is locked, please contact Grand Design Warranty Department.' +
                                                                '</span><ul>';

                        //This puts this message above the top field group
                        messageField.updateLayoutType({
                            layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                        });
                    }
                    else
                    {
                        var messageString = 'This unit file is locked, please consult with the Consumer Affairs department.';
                        var messageObj = message.create({
                            type: message.Type.WARNING,
                            title: 'Claim Locked',
                            message: messageString
                        });
                        scriptContext.form.addPageInitMessage({message: messageObj});
                    }
                }
            }
        }
        if(scriptContext.type == 'edit') {
            //open, approved, approved w/mod, pending, denied, 
            // Statuses
            var statusList = [
                {id: '1', name: 'Open'},
                {id: '2', name: 'Approved'},
                {id: '5', name: 'Approved with Modifications'},
                {id: '4', name: 'Pending'},
                {id: '3', name: 'Denied'},
            ];
            var statusField = scriptContext.form.getField({id: 'custpage_oplinestatuses'});
            statusField.defaultValue = JSON.stringify(statusList);
            scriptContext.form.updateDefaultValues({
                custpage_oplinestatuses : JSON.stringify(statusList)
            })
        }
        if (scriptContext.type == 'view') {
            
            //Internally, if the claim total is greater than the requested total.
            if(!RVS_Common.IsDealerLoggedIn()) {
                var requestedTotal = parseFloat(scriptContext.newRecord.getValue('custrecordclaim_claimrequestedtotal'));
                var claimTotal = parseFloat(scriptContext.newRecord.getValue('custrecordclaim_claimtotal'));
                if(claimTotal && requestedTotal && claimTotal > requestedTotal) {
                    scriptContext.form.addPageInitMessage({
                        type: message.Type.WARNING,
                        title: "Total Claim Amount Exceeds Requested Amount",
                        message: "The total claim amount exceeds the requested amount. Please review the claim details.",
                    });
                }
            }
            // Need to display a message if the approve button was pressed to tell the user if a
            // Credit Memo was successfully created or not.
            var creditMemoMessage = scriptContext.newRecord.getValue({fieldId: 'custrecordgd_createcreditmemomessage'});
            if (creditMemoMessage != null && creditMemoMessage != '') {
                var messageType = message.Type.CONFIRMATION;
                var messageTitle = "Credit Memo Created"
                if (creditMemoMessage.indexOf('Error: ') != -1) {
                    messageType = message.Type.ERROR;
                    messageTitle = "Error Creating Credit Memo"
                    creditMemoMessage = creditMemoMessage.replace('Error: ', '');
                } else {
                    creditMemoMessage = creditMemoMessage.replace('Success: ', '');
                }
                var messageObj = message.create({
                    title: messageTitle,
                    message: creditMemoMessage,
                    type: messageType,
                    duration: 10000
                });
                scriptContext.form.addPageInitMessage({message: messageObj});
                record.submitFields({
                    type: 'customrecordrvsclaim',
                    id: scriptContext.newRecord.id,
                    values: {
                        custrecordgd_createcreditmemomessage: ''
                    }
                });
            }
        }
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

    }

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
    if (scriptContext.type == 'edit') {
            var newRec = scriptContext.newRecord;
            var oldRec = scriptContext.oldRecord;
            var unitId = newRec.getValue('custrecordclaim_unit');
            var oldStatus = oldRec.getValue('custrecordclaim_status');
            var status = newRec.getValue('custrecordclaim_status');
            var customer = oldRec.getValue('custrecordclaim_retailcustomer');
            var recId = newRec.id;
       //log.debug({title:"unitId",details:unitId})
     log.debug({title:"customer",details:customer})
       log.debug({title:"status",details:status})
       log.debug({title:"oldStatus",details:oldStatus})
            if(oldStatus!=5 && status==5)
            {
              try{
                if(customer)
                var custEmail = getCustEmail(customer);
              log.debug({title:"custEmail",details:custEmail})
                if(custEmail)
                {
                   // var transactionId = 4022538; 
                            var mergeResult = render.mergeEmail({
                            templateId: 282,
                            entity: null,
                            recipient: null,
                            supportCaseId: null, 
                            transactionId: null,
                            customRecord: {
                                type: 'customrecordrvsclaim',
                                id: recId
                            }
                            });
                            var emailSubject = mergeResult.subject; 
                            var emailBody = mergeResult.body;
                  try{
                      email.send({
                            author : 3915553, 
                            recipients : custEmail, 
                            subject : emailSubject, 
                            body : emailBody, 
                            relatedRecords : {
                           customRecord:{
                            id:recId,
                            recordType:62
                           }
                            }
                            });
                  }
                  catch(e){
                    log.error({title:"Error when sending email: ",details:e.message})
                  }
                          
                }
              }
              catch(e){
                log.error({title:"Error when sending email",details:e.message})
              }
            }
      

    }
    }
   function getCustEmail(custId) {
log.debug({title:"custId",details:custId})
        var fieldLookUp = search.lookupFields({
    type: "customrecordrvsunitretailcustomer",
    id: custId,
    columns: ['custrecordunitretailcustomer_email']
});
            log.debug({title:"fieldLookUp",details:fieldLookUp})
          var email = fieldLookUp.custrecordunitretailcustomer_email; 
      log.debug({title:"email",details:email})

        if(email)
        {
              return email;
        }
        else{
          return false
        }
        
        }

    return {
        beforeLoad: beforeLoad,
        // beforeSubmit: beforeSubmit,
         afterSubmit: afterSubmit
    };
    
});
