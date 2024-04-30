/**
 * Module Description
 * 
 /**
 * Copyright (c) 2015 IT Rationale, Inc (www.itrationale.com). All rights
 * reserved.
 * 
 * This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.*
 * 
  * Version     Date          Author      Remarks
 * 1.00                       ITR        Initial Development
 * 
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @author APH
 */
var PAGE_SIZE = 5;
var searchSublist;
var pageSublist;
var objSubtab;
var LOC_MAIN_EAU_CLAIRE = 1;
define(['N/ui/serverWidget', 'N/log', 'N/error', 'N/runtime', 'N/task', 'N/url','N/redirect','N/record','N/file','N/search','N/render','N/email','N/format','N/http','./itr_ifd_lib_common'],

	function(serverWidget, log, error, runtime, task, url, redirect, record,file,search,render,email,format,http,common)
	{		
	
		//getting of script parameter values:
		 var scriptObj = runtime.getCurrentScript();
		 var custPalletGroupSavedSearchFromParam = scriptObj.getParameter({
				name: 'custscript_ifd_param_customerpgsearch'
				});
		 var palletGroupSearchFromParam = scriptObj.getParameter({
				name: 'custscript_ifd_param_palletgroupsearch'
				});
		 var folderIdFromParam = scriptObj.getParameter({
				name: 'custscript_ifd_param_pgfolderid'
				});
		 var binLocationSearchFromParam = scriptObj.getParameter({
				name: 'custscript_ifd_param_binlocationsearch'
				});
		 var noPendingTemplateFromParam = scriptObj.getParameter({
				name: 'custscript_ifd_param_nopending_etemp'
				});
		 var reportCompleteTemplateFromParam = scriptObj.getParameter({
				name: 'custscript_ifd_param_reportcomp_etemp'
				});
		 var emailSenderFromParam = scriptObj.getParameter({
				name: 'custscript_ifd_param_emailsender'
				});
		 var emailReceiverFromParam = scriptObj.getParameter({
				name: 'custscript_ifd_param_emailreceiver'
				});
	
		function getInputData(context) {
			var DEBUG_IDENTIFIER = 'getInputData';
			log.debug(DEBUG_IDENTIFIER,'--START--');
			try{				 
				 
				if (isNullOrEmpty(custPalletGroupSavedSearchFromParam) || isNullOrEmpty(palletGroupSearchFromParam) || isNullOrEmpty(folderIdFromParam) || isNullOrEmpty(binLocationSearchFromParam) || isNullOrEmpty(noPendingTemplateFromParam) || isNullOrEmpty(reportCompleteTemplateFromParam) || isNullOrEmpty(emailSenderFromParam) || isNullOrEmpty(emailReceiverFromParam)) {
					//log.debug(DEBUG_IDENTIFIER,'The Missing Pallet Group record saved search is empty. Please set the value of the script parameter.');
					var e = error.create({
					name: 'GETINPUTDATA_STAGE_FAILED',
					message: 'There are missing script parameters. Please set the value of the script parameters.'
					});
					log.error(DEBUG_IDENTIFIER, e.message);
					return true;
				}
				
				var searchResults = common.searchRecords(null,custPalletGroupSavedSearchFromParam,null);	
			
				var arrSearchRes = [];
				
				var map ={};
				
				if(!isNullOrEmpty(searchResults))
				{
					for(var i in searchResults)
					{	
						var searchFields = searchResults[i];
						
							map = {
								customer	 		: searchFields.getValue({name: 'altname', join: 'customer', summary: search.Summary.GROUP}),
								customernumber		: searchFields.getValue({name: 'entityid', join: 'customer', summary: search.Summary.GROUP}),
								palletgroupid		: searchFields.getValue({name: 'custentity_ifd_palletgroupid', join: 'customer', summary: search.Summary.GROUP}),
								itembinnumberid 	: searchFields.getValue({name: 'binnumber', join: 'item', summary: search.Summary.GROUP}),
								itembinnumber 		: searchFields.getText({name: 'binnumber', join: 'item', summary: search.Summary.GROUP}),
								itemid				: searchFields.getValue({name: 'item', join: null, summary: search.Summary.GROUP}),
								itemnumber			: searchFields.getValue({name: 'itemid', join: 'item', summary: search.Summary.GROUP}),
								itemname			: searchFields.getValue({name: 'displayname', join: 'item', summary: search.Summary.GROUP}),
								shipdate			: searchFields.getValue({name: 'shipdate', join: null, summary: search.Summary.GROUP})
						};
						arrSearchRes.push(map);
					}		
					
					
					log.debug(DEBUG_IDENTIFIER,'Search Result: ' + JSON.stringify(arrSearchRes));
				}else{
					log.debug(DEBUG_IDENTIFIER,'No Pallet Group Record has been found for processing!');
					arrSearchRes = [];				
				}
		  
				return arrSearchRes; 
				log.debug(DEBUG_IDENTIFIER,'--END--');
			}
			catch (ex) {
				var errorStr = (ex.getCode != null) ? ex.getCode() + '\n'
						+ ex.getDetails() + '\n' : ex.toString();
				log.debug('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : '
						+ errorStr);
			} 
		}
		
		 /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
	   function map(context) {
			var DEBUG_IDENTIFIER = 'MAP';
			log.debug(DEBUG_IDENTIFIER,'--START--');
			try {
				var parsed = JSON.parse(context.value);
	    		var objFields = parsed;
		    		//log.debug(DEBUG_IDENTIFIER,'ObjFields: ' + JSON.stringify(objFields));
		    	var itemNum = objFields.itemid;
		    		log.debug(DEBUG_IDENTIFIER,'Item Number : ' + itemNum);
		    	
		    	
	    		log.debug(DEBUG_IDENTIFIER,'--END--');
	    		context.write(itemNum,objFields);	
				 
			}
			catch(ex)
			{
				var errorStr = 'Type: ' + ex.type + ' | ' +
				'Name: ' + ex.name +' | ' +
				'Error Message: ' + ex.message;
				log.error('ERROR', 'Failed to create a Missing Customer Pallet Group Ids report due to: ' + ex.message);				
			}
		}//map
	   
 function reduce(context) {
		var DEBUG_IDENTIFIER = 'reduce';
		var FUNC_NAME = 'reduce';	
		var errorMessage;
		var uniqueKeyForLogging = 0;
		var docArray = [];		
		log.debug(FUNC_NAME, 'Start');
		
		try{
			
			var itemNum = context.key;
			var objFields = context.values;
	    
	    	log.debug(FUNC_NAME, 'Obj Fields: ' + JSON.stringify(objFields));
	    	var searchLength = objFields.length;
	    	
	    	log.debug(DEBUG_IDENTIFIER,'Search Length: ' + searchLength);
	    	var scriptObj = runtime.getCurrentScript();
			log.debug(DEBUG_IDENTIFIER,"Remaining governance units: " + scriptObj.getRemainingUsage());
	
	    		    var masterItemProduct = 0;
					var newUnitCost = 0;
					var shipDate = "";
					var withValue = false;						
					var report = '';
					 var c = ',';
					 			    
				
					for(var i in objFields)
					{			
						var palletGroupFields = JSON.parse(objFields[i]);
						var customerName = palletGroupFields.customer;
						var customerNumber = palletGroupFields.customernumber;
						var custPalletGroupId = palletGroupFields.palletgroupid;
						var itemBinNumberId = palletGroupFields.itembinnumberid;
						var itemBinNumber = palletGroupFields.itembinnumber;
						var itemId = palletGroupFields.itemid;
						var itemNumber = palletGroupFields.itemnumber;
						var itemName = palletGroupFields.itemname;
						shipDate = palletGroupFields.shipdate;
					
						
						log.debug(DEBUG_IDENTIFIER, 'custPalletGroupId: '+custPalletGroupId+' customerName: '+customerName+' customerNumber: '+customerNumber+' itemBinNumber: '+itemBinNumber+' itemId: '+itemId+' itemNumber: '+itemNumber+' itemName: '+itemName+' itemBinNumberId: '+itemBinNumberId+' shipDate: '+shipDate);
						
											
						//removal of non Main Eau Claire Preferred Bin
						var binLocation = " ";
						log.debug(DEBUG_IDENTIFIER,'itemBinNumberId: ' + itemBinNumberId);
						if (!isNullOrEmpty(itemBinNumberId) && itemBinNumberId != "- None -")
						{
							var binLocationSearch = search.load({
							id: binLocationSearchFromParam
							});
							var binNumberFilter = search.createFilter({
							name: 'binnumber',
							operator: search.Operator.IS,
							values: itemBinNumberId
							});
							binLocationSearch.filters.push(binNumberFilter);
							var binLocationSearchResult = binLocationSearch.run();
							binLocationSearchResult.each(function(result) {
								//log.debug(DEBUG_IDENTIFIER, 'Bin Number: '+itemBinNumberId+' location is Main EAU Claire.');
								binLocation = LOC_MAIN_EAU_CLAIRE;
							});	
							if(binLocationSearchResult.length <= 0)
							{
								binLocation = " ";
							}						
						}					
						log.debug(DEBUG_IDENTIFIER, 'binLocation: '+binLocation+' for Bin Number: '+itemBinNumberId);
						
						//load pallet group saved search
						var arrFilters = []; 
						
						var palletGroupIdFilter = search.createFilter({
						name: 'custrecord_ifd_palletgroupfield',
						operator: search.Operator.IS,
						values: custPalletGroupId
						});
						arrFilters.push(palletGroupIdFilter);
						var palletGroupItemIdFilter = search.createFilter({
						name: 'custrecord_ifd_palletgroupitem',
						operator: search.Operator.IS,
						values: itemId
						});
						arrFilters.push(palletGroupItemIdFilter);
						
						var palletGroupSearchResult = common.searchRecords(null,palletGroupSearchFromParam,arrFilters,null);					
						log.debug(DEBUG_IDENTIFIER, 'palletGroupSearchResult.length: '+palletGroupSearchResult.length);
						
						if(!isNullOrEmpty(palletGroupSearchResult))
						{
							for(var i in palletGroupSearchResult)
							{
								log.debug(DEBUG_IDENTIFIER, 'Pallet Group: '+custPalletGroupId+' and item: '+itemNumber+' do exist. No need to include in the report.');
							}						
						}
						else if(palletGroupSearchResult.length == 0 && (binLocation == LOC_MAIN_EAU_CLAIRE || itemBinNumberId == "- None -"))
						{
							log.debug(DEBUG_IDENTIFIER, 'Pallet Group: '+custPalletGroupId+' and item: '+itemNumber+' do NOT exist. To be included in the report.');
							report += customerNumber + c +customerName+c + custPalletGroupId + c +itemBinNumberId + c +itemNumber + c+itemName + c+' \n';
							withValue = true;
						}
						else
							log.debug(DEBUG_IDENTIFIER, 'OTHER CASE: Pallet Group: '+custPalletGroupId+' and item: '+itemNumber);
					}
					 
					log.debug(DEBUG_IDENTIFIER,'report: ' + report);
					if(isNullOrEmpty(report)){
						report = 'false';
					}
					log.debug(DEBUG_IDENTIFIER,'report1: ' + report);
					 context.write(shipDate,report);
			
		}catch(ex){
			var errorStr = 'Type: ' + ex.type + ' | ' +
			'Name: ' + ex.name +' | ' +
			'Error Message: ' + ex.message;
			log.error('ERROR', 'Failed to create a Missing Customer Pallet Group Ids report due to: ' + ex.message);				
		}
	}
		
		 /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
    	var DEBUG_IDENTIFIER = 'SUMMARY';
    	var type = summary.toString();
		var outputValue = false;		
		var shipDate = '';
		var today = new Date();
	     var day = today.getDate();
	     var month = (today.getMonth()) + 1;
	     var year = today.getFullYear();
	     var hour = parseInt(today.getHours()) + 2;
	     var amPm = 'AM';
	     if (hour >= 13) {
	         hour = hour - 12;
	         amPm = 'PM';
	     }
	     if(hour == 12)
	    	 amPm = 'PM';
	     var minutes = today.getMinutes();
	     if (minutes.length == 1) {
	         var minutes = new String( '0' + today.getMinutes());
	     }
	     if(minutes == '0'){
	    	 minutes = '00';
	     }
	     today = month + '/' + day + '/' + year + '       ' + hour + ':' + minutes + ' ' + amPm;
	     log.debug(DEBUG_IDENTIFIER, 'palletGroupSearchFromParam: '+palletGroupSearchFromParam+' folderIdFromParam: '
	    		 +folderIdFromParam+' binLocationSearchFromParam: '
	    		 +binLocationSearchFromParam+' noPendingTemplateFromParam: '
	    		 +noPendingTemplateFromParam+' reportCompleteTemplateFromParam: '
	    		 +reportCompleteTemplateFromParam+' emailSenderFromParam: '
	    		 +emailSenderFromParam+' today: '+today+' day: '+day+' month: '+month+' year: '+year+' hour: '
	    		 +hour+' amPm: '+amPm+' minutes: '+minutes);
    	
    	 var report = 'Indianhead Foodservice Distributor,,,,Missing Customer Pallet Group Records Report,,,,Date: ' + today + '\n\n Customer Number, Customer Name, Pallet Group ID, Preferred Bin, Item #, Item Name\n\n';
    	
    	if (summary.inputSummary.error){
    		log.error('Input Error', summary.inputSummary.error);
    	
    		summary.mapSummary.errors.iterator().each(function (key, error){
    			log.error('Map Error for key: ' + key, error);
    			return true;
    		});
    	}
    	else{	
			summary.output.iterator().each(function (key,value){
						//log.debug('summary', 'key: '+key);
						//log.debug('summary', 'value: '+value);
						 if(value == 'false'){
							 value = '';
						 }
						shipDate = key;
						report += value;
						//log.debug('summary', 'Report: '+report);
						if(!common.isNullOrEmpty(value)){
							 outputValue = true;
						 }
						
					return true;
					});	
			log.debug(DEBUG_IDENTIFIER, 'shipDate: '+shipDate);
			log.debug(DEBUG_IDENTIFIER, 'report value: '+report);
			 var reportName = 'missingPalletGroupsReport_'+shipDate+'.csv';
		     var pickSheetObj = file.create({
		    	    name: reportName,
		    	    fileType: file.Type.CSV,
		    	    contents: report,
		    	    encoding: file.Encoding.UTF8,
		    	    folder: folderIdFromParam,
		    	    isOnline: true
		    	});
		     var fileId = pickSheetObj.save();
		     log.debug(DEBUG_IDENTIFIER, 'Successfully created file: '+fileId);
		     
		     //redirect to pallet sequencing folder
		     redirectURL = redirect.toTaskLink({
		    	    id: 'LIST_MEDIAITEMFOLDER',
		    	    parameters: {'folder':folderIdFromParam}
		    	});
		    
		    	 sendEmail(outputValue);	
		    	 
		    	 log.audit(type + ' Usage Consumed', summary.usage);
		     	log.audit(type + ' Concurrency Number ', summary.concurrency);
		     	log.audit(type + ' Number of Yields', summary.yields);
			log.debug(type ,' Map/Reduce Script Run  Successfully!');
    	}
    }
    function isNullOrEmpty(checkValue) {
		return (checkValue == null || checkValue == "" || checkValue == undefined);
	}
	
	function sendEmail(withValue){
			var DEBUG_IDENTIFIER = 'sendEmail';
			var scriptObj = runtime.getCurrentScript();
			var receiver = runtime.getCurrentUser().id;
			var receiverEmail = receiver.email;
			var emailTemplateParam = "";
						
			var noPendingTemplateFromParam = scriptObj.getParameter({
					name: 'custscript_ifd_param_nopending_etemp'
						});
			var reportCompleteTemplateFromParam = scriptObj.getParameter({
					name: 'custscript_ifd_param_reportcomp_etemp'
						});
			var emailSenderFromParam = scriptObj.getParameter({
					name: 'custscript_ifd_param_emailsender'
						});
			var emailReceiverFromParam = scriptObj.getParameter({
						name: 'custscript_ifd_param_emailreceiver'
						});
			
			if(withValue)
			{
				emailTemplateParam = reportCompleteTemplateFromParam;
			}
			else
			{
				emailTemplateParam = noPendingTemplateFromParam;
			}
			
			var entityRecValue = null;
			  if(!isNullOrEmpty(receiver)){
				entityRecValue = {
				  'type':'employee',
				  'id' : parseInt(receiver)
				};
			  }
			  
			  log.debug(DEBUG_IDENTIFIER,'emailReceiverFromParam: '+emailReceiverFromParam+' receiverEmail: '+receiverEmail+' noPendingTemplateFromParam: '+noPendingTemplateFromParam+' reportCompleteTemplateFromParam: '+reportCompleteTemplateFromParam+' emailSenderFromParam: '+emailSenderFromParam+' withValue: '+withValue);
			  
			  var emailTemp = render.mergeEmail({
				templateId: emailTemplateParam,
				entity: entityRecValue,
				recipient: null,
				supportCaseId: null,
				transactionId: null,
				customRecord: null
			  });
			  var subj = emailTemp.subject;
			  //var body = 'Dear ' + emailToName[0].substring(1) + emailTemp.body;
			  body = emailTemp.body;
			  
			  log.debug(DEBUG_IDENTIFIER,'Email Subject: '+subj);
			  log.debug(DEBUG_IDENTIFIER,'Email Body: '+body);
			  try{
				email.send({author: emailSenderFromParam,recipients: emailReceiverFromParam,subject: subj,body: body,attachments: null,relatedRecords: null});
				log.audit('DEBUG','Email Already sent to the customer.');
			  }
			  catch(ex){
				var errorStr = (ex.getCode != null) ? ex.getCode() + '\n' + ex.getDetails() + '\n' : ex.toString();
				log.error('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : ' + errorStr);
			  }
		}

		return {
			getInputData: getInputData,
			map: map,
			reduce:reduce,
			summarize: summarize
		};
		
	});