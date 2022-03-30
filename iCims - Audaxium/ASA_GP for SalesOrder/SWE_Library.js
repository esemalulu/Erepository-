/**
 * @author Victor Sayas (vsayas)
 * @author Chris Camacho (ccamacho)
 */


var SWE;
if (!SWE) SWE = {};
if (!SWE.Library) SWE.Library = {};

if (!SWE.Library.record)    SWE.Library.record = {};
if (!SWE.Library.dates)     SWE.Library.dates = {};
if (!SWE.Library.messages)  SWE.Library.messages = {};
if (!SWE.Library.misc)      SWE.Library.misc = {};

/* STRING CONSTANTS */
var MSGS_CONSTANTS = new Array();
MSGS_CONSTANTS[0] = 'Please make sure to reset each transaction line.\nYou can also do this by clicking on the \"Reset Lines\" button.';
//MSGS_CONSTANTS[1] = 'You have edited a transaction line that affects a percentage Maintenance/Support calculation in another transaction line.\nPlease edit and commit each Maintenance/Support transaction line affected by your change.';
MSGS_CONSTANTS[1] = 'You have edited 1 or more transaction lines that affect the calculation of Maintenance/Support lines.\nThe affected lines have been automatically recalculated.';
MSGS_CONSTANTS[2] = 'The Contract Item Start Date is earlier than the transaction Start Date. \nPlease enter a valid Contract Item Start Date.';
MSGS_CONSTANTS[3] = 'The Contract Item Start Date is later than the transaction End Date. \nPlease enter a valid Contract Item Start Date.';
MSGS_CONSTANTS[4] = 'The number of items for a single contract exceeds the maximum allowed.';
MSGS_CONSTANTS[5] = 'The Contract Item End Date is earlier than the transaction Start Date. \nPlease enter a valid Contract Item End Date.';
MSGS_CONSTANTS[6] = 'The Contract Item End Date is later than the transaction End Date. \nPlease enter a valid Contract Item End Date.';
MSGS_CONSTANTS[7] = 'The Contract Item Start Date is later than the Contract Item End Date. \nPlease enter a valid Contract Item Start Date.';
MSGS_CONSTANTS[8] = 'Line cannot be reset because there is no reset data available.\nDo you want to continue with normal calculation?';
MSGS_CONSTANTS[9] = 'This is an auto-generated renewal transaction. Editing the transaction line is not allowed.\nPlease switch the order type to "Renewal - Manual" to make manual changes.';
MSGS_CONSTANTS[10] = 'Automated computation is skipped for this item.\nPlease make sure to use the "CUSTOM" Price Level and enter the extended rate value for the period defined.';
MSGS_CONSTANTS[11] = 'This Contract is for a different customer. Do you want to load the details?';
//start of literal with placeholders
MSGS_CONSTANTS[12] = 'You are saving a transaction with an Item Group that has {s} Group Line Items remaining to be processed, which is more than the {s} Line Items limit. The next {s} Group Line Items will be processed when you click the "Process Group" button.';
MSGS_CONSTANTS[13] = 'You are saving a transaction with an Item Group that has {s} Group Line Items to be processed, which is more than the {s} Line Items limit. The next {s} Group Line Items will be processed when you click "Ok". After that you will need to click on the "Process Group" button each cycle.\n\nYou can edit the number of Group Line Items processed each time at [ Home > Set Preferences > Custom Preferences > R01C: Process Group Line Item Limit ]. The maximum number of Group Line Items that can be processed at once is 20, due to web browser limitations.';
MSGS_CONSTANTS[14] = 'The List Rate is missing for transaction line {s}. Please edit that transaction line.';
MSGS_CONSTANTS[15] = 'The transaction Start Date is later than the Contract Item Start Date for transaction line {s}. \nPlease edit that transaction line.';
MSGS_CONSTANTS[16] = 'The Term in Months is missing for transaction line {s}. Please edit that transaction line.';
MSGS_CONSTANTS[17] = 'The Contract Item Start Date is missing for transaction line {s}. Please edit that transaction line.';
MSGS_CONSTANTS[18] = 'The Contract Item End Date is missing for transaction line {s}. Please edit that transaction line.';
MSGS_CONSTANTS[19] = 'The Rev. Rec. Start Date is missing for transaction line {s}. Please edit that transaction line.';
MSGS_CONSTANTS[20] = 'The Term in Months is invalid for transaction line {s}. Please edit that transaction line.';
MSGS_CONSTANTS[21] = 'The following transaction lines were not reset because there is no reset information: {s}';

MSGS_CONSTANTS[22] = 'At least one transaction line\'s Rev. Rec. dates don\'t match the transaction\'s Start and End Dates.\nDo you want to proceed saving the record?';
MSGS_CONSTANTS[23] = 'This can only be used on renewal transactions.';
MSGS_CONSTANTS[24] = 'The transaction End Date is earlier than the Contract Item End Date for transaction line {s}. \nPlease edit that transaction line.';

