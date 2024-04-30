/**
 * Version    Date            Author           Remarks
 * 1.00       4/11/2018      Chetan Jumani		   Export the saved search results and create a file in file cabinet
 *
 *@NApiVersion 2.0
 *@NScriptType MapReduceScript
 *@NModuleScope SameAccount
 *@author Chetan Jumani
 */



 define(['N/error', 'N/log', 'N/record', 'N/search', 'N/format', 'N/file', 'N/email','N/runtime','./ifd_noi_lib_Utility'],
 function (error, log, record, search, format, file, email, runtime, common) {



 function getInputData() {
     var d = new Date();
     var n = d.getDay();
     if (n!=1){
       var noiDateFrom = new Date();
       var noiDateFrom = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-1));
       var noiDateTo = noiDateFrom;
 
     }else {
       var noiDateFrom = new Date();
       noiDateFrom = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-3));
       var noiDateTo = new Date();
       noiDateTo = new Date(noiDateTo.setDate(noiDateTo.getDate()-1));
     }
     var FUNC_NAME = "getInputData";
     var errorMessage = "";

     var arrResults = [];
     var arrayAgentFolder = [];

     // Get the required parameter
     var search_noi 	= common.getScriptParameter(common.NOI_SAVED_SEARCH_ID());
     var noiRootFolder = common.getScriptParameter(common.NOI_ROOT_FOLDER());

     // Get the non required parameter
     var noiVendor 	= common.getNonRequiredScriptParameter(common.NOI_VENDOR());
     //var noiAgency = common.getNonRequiredScriptParameter('custscript_ifd_mr_sp_noi_agency');
     //var noiDateFrom = common.getNonRequiredScriptParameter(common.NOI_DATE_FROM());
     //var noiDateTo 	= common.getNonRequiredScriptParameter(common.NOI_DATE_TO());


     //log.debug(FUNC_NAME, 'SEARCH_NOI: ' + search_noi);


     // Load the NOI saved search
     var searchResults = search.load({
             id: search_noi
         });

     if (!common.isNullOrEmpty(noiVendor)) {
         //Changed the use of vendor id filters
         var vendorRec = record.load({
             type:'vendor',
             id: noiVendor
         });
         var vendorId = vendorRec.getValue('entityid');
         //log.debug(FUNC_NAME, 'NOI Vendor: ' + search_noi);
         //Michael - change filter to get NOI vendor on Custom record
         searchResults.filters[searchResults.filters.length] = search.createFilter({
                 name: 'custitem_ifd_noi_vendor',
                 operator: search.Operator.IS,
                 join:'custrecord_item_inv',
                 values: vendorId
             });
     }

     //Commented as script parameter is not required
     /*if (!common.isNullOrEmpty(noiAgency)) {
         searchResults.filters[searchResults.filters.length] = search.createFilter({
                 name: 'vendor',
                 join: 'custentity_ifd_ven_noi_agency',
                 operator: search.Operator.ANYOF,
                 values: noiAgency
             });
     }*/

     if (!common.isNullOrEmpty(noiDateFrom)) {

         var formattedDateFrom = format.format({
                 value: noiDateFrom,
                 type: format.Type.DATE
             });
         //log.debug(FUNC_NAME, 'noiDateFrom: ' + noiDateFrom +'FORMATED noiDateFrom: ' + formattedDateFrom);

         searchResults.filters[searchResults.filters.length] = search.createFilter({
                 name: 'custrecord_itr_noi_report_date', //changed from Transaction Date to Date Created of NOI Transaction record
                 //join: 'custrecord_invoice_num',
                 operator: search.Operator.ONORAFTER,
                 values: formattedDateFrom
             });
     } else {

         noiDateFrom = new Date();
         noiDateFrom.setDate(noiDateFrom.getDate()-7 );

         var formattedDateFrom = format.format({
             value : noiDateFrom ,
             type : format.Type.DATE
         });

         //log.debug(FUNC_NAME, 'noiDateFrom-7: ' + noiDateFrom+ 'FORMATED noiDateFrom: ' + formattedDateFrom);
         log.debug(FUNC_NAME,'Start Date: ' + formattedDateFrom);
         searchResults.filters[searchResults.filters.length] = search.createFilter({
         name : 'custrecord_itr_noi_report_date',
         //join :  'custrecord_invoice_num',
         operator : search.Operator.ONORAFTER,
         values : formattedDateFrom
         });
     }

     if (!common.isNullOrEmpty(noiDateTo)) {

         var formattedDateTo = format.format({
                 value: noiDateTo,
                 type: format.Type.DATE
             });

         log.debug(FUNC_NAME, 'noiDateTo: ' + noiDateTo+'FORMATED noiDateTo: ' + formattedDateTo);

         searchResults.filters[searchResults.filters.length] = search.createFilter({
                 name: 'custrecord_itr_noi_report_date',
                 //join: 'custrecord_invoice_num',
                 operator: search.Operator.ONORBEFORE,
                 values: formattedDateTo
             });
     } else {
         noiDateTo = new Date();
         noiDateTo.setDate(noiDateTo.getDate() -1 );

         var formattedDateTo = format.format({
             value : noiDateTo ,
             type : format.Type.DATE
             });

         //log.debug(FUNC_NAME, 'noiDateTo -1: ' + noiDateTo +'FORMATED noiDateTo: ' + formattedDateTo);
         log.debug(FUNC_NAME,'Start Date: ' + formattedDateTo);
         searchResults.filters[searchResults.filters.length] = search.createFilter({
         name : 'custrecord_itr_noi_report_date',
         //join :  'custrecord_invoice_num',
         operator : search.Operator.ONORBEFORE,
         values : formattedDateTo
         });

     }
     log.debug(FUNC_NAME, 'searchResults.filters: ' + JSON.stringify(searchResults.filters));
     var arrSearchResults = searchResults.run();

     arrResults = common.getMoreResults(arrSearchResults);

     var arrayMap = [];
     if (!common.isNullOrEmpty(arrResults)) {

         log.debug(FUNC_NAME, 'arrResults: ' + arrResults.length
                  + 'arrResults: ' + JSON.stringify(arrResults));

         for (var i = 0; i < arrResults.length; i++) {
             var aResult = arrResults[i];
             //log.debug(FUNC_NAME, 'aResult: ' + JSON.stringify(aResult));

             var distributorLine = aResult.getValue(arrSearchResults.columns[18]);
             var discount = aResult.getValue(arrSearchResults.columns[12]);

             var totalDiscount = pad(13,discount,' ');
             var distrInvLine =	pad(10,distributorLine,' '); // Raffy Gaspay 8/20/2019	 Pad the Distributor Line Invoice

             var resultMap = {
                 noiDateFrom 			: formattedDateFrom,
                 noiDateTo 				: formattedDateTo,
                 recordType				: aResult.recordType,
                 id						: aResult.id,
                 Distributor				: aResult.getValue(arrSearchResults.columns[0]),
                 CustName				: aResult.getValue(arrSearchResults.columns[1]),
                 CustAddress1			: aResult.getValue(arrSearchResults.columns[2]),
                 CustAddress2			: aResult.getValue(arrSearchResults.columns[3]),
                 CustCity				: aResult.getValue(arrSearchResults.columns[4]),
                 RAstate					: aResult.getValue(arrSearchResults.columns[5]),
                 CustZip					: aResult.getValue(arrSearchResults.columns[6]),
                 CustPhone				: aResult.getValue(arrSearchResults.columns[7]),
                 DistributorInvoiceNo	: aResult.getValue(arrSearchResults.columns[8]),
                 DistributorInvoiceDate	: aResult.getValue(arrSearchResults.columns[9]),
                 MPC						: aResult.getValue(arrSearchResults.columns[10]),
                 TotalCase				: aResult.getValue(arrSearchResults.columns[11]),
                 TotalDiscount			: totalDiscount,
                 CustomerNo				: aResult.getValue(arrSearchResults.columns[13]),
                 RecipientAgencyNo		: aResult.getValue(arrSearchResults.columns[14]),
                 catchWeight				: aResult.getValue(arrSearchResults.columns[15]),
                 Misc					: aResult.getValue(arrSearchResults.columns[16]),
                 VendorNumber			: aResult.getValue(arrSearchResults.columns[17]),
                 DistributorInvoiceLine	: distrInvLine,
                 invoiceId				: aResult.getValue(arrSearchResults.columns[19]),
                 itemId					: aResult.getValue(arrSearchResults.columns[20]),
                 recordType				: aResult.getText(arrSearchResults.columns[22]).toLowerCase().replace(/\s/g, ''),

             };

             arrayMap.push(resultMap);
         }
         log.debug(FUNC_NAME,'Search Length: ' + arrayMap.length);
         //log.debug(FUNC_NAME, 'arrayMap: ' + JSON.stringify(arrayMap));
     }else{

         log.audit(FUNC_NAME, 'File cannot be created as there are no Invoice/Credit Memo available '+
                   'for the provided Criteria(Saved Search Results are empty.)');
     }
     return arrayMap;
 }//getinputdata

 function map(context) {
     var FUNC_NAME = 'MAP';
     var searchResult = JSON.parse(context.value);
     var noiDateTo     = searchResult.noiDateTo;
     var noiDateFrom = searchResult.noiDateFrom;
     var noiTestVendor = common.getScriptParameter('custscript_ifd_mr_sp_noi_test_vendor'); //aph
     var errorMessage;
     var uniqueKeyForLogging = 100;
     var docArray = [];
     //log.debug(FUNC_NAME, 'Start');
     //log.debug(FUNC_NAME, 'context.value: ' + context.value);
     try {
         var searchResult = JSON.parse(context.value);
         var vendorId = searchResult.VendorNumber;
         var docId = searchResult.id;
         var recordType = searchResult.recordType;

         noiDateTo = searchResult.noiDateTo;
         noiDateFrom = searchResult.noiDateFrom;
         //log.debug(FUNC_NAME, 'noiDateFrom: '+noiDateFrom+' noiDateTo: '+noiDateTo);

         var resultObject = searchResult;
         //log.debug(FUNC_NAME, 'searchResult: ' + JSON.stringify(searchResult) + 'vendorId: ' + vendorId);
         //Grouping the results by vendor
         context.write(vendorId, resultObject);
         //log.debug(FUNC_NAME, 'MAP COMPLETED');

     } catch (ex) {

         if(common.isNullOrEmpty(vendorId) || vendorId == noiTestVendor)
         {
             errorMessage = 'Error while creating file for Record Type: '+ recordType+' Record Id: '+docId+' Vendor: null and Agency: null Starting Date: ' + noiDateFrom +' Ending Date: ' + noiDateTo +' ' ;
             //log.debug("MAP Error APHMessage: " + errorMessage);
         }
         else
         {
             errorMessage = 'Error while creating file for Record Type: '+ recordType+' Record Id: '+docId+' Vendor: ' + vendorId + ' and Agency: null Starting Date: ' + noiDateFrom +' Ending Date: ' + noiDateTo +' ' ;
         }

         var errorStr = "";
         if(common.isNullOrEmpty(vendorId) || vendorId == noiTestVendor)
             errorStr = 'Error Message: Vendor is null or empty.';
         else
             errorStr = 'Type: ' + ex.type + ' | ' + 'Name: ' + ex.name + ' | ' + 'Error Message: ' + ex.message;

         errorMessage += errorStr;
         log.audit(FUNC_NAME, errorMessage);

         context.write(docId,errorMessage);
         uniqueKeyForLogging++;
     } //catch

 }//map

 function reduce(context) {
     var d = new Date();
     var n = d.getDay();
     if (n!=1){
       // var noiDateFrom = new Date();
      // var noiDateFrom = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-6));
      // var noiDateTo = new Date();
     //  var noiDateTo = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-1));
       var noiDateFrom = new Date();
       var noiDateFrom = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-1));
       var noiDateTo = noiDateFrom;
 
     }else {
       var noiDateFrom = new Date();
       noiDateFrom = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-3));
       var noiDateTo = new Date();
       noiDateTo = new Date(noiDateTo.setDate(noiDateTo.getDate()-1));
     }
       //START Michael - Creation of SubFolder
       var k12SubFolderId,plSubFolderId,otherFolderId;
     var FUNC_DEBUG = 'Global_Folder_creation';
     var noiRootFolder = common.getScriptParameter('custscript_ifd_mr_sp_noi_rootFolder');

      // Creation of  folder name with Ending date
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

         //log.debug(FUNC_DEBUG, 'endDatefolder: ' + endDatefolder);

         // Check if folder already in exist in root folder
         if (!common.isNullOrEmpty(endDatefolder)) {

             var folderExist = common.folderExistCheck(endDatefolder, noiRootFolder);

             log.debug(FUNC_DEBUG, 'folderExist: ' + folderExist);

             if (folderExist) {

                 log.debug(FUNC_DEBUG, 'Folder already Exist');
                 // Get the agency folders id
                 arrfolder = common.getSubfolderId(folderExist);

                 if(!common.isNullOrEmpty(arrfolder)){

                 k12SubFolderId = arrfolder.k12FolderId;
                 plSubFolderId = arrfolder.plFolderId;
                 otherFolderId = arrfolder.otherFolderId;
                 // If any of agency folder does not exist
                     if(common.isNullOrEmpty(k12SubFolderId)){
                         k12SubFolderId = common.createSubfolder(folderExist, common.NOI_AGENCY_K12())

                     }else if (common.isNullOrEmpty(plSubFolderId)){
                         log.debug(FUNC_DEBUG,'Folder Name: ' + common.NOI_AGENCY_PROCESSOR_LINK());
                         plSubFolderId = common.createSubfolder(folderExist, common.NOI_AGENCY_PROCESSOR_LINK())
                     }
                     if(common.isNullOrEmpty(otherFolderId)){
                         log.debug(FUNC_DEBUG,'Folder Name: ' + common.NOI_AGENCY_OTHER());
                         otherFolderId = common.createSubfolder(folderExist, common.NOI_AGENCY_OTHER())
                     }

                 }

             } else {
                 log.debug(FUNC_DEBUG, 'Folder does not exist.');
                 //Create new folders for the new execution
                 arrfolder = common.createFolders(endDatefolder, noiRootFolder);

                 if(!common.isNullOrEmpty(arrfolder)){

                 k12SubFolderId = arrfolder.k12FolderId;
                 plSubFolderId = arrfolder.plFolderId;
                 otherFolderId = arrfolder.otherFolderId;

                 }
             }
         }

         log.debug(FUNC_DEBUG, 'k12SubFolderId: ' + k12SubFolderId + 'plSubFolderId' + plSubFolderId +' otherFolderId:' + otherFolderId);
   //END
     var FUNC_NAME = 'Reduce';
     var vendorArray =[];
     var errorMessage;
     var recordType = "";
     var recordId = "";
     var uniqueKeyForLogging = 0;
     log.debug(FUNC_NAME, 'Start');
     //log.debug(FUNC_NAME, 'xoutside: ' + xoutside);
     var transcationCount = context.values.length;
     log.debug(FUNC_NAME, 'transcationCount: ' + transcationCount);
     //Get the script parameters
     var noiRootFolder = common.getScriptParameter(common.NOI_ROOT_FOLDER());
     var noiplCode     = common.getScriptParameter(common.NOI_PL_CODE());
     var noiK2Code     = common.getScriptParameter(common.NOI_K2_CODE());
     var d = new Date();
     var n = d.getDay();
     if (n!=1){
           // var noiDateFrom = new Date();
          // var noiDateFrom = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-6));
          // var noiDateTo = new Date();
         //  var noiDateTo = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-1));
           var noiDateFrom = new Date();
           var noiDateFrom = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-1));
           var noiDateTo = noiDateFrom;

      }else {
           var noiDateFrom = new Date();
           noiDateFrom = new Date(noiDateFrom.setDate(noiDateFrom.getDate()-3));
           var noiDateTo = new Date();
           noiDateTo = new Date(noiDateTo.setDate(noiDateTo.getDate()-1));
      }
     var noiTestVendor = common.getScriptParameter('custscript_ifd_mr_sp_noi_test_vendor'); //aph

     try {
         if (!common.isNullOrEmpty(noiDateTo)) {
         log.audit(FUNC_NAME, 'FILENAME: 1' );
             var formattedDateTo = format.format({
                     value: noiDateTo,
                     type: format.Type.DATE
                 });
             var endDatefile = common.mmddyy(formattedDateTo);
         } else {
           log.audit(FUNC_NAME, 'FILENAME: 2' );

             var endDatefolder = new Date();
             endDatefolder.setDate(endDatefolder.getDate() - 1);
             var formattedDateTo = format.format({
                     value: endDatefolder,
                     type: format.Type.DATE
                 });
             var endDatefile = common.mmddyy(formattedDateTo);
         }

         //log.debug(FUNC_NAME, 'endDatefolder: ' + endDatefolder );
         var vendorId = context.key;
         var noiAbbrev,
         agency,
         folderId;
         log.debug(FUNC_NAME, 'vendorId: ' + vendorId);
         // Get the Agency and Abbreviation of the vendor
         log.audit(FUNC_NAME, 'FILE TEST: 0');
         var searchVendor = search.load({
                 id: common.NOI_VENDOR_SEARCH()
             });

         searchVendor.filters[searchVendor.filters.length] = search.createFilter({
                 name: 'externalid',
                 operator: search.Operator.IS,
                 values: parseInt(vendorId)
             });

         var searchVendorResults = searchVendor.run();

         searchVendorResults.each(function (result) {
             var abbrev = result.getValue({
                     name: 'custentity_ifd_ven_noi_abbrev'
                 });

             var noiagency = result.getText({
                     name: 'custentity_ifd_ven_noi_agency'
                 });

             noiAbbrev = abbrev;
             agency = noiagency;
         });



         log.debug(FUNC_NAME, 'agency: ' + agency + ' noiAbbrev ' + noiAbbrev);
         //Create a file name as per agency
         //
         var fileName = common.createFileName(noiAbbrev, agency, vendorId, endDatefile, noiK2Code, noiplCode);


         log.debug(FUNC_NAME, 'FILENAME: ' + fileName);
         //log.debug(FUNC_NAME, 'k12SubFolderId: ' + k12SubFolderId + 'plSubFolderId' + plSubFolderId);
         //Get the created folder ID.

         if (agency == common.NOI_AGENCY_K12()) {


             folderId = k12SubFolderId;
         log.audit(FUNC_NAME, 'FOLDER ID:' +folderId );
         } else if (agency == common.NOI_AGENCY_PROCESSOR_LINK()) {

             folderId = plSubFolderId;
         }
         if(agency == common.NOI_AGENCY_OTHER()){
             folderId = otherFolderId;
         }

         var fileAlreadyExistID = common.checkFileExist(folderId, fileName);

         log.debug(FUNC_NAME, 'fileAlreadyExistID: ' + fileAlreadyExistID+ ' fileName: ' + fileName+ ' transactionCount: '+transcationCount);
         var strFile = '';

         var strBody = "";

         var arrNOItransactions = [];

         for (var i = 0; i < transcationCount; i++) {

             //log.debug(FUNC_NAME, 'context.values[' + i + ']: ' + context.values[i]);
             var valueResult = JSON.parse(context.values[i]);
             //log.debug(FUNC_NAME, 'valueResult: ' + valueResult);
             var obj = {
                     Distributor 			: valueResult.Distributor,
                     CustName				: valueResult.CustName,
                     CustAddress1			: valueResult.CustAddress1,
                     CustAddress2			: valueResult.CustAddress2,
                     CustCity				: valueResult.CustCity,
                     RAstate					: valueResult.RAstate,
                     CustZip					: valueResult.CustZip,
                     CustPhone				: valueResult.CustPhone,
                     DistributorInvoiceNo	: valueResult.DistributorInvoiceNo,
                     DistributorInvoiceDate	: valueResult.DistributorInvoiceDate,
                     MPC						: valueResult.MPC,
                     TotalCase				: valueResult.TotalCase,
                     TotalDiscount			: valueResult.TotalDiscount,
                     CustomerNo				: valueResult.CustomerNo,
                     RecipientAgencyNo		: valueResult.RecipientAgencyNo,
                     catchWeight				: valueResult.catchWeight,
                     Misc					: valueResult.Misc,
                     VendorNumber			: valueResult.VendorNumber,
                     DistributorInvoiceLine	: valueResult.DistributorInvoiceLine,
                     invoiceId				: valueResult.invoiceId,
                     itemId					: valueResult.itemId,
                     recordType				: valueResult.recordType,

             }
             arrNOItransactions.push(obj);

         }
          var groupedNOI = groupBy(arrNOItransactions, function(object){
                 return [object.DistributorInvoiceNo,object.MPC,];
               });

         //log.debug(FUNC_NAME,'grouped NOI: ' + JSON.stringify(groupedNOI));

         for(var x in groupedNOI){
             var NOIfields = groupedNOI[x];

             if(!common.isNullOrEmpty(NOIfields)){
                 //log.debug(FUNC_NAME,'length: ' + NOIfields.length);
                 //if there are multiple NOI Records for 1 item
                   if(NOIfields.length > 1){

                       var discount = 0;
                     for(var j in NOIfields){
                          var disc = parseFloat(NOIfields[j].TotalDiscount);
                              discount += disc;
                     }
                     var invoiceId = NOIfields[0].invoiceId;
                     var recordType = NOIfields[0].recordType;
                     var itemId = NOIfields[0].itemId;
                     log.debug(FUNC_NAME,'Transaction Type: ' + recordType);
                     log.debug(FUNC_NAME,'Transaction Id: ' + invoiceId);
                     log.debug(FUNC_NAME,'discount: ' + discount);

                     log.debug(FUNC_NAME,'Item Id: ' + itemId);
                     try{
                         var invoiceRecord = record.load({
                             type: recordType,
                             id: invoiceId,
                         });
                     }catch(err){
                         log.debug(FUNC_NAME,'Error on Loading the Transaction: ' + err);
                     }
                     var lineCount = invoiceRecord.getLineCount({
                         sublistId: 'item',

                     });
                     var quantity = 0;
                     for(var lineid=0; lineid<lineCount; lineid++){
                         var item = invoiceRecord.getSublistValue({
                             sublistId: 'item',
                             fieldId: 'item',
                             line:lineid
                         });
                         var qty = invoiceRecord.getSublistValue({
                             sublistId: 'item',
                             fieldId: 'quantity',
                             line:lineid
                         });
                         if(item == itemId){
                             quantity += qty;
                         }
                     }
                     var totalDiscount = 0;
                     if(discount > 0){
                         totalDiscount = discount.toFixed(2);
                     }
                     var totalQuantity = quantity;
                     if(recordType == 'creditmemo'){
                         totalQuantity =  quantity * -1;
                         if(discount != 0){
                             totalDiscount = discount.toFixed(2);
                         }
                     }

                     log.debug(FUNC_NAME, 'totalDiscount: ' + totalDiscount);
                     log.debug(FUNC_NAME, 'totalQuantity: ' + totalQuantity);
                     NOIfields[0]['TotalCase'] = pad(18,totalQuantity,' ');
                     NOIfields[0]['TotalDiscount'] = pad(13,totalDiscount,' ');
                   }
              }
         }
         //log.debug(FUNC_NAME,'calculated grouped NOI: ' + JSON.stringify(groupedNOI));

         for (var j in groupedNOI) {

             var noiFields = groupedNOI[j];
             //log.debug(FUNC_NAME,'noiFields: ' + JSON.stringify(noiFields));
             strBody += noiFields[0].Distributor + "";
             strBody += noiFields[0].CustName + "";
             strBody += noiFields[0].CustAddress1 + "";
             strBody += noiFields[0].CustAddress2 + "";
             strBody += noiFields[0].CustCity + "";
             strBody += noiFields[0].RAstate + "";
             strBody += noiFields[0].CustZip + "";
             strBody += noiFields[0].CustPhone + "";
             strBody += noiFields[0].DistributorInvoiceNo + "";
             strBody += noiFields[0].DistributorInvoiceDate + "";
             strBody += noiFields[0].MPC + "";
             strBody += noiFields[0].TotalCase + "";
             strBody += noiFields[0].TotalDiscount + "";
             strBody += noiFields[0].CustomerNo + "";
             strBody += noiFields[0].RecipientAgencyNo + "";
             strBody += noiFields[0].catchWeight + "";
             strBody += noiFields[0].Misc + "";
             strBody += noiFields[0].VendorNumber + "";
             strBody += noiFields[0].DistributorInvoiceLine + "" + "\n";

         }
         //log.debug(FUNC_NAME, 'strBody :' + strBody);

         if (common.isNullOrEmpty(fileAlreadyExistID)) {

             var fileObj = file.create({
                     name: fileName,
                     fileType: file.Type.PLAINTEXT,
                     contents: strBody,
                     folder: folderId
                 });
             var fileID = fileObj.save();

         } else {
             file.delete({
                 id: fileAlreadyExistID
             });

             var fileObj = file.create({
                     name: fileName,
                     fileType: file.Type.PLAINTEXT,
                     contents: strBody,
                     folder:  folderId
                 });
             var fileID = fileObj.save();

         }

         //log.debug(FUNC_NAME, 'fileID' + fileID);

     } //end try
     catch (ex) {
         if (common.isNullOrEmpty(noiDateTo)) {
             var endDatefolder = new Date();
             endDatefolder.setDate(endDatefolder.getDate() - 1);
             var noiDateTo = format.format({
                     value: endDatefolder,
                     type: format.Type.DATE
                 });
         }
         if (common.isNullOrEmpty(noiDateFrom)) {
             var endDatefolder = new Date();
             endDatefolder.setDate(endDatefolder.getDate() - 1);
             var noiDateFrom = format.format({
                     value: endDatefolder,
                     type: format.Type.DATE
                 });
         }
         errorMessage = context.values[0].toString();

         log.audit(FUNC_NAME, ex);

         context.write(uniqueKeyForLogging,errorMessage);
         uniqueKeyForLogging++;
     } //catch
     //log.debug(FUNC_NAME, 'REDUCE PROCESS ENDED at --' + Date());
 }//reduce

 function summarize(summary) {
     var FUNC_NAME = 'Summary';
     log.debug(FUNC_NAME, 'SUMMARY PROCESS STARTED at --' + Date());
     handleErrorIfAny(summary);
     log.debug(FUNC_NAME, 'Batch - Process Completed.');
     log.debug(FUNC_NAME, 'SUMMARY PROCESS ENDED at --' + Date());
 }

 function handleErrorIfAny(summary) {

     var FUNC_NAME = 'handleErrorIfAny';
     var reduceKeys =[];
     var inputSummary = summary.inputSummary;
     var mapSummary = summary.mapSummary;
     var reduceSummary = summary.reduceSummary;
     log.debug('Summary: ', JSON.stringify(summary));

     if (inputSummary.error) {
         var e = error.create({
                 name: 'INPUT_STAGE_FAILED',
                 message: inputSummary.error
             });
         log.debug('inputSummary.error: ', JSON.stringify(e));
         handleErrorAndSendNotification(JSON.stringify(e));
         //log.debug('e: ', JSON.stringify(e));
     }

     var FUNC_NAME = 'handleErrorInStage';
     var errorMsg = [];
     var errorNotifMessage = "";
     summary.output.iterator().each(function (key,value){
         log.debug(FUNC_NAME, 'key: '+key);
         log.debug(FUNC_NAME, 'value: '+value);
         errorNotifMessage += value + '\n'+ '\n';
     return true;
     });
     if(!common.isNullOrEmpty(errorNotifMessage))
         handleErrorAndSendNotification(errorNotifMessage)
 }

 function handleErrorInStage(stage, summary) {
     var FUNC_NAME = 'handleErrorInStage';
     var errorMsg = [];
     var errorNotifMessage = "";
     summary.output.iterator().each(function (key,value){
         log.debug(FUNC_NAME, 'key'+key);
         log.debug(FUNC_NAME, 'value'+value);
         errorNotifMessage += value + '\n'+ '\n';
     return true;
     });
     if(!common.isNullOrEmpty(value))
         handleErrorAndSendNotification(value)
 }

 function handleErrorAndSendNotification(value) {
     var FUNC_NAME = 'handleErrorAndSendNotification';
     //send email notification on failure.
     var author = common.getScriptParameter('custscript_ifd_mr_sp_noi_email_author');
     var email_list = common.getScriptParameter('custscript_ifd_mr_sp_noi_email_to_notify');
     log.debug(FUNC_NAME, 'author'+author+'email_list'+email_list);
     var subject = 'NOI reporting Errors'  ;
     var body = 'This email is to notify the error occured in Map/Reduce script :'+' '+ runtime.getCurrentScript().id + '\n'+
                'An error occurred for the following information:'+'\n' +
                ' '+'\n' +
                 value;
     log.debug(FUNC_NAME, 'body'+body);
     email.send({
         author: author,
         recipients: email_list,
         subject: subject,
         body: body
     });
 }
 //This function will pad the strings
 function pad(width, string, padding) {
       return (width <= string.length) ? string : pad(width, padding + string, padding)
     }
  function groupBy( array , f )
     {
       var groups = {};
       array.forEach( function( o )
       {
         var group = JSON.stringify( f(o) );
         groups[group] = groups[group] || [];
         groups[group].push( o );
       });
       return Object.keys(groups).map( function( group )
       {
         return groups[group];
       });
     }


 return {
     getInputData: getInputData,
     map: map,
     reduce: reduce,
     summarize: summarize
 };

});
