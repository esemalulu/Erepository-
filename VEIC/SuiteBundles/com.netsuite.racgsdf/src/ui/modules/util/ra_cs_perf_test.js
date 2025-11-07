/**
 * © 2015 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

Ext4.define('RA.App.PerfTestLogger', {
	singleton: true,
	constructor: function () {
		var allowedIds = new Array(37395, 37367, 59326, 59322, 67307, 67308);
		this.isProduction = Ext4.Array.indexOf(allowedIds, nsBundleId) == -1;
		this.eventMap = {};
		this.reportMap = {};
	},
	start: function (event) {
		var s = Date.now();
		if (this.isProduction) return;
		if (!event) {
			this.log('Error: No input in start.');
			return;
		}
		this.event = event.toUpperCase();
		//if (this.eventMap.hasOwnProperty(this.event)) {
		//    this.log(this.event + ' was not properly stopped.');
		//    return;
		//}
		this.runTime = 0;
		this.eventMap[this.event] = Date.now();
		//this.log('start | ' + (Date.now() - s) + ' ms');
	},
	stop: function (event) {
		var s = Date.now();
		if (this.isProduction) return;
		/*
		 * set this.event to event parameter if not empty; otherwise use current value of this.event (set during most recent start)
		 */
		if (event) this.event = event.toUpperCase();
		if (!this.eventMap.hasOwnProperty(this.event)) {
			//this.log(this.event + ' was not properly started.');
			return;
		}
		this.runTime = s - this.eventMap[this.event];
		delete this.eventMap[this.event];
		this.log(this.event + ' | ' + this.runTime + ' ms');
		/*
		 * for reporting
		 */
		if (!this.reportMap.hasOwnProperty(this.event)) this.reportMap[this.event] = new Array();
		this.reportMap[this.event].push(this.runTime);
		//this.log('stop | ' + (Date.now() - s) + ' ms');
	},
	startEvent: function (event) {
		this.start(event);
	},
	stopEvent: function (event) {
		this.stop(event);
	},
	log: function (msg) {
		console.log('RA.App.PerfTestLogger | ' + msg);
	},
	generateReport: function (minExecution) {
		//TODO: html report
		var css = "";
		css += "<style>";
		css += "* { font-family: Verdana; font-size: 11px; color: #000; }";
		css += "table { border-top: 1px solid #000; border-right: 1px solid #000; margin: 0; padding: 0; }";
		css += "td { border-bottom: 1px solid #000; border-left: 1px solid #000; margin: 0; padding: 5px; width: 100px; text-align: center; }";
		css += ".header, .average { background-color: #555; color: #FFF; }";
		css += ".left { font-weight: bold; }";
		css += "</style>";
		var html = "";
		html += "<table cellspacing='0' cellpadding='0'>";
		/*
		 * write headers
		 */
		html += "<tr>";
		html += "<td class='header left'>EVENT</td>";
		for (var prop in this.reportMap) {
			html += "<td class='header'>" + prop + "</td>";
		}
		html += "</tr>";
		/*
		 * write data
		 */
		var max = this.getMaxCount();
		for (var i = 0; i < max; i++) {
			html += "<tr>";
			html += "<td class='header left'>RUN #" + (i + 1) + "</td>";
			for (var prop in this.reportMap) {
				var val = "&nbsp;";
				if (this.reportMap[prop][i]) {
					val = this.reportMap[prop][i];
				}
				html += "<td>" + val + "</td>";
			}
			html += "</tr>";
		}
		/*
		 * write averages
		 */
		html += "<tr>";
		html += "<td class='header left'>AVERAGE</td>";
		for (var prop in this.reportMap) {
			html += "<td class='average'>" + this.getAverage(this.reportMap[prop]) + "</td>";
		}
		html += "</tr>";
		html += "</table>";
		var reportWin = window.open("", "Performance Testing Report");
		reportWin.document.write(css + html);
	},
	getMaxCount: function () {
		var max = 0;
		for (var prop in this.reportMap) {
			if (this.reportMap[prop].length > max) max = this.reportMap[prop].length;
		}
		return max;
	},
	getAverage: function (arr) {
		var summ = 0;
		for (var i = 0; i < arr.length; i++) {
			summ += arr[i];
		}
		return (summ / arr.length).toFixed(0);
	}
});
RA.App.PerfTestLogger.start('First Load');
var perfTestLogger = RA.App.PerfTestLogger;
