/**
 * Module Description
 * Grand Design Invoice Scripts
 * 
 * Version	Date 			Author 			Remarks
 * 1.00 	27 May 2016 	Triston Yoder
 * 
 */
var messageFieldId = 'custbodygd_other_invoice_emails';

/**
 * Add a Canadian brokerage fee if we need to.
 * 
 * @param type
 * @param form
 * @param request
 */
function GD_Invoice_BeforeLoad(type, form, request)
{
	if (RunCanadianSalesTaxByOrderType(nlapiGetFieldValue('custbodyrvsordertype')) && nlapiGetFieldValue('shipcountry') == 'CA')
	{
		var brokerageID = '';
		if(nlapiGetFieldValue('custbodyrvsordertype') == ORDERTYPE_PART)
		{
			brokerageID = GetPartsBrokerageFee();
		}
		else if(nlapiGetFieldValue('custbodyrvsordertype') == ORDERTYPE_UNIT)
		{
			brokerageID = GetUnitBrokerageFee();
		}
		var brokerageRec = GetItemRecord(brokerageID);
		
		//Make sure the sales order has the same brokerage fee on it.
		var createdFrom = ConvertNSFieldToString(nlapiGetFieldValue('createdfrom'));
		if(createdFrom.length > 0)
		{
			var salesOrderRec = nlapiLoadRecord('salesorder', createdFrom);
			//Add the brokerage fee if it doesn't already exist and if the sales order has it.
			if (salesOrderRec.findLineItemValue('item', 'item', brokerageID) != -1 && nlapiFindLineItemValue('item', 'item', brokerageID) == -1)
			{
				nlapiSelectNewLineItem('item');
				nlapiSetCurrentLineItemValue('item', 'item', brokerageID);
				nlapiSetCurrentLineItemValue('item', 'description', brokerageRec.getFieldValue('displayname'));
				nlapiSetCurrentLineItemValue('item', 'quantity', 1);
				nlapiSetCurrentLineItemValue('item', 'amount', brokerageRec.getLineItemMatrixValue('price', 'price', 1, 1));
				nlapiSetCurrentLineItemValue('item', 'rate', brokerageRec.getLineItemMatrixValue('price', 'price', 1, 1));
				nlapiSetCurrentLineItemValue('item', 'price', 1);
				nlapiSetCurrentLineItemValue('item', 'custcolrvs_canadianorder_gstlinetotal', 0);
				nlapiSetCurrentLineItemValue('item', 'custcolrvs_canadianorder_hstlinetotal', 0);
				nlapiSetCurrentLineItemValue('item', 'custcolrvs_canadianorder_pstlinetotal', 0);
				nlapiSetCurrentLineItemValue('item', 'custcolrvs_excludecatax', 'T');
				nlapiCommitLineItem('item');
			}
		}
	}
}

