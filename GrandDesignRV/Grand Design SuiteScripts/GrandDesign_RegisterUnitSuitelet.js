/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Jan 2014     ibrahima
 *
 */


/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
/**
 * Get a list of units that dealer can register.
 * @param request
 * @param response
 */
function RegisterUnitSuitelet(request, response)
{
	if (request.getMethod() == 'GET') 
	{
		var theVin = request.getParameter('custparam_vin');
		var theDealerId = request.getParameter('custparam_dealerid');
		
		if(theVin == null || theVin == '')	//User has not entered a VIN, so display the normal Unit List and the Register by VIN # search box
		{
			var SUBLIST_FIELD_REGISTER_UNIT = 'custpage_subregunit';
			var SUBLIST_FIELD_VIN = 'custpage_subvin';
			var SUBLIST_FIELD_SERIAL_NUMBER = 'custpage_subserialnumber';
			var SUBLIST_FIELD_SERIES = 'custpage_subseries';
			var SUBLIST_FIELD_MODEL = 'custpage_submodel';
			var SUBLIST_FIELD_DECOR = 'custpage_subdecor';
			var SUBLIST_FIELD_RETAIL_CUSTOMER = 'custpage_subretailcust';
			var SUBLIST_FIELD_RETAIL_SOLD_DATE = 'custpage_subretailsolddate';
			var SUBLIST_TAB_UNITS = 'custpage_tabunits';
			var SUBLIST_TAB_REGISTER_VIN = 'custpage_regspecificvin';
			var SUBLIST_FIELD_DEALER = 'custpage_dealer';
			
			// first build the form
			var form = nlapiCreateForm('Register Unit List', false);		
			form.addTab(SUBLIST_TAB_REGISTER_VIN, 'Register By VIN');
			AddRegisterSpecificVINField(form, SUBLIST_TAB_REGISTER_VIN);
			
			form.addTab(SUBLIST_TAB_UNITS, 'Register By Unit');	
			var sublist = form.addSubList('custpage_sublistunits', 'list', 'Unit List', SUBLIST_TAB_UNITS);
			
			var field = sublist.addField(SUBLIST_FIELD_REGISTER_UNIT, 'text', '');
			field.setDisplayType('inline');
			
			field = sublist.addField(SUBLIST_FIELD_VIN, 'text', 'VIN');
			field.setDisplayType('inline');
			
			field = sublist.addField(SUBLIST_FIELD_SERIES, 'text', 'Series');
			field.setDisplayType('inline');
			
			field = sublist.addField(SUBLIST_FIELD_MODEL, 'text', 'Model');
			field.setDisplayType('inline');
			
			field = sublist.addField(SUBLIST_FIELD_DECOR, 'text', 'Decor');
			field.setDisplayType('inline');
			
			field = sublist.addField(SUBLIST_FIELD_RETAIL_CUSTOMER, 'text', 'Retail Customer');
			field.setDisplayType('inline');
			
			field = sublist.addField(SUBLIST_FIELD_RETAIL_SOLD_DATE, 'text', 'Retail Sold Date');
			field.setDisplayType('inline');
			
			field = sublist.addField(SUBLIST_FIELD_DEALER, 'text', 'Dealer');
			field.setDisplayType('inline');
			
			var dealerId = nlapiGetContext().getUser();
			var groupMembers = GetDealerGroupMembers(dealerId);
			
			if(groupMembers != null && groupMembers.length > 0)
			{
				var filters = new Array();
				filters.push(new nlobjSearchFilter('custrecordunit_dealer', null, 'anyof', groupMembers));
				var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchgd_dealerregisterunitlist', filters, null);
				
				if(results != null && results.length > 0)
				{
					for(var i = 0; i < results.length; i++)
					{
						var lineIndex = i + 1;
						var url = nlapiResolveURL('RECORD', 'customrecordrvsunitretailcustomer', null, null) + '&unitId=' + results[i].getId();
						sublist.setLineItemValue(SUBLIST_FIELD_REGISTER_UNIT, lineIndex, '<a href="'+ url + '">Register Unit</a>');	
						sublist.setLineItemValue(SUBLIST_FIELD_VIN, lineIndex, results[i].getValue('name'));
						sublist.setLineItemValue(SUBLIST_FIELD_SERIAL_NUMBER, lineIndex, results[i].getValue('custrecordunit_serialnumber'));
						sublist.setLineItemValue(SUBLIST_FIELD_SERIES, lineIndex, results[i].getText('custrecordunit_series'));
						sublist.setLineItemValue(SUBLIST_FIELD_MODEL, lineIndex, results[i].getText('custrecordunit_model'));
						sublist.setLineItemValue(SUBLIST_FIELD_DECOR, lineIndex, results[i].getText('custrecordunit_decor'));
						sublist.setLineItemValue(SUBLIST_FIELD_RETAIL_CUSTOMER, lineIndex, results[i].getValue('custrecordunitretailcustomer_name', 'custrecordunitretailcustomer_unit'));
						sublist.setLineItemValue(SUBLIST_FIELD_RETAIL_SOLD_DATE, lineIndex, results[i].getValue('custrecordunitretailcustomer_retailsold', 'custrecordunitretailcustomer_unit'));
						sublist.setLineItemValue(SUBLIST_FIELD_DEALER, lineIndex, results[i].getText('custrecordunit_dealer'));
					}
				}
			}
			
			response.writePage(form);
		}
		else 		//User has entered a VIN, so check to see if they can register it.
		{
			var message = '';
			
			var results = GetVinToRegisterSearchResults(theVin, theDealerId);
			
			//If validation is successful, there should only be one result. Navigate to a new Unit Retail Customer record, and pass in the UnitId
			if(results != null && results.length == 1)
			{
				var urlParams = [];
				urlParams['unitId'] = results[0].getId();
				nlapiSetRedirectURL('RECORD', 'customrecordrvsunitretailcustomer', null, true, urlParams);
			}
			else if(results != null && results.length > 1)
			{
				message = 'More than one unit was found for the specified VIN #.';
			}
			else
			{
				message = "VIN # <span style='color: #666666;'>" + theVin + "</span> could not be registered.<br/><br/>" + 
					"In order to be registered, a VIN must meet the following criteria: <br/><br/>" + 
					"<ol style='font-size:14px; line-height: 175%;'>" +
					"<li>Unit belongs to your dealer or to a dealer within your dealer group.</li>" +
					"<li>Unit is shipped</li>" +
					"<li>Unit has no Warranty Registration Received Date</li>" +
					"<li>Unit is not inactive</li>" +
					"<li>Unit has no Retail Customer or it has a current Retail Customer</li>" +
					"</ol>";
			}
			
			//Create a form that can display the message.
			//If the VIN was validated, the user will not see this page, since they'll be redirected to the Unit Retail Customer record.
			var form = nlapiCreateForm('Register by VIN', false);
			
			var domain = nlapiGetContext().getSetting('SCRIPT', 'custscriptwebsitemyaccountdomainurl');
			var suiteletURL = domain + nlapiResolveURL('SUITELET', 'customscriptgdregisterunitsuitelet', 'customdeploygdregisterunitsuiteletdeploy', null);
			
			form.addField('custpage_html','inlinehtml').setDefaultValue('<div style="padding-left: 20px;"><p style="font-size:16px; font-weight: bold"><br />' + message + '<br /><br />' +
					'<a style="font-size:14px;" href="' + suiteletURL + '"><b>Click here to try again with a different VIN</b></a></div>');
			
			response.writePage(form);
		}
	}
}

