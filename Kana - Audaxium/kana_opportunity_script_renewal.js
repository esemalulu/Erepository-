/**
 * Function restrics the user from entering the custom price.
 * if users selects the custom price then it gives an alert, disables te arye field,
 * and defaults the price level to Base Price
 * @author Prachi Mendhekar
 * @version 1.0
 */
 /** 
Change ID		:CH#FORECAST2
Programmer		:Sagar Shah
Description		: Modified the code to insert 6 hidden fields: IsL1Committed, IsL1LikelyUpside, IsL1BestCase,
				  IsL2Committed, IsL2LikelyUpside and IsL2BestCase
                  Stores binary value 0 or 1. 
Date			: 01/16/2008		
=================================================================================
Change ID		:CH#FORECAST3
Programmer		:Sagar Shah
Description		: Setting default values of Level1 and Level2 override amounts for each line item. 
Date			: 01/16/2008		
=================================================================================
Change ID		:CH#ITEM_QTY
Programmer		:Sagar Shah
Description		: Changes for making the Item Qty Type to Month(s)
Date			: 11/13/2008	
==================================================================================
Change ID		:CH#SALES_STATUS
Programmer		:Sagar Shah
Description		: Changes for implementing the 10 Marketing/Sales stages
Date			: 07/21/2009
==================================================================================
Change ID		:CH#WIN/LOSS REASON
Programmer		:Sagar Shah
Description		: Validate Win/Loss Reason
Date			: 10/16/2009
=========================================================================================
Change ID		:CH#MORE_SALESSTATUS_CHANGES
Programmer		:Sagar Shah
Description		: Changes submitted by Michelle & Christine
Date			: 02/11/2010
==================================================================================
Change ID		:CH#DISASTER RECOVERY ITEM - MANAGED SERVICES
Programmer		:Sagar Shah
Description		: Calculating amount for the Disaster Recovery - Managed Service Items
Date			: 02/01/2010
=====================================================================================
Change ID		:CH#GENERIC_MAINT_ITEM
Programmer		:Sagar Shah
Description		: For generic maintenance item make the Maint. Type field mandatory
Date			: 5/9/2012
==================================================================================
Change ID		:CH#DISC_ROUND
Programmer		:Sagar Shah
Description		: Adding a new discount field that stores rounded value of discount percent for printing purpose only
Date			: 02/03/2014		
==================================================================================
**/
function disableCustomTransactionFieldOld(type, name) {
	if(name  ==  'price') {
		// Get Custom price Level
		var priceLevel = nlapiGetCurrentLineItemValue('item', 'price'); 
		//alert('priceLevel : ' + priceLevel);
		// Value of Custom Price Level is -1
		if(priceLevel == '-1') {
			alert("Custom price level is not allowed, please use any other price level");
			//Disbale Price level field on transaction line
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1');
		}
	}
	return true;
}

function disableCustomTransactionField(type, name) {
	// Get Custom price Level
	var priceLevel = nlapiGetCurrentLineItemValue('item', 'price'); 
	if(priceLevel == '-1') {
		alert("Custom price level is not allowed, please use any other price level");
		return false;
	}
	return true;
}

/**
 * Fuction Calculates Amount for Hosted and Non Hosted Items
 * @author Prachi Mendhekar
 * @version 1.0
 */
