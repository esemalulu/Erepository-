/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Sep 2013     ibrahima
 *
 */

/**
 * Performs VendorChargeBack before submit logic.
 */
function VendorChargeback_BeforeSubmit(type)
{	
	var vendorChargebackPartSubList = 'recmachcustrecordvcbitem_vendorchargeback';
	if(type == 'delete')
	{
		var vcbRecordId = nlapiGetRecordId();
		//When vendor chargeback is deleted, do the following:
		//1. un-link claim part lines that are associated with vendor chargeback items.
		//2. delete vendor chargeback items.
		var count = nlapiGetLineItemCount(vendorChargebackPartSubList);
		for(var i = 1; i <= count; i++)
		{
			var vcbItemLineId = ConvertNSFieldToString(nlapiGetLineItemValue(vendorChargebackPartSubList, 'id', i));
			var claimPartLineId = ConvertNSFieldToString(nlapiGetLineItemValue(vendorChargebackPartSubList, 'custrecordvcbitem_claimpartlineid', i));
			if(claimPartLineId != '')
			{
				nlapiSubmitField('customrecordrvsclaimpartline', claimPartLineId, 
						['custrecordclaimpartline_vcbitem', 'custrecordclaimpartline_vcbnumber'], ['', ''], false);
				nlapiSubmitField('customrecordrvsvendorchargebackitem', vcbItemLineId, 
						'custrecordvcbitem_claimpartlineid', '', false);
			}
			else
			{
				var claimId = nlapiGetFieldValue('custrecordvcb_claim');
				if (claimId != '' && claimId != null)
				{
					var claimRecord = nlapiLoadRecord('customrecordrvsclaim', claimId);
					var claimPartLineSublistType = 'recmachcustrecordclaimpartline_claim';
					var claimPratLineCount = claimRecord.getLineItemCount(claimPartLineSublistType);
					
					for (var j = 1; j <= claimPratLineCount; j++)
					{
						claimPartLineId = claimRecord.getLineItemValue(claimPartLineSublistType, 'id', j);
						if (claimRecord.getLineItemValue(claimPartLineSublistType, 'custrecordclaimpartline_vcbnumber', j) == vcbRecordId)
						{
							nlapiSubmitField('customrecordrvsclaimpartline', claimPartLineId, 
									['custrecordclaimpartline_vcbitem', 'custrecordclaimpartline_vcbnumber'], ['', ''], false);
						}
					}
				}
				
				
			}
			nlapiDeleteRecord('customrecordrvsvendorchargebackitem', vcbItemLineId);
		}
		nlapiSetFieldValue('custrecordvcb_claim', '');
		
	}
	else if (type == 'edit')
	{		
		var vendorChargebackId = nlapiGetRecordId();	
		var vcbSublistType = 'customrecordrvsvendorchargeback';
		// This record is before the user's changes occurred and will be compared to the current record.
		var beforeEditRecord = nlapiLoadRecord(vcbSublistType, vendorChargebackId);
		var beforeEditCount = beforeEditRecord.getLineItemCount(vendorChargebackPartSubList);
		
		var currentCount = nlapiGetLineItemCount(vendorChargebackPartSubList);
		var currentVCBLineId = '';
		var currentVCBLineItemId = '';
		// This boolean is set to false in the currentCount loop if the item was not removed/added by the user.
		// For each line inside the beforeEditCount loop the boolean is set to true.  
		var isLineRemovedOrAdded = true;
		var subletItemId = GetVCBSubletItem();
		var vcbJobNum = '';
		var vcbSubletLineItemId = -1;
		var claimRecord = '';
		var claimId = nlapiGetFieldValue('custrecordvcb_claim');
		
		if (claimId != '' && claimId != null)
		{
			claimRecord = nlapiLoadRecord('customrecordrvsclaim', claimId);
		}
		
		var subletTotal = 0;
		var lineNum = '';
		for(var i = 1; i <= beforeEditCount; i++)
		{
			//We will start by saying that the line was removed or added.  We will confirm that line was not added or removed when we have a matched line 
			//between the edited record and the current record.  We will loop through the edited and current lines and if we find a match, then we know the line was not removed or added.
			isLineRemovedOrAdded = true;
			var beforeEditVCBLineId = beforeEditRecord.getLineItemValue(vendorChargebackPartSubList, 'id', i);
			for(var j = 1; j <= currentCount; j++)
			{
				currentVCBLineId = nlapiGetLineItemValue(vendorChargebackPartSubList, 'id', j);
				currentVCBLineItemId = nlapiGetLineItemValue(vendorChargebackPartSubList, 'custrecordvcbitem_item', j);
				if(currentVCBLineId == beforeEditVCBLineId) //Found a match, line was not removed or added
				{
					isLineRemovedOrAdded = false;
				}
				//check if sublet item line exist, disregard the beforeEditCount loop, and that the internal id is valid.
				if (subletItemId == currentVCBLineItemId && i == 1 && currentVCBLineId != null)
				{
					vcbSubletLineItemId = currentVCBLineId; //if sublet exist get the lineitem internal id 
					lineNum = j;  //get the line number where the Sublet Item is located so we can update the sublet amount after all loops are finished.
				}
				vcbJobNum = ConvertNSFieldToString(nlapiGetLineItemValue(vendorChargebackPartSubList, 'custrecordvcbitem_job', j));
				// For each item not labor,freight, or sublet where job is set, loop through the claim operation line to calculate sublet.
				// This if statement makes sure to only process vcb lines that has an existing job number and that the loop only goes through
				// one whole loop inside the currentCount loop and disregards the beforeEditCount loop.
				if (vcbJobNum != '' && i == 1 && claimRecord != '')
				{
					subletTotal = CalculateSubletTotalFromClaimOperationLIne(claimRecord, vcbJobNum);
				}
			}		
			//Now we know the line was either removed or added. What we care about is the line that was removed and is linked to claim part line.
			//If the line was removed and is linked to a claim part line, it will have claim part line id in custrecordvcbitem_claimpartlineid field.
			// We will only unlink lines that were removed since added lines by users will not be linked to a claim part line.
			if(isLineRemovedOrAdded)
				UnlinkRemovedLinesOnClaimPartLine(beforeEditRecord, vendorChargebackPartSubList, i);	
		}
		// Checks that the sublet line exist on the line, if it does, set the amount of the sublet item.
		if (vcbSubletLineItemId != -1)
			SetVendorchargebackSubletAmountOnTheLine(lineNum, subletTotal, vendorChargebackPartSubList);
	}	
}

