/**
 * Export Bill Payment lines to CSV.
 * 
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */


define(['N/record','N/search','N/file', 'N/render'],
/**
 * @param {billPaymentRecord} billPaymentRecord
 * @param {plugin} plugin
 */
function(record, search, file, render) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	
    	var recId = context.request.parameters.recid;
    	var LINE_BREAK = '\r\n';
    	
    	var header = 'Date,Description,Orig. Amount,Amount Due,Discount,Applied Amount'+LINE_BREAK
    	var billString = '';

    	var credits = [];
    	
    	var billPaymentRec  = record.load({type: record.Type.VENDOR_PAYMENT,id: recId,isDynamic: true});
    	var docNum = billPaymentRec.getValue({fieldId: 'tranid'});
    	
    	var lineCount = billPaymentRec.getLineCount({
    	    sublistId: 'apply'
    	});
    	
    	var creditLine = '';
    	
    	// loop through the bill payment to get the bills data and internal id for a search of all bills.
    	var billLineDataArray = new Array();
    	var billObject = new Object();
    	var billIdsArray = new Array();
    	for(var i = 0; i < lineCount; i++) {
        	billPaymentRec.selectLine({
        		sublistId: 'apply',
        		line: i
        	});
        	
        	if(billPaymentRec.getCurrentSublistText({sublistId: 'apply',fieldId: 'apply'}) == 'T') {
        		billObject.billId = billPaymentRec.getCurrentSublistValue({sublistId: 'apply',fieldId: 'internalid'});
        		billIdsArray.push(billObject.billId);
        		billObject.type = billPaymentRec.getCurrentSublistValue({sublistId: 'apply',fieldId: 'type'});
        		billObject.origAmt = billPaymentRec.getCurrentSublistValue({sublistId: 'apply',fieldId: 'total'});
        		billObject.amtDue = billPaymentRec.getCurrentSublistValue({sublistId: 'apply',fieldId: 'due'}); 
        		billObject.disc = -billPaymentRec.getCurrentSublistValue({sublistId: 'apply',fieldId: 'disc'});
        		billObject.refnum = billPaymentRec.getCurrentSublistValue({sublistId: 'apply',fieldId: 'refnum'});
        		billObject.appAmt = billObject.origAmt + billObject.disc; // original amount, with the discount taken off. We add because disc is negative. 
        		billObject.billDate = null;
        		billObject.billLinksArray = [];
        		billLineDataArray.push(billObject);
        		billObject = {};
        	}
    	}
    	
    	// Search for bills to get their transaction date to show on the CSV file
    	var arrIndex = -1;
    	var billLinksObject = new Object();
    	var billResultData = search.create({
            type: search.Type.VENDOR_BILL,
            filters: [
                       ["internalid","anyof",billIdsArray]
                     ],
            columns: [
                      search.createColumn({name: "trandate", label: "Date"}),
                     ]
        }).runPaged();
    	billResultData.pageRanges.forEach(function(pageRange){
    		billResultData.fetch({index: pageRange.index}).data.forEach(function(result){
    			arrIndex = GetIndex(billLineDataArray, 'billId', result.id);
    			if (billLineDataArray[arrIndex].billDate == null) {
    				billLineDataArray[arrIndex].billDate = result.getValue({name: 'trandate'});
    			}

                return true;
            });
        });
    	
    	var billsArray = new Array();
    	
    	// Create the bill string of the CSV
    	for(var i = 0; i < billLineDataArray.length; i++) {
    		// date should be the transaction date on the bill, not the due date, which is what shows on the sublist. 
    		billString += billLineDataArray[i].billDate // Date
        			+ ',' + billLineDataArray[i].type + '#' + billLineDataArray[i].refnum// Description
        			+ ',' + billLineDataArray[i].origAmt// Orig. Amount
        			+ ',' + billLineDataArray[i].origAmt// Amount Due (amount due on the printouts is always equal to orig amount. don't ask me why
        			+ ',' + billLineDataArray[i].disc// Discount
        			+ ',' + billLineDataArray[i].appAmt// Applied Amount is not the applied amt on the bill, it's orig amount - disc. 
        			+ LINE_BREAK;
    		
    		billsArray.push(billLineDataArray[i].type + ' #' + billLineDataArray[i].refnum);
    	}
    	
    	// Get the bill credits on the bill payment record using the render PDF template as this is the only way to get this data as of 2020.1 Release.
    	var vendorBillPaymentFile = render.transaction({
    		entityId: parseInt(recId),
    		printMode: render.PrintMode.HTML,
    		formId: 222,
    		inCustLocale: true
    	});
    	
    	// The form id 222 is a custom form for the bill payment record that is inactive but is used to generate the bill credits for the bill payment record.  The form Name is "GD Bill Payment (FOR SUITELET USE)"
    	// The advanced PDF Template set on this Bill Payment Transaction Form is "GD Bill Payment - Bill Credit Data Generator (script use only)" with script ID "CUSTTMPLGD_BILLPAYMENTBILLCREDITDATAGENERATOR"
    	// The advanced PDF template is very simple and constructs a JSON Array text of all the Bill Credits data.
    	// JSON Array model: [{"creditdate": "${credit.creditdate}", "type": "${credit.type}", "refnum": "${credit.refnum}", "appliedto": "${credit.appliedto}", "amount": "${credit.amount}"}]
    	var vendorBillPaymentsHTML = vendorBillPaymentFile.getContents();
		var vendorBillPaymentsHTMLSubstring = vendorBillPaymentsHTML.substring(vendorBillPaymentsHTML.indexOf('(firstIndex)') + 12, vendorBillPaymentsHTML.indexOf(',(lastIndex)')) + ']';
		var vendorBillCreditsArray = JSON.parse(vendorBillPaymentsHTMLSubstring);

		var creditRefNumObjects = new Object();
		
		// Create the bill credit object
		for(var i = 0; i < vendorBillCreditsArray.length; i++) {
			if (creditRefNumObjects.hasOwnProperty(vendorBillCreditsArray[i].refnum)) {
				creditRefNumObjects[vendorBillCreditsArray[i].refnum].amount += parseFloat(vendorBillCreditsArray[i].amount.replace('$', '').replace(',', ''));
			} else {
				creditRefNumObjects[vendorBillCreditsArray[i].refnum] = new Object({date: '', amount: 0});
				creditRefNumObjects[vendorBillCreditsArray[i].refnum].amount = parseFloat(vendorBillCreditsArray[i].amount.replace('$', '').replace(',', ''));
				creditRefNumObjects[vendorBillCreditsArray[i].refnum].date = vendorBillCreditsArray[i].creditdate;
			}
    	}
		
		// Add the bill credits to the CSV
		for (var property in creditRefNumObjects) {
			if (creditRefNumObjects.hasOwnProperty(property)) {
				creditLine = ''
					+ creditRefNumObjects[property].date // Date
					+',Bill Credit #' + property // Description
					+',,,' // Orig. Amount, Amount Due, Discount are all always empty for credits. 
					+',' +  -creditRefNumObjects[property].amount // Applied Amount
				
				credits.push(creditLine);
			}
		}

		// Create the bill credit string for the CSV
		for(var i = 0; i < vendorBillCreditsArray.length; i++) {
			// Only include vendor bill credits that are not on the Applied to section already.
			if (billsArray.indexOf(vendorBillCreditsArray[i].appliedto) == -1) {
				creditLine = ''
					+ vendorBillCreditsArray[i].creditdate // Date
					+',' + vendorBillCreditsArray[i].appliedto // Description
					+',,,' // Orig. Amount, Amount Due, Discount are all always empty for credits. 
					+',' + vendorBillCreditsArray[i].amount.replace('$', '').replace(',', ''); // Applied Amount
				
				credits.push(creditLine);
			}
		}
		
    	var creditString = '';
    	
    	for(k = 0; k < credits.length; k++)
    		creditString += credits[k] + LINE_BREAK;
    	
    	var contents = header + creditString + billString;
    	
		var fileObj = file.create({
			name: 'BillPayment'+docNum+'.csv',
		    fileType: file.Type.CSV,
		    contents: contents,
		});
		
		context.response.writeFile({
			file : fileObj,
		});
	}
    
    /**
     * Return the first index where the value is found from the array of objects, else return -1
     */
    function GetIndex(searchArray, key, value) {
        for (var i = 0; i < searchArray.length; i++) {
            if (searchArray[i][key] === value) {
                return i;
            }
        }
        return -1;
    }

    return {
        onRequest: onRequest
    };
    
});
