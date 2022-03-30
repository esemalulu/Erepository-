/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'],

function(search, record) {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext)
    {
        var seatRecord = record.load({ type : 'customrecord_trgseat', id : scriptContext.newRecord.id});
        var title      = seatRecord.getText({ fieldId : 'custrecord_seat_event' });

        if(title)
        {
            var sf = [
                        ["custrecord_seat_event.title","startswith", title],
                        "AND",
                        ["custrecord_seat_status","anyof","2","3","4","5"]
                    ];

            var sc = [
                        search.createColumn({"name":"name","label":"ID","type":"text","sortdir":"ASC"}),
                        search.createColumn({"name":"custrecord_seat_customer","label":"Company","type":"select","sortdir":"NONE"}),
                        search.createColumn({"name":"custrecord_seat_attendee","label":"Seat Attendee","type":"select","sortdir":"NONE"}),
                        search.createColumn({"name":"custrecord_seat_event","label":"Event","type":"select","sortdir":"NONE"}),
                        search.createColumn({"name":"custrecord_seat_status","label":"Status","type":"select","sortdir":"NONE"})
                    ];

            var eventSearch = search.create({
                type : 'customrecord_trgseat',
                filters : sf,
                columns : sc
            });

            var eventSearchRS = eventSearch.run().getRange({start : 0, end : 1000});
            if(eventSearchRS)
            {
                for(var i  = 0; i < eventSearchRS.length; i+=1)
                {
                    var eventId = eventSearchRS[i].getValue({ name : 'custrecord_seat_event'});
                    var eventRecord = record.load({ type : record.Type.CALENDAR_EVENT, id : eventId});
                    var maxSeats    = eventRecord.getValue({ fieldId : 'custevent_max_attendees'});
                    var numOfSeats  = eventSearchRS.length;
                    var seatsRemaining = maxSeats - numOfSeats;
                    eventRecord.setValue({ fieldId : 'custevent_training_seatsremaining', value : seatsRemaining});
                    eventRecord.save();
                }
            }
        }
    }

    return {
        afterSubmit: afterSubmit
    };

});
