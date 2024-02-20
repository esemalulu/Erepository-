/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 * @NModuleScope public
 */

/*
Name                : GD_MR_ExportHistoricalRecords.js
Purpose             : To export Historical Records into JSON Files
Created On          : 27 Nov 2022
Author              : Dileep
Script Type         : Map Reduce
 */

define(['N/record', 'N/search', 'N/runtime', 'N/format','N/file'],
		function (record, search, runtime, format, file) {

	function GetInputData() {

		log.debug('In get Input Data','In Get Input Data!');

		var currentScript = runtime.getCurrentScript();
		
		//GET THE RECORD TYPE FROM PARAMETER
		var recType = currentScript.getParameter({
			name: "custscript_gd_exp_hist_case_rectyp"
		});
		if(recType==null || recType=='' || recType==undefined) {
			throw 'Record Type missing in Paramters';
		}

		//GET THE FIELD IDS 1 LIST FROM PARAMETER
		var fieldIDs1 = currentScript.getParameter({
			name: "custscript_gd_exp_hist_cases_fld_1"
		});
		if(fieldIDs1==null || fieldIDs1=='' || fieldIDs1 == undefined) {
			throw 'Field IDs missing in Field IDs 1 Paramters';
		}
		
		//GET THE FIELD IDS 2 LIST FROM PARAMETER
		var fieldIDs2 = currentScript.getParameter({
			name: "custscript_gd_exp_hist_cases_fld_2"
		});
		/*if((fieldIDs1==null || fieldIDs1=='' || fieldIDs1 == undefined || fieldIDs2==null || fieldIDs2=='' || fieldIDs2 == undefined)) {
			throw 'Field IDs missing in Field IDs 2 Paramters';
		}*/
		
		//GET THE LIST FIELD IDS FROM PARAMETER
		var listFields = currentScript.getParameter({
			name: "custscript_gd_exp_hist_case_lstfld_1"
		});
		if(listFields==null || listFields=='' || listFields == undefined) {
			//throw 'Field IDs missing in List Fields Paramters';
		}

		//GET THE SAVED SEARCH ID FROM PARAMETER
		var savedSearchID = currentScript.getParameter({
			name: "custscript_gd_exp_hist_rec_ss_id"
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
			
			var fieldIDsArray = [], listFieldsArray = [];
			
			var currentScript = runtime.getCurrentScript();
			
			//GET THE RECORD TYPE FROM PARAMETER
			var recType = currentScript.getParameter({
				name: "custscript_gd_exp_hist_case_rectyp"
			});
			if(recType==null || recType=='' || recType==undefined) {
				throw 'Record Type missing in Paramters';
			}

			//GET THE FIELDS 1 LIST FROM PARAMETER
			var fieldIDs1 = currentScript.getParameter({
				name: "custscript_gd_exp_hist_cases_fld_1"
			});
			if(fieldIDs1 && fieldIDs1.length>2) {
				fieldIDsArray = fieldIDs1.replace(/[\r\n]/g, "").split(',');
			}
			
			//GET THE FIELDS 2 LIST FROM PARAMETER
			var fieldIDs2 = currentScript.getParameter({
				name: "custscript_gd_exp_hist_cases_fld_2"
			});
			if(fieldIDs2 && fieldIDs2.length>2) {
				fieldIDsArray = fieldIDs2.replace(/[\r\n]/g, "").split(',');
			}
			
			//GET THE LIST FIELD IDS FROM PARAMETER
			var listFields = currentScript.getParameter({
				name: "custscript_gd_exp_hist_case_lstfld_1"
			});
			if(listFields && listFields.length>2) {
				listFieldsArray = listFields.replace(/[\r\n]/g, "").split(',');
			}

			//log.debug('In Reduce','In Reduce::'+JSON.stringify(resultset));

			var recordID = resultset.internalid.value;

			log.debug('In Reduce','Processing Record::'+recordID);

			//LOAD THE RECORD
			var entityRecord = record.load({type: recType, id: recordID});

			var eachCaseObject = {};

			//Loop through the Field IDs Array
			for(var i=0; i<fieldIDsArray.length;i++) {

				var fieldValue = entityRecord.getValue(fieldIDsArray[i]);
				//log.debug('Field Value','Field Value::'+fieldIDsArray[i] + '||' + fieldValue);

				if(fieldValue!=null && fieldValue!='' && fieldValue!=undefined) {
					eachCaseObject[fieldIDsArray[i]] = fieldValue;
				}else {
					eachCaseObject[fieldIDsArray[i]] = null;
				}

			}//END OF FOR LOOP - FIELDS ARRAY


			//Loop through the List Fields Array
			for(var j=0; j<listFieldsArray.length;j++) {

				var fieldValue = entityRecord.getValue(listFieldsArray[j]);

				if(fieldValue!=null && fieldValue!='' && fieldValue!=undefined) {

					var fieldText =  entityRecord.getText(listFieldsArray[j]);

					eachCaseObject[listFieldsArray[j]] = {"id" : fieldValue, "text": fieldText };
				}else {
					eachCaseObject[listFieldsArray[j]] = null;
				}

			}//END OF FOR LOOP - LIST FIELDS ARRAY
			
			
			//GET MESSAGES AND FILES FOR CASE RECORD
			if(recType == 'supportcase') {

			//GET MESSAGE DETAILS ATTACHED TO OBJECT
			eachCaseObject = getMessageDetails(recordID, eachCaseObject);

			//GET FILE DETAILS ATTACHED TO OBJECT
			eachCaseObject = getFileDetails(recordID, eachCaseObject);
			}//END OF IF - SUPPORT CASE RECORD
			
			//log.debug('All Records Object','All Records Object::'+JSON.stringify(eachCaseObject));

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
				name: "custscript_gd_exp_hist_rec_ss_id"
			});

			if (!savedSearchID) {
				throw "Saved Search Id missing in Parameter";
			}

			//GET THE FILE INDEX FROM PARAMETER
			var fileIndex = currentScript.getParameter({
				name: "custscript_gd_exp_hist_rec_fileindex"
			});
			if (!fileIndex) {
				throw "File Index missing in Parameter";
			}

			//GET THE FOLDER ID FROM PARAMETER
			var folderID = currentScript.getParameter({
				name: "custscript_gd_exp_hist_rec_folderid"
			});
			if (!folderID) {
				throw "Folder ID missing in Parameter";
			}

			//GET THE RECORD TYPE FROM PARAMETER
			var recType = currentScript.getParameter({
				name: "custscript_gd_exp_hist_case_rectyp"
			});
			if(recType==null || recType=='' || recType==undefined) {
				throw 'Record Type missing in Paramters';
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


			var allRecordDetailsArray = []; var count = 0;

			summary.output.iterator().each(function (key, value) {
				//log.debug('Key','Key:'+key);
				//log.debug('Value','Value:'+JSON.stringify(value));

				allRecordDetailsArray.push(JSON.parse(value));

				var content = JSON.stringify(allRecordDetailsArray);
				

				count++;
				log.debug('Record Count','Record Count::'+count + '  || File Size::'+ content.length);

				if (content.length > 8388608) { //9437184-9MB // 8388608-8MB
					log.debug('File Size','File Size::'+content.length);
					var fileObj = file.create({
						name: recType +'Details_'+ fileIndex,
						fileType: file.Type.JSON,
						contents: content
					});
					fileObj.folder = folderID;
					var fileId = fileObj.save();
					log.debug('File Created','File Created:'+fileId);

					allRecordDetailsArray = [];

					fileIndex++;

					log.debug('Remaining Usage Limit','Remaining Usage Limit::'+runtime.getCurrentScript().getRemainingUsage());

				}//END OF IF - FILE SIZE
				else if((count == totalCount) || (errorCount + count == totalCount)) {
					log.debug('File Size','File Size::'+content.length);
					log.debug('Processing last Record','Processing Last Record::'+count)
					var fileObj = file.create({
						name:  recType + 'Details_'+ fileIndex,
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