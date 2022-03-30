/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Description		: General Libray Functions
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
function doNothing()
{
}

/**
CHANGE HISTORY
==================================================================================
Change ID		:CH#WIN/LOSS REASON
Programmer		:Sagar Shah
Description		: Validate Win/Loss Reason
Date			: 10/16/2009
==================================================================================
Change ID		:CH#CHECK_LEAP_YEAR
Programmer		:Sagar Shah
Description		: Consider Leap Year while calculating the Maintenance Amount
Date			: 11/24/2010
==================================================================================
Change		: CH#NEW_STAGE_2011
Author		: Sagar Shah
Date		: 01/04/2011
Description	: On saving of Sales Order, copy the line item information from Sales Order into Oppty. Also update Oppty Forecast Amount fields
This is part of  new Sales Stages changes suggested by Chip.
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
Change ID		:CH#LEAD_DISQUALIFICATION_REASON
Programmer	:Sagar Shah
Description		: Validate Win/Loss Reason
Date					: 04/13/2011
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change		: CH#NEW_STAGE_2012
Author		: Sagar Shah
Date		: 02/15/2012
Description	: Implement new Sales Stages for 2012
==================================================================================
Change		: CH#CALC_TOTAL_LIC_VALUE
Author		: Sagar Shah
Date		: 02/15/2012
Description	: Populate the hidden field with total license value.
==================================================================================
Change		: CH#SALES_CHANGES_KICKOFF2012
Author		: Sagar Shah
Date		: 02/27/2012
Description	: Change win/loss reasons and disqualification reason logic.
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
Change ID		:CH#MORE_RULES
Programmer		:Sagar Shah
Description		: Make Explain field mandatory for stage '2 Interest'
Date			: 6/29/2012
==================================================================================
Change ID		:CH#NEW_STAGES_2012_OCTOBER
Programmer		:Sagar Shah
Description		: Implement new stages for Jim Bureau
Date			: 10/24/2012
==================================================================================
Change		: CH#NEW_STAGE_2012_NOV
Author		: Sagar Shah
Date		: 11/15/2012
Description	: Implement new Sales Stages suggested by Jim Bureau
==================================================================================
Change ID		:CH#TEST_LICENSE_ITEM
Programmer		:Sagar Shah
Description		: This logic is for special license items for which the amount is % of other License items of same product
					family
Date			: 3/12/2013
==================================================================================
Change ID		:CH#SALES_OWNED_ALERT
Programmer		:Sagar Shah
Description		: The field should be named Sales Owned
�         The field should be shown on the form of Opportunity records
�         The field should be a dropdown with the options: blank, yes, and no
�         The field should only be made available on "Stage 2 SAL" opportunities
�         The field should not be mandatory right now, but it should trigger a reminder message if the field is blank when the opportunity is saved. It can something like:
                "The field Sales Owned is blank. Do you want to continue saving?"
Date			: 9/11/2013
==================================================================================
Change		: CH#SOURCE_CAMPAIGN
Author		: Sagar Shah
Date		: 01/06/2014
Description	: Set default Source Campaign (eg.YYQ[1/2/3/4]SGL e.g.  14Q1SGL)
==================================================================================
Change ID		:CH#SET_USERNOTES
Programmer	:Ryan Price
Description		: Auto set the user notes from the Lead record->Pardot Comments field - added KANA Inside Sales Rep role (role id 1174) to list of roles which can fire this script
Date					: 03/24/2014
==================================================================================
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * ***/

//CH#GENERIC_MAINT_ITEM - start
var genItemList = new Array();
function getGenericMaintItemList()
{
		var columns = new Array();
		columns[0] =	new nlobjSearchColumn('internalid');
		columns[1] =	new nlobjSearchColumn('custitem_item_type');
		columns[2] =	new nlobjSearchColumn('custitem_item_type_4_scripting');
		
		//Search Name: Generic Maintenance Item List
		var searchresults = nlapiSearchRecord('item', 'customsearch_gen_maint_item_list', null, columns);
	
		for (var i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			genItemList[searchresults[i].getText('custitem_item_type')+'-'+searchresults[i].getText('custitem_item_type_4_scripting')] = searchresults[i].getValue('internalid');
		}
}
//CH#GENERIC_MAINT_ITEM - end

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Description		: Function can be used in the validateline to stop custom pricing from being used
			  in a transaction.

			  Function will automatically set the original rate of the item and set the custom pricing to base price
Parameters		:
			  type - field passed to validate line
			  name - field passed to validate line
			  chkmaint - if set to true custom pricing is not allowed for maintenance line items
			  chkallowcustompricing - if set to true the flag in the item record is checked to see if custom pricing is allowed
