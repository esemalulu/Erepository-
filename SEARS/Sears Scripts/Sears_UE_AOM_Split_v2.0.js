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
 * Module Description: 
 * 
 * User script will be developed to split inventory item on sales order when quantity is back ordered.
 *
 * Version    Date            Author           Remarks
 * 1.00       23 Sept 2016    mjpascual        initial
 * 1.01       27 Jan 2017     Balaraman        Automatic location Assignment for setting SO Ready for Post Processing   /*x*./ marked script
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * 
 */
define(['N/record', 'N/runtime', './NSUtil', 'N/error', 'N/search', './LibJsonRequest'], function(record, runtime, NSUtil, error, search, libJsonReq)
{
    
    function afterSubmit_splitInvItem(context)
    {
    	// Set the method name
        var stLogTitle = 'afterSubmit_splitInvItem';
        try
        {
            log.debug(stLogTitle, '>> Entry Log <<');
            log.debug(stLogTitle, 'context.type = ' + context.type);
            // Check if delete type
            if (context.type == context.UserEventType.DELETE)
            {
                return;
            }
            // Get the exception role
            var stRestrictedRole = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role');
            // Get the user information
            var objUser = runtime.getCurrentUser();
            log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);
            // Compare user role and exception role
            if(objUser.role == stRestrictedRole)
            {
                log.debug(stLogTitle, 'exiting...');
                return;
            }
            // Hold the nearest location data
            var objNearestLocation = null;
            // Get the context 
            var recNew = context.newRecord;
            // Load the current record
            var recCurrent = record.load({"type": recNew.type, "id": recNew.id, "isDynamic": true});

/*x*/       //Auto assigning locations before aom split
/*x*/       //if(context.UserEventType.CREATE){
                log.debug(stLogTitle + '::CREATE');
                var stProvince = recCurrent.getValue('shipstate');

                if (!NSUtil.isEmpty(stProvince)) {
                    // Get the nearest location data
                    var objNearestLocation = getNearestAvailableLocation(stProvince);

                    if(!NSUtil.isEmpty(objNearestLocation)){
                        log.debug(stLogTitle, JSON.stringify(objNearestLocation)); ////////
                        objNearestLocation = JSON.stringify(objNearestLocation);
                        var a = JSON.parse(objNearestLocation);

                        for(var i=0; i < recCurrent.getLineCount('item'); i++){
                            var stItemType =  recCurrent.getSublistValue({sublistId : 'item', fieldId : 'itemtype', line : i});
                            if(stItemType != 'InvtPart'){
                                continue;
                            }

                            var isBigItem =  recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_bigticket', line : i});
                            if(isBigItem){
                                var values = a['values'];
                                var locatId = values['custrecord_avail_loc_mapping_big_ticket'][0]['value'];
                                log.debug("Nearest Bigitem location Id: ", locatId);

                                recCurrent.selectLine({
                                    sublistId: 'item',
                                    line: i
                                });
                                var oldLocation = recCurrent.getCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'location'
                                });
                                //if(oldLocation == '' || oldLocation == null || oldLocation == undefined){
                                    recCurrent.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'location',
                                        value: a['values']['custrecord_avail_loc_mapping_big_ticket'][0]['value']
                                    });
    /*                              recCurrent.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'location',
                                        line: i,
                                        value: a['values']['custrecord_avail_loc_mapping_big_ticket'][0]['value']
                                    });*/
                                    log.debug(stLogTitle, "HubId/Location has been Set");
                                //}
                            }
                        }
                    }
                }
