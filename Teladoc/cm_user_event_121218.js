/* last updated : 121218 */

function beforeSubmit(type)
{
   if (type == 'create' || type == 'edit')
   {
       var ccemail =  'billing@livongo.com';
       var soldtocustid = nlapiGetFieldValue('custbody_liv_sold_to_customer');
       nlapiLogExecution('DEBUG','soldtocustid : '+ soldtocustid) ;

       if ( (soldtocustid  == 6460) || (soldtocustid  == 1700))
       {
           nlapiSetFieldValue('custbody_liv_cc_email', ccemail );
       }
   }

}