/**
 * Adds Register VIN field and link on the form.
 * @param form
 */
function AddRegisterSpecificVINField(form, tab)
{
	var script = 
		'<script>' +
			'function NavigateToUnitRegistration()' + 
			'{' +
				GetRegisterSpecificVINScript() +
			'}'+
		'</script>' +
		'<style>' +
			'#custpage_tabunits_wrapper {margin-bottom: 200px;}' +
		'</style>';
							
	script += '<div style="font-size:12px;">&nbsp;&nbsp;Enter Complete VIN # To Register&nbsp;&nbsp;' +
				 '<input type="text" name="specificvin" id="specificvin" size="30" />&nbsp;&nbsp;' +
				'<a href="javascript:{}" onclick="NavigateToUnitRegistration();"><b>Register VIN</b></a><br /><br />' +
			  '</div>';			
	
	var registField = form.addField('custpage_registervin', 'inlinehtml', 'Register', null, tab);
	registField.setDefaultValue(script);
}

/**
 * Returns string that will perform navigation to the unit registration page and do all the validation
 * @returns {String}
 */
function GetRegisterSpecificVINScript()
{
	return  "var txtVin = document.getElementById('specificvin'); var vin = txtVin.value; var dealerId = nlapiGetContext().getUser();" +
			"if(vin == null || vin == '')" +
			"{" +
				'window.ischanged = false;' + // mark that window hasn't changed so we don't get any dialog popups asking us if we want to continue
				"alert('Please enter vin # to be registered');" +
			"}" +
			"else" +
			"{" +
				//This suitelet determines if the given VIN is actually available to be registered by the current dealerId
				"var url = nlapiResolveURL('SUITELET', 'customscriptgdregisterunitsuitelet', 'customdeploygdregisterunitsuiteletdeploy', null) + '&custparam_vin=' + vin + '&custparam_dealerid=' + dealerId;" +
				"window.location.href = url;" +	
			"}";
}

