/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Aug 2015     CodeBoxLLC-1
 *
 */
//pardot account info
var pardotUser = 'joe.son@audaxium.com';
var pardotUserKey = 'b7ded6aa465b9ce29f376ea6863e9769';
var pardotPass = 'CBdev4147';
var pardotApiKey = '';

var pardotLoginUrl = 'https://pi.pardot.com/api/index?email='+pardotUser+'&password='+pardotPass+'&user_key='+pardotUserKey;
//key is generated by Pardot upon successful connection
var pardotApiKey = '';

var loginStart = new Date().getTime();
var response = nlapiRequestURL(pardotLoginUrl, null, null );
var responseXML = nlapiStringToXML( response.getBody() );
pardotApiKey = nlapiSelectValue( responseXML, '//api_key' );
var loginEnd = new Date().getTime();
alert(loginStart - loginEnd);

var updStart = new Date().getTime();
/**
 * Batch Update - END POINTS
 * /api/prospect/version/3/do/batchCreate (requires valid email address not currently in system)
 * /api/prospect/version/3/do/batchUpdate (requires valid prospect id or email address)
 * /api/prospect/version/3/do/batchUpsert (requires valid id or email for update, or valid unique email for insert)
 */
var pardotBatchUpdateUrl = 'https://pi.pardot.com/api/prospect/version/3/do/batchUpdate?format=json&user_key='+pardotUserKey;
pardotBatchUpdateUrl += '&api_key='+pardotApiKey;

//7 Prospect Payload
var payload = {
	"prospects":{
		"rod_mackay23@hotmail.com":{
			"first_name":"joebatchtest",
			"last_name":"joebatchtest"
		},
		"bbs536@gmail.com":{
			"first_name":"joebatchtest2",
			"last_name":"joebatchtest2"
		},
		"test1@audaxium.com":{
			"first_name":"joebatchtest3",
			"last_name":"joebatchtest3"
		},
		"test9@audaxium.com":{
			"first_name":"joebatchtest4",
			"last_name":"joebatchtest4"
		},
		"gamaonexcel@gmail.com":{
			"first_name":"TestBatch5",
			"last_name":"GamaBatch5"
		},
		"test@test.com":{
			"first_name":"JoeBatch6",
			"last_name":"SonBatch6"
		},
		"email.test@pardot.com":{
			"first_name":"JoeBatch7",
			"last_name":"SonBatch7"
		}
	}
};
var updBatchResponse = nlapiRequestURL(pardotBatchUpdateUrl, JSON.stringify(payload) );
alert(updBatchResponse.getBody());
//var updBatchResponseXML = nlapiStringToXML( updBatchResponse.getBody() );
//alert(nlapiSelectValue(updBatchResponseXML, '//@stat'));
var updEnd = new Date().getTime();
alert(updStart - updEnd);

/**
 * Single Update
var pardotUpdateUrl = 'https://pi.pardot.com/api/prospect?version=3&do=update&user_key='+pardotUserKey;
pardotUpdateUrl += '&api_key='+pardotApiKey+'&email=rod_mackay23@hotmail.com&first_name=joetest';
var updResponse = nlapiRequestURL(pardotUpdateUrl, null, null );
var updResponseXML = nlapiStringToXML( updResponse.getBody() );
alert(nlapiSelectValue(updResponseXML, '//@stat'));
var updEnd = new Date().getTime();
alert(updStart - updEnd);
*/

/**
var pardotCreateUrl = 'https://pi.pardot.com/api/prospect?version=3&do=create&user_key='+pardotUserKey;
var pardotAssignUrl = 'https://pi.pardot.com/api/prospect?version=3&do=assign&user_key='+pardotUserKey;
var pardotReadEmailUrl = 'https://pi.pardot.com/api/prospect?version=3&do=read&user_key='+pardotUserKey;

pardotCreateUrl += '&api_key='+pardotApiKey+'&email='+robj.email;
pardotAssignUrl += '&api_key='+pardotApiKey+'&email='+robj.email+'&user_id='+pardotInstHeartMatUserId;
pardotReadEmailUrl += '&api_key='+pardotApiKey+'&email='+robj.email;
*/

