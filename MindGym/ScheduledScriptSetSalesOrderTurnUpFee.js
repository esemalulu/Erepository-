//Enable the Turn Up Fee for the first booking where the client is the same.
function setSalesOrderTurnUpFee()
{

    try
    {

        var searchResults = nlapiSearchRecord('transaction','customsearch_so_turnup_fee');
        var context = nlapiGetContext();
        var executeOnDemand = context.getSetting('SCRIPT','custscript_execute_on_demand');
        var userInternalID = context.getSetting('SCRIPT','custscript_user_internalid');
        
        nlapiLogExecution('DEBUG','EXECUTE ON DEMAND?',"execute: " + executeOnDemand+ " user: "+ userInternalID);
        
        for(var i=0; searchResults!=null && i<searchResults.length && context.getRemainingUsage()>50; i++)
        {
            salesOrderId = searchResults[i].getValue('formulanumeric',null,'min');
            minBookingTime = searchResults[i].getValue('custbody_booking_time',null,'min');
            socoach = searchResults[i].getValue('custbody_coach',null,'group');
            sobookingDate = searchResults[i].getValue('custbody_invoice_date',null,'group');
            soclient = searchResults[i].getValue('name',null,'group');
            
            nlapiLogExecution('DEBUG','DEBUG',salesOrderId+ " "+ eval(minBookingTime==null)+ " "+ socoach+ " "+ sobookingDate+ " "+ soclient);
            
            //if a booking time is available, search for the sales order with the booking time else get the sales orderID
            //this is in case a sales order does not have a booking time so we revert to the first sales order entered which
            //is sorted by booking date
            //if(minBookingTime!=null || minBookingTime!='null' || minBookingTime!='' || minBookingTime!=undefined || minBookingTime!='undefined' )
            if(!eval(minBookingTime==null))
            {
            
                var columns = new Array();
                var filters = new Array();                
                columns[0] = new nlobjSearchColumn( 'internalid' );
                filters[0] = new nlobjSearchFilter( 'custbody_booking_time', null, 'equalto', minBookingTime );                
                filters[1] = new nlobjSearchFilter( 'custbody_coach', null, 'anyof', socoach );                
                filters[2] = new nlobjSearchFilter( 'mainline', null, 'is', 'T');                
                filters[3] = new nlobjSearchFilter( 'custbody_invoice_date', null, 'on', sobookingDate);                
                filters[4] = new nlobjSearchFilter( 'name', null, 'anyof', soclient);                
                
                var searchRecord = nlapiSearchRecord('salesorder',null,filters,columns);                
                salesOrder = nlapiLoadRecord('salesorder',searchRecord[0].getValue('internalid'));                  
                //nlapiLogExecution('DEBUG','booking time search',searchRecord.length+ " "+ salesOrder.getId());
            
            }else{
                salesOrder = nlapiLoadRecord('salesorder',salesOrderId);
            }

            salesOrder.setFieldValue('custbody_coach_turnupfee','T');
            id = nlapiSubmitRecord(salesOrder, true);            
            
        }
        
        
        //if script was manually invoked by suitelet then call script #2 - create po from so
        if(executeOnDemand=='T')
        {
             urlSuitelet = 'https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=40&deploy=1&compid=720154&h=edfb68593ce3b87d753f&executeondemand=T&userid='+userInternalID;
             response =  nlapiRequestURL(urlSuitelet, null, null, null);                         
        }
        
        
    
    
    }
    
    catch (e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString()+ " "+ e.description )
    }             
    


}



