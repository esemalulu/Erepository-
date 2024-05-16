/** ----------------------------------------------
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * ----------------------------------------------
 * Acme Paper : NetSuite Restlet to get files for
 * Xchange system integration
 * Lambda Function
 * Dantech, June 2021
 * ------------------------------------------------
*/

define(['N/search','N/record','N/file'],function(search,record,file){

    function doGet(requestParams){
        log.debug('in doGet',JSON.stringify(requestParams.fileID));
        if(requestParams.fileID!==undefined){
            if(requestParams.fileID!=''){
                return findFileByInternalID(requestParams.fileID);
            }else{
    	        return JSON.stringify({'ERROR[E0]':'No NetSuite internal ID value received.'});
            }
        }else{
            return JSON.stringify({'ERROR[E1]':'Missing fileID parameter'});
        }
  }

    function findFileByInternalID(nsID){
        var respObj={};
        var fileObj=file.load({id:nsID});

	    try{
            if(fileObj){
                log.debug('fileObj',JSON.stringify(fileObj.getContents()));
                respObj={'fileObj':fileObj,'fileContents':fileObj.getContents()};
            }else{
                respObj=JSON.stringify({'ERROR[E2]':'No File with NetSuite internal ID: '+nsID+' found.'});
            }
            log.debug('respObj',JSON.stringify(respObj));
	    }catch(E3){
	        return JSON.stringify({'ERROR[E3]':JSON.stringify(E3.message)});
	    }
        return JSON.stringify(respObj);
    }

    return{
        'get':doGet
    };
});