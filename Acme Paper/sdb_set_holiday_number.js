/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function getInputData() {
        return search.create({
            type: "customrecord_sdb_holiday_dates",
            filters: [],
            columns: []
        });
    }

    function map(context) {
        try {
            var contextValues = JSON.parse(context.value);
            var recId = contextValues.id
            var currentDate = new Date(getFormatDate(new Date));
            var nextBusinessDate = getNextBusinessDayNew(new Date());
            var days = nextBusinessDate.getTime() - currentDate.getTime();
            days = days / 1000 / 60 / 60 / 24;
            log.debug('DATE DATA: ', { recId, currentDate, nextBusinessDate, days });
            record.submitFields({
                type: "customrecord_sdb_holiday_dates",
                id: recId,
                values: {
                    custrecord_sdb_holiday_str: days
                }
            });
        } catch (e) {
            log.error('error at map', e)
        }
    }

    function getNextBusinessDayNew(sDate) {
        var aHolidays = loadHolidaysPageInit();
        var dDate = new Date(sDate);
        var sReturn;
        do {
            dDate.setDate(dDate.getDate() + 1);
            sReturn = dDate;
            sReturn = getFormatDate(sReturn)
        } while (aHolidays.indexOf(sReturn) >= 0 || dDate.getDay() == 6 || dDate.getDay() == 0);

        return new Date(sReturn);
    }

    function loadHolidaysPageInit() {
        var aHolidays = [];
        var holidays = search.create({
            type: "customrecord_acme_official_holidays",
            filters:
                [],
            columns:
                ['custrecord_aoh_holiday_date']
        });
        holidays.run().each(function (result) {
            aHolidays.push(result.getValue('custrecord_aoh_holiday_date'));
            return true;
        });
        return aHolidays;
    }

    function getFormatDate(d) {
        return [d.getMonth() + 1 < 10 ? "0" + (d.getMonth() + 1) : d.getMonth(),
        d.getDate() < 10 ? "0" + d.getDate() : d.getDate(),
        d.getFullYear()].join('/')
    }

    return {
        getInputData: getInputData,
        map: map
    }
});
