/**
 * Version    Date            Author           Remarks
 * 1.0		  26 Jun 2019	  Elijah Semalulu
 */
 
function beforeLoad(type, form, request)
{

      if(request.getParameter('transaction'))
      {

            var trxTypeFilters = [new nlobjSearchFilter('internalidnumber', null, 'equalto',  request.getParameter('transaction'))];
            var trxTypeColumns = [new nlobjSearchColumn('type')];
            var trxTypeSrch = nlapiSearchRecord ('transaction', null, trxTypeFilters, trxTypeColumns);

            var trxType = trxTypeSrch[0].getValue(trxTypeColumns[0]);
            nlapiLogExecution('ERROR', 'TRX TYPE', trxType);

            if(trxType == 'CustInvc')
            {

                  nlapiLogExecution('ERROR', 'TRX ID', request.getParameter('transaction'));

                  if(form.getField('updatetemplate'))
                  {
                    if(nlapiGetRecordType() == 'message'  && type == 'create')
                    {
                      form.getField('updatetemplate').setDisplayType('hidden');
                    }

                  }

                  //Find Top Parent Record Search
                  var topPrntFilters = [new nlobjSearchFilter('internalid', null, 'anyof',  request.getParameter('entity'))];
                  var topPrntColumns = [new nlobjSearchColumn('entityid', 'topLevelParent'),
                                        new nlobjSearchColumn('internalid', 'topLevelParent')];
                  var topParentSrch = nlapiSearchRecord ('customer', null, topPrntFilters, topPrntColumns);

                  var topPrntInternalId = topParentSrch[0].getValue(topPrntColumns[1]);
                  nlapiLogExecution('ERROR', 'PARENT: PARENT ID', topParentSrch[0].getValue(topPrntColumns[0]) +':'+topPrntInternalId );

                  var primContctFilters = [new nlobjSearchFilter('custentity_ach_billingcontact', null, 'is', 'T'),
                                           new nlobjSearchFilter('internalid', 'company', 'anyof', topPrntInternalId)];
                  var primContctColumns = [new nlobjSearchColumn('entityid'),
                                           new nlobjSearchColumn('email')];
                  var primContctSrch = nlapiSearchRecord ('contact', null, primContctFilters, primContctColumns);


                  var csRep = nlapiLookupField('transaction', request.getParameter('transaction'), 'custbody1', false)
                  nlapiLogExecution('ERROR', 'CS REP', csRep);

                  if(csRep)
                  {
                    var csEmail = nlapiLookupField('employee', csRep, 'email', false)
                    nlapiLogExecution('ERROR', 'CS Email', csEmail);
                  }


                  if(primContctSrch)
                  {
                  var totalResults = primContctSrch.length
                  nlapiLogExecution('ERROR', 'TOTAL RESULTS', primContctSrch.length);
                  nlapiLogExecution('ERROR', 'EMAIL', primContctSrch[0].getValue(primContctColumns[1]));					

                      if(totalResults > 1)
                      {

                            for (var i = 0; primContctSrch != null && i < primContctSrch.length; i++ )
                            {
                                nlapiSelectNewLineItem('otherrecipientslist'); 
                                nlapiSetCurrentLineItemValue('otherrecipientslist', 'email', primContctSrch[i].getValue(primContctColumns[1]));
                                nlapiSetCurrentLineItemValue('otherrecipientslist', 'cc', 'T');
                                nlapiCommitLineItem('otherrecipientslist');
                            }

                            nlapiLogExecution('ERROR', 'NEXT LINE', totalResults+1);

                            if(csRep)
                            {

                                nlapiSetLineItemValue('otherrecipientslist', 'email', totalResults+1, csEmail);
                                nlapiSetLineItemValue('otherrecipientslist', 'cc', totalResults+1, 'T');

                                nlapiSetLineItemValue('otherrecipientslist', 'email', totalResults+2, 'invoicing.emails@achievers.com');
                                nlapiSetLineItemValue('otherrecipientslist', 'bcc',totalResults+2, 'T');
                            }
                            else
                            {
                              nlapiSetLineItemValue('otherrecipientslist', 'email', totalResults+1, 'invoicing.emails@achievers.com');
                              nlapiSetLineItemValue('otherrecipientslist', 'bcc',totalResults+1, 'T');
                            }



                      }

                      if(totalResults == 1)
                      {
                          //Find out if the customer record has an email associatted to it
                          var entityEmail = nlapiLookupField('customer', request.getParameter('entity'), 'email', false);
                          nlapiLogExecution('ERROR', 'EMAIL', entityEmail);

                          if(!entityEmail)
                          {
                              nlapiSetFieldValue('recipientemail', primContctSrch[0].getValue(primContctColumns[1]));

                              if(csRep)
                              {
                                nlapiSetLineItemValue('otherrecipientslist', 'email', 1, csEmail);
                                nlapiSetLineItemValue('otherrecipientslist', 'cc', 1, 'T');

                                nlapiSetLineItemValue('otherrecipientslist', 'email', 2, 'invoicing.emails@achievers.com');
                                nlapiSetLineItemValue('otherrecipientslist', 'bcc', 2, 'T');
                              }
                              else
                              {
                                nlapiSetLineItemValue('otherrecipientslist', 'email', 1, 'invoicing.emails@achievers.com');
                                nlapiSetLineItemValue('otherrecipientslist', 'bcc', 1, 'T');
                              }
                          }
                          else
                          {

                              nlapiSetLineItemValue('otherrecipientslist', 'email', 1, primContctSrch[0].getValue(primContctColumns[1]));
                              nlapiSetLineItemValue('otherrecipientslist', 'cc', 1, 'T');

                              if(csRep)
                              {
                                nlapiSetLineItemValue('otherrecipientslist', 'email', 2, csEmail);
                                nlapiSetLineItemValue('otherrecipientslist', 'cc', 2, 'T');

                                nlapiSetLineItemValue('otherrecipientslist', 'email', 3, 'invoicing.emails@achievers.com');
                                nlapiSetLineItemValue('otherrecipientslist', 'bcc', 3, 'T');
                              }
                              else
                              {
                                nlapiSetLineItemValue('otherrecipientslist', 'email', 2, 'invoicing.emails@achievers.com');
                                nlapiSetLineItemValue('otherrecipientslist', 'bcc', 2, 'T');
                              }
                          }






                      }

                  }


                  if(!primContctSrch)
                  {
                       if(csRep)
                      {
                        nlapiSetLineItemValue('otherrecipientslist', 'email', 1, csEmail);
                        nlapiSetLineItemValue('otherrecipientslist', 'cc', 1, 'T');

                        nlapiSetLineItemValue('otherrecipientslist', 'email', 2, 'invoicing.emails@achievers.com');
                        nlapiSetLineItemValue('otherrecipientslist', 'bcc', 2, 'T');
                      }
                      else
                      {
                        nlapiSetLineItemValue('otherrecipientslist', 'email', 1, 'invoicing.emails@achievers.com');
                        nlapiSetLineItemValue('otherrecipientslist', 'bcc', 1, 'T');
                      }

                  }


			}


      }




}








