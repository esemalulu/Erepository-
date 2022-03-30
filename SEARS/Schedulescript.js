/* main function*/
function main(){
	log('main', 'scheduled script event running');
	nlapiSendEmail( -5, 'rajiv@mca140.com', "New", "Real Existence", null);
}

/* logger shorthand*/
function log(name, message) {
    nlapiLogExecution('DEBUG', name, message);
}