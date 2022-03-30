/**
 * Author: joe.son@audaxium.com
 * Date: 3/26/2013
 * Desc:
 * Custom PDF generator 
 * All generated PDFs will be stored in "Customized Quote PDF".
 * - Subfolders will be created for linked customer record.
 * - Unless it's marked as Final Version, each created version will be marked as revision.
 */

var ctx = nlapiGetContext();
var parentFolderId = 790241; //Customized Quote PDF folder
var tacOptionFolderId = 790242;
//var quotePdfTemplateId = 743; //Quote PDF XML uploaded as Email Template to allow merging
//9/19/2016
//Due to deprecation of nlapiMergeRecord with 2016v2, we are converting 
//template 743 to scriptable template.
var quotePdfTemplateId = 833;
var nsform = null;

var quoteId = null, quoterec = null, nextVersionNumber=null, versionRecId=null, customerFolderId=null;
var quoteTacOption = null, isFinal=null;

function QuoteGenerator(req, res){
	quoteId = req.getParameter('custparam_quoteid');
	versionRecId = req.getParameter('custpage_versioinrecid');
	//versionNumber per transaction is traced by Custom Quote PDF Version (customrecord_customquote_version) custom record.
	//when version is set to 1, this means to create new record and set it as 1
	nextVersionNumber = req.getParameter('custpage_version');
	if (!nextVersionNumber) {
		nextVersionNumber=0;
	}
	customerFolderId=req.getParameter('custpage_customerfolderid');
	quoteTacOption = req.getParameter('custpage_tacoptioni');
	isFinal = req.getParameter('custpage_isfinal');
	
	var msg = req.getParameter('custparam_msg');
	if (!msg) {
		msg = '';
	}
	
	nsform = nlapiCreateForm('Generate Custom PDF Quote', true);
	//nsform.setScript('customscript_ax_cs_opp_line_sl_helper');
	
	var messagefld = nsform.addField('custpage_msgfld', 'longtext', '');
	messagefld.setDisplayType('inline');
	messagefld.setLayoutType('outsideabove');
	
	try {
		if (!quoteId) {
			throw nlapiCreateError('MISSING_QUOTE_ID', 'Missing quote information', true);
		}
		
		quoterec = nlapiLoadRecord('estimate', quoteId);
	
		if (req.getMethod() == 'POST') {
			//FIELD REplacement
			//NLTACBFOHTML - t and c BFO HTML
			//NLCUSTOMERNAME - customer name
			//NLREVISION - revision
			//NLITEMLIST - item list table
			//NLSHIPADDRESS
			//NLBILLADDRESS
			
			var otoday = new Date();
			var fileNameToday = (otoday.getMonth()+1)+'_'+otoday.getDate()+'_'+otoday.getFullYear();
			var companyName = nlapiLookupField('customer', quoterec.getFieldValue('entity'), 'companyname', null);
			
			var fileName = 'Quote_'+quoterec.getFieldValue('tranid')+'_Revision_'+nextVersionNumber+'_'+fileNameToday+'.pdf';
			if (isFinal == 'T') {
				fileName = 'Quote_'+quoterec.getFieldValue('tranid')+'_FINAL_'+nextVersionNumber+'_'+fileNameToday+'.pdf';
			}
			
			log('debug','fileName',fileName);
			
			//1. load TaC option file
			var tacFileRec = nlapiLoadFile(quoteTacOption);
			
			log('debug','tac value',tacFileRec.getValue());
			
			//9/19/2016
			//use nlapiCreateEmailMerger instead
	    	var emailMerger = nlapiCreateEmailMerger(quotePdfTemplateId);
	    	//If this passes, this is scripted email template
	    	emailMerger.setTransaction(quoteId);
	    	//perform merger
	    	var emailBody = emailMerger.merge().getBody();
			
	    	//Swap out custom Tags
	    	var billAddr = quoterec.getFieldValue('billaddr1')+'<br/>'+
			   ((quoterec.getFieldValue('billaddr2'))?quoterec.getFieldValue('billaddr2')+'<br/>':'')+
			   quoterec.getFieldValue('billcity')+' '+quoterec.getFieldValue('billstate')+' '+quoterec.getFieldValue('billstate');

	    	var shipAddr = quoterec.getFieldValue('shipaddr1')+'<br/>'+
			   ((quoterec.getFieldValue('shipaddr2'))?quoterec.getFieldValue('shipaddr2')+'<br/>':'')+
			   quoterec.getFieldValue('shipcity')+' '+quoterec.getFieldValue('shipstate')+' '+quoterec.getFieldValue('shipstate');

	    	log('debug','emailBody',emailBody);
	    	
	    	log('debug','customer name', emailBody.indexOf('#NLCUSTOMERNAME#'));
	    	
	    	emailBody = emailBody.replace('#NLTACBFOHTML#', tacFileRec.getValue());
	    	
	    	emailBody = strGlobalReplace(emailBody, '#NLCUSTOMERNAME#', companyName);
	    	emailBody = emailBody.replace('#NLREVISION#', nextVersionNumber);
	    	emailBody = emailBody.replace('#NLCOMPANYINFO#', 'Comapny Info');
	    	emailBody = emailBody.replace('#NLBILLTOADDRESS#', billAddr);
	    	emailBody = emailBody.replace('#NLSHIPTOADDRESS#', shipAddr);
			
			var itemListHtml = '';
			for (var t=1; t <= quoterec.getLineItemCount('item'); t++) {
				var itemDesc = nlapiEscapeXML(quoterec.getLineItemValue('item','description',t));
				if (itemDesc) {
					itemDesc = strGlobalReplace(itemDesc,'\n','<br/>');
				} else {
					itemDesc = '';
				}
				
				itemListHtml += '<tr>'+
								'<td width="30%" border-right="2" border-color="#666">'+
								'<p align="left">'+nlapiEscapeXML(quoterec.getLineItemText('item','item',t))+'</p></td>'+
								'<td width="10%" border-right="2" border-color="#666">'+
								'<p align="left">'+(quoterec.getLineItemValue('item','quantity',t)?quoterec.getLineItemValue('item','quantity',t):'')+'</p></td>'+
								'<td width="40%" border-right="2" border-color="#666">'+
								'<p align="left">'+itemDesc+'</p></td>'+
								'<td width="10%" border-right="2" border-color="#666">'+
								'<p align="left">'+(quoterec.getLineItemValue('item','rate',t)?quoterec.getLineItemValue('item','rate',t):'')+'</p></td>'+
								'<td width="10%">'+
								'<p align="left">'+(quoterec.getLineItemValue('item','amount',t)?quoterec.getLineItemValue('item','amount',t):'')+'</p></td></tr>';
			}
			
			emailBody = emailBody.replace('#NLITEMLIST#', itemListHtml);
			
			//generate PDF file
			var quotePdf = nlapiXMLToPDF(emailBody);
			quotePdf.setName(fileName);
		
			//2. create customer sub folder if folder ID does not exist
			if (!customerFolderId) {
				//Just incase Customer Folder was created by other while working on this
				var folderFilter = [new nlobjSearchFilter('name', null, 'contains', '['+quoterec.getFieldText('entity')+'] ('+quoterec.getFieldValue('entity')+')'),
				                    new nlobjSearchFilter('parent', null, 'anyof',parentFolderId),
				                    new nlobjSearchFilter('isinactive', null, 'is', 'F')];
				var folderColumn = [new nlobjSearchColumn('name')];
				var folderResult = nlapiSearchRecord('folder', null, folderFilter, folderColumn);
				if (folderResult && folderResult.length > 0) {
					//folder was created in between by someone else, use this
					customerFolderId = folderResult[0].getId();
				} else {
					//folder doesn't exist yet, create it
					try {
						var rfolderRec = nlapiCreateRecord('folder');
						rfolderRec.setFieldValue('parent',parentFolderId);
						rfolderRec.setFieldValue('name','['+quoterec.getFieldText('entity')+'] ('+quoterec.getFieldValue('entity')+')');
						rfolderRec.setFieldValue('description', 'Contains custom generated PDF for '+quoterec.getFieldText('entity'));
						customerFolderId = nlapiSubmitRecord(rfolderRec, true, true);
						
					} catch (foldercreateerr) {
						log('error','Error creating customer sub folder', getErrText(foldercreateerr));
						throw nlapiCreateError('FOLDER_CREATE_ERROR',getErrText(foldercreateerr));
					}
				}
			}
			
			log('debug','customer folder id',customerFolderId);
			
			//set folder id to quotePdf file
			quotePdf.setFolder(customerFolderId);
			
			//3. create and submit file
			nlapiSubmitFile(quotePdf);
			
			//4. increment next version
			//nextVersionNumber
			//versionRecId
			if (!versionRecId) {
				//version data does not exists, create one
				var vrec = nlapiCreateRecord('customrecord_customquote_version');
				vrec.setFieldValue('custrecord_cqpdfv_trx',quoteId);
				vrec.setFieldValue('custrecord_cqpdfv_version', (parseInt(nextVersionNumber)+1));
				nlapiSubmitRecord(vrec,true,true);
			} else {
				//update it
				nlapiSubmitField('customrecord_customquote_version', versionRecId, 'custrecord_cqpdfv_version', (parseInt(nextVersionNumber)+1));
			}
			
			//5. at this point, we are set, send it back to 
			//redirect to Suitelet entry page
			var redirectParam = new Array();
			redirectParam['custparam_quoteid']=quoteId;
			redirectParam['custparam_msg']='Successfully generated '+fileName;
			nlapiSetRedirectURL('SUITELET', 'customscript_ax_sl_custom_quotepdf_gen', 'customdeploy_ax_sl_custom_quotepdf_gen', false, redirectParam);
			
		} else {
		
			//add group
			nsform.addFieldGroup('custpage_grpa', 'Configure Quote');
			
			//column A - General info
			var quoteNumFld = nsform.addField('custpage_quotenum', 'text', 'Quote #: ', null, 'custpage_grpa');
			quoteNumFld.setDefaultValue('<b>'+quoterec.getFieldValue('tranid')+'<b>');
			quoteNumFld.setDisplayType('inline');
			
			var quoteIdFld = nsform.addField('custparam_quoteid', 'text', '', null, 'custpage_grpa');
			quoteIdFld.setDefaultValue(quoteId);
			quoteIdFld.setDisplayType('hidden');
			
			var quoteDateFld = nsform.addField('custpage_quotedate','text','Quote Date: ', null, 'custpage_grpa');
			quoteDateFld.setDisplayType('inline');
			quoteDateFld.setDefaultValue('<b>'+quoterec.getFieldValue('trandate')+'</b>');
			
			var customerNameFld = nsform.addField('custpage_customername','text','Customer/Project: ', null, 'custpage_grpa');
			customerNameFld.setDefaultValue('<b>'+quoterec.getFieldText('entity')+'</b>');
			customerNameFld.setDisplayType('inline');
			
			//column B - Options
			var isFinalFld = nsform.addField('custpage_isfinal', 'checkbox', 'Is Final Version: ', null, 'custpage_grpa');
			isFinalFld.setBreakType('startcol');
			
			var versionFld = nsform.addField('custpage_version', 'text', 'Next Version (Revision): ', null, 'custpage_grpa');
			versionFld.setMandatory(true);
			versionFld.setDisplayType('disabled');
			versionFld.setDisplaySize(5);
			
			var versionRecIdFld = nsform.addField('custpage_versioinrecid', 'text','Version Record ID: ', null, 'custpage_grpa');
			versionRecIdFld.setDisplayType('hidden');
			
			var tacOptionFld = nsform.addField('custpage_tacoptioni', 'select', 'T&C Option: ', null, 'custpage_grpa');
			tacOptionFld.setMandatory(true);
			tacOptionFld.addSelectOption('', '', true);
			
			//lookup current version number and increment by one if it exists. if not, set it to 1
			var vflt = [new nlobjSearchFilter('custrecord_cqpdfv_trx', null, 'anyof', quoteId)];
			var vcol = [new nlobjSearchColumn('custrecord_cqpdfv_version')];
			var vrslt = nlapiSearchRecord('customrecord_customquote_version', null, vflt, vcol);
			if (!vrslt) {
				versionFld.setDefaultValue('1');
			} else {
				//increment by 1
				versionFld.setDefaultValue( (parseInt(vrslt[0].getValue('custrecord_cqpdfv_version')).toFixed(0)) );
				versionRecIdFld.setDefaultValue(vrslt[0].getId());
			}
			
			//Search for T&C Option Files
			var fileFilter = [new nlobjSearchFilter('folder', null, 'anyof', tacOptionFolderId)];
			var fileColumn = [new nlobjSearchColumn('name').setSort(),
			                  new nlobjSearchColumn('description')];
			var fileResult = nlapiSearchRecord('file', null, fileFilter, fileColumn);
			//loop through the list of T&C Option html files
			for (var f=0; fileResult && f < fileResult.length; f++) {
				tacOptionFld.addSelectOption(fileResult[f].getId(), fileResult[f].getValue('name'));
			}
			
			//column C - Help
			var helpDescFld = nsform.addField('custpage_helpdesc', 'textarea', '' , null, 'custpage_grpa');
			helpDescFld.setDisplayType('inline');
			helpDescFld.setBreakType('startcol');
			helpDescFld.setDefaultValue('<b>Is Final Version: </b>Check if PDF you are about to generate is Final Version<br/><br/>'+
										'<b>Version (Revision): </b>Auto incremented Version Number generated by the system each time new PDF is created<br/><br/>'+
										'<b>T&C Option: </b>Select which version of T&C you wish to merge with this Quote');
			
			
			//set customer folder ID if it exists
			var customerFolderIdFld = nsform.addField('custpage_customerfolderid','text','',null,'custpage_grpa');
			customerFolderIdFld.setDisplayType('hidden');
			
			//Search for existing Customer specific sub folder under parentFolderId
			var folderFilter = [new nlobjSearchFilter('name', null, 'contains', '['+quoterec.getFieldText('entity')+'] ('+quoterec.getFieldValue('entity')+')'),
			                    new nlobjSearchFilter('parent', null, 'anyof',parentFolderId),
			                    new nlobjSearchFilter('isinactive', null, 'is', 'F')];
			var folderColumn = [new nlobjSearchColumn('name')];
			var folderResult = nlapiSearchRecord('folder', null, folderFilter, folderColumn);
			
			//existing file result set
			var pdfFileResult = null;
			
			if (folderResult && folderResult.length > 0) {
				//set customer folder id
				customerFolderIdFld.setDefaultValue(folderResult[0].getId());
				
				//search for all files under this clients Service Order Forms folder
				var pdfFileFilter = [new nlobjSearchFilter('folder', null, 'anyof', folderResult[0].getId())];
				var pdfFileColumn = [new nlobjSearchColumn('name'),
				                     new nlobjSearchColumn('folder'),
				                     new nlobjSearchColumn('url'),
				                     new nlobjSearchColumn('created').setSort(true)];
				pdfFileResult = nlapiSearchRecord('file', null, pdfFileFilter, pdfFileColumn);
			}
			
			//sublist of generated Quote PDFs
			//show list of current file as sublist
			var fsl = nsform.addSubList('custpage_pdffiles','list','Generated Quote PDFs',null);
			fsl.addField('fsl_fileid','text','File ID');
			fsl.addField('fsl_filename','text','File Name');
			fsl.addField('fsl_foldername','text','Folder Name');
			fsl.addField('fsl_created','text','text Created');
			fsl.addField('fsl_viewfile','textarea','View File');
			fsl.setHelpText('List of previously generated Quote PDFs for '+quoterec.getFieldText('entity')+
							'<br/><b>Customer Folder Naming Convension:</b> '+
							'[{Customer Name}] ({Internal ID of customer})');
			var fline = 1;
			
			for (var f=0; pdfFileResult && f<pdfFileResult.length; f++) {
				var fileUrl = '<a href="https://system.netsuite.com'+pdfFileResult[f].getValue('url')+'" target="_blank">View File</a>';
				
				fsl.setLineItemValue('fsl_fileid', fline, pdfFileResult[f].getId());
				fsl.setLineItemValue('fsl_foldername', fline, pdfFileResult[f].getText('folder'));
				fsl.setLineItemValue('fsl_created', fline, pdfFileResult[f].getValue('created'));
				fsl.setLineItemValue('fsl_filename', fline, pdfFileResult[f].getValue('name'));
				fsl.setLineItemValue('fsl_viewfile', fline, fileUrl);
				
				fline++;
			}
		}
		
		//add message if available
		messagefld.setDefaultValue(msg);
		
	} catch (qteGenErr) {
		log('error','Generate Opp Configurator Error', getErrText(qteGenErr));
		messagefld.setDefaultValue('Error occured: '+getErrText(qteGenErr));
	}
	
	//add buttons
	nsform.addSubmitButton('Generate PDF');
	
	res.writePage(nsform);
}
