
var CONST_PDF_FOLDERID='449806';

function priceListPdfGen(req, res) {

	//Grab Scripvat level parameters
	var paramBaseSavedSearch = nlapiGetContext().getSetting('SCRIPT','custscript_sct173_ssid');
	
	//Grab the customer ID from parent calling page
	var paramCustomerId = req.getParameter('custparam_clientid');
	//Grab the record type from parent calling page
	var paramRecordType = req.getParameter('custparam_rectype');
	//Status Process message from process screen
	var paramProcMsg = req.getParameter('custparam_procmsg');
	if (!paramProcMsg) {
		paramProcMsg = '';
	}
	
	//Create the FORM for UI and set Client Script
	var nsform = nlapiCreateForm('Price List Generator', true);
	nsform.setScript('customscript_aux_cs_pdf_pricelist_ui');
	
	var msgfld = nsform.addField('custpage_msgfld', 'inlinehtml', '', null, null);
	msgfld.setLayoutType('outsideabove', null);
	
	try {
		
		//Validate to make sure we have customer id
		if (!paramCustomerId) {
			throw nlapiCreateError('PDFGEN-ERR', 'Missing Customer ID. This is required value. Please open it from a Customer Record', true);
		}
		
		if (!paramRecordType) {
			throw nlapiCreateError('PDFGEN-ERR', 'Missing Record Type. This is a required value.', true);
		}
		
		if (!paramBaseSavedSearch) {
			throw nlapiCreateError('PDFGEN-ERR', 'Missing Base Saved Search ID. This is required value. Please Make Sure Saved Search is selected on the Script Deployment Record', true);
		}
		
		//Hidden Customer ID
		var hiddenCustIdFld = nsform.addField('custparam_clientid', 'text', '', null, null);
		hiddenCustIdFld.setDefaultValue(paramCustomerId);
		hiddenCustIdFld.setDisplayType('hidden');
		
		//Hidden Record Type
		var hiddenRecordType = nsform.addField('custparam_rectype', 'text','', null, null);
		hiddenRecordType.setDefaultValue(paramRecordType);
		hiddenRecordType.setDisplayType('hidden');
		
		//Add a Submit Button
		nsform.addSubmitButton('Generate Price List PDF');
		
		if (req.getMethod() == 'POST') {
			//-------------------------------------------- POST ------------------------------------------------------------
			var procmsg = '';
			log('debug','req value of sendemail',req.getParameter('custpage_sendemail'));
			log('debug','req value of class',req.getParameter('custpage_class'));
			if (req.getParameter('custpage_emailsubject') && req.getParameter('custpage_comments') && req.getParameter('custpage_contacts')) {
				
				var fileList = new Array();
				var fileCount = req.getLineItemCount('custpage_pdffiles');
				for (var f=1; f <= fileCount; f++) {
					if (req.getLineItemValue('custpage_pdffiles','fsl_sendfile',f)=='T') {
						fileList.push(nlapiLoadFile(req.getLineItemValue('custpage_pdffiles','fsl_fileid',f)));
					}
				}
				
				var emailAddresses = req.getParameterValues('custpage_contacts');
				
				var sendToEmail = '';
				var emailToCc = null;
				if (emailAddresses.length > 1) {
					sendToEmail = emailAddresses[0];
					emailAddresses.splice(0, 1);
				}
				
				if (!sendToEmail) {
					sendToEmail = req.getParameter('custpage_contacts');
					log('debug','Send To Email using values was object','using getParameter: '+sendToEmail);
				}
				
				var records = new Object();
				records['entity'] = paramCustomerId;
				
				nlapiSendEmail(nlapiGetContext().getUser(), sendToEmail, req.getParameter('custpage_emailsubject'), req.getParameter('custpage_comments'), emailAddresses, null, records, fileList);
				
				procmsg ='Email sent successfully '+fileList;
			} else {
				//Execute the Search by adding in the class passed in
				var pflt = [new nlobjSearchFilter('class', null,'anyof', req.getParameter('custpage_class'))];
				var prs = nlapiSearchRecord(null, paramBaseSavedSearch, pflt, null);
				
				if (prs && prs.length > 0) {
					
					//Template XML file is located under Templates > PDF Templates folder.
					//	- FIle Name: PriceListPdfTemplate.xml
					var pdfTemplateFileId = '470486';
					var pdfXml = nlapiLoadFile(pdfTemplateFileId).getValue();
					//Template replacement values:
					/**
					 * #YEAR# 
					 * #CLASS#
					 * #DATE#
					 * #ITEMLIST#
					 * #FOOTERADDRESS#
					 */
					var currDate = new Date();
					
					var itemTableHeader = '';
					var itemTableBody = '';
					//Grab list of column header values
					var allCols = prs[0].getAllColumns();
					for (var h=0; h < allCols.length; h++) {
						itemTableHeader += '<td ><b>'+nlapiEscapeXML(allCols[h].getLabel())+'</b></td>';
					}
					itemTableHeader = '<tr>'+itemTableHeader+'</tr>';
					
					//Loop through each result and add in the Body
					for (var r=0; r < prs.length; r++) {
						var eachRowValue = '';
						//Loop through each columns and add the value
						for (var h=0; h < allCols.length; h++) {
							var rowValue = prs[r].getText(allCols[h]);
							if (!rowValue) {
								rowValue = prs[r].getValue(allCols[h]);
							}
							//log('debug','rowValue', rowValue);
							//Eli, so since we are trying to get last three cols to be right justified, you will need to cound in the loop
							//Joe, I figured that was the case but wasn't sure
							if (h < (allCols.length-3)) {
								log('debug','normal td','normal td');
								eachRowValue += '<td>'+nlapiEscapeXML(rowValue)+'</td>';
							} else {
								log('debug','right td','right td');
								eachRowValue += '<td align="right">'+nlapiEscapeXML(rowValue)+'</td>';
							}
							
						}
						itemTableBody += '<tr>'+eachRowValue+'</tr>';
						//log('debug','itemTableBody',itemTableBody);
					}
					
					pdfXml = pdfXml.replace('#ITEMHEADER#',itemTableHeader);
					pdfXml = pdfXml.replace('#ITEMBODY#',itemTableBody);
					
					pdfXml = pdfXml.replace('#YEAR#', currDate.getFullYear());
					pdfXml = pdfXml.replace('#DATE#', nlapiDateToString(currDate));
					pdfXml = pdfXml.replace('#CLASS#', req.getParameter('custpage_classtextdisplay'));
					pdfXml = pdfXml.replace('#FOOTERADDRESS#','2355 Royal Windsor Drive, Unit #12 Mississauga ON L5J 4S8');
					
					try {
						//log('debug','pdfXml', pdfXml);
						//Generate PDF
						var priceListPdfFile = nlapiXMLToPDF(pdfXml);
						var priceListFileName = paramCustomerId+'_pricelist_'+req.getParameter('custpage_classtext')+'.pdf';
						priceListPdfFile.setFolder(CONST_PDF_FOLDERID);
						priceListPdfFile.setName(priceListFileName);
						
						var priceListFileId = nlapiSubmitFile(priceListPdfFile);
						log('debug','paramRecordType',paramRecordType+' // '+paramCustomerId+' // File id: '+priceListFileId);
						
						//Need to attach this file to the customer record.
						nlapiAttachRecord('file', priceListFileId, paramRecordType, paramCustomerId);
						
						procmsg = priceListFileName+' generated successfully for '+req.getParameter('custpage_classtextdisplay')+' class with total of '+prs.length+' results';
						
					} catch (filegenerr) {
						log('error','Error Generating file', getErrText(filegenerr));
						procmsg = 'ERROR generating PDF Price List: '+getErrText(filegenerr);
					}
					
				} else {
					procmsg = 'No price list returned for '+req.getParameter('custpage_classtextdisplay');
				}
			}
			
			//Redirect to Suitelet with process message
			var redirparam = new Object();
			redirparam['custparam_clientid'] = paramCustomerId;
			redirparam['custparam_rectype'] = paramRecordType;
			redirparam['custparam_procmsg'] = procmsg;
			nlapiSetRedirectURL('SUITELET', 'customscript_aux_sl_pdf_pricelist_ui', 'customdeploy_aux_sl_pdf_pricelist_ui', 'VIEW', redirparam);
			
		} else {
			//Generate UI with Class Drop down along with any other additional options.
			nsform.addFieldGroup('custpage_grpa', 'Generate Options', null);
			var classdd = nsform.addField('custpage_class', 'select', 'Sales Class', 'classification', 'custpage_grpa');
			classdd.setBreakType('startcol');
			classdd.setMandatory(true);

			//Add in hidden text field for selected Sales Class
			//When SL is submitted ONLY value is sent in. This hidden field is set via Client Script to pass in the text value
			var classtext = nsform.addField('custpage_classtext','text','Sales Text',null,'custpage_grpa');
			classtext.setDisplayType('hidden');
			
			var classtextdisplay = nsform.addField('custpage_classtextdisplay','text','Sales Text Display',null,'custpage_grpa');
			classtextdisplay.setDisplayType('hidden');
			
			//Add in Sublist showing All Files previously generated for THIS Customer
			//- File Naming Convention is: [Customer Internal ID]_pricelist_[class text].pdf
			var customerFileNamePrefix = paramCustomerId+'_pricelist_';
			var pdfFileFilter = [new nlobjSearchFilter('name', null, 'startswith', customerFileNamePrefix),
			                     new nlobjSearchFilter('folder', null, 'anyof',CONST_PDF_FOLDERID)];
			var pdfFileColumn = [new nlobjSearchColumn('name'),
			                     new nlobjSearchColumn('url'),
			                     new nlobjSearchColumn('modified').setSort(true)];
			pdfFileResult = nlapiSearchRecord('file', null, pdfFileFilter, pdfFileColumn);
			
			//----------- Provide user with option to send email right away ------- 
			if (pdfFileResult && pdfFileResult.length > 0) {
				nsform.addFieldGroup('custpage_grpb','Email Options', null);
				
				//search for ALL contacts for client
				var cflt = [new nlobjSearchFilter('internalid', null, 'anyof', paramCustomerId),
				            new nlobjSearchFilter('isinactive','contact','is','F'),
				            new nlobjSearchFilter('email','contact','isnotempty','')];
				var ccol = [new nlobjSearchColumn('internalid', 'contact',null),
				            new nlobjSearchColumn('email', 'contact',null),
				            new nlobjSearchColumn('entityid', 'contact',null).setSort()];
				var crs = nlapiSearchRecord('customer', null, cflt, ccol);
				
				//Add in email options
				var multicfld = nsform.addField('custpage_contacts', 'multiselect', 'Contacts', null, 'custpage_grpb');
				multicfld.setBreakType('startcol');
				multicfld.setDisplaySize(300, 5);
				for (var c=0; crs && c < crs.length; c++) {
					multicfld.addSelectOption(crs[c].getValue('email','contact'), crs[c].getValue('entityid','contact')+' ['+crs[c].getValue('email','contact')+']', false);
				}
				
				//Add in Email Subject
				var emailsubject = nsform.addField('custpage_emailsubject','text','Subject', null, 'custpage_grpb');
				emailsubject.setBreakType('startcol');
				
				//Add in Email Body 
				var emailcomment = nsform.addField('custpage_comments', 'textarea', 'Message', null, 'custpage_grpb');
				emailcomment.setDisplaySize(50, 5);
				
				
				//add a button to SEND email with selection.
				nsform.addButton('custpage_sendemail', 'Generate Email', 'generateEmail()');
			}
			
			var fsl = nsform.addSubList('custpage_pdffiles','list','Generated Price List PDFs for Customer',null);
			fsl.addField('fsl_sendfile','checkbox','Send');
			fsl.addField('fsl_fileid','text','File ID');
			fsl.addField('fsl_filename','text','File Name');
			fsl.addField('fsl_modified','text','File Modified');
			fsl.addField('fsl_viewfile','textarea','View File').setDisplayType('inline');
			
			
			fsl.setHelpText('List of previously generated Price List PDFs');
			var fline = 1;
			
			for (var f=0; pdfFileResult && f<pdfFileResult.length; f++) {
				
				var fileUrl = '<a href="https://system.netsuite.com'+pdfFileResult[f].getValue('url')+'" target="_blank">View File</a>';
				
				fsl.setLineItemValue('fsl_fileid', fline, pdfFileResult[f].getId());
				fsl.setLineItemValue('fsl_modified', fline, pdfFileResult[f].getValue('modified'));
				fsl.setLineItemValue('fsl_filename', fline, pdfFileResult[f].getValue('name'));
				fsl.setLineItemValue('fsl_viewfile', fline, fileUrl);
				
				fline++;
			}
		}
		
		//Show any process message
		msgfld.setDefaultValue('<div style="font-size: 14px; font-weight: bold"><br/>'+paramProcMsg+'<br/><br/></div>');
		
	} catch (displayerr) {
		msgfld.setDefaultValue('<div style="color: red; font-size: 14px;"><br/>'+getErrText(displayerr)+'<br/><br/></div>');
	}
	
	res.writePage(nsform);
}
