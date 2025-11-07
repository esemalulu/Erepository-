/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/record', 'N/currentRecord', 'N/search' , 'N/runtime', 'N/format'], function(record, currentRecord, search, runtime, format) {
//function validateLine(context) {
function fieldChanged(context) {
  var rec = context.currentRecord;
  var stSublistName = context.sublistId;
  if(stSublistName == 'timeitem' && (context.fieldId == 'hours0' || context.fieldId == 'hours1' || context.fieldId == 'hours2' || context.fieldId == 'hours3' || context.fieldId == 'hours4' || context.fieldId == 'hours5' || context.fieldId == 'hours6')) {
    debugger;
    log.debug('here')
    var weekOfValue = context.currentRecord.getValue({fieldId: 'trandate'});
  //if (stSublistName == 'timeitem' && weekOfValue) {
    var user = runtime.getCurrentUser();
    var workCalendarValue = search.lookupFields({
                        type: search.Type.EMPLOYEE,
                        id: user.id,
                        columns: ['workcalendar']
                    });
    if (workCalendarValue.workcalendar[0]) {
        var calendarID = workCalendarValue.workcalendar[0].value;
    }
    log.debug('calendarID', calendarID)
    var calendarEnd = new Date(weekOfValue);
    calendarEnd.setDate(calendarEnd.getDate() + 6);
    var formattedweekOfValue = format.format({
        value: weekOfValue,
        type: format.Type.DATE
    });
    var formattedcalendarEnd = format.format({
        value: calendarEnd,
        type: format.Type.DATE
    });
    log.debug(formattedweekOfValue , formattedcalendarEnd)
    var workcalendarSearchObj = search.create({
       type: "workcalendar",
       filters:
       [
            ["exceptiondate","within",formattedweekOfValue,formattedcalendarEnd],
            "AND",
            ["internalid","anyof",calendarID]
       ],
       columns:
       [
          search.createColumn({name: "name", label: "Name"}),
          search.createColumn({name: "comments", label: "Comments"}),
          search.createColumn({name: "workhoursperday", label: "Work Hours Per Day"}),
          search.createColumn({name: "sunday", label: "Sunday"}),
          search.createColumn({name: "monday", label: "Monday"}),
          search.createColumn({name: "tuesday", label: "Tuesday"}),
          search.createColumn({name: "wednesday", label: "Wednesday"}),
          search.createColumn({name: "thursday", label: "Thursday"}),
          search.createColumn({name: "friday", label: "Friday"}),
          search.createColumn({name: "saturday", label: "Saturday"}),
          search.createColumn({name: "exceptiondate", label: "Exception Date"})
       ]
    }).run().getRange(0,1000);
    log.debug(workcalendarSearchObj.length)
    if (workcalendarSearchObj.length > 0) {
        var currentDate, daystoAdd;
        switch (context.fieldId) { // Compare item type to its record type counterpart
            case 'hours0':
              daystoAdd = 0;
              break;
            case 'hours1':
              daystoAdd = 1;
              break;
            case 'hours2':
              daystoAdd = 2;
              break;
            case 'hours3':
              daystoAdd = 3;
              break;
            case 'hours4':
              daystoAdd = 4;
              break;
            case 'hours5':
              daystoAdd = 5;
              break;
            case 'hours6':
              daystoAdd = 6;
              break;
            default:
              recordType = 'item';
          }
        currentDate = new Date(weekOfValue);
        currentDate.setDate(currentDate.getDate() + daystoAdd);
        var formattedValueToCheck = format.format({
            value: currentDate,
            type: format.Type.DATE
        });
        log.debug('formattedValueToCheck', formattedValueToCheck)
        for (var i = 0; i < workcalendarSearchObj.length; i++){
            if (workcalendarSearchObj[0].getValue('exceptiondate') == formattedValueToCheck) {
                alert('Please note that the date ' + formattedValueToCheck + ' is entered as a holiday on your current work calendar. Please review to ensure that this time entry is correct.')
            }
        }
    }
    // var qtyGet = rec.getCurrentSublistValue(stSublistName, 'adjustqtyby');
    // var boxDivGet = rec.getCurrentSublistValue(stSublistName, 'custcol_uf_box_div_number');
    // if (parseFloat(qtyGet) % parseFloat(boxDivGet) !== 0) {
    //     alert('The Adjustment Quantity is not divisible by the Box Div Number');
    //     return false;
    // }
  }
return true;
}
    return {
        //validateLine: validateLine
        fieldChanged: fieldChanged
    };
});