var licenseEndDates = new Array();
var arrCreatedOppIds = new Array();
var arrOrderContracts = null;
var objValidatedRefKeys = {};
var updatedLineItems = null;
/*
 * @author efagone
 */

// Array.prototype.filter polyfill
if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun/*, thisArg*/) {
      'use strict';
      if (this === void 0 || this === null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== 'function') {
        throw new TypeError();
      }
      var res = [];
      var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
      for (var i = 0; i < len; i++) {
        if (i in t) {
          var val = t[i];
          if (fun.call(thisArg, val, i, t)) {
            res.push(val);
          }
        }
      }
      return res;
    };
  }

function run_renewal_automation(objRADetails) {

    var salesOrderId = objRADetails.salesorder;
    var opportunityId = objRADetails.opportunity;
    var coTermWithOpp = objRADetails.cotermwith_opp;
    var coTermDate = objRADetails.coterm_date;
    var strLinesToSplit = objRADetails.str_linestosplit;
    var strLinesToKeep = objRADetails.str_linestokeep;
    var uplift = objRADetails.uplift;
    var workflow = objRADetails.workflow;
    var defaultCSM = objRADetails.defaultCSM;

    licenseEndDates = new Array();
    arrCreatedOppIds = new Array();
    arrOrderContracts = null;

    try {

        if ((salesOrderId == '' || salesOrderId == null) && (opportunityId == null || opportunityId == '')) {

            throw nlapiCreateError('INVALID PARAM', 'Missing a required parameter', true);
        }

        if (salesOrderId != null && salesOrderId != '' && salesOrderAlreadyRA(salesOrderId)) {
            throw nlapiCreateError('WARNING', 'Sales Order Already Processed. Please contact Administrator.', true);
        }

        //Start of Opportunity Split logic (used with Renewal Automation Suitelet)
        if (opportunityId != null && opportunityId != '' && strLinesToSplit != null && strLinesToSplit != '') { //SPLIT
            var newOppId = splitOpportunity(opportunityId, strLinesToSplit, strLinesToKeep);

            return {
                success: true,
                error: ''
            };

        }
        else
            //Start of Opportunity Target Expiration (used with Renewal Automation Suitelet)
            if ((salesOrderId == null || salesOrderId == '') && (opportunityId != null && opportunityId != '') && (coTermDate != null && coTermDate != '')) { //TARGET EXPIRATION
                var recOpportunity = nlapiLoadRecord('opportunity', opportunityId, { recordmode: 'dynamic' });
                var lineItems = getLineItemsFromOpportunityOrig(recOpportunity);

                var oppAssociatedProperties = new Array();
                oppAssociatedProperties['salesrep'] = recOpportunity.getFieldValue('salesrep');
                oppAssociatedProperties['entity'] = null;
                oppAssociatedProperties['department'] = null;
                oppAssociatedProperties['location'] = recOpportunity.getFieldValue('location');
                oppAssociatedProperties['partner'] = null;
                oppAssociatedProperties['custbodyr7partnerdealtype'] = null;
                oppAssociatedProperties['custbodyr7billingresponsibleparty'] = null;
                oppAssociatedProperties['title'] = null;
                oppAssociatedProperties['status'] = null;
                oppAssociatedProperties['leadsource'] = null;
                oppAssociatedProperties['expectedclosedate'] = null;
                oppAssociatedProperties['custbodyr7transactiondiscounttotal'] = null;

                //ARR values
                oppAssociatedProperties['custbody_r7_total_exp_cash_arr'] = recOpportunity.getFieldValue('custbody_r7_total_exp_cash_arr');
                oppAssociatedProperties['custbody_r7_total_arr'] = recOpportunity.getFieldValue('custbody_r7_total_arr');
                // CAR
                oppAssociatedProperties['custbodyr7contractautomationrecs'] = getActiveContracts(recOpportunity.getFieldValue('custbodyr7contractautomationrecs').replace(/[^0-9]/, ',').split(','));


                while (recOpportunity.getLineItemCount('item') > 0) {
                    recOpportunity.removeLineItem('item', 1);
                }
                recOpportunity.setFieldValue('projectedtotal', 0);
                recOpportunity = createRenewalOpportunity(recOpportunity, lineItems, null, oppAssociatedProperties, null, coTermDate, workflow);

                //Added 9/20/2019 by Sa Ho (RSM)
                //Handle Upsell/Console Split Opportunity items --- Item Groups without Created From (RA) Line Id
                var itemGroupCounter = 0;
                var itemCount = recOpportunity.getLineItemCount('item');

                var pricingLineItems = getPricingLineItems(recOpportunity);

                for (var i = 1; i <= itemCount; i++) {
                    var item = recOpportunity.getLineItemValue('item', 'item', i);
                    var itemType = recOpportunity.getLineItemValue('item', 'itemtype', i);
                    var inGroup = recOpportunity.getLineItemValue('item', 'ingroup', i);
                    var pricingLine = pricingLineItems[item] || null;

                    if (updatedLineItems[itemGroupCounter] && updatedLineItems[itemGroupCounter]['itemType'] != 'Group')
                        itemGroupCounter++;

                    nlapiLogExecution('DEBUG', 'loop at i = ' + i + ' item: ' + item + ' itemType: ' + itemType + ' ingroup: ' + inGroup + ' pricingLine: ' + pricingLine);
                    nlapiLogExecution('DEBUG', 'updatedLineItem counter ' + itemGroupCounter);

                    if (itemType == 'Group') {
                        recOpportunity.selectLineItem('item', i);
                        recOpportunity.setCurrentLineItemValue('item', 'description', updatedLineItems[itemGroupCounter]['description']);
                        recOpportunity.commitLineItem('item');
                    }

                    else if (inGroup == 'T' && itemType != 'Group' && itemType != 'EndGroup') {
                        recOpportunity.selectLineItem('item', i);
                        recOpportunity.setCurrentLineItemValue('item', 'custcolr7itemmsproductkey', updatedLineItems[itemGroupCounter]['custcolr7itemmsproductkey']);

                        if (pricingLine == 'T') {
                            recOpportunity.setCurrentLineItemValue('item', 'quantity', updatedLineItems[itemGroupCounter]['quantity']);
                            recOpportunity.setCurrentLineItemValue('item', 'price', updatedLineItems[itemGroupCounter]['priceLevel']);
                            recOpportunity.setCurrentLineItemValue('item', 'rate', updatedLineItems[itemGroupCounter]['rate']);
                        }

                        else {
                            recOpportunity.setCurrentLineItemValue('item', 'quantity', updatedLineItems[itemGroupCounter]['quantity']);
                            recOpportunity.setCurrentLineItemValue('item', 'price', updatedLineItems[itemGroupCounter]['priceLevel']);
                            recOpportunity.setCurrentLineItemValue('item', 'rate', 0);
                            recOpportunity.setCurrentLineItemValue('item', 'amount', 0);
                        }

                        recOpportunity.commitLineItem('item');
                    }

                    else if (itemType == 'EndGroup') {
                        itemGroupCounter++;
                    }
                }
                //End

                var recId = nlapiSubmitRecord(recOpportunity);

                nlapiLogExecution('DEBUG', '183 submit recOpportunity ' + recId);
                postRunDataCheck(recId); //Added 7/25/2017 by Sa Ho (RSM)

                return {
                    success: true,
                    error: ''
                };

            }
            else
                //Start of co-term logic (used with Renewal Automation Suitelet)
                if ((salesOrderId == null || salesOrderId == '') && (opportunityId != null && opportunityId != '') && (coTermWithOpp != null && coTermWithOpp != '')) { //COTERM
                    var recOpportunity = nlapiLoadRecord('opportunity', opportunityId, { recordmode: 'dynamic' });

                    var lineItems = getLineItemsFromOpportunityOrig(recOpportunity);

                    var oppAssociatedProperties = new Array();
                    oppAssociatedProperties['salesrep'] = recOpportunity.getFieldValue('salesrep');
                    oppAssociatedProperties['entity'] = null;
                    oppAssociatedProperties['department'] = null;
                    oppAssociatedProperties['location'] = recOpportunity.getFieldValue('location');
                    oppAssociatedProperties['partner'] = recOpportunity.getFieldValue('partner');
                    oppAssociatedProperties['custbodyr7partnerdealtype'] = recOpportunity.getFieldValue('custbodyr7partnerdealtype');
                    oppAssociatedProperties['custbodyr7billingresponsibleparty'] = null;
                    oppAssociatedProperties['title'] = null;
                    oppAssociatedProperties['status'] = null;
                    oppAssociatedProperties['leadsource'] = null;
                    oppAssociatedProperties['expectedclosedate'] = null;
                    oppAssociatedProperties['custbodyr7transactiondiscounttotal'] = null;
                    //Arr
                    oppAssociatedProperties['custbody_r7_total_arr'] = recOpportunity.getFieldValue('custbody_r7_total_arr');
                    oppAssociatedProperties['custbody_r7_total_exp_cash_arr'] = recOpportunity.getFieldValue('custbody_r7_total_exp_cash_arr');
                    // CAR
                    oppAssociatedProperties['custbodyr7contractautomationrecs'] = getActiveContracts(recOpportunity.getFieldValue('custbodyr7contractautomationrecs').replace(/[^0-9]/, ',').split(','));

                    var id = createRenewalOpportunity(recOpportunity, lineItems, null, oppAssociatedProperties, coTermWithOpp, null, workflow);

                    //Updates the co-termed Opportunity, removes lines and set field values
                    if (id != null && id != '') {
                        while (recOpportunity.getLineItemCount('item') > 0) {
                            recOpportunity.removeLineItem('item', 1);
                        }
                        recOpportunity.setFieldValue('projectedtotal', 0);
                        recOpportunity.setFieldValue('entitystatus', 108);
                        recOpportunity.setFieldValue('winlossreason', 137);
                        recOpportunity.setFieldValue('custbodyr7oppwinlossdescription', 'Opportunity co-termed with ' + nlapiLookupField('opportunity', id, 'number'));

                        var recId = nlapiSubmitRecord(recOpportunity);
                        nlapiLogExecution('DEBUG', '223 submit recOpportunity ' + recId);

                        var transferSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7transferquotestasksfromopp', 'customdeployr7transferrecordsfromopp', false);

                        var params = new Array();
                        params['custpage_currentopp'] = coTermWithOpp;
                        params['custpage_oldopp'] = opportunityId;

                        //nlapiRequestURL(transferSuiteletURL, params);

                        return {
                            success: true,
                            error: ''
                        };
                    }

                    return {
                        success: true,
                        error: 'Something went wrong.'
                    };
                }
                //Start of Renewal Automation logic (with Renewal Automation Scheduled script)
                else { //RA
                    var productKeyCheck=checkForPendingProductKey(salesOrderId);
                    if(productKeyCheck){
                        throw nlapiCreateError("WARNING", "Sales Order has Pending Product Key on some Lines. Renewal Opportunity can be created only after Product Key's are updated on each required line.", true);
                    }
                    preRunDataCheck(salesOrderId); //Added 7/25/2017 by Sa Ho (RSM) - Makes sure the Item Group Header has data populated using the Group Lines
                    var recSalesOrder = nlapiLoadRecord('salesorder', salesOrderId, { recordmode: 'dynamic' });
                    arrOrderContracts = grabAllActiveContracts(recSalesOrder, true);

                    var lineItems = getLineItemsFromSalesOrder(recSalesOrder, uplift);
                    nlapiLogExecution('DEBUG', 'lineItems ' + JSON.stringify(lineItems));

                    var individualTypeItems = getTypeItems(lineItems, 3);
                    var primaryTypeItems = getTypeItems(lineItems, 1);
                    var upsellTypeItems = getTypeItems(lineItems, 2);
                    // modification (https://issues.corp.rapid7.com/browse/APPS-3679) new caterory added
                    var nonInvtPartsTypeItems = getTypeItems(lineItems, 4);

                    nlapiLogExecution('DEBUG', 'individualTypeItems ' + individualItems + ' primaryTypeItems ' + primaryTypeItems + ' upsellTypeItems ' + upsellTypeItems + ' nonInvtPartsTypeItems ' + nonInvtPartsTypeItems);

                    var primaryItemGroups = getPrimaryTypeGroups(primaryTypeItems);

                    //Looking up associated properties to set on the opportunity record

                    var customerIid = recSalesOrder.getFieldValue('entity');

                    var userProperties = new Array('custentityr7empllclocation', 'department', 'custentityr7acctmanagerupsellcode');
                    var associatedProperties = new Array('custentityr7accountmanager', 'custentityr7accountmanager.department', 'custentityr7accountmanager.custentityr7empllclocation', 'custentityr7accountmanager.custentityr7acctmanagerupsellcode', 'salesrep', 'salesrep.department', 'salesrep.custentityr7empllclocation', 'salesrep.custentityr7acctmanagerupsellcode');

                    var lookedUpUserProperties = nlapiLookupField('employee', recSalesOrder.getFieldValue('salesrep'), userProperties);
                    var lookedUpAssociatedProperties = nlapiLookupField('customer', customerIid, associatedProperties);

                    if (lookedUpAssociatedProperties['custentityr7accountmanager'] == null || lookedUpAssociatedProperties['custentityr7accountmanager'] == '') {
                        lookedUpAssociatedProperties['custentityr7accountmanager'] = recSalesOrder.getFieldValue('salesrep');
                        lookedUpAssociatedProperties['custentityr7accountmanager.department'] = lookedUpUserProperties['department'];
                        lookedUpAssociatedProperties['custentityr7accountmanager.custentityr7empllclocation'] = lookedUpUserProperties['custentityr7empllclocation'];
                    }
                    if (lookedUpAssociatedProperties['salesrep'] == null || lookedUpAssociatedProperties['salesrep'] == '') {
                        lookedUpAssociatedProperties['salesrep'] = recSalesOrder.getFieldValue('salesrep');
                        lookedUpAssociatedProperties['salesrep.department'] = lookedUpUserProperties['department'];
                        lookedUpAssociatedProperties['salesrep.custentityr7empllclocation'] = lookedUpUserProperties['custentityr7empllclocation'];
                        lookedUpAssociatedProperties['salesrep.custentityr7acctmanagerupsellcode'] = lookedUpUserProperties['custentityr7acctmanagerupsellcode'];

                        if (lookedUpAssociatedProperties['salesrep.custentityr7acctmanagerupsellcode'] == null || lookedUpAssociatedProperties['salesrep.custentityr7acctmanagerupsellcode'] == '') {
                            lookedUpAssociatedProperties['salesrep.custentityr7acctmanagerupsellcode'] = 144312;
                        }
                    }
                    //Set proper location if subsiadary is International
                    /*
                    if(parseInt(recSalesOrder.getFieldValue('subsidiary')) == 10)
                    {
                        lookedUpAssociatedProperties['custentityr7accountmanager.custentityr7empllclocation'] = 29;
                        lookedUpAssociatedProperties['salesrep.custentityr7empllclocation'] = 29;
                    }  */
                    /*
                     * There is a complex logic for setting location and in order not to break it we sets location from salesorder's location.
                     */
                    lookedUpAssociatedProperties['custentityr7accountmanager.custentityr7empllclocation'] = recSalesOrder.getFieldValue('location');
                    lookedUpAssociatedProperties['salesrep.custentityr7empllclocation'] = recSalesOrder.getFieldValue('location');

                    var endDateOnSalesOrder = recSalesOrder.getFieldValue('enddate');
                    var startYearOnOpp = '';
                    if (endDateOnSalesOrder != null && endDateOnSalesOrder != '') {
                        nlapiLogExecution('DEBUG', 'EndDateOnSalesOrder', endDateOnSalesOrder);
                        endDateOnSalesOrderDate = nlapiStringToDate(endDateOnSalesOrder);
                        startYearOnOpp = endDateOnSalesOrderDate.getFullYear();
                    }

                    nlapiLogExecution('DEBUG', 'Done looking up associated properties', 'yup');

                    //Create Opportunities for individual types
                    for (var i = 0; individualTypeItems != null && i < individualTypeItems.length; i++) {

                        nlapiLogExecution('DEBUG', 'Creating individual Type Opportunity', i);
                        var oppAssociatedProperties = new Array();

                        var individualItems = new Array();
                        individualItems[individualItems.length] = individualTypeItems[i];

                        var dates = getDates(individualItems);
                        if (dates['minStartDate'] != '' && dates['minStartDate'] != null) {
                            var individualStartYear = nlapiStringToDate(dates['minStartDate']).getFullYear();
                        }
                        else {
                            var individualStartYear = startYearOnOpp;
                        }

                        var salesrep = checkAndUpdateCSM(recSalesOrder.getFieldValue('entity'), defaultCSM);
                        if (salesrep) {
                            oppAssociatedProperties['entity'] = recSalesOrder.getFieldValue('entity');
                            oppAssociatedProperties['salesrep'] = lookedUpAssociatedProperties['custentityr7accountmanager'];
                            oppAssociatedProperties['department'] = lookedUpAssociatedProperties['custentityr7accountmanager.department'];
                            oppAssociatedProperties['location'] = lookedUpAssociatedProperties['custentityr7accountmanager.custentityr7empllclocation'];
                            oppAssociatedProperties['partner'] = recSalesOrder.getFieldValue('partner');
                            oppAssociatedProperties['custbodyr7partnerdealtype'] = recSalesOrder.getFieldValue('custbodyr7partnerdealtype');
                            oppAssociatedProperties['custbodyr7billingresponsibleparty'] = recSalesOrder.getFieldValue('custbodyr7billingresponsibleparty');
                            oppAssociatedProperties['title'] = "Renewal - " + individualStartYear;
                            oppAssociatedProperties['status'] = 36;
                            oppAssociatedProperties['leadsource'] = '67457';
                            oppAssociatedProperties['expectedclosedate'] = dates['minStartDate'];
                            oppAssociatedProperties['subsidiary'] = recSalesOrder.getFieldValue('subsidiary');
                            oppAssociatedProperties['custbodyr7transactiondiscounttotal'] = recSalesOrder.getFieldValue('custbodyr7transactiondiscounttotal');
                            
                            // https://issues.corp.rapid7.com/browse/APPS-12259 SKUnicorn 2.0
                            oppAssociatedProperties['custbody_r7_3rd_party_scanning'] = recSalesOrder.getFieldValue('custbody_r7_3rd_party_scanning');
                            oppAssociatedProperties['custbody_r7_auto_renewal_opt_out'] = recSalesOrder.getFieldValue('custbody_r7_auto_renewal_opt_out');
                            oppAssociatedProperties['custbody_r7_use_of_subcontractors'] = recSalesOrder.getFieldValue('custbody_r7_use_of_subcontractors');
                            //ARR
                            oppAssociatedProperties['custbody_r7_total_exp_cash_arr'] = recSalesOrder.getFieldValue('custbody_r7_total_arr');
                            // CAR
                            
                            oppAssociatedProperties['custbodyr7contractautomationrecs'] = getActiveContracts(recSalesOrder.getFieldValue('custbodyr7contractautomationrecs').replace(/[^0-9]/, ',').split(','));
                            // LARR
                            oppAssociatedProperties['custbodyr7renewaltotalamount'] = calculateListPriceARRfromSO(recSalesOrder);

                            // modification (https://issues.corp.rapid7.com/browse/APPS-3679)
                            if (nonInvtPartsTypeItems.length > 0) {
                                applyItems(nonInvtPartsTypeItems, individualItems)
                            }
                            createRenewalOpportunityFromSo(recSalesOrder, individualItems, 'Individual', oppAssociatedProperties, coTermWithOpp, null, workflow);
                        } else {
                            throw nlapiCreateError('INVALID CSM', 'CSM is either null or could not set correct CSM, please check');
                        }
                    }

                    //Create Renewal Opportunity for primaryTypeLineItems
                    for (itemGroup in primaryItemGroups) {
                        var primaryItems = primaryItemGroups[itemGroup];
                        nlapiLogExecution('DEBUG', 'primaryItemGroups: ' + primaryItemGroups + ', itemGroup: ' + itemGroup + ', primaryitems: ' + primaryItems + ', primaryItemGroups[itemGroup]: ' + primaryItemGroups[itemGroup]);

                        if (primaryItems != null && primaryItems.length > 0) {

                            nlapiLogExecution('DEBUG', 'Creating Primary Type Opportunity', 'yup');
                            var dates = getDates(primaryItems);

                            if (dates['minStartDate'] != '' && dates['minStartDate'] != null) {
                                var renewalStartYear = nlapiStringToDate(dates['minStartDate']).getFullYear();
                            }
                            else {
                                var renewalStartYear = startYearOnOpp;
                            }

                            var oppAssociatedProperties = new Array();
                            var salesrep = checkAndUpdateCSM(recSalesOrder.getFieldValue('entity'), defaultCSM);
                            if (salesrep) {
                                oppAssociatedProperties['entity'] = recSalesOrder.getFieldValue('entity');
                                oppAssociatedProperties['subsidiary'] = recSalesOrder.getFieldValue('subsidiary');
                                oppAssociatedProperties['salesrep'] = salesrep;
                                oppAssociatedProperties['department'] = lookedUpAssociatedProperties['custentityr7accountmanager.department'];
                                oppAssociatedProperties['location'] = lookedUpAssociatedProperties['custentityr7accountmanager.custentityr7empllclocation'];
                                oppAssociatedProperties['partner'] = recSalesOrder.getFieldValue('partner');
                                oppAssociatedProperties['custbodyr7partnerdealtype'] = recSalesOrder.getFieldValue('custbodyr7partnerdealtype');
                                oppAssociatedProperties['custbodyr7billingresponsibleparty'] = recSalesOrder.getFieldValue('custbodyr7billingresponsibleparty');
                                oppAssociatedProperties['title'] = "Renewal - " + renewalStartYear;
                                oppAssociatedProperties['status'] = 36;
                                oppAssociatedProperties['expectedclosedate'] = dates['expireDate'];
                                oppAssociatedProperties['leadsource'] = 67457;
                                oppAssociatedProperties['custbodyr7transactiondiscounttotal'] = recSalesOrder.getFieldValue('custbodyr7transactiondiscounttotal');
                                
                                // https://issues.corp.rapid7.com/browse/APPS-12259 SKUnicorn 2.0
                                oppAssociatedProperties['custbody_r7_3rd_party_scanning'] = recSalesOrder.getFieldValue('custbody_r7_3rd_party_scanning');
                                oppAssociatedProperties['custbody_r7_auto_renewal_opt_out'] = recSalesOrder.getFieldValue('custbody_r7_auto_renewal_opt_out');
                                oppAssociatedProperties['custbody_r7_use_of_subcontractors'] = recSalesOrder.getFieldValue('custbody_r7_use_of_subcontractors');
                                // CAR
                                oppAssociatedProperties['custbodyr7contractautomationrecs'] = getActiveContracts(recSalesOrder.getFieldValue('custbodyr7contractautomationrecs').replace(/[^0-9]/, ',').split(','));
                                //ARR values
                                oppAssociatedProperties['custbody_r7_total_exp_cash_arr'] = recSalesOrder.getFieldValue('custbody_r7_total_arr');
                                // LARR
                                oppAssociatedProperties['custbodyr7renewaltotalamount'] = calculateListPriceARRfromSO(recSalesOrder);

                                // modification (https://issues.corp.rapid7.com/browse/APPS-3679)
                                if (nonInvtPartsTypeItems.length > 0) {
                                    applyItems(nonInvtPartsTypeItems, primaryItems)
                                }
                                var newOppId = createRenewalOpportunityFromSo(recSalesOrder, primaryItems, 'Primary', oppAssociatedProperties, coTermWithOpp, null, workflow);
                                //transformOpportunity(newOppId, dates);
                            } else {
                                throw nlapiCreateError('INVALID CSM', 'CSM is either null or could not set correct CSM, please check');
                            }
                        }
                    }
                    //Create Renewal Opportunity for upsellTypeLineItems
                    if (upsellTypeItems != null && upsellTypeItems.length > 0) {
                        nlapiLogExecution('DEBUG', 'Creating Upsell Type Opportunity', 'yup');

                        var dates = getDates(upsellTypeItems);
                        if (dates['minStartDate'] != '' && dates['minStartDate'] != null) {
                            var upsellStartYear = nlapiStringToDate(dates['minStartDate']).getFullYear();
                        }
                        else {
                            var upsellStartYear = startYearOnOpp;
                        }
                        var oppAssociatedProperties = new Array();
                        var salesrep = checkAndUpdateCSM(recSalesOrder.getFieldValue('entity'), defaultCSM);
                        if (salesrep) {
                            oppAssociatedProperties['entity'] = recSalesOrder.getFieldValue('entity');
                            oppAssociatedProperties['salesrep'] = salesrep;
                            oppAssociatedProperties['department'] = lookedUpAssociatedProperties['salesrep.department'];
                            oppAssociatedProperties['location'] = lookedUpAssociatedProperties['salesrep.custentityr7empllclocation'];
                            oppAssociatedProperties['partner'] = recSalesOrder.getFieldValue('partner');
                            oppAssociatedProperties['custbodyr7partnerdealtype'] = recSalesOrder.getFieldValue('custbodyr7partnerdealtype');
                            oppAssociatedProperties['custbodyr7billingresponsibleparty'] = recSalesOrder.getFieldValue('custbodyr7billingresponsibleparty');
                            oppAssociatedProperties['title'] = "Upsell - " + upsellStartYear;
                            oppAssociatedProperties['status'] = 80;
                            oppAssociatedProperties['expectedclosedate'] = dates['expireDate'];
                            oppAssociatedProperties['leadsource'] = recSalesOrder.getFieldValue('leadsource');
                            oppAssociatedProperties['subsidiary'] = recSalesOrder.getFieldValue('subsidiary');
                            oppAssociatedProperties['custbodyr7transactiondiscounttotal'] = recSalesOrder.getFieldValue('custbodyr7transactiondiscounttotal');

                            // https://issues.corp.rapid7.com/browse/APPS-12259 SKUnicorn 2.0
                            oppAssociatedProperties['custbody_r7_3rd_party_scanning'] = recSalesOrder.getFieldValue('custbody_r7_3rd_party_scanning');
                            oppAssociatedProperties['custbody_r7_auto_renewal_opt_out'] = recSalesOrder.getFieldValue('custbody_r7_auto_renewal_opt_out');
                            oppAssociatedProperties['custbody_r7_use_of_subcontractors'] = recSalesOrder.getFieldValue('custbody_r7_use_of_subcontractors');
                            // CAR multiselect
                            oppAssociatedProperties['custbodyr7contractautomationrecs'] = getActiveContracts(recSalesOrder.getFieldValue('custbodyr7contractautomationrecs').replace(/[^0-9]/, ',').split(','));
                            //ARR values
                            oppAssociatedProperties['custbody_r7_total_exp_cash_arr'] = recSalesOrder.getFieldValue('custbody_r7_total_arr');
                            // LARR
                            oppAssociatedProperties['custbodyr7renewaltotalamount'] = calculateListPriceARRfromSO(recSalesOrder);

                            // modification (https://issues.corp.rapid7.com/browse/APPS-3679)
                            if (nonInvtPartsTypeItems.length > 0) {
                                applyItems(nonInvtPartsTypeItems, upsellTypeItems)
                            }
                            createRenewalOpportunityFromSo(recSalesOrder, upsellTypeItems, 'Upsell', oppAssociatedProperties, null, null, workflow);
                        } else {
                            throw nlapiCreateError('INVALID CSM', 'CSM is either null or could not set correct CSM, please check');
                        }
                    }

                    //Moved down here: SR179
                    if (salesOrderId != null && salesOrderId != '') {
                        //submit processed to prevent it from being processed twice by simultaneous scripts or errors
                        nlapiSubmitField('salesorder', salesOrderId, ['custbodyr7renewaloppcreated', 'custbodyr7_renewalautomation_error'], ['T', '']);
                    }

                    return {
                        success: true,
                        error: ''
                    };
                }
    }
    catch (err) {
        var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
        nlapiSendEmail(adminUser, adminUser, 'Something went wrong - RA', 'Error: ' + err);

        return {
            success: false,
            error: 'Something went wrong. Please contact an Administrator with details below:\n\n' + err
        };
    }

    return {
        success: false,
        error: 'Something went wrong. Please contact an Administrator with details below:\n\nBad Method'
    };
}

