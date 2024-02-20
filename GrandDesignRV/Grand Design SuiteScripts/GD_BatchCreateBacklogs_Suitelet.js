/**
 * BatchCreateWorkOrderSuitelet - Custom page to create work orders from unit sales orders
 * 
 * Version    Date            Author           Remarks
 * 1.00       1 Nov 2011     Nathan Horner
 *
 */

/**
 * Name: BatchCreateWorkOrderSuitelet
 * Description: Creates a Suitelet for batch creating work orders.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function BatchCreateBacklogsSuitelet(request, response)
{
	var batchCreateBacklogRecord = nlapiLoadRecord('customrecordrvsbatchbacklogcreate', GetBatchBacklogCreateRecordId(), null);
	var batchCreateBacklogStatusId = batchCreateBacklogRecord.getFieldValue('custrecordbatchbacklogcreate_status');
	
	if (request.getMethod() == 'GET')
	{
		var form = nlapiCreateForm('Batch Create Backlogs', false);
		
		form.addTab('custpage_tabcreatebacklogs', 'Create Backlogs');
		
		// if we are "open", show a list of orders to backlog
		if (batchCreateBacklogStatusId == BATCH_CREATE_BACKLOG_STATUS_OPEN)
		{
			var fg = form.addFieldGroup('custpage_fgfilters', 'Filters', null);
			fg.setSingleColumn(true);
			
			// if location isn't set to "NONE" then give the user a chance to filter by location and model
			var locationId = request.getParameter('custparam_locationid');
			var seriesId = request.getParameter('custparam_seriesid');
			var modelId = request.getParameter('custparam_modelid');
			var modelIdArray = JSON.stringify(modelId).replace(/"/g, '');
			modelIdArray = modelIdArray.split('\\u0005');
			
			var locationField = form.addField('custpage_location', 'select', 'Location', 'location', 'custpage_fgfilters');
			var seriesField = form.addField('custpage_series', 'select', 'Series', 'customrecordrvsseries', 'custpage_fgfilters');
			var modelField = form.addField('custpage_model', 'multiselect', 'Model', null, 'custpage_fgfilters');
			modelField.setDisplaySize(300, 10);
			modelField.addSelectOption('', '', true);
			
			// get all the models and add them to the list
			var modelFilters = new Array();
			modelFilters[modelFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F', null);
			modelFilters[modelFilters.length] = new nlobjSearchFilter('custitemrvsitemtype', null, 'is', ITEM_CATEGORY_MODEL, null);
			modelFilters[modelFilters.length] = new nlobjSearchFilter('custitemrvsdiscontinuedmodel', null, 'is', 'F', null);
			
			var modelCols = new Array();
			var modelCol = new nlobjSearchColumn('itemid', null, null);
			modelCol.setSort();
			modelCols[modelCols.length] = modelCol;
			
			var modelResults = nlapiSearchRecord('assemblyitem', null, modelFilters, modelCols);
			
			if (modelResults != null)
			{
				for (var i=0; i<modelResults.length; i++)
				{
					modelField.addSelectOption(modelResults[i].getId(), modelResults[i].getValue('itemid'), false);
				}
			}
			
			// location is null so give the user a chance to filter by location, series, or model
			if (locationId == null)
			{
				// use this variable to know if we are in "pre-load" meaning we want them to choose their filters
				// this just tells us where we are at when they submit the form
				var preLoadField = form.addField('custpage_preload', 'checkbox', 'Preload?', null, null);
				preLoadField.setDisplayType('hidden');
				preLoadField.setDefaultValue('T');
				
				form.addSubmitButton('Get Backlogs');
			}
			else
			{
				locationField.setDisplayType('inline');
				seriesField.setDisplayType('inline');
				modelField.setDisplayType('inline');
				
				var backlogFilters = new Array();
				
				// if the fields aren't set to NONE then do the filters
				if (locationId != 'NONE')
				{					
					backlogFilters[backlogFilters.length] = new nlobjSearchFilter('location', null, 'is', locationId, null);
					locationField.setDefaultValue(locationId);
				}
				
				if (seriesId != 'NONE')
				{
					backlogFilters[backlogFilters.length] = new nlobjSearchFilter('custbodyrvsseries', null, 'is', seriesId, null);
					seriesField.setDefaultValue(seriesId);
				}
				
				if (modelId != 'NONE')
				{
					backlogFilters[backlogFilters.length] = new nlobjSearchFilter('custbodyrvsmodel', null, 'anyof', modelIdArray, null);
					modelField.setDefaultValue(modelId);
				}
				
				var sublist = form.addSubList('custpage_sublistcreatebacklogs', 'list', 'Create Backlogs', 'custpage_tabcreatebacklogs');
				sublist.addMarkAllButtons();
				
				sublist.addField('custpage_subcreatebacklog', 'checkbox', 'Create Backlog');
				
				var orderNumField = sublist.addField('custpage_subordernumber', 'text', 'Order Number');
				orderNumField.setDisplayType('inline');	
				
				var dateField = sublist.addField('custpage_subdate', 'text', 'Date');
				dateField.setDisplayType('inline');
				
				var dealerField = sublist.addField('custpage_subdealer', 'text', 'Dealer');
				dealerField.setDisplayType('inline');	
				
				var retailNameField = sublist.addField('custpage_subretailname', 'text', 'Order Retail Name');
				retailNameField.setDisplayType('inline');
				
				var unitField = sublist.addField('custpage_subunit', 'text', 'Unit');
				unitField.setDisplayType('inline');	
				
				var seriesField = sublist.addField('custpage_subseries', 'text', 'Series');
				seriesField.setDisplayType('inline');	
				
				var modelField = sublist.addField('custpage_submodel', 'text', 'Model');
				modelField.setDisplayType('inline');	
				
				var amountField = sublist.addField('custpage_subamount', 'currency', 'Amount');
				amountField.setDisplayType('inline');
				
				var locationField = sublist.addField('custpage_sublocation', 'text', 'Location');
				locationField.setDisplayType('inline');	
				
				var dealerRefundIdField = sublist.addField('custpage_orderid', 'integer');
				dealerRefundIdField.setDisplayType('hidden');
				
				form.addSubmitButton('Create Backlogs');
				
				var backlogsToCreateResults = GetSearchResults('salesorder', 'customsearchorderstobacklog', backlogFilters, null, 'internalid'); //nlapiSearchRecord('salesorder', 'customsearchorderstobacklog', null, null);
				
				if (backlogsToCreateResults != null)
				{
					// the search is sorted by internal id so now we need to sort by date and then order number
					backlogsToCreateResults = backlogsToCreateResults.sort(SortOrders);
					
					for (var i = 0; i < backlogsToCreateResults.length; i++) 
					{
						var date = backlogsToCreateResults[i].getValue('trandate');
						var orderInternalId = backlogsToCreateResults[i].getId();
						var number = backlogsToCreateResults[i].getValue('tranid');
						var dealerId = backlogsToCreateResults[i].getValue('entity');
						var dealerName = backlogsToCreateResults[i].getText('entity');
						var retailSoldName = ConvertNSFieldToString(backlogsToCreateResults[i].getValue('custbodyrvsretailsoldname'));
						var unitId = backlogsToCreateResults[i].getValue('custbodyrvsunit');
						var unitName = backlogsToCreateResults[i].getText('custbodyrvsunit');
						var seriesName = backlogsToCreateResults[i].getText('custbodyrvsseries');
						var modelName = backlogsToCreateResults[i].getText('custbodyrvsmodel');
						var amount = backlogsToCreateResults[i].getValue('total');
						var location = backlogsToCreateResults[i].getText('location');
						
						var dealerURL = nlapiResolveURL('RECORD', 'customer', dealerId, 'VIEW');
						var orderURL = nlapiResolveURL('RECORD', 'salesorder', orderInternalId, 'VIEW');
						var unitURL = nlapiResolveURL('RECORD', 'customrecordrvsunit', unitId, 'VIEW');
						
						sublist.setLineItemValue('custpage_subcreatebacklog', i+1, 'F');
						sublist.setLineItemValue('custpage_subdealer', i+1, '<a target="_blank" href="' + dealerURL + '">' + dealerName + '</a>');
						sublist.setLineItemValue('custpage_subdate', i+1, date);
						sublist.setLineItemValue('custpage_subordernumber', i+1, '<a target="_blank" href="' + orderURL + '"> Sales Order #' + number + '</a>');
						sublist.setLineItemValue('custpage_subunit', i+1, '<a target="_blank" href="' + unitURL + '">' + unitName + '</a>');
						sublist.setLineItemValue('custpage_subseries', i+1, seriesName);
						sublist.setLineItemValue('custpage_submodel', i+1, modelName);
						sublist.setLineItemValue('custpage_subamount', i+1, amount);
						sublist.setLineItemValue('custpage_sublocation', i+1, location);
						sublist.setLineItemValue('custpage_orderid', i+1, orderInternalId);
						sublist.setLineItemValue('custpage_subretailname', i+1, retailSoldName);
					}
				}
			}	
		}
		else if (batchCreateBacklogStatusId == BATCH_CREATE_BACKLOG_STATUS_PROCESSING)
		{
			// if we are processing, show the user a message with the percentage complete and the status
			var fieldGroup = form.addFieldGroup('custpage_fieldgroup', '&nbsp;');
			fieldGroup.setSingleColumn(true);
			
			var infoField = form.addField('custpage_info', 'text', '&nbsp;', null, 'custpage_fieldgroup');
			infoField.setDisplayType('inline');			
			infoField.setDefaultValue('Please wait while backlogs are being created. Click the refresh button to refresh the page.');
			
			var statusField = form.addField('custpage_status', 'text', 'Status', null, 'custpage_fieldgroup');
			statusField.setDisplayType('inline');
			
			var statusText = batchCreateBacklogRecord.getFieldText('custrecordbatchbacklogcreate_status');
			statusField.setDefaultValue(statusText);
			
			var percentageCompleteField = form.addField('custpage_percentagecomplete', 'text', 'Percentage Complete', null, 'custpage_fieldgroup');
			percentageCompleteField.setDisplayType('inline');
			
			var percentageComplete = batchCreateBacklogRecord.getFieldValue('custrecordbatchbacklogcreate_percentcomp');
			percentageCompleteField.setDefaultValue(percentageComplete);
			
			form.addSubmitButton('Refresh');
		}
		
		response.writePage(form);
	}
	else
	{		
		var preLoad = request.getParameter('custpage_preload');
		if (preLoad == 'T')
		{
			var params = new Array();
			
			var locationId = request.getParameter('custpage_location');
			params['custparam_locationid'] = 'NONE';
			if (locationId != '')
			{
				params['custparam_locationid'] = locationId;
			}
			
			var seriesId = request.getParameter('custpage_series');
			params['custparam_seriesid'] = 'NONE';
			if (seriesId != '')
			{
				params['custparam_seriesid'] = seriesId;
			}
			
			var modelId = request.getParameter('custpage_model');
			params['custparam_modelid'] = 'NONE';
			if (modelId != '')
			{
				params['custparam_modelid'] = modelId;
			}
			
			nlapiSetRedirectURL('SUITELET', 'customscriptgd_batchcreatebacklogs_suite', 'customdeploygd_batchcreatebacklogs_suite', null, params);
		}
		else
		{
			// only schedule if the status is open
			if (batchCreateBacklogStatusId == BATCH_CREATE_BACKLOG_STATUS_OPEN)
			{
				var lineCount = request.getLineItemCount('custpage_sublistcreatebacklogs');
				var orderIds = new Array();
				
				// loop through and set the order Ids array
				for (var i=1; i<=lineCount; i++)
				{
					if (request.getLineItemValue('custpage_sublistcreatebacklogs', 'custpage_subcreatebacklog', i) == 'T')
					{
						orderIds[orderIds.length] = request.getLineItemValue('custpage_sublistcreatebacklogs', 'custpage_orderid', i);
					}
				}
				
				// only continue if there are orders selected
				if (orderIds.length > 0)
				{
					batchCreateBacklogRecord.setFieldValues('custrecordbatchbacklogcreate_salesorders', orderIds);
					batchCreateBacklogRecord.setFieldValue('custrecordbatchbacklogcreate_percentcomp', 0);
					batchCreateBacklogRecord.setFieldValue('custrecordbatchbacklogcreate_date', nlapiDateToString(new Date(), 'datetimetz'));
					batchCreateBacklogRecord.setFieldValue('custrecordbatchbacklogcreate_status', BATCH_CREATE_BACKLOG_STATUS_PROCESSING);
					nlapiSubmitRecord(batchCreateBacklogRecord, true, false);
					
					// now kick off the scheduled script
					nlapiScheduleScript('customscriptbatchcreatebacklogsscheduled', 'customdeploybatchcreatebacklogsschdeploy', null);
				}
			}
			
			// always renavigate back to this suitelet
			nlapiSetRedirectURL('SUITELET', 'customscriptgd_batchcreatebacklogs_suite', 'customdeploygd_batchcreatebacklogs_suite');
		}
	}
}

/**
 * Sort the order results by date and number
 * @param result1
 * @param result2
 */
function SortOrders(result1, result2)
{
	var date1 = result1.getValue('tranddate');
	var date2 = result2.getValue('tranddate');
	var tranNumber1 = result1.getValue('tranid');
	var tranNumber2 = result2.getValue('tranid');
	
	if (date1 == date2)
	{
		return tranNumber1 - tranNumber2;
	}
	else
	{
		return nlapiStringToDate(date1) - nlapiStringToDate(date2);
	}
}