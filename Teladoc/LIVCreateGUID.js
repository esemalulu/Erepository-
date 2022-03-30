/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@NModuleScope Public
 */
define(["N/ui/serverWidget","N/log"],
	function (serverWidget, log) {
		function onRequest(context) {
			if (context.request.method === 'GET') {
				var form = serverWidget.createForm({
				title: 'Create GUID Password'
				});

				form.addField({
				id: 'username',
				type: serverWidget.FieldType.TEXT,
				label: 'User Name'
				});

				form.addCredentialField({
				id: 'password',
				label: 'Password',
				restrictToScriptIds: ['customscript_liv_upload_csv_to_sftp','customscript_liv_download_csv_from_sftp'], //id of Script Using sftp
				//restrictToDomains: ['fileshare-stg-oregon.coupahost.com'],//Sandbox
				restrictToDomains: ['fileshare-oregon.coupahost.com']//Production
				});

				form.addSubmitButton({
				label: 'Submit Button'
				});

				context.response.writePage(form);
				return;
			} else {
				var requset = context.request;
				var myPwdGuid = requset.parameters.password;
					log.debug("PwdGuid = ", myPwdGuid);
				context.response.writePage(myPwdGuid);
			}
		}
		return {
			onRequest: onRequest
		};
	});
