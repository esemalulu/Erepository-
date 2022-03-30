/**
 * Generic Quote Related User Event script is introduced after merging and
 * deprecating Quote Server User Event script. 
 * Remaining two User Events triggers very specific functions and are deployed across multiple record types.
 * A Generic Quote Related User Event script will house those functions that are specific to Quote
 * 
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Sep 2015     json
 *
 * Modifying this script to be ALLOWED against Sales Order.
 * Ticket 11127 requests to have the Set to 0 and Base Price buttons to be available
 * on the Sales Order as well.
 *
 */

/**
 * Before load added.
 * Support for Ticket 6824
 */
function quoteUeBeforeLoad(type, form, request)
{
	var paramAmtZeroBtnValue = nlapiGetContext().getSetting('SCRIPT','custscript_398_amtzerobtnval'),
		paramPlBaseBtnValue = nlapiGetContext().getSetting('SCRIPT','custscript_398_plbasebtnval'),
		//Ticket 11127 - Request to add Customer Price Level button
		paramCustPriceBtnValue = nlapiGetContext().getSetting('SCRIPT','custscript_398_plcustbtnval');
	
	
	//Ticket 6824 - Add two buttons that will set line amount to 0 and price level to baseprice
	if (nlapiGetContext().getExecutionContext()=='userinterface' && type=='edit')
	{
		//Supporting client function is defined in trxLCBL-CS Transaction UI Client Helper (cblmg_cs_TransactionUiClientHelper.js file)
		form.getSubList('item').addButton('custpage_zerobtn', paramAmtZeroBtnValue, 'lineValueAuto(\'zero\')');
		form.getSubList('item').addButton('custpage_basepricebtn',paramPlBaseBtnValue,'lineValueAuto(\'baseprice\')');
		//Ticket 11127 - Request to add Customer Price Level button
		form.getSubList('item').addButton('custpage_custprice', paramCustPriceBtnValue, 'lineValueAuto(\'custprice\')');
	}
	
	//Ticket 11127- ONLY Display below if record type is estimate
	if (nlapiGetRecordType() == 'estimate')
	{
		//Quote Item Configurator Related 
		if (type == 'create' && nlapiGetContext().getExecutionContext()=='userinterface') {
			
			
			//openQuoteConfig function is defined in aux_cs_Quote_Configurator_Rec.js file
			form.addButton(
				'custpage_oppconfigbtn',
				'Quote Builder', 
				'openQuoteConfig()'
			);   
		}
		
		//May 15 2016 - Add Sort Items button
		//Quote Item Configurator Related 
		if (nlapiGetContext().getExecutionContext()=='userinterface' && 
			(type=='create' || type=='edit' || type == 'copy')) 
		{				  
			//TESTING
			//ONLY display for Admins
			if (nlapiGetContext().getRole() != '3')
			{
				return;
			}
			
			//Grab item sublist and build list of ALL columns that can be accessed by client script.
			var lineCols = [],
				itemSlObjCols = nlapiGetNewRecord().getAllLineItemFields('item');
			
			for (var c=0; itemSlObjCols && c < itemSlObjCols.length; c+=1)
			{
				//ONLY build it into list if it is custom col.
				//Other native fields will be individually grabbed
				//if (itemSlObjCols[c].indexOf('custcol_') > -1)
				//{
					lineCols.push(itemSlObjCols[c]);
				//}
				
			}
			
			//Add hidden javascript variable field
			var hidJsFld = form.addField('custpage_hiddenjsfld','inlinehtml');
			hidJsFld.setDefaultValue(
				'<script language="JavaScript">'+
				'var lineCols = '+JSON.stringify(lineCols)+';'+
				'</script>'
			);
			
			form.getSubList('item').addButton('custpage_sortitems','Sort Items by Booking Date', 'sortLineItemsByBoDate()');		
		}
		
	}
	
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function quoteUeBeforeSubmit(type)
{

	//Ticket 11127- ONLY Display below if record type is estimate
	if (nlapiGetRecordType() == 'estimate')
	{
		//Sept. 22 2015 - Add validation before submit to make sure all lines' course (Option) and items are Active.
		if (nlapiGetContext().getExecutionContext()=='userinterface' && (type =='delete' || type == 'view' || type=='xedit') )
		{
			return;
		}
		
		var newQuote = nlapiGetNewRecord(),
			errorMsg = '';
		
		try
		{
			if (newQuote.getLineItemCount('item') <= 0)
			{
				//NO need to process if there are no lines
				return;
			}
			
			var listItems = [],
				listCourses = [],
				inactiveItems = {},
				inactiveCourses = {},
				hasInactiveItems = false,
				hasInactiveCourses = false,
				lineCount = newQuote.getLineItemCount('item');
			//loop through and grab list of unique items and courses per each line
			for (var i=1; i <= lineCount; i+=1)
			{
				var itemId = newQuote.getLineItemValue('item', 'item', i) || '',
					courseId = newQuote.getLineItemValue('item', 'custcol_bo_course', i) || '';
				
				if (itemId && !listItems.contains(itemId))
				{
					//add to list of unique item Ids
					listItems.push(itemId);
					
				}
				
				if (courseId && !listCourses.contains(courseId))
				{
					//add to list of unique item Ids
					listCourses.push(courseId);
				}
			}
			
			//Search Inactive Items
			if (listItems.length > 0)
			{
				var itmFlt = [new nlobjSearchFilter('internalid', null, 'anyof', listItems),
				              new nlobjSearchFilter('isinactive', null, 'is', 'T')],
					itemrs = nlapiSearchRecord('item', null, itmFlt, null);
				
				for (var ii=0; itemrs && ii < itemrs.length; ii+=1)
				{
					inactiveItems[itemrs[ii].getId()] = itemrs[ii].getId(); 
					if (!hasInactiveItems)
					{
						hasInactiveItems = true;
					}
				}
			}
			
			//Search Inactive Courses
			if (listCourses.length > 0)
			{
				var crFlt = [new nlobjSearchFilter('internalid', null, 'anyof', listCourses),
				             new nlobjSearchFilter('isinactive', null, 'is', 'T')],
					crrs = nlapiSearchRecord('customrecord_course', null, crFlt, null);
				
				for (var c=0; crrs && c < crrs.length; c+=1)
				{
					inactiveCourses[crrs[c].getId()] = crrs[c].getId();
					if (!hasInactiveCourses)
					{
						hasInactiveCourses = true;
					}
				}
			}
			
			log('debug','inactive items',JSON.stringify(inactiveItems));
			log('debug','inactive courses',JSON.stringify(inactiveCourses));
			log('debug','has inactive items',hasInactiveItems);
			log('debug','has inactive courses',hasInactiveCourses);
			
			//Final Loop. If it has inactive items, build out proper error message PER error line and THROW error
			if (hasInactiveCourses || hasInactiveItems)
			{
				for (var i=1; i <= lineCount; i+=1)
				{
					var eitemId = newQuote.getLineItemValue('item', 'item', i) || '',
						ecourseId = newQuote.getLineItemValue('item', 'custcol_bo_course', i) || '',
						lineerr = '';
					
					if (eitemId && inactiveItems[eitemId])
					{
						lineerr += 'Inactive Item,';
						
					}
					
					if (ecourseId && inactiveCourses[ecourseId])
					{
						lineerr += 'Inactive Course';
					}
					
					//Add by line error message to overall errorMsg
					if (lineerr)
					{
						errorMsg += 'Line '+i+': '+lineerr +'<br/><br/>';
					}
				}
				
				log('audit','Line Errors Found',errorMsg);
				if (errorMsg)
				{
					
					throw nlapiCreateError(
						'INACTIVE-ERR',
						'<div style="font-size: 14px; "><br/>Following lines have Issues with Items and/or Courses:<br/><br/>'+
						errorMsg+
						'</div>',
						true
					);
				}
			}
		}
		catch (procerr)
		{
			//if ERROR CODE is INACTIVE-ERR, throw it again and BLOCK User from saving this record
			log('error','Error processing inactive Item/Course Check', getErrText(procerr));
			
			if (getErrText(procerr).indexOf('INACTIVE-ERR') > -1)
			{
				throw nlapiCreateError(
					'FIN-INACTIVE-ERR', 
					'One ore more line on this Quote contains '+
					'inactive items and/or course. Please fix and try again: <br/><br/>'+
					getErrText(procerr), 
					false
				);
			}
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function quoteUeAfterSubmit(type){

	//Ticket 11127- ONLY Display below if record type is estimate
	if (nlapiGetRecordType() == 'estimate')
	{
		//Sept. 22 2015 -
		//Moved in from sweet_quote_server.js.
		//	- sweet_quote_server.js is deprecated from this moment on.
		// Schedule script to calculate opportunity totals
		if (nlapiGetFieldValue('opportunity'))
		{
			var params = new Array();
			params['custscript_opportunity'] = nlapiGetFieldValue('opportunity');
			nlapiScheduleScript('customscript_opportunity_calc_Totals', null, params);
		}
	}
}
