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
 */

/**
 *
 * @NApiVersion 2.x
 * @NScriptType usereventscript
 */
define(
[
		'N/error', 'N/record', 'N/runtime', 'N/search', 'N/ui/serverWidget','./NSUtil'
],
/**
 * @param {error} error
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {Object} NSUTIL
 */
function(error, record, runtime, search, serverWidget, nsutil)
{
	var ENDPOINTS = {};

	function searchAvailableLocation(item, itemqty)
	{
		var arrSearchItemLocation = nsutil.searchAll(
		{
			recordType : 'item',
			filters :
			[
					search.createFilter(
					{
						name : 'internalid',
						operator : search.Operator.ANYOF,
						values : item
					}), search.createFilter(
					{
						name : 'locationquantityavailable',
						operator : search.Operator.GREATERTHANOREQUALTO,
						values : itemqty
					})
			],
			columns :
			[
					search.createColumn(
					{
						name : 'internalid',
						join : 'inventoryLocation'
					}), search.createColumn(
					{
						name : 'inventoryLocation'

					}), search.createColumn(
					{
						name : 'locationquantityavailable',
						sort : search.Sort.ASC
					})
			]
		});

		if (nsutil.isEmpty(arrSearchItemLocation))
		{
			return false;
		}

		var searchRow = arrSearchItemLocation.shift();

		return searchRow.getValue(
		{
			name : 'internalid',
			join : 'inventoryLocation'
		});
	}

	function isItemDropShip (itemid)
	{
		return search.lookupFields({type:'item', id:itemid, columns:'isdropshipitem'});
	}

	ENDPOINTS.beforeLoad = function (context)
	{
		var stLogTitle = 'ENDPOINTS.beforeLoad';

		var currentRecord = context.newRecord;
		var lineCount = currentRecord.getLineCount('item');

		var field = context.form.addField({
			id: 'custpage_inlinehtml',
			label: 'Sample',
			type: serverWidget.FieldType.INLINEHTML
      	});

		field.defaultValue = '<script type="javascript">alert(1234);</script>';

		return true;
	};

	/**
	 * function definition to be triggered before record is load
	 *
	 * @param {Object} scriptContext
	 * @param {record.Record} scriptContext.newRecord new record
	 * @param {record.Record} scriptContext.oldRecord old record
	 * @param {String} scriptContext.type trigger type
	 * @Since 2015.2
	 */
	ENDPOINTS.beforeSubmit = function(context)
	{
		var stLogTitle = 'ENDPOINTS.beforeSubmit';

		log.debug(stLogTitle, '>> Entry Log <<');
		log.debug(stLogTitle, 'context.type = ' + context.type);
		log.debug(stLogTitle, 'runtime.executionContext = ' + runtime.executionContext);

		// if (!nsutil.inArray(context.type,
		// [context.UserEventType.CREATE,context.UserEventType.EDIT]) )
		// {
		// return true;
		// }

		// if (!nsutil.inArray(runtime.executionContext,
		// [runtime.executionContext.USER_INTERFACE]) )
		// {
		// return true;
		// }
		var currentRecord = context.newRecord;
		
		if (context.type == context.UserEventType.CREATE && runtime.executionContext != runtime.executionContext.USER_INTERFACE)
	    {
		    var shipDate = currentRecord.getValue({fieldId:'shipdate'});
		    var shipDate2 = currentRecord.getValue({fieldId:'custbody_ship_date'});
		    
		    log.debug('## SHIP DATE ##', JSON.stringify({'shipdate':shipDate, 'custbody_ship_date':shipDate2}) );
		    
		    if (shipDate2 && shipDate != shipDate2)
	        {
		        currentRecord.setValue({fieldId:'shipdate', value:shipDate2});
		        log.debug('## SHIP DATE ##', '.. setting the date: ' + shipDate2 );
	        }
		    
            var shipCost = currentRecord.getValue({fieldId:'shippingcost'});
            var shipCost2 = currentRecord.getValue({fieldId:'custbody_shipping_cost'});
		    
		    log.debug('## SHIP COST ##', JSON.stringify({'shippingcost':shipCost, 'custbody_shipping_cost':shipCost2}) );
		    
            if (shipDate2 && shipDate != shipDate2)
            {
                currentRecord.setValue({fieldId:'shippingcost', value:shipCost2});
                log.debug('## SHIP DATE ##', '.. setting the value: ' + shipCost2 );
            }
	    }
		

		var lineCount = currentRecord.getLineCount('item');
		for (var line = 0; line < lineCount; line ++)
		{
			var strCreatePO = currentRecord.getSublistValue(
			{
				sublistId : 'item',
				fieldId : 'createpo',
				line : line
			});

			log.debug(stLogTitle, '... Line #' + line);
			log.debug(stLogTitle, '....... createpo ' + strCreatePO);

			if (strCreatePO == 'DropShip')
			{
				var item = currentRecord.getSublistValue(
				{
					sublistId : 'item',
					fieldId : 'item',
					line : line
				});

				var itemqty = currentRecord.getSublistValue(
				{
					sublistId : 'item',
					fieldId : 'quantity',
					line : line
				});

				var locationType = searchAvailableLocation(item, itemqty);
				log.debug(stLogTitle, '--Location: ' + locationType);

				if (locationType)
				{
					currentRecord.setSublistValue({
						sublistId : 'item',
						fieldId : 'createpo',
						line : line,
						value : ''
					});

					currentRecord.setSublistValue({
						sublistId : 'item',
						fieldId : 'location',
						line : line,
						value : locationType
					});
				}
			}
		}

		return true;

	};

	return ENDPOINTS;
});
