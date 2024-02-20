/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       10 Jan 2014     ibrahima
 * 2.00       07 Mar 2023     kschaefer			HD-6383 Allow Registrations, but capture recall status
 *
 */

var GD_UNITRETAILCUST_DEALER_FILTERED = 'custpagegd_unitretailcust_dealer';
var GD_UNITRETAILCUST_DEALER = 'custrecordunitretailcustomer_dealer';

var DEALER_SALES_REP_DROPDOWNLIST_ID = 'custpage_dealersalesreps';
var DEALER_SALES_REP2_DROPDOWNLIST_ID = 'custpage_dealersalesreps2';
var DEALER_SHIP_ADDRESS_COUNTRY_ID = 'custpage_dealerdefaultshipaddr';

var RECALL_STATUS_OPEN = '1'; // Registered with Open Recall
var RECALL_STATUS_NONE = '3'; // No Recall at Registration

/**
 * Performs before load logic for Unit Retail Customer record.
 * @param {Object} type
 * @param {Object} form
 * @param {Object} request
 */
function BeforeLoad(type, form, request)
{
	DisableNetsuiteButtons(form, false);

	if(request != null && request != 'undefined')
	{
		var unitId = request.getParameter('unitId');
		if(!IsDealerLoggedIn())
			unitId = nlapiGetFieldValue('custrecordunitretailcustomer_unit');
		if(trim(unitId) != '')
		{
			//Make unit dropdownlist inline if dealer is logged in.
			var ddlUnit = form.getField('custrecordunitretailcustomer_unit');
			nlapiSetFieldValue('custrecordunitretailcustomer_unit', unitId, true, false);

			if(ddlUnit != null)
				ddlUnit.setDisplayType('inline');
		}
		else
		{
			if(type == 'create' || type == 'copy')
				throw new nlobjError('NO_UNIT_TO_REGISTER','To register a unit for a retail customer, please go to Units tab -> Unit and click "Register Units" link.', true);
		}
	}

	//Get stored field values so that we can select on our manually added fields.
	var storedSalesRepId = 0;
	var storedSalesRep2Id = 0;

	if(type == 'view' || type == 'edit')
	{
		var fields = ['custrecordunitretailcustomer_dealsalesrp', 'custrecordunitretailcustomer_dsalesrp2'];
		var columns = nlapiLookupField('customrecordrvsunitretailcustomer', nlapiGetRecordId(), fields);

		storedSalesRepId = ConvertNSFieldToInt(columns.custrecordunitretailcustomer_dealsalesrp);
		storedSalesRep2Id = ConvertNSFieldToInt(columns.custrecordunitretailcustomer_dsalesrp2);
	}

	var dealerId = nlapiGetContext().getUser() || '';
    alert("dealerID" +dealerId);
	if(!IsDealerLoggedIn())
		dealerId = nlapiGetFieldValue('custrecordunitretailcustomer_dealer') || '';

	if(dealerId != '')
	{
		UnitRetailCust_AddDealerDropDownList(dealerId, form, type);
		AddDealerSalesRepDropDownList(storedSalesRepId, dealerId, form, true);
		AddDealerSalesRepDropDownList(storedSalesRep2Id, dealerId, form);

		nlapiSetFieldValue('custrecordunitretailcustomer_registrcvd', getTodaysDate());

		if(type == 'create' && form != null && form != undefined)
		{
			//Get logged in dealer default ship country.
			var dealer = nlapiLoadRecord('customer', dealerId);
			var addrSubrecord = null;
			for(var j = dealer.getLineItemCount('addressbook'); j > 0; j--)
			{
				if(dealer.getLineItemValue('addressbook', 'defaultshipping', j) == 'T')
				{
					dealer.selectLineItem('addressbook', j);
		            addrSubrecord = dealer.viewCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
		            if(addrSubrecord != null)
		        	{
		            	if(trim(addrSubrecord.getFieldText('country')) != '')
		            	{
		            		form.addField(DEALER_SHIP_ADDRESS_COUNTRY_ID, 'text', 'Dealer Def. Ship Addr').setDisplayType('hidden').setDefaultValue(addrSubrecord.getFieldText('country'));
		            		if(type == 'create' && IsDealerLoggedIn())
		            		{
		            			//Set default country based on dealer's default shipping country.
		            			var dealerShipCountryId = trim(nlapiGetFieldValue(DEALER_SHIP_ADDRESS_COUNTRY_ID));
		            			if(dealerShipCountryId != ''){ nlapiSetFieldText('custrecordunitretailcustomer_country', dealerShipCountryId, true, true); }
		            		}
		            	}
		        	}

		            break;
				}
			}
		}
	}

	//Add a header to the page in red that alerts the user if there is an open recall with this unit.
	//If there is, they won't be able to save the record.
	var unitId = ConvertNSFieldToString(nlapiGetFieldValue('custrecordunitretailcustomer_unit'));
	if (unitId.length > 0)
	{
		var recallSearchResults = GetUnitRecallSearchResults(unitId);
		if (recallSearchResults.length > 0)
		{
			form.addFieldGroup('custpage_myfg', 'Open Recalls and Notices').setSingleColumn(false);

			//get the flatRateField defined in Company Preferences
			//in GD this is the flat rate description
			var flatRateField = ConvertNSFieldToString(GetClaimRecallAlertField());

			var customerSatisfactionHtml = '';
			var recallHtml = '';

			//define boolean values representing the presence of recall types
			var thisUnitHasRecall = false;
			var thisUnitHasCustomerSatisfactionRecall = false;

			for (var i = 0; i < recallSearchResults.length; i++)
			{
				//get the type code to check what sort of recall this is
				var typeCode = recallSearchResults[i].getValue('custrecordgd_flatratecode_type', 'custrecordrecallunit_recallcode');

				//get the name and description of the flat rate code
				var flatRateName = recallSearchResults[i].getValue('name', 'custrecordrecallunit_recallcode');
				if (flatRateField.length > 0) flatRateName += ' - ' + recallSearchResults[i].getValue(flatRateField, 'custrecordrecallunit_recallcode');

				if(typeCode == GD_FLATRATECODE_TYPE_CUSTOMERSATISFACTION)
				{
					thisUnitHasCustomerSatisfactionRecall = true;
					customerSatisfactionHtml += '<li><span style="font-size:12px;font-weight:bold;color:green;">' + flatRateName + '</span></li>';
				}
				else
				{
					thisUnitHasRecall = true;
					recallHtml += '<li><span style="font-size:12px;font-weight:bold;color:red;">' + flatRateName + '</span></li>';
				}
			}

			if(thisUnitHasCustomerSatisfactionRecall)
			{
				customerSatisfactionHtml = '<span style="font-size:16px;font-weight:bold;color:green;">This unit is subject to Customer Satisfaction Campaign(s): </span><ul>'
					+ customerSatisfactionHtml + "</ul>";
			}

			if(thisUnitHasRecall)
			{
				recallHtml = '<span style="font-size:16px;font-weight:bold;color:red;">This vehicle has open recalls and must be repaired according<br />to <u>Federal Law</u> before customer takes delivery.</span><ul>'
						+ recallHtml + "</ul>";
			}

			var html = recallHtml + "<br/>" + customerSatisfactionHtml + "<br/><br/>";

			form.addField('custpage_recallalert', 'inlinehtml', '', null, 'custpage_myfg').setDefaultValue(html);
		}
	}
}

