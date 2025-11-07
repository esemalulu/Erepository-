/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU Allocation Saver
 * @NScriptId _proj_racg_su_alloc_saver
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_format',
		'../adapter/proj_racg_ad_http',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_record',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_search',
		'../custom/proj_racg_cu_date'
	],

	function (rFormat, rHttp, rLog, rRecord, rRuntime, rSearch, rDate) {
		var module = {};

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			var returnData = {};
			try {
				returnData = this.processAllocationData(params.request.body);
			} catch (e) {
				returnData.success = false;
				returnData.message = 'Failed to process allocation data. Request parameters: ' + JSON.stringify(params.request.body);
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};

		/*
		 * Delete/create/load/save allocation record from UI
		 * @param {String} requestBody - request body in string
		 * @returns {Boolean} returnData.success - flag to indicate success or failure of loading
		 * @returns {Array} returnData.data - list with 1 element that is the requestBody and relevant allocation data
		 * @returns {String} returnData.message - string message to indicate creation or update or deletion of filter record
		 */
		module.processAllocationData = function (requestBody) {
			rLog.startMethod('processAllocationData');
			var dataInput = JSON.parse(requestBody);
			var returnData = {
				success: true
			};
			var record = null;
			var startDate = null;
			var endDate = null;
			var dateFormatPreference = rRuntime.getCurrentUserPreference({preference: 'DATEFORMAT'});
			//TODO: remove dateFormatPreference, seems like a relic
			var recordType = 'resourceallocation';

			if (!dataInput.Id && dataInput.allocId) {
				returnData.message = 'Data Deleted';
				rRecord.delete({
					type: recordType,
					id: dataInput.allocId
				});
			} else {
				if (dataInput.allocId < 0) {
					returnData.message = 'Data Added';
					record = rRecord.create({
						type: recordType,
                        isDynamic: true
					});
				} else {
					returnData.message = 'Data Updated';
					record = rRecord.load({
						type: recordType,
						id: dataInput.allocId,
						isDynamic: true
					});
				}
				record.setValue({
					fieldId: 'allocationresource',
					value: dataInput.resourceId
				});
				record.setValue({
					fieldId: 'project',
					value: dataInput.projectId
				});
				startDate = rDate.dateStringToDateObject(dataInput.startTimestamp);
				record.setValue({
					fieldId: 'startdate',
					value: startDate
				});
				endDate = rDate.dateStringToDateObject(dataInput.endTimestamp);
				endDate = rDate.addDays({dateObject: endDate, numberOfDays: -1});
				record.setValue({
					fieldId: 'enddate',
					value: endDate
				});
				var allocationUnit = dataInput.unit === 1 ? 'P' : 'H';
				record.setValue({
					fieldId: 'allocationunit',
					value: allocationUnit
				});
				var allocationType = dataInput.type === 'Hard' ? 1 : 2;
				record.setValue({
					fieldId: 'allocationtype',
					value: allocationType
				});
				record.setValue({
					fieldId: 'notes',
					value: dataInput.comment
				});
				record.setValue({
					fieldId: 'projecttask',
					value: dataInput.taskId || null
				});

				if (dataInput.frequency && dataInput.frequency !== 'NONE') {
					record.setValue({
						fieldId: 'frequency',
						value: dataInput.frequency
					});
					record.setValue({
						fieldId: 'period',
						value: String(dataInput.period)
					});
					record.setValue({
						fieldId: 'seriesstartdate',
						value: rDate.dateStringToDateObject(dataInput.seriesStartDate)
					});
					record.setValue({
						fieldId: 'endbydate',
						value: rDate.dateStringToDateObject(dataInput.seriesEndDate)
					});
					record.setValue({
						fieldId: 'recurrencedow',
						value: String(dataInput.dayOfWeek)
					});
					record.setValue({
						fieldId: 'recurrencedowmask',
						value: dataInput.dayOfWeekMask
					});
					record.setValue({
						fieldId: 'recurrencedowim',
						value: String(dataInput.dayOfWeekInMonth)
					});
				} else {
					record.setValue({
						fieldId: 'frequency',
						value: null
					});
				}

				if (dataInput.unit === 1) {
					record.setValue({
						fieldId: 'allocationamount',
						value: dataInput.percent
					});
				} else {
					record.setValue({
						fieldId: 'allocationamount',
						value: dataInput.hour
					});
				}

				var approvalPreference = rRuntime.getCurrentUserPreference({preference: 'CUSTOMAPPROVALRSRCALLOC'});
				if (approvalPreference) {
					record.setValue({
						fieldId: 'approvalstatus',
						value: dataInput.approvalStatus
					});

					if (dataInput.nextApprover === -5 || dataInput.nextApprover > 0) {
						record.setValue({
							fieldId: 'nextapprover',
							value: dataInput.nextApprover
						});
					}
				}

				dataInput.allocId = record.save({
					ignoreMandatoryFields: approvalPreference
				});
				//Reload record to get auto-computed values of percentoftime and numberhours
				record = rRecord.load({
					type: recordType,
					id: dataInput.allocId
				});
				dataInput.percent = record.getValue('percentoftime');
				dataInput.hour = record.getValue('numberhours');
			}
			dataInput.startTimestamp = startDate;
			dataInput.endTimestamp = endDate ? rDate.addDays({dateObject: endDate, numberOfDays: -1}) : null;
			returnData.data = [dataInput];
			rLog.endMethod();
			return returnData;
		};

		return module;
	}
);
