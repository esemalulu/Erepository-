/**
 *
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @NModuleScope public
 *
 * Author: Phodod
 */

define(['N/record','N/search', 'N/currentRecord', 'N/ui/dialog'],
function(record,search) {
    function wfCreateTransfer(context) {

        var currentRecord = context.newRecord;
        var salesOrderID = currentRecord.id;
        var salesOrdertransID = currentRecord.getValue({fieldId: 'tranid'});;
        var SOtech = currentRecord.getValue({ fieldId: 'custbody_pick_up_technician'});
        var SOsubsidiary = currentRecord.getValue({ fieldId: 'subsidiary'}); 
        var SOLocation = currentRecord.getValue({ fieldId: 'location'});

        if(!SOLocation){throw new Error("No Location defined on the Sales Order. This is where the script takes the parts")}

        
      var techRecordType = search.lookupFields({
            type: search.Type.VENDOR,
            id: SOtech,
            columns: ['internalid']
        });

      
      if (Object.keys(techRecordType).length > 0) {
        var SOtechType = 'vendor';
        } else {
            var SOtechType = 'employee';
        }

        log.debug(techRecordType)
        log.debug("Current Sales Order ", salesOrderID);
        log.debug("Current From Location ", SOLocation);
        log.debug("Current Dest Vendor ", SOtech);




        //from location and bin
        var SOLocationRecord = record.load({
            type: 'location',
            id: SOLocation
        });
        
        var fromBin = SOLocationRecord.getValue({fieldId: 'custrecord_bin_of_location'});
        

        //to location and bin
        var destinationTechRecord = record.load({
            type: SOtechType,
            id: SOtech
        });


        var technicianName = destinationTechRecord.getValue({fieldId: 'entityid'});
        var toBin = destinationTechRecord.getValue({fieldId: 'custentity_cmms_xfer_to_tech_parts_bin'});
        var destinationBinRecord = record.load({
            type: 'bin',
            id: toBin
        });
        var toLocation = destinationBinRecord.getValue({fieldId: 'location'});

        //look up fulfillable items on the SO
        var salesorderSearchObj = search.create({
            type: "salesorder",
            filters:
            [
            ["item.isfulfillable","is","T"], 
            "AND", 
            ["type","anyof","SalesOrd"], 
            "AND", 
            ["internalidnumber","equalto", salesOrderID]
            ],
            columns:
            [
            search.createColumn({
                name: "internalid",
                join: "item",
                label: "Item ID"
            }),
            search.createColumn({
                name: "isfulfillable",
                join: "item",
                label: "Can be Fulfilled"
            }),
            search.createColumn({
                name: "itemid",
                join: "item",
                label: "Item Name"
            }),
            search.createColumn({
                name: "quantity", 
                label: "Quantity"
            }),

            search.createColumn({
                name: "line",
                label: "Line ID"
            }),
            search.createColumn({
                name: "custcol_qty_staged",
                label: "Quantity Already Transfered"
            })

            ]
        });
        const items = [];
        index = 0;

        //run through the results, only take qties not already staged
        salesorderSearchObj.run().each(function(result){
            var itemID = result.getValue(result.columns[0]);
            var qty = result.getValue(result.columns[3]);
            var lineID =  result.getValue(result.columns[4]);
            var qtyTransferred = result.getValue(result.columns[5]);

            if(qtyTransferred){
                qty = qty-qtyTransferred;
            }
            if(qty){
                items[index] = {
                    "itemID":itemID,
                    "qty":qty,
                    "lineID":lineID
                }
                index++;
            } 
            return true;
        });


        //if no quantities to stage, exit script.
        if(items.length==0){throw new Error('All items already staged');}
        
        if(SOLocation == toLocation){
            createBinTransfer();
        } else {
            createInventoryTransfer()
        }
        return updateSO(salesOrderID, items);

        function createInventoryTransfer(){
                const objRecord = record.create({
                    type: 'inventorytransfer',
                    isDynamic: true
                });
    
                objRecord.setValue({
                    fieldId: "subsidiary",
                    value: SOsubsidiary
                }); 
    
                objRecord.setValue({
                    fieldId: 'trandate',
                    value: new Date()
                });
    
                objRecord.setValue({
                    fieldId: "location",
                    value: SOLocation
                });
    
                objRecord.setValue({
                    fieldId: "transferlocation",
                    value: toLocation
                });
    
                objRecord.setValue({
                    fieldId: "memo",
                    value: "Parts Staging for " + salesOrdertransID + " to be delivered by " + technicianName
                });
    
                objRecord.setValue({
                    fieldId: "custbody_associated_sales_order",
                    value: salesOrderID
                });
                
    
                log.debug('items',JSON.stringify(items));
    
                for(var x = 0; x < items.length; x++ ){
    
                    var currentItem = items[x];
                    var currentItemID = currentItem.itemID;
                    var currentItemQty = currentItem.qty;
    
                    objRecord.selectNewLine({            
                            sublistId: 'inventory'      
                        });
                    
                    objRecord.setCurrentSublistValue({  
                            sublistId: 'inventory',
                            fieldId: 'item',
                            value: currentItemID
                        });
                    
                    objRecord.setCurrentSublistValue({
                            sublistId: 'inventory',
                            fieldId: 'adjustqtyby',
                            value: currentItemQty
                        });
                    
                    var sublist = 'inventoryassignment';
    
                    var subrec = objRecord.getCurrentSublistSubrecord({
                        sublistId: 'inventory',
                        fieldId: 'inventorydetail'
                    });
    
                    subrec.selectNewLine({
                            sublistId: sublist,
                    });
                    
                    var objField = subrec.getSublistField({
                        sublistId: sublist,
                        fieldId:'binnumber',
                        line: 0
                    })
                
                    var objField2 = subrec.getSublistField({
                        sublistId: sublist,
                        fieldId:'tobinnumber',
                        line: 0
                    })
            
                    subrec.setCurrentSublistValue({
                        sublistId: sublist,
                        fieldId: 'binnumber',
                        value: fromBin
                    });
    
                    subrec.setCurrentSublistValue({
                        sublistId: sublist,
                        fieldId: 'tobinnumber',
                        value: toBin
                    });
    
                    subrec.setCurrentSublistValue({
                        sublistId: sublist,
                        fieldId: 'quantity',
                        value: currentItemQty
                    });
    
                    subrec.commitLine({
                        sublistId: sublist
                    });
    
                    objRecord.commitLine({                  
                        sublistId: 'inventory'
                    });
    
                }
                var recordId = objRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
    
                return log.debug("Inventory Transfer Created.", "id: " + recordId);
        }
        function createBinTransfer(){
            const objRecord = record.create({
                type: 'bintransfer',
                isDynamic: true
            });
    
            objRecord.setValue({
                fieldId: 'trandate',
                value: new Date()
            });
            objRecord.setValue({
                fieldId: 'subsidiary',
                value: SOsubsidiary
            });
    
            objRecord.setValue({
                fieldId: "location",
                value: SOLocation
            });
    
            objRecord.setValue({
                fieldId: "memo",
                value: "Parts Staging for " + salesOrdertransID
            })
            objRecord.setValue({
                fieldId: "custbody_associated_sales_order",
                value: salesOrderID
            });
            
        
            for(var x = 0; x < items.length; x++ ){
                var currentItem = items[x];
                var currentItemID = currentItem.itemID;
                var currentItemQty = currentItem.qty;
    
                log.debug("bad value is " + currentItemID)
                log.debug(typeof(currentItemID))
    
                objRecord.selectNewLine({
                        sublistId: 'inventory'    
                    });
                
    
                objRecord.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'item',
                    value: currentItemID
                });
                
                objRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'quantity',
                        value: currentItemQty                  
                    });
                
                var sublist = 'inventoryassignment';
    
    
                var subrec = objRecord.getCurrentSublistSubrecord({
                    sublistId: 'inventory',
                    fieldId: 'inventorydetail'
                });
    
                subrec.selectNewLine({
                        sublistId: sublist,
                });
            
                var objField = subrec.getSublistField({
                    sublistId: sublist,
                    fieldId:'binnumber',
                    line: 0
                })
            
                var binnumberList = objField.getSelectOptions();
            
                var objField2 = subrec.getSublistField({
                    sublistId: sublist,
                    fieldId:'tobinnumber',
                    line: 0
                })
    
                var tobinList = objField2.getSelectOptions();
            
                subrec.setCurrentSublistValue({
                    sublistId: sublist,
                    fieldId: 'binnumber',
                    value: fromBin
                });
    
                subrec.setCurrentSublistValue({
                    sublistId: sublist,
                    fieldId: 'tobinnumber',
                    value: toBin
                });
    
    
                subrec.setCurrentSublistValue({
                    sublistId: sublist,
                    fieldId: 'quantity',
                    value: currentItemQty
                });
    
    
                subrec.commitLine({
                    sublistId: sublist
                });
    
                objRecord.commitLine({
                    sublistId: 'inventory'
                });
            }
    
            var recordId = objRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            
            log.debug("Inventory Transfer Created.", "id: " + recordId)
        
            return recordId;
        }

       }

    function updateSO(salesOrderID, items){
        var soRecord = record.load({
            type:'salesorder',
            id:salesOrderID
        });
        var lineCount = soRecord.getLineCount({
            sublistId: 'item'
        })

        for (var x = 0; x < lineCount; x++) {

            var lineId = soRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'line',
                line: x
            });
            
            var itemArr = items.filter(function(item) {
                log.debug('item.lineID',item.lineID)
                return item.lineID === lineId;
            });

            var item = itemArr.length > 0 ? itemArr[0] : null;
            
        if (item) {
                var qtyAlreadyTransferred = soRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_qty_staged',
                    line: x
                });

                soRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_qty_staged',
                    line: x,
                    value: qtyAlreadyTransferred + item.qty
                });

            } else {
                continue }
        }  
        return soRecord.save();
    }
   return {
       onAction : wfCreateTransfer
   }

})