/**
 * Performs before submit logic.
 * @param type
 */
function BeforeSubmit(type)
{

	if(type == 'create' || type == 'edit')
	{
		if(type == 'edit' && IsDealerLoggedIn())
			throw new nlobjError('PERMISSION_VIOLATION','You cannot edit existing spiffs from the dealer portal. Please contact Grand Design to make changes.', true);
		//Set retail customer dealer to be the one selected from the UI.
		//Note: The UI dealer is a manually added dropdownlist.

		//The 'CanDealerRegisterVin' if-statement was added for the "Register Units from Different Locations Change Order" - BrianS
		var vin = nlapiGetFieldText('custrecordunitretailcustomer_unit');
		//Make sure that this vin can be registered.
		//This check makes sure that vin has not been registered since dealer loaded it for registration.
		//It is possible that while this dealer has it open, main dealer registered it. This will prevent it from being registered again.
		if(CanDealerRegisterVin(vin, null) || IsDealerLoggedIn() == false)
		{
			var dealerIdToRegister = nlapiGetFieldValue(GD_UNITRETAILCUST_DEALER_FILTERED);
			var unitId = nlapiGetFieldValue('custrecordunitretailcustomer_unit');
			var unitSeries = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_series');

			nlapiSetFieldValue(GD_UNITRETAILCUST_DEALER, dealerIdToRegister, false, false);
			var dealerSalesRep1 = nlapiGetFieldValue(DEALER_SALES_REP_DROPDOWNLIST_ID) || '';
			var dealerSalesRep2 = nlapiGetFieldValue(DEALER_SALES_REP2_DROPDOWNLIST_ID) || '';
			//Make sure they didn't choose the same rep twice, since that would count as 2 sales on the GDRVU Leaderboard
			if(dealerSalesRep1 != '' && (dealerSalesRep1 == dealerSalesRep2))
				throw new nlobjError('SAME_REP_SELECTED','You cannot select the same sales rep in both the primary and secondary rep fields.', true);
			nlapiSetFieldValue('custrecordunitretailcustomer_dealsalesrp', dealerSalesRep1, false, false);
			nlapiSetFieldValue('custrecordunitretailcustomer_dsalesrp2', dealerSalesRep2, false, false);

			//update dealer and sales rep on the unit if dealer being registered to is different than the current dealer on the unit
			var unitDealerId = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_dealer', false);
			if(unitDealerId != dealerIdToRegister)
			{
				var filters = [];
				filters.push(new nlobjSearchFilter('custrecordrvs_salesrepbyseries_dealer', null, 'anyof', dealerIdToRegister));
				filters.push(new nlobjSearchFilter('custrecordrvs_salesrepbyseries_series', null, 'anyof', unitSeries));
				var cols = [];
				cols.push(new nlobjSearchColumn('custrecordrvs_salesrepbyseries_salesrep'));
				cols[0].setSort(true); 	//Sorts in descending order, so the most recent Sales Rep will be returned, if there are multiple

				var GDSalesRep = '';
				var searchResults = nlapiSearchRecord('customrecordrvs_salesrepbyseries', null, filters, cols);
				//If we found the sales rep for this dealer & series, then set it on the Unit
				if(searchResults != null && searchResults.length > 0)
				{
					GDSalesRep = searchResults[0].getValue('custrecordrvs_salesrepbyseries_salesrep');
				}
				else	//If we didn't find one, set the sales rep to empty
				{
					GDSalesRep = '';
					nlapiLogExecution('debug', 'couldnt find rep for dealerID: ' + dealerIdToRegister + ' and seriesId: ' + unitSeries, 'Sales Rep set to empty');
				}

				nlapiSubmitField('customrecordrvsunit', unitId, ['custrecordunit_dealer','custrecordunit_salesrep'], [dealerIdToRegister, GDSalesRep], true);
			}
		}
		else
		{
			throw new nlobjError('UNIT_ALREADY_REGISTERED','This Unit has already been registered.', true);
		}
	}
}

