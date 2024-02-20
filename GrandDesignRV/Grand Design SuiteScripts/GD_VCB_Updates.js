/**
 * Mass Updates for VCBs
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Jul 2016     Jacob Shetler
 *
 */

var VCB_PART_SUBLIST = 'recmachcustrecordvcbitem_vendorchargeback';

/**
 * Updates the entire VCB from the old version to the new version.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function updateWholeVCB(recType, recId)
{
	var vcbRecord = nlapiLoadRecord(recType, recId);
	
	//Move totals from approved to requested and make approved amounts 0.
	for (var i = 1; i <= vcbRecord.getLineItemCount(VCB_PART_SUBLIST); i++)
	{
		vcbRecord.setLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_reqamt', i, vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_amount', i));
		vcbRecord.setLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_amount', i, 0);
	}

	//Recalc totals
	bodyTotalsUpdate(vcbRecord);
	
	//Submit the record
	nlapiSubmitRecord(vcbRecord);
}

/**
 * @param {nlobjRecord} vcbRecord VCB Record
 */
function bodyTotalsUpdate(vcbRecord)
{
	var vcbLaborItemId = GetVCBLaborItem();
	var vcbFreightItemId = GetVCBFreightItem();
	var vcbSubletItemId = GetVCBSubletItem();
	
	var currentLineItemId = '';
	var currentLineId = '';
	var laborTotal = 0;
	var partsTotal = 0;
	var freightTotal = 0;
	var subletTotal = 0;
	var reqLaborTotal = 0;
	var reqPartsTotal = 0;
	var reqFreightTotal = 0;
	var reqSubletTotal = 0;
	// Go through the VCB and pull the amounts of the line items and update the totals fields after adding up the parts.
	for (var i = 1; i <= vcbRecord.getLineItemCount(VCB_PART_SUBLIST); i++)
	{
		currentLineId = ConvertNSFieldToString(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'id', i));
		currentLineItemId = ConvertNSFieldToString(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_item', i));
		if (currentLineItemId != vcbLaborItemId && currentLineItemId != vcbFreightItemId && currentLineItemId !=  vcbSubletItemId && currentLineId != null)
		{
			partsTotal += ConvertNSFieldToFloat(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_amount', i));
			reqPartsTotal += ConvertNSFieldToFloat(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_reqamt', i));
		}
		else if (currentLineItemId == vcbLaborItemId && currentLineId != null)
		{
			laborTotal = ConvertNSFieldToFloat(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_amount', i));
			reqLaborTotal += ConvertNSFieldToFloat(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_reqamt', i));
		}			
		else if (currentLineItemId == vcbFreightItemId && currentLineId != null)
		{
			freightTotal += ConvertNSFieldToFloat(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_amount', i));
			reqFreightTotal += ConvertNSFieldToFloat(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_reqamt', i));
		}			
		else if (currentLineItemId == vcbSubletItemId && currentLineId != null)
		{
			subletTotal = ConvertNSFieldToFloat(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_amount', i));
			reqSubletTotal += ConvertNSFieldToFloat(vcbRecord.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_reqamt', i));
		}			
	}
	
	//Set the approved totals 
	vcbRecord.setFieldValue('custrecordvcb_labortotal', laborTotal);
	vcbRecord.setFieldValue('custrecordvcb_freighttotal', freightTotal);
	vcbRecord.setFieldValue('custrecordvcb_sublettotal', subletTotal);
	vcbRecord.setFieldValue('custrecordvcb_partstotal', partsTotal);
	vcbRecord.setFieldValue('custrecordvcb_partsmarkuptotal', ConvertNSFieldToFloat(vcbRecord.getFieldValue('custrecordvcb_partsmarkuptotal')));
	vcbRecord.setFieldValue('custrecordvcb_vendorchargebacktotal', laborTotal + partsTotal + freightTotal + subletTotal + ConvertNSFieldToFloat(vcbRecord.getFieldValue('custrecordvcb_partsmarkuptotal')));
	
	//set the requested totals
	vcbRecord.setFieldValue('custrecordvcb_reqlabortotal', reqLaborTotal);
	vcbRecord.setFieldValue('custrecordvcb_reqfreighttotal', reqFreightTotal);
	vcbRecord.setFieldValue('custrecordvcb_reqsublettotal', reqSubletTotal);
	vcbRecord.setFieldValue('custrecordvcb_reqpartstotal', reqPartsTotal);
	vcbRecord.setFieldValue('custrecordvcb_reqpartsmarkuptotal', ConvertNSFieldToFloat(vcbRecord.getFieldValue('custrecordvcb_reqpartsmarkuptotal')));
	vcbRecord.setFieldValue('custrecordvcb_reqvcbtotal', reqLaborTotal + reqPartsTotal + reqFreightTotal + reqSubletTotal + ConvertNSFieldToFloat(vcbRecord.getFieldValue('custrecordvcb_reqpartsmarkuptotal')));
}
