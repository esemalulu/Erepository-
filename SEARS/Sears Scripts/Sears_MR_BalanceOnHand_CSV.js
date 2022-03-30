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
 * Module Description: Create BOH csv dump report
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
		
		function getNewDate(stToday, intNoDay)
		{
			var dToday = '';
			var stNewDate = '';
			if (NSUtil.isEmpty(stToday) || !util.isDate(dToday))
			{
				dToday = (new Date());
			} 
			else 
			{
				dToday = format.parse({
					value: stToday,
					type: format.Type.DATE
				});
			}

			dToday.setDate(dToday.getDate() - intNoDay); 
			
			stNewDate =  format.format({
				value: dToday, 
				type: format.Type.DATE
			});
			
			return stNewDate;
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

			// get the parameters
			var currentScript = runtime.getCurrentScript();

			var stToday = currentScript.getParameter({name:'custscript_ss_boh_today'});
			var intNoDay = NSUtil.forceInt(currentScript.getParameter({name:'custscript_ss_boh_no_days'}));
			var stFolderId = currentScript.getParameter({name:'custscript_ss_boh_folder_id'});
			
			log.debug(stLogTitle, 'stToday = ' + stToday + ' | intNoDay = ' + intNoDay + ' | stFolderId = ' + stFolderId);

			var stNewDate = getNewDate(stToday, intNoDay);
			
			log.debug(stLogTitle, 'stNewDate = ' + stNewDate);

			if (NSUtil.isEmpty(stFolderId))
			{
				return error.create({
					name : 'MISSING_PARAMETER',
					message : 'Missing Price Level Parameter'
				});
			}

			return search.create({
				type :  'customrecord_sears_boh',
				columns :
				[
					'internalid', 'custrecord_sears_item', 'custrecord_sears_wms_location', 
					'custrecord_sears_wms_qty', 'custrecord_sears_ns_location', 'custrecord_sears_ns_qty',
					'custrecord_sears_qty_diff', 'custrecord_sears_error_msg'
				],
				filters : 
				[
					['created','on', stNewDate]
				]
			});
		};


		OBJ_ENDPOINT.map = function (context)
		{
			var stLogTitle = ST_LOG + '::map::';
			
			log.debug(stLogTitle, '>> value:: ' + JSON.stringify(context.value));
			log.debug(stLogTitle, '>> key:: ' + JSON.stringify(context.key));

			var searchResult = JSON.parse( context.value );

			var objBOH = {};
			objBOH.stInternalid = searchResult.values.internalid;
			objBOH.stItem = searchResult.values.custrecord_sears_item;
			objBOH.stWMSLoc = searchResult.values.custrecord_sears_wms_location;
			objBOH.stWMSQty = searchResult.values.custrecord_sears_wms_qty;
			objBOH.stNSLoc = searchResult.values.custrecord_sears_ns_location;
			objBOH.stNSQty = searchResult.values.custrecord_sears_ns_qty;
			objBOH.stQtyDiff = searchResult.values.custrecord_sears_qty_diff;
			objBOH.stErrMessage = searchResult.values.custrecord_sears_error_msg;
			
			log.debug(stLogTitle, 'objBOH = ' + JSON.stringify(objBOH));

			context.write(objBOH.stInternalid, JSON.stringify(objBOH));
		};


		OBJ_ENDPOINT.reduce = function (context)
		{
			var stLogTitle = ST_LOG + '::reduce::';
			
			log.debug(stLogTitle, '>> key:: ' + JSON.stringify(context.key));
			log.debug(stLogTitle, '>> values:: ' + JSON.stringify(context.values));
		
			var objKey = JSON.parse(context.key);
			var stKey = objKey.value;
			
			log.debug(stLogTitle, 'stKey =' + stKey);
		
			var stIdDeleted = record.delete({
				type: 'customrecord_sears_boh', 
				id: stKey
			});

			log.audit(stLogTitle, 'Deleted stId = '+stIdDeleted);
			
			context.write(context.key, context.values);
		};

		/**
		 * @memberOf OBJ_ENDPOINT
		 */
		OBJ_ENDPOINT.summarize = function (summary)
		{
			var stLogTitle = ST_LOG + '::summarize::';
			log.audit(stLogTitle, 'summary = ' + JSON.stringify(summary));
			
			// get the parameters
			var currentScript = runtime.getCurrentScript();
			
			var stToday = currentScript.getParameter({name:'custscript_ss_boh_today'});
			var intNoDay = NSUtil.forceInt(currentScript.getParameter({name:'custscript_ss_boh_no_days'}));
			var stFolderId = currentScript.getParameter({name:'custscript_ss_boh_folder_id'});
			
			var stNewDate = getNewDate(stToday, intNoDay);
			
			//Save CSV File
			var bValid = false;
			var stContent = 'Internal Id, Item, WMS Location, WMS Quantity, NS Location, NS Quantity, Qty Difference, Error Message \n';
			
			summary.output.iterator().each(function(key, value){
				
				log.debug(stLogTitle, 'key = ' + key);
				log.debug(stLogTitle, 'value = ' + value);
				
				var arrObjItem = JSON.parse(value);
				
				log.debug(stLogTitle, 'arrObjItem = '+arrObjItem);
				
				var objItem = JSON.parse(arrObjItem[0]);
				
				log.debug(stLogTitle, 'objItem = '+JSON.stringify(objItem));
	
				for (var stValKey in objItem) 
				{
					log.debug(stLogTitle, 'stValKey = ' + stValKey);

					if(!NSUtil.isEmpty(objItem[stValKey].text))
					{
						stContent += objItem[stValKey].text.replace(/\r?\n/g, ' ') + ',';
					} else 
					{
						stContent += objItem[stValKey].replace(/\r?\n/g, ' ') + ',';
					}
				}
				stContent += '\n';
				bValid = true;
				return true;
			});
			
			log.debug(stLogTitle, 'stContent = ' + stContent);
			
			var currentScript = runtime.getCurrentScript();
	
			var dNow = new Date().getTime();
		
			if(bValid)
			{
				var objFile = file.create({
					name: 'BOH_'+stNewDate+'_'+dNow+'.csv',
					fileType: file.Type.CSV,
					contents: stContent
				});
				
				objFile.folder = stFolderId;
				var stFileId = objFile.save();
				
				log.debug(stLogTitle, 'Created stFileId = ' +stFileId);
			} 
			else 
			{
				log.debug(stLogTitle, 'No file generated.');
			}
			
			//ERROR HANDLING
			handleErrorIfAny(summary);
			
		};

		return OBJ_ENDPOINT;
	}
);