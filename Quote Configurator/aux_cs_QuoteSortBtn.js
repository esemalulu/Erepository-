/**
 * Desc:
 * Client level script deployed for Opportunity/Quote at record level.
 */
 
var arItems = [];




function sortQuoteItems()
{
												
	//loop through and build array of items to push back to opportunity client script
	for (var i=1; i <= nlapiGetLineItemCount('item'); i++) 
	{	
			if(nlapiGetLineItemValue('itemtype') != 'Description')
			{
				var itemobj = {						
							
							 'amnt':nlapiGetLineItemValue('item','amount', i),
							 //'bckord':nlapiGetLineItemValue('item','backordered', i),
							 //'billvar':nlapiGetLineItemValue('item','billvariancestatusallbook', i),
							 //'catchup':nlapiGetLineItemValue('item','catchupperiod', i),
							 //'catchupdsply':nlapiGetLineItemValue('item','catchupperiod_display', i),
							 'cls':nlapiGetLineItemValue('item','class', i),	
							 'clsdsply':nlapiGetLineItemValue('item','class_display', i),
							 'cosest':nlapiGetLineItemValue('item','costestimate', i),
							 'cosestrte':nlapiGetLineItemValue('item','costestimaterate', i),
							 'cosestype':nlapiGetLineItemValue('item','costestimatetype', i),
							 'cosestypedsply':nlapiGetLineItemValue('item','costestimatetype_display', i),
							 //'dsplylnid':nlapiGetLineItemValue('item','custcol_adx_displaylineid', i),
							 'amntgbp':nlapiGetLineItemValue('item','custcol_amount_gbp', i),
							 'amntusd':nlapiGetLineItemValue('item','custcol_amount_usd', i),	
							 'custaddr1':nlapiGetLineItemValue('item','custcol_bo_address1', i),
							 'custaddr2':nlapiGetLineItemValue('item','custcol_bo_address2', i),
							 'aproxtme':nlapiGetLineItemValue('item','custcol_bo_approxtime', i),
							 'custcty':nlapiGetLineItemValue('item','custcol_bo_city', i),
							 'custcntry':nlapiGetLineItemValue('item','custcol_bo_country', i),
							 'custcourse':nlapiGetLineItemValue('item','custcol_bo_course', i),
							 'custdate':nlapiGetLineItemValue('item','custcol_bo_date', i),
							 'custzip':nlapiGetLineItemValue('item','custcol_bo_postcode', i),
							 'custstate':nlapiGetLineItemValue('item','custcol_bo_state', i),
							 'custtme':nlapiGetLineItemValue('item','custcol_bo_time', i),
							 //'custjbtype':nlapiGetLineItemValue('item','custcol_col_jobtype', i),
							 //'custisjb':nlapiGetLineItemValue('item','custcol_job_isjob', i),
							 'custponum':nlapiGetLineItemValue('item','custcol_so_purchaseorderno', i),
							 'custstatpro':nlapiGetLineItemValue('item','custcol_statistical_procedure_sale', i),	
							 //'custstatval':nlapiGetLineItemValue('item','custcol_statistical_value_base_curr', i),
							 //'custturnup':nlapiGetLineItemValue('item','custcol_turnup_logic', i),
							 //'custrecounter':nlapiGetLineItemValue('item','custcolichartsrecordcounter', i),
							 'rdyinvoice':nlapiGetLineItemValue('item','custcolready_to_invoice_checkbox', i),
							// 'deferrec':nlapiGetLineItemValue('item','deferrevrec', i),
							 'desc':nlapiGetLineItemValue('item','description', i),
							// 'frjb':nlapiGetLineItemValue('item','fromjob', i),
							 //'fulfil':nlapiGetLineItemValue('item','fulfillable', i),
							 'ident':nlapiGetLineItemValue('item','id', i),
							 //'includewrap':nlapiGetLineItemValue('item','includegroupwrapper', i),
							 //'initqnty':nlapiGetLineItemValue('item','initquantity', i),
							 //'isestmte':nlapiGetLineItemValue('item','isestimate', i),
							 //'isnoninv':nlapiGetLineItemValue('item','isnoninventory', i),
							 'itemid':nlapiGetLineItemValue('item','item', i),
							 'itemdsply':nlapiGetLineItemValue('item','item_display', i),
							 //'itmsbtype':nlapiGetLineItemValue('item','itemsubtype', i),
							 'itmtype':nlapiGetLineItemValue('item','itemtype', i),
							 'jb':nlapiGetLineItemValue('item','job', i),
							 'jbdsply':nlapiGetLineItemValue('item','job_display', i),
							 //'lngth':nlapiGetLineItemValue('item','length', i),
							 //'lne':nlapiGetLineItemValue('item','line', i),
							 //'lneky':nlapiGetLineItemValue('item','lineuniquekey', i),
							 //'nprnt':nlapiGetLineItemValue('item','noprint', i),
							 //'olditmid':nlapiGetLineItemValue('item','olditemid', i),
							 //'onordr':nlapiGetLineItemValue('item','onorder', i),
							 'prclvl':nlapiGetLineItemValue('item','price', i),
							 'prcdsply':nlapiGetLineItemValue('item','price_display', i),
							 //'prntitms':nlapiGetLineItemValue('item','printitems', i),
							 'qnty':nlapiGetLineItemValue('item','quantity', i),	
							 'rte':nlapiGetLineItemValue('item','rate', i)	
							//'optns':nlapiGetLineItemValue('item','options',i)                      //I took out the options part to see if I can just sort using custcol value
							 
								};		
				arItems.push(itemobj);				
			}						   
	}


	
	
	for (var j=1; j <= nlapiGetLineItemCount('item'); j++) 
	{		
		if(nlapiGetLineItemValue('itemtype') != 'Description')
		{			
		nlapiRemoveLineItem('item', j);		
		j=1;	
		}
	}	
		

/*		
	var optionString = arItems.optns;
	var arOptions = optionString.split(String.fromCharCode(4));		
	if (arOptions && arOptions.length > 0)
	{

		for (var e=0; e < arOptions.length; e+=1)
		{
			var arOptionElements = arOptions[e].split(String.fromCharCode(3));
			var date = arOptionElements[0];

		}
	
	}		
*/		
		
		
	    					
		arItems.sort(function(a, b){return nlapiStringToDate(b.custdate)-nlapiStringToDate(a.custdate)});

		setItemsFromConfigurator(arItems);
		
		


	}
			 













