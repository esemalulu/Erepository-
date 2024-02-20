function PrintWeightLabelCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('unitId', nlapiGetRecordId());
	context.setSessionObject('bottom', nlapiGetContext().getSetting('SCRIPT', 'custscriptrvsbottom'));
}

//***********************
// Name: PrintWeightLabelSuitelet
// Description: Print warranty registration form suitelet.
// Use: Suitelet event
//************************
function PrintWeightLabelSuitelet(request, response)
{
	var unitId = request.getParameter('unitId');
	if (unitId == null || unitId == '')
	{
		var context = nlapiGetContext();
		unitId = context.getSessionObject('unitId');
		context.setSessionObject('unitId', null);
	}

	var bottom = request.getParameter('bottom') == 'T';
	if (bottom == null || bottom == '')
	{
		var context = nlapiGetContext();
		bottom = context.getSessionObject('bottom');
		context.setSessionObject('bottom', null);
	}
	
	if (unitId != null && unitId != '')
	{
		SetUnitSpecsFromModel(unitId, false);
		
		var refNumber = nlapiLookupField('customrecordrvsunit', unitId, 'name');
		
		var plugin = new WeightLabelPrintoutPlugin();
		var html = plugin.PrintWeightLabel(unitId, bottom);
		
		PrintPDFInSuiteLet(request, response, 'Print Weight Label -' + refNumber + '.pdf', html);
	}
}

