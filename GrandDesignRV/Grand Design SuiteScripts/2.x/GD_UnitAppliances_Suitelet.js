/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Nov 2015     Jacob Shetler
 *
 */

var APP_LIST = 'custpage_applist';
var APP_RECORDTYPE = 'customrecordrvsunitappliances';
var APP_DELETED_IDS = 'custpage_app_deletedids';
var APP_LINEITEM_ID = 'custpage_app_id';
var APP_LINEITEM_TYPE = 'custpage_app_type';
var APP_LINEITEM_DESC = 'custpage_app_desc';
var APP_LINEITEM_BRAND = 'custpage_app_brand';
var APP_LINEITEM_MODEL = 'custpage_app_model';
var APP_LINEITEM_SERIAL = 'custpage_app_serial';
var APP_LINEITEM_VENDOR = 'custpage_app_vendor';

var QA_LIST = 'custpage_qalist';
var QA_RECORDTYPE = 'customrecordrvsqatest';
var QA_DELETED_IDS = 'custpage_qa_deletedids';
var QA_LINEITEM_ID = 'custpage_qa_id';
var QA_LINEITEM_TEMPLATE = 'custpage_qa_template';
var QA_LINEITEM_VERSION = 'custpage_qa_version';
var QA_LINEITEM_DATE = 'custpage_qa_date';
var QA_LINEITEM_USER = 'custpage_qa_user';
var QA_LINEITEM_HOLD = 'custpage_qa_systemshold';


