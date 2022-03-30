//*NS-548 Script to Set Name Mandatory when Account is of Type Income //

function LivsetMandatory(type)
{
  var context = nlapiGetContext();
  if(type == 'create')
  {
     for ( var i =1 ; i < nlapiGetLineItemCount('line') ; i++)
         {
        {		
           	nlapiSetFieldMandatory('name' , true);
         }
  }
}
}