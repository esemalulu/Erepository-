/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 */

 define(['N/search', 'N/record', 'N/runtime','N/email','N/render','N/config','N/file', 'N/xml'],
 
 
 /**
 * MR that creates and sends email of VCB pdf with attachments
 * @param {search} search
 * @param {record} record
 * @param {runtime} runtime
 * @param {email} email
 * @param {render} render
 * @param {config} config
 * @param {file} file
 * @param {xml} xml
 */
 
 function(search, record, runtime,email,render,config,file,xml) {

     function getInputData() {
         var functionLogTitle = 'getInputData';
         log.debug(functionLogTitle, '--- Start ---');

         try {
            var scriptObj = runtime.getCurrentScript();
            //Getting the saved search id from script parameter.
            var savedSearchID = scriptObj.getParameter({
                name: "custscript_vcb_saved_search"
            });
            log.debug('savedSearchID=', savedSearchID);

            //Loading the saved search 'Vendor Chargeback Search' result data.
            return customrecordrvsvendorchargebackSearchObj = search.load({
                id	: savedSearchID
            });
         }catch (e) {
             log.error(functionLogTitle + 'Unexpected error:', e.toString());
         }
     }
     
     function reduce(context) {
        try {
				var scriptObj = runtime.getCurrentScript();
				var functionLogTitle = 'reduce';

				var key = context.key;
				var contextValues = context.values[0];
				var actualValues = JSON.parse(contextValues);
				log.debug('actualValues',actualValues);

				var recordId = actualValues.id;
				var vcbRecord = record.load({
				   type: 'customrecordrvsvendorchargeback',
				   id: recordId
				});

			   var params = new Array();
			   params = GD_VCB_Email(vcbRecord);
			   var attachment = new Array();
			   
			   var claimSearch = search.create({
			   type: "customrecordrvsvendorchargeback",
			   filters: ['id', 'equalto', recordId],
			   columns: [
				   search.createColumn({
					   name: "url",
					   join: "file",
					   label: "URL"
				   }),
				   search.createColumn({
					   name: "filetype",
					   join: "file",
					   label: "Type"
					}),
				   search.createColumn({
					   name: "name",
					   join: "file",
					   label: "Name"
				   }),
				   search.createColumn({
					  name: "internalid",
					  join: "file",
					  label: "Internal ID"
				   })
			   ]
			   });
			   if(claimSearch != null){
				   var searchResultCount = claimSearch.runPaged().count;
				   claimSearch = claimSearch.run()
				   claimSearch = claimSearch.getRange({
					   start: 0,
					   end: searchResultCount
				   });
				   log.debug('searchResultCount', searchResultCount);
				   for(var i = 0; i < searchResultCount; i++)
				   {
					   var fileId = claimSearch[i].getValue({name: "internalid", join: "file"});
					   if(fileId)
						{
							var fileObj = file.load({
								id: fileId
							});
							attachment.push(fileObj);
						}
				   }
			   }
				
			   attachment.push(params['pdffile']);
			   log.debug('attachment', attachment);
			   var records = new Array();
			   records['recordtype'] = 'customrecordrvsvendorchargeback'
			   records['record'] = recordId
			try{
			   if(params['recipient'] != '')
			   {
				   email.send({
					   author: params['author'],
					   recipients: params['recipient'],
					   subject: params['subject'],
					   body: params['body'],
					   attachments: attachment,
					   relatedRecords: {
						   customRecord:{
							   id: recordId,
							   recordType: 'customrecordrvsvendorchargeback'
						   }
					   }
				   });
			   }
			   log.debug('sent email without breaking', params['pdffile'])
			   vcbRecord.setValue({fieldId: 'custrecordvcb_hasbeenemailed', value: true})
			   vcbRecord.save();
			}
			catch (e) {
				log.error('Send Email Error:', e.message);
			}
				log.debug(functionLogTitle, '--- End ---'+' Remaining usage units: ' + scriptObj.getRemainingUsage());
        }catch (e) {
            log.error(functionLogTitle + 'Unexpected error:', e.toString());
        }		
     }
     
     function summarize(summary) {
         // Optional: Add summarize options
        log.debug("summary");
     }
	 
	 function GD_VCB_Email(vcbRecord){
       var recipientEmail = vcbRecord.getValue('custrecordvcb_vendoremail')
       var emailFromVendorRecord = search.lookupFields({
           type: 'vendor',
           id: vcbRecord.getValue('custrecordvcb_vendor'),
           columns: 'custentityrvs_vcbvendoremail'
       })["custentityrvs_vcbvendoremail"]
       

       var params = new Array();
       params['author'] = runtime.getCurrentScript().getParameter('custscriptgd_vcbemailonprintout')
       var recordId = vcbRecord.getValue('id')

       var vcbRecord = record.load({
           type: 'customrecordrvsvendorchargeback',
           id: recordId
       });

       var vendorRecord = record.load({
           type: 'vendor',
           id: vcbRecord.getValue('custrecordvcb_vendor')
       })

       log.debug('vendor addr', vendorRecord.getValue('defaultaddress'))
       var subject = 'VCB #' + String(recordId)
       params['subject'] = subject

       if(recipientEmail != ''){
           params['recipient'] = recipientEmail
       }
       else{
           params['recipient'] = emailFromVendorRecord
       }
	   log.debug('Log_1');

       params['body'] = 'In an effort to simplify the VCB process, please refer to the information provided below.<br><br>' +
                   'Please see the attached required documentation.<br><br>' +
                   'If this is a NO Part Return, accept this as submittal for payment.  If a part return is required, the respective part will be ready for pick up between 8 am &#45; 5 pm.  Please provide an RMA # if required.<br><br>' +
                   'It is critical that we address any questions or concerns within the first 30 days of receipt.  If a VCB is not paid within 60 days, full credit will be taken.<br><br>' +
                   'Thank you in advance for your cooperation.<br><br>' + config.load({
                       type: config.Type.COMPANY_INFORMATION
                   }).getValue('companyname')

       params['cc'] = null;
       params['bcc'] = null;
       attachObj = {};
log.debug('Log_2',vcbRecord.getValue('custrecordvcb_attachments'));
       if(vcbRecord.getValue('custrecordvcb_attachments') != ''){
           attachObj.attachments = JSON.parse(vcbRecord.getValue('custrecordvcb_attachments'));
       }
	  
       attachObj.addr1 = vendorRecord.getValue('billaddr1');
       attachObj.addr2 = vendorRecord.getValue('billaddr2');
       attachObj.city = vendorRecord.getValue('billcity');
       attachObj.state = vendorRecord.getValue('billstate');
       attachObj.zip = vendorRecord.getValue('billzip');
	   
       attachObj.userEmail = search.lookupFields({
           type: 'employee',
           id: runtime.getCurrentScript().getParameter('custscriptgd_vcbemailonprintout'),
           columns: 'email'
       })["email"]

       var renderer = render.create();
       renderer.setTemplateByScriptId('CUSTTMPLVCBEMAILPDF');
       renderer.addRecord({templateName: 'record', record: vcbRecord});
       renderer.addCustomDataSource({format: render.DataSource.OBJECT, alias: 'jsonObject', data: attachObj})

       var xmlString = '<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\"> <pdfset>'
       xmlString += renderer.renderAsString().substring(renderer.renderAsString().indexOf('<pdf>'))
       
       xmlString += '</pdfset>'
	   log.debug('Log_3');
       saveTXTtoCabinet(xmlString);
	   
       log.debug('check1','check1');
       vcbPDF = render.xmlToPdf(xmlString)
       vcbPDF.name = 'VCB #' + recordId + '.pdf'

       params['pdffile'] = vcbPDF
       params['notifysenderonbounce'] = null;
       params['internalonly'] = null;
       params['replyto'] = null

       return params;
   }
   
   function saveTXTtoCabinet(string){
       try{
           log.debug('check','check');
           var fileObj = file.create({
               name: 'test.txt',
               fileType: file.Type.PLAINTEXT,
               contents: string,
               description: 'This is a plain text file.',
               folder: 51550255//SB1=46240664,PROD=51550255
           });
           fileObj.save();
           log.debug('saveTXTToCabinet','SUCCESS')
       }catch(e){
           log.debug('saveTXTToCabinet','FAILED')
       };
   };

     return {
         getInputData : getInputData,
         reduce : reduce,
         summarize : summarize
     };
 });