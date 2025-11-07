/**
 * Copyright 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author kkung
 * @NScriptName PSA RACG SU Resource
 * @NScriptId _proj_racg_su_resource
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define([
		'../adapter/proj_racg_ad_error',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_search',
		'../custom/proj_racg_cu_date',
		'../custom/proj_racg_cu_filterbuilder',
		'../custom/proj_racg_cu_translation',
		'../custom/proj_racg_cu_utility',
		'../custom/proj_racg_cu_request_builder',
		'../suitelet/proj_racg_su_work_calendars'
	],

	function (rError, rLog, rRuntime, rSearch, rDate, rFilterBuilder, rTranslation, rUtility, rRequestBuilder, rWorkCalendar) {
		var module = {};

		module.objSearchId = {
			'customer': 'customsearch_proj_racg_customer_node',
			'project': 'customsearch_proj_racg_project_node',
			'resource': 'customsearch_proj_racg_resource_node',
			'projectresource': 'customsearch_proj_racg_proj_rsrc_node',
			'subsidiary': 'customsearch_proj_racg_ld_subsidiaries',
			'billingclass': 'customsearch_proj_racg_ld_bill_classes',
			'projectcomment': 'customsearch_proj_racg_user_notes'
		};
		module.noneString = '- None -';
		module.translatedNoneString = null;
		module.ID_SEPARATOR = '~';
		module.subsidiarycurrency = {};
		module.billingclass_prices = {};
		module.arrProjectId = [];
		module.placeholderComment = '{PROJECTCOMMENT_PID}';
		module.defaultCurrency = 'default'; //place holder when multi currency is off

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			params.response.write(this.getData(params));
			rLog.endMethod();
		};

		/*
		 * Expose the main code for use as a dependency on another script/module
		 * @param {Object} params - onRequest Object
		 * @returns {String} resource/proect/customer nodes
		 */
		module.getData = function (params) {
			rLog.startMethod('getData');
			var strResponse = '';
			var requestParams = rRequestBuilder.buildRequestParameters({
				request: params.request
			});
			var userFilters = rFilterBuilder.buildUserFilters({
				requestParams: requestParams
			});
			var jsonReturnData = {
				success: true,
				Id: '0',
				Name: 'root',
				message: 'Loaded Left Pane Data',
				total: '0',
				children: []
			};
			try {
				var arrNodeType = null;
				if (requestParams.viewResourcesBy == 2 || requestParams.viewResourcesBy == 3) { //For Billing Rate Tooltip
					this.populateSubsidiaryCurrency();
					this.populateBillingClassPrice();
				}

				switch (requestParams.viewResourcesBy) {
					case 1:
						if (requestParams.showAllResources) {
							arrNodeType = ['projectresource', 'project'];
						} else {
							arrNodeType = ['resource', 'project'];
						}
						break;
					case 2:
						arrNodeType = ['customer', 'project', 'resource'];
						break;
					case 3:
						arrNodeType = ['project', 'resource'];
						break;
				}

				var objChildren = this.buildLeftPane({
					requestParams: requestParams,
					userFilters: userFilters,
					arrNodeType: arrNodeType.reverse(),
					start: requestParams.start, //only applicable on first call (non-recursive)
					limit: requestParams.limit //only applicable on first call (non-recursive)
				});
				if (Object.keys(objChildren).length) {
					for (var i in objChildren) {
						jsonReturnData.children.push(objChildren[i]);
					}
				} else {
					jsonReturnData.children.push({
						Id: '0',
						Name: (requestParams.resourceSearch)
							  ? rTranslation.getTranslationOfKey({key: 'SS.MESSAGE.NO_RESULTS_SEARCH'})
							  :
							  rTranslation.getTranslationOfKey({key: 'SS.MESSAGE.NO_RESULTS_VIEW'}),
						children: [] // prevent expand icon [+] from appearing
					});
				}
				strResponse = JSON.stringify(jsonReturnData);
				strResponse = this.setProjectComments(strResponse);
			} catch (e) {
				jsonReturnData.success = false;
				jsonReturnData.message = 'Failed to load resource data';
				strResponse = JSON.stringify(jsonReturnData);
				rLog.handleError(e);
			}

			rLog.endMethod();
			return strResponse;
		};

		/*
		 * Translates a string but only if it's '- None -'
		 *
		 * @param {String} str - string to translate
		 * @returns {String}
		 */
		module.translateNone = function (str) {
			if (str === this.noneString) {
				if (!this.translatedNoneString) {
					this.translatedNoneString = rTranslation.getTranslationOfKey({key: 'DISPLAY.NONE'});
				}
				return this.translatedNoneString;
			}
			return str;
		};

		/*
		 * Update global object subsidiary with currency data. Use for Billing Rates info.
		 * @param {None}
		 * @return {None}
		 */
		module.populateSubsidiaryCurrency = function () {
			rLog.startMethod('populateSubsidiaryCurrency');
			if (rRuntime.isFeatureEnabled({feature: 'subsidiaries'}) &&
				rRuntime.isFeatureEnabled({feature: 'billingclasses'}) &&
				rRuntime.isFeatureEnabled({feature: 'multicurrency'})) {
				var searchObject = rSearch.load({id: this.objSearchId['subsidiary']});
				var resultSet = searchObject.run();
				var start = 0;
				var limit = 1000;
				var end = start + limit;
				do {
					var rangedResults = resultSet.getRange({start: start, end: end});
					for (var ctr = 0; ctr < rangedResults.length; ctr++) {
						var eachRecord = rangedResults[ctr];
						var id = eachRecord.id;
						var currency = eachRecord.getText({name: 'currency'});

						this.subsidiarycurrency[id] = currency && currency.toLowerCase();
					}
					start = end;
					end = start + limit;
				} while (rangedResults.length);
			}
			rLog.endMethod();
		};

		/*
		 * Update global object billing class prices with actual values. Use for Billing Rates info.
		 * @param {None}
		 * @return {None}
		 */
		module.populateBillingClassPrice = function () {
			rLog.startMethod('populateBillingClassPrice');
			if (rRuntime.isFeatureEnabled({feature: 'billingclasses'})) {
				var searchObject = rSearch.load({id: this.objSearchId['billingclass']});
				var resultSet = searchObject.run();
				var start = 0;
				var limit = 1000;
				var end = start + limit;
				do {
					var rangedResults = resultSet.getRange({start: start, end: end});
					for (var ctr = 0; ctr < rangedResults.length; ctr++) {
						var eachRecord = rangedResults[ctr];
						var id = eachRecord.id;
						var currency = this.defaultCurrency;
						price = eachRecord.getValue({
							name: 'unitprice',
							join: 'billingClassRate'
						}) || 0;

						if (rRuntime.isFeatureEnabled({feature: 'multicurrency'})) {
							currency = eachRecord.getValue({
								name: 'currency',
								join: 'billingClassRate'
							});
							currency = currency && currency.toLowerCase();
						}

						if (!this.billingclass_prices[id]) {
							this.billingclass_prices[id] = {};
						}
						this.billingclass_prices[id][currency] = price;
					}
					start = end;
					end = start + limit;
				} while (rangedResults.length);
			}
			rLog.endMethod();
		};

		/*
		 * Add Project comments to response string with recorded Project Ids
		 * @param {String} JSON object in string format
		 * @return {String} String with project comments place holders replaced
		 */
		module.setProjectComments = function (strResponse) {
			rLog.startMethod('setProjectComments');
			var strReturn = strResponse, strPlaceHolder;
			if (this.arrProjectId.length) {
				//Search Note records
				var searchOperators = rSearch.getSearchOperators();
				var logicalOperators = rSearch.getLogicalOperators();
				var searchObject = rSearch.load({id: this.objSearchId['projectcomment']});
				var filterExpression = searchObject.filterExpression;
				if (filterExpression.length) {
					filterExpression.push(logicalOperators.AND);
				}
				filterExpression.push(['entity.internalid', searchOperators.ANYOF, this.arrProjectId]);
				searchObject.filterExpression = filterExpression;

				//Add results to response string placeholders
				var resultSet = searchObject.run();
				var start = 0;
				var limit = 1000;
				var end = start + limit;
				do {
					var rangedResults = resultSet.getRange({start: start, end: end});
					for (var ctr = 0; ctr < rangedResults.length; ctr++) {
						var eachRecord = rangedResults[ctr];
						var projectid = eachRecord.getValue({name: 'internalid', join: 'entity'});
						var note = eachRecord.getValue({name: 'note'});
						if (note) {
							note = JSON.stringify(note);
							note = note.substring(1, note.length - 1);
						}
						rLog.debug('projectid: ' + projectid + ' note: ' + note);
						strPlaceHolder = this.placeholderComment.replace("PID", projectid);
						strReturn = strReturn.replace(new RegExp(strPlaceHolder, "g"), note);
					}
					start = end;
					end = start + limit;
				} while (rangedResults.length);
			}

			//Clear all place holders without notes
			strPlaceHolder = this.placeholderComment.replace("PID", "\\d*");
			strReturn = strReturn.replace(new RegExp(strPlaceHolder, "g"), '');

			rLog.endMethod();
			return strReturn;
		};

		/*
		 * Build the resoure data for the left pane
		 * @param {Object} params.arrNodeType - Array of string where each element can be 'projectresource', 'resource', 'project' or 'customer'.
		 *                                      'projectresource' is only supported on first/parent node.
		 *                                      Data is popped out on each recursion.
		 * @param {Object} params.requestParams - http request data
		 * @param {Object} params.userFilters - resource and project resource filter expressions interspersed by 'and' expressions
		 * @param {Array} params.arrHistoryType - Store the popped out element from arrNodeType. Use for Id generation
		 * @param {Array} params.arrParentId - List of Id of recursive called. Used to filter searching of resource allocation.
		 * @return {Object} mapping of each Node mapped via its Id. Id is delimited according to parent nodes i.e. 123-456-789
		 */
		module.buildLeftPane = function (params) {
			rLog.startMethod('buildLeftPane');
			rLog.debug('params: ' + JSON.stringify(params));
			params.arrHistoryType = params.arrHistoryType || [];
			params.arrParentId = params.arrParentId || [];

			var arrNodeType = params.arrNodeType;
			var arrHistoryType = params.arrHistoryType;
			var requestParams = params.requestParams;
			var currentNode = arrNodeType.pop();
			var isLeafNode = (arrNodeType.length == 0);
			var arrNextNodeParents = [];
			var workCalIds = [];
			var arrProjectIds = [];

			var searchObject = rSearch.load({id: this.objSearchId[currentNode]});
			this.appendSearchColumns({
				searchObject: searchObject,
				currentNode: currentNode,
				requestParams: requestParams,
				arrHistoryType: arrHistoryType
			});

			this.appendSearchFilters({
				searchObject: searchObject,
				currentNode: currentNode,
				arrHistoryType: arrHistoryType,
				userFilters: params.userFilters,
				arrParentId: params.arrParentId
			});
			var resultSet = searchObject.run();
			var objCreateNode = {};
			var start = params.start || 0;
			var limit = params.limit || 1000;
			var overLimit = false, totalNodes = 0;
			var end = start + limit;
			var length = null;
			do {
				var rangedResults = resultSet.getRange({start: start, end: end});
				length = rangedResults.length;
				for (var ctr = 0; ctr < length && !overLimit; ctr++) {
					try {
						var eachRecord = rangedResults[ctr];
						var objTempNode = {}, nodeId = null;

						if (currentNode != 'projectresource') {
							//Project Resource has different save search
							nodeId = this.generateNodeId({
								eachRecord: eachRecord,
								requestParams: requestParams,
								arrPastAndCurrent: arrHistoryType.concat(currentNode)
							});
						}

						switch (currentNode) {
							case 'projectresource':
								objTempNode = this.buildProjectResourceNode({
									eachRecord: eachRecord,
									isLeafNode: isLeafNode
								});
								break;
							case 'resource':
								objTempNode = this.buildResourceNode({
									eachRecord: eachRecord,
									nodeId: nodeId,
									requestParams: requestParams,
									arrHistoryType: arrHistoryType,
									isLeafNode: isLeafNode
								});
								break;
							case 'project' :
								objTempNode = this.buildProjectNode({
									eachRecord: eachRecord,
									nodeId: nodeId,
									arrHistoryType: arrHistoryType,
									showProjectTasks: requestParams.showProjectTasks,
									isLeafNode: isLeafNode
								});
								break;
							case 'customer':
								objTempNode = this.buildCustomerNode({
									eachRecord: eachRecord,
									nodeId: nodeId,
									arrHistoryType: arrHistoryType,
									isLeafNode: isLeafNode
								});
								break;
							default:
								throw rError.create({
									name: 'NODE_NOT_RECOGNIZED',
									message: 'Node type not recognized: ' + currentNode,
									notifyOff: true
								});
						}
						switch (currentNode) {
							case 'projectresource':
							case 'resource':
								arrNextNodeParents.push(objTempNode.resourceId);
								break;
							case 'project':
								arrNextNodeParents.push(objTempNode.projectId);
								break;
							case 'customer':
								arrNextNodeParents.push(objTempNode.customerId);
								break;
						}

						if (currentNode === 'projectresource' || currentNode === 'resource') {
							workCalIds.push(objTempNode.workCal);
						}

						objCreateNode[objTempNode.Id] = objTempNode;
						totalNodes = Object.keys(objCreateNode).length;
					} catch (e) {
						var message = e.name + ' : ' + e.message;
						rLog.error('buildLeftPane', 'ERROR_BUILDING_NODE ' + message);
					}
					overLimit = (params.limit && (totalNodes >= params.limit));
				}
				start = end;
				end = start + limit;
			} while (length && !overLimit);
			if (currentNode === 'projectresource' || currentNode === 'resource') {
				var workCalendars = rWorkCalendar.getWorkCalendars({workCalendarIds: workCalIds});
				var workCalendarsByIds = {};
				for (var wc in workCalendars) {
					workCalendarsByIds[workCalendars[wc].id] = workCalendars[wc];
				}
				for (var nobj in objCreateNode) {
					objCreateNode[nobj].workCalendar = workCalendarsByIds[objCreateNode[nobj].workCal];
				}
			}
			arrHistoryType.push(currentNode);
			if (!isLeafNode && arrNextNodeParents.length) {
				//Build children node via recursion
				var objChildren = this.buildLeftPane({
					requestParams: requestParams,
					userFilters: params.userFilters,
					arrNodeType: arrNodeType,
					arrHistoryType: arrHistoryType,
					arrParentId: arrNextNodeParents
				});

				//Convert children node from an object to array and attach to parent node
				for (var childId in objChildren) {
					var parentId = childId.split(this.ID_SEPARATOR);
					parentId.pop();
					if (objChildren[childId].hasOwnProperty('taskId')) {
						parentId.pop(); //Remove the extra appended task Id of children
					}
					parentId = parentId.join(this.ID_SEPARATOR);
					if (!objCreateNode[parentId]) {
						throw rError.create({
							name: 'ERROR_BUILDING_TREE',
							message: 'Cannot find parent for children id ' + childId,
							notifyOff: true
						});
					}
					if (currentNode == 'project' && (requestParams.viewResourcesBy == 2 || requestParams.viewResourcesBy == 3)) {
						this.updateBillingRate(objCreateNode[parentId], objChildren[childId]);
					}
					objCreateNode[parentId].children.push((objChildren[childId]));
				}
			}

			rLog.debug('Node Data: ' + JSON.stringify(objCreateNode));
			rLog.endMethod();
			return objCreateNode;
		};


		/*
		 * Replaces resource node billing rate with that of parent project price
		 * @param {Object} parentNode - Parent object that is a project node
		 * @param {Object} childNode - child object that is a resource node
		 * @return {None}
		 */
		module.updateBillingRate = function (parentNode, childNode) {
			rLog.startMethod('updateBillingRate');

			if (+parentNode.details.tip.projectprice && childNode.details.tip.hasOwnProperty('emp_billingrate')) {
				childNode.details.tip.emp_billingrate = +parentNode.details.tip.projectprice;
			}

			rLog.endMethod();
		};

		/*
		 * Build node id base from parent node type structure
		 * @param {Object} params.eachRecord - search result from Resource Allocation
		 * @param {Array} params.arrPastAndCurrent - All node from past and current
		 * @param {Object} params.requestParams - http request data
		 * @return {String} Id for Node object
		 */
		module.generateNodeId = function (params) {
			rLog.startMethod('generateNodeId');
			var eachRecord = params.eachRecord;
			var arrPastAndCurrent = params.arrPastAndCurrent;
			var requestParams = params.requestParams;
			retId = [],
				mapJoin = {
					'projectresource': 'resource',
					'resource': 'resource',
					'project': 'job',
					'customer': 'customer'
				};

			for (var i = 0; i < arrPastAndCurrent.length; i++) {
				var currNode = arrPastAndCurrent[i];
				var currId;
				if (requestParams.incProjectTemplate && currNode == 'project') {
					var projectId = eachRecord.getValue({
							name: 'internalid',
							join: mapJoin[currNode],
							summary: 'group'
						}),
						templateId = eachRecord.getValue({
							name: 'internalid',
							join: 'projecttemplate',
							summary: 'group'
						}),
						isProjectTemplate = !rUtility.isValidObject(projectId) && rUtility.isValidObject(templateId);
					//fetch template id instead of project id
					currId = isProjectTemplate ? templateId : projectId;
				} else {
					currId = eachRecord.getValue({name: 'internalid', join: mapJoin[currNode], summary: 'group'});
				}
				if (!currId) {
					throw rError.create({
						name: 'NODE_ID_ERROR',
						message: 'Failed to fetch required id for ' + currNode + ' currId: ' + currId,
						notifyOff: true
					});
				}
				retId.push(currId);
			}
			rLog.debug('retId: ' + retId.join(this.ID_SEPARATOR));
			rLog.endMethod();
			return retId.join(this.ID_SEPARATOR);
		};

		/**
		 * Returns the internalid of the Estimated Work field depending on whether the Planned Work feature is enabled or not
		 *
		 * @returns {String} internalid
		 */
		module.getEstimatedTimeId = function () {
			return rRuntime.isFeatureEnabled({feature: 'plannedwork'}) ? 'plannedwork' : 'estimatedtimeoverride';
		};

		/*
		 * Append search object's columns
		 * @param {Object} params.searchObject - search object to modify
		 * @param {String} params.currentNode - whether current operation is 'projectresource', resource', 'project' or 'customer'
		 * @param {Object} params.requestParams - http request data
		 * @param {Array} params.arrHistoryType - Contains parent node that will be used for group by
		 * @return {None}
		 */
		module.appendSearchColumns = function (params) {
			rLog.startMethod('appendSearchColumns');
			var searchObject = params.searchObject;
			var requestParams = params.requestParams;
			var currentNode = params.currentNode;
			var arrHistoryType = params.arrHistoryType;
			var estimatedTimeId = this.getEstimatedTimeId();

			if (currentNode == 'projectresource') {
				if (rRuntime.isFeatureEnabled({feature: 'billingclasses'})) {
					searchObject.columns.push(rSearch.createColumn({name: 'billingclass', join: 'employee'}));
				}
			} else {
				if (currentNode == 'resource') {
					if (rRuntime.isFeatureEnabled({feature: 'billingclasses'})) {
						searchObject.columns.push(rSearch.createColumn({
							name: 'billingclass',
							join: 'employee',
							summary: 'group'
						}));
					}
					if (rRuntime.isFeatureEnabled({feature: 'subsidiaries'})) {
						searchObject.columns.push(rSearch.createColumn({
							name: 'subsidiary',
							join: 'employee',
							summary: 'group'
						}));
					}
				}
				if (currentNode == 'project') {
					var joinId = requestParams.incProjectTemplate ? 'projecttemplate' : 'job';

					searchObject.columns.push(rSearch.createColumn({
						name: 'internalid',
						join: joinId,
						summary: 'group'
					}));
					searchObject.columns.push(rSearch.createColumn({name: 'entityid', join: joinId, summary: 'group'}));
					searchObject.columns.push(rSearch.createColumn({
						name: estimatedTimeId,
						join: joinId,
						summary: 'group'
					}));
					searchObject.columns.push(rSearch.createColumn({
						name: 'startdate',
						join: joinId,
						summary: 'group'
					}));
				}

				if ((arrHistoryType.indexOf('resource') >= 0) || (arrHistoryType.indexOf('projectresource') >= 0)) {
					searchObject.columns.push(rSearch.createColumn({
						name: 'internalid',
						join: 'resource',
						summary: 'group'
					}));
					searchObject.columns.push(rSearch.createColumn({
						name: 'entityid',
						join: 'resource',
						summary: 'group'
					}));
				}

				if (arrHistoryType.indexOf('project') >= 0) {
					searchObject.columns.push(rSearch.createColumn({
						name: 'internalid',
						join: 'job',
						summary: 'group'
					}));
					searchObject.columns.push(rSearch.createColumn({
						name: 'companyname',
						join: 'job',
						summary: 'group'
					}));
				}
			}

			if (requestParams.viewResourcesBy > 1) {
				searchObject.columns.push(rSearch.createColumn({
					name: 'internalid',
					join: 'customer',
					summary: 'group'
				}));
				searchObject.columns.push(rSearch.createColumn({
					name: 'companyname',
					join: 'customer',
					summary: 'group'
				}));
				searchObject.columns.push(rSearch.createColumn({
					name: 'firstname',
					join: 'customer',
					summary: 'group'
				}));
				searchObject.columns.push(rSearch.createColumn({name: 'lastname', join: 'customer', summary: 'group'}));
				searchObject.columns.push(rSearch.createColumn({name: 'isperson', join: 'customer', summary: 'group'}));
			}

			rLog.endMethod();
		};

		/*
		 * Append search object's filters
		 * @param {Object} params.searchObject - search object to modify
		 * @param {Object} params.userFilters - resource and project resource filter expressions interspersed by 'and' expressions
		 * @param {String} params.currentNode - whether current operation is 'projectresource', resource', 'project' or 'customer'
		 * @param {Array} params.arrHistoryType - Store the popped out element from arrNodeType. Use for Id generation
		 * @param {Array} params.arrParentId - List of Id of recursive called. Used to filter searching of resource allocation.
		 * @return {None}
		 */
		module.appendSearchFilters = function (params) {
			rLog.startMethod('appendSearchFilters');
			var searchObject = params.searchObject;
			var currentNode = params.currentNode;
			var userFilters = params.userFilters;
			var arrHistoryType = params.arrHistoryType;
			var arrParentId = params.arrParentId;
			var searchOperators = rSearch.getSearchOperators();
			var logicalOperators = rSearch.getLogicalOperators();
			var andLogicalOperator = logicalOperators.AND;
			var appendExpression = [];

			if (currentNode === 'projectresource' && userFilters.projectResourceFilters.length) {
				appendExpression.push(userFilters.projectResourceFilters, andLogicalOperator);
			} else if (userFilters.resourceAllocationFilters.length) {
				appendExpression.push(userFilters.resourceAllocationFilters, andLogicalOperator);
			}
			if (arrParentId.length) {
				var parentType = arrHistoryType[arrHistoryType.length - 1];
				appendExpression.push([
						(parentType == 'projectresource')
						? 'resource'
						: parentType, searchOperators.ANYOF, arrParentId
					],
					andLogicalOperator);
			}
			appendExpression.pop();
			if (appendExpression.length) {
				var filterExpression = searchObject.filterExpression; //Copy to variable as filterExpression is immutable
				if (searchObject.filterExpression.length) {
					filterExpression.push(andLogicalOperator);
				}
				filterExpression.push(appendExpression);
				searchObject.filterExpression = filterExpression;
			}

			rLog.endMethod();
		};

		/*
		 * Build the Customer Node for the left pane
		 * @param {Object} params.eachRecord - search result from Resource Allocation
		 * @param {Array} params.arrHistoryNode - node type of processed parent nodes
		 * @param {Array} params.nodeId - Id to be assigne to new node. For children node, it may have parent id. I.e. 123-456-789
		 * @param {Boolean} params.isLeafNode - Last children node
		 * @return {Object} Customer Object
		 */
		module.buildCustomerNode = function (params) {
			rLog.startMethod('buildCustomerNode');
			var eachRecord = params.eachRecord;
			var arrHistoryType = params.arrHistoryType;
			var customerId = eachRecord.getValue({name: 'internalid', join: 'customer', summary: 'group'});
			var customerName = this.getCustomerName(eachRecord);
			var customerNode = {
				Id: params.nodeId || customerId,
				Name: customerName,
				customerId: customerId,
				customerName: customerName,
				expandable: !(params.isLeafNode),
				expanded: false,
				type: null,
				workCal: null,
				supervisorId: null,
				supervisor: null,
				comment: null,
				nodeType: 'customer',
				children: []
			};

			if ((arrHistoryType.indexOf('resource') >= 0) || (arrHistoryType.indexOf('projectresource') >= 0)) {
				customerNode.resourceId = eachRecord.getValue({name: 'internalid', join: 'resource', summary: 'group'});
				customerNode.resourceName = eachRecord.getValue({name: 'entityid', join: 'resource', summary: 'group'});
			}
			if (arrHistoryType.indexOf('project') >= 0) {
				customerNode.projectId = eachRecord.getValue({name: 'internalid', join: 'job', summary: 'group'});
				customerNode.projectName = eachRecord.getValue({name: 'companyname', join: 'job', summary: 'group'});
			}

			rLog.endMethod();
			return customerNode;
		};

		/*
		 * Get Customer Name whether if its an individual or a company
		 * @param {Object} eachRecord - search result from Resource Allocation
		 * @return {String} Customer name
		 */
		module.getCustomerName = function (eachRecord) {
			rLog.startMethod('getCustomerName');
			var customerName = '';
			if (eachRecord.getValue({name: 'isperson', join: 'customer', summary: 'group'})) {
				customerName = eachRecord.getValue({name: 'firstname', join: 'customer', summary: 'group'})
							   + ' ' + eachRecord.getValue({name: 'lastname', join: 'customer', summary: 'group'});
			} else {
				customerName = eachRecord.getValue({name: 'companyname', join: 'customer', summary: 'group'});
			}
			rLog.endMethod();
			return customerName;
		};

		/*
		 * Build the Resource Node from project resource for the left pane
		 * @param {Object} params.eachRecord - search result from Resource Allocation
		 * @param {Boolean} params.isLeafNode - Last children node
		 * @return {Object} Resource Object
		 */
		module.buildProjectResourceNode = function (params) {
			rLog.startMethod('buildProjectResourceNode');

			var eachRecord = params.eachRecord;
			var projectResourceId = eachRecord.getValue({name: 'internalid'});
			var projectResourceName = eachRecord.getValue({name: 'entityid'});
			var resourceNode = {
				Id: projectResourceId,
				Name: projectResourceName,
				resourceId: projectResourceId,
				resourceName: projectResourceName,
				expandable: !(params.isLeafNode),
				expanded: false,
				workCal: eachRecord.getValue({name: 'internalid', join: 'workcalendar'}),
				type: eachRecord.getValue({name: 'formulatext'}),
				supervisorId: eachRecord.getValue({name: 'supervisor', join: 'employee'}),
				supervisor: this.translateNone(eachRecord.getText({name: 'supervisor', join: 'employee'})),
				children: [],
				nodeType: 'resource',
				details: {
					tip: {
						name: projectResourceName,
						emp_laborcost: eachRecord.getValue({
							name: 'laborcost',
							join: 'employee'
						}) && +eachRecord.getValue({name: 'laborcost', join: 'employee'}),
						emp_labortype: this.translateNone(eachRecord.getText({name: 'employeetype', join: 'employee'})),
						emp_billingclass: this.translateNone(eachRecord.getText({name: 'billingclass', join: 'employee'})),
						vend_laborcost: eachRecord.getValue({
							name: 'laborcost',
							join: 'vendor'
						}) && +eachRecord.getValue({name: 'laborcost', join: 'vendor'}),
						vend_is1099eligible: eachRecord.getValue({name: 'is1099eligible', join: 'vendor'}),
						genrsrc_laborcost: eachRecord.getValue({
							name: 'laborcost',
							join: 'genericresource'
						}) && +eachRecord.getValue({name: 'laborcost', join: 'genericresource'}),
						genrsrc_price: eachRecord.getValue({
							name: 'laborprice',
							join: 'genericresource'
						}) && +eachRecord.getValue({name: 'laborprice', join: 'genericresource'})
					}
				}
			};

			rLog.endMethod();
			return resourceNode;
		};

		/*
		 * Build the Resource Node for the left pane
		 * @param {Object} params.eachRecord - search result from Resource Allocation
		 * @param {Array} params.arrHistoryNode - node type of processed parent nodes
		 * @param {Object} params.requestParams - http request data
		 * @param {Array} params.nodeId - Id to be assigne to new node. For children node, it may have parent id. I.e. 123-456-789
		 * @param {Boolean} params.isLeafNode - Last children node
		 * @return {Object} Resource Object
		 */
		module.buildResourceNode = function (params) {
			rLog.startMethod('buildResourceNode');

			var eachRecord = params.eachRecord;
			var arrHistoryType = params.arrHistoryType;
			var requestParams = params.requestParams;
			var billingClass = eachRecord.getValue({name: 'billingclass', join: 'employee', summary: 'group'});
			var resourceId = eachRecord.getValue({name: 'internalid', join: 'resource', summary: 'group'});
			var resourceName = eachRecord.getText({name: 'resource', summary: 'group'});
			var customerId = eachRecord.getValue({name: 'internalid', join: 'customer', summary: 'group'});
			var customerName = this.translateNone(this.getCustomerName(eachRecord));
			var empWcId = eachRecord.getValue({name: 'workcalendar', join: 'employee', summary: 'group'});
			var venWcId = eachRecord.getValue({name: 'workcalendar', join: 'vendor', summary: 'group'});
			var genWcId = eachRecord.getValue({name: 'workcalendar', join: 'genericresource', summary: 'group'});
			var resourceNode = {
				Id: params.nodeId || resourceId,
				Name: resourceName,
				resourceId: resourceId,
				resourceName: resourceName,
				customerId: customerId,
				customer: customerName, //Todo: Merge customer with customerName and update UI attribute names
				customerName: customerName,
				expandable: !(params.isLeafNode),
				expanded: false,
				workCal: empWcId || venWcId || genWcId,
				type: eachRecord.getValue({name: 'formulatext', summary: 'group'}),
				supervisorId: eachRecord.getValue({name: 'supervisor', join: 'employee', summary: 'group'}),
				supervisor: this.translateNone(eachRecord.getText({name: 'supervisor', join: 'employee', summary: 'group'})),
				children: [],
				nodeType: 'resource',
				details: {
					tip: {
						name: resourceName,
						emp_laborcost: eachRecord.getValue({
							name: 'laborcost',
							join: 'employee',
							summary: 'avg'
						}) && +eachRecord.getValue({name: 'laborcost', join: 'employee', summary: 'avg'}),
						emp_labortype: this.translateNone(
							eachRecord.getValue({
								name: 'employeetype',
								join: 'employee',
								summary: 'group'
							})
						),
						emp_billingclass: this.translateNone(
							eachRecord.getText({
								name: 'billingclass',
								join: 'employee',
								summary: 'group'
							})
						),
						vend_laborcost: eachRecord.getValue({
							name: 'laborcost',
							join: 'vendor',
							summary: 'avg'
						}) && +eachRecord.getValue({name: 'laborcost', join: 'vendor', summary: 'avg'}),
						vend_is1099eligible: eachRecord.getValue({
							name: 'is1099eligible',
							join: 'vendor',
							summary: 'group'
						}),
						genrsrc_laborcost: eachRecord.getValue({
							name: 'laborcost',
							join: 'genericresource',
							summary: 'avg'
						}) && +eachRecord.getValue({name: 'laborcost', join: 'genericresource', summary: 'avg'}),
						genrsrc_price: eachRecord.getValue({
							name: 'laborprice',
							join: 'genericresource',
							summary: 'avg'
						}) && +eachRecord.getValue({name: 'laborprice', join: 'genericresource', summary: 'avg'})
					}
				}
			};

			if (empWcId) { //Billing Rates only for employees
				if (billingClass) {
					var currency = this.defaultCurrency;
					if (rRuntime.isFeatureEnabled({feature: 'multicurrency'})) {
						var subsidiary = eachRecord.getValue(({
							name: 'subsidiary',
							join: 'employee',
							summary: 'group'
						}));
						currency = subsidiary && this.subsidiarycurrency[subsidiary];
						rLog.debug('subsidiary: ' + subsidiary + ' currency: ' + currency);
					}
					if (this.billingclass_prices[billingClass] && this.billingclass_prices[billingClass][currency]) {
						resourceNode.details.tip.emp_billingrate = this.billingclass_prices[billingClass][currency];
					}
				} else {
					resourceNode.details.tip.emp_billingrate = null;
				}
			}

			if (arrHistoryType.indexOf('project') >= 0) {
				var projectId = eachRecord.getValue({name: 'internalid', join: 'job', summary: 'group'});
				var projectName = eachRecord.getValue({name: 'companyname', join: 'job', summary: 'group'});
				var templateId = eachRecord.getValue({name: 'internalid', join: 'projecttemplate', summary: 'group'});
				var templateName = eachRecord.getValue({name: 'entityid', join: 'projecttemplate', summary: 'group'});
				var isProjectTemplate = !rUtility.isValidObject(projectId) && rUtility.isValidObject(templateId);
				if (requestParams.incProjectTemplate && isProjectTemplate) {
					resourceNode.projectId = templateId;
					resourceNode.projectName = templateName;
				} else {
					resourceNode.projectId = projectId;
					resourceNode.projectName = projectName;
				}
			}

			rLog.endMethod();
			return resourceNode;
		};

		/*
		 * Build the Project Node for the left pane
		 * @param {Object} params.eachRecord - search result from Resource Allocation
		 * @param {Array} params.arrHistoryNode - node type of processed parent nodes
		 * @param {Array} params.nodeId - Id to be assigne to new node. For children node, it may have parent id. I.e. 123-456-789
		 * @param {Boolean} params.isLeafNode - Last children node
		 * @return {Object} Project Object
		 */
		module.buildProjectNode = function (params) {
			rLog.startMethod('buildProjectNode');
			var eachRecord = params.eachRecord;
			var arrHistoryType = params.arrHistoryType;
			var showProjectTasks = params.showProjectTasks;
			var projectId = eachRecord.getValue({name: 'internalid', join: 'job', summary: 'group'});
			var projectName = eachRecord.getValue({name: 'companyname', join: 'job', summary: 'group'});
			var projectTitle = eachRecord.getValue({name: 'formulatext', summary: 'group'});
			var projectStatus = eachRecord.getText({name: 'entitystatus', join: 'job', summary: 'group'});
			var templateId = eachRecord.getValue({name: 'internalid', join: 'projecttemplate', summary: 'group'});
			var templateName = eachRecord.getValue({name: 'entityid', join: 'projecttemplate', summary: 'group'});
			var customerId = eachRecord.getValue({name: 'internalid', join: 'customer', summary: 'group'});
			var customerName = this.translateNone(this.getCustomerName(eachRecord));
			var isProjectTemplate = !rUtility.isValidObject(projectId) && rUtility.isValidObject(templateId);

			if (isProjectTemplate) {
				//Replace project id and name with template data
				if (params.nodeId) {
					var tempNodeId = params.nodeId.split(this.ID_SEPARATOR);
					tempNodeId.pop();
					tempNodeId.push(templateId);
					params.nodeId = tempNodeId.join(this.ID_SEPARATOR);
				}
				projectId = templateId;
				projectName = templateName;
				projectStatus = 'template';
			} else if (this.arrProjectId.indexOf(projectId) < 0) {
				//Project ids to add user comments
				this.arrProjectId.push(projectId);
			}

			var taskSearch = rSearch.create({
				type: 'projecttask',
				columns: ['company'],
				filters: [
					['company', 'is', projectId]
				]
			});
			var taskCount = taskSearch.runPaged({
				pageSize: 1
			});
			var hasTasks = !!(taskCount.count);

			var projectNode = {
				Id: params.nodeId || projectId,
				Name: projectName,
				projectId: projectId,
				projectName: projectName,
				projectTitle: projectTitle,
				customerId: customerId,
				customer: customerName, //Todo: Merge customer with customerName and update UI attribute names
				customerName: customerName,
				status: projectStatus,
				expandable: !(params.isLeafNode),
				expanded: false,
				comment: isProjectTemplate ? '' : this.placeholderComment.replace('PID', projectId),
				children: [],
				nodeType: 'project',
				details: this.buildProjectDetails(
					{
						eachRecord: eachRecord,
						isProjectTemplate: isProjectTemplate
					}
				),
				hasTasks: hasTasks
			};

			if (params.isLeafNode) {
				//add task info only applicable to view by resource
				var taskId = showProjectTasks && eachRecord.getValue({name: 'projecttask', summary: 'group'}) || 0;
				var taskName = showProjectTasks && eachRecord.getText({name: 'projecttask', summary: 'group'}) || '';
				projectNode.Id = projectNode.Id + this.ID_SEPARATOR + taskId;
				if (taskName && taskName.indexOf(this.noneString) === -1) {
					projectNode.Name = projectNode.Name + ' : ' + taskName;
				}
				projectNode.taskId = taskId;
				projectNode.taskName = this.translateNone(taskName);
			}

			if ((arrHistoryType.indexOf('resource') >= 0) || (arrHistoryType.indexOf('projectresource') >= 0)) {
				projectNode.resourceId = eachRecord.getValue({name: 'internalid', join: 'resource', summary: 'group'});
				projectNode.resourceName = eachRecord.getValue({name: 'entityid', join: 'resource', summary: 'group'});
			}

			rLog.endMethod();
			return projectNode;
		};

		/*
		 * Build the Project Details
		 * @param {Object} params.eachRecord - search result from Resource Allocation
		 * @param {Array} params.isProjectTemplate - If Project being build is a Project Template
		 * @return {Object} Project Details Object
		 */
		module.buildProjectDetails = function (params) {
			rLog.startMethod('buildProjectDetails');

			var eachRecord = params.eachRecord,
				estimatedTimeId = this.getEstimatedTimeId();

			var objTip = null;
			if (params.isProjectTemplate) {
				objTip = {
					name: eachRecord.getValue({name: 'entityid', join: 'projecttemplate', summary: 'group'}),
					estimate: rDate.convertTimeToHHMM(eachRecord.getValue({
						name: estimatedTimeId,
						join: 'projecttemplate',
						summary: 'group'
					})),
					start: eachRecord.getValue({name: 'startdate', join: 'projecttemplate', summary: 'group'})
				};
			} else {
				var projectTitle = eachRecord.getValue({name: 'formulatext', summary: 'group'});

				var percent = eachRecord.getValue({name: 'percenttimecomplete', join: 'job', summary: 'group'});
				if (percent) {
					percent = Number(percent.replace('%', '')).toFixed(1) + '%';
				}
				objTip = {
					name: projectTitle,
					percent: percent,
					estimate: rDate.convertTimeToHHMM(eachRecord.getValue({
						name: estimatedTimeId,
						join: 'job',
						summary: 'group'
					})),
					actual: rDate.convertTimeToHHMM(eachRecord.getValue({
						name: 'actualtime',
						join: 'job',
						summary: 'group'
					})),
					remaining: rDate.convertTimeToHHMM(eachRecord.getValue({
						name: 'timeremaining',
						join: 'job',
						summary: 'group'
					})),
					start: eachRecord.getValue({name: 'startdate', join: 'job', summary: 'group'}),
					end: eachRecord.getValue({name: 'calculatedenddate', join: 'job', summary: 'group'}),
					allocated: rDate.convertTimeToHHMM(eachRecord.getValue({
						name: 'allocatedtime',
						join: 'job',
						summary: 'group'
					})),
					projectprice: eachRecord.getValue({
						name: 'jobprice',
						join: 'job',
						summary: 'group'
					}) && +eachRecord.getValue({name: 'jobprice', join: 'job', summary: 'group'})
				};
			}

			rLog.endMethod();
			return {
				tip: objTip
			};
		};

		return module;
	});