function getPricingLineItems(transaction) {
    var itemIds = [];
    var lineCount = transaction.getLineItemCount('item');
    for (var i = 1; i <= lineCount; i++) {
        var itemId = transaction.getLineItemValue('item','item',i);
        itemIds.push(itemId);
    }

    var results = nlapiSearchRecord('item', null, [
        ['internalid', 'anyof', itemIds]
    ], [
        new nlobjSearchColumn('custitem_arm_upgrade_pricing_line')
    ]);

    return (results || []).reduce(function(accumulator, result) {
        var itemId = result.getId();
        if (!itemId) {
            return accumulator
        }

        accumulator[itemId] = result.getValue('custitem_arm_upgrade_pricing_line');
        return accumulator;
    }, {});
}



function checkForPendingProductKey(salesOrderId){

    var arrSearchFilters = new Array();
    arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', salesOrderId);
    arrSearchFilters[1] = new nlobjSearchFilter('custcolr7itemmsproductkey', null, 'contains', 'PEND');
        
    var arrSearchResults = nlapiSearchRecord('salesorder', null, arrSearchFilters);

    if (arrSearchResults != null && arrSearchResults.length > 0) {

        nlapiLogExecution('debug', 'Sales order has some lines with Pendign Product key');
        return true;
    }

    return false;
}

/*
* @param customerId - number
*/
function checkAndUpdateCSM(customerId, defaultCSM) {
    var CSMEmployee = defaultCSM;
    var currentCSM = nlapiLookupField('customer', customerId, 'custentityr7accountmanager');

    nlapiLogExecution('DEBUG', 'checking customer CSM', currentCSM);
    if (isEmpty(currentCSM)) {
        nlapiSubmitField('customer', customerId, 'custentityr7accountmanager', CSMEmployee);
        return CSMEmployee
    } else {
        var currentCSMSInactive = nlapiLookupField('employee', currentCSM, 'isinactive');
        nlapiLogExecution('DEBUG', 'currentCSMSInactive', currentCSMSInactive)
        if (currentCSMSInactive == 'T') {
            nlapiSubmitField('customer', customerId, 'custentityr7accountmanager', CSMEmployee);
            return CSMEmployee
        } else {
            return currentCSM
        }
    }
    return false;
}

/*
 * @param lineItems to parse for individual type lineItems
 *
 */
function getTypeItems(lineItems, type) {

    var typeItems = new Array();

    for (var i = 0; lineItems != null && i < lineItems.length; i++) {
        var lineItem = lineItems[i];
        var lineItemRenewalProperties = lineItem['originalItemProperties'];

        if (lineItemRenewalProperties['custitemr7itemrenewalgroup'] == type) {
            typeItems[typeItems.length] = lineItem;
        }
    }
    return typeItems;
}

function salesOrderAlreadyRA(salesOrderId) {

    var arrSearchFilters = new Array();
    arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', salesOrderId);
    arrSearchFilters[0].setLeftParens(1);
    arrSearchFilters[1] = new nlobjSearchFilter('custbodyr7renewaloppcreated', null, 'is', 'T');
    arrSearchFilters[1].setRightParens(1);
    arrSearchFilters[1].setOr(true);
    arrSearchFilters[2] = new nlobjSearchFilter('custcolr7createdfromra', null, 'anyof', salesOrderId);
    arrSearchFilters[2].setLeftParens(1);
    arrSearchFilters[3] = new nlobjSearchFilter('type', null, 'noneof', 'Estimate');
    arrSearchFilters[3].setRightParens(1);

    var arrSearchResults = nlapiSearchRecord('transaction', null, arrSearchFilters);

    if (arrSearchResults != null && arrSearchResults.length > 0) {
        nlapiLogExecution('debug', 'renewal opp is ', arrSearchResults[0].getId());
        return true;
    }

    return false;
}

function getPrimaryTypeGroups(primaryTypeItems) {

    var primaryItemGroups = new Array();

    nlapiLogExecution('DEBUG', 'primaryTypeItems.length ' + primaryTypeItems.length);

    for (var i = 0; primaryTypeItems != null && i < primaryTypeItems.length; i++) {
        var currentItem = primaryTypeItems[i];
        var itemStartDate = currentItem['startDate'];
        nlapiLogExecution('DEBUG', 'primaryTypeItems[i] ' + currentItem);

        var startYearMonth = 'GR';
        if (itemStartDate != null && itemStartDate != '') {
            var dtItemStartDate = nlapiStringToDate(itemStartDate);
            var startYear = dtItemStartDate.getFullYear();
            var startMonth = dtItemStartDate.getMonth();
            startYearMonth = startYear + '' + startMonth;
        }
        else {
            startYearMonth = '';
        }

        var currentGroup = 'GR' + startYearMonth;

        if (primaryItemGroups[currentGroup] != null && primaryItemGroups[currentGroup].length > 0) {
            var itemGroup = primaryItemGroups[currentGroup];
            itemGroup[itemGroup.length] = currentItem;
            primaryItemGroups[currentGroup] = itemGroup;
        }
        else {
            var itemGroup = new Array();
            itemGroup[itemGroup.length] = currentItem;
            primaryItemGroups[currentGroup] = itemGroup;
        }
    }

    return primaryItemGroups;
}

function getDates(lineItems) {
    var minStartDate = '';
    var maxEndDate = '';
    var expectedClose = '';

    var dates = new Array();

    for (var i = 0; lineItems != null && i < lineItems.length; i++) {
        var lineItem = lineItems[i];

        if (lineItem['startDate'] != '' && lineItem['startDate'] != null) {
            var itemStartDate = nlapiStringToDate(lineItem['startDate']);
        }
        else {
            var itemStartDate = nlapiAddDays(nlapiStringToDate(lineItem['salesOrderEndDate']), 1);
        }

        if (lineItem['endDate'] != '' && lineItem['endDate'] != null) {
            var itemEndDate = nlapiStringToDate(lineItem['endDate']);
        }
        else {
            var itemEndDate = nlapiAddDays(nlapiAddMonths(nlapiStringToDate(lineItem['salesOrderEndDate']), 12), -1);
        }

        if (minStartDate == null || minStartDate == '' || itemStartDate < minStartDate) {
            minStartDate = itemStartDate;
        }
        if (maxEndDate == null || maxEndDate == '' || itemEndDate > maxEndDate) {
            maxEndDate = itemEndDate;
        }

    }

    if (minStartDate != null && minStartDate != '' && maxEndDate != null && maxEndDate != '') {
        var minStartDateString = nlapiDateToString(minStartDate);
        var maxEndDateString = nlapiDateToString(maxEndDate);
        var expireDate = nlapiAddDays(minStartDate, -1);
        var expireDateString = nlapiDateToString(expireDate);
    }
    dates['minStartDate'] = minStartDateString;
    dates['maxEndDate'] = maxEndDateString;
    dates['expireDate'] = expireDateString;

    return dates;
}

