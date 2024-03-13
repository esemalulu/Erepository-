/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Dec 2016     pkapse
 *
 */

var SCRIPT_SEARCH_CUSTOM_RECORD = 'custscript_search_start_end_date_rule_ss';

var SCRIPT_MIN_DATE = 'custscript_rev_start_end_min_date_ss';
var SCRIPT_MAX_DATE = 'custscript_rev_start_end_max_date_ss';
var SCRIPT_NO_DATE = 'custscript_rev_start_end_no_dates_ss';
var SCRIPT_SAME_DATE = 'custscript_rev_start_end_same_date_ss';
var SCRIPT_SAAS_MAX = 'custscript_rev_start_end_saas_max';
var SCRIPT_SAAS_MIN	= 'custscript_rev_start_end_saas_min';
var SCRIPT_SEARCH_SALES_ORDER = 'custscript_sales_order_search_ss';
var FIELD_STARTDATE = 'custcol_start_date_so_line';
var FIELD_ENDDATE = 'custcol_end_date_so_line';
var SCRIPT_PERPETUAL_ITEM = 'custscript_rev_start_end_perpetual_item';
var SCRIPT_SAAS_ITEM = 'custscript_rev_start_end_saas_item';
var SCRIPT_PROF_SERVICES = 'custscript_rev_start_end_ps';
var SCRIPT_SAAS_PS = 'custscript_rev_start_end_saas_ps';

var FIELD_SO_PROCESSED = 'custbody_rev_start_end_processed';

