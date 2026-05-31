/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log'], function(record, log) {

    function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT) {
            return;
        }

        try {
            var recordId = context.newRecord.id;
            var recordType = context.newRecord.type;

            // Load the current record in editable mode
            var currentRecord = record.load({
                type: recordType,
                id: recordId,
                isDynamic: true
            });

            // Process shipping address
            processAddress(currentRecord, 'custbody_drtc_contact_for_invoice', 'shippingaddress', 'shipaddresslist', 'defaultshipping');

            // Process billing address
            processAddress(currentRecord, 'custbody_contact_for_billing', 'billingaddress', 'billaddresslist', 'defaultbilling');

            // Save the record after modification
            // currentRecord.save();

        } catch (e) {
            log.error({
                title: 'Error in afterSubmit',
                details: e.toString()
            });
        }
    }

    function processAddress(currentRecord, contactFieldId, addressFieldId, sublistId, defaultFlag) {
        var contactId = currentRecord.getValue({
            fieldId: contactFieldId
        });

        if (contactId) {
            // Load the contact record
            var contactRecord = record.load({
                type: record.Type.CONTACT,
                id: contactId
            });

            // Find the default shipping or billing address
            var addressLine = findDefaultAddress(contactRecord, defaultFlag);

            if (addressLine !== -1) {
                // Extract address details
                var addressDetails = getAddressDetails(contactRecord, addressLine);

                // Add the address to the sublist
                addAddressToSublist(currentRecord, sublistId, addressDetails);
            }
        }
    }

    function findDefaultAddress(contactRecord, defaultFlag) {
        var addressCount = contactRecord.getLineCount({
            sublistId: 'addressbook'
        });

        for (var i = 0; i < addressCount; i++) {
            var isDefault = contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: defaultFlag,
                line: i
            });

            if (isDefault) {
                return i;
            }
        }
        return -1;
    }

    function getAddressDetails(contactRecord, line) {
        return {
            label: contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: 'label',
                line: line
            }),
            attention: contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: 'attention',
                line: line
            }),
            addressee: contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: 'addressee',
                line: line
            }),
            addr1: contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: 'addr1',
                line: line
            }),
            addr2: contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: 'addr2',
                line: line
            }),
            city: contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: 'city',
                line: line
            }),
            state: contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: 'state',
                line: line
            }),
            zip: contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: 'zip',
                line: line
            }),
            country: contactRecord.getSublistValue({
                sublistId: 'addressbook',
                fieldId: 'country',
                line: line
            })
        };
    }

    function addAddressToSublist(currentRecord, sublistId, addressDetails) {
        var addressSubrecord = currentRecord.getSubrecord({
            fieldId: 'shippingaddress'
        });
        // log.debug({
        //     title: 'Details',
        //     details: currentRecord.label + currentRecord.attention + currentRecord.addressee +  currentRecord.addr1 + currentRecord.addr2 + currentRecord.city + currentRecord.state + currentRecord.zip + currentRecord.country
        // });
        log.debug("Label", currentRecord.addressee);
        log.debug("Addresse", currentRecord.addressee);
        log.debug("addr1", currentRecord.addr1);
        addressSubrecord.setValue({
            fieldId: 'label',
            value: currentRecord.label
        });

        addressSubrecord.setValue({
            fieldId: 'attention',
            value: currentRecord.attention
        });

        addressSubrecord.setValue({
            fieldId: 'addressee',
            value: currentRecord.addressee
        });

        addressSubrecord.setValue({
            fieldId: 'addr1',
            value: currentRecord.addr1
        });

        addressSubrecord.setValue({
            fieldId: 'addr2',
            value: currentRecord.addr2
        });

        addressSubrecord.setValue({
            fieldId: 'city',
            value: currentRecord.city
        });

        addressSubrecord.setValue({
            fieldId: 'state',
            value: currentRecord.state
        });

        addressSubrecord.setValue({
            fieldId: 'zip',
            value: currentRecord.zip
        });

        addressSubrecord.setValue({
            fieldId: 'country',
            value: currentRecord.country
        });
        currentRecord.save();
    }

    return {
        afterSubmit: afterSubmit
    };
});
