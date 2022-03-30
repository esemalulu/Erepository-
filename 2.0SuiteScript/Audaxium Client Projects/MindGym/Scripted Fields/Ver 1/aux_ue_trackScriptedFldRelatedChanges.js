/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/*
 * User Event script specific to tracking Scripted Field related changes
 * 	and trigger re-sequencing task
 */

define(['N/record', 
        'N/format',
        'N/runtime',
        '/SuiteScripts/Audaxium Customization/SuiteScript 2.0/UTILITY_LIB'],
function(record, format, runtime, custUtil) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(context) 
    {
    	//Monitor Field Changes on Booking
    	//	Coach Group Name, Topic, Course Display Name, Course, Course Edition, Date, Is Cancelled, Booking Item, Booking Item Duration
    	var trackFldIds = ['custentity_bo_coachdisplayname','custentity_bo_topic',
    	                   //add in fields as each scripted fields come live
    	                   'custentity_ref_coursedisplayname', 'custentity_bo_item',
    	                   'custentity_ref_courseedition','custentity_bo_course',
    	                   'enddate','custentity_bo_iscancelled'
    	                  ],
    	    sctFldIds = ['custentity_sctbookfield1',
    	                 'custentity_sctbookfield2',
    	                 'custentity_sctbookfield3',
    	                 'custentity_sctbookfield4',
    	                 'custentity_sctbookfield5',
    	                 //Sept 10 2016
    	                 'custentity_sctbookfield6' //6 will include update of 7
    	                 ],
     		oldRec = context.oldRecord,
     		newRec = context.newRecord,
     		bookingId = '';
    	
    	//Set booking ID. Logic to handle booking ID for DELETE vs CREATE
    	if (!newRec)
    	{
    		bookingId = oldRec.id;
    	}
    	else
    	{
    		bookingId = newRec.id;
    	}
     	
    	log.debug('START','--------------------Start Check for '+bookingId+'----------------------------');
     	//Check to see if we have inline edit 
		if (context.type == context.UserEventType.XEDIT)
		{
			//Load the new record for comparison
			newRec = record.load({
				'type':newRec.type,
				'id':newRec.id,
				'isDynamic':false
			});
		}
     	
    	//NO need to Execute Situations:
    	//	- Create and New Coach value is null
    	if (context.type == context.UserEventType.CREATE && 
    		!newRec.getValue({'fieldId':'custentity_bo_coach'}))
    	{
    		log.debug('Create with no Coach','No Need to Re-Sequence');
    		return;
    	}
    	
    	//- Delete and Old Coach value was null
    	if (context.type == context.UserEventType.DELETE && 
    		!oldRec.getValue({'fieldId':'custentity_bo_coach'}))
    	{
    		log.debug('Delete with no Coach','No Need to Re-Sequence');
    		return;
    	}
    	
    	//- Edit/Xedit Old/New Coach value was/is null
    	if ( (context.type == context.UserEventType.EDIT ||
    		  context.type == context.UserEventType.XEDIT) && 
    		 !oldRec.getValue({'fieldId':'custentity_bo_coach'}) && 
    		 !newRec.getValue({'fieldId':'custentity_bo_coach'}) )
    	{
    		log.debug('Edit/Xedit with no Coach','No Need to Re-Sequence');
    		return;
    	}
    	
    	//--- Loop through each Tracked Fields and see if we need to queue it up
    	var changeLog = {
        	'reseq':false,
    		'fields':[],
        	'bookingid':newRec.id,
        	'changed':{}
        };
     	
    	for (var t=0; t < trackFldIds.length; t+=1)
		{
    		var oldValue = (oldRec)?oldRec.getValue({'fieldId':trackFldIds[t]}):'',
    			newValue = newRec.getValue({'fieldId':trackFldIds[t]});
    		
    		//NS will returrn two Date Objects and comparing two Objects will differ in value
    		//	Due to this reason, we must convert it to String Date value for comparison
    		if (oldValue && util.isDate(oldValue))
    		{
    			oldValue = format.format({
    				'value':oldValue,
    				'type':format.Type.DATE
    			});
    		}
    		
    		if (newValue && util.isDate(newValue))
    		{
    			newValue = format.format({
    				'value':newValue,
    				'type':format.Type.DATE
    			});
    		}
    		
			log.debug(
				'field // values',
				trackFldIds[t]+' // '+
				'Old: '+oldValue+' // '+
				'New: '+newValue
			);
			
			//Set the flag to resequence and
			//ONLY push in changed fields as an array
			if (oldValue != newValue)
			{
				changeLog.reseq = true;
				changeLog.fields.push(trackFldIds[t]);
			}
			
			//Add in old/new value sof all Fields regardless 
			changeLog.changed[trackFldIds[t]] = {
				'old':oldValue,
				'new':newValue
			};
		}
    	
    	//If we need to queue it up. DO SO here
    	if (changeLog.reseq)
    	{
    		
    		var itemDuration = 0;
    		if (newRec && 
    			newRec.getValue({'fieldId':'custentity_ref_bookitemduration'}) &&
    			!isNaN(newRec.getValue({'fieldId':'custentity_ref_bookitemduration'})))
    		{
    			itemDuration = parseInt(newRec.getValue({'fieldId':'custentity_ref_bookitemduration'}));
    		}
    		//If we NEED to proceed, Check to see if we need to Null out Fields for Cancellation or Item Duration < 60
    		//	OR new coach value got set to NULL
    		if (newRec && 
    			(newRec.getValue({'fieldId':'custentity_bo_iscancelled'}) ||
    			 itemDuration < 60 ||
    			 newRec.getValue({'fieldId':'custentity_bo_coach'})) 
    		   )
    		{
    			try
    			{
    				var updVals = {};
    				for (var sf=0; sf < sctFldIds.length; sf+=1)
    				{
    					updVals[sctFldIds[sf]] = '';
    				}
    				
    				record.submitFields({
    					'type':newRec.type,
    					'id':newRec.id,
    					'values':updVals,
    					'options':{
    						'enableSourcing':true,
    						'ignoreMandatoryFields':true
    					}
    				});
    				
    			}
    			catch(cancelnullerr)
    			{
    				log.error(
    					'Unable to Null out Scripted Fields for Booking ID '+newRec.id,
    					custUtil.getErrDetail(cancelnullerr)
    				);
    			}
    			
    		}
    		
    		//Add Task to Scripted Fields Resequence Tasks (customrecord_ax_sctfldsreseqtasks)
    		//	custom record
    		var reSeqTaskRec = record.create({
    			'type':'customrecord_ax_sctfldsreseqtasks',
    			'isDynamic':true
    		});
    		reSeqTaskRec.setValue({
    			'fieldId':'custrecord_sfrst_taskstatus',
    			'value':'Pending',
    			'ignoreFieldChange':true
    		});
    		
    		reSeqTaskRec.setValue({
    			'fieldId':'custrecord_sfrst_jsonstring',
    			'value':JSON.stringify(changeLog),
    			'ignoreFieldChange':true
    		});
    		
    		reSeqTaskRec.setValue({
    			'fieldId':'custrecord_sfrst_triggeredby',
    			'value':runtime.getCurrentUser().name,
    			'ignoreFieldChange':true
    		});
    		
    		var reSeqId = reSeqTaskRec.save({
    			'enableSourcing':true,
    			'ignoreMandatoryFields':true
    		});
    		
    		log.debug('Resequence Task Created', reSeqId);
    	}
    	
    	
    	log.debug('END','--------------------End Check for '+bookingId+'----------------------------');
    	
    }

    return {
        //beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
