/**
 * Author: joe.son@audaxium.com
 * Date: 3/8/2013
 * Desc:
 * Client level script deployed for Quote at record level.
 */

function openQuoteConfig()
{
	if (!nlapiGetFieldValue('entity'))
	{
		alert('You must set client first');
		return false;
	}
	
	var selUrl = nlapiResolveURL(
		'SUITELET',
		'customscript_ax_sl_quote_lineitem_config',
		'customdeploy_ax_sl_quote_lineitem_config'
	)+
	'&currency='+nlapiGetFieldValue('currency')+
	'&subsidiary='+nlapiGetFieldValue('subsidiary')+
    '&clientid='+nlapiGetFieldValue('entity')+
	'&clientname='+nlapiGetFieldText('entity');
	
	 window.open(selUrl, '', 'width=1024,height=700,resizable=yes,scrollbars=yes');
	 
}

/**
 * Function to sort the existing line items by Booking Date (custcol_bo_date)
 * User Event will initiall get list of ALL Item line columns and add it as an array
 * var lineCols = [];
 */
function sortLineItemsByBoDate()
{
	if (parseInt(nlapiGetLineItemCount('item')) < 1)
	{
		return;
	}
	
	var usrConfirm = confirm(
						'Depending on number of line items on this Quote, '+
						'this process will freeze your window until resorting is completed. \n\n'+
						'This could take up to 5 minutes. \n\n'+
						'Still proceed with Line sort?'
					 );
	if (!usrConfirm)
	{
		return;
	}
	
	//Add to lineCols with list of other native and option fields to grab
	var optionCols = ['custcol_bo_date','custcol_bo_approxtime','custcol_bo_time',
	                  'custcol_bo_course','custcol_bo_address1','custcol_bo_address2',
	                  'custcol_bo_city','custcol_bo_postcode','custcol_bo_state',
	                  'custcol_bo_country',
	                  'custpage_unajobs'],
	    //Field sync for these should fire first
	    nativeCols = ['item','job','price','rate','quantity','amount','description','class'];
	
	//1. Build list of all Item Line Items into a object
	var arLineObj = [];
	
	for (var i=nlapiGetLineItemCount('item'); i >= 1; i-=1)
	{
		//As long as the line type isn't description remove and add
		//These item types should be left
		if(nlapiGetLineItemValue('item','itemtype',i) != 'Description')
		{
			//Select THIS line
			//nlapiSelectLineItem('item', i);
			
			var lineObj = {};
			//Go through nativeCols and set the value
			for (var ni=0; ni < nativeCols.length; ni+=1)
			{
				lineObj[nativeCols[ni]] = nlapiGetLineItemValue('item', nativeCols[ni], i);
			}
			
			//Go through lineCols and set the value - these are all other custom column fields
			for (var li=0; li < lineCols.length; li+=1)
			{
				
				//AS long as it's not the same field as defined in nativeCols
				if (!nativeCols.contains(lineCols[li]))
				{
					lineObj[lineCols[li]] = nlapiGetLineItemValue('item', lineCols[li],i);
				}
			}
			
			//Go through optionCols and set the value
			for (var oi=0; oi < optionCols.length; oi+=1)
			{
				lineObj[optionCols[oi]] = nlapiGetLineItemValue('item', optionCols[oi],i);
			}
			
			arLineObj.push(lineObj);
		
			//Remove this line
			nlapiRemoveLineItem('item', i);
		}
		
	}
	
	//arLineObj the array by custcol_bo_date
	arLineObj.sort(function(a, b)
	{
		//Check for NULL values
		if (!a.custcol_bo_date)
		{
			a.custcol_bo_date = '1/1/1900';
		}
		
		if (!a.custcol_bo_time)
		{
			a.custcol_bo_time = '12:00 am';
		}
		
		console.log('a: '+a.custcol_bo_date+' '+a.custcol_bo_time);
		
		//Make it into a date object
		a.dateobj = nlapiStringToDate(a.custcol_bo_date+' '+a.custcol_bo_time, 'datetime');
		
		if (!b.custcol_bo_date)
		{
			b.custcol_bo_date = '1/1/1900';
		}
		
		if (!b.custcol_bo_time)
		{
			b.custcol_bo_time = '12:00 am';
		}
		
		console.log('b: '+b.custcol_bo_date+' '+b.custcol_bo_time);
		
		//Make it into a date object
		b.dateobj = nlapiStringToDate(b.custcol_bo_date+' '+b.custcol_bo_time, 'datetime');
				
		return a.dateobj - b.dateobj;
	});
	
	console.log('Sorted Array: '+JSON.stringify(lineObj));
	
	//Add it all back starting from new line
	var lineCount = nlapiGetLineItemCount('item') + 1;
	
	for (var wi=0; wi < arLineObj.length; wi+=1)
	{
		console.log('adding new lines: '+arLineObj[wi].custcol_bo_date);
		
		//Need to conver the date/time object back to String Date
		//arLineObj[wi].custcol_bo_date = nlapiDateToString(arLineObj[wi].custcol_bo_date);
		
		//Need to reset the data as it was before. If date is 1/1/1900 or time is 12:00 am, set it back to empty
		if (arLineObj[wi].custcol_bo_date == '1/1/1900')
		{
			arLineObj[wi].custcol_bo_date = '';
		}
		
		if (arLineObj[wi].custcol_bo_time == '12:00 am')
		{
			arLineObj[wi].custcol_bo_time = '';
		}
		
		//0. Set new line number
		arLineObj[wi]['newline'] = lineCount;
		
		//1 Select new line
		nlapiSelectNewLineItem('item');
		//Go through nativeCols and set the value
		for (var ni=0; ni < nativeCols.length; ni+=1)
		{
			nlapiSetCurrentLineItemValue('item', nativeCols[ni], arLineObj[wi][nativeCols[ni]], true, true);
			//console.log('Native Column Field: '+nativeCols[ni]+' // Value: '+arLineObj[wi][nativeCols[ni]] +' // Line Value: '+
			//				nlapiGetCurrentLineItemValue('item', nativeCols[ni]));
		}
		
		//Go through lineCols and set the value - these are all other custom column fields
		for (var li=0; li < lineCols.length; li+=1)
		{
			//AS long as it's not the same field as defined in nativeCols
			if (!nativeCols.contains(lineCols[li]))
			{
				nlapiSetCurrentLineItemValue('item', lineCols[li], arLineObj[wi][lineCols[li]], true, true);
				//console.log('Column Field: '+lineCols[li]+' // Value: '+arLineObj[wi][lineCols[li]]);
			}
		}
		
		//Go through optionCols and set the value
		for (var oi=0; oi < optionCols.length; oi+=1)
		{
			nlapiSetCurrentLineItemValue('item', optionCols[oi], arLineObj[wi][optionCols[oi]], true, true);
			//console.log('Column Field: '+optionCols[oi]+' // Value: '+arLineObj[wi][optionCols[oi]]);
		}
		
		nlapiCommitLineItem('item');
		
		lineCount+=1;
		
	}
	
	//Go through it again and set the job field by line number
	for (var wi=0; wi < arLineObj.length; wi+=1)
	{
		if (arLineObj[wi]['job'])
		{
			nlapiSelectLineItem('item',arLineObj[wi].newline);
			nlapiSetCurrentLineItemValue('item', 'job', arLineObj[wi]['job'],true,true);
			nlapiSetCurrentLineItemValue('item', 'job_display',arLineObj[wi]['job_display'],true,true);
			nlapiCommitLineItem('item');
			
			console.log(arLineObj[wi].newline+' == job: '+arLineObj[wi]['job']);
			console.log(arLineObj[wi].newline+' == job_display: '+arLineObj[wi]['job_display']);
		}
	}
	
	
	
	//console.log(JSON.stringify(arLineObj));
}

