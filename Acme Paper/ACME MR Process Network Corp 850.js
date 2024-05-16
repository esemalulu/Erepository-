/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : Map/ Reduce Script
 * Script Name      : ACME MR Process Network Corp 850
 * Version               : 2.0
 * Description        : This script will pick up the 850 EDI file from the Network Corporate SFTP server to create Sales Orders in NetSuite.
 */

define(['N/search', 'N/record', 'N/log' ,'N/runtime', 'N/format', 'N/email', 'N/encode', 'N/file', 'N/task', 'N/sftp', 'N/error'],

		function(search, record, log, runtime, format, email, encode, file, task, sftp, error) {

	var SFTPPort = 22;
	var CSVFileHeaders = ['Customer', 'Order Number', 'Network PO Number', 'Network Order Number', 'Order Date', 'Item', 'Description', 'Qty', 'Units', 'Unit Price', 'EDI Unit Price', 'Amount'];

	var Network_Corporate_SFTPInteg_Username_ScriptField = 'custscript_networkcor_sftpinteg_username';
	var Network_Corporate_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_networkcor_sftpinteg_pwd_guid';
	var Network_Corporate_SFTPInteg_URL_ScriptField = 'custscript_networkcor_sftpinteg_sftp_url';
	var Network_Corporate_SFTPInteg_Hostkey_ScriptField = 'custscript_networkcor_sftpinteg_host_key';
	var Network_Corporate_SFTPInteg_SFTPDir_ScriptField = 'custscript_networkcor_sftpinteg_sftp_dir';

	var Network_Corporate_AckEmail_Reci_ScriptField = 'custscript_networkcor850_ackemail_recipi';

	var Network_SO_Corporate_AckEmail_SavedSearch_Id = '2635';

	var EDI_FileType = '850';
	var EDI_FileCount = 25;
	var IntegrationName = 'Network_Corporate';
	var EDI_File_Information_CustomRecord_ID = 'customrecord_acc_edi_file_setup';
	//var Daily_EDI_File_Details_CustomRecord_ID = 'customrecord_daily_edi_file_details';
	var Network_Orders_Employee = '72782';

	var SOPendingFulfillmentStatus = 'B';

	var EDI_850_File_Information_Field_Details = {
			'EDI_File_Information_Name': 'name',
			'EDI_Vendor': 'custrecord_edi_vendor',
			'EDI_Customer': 'custrecord_edi_customer',
			'EDI_File_Type': 'custrecord_acc_edi_file_type',
			'EDI_File_Segment_Delimiter': 'custrecord_acc_edi_segment_delimiter',
			'EDI_File_Element_Delimiter': 'custrecord_acc_edi_element_delimiter',
			'EDI_File_Subelement_Delimiter': 'custrecord_acc_edi_subelement_delimiter',
			'EDI_File_Interchange_Control_Header': 'custrecord_edi_interchange_control_heade',
			'EDI_File_Authorization_Information_Qualifier': 'custrecord_edi_auth_info_qualifier',
			'EDI_File_Authorization_Information_Length': 'custrecord_edi_authorization_info_length',
			'EDI_File_Security_Information_Qualifier': 'custrecord_edi_security_info_qualifier',
			'EDI_File_Security_Information_Length': 'custrecord_edi_security_information_len',
			'EDI_File_Interchange_ID_Qualifier': 'custrecord_edi_interchange_id_qualifier',
			'EDI_File_Interchange_Sender_ID': 'custrecord_edi_interchange_sender_id',
			'EDI_File_Interchange_Receiver_ID': 'custrecord_edi_interchange_receiver_id',
			'EDI_File_Interchange_Sender_Receiver_ID_Length': 'custrecord_edi_interchng_sendreci_id_len',
			'EDI_File_Interchange_Control_Standards_Identifier': 'custrecord_edi_interchange_ctrl_std_id',
			'EDI_File_Interchange_Control_Version_Number': 'custrecord_edi_interchange_ctrl_ver_num',
			'EDI_File_Interchange_Control_Number': 'custrecord_edi_interchange_control_num',
			'EDI_File_Acknowledgment_Requested': 'custrecord_edi_acknowledgment_requested',
			'EDI_File_Usage_Indicator': 'custrecord_edi_usage_indicator',
			'EDI_File_Functional_Group_Header': 'custrecord_edi_functional_group_header',
			'EDI_File_Functional_Identifier_Code': 'custrecord_edi_functional_identifier_cod',
			'EDI_File_Application_Senders_Code': 'custrecord_edi_application_senders_code',
			'EDI_File_Application_Receivers_Code': 'custrecord_edi_application_receiver_code',
			'EDI_File_Group_Control_Number': 'custrecord_edi_group_control_number',
			'EDI_File_Responsible_Agency_Code': 'custrecord_edi_responsible_agency_code',
			'EDI_File_Version_Release_Industry_Identifier_Code': 'custrecord_edi_ver_release_ind_id_code',
			'EDI_File_Transaction_Set_Header': 'custrecord_edi_transaction_set_header',
			'EDI_File_Transaction_Set_Identifier_Code': 'custrecord_edi_tran_set_identifier_code',
			'EDI_File_Transaction_Set_Control_Number_Length': 'custrecord_edi_tran_set_control_num_len',
			'EDI_File_Beginning_Segment_Header': 'custrecord_edi_beginning_segment_header',
			'EDI_File_Transaction_Set_Purpose_Code': 'custrecord_edi_tran_set_purpose_code',
			'EDI_File_Transaction_Type_Code': 'custrecord_edi_transaction_type_code',
			'EDI_File_Reference_Identification_Header': 'custrecord_edi_reference_id_header',
			'EDI_File_Reference_Identification_Qualifier': 'custrecord_edi_reference_id_qualifier',
			'EDI_File_Administrative_Communications_Contact_Header': 'custrecord_edi_admin_comm_contact_header',
			'EDI_File_Administrative_Communications_Contact_Function_Code': 'custrecord_edi_adm_contact_function_code',
			'EDI_File_Communication_Number_Qualifier': 'custrecord_edi_comm_number_qualifier',
			'EDI_File_Communication_Number_Qualifier2': 'custrecord_edi_comm_number_qualifier2',
			'EDI_File_Date_Time_Header': 'custrecord_edi_date_time_header',
			'EDI_File_Requested_Delivery_Date_Qualifier': 'custrecord_edi_requested_delivery_date_q',
			'EDI_File_Order_Entry_Date_Qualifier': 'custrecord_edi_order_entry_date_qualifie',
			'EDI_File_Date_Time_Qualifier': 'custrecord_edi_date_time_qualifier',
			'EDI_File_Message_Text_Header': 'custrecord_edi_message_text_header',
			'EDI_File_Name_Header': 'custrecord_edi_name_header',
			'EDI_File_Entity_Identifier_Code': 'custrecord_edi_entity_identifier_code',
			'EDI_File_Identification_Code_Qualifier': 'custrecord_edi_identification_code_quali',
			'EDI_File_Additional_Name_Information_Header': 'custrecord_edi_addl_name_info_header',
			'EDI_File_Address_Information_Header': 'custrecord_edi_address_info_header',
			'EDI_File_Geographic_Location_Header': 'custrecord_edi_geographical_loc_header',
			'EDI_File_Baseline_Item_Data_Header': 'custrecord_edi_baseline_item_data_header',
			'EDI_File_Product_Item_Description_Header': 'custrecord_edi_prod_item_description_hea',
			'EDI_File_Item_Description_Type': 'custrecord_edi_item_description_type',
			'EDI_File_Transaction_Totals_Header': 'custrecord_edi_transaction_total_header',
			'EDI_File_Transaction_Set_Trailer': 'custrecord_edi_transaction_set_trailer',
			'EDI_File_Functional_Group_Trailer': 'custrecord_edi_functional_group_trailer',
			'EDI_File_Interchange_Control_Trailer': 'custrecord_edi_interchange_control_trail'
	};

	var Daily_EDI_File_Field_Details = {
			'EDI_Document_Code': 'custrecord_edi_document_code',
			'EDI_File_Contents': 'custrecord_edi_file_contents',
			'EDI_Communication_Type': 'custrecord_edi_communication_type',
			'EDI_File_Vendor': 'custrecord_edi_file_vendor',
			'EDI_File_Customer': 'custrecord_edi_file_customer',
			'EDI_File_Error_Description': 'custrecord_edi_file_error_description'
	};

	var EDI_Status_Field_Details = {
			'EDI_850_Request_Sync_Successful': 3,
	};

	var Date_Time_Qualifier = {
			'Requested_Delivery_Date': '002',
			'Order_Entry_Date': '004'
	};

	var Entity_Identifier_Code = {
			'Bill_to_Party': 'BT',
			'Buying_Party': 'BY',
			'Ship_To': 'ST'
	};

	function handleErrorIfAny(summary){
		var inputSummary = summary.inputSummary;
		var mapSummary = summary.mapSummary;

		if (inputSummary.error){
			var e = error.create({
				name: 'INPUT_STAGE_FAILED',
				message: inputSummary.error
			});
			log.debug({details : 'Error code: ' + e.name + '\n' +'Error msg: ' + e.message});

		}

		handleErrorInStage('map', mapSummary);
	}

	//Error handling method
	function handleErrorInStage(stage, summary){
		var errorMsg = [];
		summary.errors.iterator().each(function(key, value){
			var msg = 'error ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
			errorMsg.push(msg);
			return true;
		});
		if (errorMsg.length > 0){
			var e = error.create({
				name: stage,
				message: JSON.stringify(errorMsg)
			});
			log.debug({title:stage,details : 'Error code: ' + e.name + '\n' +'Error msg: ' + e.message});

		}
	}

	function returnSearchResults(searchId, searchRecType, newFilter, newColumn){
		try{
			if(searchId){
				var curSearch = search.load({
					id: searchId
				});

				if(newColumn){
					curSearch.columns = newColumn;
				}

				if(newFilter){
					var curFilters = curSearch.filters;
					for (var i = 0; i < newFilter.length; i++){
						curFilters.push(newFilter[i]);
					}
					curSearch.filters = curFilters;
				}
			}else if(searchRecType){
				var curSearch = search.create({
					type: searchRecType,
					filters: newFilter,
					columns: newColumn,
				});
			}

			var resultSet    = curSearch.run();
			var searchResult = new Array();
			var rangeId = 0;

			do{
				var resultSlice = resultSet.getRange(rangeId, rangeId+1000 );
				if (resultSlice !=null && resultSlice !=''){
					searchResult = searchResult.concat(resultSlice);
					rangeId += resultSlice.length;
				}
				//log.emergency('searchResult length is', searchResult.length);
			}
			while((resultSlice != null) ? resultSlice.length >= 1000 : tempCondition < 0);

			return searchResult;
		} catch(returnSearchResultsErr){
			log.error('Error in returnSearchResults function is ', JSON.stringify(returnSearchResultsErr));
		}
	}

	/**
	 * Validate if the current parameter value is not empty
	 */
	function isEmpty(curValue) {
		if (curValue == '' || curValue == null || curValue == undefined) {
			return true;
		} 
		else{
			//log.debug('curValue is ', curValue);
			if (curValue instanceof String) {
				//log.debug('curValue inside string if is ', curValue);
				if (curValue == '') {
					return true;
				}
			} 
			else if (curValue instanceof Array) {
				//log.debug('curValue inside Array if is ', curValue);
				if (curValue.length == 0) {
					return true;
				}
			}
			return false;
		}
	}

	function sftpConnectionDownload() {
		try{
			var network_Corporate_UserName =  runtime.getCurrentScript().getParameter({name: Network_Corporate_SFTPInteg_Username_ScriptField});
			var network_Corporate_PwdGUID =  runtime.getCurrentScript().getParameter({name: Network_Corporate_SFTPInteg_Pwd_GUID_ScriptField});
			var network_Corporate_SFTPurl =  runtime.getCurrentScript().getParameter({name: Network_Corporate_SFTPInteg_URL_ScriptField});
			var network_Corporate_Hostkey =  runtime.getCurrentScript().getParameter({name: Network_Corporate_SFTPInteg_Hostkey_ScriptField});
			log.debug('Network_Corporate Host Key is ', network_Corporate_Hostkey);
			var network_Corporate_SFTPDirectory =  runtime.getCurrentScript().getParameter({name: Network_Corporate_SFTPInteg_SFTPDir_ScriptField});
			log.debug('Network_Corporate: User Name is  '+network_Corporate_UserName+' | Password GUID is  '+network_Corporate_PwdGUID,' | SFTP Url is '+network_Corporate_SFTPurl+' | SFTP Directory is '+network_Corporate_SFTPDirectory);

			var network_Corporate_SFTPconnection = sftp.createConnection({
				username: network_Corporate_UserName,
				passwordGuid: network_Corporate_PwdGUID,
				url: network_Corporate_SFTPurl,
				hostKey: network_Corporate_Hostkey,
				port : SFTPPort,
				//directory: network_Corporate_SFTPDirectory
			});

			log.debug('Network_Corporate SFTP connection : ', network_Corporate_SFTPconnection);
			var ediFilesArray = new Array();
			var ediFileNameArray = new Array();
			if(network_Corporate_SFTPconnection){
				var network_Corporate_SFTP_DirectoryList = network_Corporate_SFTPconnection.list({path: network_Corporate_SFTPDirectory});
				log.debug('Network_Corporate 850 connection : network_Corporate_SFTP_DirectoryList ', network_Corporate_SFTP_DirectoryList);

				if(network_Corporate_SFTP_DirectoryList.length > 0){
					for(var directoryListIndex = 0; directoryListIndex < network_Corporate_SFTP_DirectoryList.length; directoryListIndex++){
						var curFileObj = network_Corporate_SFTP_DirectoryList[directoryListIndex];
						var curFileName = JSON.stringify(curFileObj.name);
						var ediFileExtention = '.edi'; 
						//var ediBeginningString = 'edi850';

						if((curFileName.indexOf(ediFileExtention) != -1 || curFileName.indexOf(ediFileExtention.toUpperCase()) != -1) /*&& (curFileName.startsWith(ediBeginningString) || curFileName.startsWith(ediBeginningString.toUpperCase()))*/ ){
							//log.debug('curFileName  is: ',curFileName);
							try{
								ediFilesArray[ediFilesArray.length] = network_Corporate_SFTPconnection.download({
									directory: network_Corporate_SFTPDirectory,
									filename: curFileObj.name
								});

								ediFileNameArray[ediFileNameArray.length] = curFileName;

								/*if(curFileObj.name == 'EDI850_20210720-121158-316.EDI'){
									network_Corporate_SFTPconnection.move({
										from: '/OUT//EDI850_20210720-121158-316.EDI'.toLowerCase(),
										to: '/OUT//Archive/EDI850_20210720-121158-316.EDI'.toLowerCase()
									});
									network_Corporate_SFTPconnection.removeFile({
								        path: '/EDI850_20210720-121158-316.EDI'
								    });
									var myFileToUpload = file.create({
								        name: 'originalname.js',
								        fileType: file.Type.PLAINTEXT,
								        contents: 'I am a test file.'
								    });

									network_Corporate_SFTPconnection.upload({
								        directory: '/OUT/',
								        filename: 'newTestFileOnServer.js',
								        file: myFileToUpload
								    });
									log.debug('Network_Corporate 850 connection : first upload ');
									network_Corporate_SFTPconnection.upload({
								        directory: '/OUT/Archive/',
								        filename: 'newTestFileOnServer2.js',
								        file: myFileToUpload
								    });
									log.debug('Network_Corporate 850 connection : Archive upload ');
								}*/

								var moveFromDirectory = network_Corporate_SFTPDirectory+curFileObj.name;
								var moveToDirectory = network_Corporate_SFTPDirectory+'Archive/'+curFileObj.name;
								log.debug('Network_Corporate 850 connection : moveFromDirectory ', moveFromDirectory);
								log.debug('Network_Corporate 850 connection : moveToDirectory ', moveToDirectory);
								network_Corporate_SFTPconnection.move({
									from: moveFromDirectory,
									to: moveToDirectory
								});

								if(ediFilesArray.length == EDI_FileCount){
									break;
								}

							}catch(sftpFileDownloadErr){
								log.error('Error Occurred In ACME MR Process Network Corp 850 script: sftp File Download  is ', sftpFileDownloadErr);
								var emailSubject = 'Network Corporate 850 connection and Daily EDI 850 EDI File download Unsuccessful at ';
								var emailBody = '<br/><p>The Network Corporate 850 connection and Daily EDI 850 Report download Unsuccessful. Please find the details:<br/>';
								emailBody += sftpFileDownloadErr.message+'</p>';

								sendDetailedEmail(emailSubject, emailBody);
							}
						}
					}
					log.debug('ediFilesArray : ', ediFilesArray)
				}//connection
			}

			if(ediFilesArray.length > 0){
				var emailSubject = 'Network Corporate 850 connection and Daily EDI 850 EDI File download Successful for ';
				var emailBody = '<br/><p>The Network Corporate 850 connection and Daily EDI 850 Report download is Successful:<br/>';
				emailBody += ediFileNameArray+'</p>';
				sendDetailedEmail(emailSubject, emailBody);

				return ediFilesArray;
			}
			else{
				return null;
				//network_Corporate_DailyEDIDownload_sendAckEmail('Network Corporate 850', 'Unsuccessful', 'EDI 850 files were not found in SFTP Directory');
			}
		}catch(sftpConnectionDownloadErr){
			log.error('Error Occurred In ACME MR Process Network Corp 850 script: sftpConnectionDownload Function is ', sftpConnectionDownloadErr);
			var emailSubject = 'Network Corporate 850 connection and Daily EDI 850 EDI File download Unsuccessful at ';
			var emailBody = '<br/><p>The Network Corporate 850 connection and Daily EDI 850 Report download was Unsuccessful. Please find the details:<br/>';
			emailBody += sftpConnectionDownloadErr.message+'</p>';

			sendDetailedEmail(emailSubject, emailBody);
		}
	}

	function sendDetailedEmail(emailsubject, emailbody, attachmentFileObj){
		try{
			var curDateTimeObj = new Date();
			var curDateTimeString = format.format({
				value: curDateTimeObj,
				type: format.Type.DATETIME
			});
			//log.debug('sendDetailedEmail function: curDateTimeString is ', curDateTimeString);
			//log.debug('sendDetailedEmail function: emailsubject is ', emailsubject);
			//log.debug('sendDetailedEmail function: emailbody is ', emailbody);
			if(emailsubject && emailbody){
				var emailRecipients = runtime.getCurrentScript().getParameter({name: Network_Corporate_AckEmail_Reci_ScriptField});

				var sendDetailedEmailSubject = emailsubject +curDateTimeString;
				var sendDetailedEmailBody = 'Hi Team,'+emailbody;
				sendDetailedEmailBody += '<br/>Thank you';

				log.debug('emailRecipients are '+emailRecipients, 'attachmentFileObj is '+attachmentFileObj);
				if(emailRecipients && attachmentFileObj){
					//log.debug('Ack email with attachment ', 'Ack email with attachment');
					email.send({
						author: Network_Orders_Employee,
						recipients: emailRecipients,
						subject: sendDetailedEmailSubject,
						body: sendDetailedEmailBody,
						attachments: [attachmentFileObj]
					});
					log.debug('Ack email with attachment sent for ', sendDetailedEmailBody);
				}
				else if(emailRecipients && !attachmentFileObj){
					//log.debug('Ack email without attachment ', 'Ack email without attachment');
					email.send({
						author: Network_Orders_Employee,
						recipients: emailRecipients,
						subject: sendDetailedEmailSubject,
						body: sendDetailedEmailBody
					});
					log.debug('Ack email without attachment sent for '+sendDetailedEmailBody);
				}
			}
		}catch(sendDetailedEmailErr){
			log.error('Error Occurred In ACME MR Process Network Corp 850 Script: sendDetailedEmail Function is ', sendDetailedEmailErr);
		}
	}

	function get850EDIFileData() {
		try{
			var edi_850_File_InformationFilters = [
				search.createFilter({
					name: 'custrecord_acc_edi_file_type',
					join: null,
					operator: 'is',
					values: EDI_FileType
				}),
				search.createFilter({
					name: 'name',
					join: null,
					operator: 'startswith',
					values: IntegrationName
				})];

			var edi_850_File_InformationColumns = [
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Information_Name}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_Vendor}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_Customer}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Type}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Segment_Delimiter}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Element_Delimiter}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Subelement_Delimiter}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Authorization_Information_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Authorization_Information_Length}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Security_Information_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Security_Information_Length}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_ID_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Sender_ID}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Receiver_ID}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Sender_Receiver_ID_Length}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Standards_Identifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Version_Number}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Number}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Acknowledgment_Requested}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Usage_Indicator}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Functional_Group_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Functional_Identifier_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Application_Senders_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Application_Receivers_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Group_Control_Number}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Responsible_Agency_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Version_Release_Industry_Identifier_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Identifier_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Control_Number_Length}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Beginning_Segment_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Purpose_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Type_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Reference_Identification_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Reference_Identification_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Function_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier2}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Date_Time_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Requested_Delivery_Date_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Order_Entry_Date_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Date_Time_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Message_Text_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Name_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Entity_Identifier_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Identification_Code_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Additional_Name_Information_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Address_Information_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Geographic_Location_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Product_Item_Description_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Item_Description_Type}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Totals_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Trailer}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Functional_Group_Trailer}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Trailer})
				];

			var edi_850_File_InformationSearchResult = returnSearchResults('', EDI_File_Information_CustomRecord_ID, edi_850_File_InformationFilters, edi_850_File_InformationColumns);
			log.debug('EDI 850 File_Information Search Result is ', edi_850_File_InformationSearchResult);

			if(edi_850_File_InformationSearchResult){
				if(edi_850_File_InformationSearchResult.length > 0){
					return edi_850_File_InformationSearchResult;
				}
				else{
					return null;
				}
			}
			else{
				return null;
			}
		} catch(get850EDIFileDataErr){
			log.error('get850EDIFileData error: ', get850EDIFileDataErr.message);
		}
	}

	function getAllLines(arr, startval, endval, edifilename) {
		try{
			log.debug('arr is '+ arr, ' startval is '+ startval+' endval is '+ endval);

			if(arr && startval && endval){
				var allSOLines = new Array();
				var curSOLineArray =  new Array();
				var startIndexFlag = 'F';
				for(var i = 0; i < arr.length; i++){
					if (startIndexFlag == 'F' && arr[i].indexOf(startval)  != -1){
						curSOLineArray.push(arr[i]);
						//log.debug('cur array data in startIndexFlag == F is : ', arr[i]);
						startIndexFlag = 'T';
					}
					else if (startIndexFlag == 'T' && arr[i].indexOf(endval)  == -1){
						//log.debug('cur array data in startIndexFlag == T is : ', arr[i]);
						curSOLineArray.push(arr[i]);
					}
					else if (startIndexFlag == 'T' && arr[i].indexOf(endval)  != -1){
						curSOLineArray.push(arr[i]);
						allSOLines.push({'edifilename': edifilename, 'filedata': curSOLineArray});
						//allSOLines.push(curSOLineArray);
						//log.debug('curSOLineArray is '+ curSOLineArray, ' allSOLines in loop is '+ allSOLines);
						curSOLineArray =  new Array();
						startIndexFlag = 'F';
					}
					//log.debug('startIndexFlag : ', startIndexFlag);
				}
				log.debug('allSOLines : ', allSOLines);
				return allSOLines;
			}
		}catch(getAllLinesErr){
			log.error('getAllLines error: ', getAllLinesErr.message);
		}
	}

	function read850(get850data, edifile) {
		try{
			log.debug('get850data : ', get850data);
			var po1Array = new Array();
			var pidArray = new Array();
			var totalPOLines = 0;
			//var sodataArray = JSON.parse(get850data);
			var sodataArray = get850data;
			log.debug('sodataArray : ', sodataArray);
			var sovalues = {};

			var edi850FileStaticInformation = get850EDIFileData();
			log.debug('edi850FileStaticInformation ', edi850FileStaticInformation);
			//log.debug('Line segment id is ', EDI_850_File_Information_Field_Details.EDI_File_Segment_Delimiter);

			if(edi850FileStaticInformation){
				var curSegmentDelimeter  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Segment_Delimiter});
				var curElementDelimeter  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Element_Delimiter});
				var curSubelementDelimeter  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Subelement_Delimiter});

				var curBeginningSegmentHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Beginning_Segment_Header});
				var curReferenceIdentificationHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Reference_Identification_Header});

				var curCommunicationsContactHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Header});
				var curAdmComunicationsContactFunctionCode  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Function_Code});
				var curCommunicationNumberQualifier  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier});
				var curCommunicationNumberQualifier2  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier2});

				// DTM Segment
				var curDateTimeHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Date_Time_Header});
				//var curRequestedDeliveryDateQualifier  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Requested_Delivery_Date_Qualifier});
				//var curOrderEntryDateQualifier  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Order_Entry_Date_Qualifier});
				var curDateTimeQualifier  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Date_Time_Qualifier});

				var requestedDeliveryDateQualifier, orderEntryDateQualifier = '';
				if(!isEmpty(curDateTimeQualifier)){
					var curDateTimeQualifierObj = JSON.parse(curDateTimeQualifier);
					requestedDeliveryDateQualifier = curDateTimeQualifierObj.Requested_Delivery_Date;
					orderEntryDateQualifier = curDateTimeQualifierObj.Order_Entry_Date;
				}
				else{
					requestedDeliveryDateQualifier = Date_Time_Qualifier.Requested_Delivery_Date;
					orderEntryDateQualifier = Date_Time_Qualifier.Order_Entry_Date;
				}

				// MSG Header
				var curMessageTextHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Message_Text_Header});

				// Name Segment
				var curNameHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Name_Header});
				var entityIdentifierCode  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Entity_Identifier_Code});
				var curName_IdentificationCodeQualifier  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Identification_Code_Qualifier});
				var curAdditionalNameInformationHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Additional_Name_Information_Header});
				var curAddressInformationHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Address_Information_Header});
				var curGeographicLocationHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Geographic_Location_Header});

				var curBaselineItemDataHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header});
				var curProductItemDescriptionHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Product_Item_Description_Header});
				var curTransactionTotalsHeader  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Totals_Header});

				if(curSegmentDelimeter && curElementDelimeter){
					sovalues['transetpurposecode'] = '';
					sovalues['sotypecode'] = '';
					sovalues['customerpono'] = '';
					//sovalues['soorderdate'] = '';
					sovalues['networkpono'] = '';
					sovalues['customernetworknumber'] = '';
					sovalues['requesteddeliverydate'] = '';
					sovalues['orderentrydate'] = '';
					sovalues['buyermessage'] = '';
					sovalues['buyercontactname'] = '';
					sovalues['buyercontactphone'] = '';
					sovalues['buyercontactemail'] = '';

					sovalues['shipattention'] = '';
					sovalues['shipaddressee'] = '';
					sovalues['shiptoaddr1'] = '';
					sovalues['shiptoaddr2'] = '';
					sovalues['shiptocity'] = '';
					sovalues['shiptostate'] = '';
					sovalues['shiptozip'] = '';
					sovalues['shipcountry'] = '';
					sovalues['billattention'] = '';
					sovalues['billaddressee'] = '';
					sovalues['billtoaddr1'] = '';
					sovalues['billtoaddr2'] = '';
					sovalues['billtocity'] = '';
					sovalues['billtostate'] = '';
					sovalues['billtozip'] = '';
					sovalues['billcountry'] = '';
					for(var sodataLen = 0; sodataLen < sodataArray.length; sodataLen++){
						var curLine = sodataArray[sodataLen].toString();
						var curLineElements = curLine.trim().split(curElementDelimeter);
						log.debug('curLine  : ', curLine);
						log.debug('curLineElements  : ', curLineElements);

						var curLineHeader = curLineElements[0];
						//log.debug('curLineHeader is '+ curLineHeader, ' curLineElements is '+ curLineElements);
						if(curLineHeader == curBeginningSegmentHeader){
							sovalues['transetpurposecode'] = curLineElements[1];
							sovalues['sotypecode'] = curLineElements[2];
							sovalues['customerpono'] = curLineElements[3];
							/*var soOrderDate = curLineElements[5];

							if(soOrderDate){
								var soorderDateObj = new Date(parseInt(soOrderDate.substr(0,4), 10), parseInt(soOrderDate.substr(4,2), 10) - 1, parseInt(soOrderDate.substr(6,2), 10));
								var soorderDateString = format.format({
									value: soorderDateObj,
									type: format.Type.DATE
								});
								sovalues['soorderdate'] = soorderDateString;
								log.debug('soorderDateObj is '+ soorderDateObj, ' soorderDateString is '+ soorderDateString);
							}*/
						}

						else if(curLineHeader == curReferenceIdentificationHeader){
							if(curLineElements[1] == 'PO'){
								sovalues['networkpono'] = curLineElements[2];
							}
						}

						else if(curLineHeader == curDateTimeHeader){
							if(curLineElements[1] == requestedDeliveryDateQualifier){
								var requestedDeliveryDate = curLineElements[2];

								if(requestedDeliveryDate){
									var requestedDeliveryDateObj = new Date(parseInt(requestedDeliveryDate.substr(0,4), 10), parseInt(requestedDeliveryDate.substr(4,2), 10) - 1, parseInt(requestedDeliveryDate.substr(6,2), 10));
									var requestedDeliveryDateString = format.format({
										value: requestedDeliveryDateObj,
										type: format.Type.DATE
									});

									sovalues['requesteddeliverydate'] = requestedDeliveryDateString;
									log.debug('requestedDeliveryDateObj is '+ requestedDeliveryDateObj, ' requestedDeliveryDateString is '+ requestedDeliveryDateString);
								}
							}

							else if(curLineElements[1] == orderEntryDateQualifier){
								var orderEntryDate = curLineElements[2];
								var orderEntryTime = curLineElements[3];

								if(orderEntryDate){
									var orderEntryDateObj = new Date(parseInt(orderEntryDate.substr(0,4), 10), parseInt(orderEntryDate.substr(4,2), 10) - 1, parseInt(orderEntryDate.substr(6,2), 10));
									var orderEntryDateString = format.format({
										value: orderEntryDateObj,
										type: format.Type.DATE
									});

									sovalues['orderentrydate'] = orderEntryDateString;
									log.debug('orderEntryDateObj is '+ orderEntryDateObj, ' orderEntryDateString is '+ orderEntryDateString);
								}
							}
						}

						else if(curLineHeader == curMessageTextHeader){
							sovalues['buyermessage'] = curLineElements[1];
						}

						else if(curLineHeader == curNameHeader){
							log.debug('curName_IdentificationCodeQualifier is  : ', curName_IdentificationCodeQualifier);
							if(curLineElements[1] == Entity_Identifier_Code.Ship_To){
								sovalues['shipaddressee'] = curLineElements[2];

								if(curLineElements[3] == curName_IdentificationCodeQualifier){
									sovalues['customernetworknumber'] = curLineElements[4];
								}
								var stTotalLines = 3;
								for(var stTotalLinesLen = 0; stTotalLinesLen < stTotalLines; stTotalLinesLen++){
									var stInfoIndex = sodataLen + 1; 
									var stNextSegmentLine = sodataArray[stInfoIndex];
									var stNextSegmentLineElements = stNextSegmentLine.trim().split(curElementDelimeter);
									log.debug('stNextSegmentLine  : ', stNextSegmentLine);
									log.debug('stNextSegmentLineElements  : ', stNextSegmentLineElements);

									var stNextSegmentLineHeader = stNextSegmentLineElements[0];
									log.debug('stNextSegmentLineHeader  : ', stNextSegmentLineHeader);
									if(stNextSegmentLineHeader == curAdditionalNameInformationHeader){
										sovalues['shipattention'] = stNextSegmentLineElements[1];
										/*if(stNextSegmentLineElements.length > 2){
											sovalues['shiptoaddr2'] = stNextSegmentLineElements[2];
										}*/
										sodataLen++;
									}

									else if(stNextSegmentLineHeader == curAddressInformationHeader){
										sovalues['shiptoaddr1'] = stNextSegmentLineElements[1];
										if(stNextSegmentLineElements.length > 2){
											sovalues['shiptoaddr2'] = stNextSegmentLineElements[2];
										}
										sodataLen++;
									}

									else if(stNextSegmentLineHeader == curGeographicLocationHeader){
										sovalues['shiptocity'] = stNextSegmentLineElements[1];
										sovalues['shiptostate'] = stNextSegmentLineElements[2];
										sovalues['shiptozip'] = stNextSegmentLineElements[3];

										if(stNextSegmentLineElements.length == 5){
											sovalues['shipcountry'] = stNextSegmentLineElements[4];
										}
										sodataLen++;
									}
								}
								log.debug('sodataLen is  : ', sodataLen);
							}

							else if(curLineElements[1] == 'BT'){
								sovalues['billaddressee'] = curLineElements[2];

								var btTotalLines = 3;
								for(var btTotalLinesLen = 0; btTotalLinesLen < btTotalLines; btTotalLinesLen++){
									var btInfoIndex = sodataLen + 1; 
									var btNextSegmentLine = sodataArray[btInfoIndex];
									var btNextSegmentLineElements = btNextSegmentLine.trim().split(curElementDelimeter);
									log.debug('curLine  : ', btNextSegmentLine);
									log.debug('curLineElements  : ', btNextSegmentLineElements);

									var btNextSegmentLineHeader = btNextSegmentLineElements[0];
									log.debug('btNextSegmentLineHeader  : ', btNextSegmentLineHeader);
									if(btNextSegmentLineHeader == curAdditionalNameInformationHeader){
										sovalues['billattention'] = btNextSegmentLineElements[1];
										/*if(btNextSegmentLineElements.length > 2){
											sovalues['billtoaddr2'] = btNextSegmentLineElements[2];
										}*/
										sodataLen++;
									}

									else if(btNextSegmentLineHeader == curAddressInformationHeader){
										sovalues['billtoaddr1'] = btNextSegmentLineElements[1];
										if(btNextSegmentLineElements.length > 2){
											sovalues['billtoaddr2'] = btNextSegmentLineElements[2];
										}
										sodataLen++;
									}

									else if(btNextSegmentLineHeader == curGeographicLocationHeader){
										sovalues['billtocity'] = stNextSegmentLineElements[1];
										sovalues['billtostate'] = stNextSegmentLineElements[2];
										sovalues['billtozip'] = stNextSegmentLineElements[3];

										if(stNextSegmentLineElements.length == 5){
											sovalues['billcountry'] = stNextSegmentLineElements[4];
										}
										sodataLen++;
									}
								}
								log.debug('sodataLen is  : ', sodataLen);
							}
						}

						/*else if(curLineHeader == curAddressInformationHeader){
							var shiptoAddress1 = curLineElements[1];
							var shiptoAddress2 = '';
							if(curLineElements.length > 2){
								shiptoAddress2 = curLineElements[2];
							}
						}

						else if(curLineHeader == curGeographicLocationHeader){
							var shiptoCity = curLineElements[1];
							var shiptoStateCode = curLineElements[2];
							var shiptoZip = curLineElements[3];
							var shiptoCountryCode = curLineElements[4];
						}*/

						else if(curLineHeader == curCommunicationsContactHeader){
							if(!isEmpty(curAdmComunicationsContactFunctionCode)){
								var admComunicationsContactFunctionCodeObj = JSON.parse(curAdmComunicationsContactFunctionCode);
								if(curLineElements[1] == admComunicationsContactFunctionCodeObj.Buyer_Contact_Name){
									sovalues['buyercontactname'] = curLineElements[2];
								}
								if(curLineElements.length == 5){
									if(!isEmpty(curCommunicationNumberQualifier)){
										var curCommunicationNumberQualifierObj = JSON.parse(curCommunicationNumberQualifier);
										if(curLineElements[3] == curCommunicationNumberQualifierObj.Contact_Phone_Number){
											sovalues['buyercontactphone'] = curLineElements[4];
										}
									}
								}
								else if(curLineElements.length == 7){
									if(!isEmpty(curCommunicationNumberQualifier)){
										var curCommunicationNumberQualifierObj = JSON.parse(curCommunicationNumberQualifier);
										if(curLineElements[3] == curCommunicationNumberQualifierObj.Contact_Phone_Number){
											sovalues['buyercontactphone'] = curLineElements[4];
										}

										if(curLineElements[5] == curCommunicationNumberQualifierObj.Contact_Email){
											sovalues['buyercontactemail'] = curLineElements[6];
										}
									}
								}
							}
						}

						else if(curLineHeader == curBaselineItemDataHeader){
							po1Array.push(curLineElements);
						}

						else if(curLineHeader == curProductItemDescriptionHeader){
							pidArray.push(curLineElements);
						}

						else if(curLineHeader == curTransactionTotalsHeader){
							totalPOLines = curLineElements[1];
						}
						log.debug('sovalues in for loop index '+sodataLen+'  : ', sovalues);
					}
					log.debug('totalPOLines is '+ totalPOLines, 'po1Array  : '+po1Array);
					log.debug('po1Array  length is : '+po1Array.length, 'pidArray  : '+pidArray);
				}
			}

			/*for(var po1ArrayLen = 0; po1ArrayLen < po1Array.length; po1ArrayLen++){
				log.debug('cur value is  : ', po1Array[po1ArrayLen]);

			}*/
			log.debug('if val  : ', totalPOLines == po1Array.length);
			if(totalPOLines == po1Array.length){
				sovalues['solines'] = po1Array;
				sovalues['solinedetails'] = pidArray;
				log.debug('sovalues  : ', sovalues);
				return sovalues;
			}
			else{
				return null;
			}
		}catch(read850Err){
			log.error('read850 error: ', read850Err.message);

			var emailSubject = 'Network Corporate EDI 850 EDI File: '+edifile+' read Error for ';
			var emailBody = '<br/><p>The Network Corporate 850 EDI file was read Unsuccessful. Please find the details:<br/>';
			emailBody += read850Err.message+'</p>';
			sendDetailedEmail(emailSubject, emailBody);
		}
	}

	function getCustomerID(customernetworknumber){
		try{
			var customernetworknumberVal = parseInt(customernetworknumber, 10);
			log.debug('customernetworknumber is '+ customernetworknumber, ' customernetworknumberVal is '+ customernetworknumberVal);

			var customerNoSearchType = 'customer';
			var customerNoSearchFilters = [
				search.createFilter({
					name: 'custrecord_address_shiplist_no',
					join: 'address',
					operator: 'is',
					values: customernetworknumberVal
				})];
			var customerNoSearchColumns = [
				search.createColumn({
					name: 'internalid'
				}),
				search.createColumn({
					name: 'companyname'
				}),
				search.createColumn({
					name: 'custentity_warehouse'
				}),
				search.createColumn({
					name: 'addressinternalid',
					join: 'Address'
				}),
				search.createColumn({
					name: 'custrecord_address_shiplist_no',
					join: 'Address'
				}),
				search.createColumn({
					name: 'addressee',
					join: 'Address'
				}),
				search.createColumn({
					name: 'attention',
					join: 'Address'
				}),
				search.createColumn({
					name: 'address1',
					join: 'Address'
				}),
				search.createColumn({
					name: 'address2',
					join: 'Address'
				}),
				search.createColumn({
					name: 'address3',
					join: 'Address'
				}),
				search.createColumn({
					name: 'city',
					join: 'Address'
				}),
				search.createColumn({
					name: 'state',
					join: 'Address'
				}),
				search.createColumn({
					name: 'country',
					join: 'Address'
				}),
				search.createColumn({
					name: 'zipcode',
					join: 'Address'
				})];

			var customerNoSearchResult = returnSearchResults('', customerNoSearchType, customerNoSearchFilters, customerNoSearchColumns);
			log.emergency('customerNoSearchResult : ', customerNoSearchResult);

			if(customerNoSearchResult){
				if(customerNoSearchResult.length > 0 ){
					return customerNoSearchResult;
				}
				else{
					return null;
				}
			}
			else{
				return null;
			}
		}catch(getCustomerIDErr){
			log.error('getCustomerID error: ', getCustomerIDErr.message);
		}
	}

	function getItemDetails(itemsapnumber){
		try{
			log.debug('itemsapnumber : ', itemsapnumber);
			if(itemsapnumber != '' && itemsapnumber != null && itemsapnumber != undefined){
				var itemIDSearchType = 'item';

				var itemIDSearchFilters = [
					['custitem_acc_sap_code', search.Operator.IS, itemsapnumber],
					'OR',
					['custitem_acc_sap_code2', search.Operator.IS, itemsapnumber]
					];

				var itemIDSearchColumns = [
					search.createColumn({
						name: 'internalid'
					}),
					search.createColumn({
						name: 'custitem_acc_sap_code'
					}),
					search.createColumn({
						name: 'custitem_acc_sap_code2'
					}),
					search.createColumn({
						name: 'saleunit'
					}),
					search.createColumn({
						name: 'custitem_pla_unit'
					}),
					search.createColumn({
						name: 'itemid'
					})];

				var itemIDSearchResult = returnSearchResults('', itemIDSearchType, itemIDSearchFilters, itemIDSearchColumns);
				log.debug('itemIDSearchResult : ', itemIDSearchResult);

				if(!isEmpty(itemIDSearchResult)){
					return itemIDSearchResult;
				}
				else{
					return null;
				}
			}
			else{
				return null;
			}
		}catch(getItemDetailsErr){
			log.error('getItemDetails error: ', getItemDetailsErr.message);
		}
	}	

	function createSalesOrderFrom850(sodata, edifilename) {
		try{
			log.audit('sodata is  : ', sodata);
			var curEDISOProcessing_Error = '';
			var currentCustPONumber = sodata['customerpono'];
			if(!currentCustPONumber){
				curEDISOProcessing_Error += 'Customer PO Number is missing in the EDI File.\n';
			}
			//var currentSOOrderDate = sodata['soorderdate'];
			var currentNetworkPoNumber = sodata['networkpono'];
			if(!currentNetworkPoNumber){
				curEDISOProcessing_Error += 'Network PO Number is missing in the EDI File.\n';
			}
			var currentRequestedDeliveryDate = sodata['requesteddeliverydate'];
			if(!currentRequestedDeliveryDate){
				curEDISOProcessing_Error += 'Requested Delivery Date is missing in the EDI File.\n';
			}
			var currentOrderEntryDate = sodata['orderentrydate'];
			if(!currentOrderEntryDate){
				curEDISOProcessing_Error += 'Order Entry Date is missing in the EDI File.\n';
			}
			var currentCustNetworkAccountNum = sodata['customernetworknumber'];
			if(!currentCustNetworkAccountNum){
				curEDISOProcessing_Error += 'Customer Network Account Number is missing in the EDI File.\n';
			}

			var currentShipAttention = sodata['shipattention'];
			var currentShipAddressee = sodata['shipaddressee'];
			var currentShiptoAddr1 = sodata['shiptoaddr1'];
			var currentShiptoAddr2 = sodata['shiptoaddr2'];
			var currentShiptoCity = sodata['shiptocity'];
			var currentShiptoState = sodata['shiptostate'];
			var currentShiptoZip = sodata['shiptozip'];
			var currentShiptoCountry = sodata['shipcountry'];

			var currentBillAttention = sodata['billattention'];
			var currentBillAddressee = sodata['billaddressee'];
			var currentBilltoAddr1 = sodata['billtoaddr1'];
			var currentBilltoAddr2 = sodata['billtoaddr2'];
			var currentBilltoCity = sodata['billtocity'];
			var currentBilltoState = sodata['billtostate'];
			var currentBilltoZip = sodata['billtozip'];
			var currentBilltoCountry = sodata['billcountry'];

			var currentBuyerContactName = sodata['buyercontactname'];
			var currentBuyerContactPhone = sodata['buyercontactphone'];
			var currentBuyerContactEmail= sodata['buyercontactemail'];
			var currentBuyerMessage = sodata['buyermessage'];
			var currentSOLines = sodata['solines'];
			if(!currentSOLines){
				curEDISOProcessing_Error += 'Item lines are missing in the EDI File.\n';
			}
			var currentSOLineDescription = sodata['solinedetails'];

			log.debug('currentCustPONumber is '+ currentCustPONumber+' currentNetworkPoNumber is '+ currentNetworkPoNumber, ' currentRequestedDeliveryDate is '+ currentRequestedDeliveryDate+' currentOrderEntryDate is '+ currentOrderEntryDate+' currentCustNetworkAccountNum is '+ currentCustNetworkAccountNum);
			log.debug('currentShipAddressee is '+ currentShipAddressee+' currentShiptoAddr1 is '+ currentShiptoAddr1+' currentShiptoAddr2 is '+ currentShiptoAddr2, ' currentShiptoCity is '+ currentShiptoCity+' currentShiptoState is '+ currentShiptoState+' currentShiptoZip is '+ currentShiptoZip);
			log.debug('currentShiptoCountry is '+ currentShiptoCountry+' currentBuyerContactName is '+ currentBuyerContactName+' currentBuyerContactPhone is '+ currentBuyerContactPhone, ' currentBuyerContactEmail is '+ currentBuyerContactEmail+' currentBuyerMessage is '+ currentBuyerMessage);
			log.audit('currentSOLines  : ', currentSOLines);
			log.audit('currentSOLineDescription  : ', currentSOLineDescription);

			if(currentCustNetworkAccountNum != '' && currentCustNetworkAccountNum != null && currentCustNetworkAccountNum != undefined && isEmpty(curEDISOProcessing_Error)){
				var customerDetails = getCustomerID(currentCustNetworkAccountNum);

				if(customerDetails != '' && customerDetails != null && customerDetails != undefined){
					var customerID  = customerDetails[0].getValue({name: 'internalid'});
					var customerName  = customerDetails[0].getValue({name: 'companyname'});
					var customerWarehouse  = customerDetails[0].getValue({name: 'custentity_warehouse'});
					var currentShipAddressInternalID  = customerDetails[0].getValue({name: 'addressinternalid', join: 'Address'});

					var currentSalesOrderRecObj = record.create({
						type: 'salesorder', isDynamic: true
					});

					if(currentCustPONumber != '' && currentCustPONumber != null && currentCustPONumber != undefined){
						currentSalesOrderRecObj.setValue('entity', customerID);
						if(currentCustPONumber){
							currentSalesOrderRecObj.setValue('otherrefnum', currentCustPONumber);
						}

						if(currentOrderEntryDate){
							currentSalesOrderRecObj.setValue('trandate', new Date(currentOrderEntryDate));
						}

						if(currentNetworkPoNumber){
							currentSalesOrderRecObj.setValue('custbody_edi_network_po_no', currentNetworkPoNumber);
						}

						if(currentRequestedDeliveryDate){
							currentSalesOrderRecObj.setValue('startdate', new Date(currentRequestedDeliveryDate));
						}

						if(customerWarehouse){
							currentSalesOrderRecObj.setValue('location', customerWarehouse);
						}

						currentSalesOrderRecObj.setValue('orderstatus', SOPendingFulfillmentStatus);
						currentSalesOrderRecObj.setValue('custbody_edi_sync_status', EDI_Status_Field_Details.EDI_850_Request_Sync_Successful);
						currentSalesOrderRecObj.setValue('custbody_address_shiplist_number', currentCustNetworkAccountNum);

						if(currentBuyerContactName){
							var buyerinfoString = currentBuyerContactName;
							if(currentBuyerContactPhone){
								buyerinfoString += ', Phone: ' + currentBuyerContactPhone; 
							}
							if(currentBuyerContactEmail){
								buyerinfoString += ', Email: ' + currentBuyerContactEmail;
							}
							log.audit('buyerinfoString  : ', buyerinfoString);
							currentSalesOrderRecObj.setValue('custbody_edi_buyer_info', buyerinfoString);
						}


						// Set the shipping address
						if(currentShipAddressInternalID){
							currentSalesOrderRecObj.setValue('shipaddresslist', currentShipAddressInternalID);

							if(!currentBillAddressee){
								currentSalesOrderRecObj.setValue('billaddresslist', currentShipAddressInternalID);
							}
						}

						var itemFlag = 'F';
						for(var currentSOLinesLen = 0; currentSOLinesLen < currentSOLines.length; currentSOLinesLen++){
							log.debug('cur SO Line is  : ', currentSOLines[currentSOLinesLen]);
							//log.debug('cur SO Line details is  : ', currentSOLineDescription[currentSOLinesLen]);
							var curLineInfo = currentSOLines[currentSOLinesLen];
							var curLineItemDescription = '';
							var curItemDetails = '';
							var curItemID = '';
							var curLineUom = '';
							var curLineItemSAPCode = '';
							var curLineNo = curLineInfo[1];
							var curLineQty = curLineInfo[2];
							var curEDILineUom = curLineInfo[3];
							var curEDILineUnitPrice = curLineInfo[4];

							if(curLineInfo[6] == 'VP'){
								curLineItemSAPCode = curLineInfo[7];
								curItemDetails = getItemDetails(curLineItemSAPCode);

								if(curItemDetails != null && curItemDetails != '' && curItemDetails != undefined){
									curItemID  = curItemDetails[0].getValue({name: 'internalid'});
									var curItem_NetworkSAPCode1  = curItemDetails[0].getValue({name: 'custitem_acc_sap_code'});
									var curItem_NetworkSAPCode2  = curItemDetails[0].getValue({name: 'custitem_acc_sap_code2'});
									if(curLineItemSAPCode == curItem_NetworkSAPCode1){
										curLineUom = curItemDetails[0].getValue({name: 'saleunit'});
									}
									else if(curLineItemSAPCode == curItem_NetworkSAPCode2){
										curLineUom = curItemDetails[0].getValue({name: 'custitem_pla_unit'});
									}

									log.debug('curItemID is '+ curItemID, 'curLineItemSAPCode is '+ curLineItemSAPCode+' curLineUom is '+ curLineUom);
								}
								else{
									curEDISOProcessing_Error += 'Item SAP Code Number: '+curLineItemSAPCode+' is not found in NetSuite.\n';
								}
							}

							if(curItemID != '' && curItemID != null && curItemID != undefined){
								currentSalesOrderRecObj.selectNewLine({sublistId: 'item'});
								currentSalesOrderRecObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'item',
									value: curItemID
								});
								currentSalesOrderRecObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'quantity',
									value: curLineQty
								});
								currentSalesOrderRecObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'rate',
									value: curEDILineUnitPrice
								});
								currentSalesOrderRecObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_edi_unit_price',
									value: curEDILineUnitPrice
								});
								currentSalesOrderRecObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'units',
									value: curLineUom
								});
								currentSalesOrderRecObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_edi_vendor_uofm',
									value: curEDILineUom
								});

								currentSalesOrderRecObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_edi_item_sap_code',
									value: curLineItemSAPCode
								});

								if(customerWarehouse){
									currentSalesOrderRecObj.setCurrentSublistValue({
										sublistId: 'item',
										fieldId: 'location',
										value: customerWarehouse
									});
								}

								/*if(currentSOLineDescription){
									if(currentSOLineDescription.length > 0){
										curLineItemDescription = currentSOLineDescription[currentSOLinesLen];
										var curItemDescription = curLineItemDescription[5];

										if(curItemDescription){
											currentSalesOrderRecObj.setCurrentSublistValue({
												sublistId: 'item',
												fieldId: 'description',
												value: curItemDescription
											});
										}
									}
								}*/

								currentSalesOrderRecObj.commitLine({sublistId: 'item'});

								itemFlag = 'T';
							}
						}

						if(!isEmpty(curEDISOProcessing_Error)){
							var identifyingValforSO = '';
							if(currentCustPONumber){
								identifyingValforSO = 'Customer PO Number: '+currentCustPONumber;
							}
							else if(currentNetworkPoNumber){
								identifyingValforSO = 'Network PO Number: '+currentNetworkPoNumber;
							}

							var emailSubject = 'Network Corporate 850-'+edifilename+': Sales Order Item Line Creation Unsuccessful at ';
							var emailBody = ',<br/><p>The Network Corporate 850 Sales Order Creation was Unsuccessful for '+edifilename+'. Please find the details:<br/>';
							emailBody += identifyingValforSO+'<br/>';
							emailBody += curEDISOProcessing_Error+'</p>';

							sendDetailedEmail(emailSubject, emailBody);
						}

						log.debug('cur SO itemFlag is  : ', itemFlag);
						log.audit('currentSalesOrderRecObj is ', currentSalesOrderRecObj);
						if(itemFlag == 'T'){
							currentSalesOrderRecObj.setValue('custbody_aps_entered_by', Network_Orders_Employee);
							if(edifilename){
								currentSalesOrderRecObj.setValue('custbody_edi_file_details', edifilename);
							}
							try{
								var newSalesOrderId = currentSalesOrderRecObj.save({enableSourcing: false, ignoreMandatoryFields: true});
								log.audit('newSalesOrderId is ', newSalesOrderId);
							}catch(salesOrderCreationErr){
								log.error('salesOrderCreationErr error: ', salesOrderCreationErr.message);
								var identifyingValforSO = '';
								if(customerName){
									identifyingValforSO = 'Customer Name: '+customerName;
								}
								else if(currentCustNetworkAccountNum){
									identifyingValforSO = 'Customer Network Account Number: '+currentCustNetworkAccountNum;
								}

								var emailSubject = 'Network Corporate 850-'+edifilename+': Sales Order Creation Unsuccessful at ';
								var emailBody = ',<br/><p>The Network Corporate 850 Sales Order Creation was Unsuccessful for '+edifilename+'. Please find the details:<br/>';
								emailBody += identifyingValforSO+'<br/>';
								emailBody += salesOrderCreationErr.message+'</p>';
								sendDetailedEmail(emailSubject, emailBody);
							}
							if(newSalesOrderId){
								return newSalesOrderId;
							}
							else{
								return null;
							}
						}
						else{
							return null;
						}
					}
				}
				else{
					curEDISOProcessing_Error += 'Customer Network Account Number: '+currentCustNetworkAccountNum+' is not found in NetSuite.\n';
					var identifyingValforSO = '';
					if(currentCustPONumber){
						identifyingValforSO = 'Customer PO Number: '+currentCustPONumber;
					}
					else if(currentNetworkPoNumber){
						identifyingValforSO = 'Network PO Number: '+currentNetworkPoNumber;
					}

					var emailSubject = 'Network Corporate 850-'+edifilename+': Sales Order Creation Unsuccessful at ';
					var emailBody = ',<br/><p>The Network Corporate 850 Sales Order Creation was Unsuccessful for '+edifilename+'. Please find the details:<br/>';
					emailBody += identifyingValforSO+'<br/>';
					emailBody += curEDISOProcessing_Error+'</p>';

					sendDetailedEmail(emailSubject, emailBody);

					return null;
				}
			}
			else{
				var identifyingValforSO = '';
				if(currentCustPONumber){
					identifyingValforSO = 'Customer PO Number: '+currentCustPONumber;
				}
				else if(currentNetworkPoNumber){
					identifyingValforSO = 'Network PO Number: '+currentNetworkPoNumber;
				}
				else if(currentCustNetworkAccountNum){
					identifyingValforSO = 'Customer Network Account Number: '+currentCustNetworkAccountNum;
				}

				var emailSubject = 'Network Corporate 850-'+edifilename+': Sales Order Creation Unsuccessful at ';
				var emailBody = ',<br/><p>The Network Corporate 850 Sales Order Creation was Unsuccessful for '+edifilename+'. Please find the details:<br/>';
				emailBody += identifyingValforSO+'<br/>';
				emailBody += curEDISOProcessing_Error+'</p>';

				sendDetailedEmail(emailSubject, emailBody);
			}
		}catch(createSalesOrderFrom850Err){
			log.error('createSalesOrderFrom850 error: ', createSalesOrderFrom850Err.message);

			var emailSubject = 'Network Corporate 850-'+edifilename+': Sales Order Creation Unsuccessful at ';
			var emailBody = ',<br/><p>The Network Corporate 850 Sales Order Creation was Unsuccessful for '+edifilename+'. Please find the details:<br/>';
			emailBody += createSalesOrderFrom850Err.message+'</p>';
			sendDetailedEmail(emailSubject, emailBody);
		}
	}

	function createCSVAckReport(soIds) {
		try{
			var csvBody = '';
			if(!isEmpty(soIds)){
				var networkCorp850_SOSearchFilters = [
					search.createFilter({
						name: 'internalid',
						join: null,
						operator: 'anyof',
						values: soIds
					})];
				var networkCorp850_SOSearchResult = returnSearchResults(Network_SO_Corporate_AckEmail_SavedSearch_Id, '', networkCorp850_SOSearchFilters);
				log.debug('Network Corporate 850 Sales Order Search Result is ', networkCorp850_SOSearchResult);

				if (networkCorp850_SOSearchResult == null || networkCorp850_SOSearchResult.length < 1) return null;
				for (var i=0; i<networkCorp850_SOSearchResult.length; i++){
					var customerName = networkCorp850_SOSearchResult[i].getText({name: 'entity'});
					if (customerName.indexOf('"') != -1) {
						customerName = customerName.replace(/"/g, '""');
					}
					if (customerName.match(/"|,/)) {
						customerName = '"' + customerName + '"';
					}

					var lineDescription = networkCorp850_SOSearchResult[i].getValue({name: 'memo'});
					if (lineDescription.indexOf('"') != -1) {
						lineDescription = lineDescription.replace(/"/g, '""');
					}
					if (lineDescription.match(/"|,/)) {
						lineDescription = '"' + lineDescription + '"';
					}

					csvBody += customerName + ',';
					csvBody += networkCorp850_SOSearchResult[i].getValue({name: 'tranid'}) + ',';
					csvBody += networkCorp850_SOSearchResult[i].getValue({name: 'otherrefnum'}) + ',';
					csvBody += networkCorp850_SOSearchResult[i].getValue({name: 'custbody_edi_network_po_no'}) + ',';
					csvBody += networkCorp850_SOSearchResult[i].getValue({name: 'trandate'}) + ',';
					csvBody += networkCorp850_SOSearchResult[i].getText({name: 'item'}) + ',';
					csvBody += lineDescription + ',';
					csvBody += networkCorp850_SOSearchResult[i].getValue({name: 'quantity'}) + ',';
					csvBody += networkCorp850_SOSearchResult[i].getValue({name: 'unit'}) + ',';
					csvBody += networkCorp850_SOSearchResult[i].getValue({name: 'rate'}) + ',';
					csvBody += networkCorp850_SOSearchResult[i].getValue({name: 'custcol_edi_unit_price'}) + ',';
					csvBody += networkCorp850_SOSearchResult[i].getValue({name: 'amount'}) + '\n';
				}
				return csvBody;
			}
		}catch(createCSVAckReportErr){
			log.error('createCSVAckReport error: ', createCSVAckReportErr.message);
		}
	}

	function getInputData() {
		try{
			log.audit('****** ACME MR Process Network Corp 850 Script Begin ******', '****** ACME MR Process Network Corp 850 Script Begin ******');

			var edi850FileObjArray = sftpConnectionDownload();
			//var edi850FileObj = file.load({id:157739});
			if(!isEmpty(edi850FileObjArray)){
				log.debug('edi850FileObjArray length : ', edi850FileObjArray.length);
				var salesOrderLinesArray = new Array();
				var processedEDI850FileNameArray = new Array();
				for(var edi850FileObjArrayIndex = 0; edi850FileObjArrayIndex < edi850FileObjArray.length; edi850FileObjArrayIndex++){
					var curEDI850FileObj = edi850FileObjArray[edi850FileObjArrayIndex];
					log.audit('curEDI850FileObj for index : '+edi850FileObjArrayIndex+' ', curEDI850FileObj);
					var edi850FileName = curEDI850FileObj.name;
					var edi850FileContents = curEDI850FileObj.getContents();
					var decodedEDI850FileContents = encode.convert({
						string: edi850FileContents,
						inputEncoding: encode.Encoding.BASE_64,
						outputEncoding: encode.Encoding.UTF_8
					});
					log.debug('decodedEDI850FileContents : ', decodedEDI850FileContents);
					var edi850FileStaticInformation = get850EDIFileData();
					//log.debug('edi850FileStaticInformation ', edi850FileStaticInformation);
					//log.debug('Line segment id is ', EDI_850_File_Information_Field_Details.EDI_File_Segment_Delimiter);

					if(edi850FileStaticInformation){
						if(edi850FileStaticInformation.length > 0){
							var curSegmentDelimeter  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Segment_Delimiter});
							var curElementDelimeter  = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Element_Delimiter});
							var curTransactionSetHeader = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Header});
							var curTransactionSetTrailer = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Trailer});
							var curTransactionSetIdentifierCode = edi850FileStaticInformation[0].getValue({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Identifier_Code});

							var edi850FileSegments = decodedEDI850FileContents.split(curSegmentDelimeter);
							log.debug('edi850FileSegments  : ', edi850FileSegments);

							var startSegmentVal = curTransactionSetHeader+curElementDelimeter+curTransactionSetIdentifierCode;
							var endSegmentVal = curTransactionSetTrailer+curElementDelimeter;

							log.debug('startSegmentVal is '+ startSegmentVal, 'endSegmentVal is '+ endSegmentVal);

							var currentSalesOrderArray = getAllLines(edi850FileSegments, startSegmentVal, endSegmentVal, edi850FileName);
							log.debug('currentSalesOrderArray  : ', currentSalesOrderArray);
							salesOrderLinesArray = salesOrderLinesArray.concat(currentSalesOrderArray);
							//salesOrderLinesArray = salesOrderLinesArray.concat(currentSalesOrderArray);
						}
					}
				}
				log.debug('salesOrderLinesArray  : ', salesOrderLinesArray);
				log.debug('salesOrderLinesArray length : ', salesOrderLinesArray.length);

				if(salesOrderLinesArray.length > 0){
					return salesOrderLinesArray;
				}
				else{
					log.audit('No 850 Network Corporate Sales Order line data found');
					return null;
				}
			}
			else{
				log.audit('No Network Corporate 850 File data found');
				return null;
			}
		}catch(getInputDataErr){
			log.error('getInputData error: ', getInputDataErr.message);
		}
	}

	function map(context) {
		log.debug('Map: context.value is ', context.value);
		if(context.value != '' && context.value != null && context.value != undefined){
			try{
				var parsedMapObj = JSON.parse(context.value);
				var ediFileName = parsedMapObj['edifilename'];
				var curSOLine = parsedMapObj['filedata'];
				log.audit('ediFileName  : ', ediFileName);
				log.audit('curSOLine  : ', curSOLine);
				var sodetails = read850(curSOLine, ediFileName);
				log.audit('sodetails  : ', sodetails);

				if(sodetails){
					var customerPONumber = sodetails['customerpono'];

					context.write({
						key: customerPONumber,
						value: {'edifilename': ediFileName, 'sodata': sodetails}
					});  //Key-Value pair
				}
			}catch(maperr){
				log.error('map stage error: ', maperr.message);
			}
		}
	}

	function reduce(context) {
		log.debug('Context values length is '+context.values.length, 'Context values is '+context.values);
		var soNumber = context.key;
		log.debug('soNumber is ', soNumber);

		if (context.values.length > 0){
			try{
				var parsedReduceObj = JSON.parse(context.values[0]);
				var currentEDIFileName = parsedReduceObj['edifilename'];
				var currentOrderDetails = parsedReduceObj['sodata'];
				log.debug('currentOrderDetails is ', currentOrderDetails);
				log.debug('currentEDIFileName is ', currentEDIFileName);

				var newOrderID = createSalesOrderFrom850(currentOrderDetails, currentEDIFileName);
				log.debug('newOrderID is ', newOrderID);

				if(newOrderID){
					context.write({
						key: newOrderID,
						value: currentEDIFileName
					});
				}
			}catch(reduceErr){
				log.error('Reduce stage for SO Number '+soNumber+' error: ', reduceErr.message);
			}
		}
	}

	function summarize(summary) {
		handleErrorIfAny(summary);
		try{
			var csvFileLineData = '';
			var curNetworkSOIds = new Array();
			var curNetworkEDIFileNames = new Array();
			summary.output.iterator().each(function(key, value) {
				log.debug('key is '+key, 'value is '+value);
				if(key){
					curNetworkSOIds[curNetworkSOIds.length] = key;
					curNetworkEDIFileNames[curNetworkEDIFileNames.length] = value;
				}
				return true;
			}); 

			log.debug('curNetworkSOIds is ', curNetworkSOIds);
			log.debug('curNetworkEDIFileNames is ', curNetworkEDIFileNames);

			if(curNetworkSOIds.length > 0){
				var csvFileLineData = createCSVAckReport(curNetworkSOIds);
				log.debug('csvFileLineData is ', csvFileLineData);
				if(csvFileLineData != null && csvFileLineData != ''){
					var csvHeaders = CSVFileHeaders[0] + ',' + CSVFileHeaders[1] + ',' + CSVFileHeaders[2] + ',' + CSVFileHeaders[3] + ',' + CSVFileHeaders[4] + ',' + CSVFileHeaders[5] + ',' + CSVFileHeaders[6] + ',' + CSVFileHeaders[7] + ',' + CSVFileHeaders[8] + ',' + CSVFileHeaders[9] + ',' + CSVFileHeaders[10] + ',' + CSVFileHeaders[11] + '\n';
					var csvFileContent = '';
					csvFileContent += csvHeaders;
					csvFileContent += csvFileLineData;
					log.debug('csvFileContent is ', csvFileContent);
					var curDateTimeObj = new Date();
					var curDateTimeString = format.format({
						value: curDateTimeObj,
						type: format.Type.DATETIME
					});
					log.debug('curDateTimeString is ', curDateTimeString);

					var csvFileObj = file.create({
						name: 'Network Corporate 850 Orders list for_'+curDateTimeString+'.csv',
						fileType: file.Type.CSV,
						contents: csvFileContent
					});

					var emailSubject = 'Network Corporate 850: Sales Order Details  for ';
					var emailBody = '<br/>Please find the Network Corporate 850 Sales Order details attached in this email.<br/>';

					sendDetailedEmail(emailSubject, emailBody, csvFileObj);

				}
			}
			log.audit('****** ACME MR Process Network Corp 850 Script End ******', '****** ACME MR Process Network Corp 850 Script End ******');
		}catch(summarizeErr){
			log.error('Summarize stage error: ', summarizeErr.message);
		}
	}

	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize
	};

});