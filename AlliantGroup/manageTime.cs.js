var timeManage = new (function(){

	function tty(msg){ if (window && window.console) console.log(msg);}

	this.fieldChanged = function(type, name, linenum){
		if(name == 'custpage_project_list'){
			var jobId = nlapiGetFieldValue('custpage_project_list');
			tty('setting: '+ jobId);
			nlapiSetFieldValue('customer', jobId, true, true);
			nlapiRequestURL(nlapiResolveURL('SUITELET', 'customscript_get_time_entry_info', 'customdeploy_get_time_entry_info') +"&custpage_jobid="+jobId, null, null,
				function(resp){
					var obj = JSON ? JSON.parse(resp.getBody()) : eval('('+ resp.getBody()+ ')');
					if(obj.success){
						nlapiSetFieldValue('class', obj.jobType);
						nlapiSetFieldValue('location', obj.jobLocn);
						nlapiSetFieldValue('department', obj.jobDept);
					}
				});
		}

		if(name == 'hours'){
			var dur = nlapiGetFieldValue('hours');

			var mins = parseInt(dur.replace(/.*:/, ''),10);
			var hrs = parseInt(dur.replace(/:.*/, ''), 10);

			var billMinutes = 15* Math.ceil(mins /15);
			if(billMinutes == 60) dur = (hrs + 1) + ':00';
			else dur = hrs + ':' + ('0'+billMinutes).slice(-2);
			nlapiSetFieldValue('hours', dur, false);
		}
	};


	this.pageInit = function(type){
		nlapiSetFieldValue('isbillable', 'T');
		setTimeout(function(){
			var hrsField = document.getElementById('hours_fs');
			if(hrsField){
				var widgets = hrsField.getElementsByTagName('span');
				if(widgets && widgets.length){
					for(var i = widgets.length - 1; i>= 0; i--){
						var widget = widgets[i];
						if(widget.className.indexOf('field_widget_pos') != -1) widget.parentNode.removeChild(widget);
					}
				}
			}
			nlapiDisableField('customer', true);
			nlapiDisableField('department', true);
			nlapiDisableField('class', true);
		},500);
	};




})();