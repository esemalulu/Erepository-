function makeCustomerCurrent(type)
{
    var log = SPR.UTIL.Log;
 
    log.audit('started');
    
	if (type != 'delete')
	{
		//Mod 3/2/2015 - JS@Audaxium
		//Moving variable declaration outside try block to allow error email generation to work properly
		var customer = '';
		try
		{
		    SPR.UTIL.PerfTimer.start();
		    
		    
			//load the transaction record
			var transactionRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			
//			SPR.UTIL.PerfTimer.stopAndLogResult('Loading invoice record');
//			SPR.UTIL.PerfTimer.start();
			
			//retrieve the customer id
			customer = transactionRecord.getFieldValue('entity');
			//create an array for the status, class, and status subset from the customer record
			//var fields = ['entitystatus','custentity44','custentity316'];
			//8/12/2016 - No need to look up substatus
			var fields = ['entitystatus','custentity44'];
			//lookup the status and class fields from the customer record
			var customerFields = nlapiLookupField('customer', customer, fields);
			//create a variable for the customer status
			var customerStatus = customerFields.entitystatus;
			//create a variable for the customer class
			var customerClass = customerFields.custentity44;
			//create a variable for the customer class
			//var customerStatusSubset = customerFields.custentity316;
			//if the customer class is Dealer Services, Lender Services, LPX - Express Services, or National Accounts
			//3/4/2015 JS@Audaxium.com Modification
			//Add in additional Class that are currently Missing from here
			//117 CAC 
			//62 Unallocated - ASG
			//Mod 12/24/2015-Christina Evans requested that they are going to make another change.
			//	- Modifying this to be sourced from general preferences instead.
			var trxClasses = nlapiGetContext().getSetting('SCRIPT', 'custscript_sc31_trxclasses');
			nlapiLogExecution('debug','trxClasses',trxClasses);
			if (trxClasses)
			{
				trxClasses = trxClasses.split(',');
				nlapiLogExecution('debug','trxClasses Array Version',trxClasses);
			}
			
			//if(customerClass == 64 || customerClass == 33 || customerClass == 97 || customerClass == 96 || customerClass == 117 || customerClass == 62)
			if (trxClasses.indexOf(customerClass) > -1)
			{
				/** With new requested requirement, these lookup are no longer needed
				//retrieve the transaction date
				var tranDate = transactionRecord.getFieldValue('trandate');
				//search for the customer date of first sale
				var searchResult = nlapiSearchRecord('customer', null, new nlobjSearchFilter('internalid', null, 'anyof', customer), new nlobjSearchColumn('firstsaledate'));
				
				
//				SPR.UTIL.PerfTimer.stopAndLogResult('customer search');
//				SPR.UTIL.PerfTimer.start();
				
				//create a variable for the customer date of first sale
				var dateOfFirstSale = searchResult[0].getValue('firstsaledate');
				*/
				
				//retrieve the transaction item count
				var lineItemCount = transactionRecord.getLineItemCount('item');
				//initiate item variable
				var item = '';
				//initiate item type variable
				var itemType = '';
				//initiate device quantity variable
				var deviceQuantity = 0;
								
				//for each line item
				for (var i=1; i<=lineItemCount; i++)
				{
					//retrieve the item internal id
					item = transactionRecord.getLineItemValue('item', 'item', i);
					//lookup the item commission type
					//itemType = nlapiLookupField('item', item, 'custitem_commissiontype');
					//4/4/2015 - Turned off lookupField API call per line to reduce gov. usage and improve performance.
					//			 Reactivated custom column custcol_commissiontype to have the value sourced on record load and upon setting of line item ITEM value
					itemType = transactionRecord.getLineItemValue('item','custcol_commissiontype', i);
					//if the item commission type is GPS Device or Lender Services or Position Plus Device
					if (itemType == '1' || itemType == '5' || itemType == '11')
					{
						//add the line item quantity to the device quantity
						deviceQuantity += parseInt(transactionRecord.getLineItemValue('item', 'quantity', i));
					}
				}
				//if the customer class is Lender Services, LPX - Express Services, or National Accounts or dealer services and the device quantity is at least 1; 
				//4/4/2015 - Original logic of dealer service with qty of more tha 5 removed per Christina Evans request
				//or the customer class is dealer services and the device quantity is at least 5
				if (deviceQuantity >= 1)
				{
					//Starting 8/1/2016 NEW LOGIC
					// NBO Trial (custbody_nbo)
					//		- This box is checked when it is a brand new transaction for the client
					//			or
					//		- if previous trx date to THIS trx is more than 365 days
					// NBO Conversion (custbody99)
					//		- if THIS trx is within 120 days of previous trx
					//			AND 
					//		  previous trx is marked as nbo trial
					// NBO Winback 
					//		- if THIS trx is between 120 and 365 days of previous trx
					//			AND
					//		  previous trx is marked as nbo trial
					//
					//		OR
					//		
					//		- if Customer is LOST 
					//			AND
					//		  previous trx is NOT nbo trial
					//			AND
					//		  THIS trx is before 365 days of last order
					
					//Customer status value customerStatus
					//1. let's grab previous trx JSON
					var ptflt = [new nlobjSearchFilter('type', null, 'anyof', ['CustInvc','CashSale']),
					             new nlobjSearchFilter('name', null, 'anyof', customer),
					             new nlobjSearchFilter('mainline', null, 'is', 'T'),
					             new nlobjSearchFilter('internalid', null, 'noneof', nlapiGetRecordId())],
						ptcol = [new nlobjSearchColumn('trandate').setSort(true),
						         new nlobjSearchColumn('internalid'),
						         new nlobjSearchColumn('custbody_nbo'), //NBO Trial flag
						         new nlobjSearchColumn('custbody99'), //NBO Conversion
						         new nlobjSearchColumn('custbody_winbackorder')], //NBO Winback
						ptrs = nlapiSearchRecord('transaction', null, ptflt, ptcol),
						hasPrevtrx = false,
						ptjson ={
							'dateobj':'',
							'thistrxdate':'',
							'datediff':0,
							'nbotrial':'',
							'nboconv':'',
							'winback':''
						};
					
					if (ptrs && ptrs.length > 0)
					{
						hasPrevtrx = true;
						ptjson.dateobj = nlapiStringToDate(ptrs[0].getValue('trandate'));
						ptjson.nbotrial = (ptrs[0].getValue('custbody_nbo')=='T')?true:false;
						ptjson.nboconv = (ptrs[0].getValue('custbody99')=='T')?true:false;
						ptjson.winback = (ptrs[0].getValue('custbody_winbackorder')=='T')?true:false;
						
						//Calculate the date diff
						//retrieve the transaction date
						ptjson.thistrxdate = nlapiStringToDate(transactionRecord.getFieldValue('trandate'));
						
						//subtract THIS Trx Date with Previous
						ptjson.datediff = ptjson.thistrxdate.getTime() - ptjson.dateobj.getTime();
						
						//convert milisecond to day
						ptjson.datediff = Math.round(ptjson.datediff / (1000 * 60 * 60 *24));
						
					}
					
					//--------- NBO Trial Check ---------------------
					//	- This box is checked when it is a brand new transaction for the client
					//		or
					//	- if previous trx date to THIS trx is more than 365 days
					if (!hasPrevtrx || ptjson.datediff > 365)
					{
						nlapiLogExecution('debug','---- NBO Trial ----', JSON.stringify(ptjson));
						//check the NBO checkbox
						transactionRecord.setFieldValue('custbody_nbo', 'T');
						//submit the transaction record with changes
						transactionRecord = nlapiSubmitRecord(transactionRecord, true, false);
						//set the customer status to current and the substatus to NBO Trial
						nlapiSubmitField('customer', customer, ['entitystatus','custentity316'], [13, 60]);
					}
					//--------- NBO Trial Check ---------------------
					//	- if THIS trx is within 120 days of previous trx
					//		AND 
					//	previous trx is marked as nbo trial
					else if (ptjson.datediff > 0 && ptjson.datediff <= 120 && ptjson.nbotrial)
					{
						nlapiLogExecution('debug','---- NBO Conversion ----', JSON.stringify(ptjson));
						//check the NBO Conversion checkbox
						transactionRecord.setFieldValue('custbody99', 'T');
						//submit the transaction record with changes
						transactionRecord = nlapiSubmitRecord(transactionRecord, true, false);
						//set the customer status to current and the substatus to Active
						nlapiSubmitField('customer', customer, ['entitystatus','custentity316'], [13, 62]);
					}
					//At this point, do logic check for Winback and all other case
					//----------- Winback check ---------------------
					//- if THIS trx is between 120 and 365 days of previous trx
					//			AND
					//		  previous trx is marked as nbo trial
					//
					//		OR
					//		
					//		- if Customer is LOST 
					//			AND
					//		  previous trx is NOT nbo trial
					//			AND
					//		  THIS trx is before 365 days of last order
					else if (
								(ptjson.datediff >= 120 &&
								 ptjson.datediff <= 365 &&
								 ptjson.nbotrial) 
								 ||
								 (customerStatus == 16 &&
								  !ptjson.nbotrial &&
								  ptjson.datediff <=365)
							)
					{
						nlapiLogExecution('debug','---- Winback ----', JSON.stringify(ptjson));
						//check the winback checkbox
						transactionRecord.setFieldValue('custbody_winbackorder', 'T');
						//submit the transaction record with changes
						transactionRecord = nlapiSubmitRecord(transactionRecord, true, false);
						//set the customer status to current and the status subset to Active 
						nlapiSubmitField('customer', customer, ['entitystatus','custentity316'], [13, 62]);
						
					}
					//ALL OTHER CASE
					else
					{
						nlapiLogExecution('debug','---- All Other Case ----', JSON.stringify(ptjson));
						//set the customer status to current and the status subset to Active 
						nlapiSubmitField('customer', customer, ['entitystatus','custentity316'], [13, 62]);
					}
					
					/**
					//if the transaction date is equal to the date of first sale, or the date of first sale is empty
					if (tranDate == dateOfFirstSale || dateOfFirstSale == null || dateOfFirstSale == 0 || dateOfFirstSale == '')
					{
						//check the NBO checkbox
						transactionRecord.setFieldValue('custbody_nbo', 'T');
						//submit the transaction record with changes
						transactionRecord = nlapiSubmitRecord(transactionRecord, true, false);
						//set the customer status to current and the substatus to NBO Trial
						nlapiSubmitField('customer', customer, ['entitystatus','custentity316'], [13, 60]);
					}
					else if(customerStatusSubset == 60 || customerStatusSubset == 59)
					{
						//check the NBO Conversion checkbox
						transactionRecord.setFieldValue('custbody99', 'T');
						//submit the transaction record with changes
						transactionRecord = nlapiSubmitRecord(transactionRecord, true, false);
						//set the customer status to current and the substatus to Active
						nlapiSubmitField('customer', customer, ['entitystatus','custentity316'], [13, 62]);
					}
					//if the transaction date is not equal to the date of first sale and the previous customer status was lost
					else if(customerStatus == '16' && nlapiSearchRecord('transaction', 13054, new nlobjSearchFilter('entity', null, 'anyof', customer)) == null)
					{
						//check the winback checkbox
						transactionRecord.setFieldValue('custbody_winbackorder', 'T');
						//submit the transaction record with changes
						transactionRecord = nlapiSubmitRecord(transactionRecord, true, false);
						//set the customer status to current and the status subset to Active 
						nlapiSubmitField('customer', customer, ['entitystatus','custentity316'], [13, 62]);
					}
					else if (deviceQuantity > 0)
					{
						//set the customer status to current and the status subset to Active 
						nlapiSubmitField('customer', customer, ['entitystatus','custentity316'], [13, 62]);
					}
					*/
				}	
			}
		}
		catch(e)
		{
			//Mod 3/2/2015 JS@Audaxium.com
			//Adding detail error message and replacing javier1@aminian.com with steve
			var errorMsg = '';
			if (e instanceof nlobjError) {
				//this is netsuite specific error
				errorMsg = 'NLAPI Error: '+e.getCode()+' :: '+e.getDetails();
			} else {
				//this is generic javascript error
				errorMsg = 'JavaScript/Other Error: '+e.toString();
			}
			nlapiLogExecution('error','Make Customer Current Error',errorMsg);

			nlapiSendEmail(
				429315, 
				'sklett@spireon.com', 
				customer+' // Trx ID '+nlapiGetRecordType()+' :: '+nlapiGetRecordId(), 
				customer + errorMsg, 
				['spireon@audaxium.com','cevans@spireon.com']
			);
			
		}
		finally
		{
		    SPR.UTIL.PerfTimer.stopAndLogResult('Make customer current');
		}
	}
}