//***********************
// Name: PrintWeightLabel
// Description: Returns the HTML for printing the weight label for the given unit id.
// Use: Helper
//************************
function PrintWeightLabel(unitId, bottom)
{
	var unit = nlapiLoadRecord('customrecordrvsunit', unitId);
	
	var vin = unit.getFieldValue('name');
	var model = unit.getFieldText('custrecordunit_model');
	
	//	Convert Lb to Kg	1 lb = 0.4536 kg
	//	Convert Gal to Kg	1 gal = 3.765 kg
	//	Convert PSI to KPA	1 psi = 6.8948 KPA
	//	Convert Gal to Lb	1 gal = 8.3 lb
		
	//	Cargo Capacity (Lbs)	[Unit.GVWR] - [Unit.UVW] - [Unit.LPGasWeight]
	//	Water Capacity (Lbs)	[Unit.FreshWaterCapacity] * 8.3

	var freshWaterCapacityGal = ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_freshwatercapacity'));
	var gvwrLb = ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_gvwrlbs'));
	var gawrLb = ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_gawrsingleaxle'));
	var uvw = ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_uvw'));
	var lpGasCapacityLbs = ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_lpgasweight'));
	var mfgDateFull = nlapiStringToDate(unit.getFieldValue('custrecordunit_actualofflinedate'));
	
	var gvwrKg = Math.round(ConvertLbToKG(gvwrLb));
	var gawrKg = Math.round(ConvertLbToKG(gawrLb));
	
	var weightLB = gvwrLb - uvw - lpGasCapacityLbs;
	var weightKG = Math.round(ConvertLbToKG(weightLB));
	
	var waterCapacityLB = Math.round(ConvertGalToLb(freshWaterCapacityGal));
	var waterCapacityKG = Math.round(ConvertGalToKG(freshWaterCapacityGal));
	
	var mfgDate = (mfgDateFull.getMonth() + 1) + '/' + mfgDateFull.getFullYear();
	
	var tires = nlapiEscapeXML(ConvertNSFieldToString(unit.getFieldValue('custrecordunit_tire')));
	var rims = nlapiEscapeXML(ConvertNSFieldToString(unit.getFieldValue('custrecordunit_rim')));
	var psi = ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_psi'));
	var kpa = Math.round(ConvertPSIToKPA(psi));
	var rearTires = tires;
	var rearRims = rims;
	var rearPSI = psi;
	
	var spareTireSize = nlapiEscapeXML(ConvertNSFieldToString(unit.getFieldValue('custrecordunit_tirespare')));
	var spareTirePSI = ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_psispare'));
	var spareRimSize = nlapiEscapeXML(ConvertNSFieldToString(unit.getFieldValue('custrecordunit_rimspare')));
	var tireHotfixApplied = ConvertNSFieldToString(unit.getFieldValue('custrecordunit_tirehotfix')) == 'T';

	var axleCount = ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_axleconfiguration'));
	// IF the unit has “axle configuration" as single axle, then send NULL values for the rear tire config.
	if (axleCount == 1) {
		rearTires = '';
		rearPSI = '';
	}
	/*// IF the unit has the field “Tire Hotfix Applied” set to true, pull the new tire, rim, and PSI spare fields. 
	// Populate to the appropriate spare tire fields in the restlet. 
	// Otherwise, proceed as normal, which means the tire info is just copied into the spare config.
	if (tireHotfixApplied == true) {
		unitObject['SpareSize'] = spareTireSize;
		unitObject['SparePSI'] = spareTirePSI;
		unitObject['SpareKPA'] = Math.round(ConvertPSIToKPA(spareTirePSI));
		//spareRimSize
	}*/
	var trailerType = ConvertNSFieldToString(unit.getFieldText('custrecordunit_typeofvehicle'));
	
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var companyName = companyInfo.getFieldValue('companyname');
	var companyCity = companyInfo.getFieldValue('city'); 
	var companyState = companyInfo.getFieldValue('state'); 
	
	var tireDimensionsHTML = 
		'<table cellpadding="0" width="100%">' + 
			'<tr>' + 
				'<td width="50px">' + 
					'&nbsp;' +
				'</td>' + 
				'<td>' + 
					vin +
				'</td>' + 
			'</tr>' + 	
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td colspan="2">' + 
					'<table cellpadding="0" width="100%" rotate="-90" style="margin-top:15px;">' + 
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' + 
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' + 
						'</tr>' +
						'<tr>' + 
							'<td colspan="2">' + 
								'The weight of the cargo should never exceed' +
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td colspan="2">' + 
								weightKG + ' Kg or ' + weightLB + ' Lbs. Le poids de chargement ne' +
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td>' + 
								'devrait jamais excéder ' + weightKG + ' Kg ou ' + weightLB + ' Lbs.' +
							'</td>' + 
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' + 
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td>' + 
								tires + 
							'</td>' + 
							'<td>' + 
								psi + 
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td>' + 
								rearTires + 
							'</td>' + 
							'<td>' + 
								rearPSI + 
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td>' + 
								tires + 
							'</td>' + 
							'<td>' + 
								psi + 
							'</td>' + 
						'</tr>' + 
					'</table>' + 
				'</td>' + 
			'</tr>' + 
		'</table>';
		
	var headerHTML = 
		'<table cellpadding="0" width="100%">' + 
			'<tr>' + 
				'<td align="center">' + 
					'RECREATION VEHICLE TRAILER CARGO CARRYING CAPACITY' + 
				'</td>' +
			'</tr>' +
			'<tr>' + 
				'<td align="center">' + 
					'VIN: ' + vin + ' &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; UVW: ' + uvw + 
				'</td>' + 
			'</tr>' + 	
			'<tr>' + 
				'<td align="center">' + 
					'THE WEIGHT OF CARGO SHOULD NEVER EXCEED' + 
				'</td>' + 
			'</tr>' + 	
			'<tr>' + 
				'<td align="center">' + 
					weightKG + ' kg or ' + weightLB + ' lbs.' + 
				'</td>' + 
			'</tr>' + 	
			'<tr>' + 
				'<td align="center">' + 
					'CAUTION:' + 
				'</td>' + 
			'</tr>' + 	
			'<tr>' + 
				'<td align="center">' + 
					'A full load of water equals ' + waterCapacityKG + ' kg or ' + waterCapacityLB + ' lbs of cargo @ 1 kg/L (8.3 lb/gal)' + 
				'</td>' + 
			'</tr>' + 	
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'<table cellpadding="0" width="100%">' + 
						'<tr>' + 
							'<td style="width:40%;">' + 
								'MANUFACTURED BY/FABRIQUE PAR:' + 
							'</td>' +
							'<td style="width:40%;">' + 
								companyName.toUpperCase() + 
							'</td>' +
							'<td style="width:20%;">' + 
								'DATE: ' + mfgDate + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' +
							'<td>' + 
								companyCity.toUpperCase() + ', ' + companyState.toUpperCase() +  
							'</td>' +
							'<td>' + 
								'&nbsp;' + 
							'</td>' +
						'</tr>' +
					'</table>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'<table cellpadding="0" width="100%">' + 
						'<tr>' + 
							'<td>' + 
								'GVWR/PNBV ' + gvwrKg + ' KG (' + gvwrLb + ' LB)' +
							'</td>' +
						'</tr>' +
					'</table>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'<table cellpadding="0" width="100%">' + 
						'<tr>' + 
							'<td>' + 
								'GAWR(EACH AXLE)/PNBE (CHAQUE ESSIEU) ' + gawrKg + ' KG (' + gawrLb + ' LB) &nbsp; &nbsp; TIRES/PNEU ' + tires + 
							'</td>' +
						'</tr>' +
					'</table>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'<table cellpadding="0" width="100%">' + 
						'<tr>' + 
							'<td>' + 
								'RIMS/JANTE ' + rims +
							'</td>' +
						'</tr>' +
					'</table>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'<table cellpadding="0" width="100%">' + 
						'<tr>' + 
							'<td>' + 
								'COLD INFL. PRESS./PRESS. DE GONFL. A FROID ' + kpa + ' KPA (' + psi + ' PSI/LPC)' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'THIS VEHICLE CONFORMS TO ALL APPLICABLE U.S. FEDERAL MODEL VEHICLE SAFETY STANDARDS IN EFFECT ON THE DATE' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'OF MANUFACTURE SHOWN ABOVE. THIS VEHICLE CONFORMS TO ALL APPLICABLE STANDARDS PRESCRIBED UNDER THE' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'CANADIAN MOTOR VEHICLE SAFETY REGULATIONS IN EFFECT ON THE DATE OF THE MANUFACTURE. - CE VEHICULE EST' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'CONFOME A TOUTES LES NORMES QUI LUI SONT APPLICABLES EN VERTU DU REGLEMENT SUR LA SECURITE DES' + 
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'VEHICULES AUTOMOBILES DU CANADA EN VIGUEUR A LA DATE DE SA FABRICATION.' + 
							'</td>' +
						'</tr>' +
					'</table>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'<table cellpadding="0" width="100%">' + 
						'<tr>' + 
							'<td style="width:15%;">' + 
								'V.I.N./N.I.V.:' +
							'</td>' +
							'<td style="width:30%;">' + 
								vin +
							'</td>' +
							'<td style="width:10%;">' + 
								'TYPE/TYPE:' +
							'</td>' +
							'<td style="width:20%;">' + 
								trailerType + ' TRA/REM' +
							'</td>' +
							'<td style="width:25%;">' + 
								model +
							'</td>' +
						'</tr>' +
					'</table>' +
				'</td>' + 
			'</tr>' +
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' + 
					'<table cellpadding="0" width="100%" style="margin-top:5px;">' + 
						'<tr>' +
							'<td width="5%">' + 
								'&nbsp;' +
							'</td>' + 
							'<td width="45%">' + 
								vin +
							'</td>' +
							'<td width="50%">' + 
								vin +
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' + 
						'</tr>' +  
						'<tr>' +
							'<td>' + 
								'&nbsp;' +
							'</td>' + 
							'<td>' + 
								vin +
							'</td>' +
							'<td>' + 
								vin +
							'</td>' +
						'</tr>' +
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + 
							'</td>' + 
						'</tr>' +  
						'<tr>' +
							'<td>' + 
								'&nbsp;' +
							'</td>' + 
							'<td>' + 
								vin +
							'</td>' +
							'<td>' + 
								vin +
							'</td>' +
						'</tr>' +
					'</table>' +
				'</td>' + 
			'</tr>' +  
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' +  
			'<tr>' + 
				'<td>' + 
					'&nbsp;' + 
				'</td>' + 
			'</tr>' + 
		'</table>';
	
	var html = 
		'<body style="font-size:9pt; font-family:sans-serif; margin-top:0px; margin-bottom:0px; margin-right:0px; margin-left:0px" font-stretch="extra-condensed">' + 
			'<table cellpadding="0" width="100%" style="padding-top:' + (bottom ? '520px' : '9px') + ';">' + 
				'<tr>' + 
					'<td width="25%">' + 
						tireDimensionsHTML +
					'</td>' + 
					'<td width="12%">' + 
						'&nbsp;' + 
					'</td>' + 
					'<td width="68%">' + 
						headerHTML +
					'</td>' + 
				'</tr>' + 
			'</table>' + 
		'</body>';
		
	return html;
}

// Conversion Functions
function ConvertLbToKG(lb)
{
	return lb * 0.4536;
}

function ConvertGalToLb(gal)
{
	return gal * 8.3;
}

function ConvertGalToKG(gal)
{
	return gal * 3.765;
}

function ConvertPSIToKPA(psi)
{
	return psi * 6.8948;
}

function ConvertNSFieldToInt(value)
{
	if (value == null || value == '')
		return 0;
	else 
		return parseInt(value);
}

function ConvertNSFieldToString(value)
{
	if (value == null)
		return '';
	else 
		return value;
}