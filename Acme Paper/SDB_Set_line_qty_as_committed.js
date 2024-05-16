/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(["N/record", "N/search"],
    function (record, search) {
        function execute(context) {
            try {
                var date = "tomorrow";
                var today = new Date();
                if (today.getDay() == 5 || today.getDay() == 6) {
                    date = new Date(today.setDate(today.getDate() + (today.getDay() == 5 ? 3 : 2)));
                    date = (date.getMonth() + 1) + "/" + (date.getDate()) + "/" + (date.getFullYear().toString().substr(-2));
                  }
                log.debug("date", date);

               /* var salesorderSearchObj = search.create({
                    type: "salesorder",
                    filters:
                        [
                            ["type", "anyof", "SalesOrd"],
                            "AND",
                            ["startdate", "onorbefore", date],
                            "AND",
                            ["mainline", "is", "T"],
                            "AND",
                            ["status", "anyof", "SalesOrd:B"],
                            // "AND",
                            // ["internalid", "anyof", "717688"],
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "Internal ID" })
                        ]
                });*/
                var salesorderSearchObj = search.load({type: "salesorder", id: 3776});
              
                var resultSet = salesorderSearchObj.run().getRange({ start: 0, end: 1000 });

                if (!resultSet || resultSet == null || resultSet == "") return;
                log.debug("resultSet length",  resultSet.length);
                for (var s = 0; s < resultSet.length; s++) {
                    try {
                        var internalId = resultSet[s].getValue(resultSet[s].columns[8])
                        log.debug("internalId item", internalId);

                        if (!internalId) continue;

                        var objRecord = record.load({ type: record.Type.SALES_ORDER, id: parseInt(internalId), isDynamic: false });

                        var shipDate = new Date(objRecord.getValue({ fieldId: "startdate" })).getDay();
                      //  if (shipDate == 6 || shipDate == 0) continue; //if saturday or sunday

                        var i_line_cnt = objRecord.getLineCount({ sublistId: "item" });
                        var recordUpdated = false;

                        for (var i = 0; i < i_line_cnt; i++) {
                            var quantityAvailable = objRecord.getSublistValue({
                                sublistId: "item",
                                fieldId: "quantityavailable",
                                line: i
                            });
                            var quantity = objRecord.getSublistValue({
                                sublistId: "item",
                                fieldId: "quantity",
                                line: i
                            });

                            var commitinventory = objRecord.getSublistValue({
                                sublistId: "item",
                                fieldId: "commitinventory",
                                line: i
                            });

                            // We add new feacture, validate that commit inventory value 1  // =>DLC
                            // if (Number(quantityAvailable) >= Number(quantity) && commitinventory != 1) {   
                            //Changed logic to only when theres quantity available 
                            if (Number(quantityAvailable) > 0 && commitinventory != 1) {
                                objRecord.setSublistValue({
                                    sublistId: "item",
                                    fieldId: "commitinventory",
                                    line: i,
                                    value: 1
                                });
                                recordUpdated = true;

                                log.debug("commit updated for SO " + internalId + " in line", i + 1);
                            }
                        }

                        if (recordUpdated == true) {
                            var recordId = objRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
                            log.debug("Record Updated", recordId);
                        }
                    } catch (error) {
                        log.audit("Exception caught in loop with id: " + internalId, error);
                     //   continue;
                    }
                }//For
            }

            catch (e) {
                log.error("Exception Caught:==", e);
            }
        }//end of execute
        return {
            execute: execute
        }
    });