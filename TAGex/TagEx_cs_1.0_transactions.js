//contact as join

/**
 * Filtered buyer list on transaction uses Suitelet to dynamically grab and build custom field.
 * This is because record can be created and/or edited by user and customer value can be changed.
 * @param type
 * @param form
 * @param request
 */



function forfietall() {

    var count=nlapiGetLineItemCount('item'); //gets the count of lines
    for(var i=1;i<=count;i++) 
    {
        nlapiSelectLineItem('item',i);
        var itemType = nlapiGetCurrentLineItemValue('item','itemtype')
        //if(itemType == 'InvtPart')     
        nlapiSetCurrentLineItemValue('item','custcol_tagex_forfiet','T',true,true); //'custcol_checkbox_field' is checkbox's field ID.
    }
        nlapiCommitLineItem('item');

  
//return true;
}


function abandonall() {

    var count=nlapiGetLineItemCount('item');
    for(var i=1;i<=count;i++) 
    {
        nlapiSelectLineItem('item',i);
        var itemType = nlapiGetCurrentLineItemValue('item','itemtype')
        //if(itemType == 'InvtPart')
        nlapiSetCurrentLineItemValue('item','custcol_tagex_abandon','T',true,true); //'custcol_checkbox_field' is checkbox's field ID.
    }
        nlapiCommitLineItem('item');   

//return true;
}