/**
 * Version    Date            Author           Remarks
 * 1.0		  23 Jan 2019	  Elijah Semalulu
 */
 
function beforeSubmit(type)
{

     //IMPORTANT -- DO NOT REMOVE -- REQUIRED FOR REVENUE ARRANGMENT CREATION

    if(nlapiGetFieldValue('type') == 'revarrng') 
    {
        for(var j = 1; j <= nlapiGetLineItemCount('revenueelement'); j++)
        {
            if(nlapiGetFieldValue('cseg1'))
            {
              nlapiSetLineItemValue('revenueelement', 'cseg1', j, nlapiGetFieldValue('cseg1') );
            }

            if(nlapiGetFieldValue('cseg2'))
            {
              nlapiSetLineItemValue('revenueelement', 'cseg2', j, nlapiGetFieldValue('cseg2') );
            }

        }
    }

   //IMPORTANT DO NOT REMOVE BECAUSE CELIGO INTEGRATION REQUIRES THIS

  if(type == 'create')
  {

  		if(nlapiGetFieldValue('type') == 'salesord') 
        {
			// Set the correct Subsidiary for all newly created Sales Orders based on the Opportunity Group

              nlapiLogExecution('ERROR', 'ORIGINAL SUB', nlapiGetFieldValue('subsidiary'));

              if(nlapiGetFieldValue('custbody_opportunity_group') == '1' && nlapiGetFieldValue ('subsidiary') != '12' ) //Trinity
              {
                nlapiSetFieldValue('subsidiary', '12'); // Trinity Subsidiary
                nlapiSetFieldValue('location', '8'); // MA  Location

                nlapiSendEmail(nlapiGetUser(), 'esemalulu@netdynamicinc.com', 'OPP GRP: '+ nlapiGetFieldText('custbody_opportunity_group'), 'SUB: '+nlapiGetFieldText('subsidiary') , null , null );
              }

              if(nlapiGetFieldValue('custbody_opportunity_group') == '2' && nlapiGetFieldValue('subsidiary') != '14') //TGaS
              {
                nlapiSetFieldValue('subsidiary', '14'); // TGaS Subsidiary
                nlapiSetFieldValue('location', '12');// PA  Location

                nlapiSendEmail(nlapiGetUser(), 'esemalulu@netdynamicinc.com', 'OPP GRP: '+ nlapiGetFieldText('custbody_opportunity_group'), 'SUB: '+nlapiGetFieldText('subsidiary') , null , null );
              }

          	//Set Line Item Groups at the Line Level

              for(var i = 1; i <= nlapiGetLineItemCount('item'); i++)
              {
                var itemGrp = nlapiLookupField('item', nlapiGetLineItemValue('item','item', i ), 'custitem_nd_itemgroup', false);
                nlapiSetLineItemValue('item','custcol_nd_itemgroup', i, itemGrp);
              }

              if(!nlapiGetFieldValue('department'))
              {
                nlapiSetFieldValue('department', '42'); // 99 Balance Sheet 
              }


              var seg1Filters = [new nlobjSearchFilter('name', null, 'is', nlapiGetFieldValue('custbodyopenair_project_number'))];
              var seg1Columns = [new nlobjSearchColumn('internalid')];
              var sgs1rch = nlapiSearchRecord('customrecord_cseg1', null, seg1Filters, seg1Columns)

              if(!sgs1rch)
              {
                  var newRec = nlapiCreateRecord('customrecord_cseg1')
                  newRec.setFieldValue('name',  nlapiGetFieldValue('custbodyopenair_project_number'));
                  nlapiSubmitRecord(newRec)
              }


        }

  		if(nlapiGetFieldValue('type') == 'revarrng') 
        {
            for(var j = 1; j <= nlapiGetLineItemCount('revenueelement'); j++)
            {
              nlapiSetLineItemValue('revenueelement', 'cseg1', j, nlapiGetFieldValue('cseg1') );
              nlapiSetLineItemValue('revenueelement', 'cseg2', j, nlapiGetFieldValue('cseg2') );
            }
        }

  }



}




