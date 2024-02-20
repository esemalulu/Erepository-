/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Nov 2016     Jeffrey Bajit
 *
 */

/**
 * Claim Printout Implementation specific for GD
 */
function PrintClaimPDF(claimId)
{
	//******** RECORD VARIABLES ******//
	var claim = nlapiLoadRecord('customrecordrvsclaim', claimId);
	var claimNum = claim.getFieldValue('id');
	var manufNotes = ConvertNSFieldToString(claim.getFieldValue('custrecordnotes'));
	var claimWorkStarted = claim.getFieldValue('custrecordclaim_dateworkstarted');
	if(claimWorkStarted == null)
		claimWorkStarted = '';
	var claimWorkCompleted = claim.getFieldValue('custrecordclaim_dateworkcompleted');
	if(claimWorkCompleted == null)
		claimWorkCompleted = '';
	
	var unitSerial = nlapiEscapeXML(claim.getFieldText('custrecordclaim_unit'));
	var unitModel= ''; //nlapiEscapeXML(claim.getFieldText('custrecordclaim_unitmodel'));
	var modelId= nlapiEscapeXML(claim.getFieldValue('custrecordclaim_unitmodel'));
	if(modelId != null && modelId != '')
	{
		var fields = ['displayname', 'itemid'];	
		var columns = nlapiLookupField('item',modelId, fields);
		if(columns.displayname != null && columns.displayname != '')
			unitModel = columns.displayname;
		else if(columns.itemid != null && columns.itemid != '')
			unitModel = columns.itemid;	
	}
	
	//Unit Information
	var unitId = claim.getFieldValue('custrecordclaim_unit');	
	var unitRetailPurchDate = '';
	var seriesName = '';
	var unitRecord = '';
	var unitOfflineDate = '';
	if(trim(unitId) != '')
	{
		unitRecord = nlapiLoadRecord('customrecordrvsunit', unitId);
		unitRetailPurchDate = unitRecord.getFieldValue('custrecordunit_retailpurchaseddate');
		seriesName = unitRecord.getFieldText('custrecordunit_series');
		unitOfflineDate = unitRecord.getFieldValue('custrecordunit_actualofflinedate');
	}
		
	
	//Dealer Information	
	var dealerName = nlapiEscapeXML(claim.getFieldText('custrecordclaim_customer'));
	var dealerApprovedLaborRate = claim.getFieldValue('custrecordclaim_approvedlaborrate');
	
	var dealerPhone = claim.getFieldValue('custrecordclaim_dealerphone');
	if(dealerPhone == null)
		dealerPhone = '';
	
	var dealerEmail = nlapiEscapeXML(claim.getFieldValue('custrecordclaim_dealeremail'));
	if(dealerEmail == null)
		dealerEmail = '';
	var dealerAddress = GetFormattedDealerAddressPDF(claim);
	
	var workStartedDate = claim.getFieldValue('custrecordclaim_dateworkstarted'); 
	var workCompletedDate = claim.getFieldValue('custrecordclaim_dateworkcompleted');
	
	if (workCompletedDate == null)
		workCompletedDate = '';
		
	if (workStartedDate == null)
		workStartedDate = '';
	
	var dealerClaimNumber = nlapiEscapeXML(claim.getFieldValue('custrecordclaim_dealerclaimnumber'));
	if (dealerClaimNumber == null)
		dealerClaimNumber = '';
	
	var claimTotal = ConvertNSFieldToFloat(claim.getFieldValue('custrecordclaim_claimtotal'));
	var shipTotal = ConvertNSFieldToFloat(claim.getFieldValue('custrecordclaim_shippingtotal'));
	
	if(trim(dealerApprovedLaborRate) == '')
		dealerApprovedLaborRate = '0';
	if(dealerPhone == null)
		dealerPhone = '';
	if(dealerEmail == null)
		dealerEmail = '';
		
	//Customer Information	
	var custName = nlapiEscapeXML(claim.getFieldValue('custrecordclaim_retailcustomername'));
	if (custName == null)
		custName = '';
		
	var custAddress = GetFormattedCustmerAddressPDF(claim);
	if (custAddress == null)
		custAddress = '';
	
	var custPhone = claim.getFieldValue('custrecordclaim_customerphone');
	if (custPhone == null)
		custPhone = '';
	
	var today = getTodaysDate(); //These functions are located in Common.js file
	var claimStatus = ConvertNSFieldToString(claim.getFieldText('custrecordclaim_status'));
	var laborAmount = ConvertNSFieldToFloat(claim.getFieldValue('custrecordclaim_operationstotal'));
	var partsAmount = ConvertNSFieldToFloat(claim.getFieldValue('custrecordclaim_partstotal'));
	
	//******* END OF RECORD VARIABLES ****//
	
	//Add Logo and form title
	var titleAndLogoTable = 
		'<table style="width:100%;">' + 
			'<tr>' +
				'<td style="width:20%;"><img src="' + GetCompanyPageLogo() + '" /></td>' +
				'<td style="width:60%; font-size:20pt; font-weight:bold;" align="center">Warranty Claim Form</td>' +
				'<td style="width:20%; font-size:11px" align="right">Date: ' + today + '</td>' +
			'</tr>' +
		'</table>';
	
	//Add Open Range Address and General Info
	var claimInfoMainTable = 
		'<table width="100%">' + 
			'<tr>' + 
				'<td>' +
					'<table>' +
				  		'<tr>' + 
							'<td>' +
								dealerName + 
							'</td>' +								
						'</tr>' +
						'<tr>' + 
							'<td>' +
								dealerAddress + 
							'</td>' +								
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'Ph. '+ dealerPhone + 
							'</td>' +								
						'</tr>' +
						'<tr>' + 
							'<td>' +
								dealerEmail  + 
							'</td>' +								
						'</tr>' +
					'</table>' +
				'</td>'+
				
				'<td>' +
					'<table>' +
						'<tr>' +
							'<td>' +
								'<span padding="0" margin="0" style="border-bottom:1px solid black;"><b>General Information</b></span>' + 
							'</td>' +
						'</tr>' +
				  		'<tr>' + 
							'<td>' +
								unitSerial + 
							'</td>' +								
						'</tr>' +
						'<tr>' + 
							'<td>' +
								seriesName + ' ' +  unitModel + 
							'</td>' +								
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'Retail Purchase Date: ' + unitRetailPurchDate +
							'</td>' +								
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'Work Started: ' + claimWorkStarted +
							'</td>' +								
						'</tr>' +
						'<tr>' + 
						'<td>' +
							'Work Completed: ' + claimWorkCompleted +
						'</td>' +								
					'</tr>' +
				'</table>' +
			'</td>'+
			
			'<td style="white-space:nowrap;">' +
				'<table>' +
			  		'<tr>' + 
						'<td>&nbsp;</td>' +								
					'</tr>' +
					'<tr>' + 
						'<td>' +
							'Claim Status: ' + claimStatus + 
						'</td>' +								
					'</tr>' +
					'<tr>' + 
						'<td>' +
							'Dealer Work Order #: ' + dealerClaimNumber +
						'</td>' +								
					'</tr>' +
					'<tr>' + 
					'<td>' +
						'Unit Offline Date: ' + unitOfflineDate +
					'</td>' +								
				'</tr>' +
			'</table>' +
		'</td>'+

		'<td style="white-space:nowrap;">' +
			'<table>' +
		  		'<tr>' + 
					'<td>&nbsp;</td>' +								
				'</tr>' +
				'<tr>' + 
					'<td>' +
					'Claim #: ' + claimNum +
					'</td>' +								
				'</tr>' +
				'<tr>' + 
					'<td>' +
						'Labor: $' + nlapiFormatCurrency(laborAmount) +
					'</td>' +								
				'</tr>' +
				'<tr>' + 
					'<td>' +
						'Parts: $' + nlapiFormatCurrency(partsAmount) +
					'</td>' +								
				'</tr>' +
				'<tr>' + 
					'<td>' +
						'Shipping: $' + nlapiFormatCurrency(shipTotal) +
					'</td>' +								
				'</tr>' +
				'<tr>' + 
					'<td>' +
						'Total: $' + nlapiFormatCurrency(claimTotal) +
					'</td>' +								
				'</tr>' +
			'</table>' +
		'</td>'+			  
		  '</tr>' + 
	  '</table>';
	
	var notesTable = '<table border="0" style="width:100%;">' +
						'<tr>' +
							'<td>Notes: ' + manufNotes + '</td>' +
						'</tr>' +
					'</table>';
	
	//Add Dealer & Customer Info
	var dealerInfoTable = 
		'<table border="0" style="width:100%;">' + 
			'<tr>' + 
				'<td style="width:65%;" valign="top">' +
				  '<table cellpadding="5" style="width:100%;">' +
				  		'<tr>' + 
							'<td>' + 
								'<span padding="0" margin="0" style="border-bottom:1px solid black;"><b>Dealer Information</b></span>' + 
							'</td>' + 
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'<table>' +
						  			'<tr>' + 
										'<td>' +
											dealerName + 
										'</td>' +
									'</tr>' +
									'<tr>' + 
										'<td>' +
											dealerAddress + 
										'</td>' +
									'</tr>' +													
								'</table>' +
							'</td>' +
							'<td>' +
								'<table>' +
									'<tr>' +
										'<td>' +
											dealerPhone +
										'</td>' +
									'</tr>' +
									'<tr>' +															
										'<td>' +
											dealerEmail + 
										'</td>' +
									'</tr>' +
									'<tr>' +															
										'<td>' +
											'Approved Labor Rate: $' + dealerApprovedLaborRate +  
										'</td>' +
									'</tr>' +														
								'</table>' +
							'</td>' +							
				 		'</tr>' + 
					'</table>' +		   						   						   
				'</td>' +
				'<td style="width:35%;" valign="top">' + 
					'<table cellpadding="5" style="width:100%;">' +
				  		'<tr>' + 
							'<td>' + 
								'<span padding="0" margin="0" style="border-bottom:1px solid black;"><b>Customer Information</b></span>' + 
							'</td>' + 
						'</tr>' +
						'<tr>' + 
							'<td>' +
								'<table>' +
						  			'<tr>' + 
										'<td>' +
											custName +
										'</td>' +
									'</tr>' +
									'<tr>' +															
										'<td>' +
											custAddress +
										'</td>' +
									'</tr>' +	
									'<tr>' +
										'<td>' +
											custPhone +
										'</td>' +
									'</tr>' +													
								'</table>' +
							'</td>' + 
						'</tr>' +													
					'</table>' +
				'</td>' +
			'</tr>' + 
		'</table>';
	
	var htmlPage = 
		'<head>' + 
			'<meta name="title" value="Claim # ' + claimId + '" />' + 
		'</head>' + 
		'<body style="font-family:Verdana, Arial, Sans-serif;font-size:12px;" size="letter">' + 
			titleAndLogoTable + 
			claimInfoMainTable + 
			notesTable +  '<hr />' + 
			dealerInfoTable + '<hr />' + 
			GetOperationAndPartLinesHtmlTablePDF(claim) + 
			GetClaimPartLineHtmlTableWithNoOperationLinePDF(claim) + 
		'</body>';
	
	htmlPage = htmlPage.replace(/<u>/g,'<span style="border-bottom:1px solid black;">');
	htmlPage = htmlPage.replace(/<\/u>/g,'<\/span>');
	
	return htmlPage;
}