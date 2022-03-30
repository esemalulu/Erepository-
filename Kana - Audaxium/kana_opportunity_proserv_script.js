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
Date			: 01/09/2008		
=================================================================================
Change ID		:CH#FORECAST3
Programmer		:Sagar Shah
Description		: Setting default values of Level1 and Level2 override amounts for each line item. 
Date			: 01/11/2008		
=================================================================================
Change ID		:CH#UNIT_PRICE_RESTRICTION
Programmer		:Sagar Shah
Description		: Disable Unit Price for Line Items
Date			: 11/03/2008	
=================================================================================
Change ID		:CH#ITEM_QTY
Programmer		:Sagar Shah
Description		: Changes for making the Item Qty Type to Month(s)
Date			: 10/13/2008
==================================================================================
Change ID		:CH#KANA10_VALIDATION
Programmer		:Sagar Shah
Description		: Changes for implementing KANA 10 validations like Qty in PVUs, DB2 Qty in PVUs, WAS Qty in PVUs, etc.
Date			: 07/20/2009
==================================================================================
Change ID		:CH#SALES_STATUS
Programmer		:Sagar Shah
Description		: Changes for implementing the 10 Marketing/Sales stages
Date			: 07/21/2009
==================================================================================
Change ID		:CH#FIX_ERROR
Programmer		:Sagar Shah
Description		: Fix unusual javascript error
Date			: 07/24/2009
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
==================================================================================
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

/**
 * Fuction Calculates Amount for Hosted and Non Hosted Items
 * @author Prachi Mendhekar
 * @version 1.0
 */
