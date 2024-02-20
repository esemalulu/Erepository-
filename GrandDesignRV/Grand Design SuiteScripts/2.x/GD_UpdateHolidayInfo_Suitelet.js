/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(
		['N/record', 'N/redirect', 'N/ui/serverWidget', 'N/url', 'N/search'],
		/**
		 * @param {record} record
		 * @param {redirect} redirect
		 * @param {serverWidget} serverWidget
		 * @param {url} url
		 */
		function(record, redirect, serverWidget, url, search) {

			/**
			 * Definition of the Suitelet script trigger point.
			 * 
			 * @param {Object} context
			 * @param {ServerRequest} context.request - Encapsulation of the incoming request
			 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
			 * @Since 2015.2
			 */
			function onRequest(context) {
				// Create Form
				var form = serverWidget.createForm({
					title : 'Mass Update Holiday Closure Information'
				});

				if (context.request.method == 'GET') {
					form.addField({
						id : 'custpagegd_locations',
						label : 'Locations',
						type : serverWidget.FieldType.MULTISELECT,
						source : 'location'
					}).isMandatory = true;

					form.addField({
						id : 'custpagegd_holidayclosureinformation',
						label : 'Holiday Closure Information',
						type : serverWidget.FieldType.TEXTAREA
					})

					form.addField({
						id : 'custpagegd_warningmessage',
						label : 'Locations',
						type : serverWidget.FieldType.INLINEHTML,
						source : 'location'
					}).defaultValue = 'Any selected location will have its Holiday Closure Information overwritten by your new message.<br/>' +
					'If this field is blank, and selected locations will have their holiday information erased.';

					form.addSubmitButton('Update');
					context.response.writePage(form);

				} else { //POST
					var holidayClosureInformationText = context.request.parameters['custpagegd_holidayclosureinformation'] || '';
					var locationsToUpdateArray = context.request.parameters['custpagegd_locations'].split(/\u0005/);
					for (var i = 0; i < locationsToUpdateArray.length; i++)
					{
						//Adding Try/Catch to catch any unexpected errors on record.submitFields
						try
						{						
							// Checking to see if the uses bins field is checked or not
							var usesbins = search.lookupFields({
								type: search.Type.LOCATION,
								id: locationsToUpdateArray[i],
								columns: 'usesbins'
							});

							record.submitFields({
								type: record.Type.LOCATION,
								id: locationsToUpdateArray[i],
								values: {
									//We have to set this, otherwise NS apparently tries to 'helpfully' uncheck it for you.
									usesbins: usesbins,
									custrecordgd_holidayclosureinformation: holidayClosureInformationText
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields: true
								}
							});
						} catch (e)
						{
							log.error("Error on ID: " + locationsToUpdateArray[i], e);
						}
					}
					redirect.toSuitelet({
						scriptId : 'customscriptgd_updateholidayinfo',
						deploymentId : 'customdeploygd_updateholidayinfo'
					});
				}
			}

			return {
				onRequest : onRequest
			}
		});
