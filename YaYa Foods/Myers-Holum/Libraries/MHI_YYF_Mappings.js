// This JSON will store shared information for all MHI scripts to easily reference

/**
 *@NModuleScope Public
 */

define([], function () {
  return {
    CONST: {
      ACCOUNT: {
        INCOME_PLACEHOLDER: 701 // 40100 Sales : Sales - Placeholder
      },
      STATUS: {
        PENDING: 1,
        APPROVED: 2,
        REJECTED: 3
      },
      ITEM_PRICING: {
        CAD: 'price1',
        USD: 'price2',
        EURO: 'price4'
      },
      EMAIL_INFO: {
        SENDER: 148,
        RECEIVER: [148, 1539] // Fuyao Qiu, Abhaye Callicharan
      }
    },
    TRAN: {
      SELECT_ITEM: 'custcol_mhi_yyf_select_item',
      SELECT_ACCOUNT: 'custcol_mhi_yyf_select_account',
      PO_TYPE: 'custbody_yaya_po_type',
      MATCOST: 'custcol_yaya_so_unitmatcost',
      MATHAND: 'custcol_yaya_so_unitmathandlingcost',
      COPACK: 'custcol_yaya_so_unitcopackprice',
      TOTAL_MATCOST: 'custcol_yaya_so_totmatcost',
      TOTAL_MATHAND: 'custcol_yaya_so_totmathandcost',
      TOTAL_COPACK: 'custcol_yaya_so_totcopackprice',
      IS_MANUAL: 'custcol_mhi_yyf_ismanual',
      PURCHASE_PRICE: 'custcol_mhi_yyf_purchase_price',
      PURCHASE_PRICE_COST: 'custcol_mhi_yyf_purchase_price_cost',
      IS_SPARES_ITEM: 'custcol_yaya_is_spares_item',
      CUSTOMER_OWNED: 'custcol_yaya_customer_owned'
    },
    ITEM: {
      CUSTOMER: 'custitem_yaya_item_customerfilter',
      MATERIAL_COST_ACCOUNT: 'custitem_yaya_matcostaccount',
      MATERIAL_HAND_ACCOUNT: 'custitem_yaya_mathandlingaccount',
      CO_PACK_ACCOUNT: 'custitem_yaya_copackaccount',
      MATERIAL_COST: 'custitem_yaya_itemmatcost',
      MATERIAL_HAND: 'custitem_yaya_item_materialhandling',
      CO_PACK: 'custitem_yaya_item_copackprice',
      START_DATE: 'custitem_yaya_item_startdate',
      END_DATE: 'custitem_yaya_item_enddate',
      IS_SPARES_ITEM: 'custitem_yaya_is_spares_item'
    },
    SEARCH: {
      PRICING_END_TODAY: 'customsearch_mhi_yyf_effectpricing_today', // **FOR SCRIPT USE** MHI | YYF | Effective Pricing End Date = TODAY
      PRICING_SALES: 'customsearch_mhi_yyf_effectpricing_sales' // **FOR SCRIPT USE** MHI | YYF | Effective Date Pricing (Sales)
    },
    SCRIPT: {
      MR_EFFECTIVE_RESET: {
        SEARCH: 'custscript_mhi_yyf_effectpric_search'
      },
      MR_EFFECTIVE_PRICING: {
        USER: 'custscript_mhi_yyf_effectpricing_user', // not used
        SEARCH: 'custscript_mhi_yyf_effectpricing_search'
      },
      SL_EFFECTIVE_PRICING: {
        ID: 'customscript_mhi_yyf_effectpricing_sl',
        DEP: 'customdeploy_mhi_yyf_effectpricing_sl'
      },
      SL_EFFECTIVE_PURCHASE: {
        ID: 'customscript_mhi_yyf_effectpurchase_sl',
        DEP: 'customdeploy_mhi_yyf_effectpurchase_sl'
      },
      SL_PURCHASE_PRICE_TABLE: {
        ID: 'customscript_mhi_yyf_purchpricepage_sl',
        DEP: 'customdeploy_mhi_yyf_purchpricepage_sl'
      }
    },
    CUSTOM: {
      GL_FILTER: {
        TYPE: 'customrecord_yaya_potypetoglfiltering',
        PO_TYPE: 'custrecord_yaya_potype',
        ACCOUNT: 'custrecord_yaya_glaccount'
      },
      EFFECTIVE_SALES: {
        TYPE: 'customrecord_yaya_eff_date_pricing_sales',
        ITEM: 'custrecord_yaya_item',
        START: 'custrecord_yaya_startdate',
        END: 'custrecord_yaya_enddate',
        MAT_COST: 'custrecord_yaya_material_cost',
        MAT_HAND: 'custrecord_yaya_material_handling',
        CO_PACK: 'custrecord_yaya_copack',
        CURRENCY: 'custrecord_yaya_currency',
        BASE_PRICE: 'custrecord_yaya_base_price'
      },
      EFFECTIVE_PURCH: {
        TYPE: 'customrecord_yaya_eff_date_pricing_purch',
        VENDOR: 'custrecord_yaya_eff_purch_vendor',
        ITEM: 'custrecord_yaya_eff_purch_item',
        CURRENCY: 'custrecord_yaya_eff_purch_currency',
        UOM: 'custrecord_yaya_eff_purch_uom',
        TIER_QTY: 'custrecord_yaya_eff_purch_tierqty',
        START: 'custrecord_yaya_eff_purch_startdate',
        END: 'custrecord_yaya_eff_purch_enddate',
        UNIT_COST: 'custrecord_yaya_eff_purch_unitcost'
      }
    }
  };
});
