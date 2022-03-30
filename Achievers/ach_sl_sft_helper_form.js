/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */


define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/crypto'],

function(ui, email, runtime, crypto) 
{

		function onRequest(context) 
		{

				if (context.request.method === 'GET') 
				{

						var form = ui.createForm({
						title: 'Guid Form'
						});

						form.addField({
						id: 'custfield_sftp_username',
						type: ui.FieldType.TEXT,
						label: 'Username'
						});

						form.addCredentialField({
						id: 'custfield_sftp_password_token',
						label: 'Password',
						restrictToScriptIds: [runtime.getCurrentScript().id, 'customscript_ach_ss_float_adjtmnts_ftp'], 
						restrictToDomains: ['sftp.achievers.com']
						});

						form.addSubmitButton({
						label: 'Submit'
						});

						context.response.writePage(form);

						return;

				} 
				else 
				{

						var requset = context.request;

						var myPwdGuid = requset.parameters.custfield_sftp_password_token;

						log.debug("myPwdGuid", myPwdGuid);
						context.response.write(myPwdGuid);

				}

		}


        return {
				onRequest: onRequest
				};

});