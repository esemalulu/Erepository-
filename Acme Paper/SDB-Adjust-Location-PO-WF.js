/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 */
define(["N/search", "N/log", "N/record", "N/runtime"], function (search, log, record, runtime) {

  function onAction(context) {
    const RICHMOND = 103;
    const SAVAGE = 104;
    const DropshipWarehouse = 129;
    var currentRoleId = runtime.getCurrentUser().id
    if (currentRoleId == 75190) return; //2 High Jump id
    var salesRecord = context.newRecord;
    var lineItemCount = salesRecord.getLineCount("item");
    var recordType = salesRecord.type;

    if (recordType === 'salesorder' && salesRecord.getValue("customform") == 300) {
      setDropShipmentLocations(salesRecord, DropshipWarehouse, lineItemCount)
    }
    if (recordType === 'purchaseorder') updateMissingLocation(salesRecord);
    else
      adjustLocationSPS(context, RICHMOND, SAVAGE);

    var actualLocation = salesRecord.getValue("location");
    salesRecord.setValue('custbody_warehouse_roadnet', actualLocation);
  }

  function updateMissingLocation(transaction) {
    try {
      var actualLocation = transaction.getValue("location");
      var lineItemCount = transaction.getLineCount("item");
      for (var i = 0; i < lineItemCount; i++) {
        transaction.selectLine({ sublistId: 'item', line: i });
        var currentLocation = transaction.getSublistValue({
          sublistId: 'item',
          fieldId: 'location',
          line: i
        });
        var itemId = transaction.getSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          line: i
        });
        if (!currentLocation) {
          transaction.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'location',
            value: actualLocation,
            ignoreFieldChange: true
          });
          transaction.commitLine("item");
          log.debug("Missing Location: ", { tranId: transaction.id, itemId, actualLocation });
        }
      }
    } catch (error) {
      log.error("ERROR in updateMissingLocation", error);
    }
  }

  function setDropShipmentLocations(salesRecord, DropshipWarehouse, lineItemCount) {
    try {
      salesRecord.setValue({ fieldId: 'location', value: DropshipWarehouse });
      for (var i = 0; i < lineItemCount; i++) {
        salesRecord.selectLine({ sublistId: 'item', line: i });

        //Set actual item qty
        salesRecord.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'location',
          value: DropshipWarehouse
        });

        salesRecord.commitLine("item");
      }
    } catch (e) {
      log.error("error in function setDropShipmentLocations ", e);
    }

  }
  // ---------------------------- ADJUST LOCATION WAREHOUSE SPS ------------------------

  function adjustLocationSPS(context, RICHMOND, SAVAGE) {
    try {
      var salesRecord = context.newRecord;
      var newRec = salesRecord;
      if (!salesRecord) return;
      var recordType = salesRecord.type;

      // Check the record type
      if (recordType === 'salesorder') {
        //Check if entered by field is only sps webservices
        var enteredById = salesRecord.getValue("custbody_aps_entered_by");

        if (String(enteredById) == "84216") return;
      }

      var actualLocation = salesRecord.getValue("location");
      salesRecord.setValue('custbody_warehouse_roadnet', actualLocation);
      if (!actualLocation) return;

      var lineItemCount = salesRecord.getLineCount("item");
      if (lineItemCount < 1) return;

      var itemsInfoLines = [];
      var itemsArray = [];

      //We are going to iterate over sales items
      for (var i = 0; i < lineItemCount; i++) {
        var obj = {};

        var itemId = salesRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          line: i
        });
        if (!itemId) continue;

        var itemQuantity = salesRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'quantity',
          line: i
        });

        var itemRate = salesRecord.getSublistValue({
          sublistId: 'item',
          fieldId: 'rate',
          line: i
        });

        obj.rate = itemRate;
        obj.itemId = itemId;
        obj.qty = itemQuantity;
        obj.line = i;

        itemsInfoLines.push(obj);
        itemsArray.push(itemId);
      }

      //Bring all line items with available quantity gratear than 0 for each Warehouse
      var itemInfo = getLocationsAvailablePerItem(itemsArray);
      if (!itemInfo) return;

      log.debug("Data: ", { transaction: newRec.id, itemsInfoLines, actualLocation });

      //This step will set location in each line item to the primary location in the sales order only if it has (quantity available - qtyline item) greater than 0
      itemsInfoLines.forEach(function (item) {
        if (actualLocation != SAVAGE && actualLocation != RICHMOND) {// Add 4/4/24
          salesRecord.selectLine({
            sublistId: 'item',
            line: item.line
          });
          salesRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'location',
            value: actualLocation,
            ignoreFieldChange: true
          });
          salesRecord.commitLine({
            sublistId: 'item'
          });
        }
        //If warehouse at header line is SAVAGE
        if (actualLocation == SAVAGE) {
          //Set location in item line
          salesRecord.selectLine({ sublistId: 'item', line: item.line });

          salesRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'location',
            value: SAVAGE,
            ignoreFieldChange: true
          });

          var locations = itemInfo[item.itemId]?.locations || [];

          if (locations.length) {
            var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)) && (Number(element.quantity) - Number(item.qty) >= 0));
            if (locationFound) {
              // Set available quantity at that location
              salesRecord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantityavailable',
                value: locationFound.quantity,
                ignoreFieldChange: true
              });
            }
            else {
              // Set available quantity at that location
              salesRecord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantityavailable',
                value: 0,
                ignoreFieldChange: true
              });
            }
          }

          salesRecord.commitLine("item");
        }
        //If warehouse at header line is RICHMOND
        else if (actualLocation == RICHMOND) {


          //This step will set location in each line item to the primary location in the sales order only if it has (quantity available - qtyline item) greater than 0
          //Get locations for this item
          var locationToSet;
          var locations = itemInfo[item.itemId]?.locations || [];
          //If item in richmond has backordered qty then we are going to create a new line and set savage
          //as location
          var locationFound = locations.find(element => (Number(element.location) == Number(actualLocation)));
          var savageLocation = locations.find(element => (Number(element.location) == Number(SAVAGE)));

          var isRitchmodCustomer = getIsRitchmodCustomer(salesRecord.getValue('entity'), RICHMOND);
          log.debug("RITCHMOND CASE INFO: ", { isRitchmodCustomer, locationFound, locations });
          if (isRitchmodCustomer && (!savageLocation || !locations.length)) {
            salesRecord.selectLine({ sublistId: 'item', line: item.line });
            salesRecord.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'location',
              value: RICHMOND,
            });
            salesRecord.commitLine("item");
            return;
          }

          if (!isRitchmodCustomer && locationFound && (Number(item.qty) - Number(locationFound.quantity) > 0)) {
            //Set qty for actual line to max qty available in Richmond
            salesRecord.selectLine({ sublistId: 'item', line: item.line });

            //Set actual item qty
            salesRecord.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'quantity',
              value: locationFound.quantity,
            });

            salesRecord.commitLine("item");

            salesRecord.selectNewLine("item");


            //Set item id
            salesRecord.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'item',
              value: item.itemId,
            });

            //Set item qty
            salesRecord.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'quantity',
              value: (Number(item.qty) - Number(locationFound.quantity)),
            });

            //Set item rate
            salesRecord.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'rate',
              value: item.rate,
            });

            //Set item location to Savage
            salesRecord.setCurrentSublistValue({
              sublistId: 'item',
              fieldId: 'location',
              value: SAVAGE,
            });

            salesRecord.commitLine("item");
          }
          else {
            log.debug('STATUS', 'ITEM DOES NOT HAVE BACKORDER');

            if (!locations.length) {
              locationToSet = SAVAGE;
            } else {
              var locationFound = locations.find(element => (Number(element.location) == Number(RICHMOND)) && (Number(element.quantity) - Number(item.qty) >= 0));
              //If location is not equal to location in sales order then we are going to set SAVAGE
              if (!locationFound || locationFound == -1) { locationToSet = SAVAGE; } else { locationToSet = actualLocation; }//Add 17/4/24

            }
            log.debug('final location set', { locationToSet, item });
            //Set location in item line
            salesRecord.selectLine({ sublistId: 'item', line: item.line });
            if (locationToSet) {
              salesRecord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                value: Number(locationToSet),
                ignoreFieldChange: false,
                forceSyncSourcing: true
              });
            }
            salesRecord.commitLine("item");
          }

        }//End if backorder
      });

    }
    catch (error) {
      log.error('error', error);
    }
  }

  function getIsRitchmodCustomer(customerId, RICHMOND) {
    try {
      var customerInfo = search.lookupFields({
        type: search.Type.CUSTOMER,
        id: customerId,
        columns: ['custentity_warehouse']
      });
      log.debug('customerInfo', customerInfo);
      customerInfo = customerInfo.custentity_warehouse;
      return customerInfo ? customerInfo[0].value == RICHMOND : false;
    } catch (error) {
      log.error("ERROR: ", error);
    }
  }

  function getLocationsAvailablePerItem(itemsArray) {
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
    inventoryitemSearchObj.run().each(function (result) {
      if (!itemsInfo[result.id]) itemsInfo[result.id] = { locations: [] };

      var locationQtySearch = result.getValue("locationquantityavailable");
      if (locationQtySearch == "" || Number(locationQtySearch) <= 0) return true;

      var obj = {};
      obj.location = result.getValue("inventorylocation");
      obj.quantity = locationQtySearch;
      itemsInfo[result.id].locations.push(obj);


      return true;
    });

    return itemsInfo;

  }//End setLocationAvailable

  // -----------------------------------------------------------------------------------
  return {
    onAction: onAction
  }
});