//When the unit retail customer is submitted, 
//we need to update the unit record so that the "Retail Sold, Not Registered" flag is false.
function AfterSubmit(type)
{
	if (type != 'delete' && type != 'xedit')
	{
		//BEGIN CHECK - If the unit retail customer is inactive we uncheck the current customer checkbox. JRB 7-31-2014
		var unitRetailCustomerId = nlapiGetRecordId();
		var unitRetailCustomerInactive = nlapiLookupField(nlapiGetRecordType(), unitRetailCustomerId, 'isinactive');
		if (unitRetailCustomerInactive == 'T')
		{
			nlapiSubmitField(nlapiGetRecordType(), unitRetailCustomerId, 'custrecordunitretailcustomer_currentcust', 'F');
		}
		//END CHECK -

		var unitId = nlapiGetFieldValue('custrecordunitretailcustomer_unit');
		nlapiSubmitField('customrecordrvsunit', unitId, 'custrecordunit_retailsoldnotregistered', 'F');

		var isRetailSoldDateUpdated = false;	// JRB per case 4845 We need to check if purchase date is changed
		if (type == 'edit')
		{
			// JRB per case 4845 We need to check if purchase date is changed
			var oldUnitRetailCustomer = nlapiGetOldRecord();
			var oldRetailPurchaseDate = oldUnitRetailCustomer.getFieldValue('custrecordunitretailcustomer_retailsold');
			var currentRetailPurchaseDate = nlapiGetFieldValue('custrecordunitretailcustomer_retailsold');
			isRetailSoldDateUpdated = (oldRetailPurchaseDate != currentRetailPurchaseDate ? true : false);
		}

		var isOriginalOwner = true;
		var urcFilters = [];
		urcFilters.push(new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', unitId));
		urcFilters.push(new nlobjSearchFilter('internalid', null, 'noneof', unitRetailCustomerId)); 	//Don't include the one we just saved
		var urcColumns = [];
		var unitRetailCusResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, urcFilters, urcColumns);
		//If we find an existing registration for this unit, then this is a secondary owner, and we should not update the warranty exp date
		if(unitRetailCusResults != null && unitRetailCusResults.length > 0)
		{
			isOriginalOwner = false;
		}

		//Any time unit retail customer is created, we want to set Warranty Registration Expiration date
		//on the unit based on the warranty terms from the series linked to the unit.
		if(((type == 'create' && trim(unitId) != '') || isRetailSoldDateUpdated) && isOriginalOwner == true)
		// JRB per case 4845 We need to check if purchase date is changed
		// MPF case 20177: Never change a Unit's Warranty Expiration Date because of a modification to a Unit Retail Customer who is not the original URC for that Unit.
		{
			SetUnitWarrantyExpDate(unitId);
		}
	}
	else if (type == 'delete')
	{
		//If Unit Retail Customer is deleted and unit has no other retail customers,
		//clear Warranty Registration related date. JRB: 6/19/2014 based on Case #4066
		var oldRetail = nlapiGetOldRecord();

		if(oldRetail != null)
		{
			var unitId = oldRetail.getFieldValue('custrecordunitretailcustomer_unit');
			nlapiLogExecution('debug', 'AfterSubmit', unitId);
			if(unitId != null && unitId != '')
			{
				var filters = new Array();
				filters[filters.length] = new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', unitId);

				var searchResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, null);

				//There are no retail customer in the unit anymore, clear registration dates based on case #4066
				if(searchResults == null)
				{
					nlapiSubmitField('customrecordrvsunit', unitId, ['custrecordunit_receiveddate', 'custrecordunit_retailpurchaseddate', 'custrecordunit_warrantyexpirationdate'], [null, null, null], false);
				}
			}
		}
	}

	if (type == 'create'){
		//Automatically create a spiff if an approved program is available for this unit.
		var unit = nlapiGetFieldValue('custrecordunitretailcustomer_unit');
		var dealer = nlapiGetFieldValue('custrecordunitretailcustomer_dealer');
		var retailSoldDate = nlapiGetFieldValue('custrecordunitretailcustomer_retailsold');

		//Search to make sure there aren't existing dealer spiffs for this unit.
		var filters = [];
		filters.push(new nlobjSearchFilter('custrecordspiff_unit', null, 'anyof', unit));
		filters.push(new nlobjSearchFilter('custrecordspiff_programtype', null, 'anyof', GD_PROGRAMTYPE_DEALERSPIFF));

		var existingSpiffs = nlapiSearchRecord('customrecordrvsspiff', null, filters);

		//Since there can only be one dealer spiff per VIN, only continue if our spiff search returned no results.
		if(!existingSpiffs)
		{
			//Search for program units that apply.
			var filters = [];
			filters.push(new nlobjSearchFilter('custrecordprogram_type', 'custrecordprogramunit_program', 'anyof', GD_PROGRAMTYPE_DEALERSPIFF));
			filters.push(new nlobjSearchFilter('custrecordprogram_status', 'custrecordprogramunit_program', 'anyof', PROGRAMSTATUS_APPROVED));
			filters.push(new nlobjSearchFilter('custrecordprogram_startdate', 'custrecordprogramunit_program', 'onorbefore', retailSoldDate));
			filters.push(new nlobjSearchFilter('custrecordprogram_enddate', 'custrecordprogramunit_program', 'onorafter', retailSoldDate));
			filters.push(new nlobjSearchFilter('custrecordprogram_dealer', 'custrecordprogramunit_program', 'anyof', dealer));
			filters.push(new nlobjSearchFilter('custrecordprogramunit_unit', null, 'anyof', unit));

			var cols = [];
			cols.push(new nlobjSearchColumn('custrecordprogramunit_incentiveamount').setSort(true)); //descending
			cols.push(new nlobjSearchColumn('custrecordprogramunit_program'));

			var applicableProgramUnits = nlapiSearchRecord('customrecordrvsprogramunit', null, filters, cols);
			if(applicableProgramUnits)
			{
				//Choose the first applicable program. Since we sorted by incentive amount, this will give us the highest amount.
				var programUnit = applicableProgramUnits[0];

				//Create the spiff.
				var spiff = nlapiCreateRecord('customrecordrvsspiff');
				spiff.setFieldValue('custrecordspiff_retailcustomer', nlapiGetRecordId());
				spiff.setFieldValue('custrecordspiff_programunit', programUnit.getId());
				spiff.setFieldValue('custrecordspiff_program', programUnit.getValue('custrecordprogramunit_program'));
				spiff.setFieldValue('custrecordspiff_amount', programUnit.getValue('custrecordprogramunit_incentiveamount'));
				spiff.setFieldValue('custrecordspiff_status', SPIFFSTATUS_OPEN);
				var spiffId = nlapiSubmitRecord(spiff);

				//Set the spiff ID on the program unit.
				nlapiSubmitField('customrecordrvsprogramunit', programUnit.getId(), 'custrecordprogramunit_spiff', spiffId);
			}
		}
	}

	var context = nlapiGetContext();
	if(context.getExecutionContext() == 'userinterface' ||
			context.getExecutionContext() == 'webservices' ||
			context.getExecutionContext() == 'webstore') {
		if(CanAddRecordsInOutgoingQueue()) {		//records can be added in outgoing queue
			if(type == 'create' || type == 'edit')
				CreateAimbaseOutgoingQueueRecord(GD_AB_RECORDTYPE_REGISTRATION, nlapiGetRecordId(), nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()).getFieldValue('name'), 'F');
			else if(type == 'delete')
				CreateAimbaseOutgoingQueueRecord(GD_AB_RECORDTYPE_REGISTRATION, nlapiGetRecordId(), nlapiGetOldRecord().getFieldValue('name'), 'T');
		}
	}
}