/**
 * Creates a sublist containing units that have not been shipped and that have had their VIN calculated.
 * Displays links on each row of the sublist to navigate to the other suitelet to edit the Appliance and QA Test sublists for the Unit.
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function ListSuitelet(request, response)
{
	//We will never get a POST request on this suitelet, so just always display the list
	var form = nlapiCreateForm('Select a Unit to Update Appliance Data', false);
	
	//create a NetSuite sublist to add the items into.
	var list = form.addSubList('custpage_units', 'list', 'Units', null);
	var editField = list.addField('custpage_edit', 'text', 'Edit', null);
	editField.setDisplayType('inline');
	var unitField = list.addField('custpage_unit', 'text', 'Unit', null);
	unitField.setDisplayType('inline');
	var serialField = list.addField('custpage_serial', 'text', 'Serial Number', null);
	serialField.setDisplayType('inline');
	var dealerField = list.addField('custpage_dealer', 'text', 'Dealer', null);
	dealerField.setDisplayType('inline');
	var seriesField = list.addField('custpage_series', 'text', 'Series', null);
	seriesField.setDisplayType('inline');
	var modelField = list.addField('custpage_model', 'text', 'Model', null);
	modelField.setDisplayType('inline');
	
	//get the URL of the edit suitelet
	var baseURL = nlapiResolveURL('suitelet', 'customscriptgd_unitappliancesedit_suite', 'customdeploygd_unitapplianceseditsuite_d');
	
	//Do the search and create the form for the units
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordunit_shippingstatus', null, 'noneof', '3'));
	filters.push(new nlobjSearchFilter('custrecordvinwascalculated', null, 'is', 'T'));
	var columns = new Array();
	columns.push(new nlobjSearchColumn('name'));
	columns.push(new nlobjSearchColumn('custrecordunit_serialnumber'));
	columns.push(new nlobjSearchColumn('custrecordunit_dealer'));
	columns.push(new nlobjSearchColumn('custrecordunit_series'));
	columns.push(new nlobjSearchColumn('custrecordunit_model'));
	var unitResults = nlapiSearchRecord('customrecordrvsunit', null, filters, columns);
	for (var i = 0; i < unitResults.length; i++)
	{
		var curUnit = unitResults[i];
		//Set the information in the current line.
		list.setLineItemValue('custpage_edit', i+1, '<a target="_blank" href="' + baseURL + '&custscriptunitid=' + curUnit.getValue('name') + '">Edit</a>');
		list.setLineItemValue('custpage_unit', i+1, curUnit.getValue('name'));
		list.setLineItemValue('custpage_serial', i+1, curUnit.getValue('custrecordunit_serialnumber'));
		list.setLineItemValue('custpage_dealer', i+1, curUnit.getText('custrecordunit_dealer'));
		list.setLineItemValue('custpage_series', i+1, curUnit.getText('custrecordunit_series'));
		list.setLineItemValue('custpage_model', i+1, curUnit.getText('custrecordunit_model'));
	}
	
	//set the list on the form.
	response.writePage(form);
}

/**
 * Suitelet that allows editing of the Unit's appliances and QA Test.
 * The unit will come in the URL parameters.
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function EditSuitelet(request, response)
{
	if(request.getMethod() == 'GET')
	{
		//create the form to return
		var form = nlapiCreateForm('Modify Unit Appliances', false);
		
		//On the GET, make sure a unit was set in the parameters.
		var unitVIN = request.getParameter('custscriptunitid');
		if(unitVIN == null)
		{
			//write up an error message if no unit is set.
			form.addField('custpage_error', 'label', 'Error: No Unit selected. You must access this page from the Unit Appliances Suitelet.');
			response.writePage(form);
			return;
		}
		
		//otherwise create a form where they can edit the unit.
		response.writePage(createEditForm(form, unitVIN));
	}
	else if (request.getMethod() == 'POST')
	{
		var unitID = request.getParameter('custpage_id');
		
		//load and save the appliances.
		var appCount = request.getLineItemCount(APP_LIST);
		//var qaCount = request.getLineItemCount(QA_LIST);
		
		if(appCount <= 50) //Do submit record without scheduled script
		{
			//do the appliances
			for (var i = 1; i <= appCount; i++)
			{
				//check if the line has an ID. If it does, update the record instead of adding it.
				var curID = request.getLineItemValue(APP_LIST, APP_LINEITEM_ID, i);
				var appRecord = null;
				if(curID != null && curID.length > 0)
				{
					//Update the existing record. It could be that the record got deleted in between when we loaded the record originally in the suitelet, so make sure
					//that if the record doesn't exist, we create a new one.
					try{ appRecord = nlapiLoadRecord(APP_RECORDTYPE, curID); }
					catch(e) { appRecord = nlapiCreateRecord(APP_RECORDTYPE); } 
				}
				else
				{
					//Then submit a new one
					appRecord = nlapiCreateRecord(APP_RECORDTYPE);
				}
				
				//set the values
				appRecord.setFieldValue('custrecordunitappliances_unit', unitID);
				appRecord.setFieldValue('custrecordunitappliances_type', request.getLineItemValue(APP_LIST, APP_LINEITEM_TYPE, i));
				appRecord.setFieldValue('custrecordunitappliances_desc', request.getLineItemValue(APP_LIST, APP_LINEITEM_DESC, i));
				appRecord.setFieldValue('custrecordunitappliances_brandname', request.getLineItemValue(APP_LIST, APP_LINEITEM_BRAND, i));
				appRecord.setFieldValue('custrecordunitappliances_modelnumber', request.getLineItemValue(APP_LIST, APP_LINEITEM_MODEL, i));
				appRecord.setFieldValue('custrecordunitappliances_serialnumber', request.getLineItemValue(APP_LIST, APP_LINEITEM_SERIAL, i));
				appRecord.setFieldValue('custrecordvendor', request.getLineItemValue(APP_LIST, APP_LINEITEM_VENDOR, i));
				
				//submit the record
				nlapiSubmitRecord(appRecord);
			}
			//delete the deleted appliances
			deleteFromArray(request.getParameter(APP_DELETED_IDS), APP_RECORDTYPE);
			
			/*
			//do the QA tests
			for (var i = 1; i <= qaCount; i++)
			{
				//check if the line has an ID. If it does, update the record instead of adding it.
				var curID = request.getLineItemValue(QA_LIST, QA_LINEITEM_ID, i);
				var qaRecord = null;
				if(curID != null && curID.length > 0)
				{
					//Update the existing record. It could be that the record got deleted in between when we loaded the record originally in the suitelet, so make sure
					//that if the record doesn't exist, we create a new one.
					try{ qaRecord = nlapiLoadRecord(QA_RECORDTYPE, curID); }
					catch(e) { qaRecord = nlapiCreateRecord(QA_RECORDTYPE); } 
				}
				else
				{
					//Then submit a new one
					qaRecord = nlapiCreateRecord(QA_RECORDTYPE);
				}
				
				//set the values
				qaRecord.setFieldValue('custrecordqatest_unit', unitID);
				qaRecord.setFieldValue('custrecordqatest_qatesttemplate', request.getLineItemValue(QA_LIST, QA_LINEITEM_TEMPLATE, i));
				qaRecord.setFieldValue('custrecordqatest_version', request.getLineItemValue(QA_LIST, QA_LINEITEM_VERSION, i));
				qaRecord.setFieldValue('custrecordqatest_date', request.getLineItemValue(QA_LIST, QA_LINEITEM_DATE, i));
				qaRecord.setFieldValue('custrecordqatest_user', request.getLineItemValue(QA_LIST, QA_LINEITEM_USER, i));
				qaRecord.setFieldValue('custrecordqatest_systemshold', request.getLineItemValue(QA_LIST, QA_LINEITEM_HOLD, i));
				
				//submit the record
				nlapiSubmitRecord(qaRecord);
			}
			//delete the deleted appliances
			deleteFromArray(request.getParameter(QA_DELETED_IDS), QA_RECORDTYPE);
			*/
			
			//redirect to the Unit page.
			nlapiSetRedirectURL('RECORD', 'customrecordrvsunit', unitID, false);
		}
		else
		{
			//submit appliances using scheduled script
			var scheduledParams = {};
			scheduledParams['custscript_unitid'] = unitID;
			
			//add the deleted items
			var deletedItems = request.getParameter(APP_DELETED_IDS);
			scheduledParams['custscript_deleteditems'] = deletedItems;
			
			//Loop over the line items and add them into an array.
			var lineItems = [];
			for (var i = 1; i <= appCount; i++)
			{
				var curItem = {};
				
				//set the values
				curItem[APP_LINEITEM_ID] = request.getLineItemValue(APP_LIST, APP_LINEITEM_ID, i);
				curItem[APP_LINEITEM_TYPE] = request.getLineItemValue(APP_LIST, APP_LINEITEM_TYPE, i);
				curItem[APP_LINEITEM_DESC] = request.getLineItemValue(APP_LIST, APP_LINEITEM_DESC, i);
				curItem[APP_LINEITEM_BRAND] = request.getLineItemValue(APP_LIST, APP_LINEITEM_BRAND, i);
				curItem[APP_LINEITEM_MODEL] = request.getLineItemValue(APP_LIST, APP_LINEITEM_MODEL, i);
				curItem[APP_LINEITEM_SERIAL] = request.getLineItemValue(APP_LIST, APP_LINEITEM_SERIAL, i);
				curItem[APP_LINEITEM_VENDOR] = request.getLineItemValue(APP_LIST, APP_LINEITEM_VENDOR, i);
				
				//add the record into the list.
				lineItems.push(curItem);
			}
			//Add the array into the parameters
			scheduledParams['custscript_listitems'] = JSON.stringify(lineItems);
			
			//start the scheduled script
			nlapiScheduleScript('customscriptgd_unitappliancesedit_sch', null, scheduledParams);
			
			//display a message on the screen that they will need to wait for the scheduled script to finish before the unit is updated.
			var form = nlapiCreateForm('Modify Unit Appliances', false);
			form.addField("custpage_link", "url", '').setDisplayType("inline").setLinkText("The Unit Appliance update may take a few minutes to complete because of the large number of appliances being processed. Click here to view Unit " + request.getParameter('custpage_unit')).setDefaultValue(nlapiResolveURL('RECORD', 'customrecordrvsunit', unitID));
			response.writePage(form);
			return;
		}
	}
}

