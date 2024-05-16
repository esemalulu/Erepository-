/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', "N/log", "N/config", "N/format"],
    (record, search, log, config, format) => {
        const getInputData = () => {
            try {
                // if (notRun()) return
                log.audit("Entry: ", "Running");
                return search.load({
                    id: "customsearch5661"//"customsearch_sdb_wms_transactions"
                });
            } catch (e) {
                log.error({
                    title: "ERROR",
                    details: e,
                })
            }
        }

        const map = (mapContext) => {
            try {
                var json = JSON.parse(mapContext.value);
                var internalId = json.values["GROUP(internalid)"].value;
                // var lastmodifieddate = json.values["GROUP(lastmodifieddate)"];
                // lastmodifieddate = new Date(lastmodifieddate);
                // var currentDate = new Date();
                // currentDate.setMinutes(currentDate.getMinutes() - 30);
                // if (lastmodifieddate < currentDate || true) {
                    // log.debug("Time Data: ", { internalId, lastmodifieddate, currentDate });
                    var salesorder = record.load({
                        type: record.Type.SALES_ORDER,
                        id: internalId
                    });
                    // salesorder.setValue("custbody_a1wms_dnloadtimestmp", new Date());
                    // salesorder.setValue("custbody_a1wms_orderlocked", false);

                    // log.debug("Order Data: ", {
                    //     internalId: salesorder.id,
                    //     timeStamp: salesorder.getValue("custbody_a1wms_dnloadtimestmp"),
                    //     status: salesorder.getValue("custbody_a1wms_orderstatus"),
                    //     locked: salesorder.getValue("custbody_a1wms_orderlocked"),
                    //     download: salesorder.getValue("custbody_a1wms_dnloadtowms")
                    // });
                    var idSaved = salesorder.save({
                        ignoreMandatoryFields: true
                    });
                    log.audit("Order Saved: ", { idSaved })
                // } else {
                //     log.emergency("NO Time Condition: ", { internalId, lastmodifieddate, currentDate });
                // }

            } catch (e) {
                log.error({
                    title: "MAP ERROR",
                    details: e,
                })
            }
        }

        // function validate hours for execution the script
        function notRun() {
            var companyInfo = config.load({
                type: config.Type.COMPANY_INFORMATION
            });
            var timezone = companyInfo.getValue({
                fieldId: 'timezone',
            });
            log.debug("timezone", timezone)
            var date = new Date();
            var dateTime = format.format({
                value: date,
                type: format.Type.DATETIME,
                timezone: timezone
            });
            log.debug("dateTime", dateTime)
            var hours = new Date(dateTime).getHours();
            log.audit("hours", hours)
            if (hours > 14 && dateTime.indexOf('pm') != -1) {
                log.audit("hours > 2 pm", hours)
                return true;
            }
            return false;
        }
        
        return { getInputData, map }
    });