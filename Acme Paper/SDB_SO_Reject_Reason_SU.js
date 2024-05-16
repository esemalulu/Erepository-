/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
 define(['N/ui/serverWidget', 'N/record', 'N/search', 'N/task', 'N/log', 'N/file', 'N/runtime', 'N/ui/message', 'N/redirect'],
 function (ui, record, search, task, log, file, runtime, message, redirect) {

     function onRequest(context) {
         try {
             const request = context.request
             const response = context.response
             const parameters = request.parameters
            var currenteId = runtime.getCurrentUser().id;
            log.debug('currenteId', currenteId);
             log.debug('request.method ', request.method);
             if (request.method === 'GET') {
                 log.debug('params GET', context.request.parameters);
                 var recId = context.request.parameters['record_id'];
                 var recType = context.request.parameters['record_type']
                 const form = ui.createForm({ title: 'Select Customers', hideNavBar: true })
                 form.addField({ id: 'custpage_reject_comments', type: 'TEXT', label: 'Reject Reason' })
                     .updateDisplayType({ displayType: ui.FieldDisplayType.NORMAL })
                 var recorid = form.addField({ id: 'custpage_record_id', type: 'TEXT', label: 'Record ID' })
                     .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
                 recorid.defaultValue = recId;
                 var recorType = form.addField({ id: 'custpage_record_type', type: 'TEXT', label: 'Record Type' })
                     .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
                 recorType.defaultValue = recType;
                 form.addSubmitButton({ label: 'Submit' })
                 response.writePage(form)

             } else { // POST

                 var record_id = context.request.parameters['custpage_record_id']
                 var record_type = context.request.parameters['custpage_record_type']
                 var reject_reason = context.request.parameters['custpage_reject_comments']
                 log.debug('params POS', context.request.parameters);
                 const form = ui.createForm({ title: 'Please Provide Reason for Rejection', hideNavBar: true })
                 form.addField({ id: 'custpage_reject_comments', type: 'TEXT', label: 'Reject Reason' })
                     .updateDisplayType({ displayType: ui.FieldDisplayType.NORMAL })
                 var recorid = form.addField({ id: 'custpage_record_id', type: 'TEXT', label: 'Record ID' })
                     .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
                 recorid.defaultValue = record_id;
                 var recorType = form.addField({ id: 'custpage_record_type', type: 'TEXT', label: 'Record Type' })
                     .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
                 recorType.defaultValue = record_type;
                 form.addSubmitButton({ label: 'Submit' })
                 // form.addPageInitMessage({
                 //     title: 'Processing',
                 //     message: 'It is being processed, wait a moment to be redirected to the transaction again.',
                 //     type: message.Type.CONFIRMATION,
                 //     duration: 10000
                 // })

                 if (!reject_reason) {

                     form.addPageInitMessage({
                         title: 'Attention',
                         message: 'The field (Reject Reason) cannot be empty!!!.',
                         type: message.Type.WARNING,
                         duration: 10000
                     })
                     return context.response.writePage(form);
                 } else {
                     try {
                         form.addPageInitMessage({
                             title: 'Processing',
                             message: 'It is being processed, wait a moment to be redirected to the transaction again.',
                             type: message.Type.CONFIRMATION,
                             duration: 10000
                         })
                        
                         var rcdSbmitId = record.submitFields({
                             type: record_type,
                             id: record_id,
                             values: {
                                 custbody_so_rejereas: reject_reason,
                                 custbody_sdb_reject_by:currenteId,
                                 custbody_sdb_approved_by:'',
                                 custbody_sdb_reject_from_button:true,
                                 custbody_sdb_approved_from_btn:false,
                                 custbody_so_approval_status: 'Rejected',
                             }
                         })
                         if (rcdSbmitId) {
                             redirect.toRecord({
                                 id: record_id,
                                 type: record_type,
                             })
                         }
                     } catch (e) {
                         log.debug('Error post', e);
                         form.addPageInitMessage({
                             title: 'ERROR!!!.',
                             message: 'Error in the process .' + e,
                             type: message.Type.ERROR,
                             duration: 10000
                         })
                         return context.response.writePage(form);
                     }
                 }
                 //else { return context.response.writePage(form); }
             }
         } catch (e) {
             const form = ui.createForm({ title: 'Please Provide Reason for Rejection', hideNavBar: true })
             form.addField({ id: 'custpage_reject_comments', type: 'TEXT', label: 'Reject Reason' })
                 .updateDisplayType({ displayType: ui.FieldDisplayType.NORMAL })
             var recorid = form.addField({ id: 'custpage_record_id', type: 'TEXT', label: 'Record ID' })
                 .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
             recorid.deFaultvalue = record_id;
             var recorType = form.addField({ id: 'custpage_record_type', type: 'TEXT', label: 'Record Type' })
                 .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
             recorType.defaultvalue = record_type;
             form.addSubmitButton({ label: 'Submit' })
             form.addPageInitMessage({
                 title: 'ERROR!!!.',
                 message: 'Error in the process .' + e,
                 type: message.Type.ERROR,
                 duration: 10000
             })
             return context.response.writePage(form);
         }
        
     }



     return {
         onRequest: onRequest
     }
 })