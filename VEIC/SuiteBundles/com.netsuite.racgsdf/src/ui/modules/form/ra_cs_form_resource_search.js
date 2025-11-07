/**
 * © 2017 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.Cmp.ResourceSearchForm', {
	id: 'ra-resourceSearchWindow',
	extend: 'RA.Cmp.Window',
	title: translatedStrings.getText('WINDOW.SEARCH_RESOURCE'),
	width: 600,
	returnToCriteria: false,
	initComponent: function (args) {
		this.callParent(args);

		this.add([
			Ext4.create('RA.Cmp.FormPanel', {
				id: 'ra-resourceSearchPanel',
				dockedItems: [
					{
						xtype: 'raformmenu',
						items: [
							Ext4.create('RA.Cmp.BlueButton', {
								id: 'ra-resourceSearchSubmitBtn',
								text: translatedStrings.getText('BUTTON.SUBMIT'),
								formBind: true,
								handler: function () {
									perfTestLogger.start('Search Resource (form)');
									var searchPreloader = Ext4.create("Ext.window.Window",{
										width : 300,
										height: 100,
										bodyPadding: 5,
										modal: true,
										closable: false,
										html : translatedStrings.getText('MESSAGE.WARNING.PERFORMING_SEARCH')
									})
										.show()
										.toFront();

									var savedFilterCombo = Ext4.getCmp('savedFilters');
									var filterRecord = savedFilterCombo.getSelectedRecord();
									var resourceType = filterRecord.get('resourceType');
									var resources = '';
									var resourceStore;

									switch (RA.App.Forms.resourceSearchForm.formId) {
										case 'new-ra':
											resourceStore = Ext4.getCmp('new-ra-resource').getStore();
											break;
										case 'edit-ra':
											resourceStore = Ext4.getCmp('edit-ra-resource').getStore();
											break;
										case 'ra-field-editor':
											resourceStore = Ext4.getCmp('ra-field-editor-resource').getStore();
											break;
										case 'reassign-ra' :
											resourceStore = Ext4.getCmp('reassign-ra-resource').getStore();
											break;
										default:
											console.log('formId not recognized: ' + RA.App.Forms.resourceSearchForm.formId);
									}

									resources = resourceStore && resourceStore.data.keys;
									var skills = Ext4.getCmp('ra-itemselector') != null
												 ? JSON.stringify(Ext4.getCmp('ra-itemselector').getValue())
												 : {};
									var searchParams = {
										fieldDateFrom: Ext4.getCmp('fieldDateFrom').getSubmitValue(),
										fieldDateTo: Ext4.getCmp('fieldDateTo').getSubmitValue(),
										fieldBillingClass: Ext4.getCmp('ra-resourcesearchwindow-billingclass').getValue() &&
														   Ext4.getCmp('ra-resourcesearchwindow-billingclass').getValue().getData().id,
										fieldLaborCost: Ext4.getCmp('fieldLaborCost').getValue(),
										fieldYOE: Ext4.getCmp('fieldYOE').getValue(),
										fieldPercentAvailable: Ext4.getCmp('fieldPercentAvailable').getValue(),
										skills: skills
									};
									Ext4.Ajax.request({
										url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_res_search&deploy=customdeploy_proj_racg_su_res_search&searchType=skillsets',
										timeout: 120000,
										params: searchParams,
										success: function (response) {
											var suiteletPath;
											if (RA.App.Stores.featureStore.getById('skillsets').get('isEnabled')) {
												var suiteletUrlArr = nlapiResolveURL('SUITELET', 'customscript_rss_sl_resource_form', 'customdeploy_rss_sl_resource_form');
												suiteletPath = suiteletUrlArr.split("/").pop();
											}
											var record = Ext4.decode(response.responseText);
											var columns = "";
											var fields = "";
											var data = "";
											var levels = "";
											var header = {
												baseCls: 'ra-search-header',
												cls: 'ra-search-header-text',
												padding: '5 0 5 5'
											};
											var baseskillset = 100;
											var skillList = new Array();
											if (record.data == undefined) {
												alert(translatedStrings.getText('MESSAGE.ERROR.SEARCH_ERROR'));
												searchPreloader.hide();
												return;
											} else {
												columns = record.data.columns;
												fields = record.data.fields;
												data = record.data.values;
												levels = record.data.levels;
												currentStore = resourceStore;
												if (RA.App.Stores.featureStore.getById('skillsets').get('isEnabled')) {
													baseskillset = record.data.levels.baseskillsetscore;
												}
												for (x in columns) {
													if (columns[x].string) columns[x].text = translatedStrings.getText(columns[x].string);
													if (columns[x].dataIndex == 'id') {
														columns[x].width = 60;
														columns[x].xtype = 'actioncolumn';
														columns[x].items = [
															{
																iconCls: 'ra-select-icon',
																tooltip: translatedStrings.getText('TOOLTIP.SELECT'),
																handler: function (grid, rowIndex, colIndex) {
																	var rec = grid.getStore().getAt(rowIndex);
																	var resourceId = rec.get('id');

																	var onDataReady = function() {
																		var savedFilterCombo = Ext4.getCmp('savedFilters');
																		var filterRecord = savedFilterCombo.getSelectedRecord();
																		var resourceType = filterRecord.get('resourceType');
																		var field = null;
																		switch (RA.App.Forms.resourceSearchForm.formId) {
																			case 'new-ra'     :
																				field = Ext4.getCmp('new-ra-resource');
																				break;
																			case 'edit-ra'    :
																				field = Ext4.getCmp('edit-ra-resource');
																				break;
																			case 'ra-field-editor':
																				field = Ext4.getCmp('ra-field-editor-resource');
																				break;
																			case 'reassign-ra' :
																				field = Ext4.getCmp('reassign-ra-resource');
																				break;
																			default :
																				console.log('ERROR: unknown form Id ' + RA.App.Forms.resourceSearchForm.formId);
																		}

																		var resourceName = rec.get('name');

																		field.setValue([resourceId], resourceName);

																		Ext4.getCmp('new-ra-startDate').setValue(searchParams.fieldDateFrom);
																		Ext4.getCmp('new-ra-endDate').setValue(searchParams.fieldDateTo);

																		Ext4.getCmp('edit-ra-startDate').setValue(searchParams.fieldDateFrom);
																		Ext4.getCmp('edit-ra-endDate').setValue(searchParams.fieldDateTo);

																		RA.App.Forms.resourceSearchForm.hide();
																		RA.App.Forms.resourceSearchFormResult.removeAll();
																		RA.App.Forms.resourceSearchFormResult.hide();
																		RA.App.Forms.resourceSearchFormResult.destroy();
																	}

																	if (currentStore.find('id', parseInt(resourceId), 0, false, false, true) >= 0) {
																		onDataReady();
																	} else {
																		// If the store does not contain the selected resource, fetch it first
																		Ext4.Ajax.request({
																			url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_list_data&deploy=customdeploy_proj_racg_su_list_data&removeAll=T&searchType=projectresource&showAllResources=T&showInactives=F&startIndex=0&endIndex=1&entityId=' + resourceId,
																			timeout: 120000,
																			params: searchParams,
																			method: 'GET',
																			success: function (response) {
																				var responseData = Ext4.decode(response.responseText);

																				if (! (responseData.data && responseData.data.length >= 1)) {
																					console.error("Failed to load resource id=" + resourceId);
																					return; // keep the selection window open
																				}
																				var resourceModel = Ext4.create('RA.Cmp.Model.DropDown', responseData.data[0]); // maybe 'RA.Cmp.Model.ChartResource'?

																				currentStore.add(resourceModel);
																				onDataReady();
																			}
																		});

																	}

																}
															}
														];
														columns[x].renderer = function (value, metaData, record, rowIndex, colIndex, store, view) {
															metaData.innerCls = metaData.innerCls + ' ' + 'ra-search-results-grid-row-' + rowIndex;
														};
													}
													if (columns[x].dataIndex == 'name') {
														columns[x].renderer = function (value, metaData, record, rowIndex, colIndex, store, view) {
															metaData.tdAttr = 'data-qtip="' + Ext4.String.htmlEncode(RA.App.Templates.resourceHoverTpl(record)) + ' "';
															return value;
														};
													}
													if (columns[x].dataIndex == 'type') {
														columns[x].renderer = function (value, metaData, record, rowIndex, colIndex, store, view) {
															var resourceType;
															switch (value) {
																case 'employee':
																	resourceType = translatedStrings.getText('COLUMN.TYPE.EMPLOYEE');
																	break;
																case 'vendor':
																	resourceType = translatedStrings.getText('COLUMN.TYPE.VENDOR');
																	break;
																default:
																	resourceType = '';
																	break;
															}
															return resourceType;
														};
													}
													if (columns[x].dataIndex == 'availability') {
														columns[x].renderer = function (value, metaData, record, rowIndex, colIndex, store, view) {
															return value + '%';
														};
													}
													if (columns[x].dataIndex == 'url') {
														columns[x].sortable = false;
														columns[x].xtype = 'actioncolumn';
														columns[x].width = 60;
														columns[x].align = 'center';
														columns[x].renderer = function (value, metaData, record, rowIndex, colIndex, store, view) {
															this.items[0].iconCls = 'ra-search-icon';
															this.items[0].tooltip = translatedStrings.getText('COLUMN.RESUME');
															this.items[0].handler = function (grid, rowIndex, colIndex) {
																const rec = grid.getStore().getAt(rowIndex);
																window.open('./' + suiteletPath + '&focus_portfolio_tab=true&custpage_resourceid=' + rec.get('id') + '&custpage_type=' + rec.get('type'));
															};
														};
														columns[x].items = [
															{
																iconCls: 'ra-download-icon',
																tooltip: translatedStrings.getText('COLUMN.RESUME')
															}
														];
													}
													if (columns[x].dataIndex == 'skillsetscore') {
														columns[x].tooltip = translatedStrings.getText('TOOLTIP.SKILLSET_SCORE');
														columns[x].width = 120;
														columns[x].renderer = function (value, metaData, record, rowIndex, colIndex, store, view) {
															var scoreValue = value / baseskillset;
															var progressRenderer = (function (pValue, pText) {
																var b = new Ext4.ProgressBar();
																return function (pValue, pText) {
																	b.updateProgress(pValue, pText);
																	return Ext4.DomHelper.markup(b.getRenderTree());
																};
															})(scoreValue, value);
															if (isNumber(scoreValue)) {
																return progressRenderer(scoreValue, Math.round(scoreValue * 100) + '%');
															} else {
																return progressRenderer(0, Math.round(0 * 100) + '%');
															}
														};
													}
													if (isNumber(columns[x].dataIndex)) {
														skillList.push(columns[x].dataIndex);
														var colWidth = RA.Util.TextMetrics.getMetrics('14px').getWidth(columns[x].text) * 1.25;
														var minWidth = 150;
														columns[x].columns[0].width = (colWidth > minWidth)
																					  ? colWidth
																					  : minWidth;
														columns[x].columns[0].listeners = {
															beforeRender: function (cmp, eOpts) {
																//replace text with div placeholder
																cmp.text = "<div id='ra_search_skill_" + cmp.dataIndex + "'></div>";
															},
															afterRender: function (cmp, eOpts) {
																var skillId = cmp.dataIndex;
																var skillLevelId = "ra_search_skill_" + skillId;
																var skillLevels = levels[skillId].skilllevels;
																var comboStore = new Array();
																comboStore.push([
																	'all', translatedStrings.getText('STORE.-ALL-')
																]);
																for (c in skillLevels) {
																	comboStore.push([
																		skillLevels[c].skilllevelid, skillLevels[c].skilllevelname
																	]);
																}
																Ext4.widget('combobox', {
																	id: 'ra_search_combo_' + skillId,
																	renderTo: Ext4.get(skillLevelId),
																	store: comboStore,
																	value: translatedStrings.getText('STORE.-ALL-'),
																	width: cmp.width - 20,
																	listeners: {
																		select: function (combo, comborecords, eOpts) {
																			var resultStore = Ext4.StoreManager.get('search-result-store');
																			resultStore.clearFilter();
																			resultStore.filterBy(function (record) {
																				var filterResult = true;
																				for (var idx in skillList) {
																					var skillIdx = skillList[idx];
																					var storeValue = record.get(skillIdx);
																					var rawValue = Ext4.getCmp('ra_search_combo_' + skillIdx).getRawValue();
																					if (storeValue != rawValue && rawValue != translatedStrings.getText('STORE.-ALL-') && filterResult == true) filterResult = false;
																				}
																				return filterResult;
																			}); //fiterBy
																		} // select
																	}
																	// widget listeners
																}); // Ext4.widget
															} // afterRender
														};//column listeners
													} // isNumber
												} // for in columns
											} // else
											/*
												console.log(record.data);
												console.log(columns);
												console.log(fields);
												console.log(data);
											 */
											var createStore = Ext4.create('Ext4.data.Store', {
												storeId: 'search-result-store',
												stateful: true,
												fields: fields,
												data: data,
												autoDestroy: true,
												proxy: {
													type: 'memory',
													reader: {
														type: 'json',
														root: 'root'
													}
												}
											});
											RA.App.Forms.resourceSearchFormResult = Ext4.create('RA.Cmp.Window', {
												id: 'ra-search-results-window',
												title: translatedStrings.getText('WINDOW.SELECT_RESOURCE'),
												width: 1000,
												height: 500,
												resizable: true,
												layout: 'fit',
												maximizable: true,
												listeners: {
													close: function () {
														if (RA.App.Forms.resourceSearchFormResult) {
															RA.App.Forms.resourceSearchFormResult.destroy();
														}
													}
												},
												items: [
													Ext4.create('RA.Cmp.FormPanel', {
														id: 'ra-search-results-panel',
														layout: {
															type: 'hbox',
															align: 'stretch'
														},
														defaults: {
															flex: 1
														},
														autoScroll: true,
														dockedItems: [
															{
																xtype: 'raformmenu',
																items: [
																	Ext4.create('RA.Cmp.BlueButton', {
																		id: 'ra-resourceResultsReturnBtn',
																		text: translatedStrings.getText('BUTTON.RETURN_TO_CRITERIA'),
																		width: 'auto',
																		handler: function () {
																			RA.App.Forms.resourceSearchFormResult.removeAll();
																			RA.App.Forms.resourceSearchFormResult.hide();
																			RA.App.Forms.resourceSearchFormResult.destroy();
																			RA.App.Forms.resourceSearchForm.returnToCriteria = true;
																			RA.App.Forms.resourceSearchForm.show();
																		}
																	}), Ext4.create('RA.Cmp.GrayButton', {
																		id: 'ra-resourceResultsCloseBtn',
																		text: translatedStrings.getText('BUTTON.CLOSE'),
																		handler: function () {
																			RA.App.Forms.resourceSearchForm.hide();
																			RA.App.Forms.resourceSearchFormResult.removeAll();
																			RA.App.Forms.resourceSearchFormResult.hide();
																			RA.App.Forms.resourceSearchFormResult.destroy();
																		}
																	})
																]
															}
														],
														items: [
															Ext4.create('Ext4.grid.GridPanel', {
																id: 'ra-search-results-grid',
																title: translatedStrings.getText('GRIDPANEL.SEARCH_RESULTS_TITLE'), /* SkillSet Score = sum of skill levels across required skills',*/
																store: createStore,
																columns: columns,
																autoScroll: true,
																header: header,
																viewConfig: {
																	emptyText: translatedStrings.getText('GRIDPANEL.SEARCH_RESULTS_EMPTY_TEXT'),
																	deferEmptyText: false
																},
																listeners: {
																	boxready: function (me) {
																		var defaultWidth = Math.floor((me.getWidth() - 2 - (me.scroll
																															? Ext4.getScrollBarWidth()
																															: 0)) / me.columns.length);
																		for (var i = 0; i < me.columns.length; i++) {
																			var colWidth = me.columns[i].width || defaultWidth;
																			me.columns[i].setWidth(colWidth);
																		}
																	}
																},
																plugins: [
																	'bufferedrenderer',
																]
															})
														]
													})
												]
											});
											searchPreloader.hide();
											RA.App.Forms.resourceSearchForm.hide();
											RA.App.Forms.resourceSearchFormResult.show();
											perfTestLogger.stop();
										}
									});
								}
							}), Ext4.create('RA.Cmp.GrayButton', {
								id: 'ra-resourceSearchCancelBtn',
								text: translatedStrings.getText('BUTTON.CANCEL'),
								handler: function () {
									RA.App.Forms.resourceSearchForm.hide();
								}
							})
						]
					}
				],
				items: [
					Ext4.create('Ext4.panel.Panel', {
						layout: 'column',
						border: false,
						items: [
							Ext4.create('Ext4.form.FieldSet', {
								flex: 1,
								layout: 'anchor',
								title: translatedStrings.getText('FIELDSET.AVAILABILITY'),
								columnWidth: 0.48,
								id: 'ra-availability-fieldset',
								defaults: {
									anchor: '100%',
									hideEmptyLabel: false,
									labelWidth: 10
								},
								items: [
									Ext4.create('RA.Cmp.Date', {
										id: 'fieldDateFrom',
										fieldLabel: translatedStrings.getText('DATE.FROM'),
										value: new Date(),
										listeners: {
											blur: function (dateField, blurEvent, e) {
												var startDate = dateField.getValue();
												var endDate = Ext4.getCmp('fieldDateTo').getValue();
												if (dateField.isValid() && Ext4.getCmp('fieldDateTo').isValid() && startDate > endDate) {
													Ext4.getCmp('fieldDateTo').setValue(startDate);
												}
											}
										}
									}), Ext4.create('RA.Cmp.Date', {
										id: 'fieldDateTo',
										fieldLabel: translatedStrings.getText('DATE.TO'),
										value: new Date(),
										listeners: {
											blur: function (dateField, blurEvent, e) {
												var endDate = dateField.getValue();
												var startDate = Ext4.getCmp('fieldDateFrom').getValue();
												if (dateField.isValid() && Ext4.getCmp('fieldDateFrom').isValid() && startDate > endDate) {
													Ext4.getCmp('fieldDateFrom').setValue(endDate);
												}
											}
										}
									}), Ext4.create('RA.Cmp.Number', {
										id: 'fieldPercentAvailable',
										fieldLabel: translatedStrings.getText('NUMBER.PERCENT_AVAILABLE'),
										minValue: 0,
										maxValue: 100
									})
								]
							}), {
								xtype: 'ra-col-space',
								columnWidth: 0.02
							}, Ext4.create('Ext4.form.FieldSet', {
								flex: 1,
								layout: 'anchor',
								title: translatedStrings.getText('FIELDSET.OTHERS'),
								columnWidth: 0.48,
								id: 'ra-others-fieldset',
								listeners: {
									boxready: function (box, width, height) {
										var leftBox = Ext4.getCmp('ra-availability-fieldset');
										if (leftBox.getHeight() > height) box.setHeight(leftBox.getHeight());
										else leftBox.setHeight(height);
									}
								},
								defaults: {
									anchor: '100%',
								},
								items: [
									{
										xtype: 'ra-ldc-ss-billingclass',
										id: 'ra-resourcesearchwindow-billingclass',
										formId: 'ra-resourceSearchWindow',
										allowBlank: true,
										featureName: 'billingClass',
									},
									Ext4.create('RA.Cmp.Number', {
										id: 'fieldLaborCost',
										fieldLabel: translatedStrings.getText('NUMBER.MAX_LABOR_COST'),
										minValue: 0
									}), Ext4.create('RA.Cmp.Number', {
										id: 'fieldYOE',
										featureName: 'skillsets',
										fieldLabel: translatedStrings.getText('NUMBER.MIN_YEARS_OF_EXP'),
										minValue: 0,
										maxValue: 100
									})
								]
							})
						]
					}), Ext4.create('Ext4.form.Panel', {
						flex: 1,
						layout: 'anchor',
						id: 'ra-cmpSkillList',
						border: false,
						padding: '20 0 0 0',
						defaults: {
							anchor: '100%',
							hideEmptyLabel: false
						}
					})
				]
			})
		]);

		Ext4.Ajax.request({
			url: '/app/site/hosting/scriptlet.nl?script=customscript_proj_racg_su_res_search&deploy=customdeploy_proj_racg_su_res_search&searchType=skills',
			timeout: 120000,
			success: function (response) {
				var records = Ext4.decode(response.responseText);
				var arrSkills = new Array();
				Ext4.each(records.data, function (record) {
					arrSkills.push([
						record.id, record.name
					]);
				});
				var itemselector = Ext4.widget('itemselector', {
					id: 'ra-itemselector',
					name: 'itemselector',
					fromTitle: translatedStrings.getText('ITEMSELECTOR.AVAILABLE_SKILLS'),
					toTitle: translatedStrings.getText('ITEMSELECTOR.REQUIRED_SKILLS'),
					height: 200,
					store: arrSkills,
					fromButtons: [
						'add', 'remove'
					],
					toButtons: [
						'up', 'down'
					],
					fromButtonsText: {
						up: translatedStrings.getText('TOOLTIP.MOVE_UP'),
						add: translatedStrings.getText('TOOLTIP.ADD_TO_SELECTED'),
						remove: translatedStrings.getText('TOOLTIP.REMOVE_FROM_SELECTED'),
						down: translatedStrings.getText('TOOLTIP.MOVE_DOWN')
					},
					toButtonsText: {
						up: translatedStrings.getText('TOOLTIP.MOVE_UP'),
						add: translatedStrings.getText('TOOLTIP.ADD_TO_SELECTED'),
						remove: translatedStrings.getText('TOOLTIP.REMOVE_FROM_SELECTED'),
						down: translatedStrings.getText('TOOLTIP.MOVE_DOWN')
					}
				});
				Ext4.getCmp('ra-cmpSkillList').add(itemselector);
			}
		});
	},
	listeners: {
		beforeShow: function (window, eOpts) {
			var savedFilterCombo = Ext4.getCmp('savedFilters');
			var filterRecord = savedFilterCombo.getSelectedRecord();
			if (!RA.App.Stores.featureStore.getById('skillsets').get('isEnabled')) {
				window.height = 310;
				Ext4.getCmp('ra-cmpSkillList').hide();
			} else {
				window.height = 520;
			}
			var startDate = filterRecord.get('startDate');
			Ext4.getCmp('fieldDateFrom').setMinValue(startDate);
			Ext4.getCmp('fieldDateTo').setMinValue(startDate);
			//reset fields
			if (!this.returnToCriteria) {
				Ext4.getCmp('fieldDateFrom').reset();
				Ext4.getCmp('fieldDateTo').reset();
				Ext4.getCmp('fieldPercentAvailable').reset();
				Ext4.getCmp('ra-resourcesearchwindow-billingclass').reset();
				Ext4.getCmp('fieldLaborCost').reset();
				Ext4.getCmp('fieldYOE').reset();
				if (Ext4.getCmp('ra-itemselector')) Ext4.getCmp('ra-itemselector').reset();
			} else {
				this.returnToCriteria = false;
			}
		}
	}
});
