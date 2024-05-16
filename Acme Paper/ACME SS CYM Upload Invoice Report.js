/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type          : Scheduled Script
 * Script Name          : ACME SS CYM Upload Invoice Report 
 * Version              : 2.0
 * Description          : This script will be used to upload the Daily Invoice Report for Call Your Mother Vendor. 
 */

define(['N/search', 'N/record', 'N/log', 'N/runtime', 'N/format', 'N/email', 'N/encode', 'N/file', 'N/task', 'N/sftp'],

	function (search, record, log, runtime, format, email, encode, file, task, sftp) {

		var Cym_FileNamePrefix = 'CallYourMother_Invoice_';
		var SFTPPort = 22;
		var MainlinePrefix = 'H';
		var ItemlinePrefix = 'D';

		var Cym_DailyInvRep_SearchID_ScriptField = 'custscript_cym_daily_inv_rep_searchid';
		var Cym_DailyInvRep_AckEmail_Reci_ScriptField = 'custscript_cym_invrep_ack_email_recipien';

		var Cym_SFTPInteg_Username_ScriptField = 'custscript_cym_sftpintegration_username';
		var Cym_SFTPInteg_Pwd_GUID_ScriptField = 'custscript_cym_sftpintegration_pwd_guid';
		var Cym_SFTPInteg_URL_ScriptField = 'custscript_cym_sftpintegration_sftp_url';
		var Cym_SFTPInteg_Hostkey_ScriptField = 'custscript_cym_sftpintegration_host_key';
		var Cym_SFTPInteg_SFTPDir_ScriptField = 'custscript_cym_sftpintegration_sftp_dir';

		function execute(scriptContext) {
			try {
				log.audit('****** ACME SS CYM Upload Invoice Report Script Begin ******', '****** ACME SS CYM Upload Invoice Report Script Begin ******');
				var cymReport_Search_ID = runtime.getCurrentScript().getParameter({ name: Cym_DailyInvRep_SearchID_ScriptField });
				log.debug('CYM Report Search ID is ', cymReport_Search_ID);

				if (cymReport_Search_ID) {
					var invReportCSVContent = createDailyInvoiceReport(cymReport_Search_ID);
					log.debug('invReportCSVContent is ', invReportCSVContent);

					var curDateTimeStr = returnCurDateTimeVal();
					//log.debug('curDateTimeStr is ', curDateTimeStr);
					if (invReportCSVContent) {
						var cym_DailyInvRep_CSVFileObj = file.create({
							name: Cym_FileNamePrefix + curDateTimeStr + '.csv',
							fileType: file.Type.CSV,
							contents: invReportCSVContent
						});

						cym_DailyInvRep_CSVFileObj.folder = 772;

						//var id = cym_DailyInvRep_CSVFileObj.save();
						//log.debug('id is ', id);
						sftpConnectionUpload(cym_DailyInvRep_CSVFileObj);
						log.audit('****** ACME SS CYM Upload Invoice Report Script End ******', '****** ACME SS CYM Upload Invoice Report Script End ******');
					}
				}
			} catch (scheduledScriptErr) {
				log.error('Error Occurred In SS CYM Upload Invoice Report Scheduled Script is ', scheduledScriptErr);

			}
		}

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
				log.error('Error Occurred In SS CYM Upload Invoice Report script: returnSearchResults function is ', JSON.stringify(returnSearchResultsErr));
			}
		}

		function createDailyInvoiceReport(reportSearchId) {
			try {
				var csvContent = '';

				var cymDailyInvReportSearchResult = returnSearchResults(reportSearchId);
				log.debug('cymDailyInvReportSearchResult ', cymDailyInvReportSearchResult);

				if (cymDailyInvReportSearchResult) {
					for (var cymDailyInvReportSearchResultLen = 0; cymDailyInvReportSearchResultLen < cymDailyInvReportSearchResult.length; cymDailyInvReportSearchResultLen++) {
						var curLineitem = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'item' });
						var curDocNumber = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'tranid' });

						if (!curLineitem) {
							var curDate = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'trandate' });
							var curNetTerms = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'terms' });
							var curLocationID = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'entitynumber', join: 'customer' });
							var curLocationName = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'companyname', join: 'customer' });
							var curLocationAddressLine1 = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'billaddress1' });
							var curLocationAddressLine2 = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'billaddress2' });
							var curLocationAddressLine3 = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'billaddress3' });
							var curLocationAddress = '';
							if (curLocationAddressLine1) {
								curLocationAddress += curLocationAddressLine1;
							}
							if (curLocationAddressLine2) {
								curLocationAddress += curLocationAddressLine2;
							}
							if (curLocationAddressLine3) {
								curLocationAddress += curLocationAddressLine3;
							}
							log.debug('curLocationAddress before is ', curLocationAddress);
							var manipulatedAddr = curLocationAddress.replace(/\r?\n/g, ' ');
							if (manipulatedAddr.indexOf('"') != -1) {
								manipulatedAddr = manipulatedAddr.replace(/"/g, '""');
							}
							if (manipulatedAddr.match(/"|,/)) {
								manipulatedAddr = '"' + manipulatedAddr + '"';
							}
							//log.debug('curLocationAddress for index: '+cymDailyInvReportSearchResultLen+' is '+curLocationAddress, 'manipulatedAddr is '+manipulatedAddr);

							var curLocationCity = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'billcity' });
							var curLocationState = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'billstate' });
							var curLocationZip = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'billzip' });
							var curTotalSalesTax = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'taxtotal' });
							if (!curTotalSalesTax) {
								curTotalSalesTax = '0.00';
							}
							var freightCharges = '0' // cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({name: FreightChargesFieldId});
							/* if(!freightCharges){
								freightCharges = '0';
							} */
							var curTotalInvoiceAmt = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'total' });
							var tranType = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'type' });
							var isCreditMemo = '';
							if (tranType == 'Invoice') {
								isCreditMemo = 0;
							}
							else if (tranType == 'Credit Memo') {
								isCreditMemo = 1;
							}

							// Header Line
							csvContent += MainlinePrefix + ',' + curDocNumber + ',' + curDate + ',' + curNetTerms + ',' + curLocationID + ',' + curLocationName + ',' + manipulatedAddr + ',' + curLocationCity + ',' + curLocationState + ',' + curLocationZip + ',' + curTotalSalesTax + ',' + freightCharges + ',' + '0' + ',' + curTotalInvoiceAmt + ',' + isCreditMemo + '\n';
						}
						else if (curLineitem) {
							var curItemQty = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'quantity' });
							var curItemNumber = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getText({ name: 'item' });
							var curUofM = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'unit' });
							var curItemDescription = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'memo' });
							curItemDescription = curItemDescription.replace(/\r?\n/g, ' ');
							if (curItemDescription.indexOf('"') != -1) {
								curItemDescription = curItemDescription.replace(/"/g, '""');
							}
							if (curItemDescription.match(/"|,/)) {
								curItemDescription = '"' + curItemDescription + '"';
							}
							//log.debug('curItemDescription for index: '+cymDailyInvReportSearchResultLen+' is '+curItemDescription);
							var curItemUnitPrice = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'rate' });
							var curItemLineTotal = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'amount' });
							var curLineTaxItem = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'taxcode' });
							var isTaxable = '';
							if (!curLineTaxItem) {
								isTaxable = 0;
							}
							else if (curLineTaxItem) {
								isTaxable = 1;
							}
							var curItemLineTax = cymDailyInvReportSearchResult[cymDailyInvReportSearchResultLen].getValue({ name: 'taxamount' });
							if (!curItemLineTax) {
								curItemLineTax = '0.00';
							}

							// Detail Line
							csvContent += ItemlinePrefix + ',' + curDocNumber + ',' + curItemQty + ',' + curItemNumber + ',' + '' + ',' + '' + ',' + curUofM + ',' + curItemDescription + ',' + '' + ',' + '' + ',' + '' + ',' + curItemUnitPrice + ',' + curItemLineTotal + ',' + isTaxable + ',' + curItemLineTax + ',' + '0.00' + ',' + '\n';
						}
					}
				}
				return csvContent;
			} catch (createDailyInvoiceReportErr) {
				log.error('Error Occurred In SS CYM Upload Invoice Report script: createDailyInvoiceReport Function is ', createDailyInvoiceReportErr);
				cym_DailyRepUpload_sendAckEmail('CSV Report Creation', 'Unsuccessful', createDailyInvoiceReportErr.message);
			}
		}

		function sftpConnectionUpload(fileObj) {
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
			} catch (sftpConnectionUploadErr) {
				log.error('Error Occurred In SS CYM Upload Invoice Report script: sftpConnectionUpload Function is ', sftpConnectionUploadErr);
				//cym_DailyRepUpload_sendAckEmail('Call Your Mother', 'Unsuccessful', sftpConnectionUploadErr.message);
			}
		}//sftpConnectionUpload function

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
				log.error('Error Occurred In SS CYM Upload Invoice Report script: cym_DailyRepUpload_sendAckEmail Function is ', cym_DailyRepUpload_sendAckEmailErr);
			}
		}

		return {
			execute: execute
		};

	});
