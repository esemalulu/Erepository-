/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Apr 2016     lochengco
 * 1.1        20 May 2016     lochengco        Additional Columns (Pack Size, Brand, Manufacturer Code), Added Current Price based on customer's price level
 * 1.2        08 Aug 2016     lochengco        Set to zero when price level has no amount - getItemPricingListValue() 
 *
 */

var OBJ_ITEMS_PRICE_LEVELS = {};
var OBJ_GROUP_PRICING = {};

/**
 * @param {nlobjRequest} objRequest Request object
 * @param {nlobjResponse} objResponse Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet_controlOrderGuideWindow(objRequest, objResponse)
{
    try
    {
        var stLoggerTitle = 'suitelet_controlOrderGuideWindow';
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Entry<<');
        
        var objContext = nlapiGetContext();
        var objParameters = {};
            objParameters['parameter_customer_id'] = objRequest.getParameter('custpage_customer_id');
            objParameters['parameter_location_id'] = objRequest.getParameter('custpage_location_id');
            objParameters['parameter_action'] = objRequest.getParameter('custpage_action');
            objParameters['parameter_customer_order_guide'] = objRequest.getParameter('custpage_customer_order_guides');
            objParameters['parameter_price_level_base'] = objContext.getSetting('SCRIPT', 'custscript_price_level_base');
        
        nlapiLogExecution('DEBUG', stLoggerTitle, ' === URL PARAMETER(S) === ' 
                + ' | URL: Customer ID = ' + objParameters['parameter_customer_id']
                + ' | URL: Location ID = ' + objParameters['parameter_location_id']
                + ' | POST VALUE: Action = ' + objParameters['parameter_action']
                + ' | POST VALUE: Customer Order Guide ID = ' + objParameters['parameter_customer_order_guide']
                + ' | Price Level: Base Price ID = ' + objParameters['parameter_price_level_base']
        );
        
        if (Eval.isEmpty(objParameters['parameter_price_level_base']))
        {
            throw nlapiCreateError('99999', 'Please enter value for all script parameters.');
        }
        
        checkGovernance();
        
        switch(objParameters['parameter_action'])
        {
            case 'process':
                processSelectedOrderGuideItems(objRequest, objResponse, objParameters);
            break;
            case 'search':
                renderOrderGuidePage(objResponse, objParameters);
                break;
            case 'cancel':
                cancelItemReplacements(objResponse);
                break;
            default:
                renderOrderGuidePage(objResponse, objParameters);
        }
        
        checkGovernance();
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Exit<<');
    }
    catch (error)
    {
        if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
}

function processSelectedOrderGuideItems(objRequest, objResponse, objParameters)
{
    var stLoggerTitle = 'processSelectedOrderGuideItems';
    
    nlapiLogExecution('DEBUG', stLoggerTitle, '[START] - Processing Order Guide Items...');
    
    var intOrderGuideItemCount = objRequest.getLineItemCount('custpage_items_sublist');
    
    var bHasSelectedItem = false;
    
    // Get the values submit by the user
    var stHtml = '';
        stHtml += '<script language="JavaScript">';
        stHtml +=       'if (window.opener)';
        stHtml +=       '{';
                            // Adding Replacement Items - (Selected Items submitted by the user in Suitelet)
                            for (var i = 1; i <= intOrderGuideItemCount; i++)
                            {
                                var objOrderGuideItem = {}; 
                                    objOrderGuideItem['item_id'] = objRequest.getLineItemValue('custpage_items_sublist', 'custpage_subcol_item_id', i);
                                    objOrderGuideItem['item_text'] = objRequest.getLineItemValue('custpage_items_sublist', 'custpage_subcol_item_text', i);
                                    objOrderGuideItem['current_sale_price'] = objRequest.getLineItemValue('custpage_items_sublist', 'custpage_subcol_current_sale_price', i);
                                    objOrderGuideItem['current_sale_price'] = Parse.forceFloat(objOrderGuideItem['current_sale_price']);
                                    objOrderGuideItem['qty_to_order'] = objRequest.getLineItemValue('custpage_items_sublist', 'custpage_subcol_qty_to_ord', i);
                                    objOrderGuideItem['qty_to_order'] = Parse.forceInt(objOrderGuideItem['qty_to_order']);
                                    
                                nlapiLogExecution('DEBUG', stLoggerTitle, '-- Order Guide Item --'
                                        + ' | Item ID = ' + objOrderGuideItem['item_id']
                                        + ' | Item Name = ' + objOrderGuideItem['item_text']
                                        + ' | Quantity to Order = ' + objOrderGuideItem['qty_to_order']
                                        + ' | Current Sale Price = ' + objOrderGuideItem['current_sale_price']
                                        );
                                    
                                // Skip unselected items
                                if (objOrderGuideItem['qty_to_order'] == 0)
                                {
                                    continue;
                                }
                                
        stHtml +=               'window.opener.nlapiSelectNewLineItem("item");';
        stHtml +=               'window.opener.nlapiSetCurrentLineItemValue("item", "item", "' + objOrderGuideItem['item_id'] + '", true, true);';
        stHtml +=               'window.opener.nlapiSetCurrentLineItemValue("item", "quantity", "' + objOrderGuideItem['qty_to_order'] + '", true, true);';
        
    if (objOrderGuideItem['current_sale_price'] == 0)
    {
        stHtml +=               'window.opener.nlapiSetCurrentLineItemValue("item", "price", "-1", true, true);';
        stHtml +=               'window.opener.nlapiSetCurrentLineItemValue("item", "rate", "' + objOrderGuideItem['current_sale_price'] + '", true, true);';
    }
        
        stHtml +=               'window.opener.nlapiCommitLineItem("item");';
                             }
        stHtml +=       '}';
        stHtml +=       'window.close();';
        stHtml += '</script>';

    objResponse.write(stHtml);
    
    nlapiLogExecution('DEBUG', stLoggerTitle, '[END] - Processing Order Guide Items...');
}

/**
 * This function displays a list of order guides and its item(s)
 * 
 * @param objResponse
 * @returns {Void}
 */
