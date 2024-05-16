/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

/**
 * Script Type          : Suitelet Script
 * Script Name          : Generate Password Guid
 * Description          : This script will 
 */

define(['N/ui/serverWidget', 'N/log', 'N/runtime', 'N/https'],

		function(serverWidget, log, runtime, https) {

	var HostKeyURL_ScriptField = 'custscript_sftp_hostkey_url';

	function onRequest(context) {
		try{
			var sftpForm = serverWidget.createForm({
				title: 'SFTP Parser Tool' 
			});

			sftpForm.addSubmitButton({
				label : 'Submit'
			});

			if (context.request.method === 'GET') {
				var select = sftpForm.addField({
					id: 'selectaction',
					type: serverWidget.FieldType.SELECT,
					label: 'Select Action'
				});
				select.addSelectOption({
					value: 'getpasswordguid',
					text: 'Get Password GUID',
				});  
				select.addSelectOption({
					value: 'gethostkey',
					text: 'Get Host Key'
				});  
			} else if (context.request.method === 'POST') {
				var selectaction = context.request.parameters.selectaction;
				if(selectaction == 'getpasswordguid'){
					sftpForm.addField({
						id : 'restricttoscriptids',
						type : serverWidget.FieldType.TEXT,
						label : 'Restrict To Script Ids',
					}).isMandatory = true;
					sftpForm.addField({
						id : 'restricttodomains',
						type : serverWidget.FieldType.TEXT,
						label : 'Restrict To Domains',
					}).isMandatory = true;
				}
				else if(selectaction == 'gethostkey'){
					sftpForm.addField({
						id : 'url',
						type : serverWidget.FieldType.TEXT,
						label : 'URL (Required)',
					});

					sftpForm.addField({
						id : 'port',
						type : serverWidget.FieldType.INTEGER,
						label : 'Port (Optional)',
					});

					sftpForm.addField({
						id : 'hostkeytype',
						type : serverWidget.FieldType.TEXT,
						label : 'Type (Optional)',
					});
				}
				else{
					var restricttoScriptids = context.request.parameters.restricttoscriptids;
					var restricttoDomains = context.request.parameters.restricttodomains;
					var passwordGuid = context.request.parameters.password;
					var url = context.request.parameters.url;
					var hostKeyType = context.request.parameters.hostkeytype;
					var port = context.request.parameters.port;

					if(restricttoScriptids && restricttoDomains){
						log.debug('restricttoScriptids is '+restricttoScriptids, 'restricttoDomains is '+restricttoDomains);
						sftpForm.addCredentialField({ 
							id: 'password', 
							label: 'Password', 
							restrictToScriptIds: restricttoScriptids.replace(' ', '').split(','),
							restrictToDomains: restricttoDomains.replace(' ', '').split(','),
						}).isMandatory = true;
					}

					else if(passwordGuid){
						log.debug('passwordGuid is', passwordGuid);
						sftpForm.addField({
							id : 'passwordguidresponse',
							type : serverWidget.FieldType.LONGTEXT,
							label : 'PasswordGUID Response',
							displayType: serverWidget.FieldDisplayType.INLINE
						}).defaultValue = passwordGuid;
					}
					else if (url) {
						log.debug('url is '+url, 'port is '+port);
						var host_key_tool_URL =  runtime.getCurrentScript().getParameter({name: HostKeyURL_ScriptField});
						log.debug('host_key_tool_URL is ', host_key_tool_URL);
						if(host_key_tool_URL){
							var myUrl = host_key_tool_URL + url + "&port=" + port + "&type=" + hostKeyType; 
							var theResponse = https.get({url: myUrl}).body;
							sftpForm.addField({
								id : 'hostkeyresponse',
								type : serverWidget.FieldType.LONGTEXT,
								label : 'Host Key Response',
								displayType: serverWidget.FieldDisplayType.INLINE
							}).defaultValue = theResponse;     
						}
					}
				}
			}

			context.response.writePage(sftpForm);
		}catch(generateGUIDErr){
			log.error('Error Occurred In  ACME Generate Password Guid script is ', generateGUIDErr);
		}
	}

	return {
		onRequest: onRequest
	};

});
