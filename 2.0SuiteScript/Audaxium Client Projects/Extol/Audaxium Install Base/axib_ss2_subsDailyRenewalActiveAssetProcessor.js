/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 
        'N/error', 
        'N/format', 
        'N/record', 
        'N/runtime', 
        'N/search', 
        'N/task',
        '/SuiteScripts/Audaxium Customization/Aux Install Base/UTILITY_LIB',
        '/SuiteScripts/Audaxium Customization/Aux Install Base/CUST_DATE_LIB'],
/**
 * @param {email} email
 * @param {error} error
 * @param {format} format
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {task} task
 */
function(email, error, format, record, runtime, search, task, custUtil, custDate) {
   
    /**
     * Script that runs 1st of Every Month to look at all Subscription asset where 
     * Current Date == Ent. Start Date
     * OR
     * Current Date - 1 == Ent. End Date
	 * ABOVE logic equates to what is deifned in Doc
	 * IF Today (7/1/2015) is == (Current Active End Date + 1) (6/30/2015 +1 = 7/1/2015)
	 * IF Status is Active 
	 * 	- Delete
	 *  Otherwise
	 *  - Update Current Start Date == Today (Pending Renewal) to Active
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execSubsDailyAssetRenew(context) 
    {
    	//Grab company level parameters
    	var paramPrimaryErrorNotifier = runtime.getCurrentScript().getParameter('custscript_104_axibprimeerr'),
	    	paramCcErrorNotifier = runtime.getCurrentScript().getParameter('custscript_104_axibccerr');
	
	    if (paramCcErrorNotifier) {
	    	paramCcErrorNotifier = paramCcErrorNotifier.split(',');
	    	for (var p=0; p < paramCcErrorNotifier.length; p+=1)
	    	{
	    		paramCcErrorNotifier[p] = custUtil.strTrim(paramCcErrorNotifier[p]);
	    	}
	    } else {
	    	paramCcErrorNotifier = null; 
	    }
	    
	    //Grab Script level parameter
	    var paramLastProcId = runtime.getCurrentScript().getParameter('custscript_sb119_lastprocid'),
	    	paramCustExecDate = runtime.getCurrentScript().getParameter('custscript_sb119_custexecdate'),
	    	paramCustCustomer = runtime.getCurrentScript().getParameter('custscript_sb119_custcustomer');
	    
	    //Current Date.
	    //	If paramCustExecDate value is provided, use that as current date
	    var curDate = new Date(),
	    	strCurDate = '';
	    
	    if (paramCustExecDate)
	    {
	    	curDate = paramCustExecDate;
	    }
	    //String Formatted Value
	    strCurDate = format.format({
    		'type':format.Type.DATE,
    		'value':curDate
    	});
	    
	    //Calculate Ent. End Date for Search
		var entEndDate = new Date(curDate.getTime()),
    		strEntEndDate = '';
    
	    //entEndDate to search for is current date - 1 Day
	    entEndDate = custDate.addDays(entEndDate, -1);
	    strEntEndDate = format.format({
	    	'value':entEndDate,
	    	'type':format.Type.DATE
	    });
	    
	    log.debug('curDate // entEndDate', strCurDate+' // '+strEntEndDate);
	    
	    var processLog = '';
	    
	    try
	    {
	    	log.debug('-----------Starting script----------',strCurDate);
	    	//2. Build Search against "Subscription" (customrecord_aesubscription) to grab list of potential candidates
	    	//Build base line search filter
	    	//	Customers' Subscription contract end date MUST be empty OR after Current Date
	    	//	Entitlement End Dates' is On (CurDate - 1 day)
	    	//		OR
	    	//	Entitlement Start Dates' is On CurDate
	    	//	Customer Status Can NOT be CUSTOMER-Former (49)
	    	//	Subscription State MUST be Active (1) or Pending Renewal (4)
	    	
	    	//Parent search results are grouped by Customer, Entitlement End Date Month and Entitlement End Date Year
	    	var subflt = [
	    	              	['custrecord_aesubs_customer', search.Operator.NONEOF, ['@NONE@']],
	    	              	'and',
	    	              	['custrecord_aesubs_customer.isinactive', search.Operator.IS, false],
	    	              	'and',
	    	              	[
								['custrecord_aesubs_soentstartdt', search.Operator.ON, strCurDate],
								'or',
								['custrecord_aesubs_soentenddt', search.Operator.ON, strEntEndDate]
	    	              	],
	    	              	'and',
	    	              	//Grab ONLY Customers with status NONE of CUSTOMER-Former (ID 49)
	    	              	['custrecord_aesubs_customer.status','noneof','49'],
	    	              	'and',
	    	              	//Grab those assets that are Active or Pending Renewal (ID 1, 4)
	    	              	['custrecord_aesubs_state','anyof',['1','4']]
	    	             ],
	    		subcol = [search.createColumn({
	    					'name':'internalid',
	    					'join':'custrecord_aesubs_customer',
	    					'sort':search.Sort.DESC,
	    					'summary':search.Summary.GROUP
	    				  }),
	    				  search.createColumn({
	    					  'name':'custrecord_aesubs_customer',
	    					  'summary':search.Summary.GROUP
	    				  })];
	    	
	    	//If script was rescheduled and last proc ID was passed in,
	    	//	Let the search ONLY return what's remaining
	    	if (paramLastProcId)
	    	{
	    		subflt.push('and');
	    		subflt.push(['custrecord_aesubs_customer.internalidnumber', search.Operator.LESSTHAN, paramLastProcId]);
	    	}
	    	
	    	//If script passed in Custom Execution Customer,
	    	//	Let the search ONLY return customer value provided
	    	if (paramCustCustomer)
	    	{
	    		subflt.push('and');
	    		subflt.push(['custrecord_aesubs_customer', search.Operator.ANYOF, [paramCustCustomer]]);
	    	}
	    	
	    	var	subSearch = search.create({
    			'type':'customrecord_aesubscription',
    			'filters':subflt,
    			'columns':subcol
    		}),
    		subSearchSet = subSearch.run(),
    		allCols = subSearchSet.columns,
    		subrs = subSearchSet.getRange({
    			'start':0,
    			'end':1000
    		});
    	
	    	//Loop through each result and process the renewal invoice for THIS Subscription
	    	/**
	    	 * Parent Search Column Index 
	    	 * 0 = internal id of Customer
	    	 * 1 = Customer
	    	 * 
	    	 */
	    	for (var s=0; s < subrs.length; s+=1)
	    	{
	    		var customerId = subrs[s].getValue(allCols[1]),
	    			customerText = subrs[s].getText(allCols[1]);
	    		
	    		//Add to Process Log
	    		processLog = '<br/><br/>'+customerText+' ('+customerId+')';
	    		
	    		try
	    		{
	    			//Search for list of ALL Subscription Assets for THIS Customer and process Invoices
		    		//If script passed in Custom Execution Customer,
			    	//	Primary filter would have ONLY grabbed data for this client and we can use same filter as is
		    		//	IF NOT set, we pass in ID of customer for THIS iteration
			    	if (!paramCustCustomer)
			    	{
			    		subflt.push('and');
			    		subflt.push(['custrecord_aesubs_customer', search.Operator.ANYOF, [customerId]]);
			    	}
		    		
			    	//Build columns to return all data to generate new subscription renewal Invoice
			    	var subccol = [search.createColumn({
			    					'name':'internalid',
			    					'sort':search.Sort.DESC
			    				  }),
			    				  'custrecord_aesubs_state',
			    				  'custrecord_aesubs_soentstartdt',
			    				  'custrecord_aesubs_soentenddt'],
			    		subcSearch = search.create({
						    			'type':'customrecord_aesubscription',
						    			'filters':subflt,
						    			'columns':subccol
						    		 }),
						subcSearchSet = subcSearch.run(),
						//Grab all column index for subc
						allcCols = subcSearchSet.columns,
						
			    		subcrs = subcSearchSet.getRange({
			    					'start':0,
			    					'end':1000
			    				});
						    		 
					/**
					 * Subs Search Column Index 
					 * 0 = internal id
					 * 1 = state
					 * 2 = ent start
					 * 3 = ent end 
					 */
			    	//Loop through each Subscription Assets and delete or flip the swith to Active
			    	for (var c=0; c < subcrs.length; c+=1)
			    	{
			    		var sjson = {
			    			'id':subcrs[c].getValue(allcCols[0]),
			    			'state':subcrs[c].getValue(allcCols[1]),
			    			'start':subcrs[c].getValue(allcCols[2]),
			    			'end':subcrs[c].getValue(allcCols[3])
			    		};
			    		try
			    		{
			    			log.debug('sjson',JSON.stringify(sjson));
			    			
			    			//If the state is Active (1) and sjson.end matches strEntEndDate
			    			if (sjson.state == '1' && sjson.end == strEntEndDate)
			    			{
			    				log.debug(sjson.id, 'Delete This Record');
			    				record.delete({
			    					'type':'customrecord_aesubscription',
			    					'id':sjson.id
			    				});
			    				
			    				processLog += '<br/>'+
			    							  '&nbsp; &nbsp; &nbsp; '+sjson.id+' deleted';
			    			}
			    			//If the stat is Pending Renewal (4) and sjson.start matches strCurDate
			    			else if (sjson.state == '4' && sjson.start == strCurDate)
			    			{
			    				log.debug(sjson.id, 'Mark as Active');
			    				
			    				record.submitFields({
			    					'type':'customrecord_aesubscription',
			    					'id':sjson.id,
			    					'values':{
			    						'custrecord_aesubs_state':'1'
			    					},
			    					'options':{
			    						'enableSourcing':true,
			    						'ignoreMandatoryFields':true
			    					}
			    				});
			    				
			    				processLog += '<br/>'+
  							  				  '&nbsp; &nbsp; &nbsp; '+sjson.id+' updated to Active';
			    				
			    			}
			    			//If there has been a match from parent search but NO match here
			    			//	THIS is an error
			    			else
			    			{
			    				log.error(sjson.id, 'Nothing matched, This is an Error and Need to be looked into');
			    				processLog += '<br/>'+
			    							  '&nbsp; &nbsp; &nbsp; No Matching Action Found. This Needs to be looked into. ';
			    			}
			    		}
			    		catch(aperr)
			    		{
			    			log.error(
									'Failed to process (Delete or Activate) SubsID '+sjson.id,
									custUtil.getErrDetail(aperr)
								);
								
								processLog += '<br/>'+
								  			  '&nbsp; &nbsp; &nbsp; Failed to process (Delete or Activate) SubsID '+sjson.id+'<br/>'+
								  			  custUtil.getErrDetailUi(copyerr);
			    		}
			    	}
			    	
	    		}
	    		catch(custprocerr)
	    		{
	    			//Add the error to Process Log
	    			log.error('Error Processing '+customerId+' // '+customerText, custUtil.getErrDetail(cprocerr));
	    			
	    			processLog += '<br/>'+
	    						  '- Unexpected Error while processing customer:<br/>'+
	    						  custUtil.getErrDetailUi(custprocerr);
	    		}
	    	}	
	    	
	    }
	    catch(procerr)
	    {
	    	log.error('Error Processing Subscription Renewal', custUtil.getErrDetail(procerr));
	    	//Generate Email Notification getErrDetailUi 
	    	email.send({
	    		'author':-5,
	    		'recipients':paramPrimaryErrorNotifier,
	    		'cc':paramCcErrorNotifier,
	    		'subject':'Error Processing Subscription Renewal - '+strCurDate,
	    		'body':'Error processing Subscription Renewal on '+strCurDate+'<br/><br/>'+
	    			   custUtil.getErrDetailUi(procerr)
	    	});
	    }
	    
	    //Send Notification
	    if (processLog)
	    {
	    	log.debug('sending process log','sending process log');
	    	email.send({
	    		'author':-5,
	    		'recipients':paramPrimaryErrorNotifier,
	    		'cc':paramCcErrorNotifier,
	    		'subject':'Subscription Process Log for '+strCurDate,
	    		'body':processLog
	    	});
	    }
    }

    return {
        execute: execSubsDailyAssetRenew
    };
    
});
