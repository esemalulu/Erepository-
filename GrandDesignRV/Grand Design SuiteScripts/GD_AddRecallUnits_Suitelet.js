/**
 * Plug-in for Grand Design for Add Recall Units suitelet.
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Apr 2016     Jacob Shetler
 *
 */

var GD_LOCATIONFIELD = 'custpage_location';
var GD_SERIESFIELD = 'custpage_series';
var GD_MODELFIELD = 'custpage_model';
var GD_SERIALSTARTFIELD = 'custpage_serialstart';
var GD_SERIALENDFIELD = 'custpage_serialend';
var GD_DATESTARTFIELD = 'custpage_datestart';
var GD_DATEENDFIELD = 'custpage_dateend';
var GD_VINSTARTFIELD = 'custpage_vinstart';
var GD_VINENDFIELD = 'custpage_vinend';
var GD_APPTYPEFIELD = 'custpage_apptype';
var GD_APPMODELFIELD = 'custpage_appmodel';
var GD_APPSTARTSERIALFIELD = 'custpage_appstartserial';
var GD_APPENDSERIALFIELD = 'custpage_appendserial';
var GD_METHODFIELD = 'custpage_method';
var GD_FLATRATEFIELD = 'custpage_frcid';
var SEARCHMETHOD = 'search';
var ADDMETHOD = 'add';

/**
 * Grand Design implementation of the suitelet for adding recall units. 
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function RVS_AddRecallUnits_Suitelet(request, response)
{
	var form = nlapiCreateForm('Add Recall Units', false);
	
	if (request.getMethod() == 'GET')
	{
		//make sure that this suitelet was accessed from a flat rate code.
		var flatRateID = request.getParameter('custscript_flatratecodeid');
		if(flatRateID == null || flatRateID.length < 1)
		{
			form.addField('custpage_error', 'text', 'Error: This page must be accessed from a flat rate code.');
			response.writePage(form);
			return;
		}
		
		//If we're in the GET, then this is the first time that they have loaded the suitelet (the search is handled in the POST).
		//So we need to create a form to let the user search for Units.
		GD_createSearchForm(form, flatRateID);
		response.writePage(form);
	}
	else if (request.getMethod() == 'POST')
	{
		var method = request.getParameter(GD_METHODFIELD); 
		var flatRateID = request.getParameter(GD_FLATRATEFIELD);
		if(method == SEARCHMETHOD)
		{
			//Then we're doing a search and creating a list of units from it.
			GD_createUnitListForm(form, request, flatRateID);
			response.writePage(form);
			return;
		}
		else if (method == ADDMETHOD)
		{
			//Then we're getting the results of the list and creating new Recall Unit sublines on the flat rate code.
			GD_addUnitsToFlatRateCode(request, flatRateID);
			
			//navigate back to the flat rate code.
			nlapiSetRedirectURL('RECORD', 'customrecordrvsflatratecodes', flatRateID, false);
		}
	}
}

/**
 * Creates a search form to search for units. Adds an invisible field to keep track of the flat rate code's ID.
 * 
 * @param {nlobjForm} form
 * @param {String} flatRateID
 */
