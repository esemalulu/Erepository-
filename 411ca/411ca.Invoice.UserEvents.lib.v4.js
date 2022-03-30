/****************************************************************************************************************
						INVOICE USER EVENTS																		*
																												*
						Author: Matt Wise																		*
						Date: March 2012																		*
						411.ca local search corp																*
																												*
																												*	
*****************************************************************************************************************
*//**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Aug 2012     MWise
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function OnBeforeSubmit(type) {
}


function emailAaron(coname, pl){
	var body = "Customer: " + coname + "\n\nPL# "+ pl; 
	nlapiSendEmail(nlapiGetUser(), EMPLOYEE_AROSENBLUM, "Google Invoice Created", body+'\n\n', null, null);
}


function afterSubmitInvoice(type){
	
	var rtype = nlapiGetRecordType();
	var thisId = nlapiGetRecordId();
	nlapiLogExecution('Debug', 'START ' + '(' + type + ' ' + rtype + ') id=', thisId);

	
	
	initialize();
	var custpl = ''; 
	if (type=='create'||type=='edit'){
		try {
			
			var rec = nlapiLoadRecord(rtype, thisId, {recordmode: 'dynamic'});
			var isRecUpdated = false;
			//var rec = nlapiGetNewRecord();
			
			var cx = rec.getFieldValue('entity');
			
			var item = '';
			var webpacktext = '';
			var bill = true;
			var itemprice = 0;
			var taxcode = getCustomerTaxCode(cx);
			var custObj = nlapiLoadRecord('customer', cx);
			var coname = custObj.getFieldValue('companyname');
			var pl = custObj.getFieldValue('custentity411custid');
			custpl = pl;
			
			
			
			nlapiLogExecution("Debug", "On AFTER Submit for cx "+ coname, "START...");
			
			// Calculate "Due Date"
			try {
				var dueDate = rec.getFieldValue('duedate');
				var dueDateNew = nlapiDateToString(getInvoiceDueDate(nlapiStringToDate(rec.getFieldValue('trandate'), 'date'), custObj.getFieldValue('custentity_monthlybillingday')));
				if (dueDate != dueDateNew) {
					nlapiLogExecution("Debug", "Due Date update", dueDate + ' -> ' + dueDateNew);
					rec.setFieldValue('duedate', dueDateNew);
					isRecUpdated = true;
				}
			} catch (e) {
				nlapiLogExecution("Error", "Due Date update", e);
			}
			
			
			nlapiLogExecution("Debug", "Customer Tax Code+", taxcode);
			
			//Check and repair tax codes based on customer tax code
			var nlines= rec.getLineItemCount('item');
			nlapiLogExecution("Debug", "Number of line items", nlines);
			for (var z=1; z<=nlines; z++){
				var linetaxcode = rec.getLineItemValue('item', 'taxcode', z);
				//nlapiLogExecution("Debug", "taxcode is : " +  linetaxcode, "on line: " + z);
				if (linetaxcode!=taxcode){
					nlapiLogExecution("Debug", "Taxcode: " + linetaxcode + ", on Line:" + z + " on Invoice not same as cust tax code: " + taxcode, "UPDATING!");
					rec.selectLineItem('item', z);
					rec.setCurrentLineItemValue('item', 'taxcode', taxcode)	;
					rec.commitLineItem('item');
					
					isRecUpdated = true;
					
					nlapiLogExecution("Debug", "Taxcode: " + linetaxcode + ", on Line:" + z + " on Invoice not same as cust tax code: " + taxcode, "RECORD UPDATED");
				}
				
				item = rec.getLineItemValue('item', 'item', z);
				if (	item==ITEM_GOOGLE_ADS85_recur || item==ITEM_GOOGLE_ADS135_recur|| item==ITEM_GOOGLE_ADS200_recur|| 
						item==ITEM_GOOGLE_ADS300_recur|| item==ITEM_GOOGLE_ADS500_recur ||   
						item==ITEM_GOOGLE_ADBASIC_recur || item==ITEM_GOOGLE_ADSTANDARD_recur||  
						item==ITEM_GOOGLE_ADEXTREME_recur || item==ITEM_GOOGLE_ADADVANCED_recur ){
					//emailAaron(coname, pl);
				}
				
			}
			
						

			// Website/mobile product billing
			var vbo = new NS411VBO(rec);
			// VBO Logic is enabled for new sales on or after Dec 13, 2013
			if (vbo.isEnabled()) {
			
				// "On Create" only
				if (type == 'create') {
					vbo.update();
				}
				
				// Submit changes (don't submit if we did it with the VOB update)
				if ((! vbo.isSaved()) && isRecUpdated) {
					nlapiSubmitRecord(rec);
				}
			
			} else {
			// Use legacy website/mobile product billing logic
		
			if ( custObj.getFieldValue('custentity_website_automatedbilling')=='T'  && custObj.getFieldValue('custentity_websiterevoked')!='T' && custObj.getFieldValue('custentity_onecentinvoice')!='T' && custObj.getFieldValue('custentity_cxdeclinedwebsite')!='T'){

				nlapiLogExecution("Debug", "Automated website billing customer "+ cx, "processing...");
					//make sure this invoice doesn't have web charges already
				var nlines= rec.getLineItemCount('item');
				for (var z=1; z<=nlines; z++){
					item = rec.getLineItemValue('item', 'item', z);
					if (item==ITEM_WEBSITEPACKAGE_Gold_new || item==ITEM_WEBSITEPACKAGE_Silver_new || item==ITEM_WEBSITEPACKAGE_Copper_new ||
						item==ITEM_WEBSITEPACKAGE_Gold_recur || item==ITEM_WEBSITEPACKAGE_Silver_recur || item==ITEM_WEBSITEPACKAGE_Copper_recur ||
						item==ITEM_WEBSITEPACKAGE_Platinum_recur || item==ITEM_WEBSITEPACKAGE_Platinum_recur || item==ITEM_WEBSITE_site || item==ITEM_WEBSITE_site_InvokeToUpsell ||
						item==ITEM_GOOGLE_ADS85_recur || item==ITEM_GOOGLE_ADS135_recur|| item==ITEM_GOOGLE_ADS200_recur|| 
						item==ITEM_GOOGLE_ADS300_recur|| item==ITEM_GOOGLE_ADS500_recur ||   
						item==ITEM_GOOGLE_ADBASIC_recur || item==ITEM_GOOGLE_ADSTANDARD_recur||  
						item==ITEM_GOOGLE_ADEXTREME_recur || item==ITEM_GOOGLE_ADADVANCED_recur || 
						item == ITEM_MOBILEWEBSITE_new || item == ITEM_MOBILEWEBSITE_recur ){
						bill = false;
					}
					
				}							
				if (bill){
					var mobilewebsite = custObj.getFieldValue("custentity_websitemobile");
					var webprice = parseFloat(custObj.getFieldValue("custentity_website_price"));
					var webpack = custObj.getFieldValue("custentity_websitepackage");
					var fmonthbilled = custObj.getFieldValue("custentity_website_firstmonthbilled");
					var secondlist = custObj.getFieldValue('custentity_website_secondlist');
					webpacktext = '';
					itemprice = 0;
				
					if (mobilewebsite=='T'){
						if (secondlist=='T'&&fmonthbilled!='T'){
							item = ITEM_MOBILEWEBSITE_new;
							custObj.setFieldValue('custentity_website_firstmonthbilled','T');
							nlapiSubmitRecord(custObj);
						}
						else{
							item = ITEM_MOBILEWEBSITE_recur;	
						}	
						webpacktext = "Mobile Website";
						if (webprice!=null&&webprice!=''&&webprice>0){
							itemprice = webprice;
						}
						else{
							itemprice = 15;
						}
					}
					else{
						switch (webpack) {
							
						case WEBSITEPACKAGE_Copper : 	
							if (secondlist=='T'&&fmonthbilled!='T'){
								item = ITEM_WEBSITEPACKAGE_Silver_new;
								custObj.setFieldValue('custentity_website_firstmonthbilled','T');
								nlapiSubmitRecord(custObj);
							}
							else{
								item = ITEM_WEBSITEPACKAGE_Silver_recur;	
							}	
							webpacktext = "Website Silver";
							itemprice = 30;
							break;
		
						case WEBSITEPACKAGE_Silver : 	
							if (secondlist=='T'&&fmonthbilled!='T'){
								item = ITEM_WEBSITEPACKAGE_Silver_new;
								custObj.setFieldValue('custentity_website_firstmonthbilled','T');
								nlapiSubmitRecord(custObj);
							}
							else{
								item = ITEM_WEBSITEPACKAGE_Silver_recur;	
							}	
							webpacktext = "Website Silver";
							itemprice = 30;
							break;
						
						case WEBSITEPACKAGE_Gold 	: 	
							if (secondlist=='T'&&fmonthbilled!='T'){
								item = ITEM_WEBSITEPACKAGE_Gold_new;
								custObj.setFieldValue('custentity_website_firstmonthbilled','T');
								nlapiSubmitRecord(custObj);
							}
							else{
								item = ITEM_WEBSITEPACKAGE_Gold_recur;
							}	
							webpacktext = "Website Gold";
							itemprice = 45;
							break;
						
						case WEBSITEPACKAGE_Platinum 	:	
							if (secondlist=='T'&&fmonthbilled!='T'){
								item = ITEM_WEBSITEPACKAGE_Platinum_new;
								custObj.setFieldValue('custentity_website_firstmonthbilled','T');
								nlapiSubmitRecord(custObj);
							}
							else{
								item = ITEM_WEBSITEPACKAGE_Platinum_recur;
							}	
							webpacktext = "Website Platinum";
							itemprice = 65;
							break;
						
						default	: 	
							if (secondlist=='T'&&fmonthbilled!='T'){
								item = ITEM_WEBSITEPACKAGE_Silver_new;
								custObj.setFieldValue('custentity_website_firstmonthbilled','T');
								nlapiSubmitRecord(custObj);
							}
							else{
								item = ITEM_WEBSITEPACKAGE_Silver_recur;
							}	
							
							webpacktext = "Website Silver";
							itemprice = 30;
							break;								
						}
					}
					
					
					rec.selectNewLineItem('item');
					rec.setCurrentLineItemValue('item', 'item', item);
					rec.setCurrentLineItemValue('item', 'rate', itemprice);
					
					if (taxcode!=null&&taxcode!=''){
						rec.setCurrentLineItemValue('item', 'taxcode', taxcode)	;
					}
					
					rec.commitLineItem('item');
					var pricetext = '  ';
					
					if (webprice!=''&&webprice!=null&&webprice>0){
						if (webprice<itemprice){
							var disc = itemprice-webprice;
							pricetext = " with a discount of $"+ disc;
							rec.selectNewLineItem('item');
							rec.setCurrentLineItemValue('item', 'item', ITEM_DISCOUNT_WEBSITE_Recur);
							if (secondlist=='T'&&fmonthbilled!='T'){
								rec.setCurrentLineItemValue('item', 'item', ITEM_DISCOUNT_WEBSITE_New);
							}
							rec.setCurrentLineItemValue('item', 'rate', 0-disc);
					
							if (taxcode!=null&&taxcode!=''){
								rec.setCurrentLineItemValue('item', 'taxcode', taxcode)	;
							}
					
							rec.commitLineItem('item');
						}
					}	
					var today = new Date();
					addnote("WEBSITE BILLING", "A Website charge for " + webpacktext + " @ $" + itemprice + pricetext + " was added to the invoice dated "+ nlapiDateToString(today) + ' ('+coname+', '+pl+')', nlapiGetUser(), cx );
				}
			}
			
			try {
				var addMPPI = true;
				var mppi_bucket = custObj.getFieldValue('custentity_mpi2013_bucket');
				var mppi_price = custObj.getFieldValue('custentity_mpi_amount');
				var mppi_firstmonthbilled = custObj.getFieldValue('custentity_mpi_firstmonthbilled');
				
				
				var nlines= rec.getLineItemCount('item');
				for (var z=1; z<=nlines; z++){
					item = rec.getLineItemValue('item', 'item', z);
					if (item==ITEM_MPPI_NEW || item==ITEM_MPPI_RECUR|| 	item==ITEM_GOOGLE_ADS85_recur || 
						item==ITEM_GOOGLE_ADS135_recur || item==ITEM_GOOGLE_ADS200_recur || 
						item==ITEM_GOOGLE_ADS300_recur || item==ITEM_GOOGLE_ADS500_recur	||   
						item==ITEM_GOOGLE_ADBASIC_recur || item==ITEM_GOOGLE_ADSTANDARD_recur ||  
						item==ITEM_GOOGLE_ADEXTREME_recur || item==ITEM_GOOGLE_ADADVANCED_recur){
						addMPPI = false;
					}
				}							
						
				if (addMPPI&&mppi_price>0){
					var itemtoadd;
					if (mppi_firstmonthbilled=='T'){
						itemtoadd = ITEM_MPPI_RECUR;
					}
					else{
						itemtoadd = ITEM_MPPI_RECUR;
						//itemtoadd = ITEM_MPPI_NEW;
						custObj = nlapiLoadRecord('customer', cx);
						custObj.setFieldValue('custentity_mpi_firstmonthbilled','T');
						nlapiSubmitRecord(custObj);
					}
					
					rec.selectNewLineItem('item');
					rec.setCurrentLineItemValue('item', 'item', itemtoadd);
					rec.setCurrentLineItemValue('item', 'rate', mppi_price);
					if (taxcode!=null&&taxcode!=''){
						rec.setCurrentLineItemValue('item', 'taxcode', taxcode)	;
					}
					rec.commitLineItem('item');
					var today = new Date();
					addnote("MOBILE PROD BILLING", "A Mobile Product charge for $" + mppi_price + " was added to the invoice dated "+ nlapiDateToString(today) + ' ('+coname+', '+pl+')', nlapiGetUser(), cx );
				}
				
				nlapiSubmitRecord(rec);
				
			}
			catch (e) {
				nlapiLogExecution("Debug", "ADD MPPI", e);
			}
			
			}
			
			// contractor promo
			var recPromo = nlapiLoadRecord(rtype, thisId, {recordmode: 'dynamic'});
			var cPromo = new contractorPromo(recPromo);
			if(cPromo.isAvailable()){
				cPromo.applyPromo();
			}

			/********************** AUX Update *******************************************/
			rec = nlapiLoadRecord(rtype, thisId, {recordmode: 'dynamic'});
			if (rec.getFieldValue('custbody_ax_createdviamemtrx') == 'T' && rtype=='invoice' && type=='create') {
				log('debug','Invoice ID mem trx', rec.getId()+' // '+rec.getFieldValue('custbody_ax_createdviamemtrx'));
				//log('debug','After Submit Generated via memtrx on '+type,rec.getFieldValue('entryformquerystring')+' // '+rec.getFieldValue('custbody_ax_createdviamemtrx'));
				
				//find matching baseline and update with value and invoice referennce
				
				//5/21/2014 - Make sure to process this Invoice and update base line when it's ONLY Marked as Paid and total value of 0
				//TODO: If this requirement still needs to be mett, update will should occur in new UE.
				/**
				 * Removed so that Baseline is properly updated.
				 * Code is added below to 0 out baseline value if retention is cancelled.
				if (parseInt(rec.getFieldValue('total')) == 0 || rec.getFieldValue('status') == 'Open' ) {
					log('debug','Invoice 0 or Unpaid','Invoice '+nlapiGetFieldValue('tranid')+' is valued at 0 or is still OPEN');
					return;
				}
				*/
				
				try {
					log('debug','customer',rec.getFieldValue('entity'));
					//1. get list of all base line for this customer.
					var bflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
					            new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof',rec.getFieldValue('entity'))];
					var bcol = [new nlobjSearchColumn('internalid').setSort(),
					            new nlobjSearchColumn('custrecord_abmrr_item'), 
					            new nlobjSearchColumn('custrecord_abmrr_itemcategory'),
					            new nlobjSearchColumn('custrecord_abmrr_linevalue'),
					            new nlobjSearchColumn('custentity_ax_retentionstatus','custrecord_abmrr_customer'),
					            new nlobjSearchColumn('custentity_retcancelrequestresolution','custrecord_abmrr_customer')];
					var brs = nlapiSearchRecord('customrecord_ax_baselinecustassets', null, bflt, bcol);
					
					var blinejson = {};
					
					//grab cancelled status from company parameters
					var paramRetExitStatusLost = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost');
					var paramRetExitStatusLost10 = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost10');
					var paramRetResCancelled = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_rescancelled');

					var isCancelled = false;
					
					for (var j=0; brs && j < brs.length; j++) {
						var blineItemId = brs[j].getValue('custrecord_abmrr_item');
						var blineItemCategory = brs[j].getValue('custrecord_abmrr_itemcategory');
						var blineId = brs[j].getId();
					
						var axRetStatus = brs[j].getValue('custentity_ax_retentionstatus','custrecord_abmrr_customer');
						var legResStatus = brs[j].getValue('custentity_retcancelrequestresolution','custrecord_abmrr_customer');
						
						//Compare to see if audaxium retention status is any of Cancelled OR legacy final resultion status is cancelled.
						if ( axRetStatus == paramRetExitStatusLost || axRetStatus == paramRetExitStatusLost10 || legResStatus == paramRetResCancelled) {
							isCancelled = true;
						}
						
						blinejson[blineItemId]={
							'id':blineId,
							'category':blineItemCategory
						};
					}
					
					//log('debug','blinejson',JSON.stringify(blinejson));
					
					//2. get list of all items and calculate total line value with discount
					//TEST
					//3088253
					//var inv  = nlapiLoadRecord('invoice','3088253');
					var itemjson = {};
					
					log('debug','Inv '+rec.getId(),'Line Count: '+rec.getLineItemCount('item'));
					
					//Get Final Item Json for updating baseline with per line discount calculation
					for (var i=1; i <= rec.getLineItemCount('item'); i++) {
						
						var itemType = rec.getLineItemValue('item','itemtype',i);
						var itemId = rec.getLineItemValue('item','item',i);
						var itemAmt = rec.getLineItemValue('item','amount',i);
						var itemCat = rec.getLineItemValue('item','custcol_ax_itemcat_col',i);
						var itemDiscLine = rec.getLineItemValue('item', 'discline', i);
						
						log('debug','line // item // item cat',i+' // '+itemId+' // '+itemCat);
						
						//Make sure to ignore EndGroup line
						if (itemType != 'EndGroup') {
							
							if (itemCat) {
								itemjson[i]={
									'id':itemId,
									'amount':(itemAmt)?itemAmt:0.0,
									'category':itemCat
								};
								
							} else if (itemDiscLine && itemjson[itemDiscLine]) {
								//if item Discount line value is set, subtract the amount from disc line referenced
								var discountAmount = parseFloat(itemAmt);
								itemjson[itemDiscLine].amount = parseFloat(itemjson[itemDiscLine].amount) + discountAmount;
							}					
						}
					}
					
					//log('debug','itemjson',JSON.stringify(itemjson));
					
					//go through each item Json and update or create.
					for (var l in itemjson) {
						var updItemId = itemjson[l].id;
						
						//If Account is cancelled based on retention status (AUX and Legacy), set the value to 0
						var lineValue = itemjson[l].amount;
						if (isCancelled) {
							lineValue = 0.0;
						}
						
						//update or create. Create will almost least likely to be the case but add just in case
						if (blinejson[updItemId]) {
							//Update Item line with current values
							var updflds = ['custrecord_abmrr_itemcategory','custrecord_abmrr_linevalue','custrecord_abmrr_invref'];
							var updvals = [itemjson[l].category, lineValue, rec.getId()];
							nlapiSubmitField('customrecord_ax_baselinecustassets', blinejson[updItemId].id, updflds, updvals, true);
						} else {
							//Create NEW Recorod
							var blinerec = nlapiCreateRecord('customrecord_ax_baselinecustassets');
							blinerec.setFieldValue('custrecord_abmrr_customer',rec.getFieldValue('entity'));
							blinerec.setFieldValue('custrecord_abmrr_item',updItemId);
							blinerec.setFieldValue('custrecord_abmrr_itemcategory',itemjson[l].category);
							blinerec.setFieldValue('custrecord_abmrr_linevalue',lineValue);
							blinerec.setFieldValue('custrecord_abmrr_startdate',nlapiDateToString(new Date()));
							blinerec.setFieldValue('custrecord_abmrr_invref',rec.getId());
							nlapiSubmitRecord(blinerec, true, true);
						}
					}
				} catch (blerr) {
					log('error','Error syncing Baseline',getErrText(blerr));
				}
			}
			/****************************************************************************************/
			
		}catch (e){
			nlapiLogExecution("Error", "On After Submit for cx "+custpl, e);
		}
	}
	
	
}

