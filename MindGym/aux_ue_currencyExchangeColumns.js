/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function exchCurncy_AfterSubmit(type) 
{
	
	if (type=='create' || type=='edit' )
	{		
		var recId = nlapiGetRecordId();
		var recType = nlapiGetRecordType();
		var rec = nlapiLoadRecord(recType, recId );
		
		var newEXR = rec.getFieldValue('exchangerate');	
		var curncy = rec.getFieldValue('currency');	
		var trxDate = rec.getFieldValue('trandate');			
		var mainTotal = rec.getFieldValue('total');
		
		//Grab the current exchange rate conversions from both GBP and USD inversely 
		var USDrate = nlapiExchangeRate(curncy, 'USD', trxDate );
		var GBPrate = nlapiExchangeRate(curncy, 'GBP', trxDate );	
	}
	
	
	try
	{
	
		if(type == 'edit' || type == 'copy')
		{
			var oldRec = nlapiGetOldRecord();
			var oldEXR = oldRec.getFieldValue('exchangerate');
			
			if(oldEXR != newEXR)
			{
				rec.setFieldValue('custbody_aux_pre_exchangerate', oldEXR );	
			}			
		}							

		
		if((type == 'create' || type == 'edit' ) && (nlapiGetContext().getExecutionContext()=='userinterface' || nlapiGetContext().getExecutionContext()=='scheduled'))		
		{																												
			if(rec.getLineItemCount('item'))
			{
				//Loop through the expense lines  and line items to set the GBP or USD Amount Columns with the correct amounts based on the currency
				for ( var k = 1; k <= rec.getLineItemCount('item'); k++)
				{	
					var amnt = rec.getLineItemValue('item', 'amount', k);													
					rec.selectLineItem('item', k);  								
					rec.setCurrentLineItemValue('item', 'custcol_amount_usd', (amnt*USDrate).toFixed(2));
					rec.setCurrentLineItemValue('item', 'custcol_amount_gbp', (amnt*GBPrate).toFixed(2));				
					rec.commitLineItem('item');	

					rec.setFieldValue('custbody_amount_gbpmain', (mainTotal*GBPrate).toFixed(2));
					rec.setFieldValue('custbody_amount_usdmain', (mainTotal*USDrate).toFixed(2))																		
				}			
			}
				
				
			if(rec.getLineItemCount('expense'))
			{
				for ( var l = 1; l <= rec.getLineItemCount('expense'); l++)
				{	
					var amnt = rec.getLineItemValue('expense', 'amount', l);													
					rec.selectLineItem('expense', l);  								
					rec.setCurrentLineItemValue('expense', 'custcol_amount_usd', (amnt*USDrate).toFixed(2));
					rec.setCurrentLineItemValue('expense', 'custcol_amount_gbp', (amnt*GBPrate).toFixed(2));				
					rec.commitLineItem('expense');	

					rec.setFieldValue('custbody_amount_gbpmain', (mainTotal*GBPrate).toFixed(2));
					rec.setFieldValue('custbody_amount_usdmain', (mainTotal*USDrate).toFixed(2))																		
				}
			
			}
					
				rec.setFieldValue('custbody_amount_gbpmain', (mainTotal*GBPrate).toFixed(2));
				rec.setFieldValue('custbody_amount_usdmain', (mainTotal*USDrate).toFixed(2));
						
		} 
									
		try
		{
			nlapiSubmitRecord(rec);
		}
		catch (submiterr)
		{
			log('error','Exchange  Error ','Failed to Update/Create Exchange Rates on record:  '+recId+' // '+getErrText(submiterr));
		}
		
	
	}
	catch (scripterr) 
	{
		log('ERROR','Error Running Script' ,  getErrText(scripterr));							
	}
	
	
 }
 