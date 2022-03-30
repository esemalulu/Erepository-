/**
 * Function restrics the user from entering the custom price.
 * if users selects the custom price then it gives an alert, disables te arye field,
 * and defaults the price level to Base Price
 * @author Prachi Mendhekar
 * @version 1.0
 */
 /** 
 Change ID		:CH#FORECAST1
Programmer		:Sagar Shah
Description		: Modified the code to accomodate Level 1 and Level 2 override column
Date			: 01/07/2008		
===============================================================================================
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
Change ID		:CH#UNIT_PRICE_RESTRICTION
Programmer		:Sagar Shah
Description		: Disable Unit Price for Line Items
Date			: 11/03/2008	
=================================================================================
Change ID		:CH#ITEM_QTY
Programmer		:Sagar Shah
Description		: Changes for making the Item Qty Type to Month(s)
Date			: 11/13/2008		
=================================================================================
Change ID		:CH#DISC_ROUND
Programmer		:Sagar Shah
Description		: Adding a new discount field that stores rounded value of discount percent for printing purpose only
Date			: 11/24/2008		
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
Change ID		:CH#DEFAULT_DELIVERY_METHOD
Programmer		:Sagar Shah
Description		: Make Delivery method default to 'Electronic'
Date			: 08/04/2009
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
Change ID		:CH#CHECK_LEAP_YEAR
Programmer		:Sagar Shah
Description		: Consider Leap Year while calculating the Maintenance Amount
Date			: 11/24/2010
==================================================================================
Change ID		:CH#GENERIC_MAINT_ITEM
Programmer		:Sagar Shah
Description		: For generic maintenance item make the Maint. Type field mandatory
Date			: 5/9/2012
==================================================================================
Change ID		:CH#TEST_LICENSE_ITEM
Programmer		:Sagar Shah
Description		: This logic is for special license items for which the amount is % of other License items of same product
					family
Date			: 3/12/2013
==================================================================================
**/

// CH#DEFAULT_DELIVERY_METHOD - start
function pageInit() {
	var shipmethod = nlapiGetFieldText('shipmethod');
	if(shipmethod == null || shipmethod == '') 
	{
		nlapiSetFieldText('shipmethod','Electronic Delivery');
	}
	verifyStageDescription(); //CH#MORE_SALESSTATUS_CHANGES
}
// CH#DEFAULT_DELIVERY_METHOD - end

