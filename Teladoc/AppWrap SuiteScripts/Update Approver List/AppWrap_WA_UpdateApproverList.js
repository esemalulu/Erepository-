/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/runtime', 'N/search'], function(record, runtime, search) {
	
	
     function isNullOrUndefined(value) {
          if(value === null) {
               return true;
          }
          if(value === undefined) {
               return true;
          }
          return false;
     }

     function isEmpty(stValue) {
          if(isNullOrUndefined(stValue) === true) {
               return true;
          }
          if(stValue.length === 0) {
               return true;
          }
          return false;
     }

     return {
          onAction: function(scriptContext) {
        	  
               var log_title = 'Update Approver list';
               
               log.debug({
                   title: log_title,
                   details: 'runtime.executionContext:= ' + runtime.executionContext
               });

              var stCurrUser =  runtime.getCurrentUser().id;
	   		  log.debug(log_title, 'stCurrUser = ' + stCurrUser);
	   		  
	   		  if(stCurrUser == -4)
	   		  {
	   			  //return; //is email capture 
	   		  }

              var stMultiSelectField =  runtime.getCurrentScript().getParameter('custscript_aw_approverlist_fld');
               
               // Get the entity (Employee name) of an expense report
               var transaction = scriptContext.newRecord;

               // get the existing list of approvers
               var stExistApprover = transaction.getValue({
                    fieldId: stMultiSelectField
               });
               
               var existing_approvers = [];
               if(stExistApprover)
               {
            	   existing_approvers = JSON.parse(JSON.stringify(stExistApprover));
               }
               
               log.debug({
                    title: log_title,
                    details: 'Record Internal Id:= ' + transaction.id + ' | Existing Approvers:= ' + existing_approvers
               });

               // add next approver to list
               var updated_approvers = [];
               if(isEmpty(existing_approvers) === false) {
                    if(existing_approvers.length > 0) {
                         updated_approvers = updated_approvers.concat(existing_approvers);
                    }
               }

               
               if(!stCurrUser || stCurrUser == -4)
               {
            	   //Get Next approver
            	   stCurrUser = transaction.getValue({
                        fieldId: 'nextapprover'
                   });
            	   
            	   log.debug({
                       title: log_title,
                       details: 'nextapprover:= ' + stCurrUser
                  });


               }
               
               log.debug({
                    title: log_title,
                    details: 'stCurrUser:= ' + stCurrUser
               });

               // do not continue if user is the default administrator, -4
               if(stCurrUser !== -4) {
                    if(updated_approvers.indexOf(stCurrUser) == -1) {
                         updated_approvers.push(stCurrUser);
                    }
                    log.debug({
                         title: log_title,
                         details: 'Updated Approvers:= ' + updated_approvers
                    });

                    transaction.setValue({
                         fieldId: stMultiSelectField,
                         value: updated_approvers
                    });
               }

               return updated_approvers;
          }
     };
});
