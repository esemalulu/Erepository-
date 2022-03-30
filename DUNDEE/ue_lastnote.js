/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(
  ['N/search', 'N/record', 'N/runtime'],
function(search, record, runtime) {

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

  function afterSubmit(context) {
    if (context.type !== context.UserEventType.CREATE &&
      context.type !== context.UserEventType.EDIT &&
      context.type !== context.UserEventType.DELETE &&
      context.type !== context.UserEventType.XEDIT) {
      return
    }

    if (context.type == context.UserEventType.DELETE)
      RunReconnectLastAction(context.oldRecord.getValue({ fieldId: 'entity' }))
    else RunReconnectLastAction(context.newRecord.getValue({ fieldId: 'entity' }))

  }

  return {
    afterSubmit: afterSubmit
  }

})
