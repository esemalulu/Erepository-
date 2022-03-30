/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Sep 2016     WORK-rehanlakhani
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 * 
 * ------------------------------------------------------------------------------
 * | NAME					| FIELD ID                     | COLUMN NAME        |
 * ------------------------------------------------------------------------------
 * | PlanB_CollectionQty    | custcol_planb_collection_qty | Collection Qty     |
 * | PlanB_ModFill          | custcol_planb_modfill        | Per Store Qty      |
 * | PlanB_StoreCount       | custcol_planb_storecount     | Store Count        |
 * | PlanB_Weekly_ROS       | custcol_planb_ros            | Wkly ROS           |
 * | PlanB_LBUnitCost       | custcol_planb_ld_unitcost    | LD Cost            |
 * ------------------------------------------------------------------------------
 */
function lineSetQty(type, name, linenum)
{
	if(type == 'item')
	{
		// Calcuation to set Quantity
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
		// Calculation to set Weekly Replenish Qty
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
		// Calculation to set Est. Extended Cost
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


