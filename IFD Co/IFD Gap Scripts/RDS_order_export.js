nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Aug 2016     Rafe Goldbach,  Suitelaunch LLC For Indianhead Food Distributors Inc.
 * 1.01       26 Apr 2019     Raffy Gaspay,   Fixed the issue on the SuiteScript Error "filters is not defined"
 * 1.02       30 Apr 2019     Raffy Gaspay	  Change the filter id, record type for search record and the internal id. 
 *                                            Save the CSV File created in the File Cabinet
 *
 */
/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function export_orders(request, response) {
    // The purpose of this function is to request a file to be created to represent new and changed orders to be sent to RDS
    // run a saved search to identify which orders needs to be sent (sales and purchase)
    if (request.getMethod() == 'GET') {
        var currentUser = nlapiGetUser();
        //Start Creating the form to display input for recipient and display submit button
        var form = nlapiCreateForm('IFD - RDS Order Export');
      //  form.addResetButton('Reset'); as per Manda 5/20/2019
     //   form.addButton('customcancelbutton', 'Cancel', 'window.close();'); as per Manda 5/20/2019
        form.addSubmitButton('Send Files');

        var recipient = form.addField('custpage_recipient', 'select', 'Email Recipient:', 'employee');
        //subject.setLayoutType('normal','startcol')
        recipient.setLayoutType('normal', 'startcol');
        recipient.setMandatory(true);
        recipient.setDefaultValue(currentUser);
        response.writePage(form);
    }
    if (request.getMethod() == 'POST') {
        var context = nlapiGetContext();
        var usageRemaining = context.getRemainingUsage();
        nlapiLogExecution('debug', 'usage remaining', usageRemaining);
        var recipient = request.getParameter('custpage_recipient');
       
        var sentFrom = nlapiGetUser();
        var today = new Date();
        today = (today.getMonth() + 1) + '/' + today.getDate() + '/' + today.getFullYear();
        var orderList = nlapiSearchRecord('transaction', 'customsearch_rds_order_export');
        var fullOrderList = orderList; //container of the complete result set	
        var loop = 1;
        var arrPoIds = [];
        var arrLandedCosts = [];

        if (orderList) {
            while (orderList.length == 1000) { //re-run the search if limit has been reached
                nlapiLogExecution('debug', 'loop', loop);
                columns = orderList[999].getAllColumns();
                var lastId = orderList[999].getValue(columns[0]); // last internal id
                nlapiLogExecution('debug', 'last id', lastId);
               /* START April 26 2019 : 
                1) Added by Raffy to fix the SuiteScript Error "filters is not defined"
                2) Change the record type id and the saved search id*/
                var filters = [];                
                filters[0] = new nlobjSearchFilter('internalidnumber', null, 'greaterthan', lastId); //create new filter to restrict the next search based on the last record returned	                   
                orderList = nlapiSearchRecord('transaction', 'customsearch_rds_order_export', filters);
                //END
                fullOrderList = fullOrderList.concat(orderList); //add the result to the complete result set
                loop = loop + 1;
                nlapiLogExecution('debug', 'filelength', fullOrderList.length);
            }
        }
        if(fullOrderList){
        	for(var x in fullOrderList){
        		var columns = fullOrderList[x].getAllColumns();
        		arrPoIds.push(fullOrderList[x].getValue(columns[0]));
        	}
        	
        	 nlapiLogExecution('DEBUG', 'PO Internal Ids', arrPoIds + ' PO Ids Number: ' +arrPoIds.length );
        	 
        	 if(arrPoIds){
        		 var arrFilters = [];
 					 arrFilters.push(new nlobjSearchFilter('createdfrom', null, 'anyof', arrPoIds));
        		var IRresults =  getAllResults('','customsearch_itr_ifd_item_receipt_search',arrFilters);
        		
        		if(IRresults){
        			 nlapiLogExecution('DEBUG','Item Receipt Results: ' , JSON.stringify(IRresults));
        			 nlapiLogExecution('DEBUG','Item Receipt Results Length: ',  IRresults.length);
        			for(var w=0; w < IRresults.length; w++){
        				var amount = 0;
        				 var column = IRresults[w].getAllColumns();
        				 amount = IRresults[w].getValue(column[0]);
        				var map = {
        						pointernalid : IRresults[w].getValue(column[1]),
        						landedcostamt : Math.abs(amount),
        						
        						
        				}
        				arrLandedCosts.push(map);				      				
        			}
        			nlapiLogExecution('DEBUG','Landed Costs with PO Id: ',  JSON.stringify(arrLandedCosts));
        		}
        		 
        	 }
        }

        if (fullOrderList) {
            // begin building the header file
            var c = ',';
            var n = '\n';
            var headerBody;
            //var columnHeading = 'HarvestPONumber,CustomerID,CustomerName,ContactName,ContactPhone,ContactEmailAddress,ContactFax,BillingStreet,BillingCity,BillingState,BillingZip,CustomerPONumber,ShipByDate\n';
            var columnHeading = 'DOWNLOAD TYPE,PO NO,ORDERDATE,OWNER CODE,DUE DATE,VENDOR CODE,VENDOR OWNER CODE,BUYER CODE,CONSIGNEE CODE,SKIP,CASES,WEIGHT,PALLETS,CUBE,COST,BRACKET PRICE,ALLOWANCE,HOT,STREAMLINE,PICKUP DATE TIME,COMMENTS,RECEIVED CASES,RECEIVED WEIGHT,RECEIVED PALLETS,RECEIVED CUBE,RECEIVED COST,BUYER ALLOWANCE,RECEIVED BRACKET PRICE,SUPER VENDOR,SKIP,Buyer Comments,ARRIVE DATE TIME,SCHED ARRIVE DATE TIME,ACTUAL PICKUP DATE TIME\n';
            headerBody = columnHeading;
            for (var j = 0; j < fullOrderList.length; j++) {
                var columns = fullOrderList[j].getAllColumns();
                var internalId = fullOrderList[j].getValue(columns[0]) || '';
                var buyerAllowance = 0;
                //Get the appropriate buyer allowance/landed cost amount 52300 Cost of Goods Adjustments : Freight In 56200 Transportation Support : Freight - DFI
               if(arrLandedCosts){
	                for(var p in arrLandedCosts){
	                	if(internalId == arrLandedCosts[p].pointernalid){
	                		buyerAllowance = arrLandedCosts[p].landedcostamt;
	                		nlapiLogExecution('DEBUG','Buyer Allowance: ', buyerAllowance);
	                		break;
	                	}                	
                	}
               }
                
                var DownloadType = isNone(fullOrderList[j].getValue(columns[1]));
	                if(DownloadType=='1'){DownloadType='A';}
	                if(DownloadType=='2'){DownloadType='B';}
	                if(DownloadType=='3'){DownloadType='C';}
	                if(DownloadType=='4'){DownloadType='D';}
                var OrderNum = isNone(fullOrderList[j].getValue(columns[2]));
                var OrderDate = isNone(fullOrderList[j].getValue(columns[3]));
                var OwnerCode = isNone(fullOrderList[j].getValue(columns[4]));
                var DueDate = isNone(fullOrderList[j].getValue(columns[5]));
                
                var VendorCustomerCode = isNone(fullOrderList[j].getValue(columns[6]));               
                var VendorCustomerOwnerCode = isNone(fullOrderList[j].getValue(columns[7]));
                var BuyerCode = isNone(fullOrderList[j].getValue(columns[8]));
                var ConsigneeCode = isNone(fullOrderList[j].getValue(columns[9]));
                var skip1 = isNone(fullOrderList[j].getValue(columns[10]));
                
                var cases =  isNone(Math.round(fullOrderList[j].getValue(columns[11])));
                var weight = isNone(Math.round(fullOrderList[j].getValue(columns[12])));
                var pallets = isNone(fullOrderList[j].getValue(columns[13])) ;
                var cube = isNone(Math.round(fullOrderList[j].getValue(columns[14]))) ;
                var cost = isNone(fullOrderList[j].getValue(columns[15]));
                
                var bracketPrice = isNone(fullOrderList[j].getValue(columns[16]));
                var allowance = isNone(fullOrderList[j].getValue(columns[17]));
                var hot = isNone(fullOrderList[j].getValue(columns[18]));
                var streamLine = isNone(fullOrderList[j].getValue(columns[19]));
                var pickUpDateTime = isNone(fullOrderList[j].getValue(columns[20]));
                
                var comments = isNone(fullOrderList[j].getValue(columns[21]));
                var receivedCases = isNone(Math.round(fullOrderList[j].getValue(columns[22]))) ;
               
                var receivedWeight = isNone(Math.round(fullOrderList[j].getValue(columns[23])));
                var receivedPallets = isNone(fullOrderList[j].getValue(columns[24]));
                
                var receivedCube =isNone( Math.round(fullOrderList[j].getValue(columns[25]))) ;             
                var receivedCost = isNone(fullOrderList[j].getValue(columns[26]));
               // var buyerAllowance = isNone(fullOrderList[j].getValue(columns[27]));              
                var receivedBracketPrice = isNone(fullOrderList[j].getValue(columns[28]));
                var superVendor = isNone(fullOrderList[j].getValue(columns[39]));
                
                var skip2 = isNone(fullOrderList[j].getValue(columns[30]));
                var buyerComments = isNone(fullOrderList[j].getValue(columns[31]));
                var arriveDateTime = isNone(fullOrderList[j].getValue(columns[32]));
                var schedArrivedDate = isNone(fullOrderList[j].getValue(columns[33]));
                var actualPickUpdateTime = isNone(fullOrderList[j].getValue(columns[34]));
              

                headerBody += DownloadType + c + OrderNum + c + OrderDate + c + OwnerCode + c + DueDate + c + VendorCustomerCode + c + VendorCustomerOwnerCode + c +
                    BuyerCode + c + ConsigneeCode + c + skip1 + c + cases + c + weight + c + pallets + c + cube + c + cost + c + bracketPrice + c + allowance + c +
                    hot + c + streamLine + c + pickUpDateTime + c + comments + c + receivedCases + c + receivedWeight + c + receivedPallets + c + receivedCube + c + receivedCost + c + buyerAllowance + c +
                    receivedBracketPrice + c + superVendor + c + skip2 + c + buyerComments + c + arriveDateTime + c + schedArrivedDate + c +actualPickUpdateTime + '\n';
            }
           var folderId =  nlapiGetContext().getSetting('SCRIPT', 'custscript_itr_rds_export_folder');
            nlapiLogExecution('debug', 'headerBody', headerBody);
            nlapiLogExecution('debug', 'folderId', folderId);
            var empName = nlapiLookupField('employee',recipient,'entityid');
            nlapiLogExecution('debug', 'empName', empName);
          
            var dateToday = new Date();
            var dateTime = formatDate(dateToday);
            nlapiLogExecution('debug', 'dateToday', dateToday);
            nlapiLogExecution('debug', 'dateTime', dateTime);
            //Changed the file Name Raffy Gaspay ITR April 30,2019
            var csvName = 'order_file_' + dateTime + '_'+empName +'.csv';
            var orderFile = nlapiCreateFile(csvName, 'CSV', headerBody);           
            orderFile.setEncoding('UTF-8');
            orderFile.setFolder(folderId);
           var csvFileId=  nlapiSubmitFile(orderFile);
           nlapiLogExecution('debug', 'csvFileId', csvFileId);
            nlapiSendEmail(sentFrom, recipient, csvName, 'The export data is attcahed.', null, null, null, orderFile);
           //Set the CSV File to a folder Raffy Gaspay ITR April 30,2019
           
            //loop and mark orders as exported         
            //for (var k = 0; k < fullOrderList.length; k++) {           
            var idBody = 'internalid\n';  
            nlapiLogExecution('DEBUG','Full Order List Length: ' ,fullOrderList.length);
            for (var k = 0; k < fullOrderList.length; k++) {         	
            	var columns = fullOrderList[k].getAllColumns();
                var internalId = fullOrderList[k].getValue(columns[0]);
                //nlapiSubmitField('purchaseorder', internalId, 'custbody_export_rds', 'F');
                idBody += internalId+'\n';       	
            	// see suite answer 29308 regarding using script to run a csv import for a file from the file cabinet
            } 
            nlapiLogExecution('DEBUG','Order Ids: ' ,idBody);
            
            var orderIds = nlapiCreateFile('order_ids.csv', 'CSV', idBody);
            orderIds.setEncoding('UTF-8');           
          //save file to the file cabinet                   
            orderIds.setFolder(folderId);
            var id = nlapiSubmitFile(orderIds);// 20 points  
            var params = {custscript_field_id: id}
            nlapiScheduleScript('customscript_rds_file_update', 'customdeploy_rds_file_update', params);

           
            /*
             * Answer Id: 10618 
             * next call the scheduled script to perform csv import ande delete the files   
            
            sample
             * //schedule the script execution and define script parameter values
            var startDate = new Date();
            var params = {
                custscriptstartdate: startDate.toUTCString(),
                custscriptsubsidiary: 42
                nlapiScheduleScript('customscript_audit_report', 'customdeploy_audit_report_dp', params);
             */
            
            
            }

        var form = nlapiCreateForm('IFD - RDS Order Integration');
        //form.addResetButton('Reset');
        //form.addButton('customcancelbutton', 'Close', 'window.close();');
        var help = form.addField('custpage_help', 'help', 'The email has been sent!');
        if (fullOrderList) {
            var entires = form.addField('custpage_entries', 'help', fullOrderList.length + ' Orders Found.');
        }
        if (!fullOrderList) {
            var entires = form.addField('custpage_entries', 'help', '0 Orders Found.');
        }
        
        /*
         * Answer Id: 10618 
         * next call the scheduled script to perform csv import ande delete the files   
        
        sample
         * //schedule the script execution and define script parameter values
        var startDate = new Date();
        var params = {
            custscriptstartdate: startDate.toUTCString(),
            custscriptsubsidiary: 42
            nlapiScheduleScript('customscript_audit_report', 'customdeploy_audit_report_dp', params);
         */
        
        
        
        
        var context = nlapiGetContext();
        var usageRemaining = context.getRemainingUsage();
        nlapiLogExecution('debug', 'usage remaining', usageRemaining);


        response.writePage(form);

    }

}
function formatDate(date) {
	  var hours = date.getHours();
	  var minutes = date.getMinutes();
	  var ampm = hours >= 12 ? 'pm' : 'am';
	  hours = hours % 12;
	  hours = hours ? hours : 12; // the hour '0' should be '12'
	  minutes = minutes < 10 ? '0'+minutes : minutes;
	  var strTime = hours + ':' + minutes + '_' + ampm;
	  return date.getMonth()+1 + "_" + date.getDate() + "_" + date.getFullYear() + "  " + strTime;
	}

function getAllResults(stRecordType,stSavedSearch,arrFilters,arrColumns)
{    
    var arrResults = [];

    var count = 1000;
    var init  = true;
    var min   = 0;
    var max   = 1000;
    if(stSavedSearch)
    {
        var search = nlapiLoadSearch(stRecordType, stSavedSearch);
        if(arrFilters) search.addFilters(arrFilters);
        if(arrColumns) search.addColumns(arrColumns);
    }
    else
    {
        var search = nlapiCreateSearch(stRecordType, arrFilters, arrColumns);
    }
                                   
    var rs = search.runSearch();
        
    while (count == 1000 || init)
    {        
        var resultSet = rs.getResults(min, max);
        arrResults = arrResults.concat(resultSet);
        min = max;
        max += 1000;

        init  = false;
        count = resultSet.length;
    }

    return arrResults;
}

function isNone(value){
	var thisValue = value;
	if(value == '- None -' || value == null || value == 'N/A' || value == 'ERROR: Field Not Found' || value == 'NaN' || value ==  undefined ){
		thisValue = '';
		
	}
	return thisValue;
	
	
}


	