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
            log.debug("map() data.id is: ", data.id);
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
                log.debug("PIMItemRecord",PIMItemRecord);
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
                    'custitem_sdb_pim_invoice_desc', // invcDescription
                    'custitem_sdb_lvl_1_taxo_name',
                    'custitem_sdb_lvl_1_taxo_id',
                    'custitem_sdb_lvl_1_taxo_code',
                    'custitem_sdb_lvl_2_taxo_name',
                    'custitem_sdb_lvl_2_taxo_id',
                    'custitem_sdb_lvl_2_taxo_code',
                    'custitem_sdb_lvl_3_taxo_name',
                    'custitem_sdb_lvl_3_taxo_id',
                    'custitem_sdb_lvl_3_taxo_code'
                ];
                var PIMItemData = JSON.parse(PIMItemRecord.getValue('custrecord_sdb_json_raw_data'));
                log.debug("PIMItemData",PIMItemData);
                if(PIMItemData){
                    // Body Values
                    var volume = PIMItemData.volume;
                    var weight = PIMItemData.packageWeight;
                    var heigth, width, length;
                    var description = PIMItemData.description;
                    var shortDescription = PIMItemData.shortDescription;
                    var invcDescription = PIMItemData.invcDescription;
                    //  Taxonomies
                    var name1= '';
                    var id1= '';
                    var code1= '';
                    var name2= '';
                    var id2= '';
                    var code2= '';
                    var name3= '';
                    var id3= '';
                    var code3= '';
                    if(PIMItemData.taxonomies){
                        //      Level 1
                        name1 = PIMItemData.taxonomies[0].categories[0].categoryName;
                        id1 = PIMItemData.taxonomies[0].categories[0].categoryId;
                        code1 = PIMItemData.taxonomies[0].categories[0].categoryCode;
                        //      Level 2
                        name2 = PIMItemData.taxonomies[0].categories[1].categoryName;
                        id2 = PIMItemData.taxonomies[0].categories[1].categoryId;
                        code2 = PIMItemData.taxonomies[0].categories[1].categoryCode;
                        //      Level 3
                        name3 = PIMItemData.taxonomies[0].categories[2].categoryName;
                        id3 = PIMItemData.taxonomies[0].categories[2].categoryId;
                        code3 = PIMItemData.taxonomies[0].categories[2].categoryCode;
                    }
                    // Lists
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
                    var values = [volume, weight, heigth, width, length, description, shortDescription, invcDescription, name1, id1, code1, name2, id2, code2,name3, id3, code3];
                    for (var j = 0; j < fields.length; j++) {
                        try {
                            if(isPimField(fields[j])){
                                log.debug("itemRecord id", itemRecord.getValue("internalid"));
                                var fieldReplacedFractionsPim = replaceFractionPIM(fields[j], values[j]) || "";
                                itemRecord.setValue(fields[j], fieldReplacedFractionsPim);
                            } else{
                                itemRecord.setValue(fields[j], values[j]);
                            }
                        } catch (settingError) {
                            log.error("map() ERROR setting item Fields", settingError);
                        }
                    }
                    var itemId = itemRecord.save();
                    log.debug("map() saved itemId is: ", itemId);
                    // End Here
                }

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
                            imageId: imgId,
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
            //     imageId: imgId,
            // }
            var itemType = valueObj.ItemType; log.debug("reduce() itemType is: ", itemType);
            var fixedURL = valueObj.URL;
            fixedURL = fixedURL.split(" ").join("%");
            var defaultAsset = valueObj.defaultAsset;
            var caption = valueObj.caption;
            var isImage = valueObj.isImage;
            var imageID = valueObj.imageId;
            log.debug("reduce() environment is: ", {
                runtimeEnvironment: runtime.envType,
                jsonStringifyRuntimeEnvironment: JSON.stringify(runtime.envType),
                enumEnvironment: runtime.EnvType.SANDBOX,
                conditionStringify: JSON.stringify(runtime.envType)=== runtime.EnvType.SANDBOX,
                condition: runtime.envType === runtime.EnvType.SANDBOX,
            });
            var identifier = imageID;
            var customrecord_extend_files_autSearchObj = search.create({
                type: "customrecord_extend_files_aut",
                filters:
                [
                   ["name","is",identifier], 
                   "AND", 
                   ["custrecord_extend_files_upl_additio_info","is","This eXtendFile was created using information from PIM"], 
                   "AND", 
                   [["custrecord_extfile_inventory_item_pref","anyof",valueObj.Item],"OR",["custrecord_extfile_non_inv_item_pref","anyof",valueObj.Item],"OR",["custrecord_extfile_item_pref","anyof",valueObj.Item]]
                ],
                columns:
                []
             });
             var countExtndFiles = customrecord_extend_files_autSearchObj.runPaged().count;
             log.debug("customrecord_extend_files_autSearchObj result count",countExtndFiles);

             var eXtendFile;
             if(countExtndFiles > 0){
                var loadextndFileID; 
                 customrecord_extend_files_autSearchObj.run().each(function(result){
                    loadextndFileID = result.id;
                    return false; // Pick the first one
                 });
                 eXtendFile = record.load({
                    type: "customrecord_extend_files_aut",
                    id: loadextndFileID,
                    isDynamic: true,
                 })
             }else{
                 eXtendFile = record.create({
                     type: "customrecord_extend_files_aut",
                     isDynamic: true,
                 });
             }

            // Set the URL
            log.debug("map() typeof fixedURL IS: ", typeof fixedURL)
            eXtendFile.setValue({
                fieldId: "custrecord_extfile_link",
                value: fixedURL,
            });

            // Set File type custrecord_extfile_type_custlist
            var extFileType;
            switch(caption){
                case 'SDS':
                    extFileType = 6; //SAP //! HARDCODE
                    break;
                case 'Specification Sheet':
                    extFileType = 10; // Data Sheet //! HARDCODE
                    break;
                case 'Catalog':
                case 'Warranty Information':
                    extFileType = 9; // Document //! HARDCODE
                    break;
                case 'Instruction/Installation Manual':
                case 'Owners/User Manual':
                case 'Service Manual':
                case 'Owner’s/User Manual':
                    extFileType = 12; // Manual //! HARDCODE
                    break;
                case 'Video Link':
                    extFileType = 7; // Videos //! HARDCODE
                    break;
                default:
                    if (defaultAsset && isImage) {
                        extFileType = 13; //Product image (main) //! HARDCODE
                    } else if (!defaultAsset && isImage) {
                        extFileType = 14; // Product image (additional) //! HARDCODE
                    }
                    break;
            }

            log.debug("reduce() extFileType is: ", extFileType);
            if (extFileType) {
                eXtendFile.setValue('custrecord_extfile_type_custlist', extFileType)
            }

            // Mandatory fields
            // custrecord_extfile_filename
            // name
            eXtendFile.setValue('name', identifier); 
            eXtendFile.setValue('custrecord_extfile_filename', fixedURL);
            if (extFileType == 13)
                eXtendFile.setValue('custrecord_extend_files_thmbnail', fixedURL); // SET fixedURL || fixedURL_2 for field "EXTENDFILES - VIEW THUMBNAIL"

            // Set the Item reference
            eXtendFile.setValue(itemType == "InvtPart" ? "custrecord_extfile_inventory_item_pref" : "custrecord_extfile_non_inv_item_pref", valueObj.Item);

            // Set the Unilog Mark
            eXtendFile.setValue("custrecord_extend_files_upl_additio_info", "This eXtendFile was created using information from PIM");

            var eXtendFileID = eXtendFile.save();
            log.debug("reduce() eXtendFileID is: ", eXtendFileID);
        } catch (reduceERROR) {
            log.error("reduce() ERROR", reduceERROR);
        }
    }

    function replaceFractionPIM(fieldId, fieldValue){
        try{
                log.debug("fieldId in replaceFractionPIM", fieldId);
                log.debug("fieldValue in replaceFractionPIM", fieldValue);
                var fieldValueString;
                if (fieldValue) {
                    fieldValueString = fieldValue.toString();
                    if(fieldValueString.indexOf("-")===-1 && fieldValueString.indexOf("/")>=0){
                        fieldValueString = "0-" + fieldValueString
                    }
                }
                if (fieldValueString && fieldId) {
                    var fieldValuePostFilter;
                    if (fieldValueString.indexOf("x") >= 0) {
                        log.debug({
                            title: 'Field ' + fieldId,
                            details: fieldValueString
                        })
                        if (fieldValueString.indexOf("Top")>=0) {
                            var splittedStringFieldValue = fieldValueString.split("x");
                            for (var i = 0; i < splittedStringFieldValue.length; i++) {
                                if (splittedStringFieldValue[i].indexOf("Top")>=0) {
                                    fieldValuePostFilter = splittedStringFieldValue[i].split("in")[0].trim();
                                }
                            }
                        } else if (fieldValueString.indexOf("Outside")>=0) {
                            var splittedStringFieldValue = fieldValueString.split("x");
                            for (var i = 0; i < splittedStringFieldValue.length; i++) {
                                if (splittedStringFieldValue[i].indexOf("Outside")>=0) {
                                    fieldValuePostFilter = splittedStringFieldValue[i].split("in")[0].trim();
                                }
                            }
                        } else {
                            fieldValuePostFilter = fieldValueString.split("x")[0].trim();
                        }
                    } else if (fieldValueString.indexOf("X")>=0) {
                        log.debug({
                            title: 'Field ' + fieldId,
                            details: fieldValueString
                        })
                        var splittedStringFieldValue = fieldValueString.split("X");
                        if (splittedStringFieldValue[0].indexOf('"')>=0) {
                            fieldValuePostFilter = splittedStringFieldValue[0].split('"')[0].trim();
                        }
                    } else {
                        fieldValuePostFilter = fieldValueString;
                    }

                    if (fieldValuePostFilter&&fieldValuePostFilter.indexOf("-")>=0) {
                        var splittedString = fieldValuePostFilter.split("-");
                        var fractions = splittedString[1].split("/");
                        var numerator = parseInt(fractions[0]);
                        var denominator = parseInt(fractions[1]);
                        var decimalValue = numerator / denominator;
                        var originalValue = parseInt(splittedString[0]);
                        var value = (originalValue + decimalValue).toFixed(2);
                        return value;
                    } else {
                        return fieldValuePostFilter;
                    }
                }
        } catch (e) {
            log.error("error in replaceFractionPIM", e);
        }
    }

    function isPimField(fieldId){
        if( fieldId == "custitem_sdb_pim_width" ||
            fieldId == "custitem_sdb_pim_height" ||
            fieldId == "custitem_sdb_pim_length" ||
            fieldId == "custitem_sdb_pim_weight"){
            return true;
        } else{
            return false;
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