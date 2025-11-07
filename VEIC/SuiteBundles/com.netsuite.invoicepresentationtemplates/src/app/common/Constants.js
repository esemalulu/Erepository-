define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Constants = void 0;
    class Constants {
    }
    exports.Constants = Constants;
    Constants.translationKeys = {
        IPT_HEADER: 'IPT_HEADER',
        IPT_PREFERENCE_HEADER: 'IPT_PREFERENCE_HEADER',
        IPT_HEADER_ON_VIEW: 'IPT_HEADER_ON_VIEW',
        IPT_SAVE: 'IPT_SAVE',
        IPT_EDIT: 'IPT_EDIT',
        IPT_BACK: 'IPT_BACK',
        IPT_CANCEL: 'IPT_CANCEL',
        IPT_DELETE: 'IPT_DELETE',
        IPT_NEW_TEMPLATE: 'IPT_NEW_TEMPLATE',
        IPT_RESET: 'IPT_RESET',
        IPT_NAME: 'IPT_NAME',
        IPT_NAME_TEXT: 'IPT_NAME_TEXT',
        IPT_DESCRIPTION: 'IPT_DESCRIPTION',
        IPT_DESCRIPTION_TEXT: 'IPT_DESCRIPTION_TEXT',
        IPT_DEFAULT: 'IPT_DEFAULT',
        IPT_EDIT_WARNING: 'IPT_EDIT_WARNING',
        IPT_EDIT_WARNING_MESSAGE: 'IPT_EDIT_WARNING_MESSAGE',
        IPT_PRIM_INFO: 'IPT_PRIM_INFO',
        IPT_INCLUDE_RECEIPTS: 'IPT_INCLUDE_RECEIPTS',
        IPT_INCLUDE_RECEIPTS_FLH: 'IPT_INCLUDE_RECEIPTS_FLH',
        IPT_SUBSIDIARY: 'IPT_SUBSIDIARY',
        PREFERENCE_PRIMARY: 'PREFERENCE_PRIMARY',
        IPT_PREFERENCE_LINK: 'IPT_PREFERENCE_LINK',
        IPT_PREVIEW: 'IPT_PREVIEW',
        IPT_PREVIEW_TITLE: 'IPT_PREVIEW_TITLE',
        IPT_NO_ACCESS_MESSAGE: 'IPT_NO_ACCESS_MESSAGE',
        IPT_NOTICE: 'IPT_NOTICE',
        ERROR_MESSAGES: {
            MISSING_REQUIRED_PARAMS: 'MISSING_REQUIRED_PARAMS',
            ENTER_VALUES_FOR_NAME: 'ENTER_VALUES_FOR_NAME',
            ENTER_VALUES_FOR_DESCRIPTION: 'ENTER_VALUES_FOR_DESCRIPTION',
            ENTER_VALUES_FOR_NAME_DESCRIPTION: 'ENTER_VALUES_FOR_NAME_DESCRIPTION',
            SELECT_AT_LEAST_ONE_SUMMARY_TYPE: 'SELECT_AT_LEAST_ONE_SUMMARY_TYPE',
            ISSUE_WHILE_SAVING_THE_IPT: 'ISSUE_WHILE_SAVING_THE_IPT',
            ALL_FIELDS_CAN_NOT_BE_NONE: 'ALL_FIELDS_CAN_NOT_BE_NONE',
            DUPLICATE_RECORD: 'DUPLICATE_RECORD',
            ADD_NEW_ROW_ERROR: 'ADD_NEW_ROW_ERROR',
            SELECT_SUBSIDIARY_ERROR: 'SELECT_SUBSIDIARY_ERROR',
            SELECT_BASE_TEMPLATE_ERROR: 'SELECT_BASE_TEMPLATE_ERROR',
            SELECT_DEFAULT_EMAIL_LAYOUT_ERROR: 'SELECT_DEFAULT_EMAIL_LAYOUT_ERROR',
            INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
            IPT_NO_PREFERRED: 'IPT_NO_PREFERRED',
            EMPTY_IPT_PREVIEW_ALERT_MESSAGE: 'EMPTY_IPT_PREVIEW_ALERT_MESSAGE',
            IPT_NO_ACCESS_PERMISSION_MESSAGE: 'IPT_NO_ACCESS_PERMISSION_MESSAGE',
            IPT_SUBSIDIARY_SEARCH_ERROR: 'SSS_SEARCH_ERROR_OCCURRED'
        },
        DIALOG_MESSAGES: {
            IPT_CREATED: 'IPT_CREATED',
            PRESS_OK: 'PRESS_OK',
            REMOVE_CONFIRM_TITLE: 'REMOVE_CONFIRM_TITLE',
            REMOVE_CONFIRM_MESSAGE: 'REMOVE_CONFIRM_MESSAGE',
            RECORD_NOT_CHANGED_WARNING: 'RECORD_NOT_CHANGED_WARNING',
            SPINNER_LABEL: 'SPINNER_LABEL',
            DELETE_CONFIRM_TITLE: 'DELETE_CONFIRM_TITLE',
            DELETE_CONFIRM_MESSAGE: 'DELETE_CONFIRM_MESSAGE',
            REMOVE_PREFERENCE_ROW_CONFIRM_TITLE: 'REMOVE_PREFERENCE_ROW_CONFIRM_TITLE',
            REMOVE_PREFERENCE_ROW_CONFIRM_MESSAGE: 'REMOVE_PREFERENCE_ROW_CONFIRM_MESSAGE'
        },
        SUCCESS_MESSAGES: {
            IPT_CONFIRMATION: 'IPT_CONFIRMATION',
            IPT_SAVED_SUCCESSFULLY: 'IPT_SAVED_SUCCESSFULLY',
            IPT_COPIED_SUCCESSFULLY: 'IPT_COPIED_SUCCESSFULLY',
            PREFERENCE_SAVED: 'PREFERENCE_SAVED'
        },
        GROUPING_MESSAGE: {
            PRIMARY_GROUPING_MESSAGE: 'PRIMARY_GROUPING_MESSAGE',
            SECONDARY_GROUPING_MESSAGE: 'SECONDARY_GROUPING_MESSAGE'
        },
        MENU_ACTIONS: {
            ACTIONS: 'actions',
            MAKECOPY: 'makecopy',
            NEW: 'new'
        },
        PREFERENCES_COLUMN_PLACEHOLDER: {
            SUBSIDIARY_PLACEHOLDER: 'SUBSIDIARY_PLACEHOLDER',
            DEFAULT_INVOICE_PRINT_PREVIEW_TEMPLATE_PLACEHOLDER: 'DEFAULT_INVOICE_PRINT_PREVIEW_TEMPLATE_PLACEHOLDER',
            DEFAULT_INVOICE_EMAIL_LAYOUT_PLACEHOLDER: 'DEFAULT_INVOICE_EMAIL_LAYOUT_PLACEHOLDER',
            DEFAULT_INVOICE_PRESENTATION_TEMPLATE_PLACEHOLDER: 'DEFAULT_INVOICE_PRESENTATION_TEMPLATE_PLACEHOLDER'
        },
        PREFERENCES_COLUMN_NAME: {
            SUBSIDIARY: 'SUBSIDIARY',
            DEFAULT_INVOICE_PRINT_PREVIEW_TEMPLATE: 'DEFAULT_INVOICE_PRINT_PREVIEW_TEMPLATE',
            DEFAULT_INVOICE_EMAIL_LAYOUT: 'DEFAULT_INVOICE_EMAIL_LAYOUT',
            DEFAULT_INVOICE_PRESENTATION_TEMPLATE: 'DEFAULT_INVOICE_PRESENTATION_TEMPLATE'
        },
        LIST: 'LIST',
        TAB_PANEL_KEYS: {
            VIEW_OPTIONS: 'IPT_VIEW_OPTIONS',
            PREVIEW: 'ipt_preview'
        },
        IPT_DEPENDENT_RECORDS: {
            IPT_ON_INVOICE: 'IPT_ON_INVOICE',
            IPT_ON_CUSTOMER: 'IPT_ON_CUSTOMER',
            IPT_ON_PROJECT: 'IPT_ON_PROJECT',
            IPT_ON_PREFERENCES: 'IPT_ON_PREFERENCES',
            IPT_SHOW_DEPENDENCIES: 'IPT_SHOW_DEPENDENCIES'
        }
    };
    Constants.gridColumns = {
        SUMMARY: 'ipt_summary_type',
        PRIMARY_GROUP: 'ipt_primary_column',
        SECONDARY_GROUP: 'ipt_secondary_column',
        COLUMN1: 'ipt_column1',
        COLUMN2: 'ipt_column2',
        COLUMN3: 'ipt_column3',
        COLUMN4: 'ipt_column4',
        COLUMN5: 'ipt_column5',
        COLUMN6: 'ipt_column6',
        COLUMN7: 'ipt_column7'
    };
    Constants.CHARGES = {
        TIMEBASED: 'TIME_BASED',
        BILLINGCLASS: 'BILLING_CLASS',
        DATE: 'DATE',
        EMPLOYEE: 'EMPLOYEE',
        ITEM: 'ITEM',
        TASK: 'TASK',
        QUANTITY: 'QUANTITY',
        RATE: 'RATE',
        MEMO: 'MEMO',
        UNITS: 'UNITS',
        VENDOR: 'VENDOR',
        NONE: 'NONE',
        EXPENSE_BASED: 'EXPENSE_BASED',
        EXPENSE_CATEGORY: 'EXPENSE_CATEGORY',
        FIXED_DATE: 'FIXED_DATE',
        PURCHASE: 'PURCHASE',
        PROJECT_PROGRESS: 'PROJECT_PROGRESS',
        MILESTONE: 'MILESTONE',
        PERCENTAGE_COMPLETE: 'PERCENTAGE_COMPLETE',
        SELECT: 'SELECT',
        AMOUNT: 'AMOUNT'
    };
    Constants.RECORD = {
        IPT_RECORD: 'customrecord_ipt_template',
        IPT_PREFERENCE_RECORD: 'customrecord_ipt_preference'
    };
    Constants.FIELDS = {
        IPT_DESCRIPTION: 'custrecord_ipt_description',
        IPT_IS_DEFAULT: 'custrecord_ipt_isdefault',
        IPT_NAME: 'name',
        IPT_CONFIG: 'custrecord_ipt_chargetableconfig',
        IPT_ID: 'id',
        IPT_Internal_Id: 'InternalID',
        IPT_SUBSIDIARY: 'custrecord_ipt_subsidiary',
        IPT_SUBSIDIARY_ID: 'id',
        IPT_SUBSIDIARY_INTERNAL: 'custrecord_ipt_subsidiary_internal',
        IPT_SUBSIDIARY_NAME: 'name',
        MANDATORY_ASTERISK: '*',
        IPT_INCLUDE_RECEIPTS: 'custrecord_ipt_include_receipts',
        IPT_IS_INACTIVE: 'isinactive',
        HEADER: 'header'
    };
    Constants.actionBarKeys = {
        ADD: 'ipt_add',
        INSERT: 'ipt_insert',
        OK: 'ipt_ok',
        REMOVE: 'ipt_remove',
        CANCEL: 'ipt_cancel',
        SAVE: 'ipt_save'
    };
    Constants.QUERY_PARAM_KEYS = {
        LIST: 'list',
        DIALOG: 'dialog',
        CLOSE: 'close',
        REDIRECTION: 'redirection',
        TARGET: 'target',
        OPTION_NAME: 'optionname',
        OPTION_ID: 'optionid',
        RESTRICTED_ACCESS: 'restrictedAccess'
    };
    Constants.fieldNames = {
        SELECTION_COLUMN: 'selection',
        DRAG_COLUMN: 'drag',
        EXPENSETYPE_COLUMN: 'expenseType',
        PRIMARYGROUP_COLUMN: 'primaryGrouping',
        SECONDARYGROUP_COLUMN: 'secondaryGrouping',
        DISPLAY_MEMBER_NAME: 'name',
        COLUMN1_NAME: 'column1',
        COLUMN2_NAME: 'column2',
        COLUMN3_NAME: 'column3',
        COLUMN4_NAME: 'column4',
        COLUMN5_NAME: 'column5',
        COLUMN6_NAME: 'column6',
        COLUMN7_NAME: 'column7',
        AMOUNT_NAME: 'amount'
    };
    Constants.MODES = {
        CREATE: 'create',
        VIEW: 'view',
        EDIT: 'edit',
        XEDIT: 'xedit',
        COPY: 'copy',
        PREFERENCE_VIEW: 'PREFERENCE_VIEW',
        PREFERENCE_EDIT: 'PREFERENCE_EDIT'
    };
    Constants.fieldValues = {
        NONE: 'NONE',
        SELECT: 'SELECT'
    };
    Constants.COLORS = {
        LIGHT_GRAY: '#6f6f6f',
        BLACK: '#262626',
        RED: '#b87241'
    };
    Constants.redirect = {
        target: 'target',
        whence: 'whence',
        list: 'list',
        close: 'close',
        dialog: 'dialog'
    };
    Constants.headerMenu = {
        LIST: 'list'
    };
    Constants.custcollection_ipt_collection = 'custcollection_ipt_collection';
    Constants.duplicate_record = 'duplicate_record';
    Constants.URL_PATH = '/spa-app/com.netsuite.invoicepresentationtemplates/ipt?';
    Constants.Redirect_PATH = './../../../spa-app/com.netsuite.invoicepresentationtemplates/ipt';
    Constants.IPT_PREFERENCES_URL = '/spa-app/com.netsuite.invoicepresentationtemplates/ipt/preference';
    Constants.ADD_PAGE_URL = '/core/pages/addpage.nl';
    Constants.staticPreview = {
        SL_SCRIPT_ID: 'customscript_ipt_sl_read_ftl',
        SL_DEPLOYMENT_ID: 'customdeploy_ipt_sl_read_ftl'
    };
    Constants.custRoleSuitelet = {
        CUSTROLE_SL_SCRIPT_ID: 'customscript_ipt_sl_query_cust_role',
        CUSTROLE_SL_DEPLOYMENT_ID: 'customdeploy_ipt_sl_query_custrole'
    };
    Constants.tag_removed = 'tagRemoved';
    Constants.preferences = {
        IPT_PREFERNCES_FIELD: 'custrecord_ipt_preferences',
        COLUMN_NAME: {
            SUBSIDIARY: 'subsidiary',
            BASE_TEMPLATE: 'base_template',
            DEFAULT_INVOICE_EMAIL_LAYOUT: 'default_invoice_email_layout',
            DEFAULT_INVOICE_TEMPLATE: 'default_invoice_template',
            NAME: 'name',
            ID: 'id'
        },
        PREFERENCES_KEY: 'ipt_preferences',
        GRID_DISPLAY_MEMBER: 'name',
        GRID_ACTIONS: {
            ADD: 'add',
            REMOVE: 'remove'
        }
    };
    Constants.PRINT_EMAIL_TEMPLATES = {
        RECORD: 'AdvancedpdfTemplate',
        ID: 'Id',
        NAME: 'name',
        SCRIPT_ID: 'scriptid',
        EMAIL_TEMPLATE: 'CUSTTMPL_IPT_EMAIL_TEMPLATE',
        PRINT_TEMPLATE: 'CUSTTMPL_IPT_PRINT_TEMPLATE',
        INACTIVE: 'inactive',
        TRANSACTION_TYPE: 'trantype'
    };
    Constants.gridRowStatus = 'committed';
    Constants.requestType = {
        GETADVANCEDPDFHTMLTEMPLATES: 'GETADVANCEDPDFHTMLTEMPLATES',
        CONVERTSUBSIDIARYTOUIF: 'CONVERTSUBSIDIARYTOUIF',
        GETACTIVESUBSIDIARIES: 'GETACTIVESUBSIDIARIES',
        GETSUBSIDIARIESFROMROLE: 'GETSUBSIDIARIESFROMROLE',
        GETUSERSUBSIDIARY: 'GETUSERSUBSIDIARY',
        FETCHSUBSIDIARYFROMLIST: 'FETCHSUBSIDIARYFROMLIST',
        FETCHCUSTOMRECORDTYPEID: 'FETCHCUSTOMRECORDTYPEID',
        FETCHALLSUBSIDIARIES: 'FETCHALLSUBSIDIARIES'
    };
    Constants.SUBSIDIARYLIST = {
        OWN: 'OWN',
        ALL: 'ALL',
        ALLACTIVE: 'ALLACTIVE'
    };
});
