/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record',
        'N/error',
        'N/search',
        'N/ui/serverWidget',
        'N/runtime',
        'N/url',
        'N/email'],

function(record,  error, search, serverw, runtime, url, email) 
{

  function beforeLoad(context) 
  {

      var thisRec = context.newRecord;
      var user = runtime.getCurrentUser();
      log.error( 'user', user.id )

     var form = context.form;

     //Elijah Semalulu = 304376
     // Alex Promnitz = 4
     // Shaan Singh = 72789
     // Ben Tiernan = 40093

  try
  {
    
      if(thisRec.type == 'customrecord_cmms_equipment_service' && (context.type == context.UserEventType.VIEW || context.type == context.UserEventType.EDIT) )
      {

			var woImagesSearch = search.create({
			type: "customrecord_cmms_eventimages",
			filters:[
						["custrecord_cmms_srvcimages_equipt_srvc","anyof", thisRec.id]
					],
			columns:[
						search.createColumn({name: "internalid"}),
						search.createColumn({name: "custrecord_cmms_eventimages_image"}),
                  
					]
		   }).run().getRange({start: 0, end: 1000 });

          log.error('woImagesSearch.length', woImagesSearch.length );

         //if(woImagesSearch.length > 0    )
         if(woImagesSearch.length > 0 && woImagesSearch.length < 93   )
         {
            var currentForm = context.form;
            currentForm.clientScriptModulePath = '/SuiteScripts/1clck_cs_transactions.js';

             currentForm.addButton({
             id: 'custpage_download_pics',
             label: 'Download Photos',
		     functionName : 'toSuitelet(\''+ thisRec.type+ '\', \''+ thisRec.id+ '\');'
             });           
         }

                
      }


      if(thisRec.type == 'salesorder' && (context.type == context.UserEventType.VIEW || context.type == context.UserEventType.EDIT) )
      {

          var customerID = thisRec.getValue({fieldId: 'entity'});
        
          var custRec = record.load({'type':'CUSTOMER', 'id':customerID });
              
          var grantEligilbe = custRec.getValue({fieldId: 'custentity_provincial_grant_eligibility'});
          var custProvince = custRec.getText({fieldId: 'billstate'});

            log.error('PROVINCE', custProvince);
        
          var auditSubtab = form.getSublist({id: 'custom336'});

           if(auditSubtab)
           {
               if( custProvince == 'NS' || custProvince == 'Nova Scotia' || custProvince == 'NB' || custProvince == 'New Brunswick')  
               {                     
                 auditSubtab.displayType = serverw.SublistDisplayType.NORMAL;
               }
               else
               {
                  auditSubtab.displayType = serverw.SublistDisplayType.HIDDEN;
               }
           }

      }


  } 
  catch (e) 
  {
          log.error('Error Befor Load'+ thisRec.type +'/'+thisRec.id, e);

          email.send({
	    		'author':-5,
	    		'recipients':'e.semalulu@1clickheat.com',
	    		'subject':'Error Befor Load '+ thisRec.type +'/'+thisRec.id ,
	    		'body':e
	    	});
         
  }








    
  }



  
   function beforeSubmit(context) 
   {

            var thisNewRec = context.newRecord;
            var thisNewRecType = thisNewRec.type;

            var thisOldRec = context.oldRecord;
            var thisOldRecType = thisOldRec.type;     

            var rec = record.load({'type':thisRec.type, 'id':thisRec.id });
     
      		var lineCount = rec.getLineCount({'sublistId':'item'});

     
           //context.type == context.UserEventType.EDIT && runtime.executionContext == runtime.ContextType.REST_WEB_SERVICES
     
           if( (thisRec.type == 'prospect' || thisRec.type == 'lead') && context.type === context.UserEventType.EDIT )  
           {


               var newValue = newRec.getValue({ fieldId: 'custentity_re_engaged_datetime' });
               var oldValue = oldRec ? oldRec.getValue({ fieldId: 'custentity_re_engaged_datetime' }) : null;

               if (newValue !== oldValue) 
               {
                 email.send({
	    		'author':-5,
	    		'recipients':'e.semalulu@1clickheat.com',
	    		//'cc':'alex@1clickheat.com',
	    		'subject':'TESTING EMAIL AFTER SAVE FOR '+ thisRec.type +'/'+thisRec.id ,
	    		'body':'TESTING'
	    	      });
                 
                log.debug('Field changed', `Old: ${oldValue}, New: ${newValue}`);
              }


           }






     
   }




  

  function afterSubmit(context) 
  {

      var thisRec = context.newRecord;
      var recType = thisRec.type;  

      var rec = record.load({'type':thisRec.type, 'id':thisRec.id });
    
      log.error('ID', thisRec.type +':'+ thisRec.id );
      var lineCount = rec.getLineCount({'sublistId':'item'});
      
      try 
      {

        
 
          if((thisRec.type == 'prospect' || thisRec.type == 'lead') && context.type == context.UserEventType.CREATE)
          {

              var reEngageDate = thisRec.getValue({fieldId: 'custentity_re_engaged_datetime'}); 
              log.error('reEngageDate', reEngageDate );
           

              var provinces = [
             { firstLetter: "A", provId: "NL" }, 
             { firstLetter: "a", provId: "NL" }, 
             { firstLetter: "B", provId: "NS" },
             { firstLetter: "b", provId: "NS" },      
             { firstLetter: "E", provId: "NB" },
             { firstLetter: "e", provId: "NB" },             
             { firstLetter: "K", provId: "ON" },
             { firstLetter: "k", provId: "ON" },
             { firstLetter: "L", provId: "ON" }, 
             { firstLetter: "l", provId: "ON" }, 
             { firstLetter: "M", provId: "ON" },
             { firstLetter: "m", provId: "ON" }, 
             { firstLetter: "N", provId: "ON" },
             { firstLetter: "n", provId: "ON" }, 
             { firstLetter: "P", provId: "ON" },
             { firstLetter: "p", provId: "ON" },
             { firstLetter: "V", provId: "BC" }, 
             { firstLetter: "v", provId: "BC" },        
             ];       

             var postalCode = thisRec.getValue({fieldId: 'billzip'});

            if(postalCode)
            {            
                 var firstChar = postalCode[0];
                        
                 var foundProv = provinces.find(provinces => provinces.firstLetter === firstChar);
                 log.error('foundProv.provId', foundProv.provId);

                 var addressSubrecord = rec.getSublistSubrecord({
                 sublistId: 'addressbook',
                 fieldId: 'addressbookaddress',
                 line: 0 // index of the address line
                 });

                 addressSubrecord.setValue({fieldId: 'state' ,  value: foundProv.provId});
            }

            var campaignName = thisRec.getValue({fieldId: 'custentity_campaign_name'});

            if(isEmpty(campaignName)) 
            {
              rec.setValue({fieldId: 'campaigncategory',value: 12});
              rec.setValue({fieldId: 'leadsource',value: 8024});
              log.error('EMPTY campaignName', campaignName);             
            }
            else
            {

                var campaignObj = [
                { campaignWord: "mail", campaignId: 8020 }, 
                { campaignWord: "print", campaignId: -2 }, 
                { campaignWord: "email", campaignId: 14824 }, 
                { campaignWord: "search", campaignId: 8016 },
                { campaignWord: "social", campaignId: -6 },
                { campaignWord: "display", campaignId: 8017 },
                { campaignWord: "youtube", campaignId: 89303 }                  
                ]; 
            
              var secondWord = campaignName.split('_')[1]; 
              log.error('secondWord', secondWord);
              var foundCampaign = campaignObj.find(campaignObj => campaignObj.campaignWord === secondWord);
              
              rec.setValue({fieldId: 'leadsource',value:foundCampaign.campaignId});              

            }
           
             var webSource = thisRec.getValue({fieldId: 'custentity_website_source'});

             var sourceObj = [
             { sourceTag: 'contact form', finalSource: 'General_Contact_Form' }, 
             { sourceTag: 'quiz lead', finalSource: 'Online_Pricing_Tool' }, 
             { sourceTag: 'referral form', finalSource: 'Referral_Form' }, 
             { sourceTag: 'ns hp page', finalSource: 'NS_HeatPump_LP' },
             { sourceTag: 'winter-warm-up-nb-nl-ns', finalSource: 'Winter_Warmup_LP' }, 
             { sourceTag: 'ev charger form', finalSource: 'EV_Charger_LP' } 
               
             ];

            if(webSource) 
            {
              var foundSource = sourceObj.find(sourceObj => sourceObj.sourceTag === webSource);             
              rec.setValue({fieldId: 'custentity_website_source',value:foundSource.finalSource});
            }
           
                                     
      }

     
      if(thisRec.type == 'estimate')
      {
            log.error('IN ESTIMATE', 'YES');
         
            var shopifyID = thisRec.getValue({fieldId: 'custbody_1click_shopify_id'});

            if(context.type == context.UserEventType.EDIT)
            {
                  log.error('IN EDIT', 'YES');
                  rec.setValue({fieldId: 'custbody_1click_shopify_order_link', value: '<a href="https://www.w3schools.com">TEST</a>'});
              
            }


            //JAN 20, 2026 Elijah Semalulu
            //UPDATE ITEM PRICE LEVEL BASED ON THE PROVINCE THAT THE CUSTOMER IS LOCATED ON ESTIMATES ONLY                
                              
            if(context.type == context.UserEventType.CREATE)
            {
                var provLookUp = search.lookupFields({
                'type':'customer',
                'id':rec.getValue({'fieldId':'entity'}),
                'columns':['billstate']
                });
                
                log.error('ID', thisRec.type +':'+ thisRec.id );                
                log.error('PROVINCE', provLookUp.billstate[0].value );
                var custProv =  provLookUp.billstate[0].value;

                var priceLevels = [
                { provInitial: "NS", priceLevelId: 2 }, 
                { provInitial: "NB", priceLevelId: 3 }, 
                { provInitial: "NL", priceLevelId: 6 }, 
                { provInitial: "ON", priceLevelId: 4 },
                { provInitial: "BC", priceLevelId: 7 }
                ];       

                var foundPriceLev = priceLevels.find(priceLevels => priceLevels.provInitial === custProv);       
                log.error('PRICE LEVEL', foundPriceLev.priceLevelId );
        

                for (var i=0; lineCount && i < lineCount; i+=1)
                {

                    var itemId = thisRec.getSublistValue({sublistId:'item',fieldId:'item',line:i});
                    log.error( 'itemId',itemId )

                    var itemSearch = search.create({ type: "item",
                        filters:
                        [
                           ["pricing.pricelevel","anyof", foundPriceLev.priceLevelId], 
                           "AND", 
                           ["internalidnumber","equalto", itemId]
                        ],
                       columns:
                       [
                          search.createColumn({name: "pricelevel", join: "pricing"}),
                          search.createColumn({name: "unitprice", join: "pricing"})
                       ]
                     }).run().getRange({start: 0, end: 1000 });


                     if(itemSearch.length > 0)
                     {  

                        var unitPrice = itemSearch[0].getValue({name: "unitprice", join: "pricing"})
                        log.error( 'UNIT PRICE', itemSearch[0].getValue({name: "unitprice", join: "pricing"}) );

                        rec.setSublistValue({ sublistId: 'item', fieldId: 'price', line: i, value: -1 });
                        rec.setSublistValue({sublistId:'item', fieldId:'rate', line:i, value: unitPrice }); 
                     }
              

               }
           }





        

    }




        
//FEB 05, 2025: Elijah Semalulu
//UPDATE DEPT, LOCATION AND CLASS ON ALL PURCHASE ORDERS

      if(thisRec.type == 'purchaseorder')
      {

            if(context.type == context.UserEventType.CREATE)

            var dept = rec.getValue({'fieldId':'department'});
            var clss = rec.getValue({'fieldId':'class'});
            var loctn = rec.getValue({'fieldId':'location'});

            for (var i=0; lineCnt && i < lineCnt; i+=1)
            {
                  if(dept ){ rec.setSublistValue({'sublistId':'item', 'fieldId':'department', 'line':i, 'value': dept });}

                  if(clss ){ rec.setSublistValue({'sublistId':'item', 'fieldId':'class', 'line':i, 'value': clss });}

                  if(loctn ){ rec.setSublistValue({'sublistId':'item', 'fieldId':'location', 'line':i, 'value': loctn });}                      
            }

                   
      }





             

 

              //rec.setValue({'fieldId':'custbody_processed', 'value':true});
              rec.save({ 'enableSourcing':true, 'ignoreMandatoryFields':true});             
              //rec.save();






        

            
       } 
       catch (e) 
       {
          log.error('Error Submitting Record'+ thisRec.type +'/'+thisRec.id, e);
/*
          email.send({
	    		'author':-5,
	    		'recipients':'e.semalulu@1clickheat.com',
	    		//'cc':'alex@1clickheat.com',
	    		'subject':'Error Submitting Record'+ thisRec.type +'/'+thisRec.id ,
	    		'body':e
	    	});
*/
         
       }




      
  }



  function isEmpty(stValue)
  {
        if ((stValue == '') || (stValue == null) || (stValue == undefined))
        {
            return true;
        }
        else
        {
            if (stValue instanceof String)
            {
                if ((stValue == '')){ return true; }
            }
            else if (stValue instanceof Array)
            {
                if (stValue.length == 0){ return true; }
            }
            return false;
        }
  }














  
  

    return{
        beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    	};

});




