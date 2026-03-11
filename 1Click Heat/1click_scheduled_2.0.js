/**
 * @NApiVersion 2.0
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/error',
        'N/file', 
        'N/record', 
        'N/runtime', 
        'N/search', 
        'N/task',
        'N/format',
        'N/email'],
/**
 * @param {error} error
 * @param {file} file
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {transaction} transaction
 */
function(error, file, record, runtime, search, task, format, email) 
{
   	
  function executeScript(context) 
  {
    	    	
    	try
    	{

			var taskSearch = search.create({
			type: "task",
			filters:[
                      ["status","noneof","COMPLETE"], 
                      "AND", 
                      ["enddate","onorafter","1 August, 2025"]
                      //"AND", 
                      //["assigned","anyof","304376"]
					],
			columns:[
						search.createColumn({name: "internalid"}),
						search.createColumn({name: "title"}),
	                    search.createColumn({name: "duedate"}),
                        search.createColumn({name: "assigned"}),
                        search.createColumn({name: "owner"})					
                  
					]
		   }).run().getRange({start: 0, end: 1000 });

          log.error('taskSearch.length', taskSearch.length );

          for (var i=0; taskSearch && i < taskSearch.length; i+=1)
          {
              var internalId = taskSearch[i].getValue({'name' : 'internalid'});
              var taskTitle = taskSearch[i].getValue({'name' : 'title'});
              var taskDueDate = new Date(taskSearch[i].getValue({'name' : 'duedate'}));
              var strDueDate = format.format({ 'type':format.Type.DATE, 'value':taskDueDate }); 
           
        	  var assignedTo = taskSearch[i].getValue({'name' : 'assigned'});
        	  var createdBy = taskSearch[i].getValue({'name' : 'owner'});
          
              var strTodaysDate = format.format({ 'type':format.Type.DATE, 'value':new Date() });
            
              //log.error('assignedTo', assignedTo );
              //log.error('createdBy', createdBy );
              log.error('internalId', internalId );

              var createdByRec = record.load({type: record.Type.EMPLOYEE, id: createdBy, isDynamic: true,});
              var createdByEmail = createdByRec.getValue({fieldId: 'email'});
              var createdByName = createdByRec.getValue({ fieldId: 'entityid' }); 

              var assigendToRec = record.load({type: record.Type.EMPLOYEE, id: assignedTo, isDynamic: true,});
              var assigendToEmail = assigendToRec.getValue({fieldId: 'email'});
              var assigendToName = assigendToRec.getValue({ fieldId: 'entityid' });
            
//NOTIFY WHO CREATED THE TASK IF DUE DATE IS TODAY
            
            if(strTodaysDate == strDueDate)
            {
              log.error('strDueDate', strDueDate );
              log.error('strTodaysDate', strTodaysDate ); 

              var html = '<h1 style="color:red; font-size:14px;">"'+taskTitle+'": Is Due Today</h1>';
				  html += '<p><b>Due Date: </b>'+strDueDate+'</p>';
				  //html += '<p><b>Name: </b>'+taskTitle+'</p>';
				  html += '<p><b>Created By: </b>'+createdByName+'</p>';
				  html += '<p><b>Assigned To: </b>'+assigendToName+'</p>';
				  html += '<a href=https://7662002.app.netsuite.com/app/crm/calendar/task.nl?id='+internalId+ '>View Record</a><br>';

              email.send({
	    	 'author':479006,
	    	 'recipients':[createdByEmail],
	    	 //'recipients':['e.semalulu@1clickheat.com'],
 	    	 'bcc':['helpdesk@1clickheat.com'],               
	    	 'subject':'Task Due Today: '+ taskTitle,
	    	 'body':html
	    	  });
 
              
            }



//NOTIFY THE PERSON WHO IS ASSIGNED EACH DAY THAT THEY ARE PAST DUE DATE 

            var todaysDate = new Date()
            var dueDate = new Date(taskDueDate)

            var diffMs = todaysDate.getTime() - dueDate.getTime() ;
            var daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

            //log.error('daysDiff', daysDiff );
          
            if(daysDiff > 0 )
            {
              
               //log.error('GETer DONE', daysDiff );

              var html = '<h1 style="color:red; font-size:14px;">"'+taskTitle+'": Is Past Due</h1>';
				  html += '<p><b>Days Past Due: </b>'+daysDiff+'</p>';
				  html += '<p><b>Due Date: </b>'+strDueDate+'</p>';
				  //html += '<p><b>Name: </b>'+taskTitle+'</p>';
				  html += '<p><b>Created By: </b>'+createdByName+'</p>';
				  html += '<p><b>Assigned To: </b>'+assigendToName+'</p>';
				  html += '<a href=https://7662002.app.netsuite.com/app/crm/calendar/task.nl?id='+internalId+ '>View Record</a><br>';

              email.send({
	    	 'author':479006,
	    	 'recipients':[assigendToEmail],
	    	 //'recipients':['e.semalulu@1clickheat.com'],
 	    	 'cc':[createdByEmail],               
 	    	 'bcc':['helpdesk@1clickheat.com'],               
	    	 'subject':'Task Past Due Date : '+taskTitle,
	    	 'body':html
	    	  });

              
           
            }
            
       

         }


            //log.error('UNITS LEFT', runtime.getCurrentScript().getRemainingUsage() );

        	
/*      
        	
        	//We check to see if the process was rescheduled.
        	//	if NOT, we queue up next script
        	if (!isRescheduled)
        	{
        		log.audit('Queue up next stage', 'Queue up next stage');
        		//Queue up Next Job: Validation Process

        		var nxtSchSctTask = task.create({
    				'taskType':task.TaskType.SCHEDULED_SCRIPT
    			});
        		nxtSchSctTask.scriptId = 'customscript_skz_ss_stagedvalidation';
        		nxtSchSctTask.deploymentId = null;
        		nxtSchSctTask.params = {
    				'custscript_sb61_filetrxtype':trxFileType,
    				'custscript_sb61_filetoprocess':fileToProcess,
    				'custscript_sb61_filename':trxFileName
    			};
    			
    			//Submit the Reschedule task
        		nxtSchSctTask.submit();
        	}

 */           
    	}
    	catch (err)
    	{
    		log.error('Error Process File to Stage', err);
    		

    		
    	}
    	
    }

    return {
        execute: executeScript
    };
    
});
