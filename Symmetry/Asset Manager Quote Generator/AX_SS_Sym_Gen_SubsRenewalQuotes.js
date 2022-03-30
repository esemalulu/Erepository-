/**
 * Scheduled script to run DAILY to generate Subscription Renewal Quotes from SWX Customer Assets.
 * System will generate Quotes for following SWX Customer Assets
 * - Processing Date is 50 days from Entitlement End Date
 *   50 days is company level parameter SWX Quote Generator: Days to Ent. Date (custscript_gsrq_numdaystoentdate)
 * - Asset Status is "Renewed"
 * 	 "Renewed" is company level parameter: SWX Quote Generator: Renewed Status (custscript_gsrq_renewedstatusid) 
 */
var ctx = nlapiGetContext();

//Company Level parameter for calculating entitlement end date from current date
var paramDaysToEntDate = ctx.getSetting('SCRIPT','custscript_gsrq_numdaystoentdate');
//Company Level parameter for calculating Payment Due Date
var paramDaysToPayment = ctx.getSetting('SCRIPT','custscript_gsrq_numdaysduedate');
//Company Level parameter for Renewed asset status
var paramRenewedStatus = ctx.getSetting('SCRIPT','custscript_gsrq_renewedstatusid');
var paramUpForRenewalStatus = ctx.getSetting('SCRIPT','custscript_gsrq_ufrenewalstatusid');
var paramRenewQuoteFormId = ctx.getSetting('SCRIPT','custscript_gsrq_renewalqfid');
var paramRenewCcQuoteFormId = ctx.getSetting('SCRIPT','custscript_gsrq_renewalccqfid');


var paramLastProcAssetCustId = ctx.getSetting('SCRIPT','custscript_gsrq_assetcid');
var paramCustProcDate = ctx.getSetting('SCRIPT','custscript_gsrq_custprocdate');
//Mod Request: 11/7/2013
//Allow user to Custom Transaction date when executed in Custom Mode.
var paramTrxDateOverride = ctx.getSetting('SCRIPT','custscript_gsrq_trxdtoverride');

//Mod Request: 9/15/2015
//Alow user to provide Payment Date Override
var paramPayDateOverride = ctx.getSetting('SCRIPT','custscript_gsrq_paydtoverride');

//Allow user to execute ONLY Test Records
//When checked, it will ONLY process records with custrecord_ax_cswxa_testrec checked
var paramProcTestRecOnly = ctx.getSetting('SCRIPT','custscript_gsrq_testreconly');
if (paramProcTestRecOnly != 'T') {
	paramProcTestRecOnly = 'F';
}

