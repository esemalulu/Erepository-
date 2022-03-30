function pageInit(type, form, request)
{

    if(type=='view')
    {
    
        var filters = new Array();
        filters[0] = new nlobjSearchFilter( 'custbody_opportunity', null, 'is', '27' );
        var objSR = nlapiSearchRecord('transaction', 'customsearch1', filters, null);
        
        
        if( objSR!= null && objSR.length==1)
        {
            var totalCurrencyNet = objSR[0].getValue('formulacurrency',null,'sum');
        
          nlapiLogExecution('DEBUG','GET ALL COLS',totalCurrencyNet);            
    }
        
        
        
        /*        
         columns = objSR[0].getAllColumns();
         for (j = 0 ; columns != null && j < columns.length; j++) 
         {
                        nlapiLogExecution('DEBUG','GET ALL COLS',columns[j].getName() + " "+ columns[j].getJoin()+ " "+ objSR[0].getValue(columns[j].getName(),null,'group')+ " "+  objSR[0].getValue(columns[j].getName(),null,'sum'));            
        }     
        */
            
            
    
    }


}