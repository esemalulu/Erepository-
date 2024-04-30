/**
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
 * * Version    Date            Author           		Remarks
 *   1.00       1 Apr 2020		Mahesh Babu        	Initial Version
 *
 **/


/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/search', 'N/error', 'N/record', 'N/runtime', 'N/format', 'N/query', 'N/config', './WMSTS_IFD_BFCIntegration_Lib.js', './WMSTS_ECB_Lib_Exec_Log.js'],

	function (search, error, record, runtime, format, query, config, bfclibrary, ECB_log) {
		var stLogTitle = "MapReduce_PostIF";
		function getInputData() {

			try {

				var BFCpickdataobj = {};
				log.debug(stLogTitle, "GetInputData Start : Start Script Execution");
				ECB_log.ECBLogStart({
					scriptid: 'WMSTS_MR_postitemfulfillment.js',
					OriginalRequest: ''
				});

				ECB_log.ScriptLogs({
					name: 'GetInputData Start',
					value: 'Start Script Execution'
				});

				var scriptObj = runtime.getCurrentScript();

				var ordno = scriptObj.getParameter({ name: 'custscript_ts_bfcpickdata_ordno' });

				var str = 'scriptObj. = ' + scriptObj + '<br>';
				str = str + 'ordno. = ' + ordno + '<br>';

				log.debug(stLogTitle, "getInputData Parameters : " + str);
				ECB_log.ScriptLogs({
					name: 'getInputData Parameters',
					value: str
				});

				const columns = [
					"custrecord_bfcpickdata_externalid",
					"custrecord_bfcpickdata_ordno",
					"custrecord_bfcpickdata_lineno",
					"custrecord_bfcpickdata_expeqty",
					"custrecord_bfcpickdata_actqty",
					"custrecord_bfcpickdata_route",
					"custrecord_bfcpickdata_stop",
					"custrecord_bfcpickdata_catchwght",
					"custrecord_bfcpickdata_status",
					"custrecord_bfcpickdata_errorlog",
					"custrecord_bfcpickdata_lastpick",
					"custrecord_bfcpickdata_whse",
					"custrecord_bfcpickdata_item",
					"custrecord_bfcpickdata_pickbin",
				]

				const mapResultsToColumns = (result) => {
					let resultObj = {}

					var vitemid = '', vBinId = '', vLocation = '', vitemType = '', ValidBinInternalId = '';
					for (columnIndex in columns) {

						//log.debug("columnIndex", columnIndex)
						resultObj[columns[columnIndex]] = result.values[columnIndex];

						if (columnIndex == "11") {
							vLocation = result.values[columnIndex];
							//log.debug("vLocation", vLocation)
						}
						if (columnIndex == "12") {
							vitemid = result.values[columnIndex];
						//	log.debug("vitemid", vitemid)
						}
						if (columnIndex == "13") {
							vBinId = result.values[columnIndex];
						//	log.debug("vBinId", vBinId)
						}

						if (ordno != "" && vitemid != "" && vLocation != "" && vBinId == "") {
						//	log.debug("into vitemType", 'yes')
							vitemType = bfclibrary.GetItemType(ordno, vitemid, vLocation);
						}
						if (ordno != "" && vBinId != "" && vLocation != "") {
						//	log.debug("into ValidBinInternalId", 'yes')
							ValidBinInternalId = bfclibrary.GetValidBinInternalId(ordno, vBinId, vLocation);
						}
						if (vitemType != '' && vitemType != null) {
							resultObj["vitemType"] = vitemType;
						}

						if (ValidBinInternalId != '' && ValidBinInternalId != null) {
							resultObj["ValidBinInternalId"] = ValidBinInternalId
						}

						//log.debug("vitemType", vitemType)
						//log.debug("ValidBinInternalId", ValidBinInternalId)
					}
					return resultObj
				}

				const bfcfieldsquery = query.runSuiteQL({
					query: `
				SELECT ${columns} FROM
				customrecord_wmsts_bfcpickdata  WHERE custrecord_bfcpickdata_ordno = ${ordno}	AND custrecord_bfcpickdata_actqty > 0	
		`,
				})

				const bfcfieldsqueryResults = bfcfieldsquery.results.map(result => mapResultsToColumns(result))
				log.debug(stLogTitle, "bfcfieldsquery Results : " + JSON.stringify(bfcfieldsqueryResults));
				ECB_log.ScriptLogs({
					name: 'bfcfieldsquery Results',
					value: JSON.stringify(bfcfieldsqueryResults)
				});

				BFCpickdataobj.result = bfcfieldsqueryResults;

				ECB_log.ScriptLogs({
					name: 'End',
					value: 'End of getInputData Function'
				});

				ECB_log.SetStatus({
					statusCode: 'Request Success'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [JSON.stringify(bfcfieldsqueryResults)],
					ProcessResults: {},
					KeyWords: ordno
				});

			} catch (e) {
				log.debug(stLogTitle, " exception in getInputData function  :" + e);
				ECB_log.ScriptLogs({
					name: 'exception in getInputData function',
					value: e
				});
				ECB_log.SetStatus({
					statusCode: 'GetInput Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [JSON.stringify(bfcfieldsqueryResults)],
					ProcessResults: { e: e },
					KeyWords: ordno
				});
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}

			return BFCpickdataobj;
		}

		function reduce(context) {

			try {

				var scriptObj = runtime.getCurrentScript();
				log.debug("Remaining governance units in reduce function begin: " + scriptObj.getRemainingUsage());

				var vitemid = '', vBinId = '', vLocation = '', actpickqty = 0, expeqty = 0, ifordno = '', iflineno = '', catchweight = 0;

				ECB_log.ECBLogStart({
					scriptid: 'WMSTS_MR_postitemfulfillment.js',
					OriginalRequest: JSON.parse(JSON.stringify(context.key))
				});

				ECB_log.ScriptLogs({
					name: 'reduce Start',
					value: 'Start Script Execution'
				});

				//	log.debug(stLogTitle, "MR Reduce context  : " + JSON.parse(JSON.stringify(context.values)));
				ECB_log.ScriptLogs({
					name: 'MR Reduce context  :',
					value: JSON.parse(JSON.stringify(context.values))
				});

				var MRscriptIFobj = JSON.parse(JSON.parse(JSON.stringify(context.values)));
				//var scriptObj = runtime.getCurrentScript();

				var ifordno = scriptObj.getParameter({ name: 'custscript_ts_bfcpickdata_ordno' });
				var bfcUserId = scriptObj.getParameter({ name: 'custscript_ts_bfcpickdata_webservices_id' });
				var emails = scriptObj.getParameter({ name: 'custscript_ts_bfcpickdata_emailaddresses' });

				var fields = ['shipdate'];
				var soRec = search.lookupFields({
					type: 'salesorder',
					id: ifordno,
					columns: fields
				});
				var soshipdate = soRec.shipdate;

				//log.debug(stLogTitle, "soshipdate : " + soshipdate);

				var bfcPickData = 'ifordno. = ' + ifordno + '<br>';
				bfcPickData = bfcPickData + 'bfcUserId. = ' + bfcUserId + '<br>';
				bfcPickData = bfcPickData + 'emails. = ' + emails + '<br>';
				bfcPickData = bfcPickData + 'MRscriptIFobj. = ' + MRscriptIFobj + '<br>';

				//log.debug(stLogTitle, "input Parameters from map : " + bfcPickData);
				ECB_log.ScriptLogs({
					name: 'input Parameters from map :',
					value: bfcPickData
				});
				var vitemType = '', ValidBinInternalId = '';

				var BFCSearchResults = []; var parsedsoshipdate = '';

				for (var m = 0; m < MRscriptIFobj.length; m++) {
					var IFArray = (MRscriptIFobj[m]);
					BFCSearchResults.push(IFArray);
				}

				var trecord = record.transform({
					fromType: record.Type.SALES_ORDER,
					fromId: ifordno,
					toType: record.Type.ITEM_FULFILLMENT
				});

				var currDate = DateStamp();
				var parsedCurrentDate = format.parse({
					value: currDate,
					type: format.Type.DATE
				});

				if (soshipdate != null && soshipdate != "" && soshipdate != 'null') {
					parsedsoshipdate = format.parse({
						value: soshipdate,
						type: format.Type.DATE
					});
				}

				trecord.setValue({ fieldId: 'shipstatus', value: 'C' });
				trecord.setValue({ fieldId: 'trandate', value: parsedCurrentDate });
				trecord.setValue({ fieldId: 'location', value: vLocation });
				trecord.setValue({ fieldId: 'trandate', value: parsedsoshipdate });
				//log.debug("reduce parsedCurrentDate: ", parsedCurrentDate);

				//log.debug(stLogTitle, "BFCSearchResults length : " + BFCSearchResults.length);
				ECB_log.ScriptLogs({
					name: 'BFCSearchResults length  :',
					value: BFCSearchResults.length
				});
				for (var n = 0; n < BFCSearchResults.length; n++) {

					log.debug("Remaining governance units in BFCSearchResults for loop: " + scriptObj.getRemainingUsage());

					vitemid = BFCSearchResults[n]["custrecord_bfcpickdata_item"]
					//log.debug(stLogTitle, "vitemid in for loop : " + vitemid);
					vBinId = BFCSearchResults[n]["custrecord_bfcpickdata_pickbin"]
					vLocation = BFCSearchResults[n]["custrecord_bfcpickdata_whse"]
					actpickqty = BFCSearchResults[n]["custrecord_bfcpickdata_actqty"]
					expeqty = BFCSearchResults[n]["custrecord_bfcpickdata_expeqty"]
					//	ifordno = BFCSearchResults[i]["custrecord_bfcpickdata_ordno"]
					iflineno = BFCSearchResults[n]["custrecord_bfcpickdata_lineno"]
					catchweight = BFCSearchResults[n]["custrecord_bfcpickdata_catchwght"]

					vitemType = BFCSearchResults[n]["vitemType"]
					ValidBinInternalId = BFCSearchResults[n]["ValidBinInternalId"]


					var lineCount = trecord.getLineCount({ sublistId: 'item' });
					//log.debug(stLogTitle, "lineCount: " + lineCount);

					ECB_log.ScriptLogs({
						name: 'lineCount  :',
						value: lineCount
					});
					for (var i = 0; i < lineCount; i++) {

						var SubRecorditem = trecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
						var itemLineNo = trecord.getSublistValue({ sublistId: 'item', fieldId: 'line', line: i });

						if ((SubRecorditem == vitemid) && (parseInt(itemLineNo) == parseInt(iflineno))) {

							trecord.setSublistValue({ sublistId: 'item', line: i, fieldId: 'itemreceive', value: true });
							trecord.setSublistValue({ sublistId: 'item', line: i, fieldId: 'quantity', value: actpickqty });
							trecord.setSublistValue({ sublistId: 'item', line: i, fieldId: 'location', value: vLocation });
							trecord.setSublistValue({ sublistId: 'item', line: i, fieldId: 'custcol_jf_cw_catch_weight', value: catchweight });
							if (parseFloat(catchweight) > 0) {
								trecord.setSublistValue({ sublistId: 'item', line: i, fieldId: 'custcol_cw_indicator', value: true });
							}

							//vitemType = bfclibrary.GetItemType(ifordno, vitemid, vLocation);
							//log.debug("GetItemTyperes : ", (vitemType));

							//ValidBinInternalId = bfclibrary.GetValidBinInternalId(ifordno, vBinId, vLocation);
							//log.debug("ValidBinInternalId : ", (ValidBinInternalId));

							var IFSubRecord = trecord.getSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail', line: i });
							var IFlinelength = IFSubRecord.getLineCount({ sublistId: 'inventoryassignment' });

							if (parseInt(IFlinelength) > 0) {
								for (var invassItr = 0; invassItr < IFlinelength; invassItr++) {
									IFSubRecord.removeLine({ sublistId: 'inventoryassignment', line: 0 });
								}
								IFlinelength = IFSubRecord.getLineCount({ sublistId: 'inventoryassignment' });
							}

							if (vitemType == "lotnumberedinventoryitem" || vitemType == "lotnumberedassemblyitem") {

								var batcharr = getLotsWithExpiryDates(vitemid, ValidBinInternalId, vLocation, vitemType, actpickqty, expeqty, ifordno)
								//log.debug("after  getLotsWithExpiryDates vitemid: ", vitemid);
								//log.debug("after  getLotsWithExpiryDates ValidBinInternalId : ", ValidBinInternalId);
								var totalLotBinQty = 0;
								if (batcharr != null && batcharr != '') {
									for (var z = 0; z < batcharr.length; z++) {
										if (!batcharr[z][1])
											batcharr[z][1] = 0;
										totalLotBinQty += parseFloat(batcharr[z][1]);
									}
								}
								if (batcharr != null && batcharr != '' && (parseFloat(totalLotBinQty) >= parseFloat(actpickqty))) {
									//log.debug("lot batcharr : ", batcharr);
									for (d = 0; d < batcharr.length; d++) {

										IFSubRecord.insertLine({
											sublistId: 'inventoryassignment',
											line: IFlinelength
										});

										//log.debug("lot quan : ", batcharr[d][1]);
										//log.debug("lot bin : ", ValidBinInternalId);

										//log.debug("lot batch : ", batcharr[d][0]);

										IFSubRecord.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: IFlinelength, value: batcharr[d][1] });

										if (ValidBinInternalId != null && ValidBinInternalId != "" && ValidBinInternalId != 'null')
											IFSubRecord.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', line: IFlinelength, value: ValidBinInternalId });

										var expiryDate = batcharr[d][2];
										//	log.debug("lot exp : ", expiryDate);

										if (expiryDate != null && expiryDate != "" && expiryDate != 'null') {
											var parsedExpiryDate = format.parse({
												value: expiryDate,
												type: format.Type.DATE
											});

											IFSubRecord.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'expirationdate', line: IFlinelength, value: parsedExpiryDate });
											IFSubRecord.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: IFlinelength, value: batcharr[d][0] });

										}
									}
								}
							}
							else {


								IFSubRecord.insertLine({
									sublistId: 'inventoryassignment',
									line: IFlinelength
								});

								IFSubRecord.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: IFlinelength, value: actpickqty });
								if (ValidBinInternalId != null && ValidBinInternalId != "" && ValidBinInternalId != 'null')
									IFSubRecord.setSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', line: IFlinelength, value: ValidBinInternalId });

							}
						}
					}
					//var ifRecordId = trecord.save();
				}
				var ifRecordId = trecord.save();
				if (ifRecordId != null) {
					updateProcessedBFCRecords(ifordno, "");
				}

				ECB_log.ScriptLogs({
					name: 'End',
					value: 'End of Reduce Function'
				});

				ECB_log.SetStatus({
					statusCode: 'Request Success'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [],
					ProcessResults: { ifRecordId: ifRecordId },
					KeyWords: ifordno
				});

				log.debug("Remaining governance units in reduce function end: " + scriptObj.getRemainingUsage());

				return {
					error: '',
					message: ECB_log.Store()
				}

			} catch (e) {

				log.debug("Remaining governance units in reduce function exception begin: " + scriptObj.getRemainingUsage());
				updateProcessedBFCRecords(ifordno, e);

				//log.debug(stLogTitle, "exception in Reduce function  :" + e);
				ECB_log.ScriptLogs({
					name: 'exception in Reduce function',
					value: e
				});
				ECB_log.SetStatus({
					statusCode: 'Reduce Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [e],
					ProcessResults: { e: e },
					KeyWords: ifordno
				});
				log.debug("Remaining governance units in reduce function exception end: " + scriptObj.getRemainingUsage());
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}

		}


		function summarize(summary) {

			try {
				var scriptObj = runtime.getCurrentScript();
				log.debug("Remaining governance units in summarize: " + scriptObj.getRemainingUsage());
				ECB_log.ScriptLogs({
					name: 'Remaining governance units in summarize:',
					value: scriptObj.getRemainingUsage()
				});
			}
			catch (e) {

				log.debug(stLogTitle, " exception in summarize function  :" + e);
				ECB_log.ScriptLogs({
					name: 'exception in summarize function',
					value: e
				});
				ECB_log.SetStatus({
					statusCode: 'Request Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [summary],
					ProcessResults: { e: e },
					KeyWords: ordno
				});
				return {
					error: e.message,
					message: ECB_log.Store()
				}

			}

		}

		function GetinvDetails(itemid, Binnumber, order) {
			log.debug(stLogTitle, 'MR GetinvDetails Binnumber : ' + Binnumber);
			log.debug(stLogTitle, 'MR GetinvDetails itemid : ' + itemid);
			log.debug(stLogTitle, 'MR GetinvDetails order : ' + order);
			try {
				ECB_log.ScriptLogs({
					name: 'GetinvDetails itemid, Binnumber, order',
					value: itemid + " :: " + Binnumber + " :: " + order
				});


				var invBalanceSearch = '';
				var inventoryBalanceBinlist = []
				invBalanceSearch = search.load({
					type: search.Type.INVENTORY_BALANCE,
					id: 'customsearch_wms_wo_invbal_inv_lot_exp'
				});

				invBalanceSearch.filters.push(search.createFilter({
					name: 'binnumber',
					join: 'binnumber',
					operator: search.Operator.IS,
					values: Binnumber
				}));

				invBalanceSearch.filters.push(search.createFilter({
					name: 'item',
					operator: search.Operator.ANYOF,
					values: itemid
				}));

				var invBalanceSearchSearchResults = invBalanceSearch.run().getRange({ start: 0, end: 1000 });
				var invdetobj = {};
				log.debug("arrReturnSearchResults res", JSON.stringify(invBalanceSearchSearchResults));

				for (var k = 0; k < invBalanceSearchSearchResults.length; k++) {
					var item = invBalanceSearchSearchResults[k].getText({ name: "item", summary: "GROUP" });
					var binNumber = invBalanceSearchSearchResults[k].getText({ name: "binnumber", summary: "GROUP" })
					var onhand = invBalanceSearchSearchResults[k].getValue({ name: "onhand", summary: "SUM" })
					var available = invBalanceSearchSearchResults[k].getValue({ name: "available", summary: "SUM" })
					var LOT = invBalanceSearchSearchResults[k].getText({ name: "inventorynumber", summary: "GROUP" })
					var expirationdate = invBalanceSearchSearchResults[k].getValue({ name: "expirationdate", join: "inventoryNumber", summary: "GROUP" })

					invdetobj = { "item": item, "binNumber": binNumber, "onhand": onhand, "available": available, "LOT": LOT, "expirationdate": expirationdate, }
				}

				//var searchResultCount_inventorybalanceCount = invBalanceSearch.runPaged().count;
				//	log.debug('searchResultCount_inventorybalanceCount', searchResultCount_inventorybalanceCount)
				//invBalanceSearch.run().each(function (result) {
				//	var binNumber = result.getValue({ name: "binnumber", summary: "GROUP" })
				//	var binNumber = result.getValue({ name: "binnumber", summary: "GROUP" })
				//	log.debug('resultfor inventory balance result', result);
				//	return true;
				//	});

			}
			catch (e) {

				log.debug(stLogTitle, " exception in GetinvDetails function  :" + e);
				ECB_log.ScriptLogs({
					name: 'exception in GetinvDetails function',
					value: e
				});
				ECB_log.SetStatus({
					statusCode: 'Request Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [],
					ProcessResults: { e: e },
					KeyWords: ordno
				});
				return {
					error: e.message,
					message: ECB_log.Store()
				}

			}
			log.debug("invdetobj res", invdetobj)
			return invdetobj;
		}

		function updateProcessedBFCRecords(ordno, exmsg) {
			try {
				log.debug(stLogTitle, "updateProcessedBFCRecords Parameters : " + ordno);
				ECB_log.ScriptLogs({
					name: 'updateProcessedBFCRecords ordno and exmsg',
					value: ordno + " :: " + exmsg
				});

				var bfcfilters = []; var bininternalId = '';
				bfcfilters.push(search.createFilter({ name: 'custrecord_bfcpickdata_ordno', operator: search.Operator.ANYOF, values: ordno }));
				bfcfilters.push(search.createFilter({ name: 'custrecord_bfcpickdata_status', operator: search.Operator.IS, values: 'Picked' }));

				var bfccolumns = [];
				bfccolumns.push(search.createColumn('custrecord_bfcpickdata_item'));
				bfccolumns.push(search.createColumn('custrecord_bfcpickdata_pickbin'));
				bfccolumns.push(search.createColumn('custrecord_bfcpickdata_ordno'));

				var searchrecord = search.create({ type: 'customrecord_wmsts_bfcpickdata', filters: bfcfilters, columns: bfccolumns });

				var objResultset = searchrecord.run();
				var arrReturnSearchResults = new Array();
				var intSearchIndex = 0;
				var UpdatearrResult = null;
				do {
					UpdatearrResult = objResultset.getRange(intSearchIndex, intSearchIndex + 1000);
					log.debug(stLogTitle, 'UpdatearrResult LEN:' + UpdatearrResult.length);
					ECB_log.ScriptLogs({
						name: 'UpdatearrResult LEN',
						value: UpdatearrResult.length
					});

					if (UpdatearrResult == null) {
						break;
					}
					arrReturnSearchResults = arrReturnSearchResults.concat(UpdatearrResult);
					intSearchIndex = arrReturnSearchResults.length;
				}

				while (UpdatearrResult.length >= 1000);


				log.debug(stLogTitle, "arrReturnSearchResults length : " + arrReturnSearchResults.length);
				ECB_log.ScriptLogs({
					name: 'arrReturnSearchResults length :',
					value: arrReturnSearchResults.length
				});

				for (var i = 0; i < arrReturnSearchResults.length; i++) {

					var mritem = arrReturnSearchResults[i].getValue({ name: 'custrecord_bfcpickdata_item' });
					var mrbin = arrReturnSearchResults[i].getValue({ name: 'custrecord_bfcpickdata_pickbin' });
					var mrorder = arrReturnSearchResults[i].getValue({ name: 'custrecord_bfcpickdata_ordno' });

					if (exmsg != "") {
						log.debug(stLogTitle, "exmsg i val : " + i);
						log.debug(stLogTitle, "exmsg i exmsg : " + exmsg);
						var GetinvDetailsres = GetinvDetails(mritem, mrbin, mrorder);
						log.debug("MR GetinvDetailsres", JSON.stringify(GetinvDetailsres))
						var id = record.submitFields({
							type: 'customrecord_wmsts_bfcpickdata',
							id: arrReturnSearchResults[i].id,
							values: {
								custrecord_bfcpickdata_status: 'Item Fulfillment Failed',
								custrecord_bfcpickdata_errorlog: "Current Inventory :" + JSON.stringify(GetinvDetailsres) + " Err msg : " + exmsg
							}
						});
					}
					else {
						var id = record.submitFields({
							type: 'customrecord_wmsts_bfcpickdata',
							id: arrReturnSearchResults[i].id,
							values: {
								custrecord_bfcpickdata_status: 'Processed',
								custrecord_bfcpickdata_errorlog: exmsg
							}
						});
					}
				}

				ECB_log.ScriptLogs({
					name: 'End',
					value: 'End of updateProcessedBFCRecords Function'
				});

				ECB_log.SetStatus({
					statusCode: 'Request Success'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [JSON.stringify(arrReturnSearchResults)],
					ProcessResults: {},
					KeyWords: ordno
				});

				return {
					error: '',
					message: ECB_log.Store()
				}

			} catch (e) {
				log.debug("exception in updateProcessedBFCRecords function", e);

				ECB_log.ScriptLogs({
					name: 'exception in updateProcessedBFCRecords function  :',
					value: e
				});

				ECB_log.SetStatus({
					statusCode: 'BFC Update Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [JSON.stringify(arrReturnSearchResults)],
					ProcessResults: { e: e },
					KeyWords: ordno
				});
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}
		}

		function map(context) {
			try {
				var scriptObj = runtime.getCurrentScript();
				log.debug("Remaining governance units in map start: " + scriptObj.getRemainingUsage());

				var orderDetails = (context.value);
				log.debug("ordeDetails:", orderDetails);

				context.write(orderDetails);
				log.debug("Remaining governance units in map end: " + scriptObj.getRemainingUsage());

			}
			catch (e) {

				log.debug(stLogTitle, 'exception in map function : ' + e);
				ECB_log.ScriptLogs({
					name: 'exception in map function',
					value: e
				});
				ECB_log.SetStatus({
					statusCode: 'Request Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [context],
					ProcessResults: { e: e },
					KeyWords: ordno
				});
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}

		}


		function getLotsWithExpiryDates(vitemid, vBinId, vLocation, vitemType, actpickqty, expeqty, ordno) {

			try {
				var lotinputData = 'vitemid. = ' + vitemid + '<br>';
				lotinputData = lotinputData + 'vBinId. = ' + vBinId + '<br>';
				lotinputData = lotinputData + 'vLocation. = ' + vLocation + '<br>';
				lotinputData = lotinputData + 'vitemType' + vitemType + '<br>';

				log.debug(stLogTitle, "getLotsWithExpiryDates Parameters : " + lotinputData);
				ECB_log.ScriptLogs({
					name: 'getLotsWithExpiryDates Parameters',
					value: lotinputData
				});

				var itemSearchObj = search.create({
					type: "item",
					filters:
						[
							[["inventorynumberbinonhand.quantityavailable", "greaterthan", "0"], "OR", ["inventorynumberbinonhand.quantityonhand", "greaterthan", "0"]],
							"AND",
							["isinactive", "is", "F"],
							"AND",
							["inventorynumberbinonhand.location", "anyof", vLocation],
							"AND",
							["inventorynumberbinonhand.binnumber", "anyof", vBinId]
						],
					columns:
						[
							search.createColumn({
								name: "itemid",
								sort: search.Sort.ASC,
								label: "Name"
							}),
							search.createColumn({
								name: "binnumber",
								join: "inventoryNumberBinOnHand",
								sort: search.Sort.ASC,
								label: "Bin Number"
							}),
							search.createColumn({
								name: "inventorynumber",
								join: "inventoryNumberBinOnHand",
								sort: search.Sort.ASC,
								label: "Inventory Number"
							}),
							search.createColumn({
								name: "quantityonhand",
								join: "inventoryNumberBinOnHand",
								label: "On Hand"
							}),
							search.createColumn({
								name: "quantityavailable",
								join: "inventoryNumberBinOnHand",
								label: "Available"
							}),
							search.createColumn({
								name: "location",
								join: "inventoryNumberBinOnHand",
								label: "Location"
							}),
							search.createColumn({ name: "salesdescription", label: "Description" }),
							search.createColumn({ name: "islotitem", label: "Is Lot Numbered Item" })
						]
				});

				var objResultset = itemSearchObj.run();
				var objBinDetails = new Array();
				var intSearchIndex = 0;
				var arrResultSlice = null;
				do {
					arrResultSlice = objResultset.getRange(intSearchIndex, intSearchIndex + 1000);
					log.debug(stLogTitle, 'arrResultSlice LEN:' + arrResultSlice.length);
					ECB_log.ScriptLogs({
						name: 'arrResultSlice LEN : ',
						value: arrResultSlice.length
					});

					if (arrResultSlice == null) {
						break;
					}
					objBinDetails = objBinDetails.concat(arrResultSlice);
					intSearchIndex = objBinDetails.length;
				}

				while (arrResultSlice.length >= 1000);

				var vBinLocArr = [];

				if (objBinDetails.length > 0) {

					var vLotExpArr = [];
					var vLotArr = [];
					var vValidBinIdArr = [];
					var vValidBinTextArr = [];
					var vValidBinAvailQtyArr = [];
					var vValidBinInvNumArr = [];
					var vstrLotNameCSV = "";
					var strBinCSV = "";
					var objBinDetailsRec = '';
					var vValidBinId = '';
					var vValidBin = '';
					var vBinQtyAvail = '';
					var vBinInvNum = '';

					for (var p = 0; p < objBinDetails.length; p++) {
						objBinDetailsRec = objBinDetails[p];
						log.debug(stLogTitle, 'objBinDetailsRec :' + objBinDetailsRec);
						ECB_log.ScriptLogs({
							name: 'objBinDetailsRec : ',
							value: objBinDetailsRec
						});
						vValidBinId = objBinDetailsRec.getValue({ name: 'binnumber', join: 'inventoryNumberBinOnHand' });
						vValidBin = objBinDetailsRec.getText({ name: 'binnumber', join: 'inventoryNumberBinOnHand' });

						//vBinQtyAvail = objBinDetailsRec.getValue({ name: 'quantityonhand', join: 'inventoryNumberBinOnHand' });
						vBinQtyAvail = objBinDetailsRec.getValue({ name: 'quantityavailable', join: 'inventoryNumberBinOnHand' });
						vBinInvNum = objBinDetailsRec.getText({ name: 'inventorynumber', join: 'inventoryNumberBinOnHand' });

						vValidBinIdArr.push(vValidBinId);
						vValidBinTextArr.push(vValidBin);

						vValidBinAvailQtyArr.push(vBinQtyAvail);
						vValidBinInvNumArr.push(vBinInvNum);
						if (strBinCSV == "")
							strBinCSV = vValidBinId;
						else
							strBinCSV = strBinCSV + ',' + vValidBinId;
						if (vstrLotNameCSV == "")
							vstrLotNameCSV = vBinInvNum;
						else
							vstrLotNameCSV = vstrLotNameCSV + ',' + vBinInvNum;

					}

					var itemSearchlotObj = search.create({
						type: "item",
						filters:
							[
								["inventorynumber.isonhand", "is", "T"],
								"AND",
								["islotitem", "is", "T"],
								"AND",
								["isinactive", "is", "F"],
								"AND",
								["internalid", "anyof", vitemid],
								"AND",
								["inventorynumber.location", "anyof", vLocation]
							],
						columns:
							[
								search.createColumn({
									name: "itemid",
									sort: search.Sort.ASC,
									label: "Name"
								}),
								search.createColumn({
									name: "expirationdate",
									join: "inventoryNumber",
									sort: search.Sort.ASC,
									label: "Expiration Date"
								}),
								search.createColumn({
									name: "inventorynumber",
									join: "inventoryNumber",
									sort: search.Sort.ASC,
									label: "Number"
								})
							]
					});

					var objResultsetlot = itemSearchlotObj.run();
					var searchresultsExp = new Array();
					var intSearchIndexlot = 0;
					var arrResultSlicelot = null;
					do {
						arrResultSlicelot = objResultsetlot.getRange(intSearchIndexlot, intSearchIndexlot + 1000);
						log.debug(stLogTitle, 'arrResultSlicelot LEN:' + arrResultSlicelot.length);
						ECB_log.ScriptLogs({
							name: 'arrResultSlicelot LEN : ',
							value: arrResultSlicelot.length
						});

						if (arrResultSlicelot == null) {
							break;
						}
						searchresultsExp = searchresultsExp.concat(arrResultSlicelot);
						intSearchIndexlot = searchresultsExp.length;
					}

					while (arrResultSlicelot.length >= 1000);

					log.debug(stLogTitle, 'searchresultsExp LEN:' + searchresultsExp);
					ECB_log.ScriptLogs({
						name: 'searchresultsExp LEN:',
						value: searchresultsExp
					});


					if (searchresultsExp.length > 0) {
						for (var s = 0; s < searchresultsExp.length; s++) {

							if (searchresultsExp[s].getValue({ name: 'inventorynumber', join: 'inventoryNumber' }) != null && searchresultsExp[s].getValue({ name: 'inventorynumber', join: 'inventoryNumber' }) != '') {
								if (vValidBinInvNumArr.indexOf(searchresultsExp[s].getValue({ name: 'inventorynumber', join: 'inventoryNumber' })) != -1) {
									vLotArr.push(searchresultsExp[s].getValue({ name: 'inventorynumber', join: 'inventoryNumber' }));
									vLotExpArr.push(searchresultsExp[s].getValue({ name: 'expirationdate', join: 'inventorynumber' }));
								}
							}
						}
					}

					for (var u = 0; u < vLotArr.length; u++) {
						if (vLotArr[u] != null && vLotArr[u] != '') {
							var vLotExp = vLotExpArr[u];
							var vTempLotArrNew = vstrLotNameCSV.split(',');
							var vTempLotArr = [];
							for (var l = 0; l < vTempLotArrNew.length; l++) {
								var tLot = vTempLotArrNew[l];
								if (tLot == vLotArr[u]) {
									vTempLotArr.push(l);
								}
							}
							if (vTempLotArr.length > 1)// lot occures in more than once
							{
								for (m = 0; m < vValidBinIdArr.length; m++) {
									if (vValidBinInvNumArr[m] == vLotArr[u]) {
										var vValidBin = vValidBinTextArr[m];
										var vValidBinId = vValidBinIdArr[m];
										var vBinQtyAvail = vValidBinAvailQtyArr[m];
										//	log.debug('vBinQtyAvail3', vBinQtyAvail);
										var vBinQtyInvNum = vValidBinInvNumArr[m];
										//	log.debug('vBinQtyAvail2', vBinQtyAvail);
										vBinQtyAvail = parseFloat(vBinQtyAvail);
										if (parseFloat(vBinQtyAvail) > 0) {

											var currRow = { 'binnumber': vValidBin, 'availableqty': vBinQtyAvail, 'bininternalid': vValidBinId, 'lotnumber': vBinQtyInvNum, 'lotexpirydate': vLotExp };
											vBinLocArr.push(currRow);
											log.debug('currRow 1', vBinLocArr);

										}
									}
								}

							}
							else {
								var vValidBin = vValidBinTextArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
								var vBinQtyAvail = vValidBinAvailQtyArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
								//log.debug('vBinQtyAvail1', vBinQtyAvail);
								var vBinQtyInvNum = vValidBinInvNumArr[vValidBinInvNumArr.indexOf(vLotArr[u])];
								var vValidBinId = vValidBinIdArr[vValidBinInvNumArr.indexOf(vLotArr[u])];

								vBinQtyAvail = parseFloat(vBinQtyAvail);
								if (parseFloat(vBinQtyAvail) > 0) {

									var currRow = { 'binnumber': vValidBin, 'availableqty': vBinQtyAvail, 'bininternalid': vValidBinId, 'lotnumber': vBinQtyInvNum, 'lotexpirydate': vLotExp };

									vBinLocArr.push(currRow);
									log.debug('currRow 2', vBinLocArr);

								}
							}
						}

					}
				}
				log.debug('vBinLocArr', vBinLocArr);
				if (vBinLocArr.length > 0) {
					var objlotDetails = vBinLocArr;
					var remqty = 0; var remexpqty = 0; var batcharr = [];
					if (objlotDetails != null && objlotDetails.length > 0) {
						for (var bindetail in objlotDetails) {
							var vitemLotQty = objlotDetails[bindetail]['availableqty'];
							var vitemLot = objlotDetails[bindetail]['lotnumber'];
							var vitemLotExp = objlotDetails[bindetail]['lotexpirydate'];
							var vbinnumber = objlotDetails[bindetail]['binnumber'];
							var vbininternalid = objlotDetails[bindetail]['bininternalid'];

							log.debug('vbininternalid', vbininternalid);
							log.debug('vitemLotQty from search', vitemLotQty);

							if (vitemLotQty == null || vitemLotQty == '')
								vitemLotQty = 0;

							if (parseInt(vitemLotQty) > 0) {
								if (vitemLotQty > 0 && actpickqty > 0) {
									remqty = parseFloat(actpickqty) - parseFloat(vitemLotQty);	//35- 40 =-5
									if (remqty <= 0 && (expeqty <= actpickqty)) {
										var currentRow = [vitemLot, actpickqty, vitemLotExp];
										batcharr.push(currentRow);
										log.debug('into if params batcharr', batcharr);

										break;
									}
									else if (remqty <= 0 && (expeqty > actpickqty)) {
										var currentRow = [vitemLot, actpickqty, vitemLotExp];
										batcharr.push(currentRow);
										log.debug('into if1 batcharr', batcharr);

										var adjqty1 = parseFloat(expeqty) - parseFloat(actpickqty);//50-40 =10	
										break;
									}
									else {
										log.debug('into if2', vitemLot + " : " + vitemLotQty);

										var currentRow = [vitemLot, vitemLotQty, vitemLotExp];
										batcharr.push(currentRow);
										actpickqty = parseFloat(actpickqty) - parseFloat(vitemLotQty);
										log.debug('into if2 actpickqty', actpickqty);

									}
								}
								else {
									log.debug('into else act pick qty is 0', vitemLotQty);

									if (vitemLotQty > 0) {
										if (expeqty > actpickqty) {
											log.debug('act pick qty is 0', expeqty + " : " + actpickqty);
											var currentRow = [vitemLot, actpickqty, vitemLotExp];
											batcharr.push(currentRow);
											log.debug('into if params batcharr', batcharr);
											break;
										}
									}
								}
							}
							else {
								log.debug('vitemLotQty from search is zero', vitemLotQty);
							}

						}
					}
					else {
						var currentRow = ['', '0', ''];
						batcharr.push(currentRow);
					}
				}

				ECB_log.ScriptLogs({
					name: 'End',
					value: 'End of getLotsWithExpiryDates Function'
				});

				ECB_log.SetStatus({
					statusCode: 'Request Success'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [vBinLocArr, batcharr],
					ProcessResults: { ordno: ordno, vitemid: vitemid, vBinId: vBinId },
					KeyWords: ordno
				});

			}
			catch (e) {

				log.debug(stLogTitle, 'exception in GetLOTInfo function : ' + e);
				ECB_log.ScriptLogs({
					name: 'exception in GetLOTInfo function',
					value: e
				});
				ECB_log.SetStatus({
					statusCode: 'GetLOTInfo Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [vBinLocArr, batcharr],
					ProcessResults: { ordno: ordno, vitemid: vitemid, vBinId: vBinId, e: e },
					KeyWords: ordno
				});
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}

			log.debug(stLogTitle, 'vBinLocArr Res : ' + vBinLocArr);
			ECB_log.ScriptLogs({
				name: 'vBinLocArr Res :',
				value: vBinLocArr
			});
			return batcharr;

		}

		function DateStamp() {
			try {
				var now = convertDate();
				var dtsettingFlag = DateSetting();

				if (dtsettingFlag == 'DD/MM/YYYY') {
					return ((parseFloat(now.getDate())) + '/' + (parseFloat(now.getMonth()) + 1) + '/' + now.getFullYear());
				}
				else if (dtsettingFlag == 'MM/DD/YYYY') {
					return ((parseFloat(now.getMonth()) + 1) + '/' + (parseFloat(now.getDate())) + '/' + now.getFullYear());
				}
				else {
					var formattedDateString = format.format({
						value: now,
						type: format.Type.DATE
					});

					return formattedDateString;
				}
			}
			catch (e) {

				log.debug(stLogTitle, 'exception in DateStamp function : ' + e);
				ECB_log.ScriptLogs({
					name: 'exception in DateStamp function',
					value: e
				});
				ECB_log.SetStatus({
					statusCode: 'Request Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [],
					ProcessResults: { e: e },
					KeyWords: ordno
				});
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}
		}
		function DateSetting() {
			try {
				var loadConfig = config.load({
					type: config.Type.USER_PREFERENCES
				});
				var setpreferencesdateformate = loadConfig.getValue({ fieldId: 'DATEFORMAT' });

				//return setpreferencesdateformate;

			}
			catch (e) {

				log.debug(stLogTitle, 'exception in DateSetting function : ' + e);
				ECB_log.ScriptLogs({
					name: 'exception in DateSetting function',
					value: e
				});
				ECB_log.SetStatus({
					statusCode: 'Request Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [],
					ProcessResults: { e: e },
					KeyWords: ordno
				});
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}
			return setpreferencesdateformate;
		}
		function convertDate(DS) {
			try {
				if (DS == null || DS == '')
					DS = true;

				var date = new Date(); // get current date

				var loadConfig = config.load({
					type: config.Type.USER_PREFERENCES,
					isDynamic: true
				});
				var getTimeZone = loadConfig.getText({ fieldId: 'TIMEZONE' });
				var timezoneDate;
				var getOffset = '';
				var vgetOffsetDecimals = '';
				var vTempOffsetDecimals = '';
				if (getTimeZone != '(GMT) Greenwich Mean Time : Dublin, Edinburgh, Lisbon, London' && getTimeZone != '(GMT) Casablanca' && getTimeZone != '(GMT) Monrovia, Reykjavik') {
					getOffset = getTimeZone.substring(4, 7);
					var vgetSign = getTimeZone.substring(4, 5);
					vTempOffsetDecimals = getTimeZone.substring(4, 10);
					if (vTempOffsetDecimals.indexOf(':00') == -1) {
						vTempOffsetDecimals = getTimeZone.substring(8, 10);
						vTempOffsetDecimals = vTempOffsetDecimals / 60;
						if (vgetSign == '-') {
							var vTempgetOffset = parseInt(getOffset) - parseFloat(vTempOffsetDecimals);
							getOffset = vTempgetOffset;
						}
						else {
							var vTempgetOffset = parseInt(getOffset) + parseFloat(vTempOffsetDecimals);
							getOffset = vgetSign + vTempgetOffset;
						}
					}
					else
						vTempOffsetDecimals = "";

				} else {
					getOffset = 1; // under 3 timezones above are equal to UTC which is zero difference in hours
				}
				var UTCDate = date.getTime() + (date.getTimezoneOffset() * 60000); // convert current date into UTC (Coordinated Universal Time)
				timezoneDate = new Date(UTCDate + (3600000 * getOffset)); //create new date object with, subtract if customer timezone is behind UTC and add if ahead
				if (DS) {
					var timezoneDateDayLight = new Date(timezoneDate.getTime() + 60 * 60000); // add 1 hour customer's timezone is currently under daylight saving
					return timezoneDateDayLight;

				} else {
					return timezoneDate;
				}

			}
			catch (e) {

				log.debug(stLogTitle, 'exception in convertDate function : ' + e);
				ECB_log.ScriptLogs({
					name: 'exception in convertDate function',
					value: e
				});
				ECB_log.SetStatus({
					statusCode: 'Request Failed'
				});

				ECB_log.ECBLogEnd({
					ProcessValidationDetails: [DS],
					ProcessResults: { e: e },
					KeyWords: ordno
				});
				return {
					error: e.message,
					message: ECB_log.Store()
				}
			}
		}
		return {
			getInputData: getInputData,
			reduce: reduce,
			summarize: summarize
		};

	});
