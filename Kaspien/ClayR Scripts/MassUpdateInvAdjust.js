/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jul 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdateInvAdjust(recType, recId) {
	
	try {
		if (recType == 'customrecord_mass_inv_adjustments') {
			
			// Load the record found by Mass Update
			var recCustInvAdj = nlapiLoadRecord(recType, recId);
			
			//retrieve the data from the record 
			var recDate = recCustInvAdj.getFieldValue('custrecord_received_date');
			var accountId = recCustInvAdj.getFieldValue('custrecord_adj_account');
			var sku = recCustInvAdj.getFieldValue('custrecord_sku');
			var adjQtyBy = recCustInvAdj.getFieldValue('custrecord_adjust_qty_by');
			var binNumber = recCustInvAdj.getFieldText('custrecord_bin_number');
			var location = recCustInvAdj.getFieldText('custrecord_item_location');
			var unitCost = recCustInvAdj.getFieldValue('custrecordmi_unit_cost');
			var adjLocation = recCustInvAdj.getFieldText('custrecordcustrecord_adjustment_location');
			var adjReason = recCustInvAdj.getFieldText('custrecord_inv_adj_reason');
			var poNumber = recCustInvAdj.getFieldValue('custrecordetailz_mass_po_number');
            var memoData = recCustInvAdj.getFieldValue('custrecordmass_memo');
						
			var initvalues = {customform: 105};	// initialize values for new Inv Adjust
			
			// create new inv adjust record
			var recInvAdj = nlapiCreateRecord('inventoryAdjustment',initvalues);
			
			//Populate the new Inv Adjust record
			recInvAdj.setFieldValue('account',accountId);	// Prod: 193
			recInvAdj.setFieldValue('custbodyinv_adj_notes','Created by Mass Update Script');
			recInvAdj.setFieldValue('trandate',recDate);
			recInvAdj.setFieldText('adjlocation',adjLocation);
			recInvAdj.setFieldText('custbodyinv_adj_reason',adjReason);
			recInvAdj.setFieldValue('custbodyetailz_po_number',poNumber);
            recInvAdj.setFieldValue('memo',memoData);
			
			// Create and populate new line item
			recInvAdj.selectNewLineItem('inventory');
			recInvAdj.setCurrentLineItemText('inventory','item', sku);
			recInvAdj.setCurrentLineItemValue('inventory','adjustqtyby', adjQtyBy);
			recInvAdj.setCurrentLineItemText('inventory','location', location);
			if (unitCost) {
				recInvAdj.setCurrentLineItemValue('inventory','unitcost', unitCost);
			}

            if (adjQtyBy != 0 && (location == 'EPF' || location == 'Albany EPF')) {
				var recInvDetail = recInvAdj.createCurrentLineItemSubrecord('inventory','inventorydetail');
				recInvDetail.selectNewLineItem('inventoryassignment');
				recInvDetail.setCurrentLineItemText('inventoryassignment','binnumber',binNumber);
				recInvDetail.setCurrentLineItemValue('inventoryassignment','quantity',adjQtyBy);
				recInvDetail.commitLineItem('inventoryassignment');
				recInvDetail.commit();
			}
			
			recInvAdj.commitLineItem('inventory');
			
			// Store record into database
			nlapiSubmitRecord(recInvAdj);
			
			nlapiSubmitField(recType,recId,'custrecord_processed','T');  // Set the Processed Flag
			
			nlapiLogExecution('DEBUG', 'Mass Inv Adjust Values', 'recType: ' + recType + '; recId: ' + recId + '; recDate: ' + recDate + 
					'; sku: ' + sku + '; adjQtyBy: ' + adjQtyBy + '; location: ' + location + '; Reason: ' + adjReason +
					'; binNumber: ' + binNumber + '; accountId: ' + accountId);
			
		}
		
	} catch (err) {
		
		var errMessage = 'ErrCode: ' + err.name + '; err: ' + err.message;
		
		nlapiSubmitField(recType,recId,'custrecord_message',errMessage.substring(0,299));  // Store the error message
		
		nlapiLogExecution('ERROR', 'Mass Update Inv Adjust', 'recType: ' + recType+ '; recId: ' + recId +  
				'; ' + errMessage);
			
	}
	
}
