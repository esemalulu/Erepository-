nlapiLogExecution("audit","FLOStart",new Date().getTime())
/**
 * Scheduled script to run DAILY to generate Subscription Renewal Quotes from SWX Customer Assets.
 * System will generate Quotes for following SWX Customer Assets
 * - Processing Date is 70 days from Entitlement End Date
 * - Asset Status is "Renewed"
 * - Linked Customers' SWX Support value is "MultiVAR Account - Javelin" -> Changed 
 *
 * NOTES:
 * - Single Quote is generated for Each customers with Matching SWX Customer Asset records.
 * - Flag is used to PROCESS ADS customers.
 * 		- If Flag is checked, any entitlement end date in 2014 will use ADS Quote form
 *
 */
var ctx = nlapiGetContext();
var paramLastProcAssetCustId = ctx.getSetting('SCRIPT','custscript_gsrq_assetcid');
var paramJavQuoteFormId = ctx.getSetting('SCRIPT','custscript_gsrq_javqfid');
var paramAdsQuoteFormId = ctx.getSetting('SCRIPT','custscript_gsrq_adsqfid');
var paramProcessAds = ctx.getSetting('SCRIPT','custscript_gsrq_procads');
var paramCustProcDate = ctx.getSetting('SCRIPT','custscript_gsrq_custprocdate');
var paramNotifyEmails = ctx.getSetting('SCRIPT','custscript_gsrq_notifyemails');
//Mod Request: 11/7/2013
//Allow user to Custom Transaction date when executed in Custom Mode.
var paramTrxDateOverride = ctx.getSetting('SCRIPT','custscript_gsrq_trxdtoverride');
//Allow user to execute ONLY Test Records
//When checked, it will ONLY process records with custrecord_ax_cswxa_testrec checked
var paramProcTestRecOnly = ctx.getSetting('SCRIPT','custscript_gsrq_testreconly');
if (paramProcTestRecOnly != 'T') {
	paramProcTestRecOnly = 'F';
}

//Mod Request: 11/26/2013
// Request to add default Primary Sales Rep and associated role.
// Adding this as parameter incase it changes.
var paramDefPrimeSalesRep = ctx.getSetting('SCRIPT','custscript_gsrq_defpsalesrep');
var paramDefPrimeSalesRepRole = ctx.getSetting('SCRIPT','custscript_gsrq_defpsalesreprole');

//Mod Request: 11/19/2014
var paramOntarioSalesRep = ctx.getSetting('SCRIPT','custscript_grsq_ontariosrep');
var paramAllOtherSalesRep = ctx.getSetting('SCRIPT','custscript_grsq_allothersrep');

//Identifies daily or custom process
var processType = '[Scheduled DAILY]';
if (paramCustProcDate) {
	processType = '[Custom Process Date]';
}

var EXIT_COUNT= 1000;