var paramExecUser = ctx.getSetting('SCRIPT','custscript_gsrq_execuser');

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
	//Entitlement that is paramDaysToEntDate days from current or custom date
	//MOD Req 1/18/2013 - use 70 days
	var dateToSearch = nlapiDateToString(nlapiAddDays(prodate, parseInt(paramDaysToEntDate)));
	
	var errCsvHeader = 'Customer Asset ID,Customer ID, Customer Name,  Customer RM//RA,  Create Quote, NS Item, Related Subs Item\n';
	var errCsvBody = '';
	
	//csv for process
	var procCsvHeader = 'Status, Msg, Process Type, Is Test Mode, Is Trx Date Override, Trx Date Used, Customer ID, Customer Name, Customer RM//RA, Create Quote, Quote Form Used, Proc Date, E.End Date, Due Date (7 Biz Days)\n';
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

		if (!paramRenewQuoteFormId || !paramRenewCcQuoteFormId) {
			throw nlapiCreateError('SWXGENQ-0001', 'Quote forms to use for both Renewal and Renewal CC must be provided', true);
		}
		
		//look for matching assets and group the result by customer
		//business days means Monday through Friday
		var paymentBizDate = null;
		
		if (!paramPayDateOverride)
		{
			var numDays = 0;
			//loop until you get to parseInt(paramDaysToPayment) days BEFORE entitlement date
			while (numDays < parseInt(paramDaysToPayment)) {
			  if (!paymentBizDate) {
			    paymentBizDate = nlapiStringToDate(dateToSearch);
			  }
			  //add one day
			  paymentBizDate = nlapiAddDays(paymentBizDate, -1);
			  //0 = Sunday
			  //6 = Sat
			  //5/21/2014 - Make it 7 Calendar Days.
			  //	Leave Business days coding in place just incase
			  //if (paymentBizDate.getDay() != 0 && paymentBizDate.getDay()!=6) {
				  numDays++;
			  //}
			}
			paymentBizDate = nlapiDateToString(paymentBizDate);
			log('debug','Entitlement Date to Search','Today: '+prodate+' // '+paramDaysToEntDate+' Days: '+dateToSearch+' // -'+paramDaysToPayment+' Business Days: '+paymentBizDate);
		}
		else
		{
			//Use Override Date instead of calculated date
			paymentBizDate = paramPayDateOverride;
			log('debug','PaymentBizDate Using Override Value', paymentBizDate +' // '+ paramPayDateOverride);
		}
		
		//Asset Status 4 = Renewed
		var aflt = [new nlobjSearchFilter('custrecord_ax_cswxa_entitleenddt', null, 'on',dateToSearch),
		            new nlobjSearchFilter('custrecord_ax_cswxa_assetstatus', null, 'anyof',paramRenewedStatus),
		            new nlobjSearchFilter('custrecord_ax_cswxa_testrec',null, 'is',paramProcTestRecOnly),
					new nlobjSearchFilter('isinactive', null, 'is','F')];
		
		//process where it left off
		if (paramLastProcAssetCustId) {
			aflt.push(new nlobjSearchFilter('internalidnumber','custrecord_ax_cswxa_customer', 'lessthan',paramLastProcAssetCustId));
		}
		
		
		//grab list of customer to process
		var acol = [new nlobjSearchColumn('internalid','CUSTRECORD_AX_CSWXA_CUSTOMER','group').setSort(true),
		            new nlobjSearchColumn('entityid','CUSTRECORD_AX_CSWXA_CUSTOMER','group'),
		            new nlobjSearchColumn('custentity_subautopay','custrecord_ax_cswxa_customer','group'),
		            new nlobjSearchColumn('custentity_quarterlyrenewal','custrecord_ax_cswxa_customer','group')];
		
		var ars = nlapiSearchRecord('customrecord_ax_cswx_assets', null, aflt, acol);
		
		/**
		 * Renewal method
		 * 1 = Open PO
		 * 2 = Credit Card
		 * 3 = Manual
		 * 4 = SolidWorks Direct
		 * 
		 * 6/10/2016 - Request to remove Other VAR from Generating Quote
		 * 5 = Other VAR
		 */
		
		for (var a=0; ars && a < ars.length; a++) {
			
			var quoteFormId = paramRenewQuoteFormId;
			var newEntitlementEndDate = '';
			var poNumber = '';
			//annual = custitem_ax_relannualsubsitem
			//quarterly = custitem_ax_relquarterlysubsitem
			var relatedItemFieldId = '';
			
			var custId = ars[a].getValue('internalid','CUSTRECORD_AX_CSWXA_CUSTOMER','group');
			var custName = ars[a].getValue('entityid','CUSTRECORD_AX_CSWXA_CUSTOMER','group');
			
			var custRenewalMethodId = ars[a].getValue('custentity_subautopay','custrecord_ax_cswxa_customer','group');
			var custRenewalMethodText = ars[a].getText('custentity_subautopay','custrecord_ax_cswxa_customer','group');
			var custIsQuarterlyRenewalAccount = ars[a].getValue('custentity_quarterlyrenewal','CUSTRECORD_AX_CSWXA_CUSTOMER','group');
			
			var custRmRaVal = custRenewalMethodText+'//'+custIsQuarterlyRenewalAccount;
			
			var custCreateQuote = true;
			//do not create quote for Manual or SolidWorks Direct
			//6/10/2016 - DO not create quote if reneal method is Other VAR
			if (custRenewalMethodId == '3' || custRenewalMethodId == '4' || custRenewalMethodId == '5') {
				custCreateQuote = false;
			}
			
			//Use Case Scenarios.
			//TODO:Assume that IF NO Match, DO NOT Create Quote
			var expDateObj = new Date(dateToSearch);
			
			//check for UC 3 and 4
			//Method is Credit Card
			if (custRenewalMethodId == '2') {
				quoteFormId = paramRenewCcQuoteFormId;
				poNumber = 'Credit Card';
			} else {
				//UC 1 and 2 - All Other
				quoteFormId = paramRenewQuoteFormId;
				poNumber = '';
			}
			
			//annual = custitem_ax_relannualsubsitem
			//quarterly = custitem_ax_relquarterlysubsitem
			if (custIsQuarterlyRenewalAccount=='T') {
				relatedItemFieldId = 'custitem_ax_relquarterlysubsitem';
				newEntitlementEndDate = nlapiDateToString(nlapiAddMonths(expDateObj, 3)); 
			} else {
				relatedItemFieldId = 'custitem_ax_relannualsubsitem';
				newEntitlementEndDate = nlapiDateToString(nlapiAddMonths(expDateObj, 12));
			}
			
			
			//object to hold asset items information
			var caitems = {};
			/**
			 * Errors are produced when:
			 * 1. Any of item is missing Related Subscription item
			 */
			var hasError = false;
			//get list of Assets for THIS client
			var asflt = [new nlobjSearchFilter('custrecord_ax_cswxa_entitleenddt', null, 'on',dateToSearch),
			             new nlobjSearchFilter('custrecord_ax_cswxa_assetstatus', null, 'anyof',paramRenewedStatus),
			             new nlobjSearchFilter('custrecord_ax_cswxa_testrec',null, 'is',paramProcTestRecOnly),
			             new nlobjSearchFilter('custrecord_ax_cswxa_customer', null, 'anyof',custId),
						 new nlobjSearchFilter('isinactive', null, 'is','F')];
			
			var ascol = [new nlobjSearchColumn('custrecord_ax_cswxa_nsitem'),
			             new nlobjSearchColumn(relatedItemFieldId,'custrecord_ax_cswxa_nsitem'),
			             new nlobjSearchColumn('custrecord_ax_cswxa_serialnum'),
			             new nlobjSearchColumn('custrecord_ax_cswxa_qty')];
			var asrs = nlapiSearchRecord('customrecord_ax_cswx_assets', null, asflt, ascol);
			
			//assume there are items returned
			for (var s=0; s < asrs.length; s++) {
				
				var subitemid = asrs[s].getValue(relatedItemFieldId,'custrecord_ax_cswxa_nsitem');
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
					log('error','has error '+asrs[s].getId(), 'missing sub item id (Field ID: '+relatedItemFieldId+')');
					hasError = true;
					errCsvBody+= '"'+asrs[s].getId()+'",'+
								 '"'+custId+'",'+
								 '"'+custName+'",'+
								 '"'+custRmRaVal+'",'+
								 '"'+custCreateQuote.toString()+'",'+
								 '"'+nsitemtext+'('+nsitemid+')",'+
								 '"'+subitemid+'"\n';
							   
				}
			}
			
			//ONLY Process IF there are no errors
			if (hasError) {
				log('error','Cust ID has error',custId+' has missing '+relatedItemFieldId+' sub items');
				procCsvBody +='"ERROR","One/More linked Item(s) missing '+relatedItemFieldId+' Subs Item",'+
							  '"'+processType+'",'+
							  '"'+isTestMode+'",'+
							  '"'+isOverride+'",'+
							  '"'+trxdate+'",'+
							  '"'+custId+'",'+
							  '"'+custName+'",'+
							  '"'+custRmRaVal+'",'+
							  '"'+custCreateQuote.toString()+'",'+
							  '"'+quoteFormId+'",'+
							  '"'+nlapiDateToString(prodate)+'",'+
							  '"'+dateToSearch+'",'+
							  '"'+paymentBizDate+'",\n';
			} else {
				var qid = '';
				try {
				
					if (custCreateQuote) {
					
						//2/17/2016 - client requested to default each line' Tax Rate to 0% and Tax Code to AVATAX
						//			  IF client records default shipping address has a value filled infor Entity/Use Code custom address line field.
						//			  This custom address line field is added by AVA tax user event script dynamically.
						//			  Mapping is provided on AVAENTITYUSEMAPPING_NEW	1894	customrecord_avaentityusemapping_new custom record
						//			  we need to grab address ID of default shipping address and search against above custom record
						//			  to see a line exists where customer = customer id and address id = shipping address line id
						var setAvaTax = false,
							custRec = nlapiLoadRecord('customer',custId),
							defShipAddrLine = custRec.findLineItemValue('addressbook','defaultshipping','T'),
							defShipAddrId = '',
							//defTaxRate = 0.0,
							//AVATAX code id is 2215 in production
							defTaxCodeId = '2215';
						
						if (defShipAddrLine > -1)
						{
							defShipAddrId = custRec.getLineItemValue('addressbook','id',defShipAddrLine);
						}
							
						//Execute ONLY if defShipAddrId is NOT NULL
						if (defShipAddrId)
						{
							var avaflt = [new nlobjSearchFilter('custrecord_ava_customerid_new', null, 'anyof', custId),
							              new nlobjSearchFilter('custrecord_ava_addressid_new', null, 'is', defShipAddrId),
							              new nlobjSearchFilter('custrecord_ava_entityusemap_new', null, 'noneof', '@NONE@'),
							              new nlobjSearchFilter('isinactive', null,'is','F')],
								avacol = [new nlobjSearchColumn('internalid'),
								          new nlobjSearchColumn('custrecord_ava_entityusemap_new')],
								avars = nlapiSearchRecord('customrecord_avaentityusemapping_new', null, avaflt, avacol);
							
							if (avars && avars.length > 0)
							{
								setAvaTax = true;
							}
						}
						
						log('debug','avatax/rate test result','Def. Ship Addr ID: '+defShipAddrId+' // setAvaTax: '+setAvaTax);
						
						//create Quote
						var qrec = nlapiCreateRecord('estimate', {recordmode: 'dynamic',customform: quoteFormId});
						qrec.setFieldValue('entity', custId);
						qrec.setFieldValue('trandate', trxdate);
						qrec.setFieldValue('title','Subscription Renewal');
						qrec.setFieldText('terms','Subscription Renewal');
						qrec.setFieldValue('duedate', paymentBizDate);
						qrec.setFieldValue('enddate', newEntitlementEndDate);
						qrec.setFieldValue('otherrefnum',poNumber);
						
						for (var qi in caitems) 
						{
							qrec.selectNewLineItem('item');
							qrec.setCurrentLineItemValue('item', 'item', caitems[qi].subitemid);
							qrec.setCurrentLineItemValue('item', 'quantity', caitems[qi].qty);
							//Mod Req: 5/10/2014 - Add serial number to the quote
							qrec.setCurrentLineItemValue('item', 'custcol_axswx_quote_serialnum', caitems[qi]['serial']);
							
							//2/17/2016 - If customer has shipping address with Entity/Unit code filled, default lines to avatax
							if (setAvaTax)
							{
								qrec.setCurrentLineItemValue('item', 'taxrate1', '0.0');
								qrec.setCurrentLineItemValue('item', 'taxcode', defTaxCodeId);
								//3/3/2016 - NetSuite work around to set custcol_ava_taxcodemapping to NT
								qrec.setCurrentLineItemValue('item', 'custcol_ava_taxcodemapping', 'NT');
								
							}
							
							
							qrec.commitLineItem('item');
						}						
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
							nlapiSubmitField('customrecord_ax_cswx_assets', qiu, 'custrecord_ax_cswxa_assetstatus', paramUpForRenewalStatus, false);
						}
					}
					
					procCsvBody +='"SUCCESS","'+qid+'",'+
					  '"'+processType+'",'+
					  '"'+isTestMode+'",'+
					  '"'+isOverride+'",'+
					  '"'+trxdate+'",'+
					  '"'+custId+'",'+
					  '"'+custName+'",'+
					  '"'+custRmRaVal+'",'+
					  '"'+custCreateQuote.toString()+'",'+
					  '"'+quoteFormId+'",'+
					  '"'+nlapiDateToString(prodate)+'",'+
					  '"'+dateToSearch+'",'+
					  '"'+paymentBizDate+'",\n';
				} catch (qtgenerr) {
					log('error','quote error',getErrText(qtgenerr));
					
					procCsvBody +='"ERROR","'+getErrText(qtgenerr)+'",'+
					  '"'+processType+'",'+
					  '"'+isTestMode+'",'+
					  '"'+isOverride+'",'+
					  '"'+trxdate+'",'+
					  '"'+custId+'",'+
					  '"'+custName+'",'+
					  '"'+custRmRaVal+'",'+
					  '"'+custCreateQuote.toString()+'",'+
					  '"'+quoteFormId+'",'+
					  '"'+nlapiDateToString(prodate)+'",'+
					  '"'+dateToSearch+'",'+
					  '"'+paymentBizDate+'",\n';
				}
			}
			
			//Reschedule logic
			if ( (ars.length == 1000 && (a+1)==1000) || (ctx.getRemainingUsage() <= EXIT_COUNT && (a+1) < ars.length) ) {
				var params = new Array();
				params['custscript_gsrq_assetcid'] = ars[a].getId();
				params['custscript_gsrq_custprocdate'] = ((paramCustProcDate)?paramCustProcDate:'');
				params['custscript_gsrq_trxdtoverride'] = paramTrxDateOverride;
				params['custscript_gsrq_testreconly'] = ((paramProcTestRecOnly=='T')?'T':F);
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
					  'Entitlement End Date ('+paramDaysToEntDate+' days from Proc Date): '+dateToSearch+'<br/><br/>'+
					  'Make sure to review attached status log files.';
			
			if (errCsvBody) {
				var relsubfile = nlapiCreateFile('MissingRelatedSubItemError.csv', 'PLAINTEXT', errCsvHeader+errCsvBody);
				att.push(relsubfile);
			}
			
			if (procCsvBody) {
				var procstatusfile = nlapiCreateFile('SubRenewalQuoteGenStatus.csv', 'PLAINTEXT', procCsvHeader+procCsvBody);
				att.push(procstatusfile);
			}

			var notifyId = '-5';
			if (paramExecUser) {
				notifyId = paramExecUser;
			}
			
			nlapiSendEmail(-5, notifyId, sbj,msg, ['lan.huynh@symsolutions.com','tammy.schmidt@symsolutions.com'], null, null, att,true);
		}
		
		
	} catch (sgenerr) {
		
		log('error','SWX Sub Quote Error',getErrText(sgenerr));
		throw nlapiCreateError('SWXGENQ-1000', getErrText(sgenerr), false);
		
	}
	
	
}
