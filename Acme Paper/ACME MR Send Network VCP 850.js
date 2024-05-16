/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : Map/ Reduce Script
 * Script Name      : ACME MR Send Network VCP 850
 * Version               : 2.0
 * Description        : This script will run daily to create a 850 EDI file in NetSuite and sends to the Network VCP SFTP server. 
 */

/*
 * Purchase Order Date format: CCYYMMDD
 * 
 */

define(['N/search', 'N/record', 'N/log' ,'N/runtime', 'N/format', 'N/email', 'N/encode', 'N/file', 'N/task', 'N/sftp', 'N/error', 'N/cache'],

		function(search, record, log, runtime, format, email, encode, file, task, sftp, error, cache) {

	var Network_VCP_PO850_SearchId_ScriptField = 'custscript_network_vcp_po850_searchid';

	var SFTPPort = 22;
	var Network_VCP_SFTPInteg_Username_ScriptField = 'custscript_networkvcp_sftpinteg_username';
	var Network_VCP_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_networkvcp_sftpinteg_pwd_guid';
	var Network_VCP_SFTPInteg_URL_ScriptField = 'custscript_networkvcp_sftpinteg_sftp_url';
	var Network_VCP_SFTPInteg_Hostkey_ScriptField = 'custscript_networkvcp_sftpinteg_host_key';
	var Network_VCP_SFTPInteg_SFTPDir_ScriptField = 'custscript_networkvcp_sftpinteg_sftp_dir';

	var EDI_FileType = '850';
	var IntegrationName = 'Network_VCP';
	var EDI_File_Information_CustomRecord_ID = 'customrecord_acc_edi_file_setup';
	var Daily_EDI_File_Details_CustomRecord_ID = 'customrecord_daily_edi_file_details';
	var EDI_Unit_Of_Measure_Mapping_CustomRecord_ID = 'customrecord_edi_uom_mapping';
	var Network_VCP_Integration_Supplier_Details_CustomRecord_ID = 'customrecord_edi_networkvcp_supplier_det';

	var Network_Orders_Employee = '72782';

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
			'EDI_File_Interchange_Control_Number_Length': 'custrecord_edi_interchange_cntrl_num_len',
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
			'EDI_File_Date_Time_Qualifier': 'custrecord_edi_date_time_qualifier',
			'EDI_File_Message_Text_Header': 'custrecord_edi_message_text_header',
			'EDI_File_Name_Header': 'custrecord_edi_name_header',
			'EDI_File_Entity_Identifier_Code': 'custrecord_edi_entity_identifier_code',
			'EDI_File_Identification_Code_Qualifier': 'custrecord_edi_identification_code_quali',
			'EDI_File_Additional_Name_Information_Header': 'custrecord_edi_addl_name_info_header',
			'EDI_File_Address_Information_Header': 'custrecord_edi_address_info_header',
			'EDI_File_Geographic_Location_Header': 'custrecord_edi_geographical_loc_header',
			'EDI_File_Baseline_Item_Data_Header': 'custrecord_edi_baseline_item_data_header',
			'EDI_File_Item_Product_Service_ID_Qualifier': 'custrecord_edi_prod_service_id_qualifier',
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

	var Network_VCP_Integration_Supplier_Field_Details = {
			'VCP_Supplier_Name': 'custrecord_edi_networkvcp_supplier_name',
			'VCP_Supplier_ID': 'custrecord_edi_networkvcp_supplier_id',
			'VCP_Supplier_Shipping_Type': 'custrecord_edi_networkvcp_supplship_type',
			'VCP_Supplier_Location': 'custrecord_edi_networkvcp_supplier_loctn',
			'VCP_Supplier_Ship_To_ID': 'custrecord_edi_networkvcp_suppl_shiptoid',
			'VCP_Supplier_Bill_To_ID': 'custrecord_edi_networkvcp_suppl_billtoid',
			'VCP_Supplier_Buyer_ID': 'custrecord_edi_networkvcp_suppl_buyer_id',
			'VCP_Supplier_Drop_Ship': 'custrecord_edi_networkvcp_suppl_dropship'
	};

	var Network_VCP_Supplier_Shipping_Type_Details = {
			'Drop_Ship': 'Drop Ship',
			'Direct_Ship': 'Direct Whse Ship'
	};

	var EDI_Unit_Of_Measure_Mapping_Fields = {
			'EDI_Vendor_Name': 'custrecord_edi_uom_vendor',
			'EDI_Acme_UnitOfMeasure': 'custrecord_edi_uom_acme_unit_of_measure',
			'EDI_Vendor_UnitOfMeasure': 'custrecord_edi_uom_vendo_unit_of_measure'
	};

	var Purchase_Order_Type_Code = {
			'Drop_Ship': 'DS',
			'New_Order': 'NE',
			'Stand-alone_Order': 'SA'
	};

	var Date_Time_Qualifier = {
			'Requested_Delivery_Date': '002'
	};

	var Entity_Identifier_Code = {
			'Bill_to_Party': 'BT',
			'Buyer_Name': 'BY',
			'Ship_To': 'ST'
	};

	var Item_Product_Service_ID_Qualifier = {
			'Vendor_No': 'VN',
			"Buyer_Part_No": "BP"
	};

	var EDI_Status_Field_Details = {
			'EDI_850_Request_Sync_Successful': 3,
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

	function generateEDIFileDateTime(){
		try{
			var todayDateObj = new Date();
			var todayDateString = todayDateObj.toISOString().slice(0,10).replace(/-/g, '');
			var todayTimeString = todayDateObj.toISOString().slice(11,16).replace(/:/g, '');
			log.debug('todayDateString is '+todayDateString, 'todayTimeString is '+todayTimeString);

			if(todayDateString && todayTimeString){
				return todayDateString+'_'+todayTimeString;
			}
			else{
				return null;
			}
		}catch(generateEDIFileDateTimeeErr){
			log.error('Error Occurred In ACME MR University of Maryland Integration script: generateEDIFileDateTime Function is ', generateEDIFileDateTimeeErr);

		}
	}

	function pad_with_zeroes(number, length) {

		var num_string = '' + number;
		while (num_string.length < length) {
			num_string = '0' + num_string;
		}

		return num_string;

	}

	function repeatStringNumTimes(mainstring, times) {
		var repeatedString = '';
		while (times > 0) {
			repeatedString += mainstring;
			times--;
		}
		return repeatedString;
	}

	function formatDateTime(datetime, formattype) {

		if(datetime && formattype == 'CCYYMMDD'){
			var d = new Date(datetime),
			month = '' + (d.getMonth() + 1),
			day = '' + d.getDate(),
			year = d.getFullYear();

			if (month.length < 2) 
				month = '0' + month;
			if (day.length < 2) 
				day = '0' + day;

			return year+month+day;
		}

		else if(datetime && formattype == 'YYMMDD'){
			var d = new Date(datetime),
			month = '' + (d.getMonth() + 1),
			day = '' + d.getDate(),
			year = d.getFullYear().toString();

			if (month.length < 2) 
				month = '0' + month;
			if (day.length < 2) 
				day = '0' + day;
			if (year.length == 4) 
				year = year.substr(2,4);

			return year+month+day;
		}

		else if(datetime && formattype == 'HHMM'){
			var d = new Date(datetime);
			hour = d.getHours().toString(),
			minutes = d.getMinutes().toString();

			if (hour.length < 2) 
				hour = '0' + hour;
			if (minutes.length < 2) 
				minutes = '0' + minutes;
			return hour+minutes;
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
			if (curValue instanceof String) {
				if (curValue == '') {
					return true;
				}
			} 
			else if (curValue instanceof Array) {
				if (curValue.length == 0) {
					return true;
				}
			}
			return false;
		}
	}

	function sftpConnectionUpload(fileObjArray) {
		try{
			log.debug('fileObjArray : ', fileObjArray);
			if(fileObjArray){
				var network_VCP_UserName =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_Username_ScriptField});
				log.debug('Network VCP User Name is ', network_VCP_UserName);
				var network_VCP_PwdGUID =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_Pwd_GUID_ScriptField});
				log.debug('Network VCP Password GUID is ', network_VCP_PwdGUID);
				var network_VCP_SFTPurl =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_URL_ScriptField});
				log.debug('Network VCP SFTP Url is ', network_VCP_SFTPurl);
				var network_VCP_Hostkey =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_Hostkey_ScriptField});
				log.debug('Network VCP Host Key is ', network_VCP_Hostkey);
				var network_VCP_SFTPDirectory =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_SFTPDir_ScriptField});
				log.debug('Network VCP SFTP Directory is ', network_VCP_SFTPDirectory);

				var network_VCP_SFTPconnection = sftp.createConnection({
					username: network_VCP_UserName,
					passwordGuid: network_VCP_PwdGUID,
					url: network_VCP_SFTPurl,
					hostKey: network_VCP_Hostkey,
					port : SFTPPort,
					directory: network_VCP_SFTPDirectory
				});

				log.debug('connection : ', network_VCP_SFTPconnection);

				if(network_VCP_SFTPconnection && fileObjArray.length > 0){
					var network_VCP_SFTPUploadStatus = '';
					for (var fileObjArrayIndex = 0; fileObjArrayIndex < fileObjArray.length; fileObjArrayIndex++) {
						var curEDIFileObj = fileObjArray[fileObjArrayIndex];

						if(network_VCP_SFTPDirectory && curEDIFileObj){
							network_VCP_SFTPconnection.upload({
								//directory: network_VCP_SFTPDirectory,
								file: curEDIFileObj,
								replaceExisting: true
							});
							log.debug('DEBUG', 'Uploaded file : '+curEDIFileObj.name);
							//network_VCP_DailyRepUpload_sendAckEmail('Network VCP 850', 'Successful', 'Uploaded the Network VCP 850 file successfully to the Network VCP SFTP server');
							network_VCP_SFTPUploadStatus = true;
						}
						else{
							network_VCP_SFTPUploadStatus = false;
							//network_VCP_DailyRepUpload_sendAckEmail('Network VCP 850', 'Unsuccessful', 'SFTP Directory not found in the script parameter');
						}
					}
					return network_VCP_SFTPUploadStatus;
				}//connection
			}
		} catch(sftpConnectionUploadErr){
			log.error('Error Occurred InACME MR Send Network VCP 850 script: sftpConnectionUpload Function is ', sftpConnectionUploadErr);
			//network_VCP_DailyRepUpload_sendAckEmail('Network VCP', 'Unsuccessful', sftpConnectionUploadErr.message);
		}
	}

	function network_VCP_DailyRepUpload_sendAckEmail(actionType, status, statusDetails){
		try{
			var curDateTimeObj = new Date();
			var curDateTimeString = format.format({
				value: curDateTimeObj,
				type: format.Type.DATETIME
			});
			//log.debug('network_VCP_DailyRepUpload_sendAckEmail function: curDateTimeString is ', curDateTimeString);

			var emailRecipients = runtime.getCurrentScript().getParameter({name: Cym_DailyInvRep_AckEmail_Reci_ScriptField});

			var emailSubject = actionType+' connection and Daily EDI 850 Report upload '+status+' for '+curDateTimeString;
			var emailBody = 'Hi Team,<br/><p>The '+actionType+' connection and Daily EDI 850 Report upload status is given below:<br/>';
			emailBody += statusDetails;
			emailBody += '</p><br/>Thank you';

			//log.debug('emailRecipients are '+emailRecipients, 'emailBody is '+emailBody);
			if(emailRecipients){
				email.send({
					author: Network_Orders_Employee,
					recipients: emailRecipients,
					subject: emailSubject,
					body: emailBody
				});
				log.debug('Ack email sent for '+actionType);
			}
		}catch(network_VCP_DailyRepUpload_sendAckEmailErr){
			log.error('Error Occurred In ACME MR Send Network VCP 850 Script: network_VCP_DailyRepUpload_sendAckEmail Function is ', network_VCP_DailyRepUpload_sendAckEmailErr);
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
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Number_Length}),
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
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Date_Time_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Message_Text_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Name_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Entity_Identifier_Code}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Identification_Code_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Additional_Name_Information_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Address_Information_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Geographic_Location_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Item_Product_Service_ID_Qualifier}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Product_Item_Description_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Item_Description_Type}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Totals_Header}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Trailer}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Functional_Group_Trailer}),
				search.createColumn({name: EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Trailer})
				];

			var edi_850_File_InformationSearchResult = returnSearchResults('', EDI_File_Information_CustomRecord_ID, edi_850_File_InformationFilters, edi_850_File_InformationColumns);
			//log.emergency('EDI 850 File_Information Search Result is ', edi_850_File_InformationSearchResult);

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

	function updatePO_EDIStatus(poid){
		try{
			log.audit('updatePO_EDIStatus function: poid is ', poid);
			var updatePOId = record.submitFields({    
				type: 'purchaseorder',   
				id: poid, 
				values: {       
					custbody_edi_sync_status: EDI_Status_Field_Details.EDI_850_Request_Sync_Successful    
				}
			});
			log.audit('updatePOId is ', updatePOId);
		} catch(updatePO_EDIStatusErr){
			log.error('updatePO_EDIStatus error: ', updatePO_EDIStatusErr.message);
		}
	}

	function getEDIVendorUnitofMeasure(acmeuom){
		try{
			if(!isEmpty(acmeuom)){
				var edi_UOM_MappingFilters = [
					search.createFilter({
						name: EDI_Unit_Of_Measure_Mapping_Fields.EDI_Vendor_Name,
						join: null,
						operator: 'is',
						values: IntegrationName
					}),
					search.createFilter({
						name: EDI_Unit_Of_Measure_Mapping_Fields.EDI_Acme_UnitOfMeasure,
						join: null,
						operator: 'is',
						values: acmeuom
					})];

				var edi_UOM_MappingColumns = [
					search.createColumn({name: EDI_Unit_Of_Measure_Mapping_Fields.EDI_Vendor_Name}),
					search.createColumn({name: EDI_Unit_Of_Measure_Mapping_Fields.EDI_Acme_UnitOfMeasure}),
					search.createColumn({name: EDI_Unit_Of_Measure_Mapping_Fields.EDI_Vendor_UnitOfMeasure})
					];

				var edi_UOM_MappingSearchResult = returnSearchResults('', EDI_Unit_Of_Measure_Mapping_CustomRecord_ID, edi_UOM_MappingFilters, edi_UOM_MappingColumns);
				log.debug('EDI Unit of Measure Mapping Search Result is ', edi_UOM_MappingSearchResult);

				if(!isEmpty(edi_UOM_MappingSearchResult)){
					var curEDI_Uom = edi_UOM_MappingSearchResult[0].getValue({name: EDI_Unit_Of_Measure_Mapping_Fields.EDI_Vendor_UnitOfMeasure});
					var curACME_Uom = edi_UOM_MappingSearchResult[0].getValue({name: EDI_Unit_Of_Measure_Mapping_Fields.EDI_Acme_UnitOfMeasure});
					log.debug('curEDI_Uom is '+ curEDI_Uom, ' curACME_Uom is '+ curACME_Uom);
					return curEDI_Uom;
				}
				else{
					return null;
				}
			}
		}catch(getEDIVendorUnitofMeasureErr){
			log.error('Error Occurred In ACME MR Send Restockit 810 Invoice Integration script: getEDIVendorUnitofMeasure Function is ', getEDIVendorUnitofMeasureErr);
		}
	}

	function getNetworkVCPSupplierInfo(supplierid, shippingtype, warehouse) {
		try{
			var edi_NetworkVCPSupplierInfoFilters = [
				search.createFilter({
					name: 'internalid',
					join: 'custrecord_edi_networkvcp_supplier_name',
					operator: 'anyof',
					values: supplierid
				})];

			if(shippingtype){
				edi_NetworkVCPSupplierInfoFilters.push(search.createFilter({
					name: 'custrecord_edi_networkvcp_supplship_type',
					join: null,
					operator: 'is',
					values: shippingtype
				}));
			}

			if(warehouse){
				edi_NetworkVCPSupplierInfoFilters.push(search.createFilter({
					name: 'custrecord_edi_networkvcp_supplier_loctn',
					join: null,
					operator: 'anyof',
					values: warehouse
				}));
			}

			var edi_NetworkVCPSupplierInfoColumns = [
				search.createColumn({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Name}),
				search.createColumn({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_ID}),
				search.createColumn({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Shipping_Type}),
				search.createColumn({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Location}),
				search.createColumn({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Ship_To_ID}),
				search.createColumn({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Bill_To_ID}),
				search.createColumn({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Buyer_ID}),
				search.createColumn({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Drop_Ship})
				];

			var edi_NetworkVCPSupplierInfoSearchResult = returnSearchResults('', Network_VCP_Integration_Supplier_Details_CustomRecord_ID, edi_NetworkVCPSupplierInfoFilters, edi_NetworkVCPSupplierInfoColumns);
			log.debug('EDI Network VCP Supplier Info Search Result is ', edi_NetworkVCPSupplierInfoSearchResult);

			if(edi_NetworkVCPSupplierInfoSearchResult){
				if(edi_NetworkVCPSupplierInfoSearchResult.length > 0){
					return edi_NetworkVCPSupplierInfoSearchResult;
				}
				else{
					return null;
				}
			}
			else{
				return null;
			}
		} catch(getNetworkVCPSupplierInfoErr){
			log.error('getNetworkVCPSupplierInfo error: ', getNetworkVCPSupplierInfoErr.message);
		}
	}	

	function createPOLines(datafor850POLines) {
		try{
			var poString = '';
			log.debug('Purchase Order Data  is ', datafor850POLines);
			if(datafor850POLines){
				var headerinfo = datafor850POLines.header;
				log.audit('Purchase Order headerinfo  is ', headerinfo);

				//var edi850FileStaticInformation = get850EDIFileData();
				//log.debug('edi850FileStaticInformation ', edi850FileStaticInformation);
				//log.debug('Line segment id is ', EDI_850_File_Information_Field_Details.EDI_File_Segment_Delimiter);

				vcpSendEDI850Cache = cache.getCache({
					name: 'vcpSendEDI850Data',
					scope: cache.Scope.PRIVATE
				});
				log.audit('vcpSendEDI850Cache ', vcpSendEDI850Cache);
				edi850FileStaticInformationCacheData = JSON.parse(vcpSendEDI850Cache.get({ key: 'edi850FileStaticInformation', loader: get850EDIFileData }));
				log.audit('edi850FileStaticInformationCacheData ', edi850FileStaticInformationCacheData);
				log.audit('edi850FileStaticInformationCacheData: val is ', edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Transaction_Type_Code]);

				if(edi850FileStaticInformationCacheData){
					var curSegmentDelimeter  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Segment_Delimiter];
					var curElementDelimeter  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Element_Delimiter];
					var curSubelementDelimeter  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Subelement_Delimiter];

					var curBeginningSegmentHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Beginning_Segment_Header];
					var curTransactionSetPurposeCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Purpose_Code];
					var curTransactionTypeCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Transaction_Type_Code];
					var transactionTypeCodeObj = '';
					if(!isEmpty(curTransactionTypeCode)){
						transactionTypeCodeObj = JSON.parse(curTransactionTypeCode);
					}
					var currentSupplier = headerinfo.values.entity.value;
					log.audit('Purchase Order currentSupplier  is ', currentSupplier);

					var poNumber = headerinfo.values.tranid;
					var poTranDate = headerinfo.values.trandate;
					var poTranDateFormatted = formatDateTime(poTranDate, 'CCYYMMDD');
					log.debug('poTranDate is '+ poTranDate, ' poTranDateFormatted is '+ poTranDateFormatted);

					var purchaseOrderType = '';
					var createdfromSO = headerinfo.values.createdfrom.value;
					var createdfromSOCustomer = headerinfo.values['entity.createdFrom'].value;
					var curWarehouseVal = headerinfo.values.location.value;
					log.debug('createdfromSO is  '+createdfromSO+'| createdfromSOCustomer is  '+createdfromSOCustomer, 'curWarehouseVal is  '+curWarehouseVal);
					var edi_ShipToIdentificationCode, edi_BillToIdentificationCode, edi_BuyerIdentificationCode  = '';
					if(createdfromSO){
						if(!isEmpty(curTransactionTypeCode)){
							purchaseOrderType = transactionTypeCodeObj.Drop_Ship;
						}
						else{
							purchaseOrderType = Purchase_Order_Type_Code.Drop_Ship;
						}

						log.debug('currentSupplier is  '+currentSupplier+'| Shipping Type is  '+Network_VCP_Supplier_Shipping_Type_Details.Drop_Ship);
						var curNetworkVCPSupplierDetails = getNetworkVCPSupplierInfo(currentSupplier, Network_VCP_Supplier_Shipping_Type_Details.Drop_Ship);
						log.debug('curNetworkVCPSupplierDetails ', curNetworkVCPSupplierDetails);
						if(!isEmpty(curNetworkVCPSupplierDetails)){
							var curShiptoIDCode = curNetworkVCPSupplierDetails[0].getValue({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Ship_To_ID});
							var curBilltoIDCode = curNetworkVCPSupplierDetails[0].getValue({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Bill_To_ID});
							var curBuyerIDCode = curNetworkVCPSupplierDetails[0].getValue({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Buyer_ID});
							log.debug('curShiptoIDCode is  '+curShiptoIDCode+'| curBilltoIDCode is  '+curBilltoIDCode, 'curBuyerIDCode is  '+curBuyerIDCode);
							if(curShiptoIDCode && curBilltoIDCode && curBuyerIDCode){
								if(curShiptoIDCode != '99999'){
									var soCustomerObj = record.load({type: 'customer', id: createdfromSOCustomer});
									var curCustomerID = soCustomerObj.getValue('entitynumber');
									edi_ShipToIdentificationCode = curCustomerID + '-' + curShiptoIDCode;
								}
								else if(curShiptoIDCode == '99999'){
									edi_ShipToIdentificationCode = curShiptoIDCode;
								}
								log.debug('edi_ShipToIdentificationCode ', edi_ShipToIdentificationCode);
								edi_BillToIdentificationCode = curBilltoIDCode;
								edi_BuyerIdentificationCode = curBuyerIDCode;
							}
							else if(!curShiptoIDCode && curBilltoIDCode && curBuyerIDCode){
								edi_BillToIdentificationCode = curBilltoIDCode;
								edi_BuyerIdentificationCode = curBuyerIDCode;
							}
							else{
								return '';
							}
						}
					}
					else{
						if(!isEmpty(curTransactionTypeCode)){
							purchaseOrderType = transactionTypeCodeObj.New_Order;
						}
						else{
							purchaseOrderType = Purchase_Order_Type_Code.New_Order;
						}

						var curNetworkVCPSupplierDetails = getNetworkVCPSupplierInfo(currentSupplier, Network_VCP_Supplier_Shipping_Type_Details.Direct_Ship, curWarehouseVal);
						log.debug('curNetworkVCPSupplierDetails ', curNetworkVCPSupplierDetails);
						if(!isEmpty(curNetworkVCPSupplierDetails)){
							var curShiptoIDCode = curNetworkVCPSupplierDetails[0].getValue({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Ship_To_ID});
							var curBilltoIDCode = curNetworkVCPSupplierDetails[0].getValue({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Bill_To_ID});
							var curBuyerIDCode = curNetworkVCPSupplierDetails[0].getValue({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_Buyer_ID});
							if(curShiptoIDCode && curBilltoIDCode && curBuyerIDCode){
								edi_ShipToIdentificationCode = curShiptoIDCode;
								edi_BillToIdentificationCode = curBilltoIDCode;
								edi_BuyerIdentificationCode = curBuyerIDCode;
							}
							else{
								return '';
							}
						}
					}
					log.debug('edi_ShipToIdentificationCode is '+ edi_ShipToIdentificationCode, ' edi_BillToIdentificationCode is '+ edi_BillToIdentificationCode+' edi_BuyerIdentificationCode is '+ edi_BuyerIdentificationCode);

					poString += curBeginningSegmentHeader+curElementDelimeter+curTransactionSetPurposeCode+curElementDelimeter+purchaseOrderType+curElementDelimeter;  // Beginning of BEG Segment
					poString += poNumber+curElementDelimeter+curElementDelimeter+poTranDateFormatted+curSegmentDelimeter;   // End of BEG Segment
					log.debug('poString after BEG Segment is ', poString);

					var curReferenceIdentificationHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Reference_Identification_Header];
					var curReferenceIdentificationQualifier  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Reference_Identification_Qualifier];

					log.debug('curSegmentDelimeter is '+ curSegmentDelimeter+' curElementDelimeter is '+ curElementDelimeter+' curSubelementDelimeter is '+ curSubelementDelimeter, 'curBeginningSegmentHeader is '+ curBeginningSegmentHeader+' curTransactionSetPurposeCode is '+ curTransactionSetPurposeCode+' curReferenceIdentificationHeader is '+ curReferenceIdentificationHeader+' curReferenceIdentificationQualifier is '+ curReferenceIdentificationQualifier);

					poString += curReferenceIdentificationHeader+curElementDelimeter+curReferenceIdentificationQualifier+curElementDelimeter+poNumber+curSegmentDelimeter;  // REF Segment
					log.debug('poString after REF Segment is ', poString);

					var curCommunicationsContactHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Header];
					var curAdmComunicationsContactFunctionCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Function_Code];
					var curCommunicationNumberQualifier  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier];
					var curContactFunctionCode = '';
					if(!isEmpty(curTransactionTypeCode)){
						var admComunicationsContactFunctionCodeObj = JSON.parse(curAdmComunicationsContactFunctionCode);
						curContactFunctionCode = admComunicationsContactFunctionCodeObj.Mutually_Defined_Contact;
					}

					var communicationNumberQualifierObj = '';
					if(!isEmpty(curCommunicationNumberQualifier)){
						communicationNumberQualifierObj = JSON.parse(curCommunicationNumberQualifier);
					}

					var curBuyer = headerinfo.values.custbody_acc_buyer;
					var curBuyerName, curBuyerPhone, curBuyerEmail = '';
					//if(Object.keys(curBuyer).length > 0){
					if(curBuyer){
						curBuyerName = curBuyer.text;
						log.debug('curBuyer  '+curBuyer, 'curBuyerName is '+curBuyerName);
						var curBuyerID = curBuyer.value;
						//var buyerObj =record.load({type: 'employee', id: curBuyerID});
						if(!isEmpty(curBuyerID)){
							var buyerInfo = search.lookupFields({
								type: 'employee',
								id: curBuyerID,
								columns: ['phone', 'email']
							});

							curBuyerPhone = buyerInfo.phone;
							curBuyerEmail = buyerInfo.email;
						}
						log.debug('curBuyerPhone  '+curBuyerPhone, 'curBuyerEmail is '+curBuyerEmail);
					}

					if(curBuyerName && curContactFunctionCode){
						poString += curCommunicationsContactHeader+curElementDelimeter+curContactFunctionCode+curElementDelimeter+curBuyerName;  // PER Segment

						if(curBuyerPhone){
							if(!isEmpty(curCommunicationNumberQualifier)){
								poString += curElementDelimeter+communicationNumberQualifierObj.Contact_Phone_Number+curElementDelimeter+curBuyerPhone;
							}
						}

						if(curBuyerEmail){
							if(!isEmpty(curCommunicationNumberQualifier)){
								poString += curElementDelimeter+communicationNumberQualifierObj.Contact_Email+curElementDelimeter+curBuyerEmail;
							}
						}

						poString += curSegmentDelimeter;
						log.debug('poString after PER Segment is ', poString);
					}

					// DTM Segment
					var curDateTimeHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Date_Time_Header];
					var curDateTimeQualifier  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Date_Time_Qualifier];

					var requestedDeliveryDateQualifier = '';
					var requestedDueDate = headerinfo.values.duedate;
					var requestedDueDateFormatted = formatDateTime(requestedDueDate, 'CCYYMMDD');

					log.audit('requestedDueDate is '+requestedDueDate, 'requestedDueDateFormatted is '+requestedDueDateFormatted);
					if(requestedDueDateFormatted){
						if(!isEmpty(curDateTimeQualifier)){
							var curDateTimeQualifierObj = JSON.parse(curDateTimeQualifier);
							requestedDeliveryDateQualifier = curDateTimeQualifierObj.Requested_Delivery_Date;
						}
						else{
							requestedDeliveryDateQualifier = Date_Time_Qualifier.Requested_Delivery_Date;
						}

						poString += curDateTimeHeader+curElementDelimeter+requestedDeliveryDateQualifier+curElementDelimeter+requestedDueDateFormatted;  // DTM Segment
						poString += curSegmentDelimeter;
					}

					// MSG Header
					var curMessageTextHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Message_Text_Header];

					var curNameHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Name_Header];
					var curEntityIdentifierCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Entity_Identifier_Code];
					var curIdentificationCodeQualifier = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Identification_Code_Qualifier];
					var curAdditionalNameInformationHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Additional_Name_Information_Header];
					var curAddressInformationHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Address_Information_Header];
					var curGeographicLocationHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Geographic_Location_Header];

					var entitySTIdentifierCode = '';
					var entityBTIdentifierCode = '';
					var entityBYIdentifierCode = '';
					var curEntityIdentifierCodeObj = '';
					if(!isEmpty(curEntityIdentifierCode)){
						curEntityIdentifierCodeObj = JSON.parse(curEntityIdentifierCode);
						entitySTIdentifierCode = curEntityIdentifierCodeObj.Ship_To;
						entityBTIdentifierCode = curEntityIdentifierCodeObj.Bill_To;
						entityBYIdentifierCode = curEntityIdentifierCodeObj.Buyer_Name;
					}
					else{
						entitySTIdentifierCode = Entity_Identifier_Code.Ship_To;
						entityBTIdentifierCode = Entity_Identifier_Code.Bill_To;
						entityBYIdentifierCode = Entity_Identifier_Code.Buyer_Name;
					}
					log.debug('entitySTIdentifierCode  '+entitySTIdentifierCode, 'entityBTIdentifierCode is '+entityBTIdentifierCode+'entityBYIdentifierCode is '+entityBYIdentifierCode);
					var entityIdentificationCodeQualifier = '';
					if(!isEmpty(curIdentificationCodeQualifier)){
						var curIdentificationCodeQualifierObj = JSON.parse(curIdentificationCodeQualifier);
						entityIdentificationCodeQualifier = curIdentificationCodeQualifierObj.Seller_Agent_Code;
					}

					var curShipAttention = headerinfo.values.shippingattention;
					var curShipAddresse = headerinfo.values.shipaddressee;
					var curShipAddress1 = headerinfo.values.shipaddress1;
					var curShipAddress2 = headerinfo.values.shipaddress2;
					var curShipAddress3 = headerinfo.values.shipaddress3;
					var curShipCity = headerinfo.values.shipcity;
					var curShipState = headerinfo.values.shipstate;
					var curShipCountry = headerinfo.values.shipcountry.value;
					var curShipZip = headerinfo.values.shipzip;
					var curShipPhone = headerinfo.values.shipphone;
					var notesToVendor = headerinfo.values.custbody_acc_noted_to_vendor;
					var notesToVendor2 = headerinfo.values.custbody_detailed_description;
					if(notesToVendor || notesToVendor2){
						var notes = '';
						if (notesToVendor && notesToVendor2){
							notes = notesToVendor + '|'+ notesToVendor2;
						}else if(notesToVendor){
							notes = notesToVendor;
						}else if(notesToVendor2){
							notes = notesToVendor2;
						}
						poString += 'N9' + curElementDelimeter + 'L1' + curElementDelimeter + 'GEN' + curSegmentDelimeter; // N9 Segment
						notes = notes.replace(/\*|~|:|\\/gm, "-");
						notes = notes.replace(/´/gm, "'");
						notes = notes.replace(/\t/gm, " ");
						var notesList = notes.split(/\r|\n/gm);
						log.debug("createPOLines() notesList is: ", notesList);
						notesList = notesList.filter( Boolean );
						var notesListLength = notesList ? notesList.length: -1;
						for(var i = 0; i < notesListLength; i++){
							poString += 'MSG' + curElementDelimeter + notesList[i] + curSegmentDelimeter; // N9 Segment
						}
						log.debug("createPOLines() poString after N9 Segment is: ", poString);
						
					}
					log.debug('entityIdentificationCodeQualifier is '+ entityIdentificationCodeQualifier, ' edi_ShipToIdentificationCode is '+ edi_ShipToIdentificationCode);
					poString += curNameHeader+curElementDelimeter+entitySTIdentifierCode+curElementDelimeter+curShipAddresse;  // ST N1 Segment
					if(entityIdentificationCodeQualifier && edi_ShipToIdentificationCode){
						poString += curElementDelimeter+entityIdentificationCodeQualifier+curElementDelimeter+edi_ShipToIdentificationCode;
					}
					poString += curSegmentDelimeter;

					if(curShipAttention){
						poString += curAdditionalNameInformationHeader+curElementDelimeter+curShipAttention+curSegmentDelimeter;  // ST N2 Segment
					}

					if(curShipAddress1){
						curShipAddress1 = curShipAddress1.replace(new RegExp('\\' + curSegmentDelimeter, 'gi'), '');
						curShipAddress1 = curShipAddress1.replace(new RegExp('\\' + curElementDelimeter, 'gi'), '');
						curShipAddress1 = curShipAddress1.replace(new RegExp('\\' + curSubelementDelimeter, 'gi'), '');
						poString += curAddressInformationHeader+curElementDelimeter+curShipAddress1;  // ST N3 Segment
						if(curShipAddress2 ){
							curShipAddress2 = curShipAddress2.replace(new RegExp('\\' + curSegmentDelimeter, 'gi'), '');
							curShipAddress2 = curShipAddress2.replace(new RegExp('\\' + curElementDelimeter, 'gi'), '');
							curShipAddress2 = curShipAddress2.replace(new RegExp('\\' + curSubelementDelimeter, 'gi'), '');
							var additionalSTAddressInfo = curShipAddress2 ;
							if(curShipAddress3 ){
								curShipAddress3 = curShipAddress3.replace(new RegExp('\\' + curSegmentDelimeter, 'gi'), '');
								curShipAddress3 = curShipAddress3.replace(new RegExp('\\' + curElementDelimeter, 'gi'), '');
								curShipAddress3 = curShipAddress3.replace(new RegExp('\\' + curSubelementDelimeter, 'gi'), '');
								additionalSTAddressInfo += ', '+curShipAddress3; 
							}
							poString += curElementDelimeter+additionalSTAddressInfo;
						}
						poString += curSegmentDelimeter;
					}
					log.emergency('poString after ST N3 Segment is ', poString);
					if(curShipCity || curShipState || curShipCountry || curShipZip ){
						poString += curGeographicLocationHeader;  // Beginning of ST N4 Segment
						poString += curElementDelimeter+curShipCity;
						poString += curElementDelimeter+curShipState;
						poString += curElementDelimeter+curShipZip;

						if(curShipCountry ){
							poString += curElementDelimeter+curShipCountry;
						}
						else{
							poString += curElementDelimeter;
						}
						poString += curSegmentDelimeter;				// End of ST N4 Segment
					}

					log.emergency('poString after ST N4 Segment is ', poString);

					/*var curBillAttention = headerinfo.values.billattention;
					var curBillAddresse = headerinfo.values.billaddressee;
					var curBillAddress1 = headerinfo.values.billaddress1;
					var curBillAddress2 = headerinfo.values.billaddress2;
					var curBillAddress3 = headerinfo.values.billaddress3;
					var curBillCity = headerinfo.values.billcity;
					var curBillState = headerinfo.values.billstate;
					var curBillCountry = headerinfo.values.billcountry.value;
					var curBillZip = headerinfo.values.billzip;
					var curBillPhone = headerinfo.values.billphone;*/

					var poSubsidiary = headerinfo.values.subsidiary.value;
					var subsidiaryRecObj =record.load({type: 'subsidiary', id: poSubsidiary, isDynamic: true});

					var mainAddressSubRec = subsidiaryRecObj.getSubrecord({ fieldId: 'mainaddress' });
					var curBillAttention = mainAddressSubRec.getValue('attention');
					var curBillAddresse = mainAddressSubRec.getValue('addressee');
					var curBillAddress1 = mainAddressSubRec.getValue('addr1');
					var curBillAddress2 = mainAddressSubRec.getValue('addr2');
					var curBillAddress3 = mainAddressSubRec.getValue('addr3');
					var curBillCity = mainAddressSubRec.getValue('city');
					var curBillState = mainAddressSubRec.getValue('state');
					var curBillCountry = mainAddressSubRec.getValue('country');
					var curBillZip = mainAddressSubRec.getValue('zip');

					log.debug('entityIdentificationCodeQualifier is '+ entityIdentificationCodeQualifier, ' edi_ShipToIdentificationCode is '+ edi_ShipToIdentificationCode);
					poString += curNameHeader+curElementDelimeter+entityBTIdentifierCode+curElementDelimeter+curBillAddresse;  // BT N1 Segment
					if(entityIdentificationCodeQualifier && edi_BillToIdentificationCode){
						poString += curElementDelimeter+entityIdentificationCodeQualifier+curElementDelimeter+edi_BillToIdentificationCode;
					}
					poString += curSegmentDelimeter;

					if(curBillAttention ){
						poString += curAdditionalNameInformationHeader+curElementDelimeter+curBillAttention+curSegmentDelimeter;  // BT N2 Segment
					}

					if(curBillAddress1 ){
						curBillAddress1 = curBillAddress1.replace(new RegExp('\\' + curSegmentDelimeter, 'gi'), '');
						curBillAddress1 = curBillAddress1.replace(new RegExp('\\' + curElementDelimeter, 'gi'), '');
						curBillAddress1 = curBillAddress1.replace(new RegExp('\\' + curSubelementDelimeter, 'gi'), '');
						poString += curAddressInformationHeader+curElementDelimeter+curBillAddress1;  // BT N3 Segment
						if(curBillAddress2 ){
							curBillAddress2 = curBillAddress2.replace(new RegExp('\\' + curSegmentDelimeter, 'gi'), '');
							curBillAddress2 = curBillAddress2.replace(new RegExp('\\' + curElementDelimeter, 'gi'), '');
							curBillAddress2 = curBillAddress2.replace(new RegExp('\\' + curSubelementDelimeter, 'gi'), '');
							var additionalBTAddressInfo = curBillAddress2 ;
							if(curBillAddress3 ){
								curBillAddress3 = curBillAddress3.replace(new RegExp('\\' + curSegmentDelimeter, 'gi'), '');
								curBillAddress3 = curBillAddress3.replace(new RegExp('\\' + curElementDelimeter, 'gi'), '');
								curBillAddress3 = curBillAddress3.replace(new RegExp('\\' + curSubelementDelimeter, 'gi'), '');
								additionalBTAddressInfo += ', '+curBillAddress3;
							}
							poString += curElementDelimeter+additionalBTAddressInfo;
						}
						poString += curSegmentDelimeter;
					}

					if(curBillCity || curBillState || curBillCountry || curBillZip ){
						poString += curGeographicLocationHeader;  // Beginning of BT N4 Segment
						poString += curElementDelimeter+curBillCity;
						poString += curElementDelimeter+curBillState;
						poString += curElementDelimeter+curBillZip;

						if(curBillCountry ){
							poString += curElementDelimeter+curBillCountry;
						}
						else{
							poString += curElementDelimeter;
						}

						poString += curSegmentDelimeter;	// End of BT N4 Segment
					}

					log.debug('poString after BT N4 Segment is ', poString);

					if(curBuyerName){
						poString += curNameHeader+curElementDelimeter+entityBYIdentifierCode+curElementDelimeter+curBuyerName;  // BY N1 Segment
						if(entityIdentificationCodeQualifier && edi_BuyerIdentificationCode){
							poString += curElementDelimeter+entityIdentificationCodeQualifier+curElementDelimeter+edi_BuyerIdentificationCode;
						}
						poString += curSegmentDelimeter;
					}

					log.debug('poString after BY N1 Segment is ', poString);

					// PO1 Segment Information
					var curBaselineItemDataHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header];
					var curItemProductServiceIDQualifier  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Item_Product_Service_ID_Qualifier];

					var curItemProductServiceIDQualifierObj;
					if(!isEmpty(curItemProductServiceIDQualifier)){
						curItemProductServiceIDQualifierObj = JSON.parse(curItemProductServiceIDQualifier);
					}

					var curProductItemDescriptionHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Product_Item_Description_Header];
					var curItemDescriptionType  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Item_Description_Type];

					var itemDetails = datafor850POLines.lineinfo;
					var totalQuantity = 0;
					log.audit('Purchase Order itemDetails  is ', itemDetails);
					for (var itemDetailsLen = 0; itemDetailsLen < itemDetails.length; itemDetailsLen++){
						var curItemLineDetails = itemDetails[itemDetailsLen];
						log.debug('curItemLineDetails is ', curItemLineDetails);
						var curItemLineNumber = curItemLineDetails.values.linesequencenumber;
						var curItemQuantity = curItemLineDetails.values.quantityuom;
						var curItemUoM = curItemLineDetails.values.unit;
						var curItemUPC = curItemLineDetails.values["upccode.item"];
						if(curItemUoM.indexOf('per') != -1){
							var curItemUoMArray = curItemUoM.split(' ');
							var itemUoM = curItemUoMArray[curItemUoMArray.length - 1];
							//log.emergency('itemUoM before is ', itemUoM);
							curItemUoM = itemUoM.toString().charAt(0).toUpperCase() + itemUoM.slice(1);
						}
						//log.emergency('curItemUoM is ', curItemUoM);
						var ediVendorUOM_Mapping = getEDIVendorUnitofMeasure(curItemUoM);
						log.debug('ediVendorUOM_Mapping is ', ediVendorUOM_Mapping);
						var curEDILineUoM = '';
						if(!isEmpty(ediVendorUOM_Mapping)){
							curEDILineUoM = ediVendorUOM_Mapping;
						}
						else{
							curEDILineUoM = curItemUoM;
						}
						var curItemUnitPrice = curItemLineDetails.values.rate;
						var curBuyerPartNum = curItemLineDetails.values['itemid.item'];
						var curVendorNo = curItemLineDetails.values['vendorname.item'];
						log.emergency('curVendorNo is ', curVendorNo);
						var curItemDescription = curItemLineDetails.values.memo;
						if(!isEmpty(curItemDescription)){																						// Limiting the Item Description string to 80 characters
							curItemDescription = curItemDescription.replace(new RegExp('\\' + curSegmentDelimeter, 'gi'), '');
							curItemDescription = curItemDescription.replace(new RegExp('\\' + curElementDelimeter, 'gi'), '');
							curItemDescription = curItemDescription.replace(new RegExp('\\' + curSubelementDelimeter, 'gi'), '');
							if(curItemDescription.length > 80){
								curItemDescription = curItemDescription.substring(0, 79);
							}
						}
						log.debug('curItemLineNumber is ', curItemLineNumber);

						poString += curBaselineItemDataHeader+curElementDelimeter+curItemLineNumber+curElementDelimeter+curItemQuantity+curElementDelimeter;  //  Beginning of PO1 Segment
						poString += curEDILineUoM+curElementDelimeter+curItemUnitPrice+curElementDelimeter+curElementDelimeter;

						if(!isEmpty(curItemProductServiceIDQualifier)){
							if(curBuyerPartNum){
								poString += curItemProductServiceIDQualifierObj.Buyer_Part_No+curElementDelimeter+curBuyerPartNum+curElementDelimeter;
							}
							poString += curItemProductServiceIDQualifierObj.Vendor_No+curElementDelimeter+curVendorNo;
						}
						else{
							if(curBuyerPartNum){
								poString += Item_Product_Service_ID_Qualifier.Buyer_Part_No+curElementDelimeter+curBuyerPartNum+curElementDelimeter;
							}
							poString += Item_Product_Service_ID_Qualifier.Vendor_No+curElementDelimeter+curVendorNo;
						}
						
						if(curItemUPC){
							poString += curElementDelimeter+'UK'+curElementDelimeter+curItemUPC;
						}
						poString += curSegmentDelimeter;																																																		   //  End of PO1 Segment
						log.debug('poString after  '+itemDetailsLen+' PO1 Segment is ', poString);

						poString += curProductItemDescriptionHeader+curElementDelimeter+curItemDescriptionType+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter;	 // Beginning of  PID Segment
						poString += curItemDescription+curSegmentDelimeter;																																										 //  End of PID Segment
						log.debug('poString after  '+itemDetailsLen+' PID Segment is ', poString);

						totalQuantity = parseInt(totalQuantity) + parseInt(curItemQuantity);
					}
					log.debug('totalQuantity is ', totalQuantity);
					var curTransactionTotalsHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Transaction_Totals_Header];
					poString += curTransactionTotalsHeader+curElementDelimeter+itemDetails.length+curElementDelimeter+totalQuantity+curSegmentDelimeter;  // BY CTT Segment
					log.debug('poString after CTT Segment is ', poString);

					log.debug('curCommunicationsContactHeader is '+ curCommunicationsContactHeader+' curContactFunctionCode is '+ curContactFunctionCode+' curNameHeader is '+ curNameHeader, 'curAdditionalNameInformationHeader is '+ curAdditionalNameInformationHeader+' curGeographicLocationHeader is '+ curGeographicLocationHeader+' curBaselineItemDataHeader is '+ curBaselineItemDataHeader+' curProductItemDescriptionHeader is '+ curProductItemDescriptionHeader);

					if(poString){
						return poString;
					}
					else{
						return null;
					}
				}
			}
		} catch(createPOLinesErr){
			log.error('createPOLines error: ', createPOLinesErr.message);
		}
	}	

	function createHeaderLines(edilineinfo, supplierno, countingFiles,interchangeControlNumberOnRecord) {
		try{
			log.debug('Purchase Order EDI line Data for '+supplierno+' is ', edilineinfo);
			log.debug('Purchase Order EDI line Data length  is ', edilineinfo.length);

			//var edi850FileStaticInformation = get850EDIFileData();
			//log.debug('edi850FileStaticInformation ', edi850FileStaticInformation);

			vcpSendEDI850Cache = cache.getCache({
				name: 'vcpSendEDI850Data',
				scope: cache.Scope.PRIVATE
			});
			log.audit('vcpSendEDI850Cache ', vcpSendEDI850Cache);
			edi850FileStaticInformationCacheData = JSON.parse(vcpSendEDI850Cache.get({ key: 'edi850FileStaticInformation', loader: get850EDIFileData }));

			var curEDIFileString = '';
			var curEDIFileName = '';

			if(edi850FileStaticInformationCacheData){
				var curInterchangeControlHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Header];
				var curAuthorizationInformationQualifier  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Authorization_Information_Qualifier];
				var curAuthorizationInformationLength = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Authorization_Information_Length];
				var curSecurityInformationQualifier  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Security_Information_Qualifier];
				var curSecurityInformationLength  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Security_Information_Length];
				var curInterchangeIDQualifier  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_ID_Qualifier];
				var curInterchangeSenderID  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_Sender_ID];
				var curInterchangeReceiverID  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_Receiver_ID];
				var curInterchangeSenderReceiverIDLength  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_Sender_Receiver_ID_Length];
				var curInterchangeControlStandardsIdentifier  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Standards_Identifier];
				var curInterchangeControlVersionNumber  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Version_Number];
				var curInterchangeControlNumber  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Number];
				var curInterchangeControlNumberLength  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Number_Length];
				var curAcknowledgmentRequested  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Acknowledgment_Requested];
				var curUsageIndicator  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Usage_Indicator];
				var curInterchangeControlTrailer  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Interchange_Control_Trailer];

				var curSegmentDelimeter  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Segment_Delimiter];
				var curElementDelimeter  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Element_Delimiter];
				var curSubelementDelimeter  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Subelement_Delimiter];

				var curFunctionalGroupHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Functional_Group_Header];
				var curFunctionalIdentifierCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Functional_Identifier_Code];
				var curApplicationSendersCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Application_Senders_Code];
				var curApplicationReceiversCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Application_Receivers_Code];
				var curGroupControlNumber  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Group_Control_Number];
				var curResponsibleAgencyCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Responsible_Agency_Code];
				var curReleaseIndustryIdentifierCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Version_Release_Industry_Identifier_Code];
				var curFunctionalGroupTrailer  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Functional_Group_Trailer];

				var curTransactionSetHeader  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Header];
				var curTransactionSetIdentifierCode  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Identifier_Code];
				var curTransactionSetControlNumberLength  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Control_Number_Length];
				var curTransactionSetTrailer  = edi850FileStaticInformationCacheData[0].values[EDI_850_File_Information_Field_Details.EDI_File_Transaction_Set_Trailer];

				log.debug('curInterchangeControlHeader is '+ curInterchangeControlHeader+' curInterchangeSenderID is '+ curInterchangeSenderID+' curInterchangeReceiverID is '+ curInterchangeReceiverID, 'curFunctionalGroupHeader is '+ curFunctionalGroupHeader+' curFunctionalIdentifierCode is '+ curFunctionalIdentifierCode+' curTransactionSetHeader is '+ curTransactionSetHeader+' curTransactionSetIdentifierCode is '+ curTransactionSetIdentifierCode);
				var networkVCPSupplierDetails = getNetworkVCPSupplierInfo(supplierno);
				log.debug('networkVCPSupplierDetails ', networkVCPSupplierDetails);

				if(!isEmpty(edilineinfo) && !isEmpty(networkVCPSupplierDetails)){

					var headerSegmentString = '';
					var trailerSegmentString = '';

					var networkVCPSupplierID = networkVCPSupplierDetails[0].getValue({name: Network_VCP_Integration_Supplier_Field_Details.VCP_Supplier_ID});

					var curEDIFileDateTimeString = generateEDIFileDateTime();
					curEDIFileName += networkVCPSupplierID+ '_'+'EDI' + '_' +curTransactionSetIdentifierCode+'_'+curEDIFileDateTimeString;
					log.debug('curEDIFileName ', curEDIFileName);

					var authorizationInformationString = ' ';
					authorizationInformationString = repeatStringNumTimes(authorizationInformationString, curAuthorizationInformationLength);
					var securityInformationString = ' ';
					securityInformationString = repeatStringNumTimes(securityInformationString, curSecurityInformationLength);

					var curInterchangeSenderIDLen = curInterchangeSenderID.length;
					var extraSpacesforInterchangeSenderIDLen =parseInt( parseInt(curInterchangeSenderReceiverIDLength) - parseInt(curInterchangeSenderIDLen) );
					if(extraSpacesforInterchangeSenderIDLen > 0){
						extraSpacesforInterchangeSenderIDString = repeatStringNumTimes(' ', extraSpacesforInterchangeSenderIDLen);
						curInterchangeSenderID = curInterchangeSenderID + extraSpacesforInterchangeSenderIDString;
					}

					var curInterchangeReceiverIDLen = curInterchangeReceiverID.length;
					var extraSpacesforInterchangeReceiverIDLen =parseInt( parseInt(curInterchangeSenderReceiverIDLength) - parseInt(curInterchangeReceiverIDLen) );
					if(extraSpacesforInterchangeSenderIDLen > 0){
						extraSpacesforInterchangeReceiverIDString = repeatStringNumTimes(' ', extraSpacesforInterchangeReceiverIDLen);
						curInterchangeReceiverID = curInterchangeReceiverID + extraSpacesforInterchangeReceiverIDString;
					}

					log.debug('curInterchangeSenderID length is '+ curInterchangeSenderID.length, ' curInterchangeReceiverID length is '+ curInterchangeReceiverID.length);

					var interchangeDate = formatDateTime(new Date(), 'YYMMDD');
					var interchangeTime = formatDateTime(new Date(), 'HHMM');
					var curFunctionalGroupDate = formatDateTime(new Date(), 'CCYYMMDD');
					var curFunctionalGroupTime = interchangeTime;
					log.debug('interchangeDate is '+ interchangeDate+' interchangeTime is '+ interchangeTime, 'curFunctionalGroupDate is '+ curFunctionalGroupDate);

					var curInterchangeControlNumberWithZeros = '';
					var curGroupControlNumberWithZeros = '';
					if(!isEmpty(curInterchangeControlNumber) /*&& curInterchangeControlNumber == curGroupControlNumber*/){

						curInterchangeControlNumber = Number(interchangeControlNumberOnRecord) + Number(countingFiles);
						var interchangeControlNumberLen = curInterchangeControlNumber.toString().length;
						var interchangeControlNumberZerosLen = curInterchangeControlNumberLength - interchangeControlNumberLen;
						//log.emergency('curInterchangeControlNumber is '+ curInterchangeControlNumber+' interchangeControlNumberLen is '+ interchangeControlNumberLen, 'interchangeControlNumberZerosLen is '+ interchangeControlNumberZerosLen);
						if(interchangeControlNumberZerosLen > 0){
							curInterchangeControlNumberWithZeros = pad_with_zeroes(curInterchangeControlNumber, Number(curInterchangeControlNumberLength));
						}
						else{
							curInterchangeControlNumberWithZeros = curInterchangeControlNumber;
						}
						log.debug("createHeaderLines() InterchangeControlNumber info is: ", JSON.stringify({
							curInterchangeControlNumber: curInterchangeControlNumber,
							interchangeControlNumberLen: interchangeControlNumberLen,
							interchangeControlNumberZerosLen: interchangeControlNumberZerosLen,
							curInterchangeControlNumberWithZeros: curInterchangeControlNumberWithZeros,
							curInterchangeControlNumberLength: curInterchangeControlNumberLength,
						}));
						curGroupControlNumberWithZeros = curInterchangeControlNumberWithZeros;
					}
					//log.emergency('curInterchangeControlNumberWithZeros is '+ curInterchangeControlNumberWithZeros, ' curGroupControlNumberWithZeros  is '+ curGroupControlNumberWithZeros);
					if(networkVCPSupplierID){	
						headerSegmentString += curInterchangeControlHeader+curElementDelimeter+curAuthorizationInformationQualifier+curElementDelimeter+authorizationInformationString+curElementDelimeter+curSecurityInformationQualifier+curElementDelimeter+securityInformationString+curElementDelimeter;  // Beginning of ISA Segment
						headerSegmentString += curInterchangeIDQualifier+curElementDelimeter+curInterchangeSenderID+curElementDelimeter+curInterchangeIDQualifier+curElementDelimeter+curInterchangeReceiverID+curElementDelimeter;
						headerSegmentString += interchangeDate+curElementDelimeter+interchangeTime+curElementDelimeter+curInterchangeControlStandardsIdentifier+curElementDelimeter+curInterchangeControlVersionNumber+curElementDelimeter;
						headerSegmentString += curInterchangeControlNumberWithZeros+curElementDelimeter+curAcknowledgmentRequested+curElementDelimeter+curUsageIndicator+curElementDelimeter+curSubelementDelimeter+curSegmentDelimeter;    // End of ISA Segment

						headerSegmentString += curFunctionalGroupHeader+curElementDelimeter+curFunctionalIdentifierCode+curElementDelimeter+curApplicationSendersCode+curElementDelimeter+networkVCPSupplierID+curElementDelimeter+curFunctionalGroupDate+curElementDelimeter;  // Beginning of GS Segment
						headerSegmentString += curFunctionalGroupTime+curElementDelimeter+curGroupControlNumberWithZeros+curElementDelimeter+curResponsibleAgencyCode+curElementDelimeter+curReleaseIndustryIdentifierCode+curSegmentDelimeter;   // End of GS Segment

						curEDIFileString += headerSegmentString;
						log.debug('curEDIFileString after headerSegmentString is ', curEDIFileString);
						for (var edilineinfoIndex = 0; edilineinfoIndex < edilineinfo.length; edilineinfoIndex++) {
							var curEdilineinfo = edilineinfo[edilineinfoIndex];
							log.debug('curEdilineinfo ', curEdilineinfo);

							var curTransactionSetNum = pad_with_zeroes(edilineinfoIndex+1, Number(curTransactionSetControlNumberLength));
							var tranHeaderSegmentString = curTransactionSetHeader+curElementDelimeter+curTransactionSetIdentifierCode+curElementDelimeter+curTransactionSetNum+curSegmentDelimeter;   // ST Segment
							curEDIFileString += tranHeaderSegmentString;
							log.debug('curEDIFileString after tranHeaderSegmentString is ', curEDIFileString);

							curEDIFileString += curEdilineinfo;

							var totalChildSegments = curEdilineinfo.toString().split(curSegmentDelimeter).length-1;
							totalChildSegments = totalChildSegments + 2;

							var tranTrailerSegmentString = curTransactionSetTrailer+curElementDelimeter+totalChildSegments+curElementDelimeter+curTransactionSetNum+curSegmentDelimeter;   // SE Segment
							curEDIFileString += tranTrailerSegmentString;
							log.debug('curEDIFileString after tranTrailerSegmentString is ', curEDIFileString);
						}

						var totalFunctionalGroupSegments = 1;
						trailerSegmentString += curFunctionalGroupTrailer+curElementDelimeter+edilineinfo.length+curElementDelimeter+curGroupControlNumberWithZeros+curSegmentDelimeter;   // GE Segment
						trailerSegmentString += curInterchangeControlTrailer+curElementDelimeter+totalFunctionalGroupSegments+curElementDelimeter+curInterchangeControlNumberWithZeros+curSegmentDelimeter;   // IEA Segment

						curEDIFileString += trailerSegmentString;
						log.debug('curEDIFileString after trailerSegmentString is ', trailerSegmentString);
					}
				}
			}

			if(curEDIFileName && curEDIFileString){
				var curEDIFileDetails = {'edifilename': curEDIFileName, 'edifilecontents': curEDIFileString};
				return curEDIFileDetails;
			}
			else{
				return null;
			}

		} catch(createHeaderLinesErr){
			log.error('createHeaderLines error: ', createHeaderLinesErr.message);
		}
	}	

	function getInputData() {
		try{
			// log.debug("reseet cache", 'Start');
			// var removevcpSendEDI850Cache = cache.getCache({
			// 	name: 'vcpSendEDI850Data',
			// 	scope: cache.Scope.PRIVATE
			// });
			// removevcpSendEDI850Cache.remove({
			// 	key: 'edi850FileStaticInformation'
			// });
			// log.debug("reseet cache", 'End');
			// return [];



			log.audit('****** ACME MR Send Network VCP 850 Script Begin ******', '******ACME MR Send Network VCP 850 Script Begin ******');

			var network_VCP_PO850_Search_ID =  runtime.getCurrentScript().getParameter({name: Network_VCP_PO850_SearchId_ScriptField});
			log.debug('Network VCP  Purchase Order 850 Search ID is ', network_VCP_PO850_Search_ID);

			if(network_VCP_PO850_Search_ID){
				var networkVCPPO850Search = search.load({
					id: network_VCP_PO850_Search_ID
				});

				/*mySearch.run().each(function(result) {
					log.audit('result ', result);

					return true;
				});

				var networkVCPPO850SearchResult = returnSearchResults(network_VCP_PO850_Search_ID);
				log.debug('networkVCPPO850SearchResult ', networkVCPPO850SearchResult);*/


				if(networkVCPPO850Search){
					//var edi850FileStaticInformation = get850EDIFileData();
					//log.debug('edi850FileStaticInformation ', edi850FileStaticInformation);

					const vcpSendEDI850Cache = cache.getCache({
						name: 'vcpSendEDI850Data',
						scope: cache.Scope.PRIVATE
					});
					log.audit('vcpSendEDI850Cache ', vcpSendEDI850Cache);
					const edi850FileStaticInformationCacheData = vcpSendEDI850Cache.get({
						key: 'edi850FileStaticInformation', 
						loader: get850EDIFileData
					});
					log.audit('edi850FileStaticInformationCacheData ', edi850FileStaticInformationCacheData);
					return networkVCPPO850Search;
				}
				else{
					log.audit('No search data');
					return null;
				}
			}
			else{
				log.audit('No search ID found');
				return null;
			}

		} catch(getInputDataErr){
			log.error('getInputData error: ', getInputDataErr.message);
		}
	}

	function map(context) {
		log.debug('Map: context.value is ', context.value);
		if(context.value != '' && context.value != null && context.value != undefined){
			try{
				var searchResult = JSON.parse(context.value);

				if(searchResult){
					var curPOId   = searchResult.id;
					log.debug('curPOId is ', curPOId);
					/*
					//var valueObj = {'internalid': curPOId, 'updatedItemid': updatedItemID, 'updatedItempurchaseprice': updatedItemPurchasePrice, 'tranno': curPONumber, 'item': lineItem, 'lineno': lineNumber, 'linerate': lineRate, 'amount': lineAmount};
					var valueObj = {'internalid': curPOId, 'updatedItempurchaseprice': updatedItemPurchasePrice, 'tranno': curPONumber, 'item': lineItem, 'lineno': lineNumber, 'linerate': lineRate, 'amount': lineAmount};*/
					context.write({
						key: curPOId,
						value: searchResult
					});
				}
			} catch(maperr){
				log.error('map stage error: ', maperr.message);
			}	
		}	
	}

	function reduce(context) {
		log.debug('Context values length is '+context.values.length, 'Context values is '+JSON.parse(context.values[0]));
		var poRecId = context.key;
		log.audit('poRecId is ', poRecId);

		var poEDILines = '';
		var poData = {};
		var poItemArray = new Array();
		var poSupplier = '';
		if (context.values.length > 0 && poRecId){
			try{
				for (var i = 0; i < context.values.length; i++) { 
					log.debug('Context value in Reduce Stage is ', JSON.parse(context.values[i]));

					var poSearchResult = JSON.parse(context.values[i]);

					var curPONumber  = poSearchResult['values'].tranid;
					var curPOEntityData  = poSearchResult['values'].entity;
					var curPOCreatedFrom  = poSearchResult['values'].createdfrom;
					var curPOLineItemData  = poSearchResult['values'].item;
					log.debug('map() curPOEntityData, curPOCreatedFrom, curPOLineItemData are ', curPOEntityData+', '+curPOCreatedFrom+', '+curPOCreatedFrom);
					//log.debug('curPOEntityData length is ', Object.keys(curPOEntityData).length);
					//log.debug('curPOLineItemData length is ', Object.keys(curPOLineItemData).length);
					//if(Object.keys(curPOEntityData).length > 0 && Object.keys(curPOLineItemData).length === 0){
					if(curPOEntityData && !curPOLineItemData){
						var curPOSupplier  = curPOEntityData.value;
						log.audit('curPOSupplier is ', curPOSupplier);
						if(curPOSupplier != '' && curPOSupplier != null && curPOSupplier != undefined){
							poSupplier = curPOSupplier;
							poData['header'] = poSearchResult;
						}
					}
					//else if(Object.keys(curPOLineItemData).length > 0 && Object.keys(curPOEntityData).length === 0){
					else if(curPOLineItemData && ((!curPOEntityData && !curPOCreatedFrom)  || (curPOEntityData && curPOCreatedFrom))){
						var lineItem  = curPOLineItemData.value;
						log.audit('lineItem is ', lineItem);
						if(lineItem != '' && lineItem != null && lineItem != undefined){
							poItemArray.push(poSearchResult);
						}
					}

				}	
				poData['lineinfo'] = poItemArray;
				log.debug('poData is ', poData);
				log.debug('poItemArray is ', poItemArray);
				if(curPOEntityData){
					var curPOEDILine = createPOLines(poData);
					log.debug('curPOEDILine is ', curPOEDILine);
				}

				context.write({
					key: poSupplier,
					value: {'poid': poRecId, 'ediline': curPOEDILine}
				});
			} catch(reduceErr){
				log.error('Reduce stage error for PO ID '+poRecId+' is: ', reduceErr.message);
			}
		}
	}

	function summarize(summary) {
		handleErrorIfAny(summary);
		try{
			var supplierIds = new Array();
			var processPOIds = new Array();
			var supplierEDIData = {};
			summary.output.iterator().each(function(key, value) {
				log.debug('key is '+key, 'value is '+value);
				var supplierIndex  = supplierIds.indexOf(key);
				var ediData = JSON.parse(value);
				processPOIds.push(ediData['poid']);
				//log.debug('supplierIndex is ', supplierIndex);
				if(supplierIndex == -1){
					supplierIds.push(key);
					var curSupplierEDIDetailsArray = new Array();
					curSupplierEDIDetailsArray.push(ediData['ediline']);
					supplierEDIData[key] = curSupplierEDIDetailsArray;
				}
				else{
					var curSupplierEDIDetails = supplierEDIData[supplierIds[supplierIndex]];

					curSupplierEDIDetails.push(ediData['ediline']);
					supplierEDIData[supplierIds[supplierIndex]] = curSupplierEDIDetails;
					log.debug('curSupplierEDIDetails is ', curSupplierEDIDetails);
				}
				//updatedSOIds[updatedSOIds.length] = value;
				return true;
			}); 
			log.debug('supplierEDIData is ', supplierEDIData);
			var countingFiles = 1;
			var ediFileObjArray = new Array();
			var interchangeControlNumberOnRecord = search.lookupFields({
				type: 'customrecord_acc_edi_file_setup',
				id: 3,
				columns: 'custrecord_edi_interchange_control_num'
			}).custrecord_edi_interchange_control_num;
			for (var key in supplierEDIData) {
				if (supplierEDIData.hasOwnProperty(key)) {
					log.debug('Summarize: ', key + ' -> ' +supplierEDIData[key]);

					var curSupplierEDIFileDetails = createHeaderLines(supplierEDIData[key], key, countingFiles,interchangeControlNumberOnRecord);
					log.debug('Summarize: curSupplierEDIFileDetails is ', curSupplierEDIFileDetails);
					countingFiles++;

					if(curSupplierEDIFileDetails){
						var curSupplierEDIFileName = curSupplierEDIFileDetails.edifilename;
						var curSupplierEDIFileContent = curSupplierEDIFileDetails.edifilecontents;
						log.debug('Summarize: curSupplierEDIFileName is ', curSupplierEDIFileName);
						log.debug('Summarize: curSupplierEDIFileContent is ', curSupplierEDIFileContent);

						curSupplierEDIFileObj = file.create({
							name: curSupplierEDIFileName+'.edi',
							fileType: file.Type.PLAINTEXT,
							contents: curSupplierEDIFileContent
						});
						ediFileObjArray[ediFileObjArray.length] = curSupplierEDIFileObj; 
						// Daily edi file create function
						//curSupplierEDIFileObj.folder = 1525;

						//var edifileid = curSupplierEDIFileObj.save();
						//log.debug('edifileid is ', edifileid);
					}
				}
			}
			
			log.debug('summarize() interchangeControlNumberOnRecord is: ', interchangeControlNumberOnRecord);

			record.submitFields({
				type: 'customrecord_acc_edi_file_setup',
				id: 3,
				values: {
					custrecord_edi_interchange_control_num: Number(interchangeControlNumberOnRecord) + Number(countingFiles)
				}
			});
			

			log.debug('Summarize: ediFileObjArray is ', ediFileObjArray);
			if(ediFileObjArray.length > 0){
				var uploadStatusFlag = sftpConnectionUpload(ediFileObjArray);
				log.debug('Summarize: uploadStatusFlag is ', uploadStatusFlag);
				if(uploadStatusFlag && processPOIds.length > 0){
					processPOIds.forEach(updatePO_EDIStatus);
				}
			}

			log.audit('******ACME MR Send Network VCP 850 Script End ******', '******ACME MR Send Network VCP 850 Script End ******');
		} catch(summarizeErr){
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