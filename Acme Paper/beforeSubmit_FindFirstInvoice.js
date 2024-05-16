/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/ui/message', 'N/runtime', 'N/ui/serverWidget'], function (record, search, message, runtime, serverWidget)
{
    function beforeLoad(context)
    {
        try
        {
            var newRecord = context.newRecord;
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
            if (context.type == context.UserEventType.VIEW && context.newRecord.type == "estimate")
            {
                var hasRestricted = checkRestrictedItems(context);
                log.debug('hasRestricted?', hasRestricted);
                if(hasRestricted == 0) return;

                //Showing pop-up
                context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'If a Sales Order is created has to be approved mannually because it has restricted items!', duration: 0 });
            }

            //------------------ SALES ORDER ----------------------------------
            if (context.newRecord.type != "salesorder") return;

            if (context.type == context.UserEventType.VIEW && orderStatus == 'A')
            {

                var currentRoleId = runtime.getCurrentUser().role;
                var roleLabel = search.lookupFields({
                    type: search.Type.ROLE,
                    id: currentRoleId,
                    columns: 'name'
                })?.name;

                var arrayRolesList = getRolesListValues();

                var hasPermissionToApprove = arrayRolesList.includes(roleLabel);

                if (hasPermissionToApprove)
                {
                    log.error('hasPermissionToApprove', hasPermissionToApprove);
                    context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'This sales order has restricted items and needs to be approved manually!', duration: 30000 });
                    return true;
                }

                //Showing pop-up
                context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'You do not own the right role to approve this order!', duration: 30000 });
            }

        }
        catch (e)
        {
            log.error('ERROR in before Load', e);
        }
    }//End before load

    function beforeSubmit(context)
    {
        if (context.newRecord.type != "salesorder") return;

        if (context.type == context.UserEventType.CREATE)
        {
            try
            {
                var soRecord = context.newRecord;

                var order = soRecord.getValue({ fieldId: 'tranid' });
                soRecord.setValue('custbody_transaction_number', order);

            }//try end

            catch (e)
            {
                log.debug("Error", e);
            }//end of catch
        }
    }
    function afterSubmit(context) 
    {
        if (context.newRecord.type != "salesorder") return;

        var currentRecord = context.newRecord;
        try
        {
            if (context.type == 'create' || context.type == 'edit') 
            {
                var recordId = context.newRecord.id;
                var i_custId = currentRecord.getValue("entity");
                var i_shipname = currentRecord.getText("shipaddresslist");
                log.debug("i_custId", i_custId);
                log.debug("i_shipname", i_shipname);
                var invoiceSearchObj = search.create({
                    type: "invoice",
                    filters: [
                        ["mainline", "is", "T"],
                        "AND",
                        ["entity", "anyof", i_custId],
                        "AND",
                        ["shipname", "is", i_shipname]
                    ],
                    columns: [
                        search.createColumn({
                            name: "internalid",
                            label: "internal ID"
                        }),
                    ]
                });
                var searchResultCount = invoiceSearchObj.runPaged().count;
                log.debug("invoiceSearchObj result count", searchResultCount);
                if (searchResultCount === 0)
                {

                    var soObj = record.load({
                        type: record.Type.SALES_ORDER,
                        id: recordId,
                        isDynamic: true
                    });
                    // Added on 28/07/21 - Add Extra condition for SDS sheet value should be available....
                    var lineCount = soObj.getLineCount({ sublistId: 'item' });
                    for (var ilc = 0; ilc < lineCount; ilc++)
                    {
                        var item = soObj.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ilc });
                        var itemType = soObj.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ilc });
                        // custitem_sds_fileid custitem_acc_sds_sheet  
                        switch (itemType)
                        {
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

                        if (checkValidOrNot(itemInfo.custitem_sds_fileid) || checkValidOrNot(itemInfo.custitem_acc_sds_sheet))
                        {
                            soObj.setValue("custbody3", true);
                            soObj.save();
                            log.debug("rec updated");
                            break;
                        }
                    }
                }
            }
        } catch (e)
        {
            log.debug(e);
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
        try
        {
            if (scriptType == 'create' && exContext == 'MAPREDUCE')
            {
                var soObj = record.load({ type: recordType, id: recordId });

                var enteredBy = soObj.getValue('custbody_aps_entered_by');
                log.debug('AS enteredBy is ', enteredBy);
                if (enteredBy == Restockit_Orders_Employee || enteredBy == Network_Orders_Employee)
                {
                    var itemLineTotal = soObj.getLineCount({ sublistId: 'item' });

                    for (var curLine = 0; curLine < itemLineTotal; curLine++)
                    {
                        var ediLineUnitPrice = soObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_edi_unit_price', line: curLine });
                        log.debug('AS ediLineUnitPrice is ', ediLineUnitPrice);
                        if (ediLineUnitPrice)
                        {
                            soObj.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: curLine, value: ediLineUnitPrice });
                        }
                    }

                    var updatedSalesOrderId = soObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
                    log.audit('updatedSalesOrderId is ', updatedSalesOrderId);
                }
            }
        } catch (afterSubmitError)
        {
            log.error('afterSubmit error is ', afterSubmitError.message);
        }
    }

    function checkValidOrNot(value)
    {
        if ((value != null) && (value != '') && (value != undefined) && (value.toString() != 'NaN'))
        {
            return true;
        } else
        {
            return false;
        }
    }
    function getRolesListValues()
    {
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
        rolesList.run().each(function (result)
        {
            arrayRoles.push(result.getValue("name"));
            return true;
        });

        return arrayRoles;
    }//end getRolesListValues

    function checkRestrictedItems(context)
    {
        var newRecord = context.newRecord;
        var customerId = newRecord.getValue("entity");

        var itemLineCount = newRecord.getLineCount("item");
        if (itemLineCount < 1) return 0;

        for (var i = 0; i < itemLineCount; i++)
        {
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

            for (let i = 0; i < customerLineCount && !correctCustomer; i++)
            {
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

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});