/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define([
  'N/search',
  'N/record',
  'N/runtime',
  'N/https'
], function(search, record, runtime, https) {

  var rt = function() { return ['(', runtime.getCurrentScript().getRemainingUsage(), ')'].join('') }

  var execute = function(context) {

    log.audit("STARTING!!!!")

    // find out which customers we need to grab for
    var pagedSearch = search.create({
      type: record.Type.LEAD, filters: [
        ['isinactive', 'is', 'F'], 'and',
        ['formulanumeric:LENGTH({custentity_lat})', 'notgreaterthan', 0], 'and',
        ['formulanumeric:LENGTH({custentity_lng})', 'notgreaterthan', 0], 'and',
        ['formulanumeric:LENGTH({billaddress})', 'greaterthan', 0]
      ], columns: [
        search.createColumn({ name: 'billaddress' }),
        search.createColumn({ name: 'billaddress1' }),
        search.createColumn({ name: 'billaddress2' }),
        search.createColumn({ name: 'billaddress3' }),
        search.createColumn({ name: 'billcity' }),
        search.createColumn({ name: 'billstate' }),
        search.createColumn({ name: 'billcountry' }),
        search.createColumn({ name: 'billzipcode' }),
        search.createColumn({ name: 'altName', sort: search.Sort.ASC })
      ]
    }).runPaged({
      pageSize: 1000
    })
    var customerData = []

    pagedSearch.pageRanges.forEach(function(pageRange) {
      pagedSearch.fetch({ index: pageRange.index }).data.forEach(function(result) {
        if (!result.getValue({ name: 'billaddress' })) return
        var billaddress = []
        if (result.getValue({ name: 'billaddress1' })) billaddress.push(result.getValue({ name: 'billaddress1' }))
        if (result.getValue({ name: 'billaddress2' })) billaddress.push(result.getValue({ name: 'billaddress2' }))
        if (result.getValue({ name: 'billaddress3' })) billaddress.push(result.getValue({ name: 'billaddress3' }))
        if (result.getValue({ name: 'billcity' })) billaddress.push(result.getValue({ name: 'billcity' }))
        if (result.getValue({ name: 'billstate' })) billaddress.push(result.getValue({ name: 'billstate' }))
        if (result.getValue({ name: 'billcountry' })) billaddress.push(result.getValue({ name: 'billcountry' }))
        if (result.getValue({ name: 'billzipcode' })) billaddress.push(result.getValue({ name: 'billzipcode' }))
        billaddress = billaddress.join(' ').replace(/\n/ig,' ').replace(/RR#1/ig,'')

        customerData.push({
          id:       result.id,
          name:     result.getValue({ name: 'altName' }),
          address:  billaddress
        })
      })
    })

    log.audit(["Working on", customerData.length, 'customers', rt()].join(' '))

    if (!customerData.length) {
      log.audit("Nothing more to work on.", "terminating")
      return
    }

    customerData.map(function(customer, index) {
      log.debug(["--> Working on customer ", (index+1).toString(), 'of', customerData.length, rt()].join(" "), customer.name)

      var parameters = {
        key:      'AIzaSyCbQRqT9N9O9kKz1hAlCEs8CxbRPbg2pjE',
        address:  customer.address.replace(/\n/ig,' ')
      }
      var query = Object.keys(parameters).map(function(key) {
  			return key + '=' + encodeURI(parameters[key])
  		}).join('&')

      try {
        var response = JSON.parse(https.get({
          url: 'https://maps.googleapis.com/maps/api/geocode/json' + (query ? '?' + query : '')
        }).body)
      } catch(e) {
        log.error("--> Could not gather lat/long for "+customer.name+' '+rt(), e)
        return
      }

      if (response.status != 'OK') {
        log.error("--> Could not gather lat/long for "+rt(), customer.address)
        return
      }

      if (response.results.length && response.results[0] && response.results[0].geometry) {
        record.submitFields({
          type: record.Type.CUSTOMER, id: customer.id, values: {
            custentity_lat: response.results[0].geometry.location.lat,
            custentity_lng: response.results[0].geometry.location.lng
          }, options: {
            enablesourcing: false, ignoreMandatoryFields: true
          }
        })
        log.debug("Added for customer "+rt(), customer.name)
      } else log.audit("--> Did not get lat/long for "+rt(), customer.name)

    })

    log.audit("Completed!", rt())

  }

  return {
    execute: execute
  }

})
