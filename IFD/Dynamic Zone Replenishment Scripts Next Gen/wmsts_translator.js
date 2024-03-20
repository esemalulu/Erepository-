/**
 * Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved.
 * 
 * Version    
 * 1.00       
 * 
 * @NModuleScope TargetAccount
 */
define(["N/runtime", "require","N/url","N/https"], function (runtime, require,url,https) {

	var translation='';
	var filePath =".../../Translation/WMSTranslationLanguages/";
	function _getTranslation() {

		var LANG = "LANGUAGE";
		var	locale = runtime.getCurrentUser().getPreference(LANG);
        log.debug({title:'locale',details:locale});
		try {
			require([filePath+locale], function (translationObj){
				translation = translationObj;
			});	
		}catch (e) {
			log.error("WMS_TRANSLATOR_ERROR", e);
			//If translation file  is not available for any language, English version  should be returned.
			if(e.name == 'MODULE_DOES_NOT_EXIST')
			{
				var defaultLocale ="en_US";
				require([filePath+defaultLocale], function (translationObj){
					translation = translationObj;});
			}
		}

		return translation;
	}
	
	
	function getTransaltionFileSuitelet(message) {

		var translationValue;
		try {	   	

			var LANG = "LANGUAGE";
			var	locale = runtime.getCurrentUser().getPreference(LANG);	

			var scriptUrl = url.resolveScript({
				scriptId: 'customscript_wms_translator_suitelet',
				deploymentId:'customdeploy_wms_translator_suitelet'

			});
			
			scriptUrl=scriptUrl+"&Keyvalue="+message;
			log.debug('scriptUrl',scriptUrl);	
			var response =	https.get({url:scriptUrl});			
			translationValue = response.body;		
			log.debug('translationValue',translationValue);

		} catch (e) {
			log.error('exception in getTransaltionFileSuitelet--',e);
		}
		return translationValue;
	}
	

	function _getTranslationString(message){
		var translatedString ='';
		if(translation==''){
			translation = _getTranslation();
		}
		translatedString =translation[message];
		  log.debug({title:'translation[message]',details:translation[message]});
		 
		  if(translation[message] == undefined || translation[message] == '')
		  {
			  translation = '';
			  var defaultLocale ="en_US";
			  require([filePath+defaultLocale], function (translationObj){
				  translation = translationObj;
				  translatedString =translation[message];
				  });  

			  translation = ''; 
		  }
		return translatedString;
	}
	
	function _getTranslationStringForClientScript(message){

		var translation = getTransaltionFileSuitelet(message);
		log.debug('_getTranslationStringForClientScript--',translation);
		return translation;
	}
	function _getTranslationforSpecificLang(locale) {
		var translatedLanuguageJSON ='';
        log.debug({title:'locale',details:locale});
		try {
			require([filePath+locale], function (translationObj){
				translatedLanuguageJSON = translationObj;
			});	
		}catch (e) {
			log.error("WMS_TRANSLATOR_ERROR", e);
			//If translation file  is not available for any language, English version  should be returned.
			if(e.name == 'MODULE_DOES_NOT_EXIST')
			{
				var defaultLocale ="en_US";
				require([filePath+defaultLocale], function (translationObj){
					translatedLanuguageJSON = translationObj;});
			}
		}

		return translatedLanuguageJSON;
	}
    function _getKeyBasedonValue(RuleId)
    {
         log.debug({title:'RuleId in translator',details:RuleId});
                     var keyFound =false;
                      var translationKey ='';
                     var locale = "en_US";                    
                    var translatedJSONobj =_getTranslationforSpecificLang(locale);                   
                     for(var key in translatedJSONobj)
                     {                       
                         if( RuleId === translatedJSONobj[key])
                         {                         
                             translationKey =key;
                             keyFound =true;
                         }
                         if(keyFound)
                             break;
                     }
                     log.debug({title:'final translationKey',details:translationKey});
                     if(translationKey !=null && translationKey !='' && translationKey != undefined )
                        RuleId = _getTranslationString(translationKey);
                    log.debug({title:'RuleId returning from translator',details:RuleId});
                    return RuleId;
    }
	return {
		getTranslationString : _getTranslationString,
		getTranslationStringForClientScript:_getTranslationStringForClientScript,
		getTranslationforSpecificLang :_getTranslationforSpecificLang,
        getKeyBasedonValue : _getKeyBasedonValue
	};
});
