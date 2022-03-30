/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define([], function() {

  var pageInit = function(context) {
    console.log('pageIn and out, ok, lets')
  }

  var fieldChanged = function(context) {

  }

  return {
    pageInit: pageInit, fieldChanged: fieldChanged
  }
})