/**
 * Fires an alert to the user when the user tries to change the status to credited.
 * @param type
 * @param name
 * @param linenum
 * @returns {Boolean}
 */
function VendorChargeback_ValidateField(type, name, linenum)
{
	if (name == 'custrecordvcb_status')
	{
		var statusId = nlapiGetFieldValue(name);
		if (statusId == VENDOR_CHARGEBACK_STATUS_CREDITED)
		{
			alert('The status of a vendor chargeback cannot manually be changed to "Credited."');
			return false;
		}
	}
	return true;
}

/**
 * Performs After Submit Logic for Vendor Chargeback.
 * @appliedtorecord customrecordrvsvendorchargeback
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function VendorChargeback_AfterSubmit(type)
{
	//When vendor chargeback is created or edited, we want to link claim part line accordingly.
	if(type == 'create' || type == 'edit')
	{
		var claimId = ConvertNSFieldToString(nlapiGetFieldValue('custrecordvcb_claim'));
		if(claimId != '' && claimId != null)
		{
			LinkClaimPartLineToVendorChargebackItemLine(claimId);
		}
		
		if (type == 'edit');
		{
			UpdateTotalFieldsFromLineItems();
		}
			
	}
}

/**
 * 
 * @param type
 * @param form
 * @param request
 */
function VendorChargeback_BeforeLoad(type, form, request)
{
	if (type == 'create')
	{
		if (request != null)
		{
			var claimId = request.getParameter('custparam_claim');
			var unitId = request.getParameter('custparam_unit');
			
			// No parts are included in the claim so we are redirecting the user from claim
			// to the create new VCB form and we are setting the claim, unit and the three
			// VCB items: labor, freight and sublet.
			if ((unitId != null || unitId != '') && (claimId != null || claimId != ''))
			{
				var vcbLaborItemId = ConvertNSFieldToString(GetVCBLaborItem());
				var vcbFreightItemId = ConvertNSFieldToString(GetVCBFreightItem());
				var vcbSubletItemId = ConvertNSFieldToString(GetVCBSubletItem());
				
				nlapiSetFieldValue('custrecordvcb_claim', claimId);
				nlapiSetFieldValue('custrecordvcb_unit', unitId);
				
				var sublistType = 'recmachcustrecordvcbitem_vendorchargeback';
				nlapiSelectNewLineItem(sublistType);
				
				if(vcbLaborItemId != '')
					AddNewVendorChargebackLineItem(vcbLaborItemId, 1, 0);
				if(vcbFreightItemId != '')
					AddNewVendorChargebackLineItem(vcbFreightItemId, 1, 0);
				if(vcbSubletItemId != '')
					AddNewVendorChargebackLineItem(vcbSubletItemId, 1, 0);
			}
		}
	}
	
	var vendorChargebackPartSubList = form.getSubList('recmachcustrecordvcbitem_vendorchargeback');
	if (vendorChargebackPartSubList != null)
	{
		var attachButton = vendorChargebackPartSubList.getButton('attach');
		if (attachButton != null)
			attachButton.setDisabled(true);
	}
}

