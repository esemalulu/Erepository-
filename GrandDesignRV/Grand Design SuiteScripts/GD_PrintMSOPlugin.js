function GetMSOHTML(salesOrderId, isDuplicate)
{
	// variables
	var companyInfo = nlapiLoadConfiguration('companyinformation');
	var companyName = nlapiEscapeXML(companyInfo.getFieldValue('companyname'));
	var companyAddress1 = companyInfo.getFieldValue('address1');
	var companyCity = companyInfo.getFieldValue('city');
	var companyState = companyInfo.getFieldValue('state'); 
	var companyZip = companyInfo.getFieldValue('zip'); 
	
	var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
	var unitId = salesOrder.getFieldValue('custbodyrvsunit');
	
	var unit = nlapiLoadRecord('customrecordrvsunit', unitId);
	var modelId = unit.getFieldValue('custrecordunit_model');
	var model = nlapiLoadRecord('assemblyitem', modelId);
	
	//Loads an image of Don Clark's signature
	var signature = nlapiLoadFile('715452');
	nlapiLogExecution('debug', 'signature', signature.getURL());
		
	var duplicateText = '&nbsp;';
	if (isDuplicate == 'true')
		duplicateText = 'DUPLICATE';
	
	var month=new Array(12);
	month[0]="January";
	month[1]="February";
	month[2]="March";
	month[3]="April";
	month[4]="May";
	month[5]="June";
	month[6]="July";
	month[7]="August";
	month[8]="September";
	month[9]="October";
	month[10]="November";
	month[11]="December";
	
	var orderDate = new Date(); //nlapiStringToDate(salesOrder.getFieldValue('trandate'));
	var orderDateString = month[orderDate.getMonth()] + ' ' + orderDate.getDate() + ', ' + orderDate.getFullYear();
	orderDateString = orderDateString.toUpperCase();
	
	// get the invoice number from the sales order
	// get any invoices that were created from this sales order
	// if there aren't any invoices found, then the invoice number is NONE
	var invoiceNumber = 'NONE'; //salesOrder.getFieldValue('tranid');
	
	var invoiceFilters = new Array();
	invoiceFilters[invoiceFilters.length] = new nlobjSearchFilter('createdfrom', null, 'is', salesOrderId, null);
	
	var invoiceCols = new Array();
	invoiceCols[invoiceCols.length] = new nlobjSearchColumn('tranid');
	
	var invoiceResults = nlapiSearchRecord('invoice', null, invoiceFilters, invoiceCols);
	if (invoiceResults != null && invoiceResults.length > 0)
	{
		invoiceNumber = invoiceResults[0].getValue('tranid');
	}
	
	var vin = nlapiEscapeXML(unit.getFieldValue('name'));
	var modelYear = model.getFieldText('custitemrvsmodelyear'); 	
	
	var seriesId = unit.getFieldValue('custrecordunit_series');
	var series = nlapiLoadRecord('customrecordrvsseries', seriesId);
	var make = nlapiEscapeXML(series.getFieldValue('custrecordseries_msoname').toUpperCase());
	
	// RCB 3-1-2013 - changes for state specific MSO Model name requirements
	
	var statesCount = series.getLineItemCount('recmachcustrecordmsostatemodel_series');
	var stateId = 0;
	var stateinfo;
	var stateManufNum = "";
	var msoSeriesName = '';
	var printOverallLength = false;
	var printKingPin = false;
	var kingpinLength = '';
	var msoBodyType = '';
	var appendbodyType = false;
	var shipState = salesOrder.getFieldValue('shipstate');
	var printHitchLength = false;
	var printWidth = false;
	var printNoHitchLength = false;
	var unitWidth = model.getFieldValue('custitemrvsmodelextwidth');
	//per case 5678, use the Length Including Hitch field 
//	var unitHitchLength = ConvertNSFieldToInt(model.getFieldValue('custitemrvsextlengthdecimal'))*12;
	var unitHitchLength = ConvertNSFieldToInt(model.getFieldValue('custitemrvslengthincludinghitch'));
	var unitNoHitchLength = ConvertNSFieldToInt(model.getFieldValue('custitemrvsextlengthexclhitch'));//*12;//changed this because they are entering data as inches
	
	// find state specific mso record and set fields if one found
	for (var i = statesCount; i > 0; i--) 
	{
		stateId = series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_state', i);
		stateinfo = nlapiLoadRecord('state', stateId);
		if(stateinfo.getFieldValue('shortname') == shipState )
		{
			make = series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_name', i);
			printHitchLength = (series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_printhitchlen', i)=='T'? true:false);
			printNoHitchLength = (series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_printnohitchlen', i)=='T'? true:false);
			printWidth = (series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_printwidth', i)=='T'? true:false);
			stateManufNum = ConvertNSFieldToString(series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_manufcode', i));	

			msoSeriesName = ConvertNSFieldToString(series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_seriesname', i));
			printOverallLength = (series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_overalllength', i)=='T'? true:false);
			printKingPin = (series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_kingpinlength', i)=='T'? true:false);
			msoBodyType = ConvertNSFieldToString(series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_bodytype', i));
			appendbodyType = (series.getLineItemValue('recmachcustrecordmsostatemodel_series', 'custrecordmsostatemodel_appendbodytype', i)=='T'? true:false);
			
		}
	}
	
		
	var bodyType = '';
	if(appendbodyType)
	{
		bodyType = nlapiEscapeXML(msoBodyType.toUpperCase() + ' ' + model.getFieldText('custitemrvsmodeltype').toUpperCase());
	}
	else if(msoBodyType != null && msoBodyType != '')
	{
		bodyType = nlapiEscapeXML(msoBodyType.toUpperCase());
	}
	else
	{
		bodyType = nlapiEscapeXML(model.getFieldText('custitemrvsmodeltype').toUpperCase());
	}
	
	var shippingWeight = unit.getFieldValue('custrecordunit_uvw');   //model.getFieldValue('custitemrvsmodeluvwlbs');
	if (shippingWeight == null)
		shippingWeight = '';
	else
		shippingWeight += ' LBS';
		
var horsepower = model.getFieldValue('custitemgd_horsepower') || 'N/A';
		
	var gvwr = model.getFieldValue('custitemrvsmodelgvwrlbs');
	if (gvwr == null)
		gvwr = '';
	else
		gvwr += ' LBS';

	var numberOfCylinders = model.getFieldValue('custitemgd_numberofcylinders') || 'N/A'
	
	var modelName = '';
	var modelMSO = model.getFieldValue('custitemrvsmsomodel');
	if(msoSeriesName != '' && msoSeriesName != null)
	{
		modelName = nlapiEscapeXML(msoSeriesName.toUpperCase() + ' ' + modelMSO.toUpperCase());
	}
	else if (modelMSO != null && modelMSO != '')
	{
		modelName = nlapiEscapeXML(modelMSO.toUpperCase());
	}
	
	var dealerId = salesOrder.getFieldValue('entity');
	
	// the name on the MSO will now come from the company name of the dealer, not the ship to addressee of the order
	// The mso address now comes from the custom MSO address on the SO
	var dealer = nlapiLoadRecord('customer', dealerId);
	
	var billAddressee = dealer.getFieldValue('printoncheckas');
	if(billAddressee == null || billAddressee == '')
		billAddressee = dealer.getFieldValue('companyname');
	if (billAddressee == null)
		billAddressee = '';
	billAddressee = nlapiEscapeXML(billAddressee.toUpperCase());
		
	var billAddress1 = salesOrder.getFieldValue('custbodymsoaddress');
	if (billAddress1 == null)
		billAddress1 = '';
	billAddress1 = nlapiEscapeXML(billAddress1.toUpperCase());
	
	var billAddress2 = salesOrder.getFieldValue('custbodymsoaddress2');
	var addr2Line = '';
	var addr2Spacer = '<tr>' + 
							'<td>' + 
							'&nbsp;' + 
						'</td>' + 
						'<td>' + 
							'&nbsp;' + 
						'</td>' + 
						'<td>' + 
							 '&nbsp;' + 
						'</td>' + 
						'</tr>';
	if (billAddress2 != null && billAddress2 != '')
	{
		
		addr2Line = '<tr>' + 
							'<td>' + 
							'&nbsp;' + 
						'</td>' + 
						'<td>' + 
						nlapiEscapeXML(billAddress2.toUpperCase()) + 
						'</td>' + 
						'<td>' + 
							 '&nbsp;' + 
						'</td>' + 
						'</tr>';
		addr2Spacer = '';
			
	}
	
	var billCity = salesOrder.getFieldValue('custbodymsocity');
	if (billCity == null)
		billCity = '';
	billCity = nlapiEscapeXML(billCity.toUpperCase());
	
	// RCB 5-6-14 - Using the lookup method to get the state because of a NS bug.  For Alabama, the value is 0 since it is the first state and 
	// as a result, NetSuite seems to think 0 is the same as null or something.  getFieldText returns nothing.
	//var billState = salesOrder.getFieldText('custbodymsostate');
	var billState = nlapiLookupField('salesorder',salesOrder.getId(),'custbodymsostate',true);
	if (billState == null)
		billState = '';
	billState = nlapiEscapeXML(billState.toUpperCase());
	
	var billZip = salesOrder.getFieldValue('custbodymsozipcode');
	if (billZip == null)
		billZip = '';
	billZip = nlapiEscapeXML(billZip.toUpperCase());
	
	var html = '';
	// add the link to the necessary embedded font files.  These shoudl be in the file cabinet and set in the Co preferences
	html += '<head><link name="arialNarrow" type="font" subtype="opentype" ' +
		'src= "' + nlapiEscapeXML(GetMSOFontFileURL()) + '" src-bold="' + nlapiEscapeXML(GetMSOBoldFontFileURL()) + '" ' +
		'bytes="1"/></head>';
	
	html += '<body style="font-size:10pt; font-family: \'arialNarrow\', sans-serif; margin:0pt 0pt 0pt 0pt;">';
	
	var topStateSpecifiedLength = '&nbsp;';
	var bottomStateSpecifiedLength = '&nbsp;';
	
	var signaturePaddingTop = 55; //Stores the amount of space between the Dealer address and the bottom text (Grand Design, signature, address)

	// #C11541
	// Commented out the code which uses pxPerLine. This used to compensate for
	// The lines added by the conditions which follow, but as of 2019.1, it
	// suddenly isn't necessary.

	// var pxPerLine = 15; //Approx. number of pixels for each line that is added by the next two if/else statements
	if(printHitchLength)
	{
		topStateSpecifiedLength = 'Length of trailer including hitch: ' + unitHitchLength + ' inches';
//		signaturePaddingTop -= pxPerLine;
	}
	else if(printOverallLength)
	{
		topStateSpecifiedLength = 'Overall ' + model.getFieldText('custitemrvsmodeltype') + ' Length: ' + model.getFieldValue('custitemrvsmodelextlength');
//		signaturePaddingTop -= pxPerLine;
	}
	
	if(printNoHitchLength)
	{
		bottomStateSpecifiedLength = 'Length of trailer excluding hitch: ' + unitNoHitchLength + ' inches';
//		signaturePaddingTop -= pxPerLine;
	}
	else if(printKingPin)
	{
		bottomStateSpecifiedLength = 'Length form Kingpin to Rear Axle: ' + model.getFieldValue('custitemrvs_lengthfromkingpin');
//		signaturePaddingTop -= pxPerLine;
	}
	
	// go a certain number of spaces down
	var topHTML = '<table style="padding-top:146px;" width="100%" cellpadding="0">' +
				 	'<tr>' + 
						'<td>' + 
							'<table width="100%" cellpadding="0">' + 
								'<tr>' + 
									'<td style="width:70px;">' + 
										'&nbsp;' + 
									'</td>' + 
									'<td style="width:335px;">' + 
										orderDateString + 
									'</td>' + 
									'<td>' + 
										invoiceNumber + 
									'</td>' + 
								'</tr>' + 
							'</table>' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td>' + 
							'<table width="100%" style="padding-top:16px;" cellpadding="0">' + 
								'<tr>' + 
									'<td style="width:70px;">' + 
										'&nbsp;' + 
									'</td>' + 
									'<td style="width:200px;">' + 
										vin + 
									'</td>' + 
									'<td style="width:100px;">' + 
										modelYear + 
									'</td>' + 
									'<td>' + 
										make + 
									'</td>' + 
								'</tr>' + 
							'</table>' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td>' + 
							'<table width="100%" style="padding-top:16px;" cellpadding="0">' + 
								'<tr>' + 
									'<td style="width:70px;">' + 
										'&nbsp;' + 
									'</td>' + 
									'<td style="width:335px;">' + 
										bodyType + 
									'</td>' + 
									'<td>' + 
										shippingWeight + 
									'</td>' + 
								'</tr>' + 
							'</table>' + 
						'</td>' + 
					'</tr>' + 
					'<tr>' + 
						'<td>' + 
							'<table width="100%" style="padding-top:16px;" cellpadding="0">' + 
								'<tr>' + 
									'<td style="width:70px;">' + 
										'&nbsp;' + 
									'</td>' + 
									'<td style="width:85px;">' + 
										horsepower + 
									'</td>' + 
									'<td style="width:130px;">' + 
										gvwr + 
									'</td>' + 
									'<td style="width:100px;">' + 
										numberOfCylinders + 
									'</td>' + 
									'<td>' + 
										modelName + 
									'</td>' + 
								'</tr>' + 
							'</table>' + 
						'</td>' +  
					'</tr>';
	
		// Extra row for hitch length and width
		topHTML += '<tr>' + 
						'<td>' + 
						'<table width="100%" style="padding-top:5px;" cellpadding="0">' + 
							'<tr>' + 
								'<td style="width:70px;">' + 
									'&nbsp;' + 
								'</td>' + 
								'<td style="width:275px;">' + 
									topStateSpecifiedLength + 
								'</td>' + 
								'<td style="width:10px;">' + 
									'&nbsp;' + 
								'</td>' + 
								'<td>' + 
								((printWidth) ? ('Width of trailer: ' + unitWidth+ ' inches'): '&nbsp;')  + 
								'</td>' + 								 
							'</tr>' + 
						'</table>' + 
					'</td>' +  
				'</tr>';
		// extra row for length excluding hitch
		topHTML += '<tr>' + 
						'<td>' + 
						'<table width="100%" style="padding-top:3px;" cellpadding="0">' + 
							'<tr>' + 
								'<td style="width:70px;">' + 
									'&nbsp;' + 
								'</td>' + 
								'<td style="width:275px;">' + 
									bottomStateSpecifiedLength  + 
								'</td>' + 
								'<td style="width:10px;">' + 
									'&nbsp;' + 
								'</td>' + 
								'<td>' + 
									'&nbsp;' +
								'</td>' + 								 
							'</tr>' + 
						'</table>' + 
					'</td>' +  
				'</tr>';
		
	topHTML += 		'<tr>' + 
						'<td>' + 
							'<table width="100%" style="padding-top:109px;" cellpadding="0">' + 
								'<tr>' + 
									'<td style="width:175px;">' + 
										'&nbsp;' + 
									'</td>' + 
									'<td style="width:50px;">' + 
										 billAddressee + 
									'</td>' + 
									'<td style="width:195px;">' + 
										 '&nbsp;' + 
									'</td>' + 
								'</tr>' + 
								'<tr>' + 
									'<td>' + 
										'&nbsp;' + 
									'</td>' + 
									'<td>' + 
										billAddress1 + 
									'</td>' + 
									'<td>' + 
										 '&nbsp;' + 
									'</td>' + 
								'</tr> ' + 
								addr2Line +
								' <tr>' + 
									'<td>' + 
										'&nbsp;' + 
									'</td>' + 
									'<td>' + 
										billCity + ', ' + billState + ' ' + billZip +  
									'</td>' + 
									'<td>' + 
										 '&nbsp;' + 
									'</td>' + 
								'</tr>' + 
								addr2Spacer +
							'</table>' + 
						'</td>' +  
					'</tr>' +
					'<tr>' + 
						'<td>' + 
							'<table width="100%" style="padding-top:'+signaturePaddingTop+'px;" cellpadding="0">' + 
								'<tr>' + 
									'<td style="width:55px;">' + 
										'&nbsp;' +  
									'</td>' + 
									'<td style="width:215px;">' + 
										'&nbsp;' +  stateManufNum +
									'</td>' + 
									'<td style="width:350px; font-size:12pt; font-weight:bold;" >' + 
									    companyName + 
								    '</td>' +
								'</tr>' + 
							'</table>' + 
						'</td>' +  
					'</tr>' +
					'<tr>' + 
					'<td>' + 
						'<table width="100%" style="padding-top:5px;" cellpadding="0">' + 
							'<tr>' + 
								'<td style="width:55px;">' + 
									'&nbsp;' + 
								'</td>' + 
								'<td style="width:225px;">' + 
									 duplicateText  + 
								'</td>' +
								'<td style="width:30px;">' + 
								'<img src="' + nlapiEscapeXML(signature.getURL()) + '" width="100px" height="40px" />' +
								'</td>' +
							'</tr>' + 
						'</table>' + 
					'</td>' +  
				'</tr>' +
					'<tr>' + 
					'<td>' + 
						'<table width="100%" style="padding-top:25px;" cellpadding="0">' + 
							'<tr>' + 
								'<td style="width:250px;">' +
									'&nbsp; ' + 
								'</td>' +								
							    '<td style="width:400px; font-size:12pt; font-weight:bold;" >' + 
							        companyAddress1 +', '+ companyCity +', ' + companyState + '&nbsp;' + companyZip +
								
						        '</td>' + 
							'</tr>' + 
						'</table>' + 
					'</td>' +  
				'</tr>' +
				'</table>';
				
				
//	var orderDateHTML = '<table style="top:55mm; left:33mm;"><tr><td>' + orderDateString + '</td></tr></table>';	
//	var invoiceNumHTML = '<table style="top:55mm; left:120mm;"><tr><td>' + invoiceNumber + '</td></tr></table>';	
//				
	html += topHTML;

	html += '</body>';
	
	return html;	
}