/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

define(['N/record', 'N/search', 'N/currentRecord'], function(record, search, cr) {

  function clientButton(job) {

     var suiteletURL = 'https://1072652-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=786&deploy=1&project='+job;



    window.open(suiteletURL, "Update Charges", 'width=800,height=600');

  }

  function refresh(){
    var myRecord = cr.get();
    var stage = myRecord.getValue({
      fieldId: 'custpage_stage'
    });
    var use = myRecord.getValue({
      fieldId: 'custpage_use'
    });
    var type = myRecord.getValue({
      fieldId: 'custpage_type'
    });
    var proj = myRecord.getValue({
      fieldId: 'custpage_project'
    });
    
  document.location = "https://1072652-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=786&deploy=1&redirect=T&project="+proj+"&stage="+stage+"&use="+use+"&type="+type
  }

  function pageInit() {



  }



  return {
    clientButton: clientButton,
    refresh:refresh,
    pageInit: pageInit

  }

})
