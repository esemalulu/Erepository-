/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/file", "N/search", "N/record"],

    (file, search, record) => {

        const getInputData = (inputContext) => {

            // let fileLoaded = file.load(46802) //id
            try {

                // for(var index = 0; index < idfiles.length; index++) {
                var csvFile = file.load({
                    id: 2240567
                });
                var xmlFileContent = csvFile.getContents();
                var lines = xmlFileContent.replace(/[\r]/g, '').split("\n");
                var headers = lines[0].split(",");
                log.debug('headers.length', headers.length);
                var result = []
                for (var i = 1; i < lines.length; i++) {

                    var obj = {};
                    var currentline = lines[i].split(",");

                    for (var j = 0; j < headers.length; j++) {
                        obj[headers[j].replace(/[" "]/g, "").replace('/', '')] = currentline[j]//escape(currentline[j]);
                    }
                    result.push(obj);
                }
                log.debug("result 0", result[0]);
                log.debug("result", result.length);

            } catch (e) {
                log.error("error in reading lines of csv", JSON.stringify(e));
            }
            // return JSON.parse(txtFileContent);
            return result

        }
        const map = (mapContext) => {
            try {
                let value = JSON.parse(mapContext.value);
                log.debug("map value", value);
                var itemId = value["InternalID"]
                log.debug("map itemId", itemId);
                if (!itemId) return;
                try {
                    var itemSearchObj = search.create({
                        type: "item",
                        filters:
                            [
                                ["internalid", "anyof", itemId]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "type", label: "Type" })
                            ]
                    });
                    var searchResultCount = itemSearchObj.runPaged().count;
                    log.debug("itemSearchObj result count", searchResultCount);
                    var itemtype = ""
                    itemSearchObj.run().each(function (result) {
                        itemtype = result.recordType == 'inventoryitem' ? 'InvtPart' : result.recordType;
                        return false;
                    });
                    if (itemtype == 'lotnumberedinventoryitem') itemtype = "InvtParttrue";
                    log.debug("itemtype", itemtype);
                    log.debug("getItemTypeId(itemtype)", getItemTypeId(itemtype));
                    var id = record.submitFields({
                        type: record.Type[getItemTypeId(itemtype)],
                        id: itemId,
                        values: {
                            costestimatetype: "ITEMDEFINED"
                        },
                        options: {
                            ignoreMandatoryFields: true
                        }
                    })
                    log.debug("update", id);

                } catch (e) {
                    log.error("ERROR map", e);
                    log.audit("ERROR itemId: " + itemId);
                }

                mapContext.write({
                    key: mapContext.key,
                    value: value
                });
            } catch (e) {
                log.error("map2 ERROR", e);
            }
        }
        const reduce = (reduceContext) => {
            let itemVal = JSON.parse(reduceContext.values[0]);
            log.debug("items reduce", items);

        }


        function getItemTypeId(type) {
            var CONST_ITEMTYPE = {
                'Assembly': 'ASSEMBLY_ITEM',
                'Description': 'DESCRIPTION_ITEM',
                'Discount': 'DISCOUNT_ITEM',
                'GiftCert': 'GIFT_CERTIFICATE_ITEM',
                'InvtPart': 'INVENTORY_ITEM',
                'Group': 'ITEM_GROUP',
                'Kit': 'KIT_ITEM',
                'Markup': 'MARKUP_ITEM',
                'NonInvtPart': 'NON_INVENTORY_ITEM',
                'OthCharge': 'OTHER_CHARGE_ITEM',
                'Payment': 'PAYMENT_ITEM',
                'Service': 'SERVICE_ITEM',
                'Subtotal': 'SUBTOTAL_ITEM',
                'InvtParttrue': 'LOT_NUMBERED_INVENTORY_ITEM',
                'Assemblytrue': 'LOT_NUMBERED_ASSEMBLY_ITEM'
            };
            return CONST_ITEMTYPE[type];
        }

        return { getInputData, map, reduce }

    });

