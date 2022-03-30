/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define([
  'N/runtime',
  'N/ui/serverWidget',
  'N/search',
  'N/file',
  'N/config',
  'N/url',
  'N/redirect',
  'N/log',
  'N/record',
  'N/https',
  'N/encode',
  'N/xml',
  'SuiteScripts/underscore.js',
  'SuiteScripts/moment.js',
  'SuiteScripts/dundee_stage_report_lib.js',
  'SuiteScripts/dundee_stage_report_pdf.js'
],
function(runtime, ui, search, file, config, url, redirect, log, record, https, encode, xml, _, moment, runreport_lib, runreport) {

  var THOMAS_PRESTNEY_ID = "10"

  /*
   * Build the Form
   */
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
    })]
    if (context.request.parameters.historical) {
      var HistoricalDate = search.lookupFields({
        type: 'customrecord_dd_historical_reports', id: context.request.parameters.historical, columns: ['custrecord_dd_reporthistory_date']
      })
      formTitle.push('SnapShot Taken - '+HistoricalDate.custrecord_dd_reporthistory_date)
    } else {
      formTitle.push('Sales Report')
    }

    var form = ui.createForm({
      title: formTitle.join(' - ')
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
      var repFld = form.addField({
        id: 'custpage_salesrep', type: ui.FieldType.SELECT, label: 'Filter by Rep', container: 'filters'
      })
      repFld.addSelectOption({ value: "all", text: '- All - ', isSelected: true })
      runreport_lib.GetEmployeeListFromData(context).map(function(employee) {
        repFld.addSelectOption({ value: employee.id || "none", text: employee.name || "- None -" })
      })
      var dateFld = form.addField({
        id: 'custpage_history', type: ui.FieldType.SELECT, label: 'Historical Snapshots', container: 'filters'
      })
      dateFld.addSelectOption({
        value: 'now', text: 'Now...', isSelected: true
      })
      runreport_lib.GetHistoricalCollections(context).map(function(historical) {
        dateFld.addSelectOption({
          value: historical.id, text: historical.name, isSelected: historical.id == context.request.parameters.historical
        })
      })
    } else if (runtime.getCurrentUser().id == THOMAS_PRESTNEY_ID ) {
      var teamFld = form.addField({
        id: 'custpage_team', type: ui.FieldType.TEXT, label: 'Team', container: 'filters'
      })
      teamFld.defaultValue = context.request.parameters.team
      teamFld.updateDisplayType({
        displayType: ui.FieldDisplayType.HIDDEN
      })
      var repFld = form.addField({
        id: 'custpage_salesrep', type: ui.FieldType.SELECT, label: 'Filter by Rep', container: 'filters'
      })
      repFld.addSelectOption({ value: "all", text: '- All - ', isSelected: true })
      runreport_lib.GetEmployeeListFromData(context).map(function(employee) {
        repFld.addSelectOption({ value: employee.id || "none", text: employee.name || "- None -" })
      })
      /*var dateFld = form.addField({
        id: 'custpage_history', type: ui.FieldType.SELECT, label: 'Historical Snapshots', container: 'filters'
      })
      dateFld.addSelectOption({
        value: 'now', text: 'Now...', isSelected: true
      })
      runreport_lib.GetHistoricalCollections(context).map(function(historical) {
        dateFld.addSelectOption({
          value: historical.id, text: historical.name, isSelected: historical.id == context.request.parameters.historical
        })
      })*/
    }
    form.addButton({
      id: 'custpage_print', label: 'Print to PDF', functionName: 'print'
    })
    // if (runtime.getCurrentUser().id == "4099" || runtime.getCurrentUser().id == "-5") {
      form.addButton({
        id: 'custpage_printxls', label: 'Print XLS', functionName: 'printxls'
      })
      form.addButton({
        id: 'custpage_printxls', label: 'Print XLS (Executive)', functionName: 'printxlsfull'
      })
    // }
    if (context.request.parameters.historical) {
      form.addSubmitButton({
        label: 'Back to Now'
      })
    }
    //create the data field we'll pass to the browser with all of the data
    form.addField({
      id: 'custpage_data', type: ui.FieldType.INLINEHTML, label: 'data'
    }).defaultValue = "<script type='text/javascript'>var DD_DATA_OBJ = "+JSON.stringify(runreport_lib.BuildData(context))+"; "+
                        "var EMPLOYEE_LIST = "+JSON.stringify(runreport_lib.GetEmployeeList(context))+"; "+
                        "var STATUS_LIST = "+JSON.stringify(runreport_lib.GetStatusList(context))+"; "+
                        "var ACTION_LIST = "+JSON.stringify(runreport_lib.GetActionList(context))+"; "+
                        "var RELOADURL = '"+url.resolveScript({
                          scriptId: runtime.getCurrentScript().id,
                          deploymentId: runtime.getCurrentScript().deploymentId
                        })+"'; "+
                        "var RUNSEARCH = RELOADURL+'&action=runsearch'; "+
                        "</script>";
    // link the client script
    form.clientScriptFileId = '138'
    // add the field to put all of the html content within
    form.addFieldGroup({ id: 'report', label: 'Report' })
    form.addField({
      id: 'custpage_home', type: ui.FieldType.INLINEHTML, label: 'home', container: 'report'
    }).defaultValue = "<div id='DD_HOME'>"+
                        "<div id='block1'>"+
                          "<div id='total'></div>"+
                          "<div id='totalleads'></div>"+
                          "<div id='totalcustomers'></div>"+
                        "</div>"+
                        "<div class='spacer'>&nbsp;</div>"+
                        "<div id='block2'></div>"+
                        "<div class='spacer'>&nbsp;</div>"+
                        "<div id='block3'>&nbsp;</div>"+
                      "</div>"
    // add the stylesheet
    form.addField({
      id: 'custpage_styles', type: ui.FieldType.INLINEHTML, label: 'styles'
    }).defaultValue = "<style>"+file.load({ id: 139 }).getContents()+"</style>"
    // add handlebars
    form.addField({
      id: 'custpage_block1', type: ui.FieldType.INLINEHTML, label: 'block1'
    }).defaultValue = "<script type='text/x-handlebars-template' id='DD_BLOCK1'>"+file.load({ id: 148 }).getContents()+"</script>";
    form.addField({
      id: 'custpage_block2', type: ui.FieldType.INLINEHTML, label: 'block2'
    }).defaultValue = "<script type='text/x-handlebars-template' id='DD_BLOCK2'>"+file.load({ id: 149 }).getContents()+"</script>";
    form.addField({
      id: 'custpage_block3', type: ui.FieldType.INLINEHTML, label: 'block3'
    }).defaultValue = "<script type='text/x-handlebars-template' id='DD_BLOCK3'>"+file.load({ id: 160 }).getContents()+"</script>";
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

    return context.response.writePage(form)

  }

  /*
   * Run an ad-hoc search and redirect to the outcome
   */
  function RunSearch(context) {
    if (context.request.parameters.salesrep)
      var salesrep = [context.request.parameters.salesrep]
    else if (context.request.parameters.team != 'all')
      var salesrep = runreport_lib.GetTeamList(context)[0].list
    else var salesrep = []
    if (!context.request.parameters.stage)
      var statusList = runreport_lib.GetStatusList(context)
    else var statusList = _.filter(runreport_lib.GetStatusList(context), function(status) { return status.stage == context.request.parameters.stage } )
    statusList = statusList.map(function(status) { return status.id })
    if (context.request.parameters.status)
      var statusList = [context.request.parameters.status]
    return context.response.sendRedirect({
      type: 'TASKLINK', identifier: 'LIST_SEARCHRESULTS', parameters: {
        searchid: runtime.getCurrentScript().getParameter({
                    name: 'custscript_dundee_stagesrep_ss'
                  }),
        Customer_SALESREP: salesrep.length > 0 ? salesrep.join('\x05') : undefined,
        CUSTENTITY_DD_MOSTRECENTACTION: context.request.parameters.lastaction || undefined,
        Customer_STATUS: statusList.join('\x05')
      }
    })
  }

  var onRequest = function(context) {
    if (context.request.method == 'POST') {
      return context.response.sendRedirect({
        type: 'SUITELET', identifier: runtime.getCurrentScript().id, id: runtime.getCurrentScript().deploymentId
      })
    }
    if (!context.request.parameters.action || context.request.parameters.action == 'form')
      return BuildForm(context)
    if (context.request.parameters.action == 'runsearch')
      return RunSearch(context)
    if (context.request.parameters.action == 'print') {
      return runreport.runReport(context, {
        salesrep: context.request.parameters.salesrep,
        historical: context.request.parameters.historical
      })
    }
    // var baseURL = "https://69cd7582.ngrok.io/"
    var baseURL = "https://dundee-excelcreator.herokuapp.com/"
    if (context.request.parameters.action == 'printxls') {
      function CollectData(context) {
        var data = runreport_lib.BuildData(context)
        if (context.request.parameters.salesrep != 'all')
          data = _.filter(data, function(customer) { return customer.salesrep.id == context.request.parameters.salesrep })
        return data
      }
      if (context.request.parameters.historical != 'now') {
        var coredate = search.lookupFields({
          type: 'customrecord_dd_historical_reports', id: context.request.parameters.historical,
          columns: ['custrecord_dd_reporthistory_date']
        }).custrecord_dd_reporthistory_date
        baseDate = moment(coredate, ['M/D/YYYY', 'MM/DD/YYYY'])
      } else var baseDate = moment()
      var s = '<html>'+
                '<head>'+
                  '<script type="text/javascript">'+
                    'function run() { document.getElementsByName("form")[0].submit(); setTimeout(function () { window.close();}, 10000); }'+
                  '</script>'+
                '</head>'+
                '<body onload="run();">'+
                  '<p>Loading Excel Report..... This window will close by itself in 30 seconds, or you can close it <b>AFTER</b> you file has downloaded by clicking <a href=#" onclick="window.close();">here</a>.</p>'+
                  '<form name="form" method="post" action="'+baseURL+'dundeereport/">'+
                    '<input type="hidden" name="datestring" value="'+moment().format('dddd, MMMM Do YYYY')+((context.request.parameters.historical != 'now') ? ' (historical for snapshot taken '+coredate+')' : '')+'"/>'+
                    '<input type="hidden" name="date" value="'+baseDate.format('M-D-YYYY')+'"/>'+
                    '<input type="hidden" name="username" value="'+runtime.getCurrentUser().name+'"/>'+
                    '<input type="hidden" name="status" value="'+xml.escape({ xmlText: JSON.stringify(runreport_lib.GetStatusList(context)) })+'"/>'+
                    '<input type="hidden" name="employees" value="'+xml.escape({ xmlText: JSON.stringify(runreport_lib.GetEmployeeList(context)) })+'"/>'+
                    '<input type="hidden" name="actions" value="'+xml.escape({ xmlText: JSON.stringify(runreport_lib.GetActionList(context)) })+'"/>'+
                    '<input type="hidden" name="companyname" value="'+config.load({
                                                                        type: config.Type.COMPANY_INFORMATION
                                                                      }).getText({
                                                                        fieldId: 'companyname'
                                                                      })+'"/>'+
                    '<input type="hidden" name="reportname" value="Sales Report"/>'+
                    '<input type="hidden" name="data" value="'+xml.escape({ xmlText: JSON.stringify(CollectData(context)) })+'"/>'+
                  '</form>'+
                '</body>'+
              '</html>'
      context.response.write({ output: s })
    }
    if (context.request.parameters.action == 'printxlsfull') {
      function CollectData(context) {
        var data = runreport_lib.BuildData(context)
        if (context.request.parameters.salesrep != 'all')
          data = _.filter(data, function(customer) { return customer.salesrep.id == context.request.parameters.salesrep })
        return data
      }
      // if (context.request.parameters.historical != 'now') {
      //   var coredate = search.lookupFields({
      //     type: 'customrecord_dd_historical_reports', id: context.request.parameters.historical,
      //     columns: ['custrecord_dd_reporthistory_date']
      //   }).custrecord_dd_reporthistory_date
      //   baseDate = moment(coredate, ['M/D/YYYY', 'MM/DD/YYYY'])
      // } else

      // context.response.setHeader({
      //   name: 'Context-Type', value: 'application/json'
      // })
      // return context.response.write({
      //   output: JSON.stringify(CollectData(context))
      // })

      var baseDate = moment()
      var s = '<html>'+
                '<head>'+
                  '<script type="text/javascript">'+
                    'function run() { document.getElementsByName("form")[0].submit(); setTimeout(function () { window.close();}, 10000); }'+
                  '</script>'+
                '</head>'+
                '<body onload="run();">'+
                  '<p>Loading Excel Report..... This window will close by itself in 30 seconds, or you can close it <b>AFTER</b> you file has downloaded by clicking <a href=#" onclick="window.close();">here</a>.</p>'+
                  '<form name="form" method="post" action="'+baseURL+'dundee/execreport">'+
                    '<input type="hidden" name="datestring" value="'+moment().format('dddd, MMMM Do YYYY')+((context.request.parameters.historical != 'now') ? ' (historical for snapshot taken '+coredate+')' : '')+'"/>'+
                    '<input type="hidden" name="date" value="'+baseDate.format('M-D-YYYY')+' (Executive)"/>'+
                    '<input type="hidden" name="username" value="'+runtime.getCurrentUser().name+'"/>'+
                    '<input type="hidden" name="status" value="'+xml.escape({ xmlText: JSON.stringify(runreport_lib.GetStatusList(context)) })+'"/>'+
                    '<input type="hidden" name="employees" value="'+xml.escape({ xmlText: JSON.stringify(runreport_lib.GetEmployeeList(context)) })+'"/>'+
                    '<input type="hidden" name="actions" value="'+xml.escape({ xmlText: JSON.stringify(runreport_lib.GetActionList(context)) })+'"/>'+
                    '<input type="hidden" name="companyname" value="'+config.load({
                                                                        type: config.Type.COMPANY_INFORMATION
                                                                      }).getText({
                                                                        fieldId: 'companyname'
                                                                      })+'"/>'+
                    '<input type="hidden" name="reportname" value="Sales Report"/>'+
                    '<input type="hidden" name="data" value="'+xml.escape({ xmlText: JSON.stringify(CollectData(context)) })+'"/>'+
                  '</form>'+
                '</body>'+
              '</html>'
      context.response.write({ output: s })
    }
  }

  return { onRequest: onRequest }
})
