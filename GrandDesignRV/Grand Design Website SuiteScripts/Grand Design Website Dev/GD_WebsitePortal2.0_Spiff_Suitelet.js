/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       5 Jul 2017     brians
 *
 */

var SPIFF_RECORD_TYPE = '75';

var PROGRAMSTATUS_CANCELLED = '2';
var PROGRAMSTATUS_EXPIRED = '3';
var PROGRAMSTATUS_APPROVED = '4';

var PROGRAMTYPE_SALESPERSON = '1';
var PROGRAMTYPE_GLOBAL = '4';

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GDWebsiteSpiffCreateSuitelet(request, response){

	var form = nlapiCreateForm('', true);		
	
	var HTMLfield = form.addField('custpage_spiffcreatehtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var dealerId = nlapiGetUser();
	var userEmail = '';
	
	var context = nlapiGetContext();
	if(context != null)
	{
		returnObj.role = context.getRole();
		userEmail = context.getEmail();
	}
	
	var contactId = GetContactFromDealerAndEmail(dealerId, userEmail) || '';
	if(contactId == '')
		throw nlobjError('MISSING_CONTACT', 'Contact Not Found');
	returnObj.contact = {name: nlapiLookupField('contact', contactId, 'entityid'), id: contactId} || '';
	returnObj.dealer = nlapiLookupField('customer', dealerId, 'companyname') || '';
	
	var groupMembers = GetDealerGroupMembers(dealerId);
	
	var existingRegistrationDict = getRegisteredUnits(contactId);
	var unitsArray = Object.keys(existingRegistrationDict);
	var spiffUnitsArray = getExistingSpiffUnits(contactId) || [];
	
	var unitDict = {};
	
	if(unitsArray.length > 0)
	{
		//Get all the available program units for this dealer and this logged-in user
		var filters = new Array();	//create filters
		filters.push(new nlobjSearchFilter('custrecordunit_dealer','custrecordprogramunit_unit','anyof', groupMembers));
		filters.push(new nlobjSearchFilter('custrecordprogram_status','custrecordprogramunit_program','anyof', [PROGRAMSTATUS_APPROVED]));
		filters.push(new nlobjSearchFilter('custrecordprogram_type','custrecordprogramunit_program','anyof', [PROGRAMTYPE_SALESPERSON]));
		filters.push(new nlobjSearchFilter('custrecordprogramunit_unit', null,'anyof', unitsArray)); 		//Only get program units for units that are registered to the logged in user
		if(spiffUnitsArray.length > 0)
			filters.push(new nlobjSearchFilter('custrecordprogramunit_unit', null,'noneof', spiffUnitsArray)); 	//Don't get program units if the unit has already been spiffed
		filters.push(new nlobjSearchFilter('custrecordunit_retailpurchaseddate', 'custrecordprogramunit_unit','isnotempty'));
		filters.push(new nlobjSearchFilter('custrecordnowarranty', 'custrecordprogramunit_unit', 'is', 'F'));
		filters.push(new nlobjSearchFilter('custrecordgd_totaledunit', 'custrecordprogramunit_unit', 'is', 'F'));
		
		var columns = new Array();		//create columns to return
		columns.push(new nlobjSearchColumn('internalid').setSort(true));
		columns.push(new nlobjSearchColumn('custrecordprogramunit_unit'));
		columns.push(new nlobjSearchColumn('custrecordprogramunit_program'));
		columns.push(new nlobjSearchColumn('custrecordprogram_startdate', 'custrecordprogramunit_program'));
		columns.push(new nlobjSearchColumn('custrecordprogram_enddate', 'custrecordprogramunit_program'));
		columns.push(new nlobjSearchColumn('custrecordunit_series', 'custrecordprogramunit_unit'));
		columns.push(new nlobjSearchColumn('custrecordunit_model', 'custrecordprogramunit_unit'));
		columns.push(new nlobjSearchColumn('custrecordunit_retailpurchaseddate', 'custrecordprogramunit_unit'));
		columns.push(new nlobjSearchColumn('custrecordunit_receiveddate', 'custrecordprogramunit_unit'));
		columns.push(new nlobjSearchColumn('custrecordprogramunit_incentiveamount'));
		
		var results = GetSteppedSearchResults('customrecordrvsprogramunit', filters, columns, null);
		if(results != null && results.length > 0)
		{
			returnObj.units = [];
			var unitObj = '';
			for(var i = 0; i < results.length; i++)
			{
				var startDate = results[i].getValue('custrecordprogram_startdate', 'custrecordprogramunit_program') || '';
				var endDate = results[i].getValue('custrecordprogram_enddate', 'custrecordprogramunit_program') || '';
				var retailSoldDate = results[i].getValue('custrecordunit_retailpurchaseddate', 'custrecordprogramunit_unit') || '';
				
				//Only display the unit in the list if the retail sold date is between the start & end date of the program
				if(startDate != '' && endDate != '' && retailSoldDate != '')
				{
					startDate = new Date(startDate);
					endDate = new Date(endDate);
					retailSoldDate = new Date(retailSoldDate);
					
					if(retailSoldDate.getTime() <= endDate.getTime() && retailSoldDate.getTime() >= startDate.getTime())
					{
						unitObj = {};
						unitObj.id = results[i].getId();
						unitObj.unitId = results[i].getValue('custrecordprogramunit_unit');
						unitObj.unit = results[i].getText('custrecordprogramunit_unit');
						unitObj.program = results[i].getText('custrecordprogramunit_program');
						unitObj.programId = results[i].getValue('custrecordprogramunit_program');
						unitObj.series = results[i].getText('custrecordunit_series', 'custrecordprogramunit_unit');
						unitObj.model = results[i].getText('custrecordunit_model', 'custrecordprogramunit_unit');
						unitObj.retailSoldDate = results[i].getValue('custrecordunit_retailpurchaseddate', 'custrecordprogramunit_unit') || '';
						unitObj.registrationDate = results[i].getValue('custrecordunit_receiveddate', 'custrecordprogramunit_unit');
						unitObj.amount = ConvertNSFieldToFloat(results[i].getValue('custrecordprogramunit_incentiveamount'));
						unitObj.salesRepLevel = '1';
						//Check to see if this is the secondary rep on a registration. This property will be added as a URL paramter that our RVS Spiff script will get
						if(existingRegistrationDict[unitObj.unitId]['salesRep2'] == contactId)
							unitObj.salesRepLevel = '2';
						
						//First check if the unit registration is split, and if so, halve the spiff amount. 
						if(registrationIsSplit(unitObj.unitId))
							unitObj.amount = ConvertNSFieldToFloat(unitObj.amount/2).toFixed(2);
						else
							unitObj.amount = ConvertNSFieldToFloat(unitObj.amount).toFixed(2);
						
						//Add this unit to our dictionary if that index is currently empty, or if it has a higher spiff amount
						if(unitDict[unitObj.unitId] == null || unitObj.amount > ConvertNSFieldToFloat(unitDict[unitObj.unitId].amount))
						{
							unitDict[unitObj.unitId] = unitObj;
						}
					}
				}
			}
		}
	}

	for(key in unitDict)
	{
		var obj = unitDict[key];
		returnObj.units.push(obj);
	}
	
	var acct = context.getCompany();
	var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	
	returnObj.recTypeId = SPIFF_RECORD_TYPE;
	returnObj.urlString = domain + '/app/common/custom/custrecordentry.nl?compid=' + acct + '&rectype=' + returnObj.recTypeId;
	returnObj.spiffFAQ = domain + '/core/media/media.nl?id=5461402&c='+acct+'&h=19bd0212bef47dc3b83c&_xt=.pdf';
	
	var datafield = form.addField('custpage_spiffcreatedata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #333; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALCREATESPIFF);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GDWebsiteSpiffViewSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);		
	
	var HTMLfield = form.addField('custpage_spiffviewhtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var dealerId = nlapiGetUser();
	var userEmail = '';
	
	var context = nlapiGetContext();
	if(context != null)
	{
		returnObj.role = context.getRole();
		userEmail = context.getEmail();
	}
	
	var groupMembers = GetDealerGroupMembers(dealerId); 
	
	var contactId = GetContactFromDealerAndEmail(dealerId, userEmail) || '';
	if(contactId == '')
		throw nlobjError('MISSING_CONTACT', 'Contact Not Found');
	returnObj.contact = {name: nlapiLookupField('contact', contactId, 'entityid'), id: contactId} || '';
	returnObj.dealer = nlapiLookupField('customer', dealerId, 'companyname') || '';


	var filters = new Array();	//create filters
	filters.push(new nlobjSearchFilter('custrecordunit_dealer','custrecordspiff_unit','anyof', groupMembers)); //Filter: "Dealer is mine"
	filters.push(new nlobjSearchFilter('custrecordspiff_dealersalesperson', null,'anyof', '', contactId));
	filters.push(new nlobjSearchFilter('custrecordspiff_programtype', null,'anyof', [PROGRAMTYPE_SALESPERSON]));
	

	var columns = new Array();		//create columns to return
	columns.push(new nlobjSearchColumn('internalid').setSort(true));
	columns.push(new nlobjSearchColumn('custrecordspiff_unit'));
	columns.push(new nlobjSearchColumn('custrecordspiff_datesent'));
	columns.push(new nlobjSearchColumn('custrecordspiff_program'));
	columns.push(new nlobjSearchColumn('custrecordspiff_status'));
	columns.push(new nlobjSearchColumn('custrecordunit_series', 'custrecordspiff_unit'));
	columns.push(new nlobjSearchColumn('custrecordunit_model', 'custrecordspiff_unit'));
	columns.push(new nlobjSearchColumn('custrecordunit_retailpurchaseddate', 'custrecordspiff_unit'));
	columns.push(new nlobjSearchColumn('custrecordunit_receiveddate', 'custrecordspiff_unit'));
	columns.push(new nlobjSearchColumn('custrecordspiff_amount'));
	
	var spiffDict = {};
	var spiffArray = [];
	
	var results = GetSteppedSearchResults('customrecordrvsspiff', filters, columns, null);
	if(results != null && results.length > 0)
	{
		returnObj.spiffs = [];
		var spiffObj = '';
		for(var i = 0; i < results.length; i++)
		{
			spiffObj = {};
			spiffObj.id = results[i].getId();
			spiffObj.date = results[i].getValue('custrecordspiff_datesent');
			spiffObj.unitId = results[i].getValue('custrecordspiff_unit');
			spiffObj.unit = results[i].getText('custrecordspiff_unit');
			spiffObj.status = {"id":results[i].getValue('custrecordspiff_status'), "name": results[i].getText('custrecordspiff_status')};
			spiffObj.program = results[i].getText('custrecordspiff_program');
			spiffObj.programId = results[i].getValue('custrecordspiff_program');
			spiffObj.series = results[i].getText('custrecordunit_series', 'custrecordspiff_unit');
			spiffObj.model = results[i].getText('custrecordunit_model', 'custrecordspiff_unit');
			spiffObj.retailSoldDate = results[i].getValue('custrecordunit_retailpurchaseddate', 'custrecordspiff_unit') || '';
			spiffObj.registrationDate = results[i].getValue('custrecordunit_receiveddate', 'custrecordspiff_unit');
			spiffObj.amount = results[i].getValue('custrecordspiff_amount');
			spiffObj.checkNo = '';
			spiffObj.billId = '';
			
			spiffDict[spiffObj.id] = spiffObj;
			spiffArray.push(spiffObj.id);
		}
	
		try {
			var billArray = [];
			var billFilters = [];
	
			billFilters.push(new nlobjSearchFilter('custbodyrvscreatedfromspiff', null, 'anyof', spiffArray));
			billFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
	
			var billColumns = [];
			billColumns.push(new nlobjSearchColumn('custbodyrvscreatedfromspiff'));
			billColumns.push(new nlobjSearchColumn('tranid', 'applyingtransaction'));
	
			var billResults = GetSteppedSearchResults('vendorbill', billFilters, billColumns, null);
	
			if(billResults != null && billResults.length > 0)
			{
				for(var b = 0; b < billResults.length; b++)
				{
					var spiffId = billResults[b].getValue('custbodyrvscreatedfromspiff');
					var billId = billResults[b].getId();
					if(spiffDict[spiffId] != null)
					{
						//Store the bill id on the spiff object in our spiff dictionary
						spiffDict[spiffId]['billId'] = billId;
						spiffDict[spiffId]['checkNo'] = billResults[b].getValue('tranid', 'applyingtransaction');
					}
					billArray.push(billId);
				}
			}
		}
		catch(err) {
			nlapiLogExecution('error', 'Error Loading Spiffs', 'err: ' + JSON.stringify(err));
		}
	}
	
	for(key in spiffDict)
	{
		returnObj.spiffs.push(spiffDict[key]);
	}
	
	var acct = context.getCompany();
	var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	
	returnObj.recTypeId = SPIFF_RECORD_TYPE;
	returnObj.urlString = domain + '/app/common/custom/custrecordentry.nl?compid=' + acct + '&rectype=' + returnObj.recTypeId;
	
	var datafield = form.addField('custpage_spiffviewdata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #333; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTALVIEWSPIFF);
	HTMLfield.setDefaultValue(html);

	response.writePage(form);
}

function getRegisteredUnits(contact)
{
	var unitReturnObj = {};
	
	var unitFilters = [];
	unitFilters.push(['custrecordunitretailcustomer_dealsalesrp', 'anyof', contact]);
	unitFilters.push('OR');
	unitFilters.push(['custrecordunitretailcustomer_dsalesrp2', 'anyof', contact]);

	var unitColumns = [];
	unitColumns.push(new nlobjSearchColumn('custrecordunitretailcustomer_unit'));
	unitColumns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
	unitColumns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dsalesrp2'));
	
	var unitResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, unitFilters, unitColumns);
	if(unitResults != null && unitResults.length > 0)
	{
		for(var u = 0; u < unitResults.length; u++)
		{
			var unitId = unitResults[u].getValue('custrecordunitretailcustomer_unit');
			var unitObj = {};
			unitObj.salesRep1 = unitResults[u].getValue('custrecordunitretailcustomer_dealsalesrp');
			unitObj.salesRep2 = unitResults[u].getValue('custrecordunitretailcustomer_dsalesrp2');
			unitReturnObj[unitId] = unitObj;
		}
	}
	return unitReturnObj;
}

function getExistingSpiffUnits(contact)
{
	var returnArray = [];
	var spiffResults = nlapiSearchRecord('customrecordrvsspiff', null, new nlobjSearchFilter('custrecordspiff_dealersalesperson', null, 'anyof', contact), new nlobjSearchColumn('custrecordspiff_unit'));
	if(spiffResults != null && spiffResults.length > 0)
	{
		for(var s = 0; s < spiffResults.length; s++)
		{
			returnArray.push(spiffResults[s].getValue('custrecordspiff_unit'));
		}
	}
	return returnArray;
}

function registrationIsSplit(unit)
{
	var isSplit = false;
	
	//If this unit's registration has a secondary rep, then the amount will be split
	var unitFilters = [];
	unitFilters.push(nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', unit));
	unitFilters.push(nlobjSearchFilter('custrecordunitretailcustomer_dsalesrp2', null, 'noneof', ['@NONE@']));

	var unitResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, unitFilters, null);
	if(unitResults != null && unitResults.length > 0)
	{
		isSplit = true;
	}
	return isSplit;
}
