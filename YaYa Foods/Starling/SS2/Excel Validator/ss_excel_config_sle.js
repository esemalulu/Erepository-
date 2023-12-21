/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * This script was provided by Starling Solutions.
 *
 * Upon installation, this script can be triggered to configure the Excel Validator.
 *
 *  Version     Date            Author              Ticket          Remarks
 ***********************************************************************************************************************
 *  1.0         18 Jan 2021     Nicholas Bell       SFP-T3          Initial Remarks
 ***********************************************************************************************************************
 */

define(['N/search', 'N/file', 'N/record', 'N/runtime'],

	function (search, file, record, runtime) {

		/**
		 * Definition of the Suitelet script trigger point.
		 *
		 * @param {Object} context
		 * @param {ServerRequest} context.request - Encapsulation of the incoming request
		 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
		 * @Since 2015.2
		 */
		function onRequest (context) {
			log.debug({ title : 'Request Method ' + context.request.method, details : 'Parameters ' + JSON.stringify(context.request.parameters) });

			var params = ( context.request ) ? context.request.parameters : null;
			if ( !params ) {
				return context.response.write({ output : 'Error - No Parameters Received.'});
			}

			let urlPrefix = runtime.getCurrentScript().getParameter({ name : 'custscript_ss_excel_config_prefix' });

			if ( !urlPrefix ) {
				return context.response.write({ output : 'Error - No Url Prefix.  Please set the URL Prefix parameter on this script before continuing.  Look at the field help for guidance.'});
			}

			let mainHtmlFile  = findFile( 'ss_excel_interface.html' );
			let cssFile       = findFile( 'ss_excel_style.css' );
			let sheetJsFile   = findFile( 'xlsx.full.min.js' );
			let fileValidator = findFile( 'ss_excel_file_validator.js' );
			let mainJsFile    = findFile( 'ss_excel_main.js' );

			let htmlFile      = file.load({ id : mainHtmlFile.fileId });
			let htmlContents  = htmlFile.getContents();

			//Write in the newfound urls.
			htmlContents = htmlContents.replace('{{ styleSheet }}', cssFile.fileUrl );
			htmlContents = htmlContents.replace('{{ sheetJS }}', sheetJsFile.fileUrl );
			htmlContents = htmlContents.replace('{{ fileValidator }}', fileValidator.fileUrl );
			htmlContents = htmlContents.replace('{{ mainJS }}', mainJsFile.fileUrl );

			//Create a new HTML file to be saved.  This will have all of the script/css files added.
			let newHTMLFile = file.create({
				name     : 'ss_excel_validator_complete.html',
				fileType : file.Type.HTMLDOC,
				contents : htmlContents,
				folder   : htmlFile.folder //Save this in the same folder as the initial HTML file.
			});

			newHTMLFile.isOnline = true;
			newHTMLFile.save(); //Save the file with the altered contents.

			let newIndexHtml = findFile('ss_excel_validator_complete.html');

			//Find the script deployment for the interface suitelet.
			let sleDeployment = findDeploymentId();

			if ( !sleDeployment ) {
				log.error({ title : 'Could not set suitelet params.', details : 'Please find the suitelet ss_excel_validator_sle and update the requisite parameters before attempting to use it.' });
				return context.response.write({ output : 'Error - Could not set suitelet params.'});
			}

			//Add in the interface HTML url and folder id to house the CSV files.
			record.submitFields({
				type   : record.Type.SCRIPT_DEPLOYMENT,
				id     : sleDeployment,
				values : {
					custscript_ss_excel_interface_url     : newIndexHtml.fileUrl,
					custscript_ss_excel_csv_import_folder : cssFile.folder
				}
			});

			return context.response.write({ output : 'Success! - Please locate ss_excel_validator_sle to run the excel validator tool.'});

		}


		// Helper Functions

		/**
		 * 	Returns all the results of a search by grabbing them 1000 at a time.
		 *
		 * @param {Search} thisSearch - Object representation of a search
		 * @return {Result[]} results - Array of object representations of search results
		 */
		function getSearchResults (thisSearch) {

			var results   = [];
			var pagedData = thisSearch.runPaged({ pageSize : 1000 });

			if (pagedData.count == 0) {
				return results;
			}

			var page = pagedData.fetch({ index : 0 });
			results  = page.data;

			while (!page.isLast) {
				page    = page.next();
				results = results.concat(page.data);
			}

			return results;
		}

		/**
		 * 	Returns information about a file based on the filename given.
		 *
		 * @param {String} fileName - The name of the file, including extension - ie ss_index.html
		 * @return {Object} - An object containing the file url and id.
		 */
		function findFile( fileName ) {

			let fileResult = getSearchResults( search.create({
					type: "file",
					filters:
						[
							["name","is", fileName]
						],
					columns:
						[
							search.createColumn({name: "url",    label: "URL"}),
							search.createColumn({name: "folder",  label: "Folder"}),
						]
				})
			);

			if ( !fileResult || ! fileResult.length ) {
				log.audit({ title : 'No file found, aborting', details : fileName });
				return null;
			}

			//Load the file to get its url and Id, then ensure it's online as well.

			let fileInfo = fileResult[0];
			let fileId   = fileInfo.id;
			let fileObj  = file.load({ id : fileId });
			let fileUrl  = fileObj.url;
			let folder   = fileObj.folder;

			fileObj.isOnline = true; //Set to available without login.

			if ( fileName != 'ss_excel_valdator_complete.html') {
				fileObj.save();
				log.audit({ title : 'Saved file ', details : fileName });
			}

			return { fileId : fileId, fileUrl : fileUrl, folder : folder };

		}

		/**
		 * 	Returns the internal id of a script deployment based on its custom id.
		 *
		 * @param {String} fileName - The name of the file, including extension - ie ss_index.html
		 * @return {Object} - An object containing the file url and id.
		 */
		function findDeploymentId() {
			let deploymentResults = getSearchResults(search.create({
					type    : 'scriptdeployment',
					filters :
						[
							['scriptid', 'is', 'customdeploy_ss_excel_validator_sle']
						],
					columns :
						[
							search.createColumn({ name : 'status', label : 'Status' }),
						]
				})
			);

			return ( deploymentResults && deploymentResults.length ) ? deploymentResults[0].id : null;
		}


		return {
			onRequest : onRequest
		};

	});
