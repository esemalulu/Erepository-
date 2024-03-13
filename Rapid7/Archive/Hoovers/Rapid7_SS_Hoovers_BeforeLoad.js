function beforeLoad(type, form, request){
	if(type=='view'){
	form.addButton('custpage_findCompetition', 'Find Competitors', 'findCompetitors2()');
	form.addButton('custpage_findCompetition', 'Update Data', 'updateData()');
	var srcCode = form.addField('custpage_viewcode', 'longtext', 'some label');
	var txt = "\n<script src='https://system.netsuite.com/core/media/media.nl?id=24275&c=663271&h=d8e03c801215610d811b&_xt=.js'></script>";
	srcCode.setDefaultValue(txt);
	srcCode.setDisplayType('hidden');	
	form.setScript('customscripthoovers_findcompetitors');
	}
}