function getLineItemsFromSalesOrder(recSalesOrder, uplift) {

    var lineItems = new Array();
    var lineItemCount = recSalesOrder.getLineItemCount('item');

    var arrCustomerContracts = grabAllActiveContracts(recSalesOrder);

    for (var i = 1; i <= lineItemCount; i++) {
        var lineItem = new Array();
        var item = recSalesOrder.getLineItemValue('item', 'item', i);
        var itemType = recSalesOrder.getLineItemValue('item', 'itemtype', i);
        var inGroup = recSalesOrder.getLineItemValue('item', 'ingroup', i);

        nlapiLogExecution('DEBUG', 'got line items from sales order, item ' + item + ' itemtype ' + itemType + ' ingroup ' + inGroup);

        //if (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description' && itemType != 'group' && itemType != 'EndGroup') {
        if ((itemType == 'Group') || (itemType != 'Subtotal' && itemType != 'Discount' && itemType != 'Description' && itemType != 'EndGroup' && inGroup != 'T')) {
            var originalItemProperties = getItemPropertiesForItem(item);
            var renewalSKU = originalItemProperties['custitemr7itemrenewalsku'];

            if (renewalSKU == null || renewalSKU === '') {
                continue;
            }

            var renewalSkuProperties = nlapiLookupField('item', renewalSKU, new Array('internalid', 'custitemr7itemdefaultterm', 'isinactive', 'custitemr7itemqtytype', 'custitemr7itemrarequiresmanualreview'));

            var renewalCode = originalItemProperties['custitemr7itemrenewalcode'];
            var defaultTerm = renewalSkuProperties['custitemr7itemdefaultterm'];
            if (defaultTerm == null || defaultTerm == '') {
                defaultTerm = 365;
            }

            //EITF-08-01
            var startDate = recSalesOrder.getLineItemValue('item', 'custcolr7startdate', i) || recSalesOrder.getLineItemValue('item', 'revrecstartdate', i);
            var endDate = recSalesOrder.getLineItemValue('item', 'custcolr7enddate', i) || recSalesOrder.getLineItemValue('item', 'revrecenddate', i);

            var productKey = recSalesOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
            var managedServiceId = recSalesOrder.getLineItemValue('item', 'custcolr7managedserviceid', i);

            var quantity = parseFloat(recSalesOrder.getLineItemValue('item', 'quantity', i));
            var unitType = recSalesOrder.getLineItemValue('item', 'custcolr7itemqtyunit', i);

            //ARR for item groups fix
            var expectedARR = recSalesOrder.getLineItemValue('item', 'custcol_r7_cash_arr', i);

            //renewal pricing
            var rate = recSalesOrder.getLineItemValue('item', 'rate', i);
            if (rate == '' || rate == null) {
                rate = parseFloat(recSalesOrder.getLineItemValue('item', 'amount', i)) / parseFloat(recSalesOrder.getLineItemValue('item', 'quantity', i));
            }

            //Added 7/31/2017, updated 10/4/2017 by Sa Ho (RSM)
            //Get Pricing Line's info if the item is an item group
            if (itemType == 'Group') {
                var groupInfo = {};
                var memberIndex = 0;
                for (var x = i; x <= lineItemCount; x++) {
                    var groupLineItem = recSalesOrder.getLineItemValue('item', 'item', x);
                    var groupLineItemType = recSalesOrder.getLineItemValue('item', 'itemtype', x);
                    var groupLineInGroup = recSalesOrder.getLineItemValue('item', 'ingroup', x);

                    if (['Group', 'Subtotal', 'Discount' , 'Description'].indexOf(groupLineItemType) != -1) {
                        continue;
                    } else if (groupLineItemType != 'Group' && groupLineItemType != 'EndGroup' && groupLineInGroup == 'T') {
                        //if (nlapiLookupField('item', groupLineItem, 'custitem_arm_upgrade_pricing_line') == 'T') {
                            var itemLookup = nlapiLookupField('item', groupLineItem, ['custitemr7itemrenewalsku']);
                            //nlapiLogExecution('debug', 'getLineItemsFromSalesOrder inside if- itemLookup', itemLookup);
                            var renewalSKU = itemLookup['custitemr7itemrenewalsku'];
                            //nlapiLogExecution('debug', 'getLineItemsFromSalesOrder inside if - renewalSKU', renewalSKU);
                            if(renewalSKU == null || renewalSKU == ""){
                                continue;
                            }
                            productKey = recSalesOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', x);
                            managedServiceId = recSalesOrder.getLineItemValue('item', 'custcolr7managedserviceid', x);

                            quantity = recSalesOrder.getLineItemValue('item', 'quantity', x);

                            //ARR for item groups fix
                            expectedARR = recSalesOrder.getLineItemValue('item', 'custcol_r7_cash_arr', x)
                            rate = recSalesOrder.getLineItemValue('item', 'rate', x);
                            if (rate == '' || rate == null) {
                                rate = parseFloat(recSalesOrder.getLineItemValue('item', 'amount', x)) / parseFloat(recSalesOrder.getLineItemValue('item', 'quantity', x));
                            }

                            groupInfo['line'+memberIndex] = {
                                productKey: productKey,
                                managedServiceId: managedServiceId,
                                quantity: quantity,
                                unitType: unitType,
                                expectedARR: expectedARR,
                                rate: rate
                            };  
                            memberIndex++;
                        //}
                    } else if (groupLineItemType == 'EndGroup')
                        break;
                }
                groupInfo.memberCount = memberIndex - 1;
            }
            //End new logic addition

            var activationKey = productKey || managedServiceId;

            var licenseEndDate = getEndDateByActivationKey(recSalesOrder, activationKey);

            if ((endDate != '' && endDate != null) && (licenseEndDate == '' || licenseEndDate == null || licenseEndDate == 'undefined')) {
                licenseEndDate = nlapiStringToDate(endDate);
            }

            if (licenseEndDate == '' || licenseEndDate == null || licenseEndDate == 'undefined') {
                licenseEndDate = new Date();
            }

            // unit = 1
            // month = 2
            // year = 3
            // days = 5
            // 15-day = 6
            // Per Term = 7
            if (defaultTerm != null && defaultTerm != '') {

                switch (unitType) {
                    case '1':
                        //do nothing
                        break;
                    case '2':
                        quantity = (defaultTerm * 12) / 365;
                        break;
                    case '3':
                        quantity = defaultTerm / 365;
                        break;
                    case '5':
                        quantity = defaultTerm;
                        break;
                    case '6':
                        quantity = defaultTerm / 15;
                        break;
                    case '7':
                        //do nothing
                        break;
                    case '9':
                        //do nothing
                        break;
                }
            }
            var newStartDate = '';
            var newEndDate = '';

            //start/end date calculations
            newStartDate = nlapiDateToString(nlapiAddDays(licenseEndDate, 1));
            newEndDate = convertEndDate(newStartDate, quantity, unitType, defaultTerm);

            var currentTerm = null;
            if (startDate != null && startDate != '' && endDate != null && endDate != '') {
                currentTerm = days_between(nlapiStringToDate(startDate), nlapiStringToDate(endDate)) + 1;
            }

            if (currentTerm != null) {
                var newTerm = days_between(nlapiStringToDate(newStartDate), nlapiStringToDate(newEndDate)) + 1;

                var theRatio = newTerm / currentTerm;
                var timeBasedUnitType = true;

                if (unitType == 1 || unitType == 7 || unitType == 9) { //not time based type
                    timeBasedUnitType = false;
                }

                if (!timeBasedUnitType) {
                    //rate should be adjusted
                    rate = (rate * theRatio);
                    for (var key in groupInfo) {
                        if(key != 'memberCount') {
                            groupInfo[key].rate = (groupInfo[key].rate * theRatio).toFixed(2);
                        }
                    }
                }

            }

            rate = determineRenewalPricing(rate, renewalCode, uplift);
            //done with renewal pricing stuff

            //contract stuff
            var lineContract = recSalesOrder.getLineItemValue('item', 'custcolr7contractrenewal', i);
            var contractLineId = recSalesOrder.getLineItemValue('item', 'custcolr7renewedfromlineid', i);
            var calculatedDiscountAmount = 0;

            if (lineContract != null && lineContract != '') {
                var objContractItems = new Object;

                var strCurrentContractItemsJSON = nlapiLookupField('customrecordr7contractautomation', lineContract, 'custrecordr7carlineitemsjson');

                if (strCurrentContractItemsJSON != null && strCurrentContractItemsJSON != '') {
                    objContractItems = JSON.parse(strCurrentContractItemsJSON);
                }

                for (var k = 0; objContractItems.lines != null && k < objContractItems.lines.length; k++) {
                    var contractItem = objContractItems.lines[k];

                    if (contractLineId == contractItem.lineId) {
                        var contractedDiscountPercent = contractItem.discountPercent;
                        var contractedDiscountRate = contractItem.newRate;

                        if (!isEmpty(contractedDiscountRate)) {
                            var currentTotal = rate * quantity;
                            var newTotal = contractedDiscountRate * quantity;

                            calculatedDiscountAmount = newTotal - currentTotal;
                        }
                        if (!isEmpty(contractedDiscountPercent)) {
                            var currentTotal = rate * quantity;
                            calculatedDiscountAmount = rate * quantity * (parseFloat(contractedDiscountPercent) / 100) * -1;
                        }

                        break;
                    }
                }
            }
            else
                if (arrCustomerContracts != null && arrCustomerContracts.length >= 1) {

                    var itemFields = new Array();
                    itemFields['itemfamily'] = originalItemProperties['custitemr7itemfamily'];
                    itemFields['item'] = item;
                    itemFields['rate'] = rate;
                    itemFields['quantity'] = quantity;

                    var returnedFields = processContractAmount(arrCustomerContracts, itemFields);
                    var contracted = returnedFields[0];

                    if (contracted) {
                        calculatedDiscountAmount = returnedFields[1];
                    }

                }

            nlapiLogExecution('DEBUG', i + ' calculatedDiscountAmount', calculatedDiscountAmount);
            //end contract stuff
            lineItem['originalItemProperties'] = originalItemProperties;
            lineItem['renewalSkuProperties'] = renewalSkuProperties;
            lineItem['originalItemIid'] = item;
            lineItem['quantity'] = isNaN(quantity) && itemType == 'Group' ? 0 : quantity;
            lineItem['priceLevel'] = -1;
            lineItem['rate'] = isNaN(rate) && itemType == 'Group' ? 0 : rate;
            lineItem['activationKey'] = activationKey;
            lineItem['custcolr7itemmsproductkey'] = recSalesOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
            lineItem['custcolr7_monthlydatalimit_gb'] = recSalesOrder.getLineItemValue('item', 'custcolr7_monthlydatalimit_gb', i);
            lineItem['custcolr7managedserviceid'] = recSalesOrder.getLineItemValue('item', 'custcolr7managedserviceid', i);
            lineItem['custcolr7managedsoftwareid'] = recSalesOrder.getLineItemValue('item', 'custcolr7managedsoftwareid', i);
            lineItem['custcolr7translicenseid'] = recSalesOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
            lineItem['startDate'] = newStartDate;
            lineItem['endDate'] = newEndDate;
            lineItem['salesOrderId'] = recSalesOrder.getId();
            lineItem['custcolr7createdfromra_lineid'] = recSalesOrder.getLineItemValue('item', 'id', i);
            lineItem['custcolr7createdfromra'] = recSalesOrder.getId();
            lineItem['salesOrderEndDate'] = recSalesOrder.getFieldValue('enddate');
            lineItem['discountAmount'] = calculatedDiscountAmount;
            lineItem['contract'] = lineContract;
            lineItem['contractLineId'] = contractLineId;
            lineItem['contact'] = recSalesOrder.getLineItemValue('item', 'custcolr7translinecontact', i); //Line item contact
            //ARR
            lineItem['custcol_r7_expected_arr'] = expectedARR;
            lineItem['renewalbase'] = 'AMOUNT'; //renewal baseline          
            lineItem['groupInfo'] = groupInfo;
            lineItem['custcolr7dataretentionlengthdays'] = recSalesOrder.getLineItemValue('item', 'custcolr7dataretentionlengthdays', i);
            lineItem['custcol_r7_pck_package_item'] = recSalesOrder.getLineItemValue('item', 'custcol_r7_pck_package_item', i);
            lineItem['custcol_r7_pck_package_level'] = recSalesOrder.getLineItemValue('item', 'custcol_r7_pck_package_level', i);
            lineItem['custcol_r7_pck_package_license'] = recSalesOrder.getLineItemValue('item', 'custcol_r7_pck_package_license', i);
            getInsightLicenseRecordAttributes(lineItem); 

            nlapiLogExecution('DEBUG', i + ' groupInfo', groupInfo);
            //reset groupInfo Item after assigning to lineitem above
            groupInfo = {};

            lineItems[lineItems.length] = lineItem;
        }
    }

    return lineItems;
}

function getInsightLicenseRecordAttributes(lineItem) {
    if(lineItem['custcolr7translicenseid']) {
        var insightplatformSearchResults = nlapiSearchRecord("customrecordr7insightplatform",null,
            [
                ["idtext","is",lineItem['custcolr7translicenseid']]
            ], 
            [
                new nlobjSearchColumn("name").setSort(false), 
                new nlobjSearchColumn("custrecordr7inplicenselicensedassets"), 
                new nlobjSearchColumn("custrecordr7inptotaldataretention")
            ]
        );

        if(insightplatformSearchResults && insightplatformSearchResults.length > 0) {
            nlapiLogExecution('AUDIT', 'insight platform attributes added', insightplatformSearchResults[0]);
            lineItem['licensedAssests'] = insightplatformSearchResults[0].getValue('custrecordr7inplicenselicensedassets');
            lineItem['totalDataRetention'] = insightplatformSearchResults[0].getValue('custrecordr7inptotaldataretention');
        }
    }
}

function convertEndDate(strStartDate, quantity, unitType, defaultTerm) {
    // unit = 1
    // month = 2
    // year = 3
    // days = 5
    // 15-day = 6
    // Per Term = 7
    // Week = 8

    startDate = nlapiStringToDate(strStartDate);
    var dateEndDate = new Date();

    if (defaultTerm == null || defaultTerm == '') {
        defaultTerm = 365;
    }

    switch (unitType) {
        case '1':
            dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm)) - 1);
            break;
        case '2':
            dateEndDate = nlapiAddDays(nlapiAddMonths(startDate, quantity), -1);
            break;
        case '3':
            dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm) * quantity) - 1);
            break;
        case '5':
            dateEndDate = nlapiAddDays(startDate, Math.ceil(quantity) - 1);
            break;
        case '6':
            dateEndDate = nlapiAddDays(startDate, (quantity * 15) - 1);
            break;
        case '7':
            dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm)) - 1);
            break;
        case '8':
            dateEndDate = nlapiAddDays(startDate, (Math.ceil(quantity) * 7) - 1);
            break;
        case '9':
            dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm)) - 1);
            break;
        default:
            dateEndDate = nlapiAddDays(startDate, Math.ceil(parseInt(defaultTerm) * quantity) - 1);
    }

    var strEndDate = nlapiDateToString(dateEndDate);
    return strEndDate;
}

function getLineItemsFromOpportunityOrig(recOpportunity) {
    var lineItems = new Array();
    var arrayCounter = 0;
    var lineItemCount = recOpportunity.getLineItemCount('item');

    for (var i = 1; i <= lineItemCount; i++) {
        var item = recOpportunity.getLineItemValue('item', 'item', i);
        var itemType = recOpportunity.getLineItemValue('item', 'itemtype', i);
        var inGroup = recOpportunity.getLineItemValue('item', 'ingroup', i);

        var lineItem = new Array();

        if (itemType != 'EndGroup' && inGroup != 'T') {
            var renewalSkuProperties = nlapiLookupField('item', item, new Array('internalid', 'custitemr7itemdefaultterm', 'isinactive', 'custitemr7itemqtytype', 'custitemr7itemrarequiresmanualreview'));
            if (renewalSkuProperties == null) { //subtotals and discounts return null for some reason, but we still need to move them over
                renewalSkuProperties = new Array();
                renewalSkuProperties['internalid'] = item;
            }

            lineItem['originalItemProperties'] = null;
            lineItem['renewalSkuProperties'] = renewalSkuProperties;
            lineItem['itemType'] = recOpportunity.getLineItemValue('item', 'itemtype', i);
            lineItem['originalItemIid'] = recOpportunity.getLineItemValue('item', 'item', i);
            lineItem['quantity'] = recOpportunity.getLineItemValue('item', 'quantity', i);
            lineItem['priceLevel'] = -1;
            lineItem['rate'] = recOpportunity.getLineItemValue('item', 'rate', i);
            lineItem['custcolr7itemmsproductkey'] = recOpportunity.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
            lineItem['custcolr7_monthlydatalimit_gb'] = recOpportunity.getLineItemValue('item', 'custcolr7_monthlydatalimit_gb', i);
            lineItem['custcolr7managedserviceid'] = recOpportunity.getLineItemValue('item', 'custcolr7managedserviceid', i);
            lineItem['custcolr7translicenseid'] = recOpportunity.getLineItemValue('item', 'custcolr7translicenseid', i);
            lineItem['startDate'] = recOpportunity.getLineItemValue('item', 'custcolr7startdate', i);
            lineItem['endDate'] = recOpportunity.getLineItemValue('item', 'custcolr7enddate', i);
            lineItem['salesOrderId'] = recOpportunity.getId();
            lineItem['custcolr7createdfromra_lineid'] = recOpportunity.getLineItemValue('item', 'custcolr7createdfromra_lineid', i);
            lineItem['custcolr7createdfromra'] = recOpportunity.getLineItemValue('item', 'custcolr7createdfromra', i);
            lineItem['salesOrderEndDate'] = null;
            lineItem['discountAmount'] = 0;
            lineItem['contract'] = recOpportunity.getLineItemValue('item', 'custcolr7contractrenewal', i);
            lineItem['contractLineId'] = recOpportunity.getLineItemValue('item', 'custcolr7renewedfromlineid', i);
            lineItem['contact'] = recOpportunity.getLineItemValue('item', 'custcolr7translinecontact', i); //Line item contact
            lineItem['renewalbase'] = recOpportunity.getLineItemValue('item', 'custcolr7opamountrenewalbaseline', i); //renewal baseline
            lineItem['description'] = recOpportunity.getLineItemValue('item', 'description', i);
            lineItem['description'] = recOpportunity.getLineItemValue('item', 'description', i);
            lineItem['custcol_r7_expected_arr'] = recOpportunity.getLineItemValue('item', 'custcol_r7_expected_arr', i);
            lineItem['custcolr7dataretentionlengthdays'] = recOpportunity.getLineItemValue('item', 'custcolr7dataretentionlengthdays', i);
            lineItem['custcolr7translicenseid'] = recOpportunity.getLineItemValue('item', 'custcolr7translicenseid', i);
            getInsightLicenseRecordAttributes(lineItem); //we need the license ID, is this on the OP?
            
            lineItems[lineItems.length] = lineItem;

            arrayCounter = (lineItems.length - 1);
        }

        //Added by Sa Ho (RSM) 8/10/2017
        if (itemType == 'Group') {
            for (var y = i + 1; y <= lineItemCount; y++) {
                var groupLineItem = recOpportunity.getLineItemValue('item', 'item', y);
                var pricingLine = nlapiLookupField('item', groupLineItem, 'custitem_arm_upgrade_pricing_line');
                var lineType = recOpportunity.getLineItemValue('item', 'itemtype', y);
                var lineInGroup = recOpportunity.getLineItemValue('item', 'ingroup', y);

                if (lineInGroup == 'T' && lineType != 'EndGroup' && pricingLine == 'T') {
                    var lineQuantity = recOpportunity.getLineItemValue('item', 'quantity', y);
                    if (lineQuantity != null && lineQuantity != '')
                        lineItems[arrayCounter]['quantity'] = lineQuantity;

                    var lineRate = recOpportunity.getLineItemValue('item', 'rate', y);
                    if (lineRate != null && lineRate != '')
                        lineItems[arrayCounter]['rate'] = lineRate;

                    var lineProductKey = recOpportunity.getLineItemValue('item', 'custcolr7itemmsproductkey', y);
                    if (lineProductKey != null && lineProductKey != '')
                        lineItems[arrayCounter]['custcolr7itemmsproductkey'] = lineProductKey;

                    var lineMonthlyDataLimit = recOpportunity.getLineItemValue('item', 'custcolr7_monthlydatalimit_gb', y);
                    if (lineMonthlyDataLimit != null && lineMonthlyDataLimit != '')
                        lineItems[arrayCounter]['custcolr7_monthlydatalimit_gb'] = lineMonthlyDataLimit;

                    var lineManagedService = recOpportunity.getLineItemValue('item', 'custcolr7managedserviceid', y);
                    if (lineManagedService != null && lineManagedService != '')
                        lineItems[arrayCounter]['custcolr7managedserviceid'] = lineManagedService;

                    var lineTransLicense = recOpportunity.getLineItemValue('item', 'custcolr7translicenseid', y);
                    if (lineTransLicense != null && lineTransLicense != '')
                        lineItems[arrayCounter]['custcolr7translicenseid'] = lineTransLicense;

                    var lineStartDate = recOpportunity.getLineItemValue('item', 'custcolr7startdate', y);
                    if (lineStartDate != null && lineStartDate != '')
                        lineItems[arrayCounter]['startDate'] = lineStartDate;

                    var lineEndDate = recOpportunity.getLineItemValue('item', 'custcolr7enddate', y);
                    if (lineEndDate != null && lineEndDate != '')
                        lineItems[arrayCounter]['endDate'] = lineEndDate;

                    //lineItems[arrayCounter]['salesOrderId'] = recOpportunity.getId();

                    var lineCreatedFromLine = recOpportunity.getLineItemValue('item', 'custcolr7createdfromra_lineid', y);
                    if (lineCreatedFromLine != null && lineCreatedFromLine != '')
                        lineItems[arrayCounter]['custcolr7createdfromra_lineid'] = lineCreatedFromLine;

                    var lineCreatedFrom = recOpportunity.getLineItemValue('item', 'custcolr7createdfromra', y);
                    if (lineCreatedFrom != null && lineCreatedFrom != '')
                        lineItems[arrayCounter]['custcolr7createdfromra'] = lineCreatedFrom;

                    //lineItems[arrayCounter]['salesOrderEndDate'] = null;
                    //lineItems[arrayCounter]['discountAmount'] = 0;

                    var lineContractRenewal = recOpportunity.getLineItemValue('item', 'custcolr7contractrenewal', y);
                    if (lineContractRenewal != null && lineContractRenewal != '')
                        lineItems[arrayCounter]['contract'] = lineContractRenewal;

                    var lineContractLine = recOpportunity.getLineItemValue('item', 'custcolr7renewedfromlineid', y);
                    if (lineContractLine != null && lineContractLine != '')
                        lineItems[arrayCounter]['contractLineId'] = lineContractLine;

                    var lineContact = recOpportunity.getLineItemValue('item', 'custcolr7translinecontact', y);
                    if (lineContact != null && lineContact != '')
                        lineItems[arrayCounter]['contact'] = lineContact;

                    var lineRenewalBase = recOpportunity.getLineItemValue('item', 'custcolr7opamountrenewalbaseline', y);
                    if (lineRenewalBase != null && lineRenewalBase != '')
                        lineItems[arrayCounter]['renewalbase'] = lineRenewalBase;

                    var linexpected_arr = recOpportunity.getLineItemValue('item', 'custcol_r7_expected_arr', y);
                    if (linexpected_arr != null && linexpected_arr != '')
                        lineItems[arrayCounter]['custcol_r7_expected_arr'] = linexpected_arr;
                }

                else if (lineType == 'EndGroup') {
                    break;
                }
            }
        }
        //End
    }
    return lineItems;
}

function determineCreatedFromRAValue(recTransaction) {

    var lineItemCount = recTransaction.getLineItemCount('item');

    for (var i = lineItemCount; i > 0; i--) {

        var createdFromRA = recTransaction.getLineItemValue('item', 'custcolr7createdfromra', i);
        var createdFromRA_LineID = recTransaction.getLineItemValue('item', 'custcolr7createdfromra_lineid', i);

        if (createdFromRA != null && createdFromRA != '') {
            return [createdFromRA, createdFromRA_LineID];
        }
    }
    return [null, null];
}

