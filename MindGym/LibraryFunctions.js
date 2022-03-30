//before load
function transaction_beforeLoad()
{
    try
    {
        //for every sales order, check if the salesorder is being created from an opportunity
        //if it is, raise an alert and indicate to the user the sales order custom button must
        //be used to raise a sales order from an opportunity
        
        var objContext = nlapiGetContext();
        var createdFrom = nlapiGetFieldValue('createdfrom');
        var sob = request.getParameter('sob');
        var opportunityID = request.getParameter('opportunity');
        var transform = request.getParameter('transform');
        var transformId =request.getParameter('id'); 
        var redirectUrl = nlapiResolveURL('SUITELET','customscript_msg_suitelet','customdeploy_msg_suitelet');
            redirectUrl += "&msgtype=1";
        
        nlapiLogExecution('DEBUG','beforeLoad',type);
        
       
        //hide the standard opportunity field
        if(type=='create' || type=='edit' || type=='view')
        {        
            if(nlapiGetRecordType()!='creditmemo')
            {
                form.getField('opportunity').setDisplayType('hidden');             
            }
            
            objContext.setSetting('SESSION', 'sob', null);
        }
        
        if(type=='create')
        {                                                 
             //nlapiLogExecution('DEBUG','isTransactionCalledOffAgainstOpportunity?',createdFrom+ " "+ isTransactionCalledOffAgainstOpportunity(createdFrom));                            
            //if(Number(createdFrom) > 0)
            //if(Number(createdFrom) > 0 && isTransactionCalledOffAgainstOpportunity(createdFrom))

            if(Number(createdFrom) > 0)            
            {
                 //the redirect URL does not work so we use an inline HTML field to redirect using javascript
                 //not a nice hack but no choice until this is fixed in the product
                 //this MAY be a bug...                 
                 // nlapiLogExecution('DEBUG','beforeLoad',nlapiResolveURL('SUITELET', 10, 1));
                 //nlapiSetRedirectURL('SUITELET', 10, 1, null, params);                 
                 //nlapiSetRedirectURL('EXTERNAL', 'https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=10&deploy=1&compid=720154&h=d379e45c28bdd83182bd');            

                
                
                //objField = form.addField('custpage_message', 'inlinehtml', '');
                //form.insertField(objField, 'entity');
                //form.getField('custpage_message').setDefaultValue('<script>window.location.href="'+redirectUrl+'"</script>');
                
                //20-02-2008
                nlapiSetFieldValue('custbody_opportunity', createdFrom);
                //nlapiLogExecution('DEBUG','createdFrom > 0',createdFrom  + " "+ eval(createdFrom>0)  );
            }
            
            
            //else if (sob=='T' && Number(opportunityID)>0 )  
            else if (sob=='T' && Number(opportunityID)>0 && callOffOpportunity(opportunityID))
            {                                
                //set session variable to confirm that sales order was sourced from sales order button
                objContext.setSetting('SESSION', 'sob', 'T'); 
                
                //set header fields on sales order from the related opportunity            
                var objOpportunityRecord = nlapiLoadRecord('opportunity', opportunityID);
                
                nlapiSetFieldValue('entity', objOpportunityRecord.getFieldValue('entity')   );
                nlapiSetFieldValue('department', objOpportunityRecord.getFieldValue('department')   );
                nlapiSetFieldValue('custbody_opportunity', objOpportunityRecord.getId()   );
                
                //set item fields on sales order from the related opportunity            
                for ( var i=1; i<=objOpportunityRecord.getLineItemCount('item'); i++)
                {
                     nlapiInsertLineItem('item', i);                 
                     setSalesOrderLine('item', i , objOpportunityRecord);
                     setSalesOrderLine('quantity', i , objOpportunityRecord);
                     setSalesOrderLine('description', i , objOpportunityRecord);
                     setSalesOrderLine('price', i , objOpportunityRecord);
                     setSalesOrderLine('rate', i , objOpportunityRecord);
                     setSalesOrderLine('amount', i , objOpportunityRecord);
                     setSalesOrderLine('taxcode', i , objOpportunityRecord);
                     setSalesOrderLine('tax1amt', i , objOpportunityRecord);
                     setSalesOrderLine('taxrate1', i , objOpportunityRecord);                
                }
                
            }            
                                    
            nlapiLogExecution('DEBUG','beforeLoad',type+ " "+ createdFrom+ " "+ objContext.getRemainingUsage()+ " "+ transform+ " " + transformId );
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




//before submit 
function transaction_beforeSubmit()
{
   try
    {   
        //if a sales order has been deleted or cancelled, increment the probability on the opportunity to account for the sales order
        //being deleted. This has been assigned in a before Submit to ensure the sales order transaction data is exposed
        //before the delete occurs in the afterSubmit.
        nlapiLogExecution('DEBUG','before submit',type);
        if(type=='delete' || type=='cancel')
        {
                nlapiLogExecution('DEBUG','before submit2','');
                
            if( nlapiGetRecordType()=='salesorder' ||  nlapiGetRecordType()=='estimate' ||  nlapiGetRecordType()=='invoice' || nlapiGetRecordType()=='creditmemo')
            {               
                var objDeletedSalesOrder = nlapiGetOldRecord();            
                var createdFrom = Number(nlapiGetFieldValue('createdfrom'));
                
                //var opportunityId = objDeletedSalesOrder.getFieldValue('custbody_opportunity');
                
                

                        
                //when a transaction is deleted or cancelled then remove related sales order link in opportunity
                
                //26-02-08
                //if(type=='delete' && createdFrom==0 && callOffOpportunity(opportunityId) )
                //if(type=='delete' || type=='cancel')            
                //{                
                    //nlapiLogExecution('DEBUG','delete debug',objDeletedSalesOrder.getRecordType()+ " "+ objDeletedSalesOrder.getId() + " "+ nlapiGetRecordId() );
                    deleteRelatedSalesOrderId(objDeletedSalesOrder.getId());
                //}
            
            }
        
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


//after submit              
function transaction_afterSubmit()
{    
   try      
    {
        nlapiLogExecution('DEBUG','after submit','');
        var objContext = nlapiGetContext(); 
        var totalSalesOrderNet = 0;
        var createdFrom =  Number(nlapiGetFieldValue('createdfrom'));
                      
        //only call off transactions deleted from opportunity. Dont call off transactions that were created from others e.g. sales order from 
        //estimate or invoice from sales order. The createdFrom field is used to verify this.        
        //if(type=='create' && createdFrom==0 && Number(nlapiGetFieldValue('custbody_opportunity'))>0 && callOffOpportunity(nlapiGetFieldValue('custbody_opportunity')) )        
        //if((type=='create'  || type=='edit' || type=='delete' ) && createdFrom==0 && Number(nlapiGetFieldValue('custbody_opportunity'))>0 && callOffOpportunity(nlapiGetFieldValue('custbody_opportunity')) )                        
        //if((type=='create'  || type=='edit' || type=='delete') && Number(nlapiGetFieldValue('custbody_opportunity'))>0)        
        if((type=='create'  || type=='edit' || type=='delete' || type=='cancel') && Number(nlapiGetFieldValue('custbody_opportunity'))>0)        
        {            
            //create an entry in related sales order custom record 
            if(type=='create' )
            {
                storeRelatedTransaction(nlapiGetRecordType(), nlapiGetRecordId(), nlapiGetFieldValue('custbody_opportunity'), nlapiGetFieldValue('custbody_invoice_date'), nlapiGetFieldValue('total')  );            
            }
            else if (type=='edit')
            {
                //update Related Transaction                                
                nlapiLogExecution('DEBUG','related transaction update',nlapiGetRecordId()+ " " +  nlapiGetFieldValue('total'));
                updateRelatedTransaction(nlapiGetRecordId(), nlapiGetFieldValue('total'));            
            }

            //set the probability on the opportunity if the opportunity can be called off and has not been transformed ie. created from                        
            if(createdFrom==0 && callOffOpportunity(nlapiGetFieldValue('custbody_opportunity')))
            {
                decreaseOpportunityProbability(nlapiGetFieldValue('custbody_opportunity'), nlapiGetRecordType() );
            }else if (createdFrom>0 && callOffOpportunity(nlapiGetFieldValue('custbody_opportunity')) && nlapiGetRecordType()=='creditmemo' ){
                decreaseOpportunityProbability(nlapiGetFieldValue('custbody_opportunity'), nlapiGetRecordType() );
            }
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

//update related transaction on linked custom record when edited    
function updateRelatedTransaction(internalId, totalAmount)
{
    var filters = new Array();
    var columns = new Array();
    
    filters[0] = new nlobjSearchFilter('custrecord_salesorder_internalid', null, 'is', internalId);
    columns[0] = new nlobjSearchColumn( 'internalid', null, null);
        
    objSearchRecord = nlapiSearchRecord('customrecord_sales_order',null,filters,null);
    
    if(objSearchRecord!=null && objSearchRecord.length==1)
    {
        nlapiSubmitField('customrecord_sales_order',objSearchRecord[0].getId(),'custrecord_amount',totalAmount,false);
    }
    
    
    //nlapiLogExecution('DEBUG','related transaction update2', objSearchRecord.length+ " "+ objSearchRecord[0].getId()     );    
    
}

//store related transaction in linked custom record displayed on the opportunity
function storeRelatedTransaction(recordType, recordId, opportunityId, invoiceDate, totalAmount)
{
    var url = "https://system.netsuite.com" + nlapiResolveURL('RECORD', recordType, recordId, false);
    var strRecordType;
    var objRecord =  nlapiCreateRecord('customrecord_sales_order');
    var createdFrom = nlapiLookupField(recordType,recordId,'createdfrom',true);    
    var tranId = nlapiLookupField(recordType,recordId,'tranid',false);    
    
        objRecord.setFieldValue('custrecord_opportunity', opportunityId   );
        objRecord.setFieldValue('custrecord_sales_order', url   );
        objRecord.setFieldValue('custrecord_order_date', invoiceDate   );
        
        
        switch (recordType)
        {
            case "invoice":
                strRecordType="Invoice";
                break;
            case "creditmemo":
                strRecordType="Credit Memo";
                objRecord.setFieldValue('custrecord_amount', totalAmount   );
                break;
            case "salesorder":
                strRecordType="Sales Order";
                break;
            case "estimate":
                strRecordType="Estimate";
                break;
            default:    
                strRecordType="";            
                break;
        }

        objRecord.setFieldValue('custrecord_transaction_type', strRecordType   );        
                        
        if (createdFrom==null || createdFrom=='')
        {
            createdFrom = "Opportunity # " + nlapiLookupField('opportunity',opportunityId,'tranid',false);
            objRecord.setFieldValue('custrecord_amount', totalAmount   );
        }
        
        objRecord.setFieldValue('custrecord_tran_id', tranId );
        objRecord.setFieldValue('custrecord_created_from', createdFrom   );
        
        var id = nlapiSubmitRecord(objRecord, true);
        //nlapiLogExecution('DEBUG','store related transaction createdfrom', createdFrom);
}
    

//sets the probability % when a transaction is deleted
//increase raises the probability % against the opportunity        
function increaseOpportunityProbability(opportunityId, deletedrecordType, createdFrom, subTotal, discountTotal )
{
    var objOppRecord = nlapiLoadRecord('opportunity', opportunityId );    
    
    //only call off transactions deleted from opportunity. Dont call off transactions that were created from others e.g. sales order from 
    //estimate or invoice from sales order.The createdFrom field is used to verify this
    
    if(Number(createdFrom)==0 && callOffOpportunity(opportunityId)  )
    {                
        var probability = parseInt(objOppRecord.getFieldValue('probability'));
        var projectedTotal = objOppRecord.getFieldValue('projectedtotal');

        var newWeightedTotal = (Number(subTotal) - Number(discountTotal) ) / Number(projectedTotal) * 100;
        var newProbability = probability + newWeightedTotal;

        eval(newProbability>=100) ? newProbability = 99 : newProbability = newProbability;

        objOppRecord.setFieldValue('entitystatus','21');
        objOppRecord.setFieldValue('probability',newProbability);
        var id2 = nlapiSubmitRecord(objOppRecord, true);                  
        
        nlapiLogExecution('DEBUG','increaseProbability', opportunityId+","+deletedrecordType+","+createdFrom+","+subTotal+","+discountTotal );
        nlapiLogExecution('DEBUG','increaseProbability2', probability+","+ projectedTotal+","+ newWeightedTotal+","+ newProbability);                      
    }
}
    

//decrease the probability by the amount of credit memo percentage being removed.
function creditMemoDecreaseOpportunityProbability(opportunityId, creditMemoId)    
{
    var objOppRecord = nlapiLoadRecord('opportunity', opportunityId );
    var projectedTotal = Number(objOppRecord.getFieldValue('projectedtotal'));
    var probability = objOppRecord.getFieldValue('probability').replace("%","");
    var weightedTotal = objOppRecord.getFieldValue('weightedtotal');
    var creditMemoNet=0;

    var filters = new Array();
    filters[0] = new nlobjSearchFilter( 'custbody_opportunity', null, 'is', opportunityId );
    filters[1] = new nlobjSearchFilter( 'internalid', null, 'anyof', creditMemoId );
    
    var objRecord = nlapiSearchRecord('transaction','customsearch_creditmemo_per_opp',filters,null);

    if( objRecord!= null && objRecord.length==1)
    {
        creditMemoNet = objRecord[0].getValue('formulacurrency',null,'group').replace("-","");    
    }
    
    var newProbability = Number(probability) - (  (Number(creditMemoNet) / Number(projectedTotal)) * 100);      
    
    eval(newProbability>=100) ? newProbability = 99 : newProbability = newProbability;

    objOppRecord.setFieldValue('probability',newProbability);
    var id2 = nlapiSubmitRecord(objOppRecord, true);                
    


}
    
//sets the probability % and opportunity status depending on the transaction type
//decrease lowers the probability % against the opportunity.            
function decreaseOpportunityProbability(opportunityId, recordType)
{           
    //in the opportunity, set status and adjust probability and weighted total
    var objOppRecord = nlapiLoadRecord('opportunity', opportunityId );
    var projectedTotal = Number(objOppRecord.getFieldValue('projectedtotal'));
    var probability = objOppRecord.getFieldValue('probability');
    totalSalesOrderNet = Number(getNetTotalSalesOrderPerOpportunity( opportunityId ));
    var newWeightedTotal = Number(100 - (  (Number(totalSalesOrderNet) / Number(projectedTotal)) * 100));
    
    
        
    //set probability to 100 to set opportunity status to closed - won
    //eval(newWeightedTotal<=0) ? newWeightedTotal = 100 : newWeightedTotal = newWeightedTotal;
    
    //IQ 19-02-08    
    //eval(newWeightedTotal>99) ? newWeightedTotal = 99 : newWeightedTotal = newWeightedTotal;
    
    if(newWeightedTotal<=0)
    {
        newWeightedTotal = 100;
    }
    else if(newWeightedTotal>99)
    {
        newWeightedTotal = 99;
    }
    

    if(newWeightedTotal==100)
    {
        objOppRecord.setFieldValue('entitystatus','13');
    }else{
        objOppRecord.setFieldValue('entitystatus','21');
    }
    nlapiLogExecution('DEBUG','opp adjust 1', totalSalesOrderNet+ " "+ projectedTotal+ " "+ newWeightedTotal + " "+ newWeightedTotal.toFixed(4) );
        
    objOppRecord.setFieldValue('probability',newWeightedTotal.toFixed(4));
    var id2 = nlapiSubmitRecord(objOppRecord, true);                

    nlapiLogExecution('DEBUG','opp adjust', totalSalesOrderNet+ " "+ projectedTotal+ " "+ newWeightedTotal );
}
               
    
//set line item fields on the sales order from the related opportunity
function setSalesOrderLine(field, lineNumber, objOpportunityRecord)
{
    nlapiSetLineItemValue('item',  field, lineNumber, objOpportunityRecord.getLineItemValue('item',field,lineNumber)    );
}


//return the net total of all sales orders for an opportunity
function getNetTotalSalesOrderPerOpportunity(intOpportunityNumber)
{
    try
    {
        var filters = new Array();
        var totalCurrencyNet = 0;
        filters[0] = new nlobjSearchFilter( 'custbody_opportunity', null, 'is', intOpportunityNumber );
        //var objSR = nlapiSearchRecord('transaction', 'customsearchtotal_so_per_opp', filters, null);
        var objSR = nlapiSearchRecord('transaction', 'customsearch_sum_trx_per_opp', filters, null);
                
        if( objSR!= null && objSR.length==1)
        {
            //totalCurrencyNet = objSR[0].getValue('formulacurrency',null,'sum');        
            totalCurrencyNet = objSR[0].getValue('netamount',null,'sum');        
            
            
        }

        return totalCurrencyNet;
        
    }
    catch(e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + ' ' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }

}   



//when a sales order is deleted, also delete the related sales order link from the custom record on the opportunity
function deleteRelatedSalesOrderId(salesOrderInternalID)
{
    try
    {
        var filters = new Array();
        var relatedId = 0;
        
        filters[0] = new nlobjSearchFilter( 'custrecord_salesorder_internalid', null, 'is', salesOrderInternalID );        
        
        var linkedSR = nlapiSearchRecord('customrecord_sales_order', null,filters,null);
        
        if(linkedSR!=null && linkedSR.length==1)
        {
            relatedId = linkedSR[0].getId();
            nlapiDeleteRecord('customrecord_sales_order',relatedId);
        }
        
        nlapiLogExecution('DEBUG', 'delete related sales order', "deleted " + relatedId + " for sales order "+ salesOrderInternalID );

    }
    catch(e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + ' ' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }
}

//given the internal id of a transaction, determines if the transaction has been called off against an opportunity
function isTransactionCalledOffAgainstOpportunity(transactionInternalID)
{
    try
    {
        var filters = new Array();
        var blnRelatedId = false;
        
        filters[0] = new nlobjSearchFilter( 'custrecord_salesorder_internalid', null, 'is', transactionInternalID );        
        
        var linkedSR = nlapiSearchRecord('customrecord_sales_order', null,filters,null);
        
        if(linkedSR!=null && linkedSR.length==1)
        {
            blnRelatedId = true;
        }
    }
    catch(e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + ' ' + e.getDetails() )        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }
 
    return blnRelatedId;
}
    
//check if an opportunity is of the correct form and can be called off against.
function callOffOpportunity(opportunity_internalid)
{
    try
    {
        var output = false;
        
        objRecord = nlapiLoadRecord('opportunity',opportunity_internalid);
        
        if(objRecord.getFieldValue('custbody_opp_call_off_form')=='T' && objRecord.getFieldValue('custbody_membership_terms')==1)
        {
            output = true;    
        }
    
    }

    catch (e)
    {
        if ( e instanceof nlobjError )
            nlapiLogExecution( 'DEBUG', 'system error', e.getCode() + ' ' + e.getDetails() )
        
        else
            nlapiLogExecution( 'DEBUG', 'unexpected error', e.toString() )
    }             

    return output;

    
}
