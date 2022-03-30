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
			
			var arrFilters = 
			[
				['custitem_sears_multi_vendor_list','is', '@NONE@'], 'AND',
				['internalid','anyof', ['64','63']]
			];
			
			var arrColumns = ['internalid'];
			
			return search.create({
				type :  'inventoryitem',
				columns : arrColumns,
				filters : arrFilters
			});
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
				
				var stRecId = objItem.id;
				
				log.debug(stLogTitle, '>> stRecId:: ' + stRecId);

				var arrVendorList = [];
				
				//Load Record
				var recItem = record.load({
					type: record.Type.INVENTORY_ITEM,
					id: stRecId
				});
				
				//Get Vendors
				var intLineCount = recItem.getLineCount('itemvendor');
				log.debug(stLogTitle, 'intLineCount = '+intLineCount);
				
				for (var intCtr = 0; intCtr < intLineCount; intCtr++)
				{
					var stVendorID = recItem.getSublistValue({
						sublistId: 'itemvendor',
						fieldId: 'vendor',
						line: intCtr
					})
					
					log.debug(stLogTitle, 'stVendorID = '+stVendorID);
					
					if(!NSUtil.inArray(stVendorID, arrVendorList))
					{
						arrVendorList.push(stVendorID);
					}
				}
				
				log.debug(stLogTitle, 'arrVendorList = '+arrVendorList);
			
				recItem.setValue({
					fieldId: 'custitem_sears_multi_vendor_list',
					value: arrVendorList
				});
				
				if(!NSUtil.isEmpty(arrVendorList)){
					var stUpdatedId = recItem.save();
					log.audit(stLogTitle, ' Record Updated = '+stUpdatedId);
				}
				
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