/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       05 Oct 2016     WORK-rehanlakhani
 *
 */

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
function userEventAfterSubmit(type)
{
	var value = 'CUSTOM';

	var itemCount = nlapiGetLineItemCount('item');
	for(var i = 1; i <= itemCount; i+=1)
	{
		var line = nlapiSelectLineItem('item', i);
		var collectionQty = nlapiGetCurrentLineItemValue('item', 'custcol_planb_collection_qty');
		var modFill = nlapiGetCurrentLineItemValue('item', 'custcol_planb_modfill');
		var storeCount = nlapiGetCurrentLineItemValue('item', 'custcol_planb_storecount');
		var weeklyROS = nlapiGetCurrentLineItemValue('item', 'custcol_planb_ros');
		var qty = nlapiGetCurrentLineItemValue('item', 'quantity');
		var ldcost = nlapiGetCurrentLineItemValue('item', 'custcol_planb_ld_unitcost');


		// If these three fields have values set Quantity.
		if(collectionQty && modFill && storeCount)
		{
			var quantity = collectionQty * modFill * storeCount;
			nlapiSetCurrentLineItemValue('item', 'quantity', quantity);
		}

		// If these three fields have values set Weekly Qty.
		if(collectionQty && weeklyROS && storeCount)
		{
			var weeklyQty = collectionQty * weeklyROS * storeCount;
			nlapiSetCurrentLineItemValue('item', 'custcol_plan_wklyrepl_qty', Math.round(weeklyQty));
		}

		// If these two fields have values set ExtCost.
		if(qty && ldcost)
		{
			var extCost = quantity * ldcost;
			nlapiSetCurrentLineItemValue('item', 'costestimate', extCost);
		}
		nlapiCommitLineItem('item');


	}

}
