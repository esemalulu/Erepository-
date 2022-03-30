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
Change		: CH#NEW_STAGE_2011
Author		: Sagar Shah
Date		: 01/04/2011
Description	: Add new fields to capture forecasting Amount
==================================================================================
Change ID		:CH#DISQUALIFICATION_REASON
Programmer		:Sagar Shah
Description		: Validate Win/Loss Reason
Date			: 01/31/2011
==================================================================================
Change		: CH#SALES_FORECAST_CHANGES
Author		: Sagar Shah
Date		: 03/02/2011
Description	: Add new Forecast fields and consolidate the Maint. Forecast fields.
==================================================================================
Change		: CH#POPULATE_DEFAULT_VALUE
Author		: Sagar Shah
Date		: 02/14/2012
Description	: Populate default value for Title and Opportunity Type when creating a brand new opportunity. 
					Used by Marketing to make the oppty creation process faster.
==================================================================================
Change		: CH#CALC_TOTAL_LIC_VALUE
Author		: Sagar Shah
Date		: 02/15/2012
Description	: Populate the hidden field with total license value.
==================================================================================
Change		: CH#SALES_CHANGES_KICKOFF2012
Author		: Sagar Shah
Date		: 02/27/2012
Description	: Field validation logic change
==================================================================================
Change ID		:CH#SET_EXPCLOSE_DATE
Programmer	:Sagar Shah
Description		: Auto set the expected close date to 90 days from the opportunity date or current date
Date					: 03/06/2012
==================================================================================
Change ID		:CH#SET_USERNOTES
Programmer	:Sagar Shah
Description		: Auto set the user notes from the Lead record->Pardot Comments field
Date					: 04/20/2012
==================================================================================
Change ID		:CH#GENERIC_MAINT_ITEM
Programmer		:Sagar Shah
Description		: For generic maintenance item make the Maint. Type field mandatory
Date			: 5/9/2012
==================================================================================
Change		: CH#NEW_STAGE_2012_NOV
Author		: Sagar Shah
Date		: 11/15/2012
Description	: Implement new Sales Stages suggested by Jim Bureau
==================================================================================
Change		: CH#SOURCE_CAMPAIGN
Author		: Sagar Shah
Date		: 01/06/2014
Description	: Set default Source Campaign (eg.YYQ[1/2/3/4]SGL e.g.  14Q1SGL)
==================================================================================
Change ID		:CH#DISC_ROUND
Programmer		:Sagar Shah
Description		: Adding a new discount field that stores rounded value of discount percent for printing purpose only
Date			: 02/03/2014		
==================================================================================
**/

