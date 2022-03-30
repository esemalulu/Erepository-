/**
 * Pardot Login Info:
 * User: heartmath@audaxium.com
 * API Key: c45aa008091f8634d9622fe50a52bb13
 * Pass: Thisiscrazy10
 * 
 * This Scheduled script is executed by AUX_SS_Push_Ns_to_Pardot.js Schedule script which pushes new lead or clients in to Pardot.
 * When called, 1st script will pass in Last Execution and Execution date/time value into this script.
 * Cash sales and Invoices that are CREATED within this time frame AND
 * Those with Trx Pardot Processed (custbody_aux_trx_pardot_processed) Checkbox UNCHECKED will be processed
 */
var ctx = nlapiGetContext();
var exitCount = 500;
var curDateTime = new Date();

//Last Execution date/time and Execution DateTeim is passed in from Lead/Client pardot push script.
//6/5/2013 11:59:00 am
var executionDateTime = ctx.getSetting('SCRIPT','custscript_trx_exec_datetime');
//calculate last execution time based on script repeat duration
var lastExecDateTime = ctx.getSetting('SCRIPT','custscript_trx_lastexec_datetime');
//last processed id
var lastProcId = ctx.getSetting('SCRIPT','custscript_trxp_lastproc_tid');

//pardot account info
var pardotUser = 'heartmath@audaxium.com';
var pardotUserKey = 'c45aa008091f8634d9622fe50a52bb13';
var pardotPass = 'Thisiscrazy10';
var pardotApiKey = '';

var pardotLoginUrl = 'https://pi.pardot.com/api/index?email='+pardotUser+'&password='+pardotPass+'&user_key='+pardotUserKey;

//key is generated by Pardot upon successful connection
var pardotApiKey = '';

//trx process log
var procHeader = '"Process Status","Process Msg","Trx InternalID","Trx Date Created","Trx Date","Trx Type","Trx Number","Trx Source",'+
				 '"Member Start Date","Member Renewal Date","Client Name/Internal ID","Is Individual/Person","Client Email Address",'+
				 '"None DV- Items","DV- Items","Pardot Update Param"\n';
var procBody = '';

var errMsg = '';

