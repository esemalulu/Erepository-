/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define([
  'N/record', 'N/search', 'SuiteScripts/numeral.js'
], function(record, search, numeral) {

  var ADDRESSES = [], ACTUAL_ORIG_PERC = null

  var reset = function() {
		window.nlapiRemoveLineItemOption('item', 'custpage_addrchange')
		window.nlapiInsertLineItemOption('item', 'custpage_addrchange', '', '', true)
		ADDRESSES.map(function(addr, index) {
			window.nlapiInsertLineItemOption('item', 'custpage_addrchange', addr.id, addr.name)
		})
		window.nlapiSetCurrentLineItemValue('item', 'custpage_addrchange', '')
	}

  var GetCustomerAddresses = function(id) {
    if(!id) return []
    var addr = []
    var searchAddresses = search.create({
      type: 'job', filters: [
        ['internalid', 'anyof', id]
      ], columns: [
        search.createColumn({ name: 'addressinternalid', join: 'address' }),
        search.createColumn({ name: 'address1', join: 'address' }),
        search.createColumn({ name: 'address2', join: 'address' }),
        search.createColumn({ name: 'address3', join: 'address' }),
        search.createColumn({ name: 'city', join: 'address' }),
        search.createColumn({ name: 'state', join: 'address' })
      ]
    }).run().each(function(result) {
      var address = [result.getValue({ name: 'address1', join: 'address' })]
      if (result.getValue({ name: 'address2', join: 'address' }))
        address.push(result.getValue({ name: 'address2', join: 'address' }))
      if (result.getValue({ name: 'address3', join: 'address' }))
        address.push(result.getValue({ name: 'address3', join: 'address' }))
      if (result.getValue({ name: 'city', join: 'address' }))
        address.push(result.getValue({ name: 'city', join: 'address' }))
      if (result.getValue({ name: 'state', join: 'address' }))
        address.push(result.getValue({ name: 'state', join: 'address' }))
      addr.push({
        id: result.getValue({ name: 'addressinternalid', join: 'address' }),
        name: address.join(" ")
      })
      return true
    })
    return addr
  }

  var pageInit = function(context) {
    if (context.currentRecord.getValue({ fieldId: 'entity' })) {
      ADDRESSES = GetCustomerAddresses(context.currentRecord.getValue({ fieldId: 'entity' }))
      reset()
      window.nlapiCancelLineItem('item')
      if (window.nlapiGetLineItemCount('item') > 0) {
  			for (var i=1; i<=window.nlapiGetLineItemCount('item'); i++) {
  				window.nlapiSelectLineItem('item', i)
  				window.nlapiSetCurrentLineItemValue('item', 'custpage_addrchange', window.nlapiGetCurrentLineItemValue('item', 'custcol_dd_address'), false)
  				window.nlapiCommitLineItem('item')
  			}
  		}
      window.nlapiCancelLineItem('item')
    }
  }

  var fieldChanged = function(context) {
    if (context.fieldId == 'custpage_offertype') {
      context.currentRecord.setValue({
        fieldId: 'custbody_dundee_offertype', value: context.currentRecord.getValue({
          fieldId: 'custpage_offertype'
        })
      })
      if (!context.currentRecord.getValue({
        fieldId: 'custpage_offertype'
      })) return
      if (DUNDEESPARK_OFFERTYPES == undefined) return
      for (var i=0; i<context.currentRecord.getLineCount({
        sublistId: 'item'
      }); i++) {
        if (context.currentRecord.getSublistValue({
          sublistId: 'item', line: i, fieldId: 'amount'
        }) > 0) {
          var quantity = context.currentRecord.getSublistValue({
            sublistId: 'item', line: i, fieldId: 'quantity'
          }), rate = context.currentRecord.getSublistValue({
            sublistId: 'item', line: i, fieldId: 'rate'
          }), amount = context.currentRecord.getSublistValue({
            sublistId: 'item', line: i, fieldId: 'amount'
          })
          if (!quantity) break
          if (!amount) break
          if (!DUNDEESPARK_OFFERTYPES[context.currentRecord.getValue({
            fieldId: 'custpage_offertype'
          })]) break //safety, not really needed.
          context.currentRecord.selectLine({
            sublistId: 'item', line: i
          })
          context.currentRecord.setCurrentSublistValue({
            sublistId: 'item', fieldId: 'amount', value: (function() {
              var origOfferAmount = numeral(amount).divide(ORIG_PERC)
              return origOfferAmount.multiply(numeral(DUNDEESPARK_OFFERTYPES[context.currentRecord.getValue({
                fieldId: 'custpage_offertype'
              })])).value()
            })(), options: {
              ignoreFieldChange: true
            }
          })
          context.currentRecord.commitLine({
            sublistId: 'item'
          })
        }
      }
      ORIG_PERC = numeral(DUNDEESPARK_OFFERTYPES[context.currentRecord.getValue({
        fieldId: 'custpage_offertype'
      })]).value()
    }
  }

  var saveRecord = function(context) {
    if (context.currentRecord.getValue({
      fieldId: 'custpage_offertype'
    })) context.currentRecord.setValue({
      fieldId: 'custbody_dundee_offertype', value: context.currentRecord.getValue({
        fieldId: 'custpage_offertype'
      })
    })
    if (window.nlapiGetLineItemCount('item') > 0) {
      for (var i=1; i<=window.nlapiGetLineItemCount('item'); i++) {
        window.nlapiSelectLineItem('item', i)
        window.nlapiSetCurrentLineItemValue('item', 'custcol_dd_address', window.nlapiGetCurrentLineItemValue('item', 'custpage_addrchange'), false)
        window.nlapiCommitLineItem('item')
      }
    }
    return true
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    saveRecord: saveRecord
  }

})
