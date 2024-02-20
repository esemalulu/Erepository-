/*
    Information & Computing Services, Inc. ("COMPANY") CONFIDENTIAL
    Unpublished Copyright (c) 2012-2014 Information & Computing Services, Inc., All Rights Reserved.

    All files, data and information stored in this location is owned by Information & Computing Services, Inc. ("ICS") and is ICS's "Confidential Information" 
    pursuant to section 6 of the SuiteCloud Developer Network Agreement and contains ICS's trade secrets, confidential   and proprietary information.

    NOTICE:  All information contained herein is, and remains the property of COMPANY. The intellectual and technical concepts contained 
    herein are proprietary to COMPANY and may be covered by U.S. and Foreign Patents, patents in process, and are protected by trade secret or copyright law.
    Dissemination of this information or reproduction of this material is strictly forbidden unless prior written permission is obtained
    from COMPANY.  Access to the source code contained herein is hereby forbidden to anyone except current COMPANY employees, managers or contractors who have executed 
    Confidentiality and Non-disclosure agreements explicitly covering such access.

    The copyright notice above does not evidence any actual or intended publication or disclosure of this source code, which includes  
    information that is confidential and/or proprietary, and is a trade secret, of COMPANY.   ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC PERFORMANCE, 
    OR PUBLIC DISPLAY OF OR THROUGH USE OF THIS SOURCE CODE WITHOUT THE EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION OF APPLICABLE 
    LAWS AND INTERNATIONAL TREATIES.  THE RECEIPT OR POSSESSION OF THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY RIGHTS  
    TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE, USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.                   
*/
/**
 * Module Description
 * 
 * 
 * Version Date Author Remarks 1.00 25 Jun 2013 PMonaco
 * 
 */

var STR_SETUPBIN = 'Setup';

/**
 * @param {String}
 *                type Context Types: scheduled, ondemand, userinterface,
 *                aborted, skipped
 * @returns {Void}
 */
function rfs_ss_binassociation(type) {

    var context = nlapiGetContext();

    var location = context.getSetting('SCRIPT', 'custscriptrfs_locations');

    nlapiLogExecution('DEBUG', 'Location', location);

    if (!location && _rfapi_Features.multilocationinventory) {
    	throw new nlobjError('Setup Error', 'Location needs to be set in script parameters');
    }

    if (!_rfapi_Features.binmanagement) {
    	throw new nlobjError('Setup Error', 'Bins not enabled for account');
    }

    try {
		// UU 10 or 25
		var binId = createSetupBinForLocation(location);
		// UU 30 - (45 * n)
		moveItemsToSetupBin(location, binId);
    } catch (e) {
		if (e instanceof nlobjError)
		    throw e;
		else
		    throw new nlobjError('SCRIPT_ERROR', e.message);
    }
}

function createSetupBinForLocation(location) {
    try {
    	var setupBinName = STR_SETUPBIN;
    	if(location) 
    		setupBinName = setupBinName + '-' + location;

    	var filters = [];
    	if(_rfapi_Features.multilocationinventory)
    		filters.push(new nlobjSearchFilter('location', null, 'anyof', [ location ]));
    	filters.push(new nlobjSearchFilter('binnumber', null, 'is', setupBinName));
		// UU 10
		var searchResults = nlapiSearchRecord('bin', null, filters);
		if (searchResults == null) {
		    // UU 5
		    var recBin = nlapiCreateRecord('bin');
		    recBin.setFieldValue('binnumber', setupBinName);
		    recBin.setFieldValue('location', location);
		    // UU 10
		    return nlapiSubmitRecord(recBin);
		} else {
		    return searchResults[0].getId();
		}

    } catch (e) {
    	nlapiLogExecution('ERROR', 'Create Setup Bin', e.message);
    }
}

