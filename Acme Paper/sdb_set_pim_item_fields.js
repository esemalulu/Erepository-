/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
//{"error":{"errors":[{"field":"ttl","msg":737304},{"field":"requests","msg":5264},{"field":"limit","msg":5000}],"msg":"Too many requests, retry after 737304 milliseconds"}}
define([
    'N/runtime', 'N/https', 'N/http', 'N/url', 'N/log', 'N/search', 'N/record', 'N/file'
], function (runtime, https, http, urlMod, myLog, search, record, file) {
    function getInputData() {
        try {
            return search.load({ type: "item", id: "customsearch_sdb_item_search" });
        } catch (e) {
            log.debug("error in reading lines of csv", JSON.stringify(e));
        }
    }
    function map(context) {
        try {
            var data = JSON.parse(context.value);
            log.debug("map() data: ", context.value);

            var isInNs = false;

            var ss = search.create({
                type: "customrecord_sdb_pim_items",
                filters: ["custrecord_sdb_item_pim", "anyof", data.id]
            }).run().each(function (res) {
                isInNs = true;
                return true;
            });
            if (isInNs) return;
            log.debug("Is Not In Ns: ", data.id);
            var itemPim = null;
            var ss = search.create({
                type: "customrecord_sdb_pim_items",
                filters: ["formulatext: REGEXP_SUBSTR({custrecord_sdb_sap_pim}, '.+',5)", "is", data.values["custrecord_sdb_acme_sap.CUSTRECORD_SDB_ACME_ITEM"]],
                columns: ["custrecord_sdb_pim_id", "custrecord_sdb_json_raw_data", "custrecord_sdb_sap_pim"]
            }).run().each(function (res) {
                itemPim = {
                    id: res.getValue("custrecord_sdb_pim_id"),
                    nsId: res.id
                }
                return true;
            });
            if (itemPim) {
                // Move data from PIM Item to Item fields
                var PIMItemRecord = record.load({
                    type: "customrecord_sdb_pim_items",
                    id: itemPim.nsId,
                });
                var imageLineCount = PIMItemRecord.getLineCount({
                    sublistId: "recmachcustrecord_sdb_pim_parent"
                });
                // Here Load Item and set body fields
                var itemRecord = record.load({
                    type: record.Type.INVENTORY_ITEM,
                    id: data.id,
                    isDynamic: true,
                });
                // Need item values not pack
                var fields = [
                    'custitem_sdb_pim_volume', // volume
                    'custitem_sdb_pim_weight', // packageWeight
                    'custitem_sdb_pim_height', // Obj.attributes[i->attributeId == 132180243 || name == "Height"].value
                    'custitem_sdb_pim_width',   // Obj.attributes[i->attributeId == 132180139 || name == "Width"].value
                    'custitem_sdb_pim_length', // Obj.attributes[i->attributeId == 132180137 || name == "Length"].value
                    'custitem_sdb_pim_long_desc', //description
                    'custitem_sdb_pim_short_desc', //shortDescription
                    'custitem_sdb_pim_invoice_desc' // invcDescription
                ];
                var PIMItemData = JSON.parse(PIMItemRecord.getValue('custrecord_sdb_json_raw_data'));
                var volume = PIMItemData.volume;
                var weight = PIMItemData.packageWeight;
                var heigth, width, length;
                var description = PIMItemData.description;
                var shortDescription = PIMItemData.shortDescription;
                var invcDescription = PIMItemData.invcDescription;
                var attributes = PIMItemData.attributes;
                var attributesLength = attributes ? attributes.length : 0;
                for (var i = 0; i < attributesLength; i++) {
                    var attribute = attributes[i];
                    if (attribute.attributeId == 132180243 && attribute.code == "Height") {
                        heigth = attribute.value;
                    }
                    if (attribute.attributeId == 132180139 && attribute.code == "Width") {
                        width = attribute.value;
                    }
                    if (attribute.attributeId == 132180137 && attribute.code == "Length") {
                        length = attribute.value;
                    }
                }
                var values = [volume, weight, heigth, width, length, description, shortDescription, invcDescription];
                for (var j = 0; j < fields.length; j++) {
                    try {
                        itemRecord.setValue(fields[j], values[j]);
                    } catch (settingError) {
                        log.error("map() ERROR setting item Fields", settingError);
                    }
                }
                var itemId = itemRecord.save();
                log.debug("map() saved itemId is: ", itemId);
                // End Here

                for (var i = 0; i < imageLineCount; i++) {
                    var imgURL = PIMItemRecord.getSublistValue({
                        sublistId: "recmachcustrecord_sdb_pim_parent",
                        fieldId: "custrecord_sdb_image_url",
                        line: i
                    });
                    var imgId = PIMItemRecord.getSublistValue({
                        sublistId: "recmachcustrecord_sdb_pim_parent",
                        fieldId: "custrecord_sdb_image_id",
                        line: i
                    });
                    var caption = PIMItemRecord.getSublistValue({
                        sublistId: "recmachcustrecord_sdb_pim_parent",
                        fieldId: "custrecord_sdb_image_caption",
                        line: i,
                    });
                    var defaultAsset = PIMItemRecord.getSublistValue({
                        sublistId: "recmachcustrecord_sdb_pim_parent",
                        fieldId: "custrecord_sdb_img_default_asset",
                        line: i
                    });
                    var isImage = PIMItemRecord.getSublistValue({
                        sublistId: "recmachcustrecord_sdb_pim_parent",
                        fieldId: "custrecord_sdb_is_image",
                        line: i
                    })
                    context.write({
                        key: imgId + "_" + data.id + "_" + data.values["type"].value,
                        value: {
                            URL: imgURL,
                            Item: data.id,
                            ItemType: data.values["type"].value,
                            caption: caption,
                            defaultAsset: defaultAsset,
                            isImage: isImage,
                        }
                    })
                }
                PIMItemRecord.setValue('custrecord_sdb_item_pim', data.id);
                var savedPIMItemRecordId = PIMItemRecord.save();
                log.debug("map() PIMItemRecord saved: ", savedPIMItemRecordId);

            } else {
                log.debug("map() PIM Item NOT FOUND", "PIM Item not found");
                var exists = false;
                search.create({
                    type: "customrecord_sdb_no_items",
                    filters: ["custrecord_sdb_no_sap", "is", data.id]
                }).run().each(function (res) {
                    exists = true;
                    return true;
                });
                if (!exists) {
                    var rec = record.create({
                        type: "customrecord_sdb_no_items"
                    })
                    rec.setValue({
                        fieldId: "custrecord_sdb_no_sap",
                        value: data.id
                    })
                    rec.setValue({
                        fieldId: "name",
                        value: "Setting item: " + data.id,
                    })
                    var id = rec.save();
                }
            }
        } catch (mapError) {
            log.error("map() ERROR", mapError);
        }
    }

    function reduce(context) {
        try {
            var values = context.values;
            var valueObj = JSON.parse(values[0]);
            log.debug("reduce() valueObj is: ", valueObj);
            log.debug("reduce() typeof valueObj is: ", typeof valueObj);

            // {
            //     URL: imgURL,
            //     Item: data.id,
            //     ItemType: data.values["type"].value,
            //     caption: caption,
            //     defaultAsset: defaultAsset,
            //     isImage: isImage,
            // }

            var eXtendFile = record.create({
                type: "customrecord_extend_files_aut",
                isDynamic: true,
            });

            // Set the URL
            var fixedURL = valueObj.URL;
            fixedURL = fixedURL.split(" ").join("%");
            log.debug("map() typeof fixedURL IS: ", typeof fixedURL)
            eXtendFile.setValue({
                fieldId: "custrecord_extfile_link",
                value: fixedURL,
            });

            // Set File type custrecord_extfile_type_custlist
            var extFileType;
            var defaultAsset = valueObj.defaultAsset;
            var caption = valueObj.caption;
            var isImage = valueObj.isImage;
            if (caption == 'SDS') {
                extFileType = 6; //SAP //! HARDCODE
            } else if (defaultAsset && isImage) {
                extFileType = 13; //Product image (main) //! HARDCODE
            } else if (!defaultAsset && isImage) {
                extFileType = 14; // Product image (additional) //! HARDCODE
            }

            log.debug("reduce() extFileType is: ", extFileType);
            if (extFileType) {
                eXtendFile.setValue('custrecord_extfile_type_custlist', extFileType)
            }

            // Mandatory fields
            // custrecord_extfile_filename
            // name
            eXtendFile.setValue('name', fixedURL); 
            eXtendFile.setValue('custrecord_extfile_filename', fixedURL);
            if (extFileType == 13)
                eXtendFile.setValue('custrecord_extend_files_thmbnail', fixedURL); // SET fixedURL || fixedURL_2 for field "EXTENDFILES - VIEW THUMBNAIL"

            // Set the Item reference
            var itemType = valueObj.ItemType; log.debug("reduce() itemType is: ", itemType);
            eXtendFile.setValue(itemType == "InvtPart" ? "custrecord_extfile_inventory_item_pref" : "custrecord_extfile_non_inv_item_pref", valueObj.Item);

            // Set the Unilog Mark
            eXtendFile.setValue("custrecord_extend_files_upl_additio_info", "This eXtendFile was created using information from PIM");

            var eXtendFileID = eXtendFile.save();
            log.debug("reduce() eXtendFileID is: ", eXtendFileID);
        } catch (reduceERROR) {
            log.error("reduce() ERROR", reduceERROR);
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
        log.debug('summarize', 'end');
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize,
    };
});