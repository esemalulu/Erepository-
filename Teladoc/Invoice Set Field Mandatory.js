function invoiceclientValidateLine(type)
{


        if (nlapiGetLineItemValue('item','custcol_liv_sol_contract_number') == ' ') 
        {
            alert('Please enter contract number for invoice line.') ;
            return false ;
        }
        return true;
        /*
        if (nlapiGetLineItemValue('item','custcol_liv_invoice_client_code') == '') 
        {
            alert('Please select client code for invoice line.') ;
            return false ;
        }
        else
        {
            return true;
        };

*/
    
}
