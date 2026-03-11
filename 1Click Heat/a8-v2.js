/**
* @NApiVersion 2.x
* @NScriptType Restlet
* @NModuleScope Public
*/

/*
	Name: a8
	Desc: A RESTlet for running requests from acceler8 platform
	Copyright: acceler8 Inc. 2022
	Developer: Paul Reed
		paul.reed@acceler8.tech
*/ 



define( [ 'N/record', 'N/format', 'N/query', 'N/file', 'N/search' ], main );

function main( record, format, query, file, search ) {
	var response=[];
	var traceData=[];
	var oldRecord;
	var state;
	var version = "2.4.11";


	function trace(opts) {
		if (!state || state.trace || opts.override) {
			if (opts.rec) {
				opts.obj = JSON.parse(JSON.stringify(state.rec));
			} else if (opts.obj && !Array.isArray(opts.obj) && typeof opts.obj==='object') {
				opts.obj = JSON.parse(JSON.stringify(opts.obj));
			}

			if (opts.obj===null || isNull(opts.obj)) {
				traceData.push(opts.msg)
			} else {
				traceData.push([opts.msg,opts.obj])
			}
		}
	}


	function props(obj, callback) {
		if (obj) {
			var keys = Object.keys(obj);
			var l = keys.length;
			var stop;

			for (var i=0; i<l && !stop; i++) {
				stop = callback(obj[keys[i]],keys[i]);
			};
		}
	}


	function elements(obj, callback) {
		if (obj) {
			if (!Array.isArray(obj)) {
				obj = [obj]
			}
			var l = obj.length;
			for (var i=0; i<l; i++) {
				callback(obj[i],i);
			};
		}
	}


	function getValue(key,obj) {
		var value = obj[key];
		var ret = value;

		if (value) {
			if (Array.isArray(value)) {
				ret = value;
			} else if (typeof value === 'object') {
				ret = null;
				if (value.type=='dateStr') {
					ret = format.parse({value: value.value, type: format.Type.DATE});
				} else if (value.type=='date' && value.value) {
					var sDate = value.value.split('/');
					ret = new Date(new Number(sDate[2]).valueOf(), (new Number(sDate[0]).valueOf()) - 1, new Number(sDate[1]).valueOf(), 0, 0, 0, 0);
				} else if (value.type=='time') {
					ret = format.parse({value: value.value, type: format.Type.DATETIME});
				}
			}
		}

		return ret;
	}


	function saveRec() {
		if (state.nosave) {
			trace({msg: 'NOSAVE',rec: 1});
		} else {
			trace({msg: 'save',rec: 1});

			ret = state.rec.save({
				// enableSourcing: true, 
				ignoreMandatoryFields: false 
			});

			trace({msg: 'SAVED',obj: ret});
			return ret;
		}
	}


	function makeState(op,rq,func,opts) {
		state = {
			mode: op,
			dyn: Boolean(rq.dynamic),
			trace: Boolean(rq.trace),
			nosave: Boolean(rq.nosave)
		}

		trace({msg: 'RQ: '+op,obj: rq});

		opts.isDynamic = state.dyn;

		trace({msg: 'opts',obj: opts});

		state.rec = func(opts);

		trace({msg: 'opts-rec',obj: state.rec});

		if (op!='create') {
			oldRecord = state.rec;
		}
	}


	function isNull(obj) {
		return obj===null || obj===undefined;
	}

	function walkRq(rq) {
		walk('fields',rq.fields);
		walk('sublists',rq.sublists);

		var id = saveRec();

		if (typeof id != 'object' && rq.void) {
			state.rec.void({
				type: rq.type,
				id: id
			});
		}

		elements(rq.attach, function (f) {
			var obj = {
				record: {
					id: f.fileID,
					type: "file"
				},
				to: {
					id: id,
					type: rq.type
				}
			};

			trace({msg: 'attach',obj: obj});

			record.attach(obj);					
		})

		return id;
	}

	function walk(op,rq) {
		var ret;

		switch (op) {

			// **** RECORD FUNCTIONS

			case 'create': {
				makeState('create',rq,record.create,{
					type: rq.type,
					defaultValues: rq.defaults || {}
				});

				ret = walkRq(rq);
				break;
			}

			case 'update': {
				makeState('update',rq,record.load,{
					type: rq.type,
					id : getValue('id',rq)
				});
				
	
				ret = walkRq(rq);
				break;
			}

			case 'transform': {
				makeState('update',rq,record.transform,{
					fromType: rq.fromType,
					toType: rq.toType,
					fromId: rq.id,
					defaultValues: rq.defaults || {}
				});

				ret = walkRq(rq);
				break;
			}

			case 'sublists': {
				props(rq, function (subObj, subName) {
					var mode = state.mode;
					if (subObj.action) {
						var mode = subObj.action;
						delete subObj.action
					}

					trace({msg: 'sublists: '+subName+' - '+mode,obj: subObj});

					state.sub = subName;
					state.insert = subObj.insert;
					state.removeFlag = subObj.remove;
					state.multiple = subObj.multiple || false;
					state.subAction = subObj.subAction;

					if (subObj.reset) {
						if (Array.isArray(subObj.reset)) {
							state.reset = subObj.reset;
						} else {
							state.reset = [{
								field: subObj.reset,
								to: (subObj.resetTo == undefined) ? 0 : subObj.resetTo
							}];
						}
					}

					walk('sub-'+mode,subObj);
				})

				break;
			}

			case 'sub-create': {
				trace({msg: 'SUB-CREATE: '+state.sub,obj: rq});

				if (state.dyn) {
					props(rq, function (rq, key) {
						state.rec.selectNewLine({sublistId: state.sub})

						if (rq.sublinetype) {
							state.subline = state.rec.getCurrentSublistSubrecord({
								sublistId: state.sub,
								fieldId: rq.sublinetype
							})
		
							walk('sub-fields-type',rq.fields ? rq.fields : rq);
						} else {
						walk('sub-fields',rq.fields ? rq.fields : rq);
						}
						state.rec.commitLine({sublistId: state.sub})
					});
				} else {
					state.line=0;
					props(rq, function (rq, key) {
						state.rec.insertLine({sublistId: state.sub,line: state.line});
						walk('sub-fields',rq.fields ? rq.fields : rq);
						state.line++;
					});
				}
				break;
			}

			case 'sub-delete':
			case 'sub-update': {
				var lines = state.rec.getLineCount({sublistId: state.sub});
				var map = {};
				var rootRQ = rq;

				trace({msg: 'LINES', obj: {sublistId: state.sub, lines: lines, rec: state.rec}});

				// All lines
				props(rq, function (rq,key) {
					if (key=='all') {
						for (var i = 0; i < lines && (state.multiple || rq.multiple || isNull(rq.__found)); i++) {
							state.currentline = i;
							state.rec.selectLine({sublistId: state.sub,line: i});

							if (map[i]) {map[i].push(rq)} else {map[i]=[rq]}
							rq.__found=i;
						}
					}
				});

				// Look for field/value match
				props(rq, function (rq,key) {
					if (key.substring(0,4)=='line' && rq.field) {
						for (var i = 0; i < lines && (state.multiple || isNull(rq.__found)); i++) {
							state.currentline = i;
							state.rec.selectLine({sublistId: state.sub,line: i});

							var value = state.rec.getCurrentSublistValue({sublistId: state.sub, fieldId: rq.field}).toString();

							if (value == rq.value.toString()) {
								if (map[i]) {map[i].push(rq)} else {map[i]=[rq]}
								rq.__found=i;
							}
						}
					}
				});


				// Look for line
				props(rq, function (rq,key) {
					if (key.substring(0,4)=='line' && rq.line) {
						for (var i = 0; i < lines && (state.multiple || isNull(rq.__found)); i++) {
							state.currentline = i;
							state.rec.selectLine({sublistId: state.sub,line: i});

							var value = state.rec.getCurrentSublistValue({sublistId: state.sub, fieldId: "line"}).toString();
							if (rq.line == 'line'+value || rq.line == 'line '+value) {
								if (map[i]) {map[i].push(rq)} else {map[i]=[rq]}
								rq.__found=i;
							}
						}
					}
				});


				if (op='sub-delete') {
					trace({msg: 'PROCESSED: DELETE', obj: {map: map, state: state, rq: rq}});

					for (var i = 0; i < lines; i++) {
						var rq=map[i];
						if (rq) {
							state.rec.removeLine({
								sublistId: state.sub,
								line: i
							});
						}
					}

				} else {
					trace({msg: 'PROCESSED', obj: {map: map, state: state, rq: rq}});

					// Process found RQ
	
					for (var i = 0; i < lines; i++) {
						var rq=map[i];
						if (rq) {
							state.currentline = i;
							state.rec.selectLine({sublistId: state.sub,line: i});
	
							elements(rq, function (rq) {
								walk('sub-fields',rq.fields)
								state.rec.commitLine({sublistId: state.sub});
							})
						}
					}
	
					// Process not-found RQ
	
					if (rootRQ.subAction=='merge') {
						props(rootRQ, function (rq,key) {
							if (key.substring(0,4)=='line' && rq.line && isNull(rq.__found)) {
								state.rec.selectNewLine({sublistId: state.sub})
								 walk('sub-fields',rq.fields)
								 state.rec.commitLine({sublistId: state.sub});
							}
						});
					}

					// Process remaining 'orphaned' data
					
					if (state.removeFlag) {
						for (var i=lines - 1; i>=0; i--) {	// Going backwards as NS re-numbers on row deletion.
							if (!map[i]) {
								var obj = {sublistId: state.sub,line: i}; // ,ignoreRecalc: true
								trace({msg: 'remove', obj: obj});
								state.rec.removeLine(obj);
							}
						}
					} else if (state.reset) {
						for (var i = 0; i < lines; i++) {
							if (!map[i]) {
								state.currentline = i;
								state.rec.selectLine({sublistId: state.sub,line: i});

								trace({msg: 'reset', obj: state.reset});
								elements(state.reset, function (rq) {
									var opts = {
										line: i,
										sublistId: state.sub,
										fieldId: rq.field,
										value: rq.to
									};
									trace({msg: 'reset-field', obj: opts})
									state.rec.setCurrentSublistValue(opts);
								});
								state.rec.commitLine({sublistId: state.sub});
							}
						}

					}
				}

				break;
			}

			case 'fields': {
				props(rq, function (obj,key) {
					var opts = {
						fieldId: key,
						value: getValue(key,rq)
					}

					trace({msg: 'field', obj: opts})

					state.rec.setValue(opts);
				});
	
				break;
			}

			case 'sub-fields-type': {
				props(rq, function (obj,key) {
					var opts = {
						fieldId: key,
						value: getValue(key,rq)
					};

					trace({msg: 'sub-field-type', obj: opts})
					state.subline.setValue(opts);
				});
				break;
			}

			case 'sub-fields': {
				props(rq, function (obj,key) {
					var opts = {
						line: state.currentline,
						sublistId: state.sub,
						fieldId: key,
						value: getValue(key,rq)
					};

					if (state.dyn) {
						trace({msg: 'sub-field-D', obj: opts})
						state.rec.setCurrentSublistValue(opts);
					} else {
						opts.line = state.line;
						trace({msg: 'sub-field-N', obj: opts})
						state.rec.setSublistValue(opts);
					}
				});
				break;
			}



			// **** OTHER FUNCTIONS


			case 'test': {
				ret = {
					fileTypes: file.Type
				};
				break;
			}

			case 'a8promote': {
				var obj = file.load({id: rq.id});

				trace({msg: 'LOAD',obj: obj});

				var newObj = file.create({
					name: obj.name,
					fileType: obj.fileType,
					contents: rq.contents,
					folder: obj.folder,
					encoding: obj.encoding,
					isOnline: false
				});

				trace({msg: 'SAVE RQ',obj: newObj});

				ret = newObj.save();

				trace({msg: 'SAVE RS',obj: ret});
			}

			case 'search': {
				var MAX_RANGE = 1000;

				var ss = search.load({
					id: rq.id
				});

				ret = [];

				var i = 0;
				while (true) {
					var rs = ss.run().getRange({
						start: i,
						end: i + MAX_RANGE
					})

					if (!rs) {
						break;
					}

					ret = ret.concat(rs);

					if (rs.length < MAX_RANGE) {
						break;
					}

					i += MAX_RANGE;
				}

				break;
			}

			case 'uploadDocToId': {
				state = {
					trace: Boolean(rq.trace)
				};

				// Find or create folder
				var name = 'Record'+rq.id;

				var opts = {
					type: record.Type.FOLDER,
					filters: [
						['name', 'is', name]
					]
				};

				if (rq.baseFolder) {
					opts.filters.push('and');
					opts.filters.push(['parent', 'anyof', [rq.baseFolder]]);
				}

				var folder = search.create(opts).run().getRange({ start: 0, end: 1 });
				if (folder.length==0) {
					var objRecord = record.create({
						type: record.Type.FOLDER,
						isDynamic: true
					});

					objRecord.setValue({fieldId: 'name', value: name});

					if (rq.baseFolderWrite) {
						objRecord.setValue({fieldId: 'parent', value: rq.baseFolderWrite});
					} else if (rq.baseFolder) {
						objRecord.setValue({fieldId: 'parent', value: rq.baseFolder});
					}

					folder = objRecord.save({
						// enableSourcing: true,
						ignoreMandatoryFields: true
					});

					trace({msg: 'CREATE FOLDER',obj: folder});

				} else {
					folder = folder[0].id;
					trace({msg: 'FOLDER FOUND',obj: folder});
				}


				// Create File


				var obj = {
					name: rq.filename,
					fileType: rq.fileType,
					contents: rq.contents,
					description: rq.description,
					folder: folder,
					isOnline: false
				};

				if (rq.source_id) {
					var doc = file.load({id: rq.source_id});
					trace({msg: 'DOC',obj: doc});

					if (!obj.name) {
						obj.name = doc.name;
					}

					if (rq.dups) {
						var s = obj.name.split('.');
						var ext = s.pop();
						obj.name = s.join('.') + '-' + rq.source_id +'.' + ext;
					}

					obj.description = obj.description || doc.description;
					obj.fileType = obj.fileType || doc.fileType;
					if (obj.fileType == 'MISCBINARY') {
						obj.fileType = 'MESSAGERFC'
					}
					obj.contents = doc.getContents();
				}

				var newObj = file.create(obj);

				trace({msg: 'saveRQ',obj: newObj});

				ret = newObj.save();

				trace({msg: 'save',obj: ret});

				if (rq.attach) {
					var obj = {
						record: {
							id: ret,
							type: "file"
						},
						to: {
							id: rq.id,
							type: rq.recType
						}
					};

					trace({msg: 'attach',obj: obj});

					record.attach(obj);					
				}

				break;
			}

			case 'get': {
				ret = record.load({
					type : rq.type,
					id : getValue('id',rq)
				});
				break;
			}

			case 'getFile': {
				var doc = file.load({id: rq.id});
				ret = {
					doc: doc,
					contents: doc.getContents()
				};
				break;
			}

			// case 'attach': {
			// 	loop((req.fileIDs ? req.fileIDs : [req.fileID]), function (id) {
			// 		record.attach({
			// 			record: {id: id, type: "file"},
			// 			to: {id: req.recID, type: req.recType}
			// 		});
			// 	})
			// 	ret = true;
			// 	break;
			// }

			case 'delete': {
				ret = record.delete({
					type : rq.type,
					id : rq.id
				});
				break;
			}

			case 'deleteFolder': {
				var rs = search.create({
					type: 'file',
					filters: ['folder', 'anyof', null, rq.id]
				}).run().getRange({
					start: 0,
					end: 1000
				});

				elements(rs, function (doc) {
					file.delete(doc.id)
				})

				ret = record.delete({
					type: record.Type.FOLDER,
					id: rq.id
				});

				break;
			}

			case 'sql': {
				ret = query.runSuiteQL( rq.sql ).asMappedResults();
				break;
			}

			case 'void': {
				ret = record.load({
					type : rq.type,
					id : getValue('id',rq)
				});

				ret.void({
					type: rq.type,
					id: getValue('id',rq)
				});
			}

			default: {
				ret = {error: "Unknown action "+op};
			}
		}

		return ret;
	}


	return {
    	post: function( request ) {
			elements(request.request, function (rq) {
				try {
					var result = walk(rq.action,rq);
					response.push({id: rq.id, cargo: rq.cargo, oldRecord: oldRecord, value: result});
				} catch (e) {
					response.push({id: rq.id, cargo: rq.cargo, error: e});
				}        
			});

			var result = {
				check: version,
				response: response
			}

			if (traceData.length) {
				traceData.push({ver: version});
				result.trace = traceData;
			}
		
			return result;
		}
    }
}
