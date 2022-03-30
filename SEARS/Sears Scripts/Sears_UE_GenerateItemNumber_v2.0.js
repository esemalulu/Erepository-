/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 */
/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       04 May 2016     bfeliciano	   initial
 * 1.10       18 May 2016     mjpascual        Suitescipt v.2
 * 1.20		  26 Jul 2016     cmargallo        Add after submit
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/runtime', 'N/search', './NSUtil', 'N/error'],
    function (record, runtime, search, NSUtil, error)
    {
		var TIMESTART = null;
	
	
        function beforeSubmit_generateItemNumber(context)
        {
        	TIMESTART = (new Date()).getTime();
        	var stLogTitle = ['beforeSubmit_generateItemNumber', TIMESTART].join('|');

        	try
    		{
    			log.debug(stLogTitle, '>> Entry Log <<');

    			var objScript = runtime.getCurrentScript();
    			var stParamSearchId = objScript.getParameter('custscript_search_last_itemno');
    			var stLastNumber = objScript.getParameter('custscript_last_itemno');
    			log.debug(stLogTitle, 'stParamSearchId = ' + stParamSearchId + ' | stLastNumber = ' + stLastNumber);

    			//Role checking
    			var stRestrictedRole = objScript.getParameter('custscript_sears_rl_integration_role_2');
    			var objUser = runtime.getCurrentUser();

    			log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);
    			if(objUser.role == stRestrictedRole)
    			{
    				log.debug(stLogTitle, 'exiting...');
    				return;
    			}

    			if (NSUtil.isEmpty(stParamSearchId))
    			{
    				throw 'Missing script parameter';
    			}
    			
    			
    			log.debug(stLogTitle, 'context.type = ' + context.type + ' | runtime.executionContext = ' + runtime.executionContext);
    			
    			if (!NSUtil.inArray(context.type, [context.UserEventType.CREATE, context.UserEventType.COPY]))
    			{
    				return true;
    			}

    			if (!NSUtil.inArray(runtime.executionContext, [runtime.ContextType.USER_INTERFACE, 
    			                                               runtime.ContextType.CSV_IMPORT, 
    			                                               runtime.ContextType.WEBSERVICES]))
    			{
    				return true;
    			}
    			
    			var rec = context.newRecord;
    			if (runtime.executionContext == runtime.ContextType.CSV_IMPORT)
				{
    				// check the itemid
    				//var stItemId = rec.getValue({fieldId:'itemid'});
    				//if (stItemId) return true;
    				
    				// else set a random item number
    				rec.setValue('itemid', 'CSVItem-'+(new Date()).getTime().toString());
				}
    			else
				{
    				rec.setValue('itemid', getNextItemNo(stParamSearchId, stLastNumber) );
				}
    			
    			return true;
    		}
    		catch (e)
    		{
    			if (e.message != undefined)
    			{
    				log.error('ERROR' , e.name + ' ' + e.message);
    				throw e.name + ' ' + e.message;
    			}
    			else
    			{
    				log.error('ERROR', 'Unexpected Error' , e.toString());
    				throw error.create({
    					name: '99999',
    					message: e.toString()
    				});
    			}
    		}
    		finally
    		{
    			log.debug(stLogTitle, '>> Exit Log <<');
    		}
        }
        
        
        function getNextItemNo(stParamSearchId, stLastNumber)
        {
        	var stLogTitle = ['getNextItemNo', TIMESTART].join('|');
        	log.debug(stLogTitle, '...search Last Item: ' +JSON.stringify([stParamSearchId, stLastNumber]) );
        	
			//Search
			var objSearch = search.load({id : stParamSearchId});
			var arrSearchResult = objSearch.run().getRange(0, 1);
			
			if (!NSUtil.isEmpty(arrSearchResult))
			{
				stLastNumber = arrSearchResult[0].getValue({
		            name: 'itemid',
		            summary: search.Summary.MAX
		        }) || stLastNumber;
				
				log.debug(stLogTitle, 'stLastNumber = ' + stLastNumber);
			}

			var intNextNumber = NSUtil.forceInt(stLastNumber) + 1;
			log.debug(stLogTitle, '...intNextNumber = ' + intNextNumber);
			
			return intNextNumber.toString();
        }

        /**
         *
         */
        function afterSubmit_generateItemNumber(context) {
        	TIMESTART = (new Date()).getTime();
        	var stLogTitle = ['afterSubmit_generateItemNumber', TIMESTART].join('|');
        	
			var recItem = context.newRecord;
        	
        	try
    		{
    			log.debug(stLogTitle, '>> Entry Log <<');
    			if (runtime.executionContext == runtime.ContextType.CSV_IMPORT)
				{
        			var objScript = runtime.getCurrentScript();
        			var stParamSearchId = objScript.getParameter('custscript_search_last_itemno');
        			var stLastNumber = objScript.getParameter('custscript_last_itemno');
        			log.debug(stLogTitle, 'stParamSearchId = ' + stParamSearchId + ' | stLastNumber = ' + stLastNumber);
        			
    				var nextItemNo = getNextItemNo(stParamSearchId, stLastNumber);
                    record.submitFields({
                        type : context.newRecord.type,
                        id : context.newRecord.id,
                        values : {'itemid' : nextItemNo}
                    });
                    log.debug(stLogTitle, '** Done updating the item: ' + ((new Date()).getTime() - TIMESTART) );
                    return true;
				}
    			
    			// Check if execution is UI
    			if (!NSUtil.inArray(runtime.executionContext, [ runtime.ContextType.USER_INTERFACE, runtime.ContextType.WEBSERVICES ]))
    			{
    				return true;
    			}


    			if ( context.type == context.UserEventType.DELETE )
    			{
    				return true;
    			}

    				// Hold the updated item id
    				var stUpdatedItem = null;
    				// Get the new record

    				var recordItem = record.load({type: context.newRecord.type, id: context.newRecord.id});

    				var externalId = recordItem.getValue({fieldId:'externalid'});
    				if ( externalId )
					{
    					log.debug(stLogTitle,'Externalid is already set.');
    					return true;
					}


    				// Get the item id
    				var stItemID = recItem.getValue('itemid');
    				// Get the item type
    				var stItemType =  recItem.type;
    				log.debug(stLogTitle, 'Item ID : ' + stItemID + ' | Item Type : ' + stItemType);
    				if (stItemType == record.Type.INVENTORY_ITEM) {
    					stUpdatedItem = record.submitFields({
	    					type: record.Type.INVENTORY_ITEM,
	    					id: recItem.id,
	    					values : {externalid : stItemID}
	    				});
    				} else {
    					if (stItemType == record.Type.KIT_ITEM) {
        					stUpdatedItem = record.submitFields({
    	    					type: record.Type.KIT_ITEM,
    	    					id: recItem.id,
    	    					values : {externalid : stItemID}
    	    				});
    					}
    				}
    				log.audit(stLogTitle, 'Updated Item ID : ' + stUpdatedItem);
//    			}
    		}
    		catch (e)
    		{
    			if (e.message != undefined)
    			{
    				log.error('ERROR' , e.name + ' ' + e.message);
    				throw e.name + ' ' + e.message;
    			}
    			else
    			{
    				log.error('ERROR', 'Unexpected Error' , e.toString());
    				throw error.create({
    					name: '99999',
    					message: e.toString()
    				});
    			}
    		}
    		finally
    		{
    			log.debug(stLogTitle, '>> Exit Log <<');
    		}
        }

	    return {
	        beforeSubmit: beforeSubmit_generateItemNumber,
	        afterSubmit: afterSubmit_generateItemNumber
	    };
});
