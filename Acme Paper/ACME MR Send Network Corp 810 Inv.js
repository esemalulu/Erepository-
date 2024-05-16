/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : Map/ Reduce Script
 * Script Name      : ACME MR Send Network Corporate 810 Inv
 * Version              : 2.0
 * Description        : This script will run a search to create a 810 Invoice EDI file in NetSuite and uploads the file to the Network Corporate SFTP server. 
 */

/*
 * Invoice Date format: CCYYMMDD
 * 
 * Create Daily EDI File Record and attach all of the transcations to it
 */

define(['N/search', 'N/record', 'N/log' ,'N/runtime', 'N/format', 'N/email', 'N/encode', 'N/file', 'N/task', 'N/sftp', 'N/error'],

		function(search, record, log, runtime, format, email, encode, file, task, sftp, error) {

	var Network_Corporate_Inv810_SearchId_ScriptField = 'custscript_network_corp_inv_810_searchid';
	var Network_Corporate_EDI_Control_Number_ScriptField = 'custscript_network_corp_inv810_contr_num';

	var SFTPPort = 22;
	var Network_Corporate_SFTPInteg_Username_ScriptField = 'custscript_networkcorp_810_sftp_username';
	var Network_Corporate_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_networkcorp_810_sftp_pwd_guid';
	var Network_Corporate_SFTPInteg_URL_ScriptField = 'custscript_networkcorp_810_sftp_int_url';
	var Network_Corporate_SFTPInteg_Hostkey_ScriptField = 'custscript_networkcorp_810_sftp_host_key';
	var Network_Corporate_SFTPInteg_SFTPDir_ScriptField = 'custscript_networkcorp_810_sftp_director';

	var EDI_FileType = '810';
	var IntegrationName = 'Network_Corporate';
	var EDI_File_Information_CustomRecord_ID = 'customrecord_acc_edi_file_setup';
	var EDI_Unit_Of_Measure_Mapping_CustomRecord_ID = 'customrecord_edi_uom_mapping';
	var Daily_EDI_File_Details_CustomRecord_ID = 'customrecord_daily_edi_file_details';

	var Context_Counter = 0;

	var EDI_810_File_Information_Field_Details = {
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
			'EDI_File_Tax_Information_Header': 'custrecord_edi_tax_information_header',
			'EDI_File_Tax_Type_Code': 'custrecord_edi_tax_type_code',
			'EDI_File_Service_Promotion_Allowance_Charge_Header': 'custrecord_edi_ser_pr_allwnc_chrg_header',
			'EDI_File_Allowance_Charge_Indicator': 'custrecord_edi_allownce_charge_indicator',
			'EDI_File_Service_Promotion_Allowance_Charge_Code': 'custrecord_edi_ser_pro_allwnce_chrg_code',
			'EDI_File_Freight_Line_Items': 'custrecord_edi_freight_line_items',
			'EDI_File_Minimum_Order_Charge_Items': 'custrecord_edi_min_order_charge_items',
			'EDI_File_Emergency_Order_Items': 'custrecord_edi_emergency_order_items',
			'EDI_File_Discount_Items': 'custrecord_edi_discount_items',
			'EDI_File_Other_Misc_Charges_Items': 'custrecord_edi_other_misc_charges_items',
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

	var Transaction_Type_Code = {
			'Invoice': 'DI',
			'Credit_Memo': 'CR'
	};

	var Reference_Identification_Qualifier = {
			'Network_PO': 'PO',
			'Member_Order': 'CO',
			'Case_Pack': 'ZZ',
			'Tax_Exempt_Flag': 'TX'
	};

	var Entity_Identifier_Code = {
			'Bill_to_Party': 'BT',
			'Ship_To': 'ST',
			'Ship_From': 'SF',
			'Remit_To': 'RI',
			'Manufacturer': 'MF'
	};

	var Entity_Identification_Code_Qualifier = {
			'Bill_To': '92',
			'Ship_To': '92',
			'Ship_From': '92',
			'Remit_To': '92',
			'Manufacturer': '91'
	}; 

	var Date_Time_Qualifier = {
			'Shipped_Date': '011'
	};

	var Item_Product_Service_ID_Qualifier = {
			'UPC_Code': 'UP',
			'Item_SAP_No': 'VP',
			'ACME_Code': 'VN',
			'Network_Legacy_Item_No': 'OT',
			'Buyer_Part_No': 'BP',
			'Manufacturer_Part_No': 'MG'
	};

	var Tax_Type_Code = {
			'Total_Tax': 'TX'
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
			log.error('Error Occurred In ACME MR Send Network Corporate 810 Inv script: generateEDIFileDateTime Function is ', generateEDIFileDateTimeErr);

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
		log.debug('num_string : ', num_string);
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

	function sftpConnectionUpload(ediFileObj) {
		try{
			log.debug('ediFileObj : ', ediFileObj);
			if(ediFileObj){
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
					directory: network_Corporate_SFTPDirectory
				});

				log.debug('Network_Corporate SFTP connection : ', network_Corporate_SFTPconnection);

				if(network_Corporate_SFTPconnection && network_Corporate_SFTPDirectory && !isEmpty(ediFileObj)){
					network_Corporate_SFTPconnection.upload({
						//directory: network_Corporate_SFTPDirectory,
						file: ediFileObj,
						replaceExisting: true
					});
					log.debug('DEBUG', 'Uploaded file : '+ediFileObj.name);
					//network_Corporate_DailyRepUpload_sendAckEmail('Network VCP', 'Successful', 'Uploaded the Network VCP 810 file successfully to the Network VCP SFTP server');
				}//connection
				else{
					return null;
					//network_Corporate_DailyRepUpload_sendAckEmail('Network VCP', 'Unsuccessful', 'SFTP Directory not found in the script parameter');
				}
			}
		} 
		catch(sftpConnectionUploadErr){
			log.error('Error Occurred In ACME MR Send Network Corporate 810 Inv script: sftpConnectionUpload Function is ', sftpConnectionUploadErr);
			//network_Corporate_DailyRepUpload_sendAckEmail('Network VCP', 'Unsuccessful', sftpConnectionUploadErr.message);
		}
	}

	function get810EDIFileData() {
		try{
			var edi_810_File_InformationFilters = [
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

			var edi_810_File_InformationColumns = [
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Information_Name}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_Vendor}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_Customer}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Type}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Segment_Delimiter}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Element_Delimiter}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Subelement_Delimiter}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Authorization_Information_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Authorization_Information_Length}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Security_Information_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Security_Information_Length}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_ID_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Sender_ID}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Receiver_ID}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Sender_Receiver_ID_Length}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Standards_Identifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Version_Number}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Number}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Number_Length}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Acknowledgment_Requested}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Usage_Indicator}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Functional_Group_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Functional_Identifier_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Application_Senders_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Application_Receivers_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Group_Control_Number}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Responsible_Agency_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Version_Release_Industry_Identifier_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Set_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Set_Identifier_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Set_Control_Number_Length}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Beginning_Segment_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Set_Purpose_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Type_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Reference_Identification_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Reference_Identification_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Administrative_Communications_Contact_Function_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Communication_Number_Qualifier2}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Date_Time_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Requested_Delivery_Date_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Order_Entry_Date_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Shipped_Date_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Date_Time_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Message_Text_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Name_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Entity_Identifier_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Identification_Code_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Additional_Name_Information_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Address_Information_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Geographic_Location_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Item_Product_Service_ID_Qualifier}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Pricing_Information_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Product_Item_Description_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Item_Description_Type}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Total_Monetary_Value_Summary_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Tax_Information_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Tax_Type_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Service_Promotion_Allowance_Charge_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Allowance_Charge_Indicator}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Service_Promotion_Allowance_Charge_Code}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Freight_Line_Items}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Minimum_Order_Charge_Items}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Emergency_Order_Items}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Discount_Items}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Other_Misc_Charges_Items}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Totals_Header}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Set_Trailer}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Functional_Group_Trailer}),
				search.createColumn({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Trailer})
				];

			var edi_810_File_InformationSearchResult = returnSearchResults('', EDI_File_Information_CustomRecord_ID, edi_810_File_InformationFilters, edi_810_File_InformationColumns);
			log.debug('EDI 810 File_Information Search Result is ', edi_810_File_InformationSearchResult);

			if(edi_810_File_InformationSearchResult){
				if(edi_810_File_InformationSearchResult.length > 0){
					return edi_810_File_InformationSearchResult;
				}
				else{
					return null;
				}
			}
			else{
				return null;
			}
		} catch(get810EDIFileDataErr){
			log.error('get810EDIFileData error: ', get810EDIFileDataErr.message);
		}
	}

	function createInvLines(datafor810InvLines) {
		try{
			var invString = '';
			log.debug('Invoice Data  is ', datafor810InvLines);
			if(datafor810InvLines){
				var headerinfo = datafor810InvLines.header;
				log.debug('Invoice headerinfo  is ', headerinfo);

				var edi810FileStaticInformation = get810EDIFileData();
				log.debug('edi810FileStaticInformation ', edi810FileStaticInformation);
				//log.debug('Line segment id is ', EDI_810_File_Information_Field_Details.EDI_File_Segment_Delimiter);

				if(edi810FileStaticInformation){
					var curSegmentDelimeter  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Segment_Delimiter});
					var curElementDelimeter  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Element_Delimiter});
					var curSubelementDelimeter  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Subelement_Delimiter});

					var curBeginningSegmentHeader = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Beginning_Segment_Header});
					const curTransactionTypeCode = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Type_Code});
					//log.debug('curTransactionTypeCode is ', curTransactionTypeCode);

					var currentTransactionType = headerinfo.values.type.text;
					log.debug('currentTransactionType  is ', currentTransactionType);

					var invTranNumber = headerinfo.values.tranid;
					var invTranDate = headerinfo.values.trandate;
					var curDateObj = new Date();
					var curDateFormatted = formatDateTime(curDateObj, 'CCYYMMDD');
					log.debug('curDateObj is '+ curDateObj, ' curDateFormatted is '+ curDateFormatted);

					var createdFromPONum = headerinfo.values['otherrefnum.createdFrom'];
					var createdFromTranDate = headerinfo.values['trandate.createdFrom'];
					var createdFromTranDateFormatted = formatDateTime(createdFromTranDate, 'CCYYMMDD');

					var transactionTypeCode = '';
					if(!isEmpty(currentTransactionType)){
						if(!isEmpty(curTransactionTypeCode)){
							const curTransactionTypeCodeObj = JSON.parse(curTransactionTypeCode);
							if(currentTransactionType == 'Invoice'){
								transactionTypeCode = curTransactionTypeCodeObj.Invoice;
							}
							else if(currentTransactionType == 'Credit Memo'){
								transactionTypeCode = curTransactionTypeCodeObj.Credit_Memo;
							}
						}
						else{
							if(currentTransactionType == 'Invoice'){
								transactionTypeCode = Transaction_Type_Code.Invoice;
							}
							else if(currentTransactionType == 'Credit Memo'){
								transactionTypeCode = Transaction_Type_Code.Credit_Memo;
							}
						}
					}

					// BIG Segment
					invString += curBeginningSegmentHeader+curElementDelimeter+curDateFormatted+curElementDelimeter+invTranNumber+curElementDelimeter;  // Beginning of BEG Segment
					invString += createdFromTranDateFormatted+curElementDelimeter+createdFromPONum+curElementDelimeter+curElementDelimeter+curElementDelimeter+transactionTypeCode+curSegmentDelimeter;   // End of BEG Segment
					log.debug('invString after BEG Segment is ', invString);

					var curReferenceIdentificationHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Reference_Identification_Header});
					const curReferenceIdentificationQualifier  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Reference_Identification_Qualifier});

					log.debug('curSegmentDelimeter is '+ curSegmentDelimeter+' curElementDelimeter is '+ curElementDelimeter+' curSubelementDelimeter is '+ curSubelementDelimeter, 'curBeginningSegmentHeader is '+ curBeginningSegmentHeader+' curReferenceIdentificationHeader is '+ curReferenceIdentificationHeader+' curReferenceIdentificationQualifier is '+ curReferenceIdentificationQualifier);

					var networkPONumber = headerinfo.values.custbody_edi_network_po_no;
					var createdFromTranNum = headerinfo.values['tranid.createdFrom'];

					var refIDQualifier = '';

					var curReferenceIdentificationQualifierObj = '';
					if(!isEmpty(curReferenceIdentificationQualifier)){
						curReferenceIdentificationQualifierObj = JSON.parse(curReferenceIdentificationQualifier);
					}

					if(!isEmpty(createdFromTranNum)){
						if(!isEmpty(curReferenceIdentificationQualifier)){
							refIDQualifier = curReferenceIdentificationQualifierObj.Member_Order;
						}
						else{
							refIDQualifier = Reference_Identification_Qualifier.Member_Order;
						}

						invString += curReferenceIdentificationHeader +curElementDelimeter+refIDQualifier+curElementDelimeter+createdFromTranNum+curSegmentDelimeter;  // REF Segment
						log.debug('invString after REF Segment is ', invString);
					}

					if(!isEmpty(networkPONumber)){
						if(!isEmpty(curReferenceIdentificationQualifier)){
							refIDQualifier = curReferenceIdentificationQualifierObj.Network_PO;
						}
						else{
							refIDQualifier = Reference_Identification_Qualifier.Network_PO;
						}
						invString += curReferenceIdentificationHeader +curElementDelimeter+refIDQualifier+curElementDelimeter+networkPONumber+curSegmentDelimeter;  // REF Segment
						log.debug('invString after REF Segment is ', invString);
					}

					var curNameHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Name_Header});
					var curEntityIdentifierCode  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Entity_Identifier_Code});
					var curEntityIdentificationCodeQualifier  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Identification_Code_Qualifier});
					var curAdditionalNameInformationHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Additional_Name_Information_Header});
					var curAddressInformationHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Address_Information_Header});
					var curGeographicLocationHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Geographic_Location_Header});
					log.debug('curEntityIdentifierCode is ', curEntityIdentifierCode);
					log.debug('curEntityIdentificationCodeQualifier is ', curEntityIdentificationCodeQualifier);

					var entitySTIdentifierCode = '';
					var entitySFIdentifierCode = '';
					var curEntityIdentifierCodeObj = '';
					if(!isEmpty(curEntityIdentifierCode)){
						curEntityIdentifierCodeObj = JSON.parse(curEntityIdentifierCode);
						entitySTIdentifierCode = curEntityIdentifierCodeObj.Ship_To;
						entitySFIdentifierCode = curEntityIdentifierCodeObj.Ship_From;
					}
					else{
						entitySTIdentifierCode = Entity_Identifier_Code.Ship_To;
						entitySFIdentifierCode = Entity_Identifier_Code.Ship_From;
					}

					var entitySTIdentificationCode = '';
					var entitySFIdentificationCode = '';
					var curEntityIdentificationCodeQualifierObj = '';
					if(!isEmpty(curEntityIdentificationCodeQualifier)){
						curEntityIdentificationCodeQualifierObj = JSON.parse(curEntityIdentificationCodeQualifier);
						entitySTIdentificationCode = curEntityIdentificationCodeQualifierObj.Ship_To;
						entitySFIdentificationCode = curEntityIdentificationCodeQualifierObj.Ship_From;
					}
					else{
						entitySTIdentificationCode = Entity_Identification_Code_Qualifier.Ship_To;
						entitySFIdentificationCode = Entity_Identification_Code_Qualifier.Ship_From;
					}

					var curShipNetworkNumber = headerinfo.values.custbody_address_shiplist_number;
					if(isEmpty(curShipNetworkNumber)){
						curShipNetworkNumber = '';
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
					log.debug('curShipAttention is '+ curShipAttention, ' curShipCountry is '+ curShipCountry);
					invString += curNameHeader+curElementDelimeter+entitySTIdentifierCode+curElementDelimeter+curShipAddresse+curElementDelimeter+entitySTIdentificationCode+curElementDelimeter+curShipNetworkNumber+curSegmentDelimeter;  // ST N1 Segment

					if(curShipAttention){
						invString += curAdditionalNameInformationHeader+curElementDelimeter+curShipAttention+curSegmentDelimeter;  // ST N2 Segment
					}

					if(curShipAddress1){
						curShipAddress1 = curShipAddress1.replace(new RegExp('\\' + curSegmentDelimeter, 'gi'), '');
						curShipAddress1 = curShipAddress1.replace(new RegExp('\\' + curElementDelimeter, 'gi'), '');
						curShipAddress1 = curShipAddress1.replace(new RegExp('\\' + curSubelementDelimeter, 'gi'), '');
						invString += curAddressInformationHeader+curElementDelimeter+curShipAddress1;  // ST N3 Segment
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
							invString += curElementDelimeter+additionalSTAddressInfo;
						}
						invString += curSegmentDelimeter;
					}

					if(curShipCity || curShipState || curShipCountry || curShipZip ){
						invString += curGeographicLocationHeader;  // Beginning of ST N4 Segment
						invString += curElementDelimeter+curShipCity;
						invString += curElementDelimeter+curShipState;
						invString += curElementDelimeter+curShipZip;

						if(curShipCountry ){
							invString += curElementDelimeter+curShipCountry;
						}
						else{
							invString += curElementDelimeter;
						}
						invString += curSegmentDelimeter;				// End of ST N4 Segment
					}

					log.debug('invString after ST N4 Segment is ', invString);

					var curWarehouse = headerinfo.values.location.text;
					var curNetworkWarehouseID = headerinfo.values['custrecord_edi_network_warehouse_num.location'];

					invString += curNameHeader+curElementDelimeter+entitySFIdentifierCode+curElementDelimeter+curWarehouse+curElementDelimeter+entitySFIdentificationCode+curElementDelimeter+curNetworkWarehouseID+curSegmentDelimeter;  // SF N1 Segment
					log.debug('invString after SF N1 Segment is ', invString);

					// DTM Segment
					var curDateTimeHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Date_Time_Header});
					var curDateTimeQualifier  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Date_Time_Qualifier});

					var shippedDateQualifier = '';
					if(!isEmpty(curDateTimeQualifier)){
						var curDateTimeQualifierObj = JSON.parse(curDateTimeQualifier);
						shippedDateQualifier = curDateTimeQualifierObj.Shipped_Date;
					}
					else{
						shippedDateQualifier = Date_Time_Qualifier.Shipped_Date;
					}

					var invShipDate = headerinfo.values.shipdate;
					if(!isEmpty(invShipDate)){
						var invShipDateFormatted = formatDateTime(invShipDate, 'CCYYMMDD');
						log.debug('invShipDate  is '+invShipDate, 'invShipDateFormatted  is '+invShipDateFormatted);
						invString += curDateTimeHeader+curElementDelimeter+shippedDateQualifier+curElementDelimeter+invShipDateFormatted+curSegmentDelimeter;  // DTM Segment
						log.debug('invString after DTM Segment is ', invString);
					}

					// MSG Segment
					var curMessageTextHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Message_Text_Header});

					var createdFromMemo = headerinfo.values['memomain.createdFrom'];
					if(!isEmpty(createdFromMemo)){
						invString += curMessageTextHeader+curElementDelimeter+createdFromMemo+curSegmentDelimeter;  // DTM Segment
						log.debug('invString after MSG Segment is ', invString);
					}

					// IT1 Segment
					var curBaselineItemDataHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Baseline_Item_Data_Header});
					var curItemProductServiceIDQualifier  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Item_Product_Service_ID_Qualifier});

					var curItemProductServiceIDQualifierObj;
					if(!isEmpty(curItemProductServiceIDQualifier)){
						curItemProductServiceIDQualifierObj = JSON.parse(curItemProductServiceIDQualifier);
					}	

					// CTP Segment
					var curPricingInformationHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Pricing_Information_Header});

					// PID Segment
					var curProductItemDescriptionHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Product_Item_Description_Header});
					var curItemDescriptionType  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Item_Description_Type});

					// SAC Related Items List
					var curFreightLineItems  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Freight_Line_Items});
					var curMinimumOrderChargeItems  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Minimum_Order_Charge_Items});
					var curEmergencyOrderItems  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Emergency_Order_Items});
					var curDiscountItems  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Discount_Items});
					var curOtherMiscChargesItems  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Other_Misc_Charges_Items});
					log.debug('curFreightLineItems  is ', curFreightLineItems.length);
					log.debug('curMinimumOrderChargeItems  is ', curMinimumOrderChargeItems.length);
					log.debug('curEmergencyOrderItems  is ', curEmergencyOrderItems);
					log.debug('curDiscountItems  is ', curDiscountItems);
					log.debug('curOtherMiscChargesItems  is ', curOtherMiscChargesItems);

					var itemDetails = datafor810InvLines.lineinfo;
					var totalQuantity = 0;
					var taxItemRate = 0;
					var taxItemAmount = 0;
					var freightItemAmount = 0;
					var freightItemDescription = '';
					var minimumOrderChargeItemAmount = 0;
					var minimumOrderChargeItemDescription = '';
					var emergencyOrderItemAmount = 0;
					var emergencyOrderItemDescription = '';
					var discountItemAmount = 0;
					var discountItemDescription = '';
					var otherMiscChargesItemAmount = 0;
					var otherMiscChargesItemDescription = '';
					log.debug('Invoice itemDetails  is ', itemDetails);
					for (var itemDetailsLen = 0; itemDetailsLen < itemDetails.length; itemDetailsLen++){
						var curItemLineDetails = itemDetails[itemDetailsLen];
						log.debug('curItemLineDetails is ', curItemLineDetails);
						var taxLineFlag = curItemLineDetails.values.taxline;
						
						var curItemID = curItemLineDetails.values.item.value;
						var curItemLineAmount = curItemLineDetails.values.amount;
						var curItemDescription = curItemLineDetails.values.memo;
						if(!isEmpty(curItemDescription)){                                                         // Limiting the Item Description string to 80 characters
							curItemDescription = curItemDescription.replace(new RegExp('\\' + curSegmentDelimeter, 'gi'), '');
							curItemDescription = curItemDescription.replace(new RegExp('\\' + curElementDelimeter, 'gi'), '');
							curItemDescription = curItemDescription.replace(new RegExp('\\' + curSubelementDelimeter, 'gi'), '');
							if(curItemDescription.length > 80){
								curItemDescription = curItemDescription.substring(0, 79);
							}
						}
						log.debug('taxLineFlag is '+taxLineFlag, 'curItemID is '+curItemID);
						
						var sacItemFlag = 'F';
						if(taxLineFlag == 'F'){
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

							if(!isEmpty(curMinimumOrderChargeItems) && sacItemFlag == 'F'){
								var curMinimumOrderChargeItemsArray = curMinimumOrderChargeItems.split(',');
								log.debug('curMinimumOrderChargeItemsArray  is ', curMinimumOrderChargeItemsArray);
								if(curMinimumOrderChargeItemsArray.indexOf(curItemID) != -1){
									minimumOrderChargeItemAmount = parseFloat(minimumOrderChargeItemAmount) + parseFloat(curItemLineAmount);
									minimumOrderChargeItemDescription += curItemDescription;
									sacItemFlag = 'T';
								} 
								log.debug('minimumOrderChargeItemAmount is '+minimumOrderChargeItemAmount, 'minimumOrderChargeItemDescription is '+minimumOrderChargeItemDescription);
							}

							if(!isEmpty(curEmergencyOrderItems) && sacItemFlag == 'F'){
								var curEmergencyOrderItemsArray = curEmergencyOrderItems.split(',');
								log.debug('curEmergencyOrderItemsArray  is ', curEmergencyOrderItemsArray);
								if(curEmergencyOrderItemsArray.indexOf(curItemID) != -1){
									emergencyOrderItemAmount = parseFloat(emergencyOrderItemAmount) + parseFloat(curItemLineAmount);
									emergencyOrderItemDescription += curItemDescription;
									sacItemFlag = 'T';
								} 
								log.debug('emergencyOrderItemAmount is '+emergencyOrderItemAmount, 'emergencyOrderItemDescription is '+emergencyOrderItemDescription);
							}

							if(!isEmpty(curDiscountItems) && sacItemFlag == 'F'){
								var curDiscountItemsArray = curDiscountItems.split(',');
								log.debug('curDiscountItemsArray  is ', curDiscountItemsArray);
								if(curDiscountItemsArray.indexOf(curItemID) != -1){
									discountItemAmount = parseFloat(discountItemAmount) + parseFloat(curItemLineAmount);
									discountItemDescription += curItemDescription;
									sacItemFlag = 'T';
								} 
								log.debug('discountItemAmount is '+discountItemAmount, 'discountItemDescription is '+discountItemDescription);
							}

							if(!isEmpty(curOtherMiscChargesItems) && sacItemFlag == 'F' ){
								var curOtherMiscChargesItemsArray = curOtherMiscChargesItems.split(',');
								log.debug('curOtherMiscChargesItemsArray  is ', curOtherMiscChargesItemsArray);
								if(curOtherMiscChargesItemsArray.indexOf(curItemID) != -1){
									otherMiscChargesItemAmount = parseFloat(otherMiscChargesItemAmount) + parseFloat(curItemLineAmount);
									otherMiscChargesItemDescription += curItemDescription;
									sacItemFlag = 'T';
								} 
								log.debug('otherMiscChargesItemAmount is '+otherMiscChargesItemAmount, 'otherMiscChargesItemDescription is '+otherMiscChargesItemDescription);
							}

							if(sacItemFlag == 'F'){
								var curItemLineNumber = curItemLineDetails.values.linesequencenumber;
								var curItemQuantity = curItemLineDetails.values.quantity;
								var curItemUoM = curItemLineDetails.values.unit;
								log.debug('curItemUoM is ', curItemUoM);
								var curEDIItemUoM = curItemLineDetails.values.custcol_edi_vendor_uofm;
								if(curItemUoM.indexOf('per') != -1){
									var curItemUoMArray = curItemUoM.split(' ');
									var itemUoM = curItemUoMArray[curItemUoMArray.length - 1];
									//log.emergency('itemUoM before is ', itemUoM);
									curItemUoM = itemUoM.toString().charAt(0).toUpperCase() + itemUoM.slice(1);
								}
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
								//log.debug('curEDILineUoM is ', curEDILineUoM);

								var curUPCCode = '';
								var curSAPCode = '';
								var curItemLineSAPNum = curItemLineDetails.values['custcol_edi_item_sap_code'];
								var curItemSAPNum1 = curItemLineDetails.values['custitem_acc_sap_code.item'];
								var curItemSAPNum2 = curItemLineDetails.values['custitem_acc_sap_code2.item'];
								var curItemUPCCode1 = curItemLineDetails.values['upccode.item'];
								var curItemUPCCode2 = curItemLineDetails.values['custitem_acc_upc2.item'];
								log.debug('curItemSAPNum1  is '+curItemSAPNum1, 'curItemSAPNum2  is '+curItemSAPNum2);
								log.debug('curItemUPCCode1  is '+curItemUPCCode1, 'curItemUPCCode2  is '+curItemUPCCode2);
								var curMembersItemNum = curItemLineDetails.values['itemid.item'];

								var curNetworkLegacytemNum ='';
								var curBuyerPartNum ='';
								var curMfgPartNum = curItemLineDetails.values['vendorname.item'];

								var curSAPCode = (curItemLineSAPNum == curItemSAPNum1) ? curItemSAPNum1 : curItemSAPNum2 ;
								var curUPCCode = (curItemLineSAPNum == curItemSAPNum1) ? curItemUPCCode1 : curItemUPCCode2;
								log.debug('curSAPCode  is '+curSAPCode, 'curUPCCode  is '+curUPCCode);
								log.debug('curItemLineNumber is ', curItemLineNumber);

								invString += curBaselineItemDataHeader+curElementDelimeter+curItemLineNumber+curElementDelimeter+curItemQuantity+curElementDelimeter;  //  Beginning of IT1 Segment
								invString += curEDILineUoM+curElementDelimeter+curItemUnitPrice+curElementDelimeter+curElementDelimeter;

								if(!isEmpty(curItemProductServiceIDQualifierObj)){
									invString += curItemProductServiceIDQualifierObj.UPC_Code+curElementDelimeter+curUPCCode+curElementDelimeter+curItemProductServiceIDQualifierObj.Item_SAP_No+curElementDelimeter+curSAPCode;
									invString += curElementDelimeter+curItemProductServiceIDQualifierObj.ACME_Code+curElementDelimeter+curMembersItemNum+curElementDelimeter+curItemProductServiceIDQualifierObj.Network_Legacy_Item_No+curElementDelimeter+curNetworkLegacytemNum;
									invString += curElementDelimeter+curItemProductServiceIDQualifierObj.Buyer_Part_No+curElementDelimeter+curBuyerPartNum+curElementDelimeter+curItemProductServiceIDQualifierObj.Manufacturer_Part_No+curElementDelimeter+curMfgPartNum;
								}
								else{
									invString += Item_Product_Service_ID_Qualifier.UPC_Code+curElementDelimeter+curUPCCode+curElementDelimeter+Item_Product_Service_ID_Qualifier.Item_SAP_No+curElementDelimeter+curSAPCode;
									invString += curElementDelimeter+Item_Product_Service_ID_Qualifier.ACME_Code+curElementDelimeter+curMembersItemNum+curElementDelimeter+Item_Product_Service_ID_Qualifier.Network_Legacy_Item_No+curElementDelimeter+curNetworkLegacytemNum;
									invString += curElementDelimeter+Item_Product_Service_ID_Qualifier.Buyer_Part_No+curElementDelimeter+curBuyerPartNum+curElementDelimeter+Item_Product_Service_ID_Qualifier.Manufacturer_Part_No+curElementDelimeter+curMfgPartNum;
								}
								invString += curSegmentDelimeter;																																																		   //  End of IT1 Segment
								log.debug('invString after  '+itemDetailsLen+' IT1 Segment is ', invString);

								invString += curPricingInformationHeader+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter;  // Beginning of CTP Segment
								invString += curElementDelimeter+curElementDelimeter+curElementDelimeter;
								invString += curItemLineAmount+curSegmentDelimeter;																																												//  End of IT1 Segment

								invString += curProductItemDescriptionHeader+curElementDelimeter+curItemDescriptionType+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter;	 // Beginning of  PID Segment
								invString += curItemDescription+curSegmentDelimeter;																																										 //  End of PID Segment
								log.debug('invString after  '+itemDetailsLen+' PID Segment is ', invString);

								// REF ZZ (Case Pack) Segment
								var curItemCasePackSize = curItemLineDetails.values['custitem_acc_packsize.item'];
								if(!isEmpty(curItemCasePackSize)){
									if(!isEmpty(curReferenceIdentificationQualifier)){
										refIDQualifier = curReferenceIdentificationQualifierObj.Case_Pack;
									}
									else{
										refIDQualifier = Reference_Identification_Qualifier.Case_Pack;
									}

									invString += curReferenceIdentificationHeader+curElementDelimeter+refIDQualifier+curElementDelimeter+curItemCasePackSize+curSegmentDelimeter;  // REF Segment
								}
								log.debug('invString after REF ZZ Segment is ', invString);

								// REF TX (Tax Exempt Flag) Segment
								var curItemLineTaxExemptFlag = 'Y';
								if(!isEmpty(curReferenceIdentificationQualifier)){
									refIDQualifier = curReferenceIdentificationQualifierObj.Tax_Exempt_Flag;
								}
								else{
									refIDQualifier = Reference_Identification_Qualifier.Tax_Exempt_Flag;
								}

								invString += curReferenceIdentificationHeader+curElementDelimeter+refIDQualifier+curElementDelimeter+curItemLineTaxExemptFlag+curSegmentDelimeter;  // REF Segment
								log.debug('invString after REF TX Segment is ', invString);

								// N1 MF (Manufacturer of goods) Segment
								var curItemPreferredVendorID = curItemLineDetails.values['vendor.item'].value;
								if(!isEmpty(curItemPreferredVendorID)){
									var curPreferredVendorObj = record.load({type: 'vendor', id: curItemPreferredVendorID});
									var curManufacturerName = curPreferredVendorObj.getValue('companyname');
									var curManufacturerID = '';

									var itemMFIdentifierCode = '';
									if(!isEmpty(curEntityIdentifierCodeObj)){
										itemMFIdentifierCode = curEntityIdentifierCodeObj.Manufacturer;
									}
									else{
										itemMFIdentifierCode = Entity_Identifier_Code.Manufacturer;
									}

									var itemMFIdentificationCode = '';
									if(!isEmpty(curEntityIdentificationCodeQualifierObj)){
										itemMFIdentificationCode = curEntityIdentificationCodeQualifierObj.Manufacturer;
									}
									else{
										itemMFIdentificationCode = Entity_Identification_Code_Qualifier.Manufacturer;
									}

									invString += curNameHeader+curElementDelimeter+itemMFIdentifierCode+curElementDelimeter+curManufacturerName+curElementDelimeter+itemMFIdentificationCode+curElementDelimeter+curManufacturerID+curSegmentDelimeter;  // MF N1 Segment
								}
								log.debug('invString after N1 MF Segment is ', invString);

								totalQuantity = parseInt(totalQuantity) + parseInt(curItemQuantity);
							}
						}
						else{
							taxItemRate = curItemLineDetails.values.rate;
							taxItemAmount = curItemLineDetails.values.amount;
						}
					}
					log.debug('totalQuantity is ', totalQuantity);

					// TDS Segment
					var curTotalMonetaryValueSummaryHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Total_Monetary_Value_Summary_Header});

					var invTotalAmount = parseFloat(headerinfo.values.amount);
					var curInvoiceObj = record.load({type: headerinfo.recordType, id: headerinfo.id});
					var invSubtotalAmount = parseFloat(curInvoiceObj.getValue('subtotal'));

					invTotalAmount = invTotalAmount.toFixed(2).replace('.', '');
					invSubtotalAmount = invSubtotalAmount.toFixed(2).replace('.', '');
					log.debug('invTotalAmount is '+ invTotalAmount, ' invSubtotalAmount is '+ invSubtotalAmount);
					invString += curTotalMonetaryValueSummaryHeader+curElementDelimeter+invTotalAmount+curElementDelimeter+invSubtotalAmount+curSegmentDelimeter;  //  CTT Segment
					log.debug('invString after TDS Segment is ', invString);

					// TXI Segment
					if(taxItemAmount != 0){
						var curTaxInformationHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Tax_Information_Header});
						var curTaxTypeCode  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Tax_Type_Code});

						var taxTypeCode = ''; 
						if(!isEmpty(curTaxTypeCode)){
							var curTaxTypeCodeObj = JSON.parse(curTaxTypeCode);
							taxTypeCode = curTaxTypeCodeObj.Total_Tax;
						}
						else{
							taxTypeCode = Tax_Type_Code.Total_Tax;
						}

						invString += curTaxInformationHeader+curElementDelimeter+taxTypeCode+curElementDelimeter+taxItemAmount+curElementDelimeter+taxItemRate+curSegmentDelimeter;  //  CTT Segment
					}

					//SAC Segment
					var curServicePromotionAllowanceChargeHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Service_Promotion_Allowance_Charge_Header});
					var curAllowanceChargeIndicator  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Allowance_Charge_Indicator});
					var curServicePromotionAllowanceChargeCode  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Service_Promotion_Allowance_Charge_Code});
					
					var chargeIndicator = '';
					var allowanceIndicator = '';
					if(!isEmpty(curAllowanceChargeIndicator)){
						var curAllowanceChargeIndicatorObj = JSON.parse(curAllowanceChargeIndicator);
						chargeIndicator = curAllowanceChargeIndicatorObj.Charge;
						allowanceIndicator = curAllowanceChargeIndicatorObj.Allowance;
					}
					else{
						chargeIndicator = Allowance_Charge_Indicator.Charge;
						allowanceIndicator = Allowance_Charge_Indicator.Allowance;
					}
					
					var freightCode = '';
					var minOrderChargeCode = '';
					var emergencyOrderCode = '';
					var discountCode = '';
					var otherMiscChargesCode = '';
					if(!isEmpty(curServicePromotionAllowanceChargeCode)){
						var curServicePromotionAllowanceChargeCodeObj = JSON.parse(curServicePromotionAllowanceChargeCode);
						freightCode = curServicePromotionAllowanceChargeCodeObj.Freight;
						minOrderChargeCode = curServicePromotionAllowanceChargeCodeObj.Min_Order_Charge;
						emergencyOrderCode = curServicePromotionAllowanceChargeCodeObj.Emergency_Order;
						discountCode = curServicePromotionAllowanceChargeCodeObj.Discount;
						otherMiscChargesCode = curServicePromotionAllowanceChargeCodeObj.Other_Misc_Charges;
					}
					else{
						freightCode = Service_Promotion_Allowance_Charge_Code.Freight;
						minOrderChargeCode = Service_Promotion_Allowance_Charge_Code.Min_Order_Charge;
						emergencyOrderCode = Service_Promotion_Allowance_Charge_Code.Emergency_Order;
						discountCode = Service_Promotion_Allowance_Charge_Code.Discount;
						otherMiscChargesCode = Service_Promotion_Allowance_Charge_Code.Other_Misc_Charges;
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
					
					// Minimum Order Charge Item 
					if(minimumOrderChargeItemAmount != 0){
						minimumOrderChargeItemAmount = minimumOrderChargeItemAmount.toFixed(2).replace('.', '');
						invString += curServicePromotionAllowanceChargeHeader+curElementDelimeter+chargeIndicator+curElementDelimeter+minOrderChargeCode;      // Adding Charge Indicator as this segment refers to the Minimum Order Charge Item
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+minimumOrderChargeItemAmount;
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter;
						invString += minimumOrderChargeItemDescription+curSegmentDelimeter;                                                          //  SAC Segment
					}
					log.debug('invString after Minimum Order Charge Item: SAC Segment is ', invString);
					
					// Emergency Order Item 
					if(emergencyOrderItemAmount != 0){
						emergencyOrderItemAmount = emergencyOrderItemAmount.toFixed(2).replace('.', '');
						invString += curServicePromotionAllowanceChargeHeader+curElementDelimeter+chargeIndicator+curElementDelimeter+emergencyOrderCode;      // Adding Charge Indicator as this segment refers to the Emergency Order Item
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+emergencyOrderItemAmount;
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter;
						invString += emergencyOrderItemDescription+curSegmentDelimeter;                                                          //  SAC Segment
					}
					log.debug('invString after Emergency Order Item: SAC Segment is ', invString);
					
					// Discount Item 
					if(discountItemAmount != 0){
						discountItemAmount = discountItemAmount.toFixed(2).replace('.', '');
						invString += curServicePromotionAllowanceChargeHeader+curElementDelimeter+allowanceIndicator+curElementDelimeter+discountCode;      // Adding Allowance Indicator as this segment refers to the Discount Item
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+discountItemAmount;
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter;
						invString += discountItemDescription+curSegmentDelimeter;                                                          //  SAC Segment
					}
					log.debug('invString after Discount Item: SAC Segment is ', invString);
					
					// Other Misc Charges Item 
					if(otherMiscChargesItemAmount != 0){
						otherMiscChargesItemAmount = otherMiscChargesItemAmount.toFixed(2).replace('.', '');
						invString += curServicePromotionAllowanceChargeHeader+curElementDelimeter+chargeIndicator+curElementDelimeter+otherMiscChargesCode;      // Adding Charge Indicator as this segment refers to the Other Misc Charges Item
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+otherMiscChargesItemAmount;
						invString += curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter+curElementDelimeter;
						invString += otherMiscChargesItemDescription+curSegmentDelimeter;                                                          //  SAC Segment
					}
					log.debug('invString after Other Misc Charges Item: SAC Segment is ', invString);
					
					// CTT Segment
					var curTransactionTotalsHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Totals_Header});

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

			var edi810FileStaticInformation = get810EDIFileData();
			log.debug('edi810FileStaticInformation ', edi810FileStaticInformation);

			var curEDIFileString = '';
			var curEDIFileName = '';

			if(edi810FileStaticInformation){
				var curInterchangeControlHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Header});
				var curAuthorizationInformationQualifier  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Authorization_Information_Qualifier});
				var curAuthorizationInformationLength = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Authorization_Information_Length});
				var curSecurityInformationQualifier  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Security_Information_Qualifier});
				var curSecurityInformationLength  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Security_Information_Length});
				var curInterchangeIDQualifier  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_ID_Qualifier});
				var curInterchangeSenderID  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Sender_ID});
				var curInterchangeReceiverID  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Receiver_ID});
				var curInterchangeSenderReceiverIDLength  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Sender_Receiver_ID_Length});
				var curInterchangeControlStandardsIdentifier  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Standards_Identifier});
				var curInterchangeControlVersionNumber  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Version_Number});
				var curInterchangeControlNumber  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Number});
				var curInterchangeControlNumberLength  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Number_Length});
				var curAcknowledgmentRequested  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Acknowledgment_Requested});
				var curUsageIndicator  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Usage_Indicator});
				var curInterchangeControlTrailer  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Interchange_Control_Trailer});

				var curSegmentDelimeter  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Segment_Delimiter});
				var curElementDelimeter  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Element_Delimiter});
				var curSubelementDelimeter  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Subelement_Delimiter});

				var curFunctionalGroupHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Functional_Group_Header});
				var curFunctionalIdentifierCode  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Functional_Identifier_Code});
				var curApplicationSendersCode  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Application_Senders_Code});
				var curApplicationReceiversCode  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Application_Receivers_Code});
				var curGroupControlNumber  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Group_Control_Number});
				var curResponsibleAgencyCode  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Responsible_Agency_Code});
				var curReleaseIndustryIdentifierCode  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Version_Release_Industry_Identifier_Code});
				var curFunctionalGroupTrailer  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Functional_Group_Trailer});

				var curTransactionSetHeader  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Set_Header});
				var curTransactionSetIdentifierCode  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Set_Identifier_Code});
				var curTransactionSetControlNumberLength  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Set_Control_Number_Length});
				var curTransactionSetTrailer  = edi810FileStaticInformation[0].getValue({name: EDI_810_File_Information_Field_Details.EDI_File_Transaction_Set_Trailer});

				log.debug('curInterchangeControlHeader is '+ curInterchangeControlHeader+' curInterchangeSenderID is '+ curInterchangeSenderID+' curInterchangeReceiverID is '+ curInterchangeReceiverID, 'curFunctionalGroupHeader is '+ curFunctionalGroupHeader+' curFunctionalIdentifierCode is '+ curFunctionalIdentifierCode+' curTransactionSetHeader is '+ curTransactionSetHeader+' curTransactionSetIdentifierCode is '+ curTransactionSetIdentifierCode);

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
			log.audit('****** ACME MR Send Network Corporate 810 Inv Script Begin ******', '****** ACME MR Send Network Corporate 810 Inv Script Begin ******');

			var network_Corporate_Inv810_Search_ID =  runtime.getCurrentScript().getParameter({name: Network_Corporate_Inv810_SearchId_ScriptField});
			log.debug('Network Corporate Invoice 810 Search ID is ', network_Corporate_Inv810_Search_ID);

			if(network_Corporate_Inv810_Search_ID){
				var network_Corporate_Inv810_Search_Obj = search.load({
					id: network_Corporate_Inv810_Search_ID
				});

				/*var networkCorporateInv810SearchResult = returnSearchResults(network_Corporate_Inv810_Search_ID);
				log.debug('Network Corporate Invoice 810 Search Result ', networkCorporateInv810SearchResult);*/

				if(network_Corporate_Inv810_Search_Obj){
					return network_Corporate_Inv810_Search_Obj;
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
			summary.output.iterator().each(function(key, value) {
				log.debug('key is '+key, 'value is '+value);
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
					//curEDIFileObj.folder = 1525;

					//var edifileid = curEDIFileObj.save();
					//log.debug('edifileid is ', edifileid);
					sftpConnectionUpload(curEDIFileObj);
				}
			}

			/*var ediFileObjArray = new Array();
			for (var key in ediLinesArray) {
				if (supplierEDIData.hasOwnProperty(key)) {
					log.debug('Summarize: ', key + ' -> ' +supplierEDIData[key]);

					var curSupplierEDIFileDetails = createHeaderLines(supplierEDIData[key], key);
					log.debug('Summarize: curSupplierEDIFileDetails is ', curSupplierEDIFileDetails);

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
					}
				}
			}

			log.debug('Summarize: ediFileObjArray is ', ediFileObjArray);
			if(ediFileObjArray.length > 0){
				sftpConnectionUpload(ediFileObjArray);
			}*/

			log.audit('****** ACME MR Send Network Corporate 810 Inv Script End ******', '****** ACME MR Send Network Corporate 810 Inv Script End ******');
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
