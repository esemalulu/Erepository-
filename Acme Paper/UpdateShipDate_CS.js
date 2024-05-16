var REC_ACME_OFFICIAL_HOLIDAYS = 'customrecord_acme_official_holidays';
var FLD_AOH_HOLIDAY_DATE = 'custrecord_aoh_holiday_date';
var aHolidays = [];
var HC_ACCOUNT_TIMEZONE = 'America/Toronto';
var HC_ORDER_CUT_OFF = '16:15';

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function loadHolidaysPageInit(type)
{
    var aColSearch = [];
    var aFltSearch = [];
    var aResult;
    var recordType = nlapiGetFieldValue('type');

    aColSearch.push(new nlobjSearchColumn(FLD_AOH_HOLIDAY_DATE));

    aResult = nlapiSearchRecord(REC_ACME_OFFICIAL_HOLIDAYS, null, aFltSearch, aColSearch);

    if (typeof aResult !== 'undefined' && aResult)
    {
        aResult.forEach(function (oItem)
        {
            aHolidays.push(oItem.getValue(FLD_AOH_HOLIDAY_DATE));
        });
    }


    // -------------------- MAKE TRANSPORTATION FIELDS BLANK IF RMA IS FROM AN INVOICE -----------------------------
    if (recordType == "rtnauth")
    {
        var createdFrom = nlapiGetFieldValue("createdfrom");

        if (createdFrom)
        {
            nlapiSetFieldValue("custbody_aps_stop", "");
            nlapiSetFieldValue("custbody_aps_route", "");
            nlapiSetFieldValue("custbody_acc_odoi_route_no", "");
        }
    }
    // -------------------------------------------------------------------------------------------------------------


    setShipDate(false, recordType);

}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function updateShipDateFieldChanged(type, name, linenum)
{
    if (name == 'trandate')
    {
        debugger;
        var recordType = nlapiGetFieldValue('type');

        debugger;

        if (recordType == 'rtnauth')
        {
            setShipDate(false, recordType);
        }
        else
        {
            setShipDate(true, recordType);
        }

    }
}

function setShipDate(bPopup, type)
{
    debugger;
    var sDate, sNextBusinessDate, dDate;
    var dCurrentDate = getCurrentDateTime();
    var nCurrentDateMinute = (dCurrentDate.getHours() * 60) + dCurrentDate.getMinutes();
    var nCutOffMinute, aCutOffMinute;

    if (nlapiGetFieldValue('trandate'))
    {
        sDate = nlapiGetFieldValue('trandate');
        dDate = nlapiStringToDate(sDate);

        /*
        if(aHolidays.indexOf(sDate) >= 0 || dDate.getDay() == 6 || dDate.getDay() == 0) {
            sDate = getNextBusinessDay(sDate);
        } else {
            if(sDate == nlapiDateToString(dCurrentDate)) {
                aCutOffMinute = HC_ORDER_CUT_OFF.split(':');
                nCutOffMinute = (parseInt(aCutOffMinute[0])*60)+parseInt(aCutOffMinute[1]);

                if(nCurrentDateMinute > nCutOffMinute) {
                    sDate = getNextBusinessDay(sDate);
                }
            }
        }
        */

        sNextBusinessDate = getNextBusinessDay(sDate);

        if (bPopup)
        {
            if (confirm('Do you want to change the ship date to ' + sNextBusinessDate + '?'))
            {
                nlapiSetFieldValue('shipdate', sNextBusinessDate);
                nlapiSetFieldValue('startdate', sNextBusinessDate);
            }
        } else
        {
           if (type == 'rtnauth') {
               nlapiSetFieldValue('custbody_acc_acme_release_date', sNextBusinessDate);
           }else{
             if(!nlapiGetFieldValue("startdate")){
                 nlapiSetFieldValue('startdate', sNextBusinessDate)
             }
           }
          
         //   (type != 'rtnauth' && !nlapiGetFieldValue("custbody_sdb_ship_date_back_up") || nlapiGetFieldValue("startdate")!= "") ? nlapiSetFieldValue('startdate', sNextBusinessDate) : nlapiSetFieldValue('custbody_acc_acme_release_date', sNextBusinessDate);
        }
    }
}

function getNextBusinessDay(sDate)
{
    var dDate = nlapiStringToDate(sDate);
    var sReturn;

    do
    {
        dDate.setDate(dDate.getDate() + 1);
        sReturn = nlapiDateToString(dDate);
    } while (aHolidays.indexOf(sReturn) >= 0 || dDate.getDay() == 6 || dDate.getDay() == 0);

    return sReturn;
}

function getCurrentDateTime()
{
    var dDate = new Date();
    return new Date((typeof dDate === 'string' ? new Date(dDate) : dDate).toLocaleString('en-US', { timeZone: HC_ACCOUNT_TIMEZONE }));
}