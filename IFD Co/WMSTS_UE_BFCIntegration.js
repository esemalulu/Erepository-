/*
* Copyright (c) 1998-2018 Oracle-NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * Store software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * Version    Date            Author               Remarks
 * 1.00       1 Apr 2020     Mahesh Babu		   Initial Version
 */
/**
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 * @NModuleScope Public

 */

define(['N/query', 'N/search', 'N/error', 'N/email', 'N/record', 'N/runtime', 'N/log', 'N/task', './WMSTS_IFD_BFCIntegration_Lib.js', './WMSTS_ECB_Lib_Exec_Log.js'],
	function (query, search, error, email, record, runtime, log, task, bfclibrary, ECB_log) {

		var stLogTitle = "afterSubmit_BFCPickDataProcess";
		var emails = '', bfcUserId = '', userId = '', executionContext = '', prefbinid = '', ItemType = '';
		var externalid = '', whse = '', ordno = '', ordno = '', lineno = '', item = '', item = '', pickbin = '', expeqty = '', actqty = '', route = '', stop = '', catchwght = '', status = '', lastpick = '';
		var ChkNullValueInParameters = '';
		function beforeSubmit(context) {
			/*try {
				log.debug(stLogTitle, "Userevetn start: ");
				emails = runtime.getCurrentScript().getParameter({ name: 'custscript_ts_ifd_emp_emailaddresses' });
				bfcUserId = runtime.getCurrentScript().getParameter({ name: 'custscript_ts_bfc_webservices_id_ue' });
				userId = runtime.getCurrentUser().id;
				executionContext = runtime.executionContext;
				log.debug(stLogTitle, "Userevetn log before ECB logging: ");
				ECB_log.ECBLogStart({
					scriptid: 'WMSTS_UE_BFCIntegration.js',
					OriginalRequest: context
				});

				ECB_log.ScriptLogs({
					name: 'afterSubmit Start',
					value: 'Start Script Execution'
				});

				var newRecord = context.newRecord;
				log.debug(stLogTitle, "Userevetn log after newrecord loading: ");
				externalid = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_externalid' });
				whse = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_whse' });
				ordno = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_ordno' });
				//ordnotext = newRecord.getText({ fieldId: 'custrecord_bfcpickdata_ordno' });
				lineno = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_lineno' });
				item = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_item' });
				//itemtext = newRecord.getText({ fieldId: 'custrecord_bfcpickdata_item' });
				pickbin = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_pickbin' });
				expeqty = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_expeqty' });
				actqty = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_actqty' });
				route = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_route' });
				stop = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_stop' });
				catchwght = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_catchwght' });
				status = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_status' });
				lastpick = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_lastpick' });
				inventoryBinDetails = [];
				openTaskBinDetails = [];

				var BFCObj = {
					externalid: externalid,
					whse: whse,
					ordno: ordno,
					ordno: ordno,
					lineno: lineno,
					item: item,
					item: item,
					pickbin: pickbin,
					expeqty: expeqty,
					actqty: actqty,
					route: route,
					stop: stop,
					catchwght: catchwght,
					status: status,
					lastpick: lastpick
				}
				var ScriptParameters = {
					emails: emails,
					userID: userId,
					scriptid: 'WMSTS_UE_BFCIntegration.js',
					scriptName: 'BFC Integration UE',
				}

				var Store = {
					type: 'UserEvent',
					ScriptParameters: ScriptParameters,
					Error: '',
					BFCRecord: BFCObj,
					ItemType: '',
					InvAvailable: ''
				};

				var bfcPickData = 'Type. = ' + newRecord.type + '<br>';
				bfcPickData = bfcPickData + 'Externalid. = ' + externalid + '<br>';
				bfcPickData = bfcPickData + 'Warehouse. = ' + whse + '<br>';
				bfcPickData = bfcPickData + 'Sales Order #' + ordno + '<br>';
				bfcPickData = bfcPickData + 'Sales Order Line#. = ' + lineno + '<br>';
				bfcPickData = bfcPickData + 'Item. = ' + item + '<br>';
				bfcPickData = bfcPickData + 'Pick Bin. = ' + pickbin + '<br>';
				bfcPickData = bfcPickData + 'Expected Quantity. = ' + expeqty + '<br>';
				bfcPickData = bfcPickData + 'Actual Quantity' + actqty + '<br>';
				bfcPickData = bfcPickData + 'Route. = ' + route + '<br>';
				bfcPickData = bfcPickData + 'Stop. = ' + stop + '<br>';
				bfcPickData = bfcPickData + 'Catch weight. = ' + catchwght + '<br>';
				bfcPickData = bfcPickData + 'Status. = ' + status + '<br>';
				bfcPickData = bfcPickData + 'Sales Order # text. = ' + ordno + '<br>';
				bfcPickData = bfcPickData + 'Is Lastpick. = ' + lastpick + '<br>';
				bfcPickData = bfcPickData + 'emails. = ' + emails + '<br>';
				bfcPickData = bfcPickData + 'bfcUserId. = ' + bfcUserId + '<br>';
				bfcPickData = bfcPickData + 'userID. = ' + userId + '<br>';
				bfcPickData = bfcPickData + 'context type. = ' + context.type + '<br>';
				bfcPickData = bfcPickData + 'executionContext. = ' + executionContext + '<br>';

				var strSubject = 'Error while writing BFC Records to the Sales Order# ' + ordno;

				log.debug(stLogTitle, "BFCPickDataProcessUE Parameters : " + bfcPickData);
				ECB_log.ScriptLogs({
					name: 'BFCPickDataProcessUE Parameters',
					value: bfcPickData
				});
				var isnull = 'F'; var errmsg = new Array();

				if ((context.type == 'create' || ((context.type == 'edit' || context.type == 'xedit') && (executionContext == 'USERINTERFACE') && (userId != bfcUserId))) && status === "Picked") {
					//checks if any values are missing.
					log.debug(stLogTitle, "Before checking if any values are missing : YES");
					ECB_log.ScriptLogs({
						name: 'Before checking if any values are missing :',
						value: 'Yes'
					});

					if (actqty == null || actqty == '')
						actqty = 0;

					ChkNullValueInParameters = bfclibrary.checkForNullValueInParameters(isnull, externalid, whse, ordno, lineno, item, pickbin, expeqty, actqty, route, stop, catchwght);
					log.debug(stLogTitle, "ChkNullValueInParameters results : " + (ChkNullValueInParameters));
					ECB_log.ScriptLogs({
						name: 'ChkNullValueInParameters results :',
						value: JSON.stringify(ChkNullValueInParameters)
					});
					if (ChkNullValueInParameters != null && ChkNullValueInParameters != '') {
						isnull = ChkNullValueInParameters.split(":")[0];//returns T if any field is empty
						errmsg = ChkNullValueInParameters.split(":")[1];//returns an array of fields that are missing, and these will be shown in the error message.
						log.debug(stLogTitle, "errmsg value : " + errmsg);
						log.debug(stLogTitle, "isnull value : " + isnull);
					}
					if (isnull == 'T') {

						var ErrorMessage = 'Values should not be null for ' + errmsg + ' \n\n<br/><br/>';
						ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

						//if (errmsg === "ACTUAL PICK QTY" && actqty === 0) {
							if (actqty === 0) {

							newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Processed' });
							newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: " " });
						}

						else {
							newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
							newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });

							email.send({
								author: userId,
								recipients: emails,
								subject: strSubject,
								body: ErrorMessage,
								RelatedRecords: Store
							});

							ECB_log.SetStatus({
								statusCode: 'Values should not be null'
							});
							ECB_log.ECBLogEnd({
								ProcessValidationDetails: [],
								ProcessResults: { Store },
								KeyWords: ordno
							});
							return {
								error: '',
								message: ECB_log.Store()
							}
						}
					}
					else {

						var socommittedqty = bfclibrary.getsocommitedqty(ordno, lineno, item);
						log.debug(stLogTitle, "socommittedqty: " + socommittedqty + " for line: " + lineno + " and Item :" + item);
						ECB_log.ScriptLogs({
							name: 'socommittedqty res :',
							value: "socommittedqty: " + socommittedqty + " for line: " + lineno + " and Item :" + item
						});
						if (parseInt(expeqty) > parseInt(socommittedqty)) {

							var ErrorMessage = 'Committed Quantity for the Sales Order ' + ordno + ', Order Line ' + lineno + ', and Item ' + item + ', cannot be greater than the Expected Quantity from the Original Order Line.  \n\n<br/><br/>';
							ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

							newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
							newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });


							email.send({
								author: userId,
								recipients: emails,
								subject: strSubject,
								body: ErrorMessage,
								RelatedRecords: Store
							});

							ECB_log.SetStatus({
								statusCode: 'Committed Qty Issue'
							});
							ECB_log.ECBLogEnd({
								ProcessValidationDetails: [],
								ProcessResults: { Store },
								KeyWords: ordno
							});
							return {
								error: '',
								message: ECB_log.Store()
							}

						}
						else if (parseInt(expeqty) < parseInt(actqty)) {

							var ErrorMessage = 'Pick Quantity for the Sales Order ' + ordno + ', Order Line ' + lineno + ', and Item ' + item + ', cannot be greater than the Expected Quantity from the Original Order Line.  \n\n<br/><br/>';
							ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

							newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
							newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });


							email.send({
								author: userId,
								recipients: emails,
								subject: strSubject,
								body: ErrorMessage,
								RelatedRecords: Store
							});

							ECB_log.SetStatus({
								statusCode: 'Act Qty Issue'
							});
							ECB_log.ECBLogEnd({
								ProcessValidationDetails: [],
								ProcessResults: { Store },
								KeyWords: ordno
							});
							return {
								error: '',
								message: ECB_log.Store()
							}
						}
						else {
							var preferbinres = bfclibrary.getpreferbin(ordno,item, whse);
							log.debug(stLogTitle, "preferbinres res : " + preferbinres);
							ECB_log.ScriptLogs({
								name: 'preferbinres res :',
								value: preferbinres
							});
							if (preferbinres != pickbin) {
								var ErrorMessage = 'Entered bin ' + pickbin + ', is not a Preferred Bin.  \n\n<br/><br/>';
								ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

								newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
								newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });


								email.send({
									author: userId,
									recipients: emails,
									subject: strSubject,
									body: ErrorMessage,
									RelatedRecords: Store
								});

								ECB_log.SetStatus({
									statusCode: 'Preferred Bin Issue'
								});
								ECB_log.ECBLogEnd({
									ProcessValidationDetails: [],
									ProcessResults: { Store },
									KeyWords: ordno
								});
								return {
									error: '',
									message: ECB_log.Store()
								}
							}
							var validtranres = bfclibrary.chkValidTransaction(ordno, lineno, item, whse);
							log.debug(stLogTitle, "validtranres res : " + JSON.stringify(validtranres));

							prefbinid = bfclibrary.GetValidBinInternalId(ordno ,pickbin, whse);
							var primarybinqty = 0;
							var getinvdetails = bfclibrary.getinvdetails(ordno, item, prefbinid);
							log.debug(stLogTitle, "getinvdetails res : " + JSON.stringify(getinvdetails));
							log.debug(stLogTitle, "getinvdetails length : " + (getinvdetails.result.length));

							if (getinvdetails.result.length > 0) {
								primarybinqty = getinvdetails.result[0]["SUM(onhandavail)"];
							}
							else {
								primarybinqty = 0;
							}
							log.debug(stLogTitle, "primarybinqty res : " + JSON.stringify(primarybinqty));
							log.debug(stLogTitle, "validtranres res : " + validtranres);

							if (primarybinqty == null || primarybinqty == '' || primarybinqty == 'null' || primarybinqty == 'undefined') {
								primarybinqty = 0;
							}

							ItemType = bfclibrary.GetItemType(ordno ,item, whse);
							log.debug(stLogTitle, "ItemType Result : " + ItemType);
							ECB_log.ScriptLogs({
								name: 'ItemType Result :',
								value: ItemType
							});
							if (validtranres != 'T') {
								try {
									var ErrorMessage = 'Pick Data sent for the Sales Order ' + ordno + ', Order Line ' + lineno + ' and Item ' + item + ' is not valid line';
									ErrorMessage = ErrorMessage + 'This is a/an ' + ItemType + ' and require ' + parseInt(expeqty) + ' to pick, but have only ' + parseInt(primarybinqty) + ' quantity at ' + timestamp + '.\n\n<br/><br/>';
									ErrorMessage = ErrorMessage + '[ Technical Details of the issue : Inventory Data : ' + JSON.stringify(getinvdetails) + '  BFC Pick Data : ' + bfcPickData + ' ]';

									newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
									newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });


									var ErrorMessage =

										email.send({
											author: userId,
											recipients: emails,
											subject: strSubject,
											body: ErrorMessage,
											RelatedRecords: Store
										});

									ECB_log.SetStatus({
										statusCode: 'Not a valid Transaction'
									});
									ECB_log.ECBLogEnd({
										ProcessValidationDetails: [],
										ProcessResults: { Store },
										KeyWords: ordno
									});
									return {
										error: '',
										message: ECB_log.Store()
									}
								} catch (e) {
									log.debug(e);

									ECB_log.SetStatus({
										statusCode: 'Request Failed'
									});

									ECB_log.ECBLogEnd({
										ProcessValidationDetails: [],
										ProcessResults: { Store },
										KeyWords: ordno
									});
									return {
										error: e.message,
										message: ECB_log.Store()
									}
								}

							}
							else if (parseFloat(primarybinqty) < parseFloat(actqty)) {

								try {
									var timestamp = new Date();
									var ErrorMessage = 'There is no sufficient inventory to process the Pick ' + ordno + ', Order Line ' + lineno + ' and Item ' + item + '.';
									ErrorMessage = ErrorMessage + 'This is a/an ' + ItemType + ' and require ' + parseInt(expeqty) + ' to pick, but have only ' + parseInt(primarybinqty) + ' quantity at ' + timestamp + '.\n\n<br/><br/>';
									ErrorMessage = ErrorMessage + '[ Technical Details of the issue : Inventory Data : ' + JSON.stringify(getinvdetails) + '  BFC Pick Data : ' + bfcPickData + ' ]';

									newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
									newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });


									email.send({
										author: userId,
										recipients: emails,
										subject: strSubject,
										body: ErrorMessage,
										RelatedRecords: Store
									});

									ECB_log.SetStatus({
										statusCode: 'No sufficient inventory'
									});
									ECB_log.ECBLogEnd({
										ProcessValidationDetails: [],
										ProcessResults: { Store },
										KeyWords: ordno
									});
									return {
										error: '',
										message: ECB_log.Store()
									}
								} catch (e) {
									log.debug(e);

									ECB_log.SetStatus({
										statusCode: 'Request Failed'
									});

									ECB_log.ECBLogEnd({
										ProcessValidationDetails: [],
										ProcessResults: { Store },
										KeyWords: ordno
									});
									return {
										error: e.message,
										message: ECB_log.Store()
									}
								}

							}
							else {


								if (context.type == 'create') {
									log.debug(stLogTitle, "into duplicate data : ");
									var DuplicateData = bfclibrary.ChkDuplicateData(ordno, lineno, item);

									log.debug(stLogTitle, "DuplicateData Result  : " + JSON.stringify(DuplicateData.result));
									log.debug(stLogTitle, "DuplicateData Result length  : " + DuplicateData.result.length);

									ECB_log.ScriptLogs({
										name: 'DuplicateData Result',
										value: JSON.stringify(DuplicateData.result)
									});


									if (DuplicateData.result.length > 0 && parseInt(DuplicateData.result[0]["COUNT(custrecord_bfcpickdata_ordno)"]) > 1) {

										var ErrorMessage = 'Data sent for the Sales Order ' + ordno + ', Order Line ' + lineno + ' and Item ' + item + ' is a duplicate send \n\n<br/><br/>';
										ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

										newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
										newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });

										email.send({
											author: userId,
											recipients: emails,
											subject: strSubject,
											body: ErrorMessage,
											RelatedRecords: Store
										});

										ECB_log.SetStatus({
											statusCode: 'Duplicate Data'
										});
										ECB_log.ECBLogEnd({
											ProcessValidationDetails: [],
											ProcessResults: { Store },
											KeyWords: ordno
										});
										return {
											error: '',
											message: ECB_log.Store()
										}
									}
									else {
										log.debug(stLogTitle, 'before invoking map reduce for externalid :' + externalid + " : " + lastpick);
										ECB_log.ScriptLogs({
											name: 'ItemType Result :',
											value: ItemType
										});

										var bfcPickData = 'externalid. = ' + externalid + '<br>';
										bfcPickData = bfcPickData + 'ordno. = ' + ordno + '<br>';
										bfcPickData = bfcPickData + 'lastpick. = ' + lastpick + '<br>';
										bfcPickData = bfcPickData + 'bfcUserId. = ' + bfcUserId + '<br>';
										bfcPickData = bfcPickData + 'emails. = ' + emails + '<br>';

										log.debug(stLogTitle, "before invoking map reduce script Parameters : " + bfcPickData);
										ECB_log.ScriptLogs({
											name: 'before invoking map reduce script Parameters :',
											value: bfcPickData
										});

										if (actqty === 0) {
											newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Processed', });
											newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: " " });
										}

										if (lastpick == true || lastpick == 'true') {
											//write a query on BFC racord to see any of the record contain failed status
											//if results dont call MR script
											// if no result call MR script
											const bfcfieldsquery = query.runSuiteQL({
												query: `
												SELECT custrecord_bfcpickdata_status FROM
                                            customrecord_wmsts_bfcpickdata  WHERE custrecord_bfcpickdata_ordno = ${ordno} AND   
                                             custrecord_bfcpickdata_status like'%Failed%'  
		
									`,
											})
											log.debug(stLogTitle, "bfcfieldsquery Results 2 : " + JSON.stringify(bfcfieldsquery));
											log.debug(stLogTitle, "bfcfieldsquery includes failed : " + JSON.stringify(bfcfieldsquery).includes("Failed"));

											if (!(JSON.stringify(bfcfieldsquery).includes("Failed"))) {
												var MRscript = task.create({ taskType: task.TaskType.MAP_REDUCE });
												MRscript.scriptId = 'customscript_ts_mr_postitemfulfillment';
												//MRscript.deploymentId = 'customdeploy_ts_mr_itemfulfillment_di'; //Commented by Sudheer Pellakuru on 06/01/2020 to utilize all available deployments.
												MRscript.params = {
													"custscript_ts_bfcpickdata_webservices_id": bfcUserId,
													"custscript_ts_bfcpickdata_ordno": ordno,
													"custscript_ts_bfcpickdata_emailaddresses": emails
												};

												MRscript.submit();
											}
										}
									}
								}
								else {
									log.debug(stLogTitle, 'before invoking map reduce for externalid :' + externalid + " : " + lastpick);
									ECB_log.ScriptLogs({
										name: 'ItemType Result :',
										value: ItemType
									});

									var bfcPickData = 'externalid. = ' + externalid + '<br>';
									bfcPickData = bfcPickData + 'ordno. = ' + ordno + '<br>';
									bfcPickData = bfcPickData + 'lastpick. = ' + lastpick + '<br>';
									bfcPickData = bfcPickData + 'bfcUserId. = ' + bfcUserId + '<br>';
									bfcPickData = bfcPickData + 'emails. = ' + emails + '<br>';

									log.debug(stLogTitle, "before invoking map reduce script Parameters : " + bfcPickData);
									ECB_log.ScriptLogs({
										name: 'before invoking map reduce script Parameters :',
										value: bfcPickData
									});

									if (actqty === 0) {
										newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Processed', });
										newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: " " });
									}
									if (lastpick == true || lastpick == 'true') {
										//write a query on BFC racord to see any of the record contain failed status
										//if results dont call MR script
										// if no result call MR script
										const bfcfieldsquery = query.runSuiteQL({
											query: `
											SELECT custrecord_bfcpickdata_status FROM
                                            customrecord_wmsts_bfcpickdata  WHERE custrecord_bfcpickdata_ordno = ${ordno} AND   
                                             custrecord_bfcpickdata_status like'%Failed%'    
	
									`,
										})
										log.debug(stLogTitle, "bfcfieldsquery Results 2 : " + JSON.stringify(bfcfieldsquery));
										log.debug(stLogTitle, "bfcfieldsquery includes failed : " + JSON.stringify(bfcfieldsquery).includes("Failed"));

										if (!(JSON.stringify(bfcfieldsquery).includes("Failed"))) {
											log.debug(stLogTitle, "no failed records before invoking MR script :");
											var MRscript = task.create({ taskType: task.TaskType.MAP_REDUCE });
											MRscript.scriptId = 'customscript_ts_mr_postitemfulfillment';
											//MRscript.deploymentId = null; //Commented by Sudheer Pellakuru on 06/01/2020 to utilize all available deployments.
											MRscript.params = {
												"custscript_ts_bfcpickdata_webservices_id": bfcUserId,
												"custscript_ts_bfcpickdata_ordno": ordno,
												"custscript_ts_bfcpickdata_emailaddresses": emails
											};

											MRscript.submit();
										}
									}
								}
							}

						}

					}
				}
				else if (context.type == 'delete') {

					var errorObj = error.create({
						name: 'Cannot Delete',
						message: 'We cannot DELETE a PICK Task once created',
						notifyOff: false
					});
					log.debug("errorObj : ", errorObj);
					throw (errorObj);
				}


			} catch (e) {
				log.debug(e);

				ECB_log.SetStatus({
					statusCode: 'Request Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [],
					ProcessResults: { Store },
					KeyWords: ordno
				});
				if (e.name == "Cannot Delete") {
					throw e;
				}
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}*/

		}


		function afterSubmit(context) {
			try {
				log.debug(stLogTitle, "Userevetn start: ");
				emails = runtime.getCurrentScript().getParameter({ name: 'custscript_ts_ifd_emp_emailaddresses' });
				bfcUserId = runtime.getCurrentScript().getParameter({ name: 'custscript_ts_bfc_webservices_id_ue' });
				userId = runtime.getCurrentUser().id;
				executionContext = runtime.executionContext;
				log.debug(stLogTitle, "Userevetn log before ECB logging: ");
				ECB_log.ECBLogStart({
					scriptid: 'WMSTS_UE_BFCIntegration.js',
					OriginalRequest: context
				});

				ECB_log.ScriptLogs({
					name: 'afterSubmit Start',
					value: 'Start Script Execution'
				});

				//var newRecord = context.newRecord;
				var recId = context.newRecord.id;
				log.debug(stLogTitle, "recId : " + recId);
				var newRecord = record.load({
					type: 'customrecord_wmsts_bfcpickdata',
					id: recId,
					isDynamic: true,
				});

				log.debug(stLogTitle, "Userevetn log after newrecord loading: ");
				externalid = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_externalid' });
				whse = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_whse' });
				ordno = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_ordno' });
				ordnotext = newRecord.getText({ fieldId: 'custrecord_bfcpickdata_ordno' });
				lineno = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_lineno' });
				item = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_item' });
				itemtext = newRecord.getText({ fieldId: 'custrecord_bfcpickdata_item' });
				pickbin = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_pickbin' });
				expeqty = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_expeqty' });
				actqty = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_actqty' });
				route = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_route' });
				stop = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_stop' });
				catchwght = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_catchwght' });
				status = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_status' });
				lastpick = newRecord.getValue({ fieldId: 'custrecord_bfcpickdata_lastpick' });
				inventoryBinDetails = [];
				openTaskBinDetails = [];

				var BFCObj = {
					externalid: externalid,
					whse: whse,
					ordno: ordno,
					ordno: ordno,
					lineno: lineno,
					item: item,
					item: item,
					pickbin: pickbin,
					expeqty: expeqty,
					actqty: actqty,
					route: route,
					stop: stop,
					catchwght: catchwght,
					status: status,
					lastpick: lastpick
				}
				var ScriptParameters = {
					emails: emails,
					userID: userId,
					scriptid: 'WMSTS_UE_BFCIntegration.js',
					scriptName: 'BFC Integration UE',
				}

				var Store = {
					type: 'UserEvent',
					ScriptParameters: ScriptParameters,
					Error: '',
					BFCRecord: BFCObj,
					ItemType: '',
					InvAvailable: ''
				};

				var bfcPickData = 'Type. = ' + newRecord.type + '<br>';
				bfcPickData = bfcPickData + 'Externalid. = ' + externalid + '<br>';
				bfcPickData = bfcPickData + 'Warehouse. = ' + whse + '<br>';
				bfcPickData = bfcPickData + 'Sales Order #' + ordno + '<br>';
				bfcPickData = bfcPickData + 'Sales Order Line#. = ' + lineno + '<br>';
				bfcPickData = bfcPickData + 'Item. = ' + item + '<br>';
				bfcPickData = bfcPickData + 'Itemtext. = ' + itemtext + '<br>';
				bfcPickData = bfcPickData + 'ordnotext. = ' + ordnotext + '<br>';
				bfcPickData = bfcPickData + 'Pick Bin. = ' + pickbin + '<br>';
				bfcPickData = bfcPickData + 'Expected Quantity. = ' + expeqty + '<br>';
				bfcPickData = bfcPickData + 'Actual Quantity' + actqty + '<br>';
				bfcPickData = bfcPickData + 'Route. = ' + route + '<br>';
				bfcPickData = bfcPickData + 'Stop. = ' + stop + '<br>';
				bfcPickData = bfcPickData + 'Catch weight. = ' + catchwght + '<br>';
				bfcPickData = bfcPickData + 'Status. = ' + status + '<br>';
				bfcPickData = bfcPickData + 'Sales Order # text. = ' + ordno + '<br>';
				bfcPickData = bfcPickData + 'Is Lastpick. = ' + lastpick + '<br>';
				bfcPickData = bfcPickData + 'emails. = ' + emails + '<br>';
				bfcPickData = bfcPickData + 'bfcUserId. = ' + bfcUserId + '<br>';
				bfcPickData = bfcPickData + 'userID. = ' + userId + '<br>';
				bfcPickData = bfcPickData + 'context type. = ' + context.type + '<br>';
				bfcPickData = bfcPickData + 'executionContext. = ' + executionContext + '<br>';

				var strSubject = 'Error while writing BFC Records to the Sales Order# ' + ordnotext;

				log.debug(stLogTitle, "BFCPickDataProcessUE Parameters : " + bfcPickData);
				ECB_log.ScriptLogs({
					name: 'BFCPickDataProcessUE Parameters',
					value: bfcPickData
				});
				var isnull = 'F'; var errmsg = new Array();

				if ((context.type == 'create' || ((context.type == 'edit' || context.type == 'xedit') && (executionContext == 'USERINTERFACE') && (userId != bfcUserId))) && status === "Picked") {
					//checks if any values are missing.
					log.debug(stLogTitle, "Before checking if any values are missing : YES");
					ECB_log.ScriptLogs({
						name: 'Before checking if any values are missing :',
						value: 'Yes'
					});

					if (actqty == null || actqty == '')
						actqty = 0;

					ChkNullValueInParameters = bfclibrary.checkForNullValueInParameters(isnull, externalid, whse, ordno, lineno, item, pickbin, expeqty, actqty, route, stop, catchwght);
					log.debug(stLogTitle, "ChkNullValueInParameters results : " + (ChkNullValueInParameters));
					ECB_log.ScriptLogs({
						name: 'ChkNullValueInParameters results :',
						value: JSON.stringify(ChkNullValueInParameters)
					});
					if (ChkNullValueInParameters != null && ChkNullValueInParameters != '') {
						isnull = ChkNullValueInParameters.split(":")[0];//returns T if any field is empty
						errmsg = ChkNullValueInParameters.split(":")[1];//returns an array of fields that are missing, and these will be shown in the error message.
						log.debug(stLogTitle, "errmsg value : " + errmsg);
						log.debug(stLogTitle, "isnull value : " + isnull);
					}
					if (isnull == 'T') {

						var ErrorMessage = 'Values should not be null for ' + errmsg + ' \n\n<br/><br/>';
						ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

						//if (errmsg === "ACTUAL PICK QTY" && actqty === 0) {
						if (actqty === 0) {

							//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Processed' });
							//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: " " });

							var id = record.submitFields({
								type: 'customrecord_wmsts_bfcpickdata',
								id: recId,
								values: {
									custrecord_bfcpickdata_status: 'Processed',
									custrecord_bfcpickdata_errorlog: ''
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields: true
								}
							});
						}

						else {
							//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
							//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });

							var id = record.submitFields({
								type: 'customrecord_wmsts_bfcpickdata',
								id: recId,
								values: {
									custrecord_bfcpickdata_status: 'Failed - BFC to NS Validation',
									custrecord_bfcpickdata_errorlog: ErrorMessage
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields: true
								}
							});

							email.send({
								author: userId,
								recipients: emails,
								subject: strSubject,
								body: ErrorMessage,
								RelatedRecords: Store
							});

							ECB_log.SetStatus({
								statusCode: 'Values should not be null'
							});
							ECB_log.ECBLogEnd({
								ProcessValidationDetails: [],
								ProcessResults: { Store },
								KeyWords: ordnotext
							});
							return {
								error: '',
								message: ECB_log.Store()
							}
						}
					}
					else {

						var socommittedqty = bfclibrary.getsocommitedqty(ordno, lineno, item);
						log.debug(stLogTitle, "socommittedqty: " + socommittedqty + " for line: " + lineno + " and Item :" + itemtext);
						ECB_log.ScriptLogs({
							name: 'socommittedqty res :',
							value: "socommittedqty: " + socommittedqty + " for line: " + lineno + " and Item :" + itemtext
						});
						if (parseInt(expeqty) > parseInt(socommittedqty) && (actqty !== 0) ) {

							var ErrorMessage = 'Committed Quantity for the Sales Order ' + ordnotext + ', Order Line ' + lineno + ', and Item ' + itemtext + ', cannot be greater than the Expected Quantity from the Original Order Line.  \n\n<br/><br/>';
							ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

							//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
							//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });

							var id = record.submitFields({
								type: 'customrecord_wmsts_bfcpickdata',
								id: recId,
								values: {
									custrecord_bfcpickdata_status: 'Failed - BFC to NS Validation',
									custrecord_bfcpickdata_errorlog: ErrorMessage
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields: true
								}
							});

							email.send({
								author: userId,
								recipients: emails,
								subject: strSubject,
								body: ErrorMessage,
								RelatedRecords: Store
							});

							ECB_log.SetStatus({
								statusCode: 'Committed Qty Issue'
							});
							ECB_log.ECBLogEnd({
								ProcessValidationDetails: [],
								ProcessResults: { Store },
								KeyWords: ordnotext
							});
							return {
								error: '',
								message: ECB_log.Store()
							}

						}
						else if ( parseInt(expeqty) < parseInt(actqty) && (actqty !== 0)) {
							log.debug("(expeqty) < (actqty)")

							var ErrorMessage = 'Pick Quantity for the Sales Order ' + ordnotext + ', Order Line ' + lineno + ', and Item ' + itemtext + ', cannot be greater than the Expected Quantity from the Original Order Line.  \n\n<br/><br/>';
							ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

							//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
							//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });

							var id = record.submitFields({
								type: 'customrecord_wmsts_bfcpickdata',
								id: recId,
								values: {
									custrecord_bfcpickdata_status: 'Failed - BFC to NS Validation',
									custrecord_bfcpickdata_errorlog: ErrorMessage
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields: true
								}
							});


							email.send({
								author: userId,
								recipients: emails,
								subject: strSubject,
								body: ErrorMessage,
								RelatedRecords: Store
							});

							ECB_log.SetStatus({
								statusCode: 'Act Qty Issue'
							});
							ECB_log.ECBLogEnd({
								ProcessValidationDetails: [],
								ProcessResults: { Store },
								KeyWords: ordno
							});
							return {
								error: '',
								message: ECB_log.Store()
							}
						}
						else {
							var preferbinres = bfclibrary.getpreferbin(ordno, item, whse);
							log.debug(stLogTitle, "preferbinres res : " + preferbinres);
							ECB_log.ScriptLogs({
								name: 'preferbinres res :',
								value: preferbinres
							});
							if ( (preferbinres != pickbin) && (actqty !== 0) ) {
								var ErrorMessage = 'Entered bin ' + pickbin + ', is not a Preferred Bin.  \n\n<br/><br/>';
								ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

								//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
								//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });

								var id = record.submitFields({
									type: 'customrecord_wmsts_bfcpickdata',
									id: recId,
									values: {
										custrecord_bfcpickdata_status: 'Failed - BFC to NS Validation',
										custrecord_bfcpickdata_errorlog: ErrorMessage
									},
									options: {
										enableSourcing: false,
										ignoreMandatoryFields: true
									}
								});


								email.send({
									author: userId,
									recipients: emails,
									subject: strSubject,
									body: ErrorMessage,
									RelatedRecords: Store
								});

								ECB_log.SetStatus({
									statusCode: 'Preferred Bin Issue'
								});
								ECB_log.ECBLogEnd({
									ProcessValidationDetails: [],
									ProcessResults: { Store },
									KeyWords: ordnotext
								});
								return {
									error: '',
									message: ECB_log.Store()
								}
							}
							var validtranres = bfclibrary.chkValidTransaction(ordno, lineno, item, whse);
							log.debug(stLogTitle, "validtranres res : " + JSON.stringify(validtranres));

							prefbinid = bfclibrary.GetValidBinInternalId(ordno, pickbin, whse);
							var primarybinqty = 0;
							var getinvdetails = bfclibrary.getinvdetails(ordno, item, prefbinid);
							log.debug(stLogTitle, "getinvdetails res : " + JSON.stringify(getinvdetails));
							log.debug(stLogTitle, "getinvdetails length : " + (getinvdetails.result.length));

							if (getinvdetails.result.length > 0) {
								primarybinqty = getinvdetails.result[0]["SUM(onhandavail)"];
							}
							else {
								primarybinqty = 0;
							}
							log.debug(stLogTitle, "primarybinqty res : " + JSON.stringify(primarybinqty));
							log.debug(stLogTitle, "validtranres res : " + validtranres);

							if (primarybinqty == null || primarybinqty == '' || primarybinqty == 'null' || primarybinqty == 'undefined') {
								primarybinqty = 0;
							}

							ItemType = bfclibrary.GetItemType(ordno, item, whse);
							log.debug(stLogTitle, "ItemType Result : " + ItemType);
							ECB_log.ScriptLogs({
								name: 'ItemType Result :',
								value: ItemType
							});
							if ( validtranres != 'T' && (actqty !== 0) ) {
								try {
									var ErrorMessage = 'Pick Data sent for the Sales Order ' + ordnotext + ', Order Line ' + lineno + ' and Item ' + itemtext + ' is not valid line';
									ErrorMessage = ErrorMessage + 'This is a/an ' + ItemType + ' and require ' + parseInt(expeqty) + ' to pick, but have only ' + parseInt(primarybinqty) + ' quantity at ' + timestamp + '.\n\n<br/><br/>';
									ErrorMessage = ErrorMessage + '[ Technical Details of the issue : Inventory Data : ' + JSON.stringify(getinvdetails) + '  BFC Pick Data : ' + bfcPickData + ' ]';

									//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
									//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });

									var id = record.submitFields({
										type: 'customrecord_wmsts_bfcpickdata',
										id: recId,
										values: {
											custrecord_bfcpickdata_status: 'Failed - BFC to NS Validation',
											custrecord_bfcpickdata_errorlog: ErrorMessage
										},
										options: {
											enableSourcing: false,
											ignoreMandatoryFields: true
										}
									});
									var ErrorMessage =

										email.send({
											author: userId,
											recipients: emails,
											subject: strSubject,
											body: ErrorMessage,
											RelatedRecords: Store
										});

									ECB_log.SetStatus({
										statusCode: 'Not a valid Transaction'
									});
									ECB_log.ECBLogEnd({
										ProcessValidationDetails: [],
										ProcessResults: { Store },
										KeyWords: ordnotext
									});
									return {
										error: '',
										message: ECB_log.Store()
									}
								} catch (e) {
									log.debug(e);

									ECB_log.SetStatus({
										statusCode: 'Request Failed'
									});

									ECB_log.ECBLogEnd({
										ProcessValidationDetails: [],
										ProcessResults: { Store },
										KeyWords: ordnotext
									});
									return {
										error: e.message,
										message: ECB_log.Store()
									}
								}

							}
							else if (parseFloat(primarybinqty) < parseFloat(actqty)  && (actqty !== 0)) {

								try {
									var timestamp = new Date();
									var ErrorMessage = 'There is no sufficient inventory to process the Pick ' + ordnotext + ', Order Line ' + lineno + ' and Item ' + itemtext + '.';
									ErrorMessage = ErrorMessage + 'This is a/an ' + ItemType + ' and require ' + parseInt(expeqty) + ' to pick, but have only ' + parseInt(primarybinqty) + ' quantity at ' + timestamp + '.\n\n<br/><br/>';
									ErrorMessage = ErrorMessage + '[ Technical Details of the issue : Inventory Data : ' + JSON.stringify(getinvdetails) + '  BFC Pick Data : ' + bfcPickData + ' ]';

									//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
									//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });

									var id = record.submitFields({
										type: 'customrecord_wmsts_bfcpickdata',
										id: recId,
										values: {
											custrecord_bfcpickdata_status: 'Failed - BFC to NS Validation',
											custrecord_bfcpickdata_errorlog: ErrorMessage
										},
										options: {
											enableSourcing: false,
											ignoreMandatoryFields: true
										}
									});

									email.send({
										author: userId,
										recipients: emails,
										subject: strSubject,
										body: ErrorMessage,
										RelatedRecords: Store
									});

									ECB_log.SetStatus({
										statusCode: 'No sufficient inventory'
									});
									ECB_log.ECBLogEnd({
										ProcessValidationDetails: [],
										ProcessResults: { Store },
										KeyWords: ordnotext
									});
									return {
										error: '',
										message: ECB_log.Store()
									}
								} catch (e) {
									log.debug(e);

									ECB_log.SetStatus({
										statusCode: 'Request Failed'
									});

									ECB_log.ECBLogEnd({
										ProcessValidationDetails: [],
										ProcessResults: { Store },
										KeyWords: ordnotext
									});
									return {
										error: e.message,
										message: ECB_log.Store()
									}
								}

							}
							else {


								if (context.type == 'create') {
									log.debug(stLogTitle, "into duplicate data : ");
									var DuplicateData = bfclibrary.ChkDuplicateData(ordno, lineno, item);

									log.debug(stLogTitle, "DuplicateData Result  : " + JSON.stringify(DuplicateData.result));
									log.debug(stLogTitle, "DuplicateData Result length  : " + DuplicateData.result.length);

									ECB_log.ScriptLogs({
										name: 'DuplicateData Result',
										value: JSON.stringify(DuplicateData.result)
									});


									if (DuplicateData.result.length > 0 && parseInt(DuplicateData.result[0]["COUNT(custrecord_bfcpickdata_ordno)"]) > 1) {

										var ErrorMessage = 'Data sent for the Sales Order ' + ordnotext + ', Order Line ' + lineno + ' and Item ' + itemtext + ' is a duplicate send \n\n<br/><br/>';
										ErrorMessage = ErrorMessage + '[Technical Details of the issue BFC Pick Data : ' + bfcPickData + ']';

										//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: ErrorMessage, });
										//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Failed - BFC to NS Validation', });

										var id = record.submitFields({
											type: 'customrecord_wmsts_bfcpickdata',
											id: recId,
											values: {
												custrecord_bfcpickdata_status: 'Failed - BFC to NS Validation',
												custrecord_bfcpickdata_errorlog: ErrorMessage
											},
											options: {
												enableSourcing: false,
												ignoreMandatoryFields: true
											}
										});

										email.send({
											author: userId,
											recipients: emails,
											subject: strSubject,
											body: ErrorMessage,
											RelatedRecords: Store
										});

										ECB_log.SetStatus({
											statusCode: 'Duplicate Data'
										});
										ECB_log.ECBLogEnd({
											ProcessValidationDetails: [],
											ProcessResults: { Store },
											KeyWords: ordno
										});
										return {
											error: '',
											message: ECB_log.Store()
										}
									}
									else {
										log.debug(stLogTitle, 'before invoking map reduce for externalid :' + externalid + " : " + lastpick);
										ECB_log.ScriptLogs({
											name: 'ItemType Result :',
											value: ItemType
										});

										var bfcPickData = 'externalid. = ' + externalid + '<br>';
										bfcPickData = bfcPickData + 'ordno. = ' + ordnotext + '<br>';
										bfcPickData = bfcPickData + 'lastpick. = ' + lastpick + '<br>';
										bfcPickData = bfcPickData + 'bfcUserId. = ' + bfcUserId + '<br>';
										bfcPickData = bfcPickData + 'emails. = ' + emails + '<br>';

										log.debug(stLogTitle, "before invoking map reduce script Parameters : " + bfcPickData);
										ECB_log.ScriptLogs({
											name: 'before invoking map reduce script Parameters :',
											value: bfcPickData
										});

										if (actqty === 0) {
											//	newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Processed', });
											//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: " " });

											var id = record.submitFields({
												type: 'customrecord_wmsts_bfcpickdata',
												id: recId,
												values: {
													custrecord_bfcpickdata_status: 'Processed',
													custrecord_bfcpickdata_errorlog: ''
												},
												options: {
													enableSourcing: false,
													ignoreMandatoryFields: true
												}
											});
										}

										if (lastpick == true || lastpick == 'true') {
											//write a query on BFC racord to see any of the record contain failed status
											//if results dont call MR script
											// if no result call MR script
											const bfcfieldsquery = query.runSuiteQL({
												query: `
												SELECT custrecord_bfcpickdata_status FROM
                                            customrecord_wmsts_bfcpickdata  WHERE custrecord_bfcpickdata_ordno = ${ordno} AND   
                                             custrecord_bfcpickdata_status like'%Failed%'  
		
									`,
											})
											log.debug(stLogTitle, "bfcfieldsquery Results 1 : " + JSON.stringify(bfcfieldsquery));
											log.debug(stLogTitle, "bfcfieldsquery includes failed 1: " + JSON.stringify(bfcfieldsquery).includes("Failed"));

											ECB_log.ScriptLogs({
												name: 'bfcfieldsquery Results 1',
												value: JSON.stringify(bfcfieldsquery)
											});
											ECB_log.ScriptLogs({
												name: 'bfcfieldsquery includes failed 1:',
												value: JSON.stringify(bfcfieldsquery).includes("Failed")
											});						
										
											ECB_log.ECBLogEnd({
												ProcessValidationDetails: [JSON.stringify(bfcfieldsquery)],
												ProcessResults: {},
												KeyWords: ordnotext
											});					
	

											if (!(JSON.stringify(bfcfieldsquery).includes("Failed"))) {
												var MRscript = task.create({ taskType: task.TaskType.MAP_REDUCE });
												MRscript.scriptId = 'customscript_ts_mr_postitemfulfillment';
												//MRscript.deploymentId = 'customdeploy_ts_mr_itemfulfillment_di'; //Commented by Sudheer Pellakuru on 06/01/2020 to utilize all available deployments.
												MRscript.params = {
													"custscript_ts_bfcpickdata_webservices_id": bfcUserId,
													"custscript_ts_bfcpickdata_ordno": ordno,
													"custscript_ts_bfcpickdata_emailaddresses": emails
												};

												MRscript.submit();
											}
										}
									}
								}
								else {
									log.debug(stLogTitle, 'before invoking map reduce for externalid :' + externalid + " : " + lastpick);
									ECB_log.ScriptLogs({
										name: 'ItemType Result :',
										value: ItemType
									});

									var bfcPickData = 'externalid. = ' + externalid + '<br>';
									bfcPickData = bfcPickData + 'ordno. = ' + ordnotext + '<br>';
									bfcPickData = bfcPickData + 'lastpick. = ' + lastpick + '<br>';
									bfcPickData = bfcPickData + 'bfcUserId. = ' + bfcUserId + '<br>';
									bfcPickData = bfcPickData + 'emails. = ' + emails + '<br>';

									log.debug(stLogTitle, "before invoking map reduce script Parameters : " + bfcPickData);
									ECB_log.ScriptLogs({
										name: 'before invoking map reduce script Parameters :',
										value: bfcPickData
									});

									if (actqty === 0) {
										//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_status', value: 'Processed', });
										//newRecord.setValue({ fieldId: 'custrecord_bfcpickdata_errorlog', value: " " });

										var id = record.submitFields({
											type: 'customrecord_wmsts_bfcpickdata',
											id: recId,
											values: {
												custrecord_bfcpickdata_status: 'Processed',
												custrecord_bfcpickdata_errorlog: ''
											},
											options: {
												enableSourcing: false,
												ignoreMandatoryFields: true
											}
										});
									}
									if (lastpick == true || lastpick == 'true') {
										//write a query on BFC racord to see any of the record contain failed status
										//if results dont call MR script
										// if no result call MR script
										const bfcfieldsquery = query.runSuiteQL({
											query: `
											SELECT custrecord_bfcpickdata_status FROM
                                            customrecord_wmsts_bfcpickdata  WHERE custrecord_bfcpickdata_ordno = ${ordno} AND   
                                             custrecord_bfcpickdata_status like'%Failed%'    
	
									`,
										})
										log.debug(stLogTitle, "bfcfieldsquery Results 2 : " + JSON.stringify(bfcfieldsquery));
										log.debug(stLogTitle, "bfcfieldsquery includes failed 2: " + JSON.stringify(bfcfieldsquery).includes("Failed"));


										ECB_log.ScriptLogs({
											name: 'bfcfieldsquery Results 2',
											value: JSON.stringify(bfcfieldsquery)
										});
										ECB_log.ScriptLogs({
											name: 'bfcfieldsquery includes failed 2:',
											value: JSON.stringify(bfcfieldsquery).includes("Failed")
										});						
									
										ECB_log.ECBLogEnd({
											ProcessValidationDetails: [JSON.stringify(bfcfieldsquery)],
											ProcessResults: {},
											KeyWords: ordnotext
										});					


										if (!(JSON.stringify(bfcfieldsquery).includes("Failed"))) {
											log.debug(stLogTitle, "no failed records before invoking MR script :");
											var MRscript = task.create({ taskType: task.TaskType.MAP_REDUCE });
											MRscript.scriptId = 'customscript_ts_mr_postitemfulfillment';
											//MRscript.deploymentId = null; //Commented by Sudheer Pellakuru on 06/01/2020 to utilize all available deployments.
											MRscript.params = {
												"custscript_ts_bfcpickdata_webservices_id": bfcUserId,
												"custscript_ts_bfcpickdata_ordno": ordno,
												"custscript_ts_bfcpickdata_emailaddresses": emails
											};

											MRscript.submit();
										}
									}
								}
							}

						}

					}
				}
				else if (context.type == 'delete') {

					var errorObj = error.create({
						name: 'Cannot Delete',
						message: 'We cannot DELETE a PICK Task once created',
						notifyOff: false
					});
					log.debug("errorObj : ", errorObj);
					throw (errorObj);
				}


			} catch (e) {
				log.debug(e);

				ECB_log.SetStatus({
					statusCode: 'Request Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [],
					ProcessResults: { Store },
					KeyWords: ordnotext
				});
				if (e.name == "Cannot Delete") {
					throw e;
				}
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}

		}

		return {
			afterSubmit: afterSubmit,
			beforeSubmit: beforeSubmit
		};
	});
