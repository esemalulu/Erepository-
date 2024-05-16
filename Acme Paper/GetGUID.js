/**
�*@NApiVersion 2.x
�*@NScriptType Suitelet
�*@NModuleScope Public
�*/
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
				restrictToScriptIds: ['customscript_acc_sch_sftp_file'], //id of Script Using sftp
				restrictToDomains: ['safetrans.wellsfargo.com']
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