function determineCreatedFromRAValueFromLineItems(lineItems) {

    for (var i = 0; lineItems != null && i < lineItems.length; i++) {

        var createdFromRA = lineItems[i]['custcolr7createdfromra'];
        var createdFromRA_LineID = lineItems[i]['custcolr7createdfromra_lineid'];

        if (createdFromRA != null && createdFromRA != '') {
            return [createdFromRA, createdFromRA_LineID];
        }
    }
    return [null, null];
}

function grabAllActiveContracts(recSalesOrder, orderLevel) {

    var arrSearchFilters = new Array();
    var arrSearchColumns = new Array();
    var arrSearchResults = new Array();

    if (!orderLevel) {
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carcustomer', null, 'is', recSalesOrder.getFieldValue('entity'));
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carcategory', null, 'anyof', new Array(1, 5));
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carstartdate', null, 'onorbefore', 'today');
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carenddate', null, 'onorafter', 'today');
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7contractautostatus', null, 'is', 2);

        arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7carcreatedfromtemplate');
        arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7carcategory');
        arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7caritemfamilies');
        arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7caritems');
        arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7cardiscountamount');
        arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7caramount');
        arrSearchColumns[6] = new nlobjSearchColumn('custrecordr7carpercent');
        arrSearchColumns[7] = new nlobjSearchColumn('internalid');

        arrSearchResults = nlapiSearchRecord('customrecordr7contractautomation', null, arrSearchFilters, arrSearchColumns);
    }
    else {
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'is', recSalesOrder.getId());
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('mainline', null, 'is', 'T');
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carcategory', 'custbodyr7contractautomationrecs', 'anyof', new Array(2, 3));
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7contractautostatus', 'custbodyr7contractautomationrecs', 'is', 2);

        arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7carcreatedfromtemplate', 'custbodyr7contractautomationrecs');
        arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7carcategory', 'custbodyr7contractautomationrecs');
        arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7caritemfamilies', 'custbodyr7contractautomationrecs');
        arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7caritems', 'custbodyr7contractautomationrecs');
        arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7cardiscountamount', 'custbodyr7contractautomationrecs');
        arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7caramount', 'custbodyr7contractautomationrecs');
        arrSearchColumns[6] = new nlobjSearchColumn('custrecordr7carpercent', 'custbodyr7contractautomationrecs');
        arrSearchColumns[7] = new nlobjSearchColumn('internalid', 'custbodyr7contractautomationrecs');

        arrSearchResults = nlapiSearchRecord('transaction', null, arrSearchFilters, arrSearchColumns);
    }

    var arrCustomerContracts = new Array();

    for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

        var arrContract = new Array();
        arrContract['id'] = arrSearchResults[i].getValue(arrSearchColumns[7]);
        arrContract['template'] = arrSearchResults[i].getValue(arrSearchColumns[0]);
        arrContract['appliesto'] = arrSearchResults[i].getValue(arrSearchColumns[1]);
        arrContract['families'] = arrSearchResults[i].getValue(arrSearchColumns[2]);
        arrContract['skus'] = arrSearchResults[i].getValue(arrSearchColumns[3]);
        arrContract['discountamount'] = arrSearchResults[i].getValue(arrSearchColumns[4]);
        arrContract['fixedamount'] = arrSearchResults[i].getValue(arrSearchColumns[5]);
        arrContract['discountpercent'] = arrSearchResults[i].getValue(arrSearchColumns[6]);

        arrCustomerContracts[arrCustomerContracts.length] = arrContract;

    }

    return arrCustomerContracts;
}

function processContractAmount(arrCustomerContracts, itemFields) {

    var contractedDiscountAmount = 0;

    var item = itemFields['item'];
    var itemFamily = itemFields['itemfamily'];
    var rate = itemFields['rate'];
    var quantity = itemFields['quantity'];
    var currentTotal = rate * quantity;

    var finished = false;
    var calculatedDiscountAmount = 0;

    for (var i = 0; arrCustomerContracts != null && i < arrCustomerContracts.length && !finished; i++) {

        var contract = arrCustomerContracts[i];
        var contractId = contract['id'];
        var discountAmount = contract['discountamount'];
        var fixedAmount = contract['fixedamount'];
        var discountPercent = contract['discountpercent'];

        var strContractSKUs = contract['skus'];
        var strContractFamilies = contract['families'];

        var arrContractSKUs = new Array();
        var arrContractFamilies = new Array();

        if (strContractSKUs != null && strContractSKUs != '') {
            arrContractSKUs = strContractSKUs.split(',');
        }
        if (strContractFamilies != null && strContractFamilies != '') {
            arrContractFamilies = strContractFamilies.split(',');
        }

        for (var j = 0; arrContractSKUs != null && j < arrContractSKUs.length; j++) {

            var contractItem = arrContractSKUs[j];

            if (contractItem == item) {
                finished = true;
                break;
            }

        }
        for (var j = 0; arrContractFamilies != null && j < arrContractFamilies.length; j++) {

            var contractFamily = arrContractFamilies[j];

            if (contractFamily == itemFamily) {
                finished = true;
                break;
            }

        }

        if (finished) {
            if (!isEmpty(discountAmount)) {
                var newTotal = contractedDiscountRate * quantity;
                calculatedDiscountAmount = newTotal - currentTotal;
                break;
            }
            if (!isEmpty(fixedAmount)) {
                contractedDiscountAmount = parseFloat(fixedAmount) - currentTotal;
                break;
            }
            if (!isEmpty(discountPercent)) {
                calculatedDiscountAmount = currentTotal * (parseFloat(contractedDiscountPercent) / 100) * -1;
                break;
            }
        }
    }

    return new Array(finished, calculatedDiscountAmount);

}

function processOrderContracts(arrCustomerContracts, recOrder, createdFromRA, createdFromRA_LineID) {

    var contractedDiscountAmount = 0;

    var currentTotal = recOrder.getFieldValue('projectedtotal');
    var arrUniqueContracts = new Array();
    for (var i = 0; arrCustomerContracts != null && i < arrCustomerContracts.length; i++) {

        var contract = arrCustomerContracts[i];
        var contractId = contract['id'];
        var template = contract['template'];
        var discountAmount = contract['discountamount'];
        var fixedAmount = contract['fixedamount'];
        var discountPercent = contract['discountpercent'];
        var appliesto = contract['appliesto'];

        arrUniqueContracts[contractId] = '1';
        if (template == 10) { //customer required manual review
            recOrder.setFieldValue('custbodyr7opprarequiresmanualreview', 'T');
        }

        if (template == 1 || template == 4 || template == 5) {
            if (!isEmpty(discountAmount)) {
                contractedDiscountAmount = discountAmount * -1;
                break;
            }
            if (!isEmpty(fixedAmount)) {
                contractedDiscountAmount = (currentTotal - fixedAmount) * -1;
                break;
            }
            if (!isEmpty(discountPercent)) {
                contractedDiscountAmount = currentTotal * (parseFloat(discountPercent) / 100) * -1;
                break;
            }
        }

    }

    var arrContractsToSet = new Array();
    for (key in arrUniqueContracts) {
        arrContractsToSet[arrContractsToSet.length] = key;
    }
    var activeContractsToSet = getActiveContracts(arrContractsToSet);

    recOrder.setFieldValue('custbodyr7contractautomationrecs', activeContractsToSet);

    if (contractedDiscountAmount != 0) {
        contractedDiscountAmount = Math.round(parseFloat(contractedDiscountAmount) * 100) / 100;

        recOrder.selectNewLineItem('item');
        recOrder.setCurrentLineItemValue('item', 'item', -2); //subtotal
        recOrder.setCurrentLineItemValue('item', 'location', recOrder.getFieldValue('location'));
        recOrder.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
        recOrder.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
        recOrder.commitLineItem('item');

        recOrder.selectNewLineItem('item');
        recOrder.setCurrentLineItemValue('item', 'item', 51); //discount
        recOrder.setCurrentLineItemValue('item', 'description', 'CONTRACTED DISCOUNT');
        recOrder.setCurrentLineItemValue('item', 'price', -1);
        recOrder.setCurrentLineItemValue('item', 'rate', contractedDiscountAmount);
        recOrder.setCurrentLineItemValue('item', 'location', recOrder.getFieldValue('location'));
        recOrder.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
        recOrder.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
        recOrder.commitLineItem('item');
    }

    return recOrder;

}

function isEmpty(value) {

    if (value == null || value === '' || value == 'null') {
        return true;
    }
    return false;
}

/*
 * @param itemIid the internalId of item Returns the renewal properties of the
 * item iid
 */
function getItemPropertiesForItem(itemIid) {

    var properties = new Array('custitemr7itemrenewalsku', 'custitemr7itemrenewalgroup', 'custitemr7itemrarequiresmanualreview', 'custitemr7itemrenewalcode', 'custitemr7itemfamily', 'custitemr7itemrenewalpackage');
    var lookedUpProperties = nlapiLookupField('item', itemIid, properties);
    return lookedUpProperties;
}


function identifiyAssociatedDiscounts(objLinesToSplit, recOppCopy, opportunityId) {
    var discountWatch = false;
    var groupMembers = [];
    var discountSubTotals = [];
    var monetaryDiscounts = [];
    var groups = [];
    //a group in this context is a items and the subtotals & discounts linked to them in the order,
    //opposed to a product group which is just items
    for (var i = 1; i <= recOppCopy.getLineItemCount('item'); i++) {
        var itemType = recOppCopy.getLineItemValue('item', 'itemtype', i);
        var lineId = recOppCopy.getLineItemValue('item', 'id', i);

        switch (itemType) {
            case "Description":
                break;
            case "Subtotal":
                discountSubTotals.push(lineId);
                discountWatch = true;
                break;
            case "Discount":
                discountWatch ? discountSubTotals.push(lineId) : groupMembers.push(lineId);
                var rate = '' + recOppCopy.getLineItemValue('item', 'rate', i);
                if(rate.indexOf('%') === -1) { 
                    //monetary discount and must only be kept in copy if full group moves over
                    monetaryDiscounts.push(lineId);
                    var associatedDiscountLine = recOppCopy.getLineItemValue('item', 'discline', i);
                    monetaryDiscounts.push(opportunityId + '_' + associatedDiscountLine);
                }
                break;
            default:
                if(discountWatch) {
                    groups.push({
                        groupMemebers: groupMembers,
                        discountSubTotals: discountSubTotals,
                        monetaryDiscounts: monetaryDiscounts,
                    });
                    discountSubTotals = [];
                    monetaryDiscounts = [];
                    groupMembers = [lineId];
                } else {
                    groupMembers.push(lineId);
                }
          }

    }  
    //ensures that we add group memebers etc even if we didn't come to the end of a discount watch
    groups.push({
        groupMemebers: groupMembers,
        discountSubTotals : discountSubTotals,
        monetaryDiscounts: monetaryDiscounts
    });

    /*
    Discounts that need to be kept on the new OPP because they are linked to items on 
    the new opp
    */
    var discountSubtotalsToKeep = [];
    /*
    Discounts to remove from the original Opp, as they're linked to item groups/sets 
    that have been completely removed from the orig. opp
    */
    var discountSubtotalsToRemoveOrig = [];
    var discountSubtotalsToRemoveCopy= [];

    var groupsSplit = [];
    for(var i=0; i< groups.length; i++) {
        var group = groups[i].groupMemebers;
        for(var x=0; x< group.length; x++) {
            if(objLinesToSplit.hasOwnProperty(group[x])) {
                discountSubtotalsToKeep = discountSubtotalsToKeep.concat(groups[i].discountSubTotals);
                groupsSplit.push(i)
                break;
            }
        }
    }

    for(var i=0; i< groupsSplit.length; i++) {
        var groupIndex = groupsSplit[i];
        var group = groups[groupIndex].groupMemebers;
        var removeAllDiscounts = true;

        for(var x=0; x< group.length; x++) {
            if(!objLinesToSplit.hasOwnProperty(group[x])) {
                removeAllDiscounts = false;
                break;
            }
        }

        if(removeAllDiscounts) {
            discountSubtotalsToRemoveOrig = discountSubtotalsToRemoveOrig.concat(groups[groupIndex].discountSubTotals);
        } else if(groups[groupIndex].monetaryDiscounts.length > 0){
            discountSubtotalsToRemoveCopy = discountSubtotalsToRemoveCopy.concat(groups[groupIndex].monetaryDiscounts);
        }
    }
  
  return { 
      discountSubtotalsToKeep: discountSubtotalsToKeep,
      discountSubtotalsToRemoveOrig: discountSubtotalsToRemoveOrig,
      discountSubtotalsToRemoveCopy: discountSubtotalsToRemoveCopy
  };
}

function splitOpportunity(opportunityId, strLinesToSplit, strLinesToKeep) {
    nlapiLogExecution('DEBUG', opportunityId, 'strLinesToSplit: ' + strLinesToSplit);
    nlapiLogExecution('DEBUG', opportunityId, 'strLinesToKeep: ' + strLinesToKeep);
    var arrLinesToSplit = strLinesToSplit.split(',');
    var objLinesToSplit = new Object();
    for (var i = 0; arrLinesToSplit != null && i < arrLinesToSplit.length; i++) {
        var arrSplit = arrLinesToSplit[i].split(':');
        if (objLinesToSplit.hasOwnProperty(arrSplit[0]) && arrSplit.length > 1) {
            objLinesToSplit[arrSplit[0]] = objLinesToSplit[arrSplit[0]] + parseFloat(arrSplit[1]);
        }
        else {
            objLinesToSplit[arrSplit[0]] = (arrSplit.length > 1) ? parseFloat(arrSplit[1]) : null;
        }
    }

    var arrLinesToKeep = strLinesToKeep.split(',');
    var objLinesToKeep = new Object();
    for (var i = 0; arrLinesToKeep != null && i < arrLinesToKeep.length; i++) {
        var arrKeep = arrLinesToKeep[i].split(':');
        if (objLinesToKeep.hasOwnProperty(arrKeep[0]) && arrKeep.length > 1) {
            objLinesToKeep[arrKeep[0]] = objLinesToKeep[arrKeep[0]] + parseFloat(arrKeep[1]);
        }
        else {
            objLinesToKeep[arrKeep[0]] = (arrKeep.length > 1) ? parseFloat(arrKeep[1]) : null;
        }
    }

    var recOriginalOpp = nlapiLoadRecord('opportunity', opportunityId, { recordmode: 'dynamic' });
    //remove all but new from copy
    var recOppCopy = nlapiCopyRecord('opportunity', opportunityId, { recordmode: 'dynamic' });
    recOppCopy.setFieldValue('customform', 142);
    recOppCopy.setFieldValue('templatestored', 'T');
    recOppCopy.setFieldValue('entitystatus', recOriginalOpp.getFieldValue('entitystatus'));
    recOppCopy.setFieldValue('expectedclosedate', recOriginalOpp.getFieldValue('expectedclosedate'));

    var associatedDiscounts = identifiyAssociatedDiscounts(objLinesToSplit, recOppCopy, opportunityId);
    var discountSubtotalsToKeep = associatedDiscounts.discountSubtotalsToKeep;
    var discountSubtotalsToRemoveOrig = associatedDiscounts.discountSubtotalsToRemoveOrig;
    var discountSubtotalsToRemoveCopy = associatedDiscounts.discountSubtotalsToRemoveCopy;

    for (var i = 1; i <= recOppCopy.getLineItemCount('item'); i++) {
        var itemType = recOppCopy.getLineItemValue('item', 'itemtype', i);
        var lineId = recOppCopy.getLineItemValue('item', 'id', i);
        if (((!objLinesToSplit.hasOwnProperty(lineId) && discountSubtotalsToKeep.indexOf(lineId) === -1) 
                || discountSubtotalsToRemoveCopy.indexOf(lineId) !== -1) && itemType !== 'EndGroup') {
            recOppCopy.removeLineItem('item', i);
            i = 0;
        } else if (itemType == 'Discount' && objLinesToSplit[lineId] != null) {
                var currentText = recOppCopy.getLineItemValue('item', 'description', i);
                currentText += ' (Prorated discount)';
                recOppCopy.setLineItemValue('item', 'description', i, currentText);
                //recOppCopy.setLineItemValue('item', 'rate', i, objLinesToSplit[lineId]);
                //recOppCopy.setLineItemValue('item', 'custcolr7opamountrenewalbaseline', i, objLinesToSplit[lineId]);
            }
    }

    //now remove from original
    var recOppOriginal = nlapiLoadRecord('opportunity', opportunityId, { recordmode: 'dynamic' });
    var origTotal = sumTotalFromRec(recOppOriginal);
    for (var i = 1; i <= recOppOriginal.getLineItemCount('item'); i++) {
        var itemType = recOppOriginal.getLineItemValue('item', 'itemtype', i);
        var lineId = recOppOriginal.getLineItemValue('item', 'id', i);
        if ((!objLinesToKeep.hasOwnProperty(lineId) || discountSubtotalsToRemoveOrig.indexOf(lineId) !== -1)
            && itemType !== 'Description') {
            if((itemType == 'Discount' || itemType == 'Subtotal') && discountSubtotalsToRemoveOrig.indexOf(lineId) === -1) {
                nlapiLogExecution('AUDIT', 'remove but didnt orig', lineId);
                continue;
            }
            if(itemType !== 'EndGroup') {
                recOppOriginal.removeLineItem('item', i);
                i = 0;
            }
        }
        else
            if (itemType == 'Discount' && objLinesToKeep[lineId] != null) {
                var currentText = recOppOriginal.getLineItemValue('item', 'description', i);
                currentText += ' (Prorated discount)';
                recOppOriginal.setLineItemValue('item', 'description', i, currentText);
                //recOppOriginal.setLineItemValue('item', 'rate', i, objLinesToKeep[lineId]);
                //recOppOriginal.setLineItemValue('item', 'custcolr7opamountrenewalbaseline', i, objLinesToKeep[lineId]);
            }
    }

    var newOrigTotal = sumTotalFromRec(recOppOriginal);
    var copyTotal = sumTotalFromRec(recOppCopy);
    var newTotal = formatAmount(newOrigTotal + copyTotal)
    nlapiLogExecution('AUDIT','New Total: ' + newTotal+ 'Orig: ' + origTotal)

    if (!inRange(newTotal, origTotal, 0.01)) {
        var adminUser = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
        nlapiSendEmail(adminUser, adminUser, 'WTF ERROL!', 'They dont match! ' + '\n\nCopy: ' + copyTotal + '\nNew Orig: ' + newOrigTotal+ '\nOrig: ' + origTotal);
    }

    var minStart = determineExpectedCloseFromLines(recOppOriginal);
    recOppOriginal.setFieldValue('expectedclosedate', minStart);
    recOppOriginal.setFieldValue('custbodyr7oppexpectedclosedateamadjust', minStart);

    var minStart = determineExpectedCloseFromLines(recOppCopy);
    recOppCopy.setFieldValue('expectedclosedate', minStart);
    recOppCopy.setFieldValue('custbodyr7oppexpectedclosedateamadjust', minStart);
    addRenewalTerms(recOppCopy, '', '');

    updateChildOppErosionComments(recOppOriginal, recOppCopy);

    var newOppId = nlapiSubmitRecord(recOppCopy);
    nlapiLogExecution('DEBUG', '1198 submit newOppId ' + newOppId);
    postRunDataCheck(newOppId); //Added 7/25/2017 by Sa Ho (RSM)

    updateParentOppErosionComments(recOppOriginal, newOppId);

    var origOppId = nlapiSubmitRecord(recOppOriginal);
    nlapiLogExecution('DEBUG', '1192 submit origOppId ' + origOppId);
    postRunDataCheck(origOppId); //Added 7/25/2017 by Sa Ho (RSM)
    nlapiLogExecution('DEBUG', '1192 postRunDataCheck complete', '');

    return newOppId;
}