/**
 * Adds vendor chargeback line item
 * @param itemId
 * @param qty
 * @param amount
 */
function AddNewVendorChargebackLineItem(itemId, qty, amount)
{
	var sublistType = 'recmachcustrecordvcbitem_vendorchargeback';
	nlapiSelectNewLineItem(sublistType);
	nlapiSetCurrentLineItemValue(sublistType, 'custrecordvcbitem_item', itemId);
	nlapiSetCurrentLineItemValue(sublistType, 'custrecordvcbitem_quantity', qty.toFixed(1));
	nlapiSetCurrentLineItemValue(sublistType, 'custrecordvcbitem_amount', amount);
	nlapiCommitLineItem(sublistType);
}

/**
 * Unlinks the vendor chargeback item(s) from the claim part line items.
 * @param beforeEditRecord
 * @param vendorChargebackPartSubList
 * @param index
 */
function UnlinkRemovedLinesOnClaimPartLine(beforeEditRecord, vendorChargebackPartSubList, index)
{
	var claimPartLineId = ConvertNSFieldToString(beforeEditRecord.getLineItemValue(vendorChargebackPartSubList, 
							'custrecordvcbitem_claimpartlineid', index));	
	//if this is true then the claim part item is linked with a vendor chargeback item and needs to be unlinked.
	if(claimPartLineId != '') 
		nlapiSubmitField('customrecordrvsclaimpartline', claimPartLineId, ['custrecordclaimpartline_vcbitem', 
		                                                                   'custrecordclaimpartline_vcbnumber'], ['', ''], false);
}

/**
 * Adds up all the sublets from each claim part line that has a match with the job number or operation line number (it should only be one per claim part line).
 * @param claimRecord
 * @param vcbJobNum
 * @returns {Number} 
 */
function CalculateSubletTotalFromClaimOperationLIne(claimRecord, vcbJobNum)
{
	var Total = 0;
	var claimOpLineSublistType = 'recmachcustrecordclaimoperationline_claim';
	var claimOpLineCount = claimRecord.getLineItemCount(claimOpLineSublistType);
	for (var i = 1; i <= claimOpLineCount; i++)
	{
		//check each line job line # get a match and add up Sublet.
		var claimOpLineJobNum = claimRecord.getLineItemValue(claimOpLineSublistType, 'custrecordclaimoperationline_linenumber', i);
		if (claimOpLineJobNum == vcbJobNum)
		{
			Total += ConvertNSFieldToFloat(claimRecord.getLineItemValue(claimOpLineSublistType, 'custrecordclaimoperationline_sublet', i));
		}
	}
	return Total;
}

/**
 * Set VCB amount on the sublet line item.
 * @param lineNum
 * @param subletTotal
 * @param vendorChargebackPartSubList
 */
function SetVendorchargebackSubletAmountOnTheLine(lineNum, subletTotal, vendorChargebackPartSubList)
{
	nlapiSelectLineItem(vendorChargebackPartSubList, lineNum);
	nlapiSetCurrentLineItemValue(vendorChargebackPartSubList, 'custrecordvcbitem_amount', subletTotal);
	nlapiCommitLineItem(vendorChargebackPartSubList);
}

/**
 * Adds up all the parts amounts to store it on the parts field on the VCB, for the Labor, Freight and Sublet are also set on the VCB Field.
 * All of these amounts are then added for the total amount field.
 * @param {nlobjRecord} vendorChargebackRecord
 * @param vcbLaborItemId
 * @param vcbFreightItemId
 * @param vcbSubletItemId
 */