function GD_createSearchForm(form, flatRateID)
{
	form.addSubmitButton('Search for Units');
	
	//Add the group that filter based on the info directly on the unit.
	form.addFieldGroup('custpage_ungroup', 'Select Unit Filters').setSingleColumn(false);
	//location and series
	form.addField(GD_LOCATIONFIELD, 'multiselect', 'Location', 'location', 'custpage_ungroup');
	form.addField(GD_SERIESFIELD, 'multiselect', 'Series', 'customrecordrvsseries', 'custpage_ungroup');
	//models
	var modelFieldObj = form.addField(GD_MODELFIELD, 'multiselect', 'Model', null, 'custpage_ungroup');
	var modelResults = nlapiSearchRecord('assemblyitem', null, new nlobjSearchFilter('custitemrvsitemtype', null, 'is', GetItemCategoryModelId()), new nlobjSearchColumn('itemid'));
	if(modelResults != null)
	{
		for (var i = 0; i < modelResults.length; i++)
		{
			modelFieldObj.addSelectOption(modelResults[i].getId(), modelResults[i].getValue('itemid'), false);
		}
	}
	//serial # range
	form.addField(GD_SERIALSTARTFIELD, 'integer', 'Start Unit Serial Number', null, 'custpage_ungroup').setBreakType('startcol');
	form.addField(GD_SERIALENDFIELD, 'integer', 'End Unit Serial Number', null, 'custpage_ungroup');
	//production date range
	form.addField(GD_DATESTARTFIELD, 'date', 'Start Manufactured Date', null, 'custpage_ungroup');
	form.addField(GD_DATEENDFIELD, 'date', 'End Manufactured Date', null, 'custpage_ungroup');
	//VIN range
	form.addField(GD_VINSTARTFIELD, 'text', 'Start Chassis VIN', null, 'custpage_ungroup');
	form.addField(GD_VINENDFIELD, 'text', 'End Chassis VIN', null, 'custpage_ungroup');
	
	//Add the field group that filters based on the Unit Appliances record
	form.addFieldGroup('custpage_appgroup', 'Select Unit Appliance Filters').setSingleColumn(false);
	//Appliance type
	var typeField = form.addField(GD_APPTYPEFIELD, 'select', 'Type', null, 'custpage_appgroup');
	typeField.addSelectOption('', '', true);
	var typeResults = nlapiSearchRecord('customrecordrvsappliancetype', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('name').setSort());
	if (typeResults != null)
	{
		for (var i = 0; i < typeResults.length; i++)
		{
			typeField.addSelectOption(typeResults[i].getId(), typeResults[i].getValue('name'), false);
		}
	}
	//Appliance model #
	form.addField(GD_APPMODELFIELD, 'text', 'Model Number', null, 'custpage_appgroup');
	//Appliance serial # range
	form.addField(GD_APPSTARTSERIALFIELD, 'text', 'Start Appliance Serial Number', null, 'custpage_appgroup');
	form.addField(GD_APPENDSERIALFIELD, 'text', 'End Appliance Serial Number', null, 'custpage_appgroup');
	
	//add an invisible field with the id of the recall unit
	form.addField(GD_FLATRATEFIELD, 'text', 'invisible').setDisplayType('hidden').setDefaultValue(flatRateID);
	
	//add a field telling the resulting POST message that we're doing a search.
	form.addField(GD_METHODFIELD, 'text', 'invisible').setDisplayType('hidden').setDefaultValue(SEARCHMETHOD);
}

/**
 * Creates a form for a list of units that the user can check to add to the flat rate code.
 * 
 * @param {nlobjForm} form
 * @param {nlobjRequest} request
 * @param {String} flatRateID
 */
