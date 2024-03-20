var emailtemplate = '16';
var emailauthor = 40538; //accounts receivable
var location = 1;
var invoiceitem = 52333;
var invoiceform = 187;

function process(){	

  //var contactlist = [];
  var activeleases = [];

  nlapiLogExecution('DEBUG', 'Process starting...' );
  var searchresults = getSearchResults('customsearch_ifd_active_cb_lease_billing','customrecord_ifd_chem_bev_leases',null,null);
  if(searchresults){
    for (var k = 0; k < searchresults.length; k++) {
      checkGovernance();
      var data = {};
      var searchresult = searchresults[k]; 
      var leasestatus = searchresult.getValue('custrecord_ifd_lease_status',null,null);
      var leasecustomer = searchresult.getValue('custrecord_ifd_lease_customer',null,null);
      var leaseitem = searchresult.getValue('custrecord_ifd_lease_item',null,null);
      var leaserate = searchresult.getValue('custrecord_ifd_lease_monthly_rate',null,null);      
      var leaseenddate = searchresult.getValue('custrecord_ifd_lease_end_date',null,null);
      //nlapiLogExecution('DEBUG', 'customer:', customerid + ' ,item: ' + item +', itemtxt: '+ itemtxt );
      data.leasestatus = leasestatus;
      data.leasecustomer = leasecustomer;
      data.leaseitem = leaseitem;
      data.leaserate = leaserate;
      data.leaseenddate = leaseenddate;
      activeleases.push(data);
    }//for k
  }//searchresults

  nlapiLogExecution('DEBUG', 'activeleases Len: ' , activeleases.length);
  //filter unique customers
  var customerlist = [];
  for (var j = 0; j < activeleases.length; j++){
    checkGovernance();
    var customerid = activeleases[j].leasecustomer;
    //nlapiLogExecution('DEBUG', 'customerid: ' , customerid);
    if(j==0){
      var data = {};
      data.leasecustomer = customerid;
      customerlist.push(data);
    }
    else{
      var customerexists = checkcustomerexists(customerid, customerlist);
      if(customerexists == false){
        var data = {};
        data.leasecustomer = customerid;
        customerlist.push(data);
      }
    }
  }//for j loop thru customer item history to find unique customers
  nlapiLogExecution('DEBUG', 'customerlist Len: ' , customerlist.length);

  for (var j = 0; j < customerlist.length; j++){
    //if(j==2)  break;
    checkGovernance();
    var customer = customerlist[j].leasecustomer;
    var custleases = getCustomerLeases(customer,activeleases);
    if(custleases.length > 0){
      var invrec = nlapiCreateRecord('invoice');        
      invrec.setFieldValue('customform',invoiceform);
      invrec.setFieldValue('entity',customer);
      invrec.setFieldValue('location',location);
      invrec.setFieldValue('memo','Dish Lease');
      invrec.setFieldValue('custbody_ifd_nosurchargesapply','T');
      //nlapiLogExecution('DEBUG', 'custleases: ' , JSON.stringify(custleases));
      for (var k = 0; k < custleases.length; k++){
        checkGovernance();
        //var custid = custleases[k].leasecustomer;
        var leasestatus = custleases[k].leasestatus;
        var leaseitem = custleases[k].leaseitem;
        var leaserate = custleases[k].leaserate;
        //nlapiLogExecution('DEBUG', 'lease data: ' , 'custid: ' +custid + ', leasestatus: ' + leasestatus +', leaseitem: ' + leaseitem +', leaserate: '+leaserate);

        invrec.insertLineItem('item',k+1);
        invrec.setLineItemValue('item','item',k+1,invoiceitem);
        invrec.setLineItemValue('item','quantity',k+1,1);
        invrec.setLineItemValue('item','rate',k+1,leaserate);
      }//for k
      var invoiceid = nlapiSubmitRecord(invrec);
      nlapiLogExecution('DEBUG', 'Invoice Created: ' , invoiceid);
      if(IsNotEmpty(invoiceid)){
        var custemail = nlapiLookupField('customer', customer, 'email');
        //nlapiLogExecution('DEBUG', 'custemail: ' , custemail);
        var fields = new Array();
        fields[0] = 'email';
        fields[1] = 'salesrep';            
        var columns = nlapiLookupField('customer', customer, fields);            
        var custemail = columns.email;
        var salesrep = columns.salesrep;
        nlapiLogExecution('DEBUG', 'custemail: ' , custemail +', salesrep: ' +salesrep);
        if(IsNotEmpty(salesrep)){
          var salesrepemail = nlapiLookupField('employee', salesrep, 'email');
          nlapiLogExecution('DEBUG', 'salesrepemail: ' , salesrepemail );
        }
        if(IsNotEmpty(custemail)){
          var emailMerger = nlapiCreateEmailMerger(emailtemplate);          
          emailMerger.setEntity('customer', customer);
          emailMerger.setTransaction(invoiceid);
          var mergeResult = emailMerger.merge();
          //var emailSubject = 'Invoice #' +invoiceid ;
          var emailSubject 	= mergeResult.getSubject();
          var emailBody = mergeResult.getBody();
          //nlapiLogExecution('DEBUG', 'emailSubject: ' , emailSubject +', body: ' + emailBody);
          var file = nlapiPrintRecord('TRANSACTION', invoiceid, 'PDF');
          //nlapiLogExecution('DEBUG', 'file: ' , file);
          var rec = new Array();
          rec['transaction'] = invoiceid; 
          //rec['entity'] = customer;
          //var custemail = 'binnyj@yahoo.com';
          try{
            if(custemail != salesrepemail && IsNotEmpty(salesrepemail)){
              try{
                nlapiSendEmail(emailauthor, custemail,emailSubject , emailBody,salesrepemail,null,rec,file);//emailSubject
              }catch(ex){
                continue;
              }
            }
            else{
              try{
                nlapiSendEmail(emailauthor, custemail,emailSubject , emailBody,null,null,rec,file);//emailSubject
              }catch(ex){
                continue;
              }
            }
            nlapiLogExecution('DEBUG', 'Email sent customer: ', customer + ', email: ' + custemail );
          }catch(ex){
            continue;
          }

          /*if(custemail != salesrepemail && IsNotEmpty(salesrepemail)){
            try{
              nlapiSendEmail(emailauthor, salesrepemail,emailSubject , emailBody,null,null,rec,file);//emailSubject
              nlapiLogExecution('DEBUG', 'Email sent to Salesrep: ', salesrepemail );
            }catch(ex){
              continue;
            }
          }*/

        }
      }//invoiceid not null
    }//if custleases . 0
  }// for j
  nlapiLogExecution('DEBUG', 'Process completed...' );


}//process

