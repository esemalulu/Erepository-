/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 * @NScriptName PSA RACG SU Data Exporter
 * @NScriptId _proj_racg_su_data_exporter
 * @NScriptType suitelet
 * @NApiVersion 2.x
 */
define(
	[
		'../adapter/proj_racg_ad_encode',
		'../adapter/proj_racg_ad_file',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_render',
		'../custom/proj_racg_cu_translation'
	],

	function (rEncode, rFile, rLog, rRender, rTranslation) {
		var module = {};

		/*
		 * Suitelet Default function
		 *
		 * @param {Object} params - onRequest Object
		 * @returns {Void}
		 */
		module.onRequest = function (params) {
			rLog.startMethod('onRequest');
			this.init(params.request.parameters.params);
			switch (this.params.exportFormat.toUpperCase()) {
				case 'PDF':
					this.exportPDF(params.response);
					break;
				case 'PDF-TEXT':
					this.exportPDFText(params.response);
					break;
				case 'CSV':
					this.exportCSV(params.response);
					break;
				case 'CSV-TEXT':
					this.exportCSVText(params.response);
					break;
				case 'XLS':
					this.exportXLS(params.response);
					break;
				case 'XLS-TEXT':
					this.exportXLSText(params.response);
					break;
				default:
					var error = {
						name: 'RA_INVALID_PARAMETER',
						message: 'ERROR: Invalid export format - ' + this.params.exportFormat
					};
					rLog.handleError(error);
					throw error;
			}
			rLog.endMethod();
		};

		/*
		 * Set up parameters, encoder, title, headers and content
		 * @param {String} params - request body parameters
		 * @returns None
		 */
		module.init = function (params) {
			rLog.startMethod('init');
			this.params = {};
			this.title = '';
			this.headers = [];
			this.content = [];
			this.setupParams(params);
			this.setupEncoder();
			this.setupTitle();
			this.setupHeaders();
			this.setupContent();
			rLog.endMethod();
		};

		/*
		 * Set up parameters
		 * @param {String} params - request body parameters
		 * @returns None
		 */
		module.setupParams = function (params) {
			rLog.startMethod('setupParams');
			this.params = JSON.parse(params) || null;
			if (this.params) {
				var expectedParams = ['exportFormat', 'showTask', 'rows'];
				for (var i = 0, ii = expectedParams.length; i < ii; i++) {
					if (!this.params[expectedParams[i]]) {
						var error = {
							name: 'RA_MISSING_PARAMETER',
							message: 'ERROR: Cannot find request parameter - ' + expectedParams[i]
						};
						rLog.handleError(error);
						throw error;
					}
				}
			} else {
				var error = {
					name: 'RA_MISSING_PARAMETER',
					message: 'ERROR: Missing parameters'
				};
				rLog.handleError(error);
				throw error;
			}
			rLog.endMethod();
		};

		/*
		 * Set up encoder based on export format
		 */
		module.setupEncoder = function () {
			rLog.startMethod('setupEncoder');
			this.encoder = this['encode' + this.params.exportFormat.split('-')[0]];
			rLog.endMethod();
		};

		/*
		 * Encode data string to PDF format
		 */
		module.encodePDF = function (str) {
			return String(str)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&apos;');
		};

		/*
		 * Encode data string to CSV format
		 */
		module.encodeCSV = function (str) {
			var newStr = String(str);
			if (newStr.match(/,/)) {
				return '"' + newStr.replace(/"/g, '""') + '"';
			}
			return newStr;
		};

		/*
		 * Return data string as is for XLS format
		 */
		module.encodeXLS = function (str) {
			return str;
		};

		/*
		 * Set up title
		 */
		module.setupTitle = function setupTitle() {
			rLog.startMethod('setupTitle');
			this.title = rTranslation.getTranslationOfKey({key: 'STORE.RESOURCE_ALLOCATIONS'});
			rLog.endMethod();
		};

		/*
		 * Set up headers
		 */
		module.setupHeaders = function () {
			rLog.startMethod('setupHeaders');
			switch (this.params.viewResourcesBy) {
				case 1:
					this.headers = [
						this.encoder(rTranslation.getTranslationOfKey({key: 'COMBOBOX.RESOURCE'})),
						this.encoder(rTranslation.getTranslationOfKey({key: 'DISPLAY.PROJECT'})),
						this.encoder(rTranslation.getTranslationOfKey({key: 'DISPLAY.CUSTOMER'}))
					];
					break;
				case 2:
					this.headers = [
						this.encoder(rTranslation.getTranslationOfKey({key: 'DISPLAY.CUSTOMER'})),
						this.encoder(rTranslation.getTranslationOfKey({key: 'DISPLAY.PROJECT'})),
						this.encoder(rTranslation.getTranslationOfKey({key: 'COMBOBOX.RESOURCE'}))
					];
					break;
				case 3:
					this.headers = [
						this.encoder(rTranslation.getTranslationOfKey({key: 'DISPLAY.PROJECT'})),
						this.encoder(rTranslation.getTranslationOfKey({key: 'DISPLAY.CUSTOMER'})),
						this.encoder(rTranslation.getTranslationOfKey({key: 'COMBOBOX.RESOURCE'}))
					];
					break;
			}
			this.headers = this.headers.concat([
				this.encoder(rTranslation.getTranslationOfKey({key: 'TOOLTIP.LABEL.START_DATE'})),
				this.encoder(rTranslation.getTranslationOfKey({key: 'TOOLTIP.LABEL.END_DATE'})),
				this.encoder(rTranslation.getTranslationOfKey({key: 'BAR.UNIT.HOURS'})),
				this.encoder(rTranslation.getTranslationOfKey({key: 'STORE.PERCENTAGE'})),
				this.encoder(rTranslation.getTranslationOfKey({key: 'COMBOBOX.ALLOCATE_USING'})),
				this.encoder(rTranslation.getTranslationOfKey({key: 'COMBOBOX.ALLOCATION_TYPE'})),
				this.encoder(rTranslation.getTranslationOfKey({key: 'DISPLAY.REQUESTED_BY'}))
			]);
			if (this.params.isApprovalEnabled) {
				this.headers.push(this.encoder(rTranslation.getTranslationOfKey({key: 'COMBOBOX.APPROVAL_STATUS'})));
				this.headers.push(this.encoder(rTranslation.getTranslationOfKey({key: 'COMBOBOX.NEXT_APPROVER'})));
			}
			if (this.params.showTask == 'T') {
				this.headers.splice(2, 0, this.encoder(rTranslation.getTranslationOfKey({key: 'DISPLAY.PROJECT_TASK'})));
			}
			rLog.endMethod();
		};

		/*
		 * Set up content
		 */
		module.setupContent = function () {
			rLog.startMethod('setupContent');
			// use 2D array to represent the raw content.. formatting is done on actual export method
			for (var i = 0; i < this.params.rows.length; i++) {
				var arrProjectName = this.params.rows[i].projectName.split(':'),
					projectName = arrProjectName[arrProjectName.length - 1],
					allocationRow = [];

				switch (this.params.viewResourcesBy) {
					case 1:
						allocationRow = [
							this.encoder(this.params.rows[i].name),
							this.encoder(projectName),
							this.encoder(this.params.rows[i].customer)
						];
						break;
					case 2:
						allocationRow = [
							this.encoder(this.params.rows[i].customer),
							this.encoder(projectName),
							this.encoder(this.params.rows[i].name)
						];
						break;
					case 3:
						allocationRow = [
							this.encoder(projectName),
							this.encoder(this.params.rows[i].customer),
							this.encoder(this.params.rows[i].name)
						];
						break;
				}
				allocationRow = allocationRow.concat([
					this.encoder(this.params.rows[i].startdate),
					this.encoder(this.params.rows[i].enddate),
					this.encoder(this.params.rows[i].hours),
					this.encoder(this.params.rows[i].percent),
					this.encoder(this.params.rows[i].allocate),
					this.encoder(this.params.rows[i].type),
					this.encoder(this.params.rows[i].requestedby),
					this.encoder(this.params.rows[i].approvalstatus),
					this.encoder(this.params.rows[i].approver)
				]);
				if (this.params.showTask == 'T') {
					allocationRow.splice(2, 0, this.encoder(this.params.rows[i].task));
				}
				this.content.push(allocationRow);
			}
			rLog.endMethod();
		};

		/*
		 * Create and build PDF file
		 * @param {Object} response - suitelet response object to write PDF file into
		 */
		module.exportPDF = function (response) {
			rLog.startMethod('exportPDF');
			response.writeFile({
				file: rRender.xmlToPdf({
					xmlString: this.buildPDF()
				})
			});
			rLog.endMethod();
		};

		/*
		 * Write PDF file contents directly into response
		 * @param {Object} response - suitelet response object to write PDF content into
		 */
		module.exportPDFText = function (response) {
			rLog.startMethod('exportPDFText');
			response.renderPdf({xmlString: this.buildPDF()});
			rLog.endMethod();
		};

		/*
		 * Build XML content for PDF
		 * @return {String} XML string
		 */
		module.buildPDF = function () {
			rLog.startMethod('buildPDF');
			var xml = new Array();
			xml.push('<?xml version="1.0"?>');
			xml.push('<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">');
			xml.push('<pdf>');
			xml.push('<head>');
			xml.push('<style>');
			xml.push('td {');
			xml.push('font-size: 10px');
			xml.push('}');
			xml.push('</style>');
			xml.push('</head>');
			xml.push('<body>');
			xml.push('<table width="100%">');
			xml.push('<tr><td style="font-size:12px;font-weight:bold" colspan="' + this.headers.length + '">' + this.title + '</td></tr>');
			xml.push('<tr>');
			for (var i = 0, ii = this.headers.length; i < ii; i++) {
				xml.push('<td style="font-weight:bold">' + this.headers[i] + '</td>');
			}
			xml.push('</tr>');
			for (var i = 0, ii = this.content.length; i < ii; i++) {
				xml.push('<tr>');
				for (var j = 0, jj = this.content[i].length; j < jj; j++) {
					xml.push('<td>' + this.content[i][j] + '</td>');
				}
				xml.push('</tr>');
			}
			xml.push('</table>');
			xml.push('</body>');
			xml.push('</pdf>');
			rLog.endMethod();
			return xml.join('');
		};

		/*
		 * Create and build CSV file
		 * @param {Object} response - suitelet response object to write CSV file into
		 */
		module.exportCSV = function (response) {
			rLog.startMethod('exportCSV');
			var file = rFile.create({
				name: 'file.csv',
				fileType: rFile.getType().CSV,
				contents: this.buildCSV()
			});
			response.writeFile({
				file: file
			});
			rLog.endMethod();
		};

		/*
		 * Write CSV file contents directly into response
		 * @param {Object} response - suitelet response object to write CSV content into
		 */
		module.exportCSVText = function (response) {
			rLog.startMethod('exportCSVText');
			response.write(this.buildCSV());
			rLog.endMethod();
		};

		/*
		 * Build string content for CSV
		 */
		module.buildCSV = function () {
			rLog.startMethod('buildCSV');
			var csv = [];

			// set delimeters for CSV format
			var colDelim = ",";
			var rowDelim = "\r\n";

			// headers
			csv.push(this.headers.join(colDelim));

			// content
			for (var i = 0, ii = this.content.length; i < ii; i++) {
				csv.push(rowDelim);
				csv.push(this.content[i].join(colDelim));
			}
			rLog.endMethod();
			return csv.join('');
		};

		/*
		 * Create and build XLS file
		 * @param {Object} response - suitelet response object to write XLS file into
		 */
		module.exportXLS = function (response) {
			rLog.startMethod('exportXLS');
			var encoding = rEncode.getEncoding(),
				contents = rEncode.convert({
					string: this.buildXLS(),
					inputEncoding: encoding.UTF_8,
					outputEncoding: encoding.BASE_64
				}),
				file = rFile.create({
					name: 'file.xls',
					fileType: rFile.getType().EXCEL,
					contents: contents
				});
			response.writeFile({
				file: file
			});
			rLog.endMethod();
		};

		/*
		 * Write XLS file contents directly into response
		 * @param {Object} response - suitelet response object to write XLS content into
		 */
		module.exportXLSText = function (response) {
			rLog.startMethod('exportXLSText');
			response.write(this.buildXLS());
			rLog.endMethod();
		};

		/*
		 * Build string content for XLS
		 */
		module.buildXLS = function () {
			rLog.startMethod('buildXLS');
			// use Microsoft Office XML format, based on output of native NS List (Export - Microsoft ® Excel)
			var xls = [];

			xls.push('<?xml version="1.0" encoding="utf-8"?>');
			xls.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
			xls.push(' xmlns:o="urn:schemas-microsoft-com:office:office"');
			xls.push(' xmlns:x="urn:schemas-microsoft-com:office:excel"');
			xls.push(' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"');
			xls.push(' xmlns:html="http://www.w3.org/TR/REC-html40">');

			// title
			xls.push('<Worksheet ss:Name="' + this.title + '">');

			xls.push('<Table>');

			// headers
			xls.push('<Row>');
			for (var i = 0, ii = this.headers.length; i < ii; i++) {
				xls.push('<Cell><Data ss:Type="String">' + this.headers[i] + '</Data></Cell>');
			}
			xls.push('</Row>');

			// content
			for (var i = 0, ii = this.content.length; i < ii; i++) {
				xls.push('<Row>');
				for (var j = 0, jj = this.content[i].length; j < jj; j++) {
					xls.push('<Cell><Data ss:Type="String">' + this.content[i][j] + '</Data></Cell>');
				}
				xls.push('</Row>');
			}

			xls.push('</Table>');
			xls.push('</Worksheet>');
			xls.push('</Workbook>');

			rLog.endMethod();
			return xls.join('');
		};

		return module;
	}
);