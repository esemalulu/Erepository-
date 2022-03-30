/*
 ***********************************************************************
 *
 * The following JavaScript code is created by GURUS Solutions,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intended for NetSuite (www.netsuite.com) and uses the SuiteScript API.
 * The code is provided "as is": GURUS Solutions shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company:		GURUS Solutions inc., www.gurussolutions.com
 *              	Cloud Consulting Pioneers
 * Author:		sarmad.nomani@gurussolutions.com
 * Date:		Jan 11, 2021 9:49:25 AM
 * File:		GRAD_MRS_ReceiveAllPurchaseOrders.js

 ***********************************************************************/

/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime', './DWV_LIB_GeneralLibrary2.0','N/redirect','N/format'],
	function(searchModule, recordModule, logModule, runtimeModule, generalLibraryModule,redirectModule,formatModule){
  		
		/**
		 * The following function receives the purchase orders to transform to item receipts
		 * @author sarmad.nomani@gurussolutions.com
		 * @return nothing
		 * @governance 0 units
		 */
		function getInputData()
		{
			// Obtain an object that represents the current script
			var myScript = runtimeModule.getCurrentScript();
			//get parameters
			var posToGenerate = myScript.getParameter({
			    name: 'custscript_gs_orderitems'
			});
          

			var parsedItemObjects = JSON.parse(posToGenerate);
			logModule.debug({title: 'parsed Objects ', details: parsedItemObjects});
          
			return parsedItemObjects;
		}


		/**
		 * The following function transforms purchase orders to item receipts
		 * @author sarmad.nomani@gurussolutions.com
		 * @param context
		 * @governance 30 units
		 */
		function reduce(context)
		{
          
          var myScript = runtimeModule.getCurrentScript();
          
          	var currentKey = myScript.getParameter({
			    name: 'custscript_gs_suiteletKey'
			});
          logModule.debug('Beginning of reduce',0);
			// Obtain an object that represents the current script
			var myScript = runtimeModule.getCurrentScript();
			var summaryError = [];
          	//
          	var keyObject = context.key.split('___');
          //
          	var vendor = keyObject[0];
          
          	var currency = keyObject[1];
            var contextObject = JSON.parse(context.values[0]);
          	if (contextObject == '' || contextObject == null){
            	return;
          	}
          var currentItem;
          var currentItemField = [];
          var itemId;
          var manufacturer;
          var vendorPartNumber;
          var manufacturerPartNumber;
          var leadDays;
          var orderQuantity;
          var itemPrice;
          var purchasingUnit;
          
          var lineItemFields = []
          
          try{
            logModule.debug('Beginning of try/catch',1);
            var purchaseOrder = recordModule.create({
              type: recordModule.Type.PURCHASE_ORDER,
              isDynamic: false,
              defaultValues: {
                entity: vendor
              }
            });
            var tempcurrency = searchModule.lookupFields({
    			type: searchModule.Type.VENDOR,
    			id: vendor,
    			columns: ['currency']
			});            
            purchaseOrder.setValue({
              fieldId: 'currency',
              value: parseInt(tempcurrency['currency'][0].value,10)
            });
            purchaseOrder.setValue({
              fieldId: 'approvalstatus',
              value: "1"
            });
            //THIS NEEDS TO BE FIXED BY DWAVE INSTRUCTION
            purchaseOrder.setValue({
              fieldId: 'department',
              value: "1"
            });
            purchaseOrder.setValue({
              fieldId: 'custbody_tjinc_dwvpur_porevisionnumber',
              value: 0
            });
            
            purchaseOrder.setValue({
              fieldId: 'custbody_gs_mrstaskid',
              value: currentKey
            });
            
            
            for(var i=0;i<contextObject.length;i++){
            	currentItem = contextObject[i];
              	itemId = Object.keys(currentItem);
              	manufacturer = currentItem[itemId][1];
              	vendorPartNumber = currentItem[itemId][2];
            	manufacturerPartNumber = currentItem[itemId][3];
          		leadDays = currentItem[itemId][4];
              	leadDays = parseInt(leadDays);
              	leadDays = calculate_leadDate(leadDays);
              
              	orderQuantity = currentItem[itemId][5];
          		itemPrice = currentItem[itemId][6];
          		purchasingUnit = currentItem[itemId][7];
              if (i == 0){
                purchaseOrder.setValue({
              		fieldId: 'location',
              		value: currentItem[itemId][8]
            	});
              }
              purchaseOrder.insertLine({
                sublistId: 'item',
                line: i
              });
            purchaseOrder.setSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i,
                value: parseFloat(itemId[0])
              });
              purchaseOrder.setSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i,
                value: parseFloat(orderQuantity).toFixed(4)
              });
              purchaseOrder.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_tjinc_dwvpur_uom',
                line: i,
                value: purchasingUnit
              });
              //////
              purchaseOrder.setSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: i,
                value: itemPrice
              });
              purchaseOrder.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_gs_manufacturer',
                line: i,
                value: manufacturer
              });
              purchaseOrder.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_gs_manufacturer_part_number',
                line: i,
                value: manufacturerPartNumber
              });
              purchaseOrder.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcolgs_vendor_part_number',
                line: i,
                value: vendorPartNumber
              });
 /*             
              purchaseOrder.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_tjinc_dwvpur_expdeliverydate',
                line: i,
                value: leadDays
              });
*/              
            }
            
            var POID = purchaseOrder.save();
            logModule.debug('Purchase Order Internal Id: ',POID);
          }
          catch (e){
            logModule.debug('error',e);
          }
		}


	    /** The following function will log information about the running map reduce script.
		 *
		 * @author sarmad.nomani@gurussolutions.com
		 * @param summary {SummaryContext} The context object passed into the summarize phase.
		 * @governance 20 units
		 */
		function summarize(summary)
		{
			var errors = [];
			var message = "";

			summary.output.iterator().each(function(key, value) {
				logModule.debug({title: 'value', details: value});
				logModule.debug({title: 'key', details: key});
				message += JSON.parse(value);
				return true;
			});

		}
  
  	function calculate_leadDate(days){
      	var now = new Date();
  		var dayOfTheWeek = now.getDay();
  		var calendarDays = days;
  		var deliveryDay = dayOfTheWeek + days;
  		if (deliveryDay >= 6) {
    			//deduct this-week days
    			days -= 6 - dayOfTheWeek;
    			//count this coming weekend
    			calendarDays += 2;
    			//how many whole weeks?
    			deliveryWeeks = Math.floor(days / 5);
    			//two days per weekend per week
    			calendarDays += deliveryWeeks * 2;
  			}
  		now.setDate(now.getDate() + calendarDays);
      var result = formatModule.format({
                        value: now,
                        type: formatModule.Type.DATETIME
                        });
      result = formatModule.parse({
        value: result,
        type:formatModule.Type.DATE
      })
  		return result;
    }

		return {
			getInputData: getInputData,
			reduce: reduce,
			summarize: summarize
		};
});