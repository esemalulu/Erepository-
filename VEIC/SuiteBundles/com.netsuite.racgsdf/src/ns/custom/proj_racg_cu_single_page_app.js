/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author pmiller
 */
define(
	[
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_serverWidget',
		'../custom/proj_racg_cu_url',
		'../custom/proj_racg_cu_translation'
	],

	function (rLog, rServerWidget, rUrl, rTranslation) {
		var module = {
			inlineHtml: [],

			template: {
				css: '<link type="text/css" rel="stylesheet" href="{srcUrl}{filePath}" />',
				js: '<script type="text/javascript" filepath="{filePath}" src="{fileUrl}"></script>',
				global: '<script type="text/javascript">var {name}={value};</script>'
			}
		};

		module.addCss = function (options) {
			rLog.startMethod('addCss');

			var filePath = options.filePath,
				srcUrl = rUrl.getSrcUrl();

			this.inlineHtml.push(this.template.css.replace('{srcUrl}', srcUrl).replace('{filePath}', filePath));

			rLog.endMethod();
		};

		module.addJs = function (options) {
			rLog.startMethod('addJs');

			var filePath = options.filePath;

			var fileUrl = rUrl.getFileUrl({
				filePath: filePath
			});

			this.inlineHtml.push(this.template.js.replace('{fileUrl}', fileUrl).replace('{filePath}', filePath));

			rLog.endMethod();
		};

		module.addGlobal = function (options) {
			rLog.startMethod('addGlobal');

			var name = options.name,
				value = options.value;

			this.inlineHtml.push(this.template.global.replace('{name}', name).replace('{value}', value));

			rLog.endMethod();
		};

		module.addHtml = function (options) {
			rLog.startMethod('addHtml');

			var html = options.html;

			this.inlineHtml.push(html);

			rLog.endMethod();
		};

		module.writePage = function (options) {
			rLog.startMethod('writePage');

			var response = options.response,
				bundleName = rTranslation.getTranslationOfKey({key: 'SS.RESOURCE_ALLOCATIONS'}),
				loadingText = rTranslation.getTranslationOfKey({key: 'TOOLTIP.LOADING'});

			this.form = rServerWidget.createForm({
				title: bundleName
			});

			this.loadingField = this.form.addField({
				id: 'proj_racg_main_loading',
				type: rServerWidget.getFieldTypes().INLINEHTML,
				label: '&nbsp;'
			});
			this.loadingField.defaultValue = loadingText;

			this.resourcesField = this.form.addField({
				id: 'proj_racg_main_resources',
				type: rServerWidget.getFieldTypes().INLINEHTML,
				label: bundleName
			});
			this.resourcesField.defaultValue = this.inlineHtml.join('\n');

			response.writePage(this.form);

			rLog.endMethod();
		};

		return module;
	}
);