/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define([
    'N/runtime', 'N/https', 'N/http', 'N/url', 'N/log', 'N/search', 'N/record', 'N/file'
], function (runtime, https, http, urlMod, myLog, search, record, file) {
    function getInputData() {
        try {
            var arrayTotal = [];
            var totalPages = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_total_pages",
            });
            var getSampleData = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_get_sample_data",
            });
            var currentPage = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_initial_page",
            });
            var itemsData
            if (!getSampleData) {
                while (currentPage < totalPages) {
                    itemsData = getItems(getToken(), currentPage);
                    arrayTotal = arrayTotal.concat(itemsData);
                    currentPage++;
                }
            } else {
                var arrayOfSAPCodes = {};
                for (var i = 0; i < arrayOfSAPCodes.length; i++) {
                    itemsData = getSampleDataF(getToken(), arrayOfSAPCodes[i]);
                    arrayTotal = arrayTotal.concat(itemsData);
                }
            }
            return arrayTotal;
        } catch (e) {
            log.error("error in reading lines of csv", JSON.stringify(e));
        }
    }

    function map(context) {
        try {
            var data = JSON.parse(context.value);
            var valid = false;
            var pimItemsId;
            if (!data) {
                log.audit("Map() data is null");
                return;
            }
            var ss = search.create({
                type: "customrecord_sdb_pim_items",
                filters: ["custrecord_sdb_pim_id", "is", data.id]
            }).run().each(function (res) {
                valid = true;
                pimItemsId = res.id;
                return true;
            });
            var rec;
            if (valid && pimItemsId) {
                rec = record.load({
                    type: "customrecord_sdb_pim_items",
                    id: pimItemsId,
                    isDynamic: true,
                });
            } else {
                rec = record.create({
                    type: "customrecord_sdb_pim_items",
                    isDynamic: true,
                })
            }
            rec.setValue({
                fieldId: "custrecord_sdb_pim_id",
                value: data.id
            })
            log.audit("custrecord_sdb_json_raw_data VALUES: ", context.value);
            rec.setValue({
                fieldId: "custrecord_sdb_json_raw_data",
                value: context.value
            })
            rec.setValue({
                fieldId: "custrecord_sdb_sap_pim",
                value: data.partNumber
            });
            rec.setValue({
                fieldId: "custrecord_sdb_pim_status",
                value: data.myCatalogStatus
            });
            rec.setValue({
                fieldId: "custrecord_sdb_item_pim",
                value: '',
            })

            // Get Images info and set it on sublist (recmachcustrecord_sdb_pim_parent)
            var images = data.images; // []
            var imagesLength = images ? images.length : 0;
            for (var i = 0; i < imagesLength; i++) {
                var thisImage = images[i];
                var indexOfId = rec.findSublistLineWithValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_image_id",
                    value: thisImage.id,
                });
                if (indexOfId != -1) {
                    rec.selectLine({
                        sublistId: "recmachcustrecord_sdb_pim_parent",
                        line: indexOfId
                    });
                } else {
                    rec.selectNewLine({
                        sublistId: "recmachcustrecord_sdb_pim_parent"
                    });
                }
                rec.setCurrentSublistValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_image_id",
                    value: thisImage.id,
                });
                rec.setCurrentSublistValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_image_url",
                    value: thisImage.imageName,
                });
                rec.setCurrentSublistValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_image_caption",
                    value: thisImage.caption,
                });
                rec.setCurrentSublistValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_img_default_asset",
                    value: thisImage.defaultAsset,
                });
                rec.setCurrentSublistValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_is_image",
                    value: true,
                })
                rec.commitLine({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                });
            }

            // Get documents and set them on sublist (recmachcustrecord_sdb_pim_parent)
            var assets = data.assets; // []
            var assetsLength = assets ? assets.length : 0;
            for (var i = 0; i < assetsLength; i++) {
                var thisAsset = assets[i];
                var indexOfId = rec.findSublistLineWithValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_image_id",
                    value: thisAsset.id
                });
                if (indexOfId != -1) {
                    rec.selectLine({
                        sublistId: "recmachcustrecord_sdb_pim_parent",
                        line: indexOfId
                    });
                } else {
                    rec.selectNewLine({
                        sublistId: "recmachcustrecord_sdb_pim_parent"
                    });
                }
                rec.setCurrentSublistValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_image_id",
                    value: thisAsset.id,
                });
                rec.setCurrentSublistValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_image_url",
                    value: thisAsset.documentName,
                });
                rec.setCurrentSublistValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_image_caption",
                    value: thisAsset.caption,
                });
                rec.setCurrentSublistValue({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                    fieldId: "custrecord_sdb_img_default_asset",
                    value: thisAsset.defaultAsset,
                });
                rec.commitLine({
                    sublistId: "recmachcustrecord_sdb_pim_parent",
                });
            }
            var myId = rec.save();
            log.debug("myId: ", myId);
        } catch (error) {
            log.error("map() ERROR", error);
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

    //* Aux Functions
    function getToken() {
        try {
            var headers = [];
            //KEY: b494c123-4e4a-4343-907c-8c1fc24b934e
            //PASS: be52dc95-8b1c-40e1-925e-70ec1a99f98c
            headers['Authorization'] = 'Basic YjQ5NGMxMjMtNGU0YS00MzQzLTkwN2MtOGMxZmMyNGI5MzRlOmJlNTJkYzk1LThiMWMtNDBlMS05MjVlLTcwZWMxYTk5Zjk4Yw=='
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            var details = {
                "grant_type": "password",
                "username": "acmepaperadmin@unilogcorp.com",
                "password": "AcmeP@per23",
            };
            var formBody = [];
            for (var property in details) {
                var encodedKey = encodeURIComponent(property);
                var encodedValue = encodeURIComponent(details[property]);
                formBody.push(encodedKey + "=" + encodedValue);
            }
            formBody = formBody.join("&");
            var url = "https://cx1gateway-v1.unilogcorp.com/aas/oauth/token"
            var responseP = https.post({
                url: url,
                headers: headers,
                body: formBody
            });
            var responseBody = JSON.parse(responseP.body);
            return responseBody.access_token;
        } catch (error) {
            log.error("getToken() ERROR", error);
        }
    }

    function getItems(token, page) {
        try {
            var url = 'https://cx1gateway-v1.unilogcorp.com/pimitemservice/pim/v1/catalogs/mine/items?filter.cdn=true&size=100&page=' + page;
            var headers = [];
            headers['Authorization'] = 'Bearer ' + token;
            headers['Accept'] = '*/*';
            headers['Accept-Encoding'] = 'gzip, deflate, br';
            var responseP = https.get({
                url: url,
                headers: headers,
            });
            var responseBody = JSON.parse(responseP.body);
            var responseContent = responseBody.content;
            var itemsData = [];
            for (var i = 0; i < responseContent.length; i++) {
                itemsData.push(responseContent[i]);
            }
            return itemsData;
        } catch (error) {
            log.error("getitems() ERROR", error);
        }
    }

    function getSampleDataF(token, SAPCode) {
        try {
            var url = 'https://cx1gateway-v1.unilogcorp.com/pimitemservice/pim/v1/catalogs/mine/items?filter.cdn=true&filter.partNumber=' + SAPCode;
            var headers = [];
            headers['Authorization'] = 'Bearer ' + token;
            headers['Accept'] = '*/*';
            headers['Accept-Encoding'] = 'gzip, deflate, br';
            var responseP = https.get({
                url: url,
                headers: headers,
            });
            var responseBody = JSON.parse(responseP.body);
            var responseContent = responseBody.content;
            var itemsData = [];
            for (var i = 0; i < responseContent.length; i++) {
                itemsData.push(responseContent[i]);
            }
            return itemsData;
        } catch (error) {
            log.error("getSampleData() ERROR", error);
        }
    }
    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize,
    };
});