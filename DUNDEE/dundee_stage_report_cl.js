/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(
	['N/runtime', 'N/record', 'N/runtime'],
function(runtime, record, runtime) {

  var templates = {},
      salesrep = null,
      historical = null,
			team = null

  function GenerateBlockData(context, block, data) {
    if (context) {
      var currentRep = context.currentRecord.getValue({ fieldId: 'custpage_salesrep' })
      if (currentRep == 'none') currentRep = '@NONE@'
    }
    function __GetTotalsByType(title, source, type) {
      if (type != 'all') {
        var statusList = _.filter(STATUS_LIST, function(status) { return status.stage == type }).map(function(status) { return status.id })
        source = _.filter(source, function(customer) { return statusList.indexOf(customer.status.id) > -1 })
      }
      return {
        title: title,
        type: type,
        repoverride: currentRep,
        total: source.length,
        reps: _.sortBy((function() {
          var numByRep = _.groupBy(source, function(customer) { return customer.salesrep.id })
          return Object.keys(numByRep).map(function(repid) {
            return {
              id: repid,
              name: EMPLOYEE_LIST[repid],
              count: numByRep[repid] ? numByRep[repid].length : 0,
              type: type
            }
          })
        })(), function(result) {
          return result.name
        })
      }
    }
    if (block == 'total') {
      return __GetTotalsByType('Total by SalesRep', data, 'all')
    } else if (block == 'totalleads') {
      return __GetTotalsByType('Total Leads by SalesRep', data, 'Lead')
    } else if (block == 'totalcustomers') {
      return __GetTotalsByType('Total Customers by SalesRep', data, 'Customer')
    } else if (block == 'block2') {
      return {
        title: 'Customers by Stage',
        total: data.length,
        statuslist: STATUS_LIST.map(function(status) {
          var stageCustomers = _.filter(data, function(customer) {
            return customer.status.id == status.id
          })
          return {
            id: status.id,
            name: status.name,
            stagetotal: stageCustomers.length,
            repoverride: currentRep,
            salesreps: _.sortBy((function() {
              var numByRep = _.groupBy(stageCustomers, function(customer) { return customer.salesrep.id })
              return Object.keys(numByRep).map(function(repid) {
                return {
                  id: repid,
                  statusid: status.id,
                  name: EMPLOYEE_LIST[repid],
                  count: numByRep[repid] ? numByRep[repid].length : 0,
                  percentage: (function() {
                    var numByRepTotal = _.groupBy(data, function(customer) { return customer.salesrep.id })
                    return (numByRep[repid] ? numByRep[repid].length : 0) / numByRepTotal[repid].length
                  })()
                }
              })
            })(), function(result) {
              return result.name
            })
          }
        })
      }
    }
  }

  function ApplyHelpers() {
    Handlebars.registerHelper('perc', function(value) {
      return numeral(value).format('0.0%')
    })
    Handlebars.registerHelper('searchurl', function(value, salesrep, stage, action) {
      params = []
      if (salesrep != 'all') {
        if (!salesrep) params.push('salesrep=@NONE@')
        else params.push('salesrep='+salesrep)
      }
      if (stage != 'all') {
        params.push('stage='+stage)
      }
			if (team) params.push('team='+team)
      return new Handlebars.SafeString(
        "<a href='"+RUNSEARCH+"&"+params.join('&')+"' target='_blank'>"+numeral(value).format('0,0')+"</a>"
      )
    })
    Handlebars.registerHelper('searchurlbystage', function(value, salesrep, stage, lastaction) {
			params = []
      if (salesrep != 'all') {
        if (!salesrep) params.push('salesrep=@NONE@')
        else params.push('salesrep='+salesrep)
      }
      if (stage != 'all') {
        params.push('status='+stage)
      }
      if (lastaction != 'all') {
        if (!lastaction) params.push('lastaction=@NONE@')
        else params.push('lastaction='+lastaction)
      }
			if (team) params.push('team='+team)
      return new Handlebars.SafeString(
        "<a href='"+RUNSEARCH+"&"+params.join('&')+"' target='_blank'>"+numeral(value).format('0,0')+"</a>"
      )
    })
    Handlebars.registerHelper('searchurlbystatus', function(value, salesrep, status, lastaction) {
      params = []
      if (salesrep != 'all') {
        if (!salesrep) params.push('salesrep=@NONE@')
        else params.push('salesrep='+salesrep)
      }
      if (status != 'all') {
        params.push('status='+_.filter(STATUS_LIST, function(st) { return st.id == status })[0].id)
      }
      if (lastaction != 'all') {
        if (!lastaction) params.push('lastaction=@NONE@')
        else params.push('lastaction='+lastaction)
      }
			if (team) params.push('team='+team)
      return new Handlebars.SafeString(
        "<a href='"+RUNSEARCH+"&"+params.join('&')+"' target='_blank'>"+numeral(value).format('0,0')+"</a>"
      )
    })
    Handlebars.registerHelper('showactions', function(stage, rep) {
      if (rep == undefined) rep = runtime.getCurrentUser().id
      return new Handlebars.SafeString(
        "<a href=\"#\" onclick=\"require(['/SuiteScripts/dundee_stage_report_cl'], function(mod) { mod.showActions('"+stage+"', '"+rep+"'); }); return false;\">Actions</a>"
      )
    })
  }

  function DrawTables(context, data) {
    jQuery("#total").html(templates.block1(GenerateBlockData(context, 'total', data)))
    jQuery("#totalleads").html(templates.block1(GenerateBlockData(context, 'totalleads', data)))
    jQuery("#totalcustomers").html(templates.block1(GenerateBlockData(context, 'totalcustomers', data)))
    jQuery("#block2").html(templates.block2(GenerateBlockData(context, 'block2', data)))
    jQuery("#block3").empty()
  }

  function pageInit(context) {
    window.onbeforeunload = function() {}
    salesrep = context.currentRecord.getValue({ fieldId: 'custpage_salesrep' })
    historical = context.currentRecord.getValue({ fieldId: 'custpage_history' })
		team = context.currentRecord.getValue({ fieldId: 'custpage_team' })
    ApplyHelpers()
    jQuery("#tr_fg_report > td")[1].remove()
    if (jQuery("#tr_fg_report > td")[1]) jQuery("#tr_fg_report > td")[1].remove()
    templates = {
      block1: Handlebars.compile(jQuery("#DD_BLOCK1").html()),
      block2: Handlebars.compile(jQuery("#DD_BLOCK2").html()),
      block3: Handlebars.compile(jQuery("#DD_BLOCK3").html())
    }
    DrawTables(context, DD_DATA_OBJ)
  }

  function fieldChanged(context) {
    function FilterDataByRep(rep) {
      if (rep == 'all') return DD_DATA_OBJ
      if (rep == 'none') return _.filter(DD_DATA_OBJ, function(customer) { return !customer.salesrep.id })
      return _.filter(DD_DATA_OBJ, function(customer) { return customer.salesrep.id == rep })
    }
    if (context.fieldId == 'custpage_salesrep') {
      DrawTables(context, FilterDataByRep(context.currentRecord.getValue({ fieldId: 'custpage_salesrep' })))
      salesrep = context.currentRecord.getValue({ fieldId: 'custpage_salesrep' })
    }
    else if (context.fieldId == 'custpage_history') {
      historical = context.currentRecord.getValue({ fieldId: 'custpage_history' })
      var historyVal = context.currentRecord.getValue({ fieldId: 'custpage_history' })
      if (historyVal != 'now') window.location.href = RELOADURL+'&historical='+historyVal
      else window.location.href = RELOADURL
    } else if (context.fieldId == 'custpage_team') {
			team = context.currentRecord.getValue({ fieldId: 'custpage_team' })
			var teamVal = context.currentRecord.getValue({ fieldId: 'custpage_team' })
			if (teamVal != 'all') window.location.href = RELOADURL+'&team='+teamVal
			else window.location.href = RELOADURL
		}
  }

  function showActions(stage, rep) {
    function GenBlockData(stage, rep) {
      return {
        title: 'Actions: ' + _.filter(STATUS_LIST, function(status) { return status.id == stage })[0].name,
        salesreps: (function() {
          var customersByStage = _.filter(DD_DATA_OBJ, function(customer) { return customer.status.id == stage } )
          if (rep != 'all') customersByStage = _.filter(customersByStage, function(customer) { return customer.salesrep.id == rep })
          return (function(data) {
            var numByRep = _.groupBy(customersByStage, function(customer) { return customer.salesrep.id })
            return _.sortBy(Object.keys(numByRep).map(function(repid) {
              // TODO: calculate the actions
              return {
                id: repid,
                name: EMPLOYEE_LIST[repid],
                statusid: stage,
                actionstotal: numByRep[repid].length,
                actions: (function(data) {
                  var resultsByAction = _.groupBy(data, function(d) { return d.lastaction.id })
                  return _.sortBy(Object.keys(resultsByAction).map(function(resultid) {
                    return {
                      id: resultid,
                      repid: repid,
                      statusid: stage,
                      name: ACTION_LIST[resultid],
                      count: resultsByAction[resultid].length,
                      percentage: resultsByAction[resultid].length / numByRep[repid].length
                    }
                  }), function(r) { return r.name })
                })(numByRep[repid])
              }
            }), function(rep) { return rep.name })
          })(customersByStage)
        })()
      }
    }
    jQuery("#block3").html(templates.block3(GenBlockData(stage, rep)))
    window.scrollTo(0,0)
  }

  function print() {
    if (salesrep == undefined) salesrep = runtime.getCurrentUser().id
    if (historical == undefined) historical = 'now'
		if (team == undefined) team = 'all'
    var params = ['action=print', 'salesrep='+salesrep, 'historical='+historical, 'team='+team]
    return window.open(RELOADURL+'&'+params.join('&'), '_blank')
  }

	function printxls() {
		if (salesrep == undefined) salesrep = runtime.getCurrentUser().id
    if (historical == undefined) historical = 'now'
		if (team == undefined) team = 'all'
    var params = ['action=printxls', 'salesrep='+salesrep, 'historical='+historical, 'team='+team]
    return window.open(RELOADURL+'&'+params.join('&'), '_blank')
	}

	function printxlsfull() {
		if (salesrep == undefined) salesrep = runtime.getCurrentUser().id
    if (historical == undefined) historical = 'now'
		if (team == undefined) team = 'all'
    var params = ['action=printxlsfull', 'salesrep='+salesrep, 'historical='+historical, 'team='+team]
    return window.open(RELOADURL+'&'+params.join('&'), '_blank')
	}

  return { pageInit: pageInit, fieldChanged: fieldChanged, showActions: showActions, print: print, printxls: printxls, printxlsfull: printxlsfull }

})
