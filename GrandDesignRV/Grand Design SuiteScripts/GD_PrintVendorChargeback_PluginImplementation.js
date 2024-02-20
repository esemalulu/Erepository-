/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       12 13 2016     Jeffrey Bajit 		plugin implementation
 *
 */

/**
 * Gets vendor chargeback print html string.
 * @param changeOrderId
 * @returns {String}
 */
 function GetVendorChargebackPrintHTML(vendorChargebackId, isPrintPDF)
 {
	 var cellSpacing = 'cellspacing="0"';
	 var companyLogoShow = '';
	 //this will set the company logo only if this method is being called to create a pdf file
	 //cellspacing is not recognized when using the pdf creation method so it is cleared from the html string.
	 if (isPrintPDF)
	 {
		 cellSpacing = '';
		 companyLogoShow = GetCompanyPageLogo();
	 }

	 //Variables
	 var companyInfo = nlapiLoadConfiguration('companyinformation');
	 var companyName = companyInfo.getFieldValue('legalname');
	 var companyAddress = companyInfo.getFieldValue('address1');
	 var city = companyInfo.getFieldValue('city');
	 var state = companyInfo.getFieldValue('state');
	 var zip = companyInfo.getFieldValue('zip');
	 var companyPhone = companyInfo.getFieldValue('phone');
	 var companyFax = companyInfo.getFieldValue('fax');

	 nlapiSubmitField('customrecordrvsvendorchargeback', vendorChargebackId, 'custrecordvcb_currentuser', nlapiGetUser());
	 var vendorChargeback = nlapiLoadRecord('customrecordrvsvendorchargeback', vendorChargebackId);
	 var unitId = vendorChargeback.getFieldValue('custrecordvcb_unit');

	 var rgaNumber = ConvertNSFieldToString(vendorChargeback.getFieldValue('custrecordgd_vendorrganumber'));  //Case 7069, get the rga # from vendor chargeback.
	 var vcbUserId = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_vcbemailonprintout') || '';        //Case 7069, added company preference vcb email field
	 var vcbUserEmail = vcbUserId != '' ? nlapiLookupField('employee', vcbUserId, 'email') : '';
	 var vcbDate = ConvertNSFieldToString(vendorChargeback.getFieldValue('created')).split(" ", 1);
	 //Case 7069, removed creator email and name code these are not necessary anymore.

	 var vendorId = vendorChargeback.getFieldValue('custrecordvcb_vendor');
	 var reasonForChange = ConvertNSFieldToString(vendorChargeback.getFieldValue('custrecordvcb_reasonforreturn'));
	 var vendorCompany = nlapiLoadRecord('vendor', vendorId);
	 var vendorCompanyName = ConvertNSFieldToString(vendorCompany.getFieldValue('companyname'));

	 var vendorAddr1 = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'addr1', 1));
	 var vendorAddr2 = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'addr2', 1));
	 var vendorCity = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'city', 1));
	 var vendorState = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'displaystate', 1));
	 var vendorZip = ConvertNSFieldToString(vendorCompany.getLineItemValue('addressbook', 'zip', 1));
	 var vendorPhone = ConvertNSFieldToString(vendorCompany.getFieldValue('phone'));
	 var vendorFax = ConvertNSFieldToString(vendorCompany.getFieldValue('fax'));

	 var claimNumber = ConvertNSFieldToString(vendorChargeback.getFieldValue('custrecordvcb_claim'));

	 // The slice function returns strings less than 8 or truncates the front-most characters if the string is longer than 8 chars.
	 var unitLast8VIN = ConvertNSFieldToString(vendorChargeback.getFieldText('custrecordvcb_unit').slice(-8));
	 var dateOfPurchase = '';
	 if (claimNumber != '' & claimNumber != null)
	 {
		 dateOfPurchase = nlapiLookupField('customrecordrvsclaim', claimNumber, 'custrecordclaim_retailsolddate');
	 }
	 else
	 {
		 dateOfPurchase = '';
	 }

	 var dateOfManufacture = '';
	 if (unitId != '' & unitId != null)
	 {
		 dateOfManufacture = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_datecompleted', false); //this is the date of manufacture date work completed
	 }
	 else
	 {
		 dateOfManufacture = '';
	 }

	 //Get the totals from the body.
	 //If the status is Pending Response (1) then use the Requested Totals, otherwise use the Approved Totals.
	 if(vendorChargeback.getFieldValue('custrecordvcb_status') == 1)
	 {
		 var parts = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_reqpartstotal'));
		 var partsMarkup = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_reqpartsmarkuptotal'));
		 var labor = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_reqlabortotal'));
		 var freight = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_reqfreighttotal'));
		 var sublet = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_reqsublettotal'));
		 var totalDue = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_reqvcbtotal'));
	 }
	 else
	 {
		 var parts = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_partstotal'));
		 var partsMarkup = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_partsmarkuptotal'));
		 var labor = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_labortotal'));
		 var freight = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_freighttotal'));
		 var sublet = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_sublettotal'));
		 var totalDue = ConvertNSFieldToFloat(vendorChargeback.getFieldValue('custrecordvcb_vendorchargebacktotal'));
	 }

	 var htmlPage = '<head></head><body style="font-family:Verdana, Arial, Sans-serif;font-size:12px;">';

	 var mainTable = '';
	 var lineHeight = 'line-height:6;';

	 //Add Title
	 var titleTable = '<table border="0" style="width:100%;">';
		 titleTable += '<tr><td align="left" style="width:60%;"><img src="' + companyLogoShow +
						 '" /></td><td rowspan="2" align="right" style="width:40%;"><p align="right" style="width:100%;"><b><i>Remit payment to:</i></b><br />' +
						 companyName + '<br />Attn: Warranty Recovery<br />' + companyAddress + '<br />' + city + ' ' + state + ' ' + zip + '</p></td></tr>';
		 titleTable += '<tr><td style="font-size:15pt;"><b>Vendor Warranty Recovery Invoice</b></td></tr>';
		 titleTable += '<tr><td colspan="2" align="right" style="' + lineHeight + '">Payments questions call: ' + companyPhone + '</td></tr>';
		 titleTable += '<tr><td colspan="2" align="right" style="' + lineHeight + '">Fax payments to:' + companyFax + '</td></tr>';
		 titleTable += '</table>';

		 var headerInfoTable = '<table ' + cellSpacing + ' style="width:100%;" cellpadding="2">';
		 headerInfoTable += '<tr><td>Bill to: </td></tr>';
		 headerInfoTable += '<tr><td style="border-bottom:1px; ' + lineHeight + ' width:10%;">' + vendorId + '</td><td style="' + lineHeight +
								 ' width:5%;">&nbsp;&nbsp;&nbsp;</td><td style="border-bottom:1px;' + lineHeight + ' width:30%;" colspan="2">' + vendorCompanyName + '</td><td align="right" style="' +
								 lineHeight + ' width:20%;">Invoice No.</td><td align="center" style="border-bottom:1px; ' + lineHeight + 'width:30%;">' + vendorChargebackId + '</td></tr>';
		 headerInfoTable += '<tr><td style="' + lineHeight + ' vertical-align:super; font-size:6pt;">Vendor #</td><td style="' + lineHeight +
								 '">&nbsp;&nbsp;&nbsp;</td><td style="border-bottom:1px; ' + lineHeight + '" colspan="2">' + vendorAddr1 + '</td><td align="right" style="' +
								 lineHeight + '">Date</td><td align="center" style="border-bottom:1px; ' + lineHeight + '">' + vcbDate[0] + '</td></tr>';
		 headerInfoTable += '<tr><td style="' + lineHeight + '"></td><td style="' + lineHeight + '">&nbsp;&nbsp;&nbsp;</td><td style="border-bottom:1px; ' +
								 lineHeight + '" colspan="2">' + vendorAddr2 + '</td><td align="right" style="' + lineHeight +
								 ' padding-top:2px;">RGA #</td><td align="center" style="border-bottom:1px; ' + lineHeight + '">' + rgaNumber + '</td></tr>';  //Case 7069, removed "By" and replaced by RGA #
		 headerInfoTable += '<tr><td style="' + lineHeight + '"></td><td style="' + lineHeight + '">&nbsp;&nbsp;&nbsp;</td><td style="border-bottom:1px; ' +
								 lineHeight + '" colspan="2">' + vendorCity + '  ' + vendorState + '  ' + vendorZip + '</td><td colspan="2" align="right" style="' +
								 lineHeight + '">email: ' + vcbUserEmail + '</td></tr>'; //Case 7069, removed changed email so it uses the company preference
		 headerInfoTable += '<tr>' +
								 '<td style="' + lineHeight + ' width:15%;">' +
								 '</td>' +
								 '<td style="' + lineHeight + ' width:10%;">' +
									 '&nbsp;&nbsp;&nbsp;' +
								 '</td>' +
								 '<td style="' +	lineHeight + '">' +
									 'Phone ' +
								 '</td>' +
								 '<td style="border-bottom:1px; ' +	lineHeight + '">' +
								 vendorPhone +
							 '</td>' +
							 '</tr>';
		 headerInfoTable += '<tr>' +
								 '<td style="' + lineHeight + '">' +
								 '</td>' +
								 '<td style="' + lineHeight + '">' +
									 '&nbsp;&nbsp;&nbsp;' +
								 '</td>' +
								 '<td style="' +	lineHeight + '">' +
									 'Fax # ' +
								 '</td>' +
								 '<td style="border-bottom:1px; ' +	lineHeight + '  width:40%;">' +
								 vendorFax +
							 '</td>' +
							 '</tr>';
		 headerInfoTable += '</table><br />';

	 var itemsTable = '<table border="0" style="width:100%; font-family:Verdana, Arial, Sans-serif;font-size:10px;">';
		 itemsTable += 	'<tr>' +
							 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">VIN (last 8 digits)</td>' +
							 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">DOP</td>' +
							 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">DOM</td>' +
							 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">Claim #</td>' +
							 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">Job</td>' +
							 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">Part #</td>' +
							 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">Vendor Part</td>' +
							 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">Part Description</td>' +
						 '</tr>';

	 var currentLineItemId = '';
	 var vcbLaborItemId = GetVCBLaborItem();
	 var vcbFreightItemId = GetVCBFreightItem();
	 var vcbSubletItemId = GetVCBSubletItem();

	 var partsExist = false;
	 var job = 0;
	 // This for loop goes through the vcb line items and creates a table for the job(operation line #) itemid(part #) and the description of the
	 // items.
	 for (var i = 1; i <= vendorChargeback.getLineItemCount(VCB_PART_SUBLIST); i++)
	 {
		 currentLineItemId = vendorChargeback.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_item', i);
		 job = ConvertNSFieldToString(vendorChargeback.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_job', i));
		 if (currentLineItemId != vcbLaborItemId && currentLineItemId != vcbFreightItemId && currentLineItemId !=  vcbSubletItemId)
		 {
			 var itemInfo = nlapiLookupField('item', currentLineItemId, ['itemid', 'vendorname'], false)
			 var vendorItem = vendorChargeback.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_vendoritem', i) || '';
			 partsExist = true;
			 itemsTable += 	'<tr>' +
								 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + unitLast8VIN +
								 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
								 dateOfPurchase +
								 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
								 dateOfManufacture +
								 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
								 claimNumber +
								 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
								 job +
								 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
								 itemInfo.itemid +
								 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
								 vendorItem +
								 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
								 ConvertNSFieldToString(vendorChargeback.getLineItemValue(VCB_PART_SUBLIST, 'custrecordvcbitem_description', i)) +
								 '</td>' +
							 '</tr>';
		 }
	 }
	 if (!partsExist)
	 {
		 if (job === 0) job = '';
		 itemsTable += 	'<tr>' +
							 '<td align="center" style="border: 1px solid #000000; border-spacing:0px;">' + unitLast8VIN +
							 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
							 dateOfPurchase +
							 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
							 dateOfManufacture +
							 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
							 claimNumber +
							 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
			 			     job +
							 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
							 '' +
							 '</td><td align="center" style="border: 1px solid #000000; border-spacing:0px;">' +
							 '' +
							 '</td>' +
						 '</tr>';
	 }
	 itemsTable += '</table>';

	 var summaryPreference = '<b><i>Summary: </i></b>' + ConvertNSFieldToString(GetVCBPrintoutSummary());
	 var photosPreference = '<b><i>Photos: </i></b>' + ConvertNSFieldToString(GetVCBPrintoutPhotos());
	 var partsPickupPreference = '<b><i>Parts Pickup: </i></b>' + ConvertNSFieldToString(GetVCBPrintoutPartsPickup());

	 var photosReplace = photosPreference.replace("{email}", vcbUserEmail);
	 var space = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
	 var bodyTable = '<table ' + cellSpacing + ' style="width:100%" colspan="4" cellpadding="3">' +
						 '<tr>' +
							 '<td colspan="4" style="width:100%" cellpadding="0"><br />' +
							 'Reason for Return <span style="border-bottom:1px solid black;">' + reasonForChange + '</span><br /><br />' +
							 '</td>' +
						 '</tr>';

	     bodyTable += '<tr><td colspan="2" rowspan="10" style="width:70%; padding:0; font-size:8pt;">' + summaryPreference +
		 '<br /><br />' + photosReplace + '<br /><br />' + partsPickupPreference + '<br /><br />' +'<span style="font-size: 9pt;text-align: left"><b>Please email credit memos to: ' + vcbUserEmail + '</b></span></td></tr>';
		 bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '"></td><td align="center" style="' + lineHeight + '"></td></tr>';
		 bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Labor </td><td align="center" style="border-bottom:1px; ' +
						 lineHeight + '">' + CurrencyFormatted(labor) + '</td></tr>';
		 bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Parts </td><td align="center" style="border-bottom:1px; ' +
						 lineHeight + '">' + CurrencyFormatted(parts) + '</td></tr>';
		 bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Parts markup </td><td align="center" style="border-bottom:1px; ' +
						 lineHeight + '">' + CurrencyFormatted(partsMarkup) + '</td></tr>';
		 bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Freight (in) </td><td align="center" style="border-bottom:1px; ' +
						 lineHeight + '">' + CurrencyFormatted(freight) + '</td></tr>';
		 bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '">Sublet </td><td align="center" style="border-bottom:1px; ' +
						 lineHeight + '">' + CurrencyFormatted(sublet) + '</td></tr>';
		 bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight + '"></td><td align="center" style="' + lineHeight + '"></td></tr>';
		 bodyTable += '<tr><td align="right" style="width:15%; ' + lineHeight +
						 ' border-collapse:separate; border-spacing:3px;">Total Due </td><td align="center" style="' + lineHeight +
						 ' border-bottom: 2px double #000;">' + CurrencyFormatted(totalDue) + '</td></tr>';
		 bodyTable += '<tr><td height="0" style="width:15%; font-size:1pt;"></td>' +
						 '<td align="left" height="0" style="border-top: 1px double #000; font-size:1pt;"></td></tr>';
		 bodyTable += '<tr><td colspan="4" align="center" style="' + lineHeight + ' border-bottom: 1px double #000; width:100%;"><br />' +
						 '</td></tr>';

	 	 bodyTable += '<tr><td colspan="4" align="center" style="font-size:12pt;"><b>VENDORS: Complete the information below and email to ' +
			 vcbUserEmail + '</b></td></tr>';
		 bodyTable += '<tr><td colspan="4" align="center" style="height:6px; line-height:3px; vertical-align:middle; font-size:8pt;">' +
						 '<i>Warranty returned parts not picked up or requested to be returned will be field scrapped after 7 days.</i><br />' +
						 '<br /><br /></td></tr>';
		 bodyTable += '<tr><td colspan="4" ><br />RGA #____________________________________________________' + space + space + space + space +
						 '____________________<br /><br /></td></tr>';
		 bodyTable += '<tr><td colspan="4" >__________________________________________________________________________________________________</td></tr>';
		 bodyTable += '<tr><td colspan="4" style="height:-2px; line-height:-4px; vertical-align:super; font-size:6pt;"><i>Driver\'s signature</i></td></tr>';

		 bodyTable += '</table>';

	 mainTable += titleTable;
	 mainTable += headerInfoTable;
	 mainTable += itemsTable;
	 mainTable += bodyTable;
	 htmlPage += mainTable;
	 htmlPage +='</body>';

	 return htmlPage;
 }