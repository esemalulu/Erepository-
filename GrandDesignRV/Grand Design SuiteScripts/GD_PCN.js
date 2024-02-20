/**
 * PCN User Event, Client Side, Mass Update and Workflow Action code for Grand Design
 * 
 * Version    Date            Author           Remarks
 * 1.00       7 Jun 2016     Jacob Shetler
 *
 */

/**
 * Lock fields if the user is not admin or full access.
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GDPCN_BeforeLoad(type, form, request)
{
	if (type == 'create')
	{
		nlapiSetFieldValue('custrecordproductchangenotice_status', GD_PCNSTATUS_OPEN);
	}
	
	if ((nlapiGetRole() != 3 && nlapiGetRole() != 18) &&  (type == 'create' || type == 'edit' || type == 'copy'))
	{
		form.getField('custrecordproductchangenotice_status').setDisplayType('disabled');
		form.getField('custrecordproductchangenotice_purchappvl').setDisplayType('disabled');
		form.getField('custrecordproductchangenotice_purchappdt').setDisplayType('disabled');
		form.getField('custrecordproductchangenotice_pltmgrapvl').setDisplayType('disabled');
		form.getField('custrecordproductchangenotice_pltmgrapdt').setDisplayType('disabled');
		form.getField('custrecordproductchangenotice_engapprvl').setDisplayType('disabled');
		form.getField('custrecordproductchangenotice_engapprdt').setDisplayType('disabled');
		form.getField('custrecordproductchangenotice_salesappvl').setDisplayType('disabled');
		form.getField('custrecordproductchangenotice_salesappdt').setDisplayType('disabled');
		form.getField('custrecordgd_pcn_serviceappvl').setDisplayType('disabled');
		form.getField('custrecordgd_pcn_serviceappvldate').setDisplayType('disabled');
		form.getField('custrecordgd_pcnpresapp').setDisplayType('disabled');
		form.getField('custrecordgd_pcnpresappdt').setDisplayType('disabled');
	}
	
	//Model Years and Names can only be changed on create/copy of the record, so don't let them edit it.
	if(type == 'edit')
	{
		form.getField('custrecordgd_pcnmodelyear').setDisplayType('disabled');
		form.getField('name').setDisplayType('disabled');
		form.getField('custrecordproductchangenotice_status').setDisplayType('disabled');
	}
	
	//Set the is historical flag based on the form.
	if (nlapiGetFieldValue('customform') == nlapiGetContext().getSetting('script', 'custscriptgdpcn_historicalform'))
	{
		nlapiSetFieldValue('custrecordgd_pcn_ishistorical', 'T');
	}
}

/**
 * Deletes the child records if the PCN is being deleted.
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function GDPCN_BeforeSubmit(type)
{
	if(type == 'delete')
	{
		//Then delete the child records
		for(var i = nlapiGetLineItemCount('recmachcustrecordpcnparts_pcn'); i > 0; i--)
		{
			nlapiDeleteRecord('customrecordrvspcnparts', nlapiGetLineItemValue('recmachcustrecordpcnparts_pcn', 'id', i));
		}
		for(var i = nlapiGetLineItemCount('recmachcustrecordpcnunits_pcn'); i > 0; i--)
		{
			nlapiDeleteRecord('customrecordrvspcnunits', nlapiGetLineItemValue('recmachcustrecordpcnunits_pcn', 'id', i));
		}
	}
	
	if (type != 'delete' && nlapiGetFieldValue('customform') == nlapiGetContext().getSetting('script', 'custscriptgdpcn_historicalform'))
	{
		nlapiSetFieldValue('custrecordgd_pcn_ishistorical', 'T');
	}
	
	//The only possible status for an historical PCN is Complete. So set it.
	if (nlapiGetFieldValue('custrecordgd_pcn_ishistorical') == 'T')
	{
		nlapiSetFieldValue('custrecordproductchangenotice_status', GD_PCNSTATUS_COMPLETE);
	}
    
    if (nlapiGetFieldValue('custrecordproductchangenotice_status') == GD_PCNSTATUS_APPROVED_PENDINGOBSOLETE 
            && (nlapiGetFieldValue('custrecordgd_pcn_prodmanagerappvl') || '') == '' 
            && (nlapiGetFieldValue('custrecordproductchangenotice_salesappvl') || '') == ''){
        nlapiSetFieldValue('custrecordproductchangenotice_status', GD_PCNSTATUS_PENDINGAPPROVAL);
    }
}

/**
 * Set the PCN # to the name of the PCN + the model year.
 * Send emails
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function GDPCN_AfterSubmit(type)
{
	if (type == 'create') //handles both 'create' and 'copy'
	{
		// 7/13/2016 NAH
		// In the context of a SubmitField, the nlapiGetFieldText(...) doesn't work for getting the model year.
		// So I'm going to do a lookup on the model year using nlapiLookupField.
		var modelYearText = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordgd_pcnmodelyear', true);
		
		//Get the next sequence number based on the GD PCN Sequence record stored on the series selected on the PCN.
		//If they filled in the name field automatically, just use that instead of doing the lookup. This is only possible on the Historical Form. 
		if (nlapiGetFieldValue('autoname') == 'T')
		{
			var lookupFields = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), ['custrecordproductchangenotice_series', 'custrecordgd_pcnmodelyear']);
			var searchResults = nlapiSearchRecord('customrecordgd_seriespcnsequence', null, [new nlobjSearchFilter('custrecordgd_seriespcnseq_series', null, 'is', lookupFields.custrecordproductchangenotice_series),
			                                                                                 new nlobjSearchFilter('custrecordgd_seriespcnseq_modelyear', null, 'is', lookupFields.custrecordgd_pcnmodelyear)], new nlobjSearchColumn('custrecordgd_seriespcnseq_num'));
			if (searchResults != null && searchResults.length > 0)
			{
				//Get the next number.
				var newPCNNum = searchResults[0].getValue('custrecordgd_seriespcnseq_num');
				
				//Increment it for the next time.
				nlapiSubmitField(searchResults[0].getRecordType(), searchResults[0].getId(), 'custrecordgd_seriespcnseq_num', parseInt(searchResults[0].getValue('custrecordgd_seriespcnseq_num')) + 1);
				
				//Set the PCN # to the name of the PCN + the model year.
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'autoname', 'F');
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'name', modelYearText.substring(2, 4) + '-' + newPCNNum);
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordgd_pcnsequence', newPCNNum);
			}
			else
			{
				throw nlapiCreateError('PCN_ERROR', 'Could not save this PCN because there is no PCN Model Year Sequence set up for this combination of Series and Model Year.', true);
			}
		}
		else
		{
			//If they automatically filled in the PCN #, then we need to try to set the PCN Sequence # for them. 
			//Try to parse out everything after the "-". If that doesn't work, then we don't care.
			var nameArr = ConvertNSFieldToString(nlapiGetFieldValue('name')).split('-');
			if(nameArr.length > 1)
			{
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordgd_pcnsequence', nameArr[1]);
			}
		}
	}
	
	//Don't send the emails if the PCN is historical. Ever.
	if (type != 'delete' && nlapiGetFieldValue('custrecordgd_pcn_ishistorical') == 'F')
	{
		var oldRec = nlapiGetOldRecord();
		if (oldRec != null)
		{
			//If the status changed, send out the emails.
			var oldStatus = oldRec.getFieldValue('custrecordproductchangenotice_status');
			var newStatus = nlapiGetFieldValue('custrecordproductchangenotice_status');
			if ((oldStatus != GD_PCNSTATUS_PENDINGAPPROVAL && newStatus == GD_PCNSTATUS_PENDINGAPPROVAL) ||
				(oldStatus != GD_PCNSTATUS_PENDINGFINAL && newStatus == GD_PCNSTATUS_PENDINGFINAL) || 
				(oldStatus != GD_PCNSTATUS_COMPLETE && newStatus == GD_PCNSTATUS_COMPLETE))
			{
				GDPCN_SendEmails(nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()));
			}
			// NOTE: We also send out emails when PCNs are rejected, but we can't do it here. That's because this after submit
			// doesn't run when PCNs are rejected. We have the Reject PCN button that shows a little suitelet and then uses nlapiSubmitField
			// to change the PCN status to rejected. That suitelet (GD_PCN_Reject.js) is also where we send out the rejected emails.
		}
	}
}

/**
 * Uncheck the AUTO checkbox if we're on the Historical form. Otherwise hide it. 
 * 
 * @param type
 */
