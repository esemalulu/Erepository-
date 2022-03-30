/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/record'],

function(widget, record, message) {

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
        var custRecId = context.request.parameters['custpage_custid'];
        var recordToBeMerged = context.request.parameters['custpage_mergerec'];

        log.debug('MASTER RECORD', custRecId);
        log.debug('RECORD TO BE MERGED', recordToBeMerged);

        var form = widget.createForm({
            title : 'Administrate Merge Record Processor',
            hideNavBar : false
        });
        form.clientScriptFileId = 5817665;

        form.addButton({
            id: 'custpage_mergerecords',
            label: 'Merge Records',
            functionName : 'setMaster'
        });

        var masterRecord = form.addField({
            id : 'custpage_masterrec',
            label : 'Master Record',
            type : widget.FieldType.SELECT,
            source : 'customer'
        });
        masterRecord.defaultValue = custRecId;

        var mergeRecord = form.addField({
            id : 'custpage_mergerec',
            label : 'Record to be Merged',
            type : widget.FieldType.SELECT,
            source : 'customer'
        });
        mergeRecord.isMandatory = true;


        if(context.request.method === 'POST')
        {
            /*var val = context.request.parameters['entryformquerystring'];
            var values = val.split('=');
            log.debug('VALUES', JSON.stringify(values));

            var i1 = val.search('&custpage_custid=');
            var mRec = context.request.parameters['custpage_mergerec'];
            log.debug('VALUE', val);
            log.debug('MASTER RECORD', mRec);
            log.debug('I', i1);
            //var newRec =*/

            var masterRecord = context.request.parameters['custpage_custid'];
            var recToBeMerged = context.request.parameters['custpage_mergerec'];

            log.DEBUG('MASTER RECORD', masterRecord);
            log.debug('RECORD TO BE MERGED', recToBeMerged);

        }




        context.response.writePage(form);

    }

    return {
        onRequest: onRequest
    };

});
