/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/format', 'N/url', 'N/https', '../../SSLib/2.x/SSLib_Task.js'], function (record, search, format, url, https, TaskLib) {
    var INTEGRATION_TYPE = {
        'customrecordrvsunit': {
            integration_rec_type: 'customrecord_3_integration_queue',
            queue_rec_type: 2
        },
        'customrecordrvs_recallunit': {
            integration_rec_type: 'customrecord_9_integration_queue',
            queue_rec_type: 3
        },
        'customrecordrvsseries': {
            integration_rec_type: 'customrecord_10_integration_queue',
            queue_rec_type: 4
        },
        'customrecordrvsunitretailcustomer': {
            integration_rec_type: 'customrecord_4_integration_queue',
            queue_rec_type: 1
        },
        'customrecordrvsflatratecodes': {
            integration_rec_type: 'customrecord_18_integration_queue',
            queue_rec_type: 5
        },
        'customrecordrvsclaim': {
            integration_rec_type: 'customrecord_6_integration_queue',
            queue_rec_type: 6
        },
        'customrecordrvspreauthorization': {
            integration_rec_type: 'customrecord_5_integration_queue',
            queue_rec_type: 7
        },
        'assemblyitem': { // model
            integration_rec_type: 'customrecord_11_integration_queue',
            queue_rec_type: 8
        },
        'noninventoryitem': { // decor
            integration_rec_type: 'customrecord_12_integration_queue',
            queue_rec_type: 9
        },
        'customer': { // Dealer
            integration_rec_type: 'customrecord_1_integration_queue',
            queue_rec_type: 10
        },
        'dealer_contact': {
            integration_rec_type: 'customrecord_2_integration_queue',
            queue_rec_type: 11
        },
        'vendor': {
            integration_rec_type: 'customrecord_7_integration_queue',
            queue_rec_type: 12
        },
        'vendor_contact': {
            integration_rec_type: 'customrecord_8_integration_queue',
            queue_rec_type: 13
        },
        'customrecordgranddesignpartsinquiry': {
            integration_rec_type: 'customrecord_13_integration_queue',
            queue_rec_type: 14
        },
        'customrecordrvsproductchangenotice': {
            integration_rec_type: 'customrecord_14_integration_queue',
            queue_rec_type: 15
        },
        'customrecordrvsvendorchargeback': {
            integration_rec_type: 'customrecord_15_integration_queue',
            queue_rec_type: 16
        },
        'customrecordsrv_serviceworkorder': {
            integration_rec_type: 'customrecord_16_integration_queue',
            queue_rec_type: 17
        },
        'customrecordrvsunitappliances': {
            integration_rec_type: 'customrecord_17_integration_queue',
            queue_rec_type: 18
        },
        'salesorder': {
            integration_rec_type: 'customrecord_19_integration_queue',
            queue_rec_type: 19
        },
        'estimate': {
            integration_rec_type: 'customrecord_20_integration_queue',
            queue_rec_type: 20
        }
    }

    function arrayDifference(a1, a2) {
        var result = [];
        for (var i = 0; i < a1.length; i++) {
            if (a2.indexOf(a1[i]) === -1) {
                result.push(a1[i]);
            }
        }
        for (i = 0; i < a2.length; i++) {
            if (a1.indexOf(a2[i]) === -1) {
                result.push(a2[i]);
            }
        }
        return result;
    }

    function afterSubmit(context) {
        try {
            var recordId = context.newRecord.id;
            var recordType = context.newRecord.type;
            log.debug('Record Type/Id', recordType + '/' + recordId);
            var intRecType = '';
            if (recordType === 'customrecordrvsunitretailcustomer' && context.type != context.UserEventType.DELETE) {
                const email = context.newRecord.getValue('custrecordunitretailcustomer_email');
                if (!email) {
                    record.submitFields({
                        type: recordType,
                        id: recordId,
                        values: {
                            'custrecordunitretailcustomer_email': 'mulesofterrors@granddesignrv.com'
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                }
            }
            
            if (recordType == 'assemblyitem') {
                var rec = record.load({
                    type: recordType,
                    id: recordId
                });
                if (rec.getValue({fieldId: 'custitemrvsitemtype'}) != 4) { // If Item Category is not Model
                    return true;
                }
                intRecType = INTEGRATION_TYPE[recordType].integration_rec_type;
            } else if (recordType == 'noninventoryitem') {
                var rec = record.load({
                    type: recordType,
                    id: recordId
                });
                if (rec.getValue({fieldId: 'custitemrvsitemtype'}) != 1) { // if ItemCategory is not Decor
                    return true;
                }
                intRecType = INTEGRATION_TYPE[recordType].integration_rec_type;
            } else if (recordType == 'customer') {
                var rec = record.load({
                    type: recordType,
                    id: recordId
                });
                if (rec.getValue({fieldId: 'custentityrvscreditdealer'}) != false) { // if CreditDelaer is true
                    return true;
                }
                intRecType = INTEGRATION_TYPE[recordType].integration_rec_type;
            } else if (recordType == 'contact') {
                var rec = record.load({
                    type: recordType,
                    id: recordId
                });
                var type = '';
                var typeSearch = search.create({
                    type: 'Contact',
                    filters: ['internalid', 'anyof', recordId],
                    columns: search.createColumn({
                        name: 'type',
                        join: 'company'
                    }),
                }).run().each(function (result) {
                    type = result.getValue({
                        name: 'type',
                        join: 'company'
                    });
                    return false
                });

                if (type.toUpperCase() == 'DEALER') {
                    recordType = 'dealer_contact';
                } else if (type.toUpperCase() == 'VENDOR') {
                    recordType = 'vendor_contact';
                } else {
                    return true;
                }
                intRecType = INTEGRATION_TYPE[recordType].integration_rec_type;
            } else if (recordType == 'customrecordrvsflatratecodes') {
                // The Recall units are added to the flat rate codes via recmachcustrecordrecallunit_recallcode sublist when added via a suitelet
                // Doing so does not trigger user event scripts, so we need to manually trigger the integration queue record creation.
                intRecType = INTEGRATION_TYPE[recordType].integration_rec_type;
                processRecallUnits(context);
            } else {
                intRecType = INTEGRATION_TYPE[recordType].integration_rec_type;
            }

            var recordIdx = getRecordIndex(intRecType);
            var existIntRecId = getIntRecId(intRecType, recordIdx, recordId);
            log.debug('Exist Integration Record Id', existIntRecId);


            var fieldPrefix = 'custrecord' + recordIdx;

            var intRecord = null;
            if (existIntRecId == null) {
                intRecord = record.create({
                    type: intRecType,
                    isDynamic: false
                });

                intRecord.setValue({
                    fieldId: fieldPrefix + 'recordid',
                    value: recordId
                });

                intRecord.setValue({
                    fieldId: fieldPrefix + 'reference',
                    value: 'CREATE'
                });
            } else {
                intRecord = record.load({
                    type: intRecType,
                    id: existIntRecId
                });
                intRecord.setValue({
                    fieldId: fieldPrefix + 'reference',
                    value: 'UPDATE'
                });
            }

            if (context.type == context.UserEventType.DELETE) {
                intRecord.setValue({
                    fieldId: fieldPrefix + 'isrecorddeleted',
                    value: true
                });
                intRecord.setValue({
                    fieldId: fieldPrefix + 'reference',
                    value: 'DELETE'
                });
            }

            intRecord.setValue({
                fieldId: fieldPrefix + 'lastattemptdate',
                value: new Date()
            });

            intRecord.setValue({
                fieldId: fieldPrefix + 'recordtype',
                value: INTEGRATION_TYPE[recordType].queue_rec_type
            });

            intRecord.setValue({
                fieldId: fieldPrefix + 'status',
                value: 1
            });


            var intRecId = intRecord.save();
            log.debug(recordId + ' : Created Integration Record', intRecId);
        } catch (e) {
            log.error('Error', e);
        }
    }

    function getIntRecId(recType, recordIdx, baseRecId) {
        log.debug('Base Rec Id', recordIdx + ' / ' + baseRecId);
        var intRecId = null;
        var intSearchObj = search.create({
            type: recType,
            filters: ['custrecord' + recordIdx + 'recordid', 'equalto', parseInt(baseRecId)],
            columns: ['internalid']
        }).run().each(function (result) {
            intRecId = result.id;
            return false
        });
        return intRecId;
    }

    function getRecordIndex(recordType) {
        return '_' + recordType.match(/\d+/g)[0] + '_';
    }

    function processRecallUnits(context) {
        const flatRateCodeId = Number(context.newRecord.id);
        log.debug('flatRateCodeId', flatRateCodeId);
        var taskId = TaskLib.startMapReduceScript(
            'customscript_gd_mr_recall_unit_update',
            'customdeploy_gd_mr_recall_unit_update',
            {
                'custscript_gd_flat_rate_code_id': flatRateCodeId
            });
        log.debug('taskId', taskId);
    }

    return {
        afterSubmit: afterSubmit
    }
});