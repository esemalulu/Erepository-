/**
 * Changes all IM2950RL-2017 models to IM2970RL-2018.
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Oct 2017     Jacob Shetler
 *
 */

var MODEL_2950 = '37085';
var MODEL_2970 = '42318'; //SANDBOX is '41282', PRODUCTION is '42318'

/**
 * Mass Update entry
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_UpdateImagineModels_MU(recType, recId)
{
	var soRec = nlapiLoadRecord(recType, recId, {recordmode: 'dynamic'});
	soRec.setFieldValue('custbodyrvsmodel', MODEL_2970);

	//Update the line to have the new model.
	for (var i = 1; i <= soRec.getLineItemCount('item'); i++)
	{
		if(soRec.getLineItemValue('item', 'item', i) == MODEL_2950)
		{
			soRec.selectLineItem('item', i);
			soRec.setCurrentLineItemValue('item', 'item', MODEL_2970);
			soRec.commitLineItem('item');
			//submit the record
			nlapiSubmitRecord(soRec, true, true);
			//Update the unit
			//nlapiSubmitField('customrecordrvsunit', soRec.getFieldValue('custbodyrvsunit'), 'custrecordunit_model', MODEL_2970);
			break;
		}
	}
}
