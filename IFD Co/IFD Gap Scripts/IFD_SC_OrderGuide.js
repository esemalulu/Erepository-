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
 * 1.00       19 Apr 2016     lochengco
 *
 */

/**
 * @param {String} stType Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled_updateOrderGuideItems(stType)
{
    try
    {
        var stLoggerTitle = 'scheduled_updateOrderGuideItems';
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Entry<<');
        
        var objContext = nlapiGetContext();
        var objParameters = {};
            objParameters['number_of_weeks'] = objContext.getSetting('SCRIPT', 'custscript_ifd_num_of_weeks');
            objParameters['search_so_order_guide'] = objContext.getSetting('SCRIPT', 'custscript_search_so_order_guide');
            
        nlapiLogExecution('DEBUG', stLoggerTitle, ' === SCRIPT PARAMETER(S) === ' 
                + ' | Number of Weeks = ' + objParameters['number_of_weeks']
                + ' | Saved Search: SO on Order Guide = ' + objParameters['search_so_order_guide']
                );
        
        if (Eval.isEmpty(objParameters['number_of_weeks']) || Eval.isEmpty(objParameters['search_so_order_guide']))
        {
            throw nlapiCreateError('99999', 'Please enter value for all script parameters.');
        }
        
        NSUtils.checkGovernance(500);
        
        // System Date
        var dtSystemDate = new Date();
            dtSystemDate.setHours(0,0,0,0); // This ignores time
        
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Server Date... ' + dtSystemDate);
        
//        var intDaysInWeek = 7;
        objParameters['number_of_weeks_date'] = new Date();
        objParameters['number_of_weeks_date'].setDate(objParameters['number_of_weeks_date'].getDate() - (Parse.forceInt(objParameters['number_of_weeks']) * CHRONO.days_in_week));
        objParameters['number_of_weeks_date'].setHours(0,0,0,0);
        objParameters['number_of_weeks_string'] = nlapiDateToString(objParameters['number_of_weeks_date']);
        
        // Get all Primary Order Guides from Order Guide custom record
        var arrAllPrimaryOrderGuides = getAllPrimaryOrderGuide();
        
        // Loop PRIMARY order guides by customer
        for (var intPrimaryOrderGuideCount = 0; intPrimaryOrderGuideCount < arrAllPrimaryOrderGuides.length; intPrimaryOrderGuideCount++)
        {
            NSUtils.checkGovernance(500);
            
            // Get order guide id
            var stOrderGuideID = arrAllPrimaryOrderGuides[intPrimaryOrderGuideCount].getId();
            var stCustomerID = arrAllPrimaryOrderGuides[intPrimaryOrderGuideCount].getValue('custrecord_ifd_orderguide_customer');
            
            // Get all PRIMARY Order Guide Items
            var arrOrderGuideItems = getOrderGuideItemsByOrderGuide(stOrderGuideID);
        
            // Checking of items
            if (Eval.isEmpty(arrOrderGuideItems))
            {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'No items found in this order guide. ID = ' + stOrderGuideID);
                continue;
            }
            
            var objOrderGuideItems = validateCurrentOrderGuideItems(arrOrderGuideItems, objParameters);
            
            processSalesOrderItems(objOrderGuideItems, objParameters, stOrderGuideID, stCustomerID);
        }
        
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

/**
 * This function has the ability to remove the items that was ordered before
 * the set cut-off date (defined in the script parameter by the number of weeks)
 * 
 * @param {Array} arrOrderGuideItems
 * @param {Object} objParameters
 * @returns {Object} objOrderGuideItems
 */
