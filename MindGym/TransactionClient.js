function pageInit(type)
{
    var createdFrom = nlapiGetFieldValue('createdfrom');
    var opportunity = nlapiGetFieldValue('custbody_opportunity');    
    
    if ((Number(createdFrom) > 0) && (Number(opportunity) == 0)) {
        var opportunityEntityId = nlapiLookupField('opportunity', createdFrom, 'entity', false);
        //alert('Netsuite Debug ' + Number(opportunityEntityId));
        
        if (Number(opportunityEntityId) > 0) {
            nlapiSetFieldValue('custbody_opportunity', createdFrom);
        }
    }
}

function validateLine(type)
{
    return true;
}

function saveRecord()
{
    //var lineItemCount = nlapiGetLineItemCount('item');
    //var itemType;
    //var itemCount = 0;
    
    /*
    if(nlapiGetFieldValue('customform')=='100' && Number(nlapiGetFieldValue('custbody_coach'))==0)
    {
        alert("Please select a Coach for this booking.");
        return false;
    }
    */
    /*
    if (nlapiGetFieldValue('customform') == '100' && Number(nlapiGetFieldValue('custbody_coach')) > 0) {
	    
        for (var i=1; i<=lineItemCount; i++) {
            itemType =  nlapiGetLineItemText('item','custcol_item_type',i);
            if(itemType=='Non-inventory Item') itemCount++;
        }
        
        if (itemCount > 1) {
            alert("A Booking can only have one Non-inventory Item");
            return false;
        }
    }
    */

	// Set sales order category
	switch (nlapiGetFieldValue('customform')) {
		case '100': // Booking Form
			nlapiSetFieldValue('custbody_category', 1); // Booking
			break;
	}
	
	return true;
}