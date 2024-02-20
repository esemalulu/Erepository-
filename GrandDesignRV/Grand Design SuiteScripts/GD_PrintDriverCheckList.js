/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Sep 2014     caseylo
 *
 */
//***********************
//Name: GD_PrintDriverCheckListCustomAction
//Description: Action that saves the sales order Id in the session so the driver check List can be printed.
//Use: Workflow Action event
//************************
function GD_PrintDriverCheckListCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('printdriverchecklist_recordid', nlapiGetRecordId());
	nlapiLogExecution('debug', 'Record ID', nlapiGetRecordId());
}

//***********************
//Name: GD_PrintDriverCheckListSuitelet
//Description: Generates a pdf of the Driver Check List
//Use: Suitelet event
//************************
function GD_PrintDriverCheckListSuitelet(request, response)
{
	var context = nlapiGetContext();
	var salesOrderID = context.getSessionObject('printdriverchecklist_recordid');
	context.setSessionObject('printdriverchecklist_recordid', null);
	
	nlapiLogExecution('DEBUG', 'GD_PrintDriverCheckListSuitelet', 'id: ' + salesOrderID);
	
	if (salesOrderID == '' || salesOrderID == null)
	{
		salesOrderID = request.getParameter('internalid');
	}
	
	if (salesOrderID != '' && salesOrderID != null) 
	{
		var pdfTitle = 'Driver Check List Form' + nlapiLookupField('salesorder', salesOrderID, 'tranid') + '.pdf';
		var html = GD_PrintDriverCheckListHTML(salesOrderID);

		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

//***********************
//Name: GD_PrintDriverCheckListHTML
//Description: Contains the html needed to generate the pdf
//Use: Helper
//************************
function GD_PrintDriverCheckListHTML(salesOrderID){
	var html = '';
	var topHTML = '1';
	var midHTML = '2';
	var bottomHTML = '3';
//	var gdLogo = nlapiLoadFile('154975');
	var gdLogo = nlapiLoadFile('405851');
//	var gdLogo = GetCompanyPageLogo();
	
	var order = nlapiLoadRecord('salesorder', salesOrderID);
	var vin = order.getFieldText('custbodyrvsunit');
	var dealerNumber = nlapiEscapeXML(nlapiLookupField('customer', order.getFieldValue('entity'), 'entitynumber'));
	var dealerName = nlapiEscapeXML(order.getFieldValue('shipaddressee'));
	var dealerCity = nlapiEscapeXML(order.getFieldValue('shipcity'));
	var dealerState = nlapiEscapeXML(order.getFieldValue('shipstate'));
	var orderModel = nlapiEscapeXML(order.getFieldText('custbodyrvsmodel'));
	var orderPONumber = nlapiEscapeXML(order.getFieldValue('otherrefnum')) || '';
	
	var invoiceResults = salesOrderInvoiceDateSearch(salesOrderID);
	
	var invoiceDate = (invoiceResults.length > 0) ? invoiceResults[0].getValue('trandate') : '';
	
	// Pull the unit record
	var unitId = order.getFieldValue('custbodyrvsunit');
	var unit = nlapiLoadRecord('customrecordrvsunit', unitId); 

	// Unit Department IDs: 
	var department = nlapiEscapeXML(unit.getFieldValue('custrecordgd_unit_department')); 

	// look up to see if the transport company has "Print on Driver Sheet" = True. If so, we'll print it. 
	var transportCoName = '';
	var transportCo = nlapiLookupField('customrecordrvsunit',unitId,'custrecordunit_transportco');
	if(transportCo)
	{
		var transportCoInfo = nlapiLookupField('vendor',transportCo,['custentitygd_printondriversheet','entityid']);
		if(transportCoInfo.custentitygd_printondriversheet == 'T')
			transportCoName = transportCoInfo.entityid;
	}

	// Proper spacing of the bottom part of the printout is dependent on the unit department
	bottomSpacerTowable = '&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;<br />'
	bottomSpacerMotorized = '&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;<br />'

	// Department Conditional
	if (department == GD_DEPARTMENT_TOWABLES) {

		// Set the proper spacer
		bottomSpacer = bottomSpacerTowable;

	} else if (department == GD_DEPARTMENT_MOTORHOME) {

		// Set the proper spacer
		bottomSpacer = bottomSpacerMotorized;	

		// Retrieve the variables that pertain to Motorized Units 
		var serialNum = nlapiEscapeXML(unit.getFieldValue('custrecordunit_serialnumber'));
		var chassisMfg = nlapiEscapeXML(unit.getFieldText('custrecordgd_unit_chassismanufacturer'));
		var chassisModel = nlapiEscapeXML(unit.getFieldValue('custrecordgd_unit_chassismodel'));
		
		// Create a variable to hold additional topHTML data that pertains to Motorized Units 
		var motorizedUnitData =
			'<tr>' +
				'<td>' +
					'&nbsp;<br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="7" style="border-bottom: 1px solid #000000;">' +
					'Serial #:' +
				'</td>' +
				'<td align="left" colspan="26" style="border-bottom: 1px solid #000000;">' +
					serialNum +
				'</td>' +
				'<td align="left" colspan="10" style="border-bottom: 1px solid #000000;">' +
					'Chassis:' +
				'</td>' +
				'<td align="left" colspan="28" style="border-bottom: 1px solid #000000;">' +
					chassisMfg + "    " + chassisModel +
				'</td>' +
				'<td align="left" colspan="14" style="border-bottom: 1px solid #000000;">' +
					'Starting Mileage: ' +
				'</td>' +
				'<td align="left" colspan="13" style="border-bottom: 1px solid #000000;">' +
					' ' +
				'</td>' +
			'</tr>';
	}

	topHTML = 
		'<table width="100%" cellpadding="0">' +
			'<tr>' +
				'<td align="center" colspan = "100">' +
					'<img src="' + nlapiEscapeXML(gdLogo.getURL()) + '" width="300px" height="150px" />' +
				'</td>' + 
			'</tr>' +
			'<tr>' +
				'<td align="center" colspan="100" style="font-size:20px">' +
					'Transportation Driver Check List Form' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'&nbsp;<br />&nbsp;<br />' +
				'</td>' + 
			'</tr>' +
			'<tr>' +	
				'<td align="left" colspan="50" style="border-bottom: 1px solid #000000;">' +
					'Date:  ' + invoiceDate +
				'</td>' +
				'<td align="left" colspan="50" style="border-bottom: 1px solid #000000;">' +
					'Transport Co:  ' + transportCoName +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'&nbsp;<br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="100" style="border-bottom: 1px solid #000000;">' +
					'Driver&#39;s Name:' +
				'</td>' +
			'</tr>' +
				'<tr>' +
				'<td>' +
					'&nbsp;<br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="13" style="border-bottom: 1px solid #000000;">' +
					'17-digit VIN:' +
				'</td>' +
				'<td align="left" colspan="26" style="border-bottom: 1px solid #000000;">' +
					vin +
				'</td>' +
				'<td align="left" colspan="8" style="border-bottom: 1px solid #000000;">' +
					'Model:' +
				'</td>' +
				'<td align="left" colspan="26" style="border-bottom: 1px solid #000000;">' +
					orderModel +
				'</td>' +
				'<td align="left" colspan="9" style="border-bottom: 1px solid #000000;">' +
					'PO #: ' +
				'</td>' +
				'<td align="left" colspan="18" style="border-bottom: 1px solid #000000;">' +
					orderPONumber +
				'</td>' +
			'</tr>' +
				motorizedUnitData +
			'<tr>' +
				'<td>' +
					'&nbsp;<br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="15" style="border-bottom: 1px solid #000000;">' +
					'Ship To:' +
				'</td>' +
				'<td align="left" colspan="85" style="border-bottom: 1px solid #000000;">' +
					dealerNumber + ' ' + dealerName + ' - ' + dealerCity + ", " + dealerState +
				'</td>' +
			'</tr>' +
				'<tr>' +
				'<td>' +
					'&nbsp;<br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="15" style="color:red">' +
					'<b>IMPORTANT! </b>' +
				'</td>' +
				'<td align="left" colspan="85" >' +
					'Put a checkmark in each box below to indicate you have checked the following items:' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'&nbsp;<br />&nbsp;<br />' +
				'</td>' +
			'</tr>' +
		'</table>';
	
	var midHTMLMotorized = 
		'<table width="100%" cellpadding="0">' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Tire Pressure (Front)' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left1" value="ok" checked="false" style="width:15px; height:15px;"/>' + 
				'</td>' +
				'<td align="left" colspan="20">' +
					'Storage Compartments Locked' +
				'</td>' +
				'<td colspan="60" align="left">' +
					'<input type="checkbox" name="right1" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Tire Pressure (Rear)' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left2" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
				'<td align="left" colspan="20">' +
					'No Visible Scratches or Dents' +
				'</td>' +
				'<td colspan="60" align="left">' +
					'<input type="checkbox" name="right2" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Check Lights' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left3" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
				'<td align="left" colspan="20">' +
					'Deadbolt Locked' +
				'</td>' +
				'<td colspan="60" align="left">' +
					'<input type="checkbox" name="right3" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Jacks Secured Up' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left4" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
				'<td align="left" colspan="20">' +
					'Spare Tire Installed' +
				'</td>' +
				'<td colspan="60" align="left">' +
					'<input type="checkbox" name="right4" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Keys/Packet' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left4" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
				'<td align="left" colspan="20">' +
					'Fuel (1/4 Tank)' +
				'</td>' +
				'<td colspan="60" align="left">' +
					'<input type="checkbox" name="right4" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'&nbsp;<br />' +
				'</td>' +
			'</tr>' +
		'</table>';

	var midHTMLTowable = 
		'<table width="100%" cellpadding="0">' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Tire Pressure' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left1" value="ok" checked="false" style="width:15px; height:15px;"/>' + 
				'</td>' +
				'<td align="left" colspan="20">' +
					'Storage Compartments Locked' +
				'</td>' +
				'<td colspan="60" align="left">' +
					'<input type="checkbox" name="right1" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Check Lights' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left2" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
				'<td align="left" colspan="20">' +
					'No Visible Scratches or Dents' +
				'</td>' +
				'<td colspan="60" align="left">' +
					'<input type="checkbox" name="right2" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Jacks Secured Up' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left3" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
				'<td align="left" colspan="20">' +
					'Spare Tire Installed' +
				'</td>' +
				'<td colspan="60" align="left">' +
					'<input type="checkbox" name="right3" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Keys/Packet' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left4" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="left" colspan="10">' +
					'Deadbolt Locked' +
				'</td>' +
				'<td colspan="10" align="center">' +
					'<input type="checkbox" name="left4" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'&nbsp;<br />' +
				'</td>' +
			'</tr>' +
		'</table>';
		
	bottomHTML = 
		'<table width="100%" cellpadding="0">' +
			'<tr>' +
				'<td>' +
					'Also, take the time to carefully check your unit for scratches, dents, etc. These may be minor when you pick up the unit,&nbsp;' +
					'but may result in a driver claim. Make a note on this sheet and leave it in the Grand Design RV Transportation Department&nbsp;' +
					'office or in-bound pay box <b><span padding="0" margin="0" style="border-bottom:1px solid black;">BEFORE</span></b>&nbsp;leaving.' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'&nbsp;<br />&nbsp;<br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">If there is a major problem, DO NOT leave with the unit!</span></b>' +
				'</td>' +
			'</tr>' +
			'<tr>' +	
				'<td>' +
					'Other problems on the unit to be noted: ' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td style="border-bottom:1px solid #000000;">' +
					'&nbsp;<br /><br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td style="border-bottom: 1px solid #000000;">' +
					'&nbsp;<br /><br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td style="border-bottom: 1px solid #000000;">' +
					'&nbsp;<br /><br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td style="border-bottom: 1px solid #000000;">' +
					'&nbsp;<br /><br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					bottomSpacer +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="center" style="font-size:10px; color:goldenrod">' +
					'11333 County Road 2, Middlebury, IN 46540<br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="center" style="font-size:10px; color:goldenrod">' +
					'Phone: 574-825-8000, Fax: 574-825-9700<br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td align="center" style="font-size:10px; color:goldenrod">' +
					'granddesignrv.com' +
				'</td>' +
			'</tr>' +
		'</table>';
	
	// Department Conditional
	if (department == GD_DEPARTMENT_TOWABLES) {
		midHTML = midHTMLTowable;
	} else if (department == GD_DEPARTMENT_MOTORHOME) {
		midHTML = midHTMLMotorized;
	}

	html = 
		'<head><style>td p {align: left;}</style></head>' + 
		'<body style="font-family:Calibri,Verdana, Arial,Sans-serif;font-size:14px;" size="letter">' +
			'<table width="100%" cellpadding="0">' +
				'<tr>' +
					'<td>' +
						topHTML +
					'</td>' +
				'</tr>' +
				'<tr>' +
					'<td>' +
						midHTML +
					'</td>' +
				'</tr>' +
				'<tr>' +	
					'<td>' +
						bottomHTML +
					'</td>' +
				'</tr>' +
			'</table>' +
		'</body>';
	
	return html;

}

function salesOrderInvoiceDateSearch(anyInternalId)
{
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('createdfrom',null,'anyOf',anyInternalId);
	filters[filters.length] = new nlobjSearchFilter('mainline',null,'is','T');
	filters[filters.length] = new nlobjSearchFilter('custbodyrvsordertype',null,'is',2);
	
	var columns = new Array();
	columns[columns.length] = new nlobjSearchColumn('internalid');
	columns[columns.length] = new nlobjSearchColumn('trandate');
	
	var searchresults = nlapiSearchRecord('invoice', null, filters, columns);
	if (searchresults != null && searchresults.length > 0) return searchresults;
	else return [];
}