MSGS_CONSTANTS[25] = 'The Contract Item Start Date for transaction line {s} is earlier than the transaction Start Date. \nPlease enter a valid Contract Item Start Date.';
MSGS_CONSTANTS[26] = 'The Contract Item Start Date for transaction line {s} is later than the transaction End Date. \nPlease enter a valid Contract Item Start Date.';
MSGS_CONSTANTS[27] = 'The Contract Item End Date for transaction line {s} is earlier than the transaction Start Date. \nPlease enter a valid Contract Item End Date.';
MSGS_CONSTANTS[28] = 'The Contract Item End Date for transaction line {s} is later than the transaction End Date. \nPlease enter a valid Contract Item End Date.';
MSGS_CONSTANTS[29] = 'Contract is required for this item category type. Please select a Contract.';
MSGS_CONSTANTS[30] = 'Contract is required for some of the Contract Items selected. Please remove those item(s) to continue.';
MSGS_CONSTANTS[31] = 'This item is not valid for return. \nThe item does not exist on the list of Contract Items under this Contract.';
MSGS_CONSTANTS[32] = 'This item is not valid for return. \nThe item has a different List Rate compared to other similar Contract Items under this Contract.';
MSGS_CONSTANTS[33] = 'This item is not valid for return. \nThe quantity specified, along with other existing return authorizations, will exceed the total quantity of this Contract Item under this Contract.';
MSGS_CONSTANTS[34] = 'Contract is required for the item on transaction line {s}. Please select a Contract.';
MSGS_CONSTANTS[35] = 'The item for transaction line {s} is not valid for return. \nThe item does not exist on the list of Contract Items under this Contract.';
MSGS_CONSTANTS[36] = 'The item for transaction line {s} is not valid for return. \nThe item has a different List Rate compared to other similar Contract Items under this Contract.';
MSGS_CONSTANTS[37] = 'The item for transaction line {s} is not valid for return. \nThe quantity specified, along with other existing return authorizations, will exceed the total quantity of this Contract Item under this Contract.';
MSGS_CONSTANTS[38] = 'If you want to add a Perpetual License, please do so in an Upsell Sales Order.';
MSGS_CONSTANTS[39] = 'Please select the transaction lines to be processed.';
MSGS_CONSTANTS[40] = 'You cannot add a new Contract Item manually.';
MSGS_CONSTANTS[41] = 'This Customer has these multiple existing Contracts. Select carefully from these existing Contracts if this is an Upsell Transaction:\n{0} If this is not an Upsell Transaction, leave the Contract field blank and a new Contract will be created';
MSGS_CONSTANTS[42] = 'The transaction Start Date is earlier than the Contract Start Date. \nPlease edit the transaction Start Date.';
MSGS_CONSTANTS[43] = 'The transaction Start Date is later than the Contract End Date. \nPlease edit the transaction Start Date.';
MSGS_CONSTANTS[44] = 'The Contract Term is invalid. Please enter a value greater than 0.';
MSGS_CONSTANTS[45] = 'The item for transaction line {s} is not valid for return. \nThe item has Term greater than that of the existing item.';
MSGS_CONSTANTS[46] = 'This item is not valid for return. \nThe item has Term greater than that of the existing item.';
MSGS_CONSTANTS[47] = 'The Contract Item Start Date is earlier than Contract Start Date. \nPlease enter a valid Contract Item Start Date.';
MSGS_CONSTANTS[48] = 'The Contract Item Start Date is later than the Contract End Date. \nPlease enter a valid Contract Item Start Date.';
MSGS_CONSTANTS[49] = 'The Contract Item End Date is earlier than Contract Start Date. \nPlease enter a valid Contract Item End Date.';
MSGS_CONSTANTS[50] = 'The Contract Item End Date is later than the Contract End Date. \nPlease enter a valid Contract Item End Date.';
// Issue: 199577 SWV-CR > allow for RMA that does not reference contract
MSGS_CONSTANTS[51] = 'You have selected an item normally associated to contracts, but have not specified a Contract.\nIf you wish to have this Return Authorization impact a contract, please select that contract and modify this line.';
MSGS_CONSTANTS[52] = 'A contract is normally associated to items, but there is no Contract specified.\nIf you wish to have this Return Authorization impact a contract, please select that contract and modify the contract items.';
// Issue 199578
MSGS_CONSTANTS[53] = 'Please enter a value for Renewal Terms.';
MSGS_CONSTANTS[54] = 'Cannot delete {s}. Contract Items exist for this record.';
// Issue 204399
MSGS_CONSTANTS[55] = 'Please Note: The contract you are upselling/downselling into has already been renewed or has already expired. Any renewal transaction from this contract will not be automatically impacted, and the contract item generated from this transaction will not automatically renew.';
MSGS_CONSTANTS[56] = 'Ship to Tier customer has no default shipping address. Ship to Address will not be updated.';
// Issue 206937  
MSGS_CONSTANTS[57] = 'The contract associated with this Return Authorization has already been renewed.';
/* ----------------------------------------------------------- */

