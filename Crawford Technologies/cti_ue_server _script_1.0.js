/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */

function afterSubmit(type)
{

}





function beforeSubmit(type)
{
  	if(nlapiGetRecordType() == 'estimate')
    {

        if(type == "create")
        {
          if(nlapiGetFieldValue('custbody_swe_from_contract'))
          {

            var frEndDate = nlapiLookupField('customrecord_contracts', nlapiGetFieldValue('custbody_swe_from_contract'), 'custrecord_contracts_end_date', false);

            var frDateToDate = nlapiStringToDate(frEndDate);
            var dateChange = nlapiAddDays(frDateToDate, -15);

            var newDate = nlapiDateToString(dateChange);

            nlapiSetFieldValue('duedate', frEndDate);
            nlapiSetFieldValue('expectedclosedate', newDate);
          }

        }

    }

}





function afterSubmit(type)
{

  	if(nlapiGetRecordType() == 'estimate')
    {
        var rec = nlapiLoadRecord(nlapiGetRecordType() , nlapiGetRecordId());
      

        var quoteFilters = [new nlobjSearchFilter('type', null, 'anyof', 'Estimate'),
                            new nlobjSearchFilter('mainline', null, 'is', 'F'),
                            new nlobjSearchFilter('internalid', null, 'anyof', nlapiGetRecordId())];

        var quoteColumns = [new nlobjSearchColumn('amount'),
                            new nlobjSearchColumn('fxamount'),
                            new nlobjSearchColumn('taxtotal')
                           ];


        var quoteSrch = nlapiSearchRecord ('transaction', null, quoteFilters, quoteColumns);

        var cadAmount = quoteSrch[0].getValue(quoteColumns[0]);
        var fxAmount = quoteSrch[0].getValue(quoteColumns[1]);
        var ctiTaxTotal = quoteSrch[0].getValue(quoteColumns[2]);

		if(fxAmount)
        {
            nlapiLogExecution('ERROR','CAD Amount', cadAmount);
            nlapiLogExecution('ERROR','Foreign Amount', fxAmount);

            var ctiExchaneRte =  parseFloat(cadAmount / fxAmount).toFixed(4)
            rec.setFieldValue('custbody_cti_exchange_rate', ctiExchaneRte);

        }




        if(ctiTaxTotal > 0)
        {
            rec.setFieldValue('custbody_cti_tax_amount', ctiTaxTotal);
            rec.setFieldValue('custbody_cti_tax_amount_fx', rec.getFieldValue('taxtotal'));
        }
        else
        {
            rec.setFieldValue('custbody_cti_tax_amount', '0.00');
            rec.setFieldValue('custbody_cti_tax_amount_fx', '0.00');
        }

         var lineCnt = nlapiGetLineItemCount('item');
         nlapiLogExecution('ERROR','Line Count', lineCnt);

        if(lineCnt == 1)
        {
           var itemId = nlapiGetLineItemValue('item','item',1)
           var itemName = nlapiLookupField('item', itemId , 'displayname', false);
           rec.setFieldValue('custbody_cti_line_1_item', itemName);

           nlapiLogExecution('ERROR','Item Name', itemName);
        }



        if(lineCnt > 1)
        {
                var lineArray =  new Array();

                for(var i=1; i <= lineCnt; i++)
                {
                  lineArray.push(nlapiGetLineItemValue('item','item',i));
                };



                for (var i = 0; i < lineArray.length; ++i) 
                {
                    for (var j = i + 1; j < lineArray.length; ++j) 
                    {
                      if (lineArray[i] === lineArray[j])
                        lineArray.splice(j, 1);
                    }
                }

                if(lineArray.length == 1)
                {
                      nlapiLogExecution('ERROR','Array', JSON.stringify(lineArray));
                      nlapiLogExecution('ERROR','FINAL TEST', 'Completed');

                }


        }





        nlapiSubmitRecord(rec, true, true);


    }




}




