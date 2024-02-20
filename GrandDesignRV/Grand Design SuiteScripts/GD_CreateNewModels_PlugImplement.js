/**
 * GD Specific Plugin for Scheduled script that copies Models based on the submission of the Copy Models to New Model Year suitelet 
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Jan 2020     Jeffrey Bajit
 *
 */

/**
 * GD Specific plugin entry point
 * 
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function RVS_CreateNewModelsSched_Plug(type)
{
	//Get the parameters from the suitelet
	var params = JSON.parse(nlapiGetContext().getSetting('script', 'custscriptrvs_createnewmodelsdata'));
	var series = params.series;
	var modelLines = params.modelLines;
	var oldYear = params.oldYear;
	var newYear = params.newYear;
	var isDiscontinued = params.isDiscontinued;
	var findReplaceArr = params.findReplace;
	
	//Search for the Models that should be updated.
	var cols = [new nlobjSearchColumn('custitemrvs_modelline'),
	            new nlobjSearchColumn('itemid'),
	            new nlobjSearchColumn('displayname')/*,
	            new nlobjSearchColumn('isserialitem')*/];
	var filters = '';
	filters = [
			   ['custitemrvsitemtype','anyof',ITEM_CATEGORY_MODEL], 
			   'AND', 
			   ['custitemrvsmodelyear','anyof', oldYear],
			   'AND',
			   ['custitemrvs_modelline','noneof', '@NONE@'],
			   'AND',
			   ['isinactive','is', 'F']
			];
	if(series != null && series.length > 0)
	{
		filters.push('AND');
		filters.push(['custitemrvsmodelseries','anyof',series]);
	}
	if(modelLines != null && modelLines.length > 0)
	{
		filters.push('AND');
		filters.push(['custitemrvs_modelline','anyof',modelLines]);
	}
	var modelLinesToUpdate = GetSteppedSearchResults('item', filters, cols) || [];  // added this so if the search returns empty array, the if condition checks also for empty array.
	if(modelLinesToUpdate.length > 0)
	{
		var allModelLines = [];
		for(var i = 0; i < modelLinesToUpdate.length; i++) allModelLines.push(modelLinesToUpdate[i].getValue('custitemrvs_modelline'));
		//Get Model Lines that already have models in the New Year. We shouldn't create Models for these Model Lines.
		var alreadyUpdatedModelResults = nlapiSearchRecord('item', null, [new nlobjSearchFilter('custitemrvs_modelline', null, 'anyof', allModelLines),
		                                                                  new nlobjSearchFilter('custitemrvsmodelyear', null, 'is', newYear)], new nlobjSearchColumn('custitemrvs_modelline'));
		var alreadyUpdateModelLines = [];
		if(alreadyUpdatedModelResults != null)
		{
			for(var i = 0; i < alreadyUpdatedModelResults.length; i++) alreadyUpdateModelLines.push(alreadyUpdatedModelResults[i].getValue('custitemrvs_modelline'));
		}
		
		//Create the New Models for the Model Lines for the Models.
		for(var i = 0; i < modelLinesToUpdate.length; i++)
		{
			//For each Model Line, make sure there isn't already a Unit with the new Model Year set up for that line.
			var curModelLine = modelLinesToUpdate[i].getValue('custitemrvs_modelline');
			if(alreadyUpdateModelLines.indexOf(curModelLine) < 0)
			{
				//Determine what type of assembly we're loading - either assembly or serializedassembly
				var assemblyItemType = /*modelLinesToUpdate[i].getValue('isserialitem') == 'T' ? 'serializedassemblyitem' : */'assemblyitem';
				
				//Copy the Model and update the body fields
				var oldModel = nlapiLoadRecord(assemblyItemType, modelLinesToUpdate[i].getId());
				var newModel = nlapiCopyRecord(assemblyItemType, modelLinesToUpdate[i].getId(), {recordmode: 'dynamic'});
				newModel.setFieldValue('custitemrvsmodelyear', newYear);
				newModel.setFieldValue('displayname', modelLinesToUpdate[i].getValue('displayname'));
				newModel.setFieldValue('itemid', modelLinesToUpdate[i].getValue('itemid'));
				newModel.setFieldValue('custitemrvsdiscontinuedmodel', isDiscontinued ? 'T' : 'F');
				newModel.setFieldValue('isinactive', 'F');
				
				//Find and Replace the text to update in the new Model.
				newModel.setFieldValue('itemid', RVS_CreateNewModelsSched_FindReplaceText(newModel.getFieldValue('itemid'), findReplaceArr));
				newModel.setFieldValue('displayname', RVS_CreateNewModelsSched_FindReplaceText(newModel.getFieldValue('displayname'), findReplaceArr));
				newModel.setFieldValue('description', RVS_CreateNewModelsSched_FindReplaceText(newModel.getFieldValue('description'), findReplaceArr));
				newModel.setFieldValue('purchasedescription', RVS_CreateNewModelsSched_FindReplaceText(newModel.getFieldValue('purchasedescription'), findReplaceArr));
				newModel.setFieldValue('stockdescription', RVS_CreateNewModelsSched_FindReplaceText(newModel.getFieldValue('stockdescription'), findReplaceArr));
				newModel.setFieldValue('custitemrvsmsomodel', RVS_CreateNewModelsSched_FindReplaceText(newModel.getFieldValue('custitemrvsmsomodel'), findReplaceArr));
				var newModelId = nlapiSubmitRecord(newModel, true, true);
				
				//Now set the sublists. You can't do this on copy, so load the record again to update this information.
				newModel = nlapiLoadRecord(assemblyItemType, newModelId, {recordmode: 'dynamic'});
				//Copy the Model Options
				for(var j = 1; j <= oldModel.getLineItemCount('recmachcustrecordmodeloption_model'); j++)
				{
					newModel.selectNewLineItem('recmachcustrecordmodeloption_model');
					newModel.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_option', oldModel.getLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_option', j));
					newModel.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_optiondescription', oldModel.getLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_optiondescription', j));
					newModel.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_quantity', oldModel.getLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_quantity', j));
					newModel.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_mandatory', oldModel.getLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_mandatory', j));
					newModel.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_optionbomassembly', oldModel.getLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_optionbomassembly', j));
					newModel.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_sortorder', oldModel.getLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_sortorder', j));
					newModel.setCurrentLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_standard', oldModel.getLineItemValue('recmachcustrecordmodeloption_model', 'custrecordmodeloption_standard', j));
					newModel.commitLineItem('recmachcustrecordmodeloption_model');
				}
				
				//Copy the RVS Sequence Components
				for(var j = oldModel.getLineItemCount('member'); j > 0; j--)
				{
					newModel.removeLineItem('member', j);
				}
				for(var j = 1; j <= oldModel.getLineItemCount('member'); j++)
				{
					newModel.selectNewLineItem('member');
					newModel.setCurrentLineItemValue('member', 'item', oldModel.getLineItemValue('member', 'item', j));
					newModel.setCurrentLineItemValue('member', 'quantity', oldModel.getLineItemValue('member', 'quantity', j));
					newModel.setCurrentLineItemValue('member', 'effectivedate', oldModel.getLineItemValue('member', 'effectivedate', j));
					newModel.setCurrentLineItemValue('member', 'obsoletedate', oldModel.getLineItemValue('member', 'obsoletedate', j));
					newModel.commitLineItem('member');
				}
				
				//Copy the Appliance Templates
				for(var j = 1; j <= oldModel.getLineItemCount('recmachcustrecordunitappliancetemplate_model'); j++)
				{
					newModel.selectNewLineItem('recmachcustrecordunitappliancetemplate_model');
					newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_type', oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_type', j));
					newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_desc', oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_desc', j));
					newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_brand', oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_brand', j));
					newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_modelnum', oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_modelnum', j));
					newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_vendor', oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordunitappliancetemplate_vendor', j));
					//To set the APPLIANCE CATEGORY on Unit Appliance Template
					newModel.setCurrentLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordgd_unitappliancetemplate_categ', oldModel.getLineItemValue('recmachcustrecordunitappliancetemplate_model', 'custrecordgd_unitappliancetemplate_categ', j));
					newModel.commitLineItem('recmachcustrecordunitappliancetemplate_model');
				}
				
				//Submit the record
				nlapiSubmitRecord(newModel, true, true);
			}
			
			//Set percent complete, yield if necessary.
			nlapiGetContext().setPercentComplete(((i+1)/modelLinesToUpdate.length)*100);
			if(nlapiGetContext().getRemainingUsage() < 100) nlapiYieldScript();
		}
	}
}

/**
 * Replaces text in the text variable with the findText and replaceText properties in the objects of the findReplaceArr
 * 
 * @param {String} text
 * @param {Array} findReplaceArr
 * @returns {String} New value of text.
 */
function RVS_CreateNewModelsSched_FindReplaceText(text, findReplaceArr)
{
	if(text != null)
	{
		for(var i = 0; i < findReplaceArr.length; i++)
		{
			text = text.replace(new RegExp(findReplaceArr[i].findText, 'g'), findReplaceArr[i].replaceText);
		}
	}
	return text;
}