/*
 * @author Farallon Brands
 * @author ltauscher@farallonbrands.com 
 * 
 * ---------------------------------------------------------
 * | NAME					| FIELD ID                     |
 * ---------------------------------------------------------
 * | PlanB_CollectionQty    | custcol_planb_collection_qty |
 * | PlanB_ModFill          | custcol_planb_modfill        |
 * | PlanB_StoreCount       | custcol_planb_storecount     |
 * | PlanB_Weekly_ROS       | custcol_planb_ros            |
 * | PlanB_LBUnitCost       | custcol_planb_ld_unitcost    |
 * ---------------------------------------------------------
 * 
 */


function lineSetQty(type, name, linenum)
{
	if(type == 'item')
	{
		if (name == "custcol_planb_collection_qty" || name == "custcol_planb_modfill" || name == "custcol_planb_storecount")
		{
			var collectionQty = nlapiGetCurrentLineItemValue(type, 'custcol_planb_collection_qty');
			var modFill       = nlapiGetCurrentLineItemValue(type, 'custcol_planb_modfill');
			var storeCount    = nlapiGetCurrentLineItemValue(type, 'custcol_planb_storecount');
			
			if(collectionQty && modFill && storeCount)
			{
				var qty = collectionQty * modFill * storeCount;
				nlapiSetCurrentLineItemValue(type, 'quantity', qty);
			}
		}
		else if (name == "custcol_planb_collection_qty" || name == "custcol_planb_ros" || name == "custcol_planb_storecount")
		{
			var collectionQty = nlapiGetCurrentLineItemValue(type, 'custcol_planb_collection_qty');
			var weeklyROS     = nlapiGetCurrentLineItemValue(type, 'custcol_planb_ros');
			var storeCount    = nlapiGetCurrentLineItemValue(type, 'custcol_planb_storecount');
			
			if (collectionQty && weeklyROS && storeCount)
			{
				var weeklyQty = collectionQty * weeklyROS * storeCount;
				nlapiSetCurrentLineItemValue(type, 'custcol_plan_wklyrepl_qty', weeklyQty);
			}
		}
		else if (name == 'quantity' || name == 'custcol_planb_ld_unitcost')
		{
			var quantity = nlapiGetCurrentLineItemValue(type, 'quantity');
			var LDCost   = nlapiGetCurrentLineItemValue(type, 'custcol_planb_ld_unitcost');
			
			if (quantity && LDCost)
			{
				var extCost = quantity * LDCost;
				nlapiSetCurrentLineItemValue(type, 'costestimate', extCost);
			}
		}
	}
	
}



/*function setQty(type, name, linenum){

	//Check to see if the fields change were one of the following:
	if(name == "custcol_planb_collection_qty" || name == "custcol_planb_modfill"  || name == "custcol_planb_storecount" ){
		
		var subListType = 'item';
		
		//Get the values for the following fields
		var val1 = nlapiGetCurrentLineItemValue(subListType, "custcol_planb_collection_qty");
		var val2 = nlapiGetCurrentLineItemValue(subListType, "custcol_planb_modfill");
		var val3 = nlapiGetCurrentLineItemValue(subListType, "custcol_planb_storecount");
		
		if(val1 && val2 && val3) // if all 3 fields have values...
		
			//Calculate QTY
			var qty = val1 * val2 * val3;
			nlapiSetCurrentLineItemValue(subListType, 'quantity', qty);
			
		} else { 
			
			//do nothing, need all three fields
		}
	} */
function setReplQty(type, name, linenum){

	//Check to see if the fields change were one of the following:
	if(name == "custcol_planb_collection_qty" || name == "custcol_planb_ros"  || name == "custcol_planb_storecount" ){
		
		var subListType = 'item';
		
		//Get the values for the following fields
		var val4 = nlapiGetCurrentLineItemValue(subListType, "custcol_planb_collection_qty");
		var val5 = nlapiGetCurrentLineItemValue(subListType, "custcol_planb_ros");
		var val6 = nlapiGetCurrentLineItemValue(subListType, "custcol_planb_storecount");
		
		if(val4 && val5 && val6) // if all 3 fields have values...
		
			//Calculate QTY
			var Rqty = val4 * val5 * val6;
			nlapiSetCurrentLineItemValue(subListType, 'custcol_plan_wklyrepl_qty', Rqty);
			
		} else { 
			
			//do nothing, need all three fields
		}
	} 
	function setEstExtCost(type, name, linenum){

	//Check to see if the fields change were one of the following:
	if(name == "quantity" || name == "custcol_planb_ld_unitcost" ){
		
		var subListType = 'item';
		
		//Get the values for the following fields
		var val7 = nlapiGetCurrentLineItemValue(subListType, "quantity");
		var val8 = nlapiGetCurrentLineItemValue(subListType, "custcol_planb_ld_unitcost");
		
		if(val7 && val8) // if all 2 fields have values...
		
			//Calculate ExtCost
			var ExtCost = val7 * val8;
			nlapiSetCurrentLineItemValue(subListType, 'costestimate', ExtCost);
			
		} else { 
			
			//do nothing, need both fields fields
		}
	} 