function validateLineItem(type, name) {
	
	

	roundDiscount(type,name); //CH#DISC_ROUND
	
	// Discount
	var discount;
	// New Discount without a '%' sign
	var newDiscount;
	// Item Type
	var itemType;
	// Quantity
	var quantity;
	// Rate
	var rate;
	// Terms in months
	var term;
	// Calculated discount For Hosting Items
	var hostedDiscount;
	// Calculated discount for Non Hosting Items
	var nonHostedDiscount;
	// Product Family
	var productFamily;
	// Temp Product Family
	var tempProductFamily;
	// Current Line Count
	var currentLineCount;
	// Amount for a product family
	var tempAmt;
	// Total Amount
	var totalAmt;
	// Temp Item Type
	var tempItemType;
	// Maintenance Percentage
	var maintenancePercent;
	// Maintenance Amount
	var maintenanceAmount;
	// Term Item Value
	var termItem;
	var bValidateItem;
	var bGenericItem;

	//***10/11/2007 Vasu
	var is900found = false;
	var isnot900found = false;
	//***10/11/2007 Vasu
	var allowcustompricing = false;

	bGenericItem = false;
	bValidateItem = true;
	
	allowcustompricing = nlapiGetCurrentLineItemValue('item','custcol_allow_custom_pricing');
	if((allowcustompricing == null) || (allowcustompricing == '')){
		allowcustompricing = false;
	}

	itemType = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');
	if(type == 'item'){
		//***10/11/2007 Vasu
		var currentLineCount=0;
		var isOppItem;
		
		//for all existing items check what items have been used ( detail and 900 )
		currentLineCount = nlapiGetCurrentLineItemIndex('item');
		for ( var i = 1; i < currentLineCount; i++) {
			//isOppItem = nlapiGetLineItemValue('item', 'custcol_isparentitem',i);
			isOppItem = nlapiGetLineItemValue('item', 'custcol_opportunity_item',i);
			if("T" == isOppItem){
				is900found = true;
			}else{
				isnot900found = true;
			}
		}
		//do not allow a combination
		if((is900found == true) && (isnot900found == true)){
			alert("Opportunity only items starting with 900 and Detail line items cannot be combined");
			nlapiCancelLineItem(type);
			return false;
		}

		//do not allow a combination checking against the new entered item
		isOppItem = nlapiGetCurrentLineItemValue('item', 'custcol_opportunity_item');
		if(("T" == isOppItem) && (isnot900found == true)){
			alert("Opportunity only items starting with 900 and Detail line items cannot be combined");
			nlapiCancelLineItem(type);
			return false;
		}
		if(("T" != isOppItem) && (is900found == true)){
			alert("Opportunity only items starting with 900 and Detail line items cannot be combined");
			nlapiCancelLineItem(type);
			return false;
		}
		
		//if the new item entered is a generic item then we allow custom pricing otherwise we don't
		if("T" == isOppItem){
			bGenericItem = true;
		}
		
		if((bGenericItem == false) && (itemType != 'Maintenance') && (allowcustompricing == false)){
			bValidateItem = disableCustomTransactionField(type, name);
			if(bValidateItem == false){
				nlapiDisableLineItemField('item', 'rate', true);
				nlapiSetCurrentLineItemValue('item', 'price', '1');
			}
		
		}
	}
	
	

	// Calculate And Set Discount on Line Items
	 discount = nlapiGetCurrentLineItemValue('item', 'custcol_discount');
	 //alert('discount : ' + discount);
	 if(null == discount || discount == '') {
	 	discount = 0;
	 	newDiscount = discount;
	 } else {
	 	newDiscount = discount.split('%', 1);
	 }
	 //alert('newDiscount : ' + newDiscount);
	
	// '' == ''
	// '- New -' == '-1'
	// Licence == 1
	// Maintenance == 2
	// Professional Services == 3
	// Training == 4
	// Other == 5
	// OnDemand == 6
	//alert('itemType : ' + itemType);
	if(null == itemType || itemType == '' || itemType == '-1') {
		itemType = 0;
	}
	//alert('itemType : ' + itemType);
	
	quantity = nlapiGetCurrentLineItemValue('item', 'quantity');
	//alert('quantity : ' + quantity); 
	if(null == quantity || quantity == '') {
		quantity = 0;
	}
	//alert('quantity : ' + quantity); 
	
	rate = nlapiGetCurrentLineItemValue('item', 'rate');
	//alert('rate : ' + rate);
	if(null == rate || rate == ''){
		rate = 0;
	}
	//alert('rate : ' + rate);
	
	term = nlapiGetCurrentLineItemValue('item', 'custcol_number_of_months');
	//alert('term : ' + term);
	if(null == term || term == '') {
		term = 0;
	}
	//alert('term : ' + term);
	
	// List Ids 
	// New == -1
	// Term == 1
	// No Term == 2
	termItem = nlapiGetCurrentLineItemValue('item', 'custcol_term_item');
	//alert('termItem : ' + termItem);
	
	// if hosting items ie. if delivery mode is either Hosted or on Demand
	// then calculate amount as (Quantity*Rate * Terms Of Months) - ((Quantity*Rate * Terms Of Months)* discount/100)
	//if(itemType == 'OnDemand' ){
	var qtyType = nlapiGetCurrentLineItemText('item', 'custcol_qty_type'); //CH#ITEM_QTY
	//CH#DISASTER RECOVERY ITEM - MANAGED SERVICES - start
	if(itemType == 'Managed Services - DR') {
		
		//alert('Inside');
		totalAmt = parseFloat(0);
		productFamily = nlapiGetCurrentLineItemText('item', 'custcol_item_type');
		//alert('productFamily :' + productFamily);
		currentLineCount = nlapiGetCurrentLineItemIndex('item');
		//alert('currentLineCount : ' + currentLineCount);
		
		for ( var i = 1; i < currentLineCount; i++) {
			var memberItemType = nlapiGetLineItemValue('item', 'custcol_item_type_4_scripting', i);
			//alert('tempItemType : ' + tempItemType);
			
			var memberProductFamily = nlapiGetLineItemText('item', 'custcol_item_type', i);
			//alert('tempProductFamily : ' + tempProductFamily);
			
			var msQtyType = nlapiGetLineItemText('item', 'custcol_qty_type', i);

			if(memberItemType == 'Managed Services' && (memberProductFamily == productFamily || memberProductFamily == 'Managed Services Access and Capacity') && msQtyType != 'Setup(s)') {
				tempAmt = nlapiGetLineItemValue('item', 'amount', i);

				var tempTermItem = nlapiGetLineItemValue('item', 'custcol_term_item', i);
				var tempQty = 0;

				if(tempTermItem == 1) 
				{
					tempQty = nlapiGetLineItemValue('item', 'custcol_number_of_months', i); 
				} else {
					tempQty = nlapiGetLineItemValue('item', 'quantity', i);
				}

				totalAmt += parseFloat(tempAmt)/tempQty;
			}
		}// end for loop
		//alert('totalAmt : ' + totalAmt);

		var DRRate = parseFloat(totalAmt) * (parseFloat(50) * 1/100);

		var beforeRoundingDRRate = DRRate;
		DRRate = roundNumber(DRRate,2);
		nlapiSetCurrentLineItemValue('item', 'custcol_number_of_months', '');

		//nlapiSetLineItemValue('item', 'rate', currentLineCount, maintenanceRate);
		nlapiSetCurrentLineItemValue('item', 'rate', DRRate);
		//alert('DRRate : ' + DRRate);

		var tempDRAmount = 	parseFloat(beforeRoundingDRRate) * quantity;
		//alert('tempDRAmount : ' + tempDRAmount);
		
		finalDRAmount = tempDRAmount -  (tempDRAmount * (parseFloat(newDiscount) * 1/100));
		//alert('finalDRAmount : ' + finalDRAmount);

		//nlapiSetLineItemValue('item', 'amount', currentLineCount, maintenanceAmount);
		nlapiSetCurrentLineItemValue('item', 'amount', finalDRAmount);
		//alert('After Setting The Value');			
	} //CH#DISASTER RECOVERY ITEM - MANAGED SERVICES - end

	else if(termItem == 1 && itemType != 'Maintenance'){
			var tempDiscount = 	parseFloat(rate) * parseInt(quantity) * parseInt(term);
			//alert('tempDiscount : ' + tempDiscount);
			hostedDiscount = tempDiscount - (tempDiscount * (parseFloat(newDiscount) * 1/100));
			//hostedDiscount = (parseFloat(rate) - parseFloat(newDiscount)) * (parseInt(quantity) * parseInt(term));
			//alert('hostedDiscount : ' + hostedDiscount);
			nlapiSetCurrentLineItemValue('item', 'amount', hostedDiscount);	
	//} else if(itemType == 'Maintenance') {
	} else if(itemType == 'Maintenance' || (itemType=='Maintenance - Fixed' && qtyType=='Month(s)') ){ //CH#ITEM_QTY

	//CH#GENERIC_MAINT_ITEM - start
		
		if(checkMaintType()==false)
			return false;
		
	//CH#GENERIC_MAINT_ITEM - end

		var tempDiscount = 	parseFloat(rate) * parseInt(quantity);
		//CH#ITEM_QTY - start
		//nlapiSetCurrentLineItemValue('item', 'custcol_renewal_annualprice', rate);	
		if (qtyType=='Month(s)')		
		{
			tempDiscount = nlapiGetCurrentLineItemValue('item', 'custcol_renewal_annualprice');
			rate = roundNumber(parseFloat(tempDiscount)/12,2);
			nlapiSetCurrentLineItemValue('item', 'rate', rate);
		}
		//CH#ITEM_QTY - end
		maintenanceAmount = tempDiscount - (tempDiscount * (parseFloat(newDiscount) * 1/100));
		nlapiSetCurrentLineItemValue('item', 'amount', maintenanceAmount);	

	} else if(termItem == 2 && itemType != 'Maintenance'){
	//else if(itemType != 'OnDemand') {
		var tempDiscount = 	parseFloat(rate) * parseInt(quantity);
		nonHostedDiscount = tempDiscount - (tempDiscount * (parseFloat(newDiscount) * 1/100));
		nlapiSetCurrentLineItemValue('item', 'amount', nonHostedDiscount);
	//}
	}
	return true;
}