function GD_createUnitListForm(form, request, flatRateID)
{
	//Decide if we're doing a search on Unit Appliance  
	var appType = ConvertNSFieldToString(request.getParameter(GD_APPTYPEFIELD));
	var appModelNum = ConvertNSFieldToString(request.getParameter(GD_APPMODELFIELD));
	var appStartSer = ConvertNSFieldToString(request.getParameter(GD_APPSTARTSERIALFIELD));
	var appEndSer = ConvertNSFieldToString(request.getParameter(GD_APPENDSERIALFIELD));
	var join = null;
	var summary = null;
	var unitSearchResults = null;
	if(appType.length > 0 || appModelNum.length > 0 || appStartSer.length > 0 || appEndSer.length > 0)
	{
		//Get the normal filters
		join = 'custrecordunitappliances_unit';
		summary = 'group';
		var appFilters = GD_createFilters(request, join);
		
		//Add on filters for everything they entered.
		if (appType.length > 0) appFilters.push(new nlobjSearchFilter('custrecordunitappliances_type', null, 'is', appType));
		if (appModelNum.length > 0) appFilters.push(new nlobjSearchFilter('custrecordunitappliances_modelnumber', null, 'is', appModelNum));
		if (appStartSer.length > 0) appFilters.push(new nlobjSearchFilter('formulanumeric', null, 'equalto', 1).setFormula("CASE WHEN {custrecordunitappliances_serialnumber} >= '" + appStartSer + "' THEN 1 ELSE 0 END"));
		if (appEndSer.length > 0) appFilters.push(new nlobjSearchFilter('formulanumeric', null, 'equalto', 1).setFormula("CASE WHEN {custrecordunitappliances_serialnumber} <= '" + appEndSer + "' THEN 1 ELSE 0 END"));
		
		//Search on the unit appliances
		unitSearchResults = GetSteppedSearchResults('customrecordrvsunitappliances', appFilters, GD_createColumns(join, summary));
	}
	else
	{
		//Do the normal unit search
		unitSearchResults = GetSteppedSearchResults('customrecordrvsunit', GD_createFilters(request, join), GD_createColumns(join, summary));
	}
	
	if(unitSearchResults == null || unitSearchResults.length == 0)
	{
		form.addField('custpage_error', 'label', 'There are no Units that match your search criteria.');
		return;
	}
	
	//Add a field that will list the total number of units to select.
	form.addField('custpage_totalunits', 'label', 'Search returned ' + unitSearchResults.length + ' units.');

	//Get Chassis VIN fields to display Manufacturer column conditionally
	var startVIN = request.getParameter(GD_VINSTARTFIELD);
	var endVIN = request.getParameter(GD_VINENDFIELD);
	
	//create a form to let them select the units
	var list = form.addSubList('custpage_units', 'list', 'Units', null);
	list.addMarkAllButtons();
	list.addField('custpage_check', 'checkbox', 'Select', null);
	list.addField('custpage_name', 'text', 'VIN', null).setDisplayType('inline');
	list.addField('custpage_serial', 'text', 'Serial Number', null).setDisplayType('inline');
	list.addField('custpage_series', 'text', 'Series', null).setDisplayType('inline');
	list.addField('custpage_model', 'text', 'Model', null).setDisplayType('inline');
	list.addField('custpage_location', 'text', 'Location', null).setDisplayType('inline');
	list.addField('custpage_date', 'date', 'Manufactured Date', null).setDisplayType('inline');
	list.addField('custpage_id', 'text', 'ID', null).setDisplayType('hidden');
	if (startVIN || endVIN) list.addField('custpage_manufacturer', 'text', 'Manufacturer', null).setDisplayType('inline');
	for (var i = 0; i < unitSearchResults.length; i++)
	{
		list.setLineItemValue('custpage_name', i+1, unitSearchResults[i].getValue('name', join, summary));
		list.setLineItemValue('custpage_serial', i+1, unitSearchResults[i].getValue('custrecordunit_serialnumber', join, summary));
		list.setLineItemValue('custpage_series', i+1, unitSearchResults[i].getText('custrecordunit_series', join, summary));
		list.setLineItemValue('custpage_model', i+1, unitSearchResults[i].getText('custrecordunit_model', join, summary));
		list.setLineItemValue('custpage_location', i+1, unitSearchResults[i].getText('custrecordunit_location', join, summary));
		list.setLineItemValue('custpage_date', i+1, unitSearchResults[i].getValue('custrecordunit_actualofflinedate', join, summary));
		list.setLineItemValue('custpage_id', i+1, unitSearchResults[i].getValue('internalid', join, summary));
		if (startVIN || endVIN) list.setLineItemValue('custpage_manufacturer', i+1, unitSearchResults[i].getValue('name', 'custrecordgd_unit_chassismanufacturer', summary));
	}
	
	//add an invisible field with the id of the recall unit
	form.addField(GD_FLATRATEFIELD, 'text', 'invisible').setDisplayType('hidden').setDefaultValue(flatRateID);
	
	form.addSubmitButton('Add Selected Units');
	
	//add a field telling the resulting POST message that we're adding units.
	form.addField(GD_METHODFIELD, 'text', 'invisible').setDisplayType('hidden').setDefaultValue(ADDMETHOD);
}