/**
 * Version    Date            Author           Remarks
 * 1.0		  5 Feb 2019	  Elijah Semalulu
 */
 
function afterSubmit(type)
{

      var htmlEmail = '<html>'
      + '<head>'
      + '</head>'
      + '<body>'
      + '<table style="background-color: #F1F1F1;"><tr><td>'
      + 'NO MATCHING OPENAIR PROJECT NAME (GL) FOUND'
      + '</td></tr></table>'
      + '</body>'
      + '</html>'


      if(type == 'create')
      {
          var rec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId())

		  if(rec.getFieldValue('type') == 'salesord' || rec.getFieldValue('type') == 'custinvc')
          {
                if(rec.getFieldValue('custbodyopenair_project_number'))
                {
                    var seg1Filters = [new nlobjSearchFilter('name', null, 'is', rec.getFieldValue('custbodyopenair_project_number'))];
                    var seg1Columns = [new nlobjSearchColumn('internalid')];
                    var sgs1rch = nlapiSearchRecord('customrecord_cseg1', null, seg1Filters, seg1Columns)

                    if(sgs1rch != null)
                    {
                      var seg1Id = sgs1rch[0].getValue(seg1Columns[0])

                      rec.setFieldValue('cseg1', seg1Id);
                      //nlapiSubmitRecord(rec, true, true);

                    }
                    else
                    {
                      nlapiSendEmail(nlapiGetUser(), 'esemalulu@netdynamicinc.com', rec.getFieldValue('type')+':'+ rec.getFieldValue('tranid'), htmlEmail , null , null );
                      nlapiLogExecution('error', 'TESTING', rec.getFieldValue('tranid'));
                    }
                }


                if(rec.getFieldValue('custbodyproject_type'))
                {
                    var seg2Filters = [new nlobjSearchFilter('name', null, 'is', rec.getFieldValue('custbodyproject_type'))];
                    var seg2Columns = [new nlobjSearchColumn('internalid')];
                    var sgs2rch = nlapiSearchRecord('customrecord_cseg2', null, seg2Filters, seg2Columns);

                    if(sgs2rch != null)
                    {
                      var seg2Id = sgs2rch[0].getValue(seg2Columns[0])

                      rec.setFieldValue('cseg2', seg2Id);
                      //nlapiSubmitRecord(rec, true, true);

                    }
                    else
                    {
                      nlapiSendEmail(nlapiGetUser(), 'esemalulu@netdynamicinc.com', rec.getFieldValue('type')+':'+ rec.getFieldValue('tranid'), htmlEmail , null , null );
                      nlapiLogExecution('error', 'TESTING', rec.getFieldValue('tranid'));
                    }
                }

				nlapiSubmitRecord(rec, true, true);

          }

      }



}



