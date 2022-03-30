
//CORRECT-24th Issue HistoricalBaselineMRR-Actual With REF IS NEW
var searchref = 'customsearch4057';

/**
 * Columns to use:
 *  0 = Date Created
 *  1 = History Type
 *  2 = Line Value (Dollar Value) custrecord_hbmrr_linevalue
 *  3 = Actual Base MRR Ref
 *  4 = Line value FROM Actual Base MRR Ref
 *  5 = Projection
 *  6 = History Delta Value custrecord_abmrr_deltavalue
 *  7 = History Actual Current Value custrecord_abmrr_actualcurrval
 *  8 = History Tech. Delta Value custrecordhbmrr_techdeltavalue
 *  9 = History Tech Actual Current Value custrecord_hbmrr_techactualcurrent
 *  10 = Actual Base MRR Tech. Line Value
 *  11 = History Tech. Line Value
*/

var lastProc = '1169',
	flt = null;

if (lastProc)
{
	flt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', lastProc)];
}

var ss = nlapiSearchRecord(null,searchref, flt, null);
for (var i=0; i < ss.length; i+=1)
{
	//This update, we are setting Delta to Line Value, Actual Current Value to 0
	//			   Empty out custrecord_hbmrr_techactualcurrent, custrecordhbmrr_techdeltavalue
	
	var flds = ['custrecord_abmrr_actualcurrval',
	            'custrecord_abmrr_deltavalue',
	            'custrecordhbmrr_techdeltavalue',
	            'custrecord_hbmrr_techactualcurrent'],
		vals = ['0',
		        ss[i].getValue('custrecord_hbmrr_linevalue'),
		        '',
		        ''];
	nlapiSubmitField('customrecord_ax_historybaseline_mrr', ss[i].getId(), flds, vals, false);
	
	alert('process '+ss[i].getId());
}