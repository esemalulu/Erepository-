/**
 * Session library file for Solution Source accounts.
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/https'],

/**
 * {https} https
 */
function(https) {
   
	/**
	 * Gets the specified session object from the NetSuite session.
	 * If clearSession is true, will clear the value from the NetSuite session.
	 * Occurs asynchronously
	 */
	function getNSSessionValue(key, clearSession) {
		https.get.promise({
			url: '/app/site/hosting/restlet.nl?script=customscriptrvssessionmanagementrestlet&deploy=customdeployrvssessionmanagmentrestlet&name=' + key + '&clearsession=' + clearSession +'&time=' + new Date().getTime(),
			headers : {
				'User-Agent-x': 'SuiteScript-Call',
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache'
			}
		}).then(function(response) {
			return response.body.substring(1, value.length-1);
		}).catch(function(reason) {
			return reason;
		});
	}
	
	/**
	 * Sets the specified session object into the NetSuite session.
	 */
	function setNSSessionValue(value) {
		https.post.promise({
			url: '/app/site/hosting/restlet.nl?script=customscriptrvssessionmanagementrestlet&deploy=customdeployrvssessionmanagmentrestlet',
			headers: {
				'User-Agent-x': 'SuiteScript-Call',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(value)
		});
	}
	
    return {
    	getNSSessionValue: getNSSessionValue,
    	setNSSessionValue: setNSSessionValue
    };
    
});