/**
 * Performs client-side logic on unit retail customer entry page init.
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function UnitRegistration_Init(type)
{

}

/**
 * Perfom client-side logic when the record is saved.
 * @param {Object} type
 */
function UnitRegistration_SaveRecord()
{
    	var dealerId = nlapiGetContext().getUser() || '';
		var specialPriv = false;

		// Provide special privileges to edit the data irrespective of the restrictions
		// Jeff Pratt, Sidney Kopf, Jessica Sanchez
		if(dealerId == '13172' || dealerId == '3868880' || dealerId == '3833757')
		{
			specialPriv = true;
		}
	//if(IsDealerLoggedIn())
	//{
		var canRegisterUnit = true;
		var firstRegistration = true; // HD-6383
        var recallStatus = RECALL_STATUS_NONE; // HD-6383

		if(nlapiGetFieldValue('custrecordunitretailcustomer_custverific') == 'F') //Enforce acknowledgement
		{
			canRegisterUnit = false;
			alert("You must acknowledge that the retail customer has received 'Warranty Terms and Conditions.'");
		}

		if(canRegisterUnit)
		{
			//Check if this record can be registered. The reason we are checking
			//is because it is possible that while one user was registering the unit
			//another user had finished registering it.
			//This will insure that each unit is registered only once.
			var currentRecordId = parseInt(nlapiGetRecordId()); //This will be NaN for New Records.
			if(isNaN(currentRecordId)) //If this is true, it means that the record is being created not edited/deleted.
			{
				var unitId = nlapiGetFieldValue('custrecordunitretailcustomer_unit');
				if(trim(unitId) != '')
				{
					var fields = ['custrecordunit_receiveddate', 'custrecordunit_shipdate'];
					var columns = nlapiLookupField('customrecordrvsunit',unitId,fields);

					if(trim(columns.custrecordunit_receiveddate) != '')
					{
						canRegisterUnit = false;
						firstRegistration = false;
						alert("This unit has been registered by someone else since you last open the record.");
					}
					else
					{
						nlapiSetFieldValue('custrecordunitretailcustomer_registrcvd', getTodaysDate());
					}

					//Now make sure that Retail Purchase Date is not before the unit was shipped.
					//i.e, retail purchase date should be on or after unit ship date.
					if(trim(columns.custrecordunit_shipdate) != '') //Make sure unit ship date is set.
					{
						var purchaseDateString = nlapiGetFieldValue('custrecordunitretailcustomer_retailsold');
						if(trim(purchaseDateString) != '')
						{
							var unitShipDate = nlapiStringToDate(columns.custrecordunit_shipdate);
							var custRetailPurchaseDate = nlapiStringToDate(purchaseDateString);
							var today = nlapiStringToDate(getTodaysDate());
							//retail purchase date must be between unit ship date and today's date.
							if(custRetailPurchaseDate.getTime() >= unitShipDate.getTime() && custRetailPurchaseDate.getTime() <= today.getTime())
							{
								//This is okay
							}
							else //invalid retail purchase date.
							{
								canRegisterUnit = false;
								alert("The retail sold date you have entered must be between the unit's ship date and today's date.");
							}
						}
						else
						{
							canRegisterUnit = false;
							alert("Please enter 'Retail Purchase Date'");
						}
					}
					else
					{
						canRegisterUnit = false;
						alert("This unit has not been shipped and cannot be registered.");
					}

				}
				else
				{
					canRegisterUnit = false;
					alert('Unit Retail Customer/Unit Warranty Registration can only be created by going to Units tab under "Register Units" link.');
				}
			}
		}

		var unitId = ConvertNSFieldToString(nlapiGetFieldValue('custrecordunitretailcustomer_unit'));
		if (unitId.length > 0)
		{
			var recallSearchResults = GetUnitRecallSearchResults(unitId);
			if (recallSearchResults.length > 0)
			{
			var thisUnitHasRecall = false;
			for (var i = 0; i < recallSearchResults.length; i++)
			{
			var typeCode = recallSearchResults[i].getValue('custrecordgd_flatratecode_type', 'custrecordrecallunit_recallcode');
				if(typeCode != "Customer Satisfaction")
				thisUnitHasRecall = true;
                recallStatus = RECALL_STATUS_OPEN; // HD-6383
			}
			if(thisUnitHasRecall && !specialPriv)
			{
			var recallConfirm = confirm("This vehicle has open recalls that must be completed prior to retail delivery.  It is a violation of Federal Law to deliver a vehicle with an open recall.  Do you wish to proceed with registering this vehicle?");
			if (recallConfirm) {
				nlapiSetFieldValue('custrecord_urc_gd_reg_recall_consent', 'T');
			}
			// return false;
			}
			}
		}

        // HD-6383 If first registration, set First Registration Recall Status
        if (firstRegistration) nlapiSetFieldValue('custrecord_urc_first_reg_recall_status', recallStatus);

		if(specialPriv)
			return true;

		return canRegisterUnit;
	//}
	//else
	//return true;
}