function disableCustomTransactionField(type, name) {
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

/**
 * Fuction Calculates Amount for Hosted and Non Hosted Items
 * @author Prachi Mendhekar
 * @version 1.0
 */
function validateLineItem(type, name) {

	roundDiscount(type,name); //CH#DISC_ROUND

	// CH#UNIT_PRICE_RESTRICTION - start
	setItemRate(type,name); 
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
	var termQty = -1;//CH#ITEM_QTY	
	
	if(type == 'item'){
		var isOppItem = nlapiGetCurrentLineItemValue('item', 'custcol_opportunity_item');
		if("T" == isOppItem)
		{
			alert("Generic items starting with 900 are not supported during creation of Quotes/Sales Orders");
			nlapiCancelLineItem(type);
			return false;
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
	itemType = nlapiGetCurrentLineItemValue('item', 'custcol_item_type_4_scripting');
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
	if(null == termItem || termItem == ''){
		termItem = 2;
	}

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

			if(term == 0){
				alert("Please specify the Number of Months for this item");
				return false;
			}
			var tempDiscount = 	parseFloat(rate) * parseInt(quantity) * parseInt(term);
			//alert('tempDiscount : ' + tempDiscount);
			hostedDiscount = tempDiscount - (tempDiscount * (parseFloat(newDiscount) * 1/100));
			//hostedDiscount = (parseFloat(rate) - parseFloat(newDiscount)) * (parseInt(quantity) * parseInt(term));
			//alert('hostedDiscount : ' + hostedDiscount);
			nlapiSetCurrentLineItemValue('item', 'amount', hostedDiscount);	
	//} else if(itemType == 'Maintenance') {
	} else if(termItem == 2 && itemType != 'Maintenance'){
	//else if(itemType != 'OnDemand') {
		//nonHostedDiscount = (parseFloat(rate) * parseInt(quantity)) - (parseFloat(rate) * parseInt(quantity) * discount/100)
		var tempDiscount = 	parseFloat(rate) * parseInt(quantity);
		//alert('tempDiscount : ' + tempDiscount);
		nonHostedDiscount = tempDiscount - (tempDiscount * (parseFloat(newDiscount) * 1/100));
		//alert('nonHostedDiscount : ' + nonHostedDiscount);
		nlapiSetCurrentLineItemValue('item', 'amount', nonHostedDiscount);
	//}
	}
	if(itemType == 'Maintenance') {

	//CH#GENERIC_MAINT_ITEM - start
		
		if(checkMaintType()==false)
			return false;
		
	//CH#GENERIC_MAINT_ITEM - end


		//alert('Inside');
		totalAmt = parseFloat(0);
		productFamily = nlapiGetCurrentLineItemValue('item', 'custcol_item_type');
		//alert('productFamily :' + productFamily);
		maintenancePercent = nlapiGetCurrentLineItemValue('item', 'custcol_maintenance_percentage');
		//alert('maintenancePercent : ' + maintenancePercent);
		currentLineCount = nlapiGetCurrentLineItemIndex('item');
		//alert('currentLineCount : ' + currentLineCount);
		for ( var i = 1; i < currentLineCount; i++) {
			tempItemType = nlapiGetLineItemValue('item', 'custcol_item_type_4_scripting', i);
			//alert('tempItemType : ' + tempItemType);
			tempProductFamily = nlapiGetLineItemValue('item', 'custcol_item_type', i);
			//alert('tempProductFamily : ' + tempProductFamily);
			var isLicenseItem = nlapiGetLineItemValue('item', 'custcol_is_test_license', i); //CH#TEST_LICENSE_ITEM - end
			
			if(tempItemType == 'License' && isLicenseItem!='T' && tempProductFamily == productFamily) {
				tempAmt = nlapiGetLineItemValue('item', 'amount', i);
				//CH#ITEM_QTY - start
				var itemTerm = nlapiGetLineItemValue('item', 'custcol_term_item', i); 
				if(itemTerm == 1)
				{
					var noOfMonths = nlapiGetLineItemValue('item', 'custcol_number_of_months', i); 
					if(noOfMonths == null || noOfMonths <= 0)
					{
						alert("Please specify the Number of Months for the Term License Items");
						return false;
					} else
					{
						termQty = parseInt(noOfMonths);
						tempAmt /= parseInt(noOfMonths);
					}
				}
				else if(itemTerm != 1)
				{
					tempAmt /= 12;
				}

				//CH#ITEM_QTY - end
				
				totalAmt += parseFloat(tempAmt);
				//alert(totalAmt);
			}//end if
		}//end for loop

		//alert('totalAmt : ' + totalAmt);
		maintenanceRate = parseFloat(totalAmt) * (parseFloat(maintenancePercent) * 1/100);

		//CH#ITEM_QTY - start
		
		var endDt =  nlapiGetCurrentLineItemValue('item', 'custcol_renewal_end_dt');
		//alert('custcol_renewal_end_dt : ' + endDt);
		var startDt =  nlapiGetCurrentLineItemValue('item', 'custcol_renewal_st_date');
		//alert('custcol_renewal_st_dt : ' + startDt);

		if(!isValidateDate(startDt)) {
			alert('Invalid Maint. Start Date');
			return false;
		}
		if(!isValidateDate(endDt)) {
			alert('Invalid Maint. End Date');
			return false;
		}
		var noOfDays = dateDiff(endDt,startDt);

		if(noOfDays=='-1') {
			alert('Maint. Start Date cannot be greater than Maint. End Date');
			return false;
		} 
		noOfDays += 1;
		//alert('noOfDays : ' + noOfDays);
		
		quantity = roundNumber(noOfDays/30.5,1);
		nlapiSetCurrentLineItemValue('item', 'quantity', quantity);
    	var beforeRoundingMaintenanceRate = maintenanceRate;

		maintenanceRate = roundNumber(maintenanceRate,2);
		nlapiSetCurrentLineItemValue('item', 'custcol_number_of_months', '');
		//CH#ITEM_QTY - end

		//nlapiSetLineItemValue('item', 'rate', currentLineCount, maintenanceRate);
		nlapiSetCurrentLineItemValue('item', 'rate', maintenanceRate);
		//alert('maintenanceRate : ' + maintenanceRate);
		
		//CH#ITEM_QTY - start
		//var tempDiscount = 	parseFloat(maintenanceRate) * parseInt(quantity);

		var annualRate = parseFloat(beforeRoundingMaintenanceRate)*12;
		
		//CH#CHECK_LEAP_YEAR - start
		var tempDiscount = 0;
		var leapYearFlag = isLeapYear_kana(startDt,endDt);
		//alert('leapYearFlag : '+leapYearFlag);
		if(leapYearFlag == true) {
			tempDiscount = (parseFloat(noOfDays)/366) * parseFloat(annualRate);
		} else {
			tempDiscount = (parseFloat(noOfDays)/365) * parseFloat(annualRate);
		}
		//CH#CHECK_LEAP_YEAR - end


		//CH#ITEM_QTY - end

		//alert('tempDiscount : ' + tempDiscount);
		maintenanceAmount = tempDiscount -  (tempDiscount * (parseFloat(newDiscount) * 1/100));
		//alert('maintenanceAmount : ' + maintenanceAmount);
		//nlapiSetLineItemValue('item', 'amount', currentLineCount, maintenanceAmount);
		nlapiSetCurrentLineItemValue('item', 'amount', maintenanceAmount);
		//alert('After Setting The Value');	
	} 
	//CH#TEST_LICENSE_ITEM - start
	var isLicPercentItem = isLicensePercentItem(); 
	if(itemType == 'License' && isLicPercentItem ) { 

			totalAmt = parseFloat(0);
			productFamily = nlapiGetCurrentLineItemValue('item', 'custcol_item_type');

			var licPercent = nlapiGetCurrentLineItemValue('item', 'custcol_test_lic_percent');
			var testLicPercent = licPercent.substring(0, licPercent.length-1);
			nlapiSetCurrentLineItemValue('item', 'quantity', 12);
			quantity=12;
					
			currentLineCount = nlapiGetCurrentLineItemIndex('item');
			for ( var i = 1; i < currentLineCount; i++) {
				tempItemType = nlapiGetLineItemValue('item', 'custcol_item_type_4_scripting', i);
				//alert('tempItemType : ' + tempItemType);
				tempProductFamily = nlapiGetLineItemValue('item', 'custcol_item_type', i);

				var isLicenseItem = nlapiGetLineItemValue('item', 'custcol_is_test_license', i); 
				//alert('tempProductFamily : ' + tempProductFamily);
				if(tempItemType == 'License' && isLicenseItem!='T' && tempProductFamily == productFamily) {

					tempAmt = nlapiGetLineItemValue('item', 'amount', i);

					//CH#ITEM_QTY - start
					var itemTerm = nlapiGetLineItemValue('item', 'custcol_term_item', i); 
					if(itemTerm == 1)
					{
						var noOfMonths = nlapiGetLineItemValue('item', 'custcol_number_of_months', i); 
						if(noOfMonths == null || noOfMonths <= 0)
						{
							alert("Please specify the Number of Months for the Term License Items");
							return false;
						} else
						{
							termQty = parseInt(noOfMonths);
							tempAmt /= parseInt(noOfMonths);
						}
					}
					else if(itemTerm != 1)
					{
						tempAmt /= 12;
					}

					//CH#ITEM_QTY - end
					
					totalAmt += parseFloat(tempAmt);
				}//end if
			}//end for loop

			var testLicenseRate = parseFloat(totalAmt) * (parseFloat(testLicPercent) * 1/100);

			//CH#ITEM_QTY - start
	    	var beforeRoundingTestLicenseRate = testLicenseRate;
	    	testLicenseRate = roundNumber(testLicenseRate,2);
			nlapiSetCurrentLineItemValue('item', 'custcol_number_of_months', '');
			//CH#ITEM_QTY - end

			nlapiSetCurrentLineItemValue('item', 'rate', testLicenseRate);
			var tempDiscount = 	parseFloat(beforeRoundingTestLicenseRate) * quantity;//CH#ITEM_QTY
			var testLicenseAmount = tempDiscount -  (tempDiscount * (parseFloat(newDiscount) * 1/100));
			nlapiSetCurrentLineItemValue('item', 'amount', testLicenseAmount);
		} 
	//CH#TEST_LICENSE_ITEM - end

	return true;
}

//CH#KANA10_VALIDATION - start

function saveRecWithoutQualifyingQuesValidation()
{
	var currentLineCount=0;
	var isOppItem;
	
	currentLineCount = nlapiGetLineItemCount('item');
	for ( var i = 1; i <= currentLineCount; i++) {
		isOppItem = nlapiGetLineItemValue('item', 'custcol_opportunity_item',i);
		if("T" == isOppItem){
			alert("Generic items starting with 900 are not supported during creation of Quotes/Sales Orders");
			return false;
		}
	}
	var kana10status = kana10Validation();
	if(kana10status != true) {
		return false;
	}
	return true;
}

function saveRecord()
{
	var stat = saveRecWithoutQualifyingQuesValidation();
	if(stat == false) {
		return false;
	}

	// CH#SALES_STATUS - start
	var status = validateQualifyingQuestions();
	return status;
	// CH#SALES_STATUS - end

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

function postSourcing(type,name) 
{	

	if(type=='item' && name=='item')
	{
		getItemRate(type,name);
	}
  
}

// CH#UNIT_PRICE_RESTRICTION - end
//CH#ITEM_QTY - start
function roundNumber(num, dec) {
	var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
	return result;
}
function isValidateDate(date)
{
	if(null == date || date == ''){
		return false;
	}
	return true;
}

function dateDiff(endDt,startDt) {
	date1 = new Date();
	date2 = new Date();
	diff  = new Date();
	
	date1temp = nlapiStringToDate(endDt);
	date1.setTime(date1temp.getTime());

    //alert('date1 '+date1);

	date2temp = nlapiStringToDate(startDt);
	date2.setTime(date2temp.getTime());

    //alert('date2 '+date2);

	var tempDiff = date1.getTime() - date2.getTime();
	if(tempDiff < 0)
	{
		return -1;
	}
	// sets difference date to difference of first date and second date

	diff.setTime(Math.abs(date1.getTime() - date2.getTime()));

	timediff = diff.getTime();

	//days = Math.floor(timediff / (1000 * 60 * 60 * 24));
	days = Math.round(timediff / (1000 * 60 * 60 * 24));

	return days;
}
//CH#ITEM_QTY - end

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

//This function will add a training credit to a quote. It will check if there are license items in the quote
//and prompt the user for confirmation.


function addTCandSubmitRecord(type, name)
{
	var currentLineCount=0;
	var isLicenseItem;
	var bLicenseItemFound = false;
	
	var isTrainingCreditItem;
	var bTrainingCreditItemFound = false;
	

	currentLineCount = nlapiGetLineItemCount('item');
	for ( var i = 1; i <= currentLineCount; i++) {
		isLicenseItem = nlapiGetLineItemValue('item', 'custcol_item_type_4_scripting',i);
		isTrainingCreditItem = nlapiGetLineItemValue('item', 'item',i);
		
		if("License" == isLicenseItem){
			bLicenseItemFound = true;
		}
		
		//sandbox item id
		//if(("1500" == isTrainingCreditItem) || ("1499"== isTrainingCreditItem)){
		if(("1548" == isTrainingCreditItem) || ("1549"== isTrainingCreditItem)){
			bTrainingCreditItemFound = true;
		}
	}
	
	if((bLicenseItemFound == true) && (bTrainingCreditItemFound == false)){
		var overridechkbox = nlapiGetFieldValue('custbody_quote_train_credit_override');
		if(overridechkbox == 'F'){
			var confirmed = window.confirm("Training Credits have been added to your quote. If you do not want to offer Training Credits press Cancel.");
			if(confirmed){
				nlapiSelectNewLineItem('item');
				
				//sandbox item id
				//nlapiSetCurrentLineItemValue('item','item','1499',true,true);
				nlapiSetCurrentLineItemValue('item','item','1548',true,true);
				nlapiCommitLineItem('item');
			}else{
				nlapiSetFieldValue('custbody_quote_train_credit_override','T',false);
			}
		}
	}
	
	var stat = saveRecord();
	if(stat == false) {
		return false;
	}
	
	return true;
}

// start - CH#SALES_STATUS
function onFieldChange(type,name)
{
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
	
	// CH#MORE_SALESSTATUS_CHANGES - start
	salesFieldChange(type,name);
	// CH#MORE_SALESSTATUS_CHANGES - end
	
	return true;
}
// end - CH#SALES_STATUS