//Create purchase order from sales order. Where Turn Up fee and Turn up Logic is True, then substitute with Turn Up Item
function createPOfromSO()
{

    try
    {
        var searchResults = nlapiSearchRecord('transaction','customsearch_so_to_po');
        var context = nlapiGetContext();
        var executeOnDemand = context.getSetting('SCRIPT','custscript_execute_on_demand2');
        var userInternalID = context.getSetting('SCRIPT','custscript_user_internalid2');
        var pId;
        var arrMissingNonInventoryItems = new Array();
        var arrCoachIsNotInItemVendorList = new Array();
        var body;
        
        for(var i=0; searchResults!=null && i<searchResults.length && context.getRemainingUsage()>100; i++)
        {
            salesOrder = nlapiLoadRecord(searchResults[i].getRecordType(), searchResults[i].getId());  
            
            purchaseOrder =  nlapiCreateRecord('purchaseorder');
            purchaseOrder.setFieldValue('customform','108');
            purchaseOrder.setFieldValue('entity', salesOrder.getFieldValue('custbody_coach') );
            //purchaseOrder.setFieldValue('department', salesOrder.getFieldValue('department') );
            //purchaseOrder.setFieldValue('department', '2' );
            purchaseOrder.setFieldValue('memo', 'Created From Sales Order '+salesOrder.getFieldValue('tranid') );
            purchaseOrder.insertLineItem('item',1);
            
                            
            for ( var j=1; j<=salesOrder.getLineItemCount('item'); j++)
            {
                turnUpLogic = salesOrder.getLineItemValue('item','custcol_turn_up_logic',j);
                turnUpItem = salesOrder.getLineItemValue('item','custcol_turn_up_item',j);
                itemType = salesOrder.getLineItemValue('item','custcol_item_type',j);
                defaultItem = salesOrder.getLineItemValue('item','item',j);
                quantity = salesOrder.getLineItemValue('item','quantity',j);
                rate = salesOrder.getLineItemValue('item','rate',j);
                grossamount = salesOrder.getLineItemValue('item','grossamt',j);
                taxcode = salesOrder.getLineItemValue('item','taxcode',j);
                tax1amt = salesOrder.getLineItemValue('item','tax1amt',j);
                taxrate1 = salesOrder.getLineItemValue('item','taxrate1',j);
                amount = salesOrder.getLineItemValue('item','amount',j);

                nlapiLogExecution('DEBUG','SO ITEM TYPES',"sointid: " + salesOrder.getId()+ " lcount: " + salesOrder.getLineItemCount('item')+  " jcount: " +j+ " item type : "+ itemType);
                                  
                //non inventory item                    
                if(itemType==2)
                {
                    nlapiLogExecution('DEBUG','SO ITEM',quantity+ " "+ rate+ " "+ grossamount+ " "+ taxcode + " "+ tax1amt+ " "+ taxrate1);
                    break;
                }
            }
            
            //if non inventory item exists on a line in the sales order
            if(itemType==2)
            {            
                    //retrieve the purchase price of the item given the vendor
                    itemVendorPurchasePrice = getVendorPurchasePricefromItem(defaultItem,salesOrder.getFieldValue('custbody_coach'));
                    nlapiLogExecution('DEBUG','item vendor purchase price',itemVendorPurchasePrice);
                    
                    if(itemVendorPurchasePrice>0)
                    {
                    
                        if(salesOrder.getFieldValue('custbody_coach_turnupfee')=='T' && turnUpLogic=='T' && Number(turnUpItem)>0)                        
                        {
                            purchaseOrder.setLineItemValue('item','item',1,turnUpItem);
                            nlapiLogExecution('DEBUG','PO turn up item',salesOrder.getId()+ " "+ turnUpItem);
                        
                        }else{
                            purchaseOrder.setLineItemValue('item','item',1,defaultItem);
                            nlapiLogExecution('DEBUG','PO default item',salesOrder.getId()+ " "+ defaultItem);
                        }
                        
                        
                        purchaseOrder.setLineItemValue('item','quantity',1,quantity);
                        //purchaseOrder.setLineItemValue('item','rate',1,rate);
                        purchaseOrder.setLineItemValue('item','rate',1,itemVendorPurchasePrice);
                        purchaseOrder.setLineItemValue('item','amount',1,itemVendorPurchasePrice);
                        //purchaseOrder.setLineItemValue('item','grossamt',1,grossamount);
                        purchaseOrder.setLineItemValue('item','taxcode',1,taxcode);
                        //purchaseOrder.setLineItemValue('item','tax1amt',1,tax1amt);
                        purchaseOrder.setLineItemValue('item','taxrate1',1,taxrate1);
                        //purchaseOrder.setLineItemValue('item','amount',1,amount);

                        pId = nlapiSubmitRecord(purchaseOrder, false, true);
                        //nlapiLogExecution('DEBUG','PO CREATED',pId);
                        
                        if(Number(pId)>0)
                        {
                            salesOrder.setFieldValue('custbody_coach_po',pId);
                            sId = nlapiSubmitRecord(salesOrder, true);            
                            //nlapiLogExecution('DEBUG','SALES ORDER UPDATED WITH PO REF',sId);
                        }
                    
                    }else{
                        //raise email to user indicating that coach does not exists in vendor list for the item.
                        arrCoachIsNotInItemVendorList.push(salesOrder);
                    }
                    
                    
            }else{
                //raise email to user indicating sales orders where no non-inventory items are present
                arrMissingNonInventoryItems.push(salesOrder);
                nlapiLogExecution('DEBUG','SALES ORDERS WITH NO NON INV ITEM',arrMissingNonInventoryItems.length);
            
            }                    
            
            
        } 
        
        //when manually invoked send email to user
        if(executeOnDemand=='T')
        {
            body+="<html><body>";
            body+="The following 2 Scripts have finished execution.<p><ul><li>Script 1: Turn Up Fee</li><li>Script 2: Create Purchase Orders from Sales Orders</li></ul>";
            body+=""+renderMissingNonInventoryItems(arrMissingNonInventoryItems);
            body+=""+renderCoachIsNotInItemVendorList(arrCoachIsNotInItemVendorList);            
            body+="</body></html>";            
            sendAnEmailMessage(userInternalID, userInternalID, 'Manual Script Execution: Coaches Purchase Order Script - Completed', body.replace(/undefined/g,""));
            
        //if invoked through scheduled script            
        }else {
                
            if(arrMissingNonInventoryItems.length>0)
            {
                body+="<html><body>";
                body+=""+renderMissingNonInventoryItems(arrMissingNonInventoryItems);
                body+="</body></html>";            
                sendAnEmailMessage(userInternalID, userInternalID, 'Scheduled Script Execution: Coaches Purchase Order Script - Missing Non Inventory Items', body.replace(/undefined/g,""));
            }
        
            if (arrCoachIsNotInItemVendorList.length>0){
                body+="<html><body>";
                body+=""+renderCoachIsNotInItemVendorList(arrCoachIsNotInItemVendorList);
                body+="</body></html>";            
                sendAnEmailMessage(userInternalID, userInternalID, 'Scheduled Script Execution: Coaches Purchase Order Script - Coach not set in Vendor List against Non-Inventory Item', body.replace(/undefined/g,""));
            }        
        
        }
               
    }
   catch (e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }             
 

}

