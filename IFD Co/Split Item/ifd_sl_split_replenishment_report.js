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
 * @NScriptType Suitelet
 * @author APH
 */
var PAGE_SIZE = 5;
var searchSublist;
var pageSublist;
var objSubtab;
define([
	'N/ui/serverWidget', 
	'N/log', 
	'N/runtime', 
	'N/task', 
	'N/url',
	'N/redirect',
	'N/record',
	'N/file',
	'N/search',
	'N/format',
	'N/http' ],

	function(serverWidget, log, runtime, task, url, redirect, record,file,search,format,http){

		function onRequest(context) {
			try
			{
				 var request = context.request;
				 var response = context.response;
				 var DEBUG_IDENTIFIER = 'onRequest';
				 //getting of script parameter values:
				 var scriptObj = runtime.getCurrentScript();
				 var splitItemSavedSearchFromParam = scriptObj.getParameter({
						name: 'custscript_ifd_param_splititemsearch'
						});
				 var folderIdFromParam = scriptObj.getParameter({
						name: 'custscript_ifd_param_folderid'
						});
				 var c = ',';
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
			         var minutes = newSting( '0' + today.getMinutes());
			     }
			     today = month + '/' + day + '/' + year + '       ' + hour + ':' + minutes + ' ' + amPm;
			     log.debug(DEBUG_IDENTIFIER, 'splitItemSavedSearchFromParam: '+splitItemSavedSearchFromParam+' folderIdFromParam: '+folderIdFromParam+' today: '+today+' day: '+day+' month: '+month+' year: '+year+' hour: '+hour+' amPm: '+amPm+' minutes: '+minutes);
			     
			     //load saved search
			     var splitItemSearch = search.load({
						id: splitItemSavedSearchFromParam
					});
			     var itemResultSet = splitItemSearch.run();
			     var splitItemSearchResult = itemResultSet.getRange({
		                start: 0,
		                end: 999
		                });		   
			     
			     if(splitItemSearchResult.length <= 0)
		    	 {
			    	 var form = serverWidget.createForm({
							title: 'Split Replenishment Report',
							hideNavBar: false
							});
						form.addField({
							id: 'custpage_notification',
							type: serverWidget.FieldType.HELP,
							label: 'There are no split item records to process.'
							});
						log.audit(DEBUG_IDENTIFIER, 'There are no split item records to process.');
						context.response.writePage(form);
						return;
		    	 }
			     
			     //var report = 'Indianhead Foodservice Distributor,,,,Split Replenishment Report,,,,Date: ' + today + '\n\n Split Item, Description, Master Item, Split Pick Bin, Split QOH, Split Pick Bin Max, Cases to Split, Master Cases Avail., Master Pick Face, Per Case Split, Actual Cases Split\n\n';
			     var report = 'Indianhead Foodservice Distributor,,,,Split Replenishment Report,,,,Date: ' + today + '\n\n Split Item, Description, Split Pick Bin, Split QOH, Split Committed Quantity, Split Pick Bin Max, Cases to Split, Master Cases Avail., Master Pick Face, Per Case Split, Master Item, Actual Cases Split\n\n';
			     for (var i = 0; i < splitItemSearchResult.length; i++) 
				 {		    	
			    	var splitItem = splitItemSearchResult[i].getValue(itemResultSet.columns[0]);
			    	var description = splitItemSearchResult[i].getValue(itemResultSet.columns[1]);
			    	var masterItem = splitItemSearchResult[i].getText(itemResultSet.columns[2]);
			    	var splitPickBin = splitItemSearchResult[i].getValue(itemResultSet.columns[3]);
			    	var splitQOH = splitItemSearchResult[i].getValue(itemResultSet.columns[4]);
                    var committedQty= splitItemSearchResult[i].getValue(itemResultSet.columns[5]);
			    	var splitPickBinMax = splitItemSearchResult[i].getValue(itemResultSet.columns[6]);
			    	var casesToSplit = splitItemSearchResult[i].getValue(itemResultSet.columns[7]);
			    	var masterCasesAvail = splitItemSearchResult[i].getValue(itemResultSet.columns[8]);
			    	var masterPickFace = splitItemSearchResult[i].getValue(itemResultSet.columns[9]);
			    	var perCaseSplit = splitItemSearchResult[i].getValue(itemResultSet.columns[10]);
			    	var actualCasesSplit = ' ';
			    	log.debug(DEBUG_IDENTIFIER, 'splitItem: '+splitItem+' description: '+description+' masterItem: ' + masterItem + ' splitPickBin : '
							+ splitPickBin+' splitQOH: '+splitQOH+' splitPickBinMax: '+splitPickBinMax+' casesToSplit: '+casesToSplit+' masterCasesAvail: ' + masterCasesAvail + ' masterPickFace : ' + masterPickFace+' perCaseSplit: '+perCaseSplit+' actualCasesSplit: '+actualCasesSplit+' committedQty: '+committedQty);

			    	//determining cases to split
			    	if(parseInt(casesToSplit) > parseInt(masterCasesAvail))
			    		casesToSplit = masterCasesAvail;
			    	
			    	if(masterCasesAvail > 0)
			    		//report += splitItem + c +description+c+ masterItem + c + splitPickBin + c + splitQOH + c + splitPickBinMax + c + casesToSplit + c + masterCasesAvail + c + masterPickFace+c+perCaseSplit+c+' \n';
			    		report += splitItem + c +description+c + splitPickBin + c + splitQOH +  c + committedQty + c + splitPickBinMax + c + casesToSplit + c + masterCasesAvail + c + masterPickFace+c+perCaseSplit+c+ masterItem + c+' \n';
				 }
			     
			     //creation of csv file:
			     var pickSheetObj = file.create({
			    	    name: 'pickSheet.csv',
			    	    fileType: file.Type.CSV,
			    	    contents: report,
			    	    encoding: file.Encoding.UTF8,
			    	    folder: folderIdFromParam,
			    	    isOnline: true
			    	});
			     var fileId = pickSheetObj.save();
			     log.debug(DEBUG_IDENTIFIER, 'Successfully created file: '+fileId);
			     
			     //redirect to split replenishment report folder
			     redirect.toTaskLink({
			    	    id: 'LIST_MEDIAITEMFOLDER',
			    	    parameters: {'folder':folderIdFromParam} 
			    	});   		     
			}
			catch(ex)
			{
				var errorStr = 'Type: ' + ex.type + ' | ' +
				'Name: ' + ex.name +' | ' +
				'Error Message: ' + ex.message;
				log.error('ERROR', 'Failed to create an Inventory Adjustment record due to: ' + ex.message);
				var form = serverWidget.createForm({
					title: 'Split Replenishment Report',
					hideNavBar: false
					});
				form.addField({
					id: 'custpage_notification',
					type: serverWidget.FieldType.HELP,
					label: 'Failed to create a csv file due to: ' + ex.message
					});
				context.response.writePage(form);
			}
		}

		return {
			onRequest : onRequest
		};
	});