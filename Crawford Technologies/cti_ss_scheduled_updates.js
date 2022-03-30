 /**
 * 
 * Version    Date            	Author           			Remarks
 * 1.00       10 March 2021     esemalulu@crawfordtech.com
 *
 */


function generalUpdates()
{


  try
  {

        var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct445_lastprocessed');

	    //var searchResults = nlapiSearchRecord(null, 'customsearch888');

		var trxFilters = [new nlobjSearchFilter('type', null, 'anyof', 'Journal')];

        if (paramLastProcId)
        {
          trxFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
        }
        var trxColumns = [new nlobjSearchColumn('internalid').setSort(false)];

        var searchResults = nlapiSearchRecord('transaction', null, null, trxColumns)


      for (var i=0; searchResults && i < searchResults.length; i++)
      {
//-------------------------------------------------------------------------------------------------------------------------------
    		log('ERROR','Transaction ID', searchResults[i].getId());
/*
            var rec = nlapiLoadRecord(searchResults[i].getRecordType() , searchResults[i].getId());

            rec.setFieldValue('custbody_contract_name', '')

			var linCnt = rec.getLineItemCount('revenueelement')
    		log('ERROR','LINES', linCnt);

                for(var j = 1; j <= rec.getLineItemCount('revenueelement'); j++)
                {
                        //var x=1;
                        rec.removeLineItem('revenueelement', j);

                }

                nlapiSubmitRecord(rec,true,true);
*/
               nlapiDeleteRecord(searchResults[i].getRecordType() , searchResults[i].getId());


//-------------------------------------------------------------------------------------------------------------------------------
//
              //Set % completed of script processing
              var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
              nlapiGetContext().setPercentComplete(pctCompleted);

              //AFter each record is processed, you check to see if you need to reschedule
              if ((i+1)==500 || ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 200))
              {
                //reschedule
                log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));
              	var rparam = {'custscript_sct445_lastprocessed':searchResults[i].getValue('internalid')};
              	nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);

                //nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                break;

              }

      }
  }
  catch(procerr)
  {

       log('ERROR','ERROR PROCESSSING', getErrText(procerr));

      if(getErrText(procerr))
      {
                //log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));

              	var rparam = {'custscript_sct445_lastprocessed':searchResults[i].getValue('internalid')};
                nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam );
      }


  }



	log('ERROR','Remaining', nlapiGetContext().getRemainingUsage());

}













function updateQuoteTax()
{

	try
	{


        var searchResults = nlapiSearchRecord(null, 'customsearch1288');

		for (var i=0; searchResults && i < searchResults.length; i++)
		{
//------------------------------------------------------------------------------------------------------

        var rec = nlapiLoadRecord(searchResults[i].getRecordType() , searchResults[i].getId());
/*
        var quoteFilters = [new nlobjSearchFilter('type', null, 'anyof', 'Estimate'),
                            new nlobjSearchFilter('mainline', null, 'is', 'F'),
                            new nlobjSearchFilter('internalid', null, 'anyof',searchResults[i].getId())];

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

            //nlapiLogExecution('ERROR', 'FX Tax Total', ctiTaxTotal);

            rec.setFieldValue('custbody_cti_exchange_rate', ctiExchaneRte);
            rec.setFieldValue('custbody_cti_tax_amount', ctiTaxTotal);
            rec.setFieldValue('custbody_cti_tax_amount_fx', rec.getFieldValue('taxtotal'));
        }
*/

		 var lineCnt = rec.getLineItemCount('item')

         nlapiLogExecution('ERROR','Line Count', lineCnt);

        if(lineCnt == 1)
        {
           var itemId = rec.getLineItemValue('item','item',1)
           var itemName = nlapiLookupField('item', itemId , 'displayname', false);
           rec.setFieldValue('custbody_cti_line_1_item', itemName);
           rec.setFieldValue('custbody_cti_processed', 'T');

           nlapiLogExecution('ERROR','Item Name', itemName);
        }

        if(lineCnt > 1)
        {
            var lineItems = []; 

            for (var i=0; i < lineCnt.length; i+=1)
            {
              lineItems.push(rec.getLineItemValue('item','item',i));

              nlapiLogExecution('ERROR','Item Array', JSON.strinify(lineItems));

            }

        }



        nlapiSubmitRecord(rec, true, true);

    //------------------------------------------------------------------------------------------------------

			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);

			//AFter each record is processed, you check to see if you need to reschedule
			if ((i+1)==1000 || ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 200))
			{
				//reschedule
				log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));

              	var rparam = {'custscript_sct194_lastprocid':searchResults[i].getValue('internalid')};

              	//nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
              	nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());              
				break;
			}

		}

	}
	catch(procerr)
	{
		log('ERROR','Error Updating Exchange Rate', getErrText(procerr));	
	}

	log('ERROR','Remaining', nlapiGetContext().getRemainingUsage());

}

















