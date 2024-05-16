/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : Map/ Reduce Script
 * Script Name      : ACME MR Send Restockit 855
 * Version               : 2.0
 * Description        : 
 */

/*
 * Purchase Order Date format: CCYYMMDD
 * 
 */

define(['N/search', 'N/record', 'N/log' ,'N/runtime', 'N/format', 'N/email', 'N/encode', 'N/file', 'N/task', 'N/sftp', 'N/error'],

		function(search, record, log, runtime, format, email, encode, file, task, sftp, error) {

	var Restockit_Inv855_SearchId_ScriptField = 'custscript_restockit_inv_855_search_id';

	var SFTPPort = 22;
	var Restockit_SFTPInteg_Username_ScriptField = 'custscript_restckit_sftpintg855_username';
	var Restockit_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_restckit_sftpintg855_pwd_guid';
	var Restockit_SFTPInteg_URL_ScriptField = 'custscript_restckit_sftpintg855_sftp_url';
	var Restockit_SFTPInteg_Hostkey_ScriptField = 'custscript_restckit_sftpintg855_host_key';
	var Restockit_SFTPInteg_SFTPDir_ScriptField = 'custscript_restckit_sftpintg855_sftp_dir';

	var EDI_FileType = '855';
	var IntegrationName = 'Restockit';
	var EDI_File_Information_CustomRecord_ID = 'customrecord_acc_edi_file_setup';
	var EDI_Unit_Of_Measure_Mapping_CustomRecord_ID = 'customrecord_edi_uom_mapping';
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
			'EDI_File_Requested_Delivery_Date_Qualifier': 'custrecord_edi_requested_delivery_date_q',
			'EDI_File_Order_Entry_Date_Qualifier': 'custrecord_edi_order_entry_date_qualifie',
			'EDI_File_Shipped_Date_Qualifier': 'custrecord_edi_shipped_date_qualifier',
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
			'EDI_File_Pricing_Information_Header': 'custrecord_edi_pricing_information_heade',
			'EDI_File_Product_Item_Description_Header': 'custrecord_edi_prod_item_description_hea',
			'EDI_File_Item_Description_Type': 'custrecord_edi_item_description_type',
			'EDI_File_Total_Monetary_Value_Summary_Header': 'custrecord_edi_tot_mon_val_summar_header',
			'EDI_File_Service_Promotion_Allowance_Charge_Header': 'custrecord_edi_ser_pr_allwnc_chrg_header',
			'EDI_File_Allowance_Charge_Indicator': 'custrecord_edi_allownce_charge_indicator',
			'EDI_File_Service_Promotion_Allowance_Charge_Code': 'custrecord_edi_ser_pro_allwnce_chrg_code',
			'EDI_File_Freight_Line_Items': 'custrecord_edi_freight_line_items',
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

	var EDI_Unit_Of_Measure_Mapping_Fields = {
			'EDI_Vendor_Name': 'custrecord_edi_uom_vendor',
			'EDI_Acme_UnitOfMeasure': 'custrecord_edi_uom_acme_unit_of_measure',
			'EDI_Vendor_UnitOfMeasure': 'custrecord_edi_uom_vendo_unit_of_measure'
	};

	var Entity_Identifier_Code = {
			'Bill_To': 'BT',
			'Ship_From': 'SF',
			'Ship_To': 'ST'
	};

	var Transaction_Type_Code = {
			'Invoice': 'DI',
			'Credit_Memo': 'CR'
	};

	var Date_Time_Qualifier = {
			'Shipped_Date': '011'
	};

	var Reference_Identification_Qualifier = {
			'Member_Order': 'CO'
	};

	var Item_Product_Service_ID_Qualifier = {
			'ACME_Code': 'VC'
	};

	var Allowance_Charge_Indicator = {
			'Charge': 'C', 
			'Allowance': 'A'
	};

	var Service_Promotion_Allowance_Charge_Code = {
			'Freight': 'D240', 
			'Min_Order_Charge': 'A010', 
			'Emergency_Order': 'C280',
			'Discount': 'C310', 
			'Other_Misc_Charges': 'F050'
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
			var id=0;
			do{
				var resultslice = resultSet.getRange(id, id+1000 );
				if (resultslice !=null && resultslice !=''){ 
					for (var rs in resultslice){
						searchResult.push( resultslice[rs] );
						id++;
					} 
				}
				//log.emergency('searchResult length is', searchResult.length);
			}
			while((resultslice != null) ? resultslice.length >= 1000 : tempCondition < 0);

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
		}catch(generateEDIFileDateTimeErr){
			log.error('Error Occurred In ACME MR Send Restockit 810 Invoice Integration script: generateEDIFileDateTime Function is ', generateEDIFileDateTimeErr);
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

	function pad_with_zeroes(number, length) {

		var num_string = '' + number;
		while (num_string.length < length+1) {
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
			var currentDateTimeObj = new Date(datetime);
			var curTimeString = currentDateTimeObj.toISOString().slice(11,16).replace(/:/g, '');

			return curTimeString;
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

	function sftpConnectionUpload(ediFileObj) {
		try{
			log.debug('ediFileObj : ', ediFileObj);
			if(ediFileObj){
				var restockit_UserName =  runtime.getCurrentScript().getParameter({name: Restockit_SFTPInteg_Username_ScriptField});
				var restockit_PwdGUID =  runtime.getCurrentScript().getParameter({name: Restockit_SFTPInteg_Pwd_GUID_ScriptField});
				var restockit_SFTPurl =  runtime.getCurrentScript().getParameter({name: Restockit_SFTPInteg_URL_ScriptField});
				var restockit_Hostkey =  runtime.getCurrentScript().getParameter({name: Restockit_SFTPInteg_Hostkey_ScriptField});
				log.debug('Restockit Host Key is ', restockit_Hostkey);
				var restockit_SFTPDirectory =  runtime.getCurrentScript().getParameter({name: Restockit_SFTPInteg_SFTPDir_ScriptField});
				log.debug('Restockit: User Name is  '+restockit_UserName+' | Password GUID is  '+restockit_PwdGUID,' | SFTP Url is '+restockit_SFTPurl+' | SFTP Directory is '+restockit_SFTPDirectory);

				var restockit_SFTPconnection = sftp.createConnection({
					username: restockit_UserName,
					passwordGuid: restockit_PwdGUID,
					url: restockit_SFTPurl,
					hostKey: restockit_Hostkey,
					port : SFTPPort,
					directory: restockit_SFTPDirectory
				});

				log.debug('Restockit SFTPconnection : ', restockit_SFTPconnection);

				if(restockit_SFTPconnection && restockit_SFTPDirectory && !isEmpty(ediFileObj)){
					// restockit_SFTPconnection.upload({
					// 	file: ediFileObj,
					// 	replaceExisting: true
					// });
					log.debug('DEBUG', 'Uploaded file : '+ediFileObj.name);
					//network_Corporate_DailyRepUpload_sendAckEmail('Network VCP', 'Successful', 'Uploaded the Network VCP 810 file successfully to the Network VCP SFTP server');
				}//connection
				else{
					return null;
					//network_Corporate_DailyRepUpload_sendAckEmail('Network VCP', 'Unsuccessful', 'SFTP Directory not found in the script parameter');
				}//connection
			}
		}
		catch(sftpConnectionUploadErr){
			log.error('Error Occurred In ACME MR Send Restockit 810 Invoice script: sftpConnectionUpload Function is ', sftpConnectionUploadErr);
			//restockit_DailyRepUpload_sendAckEmail('Network VCP', 'Unsuccessful', sftpConnectionUploadErr.message);
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
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Number_Length}),
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
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Function_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier2}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Date_Time_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Requested_Delivery_Date_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Order_Entry_Date_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Shipped_Date_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Date_Time_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Message_Text_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Name_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Entity_Identifier_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Identification_Code_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Additional_Name_Information_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Address_Information_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Geographic_Location_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Item_Product_Service_ID_Qualifier}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Pricing_Information_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Product_Item_Description_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Item_Description_Type}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Total_Monetary_Value_Summary_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Service_Promotion_Allowance_Charge_Header}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Allowance_Charge_Indicator}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Service_Promotion_Allowance_Charge_Code}),
				search.createColumn({name: EDI_855_File_Information_Field_Details.EDI_File_Freight_Line_Items}),
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

	function createInvLines(datafor855InvLines) {
		try{
			var invString = '';
			log.debug('Invoice Data  is ', datafor855InvLines);
			if(datafor855InvLines){
				var headerinfo = datafor855InvLines.header;
				log.debug('Invoice headerinfo  is ', headerinfo);

				var edi855FileStaticInformation = get855EDIFileData();
				log.debug('edi855FileStaticInformation ', edi855FileStaticInformation);
				//log.debug('Line segment id is ', EDI_810_File_Information_Field_Details.EDI_File_Segment_Delimiter);

				if(edi855FileStaticInformation){
					var curSegmentDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Segment_Delimiter});
					var curElementDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Element_Delimiter});
					var curSubelementDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Subelement_Delimiter});

					var curBeginningSegmentHeader = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Beginning_Segment_Header});
					var transactionSetPurposeCode = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Purpose_Code});
					const curTransactionTypeCode = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Type_Code});
					log.debug('curTransactionTypeCode is ', curTransactionTypeCode);

					var currentTransactionType = headerinfo.values.type.text;
					log.debug(' currentTransactionType  is ', currentTransactionType);

					var soTranNumber = headerinfo.values.tranid;
					var soTranDate = headerinfo.values.trandate;
					var invShipDate = headerinfo.values.shipdate;
					var invShipDateFormatted = formatDateTime(invShipDate, 'CCYYMMDD');

					var curDateObj = new Date();
					var curDateFormatted = formatDateTime(curDateObj, 'CCYYMMDD');
					log.debug('curDateObj is '+ curDateObj, ' curDateFormatted is '+ curDateFormatted);

					var createdFromPONum = headerinfo.values['otherrefnum.createdFrom'];
					var createdFromTranDate = headerinfo.values['trandate.createdFrom'];
					var createdFromTranDateFormatted = formatDateTime(createdFromTranDate, 'CCYYMMDD');

					var acknowledgmentTypeCode = 'AK';
					

					// BAK Segment
					invString += curBeginningSegmentHeader+curElementDelimeter+transactionSetPurposeCode+curElementDelimeter+acknowledgmentTypeCode+curElementDelimeter+soTranNumber+curElementDelimeter+soTranDate+curElementDelimeter+curElementDelimeter;  // Beginning of BAK Segment
					invString += curElementDelimeter+curElementDelimeter+/* MISSING BAK-08*/"BAK-08 PLACEHOLDER"+curSegmentDelimeter;   // End of BEG Segment
					log.debug('invString after BEG Segment is ', invString);

					var curReferenceIdentificationHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Reference_Identification_Header});
					const curReferenceIdentificationQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Reference_Identification_Qualifier});

					log.debug('curSegmentDelimeter is '+ curSegmentDelimeter+' curElementDelimeter is '+ curElementDelimeter, 'curBeginningSegmentHeader is '+ curBeginningSegmentHeader+' curReferenceIdentificationHeader is '+ curReferenceIdentificationHeader+' curReferenceIdentificationQualifier is '+ curReferenceIdentificationQualifier);

					var vendorPONumber = headerinfo.values.otherrefnum;

					var refIDQualifier = '';

					if(!isEmpty(vendorPONumber)){
						if(!isEmpty(curReferenceIdentificationQualifier)){
							var curReferenceIdentificationQualifierObj = JSON.parse(curReferenceIdentificationQualifier);
							refIDQualifier = curReferenceIdentificationQualifierObj.Member_Order;
						}
						else{
							refIDQualifier = Reference_Identification_Qualifier.Member_Order;
						}

						invString += curReferenceIdentificationHeader +curElementDelimeter+refIDQualifier+curElementDelimeter+vendorPONumber+curSegmentDelimeter;  // REF Segment
						log.debug('invString after REF Segment is ', invString);
					}

					invString += 'PER'+curElementDelimeter+'BD'+curElementDelimeter+'RESTOCKI'+ curSegmentDelimeter; // PER Segment

					// DTM Segment
					var curDateTimeHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Date_Time_Header});
					var curDateTimeQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Date_Time_Qualifier});

					var shippedDateQualifier = '';
					if(!isEmpty(curDateTimeQualifier)){
						var curDateTimeQualifierObj = JSON.parse(curDateTimeQualifier);
						shippedDateQualifier = curDateTimeQualifierObj.Shipped_Date;
					}
					else{
						shippedDateQualifier = Date_Time_Qualifier.Shipped_Date;
					}

					invString += curDateTimeHeader+curElementDelimeter+shippedDateQualifier+curElementDelimeter+invShipDateFormatted+curSegmentDelimeter;  // DTM Segment
					log.debug('invString after DTM Segment is ', invString);

					// IT1 Segment
					var curBaselineItemDataHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header});
					var curItemProductServiceIDQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Item_Product_Service_ID_Qualifier});

					var curItemProductServiceIDQualifierObj;
					if(!isEmpty(curItemProductServiceIDQualifier)){
						curItemProductServiceIDQualifierObj = JSON.parse(curItemProductServiceIDQualifier);
					}	

					// PID Segment
					var curProductItemDescriptionHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Product_Item_Description_Header});
					var curItemDescriptionType  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Item_Description_Type});

					// SAC Related Items List
					var curFreightLineItems  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Freight_Line_Items});
					log.debug('curFreightLineItems  is ', curFreightLineItems);

					var freightItemAmount = 0;
					var freightItemDescription = '';
					var itemDetails = datafor855InvLines.lineinfo;
					var totalQuantity = 0;
					log.debug('Invoice itemDetails  is ', itemDetails);
					var emptyIT1SegmentFlag = 'T';
					for (var itemDetailsLen = 0; itemDetailsLen < itemDetails.length; itemDetailsLen++){
						var curItemLineDetails = itemDetails[itemDetailsLen];
						log.debug('curItemLineDetails is ', curItemLineDetails);

						var curItemID = curItemLineDetails.values.item.value;
						var curItemLineAmount = curItemLineDetails.values.amount;
						var curItemDescription = curItemLineDetails.values.memo;
						if(!isEmpty(curItemDescription)){																						// Limiting the Item Description string to 80 characters
							if(curItemDescription.length > 80){
								curItemDescription = curItemDescription.substring(0, 79);
							}
						}
						var sacItemFlag = 'F';
						if(!isEmpty(curFreightLineItems)){
							var curFreightLineItemsArray = curFreightLineItems.split(',');
							log.debug('curFreightLineItemsArray  is ', curFreightLineItemsArray);
							if(curFreightLineItemsArray.indexOf(curItemID) != -1){
								freightItemAmount = parseFloat(freightItemAmount) + parseFloat(curItemLineAmount);
								freightItemDescription += curItemDescription;
								sacItemFlag = 'T';
							} 
							log.debug('freightItemAmount is '+freightItemAmount, 'freightItemDescription is '+freightItemDescription);
						}

						if(sacItemFlag == 'F'){
							emptyIT1SegmentFlag = 'F';
							var curItemLineNumber = curItemLineDetails.values.linesequencenumber;
							var curItemQuantity = curItemLineDetails.values.quantity;
							var curItemUoM = curItemLineDetails.values.unit;
							var curEDIItemUoM = curItemLineDetails.values.custcol_edi_vendor_uofm;
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
							if(curEDIItemUoM == ediVendorUOM_Mapping){
								curEDILineUoM = curEDIItemUoM;
							}
							else{
								curEDILineUoM = ediVendorUOM_Mapping;
							}

							var curItemUnitPrice = curItemLineDetails.values.rate;
							var curItemType = curItemLineDetails.values['type.item'].text;
							var curMembersItemNum = curItemLineDetails.values['itemid.item'];
							log.debug('curItemType is ', curItemType);
							log.debug('curItemLineNumber is ', curItemLineNumber);

							invString += curBaselineItemDataHeader+curElementDelimeter+curItemLineNumber+curElementDelimeter+curItemQuantity+curElementDelimeter;  //  Beginning of IT1 Segment
							invString += curEDILineUoM+curElementDelimeter+curItemUnitPrice+curElementDelimeter+curElementDelimeter;

							if(!isEmpty(curItemProductServiceIDQualifier)){
								invString += curItemProductServiceIDQualifierObj.ACME_Code+curElementDelimeter+curMembersItemNum;
							}
							else{
								invString += Item_Product_Service_ID_Qualifier.ACME_Code+curElementDelimeter+curMembersItemNum;
							}
							invString += curSegmentDelimeter;																																																		   //  End of IT1 Segment
							log.debug('invString after  '+itemDetailsLen+' IT1 Segment is ', invString);

							invString += curProductItemDescriptionHeader+curElementDelimeter+curItemDescriptionType+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter;	 // Beginning of  PID Segment
							invString += curItemDescription+curSegmentDelimeter;																																										 //  End of PID Segment
							log.debug('invString after  '+itemDetailsLen+' PID Segment is ', invString);

							totalQuantity = parseInt(totalQuantity) + parseInt(curItemQuantity);
						}
					}
					log.debug('totalQuantity is ', totalQuantity);
					log.debug('emptyIT1SegmentFlag is ', emptyIT1SegmentFlag);
					if(emptyIT1SegmentFlag == 'T'){
						invString += curBaselineItemDataHeader+curElementDelimeter;
						invString += curSegmentDelimeter;
					}
					log.audit('invString is ', invString);

					// TDS Segment
					var curTotalMonetaryValueSummaryHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Total_Monetary_Value_Summary_Header});

					var invTotalAmount = parseFloat(headerinfo.values.amount);
					var curInvoiceObj = record.load({type: headerinfo.recordType, id: headerinfo.id});
					var invSubtotalAmount = parseFloat(curInvoiceObj.getValue('subtotal'));

					invTotalAmount = invTotalAmount.toFixed(2).replace('.', '');
					invSubtotalAmount = invSubtotalAmount.toFixed(2).replace('.', '');
					log.debug('invTotalAmount is '+ invTotalAmount, ' invSubtotalAmount is '+ invSubtotalAmount);
					invString += curTotalMonetaryValueSummaryHeader+curElementDelimeter+invTotalAmount+curElementDelimeter+invSubtotalAmount+curSegmentDelimeter;  //  CTT Segment
					log.debug('invString after TDS Segment is ', invString);

					//SAC Segment
					var curServicePromotionAllowanceChargeHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Service_Promotion_Allowance_Charge_Header});
					var curAllowanceChargeIndicator  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Allowance_Charge_Indicator});
					var curServicePromotionAllowanceChargeCode  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Service_Promotion_Allowance_Charge_Code});

					var chargeIndicator = '';
					if(!isEmpty(curAllowanceChargeIndicator)){
						var curAllowanceChargeIndicatorObj = JSON.parse(curAllowanceChargeIndicator);
						chargeIndicator = curAllowanceChargeIndicatorObj.Charge;
					}
					else{
						chargeIndicator = Allowance_Charge_Indicator.Charge;
					}

					var freightCode = '';
					if(!isEmpty(curServicePromotionAllowanceChargeCode)){
						var curServicePromotionAllowanceChargeCodeObj = JSON.parse(curServicePromotionAllowanceChargeCode);
						freightCode = curServicePromotionAllowanceChargeCodeObj.Freight;
					}
					else{
						freightCode = Service_Promotion_Allowance_Charge_Code.Freight;
					}

					// Freight Item 
					if(freightItemAmount != 0){
						freightItemAmount = freightItemAmount.toFixed(2).replace('.', '');
						invString += curServicePromotionAllowanceChargeHeader+curElementDelimeter+chargeIndicator+curElementDelimeter+freightCode;      // Adding Charge Indicator as this segment refers to the Freight Item
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+freightItemAmount;
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter;
						invString += freightItemDescription+curSegmentDelimeter;                                                          //  SAC Segment
					}
					log.debug('invString after Freight Item: SAC Segment is ', invString);

					// CTT Segment
					var curTransactionTotalsHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Totals_Header});

					invString += curTransactionTotalsHeader+curElementDelimeter+itemDetails.length+curSegmentDelimeter;  //  CTT Segment
					log.debug('invString after CTT Segment is ', invString);

					if(invString){
						return invString;
					}
					else{
						return null;
					}
				}
			}
		} catch(createInvLinesErr){
			log.error('createInvLines error: ', createInvLinesErr.message);
		}
	}	

	function createHeaderLines(edilineinfo) {
		try{
			log.debug('Invoice EDI line Data  is ', edilineinfo);
			log.debug('Invoice EDI line Data length  is ', edilineinfo.length);

			var edi855FileStaticInformation = get855EDIFileData();
			log.debug('edi810FileStaticInformation ', edi855FileStaticInformation);

			var curEDIFileString = '';
			var curEDIFileName = '';

			if(edi855FileStaticInformation){
				var curInterchangeControlHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Header});
				var curAuthorizationInformationQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Authorization_Information_Qualifier});
				var curAuthorizationInformationLength = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Authorization_Information_Length});
				var curSecurityInformationQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Security_Information_Qualifier});
				var curSecurityInformationLength  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Security_Information_Length});
				var curInterchangeIDQualifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_ID_Qualifier});
				var curInterchangeSenderID  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Sender_ID});
				var curInterchangeReceiverID  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Receiver_ID});
				var curInterchangeSenderReceiverIDLength  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Sender_Receiver_ID_Length});
				var curInterchangeControlStandardsIdentifier  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Standards_Identifier});
				var curInterchangeControlVersionNumber  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Version_Number});
				var curInterchangeControlNumber  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Number});
				var curInterchangeControlNumberLength  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Number_Length});
				var curAcknowledgmentRequested  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Acknowledgment_Requested});
				var curUsageIndicator  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Usage_Indicator});
				var curInterchangeControlTrailer  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Interchange_Control_Trailer});

				var curSegmentDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Segment_Delimiter});
				var curElementDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Element_Delimiter});
				var curSubelementDelimeter  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Subelement_Delimiter});

				var curFunctionalGroupHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Functional_Group_Header});
				var curFunctionalIdentifierCode  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Functional_Identifier_Code});
				var curApplicationSendersCode  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Application_Senders_Code});
				var curApplicationReceiversCode  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Application_Receivers_Code});
				var curGroupControlNumber  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Group_Control_Number});
				var curResponsibleAgencyCode  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Responsible_Agency_Code});
				var curReleaseIndustryIdentifierCode  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Version_Release_Industry_Identifier_Code});
				var curFunctionalGroupTrailer  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Functional_Group_Trailer});

				var curTransactionSetHeader  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Header});
				var curTransactionSetIdentifierCode  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Identifier_Code});
				var curTransactionSetControlNumberLength  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Control_Number_Length});
				var curTransactionSetTrailer  = edi855FileStaticInformation[0].getValue({name: EDI_855_File_Information_Field_Details.EDI_File_Transaction_Set_Trailer});

				log.debug('curInterchangeControlHeader is '+ curInterchangeControlHeader+' curInterchangeSenderID is '+ curInterchangeSenderID+' curInterchangeReceiverID is '+ curInterchangeReceiverID, 'curFunctionalGroupHeader is '+ curFunctionalGroupHeader+' curFunctionalIdentifierCode is '+ curFunctionalIdentifierCode+' curTransactionSetHeader is '+ curTransactionSetHeader+' curTransactionSetIdentifierCode is '+ curTransactionSetIdentifierCode);
				log.debug('curSubelementDelimeter ', curSubelementDelimeter);
				if(!isEmpty(edilineinfo)){
					var headerSegmentString = '';
					var trailerSegmentString = '';

					var curEDIFileDateTimeString = generateEDIFileDateTime();
					curEDIFileName += IntegrationName + '_'+'EDI' + '_' + curTransactionSetIdentifierCode+ '_' + curEDIFileDateTimeString;
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

					/*var curEDIHeaderControlNumber =  runtime.getCurrentScript().getParameter({name: Network_Corporate_EDI_Control_Number_ScriptField});
					log.debug('Network Corporate EDI Header Control Number is ', curEDIHeaderControlNumber);*/

					var curInterchangeControlNumberWithZeros = '';
					var curGroupControlNumberWithZeros = '';
					if(!isEmpty(curInterchangeControlNumber) && curInterchangeControlNumber == curGroupControlNumber){
						curInterchangeControlNumber++;
						var interchangeControlNumberLen = curInterchangeControlNumber.toString().length;
						var interchangeControlNumberZerosLen = curInterchangeControlNumberLength - interchangeControlNumberLen;
						//log.debug('curInterchangeControlNumber is '+ curInterchangeControlNumber+' interchangeControlNumberLen is '+ interchangeControlNumberLen, 'interchangeControlNumberZerosLen is '+ interchangeControlNumberZerosLen);
						if(interchangeControlNumberZerosLen > 0){
							curInterchangeControlNumberWithZeros = pad_with_zeroes(curInterchangeControlNumber, interchangeControlNumberZerosLen);
						}
						else{
							curInterchangeControlNumberWithZeros = curInterchangeControlNumber;
						}
						curGroupControlNumberWithZeros = curInterchangeControlNumberWithZeros;
					}
					//log.debug('curInterchangeControlNumberWithZeros is: '+curInterchangeControlNumberWithZeros, 'curGroupControlNumberWithZeros is: '+curGroupControlNumberWithZeros);

					headerSegmentString += curInterchangeControlHeader+curElementDelimeter+curAuthorizationInformationQualifier+curElementDelimeter+authorizationInformationString+curElementDelimeter+curSecurityInformationQualifier+curElementDelimeter+securityInformationString+curElementDelimeter;  // Beginning of ISA Segment
					headerSegmentString += curInterchangeIDQualifier+curElementDelimeter+curInterchangeSenderID+curElementDelimeter+curInterchangeIDQualifier+curElementDelimeter+curInterchangeReceiverID+curElementDelimeter;
					headerSegmentString += interchangeDate+curElementDelimeter+interchangeTime+curElementDelimeter+curInterchangeControlStandardsIdentifier+curElementDelimeter+curInterchangeControlVersionNumber+curElementDelimeter;
					headerSegmentString += curInterchangeControlNumberWithZeros+curElementDelimeter+curAcknowledgmentRequested+curElementDelimeter+curUsageIndicator+curElementDelimeter+curSubelementDelimeter+curSegmentDelimeter;    // End of ISA Segment

					headerSegmentString += curFunctionalGroupHeader+curElementDelimeter+curFunctionalIdentifierCode+curElementDelimeter+curApplicationSendersCode+curElementDelimeter+curApplicationReceiversCode+curElementDelimeter+curFunctionalGroupDate+curElementDelimeter;  // Beginning of GS Segment
					headerSegmentString += curFunctionalGroupTime+curElementDelimeter+curGroupControlNumberWithZeros+curElementDelimeter+curResponsibleAgencyCode+curElementDelimeter+curReleaseIndustryIdentifierCode+curSegmentDelimeter;   // End of GS Segment

					curEDIFileString += headerSegmentString;
					log.debug('curEDIFileString after headerSegmentString is ', curEDIFileString);
					for (var edilineinfoIndex = 0; edilineinfoIndex < edilineinfo.length; edilineinfoIndex++) {
						var curEdilineinfo = edilineinfo[edilineinfoIndex];
						log.debug('curEdilineinfo for '+edilineinfoIndex+' is  ', curEdilineinfo);

						var transactionSetNumWithZero = '';
						var transactionSetNum = edilineinfoIndex+1;
						var transactionSetNumLen = transactionSetNum.toString().length;
						var transactionSetNumWithZeroLen = curTransactionSetControlNumberLength - transactionSetNumLen;
						//log.debug('transactionSetNum is '+ transactionSetNum+' transactionSetNumLen is '+ transactionSetNumLen, 'transactionSetNumWithZeroLen is '+ transactionSetNumWithZeroLen);
						if(transactionSetNumWithZeroLen > 0){
							transactionSetNumWithZero = pad_with_zeroes(transactionSetNum, transactionSetNumWithZeroLen);
						}
						else{
							transactionSetNumWithZero = transactionSetNum;
						}
						//log.debug('transactionSetNumWithZero ', transactionSetNumWithZero);
						var tranHeaderSegmentString = curTransactionSetHeader+curElementDelimeter+curTransactionSetIdentifierCode+curElementDelimeter+transactionSetNumWithZero+curSegmentDelimeter;   // ST Segment
						curEDIFileString += tranHeaderSegmentString;
						log.debug('curEDIFileString after tranHeaderSegmentString is ', curEDIFileString);

						curEDIFileString += curEdilineinfo;

						var totalChildSegments = curEdilineinfo.toString().split(curSegmentDelimeter).length - 1;
						log.debug('totalChildSegments is ', totalChildSegments);
						totalChildSegments = totalChildSegments + 2;

						var tranTrailerSegmentString = curTransactionSetTrailer+curElementDelimeter+totalChildSegments+curElementDelimeter+transactionSetNumWithZero+curSegmentDelimeter;   // SE Segment
						curEDIFileString += tranTrailerSegmentString;
						log.debug('curEDIFileString after tranTrailerSegmentString is ', curEDIFileString);
					}

					var totalFunctionalGroupSegments = 1;
					trailerSegmentString += curFunctionalGroupTrailer+curElementDelimeter+edilineinfo.length+curElementDelimeter+curGroupControlNumberWithZeros+curSegmentDelimeter;   // GE Segment
					trailerSegmentString += curInterchangeControlTrailer+curElementDelimeter+totalFunctionalGroupSegments+curElementDelimeter+curInterchangeControlNumberWithZeros;   // IEA Segment

					curEDIFileString += trailerSegmentString;
					curEDIFileString = curEDIFileString.replace(/&gt;/g, '>');

					log.debug('curEDIFileString after trailerSegmentString is ', curEDIFileString);
				}
			}

			log.debug('curInterchangeControlNumber after trailerSegmentString is ', curInterchangeControlNumber);
			if(curEDIFileName && curEDIFileString){
				var curEDIFileDetails = {'edifilename': curEDIFileName, 'edifilecontents': curEDIFileString, 'edicontrolnumber': curInterchangeControlNumber};
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
			log.audit('****** ACME MR Send Restockit 810 Invoice Script Begin ******', '****** ACME MR Send Restockit 810 Invoice Script Begin ******');

			var restockit_Inv855_Search_ID =  runtime.getCurrentScript().getParameter({name: Restockit_Inv855_SearchId_ScriptField});
			log.debug('Restockit Invoice 810 Search ID is ', restockit_Inv855_Search_ID);

			if(restockit_Inv855_Search_ID){
				var restockit_Inv810_Search_Obj = search.load({
					id: restockit_Inv855_Search_ID
				});

				if(restockit_Inv810_Search_Obj){
					return restockit_Inv810_Search_Obj;
				}
				else{
					log.audit('No search results');
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
					var curTranId   = searchResult.id;
					/*
					//var valueObj = {'internalid': curPOId, 'updatedItemid': updatedItemID, 'updatedItempurchaseprice': updatedItemPurchasePrice, 'tranno': curPONumber, 'item': lineItem, 'lineno': lineNumber, 'linerate': lineRate, 'amount': lineAmount};
					var valueObj = {'internalid': curPOId, 'updatedItempurchaseprice': updatedItemPurchasePrice, 'tranno': curPONumber, 'item': lineItem, 'lineno': lineNumber, 'linerate': lineRate, 'amount': lineAmount};*/
					context.write({
						key: curTranId,
						value: searchResult
					});
				}
			} catch(maperr){
				log.error('map stage error: ', maperr.message);
			}	
		}	
	}

	function reduce(context) {
		log.debug('Context values length is '+context.values.length, 'Context values is '+context.values);
		var curTranId = context.key;
		log.debug('curTranId is ', curTranId);

		var invEDILines = '';
		var invData = {};
		var invItemArray = new Array();
		if (context.values.length > 0 && curTranId){
			try{
				for (var i = 0; i < context.values.length; i++) { 
					log.debug('Context value in Reduce Stage is ', context.values[i]);

					var invSearchResult = JSON.parse(context.values[i]);

					var curInvNumber  = invSearchResult['values'].tranid;
					var curInvLineNumber  = invSearchResult['values'].linesequencenumber;
					var curInvLineItemData  = invSearchResult['values'].item;

					log.debug('curInvNumber is '+curInvNumber, 'curInvLineNumber is '+curInvLineNumber);
					log.debug('curInvLineItemData is ', curInvLineItemData);
					if(curInvLineNumber == 0){
						invData['header'] = invSearchResult;
					}
					else {
						var lineItem  = curInvLineItemData.value;
						if(!isEmpty(lineItem)){
							invItemArray[curInvLineNumber-1]= invSearchResult;
						}
					}

				}	
				invData['lineinfo'] = invItemArray;
				log.debug('invData is ', invData);
				log.debug('invItemArray is ', invItemArray);
				if(Object.keys(invData).length > 0){
					var curInvEDILine = createInvLines(invData);
					log.debug('curInvEDILine is ', curInvEDILine);
				}

				context.write({
					key: curTranId,
					value: curInvEDILine
				});
			} catch(reduceErr){
				log.error('Reduce stage error for PO ID '+curTranId+' is: ', reduceErr.message);
			}
		}
	}

	function summarize(summary) {
		handleErrorIfAny(summary);
		try{
			var ediLinesArray = new Array();
			var invoicesArray = new Array();
			summary.output.iterator().each(function(key, value) {
				log.debug('key is '+key, 'value is '+value);
				invoicesArray[invoicesArray.length] = key;
				ediLinesArray[ediLinesArray.length] = value;				
				return true;
			}); 
			log.debug('ediLinesArray is ', ediLinesArray);

			if(ediLinesArray.length > 0) {
				var curEDIFileDetails = createHeaderLines(ediLinesArray);
				log.debug('Summarize: curEDIFileDetails is ', curEDIFileDetails);

				if(!isEmpty(curEDIFileDetails)){
					var curEDIFileName = curEDIFileDetails.edifilename;
					var curFileContents = curEDIFileDetails.edifilecontents;
					var curEDIControlNumber = curEDIFileDetails.edicontrolnumber;
					log.debug('Summarize: curEDIFileName is '+curEDIFileName, 'curEDIControlNumber is '+curEDIControlNumber);
					log.debug('Summarize: curFileContents is ', curFileContents);

					curEDIFileObj = file.create({
						name: curEDIFileName+'.edi',
						fileType: file.Type.PLAINTEXT,
						contents: curFileContents
					});

					// Daily edi file create function
					curEDIFileObj.folder = 1525;

					var edifileid = curEDIFileObj.save();
					log.debug('edifileid is ', edifileid);
					sftpConnectionUpload(curEDIFileObj);
					//invoicesArray.forEach(updateInvoice_EDIStatus)
				}
				
			}

			log.audit('****** ACME MR Send Restockit 810 Invoice Script End ******', '****** ACME MR Send Restockit 810 Invoice Script End ******');
		} catch(summarizeErr){
			log.error('Summarize stage error: ', summarizeErr.message);
		}
	}
	function updateInvoice_EDIStatus(invoiceId){
		try{
			log.audit('updatePO_EDIStatus function: invoiceId is ', invoiceId);
			var updateInvoice = record.submitFields({    
				type: 'invoice',   
				id: invoiceId, 
				values: {       
					custbody_edi_sync_status: 11,    
				}
			});
			log.audit('updateInvoice is ', updateInvoice);
		} catch(updateInv_EDIStatusErr){
			log.error('updateInvoice_EDIStatus error: ', updateInv_EDIStatusErr.message);
		}
	}

	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize
	};

});
