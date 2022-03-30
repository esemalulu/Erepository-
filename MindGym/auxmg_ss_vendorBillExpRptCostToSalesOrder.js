

function processCostToSalesOrder() {
	
	//1 grab list of UN-processed queue item
	var qflt = [new nlobjSearchFilter('custrecord_vberq_processed', null, 'is','F'),
	            new nlobjSearchFilter('isinactive', null, 'is','F')];
	var qcol = [new nlobjSearchColumn('internalid').setSort(true),
	            new nlobjSearchColumn('custrecord_vberq_trx'),
	            new nlobjSearchColumn('custrecord_vberq_trxtype')];
	var qrs = nlapiSearchRecord('customrecord_ax_vber_costsync_so', null, qflt, qcol);
	
	for (var i=0; qrs && i < qrs.length; i++) {
		

		//Return out if Gov. is low
		if (nlapiGetContext().getRemainingUsage() <= 1000) {
			log('debug','Gov low','Return out and let it go through on next execution');
			return;
		}
		
		var errmsg = '';
		var lineCount = 0;
		try {

			//billrec; despite the variable name, it can be vendor bill or expense report.
			var billrec = nlapiLoadRecord(qrs[i].getValue('custrecord_vberq_trxtype'), qrs[i].getValue('custrecord_vberq_trx'));
			//save it and load it again to make sure it triggers sync of job and job by supplier columns
			if (qrs[i].getValue('custrecord_vberq_trxtype')=='vendorbill') {
				log('debug','Saving and reloading','saving and reloading');
				nlapiSubmitRecord(billrec, true, true);
				billrec = nlapiLoadRecord(qrs[i].getValue('custrecord_vberq_trxtype'), qrs[i].getValue('custrecord_vberq_trx'));
			}
			
			
			//JSON of all unique booking records in THIS vendor Bill
			/**
			{
				'[bookid]':{
					'currencyinfo':{
						'[currency]':[total],
						..
					},
					'coachfee':xxx,
					'coachcur':yyy,
					'bookingcoach':aaa,
					'bookingitem:zzz
					}
					
				}
			}
			*/
			var bookingjson={};
			
			var bookingids = new Array();
			
			//1. Loop through all Expense list and build unique list of booking id and its' total
			var expcount = billrec.getLineItemCount('expense');
			lineCount = expcount;
			log('debug','expense line count', expcount);
			for (var e=1; e <= expcount; e++) {
				var bookid = billrec.getLineItemValue('expense', 'customer',e);
				if (bookid) {
					
					if (!bookingids.contains(bookid)) {
						bookingids.push(bookid);
					}
				}
			}
			
			log('debug','bookingids',bookingids);
			
			if (bookingids.length > 0) {
				
			
				//Update: Booking can have multiple Vendor Bills and or Expense Report associated to them. We need to grab total from ALL Vendor bills AND Expense Report.
				//2. Search Vendor bills and Expense Reports with matching booking Ids and total them up by Currency by Project
				var vbflt = [new nlobjSearchFilter('type',null,'anyof',['VendBill','ExpRept']),
				             new nlobjSearchFilter('mainline',null,'is','F'),
				             new nlobjSearchFilter('internalid','customer','anyof',bookingids)];
				var vbcol = [
				             new nlobjSearchColumn('internalid','customer','group').setSort(true),
				             new nlobjSearchColumn('currency',null,'group'),
				             new nlobjSearchColumn('stage','customer','group'),
				             new nlobjSearchColumn('amount',null,'sum'),
				             new nlobjSearchColumn('custentity_bo_coach','customer','group'), //Grab booking coach
				             new nlobjSearchColumn('custentity_bo_coachfee2','customer','group'), //Grab coach actual fee on booking
				             new nlobjSearchColumn('custentity_bo_coachfeecurrency', 'customer','group'), //Grab coach currency on booking
				             new nlobjSearchColumn('custentity_bo_item','customer','group') //Grab booking item
				             ];
				var vbrs = nlapiSearchRecord('transaction',null,vbflt, vbcol);
				//build bookingjson total of each booking record by currency
				for (var b=0; b < vbrs.length; b++) {
					var bookid = vbrs[b].getValue('internalid','customer','group');
					var bookvbcur = vbrs[b].getValue('currency',null,'group');
					var bookvbtotal = vbrs[b].getValue('amount',null,'sum');
					var lineType = vbrs[b].getValue('stage','customer','group');
					//Check and Add in Booking sub element
					//log('debug','is it booking record',lineType);
					if (lineType == 'JOB') {
						if (!bookingjson[bookid]) {
							bookingjson[bookid] = {
								'currencyinfo':{}
							};
						}
						
						bookingjson[bookid]['currencyinfo'][bookvbcur] = bookvbtotal;
						//21/1/2015 - Add in additional info for each booking record
						/**
						 * 'coachfee':xxx,
							'coachcur':yyy,
							'bookingcoach':aaa,
							'bookingitem:zzz
						 */
						bookingjson[bookid]['coachfee'] = vbrs[b].getValue('custentity_bo_coachfee2','customer','group');
						bookingjson[bookid]['coachcur'] = vbrs[b].getValue('custentity_bo_coachfeecurrency','customer','group');
						bookingjson[bookid]['bookingcoach'] = vbrs[b].getValue('custentity_bo_coach','customer','group');
						bookingjson[bookid]['bookingitem'] = vbrs[b].getValue('custentity_bo_item','customer','group');
						
					} else {
						bookingids.splice(bookingids.indexOf(bookid), 1);
					}
				}
				
				log('debug','booking json',JSON.stringify(bookingjson));
				log('debug','booking id',bookingids);
				
				if (bookingids.length == 0) {
					log('audit','NO Booking Record found in the line','No Booking Record found. Either line has Customer Record or Nothing on them');
					
					//Update queue record
					nlapiSubmitField('customrecord_ax_vber_costsync_so', 
									 qrs[i].getValue('internalid'), 
									 ['custrecord_vberq_processed','custrecord_vberq_proclog'], 
									 ['T','No Booking Record found. Either line has Customer Record or Nothing on them'], 
									 true);
					
					//log('debug','Used Gov',nlapiGetContext().getRemainingUsage());
					
					continue;
				}
				
				//Add Booking JSON Value
				//errmsg += 'Booking JSON Value:<br/>'+JSON.stringify(bookingjson)+'<br/><br/>';
				
				//3. Search for matching Sales order(s)
				var soflt = [new nlobjSearchFilter('internalid','customer','anyof',bookingids),
				             new nlobjSearchFilter('mainline', null, 'is','F')];
				//, new nlobjSearchFilter('custcol_job_isjob', null, 'is','T')
				var socol = [new nlobjSearchColumn('internalid'),
				             new nlobjSearchColumn('linesequencenumber'),
				             new nlobjSearchColumn('currency'),
				             new nlobjSearchColumn('trandate'),
				             new nlobjSearchColumn('tranid'),
				             new nlobjSearchColumn('internalid','customer')];
				var sors = nlapiSearchRecord('salesorder', null, soflt, socol);
				
				//THIS Assumes there will one or two Maybe Three unique Sales Order. 
				//MOST Likely there will always be ONE booking record on Vendor Bill.
				//var vendorBillCurrency = nlapiGetFieldValue('currency');
				for (var j=0; sors && j < sors.length; j++) {
					var soCurrency = sors[j].getValue('currency');
					var soTranDate = sors[j].getValue('trandate');
					var soNum = sors[j].getValue('tranid');
					var jobId = sors[j].getValue('internalid','customer');
					var soId = sors[j].getValue('internalid');
					
					if (!bookingjson[jobId]) {
						//log('debug','Skipping SO > Job ID: '+jobId,'This job ID does is NOT in Original Booking JSON: '+JSON.stringify(bokingjson));
						continue;
					}
					
					//Set SO ID for THIS Booking
					bookingjson[jobId]['salesorder'] = soId;
					
					//For each jobId, go through and convert each job > Currency total into SO currency and get the total value
					var bookingTotal = 0.0;
					for (var c in bookingjson[jobId]['currencyinfo']) {
						
						if (c == 'salesorder') {
							continue;
						}
						
						var exchangeRate = 1;
						//nlapiExchangeRate
						log('debug','Job ID '+jobId+' // Currency: '+c, 'Exhcange rate: '+exchangeRate);
						if (soCurrency != c) {
							exchangeRate = nlapiExchangeRate(c, soCurrency, soTranDate);
						}
						
						
						
						bookingTotal = parseFloat(bookingTotal) + (parseFloat(bookingjson[jobId]['currencyinfo'][c]) * parseFloat(exchangeRate));
					}
					//log('debug','Booking Total Expense: '+bookingTotal,'For SO Num: '+soNum);
					
					
					try {
						//Load the record, set cost estimate values and save it
						log('debug','SO Line #',sors[j].getValue('linesequencenumber'));
						var sorec = nlapiLoadRecord('salesorder',sors[j].getValue('internalid'),{recordmode:'dynamic'});
						sorec.selectLineItem('item', sors[j].getValue('linesequencenumber'));
						sorec.setCurrentLineItemText('item', 'costestimatetype', 'CUSTOM');
						sorec.setCurrentLineItemValue('item','costestimate', bookingTotal);
						sorec.commitLineItem('item');
					
						var soIdUpdated = nlapiSubmitRecord(sorec,true,true);
						
						//log('debug','Remaining Gov after SO Update',nlapiGetContext().getRemainingUsage());
						
						errmsg += '\n-----------'+'Updated SO Num '+soNum+' ('+soIdUpdated+')';
					} catch (soupderr) {
						log('error','Error Updating SO Num '+soNum, getErrText(soupderr));
						
						errmsg += '\n-----------'+'Error Updating SO Num '+soNum+'//'+getErrText(soupderr);
						
						//Check to see if error thrown is ude to gov point limit SSS_USAGE_LIMIT_EXCEEDED
						if (getErrText(soupderr).indexOf('SSS_USAGE_LIMIT_EXCEEDED') > -1) {
							//throw the error and make sure it doesn't get marked as Processed
							throw nlapiCreateError('SYNCVB-GOVERR','Failed due to SSS_USAGE_LIMIT_EXCEEDED issue: '+getErrText(soupderr));
						}
					}
				}
				
				//Update Vendor Bill with Sales Order link custcol3
				try {
					//billrec
					var vbrec = billrec;
					log('debug','Trx ID',vbrec.getId());
					var updatetrx = false;
					for (var h=1; h <= vbrec.getLineItemCount('expense'); h++) {
						
						//default using line booking id to use native customer field
						var lineBookingIdToUse = vbrec.getLineItemValue('expense','customer',h);
						
						//ONLY Execute value syncing if record type is vendor bill
						if (vbrec.getRecordType() == 'vendorbill') {
							
							var lineBookingId = vbrec.getLineItemValue('expense','customer',h);
							var lineBookingIdByCoach = vbrec.getLineItemValue('expense','custcol_column_jobbysupplier',h);
							
							//ONLY Process syncing of the Job # and Job # By Supplier if line Booking ID is missing
							if ( !lineBookingId && lineBookingIdByCoach) {
								
								//set it to use custom column
								lineBookingIdToUse = lineBookingIdByCoach;
									
								log('debug','Line '+h,'[lineBookingIdByCoach] Set Value fo custom Job # to native field value with '+lineBookingIdByCoach);
									
								vbrec.setLineItemValue('expense', 'customer', h, lineBookingIdByCoach);
								
								updatetrx = true;
							}
						}
						
						//Move forward as long as we have lineBookingIdToUse
						if (lineBookingIdToUse) {
							//log('debug','Line '+h+' custocol3 value',vbrec.getLineItemValue('expense','custcol3',h));
							if (bookingjson[lineBookingIdToUse] &&
								bookingjson[lineBookingIdToUse]['salesorder'] &&
								vbrec.getLineItemValue('expense','custcol3',h) != bookingjson[lineBookingIdToUse]['salesorder']) {
								
								//log('debug','so for this booking',bookingjson[vbrec.getLineItemValue('expense','customer',h)]['salesorder']);
								updatetrx = true;
								
								//Set the SO column
								vbrec.setLineItemValue('expense', 'custcol3', h, bookingjson[lineBookingIdToUse]['salesorder']);
								
							}
							
							//21/1/2015 - Sync up item 
							var paramVbFormIds = nlapiGetContext().getSetting('SCRIPT','custscript_sct323_vbasformids');
							//Coach: Fee - Value is hard coded since coach fee category won't normally change
							var paramCoachCategory = '33';
							
							//ONLY Process if script param value is provided
							if (paramVbFormIds) {
								//Convert the param into an array
								paramVbFormIds = paramVbFormIds.split(',');
								
								//Only Process VB to set coach fee based on coach currency and item IF it's using matching form
								if (paramVbFormIds.contains(vbrec.getFieldValue('customform')) && vbrec.getLineItemValue('expense', 'category', h) == paramCoachCategory) {
									
									var bookingItemValue = '';
									if (bookingjson[lineBookingIdToUse] && bookingjson[lineBookingIdToUse].bookingitem) {
										bookingItemValue = bookingjson[lineBookingIdToUse].bookingitem;
										//check to make sure it's not an inactive item
										var itemInactive = nlapiLookupField('item',bookingItemValue,'isinactive');
										
										if (itemInactive == 'T') {
											bookingItemValue = '';
										}
									}
									
									//Next process setting coach fee (exchange rate converted value)
									var convertedActualFee = 0.0;
									var coachActualFee = (bookingjson[lineBookingIdToUse] && bookingjson[lineBookingIdToUse].coachfee)?bookingjson[lineBookingIdToUse].coachfee:0.0;
									var coachCurrency = (bookingjson[lineBookingIdToUse] && bookingjson[lineBookingIdToUse].coachcur)?bookingjson[lineBookingIdToUse].coachcur:'1';
									var exchangeRate = 1;
									//nlapiExchangeRate
									if (vbrec.getFieldValue('currency') != coachCurrency) {
										exchangeRate = nlapiExchangeRate(coachCurrency, 
																		 vbrec.getFieldValue('currency'), 
																		 vbrec.getFieldValue('trandate'));
									}
									
									convertedActualFee = parseFloat(coachActualFee) * parseFloat(exchangeRate);
									
									//Set the values on the line
									vbrec.setLineItemValue('expense', 'custcol_column_coach_fee_actual', h, convertedActualFee);
									vbrec.setLineItemValue('expense', 'custcol_column_bookingitem', h, bookingItemValue);
									updatetrx = true;
								}
							}//End check for vb param
						}//End check for booking id to use
						
					}//End Vendor Bill update Forloop
					
					if (updatetrx) {
						nlapiSubmitRecord(vbrec, false, true);
					}
					
					
				} catch (updatevberr) {
					throw nlapiCreateError('SYNCVB-SB-VBUPDERR', 'Error Updating '+qrs[i].getValue('custrecord_vberq_trxtype')+' with Matching Sales Order Reference: '+getErrText(updatevberr), true);
				}
				
			}
			
		} catch (synccosterr) {
			log('error','Error Syncing '+qrs[i].getValue('custrecord_vberq_trxtype')+' Cost to Sales order', 
						qrs[i].getValue('custrecord_vberq_trx')+':'+qrs[i].getValue('custrecord_vberq_trxtype')+' // '+getErrText(synccosterr));
			errmsg += '<b>Error Details:</b><br/>'+getErrText(synccosterr);
			
			
		}
		
		var isProcessed = 'T';
		if (errmsg.indexOf('Error Details') > -1) {
			isProcessed = 'F';
		}
		
		//Update queue record
		nlapiSubmitField('customrecord_ax_vber_costsync_so', qrs[i].getValue('internalid'), ['custrecord_vberq_processed','custrecord_vberq_proclog'], [isProcessed,'Total Line: '+lineCount+' // '+errmsg], true);
		log('debug','Used Gov',nlapiGetContext().getRemainingUsage());
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / qrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
	}
	
}