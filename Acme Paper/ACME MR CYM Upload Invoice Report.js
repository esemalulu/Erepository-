/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type          : Map/ Reduce Script
 * Script Name        : ACME MR CYM Upload Invoice Report 
 * Version          	     : 2.0
 * Description          : This script will be used to upload the Daily Invoice Report for Call Your Mother in the Restaurant 365 format.
 */

define(['N/search', 'N/record', 'N/log', 'N/runtime', 'N/format', 'N/email', 'N/encode', 'N/file', 'N/task', 'N/sftp'],

	function (search, record, log, runtime, format, email, encode, file, task, sftp) {

		var Cym_FileNamePrefix = 'ACME_CYM_Invoice_';
		var CSVFileHeaders = ['Vendor', 'Location', 'Document Number', 'Date', 'Vendor Item Number', 'Vendor Item Name', 'UofM', 'Qty', 'Unit Price', 'Total'];
		var TaxItemNameForReport = 'Tax';
		var FreightItemNameForReport = 'FGT/ Misc';
		var TaxFreightLineUofM = 'Each';
		var SFTPPort = 22;

		var Cym_DailyInvRep_SearchID_ScriptField = 'custscript_cym_sftp_inv_rep_searchid';
		var Cym_ReportVendorName_ScriptField = 'custscript_cym_invrep_vendor_name';
		var Cym_ReportTaxItemNumber_ScriptField = 'custscript_cym_invrep_tax_item_num';
		var Cym_ReportFreightItemNumber_ScriptField = 'custscript_cym_invrep_freight_itemnum';
		var Cym_DailyInvRep_AckEmail_Reci_ScriptField = 'custscript_cym_invrep_ack_email_recipien';

		var Cym_SFTPInteg_Username_ScriptField = 'custscript_cym_sftp_integration_username';
		var Cym_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_cym_sftp_integration_pwd_guid';
		var Cym_SFTPInteg_URL_ScriptField = 'custscript_cym_sftp_integration_sftp_url';
		var Cym_SFTPInteg_Hostkey_ScriptField = 'custscript_cym_sftp_integration_host_key';
		var Cym_SFTPInteg_SFTPDir_ScriptField = 'custscript_cym_sftp_integration_sftp_dir';

		function returnCurDateTimeVal() {
			var currentDateTime = new Date();
			var curDate = currentDateTime.getFullYear().toString().substr(2, 2) + (((currentDateTime.getMonth() + 1) < 10) ? "0" : "") + (currentDateTime.getMonth() + 1) + ((currentDateTime.getDate() < 10) ? "0" : "") + currentDateTime.getDate();
			var curTime = ((currentDateTime.getHours() < 10) ? "0" : "") + currentDateTime.getHours() + ((currentDateTime.getMinutes() < 10) ? "0" : "") + currentDateTime.getMinutes() + ((currentDateTime.getSeconds() < 10) ? "0" : "") + currentDateTime.getSeconds();

			return curDate + '_' + curTime;
		}

		function returnSearchResults(searchId, searchRecType, newFilter, newColumn) {
			try {
				if (searchId) {
					var curSearch = search.load({
						id: searchId
					});

					if (newColumn) {
						curSearch.columns = newColumn;
					}

					if (newFilter) {
						var curFilters = curSearch.filters;
						for (var i = 0; i < newFilter.length; i++) {
							curFilters.push(newFilter[i]);
						}
						curSearch.filters = curFilters;
					}
				} else if (searchRecType) {
					var curSearch = search.create({
						type: searchRecType,
						filters: newFilter,
						columns: newColumn,
					});
				}

				var resultSet = curSearch.run();
				var searchResult = new Array();
				var rangeId = 0;

				do {
					var resultSlice = resultSet.getRange(rangeId, rangeId + 1000);
					if (resultSlice != null && resultSlice != '') {
						searchResult = searchResult.concat(resultSlice);
						rangeId += resultSlice.length;
					}
					//log.emergency('searchResult length is', searchResult.length);
				}
				while ((resultSlice != null) ? resultSlice.length >= 1000 : tempCondition < 0);

				return searchResult;
			} catch (returnSearchResultsErr) {
				log.error('Error Occurred In ACME MR CYM Upload Invoice Report Script: returnSearchResults function is ', JSON.stringify(returnSearchResultsErr));
			}
		}

		function createDailyInvoiceReportLine(tranInterenalID, tranType, tranReportSearchResults) {
			try {
				var curcsvContent = '';
				//var curVendor = '';
				var curLocation = '';
				var cymReportTaxItemNumber = runtime.getCurrentScript().getParameter({ name: Cym_ReportTaxItemNumber_ScriptField });
				var cymReportFreightItemNumber = runtime.getCurrentScript().getParameter({ name: Cym_ReportFreightItemNumber_ScriptField });
				var cymReportVendorName = runtime.getCurrentScript().getParameter({ name: Cym_ReportVendorName_ScriptField });
				log.debug('Call Your Mother Report Tax Item Number is ' + cymReportTaxItemNumber, 'Call Your Mother Report Freight Item Number is ' + cymReportFreightItemNumber);
				if (tranInterenalID && tranType) {
					var customerID = record.load({ type: tranType, id: tranInterenalID }).getValue('entity');
					curLocation = search.lookupFields({ type: 'customer', id: customerID, columns: ['entityid'] }).entityid;
					log.debug('curLocation  is ', curLocation);
				}
				for (var tranReportSearchResultsIndex = 0; tranReportSearchResultsIndex < tranReportSearchResults.length && tranReportSearchResults.length > 0; tranReportSearchResultsIndex++) {

					if (tranReportSearchResults[tranReportSearchResultsIndex]) {
						var isTaxLine = tranReportSearchResults[tranReportSearchResultsIndex]['values'].taxline;

						var curDocNumber = tranReportSearchResults[tranReportSearchResultsIndex]['values'].tranid;
						var curDate = tranReportSearchResults[tranReportSearchResultsIndex]['values'].trandate;
						var curItemQty = tranReportSearchResults[tranReportSearchResultsIndex]['values'].quantity;
						var curItemUnitPrice = parseFloat(tranReportSearchResults[tranReportSearchResultsIndex]['values'].rate).toFixed(2);
						//curVendor =  tranReportSearchResults[tranReportSearchResultsIndex]['values'].entity.text;
						//curLocation =  tranReportSearchResults[tranReportSearchResultsIndex].values['custentity_network_number.customer'];

						log.debug('curDate is ' + curDate, 'curDocNumber is ' + curDocNumber);
						if (isTaxLine == 'T') {
							//var curItemLineTax =  parseFloat(tranReportSearchResults[tranReportSearchResultsIndex]['values'].taxtotal).toFixed(2);
							var curItemLineTax = parseFloat(tranReportSearchResults[tranReportSearchResultsIndex]['values'].amount).toFixed(2);
							var freightCharges = tranReportSearchResults[tranReportSearchResultsIndex]['values'].FreightChargesFieldId;
							log.debug('freightCharges before is ', freightCharges);
							var freightQty = '';
							var taxQty = 1;
							if (!freightCharges) {
								freightCharges = parseFloat(0).toFixed(2);
								freightQty = 0;
							}
							else {
								freightQty = 1;
							}
							log.debug('curItemLineTax is ' + curItemLineTax, 'freightCharges is ' + freightCharges);
							//Tax Line
							curcsvContent += cymReportVendorName + ',' + curLocation + ',' + curDocNumber + ',' + curDate + ',' + cymReportTaxItemNumber + ',' + TaxItemNameForReport + ',' + TaxFreightLineUofM + ',' + taxQty + ',' + curItemUnitPrice + ',' + curItemLineTax + '\n';

							//Freight Line
							curcsvContent += cymReportVendorName + ',' + curLocation + ',' + curDocNumber + ',' + curDate + ',' + cymReportFreightItemNumber + ',' + FreightItemNameForReport + ',' + TaxFreightLineUofM + ',' + freightQty + ',' + freightCharges + ',' + freightCharges + '\n';
						}
						else if (isTaxLine == 'F') {
							var curItemNumber = tranReportSearchResults[tranReportSearchResultsIndex]['values'].item.text;
							var curItemName = tranReportSearchResults[tranReportSearchResultsIndex].values['displayname.item'];
							var curUofM = tranReportSearchResults[tranReportSearchResultsIndex]['values'].unit;
							var curItemLineTotal = parseFloat(tranReportSearchResults[tranReportSearchResultsIndex]['values'].amount).toFixed(2);

							if (curItemName.indexOf('"') != -1) {
								curItemName = curItemName.replace(/"/g, '""');
							}
							if (curItemName.match(/"|,/)) {
								curItemName = '"' + curItemName + '"';
							}

							//Item Line
							curcsvContent += cymReportVendorName + ',' + curLocation + ',' + curDocNumber + ',' + curDate + ',' + curItemNumber + ',' + curItemName + ',' + curUofM + ',' + curItemQty + ',' + curItemUnitPrice + ',' + curItemLineTotal + '\n';
						}
					}
				}
				log.debug('curcsvContent is ', curcsvContent);
				return curcsvContent;
			} catch (createDailyInvoiceReportErr) {
				log.error('Error Occurred In ACME MR CYM Upload Invoice Report Script: createDailyInvoiceReportLine Function is ', createDailyInvoiceReportErr);
				cym_DailyRepUpload_sendAckEmail('CSV Report Creation', 'Unsuccessful', createDailyInvoiceReportErr.message);
			}
		}

		function cym_SFTPConnectionUpload(fileObj) {
			try {
				var cym_UserName = runtime.getCurrentScript().getParameter({ name: Cym_SFTPInteg_Username_ScriptField });
				log.debug('CYM User Name is ', cym_UserName);
				var cym_PwdGUID = runtime.getCurrentScript().getParameter({ name: Cym_SFTPInteg_Pwd_GUID_ScriptField });
				log.debug('CYM Password GUID is ', cym_PwdGUID);
				var cym_SFTPurl = runtime.getCurrentScript().getParameter({ name: Cym_SFTPInteg_URL_ScriptField });
				log.debug('CYM SFTP Url is ', cym_SFTPurl);
				var cym_Hostkey = runtime.getCurrentScript().getParameter({ name: Cym_SFTPInteg_Hostkey_ScriptField });
				log.debug('CYM Host Key is ', cym_Hostkey);
				var cym_SFTPDirectory = runtime.getCurrentScript().getParameter({ name: Cym_SFTPInteg_SFTPDir_ScriptField });
				log.debug('CYM SFTP Directory is ', cym_SFTPDirectory);

				var cym_SFTPconnection = sftp.createConnection({
					username: cym_UserName,
					passwordGuid: cym_PwdGUID,
					url: cym_SFTPurl,
					hostKey: cym_Hostkey,
					port: SFTPPort
				});

				log.debug('connection : ', cym_SFTPconnection);
				//log.debug('fileObj contents : ', fileObj.getContents());
				if (cym_SFTPconnection) {
					if (cym_SFTPDirectory && fileObj) {
						cym_SFTPconnection.upload({
							directory: cym_SFTPDirectory,
							file: fileObj,
							replaceExisting: true
						});
						log.debug('DEBUG', 'Uploaded file : ' + fileObj.name);
						cym_DailyRepUpload_sendAckEmail('Call Your Mother', 'Successful', 'Uploaded the Daily Invoice Report file successfully to the Call Your Mother SFTP server');
					}
					else {
						cym_DailyRepUpload_sendAckEmail('Call Your Mother', 'Unsuccessful', 'SFTP Directory not found in the script parameter');
					}
				}//connection
			} catch (cym_SFTPConnectionUploadErr) {
				log.error('Error Occurred In ACME MR CYM Upload Invoice Report Script: cym_SFTPConnectionUpload Function is ', cym_SFTPConnectionUploadErr);
				//cym_DailyRepUpload_sendAckEmail('Call Your Mother', 'Unsuccessful', cym_SFTPConnectionUploadErr.message);
			}
		}  //cym_SFTPConnectionUpload function

		function cym_DailyRepUpload_sendAckEmail(actionType, status, statusDetails) {
			try {
				var curDateTimeObj = new Date();
				var curDateTimeString = format.format({
					value: curDateTimeObj,
					type: format.Type.DATETIME
				});
				//log.debug('cym_DailyRepUpload_sendAckEmail function: curDateTimeString is ', curDateTimeString);

				var emailRecipients = runtime.getCurrentScript().getParameter({ name: Cym_DailyInvRep_AckEmail_Reci_ScriptField });

				var emailSender = -5;
				var emailSubject = actionType + ' connection and Daily Invoice Report upload ' + status + ' for ' + curDateTimeString;
				var emailBody = 'Hi Team,<br/><p>The ' + actionType + ' connection and Daily Invoice Report upload status is given below:<br/>';
				emailBody += statusDetails;
				emailBody += '</p><br/>Thank you';

				//log.debug('emailRecipients are '+emailRecipients, 'emailBody is '+emailBody);
				if (emailRecipients) {
					email.send({
						author: emailSender,
						recipients: emailRecipients,
						subject: emailSubject,
						body: emailBody
					});
					log.debug('Ack email sent for ' + actionType);
				}
			} catch (cym_DailyRepUpload_sendAckEmailErr) {
				log.error('Error Occurred In ACME MR CYM Upload Invoice Report Script: cym_DailyRepUpload_sendAckEmail Function is ', cym_DailyRepUpload_sendAckEmailErr);
			}
		}

		function getInputData() {
			try {
				log.audit('****** ACME MR CYM Upload Invoice Report Script Begin ******', '****** ACME MR CYM Upload Invoice Report Script Begin ******');

				var cymReport_Search_ID = runtime.getCurrentScript().getParameter({ name: Cym_DailyInvRep_SearchID_ScriptField });
				log.debug('CYM Report Search ID is ', cymReport_Search_ID);

				if (cymReport_Search_ID) {
					var cymReport_Search_Obj = search.load({
						id: cymReport_Search_ID
					});

					if (cymReport_Search_Obj) {
						return cymReport_Search_Obj;
					}
					else {
						log.audit('No search results');
						return null;
					}
				}
				else {
					log.audit('No search ID found');
					return null;
				}

			} catch (getInputDataErr) {
				log.error('getInputData error: ', getInputDataErr.message);
			}
		}

		function map(context) {
			log.debug('Map: context.value is ', context.value);
			if (context.value != '' && context.value != null && context.value != undefined) {
				try {
					var searchResult = JSON.parse(context.value);
					var curTranId = searchResult.id;

					context.write({
						key: curTranId,
						value: searchResult
					});
				} catch (maperr) {
					log.error('map stage error: ', maperr.message);
				}
			}
		}

		function reduce(context) {
			log.debug('Context values length is ' + context.values.length, 'Context values is ' + context.values);
			var tranRecId = context.key;
			log.debug('tranRecId is ', tranRecId);
			var tranItemArray = new Array();
			var tranTaxLine = '';
			var csvContent = '';
			var tranRecType = '';
			if (context.values.length > 0 && tranRecId) {
				try {
					for (var i = 0; i < context.values.length; i++) {
						log.audit('Context value in Reduce Stage is ', context.values[i]);

						var tranSearchResult = JSON.parse(context.values[i]);
						tranRecType = tranSearchResult.recordType;
						var isTaxLineFlag = tranSearchResult['values'].taxline;
						if (isTaxLineFlag == 'T') {
							tranTaxLine = tranSearchResult;
						}
						else if (isTaxLineFlag == 'F') {
							var curTranLineNumber = tranSearchResult['values'].linesequencenumber;
							tranItemArray[curTranLineNumber - 1] = tranSearchResult;
						}
					}
					if (tranTaxLine != '') {
						tranItemArray.push(tranTaxLine);
					}
					//log.debug('tranItemArray after tranTaxLine if is ', tranItemArray);
					csvContent = createDailyInvoiceReportLine(tranRecId, tranRecType, tranItemArray);

					log.debug('csvContent is ', csvContent);
					if (csvContent.length > 0) {
						context.write({
							key: tranRecId,
							value: csvContent
						});
					}
				} catch (reduceErr) {
					log.error('Reduce stage error for Invoice/ Credit Memo ID ' + tranRecId + ' is: ', reduceErr.message);
				}
			}
		}

		function summarize(summary) {
			try {
				var csvLines = '';
				summary.output.iterator().each(function (key, value) {
					log.debug('key is ' + key, 'value is ' + value);
					csvLines += value;
					return true;
				});
				log.debug('csvLines is ', csvLines);
				if (csvLines.length > 0) {
					var csvHeaders = CSVFileHeaders[0] + ',' + CSVFileHeaders[1] + ',' + CSVFileHeaders[2] + ',' + CSVFileHeaders[3] + ',' + CSVFileHeaders[4] + ',' + CSVFileHeaders[5] + ',' + CSVFileHeaders[6] + ',' + CSVFileHeaders[7] + ',' + CSVFileHeaders[8] + ',' + CSVFileHeaders[9] + '\n';
					var csvFileContents = '';
					csvFileContents += csvHeaders + csvLines;

					log.debug('csvFileContents is ', csvFileContents);

					var curDateTimeStr = returnCurDateTimeVal();
					log.debug('curDateTimeStr is ', curDateTimeStr);

					var dailyInvRep_CSVFileObj = file.create({
						name: curDateTimeStr + '.csv',
						fileType: file.Type.CSV,
						contents: csvFileContents
					});

					dailyInvRep_CSVFileObj.folder = 772;

					//var id = dailyInvRep_CSVFileObj.save();
					//log.debug('id is ', id);
					var cym_ReportFileName = Cym_FileNamePrefix + dailyInvRep_CSVFileObj.name;
					dailyInvRep_CSVFileObj.name = cym_ReportFileName;
					cym_SFTPConnectionUpload(dailyInvRep_CSVFileObj);
				}
				log.audit('****** ACME MR CYM Upload Invoice Report Script End ******', '****** ACME MR CYM Upload Invoice Report Script End ******');
			} catch (summarizeErr) {
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
