/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record'],
    /**
 * @param{record} record
 */
    (record) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            try{
                var customerRecord = record.load({
                    type: 'customer',
                    id: 84628,
                    isDynamic: true,
                });

                customerRecord.selectNewLine({
                    sublistId: 'addressbook'
                });
                var newAddress = customerRecordRecord.getCurrentSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress'
                });
                newAddress.setValue({
                    fieldId: 'country',
                    value: 'US'
                });
				newAddress.setValue({
					fieldId: 'addr1',
					value: 'TestAddr1'
				});
				newAddress.setValue({
					fieldId: 'addr2',
					value: 'TestAddr2'
				});
				newAddress.setValue({
					fieldId: 'city',
					value: 'Maryland'
				});
				newAddress.setValue({
					fieldId: 'state',
					value: 'StateTest'
				});
				newAddress.setValue({
					fieldId: 'zip',
					value: '999888333'
				});
                customerRecord.commitLine({
                    sublistId: 'addressbook',
                    ignoreRecalc: false
                });

                customerRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                })
            }catch(error){
                log.error("onRequest() ERROR", error);
            }
        }

        return {onRequest}

    });