SWE.Library.record = {
    recordColumns: '',
    recordExist: function ( recordname, recordId )
        {
            var iID = nlapiLookupField(recordname, recordId, 'id');
            if (SWE.Library.misc.isUndefinedNullOrEmpty(iID))
            {
                return false;
            }
            return true;
        },
    getContractDetails: function ( contractid )
        {
            var fields = ['custrecord_contracts_bill_to_customer'
                , 'custrecord_contracts_end_user'
                , 'custrecord_contract_date_renewed'
                , 'custrecord_contracts_start_date'
                , 'custrecord_contracts_end_date'];
            var columns = nlapiLookupField('customrecord_contracts', contractid, fields);

            return columns;
        },
    /*hasContractItems: function ()
        {
            var filters = new Array();
            filters[0] = new nlobjSearchFilter( 'custrecord_ci_contract_id', null, 'equal', recordID );
            var columns = new Array();
            columns[0] = new nlobjSearchColumn( 'custrecord_ci_item' );
            var searchresults = nlapiSearchRecord( 'customrecord_contract_item', null, filters, columns );
            if (searchresults != null && searchresults.length > 0){
                return true;
            }
            else{
                return false;
            }
        },*/ //not used
    /*isTranStartDateValid: function( stContractID, stStartDate ) {
        var stContractStartDate = nlapiLookupField('customrecord_contracts', stContractID, 'custrecord_contracts_start_date');
        var iResult = SWE.Library.dates.compare(stContractStartDate, stStartDate);
        if (iResult == 1) {
            return 'ERR_HEADER_STARTDATE_EARLYTHAN_CONTRACT';
        }
        return true;
    },*/ //No longer used because this does not check against the contract end date and still uses nlapiLookupField()
    checkRevRecFields: function( stItemCat, stRRStartDate, stRREndDate) {
        if (SWE.Library.misc.isUndefinedNullOrEmpty(stRRStartDate)) {
            return  'ERR_TL_REVRECSTARTDATE_MISSING';
        }
        if (stitemcat != ITEMCAT_TYPE_LICENSE_PERP &&
                SWE.Library.misc.isUndefinedNullOrEmpty(stRREndDate)) {
            return  'ERR_TL_REVRECENDDATE_MISSING';
        }
        return true;
    },
    checkCustomer: function( stDistributor, stReseller, stEndUser) {
        if (SWE.Library.misc.isUndefinedNullOrEmpty(stDistributor)
                && SWE.Library.misc.isUndefinedNullOrEmpty(stReseller)
                && SWE.Library.misc.isUndefinedNullOrEmpty(stEndUser)) {
            return 'ERR_HEADER_CUSTOMER_MISSING';
        }
        return true;
    },
    isStartDateLaterThanEndDate: function( stStartDate, stEndDate ) {
        if (SWE.Library.dates.compare(stStartDate, stEndDate) == 1)
        {
            return  'ERR_HEADER_STARTDATE_GREATERTHAN_ENDDATE';
        }
        return true;
    },
    getItemRate: function(itemId, priceLevel){

        if (parseInt(priceLevel) > 1) { // if not base price
            if (!SWE.Library.misc.isUndefinedNullOrEmpty(itemId)) {
            	var filters = [
						new nlobjSearchFilter('pricelevel', 'pricing', 'anyof', priceLevel),
						new nlobjSearchFilter('internalid', null, 'is', itemId) ];
						// set search return columns for pricing list search
				var columns = [
						// new nlobjSearchColumn('currency', 'pricing'),
						new nlobjSearchColumn('unitprice', 'pricing'),
						new nlobjSearchColumn('name') ];
				var x = nlapiSearchRecord('item', null, filters, columns);
				var result = null;
				if (!SWE.Library.misc.isUndefinedNullOrEmpty(x)) {
					result = x[0].getValue('unitprice', 'pricing');
				}
				nlapiLogExecution('DEBUG', 'getItemRate', 'unit price: ' + result );
				return result;

            }
        } else {
            return nlapiLookupField('item', itemId, 'baseprice');
        }
        return null;
    },
    getItemRateFromCustomer: function(recTran, customerId, itemId, quantity){
    	nlapiLogExecution('DEBUG', 'getItemRateFromCustomer', 'Customer Id: ' + customerId 
    			+ '  |  Item Id: ' + itemId);
    	var itemRate = 0;
    	var priceLevel = null;
    	if (SWE.Library.misc.isUndefinedNullOrEmpty(recTran)){
        	recTran = nlapiCreateRecord('salesorder', {recordmode: 'dynamic'});
        	recTran.setFieldValue('entity', customerId);
    	}

    	recTran.selectNewLineItem('item');
    	recTran.setCurrentLineItemValue('item', 'item', itemId);
    	recTran.setCurrentLineItemValue('item', 'quantity', (quantity < 0 ? 1 : quantity));

    	itemRate = recTran.getCurrentLineItemValue('item', 'rate');
    	priceLevel = recTran.getCurrentLineItemValue('item', 'price');

    	nlapiLogExecution('DEBUG', 'getItemRateFromCustomer', 'Item Rate: ' + itemRate + '  |  Price Level: ' + priceLevel );

    	return new Array(itemRate, priceLevel);
    },
    getItemRateFromContract: function(recTran, customerId, itemId, priceLevel, quantity){
    	nlapiLogExecution('DEBUG', 'getItemRateFromContract', 'Customer Id: ' + customerId + '  |  Item Id: ' + itemId  
    			+ '  |  Price Level: ' + priceLevel + '  |  Quantity: ' + quantity);
    	var itemRate = 0;
    	priceLevel = (SWE.Library.misc.isUndefinedNullOrEmpty(priceLevel) ? 1 : priceLevel);
    	if (SWE.Library.misc.isUndefinedNullOrEmpty(recTran)){
        	recTran = nlapiCreateRecord('salesorder', {recordmode: 'dynamic'});
        	recTran.setFieldValue('entity', customerId);
    	}

    	recTran.selectNewLineItem('item');
    	recTran.setCurrentLineItemValue('item', 'item', itemId);
    	recTran.setCurrentLineItemValue('item', 'price', priceLevel);
    	recTran.setCurrentLineItemValue('item', 'quantity', (quantity < 0 ? 1 : quantity));

    	itemRate = recTran.getCurrentLineItemValue('item', 'rate');
    	priceLevel = recTran.getCurrentLineItemValue('item', 'price');

    	nlapiLogExecution('DEBUG', 'getItemRateFromContract', 'Item Rate: ' + itemRate + '  |  Price Level: ' + priceLevel );

    	return new Array(itemRate, priceLevel);
    }
};

