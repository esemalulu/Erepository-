/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/url', 'N/currentRecord', 'N/ui/message', 'N/ui/dialog', 'N/log','N/https'], function (url, currentRecord, message, dialog, log,https) {

    const FORMFIELDS = {};
    FORMFIELDS.CUSTOMER = 'custpage_customer';
    FORMFIELDS.VENDOR = 'custpage_vendor';
    FORMFIELDS.COMMODITY_CODE = 'custpage_commodity_code';
    FORMFIELDS.PAGE_ID = 'custpage_pageid';
    FORMFIELDS.DOWNLOAD = 'custpage_download';
    FORMFIELDS.INCREASE_PRICE = 'custpage_increase_price';
    FORMFIELDS.CHECK_ALL = 'custpage_check_all';
    FORMFIELDS.ITEM = 'custpage_item';

    function pageInit(context) {
        try {
            var checkAll = sessionStorage.getItem("custpage_check_all");
            //If checkAll was checked on previous page all the items must be checked
            if (checkAll == true || checkAll == 'true') {
                var currRec = context.currentRecord;
                currRec.setValue({ fieldId: FORMFIELDS.CHECK_ALL, value: true, ignoreFieldChange: false });
            }

        } catch (error) {
            log.error("pageInit error", error);
        }
    }


    function fieldChanged(context) {
        try {
            var currRec = context.currentRecord;
            var customer = currRec.getValue({ fieldId: FORMFIELDS.CUSTOMER });
            var vendor = currRec.getValue({ fieldId: FORMFIELDS.VENDOR });
            var commodityCode = currRec.getValue({ fieldId: FORMFIELDS.COMMODITY_CODE });
            var pageId = currRec.getValue({ fieldId: FORMFIELDS.PAGE_ID });
            var checkAllValue = currRec.getValue({ fieldId: FORMFIELDS.CHECK_ALL });
            var item = currRec.getValue({fieldId:FORMFIELDS.ITEM})
            pageId = parseInt(pageId.split('_')[1]);
            if (context.fieldId == FORMFIELDS.CUSTOMER || context.fieldId == FORMFIELDS.VENDOR || context.fieldId == FORMFIELDS.COMMODITY_CODE || context.fieldId == FORMFIELDS.PAGE_ID || context.fieldId == FORMFIELDS.ITEM) {
                //save on session storage check all checkbox status
                sessionStorage.setItem("custpage_check_all", JSON.stringify(checkAllValue));
                var linkUrl = url.resolveScript({
                    deploymentId: getParameterFromURL('deploy'),
                    scriptId: getParameterFromURL('script'),
                    params: {
                        'custpage_customer': customer,
                        'custpage_vendor': vendor,
                        'custpage_commodity_code': commodityCode,
                        'custpage_pageid': pageId,
                        'custpage_item':item
                    }
                });
                // alert(linkUrl);
                window.onbeforeunload = null;
                window.open(linkUrl, '_self');
            }
            if (context.fieldId == FORMFIELDS.CHECK_ALL) {
                sessionStorage.setItem("custpage_check_all", JSON.stringify(checkAllValue));

                var sessionItems = sessionStorage.getItem("items") ? JSON.parse(sessionStorage.getItem("items")) : {};
                var itemLineCount = currRec.getLineCount({ sublistId: 'custpage_sublist' });
                for (var i = 0; i < itemLineCount; i++) {
                    currRec.selectLine({ sublistId: 'custpage_sublist', line: i });
                    currRec.setCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_update_price', value: checkAllValue });
                    var customerId = currRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_customer', line: i });
                    var itemValueLine = currRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_item', line: i });

                    if (checkAllValue) {
                        var unitPriceValueLine = currRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_unit_price', line: i });
                        if (!sessionItems[customerId]) {
                            sessionItems[customerId] = [];
                        }
                        var existingItem = sessionItems[customerId].find(obj => obj.item == itemValueLine);
                        if (!existingItem) {
                            sessionItems[customerId].push({ customer:customerId,item: itemValueLine, unitPrice: unitPriceValueLine });
                        }
                    }
                }

                if (!checkAllValue) sessionItems = {}
                sessionStorage.setItem("items", JSON.stringify(sessionItems));
            }
            if (context.fieldId == 'custpage_col_update_price') {
                var sessionItems = sessionStorage.getItem("items") ? JSON.parse(sessionStorage.getItem("items")) : {};
                var customerId = currRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_customer', line: context.line });
                var checkValueLine = currRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_update_price', line: context.line });
                var itemValueLine = currRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_item', line: context.line });
                var unitPriceValueLine = currRec.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_col_unit_price', line: context.line });
                if (!sessionItems[customerId]) {
                    sessionItems[customerId] = [];
                }
                if (checkValueLine) {
                    var existingItem = sessionItems[customerId].find(obj => obj.item == itemValueLine);
                    if (!existingItem) {
                        sessionItems[customerId].push({ customer:customerId,item: itemValueLine, unitPrice: unitPriceValueLine });
                    }
                } else {
                    sessionItems[customerId] = sessionItems[customerId].filter(obj => obj.item != itemValueLine);
                    if (sessionItems[customerId].length === 0) {
                        delete sessionItems[customerId];
                    }
                    currRec.setValue({ fieldId: FORMFIELDS.CHECK_ALL, value: false, ignoreFieldChange: true });

                    sessionStorage.setItem("custpage_check_all", JSON.stringify(false));
                }

                sessionStorage.setItem("items", JSON.stringify(sessionItems));
            }

        } catch (error) {
            alert(error);
        }
    }

    function getParameterFromURL(param) {
        try {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == param) {
                    return decodeURIComponent(pair[1]);
                }
            }
            return (false);
        } catch (error) {
            log.error("getParameterFromURL", error)
        }
    }

    function downloadCSV() {
        try {
            var currRec = currentRecord.get();
            var customer = currRec.getValue({ fieldId: FORMFIELDS.CUSTOMER });
            var vendor = currRec.getValue({ fieldId: FORMFIELDS.VENDOR });
            var commodityCode = currRec.getValue({ fieldId: FORMFIELDS.COMMODITY_CODE });
            var pageId = currRec.getValue({ fieldId: FORMFIELDS.PAGE_ID });
            pageId = parseInt(pageId.split('_')[1]);
            var linkUrl = url.resolveScript({
                deploymentId: getParameterFromURL('deploy'),
                scriptId: getParameterFromURL('script'),
                params: {
                    'custpage_customer': customer,
                    'custpage_vendor': vendor,
                    'custpage_commodity_code': commodityCode,
                    'custpage_pageid': pageId,
                    'csv': true
                }
            });
            var msg = message.create({
                type: message.Type.INFORMATION,
                title: 'Information',
                message: 'Your File at File Cabinet > SuiteScripts > Item_Pricing_CPL_Report.',
                duration: 5000
            });
            msg.show();
            window.onbeforeunload = null;
            window.open(linkUrl, '_self');
        } catch (error) {
            log.error("downloadCSV error", error)
        }
    }



    function showPriceModal() {
        try {
            var currRec = currentRecord.get();
            var percentageToIncrease = currRec.getValue('custpage_increase_price');
            if (!percentageToIncrease || percentageToIncrease <= 0) {
                alert("Please set a value for Increase Percent%. The value must be a numeric bigger than zero.");
                return;
            }
            var checkAllValue = currRec.getValue({ fieldId: FORMFIELDS.CHECK_ALL });
            var sublistData = [];
            if(!checkAllValue){
                var sessionItems = sessionStorage.getItem("items") ? JSON.parse(sessionStorage.getItem("items")) : {};
                for (var customerId in sessionItems) {
                    if (sessionItems.hasOwnProperty(customerId)) {
                        var itemsArray = sessionItems[customerId];
                        itemsArray.forEach(function(itemObj) {
                            var item = itemObj.item;
                            var unitPrice = itemObj.unitPrice;
                            var increment = unitPrice * (percentageToIncrease / 100);
                            var newPrice = unitPrice + increment;
                            sublistData.push({ customer:customerId,item: item, unitPrice: unitPrice, increment: increment, newPrice: newPrice });
                        });
                    }
                }
                if (sublistData?.length == 0) {
                    alert("Please check items to update.");
                    return;
                }
                generateModal(sublistData,percentageToIncrease);
            }else{
                var loadingMessage = createLoadingMessage();
                var updatePriceButton = document.getElementById('custpage_update');
                updatePriceButton.style.display = "none";
                getAllPagesData(currRec).then(function (response) {
                    var allPagesData = JSON.parse(response.body); 
                    loadingMessage.style.display = "none";
                    for (var i = 0; i < allPagesData.length; i++) {
                        var customer = allPagesData[i].customer;
                        var increment = Number(allPagesData[i].unitPrice) * (percentageToIncrease / 100);
                        var newPrice = Number(allPagesData[i].unitPrice) + increment;
                        sublistData.push({ customer:customer,item: allPagesData[i].item, unitPrice: allPagesData[i].unitPrice, increment: increment, newPrice: newPrice });
                    }
                    if (sublistData?.length == 0) {
                        alert("Please check items to update.");
                        updatePriceButton.style.display = "block";
                        return;
                    }
                    updatePriceButton.style.display = "block";
                    generateModal(sublistData,percentageToIncrease);
                }).catch(function (error) {
                    loadingMessage.style.display = "none";
                    updatePriceButton.style.display = "block";
                });
            }
        } catch (error) {
            log.error("showPriceModal() error", error);
            document.getElementById('custpage_update').style.display = "block";
            document.getElementById("loadingMessage").style.display = "none";
        }
    }
    
    
    function getAllPagesData(currRec) {
        try {
            document.getElementById("loadingMessage").style.display = "block";
            var customerFilter = currRec.getValue({fieldId: FORMFIELDS.CUSTOMER});
            var vendorFilter = currRec.getValue({fieldId:FORMFIELDS.VENDOR});
            var commodityCodeFilter = currRec.getValue({fieldId:FORMFIELDS.COMMODITY_CODE});
            var item = currRec.getValue({fieldId:FORMFIELDS.ITEM})
            var suiteletUrl = url.resolveScript({
                deploymentId: getParameterFromURL('deploy'),  
                scriptId: getParameterFromURL('script'),      
                params: {
                    'custpage_customer': customerFilter,
                    'custpage_vendor': vendorFilter,
                    'custpage_commodity_code': commodityCodeFilter,
                    'custpage_check_all': true,
                    'custpage_item':item
                }
            });
            return https.post.promise({
                url: suiteletUrl
            });
        } catch (error) {   
            log.error("getAllPagesData error",error)
        }
    }
    function createLoadingMessage(){
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
            loadingMessage.innerHTML = 'Loading, please wait...';
            document.body.appendChild(loadingMessage);
            return loadingMessage;
        } catch (error) {
            log.error("createLoadingMessage error",error)
        }
    }
    function generateModal(sublistData,percentageToIncrease) {
        try {
            var msg = '<div style="width: 100%;" >';
            msg += '<table style="border-collapse: collapse; width: 100%;">';
            msg += '<tr>';
            msg += '<th style="border: 1px solid black; padding: 8px;">Item</th>';
            msg += '<th style="border: 1px solid black; padding: 8px;">Current Price</th>';
            msg += '<th style="border: 1px solid black; padding: 8px;">New Price</th>';
            msg += '</tr>';

            for (let i = 0; i < sublistData.length; i++) {
                msg += '<tr>';
                msg += '<td style="border: 1px solid black; padding: 8px;">' + sublistData[i].item + '</td>';
                msg += '<td style="border: 1px solid black; padding: 8px;">' + sublistData[i].unitPrice + '</td>';
                msg += '<td style="border: 1px solid black; padding: 8px;">' + sublistData[i].newPrice?.toFixed(2) + '</td>';
                msg += '</tr>';
            }

            msg += '</table>';
            msg += '<br/>';
            msg += '<div style="width: 100%; visibility:hidden; font-size: 18px; text-align:center" id="customer_updated_message"></div>';
            msg += '<div style="display: flex; justify-content: center; align-items: center;">';
            msg += '<br/>';
            msg += '<br/>';
            msg += '<button id="update_items_price_modal_btn">Update</button>';
            msg += '</div>';
            msg += '</div>';
            msg += '<br/>';
            msg += '<br/>';

            var popupConfig = {
                title: 'Update items price',
                msg: msg,
                width: '2000px',
                multiline: false,
            };
            var popupConfig = {
                title: 'Update items price',
                msg: msg,
                width: '2000px',
                multiline: false,
                listeners: {
                    close: function() {
                        var loadingMessage = document.getElementById('loadingMessage');
                        if(loadingMessage)loadingMessage.style.display = 'none';
                    }
                }
            };
            var modal = Ext.Msg.show(popupConfig);

            var updateItemsPriceBtn = document.getElementById('update_items_price_modal_btn');
            updateItemsPriceBtn.addEventListener("click",()=>{
                var message = document.getElementById('customer_updated_message')
                updateItemsPrices(sublistData,message,percentageToIncrease)
             })
        } catch (error) {
            log.error("generateModal error",error)
        }
    }

    function updateItemsPrices(sublistData,message,percentageToIncrease) {
        try {
            var loadingMessage = document.getElementById("loadingMessage");
            if(loadingMessage)loadingMessage.style.display = "none";
            var suiteletUrl = url.resolveScript({
                deploymentId: 'customdeploy_sut_item_pricing_cpl',  
                scriptId: 'customscript_sut_item_pricing_cpl',      
                params: {
                    'custpage_update_customers': true,
                    'custpage_increase_percentage':percentageToIncrease
                }
            });
            https.post({
                url: suiteletUrl,
                body: JSON.stringify(sublistData),
            });
            log.audit("Suitelet to update customers called ",sublistData )
            message.style.visibility='visible'
            message.style.color='black'
            message.innerHTML = 'CPL Prices Updated Successfully. Page Will Be Reloaded'
            setTimeout(() => {
                Ext.Msg.hide();
            }, 2500);
            setTimeout(() => {
                location.reload();
            }, 4000);
            
        } catch (error) {
            log.error("updateItemsPrices " , error)
        }
    }
    


    

    return {
        fieldChanged: fieldChanged,
        downloadCSV: downloadCSV,
        showPriceModal: showPriceModal,
        pageInit: pageInit
    }
});