function updateChildOppErosionComments(parentOpp, childOpp) {
    var originalRegex = /\n?Opportunity un-cotermed with(.*\d)\./g;
    var originalTranId = parentOpp.getFieldValue('tranid');
    var originalErosionComments = parentOpp.getFieldValue('custbodyr7erosioncomments');

    // Remove the un-coterm message from the parent Erosion Reason before setting it on the copy.
    var newErosionComments = originalErosionComments.replace(originalRegex, '')
    var newUnCotermMessage = 'Opportunity un-cotermed from ' + originalTranId + '.';

    // Build and set the un-coterm message for the new opportunity
    newErosionComments = (newErosionComments + '\n\n' + newUnCotermMessage).trim();
    childOpp.setFieldValue('custbodyr7erosioncomments', newErosionComments);
}

function updateParentOppErosionComments(parentOpp, childOppId) {
    var childOppTranId = nlapiLookupField('opportunity', childOppId, 'tranid');
    var originalErosionComments = parentOpp.getFieldValue('custbodyr7erosioncomments');

    // Update the parent opportunity's
    var newUnCotermMessage = 'Opportunity un-cotermed with ' + childOppTranId + '.';
    var newErosionComments = (originalErosionComments + '\n\n' + newUnCotermMessage).trim();

    parentOpp.setFieldValue('custbodyr7erosioncomments', newErosionComments);
}

function inRange(value, reference, range) {
    if(value <= (reference + range) && value >= (reference - range)) {
        return true
    }
    return false;
}

function sumTotalFromRec(rec) {

    var total = 0;

    var lineItemCount = rec.getLineItemCount('item');

    for (var i = 1; i <= lineItemCount; i++) {
        var itemType = rec.getLineItemValue('item', 'itemtype', i);

        if (itemType != 'Subtotal' && itemType != 'Description') {
            total += +rec.getLineItemValue('item', 'amount', i);;
        }
    }

    return formatAmount(total);
}


function formatAmount(amount) {

    if (amount != null && amount != '') {
        return +nlapiFormatCurrency(amount);
    }

    return 0;
}

function createRenewalOpportunity(recTransaction, lineItems, type, oppAssociatedProperties, coTermWithOpp, coTermDate, workflow) {

    var oppRecordNew = null;
    var isDateOnly = false;
    var isCoterm = 'F';
    var createdFromRA = '';
    var createdFromRA_LineID = '';

    if (coTermDate != null && coTermDate != '') {
        isCoterm = 'T';

        oppRecordNew = recTransaction;

        var createdFromValues = determineCreatedFromRAValue(oppRecordNew);
        createdFromRA = createdFromValues[0];
        createdFromRA_LineID = createdFromValues[1];

        lineItems = coTermLineItems(coTermDate, lineItems);
        isDateOnly = true;
    }
    else
        if (coTermWithOpp != null && coTermWithOpp != '') {
            isCoterm = 'T';
            oppRecordNew = nlapiLoadRecord('opportunity', coTermWithOpp, { recordmode: 'dynamic' });

            // APPS-3665 ticket (https://issues.corp.rapid7.com/browse/APPS-3665)
            // CAR
            var sourceCARRecords = oppAssociatedProperties['custbodyr7contractautomationrecs'];
            nlapiLogExecution('DEBUG', 'car rec on source co-terming opp is', sourceCARRecords);
            // if the source co-terming opp has no CAR records assigned, no logic required.
            // check for array or string returned
            if ((Array.isArray(sourceCARRecords) && sourceCARRecords.length > 0) || (sourceCARRecords != '' && sourceCARRecords != null)) {

                var newCARValue = [];
                if (typeof(sourceCARRecords) == 'string' || typeof(sourceCARRecords) == 'number') {
                    newCARValue.push('' + sourceCARRecords)
                } else {
                    newCARValue = sourceCARRecords;
                }
                var targetCARRecords = oppRecordNew.getFieldValue('custbodyr7contractautomationrecs');
                if ((Array.isArray(targetCARRecords) && targetCARRecords.length > 0) || (targetCARRecords != '' && targetCARRecords != null)) {
                    if (typeof(targetCARRecords) == 'string' || typeof(targetCARRecords) == 'number') {
                        newCARValue.push('' + targetCARRecords)
                    } else {
                        newCARValue = newCARValue.concat(targetCARRecords)
                    }
                } 

                var newActiveCARValue = getActiveContracts(newCARValue)

                oppRecordNew.setFieldValue('custbodyr7contractautomationrecs', newActiveCARValue);

                nlapiLogExecution('DEBUG', 'car recs merged and assigned. field value is: ', oppRecordNew.getFieldValue('custbodyr7contractautomationrecs'));
            }
            // ARR
            var oldArrValue = oppRecordNew.getFieldValue('custbody_r7_total_arr');
            var oldArrExpectedValue = oppRecordNew.getFieldValue('custbody_r7_total_exp_cash_arr');
            oppRecordNew.setFieldValue('custbody_r7_total_exp_cash_arr', Number(oldArrExpectedValue) + Number(oppAssociatedProperties['custbody_r7_total_exp_cash_arr']));
            oppRecordNew.setFieldValue('custbody_r7_total_arr', Number(oldArrValue) + Number(oppAssociatedProperties['custbody_r7_total_arr']));
            // LARR
            var oldLarrValue = oppRecordNew.getFieldValue('custbodyr7renewaltotalamount');
            oppRecordNew.setFieldValue('custbodyr7renewaltotalamount', Number(oldLarrValue) + Number(oppAssociatedProperties['custbodyr7renewaltotalamount']));
             
            var createdFromValues = determineCreatedFromRAValue(oppRecordNew);
            createdFromRA = createdFromValues[0];
            createdFromRA_LineID = createdFromValues[1];

            var opp_createdFromValues = determineCreatedFromRAValueFromLineItems(lineItems);
            opp_createdFromRA = opp_createdFromValues[0];
            opp_createdFromRA_LineID = opp_createdFromValues[1];

            oppRecordNew.selectNewLineItem('item');
            oppRecordNew.setCurrentLineItemValue('item', 'item', -2); //subtotal
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
            oppRecordNew.commitLineItem('item');

            oppRecordNew.selectNewLineItem('item');
            oppRecordNew.setCurrentLineItemValue('item', 'item', 771); //description
            oppRecordNew.setCurrentLineItemValue('item', 'description', 'ITEM(S) BELOW ARE CO-TERMINATED\nORIGINAL ORDER DATE ' + nlapiLookupField('salesorder', opp_createdFromRA, 'trandate'));
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', opp_createdFromRA);
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', opp_createdFromRA_LineID);
            oppRecordNew.commitLineItem('item');

            lineItems = coTermLineItems(grabMaxEndDateForLineItems(oppRecordNew), lineItems);
        }
        else {

            if (type == 'Upsell') {
                oppRecordNew = nlapiCreateRecord('opportunity', {
                    recordmode: 'dynamic', customform: 154
                });
            }
            else {
                oppRecordNew = nlapiCreateRecord('opportunity', {
                    recordmode: 'dynamic', customform: 142
                });
            }

            oppRecordNew.setFieldValue('templatestored', 'T');
            oppRecordNew.setFieldValue('custbodyr7transactionrenewalopp', 'T');

            //Set all associated properties
            oppRecordNew.setFieldValue('entity', oppAssociatedProperties['entity']);
            oppRecordNew.setFieldValue('subsidiary', oppAssociatedProperties['subsidiary']);
            oppRecordNew.setFieldValue('department', oppAssociatedProperties['department']);
            oppRecordNew.setFieldValue('currency', recTransaction.getFieldValue('currency'));
            oppRecordNew.setFieldValue('location', oppAssociatedProperties['location']);
            oppRecordNew.setFieldValue('title', oppAssociatedProperties['title']);
            oppRecordNew.setFieldValue('entitystatus', oppAssociatedProperties['status']);
            oppRecordNew.setFieldValue('expectedclosedate', oppAssociatedProperties['expectedclosedate']);
            oppRecordNew.setFieldValue('custbodyr7oppexpectedclosedateamadjust', oppAssociatedProperties['expectedclosedate']);
            oppRecordNew.setFieldValue('leadsource', oppAssociatedProperties['leadsource']);
            oppRecordNew.setFieldValue('partner', oppAssociatedProperties['partner']);
            oppRecordNew.setFieldValue('custbodyr7partnerdealtype', oppAssociatedProperties['custbodyr7partnerdealtype']);
            oppRecordNew.setFieldValue('custbodyr7billingresponsibleparty', oppAssociatedProperties['custbodyr7billingresponsibleparty']);
            oppRecordNew.setFieldValue('custbodyr7opprenewalautomationcreated', 'T');
            oppRecordNew.setFieldValue('custbodyr7upliftpercentage', '5.0');

            //ARR
            var oldArrValue = oppRecordNew.getFieldValue('custbody_r7_total_arr');
            var oldArrExpectedValue = oppRecordNew.getFieldValue('custbody_r7_total_exp_cash_arr');
            oppRecordNew.setFieldValue('custbody_r7_total_exp_cash_arr', Number(oldArrExpectedValue) + Number(oppAssociatedProperties['custbody_r7_total_exp_cash_arr']));
            oppRecordNew.setFieldValue('custbody_r7_total_arr', Number(oldArrValue) + Number(oppAssociatedProperties['custbody_r7_total_arr']));
            // LARR
            var oldLarrValue = oppRecordNew.getFieldValue('custbodyr7renewaltotalamount');
            oppRecordNew.setFieldValue('custbodyr7renewaltotalamount', Number(oldLarrValue) + Number(oppAssociatedProperties['custbodyr7renewaltotalamount']));

            if (type == 'Upsell') {
                oppRecordNew.setFieldValue('custbodyr7accountmanagementworkflow', 11); //upsell
            }
            else {
                oppRecordNew.setFieldValue('custbodyr7accountmanagementworkflow', workflow); //whatever they say
            }
        }

    var memoNotes = oppRecordNew.getFieldValue('memo');

    updatedLineItems = lineItems;
    var existingLineItemsCount = oppRecordNew.getLineItemCount('item');
    var checkForItemGroups = false;
    var inactiveItems = false;
    //Create line items
    for (var i = 0; lineItems != null && i < lineItems.length; i++) {
        checkForItemGroups = true;
        var renewalSkuProperties = lineItems[i]['renewalSkuProperties'];
        if (renewalSkuProperties['custitemr7itemrarequiresmanualreview'] == 'T') {
            oppRecordNew.setFieldValue('custbodyr7opprarequiresmanualreview', 'T');
        }

        if (renewalSkuProperties['isinactive'] == 'T') {
            inactiveItems = true;
            oppRecordNew.setFieldValue('custbodyr7opprarequiresmanualreview', 'T');
            activateItem(renewalSkuProperties['internalid']);
            memoNotes += 'Inactive SKU used.\n';
        }

        oppRecordNew.selectNewLineItem('item');

        oppRecordNew.setCurrentLineItemValue('item', 'item', renewalSkuProperties['internalid']);
        oppRecordNew.setCurrentLineItemValue('item', 'description', lineItems[i]['description']);
        oppRecordNew.setCurrentLineItemValue('item', 'quantity', lineItems[i]['quantity']);
        oppRecordNew.setCurrentLineItemValue('item', 'price', lineItems[i]['priceLevel']);
        oppRecordNew.setCurrentLineItemValue('item', 'rate', (lineItems[i]['rate'])? lineItems[i]['rate']: 0);
        oppRecordNew.setCurrentLineItemValue('item', 'location', oppAssociatedProperties['location']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7startdate', lineItems[i]['startDate']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7enddate', lineItems[i]['endDate']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7translicenseid', lineItems[i]['custcolr7translicenseid']); //Added by Sa Ho (RSM)
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', lineItems[i]['custcolr7createdfromra']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', lineItems[i]['custcolr7createdfromra_lineid']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7itemmsproductkey', lineItems[i]['custcolr7itemmsproductkey']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7_monthlydatalimit_gb', lineItems[i]['custcolr7_monthlydatalimit_gb']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7managedserviceid', lineItems[i]['custcolr7managedserviceid']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7managedsoftwareid', lineItems[i]['custcolr7managedsoftwareid']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7contractrenewal', lineItems[i]['contract']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7renewedfromlineid', lineItems[i]['contractLineId']);
        //ARR
        oppRecordNew.setCurrentLineItemValue('item', 'custcol_r7_expected_arr', lineItems[i]['custcol_r7_expected_arr']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7dataretentionlengthdays', lineItems[i]['custcolr7dataretentionlengthdays'] || null);      
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7insighttotaldataretention', lineItems[i]['totalDataRetention'] || null);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7insightlicensedassets', lineItems[i]['licensedAssests'] || null);
        
        if (lineItems[i]['renewalbase'] == 'AMOUNT') {
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7opamountrenewalbaseline', oppRecordNew.getCurrentLineItemValue('item', 'amount'));
        }
        else {
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7opamountrenewalbaseline', lineItems[i]['renewalbase']);
        }
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7iscotermline', isCoterm);

        if (validateReferenceKey('contact', lineItems[i]['contact'])) {
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7translinecontact', lineItems[i]['contact']);
        }

        if (renewalSkuProperties['isinactive'] == 'T') {
            try {
                oppRecordNew.commitLineItem('item');
                deactivateItem(renewalSkuProperties['internalid']);
            }
            catch (e) {
                deactivateItem(renewalSkuProperties['internalid']);
            }
        }
        else {
            oppRecordNew.commitLineItem('item');
        }

        if (lineItems[i]['discountAmount'] < 0) {
            oppRecordNew.selectNewLineItem('item');
            oppRecordNew.setCurrentLineItemValue('item', 'item', 51); //discount
            oppRecordNew.setCurrentLineItemValue('item', 'description', 'CONTRACTED DISCOUNT');
            oppRecordNew.setCurrentLineItemValue('item', 'price', -1);
            oppRecordNew.setCurrentLineItemValue('item', 'rate', lineItems[i]['discountAmount']);
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', lineItems[i]['custcolr7createdfromra']);
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', lineItems[i]['custcolr7createdfromra_lineid']);
            oppRecordNew.commitLineItem('item');
        }

        if (lineItems[i]['custcolr7createdfromra'] != null && lineItems[i]['custcolr7createdfromra'] != '') {
            createdFromRA = lineItems[i]['custcolr7createdfromra'];
        }
        if (lineItems[i]['custcolr7createdfromra_lineid'] != null && lineItems[i]['custcolr7createdfromra_lineid'] != '') {
            createdFromRA_LineID = lineItems[i]['custcolr7createdfromra_lineid'];
        }
    }

    //Added 9/20/2019 by Sa Ho (RSM)
    //Handle Item Groups when co-terming -- update the pricing line with data because they are not stored on the item group header
    if (checkForItemGroups) {
        var itemGroupCounter = 0;
        var itemsCount = oppRecordNew.getLineItemCount('item');

        var pricingLineItems = getPricingLineItems(oppRecordNew);

        for (var j = (existingLineItemsCount + 1); j <= itemsCount; j++) {
            var item = oppRecordNew.getLineItemValue('item', 'item', j);
            var itemType = oppRecordNew.getLineItemValue('item', 'itemtype', j);
            var inGroup = oppRecordNew.getLineItemValue('item', 'ingroup', j);
            var pricingLine = pricingLineItems[item] || null;

            if (lineItems[itemGroupCounter]['itemType'] != 'Group')
                itemGroupCounter++;

            nlapiLogExecution('DEBUG', 'loop at i = ' + j + ' item: ' + item + ' itemType: ' + itemType + ' ingroup: ' + inGroup + ' pricingLine: ' + pricingLine);
            nlapiLogExecution('DEBUG', 'existingLineItems counter ' + itemGroupCounter);

            if (itemType == 'Group') {
                oppRecordNew.selectLineItem('item', j);
                oppRecordNew.setCurrentLineItemValue('item', 'description', lineItems[itemGroupCounter]['description']);
                nlapiLogExecution('DEBUG', 'removing arr from item group', lineItems[itemGroupCounter]);
                oppRecordNew.setCurrentLineItemValue('item', 'custcol_r7_expected_arr', '');
                oppRecordNew.setCurrentLineItemValue('item', 'description', lineItems[itemGroupCounter]['description']);
                oppRecordNew.commitLineItem('item');
            }

            else if (inGroup == 'T' && itemType != 'Group' && itemType != 'EndGroup') {
                oppRecordNew.selectLineItem('item', j);

                if (pricingLine == 'T') {
                    oppRecordNew.setCurrentLineItemValue('item', 'quantity', lineItems[itemGroupCounter]['quantity']);
                    oppRecordNew.setCurrentLineItemValue('item', 'price', lineItems[itemGroupCounter]['priceLevel']);
                    oppRecordNew.setCurrentLineItemValue('item', 'rate', lineItems[itemGroupCounter]['rate']);
                    nlapiLogExecution('DEBUG', 'setting ARR for item pricing ' + itemGroupCounter, lineItems[itemGroupCounter]);
                    oppRecordNew.setCurrentLineItemValue('item', 'custcol_r7_expected_arr', lineItems[itemGroupCounter]['custcol_r7_expected_arr']);
                }

                else {
                    oppRecordNew.setCurrentLineItemValue('item', 'quantity', lineItems[itemGroupCounter]['quantity']);
                    oppRecordNew.setCurrentLineItemValue('item', 'price', lineItems[itemGroupCounter]['priceLevel']);
                    oppRecordNew.setCurrentLineItemValue('item', 'rate', 0);
                    oppRecordNew.setCurrentLineItemValue('item', 'amount', 0);
                }

                oppRecordNew.setCurrentLineItemValue('item', 'custcolr7startdate', lineItems[itemGroupCounter]['startDate']);
                oppRecordNew.setCurrentLineItemValue('item', 'custcolr7enddate', lineItems[itemGroupCounter]['endDate']);
                oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', lineItems[itemGroupCounter]['custcolr7createdfromra']);
                if (validateReferenceKey('contact', lineItems[itemGroupCounter]['contact'])) {
                    oppRecordNew.setCurrentLineItemValue('item', 'custcolr7translinecontact', lineItems[itemGroupCounter]['contact']);
                }

                oppRecordNew.commitLineItem('item');
            }

            else if (itemType == 'EndGroup') {
                itemGroupCounter++;
            }
        }
    }
    //End

    if (isDateOnly) {
        addRenewalTerms(oppRecordNew, createdFromRA, createdFromRA_LineID);
        return oppRecordNew;
    }

    if (!isCoterm) {
        oppRecordNew = processOrderContracts(arrOrderContracts, oppRecordNew, createdFromRA, createdFromRA_LineID);
    }

    oppRecordNew.setFieldValue('partner', '');
    if (oppAssociatedProperties['partner'] != '' && oppAssociatedProperties['partner'] != null) {

        var fldsPartner = nlapiLookupField('partner', oppAssociatedProperties['partner'], new Array('custentityr7partnerdiscountrenewals', 'isinactive'));
        var partnerDiscountPerc = fldsPartner['custentityr7partnerdiscountrenewals'];
        var partnerInactive = fldsPartner['isinactive'];

        if (partnerInactive != 'T') {
            oppRecordNew.setFieldValue('partner', oppAssociatedProperties['partner']);

            if (isCoterm != 'T') {
                var lineCount = oppRecordNew.getLineItemCount('item');
                var lastItemRate = oppRecordNew.getLineItemValue('item','rate', lineCount);
                //nlapiLogExecution('DEBUG', 'mdr lastItemRate', lastItemRate);
                if(lastItemRate != '' && lastItemRate != null && lastItemRate != 0 && lastItemRate != 0.0){
                    if (partnerDiscountPerc != '' && partnerDiscountPerc != null && partnerDiscountPerc != '0.0%') {
                        oppRecordNew.selectNewLineItem('item');
                        oppRecordNew.setCurrentLineItemValue('item', 'item', -2); //subtotal
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
                        oppRecordNew.commitLineItem('item');
                        nlapiLogExecution('DEBUG', 'subtotal commited')

                        oppRecordNew.selectNewLineItem('item');
                        oppRecordNew.setCurrentLineItemValue('item', 'item', -6); //partner discount
                        oppRecordNew.setCurrentLineItemValue('item', 'price', -1);
                        oppRecordNew.setCurrentLineItemValue('item', 'rate', '-' + partnerDiscountPerc);
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
                        oppRecordNew.commitLineItem('item');
                        nlapiLogExecution('DEBUG', 'partner discount commited')
                    }
                }
            }
        }
    }

    if (type == 'Primary') {
        oppRecordNew.selectNewLineItem('item');
        oppRecordNew.setCurrentLineItemValue('item', 'item', 107);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
        oppRecordNew.commitLineItem('item');
    }

    if (oppAssociatedProperties['custbodyr7transactiondiscounttotal'] != null && oppAssociatedProperties['custbodyr7transactiondiscounttotal'] != '' && parseFloat(oppAssociatedProperties['custbodyr7transactiondiscounttotal']) >= 25) {
        oppRecordNew.setFieldValue('custbodyr7opprarequiresmanualreview', 'T');
        memoNotes += 'Discount on renewed Sales Order was greater than 25%\n';
    }

    oppRecordNew.setFieldValue('memo', memoNotes);
    var minStart = determineExpectedCloseFromLines(oppRecordNew);
    oppRecordNew.setFieldValue('expectedclosedate', minStart);
    oppRecordNew.setFieldValue('custbodyr7oppexpectedclosedateamadjust', minStart);

    var salesRep = oppAssociatedProperties['salesrep'];
    var salesRepInactive = false;
    if (salesRep != null && salesRep != '') {
        var isInactive = nlapiLookupField('employee', salesRep, 'isinactive');
        if (isInactive == 'T') {
            salesRepInactive = true;
        }
    }
    var id = '';

    try {
        if(!isCoterm) {
            addRenewalTerms(oppRecordNew, createdFromRA, createdFromRA_LineID);
        }
        if (salesRepInactive) {
            activateEmployee(salesRep);
            oppRecordNew.setFieldValue('salesrep', oppAssociatedProperties['salesrep']);
            id = nlapiSubmitRecord(oppRecordNew);
            nlapiLogExecution('DEBUG', '1468 Submitting oppRecordNew ' + id);
            postRunDataCheck(id); //Added 7/25/2017 by Sa Ho (RSM)
            inactivateEmployees(salesRep);
        }
        else {
            oppRecordNew.setFieldValue('salesrep', oppAssociatedProperties['salesrep']);
            id = nlapiSubmitRecord(oppRecordNew);
            nlapiLogExecution('DEBUG', '1474 submitting oppRecordNew ' + id);
            postRunDataCheck(id); //Added 7/25/2017 by Sa Ho (RSM)
        }

    }
    catch (err) {
        if (salesRepInactive) {
            inactivateEmployees(salesRep);
        }
        throw nlapiCreateError(err.getCode(), err.getDetails());
    }

    if (inactiveItems) {
        try {
            //nlapiSendEmail(55011, oppAssociatedProperties['salesrep'], 'RA Created Renewal used INACTIVE SKU', 'Please fix: https://663271.app.netsuite.com/app/accounting/transactions/opprtnty.nl?id=' + id, 'suzannah_cooke@rapid7.com');
        }
        catch (e) {

        }
    }
    arrCreatedOppIds[arrCreatedOppIds.length] = id;
    return id;
}