/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function clientFieldChanged(type, name, linenum){
  

  if(nlapiGetFieldValue('type') == 'salesord' )
  {
      if(type == 'item' && name == 'item')
      {


        if(nlapiGetCurrentLineItemValue('item','item'))
          var itemGroup = nlapiLookupField('item', nlapiGetCurrentLineItemValue('item','item'), 'custitem_nd_itemgroup', false);
        nlapiSetCurrentLineItemValue('item', 'custcol_nd_itemgroup', itemGroup );

      }
  }



  if(nlapiGetFieldValue('type') == 'vendbill' )
  {
    if(type == 'expense' && name == 'custcol_nd_department')
    {

      if(nlapiGetCurrentLineItemValue('expense','custcol_nd_department'))

      nlapiSetCurrentLineItemValue('expense', 'department', nlapiGetCurrentLineItemValue('expense','custcol_nd_department') );

    }
  }


  return true ;

}





/**
 * Client script to support Suitelet 
 */

function generate_trxPDF()
{

  var createPDFURL = nlapiResolveURL('SUITELET', 'customscript_nd_sl_invoicepdf', 'customdeploy_nd_sl_invoicepdf', false);

  createPDFURL += '&id=' + nlapiGetRecordId() +'&type='+ nlapiGetRecordType()+ '&email=F';
  newWindow = window.open(createPDFURL);
}


function email_trxPDF()
{
  var emailPDFURL = nlapiResolveURL('SUITELET', 'customscript_nd_sl_emailcustompdf', 'customdeploy_nd_sl_emailcustompdf', false);

  emailPDFURL += '&id=' + nlapiGetRecordId() +'&type='+ nlapiGetRecordType();
  newWindow = window.open(emailPDFURL, '', 'width=425,height=150');
}





/**
 * Version    Date            Author           Remarks
 * 1.0		  3 Jan 2019	  Elijah Semalulu
 * Primary Suitlet that handles the creation of the PDF 
 */

