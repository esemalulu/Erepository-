/** 
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record"], function (search, record) {

    function getInputData() {
        var inventoryitemSearchObj = search.create({
            type: "inventoryitem",
            filters:
                [
                    ["type", "anyof", "InvtPart"],
                    "AND",
                    [["custitem_sdb_pim_width", "contains", "x"], "OR", ["custitem_sdb_pim_height", "contains", "x"], "OR", ["custitem_sdb_pim_length", "contains", "x"], "OR", ["custitem_sdb_pim_weight", "contains", "x"], "OR", ["custitem_sdb_pim_volume", "contains", "x"]]
                ],
            columns:
                [
                    "custitem_sdb_pim_width",
                    "custitem_sdb_pim_volume",
                    "custitem_sdb_pim_height",
                    "custitem_sdb_pim_length",
                    "custitem_sdb_pim_weight",
                    "internalid"
                ]
        });
        var searchResult = inventoryitemSearchObj.run().getRange({
            start: 0,
            end: 1000 // - Modified by @Mariano to test only 100 records - may be 1000
        });
        return searchResult;

    }
    function map(context) {
        try {
            const data = JSON.parse(context.value);
            var itemId = data.id;
            var widthField = data.values.custitem_sdb_pim_width ? data.values["custitem_sdb_pim_width"].toString() : null;
            var heightField = data.values.custitem_sdb_pim_height ? data.values["custitem_sdb_pim_height"].toString() : null;
            var lengthField = data.values.custitem_sdb_pim_length ? data.values["custitem_sdb_pim_length"].toString() : null;
            var weightField = data.values.custitem_sdb_pim_weight ? data.values["custitem_sdb_pim_weight"].toString() : null;
            var cubeField = data.values.custitem_sdb_pim_volume ? data.values["custitem_sdb_pim_volume"].toString() : null;

            if (widthField && !widthField.includes("-") && widthField.includes("/")) {
                widthField = "0-" + widthField
            }
            if (heightField && !heightField.includes("-") && heightField.includes("/")) {
                heightField = "0-" + heightField
            }
            if (lengthField && !lengthField.includes("-") && lengthField.includes("/")) {
                lengthField = "0-" + lengthField
            }
            if (weightField && !weightField.includes("-") && weightField.includes("/")) {
                weightField = "0-" + weightField
            }
            if (cubeField && !cubeField.includes("-") && cubeField.includes("/")) {
                cubeField = "0-" + cubeField
            }
            var itemRecord = record.load({
                type: record.Type.INVENTORY_ITEM,
                id: itemId
            });

            if (widthField) {
                var widthFieldPostFilter;

                if (widthField.includes("x")) {
                    log.debug({
                        title: 'WIDTH Contains x',
                        details: widthField + ' ITEM ID: ' + itemId
                    })
                    if (widthField.includes("Top")) {
                        var splittedStringWidthField = widthField.split("x");
                        for (var i = 0; i < splittedStringWidthField.length; i++) {
                            if (splittedStringWidthField[i].includes("Top")) {
                                widthFieldPostFilter = splittedStringWidthField[i].split("in")[0].trim();
                            }
                        }
                    } else if (widthField.includes("Outside")) {
                        var splittedStringWidthField = widthField.split("x");
                        for (var i = 0; i < splittedStringWidthField.length; i++) {
                            if (splittedStringWidthField[i].includes("Outside")) {
                                widthFieldPostFilter = splittedStringWidthField[i].split("in")[0].trim();
                            }
                        }
                    } else {
                        widthFieldPostFilter = widthField.split("x")[0].trim();
                    }
                } else if (widthField.includes("X")) {
                    var splittedStringWidthField = widthField.split("X");
                    if (splittedStringWidthField[0].includes('"')) {
                        widthFieldPostFilter = splittedStringWidthField[0].split('"')[0].trim();
                    }
                } else {
                    widthFieldPostFilter = widthField;
                }

                if (widthFieldPostFilter.includes("-")) {
                    var splittedString = widthFieldPostFilter.split("-");
                    var fractions = splittedString[1].split("/");
                    var numerator = parseInt(fractions[0]);
                    var denominator = parseInt(fractions[1]);
                    var decimalValue = numerator / denominator;
                    var originalValue = parseInt(splittedString[0]);
                    var value = (originalValue + decimalValue).toFixed(2);
                    itemRecord.setValue({
                        fieldId: 'custitem_sdb_pim_width',
                        value: value
                    })
                } else {
                    itemRecord.setValue({
                        fieldId: 'custitem_sdb_pim_width',
                        value: widthFieldPostFilter
                    })
                }
            }

            if (heightField) {
                var heightFieldPostFilter;

                if (heightField.includes("x")) {
                    log.debug({
                        title: 'HEIGHT Contains x',
                        details: heightField + ' ITEM ID: ' + itemId
                    })
                    if (heightField.includes("Top")) {
                        var splittedStringHeightField = heightField.split("x");
                        for (var i = 0; i < splittedStringHeightField.length; i++) {
                            if (splittedStringHeightField[i].includes("Top")) {
                                heightFieldPostFilter = splittedStringHeightField[i].split("in")[0].trim();
                            }
                        }
                    } else if (heightField.includes("Outside")) {
                        var splittedStringHeightField = heightField.split("x");
                        for (var i = 0; i < splittedStringHeightField.length; i++) {
                            if (splittedStringHeightField[i].includes("Outside")) {
                                heightFieldPostFilter = splittedStringHeightField[i].split("in")[0].trim();
                            }
                        }
                    } else {
                        heightFieldPostFilter = heightField.split("x")[0].trim();
                    }
                } else if (heightField.includes("X")) {
                    var splittedStringHeightField = heightField.split("X");
                    if (splittedStringHeightField[0].includes('"')) {
                        heightFieldPostFilter = splittedStringHeightField[0].split('"')[0].trim();
                    }
                } else {
                    heightFieldPostFilter = heightField;
                }

                if (heightFieldPostFilter.includes("-")) {
                    var splittedString = heightFieldPostFilter.split("-");
                    var fractions = splittedString[1].split("/");
                    var numerator = parseInt(fractions[0]);
                    var denominator = parseInt(fractions[1]);
                    var decimalValue = numerator / denominator;
                    var originalValue = parseInt(splittedString[0]);
                    var value = (originalValue + decimalValue).toFixed(2);
                    itemRecord.setValue({
                        fieldId: 'custitem_sdb_pim_height',
                        value: value
                    })
                } else {
                    itemRecord.setValue({
                        fieldId: 'custitem_sdb_pim_height',
                        value: heightFieldPostFilter
                    })
                }
            }

            if (lengthField) {
                var lengthFieldPostFilter;

                if (lengthField.includes("x")) {
                    log.debug({
                        title: 'LENGTH Contains x',
                        details: lengthField + ' ITEM ID: ' + itemId
                    })
                    if (lengthField.includes("Top")) {
                        var splittedStringlengthField = lengthField.split("x");
                        for (var i = 0; i < splittedStringlengthField.length; i++) {
                            if (splittedStringlengthField[i].includes("Top")) {
                                lengthFieldPostFilter = splittedStringlengthField[i].split("in")[0].trim();
                            }
                        }
                    } else if (lengthField.includes("Outside")) {
                        var splittedStringlengthField = lengthField.split("x");
                        for (var i = 0; i < splittedStringlengthField.length; i++) {
                            if (splittedStringlengthField[i].includes("Outside")) {
                                lengthFieldPostFilter = splittedStringlengthField[i].split("in")[0].trim();
                            }
                        }
                    } else {
                        lengthFieldPostFilter = lengthField.split("x")[0].trim();
                    }
                } else if (lengthField.includes("X")) {
                    var splittedStringlengthField = lengthField.split("X");
                    if (splittedStringlengthField[0].includes('"')) {
                        lengthFieldPostFilter = splittedStringlengthField[0].split('"')[0].trim();
                    }
                } else {
                    lengthFieldPostFilter = lengthField;
                }

                if (lengthFieldPostFilter.includes("-")) {
                    var splittedString = lengthFieldPostFilter.split("-");
                    var fractions = splittedString[1].split("/");
                    var numerator = parseInt(fractions[0]);
                    var denominator = parseInt(fractions[1]);
                    var decimalValue = numerator / denominator;
                    var originalValue = parseInt(splittedString[0]);
                    var value = (originalValue + decimalValue).toFixed(2);
                    itemRecord.setValue({
                        fieldId: 'custitem_sdb_pim_length',
                        value: value
                    })
                } else {
                    itemRecord.setValue({
                        fieldId: 'custitem_sdb_pim_length',
                        value: lengthFieldPostFilter
                    })
                }
            }

            // if (weightField) {
            //     var splittedString = weightField.split("-");
            //     var fractions = splittedString[1].split("/");
            //     var numerator = parseInt(fractions[0]);
            //     var denominator = parseInt(fractions[1]);
            //     var decimalValue = numerator / denominator;
            //     var originalValue = parseInt(splittedString[0]);
            //     var value = (originalValue + decimalValue).toFixed(2);
            //     itemRecord.setValue({
            //         fieldId: 'custitem_sdb_pim_weight',
            //         value: value
            //     })
            // }

            // if (cubeField && cubeField.includes("-")) {
            //     var splittedString = cubeField.split("-");
            //     var fractions = splittedString[1].split("/");
            //     var numerator = parseInt(fractions[0]);
            //     var denominator = parseInt(fractions[1]);
            //     var decimalValue = numerator / denominator;
            //     var originalValue = parseInt(splittedString[0]);
            //     var value = (originalValue + decimalValue).toFixed(2);
            //     itemRecord.setValue({
            //         fieldId: 'custitem_sdb_pim_volume',
            //         value: value
            //     })
            // }
            var itemDone = itemRecord.save({
                ignoreMandatoryFields: true
            });
            log.audit({
                title: 'Item Updated',
                details: itemDone
            })
        } catch (error) {
            log.error("Error in map", error);
        }
    }

    function summarize(summary) {
        var errors = "";
        summary.mapSummary.errors.iterator().each(function (key, value) {
            errors += "Error in record creation: " + key + ". Error was: " + JSON.parse(value).message + "/n";
            return true;
        });
        if (errors) {
            log.error('Errors in Summarize', errors);
        }
        log.audit('summarize', 'end');
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    }
});
