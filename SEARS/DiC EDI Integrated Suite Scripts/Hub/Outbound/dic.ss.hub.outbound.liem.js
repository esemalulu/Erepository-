/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['../../Com/dic.cs.config',
        '../../Com/Mailbox/dic.ss.com.mailbox',
        '../../Com/Util/dic.cs.util',
        'N/ui/serverWidget'],

function(dicConfig, 
		mailbox, 
		dicutil, 
		dicMess,
		serverWidget) {
	/***Begin region private methods 
	*/
	function _createOptions(req){
		 
		return {
			mailboxType: dicConfig.MAILBOX.TYPE.Outbound.Type,
			query: req.parameters,
			sideType: dicConfig.SIDE_TYPE.HUB.Type
			//url: dicutil.buildUrl(req.url,  req.parameters, ["cq", "ps"])
		};
	}
	
	/**
	* Build detail information of inbound form
	* @param {ServerRequest} context.request - Encapsulation of the incoming request
	 */
	function _buildOutboundForm(req){
		 return mailbox.buildMailboxForm(_createOptions(req));
		 
	}
	
	/**
	 *End region private methods 
	 */
	
	
	/**
	 * Process request METHOD GET
	 * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
	 */
	function _processRequestGET(req, res){
		 
		res.writePage(_buildOutboundForm(req));
	}
	
	/**
	 * Process request METHOD POST
	 */
	function _processRequestPOST(req, res){
		
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