/**
 * function called by Suitelets' client script to add items to Opportunity line
 */
function setItemsFromConfigurator(aritems) {
	//loop through aritems and add selected items from Configurator Suitelet
	
	for (var l=0; l < aritems.length; l+=1) 
	{
		try {
			nlapiSelectNewLineItem('item');
			nlapiSetCurrentLineItemValue('item', 'item', aritems[l].id, true, true);
			nlapiSetCurrentLineItemValue('item', 'quantity', 1, true, true);
			nlapiSetCurrentLineItemValue('item','price','-1',true,true);
			nlapiSetCurrentLineItemValue('item', 'rate', aritems[l].price, true, true);
			
			//Add in the options if set
			if (aritems[l].date)
			{
				nlapiSetCurrentLineItemValue('item','custcol_bo_date',aritems[l].date, true, true);
			}
			
			if (aritems[l].aptime)
			{
				nlapiSetCurrentLineItemValue('item','custcol_bo_approxtime',aritems[l].aptime, true, true);
			}
			
			if (aritems[l].time)
			{
				nlapiSetCurrentLineItemValue('item','custcol_bo_time',aritems[l].time, true, true);
			}
			
			if (aritems[l].course)
			{
				nlapiSetCurrentLineItemValue('item','custcol_bo_course',aritems[l].course, true, true);
			}
			
			if (aritems[l].city)
			{
				nlapiSetCurrentLineItemValue('item','custcol_bo_city',aritems[l].city, true, true);
			}
			
			if (aritems[l].zip)
			{
				nlapiSetCurrentLineItemValue('item','custcol_bo_postcode',aritems[l].zip, true, true);
			}
			
			if (aritems[l].state)
			{
				nlapiSetCurrentLineItemValue('item','custcol_bo_state',aritems[l].state, true, true);
			}
			
			if (aritems[l].country)
			{
				nlapiSetCurrentLineItemValue('item','custcol_bo_country',aritems[l].country, true, true);
			}
			
			nlapiCommitLineItem('item');
		} catch (e) {
			alert(e.toString());
		}
		
	}
	
}