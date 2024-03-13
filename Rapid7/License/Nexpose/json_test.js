function getServerResponse(){
var ctx = nlapiGetContext();
var uadminAuth = ctx.getSetting('SCRIPT','custscriptr7nx_uadminauth');
var endpointForQueries = 'https://updates.rapid7.com:9669/uadmin/command?op=getLicenses&timeStart=2016-12-12T11:55:20&timeStop=2016-12-12T12:40:20';
	nlapiLogExecution('AUDIT', 'Enter GetServerResp, line 11', endpointForQueries);
	endpointForQueries = encodeURI(endpointForQueries);
	nlapiLogExecution('AUDIT', 'Server Request URL, line 13', endpointForQueries);
	//Obtain response from NX server, by passing in a timestamp
	//The webservice returns all licenses that have touched server since timeStart
	try
	{
		var authHeaders = [];
		authHeaders['Authorization'] = uadminAuth;
		queryResponse = nlapiRequestURL(endpointForQueries, null, authHeaders);
       // nlapiLogExecution('AUDIT', 'after', 'after');
                var body = queryResponse.getBody();
                nlapiLogExecution('AUDIT', 'body', body);


                //var str2 = queryResponse.toString();
                //nlapiLogExecution('AUDIT', 'queryResponse', str2);
		//Debug stmts
        //nlapiLogExecution('AUDIT', 'JSON before', 'before');
		//var str = JSON.stringify(body);
		//nlapiLogExecution('AUDIT', 'Get Server response', str);

        var objResponse1 = JSON.parse(body);
        nlapiLogExecution('AUDIT', 'jsonparse', objResponse1);

}
	catch (err) {
		nlapiLogExecution('ERROR', err.name, err.message);
	throw nlapiCreateError(err.name, err, false);
	}
}