function createRenewalOpportunityFromSo(recTransaction, lineItems, type, oppAssociatedProperties, coTermWithOpp, coTermDate, workflow) {
    var oppRecordNew = null;
    var isDateOnly = false;
    var isCoterm = 'F';
    var createdFromRA = '';
    var createdFromRA_LineID = '';
    var listOfCSMDepartments = [10, 120, 121];   //'Customer Success', Americas Customer Success', 'International Customer Success'
    var department = listOfCSMDepartments.indexOf(oppAssociatedProperties['department']) === -1 ? 10 : oppAssociatedProperties['department'];


    if (coTermDate != null && coTermDate != '') {
        isCoterm = 'T';

        oppRecordNew = recTransaction;

        var createdFromValues = determineCreatedFromRAValue(oppRecordNew);
        createdFromRA = createdFromValues[0];
        createdFromRA_LineID = createdFromValues[1];

        lineItems = coTermLineItems(coTermDate, lineItems);
        isDateOnly = true;
    }
    else
        if (coTermWithOpp != null && coTermWithOpp != '') {
            isCoterm = 'T';

            oppRecordNew = nlapiLoadRecord('opportunity', coTermWithOpp, { recordmode: 'dynamic' });
            //update of ARR values from old to new opp
            var oldArrValue = oppRecordNew.getFieldValue('custbody_r7_total_arr');
            var oldArrExpectedValue = oppRecordNew.getFieldValue('custbody_r7_total_exp_cash_arr');
            oppRecordNew.setFieldValue('custbody_r7_total_exp_cash_arr', Number(oldArrExpectedValue) + Number(oppAssociatedProperties['custbody_r7_total_exp_cash_arr']));
            oppRecordNew.setFieldValue('custbody_r7_total_arr', Number(oldArrValue) + Number(oppAssociatedProperties['custbody_r7_total_arr']));
            // LARR
            var oldLarrValue = oppRecordNew.getFieldValue('custbodyr7renewaltotalamount');
            oppRecordNew.setFieldValue('custbodyr7renewaltotalamount', Number(oldLarrValue) + Number(oppAssociatedProperties['custbodyr7renewaltotalamount']));

            var createdFromValues = determineCreatedFromRAValue(oppRecordNew);
            createdFromRA = createdFromValues[0];
            createdFromRA_LineID = createdFromValues[1];

            var opp_createdFromValues = determineCreatedFromRAValueFromLineItems(lineItems);
            opp_createdFromRA = opp_createdFromValues[0];
            opp_createdFromRA_LineID = opp_createdFromValues[1];



            oppRecordNew.selectNewLineItem('item');
            oppRecordNew.setCurrentLineItemValue('item', 'item', -2); //subtotal
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
            oppRecordNew.commitLineItem('item');

            oppRecordNew.selectNewLineItem('item');
            oppRecordNew.setCurrentLineItemValue('item', 'item', 771); //description
            oppRecordNew.setCurrentLineItemValue('item', 'description', 'ITEM(S) BELOW ARE CO-TERMINATED\nORIGINAL ORDER DATE ' + nlapiLookupField('salesorder', opp_createdFromRA, 'trandate'));
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', opp_createdFromRA);
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', opp_createdFromRA_LineID);
            oppRecordNew.commitLineItem('item');
            lineItems = coTermLineItems(grabMaxEndDateForLineItems(oppRecordNew), lineItems);
        }
        else {
            if (type == 'Upsell') {
                oppRecordNew = nlapiCreateRecord('opportunity', {
                    recordmode: 'dynamic', customform: 154
                });
            }
            else {
                oppRecordNew = nlapiCreateRecord('opportunity', {
                    recordmode: 'dynamic', customform: 142
                });
            }

            oppRecordNew.setFieldValue('templatestored', 'T');
            oppRecordNew.setFieldValue('custbodyr7transactionrenewalopp', 'T');
            //Set all associated properties
            oppRecordNew.setFieldValue('entity', oppAssociatedProperties['entity']);
            oppRecordNew.setFieldValue('subsidiary', oppAssociatedProperties['subsidiary']);
            oppRecordNew.setFieldValue('department', department);
            oppRecordNew.setFieldValue('currency', recTransaction.getFieldValue('currency'));
            oppRecordNew.setFieldValue('location', oppAssociatedProperties['location']);
            oppRecordNew.setFieldValue('title', oppAssociatedProperties['title']);
            oppRecordNew.setFieldValue('entitystatus', oppAssociatedProperties['status']);
            oppRecordNew.setFieldValue('expectedclosedate', oppAssociatedProperties['expectedclosedate']);
            oppRecordNew.setFieldValue('custbodyr7oppexpectedclosedateamadjust', oppAssociatedProperties['expectedclosedate']);
            oppRecordNew.setFieldValue('leadsource', oppAssociatedProperties['leadsource']);
            oppRecordNew.setFieldValue('custbodyr7partnerdealtype', oppAssociatedProperties['custbodyr7partnerdealtype']);
            oppRecordNew.setFieldValue('custbodyr7billingresponsibleparty', oppAssociatedProperties['custbodyr7billingresponsibleparty']);
            oppRecordNew.setFieldValue('custbodyr7opprenewalautomationcreated', 'T');
            oppRecordNew.setFieldValue('custbodyr7upliftpercentage', '5.0');

            // https://issues.corp.rapid7.com/browse/APPS-12259 SKUnicorn 2.0
            oppRecordNew.setFieldValue('custbody_r7_3rd_party_scanning', oppAssociatedProperties['custbody_r7_3rd_party_scanning']);
            oppRecordNew.setFieldValue('custbody_r7_auto_renewal_opt_out', oppAssociatedProperties['custbody_r7_auto_renewal_opt_out']);
            oppRecordNew.setFieldValue('custbody_r7_use_of_subcontractors', oppAssociatedProperties['custbody_r7_use_of_subcontractors']);
            // CAR multiselect
            oppRecordNew.setFieldValue('custbodyr7contractautomationrecs', oppAssociatedProperties['custbodyr7contractautomationrecs']);
            //ARR
            oppRecordNew.setFieldValue('custbody_r7_total_exp_cash_arr', oppAssociatedProperties['custbody_r7_total_exp_cash_arr']);
            oppRecordNew.setFieldValue('custbody_r7_total_arr', oppAssociatedProperties['custbody_r7_total_exp_cash_arr']);
            // LARR 
            oppRecordNew.setFieldValue('custbodyr7renewaltotalamount', oppAssociatedProperties['custbodyr7renewaltotalamount']);

            if (type == 'Upsell') {
                oppRecordNew.setFieldValue('custbodyr7accountmanagementworkflow', 11); //upsell
            }
            else {
                oppRecordNew.setFieldValue('custbodyr7accountmanagementworkflow', workflow); //whatever they say
            }
        }

    var memoNotes = oppRecordNew.getFieldValue('memo');

    var inactiveItems = false;
    //Create line items
    for (var i = 0; lineItems != null && i < lineItems.length; i++) {

        var renewalSkuProperties = lineItems[i]['renewalSkuProperties'];
        if (renewalSkuProperties['custitemr7itemrarequiresmanualreview'] == 'T') {
            oppRecordNew.setFieldValue('custbodyr7opprarequiresmanualreview', 'T');

        }

        if (renewalSkuProperties['isinactive'] == 'T') {
            inactiveItems = true;
            oppRecordNew.setFieldValue('custbodyr7opprarequiresmanualreview', 'T');
            activateItem(renewalSkuProperties['internalid']);
            memoNotes += 'Inactive SKU used.\n';
        }

        oppRecordNew.selectNewLineItem('item');

        oppRecordNew.setCurrentLineItemValue('item', 'item', renewalSkuProperties['internalid']);
        oppRecordNew.setCurrentLineItemValue('item', 'quantity', lineItems[i]['quantity']);
        oppRecordNew.setCurrentLineItemValue('item', 'price', lineItems[i]['priceLevel']);
        oppRecordNew.setCurrentLineItemValue('item', 'rate', lineItems[i]['rate']);
        oppRecordNew.setCurrentLineItemValue('item', 'location', oppAssociatedProperties['location']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7startdate', lineItems[i]['startDate']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7enddate', lineItems[i]['endDate']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', lineItems[i]['custcolr7createdfromra']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', lineItems[i]['custcolr7createdfromra_lineid']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7itemmsproductkey', lineItems[i]['custcolr7itemmsproductkey']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7_monthlydatalimit_gb', lineItems[i]['custcolr7_monthlydatalimit_gb']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7managedserviceid', lineItems[i]['custcolr7managedserviceid']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7managedsoftwareid', lineItems[i]['custcolr7managedsoftwareid']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7contractrenewal', lineItems[i]['contract']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7renewedfromlineid', lineItems[i]['contractLineId']);
        //ARR
        oppRecordNew.setCurrentLineItemValue('item', 'custcol_r7_expected_arr', lineItems[i]['custcol_r7_expected_arr']);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7dataretentionlengthdays', lineItems[i]['custcolr7dataretentionlengthdays'] || null);      
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7insighttotaldataretention', lineItems[i]['totalDataRetention'] || null);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7insightlicensedassets', lineItems[i]['licensedAssests'] || null);
        
        if(lineItems[i]['custcol_r7_pck_package_item']){
            nlapiLogExecution('AUDIT', 'Has package');
            var renewalPackage = getItemPropertiesForItem(lineItems[i]['custcol_r7_pck_package_item']);
            nlapiLogExecution('AUDIT', 'renewalPackage:' + JSON.stringify(renewalPackage['custitemr7itemrenewalpackage']));
            if(renewalPackage['custitemr7itemrenewalpackage']){
                nlapiLogExecution('AUDIT', 'Has renewal package '+ renewalPackage['custitemr7itemrenewalpackage']);
                oppRecordNew.setCurrentLineItemValue('item', 'custcol_r7_pck_package_item', renewalPackage['custitemr7itemrenewalpackage']);
            }
            oppRecordNew.setCurrentLineItemValue('item', 'custcol_r7_pck_package_level', lineItems[i]['custcol_r7_pck_package_level']);
            oppRecordNew.setCurrentLineItemValue('item', 'custcol_r7_pck_package_license', lineItems[i]['custcol_r7_pck_package_license']);
        }

        if (lineItems[i]['renewalbase'] == 'AMOUNT') {
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7opamountrenewalbaseline', oppRecordNew.getCurrentLineItemValue('item', 'amount'));
        }
        else {
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7opamountrenewalbaseline', lineItems[i]['renewalbase']);
        }
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7iscotermline', isCoterm);

        if (validateReferenceKey('contact', lineItems[i]['contact'])) {
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7translinecontact', lineItems[i]['contact']);
        }

        if (renewalSkuProperties['isinactive'] == 'T') {
            try {
                oppRecordNew.commitLineItem('item');
                deactivateItem(renewalSkuProperties['internalid']);
            }
            catch (e) {
                deactivateItem(renewalSkuProperties['internalid']);
            }
        }
        else {
            oppRecordNew.commitLineItem('item');
        }

        //Added 10/4/2017 by Sa Ho (RSM)
        //Check for Item group
        var currLineItemCount = oppRecordNew.getLineItemCount('item');
        if (oppRecordNew.getLineItemValue('item', 'itemtype', currLineItemCount) == 'EndGroup') {
            var groupInfo = lineItems[i]['groupInfo'];
            var memberIndex = groupInfo ? groupInfo.memberCount:0;
            for (var x = currLineItemCount - 1; x >= 1; x--) {
                var currLineItemType = oppRecordNew.getLineItemValue('item', 'itemtype', x);
                var currLineInGroup = oppRecordNew.getLineItemValue('item', 'ingroup', x);
                var currLineItemId = oppRecordNew.getLineItemValue('item', 'item', x);

                if (currLineInGroup == 'T' && currLineItemType != 'Group' && currLineItemType != 'EndGroup') {
                    oppRecordNew.selectLineItem('item', x);
                    oppRecordNew.setCurrentLineItemValue('item', 'price',lineItems[i]['priceLevel']);
                    oppRecordNew.setCurrentLineItemValue('item', 'rate',  groupInfo && groupInfo['line'+memberIndex] ?  groupInfo['line'+memberIndex].rate : lineItems[i]['rate']);
                    oppRecordNew.setCurrentLineItemValue('item', 'quantity',  groupInfo && groupInfo['line' +memberIndex] ?  groupInfo['line'+memberIndex].quantity : lineItems[i]['quantity']);
                    if (nlapiLookupField('item', currLineItemId, 'custitem_arm_upgrade_pricing_line') == 'T') {
                        nlapiLogExecution('DEBUG', 'item ' + currLineItemId + ' is a price line item, set expected ARR');
                        oppRecordNew.setCurrentLineItemValue('item', 'custcol_r7_expected_arr', groupInfo && groupInfo['line' +memberIndex] ?  groupInfo['line'+ memberIndex].expectedARR : lineItems[i]['custcol_r7_expected_arr']);
                    }

                    oppRecordNew.setCurrentLineItemValue('item', 'custcolr7startdate', lineItems[i]['startDate']);
                    oppRecordNew.setCurrentLineItemValue('item', 'custcolr7enddate', lineItems[i]['endDate']);
                    oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', lineItems[i]['custcolr7createdfromra']);
                    if (validateReferenceKey('contact', lineItems[i]['contact'])) {
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7translinecontact', lineItems[i]['contact']);
                    }

                    oppRecordNew.setCurrentLineItemValue('item', 'custcolr7startdate', lineItems[i]['startDate']);
                    oppRecordNew.setCurrentLineItemValue('item', 'custcolr7enddate', lineItems[i]['endDate']);
                    oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', lineItems[i]['custcolr7createdfromra']);
                    if (validateReferenceKey('contact', lineItems[i]['contact'])) {
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7translinecontact', lineItems[i]['contact']);
                    }
                    
                    oppRecordNew.commitLineItem('item');
                    memberIndex--;
                }

                else if (currLineItemType == 'Group') {
                    oppRecordNew.selectLineItem('item', x);
                    nlapiLogExecution('DEBUG', 'removing arr from item group', lineItems[i]);
                    oppRecordNew.setCurrentLineItemValue('item', 'custcol_r7_expected_arr', '');
                    oppRecordNew.commitLineItem('item');
                    break;
                }

                else
                    break;
            }
        }
        //End new logic

        if (lineItems[i]['discountAmount'] < 0) {
            oppRecordNew.selectNewLineItem('item');
            oppRecordNew.setCurrentLineItemValue('item', 'item', 51); //discount
            oppRecordNew.setCurrentLineItemValue('item', 'description', 'CONTRACTED DISCOUNT');
            oppRecordNew.setCurrentLineItemValue('item', 'price', -1);
            oppRecordNew.setCurrentLineItemValue('item', 'rate', lineItems[i]['discountAmount']);
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', lineItems[i]['custcolr7createdfromra']);
            oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', lineItems[i]['custcolr7createdfromra_lineid']);
            oppRecordNew.commitLineItem('item');
        }

        if (lineItems[i]['custcolr7createdfromra'] != null && lineItems[i]['custcolr7createdfromra'] != '') {
            createdFromRA = lineItems[i]['custcolr7createdfromra'];
        }
        if (lineItems[i]['custcolr7createdfromra_lineid'] != null && lineItems[i]['custcolr7createdfromra_lineid'] != '') {
            createdFromRA_LineID = lineItems[i]['custcolr7createdfromra_lineid'];
        }
    }

    if (isDateOnly) {
        return oppRecordNew;
    }

    oppRecordNew = processOrderContracts(arrOrderContracts, oppRecordNew, createdFromRA, createdFromRA_LineID);

    if (isCoterm == 'F') {
        oppRecordNew.setFieldValue('partner', '');
        if (oppAssociatedProperties['partner'] != '' && oppAssociatedProperties['partner'] != null) {

            var fldsPartner = nlapiLookupField('partner', oppAssociatedProperties['partner'], new Array('custentityr7partnerdiscountrenewals', 'isinactive'));
            var partnerDiscountPerc = fldsPartner['custentityr7partnerdiscountrenewals'];
            var partnerInactive = fldsPartner['isinactive'];

            if (partnerInactive != 'T') {
                oppRecordNew.setFieldValue('partner', oppAssociatedProperties['partner']);
                var lineCount = oppRecordNew.getLineItemCount('item');
                var lastItemRate = oppRecordNew.getLineItemValue('item','rate', lineCount);
                //nlapiLogExecution('DEBUG', 'mdr lastItemRate', lastItemRate);
                //nlapiLogExecution('DEBUG', 'mdr lastItemRate', lastItemRate);
                if(lastItemRate != '' && lastItemRate != null && lastItemRate != 0 && lastItemRate != 0.0){
                    if (partnerDiscountPerc != '' && partnerDiscountPerc != null && partnerDiscountPerc != '0.0%') {
                        oppRecordNew.selectNewLineItem('item');
                        oppRecordNew.setCurrentLineItemValue('item', 'item', -2); //subtotal
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
                        oppRecordNew.commitLineItem('item');

                        oppRecordNew.selectNewLineItem('item');
                        oppRecordNew.setCurrentLineItemValue('item', 'item', -6); //partner discount
                        oppRecordNew.setCurrentLineItemValue('item', 'price', -1);
                        oppRecordNew.setCurrentLineItemValue('item', 'rate', '-' + partnerDiscountPerc);
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
                        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
                        oppRecordNew.commitLineItem('item');
                    }
                }
            }
        }
    }

    if (type == 'Primary') {
        oppRecordNew.selectNewLineItem('item');
        oppRecordNew.setCurrentLineItemValue('item', 'item', 107);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
        oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
        oppRecordNew.commitLineItem('item');
    }

    if (oppAssociatedProperties['custbodyr7transactiondiscounttotal'] != null && oppAssociatedProperties['custbodyr7transactiondiscounttotal'] != '' && parseFloat(oppAssociatedProperties['custbodyr7transactiondiscounttotal']) >= 25) {
        oppRecordNew.setFieldValue('custbodyr7opprarequiresmanualreview', 'T');
        memoNotes += 'Discount on renewed Sales Order was greater than 25%\n';
    }

    oppRecordNew.setFieldValue('memo', memoNotes);
    var minStart = determineExpectedCloseFromLines(oppRecordNew);
    oppRecordNew.setFieldValue('expectedclosedate', minStart);
    oppRecordNew.setFieldValue('custbodyr7oppexpectedclosedateamadjust', minStart);

    var salesRep = oppAssociatedProperties['salesrep'];
    var salesRepInactive = false;
    if (salesRep != null && salesRep != '') {
        var isInactive = nlapiLookupField('employee', salesRep, 'isinactive');
        if (isInactive == 'T') {
            salesRepInactive = true;
        }
    }
    var id = '';

    try {
        addRenewalTerms(oppRecordNew, createdFromRA, createdFromRA_LineID);
        if (salesRepInactive) {
            activateEmployee(salesRep);
            oppRecordNew.setFieldValue('salesrep', oppAssociatedProperties['salesrep']);
            id = nlapiSubmitRecord(oppRecordNew);
            nlapiLogExecution('DEBUG', '1468 Submitting oppRecordNew ' + id);
            postRunDataCheck(id); //Added 7/25/2017 by Sa Ho (RSM)
            inactivateEmployees(salesRep);
        }
        else {
            oppRecordNew.setFieldValue('salesrep', oppAssociatedProperties['salesrep']);
            id = nlapiSubmitRecord(oppRecordNew);
            nlapiLogExecution('DEBUG', '1474 submitting oppRecordNew ' + id);
            postRunDataCheck(id); //Added 7/25/2017 by Sa Ho (RSM)
        }

    }
    catch (err) {
        if (salesRepInactive) {
            inactivateEmployees(salesRep);
        }
        throw nlapiCreateError(err.getCode(), err.getDetails());
    }

    if (inactiveItems) {
        try {
            //nlapiSendEmail(55011, oppAssociatedProperties['salesrep'], 'RA Created Renewal used INACTIVE SKU', 'Please fix: https://663271.app.netsuite.com/app/accounting/transactions/opprtnty.nl?id=' + id, 'suzannah_cooke@rapid7.com');
        }
        catch (e) {

        }
    }
    //copy Partner sublist from SO to new renewal opp
    try{
        copyPartnersFromSO(recTransaction.getId(), recTransaction.getRecordType(),id);
    } catch(e) {
        nlapiLogExecution("DEBUG", e.name, e.message);
    }
    nlapiLogExecution("DEBUG", "Finished Partners")
    arrCreatedOppIds[arrCreatedOppIds.length] = id;
    return id;
}

