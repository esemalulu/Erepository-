/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define([
        'N/email', 
        'N/error', 
        'N/format', 
        'N/search',
        'N/runtime',
        'N/record',
        '/SuiteScripts/Audaxium Customization/SuiteScript 2.0/UTILITY_LIB'
       ],

function(email, error, format, search, runtime, record, custUtil) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() 
    {
    	//asdfasd
    	//log.debug('starting get input','Started');
    	
    	//Let's load the Saved Search 
    	//In Live Mode, This will be passed in via Script Parameter
    	var searchObj = search.load({
    		//'id':'customsearch_field1_delivered_count'
    		'id':'customsearch_field1_delivered_count_2'
    	});
    	
    	log.debug('loaded search','search object loaded');
    	
    	return searchObj;
    	
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) 
    {
    	//Need to parameterize key fields. Can be comma separated list of Field IDs
    	
    	try
    	{
    		log.debug('Map Stage',context.value);
        	
    		var searchResult = JSON.parse(context.value);

        	//log.debug('Map Stage','JSON is parsed');
        	
        	//log.debug('Map Key', searchResult.values['custentity_coach_groupingname.CUSTENTITY_BO_COACH'].text);
        	//log.debug('Map Value', searchResult.values.internalid.value);
        	
        	//TESTING. Once live, we need to grab this from parameter
        	var groupName = '',
        		topic = '',
        		key = '';
        	
        	groupName = searchResult.values['GROUP(custentity_coach_groupingname.CUSTENTITY_BO_COACH)'].text;
        	if (!groupName || groupName == 'undefined')
        	{
        		groupName = 'NA';
        	}
        	
        	//Remove Extra Quote for processing
        	//groupNameText = groupNameText.replace('\'','');
        	
        	
        	topic = searchResult.values['GROUP(custentity_bo_topic)'].text;
        	if (!topic || topic == 'undefined')
        	{
        		topic = 'NA';
        	}
        	
        	//Build the Unique Key
        	key = groupName+'-'+topic;
        	
        	
        	//This version of search returns list of ALL Unique Key 
        	//Value will contain comma separated list of Booking IDs
        	//MAX(formulatext)
        	var valueString = searchResult.values['MAX(formulatext)'];
        	
        	log.debug('Map Before Value String', valueString);
        	
        	//Based on NS Support, instead of passing JSON object of key/value pair,
        	//	Pass it as parameter
        	context.write(key, valueString);
    	}
    	catch (maperr)
    	{
    		log.error('Map Error',context.value+' // '+custUtil.getErrDetail(maperr));
    	}
    	
    	return;
    	
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) 
    {
    	log.debug('Reduce',context.values);
    	
 
    	/**
    	//context is JSON of mapped values
    	if (context.isRestarted)
    	{
    		log.debug('Reduce Stage Key '+context.key,'Restarted');
    	}
    	else
    	{
    		log.debu('Reduce Stage Key '+context.key,'NOT Restarted');
    	}
    	*/
    	
    	//Loop through Each Booking IDs in array and set the value
    	for (var b=0; b < context.values.length; b+=1)
    	{
    		var strValue = context.values[b];
    		
    		log.debug('strValue', strValue);
    		
    		var bookingIds = strValue.split(',');
    		
    		log.debug('Reduce bookingIds for Key '+context.key, bookingIds.length+' // '+bookingIds);
    		
    		//June 6 2016
    		//	The requirement is to add in sequential numbering to each of delivered booking records.
    		//	The sequence is determined by the booking date sorted in ASC order.
    		//	The search assumes there are less than 1000 results.
    		var sequenceNumber = 1,
    			bookOrderRs = null,
    			bookOrderSearch = search.create({
    			'type':search.Type.JOB,
    			'filters':[
    			           	['internalid','anyof',bookingIds]
    			          ],
    			'columns':[search.createColumn({
    							'name':'enddate',
    							'sort':search.Sort.ASC
    					   }),
    					   'internalid']
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
        			record.submitFields({
        				'type':record.Type.JOB,
        				'id':bookOrderRs[bb].getValue('internalid'),
        				'values':{
        					'custentity_bookfield1_delivered':sequenceNumber
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
        				log.debug('Retry Saving', 'Retry Saving Booking ID '+bookOrderRs[bb].getValue('internalid'));
        				
        				/**
        				var bookRec = record.load({
        					'type':record.Type.JOB,
        					'id':bookOrderRs[bb].getValue('internalid'),
        					'isDynamic':false
        				});
        				
        				bookRec.setValue({
        					'custentity_bookfield1_delivered':sequenceNumber
        				});
        				
        				bookRec.save({
        					'enableSourcing':true,
        					'ignoreMandatoryFields':true
        				});
        				*/
        				
        				record.submitFields({
            				'type':record.Type.JOB,
            				'id':bookOrderRs[bb].getValue('internalid'),
            				'values':{
            					'custentity_bookfield1_delivered':sequenceNumber
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
            					'Out of '+bookingIds+' group '+		 
            					' // Error: '+custUtil.getErrDetail(retryerr)
            			);
            			
            			/**
        				throw error.create({
            				'name':'UPDATE_SEQUENCE_FAILED',
            				'message':'Failed to Update '+bookingIds[bb].getValue('internalid')+
            						  'Out of '+bookingIds+' group // '+
            						  custUtil.getErrDetail(retryerr),
            				'notifyOff':false
            			});
            			*/
        			}
        			
        		}
        		
        		//log.debug('Reduce Usage',runtime.getCurrentScript().getRemainingUsage());
    		}
    		
    		
    	}
    	return;
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) 
    {
    	log.debug('Usage', summary.usage);
    	log.debug('Queues', summary.concurrency);
    	log.debug('Yields', summary.yields);
    	log.debug('Total Seconds', summary.seconds);
    	
    	//Any Error per each stage
    	log.error('Input Stage Error', summary.inputSummary.error);
    	
    	//Map Errors
    	summary.mapSummary.errors.iterator().each(function(key, error)
    	{
    		log.error('Map Error for Key '+key, error);
    	});
    	
    	//Reduce Errors
    	summary.reduceSummary.errors.iterator().each(function(key, error)
    	{
    		log.error('Reduce Error for Key '+key, error);
    	});
    	
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
