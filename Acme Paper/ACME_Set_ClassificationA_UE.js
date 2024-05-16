/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
    /**
     * @param {record} record
     * @param {search} search
     */
    function (record, search) {
        function afterSubmit(context) {
            try {
                // if (context.type == "create" || context.type == "copy" || context.type == "edit" || context.type == "xedit") {
                    // Defining constant variables for functionality
                    var itemRecord = record.load({type: context.newRecord.type, id: context.newRecord.id})
                    var variables = getConstantVariables(itemRecord);

                    var {
                        SAVAGE,
                        RICHMOND,
                        PRESTON,
                        recordId,
                        itemId,
                        send_to_blueridge,
                        store_at_savage,
                        store_at_richmond,
                        store_at_wellmoor,
                        store_at_preston,
                        receive_at_savage,
                        receive_at_richmond,
                        receive_at_wellmoor,
                        receive_at_preston
                    } = variables;

                    const locationData = {
                        [RICHMOND]: { store: store_at_richmond, receive: receive_at_richmond },
                        [SAVAGE]: { store: store_at_savage, receive: receive_at_savage },
                        // [WELLMOR]: { store: store_at_wellmoor, receive: receive_at_wellmoor },
                        [PRESTON]: { store: store_at_preston, receive: receive_at_preston },
                    };

                    // Log initial results
                    // Object.entries(variables).forEach((variable) => {
                    // log.debug('Debug', `${variable[0]}: ${variable[1]}`)
                    // });

                    // If sent to blueridge is false code will not be executed
                    // if (!send_to_blueridge) return;

                    var locationsNotConfigured = getLocationsNotConfigured(recordId, [SAVAGE, RICHMOND, PRESTON]);//[SAVAGE, RICHMOND, WELLMOR, PRESTON]);

                    configureItemLocations(recordId, locationsNotConfigured);

                    var itemlocationconfigurationSearchObj = itemlocationconfigurationSearch(recordId, [SAVAGE, RICHMOND, PRESTON]);//[SAVAGE, RICHMOND, WELLMOR, PRESTON]);
                    if (!itemlocationconfigurationSearchObj) {
                        log.error("Error creating search for item location configuration");
                        return;
                    }
                    itemlocationconfigurationSearchObj.run().each(function (result) {
                        var loc = result.getValue({ name: 'location' });

                        var internalid = result.getValue({ name: 'internalid' });

                        const locationProperties = locationData[loc] || { store: false, receive: false };
                        var updateclassification = (locationProperties.store || locationProperties.receive) ? 'yes' : 'no';
                        if (!send_to_blueridge) updateclassification = 'no';

                        var item_record = record.load({
                            type: record.Type.ITEM_LOCATION_CONFIGURATION,
                            id: internalid,
                            isDynamic: true
                        });
                        if (updateclassification == 'no') log.audit("Location Data: ", { recordId, locationData, loc })
                        if (updateclassification == 'yes') {
                            item_record.setValue({
                                fieldId: 'invtclassification',
                                value: 1
                            });
                            // log.debug('Debug', ' Classification = A');
                        } else {
                            item_record.setText({
                                fieldId: 'invtclassification',
                                value: ''
                            });
                            log.audit("Data: ", { item: recordId, inv_loc: internalid, updateclassification, loc })
                        }

                        item_record.save();

                        return true;
                    });

                // }
            } catch (error) {
                log.error("Error ", error);
            }
        }

        // ----------------------- AUXILIAR FUNCTIONS --------------------------
        function getConstantVariables(context) {
            const variables = {
                SAVAGE: 104,
                RICHMOND: 103,
                PRESTON: 126,
                recordId: context.id,
                itemId: context.getValue({ fieldId: 'itemid' }),
                send_to_blueridge: context.getValue({ fieldId: 'custitem_send_to_blueridge' }),
                store_at_savage: context.getValue({ fieldId: 'custitem_store_at_savage' }),
                store_at_richmond: context.getValue({ fieldId: 'custitem_store_at_richmond' }),
                store_at_wellmoor: context.getValue({ fieldId: 'custitem_store_at_wellmoor' }),
                store_at_preston: context.getValue({ fieldId: 'custitemcustitem_store_at_preston' }),
                receive_at_savage: context.getValue({ fieldId: 'custitem_receive_at_savage' }),
                receive_at_richmond: context.getValue({ fieldId: 'custitem_receive_at_richmond' }),
                receive_at_wellmoor: context.getValue({ fieldId: 'custitem_receive_at_wellmoor' }),
                receive_at_preston: context.getValue({ fieldId: 'custitemreceive_at_preston' }),
            }

            return variables;
        }

        function itemlocationconfigurationSearch(recordId, locations) {
            var itemlocationconfigurationSearchObj = search.create({
                type: "itemlocationconfiguration",
                filters:
                    [
                        ["item", "anyof", recordId],
                        "AND",
                        ["location", "anyof", locations]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        }),
                        search.createColumn({ name: "item", label: "Item" }),
                        search.createColumn({ name: "invtclassification", label: "Inventory Classification" }),
                        search.createColumn({ name: "location", label: "Warehouse" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
            });

            return itemlocationconfigurationSearchObj;
        }

        function getLocationsNotConfigured(recordId, locations) {
            let arrayLocationNotConfigured = [];

            const searchObject = itemlocationconfigurationSearch(recordId, locations);
            if (!searchObject) return [];

            // Get all config locations that are configured in the item
            searchObject.run().each(function (result) {
                arrayLocationNotConfigured.push(Number(result.getValue({ name: "location" })));

                return true;
            });

            // Get locations that are not configured
            arrayLocationNotConfigured = locations.filter((location) => { return !arrayLocationNotConfigured.includes(location) })

            return arrayLocationNotConfigured;
        }

        function configureItemLocations(recordId, locationsToConfigure) {
            if (!locationsToConfigure || locationsToConfigure.length < 1) return;

            locationsToConfigure.forEach((location) => {
                try {
                    var configureLocationRecord = record.create({
                        type: record.Type.ITEM_LOCATION_CONFIGURATION,
                        isDynamic: true
                    });
                    if (!configureLocationRecord) return;

                    // Set item
                    configureLocationRecord.setValue("item", recordId);

                    // Set subsidiary
                    configureLocationRecord.setValue("subsidiary", 2);

                    // Set location
                    configureLocationRecord.setValue("location", location);

                    var newRecordId = configureLocationRecord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                    if (newRecordId) {
                        log.debug(`A new item location configuration record has been created for location: ${location}`);
                    }
                }
                catch (error) {
                    log.error("error creating configuration record", error);
                }
            });
        }
        // ---------------------------------------------------------------------

        return {
            afterSubmit: afterSubmit
        };

    });