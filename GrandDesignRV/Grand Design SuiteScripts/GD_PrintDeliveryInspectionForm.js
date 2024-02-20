/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Sep 2014     caseylo
 *
 */
//***********************
//Name: GD_PrintDeliveryInspectionCustomAction
//Description: Action that saves the sales order Id in the session so the driver check List can be printed.
//Use: Workflow Action event
//************************
function GD_PrintDeliveryInspectionCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('printdelinspectform_recordid', nlapiGetRecordId());
	nlapiLogExecution('debug', 'Record ID', nlapiGetRecordId());
}

//***********************
//Name: GD_PrintDeliveryInspectionSuitelet
//Description: Generates a pdf of the delivery inspection form
//Use: Suitelet event
//************************
function GD_PrintDeliveryInspectionSuitelet(request, response)
{
	nlapiLogExecution('debug', 'GD_PrintDeliveryInspectionSuitelet', nlapiGetRecordId());
	var context = nlapiGetContext();
	var salesOrderID = context.getSessionObject('printdelinspectform_recordid');
	context.setSessionObject('printdelinspectform_recordid', null);
	
	nlapiLogExecution('DEBUG', 'Id', salesOrderID);
	
	if (salesOrderID == '' || salesOrderID == null)
	{
		salesOrderID = request.getParameter('internalid');
	}
	
	if (salesOrderID != '' && salesOrderID != null) 
	{
		var pdfTitle = 'Delivery Inspection Form' + nlapiLookupField('salesorder', salesOrderID, 'tranid') + '.pdf';
		var html = GD_GetDeliveryInspectionHTML(salesOrderID);//unitID
		
//		response.write(html);
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}

//***********************
//Name: GD_FormatTable
//Description: takes in an array that contains the items to check on RV and formats into a table
//Use: Helper
//************************
function GD_FormatTable(array)
{
	var formattedTable = '';
	var myTable = '';
	var name = '';
	
	for(var i=1; i<(array.length); i++)
	{//this function formats the contents of a table using the 1st element of the array as a keyword to make the name of the check box group unique
	 //the pdf is interactive (user may actually click on the check boxs to select them
		name = array[0] + i;
		myTable +=
			'<tr>' +
				'<td colspan="3" align="center">' +
					'<input type="checkbox" name="' + name + '" value="ok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
				'<td colspan="3" align="center">' +
					'<input type="checkbox" name="' + name + '" value="nok" checked="false" style="width:15px; height:15px;"/>' +
				'</td>' +
				'<td colspan="10" align="left">' +
					'&nbsp;' + array[i] +
				'</td>' +
				'<td colspan="84" style="border-bottom: 1px solid #000000;">' +
					'&nbsp;' +
				'</td>' +
			'</tr>';
	}
	
	formattedTable = 
	 	'<table width="100%" cellpadding="0">' +
	 		myTable +
		'</table>';
	return formattedTable;
}

//***********************
//Name: GD_GetDeliveryInspectionHTML
//Description: Contains the html needed to generate the pdf
//Use: Helper
//************************
function GD_GetDeliveryInspectionHTML(salesorderid)
{
	var html = '';
	var topHTML = '';
	var midHTML1 = '';
	var midHTML2 = '';
	var bottomHTML = '';
	
	var salesOrderID = nlapiLoadRecord('salesorder', salesorderid);
	var serialNumber_shipDate = nlapiLookupField('customrecordrvsunit', salesOrderID.getFieldValue('custbodyrvsunit'), ['name', 'custrecordunit_shipdate'], false);
	//var shipDate = nlapiLookupField('customrecordrvsunit', salesOrderID.getFieldValue('custbodyrvsunit'), 'custrecordunit_shipdate', true);
	var dealershipName = ConvertNSFieldToString(salesOrderID.getFieldText('entity'));
	var series = ConvertNSFieldToString(salesOrderID.getFieldText('custbodyrvsseries'));
	var model = ConvertNSFieldToString(salesOrderID.getFieldText('custbodyrvsmodel'));
	//var modelYear = nlapiLookupField('customrecordrvsunit', salesOrderID.getFieldValue('custbodyrvsunit'), 'custrecordunit_modelyear', true);
	
	var exterior = ["exterior", "Front Wall/Cap", "DS Sidewall", "ODS Sidewall", "Skirt Metal", "Rear Wall/Cap", "Roof &#38; Attachments",
	                "Frame/Hitch", "Axels/Wheels/Tires", "Jacks/Landing Legs", "Entry Door/Steps", "Baggage Doors", "Slide Rooms",
	                "Awnings", "Lights/Wall Attach.", "Decals/Paint"];
	var interior = ["Interior", "Interior Wall Panels", "Ceiling Panels", "Floor Covering", "Interior Trim", "Countertops", "Cabinets/Fronts", 
	                "Pass Through Doors", "Door Fronts/Drawers", "Appliances", "Welcome Bag/<br /> Owner's Manuals", "Furniture", "Tables/Chairs", "Sinks/Fixtures", "Tub/Shower", "Drapes/Soft Goods",
	                "Slide Room", "Windows"];
	
	topHTML = 
		
		'<table width="100%" cellpadding="0">' +
			'<tr>' +
				'<td colspan="100" align="center" style="font-size:20px;" >' +
					'Grand Design RV - Delivery Inspection Form ' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td>' +
					'<shape width="100" height="10" border="1">' +
						'<shapepath>' +
							'<moveto x="0" y="5"/>' +
							'<lineto x="538" y="5"/>' +
						'</shapepath>' +
					'</shape>' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td colspan="5" align="left">' +
					'Dealership Name:' + 
				'</td>' +
				'<td colspan="55" align="left">' +
					dealershipName +
				'</td>' +
				'<td colspan="25" align="left">' +
					'Serial Number:' + 
				'</td>' +
				'<td colspan="15" align="left">' +
				serialNumber_shipDate.name +
				'</td>' +
			'</tr>' +
			
			'<tr>' +
				'<td colspan="5" align="left">' +
					'Unit Make/Model:' + 
				'</td>' +
				'<td colspan="55" align="left">' +
					series + ' ' + model +
				'</td>' +
				'<td colspan="25" align="left">' +
					'Unit Ship Date:' + 
				'</td>' +
				'<td colspan="15" align="left">' +
				serialNumber_shipDate.custrecordunit_shipdate +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td colspan="100" align="left">' +
					'<b><i>Dealer: Please perform a thorough and complete inspection at time of delivery with driver present. Inspect both the exterior and the interior of unit for damage and/or shortages and clearly note below.</i></b>' +
				'</td>' +
			'</tr>' +	
		'</table>';//close topHTML
	
	midHTML1 = 
		'<table width="100%" cellpadding="0">' +
			 '<tr>' +
			 	'<td colspan="100" align="left">' +
			 		'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">EXTERIOR</span></b>' +
			 	'</td>' +
			 '</tr>' +
			 '<tr>' +
			 	'<td colspan="35" align="left">' +
			 		'&nbsp;OK&nbsp;&nbsp;&nbsp;N/OK' +
			 	'</td>' +
			 	'<td colspan="65" align="center">' +
			 		'<b><i>Describe Damage or Specific Shortage</i></b>' +
			 	'</td>' +
			 '</tr>' +
		'</table>' +
		 GD_FormatTable(exterior);
	
	midHTML2 = 
		'<table width="100%" cellpadding="0">' +
			 '<tr>' +
			 	'<td colspan="100" align="left">' +
			 		'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">INTERIOR</span></b>' +
			 	'</td>' +
			 '</tr>' +
			 '<tr>' +
			 	'<td colspan="35" align="left">' +
			 		'&nbsp;OK&nbsp;&nbsp;&nbsp;N/OK' +
			 	'</td>' +
			 	'<td colspan="65" align="center">' +
			 		'<b><i>Describe Damage or Specific Shortage</i></b>' +
			 	'</td>' +
			 '</tr>' +	
		'</table>' +//close midHTML2
		GD_FormatTable(interior);
	
	bottomHTML = 
		'<table width="100%" cellpadding="0">' +
			'<tr>' +
				'<td colspan="15" align="left">' +
					'Delivery Date:' +
				'</td>' +
				'<td colspan="38" style="border-bottom: 1px solid #000000;">' +
				'</td>' +
				'<td colspan="10">' +
					'&nbsp;' +
				'</td>' +
				'<td colspan="12" align="right">' +
					'Delivery Time:' +
				'</td>' +
				'<td colspan="27" style="border-bottom: 1px solid #000000;">' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td colspan="15" align="left">' +
					'Dealer Signature:' +
				'</td>' +
				'<td colspan="38" style="border-bottom: 1px solid #000000;">' +
				'</td>' +
				'<td colspan="10">' +
					'&nbsp;' +
				'</td>' +
				'<td colspan="12" align="right">' +
					'(Print)' +
				'</td>' +
				'<td colspan="27" style="border-bottom: 1px solid #000000;">' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td colspan="15" align="left">' +
					'Driver Signature:' +
				'</td>' +
				'<td colspan="38" style="border-bottom: 1px solid #000000;">' +
				'</td>' +
				'<td colspan="10">' +
					'&nbsp;' +
				'</td>' +
				'<td colspan="12" align="right">' +
					'(Print)' +
				'</td>' +
				'<td colspan="27" style="border-bottom: 1px solid #000000;">' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td colspan="100" align="left">' +
					'<br />' +
				'</td>' +
			'</tr>' +
			'<tr>' +
				'<td colspan="100" align="left">' +
					'<b><i>Completed form MUST be submitted within 24 hrs of unit inspection/check in! Please scan &#38; e-mail to </i></b>' +
					'<span padding="0" margin="0" style="border-bottom:1px solid black;">registration@granddesignrv.com or fax to: 574-825-8134 Att: Warranty Dept.</span>' +
				'</td>' +
			'</tr>' +
		'</table>';
	
	html = 
		'<body style="font-family:Calibri,Verdana, Arial,Sans-serif;font-size:14px;" size="letter">' +
			'<table>' +
				'<tr>' +
					'<td>' +
						topHTML +
					'</td>' +
				'</tr>' +
				'<tr>' +
					'<td>' +
						midHTML1 +
					'</td>' +
				'</tr>' +
				'<tr>' +
					'<td>' +
						midHTML2 +
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

