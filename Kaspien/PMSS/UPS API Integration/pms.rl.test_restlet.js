/**
 * @NApiVersion 2.x
 * @NScriptType restlet
*/

define([], function() {
	return {
		get : function(context) {
			return "Hello World! "+JSON.stringify(context);
		},
		post : function(context) {
			return {
				error: [],
				status: 'ok',
				data: {
					message: 'Hello',
					echo: context
				}
			};
		}
	}
});