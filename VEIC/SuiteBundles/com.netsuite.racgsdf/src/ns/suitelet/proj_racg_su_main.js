/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author pmiller
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_runtime',
		'../custom/proj_racg_cu_single_page_app',
		'../custom/proj_racg_cu_url',
		'../custom/proj_racg_cu_translation'
	],

	function (rLog, rRuntime, rApp, rUrl, rTranslation) {
		var module = {};

		module.onRequest = function (context) {
			rLog.startMethod('onRequest');

            rUrl.clearBundleFoldernameCache();
			this.addCss();
			this.addLibraries();
			this.addGlobals();
			this.addExtJSTextMetrics();
			this.addTranslations();
			this.addModules();

			rApp.addJs({
				filePath: 'ui/ra_cs_main.js'
			});

			rApp.writePage({
				response: context.response
			});

			rLog.endMethod();
		};

		module.addCss = function () {
			rLog.startMethod('addCss');

			var cssFiles = [
				'ra-ext-theme-classic-sandbox-all.css',
				'ra-sch-all.css',
				'ra.css',
				'ux/ra-ItemSelector.css'
			];

			for (i in cssFiles) {
				rApp.addCss({
					filePath: 'ui/css/' + cssFiles[i]
				});
			}

			rLog.endMethod();
		};

		module.addLibraries = function () {
			rLog.startMethod('addLibraries');

			var libraryFiles = [
				'ra-ext-all-sandbox-debug.js',
				'ra-sch-all.js',
				'ux/ra-MultiSelect.js',
				'ux/ra-ItemSelector.js'
			];

			for (i in libraryFiles) {
				rApp.addJs({
					filePath: 'ui/libs/' + libraryFiles[i]
				});
			}

			rLog.endMethod();
		};

		module.addGlobals = function () {
			rLog.startMethod('addGlobals');

			rApp.addGlobal({
				name: 'nsBundleId',
				value: rRuntime.getBundleId()
			});
			rApp.addGlobal({
				name: 'cssSoftURL',
				value: '"' + rUrl.getFileUrl({
					filePath: 'ui/css/images/racg/pattern_soft_alloc.png'
				}) + '"'
			});
			rApp.addGlobal({
				name: 'cssNonWorkingURL',
				value: '"' + rUrl.getFileUrl({
					filePath: 'ui/css/images/racg/pattern_non_working.png'
				}) + '"'
			});
			rApp.addGlobal({
				name: 'cssRecurringURL',
				value: '"' + rUrl.getFileUrl({
					filePath: 'ui/css/images/racg/recurrenceIcon.png'
				}) + '"'
			});

			rLog.endMethod();
		};

		module.addExtJSTextMetrics = function () {
			rLog.startMethod('addExtJSTextMetrics');

			var textMetricTemplate = '<div id="ra-bind-{i}px" class="ra-text-metrics" style="display:none;">text</div>';

			for (var i = 12; i <= 14; i++) {
				rApp.addHtml({
					html: textMetricTemplate.replace('{i}', i)
				});
			}

			rLog.endMethod();
		};

		module.addTranslations = function () {
			rLog.startMethod('addTranslations');
			rLog.debug('rTranslation.preferenceLanguage = ' + rTranslation.getPreferenceLanguage());
			rTranslation.clearCachedTranslationMaps();
			rApp.addGlobal({
				name: 'defaultDictionary',
				value: JSON.stringify(rTranslation.getTranslationsMap().defaultMap)
			});
			rApp.addGlobal({
				name: 'preferenceDictionary',
				value: JSON.stringify(rTranslation.getTranslationsMap().preferenceMap)
			});
			rApp.addGlobal({
				name: 'extLanguage',
				value: JSON.stringify(rTranslation.getLanguage('ext'))
			});
			rApp.addJs({
				filePath: 'ui/translation/extjs/ext-lang-' + rTranslation.getLanguage('ext') + '.js'
			});
			rApp.addJs({
				filePath: 'ui/translation/ra_cs_translation.js'
			});

			rLog.endMethod();
		};

		module.addModules = function () {
			rLog.startMethod('addModules');

			this.addUtilModules();
			this.addDataModules();
			this.addCommonModules();
			this.addFieldModules();
			this.addLargeDataModules();
			this.addFormModules();
			this.addViewModules();

			rLog.endMethod();
		};

		module.addUtilModules = function () {
			rLog.startMethod('addUtilModules');

			var utilFiles = [
				'ra_cs_constant.js',
				'ra_cs_util.js',
				'ra_cs_perf_test.js',
				'ra_cs_override.js',
				'ra_cs_netsuite.js'
			];

			for (i in utilFiles) {
				rApp.addJs({
					filePath: 'ui/modules/util/' + utilFiles[i]
				});
			}

			rLog.endMethod();
		};

		module.addDataModules = function () {
			rLog.startMethod('addDataModules');

			var dataFiles = [
				'ra_cs_model.js',
				'store/ra_cs_store_chart_allocation.js',
				'store/ra_cs_store_chart_resource.js',
				'store/ra_cs_store_combobox.js',
				'store/ra_cs_store_data_count.js',
				'store/ra_cs_store_export.js',
				'store/ra_cs_store_grid.js',
				'store/ra_cs_store_setting.js',
				'store/ra_cs_store_time_off.js',
				'ra_cs_store.js',
				'cache/ra_cs_cache_base.js',
				'cache/ra_cs_cache_customer.js',
				'ra_cs_cache.js'
			];

			for (i in dataFiles) {
				rApp.addJs({
					filePath: 'ui/modules/data/' + dataFiles[i]
				});
			}

			rLog.endMethod();
		};

		module.addCommonModules = function () {
			rLog.startMethod('addCommonModules');

			var commonFiles = [
				'ra_cs_button.js',
				'ra_cs_column.js',
				'ra_cs_custom.js',
				'ra_cs_menu.js',
				'ra_cs_mode_manager.js',
				'ra_cs_panel.js',
				'ra_cs_template.js',
				'ra_cs_toolbar.js',
				'ra_cs_tooltip.js',
				'ra_cs_ux.js',
				'ra_cs_view_preset.js',
				'ra_cs_window.js'
			];

			for (i in commonFiles) {
				rApp.addJs({
					filePath: 'ui/modules/common/' + commonFiles[i]
				});
			}

			rLog.endMethod();
		};

		module.addFieldModules = function () {
			rLog.startMethod('addFieldModules');

			var fieldFiles = [
				'ra_cs_checkbox.js',
				'ra_cs_combobox.js',
				'ra_cs_date.js',
				'ra_cs_display.js',
				'ra_cs_field_container.js',
				'ra_cs_number.js',
				'ra_cs_radio.js',
				'ra_cs_text.js',
				'ra_cs_trigger.js',
				'ra_cs_multiselect.js',
			];

			for (i in fieldFiles) {
				rApp.addJs({
					filePath: 'ui/modules/field/' + fieldFiles[i]
				});
			}

			rLog.endMethod();
		};

		module.addLargeDataModules = function () {
			rLog.startMethod('addLargeDataModules');

			var largeDataFiles = [
				'ra_cs_single_select.js',
				'ra_cs_multi_select.js'
			];

			for (i in largeDataFiles) {
				rApp.addJs({
					filePath: 'ui/modules/field/large_data/' + largeDataFiles[i]
				});
			}
			rLog.endMethod();
		};

		module.addFormModules = function () {
			rLog.startMethod('addFormModules');

			var formFiles = [
				'ra_cs_form_grid_editor.js',
				'ra_cs_form_grid_cell_editor.js',
				'ra_cs_form_field_editor.js',
				'ra_cs_form_filter.js',
				'ra_cs_form_large_data.js',
				'ra_cs_form_large_multiselect.js',
				'ra_cs_form_ra_edit.js',
				'ra_cs_form_ra_new.js',
				'ra_cs_form_ra_reassign.js',
				'ra_cs_form_resource_search.js',
				'ra_cs_form_setting.js',
				'ra_cs_form.js'
			];

			for (i in formFiles) {
				rApp.addJs({
					filePath: 'ui/modules/form/' + formFiles[i]
				});
			}

			rLog.endMethod();
		};

		module.addViewModules = function () {
			rLog.startMethod('addViewModules');

			var viewFiles = [
				'ra_cs_view_menu.js',
				'ra_cs_view_filter.js',
				'ra_cs_view_toolbar.js',
				'ra_cs_view_grid.js',
				'ra_cs_view_chart.js'
			];

			for (i in viewFiles) {
				rApp.addJs({
					filePath: 'ui/modules/view/' + viewFiles[i]
				});
			}

			rLog.endMethod();
		};

		return module;
	}
);