function scheduled_SetRevenueStartEndDate(type)
{
	var USAGE_LIMIT=1000; 
	var logTitle = 'scheduled__SetRevenueStartEndDate';
	nlapiLogExecution ('DEBUG', logTitle, '============Starting scheduled_Starting scheduled_==============' );
	
		
		var context = nlapiGetContext(); 
		var searchStartDateRule = context.getSetting('SCRIPT', SCRIPT_SEARCH_CUSTOM_RECORD);
		var minDateType = context.getSetting('SCRIPT', SCRIPT_MIN_DATE);
		var maxDateType = context.getSetting('SCRIPT', SCRIPT_MAX_DATE);
		var sameDateType = context.getSetting('SCRIPT', SCRIPT_SAME_DATE);
		var noDateType = context.getSetting('SCRIPT', SCRIPT_NO_DATE);
		var minSaasDate = context.getSetting('SCRIPT', SCRIPT_SAAS_MIN);
		var maxSaasDate = context.getSetting('SCRIPT', SCRIPT_SAAS_MAX);
		var searchSalesOrder = context.getSetting('SCRIPT', SCRIPT_SEARCH_SALES_ORDER);
		var itemPerpetual = context.getSetting('SCRIPT', SCRIPT_PERPETUAL_ITEM);
		var itemSaas = context.getSetting('SCRIPT', SCRIPT_SAAS_ITEM);
		var itemProfServices = context.getSetting('SCRIPT', SCRIPT_PROF_SERVICES);
		var itemSaasProfServices = context.getSetting('SCRIPT', SCRIPT_SAAS_PS);
		
		
		if(isEmpty(searchSalesOrder))
		{
			nlapiLogExecution('DEBUG',logTitle, 'The script parameter for Sales Order saved search is empty: searchSalesOrder: = '+ searchSalesOrder);
			return;
		}
		
		if(isEmpty(searchStartDateRule))
		{
			nlapiLogExecution('DEBUG',logTitle, 'The script parameter for saved search is empty: searchStartDateRule: = '+ searchStartDateRule);
			return;
		}
		
		nlapiLogExecution('DEBUG',logTitle,'minDateType:=' + minDateType + 
											'\nmaxDateType:=' + maxDateType + 
											'\nsameDateType:=' + sameDateType +
											'\nnoDateType:= ' + noDateType +
											'\nminSaasDate:=' + minSaasDate +
											'\nmaxSaasDate:=' + maxSaasDate +
											'\nitemPerpetual:=' + itemPerpetual +
											'\nitemSaas:=' + itemSaas +
											'\nitemProfServices:=' + itemProfServices +
											'\nitemSaasProfServices:=' + itemSaasProfServices);
		
		var salesOrderResults = NSUtils.search('transaction', searchSalesOrder);
	
		if (salesOrderResults == null)
			{
			nlapiLogExecution('DEBUG',logTitle, 'The Sales Orders to process - result is empty');
			return;
			
			}
		
	
		var revStartDateResults = nlapiSearchRecord('customrecord_rev_start_end_rule', searchStartDateRule);
		
		if (revStartDateResults == null)
			{
			nlapiLogExecution('DEBUG',logTitle, 'The Revenue Start End Date rules search result is empty');
			return;
			
			}
		//***********************************************************
		  for ( var i = 0; revStartDateResults != null && i < revStartDateResults.length; i++ )
 		  {
 		     var res = revStartDateResults[i];
 		     var listValue = (res.getValue('custrecord_item_rev_category'));
 		     //var listID = (res.getValue('internalId'));
 		     nlapiLogExecution('DEBUG', 'custrecord_item_rev_category' ,listValue);
 		  } 
		//***********************************************************
		for(var n = 0; n < salesOrderResults.length; n++)
		{
			
			var intCurrentUsage = nlapiGetContext().getRemainingUsage();
	        
		    if (intCurrentUsage <= USAGE_LIMIT)
		    { 
		    	nlapiYieldScript();
		    }
	
			var idSO = salesOrderResults[n].getValue('internalid', null, 'group');
   
			nlapiLogExecution('DEBUG', logTitle,'idSO: '+ idSO );

			var recSO = nlapiLoadRecord('salesorder',idSO);
	
			var stOverrideChk = recSO.getFieldValue('custbody_override_chk');
		
			if(stOverrideChk == 'T')
			{
				nlapiLogExecution('DEBUG',logTitle,  'stOverrideChk:= '+ stOverrideChk +'The Override check box is set. Exiting...');
				return;
			}
			
			var stSOLineCount = recSO.getLineItemCount('item');
		
			nlapiLogExecution('DEBUG',logTitle, 'The Revenue Start End Date rules search result length := '+ revStartDateResults.length + '\nstSOLineCount:= ' + stSOLineCount);
		
			var objStartDate = [];
			var objEndDate = [];
		
			var objSaasStartDate = [];
			var objSaasEndDate = [];
			
			
			var index = 0;
			var isStartDateExist = '';
			var isEndDateExist = '';
			var arrMinMaxLines = [];
			var arrSaasMinMaxLines = [];
			
			var isSaasStartDateExist = '';
			var isSaasEndDateExist = '';
			
			var isPerpetualFlg = '';
			var isSaasFlg = '';
			
			var isSameLicPSFlg = '';
			var isOtherMinMax = '';

			var isNXPIVMMigration = checkNXPIVMMigration(recSO);
		
			for (var i=1; i<=stSOLineCount; i++) 
			{
				var lineItemCategory = '';
				var armBookingCategory = '';
				
				var itemType = recSO.getLineItemValue('item', 'itemtype', i);
				
				if(itemType ==  'EndGroup' || itemType == 'Discount' || itemType == 'Description' || itemType == 'Subtotal')
				{
			
					continue;
				}

				var itemId = recSO.getLineItemValue('item', 'item', i);
				var itemQty = recSO.getLineItemValue('item', 'quantity', i);

				if(isNXPIVMMigration && itemId == 7555 && itemQty <= 0) {
					continue;
				}
				
				var revStartDate = recSO.getLineItemValue('item',FIELD_STARTDATE, i);
				var revEndDate = recSO.getLineItemValue('item',FIELD_ENDDATE, i);
				
				if(!isEmpty(revStartDate) && !isEmpty(revEndDate))
					{
					nlapiLogExecution('DEBUG',logTitle,"Revenue Start and End date is not empty");
					
//					continue;
					 
					}
				
				lineItemCategory = recSO.getLineItemValue('item', 'custcol_r7_item_rev_category', i);
				armBookingCategory =  recSO.getLineItemValue('item', 'custcol_besp_revenue_category',i);
								
				if(isEmpty(lineItemCategory) )
					{
					var columns = nlapiLookupField('item', itemId, ['itemrevenuecategory', 'custitemr7categorybookingssalesdept']);
					lineItemCategory = columns.itemrevenuecategory;
					
					}
				
				
				if(lineItemCategory == itemPerpetual )
				{
					isPerpetualFlg = 'T';
				}else if(lineItemCategory == itemSaas)
				 {
					isSaasFlg ='T';
				 }
				
				
				nlapiLogExecution('DEBUG',logTitle,'lineItemCategory:=' + lineItemCategory +
													'\nisPerpetualFlg:=' + isPerpetualFlg +
													'\nisSaasFlg:='+ isSaasFlg 
													);
				
				var licStartDate = (recSO.getLineItemValue('item','custcolr7startdate',i)== null) ? "" :recSO.getLineItemValue('item','custcolr7startdate',i);
				var licEndDate = (recSO.getLineItemValue('item','custcolr7enddate',i)== null) ? "" :recSO.getLineItemValue('item','custcolr7enddate',i);
	    	
   				nlapiLogExecution('DEBUG',logTitle, 'lineItemCategory:= ' + lineItemCategory 
   													+ '\nlicStartDate:= ' + licStartDate 
   													+ '\nlicEndDate:=' + licEndDate );

				
				for (var j=0; j<revStartDateResults.length; j++)
				{
					var ruleItemCategory = revStartDateResults[j].getValue('custrecord_item_rev_category');
					if(lineItemCategory == ruleItemCategory) 
					{
						var ruleStartDate = revStartDateResults[j].getValue('custrecord_start_date');	
						var ruleEndDate = revStartDateResults[j].getValue('custrecord_end_date');
						nlapiLogExecution('DEBUG',logTitle,'ruleStartDate:= ' + ruleStartDate 
															+'\nruleEndDate:= ' + ruleEndDate 
															+ '\nruleItemCategory= ' + ruleItemCategory 
															+'lineItemCategory:= ' + lineItemCategory  );
	    			
    		
						// If it is Min and Max
						if(ruleStartDate == minDateType && ruleEndDate == maxDateType)
						{
							arrMinMaxLines.push(i);
							
							if(lineItemCategory != itemPerpetual &&  lineItemCategory != itemProfServices)
							{
								isOtherMinMax = 'T';
							}
								    			
							nlapiLogExecution('DEBUG',logTitle, 'Inside if Rule Min/Max' + JSON.stringify([arrMinMaxLines]));
	    			
					if(licStartDate != '')	
	    			  {
						
						if( objStartDate.length == 0 )
						{
//	    					objStartDate[0].itemCategory = lineItemCategory;
//	    					objStartDate[0].startDate = licStartDate;
							
							nlapiLogExecution('DEBUG',logTitle,'objStartDate.length is 0, saving licStartDate:= ' +licStartDate);
							objStartDate.push({
	    						itemCategory:lineItemCategory,
	    						armBookingCategory:armBookingCategory,
	    						startDate: licStartDate
	    					});
	    				
	    				    				
						}
						else
						{
	    				  for(var len = 0 ; len< objStartDate.length ; len ++ )
	    				  {
//	    				      if((objStartDate[len].itemCategory == lineItemCategory) && (objStartDate[len].armBookingCategory == armBookingCategory))

	    				    	   isStartDateExist = true;
	    				    	   nlapiLogExecution('DEBUG',logTitle,'isStartDateExist exists in the array' + '\nobjStartDate[len].startDate:=' + objStartDate[len].startDate );
	    				    	   
	    				    	   var dtStartdate = nlapiStringToDate(objStartDate[len].startDate);
	    				    	   
	    				    	      if(dtStartdate.getTime() > nlapiStringToDate(licStartDate).getTime())
	    				    	      {
	    				    	    	  objStartDate[len].startDate = licStartDate;
	    				    	    	  
	    				    	    	}
	    				    	      break;
	    				    	  
	    				  
	    				  	}
	    				  	if(isStartDateExist == false)
	    				  	{
//	    						var lastIndex = objStartDate.length;
	    					   
//	  	    					objStartDate[lastIndex].itemCategory = lineItemCategory;
//		    					objStartDate[lastIndex].startDate = licStartDate;
	    					  
	    				  		objStartDate.push({
	    				  			itemCategory:lineItemCategory,
	    				  			armBookingCategory : armBookingCategory,
	    				  			startDate: licStartDate
	    				  		});  
	    					  
	    					  
	    				  	}
	    		  
						}
	    			  }// end of min start date
						
						if(licEndDate != '')
						{
						if( objEndDate.length == 0)
						{
//	    					objEndDate[0].itemCategory = lineItemCategory;
//	    					objEndDate[0].endDate = licEndDate;
	    				
							objEndDate.push({
								itemCategory:lineItemCategory,
								armBookingCategory:armBookingCategory,
								endDate: licEndDate
							});
    					
						}
						else
						{
	    				  for(var length = 0 ; length< objEndDate.length ; length ++ )
	    				  {
//	    				       if((objEndDate[length].itemCategory == lineItemCategory) && (objEndDate[length].armBookingCategory == armBookingCategory))

	    				    	   isEndDateExist = true;
	    				    	   nlapiLogExecution('DEBUG',logTitle,'EndDate exists in the array'+ '\nobjEndDate[length].endDate' + objEndDate[length].endDate );
	    				    	   
	    				    	   var dtEnddate = nlapiStringToDate(objEndDate[length].endDate);
	    				    	      if(dtEnddate.getTime() < nlapiStringToDate(licEndDate).getTime())
	    				    	      {
	    				    	    	  
	    				    	    	  objEndDate[length].endDate = licEndDate;
	    				    	    	  
	    				    	    	  nlapiLogExecution('DEBUG',logTitle,'Saving End Date in array as := ' + licEndDate);
	    				    	    	}
	    				    	      break;
	    				    	  
	    				  
	    				  }
	    				  if(isEndDateExist == false)
	    				  {
//	    					var lastIndex = objEndDate.length;
	    					   
//	    					objEndDate[lastIndex].itemCategory = lineItemCategory;
//	    					objEndDate[lastIndex].endDate = licEndDate;
	    					
		    				objEndDate.push({
	    						itemCategory:lineItemCategory,
	    						armBookingCategory: armBookingCategory,
	    						endDate: licEndDate
		    				});
	    					
	    					
	    					
	    					}
	    				    				  
	    			}
					}	
	    			nlapiLogExecution('DEBUG',logTitle, '\nline with Min/Max:= ' + i );
	    			
	    			
	 
	    		} // End of Min/Max Rule
	    		
						
						
						// If it is SaaS Min and SaaS Max
//						if(ruleStartDate == minSaasDate && ruleEndDate == maxSaasDate)
						if(lineItemCategory == itemSaas)
						{
							arrSaasMinMaxLines.push(i);
	    			
							nlapiLogExecution('DEBUG',logTitle, 'Inside loop if Saas Item' + JSON.stringify([arrSaasMinMaxLines]));
						if(licStartDate != '')	
			    		{	    			
	    			  
						if( objSaasStartDate.length == 0)
						{
//	    					objSaasStartDate[0].itemCategory = lineItemCategory;
//	    					objSaasStartDate[0].startDate = licStartDate;
							
							nlapiLogExecution('DEBUG',logTitle,'objSaasStartDate.length is 0');
							objSaasStartDate.push({
	    						itemCategory:lineItemCategory,
	    						armBookingCategory:armBookingCategory,
	    						startDate: licStartDate
	    					});
	    				
	    				    				
						}
						else
						{
	    				  for(var len = 0 ; len< objSaasStartDate.length ; len ++ )
	    				  {

	    				    	   isSaasStartDateExist = true;
	    				    	   nlapiLogExecution('DEBUG',logTitle,'isSaasStartDateExist exists in the array' + '\nobjSaasStartDate[len].startDate:=' + objSaasStartDate[len].startDate );
	    				    	   
	    				    	   var dtStartdate = nlapiStringToDate(objSaasStartDate[len].startDate);
	    				    	   
	    				    	      if(dtStartdate.getTime() > nlapiStringToDate(licStartDate).getTime())
	    				    	      {
	    				    	    	  objSaasStartDate[len].startDate = licStartDate;
	    				    	    	  
	    				    	      }
	    				    	      break;
	    				    	   
	    				  
	    				  	}
	    				  	if(isSaasStartDateExist == false)
	    				  	{
//	    						var lastIndex = objSaasStartDate.length;
	    					   
//	  	    					objSaasStartDate[lastIndex].itemCategory = lineItemCategory;
//		    					objSaasStartDate[lastIndex].startDate = licStartDate;
	    					  
	    				  		objSaasStartDate.push({
	    				  			itemCategory:lineItemCategory,
	    				  			armBookingCategory : armBookingCategory,
	    				  			startDate: licStartDate
	    				  		});  
	    					  
	    					  
	    				  	}
	    		  
						}
			    	}
						if(licEndDate != '')
						{						
						
						if( objSaasEndDate.length == 0)
						{
//	    					objSaasEndDate[0].itemCategory = lineItemCategory;
//	    					objSaasEndDate[0].endDate = licEndDate;
	    				
							objSaasEndDate.push({
								itemCategory:lineItemCategory,
								armBookingCategory:armBookingCategory,
								endDate: licEndDate
							});
    					
						}
						else
						{
	    				  for(var length = 0 ; length< objSaasEndDate.length ; length ++ )
	    				  {

	    				    	   isSaasEndDateExist = true;
	    				    	   nlapiLogExecution('DEBUG',logTitle,'SaaS EndDate exists in the array'+ '\nobjSaasEndDate[length].endDate' + objSaasEndDate[length].endDate );
	    				    	   
	    				    	   var dtEnddate = nlapiStringToDate(objSaasEndDate[length].endDate);
	    				    	      if(dtEnddate.getTime() < nlapiStringToDate(licEndDate).getTime())
	    				    	      {
	    				    	    	  objSaasEndDate[length].endDate = licEndDate;
	    				    	    	  
	    				    	    	  nlapiLogExecution('DEBUG',logTitle,'Saving SaaS End Date in array as := ' + licEndDate);
	    				    	      }
	    				    	      break;
	    				    	  
	    				  
	    				  }
	    				  if(isSaasEndDateExist == false)
	    				  {
//	    					var lastIndex = objSaasEndDate.length;
	    					   
//	    					objSaasEndDate[lastIndex].itemCategory = lineItemCategory;
//	    					objSaasEndDate[lastIndex].endDate = licEndDate;
	    					
		    				objSaasEndDate.push({
	    						itemCategory:lineItemCategory,
	    						armBookingCategory: armBookingCategory,
	    						endDate: licEndDate
		    				});
 					
	    					}
	    				    				  
						}
					}
	    			
	    			nlapiLogExecution('DEBUG',logTitle, '\nline with SaaS items:= ' + i );
	    			
	    			
	 
	    		}// End of SaaS Min and SaaS Max		
						
						
						
	    		// Same Dates
	    		if(ruleStartDate == sameDateType && ruleEndDate == sameDateType)
	    		{
	    			
	    			if(lineItemCategory == itemProfServices )
	    			{
	    				isSameLicPSFlg = 'T';
	    			}	
	    			
	    			nlapiLogExecution('DEBUG',logTitle,'Same Dates: ruleStartDate:= ' + ruleStartDate +'\nruleEndDate:= ' + ruleEndDate );
	    			recSO.setLineItemValue('item','custcol_start_date_so_line',i,licStartDate);
	    			recSO.setLineItemValue('item','custcol_end_date_so_line',i,licEndDate);
	    		}
	    		
	    		// No Dates do nothing.
	    		if(ruleStartDate == noDateType && ruleEndDate == noDateType)
	    		{
	    			nlapiLogExecution('DEBUG',logTitle,'Rule Type: No dates');
	    			
	    		}
	    		
	    	}// End loop through custom records matching item category
	    		
	    }	// End loop of custom record search results
	    	
	    	isStartDateExist = false;
	    	isEndDateExist = false;
	    	
	    	

	    }// End for loop for line items
			
			
			
			
	
	    // Set the Min/Max,  Saas Min/Max Dates. dates for PS items on the SO Lines
	    
	    for (var k=1; k<=stSOLineCount; k++) 
	    {
		    	
	    	
	    	for(var l = 0; l < arrMinMaxLines.length ; l++)
	    	{
	    		if( k== arrMinMaxLines[l])
	    		{
	    			for(var len = 0 ; len< objStartDate.length ; len ++ )
  				  	{
  				    	 nlapiLogExecution('DEBUG',logTitle, 'Setting start date : = '+ objStartDate[len].startDate +' for line: = ' + k);
   				    	 recSO.setLineItemValue('item','custcol_start_date_so_line',k, objStartDate[len].startDate );
 			    
  				  	}
	    			
	    			for(var length = 0 ; length< objEndDate.length ; length ++ )
  				  	{
	    				nlapiLogExecution('DEBUG',logTitle, 'Setting end date : = '+ objEndDate[length].endDate +' for line : = ' + k);
  				    	recSO.setLineItemValue('item','custcol_end_date_so_line',k, objEndDate[length].endDate );
  					
  				  	}
	    				    			
	    		}
	    			    		
	    	}
	    	
	    // end of for loop for item lines	
	    
	    
/*	    
	    for (var n=1; n<=stSOLineCount; n++) 
	    {
	    
	    	for(var m = 0; m < arrSaasMinMaxLines.length ; m++)
	    	{
	    		if( n== arrSaasMinMaxLines[m])
	    		{

    			for(var len = 0 ; len< objSaasStartDate.length ; len ++ )
  				  	{
	    			
    					nlapiLogExecution('DEBUG',logTitle, 'Setting start date : = '+ objSaasStartDate[len].startDate +' for line: = ' + n);
    					recSO.setLineItemValue('item','custcol_start_date_so_line',n, objSaasStartDate[len].startDate );
  
  				  	}
	    			
	    			for(var length = 0 ; length< objSaasEndDate.length ; length ++ )
  				  	{

  				    	 nlapiLogExecution('DEBUG',logTitle, 'Setting end date : = '+ objSaasEndDate[length].endDate +' for line : = ' + n);
  				    	 recSO.setLineItemValue('item','custcol_end_date_so_line',n, objSaasEndDate[length].endDate );
  				    	  
  				  	}
	    				    			
	    		}
	    			    		
	    	}
	    }

	    	
*/	    	
	    	

			var itemCategory = recSO.getLineItemValue('item', 'custcol_item_revenue_category', k);
    	
	    	
	    	if(itemCategory == itemSaasProfServices )
	    	{
    				for(var len = 0 ; len< objSaasStartDate.length ; len ++ )
				  	{
    			
    					nlapiLogExecution('DEBUG',logTitle, 'Setting start date : = '+ objSaasStartDate[len].startDate +' for line: = ' + k);
				    	recSO.setLineItemValue('item','custcol_start_date_so_line',k, objSaasStartDate[len].startDate );
				  	}
    			
    				for(var length = 0 ; length< objSaasEndDate.length ; length ++ )
				  	{
    					nlapiLogExecution('DEBUG',logTitle, 'Setting end date : = '+ objSaasEndDate[length].endDate +' for line : = ' + k);
				    	recSO.setLineItemValue('item','custcol_end_date_so_line',k, objSaasEndDate[length].endDate );
 
				  	}
	    	}
	    	
	    	
	    	if(itemCategory == itemProfServices )
	    	{
	    		if(isPerpetualFlg == 'T')
	    		{
	    			nlapiLogExecution('DEBUG',logTitle,'Item is Prof Services.There are perpetual items on SO lines');
	    			for(var len = 0 ; len< objStartDate.length ; len ++ )
  				  	{
	    				nlapiLogExecution('DEBUG',logTitle, 'Setting start date : = '+ objStartDate[len].startDate +' for line: = ' + k);
	    				recSO.setLineItemValue('item','custcol_start_date_so_line',k, objStartDate[len].startDate );
 		    	  
  				  	}
	    			
	    			for(var length = 0 ; length< objEndDate.length ; length ++ )
  				  	{
	    			
	    				nlapiLogExecution('DEBUG',logTitle, 'Setting end date : = '+ objEndDate[length].endDate +' for line : = ' + k);
  				    	 recSO.setLineItemValue('item','custcol_end_date_so_line',k, objEndDate[length].endDate );
  					      
  				    	 
  				  	}
	    		}
	    		
	    		if(isPerpetualFlg != 'T' && isSaasFlg == 'T')
	    		{
	    			nlapiLogExecution('DEBUG',logTitle,'Item is Prof Services. There are no perpetual, but here are SaaS items on SO lines');
	    			
	    			for(var len = 0 ; len< objSaasStartDate.length ; len ++ )
				  	{
    			
    					nlapiLogExecution('DEBUG',logTitle, 'Setting start date : = '+ objSaasStartDate[len].startDate +' for line: = ' + k);
				    	recSO.setLineItemValue('item','custcol_start_date_so_line',k, objSaasStartDate[len].startDate );
				  	}
    			
    				for(var length = 0 ; length< objSaasEndDate.length ; length ++ )
				  	{
    					nlapiLogExecution('DEBUG',logTitle, 'Setting end date : = '+ objSaasEndDate[length].endDate +' for line : = ' + k);
				    	recSO.setLineItemValue('item','custcol_end_date_so_line',k, objSaasEndDate[length].endDate );
 
				  	}
	    			
	    		}
	    		
	    		if(isPerpetualFlg != 'T' &&  isSaasFlg != 'T' && isOtherMinMax == 'T' )
	    		{
	    			nlapiLogExecution('DEBUG',logTitle,'Item is Prof Services.There are no perpetual, no SaaS items, but there are other Term License items');
	    			for(var len = 0 ; len< objStartDate.length ; len ++ )
  				  	{
	    				nlapiLogExecution('DEBUG',logTitle, 'Setting start date : = '+ objStartDate[len].startDate +' for line: = ' + k);
	    				recSO.setLineItemValue('item','custcol_start_date_so_line',k, objStartDate[len].startDate );
 		    	  
  				  	}
	    			
	    			for(var length = 0 ; length< objEndDate.length ; length ++ )
  				  	{
	    			
	    				nlapiLogExecution('DEBUG',logTitle, 'Setting end date : = '+ objEndDate[length].endDate +' for line : = ' + k);
  				    	 recSO.setLineItemValue('item','custcol_end_date_so_line',k, objEndDate[length].endDate );
				  	}
	    			
  			
	    		}
	    		
	    		if(isPerpetualFlg != 'T' &&  isSaasFlg != 'T' && isOtherMinMax != 'T')
	    		{
	    			
	    			nlapiLogExecution('DEBUG',logTitle,'Item is Prof Services. There are no perpetual, SaaS or any other Min/Max items on SO lines');
					var licStartDate = (recSO.getLineItemValue('item','custcolr7startdate',k)== null) ? "" :recSO.getLineItemValue('item','custcolr7startdate',k);
					var licEndDate = (recSO.getLineItemValue('item','custcolr7enddate',k)== null) ? "" :recSO.getLineItemValue('item','custcolr7enddate',k);
	    			
	    			recSO.setLineItemValue('item','custcol_start_date_so_line',k,licStartDate);
	    			recSO.setLineItemValue('item','custcol_end_date_so_line',k,licEndDate);
	    		}
	    		
	    		
	    		
	    	}// end of Professional item check
	    	    	
	    }
	
    
	   try
	   { 
		   	recSO.setFieldValue(FIELD_SO_PROCESSED, 'T');
		   	nlapiSubmitRecord(recSO, true);
		   	nlapiLogExecution('DEBUG',logTitle,'Submitting record');
		   	
	   	}catch (error)
	    {
	        if (error.getDetails != undefined)
	        {
	            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
	            
	            
	        }
	        else
	        {
	            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
	            
	        }
	        continue;
	    }
	   	
	   	continue;
	}// End of for loop for SO search results
		
}// End of script