function updateUpidAfter1127()
{


	try
	{

		 var searchResults = nlapiSearchRecord(null, 'customsearch2142');
/*
		 var poFilters = [new nlobjSearchFilter('type', null, 'anyof', 'PurchOrd'),
                         new nlobjSearchFilter('mainline', null, 'is', 'F'),
                         new nlobjSearchFilter('custcolcreated_po_for_vendor_internal', null, 'isnotempty', '')];

        var poColumns = [new nlobjSearchColumn("tranid"),
          				new nlobjSearchColumn('custcolcreated_po_for_vendor_internal')];

        var searchResults = nlapiSearchRecord('transaction', null, poFilters, poColumns)

*/

		for (var i=0; searchResults && i < searchResults.length; i++)
		{
//-------------------------------------------------------------------------------------------------------------------------------

                  var rec = nlapiLoadRecord(searchResults[i].getRecordType() , searchResults[i].getId(), {recordmode: 'dynamic'});

          		var upidArray = [];

                  for (var x = 1; x <= rec.getLineItemCount('item'); x += 1)
                  {

					var upid = rec.getLineItemValue('item', 'custcolcreated_po_for_vendor_internal', x)
					upidArray.push(upid);

                  }

				 rec.setFieldValue('custbodycore_created_po_for_vendor', JSON.stringify(upidArray).replace(/[\[\]"]+/g,""));
                 nlapiSubmitRecord(rec);

//-------------------------------------------------------------------------------------------------------------------------------

			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);

			//AFter each record is processed, you check to see if you need to reschedule
			if ((i+1)==1000 || ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 200))
			{
				//reschedule
				log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));

				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
				break;
			}

		}

	}
	catch(procerr)
	{
		log('ERROR','Proccessing Scheduled Script Updates', getErrText(procerr));	
	}

	log('ERROR','Remaining', nlapiGetContext().getRemainingUsage());

}

































