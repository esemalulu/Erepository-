/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
 define(["N/log", "N/search"], function (log, search)
 {
 
     function postSourcing(context)
     {
         var rec = context.currentRecord;
       log.debug('rec',rec)
 
         if (context.sublistId == 'item' && context.fieldId == 'item')
         {
             var itemId = rec.getCurrentSublistValue({
                 sublistId: "item",
                 fieldId: "item",
             });
             if (!isNaN(itemId))
             {
                 populateWarehouseFunctionality(context);
             }
 
         }
     }
 
     function populateWarehouseFunctionality(context)
     {
         try
         {
             const RICHMOND = 103;
             const SAVAGE = 104;
 
             var salesRecord = context.currentRecord;
             if (!salesRecord) return;
 
             var actualLocation = salesRecord.getValue("location");
             if (!actualLocation) return;
 
             var itemId = salesRecord.getCurrentSublistValue({
                 sublistId: 'item',
                 fieldId: 'item'
             })
 
             var itemName = salesRecord.getCurrentSublistValue({
                 sublistId: 'item',
                 fieldId: 'item_display'
             });
 
             if (!itemId) return;
 
             //Bring all line items with available quantity gratear than 0 for each Warehouse
             var itemInfo = getLocationsAvailablePerItem(itemId);
log.debug('itemInfo',itemInfo)
             if (!itemInfo) return;
 
             //If warehouse at header line is SAVAGE
             if (actualLocation == SAVAGE)
             {
                 //Set location in item line
                 salesRecord.selectLine({ sublistId: 'item', line: context.line });
 
                 salesRecord.setCurrentSublistValue({
                     sublistId: 'item',
                     fieldId: 'location',
                     value: SAVAGE,
                     ignoreFieldChange: true
                 });
             }
             //If warehouse at header line is RICHMOND
             else if (actualLocation == RICHMOND)
             {
                 //This step will set location in each line item to the primary location in the sales order only if it has (quantity available - qtyline item) greater than 0
 
                 //Get locations for this item
                 var locationToSet;
                 var locations = itemInfo[itemId]?.locations || [];
                 if (!locations.length)
                 {
                     locationToSet = SAVAGE;
                 }
                 else
                 {
                     var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(1) >= 0));
 
                     //If location is not equal to location in sales order then we are going to look for another location
                     if (!locationFound || locationFound == -1)
                     {
                         //If we dont have location available at the primary location we are going to look for richmond
                         var savageLocation = locations.find(element => (Number(element.location) == SAVAGE) && (Number(element.quantity) - Number(1) >= 0));
                         if (savageLocation && savageLocation != -1)
                         {
                             locationToSet = savageLocation.location;
                         }
                         else
                         //If we dont have location in richmond we are going to look for any location that has qty greater than 0
                         {
                             locationToSet = SAVAGE;
                         }
                     }
                     //If location is equal to location in sales order then we are going to set this one
                     else
                     {
                         locationToSet = locationFound.location;
                     }
                 }
 
                 //Set location in item line
                 salesRecord.selectLine({ sublistId: 'item', line: context.line });
 
                 salesRecord.setCurrentSublistValue({
                     sublistId: 'item',
                     fieldId: 'location',
                     value: locationToSet,
                     ignoreFieldChange: true
                 });
             }
 
         }
         catch (error)
         {
             log.error('error', error);
         }
     }
 
     function getLocationsAvailablePerItem(itemsArray)
     {
         var itemsInfo = {};
 
         var inventoryitemSearchObj = search.create({
             type: "item",
             filters:
                 [
                     ["internalid", "anyof", itemsArray]
                 ],
             columns:
                 [
                     search.createColumn({ name: "locationquantityavailable", label: "Location Available" }),
                     search.createColumn({ name: "inventorylocation", label: "Inventory Location" }),
                     search.createColumn({
                         name: "internalid",
                         sort: search.Sort.ASC,
                         label: "Internal ID"
                     })
                 ]
         });
         var searchResultCount = inventoryitemSearchObj.runPaged().count;
         log.debug('searchResultCount', searchResultCount);
         inventoryitemSearchObj.run().each(function (result)
         {
 
             if (!itemsInfo[result.id]) itemsInfo[result.id] = { locations: [] };
 
             var locationQtySearch = result.getValue("locationquantityavailable");
             if (locationQtySearch == "" || Number(locationQtySearch) <= 0) return true;
 
             var obj = {};
             obj.location = result.getValue("inventorylocation");
             obj.quantity = locationQtySearch;
             itemsInfo[result.id].locations.push(obj);
 
 
             return true;
         });
         log.debug('itemsInfo',itemsInfo);
         return itemsInfo;
 
     }//End setLocationAvailable
 
     return {
         postSourcing
     }
 });
 