function validateLineItem(type, name) {
	
	roundDiscount(type,name); //CH#DISC_ROUND
	
	//CH#FIX_ERROR - start
	if(type != 'item'){
		return true;
	}
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
	} else if(termItem == 2 && itemType != 'Maintenance'){
	//else if(itemType != 'OnDemand') {
		var tempDiscount = 	parseFloat(rate) * parseInt(quantity);
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
/*
function saveRecWithoutQualifyingQuesValidation()
{
	//CH#WIN/LOSS REASON - Start
	var winloss_status = validateWinLossReasonAndBeyond();
	if(winloss_status != true) {
		return false;
	}
	//CH#WIN/LOSS REASON - End
	
	//CH#DISQUALIFICATION_REASON - Start
	var disqualification_status = validateDisqualificationReason();
	if(disqualification_status != true) {
		return false;
	}
	//CH#DISQUALIFICATION_REASON - End

	return true;
}
	*/
function saveRecord()
{
	
	//CH#WIN/LOSS REASON - Start
	var winloss_status = validateWinLossReasonAndBeyond();
	if(winloss_status != true) {
		return false;
	}	
	//CH#WIN/LOSS REASON - End

	//CH#NEW_STAGE_2011 - start

	calculateProjectedTotal();

	//CH#NEW_STAGE_2011 - end

	//CH#DISQUALIFICATION_REASON - Start
	var disqualification_status = validateDisqualificationReason();
	if(disqualification_status != true) {
		return false;
	}
	//CH#DISQUALIFICATION_REASON - End

	//CH#SALES_CHANGES_KICKOFF2012 - start
	//additional mandatory fields based on statuses
	var fieldValidation_status = validateAdditionalFields();
	if(fieldValidation_status != true) {
		return false;
	}
	
	//CH#SALES_CHANGES_KICKOFF2012 - end

	//set default value of Source Campaign if created by Sales Rep
	setValueOfSourceCampaign(); ////CH#SOURCE_CAMPAIGN
	
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

//CH#NEW_STAGE_2012_NOV - start
//set the default price level for 900 items to 'custom'
function postSourcing(type,name) 
{		
	setDefaultPriceLevel(type,name);	
}
//CH#NEW_STAGE_2012_NOV - start

function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}

	//CH#ITEM_QTY - end

	// start - CH#SALES_STATUS
function onFieldChange(type,name)
{
	//CH#DISQUALIFICATION_REASON - Start
	if(name == 'custbody_reason_for_disqualification') 
	{
		if(nlapiGetFieldText('custbody_reason_for_disqualification') == 'Too late - vendor selected') {
			nlapiDisableField('custbody_vendor_name', false);
		} else {
			nlapiDisableField('custbody_vendor_name', true);
		}

		if(nlapiGetFieldText('custbody_reason_for_disqualification') == 'Other') {
			nlapiDisableField('custbody_explain', false);
		} else {
			nlapiDisableField('custbody_explain', true);
		}

	}
	//CH#DISQUALIFICATION_REASON - End

	//CH#SET_USERNOTES - start
   if(name == 'entity') 
	{
         setMktgUserNotes();
     }
	//CH#SET_USERNOTES - end

	// CH#MORE_SALESSTATUS_CHANGES - start
	salesFieldChange(type,name);
	// CH#MORE_SALESSTATUS_CHANGES - end
	
	return true;
}
// end - CH#SALES_STATUS

//CH#NEW_STAGE_2011 - start

/*//CH#NEW_STAGE_2012_NOV
var fieldListAmount = new Array('custbody_opp_sem_lic_value','custbody_opp_total_maint_value','custbody_lagan_3rdparty_lic_value','custbody_overtone_subscription_lic_val','custbody_opp_lagan_license_value','custbody_opp_proserve_amount','custbody_opp_managed_service_amount');//CH#SALES_FORECAST_CHANGES
function calculateProjectedTotal()
{
	var projectedTotal = 0;

	for(var i=0; i<fieldListAmount.length; i++)
	{
		var tmp = nlapiGetFieldValue(fieldListAmount[i]);

		if(tmp != '') {
			projectedTotal += parseFloat(tmp);
		}

	}// end for loop

	nlapiSetFieldValue('projectedtotal',parseFloat(projectedTotal));
	nlapiSetFieldValue('rangehigh',parseFloat(projectedTotal));
	nlapiSetFieldValue('rangelow',parseFloat(projectedTotal));
	//CH#CALC_TOTAL_LIC_VALUE - start
	var licFieldListAmount = new Array('custbody_opp_sem_lic_value','custbody_lagan_3rdparty_lic_value','custbody_opp_lagan_license_value'); 
	var totalLicAmount = 0;

	for(var i=0; i<licFieldListAmount.length; i++)
	{
		var tmp = nlapiGetFieldValue(licFieldListAmount[i]);

		if(tmp != '') {
			totalLicAmount += parseFloat(tmp);
		}

	}// end for loop
	nlapiSetFieldValue('custbody_total_lic_value',parseFloat(totalLicAmount));

	//CH#CALC_TOTAL_LIC_VALUE - end		
}
*/
//CH#NEW_STAGE_2011 - end

//CH#DISQUALIFICATION_REASON - Start
function pageInit()
{
         //CH#SET_EXPCLOSE_DATE
         calcExpectedCloseDate();

	//disble the two dependent fields
	nlapiDisableField('custbody_vendor_name', true);
	nlapiDisableField('custbody_explain', true);
	 setMktgUserNotes(); //CH#SET_USERNOTES
	verifyStageDescription();

		//CH#POPULATE_DEFAULT_VALUE - start
	var tranid = nlapiGetFieldValue('tranid');
	var roleid = nlapiGetContext().getRole();
	if(tranid=='To Be Generated' && roleid=='1102') {
		//if it is a brand new opportunity and user role is KANA Marketing Administrator, populate few default values
		nlapiSetFieldValue('title','Marketing Oppty hand off to Sales');
		nlapiSetFieldText('custbody_opportunity_type','New');
	}
	//CH#POPULATE_DEFAULT_VALUE - end

	//set default value of Source Campaign if created by Sales Rep
	setValueOfSourceCampaign(); ////CH#SOURCE_CAMPAIGN
}
//CH#DISQUALIFICATION_REASON - end

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