SWE.Library.messages = {
    isFieldEmpty: function ( fieldname, field_desc ) {
        var stField = nlapiGetFieldValue('custrecord_ci_end_user');
        if (SWE.Library.misc.isUndefinedNullOrEmpty(stField)) {
            return field_desc + ' is missing. Please check the value of ' + field_desc + '.';
        }
        return true;
    },
    getErrorMessage: function( iResult, lineNo ) {
        var stErrMsg;
        switch (iResult) {
            case '0':
                stErrMsg = 'Transaction Start Date is equal to transaction End Date.'
                         + '\nPlease edit your transaction dates.';
                break;
            case '1':
                stErrMsg = 'Transaction Start Date is later than transaction End Date.'
                         + '\nPlease edit your transaction dates.';
                break;
            case NaN:
                stErrMsg = 'Transaction dates are invalid. Please edit your transaction dates.';
                break;
            /*case 'ERR_HEADER_STARTDATE_EARLYTHAN_CONTRACT':
                stErrMsg = 'Transaction Start Date is earlier than Contract Start Date. \nPlease edit your transaction Start Date.';
                break;*/ //Deprecated along with isTranStartDateValid()
            case 'ERR_TL_REVRECSTARTDATE_MISSING':
                stErrMsg = 'The Rev. Rec. Start Date is missing for transaction line ' + lineNo + '. Please edit that transaction line.';
                break;
            case 'ERR_TL_REVRECENDEDATE_MISSING':
                stErrMsg = 'The Rev. Rec. End Date is missing for transaction line ' + lineNo + '. Please edit that transaction line.';
                break;
            case 'ERR_HEADER_CUSTOMER_MISSING':
                stErrMsg = 'Please make sure to select a Distributor, Reseller, or End User.';
                break;
            case 'ERR_HEADER_INVALID_END_USER':
            	var erEndUser = nlapiGetFieldText('custbody_end_user');
            	stErrMsg = erEndUser + ' is not a valid End User. Please check the Channel Tier.';
            	break;
            case 'ERR_HEADER_STARTDATE_GREATERTHAN_ENDDATE':
                if (lineNo != null) {
                    stErrMsg = 'The Contract Item Start Date is later than the Contract Item End Date for transaction line ' + lineNo + '. \nPlease enter a valid Contract Item Start Date.';
                }
                else {
                    stErrMsg = 'Transaction Start Date is later than transaction End Date. \nPlease enter a valid transaction Start Date.';
                }
                break;
            default:
                stErrMsg = '';
        }
        return stErrMsg;
    },

    /*
     * replaces {s} in msg with the passed parameters.
     */
    displayMessage: function( msg, param1, param2, param3, param4, param5 ) {
        if(!param1 || param1 == null)
          return msg;

        var splitString = msg.split('{s}');
        var resultString = splitString[0];
        var parameters = new Array(param1, param2, param3, param4, param5);

        var i = 1;
        while(splitString.length > i && i <= parameters.length && parameters[i-1] && parameters[i-1] != null) {
            resultString += parameters[i-1] + splitString[i];
            i++;
        }
        return resultString;
    }
}

SWE.Library.dates = {
    convert: function(d) {
        return (
            d.constructor === Date ? d :
            d.constructor === Array ? new Date(d[0],d[1],d[2]) :
            d.constructor === Number ? new Date(d) :
            d.constructor === String ? nlapiStringToDate(d) : //watch out, this could be null
            typeof d === "object" ? new Date(d.year,d.month,d.date) :
            NaN
        );
    },
    /*compare2: function(a,b) { // -1 if a < b, 0 if a = b, 1 if a > b, NaN if a or b is an illegal date
        return (
            isFinite(a=this.convert(a).valueOf()) &&
            isFinite(b=this.convert(b).valueOf()) ?
            (a>b)-(a<b) :
            NaN
        );
    },*/ //not used
    compare: function(a, b) { // -1 if a < b, 0 if a = b, 1 if a > b, NaN if a or b is an illegal date
        a = nlapiStringToDate(a);
        if (a == null) return NaN;
        b = nlapiStringToDate(b);
        if (b == null) return NaN;
        return (
            (!isNaN(a = a.valueOf())) &&
            (!isNaN(b = b.valueOf())) ?
            (a>b)-(a<b) :
            NaN
        );
    },
    inRange: function(d, start, end) {
        d = nlapiStringToDate(d);
        if (d == null) return NaN;
        start = nlapiStringToDate(start);
        if (start == null) return NaN;
        end = nlapiStringToDate(end);
        if (end == null) return NaN;
        return (
            isFinite(d = d.valueOf()) &&
            isFinite(start = start.valueOf()) &&
            isFinite(end = end.valueOf()) ?
            start <= d && d <= end :
            NaN
        );
    },
    addMonths2: function(term, startDate) { //Issue 215816
        var months = parseInt(term);
        var days = term % 1;
        var endDate = null;
        startDate = SWE.Library.dates.convert(startDate);
        endDate = nlapiAddMonths(startDate, months);
        days = Math.round(days * SWE.Library.dates.getNumberOfDaysInTheMonth(endDate));
        endDate = nlapiAddDays(endDate, days - 1);
        return endDate;
    },
    dateDiff: function(startDate, endDate){
        nlapiLogExecution('Debug', 'date Diff', 'Start Date - ' + startDate + ' | End Date - ' + endDate );
        if(SWE.Library.misc.isUndefinedNullOrEmpty(startDate) || SWE.Library.misc.isUndefinedNullOrEmpty(endDate)){
            return null;
        }
        if ( startDate.split ) {
            startDate = nlapiStringToDate( startDate );
        }
        if ( endDate.split ) {
            endDate = nlapiStringToDate( endDate );
        }
//      startDate = SWE.Library.dates.convert(startDate);
//      endDate = SWE.Library.dates.convert(endDate);

        var intMonths = endDate.getMonth() - startDate.getMonth() + ( endDate.getFullYear() - startDate.getFullYear() ) * 12 + 1;
        var intermediateValue = SWE.Library.dates.addMonths2( intMonths, startDate );

        while(intermediateValue.getTime() > endDate.getTime()){
            intMonths--;
            intermediateValue = SWE.Library.dates.addMonths2( intMonths, startDate );
        }

        //get days remaining
        var oneDay = 1000 * 60 * 60 * 24;
        var daysRemaining = (endDate.getTime() - intermediateValue.getTime()) / oneDay;
        var decimalMonths = 0;
        if(daysRemaining > 0){
            var temp = nlapiAddDays(intermediateValue, 1);
            var dayCountInLastMonth = SWE.Library.dates.getNumberOfDaysInTheMonth(temp);
            //I have to have 2 logics, for odd-numbered-day months and even numbered ones.
            /*if(dayCountInLastMonth % 2 == 0){
                //do nothing
            } else {
                var dayCountInFirstMonth = SWE.Library.dates.getNumberOfDaysInTheMonth(startDate);
                if(startDate.getDate() / dayCountInFirstMonth < 0.5)
                    dayCountInLastMonth--;
                else
                    dayCountInLastMonth++;

            }*/

            if(endDate.getMonth() == startDate.getMonth()){
                dayCountInLastMonth = SWE.Library.dates.getNumberOfDaysInTheMonth(endDate);
            }
            else{
                if(intMonths == 0){
                    dayCountInLastMonth = SWE.Library.dates.getNumberOfDaysInTheMonth(nlapiAddMonths(endDate, -1));
                }
            }

            decimalMonths = daysRemaining / dayCountInLastMonth;
        }

        return intMonths + decimalMonths;
    },
    getNumberOfDaysInTheMonth: function(dateValue){
        if(dateValue.constructor !== Date) {
            dateValue = SWE.Library.dates.convert(dateValue);
        }
        var noOfDaysInThisMonth = 32 - new Date(dateValue.getFullYear(), dateValue.getMonth(), 32).getDate();
        return noOfDaysInThisMonth;
    }
}

