/**
 * Suitelet that displays Prepaid Vendor Float Balance
 * Elijah Semalulu - 11/5/2019 
 * @param req
 * @param res
 */
function displayFloatBalances(req, res)
{
        var nsform = nlapiCreateForm('Prepaid Vendor Float Balance Report', false);
  		nsform.setScript('customscript_ach_cs_vendor_float');

  	//Add Error or any other message display field
	var msgfld = nsform.addField('custpage_msgfld', 'inlinehtml','Message', null, null);
	msgfld.setLayoutType('outsideabove', null);

       var paramBillePurchaseOrderSearch = nlapiGetContext().getSetting('SCRIPT','custscript_ach_billed_po_order_search');
       var paramUnBilledPurchaseOrderSearch = nlapiGetContext().getSetting('SCRIPT','custscript_ach_unbilled_po_order_search');
       var paramAdjustmentSearch = nlapiGetContext().getSetting('SCRIPT','custscript_ach_adjsutment_search');
       var paramCloseToBillSearch = nlapiGetContext().getSetting('SCRIPT','custscript_ach_close_to_bill_search');  
  
       var paramTransferSearch = nlapiGetContext().getSetting('SCRIPT','custscript_ach_float_transfers');

	   var paramShipping = (req.getParameter('custpage_shipping')?req.getParameter('custpage_shipping'):'');
  
  		var paramStatusMsg = (req.getParameter('custparam_msg')?req.getParameter('custparam_msg'):'');

	//Drilldown parameters for when users select underlined link values
	var paramDrillDownType = (req.getParameter('drilltype')?req.getParameter('drilltype'):''),
	    paramDrillDownVendor = (req.getParameter('vendor')?req.getParameter('vendor'):'');
 
  		if (paramStatusMsg)
		{
			msgfld.setDefaultValue(
				'<div style="font-weight:bold; padding: 10px; font-size: 15px">'+
				paramStatusMsg+
				'</div>'
			);
        }


  if (paramDrillDownType)
  {

			// BILLED Purchase Orders
			if (paramDrillDownType == 'billedPoAmount')
			{
				//We first load the original search
				var billedPoSearch = nlapiLoadSearch(null, paramBillePurchaseOrderSearch),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					billedPoFlt = billedPoSearch.getFilters(),
					newBilledPoFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					billePoCol = [new nlobjSearchColumn('trandate').setSort(true),
                       		 new nlobjSearchColumn('entityid','vendor'),
                             new nlobjSearchColumn('custbody_ach_exclude_fr_float_balance'),
                             //new nlobjSearchColumn('item'),
					         new nlobjSearchColumn('tranid'),
					         new nlobjSearchColumn('status'),
					         new nlobjSearchColumn('amount'),
					         new nlobjSearchColumn('exchangerate'),
                             new nlobjSearchColumn('fxamount'),
                             new nlobjSearchColumn('currency')];

				for (var i=0; i < billedPoFlt.length; i+=1)
				{
					newBilledPoFlt.push(billedPoFlt[i]);
				}


				newBilledPoFlt.push(new nlobjSearchFilter('internalid', 'vendor', 'anyof', paramDrillDownVendor));

				var	billedPoCloneSearch = nlapiCreateSearch(
										billedPoSearch.getSearchType(), 
										newBilledPoFlt,
										billePoCol
									   );
				billedPoCloneSearch.setRedirectURLToSearchResults();
				return;
			}

			// UNBILLED Purchase Orders
			if (paramDrillDownType == 'unbilledPoAmount')
			{
				//We first load the original search
				var unbilledPoSearch = nlapiLoadSearch(null, paramUnBilledPurchaseOrderSearch),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					unbilledPoFlt = unbilledPoSearch.getFilters(),
					newUnBilledPoFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					unbillePoCol = [new nlobjSearchColumn('trandate').setSort(true),
                       		 new nlobjSearchColumn('entityid','vendor'),
                             new nlobjSearchColumn('custbody_ach_exclude_fr_float_balance'),
                             //new nlobjSearchColumn('item'),
					         new nlobjSearchColumn('tranid'),
					         new nlobjSearchColumn('status'),
					         new nlobjSearchColumn('amount'),
                             new nlobjSearchColumn('fxamount'),
                             new nlobjSearchColumn('currency')];

				for (var i=0; i < unbilledPoFlt.length; i+=1)
				{
					newUnBilledPoFlt.push(unbilledPoFlt[i]);
				}


				newUnBilledPoFlt.push(new nlobjSearchFilter('internalid', 'vendor', 'anyof', paramDrillDownVendor));

				var	unbilledPoCloneSearch = nlapiCreateSearch(
										unbilledPoSearch.getSearchType(), 
										newUnBilledPoFlt,
										unbillePoCol
									   );
				unbilledPoCloneSearch.setRedirectURLToSearchResults();
				return;
			}

			// CLOSED TO BILL Purchase Orders
			if (paramDrillDownType == 'closedToBillPoAmount')
			{
				//We first load the original search
				var closeToBillPoSearch = nlapiLoadSearch(null, paramCloseToBillSearch),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					closedToBillPoFlt = closeToBillPoSearch.getFilters(),
					newClosedToBillPoFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					closedToBillPoCol = [new nlobjSearchColumn('trandate').setSort(true),
                       		 new nlobjSearchColumn('entityid','vendor'),
                             new nlobjSearchColumn('custbody_ach_exclude_fr_float_balance'),
					         new nlobjSearchColumn('tranid'),
					         new nlobjSearchColumn('status'),
                             new nlobjSearchColumn('item'),
					         new nlobjSearchColumn('custcol_ach_closed_to_bill'),
					         new nlobjSearchColumn('amount'),
                             new nlobjSearchColumn('fxamount'),
                             new nlobjSearchColumn('currency')];

				for (var i=0; i < closedToBillPoFlt.length; i+=1)
				{
					newClosedToBillPoFlt.push(closedToBillPoFlt[i]);
				}


				newClosedToBillPoFlt.push(new nlobjSearchFilter('internalid', 'vendor', 'anyof', paramDrillDownVendor));

				var	closeToBillPoCloneSearch = nlapiCreateSearch(
										closeToBillPoSearch.getSearchType(), 
										newClosedToBillPoFlt,
										closedToBillPoCol
									   );
				closeToBillPoCloneSearch.setRedirectURLToSearchResults();
				return;
			}

    			//Adjustments
			if (paramDrillDownType == 'usdExpAmpount')
			{
				//We first load the original search
				var adjSearch = nlapiLoadSearch(null, paramAdjustmentSearch),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					adjFlt = adjSearch.getFilters(),
					newAdjFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					adjCol = [new nlobjSearchColumn('trandate').setSort(true),
                       		 new nlobjSearchColumn('entityid','vendor'),
                             new nlobjSearchColumn('account'),
					         new nlobjSearchColumn('tranid'),
					         new nlobjSearchColumn('status'),
					         new nlobjSearchColumn('amount'),
                             new nlobjSearchColumn('fxamount'),
                             new nlobjSearchColumn('currency')];

				for (var i=0; i < adjFlt.length; i+=1)
				{
					newAdjFlt.push(adjFlt[i]);
				}


				newAdjFlt.push(new nlobjSearchFilter('internalid', 'vendor', 'anyof', paramDrillDownVendor));

				var	adjCloneSearch = nlapiCreateSearch(
										adjSearch.getSearchType(), 
										newAdjFlt,
										adjCol
									   );
				adjCloneSearch.setRedirectURLToSearchResults();
				return;
			}

    			//Transfers
			if (paramDrillDownType == 'totalReplenishAmpount')
			{
				//We first load the original search
				var trfSearch = nlapiLoadSearch(null, paramTransferSearch),
					//We grab the filters from original saved search used by Scheduled Script.
					//Assumes that it is NOT using expression based search
					trfFlt = trfSearch.getFilters(),
					newTrfFlt = [],
					//We custom build the search results for lead search
					//ungrouped
					trfCol = [new nlobjSearchColumn('trandate').setSort(true),
                             new nlobjSearchColumn('account'),
					         new nlobjSearchColumn('tranid'),
					         new nlobjSearchColumn('status'),
					         new nlobjSearchColumn('amount'),
					         new nlobjSearchColumn('exchangerate'), 
                             new nlobjSearchColumn('fxamount'),
                             new nlobjSearchColumn('currency')];

				for (var i=0; i < trfFlt.length; i+=1)
				{
					newTrfFlt.push(trfFlt[i]);
				}

                  newTrfFlt.push(new nlobjSearchFilter('custrecord_ach_netsuite_vendor', 'account', 'anyof', paramDrillDownVendor));

				var	trfCloneSearch = nlapiCreateSearch(
										trfSearch.getSearchType(), 
										newTrfFlt,
										trfCol
									   );
				trfCloneSearch.setRedirectURLToSearchResults();
				return;
			}

 }



        var floatMetricArray = [];
		var floatMetricObj = {};

  

        var vndrFlt = [new nlobjSearchFilter('custrecord_ach_netsuite_vendor', null,'noneof', '@NONE@')];

        var vndrCol = [new nlobjSearchColumn('internalid'),
          			   new nlobjSearchColumn('custrecord_ach_netsuite_vendor'),
                       new nlobjSearchColumn('currency','CUSTRECORD_ACH_NETSUITE_VENDOR', null),
                       new nlobjSearchColumn('custentity_ach_shipping_rate','CUSTRECORD_ACH_NETSUITE_VENDOR', null),
                       new nlobjSearchColumn('balance')];

        var vndrRs = nlapiSearchRecord('account', null, vndrFlt, vndrCol);

  		for(var i=0; vndrRs && i < vndrRs.length; i++){

			 floatMetricObj[vndrRs[i].getValue('custrecord_ach_netsuite_vendor')] = {
			"obj_id":vndrRs[i].getValue('custrecord_ach_netsuite_vendor'),
			"obj_vendor":vndrRs[i].getText('custrecord_ach_netsuite_vendor'),
			"obj_currency":vndrRs[i].getText('currency','CUSTRECORD_ACH_NETSUITE_VENDOR', null),
			"obj_currencyid":vndrRs[i].getValue('currency','CUSTRECORD_ACH_NETSUITE_VENDOR', null),
			"obj_accountid":vndrRs[i].getValue('internalid'),

			"obj_floatbalance":"0",

            "obj_threshold":"0",
            "obj_threshold_closedToBill":"0",

           	"obj_addition_to_replenish_amnt":"0",
           	"obj_journal_add_to_replenish_amnt":"0",

           	"obj_total_replenish_amnt":"0",
			"obj_last_replenish_date":"0",

			"obj_billed_po_amount": "0",
			"obj_closedtobill_po_amount": "0",
			"obj_unbilled_po_amount": "0",

			"obj_fx_exp_amount":"0",
			"obj_shippingrate":vndrRs[i].getValue('custentity_ach_shipping_rate','CUSTRECORD_ACH_NETSUITE_VENDOR', null),

			"obj_adjusted_balance":"0",




			//"obj_last_invoice_date":"0"

			};

			floatMetricArray.push(floatMetricObj[vndrRs[i].getValue('custrecord_ach_netsuite_vendor')]);
		}
  
  
  
  
  
  
  


		var d = new Date();
  		var today = nlapiDateToString(d);
  		var daysToGoBack = nlapiAddDays(d, -18);


          //Purchase Order:Pending Receipt						PurchOrd:B
          //Purchase Order:Partially Received					PurchOrd:D
          //Purchase Order:Pending Billing/Partially Received	PurchOrd:E
          //Purchase Order:Pending Bill							PurchOrd:F

         var threshHoldFlt = [new nlobjSearchFilter('custentity_ach_prepaid_vendor', 'vendor', 'is', 'T'),
                      new nlobjSearchFilter('type', null, 'anyof', 'PurchOrd'),
                      new nlobjSearchFilter('mainline', null, 'is', 'F'),
                      new nlobjSearchFilter('custcol_ach_closed_to_bill', null, 'is', 'F'),
                      new nlobjSearchFilter('status', null, 'anyof', ['PurchOrd:B','PurchOrd:D','PurchOrd:E','PurchOrd:F']),
                      new nlobjSearchFilter('trandate', null, 'within', [daysToGoBack ,today])];

        var threshHoldCol = [new nlobjSearchColumn('internalid','vendor','group'),
                        	new nlobjSearchColumn('fxamount',null,'sum')];

        var threshHoldRs = nlapiSearchRecord('transaction', null, threshHoldFlt, threshHoldCol);  

        for (var a=0; threshHoldRs && a < threshHoldRs.length; a++)
        {
            if( floatMetricObj[threshHoldRs[a].getValue('internalid','vendor','group')])
            {
              	floatMetricObj[threshHoldRs[a].getValue('internalid','vendor','group')]['obj_threshold'] = threshHoldRs[a].getValue('fxamount',null,'sum');
            }
        }


  
  		//CLOSED TO BILL ORDERS
  
         var threshCTBFlt = [new nlobjSearchFilter('custentity_ach_prepaid_vendor', 'vendor', 'is', 'T'),
                      new nlobjSearchFilter('type', null, 'anyof', 'PurchOrd'),
                      new nlobjSearchFilter('mainline', null, 'is', 'F'),
                      new nlobjSearchFilter('custcol_ach_closed_to_bill', null, 'is', 'T'),
                      new nlobjSearchFilter('trandate', null, 'within', [daysToGoBack ,today])];

        var threshCTBCol = [new nlobjSearchColumn('internalid','vendor','group'),
                        	new nlobjSearchColumn('fxamount',null,'sum')];

        var threshCTBRs = nlapiSearchRecord('transaction', null, threshCTBFlt, threshCTBCol);  

        for (var a=0; threshCTBRs && a < threshCTBRs.length; a++)
        {
            if( floatMetricObj[threshCTBRs[a].getValue('internalid','vendor','group')])
            {
              	floatMetricObj[threshCTBRs[a].getValue('internalid','vendor','group')]['obj_threshold_closedToBill'] = threshCTBRs[a].getValue('fxamount',null,'sum');
            }
        }
  
  
  
  
  
		//Search for ALL BILLED PURCHASE ORDERS by Vendor
		//-------------------------------------------------------------------------------------------------------------------------------------------------------------

          var billedPoRs = nlapiSearchRecord("purchaseorder",null,
                                                               [
                              ['vendor.custentity_ach_prepaid_vendor','is','T'], 
                              'AND', 
                              ['type','anyof','PurchOrd'], 
                              'AND', 
                              ['mainline','is','T'], 
                              'AND', 
                              ['status','anyof','PurchOrd:G'], 
                              //'AND', 
                              //['status','noneof','PurchOrd:A','PurchOrd:B','PurchOrd:C','PurchOrd:D','PurchOrd:E','PurchOrd:F'], 
                              'AND', 
                              ['custbody_ach_exclude_fr_float_balance','is','F']
                            ],
                                                               [
                              new nlobjSearchColumn('internalid','vendor','GROUP'), 
                              new nlobjSearchColumn('entityid','vendor','GROUP').setSort(false), 
                              new nlobjSearchColumn('amount',null,'SUM'), 
                              new nlobjSearchColumn('fxamount',null,'SUM'), 
                              new nlobjSearchColumn('currency',null,'GROUP')
                            ]
                            );


        for (var a=0; billedPoRs && a < billedPoRs.length; a++)
        {
            if( floatMetricObj[billedPoRs[a].getValue('internalid','vendor','group')])
            {
              	floatMetricObj[billedPoRs[a].getValue('internalid','vendor','group')]['obj_billed_po_amount'] = billedPoRs[a].getValue('fxamount',null,'sum');
            }
        }


        var closedToBill = nlapiSearchRecord('purchaseorder',null,
        [
           ['vendor.custentity_ach_prepaid_vendor','is','T'], 
           'AND', 
           ['type','anyof','PurchOrd'], 
           'AND', 
           ['mainline','any',''], 
           'AND', 
           ['custbody_ach_exclude_fr_float_balance','is','F'], 
           'AND', 
           ['systemnotes.newvalue','is','Closed'], 
           'AND', 
           ['systemnotes.name','noneof','27925792'], 
           'AND', 
           ['custcol_ach_closed_to_bill','is','T']
        ], 
        [
           new nlobjSearchColumn('internalid','vendor','GROUP'), 
           new nlobjSearchColumn('entityid','vendor','GROUP').setSort(false), 
           new nlobjSearchColumn('amount',null,'SUM'), 
           new nlobjSearchColumn('fxamount',null,'SUM'), 
           new nlobjSearchColumn('currency',null,'GROUP')
        ]
        );

        for (var a=0; closedToBill && a < closedToBill.length; a++)
        {
            if( floatMetricObj[closedToBill[a].getValue('internalid','vendor','group')])
            {
              	floatMetricObj[closedToBill[a].getValue('internalid','vendor','group')]['obj_closedtobill_po_amount'] = closedToBill[a].getValue('fxamount',null,'sum');
            }
        }


        var unBilledPoRs = nlapiSearchRecord('purchaseorder',null,
        [
           ['vendor.custentity_ach_prepaid_vendor','is','T'], 
           'AND', 
           ['type','anyof','PurchOrd'], 
           'AND', 
           ['mainline','is','T'], 
           'AND', 
           ['status','anyof','PurchOrd:A','PurchOrd:B','PurchOrd:C','PurchOrd:D','PurchOrd:E','PurchOrd:F','PurchOrd:P'], 
           'AND', 
           ['custbody_ach_exclude_fr_float_balance','is','F']
        ], 
        [
           new nlobjSearchColumn('internalid','vendor','GROUP'), 
           new nlobjSearchColumn('entityid','vendor','GROUP').setSort(false), 
           new nlobjSearchColumn('amount',null,'SUM'), 
           new nlobjSearchColumn('fxamount',null,'SUM'), 
           new nlobjSearchColumn('currency',null,'GROUP')
        ]
        );  
  
  
  

        for (var a=0; unBilledPoRs && a < unBilledPoRs.length; a++)
        {
            if( floatMetricObj[unBilledPoRs[a].getValue('internalid','vendor','group')])
            {
              	floatMetricObj[unBilledPoRs[a].getValue('internalid','vendor','group')]['obj_unbilled_po_amount'] = unBilledPoRs[a].getValue('fxamount',null,'sum');
            }
        }



		//Search for the account balances and  thresholds associatted to the vendor
		//-------------------------------------------------------------------------------------------------------------------------------------------------------------

         var accFlt = [new nlobjSearchFilter('custrecord_ach_netsuite_vendor', null, 'noneof', '@NONE@')];

        var accCol = [new nlobjSearchColumn("custrecord_ach_netsuite_vendor").setSort(false),
           			  new nlobjSearchColumn("internalid"), 
           			  new nlobjSearchColumn("balance"), 
           			  new nlobjSearchColumn("custrecord_ach_balancethreshold")];

        var accRs = nlapiSearchRecord('account', null, accFlt, accCol);

        for (var a=0; accRs && a < accRs.length; a++)
        {
            if( floatMetricObj[accRs[a].getValue('custrecord_ach_netsuite_vendor')])
            {
              	floatMetricObj[accRs[a].getValue('custrecord_ach_netsuite_vendor')]['obj_floatbalance'] = accRs[a].getValue('balance');
            }
        }



		//Search for  ADJUSTMENTS on VENDOR BILLS associatted to the vendor
		//-------------------------------------------------------------------------------------------------------------------------------------------------------------

         var vndbFlt = [new nlobjSearchFilter('custentity_ach_prepaid_vendor', 'vendor', 'is', 'T'),
                       new nlobjSearchFilter('type', null, 'anyof', ['VendBill']),
                       new nlobjSearchFilter('mainline', null, 'is', 'F'),
                       new nlobjSearchFilter('status', null, 'noneof', ['VendBill:C', 'VendBill:E']),
                       new nlobjSearchFilter('custbody_ach_exclude_fr_float_balance', null, 'is', 'F'),
                       new nlobjSearchFilter('account', null, 'anyof', ['578','277','278','429','873','882','901','903'])];

        var vndbCol = [new nlobjSearchColumn('internalid','vendor','group'), 
                       new nlobjSearchColumn('entityid','vendor','group'), 
                       new nlobjSearchColumn('amount',null,'sum'), 
                       new nlobjSearchColumn('fxamount',null,'sum'), 
                       new nlobjSearchColumn('currency',null,'group')];  

        var vndbRs = nlapiSearchRecord('transaction', null, vndbFlt, vndbCol);  


        for (var b=0; vndbRs && b < vndbRs.length; b++)
        {
            if( floatMetricObj[vndbRs[b].getValue('internalid','vendor','group')])
            {
              	floatMetricObj[vndbRs[b].getValue('internalid','vendor','group')]['obj_fx_exp_amount'] = vndbRs[b].getValue('fxamount',null,'sum');
            }
        }


		//Search for REPLENISHMENT AMOUNTS associatted to the vendor
		//-------------------------------------------------------------------------------------------------------------------------------------------------------------

         var rplmFlt = [new nlobjSearchFilter('custrecord_ach_netsuite_vendor', 'account', 'noneof', '@NONE@'),
                       new nlobjSearchFilter('type', null, 'anyof', ['Transfer'])];


        var rplmCol = [new nlobjSearchColumn('custrecord_ach_netsuite_vendor','account','group'), 
                       new nlobjSearchColumn('amount',null,'sum'),
                       new nlobjSearchColumn('fxamount',null,'sum')];

        var rplmRs = nlapiSearchRecord('transaction', null, rplmFlt, rplmCol);


        for (var b=0; rplmRs && b < rplmRs.length; b++)
        {
            if( floatMetricObj[rplmRs[b].getValue('custrecord_ach_netsuite_vendor','account','group')])
            {
              	floatMetricObj[rplmRs[b].getValue('custrecord_ach_netsuite_vendor','account','group')]['obj_total_replenish_amnt'] = rplmRs[b].getValue('fxamount',null,'sum');
            }
        }


		//Search for LAST REPLENISH DATE associatted to the vendor
		//-------------------------------------------------------------------------------------------------------------------------------------------------------------

         var lstrRplmDateFlt = [new nlobjSearchFilter('custrecord_ach_netsuite_vendor', 'account', 'noneof', '@NONE@'),
                       new nlobjSearchFilter('type', null, 'anyof', ['Transfer'])];

        var lstrRplmDateCol = [new nlobjSearchColumn('custrecord_ach_netsuite_vendor','account','group'), 
                       		   new nlobjSearchColumn('trandate',null,'max')];

        var lstrRplmDateRs = nlapiSearchRecord('transaction', null, lstrRplmDateFlt, lstrRplmDateCol);

        for (var b=0; lstrRplmDateRs && b < lstrRplmDateRs.length; b++)
        {

            if(floatMetricObj[lstrRplmDateRs[b].getValue('custrecord_ach_netsuite_vendor','account','group')])
            {
              	floatMetricObj[lstrRplmDateRs[b].getValue('custrecord_ach_netsuite_vendor','account','group')]['obj_last_replenish_date'] = lstrRplmDateRs[b].getValue('trandate',null,'max');

            }


        }

          var jSonAddTo = '{"addToReplnsh":['+
          '{"vendorId":"4686851", "addAmnt": "197258690.00"},'+ 		//RT-El Kiosco Del Regalo
          '{"vendorId":"8672324", "addAmnt": "111874.96"},'+			//RT-ShopCourts_TT
          '{"vendorId":"8627845", "addAmnt":"24338.68"},'+				//RT-ShopCourts_BB
          '{"vendorId":"8382325", "addAmnt":"806.46"},'+				//RT-ShopCourts_GD
          '{"vendorId":"8381827", "addAmnt":"7000.00"},'+				//RT-ShopCourts_BZ
          '{"vendorId":"8382519", "addAmnt":"1612.92"},'+				//RT-ShopCourts_DM
          '{"vendorId":"8383319", "addAmnt":"2778636.74"},'+			//RT-ShopCourts_JM
          '{"vendorId":"2234801", "addAmnt":"1149757.78"},'+			//RT-KargoCard
          '{"vendorId":"1410309", "addAmnt":"37000.00"},'+				//RT-Retailo
          '{"vendorId":"10759961", "addAmnt":"6297300.00"},'+			//RT-Zonacards - CO
          '{"vendorId":"7329602", "addAmnt":"9242.10"},'+				//RT-Zonacards - PE
          '{"vendorId":"18289073", "addAmnt":"21739130.00"},'+			//RT-Zonacards - CL
          '{"vendorId":"8479430", "addAmnt":"5239466.97"},'+			//RT-Linio_MX
          '{"vendorId":"8479925", "addAmnt":"33473780.00"},'+			//RT-Linio_CL
          '{"vendorId":"10834567", "addAmnt":"3292.00"},'+				//RT-Linio_PE
          '{"vendorId":"14331173", "addAmnt":"17568.00"},'+				//RT-Linio_AR
          '{"vendorId":"11660275", "addAmnt":"29411764.00"}]}';			//RT-Linio_CO


 		var myAddObj =  JSON.parse(jSonAddTo); 



        for (i = 0; i < myAddObj.addToReplnsh.length; i++) 
        {

            if(floatMetricObj[myAddObj.addToReplnsh[i].vendorId])
            {
              	floatMetricObj[myAddObj.addToReplnsh[i].vendorId]['obj_addition_to_replenish_amnt'] = myAddObj.addToReplnsh[i].addAmnt;

            }

      	}


          var journalEntryAdd = nlapiSearchRecord('journalentry',null,
          [
             ['type','anyof','Journal'], 
             'AND', 
             ['account.custrecord_ach_netsuite_vendor','noneof','@NONE@'], 
             'AND', 
             ['custbody_ach_includeonreplenish','is','T']
          ], 
          [
             new nlobjSearchColumn('custrecord_ach_netsuite_vendor','account','group'), 
             new nlobjSearchColumn('fxamount',null,'sum')
          ]
          );


        for (var i=0; journalEntryAdd && i < journalEntryAdd.length; i++)
        {

            if(floatMetricObj[journalEntryAdd[i].getValue('custrecord_ach_netsuite_vendor','account','group')])
            {
              	floatMetricObj[journalEntryAdd[i].getValue('custrecord_ach_netsuite_vendor','account','group')]['obj_journal_add_to_replenish_amnt'] = journalEntryAdd[i].getValue('fxamount',null,'sum');

            }

      	}


 		function compare(a,b) {
		  if (a.obj_vendor < b.obj_vendor)
			return -1;
		  if (a.obj_vendor > b.obj_vendor)
			return 1;
		  return 0;
		}

		floatMetricArray.sort(compare);

  		nsform.addFieldGroup('grpa', 'Filter Options', null);

		var dlbtn = nsform.addButton('custpage_dlbtn', 'Download CSV', 'downloadCsv()');  

  		//nlapiLogExecution('ERROR','JSON', JSON.stringify(floatMetricArray));

        var fltdata = nsform.addSubList('custpage_fltdata', 'list', 'Float Balances', null);

        fltdata.addField('fm_vendor', 'text','<div align="left">Vendor', null).setDisplayType('inline');
        fltdata.addField('fm_currency','text','<div align="left">Vendor Currency', null).setDisplayType('inline');
        fltdata.addField('fm_current_balance','text','<div align="center">Curent Float <br/> Balance', null).setDisplayType('inline');

        fltdata.addField('fm_threshold','text','<div align="left">Threshold', null).setDisplayType('inline'); 

  
        //fltdata.addField('fm_subtraction_to_replenish_amnt','text','<div style="width:75px;" align="center"> Replenish Subtraction <br/> Amount', null).setDisplayType('inline');   
 
  
        fltdata.addField('fm_total_replenish_amnt','text','<div style="width:75px;" align="center">Total Replenish <br/> Amounts', null).setDisplayType('inline'); 
        fltdata.addField('fm_last_replenish_date','text','<div style="width:50px;" align="center">Last Replenish Date', null).setDisplayType('inline');  

        fltdata.addField('fm_billed_po_amount','text','<div style="width:75px;" align="center">Fully Billed Purchase Orders ', null).setDisplayType('inline');

        fltdata.addField('fm_closedtobill_po_amount','text','<div style="width:75px;" align="center">Closed To Bill  <br/>Purchase Orders ', null).setDisplayType('inline');  

        fltdata.addField('fm_unbilled_po_amount','text','<div style="width:75px;" align="center">Unbilled Purchase Orders', null).setDisplayType('inline');

        fltdata.addField('fm_usd_exp_amount','text','<div style="width:75px;" align="center">Adjustments', null).setDisplayType('inline');

  		fltdata.addField('fm_estimated_shipping','text','<div style="width:75px;" align="center">Estimated Shipping', null).setDisplayType('normal');

        fltdata.addField('fm_adjusted_balance','text','<div style="width:75px;" align="center">Estimated Float <br/> Balance', null).setDisplayType('inline');
  
        fltdata.addField('fm_usd_adjusted_balance','text','<div style="width:75px;" align="center">Estimated Float<br/> Balance (USD) ', null).setDisplayType('inline');
  
  
  
          //Variable kept in place in case of Download
          var csvHeader = '" "\n';
          csvHeader += '"Vendor","Vendor Currency","Curent Float Balance","Threshold","Total Replenish Amounts","Last Replenish Date","Fully Billed POs","Close To Bill POs","Unbilled POs","Adjustments","Est Shipping","Est Float","Est Float USD"\n';

          var	xlsBody = '';


          var ddBaseUrl = nlapiResolveURL(
            'SUITELET', 
            nlapiGetContext().getScriptId(), 
            nlapiGetContext().getDeploymentId(), 
            'VIEW'
          );

          var mline=1;


  		for (var obj=0; floatMetricArray && obj < floatMetricArray.length; obj++)
		{

          	var vendorLink = '<a href="https://1050077.app.netsuite.com/app/common/entity/vendor.nl?id='+floatMetricArray[obj].obj_id+
									'" target="_blank">'+
									floatMetricArray[obj].obj_vendor+
									'</a>';


          	var fxRate = nlapiExchangeRate(floatMetricArray[obj].obj_currencyid, '1', nlapiDateToString(new Date()));
          	var usdFxRate = nlapiExchangeRate('1', floatMetricArray[obj].obj_currencyid, nlapiDateToString(new Date()));


			var billedPoAmountDrillDownLink = formatCurrency(floatMetricArray[obj].obj_billed_po_amount,2,'.',',',',',false);

			if (parseInt(floatMetricArray[obj].obj_billed_po_amount) > 0 )
			{
				billedPoAmountDrillDownLink = '<a href="'+ddBaseUrl+
									'&drilltype=billedPoAmount'+
                  					'&vendor='+floatMetricArray[obj].obj_id+
									'" target="_blank">'+
									billedPoAmountDrillDownLink+
									'</a>';
			}

			var closedToBillPoAmountDrillDownLink = formatCurrency(floatMetricArray[obj].obj_closedtobill_po_amount,2,'.',',',',',false);

			if (parseInt(floatMetricArray[obj].obj_closedtobill_po_amount) > 0 )
			{
				closedToBillPoAmountDrillDownLink = '<a href="'+ddBaseUrl+
									'&drilltype=closedToBillPoAmount'+
                  					'&vendor='+floatMetricArray[obj].obj_id+
									'" target="_blank">'+
									closedToBillPoAmountDrillDownLink+
									'</a>';
			}


			var unbilledPoAmountDrillDownLink = formatCurrency(floatMetricArray[obj].obj_unbilled_po_amount,2,'.',',',',',false);

			if (parseInt(floatMetricArray[obj].obj_unbilled_po_amount) > 0 )
			{
				unbilledPoAmountDrillDownLink = '<a href="'+ddBaseUrl+
									'&drilltype=unbilledPoAmount'+
                  					'&vendor='+floatMetricArray[obj].obj_id+
									'" target="_blank">'+
									unbilledPoAmountDrillDownLink+
									'</a>';
			}


			var fxExpAmountDrillDownLink = formatCurrency(floatMetricArray[obj].obj_fx_exp_amount,2,'.',',',',',false);

			if (parseInt(floatMetricArray[obj].obj_fx_exp_amount) > 0 || parseInt(floatMetricArray[obj].obj_fx_exp_amount) < 0 )
			{
				fxExpAmountDrillDownLink = '<a href="'+ddBaseUrl+
									'&drilltype=usdExpAmpount'+
                  					'&vendor='+floatMetricArray[obj].obj_id+
									'" target="_blank">'+
									fxExpAmountDrillDownLink+
									'</a>';
			}



          	var replenishAmount = parseFloat(floatMetricArray[obj].obj_total_replenish_amnt).toFixed(2);
			var addToReplenish = parseFloat(floatMetricArray[obj].obj_addition_to_replenish_amnt).toFixed(2);
			var journalAddToReplenish = parseFloat(floatMetricArray[obj].obj_journal_add_to_replenish_amnt).toFixed(2);

          	var totalReplenish = +replenishAmount + +addToReplenish+ +journalAddToReplenish;

            if(floatMetricArray[obj].obj_id == '2234801') //Kargo Card Replenish Amnt multiply by .94 because it's inflated
            {
              totalReplenish = totalReplenish*.94;
            }

			var totalRplmntAmountDrillDownLink = formatCurrency(totalReplenish,2,'.',',',',',false);

			if (parseInt(floatMetricArray[obj].obj_total_replenish_amnt) > 0 )
			{
				totalRplmntAmountDrillDownLink = '<a href="'+ddBaseUrl+
									'&drilltype=totalReplenishAmpount'+
                  					'&vendor='+floatMetricArray[obj].obj_id+
									'" target="_blank">'+
									totalRplmntAmountDrillDownLink+
									'</a>';
			}



			fltdata.setLineItemValue('fm_vendor', mline, vendorLink);

			fltdata.setLineItemValue('fm_currency', mline, floatMetricArray[obj].obj_currency);

          	var exchanageAmnt = floatMetricArray[obj].obj_floatbalance / fxRate ;
			var averageOrders = +floatMetricArray[obj].obj_threshold+ +floatMetricArray[obj].obj_threshold_closedToBill;
            var estShipping = floatMetricArray[obj].obj_unbilled_po_amount *  floatMetricArray[obj].obj_shippingrate;

			if(exchanageAmnt <= averageOrders )
			{
				fltdata.setLineItemValue('fm_current_balance', mline, '<div style="color: white; width:100px; background:red" align="center">'+formatCurrency(exchanageAmnt,2,'.',',',',',false));
            }
          	else
            {
				fltdata.setLineItemValue('fm_current_balance', mline, '<div  style="width:100px;" align="center">'+formatCurrency(exchanageAmnt,2,'.',',',',',false));
            }


         	fltdata.setLineItemValue('fm_threshold', mline, '<div  style="width:100px;" align="center">'+formatCurrency(averageOrders,2,'.',',',',',false));


            var totalAmounts = +floatMetricArray[obj].obj_billed_po_amount+  +floatMetricArray[obj].obj_unbilled_po_amount+ +floatMetricArray[obj].obj_closedtobill_po_amount+ +floatMetricArray[obj].obj_fx_exp_amount+ +estShipping;
          	var adjustedBalance = totalReplenish - totalAmounts;
          
            fltdata.setLineItemValue('fm_total_replenish_amnt', mline, '<div style="background-color:#DCDCDC" align="center">'+totalRplmntAmountDrillDownLink);

          	fltdata.setLineItemValue('fm_last_replenish_date', mline, floatMetricArray[obj].obj_last_replenish_date);

            fltdata.setLineItemValue('fm_billed_po_amount', mline, '<div style="background-color:#DCDCDC;" align="center">'+billedPoAmountDrillDownLink);

            fltdata.setLineItemValue('fm_closedtobill_po_amount', mline, '<div style="background-color:#DCDCDC;" align="center">'+ closedToBillPoAmountDrillDownLink );          

            fltdata.setLineItemValue('fm_unbilled_po_amount', mline, '<div style="background-color:#DCDCDC;" align="center">'+unbilledPoAmountDrillDownLink);


          	fltdata.setLineItemValue('fm_usd_exp_amount', mline, '<div style="background-color:#DCDCDC" align="center">'+fxExpAmountDrillDownLink);


          	//fltdata.setLineItemValue('fm_subtraction_to_replenish_amnt', mline, '<div style="background-color:#DCDCDC" align="center">'+floatMetricArray[obj].obj_subtraction_fr_replenish_amnt);


          	fltdata.setLineItemValue('fm_estimated_shipping', mline, '<div style="width:100px;" align="center">'+formatCurrency(estShipping,2,'.',',',',',false));



            if(floatMetricArray[obj].obj_id == '2234801') //Kargo Card Replenish Amnt multiply by .94 because it's inflated
            {
              adjustedBalance = adjustedBalance*.95;
            }


          	if(adjustedBalance <= averageOrders )
			{
            	fltdata.setLineItemValue('fm_adjusted_balance', mline, '<div style="color: white; width:100px; background:red" align="center">'+formatCurrency(adjustedBalance,2,'.',',',',',false));              
            }
          	else
            {
            	fltdata.setLineItemValue('fm_adjusted_balance', mline, '<div style="width:100px;" align="center">'+formatCurrency(adjustedBalance,2,'.',',',',',false));
            }




          	if(adjustedBalance <= averageOrders )
			{
          		fltdata.setLineItemValue('fm_usd_adjusted_balance', mline, '<div style="color: white; width:100px; background:red" align="center">'+formatCurrency(adjustedBalance / usdFxRate ,2,'.',',',',',false));
            }
          	else
            {
          		fltdata.setLineItemValue('fm_usd_adjusted_balance', mline, '<div style="width:100px;" align="center">'+formatCurrency(adjustedBalance / usdFxRate ,2,'.',',',',',false));
            }



          xlsBody += '"'+floatMetricArray[obj].obj_vendor+'",'+
           	floatMetricArray[obj].obj_currency+','+

           	parseFloat(floatMetricArray[obj].obj_floatbalance / fxRate).toFixed(2)+','+
            parseFloat(averageOrders).toFixed(2)+','+

          	totalReplenish+','+
            floatMetricArray[obj].obj_last_replenish_date+','+

            floatMetricArray[obj].obj_billed_po_amount+','+
            floatMetricArray[obj].obj_closedtobill_po_amount+','+
            floatMetricArray[obj].obj_unbilled_po_amount+','+
            floatMetricArray[obj].obj_fx_exp_amount+','+

			estShipping+','+
            parseFloat(adjustedBalance).toFixed(2)+','+

            parseFloat(adjustedBalance / usdFxRate).toFixed(2)+'\n';


			mline +=1;
        }


  		//Generate Email to Logged in user if download is button is clicked
		if (req.getParameter('csvdownload') == 'Y' && xlsBody)
		{

			var xlsFileName = 'Float_Balance.csv';

			var	xlsFileObj = nlapiCreateFile(xlsFileName, 'CSV', csvHeader + xlsBody);

			//We are going to send it out as email
			nlapiSendEmail(
				29116069, 
				nlapiGetContext().getUser(),
				'Float Balance Report', 
				xlsFileName+' is attached as CSV File', 
				null, 
				null, 
				null, 
				xlsFileObj, 
				true, 
				null, 
				null

			);
			//At this point we are going to Redirect to THIS Suitelet without csvdownload parameter

			var rparam = {'custparam_msg':'Request to Download CSV Extract successfully processed and Emailed'};

			nlapiSetRedirectURL(
				'SUITELET', 
				nlapiGetContext().getScriptId(), 
				nlapiGetContext().getDeploymentId(), 
				'VIEW', 
				rparam
			);
		}//End Processing Download Request

  res.writePage(nsform);
  
  		var context = nlapiGetContext();
		nlapiLogExecution('error', 'remaining usage', context.getRemainingUsage());
  
			//We are going to send it out as email
			//
			 var userName = nlapiLookupField('employee', nlapiGetContext().getUser(), 'entityid', false);
			nlapiSendEmail(
				29116069, 
				'elijah@semalulu.com',
				'Float Balance Report was ran by '+ userName, 
				'TEST', 
				null, 
				null, 
				null, 
				null, 
				true, 
				null, 
				null  
              )
  
}


 function userAction(_fld, _action)
{
	if (_action == 'apply')
	{
		refreshWithFilter();
	}
	else if (_action == 'clear')
	{
		//assume _fld value is passed in
		nlapiSetFieldValue(_fld, '', true, true);
	}
}

