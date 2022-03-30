/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(['N/record',
        'N/error',
        'N/search',
        'N/format',
        'N/url',
        'N/runtime',
        '/SuiteScripts/CUST_DATE_LIB'],

function(record, error, search,format, url, runtime, custDate)
{


    var makemandatory = false;


    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */

 
  

  
	function pageInit(context)
	{

		    var currentRecord = context.currentRecord;
            var recType = currentRecord.type;
            log.error('RecType', recType);


            if(recType == 'vendorcredit' || recType == 'vendorbill'  )
            {

				if(context.mode == 'edit')
            	log.error('MODE', context.mode);

                var lineCnt = currentRecord.getLineCount({'sublistId':'item'});

                var sub = currentRecord.getValue({'fieldId':'subsidiary'});
                log.error('Subsidiar', sub);

              	if(lineCnt > 0)
                for (var i=0; lineCnt && i < lineCnt; i+=1)
    			{
                      var getShipper = currentRecord.getSublistValue({'sublistId':'item','fieldId':'location','line':i});

                	  log.error('Shipper', getShipper );

                      if(!getShipper)
                      {
                           	currentRecord.selectLine({'sublistId':'item', 'line':i});

                            if(sub == '2') //ILR
                            {
                                currentRecord.setCurrentSublistValue({'sublistId':'item', 'fieldId':'location', 'value':'2' }); //Virtual
                            }

                            if(sub == '3') //RTR
                            {
                                currentRecord.setCurrentSublistValue({ 'sublistId':'item', 'fieldId':'location', 'value':'12' });  //Virtual RT
                            }

                            if(sub == '40') //BNA
                            {
                                currentRecord.setCurrentSublistValue({'sublistId':'item', 'fieldId':'location', 'value':'38' }); //Virtual BNA 
                            }

                            if(sub == '42') //GRA
                            {
                                currentRecord.setCurrentSublistValue({'sublistId':'item', 'fieldId':'location', 'value':'37'});  //Virtual GRA
                            }

                            if(sub == '39') //BNU
                            {
                                currentRecord.setCurrentSublistValue({'sublistId':'item','fieldId':'location','value':'39' });  //Virtual BNU
                            }
                      }


				}

			}


	}




    function fieldChanged(context) 
    {
          var currentRecord = context.currentRecord;
          var recType = currentRecord.type;


          if(recType == 'invoice')
          {

              var sub = currentRecord.getValue({'fieldId': 'subsidiary'});
              var shipAddy = currentRecord.getValue({'fieldId': 'shipaddresslist'});

              if(context.fieldId == 'shipaddresslist' )
              {
                alert('Changing the Ship To Adress affects Tax Codes. Please check your items to make sure the proper Tax Codes are applied')
                //refreshPage(currentRecord.id, sub, shipAddy);

              }
          }



          if(recType == 'vendorbill')
          {

                if(context.fieldId == 'custbody_ach_custom_invoice_date' && 
                   currentRecord.getValue({'fieldId': 'custbody_ach_custom_invoice_date'}) &&
                   currentRecord.getValue({'fieldId': 'terms'}) )
                {
                      var terms = currentRecord.getValue({'fieldId': 'terms'});

                      var termsRec = search.lookupFields({'type': 'TERM', 'id': terms, 'columns': ['daysuntilnetdue']});

                      var invDate = new Date(currentRecord.getValue({'fieldId': 'custbody_ach_custom_invoice_date'}))

                      var newDate = invDate.setDate(invDate.getDate() + parseInt(termsRec.daysuntilnetdue));

                      var dateString = format.parse({value:new Date(newDate), type: format.Type.DATE});

                      currentRecord.setValue({'fieldId':'duedate', 'value':dateString});

                      //log.error('dateString', dateString )

                }

          }

    }









  	function saveRecord(context)
	{

      		var currentRecord = context.currentRecord;
            var recType = currentRecord.type;
      		var sub = currentRecord.getValue({'fieldId':'subsidiary'});
            //log.error('RecType', recType )

            var lineCnt = currentRecord.getLineCount({'sublistId':'item'});

            if(recType == 'invoice'  )
            {

                  for (var i=0; lineCnt && i < lineCnt; i++)
                  {

                        var ItemId = currentRecord.getSublistValue({'sublistId':'item', 'fieldId':'item', 'line':i});

                        var fieldLookUp = search.lookupFields({'type': 'ITEM', 'id': ItemId, 'columns': ['custitem_ach_software_item']});

                        //log.error('object', fieldLookUp );

                          if(fieldLookUp['custitem_ach_software_item'] == true)
                          {
                            var startDate = currentRecord.getSublistValue({'sublistId':'item', 'fieldId':'custcolstart_date', 'line':i});

                            var endDate = currentRecord.getSublistValue({'sublistId':'item','fieldId':'custcolend_date','line':i});

                            var lineNo = currentRecord.getSublistValue({'sublistId':'item','fieldId':'line','line':i});

                            if(startDate == '' && endDate == '')
                            {
                              alert('Please enter values for Start/End Date for Line # '+ lineNo )
                              return false;
                            }

                          }

/*
                          if(ItemId == '896786')  //Sales Tax on Redemptions
                          {
                                if(sub = '3') //RTR
                                {
                                  currentRecord.setCurrentSublistValue({'sublistId':'item', 'fieldId':'taxcode', 'value':'-7'});
                                }

                                if(sub = '2') //ILR
                                {
                                  currentRecord.setCurrentSublistValue({'sublistId':'item', 'fieldId':'taxcode', 'value':'16'});
                                }
                          }
*/
                  }

            }





            if(recType == 'vendorbill')
            {


                if(!currentRecord.getValue({'fieldId': 'custbody_ach_custom_invoice_date'}))
                {
                  alert('Please enter a value for VENDORS INVOICE DATE (C)');
                  return false;
                }


            }

			return true;

	}
  




function refreshPage(ID, sub, addy)
{
  
  
 var smdSlUrl = url.resolveRecord({
    recordType: 'invoice',
    recordId: ID,
    isEditMode: true
});

	smdSlUrl +=	'&subsid='+ sub +'&address='+ addy;
	window.ischanged = true;
	window.location = smdSlUrl;
}



  function getParameterFromURL()
  {
      var query = window.location.search.substring(1);
      var vars = query.split("&");

      for (var i=0;i<vars.length;i++) 
      {
        var pair = vars[i].split("=");
        if(pair[0] == param){
          return decodeURIComponent(pair[1]);} 
      }
      return(false);
  } 



    return {
    	pageInit: pageInit,
        saveRecord: saveRecord,
      	fieldChanged: fieldChanged
        //validateLine: validateLine
    };

});





