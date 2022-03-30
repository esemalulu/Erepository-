/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([
  'N/record',
  'N/search',
  'N/https',
  'N/runtime',
  'N/url'
], function(record, search, https, runtime, url) {

  var beforeLoad = function(context) {
    if ([
      context.UserEventType.VIEW
    ].indexOf(context.type) == -1)
      return //nothing to do

    if (runtime.executionContext != runtime.ContextType.USER_INTERFACE) return

    if (context.newRecord.getValue({ fieldId: 'custentity_lat' }) && context.newRecord.getValue({ fieldId: 'custentity_lng' })) {
      var mapurl = url.resolveScript({
        scriptId: 'customscript_dundee_maps_report', deploymentId: 1, params: {
          customer: context.newRecord.id
        }
      })
      context.form.addButton({
        id: 'custpage_showddmap', label: 'Show Map', functionName: '(function() { return window.open(\''+mapurl+'\', \'_blank\'); })'
      })
    }

    if (runtime.getCurrentUser().id == "4099" && context.newRecord.getValue({ fieldId: 'custentity_lat' }) && context.newRecord.getValue({ fieldId: 'custentity_lng' })) {
      var mapurl = url.resolveScript({
        scriptId: 'customscript_dundee_maps_report', deploymentId: 1, params: {
          customer: context.newRecord.id, action: 'clean'
        }
      })
      context.form.addButton({
        id: 'custpage_showddmap', label: 'Clean GeoCodes', functionName: '(function() { return window.location.href = \''+mapurl+'\'; })'
      })
    }
  }

  var afterSubmit = function(context) {
    if ([
      context.UserEventType.CREATE,
      context.UserEventType.EDIT
    ].indexOf(context.type) == -1)
      return //nothing to do

    var addr = search.lookupFields({
      type: record.Type.CUSTOMER, id: context.newRecord.id, columns: [
        'billaddress',
        'billaddress1',
        'billaddress2',
        'billaddress3',
        'billcity',
        'billstate',
        'billcountry',
        'billzipcode'
      ]
    })
    log.debug("billaddress bf", addr.billaddress)
    if (!addr.billaddress) return
    var billaddress = []
    if (addr.billaddress1) billaddress.push(addr.billaddress1)
    if (addr.billaddress2) billaddress.push(addr.billaddress2)
    if (addr.billaddress3) billaddress.push(addr.billaddress3)
    if (addr.billcity) billaddress.push(addr.billcity)
    if (addr.billstate && addr.billstate.length && addr.billstate[0].text) billaddress.push(addr.billstate[0].text)
    if (addr.billcountry && addr.billcountry.length && addr.billcountry[0].text) billaddress.push(addr.billcountry[0].text)
    if (addr.billzipcode) billaddress.push(addr.billzipcode)
    billaddress = billaddress.join(' ')

    log.debug("billaddress af", billaddress.replace(/\n/ig,' ').replace(/RR#\d/ig,''))
    if (!billaddress) return

    var parameters = {
      key:      'AIzaSyCbQRqT9N9O9kKz1hAlCEs8CxbRPbg2pjE',
      address:  billaddress.replace(/\n/ig,' ').replace(/RR#\d/ig,'')
    }
    var query = Object.keys(parameters).map(function(key) {
      return key + '=' + encodeURI(parameters[key])
    }).join('&')

    try {
      var response = JSON.parse(https.get({
        url: 'https://maps.googleapis.com/maps/api/geocode/json' + (query ? '?' + query : '')
      }).body)
    } catch(e) {
      log.error("--> Could not gather lat/long for "+context.newRecord.getValue({
        fieldId: 'entityid'
      }), e)
      return
    }

    if (response.status != 'OK') {
      log.error("--> Could not gather lat/long for", billaddress)
      return
    }

    if (response.results.length && response.results[0] && response.results[0].geometry) {
      log.debug("url", 'https://maps.googleapis.com/maps/api/geocode/json' + (query ? '?' + query : ''))
      log.debug('location', response.results[0].geometry)
      record.submitFields({
        type: record.Type.CUSTOMER, id: context.newRecord.id, values: {
          custentity_lat: response.results[0].geometry.location.lat,
          custentity_lng: response.results[0].geometry.location.lng
        }, options: {
          enablesourcing: false, ignoreMandatoryFields: true
        }
      })
      log.debug("Added for customer", context.newRecord.getValue({
        fieldId: 'entityid'
      }))
    } else log.audit("--> Did not get lat/long for", context.newRecord.getValue({
      fieldId: 'entityid'
    }))

  }

  return {
    beforeLoad: beforeLoad, afterSubmit: afterSubmit
  }
})
