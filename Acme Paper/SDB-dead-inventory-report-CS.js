/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/url', 'N/https', 'N/search', 'N/log'], function (url, https, search, log) {

    function fieldChanged(context) {
        try {
            const fieldId = context.fieldId;

            // Sales functionality
            if (fieldId == "custpage_sales_date_from") {
                var salesDate = context.currentRecord.getValue("custpage_sales_date_from");
                console.log('info', `${salesDate} ${getFormattedDate(salesDate)}`);
                if (!salesDate) salesDate = "none";
                else salesDate = getFormattedDate(salesDate);
                const paramName = "salesDateFrom";
                const paramValue = salesDate;
                addParamToUrl([{ paramName, paramValue }]);
            }

            if (fieldId == "custpage_sales_date_to") {
                var salesDateTo = context.currentRecord.getValue("custpage_sales_date_to");
                if (!salesDateTo) salesDateTo = new Date();
                const paramName = "salesDateTo";
                const paramValue = getFormattedDate(salesDateTo);
                addParamToUrl([{ paramName, paramValue }]);
            }

            if (fieldId == "custpage_transaction_type") {
                let transactionType = context.currentRecord.getValue("custpage_transaction_type");
                const array = [
                    {
                        paramName: "transactionType",
                        paramValue: transactionType
                    },
                ];
                addParamToUrl(array);
            }

            if (fieldId == "custpage_gotopage_select") {
                let pageNum = context.currentRecord.getValue("custpage_gotopage_select");
                if (!pageNum) pageNum = 1;
                const paramName = "page";
                const paramValue = pageNum;
                addParamToUrl([{ paramName, paramValue }]);
            }

            if (fieldId == "custpage_qty_backordered") {
                let qtyBack = context.currentRecord.getValue("custpage_qty_backordered");
                const paramName = "qtyback";
                const paramValue = qtyBack;
                addParamToUrl([{ paramName, paramValue }]);
            }

            // Additional functionality for new fields
            if (fieldId == "custpage_last_sold_from") {
                var lastSoldFrom = context.currentRecord.getValue("custpage_last_sold_from");
                const paramName = "lastSoldFrom";
                const paramValue = getFormattedDate(lastSoldFrom);
                addParamToUrl([{ paramName, paramValue }]);
            }

            if (fieldId == "custpage_last_sold_to") {
                var lastSoldTo = context.currentRecord.getValue("custpage_last_sold_to");
                const paramName = "lastSoldTo";
                const paramValue = getFormattedDate(lastSoldTo);
                addParamToUrl([{ paramName, paramValue }]);
            }

            if (fieldId == "custpage_last_purchased_from") {
                var lastPurchasedFrom = context.currentRecord.getValue("custpage_last_purchased_from");
                const paramName = "lastPurchasedFrom";
                const paramValue = getFormattedDate(lastPurchasedFrom);
                addParamToUrl([{ paramName, paramValue }]);
            }

            if (fieldId == "custpage_last_purchased_to") {
                var lastPurchasedTo = context.currentRecord.getValue("custpage_last_purchased_to");
                const paramName = "lastPurchasedTo";
                const paramValue = getFormattedDate(lastPurchasedTo);
                addParamToUrl([{ paramName, paramValue }]);
            }

            // New functionality for Buyer and Preferred Vendor fields
            if (fieldId == "custpage_buyer") {
                var buyer = context.currentRecord.getValue("custpage_buyer");
                const paramName = "buyer";
                const paramValue = buyer;
                addParamToUrl([{ paramName, paramValue }]);
            }

            if (fieldId == "custpage_preferred_vendor") {
                var preferredVendor = context.currentRecord.getValue("custpage_preferred_vendor");
                const paramName = "preferredVendor";
                const paramValue = preferredVendor;
                addParamToUrl([{ paramName, paramValue }]);
            }
            if (fieldId == "custpage_warehouse") {
                var warehouse = context.currentRecord.getValue("custpage_warehouse");
                const paramName = "warehouse";
                const paramValue = warehouse;
                addParamToUrl([{ paramName, paramValue }]);
            }

        } catch (e) {
            console.log('ERROR IN fieldChanged', e);
        }

    }

    function addParamToUrl(params) {
        try {
            var url = window.location.href;

            var urlObject = new URL(url);

            var searchParams = urlObject.searchParams;

            params.forEach(obj => {
                var urlParam = searchParams.get(obj.paramName);

                if (urlParam) searchParams.delete(obj.paramName);
                if (obj.paramValue && obj.paramValue !== "none") {
                    searchParams.set(obj.paramName, obj.paramValue);
                } else {
                    searchParams.delete(obj.paramName);
                }
            });

            top.window.onbeforeunload = null;
            window.location.href = urlObject.toString();
        } catch (e) {
            console.log('ERROR IN addParamToUrl', e);
        }
    }

    function getFormattedDate(currentDate) {
        try {
            var year = currentDate.getFullYear();
            var month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
            var day = currentDate.getDate().toString().padStart(2, '0');

            var formattedDate = `${month}-${day}-${year}`;
            return formattedDate;

        } catch (e) {
            console.log('ERROR IN getFormattedDate', e);
        }
    }

    function getFormattedDate(date) {
        try {
            if (!date) return null;
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${month}-${day}-${year}`;
        } catch (e) {
            console.log('ERROR IN getFormattedDate', e);
            return null;
        }
    }


    function exportToExcel(baseUrl) {
        try {
            let params = {};
            const myUrl = window.location.href;
            const queryString = myUrl.split('?')[1] || '';
            const urlParams = queryString.split('&');

            urlParams.forEach(param => {
                const [key, value] = param.split('=');
                if (key) {
                    params[key] = decodeURIComponent(value) || null;
                }
            });


            params.salesDateFrom = params['salesDateFrom'] || null;
            params.salesDateTo = params['salesDateTo'] || null;
            params.transactionType = params['transactionType'] || null;
            params.page = params['page'] || 1;
            params.lastSoldFrom = params['lastSoldFrom'] || null;
            params.lastSoldTo = params['lastSoldTo'] || null;
            params.lastPurchasedFrom = params['lastPurchasedFrom'] || null;
            params.lastPurchasedTo = params['lastPurchasedTo'] || null;
            params.buyer = params['buyer'] || null;
            params.preferredVendor = params['preferredVendor'] || null;

            var loadingMessage = createLoadingMessage();

            var suiteletUrl = url.resolveScript({ scriptId: "customscript_sdb_create_inventory_excel", deploymentId: "customdeploy_sdb_create_excel_dead_int" });

            https.post.promise({ url: suiteletUrl, body: JSON.stringify(params) })
                .then(function (response) {
                    loadingMessage.style.display = "none";
                    var body = response.body;
                    var filesIds = JSON.parse(body);
                    var filesUrls = getFilesUrls(baseUrl,filesIds);
                    createDownloadModal(filesUrls);

                }).catch(function (error) {
                    loadingMessage.style.display = "none";
                });
        } catch (e) {
            console.log('ERROR IN getParameters', e);
            return null;
        }
    }

    function getFilesUrls(baseUrl,fileIds) {
        try {
            if (!fileIds || fileIds.lenght == 0) return;
            var filesUrls = [];
            var fileSearchObj = search.create({
                type: "file",
                filters:
                    [
                        ["internalid", "anyof", fileIds]
                    ],
                columns:
                    [
                        search.createColumn({ name: "name", label: "Name" }),
                        search.createColumn({ name: "url", label: "URL" })
                    ]
            });
            fileSearchObj.run().each(function (result) {
                filesUrls.push({ name: result.getValue({ name: 'name' }), url: baseUrl + result.getValue({ name: 'url' }) })
                return true;
            });
            return filesUrls;
        } catch (error) {
            log.error("getFilesUrls", error)
        }
    }
    function createLoadingMessage() {
        try {
            var loadingMessage = document.createElement('div');
            loadingMessage.setAttribute('id', 'loadingMessage');
            loadingMessage.style.position = 'fixed';
            loadingMessage.style.top = '50%';
            loadingMessage.style.left = '50%';
            loadingMessage.style.transform = 'translate(-50%, -50%)';
            loadingMessage.style.padding = '30px';
            loadingMessage.style.backgroundColor = '#f0f0f0';
            loadingMessage.style.border = '1px solid #ccc';
            loadingMessage.style.zIndex = '1000';
            loadingMessage.style.fontSize = '18px';
            loadingMessage.style.textAlign = 'center';
            loadingMessage.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.1)';

            var messageText = document.createElement('p');
            messageText.style.margin = '0 0 20px 0';
            messageText.innerHTML = 'Loading, please wait...';


            loadingMessage.appendChild(messageText);
            // loadingMessage.appendChild(closeButton);

            document.body.appendChild(loadingMessage);

            return loadingMessage;
        } catch (error) {
            log.error("createLoadingMessage error", error);
        }
    }
    function createDownloadModal(files) {
        try {
            var msg = '<div style="width: 100%;" >';
            msg += '<table style="border-collapse: collapse; width: 100%;">';
            msg += '<tr>';
            msg += '<th style="border: 1px solid black; padding: 8px;">File Name</th>';
            msg += '<th style="border: 1px solid black; padding: 8px;">Download</th>';
            msg += '</tr>';

            for (var i = 0; i < files.length; i++) {
                msg += '<tr>';
                msg += '<td style="border: 1px solid black; padding: 8px;">' + files[i].name + '</td>';
                msg += '<td style="border: 1px solid black; padding: 8px;">' +
                    '<a href="' + files[i].url + '" ' +
                    'style="display: inline-block; padding: 8px 16px; margin: 0; ' +
                    'font-size: 14px; color: #fff; background-color: #007bff; ' +
                    'border-radius: 4px; text-decoration: none;">Download</a>' +
                    '</td>';
                msg += '</tr>';
                msg += '</tr>';
            }
            msg += '</table>';
            msg += '<br/>';
            msg += '<div style="width: 100%; visibility:hidden; font-size: 18px; text-align:center"></div>';
            msg += '<div style="display: flex; justify-content: center; align-items: center;">';
            msg += '<br/>';
            msg += '<br/>';
            msg += '<button>Close</button>';
            msg += '</div>';
            msg += '</div>';
            msg += '<br/>';
            msg += '<br/>';

            var popupConfig = {
                title: 'Download Files',
                msg: msg,
                width: '2000px',
                multiline: false,
            };
            var modal = Ext.Msg.show(popupConfig);
        } catch (error) {
            log.error("createDownloadModal ", error);
        }
    }

    return {
        fieldChanged,
        exportToExcel
    }
});