/**
 * function called by Suitelets' client script to add items to Opportunity line
 */
function setItemsFromConfigurator(aritems) {
	//loop through aritems and add selected items from Configurator Suitelet
	
	for (var l=1; l < aritems.length; l++)  //changing the value var value to 0 appears to work for some reason and I can't figure out why
	{
		try {
			nlapiSelectNewLineItem('item');  //Even though I've accounted for pretty much every single value at the line item level I still get errors
			
					nlapiSetCurrentLineItemValue('item', 'amount', aritems[l].amnt, true, true);
					//nlapiSetCurrentLineItemValue('item', 'backordered', aritems[l].bckord, true, true);										
					//nlapiSetCurrentLineItemValue('item', 'billvariancestatusallbook', aritems[l].billvar, true, true);	
					//nlapiSetCurrentLineItemValue('item', 'catchupperiod', aritems[l].catchup, true, true);	
					//nlapiSetCurrentLineItemValue('item', 'catchupperiod_display', aritems[l].catchupdsply, true, true);	
					nlapiSetCurrentLineItemValue('item', 'class', aritems[l].cls, true, true);	
					nlapiSetCurrentLineItemValue('item', 'class_display', aritems[l].clsdsply, true, true);
					nlapiSetCurrentLineItemValue('item', 'costestimate', aritems[l].cosest, true, true);
					nlapiSetCurrentLineItemValue('item', 'costestimaterate', aritems[l].cosestrte, true, true);
					nlapiSetCurrentLineItemValue('item', 'costestimatetype', aritems[l].cosestype, true, true);
					nlapiSetCurrentLineItemValue('item', 'costestimatetype_display', aritems[l].cosestypedsply, true, true);
					//nlapiSetCurrentLineItemValue('item', 'custcol_adx_displaylineid', aritems[l].dsplylnid, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_amount_gbp', aritems[l].amntgbp, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_amount_usd', aritems[l].amntusd, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_address1', aritems[l].custaddr1, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_address2', aritems[l].custaddr2, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_approxtime', aritems[l].aproxtme, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_city', aritems[l].custcty, true, true);	
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_country', aritems[l].custcntry, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_course', aritems[l].custcourse, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_date', aritems[l].custdate, true, true);	
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_postcode', aritems[l].custzip, true, true);	
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_state', aritems[l].custstate, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_bo_time', aritems[l].custtme, true, true);
					//nlapiSetCurrentLineItemValue('item', 'custcol_col_jobtype', aritems[l].custjbtype, true, true);
					//nlapiSetCurrentLineItemValue('item', 'custcol_job_isjob', aritems[l].custisjb, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_so_purchaseorderno', aritems[l].custponum, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcol_statistical_procedure_sale', aritems[l].custstatpro, true, true);
					//nlapiSetCurrentLineItemValue('item', 'custcol_statistical_value_base_curr', aritems[l].custstatval, true, true);
					//nlapiSetCurrentLineItemValue('item', 'custcol_turnup_logic', aritems[l].custturnup, true, true);
					//nlapiSetCurrentLineItemValue('item', 'custcolichartsrecordcounter', aritems[l].custrecounter, true, true);
					nlapiSetCurrentLineItemValue('item', 'custcolready_to_invoice_checkbox', aritems[l].rdyinvoice, true, true);
					//nlapiSetCurrentLineItemValue('item', 'deferrevrec', aritems[l].deferrec, true, true);	
					nlapiSetCurrentLineItemValue('item', 'description', aritems[l].desc, true, true);	
					//nlapiSetCurrentLineItemValue('item', 'fromjob', aritems[l].frjb, true, true);	
					//nlapiSetCurrentLineItemValue('item', 'fulfillable', aritems[l].fulfil, true, true);	
					nlapiSetCurrentLineItemValue('item', 'id', aritems[l].ident, true, true);
					//nlapiSetCurrentLineItemValue('item', 'includegroupwrapper', aritems[l].includewrap, true, true);
					//nlapiSetCurrentLineItemValue('item', 'initquantity', aritems[l].initqnty, true, true);
					//nlapiSetCurrentLineItemValue('item', 'isestimate', aritems[l].isestmte, true, true);
					//nlapiSetCurrentLineItemValue('item', 'isnoninventory', aritems[l].isnoninv, true, true);
					nlapiSetCurrentLineItemValue('item', 'item', aritems[l].itemid, true, true);
					nlapiSetCurrentLineItemValue('item', 'item_display', aritems[l].itemdsply, true, true);
					//nlapiSetCurrentLineItemValue('item', 'itemsubtype', aritems[l].itmsbtype, true, true);
					nlapiSetCurrentLineItemValue('item', 'itemtype', aritems[l].itmtype, true, true);
					nlapiSetCurrentLineItemValue('item', 'job', aritems[l].jb, true, true);
					nlapiSetCurrentLineItemValue('item', 'job_display', aritems[l].jbdsply, true, true);
					//nlapiSetCurrentLineItemValue('item', 'length', aritems[l].lngth, true, true);
					//nlapiSetCurrentLineItemValue('item', 'line', aritems[l].lne, true, true);
					//nlapiSetCurrentLineItemValue('item', 'lineuniquekey', aritems[l].lneky, true, true);
					//nlapiSetCurrentLineItemValue('item', 'noprint', aritems[l].nprnt, true, true);
					//nlapiSetCurrentLineItemValue('item', 'olditemid', aritems[l].olditmid, true, true);
					//nlapiSetCurrentLineItemValue('item', 'onorder', aritems[l].onordr, true, true);
					nlapiSetCurrentLineItemValue('item', 'price', aritems[l].prclvl, true, true);
					nlapiSetCurrentLineItemValue('item', 'price_display', aritems[l].prcdsply, true, true);
					//nlapiSetCurrentLineItemValue('item', 'printitems', aritems[l].prntitms, true, true);
					nlapiSetCurrentLineItemValue('item', 'quantity', aritems[l].qnty, true, true);
					nlapiSetCurrentLineItemValue('item', 'rate', aritems[l].rte, true, true);
					//nlapiSetCurrentLineItemValue('item', 'options', aritems[l].optns, true, true);
										
					//costestimatetypelist AND /pricelevels	are arrays
						
		
			nlapiCommitLineItem('item');
		} 
		catch (e) 
		{
			alert(e.toString());
		}
		
	}
	
}
					
					
