/**
 * Author: joe.son@audaxium.com
 * Date: 12/8/2012
 * Desc:
 * Suitelet that will allow WhippleHill users to generate customized Service Order Form from Estimate Record
 * 
 */
var ctx = nlapiGetContext();

//internal ID of letter template from script parameter
var xmlTemplateId = ctx.getSetting('SCRIPT','custscript_xml_template');
//internal iD of folder to store generated order form
var folderId = ctx.getSetting('SCRIPT','custscript_gen_quote_folderid');
//default Other Terms and Conditions Text File ID
var defaultTacTextFileID = ctx.getSetting('SCRIPT','custscript_default_other_tac_html');
//Email template to be used for sending email
var emailTemplateId = ctx.getSetting('SCRIPT','custscript_email_template');

//Mod Request 4/12/2013 - Templatized Terms and Conditions instead of dynamically generating TaC portion of PDF
//This folder contains 4 options to choose from
var tacOptionFolderId = 983094;

var fileName='';

var objToday = new Date();
var strTodayDate = (objToday.getMonth()+1)+'_'+objToday.getDate()+'_'+objToday.getFullYear();

var nsform = nlapiCreateForm('Generate Service Order Form', true);
nsform.setScript('customscript_aux_cs_serviceorderhelper');

var msgDisplay = nsform.addField('custpage_msgdisplay','textarea','',null);
msgDisplay.setLayoutType('outsideabove');
msgDisplay.setDisplayType('inline');

