function setRecEmailAddress(type,form){
    var entityType = nlapiGetFieldValue('entitytype'); 
    var entity = nlapiGetFieldValue('entity'); 

    //Search the Primary Contact
    if (entityType == 'custjob') 
    {
    var val = nlapiGetFieldValue('subject');
    if(val && val.indexOf('Quote') != -1)
    {
        //nlapiSetLineItemValue('ccbcclist', 'copyentity', 1,'146190') ;
        //nlapiSetLineItemValue('ccbcclist', 'email', 1,'invoices@themindgym.com') ;
        //nlapiSetLineItemValue('ccbcclist', 'cc', 1,'T') ;
        //nlapiSetLineItemValue('ccbcclist', 'bcc', 1,'F') ;

        var trans= nlapiLoadRecord('estimate', nlapiGetFieldValue('transaction'));
        var ownerId = trans.getFieldValue('custbody_owner');
        if(ownerId && ownerId .length > 0)
        {
             var owner = nlapiLoadRecord('employee', ownerId );
             var ownerEmail = owner.getFieldValue('email');
             nlapiSetLineItemValue('ccbcclist', 'copyentity', 2, ownerId) ;
             nlapiSetLineItemValue('ccbcclist', 'email', 2, ownerEmail) ;
             nlapiSetLineItemValue('ccbcclist', 'cc', 2,'F') ;
             nlapiSetLineItemValue('ccbcclist', 'bcc', 2,'T') ;
        }

    }	
    }
}




