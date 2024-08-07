/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/search', 'N/task', 'N/log', 'N/file', 'N/runtime', 'N/ui/message', 'N/redirect','N/email'],
    function (ui, record, search, task, log, file, runtime, message, redirect,email) {

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

                    var tranid = search.lookupFields({
                        type: record_type,
                        id: record_id,
                        columns: ['tranid']
                    }).tranid;
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
                    var custServiceLead = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_scustServiceLead' })
                    var enteredByEmail = getEnteredBy(record_id);
                    if (!enteredByEmail) enteredByEmail = custServiceLead;
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
                                    custbody_sdb_reject_by: currenteId,
                                    custbody_sdb_approved_by: '',
                                    custbody_sdb_reject_from_button: true,
                                    custbody_sdb_approved_from_btn: false,
                                    custbody_so_approval_status: 'Rejected',
                                }
                            })
                            if (rcdSbmitId) {
                                sendRejectedlEmail(tranid, record_id, enteredByEmail, reject_reason)
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

        function getEnteredBy(soId) {

            try {
                var salesorderSearchObj = search.create({
                    type: "salesorder",
                    filters:
                        [
                            ["type", "anyof", "SalesOrd"],
                            "AND",
                            ["systemnotes.type", "is", "T"],
                            "AND",
                            ["mainline", "is", "T"],
                            "AND",
                            ["systemnotes.context", "anyof", "UIF"],
                            "AND",
                            ["internalid", "anyof", soId]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "tranid", label: "Document Number" }),
                            search.createColumn({
                                name: "context",
                                join: "systemNotes",
                                label: "Context"
                            }),
                            search.createColumn({ name: "custbody_aps_entered_by", label: "ENTERED BY" })
                        ]
                });
                var searchResultCount = salesorderSearchObj.runPaged().count;
                log.debug("salesorderSearchObj result count", searchResultCount);
                var entered_by = '';
                salesorderSearchObj.run().each(function (result) {
                    entered_by = result.getValue('custbody_aps_entered_by');
                    return true;
                });
                return entered_by;
            } catch (error) {
                log.error({
                    title: 'ERROR getEnteredBy',
                    details: error
                })
            }
        }

        function sendRejectedlEmail(docNumber, soId, enteredBy, comments) {

            try {
                var emailRecipients = enteredBy;
                var emailSender = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_sender_noreply_sl' })
                var pathtransactions = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_path_so_sl' })
                pathtransactions += soId;
                var emailSubject = 'The following order has been rejected, we send it by this means for review, necessary adjustments for subsequent approval'
                var emailBody = 'REJECTION COMMENTS: ' + comments + '<br/>';
                emailBody += '<a href=' + pathtransactions + '>Click here: ' + docNumber + '</a><br/>';
                emailBody += '</p><br/><br/>Thank you';

                email.send({
                    author: emailSender,
                    recipients: emailRecipients,
                    subject: emailSubject,
                    body: emailBody,
                });
                log.audit('Sent email');

            } catch (error) {
                log.error('ERROR senEmail', error)
            }
        }

        return {
            onRequest: onRequest
        }
    })