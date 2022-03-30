/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['SuiteScripts/moment.js'], function(moment) {

  var team = null, salesrep = null, start = null, end = null

  var pageInit = function(context) {
    window.onbeforeunload = function() {}
    team = context.currentRecord.getValue({ fieldId: 'custpage_team' })
    salesrep = context.currentRecord.getValue({ fieldId: 'custpage_salesrep' })
    start = context.currentRecord.getValue({ fieldId: 'custpage_start' })
    end = context.currentRecord.getValue({ fieldId: 'custpage_end' })
    jQuery("#tr_fg_report > td")[1].remove()
    if (jQuery("#tr_fg_report > td")[1]) jQuery("#tr_fg_report > td")[1].remove()
    jQuery("#historicalblock").html(Handlebars.compile(jQuery("#DD_BLOCK_HISTORICAL").html())(DD_DATA_OBJ))
  }

  var fieldChanged = function(context) {
    team = context.currentRecord.getValue({ fieldId: 'custpage_team' })
    salesrep = context.currentRecord.getValue({ fieldId: 'custpage_salesrep' })
    start = context.currentRecord.getValue({ fieldId: 'custpage_start' })
    end = context.currentRecord.getValue({ fieldId: 'custpage_end' })
  }

  var saveRecord = function(context) {
    if (start != 'Today' && (moment(end, 'M/D/YYYY').isAfter(moment(start, 'M/D/YYYY'))))
      return alert('End Date must be before the Start Date.')
    if (start != 'Today' && end == 'Today')
      return alert('End Date must be before the Start Date.')
    return true
  }

  var PrintXLS = function() {
		if (team == undefined) team = 'all'
    if (salesrep == undefined) salesrep = 'all'
    if (start == undefined) start = 'Today'
    if (end == undefined) end = 'Today'
    var params = ['action=printxls', 'team='+team, 'salesrep='+salesrep, 'start='+start, 'end='+end]
    return window.open(RELOADURL+'&'+params.join('&'), '_blank')
  }

  return {
    pageInit: pageInit, fieldChanged: fieldChanged, saveRecord: saveRecord, printxls: PrintXLS
  }

})
