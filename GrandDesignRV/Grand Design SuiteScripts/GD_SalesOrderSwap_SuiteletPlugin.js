/**
 * Default implementation of the Sales Order Swap suitelet.
 *
 * Version    Date            Author           Remarks
 * 1.00       19 Dec 2016     Jacob Shetler
 *
 */
var soStatusDict = {
				'A': 'Pending Approval',
				'B': 'Pending Fulfillment',
				'C': 'Cancelled',
				'D': 'Partially Fulfilled',
				'E': 'Pending Billing/Partially Fulfilled',
				'F': 'Pending Billing',
				'G': 'Billed',
				'H': 'Closed'
			};

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function createSuitelet(request, response){
	if (request.getMethod() == 'GET') {
		var swapForm = nlapiCreateForm('Sales Order Swap - Select Filters');
		swapForm.addField('custpage_swaptype', 'text', 'type - hidden').setDisplayType('hidden').setDefaultValue('search');
		//Create filters for sales orders/units
		swapForm.addFieldGroup('custpage_filterfg', 'Select Sales Order Filters');
		//location and series
		swapForm.addField('custpage_loc', 'multiselect', 'Location', 'location', 'custpage_filterfg');
		var seriesObj = swapForm.addField('custpage_series', 'multiselect', 'Series', null, 'custpage_filterfg');
		var seriesResults = nlapiSearchRecord('customrecordrvsseries', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('name'));
		if(seriesResults != null)
		{
			for (var i = 0; i < seriesResults.length; i++)
			{
				seriesObj.addSelectOption(seriesResults[i].getId(), seriesResults[i].getValue('name'), false);
			}
		}
		//Models
		var modelFieldObj = swapForm.addField('custpage_model', 'multiselect', 'Model', null, 'custpage_filterfg');
		var modelResults = nlapiSearchRecord('item', null, [new nlobjSearchFilter('custitemrvsitemtype', null, 'is', GetItemCategoryModelId()),new nlobjSearchFilter('isinactive', null, 'is', 'F')], new nlobjSearchColumn('itemid'));
		if(modelResults != null)
		{
			for (var i = 0; i < modelResults.length; i++)
			{
				modelFieldObj.addSelectOption(modelResults[i].getId(), modelResults[i].getValue('itemid'), false);
			}
		}
		//Decors
		var decorField = swapForm.addField('custpage_decor', 'multiselect', 'Decor', null, 'custpage_filterfg');
		var decorResults = nlapiSearchRecord('item', null, [new nlobjSearchFilter('custitemrvsitemtype', null, 'is', GetItemCategoryDecorId()),new nlobjSearchFilter('isinactive', null, 'is', 'F')], new nlobjSearchColumn('itemid'));
		if(decorResults != null)
		{
			for (var i = 0; i < decorResults.length; i++)
			{
				decorField.addSelectOption(decorResults[i].getId(), decorResults[i].getValue('itemid'), false);
			}
		}
		//Options
		var optionField = swapForm.addField('custpage_options', 'multiselect', 'Options', null, 'custpage_filterfg');
		var optionResults = nlapiSearchRecord('item', null, [new nlobjSearchFilter('custitemrvsitemtype', null, 'is', GetItemCategoryOptionId()),new nlobjSearchFilter('isinactive', null, 'is', 'F')], [new nlobjSearchColumn('itemid'), new nlobjSearchColumn('displayname')]);
		if(optionResults != null)
		{
			for (var i = 0; i < optionResults.length; i++)
			{
				optionField.addSelectOption(optionResults[i].getId(), optionResults[i].getValue('itemid') + ' ' + optionResults[i].getValue('displayname'), false);
			}
		}
		//Order Status
		var ordStatusFld = swapForm.addField('custpage_ordstatus', 'multiselect', 'Order Status', null, 'custpage_filterfg');
		for(var key in soStatusDict) {
			ordStatusFld.addSelectOption(key, soStatusDict[key]);
		}

		//Unit filters
		swapForm.addFieldGroup('custpage_unitfg', 'Select Unit Filters').setSingleColumn(true);
		prodStatFld = swapForm.addField('custpage_prodstatus', 'multiselect', 'Production Status', null, 'custpage_unitfg');
		var prodstatResults = nlapiSearchRecord('customlistrvsunitstatus', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('name'));
		if(prodstatResults != null)
		{
			for (var i = 0; i < prodstatResults.length; i++)
			{
				prodStatFld.addSelectOption(prodstatResults[i].getId(), prodstatResults[i].getValue('name'), false);
			}
		}
    //Online & Offline dates
    onlineDateFld = swapForm.addField('custpage_onlinedate', 'date', 'Online Date', null, 'custpage_unitfg');
    offlineDateFld = swapForm.addField('custpage_offlinedate', 'date', 'Offline Date', null, 'custpage_unitfg');
		//Radios
		swapForm.addField('custpage_vincalclbl', 'label', 'VIN Has Been Calculated?', null, 'custpage_unitfg');
		swapForm.addField('vintype', 'radio', 'Either', 'either', 'custpage_unitfg');
		swapForm.addField('vintype', 'radio', 'Yes', 'yes', 'custpage_unitfg');
		swapForm.addField('vintype', 'radio', 'No', 'no', 'custpage_unitfg');
		swapForm.getField('vintype', 'either').setDefaultValue('either');
		swapForm.addField('custpage_hasbackloglbl', 'label', 'Unit Has Backlog?', null, 'custpage_unitfg');
		swapForm.addField('backlogtype', 'radio', 'Either', 'either', 'custpage_unitfg');
		swapForm.addField('backlogtype', 'radio', 'Yes', 'yes', 'custpage_unitfg');
		swapForm.addField('backlogtype', 'radio', 'No', 'no', 'custpage_unitfg');
		swapForm.getField('backlogtype', 'either').setDefaultValue('either');

		// VIN file field
		swapForm.addField('custpage_vin_file', 'file', 'VIN file');

		//Create submit button
		swapForm.addSubmitButton('Search');
		response.writePage(swapForm);
	}
	else { //POST
		if (request.getParameter('custpage_swaptype') == 'search') {
			//Create the select sales orders form.
			var swapForm = nlapiCreateForm('Sales Order Swap - Select Filters');
			swapForm.addField('custpage_swaptype', 'text', 'type - hidden').setDisplayType('hidden').setDefaultValue('swap');
			swapForm.addTab('custpage_swaptab', 'Select Options/Decors to Swap');
			//Create the field to swap decor
			var newDecorField = swapForm.addField('custpage_newdecor', 'select', 'New Decor', null, 'custpage_swaptab');
			newDecorField.addSelectOption('', '', true);
			var decorResults = nlapiSearchRecord('item', null, [new nlobjSearchFilter('custitemrvsitemtype', null, 'is', GetItemCategoryDecorId()),new nlobjSearchFilter('isinactive', null, 'is', 'F')], new nlobjSearchColumn('itemid'));
			if(decorResults != null)
			{
				for (var i = 0; i < decorResults.length; i++)
				{
					newDecorField.addSelectOption(decorResults[i].getId(), decorResults[i].getValue('itemid'), false);
				}
			}

			//Create the sublist to swap options
			var swapSublist = swapForm.addSubList('custpage_optlist', 'inlineeditor', 'Select Options to Swap', 'custpage_swaptab');
			swapForm.addField('custpage_swapinstruct', 'inlinehtml', ' ').setDefaultValue(
					'<style>p {font-size: 11pt;} ul li {font-size: 10pt; line-height: 150%;}</style>' +
					'<p>Use the left tab to determine which options should be removed or swapped from the order.' +
						'<ul><li>Select options in both columns to swap options on the order.</li>' +
						'<li>Select an option only in the left column to remove that option from the order.</li>' +
						'<li>Select an option only in the right column to add that option to the order.</li>' +
						'<li>Select a new decor to overwrite the decor on the order.</li></ul></p><br />' +
					'<p>Use the right tab to determine which Sales Orders should be affected.</p><br />');
			var swapOutField = swapSublist.addField('custpage_swapout', 'select', 'Swap Out');
			var swapInField = swapSublist.addField('custpage_swapin', 'select', 'Swap In');
			swapOutField.addSelectOption(-1, '', true);
			swapInField.addSelectOption(-1, '', true);
			var optResults = nlapiSearchRecord('item', null, [new nlobjSearchFilter('custitemrvsitemtype', null, 'is', GetItemCategoryOptionId()),new nlobjSearchFilter('isinactive', null, 'is', 'F')], [new nlobjSearchColumn('itemid'), new nlobjSearchColumn('displayname')]);
			if(optResults != null)
			{
				for (var i = 0; i < optResults.length; i++)
				{
					var dispName = optResults[i].getValue('itemid') + ' ' + optResults[i].getValue('displayname');
					swapOutField.addSelectOption(optResults[i].getId(), dispName, false);
					swapInField.addSelectOption(optResults[i].getId(), dispName, false);
				}
			}

			//Get the filters and search for the sales orders.
			var filters = [];
			var locations = request.getParameterValues('custpage_loc');
			if (locations != null) filters.push(new nlobjSearchFilter('location', null, 'anyof', locations));
			var series = request.getParameterValues('custpage_series');
			if (series != null) filters.push(new nlobjSearchFilter('custbodyrvsseries', null, 'anyof', series));
			var models = request.getParameterValues('custpage_model');
			if (models != null) filters.push(new nlobjSearchFilter('custbodyrvsmodel', null, 'anyof', models));
			var decors = request.getParameterValues('custpage_decor');
			if (decors != null) filters.push(new nlobjSearchFilter('custbodyrvsdecor', null, 'anyof', decors));
			var options = request.getParameterValues('custpage_options');
			if (options != null) {
				filters.push(new nlobjSearchFilter('item', null, 'anyof', options));
			}
			else {
				filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
			}
			var ordStats = request.getParameterValues('custpage_ordstatus');
			if (ordStats != null) {
				for(var i = 0; i < ordStats.length; i++) {
					ordStats[i] = 'SalesOrd:' + ordStats[i];
				}
				filters.push(new nlobjSearchFilter('status', null, 'anyof', ordStats));
			}
			var prodStats = request.getParameterValues('custpage_prodstatus');
			if (prodStats != null) filters.push(new nlobjSearchFilter('custrecordunit_status', 'custbodyrvsunit', 'anyof', prodStats));
      var onlineDate = request.getParameterValues('custpage_onlinedate');
      if (onlineDate != null) filters.push(new nlobjSearchFilter('custrecordunit_onlinedate', 'custbodyrvsunit', 'after', onlineDate));
      var offlineDate = request.getParameterValues('custpage_offlinedate');
      if (offlineDate != null) filters.push(new nlobjSearchFilter('custrecordunit_offlinedate', 'custbodyrvsunit', 'before', offlineDate));
			var calcVin = request.getParameter('vintype'); //yes, no, either
			if (calcVin == 'yes') filters.push(new nlobjSearchFilter('custrecordvinwascalculated', 'custbodyrvsunit', 'is', 'T'));
			if (calcVin == 'no') filters.push(new nlobjSearchFilter('custrecordvinwascalculated', 'custbodyrvsunit', 'is', 'F'));
			var hasBacklog = request.getParameter('backlogtype'); //yes, no, either
			if (hasBacklog == 'yes') filters.push(new nlobjSearchFilter('custrecordunit_backlog', 'custbodyrvsunit', 'noneof', ['@NONE@']));
			if (hasBacklog == 'no') filters.push(new nlobjSearchFilter('custrecordunit_backlog', 'custbodyrvsunit', 'anyof', ['@NONE@']));

			// VIN file filter
			var vinFile = request.getFile('custpage_vin_file');
			if (vinFile) {
				var vinFileValue = vinFile.getValue().replaceAll('\r','').replaceAll('\uFEFF', '');
				var vinArr = vinFileValue.split('\n');
				vinArr.shift();
				nlapiLogExecution('DEBUG', 'VIN Array', JSON.stringify(vinArr));
				if (vinFileValue) filters.push(new nlobjSearchFilter('custbodyrvsunit', null, 'anyof', vinArr));
			}

			//Create Columns
			var soResults = GetSteppedSearchResults('salesorder', filters, [new nlobjSearchColumn('tranid'),
			  new nlobjSearchColumn('trandate'),
			  new nlobjSearchColumn('entity'),
			  new nlobjSearchColumn('custbodyrvsseries'),
			  new nlobjSearchColumn('custbodyrvsdecor'),
			  new nlobjSearchColumn('custbodyrvsmodel'),
			  new nlobjSearchColumn('status'),
			  new nlobjSearchColumn('location'),
			  new nlobjSearchColumn('custbodyrvsunit'),
			  new nlobjSearchColumn('custbodyrvsunitonlinedate'),
			  new nlobjSearchColumn('custbodyrvsunitscheduledofflinedate'),
			  new nlobjSearchColumn('custbodyrvsunitserialnumber'),
			  new nlobjSearchColumn('custrecordunit_status', 'custbodyrvsunit'),
			]);

			//Add sales orders to the list with checkboxes.
			swapForm.addTab('custpage_addsotab', 'Select Sales Orders');
			if (soResults != null && soResults.length > 0) {
				var list = swapForm.addSubList('custpage_solist', 'list', 'Sales Orders (' + soResults.length + ' Total)', 'custpage_addsotab');
				list.addMarkAllButtons();
				list.addField('custpage_check', 'checkbox', 'Select', null);
				list.addField('custpage_tranid', 'text', 'Order #', null).setDisplayType('inline');
				list.addField('custpage_unit', 'text', 'VIN', null).setDisplayType('inline');
				list.addField('custpage_serial', 'text', 'Serial', null).setDisplayType('inline');
				list.addField('custpage_series', 'text', 'Series', null).setDisplayType('inline');
				list.addField('custpage_model', 'text', 'Model', null).setDisplayType('inline');
				list.addField('custpage_decor', 'text', 'Decor', null).setDisplayType('inline');
				list.addField('custpage_trandate', 'text', 'Order Date', null).setDisplayType('inline');
				list.addField('custpage_ordstatus', 'text', 'Order Status', null).setDisplayType('inline');
				list.addField('custpage_location', 'text', 'Location', null).setDisplayType('inline');
				list.addField('custpage_prodstatus', 'text', 'Production Status', null).setDisplayType('inline');
				list.addField('custpage_onlinedate', 'text', 'Online Date', null).setDisplayType('inline');
				list.addField('custpage_schedoffdate', 'text', 'Sched. Offline Date', null).setDisplayType('inline');
				list.addField('custpage_id', 'text', 'ID', null).setDisplayType('hidden');
				for (var i = 0; i < soResults.length; i++)
				{
					list.setLineItemValue('custpage_tranid', i+1, soResults[i].getValue('tranid'));
					list.setLineItemValue('custpage_unit', i+1, soResults[i].getText('custbodyrvsunit'));
					list.setLineItemValue('custpage_serial', i+1, soResults[i].getValue('custbodyrvsunitserialnumber'));
					list.setLineItemValue('custpage_series', i+1, soResults[i].getText('custbodyrvsseries'));
					list.setLineItemValue('custpage_model', i+1, soResults[i].getText('custbodyrvsmodel'));
					list.setLineItemValue('custpage_decor', i+1, soResults[i].getText('custbodyrvsdecor'));
					list.setLineItemValue('custpage_trandate', i+1, soResults[i].getValue('trandate'));
					list.setLineItemValue('custpage_ordstatus', i+1, soResults[i].getText('status'));
					list.setLineItemValue('custpage_location', i+1, soResults[i].getText('location'));
					list.setLineItemValue('custpage_prodstatus', i+1, soResults[i].getText('custrecordunit_status', 'custbodyrvsunit'));
					list.setLineItemValue('custpage_onlinedate', i+1, soResults[i].getValue('custbodyrvsunitonlinedate'));
					list.setLineItemValue('custpage_schedoffdate', i+1, soResults[i].getValue('custbodyrvsunitscheduledofflinedate'));
					list.setLineItemValue('custpage_id', i+1, soResults[i].getId());
				}
			}
			else {
				swapForm.addField('custpage_noresults', 'label', 'No search results found.', null, 'custpage_addsotab');
			}

			//Display the form.
			swapForm.addButton('custpage_resetbtn', 'Reset', "window.location='/app/site/hosting/scriptlet.nl?script=customscriptrvs_soswap_suitelet&deploy=customdeployrvs_soswap_suitelet'");
			swapForm.addSubmitButton('Start Swap');
			response.writePage(swapForm);
		}
		else {
			//Get the option/decor swap values.
			var swapArr = [];
			var newDecor = ConvertNSFieldToString(request.getParameter('custpage_newdecor'));
			if (newDecor.length > 0) swapArr.push({newItem: newDecor, type: 'decor'});
			for(var i = 1; i <= request.getLineItemCount('custpage_optlist'); i++) {
				var oldOpt = ConvertNSFieldToString(request.getLineItemValue('custpage_optlist', 'custpage_swapout', i));
				var newOpt = ConvertNSFieldToString(request.getLineItemValue('custpage_optlist', 'custpage_swapin', i));
				if (oldOpt.length > 0 || newOpt.length > 0) {
					swapArr.push({oldItem: oldOpt, newItem: newOpt, type: 'option'});
				}
			}

			//Get the sales orders to update
			var soIds = [];
			for(var i = 1; i <= request.getLineItemCount('custpage_solist'); i++) {
				if (request.getLineItemValue('custpage_solist', 'custpage_check', i) == 'T') {
					soIds.push(request.getLineItemValue('custpage_solist', 'custpage_id', i));
				}
			}

			var headers = new Object();
			headers['User-Agent-x'] = 'SuiteScript-Call';
			headers['Content-Type'] = 'application/json';

            //Start the map reduce script
            var url = nlapiResolveURL('SUITELET', 'customscriptgd_startmapreduce_suite', 'customdeploygd_startmapreduce_suite', true) //Get the external url. deployment must be available without login.
            nlapiRequestURL(url + '&custparam_scriptid=customscriptrvs_salesorderswapmapred&custparam_scriptdeploymentid=&custparam_parameters=', JSON.stringify({custscriptrvs_soswap_opts_mr: JSON.stringify(swapArr), custscriptrvs_soswap_sos_mr: JSON.stringify(soIds)}), headers);

			//Show the form to let them go to the script status page.
			var swapForm = nlapiCreateForm('Sales Order Swap - Script Started');
			swapForm.addField('custpage_done', 'label', 'The swap has started. Click <a href="/app/common/scripting/mapreducescriptstatus.nl">here</a> to view the script status page.');
			response.writePage(swapForm);
		}
	}
}
