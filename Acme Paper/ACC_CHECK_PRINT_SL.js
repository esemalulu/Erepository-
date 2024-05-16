/**
* @NApiVersion 2.0
* @NScriptType Suitelet
* @NModuleScope SameAccount
* @Description This script will print long checks
* @author Kapil
*/

define(['N/record', 'N/file', 'N/log', 'N/search', 'N/url', 'N/config', 'N/render', 'N/xml', 'N/format'],

function(record, file, log, search, url, config, render, xml, format) 
{
  function onRequest(context) {
    try {
      var recId = context.request.parameters.id;
      var objRecord = record.load({ type: record.Type.VENDOR_PAYMENT, id: recId, isDynamic: true });
      var total=objRecord.getValue({fieldId:'total'});
      log.debug({title:'total',details:total});
      var custbody_total_in_words=objRecord.getValue({fieldId:'custbody_total_in_words'});
      var address=objRecord.getValue({fieldId:'address'});
      var checknumber=objRecord.getValue({fieldId:'tranid'});
      var dateTran=objRecord.getValue({fieldId:'trandate'});
      
      
      var trandate = format.format({ value: dateTran, type: format.Type.DATE });
      
      var entity=objRecord.getText({fieldId:'entity'});
      var memo=objRecord.getValue({fieldId:'memo'});
      
      address=address.replaceAll('\n','<br/>')
      
      
      total=format.format({ value: total, type: format.Type.CURRENCY });
      
      var arrBillDet= getBillDetails(objRecord);
      var lineCountApply=arrBillDet.length;
      log.debug({title:'lineCountApply',details:lineCountApply});
      var arrBillCredits=getAppliedBillCredits(recId,lineCountApply,objRecord);
      var totalLines=lineCountApply+ arrBillCredits.length;
      log.debug({title:'totalLines',details:totalLines});
      
      var pageSize=9; var totPages=0;var remainder=0;var pageStart=0,pageEnd=0;
      var creditStart=0,creditEnd=0;
      var isSetupFlag=true;
      if(lineCountApply>pageSize)
      {
        totPages = parseInt(totalLines/pageSize);
        remainder=totalLines%pageSize;
        if(remainder>0)
        totPages=totPages+1;
        
        var pageStart=0,pageEnd=pageSize;
      }
      else
      {
        totPages=1;
        pageStart=0;pageEnd=lineCountApply;
      }
      
      // var pageStart=0,pageEnd=pageSize;
      
      //  var strVar = '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">\
      var strVar ='';
      for(var iPage=0;iPage<totPages;iPage++)
      {
        if(iPage!=0){ total='0.00';custbody_total_in_words='ZERO AND 00/100 USD Only';}
        strVar +='<pdf>\
        <head>\
        <style type="text/css">\
        .check table, .voucher1 table, .voucher2 table {\
          position: relative;\
          overflow: hidden;\
          font-size: 8pt;\
          padding: 0;\
        }\
        td p { align:left }\
        </style>\
        </head>\
        <body padding="0.5in 0.5in 0.5in 0.5in" size="Letter">';
		
        
        for(var i=0;i<2;i++)
        {
          if(i==0)  strVar+='<div style="position: relative;font-family: Helvetica,sans-serif;top:40pt;height: 230pt;width: 612pt;page-break-before: avoid;font-size: 8pt;">';
          else  strVar+='<div style="position: relative;font-family: Helvetica,sans-serif;height: 250pt;top:40pt;width: 612pt;page-break-before: avoid;font-size: 8pt;">';
          strVar+='<table style="position: absolute;overflow: hidden;left: 489pt;top: -16pt;height: 7pt;width: 40pt;font-size: 5pt;"><tr>\
          <td align="center" style="font-size:10pt;">'+checknumber+'</td>\
          </tr></table>\
          <table style="position: absolute;overflow: hidden;left: 412pt;top: -2pt;height: 13pt;width: 70pt;"><tr>\
          <td>'+trandate+'</td>\
          </tr></table>\
          <table style="position: absolute;overflow: hidden;left: 36pt;top: -2pt;height: 13pt;width: 250pt;"><tr>\
          <td>'+entity+'</td>\
          </tr></table>';
          
          strVar+='<table style="position: absolute;overflow: hidden;left: 36pt;top: 30pt;width: 436pt;">\
          <tr>\
          <td style="border-left:1px solid black;border-top:1px solid black;border-bottom:1px solid black;padding:5px;">\
          <p align="left">Invoice Number</p>\
          </td>\
          <td style="border-left:1px solid black;border-top:1px solid black;border-bottom:1px solid black; padding:5px;">\
          <p align="center">Invoice Date</p>\
          </td>\
          <td style="border-left:1px solid black;border-top:1px solid black;border-bottom:1px solid black;" width="180px">\
          <p align="center" style="padding:5px;">Description</p>\
          </td>\
          <td style="border-left:1px solid black;border-top:1px solid black;border-bottom:1px solid black;">\
          <p align="center" style="padding:5px;">Invoice Amount</p>\
          </td>\
          <td style="border-left:1px solid black;border-top:1px solid black;border-bottom:1px solid black;">\
          <p align="center" style="padding:5px;">Discount</p>\
          </td>\
          <td align="center" style="border-left:1px solid black;border-top:1px solid black;border-bottom:1px solid black;border-bottom:1px solid black;border-right:1px solid black;padding:5px;">\
          <p>Amount</p>\
          </td>\
          </tr>';
          
          for(var iApply=pageStart;iApply<pageEnd;iApply++)
          {
            
            var type=arrBillDet[iApply].type;
            log.debug({title:'type',details:type});
            var refnum=arrBillDet[iApply].refnum;
            var applydate=arrBillDet[iApply].applydate;
            
            var amount=arrBillDet[iApply].amount;
             var total=arrBillDet[iApply].total;
            
            //  var memo=objRecord.getSublistValue({sublistId:'apply',fieldId:'memo',line:iApply});
            
            var discount=arrBillDet[iApply].discount;
           
            
            var totalamount=0;
            if(discount)
            totalamount=parseFloat(total)+parseFloat(discount);
            else  totalamount=parseFloat(total);
            log.debug({title:'totalamount',details:totalamount});
            amount=format.format({ value: amount, type: format.Type.CURRENCY });
            totalamount=format.format({ value: totalamount, type: format.Type.CURRENCY });
            log.debug({title:'totalamount1',details:totalamount});
             var discountValue='';
            if(discount) discountValue='$'+format.format({ value: discount, type: format.Type.CURRENCY });
            strVar+='<tr>\
            <td style="border-left:1px solid black;border-bottom:1px solid black;">'+type+' #'+refnum+'</td>\
            <td align="center" style="border-left:1px solid black;border-bottom:1px solid black;">'+applydate+'</td>\
            <td style="border-left:1px solid black;border-bottom:1px solid black;" width="180px"> #'+refnum+'</td>\
            <td align="right" style="border-left:1px solid black;border-bottom:1px solid black;">$'+totalamount+'</td>\
            <td align="right" style="border-left:1px solid black;border-bottom:1px solid black;">'+discountValue+'</td>\
            <td align="right" style="border-left:1px solid black;border-right:1px solid black;border-bottom:1px solid black;">$'+amount+'</td>\
            </tr>';
            
          }
          
          if(pageEnd==lineCountApply)
          {
            //NOTE:: number of rows on the last page
            
            if(isSetupFlag)
            {
              var noOfLinesOnPage=pageEnd-pageStart;
              var noOfLinesCanBeAdded=pageSize-noOfLinesOnPage;
              var noOfBillCredits=arrBillCredits.length;
              if(noOfLinesCanBeAdded>=noOfBillCredits)
              creditEnd=noOfBillCredits
              else  creditEnd= noOfLinesCanBeAdded
            }
            
            for(var iCredit=creditStart;iCredit<creditEnd;iCredit++)
            {
              strVar+='<tr>\
              <td style="border-left:1px solid black;border-bottom:1px solid black;">'+arrBillCredits[iCredit].type+' #'+arrBillCredits[iCredit].tranid+'</td>\
              <td align="center" style="border-left:1px solid black;border-bottom:1px solid black;">'+format.format({ value: arrBillCredits[iCredit].trandate, type: format.Type.DATE })+'</td>\
              <td style="border-left:1px solid black;border-bottom:1px solid black;" width="180px">#'+arrBillCredits[iCredit].tranid+'</td>\
              <td align="right" style="border-left:1px solid black;border-bottom:1px solid black;">'+arrBillCredits[iCredit].appliedtotranid+'</td>\
              <td align="right" style="border-left:1px solid black;border-right:1px solid black;border-bottom:1px solid black;">$'+arrBillCredits[iCredit].amount+'</td>\
              </tr>';
              
            }
            isSetupFlag=false;
          }
          
          strVar+='</table></div>';
        }
		//End of fool loop
		
        if(lineCountApply>pageSize)
        {
          pageStart=pageEnd;
          var diff=lineCountApply-pageEnd
          if(diff>=pageSize)
          pageEnd=pageStart+pageSize;
          else pageEnd=pageStart+diff;
        }
        else {
          pageStart=pageEnd;
        }
        
        if(arrBillCredits.length>pageSize)
        {
          creditStart=creditEnd;
          var diff=arrBillCredits.length-creditEnd;
          if(diff>=pageSize)
          creditEnd=creditStart+pageSize;
          else creditEnd=creditStart+diff;
        }
        else {
          creditStart=creditEnd;
        }
       
        //strVar+='</body></pdf>';
		
		strVar +='<div style="position: relative;font-family: Helvetica,sans-serif;top: -11pt;height: 230pt;width: 612pt;page-break-inside: avoid;font-size: 8pt;">\
        <table style="position: absolute;overflow: hidden;left: 489pt;top: 8pt;height: 7pt;width: 85pt;font-size: 5pt;"><tr>\
        <td align="center" style="font-size:10pt;">'+checknumber+'</td>\
        </tr></table>\
        \
        <table style="position: absolute;overflow: hidden;left: 466pt;top: 60pt;height: 18pt;width: 108pt;"><tr>\
        <td>'+trandate+'</td>\
        </tr></table>\
        <!--<table style="position: absolute;overflow: hidden;left: 50pt;top: 120pt;height: 18pt;width: 393pt;"><tr>\
        <td>'+entity+'</td>\
        </tr></table>-->\
        \
        <table style="position: absolute;overflow: hidden;left: 463pt;top: 100pt;height: 18pt;width: 111pt;"><tr>\
        <td>**$'+total+'</td>\
        </tr></table>\
        \
        <table style="position: absolute;overflow: hidden;left: 50pt;top: 100pt;height: 18pt;width: 572pt;"><tr>\
        <td>'+custbody_total_in_words+'*********************</td>\
        </tr></table>\
        \
        <table style="position: absolute;overflow: hidden;left: 37pt;top: 130pt;height: 80pt;width: 537pt;"><tr>\
        <td>'+address+'</td>\
        </tr></table>\
        </div>';
		 strVar+='</body></pdf>';
		
      }
	  //End of Pagination loop
      
      var xmlPdf = '<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
      xmlPdf+='<pdfset>\n';
      xmlPdf+=strVar;
      xmlPdf+='</pdfset>';
      context.response.renderPdf({ xmlString: xmlPdf });
    } catch (err) {
      log.debug({ title: 'onRequest', details: err });
    }
  }
  function getBillDetails(objRecord)
  {
    var arrBillDet=[];
    var numLines=objRecord.getLineCount({sublistId:'apply'});
    for(var iApply=0;iApply<numLines;iApply++)
    {
      var apply=objRecord.getSublistValue({sublistId:'apply',fieldId:'apply',line:iApply});
      if(apply==true)
      {
        var type=objRecord.getSublistValue({sublistId:'apply',fieldId:'type',line:iApply});
        var refnum=objRecord.getSublistValue({sublistId:'apply',fieldId:'refnum',line:iApply});
        var applydate=objRecord.getSublistValue({sublistId:'apply',fieldId:'applydate',line:iApply});
        applydate = format.format({ value: applydate, type: format.Type.DATE });
        var amount=objRecord.getSublistValue({sublistId:'apply',fieldId:'amount',line:iApply});
         var total=objRecord.getSublistValue({sublistId:'apply',fieldId:'total',line:iApply});
         var discount=objRecord.getSublistValue({sublistId:'apply',fieldId:'CUSTBODY_BILL_DISCOUNT_AMOUNT',line:iApply});
		//discount=objRecord.getSublistValue({sublistId:'apply',fieldId:'discamt',line:iApply});
		if(discount==null || discount=='')
		{
			var discount=objRecord.getSublistValue({sublistId:'apply',fieldId:'disc',line:iApply});
		}
        
        arrBillDet.push({ type:type, refnum:refnum, applydate:applydate, amount:amount, discount:discount,total:total });
      }
    }
    return arrBillDet;
  }
  function getAppliedBillCredits(recordId,numOfBills,objRecord)
  {
    //NOTE:: Get Bill Ids for all attached bills
    var arrBillIds=[];
    for(var i=0;i<numOfBills;i++)
    {
      var billId=objRecord.getSublistValue({sublistId:'apply',fieldId:'internalid',line:i});
      arrBillIds.push(billId);
    }
    //NOTE:: Get Bill Credits out of bills
    var vendorcreditSearchObj = search.create({
      type: "vendorcredit",
      filters:
      [
        ["type","anyof","VendCred"],
        "AND",
        ["appliedtotransaction","anyof",arrBillIds]
      ],
      columns:
      [
        search.createColumn({name: "trandate", label: "Date"}),
        search.createColumn({name: "type", label: "Type"}),
        search.createColumn({name: "tranid", label: "Document Number"}),
        search.createColumn({name: "amount", label: "Amount"}),
        search.createColumn({name: "appliedtotransaction", label: "Applied To Transaction"})
      ]
    });
    var searchResultCount = vendorcreditSearchObj.runPaged().count;
    var tranid,type,amount,trandate,appliedtotranid;
    var arrBillCreditDet=[];
    log.debug("vendorcreditSearchObj result count",searchResultCount);
    vendorcreditSearchObj.run().each(function(result){
      // .run().each has a limit of 4,000 results
      tranid=result.getValue({name: 'tranid'});
      type=result.getValue({name: 'type'});
      trandate=result.getValue({name: 'trandate'});
      amount=result.getValue({name: 'amount'});
      appliedtotranid=result.getText({name: 'appliedtotransaction'});
      arrBillCreditDet.push({ tranid:tranid, type:type, trandate:trandate, amount:amount,appliedtotranid:appliedtotranid });
      return true;
    });
    
    return arrBillCreditDet;
  }
  
  String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
  };
  return {
    onRequest: onRequest
  };
});
