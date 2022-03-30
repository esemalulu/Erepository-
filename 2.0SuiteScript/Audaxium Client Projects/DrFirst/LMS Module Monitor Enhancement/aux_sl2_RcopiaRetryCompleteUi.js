/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/email', 
        'N/error', 
        'N/file', 
        'N/format', 
        'N/record', 
        'N/search', 
        'N/task',
        'N/ui/serverWidget',
        'N/https',
        'N/redirect',
        'N/runtime',
        '/SuiteScripts/AX LMS Module/UTILITY_LIB'],
/**
 * @param {email} email
 * @param {error} error
 * @param {file} file
 * @param {format} format
 * @param {record} record
 * @param {search} search
 * @param {task} task
 */
function(email, error, file, format, record, search, task, serverw, https, redirect, runtime, custUtil) {
   
    /**
     * UI to allow Admins to review failed or pending queues.
     * Allows them to retry.
     * 
     * When submitted, Process will mark the queue as Retry and clear the start date
     * 
     * IF Action is Retry:
     * 
     *	 IF Fail, and POF is Load,
     *	 	- 1) Process will be queued up to delete any Staged records for this queue
     *	 	- 2) It will move the file to TO BE PRocessed folder
     *	 	- 3) Queue up loading again
     * 
     *	 IF Fail, and POF is Process,
     * 		- 1) Process will be queued up to delete ALL Sub Queues for this queue.
     * 	 - 2) Go through and reset Status of ALL staged records for THIS Queue to Empty 
     * 		- 3) It will then queue up the Same File for reprocessing from Stage to Proc Sync
     *
     * 7/14/2016 - Add in Mark as Success
     * If Action is Mark as Success
     * 	- This action is taken when Admin knows Rcopia will be sending brand new file for processing.
     * 		OR
     *    The failures aren't really failures and can be ignored.
     *    
     *  1) Go through ALL Staged Records and mark them as Success
     *  3) Load the file and question and move it PROCESSED folder
     *  2) Update Monitor Queue as Success with Details
     *  
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) 
    {
    	//Let's create NS form via Server Widget Module
    	var nsform = serverw.createForm({
    		'title':'LMS Sync Queue Monitor Admin',
    		'hideNavBar':false
    	});
    	
    	//Add Any client script
    	//Sandbox ID (on 7/16/2016)
    	//	If Sandbox is refreshed after this time,
    	//	ID will be same as production
    	//nsform.clientScriptFileId = '7968793';
    	
    	//Production ID
    	nsform.clientScriptFileId = '8924451';
    	
    	//Grab paramters from POST redirect and display any messages
    	var reqParamMessage = context.request.parameters['custparam_msg'];
    	
    	//If the method is POST, process
    	if (context.request.method == https.Method.POST)
    	{
    		var reqParamQueueId = context.request.parameters['custpage_qselfld'],
    			reqParamAction = context.request.parameters['custpage_aselfld'];
    		
    		log.debug('queue to retry '+reqParamQueueId);
    		log.debug('action '+reqParamAction);
    		
    		//Queue Up the Retry Handler Process
    		var schSctTask = task.create({
    			'taskType':task.TaskType.SCHEDULED_SCRIPT
    		});
    		schSctTask.scriptId = 'customscript_auxlms_ss2_queueretryhandle';
    		schSctTask.deploymentId = 'customdeploy_auxlms_ss2_queueretryhandle';
    		schSctTask.params = {
    			'custscript_sb175_retryid':reqParamQueueId,
    			'custscript_sb175_action':reqParamAction
    		};
    		var schSctTaskStatus = task.checkStatus(schSctTask.submit()),
    			schSctTaskStatusVal = schSctTaskStatus.status,
    			schSctTaskStatusMsg = '';
    		
    		if (schSctTaskStatusVal == task.TaskStatus.FAILED)
    		{
    			schSctTaskStatusMsg = 'Unable to Queue up '+reqParamAction+' function. Please contact your Administrator';
    		}
    		else
    		{
    			schSctTaskStatusMsg = 'Successfully Queued up '+reqParamAction+' Process for Queue ID '+reqParamQueueId;
    		}
    		
    		
    		//Redirect to THIS Suitelet
    		var redirParam = {
    			'custparam_msg':schSctTaskStatusMsg
    		};
    		
    		redirect.toSuitelet({
    			'scriptId':runtime.getCurrentScript().id,
    			'deploymentId':runtime.getCurrentScript().deploymentId,
    			'parameters':redirParam
    		});
    		
    		return;
    	}
    	
    	//Add a message field to display any errors to the user
    	var msgFld = nsform.addField({
    		'id':'custpage_msgfld',
    		'label':'Information',
    		'type':serverw.FieldType.INLINEHTML
    	});
    	msgFld.updateLayoutType({
    		'layoutType':serverw.FieldLayoutType.OUTSIDEABOVE
    	});
    	
    	//If there are values from reqParamMessage, display it here
    	if (reqParamMessage)
    	{
    		msgFld.defaultValue = '<div style="color:green; font-weight: bold; font-size: 14px">'+
								  reqParamMessage+
								  '</div>';
    	}
    	
    	try
    	{
    		//1. We need to look to see if there are any failed Queue to Admin
    		var qsobj = search.create({
    				'type':'customrecord_lmsqueue',
    				'filters':[
    				           	['isinactive', search.Operator.IS, 'F'],
    				           	'AND',
    				           	[
    				           	 	//We are looking for any queues that is Failed (3)
    				           	 	//OR
    				           	 	//Any queue in Pending (1) or Processing (4)
    				           	 	//	AND
    				           	 	//Completed Date/Time is Empty
    				           	 	//	AND
    				           	 	//Started Date/Time YESTERDAY
    				           	 	//	- These are POSSIBLE Hanging Process to SHOW the users
    				           	 	['custrecord_lmsq_procstatus', search.Operator.ANYOF, ['3']],
    				           	 	'OR',
    				           	 	[
    				           	 	 	['custrecord_lmsq_procstatus', search.Operator.ANYOF, ['1','4']],
    				           	 	 	'AND',
    				           	 	 	['custrecord_lmsq_procenddt', search.Operator.ISEMPTY,''],
    				           	 	 	'AND',
    				           	 	 	['custrecord_lmsq_procstartdt', search.Operator.ONORBEFORE, 'YESTERDAY']
    				           	 	]
    				           	]
    				          ],
    				'columns':[
    				           	search.createColumn({
    				           		'name':'created',
    				           		'sort':search.Sort.ASC
    							}), //0 Date Created - Sort ASC
    							'internalid', //1 Queue ID 
    							'custrecord_lmsq_fileref', //2 File Reference
    							'custrecord_lmsq_deltadate', //3 File Delta Date
    							'custrecord_lmsq_lmsrectype', //4 LMS Record Type
    							'custrecord_lmsq_procstatus', //5 Process Status
    							'custrecord_lmsq_procdetail', //6 Process Detail
    							'custrecord_lmsq_pof', //7 Point of Failure
    							'custrecord_lmsq_procstartdt', //8 Process Started Date/Time
    							'custrecord_lmsq_procenddt', //9 Process Ended Date/Time
    							'custrecord_lmsq_numtotalstagedrecs', //10 Total Loaded
    							'custrecord_lmsq_numsuccess', //11 Total Success,
    							'custrecord_lmsq_numfailed', //12 Total Failed,
    							'custrecord_lmsq_numunprocessed', //13 Total Unprocessed
    							'custrecord_lmsq_stagerecid', //14 Stage Record Internal ID
    							'custrecord_lmsq_stagerecstatusid', //15 Stage Record Status Field ID
    							'custrecord_lmsq_stagerecqueueid' //16 Stage Record Queue Field ID
    						  ]
    			}),
    			//Grab All Columns 
    			allColumns = qsobj.columns,
    			//Get the result. 
    			//	We assume here that there can NEVER be more than 1000 failed queues
    			allqrs =qsobj.run().getRange({
    				'start':0,
    				'end':1000
    			});
    		
    		//2. Build Static Sublist to allow user to take action on 
    		var qsublist = nsform.addSublist({
    			'id':'custpage_qsl',
    			'label':'Failed/Over Due Queues',
    			'type':serverw.SublistType.LIST
    		});
    		
    		//------------------ Add in Display Columns ------------------
    		
    		//Process Checkbox.
    		//	Client script will restrict selection of ONLY One box at any given time
    		
    		//NS BUG ISSUE
    		//	Checkbox is being taken out due to NS defect
    		/**
    		qsublist.addField({
    			'id':'qsl_process',
    			'label':'Process',
    			'type':serverw.FieldType.CHECKBOX
    		});
    		*/
    		
    		//Queue ID
    		var qidCol = qsublist.addField({
    			'id':'qsl_queueid',
    			'label':'Queue ID',
    			'type':serverw.FieldType.TEXT
    		});
    		qidCol.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.INLINE
    		});
    		
    		//Queue Status 
    		var qStatusCol = qsublist.addField({
    			'id':'qsl_status',
    			'label':'Status',
    			'type':serverw.FieldType.TEXT
    		});
    		qStatusCol.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.INLINE
    		});
    		
    		//Queue Detail 
    		var qDetailCol = qsublist.addField({
    			'id':'qsl_detail',
    			'label':'Detail',
    			'type':serverw.FieldType.TEXTAREA
    		});
    		qDetailCol.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.INLINE
    		});
    		
    		//Queue Info 
    		//	This column contains grouped info about the queue.
    		//	Queue Created Date, Delta File, Delta Date, Point of Failure, Start Date/Time, End Date/TIme
    		var qInfoCol = qsublist.addField({
    			'id':'qsl_info',
    			'label':'Queue Info',
    			'type':serverw.FieldType.TEXTAREA
    		});
    		qInfoCol.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.INLINE
    		});
    		
    		//Queue Statistics
    		//	This column contains grouped info about the queue stats
    		//	Total Loaded, Total Success, Total Failed, Total Unprocessed
    		var qStatsCol = qsublist.addField({
    			'id':'qsl_stats',
    			'label':'Queue Statistics',
    			'type':serverw.FieldType.TEXTAREA
    		});
    		qStatsCol.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.INLINE
    		});
    		
    		
    		// >>>>>>> Add in Hidden Column Fields for those that must be used by Client Side <<<<<<
    		//Queue ID hidden
    		var qidColHide = qsublist.addField({
    			'id':'qsl_queueidhide',
    			'label':'Queue ID Hidden',
    			'type':serverw.FieldType.TEXT
    		});
    		qidColHide.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.HIDDEN
    		});
    		
    		//File ID hidden
    		var qFileColHide = qsublist.addField({
    			'id':'qsl_fileidhide',
    			'label':'File ID Hidden',
    			'type':serverw.FieldType.TEXT
    		});
    		qFileColHide.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.HIDDEN
    		});
    		
    		//POF hidden
    		var qPofColHide = qsublist.addField({
    			'id':'qsl_pofhide',
    			'label':'POF Hidden',
    			'type':serverw.FieldType.TEXT
    		});
    		qPofColHide.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.HIDDEN
    		});
    		
    		//Stage Record ID hidden
    		var qStageRecIdColHide = qsublist.addField({
    			'id':'qsl_stagerecidhide',
    			'label':'Stage Rec ID Hidden',
    			'type':serverw.FieldType.TEXT
    		});
    		qStageRecIdColHide.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.HIDDEN
    		});
    		
    		//Stage Rec Status Field ID hidden
    		var qStageRecStatusFldIdColHide = qsublist.addField({
    			'id':'qsl_recstatusfldhide',
    			'label':'POF Hidden',
    			'type':serverw.FieldType.TEXT
    		});
    		qStageRecStatusFldIdColHide.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.HIDDEN
    		});
    		
    		//Stage Rec Queue Field ID  hidden
    		var qStageRecQueueFldIdColHide = qsublist.addField({
    			'id':'qsl_recqueuefldhide',
    			'label':'POF Hidden',
    			'type':serverw.FieldType.TEXT
    		});
    		qStageRecQueueFldIdColHide.updateDisplayType({
    			'displayType':serverw.FieldDisplayType.HIDDEN
    		});
    		
    		
    		//3. Loop through result and add to Sublist if there are any
    		
    		/**************************************************************/
    		//7/13/2016 - Due to PENDING NetSuite Defect on setting 
    		//	sublist field values on sublist using setSublistValue
    		//	As work around, we will build a drop down with each unique queue ID 
    		//	for user to choose and submit instead of checking the box and submit
    		/**************************************************************/
    		var queueJson = {};
    		
    		for(var l=0; allqrs && l < allqrs.length; l+=1)
    		{
    			var rowJson = {
    				'created':allqrs[l].getValue(allColumns[0]),
    				'id':allqrs[l].getValue(allColumns[1]),
    				'fileid':allqrs[l].getValue(allColumns[2]),
    				'filetext':allqrs[l].getText(allColumns[2]),
    				'deltadate':allqrs[l].getValue(allColumns[3]),
    				'deltatype':allqrs[l].getValue(allColumns[4]),
    				'statustext':allqrs[l].getText(allColumns[5]),
    				'detail':allqrs[l].getValue(allColumns[6]),
    				'pof':allqrs[l].getValue(allColumns[7]),
    				'started':allqrs[l].getValue(allColumns[8]),
    				'ended':allqrs[l].getValue(allColumns[9]),
    				'totalcount':allqrs[l].getValue(allColumns[10]),
    				'successcount':allqrs[l].getValue(allColumns[11]),
    				'failedcount':allqrs[l].getValue(allColumns[12]),
    				'pendingcount':allqrs[l].getValue(allColumns[13]),
    				'recid':allqrs[l].getValue(allColumns[14]),
    				'statusfld':allqrs[l].getValue(allColumns[15]),
    				'queuefld':allqrs[l].getValue(allColumns[16])
    			};
    		
    			//7/13/2016 - NS Bug Work around
    			//	Build unique list of queue Ids and values 
    			queueJson[rowJson.id] = 'Queue #'+rowJson.id;
    			
    			//Set Queue ID
    			qsublist.setSublistValue({
    				'id':'qsl_queueid',
    				'line':l,
    				'value':rowJson.id
    			});
    			
    			//Set Queue Status Display Field
    			qsublist.setSublistValue({
    				'id':'qsl_status',
    				'line':l,
    				'value':rowJson.statustext
    			});
    			
    			//Set Queue Detail Display Field
    			var queueDetailDisplay = rowJson.detail,
    				breakPoint = 0,
    				detailDisplaVal = '';
    			if (queueDetailDisplay)
    			{
    				//split up for dispaly purposes at each 10th space
    				var arDisplayVal = queueDetailDisplay.split(' ');
    				for (var s=0; s < arDisplayVal.length; s+=1)
    				{
    					detailDisplaVal += arDisplayVal[s]+' ';
    					if (breakPoint == 7)
    					{
    						detailDisplaVal += '<br/>';
    						breakPoint = 0;
    					}
    					else
    					{
    						breakPoint += 1;
    					}
    				}
    			}
    			else
    			{
    				detailDisplaVal = 'null';
    			}
    			qsublist.setSublistValue({
    				'id':'qsl_detail',
    				'line':l,
    				'value':detailDisplaVal
    			});
    			
    			//Queue Info Display Field
    			qsublist.setSublistValue({
    				'id':'qsl_info',
    				'line':l,
    				'value':'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Queue Created Date: </b>'+rowJson.created+
    						'</div>'+
    						'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Delta File: </b>'+rowJson.filetext+
    						'</div>'+
    						'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Delta Date: </b>'+rowJson.deltadate+
    						'</div>'+
    						'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Point of Failure: </b>'+rowJson.pof+
    						'</div>'+
    						'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Process Started: </b>'+rowJson.started+
    						'</div>'+
    						'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Process Ended: </b>'+rowJson.ended+
    						'</div>'
    			});
    			
    			//Queue Stats Display Field
    			qsublist.setSublistValue({
    				'id':'qsl_stats',
    				'line':l,
    				'value':'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Total Loaded: </b>'+rowJson.totalcount+
    						'</div>'+
    						'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Total Success: </b>'+rowJson.successcount+
    						'</div>'+
    						'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Total Failed: </b>'+rowJson.failedcount+
    						'</div>'+
    						'<div style="padding: 5px 0px 0px 0px; border: 0px solid black">'+
    						'<b>Total Unprocessed: </b>'+rowJson.pendingcount+
    						'</div>'
    			});
    			
    			//-----> Set hidden column field values
    			//Set Queue ID Hidden
    			qsublist.setSublistValue({
    				'id':'qsl_queueidhide',
    				'line':l,
    				'value':rowJson.id
    			});
    			
    			//Set File ID Hidden
    			qsublist.setSublistValue({
    				'id':'qsl_fileidhide',
    				'line':l,
    				'value':rowJson.fileid
    			});
    			
    			//Set POF ID Hidden
    			if (rowJson.pof)
    			{
    				qsublist.setSublistValue({
        				'id':'qsl_pofhide',
        				'line':l,
        				'value':rowJson.pof
        			});
    			}
    			
    			//Set Stage Rec ID Hidden
    			qsublist.setSublistValue({
    				'id':'qsl_stagerecidhide',
    				'line':l,
    				'value':rowJson.recid
    			});
    			
    			//Set Stage Rec Status Fld ID Hidden
    			qsublist.setSublistValue({
    				'id':'qsl_recstatusfldhide',
    				'line':l,
    				'value':rowJson.statusfld
    			});
    			
    			//Set Stage Rec Queue Fld ID Hidden
    			qsublist.setSublistValue({
    				'id':'//qsl_recqueuefldhide',
    				'line':l,
    				'value':rowJson.queuefld
    			});
    		}
    		
    		/**************************************************************/
    		//7/13/2016 - Due to PENDING NetSuite Defect on setting 
    		//	sublist field values on sublist using setSublistValue
    		//	As work around, we will build a drop down with each unique queue ID 
    		//	for user to choose and submit instead of checking the box and submit
    		/**************************************************************/
    		nsform.addFieldGroup({
    			'id':'grpb',
    			'label':'User Options',
    		});
    		var queueSelFld = nsform.addField({
    			'id':'custpage_qselfld',
    			'label':'Failed/Issue Queue',
    			'type':serverw.FieldType.SELECT,
    			'container':'grpb'
    		});
    		//Loop through and add in unique queue IDs
    		//DUE TO Existing NS Defect, we are using string value null 
    		//		To represent empty option
    		queueSelFld.addSelectOption({
    			'value':'null',
    			'text':'Select Queue to Process ...',
    			'isSelected':true
    		});
    		queueSelFld.isMandatory = true;
    		
    		for (var q in queueJson)
    		{
    			queueSelFld.addSelectOption({
    				'value':q,
    				'text':queueJson[q],
    				'isSelected':false
    			});
    		}
    		
    		//7/14/2016 - Add in Action to take
    		//			  RETRY
    		//			  SUCCESS
    		var actionSelFld = nsform.addField({
    			'id':'custpage_aselfld',
    			'label':'Action to Take',
    			'type':serverw.FieldType.SELECT,
    			'container':'grpb'
    		});
    		//DUE TO Existing NS Defect, we are using string value null
    		//		To represent empty option
    		actionSelFld.addSelectOption({
    			'value':'null',
    			'text':'Select Action to Take ...',
    			'isSelected':true
    		});
    		actionSelFld.addSelectOption({
    			'value':'SUCCESS',
    			'text':'Mark Queue as Complete',
    			'isSelected':false
    		});
    		actionSelFld.addSelectOption({
    			'value':'RETRY',
    			'text':'Retry Queue',
    			'isSelected':false
    		});
    		actionSelFld.isMandatory = true;
    		//Add it in New Column
    		actionSelFld.updateBreakType({
    			'breakType':serverw.FieldBreakType.STARTCOL
    		});
    		
    		var isSyncing = false,
    			isRetrying = false;
    		//--------------- We need to Do a check to see if there is currently running Retry Prep Handler process. 
    		//	IF there is, Do not Show the button
    		var retrySearch = search.create({
				'type':search.Type.SCHEDULED_SCRIPT_INSTANCE,
				'filters':[
				           	['status', search.Operator.NONEOF, ['CANCELED','COMPLETE','FAILED']],
				           	'AND',
				           	['script.scriptid', search.Operator.IS, 'customscript_auxlms_ss2_queueretryhandle']
				          ],
				'columns':[
				           	search.createColumn({
				           		'name':'datecreated',
				           		'sort':search.Sort.ASC
							}), //0 Date Created - Sort ASC
							'status' //1 Queue ID
						  ]
			}),
			//Get the result. 
			//	We assume here that there can NEVER be more than 1000 failed queues
			retryrs = retrySearch.run().getRange({
				'start':0,
				'end':3
			});
    		//Set is syncing to TRUE
    		if (retryrs && retryrs.length > 0)
    		{
    			isRetrying = true;
    		}
    		
    		//--------------- We need to Do a check to see if there are any Delta Sync Process running.
    		//	If there is, Do not show the button
    		//Search for existing PROCESS. IF any of deployment for "Process Delta Script" is Running or In queue, Exist out and Wait
    		var osdrSearch = search.create({
				'type':search.Type.SCHEDULED_SCRIPT_INSTANCE,
				'filters':[
				           	['status', search.Operator.NONEOF, ['CANCELED','COMPLETE','FAILED']],
				           	'AND',
				           	['script.scriptid', search.Operator.IS, 'customscript_axlms_ss_processdelta']
				          ],
				'columns':[
				           	search.createColumn({
				           		'name':'datecreated',
				           		'sort':search.Sort.ASC
							}), //0 Date Created - Sort ASC
							'status' //1 Queue ID
						  ]
			}),
			//Get the result. 
			//	We assume here that there can NEVER be more than 1000 failed queues
			osdrrs = osdrSearch.run().getRange({
				'start':0,
				'end':3
			});
    		//Set is syncing to TRUE
    		if (osdrrs && osdrrs.length > 0)
    		{
    			isSyncing = true;
    		}
    		
    		
    		//ONLY show if it's Not syncing and Not Retrying 
    		if (!isSyncing && !isRetrying)
    		{
    			//Add a Submit Button
        		nsform.addSubmitButton({
        			'label':'Process Selected Queue'
        		});        		
    		}
    		else
    		{
    			//if there is a reqParamMessage show it
    			if (reqParamMessage)
    			{
    				msgFld.defaultValue = '<div style="color:green; font-weight: bold; font-size: 14px">'+
										  reqParamMessage+
										  '</div>';
    			}
    			
    			//Display the message indicating that one or more process is running
    			//	that is blocking the ability to execute retry
    			msgFld.defaultValue = msgFld.defaultValue+
    								  '<div style="color:orange; font-weight: bold; font-size: 14px">'+
									  (isRetrying?'There is running Retry Process. <br/>':'')+
									  (isSyncing?'There is running Sync Process<br/>':'')+
									  '</div>';
    		}
    		
    	}
    	catch(uierr)
    	{
    		log.error('Error while processing Retry UI',custUtil.getErrDetailUi(uierr));
    		
    		msgFld.defaultValue = '<div style="color:red; font-weight: bold; font-size: 14px">'+
    							  custUtil.getErrDetailUi(uierr)+
    							  '</div>';
    	}
    	
    	context.response.writePage(nsform);
    }

    return {
        onRequest: onRequest
    };
    
});
