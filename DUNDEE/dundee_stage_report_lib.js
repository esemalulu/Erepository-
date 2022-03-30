/**
 *@NApiVersion 2.x
 */
define([
 'SuiteScripts/underscore.js',
 'N/search',
 'N/runtime'
],
function(_, search, runtime) {

  var THOMAS_PRESTNEY_ID = "10",
      DEFAULT_DATA_COLLECTION_SEARCH = "73",
      DEFAULT_APPROXVALUE_PERUNIT = 200000.00

  function GetActionList(context) {
    var actionList = {}
    search.create({
      type: 'customlist5', columns: [ search.createColumn({ name: 'name' }) ]
    }).run().each(function(action) {
      actionList[action.id] = action.getValue({ name: 'name' })
      return true
    })
    return actionList
  }

  function GetActionListForSelect(context) {
    var actionList = []
    search.create({
      type: 'customlist5', columns: [ search.createColumn({ name: 'name' }) ]
    }).run().each(function(action) {
      actionList.push({
        id:   action.id,
        name: action.getValue({ name: 'name' })
      })
      return true
    })
    return actionList
  }

  function GetEmployeeList(context) {
    var employeeList = {}
    search.create({
      type: 'employee',
      columns: [
        search.createColumn({ name: 'firstname' }),
        search.createColumn({ name: 'lastname' })
      ]
    }).run().each(function(employee) {
      employeeList[employee.id] = [employee.getValue({ name: 'firstname' }), employee.getValue({ name: 'lastname' })].join(' ')
      return true
    })
    return employeeList
  }

  function GetTeamList(context) {
    var TNAME = search.lookupFields({
          type: 'employee', id: THOMAS_PRESTNEY_ID, columns: ['firstname', 'lastname']
        })
    return [
      {
        id: "organic",
        name: "Organic",
        list: (function() {
          var employeeList = []
          search.create({
            type: 'employee',
            filters: [
              ['salesrep', 'is', 'T'], 'and',
              ['isinactive', 'is', 'F'], 'and',
              ['supervisor', 'noneof', THOMAS_PRESTNEY_ID], 'and',
              ['internalid', 'noneof', THOMAS_PRESTNEY_ID]
            ],
            columns: [
              search.createColumn({ name: 'firstname' }),
              search.createColumn({ name: 'lastname' })
            ]
          }).run().each(function(employee) {
            employeeList.push(employee.id)
            return true
          })
          return employeeList
        })()
      },
      {
        id: THOMAS_PRESTNEY_ID,
        name: [TNAME.firstname, TNAME.lastname].join(" "),
        list: (function() {
          var employeeList = []
          search.create({
            type: 'employee',
            filters: [
              ['salesrep', 'is', 'T'], 'and',
              ['isinactive', 'is', 'F'], 'and',
              [
                ['supervisor', 'anyof', THOMAS_PRESTNEY_ID], 'or',
                ['internalid', 'anyof', THOMAS_PRESTNEY_ID]
              ]
            ],
            columns: [
              search.createColumn({ name: 'firstname' }),
              search.createColumn({ name: 'lastname' })
            ]
          }).run().each(function(employee) {
            employeeList.push(employee.id)
            return true
          })
          return employeeList
        })()
      }
    ]
  }

  function GetStatusList(context, pdfversion) {
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
        }),
        search.createColumn({
          name: 'custrecord_dd_stagereport_nameoverride'
        }),
        search.createColumn({
          name: 'custrecord_dd_stagereport_color'
        })
      ]
    }).run().each(function(result) {
      statusList.push({
        id:     result.getValue({ name: 'custrecord_dd_stagereport_stage' }),
        name:   pdfversion ? result.getValue({ name: 'custrecord_dd_stagereport_nameoverride' }) : result.getText({ name: 'custrecord_dd_stagereport_stage' }),
        stage:  result.getText({ name: 'custrecord_dd_stagereport_type' }),
        color:  result.getValue({ name: 'custrecord_dd_stagereport_color' })
      })
      return true
    })
    return statusList
  }

  function GetStatusListByID(context, pdfversion) {
    var statusList = {}
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
        }),
        search.createColumn({
          name: 'custrecord_dd_stagereport_nameoverride'
        }),
        search.createColumn({
          name: 'custrecord_dd_stagereport_color'
        })
      ]
    }).run().each(function(result) {
      statusList[result.getValue({ name: 'custrecord_dd_stagereport_stage' })] = {
        name:   pdfversion ? result.getValue({ name: 'custrecord_dd_stagereport_nameoverride' }) : result.getText({ name: 'custrecord_dd_stagereport_stage' }),
        stage:  result.getText({ name: 'custrecord_dd_stagereport_type' }),
        color:  result.getValue({ name: 'custrecord_dd_stagereport_color' })
      }
      return true
    })
    return statusList
  }

  function CollectHistoricalData(context, range) {

    function __FilterDataListByTeam(data, team) {
      if (!team || team == 'all') return data
      var idlist = _.filter(GetTeamList(), function(t) { return t.id == team })[0].list
      return _.filter(data, function(customer) { return idlist.indexOf(customer.salesrep.id) > -1 })
    }

    function __FilterDataListBySalesRep(data, salesrep) {
      if (!salesrep || salesrep == 'all') return data
      return _.filter(data, function(customer) { return customer.salesrep.id == salesrep })
    }

    var DD_DATA = [], DATES_IN_ORDER = []
    if (_.first(range) == 'Today') {
      DD_DATA = DD_DATA.concat(BuildData(context).map(function(element) {
        element.date = 'Today'
        return element
      }))
      DATES_IN_ORDER.push('Today')
      range = _.without(range, 'Today')
    }

    // collect all of the historical data elements
    var filters = [
      ['isinactive', 'is', 'F']
    ]
    if (range.length) {
      filters.push('and', ['internalid', 'anyof', range])
      log.debug('filters', filters)
      search.create({
        type: 'customrecord_dd_historical_reports', filters: filters, columns: [
          search.createColumn({ name: 'internalid', sort: search.Sort.DESC }), //get in reverse order
          search.createColumn({ name: 'custrecord_dd_reporthistory_date' }),
          search.createColumn({ name: 'custrecord_dd_reporthistory_data' })
        ]
      }).run().each(function(result) {
        DATES_IN_ORDER.push(result.getValue({ name: 'custrecord_dd_reporthistory_date' }))
        var d = JSON.parse(result.getValue({ name: 'custrecord_dd_reporthistory_data' }))
        d = __FilterDataListByTeam(d, context.request.parameters.team)
        d = __FilterDataListBySalesRep(d, context.request.parameters.salesrep)
        DD_DATA = DD_DATA.concat(d.map(function(element) {
          element.date = result.getValue({ name: 'custrecord_dd_reporthistory_date' })
          return element
        }))
        return true
      })
    }

    // break the data up into stages first
    var FINAL_DATA = [], EMPLOYEE_LIST = GetEmployeeList(context)
    GetStatusList(context).map(function(status) {
      var dataByStatus = {
        id:       status.id,
        name:     status.name,
        stage:    status.stage,
        data:     [],
        totals:   []
      }, stageData = _.filter(DD_DATA, function(d) {
        return d.status.id == status.id
      })
      // now from teh data filtered down by stage, group the data by employee
      var groupedByEmployee = _.groupBy(stageData, function(d) {
        return d.salesrep.id
      })
      // process each of the employees in turn
      dataByStatus.data = _.sortBy(Object.keys(groupedByEmployee).map(function(employeeid) {
        return {
          id:     employeeid,
          name:   EMPLOYEE_LIST[employeeid] || '- None -',
          dates:  DATES_IN_ORDER.map(function(date) {
            return {
              date:     date,
              amount:   _.filter(groupedByEmployee[employeeid], function(d) {
                return d.date == date
              }).length
            }
          })
        }
      }), function(employee) {
        if (employee.name == '- None -') return 'ZZZZZZZZZZZZZ'
        return employee.name
      })
      // capture the totals for easy presentation later
      dataByStatus.totals = DATES_IN_ORDER.map(function(date) {
        var datesToAdd = dataByStatus.data.map(function(res) {
          return _.find(res.dates, function(d) {
            return d.date == date
          })
        })
        return {
          date:   date,
          amount: _.reduce(datesToAdd, function(memo, num) {
            return memo + num.amount
          }, 0)
        }
      })

      FINAL_DATA.push(dataByStatus)
    })

    return {
      dates:    DATES_IN_ORDER,
      data:     FINAL_DATA
    }

  }

  /*
   * Builds the Data Object and responds as JSON data
   */
  function BuildData(context) {

    function __FilterDataListByTeam(data, team) {
      if (!team || team == 'all') return data
      var idlist = _.filter(GetTeamList(), function(t) { return t.id == team })[0].list
      return _.filter(data, function(customer) { return idlist.indexOf(customer.salesrep.id) > -1 })
    }

    function __FilterDataListBySalesRep(data, salesrep) {
      if (!salesrep || salesrep == 'all') return data
      if (salesrep != 'none')
        return _.filter(data, function(customer) { return customer.salesrep.id == salesrep })
      return _.filter(data, function(customer) { return !customer.salesrep.id })
    }

    // based upon passed parameters, figure out if we need to load from historical
    if (context.request.parameters.historical && context.request.parameters.historical != 'now') {
      var customerData = JSON.parse(search.lookupFields({
        type: 'customrecord_dd_historical_reports', id: context.request.parameters.historical,
        columns: ['custrecord_dd_reporthistory_data']
      }).custrecord_dd_reporthistory_data)
      return __FilterDataListByTeam(customerData, context.request.parameters.team)
    }

    // multiple stage collection, first build an array of the total customers and segment by salesrep
    var customerSearch = search.load({
          id: runtime.getCurrentScript().getParameter({
            name: 'custscript_dundee_stagesrep_ss'
          }) || DEFAULT_DATA_COLLECTION_SEARCH
        })
    customerSearch.filterExpression = [
      ['isinactive', 'is', 'F'], 'and',
      ['isjob', 'is', 'F'], 'and',
      ['entitystatus', 'anyof', GetStatusList(context).map(function(status) { return status.id } )]
    ]
    customerSearch.columns.push(search.createColumn({ name: 'custentity1' })) //approx number units
    customerSearch.columns.push(search.createColumn({ name: 'custentity39' })) //approx value of project

    // add a filter based upon the role
    if (runtime.getCurrentUser().role == '1002' && runtime.getCurrentUser().id != THOMAS_PRESTNEY_ID)
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
          approxvalue: (function(units, value) {
            if (value) return value
            if (!units) units = 1
            return units * runtime.getCurrentScript().getParameter({
              name: 'custscript_dundee_stagesrep_val'
            }) || DEFAULT_APPROXVALUE_PERUNIT
          })(result.getValue({ name: 'custentity1' }), result.getValue({ name: 'custentity39' })),
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
          },
          projects:   [],
          estimates:  []
        })
      })
    })

    // now for each of the customers, we need to capture data on the projects
    // var PROJECT_IDLIST = []
    // var projectPageData = search.create({
    //   type: search.Type.JOB, filters: [
    //     ['isinactive', 'is', 'F'], 'and',
    //     ['customer.internalid', 'anyof', customerData.map(function(c) {
    //       return c.customer.id
    //     })]
    //   ], columns: [
    //     search.createColumn({ name: 'internalid', join: 'customer' }),
    //     search.createColumn({ name: 'companyname' })
    //   ]
    // }).runPaged({
    //   pageSize: 1000
    // })
    // projectPageData.pageRanges.forEach(function(pageRange) {
    //   projectPageData.fetch({ index: pageRange.index }).data.forEach(function(result) {
    //     PROJECT_IDLIST.push(result.id)
    //     // find the customer that this project is attached to
    //     var customer = _.find(customerData, function(c) {
    //       return c.customer.id == result.getValue({ name: 'internalid', join: 'customer' })
    //     })
    //     if (!customer) return
    //     customer.projects.push({
    //       id:   result.id,
    //       name: result.getValue({ name: 'companyname' })
    //     })
    //   })
    // })
    //
    // // now collect the proposals attached to each of those customers
    // var proposalPageData = search.create({
    //   type: search.Type.ESTIMATE, filters: [
    //     ['mainline', 'is', 'T'], 'and',
    //     ['entity', 'anyof', PROJECT_IDLIST]
    //   ], columns: [
    //     search.createColumn({ name: 'entity' }),
    //     search.createColumn({ name: 'amount' }),
    //     search.createColumn({ name: 'custbody2' })
    //   ]
    // }).runPaged({
    //   pageSize: 1000
    // })
    // proposalPageData.pageRanges.forEach(function(pageRange) {
    //   proposalPageData.fetch({ index: pageRange.index }).data.forEach(function(result) {
    //     // find the right customer by the projectid
    //     var customer = _.find(customerData, function(customer) {
    //       return (customer.projects.map(function(p) {
    //         return p.id
    //       }).indexOf(result.getValue({ name: 'entity' })) > -1)
    //     })
    //     if (!customer) return
    //     log.debug('customer', customer)
    //     customer.estimates.push({
    //       id:     result.id,
    //       status: {
    //         id:   result.getValue({ name: 'custbody2' }),
    //         name: result.getText({ name: 'custbody2' })
    //       },
    //       amount: parseFloat(result.getValue({ name: 'amount' }))
    //     })
    //   })
    // })

    // now calculate the projects for each of the customers
    customerData = __FilterDataListByTeam(customerData, context.request.parameters.team)
    return __FilterDataListBySalesRep(customerData, context.request.parameters.salesrep)

  }

  function GetHistoricalCollections(context) {
    var historicals = []
    search.create({
      type: 'customrecord_dd_historical_reports',
      filters: [
        ['isinactive', 'is', 'F']
      ],
      columns: [
        search.createColumn({ name: 'custrecord_dd_reporthistory_data' }),
        search.createColumn({ name: 'custrecord_dd_reporthistory_date', sort: search.Sort.DESC })
      ]
    }).run().each(function(historical) {
      if (historical.getValue({ name: 'custrecord_dd_reporthistory_data' }))
        historicals.push({
          id: historical.id, name: 'Snapshot Taken - '+historical.getValue({ name: 'custrecord_dd_reporthistory_date' })
        })
      return true
    })
    return historicals
  }

  function GetEmployeeListFromData(context) {

    function __FilterDataListByTeam(employees, team) {
      if (!team || team == 'all') return employees
      var idlist = _.filter(GetTeamList(), function(t) { return t.id == team })[0].list
      return _.filter(employees, function(employee) { return idlist.indexOf(employee.id) > -1 })
    }

    var employeeList = []
    if (context.request.parameters.historical) {
      var data = JSON.parse(search.lookupFields({
        type: 'customrecord_dd_historical_reports', id: context.request.parameters.historical,
        columns: ['custrecord_dd_reporthistory_data']
      }).custrecord_dd_reporthistory_data), EMPLIST = GetEmployeeList(context)
      var repslist = _.groupBy(data, function(customer) { return customer.salesrep.id })
      return __FilterDataListByTeam(_.sortBy(Object.keys(repslist).map(function(repid) {
        return {
          id: repid, name: EMPLIST[repid]
        }
      }), function(employee) { return employee.name }), context.request.parameters.team)
    }

    // must not be historical, calculate from search.
    var customerSearch = search.load({
          id: runtime.getCurrentScript().getParameter({
            name: 'custscript_dundee_stagesrep_ss'
          }) || DEFAULT_DATA_COLLECTION_SEARCH
        })
    customerSearch.filterExpression = [
      ['isinactive', 'is', 'F'], 'and',
      ['isjob', 'is', 'F'], 'and',
      ['entitystatus', 'anyof', GetStatusList(context).map(function(status) { return status.id } )]
    ]
    customerSearch.columns = [
      search.createColumn({ name: 'salesrep', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
      search.createColumn({ name: 'internalid', summary: search.Summary.COUNT }),
    ]
    customerSearch.run().each(function(employee) {
      employeeList.push({
        id: employee.getValue({ name: 'salesrep', summary: search.Summary.GROUP }),
        name: employee.getText({ name: 'salesrep', summary: search.Summary.GROUP })
      })
      return true
    })
    return __FilterDataListByTeam(_.sortBy(employeeList, function(employee) { return employee.name }), context.request.parameters.team)
  }

  return {
    BuildData: BuildData,
    GetStatusList: GetStatusList,
    GetStatusListByID: GetStatusListByID,
    GetActionListForSelect: GetActionListForSelect,
    GetHistoricalCollections: GetHistoricalCollections,
    GetEmployeeList: GetEmployeeList,
    GetActionList: GetActionList,
    GetEmployeeListFromData: GetEmployeeListFromData,
    GetTeamList: GetTeamList,
    CollectHistoricalData: CollectHistoricalData
  }

})