/**
 * Before Submit
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function GD_Invoice_BeforeSubmit(type)
{
	//If either of the "Completely Discount for XX Goodwill" boxes are checked, add a line item for the complete discount.
	var completeDiscountItem = null;
	if(nlapiGetFieldValue('custbodygd_completediscountsalesgood') == 'T')
	{
		completeDiscountItem = ConvertNSFieldToString(nlapiGetContext().getSetting('script', 'custscriptgd_salesgoodwilldiscountitem'));
	}
	else if(nlapiGetFieldValue('custbodygd_completediscountservicegood') == 'T')
	{
		completeDiscountItem = ConvertNSFieldToString(nlapiGetContext().getSetting('script', 'custscriptgd_servicegoodwilldiscountitem'));
	}
	if(completeDiscountItem != null && completeDiscountItem.length > 0)
	{
		//Add a single line for the discount item. Get the total of the Invoice and multiply it by -1 to get the rate/amount
		nlapiSelectNewLineItem('item');
		nlapiSetCurrentLineItemValue('item', 'item', completeDiscountItem);
		nlapiSetCurrentLineItemValue('item', 'price', '-1');
		nlapiSetCurrentLineItemValue('item', 'rate', nlapiGetFieldValue('total') * -1);
		nlapiCommitLineItem('item');
	}

	if (type == 'edit'){
		// On create of invoice this code does not completely work so this is run on after submit for create types only.
		// If this is a parts order and ship via is DPU or unit ship remove GST HST and brokerage fee items and zero out columns and totals.
		var shipMethod = nlapiGetFieldValue('shipmethod');
		var itemId = 0;
		if (nlapiGetRecordType() == 'invoice' && nlapiGetFieldValue('custbodyrvsordertype') == ORDERTYPE_PART && (shipMethod == GD_SHIPMETHOD_DPU || shipMethod == GD_SHIPMETHOD_UNITSHIP)){
			var lineCount = nlapiGetLineItemCount('item');
			//reverse loop on lines since we could be removing lines.
			for (var i = lineCount; i >= 1; i--)
			{
				nlapiSelectLineItem('item', i);
				nlapiSetCurrentLineItemValue('item', 'custcolrvs_canadianorder_gstlinetotal', 0);
				nlapiSetCurrentLineItemValue('item', 'custcolrvs_canadianorder_hstlinetotal', 0);
				nlapiCommitLineItem('item');
				itemId = nlapiGetCurrentLineItemValue('item', 'item') || 0;
				if (itemId == '29832' || itemId == '29861')
					nlapiRemoveLineItem('item', i);
			}
			nlapiSetFieldValue('custbodyrvs_salesorder_gsttotal', 0);
			nlapiSetFieldValue('custbodyrvs_salesorder_hsttotal', 0);
		}
	}
}

/**
 * After submit event for the invoice.
 * @appliedtorecord invoice
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function GD_Invoice_AfterSubmit(type)
{
	// when the invoice is created, see if there are any programs that may apply to this unit
	if (type == 'create')
	{		
		// Criteria:
		// - Order Type = Unit
		// - Program Type = Salesman Spiff or Dealer Spiff
		// - Program Start Date on or before the invoice date
		// - Program End Date on or after the invoice date
		// - Program Status = Open or Approved
		// - Dealer = Invoice.Dealer
		// - Program Auto-Populate Units is True
		// - If series, model, or year are set, use them as filters.
		var orderType = nlapiGetFieldValue('custbodyrvsordertype');
		if (orderType == ORDERTYPE_UNIT)
		{
			var invoiceDate = nlapiGetFieldValue('trandate');
			var invoiceDealerId = nlapiGetFieldValue('entity');
			var invoiceUnitId = nlapiGetFieldValue('custbodyrvsunit');

			var unitSeriesId = nlapiLookupField('customrecordrvsunit', invoiceUnitId, 'custrecordunit_series', false);
			var unitYearId = nlapiLookupField('customrecordrvsunit', invoiceUnitId, 'custrecordunit_modelyear', false);
			var unitModelId = nlapiLookupField('customrecordrvsunit', invoiceUnitId, 'custrecordunit_model', false);

			var programFilters = new Array();
			programFilters.push(new nlobjSearchFilter('custrecordprogram_type', null, 'anyof', [GD_PROGRAMTYPE_SALESMENSPIFF, GD_PROGRAMTYPE_DEALERSPIFF]));
			programFilters.push(new nlobjSearchFilter('custrecordprogram_startdate', null, 'onorbefore', invoiceDate));
			programFilters.push(new nlobjSearchFilter('custrecordprogram_enddate', null, 'onorafter', invoiceDate));
			programFilters.push(new nlobjSearchFilter('custrecordprogram_status', null, 'anyof', [PROGRAMSTATUS_OPEN, PROGRAMSTATUS_APPROVED]));
			programFilters.push(new nlobjSearchFilter('custrecordprogram_dealer', null, 'is', invoiceDealerId));
			programFilters.push(new nlobjSearchFilter('custrecordgd_program_autopopulateunits', null, 'is', 'T'));
			
			var seriesFilter = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1, null);
			seriesFilter.setFormula('case when {custrecordgd_program_series} is null then 1 else (case when {custrecordgd_program_series.internalid} = ' + unitSeriesId + ' then 1 else 0 end) end');
			programFilters.push(seriesFilter);
			
			var yearFilter = new nlobjSearchFilter('formulanumeric', null, 'equalto', 1, null);
			yearFilter.setFormula('case when {custrecordgd_program_year} is null then 1 else (case when {custrecordgd_program_year.internalid} = ' + unitYearId + ' then 1 else 0 end) end');
			programFilters.push(yearFilter);
			
			var programCols = new Array();
			programCols.push(new nlobjSearchColumn('custrecordgd_program_incentiveamt', null, null));
			
			var programResults = nlapiSearchRecord('customrecordrvsprogram', null, programFilters, programCols) || [];
			
			for (var i = 0; i < programResults.length; i++)
			{
				
				var programId = programResults[i].getId();

				//If there are model filters set on this program, filter by model here.
				var modelIds = nlapiLookupField('customrecordrvsprogram', programId, 'custrecordgd_program_model') || [];
				if(modelIds.length == 0 || (modelIds.length > 0 && modelIds.indexOf(unitModelId)!= -1))
				{
					//If we've gotten this far, we found a program that this unit applies to. 
					var incentiveAmount = ConvertNSFieldToFloat(programResults[i].getValue('custrecordgd_program_incentiveamt'));
					
					var maxTryCount = 1000;
					var curTryCount = 0;
					while(curTryCount < maxTryCount) {

						// load the program and add this unit to it
						var program = nlapiLoadRecord('customrecordrvsprogram', programId, null);
						
						var unitFound = false;
						var lineCount = program.getLineItemCount('recmachcustrecordprogramunit_program');
						for (var j=1; j<=lineCount; j++){
							if (program.getLineItemValue('recmachcustrecordprogramunit_program', 'custrecordprogramunit_unit', j) == invoiceUnitId){
								unitFound = true;
								break;
							}
						}
	    		    	try {
	    		    		//If this unit isn't already listed on the program, add it on the unit sublist, thus creating a program unit record.
	    		    		if (!unitFound){
	    						program.selectNewLineItem('recmachcustrecordprogramunit_program');
	    						program.setCurrentLineItemValue('recmachcustrecordprogramunit_program', 'custrecordprogramunit_unit', invoiceUnitId);
	    						program.setCurrentLineItemValue('recmachcustrecordprogramunit_program', 'custrecordprogramunit_incentiveamount', incentiveAmount);
	    						program.commitLineItem('recmachcustrecordprogramunit_program');
	    						
	    						nlapiSubmitRecord(program, true, false);
	    					}
	    		    		curTryCount = maxTryCount;
	    		    		break;
	    		    	}
	    		    	catch(err){
	    		    		nlapiLogExecution('debug', 'err message', JSON.stringify(err));
	    		    		if(err.name == 'CUSTOM_RECORD_COLLISION') {
	    		    			curTryCount++;
	    		    			continue;
	    		    		}
	    		    		throw err;
	    		    	}
					}
				}
			}
		}

		// On create of invoice this code does not completely work so this is run here on after submit for create types only.
		// Because of this code, the total may change from a higher number to a smaller number on create of the record.
		// If this is a parts order and ship via is DPU or unit ship remove GST HST and brokerage fee items and zero out columns and totals.
		var soRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var isSaveRecord = false;
		var shipMethod = soRecord.getFieldValue('shipmethod');
		if ((shipMethod == GD_SHIPMETHOD_DPU || shipMethod == GD_SHIPMETHOD_UNITSHIP) && nlapiGetRecordType() == 'invoice' && nlapiGetFieldValue('custbodyrvsordertype') == ORDERTYPE_PART){
			var lineCount = soRecord.getLineItemCount('item');
			var itemId = 0;
			//reverse loop on lines since we could be removing lines.
			for (var i = lineCount; i >= 1; i--){
				soRecord.selectLineItem('item', i);
				itemId = soRecord.getCurrentLineItemValue('item', 'item') || 0;
				if (itemId == '29832' || itemId == '29861'){
					soRecord.removeLineItem('item', i);
					isSaveRecord = true;
				}
			}
			// #C11088
			try {
				if (isSaveRecord)
					nlapiSubmitRecord(soRecord);
			} catch(error) {}
		}
	}
}

/**
 * 
 * @appliedtorecord invoice
 * 
 * @param {String}
 *            type Sublist internal id
 * @param {String}
 *            name Field internal id
 * @param {Number}
 *            linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function GD_Invoice_FieldChanged(type, name, linenum)
{
	// 27 May 2016 Case: 6276
	// Auto-Fill Invoice Submission Field
	// Check if Submit Invoice to Flooring Bank field was changed
	if (name == 'custbodygd_submitinvoicetoflooringbank'
			&& nlapiGetFieldValue('custbodygd_submitinvoicetoflooringbank') == 'T'
			&& (nlapiGetFieldValue('custbodygd_invoicesubmissionemail') == '' || nlapiGetFieldValue('custbodygd_invoicesubmissionemail') == null))
	{
		// Search for contact with USE FOR INVOICE SUBMISSION checked who are not inactive
		var filters = new Array();
		filters[0] = new nlobjSearchFilter('custentitygd_useforinvoicesubmission', null, 'is', 'T');
		filters[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[2] = new nlobjSearchFilter('company', null, 'is', nlapiGetFieldValue('custbodyrvsflooringtype'));

		var columns = new nlobjSearchColumn('email');

		var search = nlapiSearchRecord('contact', null, filters, columns);
		if (search != null)
		{
			if (search.length == 1)
			{
				var contact = nlapiLoadRecord('contact', search[0].getId(), null);
				var email = contact.getFieldValue('email');
				nlapiSetFieldValue('custbodygd_invoicesubmissionemail', email, true, false);
				nlapiSetFieldValue(messageFieldId, 'No other contacts', false, false);
			}
			else
			{
				var field = nlapiGetField(messageFieldId);
				var allEmails = '';
				for (var i = 0; i < search.length; i++)
				{
					var contact = nlapiLoadRecord('contact', search[i].getId(), null);
					var email = contact.getFieldValue('email');
					allEmails += contact.getFieldValue('email') + '<p\>';
				}
				var contact = nlapiLoadRecord('contact', search[0].getId(), null);
				var email = contact.getFieldValue('email');
				nlapiSetFieldValue(messageFieldId, allEmails, false, false);
				nlapiSetFieldValue('custbodygd_invoicesubmissionemail', email, true, false);
			}
		}
		else
		{
			nlapiSetFieldValue(messageFieldId, 'No contacts matching criteria found', false, false);
		}
	}
	//End Case: 6276
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Boolean} True to continue changing field value, false to abort value change
 */
function GD_Invoice_ValidateField(type, name, linenum)
{
	if(name == 'custbodygd_submitinvoicetoflooringbank')
	{
		// Prevent client side error by forcing the user to set the floor plant type first before allowing them to set the submit invoice to flooring bank checkbox.
		var floorPlanType = nlapiGetFieldValue('custbodyrvsflooringtype') || '';
		if (floorPlanType == '')
		{
			alert('Please set a value for "Floorplan Type" field before setting "Sumbit Invoice to Flooring Bank" field.');
			return false;
		}
	}
	
	return true;
}