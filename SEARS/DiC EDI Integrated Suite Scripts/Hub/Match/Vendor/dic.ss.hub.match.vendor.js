/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['../../../Com/dic.cs.config',
        '../../../Com/Util/dic.ss.com.util.js'
        ],

function(dicConfig,
		dicSSUtil) {
	
	var FORM_NAME = 'MATCH_VENDOR';
	
	function _createOptions(req){
		return {
			query: req.parameters,
			sideType: dicConfig.SIDE_TYPE.HUB.Type
		
		};
	}
	/**
	 *Build the from 
	 */
	function _buildForm(options){
		var form = dicSSUtil.buildForm({
			sideType: options.sideType,
			formName: FORM_NAME
		});
		return form;
	}
	/**
	 * End build the form
	 */
	
   /**
    * Process POST Method
    */
	function _processRequestPOST(req, res){
		
	}
	/**
	 * Process GET request
	 * @param {ServerRequest} 
	 * @param {ServerResponse}
	 */
	function _processRequestGET(req, res){
		res.writePage(_buildForm(_createOptions(req)));
	}
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	if(context.request.method==='GET'){   
    		_processRequestGET(context.request, context.response);
    	}else{
    		_processRequestPOST(context.request, context.response);
    	}
    }

    return {
        onRequest: onRequest
    };
    
});
