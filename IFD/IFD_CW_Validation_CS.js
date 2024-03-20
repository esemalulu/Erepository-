/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(["N/currentRecord", "N/runtime","N/ui/dialog",'N/log'],

       function(currentRecord, runtime, dialog,log) {

  function save(scriptContext) {

    var stExecutionContext = runtime.executionContext;
    if (stExecutionContext == runtime.ContextType.USER_INTERFACE) {
      var curRecord = scriptContext.currentRecord; 
      var obCurrentRec = currentRecord.get();      
      var rectype = curRecord.type;      
      //log.debug({title: 'rectype', details: rectype  });

      if(rectype == 'itemfulfillment' || rectype == 'itemreceipt' || rectype == 'creditmemo'){
        var count = curRecord.getLineCount({sublistId: 'item'});
        var cwitems = '';
        for(var i=0; i<count; i++) {
          /*curRecord.selectLine({
            sublistId: "item",
            line: i
          });*/
          var isapplied = true;
          if(rectype == 'itemfulfillment' || rectype == 'itemreceipt'){
            isapplied = curRecord.getSublistValue({sublistId: 'item', fieldId: 'itemreceive', line: i});
          }          
          //log.debug('isapplied= ',isapplied + ', i= ' + i);
          var itemtxt = '';
          if(rectype == 'creditmemo'){
            itemtxt = curRecord.getSublistText({sublistId: 'item', fieldId: 'item', line: i}); 
          }
          else{
            itemtxt = curRecord.getSublistValue({sublistId: 'item', fieldId: 'itemname', line: i}); 
          }

          var item = curRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}); 
          //log.debug('itemtxt= ',itemtxt +', item: ' + item + ', i= ' + i);
          var cwvalue = curRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_cw_indicator', line: i});
          if(cwvalue == true && isapplied == true){
            if(rectype == 'creditmemo'){
              var actweight = obCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'custcol_jf_cw_act_wght', line: i});
            }
            else{
              var actweight = obCurrentRec.getSublistValue({sublistId: 'item', fieldId: 'custcol_jf_cw_catch_weight', line: i});
            }
            //log.debug('actweight= ',actweight + ', i= ' + i);
            if(IsEmpty(actweight)){
              //var item = curRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
              cwitems = cwitems  + ' ' +  itemtxt;
            }
            //log.debug('cwvalue= ',cwvalue + ', i= ' + i);
          }

        }//for i
        if(IsNotEmpty(cwitems)){
          if(rectype == 'creditmemo'){
            dialog.alert({
              title: "Actual Weight missing",
              message: "The following items are Catch Weight and require Act Weight before saving <br>" + cwitems +'<br><br>To correct this cancel the credit memo, edit the Item Receipt to add the Act Wght then proceed with creating the Credit Memo.' 
            });
          }else{
            dialog.alert({
              title: "Actual Weight missing",
              message: "The following items are Catch Weight and require Act Weight before saving <br>" + cwitems
            });
          }

          return false;
        }
      }//itemfulfillment and itemreceipt
      return true;
    }
  }   

  function IsEmpty (data) {
    if (typeof(data) == 'number' || typeof(data) == 'boolean') return false;
    if (typeof(data) == 'undefined' || data === null) return true;
    if (typeof(data.length) != 'undefined') return /^[\s]*$/.test(data.toString());
    for (var i in data) {
      if (data.hasOwnProperty(i) && !IsEmpty(data[i])) return false;
    }
    return true;
  }

  function IsNotEmpty (data) {
    return (!IsEmpty(data));
  }

  return {
    saveRecord: save
  };

});