function renderOrderGuidePage(objResponse, objParameters)
{
    var stLoggerTitle = 'renderOrderGuidePage';
    
    nlapiLogExecution('DEBUG', stLoggerTitle, '[START] - Rendering Order Guide Page...');

    var arrOrderGuideResult = getOrderGuidesByCustomer(objParameters['parameter_customer_id']); // 10 units
    checkGovernance(); 
    var recCustomer = nlapiLoadRecord('customer', objParameters['parameter_customer_id']); // 5 units
    checkGovernance(); 

    // Initialization of Customer Item and Group price levels
    initCustomerPriceLevels(recCustomer);
    
    // Create a form
    var objForm = nlapiCreateForm('Order Guide', true);
        // Submit Button
        objForm.addSubmitButton('Submit');
        // Cancel button
        objForm.addButton('custombuttom_cancel', 'Cancel', "cancel_orderGuide()");
        // Order Guide drop-down list
    var objCustomerOrderGuide = objForm.addField('custpage_customer_order_guides', 'select', 'Customer Order Guide');
        objCustomerOrderGuide.addSelectOption('', '');
        
    for (var intOrderGuideCount = 0; intOrderGuideCount < arrOrderGuideResult.length; intOrderGuideCount++)
    {
        var stOrderGuideID = arrOrderGuideResult[intOrderGuideCount].getId();
        var stOrderGuideText = arrOrderGuideResult[intOrderGuideCount].getValue('name');
        var stIsPrimary = arrOrderGuideResult[intOrderGuideCount].getValue('custrecord_ifd_orderguide_header_primary');
        var bIsSelected = false;
        
        if (objParameters['parameter_customer_order_guide'] ==  stOrderGuideID)
        {
            bIsSelected = true;
        }
        
        if (stIsPrimary == 'T')
        {
            objCustomerOrderGuide.addSelectOption(stOrderGuideID, stOrderGuideText + ' - (Primary)', bIsSelected);
        }
        else
        {
            objCustomerOrderGuide.addSelectOption(stOrderGuideID, stOrderGuideText, bIsSelected);
        }
    }
    
    // Action
    var objActionField = objForm.addField('custpage_action', 'text', 'Action');
        objActionField.setDefaultValue('process');
        objActionField.setDisplayType('hidden');
    // Customer ID
    var objCustomerField = objForm.addField('custpage_customer_id', 'text', 'Customer ID');
        objCustomerField.setDefaultValue(objParameters['parameter_customer_id']);
        objCustomerField.setDisplayType('hidden');
    // Location ID
    var objLocationField = objForm.addField('custpage_location_id', 'text', 'Location ID');
        objLocationField.setDefaultValue(objParameters['parameter_location_id']);
        objLocationField.setDisplayType('hidden');
        
    // Sublist
    var objItemSublist = objForm.addSubList('custpage_items_sublist', 'list', 'Order Guide Items');
        objItemSublist.addField('custpage_subcol_item_id', 'text', 'Item ID').setDisplayType('hidden'); // Hidden
        objItemSublist.addField('custpage_subcol_item_text', 'text', 'Item');
        objItemSublist.addField('custpage_subcol_item_desc', 'textarea', 'Sales Description');
        objItemSublist.addField('custpage_subcol_last_sale_date', 'text', 'Last Sale Date');
        objItemSublist.addField('custpage_subcol_last_sale_price', 'text', 'Last Sale Price');
        objItemSublist.addField('custpage_subcol_current_sale_price', 'text', 'Current Sale Price');
        objItemSublist.addField('custpage_subcol_last_ord_qty', 'text', 'Last Order Quantity');
        objItemSublist.addField('custpage_subcol_qty_available', 'text', 'Quantity Available');
        // Additional Column Fields - v1.1
        objItemSublist.addField('custpage_subcol_pack_size', 'text', 'Pack Size');
        objItemSublist.addField('custpage_subcol_brand', 'text', 'Brand');
        objItemSublist.addField('custpage_subcol_manufacturer', 'text', 'Manufacturer');
        
        objItemSublist.addField('custpage_subcol_qty_to_ord', 'integer', 'Quantity to Order').setDisplayType('entry');
        
    if (!Eval.isEmpty(objParameters['parameter_customer_order_guide']))
    {
        var arrOrderGuideItems = getOrderGuideItemsByOrderGuide(objParameters['parameter_customer_order_guide']); // 10 Units
        var arrItemIDs = [];
        
        checkGovernance();
        
        // Looping Order Guide Items (Collecting all item IDS)
        for (var intOrderGuideItemCount = 0; intOrderGuideItemCount < arrOrderGuideItems.length; intOrderGuideItemCount++)
        {
            var stItemID = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_item');
            
            arrItemIDs.push(stItemID);
        }
        
        var objNumAvailItemLocation = {};
        var arrNumAvailableItemLoction = getItemQtyAvailable(arrItemIDs, objParameters['parameter_location_id']); // 10 Units
        
        checkGovernance();
        
        // Looping the number of available items in the header's location 
        for (var intNumAvailItemCount = 0; intNumAvailItemCount < arrNumAvailableItemLoction.length; intNumAvailItemCount++)
        {
            var stItemID = arrNumAvailableItemLoction[intNumAvailItemCount].getId();
            objNumAvailItemLocation[stItemID] = arrNumAvailableItemLoction[intNumAvailItemCount].getValue('locationquantityonhand');
        }
        
        // Looping Order Guide Items (Display of Order Guide Item list in Suitelet)
        for (var intOrderGuideItemCount = 0; intOrderGuideItemCount < arrOrderGuideItems.length; intOrderGuideItemCount++)
        {
            var intRowCounter = intOrderGuideItemCount + 1;
            
            var objOrderGuideItem = {};
                objOrderGuideItem['item_id'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_item');
                objOrderGuideItem['item_text'] = arrOrderGuideItems[intOrderGuideItemCount].getText('custrecord_ifd_orderguide_line_item');
                objOrderGuideItem['quantity'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_qty');
                objOrderGuideItem['item_desc'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_itemdesc');
                objOrderGuideItem['physical_uom'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_puom');
                objOrderGuideItem['pricing_uom'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_priceuom');
                objOrderGuideItem['last_price'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_lastprice');
//                objOrderGuideItem['current_price'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_currprice');
                objOrderGuideItem['current_price'] = 0;
                objOrderGuideItem['last_purch_date'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_lpd');
                // Additional Column Fields - v1.1
                objOrderGuideItem['pack_size'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_pack');
                objOrderGuideItem['brand'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_brand');
                objOrderGuideItem['manufacturer_code'] = arrOrderGuideItems[intOrderGuideItemCount].getValue('custrecord_ifd_orderguide_line_mfgcode');
                
            var stNumAvailableItems = !Eval.isEmpty(objNumAvailItemLocation[objOrderGuideItem['item_id']]) ? objNumAvailItemLocation[objOrderGuideItem['item_id']] : 0;
            
            // Get Current Price
            getCurrentItemPrice(objParameters, objOrderGuideItem, recCustomer); // * 10 units (inside this function)
            
            nlapiLogExecution('DEBUG', stLoggerTitle, '-- Setting Items on Sublist --'
                    + ' | Item ID = ' + objOrderGuideItem['item_id']
                    + ' | Item Text = ' + objOrderGuideItem['item_text']
                    + ' | Quantity = ' + objOrderGuideItem['quantity']
                    + ' | Item Description = ' + objOrderGuideItem['item_desc']
                    + ' | Physical UOM = ' + objOrderGuideItem['physical_uom']
                    + ' | Pricing UOM = ' + objOrderGuideItem['pricing_uom']
                    + ' | Last Price = ' + objOrderGuideItem['last_price']
                    + ' | Current Price = ' + objOrderGuideItem['current_price']
                    + ' | Number of Available Items = ' + stNumAvailableItems
                    + ' | Last Purchase Date = ' + objOrderGuideItem['last_purch_date']
                    + ' | Brand = ' + objOrderGuideItem['brand']
                    + ' | Manufacturer = ' + objOrderGuideItem['manufacturer_code']
                    );
            
            objItemSublist.setLineItemValue('custpage_subcol_item_id', intRowCounter, objOrderGuideItem['item_id']);
            objItemSublist.setLineItemValue('custpage_subcol_item_text', intRowCounter, objOrderGuideItem['item_text']);
            
            objItemSublist.setLineItemValue('custpage_subcol_item_desc', intRowCounter, objOrderGuideItem['item_desc']);
            objItemSublist.setLineItemValue('custpage_subcol_last_sale_date', intRowCounter, objOrderGuideItem['last_purch_date']);
            objItemSublist.setLineItemValue('custpage_subcol_last_sale_price', intRowCounter, objOrderGuideItem['last_price']);
            objItemSublist.setLineItemValue('custpage_subcol_current_sale_price', intRowCounter, objOrderGuideItem['current_price']);
            
            objItemSublist.setLineItemValue('custpage_subcol_last_ord_qty', intRowCounter, objOrderGuideItem['quantity']);
            objItemSublist.setLineItemValue('custpage_subcol_qty_available', intRowCounter, stNumAvailableItems);
            
            objItemSublist.setLineItemValue('custpage_subcol_pack_size', intRowCounter, objOrderGuideItem['pack_size']); // v1.1
            objItemSublist.setLineItemValue('custpage_subcol_brand', intRowCounter, objOrderGuideItem['brand']); // v1.1
            objItemSublist.setLineItemValue('custpage_subcol_manufacturer', intRowCounter, objOrderGuideItem['manufacturer_code']); // v1.1
            
            objItemSublist.setLineItemValue('custpage_subcol_qty_to_ord', intRowCounter, '0');
        }
    }

    // Set script validation upon form submit
    objForm.setScript('customscript_cs_order_guide_valid_sl');
    
    objResponse.writePage(objForm);
        
    nlapiLogExecution('DEBUG', stLoggerTitle, '[END] - Rendering Order Guide Page...');
    
    return;
}

/**
 * Cancel button that closes the window
 * 
 * @param objResponse
 * @returns {Void}
 */
function cancelItemReplacements(objResponse)
{
    try
    {
        var stLoggerTitle = 'cancelItemReplacements';
        
        nlapiLogExecution('DEBUG', stLoggerTitle, 'CANCEL - Replacement Items...');
        
        var stHtml = '';
        
        stHtml += '<script language="JavaScript">';
        stHtml +=       'window.close();';
        stHtml += '</script>';
        
        objResponse.write(stHtml); 
        
        return;
    }
    catch (error)
    {
        if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR','Process Error',error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR','Unexpected Error',error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
        
        return false;
    }
}

/**
 * Getting order guides for the given customer
 * 
 * @param stCustomerID
 * @returns {Array}
 */
function getOrderGuidesByCustomer(stCustomerID)
{
    var arrResult = [];
    
    var arrSearchFilters = [new nlobjSearchFilter('custrecord_ifd_orderguide_customer', null, 'anyof', stCustomerID),
                            new nlobjSearchFilter('isinactive', null, 'is', 'F')];
    var arrSearchColumns = [new nlobjSearchColumn('custrecord_ifd_orderguide_header_primary').setSort(true),
                            new nlobjSearchColumn('name').setSort(false),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_customer')];
    
    try
    {
        arrResult = NSUtils.search('customrecord_ifd_orderguide_header', null, arrSearchFilters, arrSearchColumns);
    }
    catch (error)
    {
        arrResult = [];
    }
    
    return arrResult;
}

/**
 * Getting order guide items for the given customer
 * 
 * @param stCustomerID
 * @returns {Array}
 */
function getOrderGuideItemsByOrderGuide(stOrderGuideID)
{
    var arrResult = [];
    
    var arrSearchFilters = [new nlobjSearchFilter('custrecord_ifd_orderguide_rel_header', null, 'anyof', stOrderGuideID),
                            new nlobjSearchFilter('isinactive', null, 'is', 'F')];
    var arrSearchColumns = [new nlobjSearchColumn('custrecord_ifd_orderguide_line_item'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_qty'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_itemdesc'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_puom'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_priceuom'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_lastprice'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_currprice'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_lpd'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_manual'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_ti'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_hi'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_rel_header'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_pack'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_brand'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_line_mfgcode')
                            ];
    
    try
    {
        arrResult = NSUtils.search('customrecord_ifd_orderguide_line', null, arrSearchFilters, arrSearchColumns);
    }
    catch (error)
    {
        arrResult = [];
    }
    
    return arrResult;
}

/**
 * Getting number of items available by the given item ids and location
 * 
 * @param {Array} arrItemIDs
 * @param {String} stLocation
 * @returns {Array} arrResult
 */
function getItemQtyAvailable(arrItemIDs, stLocation)
{

    var arrResult = [];

    var arrSearchFilters = [new nlobjSearchFilter('internalid', null, 'anyof', arrItemIDs),
                            new nlobjSearchFilter('inventorylocation', null, 'anyof', stLocation),
                            new nlobjSearchFilter('isinactive', null, 'is', 'F')];
    var arrSearchColumns = [new nlobjSearchColumn('internalid'),
                            new nlobjSearchColumn('name'),
                            new nlobjSearchColumn('locationquantityonhand')];
    
    try
    {
        arrResult = NSUtils.search('item', null, arrSearchFilters, arrSearchColumns);
    }
    catch (error)
    {
        arrResult = [];
    }
    
    return arrResult;
}

/**
 * Initialize customer item price level and group price level to global variables
 */
function initCustomerPriceLevels(recCustomer)
{
     // Get All Customer's Item Pricing
     var intCustomerItemPricingCount = recCustomer.getLineItemCount('itempricing');
    
     if (intCustomerItemPricingCount > 0)
     {
         // Loop Customer's Item Pricing (1st)
         for (var intCtr = 1; intCtr <= intCustomerItemPricingCount; intCtr++)
         {
             var stItemID = recCustomer.getLineItemValue('itempricing', 'item', intCtr);
             var stPriceLevelID = recCustomer.getLineItemValue('itempricing', 'level',intCtr);
    
             OBJ_ITEMS_PRICE_LEVELS[stItemID] = stPriceLevelID;
         }
     }
    
     // Get All Customer's GROUP Pricing
     var intCustomerGroupPricingCount = recCustomer.getLineItemCount('grouppricing');
    
     if (intCustomerGroupPricingCount > 0)
     {
         // Loop Customer's Item Pricing (2nd)
         for (var intCtr = 1; intCtr <= intCustomerGroupPricingCount; intCtr++)
         {
             var stGroupID = recCustomer.getLineItemValue('grouppricing', 'group', intCtr);
             var stPriceLevelID = recCustomer.getLineItemValue('grouppricing', 'level',intCtr);
    
             // Collect it in a global variable
             OBJ_GROUP_PRICING[stGroupID] = stPriceLevelID;
         }
     }    
}

function getCurrentItemPrice(objParameters, objOrderGuideItem, recCustomer)
{
    var stLoggerTitle = 'getCurrentItemPrice';
    
    // Load Item Record
    var stItemType = nlapiLookupField('item', objOrderGuideItem['item_id'], 'type'); // *5 units
    checkGovernance(); 
    var recItem = nlapiLoadRecord(NSUtils.toItemInternalId(stItemType), objOrderGuideItem['item_id']); // *5 units 
    checkGovernance(); 

    // Update Flags
    var bHasFirstLevel = false;
    var bHasSecondLevel = false;
    var bHasThirdLevel = false;

    // If ITEM Global Variable, for the first_level, is NOT empty for this item
    if (!Eval.isEmpty(OBJ_ITEMS_PRICE_LEVELS[objOrderGuideItem['item_id']]))
    {
        var stFirstLevel = OBJ_ITEMS_PRICE_LEVELS[objOrderGuideItem['item_id']];
        // getItemPricingListValue() ---> for 1st level
        var stPriceLevelPrice = getItemPricingListValue(recItem, stFirstLevel);
        
        // If NOT zero/undefined/empty
        if (!Eval.isEmpty(stPriceLevelPrice) && stPriceLevelPrice != 0)
        {
            // set CURRENT PRICE HOLDER
            objOrderGuideItem['current_price'] = Parse.forceFloat(stPriceLevelPrice);
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Set current price (1st Level) = ' + objOrderGuideItem['current_price']);
            bHasFirstLevel = true;
        }
    }
                
    // CHECKING if there's an update from the first_level
    if (!bHasFirstLevel && objOrderGuideItem['current_price'] == 0)
    {
        // Get Item's Pricing Group (2nd)
        var stItemPricingGroup = recItem.getFieldValue('pricinggroup');
        
        /** If ITEM Global Variable, for the second_level, is NOT empty for this item 
            AND If Item's Pricing Group is NOT empty **/
        if (!Eval.isEmpty(OBJ_GROUP_PRICING[stItemPricingGroup]))
        {
            var stSecondLevel = OBJ_GROUP_PRICING[stItemPricingGroup];
            // getItemPricingListValue() ---> for 2nd level 
            var stPriceLevelPrice = getItemPricingListValue(recItem, stSecondLevel);
            
            // If NOT zero/undefined/empty
            if (!Eval.isEmpty(stPriceLevelPrice) && stPriceLevelPrice != 0)
            {
                // set CURRENT PRICE HOLDER
                objOrderGuideItem['current_price'] = Parse.forceFloat(stPriceLevelPrice);
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Set current price (2nd Level) = ' + objOrderGuideItem['current_price']);
                bHasSecondLevel = true;
            }
        }
    }

    // CHECKING if there's an update from the first_level AND second_level
    if (!bHasFirstLevel && !bHasSecondLevel  && objOrderGuideItem['current_price'] == 0)
    {
        //Get Customer's Price Level (3rd)
        var stThirdLevel = recCustomer.getFieldValue('pricelevel');
        
        // If customer has Price Level (3rd)
        if (!Eval.isEmpty(stThirdLevel))
        {

            // getItemPricingListValue() ---> for 3rd level 
            var stPriceLevelPrice = getItemPricingListValue(recItem, stThirdLevel);
            
            // If NOT zero/undefined/empty
            if (!Eval.isEmpty(stPriceLevelPrice) && stPriceLevelPrice != 0)
            {
                // set CURRENT PRICE HOLDER
                objOrderGuideItem['current_price'] = Parse.forceFloat(stPriceLevelPrice);
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Set current price (3rd Level) = ' + objOrderGuideItem['current_price']);
                bHasThirdLevel = true;
            }
        }
    }

    // CHECKING if there's an update from the first_level AND second_level AND third_level 
    if (!bHasFirstLevel && !bHasSecondLevel && !bHasThirdLevel  && objOrderGuideItem['current_price'] == 0)
    {
     // getItemPricingListValue() ---> for 4th level 
        var stPriceLevelPrice = getItemPricingListValue(recItem, objParameters['parameter_price_level_base']);
        
        // If NOT zero/undefined/empty
        if (!Eval.isEmpty(stPriceLevelPrice) && stPriceLevelPrice != 0)
        {
            // set CURRENT PRICE HOLDER
            objOrderGuideItem['current_price'] = Parse.forceFloat(stPriceLevelPrice);
        }
    }
}

/**
 * This is to get the price based on the given price level in the item record
 * 
 * @param {Object} recItem
 * @param {String} stPriceLevel
 * @returns {String} stPriceLevelPrice
 */
function getItemPricingListValue(recItem, stPriceLevel)
{
    var stLoggerTitle = 'getItemPricingListValue';
    
    var stPriceId = 'price';
    var intQuantityLevels = recItem.getLineItemCount('price');
    var intPriceLevels = recItem.getLineItemCount(stPriceId);
    
    var stPriceLevelLine = recItem.findLineItemValue(stPriceId, 'pricelevel', stPriceLevel);
    var stPriceLevelPrice = 0;
    
    // If price is found
    if (stPriceLevelLine != -1)
    {
        stPriceLevelPrice = recItem.getLineItemValue(stPriceId, 'price_1_', stPriceLevelLine);
    }
    
    return stPriceLevelPrice;
}


/**
 * This logs the remaining governance unit to monitor usage consumption
 */
function checkGovernance()
{
    var stLoggerTitle = 'checkGovernance';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Remaining Usage = ' + nlapiGetContext().getRemainingUsage());
}