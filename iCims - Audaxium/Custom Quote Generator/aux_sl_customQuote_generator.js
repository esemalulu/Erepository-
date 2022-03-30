/**
 * Author: joe.son@audaxium.com
 * Date: 12/2/2012
 * Desc:
 * Suitelet that will allow iCims users to generate customized Quote in MS Word using Template.
 * 
 */
var ctx = nlapiGetContext();
var env = ctx.getEnvironment(); 

//internal ID of letter template from script parameter
var letterTemplateId = ctx.getSetting('SCRIPT','custscript_qte_word_template');
//internal iD of folder to store generated order form
var folderId = ctx.getSetting('SCRIPT','custscript_gen_quote_folderid');

//Internal ID of item that needs to display quantity next of "Full License"
var displayQtyItemId = ctx.getSetting('SCRIPT','custscript_displayqty_itemid');

var fileName='';

var objToday = new Date();
var strTodayDate = (objToday.getMonth()+1)+'_'+objToday.getDate()+'_'+objToday.getFullYear();

var nsform = nlapiCreateForm('Generate Package Order Form', true);
nsform.setScript('customscript_aux_cs_quote_gen_helper');

var msgDisplay = nsform.addField('custpage_msgdisplay','textarea','',null);
msgDisplay.setLayoutType('outsideabove');
msgDisplay.setDisplayType('inline');

