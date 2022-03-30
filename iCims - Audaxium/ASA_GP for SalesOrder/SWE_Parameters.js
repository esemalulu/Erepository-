/**
 * Copyright (c) 1998-2009 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
* @projectDescription   SWE Parameters Script. This is best defined as a suitelet script with several parameters as defined below.
*
* @author   Noah Tumlos ntumlos@netsuite.com / Victor Sayas vsayas@netsuite.com

* @since    2010
* @version  initial code
*/

var SWE;
if (!SWE) SWE = {};
if (!SWE.Param) SWE.Param = {};
if (!SWE.Parameters) SWE.Parameters = {};

var SCRIPT = 'SCRIPT';
var arrSearchResults = null;

/**
 * Implementation of this function can vary depending on what resource will be used to store the parameters that is used by SWE
 *
 * @param {Object} key This key can be any of the defined constants below e.g. SWE.Parameters.MS_MODEL
 */
SWE.Param.getSetParameterValue = function(key, value) {
    if (arrSearchResults == null) {
        //Load the search results array
        var arrSearchColumns = new Array();
        arrSearchColumns[0] = new nlobjSearchColumn('custrecord_swe_pref_id');
        arrSearchColumns[1] = new nlobjSearchColumn('custrecord_swe_pref_value');
        arrSearchResults = nlapiSearchRecord('customrecord_swe_preferences', null, null, arrSearchColumns);
    }

    if (arrSearchResults != null && arrSearchResults.length > 0) {
        //Look for the parameter in the search results
        for (var i = 0; i < arrSearchResults.length; i++) {
            var searchResult = arrSearchResults[i];
            var prefId = searchResult.getValue('custrecord_swe_pref_id');
            if (prefId == key) {
                if (value != null && value != undefined) {
                    try { nlapiSubmitField('customrecord_swe_preferences', searchResult.getId(), 'custrecord_swe_pref_value', value); }
                    catch(ex) {}
                    return value;
                } else {
                    return searchResult.getValue('custrecord_swe_pref_value');
                }
            }
        }
        return '';
    } else {
        return '';
    }
};

SWE.Param.getParameterValue = function(key) {
    return SWE.Param.getSetParameterValue(key); //will get the value of the preference
};

SWE.Param.setParameterValue = function(key, value) {
    SWE.Param.getSetParameterValue(key, value); //will set the value of the preference
};