function invoicePDF(request, response)
{
  
  
  //retrieve the record id passed to the Suitelet
	var recId = request.getParameter('id');
	var recType = request.getParameter('type');

  	var email = request.getParameter('email');

          var obj = {};
          obj["8"] = "Administration Fee";
          obj["1"] = "Benchmark";
          obj["2"] = "Membership";
          obj["7"] = "Out of Pocket Costs";
          obj["5"] = "Professional Fees";
          obj["3"] = "Professional Services Project";
          obj["6"] = "Travel And Incidentals";
          obj["4"] = "Vendor Insights";


         var tranType = '';
        if(recType == 'creditmemo'){ tranType = 'CREDIT MEMO';};
        if(recType == 'invoice'){ tranType = 'INVOICE';};

      	if (request.getMethod() == 'GET')

        var invRec = nlapiLoadRecord(recType , recId);

        var groupArray = [];
        var groupObject = {};

        for(var i = 1; i<= invRec.getLineItemCount('item'); i++)
        {
            groupObject[invRec.getLineItemValue('item', 'custcol_nd_itemgroup', i)] = {
              "obj_family":invRec.getLineItemValue('item', 'custcol_nd_itemgroup', i),
              "obj_amount":invRec.getLineItemValue('item', 'amount', i)
            };

            groupArray.push(groupObject[invRec.getLineItemValue('item', 'custcol_nd_itemgroup', i)]);
        }

      //var entityId = nlapiLookupField('job', createdJobs[c], 'entityid', false);

        log('error', 'Group Array ORIGINAL', JSON.stringify(groupArray));

        var result = [];

        groupArray.forEach(function (a) {
        if (!this[a.obj_family]) {
            this[a.obj_family] = { obj_family: a.obj_family, obj_amount: 0 };
            result.push(this[a.obj_family]);
        }
        this[a.obj_family].obj_amount += parseFloat(a.obj_amount);
        }, Object.create(null));

         log('error', 'Group Array RESULT', JSON.stringify(result)); 

    var trinityLogo = nlapiEscapeXML("https://system.netsuite.com/core/media/media.nl?id=1611&c=1292138_SB1&h=f965d2e3d1290cb9b6d4&whence=");
    var TGaSLogo = nlapiEscapeXML("https://system.na3.netsuite.com/core/media/media.nl?id=5018&c=1292138&h=687f939a6fea21546da8&whence=");

    // build up BFO-compliant XML using well-formed HTML
    var invoicePDf = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";

    invoicePDf += "<pdf>\n<header>";
    invoicePDf += "</header>";
    invoicePDf += "<body size=\"8in 11in\">";
    invoicePDf += "<table width=\"100%\" style=\" font-family: Arial, Helvetica, sans-serif; font-size: 12px; padding-top: -5px; border: 0px solid black;\" >";
    invoicePDf += "<tr>";
    invoicePDf += "<td style=\"border-right: 0px solid black; height: 200px\">";

    //-----------------LOGO AND DATE/INVOCE#
    //


        if(invRec.getFieldValue('subsidiary') == "12")
          {
            invoicePDf += "<table width=\"100%\" style=\"padding-top: 20px; border: 0px solid black;\" >";
            invoicePDf += "<tr>";
            invoicePDf += "<td width=\"25%\" height=\"75px\" style=\"background-image:url("+ trinityLogo +")\"></td>"; 
            invoicePDf += "<td width=\"75%\" align=\"right\" style=\"font-size: 28px;\">"+ tranType +"</td>";
            invoicePDf += "</tr>";
            invoicePDf += "</table>";
          }


        if(invRec.getFieldValue('subsidiary') == "14")
          {
            invoicePDf += "<table width=\"100%\" style=\"padding-top: 20px; border: 0px solid black;\" >";
            invoicePDf += "<tr>";
            invoicePDf += "<td width=\"35%\" height=\"50px\" style=\"background-image:url("+ TGaSLogo +")\"></td>"; 
            invoicePDf += "<td width=\"65%\" align=\"right\" style=\"font-size: 28px;\">"+ tranType +"</td>";
            invoicePDf += "</tr>";
            invoicePDf += "</table>";
          }


        invoicePDf += "<table width=\"100%\" style=\"padding-top: 10px; border: 0px solid black;\" >";
        invoicePDf += "<tr>";

        if(invRec.getFieldValue('subsidiary') == "12")
          {
                invoicePDf += "<td  style=\"line-height: 15pt; font-size: 14px; padding-left: 20px;\" ><b>Trinity Partners, LLC <br />  230 Third Avenue <br />  Waltham, MA 02451 <br />  www.trinitypartners.com <br />  TAX ID: 30-0284706 <br /> invoicing@trinitypartners.com</b></td>";
          }

        if(invRec.getFieldValue('subsidiary') == "14")
          {
                invoicePDf += "<td  style=\"line-height: 15pt; font-size: 14px; padding-left: 20px;\" ><b>TGaS Advisors, LLC<br />301 E. Germantown Pike 4th Floor E. <br />   Norriton, PA 19401 <br /> www.tgas.com <br />  TAX ID: 32-0434635 <br />_TGaS_Invoicing@trinitypartners.com</b></td>";  
          }

          invoicePDf += "<td></td>";

          invoicePDf += "<td width=\"45%\">";
          invoicePDf += "<table width=\"100%\"  style=\"padding-top: -5px; border: 1px solid black;\" >";  
          invoicePDf += "<tr style=\"background-color: #666666; color: white;\">"
          invoicePDf += "<td align=\"center\" >ACCNT #</td>";  
          invoicePDf += "<td align=\"center\" >DATE</td>";
          invoicePDf += "<td align=\"center\" >"+ tranType +" #</td>";

          if(invRec.getFieldValue('terms'))
          {
          	invoicePDf += "<td align=\"center\" >TERMS</td>";
          }
          invoicePDf += "</tr>";

          var entityNo = nlapiLookupField('customer', invRec.getFieldValue('entity') , 'entitynumber', false);

          invoicePDf += "<tr >";
          invoicePDf += "<td align=\"center\" >"+ entityNo +"</td>"; 
          invoicePDf += "<td align=\"center\" >"+ invRec.getFieldValue('trandate')+"</td>"; 
          invoicePDf += "<td align=\"center\" >"+ invRec.getFieldValue('tranid')+"</td>";

        if(invRec.getFieldValue('terms'))
        {
         	invoicePDf += "<td align=\"center\" >"+ invRec.getFieldText('terms')+"</td>";  
        }

        invoicePDf += "</tr>";
        invoicePDf += "</table>";


        invoicePDf += "</td>";
        invoicePDf += "</tr>";
        invoicePDf += "</table>";
        //---------------------------------------------------------------------------------


         //-----------------BILL/SHIP TO SECTION;

        invoicePDf += "<table width=\"100%\" style=\"padding-top: 20px; border: 0px solid black;\" >";
        invoicePDf += "<tr>";
        invoicePDf += "<td style=\"background-color: #666666; color: white;\" >BILL TO</td>";
        invoicePDf += "</tr>";
        invoicePDf += "<tr>";
        invoicePDf += "<td>"+  invRec.getFieldValue('billaddress').replace(/&/g, "&amp;") +"</td>";
        invoicePDf += "</tr>";

        invoicePDf += "</table>";



            if(invRec.getFieldValue('shipaddress'))
            {
              invoicePDf += "<table width=\"100%\" style=\"padding-top: 10px; border: 0px solid black;\" >";
              invoicePDf += "<tr>";
              invoicePDf += "<td style=\"background-color: #666666; color: white;\" >SHIP TO</td>";  
              invoicePDf += "</tr>";
              invoicePDf += "<tr>";
              invoicePDf += "<td>"+  invRec.getFieldValue('shipaddress').replace(/&/g, "&amp;") +"</td>";   
              invoicePDf += "</tr>";
              invoicePDf += "</table>";
           }
        //---------------------------------------------------------------------------------


        //---------------------------------------------------------------------------------TERMS ETC SECTION
        invoicePDf += "<table width=\"100%\" style=\"padding-top: 20px;\" >";
        invoicePDf += "<tr style=\"background-color: #666666; color: white;\">";
        invoicePDf += "<td>PO #</td>";
        invoicePDf += "<td>PROJECT</td>";
        invoicePDf += "<td>SALES ORDER</td>";
        invoicePDf += "<td>CONTRACT #</td>";
        invoicePDf += "<td>DUE DATE</td>";
        invoicePDf += "</tr>";

        invoicePDf += "<tr  style=\"background-color: white; color: black;\">";

            if(invRec.getFieldValue('otherrefnum'))
            {
                invoicePDf += "<td>"+  invRec.getFieldValue('otherrefnum') +"</td>";
            }
            else
            {
              invoicePDf += "<td></td>";
            }


            if(invRec.getFieldValue('custbodyopenair_project_number'))
            {
                invoicePDf += "<td>"+  invRec.getFieldValue('custbodyopenair_project_number') +"</td>";
            }
            else
            {
              invoicePDf += "<td></td>";
            } 


        invoicePDf += "<td>"+  invRec.getFieldText('createdfrom') +"</td>"; 


            if(invRec.getFieldValue('custbodycontract_number'))
            { 
                invoicePDf += "<td>"+  invRec.getFieldValue('custbodycontract_number') +"</td>";
            }
            else
            {
              invoicePDf += "<td></td>";
            } 




            if(invRec.getFieldValue('duedate'))
            {
                invoicePDf += "<td>"+  invRec.getFieldValue('duedate') +"</td>"; ;
            }
            else
            {
              invoicePDf += "<td></td>";
            } 



        invoicePDf += "</tr>";

        invoicePDf += "</table>";
        //---------------------------------------------------------------------------------


         //---------------------------------------------------------------------------------ITEMS ITEMS ITEMS
        invoicePDf += "<table width=\"100%\" style=\"padding-top: 25px; border: 0px solid black;\" >";
        invoicePDf += "<tr style=\"background-color: #666666; color: white;\">";
        invoicePDf += "<td width=\"85%\" >DESCRIPTION</td>";
        invoicePDf += "<td align=\"right\" width=\"15%\" >AMOUNT</td>";
        invoicePDf += "</tr>";

        for(var x = 0; x < result.length; x++) {

        invoicePDf += "<tr>";
        invoicePDf += "<td>";
        invoicePDf += obj[result[x].obj_family];
        invoicePDf += "</td>"; 

        invoicePDf += "<td align=\"right\">";

        if(recType == 'creditmemo')
        {
             invoicePDf +="-"+ formatCurrency(result[x].obj_amount, 2, '.', ',', ',', false ); 
        }
		else
        {
             invoicePDf += formatCurrency(result[x].obj_amount, 2, '.', ',', ',', false );
        }


        invoicePDf += "</td>";
        invoicePDf += "</tr>";  

        }
        invoicePDf += "</table>";
        //-------------------------------------------------------------------------------


         //---------------------------------------------------------------------------------TOTAL SECTION;

        invoicePDf += "<table width=\"100%\" style=\"padding-top: 20px; border: 0px solid black;\" >";
  
        if(invRec.getFieldValue('taxtotal') > 0)
        {
  		invoicePDf += "<tr  style=\" border-bottom: 2px solid white;\">";
        invoicePDf += "<td width=\"72%\"></td>";
        invoicePDf += "<td style=\"background-color: #666666; color: white;\" >Sales Tax</td>"; 

       	invoicePDf += "<td align=\"right\">"+ formatCurrency(invRec.getFieldValue('taxtotal'), 2, '.', ',', ',', false ) +"</td>";

        invoicePDf += "</tr>";
        }

        invoicePDf += "<tr>";
        invoicePDf += "<td width=\"72%\"></td>";
        invoicePDf += "<td style=\"background-color: #666666; color: white;\" >Total</td>"; 
  
  
        if(recType == 'creditmemo')
        {
        	invoicePDf += "<td align=\"right\"> -"+ formatCurrency(invRec.getFieldValue('total'), 2, '.', ',', ',', false ) +"</td>";
        }
  		else
        {
          	invoicePDf += "<td align=\"right\">"+ formatCurrency(invRec.getFieldValue('total'), 2, '.', ',', ',', false ) +"</td>"; 
        }
 
  
  
        invoicePDf += "</tr>";
        invoicePDf += "</table>";


        //--------------------------------------------------------------------------------  


         //-----------------BOTTOM SECTION

            if(invRec.getFieldValue('memo'))
             {
                invoicePDf += "<table width=\"100%\">";
                invoicePDf += "<tr>";
                invoicePDf += "<td><b>COMMENTS</b></td>";
                invoicePDf += "</tr>";
                invoicePDf += "<tr>";
                invoicePDf += "<td>" + invRec.getFieldValue('memo') + "</td>";
                invoicePDf += "</tr>";
                invoicePDf += "</table>";
             }

            if(invRec.getFieldValue('subsidiary') == "12")
             {  
                invoicePDf += "<table width=\"100%\" style=\"padding-top: 10px; \" >"; 
                invoicePDf += "<tr style=\"background-color: #666666; color: white; \">";
                invoicePDf += "<td>REMIT TO</td>";
                invoicePDf += "</tr>";
                invoicePDf += "<tr  style=\"line-height: 20pt; background-color: white; color: black; \">";
                invoicePDf += "<td>";
                invoicePDf += "Check: Trinity Partners 230 Third Avenue Waltham MA 02451 <br />";
                invoicePDf += "Wire/ACH: Account No: 96600703982 ABA/Routing Number: 321081669 SWIFT Code FRBBUS6S <br />";
                invoicePDf += "First Republic Bank 111 Pine St. San Francisco, CA 94111 <br /><br /><br />";
                invoicePDf += "</td>";
                invoicePDf += "</tr>";
                invoicePDf += "</table>";

               invoicePDf += "<table width=\"100%\" style=\"border: 1px solid black; padding-top: 0px;\" >";
               invoicePDf += "<tr>";
               invoicePDf += "<td>";
               invoicePDf += "We appreciate your business!<br />";
               invoicePDf += "Unpaid balances incur a 1% monthly late fee.<br />";
               invoicePDf += "</td>";
               invoicePDf += "</tr>";
               invoicePDf += "</table>"; 
              }


            if(invRec.getFieldValue('subsidiary') == "14")
             { 
                invoicePDf += "<table width=\"100%\" style=\"padding-top: 10px; \" >"; 
                invoicePDf += "<tr style=\"background-color: #666666; color: white; \">";
                invoicePDf += "<td>REMIT TO</td>";
                invoicePDf += "</tr>";
                invoicePDf += "<tr  style=\"line-height: 20pt; background-color: white; color: black; \">";
                invoicePDf += "<td>";
                invoicePDf += "Check: TGaS Advisors  230 Third Avenue Waltham MA 02451<br />";
                invoicePDf += "Wire/ACH: Account # 80007120522 First Republic Bank 111 Pine St. San Francisco, CA 94111  <br />";
                invoicePDf += "ABA/Routing Number: 321081669 SWIFT Code FRBBUS6S <br /><br /><br />";
                invoicePDf += "</td>";
                invoicePDf += "</tr>";
                invoicePDf += "</table>"; 
             }


        //---------------------------------------------------------------------------------


        invoicePDf += "</td></tr>";
        invoicePDf += "</table>";

        invoicePDf += "</body>\n</pdf>";


        var invoiceFile = nlapiXMLToPDF(invoicePDf);


    //--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

        response.setContentType('PDF', invRec.getFieldValue('id')+'.pdf', 'inline');
        response.write(invoiceFile.getValue() );



        var trxPdfFileName = tranType +'_'+ invRec.getFieldValue('tranid') +'.pdf';
        invoiceFile.setFolder('-14');
        invoiceFile.setName(trxPdfFileName);
        var pdfFileId = nlapiSubmitFile(invoiceFile);

        //Need to attach this file to the customer record.
        nlapiAttachRecord('file', pdfFileId, recType, recId);




    log('ERROR','Remaining', nlapiGetContext().getRemainingUsage());


}











