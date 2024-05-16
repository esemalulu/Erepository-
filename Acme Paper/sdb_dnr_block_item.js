/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
*/
define(['N/currentRecord', 'N/record', 'N/search', 'N/ui/dialog', 'N/log'], function (currentRecord, record, search, dialog, log) {
    function postSourcing(context) {
        try {
            var record = context.currentRecord;

            if (context.sublistId == 'item' && context.fieldId == 'item') {
                var item = record.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                });
                if (!item) return;
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

                var itemType = record.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "itemtype",
                });
                if (!itemType) return true;
                var itemFields = search.lookupFields({
                    type: CONST_ITEMTYPE[itemType],
                    id: item,
                    columns: "custitem_dnr"
                });

                if (itemFields?.custitem_dnr
                    && itemFields?.custitem_dnr.length > 0
                    && itemFields.custitem_dnr[0].text == 'Y Non Stock Discontinued'
                    && !(record.getValue({ fieldId: 'custbody_dropship_order' }))) {
                    alert('Item has been flagged as ' + itemFields.custitem_dnr[0].text);
                    return false;
                }
            }
        } catch (error) {
            log.error('error', error.message);
        }
    }
    function validateLine(context) {
        try {

            var record = context.currentRecord;

            if (context.sublistId == "item") {
                var item = record.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                });
                if (!item) return true;

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

                var itemType = record.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "itemtype",
                });
                if (!itemType) return true;
                var itemFields = search.lookupFields({
                    type: CONST_ITEMTYPE[itemType],
                    id: item,
                    columns: "custitem_dnr"
                });

                return !(itemFields?.custitem_dnr
                    && itemFields?.custitem_dnr.length > 0
                    && itemFields.custitem_dnr[0].text == 'Y Non Stock Discontinued'
                    && !(record.getValue({ fieldId: 'custbody_dropship_order' })));
            } else {
                return true;
            }
        } catch (error) {
            log.error('error', error.message);
        }
    }
    function fieldChanged(context) {
        try {
            // COMMENTED 08/05/2024 
            // if (context.fieldId == 'shipcomplete' && !context.currentRecord.getValue("shipcomplete")) context.currentRecord.setValue("custbody_a1wms_dnloadtimestmp", new Date());
            // if (!context.currentRecord.isNew && context.fieldId == 'commitinventory' && context.currentRecord.getCurrentSublistValue("item", "commitinventory") == 1) {
            //  context.currentRecord.setValue("custbody_a1wms_dnloadtimestmp", new Date());
            // }


            var fieldId = context.fieldId;
            var currentRecord = context.currentRecord;
            var recType = currentRecord.type;
            if (recType != 'salesorder') return;
            if (fieldId == 'startdate' || fieldId == 'entity') {
                var entity = currentRecord.getValue('entity');
                var shipDate = currentRecord.getValue('startdate');
                if (!shipDate || !entity) return;
                var closeDays = getCloseDay(entity);
                var day = getDay(shipDate);
                if (closeDays.includes(day)) {
                    alert("The ship date is the customer's closing date");
                }
            }

        } catch (error) {
            console.log('Error: ' + error.toString());
            log.error('Error fieldChanged: ' + currentRecord.id, error.toString());
        }
    }
    function saveRecord(context) {
        try {
            var this_record = context.currentRecord;
            var ship_to_select_value = this_record.getValue('shipaddresslist');
            if (!ship_to_select_value || ship_to_select_value == -2) { // -2 is 'Custom' option value
                let options = {
                    title: 'Error',
                    message: 'Invalid Selected Address On Ship To Select.',
                };
                dialog.create(options);
                return false;
            }
            return true;
        } catch (error) {
            log.debug('saveRecord ERROR: ', error)
        }
    }


    function getCloseDay(entity) {
        var customerSearchObj = search.create({
            type: "customer",
            filters: [
                ["internalid", "anyof", entity]
            ],
            columns: [
                search.createColumn({ name: "custentity_bus_ops_monday", label: "Monday" }),
                search.createColumn({ name: "custentity_bus_ops_tuesday", label: "Tuesday" }),
                search.createColumn({ name: "custentity_bus_ops_wednesday", label: "Wednesday" }),
                search.createColumn({ name: "custentity_bus_ops_thursday", label: "Thursday" }),
                search.createColumn({ name: "custentity_bus_ops_friday", label: "Friday" }),
                search.createColumn({ name: "custentity_bus_ops_saturday", label: "Saturday" }),
                search.createColumn({ name: "custentity_bus_ops_sunday", label: "Sunday" })
            ]
        });
        var result = getAllResults(customerSearchObj);
        for (var i = 0; i < result.length; i++) {
            var item = result[i].id;
            var monday = result[i].getValue('custentity_bus_ops_monday');
            var tuesday = result[i].getValue('custentity_bus_ops_tuesday');
            var wednesday = result[i].getValue('custentity_bus_ops_wednesday');
            var thursday = result[i].getValue('custentity_bus_ops_thursday');
            var friday = result[i].getValue('custentity_bus_ops_friday');
            var saturday = result[i].getValue('custentity_bus_ops_saturday');
            var sunday = result[i].getValue('custentity_bus_ops_sunday');
        }
        var days = [];
        if (checkBoolean(monday) == true) days.push('Monday');
        if (checkBoolean(tuesday) == true) days.push('Tuesday');
        if (checkBoolean(wednesday) == true) days.push('Wednesday');
        if (checkBoolean(thursday) == true) days.push('Thursday');
        if (checkBoolean(friday) == true) days.push('Friday');
        if (checkBoolean(saturday) == true) days.push('Saturday');
        if (checkBoolean(sunday) == true) days.push('Sunday');
        return days;
    }

    function checkBoolean(value) {
        if (value == true || value == 'T' || value == 'true') {
            return true;
        } else {
            return false;
        }
    }

    function getAllResults(s) {
        var results = s.run();
        var searchResults = [];
        var searchId = 0;
        do {
            var resultSlice = results.getRange({ start: searchId, end: searchId + 1000 });
            resultSlice.forEach(function (slice) {
                searchResults.push(slice);
                searchId++;
            });
        } while (resultSlice.length >= 1000);
        return searchResults;
    }

    function getDay(dateString) {
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var d = new Date(dateString);
        var dayName = days[d.getDay()];
        return dayName;
    }
    return {
        postSourcing: postSourcing,
        validateLine: validateLine,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});