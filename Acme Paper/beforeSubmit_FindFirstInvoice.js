/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 define(['N/record', 'N/search', 'N/ui/message', 'N/runtime', 'N/ui/serverWidget', 'N/email'], function (record, search, message, runtime, serverWidget, email) {
    function beforeLoad(context) {
        try {
            var newRecord = context.newRecord;
            if (context.newRecord.type == "invoice") return;
            /*
            var form = context.form;
            log.audit("form: ", form)
            var field = form.addField({
                id : 'custpage_shippaddress_list',
                type : serverWidget.FieldType.SELECT,
                label : 'SHIP TO SELECT'
            });
            form.insertField({
                field : field,
                nextfield : 'shipaddresslist'
            });
            var shipAddress = newRecord.getValue("shipaddresslist")
            log.audit("shipAddress: ", shipAddress)
            field.addSelectOption({
                value: 'a',
                text: 'Albert'
            });*/
            var orderStatus = newRecord.getValue('orderstatus');


            //------------------ QUOTES ---------------------------------------
            if (context.type == context.UserEventType.VIEW && context.newRecord.type == "estimate") {
                var hasRestricted = checkRestrictedItems(context);
                log.debug('hasRestricted?', hasRestricted);
                if (hasRestricted == 0) return;

                //Showing pop-up
                context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'If a Sales Order is created has to be approved mannually because it has restricted items!', duration: 0 });
            }

            //------------------ SALES ORDER ----------------------------------
            if (context.newRecord.type != "salesorder") return;

            if (context.type == context.UserEventType.VIEW && orderStatus == 'A') {

                var currentRoleId = runtime.getCurrentUser().role;
                var roleLabel = search.lookupFields({
                    type: search.Type.ROLE,
                    id: currentRoleId,
                    columns: 'name'
                })?.name;

                var arrayRolesList = getRolesListValues();

                var hasPermissionToApprove = arrayRolesList.includes(roleLabel);

                if (hasPermissionToApprove) {
                    log.error('hasPermissionToApprove', hasPermissionToApprove);
                    context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'This sales order has restricted items and needs to be approved manually!', duration: 30000 });
                    return true;
                }

                //Showing pop-up
                context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'You do not own the right role to approve this order!', duration: 30000 });
            }

        }
        catch (e) {
            log.error('ERROR in before Load', e);
        }
    }//End before load

    function beforeSubmit(context) {
        if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {
            try {
                var soRecord = context.newRecord;
                // log.debug(runtime.getCurrentUser().id)
                // if(runtime.getCurrentUser().id == 84419 || runtime.getCurrentUser().id == 84733)setForRestockit(soRecord);
                if (context.newRecord.type == "salesorder" || context.newRecord.type == "invoice")setForRestockit(soRecord);
                if (context.newRecord.type != "salesorder") return;
                var isdropShip = soRecord.getValue('custbody_dropship_order');
                log.audit("isdropShip", isdropShip)
                if (!isdropShip) {
                    var approvedTrue = soRecord.getValue('custbody_sdb_approved_from_btn');
                    var orderstatus = soRecord.getValue('orderstatus');
                    log.audit("approvedTrue", approvedTrue)
                    log.audit("orderstatus", orderstatus)
                    var checkRittems = checkRestrictedItems(context)
                    log.audit("checkRittems", checkRittems)
                   if (checkRittems == 1 && !approvedTrue && orderstatus == 'B') {
                        soRecord.setValue('orderstatus', 'A');//ADD 23/5
                        log.audit("soRecord.orderstatus A", soRecord.getValue('orderstatus'))
                    } else if (checkRittems == 0 && orderstatus == 'A') {
                        soRecord.setValue('orderstatus', 'B');//ADD 31/5
                        log.audit("soRecord.orderstatus B", soRecord.getValue('orderstatus'))
                    }
                }
                var order = soRecord.getValue({ fieldId: 'tranid' });
                soRecord.setValue('custbody_transaction_number', order);
               
            }//try end

            catch (e) {
                log.error("Error beforeSubmit", e);
            }//end of catch
        }
    }

    function afterSubmit(context) {
        if (context.newRecord.type != "salesorder") return;
        try {
            var currentRecord = context.newRecord;
            var oldRecord = context.oldRecord;
            var orderStatus = currentRecord.getValue('orderstatus');
            var oldStatus;
            if (oldRecord) oldStatus = oldRecord.getValue('orderstatus');
            var isdropShip = currentRecord.getValue('custbody_dropship_order');
            log.audit("isdropShip", isdropShip)
            if (context.type == 'create' || context.type == 'edit') {
                if ((context.type == 'create' && orderStatus == 'A') || (orderStatus == 'A' && oldStatus == 'B') && !isdropShip) validateApprove(context, orderStatus, oldStatus);
                var recordId = context.newRecord.id;
                var i_custId = currentRecord.getValue("entity");
                var i_shipname = '';
                try {
                    i_shipname = currentRecord.getText("shipaddresslist");
                } catch (error) {
                    log.error({
                        title: 'Get text i_shipname',
                        details: error
                    })
                }

                log.debug("i_custId", i_custId);
                log.debug("i_shipname", i_shipname);
                var filter = [
                    ["mainline", "is", "T"],
                    "AND",
                    ["entity", "anyof", i_custId]
                ]
                if (i_shipname) filter = [
                    ["mainline", "is", "T"],
                    "AND",
                    ["entity", "anyof", i_custId],
                    "AND",
                    ["shipname", "is", i_shipname]
                ]
                var invoiceSearchObj = search.create({
                    type: "invoice",
                    filters: filter,
                    columns: [
                        search.createColumn({
                            name: "internalid",
                            label: "internal ID"
                        }),
                    ]
                });
                var searchResultCount = invoiceSearchObj.runPaged().count;
                log.debug("invoiceSearchObj result count", searchResultCount);
                if (searchResultCount === 0) {

                    var soObj = record.load({
                        type: record.Type.SALES_ORDER,
                        id: recordId,
                        isDynamic: true
                    });
                    // Added on 28/07/21 - Add Extra condition for SDS sheet value should be available....
                    var lineCount = soObj.getLineCount({ sublistId: 'item' });
                    for (var ilc = 0; ilc < lineCount; ilc++) {
                        var item = soObj.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ilc });
                        var itemType = soObj.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ilc });
                        // custitem_sds_fileid custitem_acc_sds_sheet  
                        switch (itemType) {
                            case 'InvPart':
                                itemType = search.Type.INVENTORY_ITEM;
                                break;

                            case 'Assembly':
                                itemType = search.Type.ASSEMBLY_ITEM;
                                break;

                            case 'NonInvPart':
                                itemType = search.Type.NON_INVENTORY_ITEM;
                                break;

                            case 'Service':
                                itemType = search.Type.SERVICE_ITEMs;
                                break;

                            case 'GiftCert':
                                itemType = search.Type.SERVICE_ITEMs;
                                break;

                            case 'Discount':
                                itemType = search.Type.DISCOUNT_ITEM;
                                break;

                            case 'OthCharge':
                                itemType = search.Type.OTHER_CHARGE_ITEM;
                                break;

                        }
                        var itemInfo = search.lookupFields({
                            type: itemType,
                            id: item,
                            columns: ['custitem_sds_fileid', 'custitem_acc_sds_sheet']
                        });

                        if (checkValidOrNot(itemInfo.custitem_sds_fileid) || checkValidOrNot(itemInfo.custitem_acc_sds_sheet)) {
                            soObj.setValue("custbody3", true);
                            soObj.save();
                            log.debug("rec updated");
                            break;
                        }
                    }
                }

            }

        } catch (e) {
            log.error('ERROR AfterSubmit', e);
        }
        /// script moved to here:ACME UE Set Item LIne Price.js
        var Restockit_Orders_Employee = '72783';
        var Network_Orders_Employee = '72782';
        var scriptType = context.type;
        var newSORec = context.newRecord;
        var exContext = runtime.executionContext;
        var recordType = newSORec.type;
        var recordId = newSORec.id;
        log.debug('AS exContext is ' + exContext + ' AS recordType is ' + recordType, 'AS recordId is ' + recordId + ' scriptType is ' + scriptType);
        try {
              if (scriptType == 'create' && exContext == 'MAPREDUCE') {
                var soObj = record.load({ type: recordType, id: recordId });

                var enteredBy = soObj.getValue('custbody_aps_entered_by');
                log.debug('AS enteredBy is ', enteredBy);
                if (enteredBy == Restockit_Orders_Employee || enteredBy == Network_Orders_Employee) {
                    var itemLineTotal = soObj.getLineCount({ sublistId: 'item' });

                    for (var curLine = 0; curLine < itemLineTotal; curLine++) {
                       //Markup for Restockit // ADD 19-08-24
                        soObj.setSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_markup_percent', line: curLine, value: 6 });
                        var costestimaterate = soObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: curLine }) || "";
                        var markup = soObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_markup_percent', line: curLine }) || 6;
                        var temp = 1 - (Number(markup) / 100);
                        var rate = costestimaterate ? (1 / Number(temp)) * Number(costestimaterate) : soObj.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: curLine });
                        log.debug('rate is ', rate);
                        soObj.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: curLine, value: rate.toFixed(2) });
                        //Markup for Restockit END 
                      
                        var ediLineUnitPrice = soObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_edi_unit_price', line: curLine });
                        log.debug('AS ediLineUnitPrice is ', ediLineUnitPrice);
                        if (ediLineUnitPrice) {
                            soObj.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: curLine, value: ediLineUnitPrice });
                        }
                    }

                    var updatedSalesOrderId = soObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                    log.audit('updatedSalesOrderId is ', updatedSalesOrderId);
                }
            }
        } catch (afterSubmitError) {
            log.error('afterSubmit error is ', afterSubmitError.message);
        }
    }

    function checkValidOrNot(value) {
        if ((value != null) && (value != '') && (value != undefined) && (value.toString() != 'NaN')) {
            return true;
        } else {
            return false;
        }
    }
    function getRolesListValues() {
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
    }//end getRolesListValues

    function checkRestrictedItems(context) {
        var newRecord = context.newRecord;
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

            let itemRecord = record.load({
                type: 'inventoryitem',
                id: itemId,
                isDynamic: true
            });

            if (!itemRecord) continue;
            let customerLineCount = itemRecord.getLineCount({
                sublistId: 'recmachcustrecord_acme_ri_item'
            });
            log.debug('customerLineCount', customerLineCount);
            if (customerLineCount < 1) return 1;
            var correctCustomer = 0;

            for (let i = 0; i < customerLineCount && !correctCustomer; i++) {
                var itemCustomerId = itemRecord.getSublistValue({
                    sublistId: 'recmachcustrecord_acme_ri_item',
                    fieldId: 'custrecord_acme_ri_customer',
                    line: i
                });
                if (!itemCustomerId) continue;

                log.debug('itemCustomerId', itemCustomerId);

                if (itemCustomerId == customerId) correctCustomer = 1;
            }

            //If customer is not inside customer's restricted list inside item record
            if (!correctCustomer) return 1;

        }//end for

        return 0;
    }

    function validateApprove(context, orderStatus, oldStatus) {
        try {

            var currentRecord = context.newRecord;
            var enteredby = currentRecord.getValue('custbody_aps_entered_by');
            var currentRoleId = runtime.getCurrentUser().role;
            var roleLabel = search.lookupFields({
                type: search.Type.ROLE,
                id: currentRoleId,
                columns: 'name'
            })?.name;

            var arrayRolesList = getRolesListValues();
            var checkRestrict = checkRestrictedItems(context) == 1 ? true : false;
            var hasPermissionToApprove = arrayRolesList.includes(roleLabel);
            log.audit('validateApprove checkRestrict', checkRestrict);
            log.audit('validateApprove hasPermissionToApprove', hasPermissionToApprove);

            if (hasPermissionToApprove && checkRestrict) {
                var docNumber = currentRecord.getValue('tranid')
                if (context.type == 'create') sendApprovalEmail(docNumber, currentRecord.id)
            }
            if (context.type == 'create' || (orderStatus == 'A' && oldStatus == 'B')) sendResultByEmail(currentRecord.id, enteredby);
        } catch (error) {
            log.error({
                title: 'validateApprove',
                details: error
            })
        }
    }
    //Send email for approval process to Keith
    function sendApprovalEmail(docNumber, soId) {

        try {
            var emailRecipients = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_receiptients' });
            var emailSender = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_sender_noreply' })
            var pathtransactions = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_path_so' })
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
    //Send email for approval process to Keith and Cc. 
    function sendResultByEmail(id, enteredby) {
        try {

            var ss = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_approval_ss' })
            var emailSender = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_sender_noreply' })
            var emailRecipients = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_receiptients' });
            var pathtransactions = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_path_so' })
            var customerService = runtime.getCurrentScript().getParameter({ name: 'custscript_sdb_customer_service' })
            pathtransactions += id;
            log.audit('ss', ss);
            if (!ss) return;
            var mySearch = search.load({ id: ss });
            var transactionIdFilter = search.createFilter({
                name: 'internalid',
                operator: search.Operator.IS,
                values: [id]
            });

            mySearch.filters.push(transactionIdFilter);
            var results = mySearch.run().getRange({ start: 0, end: 1000 });

            var buyer = '';
            var emailBody = '<h2>Result : Sales Orders - Pending Purchasing Approval</h2><br/>';
            var count = 0;
            var cc = customerService ? [customerService] : [];
            var salesRepSS = '';
            results.forEach(function (result) {
                buyer = result.getValue({ name: 'custitem_buyer', join: 'item' });
                salesRepSS = result.getValue({ name: 'salesrep' })
                emailBody += '<p>Date: ' + result.getValue({ name: 'trandate' }) || '' + '</p><br>';
                emailBody += '<p>Document Number: ' + result.getValue({ name: 'tranid' }) || '' + '</p><br>';
                emailBody += '<p>Name: ' + result.getText({ name: 'entity' }) || '' + '</p><br>';
                emailBody += '<p>Memo: ' + result.getValue({ name: 'memo' }) || '' + '</p><br>';
                emailBody += '<p>Amount: ' + result.getValue({ name: 'amount' }) || '' + '</p><br>';
                emailBody += '<p>Ship Date: ' + result.getValue({ name: 'startdate' }) || '' + '</p><br>';
                emailBody += '<p>Item: ' + result.getText({ name: 'item' }) || '' + '</p><br>';
                emailBody += '<p>Buyer: ' + result.getText({ name: 'custitem_buyer', join: 'item' }) || '' + '</p><br><br>';
                emailBody += '<p><a href=' + pathtransactions + '>View Record</a></p><br>';
                count++;
            });
            if (salesRepSS) cc.push(salesRepSS);
            if (buyer) cc.push(buyer);
            if (enteredby) cc.push(enteredby);
            if (count == 0) return;
            log.audit('cc', cc);
            //Sen Email for Keith - CC:Entered by , buyer and customer service
            email.send({
                author: emailSender,
                recipients: emailRecipients,
                cc: cc,
                subject: 'Alert: Sales Orders - Pending Purchasing Approval',
                body: emailBody
            });

        } catch (error) {
            log.error('Error on sendResultByEmail', error)
        }
    }



    function setForRestockit(soObj) {
        try {
            log.audit('setForRestockit is ', 'enter');
            var Restockit_Orders_Employee = '72783';
            var Network_Orders_Employee = '72782';
            var Restockit_Orders_Customer = '96580';
            var enteredBy = soObj.getValue('custbody_aps_entered_by');
            var customer = soObj.getValue('entity');
            if (enteredBy == Restockit_Orders_Employee || enteredBy == Network_Orders_Employee || customer == Restockit_Orders_Customer) {
                var itemLineTotal = soObj.getLineCount({ sublistId: 'item' });
                log.audit('enteredBy is ', enteredBy);
                for (var curLine = 0; curLine < itemLineTotal; curLine++) {
                    soObj.setSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_markup_percent', line: curLine, value: 6 });
                    var costestimaterate = soObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: curLine }) || "";
                    var markup = soObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_markup_percent', line: curLine }) || 6;
                    var temp = 1 - (Number(markup) / 100);
                    var rate = costestimaterate ? (1 / Number(temp)) * Number(costestimaterate) : soObj.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: curLine });
                    log.debug('rate is ', rate);
                    soObj.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: curLine, value: rate.toFixed(2) });

                    var ediLineUnitPrice = soObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_edi_unit_price', line: curLine });
                    log.debug('AS ediLineUnitPrice is ', ediLineUnitPrice);
                    if (ediLineUnitPrice) {
                        soObj.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: curLine, value: ediLineUnitPrice });
                    }
                }
            }
        } catch (error) {
            log.error('setForRestockit', error)
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});