/**
 * Scheduled script to process the unit appliances.
 * Takes X parameters:
 * 		List of line items objects
 * 		List of deleted line items
 * 		ID of the Unit being modified
 */
function Scheduled()
{
	var context = nlapiGetContext();
	var unitID = context.getSetting('SCRIPT', 'custscript_unitid');
	var lineItems = context.getSetting('SCRIPT', 'custscript_listitems');
	lineItems = JSON.parse(lineItems);
	
	for (var i = 0; i < lineItems.length; i++)
	{
		//check if the line has an ID. If it does, update the record instead of adding it.
		var curID = lineItems[i][APP_LINEITEM_ID];
		var appRecord = null;
		if(curID != null && curID.length > 0)
		{
			//Update the existing record. It could be that the record got deleted in between when we loaded the record originally in the suitelet, so make sure
			//that if the record doesn't exist, we create a new one.
			try{ appRecord = nlapiLoadRecord(APP_RECORDTYPE, curID); }
			catch(e) { appRecord = nlapiCreateRecord(APP_RECORDTYPE); } 
		}
		else
		{
			//Then submit a new one
			appRecord = nlapiCreateRecord(APP_RECORDTYPE);
		}
		
		//set the values
		appRecord.setFieldValue('custrecordunitappliances_unit', unitID);
		appRecord.setFieldValue('custrecordunitappliances_type', lineItems[i][APP_LINEITEM_TYPE]);
		appRecord.setFieldValue('custrecordunitappliances_desc', lineItems[i][APP_LINEITEM_DESC]);
		appRecord.setFieldValue('custrecordunitappliances_brandname', lineItems[i][APP_LINEITEM_BRAND]);
		appRecord.setFieldValue('custrecordunitappliances_modelnumber', lineItems[i][APP_LINEITEM_MODEL]);
		appRecord.setFieldValue('custrecordunitappliances_serialnumber', lineItems[i][APP_LINEITEM_SERIAL]);
		appRecord.setFieldValue('custrecordvendor', lineItems[i][APP_LINEITEM_VENDOR]);
		
		//submit the record
		nlapiSubmitRecord(appRecord);
	}
	//delete the deleted appliances
	deleteFromArray(context.getSetting('SCRIPT', 'custscript_deleteditems'), APP_RECORDTYPE);
}

