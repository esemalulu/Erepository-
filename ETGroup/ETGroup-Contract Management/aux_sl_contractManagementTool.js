/**
 * Authoer: js@Audaxium
 * Suitelet that allows users to manage contracts from Sales Order.
 * Users will be able to add on to existing contract or create new.
 */

function manageContract(req, res){
	var trxid = req.getParameter('custparam_trxid');
	var trxtype = req.getParameter('custparam_trxtype');
	var reqProcMsg = req.getParameter('custparam_procmsg');
	var contractId = req.getParameter('custpage_contractoption');
	var arSites = req.getParameterValues('custpage_sites');
	//1=emtpy
	//2=SHOWITEM
	//3=PROCESS
	var step = req.getParameter('custpage_step');
	var isComplete = req.getParameter('custparam_complete');
	var redirectContractId = req.getParameter('custparam_redirectcontractid');
	var trxrec = null;
	
	var nsform = nlapiCreateForm('Contract Manager', true);
	//set script
	nsform.setScript('customscript_ax_cs_contractmgmt_helper');
	
	var procmsg = nsform.addField('custpage_procmsg', 'textarea', '', null, null);
	procmsg.setLayoutType('outsideabove');
	procmsg.setDisplayType('inline');
	
	//hidden parameter values
	var hiddenTrxIdFld = nsform.addField('custparam_trxid','text','',null,null);
	hiddenTrxIdFld.setDisplayType('hidden');
	hiddenTrxIdFld.setDefaultValue(trxid);
	
	var hiddenTrxTypeFld = nsform.addField('custparam_trxtype','text','',null,null);
	hiddenTrxTypeFld.setDisplayType('hidden');
	hiddenTrxTypeFld.setDefaultValue(trxtype);
	
	try {
		//load transaction record into memory
		trxrec = nlapiLoadRecord(trxtype, trxid);
		
		if (req.getMethod()=='POST' && step == 'PROCESS') {
			
			//-1 means create new
			var customerId = trxrec.getFieldValue('entity');
			var trxId = trxrec.getId();
			var trxType = trxrec.getRecordType();
			var itemJson = {};
			var totalContractItemCount = 0;
			//loop through list of selected items and populate Json Object
			for (var i=1; i <= req.getLineItemCount('custpage_trxitemsublist'); i++) {
				var checked = req.getLineItemValue('custpage_trxitemsublist','tis_selectitem',i);
				if (checked == 'T') {
					var selItemId = req.getLineItemValue('custpage_trxitemsublist','tis_itemid',i);
					var selItemQty = req.getLineItemValue('custpage_trxitemsublist','tis_itemqty',i);
					var selItemRoom = req.getLineItemValue('custpage_trxitemsublist','tis_roomid',i);
					var selItemSerial = req.getLineItemValue('custpage_trxitemsublist','tis_itemserial',i);
					
					totalContractItemCount += parseInt(selItemQty);
					
					if (!itemJson[i+'_'+selItemId]) {
						itemJson[i+'_'+selItemId]={};
					}
					itemJson[i+'_'+selItemId]['itemid'] = selItemId;
					itemJson[i+'_'+selItemId]['itemqty'] = selItemQty;
					itemJson[i+'_'+selItemId]['itemroom'] = selItemRoom;
					itemJson[i+'_'+selItemId]['itemserial'] = selItemSerial;
				}
			}
			
			//1.create new or Load contract record
			var contractRec = null;
			if (contractId=='-1') {
				contractRec = nlapiCreateRecord('customrecord_acm_contractheader', null);
				contractRec.setFieldValue('name','Temp Contract#xxx '+customerId);
				contractRec.setFieldValue('custrecord_acmch_customer', customerId);
				contractRec.setFieldValue('custrecord_acmch_transaction', trxId);
				contractRec.setFieldValue('custrecord_acmch_sites', arSites);
			} else {
				contractRec = nlapiLoadRecord('customrecord_acm_contractheader', contractId, null);
				var contractSites = contractRec.getFieldValues('custrecord_acmch_sites');
				var jsArrayContractSites = new Array();
				if (contractSites) {
					for (var cs=0; cs < contractSites.length; cs++) {
						jsArrayContractSites.push(contractSites[cs]);
					}
				}
				var contractTrx = contractRec.getFieldValues('custrecord_acmch_transaction');
				var jsArrayContractTrx = new Array();
				if (contractTrx) {
					for (var ct=0; ct < contractTrx.length; ct++) {
						jsArrayContractTrx.push(contractTrx[ct]);
					}
				}
				//loop through arSites and add missing site(s)
				for (var y=0; y < arSites.length; y++) {
					log('debug','arSites',arSites[y]);
					if (!jsArrayContractSites.contains(arSites[y])) {
						jsArrayContractSites.push(arSites[y]);
					}
				}
				
				//add to contractTrx if this SO doesn't exist
				if (!jsArrayContractTrx.contains(trxId)) {
					jsArrayContractTrx.push(trxId);
				}
				
				contractRec.setFieldValues('custrecord_acmch_transaction', jsArrayContractTrx);
				contractRec.setFieldValues('custrecord_acmch_sites', jsArrayContractSites);
				
			}
			
			//reset contract id 
			contractId = nlapiSubmitRecord(contractRec, true, true);
			
			//2. Create contract item records
			for (var ci in itemJson) {
				var contractItem = nlapiCreateRecord('customrecord_acm_contractitem');
				contractItem.setFieldValue('custrecord_contractitem', itemJson[ci].itemid);
				contractItem.setFieldValue('custrecord_itemcontractid', contractId);
				contractItem.setFieldValue('custrecord_acmci_salesorders', trxId);
				contractItem.setFieldValue('custrecord_acmci_locatedroom', itemJson[ci].itemroom);
				contractItem.setFieldValue('custrecord_acmci_serialnumber', itemJson[ci].itemserial);
				//Mod Request 4/27/2013 - Set Item status to Active
				contractItem.setFieldValue('custrecord_acmci_item_status',1);
				nlapiSubmitRecord(contractItem, true, true);
			}
			
			//redirect to SL
			//redirect to Suitelet entry page
			var redirectParam = new Array();
			redirectParam['custparam_trxid']=trxid;
			redirectParam['custparam_trxtype']=trxtype;
			redirectParam['custparam_complete']='T';
			redirectParam['custparam_redirectcontractid'] = contractId;
			redirectParam['custparam_procmsg']='Successfully Processed Contract for this Transaction';
			nlapiSetRedirectURL('SUITELET', 'customscript_ax_sl_contractmgmttool', 'customdeploy_ax_sl_contractmgmttool', false, redirectParam);
			
		} else {
			//--------------------------------------- DISPLAY FORM ---------------------------------------------------
			var hiddenStep = nsform.addField('custpage_step','text','',null,null);
			var nextStep = '';
			var submitText = 'Select Contract Option and Site(s)';
			if (!step) {
				nextStep = 'SHOWITEM';
			} else if (step=='SHOWITEM') {
				nextStep = 'PROCESS';
				submitText = 'Process Contract';
			}
			
			//process is complete. set NextStep to COMPLETE
			if (isComplete == 'T') {
				nextStep = 'COMPLETE';
			}
			
			//show submit button
			nsform.addSubmitButton(submitText);
			hiddenStep.setDefaultValue(nextStep);
			hiddenStep.setDisplayType('hidden');
			
			//redirect contract id
			var redirectContractidFld = nsform.addField('custpage_redirectcontractid','text','');
			redirectContractidFld.setDisplayType('hidden');
			redirectContractidFld.setDefaultValue(redirectContractId);
			
			//loading image uploaded to Document > Images folder
			var processDiv = nsform.addField('custpage_inprocessdiv','textarea','');
			processDiv.setDisplayType('inline');
			processDiv.setDefaultValue('<div id="PleaseHold" style="display:none">'+
									   '<img src="https://system.netsuite.com/core/media/media.nl?id=70903&c=848962&h=a9423b057740cd062940" align="absmiddle"/>&nbsp; '+
									   'Please wait while system processes your contract.<br/><br/>'+
									   'When Contract Process is Complete, this window will close and you will be redirect to Contract Record</div>');
			
			//Group A - Contract information
			nsform.addFieldGroup('custpage_groupa', 'Transaction/Contract Information', null);
			
			//Column A 
			var customerFld = nsform.addField('custpage_customer', 'text', 'Customer: ', null, 'custpage_groupa');
			customerFld.setDefaultValue(trxrec.getFieldText('entity'));
			customerFld.setDisplayType('inline');
			customerFld.setBreakType('startcol');
			
			var trxDisplayFld = nsform.addField('custpage_trxdisplay','text', trxTypeValue[trxtype]+'#: ', null,'custpage_groupa');
			trxDisplayFld.setDefaultValue(trxrec.getFieldValue('tranid')+' (InternalID: '+trxid+')');
			trxDisplayFld.setDisplayType('inline');
			
			/**
			 * Option for User to create new contract or add to existing
			 */
			
			//search for contracts with matching customer
			var contractFlt = [new nlobjSearchFilter('custrecord_acmch_customer', null, 'anyof', trxrec.getFieldValue('entity'))];
			var contractCol = [new nlobjSearchColumn('name'),
			                   new nlobjSearchColumn('custrecord_acmch_transaction'),
			                   new nlobjSearchColumn('custrecord_acmch_sites')];
			var contractRslt = nlapiSearchRecord('customrecord_acm_contractheader', null, contractFlt, contractCol);
			
			var contractOptionFld = nsform.addField('custpage_contractoption','select','New or Add To Contract: ', null,'custpage_groupa');
			contractOptionFld.setMandatory(true);
			contractOptionFld.addSelectOption('','', true);
			contractOptionFld.addSelectOption('-1','Create New Contract', false);
			for (var c=0; contractRslt && c < contractRslt.length; c++) {
				contractOptionFld.addSelectOption(contractRslt[c].getId(), 
												  contractRslt[c].getValue('name')+' - ('+
												  (contractRslt[c].getText('custrecord_acmch_status')?contractRslt[c].getText('custrecord_acmch_status'):'')+')', false);
			}
			contractOptionFld.setDefaultValue(contractId);
			
			//MOD Only display sites that belong to THIS Customer
			var siteFlt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			               new nlobjSearchFilter('custrecord_customerowner', null, 'anyof', trxrec.getFieldValue('entity'))];
			var siteCol = [new nlobjSearchColumn('name'),
			               new nlobjSearchColumn('custrecord_acms_site_stateprov')];
			var siteRslt = nlapiSearchRecord('customrecord_acm_site_ref', null, siteFlt, siteCol);
			
			var sitesFld = nsform.addField('custpage_sites','multiselect','Contract Sites: ', null, 'custpage_groupa');
			sitesFld.setBreakType('startcol');
			sitesFld.addSelectOption('', '', false);
			sitesFld.setMandatory(true);
			for (var s=0; siteRslt && s < siteRslt.length; s++) {
				log('debug','sites',siteRslt.length);
				var selected = false;
				if (arSites && arSites.contains(siteRslt[s].getId())) {
					selected = true;
				}
				sitesFld.addSelectOption(siteRslt[s].getId(), siteRslt[s].getValue('name')+' ('+siteRslt[s].getValue('custrecord_acms_site_stateprov')+')',selected);
			}
			
			var sitesHelp = nsform.addField('custpage_siteshelp','inlinehtml','Sites Note: ', null, 'custpage_groupa');
			sitesHelp.setDefaultValue('<i>Only display Sites assigned to Customer.</i>');
			
			if (step=='SHOWITEM') {
				//display additional Contract Information
				if (contractId !='-1') {
					var contractRec = nlapiLoadRecord('customrecord_acm_contractheader', contractId);
					var cstatus = nsform.addField('custpage_cstatus', 'text', 'Contract Status: ', null, 'custpage_groupa');
					cstatus.setDisplayType('inline');
					cstatus.setDefaultValue(contractRec.getFieldText('custrecord_acmch_status')?contractRec.getFieldText('custrecord_acmch_status'):'N/A');
					cstatus.setBreakType('startcol');
					
					var clevel = nsform.addField('custpage_clevel', 'text', 'Contract Level: ', null, 'custpage_groupa');
					clevel.setDisplayType('inline');
					clevel.setDefaultValue(contractRec.getFieldText('custrecord_acmch_contractlevel')?contractRec.getFieldText('custrecord_acmch_contractlevel'):'N/A');
					
					var cstartenddate = nsform.addField('custpage_cstartend','text','Contract Dates: ', null, 'custpage_groupa');
					cstartenddate.setDisplayType('inline');
					var sd = contractRec.getFieldValue('custrecord_acmch_startdate')?contractRec.getFieldValue('custrecord_acmch_startdate'):'N/A';
					var ed = contractRec.getFieldValue('custrecord_acmch_enddate')?contractRec.getFieldValue('custrecord_acmch_enddate'):'N/A';
					var setext='Start: '+sd+' - End: '+ed;
					cstartenddate.setDefaultValue(setext);
					
					//custrecord_acmch_prime_contact
					var ccontact = nsform.addField('custpage_ccontact', 'text', 'Primary Contact: ', null, 'custpage_groupa');
					ccontact.setDisplayType('inline');
					ccontact.setDefaultValue(contractRec.getFieldText('custrecord_acmch_prime_contact')?contractRec.getFieldText('custrecord_acmch_prime_contact'):'N/A');
				}
				
				//disable contract option, sites list and add back to contract info button
				contractOptionFld.setDisplayType('disabled');
				sitesFld.setDisplayType('disabled');
				nsform.addButton('custpage_btnstartover', 'Back to Contract Info', 'backToContractInfo()');
				
				//Group B - Item
				nsform.addFieldGroup('custpage_groupb', 'Contract Items', null);
				
				//var show warning on Maximum # of items this SL can process
				var notice = nsform.addField('custpage_notice', 'inlinehtml', '', null, 'custpage_groupb');
				notice.setBreakType('startcol');
				notice.setDefaultValue('<h1 style="color:red">Maximum number of items to add CAN NOT exceed <u>55</u>.</h1>');
				
				var totalqty = nsform.addField('custpage_totalqty','integer','Total Item Quantity: ',null,'custpage_groupb');
				totalqty.setDisplayType('inline');
				totalqty.setDefaultValue(0);
				totalqty.setBreakType('startcol');
				
				//hidden field that holds items that are already in selected contract
				var itemsInContract = nsform.addField('custpage_itemsincontract','longtext','',null,'custpage_groupb');
				itemsInContract.setDisplayType('hidden');
				
				//search for existing items for THIS contract and THIS Sales Order
				if (contractId !='-1') {
					var citemflt = [new nlobjSearchFilter('custrecord_acmci_salesorders', null,'anyof',trxid),
					                new nlobjSearchFilter('custrecord_itemcontractid', null,'anyof',contractId)];
					var citemcol = [new nlobjSearchColumn('custrecord_contractitem'),
					                new nlobjSearchColumn('custrecord_acmci_serialnumber')];
					var citemrslt = nlapiSearchRecord('customrecord_acm_contractitem', null, citemflt, citemcol);
					if (citemrslt && citemrslt.length > 0) {
						var jsonItemsInContract = {};
						for (var k=0; k < citemrslt.length; k++) {
							if (!jsonItemsInContract[citemrslt[k].getValue('custrecord_contractitem')]) {
								jsonItemsInContract[citemrslt[k].getValue('custrecord_contractitem')]=new Array();
							}
							jsonItemsInContract[citemrslt[k].getValue('custrecord_contractitem')].push(citemrslt[k].getValue('custrecord_acmci_serialnumber'));
						}
						itemsInContract.setDefaultValue(JSON.stringify(jsonItemsInContract));
					}
				}
				
				//Show Current List of Inventory and Non-Inventory items from current transaction
				var trxItemSublist = nsform.addSubList('custpage_trxitemsublist', 'list', 'Items to Add', null);
				trxItemSublist.setHelpText('&nbsp; Items that are already in contract with matching serial/lot number will show checked. Those already in contract will be ignored.');
				trxItemSublist.addMarkAllButtons();
				//select item checkbox
				trxItemSublist.addField('tis_selectitem', 'checkbox', 'Add to Contract', null);
				
				//don't process flag
				var ignoreProcessFld = trxItemSublist.addField('tis_ignore','checkbox','Already Added',null);
				ignoreProcessFld.setDisplayType('hidden');
				
				//item name
				trxItemSublist.addField('tis_itemname','text','Item Name', null);
				//hidden item id
				var hiddenItemId = trxItemSublist.addField('tis_itemid','text','Item ID', null);
				hiddenItemId.setDisplayType('hidden');
				
				var roomFld = trxItemSublist.addField('tis_roomid', 'select', 'Room Selection', null);
				//build appropriate options
				
				var roomFlt = [new nlobjSearchFilter('custrecord_acmr_site', null, 'anyof', arSites),
			                   new nlobjSearchFilter('isinactive', null, 'is','F')];
			    var roomCol = [new nlobjSearchColumn('custrecord_acmr_site').setSort(),
			                   new nlobjSearchColumn('name')];
			    
			    var roomRslt = nlapiSearchRecord('customrecord_acm_room_ref', null, roomFlt, roomCol);
			    
			    roomFld.addSelectOption('','- Select Room for this item -',true);
			    for (var i=0; roomRslt && i < roomRslt.length; i++) {
			    	log('debug','size',roomRslt.length);
			    	var roomText = roomRslt[i].getText('custrecord_acmr_site')+' : '+roomRslt[i].getValue('name');
			    	if (i==0) {
			    		//MOD Request 4/26/2013 - Set Default Room
			    		roomFld.addSelectOption(roomRslt[i].getId(), roomText, true);
			    	} else {
			    		roomFld.addSelectOption(roomRslt[i].getId(), roomText, false);
			    	}
			    	
			    }
				
			    //Serial/Lot Numbers
			    var serialNumFld = trxItemSublist.addField('tis_itemserial','text','Serial/Lot Number', null);
				serialNumFld.setDisplayType('inline');
			    
				//item type
				trxItemSublist.addField('tis_itemtype', 'text', 'Type', null);
				//item desc
				trxItemSublist.addField('tis_itemdesc','text','Description', null);
				//item qty
				trxItemSublist.addField('tis_itemqty','text','Qty', null);
				//item rate
				trxItemSublist.addField('tis_itemrate','currency','Rate', null).setDisplayType('inline');
				//item amount
				trxItemSublist.addField('tis_itemamount','currency','Amount',null).setDisplayType('inline');
				
				log('debug','trx line item count', trxrec.getLineItemCount('item'));
				if (trxrec.getLineItemCount('item') > 0) {
					var arItemIds = new Array();
					//array of inv and non-inv items
					var inItemMap = {};
					
					
					//loop through list of items on trx and identify inv. and non-inv items
					for (var i=1; i <= trxrec.getLineItemCount('item'); i++) {
						var itemId = trxrec.getLineItemValue('item', 'item', i);
						if (!arItemIds.contains(itemId)) {
							arItemIds.push(itemId);
						}
					}
					
					//if aritemIds are not empty search for those items that are ONLY inv and non inventory
					if (arItemIds.length > 0) {
						//search for fulfilled Inv and nonInv items from THIS Sales Order
						var frflt = [new nlobjSearchFilter('createdfrom', null, 'anyof',trxrec.getId()),
						            new nlobjSearchFilter('mainline', null, 'is','F'),
						            new nlobjSearchFilter('type', 'item', 'anyof', ['InvtPart','NonInvtPart'])];
						var frcol = [new nlobjSearchColumn('item'),
						            new nlobjSearchColumn('quantity'),
						            new nlobjSearchColumn('serialnumber'),
						            new nlobjSearchColumn('type','item')];
						var frslt = nlapiSearchRecord('itemfulfillment', null, frflt, frcol);
						//build fulfilled item json
						var fulfilledItemMap = {};
						for (var fi=0; frslt && fi < frslt.length; fi++) {
							if (!fulfilledItemMap[frslt[fi].getValue('item')]) {
								fulfilledItemMap[frslt[fi].getValue('item')] = {};
								fulfilledItemMap[frslt[fi].getValue('item')]['serial'] = new Array();
								fulfilledItemMap[frslt[fi].getValue('item')]['qty'] = 0;
							}
							fulfilledItemMap[frslt[fi].getValue('item')]['serial'].push(frslt[fi].getValue('serialnumber'));
							fulfilledItemMap[frslt[fi].getValue('item')]['qty'] = frslt[fi].getValue('quantity');
						}
						
						//search for returned (return authorization) Inv and nonInv items for THIS Sales Order
						var rrslt = nlapiSearchRecord('returnauthorization', null, frflt, frcol);
						//build returned item json
						var returnedItemMap = {};
						for (var ri=0; rrslt && ri < rrslt.length; ri++) {
							if (!returnedItemMap[rrslt[ri].getValue('item')]) {
								returnedItemMap[rrslt[ri].getValue('item')] = {};
								returnedItemMap[rrslt[ri].getValue('item')]['serial'] = new Array();
								returnedItemMap[rrslt[ri].getValue('item')]['qty'] = 0;
							}
							returnedItemMap[rrslt[ri].getValue('item')]['serial'].push(rrslt[ri].getValue('serialnumber'));
							returnedItemMap[rrslt[ri].getValue('item')]['qty'] = rrslt[ri].getValue('quantity');
						}
						
						//bring out all items with their serial numbers from THIS transaction
						var soflt = [new nlobjSearchFilter('internalid', null, 'anyof',trxrec.getId()),
							         new nlobjSearchFilter('mainline', null, 'is','F'),
							         new nlobjSearchFilter('type', 'item', 'anyof', ['InvtPart','NonInvtPart'])];
						var invNonInvItemRslt = nlapiSearchRecord(trxtype, null, soflt, frcol);
						for (var j=0; invNonInvItemRslt && j < invNonInvItemRslt.length; j++) {
							
							if (!inItemMap[invNonInvItemRslt[j].getValue('item')]) {
								inItemMap[invNonInvItemRslt[j].getValue('item')] = {};
								inItemMap[invNonInvItemRslt[j].getValue('item')]['type']=invNonInvItemRslt[j].getText('type','item');
								inItemMap[invNonInvItemRslt[j].getValue('item')]['serial']=new Array();
							}
							if (invNonInvItemRslt[j].getValue('serialnumber')) {
								inItemMap[invNonInvItemRslt[j].getValue('item')]['serial'].push(invNonInvItemRslt[j].getValue('serialnumber'));
							}
							
						}
					}
					
					
					
					//Loop through item list again
					var slline=1;
					for (var i=1; i <= trxrec.getLineItemCount('item'); i++) {
						var itemId = trxrec.getLineItemValue('item', 'item', i);
						if (inItemMap[itemId]) {
							
							//each qty needs to be broken out into ones since each can belong to different rooms
							var itemCountOnSo = parseInt(trxrec.getLineItemValue('item','quantity',i)).toFixed(0);
							var itemCountFulfilled = 0;
							if (fulfilledItemMap[itemId]) {
								itemCountFulfilled = parseInt(fulfilledItemMap[itemId]['qty']).toFixed(0);
								//turn to positive number
								if (itemCountFulfilled < 0) {
									itemCountFulfilled = itemCountFulfilled * -1;
								}
							}
							var itemCountReturned = 0;
							if (returnedItemMap[itemId]) {
								itemCountReturned = parseInt(returnedItemMap[itemId]['qty']).toFixed(0);
								if (itemCountReturned < 0) {
									itemCountReturned = itemCountReturned * -1;
								}
							}
							var itemCount = 0;
							//if fulfilled - SO qty is 0, all is fulfilled
							if ( (itemCountFulfilled - itemCountOnSo) == 0) {
								itemCount = itemCountFulfilled;
							} else {
								//set it to ONLY fulfilled
								itemCount = itemCountFulfilled - itemCountOnSo;
							}
							//from fulfilled item count, remove returned count
							itemCount = itemCountFulfilled - itemCountReturned;
							
							log('debug','line '+i, 'Item: '+itemId+' ('+trxrec.getLineItemText('item', 'item', i)+') // Qty on SO: '+itemCountOnSo+' // Qty Fulfilled: '+itemCountFulfilled+' // Qty Returned: '+itemCountReturned+' // True Item Count: '+itemCount);
							
							//At this point, if itemCount is 0, that means all items on the SO has been returned
							//go through itemCountOnSo and run validation to add to the list
							for (var b=0; b < itemCountOnSo; b++) {
								//as long as final item Count (Fulfilled - returned) is not 0, include it
								if (itemCount > 0) {
									log('debug','so item serial',inItemMap[itemId]['serial']);
									if (inItemMap[itemId]['serial'].length > 0) {
										//as long as Serial Number in question IS fulfilled but NOT returned, display it
										var serialNumberCheck = inItemMap[itemId]['serial'][b];
										log('debug','serial check', serialNumberCheck);
										if (fulfilledItemMap[itemId] && fulfilledItemMap[itemId]['serial'].contains(serialNumberCheck) &&
											(!returnedItemMap[itemId] || (returnedItemMap[itemId] && !returnedItemMap[itemId]['serial'].contains(serialNumberCheck)))) {
											
											trxItemSublist.setLineItemValue('tis_itemname', slline, trxrec.getLineItemText('item','item',i)+' ('+trxrec.getLineItemValue('item','quantity',i)+')');
											trxItemSublist.setLineItemValue('tis_itemid', slline, trxrec.getLineItemValue('item','item',i));
											trxItemSublist.setLineItemValue('tis_itemserial', slline, serialNumberCheck);
											trxItemSublist.setLineItemValue('tis_itemtype', slline, inItemMap[itemId]['type']);
											trxItemSublist.setLineItemValue('tis_itemdesc', slline, trxrec.getLineItemValue('item','description',i));
											trxItemSublist.setLineItemValue('tis_itemqty', slline, parseInt('1').toFixed(0));
											trxItemSublist.setLineItemValue('tis_itemrate', slline, trxrec.getLineItemValue('item','rate',i));
											trxItemSublist.setLineItemValue('tis_itemamount', slline, trxrec.getLineItemValue('item','amount',i));
											slline++;
										}
									} else {
										trxItemSublist.setLineItemValue('tis_itemname', slline, trxrec.getLineItemText('item','item',i)+' ('+trxrec.getLineItemValue('item','quantity',i)+')');
										trxItemSublist.setLineItemValue('tis_itemid', slline, trxrec.getLineItemValue('item','item',i));
										trxItemSublist.setLineItemValue('tis_itemserial', slline, '');
										trxItemSublist.setLineItemValue('tis_itemtype', slline, inItemMap[itemId]['type']);
										trxItemSublist.setLineItemValue('tis_itemdesc', slline, trxrec.getLineItemValue('item','description',i));
										trxItemSublist.setLineItemValue('tis_itemqty', slline, parseInt('1').toFixed(0));
										trxItemSublist.setLineItemValue('tis_itemrate', slline, trxrec.getLineItemValue('item','rate',i));
										trxItemSublist.setLineItemValue('tis_itemamount', slline, trxrec.getLineItemValue('item','amount',i));
										slline++;
									}
									
										
								}								
							}
						}
					}
				}
			}
		}
		
		//add process msg
		procmsg.setDefaultValue(reqProcMsg);
	} catch (slerror) {
		log('debug','Error Contract Tool',getErrText(slerror));
		procmsg.setDefaultValue(getErrText(slerror));
	}
	
	
	res.writePage(nsform);
	
}
