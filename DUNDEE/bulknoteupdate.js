/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(
  ['N/search', 'N/record', 'N/log', 'N/runtime'],
function(search, record, log, runtime) {

  function RunReconnectLastAction(customerid) {
    if (!customerid) return
    var lastAction = null, lastActionID = null
    search.create({
      type: 'note',
      filters: [
        ['customer.internalid', 'anyof', customerid]
      ],
      columns: [
        search.createColumn({ name: 'notedate', sort: search.Sort.DESC }),
        search.createColumn({ name: 'custrecord2' })
      ]
    }).run().each(function(note) {
      if (note.getValue({ name: 'custrecord2' })) {
        lastAction = note.getValue({ name: 'custrecord2' })
        lastActionID = note.id
      }
    })
    record.submitFields({
      type: 'customer', id: customerid, values: {
        custentity_dd_mostrecentaction: lastAction || '',
        custentity_dd_mostrecentnote: lastActionID || ''
      }, options: {
        enablesourcing: false, ignoreMandatoryFields: true
      }
    })
  }

  function execute(context) {
    log.debug("Collecting Data")
    var customerPageData =  search.load({ id: 73 }).runPaged({
                              pageSize: 1000
                            }),
                            customerData = []
    customerPageData.pageRanges.forEach(function(pageRange) {
      customerPageData.fetch({ index: pageRange.index }).data.forEach(function(result) {
        log.debug("Working on Number (ID: "+result.id+"): "+runtime.getCurrentScript().getRemainingUsage(), pageRange.index)
        RunReconnectLastAction(result.id)
      })
    })

  }

  return { execute: execute }
})
