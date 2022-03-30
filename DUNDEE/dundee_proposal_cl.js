/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(
	['N/runtime', 'N/record', 'N/runtime', 'SuiteScripts/underscore.js'],
function(runtime, record, runtime, _) {

	var proposal = null, baseurl = null, baseswitches = [
		'custpage_origleaseagreement',
		'custpage_govissuedid',
		'custpage_recentanntax',
		'custpage_prooflastpay',
		'custpage_twoyearleasepay',
		'custpage_constatingdoc'
	], baseparams = []

	var pageInit = function(context) {
		window.onbeforeunload = function() {}
		proposal = context.currentRecord.getValue({
			fieldId: 'custpage_proposalid'
		})
		baseurl = context.currentRecord.getValue({
			fieldId: 'custpage_baseurl'
		})
		baseparams = baseswitches.map(function(param) {
			return [param.replace(/custpage/i, 'custparam'), 'T'].join('=')
		})
	}

	var fieldChanged = function(context) {
		if (baseswitches.indexOf(context.fieldId) > -1) {
			baseparams = baseswitches.map(function(param) {
				return [param.replace(/custpage/i, 'custparam'), (function() {
					return context.currentRecord.getValue({ fieldId: param }) ? 'T' : 'F'
				})()].join('=')
			})
		}
	}

	var saveRecord = function(context) {
		// if the due diligence stuff is present, validate at least one is there.
		if (context.currentRecord.getValue({
			fieldId: 'custpage_origleaseagreement'
		}) != undefined) {
			var onedoc = _.reduce(baseswitches, function(memo, num) {
				if (context.currentRecord.getValue({ fieldId: num }))
					return memo + 1
				else return memo
			}, 0)
			if (!onedoc) return alert('At least one document must be requested.')
		}
		return true
	}

	/* button methods */
	var close = function() { return window.close(); }
	var previewProposal = function() {
		return window.open([baseurl, 'action=previewproposal'].concat(baseparams).join('&'), '_blank')
	}
	var previewDD = function() {
		return window.open([baseurl, 'action=previewdd'].concat(baseparams).join('&'), '_blank')
	}

	return {
		pageInit: pageInit,
		fieldChanged: fieldChanged,
		saveRecord: saveRecord,
		close: close,
		previewProposal: previewProposal,
		previewDD: previewDD
	}

})
