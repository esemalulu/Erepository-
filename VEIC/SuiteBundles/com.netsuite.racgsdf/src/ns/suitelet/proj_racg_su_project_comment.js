/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU Project Comment
 * @NScriptId _proj_racg_su_project_comment
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_http',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_record',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_search'
	],

	function (rHttp, rLog, rRecord, rRuntime, rSearch) {
		var module = {};
		var recordType = 'note';

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			var returnData = {
				success: true,
				message: 'Comment saved'
			};
			var dataInput = JSON.parse(params.request.body);
			var that = this;
			try {
				if (params.request.method !== rHttp.getMethods().POST) {
					throw('ERROR: Request method is incorrect: ' + params.request.method);
				}

				if (Array.isArray(dataInput)) {
					dataInput.forEach(function (comment) {
						that.processComment(comment);
					});
				} else {
					this.processComment(dataInput);
				}
			} catch (e) {
				returnData.success = false;
				returnData.message = 'Failed to save comment. Request parameters: ' + JSON.stringify(params.request.body);
				rLog.handleError(e);
			}
			rLog.debug('returnData: ' + JSON.stringify(returnData));
			params.response.write(JSON.stringify(returnData));
			rLog.endMethod();
		};

		module.getExistingComments = function (projectId) {
			return rSearch.getSearchResults({
				searchId: 'customsearch_proj_racg_user_notes',
				filters: [
					rSearch.createFilter(
						{
							name: 'internalid',
							join: 'entity',
							operator: rSearch.getSearchOperators().IS,
							values: projectId
						}
					)
				]
			});
		}

		/*
		 * Save/Delete project comments in user note record type
		 * @param {String} dataInput - request body object
		 * @returns {None}
		 */
		module.processComment = function (dataInput) {
			rLog.startMethod('removeComment');

			var existingComments = this.getExistingComments(dataInput.projectId);
			var commentId = existingComments.length > 0 ? existingComments[0].id : null;

			if (dataInput.comment === '') {
				this.deleteComment(commentId);
			} else {
				this.saveComment(dataInput, commentId);
			}
			rLog.endMethod();
		}

		module.deleteComment = function (commentId) {
			rLog.startMethod('deleteComment');

			if (commentId) {
				rRecord.delete({
					type: recordType,
					id: commentId
				});
			}
			rLog.endMethod();
		}

		module.saveComment = function (dataInput, commentId) {
			rLog.startMethod('saveComment');

			var noteRecord = null;

			if (commentId) {
				noteRecord = rRecord.load({
					type: recordType,
					id: commentId
				});
			} else {
				noteRecord = rRecord.create({
					type: recordType
				});
				noteRecord.setValue({
					fieldId: 'author',
					value: rRuntime.getCurrentUser().id
				});
				noteRecord.setValue({
					fieldId: 'title',
					value: 'Resource Allocation Note'
				});
				noteRecord.setValue({
					fieldId: 'notetype',
					value: 7 //Note type
				});
				noteRecord.setValue({
					fieldId: 'entity',
					value: dataInput.projectId
				});
			}

			noteRecord.setValue({
				fieldId: 'note',
				value: dataInput.comment
			});
			noteRecord.save();

			rLog.endMethod();
		};

		return module;
	}
);