function UNDO_PO_Close()
{


   var updateArray = [
  {
    'Internal_Id': '77645882'
  },
  {
    'Internal_Id': '77726052'
  },
  {
    'Internal_Id': '77975097'
  },
  {
    'Internal_Id': '78105230'
  },
  {
    'Internal_Id': '78111501'
  },
  {
    'Internal_Id': '78111517'
  },
  {
    'Internal_Id': '78216138'
  },
  {
    'Internal_Id': '78283274'
  },
  {
    'Internal_Id': '78313240'
  },
  {
    'Internal_Id': '78448167'
  },
  {
    'Internal_Id': '78493224'
  },
  {
    'Internal_Id': '78508211'
  },
  {
    'Internal_Id': '78587553'
  },
  {
    'Internal_Id': '78587571'
  },
  {
    'Internal_Id': '78602920'
  },
  {
    'Internal_Id': '78602926'
  },
  {
    'Internal_Id': '78640000'
  },
  {
    'Internal_Id': '78642435'
  },
  {
    'Internal_Id': '78654791'
  },
  {
    'Internal_Id': '78654791'
  },
  {
    'Internal_Id': '78654800'
  },
  {
    'Internal_Id': '78688589'
  },
  {
    'Internal_Id': '78744595'
  },
  {
    'Internal_Id': '78764776'
  },
  {
    'Internal_Id': '78768041'
  },
  {
    'Internal_Id': '78774628'
  },
  {
    'Internal_Id': '78802317'
  },
  {
    'Internal_Id': '78809496'
  },
  {
    'Internal_Id': '78810966'
  },
  {
    'Internal_Id': '78846646'
  },
  {
    'Internal_Id': '78870133'
  },
  {
    'Internal_Id': '78879789'
  },
  {
    'Internal_Id': '78891750'
  },
  {
    'Internal_Id': '78891752'
  },
  {
    'Internal_Id': '78906318'
  },
  {
    'Internal_Id': '78920765'
  },
  {
    'Internal_Id': '78922991'
  },
  {
    'Internal_Id': '78938179'
  },
  {
    'Internal_Id': '78943014'
  },
  {
    'Internal_Id': '78970793'
  },
  {
    'Internal_Id': '78999308'
  },
  {
    'Internal_Id': '79068661'
  },
  {
    'Internal_Id': '79070014'
  },
  {
    'Internal_Id': '79107083'
  },
  {
    'Internal_Id': '79141474'
  },
  {
    'Internal_Id': '79178778'
  },
  {
    'Internal_Id': '79186345'
  },
  {
    'Internal_Id': '79193924'
  },
  {
    'Internal_Id': '79423776'
  },
  {
    'Internal_Id': '79654354'
  },
  {
    'Internal_Id': '79680568'
  },
  {
    'Internal_Id': '79813711'
  },
  {
    'Internal_Id': '80217885'
  },
  {
    'Internal_Id': '80307613'
  },
  {
    'Internal_Id': '80310674'
  },
  {
    'Internal_Id': '80369127'
  },
  {
    'Internal_Id': '80646992'
  },
  {
    'Internal_Id': '80648686'
  },
  {
    'Internal_Id': '80937235'
  },
  {
    'Internal_Id': '80980362'
  },
  {
    'Internal_Id': '81446517'
  },
  {
    'Internal_Id': '81450986'
  },
  {
    'Internal_Id': '81654104'
  },
  {
    'Internal_Id': '81677322'
  },
  {
    'Internal_Id': '81677555'
  },
  {
    'Internal_Id': '81691410'
  },
  {
    'Internal_Id': '81745367'
  },
  {
    'Internal_Id': '81933907'
  }
];

         for (var obj=0; obj < updateArray.length; obj++)
        {
 			var poRec = nlapiLoadRecord('purchaseorder' , updateArray[obj].Internal_Id, {recordmode: 'dynamic'}); 

          	for(var j = 1; j <= poRec.getLineItemCount('item'); j++)
  			{
                poRec.setLineItemValue('item', 'isclosed', j, 'F');
            }
        	nlapiSubmitRecord(poRec,true,true);
        }

/*

//-------------------------------------------UPDATE ITEM RECORD--------------------------------------------------------

        for (var obj=0; obj < updateArray.length; obj++)
        {
            var flt = [new nlobjSearchFilter('folder', null, 'anyof', '20511081'),
            new nlobjSearchFilter('filetype', null, 'anyof', 'PDF'),
            new nlobjSearchFilter('name', null, 'contains', updateArray[obj].file_name )];
            var col = [new nlobjSearchColumn('internalid').setSort()];
            var searchResults = nlapiSearchRecord('file', null, flt, col);

            var fileId = searchResults [0].getValue(col[0]);

            var itmflt = [new nlobjSearchFilter('itemid', null, 'is', updateArray[obj].file_name )];
            var itmcol = [new nlobjSearchColumn('internalid')]; 

            var itemResults = nlapiSearchRecord('item', null, itmflt, itmcol);

            var itemId = itemResults [0].getValue(itmcol[0]);

            var itmRec = nlapiLoadRecord(itemResults[0].getRecordType(), itemId );

            itmRec .setFieldValue('custitem_es_photo', fileId );
            nlapiSubmitRecord(itmRec , true, true);

			var pctCompleted = Math.round(((obj+1) / updateArray.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);

			log('ERROR','Remaining', nlapiGetContext().getRemainingUsage());

        }


//-------------------------------------------DELETE DUPLICATES--------------------------------------------------------

    	for (var obj=0; obj < updateArray.length; obj++)
        {
            var flt = [new nlobjSearchFilter('folder', null, 'anyof', '20511081'),
                       new nlobjSearchFilter('filetype', null, 'anyof', 'PDF'),
                       new nlobjSearchFilter('name', null, 'contains', updateArray[obj].file_name)];

            var col = [new nlobjSearchColumn('internalid').setSort(),
                       new nlobjSearchColumn('created')];

            var searchResults = nlapiSearchRecord('file', null, flt, col);

            if(searchResults)
            {
                  var arFiles = [];

                  for (var i=0; i < searchResults.length; i++)
                  {
                    var fileObj =
                        {
                          'file_created':searchResults [i].getValue(col[1]),
                          'file_id':searchResults [i].getValue(col[0])
                        };
                    arFiles.push(fileObj);

                  }

                  arFiles.sort();

                  nlapiDeleteFile(arFiles[0].file_id);
           }

          	var pctCompleted = Math.round(((obj+1) / updateArray.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);

            log('ERROR','Remaining', nlapiGetContext().getRemainingUsage());
      }
*/

}






















