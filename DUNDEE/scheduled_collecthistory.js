/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(
  ['N/search', 'N/record', 'N/log', 'N/runtime'],
function(search, record, log, runtime) {

  function GetStatusList(context) {
    var statusList = []
    search.create({
      type: 'customrecord_dundee_stages_stsorder',
      filters: [
        ['isinactive', 'is', 'F'], 'and',
        ['custrecord_dd_stagereport_order', 'greaterthan', 0]
      ],
      columns: [
        search.createColumn({
          name: 'custrecord_dd_stagereport_stage'
        }),
        search.createColumn({
          name: 'custrecord_dd_stagereport_order', sort: search.Sort.ASC
        }),
        search.createColumn({
          name: 'custrecord_dd_stagereport_type'
        })
      ]
    }).run().each(function(result) {
      statusList.push({
        id:   result.getValue({ name: 'custrecord_dd_stagereport_stage' }),
        name: result.getText({ name: 'custrecord_dd_stagereport_stage' }),
        stage: result.getText({ name: 'custrecord_dd_stagereport_type' })
      })
      return true
    })
    return statusList
  }

  /*
   * Builds the Data Object and responds as JSON data
   */
  function BuildData(context) {

    // multiple stage collection, first build an array of the total customers and segment by salesrep
    var customerSearch = search.load({
          id: runtime.getCurrentScript().getParameter({
            name: 'custscript_dundee_stagesrep_fromss'
          })
        })
    customerSearch.filterExpression = [
      ['isinactive', 'is', 'F'], 'and',
      ['isjob', 'is', 'F'], 'and',
      ['entitystatus', 'anyof', GetStatusList(context).map(function(status) { return status.id } )]
    ]

    // add a filter based upon the role
    if (runtime.getCurrentUser().role == '1002')
      customerSearch.filterExpression = customerSearch.filterExpression.concat(['and', ['salesrep', 'anyof', runtime.getCurrentUser().id]])

    var customerPageData =  customerSearch.runPaged({
                              pageSize: 1000
                            }),
                            customerData = []
    // run the search to start collecting data
    customerPageData.pageRanges.forEach(function(pageRange) {
      customerPageData.fetch({ index: pageRange.index }).data.forEach(function(result) {
        customerData.push({
          customer: {
            id:   result.id,
            name: result.getValue({ name: 'altName' })
          },
          salesrep: {
            id:   result.getValue({ name: 'salesrep' }),
            name: result.getText({ name: 'salesrep' })
          },
          status: {
            id:   result.getValue({ name: 'entitystatus' }),
            name: result.getText({ name: 'entitystatus' })
          },
          lastaction: {
            id:   result.getValue({ name: 'custentity_dd_mostrecentaction' }),
            name: result.getText({ name: 'custentity_dd_mostrecentaction' })
          }
        })
      })
    })
    return customerData

  }


  function execute(context) {
    log.audit("Running Data Collection")

    // create a new record, first search for an existing record
    var historyRecord = null
    search.create({
      type: 'customrecord_dd_historical_reports',
      filters: [
        ['isinactive', 'is', 'F'], 'and',
        ['custrecord_dd_reporthistory_date', 'on', 'today']
      ]
    }).run().each(function(result) {
      historyRecord = result.id
    })
    // if we found a record, update it with the content
    if (historyRecord) {
      var rec = record.load({
        type: 'customrecord_dd_historical_reports', id: historyRecord
      })
    } else {
      var rec = record.create({
        type: 'customrecord_dd_historical_reports'
      })
      rec.setValue({
        fieldId: 'custrecord_dd_reporthistory_date', value: new Date()
      })
    }
    rec.setValue({
      fieldId: 'custrecord_dd_reporthistory_data', value: JSON.stringify(BuildData(context))
    })
    rec.save({
      enableSourcing: false, ignoreMandatoryFields: true
    })
    log.audit("--> DONE")

  }

  return { execute: execute }
})
