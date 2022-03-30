/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */


define(['N/ui/serverWidget', 'N/email', 'N/runtime'],

    function(ui, email, runtime) 
	{
		
        function onRequest(context) 
		{
			
			if(request.method === context.Method.GET)
			{
				var form = ui.createForm({title: 'SFTP Helper Tool'});
				
				var credField = form.addCredentialField({
								id: 'custfield_sftp_password_token',
								label: 'SFTP Password',
								restrictToScriptIds: ['customscript_sftp_script'],
								restrictToDomains: ['semalulu.com'],
								restrictToCurrentUser: true //Depends on use case
								});
								
				credField.maxLength = 64;
				
				form.addSubmitButton();
				
				response.writePage(form);
			}
			else
			{
				// Read the request parameter matching the field ID we specified in the form
				var passwordToken = context.request.parameters.custfield_sftp_password_token;
				
				log.debug({
							title: 'New password token', 
							details: passwordToken
							});
			}
        }
		
        return {
				onRequest: onRequest
				};
    });