function genSwxSubsRenewalQuote(type) {
	
	var prodate = new Date();
	if (paramCustProcDate) {
		prodate = new Date(paramCustProcDate);
	}
	//Entitlement that is 65 days from current date
	//MOD Req 1/18/2013 - use 70 days
	var dateToSearch = nlapiDateToString(nlapiAddDays(prodate, 70));
	
	var errCsvHeader = 'Customer Asset ID,Customer ID, Customer Name,  Customer Support,  Create Quote, NS Item, Related Subs Item\n';
	var errCsvBody = '';
	
	//csv for process
	var procCsvHeader = 'Status, Msg, Process Type, Is Test Mode, Is Trx Date Override, Trx Date Used, Customer ID, Customer Name, Customer Support Type, Create Quote, Quote Form Used, Proc Date, E.End Date, Due Date (7 Biz Days)\n';
	var procCsvBody = '';

	//Mod Req 11/7/2013 - Custom Transaction date
	var trxdate = nlapiDateToString(prodate);
	var isOverride = 'No';
	if (paramTrxDateOverride && nlapiDateToString(prodate) != paramTrxDateOverride) {
		trxdate = paramTrxDateOverride;
		isOverride = 'Yes';
	}
	
	var isTestMode = 'No';
	if (paramProcTestRecOnly=='T') {
		isTestMode = 'Yes';
	}
	
	
	try {

		if (!paramJavQuoteFormId || !paramAdsQuoteFormId) {
			throw nlapiCreateError('SWXGENQ-0001', 'Quote forms to use for both Javelin and ADS must be provided', true);
		}
		
		//look for matching assets and group the result by customer
		//business days means Monday through Friday
		var sevenBizDate = null;
		var numDays = 0;
		//loop until you get to 7 days BEFORE entitlement date
		while (numDays < 7) {
		  if (!sevenBizDate) {
		    sevenBizDate = nlapiStringToDate(dateToSearch);
		  }
		  //add one day
		  sevenBizDate = nlapiAddDays(sevenBizDate, -1);
		  //0 = Sunday
		  //6 = Sat
		  if (sevenBizDate.getDay() != 0 && sevenBizDate.getDay()!=6) {
			  numDays++;
		  }
		}
		sevenBizDate = nlapiDateToString(sevenBizDate);
		log('debug','Entitlement Date to Search','Today: '+prodate+' // 70 Days: '+dateToSearch+' // -7 Business Days: '+sevenBizDate);
		
		//Asset Status 4 = Renewed
		//Mod Request: 11/5/2013
			//Add Status of YES and VPA - Javelin
			//Create Quotes if Yes or MultiVAR Account
			// ONLY UPDATE Asset status when VPA - Javelin
			//Mod Request: 11/7/2013
				//ONLY Update Asset status when VPN - Javelin OR Special Agreement
		//SWX Support 7 = MultiVAR Account - Javelin
		//			  2 = Yes
		//			  11 = VPA - Javelin
		//Mod Request: 11/7/2013
		// Include Special Agreement status
		//			13 = Special Agreement
		//Mod Req: 11/7/2013 - Allow users to run in Test mode by ONLY processing Customer Asset records marked as Test
		//process ONLY test records
		//When it's NOT checked, it will NOT process Test Records



		/*

		Must export old values from swx support and map to the new field subscription type

		Support Level (customlist_supportlevel -> populates: custentity_supportlevel_swx) - [OLD]
		--------------------------------
		Yes	2
		SEE NOTES	8
		No Support	3
		Suspended	4
		Eval	6
		KEY Account	1
		MultiVAR Account - Javelin	7
		MultiVAR Account - Other VAR	9
		MultiVAR Account - Direct SWX	10
		MultiVAR Account	15
		VPA - Javelin	11
		VPA - Direct SWX	12
		Special Agreement	13
		ACR In Process	16

		Subscription Type List (customlist_sub_type_list -> populates: custentity_sub_type) - [NEW]
		-----------------------
		MRN - Direct SWX	4
		MRN - Javelin	2
		MRN - Other VAR	3
		Special Agreement	7
		Standard	1
		VPA - Direct SWX	6
		VPA - Javelin	5
		*/

		var aflt = [new nlobjSearchFilter('custrecord_ax_cswxa_entitleenddt', null, 'on',dateToSearch),
		            new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('custrecord_ax_cswxa_assetstatus', null, 'anyof','4'),
		            new nlobjSearchFilter('custentity_sub_type','custrecord_ax_cswxa_customer', 'noneof', ['3', '4', '6']),
		            new nlobjSearchFilter('custrecord_ax_cswxa_testrec',null, 'is',paramProcTestRecOnly)];
		            // [RG: replaced custentity_supportlevel_swx - 'anyof',['7','2','11','13'] to the new values]
					// replaced //'anyof', ['2','1','5','7']) with 'noneof' ['3', '4', '6']
		//process where it left off
		if (paramLastProcAssetCustId) {
			aflt.push(new nlobjSearchFilter('internalidnumber','custrecord_ax_cswxa_customer', 'lessthan',paramLastProcAssetCustId));
		}


		//grab list of customer to process
		var acol = [new nlobjSearchColumn('internalid','CUSTRECORD_AX_CSWXA_CUSTOMER','group').setSort(true),
		            new nlobjSearchColumn('entityid','CUSTRECORD_AX_CSWXA_CUSTOMER','group'),
		            new nlobjSearchColumn('currency','CUSTRECORD_AX_CSWXA_CUSTOMER','group'),
		            new nlobjSearchColumn('custentity_sub_type','custrecord_ax_cswxa_customer','group')];

		var ars = nlapiSearchRecord('customrecord_ax_cswx_assets', null, aflt, acol);
		
		for (var a=0; ars && a < ars.length; a++) {
			
			var quoteFormId = paramJavQuoteFormId;
			var custId = ars[a].getValue('internalid','CUSTRECORD_AX_CSWXA_CUSTOMER','group');
			var custName = ars[a].getValue('entityid','CUSTRECORD_AX_CSWXA_CUSTOMER','group');
			var custCurrency = ars[a].getValue('currency','CUSTRECORD_AX_CSWXA_CUSTOMER','group');
			var custCurrencyText = ars[a].getText('currency','CUSTRECORD_AX_CSWXA_CUSTOMER','group');
			var custSupport = ars[a].getValue('custentity_sub_type','custrecord_ax_cswxa_customer','group');
			var custSupportText = ars[a].getText('custentity_sub_type','custrecord_ax_cswxa_customer','group');
			var custCreateQuote = true;
			//do not create quote for VPA Javelin or special agreement [RG: changed to the new values]
			if (custSupport == '5' || custSupport == '7') {
				custCreateQuote = false;
			}
			//currency
			//check to see if ADS form needs to be used
			//Process ADS must be checked, entitle end date must be before 2014, customer name must have FROM ADS
			//MOD Req: 11/7/2013
			//ADS check is now before year 2015.
			if (paramProcessAds=='T' && new Date(dateToSearch).getFullYear() < 2015 && custName.indexOf('[FROM ADS]') > -1) {
				quoteFormId = paramAdsQuoteFormId;
			}
			
			log('debug','ADS check',paramProcessAds+' // '+new Date(dateToSearch).getFullYear()+' // '+custName);
			log('debug','Quote Form to use?',quoteFormId);
			
			//object to hold asset items information
			var caitems = {};
			/**
			 * Errors are produced when:
			 * 1. Any of item is missing Related Subscription item
			 */
			var hasError = false;
			//get list of Assets for THIS client
			var asflt = [new nlobjSearchFilter('custrecord_ax_cswxa_entitleenddt', null, 'on',dateToSearch),
			             new nlobjSearchFilter('custrecord_ax_cswxa_assetstatus', null, 'anyof','4'),
			             new nlobjSearchFilter('custentity_sub_type','custrecord_ax_cswxa_customer', 'noneof', ['3', '4', '6']),
			             //new nlobjSearchFilter('custentity_supportlevel_swx','custrecord_ax_cswxa_customer', 'anyof',['7','2','11','13']),
			             new nlobjSearchFilter('custrecord_ax_cswxa_testrec',null, 'is',paramProcTestRecOnly),
			             new nlobjSearchFilter('custrecord_ax_cswxa_customer', null, 'anyof',custId)];
			var ascol = [new nlobjSearchColumn('custrecord_ax_cswxa_nsitem'),
			             new nlobjSearchColumn('custitem_relatedsubscriptionitem','custrecord_ax_cswxa_nsitem'),
			             new nlobjSearchColumn('custrecord_ax_cswxa_serialnum'),
			             new nlobjSearchColumn('custrecord_ax_cswxa_qty')];
			var asrs = nlapiSearchRecord('customrecord_ax_cswx_assets', null, asflt, ascol);
			
			//assume there are items returned
			for (var s=0; s < asrs.length; s++) {
				
				var subitemid = asrs[s].getValue('custitem_relatedsubscriptionitem','custrecord_ax_cswxa_nsitem');
				var nsitemid = asrs[s].getValue('custrecord_ax_cswxa_nsitem');
				var nsitemtext = asrs[s].getText('custrecord_ax_cswxa_nsitem');
				var qty = (asrs[s].getValue('custrecord_ax_cswxa_qty'))?asrs[s].getValue('custrecord_ax_cswxa_qty'):0;
				
				if (!caitems[asrs[s].getId()]) {
					caitems[asrs[s].getId()] = {};
				}
				
				caitems[asrs[s].getId()]['nsitemid'] = nsitemid;
				caitems[asrs[s].getId()]['nsitemtext'] = nsitemtext;
				caitems[asrs[s].getId()]['subitemid'] = subitemid;
				caitems[asrs[s].getId()]['serial'] = asrs[s].getValue('custrecord_ax_cswxa_serialnum');
				caitems[asrs[s].getId()]['qty'] = qty;
				
				if (!subitemid) {
					log('error','has error '+asrs[s].getId(), 'missing sub item id');
					hasError = true;
					errCsvBody+= '"'+asrs[s].getId()+'",'+
								 '"'+custId+'",'+
								 '"'+custName+'",'+
								 '"'+custSupportText+'",'+
								 '"'+custCreateQuote.toString()+'",'+
								 '"'+nsitemtext+'('+nsitemid+')",'+
								 '"'+subitemid+'"\n';
							   
				}
			}
			
			//ONLY Process IF there are no errors
			if (hasError) {
				log('error','Cust ID has error',custId+' has missing rel sub items');
				procCsvBody +='"ERROR","One/More linked Item(s) missing Related Subs Item",'+
							  '"'+processType+'",'+
							  '"'+isTestMode+'",'+
							  '"'+isOverride+'",'+
							  '"'+trxdate+'",'+
							  '"'+custId+'",'+
							  '"'+custName+'",'+
							  '"'+custSupportText+'",'+
							  '"'+custCreateQuote.toString()+'",'+
							  '"'+quoteFormId+'",'+
							  '"'+nlapiDateToString(prodate)+'",'+
							  '"'+dateToSearch+'",'+
							  '"'+sevenBizDate+'",\n';
			} else {
				var qid = '';
				try {
				
					if (custCreateQuote) {
					
						//create Quote
						
						//Renewal period is Ent.EndDate +1 day to Ent.EndDate + 1year
						var renewPrdStart = nlapiAddDays(nlapiStringToDate(dateToSearch), 1);
						var renewPrdEnd = nlapiAddMonths(nlapiStringToDate(dateToSearch), 12);
						var renewPeriodString = nlapiDateToString(renewPrdStart) + ' - '+nlapiDateToString(renewPrdEnd);
						log('debug','renweal period', renewPeriodString);
						
						var acctInfo = '';
						if (quoteFormId == paramJavQuoteFormId) {
							
							if (custCurrencyText == 'Canadian Dollar' || custCurrencyText == 'Canadian Dollars') {
								
								acctInfo = 'Account number: 1997875\n'+
										   'Swift Code:   BOFMCAM2\n'+
										   'Phone (Bank): 905-336-1286\n'+
										   'Javelin Fax: 905-815-1907';
								log('debug', 'Javelin CAN',acctInfo);
							} else {
								//assume US
								acctInfo = 'Account number: 4792970\n'+
											'Swift Code:   BOFMCAM2\n'+
											'Phone (Bank): 905-336-1286\n'+
											'Javelin Fax: 905-815-1907';
								log('debug', 'Javelin US',acctInfo);
							}
							
						} else if (quoteFormId == paramAdsQuoteFormId) {
							if (custCurrencyText == 'Canadian Dollar' || custCurrencyText == 'Canadian Dollars') {
								acctInfo = 'Bank transit number: 38712\n'+
											'Account number: 1997883\n'+
											'Swift Code:   BOFMCAM2\n'+
											'Phone (Bank): 905-336-1286';
								log('debug', 'ADS CAN',acctInfo);
							} else {
								//assume US
								acctInfo = 'Bank transit number: 38712\n'+
											'Account number: 4792997\n'+
											'Swift Code:   BOFMCAM2\n'+
											'Phone (Bank): 905-336-1286';
								log('debug', 'ADS US',acctInfo);
							}
						}
						
						var itemSubTotal = 0.0;
						var itemTotalQty = 0;
						//1/11/2014 - Tax rate to calculate 12 month and 36 month print value
						//			  is addition of taxrate1 and taxrate2 column
						var itemTaxRate = 0.0;
						var qrec = nlapiCreateRecord('estimate', {recordmode: 'dynamic',customform: quoteFormId});
						qrec.setFieldValue('entity', custId);
						qrec.setFieldValue('currency', custCurrency);
						qrec.setFieldValue('trandate', trxdate);
						qrec.setFieldValue('status','22');
						qrec.setFieldValue('terms','8');
						qrec.setFieldValue('duedate', sevenBizDate);
						qrec.setFieldValue('memo','Subscription Renewal');
						qrec.setFieldValue('enddate', dateToSearch);
						qrec.setFieldValue('leadsource', '5833214'); // added by Robert Gama Feb 24, 2016. Set leadsource to "Subscription Renewal - Set by Automation"
						
						for (var qi in caitems) {
							qrec.selectNewLineItem('item');
							qrec.setCurrentLineItemValue('item', 'item', caitems[qi].subitemid);
							qrec.setCurrentLineItemValue('item', 'quantity', caitems[qi].qty);
							qrec.setCurrentLineItemValue('item', 'custcol_ax_swx_serialnum', caitems[qi].serial);
							
							//1/11/2014 - Based on client, all line items will have same tax rate.
							//			  If itemTaxRate is 0.0, as items are added, calculate tax to use by adding rate 1 and rate 2
							var taxrate = qrec.getCurrentLineItemValue('item','taxrate1');
							var taxrate2 = qrec.getCurrentLineItemValue('item','taxrate2');
							log('debug','rate 1 // rate 2',taxrate+' // '+taxrate2);
							
							if (itemTaxRate <= 0.0) {
								var taxrate = qrec.getCurrentLineItemValue('item','taxrate1');
								var taxrate2 = qrec.getCurrentLineItemValue('item','taxrate2');
								
								if (taxrate && taxrate.indexOf('%') > -1) {
									taxrate = parseFloat(taxrate.replace('%',''));
									if (parseFloat(taxrate) > 0.0) {
										itemTaxRate = taxrate;
									}
								}
								
								if (taxrate2 && taxrate2.indexOf('%') > -1) {
									taxrate2 = parseFloat(taxrate2.replace('%',''));
									if (parseFloat(taxrate2) > 0.0) {
										itemTaxRate = itemTaxRate + taxrate2;
									}
								}
							}
							
							itemSubTotal = itemSubTotal + parseFloat(qrec.getCurrentLineItemValue('item', 'amount'));
							itemTotalQty = itemTotalQty + parseInt(caitems[qi].qty);
							
							qrec.commitLineItem('item');
						}
						
						log('debug','items sub total',itemSubTotal);
						log('debug','total item count',itemTotalQty);
						log('debug','Tax Rate (rate1 + rate2)',itemTaxRate);
						
						var savingsAmt = 500 * itemTotalQty;
						log('debug','Savings', savingsAmt);
						
						var amt12mSubtotal = itemSubTotal;
						var amt12mGstHst = itemSubTotal * (itemTaxRate/100);
						var amt12mTotal = amt12mSubtotal + amt12mGstHst;
						
						var amt36mSubtotal = itemSubTotal * 3;
						//1/11/2014 - Modify 12% discount calculation to 36mSubtotal * 0.88 instead of dividing by 1.12
						//3/25/2016 - Modify discount to 15%; use 0.85
						var amt36mSavingsSubtotal = amt36mSubtotal * 0.85;
						var amt36mSavings = amt36mSubtotal - amt36mSavingsSubtotal;
						var amt36mSavingsSubtotalGstHst = amt36mSavingsSubtotal * (itemTaxRate/100);
						var amt36mTotal = amt36mSavingsSubtotal + amt36mSavingsSubtotalGstHst;
						
						//3/4/2015 - Add in 60 months calculations
						var amt60mSubtotal = itemSubTotal * 5;
						var amt60mSavings = amt60mSubtotal * 0.2;
						var amt60mSavingsSubtotal = amt60mSubtotal - amt60mSavings;
						var amt60mSavingsSubtotalGstHst = amt60mSavingsSubtotal * (itemTaxRate/100);
						var amt60mTotal = amt60mSavingsSubtotal + amt60mSavingsSubtotalGstHst;
						
						//set dynamic print field values
						qrec.setFieldValue('custbody_ax_print_renewalperiod', renewPeriodString);
						qrec.setFieldValue('custbody_ax_print_savingamt', savingsAmt.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_paymethod_acct_html', acctInfo);
						
						qrec.setFieldValue('custbody_ax_print_12m_subtotal', amt12mSubtotal.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_12m_gsthst', amt12mGstHst.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_12m_total', amt12mTotal.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_36m_subtotal', amt36mSubtotal.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_36m_subtotal_savings', amt36mSavingsSubtotal.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_36m_savings', amt36mSavings.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_36m_sts_gsthst', amt36mSavingsSubtotalGstHst.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_36m_total', amt36mTotal.toFixed(2));
						
						qrec.setFieldValue('custbody_ax_print_60m_subtotal', amt60mSubtotal.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_60m_subtotal_savings', amt60mSavingsSubtotal.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_60m_savings', amt60mSavings.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_60m_sts_gsthst', amt60mSavingsSubtotalGstHst.toFixed(2));
						qrec.setFieldValue('custbody_ax_print_60m_total', amt60mTotal.toFixed(2));
						
						//Mod Req: 11/26/2013
						//Add Mary McGowan as Primary Sales Rep with Role of Admin by Default
						
						//Mod Req: 1/8/2014
						//remove existing sales rep and ONLY add Mary
						if (qrec.getLineItemCount('salesteam') > 0) {
							for (var qs=qrec.getLineItemCount('salesteam'); qs >= 1; qs--) {
								qrec.removeLineItem('salesteam', qs);
							}
						}
						
						//Mod Req: Depending Billing City, change the sales rep. KEEP Prime Sales Rep Role
						//Primary Customer Sales rep
						//5/17/2016 - Grab list of Sales Rep Internal IDs to Exclude from ON
						var onExcludeList = nlapiGetContext().getSetting('SCRIPT','custscript_grsq_ontariosrepexclude'),
							customerSalesRep = '';
						
						//Look up Sales Rep of the linked customer
						try
						{
							customerSalesRep = nlapiLookupField('customer', custId, 'salesrep', false);
						}
						catch(custreperr)
						{
							log(
								'error',
								'Unable to look up sales rep',
								'Error while looking up Cust SR for Customer '+custId+' // '+getErrText(custreperr)
							);
						}
						
						if (onExcludeList && onExcludeList.length > 0)
						{
							onExcludeList = onExcludeList.split(',');
						}
						else
						{
							onExcludeList = [];
						}
						
						if (qrec.getFieldValue('billstate')=='ON') {
							paramDefPrimeSalesRep = paramOntarioSalesRep;
							
							//Check to see if customer sales rep is one of identified to exclude
							//	IF one of Exclude, set to All Other Sales rep
							if (customerSalesRep && onExcludeList.contains(customerSalesRep))
							{
								paramDefPrimeSalesRep = paramAllOtherSalesRep;
							}
							
						} else {
							paramDefPrimeSalesRep = paramAllOtherSalesRep;
						}
						
						qrec.selectNewLineItem('salesteam');
						qrec.setCurrentLineItemValue('salesteam', 'employee', paramDefPrimeSalesRep);
						qrec.setCurrentLineItemValue('salesteam', 'isprimary', 'T');
						qrec.setCurrentLineItemValue('salesteam', 'salesrole', paramDefPrimeSalesRepRole);
						qrec.setCurrentLineItemValue('salesteam', 'contribution', 100);
						qrec.commitLineItem('salesteam');
						
						var qtid = nlapiSubmitRecord(qrec, true, true);
						qid='(CREATEQT-QuoteID: '+qtid+')';
						//qid='(CREATEQT-TEST)';
						
					} else {
						//Do Not create quote
						qid = '(NO QUOTE-UPD Status ONLY)';
					}
					
					if (qid) {
						//loop through each asset and update their status
						for (var qiu in caitems) {
							nlapiSubmitField('customrecord_ax_cswx_assets', qiu, 'custrecord_ax_cswxa_assetstatus', '1', false);
						}
					}
					
					procCsvBody +='"SUCCESS","'+qid+'",'+
					  '"'+processType+'",'+
					  '"'+isTestMode+'",'+
					  '"'+isOverride+'",'+
					  '"'+trxdate+'",'+
					  '"'+custId+'",'+
					  '"'+custName+'",'+
					  '"'+custSupportText+'",'+
					  '"'+custCreateQuote.toString()+'",'+
					  '"'+quoteFormId+'",'+
					  '"'+nlapiDateToString(prodate)+'",'+
					  '"'+dateToSearch+'",'+
					  '"'+sevenBizDate+'",\n';
				} catch (qtgenerr) {
					log('error','quote error',getErrText(qtgenerr));
					
					procCsvBody +='"ERROR","'+getErrText(qtgenerr)+'",'+
					  '"'+processType+'",'+
					  '"'+isTestMode+'",'+
					  '"'+isOverride+'",'+
					  '"'+trxdate+'",'+
					  '"'+custId+'",'+
					  '"'+custName+'",'+
					  '"'+custSupportText+'",'+
					  '"'+custCreateQuote.toString()+'",'+
					  '"'+quoteFormId+'",'+
					  '"'+nlapiDateToString(prodate)+'",'+
					  '"'+dateToSearch+'",'+
					  '"'+sevenBizDate+'",\n';
				}
			}
			
			//Reschedule logic
			if ( (ars.length == 1000 && (a+1)==1000) || (ctx.getRemainingUsage() <= EXIT_COUNT && (a+1) < ars.length) ) {
				var params = new Array();
				params['custscript_gsrq_assetcid'] = ars[a].getId();
				params['custscript_gsrq_javqfid'] = paramJavQuoteFormId;
				params['custscript_gsrq_adsqfid'] = paramAdsQuoteFormId;
				params['custscript_gsrq_procads'] = ((paramProcessAds=='T')?'T':'F');
				params['custscript_gsrq_custprocdate'] = ((paramCustProcDate)?paramCustProcDate:'');
				params['custscript_gsrq_notifyemails'] = paramNotifyEmails;
				//Mod Req: 11/7/2013
				//Additional customization parameters
				params['custscript_gsrq_trxdtoverride'] = paramTrxDateOverride;
				params['custscript_gsrq_testreconly'] = ((paramProcTestRecOnly=='T')?'T':'F');
				//Mod Req: 11/26/2013
				params['custscript_gsrq_defpsalesrep'] = paramDefPrimeSalesRep;
				params['custscript_gsrq_defpsalesreprole'] = paramDefPrimeSalesRepRole;
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
		
		//send notification
		if (errCsvBody || procCsvBody) {
			var att = new Array();
			var sbj = processType+' Sub. Renewal Quote Generation Status: Proc. Date '+nlapiDateToString(prodate);
			
			var msg = 'Proc Date: '+nlapiDateToString(prodate)+'<br/>'+
					  'Entitlement End Date (70 days from Proc Date): '+dateToSearch+'<br/><br/>'+
					  'Make sure to review attached status log files.';
			
			if (errCsvBody) {
				var relsubfile = nlapiCreateFile('MissingRelatedSubItemError.csv', 'PLAINTEXT', errCsvHeader+errCsvBody);
				att.push(relsubfile);
			}
			
			if (procCsvBody) {
				var procstatusfile = nlapiCreateFile('SubRenewalQuoteGenStatus.csv', 'PLAINTEXT', procCsvHeader+procCsvBody);
				att.push(procstatusfile);
			}
			// changed the sender from -5 to 105
			nlapiSendEmail(105, paramNotifyEmails, sbj, msg, 'mary.mcgowan@javelin-tech.com', null, null, att);
		}
		
		
	} catch (sgenerr) {
		
		log('error','SWX Sub Quote Error',getErrText(sgenerr));
		throw nlapiCreateError('SWXGENQ-1000', getErrText(sgenerr), false);
		
	}
	
	
}