function grabMaxEndDateForLineItems(recOrder) {

    var oppLineItemCount = recOrder.getLineItemCount('item');

    var maxEndDate = '';

    for (var i = 1; i <= oppLineItemCount; i++) {
        var lineEndDate = recOrder.getLineItemValue('item', 'custcolr7enddate', i);

        if (lineEndDate != null && lineEndDate != '') {

            var dtLineEndDate = nlapiStringToDate(lineEndDate);

            if (maxEndDate == null || maxEndDate == '' || dtLineEndDate > maxEndDate) {
                maxEndDate = dtLineEndDate;
            }

        }
    }

    if (maxEndDate == '' || maxEndDate == null) {
        throw nlapiCreateError('INVALID DATE', 'Could not determine end date of opportunity.');
    }

    return nlapiDateToString(maxEndDate);
}

function determineExpectedCloseFromLines(recOrder) {

    var oppLineItemCount = recOrder.getLineItemCount('item');

    var minStartDate = '';

    for (var i = 1; i <= oppLineItemCount; i++) {
        var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
        var inGroup = recOrder.getLineItemValue('item', 'ingroup', i);

        if (inGroup != 'T' && itemType != 'EndGroup') {
            var lineDate = recOrder.getLineItemValue('item', 'custcolr7startdate', i);

            if (lineDate != null && lineDate != '') {

                var dtLineDate = nlapiStringToDate(lineDate);

                if (minStartDate == null || minStartDate == '' || dtLineDate < minStartDate) {
                    minStartDate = dtLineDate;
                }
            }
        }
    }

    if (minStartDate == '' || minStartDate == null) {
        throw nlapiCreateError('INVALID DATE', 'Could not determine start date of opportunity.');
    }

    return nlapiDateToString(nlapiAddDays(minStartDate, -1));
}

function coTermSingleLineItem(endDateToCoTermTo, lineItem) {

    //Unit      1
    //Month     2
    //Year      3
    //Days      5
    //15 Day    6
    //Per Term  7

    /*
     * if unit type is time based, the qty should be adjusted if unit type is
     * unit based, the rate should be adjusted
     */

    var quantity = lineItem['quantity'];
    var rate = lineItem['rate'];
    var origStart = lineItem['startDate'];
    var origEnd = lineItem['endDate'];

    if (origEnd != null && origEnd != '' && origStart != null && origStart != '') {

        var renewalSkuProperties = lineItem['renewalSkuProperties'];
        var unitType = renewalSkuProperties['custitemr7itemqtytype'];

        var origTermDays = days_between(nlapiStringToDate(origStart), nlapiStringToDate(origEnd)) + 1;
        var newTermDays = days_between(nlapiStringToDate(origStart), nlapiStringToDate(endDateToCoTermTo)) + 1;

        if (newTermDays <= 0) {
            throw nlapiCreateError('INVALID COTERM', 'Start date is greater than coterm end date.');
        }

        var theRatio = newTermDays / origTermDays;
        var timeBasedUnitType = true;

        if (unitType == 1 || unitType == 7 || unitType == 9) { //not time based type
            timeBasedUnitType = false;
        }

        if (!timeBasedUnitType) {
            //rate should be adjusted
            lineItem['rate'] = (lineItem['rate'] * theRatio).toFixed(2);

        }
        else {
            //quantity should be adjusted
            lineItem['quantity'] = lineItem['quantity'] * theRatio;
        }

        lineItem['endDate'] = endDateToCoTermTo;
    }

    return lineItem;
}

function coTermLineItems(endDateToCoTermTo, lineItems) {

    //Unit      1
    //Month     2
    //Year      3
    //Days      5
    //15 Day    6
    //Per Term  7

    /*
     * if unit type is time based, the qty should be adjusted if unit type is
     * unit based, the rate should be adjusted
     */
    var someStart = null;
    var someEnd = null;
    for (var i = 0; lineItems != null && i < lineItems.length; i++) {

        var quantity = lineItems[i]['quantity'];
        var rate = lineItems[i]['rate'];
        var origStart = lineItems[i]['startDate'];
        var origEnd = lineItems[i]['endDate'];

        if (origEnd != null && origEnd != '' && origStart != null && origStart != '') {
            someStart = origStart;
            someEnd = origEnd;
            var renewalSkuProperties = lineItems[i]['renewalSkuProperties'];
            var unitType = renewalSkuProperties['custitemr7itemqtytype'];

            var origTermDays = days_between(nlapiStringToDate(origStart), nlapiStringToDate(origEnd)) + 1;
            var newTermDays = days_between(nlapiStringToDate(origStart), nlapiStringToDate(endDateToCoTermTo)) + 1;

            nlapiLogExecution('AUDIT', 'origStart :: endDateToCoTermTo', origStart + ' :: ' + endDateToCoTermTo);
            if (newTermDays < 0) {
                throw nlapiCreateError('INVALID COTERM', 'Start date is greater than coterm end date.');
            }

            var theRatio = newTermDays / origTermDays;
            var timeBasedUnitType = true;

            if (unitType == 1 || unitType == 7 || unitType == 9) { //not time based type
                timeBasedUnitType = false;
            }

            if (!timeBasedUnitType) {
                //rate should be adjusted
                lineItems[i]['rate'] = (lineItems[i]['rate'] * theRatio).toFixed(2);

            }
            else {
                //quantity should be adjusted
                lineItems[i]['quantity'] = lineItems[i]['quantity'] * theRatio;
            }

            lineItems[i]['endDate'] = endDateToCoTermTo;
        }
        else
            if (lineItems[i]['itemType'] == 'Discount' && rate != null && rate != '' && someEnd != null && someEnd != '' && someStart != null && someStart != '') {

                if (rate.indexOf('%') != -1) {
                    // its based off percentage... continue
                    continue;
                }

                var origTermDays = days_between(nlapiStringToDate(someStart), nlapiStringToDate(someEnd)) + 1;
                var newTermDays = days_between(nlapiStringToDate(someStart), nlapiStringToDate(endDateToCoTermTo)) + 1;

                if (newTermDays < 0) {
                    throw nlapiCreateError('INVALID COTERM', 'Start date is greater than coterm end date.');
                }

                var theRatio = newTermDays / origTermDays;
                lineItems[i]['rate'] = (lineItems[i]['rate'] * theRatio).toFixed(2);
            }
    }

    return lineItems;
}

function transformOpportunity(newOppId, dates) {

    var newQuoteRec = nlapiTransformRecord('opportunity', newOppId, 'estimate');
    newQuoteRec.setFieldValue('startdate', dates['minStartDate']);
    newQuoteRec.setFieldValue('enddate', dates['maxEndDate']);
    newQuoteRec.setFieldValue('duedate', dates['expireDate']);
    newQuoteRec.setFieldValue('custbodyr7includeinrenewalforecast', 'T');

    var recId = nlapiSubmitRecord(newQuoteRec);
    nlapiLogExecution('DEBUG', '1692 submitting newQuoteRec ' + recId);

}

function determineRenewalPricing(rate, renewalCode, uplift) {
    /*
     * 100L 1 35L 2 DNR 3 35C 4 100C 5 SPC 6 105L
     */
    var result;

    rate = parseFloat(rate);

    switch (renewalCode) {
        case '1':
            result = rate;
            break;
        case '2':
            result = Math.round((rate * .35) * 10000) / 10000;
            break;
        case '3':
            result = rate;
            break;
        case '4':
            result = Math.round((rate * .35) * 10000) / 10000;
            break;
        case '5':
            result = rate;
            break;
        case '6':
            result = rate;
            break;
        case '7':
            uplift = (100 + parseFloat(uplift)) / 100;
            result = Math.round((rate * uplift) * 10000) / 10000;
            break;
        case '8':
            result = Math.round((rate * .20) * 10000) / 10000;
            break;
        case '9':
            result = Math.round((rate * .21) * 10000) / 10000;
            break;
        default:
            result = rate;
    }

    return result;

}

function stringify(arr) {

    var result = '';

    for (var i = 0; arr != null && i < arr.length; i++) {

        if (i != arr.length - 1) {
            result += arr[i] + ', ';
        }
        else {
            result += arr[i];
        }
    }
    return result;
}

function applyItems(sourceArr, targetArr) {
    sourceArr.forEach(function (item) {
        targetArr.push(item)
    })
}

function getEndDateByActivationKey(recOrder, activationKey) {

    var dtMaxEndDate = null;

    var lineItemCount = recOrder.getLineItemCount('item');

    for (var i = 1; i <= lineItemCount; i++) {

        var productKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', i);
        var managedServiceId = recOrder.getLineItemValue('item', 'custcolr7managedserviceid', i);

        var currentActivationKey = productKey || managedServiceId;

        if (currentActivationKey == activationKey) {
            var strLicEndDate = recOrder.getLineItemValue('item', 'custcolr7enddate', i) || recOrder.getLineItemValue('item', 'revrecenddate', i);

            if (strLicEndDate != null && strLicEndDate != '') {
                var dtRevRecEndDate = nlapiStringToDate(strLicEndDate);

                if (dtMaxEndDate == null || dtRevRecEndDate > dtMaxEndDate) {
                    dtMaxEndDate = dtRevRecEndDate;
                }
            }
        }
    }

    if (dtMaxEndDate != null && dtMaxEndDate != '') {
        return dtMaxEndDate;
    }
    else {
        return new Date();
    }

}

function activateItem(itemId) {

    //nlapiSendEmail(55011, 55011, 'RA - activating Item', 'RA is activating item: ' + itemId, 'suzannah_cooke@rapid7.com');

    var arrSearchFilters = new Array();
    arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', itemId);

    var arrSearchResults = nlapiSearchRecord('item', null, arrSearchFilters, null);

    var itemType = arrSearchResults[0].getRecordType();

    try {
        nlapiSubmitField(itemType, itemId, 'isinactive', 'F');
    }
    catch (e) {
        nlapiLogExecution('ERROR', 'Could not activate item : ' + e.name, itemId + ' : ' + e.message);
    }

}

function deactivateItem(itemId) {

    //nlapiSendEmail(55011, 55011, 'RA - deactivating Item', 'RA is deactivating item: ' + itemId, 'suzannah_cooke@rapid7.com');

    var arrSearchFilters = new Array();
    arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', itemId);

    var arrSearchResults = nlapiSearchRecord('item', null, arrSearchFilters, null);

    var itemType = arrSearchResults[0].getRecordType();

    try {
        nlapiSubmitField(itemType, itemId, 'isinactive', 'T');
    }
    catch (e) {
        nlapiLogExecution('ERROR', 'Could not deactivate item : ' + e.name, itemId + ' : ' + e.message);
    }

}

function days_between(date1, date2) {

    // The number of milliseconds in one day
    var ONE_DAY = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = (date1_ms - date2_ms) * -1;

    // Convert back to days and return
    return Math.round(difference_ms / ONE_DAY);

}

function calculateListPriceARRfromSO(recSalesOrder) {
    var lineItemCount = recSalesOrder.getLineItemCount('item');
    var listPrice = 0;

    for (var i = 1; i <= lineItemCount; i++) {
        var itemId = recSalesOrder.getLineItemValue('item', 'item', i);
        var itemRenewable = nlapiLookupField('item', itemId, 'custitemr7itemrenewalsku');
        if (itemRenewable != '' && itemRenewable != null) {
           
            var listArrAmount = parseFloat(recSalesOrder.getLineItemValue('item', 'amount', i));
            if (!isNaN(listArrAmount) && listArrAmount > 0) {

                // 1	 --   Unit
                // 2	 --   Month
                // 3	 --   Year
                // 5	 --   Days
                // 6	 --   15 Day
                // 7	 --   Per Term
                // 8	 --   Week
                // 9	 --   Workflow

                var UNIT = '1';
                // var MONTH = '2';
                var YEAR = '3';
                var PER_TERM = '7';
                var WORKFLOW = '9';

                var itemUnit = recSalesOrder.getLineItemValue('item', 'custcolr7itemqtyunit', i)
                var itemQuantity = Number(recSalesOrder.getLineItemValue('item', 'quantity', i)); // 6
                if (itemQuantity >= 1) {
                    switch (itemUnit) {
                        // case MONTH:
                        //     // annualize by multiplying the total ammount by 12 (months) and dividing by number of months on the item
                        //     listArrAmount = listArrAmount / itemQuantity * 12 // 12 - months in year
                        //     listPrice += listArrAmount;
                        //     break;

                        case YEAR:
                            // annualize by dividing the total ammount by number of years
                            listArrAmount = listArrAmount / itemQuantity;
                            listPrice += listArrAmount;
                            break;

                        case UNIT:
                        case PER_TERM:
                        case WORKFLOW:
                            // annualize by calculating the term in days, dividing the term by 365 (days in year) and then dividing the amount by this ratio
                            var startDate = nlapiStringToDate(recSalesOrder.getLineItemValue('item', 'custcolr7startdate', i));
                            var endDate = nlapiStringToDate(recSalesOrder.getLineItemValue('item', 'custcolr7enddate', i));
                            var term = days_between(startDate, endDate) + 1; //include end of term day
                            var ratio = term / 365; // days in year
                            listArrAmount = listArrAmount / ratio;
                            listPrice += listArrAmount;
                            break;

                        default:
                            break;

                    }
                }
            }
        }
    }
    nlapiLogExecution('DEBUG', 'new larr value is: ', listPrice);
    return formatAmount(listPrice);
}

function activateEmployee(employeeInternalId) {

    nlapiLogExecution('DEBUG', 'activating employee', employeeInternalId);
    nlapiSubmitField('employee', employeeInternalId, 'isinactive', 'F');
}

function inactivateEmployees(employeeInternalId) {

    nlapiLogExecution('DEBUG', 'deactivating employee', employeeInternalId);
    nlapiSubmitField('employee', employeeInternalId, 'isinactive', 'T');

} 16

function validateReferenceKey(recordType, id) {

    if (recordType == null || recordType == '' || id == null || id == '') {
        return null;
    }

    var objValidatedRecords = {};
    if (objValidatedRefKeys.hasOwnProperty(recordType)) {
        objValidatedRecords = objValidatedRefKeys[recordType];
    }

    if (objValidatedRecords.hasOwnProperty(id)) {
        return objValidatedRecords[id];
    }

    var valid = (nlapiLookupField(recordType, id, 'isinactive') == 'T') ? false : true;
    objValidatedRecords[id] = valid;
    objValidatedRefKeys[recordType] = objValidatedRecords;

    return objValidatedRecords[id];

}

function raDetailsObject() {
    this.salesorder = null;
    this.opportunity = null;
    this.cotermwith_opp = null;
    this.coterm_date = null;
    this.str_linestosplit = null;
    this.str_linestokeep = null;
    this.uplift = 0;
    this.workflow = 1; //Enterprise
    this.defaultCSM = null;
}

/*
 * @author Sa Ho (RSM)
 * @param salesOrderId (Sales Order ID) int
 * @return null
 * @description Before the Renewal Automation logic starts, if there is an item group on the Sales Order,
 *              copy at least the Start and End Dates from the Pricing Line to the Group Header.
 *              These dates will be used for as part of the Opportunity split logic.
 * @since 7/25/2017
 * Usage:
 */
