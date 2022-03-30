/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Jan 2016     WORK-rehanlakhani
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	
	/*
	 * Documentation Location:
	 * certent.insidesales.com/noauth/services/documentation
	 */
	
	/*
	 * User Login Information:
	 * Login Payload:
	 * {"operation":"apiLogin","parameters":["audaxium","admin","bvmcYVpFboCHd1b6KUSTdtiI2FusNdVU"]}
	 */
	var user = ["audaxium", "admin","bvmcYVpFboCHd1b6KUSTdtiI2FusNdVU"];

	var auth = {};
		auth["operation"] = "apiLogin";
		auth["parameters"] = user;

	/*
	 * All Certent rest calls require the URL below
	 */
	var URL = "https://certent.insidesales.com/do=noauth/rest/service"
	
	/*
	 * Establishing the connection
	 */ 
	var connection = nlapiRequestURL(URL, JSON.stringify(auth), null, null, "POST");

	/*
	 * The code below is used to strip out just the PHPSESSID and only the PHPSESSID
	 */
	
	var headers = connection.getAllHeaders();
		session = connection.getHeaders("Set-Cookie");
	var sess = session[0].split(';');
	
	/*
	 * Building the header object to be passed into the header parameter of nlapiRequestURL(url, postdata, header, callback, HTTPMethod
	 */
	
	var header = {};
	header["Cookie"] = sess[0];

	/*
	 * Building parameters for getLeads request.
	 */
	var para = {};
		para["field"] = "date_created";
		para["operator"] = ">";
		para["values"] = ["2016-01-14 00:00:00"];

	/*
	 * Building getLeads request.
	 */
	var leads = {};
		leads["operation"] = "getLeads";
		leads["parameters"] = [[para]];

	/*
	 * Sending getLeads request with session returned from successful connection.
	 */
	var gotLeads = nlapiRequestURL(URL, JSON.stringify(leads), header, null, "POST");
	
	var lead = JSON.parse(gotLeads.body)
	var leadID = lead[0].id;
	
	/*
	 * Updating Lead - Working Confirmation: YES
	 */
	
	var lead1 = {};
		lead1["id"] = leadID;
		lead1["first_name"] = "Rehan";
		lead1["last_name"] = "Lakhani";
		lead1["phone"] = "416-400-0501";
		lead1["email"] = "rehan@audaxium.com";
	
	var updateLead = {};
		updateLead["operation"] = "updateLead";
		updateLead["parameters"] = [lead1];
		
	var upLead = nlapiRequestURL(URL, JSON.stringify(updateLeads), header, null "POST");

	var a = 1;
}