function moveItemsToSetupBin(location, bin) {

    var context = nlapiGetContext();
    // UU 10
    var init = {};
    if(_rfapi_Features.advancedbinmanagement)
    	// init.recordmode = 'dynamic';
    if(_rfapi_Features.multilocationinventory)
    	init.location = location;
    var setupBinName = STR_SETUPBIN;
	if(location) 
		setupBinName = setupBinName + '-' + location;

    var recBinPutaway = nlapiCreateRecord('binworksheet', init);

    var count = recBinPutaway.getLineItemCount('item');
    var runJobAgain = false;

    if (count > 0) {
		for ( var i = 1; i <= count; i++) {
			var lineisgood = false;
			if(_rfapi_Features.advancedbinmanagement){
				recBinPutaway.selectLineItem('item', i);
				
				var isserial = recBinPutaway.getCurrentLineItemValue('item', 'isserial') == 'T';
				var isnumbered = recBinPutaway.getCurrentLineItemValue('item', 'isnumbered') == 'T';
              	var unit = recBinPutaway.getCurrentLineItemValue('item', 'itemunits');
              	var quantityiszero = recBinPutaway.getCurrentLineItemValue('item', 'quantity');
				var recInventoryDetail = recBinPutaway.createCurrentLineItemSubrecord('item', 'inventorydetail');
              if (quantityiszero.indexOf('.') == -1) {
				if(isserial || isnumbered){
					var totalQuantity = 0;
				
					function CreateInventoryDetails(){
						var field = recInventoryDetail.getLineItemField('inventoryassignment', 'issueinventorynumber');
						var options = field.getSelectOptions() || [];
				
						options.forEach(function(option){
							recInventoryDetail.selectNewLineItem('inventoryassignment');
							recInventoryDetail.setCurrentLineItemValue('inventoryassignment', 'issueinventorynumber', option.getId());
							recInventoryDetail.setCurrentLineItemText('inventoryassignment', 'binnumber', setupBinName);
							if(isserial){
								totalQuantity += 1;
							} else {
								var quantity = recInventoryDetail.getCurrentLineItemValue('inventoryassignment', 'quantityavailable');
								recInventoryDetail.setCurrentLineItemValue('inventoryassignment', 'quantity', quantity);
								totalQuantity += parseFloat(quantity);
								
							}
							nlapiLogExecution('DEBUG', 'CreateInventoryDetails', 'Item: ' + count);
							nlapiLogExecution('DEBUG', 'CreateInventoryDetails', 'Quantity: ' + totalQuantity);
							recInventoryDetail.commitLineItem('inventoryassignment');
						});
						return options.length >= 1000;
					}
				
					var recalc = CreateInventoryDetails();
					if(recalc){
						// This means that we maxed out on our getSelectOptions api call
						// We need to change the quantity on the line, which can't do as long as the recInventoryDetail is open
						// Use the totalQuantity that we accumulated
						// Unfortunately this means we have to spin through the getSelectOptions again, not sure of better way
						recInventoryDetail.cancel();
						recBinPutaway.setCurrentLineItemValue('item', 'quantity', totalQuantity);
						recInventoryDetail = recBinPutaway.createCurrentLineItemSubrecord('item', 'inventorydetail');
						CreateInventoryDetails();
						// Set flag to reschedule script since we weren't able to process all of the inventory numbers
						runJobAgain = true;
					}
					if((parseFloat(recBinPutaway.getCurrentLineItemValue('item', 'quantity')).toFixed(5) == parseFloat(totalQuantity).toFixed(5) && parseFloat(recBinPutaway.getCurrentLineItemValue('item', 'quantity')).toFixed(3) != 0) || recalc) {
						lineisgood = true;
						nlapiLogExecution('DEBUG', 'Line is good');
						recInventoryDetail.commit();
					} else {
						nlapiLogExecution('DEBUG', 'Line qty != lot quantities', recBinPutaway.getCurrentLineItemValue('item', 'quantity') + '!=' + totalQuantity);
					}
				} else {
					recInventoryDetail.selectNewLineItem('inventoryassignment');
					recInventoryDetail.setCurrentLineItemText('inventoryassignment', 'binnumber', setupBinName);
					recInventoryDetail.setCurrentLineItemValue('inventoryassignment', 'quantity', parseFloat(recBinPutaway.getCurrentLineItemValue('item', 'quantity')));
					nlapiLogExecution('DEBUG', 'moveItemsToSetupBin', 'Item: ' + recBinPutaway.getCurrentLineItemValue('item', 'item'));
					nlapiLogExecution('DEBUG', 'moveItemsToSetupBin', 'Qty: ' + parseFloat(recBinPutaway.getCurrentLineItemValue('item', 'quantity')));
					recInventoryDetail.commitLineItem('inventoryassignment');
					recInventoryDetail.commit();
				}
              }
				if(!(isserial || isnumbered))
					lineisgood = true;
				var curitem = recBinPutaway.getCurrentLineItemValue('item', 'item');
				nlapiLogExecution('DEBUG', 'Line is good?', lineisgood);
				if(lineisgood) {
					recBinPutaway.commitLineItem('item');
				}
			} else {
				var itemid = recBinPutaway.getLineItemValue('item', 'item', i);
				//UU 10
			    var item = nlapiSearchRecord('item', null, [new nlobjSearchFilter('internalid', null, 'is', itemid)], null)[0];
			    if(item != null)
			    {
			    	// UU 5 or 15
			    	associateBinWithItem(item, bin);
				
			    	recBinPutaway.setLineItemValue('item', 'itembinnumbers', i, [ setupBinName ]);
			    }
			}
			
			context.setPercentComplete(parseInt((10000 - context.getRemainingUsage()) / 10000 * 100));
			
			if (parseInt(context.getRemainingUsage()) < 100) {
			    runJobAgain = true;
			    break;
			}
		}
		// UU 20
		var id = nlapiSubmitRecord(recBinPutaway);
		nlapiLogExecution('DEBUG', 'Bin Putaway Worksheet', id);
	
    	if (count >= 500){
    		// We've maxed out the worksheet... run job again
    		runJobAgain = true;
    	}

		if (runJobAgain) {
		    var arrScriptParams = new Array();
		    arrScriptParams['custscriptrfs_locations'] = location;
		    // UU 20
		    var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), arrScriptParams);
		    nlapiLogExecution('DEBUG', 'Queue Status', status);
		}
    }
}

function associateBinWithItem(item, bin) {
    try {
	// UU 5
	var recInvItem = nlapiLoadRecord(item.getRecordType(), item.getId());
	
	var exists = recInvItem.findLineItemValue('binnumber', 'binnumber', bin);
	if (exists == -1) {
	    recInvItem.selectNewLineItem('binnumber');
	    recInvItem.setCurrentLineItemValue('binnumber', 'binnumber', bin.toString());
	    recInvItem.commitLineItem('binnumber');
	    // UU 10
	    nlapiSubmitRecord(recInvItem);
	}
    } catch (e) {
    	nlapiLogExecution('ERROR', 'Bin Association Failed',
		'Unable to associate itemid ' + item + ' with bin ' + bin);
    }
}
