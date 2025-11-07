/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	[
		'N/file',
		'N/query',
		'../adapter/proj_racg_ad_log'
	],

	function (nFile, nQuery, rLog) {
		var module = {};

		module.create = function (params) {
			return nFile.create(params);
		};

		module.load = function (params) {
			return nFile.load(params);
		};

		module.getType = function () {
			return nFile.Type;
		};

		module.getFileId = function (params) {
			rLog.startMethod('getFileId');

			var fileId = null;
			var query = "SELECT File.id, \n" +
						"FROM " + ((params.folder) ? "MediaItemFolder AS Folder, \n" : "") +
						"File \n" +
						"WHERE  File.name = '" + params.name + "' \n" +
						((params.folder) ? "       AND Folder.name = '" + params.folder + "' \n" : "") +
						((params.folder) ? "       AND File.folder = Folder.id \n" : "") +
						"ORDER BY File.id ASC";

			var queryResults = nQuery.runSuiteQL(query);
			var searchResults = queryResults.results;

			if (searchResults.length > 1) {
				fileId = this.getSpecificBundleFileId(searchResults);
			} else if (searchResults.length) {
				fileId = searchResults[0].getValue(0);
			}
			rLog.endMethod();
			return fileId;
		};

		module.getSpecificBundleFileId = function (searchResults) {
			rLog.startMethod('getSpecificBundleFileId');
			var specificFileId = null;
			var bundleFolderName = 'com.netsuite.racgsdf';
			for (var int = 0; int < searchResults.length; int++) {
				var eachFile = nFile.load({
					id: searchResults[int].getValue(0)
				});
				if (eachFile.path.indexOf(bundleFolderName) > -1) {
					specificFileId = eachFile.id;
					break;
				}
			}
			rLog.endMethod();
			return specificFileId;
		};

		return module;
	}
);
