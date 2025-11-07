/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.Store.Resource', {
	extend: 'Sch.data.ResourceTreeStore',
	model: 'RA.Cmp.Model.ChartResource',
	folderSort: true,
	nextId: 0,
	loadWithFilters: function (mode, filters) {
		// need to identify which search component to use based on active mode
		var resourceSearch = null;
		if (RA.App.ModeManager.mode == RA.App.Constant.MODE_GRID) {
			resourceSearch = Ext4.getCmp('ra-grid-resource-search');
		} else {
			resourceSearch = Ext4.getCmp('ra-resource-search');
		}

		this.getLoadParameters(filters);

		switch (mode) {
			case RA.App.Constant.LOAD_MODE_RELOAD:
				if (resourceSearch) resourceSearch.setValue();
			case RA.App.Constant.LOAD_MODE_SEARCH:
				this.allDataParams.resourceSearch = resourceSearch ? resourceSearch.getValue() : '';
				this.allDataParams.start = 0;
				this.allDataParams.limit = RA.App.Stores.settingStore.getLimit();
				break;
			case RA.App.Constant.LOAD_MODE_PAGE:
				break;
			case RA.App.Constant.LOAD_MODE_SAVE: // do not update params. remain in current page.
				break;
		}
		if (this.getRootNode()) {
			this.getRootNode().removeAll();
		}

		// reset sorting of resource column
		delete RA.App.Stores.gridStore.sorters.removeAll();
		delete RA.App.Stores.chartResource.sorters.removeAll();

		this.load({
			params: this.getParams()
		});
	},
	getLoadParameters: function (filters) {
		var allDataParams = RA.App.Stores.chartResource.allDataParams;
		var featureStore = RA.App.Stores.featureStore;
        var getProjectFilter = function () {
            if (RA.Util.Dashboard.isActive()) {
                return RA.Util.Dashboard.getProjectId();
            }
            if (filters.project) {
                return filters.project.toString();
            }
            return '';
        };

		if (RA.App.Settings != null) {
			allDataParams.showAllResources = RA.App.Settings.get('includeAllResources') || 'F';
			allDataParams.includeRejected = RA.App.Stores.featureStore.isRAAWEnabled() && RA.App.Settings.get('includeRejected') || 'F';
			allDataParams.allocatinUnit = RA.App.Settings.get('allocateById') || 'P';
			allDataParams.showProjectTasks = RA.App.Settings.get('showProjectTasks') || 'F';
			allDataParams.incProjectTemplate = RA.App.Settings.get('incProjectTemplate') || 'F';
		}

		if (!filters) {
			return;
		}

		allDataParams.resourcesFilter = filters.name ? filters.name.toString() : '';
		allDataParams.startDate = filters.startdate
								  ? (Ext4.Date.format(new Date(filters.startdate), 'Y/m/d') || '')
								  : '';
		allDataParams.entityTypeFilter = filters.type ? filters.type.toString() : '';
		allDataParams.vendorTypeFilter = filters.isperson ? filters.isperson.toString() : '';
		allDataParams.vendorCategoryFilter = filters.vendorcategory ? filters.vendorcategory.toString() : '';

        allDataParams.projectFilter = getProjectFilter();
		allDataParams.projectTaskFilter = filters.projecttask ? filters.projecttask.toString() : '',
		allDataParams.customerFilter = filters.customer ? filters.customer.toString() : '';
		allDataParams.allocationTypeFilter = filters.allocationtype ? filters.allocationtype.toString() : '';
		allDataParams.approvalStatusFilter = filters.approvalstatus ? filters.approvalstatus.toString() : '';
		allDataParams.allocationLevelFilter = filters.allocationlevel ? filters.allocationlevel.toString() : '';

		if (featureStore.getById('subsidiary').get('isEnabled') && filters.subsidiary) {
			allDataParams.subsidiaryFilter = filters.subsidiary.toString();
//            allDataParams.childSubsidiary = filterRecord.get('subsidiariesChild');
		} else {
			allDataParams.subsidiaryFilter = '';
			allDataParams.childSubsidiary = false;
		}

		if (featureStore.getById('billingClass').get('isEnabled') && filters.billingclass) {
			allDataParams.billingClassFilter = filters.billingclass.toString();
		} else {
			allDataParams.billingClassFilter = '';
		}

		if (featureStore.getById('department').get('isEnabled') && filters.department) {
			allDataParams.deptFilter = filters.department.toString();
		} else {
			allDataParams.deptFilter = '';
		}

		if (featureStore.getById('class').get('isEnabled') && filters.classification) {
			allDataParams.classFilter = filters.classification.toString();
		} else {
			allDataParams.classFilter = '';
		}

		if (featureStore.getById('location').get('isEnabled') && filters.location) {
			allDataParams.locationFilter = filters.location.toString();
		} else {
			allDataParams.locationFilter = '';
		}

        allDataParams.viewResourcesBy = RA.Util.Dashboard.isActive() ? RA.App.Constant.VIEW_PROJECT : RA.App.Filters.filter.data.viewByType;

		var segmentTypes = RA.App.Stores.resourceSegmentTypes.data.items;
		for (var i = 0; i < segmentTypes.length; i++) {
			if (filters[segmentTypes[i].data.id]) {
				allDataParams[segmentTypes[i].data.id] = filters[segmentTypes[i].data.id]
														 ? filters[segmentTypes[i].data.id].toString()
														 : '';
			}
		}
	},
	listeners: {
		beforeload: function () {
			RA.Util.Benchmarking.start(RA.Util.Benchmarking.constants.LOADING_RESOURCES);
			if (RA.App.Grid) {
				RA.App.ModeManager.getActive().mask();
			}
		},
		load: function (store, root, childNodes, success) {
			var getResourceCount = function(childNodes) {
				var total = 0;

				if (childNodes) {
					for (var i = 0; i < childNodes.length; i++) {
						if (childNodes[i].data.nodeType === 'resource') {
							total++;
						} else {
							if (childNodes[i].childNodes) {
								total += getResourceCount(childNodes[i].childNodes);
							}
						}
					}
				}

				return total;
			};

			RA.Util.Benchmarking.stopAndGetPayload(RA.Util.Benchmarking.constants.LOADING_RESOURCES);

			RA.Util.Benchmarking.log(
				RA.Util.Benchmarking.constants.LOADING_RESOURCES,
				'[PSA] RACG loading resources',
				{
					RACG_resourceCount: getResourceCount(childNodes)
				},
				true
			);
			if (success) {
				var rawData = store.getProxy().getReader().jsonData;
				store.isLoaded = true;

				//Load Page Field
				if (store.mode != RA.App.Constant.LOAD_MODE_PAGE) {
					RA.App.Stores.pageStore.load({
						params: store.getParams()
					});
				}

				//Set the Total Field on Upper Right
				RA.App.Stores.resourceCount.load({
					params: store.getParams()
				});

				if (root.childNodes && root.childNodes.length > 0) {
					// Performance improvement: Replace/Add filter values for the right pane
					// since current page resource id will always be a subset of filter values
					var leftFilter = JSON.parse(JSON.stringify(store.getParams() || {}));

					var nodeIdMap = {
						customer: [],
						project: [],
						resource: []
					};

					root.cascadeBy(function (node) {
						var nodeType = node.get('nodeType');

						if (nodeType) {
							nodeIdMap[nodeType].push(node.get('Id').split(RA.App.Constant.SEPARATOR_ID)[node.get('depth') - 1]);
						}
					});

					if ((nodeIdMap.customer.length + nodeIdMap.project.length + nodeIdMap.resource.length) > 360) {
						//Node id will be passed as Get parameter in url but Url can only handle aprox 2000~ length
						var strWarning = translatedStrings.getText('MESSAGE.WARNING.LARGE_CHILDREN');
						var type = '';
						if (nodeIdMap.customer.length >= 120) {
							type = 'customer';
						} else if (nodeIdMap.project.length >= 120) {
							type = 'project';
						} else if (nodeIdMap.resource.length >= 120) {
							type = 'resource';
						}
						alert(strWarning.replace(/\{0\}/g, type));
						//Make a rough id purge to avoid error
						nodeIdMap.customer = nodeIdMap.customer.slice(0, 120);
						nodeIdMap.project = nodeIdMap.project.slice(0, 120);
						nodeIdMap.resource = nodeIdMap.resource.slice(0, 120);
					}

					Ext4.apply(leftFilter, {
						customerFilter: nodeIdMap.customer.join(','),
						projectFilter: nodeIdMap.project.join(','),
						resourcesFilter: nodeIdMap.resource.join(',')
					});

					RA.App.Stores.timeOff.load({
						params: leftFilter
					});

					RA.App.Stores.chartEvent.removeAll();
					RA.App.Stores.chartEvent.load({
						params: leftFilter
					});

					if (rawData.children && rawData.children.length) {
						Ext4.getCmp('ra-page-combo-box').show();
						Ext4.getCmp('ra-prevPage').show();
						Ext4.getCmp('ra-nextPage').show();
					} else {
						Ext4.getCmp('ra-page-combo-box').hide();
						Ext4.getCmp('ra-prevPage').hide();
						Ext4.getCmp('ra-nextPage').hide();
					}
				}
			} else {
				console.error('Failed to Load Chart Resource.');
				alert(translatedStrings.getText('MESSAGE.ERROR.BACKEND_ERROR'));
			}
		}
	},
	isRowExisting: function (rowNum) {
		var isExists = false;
		this.getRootNode().cascadeBy(function (node) {
			if (node.get('Id') == rowNum) {
				isExists = true;
			}
		});
		return isExists;
	},
	getResourceObjByRow: function (rowNum) {
		var rnode = null;
		this.getRootNode().cascadeBy(function (node) {
			if (node.get('Id') == rowNum) {
				rnode = node;
			}
		});
		return rnode;
	},
	setIsDirtyOfProjectHoverOfAllocation: function (projectId) {
		var projectIndex = 1;
		if (RA.App.Filters.filter.data.viewByType === 3) {
			projectIndex = 0;
		}
		this.getRootNode().cascadeBy(function (node) {
			if (node.get('nodeType') === 'project' && node.get('Id').split(RA.App.Constant.SEPARATOR_ID)[projectIndex] === projectId.toString()) {
				node.set('isDirtyForProjectHover', true);
			}
		});
	},
	getRowsByResourceId: function (resourceId) {
		var rows = new Array();
		this.getRootNode().cascadeBy(function (node) {
			if (node.get('resourceId') == resourceId) {
				rows.push(node.get('Id'));
			}
		});
		return rows;
	},
	addNewResourceRow: function (resource) {
		var param = {
			resourceId: resource.get('id'),
			nodeTypes: 'resource',
			resourceObj: resource,
			projectObj: {}
		};
		var newNode = this.addNewAllocationNode(param);
		newNode.set('expanded', true);
		newNode.set('leaf', false);
		newNode.set('expandable', true);
		newNode.set('loaded', true);
		this.removeNoResultsNode();
		this.getRootNode().insertChild(0, newNode);
		return newNode;
	},
	addNewResourceProjectRow: function (param) {
		var param = {
			resourceId: param.resourceId,
			projectId: param.projectId,
			projTaskObj: param.projTaskObj,
			resourceObj: param.resourceObj,
			projectObj: param.projectObj,
			nodeTypes: 'resource,projecttask'.split(',')
		};
		var newNode = this.addNewAllocationNode(param);
		if (!this.isRowExisting(newNode.getId('Id'))) {
			this.getRootNode().appendChild(newNode);
		}
	},
	//Cascade creation of allocation row
	addNewAllocationRow: function (param) {
		var arrNodeType;
		switch (RA.App.Filters.filter.data.viewByType) {
			case 1:
				arrNodeType = 'resource,projecttask'.split(',');
				break;
			case 2:
				arrNodeType = 'customer,project,resource'.split(',');
				break;
			case 3:
				arrNodeType = 'project,resource'.split(',');
				break;
		}
		param.nodeTypes = arrNodeType;
		var rootNode = this.addNewAllocationNode(param);
		if (!this.isRowExisting(rootNode.getId('Id'))) {
			this.getRootNode().appendChild(rootNode);
		}
	},
	//Recursively create Resource or LeftPane Entry base on "nodeTypes" array parameter
	addNewAllocationNode: function (param) {
		param.nodeTypes = [].concat(param.nodeTypes); //Convert to arrayType if not array object
		var currentNode = param.nodeTypes.shift(); //Pop out first element (project,projecttask,customer or resource)
		var newResourceId = param.resourceId || 0;
		var newProjectId = param.projectId || 0;
		var newCustomerId = param.customerId || 0;
		var newProjectTaskObj = param.projTaskObj || {};
		var projectObj = (param.projectObj && param.projectObj.raw) ? param.projectObj.raw : {}; //  = RA.App.Stores.projectStore.data.get(newProjectId).raw,
		var resourceObj = param.resourceObj.raw;
		var leafNode = !(param.nodeTypes.length);
		var createNode, tmpRowId = [], rowId, rowName;
		var defaultNumericValue = 0;
		var limitDecimalPlaces = RA.App.Settings.get('limitDecimalPlaces');

		//Set RowId
		param.processedNode = param.processedNode || [];
		param.processedNode.push(currentNode);
		for (var i = 0; i < param.processedNode.length; i++) {
			switch (param.processedNode[i]) {
				case 'resource' :
					tmpRowId.push(newResourceId);
					break;
				case 'customer' :
					tmpRowId.push(newCustomerId);
					break;
				case 'project'  :
					tmpRowId.push(newProjectId);
					break;
				case 'projecttask':
					var projTaskId = newProjectTaskObj.taskId || 0;
					tmpRowId.push([newProjectId, projTaskId].join(RA.App.Constant.SEPARATOR_ID));
					break;
			}
		}
		rowId = tmpRowId.join(RA.App.Constant.SEPARATOR_ID);

		//Set Row Name
		switch (currentNode) {
			case 'resource'     :
				rowName = resourceObj.name;
				break;
			case 'customer'     :
				rowName = projectObj.customer;
				break;
			case 'project'      :
				rowName = projectObj.name;
				break;
			case 'projecttask'  :
				var arrTaskName = [projectObj.name];
				if (newProjectTaskObj.taskName) {
					arrTaskName.push(newProjectTaskObj.taskName);
				}
				rowName = arrTaskName.join(RA.App.Constant.SEPARATOR_NAME);
		}

		// Check if Parent row exist
		if (!this.isRowExisting(rowId)) {
			createNode = Ext4.create('RA.Cmp.Model.ChartResource', {
				Id: rowId,
				Name: rowName,
				resourceId: newResourceId,
				resourceName: resourceObj.name,
				projectId: newProjectId,
				projectName: projectObj.name,
				projectTitle: projectObj.projectTitle,
				customerId: newCustomerId,
				comment: null,
				expandable: !leafNode,
				leaf: leafNode,
				nodeType: (currentNode === 'projecttask') ? 'project' : currentNode,
				children: [],
			});

			//Additional attribute information base from node Type
			if (currentNode === 'resource') {
				var resourceType = Ext4.util.Format.lowercase((resourceObj.type === 'GenericRsrc' || resourceObj.type === 'genericresource') ? 'generic resource' : resourceObj.type);

				if (resourceType === 'employee') {
					resourceType = translatedStrings.getText('STORE.EMPLOYEE');
				} else if (resourceType === 'vendor') {
					resourceType = translatedStrings.getText('STORE.VENDOR');
				} else if (resourceType === 'generic resource') {
					resourceType = translatedStrings.getText('STORE.GENERIC_RESOURCE');
				}

				createNode.set('type', Ext4.util.Format.capitalize(resourceType)); // not sure why some are not capitalized
				createNode.set('supervisor', resourceObj.supervisor || translatedStrings.getText('DISPLAY.NONE'));
				createNode.set('hrsPerDay', resourceObj.hrsPerDay);
				createNode.set('workCalendarId', Number(resourceObj.workCal));
				createNode.set('workCalendar', resourceObj.workCalendarRecord);
				createNode.set('details', {
					tip: {
						name: resourceObj.name,
						emp_labortype: (resourceObj.emp_labortype || translatedStrings.getText('DISPLAY.NONE')),
						emp_laborcost: resourceObj.emp_laborcost,
						vend_is1099eligible: resourceObj.vend_is1099eligible,
						vend_laborcost: resourceObj.vend_laborcost,
						genrsrc_laborcost: resourceObj.genrsrc_laborcost || defaultNumericValue.toFixed(limitDecimalPlaces),
						genrsrc_price: resourceObj.genrsrc_price || defaultNumericValue.toFixed(limitDecimalPlaces),
						emp_billingclass: (resourceObj.emp_billingclass || translatedStrings.getText('DISPLAY.NONE'))
					}
				});
			} else if (currentNode === 'project' || currentNode === 'projecttask') {

				var commentModel = RA.App.Stores.projectCommentSaver.getById(Number(newProjectId));
				createNode.set('comment', commentModel ? commentModel.data.comment : '');
				createNode.set('customer', projectObj.customer || translatedStrings.getText('DISPLAY.NONE'));
				createNode.set('taskId', newProjectTaskObj.taskId);
				createNode.set('taskName', newProjectTaskObj.taskName || translatedStrings.getText('DISPLAY.NONE'));
				createNode.set('details', {
					tip: {
						name: rowName,
						percent: projectObj.percent,
						estimate: projectObj.estimate,
						actual: projectObj.actual,
						remaining: projectObj.remaining,
						start: projectObj.startDate,
						end: projectObj.endDate,
						allocated: projectObj.allocated
					}
				});
				createNode.set('hasTasks', (projectObj.taskCount > 0));
			}
		} else {
			createNode = this.getResourceObjByRow(rowId); //reuse existing node
		}

		if (!leafNode) {
			createNode.appendChild(this.addNewAllocationNode(param));
		}

		return createNode;
	},
	allDataParams: {
		showAllResources: 'F', // T or F
		showProjectTasks: 'F', // T or F
		billingClassFilter: '', // comma separated ids
		classFilter: '', // comma separated ids
		deptFilter: '', // comma separated ids
		locationFilter: '', // comma separated ids
		resourcesFilter: '', // comma separated ids
		subsidiaryFilter: '', // comma separated ids
		vendorTypeFilter: '', // id
		vendorCategoryFilter: '', // comma separated ids
		entityTypeFilter: '', // empty, Employee, Vendor
		startDate: '',
		includeRejected: 'F',
		allocatinUnit: 'P', // P - Percentage, H - Hours
		page: 1,
		limit: 20,
		start: 0,
		childSubsidiary: false,
		childDepartment: false,
		childClassification: false,
		childLocation: false,
		resourceSearch: '',
		viewResourcesBy: 1, //default to view by Resource
		incProjectTemplate: 'F'
	},
	getParams: function () {
		return this.allDataParams;
	},
	removeNoResultsNode: function () {
		var noResultsNode = null;
		noResultsNode = this.getNodeById('0');
		if (noResultsNode) {
			this.getRootNode().removeChild(noResultsNode);
		}
	},
	addNoResultsNode: function () {
		var noResultsNode = Ext4.create('RA.Cmp.Model.ChartResource', {
			Name: translatedStrings.getText('SS.MESSAGE.NO_RESULTS_VIEW'),
			Id: 0,
			children: []
		});
		this.getRootNode().insertChild(0, noResultsNode);
	},
	updateResourceRow: function (resourceNode, newResourceId, newResourceNode) {
		// update resource row with newly selected resource
		var resourceObj = resourceNode.raw = newResourceNode.raw;
		resourceNode.beginEdit();
		resourceNode.set('Id', newResourceId);
		resourceNode.set('Name', resourceObj.name);
		resourceNode.set('resourceId', newResourceId);
		resourceNode.set('resourceName', resourceObj.name);
		resourceNode.set('workCalendarId', Number(resourceObj.workCal));
		resourceNode.set('type', resourceObj.type);
		resourceNode.data.details.tip.name = resourceObj.name;
		resourceNode.endEdit();
	},
	updateProjectRow: function (projectNode, newResourceId, projectId, taskId, newResourceNode) {
		// update project row with newly selected resource
		var resourceObj = newResourceNode.raw;
		var newRowId = [newResourceId, projectId, taskId].join(RA.App.Constant.SEPARATOR_ID);

		// get comment model
		var commentModel = RA.App.Stores.projectCommentSaver.getById(Number(projectId));

		projectNode.beginEdit();
		projectNode.set('Id', newRowId);
		projectNode.set('resourceId', newResourceId);
		projectNode.set('resourceName', resourceObj.name);
		projectNode.set('projectId', projectId);
		projectNode.set('projectName', resourceObj.name);
		projectNode.set('customer', newResourceNode.raw.customer);
		projectNode.set('comment', commentModel ? commentModel.data.comment : '');
		projectNode.endEdit();
	}
});