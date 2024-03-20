/**
 * Module Description
 * 
 * Version Date Author Remarks 1.00 07 Apr 2017 vopavsky
 * 
 */
function getPalletFields(arrItemIds)
{

	debugger;
	var objPalletData = null;

	var intPalletGroupId = nlapiLookupField("customer", nlapiGetFieldValue("entity"), "custentity_ifd_palletgroupid");

	if (intPalletGroupId)
	{

		intPalletGroupId = intPalletGroupId.replace(/^0*/i,'');
		if(intPalletGroupId==""){
			intPalletGroupId=0;
		}
		var filters = [ new nlobjSearchFilter("custrecord_ifd_palletgroupfield", null, "is", String(intPalletGroupId)),
		    			new nlobjSearchFilter("custrecord_ifd_palletgroupitem", null, "anyof", arrItemIds.map(function(x){return String(x)}))
		];
		
		
		var columns = [ new nlobjSearchColumn("custrecord_ifd_palletkeytype"), 
		                new nlobjSearchColumn("custrecord_ifd_pallettypecode"),
		                new nlobjSearchColumn("custrecord_ifd_palletgroupitem") ];

		var searchResult = nlapiSearchRecord("customrecord_ifd_palletgroups", null, filters, columns);

		if (searchResult)
		{
			objPalletData = {};
			for (var i = 0; i < searchResult.length; i++)
			{
				objPalletData[searchResult[i].getValue("custrecord_ifd_palletgroupitem")] = [ 
				                                                                             searchResult[i].getText("custrecord_ifd_palletkeytype"),
				                                                                             searchResult[i].getText("custrecord_ifd_pallettypecode") 
				                                                                             ];
			}
		}
	}
	return objPalletData;
}

function setFieldsOnCurrentLine()
{
	if (!nlapiGetCurrentLineItemValue("item", "custcol_ifd_pallet_key_type") || !nlapiGetCurrentLineItemValue("item", "custcol_ifd_pallet_type_code"))
	{
		var intItemId = nlapiGetCurrentLineItemValue("item", "item");
		var palletData = getPalletFields(intItemId);
		if (palletData)
		{
			nlapiSetCurrentLineItemValue("item", "custcol_ifd_pallet_key_type", palletData[intItemId][0]);
			nlapiSetCurrentLineItemValue("item", "custcol_ifd_pallet_type_code", palletData[intItemId][1]);
			nlapiCommitLineItem("item");
		}
	}
}