//return the purchase price of a vendor sublist of an item, given the item and vendor ids
function getVendorPurchasePricefromItem(itemId, vendorId)
{

    try
    {
        var itemRecord = nlapiLoadRecord('noninventoryitem',itemId)        
        var purchasePrice = 0;
        var vendor;

        if(itemRecord!=null)
        {
            var vendorList = itemRecord.getLineItemCount('itemvendor');
            //nlapiLogExecution('DEBUG','vendor item purchase list length', vendorList);                    
            
            for (var i=0; i<vendorList; i++)
            {
                vendor= itemRecord.getLineItemValue('itemvendor','vendor',(i+1)); 
                
                if(Number(vendor)==Number(vendorId))
                {
                    //nlapiLogExecution('DEBUG','vendor item purchase price', i+ " " + purchasePrice + " "+ vendor);
                    purchasePrice = itemRecord.getLineItemValue('itemvendor','purchaseprice',(i+1));                
                    break;
                }
                               

            }
        
        }
        
        return purchasePrice;
    
    }

   catch (e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }             


}


//Old Create PO from SO Function
function createPOfromSO_OLD_21_04_2008()
{

    try
    {

        var searchResults = nlapiSearchRecord('transaction','customsearch_so_to_po');
        var context = nlapiGetContext();
        var executeOnDemand = context.getSetting('SCRIPT','custscript_execute_on_demand2');
        var userInternalID = context.getSetting('SCRIPT','custscript_user_internalid2');
        var pId;
        var arrMissingNonInventoryItems = new Array();
        var body;
            body+="<html><body>";

        
        for(var i=0; searchResults!=null && i<searchResults.length && context.getRemainingUsage()>100; i++)
        {
            salesOrder = nlapiLoadRecord(searchResults[i].getRecordType(), searchResults[i].getId());  
            
            purchaseOrder =  nlapiCreateRecord('purchaseorder');
            purchaseOrder.setFieldValue('customform','108');
            purchaseOrder.setFieldValue('entity', salesOrder.getFieldValue('custbody_coach') );
            //purchaseOrder.setFieldValue('department', salesOrder.getFieldValue('department') );
            //purchaseOrder.setFieldValue('department', '2' );
            purchaseOrder.setFieldValue('memo', 'Created From Sales Order '+salesOrder.getFieldValue('tranid') );
            purchaseOrder.insertLineItem('item',1);
            
                            
            for ( var j=1; j<=salesOrder.getLineItemCount('item'); j++)
            {
                turnUpLogic = salesOrder.getLineItemValue('item','custcol_turn_up_logic',j);
                turnUpItem = salesOrder.getLineItemValue('item','custcol_turn_up_item',j);
                itemType = salesOrder.getLineItemValue('item','custcol_item_type',j);
                defaultItem = salesOrder.getLineItemValue('item','item',j);
                quantity = salesOrder.getLineItemValue('item','quantity',j);
                rate = salesOrder.getLineItemValue('item','rate',j);
                grossamount = salesOrder.getLineItemValue('item','grossamt',j);
                taxcode = salesOrder.getLineItemValue('item','taxcode',j);
                tax1amt = salesOrder.getLineItemValue('item','tax1amt',j);
                taxrate1 = salesOrder.getLineItemValue('item','taxrate1',j);
                amount = salesOrder.getLineItemValue('item','amount',j);

                nlapiLogExecution('DEBUG','SO ITEM TYPES',"sointid: " + salesOrder.getId()+ " lcount: " + salesOrder.getLineItemCount('item')+  " jcount: " +j+ " item type : "+ itemType);
                                  
                //non inventory item                    
                if(itemType==2)
                {
                    nlapiLogExecution('DEBUG','SO ITEM',quantity+ " "+ rate+ " "+ grossamount+ " "+ taxcode + " "+ tax1amt+ " "+ taxrate1);
                    break;
                }
            }
            
            //if non inventory item exists on a line in the sales order
            if(itemType==2)
            {            
                    if(salesOrder.getFieldValue('custbody_coach_turnupfee')=='T' && turnUpLogic=='T' && Number(turnUpItem)>0)                        
                    {
                        purchaseOrder.setLineItemValue('item','item',1,turnUpItem);
                        nlapiLogExecution('DEBUG','PO turn up item',salesOrder.getId()+ " "+ turnUpItem);
                    
                    }else{
                        purchaseOrder.setLineItemValue('item','item',1,defaultItem);
                        nlapiLogExecution('DEBUG','PO default item',salesOrder.getId()+ " "+ defaultItem);
                    }
                    
                    
                    purchaseOrder.setLineItemValue('item','quantity',1,quantity);
                    purchaseOrder.setLineItemValue('item','rate',1,rate);
                    //purchaseOrder.setLineItemValue('item','grossamt',1,grossamount);
                    purchaseOrder.setLineItemValue('item','taxcode',1,taxcode);
                    purchaseOrder.setLineItemValue('item','tax1amt',1,tax1amt);
                    purchaseOrder.setLineItemValue('item','taxrate1',1,taxrate1);
                    purchaseOrder.setLineItemValue('item','amount',1,amount);

                    pId = nlapiSubmitRecord(purchaseOrder, false, true);
                    //nlapiLogExecution('DEBUG','PO CREATED',pId);
                    
                    if(Number(pId)>0)
                    {
                        salesOrder.setFieldValue('custbody_coach_po',pId);
                        sId = nlapiSubmitRecord(salesOrder, true);            
                        //nlapiLogExecution('DEBUG','SALES ORDER UPDATED WITH PO REF',sId);
                    }
                    
            }else{
                //raise email to user indicating sales orders where no non-inventory items are present
                arrMissingNonInventoryItems.push(salesOrder);
                nlapiLogExecution('DEBUG','SALES ORDERS WITH NO NON INV ITEM',arrMissingNonInventoryItems.length);
            
            }                    
            
            
        } 
        
        //when manually invoked send email to user
        if(executeOnDemand=='T')
        {
            body+="The following 2 Scripts have finished execution.<p><ul><li>Script 1: Turn Up Fee</li><li>Script 2: Create Purchase Orders from Sales Orders</li></ul>";
            body+=""+renderMissingNonInventoryItems(arrMissingNonInventoryItems);
            body+="</body></html>";            
            sendAnEmailMessage(userInternalID, userInternalID, 'Manual Script Execution: Coaches Purchase Order Script - Completed', body.replace(/undefined/g,""));
            
        //if invoked through scheduled script            
        }else if(arrMissingNonInventoryItems.length>0){
        
            body+=""+renderMissingNonInventoryItems(arrMissingNonInventoryItems);
            body+="</body></html>";            
            sendAnEmailMessage(userInternalID, userInternalID, 'Scheduled Script Execution: Coaches Purchase Order Script - Missing Non Inventory Items', body.replace(/undefined/g,""));
        
        }

        
               

    }
   catch (e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }             
 

}