function checkNXPIVMMigration(recSO) {
	var NXPUpgradeUpsell = false;
	var IVMNewUpgrade = false;

	var numLines = recSO.getLineItemCount('item');

	for (var i = 0; i < numLines; i++) {

		var lineItem = recSO.getLineItemValue('item', 'item', i);
		if(lineItem && !isNaN(lineItem) && Number(lineItem) > 0) {
			try {
				var itemLookupFlds = nlapiLookupField('item', lineItem, ['itemid']);

			} catch(e) {
				nlapiLogExecution('Error', 'Item is not a item', e);
				continue;
			}

			var oneItemFlow = Number(recSO.getLineItemValue('item', 'custcolr7_one_item_flow', i)); //use list ID for values 1 = New, 2 = Upsell, 3 = Renewal
			var incumbentProductPurchaseType =  recSO.getLineItemValue('item', 'custcolr7_incumbent_purchase_type', i);
			var onePriceSellingMotion = Number(recSO.getLineItemValue('item', 'custcolr7_oneprice_selling_motion', i)); //use list ids 1 = Upgrade, 2 = downgrade, 3 = crosssell, 4 = Upsell
			
			if(itemLookupFlds.itemid === 'NXP-SUB' && oneItemFlow == 2 && incumbentProductPurchaseType == 'Upgrade') {
				NXPUpgradeUpsell = true;
			} else if (itemLookupFlds.itemid === 'IVM-SUB' && oneItemFlow == 1 && onePriceSellingMotion == 1) {
				IVMNewUpgrade = true;
			} 
		}
	}

	return  NXPUpgradeUpsell && IVMNewUpgrade
}



