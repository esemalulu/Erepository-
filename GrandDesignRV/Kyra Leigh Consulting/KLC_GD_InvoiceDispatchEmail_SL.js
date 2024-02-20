/**
 * Send dispatch email to contact selected
 *
 * Author: Kyra Schaefer
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/ui/serverWidget', 'N/render', 'N/email', 'N/runtime'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{serverWidget} serverWidget
     */
    (record, search, serverWidget, render, email, runtime) => {

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            var logTitle = 'onRequest';
            var request = scriptContext.request;

            if (request.method == 'GET') {

                // Get Parameters
                var invoice = request.parameters.invoice;
                var dealer = request.parameters.dealer;
                log.audit(logTitle, 'Invoice Id: ' + invoice + ' | Dealer: ' + dealer);
                if (!invoice || !dealer) return;

                // Create Form
                var form = serverWidget.createForm({
                    title: 'Dispatch Submission'
                });
                form.addSubmitButton({
                    label: 'Send'
                });
                var contactFld = form.addField({
                    id: 'contact',
                    label: 'Recipient',
                    type: serverWidget.FieldType.SELECT
                });
                contactFld.addSelectOption({
                    value: ' ',
                    text: ' '
                });
                var tranIdFld = form.addField({
                    id: 'inv_id',
                    label: 'Invoice ID',
                    type: serverWidget.FieldType.TEXT
                });
                tranIdFld.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                tranIdFld.defaultValue = invoice;

                // Get Dealer Contacts
                getDealerContacts(contactFld, dealer);

                // Complete Form
                scriptContext.response.writePage({
                    pageObject: form
                });
            } else {
                // POST - send email
                var invId = request.parameters.inv_id;
                var contact = request.parameters.contact;
                log.audit(logTitle, 'Invoice Id: ' + invId + ' | Contact: ' + contact);
                if (invId && contact) {
                    // Send Email
                    var objScript = runtime.getCurrentScript();
                    var emailAuthor = runtime.getCurrentUser().id;
                    var emailTemplate = objScript.getParameter('custscript_klc_gd_inv_disp_em_temp');
                    var emailMergeResult = render.mergeEmail({
                        templateId: emailTemplate,
                        transactionId: parseInt(invId)
                    });
                    var subject = emailMergeResult.subject;
                    var body = emailMergeResult.body;
                    email.send({
                        author: emailAuthor,
                        recipients: contact,
                        subject: subject,
                        body: body,
                        relatedRecords: {
                            transactionId: invId
                        }
                    });
                    scriptContext.response.write('<html><body><script>window.close();</script></body></html.');
                }
            }

        }

        function getDealerContacts(contactFld, dealer) {

            // Get Dealer Contacts
            var logTitle = 'getDealerContacts';
            var customerSearchObj = search.create({
                type: "customer",
                filters:
                    [
                        ["contact.isinactive", "is", "F"],
                        "AND",
                        ["internalid", "anyof", dealer]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            join: "contact"
                        }),
                        search.createColumn({
                            name: "entityid",
                            join: "contact",
                            sort: search.Sort.ASC
                        })
                    ]
            });
            customerSearchObj.run().each(function (result) {

                // Add Contact to Recipient list
                var contactId = result.getValue({
                    name: "internalid",
                    join: "contact"
                });
                var contactName = result.getValue({
                    name: "entityid",
                    join: "contact",
                });
                contactFld.addSelectOption({
                    value: contactId,
                    text: contactName
                });
                return true;
            });

        }

        return {onRequest}

    });