function customServiceOrderGenerator(req, res) {
	if (!xmlTemplateId || !folderId || !defaultTacTextFileID || !emailTemplateId) {
		throw nlapiCreateError('MISSING_REQ_IDs', 'Missing XML Template ID and/or Folder ID  and/or Default Other Terms and Conditions HTML and/or Email Template ID to use on Script Deployment', true);
	}
	
	var quoteId = req.getParameter('custparam_quoteid');
	if (!quoteId) {
		throw nlapiCreateError('MISSING_OPP_QUOTE_IDs', 'Missing Estimate ID', true);
	}
	
	//Action to take: gen or email. Defaults to gen
	var action = req.getParameter('custparam_action');
	if (!action) {
		action = 'gen';
	}
	
	//Display process message
	var procMsg = req.getParameter('custparam_msg');
	if (procMsg) {
		msgDisplay.setDefaultValue(procMsg);
	}
	//Load Records
	var quoteRec = nlapiLoadRecord('estimate', quoteId);
	var clientRec = nlapiLoadRecord('customer', quoteRec.getFieldValue('entity'));
	
	if (req.getMethod() == 'POST') {
		var msg ='';
		try {
			
			if (action == 'email') {
				
				/**
				 * //--------------------- Email Feature ---------------------------------------
			var sendtoEmail = 'custpage_sendtoemail'
			var sendCc = 'custpage_sendcc' //comma separaeted
			var sendFile = 'custpage_sendfile' //file id to attach
				 */
				var sbj = req.getParameter('custpage_emailsbj');
				
				var emmsg = req.getParameter('custpage_emailmsg');
				
				var emailTo = req.getParameter('custpage_sendtoemail');
				
				//testing
				//sbj += ' :: Originally to '+emailTo;
				//emailTo = 'mhson1978@gmail.com';
				//TESTING ENDs
				
				var sendFrom = ctx.getUser();
				var attachment = nlapiLoadFile(req.getParameter('custpage_sendfile'));
				var records = new Object();
				records['transaction'] = quoteRec.getId();
				records['entity'] = clientRec.getId();
				
				var arCc = null;
				if (req.getParameter('custpage_sendcc')) {
					arCc = req.getParameter('custpage_sendcc').split(',');
				}
				
				//PROD
				nlapiSendEmail(sendFrom,emailTo,sbj,emmsg,arCc,null,records, attachment);
				
				//TESTING
				//nlapiSendEmail(sendFrom,emailTo,sbj,msg,arCc,null,null, attachment);
				
				msg += '<b>Selected Service Form successfully sent to '+emailTo+'</b>'; 
				
				
			} else if (action=='gen') {
				var xml = nlapiLoadFile(xmlTemplateId).getValue();
				var isReplace = false;
				var fileName = 'ServiceOrderForm_Estimate#'+quoteRec.getFieldValue('tranid')+'_'+strTodayDate+'.pdf';
				var fileId = '';
				if (req.getParameter('custpage_replacefilename') && req.getParameter('custpage_createnew')!='T') {
					//to replace
					fileName = req.getParameter('custpage_replacefilename');
					isReplace = true;
				}
				
				//load configuration to get Company Address
				var CompanyInfo = '5 East Point Drive<br/>'+
								  'Building C<br/>'+
								  'Bedford, NH 03110<br/>'+
								  'P: 603.669.5979<br/>'+
								  'F: 603.206.6979<br/>'+
								  'www.whipplehill.com';		
				
				var billToInfo = '';
				var arBill = (quoteRec.getFieldValue('billaddress'))?quoteRec.getFieldValue('billaddress').split('\n'):new Array();
				if (arBill.length > 0) {
					for (var b=0; b < arBill.length; b++) {
						billToInfo +=arBill[b]+'<br/>';
					}
				}
				
				//Build New custom TaC string
				var tacString = '';
				var layoutId = req.getParameter('custpage_layoutoption');
				/**
				 * File ID from Templates > XML Templates > Terms and Condition Options folder
				 * 1047608 = Template #1
				   1047609 = Template #2
				   1047610 = Template #3
		           1047611 = Template #4
				 */
				var templateName = 'Default'; //default
				if (layoutId == '1047608') {
					templateName = 'Template #1';
				} else if (layoutId == '1047609') {
					templateName = 'Template #2';
				} else if (layoutId == '1047610') {
					templateName = 'Template #3';
				} else if (layoutId == '1047611') {
					templateName = 'Template #4';
				}
				
				for (var t=1; t <= 6; t++) {
					var tacVals = req.getParameter('custpage_tacedit'+t);
					if (tacVals) {
						log('debug','tac '+t, tacVals);
						tacString += tacVals;
					} else {
						break;
					}
				}
				
				log('debug','tacString size',tacString.length);
				//Replace out Dynamic Field Values
				//1. Replace Company Info
				xml = strGlobalReplace(xml, "#ADDRESSTEXT#", CompanyInfo);
				//2. Replace Bill To
				xml = strGlobalReplace(xml, "#BILLADDRESS#", billToInfo);
				//3. Replace Quote Date and Ref 
				xml = xml.replace('#TRANDATE#',quoteRec.getFieldValue('trandate'));
				
				xml = xml.replace('#TRANID#',quoteRec.getFieldValue('tranid'));
				//4. Replace Custom or Default T and C text
				log('debug','xml step 1','step 4');
				xml = xml.replace('#OTHERTACTEXT#', ((tacString)?tacString:''));
				log('debug','xml step 5','step 5');
				//5. Get Client Info from custbody7 field
				var contactId = quoteRec.getFieldValue('custbody7');
				if (!contactId) {
					xml = xml.replace('#CLIENTCONTACTINFO#','Contact Info Not Defined on Estimate');
					log('debug','xml step contactid','step contact');
				} else {
					//Load Contact and set the value replace
					var contactInfoText = '';
					var contact = nlapiLoadRecord('contact', contactId);
					contactInfoText = nlapiEscapeXML(contact.getFieldValue('firstname'))+' '+nlapiEscapeXML(contact.getFieldValue('lastname'))+'<br/>'+
									  (contact.getFieldValue('email')?contact.getFieldValue('email')+'<br/>':'')+
									  (contact.getFieldValue('phone')?contact.getFieldValue('phone')+'<br/>':'');
					xml = xml.replace('#CLIENTCONTACTINFO#',contactInfoText);
					log('debug','xml step contacttext','step set contactInfoText');
				}
				//6. replace out EXP date
				xml = xml.replace('#EXPDATE#',(quoteRec.getFieldValue('duedate')?nlapiEscapeXML(quoteRec.getFieldValue('duedate')):''));
				log('debug','xml step 6','step 6');
				//7. replace out Issued By
				xml = xml.replace('#ISSUEDBY#',(quoteRec.getFieldText('custbody4')?nlapiEscapeXML(quoteRec.getFieldText('custbody4')):''));
				log('debug','xml step 7','step 7');
				//8. replace out Project Start Date
				xml = xml.replace('#PROJECTSTARTDATE#',(quoteRec.getFieldValue('custbody5')?quoteRec.getFieldValue('custbody5'):''));
				log('debug','xml step 8','step 8');
				//9. replace out annual fee start date
				xml = xml.replace('#ANNUALFEESTARTDATE#',(quoteRec.getFieldValue('startdate')?quoteRec.getFieldValue('startdate'):''));
				log('debug','xml step 9','step 9');
				
				//10. replace out annual fee end date
				xml = xml.replace('#ANNUALFEEENDDATE#',(quoteRec.getFieldValue('enddate')?quoteRec.getFieldValue('enddate'):''));
				log('debug','xml step 10','step 10');
				//11. replace out annual fee due date
				xml = xml.replace('#ANNUALFEEDUEDATE#',(quoteRec.getFieldValue('custbody36')?quoteRec.getFieldValue('custbody36'):''));
				log('debug','xml step 11','step 11');
				//12. replace out service due date
				xml = xml.replace('#SERVICEDUEDATE#',(quoteRec.getFieldValue('custbody_test_terms_and_conditions')?quoteRec.getFieldValue('custbody_test_terms_and_conditions'):''));
				log('debug','xml step 12','step 12');
				//13. replace out payment terms
				xml = xml.replace('#TERMS#',(quoteRec.getFieldText('terms')?nlapiEscapeXML(quoteRec.getFieldText('terms')):''));
				log('debug','xml step 13','step 13');
				//14. replace out currency
				xml = xml.replace('#CURRENCY#',(quoteRec.getFieldText('currency')?quoteRec.getFieldText('currency'):''));
				log('debug','xml step 14','step 14');
				//15. Build and replace out itemlist
				var itemCount = quoteRec.getLineItemCount('item');
				var itemHtml = '';
				for (var it=1; it<=itemCount; it++) {
					var desc = nlapiEscapeXML(quoteRec.getLineItemValue('item','description',it));
					if (desc) {
						desc = strGlobalReplace(desc,'\n','<br/>');
					} else {
						desc = '';
					}
					
					itemHtml += '<tr><td width="70px" vertical-align="top" border-right="2" border-color="#666"><p align="right">'+
							   (quoteRec.getLineItemValue('item', 'quantity', it)?quoteRec.getLineItemValue('item', 'quantity', it):'')+'</p></td>'+
							   '<td width="300px" vertical-align="top" border-right="2" border-color="#666"><p align="left">'+
							   desc+'</p></td>'+
							   '<td width="100px" vertical-align="top" border-right="2" border-color="#666"><p align="right">'+
							   (quoteRec.getLineItemValue('item', 'rate', it)?formatCurrency(quoteRec.getLineItemValue('item', 'custcol_list_rate', it),2,'.',',',false):'')+'</p></td>'+
							   '<td width="100px" vertical-align="top" border-right="2" border-color="#666"><p align="right">'+
							   (quoteRec.getLineItemValue('item', 'custcol_swe_contract_item_term_months', it)?quoteRec.getLineItemValue('item', 'custcol_swe_contract_item_term_months', it):'')+'</p></td>'+
							   '<td width="100px" vertical-align="top"><p align="right">'+
							   (quoteRec.getLineItemValue('item', 'amount', it)?formatCurrency(quoteRec.getLineItemValue('item', 'amount', it),2,'.',',',false):'')+'</p></td></tr>';
							   
				}
				xml = xml.replace('#ITEMLIST#', itemHtml);
				log('debug','xml step 15','step 15');
				//16. replace out total - already formatted by NetSuite
				xml = xml.replace('#TOTALAMOUNT#', formatCurrency(quoteRec.getFieldValue('total'),2,'.',',',false));
				log('debug','xml step 16','step 16');
				
				log('debug','templateName',templateName);
				var subtaxHtml = '';
				if (templateName == 'Template #1' || templateName=='Template #3') {
					subtaxHtml = '';	
				} else if (templateName == 'Template #2' || templateName=='Template #4') {
					subtaxHtml = '<tr>'+
								 '<td width="70%">'+
								 '<p align="left"> </p>'+
								 '</td>'+
								 '<td width="10%">'+
								 '<p align="left"><b>Subtotal</b></p>'+
								 '</td>'+
								 '<td width="20%">'+
								 '<p align="right">$'+formatCurrency(quoteRec.getFieldValue('subtotal'),2,'.',',',false)+'</p>'+
								 '</td>'+
								 '</tr>'+
								 '<tr>'+
								 '<td width="70%">'+
								 '<p align="left"> </p>'+
								 '</td>'+
								 '<td width="10%">'+
								 '<p align="left"><b>Sales Tax/GST</b></p>'+
								 '</td>'+
								 '<td width="20%">'+
								 '<p align="right">$'+formatCurrency(quoteRec.getFieldValue('taxtotal'),2,'.',',',false)+'</p>'+
								 '</td>'+
								 '</tr>';
				} else {
					subtaxHtml = '<tr>'+
								 '<td width="70%">'+
								 '<p align="left"> </p>'+
								 '</td>'+
								 '<td width="10%">'+
								 '<p align="left"><b>Subtotal</b></p>'+
								 '</td>'+
								 '<td width="20%">'+
								 '<p align="right">$'+formatCurrency(quoteRec.getFieldValue('subtotal'),2,'.',',',false)+'</p>'+
								 '</td>'+
								 '</tr>'+
								 '<tr>'+
								 '<td width="70%">'+
								 '<p align="left"> </p>'+
								 '</td>'+
								 '<td width="10%">'+
								 '<p align="left"><b>Sales Tax</b></p>'+
								 '</td>'+
								 '<td width="20%">'+
								 '<p align="right">$'+formatCurrency(quoteRec.getFieldValue('taxtotal'),2,'.',',',false)+'</p>'+
								 '</td>'+
								 '</tr>';
				}
				
				//17. replace #SUBANDTAX# section
				xml = xml.replace('#SUBANDTAX#', subtaxHtml);
				
				//Generate PDF
				var orderPDF = nlapiXMLToPDF(xml);
				
				//Search and Find Folder
				var rfolderFilter = [new nlobjSearchFilter('name', null, 'contains', '['+quoteRec.getFieldValue('entity')+']'),
				                    new nlobjSearchFilter('parent', null, 'anyof',folderId),
				                    new nlobjSearchFilter('isinactive', null, 'is', 'F')];
				var rfolderColumn = [new nlobjSearchColumn('name')];
				var rfolderResult = nlapiSearchRecord('folder', null, rfolderFilter, rfolderColumn);
				
				var clientFolderId = '';
				if (rfolderResult && rfolderResult.length > 0) {
					clientFolderId = rfolderResult[0].getId();
				} else {
					//create new with following format
					//Customer Name [internalid]
					var rfolderRec = nlapiCreateRecord('folder');
					rfolderRec.setFieldValue('parent',folderId);
					rfolderRec.setFieldValue('name',quoteRec.getFieldText('entity')+' ['+quoteRec.getFieldValue('entity')+']');
					clientFolderId = nlapiSubmitRecord(rfolderRec, true, true);
				}
				
				orderPDF.setFolder(clientFolderId);
				
				if (!isReplace) {
					fileName = '['+objToday.getTime()+']'+fileName;
				}
				orderPDF.setName(fileName);
				var fileId = nlapiSubmitFile(orderPDF);
				//When replacing file, load the file again and set file name to reflect Todays Date
				if (isReplace) {
					var pdfReload = nlapiLoadFile(req.getParameter('custpage_replacefile'));
					pdfReload.setFolder(clientFolderId);
					pdfReload.setName('ServiceOrderForm_Estimate#'+quoteRec.getFieldValue('tranid')+'_'+strTodayDate+'.pdf');
					nlapiSubmitFile(pdfReload);
					
					msg += '<b>'+fileName+'</b> was replaced and renamed to <i>'+'ServiceOrderForm_Estimate#'+quoteRec.getFieldValue('tranid')+'_'+strTodayDate+'.pdf';
				} else {
					msg += '<b>'+fileName+'</b> created Successfully';
				}
				
				//update custom TandC value on quote
				var tacFileName = 'ServiceOrderForm_Estimate#'+quoteRec.getFieldValue('tranid')+'_customTermsAndConditions.txt';
				var tacFile = nlapiCreateFile(tacFileName,'PLAINTEXT',tacString);
				tacFile.setFolder(clientFolderId);
				var tacFileId = nlapiSubmitFile(tacFile);
				
				//save layout selected
				var updFld = ['custbody_aux_other_tac','custbody_aux_tac_layoutid'];
				var updVals = [tacFileId, layoutId];
				
				nlapiSubmitField('estimate',quoteRec.getId(), updFld,updVals);
				
				
				//Final Step: Attach file to Customer and Quote Record
				nlapiAttachRecord('file',fileId,'estimate',quoteId);
				nlapiAttachRecord('file',fileId,'customer',quoteRec.getFieldValue('entity'));
			}
			
			
			
		} catch (procError) {
			msg = 'Error occured during Service Order Form Processing. Action of '+action+': '+getErrText(procError);
			log('error','Error processing package order form',getErrText(procError));
		}
		//redirect to suitelet to avoid refresh issues
		var redirectParam = new Array();
		redirectParam['custparam_quoteid']=quoteId;
		redirectParam['custparam_msg'] = msg;
		redirectParam['custparam_action'] = action;
		nlapiSetRedirectURL('SUITELET', 'customscript_aux_sl_serviceorder_gen', 
							'customdeploy_aux_sl_serviceorder_gen', false, redirectParam);
	} else {
		//---------------------------------- Form Display ------------------------------------------
		//Search for existing customer specific sub folder under parent "folderId"
		log('debug','folderid',folderId);
		log('debug','method',req.getMethod());
		var folderFilter = [new nlobjSearchFilter('name', null, 'contains', '['+quoteRec.getFieldValue('entity')+']'),
		                    new nlobjSearchFilter('parent', null, 'anyof',folderId),
		                    new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		var folderColumn = [new nlobjSearchColumn('name')];
		var folderResult = nlapiSearchRecord('folder', null, folderFilter, folderColumn);
		var fileResult = null;
		
		if (folderResult && folderResult.length > 0) {
			//search for all files under this clients Service Order Forms folder
			var fileFilter = [new nlobjSearchFilter('folder', null, 'anyof', folderResult[0].getId())];
			var fileColumn = [new nlobjSearchColumn('name'),
			                  new nlobjSearchColumn('folder'),
			                  new nlobjSearchColumn('documentsize'),
			                  new nlobjSearchColumn('url'),
			                  new nlobjSearchColumn('created'),
			                  new nlobjSearchColumn('modified').setSort(true),
			                  new nlobjSearchColumn('filetype')];
			fileResult = nlapiSearchRecord('file', null, fileFilter, fileColumn);
		}
		
		//Display UI
		nsform.addSubmitButton('Process Order Form');
		
		//Add Create/Replace Form Button
		var genBtn = nsform.addButton('custpage_genbtn','Create/Replace Service Order Form','loadGenSl()');
		if (action == 'gen') {
			genBtn.setDisabled(true);
		}
		
		//Add Send Email Button
		var emailBtn = nsform.addButton('custpage_emailbtn','Email PDF to Client','loadEmailSl()');
		if (action=='email') {
			emailBtn.setDisabled(true);
		}
		
		//Add Cancel or Close button
		nsform.addButton('custpage_closewindow','Cancel/Close','closeWindow()');
		
		var quoteIdParam = nsform.addField('custparam_quoteid','text');
		quoteIdParam.setDefaultValue(quoteId);
		quoteIdParam.setDisplayType('hidden');
		
		var actionParam = nsform.addField('custparam_action','text');
		actionParam.setDefaultValue(action);
		actionParam.setDisplayType('hidden');
		
		
		if (action == 'gen') {
			//4/12/2013 - Bring out template files
			var tacFilesFlt = [new nlobjSearchFilter('folder', null, 'anyof', tacOptionFolderId)];
			var tacFilesCol = [new nlobjSearchColumn('name'),
			                   new nlobjSearchColumn('created').setSort()];
			var tacFilesRslt = nlapiSearchRecord('file', null, tacFilesFlt, tacFilesCol);
			
			//Add Order Form Customization Group
			nsform.addFieldGroup('custpage_groupa','Customize Service Order Form');
			
			var orderIntro = nsform.addField('custpage_genintro', 'inlinehtml','',null,'custpage_groupa');
			var introHtml = '<h1>Generate/Replace Service Order Form for Estimate #'+quoteRec.getFieldValue('tranid')+
							' for <i>'+quoteRec.getFieldText('entity')+'</i></h1><br/>';
			orderIntro.setDefaultValue(introHtml);

			//var tacToUseFld = nsform.addField('custpage_usetacoption','checkbox','Use T&C Option: ', null, 'custpage_groupa');
			//create 5 hidden longtext fields to store 
			//default
			var defaultTextFld = nsform.addField('custpage_tacdefault','longtext','',null,null);
			defaultTextFld.setDisplayType('hidden');
			//from quote
			var tacQuoteTextFld = nsform.addField('custpage_tacquote','longtext','',null,null);
			tacQuoteTextFld.setDisplayType('hidden');
			
			//tac 1
			var tac1TextFld = nsform.addField('custpage_tac1','longtext','',null,null);
			tac1TextFld.setDisplayType('hidden');
			
			//tac 2
			var tac2TextFld = nsform.addField('custpage_tac2','longtext','',null,null);
			tac2TextFld.setDisplayType('hidden');
			
			//tac 3
			var tac3TextFld = nsform.addField('custpage_tac3','longtext','',null,null);
			tac3TextFld.setDisplayType('hidden');

			//tac 4
			var tac4TextFld = nsform.addField('custpage_tac4','longtext','',null,null);
			tac4TextFld.setDisplayType('hidden');
			var tacOptionHelp = nsform.addField('custpage_tacoptionhelp','inlinehtml','',null,'custpage_groupa');
			tacOptionHelp.setDefaultValue('<br/><u>You can choose from pre-defined T&C Options and customize or Customize from default</u><br/><br/>');
			
			//------------------------------New Column -------------------------------------------------------------------
			//show create new checkbox
			var createNew = nsform.addField('custpage_createnew','checkbox','Create New PDF: ', null, 'custpage_groupa');
			createNew.setDefaultValue('T');
			createNew.setBreakType('startcol');
			
			//create list of existing files
			var replaceFile = nsform.addField('custpage_replacefile','select','Replace Existing PDF: ',null,'custpage_groupa');
			replaceFile.addSelectOption('', '',true);
			replaceFile.setDisplayType('disabled');
			
			//replaceFileHelp
			var replaceHelp = nsform.addField('custpage_replacehelp','inlinehtml','',null,'custpage_groupa');
			replaceHelp.setDefaultValue('<div style="color:red; font-weight:bold">Date on the File Name will change to replace Todays date when Replaced</div>');
			
			//--------------------------- new group
			nsform.addFieldGroup('custpage_groupb','T&C Text Customization');
			var tacTemplateName = nsform.addField('custpage_templatename','text','',null,'custpage_groupb');
			tacTemplateName.setDisplayType('hidden');
			
			var tacOptionFld = nsform.addField('custpage_tacselectoption','select','T&C Options: ', null, 'custpage_groupb');
			tacOptionFld.setBreakType('startcol');
			tacOptionFld.addSelectOption('', '', true);
			/**
			tacOptionFld.addSelectOption('-1','Default T&C Text',false);
			if (quoteRec.getFieldValue('custbody_aux_other_tac')) {
				tacOptionFld.addSelectOption('-2','T&C Text From Quote', false);
			}
			*/
			
			//5/10/2013 addition
			var layoutOptionFld = nsform.addField('custpage_layoutoption','select','Layout Options: ', null, 'custpage_groupb');
			layoutOptionFld.setMandatory(true);
			layoutOptionFld.addSelectOption('', '', true);
			layoutOptionFld.addSelectOption('-1','Default Layout');
			
			if (tacFilesRslt && tacFilesRslt.length > 0) {
				for (var f=0; f < tacFilesRslt.length; f++) {
					var fileName = tacFilesRslt[f].getValue('name');
					tacOptionFld.addSelectOption(tacFilesRslt[f].getId(), fileName);
					layoutOptionFld.addSelectOption(tacFilesRslt[f].getId(), fileName + ' Layout');
					
					var fileLoad = nlapiLoadFile(tacFilesRslt[f].getId());
					if (fileName.indexOf('Template #1') > 0) {
						tac1TextFld.setDefaultValue(fileLoad.getValue());
					} else if (fileName.indexOf('Template #2') > 0) {
						tac2TextFld.setDefaultValue(fileLoad.getValue());
					} else if (fileName.indexOf('Template #3') > 0) {
						tac3TextFld.setDefaultValue(fileLoad.getValue());
					} else if (fileName.indexOf('Template #4') > 0) {
						tac4TextFld.setDefaultValue(fileLoad.getValue());
					}
				}				
			}
			if (quoteRec.getFieldValue('custbody_aux_tac_layoutid')) {
				layoutOptionFld.setDefaultValue(quoteRec.getFieldValue('custbody_aux_tac_layoutid'));
			}
			
			var layoutOptionHelp = nsform.addField('custpage_layoutophelp','textarea','Layout Option Help: ', null, 'custpage_groupb');
			layoutOptionHelp.setDisplayType('inline');
			
			var tacEdit = nsform.addField('custpage_tacedit','longtext','Customize Other T&C: ', null, 'custpage_groupb');
			//tacEstimateFileId tracks custom terms and conditions text file specific for this estimate
			//when this field is empty when SL is submitted, new customTandCTextFile will be set for this estimate
			var tacEstimateFileId = nsform.addField('custpage_tacestimatefileid','text','',null,'custpage_groupa');
			tacEstimateFileId.setDisplayType('hidden');
			//tacEstimateFileId.setDisplayType('inline');
			
			/**
			var defaultTextFld = nsform.addField('custpage_tacdefault','longtext','',null,null);
			defaultTextFld.setDisplayType('hidden');
			//from quote
			var tacQuoteTextFld = nsform.addField('custpage_tacquote','longtext','',null,null);
			tacQuoteTextFld.setDisplayType('hidden');
			*/
			
			//load both default and quote file
			var defaultFile = nlapiLoadFile(defaultTacTextFileID);
			defaultTextFld.setDefaultValue(defaultFile.getValue());
			if (quoteRec.getFieldValue('custbody_aux_other_tac')) {
				var quoteTacFile = nlapiLoadFile(quoteRec.getFieldValue('custbody_aux_other_tac'));
				tacEdit.setDefaultValue(quoteTacFile.getValue());
				tacQuoteTextFld.setDefaultValue(quoteTacFile.getValue());
			} else {
				tacEdit.setDefaultValue(defaultFile.getValue());
			}
			
			tacEdit.setDisplaySize(150, 20);
			
			var tacEditHelp = nsform.addField('custpage_tachelp','inlinehtml','',null,'custpage_groupa');
			tacEditHelp.setDefaultValue('<div style="color:red; font-weight:bold">Max 24,000 character limit. PDF generator will unify the formatting in the backend</div>');


			//create upto 6 hidden longtext fields to capture user edits to pass in for processing. 
			//Due to 4000 character limit on longtext, we need to capture all user edits and generate 
			//textfile specific for this estimate
			var newTacEdit1 = nsform.addField('custpage_tacedit1','longtext','',null,'custpage_groupa');
			var newTacEdit2 = nsform.addField('custpage_tacedit2','longtext','',null,'custpage_groupa');
			var newTacEdit3 = nsform.addField('custpage_tacedit3','longtext','',null,'custpage_groupa');
			var newTacEdit4 = nsform.addField('custpage_tacedit4','longtext','',null,'custpage_groupa');
			var newTacEdit5 = nsform.addField('custpage_tacedit5','longtext','',null,'custpage_groupa');
			var newTacEdit6 = nsform.addField('custpage_tacedit6','longtext','',null,'custpage_groupa');
			
			//newTacEdit1.setDisplayType('inline');
			//newTacEdit2.setDisplayType('inline');
			//newTacEdit3.setDisplayType('inline');
			//newTacEdit4.setDisplayType('inline');
			//newTacEdit5.setDisplayType('inline');
			//newTacEdit6.setDisplayType('inline');
			
			newTacEdit1.setDisplayType('hidden');
			newTacEdit2.setDisplayType('hidden');
			newTacEdit3.setDisplayType('hidden');
			newTacEdit4.setDisplayType('hidden');
			newTacEdit5.setDisplayType('hidden');
			newTacEdit6.setDisplayType('hidden');
			
			if (!fileResult) {
				//disable it
				createNew.setDisplayType('disabled');
			} else {
				//Creat field for list of available files to replace
				for (var f=0; f < fileResult.length; f++) {
					var ext = fileResult[f].getValue('name').substring((fileResult[f].getValue('name').length-5));
					if (ext.indexOf('.txt') <= 0) {
						replaceFile.addSelectOption(fileResult[f].getId(), fileResult[f].getValue('name'));
					}
					
				}
			}
			var replaceFileName = nsform.addField('custpage_replacefilename','text','',null,'custpage_groupa');
			replaceFileName.setDisplayType('hidden');
			
			/**
			 * new nlobjSearchColumn('name'),
			                  new nlobjSearchColumn('folder'),
			                  new nlobjSearchColumn('documentsize'),
			                  new nlobjSearchColumn('url'),
			                  new nlobjSearchColumn('created'),
			                  new nlobjSearchColumn('filetype')];
			 */
			
			//show list of current file as sublist
			var fsl = nsform.addSubList('custpage_pdffiles','list','Generated PDFs');
			fsl.addField('fsl_fileid','text','File ID');
			fsl.addField('fsl_foldername','text','Folder Name');
			fsl.addField('fsl_modified','text','Date Modified');
			fsl.addField('fsl_created','text','Date Created');
			fsl.addField('fsl_filename','text','File Name');
			fsl.addField('fsl_viewfile','textarea','View File');
			var fline = 1;
			for (var f=0; fileResult && f < fileResult.length; f++) {
				var fileUrl = '<a href="https://system.netsuite.com'+fileResult[f].getValue('url')+'" target="_blank">View File</a>';
				fsl.setLineItemValue('fsl_fileid', fline, fileResult[f].getId());
				fsl.setLineItemValue('fsl_foldername', fline, fileResult[f].getText('folder'));
				fsl.setLineItemValue('fsl_modified', fline, fileResult[f].getValue('modified'));
				fsl.setLineItemValue('fsl_created', fline, fileResult[f].getValue('created'));
				fsl.setLineItemValue('fsl_filename', fline, fileResult[f].getValue('name'));
				fsl.setLineItemValue('fsl_viewfile', fline, fileUrl);
				
				fline++;
			}
			
			
		} else if (action=='email') {
			
			//--------------------- Email Feature ---------------------------------------
			
			//Add Order Form Email Group
			nsform.addFieldGroup('custpage_groupb','Email PDF to Customer');
			//clientRec
			var emailIntro = nsform.addField('custpage_emailintro', 'inlinehtml','',null,'custpage_groupb');
			var emailIntroHtml = '<h1>Send generated Service Order Form PDF to customer. </h1>';
			emailIntro.setDefaultValue(emailIntroHtml);
			
			var uiContactId = quoteRec.getFieldValue('custbody7');
			//default to Customer Records' email address
			var defaultEmailAddress = clientRec.getFieldValue('email');
			if (uiContactId) {
				defaultEmailAddress = nlapiLookupField('contact',uiContactId,'email');
			}
			
			var sendtoEmail = nsform.addField('custpage_sendtoemail','email','Send Estimate To: ', null,'custpage_groupb');
			sendtoEmail.setDefaultValue(defaultEmailAddress);
			sendtoEmail.setMandatory(true);
			
			var sendCc = nsform.addField('custpage_sendcc','textarea','To CC Email Addresses: ', null, 'custpage_groupb');
			var sendCcHelp = nsform.addField('custpage_sendcchelp','inlinehtml','',null,'custpage_groupb');
			sendCcHelp.setDefaultValue('<b>Comma separated list of emails for multiple email addresses</b>');
			
			//create list of existing files
			var sendFile = nsform.addField('custpage_sendfile','select','PDF to Send: ',null,'custpage_groupb');
			sendFile.addSelectOption('', '',true);
			sendFile.setMandatory(true);
			sendFile.setBreakType('startcol');
			
			//Mod request. Add Merged email content for customization
			//merge with Quote Record
			var customFld = new Array();
			var econtactId = quoteRec.getFieldValue('custbody7');
			var contactFirstName = 'Customer';
			if (econtactId) {
				var econtact = nlapiLoadRecord('contact', econtactId);
				contactFirstName = (econtact.getFieldValue('firstname'))?econtact.getFieldValue('firstname'):'Customer';
			}
			customFld['NLFIRSTNAME'] = contactFirstName;
			
			var mmRec = nlapiMergeRecord(emailTemplateId, 'estimate', quoteRec.getId(), null, null, customFld); 
			var sbj = mmRec.getName();
			var emmsg = mmRec.getValue();
			
			var emailSbjFld = nsform.addField('custpage_emailsbj','text','Email Subject: ', null, 'custpage_groupb');
			emailSbjFld.setMandatory(true);
			emailSbjFld.setDefaultValue(sbj);
			
			var emailMsgFld = nsform.addField('custpage_emailmsg','richtext','Email Body: ', null, 'custpage_groupb');
			emailMsgFld.setMandatory(true);
			emailMsgFld.setDefaultValue(emmsg);
			
			if (!fileResult) {
				//disable it
				sendFile.setDisplayType('disabled');
			} else {
				//Creat field for list of available files to replace
				for (var f=0; f < fileResult.length; f++) {
					sendFile.addSelectOption(fileResult[f].getId(), fileResult[f].getValue('name'));
				}
			}
			
		}
		
	}	
	res.writePage(nsform);
}