//get all items where the vendor is missing and hence the purchase price is unavailable
function renderCoachIsNotInItemVendorList(arrCoachIsNotInItemVendorList)
{
    var str="";

    if(arrCoachIsNotInItemVendorList.length>0)
    {
       str+="<p>The following Sales Orders have Coaches that are not set as Vendors against the Non-Inventory Item :<p>";     
    
        for( var i=0; i<arrCoachIsNotInItemVendorList.length; i++)
        {
            str+="<ul>";
            str+="<li>Sales Order "+arrCoachIsNotInItemVendorList[i].getFieldValue('tranid')+"</li>";
            str+="</ul>";
        
        }
    
    }
    
    return str;
}


//get missing non inventory items from array into a string for email to user
function renderMissingNonInventoryItems(arrMissingNonInventoryItems)
{
    var str="";

    if(arrMissingNonInventoryItems.length>0)
    {
       str+="<p>The following Sales Orders do not have a Non-Inventory Item Type:<p>";     
    
        for( var i=0; i<arrMissingNonInventoryItems.length; i++)
        {
            str+="<ul>";
            str+="<li>Sales Order "+arrMissingNonInventoryItems[i].getFieldValue('tranid')+"</li>";
            str+="</ul>";
        
        }
    
    }
    
    return str;
}


