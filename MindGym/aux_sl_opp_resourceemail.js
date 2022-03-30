/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */


function requestReourcesEmail(req, res)
{
	
	var paramRecordId = req.getParameter('custparam_recid');     //Parameter for the Internal ID of record
	var paramRecordType = req.getParameter('custparam_rectype'); //Parameter for the Record Type of record
	var paramTranID = req.getParameter('custparam_tranid');      //Parameter for the Transaction ID of record
	var paramSaleRepID = req.getParameter('custparam_salesrep'); //Parameter for the Sales Rep ID of record

	//Script level parameters found under the Deployment record
	var paramSendToEmail = nlapiGetContext().getSetting('SCRIPT','custscript_opp_senttoemail');	   //The email where the Resource Request is sent to
	var paramEmailInsr = nlapiGetContext().getSetting('SCRIPT','custscript_opp_emailinsructions'); //The instructions found at the top section of email suitelet

	
		if (req.getMethod() == 'GET')
		{
			//Beging creating the Form and lable it 'Request Resource Email'
	        var form = nlapiCreateForm('Request Resource Email', true);    
	        
	        //Create the label that will hold the instructions entered in the paramEmailInsr parameter
	        var instructions = form.addField('custscript_opp_emailinsructions', 'label', paramEmailInsr); 
	        instructions.setLayoutType('outsideabove','startcol')
			     
	        var subject = form.addField('subject','text', 'Subject');
	        subject.setLayoutType('normal','startcol')
	        subject.setMandatory( true );
			
	        var message = form.addField('message','richtext', 'Message');
	        message.setDisplaySize(60, 10);
	                
	         //Hidden Record ID
		    var hiddenCustIdFld = form.addField('custparam_recid', 'text', '', null, null);
		    hiddenCustIdFld.setDefaultValue(paramRecordId);
		    hiddenCustIdFld.setDisplayType('hidden');
			
		     //Hidden Record Type
	        var hiddenRecordType = form.addField('custparam_rectype', 'text','', null, null);
		    hiddenRecordType.setDefaultValue(paramRecordType);
		    hiddenRecordType.setDisplayType('hidden');
	
	        //Hidden Transaction ID
		    var hiddenTrxIdFld = form.addField('custparam_tranid', 'text', '', null, null);
		    hiddenTrxIdFld.setDefaultValue(paramTranID);
		    hiddenTrxIdFld.setDisplayType('hidden')
	
	        //Hidden Send To Email
		    var hiddenEmailFld = form.addField('custscript_opp_senttoemail', 'email', '', null, null);
		    hiddenEmailFld.setDefaultValue(paramSendToEmail);
		    hiddenEmailFld.setDisplayType('hidden')
		    
		     //Hidden Sales Rep ID
		    var hiddenEmailFld = form.addField('custparam_salesrep', 'text', '', null, null);
		    hiddenEmailFld.setDefaultValue(paramSaleRepID);
		    hiddenEmailFld.setDisplayType('hidden')
				    
	        form.addSubmitButton('Send Email');
	        response.writePage(form);
                
        
		}
		else
		{		
			
			
			try
			{
				//Get the current users email address who will be cc'd on the email
				var context = nlapiGetContext();
				var userEmail = context.getEmail();
				
				//Look up email address of the sales rep and build the array of email address' that the message will be cc'd to
				var salesRepEmail = nlapiLookupField('employee', paramSaleRepID, 'email', false);
				
				var emailArray = [userEmail];
				if (salesRepEmail)
				{
					emailArray.push(salesRepEmail);
				}
    	  		  
				var msg = '';    	        			
				var emailMerger = nlapiCreateEmailMerger('61'); // Initiate Email Merger
				emailMerger.setTransaction(paramRecordId); 
				var mergeResult = emailMerger.merge(); // Merge				
    	  
				var records = new Object();
				records['transaction'] = paramRecordId;
 	     	     	 
				var subject = request.getParameter('subject');    	  
				var message = request.getParameter('message');
				
				//Create the body of the email message that will appear above the opportunity details in the email that includes both the subject and message 
				msg += '<br><br>'+
    		    '<table  style="margin-left: 1px;" width="70%" align="left"> '+
                '<tr><td>'+
    		    '<img  width="115px" height="59px"src="https://system.netsuite.com/core/media/media.nl?id=1185827&c=720154&h=b322985958911c84553e" alt=""> '+
    		    '</td></tr>'+
                '<tr ><td>'+
    		    '<span style="font-weight: bold;">Subject: ' +subject+' </span> '+
    		    '</td></tr>'+
                '<tr ><td>'+
    		    '<span style="font-weight: normal;">'+message+' </span> '+
    		    '</td></tr>'+
                '</table> ';

	     	  
				var emailBody = mergeResult.getBody(); // Get the body for the email
				var newEmail = nlapiSendEmail(nlapiGetUser(), paramSendToEmail, 'Opportunity# '+paramTranID+ '  resource request - ' +subject, msg +emailBody, emailArray , null,records);
				response.write('<script type="text/javascript">setTimeout(function(){window.close()}, 30);  </script>');
    	  
    	  
			}
			catch(e) 
			{		   		   
			log('ERROR','Error Sending Email: Error' +getErrText(e));		
			
			//write out the error on the suitelet to the user
			}
    	  
		}     
}