function GDPCN_PageInit(type)
{
	var autoCheckbox = document.getElementById('autoname_fs');
	if(autoCheckbox != null)
	{
		if (nlapiGetFieldValue('custrecordgd_pcn_ishistorical') == 'F')
		{
			var autoLabel = document.getElementById('autoname_fs_lbl');
			if(autoLabel != null) autoLabel.style.display = 'none';
			autoCheckbox.style.display = 'none';
		}
		else autoCheckbox.click();
	}
}

/**
 * Don't let them choose "Rejected" as a status.
 * 
 * @param type
 * @param name
 * @param linenum
 */
function GDPCN_ValidateField(type, name, linenum)
{
	if (name == 'custrecordproductchangenotice_status' && nlapiGetFieldValue(name) == GD_PCNSTATUS_REJECTED)
	{
		alert('You may not selected the Rejected status manually. Please save the record then click Reject to reject this PCN.');
		return false;
	}
	return true;
}

/**
 * Don't let them choose more than one series
 */
function GDPCN_SaveRecord(type)
{
	if (nlapiGetFieldValues('custrecordproductchangenotice_series').length != 1)
	{
		alert('You must select exactly 1 series before saving this PCN.');
		return false;
	}
	
	//Make sure that they have a PCN Model Year Sequence set up for this Model Year and Series combo, but only check it if they're creating the record and if they're
	// not creating a historical record.
	if (type == 'create' && nlapiGetFieldValue('autoname') == 'T' && ConvertNSFieldToString(nlapiGetFieldValue('custrecordgd_pcnmodelyear')).length > 0)
	{
		var searchResults = nlapiSearchRecord('customrecordgd_seriespcnsequence', null, [new nlobjSearchFilter('custrecordgd_seriespcnseq_series', null, 'anyof', nlapiGetFieldValues('custrecordproductchangenotice_series')),
		                                                                                 new nlobjSearchFilter('custrecordgd_seriespcnseq_modelyear', null, 'is', nlapiGetFieldValue('custrecordgd_pcnmodelyear'))]);
		if (searchResults == null || searchResults.length == 0)
		{
			alert('This PCN could not be saved because the PCN Model Year Sequence for this Series has not been created. Please set this up on the Series record before saving.');
			return false;
		}
	}
	return true;
}