//manually execute the Turn Up Fee Scheduled Script. This passes a parameter to the script.
function suiteletExecuteManualTurnUpFeeScript(request,response)
{
    try
    {
        var uid = String(nlapiGetUser());
        
        if (request.getMethod() == 'GET')
        {
            var form = nlapiCreateForm("Run Booking Turn Up Fee / Purchase Order Script");
                form.addSubmitButton('Submit');    
                response.writePage(form);       
        }
        else if (request.getMethod() == 'POST')
        {
            nlapiLogExecution( 'DEBUG', 'USER', nlapiGetUser() )
            scheduleScript = nlapiScheduleScript('customscript_booking_turn_up_fee', 'customdeploy_booking_turn_up_fee', {'custscript_execute_on_demand' : 'T', 'custscript_user_internalid' : uid  }    );
            response.write("The Script is " + scheduleScript);
        }
    
    }    
   catch (e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }             
}

//this suitelet is called from 
function suiteletCreatePOfromSO(request,response)
{
    try
    {
        
            if (request.getMethod() == 'GET' && request.getParameter('executeondemand')=='T' && Number(request.getParameter('userid'))>0)
            {                
                scheduleScript = nlapiScheduleScript('customscript_create_po_from_so', 'customdeploy_create_po_from_so', {'custscript_execute_on_demand2':'T', 'custscript_user_internalid2': request.getParameter('userid')});                
            }
        
        
    }    
   
   catch (e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + '\n' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }             

}



//send an email message
function sendAnEmailMessage(from, to, subject, body)
{
    nlapiLogExecution( 'DEBUG', 'send email', from + " "+ to + " "+ subject+ " "+ body )
	nlapiSendEmail(from, to, subject, body);
	
}



function suiteletTestIQ(request,response)
{
    response.write("THIS IS A TEST!");
}