function validateLineItem(type, name) {
	
        //AUX: 4/9/2014 - Fix issues when sales team is changed, error occurs on save 
        //Moving roundDiscount(type, name) call to AFTER item sublist check

	//roundDiscount(type,name); //CH#DISC_ROUND
	
	//CH#FIX_ERROR - start
	if(type != 'item'){
		return true;
	}

        roundDiscount(type,name); //CH#DISC_ROUND

	//CH#FIX_ERROR - end

	// CH#UNIT_PRICE_RESTRICTION - start
	//setItemRate(type,name); 
	// CH#UNIT_PRICE_RESTRICTION - end

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
	var bRoyaltyItem;
	
	//***10/11/2007 Vasu
	var is900found = false;
	var isnot900found = false;
	//***10/11/2007 Vasu
	
	bGenericItem = false;
	bValidateItem = true;
	
	productFamily = nlapiGetCurrentLineItemValue('item', 'custcol_item_type');
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
		
	
		if((bGenericItem == false) && (productFamily != '14') && (itemType != 'Hosting')){
			bValidateItem = disableCustomPricingValidateLine(type, name,true, true);
			if(bValidateItem == false){
				return false;
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
	} else if(itemType != 'Maintenance'){
	//else if(itemType != 'OnDemand') {
		var tempDiscount = 	parseFloat(rate) * parseFloat(quantity);
		nonHostedDiscount = tempDiscount - (tempDiscount * (parseFloat(newDiscount) * 1/100));
		nlapiSetCurrentLineItemValue('item', 'amount', nonHostedDiscount);
	//}
	}
	else if((itemType == 'Maintenance') && (bGenericItem == true)){
		var tempDiscount = 	parseFloat(rate) * parseInt(quantity);
		maintenanceAmount = tempDiscount - (tempDiscount * (parseFloat(newDiscount) * 1/100));
		nlapiSetCurrentLineItemValue('item', 'amount', maintenanceAmount);	
	}else if((itemType == 'Maintenance') && (bGenericItem == false)){
	
	//CH#GENERIC_MAINT_ITEM - start
		
		if(checkMaintType()==false)
			return false;
		
	//CH#GENERIC_MAINT_ITEM - end

		//alert('Inside');
		totalAmt = parseFloat(0);
		//alert(totalAmt);
		productFamily = nlapiGetCurrentLineItemValue('item', 'custcol_item_type');
		//alert('productFamily :' + productFamily);
		maintenancePercent = nlapiGetCurrentLineItemValue('item', 'custcol_maintenance_percentage');
		//maintenancePercent = nlapiGetCurrentLineItemValue('item', 'custcol_discount');
		//alert('maintenancePercent : ' + maintenancePercent);
		currentLineCount = nlapiGetCurrentLineItemIndex('item');
		//alert('currentLineCount : ' + currentLineCount);
		for ( var i = 1; i < currentLineCount; i++) {
			tempItemType = nlapiGetLineItemValue('item', 'custcol_item_type_4_scripting', i);
			//alert('tempItemType : ' + tempItemType);
			tempProductFamily = nlapiGetLineItemValue('item', 'custcol_item_type', i);
			//alert('tempProductFamily : ' + tempProductFamily);
			if(tempItemType == 'License' && tempProductFamily == productFamily) {
				tempAmt = nlapiGetLineItemValue('item', 'amount', i);
				//alert('tempAmt : ' + tempAmt);
				totalAmt += parseFloat(tempAmt);
				//alert('totalAmt : ' + totalAmt);
			}
		}
		//alert('totalAmt : ' + totalAmt);
		maintenanceRate = parseFloat(totalAmt) * (parseFloat(maintenancePercent) * 1/100);
		var beforeRoundingMaintenanceRate = maintenanceRate/12; //CH#ITEM_QTY
		maintenanceRate = roundNumber(maintenanceRate/12,2);//CH#ITEM_QTY - calculating rate per month

		//alert('MaintenanceRate : ' + maintenanceRate);
		//nlapiSetLineItemValue('item', 'rate', currentLineCount, maintenanceRate);
		nlapiSetCurrentLineItemValue('item', 'rate', maintenanceRate);
		//alert('maintenanceRate : ' + maintenanceRate);
		var tempDiscount = 	parseFloat(beforeRoundingMaintenanceRate) * parseInt(quantity);//CH#ITEM_QTY
		//alert('tempDiscount : ' + tempDiscount);
		maintenanceAmount = tempDiscount -  (tempDiscount * (parseFloat(newDiscount) * 1/100));
		//alert('maintenanceAmount : ' + maintenanceAmount);
		//nlapiSetLineItemValue('item', 'amount', currentLineCount, maintenanceAmount);
		nlapiSetCurrentLineItemValue('item', 'amount', maintenanceAmount);
		//alert('After Setting The Value');	
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

	//CH#KANA10_VALIDATION - start
function saveRecWithoutQualifyingQuesValidation()
{
	/*
	// Removing KANA 10 Hardware validations 
	var kana10status = kana10Validation();
	if(kana10status != true) {
		return false;
	}
	*/
	//CH#WIN/LOSS REASON - Start
	var winloss_status = validateWinLossReason();
	if(winloss_status != true) {
		return false;
	}
	//CH#WIN/LOSS REASON - End
	
	return true;
}
	
function saveRecord()
{
	
	/*
	// Removing KANA 10 Hardware validations 
	var kana10status = kana10Validation();
	if(kana10status != true) {
		return false;
	}
	*/
	//CH#WIN/LOSS REASON - Start
	var winloss_status = validateWinLossReason();
	if(winloss_status != true) {
		return false;
	}	
	//CH#WIN/LOSS REASON - End

	//CH#SALES_STATUS - start
	var status = validateQualifyingQuestions();	
	return status;
	//CH#SALES_STATUS - end

}
//CH#KANA10_VALIDATION - end


// CH#UNIT_PRICE_RESTRICTION - start
function getItemRate(type,name) {

	if(type == 'item') {		
		var rate;
		var tempRate;
		var productFamily;
		var itemType;
		var currentLineCount;
		var tempItemType;
		var termItem;
		var bValidateItem;
		var bGenericItem;
		var bRoyaltyItem;
				
		var is900found = false;
		var isnot900found = false;
				
		bGenericItem = false;
		bValidateItem = true;
		
		productFamily = nlapiGetCurrentLineItemValue('item', 'custcol_item_type');
		itemType = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');
		tempRate =  nlapiGetCurrentLineItemValue('item', 'custcol_temp_item_rate');
		var isOppItem;
		
		isOppItem = nlapiGetCurrentLineItemValue('item', 'custcol_opportunity_item');
		//if the new item entered is a generic item (900 items) then we allow custom pricing otherwise we don't
		if("T" == isOppItem){
			bGenericItem = true;
		}
		
		var priceLevel = nlapiGetCurrentLineItemValue('item', 'price');// Base price ~ 1

		// productFamily 14 is royalty
		if((priceLevel == 1) && (itemType != '') && (bGenericItem == false) && (itemType != 'Maintenance') && (productFamily != '14') && (itemType != 'Hosting')){
			rate = nlapiGetCurrentLineItemValue('item', 'rate');
			nlapiSetCurrentLineItemValue('item', 'custcol_temp_item_rate', rate);
		}
	}
}

function setItemRate(type,name) {

	if(type == 'item') {		
		var rate;
		var tempRate;
		var productFamily;
		var itemType;
		var currentLineCount;
		var tempItemType;
		var termItem;
		var bValidateItem;
		var bGenericItem;
		var bRoyaltyItem;
				
		var is900found = false;
		var isnot900found = false;
				
		bGenericItem = false;
		bValidateItem = true;
		
		productFamily = nlapiGetCurrentLineItemValue('item', 'custcol_item_type');
		itemType = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');
		
		var isOppItem;
		
		isOppItem = nlapiGetCurrentLineItemValue('item', 'custcol_opportunity_item');
		//if the new item entered is a generic item (900 items) then we allow custom pricing otherwise we don't
		if("T" == isOppItem){
			bGenericItem = true;
		}
		var priceLevel = nlapiGetCurrentLineItemValue('item', 'price');// Base price ~ 1
		
		// productFamily 14 is royalty
		if((priceLevel == 1) && (itemType != '') && (bGenericItem == false) && (itemType != 'Maintenance') && (productFamily != '14') && (itemType != 'Hosting')){
			tempRate =  nlapiGetCurrentLineItemValue('item', 'custcol_temp_item_rate');
			nlapiSetCurrentLineItemValue('item', 'rate', tempRate);
		}
	}
}

// CH#UNIT_PRICE_RESTRICTION - end

	//CH#ITEM_QTY - start
function postSourcing(type,name) 
{	
	/*
	//var index=nlapiGetCurrentLineItemIndex('item');
	if(type=='item' && name=='item')
	{
		getItemRate(type,name);//CH#UNIT_PRICE_RESTRICTION

		var itemType = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');
		var qtyType = nlapiGetCurrentLineItemText('item', 'custcol_qty_type');

		//alert('Qty value : '+qtyType);		
		if ( (itemType=='Maintenance' || itemType=='Maintenance - Fixed') && qtyType=='Month(s)')
		{
			nlapiSetCurrentLineItemValue('item', 'quantity', '12');
		}
	}
	*/
  
}
function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

	//CH#ITEM_QTY - end

	// start - CH#SALES_STATUS
function onFieldChange(type,name)
{
	/*
	if(name == 'custbody_rpf_recieved' && nlapiGetFieldValue('custbody_rpf_recieved') == 'T')
	{
		var d = new Date();
		var curr_date = d.getDate();
		var curr_month = d.getMonth()+1;
		var curr_year = d.getFullYear();
		var formattedDate = curr_month + "/" +curr_date + "/" + curr_year;
		nlapiSetFieldText('custbody_stage_rpf_receiving',nlapiGetFieldText('entitystatus'));
		nlapiSetFieldValue('custbody_rpf_received_date',formattedDate);
	}
	if (name == 'custbody_rpf_recieved' && nlapiGetFieldValue('custbody_rpf_recieved') == 'F')
	{
		nlapiSetFieldValue('custbody_stage_rpf_receiving','');
		nlapiSetFieldValue('custbody_rpf_received_date','');
	}
	*/
	// CH#MORE_SALESSTATUS_CHANGES - start
	salesFieldChange(type,name);
	// CH#MORE_SALESSTATUS_CHANGES - end
	
	return true;
}
// end - CH#SALES_STATUS

//CH#DISC_ROUND - start
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