/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/record", "N/search", "N/email", "N/render", "N/runtime", "N/file", "N/workflow"], function (record, search, email, render, runtime, file, workflow) {

    function onRequest(context) {
        try {
            const userId = runtime.getCurrentUser()?.id || -5;

            const transactionRecordId = context.request.parameters?.transactionRecordId;

            if (!transactionRecordId) return;

            const transactionRecord = record.load({ type: 'purchaseorder', id: transactionRecordId });
            if (!transactionRecord) return;

            const shipPointPO = getShipPointPO(transactionRecord);
            if (!shipPointPO) return;

            const infoContacts = getInfoContacts(transactionRecord);
            if (!infoContacts || infoContacts?.length < 1) return;

            let contactsToSend = [];
            let contactsToSendId = [];
            for (let i = 0; i < infoContacts.length; i++) {
                const contactFields = search.lookupFields({
                    type: search.Type.CONTACT,
                    id: infoContacts[i],
                    columns: ["custentity_sdb_ship_point_contact", "email"]
                });
                log.debug("contactFields: ", contactFields);
                if (!contactFields || contactFields?.length < 1) continue;

                const shipPointContact = contactFields?.custentity_sdb_ship_point_contact[0]?.value;
                const emailContact = contactFields?.email;

                log.debug("Data: ", { shipPointContact, emailContact, shipPointPO });

                // If the ship point is not the same as the PO ship point continue searching
                if (!shipPointContact || !emailContact || shipPointContact != shipPointPO) continue;

                contactsToSend.push(emailContact);
                contactsToSendId.push(infoContacts[i]);
            }

            log.debug("🚀 ~ contactsToSend:", contactsToSend)

            sendEmail(contactsToSendId, transactionRecord, userId);

            context.response.write(JSON.stringify(contactsToSend));
        }
        catch (error) {
            log.error("error", error);
        }
    }

    // --------------------------------------- AUXILIAR FUNCTIONS --------------------------------------------------------------

    // This function retrieves the ship point inside the line item
    function getShipPointPO(transactionRecord) {
        if (!transactionRecord) return;

        var CONST_ITEMTYPE = {
            'Assembly': 'assemblyitem',
            'Description': 'descriptionitem',
            'Discount': 'discountitem',
            'GiftCert': 'giftcertificateitem',
            'InvtPart': 'inventoryitem',
            'Group': 'itemgroup',
            'Kit': 'kititem',
            'Markup': 'markupitem',
            'NonInvtPart': 'noninventoryitem',
            'OthCharge': 'otherchargeitem',
            'Payment': 'paymentitem',
            'Service': 'serviceitem',
            'Subtotal': 'subtotalitem'
        };

        // Variables
        let iterator = -1;
        let shipPoint = null;
        const sublistCount = transactionRecord.getLineCount("item");

        if (!sublistCount || sublistCount < 1) return;

        while (shipPoint == null && iterator < 10) {
            iterator++;

            const item = transactionRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: iterator
            });

            const itemType = transactionRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'itemtype',
                line: iterator
            });
            if (!itemType) continue;

            shipPoint = search.lookupFields({
                type: CONST_ITEMTYPE[itemType],
                id: item,
                columns: "custitem_ship_point"
            })?.custitem_ship_point[0]?.value;

            if (!shipPoint) continue;
        }

        log.debug("iterator", iterator);

        log.debug("shipPoint", shipPoint);

        return shipPoint;
    }

    function getInfoContacts(transactionRecord) {
        const vendorId = transactionRecord.getValue("entity");
        if (!vendorId) return [];

        let resultContacts = [];

        const contactSearchObj = search.create({
            type: "contact",
            filters:
                [
                    ["vendor.internalid", "anyof", vendorId]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
        });

        contactSearchObj.run().each(function (result) {
            resultContacts.push(result.id);
            return true;
        });

        return resultContacts;
    }

    function sendEmail(recordsToSend, transactionRecord, userId) {
        if (!recordsToSend || recordsToSend.length < 1) return;

        const fileNameTransaction = transactionRecord.getValue("tranid");
        const transactionId = transactionRecord.id;

        var transactionFile = render.transaction({
            entityId: parseInt(transactionId),
            printMode: render.PrintMode.PDF
        });

        transactionFile.folder = -11;
        var fileId = transactionFile.save();

        var subject = `Acme Paper ${fileNameTransaction}`;
        var message = `Attached is Acme Paper ${fileNameTransaction}`;

        // Set file folder
        createMessage(transactionRecord, subject, message, fileId, recordsToSend);

    }

    function createMessage(transactionRecord, subject, message, fileId, recordsToSend) {
        try {
            // let messageRecord = record.create({
            //     type: "message",
            //     isDynamic: true
            // });

            // messageRecord.setValue({
            //     fieldId: 'transaction',
            //     value: transactionRecord.id
            // });
            // messageRecord.setValue({
            //     fieldId: "entity",
            //     value: transactionRecord.getValue('entity')
            // });
            // messageRecord.setValue({
            //     fieldId: 'subject',
            //     value: subject
            // });
            // messageRecord.setValue({
            //     fieldId: 'message',
            //     value: message
            // });
            // messageRecord.setValue({
            //     fieldId: 'recipient',
            //     value: Number(recordsToSend[0])
            // });

            // // Add attachment
            // messageRecord.insertLine({
            //     sublistId: "mediaitem",
            //     line: 0
            // });
            // messageRecord.setCurrentSublistValue({
            //     sublistId: "mediaitem",
            //     fieldId: "mediaitem",
            //     value: fileId,
            // });
            // messageRecord.commitLine({
            //     sublistId: "mediaitem",
            // });

            // var messageId = messageRecord.save({
            //     enableSourcing: false,
            //     ignoreMandatoryFields: true
            // });
           
            record.submitFields({
                type: record.Type.PURCHASE_ORDER,
                id: transactionRecord.id,
                values: {custbody_sdb_emails_array : recordsToSend.join(';')},   
            });
            workflow.initiate({
                recordType: record.Type.PURCHASE_ORDER,
                recordId: transactionRecord.id,
                workflowId: 'customworkflow_sdb_send_po_emails'
            });
            workflow.trigger({
                recordId: transactionRecord.id,
                recordType: record.Type.PURCHASE_ORDER,
                workflowId: 'customworkflow_sdb_send_po_emails',
                actionId: 'workflowaction_send_email',
            });;
        } catch (e) {
            log.error("ERROR in createMessage: ", e);
        }

    }

    return {
        onRequest: onRequest
    }
});