function validateCurrentOrderGuideItems(arrOrderGuideItems, objParameters)
{
    var stLoggerTitle = 'validateCurrentOrderGuideItems';
    
    // Declare an object variable (Collection of Primary Order Guide Item)
    var objOrderGuideItems = {};
    
    // Loop all PRIMARY Order Guide Items
    for (var intOrderGuideItemCount = 0; intOrderGuideItemCount < arrOrderGuideItems.length; intOrderGuideItemCount++)
    {
        var objOrderGuideItem = arrOrderGuideItems[intOrderGuideItemCount];
        var stOrderGuideID = objOrderGuideItem.getId();
        var stItemID = objOrderGuideItem.getValue('custrecord_ifd_orderguide_line_item');
        var stLastPurchDate = objOrderGuideItem.getValue('custrecord_ifd_orderguide_line_lpd');
        var stIsAddedManually = objOrderGuideItem.getValue('custrecord_ifd_orderguide_line_manual');
        
        var dtLastPurchDate = nlapiStringToDate(stLastPurchDate);
            
        nlapiLogExecution('DEBUG', stLoggerTitle, '- Order Guide Item -'
                + ' | Internal ID = ' + stOrderGuideID
                + ' | Item = ' + stItemID
                + ' | Date: Last Purchase = ' + dtLastPurchDate
                + ' | Date: Cut-off Date = ' + objParameters['number_of_weeks_date']
                + ' | Is Item Added Manually = ' + stIsAddedManually
                );
            
        // Check if the item is NOT added manually && last purchase lapse the minimum week
        if (stIsAddedManually == 'F' && dtLastPurchDate <= objParameters['number_of_weeks_date'])
        {
            nlapiDeleteRecord('customrecord_ifd_orderguide_line', stOrderGuideID);
            
            // Remove the item in the PRIMARY Order Guide
            nlapiLogExecution('AUDIT', stLoggerTitle, '- Removed Item from Order Guide Item -' 
                    + ' | Order Guide Item ID = ' + stOrderGuideID
                    + ' | Item = ' + stItemID);
        }
        else
        {
            // Pass it to an object variable using the item's id
            objOrderGuideItems[stItemID] = objOrderGuideItem;
        }
    } // -- END LOOP
    
    return objOrderGuideItems;
}


/**
 * This function creates/updates the order guide items based from the sales order item values  
 * 
 * @param {Object} objOrderGuideItems
 * @param {Object} objParameters
 * @param {String} stOrderGuideID
 * @param {String} stCustomerID
 * @return {Void}
 */
function processSalesOrderItems(objOrderGuideItems, objParameters, stOrderGuideID, stCustomerID)
{
    NSUtils.checkGovernance(500);
    
    var stLoggerTitle = 'processSalesOrderItems';

    // Declare an array that collects all processed items (Collection of Item IDs)
    var arrProcessedItems = [];

    // Get all Sales Order transactions SORTED by DATE (DESC)
    var arrSalesOrderItems = getSalesOrderItemsByCustomerID(objParameters['search_so_order_guide'], objParameters['number_of_weeks_string'], stCustomerID);
    
    if (Eval.isEmpty(arrSalesOrderItems))
    {
        nlapiLogExecution('DEBUG', stLoggerTitle, 'No sales order items found for this order guide. Order Guide ID = ' + stOrderGuideID);
        return;
    }
    
    // Loop all Sales Order transactions SORTED by DATE (DESC)
    for (var intSalesOrderItemCount = 0; intSalesOrderItemCount < arrSalesOrderItems.length; intSalesOrderItemCount++)
    {
        NSUtils.checkGovernance(100);
        
        // Declare a variable for item id
        var objSOData = {};
            objSOData['item_id'] = arrSalesOrderItems[intSalesOrderItemCount].getValue('item');
            objSOData['rate'] = arrSalesOrderItems[intSalesOrderItemCount].getValue('rate');
            objSOData['quantity'] = arrSalesOrderItems[intSalesOrderItemCount].getValue('quantity');
            objSOData['tran_date'] = arrSalesOrderItems[intSalesOrderItemCount].getValue('trandate');
            objSOData['description'] = arrSalesOrderItems[intSalesOrderItemCount].getValue('description');
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '- Sales Order Item - '
                + ' | Item = ' + objSOData['item_id']
                + ' | Quantity = ' + objSOData['quantity']
                + ' | Transaction Date = ' + objSOData['tran_date']
                + ' | Description = ' + objSOData['description']
                );
        
        // Using (Collection of Item IDs), if item id is not found
        if (arrProcessedItems.indexOf(objSOData['item_id']) != -1)
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'This item has already been processed. ID = ' + objSOData['item_id']);
            continue;
        }
        
        arrProcessedItems.push(objSOData['item_id']);
        
        // Using (Collection of Primary Order Guide Item)
        if(!Eval.isEmpty(objOrderGuideItems[objSOData['item_id']])) // if NOT undefined -- Already Existing in Order Guide Item
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Updating Order Guide Item...');
            
            var stOrderGuideItemID = objOrderGuideItems[objSOData['item_id']].getId();
            var stOrderGuideItemCurrentPrice = objOrderGuideItems[objSOData['item_id']].getValue('custrecord_ifd_orderguide_line_currprice');
            var stOrderGuideItemQty = objOrderGuideItems[objSOData['item_id']].getValue('custrecord_ifd_orderguide_line_qty');
            var stOrderGuideItemLastPurchDate = objOrderGuideItems[objSOData['item_id']].getValue('custrecord_ifd_orderguide_line_lpd');
            var stOrderGuideItemItemDesc = objOrderGuideItems[objSOData['item_id']].getValue('custrecord_ifd_orderguide_line_itemdesc');
            
            // Update the item from the Primary Order Guide Item
            nlapiLogExecution('DEBUG', stLoggerTitle, '- Order Guide Item -' 
                    + ' | Order Guide Item: ID = ' + stOrderGuideItemID
                    + ' | Order Guide Item: Current Price = ' + stOrderGuideItemCurrentPrice
                    + ' | Order Guide Item: Quantity = ' + stOrderGuideItemQty
                    + ' | Order Guide Item: Last Purch Date = ' + stOrderGuideItemLastPurchDate
                    + ' | Order Guide Item: Item Description = ' + stOrderGuideItemItemDesc
                    );
            
            if (stOrderGuideItemCurrentPrice == objSOData['rate']
            && stOrderGuideItemQty == objSOData['quantity']
            && stOrderGuideItemLastPurchDate == objSOData['tran_date'])
            {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'No updates needed for this order guide item. Order Guide ID = ' + stOrderGuideItemID);
                continue;
            }
            
            var arrColumns = ['custrecord_ifd_orderguide_line_qty',
                              'custrecord_ifd_orderguide_line_lastprice',
                              'custrecord_ifd_orderguide_line_currprice',
                              'custrecord_ifd_orderguide_line_lpd',
                              'custrecord_ifd_orderguide_line_itemdesc'];
            var arrValues = [objSOData['quantity'],
                             stOrderGuideItemCurrentPrice,
                             objSOData['rate'],
                             objSOData['tran_date'],
                             objSOData['description']
                             ];
            
            nlapiSubmitField('customrecord_ifd_orderguide_line', stOrderGuideItemID, arrColumns, arrValues);
            
            nlapiLogExecution('AUDIT', stLoggerTitle, 'Order Guide Item has been successfully updated. ID = ' + stOrderGuideItemID);
        }
        else // if undefined -- Not yet Existed in Order Guide Item
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Creating Order Guide Item...');
            
            // Create a new record in Primary Order Guide Item
            var recOrderGuideItem = nlapiCreateRecord('customrecord_ifd_orderguide_line');
                recOrderGuideItem.setFieldValue('custrecord_ifd_orderguide_line_item', objSOData['item_id']);
                recOrderGuideItem.setFieldValue('custrecord_ifd_orderguide_line_itemdesc',  objSOData['description']);
                recOrderGuideItem.setFieldValue('custrecord_ifd_orderguide_line_qty', objSOData['quantity']);
                recOrderGuideItem.setFieldValue('custrecord_ifd_orderguide_line_lpd', objSOData['tran_date']);
                recOrderGuideItem.setFieldValue('custrecord_ifd_orderguide_line_currprice', objSOData['rate']);
                recOrderGuideItem.setFieldValue('custrecord_ifd_orderguide_line_manual', 'F');
                recOrderGuideItem.setFieldValue('custrecord_ifd_orderguide_rel_header', stOrderGuideID);
                
            var stOrderGuideItemID = nlapiSubmitRecord(recOrderGuideItem);
            nlapiLogExecution('AUDIT', stLoggerTitle, 'Order Guide Item has been successfully created. ID = ' + stOrderGuideItemID);
        }
    }
    
    return;
}

