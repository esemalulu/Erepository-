/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/ui/dialog'],

function(record, search, dialog) {
    
    function fieldChanged(scriptContext)
    {
    	 if (scriptContext.fieldId === 'entity')
         {
         	//log.debug({title : 'FieldChanged', details : scriptContext.fieldId});
         	/*dialog.alert({
            title: 'FieldChanged - entity',
            message: 'FieldChanged' 
        	});*/
            var currentRec = scriptContext.currentRecord;
            var entity = currentRec.getValue({ fieldId : 'entity' });
            if(entity != null && entity != '' && entity != undefined && entity != 'undefined')
            {
            	var primaryEmailID = currentRec.getValue({ fieldId : 'custbody_cust_primary_email' });
            	var contactsIdArr = [];
            	var contactsEmailArr = [];
            	var concatEmailIds = '';
             	//Search contacts with to be emailed check is true
             	var contactObj = search.create({
             	   type: "contact",
             	   filters:
             	   [
             	      ["company","anyof",entity], 
             	      "AND", 
             	      ["custentity_to_be_emailed","is","T"]
             	   ],
             	   columns:
             	   [ search.createColumn({name: "email", label: "Email"}) ]
             	});
             	var searchResultCount = contactObj.runPaged().count;
              /* 	dialog.alert({
                title: 'FieldChanged - entity - searchResultCount',
                message: searchResultCount 
            	});*/
             	//log.debug("contactObj result count",searchResultCount);
               	if(searchResultCount != null && searchResultCount != '')
               	{
               	 	contactObj.run().each(function(result){
                 		contactsIdArr.push(result.id);
                 		if(result.getValue({name : 'email'}) != null && result.getValue({name : 'email'}) != '')
                 			contactsEmailArr.push(result.getValue({name : 'email'}));
                 		return true;
                 	});
               	}
            
               // log.debug('contactsEmailArr', contactsEmailArr);
               	if(primaryEmailID == undefined || primaryEmailID == 'undefined' || primaryEmailID === null)
                      primaryEmailID = '';
                if(primaryEmailID != null && primaryEmailID != '' && primaryEmailID != undefined && primaryEmailID != 'undefined')
                 concatEmailIds = primaryEmailID.concat(";");
                for(var i = 0; i < contactsEmailArr.length ; i++)
                {
                	concatEmailIds += contactsEmailArr[i].concat(";");
                }
            /*    dialog.alert({
                title: 'FieldChanged - entity - searchResultCount',
                message: 'contactsIdArr:'+contactsIdArr+'concatEmailIds:'+concatEmailIds
            	});*/
                if(contactsIdArr != null && contactsIdArr != '' && concatEmailIds != null && concatEmailIds != '' && concatEmailIds != undefined && concatEmailIds != 'undefined')
                {
                    currentRec.setValue('custbody_contacts', contactsIdArr);
                    currentRec.setValue('tobeemailed', true);
        	   		currentRec.setValue('email', concatEmailIds);
                }
  
            }
         }
        
    	 
    	 if (scriptContext.fieldId === 'custbody_contacts')
         {
        	//log.debug({title : 'FieldChanged', details : scriptContext.fieldId});
        	var  fianlemailID = '';
        	var contactsEmailIdArr = [];
            var currentRec = scriptContext.currentRecord;
        	var primaryEmail = currentRec.getValue({ fieldId : 'custbody_cust_primary_email' });
            var contactsSelected = currentRec.getValue({ fieldId : 'custbody_contacts' });
   			//log.debug({title : 'FieldChanged', details : "contactsSelected : "+ contactsSelected});
   			if(primaryEmail == undefined || primaryEmail == 'undefined' || primaryEmail === null)
              primaryEmail = '';
            if(primaryEmail != null && primaryEmail != '' && primaryEmail != undefined && primaryEmail != 'undefined')
            	fianlemailID = primaryEmail.concat(";");
   			if(contactsSelected != null && contactsSelected != '')
   			{
   				var contactSearchObj = search.create({
   	   			   type: "contact",
   	   			   filters:
   	   			   [
   	   			      ["internalid","anyof",contactsSelected]
   	   			   ],
   	   			   columns:
   	   			   [ search.createColumn({name: "email", label: "Email"})  ]
   	   			});
   	   			var consearchResultCount = contactSearchObj.runPaged().count;
   	   			//log.debug("contactSearchObj result count",searchResultCount);
   	   			if(consearchResultCount != null && consearchResultCount != '')
   	   			{
	   	   			contactSearchObj.run().each(function(result){  	   				
	   	   				if(result.getValue({name : 'email'}) != '' && result.getValue({name : 'email'}) != null )
	   	   				   contactsEmailIdArr.push(result.getValue({name : 'email'}));
	   	   			   return true;
	   	   			});  
   	   			}
	   	   		 for(var j = 0; j < contactsEmailIdArr.length ; j++)
	             {
	   	   			 fianlemailID += contactsEmailIdArr[j].concat(";");
	             }
	                if( fianlemailID != null && fianlemailID != '' && fianlemailID != undefined && fianlemailID != 'undefined')
	                {
	       	   			currentRec.setValue('tobeemailed', true);
	       	   			currentRec.setValue('email', fianlemailID);
	                }

   			}
   			else
   			{
                if( fianlemailID != null && fianlemailID != '' && fianlemailID != undefined && fianlemailID != 'undefined')
                {
       				currentRec.setValue('tobeemailed', true);
       	   			currentRec.setValue('email', fianlemailID);
                }
   			}
   				
        }
    }

    return {
        fieldChanged: fieldChanged
    };
    
});
