/**
 * Session library file for Solution Source accounts.
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

/**
 * Uses a RESTlet that returns the value from the session.
 * Used for client-side scripts.
 * @param sessionName
 * @param clearSession
 * @returns
 */
function SessionManagementRESTlet_GetSession(sessionName, clearSession) {   
    var now = new Date();
    //This returns the number of milliseconds between midnight of January 1, 1970 and current date. 
    //We need this to prevent I.E from caching the URL. If the url hasn't changed, IE returns cached value.
    //So we add this time in our url parameter to make sure that the url is never the same and forces IE to request it.
    var time = now.getTime(); 
    var url = '/app/site/hosting/restlet.nl?script=customscriptrvssessionmanagementrestlet&deploy=customdeployrvssessionmanagmentrestlet&name=' + sessionName + '&clearsession=' + clearSession +'&time=' + time;
    
    var headers = new Array();
    headers['User-Agent-x'] = 'SuiteScript-Call';
    headers['Content-Type'] = 'application/json';
    headers['Cache-Control'] = 'no-cache';
    
    var response = nlapiRequestURL(url, null, headers);
    var value = response.getBody();

    return value.substring(1, value.length-1);
}

/**
 * Uses a RESTlet that sets values in the session.
 * The dataIn is an array with name and value pairs.
 * Used for client-side scripts. 
 * @param sessionArray
 */
function SessionManagementRESTlet_SetSession(sessionArray) {
    var url = '/app/site/hosting/restlet.nl?script=customscriptrvssessionmanagementrestlet&deploy=customdeployrvssessionmanagmentrestlet';
    
    var headers = new Array();
    headers['User-Agent-x'] = 'SuiteScript-Call';
    headers['Content-Type'] = 'application/json';
    
    var response = nlapiRequestURL(url, JSON.stringify(sessionArray), headers);
}