SWE.Library.misc = {
    getSWEPreference: function ( type, prefname ){
        var ctx = nlapiGetContext();
        var isPreference = ctx.getSetting( type, prefname );
        return (isPreference == 'T' ? true : false) ;
    },

    //Cookies are now removed because it fails in Test\
    //Use instead the HiddenField methods
    createCookie: function ( name, value, days ){
        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            var expires = "; expires="+date.toGMTString();
        }
        else var expires = "";
        //document.cookie = name+"="+value+expires+"; path=/";
        return true;
    },
    readCookie: function (name) {
        var nameEQ = name + "=";
        var ca = '';//document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ')
                c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0)
                return c.substring(nameEQ.length, c.length);
        }
        return null;
    },
    eraseCookie: function ( name ) {
        this.createCookie(name,"",-1);
    },
    isUndefinedOrNull: function(value) {
        return (!value || value == null);
    },
    isUndefinedNullOrEmpty: function(value) {
        return (!value || value == null || value == '');
    },
    isItemTypeValid: function( stItemType ) {
        return (stItemType != 'Discount'
             && stItemType != 'Markup'
             && stItemType != 'Description'
             && stItemType != 'Subtotal'
             && stItemType != 'Payment'
             && stItemType != 'Group'
             && stItemType != 'EndGroup'
             && stItemType != ''
             && stItemType != null);
    },
    /*
     * returns true if the parameter is a number
     */
    isNumeric: function(value) {
        return !isNaN(parseFloat(value));
    },

    /**
     * Checks if the array contains the object or not
     * @param {Object} arrContainer : Array to check
     * @param {Object} obj : Object to search
     * @param {Object} remove : True if the item is to be removed from the Array if found, False otherwise
     */
    contains: function(arrContainer, obj, remove){
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty(arrContainer) ){
            var i = arrContainer.length;
            while (i--) {
                if (arrContainer[i] === obj) {
                    if (remove) {
                        arrContainer.splice(i, 1);
                    }
                    return true;
                }
            }
        }
        return false;
    },

    /*
     * validates the total number of renewal items of contract against a maximum (currently 200).
     * returns: true if valid (within the max)
     *          false if more than the max
     */
    validateAgainstMaxTranLines: function(contractID, additionalLines)
    {
        var MAX_TRAN_LINES = 200;       //maximum # of tran lines allowed in a single contract.

        //get count
        var totalLineCount = 0;
        if(contractID != null && contractID != '' && parseInt(contractID) > 0)
        {
            totalLineCount += this.getTranLineCount(contractID);
        }
        totalLineCount += additionalLines;


        return (totalLineCount <= MAX_TRAN_LINES);
    },

    getTranLineCount: function(contractID)
    {
        var arrSearchFilters = new Array();
        arrSearchFilters[0] = new nlobjSearchFilter('custrecord_ci_contract_id', null, 'anyof', contractID);
        arrSearchFilters[1] = new nlobjSearchFilter('custrecord_ci_state', null, 'is', 'Active');

        var arrColumns = new Array();
        //arrColumns[0] = new nlobjSearchColumn('custrecord_ci_contract_id');
        arrColumns[0] = new nlobjSearchColumn('internalid', '', 'count');

        var arrResults = nlapiSearchRecord('customrecord_contract_item', null, arrSearchFilters, arrColumns);
        var recordCount = arrResults[0].getValue('internalid', '', 'count');

        //return arrResults == null ? 0 : arrResults.length;
        return parseInt(recordCount);
    },

    CUSTBODY_HIDDENFLD_ID: 'custbody_hidden_field',
    HF_SEPARATOR: '~',

    /**
     * Sets a name-value pair to the hidden field control
     * @param {Object} name
     * @param {Object} value
     * @author mabiog
     */
    setToHiddenField: function(name, value){
        var stHiddenField = this.getCustBodyHiddenField();

        if (!SWE.Library.misc.isUndefinedNullOrEmpty(stHiddenField) && this.getHiddenFieldValue(name) != '') {
            this.removeHiddenFieldValue(name);
        }
        this.addToHiddenField(name, value);
    },

    /**
     * Adds a name-value pair to the hidden field control
     * @param {Object} name
     * @param {Object} value
     * @author mabiog
     */
    addToHiddenField: function(name, value){
        if(SWE.Library.misc.isUndefinedNullOrEmpty(name)) return;
        var stHiddenField = this.getCustBodyHiddenField();

        nlapiSetFieldValue(this.CUSTBODY_HIDDENFLD_ID, stHiddenField + (stHiddenField.length > 0 ? '|' : '') + name + this.HF_SEPARATOR + value);
    },

    /**
     * Gets the value of the name in the hidden field control
     * @param {Object} name
     * @author mabiog
     */
    getHiddenFieldValue: function(name){
        var arrHiddenField = this.getCustBodyHiddenField().split('|');
        var value = '';

        if(arrHiddenField.length > 0){
            for (var i = 0; i < arrHiddenField.length; i++) {
                var nameValue = arrHiddenField[i].split( this.HF_SEPARATOR );

                if (nameValue.length > 0 && nameValue[0] == name) {
                    value = nameValue[1];
                    break;
                }
            }
        }

        return value;
    },

    /**
     * Removes the name-value pair in the hidden field control
     * @param {Object} name
     * @author mabiog
     */
    removeHiddenFieldValue: function(name){
        var stHiddenFieldValue = this.getCustBodyHiddenField();
        var arrHiddenField = {};
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( stHiddenFieldValue ) ) {
            arrHiddenField = stHiddenFieldValue.split('|');
        }

        if(arrHiddenField.length > 0){
            nlapiSetFieldValue(this.CUSTBODY_HIDDENFLD_ID, '');

            for (var i = 0; i < arrHiddenField.length; i++) {
                var nameValue = arrHiddenField[i].split( this.HF_SEPARATOR );

                if (nameValue.length > 0 && nameValue[0] != name) {
                    this.addToHiddenField(nameValue[0], nameValue[1]);
                }
            }
        }
    },
    getCustBodyHiddenField: function(){
        var hf = nlapiGetFieldValue(this.CUSTBODY_HIDDENFLD_ID);
        if (SWE.Library.misc.isUndefinedNullOrEmpty(hf)) {
            hf = '';
        }
        return hf;
    },

    setTimeout: function(ms){
        var dt = new Date();
        dt.setTime(dt.getTime() + ms);
        while (new Date().getTime() < dt.getTime())
        ;
    },

    /**
     * Returns a value rounded off to the number of decimal places specified in the parameter.
     * @param  {Object} currentValue        The current value of to be rounded off
     * @param  {Object} numberOfDecimal     The number of decimal places to be used
     * @return {Object} newValue            The newly formatted value
     * @author ztan
    */
    getRoundedDec: function(currentValue, numberOfDecimal){
        var numberPower = Math.pow(10, SWE.Library.misc.isUndefinedNullOrEmpty(numberOfDecimal) ? 1 : parseInt(numberOfDecimal));
        var newValue = (Math.round(currentValue * numberPower) / numberPower);

        return newValue;
    },
    
    /**
     * Checks if the multi-currency feature is turned on.
     * 
     */
    isMultiCurrencyEnabled: function() {
        return nlapiGetContext().getFeature('MULTICURRENCY');
    },
    splitList: function(stList){
        if (stList){
            stList = stList.split(',');
        } else {
            stList = new Array();
        }
        return stList;
    },
    searchInList: function(arrList, varObj) {
        var bIsFound = false;

        for (var i = 0; i < arrList.length; i++) {
            if (arrList[i] == varObj) {
                bIsFound = true;
                break;
            }
        }

        return bIsFound;
    },
    executeScriptInForm: function(formId, IsTransaction) {
        var executeScript = false;
        var arrayForms = [];

        if(IsTransaction) {
        	arrayForms = this.splitList( SWE.Parameters.getTranFormsToDeployScripts() );
        } else {
        	arrayForms = this.splitList( SWE.Parameters.getEntryFormsToDeployScripts() );
        }        

        nlapiLogExecution('DEBUG', 'executeScriptInForm', 'arrayForms: ' + arrayForms
        		+ '  |  formId: ' + formId
        		+ '  |  Is Transaction: ' + IsTransaction);

        if (!SWE.Library.misc.isUndefinedNullOrEmpty(arrayForms)) {        
	        if (!SWE.Library.misc.isUndefinedNullOrEmpty(formId)){
	            if ( this.searchInList(arrayForms, formId) == true ){
	                executeScript = true;
	            }
	        }
        } else {
        	executeScript = true;
        }
        return executeScript;
    }
};

