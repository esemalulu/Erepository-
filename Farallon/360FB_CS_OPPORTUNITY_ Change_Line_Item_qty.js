/*
 * @author 360 cloud solutions
 * @author mnatusch@360cloudsolutions.com 
 * 
 */

function setQty(type, name, linenum){

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
	} 
