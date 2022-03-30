/**
*@NApiVersion 2.x
*@NScriptType UserEventScript
*/
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {
  function afterSubmit(context) {
    try {
      var itemTypeLookup = {
        "Assembly": record.Type.ASSEMBLY_ITEM,
        "Inventory Item": record.Type.INVENTORY_ITEM,
        "Lot-numbered Inventory Item": record.Type.LOT_NUMBERED_INVENTORY_ITEM,
        "Lot-numbered Assembly Item": record.Type.LOT_NUMBERED_ASSEMBLY_ITEM,
        "Serialized Inventory Item": record.Type.SERIALIZED_INVENTORY_ITEM,
        "Serialized Assembly Item": record.Type.SERIALIZED_INVENTORY_ITEM,
        "Non-inventory Item": record.Type.NON_INVENTORY_ITEM,
        "Discount": record.Type.DISCOUNT_ITEM,
        "Other Charge": record.Type.OTHER_CHARGE_ITEM,
        "Service": record.Type.SERVICE_ITEM,
        "Description": record.Type.DESCRIPTION_ITEM
      };

      if (context.type == context.UserEventType.DELETE)
      return;

      var newRec = context.newRecord;
      var vendor = newRec.getValue({
        fieldId: 'custrecord_tjinc_dwvpur_vendor'
      });
      var currency = newRec.getValue({
        fieldId: 'custrecord_dw_vendor_currency'
      });
      var currencyId = newRec.getValue({
        fieldId: 'custrecord_dw_vendor_currency'
      });
      var itemId = newRec.getValue({
        fieldId: 'custrecord_tjinc_dwvpur_itemname'
      });

      var vendorPartNo = newRec.getValue({
        fieldId: 'custrecord_vendor_part'
      });
      var vltPreferred = newRec.getValue({
        fieldId: 'custrecord155963581'
      });
      var newPrice = parseFloat(newRec.getValue({fieldId: 'custrecord_price'}));
      var preferredText = '';

      var prefferCheck = checkBothNonPreffered(itemId, vendor);

      if(prefferCheck == false && vltPreferred == false)
      return;

      var itemType = "";
      var itemSearchObj = search.create({
        type: "item",
        filters:
        [
          ["internalid", "anyof", itemId]
        ],
        columns:
        [
          search.createColumn({ name: "itemid", label: "Name" }),
          search.createColumn({ name: "type", label: "Type" }),
          search.createColumn({ name: "subtype", label: "SubType" }),
          search.createColumn({ name: "isserialitem", label: "Is Serialized Item" })
        ]
      });
      var searchResultCount = itemSearchObj.runPaged().count;
      itemSearchObj.run().each(function (result) {
        itemType = result.getText({ name: 'type' });

        if (result.getValue({ name: 'isserialitem' }) === true && itemType == 'Inventory Item') {
          itemType = "Serialized Inventory Item";
        } else if (result.getValue({ name: 'isserialitem' }) === true && itemType == 'Assembly') {
          itemType = "Serialized Assembly Item";
        }
        return true;
      });

      var itemRec = record.load({
        type: itemTypeLookup[itemType],
        id: itemId,
        isDynamic: true
      });

      var vendorLc = itemRec.getLineCount({
        sublistId: 'itemvendor'
      });

      var vendorInList = false;

      if(vendorLc > 0){
        for (var i = 0; i < vendorLc; i++) {
          itemRec.selectLine({
            sublistId: 'itemvendor',
            line: i
          });
          var listVendor = itemRec.getCurrentSublistValue({
            sublistId: 'itemvendor',
            fieldId: 'vendor'
          });

          if(listVendor == vendor){
            vendorInList = true;

            itemRec.setCurrentSublistValue({
              sublistId: 'itemvendor',
              fieldId: 'vendorcode',
              value: vendorPartNo
            });

            if(vltPreferred) {
              itemRec.setCurrentSublistValue({
                sublistId: 'itemvendor',
                fieldId: 'preferredvendor',
                value: vltPreferred
              });
            }

            var subRec = itemRec.getCurrentSublistSubrecord({
              sublistId: 'itemvendor',
              fieldId: 'itemvendorprice'
            });


            var subLc = subRec.getLineCount({
              sublistId: 'itemvendorpricelines'
            });

            for (var z = 0; z < subLc; z++) {
              subRec.selectLine({
                sublistId: 'itemvendorpricelines',
                line: z
              });
              var subRecCurr = subRec.getCurrentSublistText({
                sublistId: 'itemvendorpricelines',
                fieldId: 'vendorcurrency'
              });
              var subRecAmt = subRec.getCurrentSublistValue({
                sublistId: 'itemvendorpricelines',
                fieldId: 'vendorprice'
              });
            }
            if(subRecCurr == currency){
              subRec.setCurrentSublistValue({
                sublistId: 'itemvendorpricelines',
                fieldId: 'vendorprice',
                value: newPrice,
                ignoreFieldChange: true
              });
              subRec.commitLine({
                sublistId: 'itemvendorpricelines'
              });
              break;
            }
            break;
          }

        }
        log.debug({title:'DEBUG',details:'Updating in If'})
        itemRec.commitLine({
          sublistId: 'itemvendor'
        });
        if(!vendorInList) {
          itemRec.selectNewLine({sublistId:'itemvendor'});
          itemRec.setCurrentSublistValue({
            sublistId: 'itemvendor',
            fieldId: 'vendor',
            value: vendor
          });
          itemRec.setCurrentSublistValue({
            sublistId: 'itemvendor',
            fieldId: 'vendorcode',
            value: vendorPartNo
          });
          itemRec.setCurrentSublistValue({
            sublistId: 'itemvendor',
            fieldId: 'preferredvendor',
            value: vltPreferred
          });
          var subRec = itemRec.getCurrentSublistSubrecord({
            sublistId: 'itemvendor',
            fieldId: 'itemvendorprice'
          });
          subRec.selectLine({
            sublistId: 'itemvendorpricelines',
            line: 0
          });
          subRec.setCurrentSublistValue({
            sublistId: 'itemvendorpricelines',
            fieldId: 'vendorprice',
            value: newPrice,
            ignoreFieldChange: true
          });
          var currencySelect = getCurrency(currency);
          subRec.setCurrentSublistValue({
            sublistId: 'itemvendorpricelines',
            fieldId: 'vendorcurrency',
            value: currencySelect,
            ignoreFieldChange: true
          });
          subRec.commitLine({
            sublistId: 'itemvendorpricelines'
          });
          itemRec.commitLine({
            sublistId: 'itemvendor'
          });
        }
      }
      else {
        itemRec.selectNewLine({
          sublistId: 'itemvendor'
        });
        itemRec.setCurrentSublistValue({
          sublistId: 'itemvendor',
          fieldId: 'vendor',
          value: vendor
        });

        itemRec.setCurrentSublistValue({
          sublistId: 'itemvendor',
          fieldId: 'vendorcode',
          value: vendorPartNo
        });
        itemRec.setCurrentSublistValue({
          sublistId: 'itemvendor',
          fieldId: 'preferredvendor',
          value: vltPreferred
        });

        var currencySelect = getCurrency(currency);
        var subRec = itemRec.getCurrentSublistSubrecord({
          sublistId: 'itemvendor',
          fieldId: 'itemvendorprice'
        });
        subRec.selectNewLine({
          sublistId: 'itemvendorpricelines'
        });

        subRec.setCurrentSublistValue({
          sublistId: 'itemvendorpricelines',
          fieldId: 'vendorcurrency',
          value: currencySelect
        });

        subRec.setCurrentSublistValue({
          sublistId: 'itemvendorpricelines',
          fieldId: 'vendorprice',
          value: newPrice
        });

        subRec.commitLine({
          sublistId: 'itemvendorpricelines'
        });

        itemRec.commitLine({
          sublistId: 'itemvendor'
        });
      }

      itemRec.save({ignoreMandatoryFields: true});
    }catch (error){
      log.error({
        title: 'afterSubmit',
        details: error.message
      });
    }
  }
  function checkBothNonPreffered(itemInternalId, vendorInternalId) {
    var bothNonPreffered = true;
    var customrecord_tjinc_dwvpur_vendorleadSearchObj = search.create({
      type: "customrecord_tjinc_dwvpur_vendorlead",
      filters:
      [
        ["custrecord_tjinc_dwvpur_itemname","anyof", itemInternalId],
        "AND",
        ["custrecord_tjinc_dwvpur_vendor","anyof", vendorInternalId]
      ],
      columns:
      [
        search.createColumn({name: "custrecord155963581", label: "Default Manufacturer"})
      ]
    });
    var searchResultCount = customrecord_tjinc_dwvpur_vendorleadSearchObj.runPaged().count;
    log.debug("customrecord_tjinc_dwvpur_vendorleadSearchObj result count",searchResultCount);
    customrecord_tjinc_dwvpur_vendorleadSearchObj.run().each(function(result){
      var defaultManufacturer = result.getValue({
        name: "custrecord155963581", label: "Default Manufacturer"
      });

      if(defaultManufacturer){
        bothNonPreffered = false;
        return true;
      }
    });
    return bothNonPreffered;
  }
  function getCurrency(currency) {

    var currencySearch = search.create({
      type: record.Type.CURRENCY,
      filters:
      [
        ["name", "is", currency]
      ],
      columns:
      [
        search.createColumn({
          name: 'name',
          label: 'name'
        })
      ],
    });
    var searchResults = currencySearch.run().getRange({ start: 0, end: 1000 });

    return searchResults[0].id;
  }

  return {
    afterSubmit: afterSubmit
  }
});
