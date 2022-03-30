/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define([
  'N/runtime',
  'N/ui/serverWidget',
  'N/search',
  'N/config',
  'N/file',
  'N/xml',
  'N/url',
  'SuiteScripts/underscore.js',
  'SuiteScripts/moment.js',
  'SuiteScripts/numeral.js',
  'SuiteScripts/dundee_stage_report_lib.js'
],
function(runtime, ui, search, config, file, xml, url, _, moment, numeral, runreport_lib) {

  var THOMAS_PRESTNEY_ID = "10", MAX_COLUMNS_IN_WEBVERSION = 14

  function BuildForm(context) {
    //redirect if thomas
    if (runtime.getCurrentUser().id == THOMAS_PRESTNEY_ID && context.request.parameters.team != THOMAS_PRESTNEY_ID)
      return context.response.sendRedirect({
        type: 'SUITELET', identifier: runtime.getCurrentScript().id, id: runtime.getCurrentScript().deploymentId, parameters: {
          team: THOMAS_PRESTNEY_ID
        }
      })

    // calculate the form title
    var formTitle = [config.load({
      type: config.Type.COMPANY_INFORMATION
    }).getText({
      fieldId: 'companyname'
    }), 'Historical Sales Report'].join(' - ')

    var form = ui.createForm({
      title: formTitle
    })
    form.addButton({
      id: 'custpage_printxls', label: 'Print XLS', functionName: 'printxls'
    })
    form.addFieldGroup({ id: 'filters', label: 'Filtering' })
    if (runtime.getCurrentUser().role != '1002') {
      var teamFld = form.addField({
        id: 'custpage_team', type: ui.FieldType.SELECT, label: 'Team', container: 'filters'
      })
      teamFld.addSelectOption({ value: 'all', text: '- All -', isSelected: true })
      runreport_lib.GetTeamList().map(function(team) {
        teamFld.addSelectOption({ value: team.id, text: team.name, isSelected: team.id == context.request.parameters.team })
      })
      teamFld.updateDisplayType({
        displayType: ui.FieldDisplayType.HIDDEN
      })
      var repFld = form.addField({
        id: 'custpage_salesrep', type: ui.FieldType.SELECT, label: 'Filter by Rep', container: 'filters'
      })
      repFld.addSelectOption({ value: "all", text: '- All - ', isSelected: true })
      runreport_lib.GetEmployeeListFromData(context).map(function(employee) {
        repFld.addSelectOption({ value: employee.id || "none", text: employee.name || "- None -", isSelected: employee.id == context.request.parameters.salesrep })
      })
    } else if (context.request.parameters.salesrep) {
      var repFld = form.addField({
        id: 'custpage_salesrep', type: ui.FieldType.SELECT, label: 'Filter by Rep', container: 'filters'
      })
      repFld.addSelectOption({ value: "all", text: '- All - ', isSelected: true })
      runreport_lib.GetEmployeeListFromData(context).map(function(employee) {
        repFld.addSelectOption({ value: employee.id || "none", text: employee.name || "- None -", isSelected: employee.id == runtime.getCurrentUser().id})
      })
      repFld.updateDisplayType({
        displayType: ui.FieldDisplayType.HIDDEN
      })
    } else if (!context.request.parameters.salesrep) {
      return context.response.sendRedirect({
        type: 'SUITELET', identifier: runtime.getCurrentScript().id, id: runtime.getCurrentScript().deploymentId, parameters: {
          salesrep: runtime.getCurrentUser().id
        }
      })
    }
    // add the date range to and from filters
    var dateRanges = [
      { id: 'Today', date: 'Today' }
    ]
    search.create({
      type: 'customrecord_dd_historical_reports', filters: [
        ['isinactive', 'is', 'F']
      ], columns: [
        search.createColumn({ name: 'internalid', sort: search.Sort.DESC }), //get in reverse order
        search.createColumn({ name: 'custrecord_dd_reporthistory_date' })
      ]
    }).run().each(function(result) {
      return dateRanges.push({
        id:   result.id,
        date: result.getValue({ name: 'custrecord_dd_reporthistory_date' })
      })
    })
    var rangeStartFld = form.addField({
      id: 'custpage_start', type: ui.FieldType.SELECT, label: 'Date Range Start', container: 'filters'
    })
    rangeStartFld.updateLayoutType({
      layoutType: ui.FieldLayoutType.STARTROW
    })
    var rangeEndFld = form.addField({
      id: 'custpage_end', type: ui.FieldType.SELECT, label: 'Date Range End', container: 'filters'
    })
    rangeEndFld.updateLayoutType({
      layoutType: ui.FieldLayoutType.ENDROW
    })
    dateRanges.map(function(date) {
      rangeStartFld.addSelectOption({ value: date.date, text: date.date, isSelected: date.date == context.request.parameters.start })
      rangeEndFld.addSelectOption({ value: date.date, text: date.date, isSelected: date.date == context.request.parameters.end })
    })
    if (!context.request.parameters.end)
      rangeEndFld.defaultValue = _.last(dateRanges).date
    if (!context.request.parameters.start)
      rangeStartFld.defaultValue = _.first(dateRanges).date
    // figure out the date range that we'll collect on
    range = []
    if (!context.request.parameters.start || context.request.parameters.start == 'Today') {
      range.push('Today')
      // now find the last one
      if (context.request.parameters.end != 'Today') {
        _.filter(dateRanges, function(d) { return d.date != 'Today' }).map(function(d, index) {
          if (index > MAX_COLUMNS_IN_WEBVERSION-1) return
          if (!context.request.parameters.end) return range.push(d.id)
          if (moment(d.date, 'M/D/YYYY') >= moment(context.request.parameters.end, 'M/D/YYYY'))
            return range.push(d.id)
        })
      }
    } else {
      // see if its between the date ranges
      _.filter(dateRanges, function(d) { return d.date != 'Today' }).map(function(d, index) {
        if (range.length > MAX_COLUMNS_IN_WEBVERSION) return
        if (moment(d.date, 'M/D/YYYY') > moment(context.request.parameters.start, 'M/D/YYYY')) return
        if (moment(d.date, 'M/D/YYYY') < moment(context.request.parameters.end, 'M/D/YYYY')) return
        range.push(d.id)
      })
    }

    log.debug('range', range)


    // build the report element, allow the table to build itself
    form.addFieldGroup({ id: 'report', label: 'Historical Comparison Report' })
    form.addField({
      id: 'custpage_home', type: ui.FieldType.INLINEHTML, label: 'home', container: 'report'
    }).defaultValue = "<div id='DD_HOME'>"+
                        "<div id='historicalblock'>"+
                        "</div>"+
                      "</div>"

    // add the stylesheet
    form.addField({
      id: 'custpage_styles', type: ui.FieldType.INLINEHTML, label: 'styles'
    }).defaultValue = "<style>"+file.load({ id: 139 }).getContents()+"</style>"

    // add the template for the historical block
    form.addField({
      id: 'custpage_block1', type: ui.FieldType.INLINEHTML, label: 'block1'
    }).defaultValue = "<script type='text/x-handlebars-template' id='DD_BLOCK_HISTORICAL'>"+file.load({ id: 601 }).getContents()+"</script>";

    // add a few helpful scripts
    [
      'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.5/handlebars.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/numeral.js/1.5.3/numeral.min.js'
    ].map(function(script, index) {
      form.addField({
        id: 'custpage_script_'+index.toString(), type: ui.FieldType.INLINEHTML, label: 'script_'+index.toString()
      }).defaultValue = "<script type='text/javascript' src='"+script+"'></script>";
    })

    // build the data for today comparison
    form.addField({
      id: 'custpage_somedata', type: ui.FieldType.INLINEHTML, label: 'vars'
    }).defaultValue = "<script type='text/javascript'>var DD_DATA_OBJ = "+JSON.stringify(runreport_lib.CollectHistoricalData(context, range))+"; " +
                                                      "var DATE_RANGES = "+JSON.stringify(dateRanges)+"; " +
                                                      "var RELOADURL = '"+url.resolveScript({
                                                        scriptId: runtime.getCurrentScript().id,
                                                        deploymentId: runtime.getCurrentScript().deploymentId
                                                      })+"'; " + "</script>"

    // link the client script
    form.clientScriptFileId = 606

    // add the submit button to change the teams
    form.addSubmitButton({
      label: 'Update Filters'
    })

    return context.response.writePage(form)

  }

  var ShowData = function(context) {
    return context.response.write(JSON.stringify(runreport_lib.CollectHistoricalData(context)))
  }

  var onRequest = function(context) {
    if (context.request.method == 'POST') {
      return context.response.sendRedirect({
        type: 'SUITELET', identifier: runtime.getCurrentScript().id, id: runtime.getCurrentScript().deploymentId, parameters: {
          team: context.request.parameters.custpage_team,
          salesrep: context.request.parameters.custpage_salesrep,
          start: context.request.parameters.custpage_start,
          end: context.request.parameters.custpage_end
        }
      })
    }
    if (!context.request.parameters.action || context.request.parameters.action == 'form')
      return BuildForm(context)
    if (context.request.parameters.action == 'data')
      return ShowData(context)
    if (context.request.parameters.action == 'printxls') {
      var dateRanges = [
        { id: 'Today', date: 'Today' }
      ]
      search.create({
        type: 'customrecord_dd_historical_reports', filters: [
          ['isinactive', 'is', 'F']
        ], columns: [
          search.createColumn({ name: 'internalid', sort: search.Sort.DESC }), //get in reverse order
          search.createColumn({ name: 'custrecord_dd_reporthistory_date' })
        ]
      }).run().each(function(result) {
        return dateRanges.push({
          id:   result.id,
          date: result.getValue({ name: 'custrecord_dd_reporthistory_date' })
        })
      })
      var range = []
      if (!context.request.parameters.start || context.request.parameters.start == 'Today') {
        range.push('Today')
        // now find the last one
        if (context.request.parameters.end != 'Today') {
          _.filter(dateRanges, function(d) { return d.date != 'Today' }).map(function(d, index) {
            if (!context.request.parameters.end) return range.push(d.id)
            if (moment(d.date, 'M/D/YYYY') >= moment(context.request.parameters.end, 'M/D/YYYY'))
              return range.push(d.id)
          })
        }
      } else {
        // see if its between the date ranges
        _.filter(dateRanges, function(d) { return d.date != 'Today' }).map(function(d, index) {
          if (moment(d.date, 'M/D/YYYY') > moment(context.request.parameters.start, 'M/D/YYYY')) return
          if (moment(d.date, 'M/D/YYYY') < moment(context.request.parameters.end, 'M/D/YYYY')) return
          range.push(d.id)
        })
      }

      var baseURL = "https://dundee-excelcreator.herokuapp.com/"
      // var baseURL = "https://61569ce2.ngrok.io/"
      var s = '<html>'+
                '<head>'+
                  '<script type="text/javascript">'+
                    'function run() { document.getElementsByName("form")[0].submit(); setTimeout(function () { window.close();}, 30000); }'+
                  '</script>'+
                '</head>'+
                '<body onload="run();">'+
                  '<p>Loading Excel Report..... This window will close by itself in 30 seconds, or you can close it <b>AFTER</b> you file has downloaded by clicking <a href=#" onclick="window.close();">here</a>.</p>'+
                  '<form name="form" method="post" action="'+baseURL+'dundee/historical">'+
                    '<input type="hidden" name="datestring" value="'+moment().format('dddd, MMMM Do YYYY')+'"/>'+
                    '<input type="hidden" name="date" value="'+moment().format('M-D-YYYY')+'"/>'+
                    '<input type="hidden" name="username" value="'+runtime.getCurrentUser().name+'"/>'+
                    '<input type="hidden" name="companyname" value="'+config.load({
                                                                        type: config.Type.COMPANY_INFORMATION
                                                                      }).getText({
                                                                        fieldId: 'companyname'
                                                                      })+'"/>'+
                    '<input type="hidden" name="reportname" value="Historical Comparison"/>'+
                    '<input type="hidden" name="data" value="'+xml.escape({
                      xmlText: JSON.stringify(runreport_lib.CollectHistoricalData(context, range))
                    })+'"/>'+
                  '</form>'+
                '</body>'+
              '</html>'
      return context.response.write({ output: s })
    }
  }

  return { onRequest: onRequest }
})
