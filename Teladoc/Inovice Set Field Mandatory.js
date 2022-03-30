function invoiceclientValidateLine(type)
{
        if (nlapiGetLineItemValue('item','custcol_liv_sol_contract_number') == '') 
        {
            alert('Please enter contract number for invoice line.') ;
            return false ;
        }
        else
        {
            return true ;
        };
        /*
        if (nlapiGetLineItemValue('item','custcol_liv_invoice_client_code') == '') //checks if user selects a value for the line item field that we would want to be mandatory
            {
            alert('Please select client code for invoice line.') //optional: alerts the user why he can not add the line
            return false //restricts the user from saving the line because of a missing value for the custom column field.
            }
        else
            return true //allows the user to save the line if a value for the custom column field was filled in
        };

*/
    
}