/**
 * Sets Unit Warranty Expiration Date
 * @param unitId
 */
function SetUnitWarrantyExpDate(unitId)
{
	var isCurrentCustomer = nlapiGetFieldValue('custrecordunitretailcustomer_currentcust');
	var retailSoldDateStr = nlapiGetFieldValue('custrecordunitretailcustomer_retailsold');
	if(isCurrentCustomer == 'T' && retailSoldDateStr != null && trim(retailSoldDateStr) != '')
	{
		var unitSeriesId = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_series');
		if(trim(unitSeriesId) != '')
		{
			var seriesWarrTermId = nlapiLookupField('customrecordrvsseries', unitSeriesId, 'custrecordseries_warrantyterm');
			var retailSoldDate = nlapiStringToDate(retailSoldDateStr);

			var expDate = null;
			if(seriesWarrTermId == WARRANTY_TERMS_ONE_YEAR)
				expDate = nlapiAddMonths(retailSoldDate, 12);
			else if(seriesWarrTermId == WARRANTY_TERMS_TWO_YEARS)
				expDate = nlapiAddMonths(retailSoldDate, 24);
			else if(seriesWarrTermId == WARRANTY_TERMS_THREE_YEARS)
				expDate = nlapiAddMonths(retailSoldDate, 36);

			if(expDate != null)
				nlapiSubmitField('customrecordrvsunit', unitId, 'custrecordunit_warrantyexpirationdate', getUSFormattedDate(expDate), false);
		}
	}
}

