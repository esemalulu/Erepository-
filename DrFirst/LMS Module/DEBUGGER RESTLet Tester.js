function credentials(){
	this.account = "1214084";
	//SAndbox Role
	this.role = "1113";
	//Latest as of 10/29/2015
	this.password = "rfVS3MzNDGVA";
	this.email = "df_dba@drfirst.com";
	
	//PRODUCTION LOGIN
	//this.password = "Drfirst1234";
	//this.email = "df_dba@drfirst.com";
	//this.role = "1127";
	//this.password = "Drfirst123";
	//this.email = "df_dba@drfirst.com";
}
 
function replacer(key, value){
    if (typeof value == "number" && !isFinite(value)){
        return String(value);
    }
    return value;
}
 

//Calling credential function
var cred = new credentials();
                
//Setting up Headers 
var headers = {"User-Agent-x": "SuiteScript-Call",
               "Authorization": "NLAuth nlauth_account=" + cred.account + ", nlauth_email=" + cred.email + 
                                ", nlauth_signature= " + cred.password + ", nlauth_role=" + cred.role,
               "Content-Type": "application/json"};
//-----------------------------------------------------------------------------------------------------------
//-- Contract
var url = 'https://rest.sandbox.netsuite.com/app/site/hosting/restlet.nl?script=130&deploy=1';

//Production
//var url = 'https://rest.netsuite.com/app/site/hosting/restlet.nl?script=123&deploy=1';

//Setting up Datainput
url +='&lastsynceddate=06/06/2015 04:01 am';

//Stringifying JSON
var urlres = nlapiRequestURL(url, null, headers);
alert(urlres.getBody());


//-- Licenses
var url = 'https://rest.sandbox.netsuite.com/app/site/hosting/restlet.nl?script=133&deploy=1';
//Setting up Datainput
url +='&lastsynceddate=6/6/2015';
//Stringifying JSON
var urlres = nlapiRequestURL(url, null, headers);
alert(urlres.getBody());

//-- Location
var url = 'https://rest.sandbox.netsuite.com/app/site/hosting/restlet.nl?script=132&deploy=1';
//Setting up Datainput
url +='&lastsynceddate=6/6/2015';

//Stringifying JSON
var urlres = nlapiRequestURL(url, null, headers);
alert(urlres.getBody());

//-- Practice
var url = 'https://rest.sandbox.netsuite.com/app/site/hosting/restlet.nl?script=131&deploy=1';
//Setting up Datainput
url +='&lastsynceddate=6/6/2015';

//Stringifying JSON
var urlres = nlapiRequestURL(url, null, headers);
alert(urlres.getBody());


