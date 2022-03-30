/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 
        'N/error', 
        'N/record', 
        'N/runtime', 
        'N/search', 
        'N/task',
        'N/format',
        '/SuiteScripts/Audaxium Customization/Aux Install Base/UTILITY_LIB',
        '/SuiteScripts/Audaxium Customization/Aux Install Base/CUST_DATE_LIB'],
/**
 * @param {email} email
 * @param {error} error
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {task} task
 * @param custUtil 
 * @param custDate - THIS is a custom date library to provide addDays and addMonths functions same as SS1.0
 */
function(email, error, record, runtime, search, task, format, custUtil, custDate) 
{
   
    /**
     * None Monthly Subscription renewal processor.  This script runs daily and looks at 
     * Subscription (customrecord_aesubscription) custom record to process any potential Subscription renewal
     * FOR NONE-MONTHLY Customers
     * Monthly customers are processed 1st of every month by 
     * 	"axib_ss2_subscriptionRenewalInvoiceGen.js" Scheduled Script
     * 
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function executeNoMonthlySubsRenewal(scriptContext) 
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
	    var paramLastProcId = runtime.getCurrentScript().getParameter('custscript_sb120_lastprocid'),
	    	paramCustExecDate = runtime.getCurrentScript().getParameter('custscript_sb120_custexecdate'),
	    	paramCustCustomer = runtime.getCurrentScript().getParameter('custscript_sb120_custcustomer');
	    
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
	    
	    log.debug('string ver. of date', format.format({
	    	'type':format.Type.DATE,
	    	'value':curDate
	    }));
	    
	    var processLog = '';
	    
	    var renewalDate45Days = custDate.addDays(curDate, 45),
			strRenewalDate45Days = format.format({
				'value':renewalDate45Days,
				'type':format.Type.DATE
			});
	    
	    try
	    {
	    	log.debug('Current Date Info', 'Exec. Date: '+strCurDate+' // Renewal: '+strRenewalDate45Days);
    	
	    	//2. Build Search against "Subscription" (customrecord_aesubscription) to grab list of potential candidates
	    	//Build base line search filter
	    	//	Customers' Subscription contract end date MUST be empty OR after Current Date
	    	//	Customers' Subscriptioni Renewal Cycle MUST BE NONE MONTHLY
	    	//	Entitlement End Date is 45 days out from Current Date
	    	//	Customer Status Can NOT be CUSTOMER-Former (49)
	    	//	Subscription State MUST be Active (1)
	    	
	    	//Parent search results are grouped by Customer, Entitlement End Date Month and Entitlement End Date Year
	    	var subflt = [
	    	              	['custrecord_aesubs_customer', search.Operator.NONEOF, ['@NONE@']],
	    	              	'and',
	    	              	['custrecord_aesubs_customer.isinactive', search.Operator.IS, false],
	    	              	'and',
	    	              	//Change Request 7/8/2016 - This Renewal Process should ONLY go for Annual (2), Quarterly (3), Semi-Annnual (4) Subscription Renewal Cycle
	    	              	//IDs 2,3,4 is None Monthly renewal cycle value for AX-Subscription Renewal Cycle (customlist_sub_renewal_cycle)
	    	              	['custrecord_aesubs_customer.custentity_sub_renewal_cycle', search.Operator.ANYOF, ['2','3','4']],
	    	              	'and',
	    	              	[
								['custrecord_aesubs_customer.custentity_sub_contract_end_date', search.Operator.ISEMPTY,''],
								'or',
								['custrecord_aesubs_customer.custentity_sub_contract_end_date', search.Operator.AFTER, strRenewalDate45Days]
	    	              	],
	    	              	'and',
	    	              	//Grab those Subscription that has matching Entitlement End Date with current Month and Year
	    	              	['custrecord_aesubs_soentenddt', search.Operator.ON, strRenewalDate45Days],
	    	              	'and',
	    	              	//Grab ONLY Customers with status NONE of CUSTOMER-Former (ID 49)
	    	              	['custrecord_aesubs_customer.status','noneof','49'],
	    	              	'and',
	    	              	//Grab those assets that are Active (ID 1)
	    	              	['custrecord_aesubs_state','anyof','1']
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
	    	
	    	log.debug('running main search','Main Search');
	    	
	    	for (var s=0; s < subrs.length; s+=1)
	    	{
	    		var customerId = subrs[s].getValue(allCols[1]),
	    			customerText = subrs[s].getText(allCols[1]);
	    		
	    		//Add to Process Log
	    		processLog = '<br/><br/>'+
	    					 customerText+' ('+customerId+') With Ent. End Date: '+strRenewalDate45Days;
	    		
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
			    				  search.createColumn({
			    					  'name':'custentity_sub_renewal_cycle',
			    					  'join':'custrecord_aesubs_customer'
			    				  }),
			    				  search.createColumn({
			    					  'name':'custentity74',
			    					  'join':'custrecord_aesubs_customer'
			    				  }),
			    				  search.createColumn({
			    					 'name':'partner',
			    					 'join':'custrecord_aesubs_customer'
			    				  }),
			    				  search.createColumn({
			    					 'name':'salesrep',
			    					 'join':'custrecord_aesubs_customer'
			    				  }),
			    				  'custrecord_aesubs_item',
			    				  'custrecord_aesubs_itemqty',
			    				  'custrecord_aesubs_monthlyrate',
			    				  'custrecord_aesubs_taxcode',
			    				  'custrecord_aesubs_sotermsmonths',
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
					 * 1 = renewal cycle
					 *		1 = Monthly (1 months)
					 *		2 = Annual (12 months)
					 *		3 = Quarterly (3 months)
					 *		4 = Semi-Annual (6 months)	
					 * 2 = renewal bill to tier
					 * 		2 = Partner
					 * 3 = Partner
					 * 4 = Sales Rep
					 * 5 = item
					 * 6 = qty
					 * 7 = rate
					 * 8 = tax code
					 * 9 = terms in months
					 * 10 = end date
					 * 
					 */
			    	
			    	//Throw an error if customer is missing renewal cycle
			    	if (!subcrs[0].getValue(allcCols[1]))
			    	{
			    		throw error.create({
			    			'name':'SUBS_RENEWAL_ERR',
			    			'message':'Customer is missing Subscription Renewal Cycle value',
			    			'notifyOff':true
			    		});
			    	}
			    	log.debug('starting',customerId);
			    	
			    	//Expect to have atleast 1 results
			    	var billToEntity = customerId,
			    		renewalCycleMaps = {
			    			'1':1,
			    			'2':12,
			    			'3':3,
			    			'4':6
			    		};
			    	
			    	//For none monthly, we add one day to the current end date to get new start date
			    	log.debug('original end date',subcrs[0].getValue(allcCols[10]));
			    	
			    	var	newStartDateObj = custDate.addDays(
			    			format.parse({
			    				'value':subcrs[0].getValue(allcCols[10]),
			    				'type':format.Type.DATE
			    			}),
			    			1
			    		),
			    		newStartDateStr = format.format({
			    			'value':newStartDateObj,
			    			'type':format.Type.DATE
			    		});
			    	
			    	log.debug('----> new start date', newStartDateObj);
			    	
			    	//SS2 is more object oriented. MUST instantiate new object based off of other object.
			    	//	Otherwise, it will be object by reference
			    	var	newEndDateObj = new Date(newStartDateObj.getTime());
			    	
			    	//Add renewal cycle months to new start date
			    	newEndDateObj = custDate.addMonths(
			    		newEndDateObj,
				    	renewalCycleMaps[subcrs[0].getValue(allcCols[1])]
				    ); 
			    	//Subtract 1 day to get last day of previous month 
			    	//	Since new start date will always be on the 1st
			    	newEndDateObj = custDate.addDays(
			    		newEndDateObj,
			    		-1
			    	);
			    	
			    	var newEndDateStr = format.format({
			    		'value':newEndDateObj,
			    		'type':format.Type.DATE
			    	});
			    	
			    	//If we find that renewal bill to tier is ID 2 (Partner, change billToEntity to Partner
			    	log.debug('Renewal Bill To Tier', subcrs[0].getValue(allcCols[2]));
			    	if (subcrs[0].getValue(allcCols[2]) == '2')
			    	{
			    		billToEntity = subcrs[0].getValue(allcCols[3]);
			    	}
			    	
			    	log.debug('Bill To: ', billToEntity);
			    	
			    	
					var subsRenewInv = record.create({
						'type':record.Type.INVOICE,
						'isDynamic':true
					});
					//Set custbody_end_user 
					subsRenewInv.setValue({
						'fieldId':'custbody_end_user',
						'value':customerId,
						'ignoreFieldChange':false
					});
					//Set Entity
					subsRenewInv.setValue({
						'fieldId':'entity',
						'value':billToEntity,
						'ignoreFieldChange':false
					});
					//Set Date of Transaction to curDate
					subsRenewInv.setValue({
						'fieldId':'trandate',
						'value':curDate,
						'ignoreFieldChange':false
					});
					//Set Order Type
					subsRenewInv.setValue({
						'fieldId':'custbody_order_type',
						'value':'16', //Subscription - Automated
						'ignoreFieldChange':false
					});
					//Set Memo
					subsRenewInv.setValue({
						'fieldId':'memo',
						'value':'Subscriptions ('+newStartDateStr+' - '+newEndDateStr+')',
						'ignoreFieldChange':false
					});
					
					//Set terms
					//for None-Monthly subscription, we set the term to Net 45
					subsRenewInv.setValue({
						'fieldId':'terms',
						'value':'7', //This is internal ID of Net 45
						'ignoreFieldChange':false
					});
					
					//6/28/2016 - Main Level Terms must match line level Terms in Months
					//Set Months (custbody_tran_term_in_months) Main Level Field
					subsRenewInv.setValue({
						'fieldId':'custbody_tran_term_in_months',
						'value':subcrs[0].getValue(allcCols[9]),
						'ignoreFieldChange':false
					});
					
			    	// Go through and add in Items from Subscription table
		    		/**
					 * Subs Search Column Index 
					 * 0 = internal id
					 * 1 = renewal cycle
					 *		1 = Monthly (1 months)
					 *		2 = Annual (12 months)
					 *		3 = Quarterly (3 months)
					 *		4 = Semi-Annual (6 months)	
					 * 2 = renewal bill to tier
					 * 		2 = Partner
					 * 3 = Partner
					 * 4 = Sales Rep
					 * 5 = item
					 * 6 = qty
					 * 7 = rate
					 * 8 = tax code
					 * 9 = terms in months
					 * 10 = end date
					 * 
					 */
					for (var r=0; r < subcrs.length; r+=1)
					{
						log.debug('Subs ID', subcrs[r].getValue(allcCols[0]));
						
						subsRenewInv.selectNewLine({
							'sublistId':'item'
						});
						
						//Set Item line
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'item',
							'value':subcrs[r].getValue(allcCols[5]),
							'ignoreFieldChange':false
						});
						//Set quantity line
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'quantity',
							'value':subcrs[r].getValue(allcCols[6]),
							'ignoreFieldChange':false
						});
						//Set Price level line
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'price',
							'value':'-1',
							'ignoreFieldChange':false
						});
						//Set Monthly List Rate line
						//	custcol_list_rate
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'custcol_list_rate',
							'value':subcrs[r].getValue(allcCols[7]),
							'ignoreFieldChange':false
						});
						//Set Terms in Months
						//	revrecterminmonths
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'revrecterminmonths',
							'value':subcrs[r].getValue(allcCols[9]),
							'ignoreFieldChange':false
						});
						//Rate Value to be Monthly 
						var rateValue = parseInt(subcrs[r].getValue(allcCols[9])) * //terms in month 
										parseFloat(subcrs[r].getValue(allcCols[7])); //Monthly Rate
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'rate',
							'value':rateValue,
							'ignoreFieldChange':false
						});
						
						//Add in Taxcode
		 	 			if (subcrs[r].getValue(allcCols[8]))
		 	 			{
		 	 				subsRenewInv.setCurrentSublistValue({
		 	 					'sublistId':'item',
		 	 					'fieldId':'taxcode',
		 	 					'value':subcrs[r].getValue(allcCols[8]),
		 	 					'ignoreFieldChange':false
		 	 				});
		 	 			}
						
						//Set RR Start
						//	revrecstartdate
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'revrecstartdate',
							'value':newStartDateObj,
							'ignoreFieldChange':false
						});
						//Set RR End
						//	revrecenddate
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'revrecenddate',
							'value':newEndDateObj,
							'ignoreFieldChange':false
						});
						//Set RR Schedule
						//	revrecschedule
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'revrecschedule',
							'value':'1', //Extol-New
							'ignoreFieldChange':false
						});
						//Set Extol Note
						//	custcol1
						subsRenewInv.setCurrentSublistValue({
							'sublistId':'item',
							'fieldId':'custcol1',
							'value':'Subscriptions ('+newStartDateStr+' - '+newEndDateStr+')',
							'ignoreFieldChange':false
						});
						
						subsRenewInv.commitLine({
							'sublistId':'item'
						});
						
					}
					
					var subsRenewInvId = subsRenewInv.save({
						'enableSourcing':true,
						'ignoreMandatoryFields':true
					});
					
					processLog += '<br/>'+
								  '&nbsp; &nbsp; &nbsp; Subscription Renewal Invoice Created - ID '+subsRenewInvId;
					
					//Once this is Done, we need to go through and clone the existing Subscription records
					//	so that these are now available as Pending Renewal Subscription assets.
					/**
					 * Subs Search Column Index 
					 * 0 = internal id
					 * 1 = renewal cycle
					 *		1 = Monthly (1 months)
					 *		2 = Annual (12 months)
					 *		3 = Quarterly (3 months)
					 *		4 = Semi-Annual (6 months)	
					 * 2 = renewal bill to tier
					 * 		2 = Partner
					 * 3 = Partner
					 * 4 = Sales Rep
					 * 5 = item
					 * 6 = qty
					 * 7 = rate
					 * 8 = tax code
					 * 9 = terms in months
					 * 10 = end date
					 * 
					 */
					for (var r=0; r < subcrs.length; r+=1)
					{
						try
						{
							var copySubsRec = record.copy({
								'type':'customrecord_aesubscription',
								'id':subcrs[r].getValue(allcCols[0]),
								'isDynamic':true
							});
							
							//Set this State to Pending Renewal
							copySubsRec.setValue({
								'fieldId':'custrecord_aesubs_state',
								'value':'4', //Pending Renewal
								'ignoreFieldChange':false	
							});
							
							//Set Sales Order/Invoice to newly generated ID
							copySubsRec.setValue({
								'fieldId':'custrecord_aesubs_so',
								'value':subsRenewInvId,
								'ignoreFieldChange':false
							});
							
							//Set Start and End Date
							copySubsRec.setValue({
								'fieldId':'custrecord_aesubs_soentstartdt',
								'value':newStartDateObj,
								'ignoreFieldChange':false
							});
							
							copySubsRec.setValue({
								'fieldId':'custrecord_aesubs_soentenddt',
								'value':newEndDateObj,
								'ignoreFieldChange':false
							});
							
							var copySubsRecId = copySubsRec.save({
								'enableSourcing':true,
								'ignoreMandatoryFields':true
							});
							
							processLog += '<br/>'+
										  '&nbsp; &nbsp; &nbsp; Next Subscription Install Base Generated ID '+copySubsRecId;
							
							log.debug('Copy Success',copySubsRecId);
										  
						}
						catch(copyerr)
						{
							log.error(
								'Error Generating Next Subs IB. Copy From '+subcrs[r].getValue(allcCols[0])+' Failed',
								custUtil.getErrDetail(copyerr)
							);
							
							processLog += '<br/>'+
							  			  '&nbsp; &nbsp; &nbsp; Failed to generate Next Sub.<br/>'+
							  			  custUtil.getErrDetailUi(copyerr);
						}
					}
					
	    		}
	    		catch(cprocerr)
	    		{
	    			//Add the error to Process Log
	    			log.error('Error Processing '+customerId+' // '+customerText, custUtil.getErrDetail(cprocerr));
	    			
	    			processLog += '<br/>'+
	    						  '- Unexpected Error while processing customer:<br/>'+
	    						  custUtil.getErrDetailUi(cprocerr);
	    		}
	    	
	    		//Update Percentage completed
	    		var pctCompleted = Math.round(((s+1) / subrs.length) * 100);
        		runtime.getCurrentScript().percentComplete = pctCompleted;
	    		
	    		//Reschedule Logic Here
	    		if ((s+1) == 1000 || runtime.getCurrentScript().getRemainingUsage() < 1000)
	    		{
	    			var schSctTask = task.create({
	    				'taskType':task.TaskType.SCHEDULED_SCRIPT
	    			});
	    			
	    			
	    			schSctTask.scriptId = runtime.getCurrentScript().id;
	    			schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
	    			schSctTask.params = {
	    				'custscript_sb120_lastprocid':customerId,
	    				'custscript_sb120_custexecdate':paramCustExecDate,
	    				'custscript_sb120_custcustomer':paramCustCustomer
	    			};
	    			
	    			schSctTask.submit();
	    			
	    			log.audit('Rescheduled', JSON.stringify(schSctTask.params));
	    			
	    			break;
	    			
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
	    		'subject':'Error Processing None Monthly Subscription Renewal - '+strCurDate,
	    		'body':'Error processing None Monthly Subscription Renewal on '+strCurDate+
	    			   'for entitlement end date of '+strRenewalDate45Days+'<br/><br/>'+
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
	    		'subject':'None Monthly Subscription Process Log for '+strCurDate,
	    		'body':processLog
	    	});
	    }
    }

    return {
        execute: executeNoMonthlySubsRenewal
    };
    
});