/**
 * Creates an array of filters to search on the Unit based on the request. 
 * 
 * @param {nlobjRequest} request
 * @returns {Array}
 */
function GD_createFilters(request, join)
{
	//create the filters for the search.
	var filters = [];
	
	//location
	var locations = GD_multiSelectValuesToArray(request.getParameter(GD_LOCATIONFIELD));
	if(locations.length > 0) filters.push(new nlobjSearchFilter('custrecordunit_location', join, 'anyof', locations));
	//series
	var series = GD_multiSelectValuesToArray(request.getParameter(GD_SERIESFIELD));
	if(series.length > 0) filters.push(new nlobjSearchFilter('custrecordunit_series', join, 'anyof', series));
	//models
	var models = GD_multiSelectValuesToArray(request.getParameter(GD_MODELFIELD));
	if (models.length > 0) filters.push(new nlobjSearchFilter('custrecordunit_model', join, 'anyof', models));
	
	//serial range
	var startSerial = request.getParameter(GD_SERIALSTARTFIELD);
	if(startSerial != null && startSerial.length > 0)
	{
		var startSerialFilter = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
		if (join == null) startSerialFilter.setFormula("CASE WHEN TO_NUMBER(SUBSTR({custrecordunit_serialnumber}, LENGTH({custrecordunit_serialnumber}) - 4, 5)) >= '" + startSerial + "' THEN 1 ELSE 0 END");
		else startSerialFilter.setFormula("CASE WHEN TO_NUMBER(SUBSTR({" + join + ".custrecordunit_serialnumber}, LENGTH({" + join + ".custrecordunit_serialnumber}) - 4, 5)) >= '" + startSerial + "' THEN 1 ELSE 0 END");
		filters.push(startSerialFilter);
	}
	var endSerial = request.getParameter(GD_SERIALENDFIELD);
	if(endSerial != null && endSerial.length > 0)
	{
		var endSerialFilter = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
		if (join == null) endSerialFilter.setFormula("CASE WHEN TO_NUMBER(SUBSTR({custrecordunit_serialnumber}, LENGTH({custrecordunit_serialnumber}) - 4, 5)) <= '" + endSerial + "' THEN 1 ELSE 0 END");
		else endSerialFilter.setFormula("CASE WHEN TO_NUMBER(SUBSTR({" + join + ".custrecordunit_serialnumber}, LENGTH({" + join + ".custrecordunit_serialnumber}) - 4, 5)) <= '" + endSerial + "' THEN 1 ELSE 0 END");
		filters.push(endSerialFilter);
	}
	
	//date range
	var startDate = request.getParameter(GD_DATESTARTFIELD);
	if(startDate != null && startDate.length > 0)
	{
		filters.push(new nlobjSearchFilter('custrecordunit_actualofflinedate', join, 'onorafter', startDate));
	}
	var endDate = request.getParameter(GD_DATEENDFIELD);
	if(endDate != null && endDate.length > 0)
	{
		filters.push(new nlobjSearchFilter('custrecordunit_actualofflinedate', join, 'onorbefore', endDate));
	}
	
	//vin range
	var motorized = false;
	var startVIN = request.getParameter(GD_VINSTARTFIELD);
	if (startVIN) {
		var startVINFilter = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
		if (join == null) startVINFilter.setFormula("CASE WHEN {name} >= '" + startVIN.toUpperCase() + "' THEN 1 ELSE 0 END");
		else startVINFilter.setFormula("CASE WHEN {" + join + ".name} >= '" + startVIN.toUpperCase() + "' THEN 1 ELSE 0 END");
		filters.push(startVINFilter);
		var motorized = true;
	}
	var endVIN = request.getParameter(GD_VINENDFIELD);
	if (endVIN) {
		var endVINFilter = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
		if (join == null) endVINFilter.setFormula("CASE WHEN {name} <= '" + endVIN.toUpperCase() + "' THEN 1 ELSE 0 END");
		else endVINFilter.setFormula("CASE WHEN {" + join + ".name} <= '" + endVIN.toUpperCase() + "' THEN 1 ELSE 0 END");
		filters.push(endVINFilter);
		var motorized = true;
	}
	if (motorized) {
		var endVINFilter = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1);
		if (join == null) endVINFilter.setFormula('CASE WHEN {custrecordgd_unit_chassis} IS NOT NULL THEN 1 ELSE 0 END');
		else endVINFilter.setFormula("CASE WHEN {" + join + ".custrecordgd_unit_chassis} IS NOT NULL THEN 1 ELSE 0 END");
		filters.push(endVINFilter);
	}
	
	//inactive
	filters.push(new nlobjSearchFilter('isinactive', join, 'is', 'F'));

	return filters;
}

