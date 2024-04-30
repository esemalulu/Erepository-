/**
* Copyright (c) 1998-2018 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved
*
* This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
* You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
* you entered into with NetSuite
*
* @NApiVersion 2.x
* @NScriptType Suitelet
* @NModuleScope public
*
* Description: Suitelet Script that uses a Customer/Item combination to lookup Contract and Rebate Agreement data
* to display on the page.
*
* Version       Date                 Author             Remarks
* 1.0           06/30/2023           Raju Ramaswamy     ACS Case 5162875
*/
define(['N/format', 'N/log', 'N/search', 'N/ui/serverWidget', 'N/runtime', 'N/url', 'SuiteScripts/IFD Gap Scripts/_NS_LIB_IFDPricing', 'SuiteScripts/IFD Gap Scripts/NSUtilvSS2'],

    function (format, log, search, ui, runtime, url,  library, NSUtil) {

        /**
        * Definition of the Suitelet script trigger point.
        *
        * @param {Object} context
        * @param {ServerRequest} context.request - Encapsulation of the incoming request
        * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
        */
        function onRequest(context) {
            var stSuiteletTitle = 'Contract Pricing Enquiry With Comparison';

            if (context.request.method === 'GET') {
                var stLogTitle = 'ns_sl_contract_price_enquiry > GET';
                log.debug({
                    title: stLogTitle,
                    details: 'Creating Form'
                });

                // Create Form and User Input Objects
                var obForm = ui.createForm({ title: stSuiteletTitle });
                createUserInputObjects(obForm);

                context.response.writePage(obForm);
            } else {
                var stLogTitle = 'ns_sl_contract_price_enquiry > POST';
                var request = context.request;
                var stCustomerId = request.parameters.custpage_customer;
                var stItemId1 = request.parameters.custpage_item_1;
                var stItemId2 = request.parameters.custpage_item_2;
                var stItemId3 = request.parameters.custpage_item_3;
                var stItemId4 = request.parameters.custpage_item_4;

                // Create form and User Input Fields
                var obForm = ui.createForm({ title: stSuiteletTitle });
                createUserInputObjects(obForm, stCustomerId, stItemId1, stItemId2, stItemId3, stItemId4);

                log.debug({
                    title: stLogTitle,
                    details: 'Parameters: ' + JSON.stringify({
                        custpage_customer: stCustomerId,
                        custpage_item: stItemId1
                    })
                });

                var objPriceEnquiry1 = library.getPriceEnquiry(stCustomerId, stItemId1);
                var objPriceEnquiry2 = null;
                var objPriceEnquiry3 = null;
                var objPriceEnquiry4 = null;
                if (stItemId2)
                    objPriceEnquiry2 = library.getPriceEnquiry(stCustomerId, stItemId2);
                if (stItemId3)
                    objPriceEnquiry3 = library.getPriceEnquiry(stCustomerId, stItemId3);
                if (stItemId4)
                    objPriceEnquiry4 = library.getPriceEnquiry(stCustomerId, stItemId4);

                log.debug({
                    title: stLogTitle,
                    details: JSON.stringify(objPriceEnquiry1)
                });

                obForm.addFieldGroup({
                    id: 'custpage_results_fg',
                    label: 'Results'
                });

                // If error is returned then create/set the Error Field
                if (!NSUtil.isEmpty(objPriceEnquiry1.error)) {
                    var obErrorFld = obForm.addField({
                        id: 'custpage_error',
                        label: 'Error',
                        type: ui.FieldType.TEXT,
                        container: 'custpage_results_fg'
                    });
                    obErrorFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    obErrorFld.defaultValue = objPriceEnquiry1.error;
                }
                else if (!NSUtil.isEmpty(objPriceEnquiry2) && !NSUtil.isEmpty(objPriceEnquiry2.error)) {
                    var obErrorFld = obForm.addField({
                        id: 'custpage_error',
                        label: 'Error',
                        type: ui.FieldType.TEXT,
                        container: 'custpage_results_fg'
                    });
                    obErrorFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    obErrorFld.defaultValue = objPriceEnquiry2.error;
                }
                else if (!NSUtil.isEmpty(objPriceEnquiry3) && !NSUtil.isEmpty(objPriceEnquiry3.error)) {
                    var obErrorFld = obForm.addField({
                        id: 'custpage_error',
                        label: 'Error',
                        type: ui.FieldType.TEXT,
                        container: 'custpage_results_fg'
                    });
                    obErrorFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    obErrorFld.defaultValue = objPriceEnquiry3.error;
                }
                else if (!NSUtil.isEmpty(objPriceEnquiry4) && !NSUtil.isEmpty(objPriceEnquiry4.error)) {
                    var obErrorFld = obForm.addField({
                        id: 'custpage_error',
                        label: 'Error',
                        type: ui.FieldType.TEXT,
                        container: 'custpage_results_fg'
                    });
                    obErrorFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    obErrorFld.defaultValue = objPriceEnquiry4.error;
                }

                // If no error is returned then create/set the result fields
                else {
                    createResultObjects(obForm, objPriceEnquiry1, objPriceEnquiry2, objPriceEnquiry3, objPriceEnquiry4, stItemId1, stItemId2, stItemId3, stItemId4);
                }
                context.response.writePage(obForm);
            }
        }

        function createUserInputObjects(obForm, stCustomerId, stItemId1, stItemId2, stItemId3, stItemId4) {
            var stLogTitle = 'createUserInputObjects';

            try {
                obForm.addFieldGroup({
                    id: 'custpage_main_fld_grp',
                    label: 'User Input'
                });
                obForm.addSubmitButton({ label: 'Submit' });

                var obCustomerFld = obForm.addField({
                    id: 'custpage_customer',
                    label: 'Customer',
                    type: ui.FieldType.SELECT,
                    source: 'customer',
                    container: 'custpage_main_fld_grp'
                });
                obCustomerFld.isMandatory = true;

                var obItemFld1 = obForm.addField({
                    id: 'custpage_item_1',
                    label: 'First Item',
                    type: ui.FieldType.SELECT,
                    source: 'item',
                    container: 'custpage_main_fld_grp'
                });
                obItemFld1.isMandatory = true;

                var obItemFld2 = obForm.addField({
                    id: 'custpage_item_2',
                    label: 'Second Item',
                    type: ui.FieldType.SELECT,
                    source: 'item',
                    container: 'custpage_main_fld_grp'
                });

                var obItemFld3 = obForm.addField({
                    id: 'custpage_item_3',
                    label: 'Third Item',
                    type: ui.FieldType.SELECT,
                    source: 'item',
                    container: 'custpage_main_fld_grp'
                });

                var obItemFld4 = obForm.addField({
                    id: 'custpage_item_4',
                    label: 'Fourth Item',
                    type: ui.FieldType.SELECT,
                    source: 'item',
                    container: 'custpage_main_fld_grp'
                });

                if (!NSUtil.isEmpty(stCustomerId)) {
                    obCustomerFld.defaultValue = stCustomerId;
                }
                if (!NSUtil.isEmpty(stItemId1)) {
                    obItemFld1.defaultValue = stItemId1;
                }
                if (!NSUtil.isEmpty(stItemId2)) {
                    obItemFld2.defaultValue = stItemId2;
                }
                if (!NSUtil.isEmpty(stItemId3)) {
                    obItemFld3.defaultValue = stItemId3;
                }
                if (!NSUtil.isEmpty(stItemId4)) {
                    obItemFld4.defaultValue = stItemId4;
                }
            } catch (error) {
                log.error({
                    title: stLogTitle + ': ERROR',
                    details: error.toString()
                });
                throw error.toString();
            }
        }

        function createResultObjects(obForm, objPriceEnquiry1, objPriceEnquiry2, objPriceEnquiry3, objPriceEnquiry4, stItemId1, stItemId2, stItemId3, stItemId4) {
            var stLogTitle = 'createResultObjects';
            var invoiceSrchId = runtime.getCurrentScript().getParameter({ name: 'custscript_acs_saved_search' });

            try {
                var obHTMLTableFld = obForm.addField({
                    id: 'custpage_sp_html_table',
                    label: 'Compare Results',
                    type: ui.FieldType.INLINEHTML,
                    container: 'custpage_results_fg'
                });
                obHTMLTableFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });

                var has2ndItem = (stItemId2  == '' || stItemId2  == null || stItemId2  == undefined) ? 'F' : 'T';
                var has3rdItem = (stItemId3  == '' || stItemId3  == null || stItemId3  == undefined) ? 'F' : 'T';
                var has4thItem = (stItemId4  == '' || stItemId4  == null || stItemId4  == undefined) ? 'F' : 'T';

                var itemName1 = '';
                var itemName2 = '';
                var itemName3 = '';
                var itemName4 = '';

                var catchWeight1 = 'No';
                var catchWeight2 = 'No';
                var catchWeight3 = 'No';
                var catchWeight4 = 'No';

                var avgShippedThisYearItem1 = null;
                var avgShippedThisYearItem2 = null;
                var avgShippedThisYearItem3 = null;
                var avgShippedThisYearItem4 = null;

                var shippedThisYearItem1 = null;
                var shippedThisYearItem2 = null;
                var shippedThisYearItem3 = null;
                var shippedThisYearItem4 = null;

                var shippedLast8WeeksItem1 = null;
                var shippedLast8WeeksItem2 = null;
                var shippedLast8WeeksItem3 = null;
                var shippedLast8WeeksItem4 = null;

                var shippedLast4WeeksItem1 = null;
                var shippedLast4WeeksItem2 = null;
                var shippedLast4WeeksItem3 = null;
                var shippedLast4WeeksItem4 = null;

                var thisYear = new Date().getFullYear();

                var yearStartDate = new Date('1' + '/' + '1' +   '/' +  thisYear);

                var today = new Date();
                today = format.format({value: today, type: format.Type.DATE});

                var businessDaysThisYear = calculateBusinessDays(yearStartDate, new Date());

                log.debug('Checking', 'businessDaysThisYear ' + businessDaysThisYear);

                var todayMinus8Weeks = new Date();
                todayMinus8Weeks.setDate(todayMinus8Weeks.getDate() - 56);
                todayMinus8Weeks = format.format({value: todayMinus8Weeks, type: format.Type.DATE});

                var todayMinus4Weeks = new Date();
                todayMinus4Weeks.setDate(todayMinus4Weeks.getDate() - 28);
                todayMinus4Weeks = format.format({value: todayMinus4Weeks, type: format.Type.DATE});

                shippedThisYearItem1 = getItemShipped(invoiceSrchId, stItemId1, null, null);
                shippedLast8WeeksItem1 = getItemShipped(invoiceSrchId, stItemId1, todayMinus8Weeks, today);
                shippedLast4WeeksItem1 = getItemShipped(invoiceSrchId, stItemId1, todayMinus4Weeks, today);

                if (stItemId2) {
                    shippedThisYearItem2 = getItemShipped(invoiceSrchId, stItemId2, null, null);
                    shippedLast8WeeksItem2 = getItemShipped(invoiceSrchId, stItemId2, todayMinus8Weeks, today);
                    shippedLast4WeeksItem2 = getItemShipped(invoiceSrchId, stItemId2, todayMinus4Weeks, today);
                }

                if (stItemId3) {
                    shippedThisYearItem3 = getItemShipped(invoiceSrchId, stItemId3, null, null);
                    shippedLast8WeeksItem3 = getItemShipped(invoiceSrchId, stItemId3, todayMinus8Weeks, today);
                    shippedLast4WeeksItem3 = getItemShipped(invoiceSrchId, stItemId3, todayMinus4Weeks, today);
                }

                if (stItemId4) {
                    shippedThisYearItem4 = getItemShipped(invoiceSrchId, stItemId4, null, null);
                    shippedLast8WeeksItem4 = getItemShipped(invoiceSrchId, stItemId4, todayMinus8Weeks, today);
                    shippedLast4WeeksItem4 = getItemShipped(invoiceSrchId, stItemId4, todayMinus4Weeks, today);
                }

                if (shippedThisYearItem1) {
                    avgShippedThisYearItem1 = NSUtil.roundDecimalAmount((shippedThisYearItem1/businessDaysThisYear),2);
                }
                if (shippedThisYearItem2) {
                    avgShippedThisYearItem2 = NSUtil.roundDecimalAmount((shippedThisYearItem2/businessDaysThisYear), 2);
                }
                if (shippedThisYearItem3) {
                    avgShippedThisYearItem3 = NSUtil.roundDecimalAmount((shippedThisYearItem3/businessDaysThisYear), 2);
                }
                if (shippedThisYearItem4) {
                    avgShippedThisYearItem4 = NSUtil.roundDecimalAmount((shippedThisYearItem4/businessDaysThisYear), 2);
                }


                var scheme = 'https://';
                var host = url.resolveDomain({
                    hostType: url.HostType.APPLICATION
                });

                var srchObj = search.lookupFields({type: 'item', id: stItemId1, columns: ['itemid', 'displayname']});
                itemName1 = srchObj.itemid + ' ' + srchObj.displayname;

                if (stItemId2) {
                    var srchObj = search.lookupFields({type: 'item', id: stItemId2, columns: ['itemid', 'displayname']});
                    itemName2 = srchObj.itemid + ' ' + srchObj.displayname;;
                }

                if (stItemId3) {
                    var srchObj = search.lookupFields({type: 'item', id: stItemId3, columns: ['itemid', 'displayname']});
                    itemName3 = srchObj.itemid + ' ' + srchObj.displayname;;
                }

                if (stItemId4) {
                    var srchObj = search.lookupFields({type: 'item', id: stItemId4, columns: ['itemid', 'displayname']});
                    itemName4 = srchObj.itemid + ' ' + srchObj.displayname;;
                }

                if (objPriceEnquiry1.catchweight)
                    catchWeight1 = 'Yes';

                if (!NSUtil.isEmpty(objPriceEnquiry3)) {
                    if (objPriceEnquiry2.catchweight)
                        catchWeight2 = 'Yes';
                }

                if (!NSUtil.isEmpty(objPriceEnquiry3)) {
                    if (objPriceEnquiry3.catchweight)
                        catchWeight3 = 'Yes';
                }

                if (!NSUtil.isEmpty(objPriceEnquiry4)) {
                    if (objPriceEnquiry4.catchweight)
                        catchWeight4 = 'Yes';
                }

                var htmlTable = '';
                htmlTable = '<div style= "padding:20px">';
                htmlTable += '<table style= "position: absolute; top:340px;bottom: 0;left: 0;right: 0;" border="1" width="100%" page-break-inside="auto">';
                htmlTable += '<thead>';
                htmlTable += '<tr>';
                htmlTable += '<td></td>';
                htmlTable += '<td style = "white-space:nowrap;" border="1"><b><p style = "word-wrap:normal; xwidth:20%; font-size:18px; color:blue; font-family:verdana;">' + itemName1 + '</p></b></td>';
                if (!NSUtil.isEmpty(objPriceEnquiry2)) {
                    htmlTable += '<td style = "white-space:nowrap;" border="1"><b><p style = "word-wrap:normal; xwidth:20%; font-size:18px; color:blue; font-family:verdana;">' + itemName2 + '</p></b></td>';
                }
                if (!NSUtil.isEmpty(objPriceEnquiry3)) {
                    htmlTable += '<td style = "white-space:nowrap;"  border="1"><b><p style = "word-wrap:normal; xwidth:20%; font-size:18px; color:blue; font-family:verdana;">' + itemName3 + '</p></b></td>';
                }
                if (!NSUtil.isEmpty(objPriceEnquiry4)) {
                    htmlTable += '<td style = "white-space:nowrap;"  border="1"><b><p style = "word-wrap:normal; xwidth:20%; font-size:18px; color:blue; font-family:verdana;">' + itemName4 + '</p></b></td>';
                }
                htmlTable += '</tr>';
                htmlTable += '</thead>';
                htmlTable += '<tbody>';

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Description', objPriceEnquiry1.description,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.description,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.description,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.description);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'UPC Code', objPriceEnquiry1.upccode,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.upccode,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.upccode,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.upccode);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'MPN', objPriceEnquiry1.mpn,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.mpn,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.mpn,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.mpn);

/*
                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Category/Sub Category', objPriceEnquiry1.category,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.category,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.category,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.category);
*/
                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Pack Size', objPriceEnquiry1.packsize,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.packsize,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.packsize,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.packsize);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Units Per Pack', objPriceEnquiry1.unitsPerPack,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.unitsPerPack,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.unitsPerPack,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.unitsPerPack);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Portion Size', objPriceEnquiry1.portionSize,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.portionSize,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.portionSize,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.portionSize);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Portion Type', objPriceEnquiry1.portionType,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.portionType,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.portionType,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.portportionTypeionSize);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Serving Size (Units)', objPriceEnquiry1.servSizeUnits,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.servSizeUnits,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.servSizeUnits,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.servSizeUnits);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Serving UOM', objPriceEnquiry1.servingUOM,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.servingUOM,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.servingUOM,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.servingUOM);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Prepared Yield', objPriceEnquiry1.preparedYield,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.preparedYield,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.preparedYield,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.preparedYield);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Buyer', objPriceEnquiry1.buyer,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.buyer,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.buyer,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.buyer);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Brand', objPriceEnquiry1.brand,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.brand,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.brand,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.brand);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Manufacturer', objPriceEnquiry1.manufacturer,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.manufacturer,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.manufacturer,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.manufacturer);

                //htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Fixed Landed Cost - Weekly', objPriceEnquiry1.landedweek,
                    //(objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.landedweek,
                    //(objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.landedweek,
                    //(objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.landedweek);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Market Cost', objPriceEnquiry1.marketCost,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.marketCost,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.marketCost,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.marketCost);
                
                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Customer Sale Price', objPriceEnquiry1.sellprice,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.sellprice,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.sellprice,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.sellprice);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Manufacturer Shelf Life', objPriceEnquiry1.mfrShelfLife,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.mfrShelfLife,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.mfrShelfLife,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.mfrShelfLife);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'IFD Suggested Sub', objPriceEnquiry1.suggestedSubItemURL,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.suggestedSubItemURL,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.suggestedSubItemURL,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.suggestedSubItemURL);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'IFD Additional Suggested Sub', objPriceEnquiry1.addntlSuggestedSubItemURLs,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.addntlSuggestedSubItemURLs,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.addntlSuggestedSubItemURLs,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.addntlSuggestedSubItemURLs);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Item Image', objPriceEnquiry1.itemImageURL,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.itemImageURL,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.itemImageURL,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.itemImageURL);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Item Attributes', objPriceEnquiry1.itemAttributes,
                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.itemAttributes,
                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.itemAttributes,
                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.itemAttributes);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Shipped This Year', shippedThisYearItem1,
                    shippedThisYearItem2, shippedThisYearItem3, shippedThisYearItem4);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Shipped Last 8 Weeks', shippedLast8WeeksItem1,
                    shippedLast8WeeksItem2, shippedLast8WeeksItem3, shippedLast8WeeksItem4);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Shipped Last 4 Weeks', shippedLast4WeeksItem1,
                    shippedLast4WeeksItem2, shippedLast4WeeksItem3, shippedLast4WeeksItem4);

                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Avg. Daily Usage This Year (Shipped)', avgShippedThisYearItem1,
                    avgShippedThisYearItem2, avgShippedThisYearItem3, avgShippedThisYearItem4);

                /*
                                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Last Cost for Pricing', objPriceEnquiry1.lastCostForPricing,
                                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.lastCostForPricing,
                                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.lastCostForPricing,
                                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.lastCostForPricing);


                                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Preferred Vendor', objPriceEnquiry1.preferredvendor,
                                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.preferredvendor,
                                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.preferredvendor,
                                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.preferredvendor);

                                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Catch Weight Item', catchWeight1, catchWeight2, catchWeight3, catchWeight4);

                                //htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Fixed Landed Cost - Monthly', objPriceEnquiry1.landedmonth,
                                    //(objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.landedmonth,
                                    //(objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.landedmonth,
                                    //(objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.landedmonth);

                                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Contract', objPriceEnquiry1.contract,
                                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.contract,
                                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.contract,
                                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.contract);

                                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Cost Type Refresh Interval', objPriceEnquiry1.costrefresh,
                                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.costrefresh,
                                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.costrefresh,
                                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.costrefresh);

                                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Contract Markup $', objPriceEnquiry1.markupdollar,
                                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.markupdollar,
                                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.markupdollar,
                                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.markupdollar);

                                htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Contract Markup %', objPriceEnquiry1.markuppercent,
                                    (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.markuppercent,
                                    (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.markuppercent,
                                    (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.markuppercent);

                                //htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Fixed Price %', objPriceEnquiry1.fixedprice,
                                    //(objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.fixedprice,
                                    //(objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.fixedprice,
                                    //(objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.fixedprice);


                                var stRestrictedRoles = runtime.getCurrentScript().getParameter({ name: 'custscript_acs_priceenq_restricted_roles' });
                                var arrRestrictedRoles = stRestrictedRoles.split(',');
                                var currentRole = runtime.getCurrentUser().role + '';
                                log.debug(stLogTitle + '. ' + currentRole, arrRestrictedRoles);
                                log.debug(stLogTitle + '. ', arrRestrictedRoles.indexOf(currentRole));

                                if (arrRestrictedRoles.indexOf(currentRole) > -1) {
                                    htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Rebate Agreement/Details', objPriceEnquiry1.rebateagreement,
                                        (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.rebateagreement,
                                        (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.rebateagreement,
                                        (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.rebateagreement);

                                    htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Rebate Agreement Detail #', objPriceEnquiry1.rebatedetail,
                                        (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.rebatedetail,
                                        (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.rebatedetail,
                                        (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.rebatedetail);

                                    htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Rebate %', objPriceEnquiry1.rebatepercent,
                                        (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.rebatepercent,
                                        (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.rebatepercent,
                                        (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.rebatepercent);

                                    htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Rebate Amount', objPriceEnquiry1.rebateamount,
                                        (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.rebateamount,
                                        (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.rebateamount,
                                        (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.rebateamount);

                                    htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Guaranteed Amount', objPriceEnquiry1.guaranteed,
                                        (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.guaranteed,
                                        (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.guaranteed,
                                        (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.guaranteed);

                                    htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Delivered Guaranteed Amount', objPriceEnquiry1.deliveredguaranteed,
                                        (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.deliveredguaranteed,
                                        (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.deliveredguaranteed,
                                        (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.deliveredguaranteed);

                                    htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Admin Fee $', objPriceEnquiry1.admindollar,
                                        (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.admindollar,
                                        (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.admindollar,
                                        (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.admindollar);

                                    htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Admin Fee %', objPriceEnquiry1.adminpercent,
                                        (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.adminpercent,
                                        (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.adminpercent,
                                        (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.adminpercent);

                                    htmlTable += addRowHTML(has2ndItem, has3rdItem, has4thItem,'Total Admin Fees', objPriceEnquiry1.totaladmin,
                                        (objPriceEnquiry2  == null || objPriceEnquiry2  == undefined) ? '' : objPriceEnquiry2.totaladmin,
                                        (objPriceEnquiry3  == null || objPriceEnquiry3  == undefined) ? '' : objPriceEnquiry3.totaladmin,
                                        (objPriceEnquiry4  == null || objPriceEnquiry4  == undefined) ? '' : objPriceEnquiry4.totaladmin);
                                }
                */
                htmlTable += '</tbody>';
                htmlTable += '</table>';
                htmlTable += '</div>';


                htmlTable = htmlTable.replace(/&/g,'&amp;');

                obHTMLTableFld.defaultValue = htmlTable




            } catch (error) {
                log.error({
                    title: stLogTitle + ': ERROR',
                    details: error.toString()
                });
                throw error.toString();
            }
        }

        function getItemShipped(invoiceSrchId, itemId, fromDate, toDate) {
            var filters = new Array() ;
            var retVal = null;
            filters.push(search.createFilter({name: 'item', operator: 'ANYOF', values: itemId})) ;
            if (fromDate != null && toDate != null)
                filters.push(search.createFilter({name: 'trandate', operator: 'within', values: [fromDate, toDate]}));

            var srchList = NSUtil.search(null, invoiceSrchId, filters);

            if (srchList != null && srchList != '' && srchList.length > 0) {
                retVal = srchList[0].getValue({name: 'quantity', summary: 'SUM'});
            }
            return retVal;
        }

        function addRowHTML(has2ndItem, has3rdItem, has4thItem, itemAttribute, value1, value2, value3, value4) {

            if (NSUtil.isEmpty(value1))
                value1 = '';

            if (NSUtil.isEmpty(value2))
                value2 = '';

            if (NSUtil.isEmpty(value3))
                value3 = '';

            if (NSUtil.isEmpty(value4))
                value4 = '';

            var rowHtml = '<tr>';
            rowHtml += '<td style="font-size:14px;"><b>' + itemAttribute + '</b></td>';
            if (itemAttribute == 'Customer Sale Price') {
                rowHtml += '<td style="font-size:18px;  font-family:Verdana;"><b>' + value1 + '</b></td>';
                if (has2ndItem == 'T')
                    rowHtml += '<td style="font-size:18px; font-family:Verdana;"><b>' + value2 + '</b></td>';
                if (has3rdItem == 'T')
                    rowHtml += '<td style="font-size:18px; font-family:Verdana;"><b>' + value3 + '</b></td>';
                if (has4thItem == 'T')
                    rowHtml += '<td style="font-size:18px; font-family:Verdana;"><b>' + value4 + '</b></td>';
            }
            else {
                rowHtml += '<td style="font-size:15px; font-family:Verdana;">' + value1 + '</td>';
                if (has2ndItem == 'T')
                    rowHtml += '<td style="font-size:15px; font-family:Verdana;">' + value2 + '</td>';
                if (has3rdItem == 'T')
                    rowHtml += '<td style="font-size:15px; font-family:Verdana;">' + value3 + '</td>';
                if (has4thItem == 'T')
                    rowHtml += '<td style="font-size:15px; font-family:Verdana;">' + value4 + '</td>';
            }
            rowHtml += '</tr>';
            return rowHtml;
        }

        function calculateBusinessDays(startDate, endDate){
            // Validate input
            if (endDate < startDate)
                return 0;

            // Calculate days between dates
            var millisecondsPerDay = 86400 * 1000; // Day in milliseconds
            startDate.setHours(0,0,0,1);  // Start just after midnight
            endDate.setHours(23,59,59,999);  // End just before midnight
            var diff = endDate - startDate;  // Milliseconds between datetime objects
            var days = Math.ceil(diff / millisecondsPerDay);

            // Subtract two weekend days for every week in between
            var weeks = Math.floor(days / 7);
            days = days - (weeks * 2);

            // Handle special cases
            var startDay = startDate.getDay();
            var endDay = endDate.getDay();

            // Remove weekend not previously removed.
            if (startDay - endDay > 1)
                days = days - 2;

            // Remove start day if span starts on Sunday but ends before Saturday
            if (startDay == 0 && endDay != 6) {
                days = days - 1;
            }

            // Remove end day if span ends on Saturday but starts after Sunday
            if (endDay == 6 && startDay != 0) {
                days = days - 1;
            }

            return days;
        }


        return {
            onRequest: onRequest
        };
    }
);
