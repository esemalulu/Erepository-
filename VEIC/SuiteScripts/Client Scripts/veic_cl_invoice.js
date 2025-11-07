/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/record', 'N/currentRecord', 'N/url', 'N/ui/message', 'SuiteScripts/Lib/veic_master_lib.js'], function (record, currentRecord, url, mess, lib) {

  function fieldChanged(context) {
    try {
    var invRec = context.currentRecord;
    var project = 'job';

    if (context.fieldId === project) {
      var projectId = invRec.getValue({
        fieldId: 'job'
      });

      if(lib.isNotEmpty(projectId)){
        var projectRec = record.load({
          type: record.Type.JOB,
          id: projectId
        });
        
        //Here we are going to check the Project Manager from the Project record
        var projectManager = projectRec.getValue({
          fieldId: 'projectmanager'
        });

        if(lib.isNotEmpty(projectManager)){
          invRec.setValue({
              fieldId: 'nextapprover',
              value: projectManager
          });
        }else{
          messageBanner('Project Warning', 'The project that you selected does not have a Project Manager', 'warning');
        }

        //Here we are going to check the Invoice Form
        //Need to review the below with Scott
        /*var invoiceForm = projectRec.getValue({
          fieldId: 'custentity_invoice_form'
        });

        if(lib.isNotEmpty(invoiceForm)){
          invRec.setValue({
              fieldId: 'customform',
              value: invoiceForm
          });
        }else{
          messageBanner('Project Warning', 'The project that you selected does not have a Invoice Form', 'warning');
        }*/

      }
      
    }
    
    }catch(ex){
      console.log(ex)
    };

    return true;
  }

  function messageBanner(title, msg, type) {
    var currentType = ''
    if(type == 'error'){
      currentType = mess.Type.ERROR;
    }else if(type == 'warning'){
      currentType = mess.Type.WARNING;
    }

    var myMsg = mess.create({
      title: title,
      message: msg,
      type: currentType
    }).show({
      duration: 500000
    });
  }

  function callPDf(recId){
    //Loading the Invoice record
    var tranRec = record.load({
      type: 'invoice',
      id: recId
    });

    var recId = tranRec.getValue({fieldId: 'id'});
    var recType = tranRec.getValue({fieldId: 'baserecordtype'});

    var projectId = tranRec.getValue({fieldId: 'job'});
    var projectRec = record.load({
      type: 'job',
      id: projectId
    });

    var invoiceFormId = projectRec.getValue({fieldId: 'custentity_invoice_form'});

    if(lib.isNotEmpty(invoiceFormId)){
      var suiteletURL = url.resolveScript({
          scriptId:'customscript_veic_sl_invoice_logic',
          deploymentId: 'customdeploy_veic_sl_invoice_logic',
          params: {
              'recId':recId,
              'recType':recType,
              'invoiceFormId': invoiceFormId
          }
      });

      window.open(suiteletURL, "_blank");
    } else {
      messageBanner('Project Error', 'You cannot print this invoice since the Invoice Form under the Financial tab on the project record is empty, please go to the project record add a template and reload this page.', 'error');   
    }
  }

  function downloadExcel(recId){
    alert('downloadExcel');
  }



  return {
    fieldChanged: fieldChanged,
    callPDf: callPDf,
    downloadExcel: downloadExcel
  };
});