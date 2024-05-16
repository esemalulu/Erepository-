function fieldchanged(type, name)
{
  nlapiLogExecution('DEBUG','fieldchnage location');
 		if (name === 'location')
            {
                   var loc = nlapiGetFieldValue('location');
            	   nlapiLogExecution('DEBUG','fieldchnage location' +loc);
                   var itemCount = nlapiGetLineItemCount('item'); 
                    nlapiLogExecution('DEBUG','itemcount' + itemCount);
                	for ( var i = 1; i <= itemCount; i++) 
                	{                     
                        nlapiSelectLineItem('item', i); 
                        nlapiSetCurrentLineItemValue('item', 'location', loc, true, true); 
                        nlapiCommitLineItem('item'); 
                        nlapiLogExecution('DEBUG','i commited=' + i);
                	} 
            
            }
  }
