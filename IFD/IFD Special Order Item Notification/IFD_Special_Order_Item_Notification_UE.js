/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NAmdConfig ./IFD_Special_Order_Item_Config.json
 *
 * @description User Event script used to identify removal of special order items and send notification
 * @author Franklin Ilo (AddCore Software Corp.)
 */

define(['N/log', 'N/record', 'N/runtime', 'special_order_item_library'],
    (log, record, runtime, special_order_item_library) => {

        /**
        * Defines the function definition that is executed before the record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {

                if (scriptContext.type === scriptContext.UserEventType.COPY || scriptContext.type === scriptContext.UserEventType.CREATE) {
                    //Clear the notification details fields
                    scriptContext.newRecord.setValue({
                        fieldId: 'custbody_ifd_special_ord_item_det_not',
                        value: '',
                        ignoreFieldChange: true
                    });

                    scriptContext.newRecord.setValue({
                        fieldId: 'custbody_ifd_spec_ord_notif_processed',
                        value: '',
                        ignoreFieldChange: true
                    });
                }
            }
            catch (err) {
                log.error({title: 'Before Submit () error', details: err});
            }
        };

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            try {

                if (scriptContext.type === scriptContext.UserEventType.DELETE) {
                    return;
                }

                let currentUser = runtime.getCurrentUser();
                //Do not execute for System User modifications
                if (currentUser.id == '-4') {
                    return;
                }

                let currentScript = runtime.getCurrentScript();
                let implementationStartDate = currentScript.getParameter({name: 'custscript_ifd_so_start_date'});
                let transactionDateCreated;

                if (scriptContext.type === scriptContext.UserEventType.CREATE) {
                    transactionDateCreated = new Date();
                }
                else {
                     transactionDateCreated = scriptContext.newRecord.getValue({fieldId: 'createddate'});
                }


                log.debug({title: 'Transaction Date Created', details: transactionDateCreated});

                //If the transaction was created prior to the implementation start date, end execution
                if (transactionDateCreated < implementationStartDate) {
                    log.debug({title: 'Transaction created prior to start date', details: 'Date Created: ' + transactionDateCreated});
                    return;
                }

                let transactionRecord = record.load({
                    type: scriptContext.newRecord.type,
                    id: scriptContext.newRecord.id,
                    isDynamic: true
                });

                //Old Transaction record initialization
                let oldTransactionRecord = null;
                if (scriptContext.type !== scriptContext.UserEventType.CREATE) {
                     oldTransactionRecord = scriptContext.oldRecord;
                }

                //Retrieve Special Order item details
                let specialOrderItemsDetails = special_order_item_library.getSpecialOrderItemDetails(transactionRecord, oldTransactionRecord);
                let specialOrderItemsDetailsIsChanged;

                let specialOrderItemsDetailsString = '';
                let specialOrderItemKeys = (specialOrderItemsDetails) ? Object.keys(specialOrderItemsDetails) : [];

                //If special order items exists, then stringify the object
                if (specialOrderItemKeys && Array.isArray(specialOrderItemKeys) && specialOrderItemKeys.length > 0) {
                    specialOrderItemsDetailsString = JSON.stringify(specialOrderItemsDetails);
                }

                log.debug({title: 'Special Order Items Details: ', details: specialOrderItemsDetailsString});


                let oldSpecialOrderItemsDetailsString = '';
                if (oldTransactionRecord) {
                    oldSpecialOrderItemsDetailsString = oldTransactionRecord.getValue({fieldId: 'custbody_ifd_special_ord_item_details'});
                }

                log.debug({title: 'Old Special Order Items Details: ', details: oldSpecialOrderItemsDetailsString});

                //Check if there are no changes between the current and previous special order item details, end execution
                if (oldSpecialOrderItemsDetailsString === specialOrderItemsDetailsString) {
                    log.audit({title: 'Special Order Items Details is unchanged', details: 'End'});
                    return;
                }
                else {
                    specialOrderItemsDetailsIsChanged = true;
                    log.audit({title: 'Special Order Items Details is changed', details: specialOrderItemsDetailsIsChanged});
                }

                if (specialOrderItemsDetailsIsChanged) {
                    //Populate the Special Order Items field
                    let updateFieldKeyValues = {
                        'custbody_ifd_special_ord_item_details': specialOrderItemsDetailsString
                    };

                    let updatedRecordId = special_order_item_library.updateSpecialOrderItemsDetail(transactionRecord, updateFieldKeyValues);
                    log.audit({title: 'Updated Special Order Items Details - Record ID: ', details: updatedRecordId});
                }

            }
            catch (err) {
                log.error({title: 'After Submit () error', details: err});
            }
        };

        return {
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