function UpdateTotalFieldsFromLineItems()
{
	var vcbRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
	var vcbLaborItemId = GetVCBLaborItem();
	var vcbFreightItemId = GetVCBFreightItem();
	var vcbSubletItemId = GetVCBSubletItem();
	var sublistType = 'recmachcustrecordvcbitem_vendorchargeback';
	var vcbLineItemCount = vcbRecord.getLineItemCount(sublistType); 
	var currentLineItemId = '';
	var currentLineId = '';
	var laborTotal = 0;
	var partsTotal = 0;
	var partsMarkupTotal = ConvertNSFieldToFloat(vcbRecord.getFieldValue('custrecordvcb_partsmarkuptotal'));
	var freightTotal = 0;
	var subletTotal = 0;  
	var vcbTotal = 0;
	// Go through the VCB and pull the amounts of the line items and update the totals fields after adding up the parts.
	for (var i = 1; i <= vcbLineItemCount; i++)
	{
		currentLineId = ConvertNSFieldToString(vcbRecord.getLineItemValue(sublistType, 'id', i));
		currentLineItemId = ConvertNSFieldToString(vcbRecord.getLineItemValue(sublistType, 'custrecordvcbitem_item', i));
		if (currentLineItemId != vcbLaborItemId && currentLineItemId != vcbFreightItemId && currentLineItemId !=  vcbSubletItemId && currentLineId != null)
		{
			partsTotal += ConvertNSFieldToFloat(vcbRecord.getLineItemValue(sublistType, 'custrecordvcbitem_amount', i));
		}
		else if (currentLineItemId == vcbLaborItemId && currentLineId != null)
		{
			laborTotal = ConvertNSFieldToFloat(vcbRecord.getLineItemValue(sublistType, 'custrecordvcbitem_amount', i));
		}			
		else if (currentLineItemId == vcbFreightItemId && currentLineId != null)
		{
			freightTotal += ConvertNSFieldToFloat(vcbRecord.getLineItemValue(sublistType, 'custrecordvcbitem_amount', i));
		}			
		else if (currentLineItemId == vcbSubletItemId && currentLineId != null)
		{
			subletTotal = ConvertNSFieldToFloat(vcbRecord.getLineItemValue(sublistType, 'custrecordvcbitem_amount', i));
		}			
	}
	vcbRecord.setFieldValue('custrecordvcb_labortotal', laborTotal);
	vcbRecord.setFieldValue('custrecordvcb_freighttotal', freightTotal);
	vcbRecord.setFieldValue('custrecordvcb_sublettotal', subletTotal);
	vcbRecord.setFieldValue('custrecordvcb_partsmarkuptotal', partsMarkupTotal);
	vcbRecord.setFieldValue('custrecordvcb_partstotal', partsTotal);
	vcbTotal = laborTotal + partsTotal + freightTotal + subletTotal + partsMarkupTotal;
	vcbRecord.setFieldValue('custrecordvcb_vendorchargebacktotal', vcbTotal);
	nlapiSubmitRecord(vcbRecord);
}

/**
 * Links claim part line item to the vendor chargeback item line for the specified claim.
 */
function LinkClaimPartLineToVendorChargebackItemLine(claimId)
{
	var vendorChargebackId = ConvertNSFieldToString(nlapiGetRecordId());
	var vcbLaborItemId = ConvertNSFieldToString(GetVCBLaborItem());
	var vcbFreightItemId = ConvertNSFieldToString(GetVCBFreightItem());
	var vcbSubletItemId = ConvertNSFieldToString(GetVCBSubletItem());
	var vcbLineItems = 'recmachcustrecordvcbitem_vendorchargeback';
	var vcbLineCount = nlapiGetLineItemCount(vcbLineItems);
	var vcbRecord = nlapiLoadRecord('customrecordrvsvendorchargeback', vendorChargebackId);
	
	var claim = nlapiLoadRecord('customrecordrvsclaim', claimId);
	var claimPartLineItems = 'recmachcustrecordclaimpartline_claim';
	var claimPartLineCount = claim.getLineItemCount(claimPartLineItems);
	
	// Go through the vcb line items
	for(var i = 1; i <= vcbLineCount; i++)
	{
		// Makes sure that only part lines are linked to the claim part line items.
		if (vcbRecord.getLineItemValue(vcbLineItems, 'custrecordvcbitem_item', i) != vcbLaborItemId &&
			vcbRecord.getLineItemValue(vcbLineItems, 'custrecordvcbitem_item', i) != vcbFreightItemId &&
			vcbRecord.getLineItemValue(vcbLineItems, 'custrecordvcbitem_item', i) != vcbSubletItemId)
		{
			var vcbItemClaimPartLineId = ConvertNSFieldToString(vcbRecord.getLineItemValue(vcbLineItems, 'custrecordvcbitem_claimpartlineid', i));
			// Go through the claim line items and set the vcb line item id into the claim part line for linking.
			for(var j = 1; j <= claimPartLineCount; j++)
			{
				claim.selectLineItem(claimPartLineItems, j);  // Let's us set to the Current Line item on the claim part line.
				// Only parts that exist on the vcb and the claim part line will be linked, for extra measure, the claim part line
				// should not be linked to any other vcb parts.
				if (claim.getLineItemValue(claimPartLineItems, 'id', j) == vcbItemClaimPartLineId &&
					(claim.getLineItemValue(claimPartLineItems, 'custrecordclaimpartline_vcbnumber', j)  == '' ||
					claim.getLineItemValue(claimPartLineItems, 'custrecordclaimpartline_vcbnumber', j)  == null))
				{
					var vcbItemInternalId =  vcbRecord.getLineItemValue(vcbLineItems, 'id', i);										
					claim.setCurrentLineItemValue(claimPartLineItems, 'custrecordclaimpartline_vcbitem', vcbItemInternalId);
					claim.setCurrentLineItemValue(claimPartLineItems, 'custrecordclaimpartline_vcbnumber', vendorChargebackId);
					claim.commitLineItem(claimPartLineItems);
				}
			}
		}
	}
	nlapiSubmitRecord(claim);
}


