/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['./wmsts_big.js'],
    function (bigJS) {
        function dopost(request) {
            try {

                log.debug('requestBody', JSON.stringify(request));
                var replenQtyObj = {}
                var requestBody = request.params
                let qty=requestBody.scannedQuantity;
                //carrying forward all the inputs to next page
                replenQtyObj["availbleQuanity"] = requestBody.availbleQuanity;
                replenQtyObj["quantityArr"] = requestBody.quantityArr;
                replenQtyObj["quantityToMove"] = requestBody.quantityToMove;
                //replenQtyObj["availbleQuanity"]=requestBody.availbleQuanity;
                replenQtyObj["quantityToMovewithUOM"] = requestBody.quantityToMovewithUOM;
                replenQtyObj["scannedQuantity"] = requestBody.scannedQuantity;
                replenQtyObj["scannedStatusList"] = requestBody.scannedStatusList;
                replenQtyObj["scannedStatusLotInternalIdList"] =requestBody.lotInternalId;
                replenQtyObj["scannedStatusLotList"] = requestBody.lotName;
                replenQtyObj["scannedStatusNameList"] = requestBody.scannedStatusNameList;
                replenQtyObj["scannedStatusQtyList"] = qty.toString();
                replenQtyObj["isValid"] = true;

                let itemtype=requestBody.itemType;

                if(itemtype=="lotnumberedinventoryitem" &&  (requestBody.lotName=="" || requestBody.lotName==null))
                {
                   

                   
                        replenQtyObj["isValid"] = false;
                        replenQtyObj["errorMessage"] = "Scan or Enter Valid lot Number";
                    
                    
                }
                //Allowing over replen qty
                let toatlQty = requestBody.quantityToMove;
                let scannedQty = requestBody.scannedQuantity;
                let availbleQty = requestBody.availbleQuanity;
                log.debug('quantity to move', toatlQty);
                let remainingQty = '';
                if (scannedQty < toatlQty) {
                    remainingQty = Number(bigJS(toatlQty).minus(scannedQty));
                } else {
                    remainingQty = 0;

                }
                replenQtyObj["remainingQuantityToMove"] = remainingQty;

                //Condition to avoid picking quantity more than available qty in assigned bin
                if (scannedQty > availbleQty) {
                    replenQtyObj["isValid"] = false;
                    replenQtyObj["errorMessage"] = "Entered Quantity is greater than the available qty in bin";
                }

                log.debug('replenobj', JSON.stringify(replenQtyObj));
                return replenQtyObj;
            } catch (e) {
                log.debug('e', e.toString());
            }
        }

        return {
            post: dopost
        }
    });