function checkitems(type, name)
{
	var currentLineCount=0;
	var isOppItem;
	var is900found = false;
	var isnot900found = false;
	var productFamily;
	
	currentLineCount = nlapiGetCurrentLineItemIndex('item');
	for ( var i = 1; i <= currentLineCount; i++) {
		//isOppItem = nlapiGetLineItemValue('item', 'custcol_opportunity_item',i);
		isOppItem = nlapiGetLineItemValue('item', 'custcol_opportunity_item',i);
		alert(isOppItem);
		
		productFamily = nlapiGetLineItemValue('item', 'custcol_item_type',i);
		alert(productFamily);
		
		if("T" == isOppItem){
			is900found = true;
		}else{
			isnot900found = true;
		}
	}
	
	if((is900found == true) && (isnot900found == true)){
		return false;
	}
		
	return true;
}
	//CH#ITEM_QTY - start
function fieldChanged(type,name) 
{	
	//var index=nlapiGetCurrentLineItemIndex('item');	
	if(type=='item' && name=='item')
	{
		var itemType = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');
		var qtyType = nlapiGetCurrentLineItemText('item', 'custcol_qty_type');

		//alert('Qty value : '+qtyType);		
		if ( (itemType=='Maintenance' || itemType=='Maintenance - Fixed') && qtyType=='Month(s)')
		{
			nlapiSetCurrentLineItemValue('item', 'quantity', '12');
		}
	}
	
	// start - CH#SALES_STATUS
	if(name == 'custbody_rpf_recieved' && nlapiGetFieldValue('custbody_rpf_recieved') == 'T')
	{
		var d = new Date();
		var curr_date = d.getDate();
		var curr_month = d.getMonth()+1;
		var curr_year = d.getFullYear();
		var formattedDate = curr_month + "/" +curr_date + "/" + curr_year;
		nlapiSetFieldValue('custbody_stage_rpf_receiving',nlapiGetFieldText('entitystatus'));
		nlapiSetFieldValue('custbody_rpf_received_date',formattedDate);
	}
	if (name == 'custbody_rpf_recieved' && nlapiGetFieldValue('custbody_rpf_recieved') == 'F')
	{
		nlapiSetFieldValue('custbody_stage_rpf_receiving','');
		nlapiSetFieldValue('custbody_rpf_received_date','');
	}
	// end - CH#SALES_STATUS

	// CH#MORE_SALESSTATUS_CHANGES - start
	salesFieldChange(type,name);
	// CH#MORE_SALESSTATUS_CHANGES - end

}
function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

function saveRecord()
{
	//CH#WIN/LOSS REASON - Start
	var winloss_status = validateWinLossReason();
	if(winloss_status != true) {
		return false;
	}
	//CH#WIN/LOSS REASON - End
	return true;
}


//CH#DISC_ROUND - start
function roundDiscount(type,name) 
{	
	var disc = nlapiGetCurrentLineItemValue('item', 'custcol_discount');
	if(disc!='' && disc!=null)
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