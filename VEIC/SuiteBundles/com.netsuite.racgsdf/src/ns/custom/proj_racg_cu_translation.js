/**
 * Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 *
 * @author jjaramillo
 */
define(
	[
		'../adapter/proj_racg_ad_cache',
		'../adapter/proj_racg_ad_file',
		'../adapter/proj_racg_ad_log',
		'../adapter/proj_racg_ad_runtime',
		'../adapter/proj_racg_ad_xml'
	],

	function (rCache, rFile, rLog, rRuntime, rXml) {
		var module = {
			cacheConstants: {
				cacheObject: 'PROJ_RACG_TRANSLATIONS',
				defaultMap: 'PROJ_RACG_TRANSLATIONS_DEFAULT_MAP',
				preferenceMap: 'PROJ_RACG_TRANSLATIONS_PREFERENCE_MAP'
			},
			defaultLanguage: 'en_US',
			getPreferenceLanguage: function (){
				return rRuntime.getCurrentUserPreference({
					preference: 'LANGUAGE'
				})
			},
			languageMap: {
				cs_CZ: {ext: 'cs', ns: 'cs_CZ'},
				da_DK: {ext: 'da', ns: 'da_DK'},
				de_DE: {ext: 'de', ns: 'de_DE'},
				en: {ext: 'en', ns: 'en_US'},
				en_US: {ext: 'en', ns: 'en_US'},
				es_AR: {ext: 'es', ns: 'es_AR'},
				es_ES: {ext: 'es', ns: 'es_ES'},
				fi_FI:	{ext: 'fi', ns: 'fi_FI'},
				fr_CA: {ext: 'fr_CA', ns: 'fr_CA'},
				fr_FR: {ext: 'fr', ns: 'fr_FR'},
				id_ID:	{ext: 'id', ns: 'id_ID'},
				it_IT: {ext: 'it', ns: 'it_IT'},
				ja_JP: {ext: 'ja', ns: 'ja_JP'},
				ko_KR: {ext: 'ko', ns: 'ko_KR'},
				nl_NL: {ext: 'nl', ns: 'nl_NL'},
				nb_NO:	{ext: 'no_NB', ns: 'nb_NO'},
				no_NO:	{ext: 'no_NN', ns: 'no_NO'},
				pt_BR: {ext: 'pt_BR', ns: 'pt_BR'},
				ru_RU: {ext: 'ru', ns: 'ru_RU'},
				sv_SE: {ext: 'sv_SE', ns: 'sv_SE'},
				th_TH: {ext: 'th', ns: 'th_TH'},
				tr_TR:	{ext: 'tr', ns: 'tr_TR'},
				vn_VN:	{ext: 'vn', ns: 'vn_VN'},
				zh_CN: {ext: 'zh_CN', ns: 'zh_CN'},
				zh_TW: {ext: 'zh_TW', ns: 'zh_TW'}
			},
			getLanguage: function (extension) {
				var lang = this.languageMap[this.getPreferenceLanguage()];
				if (!lang) lang = this.languageMap[this.defaultLanguage];
				return lang[extension];
			}
		};

		module.getTranslationOfKey = function (params) {
			rLog.startMethod('getTranslationOfKey');
			var translationsMap = this.getTranslationsMap();
			rLog.endMethod();
			return translationsMap.preferenceMap[params.key] || translationsMap.defaultMap[params.key];
		};

		module.getTranslationsMap = function () {
			rLog.startMethod('getTranslationsMap');
			var translationsMap = {};
			translationsMap.preferenceMap = this.getMapInCache({
				key: this.cacheConstants.preferenceMap
			});
			translationsMap.defaultMap = this.getMapInCache({
				key: this.cacheConstants.defaultMap
			});
			rLog.endMethod();
			return translationsMap;
		};

		module.clearCachedTranslationMaps = function () {
			var cacheObject = rCache.getCache(this.cacheConstants.cacheObject);
			var defaultMapCacheKey = this.cacheConstants.defaultMap;
			var preferenceMapCacheKey = this.cacheConstants.preferenceMap + '_' + this.getPreferenceLanguage();

			cacheObject.remove(defaultMapCacheKey);
			cacheObject.remove(preferenceMapCacheKey);
		};


		module.getMapInCache = function (params) {
			rLog.startMethod('getMapInCache');
			var cacheObject = rCache.getCache(this.cacheConstants.cacheObject),
				cacheKey = params.key + (params.key == this.cacheConstants.preferenceMap ? ('_' + this.getPreferenceLanguage()) : ''),
				cacheMap = cacheObject.get({
					key: cacheKey
				});

			if (!cacheMap) {
				cacheObject.put({
					key: cacheKey,
					value: this.loadTranslationsMap(params)
				});
				cacheMap = cacheObject.get({
					key: cacheKey
				});
			}
			rLog.endMethod();
			return JSON.parse(cacheMap);
		};

		module.loadTranslationsMap = function (params) {
			rLog.startMethod('loadTranslationsMap');
			var translationsMap = {};
			var xmlFileAsString = this.loadTranslationsFile(params);
			var xmlObject = rXml.getParser().fromString(xmlFileAsString);
			var dataNodes = xmlObject.getElementsByTagName({tagName: 'trans-unit'});

			for (var i = 0; i < dataNodes.length; i++) {
				var eachDataNode = dataNodes[i];
				var node = null;
				if (eachDataNode.getAttribute({name: "translate"}) !== 'no' && eachDataNode.getElementsByTagName({tagName: "target"}).length > 0) {
					node = eachDataNode.getElementsByTagName({tagName: "target"});
				} else {
					node = eachDataNode.getElementsByTagName({tagName: "source"});
				}
				if (node.length > 0) {
					translationsMap[eachDataNode.getAttribute({name: 'id'})] = node[0].textContent.trim();
				} else {
					console.error('The translation file is corrupted.');
				}
			}

			rLog.endMethod();
			return translationsMap;
		};

		module.loadTranslationsFile = function (params) {
			rLog.startMethod('loadTranslationsFile');
			var fileNameLanguage = this.defaultLanguage;
			var filePrefix = 'racg_resource.';
			var fileSuffix = '.xlf.xml';
			var destFolder = 'translation';
			if (params.key === this.cacheConstants.preferenceMap) {
				fileNameLanguage = this.getPreferenceLanguage();
			}
			var fileId = null;
			try {
				fileId = rFile.getFileId({
					name: filePrefix + fileNameLanguage + fileSuffix,
					folder: destFolder
				});
			} catch (ex) {
				fileId = null;
			}
			if (!fileId) {
				fileId = rFile.getFileId({
					name: filePrefix + this.defaultLanguage + fileSuffix,
					folder: destFolder
				});
			}
			rLog.debug('Language file name = ' + fileId + '; default language = ' + this.defaultLanguage);
			var fileObject = rFile.load({
				id: fileId
			});
			rLog.endMethod();
			return fileObject.getContents();
		};

		return module;
	}
);
