/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record',
        'N/error',
        'N/search',
        'N/ui/serverWidget',
        'N/runtime',
        'N/url'],

function(record,  error, search, serverw, runtime, url) 
{

    function beforeLoad(context) 
    {

      var thisRec = context.newRecord;
      var recType = thisRec.type;

      //if(runtime.getCurrentUser() == '29116069')  //Fazal(23792219) Zaheer(10564652)  Elijah(29116069)

        if(recType == 'vendorpayment')
        {

          var stUrl = 'https://1050077.app.netsuite.com/app/common/custom/custform.nl?id=115&nl=F&ft=TRANSACTION&tt=Check&ol=F&e=T'
          context.form.addButton({'id': 'custpage_change_checkform', 'label': 'Change Check Template','functionName': '(function() { return window.open(\''+stUrl+'\', \'_blank\'); })'});
        }


    }


    function beforeSubmit(context) 
	{

    }


    function afterSubmit(context) 
	{

            var thisRec = context.newRecord;
            var recType = thisRec.type;  

            var rec = record.load({
              'type':recType,
              'id':thisRec.id
            });

            var sub = rec.getValue({'fieldId':'subsidiary'});

      		var lineCnt = rec.getLineCount({'sublistId':'item'});


              if(recType == 'salesorder')
              {
                    if(context.type == context.UserEventType.CREATE)

            		log.error('ID', recType +':'+ thisRec.id );

                    var upidArray = [];

                    for (var i=0; lineCnt && i < lineCnt; i+=1)
                    {
                         var getUPID = rec.getSublistValue({'sublistId':'item', 'fieldId':'custcolcreated_po_for_vendor_internal', 'line':i });

                        upidArray.push(getUPID);
                    }

                    if(upidArray || upidArray.length > 0)
                    {

                      rec.setValue({'fieldId': 'custbodycore_created_po_for_vendor','value': JSON.stringify(upidArray).replace(/[\[\]"]+/g,"")});
                    }

              }

            if(recType == 'invoice' || recType == 'salesorder' )
            {
            	log.error('ID', recType +':'+ thisRec.id )

                for (var i=0; lineCnt && i < lineCnt; i+=1)
    			{
                      var getItem = rec.getSublistValue({'sublistId':'item', 'fieldId':'item', 'line':i});
                      var getTaxCode = rec.getSublistValue({'sublistId':'item','fieldId':'taxcode','line':i});

                  	  if(getItem == '64' && getTaxCode != '-18')

                        if(sub == '3') //RTR
                        {
            				var shipToCountry = rec.getValue({'fieldId':'shipcountry'});

                       		if(shipToCountry == 'US')
                            {
                              rec.setSublistValue({'sublistId':'item', 'fieldId':'taxcode','line':i,'value':'-8' }); //-Not Taxable-
                        	}

                          	if(shipToCountry == 'MX')
                            {
                               rec.setSublistValue({'sublistId':'item', 'fieldId':'taxcode', 'line':i, 'value':'4248'}); //VAT_MX:UNDEF_MX
                        	}
                        }

                }

                var RedemptionCredit = rec.findSublistLineWithValue({ 'sublistId': 'item', 'fieldId': 'item', 'value': '889585'});

              if(RedemptionCredit > -1)
               {
                      log.error('Item_Display', RedemptionCredit)

                      var total = 0;

                      for (var i=0; lineCnt && i < lineCnt; i+=1)
                      {

                            var getChargeBack = rec.getSublistValue({'sublistId':'item', 'fieldId':'item', 'line':i});

                            if(getChargeBack == '474783')
                            {
                                var lineAmount = rec.getSublistValue({'sublistId':'item', 'fieldId':'amount', 'line':i});

                                total += parseFloat(lineAmount);
                            }

                      }


                 var trxTaxTotal1 = rec.getValue({'fieldId':'taxtotal'});

                 var redemptionTaxRate = parseFloat(trxTaxTotal1 / total * 100).toFixed(0)

                 rec.setValue({
                   fieldId: 'custbody_ach_redemption_taxrate1',
                   value: redemptionTaxRate
                 });


                 log.error('TaxRate Total', redemptionTaxRate)

               }




			}

              if(recType == 'vendorbill')
              {
                     log.error('ID', recType +':'+ thisRec.id );

                    if(context.type == context.UserEventType.CREATE )

                      for (var i=0; lineCnt && i < lineCnt; i+=1)
                      {
                            var getShipper = rec.getSublistValue({'sublistId':'item', 'fieldId':'location','line':i});

                            if(!getShipper)
                            {
                                  if(sub == '2') //ASI
                                  {
                                    thisRec.setSublistValue({'sublistId':'item','fieldId':'location','line':i,'value':'2' });  //Virtual
                                  }

                                  if(sub == '3') //LLC
                                  {
                                    thisRec.setSublistValue({'sublistId':'item','fieldId':'location','line':i,'value':'12' }); //Virtual RT
                                  }

                                  if(sub == '39') //BNU
                                  {
                                    thisRec.setSublistValue({'sublistId':'item','fieldId':'location','line':i,'value':'39' }); //Virtual BNU
                                  }

                                  if(sub == '40') //BNA
                                  {
                                    thisRec.setSublistValue({'sublistId':'item','fieldId':'location','line':i,'value':'38' }); //Virtual BNA
                                  }

                                  if(sub == '42') //GRA
                                  {
                                    thisRec.setSublistValue({'sublistId':'item','fieldId':'location','line':i,'value':'37' }); //Virtual GRA
                                  }

                            }
                      }


              }


                rec.save({
                  'enableSourcing':true,
                  'ignoreMandatoryFields':true
                });

    }

    return{
        beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit
        afterSubmit: afterSubmit
    	};

});
