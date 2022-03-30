/**
 * Author: joe.son@audaxium.com (Eli)
 * Mod Date: Apr. 16 2016
 * Desc:
 * Client script to support Suitelet 
 */

/**
 * List of JSON objects
 * var bTypeJson = {},
 * bPlatJson = {},
 * platByTypeJson = {},
 * itemsByTpJson = {};
 */

function configSlFieldChange(type, name, linenum) 
{
	if (name == 'custpage_type')
	{
		//Clear out Platform options
		nlapiRemoveSelectOption('custpage_plat', null);
		if (nlapiGetFieldValue(name))
		{
			//Populate platform list
			nlapiInsertSelectOption('custpage_plat', '', '', true);
			for (var p=0; p < platByTypeJson[nlapiGetFieldValue(name)].length; p+=1)
			{
				var platId = platByTypeJson[nlapiGetFieldValue(name)][p],
					platText = bPlatJson[platId];
				nlapiInsertSelectOption('custpage_plat', platId, platText, false);
			}
		}
	}
	
	//Set List of Item List based on type and plat selection.
	if (name == 'custpage_plat')
	{
		//Clear out Item options
		nlapiRemoveSelectOption('custpage_items', null);
		if (nlapiGetFieldValue(name))
		{
			//Populate item list where key is type-platform
			var tpKey = nlapiGetFieldValue('custpage_type')+
						'-'+
						nlapiGetFieldValue('custpage_plat');
			for (var it=0; it < itemsByTpJson[tpKey].length; it+=1)
			{
				var itemObj = itemsByTpJson[tpKey][it];
				nlapiInsertSelectOption('custpage_items', itemObj.id, itemObj.name, false);
			}
		}
	}
	
}


function backtoItemFlt()
{
	window.ischanged = false;
	
	selUrl = nlapiResolveURL(
			'SUITELET',
			'customscript_ax_sl_quote_lineitem_config',
			'customdeploy_ax_sl_quote_lineitem_config'
		)+
		'&currency='+nlapiGetFieldValue('currency')+
		'&subsidiary='+nlapiGetFieldValue('subsidiary')+
		'&subscurrency='+nlapiGetFieldValue('subscurrency')+
		'&clientname='+nlapiGetFieldValue('clientname');
	
	window.location.href = 'https://'+window.location.hostname+selUrl;
}

function CancelClose() {
	window.ischanged = false;
	window.close();
}

/**
 * Function to add selected items to opportunity
 */
function addToTransaction(_isAsc) 
{
	var conf = confirm('Please note that your screen may freeze while ALL items are added to transaction window. Do you wish to continue?');
	if (!conf) 
	{
		return;
	}
	var arItems = [],
		//line count
		linecnt = nlapiGetLineItemCount('custpage_itemlist');

	//loop through and build array of items to push back to opportunity client script
	for (var i=1; i <= linecnt; i+=1) 
	{
		var itemobj = {
			'id':nlapiGetLineItemValue('custpage_itemlist','item_internalid', i),
			'date':nlapiGetLineItemValue('custpage_itemlist','item_date', i),
			'price':nlapiGetLineItemValue('custpage_itemlist','item_price',i),
			'aptime':nlapiGetLineItemValue('custpage_itemlist','item_aptime', i),
			'time':nlapiGetLineItemValue('custpage_itemlist','item_time', i),
			'course':nlapiGetLineItemValue('custpage_itemlist','item_course', i),
			'city':nlapiGetLineItemValue('custpage_itemlist','item_city', i),
			'zip':nlapiGetLineItemValue('custpage_itemlist','item_zip', i),
			'state':nlapiGetLineItemValue('custpage_itemlist','item_state', i),
			'country':nlapiGetLineItemValue('custpage_itemlist','item_country', i)			
		};

		
		arItems.push(itemobj);
			
	}
	
	//May 24 2016 - Add in chronological (ASC order) button
	if (_isAsc)
	{
		arItems.sort(
			function(a, b)
			{
				var aDateVal = a.date,
					aTimeVal = a.time,
					aDateTimeVal = '',
					bDateVal = b.date,
					bTimeVal = b.time,
					bDateTimeVal = '';
				if (!aDateVal)
				{
					aDateVal = '1/1/1900';
				}
				
				if (!aTimeVal)
				{
					aTimeVal = '12:00 am';
				}
				
				aDateTimeVal = nlapiStringToDate(aDateVal+' '+aTimeVal, 'datetime');
				
				if (!bDateVal)
				{
					bDateVal = '1/1/1900';
				}
				
				if (!bTimeVal)
				{
					bTimeVal = '12:00 am';
				}
				
				bDateTimeVal = nlapiStringToDate(bDateVal+' '+bTimeVal, 'datetime');
				
				
				return aDateTimeVal - bDateTimeVal
			}
		);
	}
	
	
	window.opener.setItemsFromConfigurator(arItems);
	
	CancelClose();
}