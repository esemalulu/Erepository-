/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type          : Scheduled Script
 * Script Name          : ACME SS REST-DT Upload Invoice Report
 * Version              : 2.0
 * Description          : This script will be used to upload the Daily Invoice Report for Rest-365 & District Taco Vendors. 
 */

define(['N/search', 'N/record', 'N/log', 'N/runtime', 'N/format', 'N/email', 'N/encode', 'N/file', 'N/task', 'N/sftp'],

	function (search, record, log, runtime, format, email, encode, file, task, sftp) {

		var RestFileNamePrefix = 'REST365_Invoice_';
		var DTFileNamePrefix = 'DT_Invoice_';
		var CSVFileHeaders = ['Vendor', 'Location', 'Document Number', 'Date', 'Vendor Item Number', 'Vendor Item Name', 'UofM', 'Qty', 'Unit Price', 'Total', 'Line Tax'];
		var TaxItemNameForReport = 'Tax';
		var FreightItemNameForReport = 'FGT/ Misc';
		var TaxFreightLineUofM = 'Each';
		var SFTPPort = 22;

		var RestDailyInvReportSearchId_ScriptField = 'custscript_rest_daily_inv_rep_searchid';
		var RestReportTaxItemNumber_ScriptField = 'custscript_rest_dailyinvrep_taxitemnum';
		var RestReportFreightItemNumber_ScriptField = 'custscript_rest_dailyinvrep_freitemnum';
		var RestDailyInvRep_AckEmail_Reci_ScriptField = 'custscript_rest_invrep_ack_email_recipie';

		var Rest365_SFTPInteg_Username_ScriptField = 'custscript_rest_sftpintegration_username';
		var Rest365_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_rest_sftpintegration_pwd_guid';
		var Rest365_SFTPInteg_URL_ScriptField = 'custscript_rest_sftpintegration_sftp_url';
		var Rest365_SFTPInteg_Hostkey_ScriptField = 'custscript_rest_sftpintegration_host_key';
		var Rest365_SFTPInteg_SFTPDir_ScriptField = 'custscript_rest_sftpintegration_sftp_dir';

		var DT_SFTPInteg_Username_ScriptField = 'custscript_dt_sftpintegration_username';
		var DT_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_dt_sftpintegration_pwd_guid';
		var DT_SFTPInteg_URL_ScriptField = 'custscript_dt_sftpintegration_sftp_url';
		var DT_SFTPInteg_Hostkey_ScriptField = 'custscript_dt_sftpintegration_host_key';
		var DT_SFTPInteg_SFTPDir_ScriptField = 'custscript_dt_sftpintegration_sftp_dir';

		function execute(scriptContext) {
			try {
				log.audit('****** ACME SS REST-DT Upload Invoice Report Script Begin ******', '****** ACME SS REST-DT Upload Invoice Report Script Begin ******');
				var restDailyInvReport_Search_ID = runtime.getCurrentScript().getParameter({ name: RestDailyInvReportSearchId_ScriptField });
				log.debug('Rest Report Search ID is ', restDailyInvReport_Search_ID);

				if (restDailyInvReport_Search_ID) {
					var invReportCSVContent = createDailyInvoiceReport(restDailyInvReport_Search_ID);
					log.debug('invReportCSVContent is ', invReportCSVContent);
					var curDateTimeStr = returnCurDateTimeVal();
					log.debug('curDateTimeStr is ', curDateTimeStr);

					var dailyInvRep_CSVFileObj = file.create({
						name: curDateTimeStr + '.csv',
						fileType: file.Type.CSV,
						contents: invReportCSVContent
					});

					dailyInvRep_CSVFileObj.folder = 772;

					var id = dailyInvRep_CSVFileObj.save();
					log.debug('id is ', id);
					var rest365_ReportFileName = RestFileNamePrefix + dailyInvRep_CSVFileObj.name;
					dailyInvRep_CSVFileObj.name = rest365_ReportFileName;
					rest365_SFTPConnectionUpload(dailyInvRep_CSVFileObj);

					var dt_ReportFileName = DTFileNamePrefix + dailyInvRep_CSVFileObj.name;
					dailyInvRep_CSVFileObj.name = dt_ReportFileName;
					// dt_SFTPConnectionUpload(dailyInvRep_CSVFileObj);
					log.audit('****** ACME SS REST-DT Upload Invoice Report Script End ******', '****** ACME SS REST-DT Upload Invoice Report Script End ******');
				}
			} catch (scheduledScriptErr) {
				log.error('Error Occurred In SS REST-DT Upload Invoice Report: Scheduled Script is ', scheduledScriptErr);
			}
		}

		function returnCurDateTimeVal() {
			var currentDateTime = new Date();
			var curDate = currentDateTime.getFullYear().toString().substr(2, 2) + (((currentDateTime.getMonth() + 1) < 10) ? "0" : "") + (currentDateTime.getMonth() + 1) + currentDateTime.getDate();
			var curTime = ((currentDateTime.getHours() < 10) ? "0" : "") + currentDateTime.getHours() + ((currentDateTime.getMinutes() < 10) ? "0" : "") + currentDateTime.getMinutes() + ((currentDateTime.getSeconds() < 10) ? "0" : "") + currentDateTime.getSeconds();

			return curDate + '_' + curTime;
		}

		function returnSearchResults(searchId, searchRecType, newFilter, newColumn) {
			try {
				if (searchId) {
					var curSearch = search.load({
						id: searchId
					});
					log.audit("searchId: ", curSearch)
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
				var id = 0;
				do {
					var resultslice = resultSet.getRange(id, id + 1000);
					if (resultslice != null && resultslice != '') {
						for (var rs in resultslice) {
							searchResult.push(resultslice[rs]);
							id++;
						}
					}
					//log.emergency('searchResult length is', searchResult.length);
				}
				while ((resultslice != null) ? resultslice.length >= 1000 : tempCondition < 0);

				return searchResult;
			} catch (returnSearchResultsErr) {
				log.error('Error in returnSearchResults function is ', JSON.stringify(returnSearchResultsErr));
			}
		}

		function createDailyInvoiceReport(reportSearchId) {
			try {
				var restReportTaxItemNumber = runtime.getCurrentScript().getParameter({ name: RestReportTaxItemNumber_ScriptField });
				var restReportFreightItemNumber = runtime.getCurrentScript().getParameter({ name: RestReportFreightItemNumber_ScriptField });
				log.debug('Rest365 Report Tax Item Number is ' + restReportTaxItemNumber, 'Rest365 Report Freight Item Number is ' + restReportFreightItemNumber);

				// var csvHeaders = CSVFileHeaders[0] + ',' + CSVFileHeaders[1] + ',' + CSVFileHeaders[2] + ',' + CSVFileHeaders[3] + ',' + CSVFileHeaders[4] + ',' + CSVFileHeaders[5] + ',' + CSVFileHeaders[6] + ',' + CSVFileHeaders[7] + ',' + CSVFileHeaders[8] + ',' + CSVFileHeaders[9] + ',' + CSVFileHeaders[10] + '\n';
				var csvHeaders = CSVFileHeaders[0] + ',' + CSVFileHeaders[1] + ',' + CSVFileHeaders[2] + ',' + CSVFileHeaders[3] + ',' + CSVFileHeaders[4] + ',' + CSVFileHeaders[5] + ',' + CSVFileHeaders[6] + ',' + CSVFileHeaders[7] + ',' + CSVFileHeaders[8] + ',' + CSVFileHeaders[9]  + '\n';
				var csvContent = '';
				csvContent += csvHeaders;

				var restDailyInvReportSearchResult = returnSearchResults(reportSearchId);
				log.debug('restDailyInvReportSearchResult ', restDailyInvReportSearchResult);

				if (restDailyInvReportSearchResult) {
					for (var restDailyInvReportSearchResultLen = 0; restDailyInvReportSearchResultLen < restDailyInvReportSearchResult.length; restDailyInvReportSearchResultLen++) {
						var isTaxLine = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'taxline' });
						// var curVendor = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getText({ name: 'entity' });
						var curVendor = 'Acme';
						var curDocNumber = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'tranid' });
						var curDate = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'trandate' });
						var curItemQty = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'quantity' });
						log.debug('curDate for index: ' + restDailyInvReportSearchResultLen + ' is ' + curDate, 'curDocNumber is ' + curDocNumber);
						if (isTaxLine == true) {
							var curItemLineTax = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'taxtotal' }) || 0;
							log.debug('curItemLineTax',curItemLineTax);
							var freightCharges = '0' // restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({name: FreightChargesFieldId});
							var freightQty = 0;
							var curVendor = 'Acme';
							var curItemLineTax = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'taxamount' }) || 0;
							var curLocation = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'custentity14', join:"customerMain" });
							var curItemNumber = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getText({ name: 'item' });
							var curItemName = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'displayname', join: 'item' });
							if(curItemName.indexOf(",") != -1){
								curItemName = curItemName.replace(/,/g," ");
							}
							var curUofM = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'unit' });
							var curItemUnitPrice = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'rate' });
							var curItemLineTotal = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'amount' });
							/* if(!freightCharges){
								freightCharges = '0';
								freightQty = 0;
							}
							else{
								freightQty = 1;
							} */

							//Tax Line
							csvContent += curVendor + ',' + curLocation + ',' + curDocNumber + ',' + curDate + ',' + restReportTaxItemNumber + ',' + TaxItemNameForReport + ',' + TaxFreightLineUofM + ',' + curItemQty + ',' + curItemUnitPrice + ',' + curItemLineTax + ',' + '' + '\n';

							//Freight Line
							csvContent += curVendor + ',' + curLocation + ',' + curDocNumber + ',' + curDate + ',' + restReportFreightItemNumber + ',' + FreightItemNameForReport + ',' + TaxFreightLineUofM + ',' + freightQty + ',' + freightCharges + ',' + freightCharges + ',' + '' + '\n';
						}
						else if (isTaxLine == false) {
							// var curVendor = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getText({ name: 'entity' });
							var curVendor = 'Acme';
							var curItemLineTax = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'taxamount' }) || 0;
							var curLocation = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'custentity14', join:"customerMain" });
							var curItemNumber = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getText({ name: 'item' });
							var curItemName = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'displayname', join: 'item' });
							log.debug("createDailyInvoiceReport() indexOf "+ curItemName + " is: ", curItemName.indexOf(","));
							if(curItemName.indexOf(",") != -1){
								curItemName = curItemName.replace(/,/g," ");
							}
							var curUofM = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'unit' });
							var curItemUnitPrice = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'rate' });
							var curItemLineTotal = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'amount' });

							var curItemLineTax = restDailyInvReportSearchResult[restDailyInvReportSearchResultLen].getValue({ name: 'taxamount' }) || 0;
							log.debug('curItemLineTax',curItemLineTax);
							//Item Line
							// csvContent += curVendor + ',' + curLocation + ',' + curDocNumber + ',' + curDate + ',' + curItemNumber + ',' + curItemName + ',' + curUofM + ',' + curItemQty + ',' + curItemUnitPrice + ',' + curItemLineTotal + ',' + curItemLineTax + '\n';
							csvContent += curVendor + ',' + curLocation + ',' + curDocNumber + ',' + curDate + ',' + curItemNumber + ',' + curItemName + ',' + curUofM + ',' + curItemQty + ',' + curItemUnitPrice + ',' + curItemLineTotal + '\n';
						}
						log.debug('csvContent for index: ' + restDailyInvReportSearchResultLen + ' is ', csvContent);
					}
				}
				return csvContent;
			} catch (createDailyInvoiceReportErr) {
				log.error('Error Occurred In SS REST-DT Upload Invoice Report script: createDailyInvoiceReport Function is ', createDailyInvoiceReportErr);
				rest_DailyRepUpload_sendAckEmail('CSV Report Creation', 'Unsuccessful', createDailyInvoiceReportErr.message);
			}
		}

		function rest365_SFTPConnectionUpload(fileObj) {
			log.debug('action', "rest365_SFTPConnectionUpload")
			try {
				var rest365_UserName = runtime.getCurrentScript().getParameter({ name: Rest365_SFTPInteg_Username_ScriptField });
				log.debug('Rest 365 User Name is ', rest365_UserName);
				var rest365_PwdGUID = runtime.getCurrentScript().getParameter({ name: Rest365_SFTPInteg_Pwd_GUID_ScriptField });
				log.debug('Rest 365 Password GUID is ', rest365_PwdGUID);
				var rest365_SFTPurl = runtime.getCurrentScript().getParameter({ name: Rest365_SFTPInteg_URL_ScriptField });
				log.debug('Rest 365 SFTP Url is ', rest365_SFTPurl);
				var rest365_Hostkey = runtime.getCurrentScript().getParameter({ name: Rest365_SFTPInteg_Hostkey_ScriptField });
				log.debug('Rest 365 Host Key is ', rest365_Hostkey);
				var rest365_SFTPDirectory = runtime.getCurrentScript().getParameter({ name: Rest365_SFTPInteg_SFTPDir_ScriptField });
				log.debug('Rest 365 SFTP Directory is ', rest365_SFTPDirectory);

				var rest365_SFTPconnection = sftp.createConnection({
					username: rest365_UserName,
					passwordGuid: rest365_PwdGUID,
					url: rest365_SFTPurl,
					hostKey: rest365_Hostkey,
					hostKeyType: 'rsa',
					port: SFTPPort
				});

				log.debug('connection : ', rest365_SFTPconnection);
				log.debug('File Name : ', fileObj.name);

				if (rest365_SFTPconnection) {
					if (rest365_SFTPDirectory && fileObj) {
						rest365_SFTPconnection.upload({
							directory: rest365_SFTPDirectory,
							file: fileObj,
							replaceExisting: true
						});
						log.debug('DEBUG', 'Uploaded file : ' + fileObj.name);
						rest_DailyRepUpload_sendAckEmail('Restaurant 365', 'Successful', 'Uploaded the Daily Invoice Report file successfully to the Restaurant 365 SFTP server');
					}
					else {
						rest_DailyRepUpload_sendAckEmail('Restaurant 365', 'Unsuccessful', 'SFTP Directory not found in the script parameter for Restaurant 365.');
					}
				}//connection
			} catch (rest365_SFTPConnectionUploadErr) {
				log.error('Error Occurred In SS REST-DT Upload Invoice Report script: rest365_SFTPConnectionUpload Function is ', rest365_SFTPConnectionUploadErr);
				rest_DailyRepUpload_sendAckEmail('Restaurant 365', 'Unsuccessful', rest365_SFTPConnectionUploadErr.message);
			}
		}

		function dt_SFTPConnectionUpload(fileObj) {
			try {
				var dt_UserName = runtime.getCurrentScript().getParameter({ name: DT_SFTPInteg_Username_ScriptField });
				log.debug('DT User Name is ', dt_UserName);
				var dt_PwdGUID = runtime.getCurrentScript().getParameter({ name: DT_SFTPInteg_Pwd_GUID_ScriptField });
				log.debug('DT Password GUID is ', dt_PwdGUID);
				var dt_SFTPurl = runtime.getCurrentScript().getParameter({ name: DT_SFTPInteg_URL_ScriptField });
				log.debug('DT SFTP Url is ', dt_SFTPurl);
				var dt_Hostkey = runtime.getCurrentScript().getParameter({ name: DT_SFTPInteg_Hostkey_ScriptField });
				log.debug('DT Host Key is ', dt_Hostkey);
				var dt_SFTPDirectory = runtime.getCurrentScript().getParameter({ name: DT_SFTPInteg_SFTPDir_ScriptField });
				log.debug('DT SFTP Directory is ', dt_SFTPDirectory);

				var dt_SFTPconnection = sftp.createConnection({
					username: dt_UserName,
					passwordGuid: dt_PwdGUID,
					url: dt_SFTPurl,
					hostKey: dt_Hostkey,
					hostKeyType: 'rsa',
					port: SFTPPort
				});

				log.debug('connection : ', dt_SFTPconnection);
				log.debug('File Name : ', fileObj.name);
				if (dt_SFTPconnection) {
					if (dt_SFTPDirectory && fileObj) {
						dt_SFTPconnection.upload({
							directory: dt_SFTPDirectory,
							file: fileObj,
							replaceExisting: true
						});
						log.debug('DEBUG', 'Uploaded file : ' + fileObj.name);
						rest_DailyRepUpload_sendAckEmail('District Taco', 'Successful', 'Uploaded the Daily Invoice Report file successfully to the District Taco SFTP server');
					}
					else {
						rest_DailyRepUpload_sendAckEmail('District Taco', 'Unsuccessful', 'SFTP Directory not found in the script parameter for District Taco.');
					}
				}//connection & upload
			} catch (dt_SFTPConnectionUploadErr) {
				log.error('Error Occurred In SS REST-DT Upload Invoice Report script: dt_SFTPConnectionUpload Function is ', dt_SFTPConnectionUploadErr);
				rest_DailyRepUpload_sendAckEmail('District Taco', 'Unsuccessful', dt_SFTPConnectionUploadErr.message);
			}
		}

		function rest_DailyRepUpload_sendAckEmail(actionType, status, statusDetails) {
			try {
				var curDateTimeObj = new Date();
				var curDateTimeString = format.format({
					value: curDateTimeObj,
					type: format.Type.DATETIME
				});
				//log.debug('rest_DailyRepUpload_sendAckEmail function: curDateTimeString is ', curDateTimeString);

				var emailRecipients = runtime.getCurrentScript().getParameter({ name: RestDailyInvRep_AckEmail_Reci_ScriptField });

				var emailSender = -5;
				var emailSubject = actionType + ' connection and Daily Invoice Report upload ' + status + ' for ' + curDateTimeString;
				var emailBody = 'Hi Team,<br/><p>The ' + actionType + ' connection and Daily Invoice Report upload status is given below:<br/>';
				emailBody += statusDetails;
				emailBody += '</p><br/><br/>Thank you';

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
			} catch (rest_DailyRepUpload_sendAckEmailErr) {
				log.error('Error Occurred In SS REST-DT Upload Invoice Report script: rest_DailyRepUpload_sendAckEmail Function is ', rest_DailyRepUpload_sendAckEmailErr);
			}
		}

		return {
			execute: execute
		};

	});