function itemUpdates()
{


	try
	{
/*
		var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct194_lastprocid');

		log('ERROR','Last Processed', paramLastProcId) ;

		//Search result will be ordered either in ASC or DESC of internal ID

		var flt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
           		   new nlobjSearchFilter('type', null, 'anyof', ['InvtPart', 'NonInvtPart'])];

		if (paramLastProcId)
		{
			flt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
		}

        var col = [new nlobjSearchColumn('internalid').setSort()]; // Sort in Ascending Order
		var searchResults = nlapiSearchRecord('item', null, flt, col);
*/

		var searchResults = nlapiSearchRecord(null, 'customsearch1888');  	//GL = customsearch1425		PROMO = customsearch1888

		for (var i=0; searchResults && i < searchResults.length; i++)
		{
//-------------------------------------------------------------------------------------------------------------------------------

                  var itmRec = nlapiLoadRecord(searchResults[i].getRecordType() , searchResults[i].getId(), {recordmode: 'dynamic'});

                  //itmRec.setFieldValue('custitem_ps_expenseaccount', '3355');

                  var cost = itmRec.getFieldValue('custitem_ps_promocost'); //custitem_ps_promocost

                  for (var x = 1; x <= itmRec.getLineItemCount('itemvendor'); x += 1)
                  {

                      if (itmRec.getLineItemValue('itemvendor', 'preferredvendor', x) == 'T')
                      {
                        itmRec.selectLineItem('itemvendor', x);

                        var subRec = itmRec.editCurrentLineItemSubrecord('itemvendor', 'itemvendorprice');
                        subRec.selectLineItem('itemvendorpricelines', 1);
                        subRec.setCurrentLineItemValue('itemvendorpricelines', 'vendorprice', cost);
                        subRec.commitLineItem('itemvendorpricelines');
                        subRec.commit();

                        itmRec.commitLineItem('itemvendor');
                      }

                  }

                 nlapiSubmitRecord(itmRec);

//-------------------------------------------------------------------------------------------------------------------------------

			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);

			//AFter each record is processed, you check to see if you need to reschedule
			if ((i+1)==1000 || ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 200))
			{
				//reschedule
				log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));

              	var rparam = {'custscript_sct194_lastprocid':searchResults[i].getValue('internalid')};

				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}

		}

	}
	catch(procerr)
	{
		log('ERROR','Proccessing Scheduled Script Updates', getErrText(procerr));	
	}

	log('ERROR','Remaining', nlapiGetContext().getRemainingUsage());

}








function addPromoCost()
{

	try
	{
		var formulaTextCheck = new nlobjSearchFilter('formulatext', null,'is','1');
      		formulaTextCheck.setFormula('CASE WHEN {custitem_ps_promocost} != {vendorcost} THEN 1 ELSE 0 END');

		var itmFilters = [new nlobjSearchFilter('custitemps_promocoststart', null, 'on', 'today'),
                         new nlobjSearchFilter('ispreferredvendor', null, 'is', 'T')];
                         //formulaTextCheck];

		var itmColumns = [new nlobjSearchColumn('internalid').setSort(true),
                          new nlobjSearchColumn('type'),
                          new nlobjSearchColumn('custitem_ps_promocost')];

		var searchResults = nlapiSearchRecord('item', null, itmFilters, itmColumns);


		for (var i=0; searchResults && i < searchResults.length; i++)
		{

		  var itmRec = nlapiLoadRecord(searchResults[i].getRecordType() , searchResults[i].getId(), {recordmode: 'dynamic'});

		  var cost = searchResults[i].getValue('custitem_ps_promocost');

		  for (var x = 1; x <= itmRec.getLineItemCount('itemvendor'); x += 1)
		  {

			  if (itmRec.getLineItemValue('itemvendor', 'preferredvendor', x) == 'T')
			  {
				itmRec.selectLineItem('itemvendor', x);

				var subRec = itmRec.editCurrentLineItemSubrecord('itemvendor', 'itemvendorprice');
				subRec.selectLineItem('itemvendorpricelines', 1);
				subRec.setCurrentLineItemValue('itemvendorpricelines', 'vendorprice', cost);
				subRec.commitLineItem('itemvendorpricelines');
				subRec.commit();

				itmRec.commitLineItem('itemvendor');
			  }

		  }

		 nlapiSubmitRecord(itmRec);

		}


	}
	catch(updteErr)
	{
	log('ERROR','Error ADDING Promo Cost on Item: '+itmRec.getFieldValue('itemid') , getErrText(updteErr));	
	}


}




