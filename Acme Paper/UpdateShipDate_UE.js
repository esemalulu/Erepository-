var REC_ACME_OFFICIAL_HOLIDAYS = 'customrecord_acme_official_holidays';
var FLD_AOH_HOLIDAY_DATE = 'custrecord_aoh_holiday_date';
var HC_ACCOUNT_TIMEZONE = 'America/Toronto';
var HC_ORDER_CUT_OFF = '18:15';//'16:15';
var HC_HOUR_DIFF_NY_CA = 3;

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function updateShipDateBeforeSubmit(type)
{
    var aColSearch = [];
    var aFltSearch = [];
    var aResult;
    var aHolidays = [];

    if (type != 'create') return;

    nlapiLogExecution('debug', 'CREATE', 'CREATE RUNNING');

    aColSearch.push(new nlobjSearchColumn(FLD_AOH_HOLIDAY_DATE));

    aResult = nlapiSearchRecord(REC_ACME_OFFICIAL_HOLIDAYS, null, aFltSearch, aColSearch);

    nlapiLogExecution('debug', 'aResult', aResult);

    if (typeof aResult !== 'undefined' && aResult)
    {
        aResult.forEach(function (oItem)
        {
            nlapiLogExecution('debug', 'Field holiday date', oItem.getValue(FLD_AOH_HOLIDAY_DATE));

            aHolidays.push(oItem.getValue(FLD_AOH_HOLIDAY_DATE));
        });
    }

    setShipDate(aHolidays);

}


function setShipDate(aHolidays)
{
    nlapiLogExecution('debug', 'aHolidays', aHolidays);
    var sDate, sNextBusinessDate, dDate, startDate;
    var dCurrentDate = getCurrentDateTime();
    var nCurrentDateMinute = (dCurrentDate.getHours() * 60) + dCurrentDate.getMinutes();
    var nCutOffMinute, aCutOffMinute;

    if (nlapiGetFieldValue('trandate'))
    {
        sDate = nlapiGetFieldValue('trandate');
        dDate = nlapiStringToDate(sDate);

        // Check if startdate is future than bussiness day then the script will return and no nothing
        startDate = nlapiGetFieldValue('startdate');
        nlapiLogExecution("debug", "StartDate", startDate);

        var bussinessDay = getNextBusinessDay(sDate, aHolidays);
        nlapiLogExecution("debug", "bussinessDay", bussinessDay);


        if(new Date(startDate) > new Date(bussinessDay)) return; 

        if (aHolidays.indexOf(sDate) >= 0 || dDate.getDay() == 6 || dDate.getDay() == 0)
        {
            sDate = getNextBusinessDay(sDate, aHolidays);
        } else
        {
            //if(sDate == nlapiDateToString(dCurrentDate)) 
            {
                aCutOffMinute = HC_ORDER_CUT_OFF.split(':');
                nCutOffMinute = (parseInt(aCutOffMinute[0]) * 60) + parseInt(aCutOffMinute[1]);

                if (nCurrentDateMinute > nCutOffMinute)
                {
                    sDate = getNextBusinessDay(sDate, aHolidays);
                }
            }
        }

        sNextBusinessDate = getNextBusinessDay(sDate, aHolidays);
        nlapiSetFieldValue('shipdate', sNextBusinessDate);
        nlapiSetFieldValue('startdate', sNextBusinessDate);
        if (!nlapiGetFieldValue('startdate')) {
             nlapiSetFieldValue('startdate', sNextBusinessDate);
        }
       // 
    }
}//End setShipDate

function getNextBusinessDay(sDate, aHolidays)
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
    //return new Date(dDate.toLocaleString('en-US', {timeZone: HC_ACCOUNT_TIMEZONE}));
    return new Date(dDate.setTime(dDate.getTime() + (HC_HOUR_DIFF_NY_CA * 60 * 60 * 1000)));
}