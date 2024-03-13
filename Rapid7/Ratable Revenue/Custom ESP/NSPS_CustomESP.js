
/* Fixed number Custom ESP
function customESP_CS()
{

        var esp = 111.11;

        nlapiLogExecution('DEBUG','client function', esp );

        return esp;
}


function customESP_SS(item_id, item_index)
{

        var esp = 222.22;

        nlapiLogExecution('DEBUG','server function', esp );

        return esp;
}
*/

/* Client Side Custom ESP*/
function customESP_CS()
{
       nlapiLogExecution('DEBUG','customESP_CS', 'customESP_CS' );

       //var espPrice = retrieveESPPrice_CS();
       var espPrice = retrieveESPPrice('','','1');
       nlapiLogExecution('DEBUG','Called by Client function, ESP Price: ', espPrice );

	return espPrice;
}


function customESP_SS(item_id, item_index)
{
     nlapiLogExecution('DEBUG','customESP_SS', 'customESP_SS' );

     //var espPrice = retrieveESPPrice_SS(item_index);

	 var espPrice = retrieveESPPrice(item_id, item_index,'2');
     nlapiLogExecution('DEBUG','Called by Server function, ESP Price: ', espPrice );
     return espPrice;
}


/*function retrieveESPPrice_CS()
{
	var espPrice = nlapiGetCurrentLineItemValue('item','custcol_custom_esp');
	return espPrice;
}



function retrieveESPPrice_SS(lineNum)
{
	 nlapiLogExecution('DEBUG','customESP_SS', 'customESP_SS' );

	 var espPrice = nlapiGetLineItemValue('item', 'custcol_custom_esp',lineNum);
	nlapiLogExecution('DEBUG','server side call', espPrice );
	return espPrice;
}*/


function retrieveESPPrice(itemId, lineNum, callType)
{
 var esp;
 nlapiLogExecution('DEBUG','retrieveESPPrice', '--Entry--' );

 if (callType =='1')
 {
    nlapiLogExecution('DEBUG','retrieveESPPrice', 'Client Side callType:' + callType );

    esp = nlapiGetCurrentLineItemValue('item','custcol_custom_esp');

    nlapiLogExecution('DEBUG','client side call', esp );
 }

if (callType =='2')
 {
   nlapiLogExecution('DEBUG','retrieveESPPrice', 'Server Side callType:'+ callType );

   esp = nlapiGetLineItemValue('item', 'custcol_custom_esp',lineNum);

   nlapiLogExecution('DEBUG','server side call', esp );
}
 nlapiLogExecution('DEBUG','retrieveESPPrice', '--Exit--' );
return esp;
}