function processTrxNsToPardot() {
	try {
		
		//check for api key
		if (!pardotApiKey) {
			var response = nlapiRequestURL(pardotLoginUrl, null, null );
			var responseXML = nlapiStringToXML( response.getBody() );
			pardotApiKey = nlapiSelectValue( responseXML, '//api_key' );
		}
		
		log('debug','api key',pardotApiKey);
		
		if (pardotApiKey) {
			
			//search for transactions
			
			log('debug','Last Exec // Exec DateTime',lastExecDateTime+' // '+executionDateTime);
			/**
			var tflt = [new nlobjSearchFilter('type', null, 'anyof',['CashSale','CustInvc']),
			            new nlobjSearchFilter('mainline', null, 'is','T'),
			            new nlobjSearchFilter('custbody_aux_trx_pardot_processed', null, 'is','F'),
			            new nlobjSearchFilter('memorized', null, 'is','F'),
			            new nlobjSearchFilter('datecreated', null, 'within',lastExecDateTime, executionDateTime)];
			if (lastProcId) {
				tflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', lastProcId));
			}
			*/
			var tfltexp = [
			               [
			                 ['custbody_aux_trx_nspardot_retry','is','T'],
				             'and',
				             ['mainline','is','T'],
				             'and',
				             ['custbody_aux_trx_pardot_processed','is','F']
			               ],
			               'or',
			               [
			                ['type','anyof',['CashSale','CustInvc']],
			                'and',
			                ['mainline','is','T'],
			                'and',
			                ['custbody_aux_trx_pardot_processed','is','F'],
			                'and',
			                ['memorized','is','F'],
			                'and',
			                ['datecreated','within',lastExecDateTime, executionDateTime]
			               ]
			              ];
			
			if (lastProcId) {
				tfltexp = [
			               [
							['custbody_aux_trx_nspardot_retry','is','T'],
							'and',
							['mainline','is','T'],
							'and',
							['custbody_aux_trx_pardot_processed','is','F'],
							'and',
			                ['internalidnumber','lessthan', lastProcId]
			               ],
			               'or',
			               [
			                ['type','anyof',['CashSale','CustInvc']],
			                'and',
			                ['mainline','is','T'],
			                'and',
			                ['custbody_aux_trx_pardot_processed','is','F'],
			                'and',
			                ['memorized','is','F'],
			                'and',
			                ['datecreated','within',lastExecDateTime, executionDateTime],
			                'and',
			                ['internalidnumber','lessthan', lastProcId]
			               ]
			              ];
			}
			
			var tcol = [new nlobjSearchColumn('internalid').setSort(true),
			            new nlobjSearchColumn('datecreated'),
			            new nlobjSearchColumn('trandate'),
			            new nlobjSearchColumn('tranid'),
			            new nlobjSearchColumn('entity'), //select
			            new nlobjSearchColumn('type'),  //select
			            new nlobjSearchColumn('source'),  //select (Source on Transaction)
			            new nlobjSearchColumn('isperson','customer'),
			            new nlobjSearchColumn('email','customer'),
			            new nlobjSearchColumn('custentity_stbgn_mbr_startdate','customer'), //Member Start date
			            new nlobjSearchColumn('custentity_stbgn_mbr_rnwl_date','customer') //Member Renewal date
			           ];
			
			var trslt = nlapiSearchRecord('transaction', null, tfltexp, tcol);
			log('debug','Search Executed','Searched. Ready for next');
			//loop through each trx result set
			for (var t=0; trslt && t < trslt.length; t++) {
				lastProcId = trslt[t].getId();
				var procStatus = '';
				var procMsg = '';
				var strNdvItem = '';
				var strDvItem = '';
				var updateParams = '';
				
				var hasProcErr = false;
				
				//check to make sure client is NOT company
				if (trslt[t].getValue('isperson','customer') != 'T') {
					procStatus = 'error';
					procMsg = 'Client is NOT an Individual';
				} else if (!trslt[t].getValue('email','customer')) {
					procStatus = 'error';
					procMsg = 'Client is missing Email address';
				} else {
					
					//Set Pardot Prospect ID
					var pardotProspectId = '';
					var strPardotProducts = ''; //Pardot FieldID=Products (Textarea)
					var arPardotClientGroupPD = new Array(); //Pardot FieldID=Client_Group_PD (MultiSelect)
					
					//check to see if email exists in Pardot
					var continueProcess = false;
					//TEST value
					var existInPardot = false;
					//trx info
					var trxSctType = trslt[t].getRecordType();
					var trxTypeTxt = trslt[t].getText('type');
					var trxNumber = trslt[t].getValue('tranid');
					var trxInternalId = trslt[t].getId();
					var trxSource = trslt[t].getText('source');
					
					try {
						
						var pardotReadEmailUrl = 'https://pi.pardot.com/api/prospect?version=3&do=read&user_key='+pardotUserKey+
												 '&api_key='+pardotApiKey+'&email='+trslt[t].getValue('email','customer');
						
						//Find out if this email exists in Pardot
						var emailLookupResponse = nlapiRequestURL(pardotReadEmailUrl, null, null );
						var emailLookupResponseXML = nlapiStringToXML(emailLookupResponse.getBody());
						
						pardotProspectId = nlapiSelectValue( emailLookupResponseXML, '//id' );
						
						//if existing prospect in pardot, check to see if it's unassigned
						if (pardotProspectId) {
							continueProcess = true;
							existInPardot = true;
							strPardotProducts = nlapiSelectValue( emailLookupResponseXML, '//Products' ); //Pardot FieldID=Products (Textarea)
							var pdvals = nlapiSelectValues(emailLookupResponseXML, '//Client_Group_PD');
							
							//look up existing values for Products and Client Group PD fields in Pardot
							if (pdvals.length > 0) {
								//if first array value is empty, multiple values are set
								if (!strTrim(pdvals[0])) {
									pdvals = nlapiSelectValues(emailLookupResponseXML, '//Client_Group_PD/value');
									for (var p=0; pdvals && p < pdvals.length; p++) {
										arPardotClientGroupPD.push(pdvals[p]);
									}
								} else {
									//only one value select
									arPardotClientGroupPD.push(pdvals[0]);
								}
							}

							log('debug','Pardot Values for '+trslt[t].getValue('email','customer'),
								'ID: '+pardotProspectId+' // Products: '+strPardotProducts+' // GroupPD: '+arPardotClientGroupPD);
						} else {
							procStatus = 'error';
							procMsg = 'Client Email Missing in Pardot // ';
						}
						
					} catch (pardotexisterr) {
						procStatus = 'error';
						procMsg = 'Error Pardot Search for Client Email ('+trslt[t].getValue('email','customer')+') for '+trxTypeTxt+' #'+trxNumber+' ('+trxInternalId+') :: '+getErrText(pardotexisterr);
					}
					
					//TESTING ONLY
					//continueProcess = true;
					
					if (continueProcess) {
						
						//JSON object that holds Item Internal ID to Item Name value.
						var itemNames = {};
						
						try {
							
							var ndvLineItemNames = new Array();
							var dvLineNums = new Array();
							var dvItemToSet = '';
							var dvItemAmountToSet = '';
							
							//load trx rec
							var trxrec = nlapiLoadRecord(trxSctType, trxInternalId);
							//get line item count
							var icount = trxrec.getLineItemCount('item');
							if (parseInt(icount) <= 0) {
								procStatus = 'error';
								procMsg = trxTypeTxt+' #'+trxNumber+' ('+trxInternalId+') :: has No line items';
							} else {
								//MOD request. Ignore Discount, Description, Subtotal, Payment Item types
								var ignoreItemTypes = ['Discount', 'Description', 'Subtotal', 'Payment'];
								
								//look up Item Number values
								var itemInternalIds = new Array();
								for (var ii=1; ii <= icount; ii++) {
									if (!itemInternalIds.contains(trxrec.getLineItemValue('item', 'item', ii))) {
										
										itemInternalIds.push(trxrec.getLineItemValue('item', 'item', ii));
									}
								}
								
								//populate itemNames JSON object based on search
								var itflt = [new nlobjSearchFilter('internalid', null, 'anyof', itemInternalIds),
								             new nlobjSearchFilter('type', null, 'noneof',ignoreItemTypes)];
								var itcol = [new nlobjSearchColumn('itemid')];
								var itrslt = nlapiSearchRecord('item', null, itflt, itcol);
								for (var itl=0; itrslt && itl < itrslt.length; itl++) {
									itemNames[itrslt[itl].getId()] = (itrslt[itl].getValue('itemid'))?itrslt[itl].getValue('itemid'):'';
								}
								
								//loop through each line and find DV- and None DV- items
								for (var ic=1; ic <= icount; ic++) {
									var lineItemName = itemNames[trxrec.getLineItemValue('item', 'item', ic)];
									//only process those with item Number/Id value
									if (lineItemName) {
										var firstThreeChars = lineItemName.substring(0, 3);
										if (firstThreeChars == 'DV-') {
											strDvItem += lineItemName+',';
											dvLineNums.push(ic);
										} else {
											strNdvItem += lineItemName+',';
											if (!ndvLineItemNames.contains(lineItemName)) {
												ndvLineItemNames.push(lineItemName);
											}									
										}
									}
									
								}
								
								//remove last ,
								if (strDvItem && strDvItem.charAt(strDvItem.length-1) == ',') {
									strDvItem = strDvItem.substring(0, (strDvItem.length-1));
								}
								if (strNdvItem && strNdvItem.charAt(strNdvItem.length-1) == ',') {
									strNdvItem = strNdvItem.substring(0, (strNdvItem.length-1));
								}
								
								//Find DV Item 
								if (dvLineNums.length > 0) {
									//Only 1?
									if (dvLineNums.length == 1) {
										dvItemToSet = itemNames[trxrec.getLineItemValue('item', 'item', dvLineNums[0])];
										dvItemAmountToSet = trxrec.getLineItemValue('item', 'amount', dvLineNums[0]);
										
									} else {
										var loLineItemName = '';
										var loLineItemAmount = '';
										
										for (var dl=0; dl < dvLineNums.length; dl++) {
											
											var lineAmount = 0.0;
											if (trxrec.getLineItemValue('item', 'amount', dvLineNums[dl])) {
												lineAmount = parseFloat(trxrec.getLineItemValue('item', 'amount', dvLineNums[dl]));
											}
											
											if (dl==0 || lineAmount > parseFloat(loLineItemAmount)) {
												loLineItemName = itemNames[trxrec.getLineItemValue('item', 'item', dvLineNums[dl])];
												loLineItemAmount = lineAmount;
											}
											
											log('debug','dv line check '+dvLineNums[dl]+' // '+trxNumber,lineAmount+ ' // '+loLineItemAmount);
										}
										
										dvItemToSet = loLineItemName;
										dvItemAmountToSet = loLineItemAmount;
										
										log('debug','DV to set',dvItemToSet+' // '+dvItemAmountToSet);
									}
									
								}
								
								//final processing
								procStatus = 'success';
								
								if (ndvLineItemNames.length > 0) {
									procMsg += 'Pardot Last Purchase Date='+trslt[t].getValue('trandate')+' // Add to Pardot Products='+ndvLineItemNames.toString()+' // ';
									updateParams += '&Last_Purchase_Date='+trslt[t].getValue('trandate');
									updateParams += '&Products='+((strPardotProducts)?strPardotProducts+',':'')+ndvLineItemNames.toString();
								}
								
								if (dvLineNums.length > 0 && dvItemToSet && dvItemAmountToSet) {
									
									//check to make sure membership dates are set
									var memStartDate = (trslt[t].getValue('custentity_stbgn_mbr_startdate','customer'))?trslt[t].getValue('custentity_stbgn_mbr_startdate','customer'):'';
									var memRenewDate = (trslt[t].getValue('custentity_stbgn_mbr_rnwl_date','customer'))?trslt[t].getValue('custentity_stbgn_mbr_rnwl_date','customer'):'';
									procMsg += 'Pardot Last Donation Date='+trslt[t].getValue('trandate')+' // Add to Pardot Last Donation='+dvItemToSet+' // '+
												   'Pardot IHM Member Start date='+memStartDate+' // '+
												   'Pardot IHM Member Renewal date='+memRenewDate+' // ';
									
									updateParams += '&Last_Donation_Date='+trslt[t].getValue('trandate');
									updateParams += '&Last_Donation_Amount='+dvItemAmountToSet;
									updateParams += '&Last_Donation='+dvItemToSet;
									if (memStartDate) {
										updateParams += '&IHM_Member_Start_Date='+memStartDate;
									}
									
									if (memRenewDate) {
										updateParams += '&Renewal_Date='+memRenewDate;
									}
									
								}
								
								//Check Source
								var updCgpd = false;
								var nsAddToVal = '';
								
								if (trxSource == 'Web (Institute of HeartMath)') {
									updCgpd = true;
									procMsg += 'Add to Pardot Client Group PD=IHM // Add to NetSuite Client Group 2=IHM //';
									if (!arPardotClientGroupPD.contains('IHM')) {
										arPardotClientGroupPD.push('IHM');
									}
									nsAddToVal = 'IHM';
								} else if (trxSource == 'Web (Global Coherence Initiative)') {
									updCgpd = true;
									procMsg += 'Add to Pardot Client Group PD=GCI // Add to NetSuite Client Group 2=GCI //';
									if (!arPardotClientGroupPD.contains('GCI')) {
										arPardotClientGroupPD.push('GCI');
									}
									nsAddToVal = 'GCI';
								}
								
								//Add Client Group PD parameter
								if (updCgpd) {
									if (arPardotClientGroupPD.length > 0) {
										var updStr = '';
										for(var i=0; i < arPardotClientGroupPD.length; i++) {
											updStr += '&Client_Group_PD_'+i+'='+arPardotClientGroupPD[i];
										}
										updateParams += updStr;
									}
									
									//Update Pardot with Information
									//Execute Update
									//updateParams
									
									var clirec = nlapiLoadRecord('customer', trxrec.getFieldValue('entity'));
									//Update NetSuite
									//add nsAddToVal value to Client Group 2 in Client Record
									
									var cg2Selections = new Array();
									var cg2OnRec = clirec.getFieldTexts('custentity_stbmn_client_group_ns');
									for (var c=0; cg2OnRec && c < cg2OnRec.length; c++) {
										cg2Selections.push(cg2OnRec[c]);
									}
									
									if (!cg2Selections.contains(nsAddToVal)) {
										cg2Selections.push(nsAddToVal);
									}
									clirec.setFieldTexts('custentity_stbmn_client_group_ns', cg2Selections);
									nlapiSubmitRecord(clirec, true, true);
									
								}
								
								var pardotUpdateUrl = 'https://pi.pardot.com/api/prospect?version=3&do=update&user_key='+pardotUserKey;
								pardotUpdateUrl += '&api_key='+pardotApiKey+'&id='+pardotProspectId+updateParams;
								
								var updResponse = nlapiRequestURL(pardotUpdateUrl, null, null );
								var updResponseXML = nlapiStringToXML( updResponse.getBody() );
								if (nlapiSelectValue(updResponseXML, '//@stat') != 'ok') {
									procStatus = 'error';
									procMsg += nlapiSelectValue(updResponseXML, '//@code')+' :: '+nlapiSelectValue(updResponseXML, '//err');
								}
							}
							
						} catch (loaderr) {
							procStatus = 'error';
							procMsg = 'Error loading '+trxTypeTxt+' #'+trxNumber+' ('+trxInternalId+') :: '+getErrText(loaderr);
						}
					}//closing if (continueProcess)
				} 
				
				//replace out # variables
				procMsg = strGlobalReplace(procMsg, "\r", " || ");
				procMsg = strGlobalReplace(procMsg,"\n", " || ");
				
				if (procStatus == 'error') {
					//Values wrapped in # will be replaced
					var procBodyLine = '"'+procStatus+'","'+procMsg+'","'+trslt[t].getId()+'","'+
									   trslt[t].getValue('datecreated')+'","'+
									   trslt[t].getValue('trandate')+'","'+
									   trslt[t].getText('type')+'","'+
									   trslt[t].getValue('tranid')+'","'+
									   trslt[t].getText('source')+'","'+
									   trslt[t].getValue('custentity_stbgn_mbr_startdate','customer')+'","'+
									   trslt[t].getValue('custentity_stbgn_mbr_rnwl_date','customer')+'","'+
									   trslt[t].getText('entity')+' ('+trslt[t].getValue('entity')+')","'+
									   trslt[t].getValue('isperson','customer')+'","'+
									   trslt[t].getValue('email','customer')+'","'+strNdvItem+'","'+strDvItem+'","'+updateParams+'"\n';
					
					procBody += procBodyLine;
					hasProcErr = true;
				}
				
				//update trx with retry flag
				//custbody_aux_trx_nspardot_retry
				if (hasProcErr) {
				 	nlapiSubmitField(trslt[t].getRecordType(), trslt[t].getId(), 'custbody_aux_trx_nspardot_retry', 'T', false);
				} else {
					var trxUpdFld = ['custbody_aux_trx_nspardot_retry','custbody_aux_trx_pardot_processed'];
					var trxUpdVal = ['F','T'];
					nlapiSubmitField(trslt[t].getRecordType(), trslt[t].getId(), trxUpdFld, trxUpdVal, false);
				}
				
				
				//check to make sure we have enough gov points
				
				//reschedule logic
				if (ctx.getRemainingUsage() <= exitCount && (t+1) < trslt.length) {
					var param = new Array();
					param['custscript_trxp_lastproc_tid'] = trslt[t].getId();
					param['custscript_trx_exec_datetime'] = executionDateTime;
					param['custscript_trx_lastexec_datetime'] = lastExecDateTime;
					
					var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
					if (schStatus=='QUEUED') {
						log('debug','Script Rescheduled','Last Processed Group ID: '+trslt[t].getId());
						break;
					}
				}				
			}
		}
	} catch (e) {
		log('error','Runtime Error',getErrText(e));
		errMsg = '<br/><br/>Error Occured:<br/>'+getErrText(e);
		
		var exitErr = getErrText(e);
		exitErr = strGlobalReplace(exitErr, "\r", " || ");
		exitErr = strGlobalReplace(exitErr,"\n", " || ");
		
		procBody += '"error","'+exitErr+'","'+lastProcId+'","","","","","","","","","","","",""\n';
		
	}
	
	if (procBody) {
		//Save the Report in the NS Documents: Folder 42013 (SLA CSV Reports)
		var procFileName = 'Inst_HeartMath_CashSales_Invoice_Pardot_Push_for_'+executionDateTime+'.csv';
		var procFile = nlapiCreateFile(procFileName,'CSV',procHeader+procBody);
		var procAttachment = [procFile];
		
		//email the report first
		//generate No Results found email
		var procSbj = 'ERRORS for [Trx (CashSale/Invoice) Push to Pardot LIVE]-Inst. HeartMath CashSale/Invoice Pardot Push for '+executionDateTime+'.csv';
		var procMsg = 'Errors exists for one or more transaction records processed for Pardot Push for CashSales/Invoices Created Between <b>'+lastExecDateTime+' - '+executionDateTime+'</b>';
		nlapiSendEmail(-5, 'lynn@heartmath.org', procSbj, procMsg, null, null, null, procAttachment);
	}	
	
}