///**
// * Find Invoice Number from Sales Order ID, returns empty string if none are found.
// */
//function GetInvoiceCreatedFromSalesOrder(salesOrderId)
//{	
//	var searchFilters = new Array();
//	searchFilters[searchFilters.length] = new nlobjSearchFilter('createdfrom', null, 'anyof', salesOrderId);
//	searchFilters[searchFilters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T');
//	
//	var cols = new Array();
//	cols[cols.length] = new nlobjSearchColumn('tranid', null, null);
//	
//	var results = nlapiSearchRecord('invoice', null, searchFilters, cols);
//
//	if (results != null && results != '')
//		return results[0].getValue('tranid');
//	else
//		return '';	
//}

function PrintVendorChargebackCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('printvendorchargeback_vendorchargebackid', nlapiGetRecordId());	
}

/**
 * Prints a PDF file of the VCB
 * @param request
 * @param response
 */
function PrintVendorChargebackSuitelet(request, response)
{
	var context = nlapiGetContext();
	var vendorChargebackId = context.getSessionObject('printvendorchargeback_vendorchargebackid');
	context.setSessionObject('printvendorchargeback_vendorchargebackid', null);
	
	var recType = request.getParameter('rectype');
	
	if (vendorChargebackId == '' || vendorChargebackId == null && recType == 'customrecordrvsvendorchargeback')
	{
		vendorChargebackId = request.getParameter('id');
	}
	
	if (vendorChargebackId != '' && vendorChargebackId != null) 
	{
		var pdfTitle = 'Vendor Chargeback ' + vendorChargebackId + '.pdf';
		var html = GetVendorChargebackPrintHTML(vendorChargebackId, true);
		
		PrintPDFInSuiteLet(request, response, pdfTitle, html);	
	}
}

/**
 * Gets vendor chargeback print html string.
 * @param changeOrderId
 * @returns {String}
 */