/**
 * Getting order guides for the given customer
 * 
 * @param stCustomerID
 * @returns {Array} arrResult
 */
function getAllPrimaryOrderGuide()
{
    var arrResult = [];
    
    var arrSearchFilters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
                            new nlobjSearchFilter('custrecord_ifd_orderguide_header_primary', null, 'is', 'T')];
    var arrSearchColumns = [new nlobjSearchColumn('custrecord_ifd_orderguide_header_primary'),
                            new nlobjSearchColumn('name'),
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
 * Getting order guide items for the given Order Guide ID
 * 
 * @param stCustomerID
 * @returns {Array} arrResult
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
                            new nlobjSearchColumn('custrecord_ifd_orderguide_rel_header')
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
 * Getting Sales Order Items by Customer ID 
 * 
 * @param stSavedSearchID
 * @param stCustomerID
 * @returns {Array} arrResult
 */
function getSalesOrderItemsByCustomerID(stSavedSearchID, stCutOffDate, stCustomerID)
{
    var arrResult = [];
    
    var arrSearchFilters = [new nlobjSearchFilter('entity', null, 'anyof', stCustomerID),
                            new nlobjSearchFilter('trandate', null, 'onorafter', stCutOffDate)];
    var arrSearchColumns = [];
    
    try
    {
        arrResult = NSUtils.search(null, stSavedSearchID, arrSearchFilters, arrSearchColumns);
    }
    catch (error)
    {
        arrResult = [];
    }
    
    return arrResult;
}