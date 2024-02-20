/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Nov 2015     Jacob Shetler
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord noninventoryitem
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function GD_NonInventoryItem_SaveRecord()
{
	//make sure we're looking at a Decor or Option field
	var itemCategory = nlapiGetFieldValue('custitemrvsitemtype');
	if (itemCategory == GetItemCategoryOptionId() || itemCategory == GetItemCategoryDecorId())
	{
		//get the base sales price - in the matrix.
		var price = nlapiGetLineItemMatrixValue('price', 'price', 1, 1);
		if(price == null || price.length < 1 || isNaN(price))
		{
			//set the price to 0.
			alert("You must set a Base Price before saving this record.");
			return false;
		}
	}
	
	//If we didn't find anything wrong, let them save.
    return true;
}
