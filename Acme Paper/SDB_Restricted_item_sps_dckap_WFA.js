/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search'], function (record, error, message, runtime, search) {
    function onAction(context) {

        try {
            var soRecord = context.newRecord;
            var isdropShip = soRecord.getValue('custbody_dropship_order');
            var enteredBy = soRecord.getValue("custbody_aps_entered_by");
            var orderStatus = soRecord.getValue('orderstatus');
            var dckap = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_dckap_wfa' });
            var sps = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_sps_wfa' });
            var isEnteredBy = (enteredBy == dckap || enteredBy == sps)
            // log.debug('context.type: ', context.type)
            // log.debug('enteredBy: ', enteredBy)
            // log.debug('isEnteredBy: ', isEnteredBy)
            //if (context.type != 'create') return;
            if (!isEnteredBy) return;
            if ((orderStatus == 'B') && !isdropShip) validateApprove(soRecord, context.type);
        } catch (e) {
            log.error('onAction: ', e);
        }
    }

    // AUX. Functions
    function getRolesListValues() {
        try {
            var arrayRoles = [];
            var rolesList = search.create({
                type: "customlist_sdb_approval_roles_so_restr",
                filters:
                    [
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "name"
                        }),
                    ]
            });
            rolesList.run().each(function (result) {
                arrayRoles.push(result.getValue("name"));
                return true;
            });

            return arrayRoles;
        } catch (error) {
            log.error('getRolesListValues', error)
        }

    }//end getRolesListValues

    function checkRestrictedItems(newRecord) {
        try {
            var newRecord = newRecord;
            var customerId = newRecord.getValue("entity");
            var itemLineCount = newRecord.getLineCount("item");
            if (itemLineCount < 1) return 0;
            for (var i = 0; i < itemLineCount; i++) {
                var itemId = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if (!itemId) continue;
                var restrictedItemCheck = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_acme_restricted_item',
                    line: i
                });
                log.debug('restrictedItemCheck', restrictedItemCheck);
                if (!restrictedItemCheck || restrictedItemCheck == null) continue;
                var itemRecord = record.load({
                    type: 'inventoryitem',
                    id: itemId,
                    isDynamic: true
                });
                if (!itemRecord) continue;
                var customerLineCount = itemRecord.getLineCount({
                    sublistId: 'recmachcustrecord_acme_ri_item'
                });
                log.debug('customerLineCount', customerLineCount);
                if (customerLineCount < 1) return 1;
                var correctCustomer = 0;
                for (var i = 0; i < customerLineCount && !correctCustomer; i++) {
                    var itemCustomerId = itemRecord.getSublistValue({
                        sublistId: 'recmachcustrecord_acme_ri_item',
                        fieldId: 'custrecord_acme_ri_customer',
                        line: i
                    });
                    if (!itemCustomerId) continue;
                    log.debug('itemCustomerId', itemCustomerId);
                    if (itemCustomerId == customerId) return 1;
                }
                //If customer is not inside customer's restricted list inside item record
                if (!correctCustomer) return 1;
            }//end for
        } catch (error) {
            log.error('checkRestrictedItems', error)
        }
        return 0;
    }

    function validateApprove(soRecord, contexType) {
        try {
            log.audit('contexType', contexType);
            var currentRecord = soRecord;
            var currentRoleId = runtime.getCurrentUser().role;
            var roleLabel = search.lookupFields({
                type: search.Type.ROLE,
                id: currentRoleId,
                columns: 'name'
            })?.name;
            var arrayRolesList = getRolesListValues();
            var checkRestrict = checkRestrictedItems(soRecord) == 1 ? true : false;
            var hasPermissionToApprove = arrayRolesList.includes(roleLabel);
            log.audit('validateApprove checkRestrict', checkRestrict);
            log.audit('validateApprove hasPermissionToApprove', hasPermissionToApprove);
            if (hasPermissionToApprove && checkRestrict) {
                var docNumber = currentRecord.getValue('tranid')
                currentRecord.setValue('orderstatus', 'A');
                if (contexType == 'create') sendApprovalEmail(docNumber, currentRecord.id)
            }
        } catch (error) {
            log.error({
                title: 'validateApprove',
                details: error
            })
        }
    }

    function sendApprovalEmail(docNumber, soId) {

        try {
            var emailRecipients = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_receiptients_wfa' });
            var emailSender = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_sender_noreply_wfa' })
            var pathtransactions = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_path_so_wfa' })
            pathtransactions += soId;
            var emailSubject = 'A sales order with Restricted Item has been created that requires approval '
            var emailBody = 'This sales order requires your approval.<br/>';
            emailBody += '<a href=' + pathtransactions + '>Click here to go to the Sales order.</a><br/>';
            emailBody += '</p><br/><br/>Thank you';
            email.send({
                author: emailSender,
                recipients: emailRecipients,
                subject: emailSubject,
                body: emailBody,
            });
            log.audit('Sent email');
        } catch (error) {
            log.error('ERROR senEmail', error)
        }
    }

    return {
        onAction: onAction
    }
});