//Moved out to be used by other functions
function refreshWithFilter()
{
	var smdSlUrl = nlapiResolveURL(
			'SUITELET', 
			'customscript_ach_sl_vendor_float_report', 
			'customdeploy_ach_sl_vendor_float_report', 
			'VIEW'
		   );

	//smdSlUrl +=	'&custpage_shipping='+nlapiGetFieldValue('custpage_shipping').toString();


	window.ischanged = true;
	window.location = smdSlUrl;
}


/*
function fieldChange(type, name, linenum)
{

        if (name == 'custpage_shipping')
        {
         	var strDate = nlapiStringToDate( nlapiGetFieldValue('custpage_shipping') );
			nlapiSetFieldValue('custpage_acshipping', '<br><button> <a href="#" style="text-decoration:none" onclick="userAction(\'custpage_shipping\',\'apply\')">Apply Shipping</a>');
        }


}
*/


function downloadCsv()
{

	var smdSlUrl = nlapiResolveURL(
			'SUITELET', 
			'customscript_ach_sl_vendor_float_report', 
			'customdeploy_ach_sl_vendor_float_report', 
			'VIEW'
		   );
	//smdSlUrl += '&custpage_shipping='+nlapiGetFieldValue('custpage_shipping').toString()+
	smdSlUrl +=	'&csvdownload=Y';
	window.ischanged = false;
	window.location = smdSlUrl;
}


