define(
	[
		'../adapter/proj_racg_ad_log', '../adapter/proj_racg_ad_search', '../adapter/proj_racg_ad_runtime',
		'N/record',
		'N/utilityFunctions'
	],

	function (rLog, rSearch, rRuntime, record, nUtil) {
        var module = {};

        module.getEmployeeSegments = function(params) {
            if (! rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
                return [];
            }
            rLog.startMethod('getEmployeeSegments');
			var mySegments = nUtil.serverCall('/app/accounting/project/racg/csegservice.nl', 'getCustomSegments', ['Employee'])['list'];
			var result = [];
			for (var i = 0; i < mySegments.length; i++) {
				result.push(mySegments[i].toLowerCase());
			}
            rLog.endMethod();
			return result;
        };

        module.getVendorSegments = function(params) {
            if (! rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
                return [];
            }
            rLog.startMethod('getVendorSegments');
			var mySegments = nUtil.serverCall('/app/accounting/project/racg/csegservice.nl', 'getCustomSegments', ['Vendor'])['list'];
			var result = [];
			for (var i = 0; i < mySegments.length; i++) {
				result.push(mySegments[i].toLowerCase());
			}
            rLog.endMethod();
			return result;
        };

        module.getGenericResourceSegments = function(params) {
            if (! rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
                return [];
            }
            rLog.startMethod('getGenericResourceSegments');
			var mySegments = nUtil.serverCall('/app/accounting/project/racg/csegservice.nl', 'getCustomSegments', ['GenericResource'])['list'];
			var result = [];
			for (var i = 0; i < mySegments.length; i++) {
				result.push(mySegments[i].toLowerCase());
			}
            rLog.endMethod();
			return result;
        };

        module.getSegmentTypes = function(params) {
            if (! rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
                return [];
            }
            rLog.startMethod('getSegmentTypes');
            var segments = [];
            var employeeSegments =  this.getEmployeeSegments();
            var vendorSegments =  this.getVendorSegments();
            var genericSegments =  this.getGenericResourceSegments();
            var searchResults = rSearch.getSearchResults({
                searchType: 'customsegment',
				filters: [],
				columns: [
					rSearch.createColumn({name: 'name'}),
					rSearch.createColumn({name: 'scriptid'})
				]
            });
            for (var i = 0; i < searchResults.length; i++) {
                var eachResult = searchResults[i],
                    segmentName = eachResult.getValue({name: 'name'}),
                    segmentScriptId = eachResult.getValue({name: 'scriptid'});
                rLog.debug("getting segment types", segmentName);
                if ((employeeSegments.indexOf(segmentScriptId) == -1) && (vendorSegments.indexOf(segmentScriptId) == -1) && (genericSegments.indexOf(segmentScriptId) == -1)) continue;
                var segment = {
                    id : segmentScriptId,
                    name : segmentName
                };
                segments.push(segment);
            }
            rLog.endMethod();
            return segments;
        };

        module.getSegmentInstances = function(params) {
            if (! rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
                return [];
            }
            rLog.startMethod('getSegmentInstances');
            var segmentInstances = [];
            var searchResults = rSearch.getSearchResults({
                searchType: 'customsegment',
				filters: [],
				columns: [
					rSearch.createColumn({name: 'name'}),
                rSearch.createColumn({name: 'scriptid'}),
					rSearch.createColumn({name: 'recordscriptid'})
				]
            });
            for (var i = 0; i < searchResults.length; i++) {
                var eachResult = searchResults[i],
                    segmentName = eachResult.getValue({name: 'name'}),
                    segmentScriptId = eachResult.getValue({name: 'scriptid'}),
                    segmentRecordSrciptId = eachResult.getValue({name: 'recordscriptid'});
                rLog.debug("getting segment values", segmentName);
                var segmentValues = this.getSegmentValues({segmentName: segmentRecordSrciptId});
                for (var jj = 0; jj < segmentValues.length; jj++) {
                    var segmentValue = segmentValues[jj];
                    segmentInstance = {
                        segment : segmentScriptId,
                        segmentDisplay : segmentName,
                        segmentValue : segmentValue.segmentValueScriptId,
                        segmentValueDisplay : segmentValue.segmentValueName
                    };
                    segmentInstances.push(segmentInstance);
                }
                rLog.debug("segment instances", JSON.stringify(segmentInstances));

            }
            rLog.endMethod();
            return segmentInstances;
        };

        module.getResourceSegmentValues = function(params) {
            if (! rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
                return [];
            }
            rLog.startMethod('getResourceSegmentValues');
            var segmentVals = [];
            var searchResults = rSearch.getSearchResults({
                searchType: 'customsegment',
				filters: [],
				columns: [
					rSearch.createColumn({name: 'name'}),
                    rSearch.createColumn({name: 'scriptid'}),
					rSearch.createColumn({name: 'recordscriptid'})
				]
            });
            for (var i = 0; i < searchResults.length; i++) {
                var eachResult = searchResults[i],
                    segmentName = eachResult.getValue({name: 'name'}),
                    segmentScriptId = eachResult.getValue({name: 'scriptid'}),
                    segmentRecordScriptId = eachResult.getValue({name: 'recordscriptid'});
                rLog.debug("looked up segment values", segmentScriptId + ': ' + JSON.stringify(params));
                if (segmentScriptId != params.segment) continue;
                var segmentValues = this.getSegmentValues({segmentName: segmentRecordScriptId});
                for (var j = 0; j < segmentValues.length; j++) {
                    var segmentValue = segmentValues[j];
                    segmentInstance = {
                        id: segmentValue.segmentValueScriptId,
                        name : segmentValue.segmentValueName
                    };
                    segmentVals.push(segmentInstance);
                }
                rLog.debug("segment instances", JSON.stringify(segmentVals));

            }
            rLog.endMethod();
            return segmentVals;
        };

        module.getSegmentValues = function(params) {
            if (! rRuntime.isFeatureEnabled({feature: 'CUSTOMSEGMENTS'})) {
                return [];
            }
            rLog.startMethod('getSegmentValues');
            var segmentValues = [];
            var searchResults = rSearch.getSearchResults({
                searchType: params.segmentName,
                filters: [],
				columns: [
					rSearch.createColumn({name: 'name'}),
					rSearch.createColumn({name: 'internalid'})
				]
            });
            for (var i = 0; i < searchResults.length; i++) {
                var eachResult = searchResults[i],
                    segmentValueName = eachResult.getValue({name: 'name'}),
                    segmentValueScriptId = eachResult.getValue({name: 'internalid'});
                segmentInstance = {
                    segmentValueName : segmentValueName,
                    segmentValueScriptId : segmentValueScriptId
				};
				segmentValues.push(segmentInstance);
            }
                rLog.endMethod();
            return segmentValues;
        };

        module.getSingleSegmentValues = function() {

        };


        return module;
	}
);