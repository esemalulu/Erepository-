/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/log'],
    function (search, record, email, runtime, log) {

        //entry - getInputData
        function getInputData() {
            try {
                var searchId = runtime.getCurrentScript().getParameter({ name: 'custscript_pendingmessagessearch' });
                return search.load({ id: searchId });
            }
            catch (e) {
                log.error({
                    title: 'getInputData e',
                    details: JSON.stringify(e)
                });
            }
        }

        //entry - map
        function map(context) {
            try {
                log.debug({
                    title: 'got message',
                    details: JSON.stringify(context.key)
                });
                //load message from queue and attempt to process
                var messageRec = record.load({
                    type: 'customrecordr7messagequeue',
                    id: context.key
                });
                processMessage(messageRec);
            }
            catch (e) {
                log.error({
                    title: 'map e',
                    details: JSON.stringify(e)
                });
            }
        }

        //function processMessage - processes 1 individual message in the queue
        function processMessage(messageRec) {
            var queue = messageRec.getValue({ fieldId: 'custrecordr7mq_name' });
            var messageObj = JSON.parse(messageRec.getValue({ fieldId: 'custrecordr7mq_messagecontent' }));
            log.debug({
                title: 'got queue',
                details: queue
            });

            var success = false;
            switch (queue) {
                case 'sendDedicatedBuildRequestEmail':
                    success = sendDedicatedBuildRequestEmail(messageRec, messageObj);
                    break;
                default:
                    break;
            }

            if (success) {
                messageRec.setValue({ fieldId: 'custrecordr7mq_status', value: 2 });
                messageRec.save();
                log.debug({
                    title: 'message ' + messageRec.id + ' successfully processed'
                });
            }
        }

        //function logMessageException, adds exception message to notes of message record, sets status to exception
        function logMessageException(messageRec, exceptionMsg) {
            try {
                messageRec.setValue({ fieldId: 'custrecordr7mq_notes', value: exceptionMsg });
                messageRec.setValue({ fieldId: 'custrecordr7mq_status', value: 3 });
                messageRec.save();
            }
            catch (e) {
                log.error({
                    title: 'logMessageException e',
                    details: JSON.stringify(e)
                });
            }
        }

        //function sendDedicatedBuildRequestEmail, handler for 'sendDedicatedBuildRequestEmail' queue
        function sendDedicatedBuildRequestEmail(messageRec, messageObj) {
            try {
                //parse object
                var salesOrderId = messageObj.salesOrderId;
                var lineNum = messageObj.lineNum - 1;
                var dedicatedId = messageObj.dedicatedId;

                //load sales order
                var soRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: salesOrderId
                });

                //check if license has been processed, if so, send email
                var licenseIdText = soRec.getSublistValue({ sublistId: 'item', fieldId: 'custcolr7translicenseid', line: lineNum });
                if (licenseIdText != null && licenseIdText != '' && licenseIdText != 'XXX') {
                    var licenseInternalId = licenseIdText.replace('NXL', '');
                    var licRec = record.load({
                        type: 'customrecordr7nexposelicensing',
                        id: licenseInternalId
                    });

                    //RIVMHOSD, RNXHOSD-CONTENT, RNXHOSD-TERM-CONTENT, RGSANXHOSD-Content
                    var legacyRenewalSkus = ['3141', '3374', '3376', '3063'];

                    //IVMESS-SUB
                    var onePriceRenewalSku = '7446';

                    var itemId = soRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: lineNum });
                    var oneItemFlow = soRec.getSublistValue({ sublistId: 'item', fieldId: 'custcolr7_one_item_flow', line: lineNum });

                    var purchaseOrRenewal = ' PURCHASE ';
                    if (itemId == onePriceRenewalSku) {
                        if (oneItemFlow == '3') {
                            purchaseOrRenewal = ' RENEWAL ';
                        }
                    }
                    else {
                        for (var i = 0; i < legacyRenewalSkus.length; i++) {
                            if (itemId == legacyRenewalSkus[i]) {
                                purchaseOrRenewal = ' RENEWAL ';
                            }
                        }
                    }

                    log.debug({
                        title: 'sendDedicatedBuildRequestEmail debug',
                        details: JSON.stringify({
                            itemId: itemId,
                            oneItemFlow: oneItemFlow,
                            legacyRenewalSkus: legacyRenewalSkus,
                            onePriceRenewalSku: onePriceRenewalSku,
                            purchaseOrRenewal: purchaseOrRenewal
                        })
                    });

                    //collect values for email
                    var customerName = soRec.getText('entity');
                    var orderName = soRec.getValue('tranid');
                    var numIPs = licRec.getValue({ fieldId: 'custrecordr7nxlicensenumberips' });
                    var expDate = licRec.getValue({ fieldId: 'custrecordr7nxlicenseexpirationdate' });
                    var daysRem = licRec.getValue({ fieldId: 'custrecordr7nxlicensenumberofdaysuntilex' });
                    var prodKey = licRec.getValue({ fieldId: 'custrecordr7nxproductkey' });
                    var prodSerialNum = licRec.getValue({ fieldId: 'custrecordr7nxproductserialnumber' });
                    var licRecLink = 'https://' + runtime.accountId.replace('_', '-').toLowerCase() + '.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=58&id=' + licenseInternalId;
                    var soRecLink = 'https://' + runtime.accountId.replace('_', '-').toLowerCase() + '.app.netsuite.com/app/accounting/transactions/salesord.nl?id=' + salesOrderId;

                    //don't send email yet if PEND productkey
                    if (prodKey.indexOf("PEND") > -1) {
                        return false;
                    }

                    //setup email
                    var author = 99939050;
                    var toHelpdesk = 'hosted-helpdesk@rapid7.com';
                    var ccArray = [];
                    ccArray.push('Derek_Kolakowski@rapid7.com');
                    ccArray.push('michael_burstein@rapid7.com');
                    ccArray.push('pamela_card@rapid7.com');
                    ccArray.push('brian_waller@rapid7.com');
                    ccArray.push('Ahmed_Mohamed@rapid7.com');
                    ccArray.push('onboarding@rapid7.com');
                    var messageBody = 'Customer: ' + customerName;
                    messageBody += '\n License ID Text: ' + licenseIdText;
                    messageBody += '\n Number of IPs: ' + numIPs;
                    messageBody += '\n Expiration Date: ' + expDate;
                    messageBody += '\n Days Remaining: ' + daysRem;
                    messageBody += '\n Product Key: ' + prodKey;
                    messageBody += '\n Product Serial Number: ' + prodSerialNum;
                    messageBody += '\n License Link: ' + licRecLink;
                    messageBody += '\n Sales Order Link: ' + soRecLink;

                    //send email
                    email.send({
                        author: author,
                        recipients: [toHelpdesk],
                        cc: ccArray,
                        subject: customerName + ' Purchased 1 Dedicated Hosted Engine.' + purchaseOrRenewal,
                        body: messageBody,
                        relatedRecords: {
                            customRecord: {
                                id: dedicatedId,
                                recordType: '553'
                            }
                        }
                    });

                    return true;
                }
                //license not created yet, do nothing
                else {
                    return false;
                }
            }
            catch (e) {
                logMessageException(messageRec, e);
            }
        }

        //entry - reduce
        function reduce(context) {
        }

        //entry - summarize
        function summarize(summary) {
            log.audit({
                title: 'summary:',
                details: JSON.stringify(summary)
            });
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });