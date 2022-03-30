/**
 *@NApiVersion 2.x
 */
define([
  'SuiteScripts/underscore.js',
  'SuiteScripts/moment.js',
  'SuiteScripts/dundee_stage_report_lib.js',
  'N/render',
  'N/file',
  'N/xml',
  'N/config',
  'N/search'
],
function(_, moment, lib, render, file, xml, config, search) {

  function Block1DataSource(data) {
    var obj = {}

    // get all of the reps
    var numByRep = _.groupBy(data, function(customer) { return customer.salesrep.id }),
        employeeList = lib.GetEmployeeList(),
        statusList = lib.GetStatusList(),
        leadStatusList = _.filter(statusList, function(status) { return status.stage == 'Lead' }).map(function(status) { return status.id }),
        customerStatusList = _.filter(statusList, function(status) { return status.stage == 'Customer' }).map(function(status) { return status.id })

    obj.salesreps = _.sortBy(Object.keys(numByRep).map(function(repid) {
      return {
        name: employeeList[repid],
        leads: _.filter(numByRep[repid], function(customer) { return leadStatusList.indexOf(customer.status.id) > -1 }).length,
        customers: _.filter(numByRep[repid], function(customer) { return customerStatusList.indexOf(customer.status.id) > -1 }).length
      }
    }), function(rep) { return rep.name })

    return {
      alias: 'data',
      format: render.DataSource.JSON,
      data: JSON.stringify(obj)
    }
  }

  function Block2DataSource(data) {
    var obj = {}

    // get the status list
    var statusList = lib.GetStatusList(null, true),
        leadStatusList = _.filter(statusList, function(status) { return status.stage == 'Lead' }),
        leadStatusIDList = leadStatusList.map(function(status) { return status.id }),
        customerStatusList = _.filter(statusList, function(status) { return status.stage == 'Customer' }),
        customerStatusIDList = customerStatusList.map(function(status) { return status.id }),
        EMPLIST = lib.GetEmployeeList()

    // build the leads data
    obj.leadsHeader = leadStatusList
    // get the list of employees to write the page for based upon the data
    var repslist = _.groupBy(_.filter(data, function(customer) { return leadStatusIDList.indexOf(customer.status.id) > -1 }), function(customer) { return customer.salesrep.id })
    obj.leadsRepList = _.sortBy(Object.keys(repslist).map(function(repid) {
      // now need to calculate the totals by statusid
      var numByStatus = _.groupBy(repslist[repid], function(customer) { return customer.status.id }),
          statusResult = {}
      Object.keys(numByStatus).map(function(statusid) {
        statusResult[statusid] = numByStatus[statusid].length
      })
      return {
        id: repid, name: EMPLIST[repid], status: (function(statuslist) {
          return statuslist.map(function(status) {
            return {
              statusid: status.id,
              count: statusResult[status.id] || 0
            }
          })
        })(leadStatusList)
      }
    }), function(employee) { return employee.name })
    var countByStatus = _.groupBy(data, function(customer) { return customer.status.id })
    obj.leadTotalsByStatus = leadStatusList.map(function(status) {
      return {
        id:     status.id, count: countByStatus[status.id] ? countByStatus[status.id].length : 0
      }
    })

    // build the customer data
    obj.customersHeader = customerStatusList
    // get the list of employees to write the page for based upon the data
    var repslist = _.groupBy(_.filter(data, function(customer) { return customerStatusIDList.indexOf(customer.status.id) > -1 }), function(customer) { return customer.salesrep.id })
    obj.customersRepList = _.sortBy(Object.keys(repslist).map(function(repid) {
      // now need to calculate the totals by statusid
      var numByStatus = _.groupBy(repslist[repid], function(customer) { return customer.status.id }),
          statusResult = {}
      Object.keys(numByStatus).map(function(statusid) {
        statusResult[statusid] = numByStatus[statusid].length
      })
      return {
        id: repid, name: EMPLIST[repid], status: (function(statuslist) {
          return statuslist.map(function(status) {
            return {
              statusid: status.id,
              count: statusResult[status.id] || 0
            }
          })
        })(customerStatusList)
      }
    }), function(employee) { return employee.name })
    obj.customerTotalsByStatus = customerStatusList.map(function(status) {
      return {
        id:     status.id, count: countByStatus[status.id] ? countByStatus[status.id].length : 0
      }
    })

    // pass back ready for drawing
    return {
      alias: 'data',
      format: render.DataSource.JSON,
      data: JSON.stringify(obj)
    }
  }

  function Block3DataSource(data) {
    var obj = {},
        statusList = lib.GetStatusList(null, true),
        ACTIONLIST = lib.GetActionList()

    // for each of the status', process the data
    obj.statuslist = statusList.map(function(status) {
      // collect the sales reps for this status
      var statusData = _.filter(data, function(customer) { return customer.status.id == status.id })
          EMPLIST = lib.GetEmployeeList(),
          salesReps = _.sortBy((function(data) { // now have the data only for this status
            var groupedBySalesRep = _.groupBy(data, function(customer) { return customer.salesrep.id })
            return Object.keys(groupedBySalesRep).map(function(repid) { // now into single salesrep for single status
              var groupedActions = _.groupBy(groupedBySalesRep[repid], function(customer) { return customer.lastaction.id })
              return {
                id: repid,
                name: EMPLIST[repid],
                actions:  _.sortBy((function() {
                  return Object.keys(groupedActions).map(function(actionid) {
                    return {
                      id: actionid, name: ACTIONLIST[actionid], count: groupedActions[actionid].length
                    }
                  })
                })(), function(action) { return action.name } )
              }
            })
          })(statusData), function(salesrep) { return salesrep.name })

      return {
        id:     status.id, name: status.name, salesreps: salesReps
      }
    })

    // pass back ready for drawing
    return {
      alias: 'data',
      format: render.DataSource.JSON,
      data: JSON.stringify(obj)
    }
  }

  function CollectData(context, options) {
    var data = lib.BuildData(context)
    if (options.salesrep != 'all')
      data = _.filter(data, function(customer) { return customer.salesrep.id == options.salesrep })
    return data
  }

  function runReport(context, options) {
    var renderer = render.create(),
        data = CollectData(context, options),
        block1Renderer = render.create(),
        block2Renderer = render.create(),
        block3Renderer = render.create()

    // build each of the pages in turn, finally submitting to the PDF generation process
    block1Renderer.templateContent = file.load({ id: 181 }).getContents()
    block1Renderer.addCustomDataSource(Block1DataSource(data))
    block2Renderer.templateContent = file.load({ id: 182 }).getContents()
    block2Renderer.addCustomDataSource(Block2DataSource(data))
    block3Renderer.templateContent = file.load({ id: 189 }).getContents()
    block3Renderer.addCustomDataSource(Block3DataSource(data))

    //finally build the overview document, start by building the title
    var formTitle = []
    if (context.request.parameters.historical != 'now') {
      var HistoricalDate = search.lookupFields({
        type: 'customrecord_dd_historical_reports', id: context.request.parameters.historical, columns: ['custrecord_dd_reporthistory_date']
      })
      formTitle.push('SnapShot Taken - '+HistoricalDate.custrecord_dd_reporthistory_date)
      var fileName = 'Sales Report - '+formTitle.join()
    } else {
      formTitle.push('Sales Reports')
      var fileName = formTitle.join()+' - '+moment().format('MMMM Do YYYY')
    }

    renderer.templateContent = file.load({ id: 170 }).getContents()
    renderer.addCustomDataSource({
      alias: 'data',
      format: render.DataSource.JSON,
      data: JSON.stringify({
        styles:         file.load({ id: 171 }).getContents(),
        companyname:    config.load({
          type: config.Type.COMPANY_INFORMATION
        }).getText({
          fieldId: 'companyname'
        }),
        reportname:     xml.escape({ xmlText: formTitle.join(' - ') }),
        reportdate:     moment().format('MMMM Do, YYYY'),
        logo:           xml.escape({ xmlText: file.load({ id: 10 }).url }),
        fonts: {
          normal:       xml.escape({ xmlText: file.load({ id: 177 }).url }),
          italic:       xml.escape({ xmlText: file.load({ id: 174 }).url }),
          bold:         xml.escape({ xmlText: file.load({ id: 172 }).url }),
          bolditalic:   xml.escape({ xmlText: file.load({ id: 173 }).url }),
          light:        xml.escape({ xmlText: file.load({ id: 175 }).url }),
          lightitalic:  xml.escape({ xmlText: file.load({ id: 176 }).url })
        },
        blocks: {
          block1:       block1Renderer.renderAsString(),
          block2:       block2Renderer.renderAsString(),
          block3:       block3Renderer.renderAsString()
        }
      })
    })
    var pdfFile = renderer.renderAsPdf()
    pdfFile.name = fileName+'.pdf'

    // submit to the pdf generation process

    return context.response.writeFile({
      file: pdfFile, isInline: true
    })
  }

  return {
    runReport: runReport
  }

})
