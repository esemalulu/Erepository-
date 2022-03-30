/// <reference path="References\Explore\SuiteScript\SuiteScriptAPI.js" />
/// <reference path="SharedLibrary_ServerSide.js" />
/**
* Company			Explore Consulting
* Copyright			2011 Explore Consulting, LLC
* Type				NetSuite Server-Side SuiteScript
* Version			1.0.0.0
* Developer         John Elvidge
* Description		When a Sales Order is created, takes all of the items associated with that sales order that are kit items, splits up the kit item to it's individual items and adds those individual items to that sales order
*                   This script also creates an Item Fulfillment record, based on the sales order. It bypasses salesorder Approval and creates that record, with the specifics of what to populate in the item fulfillment record based on the sales order record.
**/


var salesOrderRecord = null;        /////////DON'T DELETE!!!////////////////
var itemDeletedCounter = 0;         /////////DON'T DELETE!!!////////////////

function onAfterSubmit(type) 
{
    nlapiLogExecution('DEBUG', 'onAfterSubmit()', 'ENTERING');
    try {
        nlapiLogExecution('DEBUG', 'onAfterSubmit()', 'Order ID: ' + nlapiGetRecordId() + '. Type: ' + type);
        if (type == 'create')
        {
            checkSiteOrder();
        }
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'onAfterSubmit() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'onAfterSubmit()', 'EXITING');
}

function checkSiteOrder()
{
    nlapiLogExecution('DEBUG', 'checkSiteOrder()', 'ENTERING');
    try
    {
        var source = nlapiGetFieldValue('source');
        nlapiLogExecution('DEBUG', 'checkSiteOrder()', 'Order Source: ' + source);

        if(source == "web" || source == "webservices")
        {
            nlapiLogExecution('DEBUG', 'checkSiteOrder()', 'This Sales Orders is a WebStore Order');

            //this will lead to the process of splitting the kit items on the sales order, and updating the sales order with the individual items
            loadSalesOrder();
            //this leads to the creation of the fulfillment record associated with the updated sales order record
            fulfillmentRecordProcess();
        }
    }
    catch (e)
    {
        nlapiLogExecution('DEBUG', 'checkSiteOrder() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'checkSiteOrder()', 'EXITING');
}

function loadSalesOrder() 
{
    nlapiLogExecution('DEBUG', 'loadSalesOrder()', 'ENTERING');
    try 
    {
        //this will store all of the items on the sales order   
        var salesOrderItems = new Array();
        
        //get the current sales order ID, set global variable to the loaded record of that sales order record
        var salesOrderRecordId = nlapiGetRecordId();
        salesOrderRecord = nlapiLoadRecord('salesorder', salesOrderRecordId);
        
        //call next function
        salesOrderItems = sortSalesOrderItems();

        //sending all of the items associated to the sales order to the next function
        getKitItems(salesOrderItems);
        
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'loadSalesOrder() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'loadSalesOrder()', 'EXITING');
}

function sortSalesOrderItems()
{
    nlapiLogExecution('DEBUG', 'sortSalesOrderItems()', 'ENTERING');
    try 
    {
        //this will store all of the items on the sales order   
        var salesOrderItems = new Array();
        
        //getting the count of the items that exist in the sales order
        var itemsCount = salesOrderRecord.getLineItemCount('item');

        for (var i = 1; i <= itemsCount; i++) 
        {
            //going to create an object to store the items ID and the items current row. The row is needed later to delete the kit item. That is, if the item is of kititem type
            var itemObject = new Object();
            itemObject.id = salesOrderRecord.getLineItemValue('item', 'item', i);
            itemObject.row = i;
            itemObject.quantity = salesOrderRecord.getLineItemValue('item', 'quantity', i);

            //pushing that item object to the array
            salesOrderItems.push(itemObject);
        }

        return salesOrderItems;
        ////sending all of the items associated to the sales order to the next function
        //getKitItems(salesOrderItems);
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'sortSalesOrderItems() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'sortSalesOrderItems()', 'EXITING');
}

function getKitItems(salesOrderItems)
{
    nlapiLogExecution('DEBUG', 'getKitItems()', 'ENTERING');
    try 
    {
        var kitItemsArray = new Array();

        //going to go through each index of the brought in array. Each index is an internal ID of an item associated to a sales order.
        //if there is a returned results in the search for the specific type of kititem, then that item is of type kit item. If the search
        //results returns nothing, then that item id isn't a kititem, and we don't want to use it. (pushing the internal ID's to the kitItemsArray not objects)
        for (var i = 0; i < salesOrderItems.length; i++) 
        {
            var filters = new Array();
            filters.push(new nlobjSearchFilter('internalid', null, 'is', salesOrderItems[i].id));
            
            var searchResults = nlapiSearchRecord('kititem', null, filters, null);

            if (searchResults != null) 
            {
                kitItemsArray.push(salesOrderItems[i]);
                nlapiLogExecution('DEBUG', 'getKitItems() - Kit Item ID', salesOrderItems[i]);
            }
            else 
            {
                nlapiLogExecution('DEBUG', "getKitItems() - Item Isn't a Kit Item", "Item ID: " + kitItemsArray[i] + " Is not an Item of Kit Item Type");
            }
        }
        
        //taking the array of all valid kit item type items and going to sort through them
        if (kitItemsArray != null) 
        {
            sortThroughKitItems(kitItemsArray);
            nlapiLogExecution('DEBUG', 'getKitItems()', 'There are ' + kitItemsArray.length + ' number of Kits associated to this sales order');
        }
        else 
        {
            nlapiLogExecution('DEBUG', 'getKitItems()', 'There are no Kit Items on this Sales Order');
        }
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'getKitItems() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'getKitItems()', 'EXITING');
}

function sortThroughKitItems(kitItemsArray)
{
    nlapiLogExecution('DEBUG', 'sortThroughKitItems()', 'ENTERING');
    try 
    {
        //going to delete all of the existing kit items within the sales order items sublist
        for (var i = 0; i < kitItemsArray.length; i++) 
        {
            deleteKitItem(kitItemsArray[i]);
        }
        
        //going to go through each kit item and split out all of the items associated to that kit item into an array and then add those to the sales order record
        for (var i = 0; i < kitItemsArray.length; i++) 
        {
            getQuantityKitItem(kitItemsArray[i]);
        }
    
        //changing the status of the sales order to status "Appending Fulfillment"
        salesOrderRecord.setFieldValue('orderstatus', 'B');
        
        //submitting the Sales Order Record
        var submittedRecord = nlapiSubmitRecord(salesOrderRecord, false, true);
        
        nlapiLogExecution('DEBUG', "sortThroughKitItems", "Sales Order ID: " + submittedRecord + " Has been submitted");
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'sortThroughKitItems() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'sortThroughKitItems()', 'EXITING');
}

function deleteKitItem(kitItem) 
{
    nlapiLogExecution('DEBUG', 'deleteKitItem()', 'ENTERING');
    try 
    {
        nlapiLogExecution('DEBUG', 'deleteKitItem()', 'Item ID: ' + kitItem.id + ' has been removed from the sales order items sublist');
        
        //determining the row to delete based on a global variable
        var rowToDelete = kitItem.row - itemDeletedCounter;
        salesOrderRecord.removeLineItem('item', rowToDelete);
        
        //adding 1 to the counter, because the row is deleted the index of the rows has bumped down one.
        //Since the row of the item is already determine, we need to make sure it's getting the updated value
        itemDeletedCounter++;
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'deleteKitItem() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'deleteKitItem()', 'EXITING');
}

function getQuantityKitItem(kitItem) 
{
    nlapiLogExecution('DEBUG', 'getQuantityKitItem()', 'ENTERING');
    try 
    {
        var kitItemQuantity = kitItem.quantity;
        nlapiLogExecution('DEBUG', 'getQuantityKitItem() - Kit Item Quantity', kitItemQuantity);

        for (var i = 1; i <= kitItemQuantity; i++) 
        {
            if (kitItemQuantity <= 200) 
            {
                splitKitItem(kitItem);
            }
            else 
            {
                nlapiLogExecution('DEBUG', 'getQuantityKitItem()', 'Kit Item Quantity Exceeds 200. Not Allowed.');
            }
        }  
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'getQuantityKitItem() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'getQuantityKitItem()', 'EXITING');
}

function splitKitItem(kitItem)
{
    nlapiLogExecution('DEBUG', 'splitKitItem()', 'ENTERING');
    try 
    {
        var kitItemId = kitItem.id;
        
        nlapiLogExecution('DEBUG', 'splitKitItem() - Kit Item ID', kitItemId);
        
        //loading the kit Item Record
        var kitItemRecord = nlapiLoadRecord('kititem', kitItemId); 
        
        //determining how many items are associated with kit item
        var numberOfMemberItems = kitItemRecord.getLineItemCount('member');

        //going through each row, pushing the item ID for that row to the itemsArray
        for (var i = 0; i < numberOfMemberItems; i++) 
        {
            var rowItemId = kitItemRecord.getLineItemValue('member', 'item', i + 1);
            addItemToSalesOrder(rowItemId);            
        }
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'splitKitItem() - Unexpected Error', e);
    } 
    nlapiLogExecution('DEBUG', 'splitKitItem()', 'EXITING');
}



function addItemToSalesOrder(itemId) 
{
    nlapiLogExecution('DEBUG', 'addItemsToSalesOrder()', 'ENTERING');
    try 
    {
        nlapiLogExecution('DEBUG', 'addItemToSalesOrder()', 'The Row Item ID Added: ' + itemId);
        
        //adding a new line to the sublist in the sales order items tab. This is only updating the item field value, the rest is auto populated
        salesOrderRecord.selectNewLineItem('item');
        salesOrderRecord.setCurrentLineItemValue('item', 'item', itemId, true); //synchronous behavior
        salesOrderRecord.commitLineItem('item');
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'addItemsToSalesOrder() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'addItemsToSalesOrder()', 'EXITING');
}



function fulfillmentRecordProcess() 
{
    nlapiLogExecution('DEBUG', 'fulfillmentRecordProcess()', 'ENTERING');
    try 
    {
        var salesOrderItems = new Array();
        
        //get the current sales order ID, set global variable to the loaded record of that sales order record
        var salesOrderRecordId = nlapiGetRecordId();
        salesOrderRecord = nlapiLoadRecord('salesorder', salesOrderRecordId);

        //Get all of the items associated to the sales order(at this point all of the kit items should be divided up and gone)
        salesOrderItems = sortSalesOrderItems();

        //go ahead and create the fulfillment record now
        createFulfillmentRecord(salesOrderItems, salesOrderRecordId);
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'fulfillmentRecordProcess() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'fulfillmentRecordProcess()', 'EXITING');
}



function createFulfillmentRecord(salesOrderItems, salesOrderRecordId) 
{
    nlapiLogExecution('DEBUG', 'createFulfillmentRecord()', 'ENTERING');
    try 
    {
        //this is taking the sales order record that we have with updated items, and creating a fulfillment record based off of the sales order record
        var fulfillmentRecord = nlapiTransformRecord('salesorder', salesOrderRecordId, 'itemfulfillment');
        
        //submit the newly created fulfillment record
        var fulfillmentRecordId = nlapiSubmitRecord(fulfillmentRecord, false, true);

        nlapiLogExecution('DEBUG', 'createFulfillmentRecord()', "Fulfillment Record ID: " + fulfillmentRecordId + " has been created for the sales order record: " + salesOrderRecordId);
    }
    catch (e) 
    {
        nlapiLogExecution('DEBUG', 'createFulfillmentRecord() - Unexpected Error', e);
    }
    nlapiLogExecution('DEBUG', 'createFulfillmentRecord()', 'EXITING');
}