function contractorPromo(invoiceObj){
	if (! invoiceObj) throw "Please provide an invoice object";

	var inv = invoiceObj;
	var promo = inv.getFieldValue('custbody_promo');
	var invDate = nlapiStringToDate(inv.getFieldValue('trandate'), 'date');

	this.isAvailable = function() {
		if(promo === '1'){
			var m = invDate.getMonth();
			// between nov [10] and apr [3]
			return (m <= 3 || m >= 10);
		}
		
		return false;
	};
	
	this.applyPromo = function() {
		var subtotal = inv.getFieldValue('subtotal');

		nlapiSubmitField('invoice', inv.getFieldValue('id'), ['discountitem', 'discountrate'], [512, 5.0 - subtotal]);
		nlapiLogExecution("Debug", "Contractor Promo", 'inovice [id:' + inv.getFieldValue('id') + ', discount: ' + (5.0 - subtotal) +']');
	};

	this.getInvoice = function() {
		return inv;
	};
	
}

function NS411VBO(invoiceObj) {

	if (! invoiceObj) throw "Please provide an invoice object";

	var inv = invoiceObj;
	var isUpdated = false;
	var isSaved = false;
	
	var invId = inv.getFieldValue('id');
	var invDate = nlapiStringToDate(inv.getFieldValue('trandate'), 'date');
	var invMonthFirstDay = nlapiStringToDate(inv.getFieldValue('trandate'), 'date');
	invMonthFirstDay.setDate(1);
	
	//nlapiLogExecution("Debug", "VBO Logic", 'INV:' + invId + ' CSD:' + inv.getFieldValue('custbody_contractstartdate'));
	
	
	// Contract (last sale) date
	var contractStartDate = nlapiStringToDate(inv.getFieldValue('custbody_contractstartdate'), 'date');
	if (contractStartDate == null || isNaN(contractStartDate)) {
		contractStartDate = new Date();
	}

	// VBO Billing start date (contract date + 2 months)
	var billingStartDate = nlapiAddMonths(contractStartDate, 2);
	billingStartDate.setDate(1);
	

	this.getInvoice = function() {
		return inv;
	}
	
	this.isEnabled = function() {
		// VBO Logic is enabled for new sales on or after Dec 13, 2013
		if (contractStartDate >= (new Date(2013, 11, 13, 0, 0, 0, 0))) {
			return true;
		}
		
		return false;
	}
	
	this.isUpdated = function() {
		return isUpdated;
	}
	
	this.isSaved = function() {
		return isSaved;
	}
	
	this.update = function() {
		if (this.isEnabled()) {
			// Time to bill?
			if (invMonthFirstDay >= billingStartDate) {
				nlapiLogExecution("Debug", "VBO Logic", 'INV:' + invId + ' START');
				
				try {
				
					var nlines = inv.getLineItemCount('item');
					nlapiLogExecution("Debug", "VBO Logic", "# lines: " + nlines);
					
					// Check and remove discount items
					for (var z = nlines; z >= 1; z--) {
					
						var item = inv.getLineItemValue('item', 'item', z);
						if (
							item == ITEM_VBO_DISCOUNT_Website_Mobile_new
							|| item == ITEM_VBO_DISCOUNT_Website_Silver_new
							|| item == ITEM_VBO_DISCOUNT_Website_Silver20_new
							
							|| item == ITEM_VBO_DISCOUNT_Website_Mobile_rec
							|| item == ITEM_VBO_DISCOUNT_Website_Silver_rec
							|| item == ITEM_VBO_DISCOUNT_Website_Silver20_rec
							) {
							nlapiLogExecution("Debug", "VBO Logic", "Removing item: " + item + ' Line: ' + z);
							
							inv.removeLineItem('item', z);
							isUpdated = true;

							nlapiLogExecution("Debug", "VBO Logic", "Item removed: " + item + ' Line: ' + z);
						}

					}
					
					// Save invoice
					if (isUpdated) {
						nlapiSubmitRecord(inv);
						isSaved = true;
					}
				
				} catch (e) {
					nlapiLogExecution("Error", "VBO Logic", e);
				}
				
				nlapiLogExecution("Debug", "VBO Logic", 'INV:' + invId + ' END');
			}
			
			return true;
		}
		
		return false;
	}
}


