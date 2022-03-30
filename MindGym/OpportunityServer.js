function beforeLoad(type, form, request)
{

    nlapiLogExecution('DEBUG','beforeLoad',type);

    try
    {
        var strJScript = "";
        var opportunity = nlapiGetRecordId();
        var customer = nlapiGetFieldValue('entity');
        var salesOrderURL =  nlapiResolveURL('RECORD','salesorder',  null, null);
        var quoteURL =  nlapiResolveURL('RECORD','estimate',  null, null);
        var invoiceURL =  nlapiResolveURL('RECORD','invoice',  null, null);
        var creditmemoURL =  nlapiResolveURL('RECORD','creditmemo',  null, null);
            
        if(type=='view' || type=='edit')
        {
        
                
            if(callOffOpportunity(opportunity))
            {
                salesOrderURL+="?sob=T&opportunity=" + opportunity;        
                quoteURL+="?sob=T&opportunity=" + opportunity;
                invoiceURL+="?sob=T&opportunity=" + opportunity;
                creditmemoURL+="?sob=T&opportunity=" + opportunity;
            
            }else{
            
                salesOrderURL+="?memdoc=0&transform=opprtnty&e=T&id="+opportunity;
                quoteURL+="?memdoc=0&transform=opprtnty&e=T&id="+opportunity;
                invoiceURL+="?memdoc=0&transform=opprtnty&e=T&id="+opportunity;
                creditmemoURL+="?memdoc=0&transform=opprtnty&e=T&id="+opportunity;
                        
            }





             form.addButton( 'custpage_salesorder', 'Sales Order', "window.location.href='" + salesOrderURL + "'" );
             form.addButton( 'custpage_quote', 'Estimate', "window.location.href='" + quoteURL + "'" );
             form.addButton( 'custpage_invoice', 'Invoice', "window.location.href='" + invoiceURL + "'" );
             form.addButton( 'custpage_creditmemo', 'Credit Memo', "window.location.href='" + creditmemoURL + "'" );
        }
    }

    catch (e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + ' ' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }             



}



