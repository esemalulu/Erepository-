/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define([
    'N/runtime', 'N/https', 'N/http', 'N/url', 'N/log', 'N/search', 'N/record', 'N/file', 'N/task', 'N/cache'
], function (runtime, https, http, urlMod, myLog, search, record, file, task, cache) {
    function getInputData() {
        try {
            var startTimeStampt = Date.now();
            var PimCache = cache.getCache({
                name: 'PimIntegration',
                scope: cache.Scope.PRIVATE
            });
            log.debug("getInputData() token is: ", PimCache.get({ key: 'token', loader: getToken, ttl: 3598 }));
            var arrayTotal = [];
            var finalPage = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_total_pages",
            });
            var getSampleData = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_get_sample_data",
            });
            var currentPage = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_initial_page",
            });
            var bringAllData = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_bring_all_data",
            });
            var itemsData = [''];
            if (!getSampleData) {
                while (currentPage < finalPage && ((Date.now() - startTimeStampt) < 3000000) && itemsData && itemsData.length > 0) {
                    itemsData = getItems(PimCache.get({ key: 'token', loader: getToken, ttl: 3598 }), currentPage, bringAllData);
                    if (!itemsData) {
                        continue; // IF itemsData UNDEFINED due to error in getItems() -> retry page.
                    }
                    arrayTotal = arrayTotal.concat(itemsData);
                    currentPage++;
                }
            } else {
                var arrayOfSAPCodes = ['SAP_1291997'];
                for (var i = 0; i < arrayOfSAPCodes.length; i++) {
                    itemsData = getSampleDataF(PimCache.get({ key: 'token', loader: getToken, ttl: 3598 }), arrayOfSAPCodes[i]);
                    arrayTotal = arrayTotal.concat(itemsData);
                }
            }
            log.debug("getInputData() arrayTotal to return is: ", arrayTotal);
            log.audit("getInputData() last page gotten from API is: ", currentPage - 1);
            log.debug("getInputData() remaining Units", runtime.getCurrentScript().getRemainingUsage());
            return arrayTotal;
        } catch (e) {
            log.error("getInputData() ERROR", JSON.stringify(e));
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
        try {
            var errors = "";
            var batchNumber = runtime.getCurrentScript().getParameter({
                name: "custscript_sdb_batch_number"
            });
            summary.mapSummary.errors.iterator().each(function (key, value) {
                errors += "Error in record creation: " + key + ". Error was: " + JSON.parse(value).message + "/n";
                return true;
            });
            log.debug("summarize() batchNumber is: ", batchNumber);
            if (batchNumber > 0) {
                var bringAllData = runtime.getCurrentScript().getParameter({
                    name: "custscript_sdb_bring_all_data"
                });
                var lastBatch = runtime.getCurrentScript().getParameter({
                    name: "custscript_sdb_last_batch"
                });
                if(!lastBatch){
                    var MRTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        deploymentId: "customdeploy_sdb_" + Number(batchNumber + 1),
                        scriptId: "customscript_sdb_get_items_unilog",
                        params: {
                            custscript_sdb_bring_all_data: bringAllData
                        }
                    }).submit();
                }else{
                    var MRTaskPimItemFields = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        deploymentId: "customdeploy_sdb_set_pim_item_fields",
                        scriptId: "customscript_set_pim_item_fields"
                    }).submit();
                }
            }
            if (errors) {
                log.error('Errors in Summarize', errors);
            }
            log.debug('summarize', 'end');
        } catch (summarizeError) {
            log.error("summarize() ERROR", summarizeError);
        }
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

    function getItems(token, page, bringAllData) {
        try {
            var dateFilters = '';
            if (!bringAllData) {
                var today = new Date();
                var lastWeek = new Date();
                lastWeek.setDate(today.getDate() - 7);
                today = formatDateUTCString(today);
                lastWeek = formatDateUTCString(lastWeek);
                dateFilters = '&fromDate=' + lastWeek + '&toDate=' + today + '&createdFromDate=1998-01-01T00:00:00.000Z&createdToDate=' + today;
            }
            var url = 'https://cx1gateway-v1.unilogcorp.com/pimitemservice/pim/v1/catalogs/mine/items?filter.cdn=true&size=100&page=' + page + dateFilters;
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

    function formatDateUTCString(date) {
        try {
            return date.getFullYear() + '-'
                + (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)) + '-'
                + (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + 'T'
                + (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':'
                + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':'
                + (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()) + '.'
                + '000';
        } catch (formatDateUTCStringERROR) {
            log.error("formatDateUTCString() ERROR", formatDateUTCStringERROR);
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