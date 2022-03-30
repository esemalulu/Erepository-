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
 */
		
/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/runtime', './NSUtil', 'N/http', 'N/error', './oauthv2', 'N/task','./LibJsonRequest'],
    function (record, runtime, NSUtil, http, error, nsauth, task, LibJsonRequest)
    {
		
		var INT_START_TIME = new Date().getTime();
		var INT_USAGE_LIMIT_THRESHOLD = 100;
		var HAS_ITEMS_REMAINING= false;
		
		var ARR_FLDMAP_COLUMNS =
		[
			'itemid', 'displayname', 'salesdescription', 'baseprice', 'type',
			'externalid','custitem_hazardous_material','custitem_marketingcopy'
		];

		/**
		 * Scheduled Script - Syncs the Inventory Items
		 * @param context
		 * @memberOf SyncItems
		 */
        function scheduled_SyncInventoryItems(context)
        {
        	
        	var stLogTitle = 'scheduled_SyncInventoryItems';
        	
        	try
    		{
    			log.debug(stLogTitle, '>> Entry Log <<');

    			//Get Script parameters
    			var objScript = runtime.getCurrentScript();
    			var stParamSearchItemSync = objScript.getParameter('custscript_sears_sync_items');
    			var intMaxNoOfRecToProcess = NSUtil.forceInt(objScript.getParameter('custscript_max_no_toprocess'));
    			
    			log.debug(stLogTitle, 'stParamSearchItemSync = '+stParamSearchItemSync + ' | intMaxNoOfRecToProcess = '+intMaxNoOfRecToProcess);

    			if (NSUtil.isEmpty(stParamSearchItemSync) )
    			{
    				log.error('Missing script parameter');
    				throw error.create({
    					 name: '99999',
    					 message: 'Missing script parameter',
    					 notifyOff: false
    				});
    			}
    			
  
    			//Initialize
    			var objItem = {};
    			var arrItemList = [];
    			var arrItemIds = [];

    			var objRequestItem = {};
    			objRequestItem.items = arrItemList;
    			
    			//Search Items
    			log.debug(stLogTitle, 'Search Items');
    			var arrResult = NSUtil.searchList(stParamSearchItemSync, null, null, ARR_FLDMAP_COLUMNS);
				
				//Validate result
				if(NSUtil.isEmpty(arrResult))
				{
					log.debug(stLogTitle, 'No data to process');
					return;
				}
				
				
				//Loop each result
				var arrIds = [];
    			for(var intResCtr = 0; intResCtr < arrResult.length; intResCtr++)
				{
    			    
    			    if (objScript.getRemainingUsage() <= INT_USAGE_LIMIT_THRESHOLD) 
			        {
    			        HAS_ITEMS_REMAINING = true;
    			        break;
			        }

    			    
    				if(intMaxNoOfRecToProcess != 0 && intResCtr > intMaxNoOfRecToProcess)
    				{
    				    HAS_ITEMS_REMAINING = true;
    					break;
    				}
    				
					var stType = '';
					var objDataItem = {};
					var objResult = arrResult[intResCtr];
					
					objDataItem.internalid = objResult.id;
					
					arrIds.push(objResult.id);
					
					ARR_FLDMAP_COLUMNS.forEach(function(stFld, intIdx){
						var stItemValue = objResult.getValue({
		                    name: stFld
		                });
						objDataItem[stFld] = stItemValue || '';
						if(stFld == 'type')
						{
							stType = stItemValue;
						}
					});
    				
    				log.debug(stLogTitle, 'objResult.id =' + objResult.id);
    				log.debug(stLogTitle, 'objDataItem = '+ JSON.stringify(objDataItem));
    				
    				arrItemList.push(objDataItem);
    				arrItemIds.push(objResult.id);
    				
    				if(NSUtil.isEmpty(objItem[objResult.id]))
    				{
    					objItem[objResult.id] = {};
    					objItem[objResult.id].stType = stType;
    				}
    				
                    INT_USAGE_LIMIT_THRESHOLD = INT_USAGE_LIMIT_THRESHOLD +10;
	            }

				var stRequest = JSON.stringify(objRequestItem);
				
				if ( sendObjToURL(stRequest) )
			    {
	                //Update item record based on response
	                updateItemRecord(arrIds, objItem);
			    }
				
				if (HAS_ITEMS_REMAINING)
			    {
				    reschedule();
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
        
        function reschedule()
        {
            var logTitle = 'reschedule';
            var returnValue = false;
            try 
            {
                var currentScript = runtime.getCurrentScript();
                
                var schedScriptObj = task.create({taskType : task.TaskType.SCHEDULED_SCRIPT});
                schedScriptObj.scriptId = currentScript.id;
                schedScriptObj.params = {};
                schedScriptObj.deploymentId = currentScript.deploymentId;
                
                log.debug(logTitle, '.. schedScriptObj: ' + JSON.stringify(schedScriptObj));
                
                // submit the task
                var schedScriptId = schedScriptObj.submit();
                var taskStatus = task.checkStatus({taskId:schedScriptId});

                log.debug(logTitle, '** QUEUE STATUS : ' + JSON.stringify([schedScriptId, taskStatus, task.TaskStatus.FAILED]));
                if (taskStatus != task.TaskStatus.FAILED)
                {
                    returnValue = true;
                }
            }
            catch (err)
            {
                log.debug('**ERROR**', err.toString());
            }
            
            return returnValue;
        }
        
        
        /**
         * Post the data
         * @param stRequest
         * @returns arrIds
         * @memberOf SyncItems
         */
        function sendObjToURL(stRequest)
        {
            var stLogTitle = 'scheduled_SyncInventoryItems.sendObjToURL';
            log.debug(stLogTitle, '##  sending the request:' + stRequest);
            
            log.audit('sendObjToURL', '### Ready for sending the request...');
            
            //var stTokenAuthSettings = runtime.getCurrentScript().getParameter({name:'custscript_ss2_param_token_settings'});
            var stSyncItemURL  = runtime.getCurrentScript().getParameter('custscript_sears_itemsync_url');
            log.debug('sendObjToURL', '### Token settings...' + JSON.stringify(stTokenAuthSettings) );
            log.debug('sendObjToURL', '### stSyncItemURL...' + stSyncItemURL);
            
			/*
            stTokenAuthSettings = stTokenAuthSettings.replace(/\"\"/g, '"');
            stTokenAuthSettings = stTokenAuthSettings.replace(/\"\{/g, '{');
            stTokenAuthSettings = stTokenAuthSettings.replace(/\}\"/g, '}');
            var arrTokenAuth = JSON.parse(stTokenAuthSettings);
			*/
			//regina - 11/15 - use customrecord for credentials
			var arrTokenAuth = LibJsonRequest.getCredentialConfig('sendToWMS');
			
            if (!arrTokenAuth)
            {
                log.error('sendObjToURL', 'Invalid Token Settings!' + JSON.stringify([stTokenAuthSettings,arrTokenAuth]));
                
                throw 'Invalid Token Settings!';
            }
    
            //user objToken
            var objToken = {
                public: arrTokenAuth.TOKEN_KEY, 
                secret: arrTokenAuth.TOKEN_SECRET
            };
    
            //app credentials
            var objOauth = nsauth.authenticate({
                consumer :
                {
                    public : arrTokenAuth.CONSUMER_KEY, 
                    secret : arrTokenAuth.CONSUMER_SECRET
                },
                signature_method : 'HMAC-SHA1'
            });
    
            var objRequestData = {
                url: stSyncItemURL,
                method: "POST",
                data: {}
            };
    
            var objOauth_data = {
                objOauth_consumer_key: objOauth.consumer.public,
                objOauth_nonce: objOauth.getNonce(),
                objOauth_signature_method: objOauth.signature_method,
                objOauth_timestamp: objOauth.getTimeStamp(),
                objOauth_version: '1.0',
                objOauth_token: objToken.public
            };
    
            var objHeaderWithRealm = objOauth.toHeader(objOauth.authorize(objRequestData, objToken));
            objHeaderWithRealm.Authorization += ',realm= " " ';
    
            //HTTP headers
            var objHeaders = new Array();
            objHeaders['Content-Type'] = 'application/json';
            objHeaders['Authorization'] = objHeaderWithRealm.Authorization;
            
            log.debug('sendObjToURL', '### Sending the request..'  +stSyncItemURL);
            //post data
            var objResponse = http.request({
                method: http.Method.POST,
                url: stSyncItemURL,
                body: stRequest,
                headers: objHeaders
            });
    
            log.debug(stLogTitle, '##  response:' + JSON.stringify(objResponse));
            var objParseRes = null;
            if (objResponse.code == '200')
            {
                return true;
            } 
            else 
            {
                return false;
                log.error('Error requesting data: ' + objResponse.code);
                throw error.create({
                     name: '99999',
                     message: 'Error requesting data: ' + objResponse.code,
                     notifyOff: false
                });
            }
            
            return false;
        }

        /**
         * Update Item Record
         * @param arrIds
         * @param objItem
         * @memberOf SyncItems
         */
        function updateItemRecord(arrIds, objItem)
        {
            
            var stLogTitle = 'scheduled_SyncInventoryItems.updateItemRecord';
            log.debug(stLogTitle, 'Entering updateItemRecord');
            log.debug(stLogTitle, '##  arrIds:' + arrIds);
            log.debug(stLogTitle, '##  objItem:' + JSON.stringify(objItem));
            
            var objScript = runtime.getCurrentScript();
            
            for (var intCtr = 0; intCtr<arrIds.length; intCtr++)
            {
                
                if(objScript.getRemainingUsage() < INT_USAGE_LIMIT_THRESHOLD)
                {
                    break;
                }
                
                var stItemId = arrIds[intCtr];
                log.debug(stLogTitle, '##  stItemId:' + stItemId);
                
                if(NSUtil.isEmpty(objItem[stItemId]))
                {
                    log.error(stLogTitle, 'Record type not found.');
                    continue;
                }
                
                var stType = objItem[stItemId].stType;
                var stItemType = NSUtil.toItemInternalId(stType);
                
            
                var id = record.submitFields({
                    type: stItemType,
                    id: stItemId,
                    values: {
                        custitem_synced: true
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields : true
                    }
                });
                
                log.audit(stLogTitle,'## Updated item data.. ' + JSON.stringify([stItemType, stItemId]));
            }
        }        
       
	    return {
	        execute: scheduled_SyncInventoryItems
	    };
});