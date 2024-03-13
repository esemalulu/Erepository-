/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * author: ngrigoriev
 * Date: 15.07.2019
 * Version: 1.0
 */

define(['N/record', 'N/runtime', 'N/search', 'N/task', 'N/email', 'N/render', 'N/url', 'N/ui/serverWidget', '/SuiteScripts/Toolbox/Check_Custom_Permissions_2.0'],

    function (record, runtime, search, task, email, render, url, ui, customPermissions) {

        function beforeLoad(context) {
            var licRec = context.newRecord;
            //add replay button
            if (licRec.getValue('custrecordr7_licensing_event_status') == 6) {
                var suiteletURL = url.resolveScript({
                    scriptId: 'customscriptr7licensingeventsuitelet',
                    deploymentId: 'customdeployr7licensingeventsuitelet',
                    params: {
                        licrecid: licRec.id,
                        licrecaction: 'replay'
                    }
                });
                context.form.addButton({
                    id: 'custpage_replay',
                    label: 'Replay',
                    functionName: "(function(){window.location.href = '" + suiteletURL + "';})();"
                });
            }
            if (licRec.id && customPermissions.userHasPermission('edit_oneprice_licensing_event')) {
                var suiteletURL = url.resolveScript({
                    scriptId: 'customscript_r7_fulfilctr_le_mgr',
                    deploymentId: 'customdeploy_r7_fulfilctr_le_mgr',
                    params: {
                        eventid: licRec.id
                    }
                });
                context.form.addButton({
                    id: 'custpagefulfilmentcenteredit',
                    label: 'Edit Event',
                    functionName: "(function(){window.location.href = '" + suiteletURL + "';})();"
                });
            }

            //add spoof response button
            if (runtime.getCurrentUser().id == '195305908') {
                var suiteletURL = url.resolveScript({
                    scriptId: 'customscriptr7licensingeventsuitelet',
                    deploymentId: 'customdeployr7licensingeventsuitelet',
                    params: {
                        licrecid: licRec.id,
                        licrecaction: 'spoofresponse'
                    }
                });
                context.form.addButton({
                    id: 'custpage_spoofresponse',
                    label: 'Spoof Response',
                    functionName: "(function(){window.location.href = '" + suiteletURL + "';})();"
                });
            }
        }

        function afterSubmit(context) {
            var newRecord = context.newRecord;
            var eventState = newRecord.getValue({ fieldId: 'custrecordr7_licensing_event_status' });
            log.debug('afterSubmit eventState', eventState);

            //3 Response Received
            if (eventState === '3') {
                var licensingEventRecord = record.load({ type: newRecord.type, id: newRecord.id });
                try {
                    var response = JSON.parse(newRecord.getValue({ fieldId: 'custrecordr7_response_payload' }));
                    var renewalEvent = licensingEventRecord.getValue({ fieldId: 'custrecordr7_renewal_event'});
                    log.debug('response', response);
                    log.debug('renewal event', renewalEvent);
                    
                    if (response.subscription.status === 'SUCCESS') {
                        if(renewalEvent){
                            licensingEventRecord.setValue({
                                fieldId: 'custrecordr7_licensing_event_status',
                                value: 4 //Complete
                            });
                        } else {
                            processSuccess(licensingEventRecord, response);
                            licensingEventRecord.setValue({
                                fieldId: 'custrecordr7_licensing_event_status',
                                value: 4 //Complete
                            });
                            markFulfillmentRecordsComplete(newRecord.id);
                        }
                    } else if (response.subscription.status == 'FAILURE') {
                        processFailure(licensingEventRecord, response, renewalEvent);
                        sendFailureEmail(licensingEventRecord, response);
                    }
                    licensingEventRecord.save();
                }
                catch (e) {
                    log.error('PROCESS LICENSING EVENT ERROR', JSON.stringify(e));
                    licensingEventRecord.setValue({
                        fieldId: 'custrecordr7_exception_message',
                        value: JSON.stringify(e)
                    });
                    licensingEventRecord.setValue({
                        fieldId: 'custrecordr7_licensing_event_status',
                        value: 5
                    });
                    processFailure(licensingEventRecord, response);
                    licensingEventRecord.save();
                    sendFailureEmail(licensingEventRecord, response);

                }
            }
        }

        function markFulfillmentRecordsComplete(licensingEventId) {
            var columns = search.createColumn({ name: 'internalid' });
            var filters = [];
            filters.push(
                search.createFilter({
                    name: 'custrecordopflicensingevent',
                    join: null,
                    operator: search.Operator.IS,
                    values: licensingEventId
                })
            );
            search.create({
                type: 'customrecord_onepricefulfillment',
                columns: columns,
                filters: filters
            }).run().each(function (result) {
                var opfid = result.getValue(result.columns[0]);
                var updatedId = record.submitFields({
                    type: 'customrecord_onepricefulfillment',
                    id: opfid,
                    values: {
                        custrecordopffulfillmentstatus: 2
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
                log.debug('Updated fulfillment rec ' + opfid, 'status = fulfilled');
                return true;
            });
        }

        function processSuccess(licenseRecord, response) {
            //log.debug('processSuccess', response);
            var licensesProductFields = getLicensedProductFields();
            //log.debug('licensesProductFields', licensesProductFields);
            var licenseEmailsToSend = [];
            if (response.subscription.object == 'SALES_ORDER' && response.subscription.id) {
                var soRec = record.load({ type: record.Type.SALES_ORDER, id: response.subscription.id });
                for (var i = 0; i < response.subscription.products.length; i++) {
                    var product = response.subscription.products[i];
                    var licenseInternalId = product.id;
                    var licenseLineHashes = product.lineSequenceId.split(',');
                    var licenseProductKey = product.productKey;
                    var productSerialNumber = product.productSerialNumber;
                    var licenseSerialNumber = product.licenseSerialNumber || '';
                    var licenseProductToken = product.productToken;
                    var licenseId = product.licenseId;
                    var linesCount = soRec.getLineCount({ sublistId: 'item' });

                    log.debug('processSuccess debug obj', JSON.stringify({
                        product: product,
                        licenseInternalId: licenseInternalId,
                        licenseLineHashes: licenseLineHashes,
                        licenseProductKey: licenseProductKey,
                        productSerialNumber: productSerialNumber,
                        licenseSerialNumber: licenseSerialNumber,
                        licenseProductToken: licenseProductToken,
                        licenseId: licenseId,
                        linesCount: linesCount
                    }));

                    //NEXPOSE
                    if (licenseProductToken && licenseId.indexOf('NXL') !== -1) {
                        var valuesToSubmit = { custrecordr7nxproducttoken: licenseProductToken };
                        if (product.hasOwnProperty('pairingKey') && product.pairingKey) {
                            valuesToSubmit['custrecord_r7_nx_combo_key'] = product.pairingKey
                        }
                        var updatedId = record.submitFields({
                            type: 'customrecordr7nexposelicensing',
                            id: licenseInternalId,
                            values: valuesToSubmit,
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                        log.debug('Updated ' + licenseId, 'Added productToken ' + licenseProductToken);
                    }

                    //INSIGHT
                    if (licenseProductToken && licenseId.indexOf('INP') !== -1) {
                        var valuesToSubmit = {
                            custrecordr7inpproducttoken: licenseProductToken,
                            custrecordr7inpsyncupwithipims: 3
                        };
                        if (product.hasOwnProperty('attributes') && product.attributes &&
                            product.attributes.hasOwnProperty('icsLicenseId') && product.attributes.icsLicenseId) {
                            valuesToSubmit['custrecord_r7_ics_license_id'] = product.attributes.icsLicenseId
                        }
                        var updatedId = record.submitFields({
                            type: 'customrecordr7insightplatform',
                            id: licenseInternalId,
                            values: valuesToSubmit,
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                        log.debug('Updated ' + licenseId, 'Added productToken ' + licenseProductToken);
                    }

                    //METASPLOIT
                    if (licenseProductToken && licenseId.indexOf('MSL') !== -1) {
                        var updatedId = record.submitFields({
                            type: 'customrecordr7metasploitlicensing',
                            id: licenseInternalId,
                            values: {
                                custrecordr7msproducttoken: licenseProductToken,
                                custrecordr7msproductserialno: productSerialNumber,
                                custrecordr7mslicensesyncupwithipims: 3
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                        var placeholderProductKey = search.lookupFields({
                            type: 'customrecordr7metasploitlicensing',
                            id: licenseInternalId,
                            columns: 'custrecordr7msproductkey'
                        })['custrecordr7msproductkey'];
                        log.debug("Placeholder MS PK", placeholderProductKey);
                        updateMetasploitLFMNewPK('customrecordr7metasploitlicensing', licenseInternalId, licenseProductKey, placeholderProductKey);
                        log.debug('Updated ' + licenseId, 'Added productToken ' + licenseProductToken);
                    }

                    if (licenseLineHashes) {
                        //curPproductKeyAndItem is only used for original sale. In any other cases - it will be undefined, as it is tied by created from lince hash
                        for (var n = 0; n < licenseLineHashes.length; n++) {
                            var currentLineHash = licenseLineHashes[n];
                            var curPproductKeyAndItem = getCurrentProductKeyAndItem(soRec, currentLineHash, linesCount, product);
                            log.debug('processSuccess curPproductKeyAndItem', curPproductKeyAndItem);
                            log.debug('licensesProductFields[product.productFamily]', licensesProductFields[product.productFamily]);
                            if (licensesProductFields[product.productFamily]) {
                                // populateProductForLicense(licenseProductKey, licenseSerialNumber, product, licensesProductFields, 'success');
                                populateProductForLicense(licenseProductKey, productSerialNumber, licenseSerialNumber, product, licensesProductFields, 'success');
                                if (curPproductKeyAndItem) {
                                    populateProductForLines(soRec, curPproductKeyAndItem, linesCount, licenseProductKey, licenseId);
                                    //get License Data to send confirmation email
                                    getLicenseDataToSend(licenseEmailsToSend, licensesProductFields, product, curPproductKeyAndItem);
                                    log.debug('Got license emails to send: ', licenseEmailsToSend);
                                }
                                if (n == licenseLineHashes.length - 1) {
                                    submitLFMUpdate(product.id, product.productFamily);
                                }
                            }
                        }
                    } else {
                        log.debug('line hash is not provided');
                    }
                    if (i == response.subscription.products.length - 1) {
                        soRec.save();
                        //send confirmation emails
                        log.debug('processed license, need to send confirmation email, here is the data', licenseEmailsToSend);
                    }
                }

                licenseEmailsToSend.forEach(function (element) {
                    sendActivationEmail(element);
                });


            } else {
                log.debug('No SO provided or source is not SO, skip this one')
            }
        }

        function processFailure(licensingEventRecord, response, renewalEvent) {
            log.debug('processFailure', response);
            var licensesProductFields = getLicensedProductFields();
            log.debug('licensesProductFields', licensesProductFields);
            if (response.subscription.object == 'SALES_ORDER' && response.subscription.id) {
                var soRec = record.load({ type: record.Type.SALES_ORDER, id: response.subscription.id });
                for (var i = 0; i < response.subscription.products.length; i++) {
                    var product = response.subscription.products[i];
                    var licenseLineHashes = product.lineSequenceId.split(',');
                    var licenseSerialNumber = product.licenseSerialNumber || '';
                    var licenseId = product.licenseId;
                    var linesCount = soRec.getLineCount({ sublistId: 'item' });
                    if (licenseLineHashes && !renewalEvent) {
                        //curPproductKeyAndItem is only used for original sale. In any other cases - it will be undefined, as it is tied by created from lince hash
                        for (var n = 0; n < licenseLineHashes.length; n++) {
                            var currentLineHash = licenseLineHashes[n];
                            var curPproductKeyAndItem = getCurrentProductKeyAndItem(soRec, currentLineHash, linesCount, product);
                            log.debug('processFailure', curPproductKeyAndItem);
                            if (licensesProductFields[product.productFamily]) {
                                populateProductForLicense('XXX', 'XXX', licenseSerialNumber, product, licensesProductFields, 'failure');
                                if (curPproductKeyAndItem) {
                                    populateProductForLines(soRec, curPproductKeyAndItem, linesCount, 'XXX', licenseId);
                                    //get License Data to send confirmation email
                                    //getLicenseDataToSend(licenseEmailsToSend, licensesProductFields, product, curPproductKeyAndItem);
                                    // log.debug('Updated SO with failed info: ', licenseEmailsToSend);
                                }
                                //submitLFMUpdate(product.id, product.productFamily);
                            }
                        }

                    } else {
                        log.debug('line hash is not provided');
                    }
                    if (i == response.subscription.products.length - 1) {
                        soRec.save();
                        //send confirmation emails
                        // log.debug('processed license, need to send confirmation email, here is the data', licenseEmailsToSend);
                    }
                    licensingEventRecord.setValue({
                        fieldId: 'custrecordr7_exception_message',
                        value: JSON.stringify(response)
                    });
                    licensingEventRecord.setValue({
                        fieldId: 'custrecordr7_licensing_event_status',
                        value: 6//IPIMS FAILURE
                    });
                }
            }
        }

        function getCurrentProductKeyAndItem(soRec, licenseLineHash, linesCount, product) {
            for (var currentLine = 0; currentLine < linesCount; currentLine++) {
                var lineHash = soRec.getSublistValue({ sublistId: 'item', line: currentLine, fieldId: 'custcolr7_linehash' });
                log.debug('getCurrentProductKey line ' + currentLine, lineHash);
                if (licenseLineHash == lineHash) {
                    var isPackage = checkLineForPackage(currentLine, soRec);
                    if (!isPackage || (isPackage && licenseTextMatches(currentLine, soRec, product))) {
                        return {
                            productKey: soRec.getSublistValue({ sublistId: 'item', line: currentLine, fieldId: 'custcolr7itemmsproductkey' }),
                            itemId: soRec.getSublistValue({ sublistId: 'item', line: currentLine, fieldId: 'item' }),
                            oneItemFlow: soRec.getSublistValue({ sublistId: 'item', line: currentLine, fieldId: 'custcolr7_one_item_flow' })
                        };

                    }
                }
            }
            return null;
        }

        // Package Level field is only set on packages, if value found then it is a package.
        function checkLineForPackage(currentLine, soRec) {
            var isPackage = soRec.getSublistValue({ sublistId: 'item', line: currentLine, fieldId: 'custcol_r7_pck_package_level' }) ? true : false;
            log.debug({
                title: 'checkLineForPackage',
                details: isPackage
            });
            return isPackage;
        }

        // Line hash isn't a unique id for packages, so also check if the license text matches
        // between the IPIMS response and the sales order line.
        function licenseTextMatches(currentLine, soRec, product) {
            var productLicense = product.licenseId;
            var lineLicense = soRec.getSublistValue({ sublistId: 'item', line: currentLine, fieldId: 'custcolr7translicenseid' });
            var licensesMatch = productLicense == lineLicense;
            log.debug({
                title: 'licenseTextMatches',
                details: licensesMatch
            });
            return licensesMatch;
        }

        function populateProductForLines(soRec, curPproductKeyAndItem, linesCount, licenseProductKey, licenseId) {
            //update lines on initial SO to get produckt key from IPIMS response.
            for (var i = 0; i < linesCount; i++) {
                var lineProductKey = soRec.getSublistValue({ sublistId: 'item', line: i, fieldId: 'custcolr7itemmsproductkey' });
                var itemType = soRec.getSublistValue({ sublistId: 'item', line: i, fieldId: 'itemtype' })
                log.debug('itemType to update', itemType);
                //updates order lines that associated wit the same product key
                if (lineProductKey == curPproductKeyAndItem.productKey && itemType != 'Group' && itemType != 'EndGroup') {
                    soRec.setSublistValue({ sublistId: 'item', line: i, fieldId: 'custcolr7itemmsproductkey', value: licenseProductKey });
                    soRec.setSublistValue({ sublistId: 'item', line: i, fieldId: 'custcolr7translicenseid', value: licenseId })

                }
            }
            return null;
        }

        // function populateProductForLicense(licenseProductKey, licenseSerialNumber, product, licensesProductFields, syncRes){
        function populateProductForLicense(licenseProductKey, productSerialNumber, licenseSerialNumber, product, licensesProductFields, syncRes) {

            if (licensesProductFields[product.productFamily]) {
                log.debug('licensesProductFields debug obj', JSON.stringify({
                    licensesProductFields: licensesProductFields,
                    productFamily: product.productFamily
                }));

                var licensesProductObj = licensesProductFields[product.productFamily];
                var keyField = licensesProductObj['keyField'];
                var serialField = licensesProductObj['serialField']
                var licenseIdField = licensesProductObj['licenseIdField']
                var values = {}
                values[keyField] = licenseProductKey;
                // values[serialField] = licenseSerialNumber;
                values[serialField] = productSerialNumber;
                values[licenseIdField] = licenseSerialNumber;
                values['custrecordr7_sync_up_with_ipims'] = syncRes == 'success' ? 3 : 4;//3 - synced up 4 - failed to sync up
                log.debug('populateProductForLicense values', values);
                /*var licRec = record.load({
                    type:licensesProductObj.licenseRecordName,
                    id: product.id
                });*/
                /*licRec.setValue({fieldId: keyField, value: licenseProductKey});
                // licRec.setValue({fieldId: serialField, value: licenseSerialNumber});
                licRec.setValue({fieldId: serialField, value: productSerialNumber});
                licRec.setValue({fieldId: 'custrecordr7_sync_up_with_ipims', value: 3});
                licRec.save();*/
                record.submitFields({
                    type: licensesProductObj.licenseRecordName,
                    id: product.id,
                    values: values
                });
            }
        }

        function submitLFMUpdate(licenseId, productFamily) {
            log.debug('submitLFMUpdate', { custscript_licensetype: productFamily, custscript_licenseid: licenseId });
            var taskID = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscriptr7_sync_lfm_key_license',
                //deploymentId: 'customdeployr7_sync_lfm_key_license',
                params: {
                    custscript_licensetype: productFamily,
                    custscript_licenseid: licenseId
                }
            }).submit();
            log.debug('submitted task', taskID);
        }

        function getLicensedProductFields() {
            var licenseProductKeyFields = {};
            search.create({
                type: 'customrecordr7acrproducttype',
                columns: [{ name: 'custrecordr7acractivationid' }
                    , { name: 'name' }
                    , { name: 'custrecordr7acrrecordid' }
                    , { name: 'custrecordr7acrserialnumberid' }
                    , { name: 'custrecordr7acrlicenseserialnumber' }
                    , { name: 'custrecordr7acrrecordid' }
                    , { name: 'custrecordr7acrsalesrepfieldid' }
                    , { name: 'custrecordr7acrcontactfieldid' }
                    , { name: 'custrecordr7acrcustomerfieldid' }
                ]
            }).run().each(function (result) {
                licenseProductKeyFields[result.getValue({ name: 'name' })] = {
                    acrId: result.id,
                    licRecordType: result.getValue({ name: 'custrecordr7acrrecordid' }),
                    keyField: result.getValue({ name: 'custrecordr7acractivationid' }),
                    serialField: result.getValue({ name: 'custrecordr7acrserialnumberid' }),
                    licenseIdField: result.getValue({ name: 'custrecordr7acrlicenseserialnumber' }),
                    licenseRecordName: result.getValue({ name: 'custrecordr7acrrecordid' }),
                    salesRepField: result.getValue({ name: 'custrecordr7acrsalesrepfieldid' }),
                    contactField: result.getValue({ name: 'custrecordr7acrcontactfieldid' }),
                    customerFieldId: result.getValue({ name: 'custrecordr7acrcustomerfieldid' }),
                };
                return true;
            });
            log.debug('getLicensedProductFields', getLicensedProductFields);
            return licenseProductKeyFields;
        }

        function getLicenseDataToSend(licenseEmailsToSend, licensesProductFields, product, curPproductKeyAndItem) {
            if (curPproductKeyAndItem && curPproductKeyAndItem.oneItemFlow == 1) {
                log.debug('curPproductKeyAndItem.oneItemFlow', 'new sale, send email');

                if (curPproductKeyAndItem && curPproductKeyAndItem.itemId) {
                    log.debug('getLicenseDataToSend product.productFamily', product.productFamily)
                    var licensesProductObj = licensesProductFields[product.productFamily];
                    try {
                        var itemActivationtemplate = search.lookupFields({
                            type: search.Type.ITEM,
                            id: curPproductKeyAndItem.itemId,
                            columns: 'custitemr7itemactivationemailtemplate'
                        })['custitemr7itemactivationemailtemplate'][0]['value'];
                        log.debug('getLicenseDataToSend', licensesProductObj);
                        var licenseDataLookup = search.lookupFields({
                            type: licensesProductObj.licRecordType,
                            id: product.id,
                            columns: [licensesProductObj.salesRepField
                                , licensesProductObj.contactField
                                , licensesProductObj.customerFieldId
                                , licensesProductObj.customerFieldId + '.custentityr7accountmanager'
                                , licensesProductObj.customerFieldId + '.custentityr7accountmanager'
                            ]
                        });
                        log.debug('licenseDataLookup', licenseDataLookup)
                        licenseEmailsToSend.push({
                            licenseRecordType: licensesProductObj.licRecordType,
                            licenseRecordId: product.id,
                            itemActivationtemplate: itemActivationtemplate,
                            acrItemId: licensesProductObj.acrId,
                            salesRepId: licenseDataLookup[licensesProductObj.salesRepField][0] ? licenseDataLookup[licensesProductObj.salesRepField][0]['value'] : null,
                            contactId: licenseDataLookup[licensesProductObj.contactField][0] ? licenseDataLookup[licensesProductObj.contactField][0]['value'] : null,
                            customerId: licenseDataLookup[licensesProductObj.customerFieldId][0] ? licenseDataLookup[licensesProductObj.customerFieldId][0]['value'] : null,
                            customerSM: licenseDataLookup[licensesProductObj.customerFieldId + '.custentityr7accountmanager'][0] ? licenseDataLookup[licensesProductObj.customerFieldId + '.custentityr7accountmanager'][0]['value'] : null,
                        });
                    }
                    catch (e) {
                        log.debug('item ' + curPproductKeyAndItem.itemId + ' has no email template', JSON.stringify(e));
                    }

                }
            }
        }
        /*
        [
          {
            "licenseRecordType": "customrecordr7nexposelicensing",
            "licenseRecordId": "675637",
            "itemActivationtemplate": "1426",
            "acrItemId": "1",
            "salesRepId": "83572287",
            "contactId": "190520",
            "customerId": "190364"
          }
        ]
        *
        */
        function sendActivationEmail(emailData) {
            log.debug('sendActivationEmail', emailData);

            var success = false;
            var testing = true;
            var successMsg = '';
            try {
                if (emailData.itemActivationtemplate != null) {
                    var sendEmailFrom = runtime.getCurrentScript().getParameter({ name: 'custscript_r7licconfmailfrom' });
                    var emailReplyTo = sendEmailFrom ? runtime.getCurrentScript().getParameter({ name: 'custscript_r7licconfreplyto' }) : null;
                    //TODO change admin user
                    sendEmailFrom = sendEmailFrom ? sendEmailFrom
                        : emailData.customerSM ? emailData.customerSM
                            : emailData.salesRepId ? emailData.salesRepId
                                : 2

                        ;
                    log.debug('sendEmailFrom', sendEmailFrom);
                    log.debug('customRecord', {
                        id: emailData.licenseRecordId,
                        type: emailData.licenseRecordType
                    });
                    log.debug('emailData', emailData);
                    if (emailData.contactId) {
                        var mergeResult = render.mergeEmail({
                            templateId: emailData.itemActivationtemplate,
                            customRecord: {
                                id: Number(emailData.licenseRecordId),
                                type: emailData.licenseRecordType
                            },
                        })
                        log.debug('emailData', mergeResult);
                        email.send({
                            author: sendEmailFrom,
                            recipients: emailData.contactId,
                            subject: mergeResult.subject,
                            body: mergeResult.body,
                            relatedRecords: {
                                customRecord: {
                                    recordType: emailData.licenseRecordType,
                                    id: emailData.licenseRecordId
                                }
                            }
                        })
                        success = true;
                    }
                }
            } catch (e) {
                log.error('Could not mail activation email', e + '\n' + e.stack + '\n' + e.stackTraceLimit);
                success = false;
                successMsg = e;
            }
            //If fail to send activation email alert
            if (!success) {
                email.send({
                    author: 55011,
                    recipients: 'netsuite_admin@rapid7.com',
                    subject: 'Error on ACL Process Sales Order - Could not email license purchaser his license key.',
                    body: '\n LicenseId: <a href="https://663271.app.netsuite.com/app/common/custom/custrecordentry.nl?id=' + emailData.licenseRecordId + '&rectype=' + emailData.licenseRecordType + '&whence=">'
                        + emailData.licenseRecordId + '</a>\nContactId: <a href="https://663271.app.netsuite.com/app/common/entity/contact.nl?id=' + emailData.contactId + '">' + emailData.contactId + '</a>\n\nMessage: ' + successMsg
                });

            }
        }

        function sendFailureEmail(licensingEventRecord, response) {
            var success = false;
            try {
                //TODO change admin user
                sendEmailFrom = 2;
                var errorText;
                try {
                    var errorMessageObj = JSON.parse(licensingEventRecord.getValue({ fieldId: 'custrecordr7_exception_message' }));
                    log.debug('errorMessageObj', errorMessageObj)
                    errorText = errorMessageObj.subscription.errorInformation ? JSON.stringify(errorMessageObj.subscription.errorInformation) : JSON.stringify(errorMessageObj);
                } catch (e) {
                    log.error('could not parse exception message', e)
                    errorText = licensingEventRecord.getValue({ fieldId: 'custrecordr7_exception_message' });
                }
                email.send({
                    author: sendEmailFrom,
                    recipients: sendEmailFrom,
                    subject: 'FAILED TO PROCESS LICENSING EVENT',
                    body: 'ERROR HAPPENED WHEN PROCESSING LICENSING EVENT:    \n' + errorText,
                    relatedRecords: {
                        customRecord: {
                            recordType: licensingEventRecord.type,
                            id: licensingEventRecord.id
                        }
                    }
                })
                success = true;

            } catch (e) {
                log.error('Could not mail activation email', e + '\n' + e.stack + '\n' + e.stackTraceLimit);
                success = false;
                successMsg = e;
            }
        }

        function updateMetasploitLFMNewPK(licenseType, licenseInternalId, newProductKey, oldProductKey) {
            log.debug("Updating MS LFMs for License", licenseInternalId);
            var filters = [];
            filters.push(search.createFilter({
                name: 'custrecordr7licfmmetasploitlicenserec',
                operator: search.Operator.ANYOF,
                values: licenseInternalId
            }));
            filters.push(search.createFilter({
                name: 'custrecordr7licfmproductkey',
                operator: search.Operator.ISNOT,
                values: newProductKey
            }));
            search.create({ type: 'customrecordr7licensefeaturemanagement', filters: filters }).run().each(
                function (result) {
                    var updatedId = record.submitFields({
                        type: 'customrecordr7licensefeaturemanagement',
                        id: result.id,
                        values: {
                            custrecordr7licfmproductkey: newProductKey
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                    return true;
                });
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: null,
            afterSubmit: afterSubmit
        }
    }
);
