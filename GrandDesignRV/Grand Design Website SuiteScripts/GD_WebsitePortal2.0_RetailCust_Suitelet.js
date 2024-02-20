/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       6 Jul 2017     brians
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GDWebsiteRetailCustSuitelet(request, response){
	
	var form = nlapiCreateForm('', true);	
	
	var dealerId = nlapiGetUser();
	var dealerGroupMembers = GetDealerGroupMembers(dealerId);
	
	var HTMLfield = form.addField('custpage_retailcusthtml', 'inlinehtml', '');
	HTMLfield.setDisplayType('inline');
	
	var returnObj = {};
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordunitretailcustomer_dealer',null,'anyof', dealerGroupMembers)); //dealer is any of the dealers in the dealer group of the logged in user
	var columns = new Array();
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_firstname'));
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_middlename'));
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_lastname').setSort());
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_city'));
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_state'));
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_country'));
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_retailsold'));
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_registrcvd'));
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp'));
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_currentcust'));
	columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_unit'));
	
	var results = GetSteppedSearchResults('customrecordrvsunitretailcustomer', filters, columns, null);
	if(results != null && results.length > 0)
	{
		returnObj.retailCustomers = [];
		var obj = '';
		for(var i = 0; i < results.length; i++)
		{
			obj = {};
			obj.id = results[i].getId();
			obj.firstName = results[i].getValue('custrecordunitretailcustomer_firstname');
			obj.middleName = results[i].getValue('custrecordunitretailcustomer_middlename');
			obj.lastName = results[i].getValue('custrecordunitretailcustomer_lastname');
			obj.city = results[i].getValue('custrecordunitretailcustomer_city');
			obj.state = results[i].getText('custrecordunitretailcustomer_state');
			obj.country = results[i].getText('custrecordunitretailcustomer_country');
			obj.retailSold = results[i].getValue('custrecordunitretailcustomer_retailsold');
			obj.regRec = results[i].getValue('custrecordunitretailcustomer_registrcvd');
			obj.salesRep = results[i].getText('custrecordunitretailcustomer_dealsalesrp');
			obj.curCust = results[i].getValue('custrecordunitretailcustomer_currentcust');
			if(obj.curCust == 'T')
				obj.curCust = 'Yes';
			else
				obj.curCust = 'No';
			obj.unit = results[i].getText('custrecordunitretailcustomer_unit');
			returnObj.retailCustomers.push(obj);
		}
	}
	
	var context = nlapiGetContext();
	var acct = context.getCompany();
	var domain = context.getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
	
	returnObj.role = context.getRole();
	returnObj.recTypeId = GD_RETAILCUST_RECORDTYPE;
	returnObj.urlString = domain + '/app/common/custom/custrecordentry.nl?' + acct + '&rectype=' + returnObj.recTypeId;

	var datafield = form.addField('custpage_retailcustdata', 'inlinehtml', '');
	datafield.setDisplayType('inline');
	datafield.setDefaultValue('<div style="color: #333; display:none;">' + JSON.stringify(returnObj) + '</div>');
	datafield.setLayoutType('outsidebelow', 'startrow');
	
	var html = '';
	html = buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_RVSCOMMON) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_JQUERY) +
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_KNOCKOUT) + 
			   buildHTMLFileLinks(RVS_BUNDLE_FILES_MODULE_PORTAL) + 
			   buildHTMLFileLinks(GD_BUNDLE_FILES_MODULE_PORTALRETAILCUST);
	HTMLfield.setDefaultValue(html);
	
	response.writePage(form);
}