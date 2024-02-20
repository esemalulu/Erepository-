/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Nov 2016     brians
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
function SearchRecallsSuitelet(request, response)
{
	if (request.getMethod() == 'GET') 
	{
		var theVin = request.getParameter('custparam_vin');
		var theDealerId = request.getParameter('custparam_dealerid');
		
		if(theVin == null || theVin == '')	//User has not entered a VIN, so display the normal Unit List and the Recalls by VIN # search box
		{
			var SUBLIST_TAB_RECALL_VIN = 'custpage_recallbyvin';
			
			var form = nlapiCreateForm('Unit Recall/Notice Search', false);		
			form.addTab(SUBLIST_TAB_RECALL_VIN, 'Search Recalls/Notices By VIN');
			AddSearchByVINField(form, SUBLIST_TAB_RECALL_VIN);
			
			response.writePage(form);
		}
		else 		//User has entered a VIN, so check to see if they can register it.
		{
			var message = '';
			
			var results = GetRecallsByVINSearchResults(theVin, null);
			
			var form = nlapiCreateForm('Unit Recall/Notice Results for Vin #' + theVin, false);
			
			if(results != null && results.length > 0)
			{
				var SUBLIST_FIELD_RECALL = 'custpage_subrecall';
				var SUBLIST_FIELD_TYPE = 'custpage_subtype';
				var SUBLIST_FIELD_RECALLCODE = 'custpage_subrecallcode';
				var SUBLIST_FIELD_RECALLCODEATTACH = 'custpage_subrecallcodeattach';
				var SUBLIST_FIELD_VIN = 'custpage_subvin';
				var SUBLIST_FIELD_DATE = 'custpage_subdate';
				var SUBLIST_FIELD_CLAIM = 'custpage_subclaim';
				var SUBLIST_FIELD_STATUS = 'custpage_substatus';
				var SUBLIST_TAB_RESULTS = 'custpage_tabrecallbyunits';

				form.addTab(SUBLIST_TAB_RESULTS, 'Search Results');
				var sublist = form.addSubList('custpage_sublistrecalls', 'list', 'Recalls and Notices', SUBLIST_TAB_RESULTS);
				
				var field = sublist.addField(SUBLIST_FIELD_RECALL, 'text', 'Recall/Notice #');
				field.setDisplayType('inline');
				var field = sublist.addField(SUBLIST_FIELD_TYPE, 'text', 'Type');
				field.setDisplayType('inline');
				var field = sublist.addField(SUBLIST_FIELD_RECALLCODE, 'text', 'Code');
				field.setDisplayType('inline');
				var field = sublist.addField(SUBLIST_FIELD_RECALLCODEATTACH, 'textarea', 'Attachments');
				field.setDisplayType('inline');
				var field = sublist.addField(SUBLIST_FIELD_VIN, 'text', 'VIN');
				field.setDisplayType('inline');
				var field = sublist.addField(SUBLIST_FIELD_DATE, 'text', 'Date');
				field.setDisplayType('inline');
				var field = sublist.addField(SUBLIST_FIELD_CLAIM, 'text', 'Claim');
				field.setDisplayType('inline');
				var field = sublist.addField(SUBLIST_FIELD_STATUS, 'text', 'Status');
				field.setDisplayType('inline');
				
				for(var i = 0; i < results.length; i++)
				{
					var lineIndex = i + 1;
					var lineStatus = results[i].getValue('custrecordrecallunit_status');
					var flatRateCodeId = results[i].getValue('custrecordrecallunit_recallcode');
					var flatRateCodeText = results[i].getText('custrecordrecallunit_recallcode');
					var typeText = results[i].getText('custrecordgd_flatratecode_type','custrecordrecallunit_recallcode') || 'Recall';

					sublist.setLineItemValue(SUBLIST_FIELD_RECALL, lineIndex, results[i].getValue('name'));
					sublist.setLineItemValue(SUBLIST_FIELD_RECALLCODE, lineIndex, flatRateCodeText);
					sublist.setLineItemValue(SUBLIST_FIELD_RECALLCODEATTACH, lineIndex, buildFlatRateCodeLinks(flatRateCodeId));
					sublist.setLineItemValue(SUBLIST_FIELD_CLAIM, lineIndex, results[i].getText('custrecordrecallunit_claim'));
					sublist.setLineItemValue(SUBLIST_FIELD_VIN, lineIndex, results[i].getText('custrecordrecallunit_unit'));
					sublist.setLineItemValue(SUBLIST_FIELD_DATE, lineIndex, results[i].getValue('custrecordrecallunit_date'));
					sublist.setLineItemValue(SUBLIST_FIELD_CLAIM, lineIndex, results[i].getText('custrecordrecallunit_claim'));
					//Display the status of Open recalls in red
					if(lineStatus == 'Open' && typeText == 'Recall'){
						sublist.setLineItemValue(SUBLIST_FIELD_TYPE, lineIndex, '<div style="width: 100%; color: white; background-color: red; padding: 3px; font-weight: 600;">' + typeText + '</div>');
						sublist.setLineItemValue(SUBLIST_FIELD_STATUS, lineIndex, '<div style="width: 100%; color: white; background-color: red; padding: 3px; font-weight: 600;">' + lineStatus + '</div>');

					}
					else {
						sublist.setLineItemValue(SUBLIST_FIELD_TYPE, lineIndex, typeText);
						sublist.setLineItemValue(SUBLIST_FIELD_STATUS, lineIndex, lineStatus);
					}
				}
			}
			else
			{
				message = "No open recalls or notices were found for VIN # <span style='color: #666666;'>" + theVin + "</span><br/><br/>";
			}
			
			var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptgd_searchrecalls_suitelet', 'customdeploygd_searchrecalls_suitelet', null);
			
			form.addField('custpage_html','inlinehtml').setDefaultValue('<div style="padding-left: 20px; padding-top: 100px;"><p style="font-size:16px; font-weight: bold">' + message + 
					'<a style="font-size:14px;" href="' + suiteletURL + '"><b>Click here to search again with a different VIN</b></a></div>');
			
			response.writePage(form);
		}
	}
}

