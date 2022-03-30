/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 
        'N/error', 
        'N/record', 
        'N/runtime', 
        'N/search', 
        'N/format',
        'N/task',
        '/SuiteScripts/CongrueIT Customizations/UTILITY_LIB',
        '/SuiteScripts/CongrueIT Customizations/CUST_DATE_LIB',
        '/SuiteScripts/CongrueIT Customizations/Skoozi Transaction Integration/Skoozi_Sync_Helper'],
/**
 * @param {email} email
 * @param {error} error
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(email, error, record, runtime, search, format, task, custUtil, custDate, skooziUtil)
{
   
	var STATUS_PENDING = '1',
		STATUS_SUCCESS = '2',
		STATUS_PROC_ERROR = '3',
		STATUS_VAL_ERROR = '4',
		STATUS_VALIDATED = '5';
	
	/**
	 * Main function for Scheduled Script.
	 * This script is triggered by Skoozie Staged Validation processor.
	 * Once ALL Loaded record for a given file is fully validated, this script is called
	 * to:
	 * 1. Generate Transactio (Journal or Vendor Bill)
	 * 2. Mark all staged record as processed or failed (Depending on the outcome)
	 * 
	 * Revenue File (Journal)
	 * 		This type of file will generate a Journal Entry.  
	 * 		One Journal Entry Per Transaction Date. it is VERY possible 
	 * 		that on any given date, it can have over 1000 entries. (not now but maybe later)
	 * 		While journal entry will be summarized by Debit/Credit Account and will no more than 5 to 6 lines
	 * 		underlying data can be over 1000.  
	 * 		Due to governance of NS Scheduled Script limit, Revenue files will be processed
	 * 		in two stpes:
	 * 		1) Creation Journal Entry for a date,
	 * 		2) Reschedule itself for mark success or fail for underlying data
	 * 		3) Repeat #1 and #2 until ALL unique Dates against staged records are all processed 
	 * 
	 * Vendor File (Vendor Bill)
	 * 		This type of file will generate Vendor Bill.
	 * 		One Vendor Bill Per Transaction Date + Vendor 
	 * 		For these, Data will be summarized by Date by Vendor.
	 * 		VB process will NOT do multistep processing.
	 */
	function executeScript(context) 
	{
		//Grab list of script parameters
		//script level preference
		var fileToProcess = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb62_filetoprocess'
			}),
			fileTrxType = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb62_filetrxtype'
			}),
			fileName = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb62_filename'
			}),
			//Parameter is used by Revenue (Journal) Processing
			//	and is used by Mark Success/Fail Process.
			//	This is String Formatted Version
			jrDate = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb62_jrdate'
			}),
			//Parameter is used by Revenue (Journal) Processing
			//	and is used by Mark Success/Fail Process. 
			//	When successful, this value will be set on the staged
			//	record
			jrTrxId = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb62_jrgentrx'
			}),
			//Parameter is used by Revenue (Journal) Processing
			//	and is used by Mark Success/Fail Process. 
			//	final status of the staged record.
			jrFinStatus = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb62_jrfinstatus'
			}),
			//Parameter is used by Revenue (Journal) Processing
			//	and is used along with jrFinStatus. The provides
			//	details of the trx date group processing
			jrFinDetail = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb62_jrfinmessage'
			}),
			//Parameter is used by Revenew (Journal) Processing
			//	and is used to create new journal entry.
			//	Journal Entry will default to THIS Subsidiary
			jrDefSubs = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb62_jrdefsub'
			}),
			//Company Level Preference
			//param notification is single reference to employee id
			PARAM_NOTIFICATION = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb59_senderrornotifto'
			}),
			//Email address of Skoozi to recieve failed process notification
			PARAM_SKOOZI_NOTIF_EMAIL = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb59_skooziemailtosendfailed'
			});
		
		
		//Validation Rule:
		//	fileToProcess and fileTrxType MUST be provided.
		if (!fileToProcess || !fileTrxType || !fileName)
		{
			throw error.create({
				'name':'SKZ_TRX_PROC_ERR',
				'message':'Missing File to Validate, File Name and/or Sync Files Type (revenue or vendor) '+
						  ' for Stage to Journal/Vendor Bill Process',
				'notifyOff':false
			});
		}
		
		log.debug('Starting Checkpoint file id // type // name', fileToProcess+' // '+fileTrxType+' // '+fileName);
		
		//get stageMap object from skooziUtil helper file
		//	This check will identify if passed in fileTrxType is valid one
		try
		{
			skooziUtil.getMapping(fileTrxType);
		}
		catch(stagemaperr)
		{
			throw error.create({
				'name':'SKZ_TRX_PROC_ERR',
				'message':'Unable to get stage mapping JSON object using file trx type of "'+fileTrxType+'" '+
						  'NONE of the stage records were Processed and still marked as Validated. ',
				'notifyOff':true
			});
		}
		
		//-------------------- Begin Core Processing ---------------------
		//	TWO Different Types of process, one for revenue, one for vendor
		try
		{
			var isRescheduled = false;
			//----- Start VENDOR BILL Specific Process -----------
			if (fileTrxType == 'vendor')
			{
				log.debug('Processing Vendor', 'Processing Vendor');
				//1. Look up ALL Validated Staged Records and group it by Date + Vendor ID
				var vbSearch = search.create({
						'type':'customrecord_skz_vendortrxstaging',
						'filters':[
						           	['isinactive', search.Operator.IS, false],
						           	'and',
						           	['custrecord_skzv_syncfile', search.Operator.ANYOF, fileToProcess],
						           	'and',
						           	['custrecord_skzv_status', search.Operator.ANYOF, STATUS_VALIDATED]
						          ],
						//summarize the result by Transaction Date + Vendor Ref
						'columns':[
						            //0 Transacton Date
						           	search.createColumn({
						           		'name':'custrecord_skzv_trxdate',
						           		'summary':search.Summary.GROUP,
						           		'sort':search.Sort.DESC
						           	}),
						           	//1 NS Vendor Ref
						           	search.createColumn({
						           		'name':'custrecord_skzv_nsvendorref',
						           		'summary':search.Summary.GROUP
						           	}),
						           	//2 AP Account
						           	search.createColumn({
						           		'name':'custrecord_skzv_apaccount',
						           		'summary':search.Summary.GROUP
						           	})
						          ]
					}),
					vbAllCols = vbSearch.columns,
					vbrs = vbSearch.run().getRange({
						'start':0,
						'end':1000
					});
				
				//Loop through each grouping and create Vendor Bill Record.
				//	Per each group, once Vendor Bill is created,
				//	it will go through list of Staged Intenral ID and 
				//	Mark them complete and set vendor bill reference.
				//	Same thing for failure. Only difference is that 
				//	it will set the status to Failed, failed reason 
				for (var vb=0; vbrs && vb < vbrs.length; vb+=1)
				{
					
					var vbJson = {
						'trandate':format.parse({
							'type':format.Type.DATE,
							'value':vbrs[vb].getValue(vbAllCols[0])
						}),
						'trandatestr':vbrs[vb].getValue(vbAllCols[0]),
						'vendorid':vbrs[vb].getValue(vbAllCols[1]),
						'vendortext':vbrs[vb].getText(vbAllCols[1]),
						'apaccount':vbrs[vb].getValue(vbAllCols[2]), 
						'vbrecid':'',
						'finalstatus':'',
						'finalmessage':''
					};
					
					log.debug('checkpoint vbJson to process', JSON.stringify(vbJson));
					
					//2. We need to do a secondary search to grab ALL VB Staged records for 
					//	 this Trandate + Vendor ID
					var vbRecSearch = search.create({
							'type':'customrecord_skz_vendortrxstaging',
							'filters':[
							           	['isinactive', search.Operator.IS, false],
							           	'and',
							           	['custrecord_skzv_syncfile', search.Operator.ANYOF, fileToProcess],
							           	'and',
							           	['custrecord_skzv_status', search.Operator.ANYOF, STATUS_VALIDATED],
							           	'and',
							           	['custrecord_skzv_trxdate', search.Operator.ON, vbJson.trandatestr],
							           	'and',
							           	['custrecord_skzv_nsvendorref', search.Operator.ANYOF, vbJson.vendorid]
							          ],
							//summarize the result by Transaction Date + Vendor Ref
							'columns':[
							           	'internalid',	//0 - Record ID. Used for updating later
							           	'custrecord_skzv_amount', //1 Amount
							           	'custrecord_skzv_servtype', //2 service type
							           	'custrecord_skzv_servdesc', //3 service description
							           	'custrecord_skzv_expenseacct' //4 Expense Account
							           ]
						}),
						vbRecAllCol = vbRecSearch.columns,
						vbrecrs = vbRecSearch.run().getRange({
							'start':0,
							'end':1000
						}),
						//VB Record
						vbrecobj = record.create({
							'type':record.Type.VENDOR_BILL,
							'isDynamic':true
						});
					
					//3. Add in Main Level fields
					//a. Set the Entity. This will also set Subsidiary
					vbrecobj.setValue({
						'fieldId':'entity',
						'value':vbJson.vendorid,
						'ignoreFieldChange':false
					});
					//b. Set the Transaction Date
					vbrecobj.setValue({
						'fieldId':'trandate',
						'value':vbJson.trandate,
						'ignoreFieldChange':false
					});
					//c. set Account (This will be reference to AP Account)
					vbrecobj.setValue({
						'fieldId':'account',
						'value':vbJson.apaccount,
						'ignoreFieldChange':false
					});
					
					//log.debug('checkpoint vbrecobj', JSON.stringify(vbrecobj));
					
					//3. let's Build the VB expense lines
					for (var exp=0; exp < vbrecrs.length; exp+=1)
					{
						//select new line
						vbrecobj.selectNewLine({
							'sublistId':'expense'
						});
						//set expense account
						vbrecobj.setCurrentSublistValue({
							'sublistId':'expense',
							'fieldId':'account',
							'value':vbrecrs[exp].getValue(vbRecAllCol[4]),
							'ignoreFieldChange':false
						});
						log.debug('---- account line set', vbrecrs[exp].getValue(vbRecAllCol[4]));
						//set amount
						vbrecobj.setCurrentSublistValue({
							'sublistId':'expense',
							'fieldId':'amount',
							'value':vbrecrs[exp].getValue(vbRecAllCol[1]),
							'ignoreFieldChange':false
						});
						log.debug('---- amount line set', vbrecrs[exp].getValue(vbRecAllCol[1]));
						//set memo
						vbrecobj.setCurrentSublistValue({
							'sublistId':'expense',
							'fieldId':'memo',
							'value':vbrecrs[exp].getText(vbRecAllCol[2])+
									'--'+
									vbrecrs[exp].getValue(vbRecAllCol[3]),
							'ignoreFieldChange':false
						});
						log.debug('---- memo line set', vbrecrs[exp].getText(vbRecAllCol[2])+'--'+vbrecrs[exp].getValue(vbRecAllCol[3]));
						//commit the line
						vbrecobj.commitLine({
							'sublistId':'expense'
						});
						log.debug('---- line commited','committed');
						
					}
					
					//Save the VB Record
					try
					{
						vbJson.vbrecid = vbrecobj.save({
							'enableSourcing':true,
							'ignoreMandatoryFields':true
						});
						
						//Set the final status to success
						vbJson.finalstatus = STATUS_SUCCESS;
						vbJson.finalmessage = 'Successfully created Vendor Bill Internal ID '+vbJson.vbrecid;
					}
					catch(vbsaveerr)
					{
						//Save failed mark it as failure
						vbJson.finalstatus = STATUS_PROC_ERROR;
						vbJson.finalmessage = 'Failed to save Vendor Bill object // '+custUtil.getErrDetail(vbsaveerr);
					}
					
					//4. Now we have done the VB creation, we go through and update ALL Staged record with the value
					for (var uexp=0; uexp < vbrecrs.length; uexp+=1)
					{
						var vbStageRecUpdJson = {
							'custrecord_skzv_status':vbJson.finalstatus,
							'custrecord_skzv_syncdetail':vbJson.finalmessage
						};
						
						//if VB was created, set the reference value
						if (vbJson.vbrecid)
						{
							vbStageRecUpdJson['custrecord_skzv_vendorbillref'] = vbJson.vbrecid;
						}
						
						record.submitFields({
							'type':'customrecord_skz_vendortrxstaging',
							'id':vbrecrs[uexp].getValue(vbRecAllCol[0]),
							'values':vbStageRecUpdJson,
							'options':{
								'enablesourcing':true,
								'ignoreMandatoryFields':true
							}
						});
						
						log.debug('Stage Rec Updated','Remaining usage '+runtime.getCurrentScript().getRemainingUsage());
					}
					
					//log.debug('checkpoint vbrecobj', JSON.stringify(vbrecobj));
					
					//------- Do Reschedule Check point ----
					//Need to update the progress % value here
	        		var pctCompleted = Math.round(((vb+1) / vbrs.length) * 100);
	        		runtime.getCurrentScript().percentComplete = pctCompleted;
	    			
	        		//Check for Governance points
	        		//This reschedule means there are more staged records to validate
	        		if ((vb+1) == 1000 || runtime.getCurrentScript().getRemainingUsage() < 1000)
	        		{
	        			//Reschedule here
	        			isRescheduled = true;
	        			var vbschSctTask = task.create({
	        				'taskType':task.TaskType.SCHEDULED_SCRIPT
	        			});
	        			vbschSctTask.scriptId = runtime.getCurrentScript().id;
	        			vbschSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
	        			vbschSctTask.params = {
	        				'custscript_sb62_filetoprocess':fileToProcess,
	        				'custscript_sb62_filetrxtype':fileTrxType,
	        				'custscript_sb62_filename':fileName
	        			};
	        			
	        			//Submit the Reschedule task
	        			vbschSctTask.submit();
	        			
	        			log.audit('Vendor Bill Trx Creation Proc Rescheduled','VB Rescheduled at '+vbJson.trandate+' // '+vbJson.vendorid);
	        			
	        			break;
	        		}
				}//End For loop for creating vendor bill
				
				if (!isRescheduled)
				{
					
					//***** We finalize the check by looking up if we have ANY Error Generating Vendor Bill ************
					//If we have NO Errors, we notify Skoozi via API call
					//If we HAVE Errors, we notify internal error employee via email
					
					var vbFailedSearch = search.create({
							'type':'customrecord_skz_vendortrxstaging',
							'filters':[
							           	['isinactive', search.Operator.IS, false],
							           	'and',
							           	['custrecord_skzv_syncfile', search.Operator.ANYOF, fileToProcess],
							           	'and',
							           	['custrecord_skzv_status', search.Operator.ANYOF, STATUS_PROC_ERROR]
							          ],
							//summarize the result by Transaction Date + Vendor Ref
							'columns':['internalid']
						}),
						vbfrs = vbFailedSearch.run().getRange({
							'start':0,
							'end':1
						});
					
					if (vbfrs && vbfrs.length > 0)
					{
						//Notify internal Error handling employee
						//PARAM_NOTIFICATION
						log.debug('Send Vendor Bill Error Email', 'Send Vendor Bill Process Error Email');
						email.send({
							'author':-5,
							'recipients':PARAM_NOTIFICATION,
							'subject':'Error Processing Skoozi Vendor File into Vendor Bill',
							'body':'One or more errors occured while processing '+
								   'Skoozi Vendor File "'+fileName+'" into Vendor Bill<br/><br/>'+
								   'Please check Vendor (Vendor Bill) Sync Status Report'
						});
					}
					else
					{
						//Use API To notify the file completed successfully
						log.debug('Send API Notice to Skoozi', 'Send Success Notice for '+fileName);
						
						var skzVendorApiJson = skooziUtil.sendSuccessNotice(fileName, (runtime.envType == runtime.EnvType.SANDBOX));
						
						log.debug('Vendor API Call Result', JSON.stringify(skzVendorApiJson));
						
						//Notify Internal Team if Error Occured
						if (!skzVendorApiJson.status)
						{
							log.debug('Failed to Send Success to Skoozi', 'Error: '+JSON.stringify(skzVendorApiJson));
							email.send({
								'author':-5,
								'recipients':PARAM_NOTIFICATION,
								'subject':'Error Notifying Success to Skoozi for Vendor File',
								'body':'Unable to send Success notice to Skoozi for Vendor File "'+fileName+'"<br/><br/>'+
									   'Response from Skoozi API:<br/>'+
									   JSON.stringify(skzVendorApiJson)
							});
						}
						
					}
					
				}//Check for completed processing
				
			}
			//----- Start Journal Specific Process -----------
			else if (fileTrxType == 'revenue')
			{
				log.debug('Processing Journal', 'Processing Journal');
				
				//Journal Processing is multi-step process.
				//1. Process the Journal
				//2. Reschedule by passing in jrTrxId, jrFinStatus, jrDate
				//	 to Process Updating of the stage record with final values
				//3. Reschedule by passing in null for jrTrxId, jrFinStatus, jrDate
				//	 to process Next transaction Date in line
				//Repeat until there is nothing to process
				
				//---------------- CORE UPDATE JOURNAL STAGING RECORD PROCESS ----------------
				if (jrFinStatus && jrDate && jrFinDetail)
				{
					//This is Update Staged Record Process
					log.debug('--- Start Processing Stage Update', 'TrxID: '+jrTrxId+' // Final Status: '+jrFinStatus+' // TrxDate '+jrDate+' // Detail: '+jrFinDetail);
					//1. Grab list of ALL JR Staging record for THIS Date, THIS File, Still in Validated state
					//	 to go through and update its' status to Final Status
					
					var	jrFinSearch = search.create({
							'type':'customrecord_skz_revtrxstaging',
							'filters':[
							           	['custrecord_skzr_syncfile', search.Operator.ANYOF, fileToProcess],
							           	'and',
							           	['custrecord_skzr_status', search.Operator.ANYOF, STATUS_VALIDATED],
							           	'and',
							           	['custrecord_skzr_trxdate', search.Operator.ON, jrDate]
							          ],
							'columns':['internalid']
						}), 
						jrFinAllCols = jrFinSearch.columns,
						jrfinrs = jrFinSearch.run().getRange({
							'start':0,
							'end':1000
						});
					
					//Go through EVERY Stage records and update the status
					for(var jrf=0; jrfinrs && jrf < jrfinrs.length; jrf+=1)
					{
						
						//Update Revenue Staged record with final status/message
						var jrStageRecUpdJson = {
								'custrecord_skzr_status':jrFinStatus,
								'custrecord_skzr_syncdetail':jrFinDetail
							};
							
							//if Journal was created, set the reference value
							if (jrTrxId)
							{
								jrStageRecUpdJson['custrecord_skzr_journalref'] = jrTrxId;
							}
							
							record.submitFields({
								'type':'customrecord_skz_revtrxstaging',
								'id':jrfinrs[jrf].getValue(jrFinAllCols[0]),
								'values':jrStageRecUpdJson,
								'options':{
									'enablesourcing':true,
									'ignoreMandatoryFields':true
								}
							});
						
						
						//Need to update the progress % value here
			        	var pctCompleted = Math.round(((jrf+1) / jrfinrs.length) * 100);
			        	runtime.getCurrentScript().percentComplete = pctCompleted;	
							
						//Reschedule logic
						//Check for Governance points
		        		//This reschedule means there are more staged records to validate
		        		if ( (jrf+1) == 1000 || runtime.getCurrentScript().getRemainingUsage() < 1000)
		        		{
		        			//Reschedule here
		        			isRescheduled = true;
		        			var jrfschSctTask = task.create({
		        				'taskType':task.TaskType.SCHEDULED_SCRIPT
		        			});
		        			jrfschSctTask.scriptId = runtime.getCurrentScript().id;
		        			jrfschSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
		        			jrfschSctTask.params = {
		        				'custscript_sb62_filetoprocess':fileToProcess,
		        				'custscript_sb62_filetrxtype':fileTrxType,
		        				'custscript_sb62_filename':fileName,
		        				//Pass in additional parameter to tell THIS script 
		        				//	it needs to run update on staging record
		        				'custscript_sb62_jrdate':jrDate,
		        				'custscript_sb62_jrgentrx':jrTrxId,
		        				'custscript_sb62_jrfinstatus':jrFinStatus,
		        				'custscript_sb62_jrfinmessage':jrFinDetail
		        			};
		        			
		        			//Submit the Reschedule task
		        			jrfschSctTask.submit();
		        			
		        			log.audit('Journal Finalize Proc Rescheduled','Journal Finalize Rescheduled at ');
		        			
		        			break;
		        		}
					}
					
					//if it's NOT rescheduled
					//	Queue it up again with Empty Journal related script parameter so that it pickes up next
					//	transaction date in line
					if (!isRescheduled)
					{
						//Reschedule here
	        			isRescheduled = true;
	        			var jrxschSctTask = task.create({
	        				'taskType':task.TaskType.SCHEDULED_SCRIPT
	        			});
	        			jrxschSctTask.scriptId = runtime.getCurrentScript().id;
	        			jrxschSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
	        			jrxschSctTask.params = {
	        				'custscript_sb62_filetoprocess':fileToProcess,
	        				'custscript_sb62_filetrxtype':fileTrxType,
	        				'custscript_sb62_filename':fileName,
	        				//Pass in additional parameter to tell THIS script 
	        				//	it needs to run update on staging record
	        				'custscript_sb62_jrdate':'',
	        				'custscript_sb62_jrgentrx':'',
	        				'custscript_sb62_jrfinstatus':'',
	        				'custscript_sb62_jrfinmessage':''
	        			};
	        			
	        			//Submit the Reschedule task
	        			jrxschSctTask.submit();
	        			
	        			log.audit('Journal Proc Next Date Rescheduled','Journal Process Next Trx Date');
					}
					
				}
				//---------------- CORE CREATE JOURNAL PROCESS ----------------
				else
				{
					//This is Create Journal Process
					log.debug('--- Start Journal Creation Process', '');
					//1. Grag unique transaction date to start processing
					var jrDateSearch = search.create({
						'type':'customrecord_skz_revtrxstaging',
						'filters':[
						           	['custrecord_skzr_syncfile', search.Operator.ANYOF, fileToProcess],
						           	'and',
						           	['custrecord_skzr_status', search.Operator.ANYOF, STATUS_VALIDATED]
						          ],
						'columns':[
						           	//0 Transacton Date
									search.createColumn({
										'name':'custrecord_skzr_trxdate',
										'summary':search.Summary.GROUP,
										'sort':search.Sort.DESC
									}),
						           ]
					}), 
					jrDateAllCols = jrDateSearch.columns,
					//We Grab One At a time since each date needs to be processed
					//	as it's own Scheduled Script queue
					jrdaters = jrDateSearch.run().getRange({
						'start':0,
						'end':1
					});
					
					//2. Begin processing THIS Transaction Date 
					if (jrdaters && jrdaters.length > 0)
					{
						var newJrJson = {
							'trxdate':jrdaters[0].getValue(jrDateAllCols[0]),
							'trxdateobj':format.parse({
								'type':format.Type.DATE,
								'value':jrdaters[0].getValue(jrDateAllCols[0])
							}),
							'jrid':'',
							'finstatus':'',
							'finmessage':''
						};
						
						log.debug('--- Grab summary for Trx Date', newJrJson.trxdate);
						
						//3. Grab Summarized list of Revenue Stage Records to create Journal Entry
						//	 We check to make sure we ONLY return those line marked as "Create Journal"
						var jrTrxSearch = search.create({
								'type':'customrecord_skz_revtrxstaging',
								'filters':[
								           	['custrecord_skzr_syncfile', search.Operator.ANYOF, fileToProcess],
								           	'and',
								           	['custrecord_skzr_status', search.Operator.ANYOF, STATUS_VALIDATED],
								           	'and',
								           	['custrecord_skzr_trxdate', search.Operator.ON, newJrJson.trxdate],
								           	'and',
								           	['custrecord_skzr_createjournal', search.Operator.IS, true]
								          ],
								'columns':[
								           	//0 Transaction Type
											//	We need this because for fulfillments, we do additional entry 
											//	into sales discount 
											search.createColumn({
												'name':'custrecord_skzr_custtrxtype',
												'summary':search.Summary.GROUP
											}),
											//1. Debit Account
											search.createColumn({
												'name':'custrecord_skzr_debitacct',
												'summary':search.Summary.GROUP
											}),
											//2. Debit AMOUNT
											search.createColumn({
												'name':'custrecord_skzr_debitamount',
												'summary':search.Summary.SUM
											}),
											//3. Credit Account
											search.createColumn({
												'name':'custrecord_skzr_creditacct',
												'summary':search.Summary.GROUP
											}),
											//4. Credit AMOUNT
											search.createColumn({
												'name':'custrecord_skzr_creditamt',
												'summary':search.Summary.SUM
											}),
											//5. Sales Discount Account
											search.createColumn({
												'name':'custrecord_skzr_salesdiscacct',
												'summary':search.Summary.GROUP
											}),
											//6. Sales Discount AMOUNT
											search.createColumn({
												'name':'custrecord_skzr_discamt',
												'summary':search.Summary.SUM
											})
								           ]
							}), 
							jrTrxAllCols = jrTrxSearch.columns,
							//It is safe to assumed the summarized result 
							//	Will NEVER be more than 1000
							jrtrxrs = jrTrxSearch.run().getRange({
								'start':0,
								'end':1000
							});
						
						//Check to see if there are result.
						//	It's possible that summarized result will return NO value 
						//	if only stage record added for THIS date was transaction
						//	that does NOT need to get processed
						if (jrtrxrs && jrtrxrs.length > 0)
						{
							var jrrecobj = record.create({
								'type':record.Type.JOURNAL_ENTRY,
								'isDynamic':true
							});
							//Set the Journal Date
							jrrecobj.setValue({
								'fieldId':'trandate',
								'value':newJrJson.trxdateobj,
								'ignoreFieldChange':false
							});
							//Set the Subsidiary
							//jrDefSubs
							jrrecobj.setValue({
								'fieldId':'subsidiary',
								'value':jrDefSubs,
								'ignoreFieldChange':false
							});
							
							//This is a JSON object to tell the process if
							//	Transaction Type MUST Debit Sales Discount Account
							//	for now, it's only fulfillment
							var trxTypeToDebitSdAcct = {
								'2':'Fulfillment'
							};
							
							//Loop through each result of jrtrxrs and add in journal lines
							for (var jr=0; jr < jrtrxrs.length; jr+=1)
							{
								//Build JSON Object for THIS Row for easy access
								var jrowJson = {
									'trxtypeid':jrtrxrs[jr].getValue(jrTrxAllCols[0]),
									'trxtypetext':jrtrxrs[jr].getText(jrTrxAllCols[0]),
									'debitacct':jrtrxrs[jr].getValue(jrTrxAllCols[1]),
									'debitamount':jrtrxrs[jr].getValue(jrTrxAllCols[2]),
									'creditacct':jrtrxrs[jr].getValue(jrTrxAllCols[3]),
									'creditamount':jrtrxrs[jr].getValue(jrTrxAllCols[4]),
									'sdacct':jrtrxrs[jr].getValue(jrTrxAllCols[5]),
									'sdamount':(jrtrxrs[jr].getValue(jrTrxAllCols[6]))?jrtrxrs[jr].getValue(jrTrxAllCols[6]):0.0
								};
								
								log.debug('jrowJson', JSON.stringify(jrowJson));
								
								//For each Row, you can have UP TO 3 lines created.
								//Debit line, Credit line.
								//IF trx Type is Fulfillment, a 3rd line Debiting against Sales Discount Account
								
								//--------- Select new DEBIT line 
								jrrecobj.selectNewLine({
									'sublistId':'line'
								});
								//Set the Debit Account
								jrrecobj.setCurrentSublistValue({
									'sublistId':'line',
									'fieldId':'account',
									'value':jrowJson.debitacct,
									'ignoreFieldChanged':false
								});
								
								//Set Debit Amount
								jrrecobj.setCurrentSublistValue({
									'sublistId':'line',
									'fieldId':'debit',
									'value':jrowJson.debitamount,
									'ignoreFieldChanged':false
								});
								
								jrrecobj.commitLine({
									'sublistId':'line'
								});
								
								//--------- Select new CREDIT line
								jrrecobj.selectNewLine({
									'sublistId':'line'
								});
								//Set the Credit Account
								jrrecobj.setCurrentSublistValue({
									'sublistId':'line',
									'fieldId':'account',
									'value':jrowJson.creditacct,
									'ignoreFieldChanged':false
								});
								
								//Set Credit Amount
								jrrecobj.setCurrentSublistValue({
									'sublistId':'line',
									'fieldId':'credit',
									'value':jrowJson.creditamount,
									'ignoreFieldChanged':false
								});
								
								jrrecobj.commitLine({
									'sublistId':'line'
								});
								
								//Check to see if this is Fulfillment Transaction
								if (trxTypeToDebitSdAcct[jrowJson.trxtypeid] && jrowJson.sdamount > 0)
								{
									//--------- Select new DEBIT line for Sales Discount Account 
									jrrecobj.selectNewLine({
										'sublistId':'line'
									});
									//Set the Debit Account
									jrrecobj.setCurrentSublistValue({
										'sublistId':'line',
										'fieldId':'account',
										'value':jrowJson.sdacct,
										'ignoreFieldChanged':false
									});
									
									//Set Debit Amount
									jrrecobj.setCurrentSublistValue({
										'sublistId':'line',
										'fieldId':'debit',
										'value':jrowJson.sdamount,
										'ignoreFieldChanged':false
									});
									
									jrrecobj.commitLine({
										'sublistId':'line'
									});
								}
							}//End Loop for Journal Lines jrtrxrs
							
							//Lets create the Journal Entry
							try
							{
								newJrJson.jrid = jrrecobj.save({
									'enableSourcing':true,
									'ignoreMandatoryFields':true
								});
								
								newJrJson.finstatus = STATUS_SUCCESS;
								newJrJson.finmessage = 'Successfully created JR Internal ID '+newJrJson.jrid;
							}
							catch(newjrerr)
							{
								newJrJson.finstatus = STATUS_PROC_ERROR;
								newJrJson.finmessage = 'Failed to create Journal Entry for '+newJrJson.trxdate+' // '+custUtil.getErrDetail(newjrerr);
							}
						
						}
						else
						{
							//Mark the trxdate part as success
							newJrJson.finstatus = STATUS_SUCCESS;
							newJrJson.finmessage = 'Skip Creation because no transaction(s) marked as create journal';
						}
						
						//What ever the status is, we Reschedule with Journal Related fields to finalize status on staged records
						//Reschedule here
	        			isRescheduled = true;
	        			var jrschSctTask = task.create({
	        				'taskType':task.TaskType.SCHEDULED_SCRIPT
	        			});
	        			jrschSctTask.scriptId = runtime.getCurrentScript().id;
	        			jrschSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
	        			jrschSctTask.params = {
	        				'custscript_sb62_filetoprocess':fileToProcess,
	        				'custscript_sb62_filetrxtype':fileTrxType,
	        				'custscript_sb62_filename':fileName,
	        				//Pass in additional parameter to tell THIS script 
	        				//	it needs to run update on staging record
	        				//  Date is passed in as string formatted version
	        				'custscript_sb62_jrdate':newJrJson.trxdate,
	        				'custscript_sb62_jrgentrx':newJrJson.jrid,
	        				'custscript_sb62_jrfinstatus':newJrJson.finstatus,
	        				'custscript_sb62_jrfinmessage':newJrJson.finmessage
	        			};
	        			
	        			//Submit the Reschedule task
	        			jrschSctTask.submit();
	        			
	        			log.audit('Journal Create Rescheduled for Fin Update','JR Rescheduled for Fin Update'+JSON.stringify(newJrJson));
	        			
						
					}
					else
					{
						//If there aren't any more to process,
						// simply set isRescheduled to false
						isRescheduled = false;
						log.debug('--- Rev. Nothing to process','Nothing to process');
					}//end check for unprocessed 
					
					if (!isRescheduled)
					{
						//***** We finalize the check by looking up if we have ANY Error Generating Journal ************
						//If we have NO Errors, we notify Skoozi via API call
						//If we HAVE Errors, we notify internal error employee via email
						
						var jrFailedSearch = search.create({
							'type':'customrecord_skz_revtrxstaging',
							'filters':[
							           	['custrecord_skzr_syncfile', search.Operator.ANYOF, fileToProcess],
							           	'and',
							           	['custrecord_skzr_status', search.Operator.ANYOF, STATUS_PROC_ERROR]
							          ],
							'columns':['internalid']
							}), 
							jrfrs = jrFailedSearch.run().getRange({
								'start':0,
								'end':1
							});
						
						if (jrfrs && jrfrs.length > 0)
						{
							//Notify internal Error handling employee
							//PARAM_NOTIFICATION
							log.debug('Send Journal Error Email', 'Send Journal Process Error Email');
							email.send({
								'author':-5,
								'recipients':PARAM_NOTIFICATION,
								'subject':'Error Processing Skoozi Revenue File into Journal',
								'body':'One or more errors occured while processing '+
									   'Skoozi Revenue File "'+fileName+'" into NetSuite Journal Entry<br/><br/>'+
									   'Please check Revenue (Journal) Sync Status Report'
							});
						}
						else
						{
							//Use API To notify the file completed successfully
							log.debug('Send API Notice to Skoozi', 'Send Success Notice for '+fileName);
							
							var skzRevApiJson = skooziUtil.sendSuccessNotice(fileName, (runtime.envType == runtime.EnvType.SANDBOX));
							
							log.debug('Revenue API Call Result', JSON.stringify(skzRevApiJson));
							
							//Notify Internal Team if Error Occured
							if (!skzRevApiJson.status)
							{
								log.debug('Failed to Send Success to Skoozi', 'Error: '+JSON.stringify(skzRevApiJson));
								email.send({
									'author':-5,
									'recipients':PARAM_NOTIFICATION,
									'subject':'Error Notifying Success to Skoozi for Revenue File',
									'body':'Unable to send Success notice to Skoozi for Revenue File "'+fileName+'"<br/><br/>'+
										   'Response from Skoozi API:<br/>'+
										   JSON.stringify(skzRevApiJson)
								});
							}
							
						}
						
					}
				}
				
				
				
			}//End check for fileTrxType of which core process to run
		}
		catch (err)
		{
			log.error('Error JR/VB Creation', custUtil.getErrDetail(err));
			email.send({
				'author':-5,
				'recipients':PARAM_NOTIFICATION,
				'subject':'Skoozi JR/VB Creation Script Terminating Error',
				'body':custUtil.getErrDetailUi(err)
			});
		}
    }

    return {
        execute: executeScript
    };
    
});
