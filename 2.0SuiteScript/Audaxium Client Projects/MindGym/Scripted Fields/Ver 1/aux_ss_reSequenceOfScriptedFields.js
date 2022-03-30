/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 
        'N/error', 
        'N/format', 
        'N/record', 
        'N/search', 
        'N/task',
        'N/runtime',
        '/SuiteScripts/Audaxium Customization/SuiteScript 2.0/UTILITY_LIB'],
/**
 * @param {email} email
 * @param {error} error
 * @param {format} format
 * @param {record} record
 * @param {search} search
 * @param {task} task
 */
function(email, error, format, record, search, task, runtime, custUtil) 
{
   
	/**
	 * @param {Object} _updJson - contains information about the resequence fields
	 * {
		'updatetype':'SCT_FLD_1, SCT_FLD_2, SCT_FLD_3, SCT_FLD_4, SCT_FLD_5, SCT_FLD_6_7
		'fieldid':'[Scripted Field ID]',
		'seqtype':'Old, New'
	   }		
	 * @param {Object} _updSearch - Search object to go through and execute resequencing
	 */
	function loopAndReSeq(_updJson, _updSearch)
	{
		
		var	startIndex = 0,
			endIndex = 1000,
			maxPage = 1000,
			sctRelRs = [];
    	
		//log.debug('loopAndReSeq', _updSearch.filterExpression);
		
    	//Grab everything in the _updSearch result set
		while (maxPage == 1000)
    	{
			log.debug('about to run', maxPage+' // Running search');
    		var tempRs = _updSearch.run().getRange({
    			'start':startIndex,
    			'end':endIndex
    		});
    		
    		log.debug('Search Ran-tempRs',tempRs.length);
    		
    		//Add to sctRelRs
    		if (tempRs && tempRs.length > 0)
    		{
    			sctRelRs = sctRelRs.concat(tempRs);
    			
    			log.debug('search rslt added',sctRelRs.length);
    		}
    		
    		maxPage = tempRs.length;
    		startIndex = endIndex;
    		endIndex = endIndex + 1000;
    		
    	}
		
    	log.debug(_updJson.seqtype+' Search',sctRelRs.length);
    	
    	//Loop through each of Result and Update Sequence Number
    	var seqNumber = 1;
    	/**
    	 * All Saved searches are assumed to have Same Order
    	 * 0 = internal id
    	 * 1 = Actual Date 
    	 * 2 = Booking Field #
    	 * 3 = Status
    	 * 
    	 * 9/11/2016
    	 * For SCT_FLD_6_7, Column 3 is value of Field 7 
    	 */
    	
    	//Sept. 11/2016
    	//Since default seqNumber is 1, fld7 Grouping default is 1-5
    	var fld7Grouping = '1-5',
    		waveOf = 5;
    	
    	if (sctRelRs.length > 0)
    	{
    		var allCols = sctRelRs[0].columns;
    		//log.debug('allOldCols', JSON.stringify(allOldCols));
    		for (var sf=0; sf < sctRelRs.length; sf += 1)
        	{
    			//For Debugging purposes:
    			/**
    			log.debug(
    				'Resequencing',
    				_updJson.seqtype+' Record for '+_updJson.updatetype+' - Booking ID '+
    					sctRelRs[sf].getValue({'name':allCols[0].name})
    			);
    			*/
    			if (_updJson.updatetype == 'SCT_FLD_6_7')
    	    	{
    	    		//We calculate the field 7 grouping value as well
    				//Group value is identified by sequence divided by constant wave of value.
    				//	Always Rounded UP value is grouping number
    				var grpValue = Math.ceil(seqNumber/waveOf),
    					//Grouping Max is Group Value * Constant Wave
    					grpMax = grpValue * waveOf,
    					//Grouping Min is Group max - Constant Wave + 1
    					grpMin = grpMax - (waveOf) + 1;
    				
    				//update fld7Grouping Value
    				fld7Grouping = grpMin+'-'+grpMax;
    				
    				//Match and check to see if we need to update
    				// by comparing sequence number with col2 (Fld 6)
    				// or
    				// comparing grouping value with col3 (Fld 7)
            		//Only Update when the number does NOT match
            		if (seqNumber != sctRelRs[sf].getValue({'name':allCols[2].name}) || 
            			fld7Grouping != sctRelRs[sf].getValue({'name':allCols[3].name}) )
            		{
            			try
            			{
            				record.submitFields({
            					'type':record.Type.JOB,
            					'id':sctRelRs[sf].getValue({'name':allCols[0].name}),
            					'values':{
            						'custentity_sctbookfield6':seqNumber,
            						'custentity_sctbookfield7':fld7Grouping
            					},
            					'options':{
            						'enablesourcing':false,
            						'ignoreMandatoryFields':true
            					}
            				});
            			}
            			catch(recupd)
            			{
            				//Throw Error with Detail message
            				throw error.create({
            					'name':_updJson.updatetype+'_'+_updJson.seqtype+'REC_ERROR',
            					'message':'Error Resequencing '+_updJson.seqtype+' Record for '+_updJson.updatetype+' - Booking ID '+
            							   sctRelRs[sf].getValue({'name':allCols[0].name})+' // '+
            							   custUtil.getErrDetail(recupd),
            					'notifyOff':true
            				});
            			}
            		}
    				
    	    	}
    			else
    			{
    				//Match and check to see if we need to update
            		//Only Update when the number does NOT match
            		if (seqNumber != sctRelRs[sf].getValue({'name':allCols[2].name}))
            		{
            			try
            			{
            				var updValuesJson = {};
            				updValuesJson[_updJson.fieldid] = seqNumber;
            				
            				record.submitFields({
            					'type':record.Type.JOB,
            					'id':sctRelRs[sf].getValue({'name':allCols[0].name}),
            					'values':updValuesJson,
            					'options':{
            						'enablesourcing':false,
            						'ignoreMandatoryFields':true
            					}
            				});
            			}
            			catch(recupd)
            			{
            				//Throw Error with Detail message
            				throw error.create({
            					'name':_updJson.updatetype+'_'+_updJson.seqtype+'REC_ERROR',
            					'message':'Error Resequencing '+_updJson.seqtype+' Record for '+_updJson.updatetype+' - Booking ID '+
            							   sctRelRs[sf].getValue({'name':allCols[0].name})+' // '+
            							   custUtil.getErrDetail(recupd),
            					'notifyOff':true
            				});
            			}
            		}
    			}
    			
        		//Increment the sequence
        		seqNumber += 1;
        	}
    		
    		log.debug(
    			_updJson.seqtype+' Record Re-sequence completed',
    			'Remaining Usage: '+runtime.getCurrentScript().getRemainingUsage());
    		
    	}
	}
	
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function executeResequence(context) 
    {
    	
    	var oldNewFldIds = ['custentity_bo_coachdisplayname','custentity_bo_topic',
    	                   //add in fields as each scripted fields come live
    	                   'custentity_ref_coursedisplayname', 'custentity_bo_item',
    	                   'custentity_ref_courseedition', 'custentity_bo_course'
    	                   ];
    	    //newFldOnlyIds is for REFERENCE ONLY now.
    		//	NEW will always run. 
    		//newFldOnlyIds = ['enddate','custentity_bo_iscancelled','custentity_ref_bookitemduration'],
    	    
    	    //sctFldList shows which script field re-sequencing is updating.
    	    //	Difference between oldNewFldIds and newFldOnlyIds is 
    	    //	to whether to run it against both Old and New Values or New ONLY
    	    sctFldList = ['custentity_sctbookfield1', //0
    	                  'custentity_sctbookfield2', //1
    	                  //Resequencing for Field 3 and 4 needs to be turned on at the same time
    	                  //	This is because they both have potential for touching same booking records.
    	                  'custentity_sctbookfield3', //2
    	                  'custentity_sctbookfield4', //3
    	                  'custentity_sctbookfield5', //4
    	                  //Resequencing for Field 6 WILL include setting of Field 7
    	                  'custentity_sctbookfield6']; //5 
    	
    	//When THIS scheduced script executes against stored Task,
    	//	It will reschedule itself up to 5 times (As of now)
    	//	Each time it processes scripted field, it will pass in next scripted field index
    	//	THIS is to ensure each job completes and without running out of governance.
    	//	ASSUMPTION:
    	//		- It assumes each scripted task can be completed without need for reschedule.
    	
    		//Empty or BOTH or NEW
    	var sctParamUpdateType = runtime.getCurrentScript().getParameter('custscript_525_updtype'), 
    		//Next Index to process in sctFldList array
    		sctParamNextFldIndex = runtime.getCurrentScript().getParameter('custscript_525_nextindex'); 
    	
    	try
    	{
    		//search against Scripted Fields Resequence Tasks (customrecord_ax_sctfldsreseqtasks)
    		//	to grab list of items to process.
    		//	Look for those that are Active and Status is "Pending"
    		var reSeqSearch = search.create({
	    			'type':'customrecord_ax_sctfldsreseqtasks',
	    			'filters':[
	    			           	['isinactive', 'is', false],
	    			           	'and',
	    			           	[
	    			           	 	['custrecord_sfrst_taskstatus', 'is','Pending'],
	    			           	 	'or',
	    			           	 	['custrecord_sfrst_taskstatus', 'is','Failed']
	    			           	]
	    			           	//'and',
	    			           	//TESTING FILTER
	    			           	//,'and',
	    			           	//['internalid', 'anyof',['2693']]
	    			           	//END TESTING FILTER
	    			          ],
	    			'columns':[
								search.createColumn({
									'name':'created',
									'sort':search.Sort.ASC
								}),
	    			           	'internalid',
	    			           	'custrecord_sfrst_taskstatus',
	    			           	'custrecord_sfrst_triggeredby',
	    			           	'custrecord_sfrst_jsonstring'
	    			          ]
	    		}),
	    		reSeqRs = reSeqSearch.run().getRange({
	    			'start':0,
	    			'end':1000
	    		});
    		
    		//JSON Object describing different stages of resequencing
    		
    		
    		//Loop through each result and execute re-sequencing for 
    		for (var r=0; reSeqRs && r < reSeqRs.length; r+=1)
    		{
    			var jsonParam = reSeqRs[r].getValue('custrecord_sfrst_jsonstring'),
    				reSeqId = reSeqRs[r].getValue('internalid'),
    				
    				/**
    				 * Depending on the reseqType, it will run for BOTH old/new records or New values ONLY.
    				 * NEW means only date, is cancelled or item duration changed. 
    				 * Keep in mind if reseqType is NEW, it WILL run for ALL scripted fields.
    				 * 		This is because the booking being updated can belong to one or ALL of scripted field list
    				 */
    				reseqType = 'NEW';
    			
    			try
    			{
    				if (!custUtil.strTrim(jsonParam))
                	{
                		throw error.create({
                			'name':'MISSING_PROCESS_JSON',
                			'message':'Process JSON string is missing',
                			'notifyOff':true
                		});
                	}
    				
    				//Review JSON Object and find out what job to run
    				/**
    				 * Sample JSON format
    				 * {
						   "reseq":true,
						   //fields will ONLY include changed fields
						   "fields":[
						      "custentity_bo_topic",
						      "custentity_ref_coursedisplayname",
						      "custentity_bo_course"
						   ],
						   "bookingid":1195277,
						   //mapping will include ALL tracked fields
						   "changed":{
						      "custentity_bo_topic":{
						         "old":"131",
						         "new":"147"
						      },
						      "custentity_ref_coursedisplayname":{
						         "old":"First Line Managers Programme, Day 1 AM, Direct",
						         "new":"Booster"
						      },
						      "custentity_bo_course":{
						         "old":"4440",
						         "new":"3400"
						      }
						   }
						}
    				 */
    				
    				//log.debug('JSON', jsonParam);
    				
    				jsonParam = JSON.parse(jsonParam);
    				
    				//------- 1. We need to find out if we need to run each scripted field resequence against 
    				//		Old and New or NEW ONLY
    				//	This is DONE ONLY if it's first time running
    				//	When script runs for the first time against a task record
    				//	It will NOT have any values in it
    				if (!sctParamUpdateType && !sctParamNextFldIndex)
    				{
    					//Loop through each of oldNewFldIds and see if exists in changed fields
    					for (var bf=0; bf < oldNewFldIds.length; bf+=1)
    					{
    						log.debug('oldNew Fld '+bf, oldNewFldIds[bf]);
    						
    						if (jsonParam.fields.indexOf(oldNewFldIds[bf]) > -1)
    						{
    							reseqType = 'BOTH';
    							break;
    						}
    					}
    					
    					//log.debug('First Time - reseq Type', reseqType);
    				}//End check to update both or new only
    				else
    				{
    					reseqType = sctParamUpdateType;
    					
    					//log.debug('Rescheduled - reseq Type', reseqType);
    				}
    				
    				//------- 2. Loop through each sctFldList and execute re-sequencing
    				//			 when sctParamNextFldIndex match sctFldList.length, we Update the Task as Success
    				//				- This will be end of Loop for sctFldList and move to next task
    				//			 Each time it completes sctFldList element, it will reschedule itself
    				//				up to total sctFldList.length
    				//			 Any anypoint, the update throws an error, it will throw for entire task and mark it as ERROR
    				var sctFldIndex = 0;
    				if (sctParamNextFldIndex)
    				{
    					sctFldIndex = parseInt(sctParamNextFldIndex);
    				}
    				
    				//Go through each scripted Field List
    				for (var sct=sctFldIndex; sct < sctFldList.length; sct+=1)
    				{
    					//Run Core Logic for Each Scripted Field in loop
    					log.debug('scripted list index '+sct, sctFldList[sct]);
    					
    					/**
    					 * IMPORTANOT NOTE:
    					 * During initial implementation, Each scripted field search WILL execute against ALL 
    					 * Matching booking. This is because there could be time gap between fully updating legacy booking
    					 * sequence numbers vs. being able to run against each tasks. 
    					 * Once Each scripted field is completed, search will be modified to run against ONLY the 
    					 * Scheduled ones. 
    					 */
    					
    					//This is search result object used by ALL scripted fields.
    					// THIS is being instiated here so that each script completed percentage can be calculated
    					//	Important to re-iterate, after each scripted field calc job, it will reschedule itself
    					//	to run next scripted field in the sctFldList array.
    					/**
    					log.debug('loading booking', jsonParam.bookingid);
    						//Load the booking record to access values of NONE changed Fields
    					var	bookingRec = record.load({
    							'type':record.Type.JOB,
    							'id':jsonParam.bookingid,
    							'isDynamic':true
    						}),
    					*/
    					
    						//[SCRIPT]_Field 1 (Ungrouped Re-Sequence) - 4017
    					var	baseSearchFld1 = runtime.getCurrentScript().getParameter('custscript_525_sctfld1search'),
    						
    						//[SCRIPT]_Field 2 (Ungrouped Re-Sequence) - 4019
    						baseSearchFld2 = runtime.getCurrentScript().getParameter('custscript_525_sctfld2search'),
    						
    						//[SCRIPT]_Field 3 (Ungrouped Re-Sequence) - 4020
    						baseSearchFld3 = runtime.getCurrentScript().getParameter('custscript_525_sctfld3search'),
    						
    						//[SCRIPT]_Field 4 (Ungrouped Re-Sequence) - 4021
    						baseSearchFld4 = runtime.getCurrentScript().getParameter('custscript_525_sctfld4search'),
    						
    						//[SCRIPT]_Field 5 (Ungrouped Re-Sequence) - 4115
    						baseSearchFld5 = runtime.getCurrentScript().getParameter('custscript_525_sctfld5search'),
    						
    						//[SCRIPT]_Field 6 & 7 (Ungrouped Re-Sequence) - 4189
    						baseSearchFld6 = runtime.getCurrentScript().getParameter('custscript_525_sctfld6search');
    					
    					//Run through Each Use Case, Identify IF we NEED to run and re-sequence
    					switch(sctFldList[sct])
    					{
    						//------------------------------- SCT FLD 1 Core ------------------------------------------------------
    						case 'custentity_sctbookfield1':
    							//Case to execuite logic for Scripted Field 1
    							//Logic Desc:
    							//Changed Fields has following fields: custentity_bo_coachdisplayname + custentity_bo_topic
    							//OR changed fields one of "newFldOnlyIds"
    							var sct1Flds = ['custentity_bo_coachdisplayname','custentity_bo_topic'],
    								hasSct1Flds = false;
    							
    							//Loop through each sct1Flds and see if it is one of changed fields
    							for (var sct1=0; sct1 < sct1Flds.length; sct1 += 1)
    							{
    								if (jsonParam.fields.indexOf(sct1Flds[sct1]) > -1)
    								{
    									hasSct1Flds = true;
    									break;
    								}
    							}
    							
    							if (!hasSct1Flds && reseqType != 'NEW')
    							{
    								log.debug('Skip Sct Fld 1','No Need to process Sct 1. ');
    								break;
    							}
    							
    							
    							//--- Start with Old Value Re-Sequencing First
    							if (reseqType == 'BOTH')
    							{
    								//Scripted Field 1 Required Old Field Values
    								var oldCoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname'].old,
    									oldCoachTopicValue = jsonParam.changed['custentity_bo_topic'].old;
    								
    								//ONLY need to process if coach display name is NOT blank
    								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
    								//	IF old value is null/empty, no need to resequence them
    								if (oldCoachDisplayName)
    								{
    									//make sure empty string is replaced by @NONE@
    									if (!oldCoachTopicValue)
    									{
    										oldCoachTopicValue = '@NONE@';
    									}
    									
    									//Load Scripted Fld 1 base saved search
    									var	oldSct1Search = search.load({
    										'id':baseSearchFld1
    									});
    									
    									//Grab existing filter as expression
    									var oldSct1Filter = oldSct1Search.filterExpression;
    									//Add in sct field 1 specific filters
    									oldSct1Filter.push('AND');
    									oldSct1Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',oldCoachDisplayName]);
    									oldSct1Filter.push('AND');
    									oldSct1Filter.push(['custentity_bo_course.custrecord_course_topic','anyof', oldCoachTopicValue]);
    									
    									//Set the filter back to loaded saved search
    									oldSct1Search.filterExpression = oldSct1Filter;
    									
    									log.debug('oldsct1filter',JSON.stringify(oldSct1Filter));
    									
    									loopAndReSeq(
    										{
    											'updatetype':'SCT_FLD_1',
    											'fieldid':'custentity_sctbookfield1',
    											'seqtype':'OLD'
    										}, 
    										oldSct1Search
    									);
    									
    								}//End check for old Values resequencing task
    								
    							}
    							
    							//Either its BOTH or NEW, new ones need to get processed anyway
    							//Scripted Field 1 Required Old Field Values
								var newCoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname']['new'],
									newCoachTopicValue = jsonParam.changed['custentity_bo_topic']['new'];
								
								//ONLY need to process if coach display name is NOT blank
								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
								//	IF old value is null/empty, no need to re-sequence them
								//	User Event will null out all scripted fields if set to null/empty
								if (newCoachDisplayName)
								{
									//make sure empty string is replaced by @NONE@
									if (!newCoachTopicValue)
									{
										newCoachTopicValue = '@NONE@';
									}
									
									//Load Scripted Fld 1 base saved search
									var	newSct1Search = search.load({
										'id':baseSearchFld1
									});
									
									//Grab existing filter as expression
									var newSct1Filter = newSct1Search.filterExpression;
									//Add in sct field 1 specific filters
									newSct1Filter.push('AND');
									newSct1Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',newCoachDisplayName]);
									newSct1Filter.push('AND');
									newSct1Filter.push(['custentity_bo_course.custrecord_course_topic','anyof', newCoachTopicValue]);
									
									//Set the filter back to loaded saved search
									newSct1Search.filterExpression = newSct1Filter;
									
									log.debug('newsct1filter',JSON.stringify(newSct1Filter));
									
									loopAndReSeq(
    									{
    										'updatetype':'SCT_FLD_1',
    										'fieldid':'custentity_sctbookfield1',
    										'seqtype':'NEW'
    									}, 
    									newSct1Search
    								);
									
								}//End check for old Values resequencing task
    							
    							break;
    						
    						//------------------------------- SCT FLD 2 Core ------------------------------------------------------
    						case 'custentity_sctbookfield2':
    							//Case to execute logic for Scripted Field 2
    							//Logic Desc:
    							//	Coach + Course Name + Item
    							//Changed Fields has following fields: custentity_bo_coachdisplayname + custentity_bo_item + custentity_ref_coursedisplayname
    							//OR changed fields one of "newFldOnlyIds"
    							var sct2Flds = ['custentity_bo_coachdisplayname','custentity_bo_item', 'custentity_ref_coursedisplayname'],
    								hasSct2Flds = false;
    							
    							//Loop through each sct2Flds and see if it is one of changed fields
    							for (var sct2=0; sct2 < sct2Flds.length; sct2 += 1)
    							{
    								if (jsonParam.fields.indexOf(sct2Flds[sct2]) > -1)
    								{
    									hasSct2Flds = true;
    									break;
    								}
    							}
    							
    							if (!hasSct2Flds && reseqType != 'NEW')
    							{
    								log.debug('Skip Sct Fld 2','No Need to process Sct 2. ');
    								break;
    							}
    							
    							//--- Start with Old Value Re-Sequencing First
    							if (reseqType == 'BOTH')
    							{
    								//Scripted Field 2 Required Old Field Values
    								var oldsf2CoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname'].old,
    									oldItemValue = jsonParam.changed['custentity_bo_item'].old,
    									oldCourseName = jsonParam.changed['custentity_ref_coursedisplayname'].old;
    								
    								//ONLY need to process if coach display name is NOT blank
    								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
    								//	IF old value is null/empty, no need to resequence them
    								if (oldsf2CoachDisplayName)
    								{
    									//make sure empty string is replaced by @NONE@ for secondary grouping fields
    									if (!oldItemValue)
    									{
    										oldItemValue = '@NONE@';
    									}
    									
    									if (!oldCourseName)
    									{
    										oldCourseName = '';
    									}
    									
    									//Load Scripted Fld 2 base saved search
    									var	oldSct2Search = search.load({
    										'id':baseSearchFld2
    									});
    									
    									//Grab existing filter as expression
    									var oldSct2Filter = oldSct2Search.filterExpression;
    									//Add in sct field 2 specific filters
    									oldSct2Filter.push('AND');
    									oldSct2Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',oldsf2CoachDisplayName]);
    									oldSct2Filter.push('AND');
    									//Need to change operator to isempty if coursename is empty
    									var displayNameOperator = 'is';
    									if (!oldCourseName)
    									{
    										displayNameOperator = 'isempty';
    									}
    									oldSct2Filter.push(['custentity_bo_course.custrecord_course_displayname',displayNameOperator, oldCourseName]);
    									oldSct2Filter.push('AND');
    									oldSct2Filter.push(['custentity_bo_item','anyof',oldItemValue]);
    									
    									
    									//Set the filter back to loaded saved search
    									oldSct2Search.filterExpression = oldSct2Filter;
    									
    									log.debug('oldsct2filter',JSON.stringify(oldSct2Filter));
    									
    									loopAndReSeq(
        									{
        										'updatetype':'SCT_FLD_2',
        										'fieldid':'custentity_sctbookfield2',
        										'seqtype':'OLD'
        									}, 
        									oldSct2Search
        								);
    									
    								}//End check for old Values resequencing task
    								
    							}//End check for BOTH (Old Rec update for SC2)
    							
    							//Either its BOTH or NEW, new ones need to get processed anyway
    							//Since this is NEW ONLY, we need to re-sequence against New values only.
								//Scripted Field 1 Required Old Field Values
								var newSf2CoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname']['new'],
									newSf2ItemValue = jsonParam.changed['custentity_bo_item']['new'],
									newSf2CourseName = jsonParam.changed['custentity_ref_coursedisplayname']['new'];
									
								
								//ONLY need to process if coach display name is NOT blank
								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
								//	IF old value is null/empty, no need to re-sequence them
								//	User Event will null out all scripted fields if set to null/empty
								if (newSf2CoachDisplayName)
								{
									//make sure empty string is replaced by @NONE@
									if (!newSf2ItemValue)
									{
										newSf2ItemValue = '@NONE@';
									}
									
									if (!newSf2CourseName)
									{
										newSf2CourseName = '';
									}
									
									//Load Scripted Fld 2 base saved search
									var	newSct2Search = search.load({
										'id':baseSearchFld2
									});
									
									//Grab existing filter as expression
									var newSct2Filter = newSct2Search.filterExpression;
									//Add in sct field 2 specific filters
									newSct2Filter.push('AND');
									newSct2Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',newSf2CoachDisplayName]);
									newSct2Filter.push('AND');
									//Need to change operator to isempty if coursename is empty
									var newDisplayNameOperator = 'is';
									if (!newSf2CourseName)
									{
										newDisplayNameOperator = 'isempty';
									}
									newSct2Filter.push(['custentity_bo_course.custrecord_course_displayname',newDisplayNameOperator, newSf2CourseName]);
									newSct2Filter.push('AND');
									newSct2Filter.push(['custentity_bo_item','anyof',newSf2ItemValue]);
									
									//Set the filter back to loaded saved search
									newSct2Search.filterExpression = newSct2Filter;
									
									log.debug('newsct2filter',JSON.stringify(newSct2Search.filterExpression));
									
									loopAndReSeq(
        								{
        									'updatetype':'SCT_FLD_2',
        									'fieldid':'custentity_sctbookfield2',
        									'seqtype':'NEW'
        								}, 
        								newSct2Search
        							);
									
								}//End check for old Values resequencing task
    							
    							
    							break;
    						
    						//------------------------------- SCT FLD 3 Core ------------------------------------------------------
    						case 'custentity_sctbookfield3':
    							//Case to execute logic for Scripted Field 3
    							//Logic Desc:
    							//	Coach + Course Name + Item + Course Edition (Big Numbers Only)
    							//Changed Fields has following fields: 
    							//		custentity_bo_coachdisplayname + custentity_bo_item + custentity_ref_coursedisplayname + custentity_ref_courseedition
    							//OR changed fields one of "newFldOnlyIds"
    							var sct3Flds = ['custentity_bo_coachdisplayname',
    							                'custentity_bo_item', 
    							                'custentity_ref_coursedisplayname',
    							                'custentity_ref_courseedition'],
    								hasSct3Flds = false;
    							
    							//Loop through each sct3Flds and see if it is one of changed fields
    							for (var sct3=0; sct3 < sct3Flds.length; sct3 += 1)
    							{
    								if (jsonParam.fields.indexOf(sct3Flds[sct3]) > -1)
    								{
    									hasSct3Flds = true;
    									break;
    								}
    							}
    							
    							if (!hasSct3Flds && reseqType != 'NEW')
    							{
    								log.debug('Skip Sct Fld 3','No Need to process Sct 3. ');
    								break;
    							}
    							
    							log.debug('SCT #3 Start', 'Starting SCT');
    							
    							//--- Start with Old Value Re-Sequencing First
    							if (reseqType == 'BOTH')
    							{
    								//Scripted Field 3 Required Old Field Values
    								var oldsf3CoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname'].old,
    									oldItemValue = jsonParam.changed['custentity_bo_item'].old,
    									oldCourseName = jsonParam.changed['custentity_ref_coursedisplayname'].old,
    									oldEditionNum = jsonParam.changed['custentity_ref_courseedition'].old;
    								
    								//ONLY need to process if coach display name is NOT blank
    								// AND
    								//	course edition is NOT Blank
    								// AND
    								//	course edition is greater than 0
    								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
    								//	IF old value is null/empty, no need to resequence them
    								//log.debug('inside both', oldEditionNum);
    								
    								var oldEditionVal = 0;
    								
    								if (oldEditionNum)
    								{
    									//log.debug('inside oldEdition empty test','this is not empty');
    									if (parseFloat(custUtil.strTrim(oldEditionNum)) > 0)
    									{
    										log.debug('inside math floor','passed the test. inside');
        									//We are Grabbing ONLY the BIG number
        									oldEditionVal = Math.floor(parseFloat(custUtil.strTrim(oldEditionNum)));
    									}
    									
    								}
    								
    								log.debug('Sct Fld #3 Original // Old Edition Val Trunc', oldEditionNum+' // '+oldEditionVal);
    								
    								if (oldsf3CoachDisplayName && oldEditionVal > 0)
    								{
    									//make sure empty string is replaced by @NONE@ for secondary grouping fields
    									if (!oldItemValue)
    									{
    										oldItemValue = '@NONE@';
    									}
    									
    									if (!oldCourseName)
    									{
    										oldCourseName = '';
    									}
    									//Load Scripted Fld 3 base saved search
    									var	oldSct3Search = search.load({
    										'id':baseSearchFld3
    									});
    									
    									//Grab existing filter as expression
    									var oldSct3Filter = oldSct3Search.filterExpression;
    									//Add in sct field 3 specific filters
    									oldSct3Filter.push('AND');
    									oldSct3Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',oldsf3CoachDisplayName]);
    									oldSct3Filter.push('AND');
    									//Need to change operator to isempty if coursename is empty
    									var displayNameOperator = 'is';
    									if (!oldCourseName)
    									{
    										displayNameOperator = 'isempty';
    									}
    									oldSct3Filter.push(['custentity_bo_course.custrecord_course_displayname',displayNameOperator, oldCourseName]);
    									oldSct3Filter.push('AND');
    									oldSct3Filter.push(['custentity_bo_item','anyof',oldItemValue]);
    									
    									//Need to add in filter for compariong oldEditionVal (Big number only)
    									oldSct3Filter.push('AND');
    									oldSct3Filter.push(["formulanumeric: TRUNC({custentity_bo_course.custrecord_course_edition})","equalto",oldEditionVal]);
    									
    									//Set the filter back to loaded saved search
    									oldSct3Search.filterExpression = oldSct3Filter;
    									
    									log.debug('oldsct3filter',JSON.stringify(oldSct3Filter));
    									
    									loopAndReSeq(
        									{
        										'updatetype':'SCT_FLD_3',
        										'fieldid':'custentity_sctbookfield3',
        										'seqtype':'OLD'
        									}, 
        									oldSct3Search
        								);
    									
    								}//End check for old Values resequencing task
    								
    							}//End check for BOTH (Old Rec update for SC3)
    							
    							//Either its BOTH or NEW, new ones need to get processed anyway
    							//Since this is NEW ONLY, we need to re-sequence against New values only.
								//Scripted Field 1 Required Old Field Values
								var newSf3CoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname']['new'],
									newSf3ItemValue = jsonParam.changed['custentity_bo_item']['new'],
									newSf3CourseName = jsonParam.changed['custentity_ref_coursedisplayname']['new'],
									newEditionNum = jsonParam.changed['custentity_ref_courseedition']['new'];
								
								//ONLY need to process if coach display name is NOT blank
								// AND
								//	course edition is NOT Blank
								// AND
								//	course edition is greater than 0
								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
								//	IF old value is null/empty, no need to resequence them
								log.debug('newEditionNum',newEditionNum);
								var newEditionVal = 0;
								if (newEditionNum && parseFloat(newEditionNum) > 0)
								{
									//Grab ONLY the BIG Number for New Edition Value
									log.debug('inside math trunc', parseFloat(newEditionNum));
									newEditionVal = Math.floor(parseFloat(newEditionNum));
								}
								
								log.debug('Sct Fld #3 Original // new Edition Val Trunc', newEditionNum+' // '+newEditionVal);
									
								
								//ONLY need to process if coach display name is NOT blank
								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
								//	IF old value is null/empty, no need to re-sequence them
								//	User Event will null out all scripted fields if set to null/empty
								if (newSf3CoachDisplayName && newEditionVal > 0)
								{
									//make sure empty string is replaced by @NONE@
									if (!newSf3ItemValue)
									{
										newSf3ItemValue = '@NONE@';
									}
									
									if (!newSf3CourseName)
									{
										newSf3CourseName = '';
									}
									
									//Load Scripted Fld 3 base saved search
									var	newSct3Search = search.load({
										'id':baseSearchFld3
									});
									
									//Grab existing filter as expression
									var newSct3Filter = newSct3Search.filterExpression;
									//Add in sct field 3 specific filters
									newSct3Filter.push('AND');
									newSct3Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',newSf3CoachDisplayName]);
									newSct3Filter.push('AND');
									//Need to change operator to isempty if coursename is empty
									var newDisplayNameOperator = 'is';
									if (!newSf3CourseName)
									{
										newDisplayNameOperator = 'isempty';
									}
									newSct3Filter.push(['custentity_bo_course.custrecord_course_displayname',newDisplayNameOperator, newSf3CourseName]);
									newSct3Filter.push('AND');
									newSct3Filter.push(['custentity_bo_item','anyof',newSf3ItemValue]);
									
									//Need to add in filter for compariong oldEditionVal (Big number only)
									newSct3Filter.push('AND');
									newSct3Filter.push(["formulanumeric: TRUNC({custentity_bo_course.custrecord_course_edition})","equalto",newEditionVal]);
									
									//Set the filter back to loaded saved search
									newSct3Search.filterExpression = newSct3Filter;
									
									log.debug('newsct3filter',JSON.stringify(newSct3Filter));
									
									loopAndReSeq(
        								{
        									'updatetype':'SCT_FLD_3',
        									'fieldid':'custentity_sctbookfield3',
        									'seqtype':'NEW'
        								}, 
        								newSct3Search
        							);
									
								}//End check for old Values resequencing task
    							
    							break;
    						
    						//------------------------------- SCT FLD 4 Core ------------------------------------------------------	
    						case 'custentity_sctbookfield4':
    							//Case to execute logic for Scripted Field 4
    							//Logic Desc:
    							//Difference between the 3 and 4 is that 4 uses FULL EDITION NUMBER
    							//	Coach + Course Name + Item + Course Edition (Full Number)
    							//Changed Fields has following fields: 
    							//		custentity_bo_coachdisplayname + custentity_bo_item + custentity_ref_coursedisplayname + custentity_ref_courseedition
    							//OR changed fields one of "newFldOnlyIds"
    							var sct4Flds = ['custentity_bo_coachdisplayname',
    							                'custentity_bo_item', 
    							                'custentity_ref_coursedisplayname',
    							                'custentity_ref_courseedition'],
    								hasSct4Flds = false;
    							
    							//Loop through each sct4Flds and see if it is one of changed fields
    							for (var sct4=0; sct4 < sct4Flds.length; sct4 += 1)
    							{
    								if (jsonParam.fields.indexOf(sct4Flds[sct4]) > -1)
    								{
    									hasSct4Flds = true;
    									break;
    								}
    							}
    							
    							if (!hasSct4Flds && reseqType != 'NEW')
    							{
    								log.debug('Skip Sct Fld 4','No Need to process Sct 4. ');
    								break;
    							}
    							
    							log.debug('SCT #4 Start', 'Starting SCT #4');
    							
    							//--- Start with Old Value Re-Sequencing First
    							if (reseqType == 'BOTH')
    							{
    								//Scripted Field 4 Required Old Field Values
    								var oldsf4CoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname'].old,
    									oldItemValue = jsonParam.changed['custentity_bo_item'].old,
    									oldCourseName = jsonParam.changed['custentity_ref_coursedisplayname'].old,
    									oldEditionNum = jsonParam.changed['custentity_ref_courseedition'].old;
    								
    								//ONLY need to process if coach display name is NOT blank
    								// AND
    								//	course edition is NOT Blank
    								// AND
    								//	course edition is greater than 0
    								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
    								//	IF old value is null/empty, no need to resequence them
    								var oldEditionVal = 0;
    								if (oldEditionNum && parseFloat(oldEditionNum) > 0)
    								{
    									//For scripted fld #4, we use FULL Edition Number
    									oldEditionVal = parseFloat(oldEditionNum);
    								}
    								
    								log.debug('SCT #4 Full Edition','Converted to Float: '+oldEditionVal);
    								
    								if (oldsf4CoachDisplayName && oldEditionVal > 0)
    								{
    									//make sure empty string is replaced by @NONE@ for secondary grouping fields
    									if (!oldItemValue)
    									{
    										oldItemValue = '@NONE@';
    									}
    									
    									if (!oldCourseName)
    									{
    										oldCourseName = '';
    									}
    									//Load Scripted Fld 4 base saved search
    									var	oldSct4Search = search.load({
    										'id':baseSearchFld4
    									});
    									
    									//Grab existing filter as expression
    									var oldSct4Filter = oldSct4Search.filterExpression;
    									//Add in sct field 4 specific filters
    									oldSct4Filter.push('AND');
    									oldSct4Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',oldsf4CoachDisplayName]);
    									oldSct4Filter.push('AND');
    									//Need to change operator to isempty if coursename is empty
    									var displayNameOperator = 'is';
    									if (!oldCourseName)
    									{
    										displayNameOperator = 'isempty';
    									}
    									oldSct4Filter.push(['custentity_bo_course.custrecord_course_displayname',displayNameOperator, oldCourseName]);
    									oldSct4Filter.push('AND');
    									oldSct4Filter.push(['custentity_bo_item','anyof',oldItemValue]);
    									
    									//Need to add in filter for comparing oldEditionVal (Full number)
    									oldSct4Filter.push('AND');
    									oldSct4Filter.push(["custentity_bo_course.custrecord_course_edition","equalto",oldEditionVal]);
    									
    									//Set the filter back to loaded saved search
    									oldSct4Search.filterExpression = oldSct4Filter;
    									
    									log.debug('oldsct4filter',JSON.stringify(oldSct4Filter));
    									
    									loopAndReSeq(
        									{
        										'updatetype':'SCT_FLD_4',
        										'fieldid':'custentity_sctbookfield4',
        										'seqtype':'OLD'
        									}, 
        									oldSct4Search
        								);
    									
    								}//End check for old Values resequencing task
    								
    							}//End check for BOTH (Old Rec update for SC4)
    							
    							//Either its BOTH or NEW, new ones need to get processed anyway
    							//Since this is NEW ONLY, we need to re-sequence against New values only.
								var newSf4CoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname']['new'],
									newSf4ItemValue = jsonParam.changed['custentity_bo_item']['new'],
									newSf4CourseName = jsonParam.changed['custentity_ref_coursedisplayname']['new'],
									newEditionNum = jsonParam.changed['custentity_ref_courseedition']['new'];
								
								//ONLY need to process if coach display name is NOT blank
								// AND
								//	course edition is NOT Blank
								// AND
								//	course edition is greater than 0
								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
								//	IF old value is null/empty, no need to resequence them
								log.debug('newEditionNum',newEditionNum);
								var newEditionVal = 0;
								if (newEditionNum && parseFloat(newEditionNum) > 0)
								{
									//Grab the FULL Number for New Edition Value
									newEditionVal = parseFloat(newEditionNum);
								}
								
								log.debug('Sct Fld #4 Original // new Edition Val', newEditionNum+' // '+newEditionVal);
								
								//ONLY need to process if coach display name is NOT blank
								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
								//	IF old value is null/empty, no need to re-sequence them
								//	User Event will null out all scripted fields if set to null/empty
								if (newSf4CoachDisplayName && newEditionVal > 0)
								{
									//make sure empty string is replaced by @NONE@
									if (!newSf4ItemValue)
									{
										newSf4ItemValue = '@NONE@';
									}
									
									if (!newSf4CourseName)
									{
										newSf4CourseName = '';
									}
									
									//Load Scripted Fld 4 base saved search
									var	newSct4Search = search.load({
										'id':baseSearchFld4
									});
									
									//Grab existing filter as expression
									var newSct4Filter = newSct4Search.filterExpression;
									//Add in sct field 4 specific filters
									newSct4Filter.push('AND');
									newSct4Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',newSf4CoachDisplayName]);
									newSct4Filter.push('AND');
									//Need to change operator to isempty if coursename is empty
									var newDisplayNameOperator = 'is';
									if (!newSf4CourseName)
									{
										newDisplayNameOperator = 'isempty';
									}
									newSct4Filter.push(['custentity_bo_course.custrecord_course_displayname',newDisplayNameOperator, newSf4CourseName]);
									newSct4Filter.push('AND');
									newSct4Filter.push(['custentity_bo_item','anyof',newSf4ItemValue]);
									
									//Need to add in filter for compariong newEditionVal (Full Edition)
									newSct4Filter.push('AND');
									newSct4Filter.push(["custentity_bo_course.custrecord_course_edition","equalto",newEditionVal]);
									
									//Set the filter back to loaded saved search
									newSct4Search.filterExpression = newSct4Filter;
									
									log.debug('newsct4filter',JSON.stringify(newSct4Filter));
									
									loopAndReSeq(
        								{
        									'updatetype':'SCT_FLD_4',
        									'fieldid':'custentity_sctbookfield4',
        									'seqtype':'NEW'
        								}, 
        								newSct4Search
        							);
									
								}//End check for old Values resequencing task
    							
    							break;
    							//------------------------------- SCT FLD 5 Core ------------------------------------------------------	
    						case 'custentity_sctbookfield5':
    							//Case to execute logic for Scripted Field 5
    							//Logic Desc:
    							//	Coach + Item
    							//Changed Fields has following fields: 
    							//		custentity_bo_coachdisplayname + custentity_bo_item
    							//OR changed fields one of "newFldOnlyIds"
    							var sct5Flds = ['custentity_bo_coachdisplayname',
    							                'custentity_bo_item'],
    								hasSct5Flds = false;
    							
    							//Loop through each sct5Flds and see if it is one of changed fields
    							for (var sct5=0; sct5 < sct5Flds.length; sct5 += 1)
    							{
    								if (jsonParam.fields.indexOf(sct5Flds[sct5]) > -1)
    								{
    									hasSct5Flds = true;
    									break;
    								}
    							}
    							
    							if (!hasSct5Flds && reseqType != 'NEW')
    							{
    								log.debug('Skip Sct Fld 5','No Need to process Sct 5. ');
    								break;
    							}
    							
    							log.debug('SCT #5 Start', 'Starting SCT #5');
    							
    							//--- Start with Old Value Re-Sequencing First
    							if (reseqType == 'BOTH')
    							{
    								//Scripted Field 5 Required Old Field Values
    								var oldsf5CoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname'].old,
    									oldItemValue = jsonParam.changed['custentity_bo_item'].old;
    								
    								//ONLY need to process if coach display name is NOT blank
    								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
    								//	IF old value is null/empty, no need to resequence them
    								if (oldsf5CoachDisplayName)
    								{
    									//make sure empty string is replaced by @NONE@ for secondary grouping fields
    									if (!oldItemValue)
    									{
    										oldItemValue = '@NONE@';
    									}
    									
    									//Load Scripted Fld 5 base saved search
    									var	oldSct5Search = search.load({
    										'id':baseSearchFld5
    									});
    									
    									//Grab existing filter as expression
    									var oldSct5Filter = oldSct5Search.filterExpression;
    									//Add in sct field 5 specific filters
    									oldSct5Filter.push('AND');
    									oldSct5Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',oldsf5CoachDisplayName]);
    									oldSct5Filter.push('AND');
    									oldSct5Filter.push(['custentity_bo_item','anyof',oldItemValue]);
    									
    									//Set the filter back to loaded saved search
    									oldSct5Search.filterExpression = oldSct5Filter;
    									
    									log.debug('oldsct5filter',JSON.stringify(oldSct5Filter));
    									
    									loopAndReSeq(
        									{
        										'updatetype':'SCT_FLD_5',
        										'fieldid':'custentity_sctbookfield5',
        										'seqtype':'OLD'
        									}, 
        									oldSct5Search
        								);
    									
    								}//End check for old Values resequencing task
    								
    							}//End check for BOTH (Old Rec update for SC5)
    							
    							//Either its BOTH or NEW, new ones need to get processed anyway
    							//Since this is NEW ONLY, we need to re-sequence against New values only.
								var newSf5CoachDisplayName = jsonParam.changed['custentity_bo_coachdisplayname']['new'],
									newSf5ItemValue = jsonParam.changed['custentity_bo_item']['new'];
								
								//ONLY need to process if coach display name is NOT blank
								//Coach Display Name is Required for ALL scripted field re-sequencing to execute.
								//	IF new value is null/empty, no need to re-sequence them
								//	User Event will null out all scripted fields if set to null/empty
								if (newSf5CoachDisplayName)
								{
									//make sure empty string is replaced by @NONE@
									if (!newSf5ItemValue)
									{
										newSf5ItemValue = '@NONE@';
									}
									
									//Load Scripted Fld 4 base saved search
									var	newSct5Search = search.load({
										'id':baseSearchFld5
									});
									
									//Grab existing filter as expression
									var newSct5Filter = newSct5Search.filterExpression;
									
									//Add in sct field 5 specific filters
									newSct5Filter.push('AND');
									newSct5Filter.push(['custentity_bo_coach.custentity_coach_groupingname','anyof',newSf5CoachDisplayName]);
									newSct5Filter.push('AND');
									newSct5Filter.push(['custentity_bo_item','anyof',newSf5ItemValue]);
									
									//Set the filter back to loaded saved search
									newSct5Search.filterExpression = newSct5Filter;
									
									log.debug('newsct5filter',JSON.stringify(newSct5Filter));
									
									loopAndReSeq(
        								{
        									'updatetype':'SCT_FLD_5',
        									'fieldid':'custentity_sctbookfield5',
        									'seqtype':'NEW'
        								}, 
        								newSct5Search
        							);
									
								}//End check for old Values resequencing task
    							
    							break;
    						
    						//------------------------------- SCT FLD 6 & 7 Core ------------------------------------------------------
    						case 'custentity_sctbookfield6':
    							//Case to execuite logic for Scripted Field 6 where Scripted Field 7 will change based on value of 6
    							//Logic Desc:
    							//Changed Fields has following fields: custentity_bo_item + custentity_bo_topic
    							//OR changed fields one of "newFldOnlyIds"
    							var sct6Flds = ['custentity_bo_item','custentity_bo_topic'],
    								hasSct6Flds = false;
    							
    							//Loop through each sct6Flds and see if it is one of changed fields
    							for (var sct6=0; sct6 < sct6Flds.length; sct6 += 1)
    							{
    								if (jsonParam.fields.indexOf(sct6Flds[sct6]) > -1)
    								{
    									hasSct6Flds = true;
    									break;
    								}
    							}
    							
    							if (!hasSct6Flds && reseqType != 'NEW')
    							{
    								log.debug('Skip Sct Fld 6','No Need to process Sct 6. ');
    								break;
    							}
    							
    							
    							//--- Start with Old Value Re-Sequencing First
    							if (reseqType == 'BOTH')
    							{
    								//Scripted Field 6 Required Old Field Values
    								var oldItem = jsonParam.changed['custentity_bo_item'].old,
    									oldTopicValue = jsonParam.changed['custentity_bo_topic'].old;
    								
    								//make sure empty string is replaced by @NONE@
    								if (!oldTopicValue)
    								{
    									oldTopicValue = '@NONE@';
    								}
    								
    								if (!oldItem)
    								{
    									oldItem = '@NONE@';
    								}
    								
    								//Load Scripted Fld 6 base saved search
    								var	oldSct6Search = search.load({
    									'id':baseSearchFld6
    								});
    									
    								//Grab existing filter as expression
    								var oldSct6Filter = oldSct6Search.filterExpression;
    								//Add in sct field 6 specific filters
    								oldSct6Filter.push('AND');
    								oldSct6Filter.push(['custentity_bo_item','anyof',oldItem]);
    								oldSct6Filter.push('AND');
    								oldSct6Filter.push(['custentity_bo_topic','anyof', oldTopicValue]);
    								
    								//Set the filter back to loaded saved search
    								oldSct6Search.filterExpression = oldSct6Filter;
    								
    								log.debug('oldsct6filter',JSON.stringify(oldSct6Filter));
    								
    								loopAndReSeq(
    									{
    										'updatetype':'SCT_FLD_6_7',
    										'fieldid':'custentity_sctbookfield6',
    										'seqtype':'OLD'
    									}, 
    									oldSct6Search
    								);
    								
    							}
    							
    						//Either its BOTH or NEW, new ones need to get processed anyway
    							
    						//Scripted Field 6 Required New Field Values
							var newItem = jsonParam.changed['custentity_bo_item']['new'],
								newTopicValue = jsonParam.changed['custentity_bo_topic']['new'];
								
							//make sure empty string is replaced by @NONE@
							if (!newTopicValue)
							{
								newTopicValue = '@NONE@';
							}
							
							if (!newItem)
							{
								newItem = '@NONE@';
							}
							
							//Load Scripted Fld 6 base saved search
							var	newSct6Search = search.load({
								'id':baseSearchFld6
							});
								
							//Grab existing filter as expression
							var newSct6Filter = newSct6Search.filterExpression;
							//Add in sct field 6 specific filters
							newSct6Filter.push('AND');
							newSct6Filter.push(['custentity_bo_item','anyof',newItem]);
							newSct6Filter.push('AND');
							newSct6Filter.push(['custentity_bo_topic','anyof', newTopicValue]);
								
							//Set the filter back to loaded saved search
							newSct6Search.filterExpression = newSct6Filter;
							
							log.debug('newsct6filter',JSON.stringify(newSct6Filter));
							
							loopAndReSeq(
								{
									'updatetype':'SCT_FLD_6_7',
									'fieldid':'custentity_sctbookfield6',
									'seqtype':'NEW'
								}, 
								newSct6Search
							);
    							
    						break;
    							
    					}//End Switch Statement
    					
    					if (sct == (sctFldList.length -1) )
    					{
    						//Update this TASK record with SUCCESS
    						//DURING TESTING SHOW LOG INSTEAD OF UPDATE
    						log.debug('Success','Success for Task ID '+reSeqId);
    						record.submitFields({
    	    					'type':'customrecord_ax_sctfldsreseqtasks',
    	    					'id':reSeqId,
    	    					'values':{
    	    						'custrecord_sfrst_taskstatus':'Success',
    	    						'custrecord_sfrst_tasklog':'Successfull re-sequenced this task'
    	    					},
    	    					'options':{
    	    						'enablesourcing':true,
    	    						'ignoreMandatoryFields':true
    	    					}
    	    				});
    	    				
    					}
    					else
    					{
    						//Re-Schedule with Next sctFldList Index
    						var nextIndex = sct + 1;
    						
    						log.debug('Reschedule with next Scripted Field', 'Next Sct Field Index: '+nextIndex);
    						
    						var schSctTask = task.create({
    							'taskType':task.TaskType.SCHEDULED_SCRIPT
    						});
    						
    						schSctTask.scriptId = runtime.getCurrentScript().id;
    						schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
    						schSctTask.params = {
    							'custscript_525_updtype':reseqType,
    							'custscript_525_nextindex': nextIndex
    						};
    						
    						//TESTING Turn Reschedule OFF
    						schSctTask.submit();
    						
    						//Return OUT completely so that it doesn't continue processing
    						log.audit('Rescheduled for '+reSeqId, 'Reschedule Param: '+JSON.stringify(schSctTask.params));
    						
    						return;
    						
    					}
    				}//End Loop for Scripted Fields
    				
    			}
    			catch (rsprocerr)
    			{
    				
    				log.error(
    					'Error Processing Re-Sequence Record ID '+reSeqId,
    					custUtil.getErrDetail(rsprocerr)
    				);
    				
    				//Update the row as ERROR
    				record.submitFields({
    					'type':'customrecord_ax_sctfldsreseqtasks',
    					'id':reSeqId,
    					'values':{
    						'custrecord_sfrst_taskstatus':'Failed',
    						'custrecord_sfrst_tasklog':custUtil.getErrDetail(rsprocerr)
    					},
    					'options':{
    						'enablesourcing':true,
    						'ignoreMandatoryFields':true
    					}
    				});
    				
    			}
    			
    			//Set Percentage Complete fro Main loop
    			var pctCompleted = Math.round(((r+1) / reSeqRs.length) * 100);
        		runtime.getCurrentScript().percentComplete = pctCompleted;
    			
    			//At this point, Reschedule if we are running low on governance point.
    			if (runtime.getCurrentScript().getRemainingUsage() < 1000)
    			{
    				var schSctTaskMain = task.create({
    					'taskType':task.TaskType.SCHEDULED_SCRIPT
    				});
    				schSctTaskMain.scriptId = runtime.getCurrentScript().id;
    				schSctTaskMain.deploymentId = runtime.getCurrentScript().deploymentId;
    				
    				//Don't pass in any dynamic parameter so that It will process next Pending job
    				schSctTaskMain.submit();
    				
    				log.audit('Main Search Rescheduled','Main Search Rescheduled');
    			}
    			
    		} //End Main FOR Loop
    	}
    	catch(procerr)
    	{
    		log.error(
    			'Error Processing ReSequencing',
    			custUtil.getErrDetail(procerr)
    		);
    		
    		//Throw Error with Notification ON
    		//Throw Error with Detail message
			throw error.create({
				'name':'SCTFLD_PROCESS_ERROR',
				'message':'Unexpected Error Re-Sequencing Scripted Fields // '+
						   custUtil.getErrDetail(procerr),
				'notifyOff':true
			});
    		
    	}
    	
    }

    return {
        execute: executeResequence
    };
    
});
