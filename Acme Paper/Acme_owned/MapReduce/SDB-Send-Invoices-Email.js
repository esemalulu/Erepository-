/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/email', 'N/file', 'N/log', 'N/record', 'N/runtime', 'N/search', 'N/render'],
    (email, file, log, record, runtime, search, render) => {

        const getInputData = (inputContext) => {
            try {
                var invoiceSearchObj = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["type", "anyof", "CustInvc", "CustCred"],
                            "AND",
                            ["mainline", "is", "T"],
                            "AND",
                            ["datecreated", "on", "today"]

                            // ["datecreated", "within", "08/10/2024 12:00 am", "08/21/2024 11:59 pm"],
                            // "AND",
                            // ["name", "anyof", "82223", "78685"]

                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal ID" }),
                            search.createColumn({ name: "internalid", join: "customerMain", label: "Internal ID" }),
                            search.createColumn({ name: "type", label: "Type" })
                        ]
                });
                return invoiceSearchObj;
            } catch (error) {
                log.error('ERROR: getInputData', error);
            }
        }

        const map = (context) => {
            try {
                context.write({
                    key: context.key,
                    value: context.value
                });
            } catch (error) {
                log.error('ERROR: map', error);
            }
        }

        const reduce = (reduceContext) => {
            try {
                var values = JSON.parse(reduceContext.values);
                var recordId = values.id;
                var customerId = values.values['internalid.customerMain'].value;
                var type = values.values.type.value;
                var typeToLoad, templateId, recordPdfName, emailSubject, contactEmailType;
                if (type != 'CustInvc' && type != 'CustCred') return;
                if (type == 'CustInvc') {
                    typeToLoad = record.Type.INVOICE;
                    templateId = 122;
                    recordPdfName = '_invoice.pdf';
                    emailSubject = 'Invoice Number ';
                    contactEmailType = 1;
                }
                if (type == 'CustCred') {
                    typeToLoad = record.Type.CREDIT_MEMO;
                    templateId = 136;
                    recordPdfName = '_credit_memo.pdf';
                    emailSubject = 'Credit Memo Number ';
                    contactEmailType = 4;
                }

                var orderRecord = record.load({
                    type: typeToLoad,
                    id: recordId,
                });
                var tranId = orderRecord.getValue('tranid');
                var renderer = render.create();
                renderer.setTemplateById(templateId);
                renderer.addRecord({
                    templateName: 'record',
                    record: orderRecord
                });
                var recordPdf = renderer.renderAsPdf();
                recordPdf.isOnline = true;
                recordPdf.name = tranId + recordPdfName;
                recordPdf.type = file.Type.PDF;

                var emails = getEmailsFromRelationships(customerId, contactEmailType);
                log.audit('BEFORE SEND: ', { emails, fileName: recordPdf.name });
                if (emails && emails.length) {
                    emails = emails.filter(function (em) {
                        return !!em
                    })
                    log.audit('Send Email: ', { emails, fileName: recordPdf.name });
                    email.send({
                        author: 96988, //"noreply@acme.com"
                        recipients: emails, //84733
                        subject: emailSubject + tranId,
                        body: 'Attached is: ' + recordPdf.name,
                        attachments: [recordPdf]
                    });
                    record.submitFields({
                        type: typeToLoad,
                        id: orderRecord.id,
                        values: { 'custbody_sdb_daily_email_sent': true },
                    })
                } else {
                    log.audit('No Contacts Email: ', { emails, fileName: recordPdf.name });
                }
            } catch (error) {
                log.error('ERROR: map', error);
            }
        }

        function getEmailsFromRelationships(customerId, contactEmailType) {
            try {
                var emails = [];
                var customerSearchObj = search.create({
                    type: 'customer',
                    filters:
                        [
                            ['stage', 'anyof', 'CUSTOMER'],
                            'AND',
                            ['internalid', 'anyof', customerId],
                            'AND',
                            ['contact.custentity_to_be_emailed', 'is', 'T'],
                            'AND',
                            ['contact.email', 'isnotempty', '']
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'custentity_sdb_type_of_email',
                                join: 'contact',
                                label: 'Type Of Email To Send'
                            }),
                            search.createColumn({
                                name: 'email',
                                join: 'contact',
                                label: 'Email'
                            }),
                            search.createColumn({
                                name: 'internalid',
                                join: 'contact'
                            })
                        ]
                });
                customerSearchObj.run().each(function (result) {
                    // if (result.getValue({ name: 'custentity_sdb_type_of_email', join: 'contact' }).includes(contactEmailType)) emails.push(result.getValue({ name: 'email', join: 'contact' }));
                    if (result.getValue({ name: 'custentity_sdb_type_of_email', join: 'contact' }).includes(contactEmailType)) emails.push(result.getValue({ name: 'internalid', join: 'contact' }));
                    return true;
                });

                return emails;
            } catch (error) {
                log.error('ERROR: getEmailsFromRelationships', error);
            }
        }

        return { getInputData, map, reduce }

    });