function removePromoCost()
{

	try
	{
		var formulaTextCheck = new nlobjSearchFilter('formulatext', null,'is','1');
      		formulaTextCheck.setFormula('CASE WHEN {cost} != {vendorcost} THEN 1 ELSE 0 END');

		var itmFilters = [new nlobjSearchFilter('custitemps_promocostend', null, 'onorbefore', 'today'),
                         new nlobjSearchFilter('ispreferredvendor', null, 'is', 'T'),
                         formulaTextCheck];

		var itmColumns = [new nlobjSearchColumn('internalid').setSort(true),
                          new nlobjSearchColumn('type'),
                          new nlobjSearchColumn('cost')]

		var searchResults = nlapiSearchRecord('item', null, itmFilters, itmColumns);

		for (var i=0; searchResults && i < searchResults.length; i++)
		{
		  var itmRec = nlapiLoadRecord(searchResults[i].getRecordType() , searchResults[i].getId(), {recordmode: 'dynamic'});

		  var oldCost = searchResults[i].getValue('custitem_ps_promocost');

		  for (var x = 1; x <= itmRec.getLineItemCount('itemvendor'); x += 1)
		  {

			  if (itmRec.getLineItemValue('itemvendor', 'preferredvendor', x) == 'T')
			  {
				itmRec.selectLineItem('itemvendor', x);

				var subRec = itmRec.editCurrentLineItemSubrecord('itemvendor', 'itemvendorprice');
				subRec.selectLineItem('itemvendorpricelines', 1);
				subRec.setCurrentLineItemValue('itemvendorpricelines', 'vendorprice', oldCost);
				subRec.commitLineItem('itemvendorpricelines');
				subRec.commit();

				itmRec.commitLineItem('itemvendor');
			  }

		  }

		 nlapiSubmitRecord(itmRec);

		}

	}
	catch(updteErr)
	{
	log('ERROR','Error REMOVING Promo Cost on Item: '+itmRec.getFieldValue('itemid') , getErrText(updteErr));	
	}


}
































