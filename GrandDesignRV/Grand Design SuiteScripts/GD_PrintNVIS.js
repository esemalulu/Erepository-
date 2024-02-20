// Acct: RVS

function PrintNVISCustomAction()
{
	var context = nlapiGetContext();
	context.setSessionObject('printnvis_salesorderid', nlapiGetRecordId());
}

function PrintNVISSuitelet(request, response)
{
	var context = nlapiGetContext();
	var salesOrderId = context.getSessionObject('printnvis_salesorderid');
	context.setSessionObject('printnvis_salesorderid', null);
	
//	nlapiLogExecution('DEBUG', 'Sales Order Id', salesOrderId);
	
	if (salesOrderId == '' || salesOrderId == null)
	{
		salesOrderId = request.getParameter('salesOrderId');
	}
	
	if (salesOrderId != '' && salesOrderId != null) 
	{
		var pdfTitle = 'NVIS - Order ' + nlapiLookupField('salesorder', salesOrderId, 'tranid') + '.pdf';
		var html = GetNVISHTML(salesOrderId);
		
		PrintPDFInSuiteLet(request, response, pdfTitle, GetNVISHTML(salesOrderId));
	}
}

function GD_GetNVISHTML(salesOrderId)
{
	var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
	
	//Pull the entity field from the sales order, then substring to take off the initial 4 digits plus the space.
    var dealer = salesOrder.getFieldText('entity');
	var dealerText = dealer.substring(5).replace(/&/g, '&amp;');;

	// Pull unit and model information from model and unit records
	var unitId = salesOrder.getFieldValue('custbodyrvsunit');
	var unitText = salesOrder.getFieldText('custbodyrvsunit');
	
	var unit = nlapiLoadRecord('customrecordrvsunit', unitId);
	var seriesText = nlapiEscapeXML(unit.getFieldText('custrecordunit_series'));
	var modelId = unit.getFieldValue('custrecordunit_model');
	
	var model = nlapiLoadRecord('assemblyitem', modelId);
	var modelTypeText = nlapiEscapeXML(model.getFieldText('custitemrvsmodeltype'));
	var modelYear = model.getFieldText('custitemrvsmodelyear');

	//Pull information specifically for motorized units from model and unit records
	var chassisManufacturer = model.getFieldText('custitemgd_chassismfg');
	var chassisModel = model.getFieldValue('custitemgd_chassismodel');
	var chassisModelYear = unit.getFieldValue('custrecordgd_chassismodelyear');	

	var numberOfCylinders = model.getFieldValue('custitemgd_numberofcylinders') || 'N/A';
	var motivePower = model.getFieldText('custitemgd_fueltype') || 'N/A';
	var wheelbase = model.getFieldValue('custitemgd_wheelbase') || 'N/A';

	//Pull additional general model information
	var msoModel = nlapiEscapeXML(model.getFieldValue('custitemrvsmsomodel'));
	var modelExteriorColor = model.getFieldValue('custitemrvsexteriorcolor');
	if(modelExteriorColor == null)
		modelExteriorColor = '';
	
	var gvwr = Math.round(ConvertLbToKG(ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_gvwrlbs'))));
	var uvw = Math.round(ConvertLbToKG(ConvertNSFieldToInt(unit.getFieldValue('custrecordunit_uvw'))));
	
	if (gvwr == 0)
		gvwr = '&nbsp;';
		
	if (uvw == 0)
		uvw = '&nbsp;';
	
	var seriesSize = 'N/A';
	var companyName = GetCompanyName(false);
	var companyShipAddress = GetCompanyShippingAddress(true);
	var logoURL = GetCompanyPageLogo();

	var importerAddress = '&nbsp;';
	var importerId = salesOrder.getFieldValue('custbodyrvsimporter');
//	nlapiLogExecution('DEBUG', 'Importer', 'importerId = ' + importerId);
	if (importerId != null)
	{
		var importer = nlapiLoadRecord('vendor', importerId);
		for (var i=1; i<=importer.getLineItemCount('addressbook'); i++)
		{
			var label = importer.getLineItemValue('addressbook', 'label', i);
//			nlapiLogExecution('DEBUG', 'Importer', 'label = ' + label);
			if (label != null && label.toLowerCase() == 'nvis')
			{
				var addressee = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addressee', i));
				var addr1 = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addr1', i));
				var city = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'city', i));
				var displaystate = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'displaystate', i));
				var zip = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'zip', i));
				var country = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'country', i));
				
				// print Canada instead of CA
				if (country == 'CA')
					country = 'Canada';
				
				importerAddress = addressee + ', ' + addr1 + ', ' + city + ', ' + displaystate + ' ' + zip + ', ' + country;
				
				break;
			}
		}	
	}
	
	var companyImporterAddress = "";
	var companyImporterAddressee = '';
	var companyImporterAddress1 = '';
	var companyImporterAddress2 = '';
	var companyImporterCity = '';
	var companyImporterState = '';
	var companyImporterZip = '';
	var companyImporterCountry = '';
	var companyImporterName = '';
	var companyImporterId = GetCompanyImporterId();
	if (companyImporterId != null && companyImporterId != '')
	{
		var importer = nlapiLoadRecord('vendor', companyImporterId);
		companyImporterName = ConvertNSFieldToString(importer.getFieldValue('printoncheckas'));		
		if(companyImporterName == '')
			companyImporterName = ConvertNSFieldToString(importer.getFieldValue('legalname'));
		if(companyImporterName == '')
			companyImporterName = ConvertNSFieldToString(importer.getFieldValue('companyname'));
		
		for (var i=1; i<=importer.getLineItemCount('addressbook'); i++)
		{
			var isDefaultShipping = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'defaultshipping', i));
			if (isDefaultShipping != '' && isDefaultShipping == 'T')
			{
				companyImporterAddressee = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addressee', i));
				companyImporterAddress1 = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addr1', i));
				companyImporterAddress2 = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'addr2', i));
				companyImporterCity = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'city', i));
				companyImporterState = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'displaystate', i));
				companyImporterZip = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'zip', i));
				companyImporterCountry = ConvertNSFieldToString(importer.getLineItemValue('addressbook', 'country', i));
				
				// print Canada instead of CA
				if (companyImporterCountry == 'CA')
					companyImporterCountry = 'Canada';

				companyImporterAddress = companyImporterAddressee + ', ' + companyImporterAddress1 + ', ' + companyImporterCity + ', ' + companyImporterState + ' ' + companyImporterZip + ', ' + companyImporterCountry;
				
				break;
			}
		}	
	}
	
	var borderBottom = ' border-bottom-width="1px" border-bottom-color="black" border-bottom-style="solid" ';
	var borderRight = ' border-right-width="1px" border-right-color="black" border-right-style="solid" ';
	
	var logoTD = '';
	if(logoURL != null && logoURL != '')
	{
		logoTD = '<td style="width:50%;">' +
					'<img src="' + logoURL + '" />' +
				 '</td>';
	}
	else
	{
		logoTD = '<td style="width:50%;">' +
					'&nbsp;&nbsp;' +
				'</td>';	
	}
	
	var logoHeaderHTML = 
		'<table width="100%">' + 
			'<tr>' + 
				logoTD	+ 
				'<td style="width:50%;" class="head" align="right">' +
					'<table>' + 
						'<tr>' + 
							'<td align="right">' +
								'N.V.I.S. / <i>D.V.N.</i>' + 
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td align="right">' +
								'New vehicle information statement' + 
							'</td>' + 
						'</tr>' + 
						'<tr>' + 
							'<td align="right">' +
								'<i>Description du vehicule neuf</i>' + 
							'</td>' + 
						'</tr>' + 
					'</table>' + 
				'</td>' + 
			'</tr>' + 
		'</table>';	
	
	var vehicleInfoVINHTML = 
		'<table width="100%">' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + ' style="width:75%;" align="center">' +
					'Vehicle Identification Number / <i>Numero d\'identification du vehicule</i>' +
				'</td>' + 
				'<td' + borderBottom + ' align="center">' +
					'Plate or Registration No. <br /> <i> No de plaque d\'immatriculation </i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + ' style="width:75%;">' +
					'<table width="100%">' + 
						'<tr>' +
							'<td style="width:50%;vertical-align:middle;" class="dataCentered">' +
								 unitText + 
							'</td>' + 
							'<td style="width:50%;">' +
								 '<barcode codetype="code-39" bar-width="0.65" showtext="false" value="' + unitText + '" />' +
							'</td>' + 
						'</tr>' + 
					'</table>' + 							
				'</td>' + 
				'<td' + borderBottom + ' align="center">' +
					'&nbsp;' +
				'</td>' + 
			'</tr>' + 
		'</table>';
		
	//Moterized version of Chassis and Model Info Table
		//includes chasis row
	var vehicleInfoChassisAndModelMotorizedHTML = 
		'<table width="100%">' + 

			'<tr>' + 
				'<td' + borderBottom + borderRight + ' style="width:17%;" align="center">' +
					'Make / <br /> <i>Marque</i>' +
				'</td>' + 
				'<td' + borderBottom + borderRight + ' style="width:17%;" align="center">' +
					'Model / <br /> <i>Modele</i>' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' style="width:17%;" align="center">' +
					'Series / <br /> <i>Serie</i>' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' style="width:17%;" align="center">' +
					'Model Year / <br /> <i>Annee du modele</i>' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' style="width:12%;" align="center">' +
					'Colour / <br /> <i>Couleur</i>' +
				'</td>' +
				'<td' + borderBottom + ' align="center">' +
					'Body Type <br /> <i> Type de carosserie </i>' +
				'</td>' + 
			'</tr>' + 



			'<tr>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					chassisManufacturer +
				'</td>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					chassisModel +
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					'N/A' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					chassisModelYear +
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					'N/A' +
				'</td>' +
				'<td' + borderBottom + ' class="dataCentered">' +
					'INCOMPLETE' +
				'</td>' + 
			'</tr>' +
      		'<tr>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					companyName + 
				'</td>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					seriesText  + 
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					msoModel +
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					modelYear + 
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					modelExteriorColor +
				'</td>' +
				'<td' + borderBottom + ' class="dataCentered" >' +
					modelTypeText + 
				'</td>' + 
			'</tr>' +
		'</table>';

		//Towable version of Chassis and Model Info Table
			//does not include chassis row
		var vehicleInfoChassisAndModelTowableHTML = 
		'<table width="100%">' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + ' style="width:17%;" align="center">' +
					'Make / <br /> <i>Marque</i>' +
				'</td>' + 
				'<td' + borderBottom + borderRight + ' style="width:17%;" align="center">' +
					'Model / <br /> <i>Modele</i>' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' style="width:17%;" align="center">' +
					'Series / <br /> <i>Serie</i>' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' style="width:17%;" align="center">' +
					'Model Year / <br /> <i>Annee du modele</i>' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' style="width:12%;" align="center">' +
					'Colour / <br /> <i>Couleur</i>' +
				'</td>' +
				'<td' + borderBottom + ' align="center">' +
					'Body Type <br /> <i> Type de carosserie </i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					companyName + 
				'</td>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					seriesText  + 
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					msoModel +
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					modelYear + 
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					modelExteriorColor +
				'</td>' +
				'<td' + borderBottom + ' class="dataCentered" >' +
					modelTypeText + 
				'</td>' + 
			'</tr>' +
		'</table>';

	var vehicleInfoWeightHTML = 
		'<table width="100%">' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + ' style="width:12%;" align="center">' +
					'No. of Cyl. / <br /> <i>Nombre de cyl.</i>' +
				'</td>' + 
				'<td' + borderBottom + borderRight + ' style="width:12%;" align="center">' +
					'Motive Power / <br /> <i>Force motrice</i>' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' style="width:25%;" align="center">' +
					'Shipping/Crub/GV Weight (kg) / <br /> <i>Masse nette</i>' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' style="width:12%;" align="center">' +
					'G.V.W.R. (kg) / <br /> <i>P.N.B.V.</i>' +
				'</td>' +
				'<td' + borderBottom + borderRight + ' style="width:15%;" align="center">' +
					'Wheelbase (mm) / <br /> <i>Empattement</i>' +
				'</td>' +
				'<td' + borderBottom + ' align="center">' +
					'OFFICE USE ONLY <br /> <i> A L\'USAGE DU BUREAU </i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					numberOfCylinders + 
				'</td>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					motivePower + 
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					uvw +
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					gvwr + 
				'</td>' +
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					wheelbase + 
				'</td>' +
				'<td' + borderBottom + ' class="dataCentered" >' +
					'&nbsp;' +  
				'</td>' + 
			'</tr>' +
		'</table>';

	var vehicleInfoEngineeringHTML = 
		'<table width="100%">' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + ' style="width:70%;" align="center">' +
					'Engine Serial No. (if applicable) / <i>No de serie du moteur (si applicable)</i>' +
				'</td>' + 
				'<td' + borderBottom + borderRight + ' style="width:15%;" align="center">' +
					'Displacement / <i>Cylindree</i>' +
				'</td>' +
				'<td' + borderBottom + ' style="width:15%;" align="center">' +
					'Off Road Vehicle /  <br /> <i>Vehicule Hors-Route</i>' +
				'</td>' +
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					'N/A' + 
				'</td>' + 
				'<td' + borderBottom + borderRight + ' class="dataCentered">' +
					'N/A' + 
				'</td>' +
				'<td' + borderBottom + '>' +
					 '<table width="100%">' + 
						'<tr>' + 
							'<td>' + 
								'Yes / <br /> <i>Oui</i>' +
							'</td>' +
							'<td>' + 
								'&nbsp;' +
							'</td>' +
							'<td>' + 
								'No / <br /> <i>Non</i>' +
							'</td>' +
							'<td class="dataCentered" style="vertical-align:middle;">' + 
								'X' +
							'</td>' +
						'</tr>' +
					'</table>' + 
				'</td>' +
			'</tr>' +
		'</table>';

	//  Conditional to determine whether the motorized or towable version of the 
		// vehicle model and chassis info rows appear
		var vehicleInfoChassisAndModelHTML = '';
		if (chassisManufacturer) {
			vehicleInfoChassisAndModelHTML = vehicleInfoChassisAndModelMotorizedHTML;
		}
		else {
			vehicleInfoChassisAndModelHTML = vehicleInfoChassisAndModelTowableHTML
		}

	var vehicleInfoHTML = 
		'<table width="100%" border-width="2px" border-color="black" border-style="solid" cellpadding="0">' + 
			'<tr>' + 
				'<td class="sectionheader"' + borderBottom + '>' +
					'Vehicle / <i>Vehicule</i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' +
					vehicleInfoVINHTML + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' +
					vehicleInfoChassisAndModelHTML + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' +
					vehicleInfoWeightHTML + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' +
					vehicleInfoEngineeringHTML + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' +
					'&nbsp; Manufacturer\'s Comments / <br /> <i>&nbsp; Commentaires du fabricant</i>' +
				'</td>' + 
			'</tr>' + 
		'</table>';	
		
	var manufacturerHTML = 
		'<table width="100%" border-width="2px" border-color="black" border-style="solid">' + 
			'<tr>' + 
				'<td class="sectionheader"' + borderBottom + 'colspan="4">' +
					'Manufacturer / <i>Fabricant</i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + ' style="width:30%;">' +
					'Name and Location / <br /> <i>Nom et adresse</i>' +
				'</td>' +  
				'<td' + borderBottom + borderRight + ' style="width:55%;" class="data">' +
					companyName + ', ' + companyShipAddress + 
				'</td>' + 
				'<td' + borderBottom + borderRight + ' style="width:10%;">' +
					'N.S.M. / <br /> <i>M.N.S. No.</i>' +
				'</td>' + 
				'<td' + borderBottom + ' style="width:10%;" class="dataCentered">' +
					'N/A' + 
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td>' +
					'Final Stage Manufacturer - Name and Location / <br /> <i>Dernier fabricant - Nom et adresse</i>' +
				'</td>' +  
				'<td' + borderRight + ' class="data">' +
				companyName + ', ' + companyShipAddress + 
				'</td>'  + 
				'<td' + borderRight + '>' +
					'N.S.M. / <br /> <i>M.N.S. No.</i>' +
				'</td>' +  
				'<td class="dataCentered">' +
					'N/A' + 
				'</td>' + 
			'</tr>' + 
		'</table>';	
		
	var importerHTML = 
		'<table width="100%" border-width="2px" border-color="black" border-style="solid">' + 
			'<tr>' + 
				'<td style = "color: red;" class="sectionheader"' + borderBottom + 'colspan="2">' +
					'Compliance Specialist / <i>Sp&eacute;cialiste de la conformit&eacute;</i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td style="width:20%;">' +
					'Name and Location / <br /> <i>Nom et adresse</i>' +
				'</td>' +  
				'<td style="width:80%;" class="data">' +
				'</td>' + 
			'</tr>' + 
		'</table>';		
		
	var dealerHTML = 
		'<table width="100%" border-width="2px" border-color="black" border-style="solid">' + 
			'<tr>' + 
				'<td class="sectionheader"' + borderBottom + 'colspan="4">' +
					'Dealer / <i>Commercant</i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + ' colspan="4">' +
					'I, the undersigned, authorized representative of the company, firm, or corporation named below, hereby certify that assigned on this date for registration and certify that the vehicle is new  and has not been registered previously. ' +
					'<br />' + 
					'<i>Je soussigne, representant autorise de la compagnie, firme ou corporation designee ci-dessous, declare par la presente que le vehicule neuf ci-decrit est cede a cette date, afin d\'etre immatricule, et je certifie que ce vehicule est neuf et qu\'il n\'a pas ete immatricule precedement.</i>' +
				'</td>' +  
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + 'style="width:55%;">' +
					'Dealer Name / <br /> <i>Nom de Commercant </i>' +
                    '<span style="font-size: 12px; width: 60%">' +
                    '</span>'+
				'</td>' + 
				'<td' + borderBottom + ' style="width:5%;">' +
					'Prov. / <br /> <i>Terr.</i>' +
				'</td>' + 
				'<td' + borderBottom + borderRight + ' style="width:10%;">' +
					'&nbsp;' +
				'</td>' +
				'<td' + borderBottom + ' style="width:30%;">' +
					'Dealer No. / <br /> <i>No Du Commercant</i>' +
				'</td>' +
			'</tr>' +
			'<tr>' + 
				'<td' + borderRight + ' style="width:55%;">' +
					'Authorized Signature / <br /> <i>Signature autorisee</i>' +
				'</td>' +  
				'<td style="width:5%;">' +
					'Date of sale / <br /> <i>Date de vente</i>' +
				'</td>' + 
				'<td' + borderRight + 'style="width:10%; font-size:5pt;">' +
					'Yr. / A. &nbsp; &nbsp; &nbsp; &nbsp; Mo. / M. &nbsp; &nbsp; &nbsp; &nbsp; Day / J.' +
				'</td>' +
				'<td style="width:30%; font-size:5pt;">' +
					'Odometer Reading / <i>Kilometers au compteur</i>' +
				'</td>' +
			'</tr>' +
		'</table>';
		
	var purchaserHTML = 
		'<table width="100%" border-width="2px" border-color="black" border-style="solid">' + 
			'<tr>' + 
				'<td class="sectionheader"' + borderBottom + 'colspan="3">' +
					'Purchaser / <i>Acheteur</i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + ' colspan="3">' +
					'Name (Surname, First Name) / <br /> <i>Nom (nom de famille, prenom)</i>     ' +
                    '<span style="font-size: 12px; width: 60%">' +
                    '</span>'+
				'</td>' +  
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + '>' +
					'Address (No., Street, Apt.) / <br /> <i>Adresse (No, Rue, App.)</i>' +
				'</td>' + 
				'<td' + borderBottom + ' colspan="2">' +
					'Phone Number / <br /> <i>Numero de telephone</i>' +
				'</td>' +  
			'</tr>' + 
			'<tr>' + 
				'<td' + borderRight + ' style="width:60%;">' +
					'City - Municipality / <br /> <i>Ville - Municipalite</i>' +
				'</td>' + 
				'<td' + borderRight + ' style="width:20%;">' +
					'Prov. / <br /> <i>Terr.</i>' +
				'</td>' +
				'<td style="width:20%;">' +
					'Postal Code / <br /> <i>Code Postal</i>' +
				'</td>' +
			'</tr>' +
		'</table>';	
		
	var lesseeHTML = 
		'<table width="100%" border-width="2px" border-color="black" border-style="solid">' + 
			'<tr>' + 
				'<td class="sectionheader"' + borderBottom + 'colspan="3">' +
					'Lessee (if applicable) / <i>Locataire (si applicable)</i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + ' colspan="3">' +
					'Name (Surname, First Name) / <br /> <i>Nom (nom de famille, prenom)</i>' +
				'</td>' +  
			'</tr>' + 
			'<tr>' + 
				'<td' + borderBottom + borderRight + '>' +
					'Address (No., Street, Apt.) / <br /> <i>Adresse (No, Rue, App.)</i>' +
				'</td>' + 
				'<td' + borderBottom + ' colspan="2">' +
					'Phone Number / <br /> <i>Numero de telephone</i>' +
				'</td>' +  
			'</tr>' + 
			'<tr>' + 
				'<td' + borderRight + ' style="width:60%;">' +
					'City - Municipality / <br /> <i>Ville - Municipalite</i>' +
				'</td>' + 
				'<td' + borderRight + ' style="width:20%;">' +
					'Prov. / <br /> <i>Terr.</i>' +
				'</td>' +
				'<td style="width:20%;">' +
					'Postal Code / <br /> <i>Code Postal</i>' +
				'</td>' +
			'</tr>' +
		'</table>';	
		
	var disclaimerHTML = 
		'<table width="100%">' + 
			'<tr>' + 
				'<td style="font-weight:bold;" align="center">' +
					'This is not a titling document / <i>Ce document ne constitute pas un titre de propriet</i>' +
				'</td>' + 
			'</tr>' + 
			'<tr>' + 
				'<td style="font-weight:bold;" align="center">' +
					'Personal information must be used in accordance with applicable privacy laws / <i>Reseignements personnels qui ne doivent etre utilises qu\'en conformite avec sur la confidentialite</i>' +
				'</td>' +  
			'</tr>' + 
		'</table>';	
	
	var mainTablePadding = "5px";
	
	var html = 
		'<head>' + 
			'<style>' + 
				'.sectionheader		{ font-size: 10pt; background-color:lightgrey; font-weight:bold; align:center; }' + 
				'.head				{ font-size: 10pt; font-weight:bold; }' + 
				'.data				{ font-size: 10pt; }' + 
				'.dataCentered		{ font-size: 10pt; align:center; }' + 
			'</style>' + 
			'<macrolist>' + 
			    '<macro id="footer">' + 
					disclaimerHTML +
			    '</macro>' + 
		    '</macrolist>' +
		'</head>' + 
		'<body style="font-size:6pt; font-family: Verdana, Geneva, sans-serif; margin:0pt 0pt 0pt 0pt;" footer="footer">' + 
			'<table width="100%">' + 
				'<tr>' + 
					'<td>' + 
						logoHeaderHTML + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td>' + 
						'&nbsp;' + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td>' + 
						vehicleInfoHTML + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td style="padding-top:' + mainTablePadding + '">' + 
						manufacturerHTML + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td style="padding-top:' + mainTablePadding + '">' + 
						importerHTML + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td style="padding-top:' + mainTablePadding + '">' + 
						dealerHTML + 
					'</td>' + 
				'</tr>' +
				'<tr>' + 
					'<td style="padding-top:' + mainTablePadding + '">' + 
						purchaserHTML + 
					'</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td style="padding-top:' + mainTablePadding + '">' + 
						lesseeHTML + 
					'</td>' + 
				'</tr>' +
			'</table>' + 
		'</body>';
		
	return html;
}