/**
 * Creates Unit search columns with the specified join and summary values.
 */
function GD_createColumns(join, summary)
{
	//Grand Design wants to sort by the last 6 digits of the VIN.
	var sortCol = new nlobjSearchColumn('formulanumeric', null, summary).setSort();
	if (join == null) sortCol.setFormula('TO_NUMBER(SUBSTR({name}, -6, 6))');
	else sortCol.setFormula('TO_NUMBER(SUBSTR({' + join + '.name}, -6, 6))');
	
	return [sortCol,
		new nlobjSearchColumn('name', join, summary),
		new nlobjSearchColumn('custrecordunit_serialnumber', join, summary),
		new nlobjSearchColumn('custrecordunit_series', join, summary),
		new nlobjSearchColumn('custrecordunit_model', join, summary),
		new nlobjSearchColumn('custrecordunit_location', join, summary),
		new nlobjSearchColumn('custrecordunit_actualofflinedate', join, summary),
		new nlobjSearchColumn('internalid', join, summary),
		new nlobjSearchColumn('name', 'custrecordgd_unit_chassismanufacturer', summary)];
}

/**
 * Generates an array of values based on the separator ENQ. Will return an empty array if no values are found.
 * 
 * @param values
 */
function GD_multiSelectValuesToArray(values)
{
	if(values == null || values.length == 0) return new Array();
	
	//separate by ENQ
	return values.split(String.fromCharCode(5));
}

/**
 * Adds the specified units to the flat rate code as Recall Units.
 * 
 * @param {nlobjRequest} request
 * @param {String} flatRateID
 */
function GD_addUnitsToFlatRateCode(request, flatRateID)
{
	//load the record
	var flatRateRecord = nlapiLoadRecord('customrecordrvsflatratecodes', flatRateID);
	var recallUnitListType = 'recmachcustrecordrecallunit_recallcode';
	
	//get the array of values from the request.
	var unitsData = request.getParameter('custpage_unitsdata');
	nlapiLogExecution('DEBUG', 'unitsData', unitsData);
	if(unitsData == null || unitsData.length == 0) return;
	unitsData = unitsData.split(String.fromCharCode(2)); //rows are separated by STX
	nlapiLogExecution('DEBUG', 'unitsData', unitsData);
	
	//set the new sublist values
	for (var i = 0; i < unitsData.length; i++)
	{
		var curData = unitsData[i].split(String.fromCharCode(1)); //columns are separated by SOH
		nlapiLogExecution('DEBUG', 'curData', curData);
		if(curData[0] == 'T' && flatRateRecord.findLineItemValue(recallUnitListType, 'custrecordrecallunit_unit', curData[7]) == -1)
		{
			flatRateRecord.selectNewLineItem(recallUnitListType);
			flatRateRecord.setCurrentLineItemValue(recallUnitListType, 'custrecordrecallunit_unit', curData[7]);
			flatRateRecord.setCurrentLineItemValue(recallUnitListType, 'custrecordrecallunit_date', getTodaysDate());
			flatRateRecord.setCurrentLineItemValue(recallUnitListType, 'custrecordrecallunit_status', 'Open');
			flatRateRecord.commitLineItem(recallUnitListType);
		}
	}
	
	//save the record
	nlapiSubmitRecord(flatRateRecord);
} 
