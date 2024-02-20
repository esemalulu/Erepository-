/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 * @NModuleScope public
 */

/*
Name                : GD_MR_ExportHistoricalCases.js
Purpose             : To export Historical Case Records into JSON Files
Created On          : 21 Oct 2022
Author              : Dileep
Script Type         : Map Reduce
 */

define(['N/record', 'N/search', 'N/runtime', 'N/format','N/file'],
		function (record, search, runtime, format, file) {

	var caseFieldIDsArray = [
	                         "type",
	                         "id",
	                         "externalid",
	                         "version",
	                         "companyid",
	                         "contactid",
	                         "companyname",
	                         "escalationmessage",
	                         "customform",
	                         "templatestored",
	                         "eventnumber",
	                         "origcasenumber",
	                         "stage",
	                         "isinactive",
	                         "messagesave",
	                         "htmlmessage",
	                         "incomingmessage",
	                         "datecreated",
	                         "timeelapsed",
	                         "timeonhold",
	                         "timeopen",
	                         "timetoassign",
	                         "timetoclose",
	                         "initialresponsetime",
	                         "lastcustomermessagereceived",
	                         "supportfirstreply",
	                         "firstupdated",
	                         "baserecordtype",
	                         "custevent_flo_process",
	                         "custevent_extend_files_uploadon_record",
	                         "casenumber",
	                         "custeventgd_caseproductioncompletedate",
	                         "custeventgd_caseretailsolddate",
	                         "custeventgd_caseretailcustname",
	                         "custeventgd_retailcustomerphone",
	                         "custeventgd_retailcustomeremail",
	                         "custeventgd_case_contactinformation",
	                         "enddate",
	                         "profile",
	                         "contact",
	                         "email",
	                         "phone",
	                         "priority",
	                         "lastreopeneddate",
	                         "quicknote",
	                         "startdate",
	                         "starttime",
	                         "item",
	                         "category",
	                         "issue",
	                         "origin",
	                         "createddate",
	                         "lastmodifieddate",
	                         "lastmessagedate",
	                         "custevent_flo_process_issue",
	                         "custeventinternal_case_notes",
	                         "messagenew",
	                         "outgoingmessage",
	                         "newsolutionfrommsg",
	                         "emailform",
	                         "internalonly",
	                         "emailemployees",
	                         "useemployeetemplate",
	                         "custevent_flo_customization",
	                         "custpage_statusdictionary",               
	                         ];

	var listFieldsArray = [
	                       "title",
	                       "status",
	                       "custeventgd_followupdate",
	                       "custeventgd_vinnumber",
	                       "custeventgd_caseseries",
	                       "custeventgd_casemodel",
	                       "custeventgd_retailcustomer",
	                       "assigned",
	                       "custeventgd_contacttype",
	                       "custeventgd_caseaddressedto",
	                       "custeventgd_complaint",
	                       "custeventgd_casetreadcode",
	                       "custeventgd_nhtsaaggregatetype",
	                       "custeventgd_casecause",
	                       "custeventgd_casecorrection",
	                       "custeventgd_casedetails",
	                       "custeventgd_createdby",
	                       "custeventgd_case_lastmodifiedby",
	                       "company",
	                       ];

	function GetInputData() {

		log.debug('In get Input Data','In Get Input Data!');

		var currentScript = runtime.getCurrentScript();

		//GET THE SAVED SEARCH ID FROM PARAMETER
		var savedSearchID = currentScript.getParameter({
			name: "custscript_gd_exp_hist_cases_ss_id"
		});

		if (!savedSearchID) {
			throw "Saved Search Id missing in Parameter";
		}

		//Load the Saved Search
		var searchObj = search.load({
			id: savedSearchID
		});

		return searchObj;

	}

	function Map(context) {

		try {
			log.debug('Context In Map','Context In Map::'+JSON.stringify(context));
			var contextValue = JSON.parse(context.value);
			var values = contextValue.values;
			log.debug('In Map','In Map::'+JSON.stringify(values));

			context.write(context.key, values);

		} catch (ex) {
			log.debug('Error in Map():', ex);

		}
	}

	function Reduce(context) {

		//try {
			var resultset = JSON.parse(context.values[0]);
			resultset = resultset.values;

			//log.debug('In Reduce','In Reduce::'+JSON.stringify(resultset));

			var caseID = resultset.internalid.value;

			log.debug('In Reduce','Processing Case::'+caseID);

			//LOAD THE CASE RECORD
			var caseRecord = record.load({type: 'supportcase', id: caseID});

			var eachCaseObject = {};

			//Loop through the Case Fields Array
			for(var i=0; i<caseFieldIDsArray.length;i++) {

				var fieldValue = caseRecord.getValue(caseFieldIDsArray[i]);
				//log.debug('Field Value','Field Value::'+caseFieldIDsArray[i] + '||' + fieldValue);

				if(fieldValue!=null && fieldValue!='' && fieldValue!=undefined) {
					eachCaseObject[caseFieldIDsArray[i]] = fieldValue;
				}else {
					eachCaseObject[caseFieldIDsArray[i]] = null;
				}

			}//END OF FOR LOOP - CASE FIELDS ARRAY


			//Loop through the List Fields Array
			for(var j=0; j<listFieldsArray.length;j++) {

				var fieldValue = caseRecord.getValue(listFieldsArray[j]);

				if(fieldValue!=null && fieldValue!='' && fieldValue!=undefined) {

					var fieldText =  caseRecord.getText(listFieldsArray[j]);

					eachCaseObject[listFieldsArray[j]] = {"id" : fieldValue, "text": fieldText };
				}else {
					eachCaseObject[listFieldsArray[j]] = null;
				}

			}//END OF FOR LOOP - LIST FIELDS ARRAY

			//GET MESSAGE DETAILS ATTACHED TO OBJECT
			eachCaseObject = getMessageDetails(caseID, eachCaseObject);

			//GET FILE DETAILS ATTACHED TO OBJECT
			eachCaseObject = getFileDetails(caseID, eachCaseObject);

			context.write('caseobject', eachCaseObject);

		/*}
		catch(e) {
			log.debug('Error in Reduce()','Error in Reduce()::'+e);
		}*/

	}



	function Summarize(summary) {

		try {
			log.debug('In Summarize','In Summarize!');
			var currentScript = runtime.getCurrentScript();

			//GET THE SAVED SEARCH ID FROM PARAMETER
			var savedSearchID = currentScript.getParameter({
				name: "custscript_gd_exp_hist_cases_ss_id"
			});

			if (!savedSearchID) {
				throw "Saved Search Id missing in Parameter";
			}

			//GET THE FILE INDEX FROM PARAMETER
			var fileIndex = currentScript.getParameter({
				name: "custscript_gd_exp_hist_cases_fileindex"
			});
			if (!fileIndex) {
				throw "File Index missing in Parameter";
			}

			//GET THE FOLDER ID FROM PARAMETER
			var folderID = currentScript.getParameter({
				name: "custscript_gd_exp_hist_cases_folderid"
			});
			if (!folderID) {
				throw "Folder ID missing in Parameter";
			}

			var searchObj = search.load({
				id: savedSearchID
			});

			var totalCount  = searchObj.runPaged().count;
			log.debug('No Of Results in Search','No Of Results in Search::'+totalCount);
			
			var errorCount = 0;
			
			summary.reduceSummary.errors.iterator().each(function(key, value) {
	    		
				log.debug('Reduce Error',JSON.parse(value));
				
				errorCount++;
				
	    		return true;
	    		});


			var allCaseDetailsArray = []; var count = 0;

			summary.output.iterator().each(function (key, value) {
				//log.debug('Key','Key:'+key);
				//log.debug('Value','Value:'+JSON.stringify(value));

				allCaseDetailsArray.push(JSON.parse(value));

				var content = JSON.stringify(allCaseDetailsArray);
				

				count++;
				log.debug('Case Count','Case Count::'+count + '  || File Size::'+ content.length);

				if (content.length > 8388608) { //9437184-9MB // 8388608-8MB
					log.debug('File Size','File Size::'+content.length);
					var fileObj = file.create({
						name:  'CaseDetails_'+ fileIndex,
						fileType: file.Type.JSON,
						contents: content
					});
					fileObj.folder = folderID;
					var fileId = fileObj.save();
					log.debug('File Created','File Created:'+fileId);

					allCaseDetailsArray = [];

					fileIndex++;

					log.debug('Remaining Usage Limit','Remaining Usage Limit::'+runtime.getCurrentScript().getRemainingUsage());

				}//END OF IF - FILE SIZE
				else if((count == totalCount) || (errorCount + count == totalCount)) {
					log.debug('File Size','File Size::'+content.length);
					log.debug('Processing last Case','Processing Last Case::'+count)
					var fileObj = file.create({
						name:  'CaseDetails_'+ fileIndex,
						fileType: file.Type.JSON,
						contents: content
					});
					fileObj.folder = folderID;
					var fileId = fileObj.save();
					log.debug('File Created','File Created:'+fileId);
				}

				return true;
			});//END OF LOOP - ITERATOR


		} catch (err) {
			log.debug("Summarize", err);
		}
		log.debug('Remaining Usage Limit','Remaining Usage Limit::'+runtime.getCurrentScript().getRemainingUsage());

		log.debug('Map / Reduce END', new Date());
	}

	function getMessageDetails(caseID, eachCaseObject) {
		try {

			eachCaseObject.messages = [];

			var supportcaseSearchObj = search.create({
				type: "supportcase",
				filters:
					[
					 ["internalid","anyof",caseID], 
					 "AND", 
					 ["messages.messagetype","anyof","EMAIL"]
							 ],
					columns:
						[
						 search.createColumn({
							 name: "internalid",
							 join: "messages",
							 summary: "GROUP",
							 sort: search.Sort.ASC,
							 label: "Internal ID"
						 })
						 ]
			});
			var searchResultCount = supportcaseSearchObj.runPaged().count;
			//log.debug("Messages Result count",searchResultCount);

			supportcaseSearchObj.run().each(function(result){

				/*var messageAuthor = result.getValue({name: "messageauthor", label: "Message Author"});
					var mesageDate = result.getValue({name: "messagedate", label: "Message Date"});
					var mesageType = result.getValue({name: "messagetype", label: "Message Type"});
					var messageText = result.getValue({name: "message", label: "Message Text"});*/
				var messageID = result.getValue({
					name: "internalid",
					join: "messages",
					summary: "GROUP",
					sort: search.Sort.ASC,
					label: "Internal ID"
				});
				//log.debug('Message ID','Message ID::'+messageID);

				var messageObject = search.lookupFields({
					type: 'message',
					id: messageID,
					columns: ['author','recipient','cc','bcc','message','messagedate']
				});

				//log.debug('Message Object','Message Object::'+JSON.stringify(messageObject));

				var eachMessageObject = {};
				
				//ADD MESSAGE ID
				eachMessageObject.messageID = messageID;

				//ADD MESSAGE DATE TIME
				var messageDateTime = messageObject.messagedate;
				//log.debug('Message Date Time', 'Message Date Time::'+messageDateTime);
				eachMessageObject.messagedate = messageDateTime;

				//ADD MESSAGE AUTHOR
				if(messageObject.author.length>0) {
					var messageAuthor = messageObject.author[0].value;
					//log.debug('Message Author', 'Message Author::'+messageAuthor);
					eachMessageObject.author = {"id": messageAuthor,"text": messageObject.author[0].text };;
				}else {
					eachMessageObject.author = null;
				}


				//ADD MESSAGE RECIPIENT
				if(messageObject.recipient.length>0) {
					var messageRecipient = messageObject.recipient[0].value;
					//log.debug('Message Recipient', 'Message Recipient'+messageRecipient);
					eachMessageObject.recipient = {"id": messageRecipient,"text": messageObject.recipient[0].text };
				}else {
					eachMessageObject.recipient = null;
				}


				//ADD CC
				var cc = messageObject.cc;
				//log.debug('CC', 'CC::'+cc);
				if(cc!=null && cc!='' && cc!=undefined) {
					eachMessageObject.cc = cc;
				}else {
					eachMessageObject.cc = null;
				}

				//ADD BCC
				var bcc = messageObject.bcc;
				//log.debug('BCC', 'BCC::'+bcc);
				if(bcc!=null && bcc!='' && bcc!=undefined) {
					eachMessageObject.bcc = bcc;
				}else {
					eachMessageObject.bcc = null;
				}

				//ADD MESSAGE TEXT
				var messageText = messageObject.message;
				//log.debug('Message Text', 'Message Text::'+messageText);
				if(messageText!=null && messageText!='' && messageText!=undefined) {
					eachMessageObject.messsage = messageText;
				}else {
					eachMessageObject.message = null;
				}

				eachCaseObject.messages .push(eachMessageObject);

				return true;
			});


		}
		catch(e) {
			log.debug('Error while getting Message Details','Error while getting Message Details::'+e);
		}

		return eachCaseObject;
	}

	function getFileDetails(caseID, eachCaseObject) {
		try {

			eachCaseObject.files = [];

			var supportcaseSearchObj = search.create({
				type: "supportcase",
				filters:
					[
					 ["internalid","anyof",caseID]
							 ],
					columns:
						[
						 search.createColumn({
							 name: "internalid",
							 join: "file",
							 label: "Internal ID"
						 }),
						 search.createColumn({
							 name: "name",
							 join: "file",
							 label: "Name"
						 }),
						 search.createColumn({
							 name: "documentsize",
							 join: "file",
							 label: "Size (KB)"
						 }),
						 search.createColumn({
							 name: "folder",
							 join: "file",
							 label: "Folder"
						 })
						 ]
			});
			var searchResultCount = supportcaseSearchObj.runPaged().count;
			//log.debug("File Search result count",searchResultCount);
			supportcaseSearchObj.run().each(function(result){

				var fileID = result.getValue({
					name: "internalid",
					join: "file",
					label: "Internal ID"
				});

				var fileName = result.getValue({
					name: "name",
					join: "file",
					label: "Name"
				});

				var fileSize = result.getValue({
					name: "documentsize",
					join: "file",
					label: "Size (KB)"
				});

				var folderID = result.getValue({
					name: "folder",
					join: "file",
					label: "Folder"
				});

				var eachFileObject = {};
				eachFileObject.id = fileID;
				eachFileObject.name = fileName;
				eachFileObject.size = fileSize;
				eachFileObject.folder = folderID;

				eachCaseObject.files.push(eachFileObject);

				return true;
			});

		}
		catch(e) {
			log.debug('Error while getting File Details','Error while getting File Details::'+e);
		}

		return eachCaseObject;
	}


	return {
		getInputData: GetInputData,
		//map: Map,
		reduce: Reduce,
		summarize: Summarize
	};
});