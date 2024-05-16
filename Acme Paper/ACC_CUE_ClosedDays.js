/**
 * @NApiVersion 2.1
 * @NScriptType clientScript
 * @NModuleScope Public
 */

define(["N/search", 'N/record','N/log'], function(search, record,log) {
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
            resultSlice.forEach(function(slice) {
                searchResults.push(slice);
                searchId++;
            });
        } while (resultSlice.length >= 1000);
        return searchResults;
    }

    function fieldChanged(scriptContext) {
        var fieldId = scriptContext.fieldId;
        var currentRecord = scriptContext.currentRecord;
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
    }


    function getDay(dateString) {
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var d = new Date(dateString);
        var dayName = days[d.getDay()];
        return dayName;
    }
    return {
        fieldChanged: fieldChanged,
    };
});