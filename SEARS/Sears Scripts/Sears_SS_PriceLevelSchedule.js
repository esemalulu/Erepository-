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
 * 1.00       03 June2016     bfeliciano	   initial
 * 1.10       15 Sept2016     mjpascual        retain clearance, sale & ol price
 */

/**
 * @NModuleScope Public
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(
[
		'./NSUtil', 'N/format','N/error', 'N/record', 'N/runtime', 'N/search', 'N/task'
],
/**
 * @param {Object} nsutil
 * @param {format} format
 * @param {error} error
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {task} task
 */
function(nsutil, format, error, record, runtime, search, task)
{
	var _LOGTITLE = 'PriceLevelSchedule';

    var CACHE = {}, Helper = {}, ErrorHandler = {}, EndPoint = {};
    
	/**
	 * Get Input Data
	 * @memberOf EndPoint
	 */
	EndPoint.getInputData = function ()
	{
		var logTitle = _LOGTITLE + '::getInputData::';

		log.debug(logTitle, '*** Start Script *** ');

		// get the parameters
		var objParamValues = Helper.getParameterValues();

		if (nsutil.isEmpty(objParamValues.priceLevelSaleItem))
		{
 			return error.create(
			{
				name : 'MISSING_PARAMETER',
				message : 'Missing Price Level Parameter'
			});
		}

		log.debug(logTitle, '>> dateToday ' + objParamValues.todayDateStr);

		return search.create({
			type :  'customrecord_item_pricing_schedule',
			columns :
			[
			 	search.createColumn({name:'custrecord_ips_item',sort: search.Sort.ASC}),
			 	search.createColumn({name:'custrecord_ips_start_date',sort: search.Sort.DESC}),
			 	search.createColumn({name:'custrecord_ips_end_date',sort: search.Sort.DESC}),
			 	search.createColumn({name:'custrecord_ips_price_level'}),
			 	search.createColumn({name:'custrecord_ips_amount'}),
			 	//MJ 9/15/2016 Start
			 	search.createColumn({name:'custrecord_base_price'}),
			 	search.createColumn({name:'custrecord_clearance'}),
			 	search.createColumn({name:'custrecord_sale_item'}),
			 	search.createColumn({name:'custrecord_online_price'}),
			 	search.createColumn({name:'internalid'}),
			 	//MJ 9/15/2016 End
			 	search.createColumn({name:'type', join:'custrecord_ips_item'}),
			 	search.createColumn({name:'totalvalue', join:'custrecord_ips_item'})
			],
			filters:
			[	
			 	[
				 	['custrecord_ips_start_date','on', objParamValues.todayDateStr], 
				 	'OR',
				 	['custrecord_ips_end_date','on', objParamValues.todayDateStr]
				],
				'AND',
				['isinactive', 'is', 'F']
			]
		});
	};

	/**
	 * @param {MapContext} context
	 * @returns {Boolean}
	 * @memberOf EndPoint
	 */
	EndPoint.map = function (context)
	{
		var logTitle = _LOGTITLE + '::MAP';
		var searchResult = JSON.parse( context.value );

		var priceSched = {};
			priceSched.priceLevel = searchResult.values.custrecord_ips_price_level;
			priceSched.startDateStr = searchResult.values.custrecord_ips_start_date;
			priceSched.endDateStr = searchResult.values.custrecord_ips_end_date;
			priceSched.amount = searchResult.values.custrecord_ips_amount;
			priceSched.item = searchResult.values.custrecord_ips_item;
			priceSched.itemType = searchResult.values['type.custrecord_ips_item'];
			priceSched.recordtype = nsutil.toItemInternalId(priceSched.itemType.value);
			
			//MJ 9/15/2016 Start
			priceSched._base_price = searchResult.values.custrecord_base_price;
			priceSched._clearance  = searchResult.values.custrecord_clearance;
			priceSched._sale_item  = searchResult.values.custrecord_sale_item;
			priceSched._online_price  = searchResult.values.custrecord_online_price;
			priceSched.internalid  = searchResult.values.internalid;
		 	//MJ 9/15/2016 End
		 	
			priceSched.startDate = Helper.parseDate(priceSched.startDateStr);
			priceSched.endDate = Helper.parseDate(priceSched.endDateStr);

		// IGNORE: Start Date && EndDate are same //
		if ( priceSched.startDate == priceSched.endDate )
		{
			return;
		}

		// IGNORE: EndDate is less than startDate
		if (util.isDate(priceSched.endDate) && priceSched.endDate <= priceSched.startDate )
		{
			return;
		}

		log.debug(logTitle, '>>> include price schedule: ' + JSON.stringify(priceSched) );

		context.write(priceSched.item.value, priceSched);
		return true;
	};


	/**
	 * @memberOf EndPoint
	 */
	EndPoint.reduce = function (context)
	{
		var logTitle = _LOGTITLE + '::reduce::';

		var objParamValues = Helper.getParameterValues();

		var priceSched = JSON.parse(context.values[0]);
		if ( nsutil.isEmpty(priceSched) )
		{
			return ; //exit
		}
		
		context.values.forEach(function(value)
		{
						
			var priceSched = JSON.parse(value);
			
			var recItem = record.load({type: priceSched.recordtype, id: context.key});
			var sublistName = ('price' + objParamValues.currency).toString();

			log.debug(logTitle, '>> sublistName:: ' + sublistName);

			priceSched.startDate = Helper.parseDate(priceSched.startDateStr);
			priceSched.endDate = Helper.parseDate(priceSched.endDateStr);

			log.debug(logTitle, '>> Price Sched: ' + JSON.stringify(priceSched));
			
			var stOriginalPrice = recItem.getValue('custitem_sears_original_price');
			log.debug(logTitle, '>> stOriginalPrice: ' + stOriginalPrice);
			
			//Set Original Price
			if(priceSched.priceLevel == 'Base Price' && nsutil.isEmpty(stOriginalPrice))
			{
				recItem.setValue('custitem_sears_original_price', priceSched.amount);
			}
			
			//MJ 9/15/2016 Start
			var stCusFldId = '_'+priceSched.priceLevel.text.toLowerCase().replace(" ","_");
			log.debug(logTitle, '>> stCusFldId: ' + stCusFldId);
			
			var objPriceLevel = Helper.detectPriceLevel({
				record : recItem,
				sublistName : sublistName,
				priceLevel : priceSched.priceLevel.text
			});

			if (objParamValues.todayDateStr == priceSched.startDateStr)
			{
				
				//Search for records that has lesser end date than this record's end date and deactivate it
				var objItemPricing = search.create({
					type :  'customrecord_item_pricing_schedule',
					columns :
					[
					 	search.createColumn({name:'internalid'}),
					 	search.createColumn({name:'custrecord_ips_end_date'})
					],
					filters:
					[	
					 	['custrecord_ips_price_level','anyof', priceSched.priceLevel.value], 'AND',
					 	['internalid','noneof', priceSched.internalid.value], 'AND',
					 	['custrecord_ips_item','anyof', priceSched.item.value], 'AND',
					 	['isinactive', 'is', 'F']
					]
				});
				
				log.debug(logTitle, '>> priceSched.priceLevel.value: ' + priceSched.priceLevel.value);
				log.debug(logTitle, '>> priceSched.internalid.value: ' + priceSched.internalid.value);
				log.debug(logTitle, '>> priceSched.item.value: ' + priceSched.item.value);
				
				var intCountDeactivated = 0;
				var intTotalCount = 0;
				
				objItemPricing.run().each(function(objResult) {
						
					intTotalCount++;
					log.debug(logTitle, '>> iterator: ' + intTotalCount);
					
					var stIdIP = objResult.getValue({name:'internalid'});
					var stEndIP = objResult.getValue({name:'custrecord_ips_end_date'});
					
					log.debug(logTitle, '>> stIdIP: ' + stIdIP);
					log.debug(logTitle, '>> stEndIP: ' + stEndIP);
					
					var dEndIp = format.parse({
						value: stEndIP,
						type: format.Type.DATE
					});
					
					var dEndCurr = format.parse({
						value: priceSched.endDateStr,
						type: format.Type.DATE
					});
					
					dEndIp.setHours(0, 0, 0, 0, 0);
					dEndCurr.setHours(0, 0, 0, 0, 0);
					
					log.debug(logTitle, '>> dEndIp ' + dEndIp);
					log.debug(logTitle, '>> dEndCurr ' + dEndCurr);
					
					var intEndIp = dEndIp.getTime();
					var intEndCurr = dEndCurr.getTime();
					
					log.debug(logTitle, '>> intEndIp ' + dEndIp);
					log.debug(logTitle, '>> intEndCurr ' + dEndCurr);
					
					log.debug(logTitle, '>> intEndIp < intEndCurr ' + intEndIp < intEndCurr );
				
					//If End date should be before current's end date Deactivate Record
					if(intEndIp < intEndCurr)
					{
						var id = record.submitFields({
						    type: 'customrecord_item_pricing_schedule',
						    id: stIdIP,
						    values: {
						    	isinactive : 'T'
						    }
						});
						
						log.debug(logTitle, '>> Deactivate stIdIP: ' + stIdIP);
						
						intCountDeactivated ++;
					}
					
					return true;
				});

				log.debug(logTitle, '>> intCountDeactivated' +intCountDeactivated);
				log.debug(logTitle, '>> intTotalCount' +intTotalCount);
			
				//Set as 0 if this is the last record
				if(intCountDeactivated == intTotalCount)
				{
					objPriceLevel[priceSched.priceLevel.text].amount = 0;
				}
				
				log.debug(logTitle, '>> objPriceLevel' +JSON.stringify(objPriceLevel));
				log.debug(logTitle, '>> new amount: ' +priceSched.amount);
				
				//Set new price amount on the item
				Helper.setPriceLevelAmount({
					record : recItem,
					sublistName : sublistName,
					priceLevelName : priceSched.priceLevel.text,
					priceLevelField : 'price_1_',
					amount: priceSched.amount
				});
				
				//Update Custom Field
				var id = record.submitFields({
				    type: 'customrecord_item_pricing_schedule',
				    id: priceSched.internalid.value,
				    values: {
				    	custrecord_base_price : objPriceLevel['Base Price'].amount,
				    	custrecord_clearance : objPriceLevel['Clearance'].amount,
				    	custrecord_sale_item : objPriceLevel['Sale Item'].amount,
				    	custrecord_online_price : objPriceLevel['Online Price'].amount
				    }
				});
				log.debug(logTitle, '..Updating item pricing custom record: ' + id);
				
			}
			else if (objParamValues.todayDateStr == priceSched.endDateStr)
			{
				var flAmt = nsutil.forceFloat(priceSched[stCusFldId]);
				
				log.debug(logTitle, '>> flAmt: ' +flAmt);
				
				//Set as blank instead of 0.00
				var flOldAmt = '';
				if(flAmt > 0)
				{
					flOldAmt = flAmt;
				}
	
				log.debug(logTitle, '>> flOldAmt: '+flOldAmt);
				
				//Revert price amount
				Helper.setPriceLevelAmount({
					record : recItem,
					sublistName : sublistName,
					priceLevelName : priceSched.priceLevel.text,
					priceLevelField : 'price_1_',
					amount: flOldAmt
				});
			}

			//Update Item
			var itemid = recItem.save({enableSourcing: true,ignoreMandatoryFields: true});
			log.debug(logTitle, '..Updating item record: ' + itemid);
		
			//MJ 9/15/2016 End
			context.write('updateItem', itemid);
			context.write('updateItemPricing', id);
		});
		
		context.write(1);

		return;
	};


	/**
	 * @param {Object} summary
	 * @memberOf EndPoint
	 */
	EndPoint.summarize = function (summary)
	{
		ErrorHandler.summaryError(summary);

		var logTitle = _LOGTITLE + '::summarize::';
		log.audit(logTitle, '>>::summary::' + JSON.stringify(summary));
	};


	/**
	 * @param {Object} option
	 * @memberOf Helper
	 */
	Helper.detectPriceLevel = function (option)
	{
		var record = option.record || false;
		var lineCount = record.getLineCount({sublistId : option.sublistName });

		log.debug('## detectPriceLevel ##', '## detectPriceLevel:Start : ' + JSON.stringify(option.sublistName));

		var priceLevelLineData = {};

		for (var line=0; line < lineCount; line++)
		{
			var linePriceLevelName = record.getSublistValue({
				sublistId : option.sublistName,
				fieldId: 'pricelevelname',
				line: line
			});

			var linePriceLevelAmount = record.getSublistValue({
				sublistId : option.sublistName,
				fieldId: 'price_1_',
				line: line
			});
			
			linePriceLevelAmount = parseFloat( linePriceLevelAmount || '0');
			
			if(option.priceLevel != linePriceLevelName)
			{
				linePriceLevelAmount = '';
			}
			
			priceLevelLineData[linePriceLevelName] = {
					priceLevel: linePriceLevelName,
					amount: linePriceLevelAmount,
					line: line
			}
			
		}

		log.debug('## detectPriceLevel ##', '....objPriceLevel: ' + JSON.stringify(priceLevelLineData));

		return priceLevelLineData;
	};
	
	/**
	 * @param {Object} option
	 * @memberOf Helper
	 */
	Helper.findPriceLevelName = function (option)
	{
		var record = option.record || false;
		if (nsutil.isEmpty(record))
		{
			return ErrorHandler.create('CODE_ERROR', 'Missing record object');
		}
		log.debug('## findPriceLevelName ##', '## findPriceLevelName:Start : ' + JSON.stringify(option.priceLevelName));


		var cacheKey = ['findPriceLevel', option.priceLevelName].join(':');
		if ( CACHE[cacheKey] == null )
		{
			log.debug('## findPriceLevelName ##', '## NOT FROM CACHE ##');

			var priceLevelLineData = {}, isFound = false;
			var lineCount = record.getLineCount({sublistId : option.sublistName });
			for (var line=0; line < lineCount; line++)
			{
				var linePriceLevelName = record.getSublistValue({
					sublistId : option.sublistName,
					fieldId: 'pricelevelname',
					line: line
				});

				if (linePriceLevelName == option.priceLevelName)
				{
					priceLevelLineData = {
							priceLevel: linePriceLevelName,
							line: line
					};
					isFound = true;
					break;
				}
			}

			if (!isFound)
			{
				priceLevelLineData = {priceLevel: option.sublistName,line: -1};
			}
			CACHE[cacheKey] = priceLevelLineData;
		}

		log.debug('## findPriceLevelName ##', '.... result: ' + JSON.stringify(CACHE[cacheKey]));
		return CACHE[cacheKey];
	};

	/**
	 * @param {Object} option
	 * @memberOf Helper
	 */
	Helper.getPriceLevelAmount = function (option)
	{
		var record = option.record || false;
		if (nsutil.isEmpty(record))
		{
			return ErrorHandler.create('CODE_ERROR', 'Missing record object');
		}
		log.debug('## getPriceLevelAmount ##', '## getPriceLevelAmount:Start : ' + JSON.stringify(option.priceLevelName));

		var linePriceLevelAmount = 0;

		// get the priceLevel Data
		var priceLevelData = Helper.findPriceLevelName(option);
		if (priceLevelData.line > -1)
		{
			linePriceLevelAmount = record.getSublistValue({
				sublistId : option.sublistName,
				fieldId: 'price_1_',
				line: priceLevelData.line
			});
			linePriceLevelAmount = parseFloat( linePriceLevelAmount || '0');
		}

		log.debug('## getPriceLevelAmount ##', '...result: ' + JSON.stringify(linePriceLevelAmount));

		return linePriceLevelAmount;
	};

	/**
	 * @param {Object} option
	 * @memberOf Helper
	 */
	Helper.setPriceLevelAmount = function (option)
	{
		var record = option.record || false;
		if (nsutil.isEmpty(record))
		{
			ErrorHandler.create('CODE_ERROR', 'Missing record object');
			return false;
		}
		log.debug('## setPriceLevelAmount ##', '## setPriceLevelAmount:Start : ' + JSON.stringify([option.priceLevelName, option.amount]));

		var hasUpdated = false;

		// get the priceLevel Data
		var priceLevelData = Helper.findPriceLevelName(option);
		if (priceLevelData.line > -1)
		{
			record.setSublistValue({
				sublistId : option.sublistName,
				fieldId: 'price_1_',
				line: priceLevelData.line,
				value: option.amount
			});
			hasUpdated = true;
		}

		log.debug('## setPriceLevelAmount ##', '... hasUpdated?: ' + JSON.stringify([hasUpdated, priceLevelData]));

		return hasUpdated;
	};


	//////////////////////////// HELPER /////////////////////////////////
	/**
	 * @returns {Object} parameter Values
	 * @memberOf Helper
	 */
	Helper.getParameterValues = function ()
	{
		var logTitle = _LOGTITLE + '::getParameterValues';
		var cacheKey = ['getParameterValues'].join(':');

		if ( CACHE[cacheKey] == null )
		{
			var objParamValues = {};

	    	var objParamValues = {};

			// get todays date
			var currentScript = runtime.getCurrentScript();

			objParamValues.priceLevelSaleItem = currentScript.getParameter({name:'custscript_ss_pricelevel_saleitem'});
			objParamValues.todayDate = currentScript.getParameter({name:'custscript_ss_pricesched_today'}) || (new Date());
			objParamValues.currency = currentScript.getParameter({name:'custscript_ss_pricesched_currency'});

			objParamValues.todayDateStr = format.format({value: objParamValues.todayDate, type: format.Type.DATE});
//			log.debug(logTitle, '>> Parameter Values 1: ' + JSON.stringify(objParamValues));

			if (!util.isDate(objParamValues.todayDate))
			{
				objParamValues.todayDate = (new Date());
			}
			objParamValues.todayDateStr = format.format({value: objParamValues.todayDate, type: format.Type.DATE});

			log.debug(logTitle, '>> Parameter Values: ' + JSON.stringify(objParamValues));


			CACHE[cacheKey] = objParamValues;
		}

		return CACHE[cacheKey];
	};

	/**
	 * @param {String} dateStr
	 * @returns {Date}
	 * @memberOf Helper
	 */
	Helper.parseDate = function(dateStr)
    {
    	var parsedDate = null;

		if (!nsutil.isEmpty(dateStr))
		{
			parsedDate = format.parse({value:dateStr, type: format.Type.DATE});
		}

		return util.isDate(parsedDate) ? parsedDate : null;
    };

	//////////////////////////// ERROR HANDLER /////////////////////////////////

	/**
	 * @param {Error} e
	 * @param {String} stage
	 * @memberOf ErrorHandler
	 */
	ErrorHandler.sendNotification = function (e, stage)
	{
		log.error('Stage: ' + stage + ' failed', e);
	};
	/**
	 * @param {MapReduceScriptTask} summary object
	 * @memberOf ErrorHandler
	 */
	ErrorHandler.summaryError = function (summary)
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
            ErrorHandler.sendNotification(e, 'getInputData');
        }

        ErrorHandler.stageError('map', mapSummary);
        ErrorHandler.stageError('reduce', reduceSummary);
	};
	/**
	 * @param {stage} stage
	 * @memberOf ErrorHandler
	 */
	ErrorHandler.stageError = function (stage, summary)
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
            ErrorHandler.sendNotification(e, stage);
        }
	};
	/**
	 * @param {String} name
	 * @param {String} message
	 * @param {Boolean} notify
	 * @returns {error}
	 * @memberOf ErrorHandler
	 */
	ErrorHandler.create = function(name, message, notify)
	{
		var objError = error.create({name: name,message: message,notifyOff: notify});
		log.error("ERROR FOUND", objError.name);
		return objError;
	};



	return EndPoint;
});