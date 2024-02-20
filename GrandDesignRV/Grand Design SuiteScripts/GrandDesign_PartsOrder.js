/**
 * Module Description: This script contains logic for Grand Design Parts Order. The script runs on top of the RVS logic.
 * 
 * This script runs on Web Orders (estimates) created in the portal and internally.
 * 
 * However, the client side scripts will never run in the portal because creation of new web orders in the portal happens with 
 * the parts order proxy record.
 * 
 * 
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Jan 2014     ibrahima
 *
 */

var GD_WEBORDER_REQUESTER = 'custbodygd_dealerportalrequester';

var GD_WEBORDER_DEALER_FILTERED = 'custpagegd_weborder_dealer';
var GD_WEBORDER_DEALER = 'entity';

/**
 * Performs Grand Design Parts Order Before Load logic.
 * @param type
 * @param {nlobjForm} form
 * @param request
 */
function GrandDesign_PartsOrder_BeforeLoad(type, form, request)
{
	if(type == 'create')
	{
		if(request != null)
		{
			var partsInquiryId = ConvertNSFieldToString(request.getParameter('record.custbodypartsinquirynumber'));			
			if(partsInquiryId != '' && GD_IsDealerLoggedIn())
			{
				CopyPartsInquiryItem(partsInquiryId);
			}
		}
	}
}

/**
 * Performs Grand Design Parts Order Before Submit logic.
 * @param type
 */
function GrandDesign_PartsOrder_BeforeSubmit(type)
{	

	if(type == 'create' || type == 'edit')
	{
		var partInquiryId = ConvertNSFieldToString(nlapiGetFieldValue('custbodypartsinquirynumber'));
		if(partInquiryId != '')
		{
			//check the status of Parts Inquiry that this order is created from.
			//If the status is not closed, we want to make sure that we close it now.
			var statusId = ConvertNSFieldToString(nlapiLookupField('customrecordgranddesignpartsinquiry', partInquiryId, 'custrecordpartsinquiry_status', false));		
			if(statusId != PARTS_INQUIRY_STATUS_CLOSED)
			{
				nlapiSubmitField('customrecordgranddesignpartsinquiry', partInquiryId, 'custrecordpartsinquiry_status', PARTS_INQUIRY_STATUS_CLOSED, false);
			}
		}

		var shipmethod = nlapiGetFieldValue('shipmethod');
		if(shipmethod != null && shipmethod != '')
		{
			//write search to find the corresponding ship method
			var filters = new Array();
			filters[filters.length] = new nlobjSearchFilter('custrecordgd_webportalshiptype_shipitem', null, 'is', shipmethod);
			filters[filters.length] = new nlobjSearchFilter('custrecordgd_webportalshiptype_showinweb', null, 'is', 'T');
			
			var columns = new Array();
			columns[columns.length] = new nlobjSearchColumn('internalid');
			
			var results = nlapiSearchRecord('customrecordgd_webportalshiptype', null, filters, columns);
			if(results != null)
			{
				nlapiSetFieldValue('custbodygd_webpartsorder_shipvia', results[0].getValue('internalid'), false, false);
			}
			else
			{
				//do not change web portal shipping type if it is not supported in the web portal (Show in Web Portal is 'F')
			}
		}
	}
}

/**
 * Perfoms Grand Design Parts Order After Submit logic.
 * @param type
 */
function GrandDesign_PartsOrder_AfterSubmit(type)
{

	if(type == 'delete')
	{
		var oldRecord = nlapiGetOldRecord();
		
		var partsInquiryId = ConvertNSFieldToString(oldRecord.getFieldValue('custbodypartsinquirynumber'));
		
		if(partsInquiryId != '')
		{
			nlapiSubmitField('customrecordgranddesignpartsinquiry', partsInquiryId, 'custrecordpartsinquiry_status', PARTS_INQUIRY_STATUS_ANSWERED, false);
		}
	}
}

/**
 * Make sure the user doesn't select New address.
 * Also hide the new address button on load.
 * 
 * @param type
 * @param name
 * @param line
 */