/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */


function sendTrxEmail(req, res)
{

	var recId = req.getParameter('id');
	var recType = req.getParameter('type');

    var rec = nlapiLoadRecord(recType , recId);
  
  	var records = new Object();
	records['transaction'] = recId;

    var tranType = '';
  
    if(recType == 'invoice'){ tranType = 'INVOICE';};  
    if(recType == 'creditmemo'){ tranType = 'CREDIT MEMO';};


    var trxPdfFileName = tranType + '_' + rec.getFieldValue('tranid') +'.pdf';

    var fileFilters = [new nlobjSearchFilter('name', null, 'is', trxPdfFileName),
                      new nlobjSearchFilter('folder', null, 'anyof', '-14')];
    var fileColumns = [new nlobjSearchColumn('internalid')];

    var fileSrch = nlapiSearchRecord ('file', null, fileFilters, fileColumns);

    var fileId = fileSrch[0].getValue(fileColumns[0]);

    var sendToEmail = "";

    if (req.getMethod() == "GET") {

        var html = '<html>'
            + '<head>'
            + '</head>'
            + '<body>'
            + '<br/>'
            + '<form method="post">Recipient : <input style="width:300px" type="text"'
            + 'name="emailaddress" id="emailaddress" value=""/>'
            + ' <input type="submit" value="Send Email">'
            + '</form>'
            + '</body>'
            + '</html>'

        res.write(html)
    }
  	else
    {

       sendToEmail = req.getParameter('emailaddress');
      nlapiLogExecution('error', 'Email', sendToEmail )
      var attachment = nlapiLoadFile(fileId);


      	var fromEmail = '';
		var template = '';

		if(rec.getFieldValue('subsidiary') == '12') //12 = Trinity Partners, LLC
		{
            fromEmail = '4182';

            if(recType == 'invoice'){ template = '102'; }

            if(recType == 'creditmemo'){ template = '103'; }

        }

		if(rec.getFieldValue('subsidiary') == '14') //14 = TGaS Advisors, LLC
		{
            fromEmail = '4183';

            if(recType == 'invoice'){ template = '105'; }

            if(recType == 'creditmemo'){ template = '103'; }

        }


		var emailMerger = nlapiCreateEmailMerger(template); 
		emailMerger.setTransaction(recId); // Set the ID of the transaction where you are going to fetch the values to populate the variables on the template
		var mergeResult = emailMerger.merge(); // Merge the template with the email

		var emailSubject = mergeResult.getSubject(); // Get the subject for the email
		var emailBody = mergeResult.getBody(); // Get the body for the email

		nlapiSendEmail(fromEmail, sendToEmail, emailSubject, emailBody, null, null, records, attachment); // Send the email with merged template
      //nlapiSendEmail(author, recipient, subject, body, cc, bcc, records, attachments, notifySenderOnBounce, internalOnly, replyTo)

        res.write('Email Sent Successfuly');
    }




}
