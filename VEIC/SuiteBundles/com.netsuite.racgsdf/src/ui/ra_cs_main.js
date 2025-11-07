/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */

function init() {
	Ext4.get('proj_racg_main_loading_val').dom.style.display = 'none';

	Ext4.tip.QuickTipManager.init();

	var features = RA.App.Stores.featureStore.featureCheck();
	if (features.length > 0) {
		alert(translatedStrings.getText('MESSAGE.ERROR.FEATURE_DISABLED') + ' ' + features.toString());
		window.location = '/app/center/card.nl?sc=-29';
	}

	/*
	 * Update font immediately, necessary for positioning components during their initialization
	 */
	var cssTool = Ext4.util.CSS;
	var prop = RA.App.Context.getPreference('font');

	cssTool.updateRule('#ra-toggle *', 'font-family', prop);
	cssTool.updateRule('#ra-menu *', 'font-family', prop);
	cssTool.updateRule('#advFilterMain *', 'font-family', prop);
	cssTool.updateRule('#ra-main-toolbar *', 'font-family', prop);
	cssTool.updateRule('#ra-chart *', 'font-family', prop);
	cssTool.updateRule('#ra-grid *', 'font-family', prop);
	cssTool.updateRule('.ra-form-window *', 'font-family', prop);
	cssTool.updateRule('.ra-text-metrics', 'font-family', prop);
	// all tooltips should be added here
	cssTool.updateRule('#ext-quicktips-tip *', 'font-family', prop);
	cssTool.updateRule('#ra-tip-alloc-chart *', 'font-family', prop);
	cssTool.updateRule('#ra-tip-alloc-grid *', 'font-family', prop);
	cssTool.updateRule('#ra-tip-project *', 'font-family', prop);
	cssTool.updateRule('#ra-tip-column-header-grid *', 'font-family', prop);
	cssTool.updateRule('#ra-tip-column-header-chart *', 'font-family', prop);
	/*
	 * Instantiate the Menu & Filters
	 */
	//Ext4.create('RA.Cmp.TogglePanel');
	Ext4.create('RA.Cmp.MenuPanel');
	RA.App.Filters = Ext4.create('RA.Cmp.FiltersPanel');
	RA.App.Toolbar = Ext4.create('RA.Cmp.MainToolbar');
	/*
	 * Load & apply last-used Filters
	 */
	var filterCombo = Ext4.getCmp('savedFilters');

	filterCombo.fireEvent('show', filterCombo);

	if (RA.App.Settings.get('expandFilterSummary') == 'F') {
		Ext4.getCmp('advfilter-filterBody').hide();
		Ext4.getCmp('racview-filter-link').addCls('ra-filter-hidden');
	}

	if (RA.App.Settings.get('incProjectTemplate') == 'T') {
		//Reload project filter, suitelet parameter was defaulted to F
		RA.App.Stores.projectAndTemplateStore.load({
			params: {'incProjectTemplate': 'T'},
			callback: function (records, operation, success) {
				reselectProjectFilter(true);
			}
		});
	}

	/*
	 * Instantiate the Grid (default mode) and ModeManager objects
	 */
	try {
		RA.App.GridEditor.initEditors();
		RA.App.Grid = Ext4.create('RA.Cmp.TreePanel');
		RA.App.Forms.initForms();
		RA.App.Cache.init();
	} catch (error) {
		RA.Util.CustomFunctions.logIntoElasticSearch(
			'[PSA] Error occurred during Grid initialization on front end of RACG.',
			{
				name: error.name,
				message: error.message,
				stack: error.stack
			}
		);
		console.error(error);
	}

	/*
	 * assign autofit
	 */
	Ext4.EventManager.onWindowResize(function () {
		if (RA.App.Grid.isVisible()) RA.App.Grid.autofit();
		else RA.App.Chart.autofit();
	});

	RA.Util.Benchmarking.stop(RA.Util.Benchmarking.constants.LOADING_APP);
	RA.Util.Benchmarking.log(
		RA.Util.Benchmarking.constants.LOADING_APP,
		"[PSA] RACG has been opened by " + RA.App.Context.context.email + " from company " + RA.App.Context.context.company + ".",
		RA.App.Stores.getStoreDataCounts()
	);
}

var sleep;

function waitForStores() {
	if (RA.App.Stores.isRequiredLoaded()) {
		console.log('READY');
		clearTimeout(sleep);
		init();
	} else {
		sleep = setTimeout(waitForStores, 100);
	}
}

Ext4.onReady(function () {
	RA.Util.Benchmarking.start(RA.Util.Benchmarking.constants.LOADING_APP);
	RA.Util.Dashboard.init(window.location.href);
	RA.App.Stores.loadRequiredStores();
	waitForStores();
});