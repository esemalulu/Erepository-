/**
* Copyright (c) 1998-2018 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved
*
* This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
* You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
* you entered into with NetSuite
*
* @NApiVersion 2.x
* @NScriptType Suitelet
* @NModuleScope public
* @author Daniel Lapp dlapp@netsuite.com
*
* Description: Suitelet Script that uses a Customer/Item combination to lookup Contract and Rebate Agreement data
* to display on the page.
*
* Version       Date                 Author      Remarks
* 1.0           19 August 2018       dlapp       Initial
* 1.1           11 September 2018    dlapp       Updated defaultValues for fields to check if value exists
* 1.2           12 September 2018    dlapp       Changed Field Label
* 1.3           16 October 2018      pries       Changed sell price field to html, made it larger
* 1.4           06 March 2019        mgotsch     Added Fixed Price and Rebate % fields and removed Refresh Interval
* 1.5           26 September 2019    dlapp       Added Last Cost for Pricing field and value
* 2.0           22 July 2020        coxoby       Case #3859089, cleaning code, removing commented code. 
* 2.1           14 August 2020      coxoby       Case $3909931, adding Catch Weight Item field. 
*/
define(['N/log', 'N/ui/serverWidget', 'N/runtime', './_NS_LIB_IFDPricing', './NSUtilvSS2'],

    function (log, ui, runtime, library, NSUtil) {

        /**
        * Definition of the Suitelet script trigger point.
        *
        * @param {Object} context
        * @param {ServerRequest} context.request - Encapsulation of the incoming request
        * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
        */
        function onRequest(context) {
            var stSuiteletTitle = runtime.getCurrentScript().getParameter({ name: 'custscript_suitelet_title' });

            if (context.request.method === 'GET') {
                var stLogTitle = 'ns_sl_contract_price_enquiry > GET';
                log.debug({
                    title: stLogTitle,
                    details: 'Creating Form'
                });

                // Create Form and User Input Objects
                var obForm = ui.createForm({ title: stSuiteletTitle });
                createUserInputObjects(obForm);

                context.response.writePage(obForm);
            } else {
                var stLogTitle = 'ns_sl_contract_price_enquiry > POST';
                var request = context.request;
                var stCustomerId = request.parameters.custpage_customer;
                var stItemId = request.parameters.custpage_item;

                // Create form and User Input Fields
                var obForm = ui.createForm({ title: stSuiteletTitle });
                createUserInputObjects(obForm, stCustomerId, stItemId);

                log.debug({
                    title: stLogTitle,
                    details: 'Parameters: ' + JSON.stringify({
                        custpage_customer: stCustomerId,
                        custpage_item: stItemId
                    })
                });

                var objPriceEnquiry = library.getPriceEnquiry(stCustomerId, stItemId);
                log.debug({
                    title: stLogTitle,
                    details: JSON.stringify(objPriceEnquiry)
                });

                obForm.addFieldGroup({
                    id: 'custpage_results_fg',
                    label: 'Results'
                });

                // If error is returned then create/set the Error Field
                if (!NSUtil.isEmpty(objPriceEnquiry.error)) {
                    var obErrorFld = obForm.addField({
                        id: 'custpage_error',
                        label: 'Error',
                        type: ui.FieldType.TEXT,
                        container: 'custpage_results_fg'
                    });
                    obErrorFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    obErrorFld.defaultValue = objPriceEnquiry.error;
                }

                // If no error is returned then create/set the result fields
                else {
                    createResultObjects(obForm, objPriceEnquiry, stItemId);
                }
                context.response.writePage(obForm);
            }
        }

        function createUserInputObjects(obForm, stCustomerId, stItemId) {
            var stLogTitle = 'createUserInputObjects';

            try {
                obForm.addFieldGroup({
                    id: 'custpage_main_fld_grp',
                    label: 'User Input'
                });
                obForm.addSubmitButton({ label: 'Submit' });

                var obCustomerFld = obForm.addField({
                    id: 'custpage_customer',
                    label: 'Customer',
                    type: ui.FieldType.SELECT,
                    source: 'customer',
                    container: 'custpage_main_fld_grp'
                });
                obCustomerFld.isMandatory = true;

                var obItemFld = obForm.addField({
                    id: 'custpage_item',
                    label: 'Item',
                    type: ui.FieldType.SELECT,
                    source: 'item',
                    container: 'custpage_main_fld_grp'
                });
                obItemFld.isMandatory = true;

                if (!NSUtil.isEmpty(stCustomerId)) {
                    obCustomerFld.defaultValue = stCustomerId;
                }
                if (!NSUtil.isEmpty(stItemId)) {
                    obItemFld.defaultValue = stItemId;
                }
            } catch (error) {
                log.error({
                    title: stLogTitle + ': ERROR',
                    details: error.toString()
                });
                throw error.toString();
            }
        }

        function createResultObjects(obForm, objPriceEnquiry, stItemId) {
            var stLogTitle = 'createResultObjects';

            try {
                // ------- ADD FIELDS: START -------
                // v1.3 - added:
                var obHTMLFld = obForm.addField({
                    id: 'custpage_sp_html',
                    label: 'Sell Price html',
                    type: ui.FieldType.INLINEHTML,
                    container: 'custpage_results_fg'
                });
                obHTMLFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.sellprice)) {
                    obHTMLFld.defaultValue = '<span style="font-size:16pt;">Sell Price<br>' + objPriceEnquiry.sellprice + '</span>';
                }

                var obItemFld = obForm.addField({
                    id: 'custpage_item_id',
                    label: 'Item',
                    type: ui.FieldType.SELECT,
                    source: 'item',
                    container: 'custpage_results_fg'
                });
                obItemFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                obItemFld.defaultValue = stItemId;
                // ---------------------------------
                var obItemDescFld = obForm.addField({
                    id: 'custpage_item_desc',
                    label: 'Item Description',
                    type: ui.FieldType.TEXT,
                    container: 'custpage_results_fg'
                });
                obItemDescFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.description)) {
                    obItemDescFld.defaultValue = objPriceEnquiry.description;
                }
                // ---------------------------------
                var obItemCategoryFld = obForm.addField({
                    id: 'custpage_item_category',
                    label: 'Item Category/Sub Category',
                    type: ui.FieldType.TEXT,
                    container: 'custpage_results_fg'
                });
                obItemCategoryFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.category)) {
                    obItemCategoryFld.defaultValue = objPriceEnquiry.category;
                }
                // ---------------------------------
                var obLastCostForPricingFld = obForm.addField({
                    id: 'custpage_last_cost_for_pricing',
                    label: 'Last Cost for Pricing',
                    type: ui.FieldType.CURRENCY,
                    container: 'custpage_results_fg'
                });
                obLastCostForPricingFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.lastCostForPricing)) {
                    obLastCostForPricingFld.defaultValue = objPriceEnquiry.lastCostForPricing;
                }
                //---------------------------------- pack size
                var objPackSize = obForm.addField({
                    id: 'custpage_pack_size',
                    label: 'Pack Size',
                    type: ui.FieldType.TEXT,
                    container: 'custpage_results_fg'
                });
                objPackSize.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.packsize)) {
                    objPackSize.defaultValue = objPriceEnquiry.packsize;
                }

                //---------------------------------- Preferred vendor
                var objPreferredVendor = obForm.addField({
                    id: 'custpage_preferred_vendor',
                    label: 'Preferred Vendor',
                    type: ui.FieldType.TEXT,
                    container: 'custpage_results_fg'
                });
                objPreferredVendor.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.preferredvendor)) {
                    objPreferredVendor.defaultValue = objPriceEnquiry.preferredvendor;
                }
                //---------------------------------- Brand
                var objBrand = obForm.addField({
                    id: 'custpage_brand',
                    label: 'Brand',
                    type: ui.FieldType.TEXT,
                    container: 'custpage_results_fg'
                });
                objBrand.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.brand)) {
                    objBrand.defaultValue = objPriceEnquiry.brand;
                }

                
                // --------------------------------- 
                var obCathWeightFld = obForm.addField({
                    id: 'custpage_catch_weight_item',
                    label: 'Catch Weight Item',
                    type: ui.FieldType.CHECKBOX,
                    container: 'custpage_results_fg'
                });
                obCathWeightFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (objPriceEnquiry.catchweight) {
                    obCathWeightFld.defaultValue = 'T';
                }
                
                // ---------------------------------
                var obFixedLandedCostWeeklyFld = obForm.addField({
                    id: 'custpage_fixed_landed_cost_weekly',
                    label: 'Fixed Landed Cost - Weekly',
                    type: ui.FieldType.CURRENCY,
                    container: 'custpage_results_fg'
                });
                obFixedLandedCostWeeklyFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.landedweek)) {
                    obFixedLandedCostWeeklyFld.defaultValue = objPriceEnquiry.landedweek;
                }
                obFixedLandedCostWeeklyFld.updateBreakType({
                    breakType: ui.FieldBreakType.STARTCOL
                });
                // ---------------------------------
                var obFixedLandedCostMonthlyFld = obForm.addField({
                    id: 'custpage_fixed_landed_cost_monthly',
                    label: 'Fixed Landed Cost - Monthly',
                    type: ui.FieldType.CURRENCY,
                    container: 'custpage_results_fg'
                });
                obFixedLandedCostMonthlyFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.landedmonth)) {
                    obFixedLandedCostMonthlyFld.defaultValue = objPriceEnquiry.landedmonth;
                }
                // ---------------------------------
                var obContractFld = obForm.addField({
                    id: 'custpage_contract',
                    label: 'Contract',
                    type: ui.FieldType.TEXT,
                    container: 'custpage_results_fg'
                });
                obContractFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.contract)) {
                    obContractFld.defaultValue = objPriceEnquiry.contract;
                }
                // ---------------------------------
                var obItemCostTypeFld = obForm.addField({
                    id: 'custpage_item_cost_type',
                    label: 'Cost Type Refresh Interval',
                    type: ui.FieldType.TEXT,
                    container: 'custpage_results_fg'
                });
                obItemCostTypeFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.costrefresh)) {
                    obItemCostTypeFld.defaultValue = objPriceEnquiry.costrefresh;
                }
                // ---------------------------------
                var obContractMarkupCurrFld = obForm.addField({
                    id: 'custpage_contract_markup_currency',
                    label: 'Contract Markup $',
                    type: ui.FieldType.CURRENCY,
                    container: 'custpage_results_fg'
                });
                obContractMarkupCurrFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.markupdollar)) {
                    obContractMarkupCurrFld.defaultValue = objPriceEnquiry.markupdollar;
                }
                // ---------------------------------
                var obContractMarkupPerFld = obForm.addField({
                    id: 'custpage_contract_markup_percent',
                    label: 'Contract Markup %',
                    type: ui.FieldType.PERCENT,
                    container: 'custpage_results_fg'
                });
                obContractMarkupPerFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.markuppercent)) {
                    obContractMarkupPerFld.defaultValue = objPriceEnquiry.markuppercent;
                }
                // --------------------------------- 
                var obFixedPriceFld = obForm.addField({
                    id: 'custpage_contract_fixed_price',
                    label: 'Fixed Price',
                    type: ui.FieldType.CURRENCY,
                    container: 'custpage_results_fg'
                });
                obFixedPriceFld.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                if (!NSUtil.isEmpty(objPriceEnquiry.fixedprice)) {
                    obFixedPriceFld.defaultValue = objPriceEnquiry.fixedprice;
                }



                //show only for restricted roles
                var stRestrictedRoles = runtime.getCurrentScript().getParameter({ name: 'custscript_acs_priceenq_restricted_roles' });
                var arrRestrictedRoles = stRestrictedRoles.split(',');
                var currentRole = runtime.getCurrentUser().role + '';
                log.debug(stLogTitle + '. ' + currentRole, arrRestrictedRoles);
                log.debug(stLogTitle + '. ', arrRestrictedRoles.indexOf(currentRole));
                if (arrRestrictedRoles.indexOf(currentRole) > -1) {
                    // ---------------------------------Rebate Agreement/Details
                    var obRebateAgreeDetFld = obForm.addField({
                        id: 'custpage_rebate_agree_det',
                        label: 'Rebate Agreement/Details',
                        type: ui.FieldType.TEXT,
                        container: 'custpage_results_fg'
                    });
                    obRebateAgreeDetFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    if (!NSUtil.isEmpty(objPriceEnquiry.rebateagreement)) {
                        obRebateAgreeDetFld.defaultValue = objPriceEnquiry.rebateagreement;
                    }

                    obRebateAgreeDetFld.updateBreakType({
                        breakType: ui.FieldBreakType.STARTCOL
                    });
                    // ---------------------------------
                    var obRebateAgreeDetNumFld = obForm.addField({
                        id: 'custpage_rebate_agree_det_num',
                        label: 'Rebate Agreement Detail #',
                        type: ui.FieldType.TEXT,
                        container: 'custpage_results_fg'
                    });
                    obRebateAgreeDetNumFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    if (!NSUtil.isEmpty(objPriceEnquiry.rebatedetail)) {
                        obRebateAgreeDetNumFld.defaultValue = objPriceEnquiry.rebatedetail;
                    }
                    // --------------------------------- 
                    var obRebatePerFld = obForm.addField({
                        id: 'custpage_rebate_percent',
                        label: 'Rebate %',
                        type: ui.FieldType.PERCENT,
                        container: 'custpage_results_fg'
                    });
                    obRebatePerFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    if (!NSUtil.isEmpty(objPriceEnquiry.rebatepercent)) {
                        obRebatePerFld.defaultValue = objPriceEnquiry.rebatepercent;
                    }
                    // ---------------------------------
                    var obRebateAmtFld = obForm.addField({
                        id: 'custpage_rebate_amt',
                        label: 'Rebate Amount',
                        type: ui.FieldType.CURRENCY,
                        container: 'custpage_results_fg'
                    });
                    obRebateAmtFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    if (!NSUtil.isEmpty(objPriceEnquiry.rebateamount)) {
                        obRebateAmtFld.defaultValue = objPriceEnquiry.rebateamount;
                    }
                    // ---------------------------------
                    var obGuaranteedAmtFld = obForm.addField({
                        id: 'custpage_guaranteed_amt',
                        label: 'Guaranteed Amount',
                        type: ui.FieldType.CURRENCY,
                        container: 'custpage_results_fg'
                    });
                    obGuaranteedAmtFld.updateDisplayType({displayType: ui.FieldDisplayType.INLINE});
                    if (!NSUtil.isEmpty(objPriceEnquiry.guaranteed)) {
                        obGuaranteedAmtFld.defaultValue = objPriceEnquiry.guaranteed;
                    }

                    var obDeliveredGuaranteedAmtFld = obForm.addField({
                        id: 'custpage_delivered_guaranteed_amt',
                        label: 'Delivered Guaranteed Amount',
                        type: ui.FieldType.CURRENCY,
                        container: 'custpage_results_fg'
                    });
                    obDeliveredGuaranteedAmtFld.updateDisplayType({displayType: ui.FieldDisplayType.INLINE});
                    if (!NSUtil.isEmpty(objPriceEnquiry.deliveredguaranteed)) {
                        obDeliveredGuaranteedAmtFld.defaultValue = objPriceEnquiry.deliveredguaranteed;
                    }


                    // ---------------------------------
                    var obAdminFeeCurrFld = obForm.addField({
                        id: 'custpage_admin_fee_currency',
                        label: 'Admin Fee $',
                        type: ui.FieldType.CURRENCY,
                        container: 'custpage_results_fg'
                    });
                    obAdminFeeCurrFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    if (!NSUtil.isEmpty(objPriceEnquiry.admindollar)) {
                        obAdminFeeCurrFld.defaultValue = objPriceEnquiry.admindollar;
                    }
                    // ---------------------------------
                    var obAdminFeePerFld = obForm.addField({
                        id: 'custpage_admin_fee_percent',
                        label: 'Admin Fee %',
                        type: ui.FieldType.PERCENT,
                        container: 'custpage_results_fg'
                    });
                    obAdminFeePerFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    if (!NSUtil.isEmpty(objPriceEnquiry.adminpercent)) {
                        obAdminFeePerFld.defaultValue = objPriceEnquiry.adminpercent;
                    }
                    // ---------------------------------
                    var obTotalAdminFeesFld = obForm.addField({
                        id: 'custpage_total_admin_fees',
                        label: 'Total Admin Fees',
                        type: ui.FieldType.CURRENCY,
                        container: 'custpage_results_fg'
                    });
                    obTotalAdminFeesFld.updateDisplayType({
                        displayType: ui.FieldDisplayType.INLINE
                    });
                    if (!NSUtil.isEmpty(objPriceEnquiry.totaladmin)) {
                        obTotalAdminFeesFld.defaultValue = objPriceEnquiry.totaladmin;
                    }
                }


            } catch (error) {
                log.error({
                    title: stLogTitle + ': ERROR',
                    details: error.toString()
                });
                throw error.toString();
            }
        }

        return {
            onRequest: onRequest
        };
    }
);
