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
 * 1.00       08 June2016     mjpascual	   	initial
 */

/**
 *
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(['./NSUtil', 'N/format','N/error', 'N/record','N/search', 'N/file', 'N/runtime'],
	/**
	 * @param {Object} NSUtil
	 * @param {format} format
	 * @param {error} error
	 * @param {record} record
	 * @param {search} search
	 * @param {file} file
	 * @param {runtime} runtime
	 */
	function(NSUtil, format, error, record, search, file, runtime)
	{
		var OBJ_ENDPOINT = {};
		var ST_LOG = 'mapreduce_balanceOnHand';

		function handleErrorAndSendNotification(e, stage)
		{
			log.error('Stage: ' + stage + ' failed', e);
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
			var errorMsg = [];
			summary.errors.iterator().each(function(key, value){
				var msg = 'Error was: ' + JSON.parse(value).message + '\n';
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
			
			// get the parameters
			var currentScript = runtime.getCurrentScript();
			var stItemIds = currentScript.getParameter({name:'custscript_sears_item_ids'});
			
			var arrItems = [];
			if(!NSUtil.isEmpty(stItemIds))
			{
				arrItems = stItemIds.split(',');
			}
			
			log.debug(stLogTitle, 'arrItems ='+arrItems );
			
			var arrColumns = 
			[
				'internalid', 'inventorylocation', 'locationquantityonhand'
			];
			
			var arrFilters = [];
			
			if(!NSUtil.isEmpty(arrItems))
			{
				arrFilters = 
				[
					['internalid','anyof', arrItems], 'AND',
					['isinactive', 'is', 'F'], 'AND',
					['type', 'anyof', 'InvtPart']
				];
			} 
			else 
			{
				arrFilters = 
				[
					['isinactive', 'is', 'F'], 'AND',
					['type', 'anyof', 'InvtPart']
				];
			}

			return search.create({
				type :  'inventoryitem',
				columns : arrColumns,
				filters : arrFilters
			});
		};


		OBJ_ENDPOINT.map = function (context)
		{
			var stLogTitle = ST_LOG + '::map::';
			
			log.debug(stLogTitle, '>> value:: ' + JSON.stringify(context.value));
			log.debug(stLogTitle, '>> key:: ' + JSON.stringify(context.key));
			
			if(NSUtil.isEmpty(context.value))
			{
				log.debug(stLogTitle, 'No item found...');
				return;
			}

			// get the parameters
			var currentScript = runtime.getCurrentScript();
			var stToday = currentScript.getParameter({name:'custscript_ss_boh_date_proc'});
			
			if (NSUtil.isEmpty(stToday))
			{
				dToday = (new Date());
				stToday = format.format({
					value: dToday,
					type: format.Type.DATE
				});
			} 
			
			log.debug(stLogTitle, 'stToday = ' + stToday);
			
			var searchResult = JSON.parse( context.value );
			
			var objItem = {};
			objItem.stItem = searchResult.values.internalid;
			objItem.stNSLoc = searchResult.values.inventorylocation;
			objItem.stNSQty = searchResult.values.locationquantityonhand;

			log.debug(stLogTitle, 'objItem = ' + JSON.stringify(objItem));
			
			var arrSearchColumns = ['internalid'];
			var arrSearchFilters  =
			[
				['created','on', stToday], 'AND',
				['custrecord_sears_item','anyof', objItem.stItem.value], 'AND',
				[
					['custrecord_sears_wms_location','anyof', objItem.stNSLoc.value], 
					'OR',
					['custrecord_sears_ns_location','anyof', objItem.stNSLoc.value]
				]
			];
			
			var arrBOH = NSUtil.searchList(null, 'customrecord_sears_boh', arrSearchFilters, arrSearchColumns)
			
			log.debug(stLogTitle, 'arrBOH = ' + JSON.stringify(arrBOH));
			log.debug(stLogTitle, 'arrBOH.length = ' + arrBOH.length);
			
			if(NSUtil.isEmpty(arrBOH))
			{
				//If no result is found, create a new object
				context.write(objItem.stItem, JSON.stringify(objItem));
			} 
			else 
			{
				log.debug(stLogTitle, 'Item already existing...');
			}
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

				
				//Create a transfer order
				var recBOH = record.create({
					type: 'customrecord_sears_boh',
					isDynamic: true
				});

				recBOH.setValue({
					fieldId:'custrecord_sears_item',
					value: objItem.stItem.value
				});

				recBOH.setValue({
					fieldId:'custrecord_sears_ns_location',
					value:objItem.stNSLoc.value
				});
				
				recBOH.setValue({
					fieldId:'custrecord_sears_ns_qty',
					value : NSUtil.forceFloat(objItem.stNSQty)
				});
				
				recBOH.setValue({
					fieldId:'custrecord_sears_qty_diff',
					value : NSUtil.forceFloat(objItem.stNSQty)
				});
				
				recBOH.setValue({
					fieldId:'custrecord_sears_error_msg',
					value : 'Item-Location is found in NetSuite but doesnot exist in WMS.'
				});
				
				var stId = recBOH.save({
					enableSourcing: false,
					ignoreMandatoryFields: true
				});
				
				log.audit(stLogTitle, 'BOH created = '+stId);
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