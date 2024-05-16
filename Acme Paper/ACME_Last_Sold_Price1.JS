/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error', 'N/record', 'N/search','N/ui/dialog'],
    function(error, record, search, dialog) {
  
  function pageInit(scriptContext) {
    	
    	dialog.alert({
    	    title: 'I am an Alert',
    	    message: 'Page init' 
    	}); 

    }
   function fieldChanged(context) {
   }
  
function postSourcing(context) {
            var objRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var sublistFieldName = context.fieldId;
      dialog.alert({
            title: 'Debug Entry',
            message: 'Client script'
        });
          
     /*      var line1 = context.line;
				if (sublistName === 'item' && sublistFieldName== 'item') {
				var rate1;
				var item = objRecord.getCurrentSublistValue({
				 sublistId: "item", 
				 fieldId: "item"
				 });
				var invoiceSearchObj = search.create({
					   type: "invoice",
					   filters:
					   [
						  ["mainline","is","F"], 
						  "AND", 
						  ["type","anyof","CustInvc"], 
						  "AND", 
						  ["shipping","is","F"], 
						  "AND", 
						  ["taxline","is","F"], 
						  "AND", 
						  ["item","anyof",item]
					   ],
					   columns:
					   [
						  search.createColumn({name: "rate", label: "Item Rate"}),
						  search.createColumn({
							 name: "trandate",
							 sort: search.Sort.DESC,
							 label: "Date"
						  }),
						  search.createColumn({name: "entity", label: "Name"})
					   ]
					});
					var searchResultCount = invoiceSearchObj.runPaged().count;
					alert("invoiceSearchObj result count"+searchResultCount);
					invoiceSearchObj.run().each(function(result){
					   // .run().each has a limit of 4,000 results
					   rate1 = result.getValue({name: "rate", label: "Item Rate"})
					   return false;
					});
					
					if(!rate1){
						 rate1 = objRecord.getCurrentSublistValue({
					 sublistId: "item", 
					 fieldId: "rate"
					 });
					}
				
					
				objRecord.setCurrentSublistValue({
				 sublistId: "item", 
				 fieldId: "custcol_acme_last_sold_price", 
				 value: rate1
				 });	
				} */
				
			
        }
		
 return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            postSourcing: postSourcing
        };
    });
	