Returns			: true if validation is ok or false if not
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function disableCustomPricingValidateLine(type, name, chkmaint, chkallowcustompricing)
{
	var priceLevel = nlapiGetCurrentLineItemValue('item', 'price');
	var rate = nlapiGetCurrentLineItemValue('item', 'rate');
	var item_category = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');
	var itemInternalId = nlapiGetCurrentLineItemValue('item', 'item');
	var allowcustompricing;
	var bret = true;

	if(chkmaint == true){
		if(priceLevel == '-1' && (item_category == 'Maintenance' || item_category == null)){
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
	}

	if(chkallowcustompricing == true){
		var itemrec;

		try
		{
			itemrec = nlapiLoadRecord('noninventoryitem',itemInternalId);
		} catch(exception){
			try{ itemrec = nlapiLoadRecord('serviceitem',itemInternalId); 	}
			catch (ex){
				itemrec = nlapiLoadRecord('kititem',itemInternalId); 	
			}}			
		finally{
			allowcustompricing = itemrec.getFieldValue('custitem_item_allow_custom_pricing');
		}

		if((priceLevel == '-1') && (allowcustompricing != 'T')){
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
	}

	if((priceLevel == '-1') && (chkallowcustompricing == false) && (chkmaint == false)){
		alert("Custom price level is not allowed, please use any other price level");
		nlapiDisableLineItemField('item', 'rate', true);
		nlapiSetCurrentLineItemValue('item', 'price', '1',false);
		return false;
	}

	return bret;
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Description		: Function can be used in the validateline to stop custom pricing from being used
			  in a transaction. Same as the function above but hard codes the parameters to apply restrictions to maintenance and the config flag in items

			  Function will automatically set the original rate of the item and set the custom pricing to base price
Parameters		:
			  type - field passed to validate line
			  name - field passed to validate line
			  chkmaint - if set to true custom pricing is not allowed for maintenance line items
			  chkallowcustompricing - if set to true the flag in the item record is checked to see if custom pricing is allowed
Returns			: true if validation is ok or false if not
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
function disableCustomPricingValidateLineAll(type, name)
{

	var priceLevel = nlapiGetCurrentLineItemValue('item', 'price');
	var rate = nlapiGetCurrentLineItemValue('item', 'rate');
	var item_category = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');
	var itemInternalId = nlapiGetCurrentLineItemValue('item', 'item');
	var allowcustompricing;
	var bret = true;

	var chkmaint = true;
	var chkallowcustompricing = true;

	if(chkmaint == true){
		if(priceLevel == '-1' && (item_category == 'Maintenance' || item_category == null)){
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
	}

	if(chkallowcustompricing == true){
		var itemrec;

		try
		{
			itemrec = nlapiLoadRecord('noninventoryitem',itemInternalId);
		} catch(exception){
			itemrec = nlapiLoadRecord('serviceitem',itemInternalId);
		} finally{
			allowcustompricing = itemrec.getFieldValue('custitem_item_allow_custom_pricing');
		}

		if((priceLevel == '-1') && (allowcustompricing != 'T')){
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
	}

	if((priceLevel == '-1') && (chkallowcustompricing == false) && (chkmaint == false)){
		alert("Custom price level is not allowed, please use any other price level");
		nlapiDisableLineItemField('item', 'rate', true);
		nlapiSetCurrentLineItemValue('item', 'price', '1',false);
		return false;
	}

	return bret;
}
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Description		: Function can be used in the validateline to stop custom pricing from being used
			  in a transaction. Same as the function above but hard codes the parameters to apply restrictions to the config flag in items.
			  Allows Maintenance price override

			  Function will automatically set the original rate of the item and set the custom pricing to base price
Parameters		:
			  type - field passed to validate line
			  name - field passed to validate line
			  chkmaint - if set to true custom pricing is not allowed for maintenance line items
			  chkallowcustompricing - if set to true the flag in the item record is checked to see if custom pricing is allowed
Returns			: true if validation is ok or false if not
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
function disableCustomPricingValidateLineAllowMaint(type, name)
{

	var priceLevel = nlapiGetCurrentLineItemValue('item', 'price');
	var rate = nlapiGetCurrentLineItemValue('item', 'rate');
	var item_category = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');
	var itemInternalId = nlapiGetCurrentLineItemValue('item', 'item');
	var allowcustompricing;
	var bret = true;

	var chkmaint = false;
	var chkallowcustompricing = true;

	if(chkmaint == true){
		if(priceLevel == '-1' && (item_category == 'Maintenance' || item_category == null)){
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
	}

	if(chkallowcustompricing == true){
		var itemrec;

		try
		{
			itemrec = nlapiLoadRecord('noninventoryitem',itemInternalId);
		} catch(exception){
			itemrec = nlapiLoadRecord('serviceitem',itemInternalId);
		} finally{
			allowcustompricing = itemrec.getFieldValue('custitem_item_allow_custom_pricing');
		}

		if((priceLevel == '-1') && (allowcustompricing != 'T')){
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
	}

	if((priceLevel == '-1') && (chkallowcustompricing == false) && (chkmaint == false)){
		alert("Custom price level is not allowed, please use any other price level");
		nlapiDisableLineItemField('item', 'rate', true);
		nlapiSetCurrentLineItemValue('item', 'price', '1',false);
		return false;
	}

	return bret;
}

function disableCustomPricingValidateFieldAll(type, name) 
{
	if((name  ==  'price') && (type == 'item')) {
		var priceLevel = nlapiGetCurrentLineItemValue('item', 'price'); 
		var rate = nlapiGetCurrentLineItemValue('item', 'rate');
		var item_category = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');

		if(priceLevel == '-1' && (item_category == 'Maintenance' || item_category == null)){
			
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
		
		if((priceLevel == '-1') && ((rate != null) && (rate != 0))){
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
	}
	return true;
}

function disableCustPricingValFldAllowMaint(type, name) 
{
	if((name  ==  'price') && (type == 'item')) {
		var priceLevel = nlapiGetCurrentLineItemValue('item', 'price'); 
		var rate = nlapiGetCurrentLineItemValue('item', 'rate');
		var item_category = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');

		if((priceLevel == '-1') && (item_category == null))
		{
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
		
		if((priceLevel == '-1') && ((rate != null) && (rate != 0))){
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
	}
	return true;
}

function disableCustomTransactionField(type, name) 
{
	if((name  ==  'price') && (type == 'item')) {
		// Get Custom price Level
		var priceLevel = nlapiGetCurrentLineItemValue('item', 'price'); 
		var rate = nlapiGetCurrentLineItemValue('item', 'rate');
		var item_category = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');

		if(priceLevel == '-1' && (item_category == 'Maintenance' || item_category == null)){
			
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
		//alert('priceLevel : ' + priceLevel);
		// Value of Custom Price Level is -1
		
		if((priceLevel == '-1') && ((rate != null) && (rate != 0))){
		//if(priceLevel == '-1'){
			alert("Custom price level is not allowed, please use any other price level");
			nlapiDisableLineItemField('item', 'rate', true);
			nlapiSetCurrentLineItemValue('item', 'price', '1',false);
			return false;
		}
	}
	return true;
}

//CH#SALES_CHANGES_KICKOFF2012 - start

// CH#WIN/LOSS REASON - start

function validateWinLossReason() {
	var opp_status = nlapiGetFieldText('entitystatus');
	var opp_statusid = nlapiGetFieldValue('entitystatus');//CH#NEW_STAGES_2012_OCTOBER

	if(opp_statusid=='17') { //CH#NEW_STAGES_2012_OCTOBER
		//check if Win/Loss reason is entered
		var winlossreason = nlapiGetFieldText('winlossreason');
		if(winlossreason == null || winlossreason == '') {
			alert("For Opportunity status '0 - Unqualified, Closed Lost, etc.' you have to select a value in Rep's Win/Loss Reason.");
			return false;
		}		
	}
	else {
		nlapiSetFieldValue('winlossreason','');
	}
	return true;
}


function validateWinLossReasonAndBeyond() {
	var opp_status = nlapiGetFieldText('entitystatus');
	var opp_statusid = nlapiGetFieldValue('entitystatus');//CH#NEW_STAGES_2012_OCTOBER

	if(opp_statusid=='17') { //CH#NEW_STAGES_2012_OCTOBER
		//check if Win/Loss reason is entered
		var winlossreason = nlapiGetFieldText('winlossreason');            
		if(winlossreason == null || winlossreason == '') {
			alert("For Opportunity status '0 - Unqualified, Closed Lost, etc.' you have to select a value in Rep's Win/Loss Reason.");
			return false;
		}

		//if option 'Competition' is selected make the field 'Competitor name' mandatory
		if(winlossreason == 'Loss: Competition') {
			var vendorName = nlapiGetFieldValue('custbody_vendor_name');
			if(vendorName == null || vendorName == '') {
				alert("For Rep's Win/Loss Reason 'Loss: Competition' you have to enter valid Competitor Name");
				nlapiDisableField('custbody_vendor_name', false);
				return false;
			}
		} else {
			nlapiSetFieldValue('custbody_vendor_name','');
		}		

		//if any winloss value selected make the field 'Explain' mandatory
		if(winlossreason != null && winlossreason != '') {
			var explain = nlapiGetFieldValue('custbody_explain');
			if(explain == null || explain == '') {
				alert("For any value selected for Rep's Win/Loss Reason you have to enter a valid value in Explain field.");
				nlapiDisableField('custbody_explain', false);
				return false;
			}
		} else {
			nlapiSetFieldValue('custbody_explain','');
		}
		
	}
	else {
		nlapiSetFieldValue('winlossreason','');
	}
	return true;
}
// CH#WIN/LOSS REASON - end

//CH#NEW_STAGES_2012_OCTOBER - start
function isUnqualifiedReasonCode() {
	var reasonCode = nlapiGetFieldText('winlossreason');	
	if(reasonCode!=null && reasonCode.search("MQL Return:")!=-1)
		return true;
	else
		return false;	
}

function validateDisqualificationReason() {
	return true;
}
//CH#NEW_STAGES_2012_OCTOBER - end

function validateAdditionalFields() {
	var opp_status = nlapiGetFieldText('entitystatus');
	var opp_statusid = nlapiGetFieldValue('entitystatus');
	var flagFound = true;

	//CH#NEW_STAGES_2012_OCTOBER - start
	//check if we need to reassign the oppty to marketing
	if(opp_statusid == '17' && isUnqualifiedReasonCode()) {//CH#NEW_STAGES_2012_OCTOBER
		nlapiSetFieldValue('custbody_assign_opp_to_marketing','T');
	} else {
		nlapiSetFieldValue('custbody_assign_opp_to_marketing','F');
	}
	//CH#NEW_STAGES_2012_OCTOBER - end

	//CH#SALES_OWNED_ALERT - start
	if(opp_statusid==23) {//23 refers to the Stage '02 - Interest, Sales Accepted Lead'
		var salesOwned = nlapiGetFieldValue('custbody_is_sales_owned');
		if(salesOwned == '') {
			var feedback = confirm("The field Sales Owned is blank. Do you want to continue saving?");
			if(!feedback)
				return false;
		}	
	}
	//CH#SALES_OWNED_ALERT - end	
	
	if(opp_status=='2 Interest') {
		flagFound = false;
		//check if primary sales team member is entered
		var teamCount = nlapiGetLineItemCount('salesteam');
		for(var i =1;i <= teamCount; i++) {
			var isPrimary = nlapiGetLineItemValue('salesteam', 'isprimary', i);
			if(isPrimary=='T') {
				flagFound = true;
				break;
			}
		}//end for loop

		if(flagFound == false) {
			alert("For Opportunity status '2 Interest' you have to select a Primary Sales Team member in the Sales Team tab.");
			return flagFound;
		}
		//CH#MORE_RULES - start
		var explain = nlapiGetFieldValue('custbody_explain');
		if(explain == null || explain == '') {
			alert("For Opportunity status '2 Interest' you have to enter a valid value in Explain field.");
			nlapiDisableField('custbody_explain', false);
			return false;
		}
		//CH#MORE_RULES - end
		
	}//end if(opp_status=='2 Interest') 

	if(opp_status=='3 Qualified Opportunity') {
	    var errMsg=''; 
	
		flagFound = false;
		//check if primary sales team member is entered
		var teamCount = nlapiGetLineItemCount('salesteam');
		for(var i =1;i <= teamCount; i++) {
			var isPrimary = nlapiGetLineItemValue('salesteam', 'isprimary', i);
			if(isPrimary=='T') {
				flagFound = true;
				break;
			}
		}//end for loop
		if(flagFound == false) {
			errMsg += 'Select a Primary Sales Team member in the Sales Team tab\n';
		}

		//check influencer value
		/*
		var influencer = nlapiGetFieldValue('partner');
		if(influencer == null || influencer == '') {
			errMsg += 'Enter a valid value in the Influencer field.';
		}
		*/

		if(errMsg != '') {
			errMsg = "For Opportunity status '3 Qualified Opportunity' you have to \n"+errMsg;
			alert(errMsg);
			flagFound = false;
		}

	}//end if(opp_status=='3 Qualified Opportunity')


	return flagFound;
}


//CH#SALES_CHANGES_KICKOFF2012 - end

//CH#LEAD_DISQUALIFICATION_REASON - start
function validateLeadDisqualificationReason() {
	var lead_status = nlapiGetFieldText('entitystatus');
	if(lead_status=='PROSPECT-0 Lead - Unqualified') {
		
		//check if Disqualification reason is entered
		var disqua_reason = nlapiGetFieldText('custentity_reason_for_disqualification');
		if(disqua_reason == null || disqua_reason == '') {
			alert("For Lead with status 'PROSPECT-0 Lead - Unqualified' you have to enter valid Reason for Disqualification");
			return false;
		}
		
		//if option 'Too late - vendor selected' is selected make the field 'Vendor name' mandatory
		if(disqua_reason == 'Too late - vendor selected') {
			var vendorName = nlapiGetFieldValue('custentity_vendor_name');
			if(vendorName == null || vendorName == '') {
				alert("For Disqualification reason 'Too late - vendor selected' you have to enter valid Vendor Name");
				return false;
			}
		} else {
			nlapiSetFieldValue('custentity_vendor_name','');
		}		

		//if option 'Other' is selected make the field 'Explain' mandatory
		if(disqua_reason == 'Other') {
			var explain = nlapiGetFieldValue('custentity_explain');
			if(explain == null || explain == '') {
				alert("For Disqualification reason 'Other' you have to enter a valid value in Explain field.");
				return false;
			}
		} else {
			nlapiSetFieldValue('custentity_explain','');
		}

	}
	return true;
}
//CH#LEAD_DISQUALIFICATION_REASON - end


//CH#CHECK_LEAP_YEAR - Start
//The function checks if the date ranges falls in a leap year
function isLeapYear_kana(startdt,enddt) {
	var start = nlapiStringToDate(startdt);
	var end = nlapiStringToDate(enddt);

	var startYear = start.getFullYear();
	var endYear = end.getFullYear();

	for(var year=startYear; year<=endYear; year++) 
	{

		if((year % 400 == 0) || (year % 100 != 0 && year % 4 == 0)) //leap year
		{
			var feb29Date = new Date();
			feb29Date.setDate(29);
			feb29Date.setMonth(1);
			feb29Date.setFullYear(year);

			var startDiff = feb29Date.getTime() - start.getTime();
			var endDiff = end.getTime() - feb29Date.getTime();

			if(startDiff >= 0 && endDiff >= 0)
			{
				return true;
			}
		}
		
	}
	return false;
}
//CH#CHECK_LEAP_YEAR - End

//CH#NEW_STAGE_2011 - start

//CH#NEW_STAGE_2012_NOV
//We should not copy the items into Oppty anymore
/*
//CH#SALES_FORECAST_CHANGES - start 
//var opp_sem_maint_value = 0;
var opp_sem_lic_value = 0;
//var opp_iq_maint_value = 0;
var opp_iq_lic_value = 0;
//var opp_response_maint_value = 0;
var opp_response_lic_value = 0;
var opp_proserve_amount = 0;
var opp_managed_services_amount = 0;
var opp_total_maint_amount = 0;

//var opp_sem_maint_flag = false;
var opp_sem_lic_flag = false;
//var opp_iq_maint_flag = false;
var opp_iq_lic_flag = false;
//var opp_response_maint_flag = false;
var opp_response_lic_flag = false;
var opp_proserve_amount_flag = false;
var opp_managed_services_flag = false;
var opp_total_maint_flag = false;
//CH#CALC_TOTAL_LIC_VALUE
var opp_total_lic_value = 0;
var opp_total_lic_flag = false;

//LAGAN Items
var opp_lagan_lic_value = 0;
var opp_lagan_3rdparty_lic_value = 0;
var opp_subscription_lic_value = 0;
var opp_lagan_lic_flag = false;
var opp_lagan_3rdparty_flag = false;
var opp_subscription_lic_flag = false;

function calculateForecastFieldValues(productFamily, itemCategory, tmpAmount)
{
	if(itemCategory == 'License' && (productFamily == 'G2PP' || productFamily == 'CTI' || productFamily == 'Integration' || productFamily == 'Business Intelligence' || productFamily == 'Business Process Management' || productFamily == 'Knowledge' || productFamily == 'Rules Engine' || productFamily == 'Single View of Customer' || productFamily == 'Systems Management' || productFamily == 'Self Service - Perpetual'))
	{
		opp_lagan_lic_value += parseFloat(tmpAmount);
		opp_lagan_lic_flag = true;
	}
	else if(itemCategory == 'License' && (productFamily == 'Mobile' || productFamily == 'SaaS'))
	{
		opp_subscription_lic_value += parseFloat(tmpAmount);
		opp_subscription_lic_flag = true;
	}	
	else if(productFamily == 'Response' && itemCategory == 'License')
	{
		opp_response_lic_value += parseFloat(tmpAmount);
		opp_response_lic_flag = true;
	}
	else if(productFamily.substr(0,2) == 'IQ' && itemCategory == 'License')
	{
		opp_iq_lic_value += parseFloat(tmpAmount);
		opp_iq_lic_flag = true;
	}
	else if(productFamily == 'SEM' && itemCategory == 'License')
	{
		opp_sem_lic_value += parseFloat(tmpAmount);
		opp_sem_lic_flag = true;
	}
	else if(itemCategory == 'Maintenance')
	{
		opp_total_maint_amount += parseFloat(tmpAmount);
		opp_total_maint_flag = true;
	}
	else if(itemCategory == 'Professional Services')
	{
		opp_proserve_amount += parseFloat(tmpAmount);
		opp_proserve_amount_flag = true;
	}	
	else if(itemCategory == 'OnDemand' || itemCategory == 'Managed Services' || itemCategory == 'Managed Services - DR')
	{
		opp_managed_services_amount += parseFloat(tmpAmount);
		opp_managed_services_flag = true;
	}	

	//CH#CALC_TOTAL_LIC_VALUE - not required anymore
	
	if(itemCategory == 'License')
	{
		opp_total_lic_value += parseFloat(tmpAmount);
		opp_total_lic_flag = true;
	}	
	

	
}
*/
function copyItemsToOpportunity()
{
	var errMsg='';
	//CH#NEW_STAGE_2012_NOV
	//We should not copy the items into Oppty anymore 
	return errMsg; 
	/*	
	getGenericMaintItemList(); //CH#GENERIC_MAINT_ITEM
	try
	{
		
		//find the corresponding Opportunity transaction
		var opptyID = nlapiGetFieldValue('opportunity');
		
		if(opptyID=='' || opptyID ==null) {
			return '';
		}

		var opptyRecord = nlapiLoadRecord('opportunity',opptyID);
		
		if(opptyRecord=='' || opptyRecord ==null) {
			return '';
		}

		//Do not copy for sales order other than Class of Sale = License & Maintenance
		var classOfSale =  nlapiGetFieldText('custbody_class_of_sale');
		if(classOfSale.indexOf('License') == -1) {
			return '';
		}


		var lineCount = opptyRecord.getLineItemCount('item');
		
		
		//remove the existing Line Items
		for(var j=1; j<=lineCount; j++)
		{
			opptyRecord.removeLineItem('item', '1');
		}

		//removing remaining line items, if any
		lineCount = opptyRecord.getLineItemCount('item');

		//Add/Copy the Line Items from Sales Order into Opportunity transaction
		var salesLineItemCount = nlapiGetLineItemCount('item');

		var index=1;
		
		for(var i=1; i<=salesLineItemCount; i++)
		{
			var item = nlapiGetLineItemValue('item','item',i);
			var qty = nlapiGetLineItemValue('item','quantity',i);
			var unitPrice = nlapiGetLineItemValue('item','rate',i);
			var amount = nlapiGetLineItemValue('item','amount',i);
			var productFamily = nlapiGetLineItemText('item','custcol_item_type',i);
			var itemCategory = nlapiGetLineItemValue('item','custcol_item_type_4_scripting',i);
			var termitem = nlapiGetLineItemValue('item','custcol_term_item',i);	
			var maintType = nlapiGetLineItemValue('item','custcol_maintenance_type',i);	//CH#GENERIC_MAINT_ITEM
			
			calculateForecastFieldValues(productFamily, itemCategory, amount);
			
			if(itemCategory == 'OnDemand' || itemCategory == 'Managed Services' || itemCategory == 'Managed Services - DR')
			{
				continue;
			}

			opptyRecord.insertLineItem('item', index);

			//replace inactive maintenance items with generic ones
			//CH#GENERIC_MAINT_ITEM  - start

			var genericItem = genItemList[productFamily+'-'+itemCategory];			
			//if no generic item is defined skip it or If already a generic item skip it
			if(genericItem!=null && genericItem!='' && genericItem != item)
			{
				item = genericItem;
			}				

			//CH#GENERIC_MAINT_ITEM  - end

			opptyRecord.setLineItemValue('item', 'item', index, item);
			opptyRecord.setLineItemValue('item', 'quantity', index, qty);
			opptyRecord.setLineItemValue('item', 'rate', index, unitPrice);
			opptyRecord.setLineItemValue('item', 'amount', index, amount);
			opptyRecord.setLineItemValue('item', 'custcol_term_item', index, termitem);	
			if(maintType!=null && maintType!='')
				opptyRecord.setLineItemValue('item', 'custcol_gen_maint_type', index, maintType); //CH#GENERIC_MAINT_ITEM
			index++;
			
		}

		//Update Projected Total to the Sales Order subtotal
		var subtotal = nlapiGetFieldValue('subtotal');		
		opptyRecord.setFieldValue('projectedtotal',subtotal);
		opptyRecord.setFieldValue('rangelow',subtotal);
		opptyRecord.setFieldValue('rangehigh',subtotal);

		//Update Forecast Field Values

		//CH#CALC_TOTAL_LIC_VALUE - start		
		if (opp_total_lic_flag == true) {
			opptyRecord.setFieldValue('custbody_total_lic_value',opp_total_lic_value);
		}
		else
			opptyRecord.setFieldValue('custbody_total_lic_value','');
			
		//CH#CALC_TOTAL_LIC_VALUE - end

		//Lagan Items
		if (opp_lagan_lic_flag == true) 
			opptyRecord.setFieldValue('custbody_opp_lagan_license_value',opp_lagan_lic_value);
		else
			opptyRecord.setFieldValue('custbody_opp_lagan_license_value','');

		if (opp_subscription_lic_flag == true) 
			opptyRecord.setFieldValue('custbody_overtone_subscription_lic_val',opp_subscription_lic_value);
		else
			opptyRecord.setFieldValue('custbody_overtone_subscription_lic_val','');


		if (opp_sem_lic_flag == true) 
			opptyRecord.setFieldValue('custbody_opp_sem_lic_value',opp_sem_lic_value);
		else
			opptyRecord.setFieldValue('custbody_opp_sem_lic_value','');


		if (opp_iq_lic_flag == true) 
			opptyRecord.setFieldValue('custbody_opp_iq_lic_value',opp_iq_lic_value);
		else
			opptyRecord.setFieldValue('custbody_opp_iq_lic_value','');


		if (opp_response_lic_flag == true) 
			opptyRecord.setFieldValue('custbody_opp_response_lic_value',opp_response_lic_value);
		else
			opptyRecord.setFieldValue('custbody_opp_response_lic_value','');

		if (opp_total_maint_flag == true)
			opptyRecord.setFieldValue('custbody_opp_total_maint_value',opp_total_maint_amount);
		else
			opptyRecord.setFieldValue('custbody_opp_total_maint_value','');

		if (opp_proserve_amount_flag == true)
			opptyRecord.setFieldValue('custbody_opp_proserve_amount',opp_proserve_amount);
		else
			opptyRecord.setFieldValue('custbody_opp_proserve_amount','');

		if (opp_managed_services_flag == true)
			opptyRecord.setFieldValue('custbody_opp_managed_service_amount',opp_managed_services_amount);
		else
			opptyRecord.setFieldValue('custbody_opp_managed_service_amount','');

		//Save opportunity record
		nlapiSubmitRecord(opptyRecord);

	}
	catch(e)
	{
		if ( e instanceof nlobjError )
			errMsg = e.getCode() + ' : ' + e.getDetails();
		else
			errMsg = e.toString();

	} //catch

	return errMsg;
	*/
}
//CH#SALES_FORECAST_CHANGES - end
//CH#NEW_STAGE_2011 - end

//CH#SET_EXPCLOSE_DATE - start
function calcExpectedCloseDate() {
	
        if(nlapiGetFieldValue('tranid')=='To Be Generated')
        {
	    var expectedCloseDate = nlapiAddDays(new Date(), 180);
	    expectedCloseDate = nlapiDateToString(expectedCloseDate);
	    nlapiSetFieldValue('expectedclosedate', expectedCloseDate);
       }

}
//CH#SET_EXPCLOSE_DATE - end

//CH#SET_USERNOTES - start
function setMktgUserNotes() {
		var userRoleId = nlapiGetRole();

		//only updated by Marketing Administrators or Pardot or Admin
        if(nlapiGetFieldValue('tranid')=='To Be Generated' && (userRoleId=='1102' || userRoleId=='1138'  || userRoleId=='1163'  || userRoleId=='1174'  || userRoleId=='3'))
        {
			var entityId = nlapiGetFieldValue('entity');
			if(entityId!=null && entityId!='') {
				var pardotNotes = nlapiLookupField('customer',entityId,'custentitypi_comments');
				nlapiSetFieldValue('memo', pardotNotes);
			}
       }
}
//CH#SET_USERNOTES - end

//CH#TEST_LICENSE_ITEM - start
/*
 * The function 'isLicensePercentItem' would check if the item is flagged as License Percent Item
 * This is applicable to License Items whose price is some % amount of other License Items of the same product family. 
 */
function isLicensePercentItem() {
	var testLicense = nlapiGetCurrentLineItemValue('item', 'custcol_is_test_license');  
	var licensePercent =  nlapiGetCurrentLineItemValue('item', 'custcol_test_lic_percent');	
	if(testLicense == 'T' && !kana_IsNull(licensePercent)) {					
		return true;
	}
	return false;
}//end function
//CH#TEST_LICENSE_ITEM - end


//CH#GENERIC_MAINT_ITEM - start

function checkMaintType() {
		var maintType = nlapiGetCurrentLineItemValue('item', 'custcol_gen_maint_type');
		if(maintType == null || maintType == '')
		{
			var itemRecord = nlapiLoadRecord('noninventoryitem', nlapiGetCurrentLineItemValue('item', 'item'));
			var selectionOptions = itemRecord.getFieldValues('custitem_maint_type_list');
			if(selectionOptions != null && selectionOptions.length>0) {
				alert('Please select Maint. Type Value');			
				return false;
			}
		}
		return true;
}//end function

//CH#GENERIC_MAINT_ITEM - end

//CH#NEW_STAGE_2012_NOV - start
//CH#SALES_FORECAST_CHANGES
function calculateProjectedTotal()
{
		var totalProjectedValue = 0;
		var totalMaintValue = 0;
		var totalSubscriptionValue = 0;
		//var totalProservValue = 0;
		var totalManagedServicesValue = 0;

		var maintFlag = false;
		var subFlag = false;
		//var proFlag = false;
		var mngFlag = false;
				
		var salesLineItemCount = nlapiGetLineItemCount('item');
		var projectedTotal = nlapiGetFieldValue('projectedtotal');
		var rangehigh = nlapiGetFieldValue('rangehigh');
		var rangelow = nlapiGetFieldValue('rangelow');
		
		for(var i=1; i<=salesLineItemCount; i++)
		{
			var item = nlapiGetLineItemValue('item','item',i);
			var amount = nlapiGetLineItemValue('item','amount',i);
			var productFamily = nlapiGetLineItemText('item','custcol_item_type',i);
			var itemCategory = nlapiGetLineItemValue('item','custcol_item_type_4_scripting',i);


		/* Jim doesn't want to include Managed services, proserve or maint. in line items
			if(itemCategory=='Subscription' ) {				
				subFlag = true;
				totalSubscriptionValue += parseFloat(amount);
			}
			else if(itemCategory=='Maintenance') {
				maintFlag = true;
				totalMaintValue += parseFloat(amount);
			}
			else if(itemCategory=='Managed Services') {
				mngFlag = true;
				totalManagedServicesValue += parseFloat(amount);
			}
			//proserve items are no longer included in the item lookup 
			else if(itemCategory=='Professional Services') {
				proFlag = true;
				totalProservValue += parseFloat(amount);
			}*/
			totalProjectedValue += parseFloat(amount);

		}//end for loop

		//no need to update this value since we allow only desired items in the item lookup

		//in fact Jim came back to update this such that a.	By default for new Oppty populate 
		//the pipeline with line item total but put 0 in Forecast and Commit fields
		var tranid = nlapiGetFieldValue('tranid');
		if(tranid=='To Be Generated') {
			nlapiSetFieldValue('projectedtotal',0);
			nlapiSetFieldValue('rangehigh',parseFloat(totalProjectedValue));
			nlapiSetFieldValue('rangelow',0);
		}

	/*
	if(subFlag)
		nlapiSetFieldValue('custbody_overtone_subscription_lic_val',parseFloat(totalSubscriptionValue));
	else
		nlapiSetFieldValue('custbody_overtone_subscription_lic_val','');

	if(maintFlag)
		nlapiSetFieldValue('custbody_opp_total_maint_value',parseFloat(totalMaintValue));
	else 
		nlapiSetFieldValue('custbody_opp_total_maint_value','');

	if(proFlag)
		nlapiSetFieldValue('custbody_opp_proserve_amount',parseFloat(totalProservValue));
	else
		nlapiSetFieldValue('custbody_opp_proserve_amount','');
	
	if(mngFlag)
		nlapiSetFieldValue('custbody_opp_managed_service_amount',parseFloat(totalManagedServicesValue));
	else
		nlapiSetFieldValue('custbody_opp_managed_service_amount','');
*/
	
}
function setDefaultPriceLevel(type,name) {
	if(type=='item' && name=='item')
	{
		var isOppItem = nlapiGetCurrentLineItemValue('item', 'custcol_opportunity_item');
		var customPriceLevel = nlapiGetCurrentLineItemValue('item', 'price');//-1 is for 'Custom' price level
		//if the new item entered is a generic item (900 items) then we set the default pricing custom pricing otherwise we don't
		if('T' == isOppItem && customPriceLevel!=-1){
			nlapiSetCurrentLineItemText('item', 'price', 'Custom');
		}				
	}	
}
//CH#NEW_STAGE_2012_NOV - end

//CH#SOURCE_CAMPAIGN - start

function setValueOfSourceCampaign() {
	var sourceCamp = nlapiGetFieldValue("custbody_leadcode");
	
	if(!kana_IsNull(sourceCamp))
		return;
		
	if(isSalesRep()) {
		//set default value of Source Campaign eg.YYQ[1/2/3/4]SGL e.g.  14Q1SGL
		var currDate = new Date();
		var year = currDate.getFullYear();
		year = year%100;		
		var month = currDate.getMonth()+1;
		var quarter = "";
		if(month>0 && month<=3) quarter="Q1";
		if(month>3 && month<=6) quarter="Q2";
		if(month>6 && month<=9) quarter="Q3";
		if(month>9 && month<=12) quarter="Q4";
		
		var sourceCampaign = year+quarter+'SGL';
		nlapiSetFieldValue("custbody_leadcode",sourceCampaign);
	}
}

function isSalesRep() {
	var currRole = nlapiGetRole();
	//if user role is Field Sales Rep or Sales Engineering return true
	if(currRole==1192 || currRole==1034 || currRole==1037 || currRole==1122)
		return true;
	else
		return false;
}

//CH#SOURCE_CAMPAIGN - end