/**
 * Constants
 * Mod: 11/1/2014 by JSON
 * - Constants list is deprecated ref: Ticket 49
 */
var SWEET_CANCELLATION_AMOUNT_100PERCENT = '1';
var SWEET_CANCELLATION_AMOUNT_50PERCENT = '2';
//var SWEET_CANCELLATION_AMOUNT_NOFEE = '3';
var SWEET_CANCELLATION_AMOUNT_15PERCENT = '4';
var SWEET_CANCELLATION_AMOUNT_75PERCENT = '5';
var SWEET_CANCELLATION_AMOUNT_25PERCENT = '6';
var SWEET_CANCELLATION_AMOUNT_37PERCENT = '10';
var SWEET_CANCELLATION_AMOUNT_60PERCENT = '11';
//var SWEET_CANCELLATION_FEE_ITEM = '1507';

/**
 * Booking Cancellation Form Suitelet
 *
 * @function jobCancellationForm
 * @param {Object} request
 * @param {Object} response
 */


//Mod 11/1/2014 - Use Script Parameter to grab No Cancellation Fee ID from new custom record and Cancellation fee Item ID
var SWEET_CANCELLATION_AMOUNT_NOFEE = '';
var SWEET_CANCELLATION_FEE_ITEM = '';


function jobCancellationForm(request, response)
{
  //Grab the values from Script level parameter
  SWEET_CANCELLATION_AMOUNT_NOFEE = nlapiGetContext().getSetting('SCRIPT','custscript_sct95_nofeerecord');
  SWEET_CANCELLATION_FEE_ITEM = nlapiGetContext().getSetting('SCRIPT','custscript_sct95_cancelfeeitem');
	
  // Validate job id
  var jobId = request.getParameter('jobid');
  var temp = jobId;
  var idx = temp.indexOf('_'); 
  var travelChargeLines = '';

  // Seperate jobId and travel charge lines
  if(idx > 0){
    jobId = temp.substring(0,idx);
    travelChargeLines = temp.substring(idx + 1);
  }

  if (!jobId) {
    throw nlapiCreateError('SWEET_JOB_REQD', 'Booking field is required.', true);
  }
  
  // Load job record
  var job = nlapiLoadRecord('job', jobId, {recordmode:'dynamic'});
  
  nlapiLogExecution('debug','Buyer after job load',job.getFieldValue('custentity_bo_buyer'));
  
  var jobBuyerValue = job.getFieldValue('custentity_bo_buyer');
  
  if (!job) {
    throw nlapiCreateError('SWEET_JOB_REQD', 'Cannot load job.', true);
  }
 
  // Get linked transactions
  var filters = new Array();
  filters.push(new nlobjSearchFilter('internalid', 'job', 'is', jobId));
  var columns = new Array();
  columns.push(new nlobjSearchColumn('trandate'));
  columns.push(new nlobjSearchColumn('tranid'));
  columns.push(new nlobjSearchColumn('type'));
  columns.push(new nlobjSearchColumn('internalid'));    
  var searchResults = nlapiSearchRecord('transaction', null, filters, columns);

  // Has form been submitted?
  if (request.getMethod() == 'POST') {
  
    // If already cancelled
    if (job.getFieldValue('custentity_bo_iscancelled') == 'T') {
      throw nlapiCreateError('SWEET_JOB_ALREADY_CANCELLED', 'Booking is already cancelled.', true);
    }
    
    // Prepare to read results
    var transactionType = job.getFieldValue('custentity_bo_isprovisional') == 'T' ? 'estimate' : 'salesorder';
    var multipleTransactions = false;
    var lastTransaction = null;
    
    // Read search results
    if (searchResults) {
      var i = 0, n = searchResults.length;
      for (; i < n; i++) {
      
        // Throw error if invoice is found
        if (searchResults[i].getRecordType() == 'invoice') {
          var url = nlapiResolveURL('RECORD', searchResults[i].getRecordType(), searchResults[i].getId());
          throw nlapiCreateError('SWEET_CANCEL_NOT_ALLOWED_INVOICE', "You can't cancel this booking because an invoice is linked to it. <a href='" + url + "'>Click here to view the invoice</a>", true);
        }
        
        // Throw error if item fulfillment is found
        if (searchResults[i].getRecordType() == 'itemfulfillment') {
          var url = nlapiResolveURL('RECORD', searchResults[i].getRecordType(), searchResults[i].getId());
          throw nlapiCreateError('SWEET_CANCEL_NOT_ALLOWED_ITEMFULFILLMENT', "You can't cancel this booking because an item fulfillment record is linked to it. <a href='" + url + "'>Click here to view the record</a>", true);
        }
                
        // Break loop if multiple transactions are found
        if (searchResults[i].getRecordType() == transactionType) {
          if (lastTransaction != null && lastTransaction != searchResults[i].getId()) {
            multipleTransactions = true;
            break;
          } else {
            lastTransaction = searchResults[i].getId();
          }
        }
      }
    }
    
    // Throw error if multiple transactions are found
    if (multipleTransactions) {
      var url = nlapiResolveURL('RECORD', searchResults[i].getRecordType(), searchResults[i].getId());
      throw nlapiCreateError('SWEET_CANCEL_NOT_ALLOWED_MULTIPLETRANSACTIONS', "You can't cancel this booking because it is linked to multiple transactions.", true);
    }
    
    // Cancellation reason
    var reason = request.getParameter('reason');
    if (!reason) {
      throw nlapiCreateError('SWEET_CANCELLATION_REASON_REQD', "You must select a cancellation reason.", true);
    }
    
    // Cancellation fee
    var fee = request.getParameter('fee');
    if (!fee) {
      throw nlapiCreateError('SWEET_CANCELLATION_FEE_REQD', "You must select a cancellation fee option.", true);
    }
    
    //tix 4439 - 8/20/2015 - Cancellation Impact
    var impactAmount = 0.0;
    
    //9/4/2014 - add in validation for Cancellation Initiator
    var reqCanInit = request.getParameter('custpage_caninitor');
    if (!reqCanInit) {
    	throw nlapiCreateError('SWEET_CANCELLATION_INIT_REQD', "You must select a cancellation initiator option.", true);
    }
    
    // Update transaction
    var transactionId = lastTransaction;
    if (transactionId) {
      var transaction = nlapiLoadRecord(transactionType, transactionId);
      
      //Get the GBP/USD Exchange Rates - June 23, 2016
  	  var curncy = transaction.getFieldValue('currency');	
	  var trxDate = transaction.getFieldValue('trandate');		  
	  var USDrate = nlapiExchangeRate(curncy, 'USD', trxDate );
	  var GBPrate = nlapiExchangeRate(curncy, 'GBP', trxDate );   
	  
      
      // Find item linked to job
      var i = 1, n = transaction.getLineItemCount('item') + 1;
      for (;i < n; i++) {
        if (transaction.getLineItemValue('item', 'job', i) == jobId) {
          break;
        }
      }
      nlapiLogExecution('DEBUG', 'so.item=', i);
      
      // Get quantity
      var quantity = transaction.getLineItemValue('item', 'quantity', i);
      nlapiLogExecution('DEBUG', 'so.item.quantity=', quantity);
      
      // Get rate
      var rate = transaction.getLineItemValue('item', 'rate', i);
      nlapiLogExecution('DEBUG', 'so.item.rate=', rate);
      
      // Get amount
      var amount = transaction.getLineItemValue('item', 'amount', i);
      nlapiLogExecution('DEBUG', 'so.item.amount=', amount);
      
      // Close item
      transaction.setLineItemValue('item', 'isclosed', i, 'T');
      
      // Set quantity to zero
      transaction.setLineItemValue('item', 'quantity', i, 0);
      
	  //June 22, 2016 - Ticket 10432 - Set the GBP/USD Amounts to zero when Booking is cancelled
	  transaction.setLineItemValue('item', 'custcol_amount_gbp', i, 0);	  
	  transaction.setLineItemValue('item', 'custcol_amount_usd', i, 0);
      
      // Bugfix: When quantity is changed the amount (or rate) must be set again
      transaction.setLineItemValue('item', 'rate', i, amount);
      
      nlapiLogExecution('DEBUG', 'fee=', fee);
      
      // Add cancellation fee
      if (fee != SWEET_CANCELLATION_AMOUNT_NOFEE) {
      
        // Insert new item line
        transaction.insertLineItem('item', i + 1);
        
        // Item
        transaction.setLineItemValue('item', 'item', i + 1, SWEET_CANCELLATION_FEE_ITEM);
        
        // Options
        transaction.setLineItemValue('item', 'options', i + 1, transaction.getLineItemValue('item', 'options', i));
        
        // Quantity
        transaction.setLineItemValue('item', 'quantity', i + 1, 1);
        
        //Set the GBP/USD Dollar Amounts - June 23, 2016
        transaction.setLineItemValue('item', 'custcol_amount_usd', i + 1, (amount*USDrate).toFixed(2));
        transaction.setLineItemValue('item', 'custcol_amount_gbp', i + 1, (amount*GBPrate).toFixed(2));	        
        
        // If rate is not set calculate it based on net amount and quantity
        //JSON: Ticket #49 - Change Rate calculation to be based on amount NOT rate
        if (!rate) {
          //rate = amount / quantity;
          rate = amount;
        }
        
        /**
         * // Cancellation fee field
            //11/1/2014 - Ticket #49: Do not allow Cancellation amount to be edited.
            //Phase 1: ONLY Return Cancellation amount that is in %
            //	- For fixed amount, We need more clarification on HOW the amount is calculated.
            //TODO: Need to identify with Oliver/David on how FIXED amount works
            //USE NEW Custom Record version of Cancellation Amount created for this purpose
            var cflt = [new nlobjSearchFilter('isinactive', null,'is','F')];
            var ccol = [new nlobjSearchColumn('internalid'),
                        new nlobjSearchColumn('custrecord_cancel_displayorder').setSort(),
                        new nlobjSearchColumn('name')];
            var crs = nlapiSearchRecord('customrecord_bo_new_cancellationamount', null, cflt, ccol);
            var feeField = form.addField('fee', 'select', 'Cancellation Fee', null);
            
         */
        //Look up Details of user selected Fee amount
        var feefld = ['custrecord_cancel_amount','custrecord_cancel_ispercent'];
        var feevals = nlapiLookupField('customrecord_bo_new_cancellationamount', fee, feefld, false);
        
        //DONE: We need to switch over custentity_bo_cancellationfee field on booking over to new record.
        //		- TO do this, we MUST use scheduled script to update ALL booking records.
        //			1. Back up existing field to NEW temp field that references legacy 
        //			2. Change the field reference to Custom Record
        //			3. Run script to update existing field referencing custom record using mapping field.
        //UNTIL Above is done, fee value will reference legacy field on Custom record
        //19/12/2014 - NO longer need to map. 
        //fee = feevals['custrecord_cancel_legacylist'];
        
        //based on ispercent value, Multiply or Subtract 
        //tix 4439 8/20/2015 - Calculate the impactAmount
        if (feevals['custrecord_cancel_ispercent']=='T') {
        	rate = parseFloat(feevals['custrecord_cancel_amount']) * amount;
        	impactAmount = parseFloat(amount) - parseFloat(rate);
        } else {
        	//assume to be fixed amount - Subtract from amount
        	rate = amount - parseFloat(feevals['custrecord_cancel_amount']);
        	impactAmount = rate;
        }
        
        
        /**
        switch (fee) {
          case SWEET_CANCELLATION_AMOUNT_100PERCENT:
            break; // Do nothing
          case SWEET_CANCELLATION_AMOUNT_75PERCENT:
            //rate = 0.75 * rate;
        	  rate = 0.75 * amount;
            break;
          case SWEET_CANCELLATION_AMOUNT_60PERCENT:
            //rate = 0.60 * rate;
        	  rate = 0.60 * amount;
            break;
          case SWEET_CANCELLATION_AMOUNT_50PERCENT:
            //rate = 0.50 * rate;
        	  rate = 0.50 * amount;
            break;
          case SWEET_CANCELLATION_AMOUNT_37PERCENT:
            //rate = 0.375 * rate;
        	  rate = 0.375 * amount;
            break;
          case SWEET_CANCELLATION_AMOUNT_15PERCENT:
            //rate = 0.15 * rate;
        	  rate = 0.15 * amount;
            break;
          case SWEET_CANCELLATION_AMOUNT_25PERCENT:
            //rate = 0.25 * rate;
        	  rate = 0.25 * amount;
            break;
          default:
            throw nlapiCreateError('SWEET_INVALID_CANCELLATION_AMOUNT', "Invalid cancellation fee option.");
        }
        */
        rate = Math.round(rate * 1000) / 1000; // Round up to 3 decimals
        nlapiLogExecution('DEBUG', 'cancellation.rate=', rate);
        
        transaction.setLineItemValue('item', 'rate', i + 1, rate);
        
        // Job
        transaction.setLineItemValue('item', 'job', i + 1, jobId);
      }
      
    //Remove Travel Charges from job
	if(travelChargeLines && travelChargeLines.length > 0){
      var travelExpenses = '';
      var soLines = travelChargeLines.split("_").map(Number);
      // Find item linked to job
      var l = 1,position = 0, n = transaction.getLineItemCount('item')+1,index=1;	
      for (;l < n; l++) {
	    itemName = transaction.getLineItemValue('item', 'item_display',l);
        itemId = transaction.getLineItemValue('item', 'item',l);
        if((itemId) && (itemName ==  'Other Services : Other Services : Standard Service Charge : Standard Service Charge : Travel : London (�40)') || ( itemName ==  'Other Services : Other Services : Standard Service Charge : Standard Service Charge : Travel : New York City ($40)') ){
          position++;
		  if(soLines.indexOf(position) != -1){
		    transaction.removeLineItem('item', l);
                    travelExpenses += index+'.'+itemName+'\n\n';
                    index++;
		    l--;
		    n--;
		  }
        }
      }
	}
    // Save
    nlapiSubmitRecord(transaction,true,true);
    }
    
    //Grab Coach Paid flag from UI and set it on Booking record
    job.setFieldValue('custentity_bo_bonuscancellation', request.getParameter('custpage_coachpaid'));
    
    // Cancel booking
    job.setFieldValue('custentity_bo_cancellationreason', reason);
    job.setFieldValue('custentity_bo_cancellationfee', fee);
    //9/4/2014 - Set Cancellation Initiator back on booking record
    job.setFieldValue('custentity_bo_cancellationinitiator',reqCanInit);
    
    job.setFieldValue('custentity_bo_iscancelled', 'T');
    var currentDate = new Date();
    job.setFieldValue('custentity_bo_cancellationdate', nlapiDateToString(currentDate));
    
    //Issue with some users missing Buyer field value.
    nlapiLogExecution('debug','Original Buyer value from Job', jobBuyerValue);
    if (jobBuyerValue) {
    	job.setFieldValue('custentity_bo_buyer',jobBuyerValue);
    }
    
    //8/19/2015 - Tix 4439 Add User who cancelled the booking
    job.setFieldValue('custentity_bo_cancelledby',nlapiGetContext().getUser());
    job.setFieldValue('custentity_temp_bo_cancellationfee', impactAmount);
    
    nlapiSubmitRecord(job,true,true);
 
    //Sending email only if enddate <= today 
var edateStr= job.getFieldValue('enddate');
if(edateStr && edateStr.length > 0)
{
    var today = new Date();	
	var jobEndDate = nlapiStringToDate(edateStr);
		
    nlapiLogExecution('DEBUG', 'End date',jobEndDate );
    nlapiLogExecution('DEBUG', 'Today',today);
    nlapiLogExecution('DEBUG', 'Send Email',today >= jobEndDate);
	
    if(today >= jobEndDate)
    {
        // Load employee record
        var employeeId = nlapiGetUser();
        var employee = nlapiLoadRecord('employee', employeeId);
        // Send email notification
        var bookingNum = job.getFieldValue('entityid');
        var empEmail = employee.getFieldValue('email');
        var subject = 'Booking #' + bookingNum + ' is cancelled'; 
        body = employee.getFieldValue('firstname') + ' ' + employee.getFieldValue('lastname') + ' cancelled the Booking  ' + bookingNum + '.\n';  
		
		
        if(today.getFullYear() == jobEndDate.getFullYear() && today.getMonth() == jobEndDate.getMonth() && today.getDate() == jobEndDate.getDate()){
             body += 'Booking date is same as cancellation date.\n\n\n';			
		}
        else{
             body +='Booking date is in the past.\n\n\n';			
		}
			 
        if(travelExpenses)
		{      
			  body += 'The following Travel Expenses are removed from Sales Order  '+ transaction.getFieldValue('tranid')+'\n\n';
			  body += travelExpenses;
		}
		
		var recipients = 'Invoices@themindgym.com;';
		recipients += empEmail; 
		nlapiSendEmail(employeeId, recipients, subject, body);
    }
}
    // Redirect to job record
    nlapiSetRedirectURL('RECORD', 'job', jobId);
  }
  
  // Prepare to read results
  var transactionType = job.getFieldValue('custentity_bo_isprovisional') == 'T' ? 'estimate' : 'salesorder';
  var multipleTransactions = false;
  var lastTransaction = null;
  var salesOrder,sNo=''; 
  
  // Build form
  var form = nlapiCreateForm('Cancel Booking', false);
  
  // Go back
  var url = nlapiResolveURL('RECORD', 'job', jobId);
  var onClick = "window.location.href='" + url + "'";
  form.addButton('custpage_goback', 'Go Back', onClick);

  if(searchResults){
    var i = 0, n = searchResults.length;
    var items=[]
    for (; i < n; i++) {
	
	  // Break loop if multiple transactions are found
      if (searchResults[i].getRecordType() == transactionType) {
        if (lastTransaction != null && lastTransaction != searchResults[i].getId()) {
          multipleTransactions = true;
          break;
        }else {
          lastTransaction = searchResults[i].getId();
        }
      }
	  if (searchResults[i].getRecordType() == 'salesorder') {
		salesOrder = nlapiLoadRecord('salesorder', searchResults[i].getId());	
		nlapiLogExecution('DEBUG', 'SALES ORDER ID', searchResults[i].getId());
        // Find items linked to job
        var j = 1, m = salesOrder.getLineItemCount('item') + 1,itemName,itemId;
		for (; j < m; j++) {
	      itemName = salesOrder.getLineItemValue('item', 'item_display',j);
	      nlapiLogExecution('DEBUG', 'ITEM_DISPLAY', itemName);
          itemId = salesOrder.getLineItemValue('item', 'item',j);
          nlapiLogExecution('DEBUG','ITEM ID', itemId);
	      if((itemId) && (itemName ==  'Other Services : Other Services : Standard Service Charge : Standard Service Charge : Travel : London (�40)') || ( itemName ==  'Other Services : Other Services : Standard Service Charge : Standard Service Charge : Travel : New York City ($40)') ){
			items.push( { "itemname": itemName });
	      }
		} 
	  }
    }
  }

  // Display message if multiple transactions are found
  if (multipleTransactions) {
    var multipleTransactionsMsg = form.addField('multipletransactionsmsg', 'inlinehtml', 'multipleTransactions');
    multipleTransactionsMsg.setDefaultValue("You can't cancel this booking because it is linked to multiple transactions.");
  } else {
    var stage = (request.getParameter('stage') == null) ? 'start' : request.getParameter('stage');
  
    // Job field
    var jobField = form.addField('jobid', 'select', 'Booking', 'job');
    jobField.setDefaultValue(job.getId());
    jobField.setDisplayType('inline');
    jobField.setLayoutType('normal', 'startcol');
  
    // Reason field
    var reasonField = form.addField('reason', 'select', 'Reason', 'customlist_bo_cancellationreason');
    reasonField.setMandatory(true);
  
    // Cancellation fee field
    //11/1/2014 - Ticket #49: Do not allow Cancellation amount to be edited.
    //USE NEW Custom Record version of Cancellation Amount created for this purpose
    var cflt = [new nlobjSearchFilter('isinactive', null,'is','F')];
    var ccol = [new nlobjSearchColumn('internalid'),
                new nlobjSearchColumn('custrecord_cancel_displayorder').setSort(),
                new nlobjSearchColumn('name')];
    var crs = nlapiSearchRecord('customrecord_bo_new_cancellationamount', null, cflt, ccol);
    var feeField = form.addField('fee', 'select', 'Cancellation Fee', null);
    feeField.setMandatory(true);
    feeField.addSelectOption('', '', true);
    //loop through result and add the value
    for (var i=0; crs && i < crs.length; i++) {
    	feeField.addSelectOption(crs[i].getValue('internalid'), crs[i].getValue('name'), false);
    }
    
    
    //9/4/2014 - Request to add List/BO Cancellation Initiator as one of the option 
    var canInitField = form.addField('custpage_caninitor','select','Cancellation Initiator', 'customlist_bo_cancellationinitiator');
    canInitField.setMandatory(true);
    canInitField.setDefaultValue(job.getFieldValue('custentity_bo_cancellationinitiator'));
    
    //11/8/2014 request - Add Coach Paid Flag to sync with booking record
    form.addField('custpage_coachpaid','checkbox','Coach to be Paid',null,null);
    
    
    // Stage (hidden) field
    var stageField = form.addField('stage', 'text');
    stageField.setDefaultValue('process');
    stageField.setDisplayType('hidden');
 
    // Buttons
    // form.addSubmitButton('Cancel Now'); 
    if(salesOrder)
     sNo = ' - '+salesOrder.getFieldValue('tranid');
  
    // Travel Details
    var sublist = form.addSubList('sublist','staticlist', 'Travel Expenses'+sNo);
    sublist.addField('select', 'checkbox', 'Select');
    sublist.addField('itemname', 'text', 'Item Name');
    sublist.setLineItemValues(items); 
    var lineCount = sublist.getLineItemCount();
  
    // Line Items Count(hidden) field
    var lineItemCount = form.addField('linecount', 'text', 'lineCount');
    lineItemCount.setDefaultValue(lineCount);	
    lineItemCount.setDisplayType('hidden');	
  
    // Cancel Button
    var cancelBtnOnClick = "var lineCount = document.getElementById('linecount').value;";
    cancelBtnOnClick += "var trchrg= document.getElementById('jobid');";
    cancelBtnOnClick += "var trchrgval= document.getElementById('jobid').value;";

    //S>>resetting job
    cancelBtnOnClick += "var temp = trchrgval;";
    cancelBtnOnClick += " var idx = temp.indexOf('_');";
    cancelBtnOnClick += "if(idx > 0){";
    cancelBtnOnClick += "trchrgval=temp.substring(0,idx);}";
    cancelBtnOnClick += "for(var i=1;i<=lineCount;i++) { ";
    cancelBtnOnClick += "var cancelBtn = document.getElementById('select'+ i);";
    cancelBtnOnClick += "if(cancelBtn.checked)trchrgval+= '_'+i;";
    cancelBtnOnClick += "}";
    cancelBtnOnClick += "trchrg.value = trchrgval; ";
    cancelBtnOnClick += "window.onbeforeunload = function() { }; ";
    cancelBtnOnClick += "this.form.submit();";
    form.addButton('custpage_cancel', 'Cancel Now', cancelBtnOnClick);
  }
  response.writePage(form);
}