function GrandDesign_PartsOrder_ValidateField(type, name, line)
{
	//hide the new address button
	var newAddressBtn = document.getElementById('shipaddresslist_popup_new');
	if (newAddressBtn != null) {
		newAddressBtn.parentNode.removeChild(newAddressBtn);
	}
	var popupAddressBtn = document.getElementById('shipaddresslist_popup_link');
	if (popupAddressBtn != null) {
		popupAddressBtn.parentNode.removeChild(popupAddressBtn);
	}
	
	//make sure they don't select the new address.
	if (name == 'shipaddresslist' && nlapiGetFieldValue(name) == -1) {
		alert('You may not select a new address on sales orders.');
		return false;
	}
	
	//make sure they don't select 'special order' (Case #11235)
	if (type == 'item' && name == 'createpo') {
		
		if(nlapiGetCurrentLineItemValue(type,name) == 'SpecOrd'){
			alert('You may not choose Special Order for Parts Sales Orders.');
			return false;
		}
	}
	
	return true;
}

/**
 * Field Changed
 * 
 * @param type
 * @param name
 * @param line
 */
function GrandDesign_PartsOrder_FieldChanged(type, name, line)
{
	//Sync up the RVS Unit field to the GD Web Order Unit field
	if (name == 'custbodygd_weborderunit')
	{
		nlapiSetFieldValue('custbodyrvsunit', nlapiGetFieldValue('custbodygd_weborderunit'), true, true);
	}
}



/**
 * Copies Items of the specified Parts Inquiry
 * @param partsInquiryId
 */
function CopyPartsInquiryItem(partsInquiryId)
{
	if(partsInquiryId != null && trim(partsInquiryId) != '')
	{
		var itemSublist = 'recmachcustrecordpartsinquiryitems_partsinquiry';
		var partsInquiryRecord = nlapiLoadRecord('customrecordgranddesignpartsinquiry', partsInquiryId);
		var itemCount = partsInquiryRecord.getLineItemCount(itemSublist);
		for(var i = 1; i <= itemCount; i++) //For sublist, i start at 1 not zero
		{
			var itemId = ConvertNSFieldToString(partsInquiryRecord.getLineItemValue(itemSublist, 'custrecordpartsinquiryitems_item', i));				
			if(itemId != '') //If Parts Inquiry Item is set, add order line item.
			{
				//var description = ConvertNSFieldToString(partsInquiryRecord.getLineItemValue(itemSublist, 'custrecordpartsinquiryitems_description', i));
				var quantity = ConvertNSFieldToFloat(partsInquiryRecord.getLineItemValue(itemSublist, 'custrecordpartsinquiryitems_quantity', i));

				CreateSalesOrderLineItems(itemId, quantity);				
			}
		}
	}
}

/**
 * Creates line items given the line information.
 * @param itemId
 * @param desc
 * @param qty
 */
function CreateSalesOrderLineItems(itemId, qty)
{
	var itemSublist = 'item';
	var fields = ['saleunit', 'salesdescription','baseprice', 'custitemgd_partsbin'];
	var columns = nlapiLookupField('item', itemId, fields, false);	
	var rate = ConvertNSFieldToFloat(columns.baseprice);
	var amount = rate * qty;

	nlapiSelectNewLineItem(itemSublist);		
	nlapiSetCurrentLineItemValue(itemSublist, 'custcolrvspartitemdealerportal', itemId, true, false); //This is the Item column in dealer portal
	nlapiSetCurrentLineItemValue(itemSublist, 'item', itemId, true, false); //This is the Description column in dealer portal
	nlapiSetCurrentLineItemValue(itemSublist, 'quantity', qty, false, false);	
	nlapiSetCurrentLineItemValue(itemSublist, 'price', '1', false, false); //set Price Level of "Base Price"
	nlapiSetCurrentLineItemValue(itemSublist, 'units', columns.saleunit, false, false);
	nlapiSetCurrentLineItemValue(itemSublist, 'description', ConvertNSFieldToString(columns.salesdescription), false, false);
	nlapiSetCurrentLineItemValue(itemSublist, 'rate', rate, false, false);
	nlapiSetCurrentLineItemValue(itemSublist, 'amount', amount.toFixed(2), false, false);	
	nlapiSetCurrentLineItemValue(itemSublist, 'custcolgd_partsbin', columns.custitemgd_partsbin, false, false);
	nlapiCommitLineItem(itemSublist);	
}
