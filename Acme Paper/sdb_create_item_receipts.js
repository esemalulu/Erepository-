/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
*/
define(["N/log", "N/record", "N/search", "N/https", "N/runtime"],
    function (log, record, search, https, runtime) {
        function getInputData() {
            try {
                return search.load({
                    id: 'customsearch6186',
                });
            } catch (error) {
                log.error('Error loading the search: ', error)
            }
        }
        function map(context) {
            try {
                let data = JSON.parse(context.value);
                if (!data) return;
                // log.debug('data', data);

                let dataValues = data.values;
                if (!dataValues) return;

                var orderId = data.id;

                try {
                    var receiptRecord = record.transform({
                        fromType: record.Type.PURCHASE_ORDER,
                        fromId: orderId,
                        toType: record.Type.ITEM_RECEIPT
                    });
                    log.debug('receipt record', receiptRecord.save());
                } catch (error) {
                    if (error.message.indexOf('Multi-Location Inventory') != -1) {
                        log.debug('receipt from multiple locations', 'Starting multiple fulfills');

                        receiptMultipleLocations(orderId);
                    } else log.error("ERROR: ", error);
                }

            } catch (error) {
                log.error('Error sending order ' + orderId, error);
            }
        }

        //#region --------------------------------- AUXILIAR FUNCTIONS ---------------------------------
        function receiptMultipleLocations(orderId) {
            var locations = getOrderLocations(orderId);
            log.debug('Locations', locations);

            var receiptPerLocation = []
            locations.forEach(location => {
                var receiptRecordForLocation = record.transform({
                    fromType: record.Type.PURCHASE_ORDER,
                    fromId: orderId,
                    toType: record.Type.ITEM_RECEIPT
                });
                selectLocationItems(location, receiptRecordForLocation);

                receiptPerLocation.push(receiptRecordForLocation.save());
            });

            log.debug('receipt records', receiptPerLocation);
        }
        function selectLocationItems(location, fullfilmentRecord) {
            try {
                var lineCount = fullfilmentRecord.getLineCount({
                    sublistId: 'item'
                });

                for (var i = 0; i < lineCount; i++) {
                    var itemLocation = fullfilmentRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        line: i
                    });

                    var shouldFulfill = (itemLocation == location);

                    fullfilmentRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        line: i,
                        value: shouldFulfill
                    });
                }
            } catch (error) {
                log.error('error in fullfilment for location: ' + location, error);
            }
        }
        function getOrderLocations(orderId) {
            var locations = [];
            var transactionSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["internalid", "anyof", orderId]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "location",
                            summary: "GROUP",
                            label: "Warehouse"
                        })
                    ]
            });

            transactionSearchObj.run().each(function (result) {
                var location = result.getValue({
                    name: "location",
                    summary: "GROUP"
                });
                if (location) locations.push(location);

                return true;
            });

            return locations;
        }
        //#endregion

        return {
            getInputData: getInputData,
            map: map,
            // reduce: reduce,
            // summarize: summarize
        };
    }
);