/**
 * Update unit warranty exp. date based on Unit Registration retail sold date.
 * @param rec_type
 * @param rec_id
 */
function SetUnitWarrantyExpDateFromRetailSoldDate(rec_type, rec_id)
{
	/** @type nlobjRecord */
	var unitRegRecord = nlapiLoadRecord(rec_type, rec_id);

	var unitId = unitRegRecord.getFieldValue('custrecordunitretailcustomer_unit');
	var retailSoldDateStr = unitRegRecord.getFieldValue('custrecordunitretailcustomer_retailsold');
	var isCurrentCustomer = unitRegRecord.getFieldValue('custrecordunitretailcustomer_currentcust');

	//Make sure that Unit Retail Customer record has Retail Sold Date and that it has the current customer.
	if(retailSoldDateStr != null && retailSoldDateStr != '' && isCurrentCustomer == 'T')
	{
		var unitSeriesId = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_series');
		var seriesWarrTermId = nlapiLookupField('customrecordrvsseries', unitSeriesId, 'custrecordseries_warrantyterm');
		var retailSoldDate = nlapiStringToDate(retailSoldDateStr);

		var expDate = null;
		if(seriesWarrTermId == WARRANTY_TERMS_ONE_YEAR)
			expDate = nlapiAddMonths(retailSoldDate, 12);
		else if(seriesWarrTermId == WARRANTY_TERMS_TWO_YEARS)
			expDate = nlapiAddMonths(retailSoldDate, 24);
		else if(seriesWarrTermId == WARRANTY_TERMS_THREE_YEARS)
			expDate = nlapiAddMonths(retailSoldDate, 36);

		if(expDate != null)
		{
//			nlapiLogExecution('debug', 'SetUnitWarrantyExpDateFromRetailSoldDate', 'unitId = ' + unitId + '; retailSoldDateStr = ' + retailSoldDateStr + '; seriesWarrTermId = ' + seriesWarrTermId + '; expDate = ' + nlapiDateToString(expDate));
			nlapiSubmitField('customrecordrvsunit', unitId, 'custrecordunit_warrantyexpirationdate', getUSFormattedDate(expDate), false);
		}
	}
}

