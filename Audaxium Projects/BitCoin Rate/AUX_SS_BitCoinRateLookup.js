
var bitCoinChartsUrl = 'http://api.bitcoincharts.com/v1/markets.json';

function lookupBitCoinRate() {
	
	var curtbl = {};
	var bittbl = {};
	//search for all available currency 
	var curflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
	var curcol = [new nlobjSearchColumn('name'),
	              new nlobjSearchColumn('custrecord_bct_name')];
	var currs = nlapiSearchRecord('customrecord_bitcoin_currency', null, curflt, curcol);
	for (var c=0; currs && c < currs.length; c++) {
		if (!curtbl[currs[c].getValue('name')]) {
			curtbl[currs[c].getValue('name')] = {};
		}
		curtbl[currs[c].getValue('name')]['name'] = currs[c].getValue('custrecord_bct_name');
		curtbl[currs[c].getValue('name')]['id'] = currs[c].getId();
	}
	
	//search for all bitcoin rates
	var bflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
	var bcol = [new nlobjSearchColumn('name')];
	var brs = nlapiSearchRecord('customrecord_aux_bitcoinexc_rates', null, bflt, bcol);
	for (var b=0; brs && b < brs.length; b++) {
		if (!bittbl[brs[b].getValue('name')]) {
			bittbl[brs[b].getValue('name')] = '';
		}
		bittbl[brs[b].getValue('name')] = brs[b].getId();
	}
	
	
	var curDate = new Date();
	var syncDate = nlapiDateToString(curDate, 'datetimetz');
	
	
	try {
		var bcres = nlapiRequestURL(bitCoinChartsUrl,null, null);
		log('debug','res',bcres.getBody());
		var mktJson = JSON.parse(bcres.getBody());
		
		//loop through and add/update each market values
		for (var i in mktJson) {
			var oj = mktJson[i];
			var lastTradeDate = '';
			if (oj.latest_trade) {
				lastTradeDate = nlapiDateToString(new Date(parseInt(oj.latest_trade)*1000),'datetimetz');
			}
			var closeAmt = '';
			if (oj.close && oj.close != 'null') {
				closeAmt = parseFloat(oj.close);
			}
			var bidPrice = '';
			if (oj.bid && oj.bid != 'null') {
				bidPrice = parseFloat(oj.bid);
			}
			var askPrice = '';
			if (oj.ask && oj.ask != 'null') {
				askPrice = parseFloat(oj.ask);
			}
			
			if (!bittbl[oj.symbol]) {
				//create new record
				var brec = nlapiCreateRecord('customrecord_aux_bitcoinexc_rates');
				brec.setFieldValue('name', oj.symbol);
				brec.setFieldText('custrecord_ber_currency', oj.currency);
				brec.setFieldValue('custrecord_ber_lastupdated', syncDate);
				brec.setFieldValue('custrecord_ber_last_trade_datetime', lastTradeDate);
				brec.setFieldValue('custrecord_ber_latest_price', closeAmt);
				brec.setFieldValue('custrecord_ber_high_bid', bidPrice);
				brec.setFieldValue('custrecord_ber_low_ask_price', askPrice);
				nlapiSubmitRecord(brec, true, true);
				
			} else {
				//update
				var updFlds = ['custrecord_ber_lastupdated', 'custrecord_ber_last_trade_datetime','custrecord_ber_latest_price','custrecord_ber_high_bid','custrecord_ber_low_ask_price'];
				var updVals = [syncDate, lastTradeDate, closeAmt, bidPrice, askPrice];
				nlapiSubmitFields('customrecord_aux_bitcoinexc_rates', bittbl[oj.symbol], updFlds, updVals, true);
			}
			
		}
		
	} catch (er) {
		log('error','Error Processing BitCoin Update',getErrText(er));
	}
	
	
	
	
	
	
}