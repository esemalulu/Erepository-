/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : Map/ Reduce Script
 * Script Name      : ACME MR Process Network VCP 855 PO
 * Version              : 2.0
 * Description        : This script will pick up the 855 EDI file from the Network VCP SFTP server to update the data in related Purchase Orders in NetSuite.
 */

define(['N/search', 'N/record', 'N/runtime', 'N/error', 'N/format', 'N/email', 'N/file','N/sftp','N/encode'],

		function(search, record, runtime, error, format, email, file,sftp,encode) {

	var SFTPPort = 22;

	var Network_VCP_SFTPInteg_Username_ScriptField = 'custscript_networkvcp_sftp_855_username';
	var Network_VCP_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_networkvcp_sftp_855_pwd_guid';
	var Network_VCP_SFTPInteg_URL_ScriptField = 'custscript_networkvcp_sftp_855_sftp_url';
	var Network_VCP_SFTPInteg_Hostkey_ScriptField = 'custscript_networkvcp_sftp_855_host_key';
	var Network_VCP_SFTPInteg_SFTPDir_ScriptField = 'custscript_networkvcp_sftp_855_sftp_dir';

	var EDI_FileType = '855';
	var IntegrationName = 'Network_VCP';
	var EDI_File_Information_CustomRecord_ID = 'customrecord_acc_edi_file_setup';
	var Daily_EDI_File_Details_CustomRecord_ID = 'customrecord_daily_edi_file_details';

	var EDI_855_File_Information_Field_Details = {
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
			'EDI_File_Contact_Function_Code': 'custrecord_edi_adm_contact_function_code',
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
	
	var Acknowledgement_Type_Code = {
			'Acknowledge_With_Detail_No_Change': 'AD', 
			'Acknowledge_With_Detail_And_Change': 'AC',
			'Accepted': 'AT',
			'Rejected_With_Detail': 'RD'
	};

	var EDI_Status_Field_Details = {
			'855 - Acknowledgement Accepted with Change': 9,
			'855 - Acknowledgement Accepted': 4,
			'855 - Acknowledgement Rejected': 5
	};

	var Entity_Identifier_Code = {
			'Bill_to_Party': 'BT',
			'Buying_Party': 'BY',
			'Ship_To': 'ST'
	};

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

	/**
	 * Validate if the current parameter value is not empty
	 */
	function isEmpty(curValue) {
		if (curValue == '' || curValue == null || curValue == undefined) {
			return true;
		} 
		else{
			log.debug('curValue is ', curValue);
			if (curValue instanceof String) {
				log.debug('curValue inside string if is ', curValue);
				if (curValue == '') {
					return true;
				}
			} 
			else if (curValue instanceof Array) {
				log.debug('curValue inside Array if is ', curValue);
				if (curValue.length == 0) {
					return true;
				}
			}
			return false;
		}
	}

	function sftpConnectionDownload() {
		try{
			var network_VCP_UserName =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_Username_ScriptField});
			var network_VCP_PwdGUID =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_Pwd_GUID_ScriptField});
			var network_VCP_SFTPurl =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_URL_ScriptField});
			var network_VCP_Hostkey =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_Hostkey_ScriptField});
			log.debug('Network_VCP Host Key is ', network_VCP_Hostkey);
			var network_VCP_SFTPDirectory =  runtime.getCurrentScript().getParameter({name: Network_VCP_SFTPInteg_SFTPDir_ScriptField});
			log.debug('Network_VCP: User Name is  '+network_VCP_UserName+' | Password GUID is  '+network_VCP_PwdGUID,' | SFTP Url is '+network_VCP_SFTPurl+' | SFTP Directory is '+network_VCP_SFTPDirectory);

			var network_VCP_SFTPconnection = sftp.createConnection({
				username: network_VCP_UserName,
				passwordGuid: network_VCP_PwdGUID,
				url: network_VCP_SFTPurl,
				hostKey: network_VCP_Hostkey,
				port : SFTPPort,
				directory: network_VCP_SFTPDirectory
			});

			log.debug('Network_VCP SFTP connection : ', network_VCP_SFTPconnection);
			var ediFilesArray = new Array();
			if(network_VCP_SFTPconnection){
				var network_VCP_SFTP_DirectoryList = network_VCP_SFTPconnection.list();
				log.debug('connection : network_VCP_SFTP_DirectoryList ', network_VCP_SFTP_DirectoryList);

				if(network_VCP_SFTP_DirectoryList.length > 0){
					for(var directoryListIndex = 0; directoryListIndex < network_VCP_SFTP_DirectoryList.length; directoryListIndex++){
						var curFileObj = network_VCP_SFTP_DirectoryList[directoryListIndex];
						var curFileName = JSON.stringify(curFileObj.name);
						var ediFileExtention = '.edi'; 
						//var ediBeginningString = 'edi855';

						if((curFileName.indexOf(ediFileExtention) != -1 || curFileName.indexOf(ediFileExtention.toUpperCase()) != -1) /*&& (curFileName.startsWith(ediBeginningString) || curFileName.startsWith(ediBeginningString.toUpperCase()))*/ ){
							//log.debug('curFileName  is: ',curFileName);
							try{
								ediFilesArray[ediFilesArray.length] = network_VCP_SFTPconnection.download({
									//directory: network_VCP_SFTPDirectory,
									filename: curFileObj.name
								});
							}catch(sftpFileDownloadErr){
								log.error('Error Occurred In ACME MR Process Network VCP 855 Script: sftp File Download  is ', sftpFileDownloadErr);
								//restockit_DailyRepUpload_sendAckEmail('Call Your Mother', 'Unsuccessful', sftpConnectionUploadErr.message);
							}
						}
					}
					log.debug('ediFilesArray : ', ediFilesArray)
				}//connection
			}

			if(ediFilesArray.length > 0){
				return ediFilesArray;
			}
			else{
				return null;
				//network_VCP_DailyRepUpload_sendAckEmail('Call Your Mother', 'Unsuccessful', 'SFTP Directory not found in the script parameter');
			}
		}catch(sftpConnectionDownloadErr){
			log.error('Error Occurred In ACME MR Process Network VCP 855 Script: sftpConnectionDownload Function is ', sftpConnectionDownloadErr);
			//network_VCP_DailyRepUpload_sendAckEmail('Call Your Mother', 'Unsuccessful', sftpConnectionUploadErr.message);
		}
	}

	function get855EDIFileData() {
		try{
			var edi_855_File_InformationFilters = [
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

			var edi_855_File_InformationColumns = [
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Information_Name}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_Vendor}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_Customer}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Type}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Segment_Delimiter}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Element_Delimiter}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Subelement_Delimiter}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Authorization_Information_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Authorization_Information_Length}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Security_Information_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Security_Information_Length}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_ID_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Sender_ID}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Receiver_ID}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Sender_Receiver_ID_Length}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Standards_Identifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Version_Number}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Number}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Acknowledgment_Requested}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Usage_Indicator}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Functional_Group_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Functional_Identifier_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Application_Senders_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Application_Receivers_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Group_Control_Number}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Responsible_Agency_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Version_Release_Industry_Identifier_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Identifier_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Control_Number_Length}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Beginning_Segment_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Purpose_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Type_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Reference_Identification_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Reference_Identification_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Contact_Function_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Name_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Entity_Identifier_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Additional_Name_Information_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Address_Information_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Geographic_Location_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Product_Item_Description_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Item_Description_Type}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Totals_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Trailer}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Functional_Group_Trailer}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Trailer})
				];

			var edi_855_File_InformationSearchResult = returnSearchResults('', EDI_File_Information_CustomRecord_ID, edi_855_File_InformationFilters, edi_855_File_InformationColumns);
			log.debug('EDI 855 File_Information Search Result is ', edi_855_File_InformationSearchResult);

			if(edi_855_File_InformationSearchResult){
				if(edi_855_File_InformationSearchResult.length > 0){
					return edi_855_File_InformationSearchResult;
				}
				else{
					return null;
				}
			}
			else{
				return null;
			}
		} catch(get855EDIFileDataErr){
			log.error('get855EDIFileData error: ', get855EDIFileDataErr.message);
		}
	}

	function getAllLines(arr, startval, endval) {
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
						allSOLines.push(curSOLineArray);
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

	function read855(get855data) {
		try{
			log.debug('get855data : ', get855data);
			var po1Array = new Array();
			var pidArray = new Array();
			var totalPOLines = 0;
			var ediLineDataArray = JSON.parse(get855data);
			log.debug('ediLineDataArray : ', ediLineDataArray);

			var edi855FileStaticInformation = get855EDIFileData();
			log.debug('edi855FileStaticInformation ', edi855FileStaticInformation);
			//log.debug('Line segment id is ', EDI_855_File_Information_Field_Details.EDI_File_Segment_Delimiter);

			if(edi855FileStaticInformation){
				var curSegmentDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Segment_Delimiter});
				var curElementDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Element_Delimiter});
				var curSubelementDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Subelement_Delimiter});

				var curBeginningSegmentHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Beginning_Segment_Header});
				var curTransactionTypeCode  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Type_Code});
				var curReferenceIdentificationHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Reference_Identification_Header});

				var curCommunicationsContactHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Header});
				var curContactFunctionCode  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Contact_Function_Code});
				var curCommunicationNumberQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier});
				var curCommunicationNumberQualifier2  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier2});

				// DTM Segment
				var curDateTimeHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Date_Time_Header});
				var curRequestedDeliveryDateQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Requested_Delivery_Date_Qualifier});
				var curOrderEntryDateQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Order_Entry_Date_Qualifier});
				var curDateTimeQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Date_Time_Qualifier});

				// MSG Header
				var curMessageTextHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Message_Text_Header});

				// N Segment
				var curNameHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Name_Header});
				var curName_IdentificationCodeQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Identification_Code_Qualifier});
				var curAdditionalNameInformationHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Additional_Name_Information_Header});
				var curAddressInformationHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Address_Information_Header});
				var curGeographicLocationHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Geographic_Location_Header});

				var curBaselineItemDataHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header});
				var curProductItemDescriptionHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Product_Item_Description_Header});
				var curTransactionTotalsHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Totals_Header});

				if(curSegmentDelimeter && curElementDelimeter){
					var irvalues = {};
					for(var sodataLen = 0; sodataLen < ediLineDataArray.length; sodataLen++){
						irvalues['transetpurposecode'] = '';
						irvalues['trantypecode'] = '';
						irvalues['pono'] = '';
						irvalues['podate'] = '';
						irvalues['requesteddeliverydate'] = '';
						irvalues['orderentrydate'] = '';
						irvalues['buyermessage'] = '';
						irvalues['buyercontactname'] = '';
						irvalues['buyercontactphone'] = '';
						irvalues['buyercontactemail'] = '';
						irvalues['shiptoname'] = '';
						irvalues['customernetworknumber'] = '';
						irvalues['shiptoaddr1'] = '';
						irvalues['shiptoaddr2'] = '';
						irvalues['shiptocity'] = '';
						irvalues['shiptostate'] = '';
						irvalues['shiptozip'] = '';
						irvalues['shipcountry'] = '';

						var curLine = ediLineDataArray[sodataLen];
						var curLineElements = curLine.trim().split(curElementDelimeter);
						log.debug('curLine  : ', curLine);
						log.debug('curLineElements  : ', curLineElements);

						var curLineHeader = curLineElements[0];
						//log.debug('curLineHeader is '+ curLineHeader, ' curLineElements is '+ curLineElements);
						if(curLineHeader == curBeginningSegmentHeader){
							irvalues['transetpurposecode'] = curLineElements[1];
							irvalues['trantypecode'] = curLineElements[2];
							irvalues['pono'] = curLineElements[3];
							var poDate = curLineElements[5];

							if(poDate){
								var poDateObj = new Date(parseInt(poDate.substr(0,4), 10), parseInt(poDate.substr(4,2), 10) - 1, parseInt(poDate.substr(6,2), 10));
								var poDateString = format.format({
									value: poDateObj,
									type: format.Type.DATE
								});
								irvalues['podate'] = poDateString;
								log.debug('poDateObj is '+ poDateObj, ' poDateString is '+ poDateString);
							}
						}

						else if(curLineHeader == curReferenceIdentificationHeader){
							if(curLineElements[1] == 'PO'){
								irvalues['pono'] = curLineElements[2];
							}
						}

						else if(curLineHeader == curDateTimeHeader){
							if(curLineElements[1] == curRequestedDeliveryDateQualifier){
								var requestedDeliveryDate = curLineElements[2];

								if(requestedDeliveryDate){
									var requestedDeliveryDateObj = new Date(parseInt(requestedDeliveryDate.substr(0,4), 10), parseInt(requestedDeliveryDate.substr(4,2), 10) - 1, parseInt(requestedDeliveryDate.substr(6,2), 10));
									var requestedDeliveryDateString = format.format({
										value: requestedDeliveryDateObj,
										type: format.Type.DATE
									});

									irvalues['requesteddeliverydate'] = requestedDeliveryDateString;
									log.debug('requestedDeliveryDateObj is '+ requestedDeliveryDateObj, ' requestedDeliveryDateString is '+ requestedDeliveryDateString);
								}
							}

							else if(curLineElements[1] == curOrderEntryDateQualifier){
								var orderEntryDate = curLineElements[2];
								var orderEntryTime = curLineElements[3];

								if(orderEntryDate){
									var orderEntryDateObj = new Date(parseInt(orderEntryDate.substr(0,4), 10), parseInt(orderEntryDate.substr(4,2), 10) - 1, parseInt(orderEntryDate.substr(6,2), 10));
									var orderEntryDateString = format.format({
										value: orderEntryDateObj,
										type: format.Type.DATE
									});

									irvalues['orderentrydate'] = orderEntryDateString;
									log.debug('orderEntryDateObj is '+ orderEntryDateObj, ' orderEntryDateString is '+ orderEntryDateString);
								}
							}
						}

						else if(curLineHeader == curMessageTextHeader){
							irvalues['buyermessage'] = curLineElements[1];
						}

						else if(curLineHeader == curNameHeader){
							log.debug('Ship_To is  : ', Entity_Identifier_Code.Ship_To);
							if(curLineElements[1] == 'ST'){
								irvalues['shiptoname'] = curLineElements[2];
								if(curLineElements.length == 5){
									if(curLineElements[3] == curName_IdentificationCodeQualifier){
										irvalues['customernetworknumber'] = curLineElements[4];
									}
								}

								var stTotalLines = 3;
								for(var stTotalLinesLen = 0; stTotalLinesLen < stTotalLines; stTotalLinesLen++){
									var stInfoIndex = sodataLen + 1; 
									var stNextSegmentLine = ediLineDataArray[stInfoIndex];
									var stNextSegmentLineElements = stNextSegmentLine.trim().split(curElementDelimeter);
									log.debug('stNextSegmentLine  : ', stNextSegmentLine);
									log.debug('stNextSegmentLineElements  : ', stNextSegmentLineElements);

									var stNextSegmentLineHeader = stNextSegmentLineElements[0];
									log.debug('stNextSegmentLineHeader  : ', stNextSegmentLineHeader);
									if(stNextSegmentLineHeader == curAdditionalNameInformationHeader){
										irvalues['shiptoaddr1'] = stNextSegmentLineElements[1];
										/*if(stNextSegmentLineElements.length > 2){
											irvalues['shiptoaddr2'] = stNextSegmentLineElements[2];
										}*/
										sodataLen++;
									}

									else if(stNextSegmentLineHeader == curAddressInformationHeader){
										irvalues['shiptoaddr2'] = stNextSegmentLineElements[1];
										/*if(stNextSegmentLineElements.length > 2){
											irvalues['shiptoaddr2'] = stNextSegmentLineElements[2];
										}*/
										sodataLen++;
									}

									else if(stNextSegmentLineHeader == curGeographicLocationHeader){
										irvalues['shiptocity'] = stNextSegmentLineElements[1];
										irvalues['shiptostate'] = stNextSegmentLineElements[2];
										irvalues['shiptozip'] = stNextSegmentLineElements[3];

										if(stNextSegmentLineElements.length == 5){
											irvalues['shipcountry'] = curLineElements[4];
										}
										sodataLen++;
									}
								}
								log.debug('sodataLen is  : ', sodataLen);
							}

							/*else if(curLineElements[1] == 'BT'){
								var billtoName = curLineElements[2];

								var btTotalLines = 3;
								for(var btTotalLinesLen = 0; btTotalLinesLen < btTotalLines; btTotalLinesLen++){
									var btInfoIndex = sodataLen + 1; 
									var btNextSegmentLine = ediLineDataArray[btInfoIndex];
									var btNextSegmentLineElements = btNextSegmentLine.trim().split(curElementDelimeter);
									log.debug('curLine  : ', btNextSegmentLine);
									log.debug('curLineElements  : ', btNextSegmentLineElements);

									var btNextSegmentLineHeader = btNextSegmentLineElements[0];
									log.debug('btNextSegmentLineHeader  : ', btNextSegmentLineHeader);
									if(btNextSegmentLineHeader == curAdditionalNameInformationHeader){
										var billtoAddress1 = curLineElements[1];
										var billtoAddress2 = '';
										if(curLineElements.length > 2){
											billtoAddress2 = curLineElements[2];
										}
										sodataLen++;
									}

									else if(btNextSegmentLineHeader == curAddressInformationHeader){
										var billtoAddress1 = curLineElements[1];
										var billtoAddress2 = '';
										if(curLineElements.length > 2){
											billtoAddress2 = curLineElements[2];
										}
										sodataLen++;
									}

									else if(btNextSegmentLineHeader == curGeographicLocationHeader){
										var billtoCity = curLineElements[1];
										var billtoStateCode = curLineElements[2];
										var billtoZip = curLineElements[3];
										sodataLen++;
									}
								}
								log.debug('sodataLen is  : ', sodataLen);

								if(curLineHeader == curAddressInformationHeader){
									var shiptoAddress1 = curLineElements[1];
									var shiptoAddress2 = '';
									if(curLineElements.length > 2){
										shiptoAddress2 = curLineElements[2];
									}
								}

								if(curLineHeader == curGeographicLocationHeader){
									var shiptoCity = curLineElements[1];
									var shiptoStateCode = curLineElements[2];
									var shiptoZip = curLineElements[3];
									var shiptoCountryCode = curLineElements[4];
								}
							}*/
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
							if(curLineElements[1] == curContactFunctionCode){
								irvalues['buyercontactname'] = curLineElements[2];
							}
							if(curLineElements.length == 5){
								if(curLineElements[3] == curCommunicationNumberQualifier){
									irvalues['buyercontactphone'] = curLineElements[4];
								}
							}
							else if(curLineElements.length == 7){
								if(curLineElements[3] == curCommunicationNumberQualifier){
									irvalues['buyercontactphone'] = curLineElements[4];
								}

								if(curLineElements[5] == curCommunicationNumberQualifier2){
									irvalues['buyercontactemail'] = curLineElements[6];
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
				irvalues['solines'] = curLineElements[4];
				irvalues['solinedetails'] = curLineElements[4];
				log.debug('irvalues  : ', irvalues);
				return irvalues;
			}
			else{
				return null;
			}
		}catch(read855Err){
			log.error('read855 error: ', read855Err.message);
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
					operator: 'equalto',
					values: customernetworknumberVal
				})];
			var customerNoSearchColumns = [
				search.createColumn({
					name: 'internalid'
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
			log.debug('customerNoSearchResult : ', customerNoSearchResult);

			if(customerNoSearchResult){
				if(customerNoSearchResult.length > 0 ){
					var customerID  = customerNoSearchResult[0].getValue({name: 'internalid'});
					var currentAddressInternalID  = customerNoSearchResult[0].getValue({name: 'addressinternalid', join: 'Address'});

					if(curItemInternalID){
						return curItemInternalID;
					}
					else{
						return null;
					}
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

	function getItemID(itemsapnumber){
		try{
			log.debug('itemsapnumber : ', itemsapnumber);
			if(itemsapnumber != '' && itemsapnumber != null && itemsapnumber != undefined){
				var itemIDSearchType = 'item';

				var itemIDSearchFilters = [
					search.createFilter({
						name: 'custitem_acc_sap_code',
						join: null,
						operator: 'is',
						values: itemsapnumber
					})];

				var itemIDSearchColumns = [
					search.createColumn({
						name: 'internalid'
					}),
					search.createColumn({
						name: 'custitem_acc_sap_code'
					}),
					search.createColumn({
						name: 'itemid'
					})];

				var itemIDSearchResult = returnSearchResults('', itemIDSearchType, itemIDSearchFilters, itemIDSearchColumns);
				log.debug('itemIDSearchResult : ', itemIDSearchResult);

				if(itemIDSearchResult){
					if(itemIDSearchResult.length > 0 ){
						var curItemInternalID  = itemIDSearchResult[0].getValue({name: 'internalid'});
						var curItem_NetworkSAPCode  = itemIDSearchResult[0].getValue({name: 'custitem_acc_sap_code'});
						var curItemNo  = itemIDSearchResult[0].getValue({name: 'itemid'});

						log.debug('curItemInternalID is '+ curItemInternalID, 'curItem_NetworkSAPCode is '+ curItem_NetworkSAPCode+' curItemNo is '+ curItemNo);

						if(curItemInternalID){
							return curItemInternalID;
						}
						else{
							return null;
						}
					}
					else{
						return null;
					}
				}
				else{
					return null;
				}
			}
			else{
				return null;
			}
		}catch(getItemIDErr){
			log.error('getItemID error: ', getItemIDErr.message);
		}
	}	

	function createItemReceiptFrom855(irdata) {
		try{
			var currentSONumber = irdata['sonum'];
			var currentSOOrderDate = irdata['soorderdate'];
			var currentPoNum = irdata['pono'];
			var currentRequestedDeliveryDate = irdata['requesteddeliverydate'];
			var currentOrderEntryDate = irdata['orderentrydate'];
			var currentCustNetworkAccountNum = irdata['customernetworknumber'];
			var currentShiptoName = irdata['shiptoname'];
			var currentShiptoAddr1 = irdata['shiptoaddr1'];
			var currentShiptoAddr2 = irdata['shiptoaddr2'];
			var currentShiptoCity = irdata['shiptocity'];
			var currentShiptoState = irdata['shiptostate'];
			var currentShiptoZip = irdata['shiptozip'];
			var currentShiptoCountry = irdata['shipcountry'];
			var currentBuyerContactName = irdata['buyercontactname'];
			var currentBuyerContactPhone = irdata['buyercontactphone'];
			var currentBuyerContactEmail= irdata['buyercontactemail'];
			var currentBuyerMessage = irdata['buyermessage'];
			var currentSOLines = irdata['solines'];
			var currentSOLineDescription = irdata['solinedetails'];

			log.debug('currentSONumber is '+ currentSONumber+' currentSOOrderDate is '+ currentSOOrderDate+' currentPoNum is '+ currentPoNum, ' currentRequestedDeliveryDate is '+ currentRequestedDeliveryDate+' currentOrderEntryDate is '+ currentOrderEntryDate+' currentCustNetworkAccountNum is '+ currentCustNetworkAccountNum);
			log.debug('currentShiptoName is '+ currentShiptoName+' currentShiptoAddr1 is '+ currentShiptoAddr1+' currentShiptoAddr2 is '+ currentShiptoAddr2, ' currentShiptoCity is '+ currentShiptoCity+' currentShiptoState is '+ currentShiptoState+' currentShiptoZip is '+ currentShiptoZip);
			log.debug('currentShiptoCountry is '+ currentShiptoCountry+' currentBuyerContactName is '+ currentBuyerContactName+' currentBuyerContactPhone is '+ currentBuyerContactPhone, ' currentBuyerContactEmail is '+ currentBuyerContactEmail+' currentBuyerMessage is '+ currentBuyerMessage);
			log.audit('currentSOLines  : ', currentSOLines);
			log.audit('currentSOLineDetails  : ', currentSOLineDetails);

			if(currentCustNetworkAccountNum != '' && currentCustNetworkAccountNum != null && currentCustNetworkAccountNum != undefined){
				var customerID = getCustomerID(currentCustNetworkAccountNum);

				var currentSalesOrderRecObj = record.create({
					type: 'salesorder', isDynamic: true
				});

				if(currentSONumber != '' && currentSONumber != null && currentSONumber != undefined){
					currentSalesOrderRecObj.setValue('entity', customerID);
					if(currentSONumber){
						currentSalesOrderRecObj.setValue('tranid', currentSONumber);
					}

					if(currentSOOrderDate){
						currentSalesOrderRecObj.setValue('trandate', new Date(currentSOOrderDate));
					}

					if(currentPoNum){
						currentSalesOrderRecObj.setValue('otherrefnum', currentPoNum);
					}

					if(currentRequestedDeliveryDate){
						currentSalesOrderRecObj.setValue('startdate', new Date(currentRequestedDeliveryDate));
					}

					currentSalesOrderRecObj.setValue('custbody_edi_sync_status', EDI_Status_Field_Details.EDI_855_Request_Sync_Successful);
					currentSalesOrderRecObj.setValue('custbody_address_shiplist_number', EDI_Status_Field_Details.currentCustNetworkAccountNum);

					for(var currentSOLinesLen = 0; currentSOLinesLen < currentSOLines.length; currentSOLinesLen++){
						log.debug('cur SO Line is  : ', currentSOLines[currentSOLinesLen]);
						log.debug('cur SO Line details is  : ', currentSOLineDescription[currentSOLinesLen]);
						var curLineInfo = currentSOLines[currentSOLinesLen];
						var curLineItemDescription = '';
						var curItemID = '';
						var curLineNo = curLineInfo[1];
						var curLineQty = curLineInfo[2];
						var curLineUnit = curLineInfo[3];
						var curLineUnitPrice = curLineInfo[4];

						if(curLineInfo[6] == 'VP'){
							var curLineItemSAPCode = curLineInfo[7];
							curItemID = getItemID(curLineItemSAPCode);
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
								value: curLineUnitPrice
							});

							if(currentSOLineDescription){
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
							}

							currentSalesOrderRecObj.commitLine({sublistId: 'item'});

							itemFlag = 'T';
						}
					}
					
					if(itemFlag == 'T'){
						//currentSalesOrderRecObj.setValue('custbody_aps_entered_by', 51331);
						var newSalesOrderId = currentSalesOrderRecObj.save({enableSourcing: true, ignoreMandatoryFields: true});
						log.audit('newSalesOrderId is ', newSalesOrderId);
						
						return newSalesOrderId;
					}
					else{
						return null;
					}
				}
			}
		}catch(createItemReceiptFrom855Err){
			log.error('createItemReceiptFrom855 error: ', createItemReceiptFrom855Err.message);
		}
	}

	function getInputData() {
		try{
			log.audit('****** ACME MR Process Network VCP 855 Script Begin ******', '****** ACME MR Process Network VCP 855 Script Begin ******');

			var edi855FileObjArray = sftpConnectionDownload();
			//var edi855FileObj = file.load({id:157739});
			if(!isEmpty(edi855FileObjArray)){
				log.debug('edi855FileObjArray length : ', edi855FileObjArray.length);
				var ediLinesArray = new Array();
				for(var edi855FileObjArrayIndex = 0; edi855FileObjArrayIndex < edi855FileObjArray.length; edi855FileObjArrayIndex++){
					var curEDI855FileObj = edi855FileObjArray[edi855FileObjArrayIndex];
					log.audit('curEDI855FileObj for index : '+edi855FileObjArrayIndex+' ', curEDI855FileObj);
					var edi855FileContents = curEDI855FileObj.getContents();
					var decodedEDI855FileContents = encode.convert({
						string: edi855FileContents,
						inputEncoding: encode.Encoding.BASE_64,
						outputEncoding: encode.Encoding.UTF_8
					});
					log.debug('decodedEDI855FileContents : ', decodedEDI855FileContents);
					var edi855FileStaticInformation = get855EDIFileData();
					//log.debug('edi855FileStaticInformation ', edi855FileStaticInformation);
					//log.debug('Line segment id is ', EDI_855_File_Information_Field_Details.EDI_File_Segment_Delimiter);

					if(edi855FileStaticInformation){
						if(edi855FileStaticInformation.length > 0){
							var curSegmentDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Segment_Delimiter});
							var curElementDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Element_Delimiter});
							var curTransactionSetHeader = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Header});
							var curTransactionSetTrailer = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Trailer});
							var curTransactionSetIdentifierCode = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Identifier_Code});

							var edi855FileSegments = decodedEDI855FileContents.split(curSegmentDelimeter);
							log.debug('edi855FileSegments  : ', edi855FileSegments);

							var startSegmentVal = curTransactionSetHeader+curElementDelimeter+curTransactionSetIdentifierCode;
							var endSegmentVal = curTransactionSetTrailer+curElementDelimeter;

							log.debug('startSegmentVal is '+ startSegmentVal, 'endSegmentVal is '+ endSegmentVal);

							var currentEDILinesArray = getAllLines(edi855FileSegments, startSegmentVal, endSegmentVal);
							ediLinesArray = ediLinesArray.concat(currentEDILinesArray);
						}
					}
				}
				log.debug('ediLinesArray  : ', ediLinesArray);
				log.debug('ediLinesArray length : ', ediLinesArray.length);

				if(ediLinesArray.length > 0){
					return ediLinesArray;
				}
				else{
					log.audit('No 855 Network VCP 855 File data found');
					return null;
				}
			}
			else{
				log.audit('No 855 Network VCP 855 File data found');
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
				var ediLinedetails = read855(context.value);
				log.audit('ediLinedetails  : ', ediLinedetails);
			}catch(maperr){
				log.error('map stage error: ', maperr.message);
			}
		}
	}

	function reduce(context) {

	}

	function summarize(summary) {
		handleErrorIfAny(summary);
		try{

			log.audit('****** ACME MR Process Network VCP 855 Script End ******', '****** ACME MR Process Network VCP 855 Script End ******');
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