function customQuoteGen(req, res) {
	if (!letterTemplateId || !folderId) {
		throw nlapiCreateError('MISSING_REQ_IDs', 'Missing Letter Template ID and/or Folder ID to use on Script Deployment', true);
	}
	
	var oppId = req.getParameter('custparam_oppid');
	var quoteId = req.getParameter('custparam_quoteid');
	if (!oppId || !quoteId) {
		throw nlapiCreateError('MISSING_OPP_QUOTE_IDs', 'Missing Opportunity and/or Quote ID', true);
	}
	
	//Display process message
	var procMsg = req.getParameter('custparam_msg');
	if (procMsg) {
		msgDisplay.setDefaultValue(procMsg);
	}
	//Load Records
	var oppRec = nlapiLoadRecord('opportunity', oppId);
	var quoteRec = nlapiLoadRecord('estimate', quoteId);
	
	if (req.getMethod() == 'POST') {
		var msg = '';
		try {
			//process user request
			fileName = 'PackageOrder_Estimate#'+quoteRec.getFieldValue('tranid')+'_'+strTodayDate+'.doc';
			
			var customer = nlapiLoadRecord('customer',oppRec.getFieldValue('entity'));
			
			var billingContact = new Object();
			var primaryContact = new Object();
			var flt = [new nlobjSearchFilter('company',null,'anyof',oppRec.getFieldValue('entity')), 
			           new nlobjSearchFilter('contactrole',null,'anyof',['-10','11'])]; //billing = 11, prime=-10
			var col = [new nlobjSearchColumn('firstname'), 
			           new nlobjSearchColumn('lastname'),
			           new nlobjSearchColumn('email'),
			           new nlobjSearchColumn('contactrole')];
			var rslt = nlapiSearchRecord('contact',null, flt, col);
			var hasBilling = false;
			for (var c=0; rslt && c < rslt.length; c++) {
				if (rslt[c].getValue('contactrole') == '11') {
					hasBilling = true;
					billingContact.name = rslt[c].getValue('firstname')+' '+rslt[c].getValue('lastname');
					billingContact.email = rslt[c].getValue('email');
				} 
				
				if (rslt[c].getValue('contactrole') == '-10') {
					primaryContact.name = rslt[c].getValue('firstname')+' '+rslt[c].getValue('lastname');
					primaryContact.email = rslt[c].getValue('email');
				}
			}
			
			if (!hasBilling) {
				billingContact = primaryContact;
			}
			
			
			var itemQty = ' ';
			if (quoteRec.findLineItemValue('item','item', displayQtyItemId) > -1) {
				var itmLine = quoteRec.findLineItemValue('item','item', displayQtyItemId);
				itemQty = quoteRec.getLineItemValue('item','quantity',itmLine)+' ';
			}
			
			var formattedAddress = '';
			if (customer.getFieldValue('defaultaddress')) {
				//make sure billing address exists
				formattedAddress += (customer.getFieldValue('billaddr1')?customer.getFieldValue('billaddr1')+' ':'')+
									(customer.getFieldValue('billaddr2')?customer.getFieldValue('billaddr2')+' ':'')+
									(customer.getFieldValue('billcity')?customer.getFieldValue('billcity')+' ':'')+
									(customer.getFieldValue('billstate')?customer.getFieldValue('billstate')+', ':'')+
									(customer.getFieldValue('billzip')?customer.getFieldValue('billzip'):'');
			}
			
			//Customize Field Replacements
			var customizeParam = new Array();
			customizeParam['NLDATEMOSTRECENTSIG'] = req.getParameter('custpage_effdate');
			customizeParam['NLSUBSDATE'] = req.getParameter('custpage_subsstartdate');
			customizeParam['NLADOPPKG1'] = req.getParameter('custpage_adppkg');
			customizeParam['NLFULLACCESSQTY'] = itemQty;
			customizeParam['NLPRIMECONTACTNM'] = (primaryContact.name)?primaryContact.name:'N/A';
			customizeParam['NLPRIMECONTACTEM'] = (primaryContact.email)?primaryContact.email:'N/A';
			customizeParam['NLBILLINGCTNM'] = (billingContact.name)?billingContact.name:'N/A';
			customizeParam['NLBILLINGCTEM'] = (billingContact.email)?billingContact.email:'N/A';
			customizeParam['NLCUSTTAXNUM'] = (req.getParameter('custpage_taxnum'))?req.getParameter('custpage_taxnum'):'N/A';
			customizeParam['NLCONTREXPTEXT'] = req.getParameter('custpage_termexpdatetext');
			customizeParam['NLPROJALTSALESAMT'] = oppRec.getFieldValue('projaltsalesamt');
			customizeParam['NLURL'] = customer.getFieldValue('url')?customer.getFieldValue('url'):'N/A';
			customizeParam['NLPHONE'] = customer.getFieldValue('phone')?customer.getFieldValue('phone'):'N/A';
			customizeParam['NLCUSTOMERBILLADR'] = formattedAddress;
			customizeParam['NLFAX'] = customer.getFieldValue('fax')?customer.getFieldValue('fax'):'N/A';
			customizeParam['NLCOMPANY'] = customer.getFieldValue('companyname');
			
			nlapiLogExecution('debug','addr',customer.getFieldValue('defaultaddress'));
			
			var pkgOrderForm = nlapiMergeRecord(letterTemplateId, 'opportunity', oppId, null, null, customizeParam);
			
			//Search for existing customer specific sub folder under parent "folderId"
			var folderFilter = [new nlobjSearchFilter('name', null, 'contains', '['+customer.getId()+']'),
			                    new nlobjSearchFilter('parent', null, 'anyof',folderId),
			                    new nlobjSearchFilter('isinactive', null, 'is', 'F')];
			var folderColumn = [new nlobjSearchColumn('name')];
			var folderResult = nlapiSearchRecord('folder', null, folderFilter, folderColumn);
			
			var customerFolderId = '';
			if (folderResult && folderResult.length > 0) {
				customerFolderId = folderResult[0].getId();
			} else {
				//create new with following format
				//Customer Name [internalid]
				var folderRec = nlapiCreateRecord('folder');
				folderRec.setFieldValue('parent',folderId);
				folderRec.setFieldValue('name',customer.getFieldValue('companyname')+' ['+customer.getId()+']');
				customerFolderId = nlapiSubmitRecord(folderRec, true, true);
			}
			 
			pkgOrderForm.setFolder(customerFolderId);
			pkgOrderForm.setName(fileName);
			var orderFileId = nlapiSubmitFile(pkgOrderForm);
			
			//attach it to estimate
			nlapiAttachRecord('file',orderFileId,'estimate',quoteId);
			
			msg = 'Package Order Form ('+fileName+') for Estimate#'+quoteRec.getFieldValue('tranid')+' successfully generated and attached to estimate';
		} catch (procError) {
			msg = 'Error occured during Package Order Form generation: '+getErrText(procError);
			nlapiLogExecution('error','Error processing package order form',getErrText(procError));
		}
		
		var redirectParam = new Array();
		redirectParam['custparam_oppid']=oppId;
		redirectParam['custparam_quoteid']=quoteId;
		redirectParam['custparam_msg'] = msg;
		nlapiSetRedirectURL('SUITELET', 'customscript_aux_sl_customized_quote_gen', 
							'customdeploy_aux_sl_customized_quote_gen', false, redirectParam);
	} else {
		//Display UI
		nsform.addSubmitButton('Process Order Form');
		//Add Cancel or Close button
		nsform.addButton('custpage_closewindow','Cancel/Close','closeWindow()');
		
		var oppIdParam = nsform.addField('custparam_oppid','text');
		oppIdParam.setDefaultValue(oppId);
		oppIdParam.setDisplayType('hidden');
		
		var quoteIdParam = nsform.addField('custparam_quoteid','text');
		quoteIdParam.setDefaultValue(quoteId);
		quoteIdParam.setDisplayType('hidden');
		
		//intro
		var orderIntro = nsform.addField('custpage__intro', 'inlinehtml');
		var introHtml = '<h1>Generate Package Order Form using Estimate #'+quoteRec.getFieldValue('tranid')+
						' and Opportunity #'+oppRec.getFieldValue('tranid')+' ('+oppRec.getFieldValue('title')+') for '+
						'<i>'+oppRec.getFieldText('entity')+'</i></h1>';
		orderIntro.setDefaultValue(introHtml);
		orderIntro.setLayoutType('outsideabove');
		
		//Add Package Form Customization Group
		nsform.addFieldGroup('custpage_groupa','Customize Package Order Form');
		//Add Effective Date
		/**
		 * Mod Request 1/3/2013 - No calculation. Simply display text
		 */
		//var effDate = nsform.addField('custpage_effdate','date','Effective Date: ', null, 'custpage_groupa');
		//effDate.setMandatory(true);
		//effDate.setDisplayType('hidden');
		var effDate = nsform.addField('custpage_effdate','text','Effective Date: ', null, 'custpage_groupa');
		effDate.setDefaultValue('Date of most recent signature');
		effDate.setDisplayType('inline');

		//Add List of Days 
		var daysFromEffDate = nsform.addField('custpage_daysfromlist','select','Days from Effective Date: ', null, 'custpage_groupa');
		daysFromEffDate.setMandatory(true);
		daysFromEffDate.addSelectOption('', '', true);
		daysFromEffDate.addSelectOption('30', '30 Days');
		daysFromEffDate.addSelectOption('60', '60 Days');
		daysFromEffDate.addSelectOption('90', '90 Days');
		
		//Subs Start Date
		/**
		 * Mod Request 1/3/2013 - No calculation. Simply display text based on Days from effective date selection
		 */
		//var subsStartDate = nsform.addField('custpage_subsstartdate','date','Subscription Start Date: ', null, 'custpage_groupa');
		var subsStartDate = nsform.addField('custpage_subsstartdate','text','Subscription Start Date: ', null, 'custpage_groupa');
		subsStartDate.setDisplayType('inline');
		
		//Adoption Package selection
		var adpPkg = nsform.addField('custpage_adppkg','select','Adoption Package: ',null, 'custpage_groupa');
		adpPkg.setMandatory(true);
		adpPkg.addSelectOption('', '', true);
		adpPkg.addSelectOption('Package 1', 'Package 1');
		adpPkg.addSelectOption('Package 2', 'Package 2');
		adpPkg.addSelectOption('Package 3', 'Package 3');
		adpPkg.addSelectOption('Package Custom', 'Package Custom');
		
		//Customer Tax Number
		var taxNum = nsform.addField('custpage_taxnum','text','Tax Number: ', null, 'custpage_groupa');
		
		//add inline only contract terms
		var today = new Date();
		var strToday = (today.getMonth()+1)+'/'+today.getDate()+'/'+today.getFullYear();
		//contractTerm is 30 days from Today
		var contractTermDate = nlapiAddDays(today, 30);
		var strContractExpDate = (contractTermDate.getMonth()+1)+'/'+contractTermDate.getDate()+'/'+contractTermDate.getFullYear();
		
		var contractExpIntro = nsform.addField('custpage_contractintro','inlinehtml','',null,'custpage_groupa');
		contractExpIntro.setBreakType('startcol');
		contractExpIntro.setDefaultValue('<b><i>Contract Expiration Date is Calculated <br/>based on Today\'s Date ('+strToday+') + 30 days</i></b>');
		
		var contractTerm = nsform.addField('custpage_termexpdatetext','text','Contract Term Expiration Date Text: ',null,'custpage_groupa');
		contractTerm.setDisplayType('inline');
		contractTerm.setDefaultValue('Prices are good through '+strContractExpDate);

		var contractExpModIntro = nsform.addField('custpage_contractmodintro','inlinehtml','',null,'custpage_groupa');
		contractExpModIntro.setDefaultValue('<br/><b><i>If above expiration date needs to be modified,<br/> use below date field to change the date</i></b>');
		
		//contract exp date mod
		var contractTermMod = nsform.addField('custpage_termexpdatemod','date','Change Contract Term Expiration Date: ', null, 'custpage_groupa');
		contractTermMod.setDefaultValue(strContractExpDate);
		contractTermMod.setDisplaySize(10);
		
	}
	
	res.writePage(nsform);
	
}

/**
 * Translates Error into standarized text.
 * @param {Object} _e
 */
function getErrText(_e) {
	var txt='';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: '+_e.getCode()+' :: '+_e.getDetails();
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: '+_e.toString();
		txt = strGlobalReplace(txt.toString(), "\r", " :: ");
		txt = strGlobalReplace(txt,"\n", " :: ");
	}
	return txt;
}

/**
 * Helper function to GLOBALLY search and replace char or word with provided char or word
 * @param _fullString - Original String Value
 * @param _searchChar - Char or Word to search for
 * @param _replaceChar - Char or Word to replace with.
 * @returns
 */
function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}