function CopyItems_And_Inactivate_Old_Ones()
{

//var oldRec = '';


   var updateArray = [
  {
    'internal_id': '99855'
  },
  {
    'internal_id': '99856'
  },
  {
    'internal_id': '99857'
  },
  {
    'internal_id': '104278'
  },
  {
    'internal_id': '104280'
  },
  {
    'internal_id': '104281'
  },
  {
    'internal_id': '104282'
  },
  {
    'internal_id': '104284'
  },
  {
    'internal_id': '104285'
  },
  {
    'internal_id': '104292'
  },
  {
    'internal_id': '104294'
  },
  {
    'internal_id': '104307'
  }
];






var newItemName = '167913';

        for (var obj=0; obj < updateArray.length; obj++)
        {

            var oldRec = nlapiLoadRecord('inventoryitem' , updateArray[obj].internal_id, {recordmode:'dynamic'});
/*
            var itemId = oldRec.getFieldValue('itemid');
            var oldUPC = oldRec.getFieldValue('upccode');

            oldRec.setFieldValue('upccode', oldRec.getFieldValue('upccode')+'_inactive');
            nlapiSubmitRecord(oldRec, true, true);
*/

            var newRec = nlapiCopyRecord('inventoryitem', updateArray[obj].internal_id,{recordmode:'dynamic'});
            newRec.setFieldValue('itemid',  parseFloat(newItemName).toFixed(0) );
            newRec.setFieldValue('custitem_ps_copy_of_item', updateArray[obj].internal_id);
            newRec.setFieldValue('upccode', '');
            newRec.setFieldValue('displayname', oldRec.getFieldValue('displayname'));
            newRec.setFieldValue('purchasedescription', oldRec.getFieldValue('purchasedescription'));
            newRec.setFieldValue('custitem_es_short_label_description', oldRec.getFieldValue('custitem_es_short_label_description'));


/*          newRec.setFieldValue('billpricevarianceacct', '3332'); 		//3332 	590400 	Intercompany Bill Price Variance
            newRec.setFieldValue('billqtyvarianceacct', '3333'); 		//3333 	590500 	Intercompany Bill Quantity Variance
            newRec.setFieldValue('custreturnvarianceaccount', '3334'); 	//3334 	590600 	Intercompany Returns
            newRec.setFieldValue('vendreturnvarianceaccount', '3335');	//3335 	590700 	Intercompany Vendor Return Variance
            newRec.setFieldValue('purchasepricevarianceacct', '3336');	//3336 	590800 	Intercompany Purchase Price Variance
*/


            var newId = nlapiSubmitRecord(newRec, true, true);




/*          oldRec = nlapiLoadRecord(oldType, oldId, {recordmode:'dynamic'});
            oldRec.setFieldValue('isinactive', 'T');
            oldRec.setFieldValue('custitem_ps_copy_of_item', newId);
            nlapiSubmitRecord(oldRec, true, true);

*/
			newItemName++;
          	log('ERROR','Internal ID', updateArray[obj].internal_id );
        }



}







function Sync_Billed_SO___PendingReceipt_PO()
{

		//The SO is in BILLED Status while  PO is in a PENDING RECEIPT Status

		//var rec = nlapiLoadRecord(recType , recId, {recordmode:'dynamic'});
  	var rec = nlapiLoadRecord('salesorder' , id, {recordmode:'dynamic'});

  	var poToIr = nlapiTransformRecord('purchaseorder', rec.getFieldValue('intercotransaction'), 'itemreceipt');

  	poToIr.setFieldValue('trandate', paramDate);
  	var poToIrId = nlapiSubmitRecord(poToIr);

  	var POstatus = nlapiLookupField('purchaseorder', rec.getFieldValue('intercotransaction'), 'status', true);

  	rec.setFieldValue('custbody_ps_pairedintercompanystatus', POstatus );
	rec.setFieldValue('custbody2', 'T' );  //TRX PROCESSED Field

  	nlapiSubmitRecord(rec, true, true);


    //---------------------------Transform Transfer Order to Receipt-----------------------------------


    var trnfToIr = nlapiTransformRecord('transferorder', recId,  'itemreceipt');

    trnfToIr.setFieldValue('trandate', rec.getFieldValue('trandate'));
    nlapiSubmitRecord(trnfToIr)

    //---------------------------Transform Transfer Order to Receipt-----------------------------------

  	var rec = nlapiLoadRecord('salesorder' , recId, {recordmode:'dynamic'});

  	var POstatus = nlapiLookupField('purchaseorder', rec.getFieldValue('intercotransaction'), 'status', true);

  	rec.setFieldValue('custbody_ps_pairedintercompanystatus', POstatus );
	rec.setFieldValue('custbody2', 'T' ); //[PS]TRX PROCESSED Field

  	nlapiSubmitRecord(rec, true, true);

}









