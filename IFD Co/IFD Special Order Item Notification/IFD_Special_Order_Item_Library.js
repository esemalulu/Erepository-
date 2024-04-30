/**
 * @NApiVersion 2.1
 *
 * @description Custom module containing functionality for Special Order Item Notification
 * @author Franklin Ilo (AddCore Software Corp.)
 */

define(['N/log', 'N/record', 'N/search', 'N/runtime', 'N/email'],
	function (log, record, search, runtime, email) {

		/**
         * @description Retrieves special order items that have been modified on the sales order
         *
         * @param {Object} newSpecialOrderItems
         * @param {Object} oldSpecialOrderItems
         * @param {Array} categoriesToExclude
         * @returns {Object}
         */
        function getModifiedSpecialOrderItems (newSpecialOrderItems, oldSpecialOrderItems, categoriesToExclude) {
            let modifiedItems = {};
            let newItemsKeys = Object.keys(newSpecialOrderItems);
            log.debug({title: 'New Item Keys', details: JSON.stringify(newItemsKeys)});

            let oldItemsKeys = Object.keys(oldSpecialOrderItems);
            log.debug({title: 'Old Item Keys', details: JSON.stringify(oldItemsKeys)});

            //Flag used to check if item's excluded categories is excluded from email notifications
            let oldItemCategoryIsExcluded = false;
            let oldSpecialOrderItemId;

            //If the new item keys is empty but old items keys has values, then all special order items were removed
            if (Array.isArray(newItemsKeys) && newItemsKeys.length < 1 && Array.isArray(oldItemsKeys) && oldItemsKeys.length > 0) {
                let index;
                for (index = 0; index < oldItemsKeys.length; index++) {

                    oldSpecialOrderItemId = oldSpecialOrderItems[oldItemsKeys[index]].id;
                    oldItemCategoryIsExcluded = itemCategoryIsExcluded(oldSpecialOrderItemId, categoriesToExclude);

                    //Do not add to modified items if the item's category is excluded
                    if (oldItemCategoryIsExcluded) {
                        continue;
                    }

                    modifiedItems[oldItemsKeys[index]] = oldSpecialOrderItems[oldItemsKeys[index]];

                    //Set the previous quantity, current quantity, rate and amount
                    modifiedItems[oldItemsKeys[index]].prevqty = oldSpecialOrderItems[oldItemsKeys[index]].qty || '';
                    modifiedItems[oldItemsKeys[index]].newqty = '';
                    modifiedItems[oldItemsKeys[index]].rate = '';
                    modifiedItems[oldItemsKeys[index]].amt = '';

                    //Add the Item's preferred vendor details
                    let itemId = oldSpecialOrderItems[oldItemsKeys[index]].id;
                    let preferredVendorDetails = getItemPreferredVendorDetails(itemId);

                    modifiedItems[oldItemsKeys[index]].preferredvendorid = preferredVendorDetails.id;
                    modifiedItems[oldItemsKeys[index]].preferredvendorentityid = preferredVendorDetails.entityid;
                    modifiedItems[oldItemsKeys[index]].preferredvendorname = preferredVendorDetails.name;
                }
            }
            //If both new items and old items keys exist
            else if (Array.isArray(newItemsKeys) && newItemsKeys.length > 0 && Array.isArray(oldItemsKeys) && oldItemsKeys.length > 0) {
                let index;

                /** Loop through the old item keys and look for removed items or items with quantity changes **/
                for (index = 0; index < oldItemsKeys.length; index++) {

                    oldSpecialOrderItemId = oldSpecialOrderItems[oldItemsKeys[index]].id;
                    oldItemCategoryIsExcluded = itemCategoryIsExcluded(oldSpecialOrderItemId, categoriesToExclude);

                    //Do not add to modified items if the item's category is excluded
                    if (oldItemCategoryIsExcluded) {
                        continue;
                    }

                    //Check for keys in old special order items missing in the new special order items (i.e. removed items)
                    if (newItemsKeys.indexOf(oldItemsKeys[index]) === -1) {
                        modifiedItems[oldItemsKeys[index]] = oldSpecialOrderItems[oldItemsKeys[index]];

                        //Set the previous quantity, current quantity, rate and amount
                        modifiedItems[oldItemsKeys[index]].prevqty = oldSpecialOrderItems[oldItemsKeys[index]].qty || '';
                        modifiedItems[oldItemsKeys[index]].newqty = '';
                        modifiedItems[oldItemsKeys[index]].rate = '';
                        modifiedItems[oldItemsKeys[index]].amt = '';

                        //Add the Item's preferred vendor details
                        let itemId = oldSpecialOrderItems[oldItemsKeys[index]].id;
                        let preferredVendorDetails = getItemPreferredVendorDetails(itemId);

                        modifiedItems[oldItemsKeys[index]].preferredvendorid = preferredVendorDetails.id;
                        modifiedItems[oldItemsKeys[index]].preferredvendorentityid = preferredVendorDetails.entityid;
                        modifiedItems[oldItemsKeys[index]].preferredvendorname = preferredVendorDetails.name;
                    }
                    //If the keys in old special order item exists in the new special order items, check if quantity has changed
                    else {
                        let oldItemKey = oldItemsKeys[index];
                        let oldItemQuantity = (oldSpecialOrderItems[oldItemKey].qty) ? parseInt(oldSpecialOrderItems[oldItemKey].qty) : parseInt(newSpecialOrderItems[oldItemKey].oldrecordqty);
                        oldItemQuantity = (!isNaN(oldItemQuantity)) ? oldItemQuantity : '';

                        let newItemQuantity = parseInt(newSpecialOrderItems[oldItemKey].qty) || 0;

                        let newItemQuantityChanged = newSpecialOrderItems[oldItemKey].qtymodified;

                        log.debug({
                            title: 'Old special item exists in new special order items',
                            details: 'Key: ' + oldItemKey + ', Old Quantity: ' + oldItemQuantity + ', New Quantity: ' + newItemQuantity
                        });

                        //If the quantity is different, derive the quantity changed as the qty for the modified item object
                        if (oldItemQuantity !== newItemQuantity && newItemQuantityChanged) {
                            modifiedItems[oldItemsKeys[index]] = oldSpecialOrderItems[oldItemsKeys[index]];
                            modifiedItems[oldItemsKeys[index]].prevqty = oldItemQuantity;
                            modifiedItems[oldItemsKeys[index]].newqty = newItemQuantity;
                            modifiedItems[oldItemsKeys[index]].rate = newSpecialOrderItems[oldItemKey].rate || '';
                            modifiedItems[oldItemsKeys[index]].amt = newSpecialOrderItems[oldItemKey].amt || '';

                            //Add the Item's preferred vendor details
                            let itemId = oldSpecialOrderItems[oldItemsKeys[index]].id;
                            let preferredVendorDetails = getItemPreferredVendorDetails(itemId);

                            modifiedItems[oldItemsKeys[index]].preferredvendorid = preferredVendorDetails.id;
                            modifiedItems[oldItemsKeys[index]].preferredvendorentityid = preferredVendorDetails.entityid;
                            modifiedItems[oldItemsKeys[index]].preferredvendorname = preferredVendorDetails.name;
                        }
                    }
                }

                /**
                 * Loop through the new item keys and look for newly added items (i.e. exist in new item keys but not in old item keys. The previous loop
                 * has already processed items in old item keys but not in new items keys as well as where key exists in both sets with different quantity
                 */
                let newIndex;
                for (newIndex = 0; newIndex < newItemsKeys.length; newIndex++) {

                    //Check for keys in new special order items missing in the old special order items (i.e. newly added items)
                    if (oldItemsKeys.indexOf(newItemsKeys[newIndex]) === -1) {
                        let newItemQuantityModified = newSpecialOrderItems[newItemsKeys[newIndex]].qtymodified;

                        if (!newItemQuantityModified) {
                            continue;
                        }

                        modifiedItems[newItemsKeys[newIndex]] = newSpecialOrderItems[newItemsKeys[newIndex]];

                        //Set the previous quantity, current quantity, rate and amount
                        modifiedItems[newItemsKeys[newIndex]].prevqty = '';
                        modifiedItems[newItemsKeys[newIndex]].newqty = newSpecialOrderItems[newItemsKeys[newIndex]].qty || '';
                        modifiedItems[newItemsKeys[newIndex]].rate = newSpecialOrderItems[newItemsKeys[newIndex]].rate || '';
                        modifiedItems[newItemsKeys[newIndex]].amt = newSpecialOrderItems[newItemsKeys[newIndex]].rate || '';

                        //Add the Item's preferred vendor details
                        let itemId = newSpecialOrderItems[newItemsKeys[newIndex]].id;
                        let preferredVendorDetails = getItemPreferredVendorDetails(itemId);

                        modifiedItems[newItemsKeys[newIndex]].preferredvendorid = preferredVendorDetails.id;
                        modifiedItems[newItemsKeys[newIndex]].preferredvendorentityid = preferredVendorDetails.entityid;
                        modifiedItems[newItemsKeys[newIndex]].preferredvendorname = preferredVendorDetails.name;
                    }
                }

            }
            //If new items keys has values but old item keys is empty, then special order items were just added to the order
            else if (Array.isArray(newItemsKeys) && newItemsKeys.length > 0 && Array.isArray(oldItemsKeys) && oldItemsKeys.length < 1) {
                let index;
                for (index = 0; index < newItemsKeys.length; index++) {
                    let newItemQuantityModified = newSpecialOrderItems[newItemsKeys[index]].qtymodified;

                        if (!newItemQuantityModified) {
                            continue;
                        }

                    modifiedItems[newItemsKeys[index]] = newSpecialOrderItems[newItemsKeys[index]];

                    //Set the previous quantity, current quantity, rate and amount
                    modifiedItems[newItemsKeys[index]].prevqty = '';
                    modifiedItems[newItemsKeys[index]].newqty = newSpecialOrderItems[newItemsKeys[index]].qty || '';
                    modifiedItems[newItemsKeys[index]].rate = newSpecialOrderItems[newItemsKeys[index]].rate || '';
                    modifiedItems[newItemsKeys[index]].amt = newSpecialOrderItems[newItemsKeys[index]].rate || '';

                    //Add the Item's preferred vendor details
                    let itemId = newSpecialOrderItems[newItemsKeys[index]].id;
                    let preferredVendorDetails = getItemPreferredVendorDetails(itemId);

                    modifiedItems[newItemsKeys[index]].preferredvendorid = preferredVendorDetails.id;
                    modifiedItems[newItemsKeys[index]].preferredvendorentityid = preferredVendorDetails.entityid;
                    modifiedItems[newItemsKeys[index]].preferredvendorname = preferredVendorDetails.name;
                }
            }
            else {
                log.debug({title: 'Missing new and old items details', details: 'End'});
            }

            log.debug({title: 'Modified Items', details: JSON.stringify(modifiedItems)});
            return modifiedItems;
        }


		/**
         * @description Updates the special order items details header field on the record
         *
         * @param {record} record
         * @param {Object} fieldValues
         * @returns {Integer}
         */
        function updateSpecialOrderItemsDetail (record, fieldValues) {
            let recordId;
            if (record && fieldValues) {
                let fieldIds = Object.keys(fieldValues);
                if (Array.isArray(fieldIds) && fieldIds.length > 0) {
                    let fieldIndex;
                    for (fieldIndex = 0; fieldIndex < fieldIds.length; fieldIndex++) {
                        record.setValue({
                            fieldId: fieldIds[fieldIndex],
                            value: fieldValues[fieldIds[fieldIndex]],
                            ignoreFieldChange: true
                        });
                    }

                    //Update the IFD Special Order Items Last Modified field
                    record.setValue({fieldId: 'custbody_ifd_special_ord_item_modified', value: new Date()});

                    recordId = record.save({ignoreMandatoryFields: true, enableSourcing: false});
                }
            }
            return recordId;
        }

		/**
         * @description Sends email notification about the modifiecation of special order items from the transaction
         *
         * @param {Object} removedItems
         * @param {Object} scriptContext
         * @param {Object} transactionRecord
         * @returns {Object}
         */
        function sendSpecialOrderItemModifiedEmail (modifiedItems, scriptContext, transactionRecord) {
            let sendEmailResponse = {};

            if (modifiedItems) {
                log.debug({title: 'Sending Item Modified email', details: JSON.stringify(modifiedItems)});
                let modifiedItemsKeys = Object.keys(modifiedItems);

                let tranId = transactionRecord.getValue({fieldId: 'tranid'}) || '';
                let transactionSalesRep = transactionRecord.getValue({fieldId: 'salesrep'}) || '';
                let transactionCustomerName = transactionRecord.getText({fieldId: 'entity'}) || '';
                let transactionShipDate = transactionRecord.getText({fieldId: 'shipdate'}) || '';

                let currentScript = runtime.getCurrentScript();
                let emailAuthor = currentScript.getParameter({name: 'custscript_ifd_so_item_email_author'});
                let emailRecipients = currentScript.getParameter({name: 'custscript_ifd_so_item_email_recipients'});
                let emailRecipientsArray = (emailRecipients) ? emailRecipients.split(",") : [];

                //Add the sales rep to the recipients
                if (transactionSalesRep) {
                    emailRecipientsArray.push(transactionSalesRep);
                }

                let currentUserName = runtime.getCurrentUser().name;

                if (emailAuthor) {
                    let emailSubject = 'Special Order Item(s) modified on ' + tranId;
                    let emailBody = "";
                    emailBody += "<html>";
                    emailBody += "<head><style>";
                    emailBody += "th, td {border: 1px solid #ddd;} table {border-collapse: collapse;}";
                    emailBody += "</style></head><body><div>";
                    emailBody += "Hi, ";
                    emailBody += "<br><br>";
                    emailBody += "The below special order item(s) have been modified on " + tranId + " by " + currentUserName;
                    emailBody += "<br><br>";

                    emailBody += "<table style='width: 100%;'>";
                    emailBody += "<tr style='background-color: darkgrey;'>";
                    emailBody += "<th style='text-align: center;'>Customer</th>" +
                        "<th style='text-align: center;'>Item</th>" +
                        "<th style='text-align: center;'>Ship Date</th>" +
                        "<th style='text-align: center;'>Item Buyer</th>" +
                        "<th style='text-align: center;'>Previous Qty</th>" +
                        "<th style='text-align: center;'>Current Qty</th>";

                    let count;
                    for (count = 0; count < modifiedItemsKeys.length; count++) {
                        let itemName = modifiedItems[modifiedItemsKeys[count]].name;
                        let itemBuyerName = modifiedItems[modifiedItemsKeys[count]].buyername;
                        let itemPreviousQuantity = modifiedItems[modifiedItemsKeys[count]].prevqty;
                        let itemCurrentQuantity = modifiedItems[modifiedItemsKeys[count]].newqty;
                        let itemBuyerId = modifiedItems[modifiedItemsKeys[count]].buyerid;


                        //Add the item buyer rep to the recipients
                        if (itemBuyerId) {
                            emailRecipientsArray.push(itemBuyerId);
                        }

                        emailBody += "<tr>";
                        emailBody += "<td>" + transactionCustomerName + "</td>";
                        emailBody += "<td>" + itemName + "</td>";
                        emailBody += "<td style='text-align: right;'>" + transactionShipDate + "</td>";
                        emailBody += "<td>" + itemBuyerName + "</td>";
                        emailBody += "<td style='text-align: center;'>" + itemPreviousQuantity + "</td>";
                        emailBody += "<td style='text-align: center;'>" + itemCurrentQuantity + "</td>";
                    }

                    emailBody += "</table>";
                    emailBody += "</div></body></html>";

                    let recipientIndex, batchRecipients = [];

                    for (recipientIndex = 0; recipientIndex < emailRecipientsArray.length; recipientIndex++) {
                        batchRecipients.push(emailRecipientsArray[recipientIndex].trim());

                        //Send email to recipient of multiples of 10s
                        if (((recipientIndex+1) == emailRecipientsArray.length) || (((recipientIndex+1) % 10) == 0)) {
                            log.audit({title: 'Sending Notification Email: Recipients', details: JSON.stringify(batchRecipients)});

                            if (Array.isArray(batchRecipients) && batchRecipients.length > 0) {
                                email.send({
                                    author: emailAuthor,
                                    recipients: batchRecipients,
                                    subject: emailSubject,
                                    body: emailBody,
                                    relatedRecords: {
                                        transactionId: scriptContext.newRecord.id
                                    }
                                });
                            }
                        }
                    }
                }
            }

            return sendEmailResponse;
        }

        /**
         * @description Retrieves the Special Order Notification Details
         *
         * @param {Object} orderValues
         * @param {Array} categoriesToExclude
         * @returns {Array}
         */
        function getSalesOrderSpecialOrderNotificationDetails (orderValues, categoriesToExclude) {
            let orderNotificationDetails = [];

            log.debug({title: 'getSalesOrderSpecialOrderNotificationDetails() - Start', details: JSON.stringify(orderValues)});

            if (orderValues) {
                let orderId = (orderValues.internalid) ? orderValues.internalid.value : '';

                if (!orderId) {
                    log.error({title: 'Unable to get order notification details', details: 'Missing Order Internal ID'});
                    return orderNotificationDetails;
                }

                let orderRecord = record.load({type: record.Type.SALES_ORDER, id: orderId, isDynamic: true});

                let orderSpecialOrderItemDetails = orderRecord.getValue({fieldId: 'custbody_ifd_special_ord_item_details'});
                orderSpecialOrderItemDetails = (orderSpecialOrderItemDetails) ? JSON.parse(orderSpecialOrderItemDetails) : {};
                log.debug({title: 'Special Order Item Details:', details: orderSpecialOrderItemDetails});

                let orderSpecialOrderItemDetailsLastNotification = orderRecord.getValue({fieldId: 'custbody_ifd_special_ord_item_det_not'});
                orderSpecialOrderItemDetailsLastNotification = (orderSpecialOrderItemDetailsLastNotification) ? JSON.parse(orderSpecialOrderItemDetailsLastNotification) : {};
                log.debug({title: 'Special Order Item Details Last Notification:', details: orderSpecialOrderItemDetailsLastNotification});

                //Get the modifications between current special order items and special order items in last notification
                let modifiedSpecialOrderItems = getModifiedSpecialOrderItems(orderSpecialOrderItemDetails, orderSpecialOrderItemDetailsLastNotification, categoriesToExclude);
                log.debug({title: 'Modified Special Order Item Details:', details: JSON.stringify(modifiedSpecialOrderItems)});

                //Get notification details for Sales Reps and Item Buyer
                orderNotificationDetails = getNotificationDetails(orderValues, modifiedSpecialOrderItems);

                //Update Special Order Item Details (Last Notification) and Special Order Notification Processed fields.
                //record.submitFields is used to prevent triggering of scripts deployed on Sales Order
                record.submitFields({
                    type: record.Type.SALES_ORDER,
                    id: orderId,
                    values: {
                        'custbody_ifd_spec_ord_notif_processed': new Date(),
                        'custbody_ifd_special_ord_item_det_not': JSON.stringify(orderSpecialOrderItemDetails)
                    },
                    options: {
                        'enablesourcing': false,
                        'ignoreMandatoryFields': true
                    }
                });
            }

            log.debug({title: 'Order Notification Details:', details: JSON.stringify(orderNotificationDetails)});
            return orderNotificationDetails;
        }

        /**
         * @description Populates the Order Notification details array with notification for Sales Reps and Item Buyers
         *
         * @param {Object} orderValues
         * @param {Object} modifiedSpecialOrderItems
         * @returns {Array}
         */
        function getNotificationDetails (orderValues, modifiedSpecialOrderItems) {
            let notificationDetails = [];

            if (orderValues && modifiedSpecialOrderItems) {
                //Process each modified special order item. For each modified special order item, create notification details for the item buyer as
                //well as the Sales Rep

                for (let key in modifiedSpecialOrderItems) {

                    //Create object for buyer notification
                    let buyerNotificationDetails = {...modifiedSpecialOrderItems[key]}; //Clone the modified special order item object

                    buyerNotificationDetails.recipientid = buyerNotificationDetails.buyerid || ''; //The buyer is the receipient
                    buyerNotificationDetails.salesrepid = (orderValues.salesrep) ? orderValues.salesrep.value : '';
                    buyerNotificationDetails.salesrepname = (orderValues.salesrep) ? orderValues.salesrep.text : '';
                    buyerNotificationDetails.tranid = orderValues.tranid;
                    buyerNotificationDetails.entityid = (orderValues.entity) ? orderValues.entity.value : '';
                    buyerNotificationDetails.entityname = (orderValues.entity) ? orderValues.entity.text : '';
                    buyerNotificationDetails.shipdate = orderValues.shipdate || '';

                    //Create object for sales rep notification
                    let salesRepNotificationDetails = {...buyerNotificationDetails}; //Clone the buyer notification object
                    salesRepNotificationDetails.recipientid = (orderValues.salesrep) ? orderValues.salesrep.value : ''; //The sales rep is the recipient

                    notificationDetails.push(buyerNotificationDetails);

                    //If the buyer is the same as the sales rep, do not add the sales rep notification details as this creates multiple entries for the line item
                    //in the email notification as both the sales rep and buyer would be receipients
                    if (buyerNotificationDetails.recipientid != salesRepNotificationDetails.recipientid) {
                        notificationDetails.push(salesRepNotificationDetails);
                    }
                }
            }

            return notificationDetails;
        }

        /**
         * @description Retrieves the item's preferred vendor details
         *
         * @param {string} itemId
         * @returns {Object}
         */
        function getItemPreferredVendorDetails (itemId) {
            let preferredVendorDetails = {id: '', name: ''};

            if (itemId) {
                let preferredVendorLookup = search.lookupFields({
                    type: search.Type.ITEM,
                    id: itemId,
                    columns: [
                        'preferredvendor.internalid',
                        'preferredvendor.entityid',
                        'preferredvendor.altname'
                    ]
                });

                if (preferredVendorLookup['preferredvendor.internalid'] && preferredVendorLookup['preferredvendor.internalid'].length > 0) {
                    preferredVendorDetails.id = preferredVendorLookup['preferredvendor.internalid'][0].value;
                }

                preferredVendorDetails.entityid = (preferredVendorLookup['preferredvendor.entityid']) ? preferredVendorLookup['preferredvendor.entityid'] : '';
                preferredVendorDetails.name = (preferredVendorDetails.entityid) ? preferredVendorDetails.entityid + ' ' : '';
                preferredVendorDetails.name += (preferredVendorLookup['preferredvendor.altname']) ? preferredVendorLookup['preferredvendor.altname'] : '';
                preferredVendorDetails.name = preferredVendorDetails.name.trim();

            }

            //log.debug({title: 'Preferred Vendor Details', details: JSON.stringify(preferredVendorDetails)});
            return preferredVendorDetails;
        }

        /**
         * @description Sends the Special Order notification email
         *
         * @param {string} authorId
         * @param {string} recipientId
         * @param {Array} notificationDetails
         * @returns {void}
         */
        function sendNotificationEmail (authorId, recipientId, notificationDetails) {
            if (authorId && recipientId && notificationDetails) {

                let emailAuthor = parseInt(authorId);
                let emailRecipient = parseInt(recipientId);
                let emailSubject = 'Special Order Item(s) Modified Notification';
                let emailBody = '';

                if (Array.isArray(notificationDetails) && notificationDetails.length > 0) {
                    log.debug({title: 'Notification Details - Pre Sort', details: JSON.stringify(notificationDetails)});

                    //Sort the Notiifcation Details by Entity ID Name
                    notificationDetails.sort(function(a, b) {
                        let aDetails = JSON.parse(a);
                        let a_entity_id = parseInt(aDetails.preferredvendorentityid);
                        a_entity_id = (!isNaN(a_entity_id)) ? a_entity_id : '';

                        let bDetails = JSON.parse(b);
                        let b_entity_id = parseInt(bDetails.preferredvendorentityid);
                        b_entity_id = (!isNaN(b_entity_id)) ? b_entity_id : '';

                        return a_entity_id - b_entity_id;
                    });

                    log.debug({title: 'Notification Details - Post Sort', details: JSON.stringify(notificationDetails)});

                    emailBody += "<html>";
                    emailBody += "<head><style>";
                    emailBody += "th, td {border: 1px solid #ddd;} table {border-collapse: collapse;}";
                    emailBody += "</style></head><body><div>";
                    emailBody += "Hi, ";
                    emailBody += "<br><br>";
                    emailBody += "The below special order item(s) have been recently modified";
                    emailBody += "<br><br>";

                    emailBody += "<table style='width: 100%;'>";
                    emailBody += "<tr style='background-color: darkgrey;'>";
                    emailBody += "<th style='text-align: center;'>Customer</th>" +
                        "<th style='text-align: center;'>Order # </th>" +
                        "<th style='text-align: center;'>Item</th>" +
                        "<th style='text-align: center;'>Ship Date</th>" +
                        "<th style='text-align: center;'>Item Buyer</th>" +
                        "<th style='text-align: center;'>Preferred Vendor</th>" +
                        "<th style='text-align: center;'>Previous Qty</th>" +
                        "<th style='text-align: center;'>Current Qty</th>" +
                        "<th style='text-align: center;'>Sales Rep</th>" +
                        "</tr>";

                    for (let count = 0; count < notificationDetails.length; count++) {
                        let detail = JSON.parse(notificationDetails[count]);
                        log.debug({title: 'Notification Detail for Index - ' + count, details: JSON.stringify(detail)});

                        emailBody += "<tr>";
                        emailBody += "<td>" + detail.entityname + "</td>";
                        emailBody += "<td>" + detail.tranid + "</td>";
                        emailBody += "<td>" + detail.name + "</td>";
                        emailBody += "<td style='text-align: right;'>" + detail.shipdate + "</td>";
                        emailBody += "<td>" + detail.buyername + "</td>";
                        emailBody += "<td>" + detail.preferredvendorname + "</td>";
                        emailBody += "<td style='text-align: center;'>" + detail.prevqty + "</td>";
                        emailBody += "<td style='text-align: center;'>" + detail.newqty + "</td>";
                        emailBody += "<td style='text-align: center;'>" + detail.salesrepname + "</td>";
                        emailBody += "</tr>";
                    }

                    emailBody += "</table>";
                    emailBody += "</div></body></html>";

                    log.debug({title: 'Email Notification Body - ', details: emailBody});

                    //Send the email
                    email.send({
                        author: emailAuthor,
                        recipients: [emailRecipient],
                        subject: emailSubject,
                        body: emailBody
                    });
                }
                else {
                    log.error({title: 'sendNotificationEmail() Error', details: 'Notification Details is empty or not greater than zero (0)'});
                }
            }
        }

        /**
         * @description Retrieves the special order item details from a Sales Order
         *
         * @param {Record} orderRecord
         * @param {Record} oldOrderRecord
         * @param {Object} scriptContext
         * @returns {Object}
         */
        function getSpecialOrderItemDetails (orderRecord, oldOrderRecord, scriptContext) {
            let specialOrderItemsDetails = {};

            if (orderRecord) {
                let currentScript = runtime.getCurrentScript();
                let categoriesToExclude = currentScript.getParameter({name: 'custscript_ifd_categories_to_exclude'});
                log.debug({title: 'Categories To Exclude', details: categoriesToExclude});

                let categoriesToExcludeArray = (categoriesToExclude) ? categoriesToExclude.split(',') : [];
                log.debug({title: 'Categories To Exclude Array', details: JSON.stringify(categoriesToExcludeArray)});

                let lastNotificationDetails = orderRecord.getValue({fieldId: 'custbody_ifd_special_ord_item_det_not'}) || '';
                let lastNotificationDetailsParsed = (lastNotificationDetails) ? JSON.parse(lastNotificationDetails) : {};

                let orderRecordItemCount = orderRecord.getLineCount({sublistId: 'item'});

                //Retrieve Special Order item details
                if (orderRecordItemCount > 0) {
                    let count;
                    for (count = 0; count < orderRecordItemCount; count++) {
                        let isSpecialOrderItem = orderRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_ifd_is_special_order_item',
                            line: count
                        });

                        let itemCategory = orderRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_ifd_item_sub_category',
                            line: count
                        });
                        log.debug({title: 'Item Category on Line ' + (count+1), details: itemCategory});

                        let itemCategoryIsExcluded = (categoriesToExcludeArray.indexOf(itemCategory) > -1) ? true : false;
                        log.debug({title: 'Item Category is Excluded', details: itemCategoryIsExcluded});

                        if (isSpecialOrderItem && !itemCategoryIsExcluded) {
                            let fieldsMapping = {
                                'item': 'id',
                                'item_display': 'name',
                                'quantity': 'qty',
                                'description': 'desc',
                                'rate': 'rate',
                                'amount': 'amt',
                                'custcol_ifd_item_buyer': 'buyerid'
                            };

                            //Get the line unique key
                            let lineUniqueKey = orderRecord.getSublistValue({sublistId: 'item', fieldId: 'lineuniquekey', line: count});
                            log.debug({title: 'Line Unique Key: ', details: lineUniqueKey});

                            let currentQuantity = orderRecord.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: count});

                            //Check the last notification details to determine if the line is a newly added line.
                            let lineExistsInNotificationDetails = false;
                            let linelastNotificationQuantity = null;

                            if (lastNotificationDetailsParsed[lineUniqueKey]) {
                                lineExistsInNotificationDetails = true;
                                linelastNotificationQuantity = lastNotificationDetailsParsed[lineUniqueKey].qty;
                            }

                            log.debug({title: 'Line Exists in Last Notification? - Qty', details: lineExistsInNotificationDetails + ' || ' + linelastNotificationQuantity});

                            //Create object for the line
                            specialOrderItemsDetails[lineUniqueKey] = {};

                            //Check if the line existed last notification - If line did not exist on last notification
                            if (!lineExistsInNotificationDetails) {
                                specialOrderItemsDetails[lineUniqueKey].qtymodified = true;
                                specialOrderItemsDetails[lineUniqueKey].oldrecordqty = '';
                            }
                            else {
                                specialOrderItemsDetails[lineUniqueKey].qtymodified = (linelastNotificationQuantity == currentQuantity) ? false : true;
                                specialOrderItemsDetails[lineUniqueKey].oldrecordqty = linelastNotificationQuantity;
                            }

                            let fieldsIds = Object.keys(fieldsMapping);

                            if (Array.isArray(fieldsIds) && fieldsIds.length > 0) {
                                let fieldIndex;
                                for (fieldIndex = 0; fieldIndex < fieldsIds.length; fieldIndex++) {
                                    //Add properties to the line object
                                    specialOrderItemsDetails[lineUniqueKey][fieldsMapping[fieldsIds[fieldIndex]]] = orderRecord.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: fieldsIds[fieldIndex],
                                        line: count
                                    });

                                    //Add additional property (buyer text) to the specialOrderItemsDetails object
                                    if (fieldsIds[fieldIndex] === 'custcol_ifd_item_buyer') {
                                        specialOrderItemsDetails[lineUniqueKey].buyername = orderRecord.getSublistText({
                                            sublistId: 'item',
                                            fieldId: fieldsIds[fieldIndex],
                                            line: count
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return specialOrderItemsDetails;
        }

        /**
         * @description Used to determine if an Item's category is excluded from email notifications
         *
         * @param {string} itemId
         * @param {Array} categoriesToExclude
         * @returns {Boolean}
         */
        function itemCategoryIsExcluded (itemId, categoriesToExclude) {
            let isExcluded = false;
            log.debug({title: 'Item Category Is Excluded? - Item ID', details: itemId});

            if (itemId && Array.isArray(categoriesToExclude) && categoriesToExclude.length > 0) {
                let itemCategoryLookup = search.lookupFields({
                    type: search.Type.ITEM,
                    id: itemId,
                    columns: ['class']
                });

                if (itemCategoryLookup && itemCategoryLookup.class && itemCategoryLookup.class.length > 0) {
                    let itemCategory = itemCategoryLookup.class[0].value;
                    isExcluded = (categoriesToExclude.indexOf(itemCategory) > -1) ? true : false;

                }
            }

            log.debug({title: 'Item Category Is Excluded for Item ID', details: isExcluded});
            return isExcluded;
        }

        return {
			getModifiedSpecialOrderItems: getModifiedSpecialOrderItems,
			updateSpecialOrderItemsDetail: updateSpecialOrderItemsDetail,
			sendSpecialOrderItemModifiedEmail: sendSpecialOrderItemModifiedEmail,
            getSalesOrderSpecialOrderNotificationDetails: getSalesOrderSpecialOrderNotificationDetails,
            sendNotificationEmail: sendNotificationEmail,
            getSpecialOrderItemDetails: getSpecialOrderItemDetails
		};
	});