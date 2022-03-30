/**
 * This Script file contains functions for both UI Suitelet and back end Scheduled Script.
 * UI Suitelet willl allow the user to search for list of Sales Orders that are at Pending Bill, Pending Bill/Partially Fulfilled
 * with reve commitment pending commitment or partially committed and display EACH line to the user.
 * Those that are 0 dollar and 0 quantity will NOT show up on the list.
 * Users can select up to 100 lines of SO line items and submit it for processing.
 * 
 * When Submitted, Suitelet will queue up unscheduled Scheduled Script that will generate Rev. Commit for EACH line selected.
 * It is important to note that some SO lines will not have Booking associated with it. In this case, 
 * Combination of Item, Item Date and Amount will be used to identify the line.
 * Here is the proces:
 * 1. Transform the Sales Order to Rev. Commit.
 * 2. Since NS by default will bring over ALL lines that are not yet commited, process will remove EVERY line that does NOT match what user selected. 
 * 3. Set the Rev.Commit date to Booking Item Option Date. 
 * 4. Save Rev. Commit Record. 
 * 5. Notify user that rev. commit process is completed.
 * 
 */

//9/7/2016 - Ticket 6934
//Request to increase the number of process to 850
//	Added 10 SO JSON parameter fields to support up to 40000 characters
var CONST_MAX_LINE_ALLOWED = 850,
	//Total 10 Parameter fields. Used in Loop
	NUM_PARAMS = 10;