/*
 * Represents a tran line item.  For now, it suffices to just have one, and work on sales order.
 * @author Chris Camacho (ccamacho)
 */
function TranLine(index){
    this._index = index;
}

TranLine.prototype = {
    _itemId: null,
    _category: null,
    _revrecterminmonths: null,
    _revrecstartdate: null,
    _revrecenddate: null,
    _itemTermInMonths: null,
    _itemStartDate: null,
    _itemEndDate: null,
    _itemType: null,
    _quantity: null,
    _price: null,
    _discountRate: null,
    _rate: null,
    _listRate: null,
    _pricingType: null,
    _resetData: null,
    _isPerpetual: null,
    _isHardware: null,
    _isProcessable: null,
    _isMaintenance: null,
    _isCustomLimitable: null,
    _isTerm: null,
    _isSupport: null,
    _isRenewal: null,
    _productLine: null,
    _renewalsExclusion: null,

    getLineNumber: function() {
        return this._index;
    },
    getItemId: function() {
        this._itemId = nlapiGetCurrentLineItemValue('item', 'item');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._itemId ) ) {
            this._itemId = nlapiGetLineItemValue('item', 'item', this._index);
        }
        return this._itemId;
    },
    getQuantity: function() {
        this._quantity = nlapiGetCurrentLineItemValue( 'item', 'quantity' );
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._quantity ) ) {
            this._quantity = nlapiGetLineItemValue('item', 'quantity', this._index);
        }
        return this._quantity ;
    },
    getCategory: function() {
        this._category = nlapiGetCurrentLineItemValue('item', 'custcol_item_category');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._category ) ) {
            this._category = nlapiGetLineItemValue('item', 'custcol_item_category', this._index);
        }
        return this._category;
    },
    /*getCategory2: function(){
        return nlapiGetLineItemValue('item', 'custcol_item_category', this._index);
    },*/
    setCategory: function(newValue, fireFieldEvent) {
        nlapiSetCurrentLineItemValue('item', 'custcol_item_category', newValue, fireFieldEvent);
        this._category = nlapiGetCurrentLineItemValue('item', 'custcol_item_category');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._category ) ) {
            nlapiSetLineItemValue('item', 'custcol_item_category', this._index, newValue);
            this._category = newValue;
        }
    },
    getRevRecTermInMonths: function() {
        this._revrecterminmonths = nlapiGetCurrentLineItemValue('item', 'revrecterminmonths');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._revrecterminmonths ) ) {
            this._revrecterminmonths = nlapiGetLineItemValue('item', 'revrecterminmonths', this._index);
        }
        return this._revrecterminmonths;
    },
    setRevRecTermInMonths: function(newValue, fireFieldEvent) {
        nlapiSetCurrentLineItemValue('item', 'revrecterminmonths', newValue, fireFieldEvent);
        this._revrecterminmonths = nlapiGetCurrentLineItemValue('item', 'revrecterminmonths');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._revrecterminmonths ) ) {
            nlapiSetLineItemValue('item', 'revrecterminmonths', this._index, newValue);
            this._revrecterminmonths = newValue;
        }
    },
    getRevRecStartDate: function() {
        this._revrecstartdate = nlapiGetCurrentLineItemValue('item', 'revrecstartdate');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._revrecstartdate ) ) {
            this._revrecstartdate = nlapiGetLineItemValue('item', 'revrecstartdate', this._index);
        }
        return this._revrecstartdate;
    },
    setRevRecStartDate: function(newValue, fireFieldEvent) {
        nlapiSetCurrentLineItemValue('item', 'revrecstartdate', newValue, fireFieldEvent);
        this._revrecstartdate = nlapiGetCurrentLineItemValue('item', 'revrecstartdate');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._revrecstartdate ) ) {
            nlapiSetLineItemValue('item', 'revrecstartdate', this._index, newValue);
            this._revrecstartdate = newValue;
        }
    },
    getRevRecEndDate: function() {
        this._revrecenddate = nlapiGetCurrentLineItemValue('item', 'revrecenddate');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._revrecenddate ) ) {
            this._revrecenddate = nlapiGetLineItemValue('item', 'revrecenddate', this._index);
        }
        return this._revrecenddate;
    },
    setRevRecEndDate: function(newValue, fireFieldEvent) {
        nlapiSetCurrentLineItemValue('item', 'revrecenddate', newValue, fireFieldEvent);
        this._revrecenddate = nlapiGetCurrentLineItemValue('item', 'revrecenddate');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._revrecenddate ) ) {
            nlapiSetLineItemValue('item', 'revrecenddate', this._index, newValue);
            this._revrecenddate = newValue;
        }
    },
    getItemTermInMonths: function() {
        this._itemTermInMonths = nlapiGetCurrentLineItemValue('item', 'custcol_swe_contract_item_term_months');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._itemTermInMonths ) ) {
            this._itemTermInMonths = nlapiGetLineItemValue('item', 'custcol_swe_contract_item_term_months', this._index);
        }
        return this._itemTermInMonths;
    },
    setItemTermInMonths: function(newValue, fireFieldEvent) {
        nlapiSetCurrentLineItemValue('item', 'custcol_swe_contract_item_term_months', newValue, fireFieldEvent);
        this._itemTermInMonths = nlapiGetCurrentLineItemValue('item', 'custcol_swe_contract_item_term_months');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._itemTermInMonths ) ) {
            nlapiSetLineItemValue('item', 'custcol_swe_contract_item_term_months', this._index, newValue);
            this._itemTermInMonths = newValue;
        }
    },
    getContractItemStartDate: function() {
        this._itemStartDate = nlapiGetCurrentLineItemValue('item', 'custcol_swe_contract_start_date');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._itemStartDate ) ) {
            this._itemStartDate = nlapiGetLineItemValue('item', 'custcol_swe_contract_start_date', this._index);
        }
        return this._itemStartDate;
    },
    setContractItemStartDate: function(newValue, fireFieldEvent) {
        nlapiSetCurrentLineItemValue('item', 'custcol_swe_contract_start_date', newValue, fireFieldEvent);
        this._itemStartDate = nlapiGetCurrentLineItemValue('item', 'custcol_swe_contract_start_date');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._itemStartDate ) ) {
            nlapiSetLineItemValue('item', 'custcol_swe_contract_start_date', this._index, newValue);
            this._itemStartDate = newValue;
        }
    },
    getContractItemEndDate: function() {
        this._itemEndDate = nlapiGetCurrentLineItemValue('item', 'custcol_swe_contract_end_date');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._itemEndDate ) ) {
            this._itemEndDate = nlapiGetLineItemValue('item', 'custcol_swe_contract_end_date', this._index);
        }
        return this._itemEndDate;
    },
    setContractItemEndDate: function(newValue, fireFieldEvent) {
        nlapiSetCurrentLineItemValue('item', 'custcol_swe_contract_end_date', newValue, fireFieldEvent);
        this._itemEndDate = nlapiGetCurrentLineItemValue('item', 'custcol_swe_contract_end_date');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._itemEndDate ) ) {
            nlapiSetLineItemValue('item', 'custcol_swe_contract_end_date', this._index, newValue);
            this._itemEndDate = newValue;
        }
    },
    getItemType: function() {
        this._itemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._itemType ) ) {
            this._itemType = nlapiGetLineItemValue('item', 'itemtype', this._index);
        }
        return this._itemType;
    },
    setItemType: function(newValue, fireFieldEvent) {
        nlapiSetCurrentLineItemValue('item', 'itemtype', newValue, fireFieldEvent);
        this._itemType = nlapiGetCurrentLineItemValue('item', 'itemtype');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._itemType ) ) {
            nlapiSetLineItemValue('item', 'itemtype', this._index, newValue);
            this._itemType = newValue;
        }
    },
    getPrice: function() {
        this._price = nlapiGetCurrentLineItemValue('item', 'price');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._price ) ) {
            this._price = nlapiGetLineItemValue('item', 'price', this._index);
        }
        return this._price;
    },
    setPrice: function(newValue, fireFieldEvent, synchronous) {
        nlapiSetCurrentLineItemValue('item', 'price', newValue, fireFieldEvent, synchronous);
        this._price = nlapiGetCurrentLineItemValue('item', 'price');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._price ) ) {
            nlapiSetLineItemValue('item', 'price', this._index, newValue);
            this._price = newValue;
        }
    },
    getDiscountRate: function() {   //at the moment, no set method for discount rate.  is this field read-only?
        this._discountRate = nlapiGetCurrentLineItemValue('item', 'custcol_inline_discount');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._discountRate ) ) {
            this._discountRate = nlapiGetLineItemValue('item', 'custcol_inline_discount', this._index);
        }
        return this._discountRate;
    },
    getExtendedRate: function() {
        this._rate =  nlapiGetCurrentLineItemValue('item', 'rate');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._rate ) ) {
            this._rate = nlapiGetLineItemValue('item', 'rate', this._index);
        }
        return this._rate;
    },
    setExtendedRate: function(newValue, fireFieldEvent, synchronous) {      //note this method has a 3rd parameter, unlike the others.
        nlapiSetCurrentLineItemValue('item', 'rate', newValue, fireFieldEvent, synchronous);
        this._rate = nlapiGetCurrentLineItemValue('item', 'rate');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._rate ) ) {
            nlapiSetLineItemValue('item', 'rate', this._index, newValue);
            this._rate = newValue;
        }
    },
    getResetData: function() {
        this._resetData = nlapiGetCurrentLineItemValue('item', 'custcol_renewal_reset_data');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._resetData ) ) {
            this._resetData = nlapiGetLineItemValue('item', 'custcol_renewal_reset_data', this._index);
        }
        return this._resetData;
    },
    getListRate: function() {
        this._listRate = nlapiGetCurrentLineItemValue('item', 'custcol_list_rate');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._listRate ) ) {
            this._listRate = nlapiGetLineItemValue('item', 'custcol_list_rate', this._index);
        }
        return this._listRate;
    },
    setListRate: function(newValue, fireFieldEvent, synchronous) {
        nlapiSetCurrentLineItemValue('item', 'custcol_list_rate', newValue, fireFieldEvent, synchronous);
        this._listRate = nlapiGetCurrentLineItemValue('item', 'custcol_list_rate');
        if (this._index != null && SWE.Library.misc.isUndefinedNullOrEmpty( this._listRate ) ) {
            nlapiSetLineItemValue('item', 'custcol_list_rate', this._index, newValue);
            this._listRate = newValue;
        }
    },
    getPricingType: function() {
        this._pricingType = nlapiGetCurrentLineItemValue('item', 'custcol_item_pricing_type');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._pricingType ) ) {
            this._pricingType = nlapiGetLineItemValue('item', 'custcol_item_pricing_type', this._index);
        }
        return this._pricingType;
    },

    getProductLine: function(){
        this._productLine = nlapiGetCurrentLineItemValue('item', 'custcol_product_line');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._productLine ) ) {
            this._productLine = nlapiGetLineItemValue('item', 'custcol_product_line', this._index);
        }

        return this._productLine;
    },
    getRenewalsExclusion: function(){
        this._renewalsExclusion = nlapiGetCurrentLineItemValue('item', 'custcol_renewals_exclusion');
        if ( !SWE.Library.misc.isUndefinedNullOrEmpty( this._index ) && SWE.Library.misc.isUndefinedNullOrEmpty( this._renewalsExclusion ) ) {
            this._renewalsExclusion = nlapiGetLineItemValue('item', 'custcol_renewals_exclusion', this._index);
        }

        return this._renewalsExclusion;
    },
    isRenewal: function() {
        return searchInList(splitList(SWE.Parameters.getItemCategoriesForRenewal()), this.getCategory());
    },
    isSupportCategoryType: function() {
        return searchInList(splitList(ITEMCATS_FOR_SUPPORT), this.getCategory());
    },
    isMaintenanceCategoryType: function() {
        return searchInList(splitList(ITEMCATS_FOR_MAINTENANCE), this.getCategory());
    },
    isCustomLimitableCategoryType: function() {
        return searchInList(splitList(SWE.Parameters.getCustomLimits()), this.getCategory());
    },
    isTermCategoryType: function() {
        return searchInList(splitList(ITEMCATS_FOR_TERM), this.getCategory());
    },
    isPerpetualCategoryType: function() {
        return searchInList(splitList(ITEMCATS_FOR_PERPETUAL), this.getCategory());
    },
    isHardwareCategoryType: function() {
        return (this.getCategory() == ITEMCAT_TYPE_HARDWARE ? true : false);
    },
    isProcessableCategoryType: function() {
        return searchInList(splitList(SWE.Parameters.getItemCatsForTranLineAuto()), this.getCategory());
    },
    isItemTypeProcessable: function() {     //if you can think of a better name for this, be my guest... just update wherever this is called.
        var stItemType = this.getItemType();
        return (stItemType != 'Discount'
             && stItemType != 'Markup'
             && stItemType != 'Description'
             && stItemType != 'Subtotal'
             && stItemType != 'Payment'
             && stItemType != 'Group'
             && stItemType != 'EndGroup'
             && stItemType != ''
             && stItemType != null);
    },
    isResetLine: function(){
        return nlapiGetCurrentLineItemValue('item','custcol_reset_renewal_data') == 'T';
    }

}
