function updategldate(rec_type, rec_id) 
{
		var rec = nlapiLoadRecord(rec_type, rec_id);  //10 units
	
		
		var arrFilter = new Array(); 
        arrFilter[0] = new nlobjSearchFilter('internalid', null, 'is',  rec_id ); 

  
        var searchresults = nlapiSearchRecord('transaction','customsearch_liv_update_gl_date', arrFilter, null);

       if(searchresults) 
       { 
           for(var z=0; z < searchresults.length; z++) 
           { 

               var results=searchresults[z];
               var columns=results.getAllColumns();  

               var gldate =results.getValue(columns[6]); 
               
               rec.setFieldValue('custbody_liv_gl_impact_date', gldate);
               
             }
        }

            var id = nlapiSubmitRecord(rec); //20 units
            
            
            
}
