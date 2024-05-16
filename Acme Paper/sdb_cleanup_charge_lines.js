/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(["N/log", "N/search", "N/file", "N/record", "N/runtime"], function (
    log,
    search,
    file,
    record,
    runtime
) {
    function getInputData(context) {
        var scriptObj = runtime.getCurrentScript();
        var searchIdParam = scriptObj.getParameter("custscript_sdb_mr_cleanup_line_search");
        return search.load({
            type: "salesorder",
            id: 'customsearch5228'//searchIdParam,
        });
    }

    function deleteItem(type, id) {
        var scriptObj = runtime.getCurrentScript();
        var freightItem = scriptObj.getParameter("custscript_sdb_mr_cleanup_line_freight");
        var fuelItem = scriptObj.getParameter("custscript_sdb_mr_cleanup_line_fuel");
        var freightFedexItem = scriptObj.getParameter("custscript_sdb_mr_cleanup_line_fedex_fre");

        var recordObj = record.load({
            type: type,//data.recordType,
            id: id, //data.id,
            isDynamic: true
        });

        var lineCount = recordObj.getLineCount("item");
        var lineToRemove = []
        for (let i = 0; i < lineCount; i++) {
            recordObj.selectLine({
                sublistId: "item",
                line: i
            });

            var item = recordObj.getCurrentSublistValue({
                sublistId: "item",
                fieldId: "item"
            });

            if (item == freightItem ||
                item == fuelItem ||
                item == freightFedexItem) {
                lineToRemove.push({
                    item: item,
                    line: i
                });
            }
        }

        if (lineToRemove.length == 1 && lineCount == 1) {
            log.audit("REMOVE ORDER", id);
            record.delete({
                type: type,
                id: id
            });
            return;
        }
        var recUpdated = false;
        for (let i = lineCount - 1; i >= 0; i--) {
            var currentLine = lineToRemove.find(line => line.line == i);
            if (currentLine) {
                log.audit("REMOVE LINE FROM ORDER: " + id, currentLine)
                recordObj.removeLine({
                    sublistId: 'item',
                    line: currentLine.line
                });
                recUpdated = true;
            }

        }
        if (recUpdated) recordObj.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });

    }

    function map(context) {
        var data = JSON.parse(context.value);
        try {

            var internalid = data.values["GROUP(internalid)"].value;
            log.debug('DATA: ', { data, internalid });

            search.create({
                type: "transaction",
                filters: [["createdfrom", "is", internalid], "AND", ["mainline", "is", "T"]]
            }).run().each(function (res) {
                deleteItem(res.recordType, res.id);
                return true;
            })
            deleteItem("salesorder", internalid);


        } catch (error) {
            log.error("error map", error);
        }
    }
    return {
        getInputData: getInputData,
        map: map
    };
});
