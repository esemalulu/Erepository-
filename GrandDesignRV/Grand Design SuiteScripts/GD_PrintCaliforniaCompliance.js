/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Jul 2015     brians
 *
 */

function GetCaliforniaComplianceHTML(salesOrderId){
var html = '';
var topHTML = '';
var midHTML = '';

var companyInfo = nlapiLoadConfiguration('companyinformation');
var companyName = nlapiEscapeXML(companyInfo.getFieldValue('companyname'));
var companyAddress1 = companyInfo.getFieldValue('address1');
var companyCity = companyInfo.getFieldValue('city'); 
var companyState = companyInfo.getFieldValue('state');
var companyZip = companyInfo.getFieldValue('zip');
var companyPhone = companyInfo.getFieldValue('phone');
var companyFax = ConvertNSFieldToString(companyInfo.getFieldValue('fax'));
var companyWebsite = 'granddesignrv.com';
//var companyLogoUrl = GetCompanyPageLogo();	

var order = nlapiLoadRecord('salesorder', salesOrderId);

var unitId = order.getFieldValue('custbodyrvsunit');
var unit = nlapiLoadRecord('customrecordrvsunit', unitId);
var modelId = unit.getFieldValue('custrecordunit_model');

var model = nlapiLoadRecord('assemblyitem', modelId);
var modelYear = model.getFieldText('custitemrvsmodelyear');
var modelName = order.getFieldText('custbodyrvsmodel');
//Checks to see if the model display name is defined (since it is an optional field)
if(model.getFieldText('displayname') != null) var modelName = model.getFieldText('displayname');
var seriesName = model.getFieldText('custitemrvsmodelseries');

var vin = order.getFieldText('custbodyrvsunit');
var gdLogo = nlapiLoadFile('77');

topHTML = 
	'<table width="100%" cellpadding="0">' +
		'<tr>' +
			'<td align="center" colspan = "100">' +
				'<img src="' + nlapiEscapeXML(gdLogo.getURL()) + '" width="200px" height="60px" />' +
			'</td>' + 
		'</tr>' +
		'<tr>' +
		'<td>' +
			'&nbsp;&#10;' +
		'</td>' +
		'</tr>' +
		'<tr>' +
			'<td>' +
		'&nbsp;&#10;' +
			'</td>' +
		'</tr>' +
		'<tr>' +
		'<td>' +
			'&nbsp;&#10;' +
		'</td>' +
		'</tr>' +
		'<tr>' +
			'<td>' +
		'&nbsp;&#10;' +
			'</td>' +
		'</tr>' +
		'<tr>' +
			'<td align="center" colspan = "100">' +
			'</td>' + 
		'</tr>' +			
		'<tr>' +
			'<td align="center" colspan="100" style="font-size:24px">' +
				'<b><i><span padding="0" margin="0" style="border-bottom:1px solid black;">Vehicle Compliance Declaration</span></i></b>' +
			'</td>' +
		'</tr>' +
		'<tr>' +
			'<td>' +
				'&nbsp;&#10;' +
			'</td>' +
		'</tr>' +
	'</table>';

midHTML = 
	'<table width="100%" cellpadding="0">' +
		'<tr>' +
			'<td align="center" colspan = "100">' +
			'</td>' + 
		'</tr>' +			
		'<tr>' +
			'<td align="left" colspan="100" style="font-size:15px; line-height:20px">' +
			'<br></br>' +
				'Grand Design Recreational Vehicle: ' + modelYear + ' / GRDRV / ' + seriesName + ' ' + modelName + ' / ' + vin + '<br></br>' +
				'complies with the following California Codes:' +
			'</td>' +
		'</tr>' +
		'<tr>' +
			'<td>' +
				'&nbsp;&#10;' +
			'</td>' +
		'</tr>' +
	'</table>' +
	'<table width="90%" cellpadding="0">' +
	'<tr>' +
		'<td align="center" colspan = "100">' +
		'</td>' + 
	'</tr>' +			
	'<tr>' +
		'<td align="right" colspan="100" style="font-size:15px; line-height:20px">' +
			'<ul>' +
			'<li> California Code of Regulations Section 93120.2(a) Phase 2 (P2) formaldehyde emission standards specified on the date of manufacture.</li> ' +
			'</ul>' +
			'<ul>' +
			'<li> California Vehicle Code Section 35400.6(a) (2) (A) or (B) regarding fifth-wheel trailer length.</li>' +
			'</ul>' +
		'</td>' +
	'</tr>' +
	'</table>';

var footerAddressTable = 
	'<table width="100%" style="font-size:11pt; align=center">' + 
		'<tr>' + 
			'<td align="center">' + '<p align="center">' +
				companyName + ' <br></br> ' + companyAddress1 + ', ' + companyCity + ', ' + companyState + ' ' +  companyZip + '<br></br>' + ' Phone: ' + companyPhone + ' &nbsp; Fax: ' + companyFax + '<br></br>' + companyWebsite + 
			'</p>' +
			'</td>' + 
		'</tr>' + 
	'</table>';

html = 
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
					'<br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br>' +
					'<br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br>' +
				'</td>' +
				'</tr>' +
				
				'<tr>' +
					'<td>' +
				footerAddressTable +
					'</td>' +
					'</tr>' +
			'</table>' +
		'</body>';
	
	return html;
}

