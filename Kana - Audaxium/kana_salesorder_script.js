/**
Change ID		:CH#DISC_ROUND
Programmer		:Sagar Shah
Description		: Adding a new discount field that stores rounded value of discount percent for printing purpose only
Date			: 11/24/2008		
=================================================================================
Change ID		:CH#ORDER_FULFILLMENT
Programmer		:Sagar Shah
Description		: Format License info into one field
Date			: 02/03/2009
==================================================================================
Change ID		:CH#KANA10_VALIDATION
Programmer		:Sagar Shah
Description		: Changes for implementing KANA 10 validations like Qty in PVUs, DB2 Qty in PVUs, WAS Qty in PVUs, etc.
Date			: 07/20/2009
==================================================================================
Change		: CH#NEW_STAGE_2011
Author		: Sagar Shah
Date		: 01/04/2011
Description	: On saving of Sales Order, copy the line item information from Sales Order into Oppty. Also update Oppty Forecast Amount fields
This is part of  new Sales Stages changes suggested by Chip.
**/

//CH#DISC_ROUND - start
function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

function validateLineItem(type, name) {
	roundDiscount(type,name);
	return true;
}

function roundDiscount(type,name) 
{	
	var disc = nlapiGetCurrentLineItemValue('item', 'custcol_discount');
	if(disc!='')
	{
		disc = disc.split('%', 1);
		var pdisc = roundNumber(disc,1);
		nlapiSetCurrentLineItemValue('item', 'custcol_discount_print_only', pdisc);
	} else
	{
		nlapiSetCurrentLineItemValue('item', 'custcol_discount_print_only', '');
	}  
}
//CH#DISC_ROUND - end

function saveRecord()
{
		//CH#ORDER_FULFILLMENT - start
	var eval_end_date = nlapiGetFieldValue('enddate');
	//alert('end date:'+eval_end_date);
	if(eval_end_date != '' && eval_end_date != null)
	{		
		nlapiSetFieldValue('custbody_eval_expiration_date',eval_end_date);

	}

	var source = nlapiGetFieldValue('source');

	if(source != '' && source != null && source=='Customer Center')
	{		
		var lineItemCount = nlapiGetLineItemCount('item');		
		for ( var i = 1; i <= lineItemCount; i++) {
			/*
			nlapiSetLineItemValue('item', 'amount', i,'10'); //Non-Revenue Sales Order should be zero dollar transactions.
			//myalert('amount : '+nlapiGetLineItemValue('item', 'amount', i));

			//copy the non-revenue description into Item Description
			var non_revenue_desc = nlapiGetLineItemValue('item', 'custcol_non_rev_desc', i);
			nlapiSetLineItemValue('item', 'description', i,non_revenue_desc);
			*/
			nlapiSelectLineItem('item', i);
			nlapiSetCurrentLineItemValue('item', 'rate','0');
			var non_revenue_desc = nlapiGetCurrentLineItemValue('item', 'custcol_non_rev_desc');
			nlapiSetCurrentLineItemValue('item', 'description', non_revenue_desc);
			nlapiCommitLineItem('item');

		}
	}
	//CH#ORDER_FULFILLMENT - end

	//CH#KANA10_VALIDATION - start
	var kana10status = kana10Validation();
	if(kana10status != true) {
		return false;
	}
	//CH#KANA10_VALIDATION - end
	//CH#NEW_STAGE_2011 - start
	var errMsg = copyItemsToOpportunity();
	if(errMsg != '') {
		alert('Following error occurred while copying the Line Items into Opportunity transaction : \n'+errMsg);
		return false;
	}
	//CH#NEW_STAGE_2011 - end

	return true;
}

function myalert(variable)
{
	var myrole = nlapiGetRole();
	if(myrole == 3){ //Administrator only alert
		alert(variable);
	}
}