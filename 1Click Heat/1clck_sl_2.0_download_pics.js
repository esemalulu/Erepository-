/**
 *
 *  Version    Date            	Author           Remarks
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget','N/log','N/file','N/email','N/redirect','N/render','N/url','N/record','N/search','N/runtime','N/format', 'N/compress'],
function(ui, log,file,email,redirect,render,url,record,search,runtime,format,compress) {

function onRequest(context) {

        var request = context.request;
        var response = context.response;
        var method = request.method;
        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
try 
{

          if (method === 'GET')
          {
    
   		    var recType = request.parameters.recType;
			var recId = request.parameters.recId;     
            log.error('recId', recId )

            var woRec = record.load({type: recType,id: recId,isDynamic: true});

            var woDocNum = woRec.getValue({'fieldId':'name'});
           
			var woImagesSearch = search.create({
			type: "customrecord_cmms_eventimages",
			filters:[
						["custrecord_cmms_srvcimages_equipt_srvc","anyof", recId]
					],
			columns:[
						search.createColumn({name: "internalid"}),
						search.createColumn({name: "custrecord_cmms_eventimages_image"}),
                  
					]
			}).run().getRange({start: 0, end: 1000 });

				//log.error('SEARCH', JSON.stringify(woImagesSearch) );
            
 				var imageArray = [];

				for (var i = 0; i < woImagesSearch.length; i++)
				{
                    var lineImgId = woImagesSearch[i].getValue('custrecord_cmms_eventimages_image'); 

                   if(lineImgId)
                   {  
					 imageArray.push(lineImgId);
                   }                                    
                }

                var dupsArray= imageArray.reduce(function(acc, el, i, arr) {
                if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el);            
                return acc;
                }, []);

				log.error('dupsArray', JSON.stringify(dupsArray) );
            
            
                 //Remove Duplicates Iamges
                 var newArray = imageArray.filter( function( item, index, inputArray ) {
                 return inputArray.indexOf(item) == index;
                 });
				log.error('SEARCH', JSON.stringify(newArray) );
            
/*            
                var imageObject = {};	             

				for (var i = 0; i < woImagesSearch.length; i++)
				{
                   var imgInternalId = woImagesSearch[i].getValue('internalid'); 
                   var lineImgId = woImagesSearch[i].getValue('custrecord_cmms_eventimages_image'); 
                  
                   var lineImgText = woImagesSearch[i].getText('custrecord_cmms_eventimages_image'); 
                   var startIndex = lineImgText.indexOf("id");
                   var endIndex = lineImgText.indexOf("&");
                   var idValue = lineImgText.substring(startIndex, endIndex).replace('id=','');
                  
                   imageObject[woImagesSearch[i].getValue('customrecord_cmms_eventimages')] = {
			       "obj_internalid":woImagesSearch[i].getValue('internalid'),
			       "obj_id":woImagesSearch[i].getValue('custrecord_cmms_eventimages_image')}	
               
                   if(lineImgId)
                   {  
                    imageArray.push(imageObject[woImagesSearch[i].getValue('customrecord_cmms_eventimages')]);

                   }

				}
*/


                 var archiver = compress.createArchiver();
            
                 for (var j = 0; j < newArray.length; j++) 
                 {
                      //https://suiteanswers.custhelp.com/app/answers/detail/a_id/108132
                      var picFiles = file.load({
                      id: newArray[j]
                      });
                   
                      // create an archive as a temporary file object
                  
                      archiver.add({
                       file: picFiles
                       });                   
                 }
        
               var zipFile = archiver.archive({name: woDocNum, type: compress.Type.ZIP });
              
 			   log.error('zipFile', zipFile );
             
              zipFile.folder = 43839;              
              var fileId = zipFile.save();
 			  log.error('fileId.url', fileId.url );

              var fileSearchObj = search.create({
              type: "file",
              filters:
                     [
                        ["internalid","anyof", fileId]
                     ],
              columns:
                     [
                        search.createColumn({name: "url"})
                     ]
              }).run().getRange({start: 0, end: 1000 });

              var rsUrl = fileSearchObj[0].getValue('url')
              var url = 'https://7662002.app.netsuite.com'+rsUrl;
 			  log.error('url', url );

              var user = runtime.getCurrentUser(); 
            
 			  var empRec = record.load({
				  type: record.Type.EMPLOYEE,
				  id: user.id,
				  isDynamic: true,
                  });
                     
              var userEmail = empRec.getValue({'fieldId':'email'});
              log.error('userEmail', userEmail);  
            
              var html = '<html>'
              + '<head>'
              + '<style>'
              + 'a.button {'
              + 'padding: 1px 6px;'
              + 'border: 1px outset buttonborder;'
              + 'border-radius: 3px;'
              + 'color: #000000;'
              + 'background-color: buttonface;'
              + 'text-decoration: none;}'
              + '</style>'                
              + '</head>'
              + '<body>'
              + '<br/>'
              + '<a href="'+url+'" class="button">Download Pics</a>'
              + '</body>'
              + '</html>'
                       

             email.send({
	    	 'author':479006 ,
	    	 'recipients':[userEmail],
             //'bcc':['e.semalulu@1clickheat.com'],  
	    	 'subject':woDocNum+': Download Ready' ,
	    	 'body':html                           
	    	 });

            
            redirect.toRecord({
			type : recType,
			id : recId, 
            parameters: {'custparam_url':url },  
			isEditMode: false
			}); 
            
             log.error('Remaining governance units:', remainingUsage);                 
        }

  
  }
 catch(error) 
 {      
    log.error('Error: ',error);
 }


   
            
}








  

  
		return {
			onRequest: onRequest
		};

	});