var template = '137';
var emailauthor = 46893; //45544
function process(){	

  nlapiLogExecution('DEBUG', 'Mass Email starting...' );
  //get all unavailable items to a list
  var unavailableitems = [];
  var searchresults = getSearchResults('customsearch_bg_temp_unavailable_items','inventoryitem',null,null);
  if(searchresults){
    for (var k = 0; k < searchresults.length; k++) {
      checkGovernance();      
      var searchresult = searchresults[k]; 
      var itemid = searchresult.getId();
      var itemname = searchresult.getValue('name',null,null);
      var itemdisplayname = searchresult.getValue('displayname',null,null);
      var status = searchresult.getValue('custitem_ifd_item_status',null,null);
      var sub1 = searchresult.getValue('custitem_ifd_suggested_sub',null,null);
      var sub2 = searchresult.getValue('custitem_ifd_addtl_sug_subs',null,null);
      var recdate = searchresult.getValue('custitem_ifd_exp_rec_date',null,null);
      var manufacturer = searchresult.getValue('manufacturer',null,null);
      var data = {};
      data.itemid = itemid;
      data.itemname = itemname;
      data.itemdisplayname = itemdisplayname;
      data.status = status;
      data.sub1 = sub1;
      data.sub2 = sub2;
      data.recdate = recdate;
      data.manufacturer = manufacturer;
      unavailableitems.push(data);
    }
  }
  nlapiLogExecution('DEBUG', 'unavailableitems Len: ' , unavailableitems.length);

  //var contactlist = [];
  var custitemhistory = [];  
  var searchresults = getSearchResults('customsearch_bg_cust_inv_item_history','customer',null,null);
  if(searchresults){
    for (var k = 0; k < searchresults.length; k++) {
      checkGovernance();
      var data = {};
      var searchresult = searchresults[k]; 
      var customerid = searchresult.getValue('internalid',null,'group');
      var entityid = searchresult.getValue('entityid',null,'group');
      var customername = searchresult.getValue('altname',null,'group');
      var companyname = searchresult.getValue('companyname',null,'group');
      var item = searchresult.getValue('item','transaction','group');
      var itemtxt = searchresult.getText('item','transaction','group');
      var itemqty = searchresult.getValue('quantity','transaction','sum');
      //nlapiLogExecution('DEBUG', 'customer:', customerid + ' ,item: ' + item +', itemtxt: '+ itemtxt );
      data.customerid = customerid;
      data.entityid = entityid;
      data.itemqty = itemqty;
      data.name = customername;
      data.item = item;
      data.itemtxt = itemtxt;
      data.companyname = companyname;
      if(itemExists(item, unavailableitems)){
        custitemhistory.push(data);
      }
      //custitemhistory.push(data);
    }//for k
  }//searchresults

  //filter unique customers
  var customerlist = [];
  for (var j = 0; j < custitemhistory.length; j++){
    checkGovernance();
    var customerid = custitemhistory[j].customerid;
    if(j==0){
      var data = {};
      data.customerid = customerid;
      customerlist.push(data);
    }
    else{
      var customerexists = checkcustomerexists(customerid, customerlist);
      if(customerexists == false){
        var data = {};
        data.customerid = customerid;
        customerlist.push(data);
      }
    }
  }//for j loop thru customer item history to find unique customers
  nlapiLogExecution('DEBUG', 'customerlist Len: ' , customerlist.length);
  // *** NEW CODE #2 STRAT


  //get all contacts
  var allcontacts = [];
  var searchresults = getSearchResults('customsearch_bg_all_customers_by_contact','contact',null,null);
  if(searchresults){
    for (var k = 0; k < searchresults.length; k++) {
      checkGovernance();      
      var searchresult = searchresults[k]; 
      var contactid = searchresult.getId();
      var contactemail = searchresult.getValue('email',null,null);
      var customerid = searchresult.getValue('internalid','customer',null);     
      var customername = searchresult.getValue('altname','customer',null);    
      var companyname = searchresult.getValue('companyname','customer',null);
      var accountnumber = searchresult.getValue('accountnumber','customer',null);
      var firstname = searchresult.getValue('firstname',null,null);
      var contactname = firstname;
      var data = {};
      data.contactid = contactid;
      data.contactemail = contactemail;
      data.customerid = customerid;
      data.customername = customername;
      data.companyname = companyname;      
      data.contactname = contactname;
      data.accountnumber = accountnumber;
      allcontacts.push(data);
    }
  }
  nlapiLogExecution('DEBUG', 'allcontacts Len: ' , allcontacts.length);
  /*
  for (var i = 0; i < allcontacts.length; i++) {
    var name = allcontacts[i].contactemail;
    if (name == 'jennie@rivercountrycoop.com') {
      nlapiLogExecution('DEBUG', 'found : ' , name +', allcontacts: ' + JSON.stringify(allcontacts[i]));
      //break;
    }
  }
*/
  //nlapiLogExecution('DEBUG', 'allcontacts: ' , JSON.stringify(allcontacts));
  //filter unique contacts
  var contactlist1 = [];
  for (var j = 0; j < allcontacts.length; j++){
    checkGovernance();
    var contactid = allcontacts[j].contactid;
    var customerid = allcontacts[j].customerid;
    if(j==0){
      //var data = {};
      //data.contactid = contactid;
      contactlist1.push(allcontacts[j]);
    }
    else{
      var contactexists = checkcontactcustomerexists(contactid,contactlist1,customerid);
      /*
      if(customerid == 3125){
        nlapiLogExecution('DEBUG', 'contactlist1 customerid : ' , customerid +', contactexists: ' + contactexists +', allcontacts[j]: ' + JSON.stringify(allcontacts[j]));
      }
      */
      if(contactexists == false){
        //var data = {};
        //data.contactid = contactid;
        contactlist1.push(allcontacts[j]);
        //var contactcustomerlist = getAllCustomersByContact(contactid, allcontacts);
        //if(contactcustomerlist.length > 0 ){

        //}
      }
    }
  }//for j loop thru contacts to find unique contacts
  nlapiLogExecution('DEBUG', 'contactlist1 Len: ' , contactlist1.length);

  //nlapiLogExecution('DEBUG', 'contactlist1: ' , JSON.stringify(contactlist1));
  /*
  for (var i = 0; i < contactlist1.length; i++) {
    var name = contactlist1[i].contactemail;
    if (name == 'jennie@rivercountrycoop.com') {
      nlapiLogExecution('DEBUG', 'found : ' , name +', arr: ' + JSON.stringify(contactlist1[i]));
      //break;
    }
  }
  */
  //filter contacts with valid customers
  var contactlist = [];
  for (var j = 0; j < contactlist1.length; j++){
    checkGovernance();
    var contcustid = contactlist1[j].customerid;
    /*
    if(contcustid == 3125){
      nlapiLogExecution('DEBUG', 'check customerid : ' , customerid +', contcustid: ' + contcustid +',contactlist1[j]:  ' + JSON.stringify(contactlist1[j]));
    }
	*/
    for (var jj = 0; jj < customerlist.length; jj++){
      var customerid = customerlist[jj].customerid;

      if(customerid == contcustid){
        contactlist.push(contactlist1[j]);
        break;
      }
    }
  }
  nlapiLogExecution('DEBUG', 'contactlist Len: ' , contactlist.length);
  //nlapiLogExecution('DEBUG', 'contactlist: ' , JSON.stringify(contactlist));
  /*
  for (var i = 0; i < contactlist.length; i++) {
    var name = contactlist[i].contactemail;
    if (name == 'jennie@rivercountrycoop.com') {
      nlapiLogExecution('DEBUG', 'found : ' , name);
      break;
    }
  }
  */
  //main loop - contacts
  var x = 0; 
  var emailedcontactlist = [];
  for (var cl = 0; cl < contactlist.length; cl++){
    checkGovernance();
    //if(x==5) break;
    var itemfound = false;
    //nlapiLogExecution('DEBUG', 'contactlist[cl]: ' , JSON.stringify(contactlist[cl]));
    var contactid = contactlist[cl].contactid;
    var email = contactlist[cl].contactemail;
    var contactname = contactlist[cl].contactname;   
    var accountnumber = contactlist[cl].accountnumber;
    //nlapiLogExecution('DEBUG', 'contact' , 'contactid: ' + contactid +', email: ' + email + ', contactname: ' + contactname);
    var itemstr = '';
    var itemheadstr = '';
    var contactexists = checkcontactexists(contactid,emailedcontactlist);
    if(contactexists == false){//if not mailed already
      var data = {};
      data.contactid = contactid;
      emailedcontactlist.push(data); //add this contact since it does not exist
      var contactcustomerlist = getAllCustomersByContact(contactid, allcontacts);

      if(contactcustomerlist.length >0){
        //nlapiLogExecution('DEBUG', 'contactcustomerlist: ' , JSON.stringify(contactcustomerlist));
        for (var uai = 0; uai < unavailableitems.length; uai++){
          checkGovernance();
          itemheadstr = '';
          var itemid = unavailableitems[uai].itemid;
          //nlapiLogExecution('DEBUG', 'unavailableitems itemid: ' , itemid);
          var itemname = unavailableitems[uai].itemname;
          var itemdisplayname = unavailableitems[uai].itemdisplayname;
          var manufacturer = unavailableitems[uai].manufacturer;
          var sub1 = unavailableitems[uai].sub1;
          var sub2 = unavailableitems[uai].sub2;
          var recdate = unavailableitems[uai].recdate;          
          var recoverydate = nlapiStringToDate(recdate);
          var todaysdate = new Date();
          if( (recoverydate > todaysdate) || (recoverydate == null || recoverydate || '')){ 
            if((recoverydate == null || recoverydate == '')){
              recoverydate = 'no ETA date available at this time';            
            }
            else{
              recoverydate = formatDateMMDDYYYY(recoverydate,'/');
            }

          }//recoverydate

          itemheadstr = '<br /> <p style="color:blue;font-size:20px"><b>IFD #' + ' ' + itemname + ' ' + itemdisplayname + '</b></p><br />';
          itemheadstr = itemheadstr + '<p style="color:blue"><b>Manufacturer:</b>' + manufacturer + '</p> <br />';
          itemheadstr = itemheadstr + '<p style="color:blue"><b>ETA to IFD is approximately by </b>' + recoverydate + '</p><br />';

          var casetotal = 0;
          itemfound = false;
          var custlisttxt = '';
          //nlapiLogExecution('DEBUG', 'contactcustomerlist.length: ' , contactcustomerlist.length);
          for (var ccl = 0; ccl < contactcustomerlist.length; ccl++){
            checkGovernance();
            var customerid = contactcustomerlist[ccl].customerid;            
            var missinglist = checkIteminList(itemid,customerid,custitemhistory);            
            if(missinglist.length > 0){
              itemfound = true;
              if(email == 'abuehler@isd721.org'){
                nlapiLogExecution('DEBUG', 'missinglist: ' , 'contactid:' + contactid + ',itemid: ' + itemid + ', data: ' + JSON.stringify(missinglist));
              }
              //nlapiLogExecution('DEBUG', 'missinglist: ' , 'contactid:' + contactid + ',itemid: ' + itemid + ', data: ' + JSON.stringify(missinglist));

              for (var ml = 0; ml < missinglist.length; ml++){
                checkGovernance();
                var itemtxt = missinglist[ml].itemtxt;
                var itemqty = missinglist[ml].itemqty;
                var companyname = missinglist[ml].companyname;
                var entityid = missinglist[ml].entityid;
                casetotal = parseFloat(casetotal) + parseFloat(itemqty);               
                custlisttxt = custlisttxt  + entityid + ' ' + companyname + '('+itemqty +' case(s))' + ', ';
                //nlapiLogExecution('DEBUG', 'custlisttxt: ' , custlisttxt +', recoverydate: ' + recoverydate);
              }
            }//missinglist.length > 0
          }//for ccl contactcustomerlist
          if(custlisttxt != ''){

            if(casetotal > 1){
              var casetxt = 'case(s)';
            }
            else{
              var casetxt = 'case';
            }
            var temp = custlisttxt.substring(0,(custlisttxt.length-2));
            //nlapiLogExecution('DEBUG', 'temp : ' ,  temp);
            itemstr = itemstr + itemheadstr + '<br />'  + '<p style="color:red">Total case usage for accounts listed below over the last 9 months:' + casetotal + ' ' + casetxt + '</p><br />';
            itemstr = itemstr + '<p style="color:red">Customer Accounts using this product:<br />' + temp + '</p><br />';

            if(sub1!= null && sub1 != ''){
              if(IsNotEmpty(sub1)){
                var arr = sub1.split(',');
                //nlapiLogExecution('DEBUG', 'sub1 arr.length: ' ,  arr.length);
                for(var sub = 0 ;sub < arr.length ; sub++){
                  checkGovernance();
                  var sub1status = nlapiLookupField('inventoryitem', arr[sub], 'custitem_ifd_item_status');
                  //nlapiLogExecution('DEBUG', 'sub1 : ' ,  arr[sub] + ', status: ' + sub1status);
                  if(sub1status != 5 ){
                    var fields = new Array();
                    fields[0] = 'itemid';
                    fields[1] = 'displayname';            
                    var columns = nlapiLookupField('inventoryitem', arr[sub], fields);            
                    var sub1info = columns.itemid + ' ' + columns.displayname;
                    itemstr = itemstr + '<p style="color:blue"><b>Suggested Replacement IFD#  </b>' + sub1info + '</p><br />';
                  }//sub1status != 5 
                }
              }
            }//sub1
            if(sub2 != null && sub2 != '' ){
              if(IsNotEmpty(sub2)){
                var arr = sub2.split(',');

                for(var sub = 0 ;sub < arr.length ; sub++){
                  checkGovernance();
                  var sub2status = nlapiLookupField('inventoryitem', arr[sub], 'custitem_ifd_item_status');
                  //nlapiLogExecution('DEBUG', 'sub2 : ' ,  arr[sub] + ', status: ' + sub2status);
                  if(sub2status != 5 ){
                    var fields = new Array();
                    fields[0] = 'itemid';
                    fields[1] = 'displayname';            
                    var columns = nlapiLookupField('inventoryitem', arr[sub], fields);
                    var sub2info = columns.itemid + ' ' + columns.displayname;
                    itemstr = itemstr + '<p style="color:blue"><b>Suggested Replacement IFD# </b> ' + sub2info + '</p><br />';
                  }//sub2status != 5
                }
              }
            }//sub2
          }//itemfound == true
        }//unavailableitems loop
      }//contactcustomerlist.length >0
      if(itemstr != ''){
        //nlapiLogExecution('DEBUG', 'contact email: ', email + ' , itemstr:' +itemstr );
        if(IsNotEmpty(itemstr)){
          x++;
          checkGovernance();
          //itemstr = '<tr><td>'+itemheadstr + itemstr + '</td></tr>';
          //itemstr = itemstr ;
          var emailMerger = nlapiCreateEmailMerger(template);
          emailMerger.setEntity('customer', customerid);
          //emailMerger.setRecipient('customer', customerid);
          var mergeResult = emailMerger.merge();

          var emailSubject = mergeResult.getSubject();
          var subjecttxt = contactname;// + ' (' + companyname + ')';
          emailSubject = emailSubject.replace(/##CONTACTNAME##/g,subjecttxt);
          var emailBody = mergeResult.getBody();
          emailBody = emailBody.replace(/##DATA##/g,itemstr);
          //nlapiLogExecution('DEBUG', 'email:', email ); 
          //var records = new Object();
          //records['entity'] = customerid;

          //nlapiLogExecution('DEBUG', 'emailSubject:', emailSubject +', email: ' + email);          
          //nlapiLogExecution('DEBUG', 'emailBody:', emailBody ); 
          //email = 'binnyj@yahoo.com';
          nlapiSendEmail(emailauthor, email, emailSubject, emailBody,null,null,null);//records

        }//IsNotEmpty(itemstr)
      }//if not mailed already

    }
  }//main loop - contacts
  nlapiLogExecution('DEBUG', 'Mass Email completed...' );
  // *** NEW CODE #2 END


}//process

function checkIteminList(itemid,customerid,custitemhistory){

  var itemslist = [];
  for (var ih = 0; ih < custitemhistory.length; ih++){
    checkGovernance();
    var histcustid = custitemhistory[ih].customerid;
    var histitem = custitemhistory[ih].item;
    if(customerid == histcustid && itemid == histitem){
      var data = custitemhistory[ih];
      itemslist.push(data);
      break;
    }
  }//for ih
  return itemslist;
}//checkIteminList

function getUnavailableItems(customerid, custitemhistory){

  var itemslist = [];

  for (var x = 0; x < custitemhistory.length; x++){
    checkGovernance();
    var histcustid = custitemhistory[x].customerid;
    //nlapiLogExecution('DEBUG', 'customerid:', customerid + ' ,histcustid: ' + histcustid  );
    if(customerid == histcustid){
      //check if item is unavailable
      var histitem = custitemhistory[x].item;
      var histitemtxt = custitemhistory[x].itemtxt;
      var itemunavailable = checkItemAvailability(histitem);
      //nlapiLogExecution('DEBUG','customerid: ',customerid + ',histitemtxt:' + histitemtxt + ', histitem:'+ histitem + ' ,itemunavailable: ' + itemunavailable  );
      if(itemunavailable == true){
        itemslist.push(histitem);
      }
    }//customerid == histcustid    
  }
  return itemslist;
}//getUnavailableItems

function getContacts(customerid){

  checkGovernance();
  var contactlist = [];
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('internalid', null, 'is', customerid);
  var searchresults = getSearchResults('customsearch_bg_customer_contacts','customer',filters,null);
  if(searchresults){
    for (var k = 0; k < searchresults.length; k++) {
      checkGovernance();
      var data = {};
      var searchresult = searchresults[k];            
      var company = searchresult.getValue('companyname',null,'group');
      var companytxt = searchresult.getText('companyname',null,'group');
      //var name = searchresult.getValue('entityid','contact','group');
      var email = searchresult.getValue('email','contact','group');
      var fname = searchresult.getValue('firstname','contact','max');
      var lname = searchresult.getValue('lastname','contact','max');
      var contactid = searchresult.getValue('internalid','contact','max');
      var name = fname + ' ' + lname;
      //nlapiLogExecution('DEBUG', 'company', company +', name: '+ name +', email: '+ email+',companytxt: '+companytxt);
      data.company = company;
      data.companytxt = companytxt;
      data.name = name;
      data.email = email;
      data.contactid = contactid;
      contactlist.push(data);
    }//for k
  }//searchresults
  return contactlist;
}//getContacts

function getAllCustomersByContact(contactid, allcontacts){
  var customerlist = [];
  for (var kk = 0; kk < allcontacts.length; kk++) {
    var contid = allcontacts[kk].contactid;
    if(contid == contactid){
      var contact = allcontacts[kk];
      customerlist.push(contact);
    }
  }
  return customerlist;
}


function checkItemAvailability(itemid){

  checkGovernance();
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('internalid', null, 'is', itemid);
  var custitemhistory = [];

  var searchresults = getSearchResults('customsearch_bg_temp_unavailable_items','inventoryitem',filters,null);
  if(searchresults){
    if(searchresults.length > 0)
      return true;
    else
      return false;
    //for (var k = 0; k < searchresults.length; k++) {
    //
    //}//for k
  }//searchresults
  return false;
}//checkItemAvailability

function checkGovernance(){
  /*
  var ctx = nlapiGetContext();
  var usageRem = ctx.getRemainingUsage();
  nlapiLogExecution('DEBUG', 'Usage', 'Usage: ' + usageRem);
  if(usageRem <= 500){
    nlapiLogExecution('DEBUG', 'Limit Reached - Reschedule Script', 'Limit Reached - Reschedule Script');
    nlapiYieldScript(ctx.getScriptId(), ctx.getDeploymentId());
  }
*/
  try{		
    var intCurrentUsage = parseInt(nlapiGetContext().getRemainingUsage());
    if (intCurrentUsage <= 1000)
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

function itemExists(itemid, itemlist) {
  return itemlist.some(function(el) {
    return el.itemid === itemid;
  }); 
}
function checkcustomerexists(customerid,customerlist){

  for (var jj = 0; jj < customerlist.length; jj++){
    var custid = customerlist[jj].customerid;
    if(custid == customerid){
      return true;
    }
  }
  return false;
}


function checkcontactcustomerexists(contactid,contactlist,customerid){

  for (var jj = 0; jj < contactlist.length; jj++){
    var contid = contactlist[jj].contactid;
    var contcustomerid = contactlist[jj].customerid;
    /*
    if(contactid == 40900){
      nlapiLogExecution('DEBUG', 'contactexists customerid', customerid + ', contcustomerid: ' + contcustomerid +', contactid: ' + contactid +', contid: ' + contid);
    }
	*/
    if(contid == contactid && customerid == contcustomerid){
      return true;
    }
  }
  return false;
}

function checkcontactexists(contactid,contactlist){

  for (var jj = 0; jj < contactlist.length; jj++){
    var contid = contactlist[jj].contactid;
    if(contid == contactid){
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