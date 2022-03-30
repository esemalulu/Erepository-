/**
* Version    Date            Author           		Remarks
* 1.00       15 Apr 2015     elijah@audaxium.com
* 
* 9/16/2016 Modified by JSon.
* - Code base significantly modified due to business rule changes requested by Alan
*  
* "customscript_aux_ue_fulfillmentbutton" creates an "Send Fulfillment Email" Button that calls this script
*  	
* Script sends and email to the out to either the Partner that is found on the Sales Order or the Main contact on the Customer Record 
* There are two different Email Templates used based on the Order Type (PRODUCT vs RENEWAL)
* A Search against the Custom Record Licenes is performed and values are grabbed from the record to put into the email being sent out
* 
* @appliedtorecord recordType
* @returns {Boolean} True to continue save, false to abort save
*/	
	
function suitelet(req, res)
{

	var salesOrderId = req.getParameter('custparam_salesorderid'),	
		invoiceId = req.getParameter('custparam_invoiceid');

	//9/8/2016
	//Modified to grab it from Company Level Preference
	// NEW Fulfillment Email Template 
	var contractNew_Temp = nlapiGetContext().getSetting('SCRIPT','custscript_sb422_contractnewtempid'), 
	//RENEWAL Fulfillment Email Template
		contractRenew_Temp = nlapiGetContext().getSetting('SCRIPT','custscript_sb422_contractrenewtempid'),
	//RENEWAL Fulfillment Email Template
		contractUpsell_Temp = nlapiGetContext().getSetting('SCRIPT','custscript_sb422_contractupselltempid'),
	//License Qty Field ID. 
	//	Difference between IDs in Sandbox and Production forced this option.
	//	However, this will also make it easy to change what qty field to use
		licQtyFldId = nlapiGetContext().getSetting('SCRIPT','custscript_sb422_licenseqtyfldid'),
	//Default Send From
	//	Incase sales rep is not defined, we have default to send From
		defaultSendFrom = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb422_defsalesrepfrom');
	
	log('debug','so/inv id', salesOrderId+' // '+invoiceId);
	
	var invRec = nlapiLoadRecord('invoice' ,invoiceId);	
	var billTo = invRec.getFieldValue('entity');
	var ordertype = invRec.getFieldValue('custbody_order_type');			
	var slsrep = invRec.getFieldValue('salesrep');
	
	if (!slsrep)
	{
		slsrep = defaultSendFrom;
	}
	
	var billToRec = nlapiLoadRecord('customer', billTo);			
	
	//log('debug','endUserId', endUserId);
	
	var SOrec = nlapiLoadRecord('salesorder' ,salesOrderId),		
		trans = SOrec.getFieldValue('tranid'),
		
		//JS 9/9/2016 
		//	Instead of sending it to Bill to customer or End User,
		//	We are going to be sending it to Contact Name field value (References Contact)
		//	If custbody_tricerat_contactontrans or custbody_tricerat_contactemail
		//	are empty, it will throw an error
		contactNameVal = strTrim(SOrec.getFieldValue('custbody_tricerat_contactontrans')),
		contactEmailVal = strTrim(SOrec.getFieldValue('custbody_tricerat_contactemail'));
	
	//9/16/2016
	//	We need to loop through and determine THIS Sales Orders' Sync System
	var syncSystem = '',
		hasTlm = false,
		hasLac = false;
	
	log('debug','Starting syncSystem search', 'starting');
	
	for (var si=1; si <= SOrec.getLineItemCount('item'); si+=1)
	{
		//We determine the sync system based on Items X-Formation field.
		//	if item has it checked, it's LAC
		//  if item does NOT have it checked, it's TLM
		if (SOrec.getLineItemValue('item','custcol_xformationitem', si) == 'T')
		{
			hasLac = true;
		}
		else
		{
			hasTlm = true;
		}
	}
	
	//Based on line item review, identify sync system
	if (hasLac && hasTlm)
	{
		syncSystem = 'BOTH';
	}
	else if (hasLac && !hasTlm)
	{
		syncSystem = 'LAC';
	}
	else if (!hasLac && hasTlm)
	{
		syncSystem = 'TLM';
	}
	
	log('debug','syncSystem', syncSystem);
	
	//Return out and show Error right away if missing
	if (!contactNameVal || !contactEmailVal)
	{
		var html = '<html><body ><div align="center"; width="100%" style="margin-top: -8px; background-color: #D5EAEF;"  > ';
			html = html + '<p style="font-size: 100%;  font-family: Helvetica,Arial,sans-serif; color:#244884;">'+
				   'Please provide value for Contact Name. Contact being used MUST have Email Address set'+
				   '</p></div>';		
			
			html = html + '</div></table></body></html>' ; 
			response.write(html);	
			return;	
	}
	
	//Decide which template to use
	var templateToUse = '';
	//Determine Template to Use
	if (ordertype == '1')
	{
		templateToUse = contractNew_Temp;
	}
	else if (ordertype == '2')
	{
		templateToUse = contractRenew_Temp;
	}
	else if (ordertype == '3')
	{
		templateToUse = contractUpsell_Temp;
	}
	
	//Build email related variables
	var fileIds = [],
		fileObjs = [],
		attchRecords = {
			'transaction':salesOrderId,
			'entity':invRec.getFieldValue('entity')
		},
		//Header is part of XML
		//where Columns headers are following IN ORDER
		//Quantity | Item Description | License Activation Code
		itemTrHtml = '';
	
	//Begin Core Processing
	try
	{
		//We look up Contract and OG Contract Information
			//trxCntrct refers to Contract generated from Processing of THIS Sales order
		var trxCntrct = invRec.getFieldValue('custbody_contract_name'),	
			//OG Contract refers to VERY FIRST Contract Ever created
			ogContract = nlapiLookupField('customrecord_contracts', trxCntrct, 'custrecord_swe_original_contract');
		//If ogContract field is empty on the trxCntrct, trxCntrct IS the OG Contract
		if(!ogContract)				
		{
			ogContract = trxCntrct;				
		}
		
		//9/16/2016
		// We need to make sure TLM items are included on the item list as well.
		// Since we are not syncing TLM Licenses with Contract Items, 
		// we source list of Contract Items directly from Renewal Contract
		// and only display qty and item sales description.
		if (syncSystem == 'TLM' || syncSystem == 'BOTH')
		{
			//9/16/2016
			// For TLM Items, we ONLY want to display salesdescription of item which has Product Code 
			// Field Set.
			// For Upsell and New, we will always know what that item is.
			// for Renewal, this isn't known because the renewal item is used.
			// Each renewal item does have reference to perpetual item it's renewing for.
			// which HAS the Product code. 
			// The Process is:
			//    - Grab list of ALL Contract Item that Is NOT Renewal Exclusion.
			//    - Build Initial JSON object of TLM items to Display on the Email
			//    - If Row has Product Code, add to JSON
			//	  - If Row has NO Product Code 
			//			- If Perp Maint Item is NOT in JSON, add to JSON and add Item ID to lookup array
			//			- If Perp Maint Item IS in JSON. skip
			//	  - If Item Lookup Array is Not Empty, run search for those items to grab salesdescription
			
			log('debug','trxCntrct',trxCntrct);
			
			//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
			//Sandbox: custitem_xformationitem
			//Production: custitem_afa_xformationitem
			var aciflt = [new nlobjSearchFilter('custrecord_ci_contract_id', null, 'anyof', trxCntrct),
			              new nlobjSearchFilter('custitem_afa_xformationitem','custrecord_ci_item','is', 'F'),
			              new nlobjSearchFilter('custrecord_ci_renewals_exclusion', null, 'is', 'F')],
			              
				acicol = [new nlobjSearchColumn('custrecord_ci_quantity'), //0 Contract item Quantity
				          new nlobjSearchColumn('salesdescription','custrecord_ci_item'), //1 Items' Sales description
				          new nlobjSearchColumn('custitem_afa_20150721_installsetpdf','custrecord_ci_item'), //2 Items' Instruction PDF
				          new nlobjSearchColumn('custitem_prodcode','custrecord_ci_item'), //3 Items' Product Code
				          new nlobjSearchColumn('custitem1','custrecord_ci_item'), //4 Items' Perp. Item Ref (Incase this is renewal item)
				          new nlobjSearchColumn('custrecord_ci_item')], //5 Contract Item
				          
				acirs = nlapiSearchRecord('customrecord_contract_item', null, aciflt, acicol);
		
			//Assume there is a result
			//log('debug','acirs ran', acirs.length);
			
			//JSON to store ONLY those that should be shown in the email
			var displayJson = {},
				//Array to track of item IDs to lookup salesdescription against
				arItemLookup = [];
			for (var ac=0; acirs && ac < acirs.length; ac+=1)
			{
				var aciCols = acirs[ac].getAllColumns();
				
				var tqty = acirs[ac].getValue(aciCols[0]),
					tdesc = acirs[ac].getValue(aciCols[1]),
					tfile = acirs[ac].getValue(aciCols[2]),
					tpcode = acirs[ac].getValue(aciCols[3]),
					tpref = acirs[ac].getValue(aciCols[4]),
					titem = acirs[ac].getValue(aciCols[5]);
				
				//Has Product Code
				if (tpcode)
				{
					displayJson[titem] = {
						'qty':tqty,
						'desc':tdesc,
						'file':tfile,
						'serial':[]
					};
				}
				else
				{
					//We check to see if tpref exists in displayJson
					//	if NOT, add in empty JSON and add to arItemLookup
					if (!displayJson[tpref])
					{
						displayJson[tpref] = {
							'qty':tqty,
							'desc':'',
							'file':'',
							'serial':[]
						};
						
						//Add to arItemLookup ONLY if it doesn't already exist
						if (arItemLookup.indexOf(tpref) == -1)
						{
							arItemLookup.push(tpref);
						}
					}
				}
			}//End loop for building displayJson
			
			log('debug','displayJson Check point', JSON.stringify(displayJson));
			
			//If arItemLookup array is NOT empty, we need to grab sales description and instruction for those.
			if (arItemLookup.length > 0)
			{
				var itemflt = [new nlobjSearchFilter('internalid', null, 'anyof', arItemLookup)],
					itemcol = [new nlobjSearchColumn('internalid'), //0 item internalid
					           new nlobjSearchColumn('salesdescription'), //1 item sales description
					           new nlobjSearchColumn('custitem_afa_20150721_installsetpdf')], //2 item instruction pdf
					itemrs = nlapiSearchRecord('item', null, itemflt, itemcol);
				
				//Assume no more than 1000
				//	we now loop through and update displayJson with desc and file
				for (var it=0; itemrs && it < itemrs.length; it+=1)
				{
					var itemCols = itemrs[it].getAllColumns();
					
					displayJson[itemrs[it].getValue(itemCols[0])].desc = itemrs[it].getValue(itemCols[1]);
					displayJson[itemrs[it].getValue(itemCols[0])].file = itemrs[it].getValue(itemCols[2]);
				}
			}
			
			//9/21/2016
			//For TLM for CREATE or UPSELL, we need to grab matching License Keys.
			//	Since TLM we do not associate generate license record with contract item,
			//	based on perpetual item on the contract item to be displayed and sales order, we look up
			//	License List and match it up against item
			if (ordertype == '1' || ordertype == '3')
			{
				var tlflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
				             new nlobjSearchFilter('custrecord_ordref', null, 'anyof', salesOrderId)],
					tlcol = [new nlobjSearchColumn('custrecord_serialnumber'),
					         new nlobjSearchColumn('custrecord_license_itemref')],
					tlrs = nlapiSearchRecord('customrecord_licenses', null, tlflt, tlcol);
				
				//loop through result and add to displayJson.serial array
				for (var t=0; tlrs && t < tlrs.length; t+=1)
				{
					var licItem = tlrs[t].getValue('custrecord_license_itemref'),
						licSerial = tlrs[t].getValue('custrecord_serialnumber');
					
					if (displayJson[licItem] && displayJson[licItem].serial.indexOf(licSerial) == -1)
					{
						displayJson[licItem].serial.push(licSerial);
					}
				}
			}
			
			log('debug','displayJson', JSON.stringify(displayJson));
			
			//We now loop through displayJson
			for (var d in displayJson)
			{
				var ciFileId = displayJson[d].file,
					ciQty = nlapiEscapeXML(displayJson[d].qty),
					ciItemDesc = nlapiEscapeXML(displayJson[d].desc),
					//9/21/2016
					ciSerial = ' ';
				
				if (displayJson[d] && displayJson[d].serial.length > 0)
				{
					for (var sk=0; sk < displayJson[d].serial.length; sk+=1)
					{
						ciSerial += nlapiEscapeXML(displayJson[d].serial[sk]);
						
						if ((sk+1) != displayJson[d].serial.length)
						{
							ciSerial += '<br/>';
						}
					}
				}
				
				//Check the file uniqueness. If Unique, Load the file and add to fileObjs array
				if (ciFileId && fileIds.indexOf(ciFileId) == -1)
				{
					fileIds.push(ciFileId);
					
					//Load the file and add to fileObjs array
					fileObjs.push(nlapiLoadFile(ciFileId));
				}
				
				//At this point, we build the eachRowValue table cell HTML
				itemTrHtml += '<tr style="padding-top: 2px; padding-bottom: 2px;">'+
							  '<td style="padding: 10px;" align="left" width = "45px" valign="top">'+
							  ciQty+
							  '</td>'+
							  '<td  style="border-left: 1px solid #000000; padding: 10px;" align="left" width = "200px" valign="top">'+
							  ciItemDesc+
							  '</td>'+
							  '<td  style="border-left: 1px solid #000000; padding: 10px;" align="left" width = "200px" valign="top">'+
							  ciSerial+
							  '</td>'+
							  '</tr>';
			}//End loop for adding TLM items
		}//End Processing TLM or BOTH to include Item records from Contract Item
		
		//ONLY Process below if the syncsystem is NOT TLM
		//	LAC or BOTH.
		//	If contract contains LAC items, we display list of ALL licenses associated with
		//	OG Contract
		if (syncSystem != 'TLM')
		{
			//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
			//Sandbox: custrecord_tri_original_contract_lf
			//Production: custrecord_og_contract
			var licflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			              new nlobjSearchFilter('custrecord_og_contract', null, 'anyof', ogContract)],
				liccol = [new nlobjSearchColumn('internalid'), //0 license internal id
				          new nlobjSearchColumn('custrecord_serialnumber'), //1 serial number
				          new nlobjSearchColumn(licQtyFldId), //2 license qty
				          new nlobjSearchColumn('salesdescription','custrecord_license_itemref'), //3 item sales description
				          new nlobjSearchColumn('custitem_afa_20150721_installsetpdf','custrecord_license_itemref')], //4 Instruction PDf
				licrs = nlapiSearchRecord('customrecord_licenses', null, licflt, liccol);
			
			log('debug','License search ran', licrs.length);
			
			//JSON Object to hold licenses that has Renewal Inclusion Not Checked (Via linked Contract Item)
			//ONLY Check this for Renewal and Upsell
			var licIncludeJson = {},
				allLicIds = [];
			if (ordertype =='2' || ordertype =='3')
			{
				//9/12/2016
				//ONLY for Renew or Upsell, we need to make sure the contract Item linked to the Licenses
				//	have Renewal Exclusion NOT CHECKED: custrecord_ci_renewals_exclusion != T
				
				//Loop through and grab ALL Licenses
				for (var allic=0; licrs && allic < licrs.length; allic+=1)
				{
					var licsCols = licrs[allic].getAllColumns();
					allLicIds.push(licrs[allic].getValue(licsCols[0]));
				}
				
				//Search Contract Item records using all licenses associated with THIS OG Contract
				var alsflt = [new nlobjSearchFilter('custrecord_afa_license2renew', null, 'anyof', allLicIds),
				              new nlobjSearchFilter('custrecord_ci_renewals_exclusion', null, 'is', 'F')],
					alscol = [new nlobjSearchColumn('custrecord_afa_license2renew')],
					alsrs = nlapiSearchRecord('customrecord_contract_item', null, alsflt, alscol);
				
				for (var al=0; alsrs && al < alsrs.length; al+=1)
				{
					var alsCols = alsrs[al].getAllColumns();
					licIncludeJson[alsrs[al].getValue(alsCols[0])] = alsrs[al].getValue(alsCols[0]);
				}
			}
			
			log('debug','licIncludeJson', JSON.stringify(licIncludeJson));
				
			for (var lic=0; lic < licrs.length; lic+=1)
			{
				var licsCols = licrs[lic].getAllColumns();
				
				//For Renewal or Upsell, we ONLY include the license info if active (Exclude Renewal NOT checked).
				if (ordertype =='2' || ordertype =='3')
				{
					if (!licIncludeJson[licrs[lic].getValue(licsCols[0])])
					{
						log('debug','License ID NOT in Active List', licrs[lic].getValue(licsCols[0])+' Not In '+JSON.stringify(licIncludeJson));
						continue;
					}
				}
				
				var rowFileId = licrs[lic].getValue(licsCols[4]),
					rowQty = nlapiEscapeXML(licrs[lic].getValue(licsCols[2])),
					rowItemDesc = nlapiEscapeXML(licrs[lic].getValue(licsCols[3])),
					rowSerialNum = nlapiEscapeXML(licrs[lic].getValue(licsCols[1]));
				
				//Check the file uniqueness. If Unique, Load the file and add to fileObjs array
				if (rowFileId && fileIds.indexOf(rowFileId) == -1)
				{
					fileIds.push(rowFileId);
					
					//Load the file and add to fileObjs array
					fileObjs.push(nlapiLoadFile(rowFileId));
				}
				
				//At this point, we build the eachRowValue table cell HTML
				itemTrHtml += '<tr style="padding-top: 2px; padding-bottom: 2px;">'+
							  '<td style="padding: 10px;" align="left" width = "45px" >'+
							  rowQty+
							  '</td>'+
							  '<td  style="border-left: 1px solid #000000; padding: 10px;" align="left" width = "200px" >'+
							  rowItemDesc+
							  '</td>'+
							  '<td  style="border-left: 1px solid #000000; padding: 10px;" align="left" width = "200px" >'+
							  rowSerialNum+
							  '</td>'+
							  '</tr>';
			
			}//End Loop to add LAC related line items with License Serial Key
		}//End Processing for syncSystem != TLM
		
		//if fileObjs is Empty, change to Null
		//10/10/2016
		//Alan requested NOT to include file attachment(s) IF
		//order type is Renewal.
		if (ordertype == '2' || fileObjs.length == 0)
		{
			fileObjs = null;
		}
		
		var htmlXml = nlapiLoadFile(templateToUse).getValue();							
		htmlXml = htmlXml.replace('#ITEMLIST#',itemTrHtml );		
		
		var renderer = nlapiCreateTemplateRenderer();
		renderer.addRecord('salesorder', SOrec);
		renderer.addRecord('customer', billToRec);		
		renderer.setTemplate(htmlXml);			
		var renderHTML = renderer.renderToString();
		
		//we need to grab sales reps email address
		var slsrepemail = nlapiLookupField('employee', slsrep, 'email', false);
		
		nlapiSendEmail(
			slsrep, 
			contactNameVal,
			'Order Status: Order #'+trans+' has been Fulfilled', 
			renderHTML, 
			null, 
			slsrepemail, 
			attchRecords, 
			fileObjs, 
			true, 
			null, 
			null
		);	
		
		response.write('<script type="text/javascript">setTimeout(function(){window.close()}, 30);  </script>');
		
	}
	catch(procerr)
	{
		var html = '<html><body ><div align="center"; width="100%" style="margin-top: -8px; background-color: #D5EAEF;"  > ';
			html = html + '<p style="font-size: 100%;  font-family: Helvetica,Arial,sans-serif; color:#244884;">Failed to Send Email due to Error:<br/><br/>'+
				   getErrText(procerr)+'</p></div>';							
			html = html + '</div></table></body></html>' ; 
			
		response.write(html);
						
	}
						
}
