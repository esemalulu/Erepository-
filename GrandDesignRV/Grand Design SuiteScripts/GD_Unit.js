/**
 * Unit code for Grand Design
 * 
 * Version    Date            Author           Remarks
 * 1.00       7 Jun 2016     Jacob Shetler
 *
 */

/**
 * Before Load
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */

function GD_Unit_BeforeLoad(type, form, request)
{
	
	if(type == 'view')
	{
		//generates HTML to inform user of Customer Satisfaction Recalls or standard Recalls
		
		var recallSearchResults = GetUnitRecallSearchResults(nlapiGetRecordId());
		
		if (recallSearchResults.length > 0)
		{
			//get the flatRateField defined in Company Preferences
			//in GD this is the flat rate description
			var flatRateField = ConvertNSFieldToString(GetClaimRecallAlertField());

			var customerSatisfactionHtml = '';
			var recallHtml = '';

			//define boolean values representing the presence of recall types
			var thisUnitHasRecall = false;
			var thisUnitHasCustomerSatisfactionRecall = false;
			
			for (var i = 0; i < recallSearchResults.length; i++)
			{
				//get the type code to check what sort of recall this is
				var typeCode = recallSearchResults[i].getValue('custrecordgd_flatratecode_type', 'custrecordrecallunit_recallcode');	
			
				//get the name and description of the flat rate code
				var flatRateName = recallSearchResults[i].getValue('name', 'custrecordrecallunit_recallcode');
				if (flatRateField.length > 0) flatRateName += ' - ' + recallSearchResults[i].getValue(flatRateField, 'custrecordrecallunit_recallcode');
				
				if(typeCode == GD_FLATRATECODE_TYPE_CUSTOMERSATISFACTION)
				{
					thisUnitHasCustomerSatisfactionRecall = true;
					customerSatisfactionHtml += '<li><span style="font-size:12px;font-weight:bold;color:green;">' + flatRateName + '</span></li>';
				}
				else
				{
					thisUnitHasRecall = true;
					recallHtml += '<li><span style="font-size:12px;font-weight:bold;color:red;">' + flatRateName + '</span></li>';
				}
			}
			
			if(thisUnitHasCustomerSatisfactionRecall)
			{
				customerSatisfactionHtml = '<span style="font-size:16px;font-weight:bold;color:green;">This unit is subject to Customer Satisfaction Campaign(s): </span><ul>'
					+ customerSatisfactionHtml + "</ul>";	
			}
			
			if(thisUnitHasRecall) 
			{
				recallHtml = '<span style="font-size:16px;font-weight:bold;color:red;">This unit has open recalls and must be repaired according<br />to Federal Law before customer takes delivery.</span><ul>'
						+ recallHtml + "</ul>";
			}
			
			var html = recallHtml + "<br>" + customerSatisfactionHtml;
			
			//set the HTML on the field on the unit so it appears for the user
			nlapiSetFieldValue('custrecordunit_gdrecallalert', html);
		}
	}
}

/**
 * After submit, check if the DPU field needs to be unset.
 * @appliedtorecord customrecordrvsunit
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function GD_Unit_AfterSubmit(type) {
	
	if (type == 'xedit') {
		var oldRecord = nlapiGetOldRecord();
		var currentRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var dpuCheckboxField =  currentRecord.getFieldValue('custrecordunit_gd_dpu');
		if (oldRecord.getFieldValue('custrecordunit_shipdate') != currentRecord.getFieldValue('custrecordunit_shipdate') && dpuCheckboxField != 'F') {
			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordunit_gd_dpu', 'F');
		}
	}
}

/**
 * Returns list of search results for open recalls against a given unit
 * @param unitId
 */
function GetUnitRecallSearchResults(unitId)
{
	var claimCol = new nlobjSearchColumn('custrecordrecallunit_claim');
	claimCol.setSort(true);
	var columns = [claimCol, new nlobjSearchColumn('name', 'custrecordrecallunit_recallcode')];
	var flatRateField = ConvertNSFieldToString(GetClaimRecallAlertField());
	
	if (flatRateField.length > 0) columns.push(	new nlobjSearchColumn(flatRateField, 'custrecordrecallunit_recallcode'), 
												new nlobjSearchColumn('custrecordrecallunit_recallcode'),
												new nlobjSearchColumn('custrecordgd_flatratecode_type', 'custrecordrecallunit_recallcode'));
										
	var unitSearchResults = nlapiSearchRecord('customrecordrvs_recallunit', null, [new nlobjSearchFilter('custrecordrecallunit_unit', null, 'is', unitId),
	                                                                               new nlobjSearchFilter('isinactive', 'custrecordrecallunit_recallcode', 'is', 'false'),
																				   new nlobjSearchFilter('custrecordrecallunit_status', null, 'is', 'Open'),
	                                                                               /*new nlobjSearchFilter('custrecordrecallunit_claim', null, 'anyof', '@NONE@')*/], columns);
	if (unitSearchResults != null && unitSearchResults.length > 0) return unitSearchResults;
	return [];
}