function preRunDataCheck(salesOrderId) {
    try {
        nlapiLogExecution('DEBUG', 'preRunDataCheck function, Sales Order ID: ' + salesOrderId);
        var soRec = nlapiLoadRecord('salesorder', salesOrderId, { recordmode: 'dynamic' });
        var itemsCount = soRec.getLineItemCount('item');

        var itemGroupList = [];
        var counter = 0;

        if (itemsCount > 0) {
            for (var i = 1; i <= itemsCount; i++) {
                nlapiLogExecution('DEBUG', 'Item Line #: ' + i + ', ItemId ' + soRec.getLineItemValue('item', 'item', i) + ' itemType ' + soRec.getLineItemValue('item', 'itemtype', i));

                if (soRec.getLineItemValue('item', 'itemtype', i) == 'Group') {
                    itemGroupList.push({ 'Header': i, 'Footer': null });
                }

                else if (soRec.getLineItemValue('item', 'itemtype', i) == 'EndGroup') {
                    itemGroupList[counter].Footer = i;
                    counter++;
                }
            }
        }

        if (counter > 0) {
            for (var j = 0; j < counter; j++) {
                var currGroupHdr = itemGroupList[j].Header;
                var currGroupFtr = itemGroupList[j].Footer;

                for (var m = currGroupHdr + 1; m <= currGroupFtr; m++) {
                    var isPricingLine = nlapiLookupField('item', soRec.getLineItemValue('item', 'item', m), 'custitem_arm_upgrade_pricing_line')

                    if (isPricingLine == 'T') {
                        //Update the Group's Header line with pricing line's info
                        soRec.selectLineItem('item', currGroupHdr);
                        soRec.setCurrentLineItemValue('item', 'location', soRec.getLineItemValue('item', 'location', m));
                        soRec.setCurrentLineItemValue('item', 'custcolr7translinecontact', soRec.getLineItemValue('item', 'custcolr7translinecontact', m));
                        soRec.setCurrentLineItemValue('item', 'custcolr7translicenseid', soRec.getLineItemValue('item', 'custcolr7translicenseid', m));
                        soRec.setCurrentLineItemValue('item', 'custcolr7startdate', soRec.getLineItemValue('item', 'custcolr7startdate', m));
                        soRec.setCurrentLineItemValue('item', 'custcolr7enddate', soRec.getLineItemValue('item', 'custcolr7enddate', m));
                        soRec.commitLineItem('item');
                    }
                }
            }
        }
        var soRecID = nlapiSubmitRecord(soRec, false, true);
        nlapiLogExecution('DEBUG', 'preRunDataCheck complete, so Rec ID ' + soRecID);
    }

    catch (e) {
        nlapiLogExecution('ERROR', e);
        throw nlapiCreateError('ERROR', e);
    }
}

// https://issues.corp.rapid7.com/browse/APPS-12308 assing only active contracts to new transactions
function getActiveContracts(array) {
    var activeContractsArray = array.filter(function(carRecordId) {
        if (isEmpty(carRecordId)) {
            return false
        }
        var contractInactive = nlapiLookupField('customrecordr7contractautomation', carRecordId, 'isinactive')
        if (contractInactive == 'T' || contractInactive == true) {
            return false
        } else {
            return true
        }
    })
    return activeContractsArray.length > 0 ? activeContractsArray : ""
}

/*
 * @author Sa Ho (RSM)
 * @param oppId (Opportunity ID) int
 * @return null
 * @description For each Opportunity record created, get column data from the originating Sales Order record.
 *              If there are item groups, get the Start and End Dates from the Group Header
 *              , which were populated via the script logic to create the Opportunities.
 * @since 7/25/2017
 * Usage:
 */
function postRunDataCheck(oppId) {
    try {
        nlapiLogExecution('DEBUG', 'postRunDataCheck function, Opportunity ID: ' + oppId);
        var oppRec = nlapiLoadRecord('opportunity', oppId, { recordmode: 'dynamic' });
        var oppItemsCount = oppRec.getLineItemCount('item');
        var hasRecordUpdate = false;
        var hasLineUpdate = false;

        //Get Originating Sales Order info to copy over the rest of the columns
        var itemGroupList = [];
        var itemGroupCount = 0;

        if (oppItemsCount > 0) {
            for (var i = 1; i <= oppItemsCount; i++) {
                nlapiLogExecution('DEBUG', 'Item Line #: ' + i + ', ItemId ' + oppRec.getLineItemValue('item', 'item', i) + ' itemType ' + oppRec.getLineItemValue('item', 'itemtype', i));

                //Item Group Header
                if (oppRec.getLineItemValue('item', 'itemtype', i) == 'Group') {
                    itemGroupList.push({
                        'HeaderLine': i,
                        'FooterLine': null,
                        'StartDate': oppRec.getLineItemValue('item', 'custcolr7startdate', i),
                        'EndDate': oppRec.getLineItemValue('item', 'custcolr7enddate', i),
                        'LicenseIdText': oppRec.getLineItemValue('item', 'custcolr7translicenseid', i),
                        'LineContact': oppRec.getLineItemValue('item', 'custcolr7translinecontact', i),
                        'CreatedFromRA': '', //oppRec.getLineItemValue('item', 'custcolr7createdfromra', i),
                        'CreatedFromRALineId': '' //oppRec.getLineItemValue('item', 'custcolr7createdfromra_lineid', i)
                    });

                    if (oppRec.getLineItemValue('item', 'custcolr7createdfromra', i) != null) {
                        itemGroupList[itemGroupCount].CreatedFromRA = oppRec.getLineItemValue('item', 'custcolr7createdfromra', i);
                    }

                    if (oppRec.getLineItemValue('item', 'custcolr7createdfromra_lineid', i) != null) {
                        itemGroupList[itemGroupCount].CreatedFromRALineId = oppRec.getLineItemValue('item', 'custcolr7createdfromra_lineid', i);
                    }
                }

                //Item Group Footer
                else if (oppRec.getLineItemValue('item', 'itemtype', i) == 'EndGroup') {
                    itemGroupList[itemGroupCount].FooterLine = i;
                    itemGroupCount++;
                }
            }
        }

        //If there are item groups...
        if (itemGroupCount > 0) {
            nlapiLogExecution('DEBUG', 'itemGroupCount (total) ' + itemGroupCount);
            for (var j = 0; j < itemGroupCount; j++) {
                nlapiLogExecution('DEBUG', 'itemGroupCount loop is at ' + j);
                var currGroupHdr = itemGroupList[j].HeaderLine;
                var currGroupFtr = itemGroupList[j].FooterLine;
                var currGroupStartDate = itemGroupList[j].StartDate;
                var currGroupEndDate = itemGroupList[j].EndDate;
                var origSoId = itemGroupList[j].CreatedFromRA;
                var origSoLine = itemGroupList[j].CreatedFromRALineId;

                //Created From (RA) Line Id is not empty
                if (origSoLine != null && origSoLine != '') {
                    if (origSoId == null || origSoId == '') {
                        origSoId = parseInt(0, origSoLine.substring(origSoLine.indexOf('_')));
                    }

                    origSoLine = parseInt(origSoLine.substring(origSoLine.indexOf('_') + 1));

                    if (origSoLine != 'NaN') {
                        //Find original Sales Order Item Group
                        nlapiLogExecution('DEBUG', 'getting original Sales Order details, Sales Order ID: ' + origSoId + ' Line ' + origSoLine);
                        var soRec = nlapiLoadRecord('salesorder', origSoId, { recordmode: 'dynamic' });
                        var soItemsCount = soRec.getLineItemCount('item');

                        var soGroupHdrLine = null;
                        var soGroupFtrLine = null;
                        var soItemGroupData = null;

                        if (soItemsCount > 0) {
                            // Scenario: a group item on SO becomes a group item on Opportunity
                            if (soRec.getLineItemValue('item', 'itemtype', origSoLine) == 'Group') {
                                soGroupHdrLine = origSoLine;

                                for (var k = origSoLine; k <= soItemsCount; k++) {
                                    nlapiLogExecution('DEBUG', 'Item Line #: ' + k + ', ItemId ' + soRec.getLineItemValue('item', 'item', k) + ' itemType ' + soRec.getLineItemValue('item', 'itemtype', k));

                                    if (soRec.getLineItemValue('item', 'itemtype', k) == 'EndGroup') {
                                        soGroupFtrLine = k;
                                        break;
                                    }
                                }

                                //Get information from original SO's Item Group pricing line
                                if (soGroupHdrLine != null && soGroupHdrLine != '' && soGroupFtrLine != null && soGroupFtrLine != '') {
                                    for (var m = soGroupHdrLine + 1; m < soGroupFtrLine; m++) {
                                        var armPricingLine = nlapiLookupField('item', soRec.getLineItemValue('item', 'item', m), 'custitem_arm_upgrade_pricing_line');
                                        if (armPricingLine == 'T') {
                                            soItemGroupData = {
                                                'ItemRate': soRec.getLineItemValue('item', 'custcolr7itemrateprediscount', m),
                                                'Discount': soRec.getLineItemValue('item', 'custcolr7amountdiscountinline', m),
                                                'ProductKey': soRec.getLineItemValue('item', 'options', m),
                                                'LineContact': soRec.getLineItemValue('item', 'custcolr7translinecontact', m),
                                                'SoImport': soRec.getLineItemValue('item', 'custcol_rap7_so_imp_amt', m),
                                                'SoImportRate': soRec.getLineItemValue('item', 'custcolr7_so_import_rate', m),
                                                'TaxCode': soRec.getLineItemValue('item', 'taxcode', m),
                                                'TaxRate1': soRec.getLineItemValue('item', 'taxrate1', m),
                                                'LicenseIdText': soRec.getLineItemValue('item', 'custcolr7translicenseid', m),
                                                'ContractRenewal': soRec.getLineItemValue('item', 'custcolr7contractrenewal', m),
                                                'RenewalAcvAmount': soRec.getLineItemValue('item', 'custcolr7acvamount', m)
                                            };

                                            break;
                                        }
                                    }
                                }
                            }

                            //Scenario: a single item on SO becomes an expanded group on Opportunity
                            else {
                                soItemGroupData = {
                                    'ItemRate': soRec.getLineItemValue('item', 'custcolr7itemrateprediscount', origSoLine),
                                    'Discount': soRec.getLineItemValue('item', 'custcolr7amountdiscountinline', origSoLine),
                                    'ProductKey': soRec.getLineItemValue('item', 'options', origSoLine),
                                    'LineContact': soRec.getLineItemValue('item', 'custcolr7translinecontact', origSoLine),
                                    'SoImport': soRec.getLineItemValue('item', 'custcol_rap7_so_imp_amt', origSoLine),
                                    'SoImportRate': soRec.getLineItemValue('item', 'custcolr7_so_import_rate', origSoLine),
                                    'TaxCode': soRec.getLineItemValue('item', 'taxcode', origSoLine),
                                    'TaxRate1': soRec.getLineItemValue('item', 'taxrate1', origSoLine),
                                    'LicenseIdText': soRec.getLineItemValue('item', 'custcolr7translicenseid', origSoLine),
                                    'ContractRenewal': soRec.getLineItemValue('item', 'custcolr7contractrenewal', origSoLine),
                                    'RenewalAcvAmount': soRec.getLineItemValue('item', 'custcolr7acvamount', origSoLine)
                                };
                            }
                        }

                        //Update Opportunity's Item Group
                        for (var n = currGroupHdr; n < currGroupFtr; n++) {
                            //Update Item Group Lines using dates from Group Header
                            if (oppRec.getLineItemValue('item', 'ingroup', n) == 'T' && oppRec.getLineItemValue('item', 'itemtype', n) != 'EndGroup') {
                                oppRec.selectLineItem('item', n);
                                oppRec.setCurrentLineItemValue('item', 'custcolr7startdate', currGroupStartDate);
                                oppRec.setCurrentLineItemValue('item', 'custcolr7enddate', currGroupEndDate);
                                oppRec.setCurrentLineItemValue('item', 'custcolr7translicenseid', itemGroupList[j].LicenseIdText);
                                //oppRec.setCurrentLineItemValue('item', 'custcolr7translinecontact', itemGroupList[j].LineContact);

                                hasLineUpdate = true;
                            }

                            //Update Item Group Header and Lines with originating Sales Order Data
                            if (soItemGroupData != null && soItemGroupData != '') {
                                nlapiLogExecution('DEBUG', 'update item group with SO data - item ' + oppRec.getLineItemValue('item', 'item', n));

                                var isPricingLine = nlapiLookupField('item', oppRec.getLineItemValue('item', 'item', n), 'custitem_arm_upgrade_pricing_line');

                                if (!hasLineUpdate)
                                    oppRec.selectLineItem('item', n);

                                if (isPricingLine == 'T') {
                                    oppRec.setCurrentLineItemValue('item', 'custcol_rap7_so_imp_amt', soItemGroupData.SoImport);
                                    oppRec.setCurrentLineItemValue('item', 'custcolr7_so_import_rate', soItemGroupData.SoImportRate);
                                    oppRec.setCurrentLineItemValue('item', 'taxrate1', soItemGroupData.TaxRate1);
                                    oppRec.setCurrentLineItemValue('item', 'custcolr7contractrenewal', soItemGroupData.ContractRenewal);
                                    oppRec.setCurrentLineItemValue('item', 'custcolr7acvamount', soItemGroupData.RenewalAcvAmount);
                                    // APPS - 3665 fix to avoid taxcode error if SO subsidiary differs from Opp subsidiary APPS-3665
                                    try {
                                        oppRec.setCurrentLineItemValue('item', 'taxcode', soItemGroupData.TaxCode);
                                    } catch(e) {
                                        nlapiLogExecution('DEBUG', 'taxCode error. Can not set this taxcode to this opp, because the subsidiary of Opp and SO differs. ' + e);
                                    }
                                }

                                else {
                                    oppRec.setCurrentLineItemValue('item', 'rate', 0);
                                    oppRec.setCurrentLineItemValue('item', 'amount', 0);
                                }

                                oppRec.setCurrentLineItemValue('item', 'custcolr7translicenseid', soItemGroupData.LicenseIdText);
                                oppRec.setCurrentLineItemValue('item', 'options', soItemGroupData.ProductKey);
                                //oppRec.setCurrentLineItemValue('item', 'custcolr7translinecontact', soItemGroupData.LineContact);
                                oppRec.setCurrentLineItemValue('item', 'custcolr7createdfromra', origSoId);
                                oppRec.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', itemGroupList[j].CreatedFromRALineId);

                                hasLineUpdate = true;
                            }

                            if (hasLineUpdate) {
                                oppRec.commitLineItem('item');
                                hasLineUpdate = false;
                                hasRecordUpdate = true;
                            }
                        }
                    }
                }

                //Created From (RA) Line Id is empty
                else {
                    for (var x = currGroupHdr; x < currGroupFtr; x++) {
                        //Update Item Group Lines using dates from Group Header
                        if (oppRec.getLineItemValue('item', 'ingroup', x) == 'T' && oppRec.getLineItemValue('item', 'itemtype', x) != 'EndGroup') {
                            oppRec.selectLineItem('item', x);
                            oppRec.setCurrentLineItemValue('item', 'custcolr7startdate', currGroupStartDate);
                            oppRec.setCurrentLineItemValue('item', 'custcolr7enddate', currGroupEndDate);
                            oppRec.setCurrentLineItemValue('item', 'custcolr7translicenseid', itemGroupList[j].LicenseIdText);
                            //oppRec.setCurrentLineItemValue('item', 'custcolr7translinecontact', itemGroupList[j].LineContact);
                            oppRec.setCurrentLineItemValue('item', 'custcolr7createdfromra', origSoId);

                            hasLineUpdate = true;
                        }

                        if (hasLineUpdate) {
                            oppRec.commitLineItem('item');
                            hasLineUpdate = false;
                            hasRecordUpdate = true;
                        }
                    }
                }
            }
        }

        if (hasRecordUpdate) {
            nlapiLogExecution('DEBUG', 'Submit oppRec', '');
            //nlapiSubmitRecord(oppRec, false, true);
            nlapiLogExecution('DEBUG', 'Successful Submission of  oppRec', '');
        }
    }

    catch (e) {
        nlapiLogExecution('ERROR', e);
        throw nlapiCreateError('ERROR', e);
    }
}

/* 
* Adds the reneal t&c's to the opp's line items
*/
function addRenewalTerms(oppRecordNew, createdFromRA, createdFromRA_LineID) {
    var renTermsLineNumber = nlapiFindLineItemValue('item', 'item', 107);
    //don't add renterms item twice.
    if(renTermsLineNumber > -1) {
        return;
    }

    oppRecordNew.selectNewLineItem('item');
    oppRecordNew.setCurrentLineItemValue('item', 'item', rentermsItemId); //RENTERMS item
    oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra', createdFromRA);
    oppRecordNew.setCurrentLineItemValue('item', 'custcolr7createdfromra_lineid', createdFromRA_LineID);
    oppRecordNew.commitLineItem('item');
}

/**
 * Copies across all partners from SO to renewal opportunity.
 */
 function copyPartnersFromSO(createdFromId, createdFromType,renewalOppId) {
    //load SO rec
    var createdFromRec = nlapiLoadRecord(createdFromType, createdFromId);
    //get length of partner sublist
    if(createdFromType == "opportunity") {
        var partnerSublistId = 'recmachcustrecord_opportunity_link';
    } else{
        var partnerSublistId = 'recmachcustrecord_transaction_link';
    }
    nlapiLogExecution("DEBUG", "Partner Created From?", createdFromType);
    nlapiLogExecution("DEBUG", "Partner Sublist ID", partnerSublistId);
    var partnersLen = createdFromRec.getLineItemCount(partnerSublistId);
    nlapiLogExecution("DEBUG", "Partners Found on Created From", partnersLen);
    //if length is greater than 0, partners are present, so copy.
    if(partnersLen > 0){
        //Loop through partners list
        for(var i=1; i <= partnersLen; i++) {
            nlapiLogExecution("DEBUG", "Getting Partner", i);
            var thisPartner = createdFromRec.getLineItemValue(partnerSublistId, 'custrecord_partner', i);
            var thisPartnerType = createdFromRec.getLineItemValue(partnerSublistId, 'custrecord_partner_type', i);
            var thisPartnerPrimary = createdFromRec.getLineItemValue(partnerSublistId, 'custrecord_is_primary', i);
            nlapiLogExecution("DEBUG", "Partner", thisPartner);
            findAndCopyPartnerLinkRecord(createdFromId, renewalOppId, thisPartner, thisPartnerType, thisPartnerPrimary);
        }
    }
}

function findAndCopyPartnerLinkRecord(createdFromId, renewalOppId, thisPartner, thisPartnerType, thisPartnerPrimary) {
    nlapiLogExecution("DEBUG", "Copying Partners. Created From ID", createdFromId);
    nlapiLogExecution("DEBUG", "Copying Partners. Renewal Opp ID", renewalOppId);
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('custrecord_transaction_link', null, 'anyOf', createdFromId);
    filters[1] = new nlobjSearchFilter('custrecord_partner', null, 'anyOf', thisPartner);
    var columns = new Array();
    columns[0] = new nlobjSearchColumn('custrecord_partner');
    columns[1] = new nlobjSearchColumn('custrecord_partner_type');
    columns[2] = new nlobjSearchColumn('custrecord_is_primary');

    var searchResults = nlapiSearchRecord('customrecord_r7_transaction_partners', null, filters, columns);
    nlapiLogExecution("DEBUG", "Partner Links Found?", searchResults.length);
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
        var thisResult = searchResults[i];
        var thisId = thisResult.getId();
        var copiedRec = nlapiCopyRecord('customrecord_r7_transaction_partners', thisId);
        copiedRec.setFieldValue('custrecord_transaction_link', '');
        copiedRec.setFieldValue('custrecord_opportunity_link', renewalOppId);
        var copiedId = nlapiSubmitRecord(copiedRec);
        nlapiLogExecution("DEBUG", "Copied Transaction Partner Record: "+copiedId, "Copied from SO: "+createdFromId+", to Renewal Opp: "+renewalOppId);
    }
}