/*x*/       //}

			// Get the state/province
			var stProvince = recCurrent.getValue('shipstate');
			// Check if there is shipping province/state
			if (!NSUtil.isEmpty(stProvince)) {
				// Get the nearest location data
				objNearestLocation = getNearestAvailableLocation(stProvince);
			}
            // Get the sales order status
            var stStatus = recCurrent.getValue('status');
            log.debug(stLogTitle, 'stStatus = ' + stStatus);
            // Check if status is 'Pending Fulfillment'
            if(stStatus != 'Pending Fulfillment')
            {
                return;
            }
            // Check if splitting is already done
            if (recCurrent.getValue('custbody_so_ready_for_postprocessing')) {
            	log.debug(stLogTitle, 'Splitting is already done.');
            	return;
            }
            // Hold the split quantity
            var flSplitQty = 0.00;
            // Hold the new quantity
            var flNewQuantity = 0.00;
            // Hold the flag for delete
            var blnIsDeleted = false;
            // Hold the AOM split data list
            var arrAOMSplitDataList = [];
            // Hold the highest available
            var flHighestAvailable = 0.00;
            // Hold the related service item
            var objRelatedServiceItem = null;
            // Get the highest location available
            var objItemData = getItemHighestLocationAvailable(recCurrent);
            // Hold the location
            var strLocation = null;
            // Iterate the line item
            for(var intLinenum = 0; intLinenum < recCurrent.getLineCount('item');  intLinenum++)
            {
                // Reset the related service item
            	objRelatedServiceItem = null;
                // Reset the split quantity
                flSplitQty = 0.00;
                // Reset the flag
                blnIsDeleted = false;
                // Reset
                flHighestAvailable = 0.00;
                // Reset location
                strLocation = null;
                // Get the item type
                var stItemType =  recCurrent.getSublistValue({sublistId : 'item', fieldId : 'itemtype', line : intLinenum});
                //Get only inventory items only
                if(stItemType != 'InvtPart')
                {
                    continue;
                }
                // Get the reference vas/warranty reference item
                var stVASWarrRefID = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_vas_reference_id', line : intLinenum});
                // Get the levy reference item
                var stLevyRefID = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_levy_ref_id', line : intLinenum});
                // Check if there is related service item
                if (!NSUtil.isEmpty(stVASWarrRefID) || !NSUtil.isEmpty(stLevyRefID)) {
                	// Get the related service item
                	objRelatedServiceItem = getRelatedServiceItems(recCurrent, stVASWarrRefID, stLevyRefID, intLinenum);
                }
                
                // Get the available quantity
                var flAvailableQty =  NSUtil.forceFloat(recCurrent.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'quantityavailable',
                    line : intLinenum
                }));
                // Get the quantity
                var flOrderedQty =  NSUtil.forceFloat(recCurrent.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'quantity',
                    line : intLinenum
                }));
                // Get the committed quantity
                var flCommittedQty =  NSUtil.forceFloat(recCurrent.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'quantitycommitted',
                    line : intLinenum
                }));
                // Get the location
                var stLocation =  recCurrent.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'location',
                    line : intLinenum
                });
                // Get the back order
                var flBackOrderedQty =  NSUtil.forceFloat(recCurrent.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'quantitybackordered',
                    line : intLinenum
                }));
                log.debug(stLogTitle, 'Back Order : '+ flBackOrderedQty + ' | Available Quantity : '+ flAvailableQty + ' | Ordered Quantity : '+flOrderedQty + ' | Committed Quantity : '+flCommittedQty  + ' | Location : '+stLocation );
                // Back order must be greater than 0 and location is available and sent to apigee is false
                if(flBackOrderedQty > 0 && !NSUtil.isEmpty(stLocation) && recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_sent_to_apigee', line : intLinenum}) == false)
                {
                	// Get the item
                    var stItem =  recCurrent.getSublistValue({sublistId : 'item', fieldId : 'item', line : intLinenum});
                    // Get the rate
                    var flRate =  NSUtil.forceFloat(recCurrent.getSublistValue({sublistId : 'item', fieldId : 'rate', line : intLinenum}));
                    // Get the price level
                    var stPriceLevel = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'price', line : intLinenum});
                    // Get Description
                    var stDescription = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'description', line : intLinenum});
                    // Get the promo code
                    var stPromoCode = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_promo_code', line : intLinenum});
                    log.debug(stLogTitle, 'Item : ' + stItem + ' | Rate : ' + flRate + ' | Price Level : ' + stPriceLevel +
                    		' | Description : ' + stDescription + ' | Promo Code : ' + stPromoCode);
                    if (!NSUtil.isEmpty(objItemData[stItem])) {
                        // Get the highest location available
                        flHighestAvailable = NSUtil.forceFloat(objItemData[stItem].quantity);
                        // Get the location
                        strLocation = objItemData[stItem].location;
                    }
                    log.debug(stLogTitle, 'Highest Location Available : ' + flHighestAvailable);
                    // Select line level
                    recCurrent.selectLine({'sublistId': 'item', 'line': intLinenum});
                    // Check the highest available
                    if (flHighestAvailable == 0.00 && flCommittedQty > 0 ) {
                        log.debug(stLogTitle, 'No More Available Quantity.');
                        // Compute the new quantity of the original item
                        flNewQuantity = NSUtil.forceFloat(flOrderedQty - flBackOrderedQty);
                        log.debug(stLogTitle, 'New Quantity : ' + flNewQuantity + ', intLinenum ='+intLinenum);
                        recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: flNewQuantity});
                        recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: ''});
                        flSplitQty = flBackOrderedQty;
                    } else {
                    	// Highest available must not 0
                    	if (flHighestAvailable != 0.00) {
                    		if (flOrderedQty > flHighestAvailable) {
                                // Compute the new quantity of the original item
                                flNewQuantity = flOrderedQty - flHighestAvailable;
                                log.debug(stLogTitle, 'New Quantity : ' + flNewQuantity);
                                recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: flNewQuantity});
                                recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: ''});
                                flSplitQty = flHighestAvailable;
                            } else {
                                if ((flOrderedQty - flHighestAvailable) == 0 && flCommittedQty == 0) {
                                    log.debug(stLogTitle, 'Remove Line Level');
                                    // Remove line level and corresponding service item
                                    removeLinelevel(recCurrent, stVASWarrRefID, stLevyRefID);
                                    recCurrent.removeLine({sublistId: 'item', line : intLinenum});
                                    // Set the flag
                                    blnIsDeleted = true;
                                } else {
                                	if (flBackOrderedQty < flHighestAvailable) {
                                    	// Compute the new quantity of the original item
                                        log.debug(stLogTitle, 'New Quantity : ' + flCommittedQty);
                                        recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: flCommittedQty});
                                        recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: ''});
                                	}
                                	flSplitQty = flBackOrderedQty;
                                }
                            }
                    	} else {
                    		log.debug(stLogTitle, 'Available Quantity : ' + flAvailableQty + ' | Committed Quantity : ' + flCommittedQty);
                    		// Check availability and committed count is 0
                    		if (flAvailableQty == 0 && flCommittedQty == 0) {
                    			log.debug(stLogTitle, 'Back Order Location Flag : ' + 
                    					recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_backorder_location', line : intLinenum}));
                    			// Check if the back order location is not yet set
                    			if (!recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_backorder_location', line : intLinenum})) {
                        			log.debug(stLogTitle, 'Big Ticket Flag : ' + 
                        					recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_bigticket', line : intLinenum}));
                        			// Check if big item
                        			if (recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_bigticket', line : intLinenum})) {
                        				// Set the location
                        				recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: objNearestLocation.getValue('custrecord_avail_loc_mapping_big_ticket')});
                        			} else {
                        				// Set the location
                        				recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: objNearestLocation.getValue('custrecord_avail_loc_mapping_small_tcket')});
                        			}
                        			// Set the flag
                        			recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_backorder_location', value: true});
                    			}
                    		}
                    	}
                    }
                    // Check if not deleted and commit the update line
                    if (!blnIsDeleted) {
                        recCurrent.commitLine({"sublistId": "item"});
                    }                    		
                    // Split quantity must not be 0
                    if(flSplitQty > 0)
                    {
                    	// Set the AOM split data
                        arrAOMSplitDataList.push({'item': stItem, 'quantity' : flSplitQty, 
                        						  'rate' : flRate, 'relatedservice' : objRelatedServiceItem,
                        						  'pricelevel' : stPriceLevel,
                        						  'description' : stDescription,
                        						  'location' : strLocation,
                        						  'promocode' : stPromoCode
                        						});
                    }
                }
            }
            // Add newline level for AOM split data
            addAOMSplitData(arrAOMSplitDataList, recCurrent);
            // Update the location of the service item
            updateServiceItem(recCurrent);
            // Check if the AOM split is done
            if (!recCurrent.getValue('custbody_so_ready_for_postprocessing') && isAOMSplitDone(recCurrent)) {
            	// Set the flag
            	recCurrent.setValue('custbody_so_ready_for_postprocessing', true);
//            	// Check if applicable for booking
//                if (recCurrent.getValue('custbody_delivery_date') && recCurrent.getValue('custbody_shipping_schedule') && 
//                		!recCurrent.getValue('custbody_sears_booking_info'))
//                {
//                    try {
//                    	// Verify and booked to ClearD
//                        libJsonReq.verifyBooking(recNew.id, 'salesorder');
//                    } catch (err_booking) {
//                    	log.error('ERROR' , err_booking.name + ' ' + err_booking.message);
//                    }
//                }
            }
            var stRecID = recCurrent.save();
            log.audit(stLogTitle, 'Update Record ID : ' + stRecID);
        }
        catch (e)
        {
            if (e.message != undefined)
            {
                log.error('ERROR' , e.name + ' ' + e.message);
                throw e.name + ' ' + e.message;
            }
            else
            {
                log.error('ERROR', 'Unexpected Error' , e.toString()); 
                throw error.create({
                    name: '99999',
                    message: e.toString()
                });
            }
        }
        finally
        {
            log.debug(stLogTitle, '>> Exit Log <<');
        }
    }
    
    /**
     * 
     */
    function getNearestAvailableLocation(stProvince) {
        var stLogTitle = 'getNearestAvailableLocation';
        log.debug(stLogTitle, '>> Entry Log <<');
        log.debug(stLogTitle, 'Province : ' + stProvince);
        // Hold the location data
        var objLocationData = null;
        var arrFilters = [];
        arrFilters.push(search.createFilter({name: 'isinactive', operator: 'IS', values : ['F']}));
        // Set the column
        var arrColumns = [];
        arrColumns.push(search.createColumn({name: 'custrecord_avail_loc_mapping_big_ticket'}));
        arrColumns.push(search.createColumn({name: 'custrecord_avail_loc_mapping_small_tcket'}));
        arrColumns.push(search.createColumn({name: 'custrecord_avail_loc_mapping_province'}));
        // Create levy amount search
        var objNearestLoSearch = search.create({
        	type: 'customrecord_nearest_avail_loc_mapping',
        	columns: arrColumns,
        	filters: arrFilters
        });
        // Run search and get the last instance of levy amount
        objNearestLoSearch.run().each(function(result) {
        	// Compare the province
        	if (result.getText('custrecord_avail_loc_mapping_province') == stProvince) {
            	// Get levy amount
            	objLocationData = result;
        	}
        	return true;
        });
        log.debug(stLogTitle, 'Return : ' + JSON.stringify(objLocationData));
        log.debug(stLogTitle, '>> Exit Log <<');
        return objLocationData;
    }
    
    /**
     * 
     */
    function removeLinelevel(recCurrent, stVASWarrRefID, stLevyRefID) {
        var stLogTitle = 'removeLinelevel';
        log.debug(stLogTitle, '>> Entry Log <<');
        // Iterate line level
        for (var intLinenum = recCurrent.getLineCount('item')-1 ; intLinenum <= 0; intLinenum++) {
        	// Compare reference id
        	if (stVASWarrRefID == recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_vas_reference_id', line : intLinenum}) ||
        		stLevyRefID == recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_levy_ref_id', line : intLinenum})) {
            	// remove line level
            	recCurrent.removeLine({sublistId: 'item', line : intLinenum});
        	}
        }
        log.debug(stLogTitle, '>> Exit Log <<');
    }
    
    /**
     * 
     */
    function updateServiceItem(recCurrent) {
        var stLogTitle = 'updateServiceItemLocation';
        log.debug(stLogTitle, '>> Entry Log <<');
        // Hold the item type
        var stItemType = null;
        // Hold the vas/warr reference id
        var stVASWarrRefId = null;
        // Hold the levy reference id
        var stLevyRefId = null;
        // Hold the location
        var stLocation = null;
        // Get the quantity
        var intQuantity = 0;
        // Hold the item
        var stItem = null;
        // Hold the current vas/warranty reference id
        var stCurrentVASWarrRefID = null;
        // Hold the current levy reference id
        var stCurrentLevyRefID = null
        // Hold the VAS/warranty ref item
        var stVASWarrRefItem = null;
        // Hold the levy ref item
        var stLevyRefItem = null;
        // Get the line count
        var intLinecount = recCurrent.getLineCount('item');
        // Iterate the line item
        for(var intOuterLinenum = 0; intOuterLinenum < intLinecount;  intOuterLinenum++) {
            // Get the item type
            stItemType =  recCurrent.getSublistValue({sublistId : 'item', fieldId : 'itemtype', line : intOuterLinenum});
            // Get only inventory items only
            if(stItemType != 'InvtPart')
            {
                continue;
            }
            // Get the item
            stItem = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'item', line : intOuterLinenum});
            // Get the vas/warr reference id
            stVASWarrRefId = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_vas_reference_id', line : intOuterLinenum});
            // Get the levy reference id
            stLevyRefId = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_levy_ref_id', line : intOuterLinenum});
        	// Get the location
        	stLocation = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'location', line : intOuterLinenum});
        	// Get the location
        	intQuantity = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'quantity', line : intOuterLinenum});
        	log.debug(stLogTitle, 'Item : ' + stItem + ' | VAS/Warranty Reference ID : ' + stVASWarrRefId + ' | Levy Reference ID : ' + stLevyRefId + 
        			' | Location : ' + stLocation + ' | Quantity : ' + intQuantity);
            // Iterate the line item
            for(var intInnerLinenum = intOuterLinenum + 1; intInnerLinenum < intLinecount;  intInnerLinenum++) {
                // Get the item type
                stItemType =  recCurrent.getSublistValue({sublistId : 'item', fieldId : 'itemtype', line : intInnerLinenum});
                // Get the current vas/warranty reference id
                stCurrentVASWarrRefID = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_vas_reference_id', line : intInnerLinenum});
                // Get the VAS/warranty ref item
                stVASWarrRefItem = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_vas_reference_item', line : intInnerLinenum});
                // Get the current levy reference id
                stCurrentLevyRefID = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_levy_ref_id', line : intInnerLinenum});
                // Get the levy ref item
                stLevyRefItem = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_levy_ref_item', line : intInnerLinenum});;
                // Get only inventory items only
                if((stItemType != 'Service' && stItemType != 'OthCharge') || NSUtil.isEmpty(stLocation))
                {
                    continue;
                }
                log.debug(stLogTitle, 'Linecount : ' + intInnerLinenum + ' | Current VAS/Warranty Reference ID : ' + stCurrentVASWarrRefID + ' | Current Levy Reference ID : ' + stCurrentLevyRefID + 
            			' | Location : ' + stLocation + ' | Quantity : ' + intQuantity + ' | Reference VAS/Warrenty Item : ' + stVASWarrRefItem + ' | Reference Levy Item : ' + stLevyRefItem);
                // Compare the vas/warranty reference id
                if (!NSUtil.isEmpty(stVASWarrRefId)&& stVASWarrRefId == stCurrentVASWarrRefID && stItem == stVASWarrRefItem) {
                    // Update the location
                    recCurrent.selectLine({'sublistId': 'item', 'line': intInnerLinenum});
                	recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: intQuantity});
                	recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: stLocation});
                    recCurrent.commitLine({sublistId: 'item'});
                }
                // Compare the levy reference id
                if (!NSUtil.isEmpty(stLevyRefId) &&	stLevyRefId ==  stCurrentLevyRefID && stItem == stLevyRefItem) {
                    // Update the location
                    recCurrent.selectLine({'sublistId': 'item', 'line': intInnerLinenum});
                	recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: intQuantity});
                	recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: stLocation});
                    recCurrent.commitLine({sublistId: 'item'});
                }
            }
        }
        log.debug(stLogTitle, '>> Exit Log <<');
    }
    
    /**
     * 
     */
    function addAOMSplitData(arrAOMSplitDataList, recCurrent) {
        var stLogTitle = 'addAOMSplitData';
        log.debug(stLogTitle, '>> Entry Log <<');
        log.debug(stLogTitle, 'AOM Split Data List : '+JSON.stringify(arrAOMSplitDataList));
        // Hold the related service item
        var objRelatedServiceItem = null;
        // Hold the item
        var stItem = null;
        // Hold the quantity
        var intQuantity = null;
        // Hold the vas/warranty list
        var arrVASWarrServiceList = [];
        // Hold the levy item
        var arrLevyServiceList = [];
        // Hold the reference id
        var stRefID = null;
        // Hold the AOM split data
        var objAOMSplitData = null;
        // Hold the amount
        var flAmount = 0.00;
        // Iterate the AOM data list
        for(var intLinenum = 0; intLinenum < arrAOMSplitDataList.length; intLinenum++)
        {
        	// Get the AOM Data
            objAOMSplitData = arrAOMSplitDataList[intLinenum];
            log.debug(stLogTitle, 'objAOMSplitData : ' + JSON.stringify(objAOMSplitData));
            // Get the quantity
            intQuantity = objAOMSplitData.quantity;
            // Get the item
            stItem = objAOMSplitData.item;
            // Calculate Amount
    		flAmount = NSUtil.forceFloat(objAOMSplitData.rate) * NSUtil.forceFloat(intQuantity);
        	// Create reference id
    		stRefID = new Date().getTime();
            // Add new line level
            recCurrent.selectNewLine({sublistId: 'item'});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: stItem});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: intQuantity});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'price', value: objAOMSplitData.pricelevel});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: objAOMSplitData.rate});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: objAOMSplitData.location});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_vas_reference_id', value: stRefID});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_levy_ref_id', value: stRefID});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'description', value: objAOMSplitData.description});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: NSUtil.forceFloat(flAmount)});
            recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_promo_code', value: objAOMSplitData.promocode});
            recCurrent.commitLine({sublistId: 'item'});
            
            // Get the related service item
            objRelatedServiceItem = objAOMSplitData.relatedservice;
            // Check if not empty
            if (!NSUtil.isEmpty(objRelatedServiceItem)) {
                // Get the vas/warranty related item
                arrVASWarrServiceList = objRelatedServiceItem.vaswarranty;
                // Get the levy item
                arrLevyServiceList = objRelatedServiceItem.levy;
                // Iterate vas/warranty item
                for (var intVASWarrIndex = 0; intVASWarrIndex < arrVASWarrServiceList.length; intVASWarrIndex++) {
                    recCurrent.selectNewLine({sublistId: 'item'});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: arrVASWarrServiceList[intVASWarrIndex]});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: intQuantity});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value : objAOMSplitData.location});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_vas_reference_id', value: stRefID});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_vas_reference_item', value: stItem});
                    recCurrent.commitLine({sublistId: 'item'});
                }
                
                // Iterate levy item
                for (var intLevyIndex = 0; intLevyIndex < arrLevyServiceList.length; intLevyIndex++) {
                    recCurrent.selectNewLine({sublistId: 'item'});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: arrLevyServiceList[intLevyIndex]});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: intQuantity});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value : objAOMSplitData.location});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_levy_ref_id', value: stRefID});
                    recCurrent.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_levy_ref_item', value: stItem});
                    recCurrent.commitLine({sublistId: 'item'});
                }
            }
        }
        log.debug(stLogTitle, '>> Exit Log <<');
    }

    /**
     * 
     */
    function getRelatedServiceItems(recCurrent, stVASWarrRefID, stLevyRefID, intCurrentIndex) {
        var stLogTitle = 'getRelatedServiceItem';
        log.debug(stLogTitle, '>> Entry Log <<');
        // Hold the item type
        var stItemType = null;
        // Hold the current vas/warranty reference id
        var stCurrentVASWarrRefID = null;
        // Hold the current levy reference id
        var stCurrentLevyRefID = null;
        // Hold the vas/warranty list
        var arrVASWarrServiceList = [];
        // Hold the levy item
        var arrLevyServiceList = [];
        // Hold the related service item
        var objRelatedServiceItem = {};
        // Iterate line level
        for (var intLinenum = intCurrentIndex; intLinenum < recCurrent.getLineCount('item'); intLinenum++) {
        	// Get the item type
        	stItemType = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'itemtype', line : intLinenum});
        	// Get the current vas/warranty reference id
        	stCurrentVASWarrRefID = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_vas_reference_id', line : intLinenum});
        	// Get the current levy reference id
        	stCurrentLevyRefID = recCurrent.getSublistValue({sublistId : 'item', fieldId : 'custcol_levy_ref_id', line : intLinenum});
        	// Check if service item and same reference id
        	if (stItemType == 'Service' || stItemType == 'OthCharge') {
        		// Compare the vas/warranty reference id
        		if (!NSUtil.isEmpty(stCurrentVASWarrRefID) && !NSUtil.isEmpty(stVASWarrRefID) && stCurrentVASWarrRefID == stVASWarrRefID) {
            		// Store the item
        			arrVASWarrServiceList.push(recCurrent.getSublistValue({sublistId : 'item', fieldId : 'item', line : intLinenum}));
        		} 
        		// Compare the levy reference id
    			if (!NSUtil.isEmpty(stCurrentLevyRefID) && !NSUtil.isEmpty(stLevyRefID) && stCurrentLevyRefID == stLevyRefID) {
            		// Store the item
    				arrLevyServiceList.push(recCurrent.getSublistValue({sublistId : 'item', fieldId : 'item', line : intLinenum}));
    			}
        	}
        }
        // Set the vas/warranty service item
        objRelatedServiceItem.vaswarranty = arrVASWarrServiceList;
        // Set the levy
        objRelatedServiceItem.levy = arrLevyServiceList;
        log.debug(stLogTitle, 'Return : ' + JSON.stringify(objRelatedServiceItem));
        log.debug(stLogTitle, '>> Exit Log <<');
        return objRelatedServiceItem;
    }
    
    /**
     * 
     */
    function getItemHighestLocationAvailable(recCurrent) {
        var stLogTitle = 'getItemHighestLocationAvailable';
        log.debug(stLogTitle, '>> Entry Log <<');
        // Hold the item
        var arrItemList = [];
        // Hold the item data
        var objItemData = {};
        // Hold the item type
        var stItemType = null;
        // Hold the item
        var stItem = null;
        // Get the line item count
        var intLineCount = recCurrent.getLineCount('item');
        // Iterate the line level
        for(var intLinenum = 0; intLinenum < intLineCount;  intLinenum++)
        {
            // Get the item type
            stItemType =  recCurrent.getSublistValue({sublistId : 'item', fieldId : 'itemtype', line : intLinenum});
            // Get back order data
            var flBackOrderedQty =  NSUtil.forceFloat(recCurrent.getSublistValue({
                sublistId : 'item',
                fieldId : 'quantitybackordered',
                line : intLinenum
            }));
            // Check if inventory type
            if(stItemType == 'InvtPart' && flBackOrderedQty > 0) {
                // Store the item
                arrItemList.push(recCurrent.getSublistValue({sublistId : 'item', fieldId : 'item', line : intLinenum}));
            }
        }
        log.debug(stLogTitle, 'Inventory Item List : '+JSON.stringify(arrItemList));
        // Check item list
        if (!NSUtil.isEmpty(arrItemList)) {
            // Set filter
            var arrFilter = [];
            arrFilter.push(search.createFilter({
                name: 'locationquantityavailable',
                operator: search.Operator.GREATERTHAN,
                values : [0]
            }));
            arrFilter.push(search.createFilter({
                name: 'makeinventoryavailable',
                join: 'inventorylocation',
                operator: search.Operator.IS,
                values : ['T']
            }));
            arrFilter.push(search.createFilter({
                name: 'custrecord_aom_availability',
                join: 'inventorylocation',
                operator: search.Operator.IS,
                values : ['T']
            }));
            arrFilter.push(search.createFilter({
                name: 'internalid',
                operator: search.Operator.ANYOF,
                values : arrItemList
            }));
            
            // Set the column
            var arrColumn = [];
            arrColumn.push(search.createColumn({name: 'name', sort: 'ASC',}));
            arrColumn.push(search.createColumn({name: 'locationquantityavailable', sort: 'DESC'}));
            arrColumn.push(search.createColumn({join : 'inventorylocation', name: 'internalid'}));
            
            // Create search
            var objItemSearch = search.create({type: record.Type.INVENTORY_ITEM, filters: arrFilter, columns: arrColumn});
            
            // Run the search
            objItemSearch.run().each(function(result) {
                // Get the id
                stItem = result.id;
                // Check if not in the object
                if (!(stItem in objItemData)) {
                    // Set the item
                    objItemData[stItem] = {quantity : result.getValue('locationquantityavailable'), location : result.getValue({name : 'internalid', join : 'inventorylocation'})};
                }
                return true;
            });
        }
        
        log.debug(stLogTitle, 'Item Highest Available Quantity : '+JSON.stringify(objItemData));
        log.debug(stLogTitle, '>> Exit Log <<');
        return objItemData;
    }
    
    /**
     * 
     */
    function isAOMSplitDone(recCurrent) {
        var stLogTitle = 'isAOMSplitDone';
        log.debug(stLogTitle, '>> Entry Log <<');
        // Hold the flag for AOM Split process
        var blnIsAOMSplitDone = true;
        // Hold the item type
        var stItemType = null;
        // Hold the back order
        var flBackOrderedQty = 0.00;
        // Hold the available quantity
        var flAvailableQty = 0.00;
        // Hold the back order flag
        var blnBackOrderFlag = false;
        // Iterate the line item
        for(var intLinenum = 0; intLinenum < recCurrent.getLineCount('item');  intLinenum++)
        {
            // Get the item type
        	stItemType =  recCurrent.getSublistValue({sublistId : 'item', fieldId : 'itemtype', line : intLinenum});
            //Get only inventory items only
            if(stItemType != 'InvtPart')
            {
                continue;
            }
            // Get the back order
            flBackOrderedQty =  NSUtil.forceFloat(recCurrent.getSublistValue({
                sublistId : 'item',
                fieldId : 'quantitybackordered',
                line : intLinenum
            }));
            // Get the available quantity
            flAvailableQty =  NSUtil.forceFloat(recCurrent.getSublistValue({
                sublistId : 'item',
                fieldId : 'quantityavailable',
                line : intLinenum
            }));
            // Get the back order location flag
            blnBackOrderFlag =  recCurrent.getSublistValue({
                sublistId : 'item',
                fieldId : 'custcol_backorder_location',
                line : intLinenum
            });

            log.debug(stLogTitle, 'Back Order : '+ flBackOrderedQty + ' | Available Quantity : ' + flAvailableQty);
            // Check back order is greater than 0 and location is available
            if((flBackOrderedQty > 0 && flAvailableQty > 0) || (flBackOrderedQty > 0 && !blnBackOrderFlag)) {
            	// Set the flag
            	blnIsAOMSplitDone = false;
            	break;
            }
        }
        log.debug(stLogTitle, 'Return : ' + blnIsAOMSplitDone);
        log.debug(stLogTitle, '>> Exit Log <<');
        return blnIsAOMSplitDone;
    }
    
//    /**
//     * 
//     */
//    function bookOrder() {
//        var stLogTitle = 'isAOMSplitDone';
//        log.debug(stLogTitle, '>> Entry Log <<');
//        
//        log.debug(stLogTitle, '>> Exit Log <<');
//	}
    
    return {
        afterSubmit : afterSubmit_splitInvItem
    };
});