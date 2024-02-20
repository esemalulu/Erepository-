/**
 * Suitelet for users to choose sales orders to have model prices updated.
 *
 * Version    Date            Author           Remarks
 * 1.00       2 May 2016      Jacob Shetler
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
function GD_ModelPriceUpdate_Suite(request, response) {
  if (request.getMethod() == 'GET') {
    var mpuForm = nlapiCreateForm('Model Price Updater - Select Filters');
    mpuForm.addField('custpage_mputype', 'text', 'type - hidden').setDisplayType('hidden').setDefaultValue('search');
    //Create filters for sales orders/units
    mpuForm.addFieldGroup('custpage_filterfg', 'Select Sales Order Filters');
    //location and series
    mpuForm.addField('custpage_loc', 'multiselect', 'Location', 'location', 'custpage_filterfg');
    var seriesObj = mpuForm.addField('custpage_series', 'multiselect', 'Series', null, 'custpage_filterfg');
    var seriesResults = nlapiSearchRecord('customrecordrvsseries', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('name'));
    if (seriesResults != null) {
      for (var i = 0; i < seriesResults.length; i++) {
        seriesObj.addSelectOption(seriesResults[i].getId(), seriesResults[i].getValue('name'), false);
      }
    }
    //Models
    var modelFieldObj = mpuForm.addField('custpage_model', 'multiselect', 'Model', null, 'custpage_filterfg');
    var modelResults = nlapiSearchRecord('item', null, [new nlobjSearchFilter('custitemrvsitemtype', null, 'is', GetItemCategoryModelId()), new nlobjSearchFilter('isinactive', null, 'is', 'F')], new nlobjSearchColumn('itemid'));
    if (modelResults != null) {
      for (var i = 0; i < modelResults.length; i++) {
        modelFieldObj.addSelectOption(modelResults[i].getId(), modelResults[i].getValue('itemid'), false);
      }
    }
    //Order Status
    var ordStatusFld = mpuForm.addField('custpage_ordstatus', 'multiselect', 'Order Status', null, 'custpage_filterfg');
    for (var key in soStatusDict) {
      ordStatusFld.addSelectOption(key, soStatusDict[key]);
    }

    //Unit filters
    mpuForm.addFieldGroup('custpage_unitfg', 'Select Unit Filters').setSingleColumn(true);
    //Production Status
    prodStatFld = mpuForm.addField('custpage_prodstatus', 'multiselect', 'Production Status', null, 'custpage_unitfg');
    var prodstatResults = nlapiSearchRecord('customlistrvsunitstatus', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('name'));
    if (prodstatResults != null) {
      for (var i = 0; i < prodstatResults.length; i++) {
        prodStatFld.addSelectOption(prodstatResults[i].getId(), prodstatResults[i].getValue('name'), false);
      }
    }
    //Online & Offline Dates
    onlineDateFld = mpuForm.addField('custpage_onlinedate', 'date', 'Online Date', null, 'custpage_unitfg');
    offlineDateFld = mpuForm.addField('custpage_offlinedate', 'date', 'Offline Date', null, 'custpage_unitfg');
    //Radios
    mpuForm.addField('custpage_vincalclbl', 'label', 'VIN Has Been Calculated?', null, 'custpage_unitfg');
    mpuForm.addField('vintype', 'radio', 'Either', 'either', 'custpage_unitfg');
    mpuForm.addField('vintype', 'radio', 'Yes', 'yes', 'custpage_unitfg');
    mpuForm.addField('vintype', 'radio', 'No', 'no', 'custpage_unitfg');
    mpuForm.getField('vintype', 'either').setDefaultValue('either');

    mpuForm.addField('custpage_hasbackloglbl', 'label', 'Unit Has Backlog?', null, 'custpage_unitfg');
    mpuForm.addField('backlogtype', 'radio', 'Either', 'either', 'custpage_unitfg');
    mpuForm.addField('backlogtype', 'radio', 'Yes', 'yes', 'custpage_unitfg');
    mpuForm.addField('backlogtype', 'radio', 'No', 'no', 'custpage_unitfg');
    mpuForm.getField('backlogtype', 'either').setDefaultValue('either');

    //Create submit button
    mpuForm.addSubmitButton('Search');
    response.writePage(mpuForm);
  } else { //POST
    if (request.getParameter('custpage_mputype') == 'search') {
      //Create the select sales orders form.
      var mpuForm = nlapiCreateForm('Model Price Updater - Select Sales Orders');
      mpuForm.addField('custpage_mputype', 'text', 'type - hidden').setDisplayType('hidden').setDefaultValue('update');
      mpuForm.addFieldGroup('custpage_mainfg', 'Select Sales Orders to Update');
      var soTotalFld = mpuForm.addField('custpage_numsos', 'integer', 'Number of Sales Orders in List', null, 'custpage_mainfg').setDisplayType('inline');

      //Get the filters and search for the sales orders.
      var filters = [new nlobjSearchFilter('mainline', null, 'is', 'T')];
      var locations = request.getParameterValues('custpage_loc');
      if (locations != null) filters.push(new nlobjSearchFilter('location', null, 'anyof', locations));
      var series = request.getParameterValues('custpage_series');
      if (series != null) filters.push(new nlobjSearchFilter('custbodyrvsseries', null, 'anyof', series));
      var models = request.getParameterValues('custpage_model');
      if (models != null) filters.push(new nlobjSearchFilter('custbodyrvsmodel', null, 'anyof', models));
      var ordStats = request.getParameterValues('custpage_ordstatus');
      if (ordStats != null) {
        for (var i = 0; i < ordStats.length; i++) {
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
        new nlobjSearchColumn('custrecordunit_status', 'custbodyrvsunit'),
        new nlobjSearchColumn('custbodyrvsunitonlinedate'),
			  new nlobjSearchColumn('custbodyrvsunitscheduledofflinedate'),
      ]);

      //Add sales orders to the list with checkboxes.
      if (soResults != null && soResults.length > 0) {
        soTotalFld.setDefaultValue(soResults.length);
        var list = mpuForm.addSubList('custpage_solist', 'list', 'Sales Orders', 'custpage_mainfg');
        list.addMarkAllButtons();
        list.addField('custpage_check', 'checkbox', 'Select', null);
        list.addField('custpage_tranid', 'text', 'Order #', null).setDisplayType('inline');
        list.addField('custpage_unit', 'text', 'VIN', null).setDisplayType('inline');
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
        for (var i = 0; i < soResults.length; i++) {
          list.setLineItemValue('custpage_tranid', i + 1, soResults[i].getValue('tranid'));
          list.setLineItemValue('custpage_unit', i + 1, soResults[i].getText('custbodyrvsunit'));
          list.setLineItemValue('custpage_series', i + 1, soResults[i].getText('custbodyrvsseries'));
          list.setLineItemValue('custpage_model', i + 1, soResults[i].getText('custbodyrvsmodel'));
          list.setLineItemValue('custpage_decor', i + 1, soResults[i].getText('custbodyrvsdecor'));
          list.setLineItemValue('custpage_trandate', i + 1, soResults[i].getValue('trandate'));
          list.setLineItemValue('custpage_ordstatus', i + 1, soResults[i].getText('status'));
          list.setLineItemValue('custpage_location', i + 1, soResults[i].getText('location'));
          list.setLineItemValue('custpage_prodstatus', i + 1, soResults[i].getText('custrecordunit_status', 'custbodyrvsunit'));
          list.setLineItemValue('custpage_onlinedate', i+1, soResults[i].getValue('custbodyrvsunitonlinedate'));
					list.setLineItemValue('custpage_schedoffdate', i+1, soResults[i].getValue('custbodyrvsunitscheduledofflinedate'));
          list.setLineItemValue('custpage_id', i + 1, soResults[i].getId());
        }
      } else {
        mpuForm.addField('custpage_noresults', 'label', 'No search results found.', null, 'custpage_addsotab');
      }

      //Display the form.
      mpuForm.addButton('custpage_resetbtn', 'Reset', "window.location='/app/site/hosting/scriptlet.nl?script=customscriptgd_modelpriceupdater_suite&deploy=customdeploygd_modelpriceupdater_suite'");
      mpuForm.addSubmitButton('Start Update');
      response.writePage(mpuForm);
    } else {
      //Get the sales orders to update
      var soIds = [];
      for (var i = 1; i <= request.getLineItemCount('custpage_solist'); i++) {
        if (request.getLineItemValue('custpage_solist', 'custpage_check', i) == 'T') {
          soIds.push(request.getLineItemValue('custpage_solist', 'custpage_id', i));
        }
      }

      var headers = new Object();
      headers['User-Agent-x'] = 'SuiteScript-Call';
      headers['Content-Type'] = 'application/json';

      //Start the map reduce script
      var url = nlapiResolveURL('SUITELET', 'customscriptgd_startmapreduce_suite', 'customdeploygd_startmapreduce_suite', true) //Get the external url. deployment must be available without login.
      nlapiRequestURL(url + '&custparam_scriptid=customscriptgd_modelpriceupdater_mr&custparam_scriptdeploymentid=&custparam_parameters=', JSON.stringify({
        custscriptgd_mpu_sos_mr: JSON.stringify(soIds)
      }), headers);

      //Show the form to let them go to the script status page.
      var mpuForm = nlapiCreateForm('Model Price Updater - Script Started');
      mpuForm.addField('custpage_done', 'label', 'The update has started. Click <a href="/app/common/scripting/mapreducescriptstatus.nl">here</a> to view the script status page.');
      response.writePage(mpuForm);
    }
  }
}