// Method that takes in a unit registration record and sets the dealer based on the unit
function SetDealerOnUnitRegistration(rec_type, rec_id)
{
	/** @type nlobjRecord */
	var unitRegRecord = nlapiLoadRecord(rec_type, rec_id);

	// get the unit id and then look up the dealer for the unit
	var unitId = unitRegRecord.getFieldValue('custrecordunitretailcustomer_unit');

	var dealerId = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_dealer');

	if (dealerId != null && dealerId != '')
	{
		// if the dealer is inactive, then temporarily reactivate it so we can link it up
		// for some reason it won't do the link otherwise
		var inactiveDealer = nlapiLookupField('customer', dealerId, 'isinactive');

		if (inactiveDealer == 'T')
		{
			nlapiSubmitField('customer', dealerId, 'isinactive', 'F');
		}

		nlapiSubmitField(rec_type, rec_id, 'custrecordunitretailcustomer_dealer', dealerId, false);

		if (inactiveDealer == 'T')
		{
			nlapiSubmitField('customer', dealerId, 'isinactive', 'T');
		}
	}
}


/**
 * Updates dealer on unit retail customer to be the same as the dealer on the unit that retail customer belongs to.
 * @param rec_type
 * @param rec_id
 */
function UpdateDealerOnRetailCustomerBasedOnUnit(rec_type, rec_id)
{
	/** @type nlobjRecord */
	var unitRetailCustomer = nlapiLoadRecord(rec_type, rec_id);

	var retailCustomerDealerId = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_dealer');
	var retailCustomerUnitId = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_unit');
	var unitDealerId = nlapiLookupField('customrecordrvsunit', retailCustomerUnitId, 'custrecordunit_dealer', false);

	//Update retail customer dealer if its dealer and dealer on the unit are not the same.
	//We are checking for retailCustomerDealerId null because this field was not storing value and it could be null.
	if(retailCustomerDealerId == null || retailCustomerDealerId == '' || retailCustomerDealerId != unitDealerId)
	{
		unitRetailCustomer.setFieldValue('custrecordunitretailcustomer_dealer', unitDealerId);
		nlapiSubmitRecord(unitRetailCustomer, false, true);
	}
}


//***************************************** GRAND DESIGN SPECIFIC METHODS ********************************//
/**
 * Gets dealer active contacts.
 * @param dealerId
 * @returns
 */
