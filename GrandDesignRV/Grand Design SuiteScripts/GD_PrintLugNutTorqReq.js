// Acct: 

//***********************
//Name: GD_PrintLugNutTorqReq
//Description: Action that generates a pdf of the Lug Nut Torquw Requirements for travel trailers and fifth wheels.
//Use: Workflow Action event
//************************
function GD_PrintLugNutTorqReqCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('printlugnut_recordid', nlapiGetRecordId());
	//nlapiLogExecution('debug', 'Record ID', nlapiGetRecordId());
}

//***********************
//Name: GD_PrintLugNutTorqReqSuitelet
//Description: Generates a pdf of the Driver Check List
//Use: Suitelet event
//************************
function GD_PrintLugNutTorqReqSuitelet(request, response)
{
	var context = nlapiGetContext();
	var salesOrderID = context.getSessionObject('printlugnut_recordid');
	context.setSessionObject('printlugnut_recordid', null);
	
	//nlapiLogExecution('DEBUG', 'Id', tranId);
	
	if (salesOrderID == '' || salesOrderID == null)
	{
		salesOrderID = request.getParameter('internalid');
	}
	
	if (salesOrderID != '' && salesOrderID != null) 
	{
		var pdfTitle = 'Lug Nut Torquing Requirement' + nlapiLookupField('salesorder', salesOrderID, 'tranid') + '.pdf';
		var html = GD_GetLugNutTorqReqHTML(salesOrderID);
		
//		response.write(html);
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

//***********************
//Name: GD_GetLugNutTorqReqHTML
//Description: Contains the html needed to generate the pdf
//Use: Helper
//************************
function GD_GetLugNutTorqReqHTML(salesOrderID)
{
	var torqReq = nlapiLoadFile('405852');
	//nlapiLogExecution('debug', 'torgueReq', torqReq.getURL());
	//nlapiLogExecution('debug', 'logo', GetCompanyPageLogo());
	var gdLogo = nlapiLoadFile('405851');
	//nlapiLogExecution('debug', 'logo', gdLogo.getURL());
	
	var html = '';
	var salesOrderID = nlapiLoadRecord('salesorder', salesOrderID)
	//var unit = getFieldText('custbodyrvsunit');
	var vin = salesOrderID.getFieldText('custbodyrvsunit');
	
	var modelText = salesOrderID.getFieldText('custbodyrvsmodel');
	if(modelText == null)
		modelText = '';
	//var model = modelText.getFieldText
	
	var completedDate = salesOrderID.getFieldValue('custrecordunit_datecompleted');
	if(completedDate == null)
		completedDate = '';
	
	//var dateLength = completedDate.length;
	var modelYear = nlapiLookupField('customrecordrvsunit', salesOrderID.getFieldValue('custbodyrvsunit'), 'custrecordunit_modelyear', true);
		//salesOrderID.getFieldText('custitemrvsmodelyear');
	
	var seriesText = salesOrderID.getFieldText('custbodyrvsseries');//Series is the Brand
	if(seriesText == null)
		seriesText = '';
	
	if (salesOrderID != null)
	{
		var mainTable = 
			'<table width="100%" align="center">' +
				'<tr>' + 
					'<td width="100%">';
		
		
		var contentTable = 
			'<table width="100%" cellpadding="5" >' +
			'<tr>' + 
				'<td align="center" colspan = "100">' +
				'<img src="' + nlapiEscapeXML(gdLogo.getURL()) + '" width="300px" height="150px" />' +
				'</td>' + 
			'</tr>' + 
			'<tr>' +
				'<td colspan="100" align="center" height="30px" style="font-size:24px;">' +
					'<b>Lug Nut Torqing Requirement</b>' +
				'</td>' +	
			'</tr>' +
			'<tr>' +
				'<td colspan="100" align="center" height="10px" style="font-size:16px;">' +
					'<p>For Travel Trailers and Fifth Wheels</p>' +
				'</td>' +
			'</tr>' +
			
			'<tr>' +
				'<td colspan="100" align="left">' +
					'<span style="border-bottom:1px solid black;">Model Year</span>' + ':&nbsp; ' + modelYear + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
					'<span style="border-bottom:1px solid black;">Brand</span>' + ':&nbsp; ' + seriesText + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
					'<span style="border-bottom:1px solid black;">Unit 17-digit VIN</span>' + ':&nbsp; ' + vin + 
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td colspan="20" align="left">' +
					'<span style="border-bottom:1px solid black;"><b>ATTENTION DRIVERS</b></span>' + ':<br />' +
					'The torque on all the wheel lug nuts must be checked at 10 miles (1st stage), 25 miles (2nd stage), and again  ' + 
					' at 50 miles (3rd stage) to assure proper torque is maintained. Do not allow under or over torque on any wheel. ' +
					'<ul>' +
						'<li>Match the chart installed to the wheel size on the trailer to determine the correct torque for each stage. ' +
						'(this chart should be used unless otherwise specified by Grand Design RV.)</li>' +
						'<li>Tightening fasteners should be done in stages, using the sequence shown.</li>' +
					'</ul>' +
				'</td>' +
				'<td colspan = "80">' +
					'<img src="' + nlapiEscapeXML(torqReq.getURL()) + '" width="400px" height="350px" />' +
				'</td>' + 
			'</tr>' +
			'<tr>' +
				'<td colspan="100">' +
					'<span style="border-bottom:1px solid black;"><b>Driver Agreement:</b></span><br />' +
					'I have a properly calibrated torque wrench in my possession, which fits the wheel nuts of this trailer. I ' + 
					'agree to perform the checking procedure previously detailed, at the prescribed intervals. ' +
				'</td>' +
			'</tr>' +		
			
			'<tr>' +
				'<td colspan="100" align="center">' +
					'<p>' +
						'<b>Transport Driver</b>' + 
					'</p>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td colspan="20" align="right">' +
					'Signature<br /><br />' +
					'Printed Name<br /><br />' +
					'Company<br /><br />' +
					'Date<br /><br />' +
				'</td>' +
				'<td colspan="80" align="left">' +
					'___________________________________________________<br /><br />' +
					'___________________________________________________<br /><br />' +
					'___________________________________________________<br /><br />' +
					'___________________________________________________<br /><br />' +
				'</td>' +
			'</tr>' +
			
			'<tr>' + 			
				'<td colspan="100" align="center" height="0px" style="font-size:10px; line-height:25%; margin-bottom:-.25cm; color:goldenrod;">' + 
					'11333 County Road 2, Middlebury, IN 46540' +
				'</td>' +
			'</tr>' +
			'<tr>' + 			
				'<td colspan="100" align="center" height="0px" style="font-size:10px; line-height:25%; margin-bottom:-.25cm; color:goldenrod;">' + 
					'Phone: 574-825-8000, Fax: 574-825-9700' +
				'</td>' +
			'</tr>' +
			'<tr>' + 			
				'<td colspan="100" align="center" height="0px" style="font-size:10px; line-height:25%; color:goldenrod;">' + 
					'granddesignrv.com' +
				'</td>' +
			'</tr>' +
			
		'</table>';
		
		mainTable += contentTable;
		
		//close main table
		mainTable +=
					'</td>' +
				'</tr>' +
			'</table>';
		
		html = 
			'<head>' + 
				'<meta name="title" value="VIN # ' + vin + '" />' + 
			'</head>' + 
			'<body style="font-family:Calibri,Verdana, Arial,Sans-serif;font-size:14px;" size="letter">' + 
				mainTable +
			'</body>';
		
	}
	
	return html;
}