function ArrayForPartiallyFulfilledPOs()
{


var recId = '73385021';
var rec = '';

rec = nlapiLoadRecord('purchaseorder' , recId, {recordmode:'dynamic'});

var soTrx = nlapiLoadRecord('salesorder', rec.getFieldValue('intercotransaction'));   


var iflFilters = [new nlobjSearchFilter('createdfrom', null, 'anyof', soTrx.getFieldValue('id')),
                  new nlobjSearchFilter('mainline', null, 'is', 'T')];
var iflColumns= [new nlobjSearchColumn('internalid')];

var itmFulSearch = nlapiSearchRecord ('itemfulfillment', null, iflFilters, iflColumns);

var iflRec = nlapiLoadRecord('itemfulfillment', itmFulSearch[0].getValue(iflColumns[0]));

var arItems = [];
var itmObject = {};

  for(var j = 1; j <= iflRec.getLineItemCount('item'); j++)
  {
    itmObject[iflRec.getLineItemValue('item','item', j)] =
        {
          'obj_quantity':iflRec.getLineItemValue('item','quantity', j)
        };
    arItems.push( arItems.push(iflRec.getLineItemValue('item','item', j)) );

  }

nlapiLogExecution('error', 'Items', JSON.stringify(arItems))

var poTrnsform = nlapiTransformRecord('purchaseorder', recId, 'itemreceipt');
poTrnsform.setFieldValue('trandate', '8/1/2017');


    for (var k=1; k <= poTrnsform.getLineItemCount('item'); k++)
    {


	if(!itmObject[poTrnsform.getLineItemValue('item','item', k)])
        {
            poTrnsform.setLineItemValue('item', 'itemreceive', k, 'F');
        }


	if(itmObject[poTrnsform.getLineItemValue('item','item', k)])
        {
            poTrnsform.setLineItemValue('item', 'quantity', k, itmObject[poTrnsform.getLineItemValue('item','item', k)]['obj_quantity']);
	}
        //poTrnsform.setLineItemValue('item','quantity', k);
        //nlapiLogExecution('debug', 'line qty', poTrnsform.getLineItemValue('item','quantity', k));

    }


nlapiSubmitRecord(poTrnsform, true, true);





rec = nlapiLoadRecord('purchaseorder' , recId, {recordmode:'dynamic'});

soTrx.setFieldValue('custbody_ps_pairedintercompanystatus', rec.getFieldValue('status') );
soTrx.setFieldValue('custbody2', 'T' ); //TRX PROCESSED  Field
nlapiSubmitRecord(soTrx, true, true);




if(soTrx.getFieldValue('orderstatus') == 'G')//SO Status G = Billed
{

var poTrnsform = nlapiTransformRecord('purchaseorder', recId, 'itemreceipt');
poTrnsform.setFieldValue('trandate', '8/1/2017');
nlapiSubmitRecord(poTrnsform, true, true);

rec = nlapiLoadRecord('purchaseorder' , recId, {recordmode:'dynamic'});

soTrx.setFieldValue('custbody_ps_pairedintercompanystatus', rec.getFieldValue('status') );
soTrx.setFieldValue('custbody2', 'T' ); //TRX PROCESSED  Field
nlapiSubmitRecord(soTrx, true, true);
}

}





function FrankRigaIntercompanyTransferCreation()
{


	var orderNum = '1';

	while (orderNum < 61) 
	{

		var filters = [new nlobjSearchFilter('custrecord_ps_intercotrnfr_ordernum', null, 'equalto', orderNum)];
		var columns = [new nlobjSearchColumn('custrecord_ps_intercotrnfr_ordernum'),
					   new nlobjSearchColumn('custrecord_ps_intercotrnfr_dstnlocation'),
					   new nlobjSearchColumn('custrecord_ps_intercotrnfr_item'),
					   new nlobjSearchColumn('custrecord_ps_intercotrnfr_quantity')];

		var searchResults = nlapiSearchRecord ('customrecord_ps_intercompanytransfers', null, filters , columns );

		var desntn = searchResults[0].getValue(columns[1]);

		var transferRec = nlapiCreateRecord('intercompanytransferorder');

		transferRec.setFieldValue('trandate', '11/9/2017');
		transferRec.setFieldValue('subsidiary', '13');
		transferRec.setFieldValue('location', '49');
		transferRec.setFieldValue('tosubsidiary', '12');
		transferRec.setFieldValue('transferlocation', desntn);
		transferRec.setFieldValue('memo', '***F Riga Xmas Prebook transfer from Warehouse***');

		for ( var i = 0; searchResults != null && i < searchResults.length; i++ )
		{
		  transferRec.selectNewLineItem('item');
		  transferRec.setCurrentLineItemValue('item', 'item', searchResults[i].getValue('custrecord_ps_intercotrnfr_item'));
		  transferRec.setCurrentLineItemValue('item', 'quantity', searchResults[i].getValue('custrecord_ps_intercotrnfr_quantity'));
		  transferRec.commitLineItem('item');

		}

		nlapiSubmitRecord(transferRec, true, true);

		orderNum++;
	}


}













