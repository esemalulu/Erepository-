

define(["N/log"],function(log){

	var exports = {};
	
	
	function beforeSubmit(scriptContext){
		log.debug({
			"title": " Before Submit",
			
			"details" : "action=" + scriptContext.type
	
		})
	}
	
	function afterSubmit(scriptContext){
		log.debug({
			"title": "After Submit",
			
			"details" : "action=" + scriptContext.type
	
		})
	}
	
	
	exports.beforeSubmit = beforeSubmit;
	exports.afterSubmit = afterSubmit;
    return exports;
})