/**
 * Create the PCN Search tab
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function RVSPCNUnitPlugin_addPCNUnitTab(type, form, request)
{
	//Create the tab regardless
	form.addTab('custpage_gd_pcntab', 'PCNs');
	
	//Have to make sure that the model and series are set if we're creating the sublist.
	var unitId = ConvertNSFieldToString(nlapiGetRecordId());
	var seriesId = ConvertNSFieldToString(nlapiGetFieldValue('custrecordunit_series'));
	var modelId = ConvertNSFieldToString(nlapiGetFieldValue('custrecordunit_model'));
	if (unitId.length > 0 && seriesId.length > 0 && modelId.length > 0)
	{
		var pcnSublist = form.addSubList('custpage_pcnsublist', 'list', 'PCN List', 'custpage_gd_pcntab');
		pcnSublist.addField('custpage_pcnid', 'text', 'PCN #');
		pcnSublist.addField('custpage_pcntype', 'text', 'PCN Type');
		pcnSublist.addField('custpage_pcnstatus', 'text', 'Status');
		pcnSublist.addField('custpage_pcnreqdate', 'date', 'Requested Date');
		pcnSublist.addField('custpage_pcnsubject', 'textarea', 'Subject');
		
		//Do the search. Filter based on the Location, Series, Model, and Serial Number range of the PCN Unit.
		//Join out to the parent PCN for the search columns
		var serialNum = nlapiGetFieldValue('custrecordunit_serialnumber');
		if (!IsNumeric(serialNum)) return;
		var filterExp = [['custrecordpcnunits_plant', 'anyof', nlapiGetFieldValue('custrecordunit_location')], 'AND',
		                 ['custrecordpcnunits_pcn.custrecordproductchangenotice_status', 'is', GD_PCNSTATUS_COMPLETE], 'AND',
		                 ['custrecordpcnunits_pcn.custrecordproductchangenotice_series', 'anyof', seriesId], 'AND',
		                 ['custrecordpcnunits_pcn.custrecordproductchangenotice_models', 'anyof', modelId], 'AND',
		                 [['custrecordpcnunits_unit', 'anyof', '@NONE@'], 'OR', ['formulanumeric: TO_NUMBER({custrecordpcnunits_unit.custrecordunit_serialnumber})', 'lessthanorequalto', serialNum]], 'AND',
		                 [['custrecordpcnunits_endunit', 'anyof', '@NONE@'], 'OR', ['formulanumeric: TO_NUMBER({custrecordpcnunits_endunit.custrecordunit_serialnumber})', 'greaterthanorequalto', serialNum]]];
		var pcnResults = GetSteppedSearchResults('customrecordrvspcnunits', filterExp, [new nlobjSearchColumn('custrecordpcnunits_pcn'),
		                                                                              new nlobjSearchColumn('internalid', 'custrecordpcnunits_pcn'),
		                                                                              new nlobjSearchColumn('name', 'custrecordpcnunits_pcn'),
		                                                                              new nlobjSearchColumn('custrecordgd_pcntype', 'custrecordpcnunits_pcn'),
		                                                                              new nlobjSearchColumn('custrecordproductchangenotice_status', 'custrecordpcnunits_pcn'),
		                                                                              new nlobjSearchColumn('custrecordproductchangenotice_reqdate', 'custrecordpcnunits_pcn'),
		                                                                              new nlobjSearchColumn('custrecordgd_pcnsubject', 'custrecordpcnunits_pcn')]);

		//Add the search results into the sublist. Make sure we only do each PCN once.
		if (pcnResults != null)
		{
			var usedPCNs = [];
			var curSublistIdx = 1;
			for (var i = 0; i < pcnResults.length; i++)
			{
				var pcnId = pcnResults[i].getValue('internalid', 'custrecordpcnunits_pcn');
				if (usedPCNs.indexOf(pcnId) == -1)
				{
					usedPCNs.push(pcnId);
					pcnSublist.setLineItemValue('custpage_pcnid', curSublistIdx, '<a href="' + nlapiResolveURL('record', 'customrecordrvsproductchangenotice', pcnResults[i].getValue('custrecordpcnunits_pcn'), 'view') + '">' + pcnResults[i].getValue('name', 'custrecordpcnunits_pcn') + '</a>');
					pcnSublist.setLineItemValue('custpage_pcntype', curSublistIdx, pcnResults[i].getText('custrecordgd_pcntype', 'custrecordpcnunits_pcn'));
					pcnSublist.setLineItemValue('custpage_pcnstatus', curSublistIdx, pcnResults[i].getText('custrecordproductchangenotice_status', 'custrecordpcnunits_pcn'));
					pcnSublist.setLineItemValue('custpage_pcnreqdate', curSublistIdx, pcnResults[i].getValue('custrecordproductchangenotice_reqdate', 'custrecordpcnunits_pcn'));
					pcnSublist.setLineItemValue('custpage_pcnsubject', curSublistIdx, pcnResults[i].getValue('custrecordgd_pcnsubject', 'custrecordpcnunits_pcn'));
					curSublistIdx++;
				}
			}
		}
	}
	else
	{
		//otherwise create a message telling them why we didn't create the sublist
		form.addField('custpage_gd_pcnuniterr', 'label', 'The PCN sublist was not generated for this Unit because it is missing either its Series or Model.', null, 'custpage_gd_pcntab');
	}
}

function LoadSubmitUnitRetailCustomerMassUpdate(rec_type, rec_id)
{
	var unitRetailCustomer = nlapiLoadRecord(rec_type, rec_id);

	nlapiSubmitRecord(unitRetailCustomer);
}