function getCustomerLeases(customer,activeleases){

  var leases = [];
  for (var i = 0; i < activeleases.length; i++){
    var customerid = activeleases[i].leasecustomer;
    if(customerid == customer){
      leases.push(activeleases[i]);
    }
  }
  return leases;
}

function checkGovernance(){

  try{		
    var intCurrentUsage = parseInt(nlapiGetContext().getRemainingUsage());
    if (intCurrentUsage <= 200)
    { 
      //return true;
      //nlapiLogExecution('debug', 'Yield script');
      var state = nlapiYieldScript();
      //nlapiLogExecution('debug', 'Script yield','usage: '+intCurrentUsage+ ' status: '+state.status+ ' reason: '+state.reason);
      if( state.status == 'FAILURE'){
        nlapiLogExecution('ERROR', 'Script yield error','usage: '+intCurrentUsage+ ' status: '+state.status+ ' reason: '+state.reason);
        return true;
      }
    }
    return false;
  }catch(error){
    nlapiLogExecution('error', 'checkGovernance',error.toString());
  }
}

function getSearchResults(searchId, recordType, searchFilter, searchColumn) { 

  checkGovernance();
  var returnSearchResults = [];
  if (IsEmpty(recordType) === true) {
    recordType = null;
  }
  var savedSearch;
  if (IsEmpty(searchId) === false) {
    savedSearch = nlapiLoadSearch(recordType, searchId);
    // add search filter if one is passed
    if (isNullOrUndefined(searchFilter) === false) {
      savedSearch.addFilters(searchFilter);
    }

    // add search column if one is passed
    if (isNullOrUndefined(searchColumn) === false) {
      savedSearch.addColumns(searchColumn);
    }

  } else {
    savedSearch = nlapiCreateSearch(recordType, searchFilter, searchColumn);
  }

  var resultset = savedSearch.runSearch();
  var searchid = 0;
  do {
    var resultslice = resultset.getResults(searchid, searchid + 1000);
    if (isNullOrUndefined(resultslice) === true) {
      break;
    }

    for ( var rs in resultslice) {
      returnSearchResults.push(resultslice[rs]);
      searchid++;
    }
  } while (resultslice.length >= 1000);
  return returnSearchResults;
}

function checkcustomerexists(customerid,customerlist){

  for (var jj = 0; jj < customerlist.length; jj++){
    var custid = customerlist[jj].leasecustomer;
    if(custid == customerid){
      return true;
    }
  }
  return false;
}


function formatDateMMDDYYYY(d, sep)
{
  function zeroPadIfLessThan10(n) {
    return (n < 10) ? ('0' + n) : ('' + n);
  }

  var result = [];
  var day = d.getDate();
  var month = d.getMonth() + 1;
  var year = d.getFullYear();

  result.push(zeroPadIfLessThan10(month));
  result.push(zeroPadIfLessThan10(day));
  result.push(zeroPadIfLessThan10(year));
  return result.join(sep);
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

function isNullOrUndefined(data) {
  if(data === null){
    return true;
  }
  if(data === undefined){
    return true;
  }
  return false;
}