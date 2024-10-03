/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
*/
define(['N/search'], function (search) {
    function beforeSubmit(context) {
        try {
            if (context.type == context.UserEventType.CREATE) {
                setTranDate(context);
                setShippingDate(context)
            }
        } catch (error) {
            log.error("ERROR", error);
        }
    }

    function setShippingDate(context) {
        var newRecord = context.newRecord;
      var isDropship = newRecord.getValue('custbody_dropship_order');
        if (!newRecord.getValue("createdfrom") || isDropship) return;
        var trandate = new Date(newRecord.getValue("trandate"));
        var shipDate = new Date(newRecord.getValue("startdate"));
        newRecord.setValue("shipdate", shipDate);
        // log.debug('DATE setShippingDate: ', { trandate, shipDate, shipParse: Date.parse(shipDate), tranParse: Date.parse(trandate), validation: Date.parse(shipDate) > Date.parse(trandate) });
        // if (Date.parse(shipDate) > Date.parse(trandate)) return;
        newRecord.setValue("trandate", shipDate);
    }

    function setTranDate(context) {
        var newRecord = context.newRecord;
        var shipDate = newRecord.getValue({
            fieldId: 'shipdate'
        });
        var currentBusinessDate = getNextBusinessDayNew(new Date());
        var nextBusinessDate = getNextBusinessDayNew(new Date(shipDate));

        log.debug('DATE DATA: ', { currentBusinessDate, nextBusinessDate });

        if (String(currentBusinessDate) != String(nextBusinessDate)) return;

        newRecord.setValue({
            fieldId: 'trandate',
            value: new Date(shipDate)
        });
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
        return [d.getMonth() + 1 < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1),
        d.getDate() < 10 ? "0" + d.getDate() : d.getDate(),
        d.getFullYear()].join('/')
    }

    return {
        beforeSubmit: beforeSubmit,
    }
});