var NSUtils =
{
	/**
	 * Get all of the results from the search even if the results are more than 1000. 
	 * @param {String} stRecordType - the record type where the search will be executed.
	 * @param {String} stSearchId - the search id of the saved search that will be used.
	 * @param {Array} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
	 * @param {Array} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
	 * @returns {Array} - an array of nlobjSearchResult objects
	 * @author memeremilla - initial version
	 * @author gmanarang - used concat when combining the search result
	 */
	search : function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
	{
		var arrReturnSearchResults = new Array();
		var nlobjSavedSearch;

		if (stSearchId != null)
		{
			nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

			// add search filter if one is passed
			if (arrSearchFilter != null)
			{
				nlobjSavedSearch.addFilters(arrSearchFilter);
			}

			// add search column if one is passed
			if (arrSearchColumn != null)
			{
				nlobjSavedSearch.addColumns(arrSearchColumn);
			}
		}
		else
		{
			nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
		}

		var nlobjResultset = nlobjSavedSearch.runSearch();
		var intSearchIndex = 0;
		var nlobjResultSlice = null;
		do
		{

			nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
			if (!(nlobjResultSlice))
			{
				break;
			}
			
			arrReturnSearchResults = arrReturnSearchResults.concat(nlobjResultSlice);
			intSearchIndex = arrReturnSearchResults.length;
		}

		while (nlobjResultSlice.length >= 1000);

		return arrReturnSearchResults;
	},

	/**
	 * Log message to the server script logs. Any mapped values are automatically entered as audit entries. Messages are purely entered as debug entries.
	 * @param {String} title [optional] - A title used to organize log entries (max length: 99 characters). If you set title to null or empty string (''), you will see the word "Untitled" appear in your log entry.
	 * @param {String} details [optional] - The details of the log entry (max length: 3000 characters)
	 * @param {Object} map [optional] - Key-value pairs to be added to the message (the values add to the message length)
	 * @returns {Void}
	 */
	logMessage : function(title, details, map) {
		var i;
		if (!title) {
			title = "";
		}
		if (!details) {
			details = "";
		}
		if (map) {
			for (i in map) {
				if (map.hasOwnProperty(i)) {
					details += ('\n' + i + ': ' + map[i]);
				}
			}
			nlapiLogExecution('AUDIT', title, details);
		} else {
			nlapiLogExecution('DEBUG', title, details);
		}
	},
	
	
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author mmeremilla
	 */
	isEmpty : function(stValue)
	{
		if ((stValue == '') || (stValue == null) || (stValue == undefined))
		{
			return true;
		}
		else
		{
			if (typeof stValue == 'string')
			{
				if ((stValue == ''))
				{
					return true;
				}
			}
			else if (typeof stValue == 'object')
			{
				if (stValue.length == 0 || stValue.length == 'undefined')
				{
					return true;
				}
			}

			return false;
		}
	},
	
	/**
	 * Get value of a saved search column using a label(formula numeric fileds on the saved search result).
	 * @param {nlobjSearchResultSet} result [required] - A single record from the result set.
	 * @param {String} label [required] - The custom label from the saved search column.
	 * @returns {String} sValue - The value for the saved search column.
	 */
	getValueByLabel : function (result, label) {
		var sValue = '';
		var columns = result.getAllColumns();
		var columnLen = columns.length;
		var column;
		for (i = 0; i < columnLen; i++) {
			column = columns[i];
			if (column.getLabel() == label) {
				sValue = result.getValue(column);
				break;
			}		
		}
		return sValue;
	}

}



function isEmpty(stValue)
{
	if ((stValue == '') || (stValue == null) ||(stValue == undefined))
    {
        return true;
    }
    return false;
}