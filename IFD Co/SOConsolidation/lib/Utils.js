define([
    'N/format'
], function Utils(
    nFormat
) {
    return {
        normalizeOtherRefNum: function normalizeOtherRefNum(val) {
            var otherRefNo = (val || '') + '';
            var lowerOtherRefNo = otherRefNo.toLowerCase();
            if (lowerOtherRefNo === '- none -') {
                return '';
            }
            return lowerOtherRefNo;
        },
        getRangeFilter: function getRangeFilter() {
            var filter;
            var dateFromObj = new Date();
            var dateToObj = new Date();
            var dayOfWeek = dateFromObj.getDay();
            var dayRangeFrom = 1;
            var dayRangeTo = 1;
            var dateFromStr;
            var dateToStr;

            if (dayOfWeek === 5) { // friday - sunday
                dayRangeTo += 2;
            }
            if (dayOfWeek === 6) { // saturday - sunday
                dayRangeTo += 1;
            }

            dateFromObj.setDate(dateFromObj.getDate() + dayRangeFrom);
            dateToObj.setDate(dateToObj.getDate() + dayRangeTo);

            dateFromStr = nFormat.format({ value: dateFromObj, type: nFormat.Type.DATE }).split(' ')[0];
            dateToStr = nFormat.format({ value: dateToObj, type: nFormat.Type.DATE }).split(' ')[0];

            if (dayRangeFrom !== dayRangeTo) {
                filter = [
                    'shipdate',
                    'within',
                    dateFromStr,
                    dateToStr
                ];
            } else {
                filter = [
                    'shipdate',
                    'on',
                    dateFromStr
                ];
            }
            return filter;
        }
    };
});
