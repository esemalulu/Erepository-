/**
 * Version    Date            Author               Remarks
 * 1.00       4/11/2018      Chetan Jumani		   Utility Function
 *
 *@NApiVersion 2.0
 *@NModuleScope SameAccount
 *@NModuleScope Public
 *@author Chetan Jumani
 */

define(['N/log', 'N/search', 'N/record', 'N/runtime','N/file','N/format'],
	function (log, search, record, runtime,file,format) {
	var common = {};

	
	//Fields
	common.NOI_DATE_TO = function NOI_NOI_DATE_TO() {
		return 'custscript_ifd_mr_sp_noi_date_to';	
	};
	
	common.NOI_DATE_FROM = function NOI_NOI_DATE_FROM() {
		return 'custscript_ifd_mr_sp_noi_date_from';	
	};
	
	common.NOI_VENDOR = function NOI_VENDOR() {
		return 'custscript_ifd_mr_sp_noi_vendor';	
	};
	
	common.NOI_ROOT_FOLDER = function NOI_ROOT_FOLDER() {
		return 'custscript_ifd_mr_sp_noi_rootFolder';	
	};
	
	common.NOI_SAVED_SEARCH_ID = function NOI_SAVED_SEARCH_ID() {
		return 'custscript_ifd_mr_sp_noi_savedsearch';	
	};
	
	common.NOI_PL_CODE = function NOI_PL_CODE() {
		return 'custscript_ifd_mr_sp_noi_pl_code';	
	};
	
	common.NOI_K2_CODE = function NOI_K2_CODE() {
		return 'custscript_ifd_mr_sp_noi_k2_code';	
	};

	
	//Saved searched

	common.NOI_VENDOR_SEARCH = function NOI_VENDOR_SEARCH() {
		return 'customsearch_ifd_noi_vendor_search';
	};
	
	common.NOI_FOLDER_SEARCH = function NOI_FOLDER_SEARCH() {
		return 'customsearch_ifd_noi_folder_name_search';
	};
	
	//Constants
	common.NOI_SEARCH_EMPTY_ERROR = function NOI_SEARCH_EMPTY_ERROR() {
		return 'File cannot be created as there are no Invoice/Credit Memo available'+
		  'for the provided Criteria(Saved Search Results are empty.';
	};
	
	common.NOI_AGENCY_K12 = function NOI_AGENCY_K12() {
		return 'K-12';
	};

	common.NOI_AGENCY_PROCESSOR_LINK = function NOI_AGENCY_PROCESSOR_LINK() {
		return 'Processor Link';
	};
	common.NOI_AGENCY_OTHER = function NOI_AGENCY_OTHER() {
		return 'Other';
	};
	
	// Function to get the script parameters
	common.getScriptParameter = function getScriptParameter(parameterName) {
		var FUNC_NAME = 'getScriptParameter';
		//log.debug(FUNC_NAME, 'Start');
		var paramValue = '';

		require(['N/runtime'], function (runtime) {
			var scriptObj = runtime.getCurrentScript();

			paramValue = scriptObj.getParameter({
					name: parameterName
				});
			return;
		});
		if (common.isNullOrEmpty(paramValue)) {
			//log.debug(FUNC_NAME, 'A script parameter:' + parameterName + ': is null/empty. Please Review script deployment');
			//log.debug(FUNC_NAME, '==================== END Script====================');
			return null;
		} else {
			//log.debug(FUNC_NAME, 'A script parameter: ' + parameterName + ' : ' + paramValue);
		}
		return paramValue;
	}
	
  //Function to get the script parameters
	common.getNonRequiredScriptParameter = function getNonRequiredScriptParameter(parameterName) {
		var FUNC_NAME = 'getNonRequiredScriptParameter';
	//	log.debug(FUNC_NAME, 'Start');
		var paramValue = '';

		require(['N/runtime'], function (runtime) {
			var scriptObj = runtime.getCurrentScript();

			paramValue = scriptObj.getParameter({
					name: parameterName
				});
			return;
		});

		//log.debug(FUNC_NAME, 'A script parameter: ' + parameterName + ' : ' + paramValue);

		return paramValue;
	}

	// function to check null or empty
	common.isNullOrEmpty = function isNullOrEmpty(objVariable) {
		return (objVariable == null || objVariable == "" || objVariable == undefined);
	};

	common.searchRecords = function (stRecordType, stSearchID, arrSearchFilters, arrSearchColumns) {

		var FUNC_NAME = 'searchRecords',
		arrSearchResults = [],
		count = 1000,
		min = 0,
		max = 1000,
		resultSet,
		rs,
		searchObj = null;

		//log.debug(FUNC_NAME, 'Start');

		try {
			if (stSearchID) {
				searchObj = search.load({
						id: stSearchID
					});
				if (arrSearchFilters) {
					searchObj.filters = searchObj.filters
						.concat(arrSearchFilters);
				}
				if (arrSearchColumns) {
					searchObj.columns = arrSearchColumns;
				}
			} else {
				searchObj = search.create({
						type: stRecordType,
						filters: arrSearchFilters,
						columns: arrSearchColumns
					});
			}
			rs = searchObj.run();
			while (count == 1000) {
				resultSet = rs.getRange({
						start: min,
						end: max
					});

				arrSearchResults = arrSearchResults.concat(resultSet);
				min = max;
				max += 1000;
				count = resultSet.length;
			}
			log.debug(FUNC_NAME, 'total search result length: '
				 + arrSearchResults.length);
		} catch (error) {}
		finally {
			if (arrSearchResults && arrSearchResults.length == 0) {
				arrSearchResults = null;
			}
		}
		return (arrSearchResults);
	};

	//Function to convert date to yyymmdd format
	common.yyyymmdd = function yyyymmdd(endDate) {
		var now = new Date(endDate);
		var y = now.getFullYear();
		var m = now.getMonth() + 1;
		var d = now.getDate();
		var mm = m < 10 ? '0' + m : m;
		var dd = d < 10 ? '0' + d : d;
		return '' + y + mm + dd;
	};

	//Function to exist if folder already exist with name "Ending Date"
	common.folderExistCheck = function folderExistCheck(name,folderID) {
		try {
		var FUNC_NAME = 'folderExistCheck';
		var parentFolder ;

		var searchFolder = search.load({
				id: common.NOI_FOLDER_SEARCH()
			});

		searchFolder.filters[searchFolder.filters.length] = search.createFilter({
				name: 'name',
				operator: search.Operator.IS,
				values: name
			});
		var searchFolderResults = searchFolder.run();
	
		searchFolderResults.each(function(result) { 
			var subfolder = result.getValue({
				name: 'parent'
			});
			var idExist = result.getValue({
				name: 'internalid'
			});
				
				log.debug(FUNC_NAME, 'subfolder: ' + subfolder + 'idExist' + idExist);
				if (subfolder == folderID) {					
					var mainfolder = idExist;
					parentFolder = mainfolder;
					log.debug(FUNC_NAME, 'Already exist folder ' + parentFolder);
				}
			});
			return parentFolder;
		
		
		}catch (ex) {
			var errorMessage;
			var errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name + ' | ' + 'Error Message: ' + ex.message;
			errorMessage += errorStr;
			log.debug(FUNC_NAME, errorMessage);
		}

	};
	
	
// Function to get the Existing Folder ID
	common.getfolderId = function getfolderId(name, folderID) {

		var FUNC_NAME = 'getfolderId';

		var searchFolder = search.load({
				id: common.NOI_FOLDER_SEARCH()
			});

		searchFolder.filters[searchFolder.filters.length] = search.createFilter({
				name: 'name',
				operator: search.Operator.IS,
				values: name
			});
		var searchFolderResults = searchFolder.run();

		log.debug(FUNC_NAME, 'searchFolderResults: ' + searchFolderResults.length);
		if (searchFolderResults.length > 0) {
			for (var x = 0; x < searchFolderResults.length; x++) {
				var subfolder = searchFolderResults[x].parent;
				log.debug(FUNC_NAME, 'subfolder: ' + subfolder);
				if (subfolder == folderID) {
					var folderId = searchFolderResults[x].internal;
					return folderId;
				}
			}
		}

	};
	
	//Function to get the ParentFolder i.e subfolder of folder
	
	common.getSubfolderId = function getSubfolderId(rootFolder) {
		try {
		var FUNC_NAME = 'getSubfolderId';
        var arrfolder = [];
		var searchFolder = search.load({
				id: common.NOI_FOLDER_SEARCH()
			});

		searchFolder.filters[searchFolder.filters.length] = search.createFilter({
				name: 'parent',
				operator: search.Operator.IS,
				values: rootFolder
			});
		var k12FolderId;
		var plFolderId ;
		var otherFolderId;
		var searchFolderResults = searchFolder.run();
	
				searchFolderResults.each(function(result) { 
					//log.debug(FUNC_NAME, 'inside search');
					var subfolder = result.getValue({
						name: 'name'
					});	
					var intfolder = result.getValue({
						name: 'internalid'
					});	
					if (subfolder == common.NOI_AGENCY_K12()) {
						k12FolderId = intfolder;
					} else if (subfolder == common.NOI_AGENCY_PROCESSOR_LINK()) {
						plFolderId = intfolder;
					}
					if(subfolder == common.NOI_AGENCY_OTHER()){
						otherFolderId = intfolder;
					}
					return true;
				});
				var folderMap = {
						k12FolderId: k12FolderId,
						plFolderId: plFolderId,
						otherFolderId:otherFolderId,

					};
				log.debug(FUNC_NAME, 'folderMap: ' + JSON.stringify(folderMap));
				return folderMap;
		}catch (ex) {
			var errorMessage;
			var errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name + ' | ' + 'Error Message: ' + ex.message;
			errorMessage += errorStr;
			log.debug(FUNC_NAME, errorMessage);
		}

	};
	
	//Function to get the Existing file name in the agency
	
	common.checkFileExist  = function checkFileExist(folderID,fileName) {
       try{
		var FUNC_NAME = 'checkFileExist';
		var fileId;

		var searchFolder = search.load({
				id: common.NOI_FOLDER_SEARCH()
			});

		searchFolder.filters[searchFolder.filters.length] = search.createFilter({
				name: 'internalid',
				//join: 'file',
				operator: search.Operator.ANYOF,
				values: folderID
			});
		var searchFolderResults = searchFolder.run();

		searchFolderResults.each(function(result) { 
				var existfileName =  result.getValue({
					name: 'name'
				});	
				var file = result.getValue({
					name: 'name',
				    join: 'file'
				});
				log.debug(FUNC_NAME, 'existfileName: ' + existfileName);
				if (existfileName == fileName) {				
					fileId = file;
				}
			});		
		return fileId;
       }catch (ex) {
			var errorMessage;
			var errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name + ' | ' + 'Error Message: ' + ex.message;
			errorMessage += errorStr;
			log.debug(FUNC_NAME, errorMessage);
		}
};

	
// Function to create the new folder ending date and agencies
	common.createFolders = function createFolders(name, folderID) {
		var FUNC_NAME = 'createFolders';
		try {
			log.debug(FUNC_NAME, 'ENter create folder');
			var objDateFolder = record.create({
					type: record.Type.FOLDER,
					isDynamic: true,
				});
			objDateFolder.setValue({
				fieldId: 'parent',
				value: folderID
			});

			objDateFolder.setValue({
				fieldId: 'name',
				value: name
			});
			var dateFolderId = objDateFolder.save();
			log.debug(FUNC_NAME, 'dateFolderId: ' + dateFolderId);
		} catch (ex) {
			var errorMessage;
			var errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name + ' | ' + 'Error Message: ' + ex.message;
			errorMessage += errorStr;
			log.debug(FUNC_NAME, errorMessage);
		}
		if (dateFolderId) {
			try {
				var objK12Folder = record.create({
						type: record.Type.FOLDER,
						isDynamic: true,
					});
				objK12Folder.setValue({
					fieldId: 'parent',
					value: dateFolderId
				});

				objK12Folder.setValue({
					fieldId: 'name',
					value: common.NOI_AGENCY_K12()
				});

				var k12FolderId = objK12Folder.save();
				log.debug(FUNC_NAME, 'k12FolderId: ' + k12FolderId);
				var objPLFolder = record.create({
						type: record.Type.FOLDER,
						isDynamic: true,
					});
				objPLFolder.setValue({
					fieldId: 'parent',
					value: dateFolderId
				});

				objPLFolder.setValue({
					fieldId: 'name',
					value: common.NOI_AGENCY_PROCESSOR_LINK()
				});

				var plFolderId = objPLFolder.save();
				log.debug(FUNC_NAME, 'plId: ' + plFolderId);
				//Create Other folder 09/24/2019
				var objOtherFolder = record.create({
					type: record.Type.FOLDER,
					isDynamic: true,
				});
				objOtherFolder.setValue({
					fieldId: 'parent',
					value: dateFolderId
				});
	
				objOtherFolder.setValue({
					fieldId: 'name',
					value: common.NOI_AGENCY_OTHER()
				});
	
				var otherFolderId = objOtherFolder.save();
				log.debug(FUNC_NAME, 'Other Folder Id: ' + otherFolderId);
				var folderMap = {
					k12FolderId: k12FolderId,
					plFolderId: plFolderId,
					otherFolderId:otherFolderId,

				};
				log.debug(FUNC_NAME, 'folderMap: ' + JSON.stringify(folderMap));
				return folderMap;

			} catch (ex) {
				var errorMessage;
				var errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name + ' | ' + 'Error Message: ' + ex.message;
				errorMessage += errorStr;
				log.audit(FUNC_NAME, errorMessage);
			}
		}

	};
	
	//Function to convert date to mmddyy

	common.mmddyy = function mmddyy(endDate) {
		// Get current date
		var date = new Date(endDate);

		// Format day/month/year to two digits
		var formattedDate = ('0' + date.getDate()).slice(-2);
		var formattedMonth = ('0' + (date.getMonth() + 1)).slice(-2);
		var formattedYear = date.getFullYear().toString().substr(2, 2);

		// Combine and format date string
		var dateString = formattedMonth + formattedDate + formattedYear;

		return dateString;
	};
	
	//Function to create a file name as per vendor and agency

	common.createFileName = function createFileName(noiAbbrev, agency,vendorId,endDatefile,noiK2Code,noiplCode) {
        var FUNC_NAME = "createFileName";
		var fileName;
		var k2Code = common.getScriptParameter(common.NOI_K2_CODE());
		var defaultAgency = "000005473";
		//log.debug(FUNC_NAME,'K2 Code: ' + k2Code);
		log.debug(FUNC_NAME, 'agency: ' + agency +' noiAbbrev '+noiAbbrev +' endDatefile '+endDatefile);
		if (agency == common.NOI_AGENCY_K12()) {
			/*var noiAbbreviation = vendorRec.getValue({
					fieldId: 'custentity_ifd_ven_noi_abbrev'
				});*/
			//fileName = noiAbbrev.toString().trim()   + noiK2Code.toString().trim()  + endDatefile;//09202019 Changed as per Deb<NOI Manufacturer Abbreviate>_"000005473"_<MMDDYYEnd Date>
			//Example: CMV_000005473_090719
			fileName = noiAbbrev.toString().trim()   +'_' +defaultAgency  +'_' + endDatefile;
			log.debug(FUNC_NAME, 'fileName NOI_AGENCY_K12: ' + fileName);

		} else if (agency == common.NOI_AGENCY_PROCESSOR_LINK()) {
			//fileName = vendorId.toString().trim()  + k2Code.toString().trim()  + endDatefile; 08/17/2019 Change as per DEB the format will be NOI Abbreviation + 54703 + End Date
			//fileName = noiAbbrev.toString().trim()  + k2Code.toString().trim()  + endDatefile;
			fileName = noiAbbrev.toString().trim()  +'_' + defaultAgency  +'_' + endDatefile;
			log.debug(FUNC_NAME, 'fileName NOI_AGENCY_PROCESSOR_LINK: ' + fileName);

		}
		if(agency == common.NOI_AGENCY_OTHER()){
			//fileName = vendorId.trim() + k2Code.trim() + endDatefile.trim();
			fileName = noiAbbrev.toString().trim()  +'_' + defaultAgency +'_' + endDatefile;
			log.audit(FUNC_NAME, 'Agency Code value: '+agency+' does not match : '+common.NOI_AGENCY_PROCESSOR_LINK()+' and '+common.NOI_AGENCY_K12() + ' Using vendorId + noiplCode + endDatefile format to create the file: '+fileName );
		}
		fileName.replace(/ /g,'');
		log.audit(FUNC_NAME, 'fileName: ' + fileName);
		return fileName;

	};
	
	//Function to get results more than 1000
	
	common.getMoreResults = function getMoreResults(rs){
		var FUNC_NAME = 'searchRecords',
		arrSearchResults = [],
		count = 1000,
		min = 0,
		max = 1000,
		resultSet,		
		searchObj = null;
		
	try{
	while (count == 1000) {
		resultSet = rs.getRange({
				start: min,
				end: max
			});

		arrSearchResults = arrSearchResults.concat(resultSet);
		min = max;
		max += 1000;
		count = resultSet.length;
	}
	log.debug(FUNC_NAME, 'total search result length: '
		 + arrSearchResults.length);
	} catch (error) {}
	finally {
		if (arrSearchResults && arrSearchResults.length == 0) {
			arrSearchResults = null;
		}
	}
	return (arrSearchResults);
	};
	
	//Function to get Agency Folder ID
	common.getAgencyFolderID = function getAgencyFolderID(noiDateTo,noiRootFolder){
		var arrayAgentFolder = [];
		var FUNC_NAME = 'Global_Folder_creation';
		if (!common.isNullOrEmpty(noiDateTo)) {
			
			var formattedDateTo = format.format({
					value: noiDateTo,
					type: format.Type.DATE
				});
			var endDatefolder = common.yyyymmdd(formattedDateTo);

		} else {
			var endDatefolder = new Date();
			endDatefolder.setDate(endDatefolder.getDate() - 1);
			
			var formattedDateTo = format.format({
					value: endDatefolder,
					type: format.Type.DATE
				});
			var endDatefolder = common.yyyymmdd(formattedDateTo);
		}

		log.debug(FUNC_NAME, 'endDatefolder: ' + endDatefolder);

		// Check if folder already in exist in root folder
		if (!common.isNullOrEmpty(endDatefolder)) {		
			var folderExist = common.folderExistCheck(endDatefolder, noiRootFolder);
			log.debug(FUNC_NAME, 'folderExist: ' + folderExist);
		if (folderExist) {
			log.debug(FUNC_NAME, 'Folder already Exist');
			// Get the agency folders
			arrfolder = common.getSubfolderId(folderExist);		
			arrayAgentFolder.k12FolderId = arrfolder.k12FolderId;
			arrayAgentFolder.plFolderId = arrfolder.plFolderId;
			arrayAgentFolder.otherFolderId = arrfolder.otherFolderId;
	
		} else {			
			log.debug(FUNC_NAME, 'Folder Doesnot Exist');
			//Create new folders for the new execution
			arrfolder = common.createFolders(endDatefolder, noiRootFolder);
			log.debug(FUNC_NAME, 'arrfolder.k12FolderId' + arrfolder.k12FolderId
								+ 'arrfolder.plFolderId' + arrfolder.plFolderId
								+ 'arrfolder.otherFolderId' + arrfolder.otherFolderId
								);
			arrayAgentFolder.k12FolderId = arrfolder.k12FolderId;
			arrayAgentFolder.plFolderId = arrfolder.plFolderId;
			arrayAgentFolder.otherFolderId = arrfolder.otherFolderId;

		}
	}
		return arrayAgentFolder;
	};
	
// Function to get the current vendor full name.	
      
 common.getVendorName = function getVendorName(noiVendor){
		var strName;
		var FUNC_NAME = 'getVendorName';
		var searchVendor = search.load({
					id: common.NOI_VENDOR_SEARCH()
				});
			searchVendor.filters[searchVendor.filters.length] = search.createFilter({
					name: 'custrecord_itr_ifd_noi_vendor',
					operator: search.Operator.IS,
					values: parseInt(noiVendor)
				});
			var searchVendorResults = searchVendor.run();

			searchVendorResults.each(function (result) {
				var venName = result.getValue({
						name: 'entityid'
					});

				var venId = result.getValue({
						name: 'altname'
					});

				if(venId){
					var venstr = venName+' '+ venId ;
					strName = venstr;
				}
				log.debug(FUNC_NAME, 'venId'+venId +'venName'+venName +'venName'+venName);
			});
		return strName;
	};

	// Function create a agency subfolder.
	common.createSubfolder = function createSubfolder(dateFolderId, subfolderName) {
		try {
			var FUNC_NAME = 'createSubfolder';
			var objK12Folder = record.create({
					type: record.Type.FOLDER,
					isDynamic: true,
				});
			objK12Folder.setValue({
				fieldId: 'parent',
				value: dateFolderId
			});

			objK12Folder.setValue({
				fieldId: 'name',
				value: subfolderName
			});

			var FolderId = objK12Folder.save();
			return FolderId;
		} catch (ex) {
			var errorMessage;
			var errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name + ' | ' + 'Error Message: ' + ex.message;
			errorMessage += errorStr;
			log.debug(FUNC_NAME, errorMessage);
		}
	};

	return common;
});