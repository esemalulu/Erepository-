/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * This script was provided by Starling Solutions.
 *
 *  Version     Date                Author          Ticket 			Remarks
 *************************************************************************
 *  1.0         04 Sep 2019         Mark Baker      				Initial Version
 *  1.1         10 Aug 2020     	Dimitry Mazur	STP-140 	CSV functionality saved file functionality update
 *************************************************************************
 */

define(['N/search', 'N/ui/serverWidget', 'N/runtime', 'N/task', 'N/config', 'N/url'],

	function (search, serverWidget, runtime, task, config, url) {

		// Array of email address domains which have permissions to use this tool.
		const VALID_USER_LIST = [
			'@starlingsolutions.com',
			'@conexussg.com',
		];

		/**
		 * Definition of the Suitelet script trigger point.
		 *
		 * @param {Object} context
		 * @param {ServerRequest} context.request - Encapsulation of the incoming request
		 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
		 * @Since 2015.2
		 */
		function onRequest (context) {
			log.debug({ title : 'Incoming ' + context.request.method });

			if (context.request.method.toLowerCase() == 'get') {
				sendGetForm(context.response);
			}
			else {
				processPost(context.request, context.response);
			}
		}


		//Helper Functions

		/**
		 * Send the GET form for a user to select a search
		 *
		 * @param {response} response - Response object
		 */
		function sendGetForm(response) {
			var isValidUser  = getIsValidUser();

			if (!isValidUser) {
				var form = serverWidget.createForm({ title : 'In order to prevent accidental data corruption, this tool is only available to Starling employees and partners.' });

				response.writePage({ pageObject : form });

				return;
			}

				// COMPANY_PREFERENCES stores a default Mass Delete Folder ID
			var prefObj 		= config.load({ type: config.Type.COMPANY_PREFERENCES });
			var defaultFolder 	= prefObj.getValue({fieldId: 'custscript_ss_massdel_folder_id'});
			var form 			= serverWidget.createForm({ title: 'Mass Delete Tool - Note that grouped searches will NOT WORK' });
			form.clientScriptModulePath = './ss_mass_delete_tool_cls.js';

			var areYouSureField = form.addField({
				id :    'are_you_sure',
				label   : 'Are you sure?',
				type    : serverWidget.FieldType.CHECKBOX
			});
			areYouSureField.updateDisplayType({ displayType : serverWidget.FieldDisplayType.HIDDEN });

			var searchField = form.addField({
				id      : 'search',
				label   : 'Saved Search',
				type    : serverWidget.FieldType.SELECT
			});

			var folderField = form.addField({
				id      : 'custpage_folder',
				label   : 'Mass Delete Logs Folder',
				type    : serverWidget.FieldType.SELECT
			}).updateBreakType({
				breakType : serverWidget.FieldBreakType.STARTCOL
			});

			form.addField({
				id      : 'custpage_savefolder',
				label   : 'Make This Folder Default',
				type    : serverWidget.FieldType.CHECKBOX
			}).defaultValue = 'T';

			var folderSearch = getSearchResults(search.create({
				type: "folder",
				filters: [ ["istoplevel","is","T"] ],
				columns:
					[
						search.createColumn({name: "name", sort: search.Sort.ASC, label: "Name"}),
						search.createColumn({name: "foldersize", label: "Size (KB)"}),
						search.createColumn({name: "numfiles", label: "# of Files"}),
					]
			}));

			if (defaultFolder) {

				folderField.defaultValue = defaultFolder;

				folderSearch.forEach(function(result) {
					if (Number(defaultFolder) === Number(result.id)) {

						var folderUrl   = 'https://' + url.resolveDomain({hostType: url.HostType.APPLICATION}) + '/app/common/media/mediaitemfolders.nl?folder=' + result.id;
						form.addField({
							id: 'custpage_link_folder',
							label: 'Folder Link',
							type: serverWidget.FieldType.TEXT
						})
							.updateDisplayType({displayType : serverWidget.FieldDisplayType.INLINE})
							.defaultValue = '<a class="dottedlink" href="'+folderUrl+'">'+result.getValue({name: 'name'})+'</a>';


						form.addField({
							id: 'custpage_folder_size',
							label: 'Folder Size (KB)',
							type: serverWidget.FieldType.TEXT
						})
							.updateDisplayType({displayType : serverWidget.FieldDisplayType.INLINE})
							.defaultValue = result.getValue({name: 'foldersize'});

						form.addField({
							id: 'custpage_folder_files',
							label: '# of files stored',
							type: serverWidget.FieldType.TEXT
						})
							.updateDisplayType({displayType : serverWidget.FieldDisplayType.INLINE})
							.defaultValue = result.getValue({name: 'numfiles'});

					}
				});
			}

			folderField.addSelectOption({
				value   : '',
				text    : ' - Not Selected - '
			});

			folderSearch.forEach(function(result){
				folderField.addSelectOption({
					value   : result.id,
					text    : result.getValue({ name : 'name' })
				});
			});

			var allSearches = getAllSearches();



			allSearches.forEach(function(thisSearch) {
				searchField.addSelectOption({
					value   : thisSearch.id,
					text    : thisSearch.getValue({ name : 'title' })
				});
			});

			form.addSubmitButton({ label : 'Delete All Results' });

			response.writePage({ pageObject : form})
		}


		/**
		 * Determine if a user is a valid user.
		 *
		 * @returns {Boolean} - If the user has a valid domain in the whitelist.
		 */
		function getIsValidUser() {
			var userEmail          = runtime.getCurrentUser().email;
			const validUserOptions = VALID_USER_LIST.filter(function(userEmailDomain) {
				return userEmail.toLowerCase().indexOf(userEmailDomain) > -1;
			});
			return validUserOptions.length === 1;
		}


		/**
		 * Get a list of all searches in the account
		 *
		 * @returns {Result[]} allSearches - Array of objects representing each search
		 */
		function getAllSearches() {
			var newSearch   = search.create({
				type    : 'savedsearch',
				columns : [
					search.createColumn({
						name: "title",
						sort: search.Sort.ASC,
						label: "Title"
					}),
				]
			});

			var allSearches = getSearchResults(newSearch);

			return allSearches;
		}


		/**
		 * 	Returns all the results of a search by grabbing them 1000 at a time.
		 *
		 * @param {Search} thisSearch - Object representation of a search
		 * @return {Result[]} results - Array of object representations of search results
		 */
		function getSearchResults(thisSearch) {
			var results= [];
			var pagedData= thisSearch.runPaged({ pageSize: 1000 });

			if (pagedData.count == 0) {
				return results;
			}

			var page= pagedData.fetch({ index: 0 });
			results= page.data;

			while (!page.isLast) {
				page= page.next();
				results= results.concat(page.data);
			}

			return results;
		}


		/**
		 * Process a POST - grab the search id and pass to map/reduce
		 *
		 * @param {request} request - Request object
		 * @param {response} response - Response object
		 */
		function processPost(request, response) {
			var searchId    	= request.parameters.search;
			var userId      	= runtime.getCurrentUser().id;
			var saveFolder  	= request.parameters.custpage_folder;
			var isDefault 		= request.parameters.custpage_savefolder;
			var prefObj 		= config.load({ type: config.Type.COMPANY_PREFERENCES });
			var defaultFolder 	= prefObj.getValue({fieldId: 'custscript_ss_massdel_folder_id'});

			if (Number(saveFolder) !== Number(defaultFolder) && isDefault === 'T' ) {
				prefObj.setValue({fieldId: 'custscript_ss_massdel_folder_id', value: Number(saveFolder)});
				prefObj.save();
			}

			var userResponse    = 'Results are being deleted - you will receive an email when complete.'

			try {
				var taskParams = {
					taskType    : task.TaskType.MAP_REDUCE,
					scriptId    : 'customscript_ss_mass_delete_tool_map',
					params      : {
						custscript_ss_mass_delete_search_id     : searchId,
						custscript_ss_mass_delete_user_id       : userId,
						custscript_ss_mass_delete_log_folder_id	: Number(saveFolder),
					}
				};
				log.debug({ title : 'taskParams', details: taskParams });
				task.create(taskParams).submit();
			}
			catch(e) {
				log.debug({ title : 'Could not schedule map/reduce' });

				userResponse = 'There is already a mass delete running - please wait until it is complete and try again.'
			}

			// response.write({ output : 'Search ID: ' + searchId + ' - Task ID: ' + deleteTaskId });

			var form = serverWidget.createForm({ title : userResponse });

			response.writePage({ pageObject : form });
		}


		return {
			onRequest : onRequest
		};

	});
