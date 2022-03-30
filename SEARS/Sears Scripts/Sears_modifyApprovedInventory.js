/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/runtime', 'N/search', './NSUtil', 'N/error', 'N/task'],
	/**
	 * @param {record} record
	 * @param {runtime} runtime
	 * @param {search} search
	 * @param {Object} NSUtil
	 * @param {error} error
	 */
    function (record, runtime, search, NSUtil, error, task)
    {
		var EndPoint = {};
		
		/**
		 * @param {context} context
		 */
		EndPoint.afterSubmit = function (context)
		{
			var logTitle = 'afterSubmit:approvedInventory';
			var currentBatch = context.newRecord.id;
			
			var recordObj = context.newRecord;
			var internalId = recordObj.getValue({
			    fieldId: 'internalid'
			});

			log.debug(logTitle, "Internal Id:"+internalId);

			var orderObj = record.load({type:'salesorder', id: internalId});
			var currentStatus = orderObj.getValue({
			    fieldId: 'statusRef'
			});
			
			log.debug(logTitle, "Current status is:"+currentStatus);
			/*if (currentStatus != 'pendingBilling')
			{
				log.debug(logTitle, 'Im not going to make a cash sale');
				return true;
			}

            var cashSaleObj = record.transform({
                fromType : record.Type.SALES_ORDER,
                fromId : createdFrom,
                toType : record.Type.CASH_SALE,
                isDynamic : true
            });
			var cashSaleId = cashSaleObj.save();
			log.debug(logTitle, "Created Cash Sale\'s Internal Id:"+cashSaleId);*/
			
			return true;
		};
        return EndPoint;
});
