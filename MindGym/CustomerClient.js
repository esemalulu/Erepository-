
function saveRecord()
{
    
    if(Number(nlapiGetFieldValue('parent'))>0)
    {
        var parentCurrency = Number(nlapiLookupField('customer',nlapiGetFieldValue('parent'),'currency',false));
        var myCurrency =  Number(nlapiGetFieldValue('currency'));
        
        if(parentCurrency!=myCurrency)
        {
            alert("Customer " + nlapiGetFieldValue('companyname')+ " must have the same Currency as "+ nlapiGetFieldText('parent') );
            return false;
        }
    
    }

    return true;

}