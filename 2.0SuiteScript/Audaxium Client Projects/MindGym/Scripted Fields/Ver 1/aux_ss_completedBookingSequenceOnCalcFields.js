/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 
        'N/error', 
        'N/record', 
        'N/search',
        'N/runtime',
        'N/task',
        '/SuiteScripts/Audaxium Customization/SuiteScript 2.0/UTILITY_LIB'],
/**
 * @param {email} email
 * @param {error} error
 * @param {record} record
 * @param {search} search
 */
function(email, error, record, search, runtime, task, custUtil) 
{
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execUpdate(scriptContext) 
    {
    	//Field 1 Initial sequence search
    	//	- customsearch_field1_delivered_count_2
    	
    	//Field 2 Initial sequence search
    	//	- customsearch_talent_coachoverview_3_2_4
    	
    	//Field 3 Initial sequence search
    	//	- customsearch_talent_coachoverview_3_2__5
    	
    	//Field 4 Initial sequence search
    	//	- customsearch_talent_coachoverview_3_2_10
    	
    	//6/27/2016 - Need to Rerun 3 due to missing Item Grouping
    	
    	//July 5th 2016 - Running Field 4
    	var execSearchId = 'customsearch_talent_coachoverview_3_2_10',
    		curScript = runtime.getCurrentScript(),
    		rangeStart = 0,
    		rangeEnd = 20;
    	
    	log.debug('curScript',JSON.stringify(curScript));
    	
    	//Reschedule logic is based on search result range.
    	//	Each time it gets rescheduled, it will pass in next range to process.
    	//	increments of 10.
    	//	start with 0 - 10, next would be 11 - 20 and so on until there is no more to process
    	//	THIS assumes we are able to process each grouping within 10000 gov units.
    	if (curScript.getParameter('custscript_522_start'))
    	{
    		rangeStart = curScript.getParameter('custscript_522_start');
    	}
    	
    	if (curScript.getParameter('custscript_522_end'))
    	{
    		rangeEnd = curScript.getParameter('custscript_522_end');
    	}
    	
    	log.debug('--- Start/End', execSearchId+' // '+ rangeStart+' - '+rangeEnd);
    	
    	//Calcu Field 1 values
    	var coachText = '',
			topicText = '',
			
			//Calc Field 2 Values
			courseName = '',
			itemText  = '',
			
			//Calc Field 3 Values
			editionBigNum = '',
			
			//Calc Field 4 Values
			fullEditionNum = '',
			
			bookingList = [],
			bookIdUpd = '';
    	
    	try
    	{
    		
    		var bookSearch = search.load({
    				'id':execSearchId
    			}),
    			bookrsSet = bookSearch.run(),
    			bookrs = bookrsSet.getRange({
    				'start':rangeStart,
    				'end':rangeEnd
    			}),
    			isRescheduled = false;
    		
    		if (bookrs && bookrs.length > 0)
    		{
    			var allCols = bookrsSet.columns;
    			//Calc Field 1:
    			//	0 = Coach
    			//	1 = Topic
    			//	2 = List of Bookings
    			
    			//Calc Field 2:
    			//	0 = Coach
    			//	1 = Course Name
    			//	2 = Item
    			//	3 = Booking Count
    			//	4 = Booking IDs
    			
    			//Calc Field 3:
    			//	0 = Coach
    			//	1 = Course Display Name
    			//	2 = Item
    			//	3 = Course Edition Big Number ONLY
    			//	4 = Booking Count
    			//	5 = Booking IDs
    			
    			//Calc Field 4: 
    			//  0 = Coach
    			//	1 = Course Display Name
    			//	2 = Item
    			//	3 = FULL Edition
    			//	4 = Booking Count
    			//	5 = Booking IDs
    			
    			log.debug('columns',JSON.stringify(allCols));
    			
    			for (var b=0; b < bookrs.length; b+=1)
    			{
    				//Calc Field 1 logic
    				coachText = bookrs[b].getText(allCols[0]);
    				//topicText = bookrs[b].getText(allCols[1]);
    				
    				//Calc Field 2 logic
    				courseName = bookrs[b].getValue(allCols[1]);
    				itemText = bookrs[b].getText(allCols[2]);
    				
    				//Calc Field 3 logic
    				//editionBigNum = bookrs[b].getValue(allCols[3]);
    				
    				//Calc Field 4 logic
    				fullEditionNum = bookrs[b].getValue(allCols[3]);
    				
    				bookingList = (bookrs[b].getValue(allCols[5])?bookrs[b].getValue(allCols[5]).split(','):[]);
    				
    				//log.debug('coach/topic/booking', coachText+' // '+topicText+' // '+bookingList);
    				//log.debug('coach/course/item/booking', coachText+' // '+courseName+' // '+itemText+' // '+bookingList);
    				//log.debug('coach/course/editionBigNum/booking', coachText+' // '+courseName+' // '+itemText+' // '+editionBigNum+' // '+bookingList);
    				log.debug('coach/course/editionFull/booking', coachText+' // '+courseName+' // '+itemText+' // '+fullEditionNum+' // '+bookingList);
    				
    				/****
    				 * 
    				 * 
    				 * MUST UPDATE Update FIELD !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    				 *  
    				 * LINE 201
    				 * 
    				 * LINE 230
    				 * 
    				 */
    				
    				//---------------------- CORE -------------------------------
    				if (bookingList.length > 0)
    				{
    					var sequenceNumber = 1,
    						bookOrderRs = null,
    						bookOrderSearch = search.create({
	    	    				'type':search.Type.JOB,
	    	    				'filters':[
	    	    				           ['internalid','anyof',bookingList]
	    	    				          ],
	    	    				'columns':[
	    	    				           search.createColumn({
	    	    				        	   'name':'enddate',
	    	    				        	   'sort':search.Sort.ASC
	    	    					   	   }),
	    	    					   	   'internalid'
	    	    					   	  ]
	    	    			});
    	    		
    					bookOrderRs = bookOrderSearch.run().getRange({
    						'start':0,
    						'end':1000
    					});
    	    		
    					//Loop through and update each booking.
    					for (var bb=0; bookOrderRs && bb < bookOrderRs.length; bb+=1)
    					{
    						try
    						{
	    	    				bookIdUpd = bookOrderRs[bb].getValue('internalid');
	    	    			
	    	    				//log.debug('Booking / Sequence',bookIdUpd+' // '+sequenceNumber);
	    	    				
	    	    				record.submitFields({
	    	        				'type':record.Type.JOB,
	    	        				'id':bookOrderRs[bb].getValue('internalid'),
	    	        				'values':{
	    	        					//Field 1: custentity_sctbookfield1
	    	        					//Field 2: custentity_sctbookfield2
	    	        					//Field 3: custentity_sctbookfield3
	    	        					//Field 4: custentity_sctbookfield4
	    	        					'custentity_sctbookfield4':sequenceNumber
	    	        				},
	    	        				'options':{
	    	        					'enablesourcing':false,
	    	            				'ignoreMandatoryFields':true
	    	        				}
	    	        				
	    	        			});
	    	        			
	    	        			sequenceNumber += 1;
	    	        		}
	    	        		catch(upderr)
	    	        		{
	    	        			log.error(
	    	        				'Initial Save Attempt for '+bookOrderRs[bb].getValue('internalid')+' FAILED',
	    	        				custUtil.getErrDetail(upderr)
	    	        			);
	    	        			//Try saving again by loading the record and saving
	    	        			try
	    	        			{
	    	        				log.audit('Retry Saving', 'Retry Saving Booking ID '+bookOrderRs[bb].getValue('internalid'));
	    	        				
	    	        				record.submitFields({
	    	            				'type':record.Type.JOB,
	    	            				'id':bookOrderRs[bb].getValue('internalid'),
	    	            				'values':{
	    	            					//Field 1: custentity_sctbookfield1
		    	        					//Field 2: custentity_sctbookfield2
		    	        					//Field 3: custentity_sctbookfield3
	    	            					//Field 4: custentity_sctbookfield4
		    	        					'custentity_sctbookfield4':sequenceNumber
	    	            				},
	    	            				'options':{
	    	            					'enablesourcing':false,
	    	                				'ignoreMandatoryFields':true
	    	            				}
	    	            				
	    	            			});
	    	        				
	    	        				sequenceNumber += 1;
	    	        				
	    	        			}
	    	        			catch (retryerr)
	    	        			{
	    	        				//Stop processing if the update fails on specific segment
	    	            			log.error(
	    	            				'Retry Update Booking Error',
	    	            				'Booking ID: '+bookOrderRs[bb].getValue('internalid')+
	    	            					'Out of '+bookingList+' group '+		 
	    	            					' // Error: '+custUtil.getErrDetail(retryerr)
	    	            			);
	    	            			
	    	            			throw error.create({
	    	            				'name':'UPDATE_SEQUENCE_FAILED',
	    	            				'message':'Failed to Update '+bookOrderRs[bb].getValue('internalid')+
	    	            						  'Out of '+bookingList+' group // '+
	    	            						  custUtil.getErrDetail(retryerr),
	    	            				'notifyOff':false
	    	            			});
	    	            			
	    	        			}
	    	        			
	    	        		}
	    	        		
    					}
    					
    	        		log.debug('Reduce Usage',runtime.getCurrentScript().getRemainingUsage());
    				}
    				//-----------------------------------------------------------
    				
    				//Need to update the progress % value here
	        		var pctCompleted = Math.round(((b+1) / bookrs.length) * 100);
	        		curScript.percentComplete = pctCompleted;
	        		
	        		//TESTING
	        		//return;
    			}
    			
    			//Reschedule for next run
    			//	- Increment next iteration to next 20
    			rangeStart = parseInt(rangeEnd) + 1;
    			rangeEnd = parseInt(rangeEnd) + 20;
    			
    			var schSctTask = task.create({
    				'taskType':task.TaskType.SCHEDULED_SCRIPT
    			});
    			
    			
    			schSctTask.scriptId = curScript.id;
    			schSctTask.deploymentId = curScript.deploymentId;
    			schSctTask.params = {
    				'custscript_522_start':rangeStart,
    				'custscript_522_end':rangeEnd
    			};
    			
    			schSctTask.submit();
    			
    			log.audit('Rescheduled Range', rangeStart+' - '+rangeEnd);
    			
    			isRescheduled = true;
    			
    			
    		}
    		
    	}
    	catch(err)
    	{
    		log.error(
    			'Error Processing '+execSearchId,
    			'Range Info: '+rangeStart+' - '+rangeEnd+' // '+
    			custUtil.getErrDetail(err)
    		);
    		
    		throw error.create({
    			'name':'DELIVERED_CALC_FIELD_ERR',
    			'message':'Error Processing '+execSearchId+' // '+
			    		 'Range Info: '+rangeStart+' - '+rangeEnd+' // '+
			    		 'Coach Text: '+coachText+' // '+
			    		 'Topic Text: '+topicText+' // '+
			    		 'Course Name: '+courseName+' // '+
			    		 'Item Text: '+itemText+' // '+
			    		 'Edition Big Number: '+editionBigNum+' // '+
			    		 'Full Edition Number: '+fullEditionNum+' // '+
			    		 'Failed Booking ID: '+bookIdUpd+' // '+
			    		 custUtil.getErrDetail(err)
    		});
    	}
    	
    }

    return {
        execute: execUpdate
    };
    
});