/**
 * Deletes all of the items in the specified string value with record type equal to the specified recordType.
 */
function deleteFromArray(stringVal, recordType)
{
	var deletedArray = [];
	if(stringVal != null && stringVal.length > 0)
	{
		try
		{
			deletedArray = JSON.parse(stringVal);
		}
		catch (e)
		{
			deletedArray = [];
		}
	}
	
	for (var i = 0; i < deletedArray.length; i++)
	{
		nlapiDeleteRecord(recordType, deletedArray[i]);
	}
}

/**
 * Creates the edit form for the specified VIN.
 * @param {nlobjForm} form The form to create the fields on.
 * @param {string} unitVIN The VIN that the information will come from.
 * @returns
 */
function createEditForm(form, unitVIN)
{
	//first, create the Unit's body fields. These are read-only
	var filters = new Array();
	filters.push(new nlobjSearchFilter('name', null, 'is', unitVIN));
	var columns = new Array();
	columns.push(new nlobjSearchColumn('internalid'));
	columns.push(new nlobjSearchColumn('custrecordunit_serialnumber'));
	columns.push(new nlobjSearchColumn('custrecordunit_dealer'));
	columns.push(new nlobjSearchColumn('custrecordunit_series'));
	columns.push(new nlobjSearchColumn('custrecordunit_model'));
	columns.push(new nlobjSearchColumn('custrecordunit_location'));
	columns.push(new nlobjSearchColumn('custrecordunit_status'));
	columns.push(new nlobjSearchColumn('custrecordunit_shippingstatus'));
	columns.push(new nlobjSearchColumn('custrecordunit_flooringstatus'));
	var unitResults = nlapiSearchRecord('customrecordrvsunit', null, filters, columns);
	
	//check the results. If no results, return an error.
	if(unitResults == null || unitResults.length == 0)
	{
		form.addField('custpage_error', 'label', 'Error: Could not find information for the specified unit: ' + unitVIN);
		return form;
	}
	//otherwise create the body fields. Make sure they're all disabled.
	form.addFieldGroup('custpage_fgprimary', 'Primary Information');
	var unit = form.addField('custpage_unit', 'text', 'Unit', null, 'custpage_fgprimary');
	unit.setDefaultValue(unitVIN);
	unit.setDisplayType('disabled');
	var serial = form.addField('custpage_serial', 'text', 'Serial Number', null, 'custpage_fgprimary');
	serial.setDefaultValue(unitResults[0].getValue('custrecordunit_serialnumber'));
	serial.setDisplayType('disabled');
	var dealer = form.addField('custpage_dealer', 'text', 'Dealer', null, 'custpage_fgprimary');
	dealer.setDefaultValue(unitResults[0].getText('custrecordunit_dealer'));
	dealer.setDisplayType('disabled');
	var series = form.addField('custpage_series', 'text', 'Series', null, 'custpage_fgprimary');
	series.setDefaultValue(unitResults[0].getText('custrecordunit_series'));
	series.setDisplayType('disabled');
	var model = form.addField('custpage_model', 'text', 'Model', null, 'custpage_fgprimary');
	model.setDefaultValue(unitResults[0].getText('custrecordunit_model'));
	model.setDisplayType('disabled');
	var location = form.addField('custpage_location', 'select', 'Location', 'location', 'custpage_fgprimary');
	location.setDefaultValue(unitResults[0].getValue('custrecordunit_location'));
	location.setDisplayType('disabled');
	var status = form.addField('custpage_status', 'select', 'Production Status', 'customlistrvsunitstatus', 'custpage_fgprimary');
	status.setDefaultValue(unitResults[0].getValue('custrecordunit_status'));
	status.setDisplayType('disabled');
	var sstatus = form.addField('custpage_sstatus', 'select', 'Shipping Status', 'customlistrvsunitshippingstatus', 'custpage_fgprimary');
	sstatus.setDefaultValue(unitResults[0].getValue('custrecordunit_shippingstatus'));
	sstatus.setDisplayType('disabled');
	var fstatus = form.addField('custpage_fstatus', 'select', 'Flooring Status', 'customlistrvsflooringstatus', 'custpage_fgprimary');
	fstatus.setDefaultValue(unitResults[0].getValue('custrecordunit_flooringstatus'));
	fstatus.setDisplayType('disabled');
	var internalIDField = form.addField('custpage_id', 'text', 'Internal ID', null, 'custpage_fgprimary');
	internalIDField.setDefaultValue(unitResults[0].getValue('internalid'));
	internalIDField.setDisplayType('hidden');
	
	//add the sublist to edit the Appliance records
	form.addFieldGroup('custpage_fg_app', 'Appliances');
	//form.addTab('custpage_appliancestab', 'Appliances');
	var appList = form.addSubList(APP_LIST, 'inlineeditor', 'Appliances', 'custpage_fg_app');
	appList.addField(APP_LINEITEM_TYPE, 'select', 'Type', 'customrecordrvsappliancetype');
	appList.addField(APP_LINEITEM_DESC, 'text', 'Description');
	appList.addField(APP_LINEITEM_BRAND, 'text', 'Brand Name');
	appList.addField(APP_LINEITEM_MODEL, 'text', 'Model #');
	appList.addField(APP_LINEITEM_SERIAL, 'text', 'Serial #');
	appList.addField(APP_LINEITEM_VENDOR, 'select', 'Vendor', 'vendor');
	var appID = appList.addField(APP_LINEITEM_ID, 'text', 'Internal ID');
	appID.setDisplayType('hidden');
	//Do a search for all Appliances for the current unit.
	var appfilters = new Array();
	appfilters.push(new nlobjSearchFilter('internalid', 'custrecordunitappliances_unit', 'is', unitResults[0].getValue('internalid')));
	var appcolumns = new Array();
	var sortedCol = new nlobjSearchColumn('custrecordunitappliances_type');
	sortedCol.setSort();
	appcolumns.push(sortedCol);
	appcolumns.push(new nlobjSearchColumn('internalid'));
	appcolumns.push(new nlobjSearchColumn('custrecordunitappliances_desc'));
	appcolumns.push(new nlobjSearchColumn('custrecordunitappliances_brandname'));
	appcolumns.push(new nlobjSearchColumn('custrecordunitappliances_modelnumber'));
	appcolumns.push(new nlobjSearchColumn('custrecordunitappliances_serialnumber'));
	appcolumns.push(new nlobjSearchColumn('custrecordvendor'));
	var appResults = nlapiSearchRecord(APP_RECORDTYPE, null, appfilters, appcolumns);
	//loop over all of the existing Appliances and add them into the sublist
	if(appResults != null)
	{
		for (var i = 0; i < appResults.length; i++)
		{
			appList.setLineItemValue(APP_LINEITEM_TYPE, i+1, appResults[i].getValue('custrecordunitappliances_type'));
			appList.setLineItemValue(APP_LINEITEM_DESC, i+1, appResults[i].getValue('custrecordunitappliances_desc'));
			appList.setLineItemValue(APP_LINEITEM_BRAND, i+1, appResults[i].getValue('custrecordunitappliances_brandname'));
			appList.setLineItemValue(APP_LINEITEM_MODEL, i+1, appResults[i].getValue('custrecordunitappliances_modelnumber'));
			appList.setLineItemValue(APP_LINEITEM_SERIAL, i+1, appResults[i].getValue('custrecordunitappliances_serialnumber'));
			appList.setLineItemValue(APP_LINEITEM_VENDOR, i+1, appResults[i].getValue('custrecordvendor'));
			appList.setLineItemValue(APP_LINEITEM_ID, i+1, appResults[i].getValue('internalid'));
		}
	}

	/*
	//add the sublist for the QA Tests
	form.addTab('custpage_qatab', 'QA Tests');
	var qaList = form.addSubList(QA_LIST, 'inlineeditor', 'QA Tests', 'custpage_qatab');
	qaList.addField(QA_LINEITEM_TEMPLATE, 'select', 'QA Test Template', 'customrecordrvsqatesttemplate');
	qaList.addField(QA_LINEITEM_VERSION, 'select', 'Version', 'customrecordrvsqatestversion');
	qaList.addField(QA_LINEITEM_DATE, 'date', 'Date');
	qaList.addField(QA_LINEITEM_USER, 'select', 'User', 'employee');
	qaList.addField(QA_LINEITEM_HOLD, 'checkbox', 'Systems Hold');
	var qaID = qaList.addField(QA_LINEITEM_ID, 'text', 'Internal ID');
	qaID.setDisplayType('hidden');
	//Do a search for all QA Tests for the current unit. We do this because QA Tests are not "sublists" on the Unit.
	var qafilters = new Array();
	qafilters.push(new nlobjSearchFilter('internalid', 'custrecordqatest_unit', 'is', unitResults[0].getValue('internalid')));
	var qacolumns = new Array();
	qacolumns.push(new nlobjSearchColumn('internalid'));
	qacolumns.push(new nlobjSearchColumn('custrecordqatest_qatesttemplate'));
	qacolumns.push(new nlobjSearchColumn('custrecordqatest_version'));
	qacolumns.push(new nlobjSearchColumn('custrecordqatest_date'));
	qacolumns.push(new nlobjSearchColumn('custrecordqatest_user'));
	qacolumns.push(new nlobjSearchColumn('custrecordqatest_systemshold'));
	var qaResults = nlapiSearchRecord(QA_RECORDTYPE, null, qafilters, qacolumns);
	//Loop over all of the existing QA Tests and add them into the sublist
	if(qaResults != null)
	{
		for (var i = 0; i < qaResults.length; i++)
		{
			qaList.setLineItemValue(QA_LINEITEM_TEMPLATE, i+1, qaResults[i].getValue('custrecordqatest_qatesttemplate'));
			qaList.setLineItemValue(QA_LINEITEM_VERSION, i+1, qaResults[i].getValue('custrecordqatest_version'));
			qaList.setLineItemValue(QA_LINEITEM_DATE, i+1, qaResults[i].getValue('custrecordqatest_date'));
			qaList.setLineItemValue(QA_LINEITEM_USER, i+1, qaResults[i].getValue('custrecordqatest_user'));
			qaList.setLineItemValue(QA_LINEITEM_HOLD, i+1, qaResults[i].getValue('custrecordqatest_systemshold'));
			qaList.setLineItemValue(QA_LINEITEM_ID, i+1, qaResults[i].getValue('internalid'));
		}
	}
	var qaIdList = form.addField(QA_DELETED_IDS, 'longtext', 'Deleted QA IDs');
	qaIdList.setDisplayType('hidden');
	*/
	
	//Add the submit button.
	form.addSubmitButton('Save');
	
	//Add the list to keep track of the appliance and QA test records that have been deleted.
	var appIdList = form.addField(APP_DELETED_IDS, 'longtext', 'Deleted App IDs');
	appIdList.setDisplayType('hidden');
	
	//set up the client side script to update these text fields whenever a line item is deleted.
	form.setScript('customscriptgd_unitappliancesedit_client');
	
	return form;
}


/**
 * Saves the current line item's ID into the list of IDs for that line item type.
 *   
 * @param {String} type Sublist internal id
 * @returns {Boolean} True to continue line item delete, false to abort delete
 */
function clientValidateDelete(type)
{
	//determine if this is a qa or appliance line
	var listID = APP_DELETED_IDS;
	var itemID = APP_LINEITEM_ID;
	if(type == QA_LIST)
	{
		listID = QA_DELETED_IDS;
		itemID = QA_LINEITEM_ID;
	}
	
	//load the current array.
	var stringVal = nlapiGetFieldValue(listID);
	var deletedArray = [];
	if(stringVal != null && stringVal.length > 0)
	{
		try
		{
			deletedArray = JSON.parse(stringVal);
		}
		catch (e)
		{
			deletedArray = [];
		}
	}
	
	//Add the item into the array.
	var lineID = nlapiGetCurrentLineItemValue(type, itemID);
	if (lineID != null && lineID.length > 0)
	{
		deletedArray.push(lineID);
	}
	
	//reset the array into the field
	nlapiSetFieldValue(listID, JSON.stringify(deletedArray), false, true);
	
	return true;
}