function GetActiveDealerContacts(dealerId)
{
	//Get the ids of dealers in this group. If there is not group, the dealer passed in will be returned
	var dealerGroupDealers = GetDealerGroupMembers(dealerId);

	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('company', null, 'anyof', dealerGroupDealers);
	filters[filters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	filters[filters.length] = new nlobjSearchFilter('custentityrvsisdealersalesrep', null, 'is', 'T');

	var columns = new Array();
	columns[columns.length] = new nlobjSearchColumn('internalid');
	columns[columns.length] = new nlobjSearchColumn('entityid');
	columns[columns.length] = new nlobjSearchColumn('company');

	return nlapiSearchRecord('contact', null, filters, columns);
}

/**
 * Adds dealer sales rep dropdownlist.
 * @param dealerId
 * @param form
 */
function AddDealerSalesRepDropDownList(storedSalesRepId, dealerId, form, isPrimary)
{
	var reps = GetActiveDealerContacts(dealerId);

	if(reps != null && reps.length > 0)
	{
		var ddlReps = '';
		var fieldId = DEALER_SALES_REP2_DROPDOWNLIST_ID;
		if(isPrimary)
		{
			fieldId = DEALER_SALES_REP_DROPDOWNLIST_ID;
			ddlReps = form.addField(fieldId, 'select', 'Dealer Sales Rep');
			if(IsDealerLoggedIn())
				ddlReps.setMandatory(true);
			else
			//If internal, only make the rep field mandatory if this is a registration for a new owner
			{
				var unitId = nlapiGetFieldValue('custrecordunitretailcustomer_unit') || '';

				var urcFilters = [];
				urcFilters.push(new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', unitId, null));
				var urcColumns = [];
				var unitRetailCusResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, urcFilters, urcColumns);

				var unitLookup = nlapiLookupField('customrecordrvsunit', unitId, ['custrecordnowarranty', 'custrecordgd_totaledunit']);
				//If we find an existing registration for this unit, then this field should not be mandatory, since this is the 2nd owner.
				if((unitRetailCusResults != null && unitRetailCusResults.length > 0) || (unitLookup.custrecordnowarranty == 'T' || unitLookup.custrecordgd_totaledunit == 'T'))
				{
					ddlReps.setMandatory(false);
				}
				else
					ddlReps.setMandatory(true);
			}
		}
		else
		{
			ddlReps = form.addField(fieldId, 'select', 'Secondary Dealer Sales Rep');
		}
		form.insertField(form.getField(fieldId), 'custrecordunitretailcustomer_retailsold'); //move dealer dropdownlist to be before dealersalesrep ddl
		ddlReps.addSelectOption('', '', true);
		for(var i = 0; i < reps.length; i++)
		{
			var selected = false;
			if(storedSalesRepId != 0)
				selected = (reps[i].getId() == storedSalesRepId);

			ddlReps.addSelectOption(reps[i].getId(), reps[i].getText('company') + ': '+ reps[i].getValue('entityid'), selected);
		}

		if(reps.length == 1)
			ddlReps.setDisplayType('disabled');
	}
}



/**
 * Adds dealer dropdown list.
 * @param dealerId
 * @param form
 * @param type
 */
function UnitRetailCust_AddDealerDropDownList(dealerId, form, type)
{
	var dgms = GetDealerGroupMembers(dealerId); //returns an array of internal ids of dealers

	if(dgms != null && dgms.length > 0)
	{
		if(type == 'edit') // if edit mode, default the dealer dropdown to what was chosen before.
			var defaultSelect = nlapiGetFieldValue(GD_UNITRETAILCUST_DEALER);
		else // Otherwise, default the dealer dropdown to the dealer of the logged in user.
			var defaultSelect = dealerId;

		var fieldId = GD_UNITRETAILCUST_DEALER_FILTERED;
		var dropDown = form.addField(fieldId, 'select', 'Dealer');
		dropDown.setMandatory(true);

		form.insertField(form.getField(fieldId), GD_UNITRETAILCUST_DEALER); //move field
		for(var i = 0; i < dgms.length; i++)
		{
			var dealerName = nlapiLookupField('customer', dgms[i], 'companyname');
			if(dgms[i] == defaultSelect )
				dropDown.addSelectOption(dgms[i], dealerName, true); // set as default select value.
			else
				dropDown.addSelectOption(dgms[i], dealerName, false);
		}

		if(dgms.length == 1)
			dropDown.setDisplayType('disabled');
	}
}



///**
// * Adds dealer drop down list on the specified form.
// * @param form
// */
//function AddDealersDropDownList(storedDealerId, dealerId, form)
//{
//
// 	var filters = new Array();
// 	filters[filters.length] = new nlobjSearchFilter('internalid', null, 'anyof', dealerId);
//	
//	var columns = new Array();
//	columns[columns.length] = new nlobjSearchColumn('internalid');
//	columns[columns.length] = new nlobjSearchColumn('entityid');
//	columns[columns.length] = new nlobjSearchColumn('companyname');
//	var dealerResults = nlapiSearchRecord('customer', null, filters, columns);
//
//	if(dealerResults != null && dealerResults.length > 0)
//	{
//		var ddlDealers = form.addField(DEALER_DROPDOWNLIST_ID, 'select', 'Dealer');				
//		ddlDealers.setMandatory(true);
//		form.insertField(form.getField(DEALER_DROPDOWNLIST_ID), 'custrecordunitretailcustomer_retailsold'); //move dealer dropdownlist to be before dealersalesrep ddl
//		
//		for(var i = 0; i < dealerResults.length; i++)
//		{
//			var selected = false;
//			if(storedDealerId != 0)
//				selected = (dealerResults[i].getId() == storedDealerId);
//			else
//				selected = (dealerResults[i].getId() == dealerId);
//			
//			ddlDealers.addSelectOption(dealerResults[i].getId(), dealerResults[i].getValue('entityid') + ' ' + dealerResults[i].getValue('companyname') , selected);
//		}	
//		
//		ddlDealers.setDisplayType('disabled');
//	}
//}

/**
 * Returns list of search results for open recalls against a given unit
 * @param unitId
 */
function GetUnitRecallSearchResults(unitId)
{
	var claimCol = new nlobjSearchColumn('custrecordrecallunit_claim');
	claimCol.setSort(true);
	var columns = [claimCol, new nlobjSearchColumn('name', 'custrecordrecallunit_recallcode')];
	var flatRateField = ConvertNSFieldToString(GetClaimRecallAlertField());

	if (flatRateField.length > 0) columns.push(	new nlobjSearchColumn(flatRateField, 'custrecordrecallunit_recallcode'),
												new nlobjSearchColumn('custrecordrecallunit_recallcode'),
												new nlobjSearchColumn('custrecordgd_flatratecode_type', 'custrecordrecallunit_recallcode'));

	var unitSearchResults = nlapiSearchRecord('customrecordrvs_recallunit', null, [new nlobjSearchFilter('custrecordrecallunit_unit', null, 'is', unitId),
	                                                                               new nlobjSearchFilter('isinactive', 'custrecordrecallunit_recallcode', 'is', 'false'),
	                                                                               new nlobjSearchFilter('custrecordrecallunit_claim', null, 'anyof', '@NONE@')], columns);
	if (unitSearchResults != null && unitSearchResults.length > 0) return unitSearchResults;
	return [];
}