SWE.Parameters = {
    //Preference IDs
    ENABLE_R01A                 : 'swe_r01a_enable',
    ITEM_CATS_TRAN              : 'swe_r01a_cats_for_tran_line_auto',
    AUTOSELECT_SINGLE_CONTRACT  : 'swe_r01a_autoselect_single_contract',
    ENABLE_R01B                 : 'swe_r01b_enable',
    ENABLE_R01C                 : 'swe_r01c_enable',
    MS_MODEL                    : 'swe_r01c_renewals_ms_model',
    ITEM_CATS_RENEWAL           : 'swe_r01c_renew_calcs_skipped_cats',
    CUSTOM_LIMITS               : 'swe_r01c_cust_price_blk_item_cats',
    DECIMAL_PLACES_LISTRATE     : 'swe_r01c_decimal_places_for_listrate',
    DECIMAL_PLACES_RATE         : 'swe_r01c_decimal_places_for_rate',
    //ITEM_COMMIT_LIMIT           : 'swe_r01c_cust_group_item_limit',
    TRAN_DISCOUNT_FLAG          : 'swe_r01c_dflt_cust_disc_on_trans',
    INLINE_DISCOUNT_FLAG        : 'swe_r01c_ms_cust_inline_disc',
    ENABLE_R01D                 : 'swe_r01d_enable',
    ALLOW_DISCOUNT              : 'swe_r01d_allow_inline_discounting',
    ENABLE_R01E                 : 'swe_r01e_enable',
    ENABLE_R02A                 : 'swe_r02a_enable',
    ENABLE_R02B                 : 'swe_r02b_enable',
    ENABLE_R03                  : 'swe_r03_enable',
    PROCESS_SEARCH              : 'swe_r03_tran_for_ci_creation_srch',
    PENDING_CREATE_SEARCH       : 'swe_r03_ci_pending_creation_srch',
    ITEM_CATS_TO_PROCESS        : 'swe_r03_item_cat_to_process',
    TRAN_STATUS_TO_PROCESS      : 'swe_r03_tran_status_to_process',
    ENABLE_R05                  : 'swe_r05_enable',
    CUSTOMER_TO_PROCESS         : 'swe_r05_renew_customer_id',
    USE_CHANNEL_MGMT            : 'swe_r05_renewals_use_channel_mgmt',
    ENTITY_STATUS_EXPIRED       : 'swe_r05_entity_status_expired',
    ENTITY_STATUS_REINSTATED    : 'swe_r05_entity_status_reinstated',
    TRAN_FORM_ID                : 'swe_r05_renewals_custom_form',
    RENEWAL_FORM_BASIS          : 'swe_r05_renewal_form_basis',
    DUMMY_ITEM                  : 'swe_r05_renewals_dummy_item',
    PRICING_MODEL               : 'swe_r05_renewals_pricing_model',
    DAYS_BEFORE_RENEWAL         : 'swe_r05_renewals_days',
    TRAN_TYPE                   : 'swe_r05_transaction_type',
    ASSIGN_TO_TYPE              : 'swe_r05_assign_to',
    ASSIGN_TO                   : 'swe_r05_assign_to_emp_team',
    DEPT_SRC                    : 'swe_r05_department',
    LOC_SRC                     : 'swe_r05_location',
    CLASS_SRC                   : 'swe_r05_class',
    INCLUDE_TRAN_LINE_DESCR     : 'swe_r05_include_tran_line_desc',
    DFLT_CUST_DISCOUNT          : 'swe_r05_dflt_cust_disc_on_renewal',
    ALLOW_DISC_ON_MS            : 'swe_r05_ms_cust_inline_disc',
    COMBINE_LIKE_ITEMS          : 'swe_r05_combine_like_items',
    DEFAULT_RENEWAL_PERIOD      : 'swe_r05_default_renewal_period',
    ENABLE_R09                  : 'swe_r09_enable',
    IB_SEARCH                   : 'swe_r09_install_base_search',
    ENABLE_R10                  : 'swe_r10_enable',
    ENABLE_R12A                 : 'swe_r12a_enable',
    ENABLE_R12B                 : 'swe_r12b_enable',
    OVERRIDE_DFLT_SHIP_ADDR     : 'swe_r01a_override_default_ship_address',
    TRANFORM_TO_DEPLOYSCRIPT	: 'swe_r0_deployto_tranforms',
    ENTRYFORM_TO_DEPLOYSCRIPT	: 'swe_r0_deployto_entryforms',
    //Get preference value methods
    getPreferenceValue                  : function(prefId) { return SWE.Param.getParameterValue(prefId); },
    isR01ACSEnabled                     : function() { return SWE.Param.getParameterValue(this.ENABLE_R01A); },
    getItemCatsForTranLineAuto          : function() { return SWE.Param.getParameterValue(this.ITEM_CATS_TRAN); },
    isAutoselectSingleContract          : function() { return SWE.Param.getParameterValue(this.AUTOSELECT_SINGLE_CONTRACT); },
    isR01BCSEnabled                     : function() { return SWE.Param.getParameterValue(this.ENABLE_R01B); },
    isR01CCSEnabled                     : function() { return SWE.Param.getParameterValue(this.ENABLE_R01C); },
    getRenewalMSModel                   : function() { return SWE.Param.getParameterValue(this.MS_MODEL); },
    getItemCategoriesForRenewal         : function() { return SWE.Param.getParameterValue(this.ITEM_CATS_RENEWAL); },
    getCustomLimits                     : function() { return SWE.Param.getParameterValue(this.CUSTOM_LIMITS); },
    getDecimalPlacesForListrate         : function() { return SWE.Param.getParameterValue(this.DECIMAL_PLACES_LISTRATE); },
    getDecimalPlacesForRate             : function() { return SWE.Param.getParameterValue(this.DECIMAL_PLACES_RATE); },
    //getLineLimit                        : function() { return SWE.Param.getParameterValue(this.ITEM_COMMIT_LIMIT); },
    getTranDiscountFlag                 : function() { return SWE.Param.getParameterValue(this.TRAN_DISCOUNT_FLAG); },
    getInlineDiscountFlag               : function() { return SWE.Param.getParameterValue(this.INLINE_DISCOUNT_FLAG); },
    isR01DCSEnabled                     : function() { return SWE.Param.getParameterValue(this.ENABLE_R01D);},
    getDiscountFlag                     : function() { return SWE.Param.getParameterValue(this.ALLOW_DISCOUNT); },
    isR01ECSEnabled                     : function() { return SWE.Param.getParameterValue(this.ENABLE_R01E);},
    isR02AEnabled                       : function() { return SWE.Param.getParameterValue(this.ENABLE_R02A); },
    isR02BEnabled                       : function() { return SWE.Param.getParameterValue(this.ENABLE_R02B); },
    isR03Enabled                        : function() { return SWE.Param.getParameterValue(this.ENABLE_R03); },
    getProcessSearch                    : function() { return SWE.Param.getParameterValue(this.PROCESS_SEARCH); },
    getPendingCreateSearch              : function() { return SWE.Param.getParameterValue(this.PENDING_CREATE_SEARCH); },
    getItemCategoriesToProcess          : function() { return SWE.Param.getParameterValue(this.ITEM_CATS_TO_PROCESS); },
    isR05Enabled                        : function() { return SWE.Param.getParameterValue(this.ENABLE_R05); },
    getRenewalCustomerToProcess         : function() { return SWE.Param.getParameterValue(this.CUSTOMER_TO_PROCESS); },
    
	//Miko removed (15 July 2011)
	//getRenewalChannelMgmt               : function() { return SWE.Param.getParameterValue(this.USE_CHANNEL_MGMT); },
	
    getRenewalEntityStatusExpired       : function() { return SWE.Param.getParameterValue(this.ENTITY_STATUS_EXPIRED); },
    getRenewalEntityStatusReinstated    : function() { return SWE.Param.getParameterValue(this.ENTITY_STATUS_REINSTATED); },
    getRenewalTranForm                  : function() { return SWE.Param.getParameterValue(this.TRAN_FORM_ID); },
    getRenewalFormBasis                 : function() { return SWE.Param.getParameterValue(this.RENEWAL_FORM_BASIS); },
    getRenewalDummyItem                 : function() { return SWE.Param.getParameterValue(this.DUMMY_ITEM); },
    getRenewalPricingModel              : function() { return SWE.Param.getParameterValue(this.PRICING_MODEL); },
    getRenewalDays                      : function() { return SWE.Param.getParameterValue(this.DAYS_BEFORE_RENEWAL); },
    getRenewalTranType                  : function() { return SWE.Param.getParameterValue(this.TRAN_TYPE); },
    getRenewalAssignToType              : function() { return SWE.Param.getParameterValue(this.ASSIGN_TO_TYPE); },
    getRenewalAssignTo                  : function() { return SWE.Param.getParameterValue(this.ASSIGN_TO); },
    getRenewalDepartment                : function() { return SWE.Param.getParameterValue(this.DEPT_SRC); },
    getRenewalLocation                  : function() { return SWE.Param.getParameterValue(this.LOC_SRC); },
    getRenewalClass                     : function() { return SWE.Param.getParameterValue(this.CLASS_SRC); },
    getRenewalIncTranLineDesc           : function() { return SWE.Param.getParameterValue(this.INCLUDE_TRAN_LINE_DESCR); },
    getRenewalDefaultCustomerDiscount   : function() { return SWE.Param.getParameterValue(this.DFLT_CUST_DISCOUNT); },
    getRenewalAllowMSDiscount           : function() { return SWE.Param.getParameterValue(this.ALLOW_DISC_ON_MS); },
    getRenewalCombineLikeItems          : function() { return SWE.Param.getParameterValue(this.COMBINE_LIKE_ITEMS); },
    getDefaultRenewalPeriod             : function() { return SWE.Param.getParameterValue(this.DEFAULT_RENEWAL_PERIOD); },
    isR09Enabled                        : function() { return SWE.Param.getParameterValue(this.ENABLE_R09); },
    getIBSearch                         : function() { return SWE.Param.getParameterValue(this.IB_SEARCH); },
    isR10Enabled                        : function() { return SWE.Param.getParameterValue(this.ENABLE_R10); },
    isR12AEnabled                       : function() { return SWE.Param.getParameterValue(this.ENABLE_R12A); },
    isR12BEnabled                       : function() { return SWE.Param.getParameterValue(this.ENABLE_R12B); },
    getTranStatustoProcess              : function() { return SWE.Param.getParameterValue(this.TRAN_STATUS_TO_PROCESS); },
    overrideDefaultShipAddress          : function() { return SWE.Param.getParameterValue(this.OVERRIDE_DFLT_SHIP_ADDR); },
    getTranFormsToDeployScripts         : function() { return SWE.Param.getParameterValue(this.TRANFORM_TO_DEPLOYSCRIPT); },
    getEntryFormsToDeployScripts        : function() { return SWE.Param.getParameterValue(this.ENTRYFORM_TO_DEPLOYSCRIPT); },
    //Set preference value method
    setPreferenceValue                  : function(prefId, prefValue) { SWE.Param.setParameterValue(prefId, prefValue); },
    //Get preference type method
    getPreferenceType                   : function(prefId) {
        switch (prefId) {
            case this.ENABLE_R01A: return FIELD_TYPE_CHECK_BOX;
            case this.ITEM_CATS_TRAN: return FIELD_TYPE_MULTIPLE_SELECT;
            case this.AUTOSELECT_SINGLE_CONTRACT: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R01B: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R01C: return FIELD_TYPE_CHECK_BOX;
            case this.MS_MODEL: return FIELD_TYPE_LIST_RECORD;
            case this.ITEM_CATS_RENEWAL: return FIELD_TYPE_MULTIPLE_SELECT;
            case this.CUSTOM_LIMITS: return FIELD_TYPE_MULTIPLE_SELECT;
            case this.DECIMAL_PLACES_LISTRATE: return FIELD_TYPE_INTEGER_NUMBER;
            case this.DECIMAL_PLACES_RATE: return FIELD_TYPE_INTEGER_NUMBER;
            case this.TRAN_DISCOUNT_FLAG: return FIELD_TYPE_CHECK_BOX;
            case this.INLINE_DISCOUNT_FLAG: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R01D: return FIELD_TYPE_CHECK_BOX;
            case this.ALLOW_DISCOUNT: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R01E: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R02A: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R02B: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R03: return FIELD_TYPE_CHECK_BOX;
            case this.PENDING_CREATE_SEARCH: return FIELD_TYPE_LIST_RECORD;
            case this.TRAN_STATUS_TO_PROCESS: return FIELD_TYPE_MULTIPLE_SELECT;
            case this.ITEM_CATS_TO_PROCESS: return FIELD_TYPE_MULTIPLE_SELECT;
            case this.ENABLE_R05: return FIELD_TYPE_CHECK_BOX;
            case this.CUSTOMER_TO_PROCESS: return FIELD_TYPE_LIST_RECORD;
            
			//Miko removed (15 July 2011)
			//case this.USE_CHANNEL_MGMT: return FIELD_TYPE_CHECK_BOX;
			
            case this.ENTITY_STATUS_EXPIRED: return FIELD_TYPE_LIST_RECORD;
            case this.TRAN_FORM_ID: return FIELD_TYPE_LIST_RECORD;
            case this.RENEWAL_FORM_BASIS: return FIELD_TYPE_LIST_RECORD;
            case this.DUMMY_ITEM: return FIELD_TYPE_LIST_RECORD;
            case this.PRICING_MODEL: return FIELD_TYPE_LIST_RECORD;
            case this.DAYS_BEFORE_RENEWAL: return FIELD_TYPE_INTEGER_NUMBER;
            case this.DEFAULT_RENEWAL_PERIOD: return FIELD_TYPE_DECIMAL_NUMBER;
            case this.TRAN_TYPE: return FIELD_TYPE_LIST_RECORD;
            case this.ASSIGN_TO_TYPE: return FIELD_TYPE_LIST_RECORD;
            case this.ASSIGN_TO: return FIELD_TYPE_LIST_RECORD;
            case this.DEPT_SRC: return FIELD_TYPE_LIST_RECORD;
            case this.LOC_SRC: return FIELD_TYPE_LIST_RECORD;
            case this.CLASS_SRC: return FIELD_TYPE_LIST_RECORD;
            case this.INCLUDE_TRAN_LINE_DESCR: return FIELD_TYPE_CHECK_BOX;
            case this.DFLT_CUST_DISCOUNT: return FIELD_TYPE_CHECK_BOX;
            case this.ALLOW_DISC_ON_MS: return FIELD_TYPE_CHECK_BOX;
            case this.COMBINE_LIKE_ITEMS: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R09: return FIELD_TYPE_CHECK_BOX;
            case this.IB_SEARCH: return FIELD_TYPE_LIST_RECORD;
            case this.ENABLE_R10: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R12A: return FIELD_TYPE_CHECK_BOX;
            case this.ENABLE_R12B: return FIELD_TYPE_CHECK_BOX;
	    	case this.OVERRIDE_DFLT_SHIP_ADDR: return FIELD_TYPE_CHECK_BOX;
        }
        return '';
    }
};

/**
 * main function that does nothing yet.
 */
function main() {
    // Do nothing
}