/**
 * Adds Register VIN field and link on the form.
 * @param form
 */
function AddSearchByVINField(form, tab)
{
	var script = 
		'<script>' +
			'function NavigateToRecallSearch()' + 
			'{' +
				GetRecallsForVINScript() +
			'}'+
		'</script>';
							
	script += '<div style="font-size:12px;">&nbsp;&nbsp;Enter Complete VIN # To Search for Recalls and Notices&nbsp;&nbsp;' +
				 '<input type="text" name="specificvin" id="specificvin" size="30" />&nbsp;&nbsp;' +
				'<a href="javascript:{}" onclick="NavigateToRecallSearch();"><b>Search Recalls and Notices by VIN</b></a><br /><br />' +
			  '</div>';			
	
	var registField = form.addField('custpage_registervin', 'inlinehtml', 'Register', null, tab);
	registField.setDefaultValue(script);
}

/**
 * Returns string that will perform navigation to the unit registration page and do all the validation
 * @returns {String}
 */
function GetRecallsForVINScript()
{
	return  "var txtVin = document.getElementById('specificvin'); var vin = txtVin.value; var dealerId = nlapiGetContext().getUser();" +
			"if(vin == null || vin == '')" +
			"{" +
				'window.ischanged = false;' + // mark that window hasn't changed so we don't get any dialog popups asking us if we want to continue
				"alert('Please enter vin # to search');" +
			"}" +
			"else" +
			"{" +
				//This suitelet runs the recall search by vin
				"var url = nlapiResolveURL('SUITELET', 'customscriptgd_searchrecalls_suitelet', 'customdeploygd_searchrecalls_suitelet', null) + '&custparam_vin=' + vin + '&custparam_dealerid=' + dealerId;" +
				"window.location.href = url;" +	
			"}";
}

/*
 * Returns the results of a search on Recalls for the given VIN
 * Passes in the logged-in dealerId for now, but may not use.
 * @param vin
 * @param dealerId
 */
function GetRecallsByVINSearchResults(vin, dealerId)
{
	if(vin != null && vin != '')
	{
		var unitIdResults = nlapiSearchRecord('customrecordrvsunit', null, new nlobjSearchFilter('name', null, 'is', vin), null);
		
		//There should only be one unit with any given VIN
		if(unitIdResults != null && unitIdResults.length == 1){
			var unitId = unitIdResults[0].getId();
			
			var filters = [];
			filters.push(new nlobjSearchFilter('custrecordrecallunit_unit', null, 'anyof', unitId));
			filters.push(new nlobjSearchFilter('custrecordrecallunit_status', null, 'is', 'Open'));
			
			var columns = new Array();
			columns.push(new nlobjSearchColumn('name'));
			columns.push(new nlobjSearchColumn('custrecordrecallunit_unit'));
			columns.push(new nlobjSearchColumn('custrecordrecallunit_recallcode'));
			columns.push(new nlobjSearchColumn('custrecordgd_flatratecode_type','custrecordrecallunit_recallcode'));
			columns.push(new nlobjSearchColumn('custrecordrecallunit_date'));
			columns.push(new nlobjSearchColumn('custrecordrecallunit_claim'));
			columns.push(new nlobjSearchColumn('custrecordrecallunit_status'));
			columns[columns.length-1].setSort(true);
			
			return nlapiSearchRecord('customrecordrvs_recallunit', null, filters, columns);
		}
	}
}

/*
 * Adds links to file attachments on the Flat Rate Code record, if any.
 */
function buildFlatRateCodeLinks(flatRateCodeId) {
	if (flatRateCodeId != null && flatRateCodeId != '') {
		var links = 'No Attachments';
		
		var filters = [];
		filters.push(new nlobjSearchFilter('internalid', null, 'is', flatRateCodeId));

		var cols = [];
		cols.push(new nlobjSearchColumn('url', 'file'));
		cols.push(new nlobjSearchColumn('name', 'file'));
		

		var results = nlapiSearchRecord('customrecordrvsflatratecodes', null, filters, cols);

		if(results != null && results.length > 0) {
			links = '';
			for(var i = 0; i < results.length; i++) {
				links += '<a href="' + results[i].getValue('url', 'file') + '" target="_blank">' + results[i].getValue('name', 'file') + '</a></br>';
			}
		}
		return links;
	}
}
