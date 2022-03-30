/**
* The following entry point is deployed on Purchase Order
* @author bhavik.bhavsar@erpbuddies.com
* @return {Object} User Event Object.
*
* @NApiVersion 2.x
* @NScriptType UserEventScript
*/
define(['N/log', 'N/record', 'N/search', 'N/ui/serverWidget'], function (log, record, search, serverWidget) {
    //BeforeLoad will add a new column to the items sublist with a checkbox
    function beforeLoad(context) {
        var itemSublist = context.form.getSublist({
            id: 'item'
        });
        //this checkbox will trigger the logic on the Client Script
        var manuBtn = itemSublist.addField({
            id: 'custpage_manu_select',
            label: 'Select ManuFacturer',
            type: serverWidget.FieldType.CHECKBOX
        });
        // context.form.insertField({
        //     field: manuBtn,
        //     nextfield: 'quantity'
        // });
    }
    function afterSubmit(context) {
        try {

            var purchaseOrderRecord = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: context.newRecord.id
            });
            var vendor = purchaseOrderRecord.getValue({ fieldId: 'entity' })

            var lineCount = purchaseOrderRecord.getLineCount({ sublistId: 'item' });

            for (var i = 0; i < lineCount; i++) {
                var itemId = purchaseOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                var idOfManufacturer = checkPrefferedTJINC(itemId, vendor);

                if (!idOfManufacturer)
                    return;

                purchaseOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol9', line: i, value: idOfManufacturer });
            }

            purchaseOrderRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });


        } catch (error) {
            if (error instanceof nlobjError) {
                var errorMsg = "Code: " + error.getCode() + " Details: " + error.getDetails();
                log.error('An error occurred.', errorMsg);
            }
            else {
                log.error('An unknown error occurred.', error.toString());
            }
        }
    }
    function checkPrefferedTJINC(itemId, vendor) {
        var manufacturerSelectId;
        var customrecord_tjinc_dwvpur_vendorleadSearchObj = search.create({
            type: "customrecord_tjinc_dwvpur_vendorlead",
            filters:
                [
                    ["custrecord_tjinc_dwvpur_itemname", "is", itemId],
                    "AND",
                    ["custrecord_tjinc_dwvpur_vendor", "is", vendor]
                ],
            columns:
                [
                    search.createColumn({ name: "name", label: "ID" }),
                    search.createColumn({ name: "scriptid", label: "Script ID" }),
                    search.createColumn({ name: "custrecord_tjinc_dwvpur_itemname", label: "Item Name" }),
                    search.createColumn({ name: "custrecord_tjinc_dwvpur_vendor", label: "Vendor" }),
                    search.createColumn({ name: "custrecord_tjinc_dwvpur_leadtime", label: "Lead time" }),
                    search.createColumn({ name: "custrecord_tjinc_dwvpur_moq", label: "MOQ" }),
                    search.createColumn({ name: "custrecord_tjinc_dwvpur_vensub", label: "Vendor Subsidiary" }),
                    search.createColumn({ name: "custrecord_manufacturer", label: "Manufacturer" }),
                    search.createColumn({ name: "custrecord155963581", label: "Preferred" }),
                    search.createColumn({ name: "lastmodified", sort: search.Sort.DESC, label: "Last Modified" })
                ]
        });
        var searchResultCount = customrecord_tjinc_dwvpur_vendorleadSearchObj.runPaged().count;
        log.debug({
            title: 'searchResultCount',
            details: searchResultCount
        });
        var results = customrecord_tjinc_dwvpur_vendorleadSearchObj.run().getRange({ start: 0, end: 1000 });
        log.debug({
            title: 'results',
            details: results
        });
        if (searchResultCount > 0) {
            for(var i = 0; i < results.length; i++){
                if(results[i].getValue({name: 'custrecord155963581'})){
                    manufacturerSelectId = results[i].id;
                }
            }
            if(manufacturerSelectId == null || manufacturerSelectId == undefined){
                manufacturerSelectId = results[0].id;
            }
        }
        return manufacturerSelectId;
    }
    function isEmpty(value) {
        if (value === null) {
            return true;
        } else if (value === undefined) {
            return true;
        } else if (value === '') {
            return true;
        } else if (value === ' ') {
            return true;
        } else if (value === 'null') {
            return true;
        } else {
            return false;
        }
    }
    return {
        // beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    };
});