function GetVendorChargebackPrintHTML(vendorChargebackId, isPrintPDF)
{		
	var cellSpacing = 'cellspacing="0"';
	var companyLogoShow = '';
	//this will set the company logo only if this method is being called to create a pdf file
	//cellspacing is not recognized when using the pdf creation method so it is cleared from the html string.
	if (isPrintPDF)
	{
		cellSpacing = '';
		companyLogoShow = GetCompanyPageLogo();
	}
	 
	//Variables
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var companyName = companyInfo.getFieldValue('legalname');
	var companyAddress = companyInfo.getFieldValue('address1');
	var city = companyInfo.getFieldValue('city');
	var state = companyInfo.getFieldValue('state');
	var zip = companyInfo.getFieldValue('zip');
	var companyPhone = companyInfo.getFieldValue('phone'); 
	var companyFax = companyInfo.getFieldValue('fax');
	nlapiSubmitField('customrecordrvsvendorchargeback', vendorChargebackId, 'custrecordvcb_currentuser', nlapiGetUser());
	var vendorChargeback = nlapiLoadRecord('customrecordrvsvendorchargeback', vendorChargebackId);
	var unitId = vendorChargeback.getFieldValue('custrecordvcb_unit');
	//var salesOrderId = '';

//	if (unitId != '' && unitId != null)
//	{
//		salesOrderId = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_salesorder', false);
//		//invoiceNumber = GetInvoiceCreatedFromSalesOrder(salesOrderId);
//	}
//	else
//	{
//		salesOrderId = '';
//	}
	
	
	var vcbDate = ConvertNSFieldToString(vendorChargeback.getFieldValue('created')).split(" ", 1);
	var createdById = ConvertNSFieldToString(vendorChargeback.getFieldValue('owner'));
	var creatorName = '';
	var creatorEmail = '';
	if (createdById != '')
	{
		var columns = nlapiLookupField('employee', createdById, ['email', 'entityid'], false);
		creatorEmail = ConvertNSFieldToString(columns.email);
		creatorName = columns.entityid;
	}
	
	var vendorId = vendorChargeback.getFieldValue('custrecordvcb_vendor');
	var reasonForChange = ConvertNSFieldToString(vendorChargeback.getFieldValue('custrecordvcb_reasonforreturn'));
	var vendorCompany = nlapiLoadRecord('vendor', vendorId);
	var vendorCompanyName = ConvertNSFieldToString(vendorCompany.getFieldValue('companyname'));

	var vendorAddr1 = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'addr1', 1));
	var vendorAddr2 = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'addr2', 1));
	var vendorCity = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'city', 1));
	var vendorState = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'displaystate', 1));
	var vendorZip = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'zip', 1));
	var vendorPhone = ConvertNSFieldToString(vendorCompany.getFieldValue('phone'));
	var vendorFax = ConvertNSFieldToString(vendorCompany.getFieldValue('fax'));
	
	var claimNumber = ConvertNSFieldToString(vendorChargeback.getFieldValue('custrecordvcb_claim'));
	
	// The slice function returns strings less than 8 or truncates the front-most characters if the string is longer than 8 chars.
	var unitLast8VIN = ConvertNSFieldToString(vendorChargeback.getFieldText('custrecordvcb_unit').slice(-8));
	var dateOfPurchase = '';
	if (claimNumber != '' & claimNumber != null)
	{
		dateOfPurchase = nlapiLookupField('customrecordrvsclaim', claimNumber, 'custrecordclaim_retailsolddate');
	}
	else
	{
		dateOfPurchase = '';
	}
	
	var dateOfManufacture = '';
	if (unitId != '' & unitId != null)
	{
		dateOfManufacture = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_datecompleted', false); //this is the date of manufacture date work completed
	}
	else
	{
		dateOfManufacture = '';
	}	

	var vcbLineSublist = 'recmachcustrecordvcbitem_vendorchargeback';
	var itemsVcbLineCount = vendorChargeback.getLineItemCount(vcbLineSublist);	
	var parts = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_partstotal'));
	var partsMarkup = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_partsmarkuptotal'));

	var labor = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_labortotal'));
	var freight = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_freighttotal'));
	var sublet = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_sublettotal'));
	var totalDue = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_vendorchargebacktotal'));

	var htmlPage = '<head></head><body style="font-family:Verdana, Arial, Sans-serif;font-size:12px;">';
	
	var mainTable = '';
	var lineHeight = 'line-height:6;';
	
	//Add Title
	var titleTable = '<table border="0" style="width:100%;">';
		titleTable += '<tr><td align="left" style="width:60%;"><img src="' + companyLogoShow + 
						'" /></td><td rowspan="2" align="right" style="width:40%;"><p align="right" style="width:100%;"><b><i>Remit payment to:</i></b><br />' + 
						companyName + '<br />Attn: Warranty Recovery<br />' + companyAddress + '<br />' + city + ' ' + state + ' ' + zip + '</p></td></tr>'; 
		titleTable += '<tr><td style="font-size:15pt;"><b>Vendor Warranty Recovery Invoice</b></td></tr>';
		titleTable += '<tr><td colspan="2" align="right" style="' + lineHeight + '">Payments questions call: ' + companyPhone + '</td></tr>';
		titleTable += '<tr><td colspan="2" align="right" style="' + lineHeight + '">Fax payments to:' + companyFax + '</td></tr>';
		titleTable += '</table>';
		
		var headerInfoTable = '<table ' + cellSpacing + ' style="width:100%;" cellpadding="2">';
		headerInfoTable += '<tr><td>Bill to: </td></tr>';
		headerInfoTable += '<tr><td style="border-bottom:1px; ' + lineHeight + ' width:10%;">' + vendorId + '</td><td style="' + lineHeight + 
								' width:5%;">&nbsp;&nbsp;&nbsp;</td><td style="border-bottom:1px;' + lineHeight + ' width:30%;" colspan="2">' + vendorCompanyName + '</td><td align="right" style="' + 
								lineHeight + ' width:20%;">Invoice No.</td><td align="center" style="border-bottom:1px; ' + lineHeight + 'width:30%;">' + vendorChargebackId + '</td></tr>';
		headerInfoTable += '<tr><td style="' + lineHeight + ' vertical-align:super; font-size:6pt;">Vendor #</td><td style="' + lineHeight + 
								'">&nbsp;&nbsp;&nbsp;</td><td style="border-bottom:1px; ' + lineHeight + '" colspan="2">' + vendorAddr1 + '</td><td align="right" style="' + 
								lineHeight + '">Date</td><td align="center" style="border-bottom:1px; ' + lineHeight + '">' + vcbDate[0] + '</td></tr>';
		headerInfoTable += '<tr><td style="' + lineHeight + '"></td><td style="' + lineHeight + '">&nbsp;&nbsp;&nbsp;</td><td style="border-bottom:1px; ' + 
								lineHeight + '" colspan="2">' + vendorAddr2 + '</td><td align="right" style="' + lineHeight + 
								' padding-top:2px;">By</td><td align="center" style="border-bottom:1px; ' + lineHeight + '">' + creatorName + '</td></tr>';
		headerInfoTable += '<tr><td style="' + lineHeight + '"></td><td style="' + lineHeight + '">&nbsp;&nbsp;&nbsp;</td><td style="border-bottom:1px; ' + 
								lineHeight + '" colspan="2">' + vendorCity + '  ' + vendorState + '  ' + vendorZip + '</td><td colspan="2" align="right" style="' + 
								lineHeight + '">email: ' + creatorEmail + '</td></tr>';
		headerInfoTable += '<tr>' +
								'<td style="' + lineHeight + ' width:15%;">' +
								'</td>' +
								'<td style="' + lineHeight + ' width:10%;">' +
									'&nbsp;&nbsp;&nbsp;' +
								'</td>' + 
								'<td style="' +	lineHeight + '">' +
									'Phone ' +
								'</td>' +
								'<td style="border-bottom:1px; ' +	lineHeight + '">' +
								vendorPhone + 
							'</td>' +
							'</tr>';
		headerInfoTable += '<tr>' +
								'<td style="' + lineHeight + '">' +
								'</td>' +
								'<td style="' + lineHeight + '">' +
									'&nbsp;&nbsp;&nbsp;' +
								'</td>' + 
								'<td style="' +	lineHeight + '">' +
									'Fax # ' +
								'</td>' +
								'<td style="border-bottom:1px; ' +	lineHeight + '  width:40%;">' +
								vendorFax + 
							'</td>' +
							'</tr>';
		headerInfoTable += '</table><br />';
		
	var itemsTable = '<table border="0" style="width:100%;">';
		itemsTable += 	'<tr>' +
							'<td align="center" style="border: 1px solid #000000; border-spacing:0px;">VIN (last 8 digits)</td>' +
							'<td align="center" style="border: 1px solid #000000; border-spacing:0px;">DOP</td>' + 
							'<td align="center" style="border: 1px solid #000000; border-spacing:0px;">DOM</td>' + 
							'<td align="center" style="border: 1px solid #000000; border-spacing:0px;">Claim #</td>' + 
							'<td align="center" style="border: 1px solid #000000; border-spacing:0px;">Job</td>' + 
							'<td align="center" style="border: 1px solid #000000; border-spacing:0px;">Part #</td>' + 
							'<td align="center" style="border: 1px solid #000000; border-spacing:0px;">Part Description</td>' +
						'</tr>';
		
	var currentLineItemId = '';
	var vcbLaborItemId = GetVCBLaborItem();
	var vcbFreightItemId = GetVCBFreightItem();
	var vcbSubletItemId = GetVCBSubletItem();
	
	var partsExist = false;
	var job = 0;
	//vendorChargeback.getLineItemValue(vcbLineSublist, 'custrecordvcbitem_job', i);
	
	// This for loop goes through the vcb line items and creates a table for the job(operation line #) itemid(part #) and the description of the
	// items.
	for (var i = 1; i <= itemsVcbLineCount; i++)
	{
		currentLineItemId = vendorChargeback.getLineItemValue(vcbLineSublist, 'custrecordvcbitem_item', i);
		if (currentLineItemId != vcbLaborItemId && currentLineItemId != vcbFreightItemId && currentLineItemId !=  vcbSubletItemId)
		{
			partsExist = true;
			job = ConvertNSFieldToString(vendorChargeback.getLineItemValue(vcbLineSublist, 'custrecordvcbitem_job', i));
			itemsTable += 	'<tr>' +
								'<td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + unitLast8VIN + 
								'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
								dateOfPurchase + 
								'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
								dateOfManufacture + 
								'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
								claimNumber + 
								'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
								job + 
								'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
								nlapiLookupField('item', currentLineItemId, 'itemid', false) + 
								'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
								ConvertNSFieldToString(vendorChargeback.getLineItemValue(vcbLineSublist, 'custrecordvcbitem_description', i)) + 
								'</td>' +
							'</tr>';
		}
	}
	if (!partsExist)
	{
		itemsTable += 	'<tr>' +
							'<td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + unitLast8VIN + 
							'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
							dateOfPurchase + 
							'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
							dateOfManufacture + 
							'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
							claimNumber + 
							'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
							'' + 
							'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
							'' + 
							'</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + 
							'' + 
							'</td>' +
						'</tr>';
	}
	itemsTable += '</table>';
		
	var summaryPreference = '<b><i>Summary: </i></b>' + GetVCBPrintoutSummary();
	var photosPreference = '<b><i>Photos: </i></b>' + GetVCBPrintoutPhotos();
	var partsPickupPreference = '<b><i>Parts Pickup: </i></b>' + GetVCBPrintoutPartsPickup();
	
	var photosReplace = photosPreference.replace("{email}", creatorEmail);
	var space = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
	var bodyTable = '<table ' + cellSpacing + ' style="width:100%" colspan="4" cellpadding="3">' +
						'<tr>' +
							'<td colspan="4" style="width:100%" cellpadding="0"><br />' +
							'Reason for Return <u>' + reasonForChange + '</u><br /><br />' +
							'</td>' +
						'</tr>';
		bodyTable += '<tr><td colspan="2" rowspan="10" style="width:70%; padding:0; font-size:8pt;">' + summaryPreference + 
						'<br /><br />' + photosReplace + '<br /><br />' + partsPickupPreference + '</td></tr>';
		bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '"></td><td align="center" style="' + lineHeight + '"></td></tr>';
		bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Labor </td><td align="center" style="border-bottom:1px; ' + 
						lineHeight + '">' + CurrencyFormatted(labor) + '</td></tr>';
		bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Parts </td><td align="center" style="border-bottom:1px; ' + 
						lineHeight + '">' + CurrencyFormatted(parts) + '</td></tr>';
		bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Parts markup </td><td align="center" style="border-bottom:1px; ' + 
						lineHeight + '">' + CurrencyFormatted(partsMarkup) + '</td></tr>';
		bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Freight (in) </td><td align="center" style="border-bottom:1px; ' + 
						lineHeight + '">' + CurrencyFormatted(freight) + '</td></tr>';
		bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Sublet </td><td align="center" style="border-bottom:1px; ' + 
						lineHeight + '">' + CurrencyFormatted(sublet) + '</td></tr>';
		bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '"></td><td align="center" style="' + lineHeight + '"></td></tr>';
		bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + 
						' border-collapse:separate; border-spacing:3px;">Total Due </td><td align="center" style="' + lineHeight + 
						' border-bottom: 2px double #000;">' + CurrencyFormatted(totalDue) + '</td></tr>';
		bodyTable += '<tr><td height="0" style="width:15%; font-size:1pt;"></td>' +
						'<td align="left" height="0" style="border-top: 1px double #000; font-size:1pt;"></td></tr>';
		bodyTable += '<tr><td colspan="4" align="center" style="' + lineHeight + ' border-bottom: 1px double #000; width:100%;"><br />' +
						'</td></tr>';
		
		bodyTable += '<tr><td colspan="4" align="center" style="font-size:12pt;"><b>VENDORS: Complete the information below and fax to ' + 
						companyFax + ' Attn: ' + creatorName + '</b></td></tr>';
		bodyTable += '<tr><td colspan="4" align="center" style="height:6px; line-height:3px; vertical-align:middle; font-size:8pt;">' + 
						'<i>Warranty returned parts not picked up or requested to be returned will be field scrapped after 60 days.</i><br />' +
						'<br /><br /></td></tr>';
		bodyTable += '<tr><td colspan="4" ><br />RMA #____________________________________________________' + space + space + space + space + 
						'______________________<br /><br /></td></tr>';
		bodyTable += '<tr><td colspan="4" >____________________________________________________________________________________________________</td></tr>';
		bodyTable += '<tr><td colspan="4" style="height:-2px; line-height:-4px; vertical-align:super; font-size:6pt;"><i>Driver\'s signature</i></td></tr>';
		
		bodyTable += '</table>';
	
	mainTable += titleTable;
	mainTable += headerInfoTable;
	mainTable += itemsTable;
	mainTable += bodyTable;	
	htmlPage += mainTable;
	htmlPage +='</body>';
	
	return htmlPage;
	
}
