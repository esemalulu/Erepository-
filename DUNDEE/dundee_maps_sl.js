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
  'N/record',
  'N/url',
  'SuiteScripts/underscore.js',
  'SuiteScripts/moment.js',
  'SuiteScripts/dundee_stage_report_lib.js',
],
function(runtime, ui, search, config, file, record, url, _, moment, lib) {

  var GMAPS_API_KEYS = {
    server: '', browser: 'AIzaSyDqQuvlrdPwYUa-JT0cQ0Uvr3FRIoqRVW0'
  }, THOMAS_PRESTNEY_ID = "10"

  /*
    Form builder.
  */
  var onRequest = function(context) {

    // if we're cleaning
    if (context.request.parameters.customer && context.request.parameters.action == 'clean') {
      record.submitFields({
        type: record.Type.CUSTOMER, id: context.request.parameters.customer, values: {
          custentity_lat: '', custentity_lng: ''
        }, options: {
          ignoreMandatoryFields: true
        }
      })
      return context.response.sendRedirect({
        type: 'RECORD', identifier: record.Type.CUSTOMER, id: context.request.parameters.customer
      })
    }

    // calculate the form title
    var formTitle = [config.load({
      type: config.Type.COMPANY_INFORMATION
    }).getText({
      fieldId: 'companyname'
    }), 'Maps']
    var form = ui.createForm({
      title: formTitle.join(' - ')
    })
    var EMPLOYEE_LIST = lib.GetEmployeeList()

    form.addFieldGroup({ id: 'filters', label: 'Team / Rep Filters' })
    if (runtime.getCurrentUser().role != '1002' && runtime.getCurrentUser().id != THOMAS_PRESTNEY_ID) {
      var teamFld = form.addField({
        id: 'custpage_team', type: ui.FieldType.SELECT, label: 'Team', container: 'filters'
      })
      teamFld.addSelectOption({ value: 'all', text: '- All -', isSelected: true })
      lib.GetTeamList().map(function(team) {
        teamFld.addSelectOption({ value: team.id, text: team.name, isSelected: team.id == context.request.parameters.team })
      })
      var repFld = form.addField({
        id: 'custpage_salesrep', type: ui.FieldType.SELECT, label: 'Filter by Rep', container: 'filters'
      })
      repFld.addSelectOption({ value: "all", text: '- All - ', isSelected: true })
      var teamList = lib.GetTeamList(),
          reps = []
      if (!context.request.parameters.team) {
        teamList[0].list.map(function(id) {
          reps.push({
            id:   id, name: EMPLOYEE_LIST[id]
          })
        })
        teamList[1].list.map(function(id) {
          reps.push({
            id:   id, name: EMPLOYEE_LIST[id]
          })
        })
      } else if (context.request.parameters.team == 'organic') {
        teamList[0].list.map(function(id) {
          reps.push({
            id:   id, name: EMPLOYEE_LIST[id]
          })
        })
      } else if (context.request.parameters.team == THOMAS_PRESTNEY_ID) {
        teamList[1].list.map(function(id) {
          reps.push({
            id:   id, name: EMPLOYEE_LIST[id]
          })
        })
      }
      _.sortBy(reps, function(rep) { return rep.name }).map(function(rep) {
        repFld.addSelectOption({ value: rep.id || "none", text: rep.name || "- None -" })
      })
    } else if (runtime.getCurrentUser().id == THOMAS_PRESTNEY_ID ) {
      var repFld = form.addField({
        id: 'custpage_salesrep', type: ui.FieldType.SELECT, label: 'Filter by Rep', container: 'filters'
      })
      repFld.addSelectOption({ value: "all", text: '- All - ', isSelected: true })
      var teamList = lib.GetTeamList(),
          reps = []
      teamList[1].list.map(function(id) {
        reps.push({
          id:   id, name: EMPLOYEE_LIST[id]
        })
      })
      _.sortBy(reps, function(rep) { return rep.name }).map(function(rep) {
        repFld.addSelectOption({ value: rep.id || "none", text: rep.name || "- None -" })
      })
    }

    form.addFieldGroup({ id: 'mapfilters', label: 'Map Filters' })
    var byStageFld = form.addField({
      id: 'custpage_bystage', type: ui.FieldType.SELECT, label: 'By Stage', container: 'mapfilters'
    })
    byStageFld.addSelectOption({ value: 'all', text: '- All -', isSelected: true })
    lib.GetStatusList().map(function(status) {
      byStageFld.addSelectOption({ value: status.id || "none", text: status.name || "- None -" })
    })
    var byActionFld = form.addField({
      id: 'custpage_byaction', type: ui.FieldType.SELECT, label: 'By Last Action', container: 'mapfilters'
    })
    byActionFld.updateBreakType({
      breakType: ui.FieldBreakType.STARTCOL
    })
    byActionFld.addSelectOption({ value: 'all', text: '- All -', isSelected: true })
    lib.GetActionListForSelect().map(function(action) {
      byActionFld.addSelectOption({ value: action.id || "none", text: action.name || "- None -" })
    })
    var marketSegFld = form.addField({
      id: 'custpage_mktgseg', type: ui.FieldType.SELECT, label: 'Market Segment', container: 'mapfilters'
    })
    marketSegFld.addSelectOption({ value: 'all', text: '- All -', isSelected: true })
    marketSegFld.updateLayoutType({
      layoutType: ui.FieldLayoutType.STARTROW
    })
    marketSegFld.updateBreakType({
      breakType: ui.FieldBreakType.STARTCOL
    })
    search.create({
      type: 'customlist3', columns: [ search.createColumn({ name: 'name' }) ]
    }).run().each(function(result) {
      marketSegFld.addSelectOption({ value: result.id, text: result.getValue({ name: 'name' }) })
      return true
    })
    var createdAfter = form.addField({
      id: 'custpage_createdafter', type: ui.FieldType.DATE, label: 'Created After', container: 'mapfilters'
    })
    createdAfter.updateLayoutType({
      layoutType: ui.FieldLayoutType.ENDROW
    })

    // collect the lat/longs we're interested in
    //by who is logging in, lets set the filters
    var filters = [
      ['isinactive', 'is', 'F'], 'and',
      ['formulanumeric:LENGTH({custentity_lat})', 'greaterthan', 0], 'and',
      ['formulanumeric:LENGTH({custentity_lng})', 'greaterthan', 0]
    ]
    if (runtime.getCurrentUser().role == '1002' && runtime.getCurrentUser().id != THOMAS_PRESTNEY_ID) {
      filters.push('and', ['salesrep', 'anyof', runtime.getCurrentUser().id])
    } else if (runtime.getCurrentUser().id == THOMAS_PRESTNEY_ID ) {
      filters.push('and', ['salesrep', 'anyof', teamList[1].list])
    }
    if (context.request.parameters.team == 'organic') {
      filters.push('and', ['salesrep', 'anyof', teamList[0].list])
    } else if (context.request.parameters.team == THOMAS_PRESTNEY_ID) {
      filters.push('and', ['salesrep', 'anyof', teamList[1].list])
    }
    var pagedSearch = search.create({
      type: search.Type.CUSTOMER, filters: filters, columns: [
        search.createColumn({ name: 'custentity_lat' }),
        search.createColumn({ name: 'custentity_lng' }),
        search.createColumn({ name: 'billaddress' }),
        search.createColumn({ name: 'billaddress1' }),
        search.createColumn({ name: 'billaddress2' }),
        search.createColumn({ name: 'billaddress3' }),
        search.createColumn({ name: 'billcity' }),
        search.createColumn({ name: 'billstate' }),
        search.createColumn({ name: 'billcountry' }),
        search.createColumn({ name: 'billzipcode' }),
        search.createColumn({ name: 'phone' }),
        search.createColumn({ name: 'email' }),
        search.createColumn({ name: 'status' }),
        search.createColumn({ name: 'salesrep' }),
        search.createColumn({ name: 'datecreated' }),
        search.createColumn({ name: 'custentity8' }),
        search.createColumn({ name: 'custentity_dd_mostrecentaction' }),
        search.createColumn({ name: 'altName', sort: search.Sort.ASC })
      ]
    }).runPaged({
      pageSize: 1000
    })
    var customerData = [],
        ACTION_LIST = lib.GetActionList(),
        EMPLOYEE_LIST = lib.GetEmployeeList()
        STATUS_LIST = lib.GetStatusListByID()
    pagedSearch.pageRanges.forEach(function(pageRange) {
      pagedSearch.fetch({ index: pageRange.index }).data.forEach(function(result) {
        var billaddress = []
        if (result.getValue({ name: 'billaddress1' })) billaddress.push(result.getValue({ name: 'billaddress1' })+"\n")
        if (result.getValue({ name: 'billaddress2' })) billaddress.push(result.getValue({ name: 'billaddress2' })+"\n")
        if (result.getValue({ name: 'billaddress3' })) billaddress.push(result.getValue({ name: 'billaddress3' })+"\n")
        if (result.getValue({ name: 'billcity' })) billaddress.push(result.getValue({ name: 'billcity' })+" ")
        if (result.getValue({ name: 'billstate' })) billaddress.push(result.getValue({ name: 'billstate' })+" ")
        if (result.getValue({ name: 'billcountry' })) billaddress.push(result.getValue({ name: 'billcountry' })+" ")
        if (result.getValue({ name: 'billzipcode' })) billaddress.push(result.getValue({ name: 'billzipcode' }))
        customerData.push({
          id:           result.id,
          url:          url.resolveRecord({
            recordType: result.recordType, recordId: result.id
          }),
          location: {
            lat:        parseFloat(result.getValue({ name: 'custentity_lat' })),
            lng:        parseFloat(result.getValue({ name: 'custentity_lng' }))
          },
          marketsegment:result.getValue({ name: 'custentity8' }),
          created:      moment(result.getValue({ name: 'datecreated' }), 'M/D/YYYY').format('M/D/YYYY'),
          name:         result.getValue({ name: 'altName' }),
          address:      billaddress.join(''),
          phone:        result.getValue({ name: 'phone' }),
          email:        result.getValue({ name: 'email' }),
          salesrep: {
            id:         result.getValue({ name: 'salesrep' }) || null,
            name:       EMPLOYEE_LIST[result.getValue({ name: 'salesrep' })] || null,
            initials:   EMPLOYEE_LIST[result.getValue({ name: 'salesrep' })] ? EMPLOYEE_LIST[result.getValue({ name: 'salesrep' })].split(' ').map(function (s) { return s.charAt(0); }).join('') : ''
          },
          status: {
            id:         result.getValue({ name: 'status' }),
            name:       STATUS_LIST[result.getValue({ name: 'status' })] ? STATUS_LIST[result.getValue({ name: 'status' })].name : '- None -',
            color:      STATUS_LIST[result.getValue({ name: 'status' })] ? STATUS_LIST[result.getValue({ name: 'status' })].color : 'FF007F'
          },
          action: {
            id:         result.getValue({ name: 'custentity_dd_mostrecentaction' }),
            name:       ACTION_LIST[result.getValue({ name: 'custentity_dd_mostrecentaction' })]
          }
        })
      })
    })
    form.addField({
      id: 'custpage_script', type: ui.FieldType.INLINEHTML, label: 's'
    }).defaultValue = '<script type="text/javascript">var CUSTOMERDATA = '+JSON.stringify(customerData)+'; var STATUS_LIST = '+JSON.stringify(lib.GetStatusList())+'; var DD_BASEURL = "'+url.resolveScript({
      scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId
    })+'"</script>'

    if (context.request.parameters.customer) {
      var customerDetails = search.lookupFields({
        type: record.Type.CUSTOMER, id: context.request.parameters.customer, columns: [
          'custentity_lat', 'custentity_lng'
        ]
      })
      form.addField({
        id: 'custpage_centering', type: ui.FieldType.INLINEHTML, label: 's'
      }).defaultValue = '<script type="text/javascript">var DD_DEFAULT_VISIBLE = "'+context.request.parameters.customer+'"; var DD_CENTER = '+JSON.stringify({
        lat:  customerDetails.custentity_lat,
        lng:  customerDetails.custentity_lng
      })+';</script>'
    }

    form.addField({
      id: 'custpage_content', type: ui.FieldType.INLINEHTML, label: 's'
    }).defaultValue = file.load({
      id: 'SuiteScripts/dundee_maps_cl.html'
    }).getContents()

    form.addFieldGroup({ id: 'map', label: 'Map' })
    form.addField({
      id: 'custpage_mapcontent', type: ui.FieldType.INLINEHTML, label: 'map', container: 'map'
    }).defaultValue = '<div width="100%" id="dd_container" data-bind="template: \'maps-body\'"></div>'
    ;[
      'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/knockout/3.4.0/knockout-min.js',
      'https://maps.googleapis.com/maps/api/js?extension=.js',
      'https://system.na1.netsuite.com/core/media/media.nl?id=548&c=4462569&h=acf7f123521fba139ac0&_xt=.js'
    ].map(function(script, index) {
      form.addField({
        id: 'custpage_script_'+index.toString(), type: ui.FieldType.INLINEHTML, label: 'script_'+index.toString()
      }).defaultValue = "<script type='text/javascript' src='"+script+"'></script>";
    })

    // collect the information on each of the customers based upon lat longs found.
    form.clientScriptFileId = file.load({
      id: 'SuiteScripts/dundee_maps_cl.js'
    }).id
    return context.response.writePage(form)


  }

  return {
    onRequest: onRequest
  }

})
