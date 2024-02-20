//********** GLOBAL VARIABLES & CONSTANTS ***********//
	
	var MODELROW_COL_1_LIMIT = 5;
	var MODELROW_COL_2_LIMIT = 10;
	var DECORROW_COL_1_LIMIT = 4;
	
	var CELL_BACKGROUND_COLOR_GRAY = "background-color:#A2A2A2";
	
	
//********* END GLOBAL VARIABLES & CONSTANTS *********//

function PrintDealerPricingCustomActionSalesOrder()
{
	var context = nlapiGetContext();
	context.setSessionObject('printpricer_salesorderid', nlapiGetRecordId());
}

function PrintDealerPricingCustomActionQuote()
{
	var context = nlapiGetContext();
	context.setSessionObject('printpricer_weborderid', nlapiGetRecordId());
}

function PrintDealerPricingCustomActionModel()
{
	var context = nlapiGetContext();
	context.setSessionObject('printpricer_modelid', nlapiGetRecordId());
}

//Used by Print Unit Quote Sheet Button on Sales Order Record
function PrintUnitQuoteSuiteletSalesOrder(request, response)
{
	var context = nlapiGetContext();
	var salesOrderId = context.getSessionObject('printpricer_salesorderid');
	context.setSessionObject('printpricer_salesorderid', null);
		
	if (salesOrderId == '' || salesOrderId == null)
	{
		salesOrderId = request.getParameter('salesOrderId');
	}
	
	if (salesOrderId != '' && salesOrderId != null) 
	{
		var pdfTitle = 'Unit Quote Sheet - Order ' + nlapiLookupField('salesorder', salesOrderId, 'tranid') + '.pdf';
		var html = GD_GetPricerHTML(salesOrderId, true, false, false, true, false);
		
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

//Used by Print Unit Quote Sheet Button on Web Order Record
function PrintUnitQuoteSuiteletWebOrder(request, response)
{
	var context = nlapiGetContext();
	var quoteId = context.getSessionObject('printpricer_weborderid');
	context.setSessionObject('printpricer_weborderid', null);

	if (quoteId == '' || quoteId == null)
	{		
		quoteId = request.getParameter('estimateId');
	}
	
	if (quoteId != '' && quoteId != null) 
	{
		var pdfTitle = 'Unit Quote Sheet - Web Order ' + nlapiLookupField('estimate', quoteId, 'tranid') + '.pdf';
		var html = GD_GetPricerHTML(quoteId, false, true, false, true, false);
		
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

//Used by Print Unit Quote Sheet Button on Model Record
function PrintUnitQuoteSuiteletModel(request, response)
{
	var context = nlapiGetContext();
	var modelId = context.getSessionObject('printpricer_modelid');
	context.setSessionObject('printpricer_modelid', null);

	if (modelId == '' || modelId == null)
	{		
		modelId = request.getParameter('modelId');
	}
	if (modelId != '' && modelId != null) 
	{
		var pdfTitle = 'Unit Quote Sheet - Model ' + nlapiLookupField('assemblyitem', modelId, 'itemid') + '.pdf';
		var html = GD_GetPricerHTML(modelId, false, false, true, true, false);
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

//Used by Print Dealer Price Sheet Button on Sales Order Record
function PrintDealerPricerSuiteletSalesOrder(request, response)
{
	var context = nlapiGetContext();
	var salesOrderId = context.getSessionObject('printpricer_salesorderid');
	context.setSessionObject('printpricer_salesorderid', null);
		
	if (salesOrderId == '' || salesOrderId == null)
	{
		salesOrderId = request.getParameter('salesOrderId');
	}
	
	if (salesOrderId != '' && salesOrderId != null) 
	{
		var pdfTitle = 'Dealer Price Sheet - Order ' + nlapiLookupField('salesorder', salesOrderId, 'tranid') + '.pdf';
		var html = GD_GetPricerHTML(salesOrderId, true, false, false, false, true);
		
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

//Used by Print Dealer Price Sheet Button on Web Order Record
function PrintDealerPricerSuiteletWebOrder(request, response)
{
	var context = nlapiGetContext();
	var quoteId = context.getSessionObject('printpricer_weborderid');
	context.setSessionObject('printpricer_weborderid', null);

	if (quoteId == '' || quoteId == null)
	{		
		quoteId = request.getParameter('estimateId');
	}
	
	if (quoteId != '' && quoteId != null) 
	{
		var pdfTitle = 'Dealer Price Sheet - Web Order ' + nlapiLookupField('estimate', quoteId, 'tranid') + '.pdf';
		var html = GD_GetPricerHTML(quoteId, false, true, false, false, true);
		
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

//Used by Print Dealer Price Sheet Button on Model Record
function PrintDealerPricerSuiteletModel(request, response)
{
	var context = nlapiGetContext();
	var modelId = context.getSessionObject('printpricer_modelid');
	context.setSessionObject('printpricer_modelid', null);

	if (modelId == '' || modelId == null)
	{		
		modelId = request.getParameter('modelId');
	}
	if (modelId != '' && modelId != null) 
	{
		var pdfTitle = 'Dealer Price Sheet - Model ' + nlapiLookupField('assemblyitem', modelId, 'itemid') + '.pdf';
		var html = GD_GetPricerHTML(modelId, false, false, true, false, true);
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}


// Creates Model Selection Rows for HTML
function CreateModelRowHTML(modelName, modelPrice, checked)
{
	var checkedCellFill = ' ';
	if(checked == 'X')
	{
		checkedCellFill = CELL_BACKGROUND_COLOR_GRAY;
	}
	
	var modelRow = 
	'<tr style = "font-size:9pt;">' +
		'<td style="border-style:solid; border-width:1px; border-color:black; width:15px; align:center; ' + checkedCellFill +'">' +
			checked +
		'</td>' +
		'<td width = "50px">' +
			modelName + 
		'</td>' +
		'<td width = "50px">' +
			modelPrice +
		'</td>' +
	'</tr>'; 
	
	return modelRow;
}

//Creates Optional Features Rows for HTML
function CreateOptionalFeaturesRowHTML(priceText,description, mandatory)
{
	var mandatoryCellFill = '';
	if (mandatory == 'X')
	{
		mandatoryCellFill = CELL_BACKGROUND_COLOR_GRAY;
	}

	var featureRow =
		'<tr style="font-size:8pt;">' +
			'<td style="border-style:solid; border-width:1px; border-color:black; width:15px; align:center; ' + mandatoryCellFill +'">' +
				mandatory +
			'</td>' + 
			'<td style="border-style:solid; border-width:1px; border-color:black;">' + 
				priceText + 
			'</td>' + 
			'<td style="border-style:solid; border-width:1px; border-color:black;">' + 
				description + 
			'</td>' + 
		'</tr>';
	
	return featureRow;
}

//Generates HTML for Dealer Pricer
//Parameters isSalesOrder, isWebOrder, and isModel define where pricer is being printed from
//Parameters isUnitQuote and isDealerPrice define pricelevels. UnitQuote is MSRP, DealerPrice is base price
//rename into GD_GetPricerHTML
function GD_GetPricerHTML(recordId, isSalesOrder, isWebOrder, isModel, isUnitQuote, isDealerPrice){
	var transactionRecord = '';
	var PONumber = '';
	var retailSold = '';
	var dealerOrderDate = '';
	var seriesName = '';
	var dealerId = '';
	var dealer = '';
	var salesRep = '';
	var effectiveDate = '';
	var seriesId = '';
	var decorId = '';
	var decorName = '';
	var unitId = '';
	var modelId = '';
	var modelNameFromOrder = '';
	var lineItemCount = '';
	var priceLevelRateText = '';
	var shipMethodId = '';
	var seriesStandardFeatures = '';
	var dealerDiscount = '';
	var VIN = '';
	var serialNum = '';
	var onlineDate = '';
	var offlineDate = '';
	var chassisMfg = '';
	var chassisModel = '';
	var modelRecord = '';
	var modelTypeText = '';
	var modelYear = '';
	
	if (isSalesOrder) {
		//Fields only for Sales Orders	
		var salesOrderRecord = nlapiLoadRecord('salesorder', recordId);
		transactionRecord = salesOrderRecord;
		unitId = transactionRecord.getFieldValue('custbodyrvsunit');
		var unit = nlapiLoadRecord('customrecordrvsunit', unitId);
		VIN = nlapiEscapeXML(unit.getFieldValue('name'));
		serialNum = nlapiEscapeXML(unit.getFieldValue('custrecordunit_serialnumber'));
		onlineDate = nlapiEscapeXML(unit.getFieldValue('custrecordunit_onlinedate'));
		offlineDate = nlapiEscapeXML(unit.getFieldValue('custrecordunit_actualofflinedate'));
		chassisMfg = nlapiEscapeXML(unit.getFieldText('custrecordgd_unit_chassismanufacturer'));
		chassisModel = nlapiEscapeXML(unit.getFieldValue('custrecordgd_unit_chassismodel'));
	}
	else 
		if (isWebOrder) {
			var webOrderRecord = nlapiLoadRecord('estimate', recordId);
			transactionRecord = webOrderRecord;
		}
		else 
			if (isModel) {
				modelId = recordId;
				modelRecord = nlapiLoadRecord('assemblyitem', recordId);
				transactionRecord = modelRecord;				
				seriesId = nlapiEscapeXML(transactionRecord.getFieldValue('custitemrvsmodelseries'));
				seriesName = nlapiEscapeXML(transactionRecord.getFieldText('custitemrvsmodelseries'));
				//modelNameFromOrder = transactionRecord.getFieldValue('itemid');
			}
	
	if (isSalesOrder || isWebOrder) {
		PONumber = nlapiEscapeXML(transactionRecord.getFieldValue('otherrefnum'));
		retailSold = nlapiEscapeXML(transactionRecord.getFieldValue('custbodyrvsretailsoldname'));
		dealerOrderDate = nlapiEscapeXML(transactionRecord.getFieldValue('custbodyrvsdealerorderdate'));
		dealerId = nlapiEscapeXML(transactionRecord.getFieldValue('entity'));
		dealer = nlapiEscapeXML(transactionRecord.getFieldText('entity'));
		salesRep = nlapiEscapeXML(transactionRecord.getFieldText('salesrep'));
		effectiveDate = nlapiEscapeXML(transactionRecord.getFieldValue('trandate'));
		lineItemCount = transactionRecord.getLineItemCount('item');
		shipMethodId = transactionRecord.getFieldValue('shipmethod');
		dealerDiscount = transactionRecord.getFieldValue('discountrate');
		decorId = nlapiEscapeXML(transactionRecord.getFieldValue('custbodyrvsdecor'));
		decorName = nlapiEscapeXML(transactionRecord.getFieldText('custbodyrvsdecor'));
		//modelNameFromOrder = transactionRecord.getFieldText('custbodymodel');
		modelId = transactionRecord.getFieldValue('custbodyrvsmodel');
		seriesId = nlapiEscapeXML(transactionRecord.getFieldValue('custbodyrvsseries'));
		seriesName = nlapiEscapeXML(transactionRecord.getFieldText('custbodyrvsseries'));
		seriesStandardFeatures = nlapiEscapeXML(transactionRecord.getFieldValue('custbodyrvsmodelstandardfeatures'));
		modelRecord = nlapiLoadRecord('assemblyitem', modelId);
		
	}
	
	modelNameFromOrder = nlapiEscapeXML(modelRecord.getFieldValue('itemid'));
	modelTypeText = nlapiEscapeXML(modelRecord.getFieldText('custitemrvsmodeltype'));
	modelYear = nlapiEscapeXML(modelRecord.getFieldText('custitemrvsmodelyear'));
	var selectedModelPrice = '';
	
	var priceLevelRate = 0;
	if (isUnitQuote) 
	{
		priceLevelRateText = transactionRecord.getFieldValue('custbodyrvsmsrprate');		
		
		if (priceLevelRateText == null) 
		{
			var msrpPriceLevelId = GetMSRPPriceLevelId(); //get price level id from custom preferences
			if(msrpPriceLevelId != null && msrpPriceLevelId != '')
				priceLevelRateText = nlapiLookupField('pricelevel', msrpPriceLevelId, 'discountpct');			
		}
		
		if(priceLevelRateText != null && priceLevelRateText != '') 
		{
			var priceLevelRateString = priceLevelRateText.substring(0, priceLevelRateText.length - 1);			
			if(priceLevelRateString != null && !isNaN(parseFloat(priceLevelRateString)))
			{
				priceLevelRate = parseFloat(priceLevelRateString) / 100;
			}
		}
	}
	else if (isDealerPrice)
	{
		priceLevelRateText = 0;
		priceLevelRate = 0;		
	}
	
	if (VIN == null) 
		VIN = '';
	
	if (PONumber == null) 
		PONumber = '';
	
	if (retailSold == null) 
		retailSold = '';
	
	if (onlineDate == null) 
		onlineDate = '';
	
	if (offlineDate == null) 
		offlineDate = '';
	
	if (chassisMfg == null) 
		chassisMfg = '';

	if (chassisModel == null)
		chassisModel = '';

	var chassisHTML = ''
	if (chassisMfg != '' && chassisModel != '') {
		chassisHTML= 
			'<tr>' +
				'<td style="font-weight:bold">' +
					'Chassis: ' +
				'</td>' +
				'<td>' +
					chassisMfg + '    ' + chassisModel +
				'</td>' +
			'</tr>';
	}
	
	
	//********* START DECOR OPTIONS *********//	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('internalid', 'custitemrvsseriesassigned', 'is', seriesId);
	var decorResults = nlapiSearchRecord('item', 'customsearchdecoritemswithseriesassigned', filters);
	
	var decorHTML = '<table width="115px">' +
	'<tr>' +
	'<td colspan="4">' +
	'<span padding="0" margin="0" style="border-bottom:1px solid black;">' +
	'Decor Options' +
	'</span>' +
	'</td>' +
	'</tr>';
	
	var decorHTML1 = '<table>';
	var decorHTML2 = '<table>';
	var decorExists = false;
	var selectedDecor = '';
	
	if (decorResults != null && decorResults.length > 0) 
	{
		for (var i = 0; i < decorResults.length; i++) 
		{
			var discontinuedDecor = nlapiEscapeXML(decorResults[i].getValue('custitemdiscontinueddecor'));
			selectedDecor = '';
			var decorResultName = nlapiEscapeXML(decorResults[i].getValue('itemid'));
			
			//Selected Decor is decorID from SO/WebOrder
			selectedDecor = decorName;
			var decorChecked = ' ';
			var cellBackgroundColor = '';
			if (decorResultName == selectedDecor) {
				decorExists = true;
				decorChecked = 'X';
				cellBackgroundColor = CELL_BACKGROUND_COLOR_GRAY;
			}
			if(decorChecked == 'X')
			{
				decorHTML1 += '<tr style="font-size:9pt;">' +
				'<td style="border-style:solid; border-width:1px; border-color:black; width:15px; align:center; ' +
				cellBackgroundColor +
				'">' +
				decorChecked +
				'</td>' +
				'<td align="left" style="padding-right:10px;">' +
				decorResultName +
				'</td>' +
				'</tr>';
			}
			
			if (i < DECORROW_COL_1_LIMIT && decorChecked != 'X' && discontinuedDecor != 'T') {
				decorHTML1 += '<tr style="font-size:9pt;">' +
				'<td style="border-style:solid; border-width:1px; border-color:black; width:15px; align:center; ' +
				cellBackgroundColor +
				'">' +
				decorChecked +
				'</td>' +
				'<td align="left" style="padding-right:10px;">' +
				decorResultName +
				'</td>' +
				'</tr>';
			}
			else 
				if (i >= DECORROW_COL_1_LIMIT && decorChecked != 'X' && discontinuedDecor != 'T') {
					decorHTML2 += '<tr style="font-size:9pt;">' +
					'<td style="border-style:solid; border-width:1px; border-color:black; width:15px; align:center; ' +
					cellBackgroundColor +
					'">' +
					decorChecked +
					'</td>' +
					'<td align="left" style="padding-right:15px;">' +
					decorResultName +
					'</td>' +
					'</tr>';
				}
			
		}
	}
	else {
		decorHTML += '<tr style="font-size:9pt;">' +
		'<td>' +
		'No Decor Options Available for this Series.' +
		'</td>' +
		'</tr>';
	}
	
	//Check to make sure a decor has been selected. If not, get the Decor regardless.
	if (decorExists == false && !isModel) 
	{
		//In case the selected decor is inactive, get the decor anyway and put it in the list as checked.
		var salesOrderSelectedDecorOverride = selectedDecor;
		decorHTML2 += '<tr style="font-size:9pt;">' +
		'<td style="border-style:solid; border-width:1px; border-color:black; width:15px; align:center;' +
		CELL_BACKGROUND_COLOR_GRAY +
		'">' +
		'X' +
		'</td>' +
		'<td align="left">' +
		salesOrderSelectedDecorOverride +
		'</td>' +
		'</tr>';
		
	}
	
	decorHTML1 += '</table>';
	decorHTML2 += '</table>';
	decorHTML += '<tr>' +
	'<td>' +
	decorHTML1 +
	'</td>' +
	'<td>' +
	decorHTML2 +
	'</td>' +
	'</tr>' +
	'</table>';
	//********* END DECOR OPTIONS *********//
	
	//********* START MODEL SELECTION *********//
	//Model Selection
	var modelHTML = '<table width="100%">' +
	'<tr>' +
	'<td>' +
	'<span padding="0" margin="0" style="border-bottom:1px solid black;">' +
	'Model Selection:' +
	'</span>' +
	'</td>' +
	'</tr>';
	
	
	var modelCol1HTML = '<table>';
	var modelCol2HTML = '<table>';
	var modelCol3HTML = '<table>';
	
	var modelType = modelRecord.getFieldValue('custitemrvsmodeltype');
	
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('itemid');
	cols[cols.length] = new nlobjSearchColumn('custitemrvsmsomodel');
	cols[cols.length] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custitemrvsmodelseries');
	cols[cols.length] = new nlobjSearchColumn('custitemrvsmodeltype');
	cols[cols.length] = new nlobjSearchColumn('baseprice');
	
	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custitemrvsmodelseries', null, 'anyof', seriesId);
	filters[1] = new nlobjSearchFilter('isonline', null, 'is', 'T');
	filters[2] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	filters[3] = new nlobjSearchFilter('custitemrvsmodeltype', null, 'is', modelType);
	//Model Search 
	var models = nlapiSearchRecord('item', null, filters, cols);
	
	//Loop through models, adding them to rows
	var ModelExists = false;
	if (models != null && models.length > 0) 
	{
		for (var i = 0; i < models.length; i++) 
		{
			var modelName = nlapiEscapeXML(models[i].getValue('itemid'));
			var trimmedModelName = modelName.substring(2);
			var modelOnOrder = modelId;
			var currentModel = models[i].getValue('internalid');
			var modelBasePriceString = parseFloat(models[i].getValue('baseprice'));
			var modelCalcPrice = modelBasePriceString;
			var modelCalcPriceString = '';
			if (isUnitQuote) 
			{
				modelCalcPrice = Math.ceil(modelBasePriceString + (modelBasePriceString * priceLevelRate));				
			}
			modelCalcPriceString = '$' + CurrencyFormatted(modelCalcPrice);
			var isChecked = ' ';
			
			if (currentModel == modelOnOrder) 
			{
				ModelExists = true;
				isChecked = 'X';
				selectedModelPrice = modelCalcPrice;
			}
			
			if (i < MODELROW_COL_1_LIMIT) {
				modelCol1HTML += CreateModelRowHTML(trimmedModelName, modelCalcPriceString, isChecked);
			}
			else 
				if (i >= MODELROW_COL_1_LIMIT && i < MODELROW_COL_2_LIMIT) {
					modelCol2HTML += CreateModelRowHTML(trimmedModelName, modelCalcPriceString, isChecked);
				}
				else {
					modelCol3HTML += CreateModelRowHTML(trimmedModelName, modelCalcPriceString, isChecked);
				}
			
		}
	}
	else {
		modelHTML += '<tr style="font-size:9pt;">' +
		'<td>' +
		'No Models Available for this Series.' +
		'</td>' +
		'</tr>';
	}
		 
	//This method was originally written by Connor.
	//Variable 'numberOfModels' was introduced by Ibrahim to replace
	//the reference of 'models.length' used by Connor because if models is null, 
	//then models.length will throw error. IBRA 01/28/2013
	var numberOfModels = 0; //stores number of models found.
	if(models != null && models.length > 0)
		numberOfModels = models.length;
	
	//Make sure a model is selected. If not, get the correct model regardless.
	if (ModelExists == false && !isModel) 
	{
		//In case model is inactive, get it from the sales order.
		var modelIdOverride = modelId; //From salesOrder call at top
		var modelNameOverride = transactionRecord.getFieldText('custbodyrvsmodel');	
		var modelPriceStringOverride = modelRecord.getLineItemMatrixValue('price', 'price', 2, 1);
		var trimmedModelNameOverride = modelNameOverride.substring(2);
		var modelPriceOverride = '$' + CurrencyFormatted(modelPriceStringOverride);
		var isCheckedOverride = 'X';
		//Constants for columns
		if (numberOfModels <= (MODELROW_COL_1_LIMIT - 1)) {
			modelCol1HTML += CreateModelRowHTML(trimmedModelNameOverride, modelPriceOverride, isCheckedOverride);
		}
		else 
			if (numberOfModels > (MODELROW_COL_1_LIMIT - 1) && numberOfModels <= (MODELROW_COL_2_LIMIT - 1)) {
				modelCol2HTML += CreateModelRowHTML(trimmedModelNameOverride, modelPriceOverride, isCheckedOverride);
			}
			else 
				if (numberOfModels > (MODELROW_COL_2_LIMIT - 1)) {
					modelCol3HTML += CreateModelRowHTML(trimmedModelNameOverride, modelPriceOverride, isCheckedOverride);
				}
	}
	
	modelCol1HTML += '</table>';
	modelCol2HTML += '</table>';
	modelCol3HTML += '</table>';
	
	//Put together the model layout.			
	if (numberOfModels <= MODELROW_COL_1_LIMIT) {
		modelHTML += '<tr>' +
		'<td>' +
		modelCol1HTML +
		'</td>' +
		'</tr>' +
		'</table>';
		
	}
	else 
		if (numberOfModels > MODELROW_COL_1_LIMIT && numberOfModels <= MODELROW_COL_2_LIMIT) {
			modelHTML += '<tr>' +
			'<td>' +
			modelCol1HTML +
			'</td>' +
			'<td>' +
			modelCol2HTML +
			'</td>' +
			'</tr>' +
			'</table>';
		}
		else 
			if (numberOfModels > MODELROW_COL_2_LIMIT) {
				modelHTML += '<tr>' +
				'<td>' +
				modelCol1HTML +
				'</td>' +
				'<td>' +
				modelCol2HTML +
				'</td>' +
				'<td>' +
				modelCol3HTML +
				'</td>' +
				'</tr>' +
				'</table>';
			}
	
	
	//********* END MODEL SELECTION *********//
	
	//********* START MODEL OPTIONS *********//
	var optionsHTMLLeft = '<table width = "95%">' +
	'<tr>' +
	'<td style="border-style:solid; border-width:1px; border-color:black; font-weight:bold;">' +
	' ' +
	'</td>' +
	'<td style="border-style:solid; border-width:1px; border-color:black; font-weight:bold;">' +
	'Price' +
	'</td>' +
	'<td style="border-style:solid; border-width:1px; border-color:black; font-weight:bold;">' +
	'Description' +
	'</td>' +
	'</tr>';
	
	var optionsHTMLRight = '<table width = "95%">' +
	'<tr>' +
	'<td style="border-style:solid; border-width:1px; border-color:black; font-weight:bold;">' +
	' ' +
	'</td>' +
	'<td style="border-style:solid; border-width:1px; border-color:black; font-weight:bold;">' +
	'Price' +
	'</td>' +
	'<td style="border-style:solid; border-width:1px; border-color:black; font-weight:bold;">' +
	'Description' +
	'</td>' +
	'</tr>';
	
	var msrpNotesTable = '<table width="435px" style="font-size:6pt; border-style:solid; border-width:1px; border-color:black;">';
	
	var modelOptionsArray = new Array();
	var totalOptions = 0;
	var totalFreight = 0;
	
	//If this isn't coming from a model record, get the lineItems first.
	var split = 0;
	if (!isModel) 
	{	
		for (var k = 1; k <= lineItemCount; k++) 
		{
			var lineItemId = '';
			var lineItemDescription = '';
			var priceDec = '';
			lineItemId = transactionRecord.getLineItemValue('item', 'item', k);
			
			lineItemDescription = nlapiEscapeXML(transactionRecord.getLineItemValue('item', 'description', k));
			priceDec = parseFloat(transactionRecord.getLineItemValue('item', 'amount', k));	
			if (isNaN(priceDec)) 
				priceDec = 0;
			var priceBase = priceDec;
			priceDec = Math.ceil(priceDec + (priceDec * priceLevelRate));
			var priceColumn = nlapiEscapeXML('$' + CurrencyFormatted(priceDec));

			if (lineItemDescription == null) 
				lineItemDescription = '';
			else 	
			{
				//Make an array of the options - all of these should be checked  on the form since we know they are on the order.
				modelOptionsArray[k] = lineItemDescription;
			}
			if (lineItemDescription != '' && lineItemId != modelId &&
			lineItemId != decorId && lineItemId != null && lineItemDescription != null &&
			lineItemId != GetFreightItem() &&	lineItemId != GetFreightDiscountItem() &&
			lineItemId != GetFuelSurchargeItem()) 
			{

				var lineItemChecked = 'X';
				if (split == 0) {
					optionsHTMLRight += CreateOptionalFeaturesRowHTML(priceColumn, lineItemDescription, lineItemChecked);
					split = 1;
				}
				else if (split == 1) 
				{
					optionsHTMLLeft += CreateOptionalFeaturesRowHTML(priceColumn, lineItemDescription, lineItemChecked);
					split = 0;
				}
				
			}
			//Get the price of the model
			if (lineItemId == modelId) 
			{
				selectedModelPrice = priceDec;
			}
			else 
			{
				if (lineItemId != decorId) 
				{
					//Get the Destination charge items.
					if (lineItemId == GetFreightItem() || lineItemId == GetFreightDiscountItem() || lineItemId == GetFuelSurchargeItem()) // freight or fuel surcharge
					{
						totalFreight += Math.ceil(priceBase);
					}
					else 
					{
						if(lineItemId == GetSalesAllowanceItem())
						{
							totalOptions += priceDec;
							nlapiLogExecution('debug', 'totaloptions_salesallowance', 'Sales Allowance is: ' + priceDec);
						}	
						//Get the price of the selected options / the salesorder line items
						if (transactionRecord.getLineItemValue('item', 'custcolrvsmsrp', k) == 'T') 
						{
							totalOptions += priceDec;				
													
						}
					}
				}
			}
		}
	}
	

	//Get the modelOptions	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custrecordmodeloption_model', null, 'is', modelId);
	var modelOptions = nlapiSearchRecord('customrecordrvsmodeloption', 'customsearchdealermodeloptions', filters);
				
	if (modelOptions != null && modelOptions.length > 0) //We found options for the specified series or model
	{	
		//Loop through model options and add them to the table, Mark 'Mandatory' options with 'X'	
		for (var i = 0; i < modelOptions.length; i++) 
		{		
			var itemId = modelOptions[i].getValue('custrecordmodeloption_option');
			var itemName = modelOptions[i].getValue('itemid', 'custrecordmodeloption_option');
			var itemDescription = nlapiEscapeXML(modelOptions[i].getValue('salesdescription', 'custrecordmodeloption_option'));;
			var mandatory = modelOptions[i].getValue('custrecordmodeloption_mandatory');				
			var quantity = parseInt(modelOptions[i].getValue('custrecordmodeloption_quantity'));
			var basePrice = parseFloat(modelOptions[i].getValue('baseprice', 'custrecordmodeloption_option'));
			var msrpPrice = Math.ceil(basePrice + (basePrice * priceLevelRate)); 
			var price = '$' + CurrencyFormatted(msrpPrice * quantity);

			var checked = '';
			var chosenOption = '';
			
			// if item description is already in the optionsHTML, don't add it.
			if (GetIndexOf(modelOptionsArray, itemDescription) == -1 && 
			itemDescription != null &&
			itemId != modelId &&
			itemId != decorId &&
			itemId != null &&
			itemId != GetFreightItem() &&
			itemId != GetFreightDiscountItem() &&
			itemId != GetFuelSurchargeItem()) 
			{
				if (mandatory == 'T') 
				{
					checked = 'X';
					if (isModel) 
					{
						totalOptions += msrpPrice;
					}
				}

				if (split == 1) 
				{
					optionsHTMLLeft += CreateOptionalFeaturesRowHTML(price, itemDescription, checked);
					split = 0;
				}
				else if (split == 0) 
				{
					optionsHTMLRight += CreateOptionalFeaturesRowHTML(price, itemDescription, checked);
					split = 1;
				}
			}
		
			
			//Get the msrp notes from each item, build table.			
			var msrpNotes = nlapiEscapeXML(nlapiLookupField('noninventoryitem', itemId, 'custitemrvsmsrpnotes'));
			if (msrpNotes != null && msrpNotes != '')
			{
				msrpNotesTable += '<tr>' +
				'<td>' +
				'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">' +
				itemDescription +
				'</span></b>: ' +
				msrpNotes +
				'</td>' +
				'</tr>';
			}
		}
	}
	else
	{
		msrpNotesTable += '<tr><td width="435px"><b><span padding="0" margin="0" style="border-bottom:1px solid black;">No Model Option Notes.</span></b></td></tr>';
		optionsHTMLLeft += CreateOptionalFeaturesRowHTML('', 'No Default Options for this Model', '');
		optionsHTMLRight += CreateOptionalFeaturesRowHTML('', 'No Default Options for this Model', '');
	}	
			

	optionsHTMLLeft += '</table>';
	optionsHTMLRight += '</table>';
	msrpNotesTable += '</table>';
	
	// loop through and build the options html table
	var optionsHTML =  
		'<table width="100%">' + 
			'<tr>' + 
				'<td align="center" colspan = "2">' +
					'<span padding="0" margin="0" style="border-bottom:1px solid black;">' +
						'OPTIONAL FEATURES' +
					'</span>' +
				'</td>' +
			'</tr>' +
			'<tr style="border-style:solid; border-width:1px; border-color:black;">' +
				'<td>' +
					optionsHTMLLeft +
				'</td>' +
				'<td>' +
					optionsHTMLRight +
				'</td>' +
			'</tr>' +
		'</table>';
	
	//********* END MODEL SELECTION *********//
	
	//********* START MSRP NOTES AND STANDARD FEATURES SECTION *********//
	
	if (seriesStandardFeatures == null)
		seriesStandardFeatures = '';
		
	var msrModelStandardFeaturesTable = 
		'<table width="435px" style="font-size:6pt; border-style:solid; border-width:1px; border-color:black;">' + 
			'<tr>' + 
				'<td>' +
					'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Standard Features:</span></b> &nbsp;' +  
					seriesStandardFeatures + 
				'</td>' + 
			'</tr>' + 
		'</table>';	
	//********* END MSRP NOTES AND STANDARD FEATURES SECTION *********//
	
	//********* START PRICING SECTION *********//
	// if the ship method is DPU, then get the freight from the items on the dealer
	// this is because freight should not be included on the order 
	
	if (shipMethodId == GetShippingMethodDPUId() && totalFreight == 0)
	{
		totalFreight = 0;
		var dealerRecord = nlapiLoadRecord('customer', dealerId);
		
		for (var i = 1; i <= dealerRecord.getLineItemCount('itempricing'); i++) 
		{
			var itemId = dealerRecord.getLineItemValue('itempricing', 'item', i);
			
			if (itemId == GetFreightItem() || itemId == GetFreightDiscountItem() || itemId == GetFuelSurchargeItem())
			{
				var price = parseFloat(dealerRecord.getLineItemValue('itempricing', 'price', i));
				
				if (isNaN(price))
					price = 0;
					
				totalFreight += price;
			}
		}
	}
	totalFreight = parseFloat(totalFreight);
	totalOptions = parseFloat(totalOptions);
	//The discount from the dealer - to be subtracted from subtotal
	var discount = null;
	if(dealerDiscount != '' && dealerDiscount != 0 && dealerDiscount != null)
		discount = parseFloat(dealerDiscount.substring(1));

	//Get the total cost 
	var totalAmount = (selectedModelPrice + totalOptions + totalFreight) - discount;
	
	if(discount != null)
	{
		discount = '($' + RemoveDecimals(addCommas(nlapiFormatCurrency(discount))) + ')';
	}
	else
		discount = '';
		
	var totalFreightText = '';
	if (!isModel)
		totalFreightText = '$' + RemoveDecimals(addCommas(nlapiFormatCurrency(totalFreight)));
		
	var totalsHTML = 
		'<table width="215px" float="right">' + 
				'<tr>' + 
					'<td style="font-weight:bold;">' + 
						'BASE PRICE' + 
					'</td>' + 
					'<td style="font-weight:bold; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black" align="right">' + 
						'$' + RemoveDecimals(addCommas(nlapiFormatCurrency(selectedModelPrice))) + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td style="font-weight:bold;">' + 
						'OPTIONS' + 
					'</td>' + 
					'<td style="font-weight:bold; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black" align="right">' + 
						 '$' + RemoveDecimals(addCommas(nlapiFormatCurrency(totalOptions))) + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td style="font-weight:bold;">' + 
						'DISCOUNT' + 
					'</td>' + 
					'<td style="font-weight:bold; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black" align="right">' + 
						 discount +
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td style="font-weight:bold;">' + 
						'DESTINATION CHG**' + 
					'</td>' + 
					'<td style="font-weight:bold; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black" align="right">' + 
						 totalFreightText + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td style="font-weight:bold;">' + 
						'TOTAL' + 
					'</td>' + 
					'<td style="font-weight:bold; border-style:solid; border-width:1px; border-color:black;" align="right">' + 
						 '$' + RemoveDecimals(addCommas(nlapiFormatCurrency(totalAmount))) + 
					'</td>' + 
				'</tr>' +
				'<tr>' + 
					'<td style="font-size:6pt;" colspan="2">' + 
						'**Fuel surcharge to fluctuate w/ current fuel prices and may reflect an increase or decrease accordingly.' + 
					'</td>' + 
				'</tr>' +
			'</table>';
	//********* END PRICING SECTION *********//
	
	//********* START HEADER HTML *********//
	var topLeftHTML =
		'<table align="left" style="font-size:9pt;">' +
			'<tr>' + 				
				'<td colspan="2" style="font-weight:bold">' +
					modelYear + ' ' + seriesName + ' ' + modelTypeText +
				'</td>' + 
			'</tr>' +
			'<tr>' +
				'<td colspan="2" style="font-size:8pt">' +
					'*Effective Date: ' + effectiveDate +
				'</td>' + 
			'</tr>' + 
			'<tr>' +
				'<td colspan="2" style="font-size:6pt">' +
					'*Units built prior to this date do not have the same features/specifications.' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td style="font-weight:bold; width:50px; border-style:solid; border-width:1px; border-color:black;">' +
					'Dealer: ' + 
				'</td>' + 
				'<td width= "150px" style="border-style:solid; border-width:1px; border-color:black;">' +
					dealer + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td style="font-weight:bold; border-style:solid; border-width:1px; border-color:black;">' +
					'Order Date: ' +
				'</td>' + 
				'<td style="border-style:solid; border-width:1px; border-color:black;">' +
					dealerOrderDate + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 										
				'<td style="font-weight:bold; border-style:solid; border-width:1px; border-color:black;">' +
					'Ordered By: ' + 
				'</td>' + 
				'<td style="border-style:solid; border-width:1px; border-color:black;">' +
					 dealer +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 		
				'<td style="font-weight:bold; border-style:solid; border-width:1px; border-color:black;">' +
					'Sales Rep: ' + 
				'</td>' + 
				'<td style="border-style:solid; border-width:1px; border-color:black;">' +
					salesRep + 
				'</td>' +
			'</tr>' + 
			'<tr>' + 		
				'<td style="font-weight:bold; border-style:solid; border-width:1px; border-color:black;">' +
					'PO #: ' + 
				'</td>' + 
				'<td style="border-style:solid; border-width:1px; border-color:black;">' +
					PONumber + 
				'</td>' +
			'</tr>' +
			'<tr>' + 		
				'<td style="font-weight:bold; border-style:solid; border-width:1px; border-color:black;">' +
					'Retail Sold: ' + 
				'</td>' + 
				'<td style="border-style:solid; border-width:1px; border-color:black;">' +
					retailSold + 
				'</td>' +
			'</tr>' + 
		'</table>'; 
	
	var topRightHTML =
		'<table align = "center">' +
			'<tr>' +
				'<td style="font-weight:bold; font-size:14pt; font-family:Times New Roman, Times, serif; color:red;">' +
					'CONFIDENTIAL DEALER PRICING' +					 
				'</td>' +
			'</tr>' +
		'</table>' +
		'<br />' +
		'<table align = "center" width = "95%" style="font-size:9pt; border-style:solid; border-width:1px; border-color:black;">' +
			'<tr>' +
				'<td style="font-weight:bold; width:75px;">' +
					'VIN: ' +
				'</td>' +
				'<td>' +
					VIN +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td style="font-weight:bold; width:75px;">' +
					'Serial #: ' +
				'</td>' +
				'<td>' +
					serialNum +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td style="font-weight:bold">' +
					'ONLINE: ' +
				'</td>' +
				'<td>' +
					onlineDate +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td style="font-weight:bold">' +
					'OFFLINE: ' +
				'</td>' +
				'<td>' +
					offlineDate +
				'</td>' +
			'</tr>' +
				chassisHTML +
		'</table>';
	
		
	var topHTML = 
		'<table width="100%">' + 
			'<tr>' + 
				'<td align="center" colspan = "2">' +
					'<img src="' + GetCompanyPageLogo() + '" width="150px" height="60px" />' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td colspan="2" align="center" style="font-size:14pt;">' +
					seriesName + ' ' + modelTypeText +
				'</td>' + 
			'</tr>' +
			'<tr>' +
				'<td width = "50%">' +
					topLeftHTML +
				'</td>' +
				'<td>' +
					topRightHTML +
				'</td>' +
			'</tr>' +
		'</table>';	
		
	//********* END HEADER HTML *********//
	
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var companyName = companyInfo.getFieldValue('companyname');
	var companyAddress1 = companyInfo.getFieldValue('address1');
	var companyCity = companyInfo.getFieldValue('city'); 
	var companyState = companyInfo.getFieldValue('state'); 
	var companyZip = companyInfo.getFieldValue('zip'); 
	var companyPhone = companyInfo.getFieldValue('phone'); 
	var companyFax = ConvertNSFieldToString(companyInfo.getFieldValue('fax'));
	
	var footerTable = 
		'<table width="100%" border="1">' + 
			'<tr>' + 
				'<td colspan="2">' + 
					'<table width="100%" style="font-size:6pt;">' + 
						'<tr>' + 
							'<td align="center">' +
								'<i>*** Prices, features and options are subject to change without notice.</i>' +  
							'</td>' + 
						'</tr>' + 
					'</table>' + 
				'</td>' + 
			'</tr>' +
			'<tr>' + 
				'<td colspan="2">' + 
					'<table width="100%" style="font-size:6pt; border-style:sold; border-width:1px; border-color:black;">' + 
						'<tr>' + 
							'<td align="center">' +
								companyName + ' - ' + companyAddress1 + ', ' + companyCity + ', ' + companyState + ' ' + companyZip + ' PHONE: ' + companyPhone + ' FAX: ' + companyFax +  
							'</td>' + 
						'</tr>' + 
					'</table>' + 
				'</td>' + 
			'</tr>' +
		'</table>';

	//********* START FINAL HTML LAYOUT SECTION *********//	
	var html = 	
		'<head>' + 
			'<macrolist>' + 
			    '<macro id="footer">' + 
					footerTable +
			    '</macro>' +
		    '</macrolist>' +
		'</head>' +  
		'<body style="font-size:10pt; font-family: Verdana, Geneva, sans-serif; margin:0pt 0pt 0pt 0pt;" footer="footer">' + 
			'<table width="100%" align="center" border="1">' + 
				'<tr>' + 
					'<td>' + 
						topHTML + 
					'</td>' + 
				'</tr>' +
				'<tr>' +
					'<td>' +
						'<table width="100%">' +
							'<tr>' +
								'<td width="25%">' + 
									decorHTML + 
								'</td>' + 						
								'<td width="75%">' + 
									modelHTML + 
								'</td>' + 
							'</tr>' + 
						'</table>' +
					'</td>' +
				'</tr>' +
				'<tr>' +
					'<td>' + 
						optionsHTML + 
					'</td>' + 
				'</tr>' +
				'<tr>' +
					'<td>' +
						'<table>' +
							'<tr>' +
								'<td>' + 
									msrpNotesTable + 
								'</td>' + 						
								'<td rowspan="2">' + 
									totalsHTML + 
								'</td>' + 
							'</tr>' +
							'<tr>' +
								'<td>' +
								msrModelStandardFeaturesTable +
								'</td>' +
							'</tr>' + 
						'</table>' +
					'</td>' +
				'</tr>' +
			'</table>' + 
		'</body>';

	return html;
	//********* END FINAL HTML LAYOUT SECTION *********//	
}