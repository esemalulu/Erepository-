function matrixItemPricingUpsate() 
{		
		
	//Parameter values are potentially dynamic variables that may change.
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct51_lastprocid');
    nlapiLogExecution( 'audit', 'paramLastProcId', paramLastProcId )
  
    var groupFilters = [new nlobjSearchFilter('isinactive',null,'is', 'F'), 
		                new nlobjSearchFilter('custrecord_prod_prc_grp',null,'noneof', '@NONE@'), 
                        new nlobjSearchFilter('custrecord_prod_prc_grp',null,'anyof', '519') // Chemical NonService Intercon : Chemical NonService Intercon	

                       ];	
	if (paramLastProcId)
	{
		//IF the search is sorted in ASC
		groupFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
	}			
   var groupColumns = [new nlobjSearchColumn('internalid',null,'GROUP').setSort(true),
                       new nlobjSearchColumn('custrecord_prod_prc_grp',null,'GROUP')]; 
	var matrixGroupSrch = nlapiSearchRecord ('customrecord_customer_item_pricing', null, groupFilters, groupColumns);	
			
	for (var i=0; matrixGroupSrch && i < matrixGroupSrch.length; i++)
	{		    

         var prodPriceGroupTxt = matrixGroupSrch[i].getText('custrecord_prod_prc_grp',null,'GROUP');
        var prodPriceGroupVal = matrixGroupSrch[i].getValue('custrecord_prod_prc_grp',null,'GROUP');

         nlapiLogExecution('error', 'Product Price Group', prodPriceGroupTxt);
         nlapiLogExecution('error', 'Product Price Group', prodPriceGroupVal);

		var matrixCustRecFilters = [new nlobjSearchFilter('isinactive',null,'is', 'F'), 
								    new nlobjSearchFilter('custrecord_prod_prc_grp',null,'is', prodPriceGroupVal)];	//  							 
		var matrixCustRecColumns = [new nlobjSearchColumn('internalid'),
                                    new nlobjSearchColumn('custrecord_prce_level_type'),
		                            new nlobjSearchColumn('custrecord_markup_percent'),
		                            new nlobjSearchColumn('custrecord_markup_dollar'),
		                            new nlobjSearchColumn('custrecord_matrix_status'),
		                            new nlobjSearchColumn('custrecord_refresh_interval')];			
		var matrixCustRecSrch = nlapiSearchRecord ('customrecord_customer_item_pricing', null, matrixCustRecFilters, matrixCustRecColumns);	

      
        for(var j=0; matrixCustRecSrch && j < matrixCustRecSrch.length; j++)
	    {
			 var custRecInteralId = matrixCustRecSrch[j].getValue('internalid');
			 nlapiLogExecution('debug', 'custRecInteralId ', custRecInteralId);
          
			 var priceLevType = matrixCustRecSrch[j].getValue('custrecord_prce_level_type');
          
			 var onSell = parseFloat(matrixCustRecSrch[j].getValue('custrecord_markup_percent')) / 100;
             onSell = onSell.toFixed(3)

			 var itemFilters = [new nlobjSearchFilter('isinactive',null,'is', 'F'), 
								new nlobjSearchFilter('pricinggroup',null,'is', prodPriceGroupVal ),   
								new nlobjSearchFilter('type', null, 'noneof', ['Description'])];			 
			 var itemColumns = [new nlobjSearchColumn('internalid'),
								new nlobjSearchColumn('custitem_item_market_cost'),
								new nlobjSearchColumn('custitem_item_burden_percent'),
								new nlobjSearchColumn('custitem_extra_handling_cost'),
								new nlobjSearchColumn('custitem_extra_handling_cost_2')];                                
			  var itemSrch = nlapiSearchRecord ('item', null, itemFilters, itemColumns);

              for (var k=0; itemSrch && k < itemSrch.length; k++)
	          {
                
                nlapiLogExecution('debug', 'Item Id ', itemSrch[k].getValue('internalid'));          
                nlapiLogExecution('debug', 'Cust Rec ID ', custRecInteralId);
                
                var marketCost = parseFloat(itemSrch[k].getValue('custitem_item_market_cost'));  //String
                marketCost = marketCost.toFixed(2);
                nlapiLogExecution('error', 'marketCost', marketCost);
//BURDEN----------------------------------------------------------------------------------              
                var burden = parseFloat(itemSrch[k].getValue('custitem_item_burden_percent')) / 100; 
                burden = burden.toFixed(3);
                nlapiLogExecution('error', 'burden', burden); 
                
                var extraHandling = 0.00;               
                if(parseFloat(itemSrch[k].getValue('custitem_extra_handling_cost')))
                {extraHandling = parseFloat(itemSrch[k].getValue('custitem_extra_handling_cost'))
                 extraHandling.toFixed(2)
                }
                nlapiLogExecution('error', 'extraHandling', extraHandling);
                
                var extraHandling2 = 0.00;
                if(parseFloat(itemSrch[k].getValue('custitem_extra_handling_cost_2')))
                {extraHandling2 = parseFloat(itemSrch[k].getValue('custitem_extra_handling_cost_2'))
                 extraHandling2.toFixed(2)
                }
                nlapiLogExecution('error', 'extraHandling2', extraHandling2);
               
                nlapiLogExecution('debug', 'OnSell ',  onSell);
                
                nlapiLogExecution('debug', 'Price Level Type ', priceLevType);  

//CALCULATIONS-------------------------------------------------------------------------------
                //((Market + (Market * Burden))+Extra Handling Cost #1 + Extra Handling Cost #2) / (1 – Onsell %). 
                
                var marketXburden = marketCost * burden;   
                marketXburden = parseFloat(marketXburden.toFixed(2)) 
                nlapiLogExecution('debug', 'marketXburden ',  marketXburden);

                var priceMatrix = parseFloat((parseFloat(marketCost) + parseFloat(marketXburden)) + extraHandling + extraHandling2 / (1-onSell));
                priceMatrix = priceMatrix.toFixed(2)
                nlapiLogExecution('debug', 'priceMatrix ',  priceMatrix);

                nlapiLogExecution('debug', 'START NEW ',  '-------------------------');


//UPDATE ITEM RECORD----------------------------------------------------------------------------

               var itemRec = nlapiLoadRecord(itemSrch[k].getRecordType(), itemSrch[k].getId());

                //pricelevel: '11', pricelevelname: 'Book Cost-4 Bronze'
                //pricelevel: '12', pricelevelname: 'Book Cost-3 Silver'
                //pricelevel: '13', pricelevelname: 'Book Cost-2 Gold'
                //pricelevel: '14', pricelevelname: 'Book Cost-1 Platinum'

                var lineNo = itemRec.findLineItemValue('price','pricelevel', priceLevType);    
                nlapiLogExecution('debug', 'lineNo',  lineNo);

                var PriceLvl = itemRec.getLineItemValue('price','pricelevel', lineNo); 
                
                if(PriceLvl == priceLevType)
                {
                  itemRec.setLineItemValue('price', 'price_1_', lineNo, '50.00');  
                }  
               
                nlapiSubmitRecord(itemRec, true, true);

 
			                    
              }

        }
      
			//Set % completed of script processing			
			var pctCompleted = Math.round(((i+1) / matrixGroupSrch.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
					
			//AFter each record is processed, you check to see if you need to reschedule
			if((i+1)==1 || ((i+1) < matrixGroupSrch.length && nlapiGetContext().getRemainingUsage() < 100)) 
			{
				//reschedule
				nlapiLogExecution('audit','Getting Rescheduled at', matrixGroupSrch[i].getValue('internalid',null,'GROUP'));				
              	var rparam = {'custscript_sct51_lastprocid':matrixGroupSrch[i].getValue('internalid',null,'GROUP')};
                nlapiLogExecution('audit', 'RPARAM', matrixGroupSrch[i].getValue('internalid',null,'GROUP'));
				//nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
		    //nlapiLogExecution('audit', 'Remainig Units', nlapiGetContext().getRemainingUsage())
      	    //nlapiLogExecution('audit', 'iterations', i)

	}
		
}
	