/**
 * Sets the status of the PCN to Pending Final Approval and reloads the page.
 */
function GDPCN_PendingFinalApproval_WkflowAction()
{	
	if (nlapiGetFieldValue('custrecordproductchangenotice_status') == GD_PCNSTATUS_APPROVED_PENDINGOBSOLETE)
	{
		//Check the Obsolescence fields on the line items.
		var pcnPartsType = 'recmachcustrecordpcnparts_pcn';
		for (var i = 1; i <= nlapiGetLineItemCount(pcnPartsType); i++)
		{
			if (ConvertNSFieldToString(nlapiGetLineItemValue(pcnPartsType, "custrecordpcnparts_obsoleteqty", i)).length == 0) 
			{
				throw nlapiCreateError('PCN_ERROR', 'Line ' + i + ' does not have an obsolete quantity. This must be set before marking this PCN for Final Approval.', true);
			}
			if (ConvertNSFieldToString(nlapiGetLineItemValue(pcnPartsType, "custrecordpcnparts_obsoleteamount", i)).length == 0)
			{
				throw nlapiCreateError('PCN_ERROR', 'Line ' + i + ' does not have an obsolete amount. This must be set before marking this PCN for Final Approval.', true);
			}
		}
		
		//Check that the distribution and implementation line contains at least one line.
		if (nlapiGetLineItemCount('recmachcustrecordpcnunits_pcn') < 1)
		{
			throw nlapiCreateError('PCN_ERROR', 'You must have at least one line under the Distribution and Implementation tab before marking this PCN for Final Approval.', true);
		}
		
		//If we got this far, then set the status to Pending Final Approval and reload the page.
        var pcnRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
        pcnRec.setFieldValue("custrecordproductchangenotice_status", GD_PCNSTATUS_PENDINGFINAL);
        nlapiSubmitRecord(pcnRec);
	}
}

/**
 * Sets the Model Year of the PCN to the first model's model year.
 * Then creates the PCN # for the PCN
 * 
 * @param {String} recType
 * @param {String} recId
 */
function GDPCN_MassUpdate(recType, recId)
{
	var rec = nlapiLoadRecord(recType, recId);
	var selectedModel = rec.getFieldValues('custrecordproductchangenotice_models');
	if (selectedModel != null && typeof(selectedModel) != 'string')
	{
		selectedModel = selectedModel[0];
	}
	if (selectedModel != null && selectedModel.length > 0)
	{
		rec.setFieldValue('custrecordgd_pcnmodelyear', nlapiLookupField('assemblyitem', selectedModel, 'custitemrvsmodelyear'));
		nlapiSubmitRecord(rec, false, true);
	}
}
