/**
 * Contract Management & Renewal Automation related helper functions.
 * This scheduled script will have both scheduled and adhoc deployments.
 * It will run every night or morning to regenerate ContractMgmtAuto_Eligible_ItemJson.js file
 * 
 */


/**
 * Function to grab and return list of ALL eligible items for
 * Contract Mgmt & Renewal Automation process.
 * Returns it in JSON Object format:
 * {
 * 		[itemid]:{
 * 			'name':'',
 * 			'recordtype':'',
 * 			'itemtype':'',
 * 			'baseprice':'',
 * 			'tier':{
 * 				'pricelevelid':{
 * 					'pricelevelname':'',
 * 					'rate':''
 * 				},
 * 				...
 * 			}
 * 		}
 * }
 */

//Company Level Setting
var paramJsonFileId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb130_itemjsonfileid');


function generateItemsForCmraJson()
{
	//Searc Filter WILL Change depending on Clients confirmation.
	//Item Type of: Service - One Time (2), Service - Recurring (7), Product (1),
	//				Custom Software (3), Product & Service - Item Group (6)
	//Look for Service, Non Inventory, Item Groups Items
	//Name does NOT start with zz 
	//AND
	//Name starts with EM or DM
	var itemflt = [
	               	['type','anyof',['Service','NonInvtPart','Group']],
	               	'AND',
	               	['isinactive','is','F'],
	               	'AND',
	               	['custitemitem_type','anyof',['2','7','1','3','6']],
	               	'AND',
	               	['name', 'doesnotstartwith','zz'],
	               	'AND',
	               	[
	               	 	['name', 'startswith','EM'],
	               	 	'OR',
	               	 	['name', 'startswith','DM'],
	               	 	//9/19/2016
	               	 	//	Add looking for DN items
	               	 	'OR',
	               	 	['name', 'startswith', 'DN']
	               	]
	              ];
	    
	    itemcol = [new nlobjSearchColumn('internalid').setSort(true),
		           new nlobjSearchColumn('custitemitem_type'),
		           new nlobjSearchColumn('itemid'),
		           new nlobjSearchColumn('baseprice')],
		
		//pitemcol brings out the base price, pricelevel and unitprice 
		//If it was combined into single search, search results will NOT include those items that has
		// NO Value set for base or any of price level.
		pitmcol = [new nlobjSearchColumn('internalid').setSort(true),
		   		   new nlobjSearchColumn('pricelevel','pricing'),
		   		   new nlobjSearchColumn('unitprice','pricing')],
		//First search is to go through EVERY Item that is eligible regardless of baseprice or price level set
		itemrs = nlapiSearchRecord('item', null, itemflt, itemcol),
		itemjson = {};
	
	//Loop through each result found and build itemJson
	//Assume we have LESS THAN 1000 eligible items
	for (var i=0; itemrs && i < itemrs.length; i+=1)
	{
		var itemid = itemrs[i].getValue('internalid'),
			itemname = itemrs[i].getValue('itemid'),
			itemrectype = itemrs[i].getRecordType(),
			itemtype = itemrs[i].getValue('custitemitem_type'),
			itembase = itemrs[i].getValue('baseprice');
		
		if (itemjson[itemid])
		{
			itemjson[itemid] = {};
		}
		
		//Build Parent level Item
		itemjson[itemid] = {
			'name':itemname,
			'recordtype':itemrectype,
			'itemtype':itemtype,
			'baseprice':itembase,
			'tier':{}
		};		
	}
	
	//Second Execution for Items with base price and or price level
	itemrs = nlapiSearchRecord('item', null, itemflt, pitmcol);
	for (var i=0; itemrs && i < itemrs.length; i+=1)
	{
		var itemid = itemrs[i].getValue('internalid'),
			itempricelevelid = itemrs[i].getValue('pricelevel','pricing'),
			itempriceleveltext = itemrs[i].getText('pricelevel','pricing'),
			itempricelevelrate = itemrs[i].getValue('unitprice','pricing');
		
		//Assume all items returned are subset of initial search
		itemjson[itemid].tier[itempricelevelid] = {
				'pricelevelname':itempriceleveltext,
				 'rate':itempricelevelrate
		};
	}

	//Load the JSON file to replace the content
	var itemJsonFile = nlapiLoadFile(paramJsonFileId),
		itemJsonFileName = itemJsonFile.getName(),
		itemJsonFolderId = itemJsonFile.getFolder(),
		itemJsonNewVal = 'var itemjson = '+JSON.stringify(itemjson)+';';
	
	itemJsonFile = nlapiCreateFile(
						itemJsonFileName, 
						'JAVASCRIPT', 
						itemJsonNewVal
				   );
	
	itemJsonFile.setFolder(itemJsonFolderId);
	nlapiSubmitFile(itemJsonFile);
	log('audit',itemJsonFileName,'Contents refreshed on '+new Date());
}