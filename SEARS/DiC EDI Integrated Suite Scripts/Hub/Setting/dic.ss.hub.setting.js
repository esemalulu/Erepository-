/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record',
        'N/ui/serverWidget',
        'N/search',
        '../../Com/dic.cs.config',
        '../../Com/Util/dic.ss.com.util',
        '../dic.cs.hub.config',
        '../../Com/Util/dic.cs.util.object',
        '../../Com/Util/dic.cs.util'
        ],

function(record,
		serverWidget,
		search,
		dicConfig,
		dicSSUtil,
		dicHubConfig,
		dicUtilObj,
		diutil
		) {
	
	/**
	 * Define 
	 */
	function AbsCreateSettingForm(options){
		this.options = options;
	}


	
	/**
	 *Build custom  field of setting form 
	 */
	function _buildFields(options){
		//get the record of form
		return Object.keys(options.fields).map(function(key){
			var objField = options.fields[key];
			var nsField = options.form.addField({
								id: objField.Id,
								type: objField.Type,
								label: objField.Text,
								container: objField.hasOwnProperty('ContainerId') ?  objField.ContainerId : undefined
							});
			if (objField.hasOwnProperty('MaxLength')){
				nsField.maxLength = objField.MaxLength;
			}
			if (objField.hasOwnProperty('DisplayType')){
				nsField.updateDisplayType({displayType: objField.DisplayType});
			}
			if (options.record.hasOwnProperty(objField.Id)){
				nsField.defaultValue = options.record[objField.Id];
			}
			
			if (objField.hasOwnProperty('HelpText')){
				nsField.setHelpText({help: objField.HelpText});
			}
			
			return nsField;
		});
		
	} 
	
	/**
	 *Build the from 
	 */
	function _buildForm(options){
		var form = dicSSUtil.buildForm({
			sideType: options.sideType,
			formName: 'SETTING'
		});
		
		try{
		
			form.clientScriptFileId = _settingFormInfor.ClientScript.Id;
			//get data for custom field
			_buildGroupFields({
				form: form,
				groupFields: _settingFormInfor.CustomGroupFields
			});
			
			var recSetting = _getData();
			
//			_buildFields({
//				form: form,
//				record: recSetting,
//				fields: _settingFormInfor.CustomFields
//				
//				}
//			);
//			
//			_buildActions({
//				form: form,
//				actions: _settingFormInfor.CustomActions
//			});
			
			form.getField({id: _settingFormInfor.CustomFields.InternalId.Id}).defaultValue = recSetting.id;
						
		}catch(e){
			var mess = diutil.processException(e, {title: "Build Setting Html"});
			var txtmess = form.getField({id: _settingFormInfor.CustomFields.Message.Id});
			
    		if (txtmess && (mess && mess.length > 0)){
    			txtmess.defaultValue = mess;
    		}
		}
		return form;
	}
	/**
	 * End build the form
	 */

	
	/**
	 * Begin: Using Behavior Template Pattern to create a 
	 */
	
	function AbsCreatingForm(options){
		this.options = options;
	};
	
	AbsCreatingForm.prototype.buildSummary = function(){
		this.form = dicSSUtil.buildForm({
			sideType: this.options.sideType,
			formName: 'SETTING',
			clientScriptId: this.options.config.ClientScript.Id
		});
	};

	
	AbsCreatingForm.prototype.process = function(){

		try{
			this.buildSummary();
			//step 2: get setting record, if do not exist then an object with none property
			this.processData();
			//build netsuite serverWidget 
			this.buildDetailForm();
			
			this.bindData();
			this.options.res.writePage(this.form);
   		
		}catch(e){
			var mess = diutil.processException(e, {title: "Build Setting Html"});
			var txtmess = this.form.getField({id: this.options.config.CustomFields.Message.Id});
			
    		if (txtmess && (mess && mess.length > 0)){
    			txtmess.defaultValue = mess;
    		}
		}
	};
	/**
	 * Build serverWidget Group fields
	 */
	
	AbsCreatingForm.prototype.buildGroupFields = function(){
		var inforGroupFields = this.options.config.CustomGroupFields;
		this.nsGroupFields = dicSSUtil.buildGroupFields({form: this.form,
			config: inforGroupFields});
	};
	
	AbsCreatingForm.prototype.buildFields = function(){
		var inforFields = this.options.config.CustomFields;
		this.nsFields = dicSSUtil.buildFields({form: this.form,
			config: inforFields});
	};
	
	AbsCreatingForm.prototype.buildActions = function(){
		var inforActions = this.options.config.CustomActions;
		this.nsActions = dicSSUtil.buildActions({
			config: inforActions,
			form: this.form
		});
	};
	
	AbsCreatingForm.prototype.buildDetailForm = function(){
		//build server control fields
		this.buildGroupFields();
		this.buildFields();
		this.buildActions();
	};
	
	/**
	 * Bind data to form
	 */
	AbsCreatingForm.prototype.bindId = function(){
		if (this.data && this.data.id){
			this.form.getField({id:this.options.config.CustomGroupFields.InternalId.Id}).defaultValue = this.data.id;
		}
	};
	
	AbsCreatingForm.prototype.bindData = function(){
		if (!this.data) return;
		//bind
		this.bindId();
		
	};
	
	/**
	 * Begin define class processing via method GET
	 */
	CreatingFormGet =  function(options){
		//invoke parent constructor
		AbsCreatingForm.call(this, options);
	};
	
	CreatingFormGet.prototype = new AbsCreatingForm();
	
	CreatingFormGet.prototype.constructor = CreatingFormGet;
	
	
	
	CreatingFormGet.prototype.processData = function(){
	    this.data = {};
		var custSearch = search.create({
			type: this.options.config.Id,
			columns: dicUtilObj.extractPropertyStoreValue2ArrayId(this.options.config.CustomFields)
		});
		
		var resultSet = custSearch.run().getRange({start: 0, end: 1});
		var selfData = this.data;
		if (resultSet.length > 0){
			var setting = resultSet[0];
			selfData.id = setting.id;
			dicUtilObj.extractPropertyStoreValue2ArrayId(this.options.config.CustomFields).forEach(function(propertyName){
			
				selfData[propertyName] = setting.getValue({name: propertyName});
			});
		}

	};
	/**
	 * End define class processing via method GET
	 */
	
	/**
	 *Begin define class processing via method POST 
	 */
	CreatingFormPost = function(options){
		AbsCreatingForm.call(this, options);
	};
	
	CreatingFormPost.prototype = new AbsCreatingForm();
	CreatingFormPost.prototype.constructor = CreatingFormPost;
	/**
	 * Processing 
	 */

	
	/**
	 * End define class processing via method POST
	 */
	
	/**
	 * End: Using Behavior Template Pattern to create a 
	 */
	
	
	
	
	/**
	 * Process GET request
	 * @param {ServerRequest} 
	 * @param {ServerResponse}
	 */
	function _processRequestGET(req, res){
		res.writePage(_buildForm(_createOptions(req)));
	}
	

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
//    	if(context.request.method==='GET'){   
//    		_processRequestGET(context.request, context.response);
//    	}else{
//    		_processRequestPOST(context.request, context.response);
//    	}
    	var settingFormFactory,
    		options = {
    			config: dicHubConfig.FORMS.SETTING,
    			query: context.request.parameters,
    			sideType: dicConfig.SIDE_TYPE.HUB.Type,
    			req:  context.request,
    			res: context.response
    		};
    	
    	if (context.request.method === 'GET'){
    		settingFormFactory = new CreatingFormGet(options);
    	} else{
    		settingFormFactory = new CreatingFormPost(options);
    	}
    	settingFormFactory.process();
    	
    }

    return {
        onRequest: onRequest
    };
    
});