function processCustomRevRecCommit()
{
	//Sept. 7 2016
	//	Added 0 to the ID. Grab all remaining 9 parameter field values
	//var paramJson0 = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb341_sojson0'),
	var	paramJson = '',
		paramUser = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb341_user');
	
	//Loop through NUM_PARAMS and grab ALL String value to parse into Process JSON Object
	for (var p=0; p < NUM_PARAMS; p+=1)
	{
		if (nlapiGetContext().getSetting('SCRIPT', 'custscript_sb341_sojson'+p))
		{
			log('debug','index '+p, nlapiGetContext().getSetting('SCRIPT', 'custscript_sb341_sojson'+p).length);
			paramJson = paramJson + nlapiGetContext().getSetting('SCRIPT', 'custscript_sb341_sojson'+p);
		}
	}
	
	log('debug','paramJson', paramJson.length);
	
	if (!paramJson)
	{
		throw nlapiCreateError('REVCOMERROR', 'SO JSON Is a required parameter', false);
	}
	
	/**
	 * {
	 * 	[SO Internal ID]:[Array of Booking IDs]
	 * }
	 */
	var soJson = null;
	
	try
	{
		soJson = JSON.parse(paramJson);
	}
	catch (jsonerr)
	{
		//Throw error with details
		throw nlapiCreateError(
			'REVCOMERROR', 
			'ParamJson to JSON Object Conversion Error: '+getErrText(jsonerr)+' // Param JSON Value: '+paramJson, 
			false
		);
	}
	
	var procJson = {},
		procMsg = '',
		totalSoToProc = 0,
		totalProcessed = 0,
		hasElementToSend = false;
	
	//Grab total count
	for (var so in soJson)
	{
		totalSoToProc += 1;
	}
	
	//Loop through each json elements and transform each line as its' own rev. commitment.
	for (var so in soJson)
	{
		
		hasElementToSend = true;
		
		procJson[so]={};
		
		log('debug','so // array',so+' // Size of SO Array: '+soJson[so].length);
		
		
		//pass in BOOKING ID||ITEM ID||ITEM DATE||AMOUNT Combo to uniquely identify each line selected.
		
		var arLineBookings = soJson[so];
		
		//loop through each line number and create rev.commit 
		for (var r=0; r < arLineBookings.length; r+=1)
		{
			//Need to LOAD the latest to make sure we don't commit something again
			var soRec = nlapiLoadRecord('salesorder',so);
			
			//Step 1. Break up the string into 4 element array where
			//0 = booking id
			//1 = item id
			//2 = item date
			//3 = amount
			//if element 0 has a value, determine the bookingLineOnSo by findLineItemValue
			//other wise, loop through each and find the first match
			var arLineElements = arLineBookings[r].split('||');
			
			log('debug','arLineElements',arLineElements[0]+' // '+arLineElements[1]+' // '+arLineElements[2]+' // '+arLineElements[3]);

			var bookingLineOnSo = -1;
			
			if (arLineElements[0])
			{
				//Look up the LINE on SO that matches the Booking ID
				bookingLineOnSo = soRec.findLineItemValue('item', 'job', arLineElements[0]);
				log('debug','Booking '+arLineElements[0]+' line on SO','Via findLineItem method: '+bookingLineOnSo);
			}
			else
			{
				//loop through each line and find the match
				for (var sl=1; sl <= soRec.getLineItemCount('item'); sl+=1)
				{
					var itemDate = soRec.getLineItemValue('item','custcol_bo_date', sl);
					var itemId = soRec.getLineItemValue('item','item',sl);
					var itemAmount = soRec.getLineItemValue('item','amount',sl);
					
					//check for each match and when found break out
					if (itemDate == arLineElements[2] && itemId == arLineElements[1] && itemAmount == arLineElements[3])
					{
						bookingLineOnSo = sl;
						log('debug','Booking Line Found Via Loop','Match on line '+sl);
						break;
					}
				}
			}
			
			//MOD added 9/2/2015
			//Make sure to check for -1 bookingLineOnSo.
			//If at this point it is still -1, log it as issue and continue
			if (bookingLineOnSo == -1)
			{
				procJson[so][arLineBookings[r]] = 'Error Rev. Commit Transform for SO ID '+so+' Booking '+arLineBookings[r]+' // Unable to find Matching Line to check committed';
				
				procMsg += 'SO ID '+so+' ('+arLineBookings[r]+'): Error Rev. Commit Transform for SO ID '+so+' Booking '+arLineBookings[r]+' // Unable to find Matching Line to check committed<br/><br/>';
				
				continue;
			}
			
			
			//Make sure this LINE is not already committed
			var revCommitted = soRec.getLineItemValue('item', 'quantityrevcommitted', bookingLineOnSo);
			log('debug','rev com',revCommitted);
			
			if (parseInt(revCommitted) == 0)
			{
				
				var revCommitRec = nlapiTransformRecord('salesorder', so, 'revenuecommitment',{recordmode:'dynamic'});
				//at this point, loop through each line and delete lines that does NOT match THIS line being processed
				//set the date to Item Date
				revCommitRec.setFieldValue('trandate', arLineElements[2]);
				
				var rcline = revCommitRec.getLineItemCount('item');
				for (var i=rcline; i >= 1; i-=1)
				{
					revCommitBookingId = revCommitRec.getLineItemValue('item','job',i);
					
					if (!revCommitRec.getLineItemValue('item', 'amount', i))
					{
						log('debug','Line '+i+' removed','Line Amount is NOT Set/Empty');
						//remove if value is 0
						revCommitRec.removeLineItem('item', i);
					}
					else if (parseFloat(revCommitRec.getLineItemValue('item', 'amount', i)) <= 0)
					{
						log('debug','Line '+i+' removed','Line Amount is 0');
						//remove if value is 0
						revCommitRec.removeLineItem('item', i);
					}
					else if (arLineElements[0] && revCommitBookingId && arLineElements[0] != revCommitBookingId)
					{
						log('debug','Line '+i+' removed','To be Processed Booking ID and revCommitBookingId do not match. Process: '+arLineElements[0]+' // RevCommit Line: '+revCommitBookingId);
						//remove if both to be processed line booking id is set AND revCommitBookingID is set and they do NOT equal eachother
						revCommitRec.removeLineItem('item', i);
					}
					else if (!arLineElements[0])
					{
						//Match against all three OTHER elements and remove line that doesn't match
						var itemDate = revCommitRec.getLineItemValue('item','custcol_bo_date', i);
						var itemId = revCommitRec.getLineItemValue('item','item',i);
						var itemAmount = revCommitRec.getLineItemValue('item','amount',i);
						
						//check for each match and when found break out
						if (itemDate != arLineElements[2] || itemId != arLineElements[1] || itemAmount != arLineElements[3])
						{
							log('debug','Line '+i+' removed','One/All Elements do not match: '+itemDate+'!='+arLineElements[2]+' // '+itemId+'!='+arLineElements[1]+' // '+itemAmount+'!='+arLineElements[3]);
							revCommitRec.removeLineItem('item', i);
						}
					}
				}//End Removing all lines

				log('debug','After removal',revCommitRec.getLineItemCount('item'));
				
				//At this point, if we have MORE than 1 line item left, it means they are ALL duplicate lines that matches same.
				//PICK One and process it
				if (revCommitRec.getLineItemCount('item') > 1)
				{
					var secondTryLineCount = revCommitRec.getLineItemCount('item');
					for (var i=secondTryLineCount; i >= 1; i-=1)
					{
						if (i == 1)
						{
							break;
						}
						
						log('debug','Line '+i+' removed','These are left overs that are same. Leave one and remove all');
						revCommitRec.removeLineItem('item', i);
						
					}
					
					log('debug','After 2nd removal',revCommitRec.getLineItemCount('item'));
				}
				
				//Now Save the new revCommit
				//DO Double check to make sure we ONLY have 1 line left
				
				if (revCommitRec.getLineItemCount('item') == 1)
				{
					try 
					{
						var revCommitId = nlapiSubmitRecord(revCommitRec, true, true);
						procJson[so][arLineBookings[r]] = 'Success. Created Rev. Commit ID: '+revCommitId;
						procMsg += 'SO ID '+so+' ('+arLineBookings[r]+'): Success. Created Rev. Commit ID: '+revCommitId+'<br/><br/>';
					}
					catch (trferr)
					{
						log('error','Error Rev. Commit Transform for SO ID '+so+' Booking '+arLineBookings[r], getErrText(trferr));
						procJson[so][arLineBookings[r]] = 'Error Rev. Commit Transform for SO ID '+so+' Booking '+arLineBookings[r]+' // '+getErrText(trferr);
						
						procMsg += 'SO ID '+so+' ('+arLineBookings[r]+'): Error Rev. Commit Transform for SO ID '+so+' Booking '+arLineBookings[r]+' // '+getErrText(trferr)+'<br/><br/>';
						
					}
				}
			}
		}
		
		//Sept 7 2016
		//After processing each, remove it from soJson
		delete soJson[so];
		
		totalProcessed += 1;
		
		log(
			'debug',
			'Deleting so ID '+so+' from soJson Object // Usage: '+nlapiGetContext().getRemainingUsage(), 
			so+' removed from soJson // Processed: '+totalProcessed+' // Total: '+totalSoToProc+' // soJson String Size: '+JSON.stringify(soJson).length+' // JSON: '+JSON.stringify(soJson)
		);
		
		//Check for Rescheduling
		//Set % completed of script processing
		var pctCompleted = Math.round((totalProcessed / totalSoToProc) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//Reschedule at 3000 left over govt point
		//	3000 should be enough govt. point to process incase it miss the mark
		if (totalProcessed < totalSoToProc && nlapiGetContext().getRemainingUsage() < 3000) 
		{
			//reschedule logic
			//Sept. 7 2016
			//If the size of the stringified JSON is larger than 4000, 
			//	Loop through and next 4000 into each of the parameter values
			//
			//At this point, already processed SO elements are removed
			var jsonStrVal = JSON.stringify(soJson),
				sparam = {};
			
			log('audit','Size of JSON',jsonStrVal.length+' // '+jsonStrVal);
			
			//NOTE: 4000 is max number of characters allowed in NetSuite for Text area.
			if (jsonStrVal.length <= 4000)
			{
				sparam['custscript_sb341_sojson0'] = jsonStrVal;
			}
			else
			{
				var totalLoopCount = Math.ceil(jsonStrVal.length / 4000),
					startindex = 0,
					endindex = 4000;
				
				log('debug','totalLoopCount', jsonStrVal.length+' // '+totalLoopCount);
				
				for (var p=0; p < totalLoopCount; p+=1)
				{
					sparam['custscript_sb341_sojson'+p] = jsonStrVal.substring(startindex, endindex);
					
					startindex = endindex;
					endindex = endindex + 4000;
					
				}
			}
			
			sparam['custscript_sb341_user'] = nlapiGetUser();
			
			log('debug','sparam', JSON.stringify(sparam));
			
			nlapiScheduleScript(
				nlapiGetContext().getScriptId(), 
				nlapiGetContext().getDeploymentId(), 
				sparam
			);
			
			break;
		}
		
		
	}//End For loop of each SO in soJson param passed in
	
	log('debug','Final Result',JSON.stringify(procJson));
	
	//Sept. 7 2016
	// ONLY Generate email if there is something to notify
	if (hasElementToSend)
	{
		//Notify User and for the time being notify joe.son@audaxium.com 
		nlapiSendEmail(-5, paramUser, 'Rev. Commit by SO Line Process Log', procMsg, ['joe.son@audaxium.com']);
	}
}


/**
 * UI Suitelet that gives users ability to search for list of all SO Lines:
 * - No Revenue Commitment
 * - Unbilled
 * @param req
 * @param res
 */
function customRevRecCommitUi(req, res)
{
	//Grab default date range for last month
	var currentDate = new Date();
	var lastMonthCurrentDate = nlapiAddMonths(currentDate, -1);
	lastMonthCurrentDate.setDate(1);
	var lastMonthStart = lastMonthCurrentDate;
	var lastMonthEnd = nlapiAddDays(nlapiAddMonths(lastMonthStart, 1), -1);

	var paramDate = req.getParameter('custparam_bookitemdate');
	if (!paramDate)
	{
		paramDate = req.getParameter('custpage_bookitemdate');
	}
	//IF Still Empty, default to lastMonthStart
	if (!paramDate)
	{
		paramDate = nlapiDateToString(lastMonthStart);
	}
	
	var paramDateTo = req.getParameter('custparam_bookitemdateto');
	if (!paramDateTo)
	{
		paramDateTo = req.getParameter('custparam_bookitemdateto');
	}
	//IF Still Empty, default to lastMonthEnd
	if (!paramDateTo)
	{
		paramDateTo = nlapiDateToString(lastMonthEnd);
	}
	
	var paramSubsidiary = req.getParameter('custparam_subsidiary');
	if (!paramSubsidiary)
	{
		paramSubsidiary = req.getParameter('custpage_subsidiary');
	}
	
	var paramPaymentMethod = req.getParameter('custparam_paymentmethod');
	if (!paramPaymentMethod)
	{
		paramPaymentMethod = req.getParameterValues('custpage_paymentmethod');
	}
	else
	{
		//if param is used, split it out into an array
		paramPaymentMethod = paramPaymentMethod.split(',');
	}
	
	var paramProcMsg = req.getParameter('custparam_procmsg');
	if (!paramProcMsg)
	{
		paramProcMsg = '';
	}
		
	
	//-----------------------------POST ACTION------------------------------------
	if (req.getMethod() == 'POST')
	{
		//At this point, there are less than 100 rows of SO lines submitted for processing.
		var soJson = {};
		var soList = [];
		var lineCount = req.getLineItemCount('custpage_linesl');
		for (var i=1; i <= lineCount; i+=1)
		{
			if (req.getLineItemValue('custpage_linesl','linesl_process',i) == 'T')
			{
				var soId = req.getLineItemValue('custpage_linesl','linesl_soid', i);
				var soLineBookingId = req.getLineItemValue('custpage_linesl','linesl_bookingid',i);
				var soNum = req.getLineItemValue('custpage_linesl','linesl_sonum',i);
				if (!soJson[soId])
				{
					soJson[soId]=[];
					soList.push(soNum);
				}
				
				//pass in BOOKING ID||ITEM ID||ITEM DATE||AMOUNT Combo to uniquely identify each line selected.
				//This is because booking information can be missing for some that still needs to be processed.
				var procLineString = (req.getLineItemValue('custpage_linesl','linesl_bookingid',i)?req.getLineItemValue('custpage_linesl','linesl_bookingid',i):'')+
									 '||'+
									 req.getLineItemValue('custpage_linesl','linesl_itemid',i)+
									 '||'+
									 req.getLineItemValue('custpage_linesl','linesl_itemdate',i)+
									 '||'+
									 //req.getLineItemValue('custpage_linesl','linesl_amount',i);
									 //Oct. 8 2015 - This should be passing in fxamount since the Sales Order is going to be using
									 //	Currency the SO is in.
									 //	linesl_amount is show as GBP
									 //linesl_fxamount
									 req.getLineItemValue('custpage_linesl','linesl_fxamount',i);
				//log('debug','procLineString',procLineString);
				
				soJson[soId].push(procLineString);
			}
		}
		
		//Queue it up for processing
		var procMsg = 'Selected Lines from following Sales Orders are Queued for Processing: '+soList;
		try
		{
			//Sept. 7 2016
			//If the size of the stringified JSON is larger than 4000, 
			//	Loop through and next 4000 into each of the parameter values
			var jsonStrVal = JSON.stringify(soJson),
				sparam = {};
			
			log('debug','Size of JSON',jsonStrVal.length+' // '+jsonStrVal);
			
			//NOTE: 4000 is max number of characters allowed in NetSuite for Text area.
			if (jsonStrVal.length <= 4000)
			{
				sparam['custscript_sb341_sojson0'] = jsonStrVal;
			}
			else
			{
				//Throw Error is size is greater than what it can handle
				if (jsonStrVal.length > (NUM_PARAMS * 4000))
				{
					throw nlapiCreateError(
							'REVREC_ERR', 
							'Totale size of JSON string value is more that allowed (Max '+(NUM_PARAMS * 4000)+')', 
							true
						  );
				}
				//We know it can be processed
				else
				{
					var totalLoopCount = Math.ceil(jsonStrVal.length / 4000),
						startindex = 0,
						endindex = 4000;
					
					log('debug','totalLoopCount', jsonStrVal.length+' // '+totalLoopCount);
					
					for (var p=0; p < totalLoopCount; p+=1)
					{
						sparam['custscript_sb341_sojson'+p] = jsonStrVal.substring(startindex, endindex);
						
						startindex = endindex;
						endindex = endindex + 4000;
						
					}
				}
				
			}
			
			sparam['custscript_sb341_user'] = nlapiGetUser();
			
			log('debug','sparam', JSON.stringify(sparam));
			
			nlapiScheduleScript('customscript_aux_ss_revreccomsolinepc', null, sparam);
		}
		catch (scherr)
		{
			log('error','Error queueing up Rev.Commit Processor','Error queueing up rev.commit process // '+getErrText(scherr)+' // '+JSON.stringify(soJson));
			procMsg = 'Error queueing up rev.commit process // '+getErrText(scherr);
		}
		
		//Need to send back the user selected filter back when redirects so that the filter is properly selected for them
		//Payment method is multiselect and need to be converted to comma separated list.
		//in NS, if even though it's proper array, if you use toString(), it will serialize the object and return string ID instead
		var redirectPaymentIds = req.getParameterValues('custpage_paymentmethod');
		if (redirectPaymentIds && redirectPaymentIds.length > 0)
		{
			var stringVersion = '';
			for (var r=0; r < redirectPaymentIds.length; r+=1)
			{
				stringVersion += redirectPaymentIds[r]+',';
			}
			stringVersion = stringVersion.substr(0, (stringVersion.length -1));
			redirectPaymentIds = stringVersion;
		}
		else
		{
			redirectPaymentIds = '';
		}
		var rparam = {
			'custparam_procmsg':procMsg,
			'custparam_bookitemdate':req.getParameter('custpage_bookitemdate'),
			'custparam_bookitemdateto':req.getParameter('custpage_bookitemdateto'),
			'custparam_subsidiary':req.getParameter('custpage_subsidiary'),
			'custparam_paymentmethod':redirectPaymentIds
		};
		
		log('debug','rparam redirect',JSON.stringify(rparam));
		
		nlapiSetRedirectURL('SUITELET', 'customscript_aux_sl_revreccomsolineui', 'customdeploy_aux_sl_revreccomsolineui', 'VIEW', rparam);
		
	}
	
	var nsform = nlapiCreateForm('Generate Revenue Commitments by SO Line', false);
	nsform.setScript('customscript_aux_cs_revrecsolineuihelp');
	
	var procMsgFld = nsform.addField('custpage_procmsg', 'inlinehtml', '', null, null),
		displayMsg = '';
	procMsgFld.setLayoutType('outsideabove');
	
	if (paramProcMsg)
	{
		if (paramProcMsg.indexOf('Error') > -1)
		{
			displayMsg = '<span style="color:red; font-size: 15px; font-weight:bold">'+
						 paramProcMsg+
						 '</span>';
		}
		else
		{
			displayMsg = '<span style="color:green; font-size: 15px; font-weight:bold">'+
						 paramProcMsg+
						 '</span>';
		}
	}
	procMsgFld.setDefaultValue(displayMsg);
	
	try
	{
		//add search filter field group
		nsform.addFieldGroup('custpage_grpa', 'Search Filter Options', null);
		var bookingItemDateFilter = nsform.addField('custpage_bookitemdate', 'date', 'Booking Item Date From: ', null, 'custpage_grpa');
		bookingItemDateFilter.setBreakType('startcol');
		bookingItemDateFilter.setDefaultValue(paramDate);
		
		var bookingItemDateToFilter = nsform.addField('custpage_bookitemdateto', 'date', 'Booking Item Date To: ', null, 'custpage_grpa');
		bookingItemDateToFilter.setDefaultValue(paramDateTo);
		
		var subsFilter = nsform.addField('custpage_subsidiary','select','Subsidiary: ', 'subsidiary', 'custpage_grpa');
		subsFilter.setBreakType('startcol');
		subsFilter.setDefaultValue(paramSubsidiary);
		
		//search for list of applicable payment methods.
		//Prepaid (4) MUST Always be ignored 
		var pmFilter = nsform.addField('custpage_paymentmethod','multiselect','Payment Method: ', null, 'custpage_grpa');
		pmFilter.setBreakType('startcol');
		var pmflt = [
		             new nlobjSearchFilter('isinactive', null, 'is','F'),
		             new nlobjSearchFilter('internalid', null, 'noneof', '4') //Ignore Prepaid
		             ];
		var pmcol = [
		             new nlobjSearchColumn('internalid').setSort(true),
		             new nlobjSearchColumn('name')
		             ];
		
		var pmrs = nlapiSearchRecord('customlist_paymentmethod', null, pmflt, pmcol);
		//loop through and build in payment methods
		for (var pm=0; pmrs && pm < pmrs.length; pm+=1)
		{
			pmFilter.addSelectOption(pmrs[pm].getValue('internalid'), pmrs[pm].getValue('name'));
		}
		pmFilter.setDefaultValue(paramPaymentMethod);
		//------------------------------------------
		//Transformation: salesorder to revenuecommitment
		
		var lineflt = [
		               new nlobjSearchFilter('mainline', null, 'is', 'F'),
		               new nlobjSearchFilter('shipping', null, 'is', 'F'),
		               new nlobjSearchFilter('cogs', null, 'is', 'F'),
		               new nlobjSearchFilter('taxline', null, 'is', 'F'),
		               new nlobjSearchFilter('custcol_bo_date', null, 'isnotempty',''),
		               //ALL SO Status except for Pending Approval, Closed and Cancelled
		               new nlobjSearchFilter('status', null, 'anyof', ['SalesOrd:G','SalesOrd:D','SalesOrd:F', 'SalesOrd:E','SalesOrd:B']), 
		               new nlobjSearchFilter('revcommitstatus', null, 'anyof', ['B','A']), //Partially Committed, Pending Commitment
		               new nlobjSearchFilter('quantityrevcommitted', null, 'equalto', 0), //Quantity Rev. Committed is 0
		               new nlobjSearchFilter('quantity', null, 'greaterthan',0), //Quantity is greater than 0
		               new nlobjSearchFilter('amount', null, 'greaterthan', 0) //make sure amount is greater than 0
		               ];
		
		//Add in Additional filter based Filters here
		//subsidiary
		
		//custcol_bo_date - Item Option Date
		if (paramDate && paramDateTo) {
			lineflt.push(new nlobjSearchFilter('custcol_bo_date', null, 'within', paramDate, paramDateTo));
		} 
		
		//subsidiary - Subsidiary of Transaction
		if (paramSubsidiary)
		{
			lineflt.push(new nlobjSearchFilter('subsidiary', null, 'anyof', paramSubsidiary));
		}
		
		//custbody_paymentmethod - Payment Method. IF Nothing is passed in, include everything except for Prepaids
		var paymentMethodsList = [];
		if (paramPaymentMethod)
		{
			paymentMethodsList = paramPaymentMethod;
		}
		else
		{
			paymentMethodsList = ['1','2','5','6']; //Invoice, Invoice with PO#, Client unsure if PO needed - TBC, DO NOT CHARGE
		}
		lineflt.push(new nlobjSearchFilter('custbody_paymentmethod',null, 'anyof', paymentMethodsList));
		
		//Build out results
		var formulaCol = new nlobjSearchColumn('formulatext');
		formulaCol.setFormula("case when {customermain.internalid} = {customer.internalid} then 'NA' else 'BOOKING' end");
		
		var linecol = [
		               new nlobjSearchColumn('internalid'), //SO Internal ID
		               new nlobjSearchColumn('statusref'), //SO Trx Status
		               new nlobjSearchColumn('entity'), //Booking On SO Line (select)
		               new nlobjSearchColumn('entitystatus','customer'), //Booking status
		               formulaCol.setSort(true),
		               new nlobjSearchColumn('tranid').setSort(true), //SO Trx Number
		               new nlobjSearchColumn('custcol_bo_date'), //Line Item Option Date
		               new nlobjSearchColumn('linesequencenumber').setSort(true), //Line Sequence Number on SO
		               new nlobjSearchColumn('subsidiarynohierarchy'), //Subsidiary No Hierarchy
		               new nlobjSearchColumn('memomain'), 
		               new nlobjSearchColumn('internalid','customerMain'), //Company Internal ID
		               new nlobjSearchColumn('altname', 'customerMain'), //Company Name
		               new nlobjSearchColumn('custbody_paymentmethod'), //SO Payment Method
		               new nlobjSearchColumn('amount'), //amount
		               //ticket 5161 - Add in Fxamount
		               new nlobjSearchColumn('fxamount'), //Foreign Currency Amount
		               new nlobjSearchColumn('currency'), //Foreign Currency
		               new nlobjSearchColumn('item') //Item
		               ];
		
		var liners = null;
		
		//ONLY do so if atleast ONE search filter is provided
		if (paramDate || paramPaymentMethod || paramSubsidiary)
		{
			liners = nlapiSearchRecord('salesorder', null, lineflt, linecol);
		}
		
		var lineNumber = 1;
		
		//add in sublist with all lines sorted by SO number, and line squence number in DESC
		var sublistLabel = 'Sales Order Lines';
		if (liners && liners.length > 0)
		{
			sublistLabel = 'Sales Order Lines - Total: '+liners.length;
		}
		
		var linesl = nsform.addSubList('custpage_linesl', 'list', sublistLabel, null);
		linesl.addMarkAllButtons();
		
		linesl.addField('linesl_process', 'checkbox', 'Process');
		linesl.addField('linesl_bookingid', 'text', 'Booking Internal ID').setDisplayType('hidden');
		linesl.addField('linesl_bookinglink','textarea','Booking Info').setDisplayType('inline');
		linesl.addField('linesl_bookingstatus','text','Booking Status');
		linesl.addField('linesl_itemid','text','Line Item').setDisplayType('hidden');
		linesl.addField('linesl_itemdate','date','Date').setDisplayType('inline');
		linesl.addField('linesl_soid','text','SO Internal ID').setDisplayType('hidden');
		linesl.addField('linesl_sonum','text','SO Number').setDisplayType('hidden');
		linesl.addField('linesl_solink','textarea','SO Info').setDisplayType('inline');
		linesl.addField('linesl_sostatus','text','SO Status');
		linesl.addField('linesl_linenumber','text','Line Number').setDisplayType('inline');
		linesl.addField('linesl_amount','currency','Line Amount').setDisplayType('inline');
		linesl.addField('linesl_fxamount','currency','Line FX Amount').setDisplayType('inline');
		linesl.addField('linesl_fxcurrency','text','Line FX Currency').setDisplayType('inline');
		linesl.addField('linesl_companyid','text','Company Internal ID').setDisplayType('hidden');
		linesl.addField('linesl_companylink','textarea','Company Info').setDisplayType('inline');
		linesl.addField('linesl_subsidiary','text','Subsidiary');
		linesl.addField('linesl_paymentmethod','text','Payment Method');
		linesl.addField('linesl_memo','textarea','Memo');
		
		linesl.setHelpText('Maximum number of SO Lines allowed to process is '+CONST_MAX_LINE_ALLOWED);
		
		for (var l=0; liners && l < liners.length; l+=1)
		{
			//log('debug','lineNumber',lineNumber);
			//Break out if it's more than 100 
			if (lineNumber > CONST_MAX_LINE_ALLOWED)
			{
				break;
			}
			
			var soLinkText = '<a href="'+
							 nlapiResolveURL('RECORD', 'salesorder', liners[l].getValue('internalid'), 'VIEW')+
							 '" target="_blank">SO #'+
							 liners[l].getValue('tranid')+
							 '</a>';
			
			var arBookingText = liners[l].getText('entity').split(' : ');
			//Assume LAST element in the array is the actual Booking Value
			var bookingTextToUse = arBookingText[arBookingText.length - 1];
			var bookingLinkText = '<a href="'+
								  nlapiResolveURL('RECORD', 'job', liners[l].getValue('entity'), 'VIEW')+
								  '" target="_blank">'+
								  bookingTextToUse+
								  '</a>';
			
			var bookingStatus = liners[l].getText('entitystatus','customer');
			var bookingInternalId = liners[l].getValue('entity');
			
			//IF job and company id are the same, don't display it because NO JOB is selected
			if (liners[l].getValue('entity') == liners[l].getValue('internalid','customerMain'))
			{
				bookingLinkText = 'N/A';
				bookingStatus = 'N/A';
				bookingInternalId = '';
			}
			
			var companyLinkText = '<a href="'+
								  nlapiResolveURL('RECORD', 'customer',liners[l].getValue('internalid','customerMain'), 'VIEW')+
								  '" target="_blank">'+
								  liners[l].getValue('altname','customerMain')+
								  '</a>';
			linesl.setLineItemValue('linesl_itemid', lineNumber, liners[l].getValue('item'));
			linesl.setLineItemValue('linesl_bookingid', lineNumber, bookingInternalId);
			linesl.setLineItemValue('linesl_bookinglink', lineNumber, bookingLinkText);
			linesl.setLineItemValue('linesl_bookingstatus', lineNumber, bookingStatus);
			linesl.setLineItemValue('linesl_soid', lineNumber, liners[l].getValue('internalid'));
			linesl.setLineItemValue('linesl_sonum', lineNumber, liners[l].getValue('tranid'));
			linesl.setLineItemValue('linesl_solink', lineNumber, soLinkText);
			linesl.setLineItemValue('linesl_companyid', lineNumber, liners[l].getValue('internalid','customerMain'));
			linesl.setLineItemValue('linesl_companylink', lineNumber, companyLinkText);
			linesl.setLineItemValue('linesl_itemdate', lineNumber, liners[l].getValue('custcol_bo_date'));
			linesl.setLineItemValue('linesl_subsidiary', lineNumber, liners[l].getText('subsidiarynohierarchy'));
			linesl.setLineItemValue('linesl_paymentmethod', lineNumber, liners[l].getText('custbody_paymentmethod'));
			linesl.setLineItemValue('linesl_memo', lineNumber, liners[l].getValue('memomain'));
			linesl.setLineItemValue('linesl_linenumber', lineNumber, liners[l].getValue('linesequencenumber'));
			linesl.setLineItemValue('linesl_amount', lineNumber, liners[l].getValue('amount'));
			linesl.setLineItemValue('linesl_fxamount', lineNumber, liners[l].getValue('fxamount'));
			linesl.setLineItemValue('linesl_fxcurrency', lineNumber, liners[l].getText('currency'));
			linesl.setLineItemValue('linesl_sostatus', lineNumber, liners[l].getText('statusref'));
			
			lineNumber+=1;
		}
		
		if (liners && liners.length > 0)
		{
			//add submit button first
			nsform.addSubmitButton('Submit SO Lines');
		}
		//add in search button
		nsform.addButton('custpage_searchbtn', 'Search Sales Orders', 'searchForSalesOrders');
		
	}
	
	catch (overallerr)
	{
		log('error','Error RevRec UI', getErrText(overallerr));
		procMsgFld.setDefaultValue(
			'<div style="color:red; font-weight:bold">'+
			'Error processing/generating custom revenue commitments:<br/>'+
			getErrText(overallerr)+
			'</div>'
		);
	}
	
	res.writePage(nsform);
	
}


//****************** Client Script *************************/
function revCommitOnSave()
{
	//Make sure we have atleast one checkbox checked
	var hasLineChecked = false;
	var numChecked = 0;
	for (var i=1; i <= nlapiGetLineItemCount('custpage_linesl'); i+=1)
	{
		if (nlapiGetLineItemValue('custpage_linesl','linesl_process',i)=='T')
		{
			numChecked = numChecked+1;
			if (!hasLineChecked)
			{
				hasLineChecked = true;
			}
		}
	}
	
	//check for max allowed
	if (numChecked > CONST_MAX_LINE_ALLOWED)
	{
		alert('You have selected '+numChecked+' rows to be processed. You can not go over '+CONST_MAX_LINE_ALLOWED);
		return false;
	}
	
	//check for no selection
	if (!hasLineChecked)
	{
		alert('You must select atleast one row for processing');
		return false;
	}
	
	return true;
}

function searchForSalesOrders()
{
	var itemDate = nlapiGetFieldValue('custpage_bookitemdate');
	var itemDateTo = nlapiGetFieldValue('custpage_bookitemdateto');
	var subsidiary = nlapiGetFieldValue('custpage_subsidiary');
	var payMeth = nlapiGetFieldValues('custpage_paymentmethod');
	
	if (!itemDate && !subsidiary && !payMeth)
	{
		alert('Please Provide alteast one filter option');
		return false;
	}
	
	if ((itemDate && !itemDateTo) || (!itemDate && itemDateTo))
	{
		alert('Please provide date range to search');
		return false;
	}
	
	var slUrl = nlapiResolveURL('SUITELET', 'customscript_aux_sl_revreccomsolineui', 'customdeploy_aux_sl_revreccomsolineui', 'VIEW')+
				'&custparam_bookitemdate='+itemDate+
				'&custparam_bookitemdateto='+itemDateTo+
				'&custparam_subsidiary='+subsidiary+
				'&custparam_paymentmethod='+payMeth;
	
	window.ischanged = false;
	window.location = slUrl;
}