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
 *
 * Module Description: Create BOH that were not created by integration.
 *
 */
 
/**
 * Module Description
 *
 * Version    Date            Author        Remarks
 * 1.00       10 June2016     mjpascual	   	initial
 */

/**
 *
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(['./NSUtil', 'N/error', 'N/record','N/search', 'N/runtime', 'N/email', 'N/format'],
	/**
	 * @param {Object} NSUtil
	 * @param {error} error
	 * @param {record} record
	 * @param {search} search
	 * @param {runtime} runtime
	 */
	function(NSUtil, error, record, search, runtime, email, format)
	{
		var OBJ_ENDPOINT = {};
		var ST_LOG = 'mapreduce_createInvBigItems';

		function handleErrorAndSendNotification(e, stage)
		{
			var stLogTitle = ST_LOG + 'handleErrorAndSendNotification';
			
			var arrMessage = JSON.parse(e.message);
			var stErrMessage = arrMessage[arrMessage.length-1];
			
			var stSubject = '[Sears] - Auto-creation of Invoice / Cash Sale for Big Items Notification';
		    var stBody = 'Stage: ' + stage + ' Failed: ' + stErrMessage;

			 // Send Email
			var stUserList = runtime.getCurrentScript().getParameter('custscript_email_user_ids');
			
			if(!NSUtil.isEmpty(stUserList))
			{
			    var arrRecepients = stUserList.split(',');
				log.debug(stLogTitle, 'arrRecepients = '+ arrRecepients);
				
			    email.send({
			    	author: arrRecepients[0],
			    	recipients: arrRecepients,
			    	subject: stSubject,
			    	body: stBody
			    });
	
			}
			
		    log.debug(stLogTitle, 'stBody =' + stBody);
			
		}

		function handleErrorIfAny(summary)
		{
			var inputSummary = summary.inputSummary;
			var mapSummary = summary.mapSummary;
			var reduceSummary = summary.reduceSummary;

			if (inputSummary.error)
			{
				var e = error.create({
					name: 'INPUT_STAGE_FAILED',
					message: inputSummary.error
				});
				handleErrorAndSendNotification(e, 'getInputData');
			}

			handleErrorInStage('map', mapSummary);
			handleErrorInStage('reduce', reduceSummary);
		}

		function handleErrorInStage(stage, summary)
		{
			var stLogTitle = ST_LOG + 'handleErrorInStage';
			log.debug('summary', 'summary = '+ JSON.stringify(summary));
		
			var dToday = new Date();
			var stToday =  format.format({
				value: dToday, 
				type: format.Type.DATETIME
			});
			
			var msg = 	'Date: ' + stToday;
			var errorMsg = [];
			
			summary.errors.iterator().each(function(key, value){
				
				//Store Error on custom record
				var recError = record.create({
					type: 'customrecord_big_item_proc_error'
				});
				
				recError.setValue({
					fieldId: 'custrecord_sales_order_id',
					value: key
				});
				
				recError.setValue({
					fieldId: 'custrecord_processed_date',
					value: stToday
				});
				
				recError.setValue({
					fieldId: 'custrecord_error_message',
					value: JSON.parse(value).message
				});
				
				var stErrorId = recError.save();
				log.debug(stLogTitle, 'stErrorId =' + stErrorId);
				
				//PUSH
				msg += ' --->  Error Id #' +stErrorId+ ' | Sales Order # '+key+' | Error was: ' + JSON.parse(value).message + '\n';
				errorMsg.push(msg);
				return true;
			});
			
			if (errorMsg.length > 0)
			{
				var e = error.create({
					name: 'ERROR_IN_STAGE',
					message: JSON.stringify(errorMsg)
				});
				handleErrorAndSendNotification(e, stage);
			}
		}
		
		/**
		 * Get Input Data
		 *
		 * @returns {Object}
		 * @memberOf OBJ_ENDPOINT
		 */
		OBJ_ENDPOINT.getInputData = function ()
		{
			var stLogTitle = ST_LOG + '::getInputData::';
			log.debug(stLogTitle, 'Start -->');

			var stSearchId = runtime.getCurrentScript().getParameter('custscript_search_so_bigitems');
			
			if(NSUtil.isEmpty(stSearchId))
			{
				throw error.create({
					name : 'MISSING_PARAMETER',
					message : 'Missing Saved Search'
				});
			}
	
			return search.load({id : stSearchId});
		};
		
		OBJ_ENDPOINT.map = function (context)
		{
			var stLogTitle = ST_LOG + '::map::';
			
			log.debug(stLogTitle, '>> value:: ' + JSON.stringify(context.value));
			log.debug(stLogTitle, '>> key:: ' + JSON.stringify(context.key));

			var searchResult = JSON.parse( context.value );

			var stKey = searchResult.values['GROUP(internalid)'].value;

			context.write(stKey, context.value);
		};


		OBJ_ENDPOINT.reduce = function (context)
		{
			var stLogTitle = ST_LOG + '::reduce::';
			
			log.debug(stLogTitle, '>> values:: ' + JSON.stringify(context.values));

			if(NSUtil.isEmpty(context.values))
			{
				log.debug(stLogTitle, 'Continue..');
				return;
			}
			
			log.debug(stLogTitle, '>> key:: ' + JSON.stringify(context.key));

			context.values.forEach(function(value)
			{
				var objItem = JSON.parse(value);
				
				log.debug(stLogTitle, '>> arrItem:: ' + JSON.stringify(objItem));
				
				var stRecId = objItem.values['GROUP(internalid)'].value;
			
				//Load Record

				var objTransformOption = {};
	            objTransformOption.fromType = record.Type.SALES_ORDER;
	            objTransformOption.fromId = stRecId;
	            objTransformOption.isDynamic = true;
	            
	            var recTransformed = null;
	            try 
	            {
	            	 objTransformOption.toType = record.Type.INVOICE;
	            	 recTransformed = record.transform(objTransformOption);
	            } 
	            catch(err)
	            {
	            	 objTransformOption.toType = record.Type.CASH_SALE;
	            	 recTransformed = record.transform(objTransformOption);
	            }
	            
			    log.debug(stLogTitle, '>> Creating -> ' + objTransformOption.toType);
	            
//				//Get Line items
//				var intLineCount = recTransformed.getLineCount('item');
//				
//				log.debug(stLogTitle, 'intLineCount = '+intLineCount);
//				
//				for (var intCtr = 0; intCtr < intLineCount; intCtr++)
//				{
//					var bBigTicket = recTransformed.getSublistValue({
//						sublistId: 'item',
//						fieldId: 'custcol_bigticket',
//						line: intCtr
//					});
//					
//					log.debug(stLogTitle, 'bBigTicket = '+bBigTicket);
//					
//					if(!bBigTicket)
//					{
//						recTransformed.selectLine({
//	                            sublistId : 'item',
//	                            line : intCtr
//	                    });
//	                   
//						recTransformed.setCurrentSublistValue({
//	                            sublistId : 'item',
//	                            fieldId : 'quantity',
//	                            value : 0
//	                    });
//						
//						recTransformed.commitLine({
//                            sublistId : 'item'
//                        });
//					}
//				}	
				
				 var stId = recTransformed.save();
				 
		         log.debug(stLogTitle, '## .. saving the invoice/cashsale: ' + stId);
			});
			
		};

		/**
		 * @memberOf OBJ_ENDPOINT
		 */
		OBJ_ENDPOINT.summarize = function (summary)
		{
			var stLogTitle = ST_LOG + '::summarize::';
			log.audit(stLogTitle, 'summary = ' + JSON.stringify(summary));
			
			//ERROR HANDLING
			handleErrorIfAny(summary);
			
			log.debug(stLogTitle, '<== End');
			
		};

		return OBJ_ENDPOINT;
	}
);