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
function(email, error, record, runtime, search, task, custUtil, custDate, skooziUtil) 
{
   
	var STATUS_PENDING = '1',
		STATUS_SUCCESS = '2',
		STATUS_PROC_ERROR = '3',
		STATUS_VAL_ERROR = '4',
		STATUS_VALIDATED = '5';
	
	//Below are list of available transaction type.
	//	These are used to calculate debit and credit amount
	//	IF NEW Type is Added, CODE MUST BE Modified to handle that change
	var CONST_AMT_MIN_DISC = 'amt-discamt',
		CONST_AMT = 'amt';
	
	var supportedTrxType = {
		'1':{
			'name':'Booking',
			'debitformula':CONST_AMT_MIN_DISC,
			'creditformula':CONST_AMT_MIN_DISC
		},
		'2':{
			'name':'Fulfillment',
			'debitformula':CONST_AMT_MIN_DISC,
			'creditformula':CONST_AMT
		},
		'3':{
			'name':'Refund',
			'debitformula':CONST_AMT_MIN_DISC,
			'creditformula':CONST_AMT_MIN_DISC
		},
		'4':{
			'name':'Gift Card Expire',
			'debitformula':CONST_AMT,
			'creditformula':CONST_AMT
		}
	};
	/**
	 * Main function for scheduled script.
	 * This script is triggered by Skoozi File to Stage processor.
	 * Primary purpose of this script is to validate and make sure each line
	 * can be processed.  If ONE of the line has a validation error
	 * entire load will be marked as validation failure.
	 * IF validation Error occurs on any line There will be two step execution process.
	 * 1. Complete the validation for ALL staged record.
	 * 2. Generate email to Skoozi with CSV with each of failed lines
	 * 3. Reschedule with validationStage value of Validation Fail.
	 * 4. Update ALL Staged record as Validation Failed Status
	 * 
	 * IF validation Passes for all lines, it will queue up next process
	 * 
	 * Journal Validation:
	 * 1. Are there previously processed Duplicate in system?
	 * 2. Does it have Transaction Type, Service Type, Payment Type, Customer ID and payment ID ?
	 * 3. Does it contain proper combination of column to generate Journal?
	 * 
	 * VendorBill Validation:
	 * 
	 */
	function executeScript(context) 
	{
		//Grab list of script parameters
			//script level preference
		var validationStage = runtime.getCurrentScript().getParameter({
				'name':'custscript_sb61_validationstage'
			}), //"Complete Validation Fail" or EMPTY
			fileToProcess = runtime.getCurrentScript().getParameter({
    			'name':'custscript_sb61_filetoprocess'
    		}),
    		fileTrxType = runtime.getCurrentScript().getParameter({
    			'name':'custscript_sb61_filetrxtype'
    		}),
    		fileName = runtime.getCurrentScript().getParameter({
    			'name':'custscript_sb61_filename'
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
				'name':'SKZ_VALIDATE_PROC_ERR',
				'message':'Missing File to Validate, File Name and/or Sync Files Type (revenue or vendor)',
				'notifyOff':false
			});
		}
		
		log.debug('Starting Checkpoint file id // type // name', fileToProcess+' // '+fileTrxType+' // '+fileName+' // '+validationStage);
		
		//get stageMap object from skooziUtil helper file
		//	This check will identify if passed in fileTrxType is valid one
		try
		{
			skooziUtil.getMapping(fileTrxType);
		}
		catch(stagemaperr)
		{
			throw error.create({
				'name':'SKZ_VALIDATE_PROC_ERR',
				'message':'Unable to get stage mapping JSON object using file trx type of "'+fileTrxType+'" '+
						  'NONE of the stage records were validated and still marked as pending. ',
				'notifyOff':true
			});
		}
				
		//-------------------- Begin Core Processing ---------------------
		//	TWO Different Types of process, one for revenue, one for vendor
		try
		{
			var isRescheduled = false;
			//----- Start JOURNAL Specific Validation Process -----------
			//		This is specific to Journal (revenue file) process
			if (fileTrxType == 'revenue')
			{
				//-------------------- UPDATE ALL STAGED to Validation Failed -----------------------
				if (validationStage == 'Complete Validation Fail')
				{
					//We need to go through and update ALL staged records for THIS file
					//to Validation Failed
					//We specifically look for those records NOT Marked as Validation Failed 
					var mfValSearch = search.create({
							'type':'customrecord_skz_revtrxstaging',
							'filters':[
							           	['custrecord_skzr_syncfile', search.Operator.ANYOF, fileToProcess],
							           	'and',
							           	['custrecord_skzr_status', search.Operator.NONEOF, STATUS_VAL_ERROR]
							          ],
							'columns':['internalid']
						}), 
						mfrs = mfValSearch.run().getRange({
							'start':0,
							'end':1000
						});
					
					//Assume we have results here and go through each record and mark as Validation Failed
					for (var mf=0; mfrs && mf < mfrs.length; mf+=1)
					{
						var revStageRecId = mfrs[mf].getValue({'name':'internalid'});
						
						record.submitFields({
							'type':'customrecord_skz_revtrxstaging',
							'id':revStageRecId,
							'values':{
								'custrecord_skzr_status':STATUS_VAL_ERROR
							},
							'options':{
								'enablesourcing':true,
								'ignoreMandatoryFields':true
							}
						});
						//Reschedule Logic for marking ALL as Failed
						//Check for Governance points
		        		//This reschedule means there are more staged records to validate
		        		if (mf < mfrs.length && runtime.getCurrentScript().getRemainingUsage() < 500)
		        		{
		        			var mfpSchSctTask = task.create({
		        				'taskType':task.TaskType.SCHEDULED_SCRIPT
		        			});
		        			mfpSchSctTask.scriptId = runtime.getCurrentScript().id;
		        			mfpSchSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
		        			mfpSchSctTask.params = {
		        				'custscript_sb61_validationstage':'Complete Validation Fail', 
		        				'custscript_sb61_filetoprocess':fileToProcess,
		        				'custscript_sb61_filetrxtype':fileTrxType,
		        				'custscript_sb61_filename':fileName
		        			};
		        			
		        			//Submit the Reschedule task
		        			mfpSchSctTask.submit();
		        			
		        			log.audit('Mark All as Failed Validation Proc Rescheduled','Rescheduled at '+revStageRecId);
		        			
		        			break;
		        		}
					}
					
				}
				//-------------------- EXECUTE Validation -----------------------
				else
				{
					//GRAB ALL Journal/Revenue Transaction Configuration and build JSON Object out of it
					//We are searching against SKZ-Journal Account Configuration custom record.
					var jrConfigJson = {},
						jrConfigSearch = search.create({
							'type':'customrecord_skz_jracctconfig',
							'filters':[
							           	['isinactive', search.Operator.IS, false]
							          ],
							'columns':['internalid', //0 Stage Record Internal ID
							           'custrecord_sjac_custtrxtype', //1 Customer Trx Type
							           'custrecord_sjac_servtype', //2. Service Type
							           'custrecord_sjac_paymenttype', //3. Payment Type
							           'custrecord_sjac_createjr', //4. Create Journal?
							           'custrecord_sjac_debitacct', //5. Debit Account
							           'custrecord_sjac_creditacct', //6. Credit Account
							           'custrecord_sjac_sdaccount'] //7. Sales Discount Account
						}), 
						jrConfigAllCols = jrConfigSearch.columns,
						jrconfigrs = jrConfigSearch.run().getRange({
							'start':0,
							'end':1000
						});
					
					//Validation Check: IF we do not have ANY config set, this is a critical ERROR
					if (!jrconfigrs || jrconfigrs.length ==0)
					{
						throw error.create({
							'name':'SKZ_JR_TRX_PROC_ERR',
							'message':'Unable to get Journal Account Configuration for processing file trx type of '+fileTrxType+
									  'NONE of the staged records were validated and still marked as pending.',
							'notifyOff':true
						});
					}
					//Loop through each of the Journal Configuration and build the jrConfigJson object.
					//the KEY = [Trx Type]-[service type]-[payment type]
					for (var jrc=0; jrc < jrconfigrs.length; jrc+=1)
					{
						var jrKey = jrconfigrs[jrc].getText(jrConfigAllCols[1])+
									'-'+
									jrconfigrs[jrc].getText(jrConfigAllCols[2])+
									'-'+
									jrconfigrs[jrc].getText(jrConfigAllCols[3]);
						
						jrConfigJson[jrKey] = {
							'trxtypeid':jrconfigrs[jrc].getValue(jrConfigAllCols[1]),
							'trxtypetext':jrconfigrs[jrc].getText(jrConfigAllCols[1]),
							'servtypeid':jrconfigrs[jrc].getValue(jrConfigAllCols[2]),
							'servtypetext':jrconfigrs[jrc].getText(jrConfigAllCols[2]),
							'pmttypeid':jrconfigrs[jrc].getValue(jrConfigAllCols[3]),
							'pmttypetext':jrconfigrs[jrc].getText(jrConfigAllCols[3]),
							'createjr':jrconfigrs[jrc].getValue(jrConfigAllCols[4]),
							'debitacct':jrconfigrs[jrc].getValue(jrConfigAllCols[5]),
							'creditacct':jrconfigrs[jrc].getValue(jrConfigAllCols[6]),
							'sdacct':jrconfigrs[jrc].getValue(jrConfigAllCols[7])
						};
					}
					
					//Journal process will follow below steps.
					//1. Go through each line for THIS file and Status of Pending and run validation.
					//	IF validation error occurs, Mark it as Validation Error
					//	IF validation passes, Mark it as Validated
					var jrValSearch = search.create({
							'type':'customrecord_skz_revtrxstaging',
							'filters':[
							           	['custrecord_skzr_syncfile', search.Operator.ANYOF, fileToProcess],
							           	'and',
							           	['custrecord_skzr_status', search.Operator.ANYOF, STATUS_PENDING]
							          ],
							'columns':['internalid', //0 Stage Record Internal ID
							           'custrecord_skzr_custrxid', //1 Customer Trx ID
							           'custrecord_skzr_trxdate', //2. Transaction Date
							           'custrecord_skzr_custtrxtype', //3. Customer Trx Type
							           'custrecord_skzr_custpayid', //4. Payment ID
							           'custrecord_skzr_pmttype', //5. payment Type
							           'custrecord_skzr_servtype', //6. Service Type
							           'custrecord_skzr_amount', //7. Amount
							           'custrecord_skzr_discamt'] //8. Discount Amount
						}), 
						jrValAllCols = jrValSearch.columns,
						jrvalrs = jrValSearch.run().getRange({
							'start':0,
							'end':1000
						});
					
					//Assume we have results here
					for (var vj=0; vj < jrvalrs.length; vj+=1)
					{
						var rowJson = {
							'id':jrvalrs[vj].getValue(jrValAllCols[0]),
							'custtrxid':jrvalrs[vj].getValue(jrValAllCols[1]),
							'trxdate':jrvalrs[vj].getValue(jrValAllCols[2]),
							'custtrxtypeid':jrvalrs[vj].getValue(jrValAllCols[3]),
							'custtrxtypetext':jrvalrs[vj].getText(jrValAllCols[3]),
							'pmtid':jrvalrs[vj].getValue(jrValAllCols[4]),
							'pmttypeid':jrvalrs[vj].getValue(jrValAllCols[5]),
							'pmttypetext':jrvalrs[vj].getText(jrValAllCols[5]),
							'sertypeid':jrvalrs[vj].getValue(jrValAllCols[6]),
							'sertypetext':jrvalrs[vj].getText(jrValAllCols[6]),
							'amount':jrvalrs[vj].getValue(jrValAllCols[7]),
							'discamt':jrvalrs[vj].getValue(jrValAllCols[8]),
							'valstatus':'',
							'valmessage':'',
							'valcreatejr':'',
							'valdebitacct':'',
							'valcreditacct':'',
							'valsdacct':'',
							'valdebitamt':'',
							'valcreditamt':''
						};
						
						//convert discount to 0 if null
						if (!rowJson.discamt)
						{
							rowJson.discamt = 0.0;
						}
						
						//Go through Validation Process.
						//	If it fails for ANY one of these check points, we return mark it as error
						
						//Validation Rule 1: Existence of all required field values
						if (!rowJson.custtrxid || !rowJson.trxdate || !rowJson.custtrxtypeid ||
							!rowJson.pmtid || !rowJson.pmttypeid || !rowJson.sertypeid || !rowJson.amount)
						{
							rowJson.valstatus = STATUS_VAL_ERROR;
							rowJson.valmessage = 'Missing Required information. This can happen if '+
												 ' Skoozi to NetSuite type lookups are not properly matched or '+
												 'it is actually missing from original.';
						}
						else
						{
							//Validation Rule 2: We must make sure transaction type is supported by this script.
							if (!supportedTrxType[rowJson.custtrxtypeid])
							{
								rowJson.valstatus = STATUS_VAL_ERROR;
								rowJson.valmessage = 'Journal Transaction type of '+rowJson.custtrxtypetext+
													 ' is NOT SUPPORTED At This Time. ';
							}
							else
							{
								//Validation Rule 3: Does this have matching configuration
								//	Build the KEY = [Trx Type]-[service type]-[payment type]
								//	same as the jrConfigJson key
								var rowConfigKey = rowJson.custtrxtypetext+
												   '-'+
												   rowJson.sertypetext+
												   '-'+
												   rowJson.pmttypetext;
								
								log.debug('JR Stage Rec '+rowJson.id, 'Config Key: '+rowConfigKey);
								
								if (!jrConfigJson[rowConfigKey])
								{
									rowJson.valstatus = STATUS_VAL_ERROR;
									rowJson.valmessage = 'Journal Configuration is missing for '+rowConfigKey+
														 '. This is an Invalid Combination of Journal Transaction';
								}
								//Validation Rule 4: Have we already processed this transaction line?
								//	This is done by looking up ANY Successfully process staging/reporting record
								//	that matches CustTrxId, trxtype, pmttype, pmtid
								else
								{
									//At this point we know we have configuration
									//Set the necessary field values if the config is found
									rowJson.valcreatejr = jrConfigJson[rowConfigKey].createjr;
									rowJson.valdebitacct = jrConfigJson[rowConfigKey].debitacct;
									rowJson.valcreditacct = jrConfigJson[rowConfigKey].creditacct;
									rowJson.valsdacct = jrConfigJson[rowConfigKey].sdacct;

									
									var dupSearch = search.create({
											'type':'customrecord_skz_revtrxstaging',
											'filters':[
											           	['custrecord_skzr_status', search.Operator.ANYOF, STATUS_SUCCESS],
											           	'and',
											           	['custrecord_skzr_custrxid', search.Operator.IS, custUtil.strTrim(rowJson.custtrxid)],
											           	'and',
											           	['custrecord_skzr_custtrxtype', search.Operator.ANYOF, rowJson.custtrxtypeid],
											           	'and',
											           	['custrecord_skzr_custpayid', search.Operator.IS, custUtil.strTrim(rowJson.pmtid)],
											           	'and',
											           	['custrecord_skzr_pmttype', search.Operator.ANYOF, rowJson.pmttypeid],
											           	'and',
											           	['custrecord_skzr_servtype', search.Operator.ANYOF, rowJson.sertypeid]
											          ],
											'columns':['internalid']
										}), 
										dupAllCols = dupSearch.columns,
										duprs = dupSearch.run().getRange({
											'start':0,
											'end':1
										});
									
									//If the duprs is more than 1, we mark it as error
									if (duprs && duprs.length > 0)
									{
										rowJson.valstatus = STATUS_VAL_ERROR;
										rowJson.valmessage = 'This transaction has been processed before. '+
															 'Matched successful Record Internal ID is '+duprs[0].getValue(dupAllCols[0]);
									}
								}
							} 
						}//End 4 Step valiation check.
							
						//if valstatus is NOT Validation Error, Run logic to set all other value
						//	And Mark it as VALIDATED
						if (rowJson.valstatus != STATUS_VAL_ERROR)
						{
							//------------- This row Passes validation -----------------------
							//	Calculate the debit, credit amounts based on formula specific
							//	to Transaction Type
							//set it to validated
							rowJson.valstatus = STATUS_VALIDATED;
							
							//Depending on customer transaction type, calculate debit and credit value
							//At this point, we assume we have a value. Validation Rule 2 takes care of this
							var calcByRow = supportedTrxType[rowJson.custtrxtypeid];
							log.debug('calcByRow', JSON.stringify(calcByRow));
							//calculate Debit value based on formula.
							//CONST_AMT_MIN_DISC == amount - discount
							//CONST_AMT == amount only
							if (calcByRow.debitformula == CONST_AMT_MIN_DISC)
							{
								log.debug('debit','amt-disc');
								rowJson.valdebitamt = parseFloat(rowJson.amount) - 
													  parseFloat(rowJson.discamt);
							}
							else if (calcByRow.debitformula == CONST_AMT)
							{
								log.debug('debit','amt');
								rowJson.valdebitamt = parseFloat(rowJson.amount);
							}
							
							//calculate Credit value based on formula (sames as above
							if (calcByRow.creditformula == CONST_AMT_MIN_DISC)
							{
								log.debug('credit','amt-disc');
								rowJson.valcreditamt = parseFloat(rowJson.amount) - 
													  parseFloat(rowJson.discamt);
							}
							else if (calcByRow.creditformula == CONST_AMT)
							{
								log.debug('credit','amt');
								rowJson.valcreditamt = parseFloat(rowJson.amount);
							}
						}
						
						//checkpoint
						log.debug('After Validation and Calculation', JSON.stringify(rowJson));
						
						//Let's update this record with these new values
						record.submitFields({
							'type':'customrecord_skz_revtrxstaging',
							'id':rowJson.id,
							'values':{
								'custrecord_skzr_status':rowJson.valstatus,
								'custrecord_skzr_syncdetail':rowJson.valmessage,
								'custrecord_skzr_createjournal':rowJson.valcreatejr,
								'custrecord_skzr_debitamount':rowJson.valdebitamt,
								'custrecord_skzr_creditamt':rowJson.valcreditamt,
								'custrecord_skzr_debitacct':rowJson.valdebitacct,
								'custrecord_skzr_creditacct':rowJson.valcreditacct,
								'custrecord_skzr_salesdiscacct':rowJson.valsdacct
							},
							'options':{
								'enablesourcing':true,
								'ignoreMandatoryFields':true
							}
						});
					
						//------- JR Validation Reschedule Logic--------
						//for (var vj=0; vj < jrvalrs.length; vj+=1)
						//Need to update the progress % value here
		        		var pctCompleted = Math.round(((vj+1) / jrvalrs.length) * 100);
		        		runtime.getCurrentScript().percentComplete = pctCompleted;
		    			
		        		//Check for Governance points
		        		//This reschedule means there are more staged records to validate
		        		if ( (vj+1) == 1000 || runtime.getCurrentScript().getRemainingUsage() < 1000)
		        		{
		        			//Reschedule here
		        			isRescheduled = true;
		        			var schSctTask = task.create({
		        				'taskType':task.TaskType.SCHEDULED_SCRIPT
		        			});
		        			schSctTask.scriptId = runtime.getCurrentScript().id;
		        			schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
		        			schSctTask.params = {
		        				'custscript_sb61_validationstage':'', //Empty validation stage since we are not done yet
		        				'custscript_sb61_filetoprocess':fileToProcess,
		        				'custscript_sb61_filetrxtype':fileTrxType,
		        				'custscript_sb61_filename':fileName
		        			};
		        			
		        			//Submit the Reschedule task
		        			schSctTask.submit();
		        			
		        			log.audit('Validation Proc Rescheduled','Rescheduled at '+rowJson.id);
		        			
		        			break;
		        		}
					}//End Loop for Pending Stage Revenue record
					
					//Final step action
					if (!isRescheduled)
					{
						//Final Step is to see if we need to go through and generate Fail
						//helper function is called for this since both revenue and vendor will
						//	behave the same way.
						//	Generate JSON parameter to send to function.
						var failChkJson = {
							'type':fileTrxType,
							'file':fileToProcess,
							'filename':fileName,
							'findstatus':STATUS_VAL_ERROR,
							'notifyemail':PARAM_SKOOZI_NOTIF_EMAIL,
							'cc':PARAM_NOTIFICATION
						};
						log.debug('failChkJson', JSON.stringify(failChkJson));
						//procFailVal is a helper function defined in Skoozi_Sync_Helper.
						//	This will return a string value:
						//FailedValidation
						// 		This value will tell the calling function to reschedule the script
						// 		to go through and mark everything failed
						// 		When this status is returned, email notification has been sent with
						// 		failed row CSV attached		
						// 
						// SuccessValidation 
						// 		This value will tell the calling function to Queue up Final Processor 
						// 		to generate either journal or vendor bill file
						var chkResultVal = skooziUtil.procFailedVal(failChkJson);
						
						log.debug('check point chkResultVal', chkResultVal);
						
						if (chkResultVal == 'FailedValidation')
						{
							//Failed validation.
							//Assume the email is generated.
							//We need to reschedule THIS script to mark all as failed
							var mfSchSctTask = task.create({
		        				'taskType':task.TaskType.SCHEDULED_SCRIPT
		        			});
							mfSchSctTask.scriptId = runtime.getCurrentScript().id;
							mfSchSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
							mfSchSctTask.params = {
		        				'custscript_sb61_validationstage':'Complete Validation Fail', //Tells the script to mark ALL records as failed
		        				'custscript_sb61_filetoprocess':fileToProcess,
		        				'custscript_sb61_filetrxtype':fileTrxType,
		        				'custscript_sb61_filename':fileName
		        			};
		        			
		        			//Submit the Reschedule task
							mfSchSctTask.submit();
		        			
		        			log.audit('Validation Proc Mark Failed','Marking it Failed');
							
						}
						else
						{
							//Assume it is SuccessValidation
							//Queue up Next Step Process to finalize the sync
							var rnxtSchSctTask = task.create({
		        				'taskType':task.TaskType.SCHEDULED_SCRIPT
		        			});
							rnxtSchSctTask.scriptId = 'customscript_skz_ss_stagedtojrvbprocess';
							rnxtSchSctTask.deploymentId = null;
							rnxtSchSctTask.params = {
		        				'custscript_sb62_filetoprocess':fileToProcess,
		        				'custscript_sb62_filetrxtype':fileTrxType,
		        				'custscript_sb62_filename':fileName
		        			};
		        			
		        			//Submit the Reschedule task
							rnxtSchSctTask.submit();
		        			
		        			log.audit('Revenue Validation Complete','Revenue Final Step Queued');
							
						}
						
					}//End Check for Rescheduled
				}//End Check for Revenue validationStage
				
			}
			//----- Start VENDOR BILL Specific Process -----------
			else if (fileTrxType == 'vendor')
			{
				//-------------------- UPDATE ALL Vendor STAGED to Validation Failed -----------------------
				if (validationStage == 'Complete Validation Fail')
				{
					//We need to go through and update ALL staged records for THIS file
					//to Validation Failed
					//We specifically look for those records NOT Marked as Validation Failed 
					var vmfValSearch = search.create({
							'type':'customrecord_skz_vendortrxstaging',
							'filters':[
							           	['custrecord_skzv_syncfile', search.Operator.ANYOF, fileToProcess],
							           	'and',
							           	['custrecord_skzv_status', search.Operator.NONEOF, STATUS_VAL_ERROR]
							          ],
							'columns':['internalid']
						}), 
						vmfrs = vmfValSearch.run().getRange({
							'start':0,
							'end':1000
						});
					
					//Assume we have results here and go through each record and mark as Validation Failed
					for (var vmf=0; vmfrs && vmf < vmfrs.length; vmf+=1)
					{
						var vrevStageRecId = vmfrs[vmf].getValue({'name':'internalid'});
						
						record.submitFields({
							'type':'customrecord_skz_vendortrxstaging',
							'id':vrevStageRecId,
							'values':{
								'custrecord_skzv_status':STATUS_VAL_ERROR
							},
							'options':{
								'enablesourcing':true,
								'ignoreMandatoryFields':true
							}
						});
						//Reschedule Logic for marking ALL as Failed
						//Check for Governance points
		        		//This reschedule means there are more staged records to validate
		        		if ( (vmf+1)==1000 || runtime.getCurrentScript().getRemainingUsage() < 500)
		        		{
		        			var vmfpSchSctTask = task.create({
		        				'taskType':task.TaskType.SCHEDULED_SCRIPT
		        			});
		        			vmfpSchSctTask.scriptId = runtime.getCurrentScript().id;
		        			vmfpSchSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
		        			vmfpSchSctTask.params = {
		        				'custscript_sb61_validationstage':'Complete Validation Fail', 
		        				'custscript_sb61_filetoprocess':fileToProcess,
		        				'custscript_sb61_filetrxtype':fileTrxType,
		        				'custscript_sb61_filename':fileName
		        			};
		        			
		        			//Submit the Reschedule task
		        			vmfpSchSctTask.submit();
		        			
		        			log.audit('Mark All Vendor as Failed Validation Proc Rescheduled','Rescheduled at '+vrevStageRecId);
		        			
		        			break;
		        		}
					}
					
				}
				//-------------------- EXECUTE Vendor Validation -----------------------
				else
				{
					//GRAB ALL Vendor Transaction Configuration and build JSON Object out of it
					//We are searching against SKZ-Vendor Account Configuration custom record.
					var vbConfigJson = {},
						vbConfigSearch = search.create({
							'type':'customrecord_skz_vdracctconfig',
							'filters':[
							           	['isinactive', search.Operator.IS, false]
							          ],
							'columns':['internalid', //0 Stage Record Internal ID
							           'custrecord_svac_vendortype', //1. Talent Type
							           'custrecord_svac_apacct', //2 AP account
							           'custrecord_svact_expacct'] //3. Expense Account
						}), 
						vbConfigAllCols = vbConfigSearch.columns,
						vbconfigrs = vbConfigSearch.run().getRange({
							'start':0,
							'end':1000
						});
					
					//Validation Check: IF we do not have ANY config set, this is a critical ERROR
					if (!vbconfigrs || vbconfigrs.length ==0)
					{
						throw error.create({
							'name':'SKZ_VB_TRX_PROC_ERR',
							'message':'Unable to get Vendor Account Configuration for processing file trx type of '+fileTrxType+
									  'NONE of the staged records were validated and still marked as pending.',
							'notifyOff':true
						});
					}
					
					//Loop through each of the Vendor Configuration and build the vbConfigJson object.
					//the KEY = [Talent Type]
					for (var vrc=0; vrc < vbconfigrs.length; vrc+=1)
					{
						vbConfigJson[vbconfigrs[vrc].getText(vbConfigAllCols[1])] = {
							'taltypeid':vbconfigrs[vrc].getValue(vbConfigAllCols[1]),
							'taltypetext':vbconfigrs[vrc].getText(vbConfigAllCols[1]),
							'apacct':vbconfigrs[vrc].getValue(vbConfigAllCols[2]),
							'expenseacct':vbconfigrs[vrc].getValue(vbConfigAllCols[3])
						};
					}
					
					log.debug('vbConfigJson', JSON.stringify(vbConfigJson));
					
					//Vendor process will follow below steps.
					//1. Go through each line for THIS file and Status of Pending and run validation.
					//	IF validation error occurs, Mark it as Validation Error
					//	IF validation passes, Mark it as Validated
					var vbValSearch = search.create({
							'type':'customrecord_skz_vendortrxstaging',
							'filters':[
							           	['custrecord_skzv_syncfile', search.Operator.ANYOF, fileToProcess],
							           	'and',
							           	['custrecord_skzv_status', search.Operator.ANYOF, STATUS_PENDING]
							          ],
							'columns':['internalid', //0 Stage Record Internal ID
							           'custrecord_skzv_vendortrxid', //1 Vendor Trx ID
							           'custrecord_skzv_custtrxid', //2. Customer Trx ID
							           'custrecord_skzv_vendorname', //3. Vendor Name
							           'custrecord_skzv_vendorid', //4. Vendor ID [TEXT] (NetSuite ID)
							           'custrecord_skzv_vendortype', //5. Vendor (Talent) Type
							           'custrecord_skzv_trxdate', //6. Transaction Date
							           'custrecord_skzv_servtype', //7. Service Type
							           'custrecord_skzv_servdesc', //8. Service Desc
							           'custrecord_skzv_amount'] //9. Amount
						}), 
						vbValAllCols = vbValSearch.columns,
						vbvalrs = vbValSearch.run().getRange({
							'start':0,
							'end':1000
						});
					
					//Assume we have results here
					for (var vb=0; vb < vbvalrs.length; vb+=1)
					{
						var vrowJson = {
							'id':vbvalrs[vb].getValue(vbValAllCols[0]),
							'vendortrxid':vbvalrs[vb].getValue(vbValAllCols[1]),
							'custtrxid':vbvalrs[vb].getValue(vbValAllCols[2]),
							'vendorname':vbvalrs[vb].getValue(vbValAllCols[3]),
							'vendornsid':vbvalrs[vb].getValue(vbValAllCols[4]),
							'talenttypeid':vbvalrs[vb].getValue(vbValAllCols[5]),
							'talenttypetext':vbvalrs[vb].getText(vbValAllCols[5]),
							'trxdate':vbvalrs[vb].getValue(vbValAllCols[6]),
							'sertypeid':vbvalrs[vb].getValue(vbValAllCols[7]),
							'sertypetext':vbvalrs[vb].getText(vbValAllCols[7]),
							'serdesc':vbvalrs[vb].getValue(vbValAllCols[8]),
							'amount':vbvalrs[vb].getValue(vbValAllCols[9]),
							'valstatus':'',
							'valmessage':'',
							'valapacct':'',
							'valexpenseacct':''
						};
						
						//9/15/2016
						//For some reason value 0 is not being set to Vendor Amount field properly.
						//	Default it to 0 if empty
						if (!vrowJson.amount)
						{
							vrowJson.amount = '0.0';
							
							log.audit('Setting amount to 0.0', !vrowJson.amount);
						}
						
						//log.debug('vrowJson', JSON.stringify(vrowJson));
						
						//Go through Validation Process.
						//	If it fails for ANY one of these check points, we return mark it as error
						
						//Validation Rule 1: Existence of all required field values
						if (!vrowJson.vendortrxid || !vrowJson.trxdate || !vrowJson.vendornsid ||
							!vrowJson.talenttypeid || !vrowJson.amount || !vrowJson.sertypeid || 
							!vrowJson.serdesc)
						{
							vrowJson.valstatus = STATUS_VAL_ERROR;
							vrowJson.valmessage = 'Missing Required information. This can happen if '+
												 ' Skoozi to NetSuite type lookups are not properly matched or '+
												 'it is actually missing from original.//'+
												 JSON.stringify(vrowJson);
						}
						//9/15/2016
						//Validation Rule 1.5: If amount is <= 0, throw an error. Bill amount can NOT be 0 or negative value
						else if (vrowJson.amount && parseFloat(vrowJson.amount) <= 0)
						{
							vrowJson.valstatus = STATUS_VAL_ERROR;
							vrowJson.valmessage = 'Amount MUST be GREATER THAN 0';
						}
						else
						{
							//Validation Rule 2: We MUST make sure the Vendor ID exists in NetSuite
							log.debug('vendor id to try loading',custUtil.strTrim(vrowJson.vendornsid));
							
							var validVendor = true;
							try
							{
								record.load({
									'type':record.Type.VENDOR,
									'id':custUtil.strTrim(vrowJson.vendornsid)
								});
							}
							catch(vendorerr)
							{
								log.error('Vendor Load Error', 'Error Loading Vendor ID '+vrowJson.vendornsid+' // '+custUtil.getErrDetail(vendorerr));
								validVendor = false;
							}
							
							if (!validVendor)
							{
								vrowJson.valstatus = STATUS_VAL_ERROR;
								vrowJson.valmessage = 'NetSuite Vendor ID '+vrowJson.vendornsid+
													 ' does NOT exist in NetSuite';
							}
							else
							{
								//Validation Rule 3: Does this have matching configuration
								//	Build the KEY = [Talent Type]
								var vrowConfigKey = vrowJson.talenttypetext;
								
								log.debug('Vendor Stage Rec '+vrowJson.id, 'Config Key: '+vrowConfigKey);
								
								if (!vbConfigJson[vrowConfigKey])
								{
									vrowJson.valstatus = STATUS_VAL_ERROR;
									vrowJson.valmessage = 'Vendor Configuration is missing for '+vrowConfigKey+
														 '. This is an Invalid Combination of Vendor Transaction';
								}
								//Validation Rule 4: Have we already processed this transaction line?
								//	This is done by looking up ANY Successfully process staging/reporting record
								//	that matches Vendor ID + Vendor Transaction ID
								else
								{
									//At this point we know we have configuration
									//Set the necessary field values if the config is found
									vrowJson.valapacct = vbConfigJson[vrowConfigKey].apacct;
									vrowJson.valexpenseacct = vbConfigJson[vrowConfigKey].expenseacct;
									
									var vdupSearch = search.create({
											'type':'customrecord_skz_vendortrxstaging',
											'filters':[
											           	['custrecord_skzv_status', search.Operator.ANYOF, STATUS_SUCCESS],
											           	'and',
											           	['custrecord_skzv_vendortrxid', search.Operator.IS, custUtil.strTrim(vrowJson.vendortrxid)],
											           	'and',
											           	['custrecord_skzv_vendorid', search.Operator.IS, custUtil.strTrim(vrowJson.vendornsid)],
											          ],
											'columns':['internalid']
										}), 
										vdupAllCols = vdupSearch.columns,
										vduprs = vdupSearch.run().getRange({
											'start':0,
											'end':1
										});
									
									//If the duprs is more than 1, we mark it as error
									if (vduprs && vduprs.length > 0)
									{
										vrowJson.valstatus = STATUS_VAL_ERROR;
										vrowJson.valmessage = 'This Vendor Bill transaction has been processed before. '+
															 'Matched successful Record Internal ID is '+vduprs[0].getValue(vdupAllCols[0]);
									}
								}
							} 
						}//End 4 Step valiation check.
						
						
						var vbStageSaveJson = {
							'custrecord_skzv_apaccount':vrowJson.valapacct,
							'custrecord_skzv_expenseacct':vrowJson.valexpenseacct
						};
						//if valstatus is NOT Validation Error, Run logic to set all other value
						//	And Mark it as VALIDATED
						if (vrowJson.valstatus != STATUS_VAL_ERROR)
						{
							//------------- This row Passes validation -----------------------
							//set it to validated
							vrowJson.valstatus = STATUS_VALIDATED;
							
							//Only set the NS vendor ref is it is valid
							vbStageSaveJson['custrecord_skzv_nsvendorref'] = custUtil.strTrim(vrowJson.vendornsid);
						}
						
						//Add status
						vbStageSaveJson['custrecord_skzv_status']=vrowJson.valstatus;
						
						//Add Message
						vbStageSaveJson['custrecord_skzv_syncdetail']=vrowJson.valmessage;
						
						
						//Let's update this record with these new values
						record.submitFields({
							'type':'customrecord_skz_vendortrxstaging',
							'id':vrowJson.id,
							'values':vbStageSaveJson,
							'options':{
								'enablesourcing':true,
								'ignoreMandatoryFields':true
							}
						});
					
						//checkpoint
						log.debug('After VendorBill Validation', runtime.getCurrentScript().getRemainingUsage()+' // '+JSON.stringify(vrowJson));
						
						//------- Vendor Bill Validation Reschedule Logic--------
						//Need to update the progress % value here
		        		var pctCompleted = Math.round(((vb+1) / vbvalrs.length) * 100);
		        		runtime.getCurrentScript().percentComplete = pctCompleted;
		    			
		        		//Check for Governance points
		        		//This reschedule means there are more staged records to validate
		        		if ( (vb+1)==1000 || runtime.getCurrentScript().getRemainingUsage() < 1000)
		        		{
		        			//Reschedule here
		        			isRescheduled = true;
		        			var vbschSctTask = task.create({
		        				'taskType':task.TaskType.SCHEDULED_SCRIPT
		        			});
		        			vbschSctTask.scriptId = runtime.getCurrentScript().id;
		        			vbschSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
		        			vbschSctTask.params = {
		        				'custscript_sb61_validationstage':'', //Empty validation stage since we are not done yet
		        				'custscript_sb61_filetoprocess':fileToProcess,
		        				'custscript_sb61_filetrxtype':fileTrxType,
		        				'custscript_sb61_filename':fileName
		        			};
		        			
		        			//Submit the Reschedule task
		        			vbschSctTask.submit();
		        			
		        			log.audit('Validation Proc Rescheduled','VB Rescheduled at '+vrowJson.id);
		        			
		        			break;
		        		}
						
					}//End loop for vbvalrs
					
					//Final step action
					if (!isRescheduled)
					{
						//Final Step is to see if we need to go through and generate Fail
						//helper function is called for this since both revenue and vendor will
						//	behave the same way.
						//	Generate JSON parameter to send to function.
						var vfailChkJson = {
							'type':fileTrxType,
							'file':fileToProcess,
							'filename':fileName,
							'findstatus':STATUS_VAL_ERROR,
							'notifyemail':PARAM_SKOOZI_NOTIF_EMAIL,
							'cc':PARAM_NOTIFICATION
						};
						log.debug('Vendor Bill vfailChkJson', JSON.stringify(vfailChkJson));
						//procFailVal is a helper function defined in Skoozi_Sync_Helper.
						//	This will return a string value:
						//FailedValidation
						// 		This value will tell the calling function to reschedule the script
						// 		to go through and mark everything failed
						// 		When this status is returned, email notification has been sent with
						// 		failed row CSV attached		
						// 
						// SuccessValidation 
						// 		This value will tell the calling function to Queue up Final Processor 
						// 		to generate either journal or vendor bill file
						var vchkResultVal = skooziUtil.procFailedVal(vfailChkJson);
						
						log.debug('Vendor Bill check point chkResultVal', vchkResultVal);
						
						if (vchkResultVal == 'FailedValidation')
						{
							//Failed validation.
							//Assume the email is generated.
							//We need to reschedule THIS script to mark all as failed
							var vmfSchSctTask = task.create({
		        				'taskType':task.TaskType.SCHEDULED_SCRIPT
		        			});
							vmfSchSctTask.scriptId = runtime.getCurrentScript().id;
							vmfSchSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
							vmfSchSctTask.params = {
		        				'custscript_sb61_validationstage':'Complete Validation Fail', //Tells the script to mark ALL records as failed
		        				'custscript_sb61_filetoprocess':fileToProcess,
		        				'custscript_sb61_filetrxtype':fileTrxType,
		        				'custscript_sb61_filename':fileName
		        			};
		        			
		        			//Submit the Reschedule task
							vmfSchSctTask.submit();
		        			
		        			log.audit('Vendor bill Validation Proc Mark Failed','Marking it Failed');
							
						}
						else
						{
							//Assume it is SuccessValidation
							//Queue up Next Step Process to finalize the sync
							var vnxtSchSctTask = task.create({
		        				'taskType':task.TaskType.SCHEDULED_SCRIPT
		        			});
							vnxtSchSctTask.scriptId = 'customscript_skz_ss_stagedtojrvbprocess';
							vnxtSchSctTask.deploymentId = null;
							vnxtSchSctTask.params = {
		        				'custscript_sb62_filetoprocess':fileToProcess,
		        				'custscript_sb62_filetrxtype':fileTrxType,
		        				'custscript_sb62_filename':fileName
		        			};
		        			
		        			//Submit the Reschedule task
							vnxtSchSctTask.submit();
		        			
		        			log.audit('Vendor bill Validation Complete','Vendor Final Step Queued');
							
						}
						
					}//End Check for Rescheduled
					
				}//End Execute Vendor Validation
			}
		}
		catch (err)
		{
			//Throw script termination error
			// 	NOTIFY Users
			log.error('Script Terminating Error', custUtil.getErrDetail(err));
			
			email.send({
				'author':-5,
				'recipients':PARAM_NOTIFICATION,
				'subject':'Skoozi Validation Script Terminating Error',
				'body':custUtil.getErrDetailUi(err)
			});
		}
		
    }

    return {
        execute: executeScript
    };
    
});
