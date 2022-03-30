/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/search', 'N/log', 'N/redirect', '/SuiteScripts/UTILITY_LIB', 'N/format', 'N/url', 'N/record', 'N/error'],
/**
 * @param {serverWidget} serverWidget
 */
function(serverW, search, log, redirect, custUtil, format, url, record, error) 
{
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     * 
     * 
	 * SUITELET FIELDS
	 *  - Source
	 *  - First Name
	 *  - Last Name
	 *  - Email Address
	 *  - Company Name
	 *  - City
	 *  - State
	 *  - Postal Code
	 *  - Product
	 *  - Product Abbreviation - customlist_aux_leads_products
	 *  - Suspect Location - location
	 *  - Lead Source Type - campaign
	 *  - Assigned To - employee
	 *  - Existing NS Company - company
	 *  - Existing NS Contact - contact
	 *  - Opportunity - opportunity
     */
	
	function onRequest(context)
	{			
		var startDate = context.request.parameters['custpage_startdate'];
		var endDate   = context.request.parameters['custpage_enddate'];
		var leadType  = context.request.parameters['custpage_sourcetype'];
		var nLeads    = context.request.parameters['leads'];
		var nContacts = context.request.parameters['contacts'];
		var startDefault = startDate;
		var endDefault   = endDate;
		var leadDefault  = leadType;


		if(startDate != undefined && endDate != undefined)
		{
			var initalStartDateString = startDate + " 12:00 am";
			var startDateTime = format.parse({
				value: initalStartDateString,
				type: format.Type.DATETIME
			});
			
			var initalEndDateString = endDate + " 11:59 pm";
			var endDateTime = format.parse({
				value: initalEndDateString,
				type: format.Type.DATETIME
			});
		}
		
			var form = serverW.createForm
			({
				title: 'Bulk Lead Processor',
				hideNavBar: false
			});
			
			form.clientScriptFileId = 1468076;
			
			var processedRecord = form.addField
			({
				id: 'custpage_processedrecord',
				label: 'processedRecord',
				type: serverW.FieldType.INLINEHTML
			});
			processedRecord.updateLayoutType({ layoutType: serverW.FieldLayoutType.OUTSIDEABOVE});
			
			
			if(nLeads && nContacts)
			{
				var leadsArray = nLeads.split(',');
				var contactsArray = nContacts.split(',');
				
				var	html = '<h1 style="color:green; font-size:16px;">Leads Successfully Created</h1>';
					
				for(var i = 0; i < leadsArray.length; i+=1)
				{
					var leadIds = leadsArray[i].split('-');
					html += leadsArray[i] + '<a href=https://system.netsuite.com/app/common/entity/custjob.nl?id='+ leadIds[0] + '>View Record</a><br>';
				}
				html += '<br>';
				html += '<h1 style="color:green;font-size: 16px;">Contacts Successfully Created </h1>';
					
				for(var y = 0; y < contactsArray.length; y+=1)
				{
					var contactIds = contactsArray[y].split('-');
					html += contactsArray[y] +  '<a href=https://system.netsuite.com/app/common/entity/contact.nl?id='+ contactIds[0] + '>View Record</a><br>';
				}
				processedRecord.defaultValue = html;
			}
			
			var sDate = form.addField
			({
				id: 'custpage_startdate',
				label: 'Start Date',
				type: serverW.FieldType.DATE
			});
			sDate.isMandatory = true;
			
			var eDate = form.addField
			({
				id: 'custpage_enddate',
				label: 'End Date',
				type: serverW.FieldType.DATE
			});
			eDate.isMandatory = true;
			
			var leadSourceType = form.addField
			({
				id: 'custpage_sourcetype',
				label: 'Lead Source Type',
				type: serverW.FieldType.SELECT,
				source: 'campaign'
			});
			
			if(leadType != undefined && startDate != undefined && endDate != undefined)
			{
				sDate.defaultValue = startDefault;
				eDate.defaultValue = endDefault;
				leadSourceType.defaultValue = leadDefault;
			}
			else if(startDate != undefined && endDate != undefined)
			{
				sDate.defaultValue = startDefault;
				eDate.defaultValue = endDefault;
			}
			
			var sublist = form.addSublist
			({
	    		id : 'leadtable',
	    		type : serverW.SublistType.INLINEEDITOR,
	    		label : 'Leads to be Processed'
	    	});
			
	    	
	    	var chkBox = sublist.addField
	    	({
	    		id : 'processrecord',
	    		label : 'Process Record',
	    		type : serverW.FieldType.CHECKBOX
	    	});
	    	
	    	var field = sublist.addField
	    	({
	    		id : 'recid',
	    		label : 'Internal ID',
	    		type : serverW.FieldType.TEXT
	    	});
	    	
	    	field.updateDisplayType
	    	({
	    		displayType: serverW.FieldDisplayType.HIDDEN
	    	});
	    	
	    	sublist.addField
	    	({
	    		id : 'source',
	    		label : 'Source',
	    		type : serverW.FieldType.TEXT
	    	});
	    	
	    	sublist.addField
	    	({
	    		id: 'firstname',
	    		label:  'First Name',
	    		type: serverW.FieldType.TEXT
	    	});
	    	
	    	sublist.addField
	    	({
	    		id: 'lastname',
	    		label: 'Last Name',
	    		type: serverW.FieldType.TEXT
	    	});
	    	
	    	sublist.addField
	    	({
	    		id: 'email',
	    		label: 'Email Address',
	    		type: serverW.FieldType.TEXT
	    	});
	    	
	    	sublist.addField
	    	({
	    		id: 'companyname',
	    		label: 'Company Name',
	    		type: serverW.FieldType.TEXT
	    	});
	    	
	    	sublist.addField
	    	({
	    		id: 'city',
	    		label: 'City',
	    		type: serverW.FieldType.TEXT
	    	});
	    	
	    	sublist.addField
	    	({
	    		id: 'state',
	    		label: 'State',
	    		type: serverW.FieldType.TEXT
	    	});
	    	
	    	sublist.addField
	    	({
	    		id: 'postal',
	    		label: 'Postal Code',
	    		type: serverW.FieldType.TEXT
	    	});
	    	
	    	sublist.addField
	    	({
	    		id: 'product',
	    		label: 'Product',
	    		type: serverW.FieldType.TEXT
	    	});
	    	
	    	var prodabbr = sublist.addField
	    	({
	    		id: 'prodabbr',
	    		label: 'Product Abbreviation',
	    		type: serverW.FieldType.SELECT,
	    		source: 'customlist_aux_leads_products'
	    	});
	    	
	    	
	    	var location = sublist.addField
	    	({
	    		id: 'location',
	    		label: 'Suspect Location',
	    		type: serverW.FieldType.SELECT,
	    		source: 'location'
	    	});
	    	
	    	var leadSource = sublist.addField
	    	({
	    		id: 'leadsource',
	    		label: 'Lead Source Type',
	    		type: serverW.FieldType.SELECT,
	    		source: 'campaign'
	    	});
	    	
	    	var emp = sublist.addField
	    	({
	    		id: 'employee',
	    		label: 'Assigned To',
	    		type: serverW.FieldType.SELECT,
	    		source: 'employee'
	    	});
	    	
	    	var company = sublist.addField
	    	({
	    		id: 'company',
	    		label: 'Existing NS Company',
	    		type: serverW.FieldType.SELECT,
	    		source: 'customer'
	    	});
	    	
	    	var contact = sublist.addField
	    	({
	    		id: 'contact',
	    		label: 'Existing NS Contact',
	    		type: serverW.FieldType.SELECT,
	    		source: 'contact'
	    	});
	    	
	    	var opp = sublist.addField
	    	({
	    		id: 'opp',
	    		label: 'Opportunity',
	    		type: serverW.FieldType.SELECT,
	    		source: 'opportunity' 
	    	});
	    	
			var fetchRecord = form.addButton
			({
				id: 'custpage_fetchrecords',
				label: 'Retrieve Suspect Records',
				functionName: 'refreshPage'
			});

			
			var processRecord = form.addSubmitButton
			({
				label: 'Process Records'
			});
			
			
    		if(startDate != undefined && endDate != undefined && leadType != undefined)
        	{
    			log.debug('TEST', 'Start Date, End Date and Lead Type Not Undefined');
        		var searchFilter = [
	    		                    	["created","within", startDateTime, endDateTime],
	    		                    	"AND",
	    		                    	["custrecord_leads_source_type","is",leadType],
	    		                    	"AND",
	    		                    	["custrecord40","anyof","@NONE@"],
	    		                    	"AND",
	    		                    	["custrecord41","anyof","@NONE@"]
    		                       ];

        	}
    		else if(startDate != undefined && endDate != undefined)
    		{
    			log.debug('TEST', 'Start Date and End Date not undefined');
        		var searchFilter = [
        		                    	["created","within", startDateTime, endDateTime],
        		                    	"AND",
        		                    	["custrecord40","anyof","@NONE@"],
        		                    	"AND",
        		                    	["custrecord41","anyof","@NONE@"]
        		                   ];
    		}
        	else
        	{
        		var searchFilter = [
        		                    	["custrecord40","anyof","@NONE@"],
        		                    	"AND",
        		                    	["custrecord41","anyof","@NONE@"]
        		                   ];
        	}
    	                    		
    	var searchColumn = [
	    	                    search.createColumn({
	    	                    	name: 'internalid'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord3'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord5'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord6'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord17'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord9'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord12'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord13'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord14'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord2'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord_aux_prod_abbrv'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord78'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord_leads_source_type'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord62'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord40'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord41'
	    	                    }),
	    	                    search.createColumn({
	    	                    	name: 'custrecord_leads_opp'
	    	                    })   	                    
    	                   ];
    	
	    	var mySearch = search.create({
	    		type: 'customrecord_lsc_leads',
	    		filters: searchFilter,
	    		columns: searchColumn
	    	}); 
    		var result = mySearch.run().getRange({
    			start: 0,
    			end: 1000
    		});
    		
    		for(var i = 0; i < result.length; i+=1)
    		{
	    		sublist.setSublistValue({
	    			id: 'recid',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'internalid'})
	    			       ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'source',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord3'})
	    			       ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'firstname',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord5'})
	    			       ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'lastname',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord6'})
	    			       ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'email',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord17'})
	    			       ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'companyname',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord9'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'city',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord12'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'state',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord13'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'postal',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord14'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'product',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord2'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'prodabbr',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord_aux_prod_abbrv'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'location',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord78'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'leadsource',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord_leads_source_type'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'employee',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord62'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'company',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord40'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'contact',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord41'}) 
	    			        ]
	    		}),
	    		sublist.setSublistValue({
	    			id: 'opp',
	    			line: i,
	    			value: [
	    			        result[i].getValue({name: 'custrecord_leads_opp'}) 
	    			        ]
	    		});
	    		
    		}


		if(context.request.method === 'POST')
		{
			var recs = [];
			var leads = [];
			var contacts = [];
			var numOfLines = 0;
			var lineCount = context.request.getLineCount({
				group: 'leadtable'
			});
			
			var processRecord = context.request.getSublistValue({
				group: 'leadtable',
				name: 'processrecord',
				line: i
			});
			
			for(var i = 0; i < lineCount; i+=1)
			{
				var processRecord = context.request.getSublistValue({
					group: 'leadtable',
					name: 'processrecord',
					line: i
				});
				
				if (processRecord == 'T' || processRecord == true) 
	    		{     		
	    			var recId = context.request.getSublistValue
	    			({
		    			group: 'leadtable',
		    			name: 'recid',
		    			line: i
		    		});
	    			recs.push(recId);
	    			numOfLines+=1; 
	    		}
			}
			log.debug('Number of Records to Process', recs.length);
			
			for(var y = 0; y < numOfLines; y+=1)
	    	{
	    		var custRec = record.load
	    		({
	    			type: 'customrecord_lsc_leads',
	    			id: recs[y]
	    		});
	    		
	    		var companyName = custRec.getValue
	    		({
	    			fieldId: 'custrecord9'
	    		});
	    		
	    		var phone = custRec.getValue
	    		({
	    			fieldId: 'custrecord74'
	    		});
	    		
	    		var url = custRec.getValue
	    		({
	    			fieldId: 'custrecord26'
	    		});
	    		
	    		var email = custRec.getValue
	    		({
	    			fieldId: 'custrecord17'
	    		});
	    		
	    		var accId = custRec.getValue
	    		({
	    			fieldId: 'custrecord32'
	    		});
	    		
	    		var salesRep = custRec.getValue
	    		({
	    			fieldId: 'custrecord62'
	    		});
	    		
	    		var source = custRec.getValue
	    		({
	    			fieldId: 'custrecord_leads_source_type'
	    		});
	   
	    		var addy = custRec.getValue
	    		({
	    			fieldId: 'custrecord10'
	    		});
	    		
	    		var city = custRec.getValue
	    		({
	    			fieldId: 'custrecord12'
	    		});
	    		
	    		var state = custRec.getValue
	    		({
	    			fieldId: 'custrecord13'
	    		});
	    		
	    		var zip = custRec.getValue
	    		({
	    			fieldId: 'custrecord14'
	    		});
	    		
	    		var firstname = custRec.getValue
	    		({
	    			fieldId: 'custrecord5'
	    		});
	    		
	    		var lastname = custRec.getValue
	    		({
	    			fieldId: 'custrecord6'
	    		});
	    		
	    		var title = custRec.getValue
	    		({
	    			fieldId: 'custrecord7'
	    		});
	    		
	    		var cSource = custRec.getValue
	    		({
	    			fieldId: 'custrecord_leads_source_type'
	    		});
	    		
	    		var leadid = custRec.getValue
	    		({
	    			fieldId: 'custrecord30'
	    		});
	    		
	    		var status = 7;
	    		var country = 'US';
	    		var salesRole = '-2';
	    		
	    		
	    		// TODO SIC DESC field = DNB INDUSTRY
	    		// TODO SIC CODE DNBIndusry
	    		
	    		var duplicateLeads = search.duplicates({
	    			type: search.Type.CUSTOMER,
	    			fields: {
	    				companyname : companyName
	    			}
	    		});
	    		
	    		if(duplicateLeads.length == null || duplicateLeads.length == 0)
	    		{
	    			try
	    			{
			    		var leadRec = record.create
			    		({
			    			type: record.Type.LEAD,
			    			isDynamic: true
			    		});
		
			    		leadRec.setValue
			    		({
			    			fieldId: 'companyname',
			    			value: companyName
			    		}),
			    		
			    		leadRec.setValue
			    		({
			    			fieldId: 'entitystatus',
			    			value: status
			    		}),
			    		
			    		leadRec.setValue
			    		({
			    			fieldId: 'url',
			    			value: url
			    		}),
			    		
			    		leadRec.setValue
			    		({
			    			fieldId: 'email',
			    			value: email
			    		}),
			    		
			    		leadRec.setValue
			    		({
			    			fieldId: 'phone',
			    			value: phone
			    		});
			    		
			    		leadRec.setValue
			    		({
			    			fieldId: 'leadsource',
			    			value: cSource
			    		});
			    		
			    		var salesTeam = leadRec.selectNewLine
			    		({
			    			sublistId: 'salesteam'
			    		});
			    		
			    		leadRec.setCurrentSublistValue
			    		({
			    			sublistId: 'salesteam',
			    			fieldId: 'employee',
			    			value: salesRep
			    		}),
			    		
			    		leadRec.setCurrentSublistValue
			    		({
			    			sublistId: 'salesteam',
			    			fieldId: 'salesrole',
			    			value: salesRole
			    		}),
			    		
			    		leadRec.setCurrentSublistValue
			    		({
			    			sublistId: 'salesteam',
			    			fieldId: 'contribution',
			    			value: 100.0
			    		}),
			    		
			    		leadRec.setCurrentSublistValue
			    		({
			    			sublistId: 'salesteam',
			    			fieldId: 'isprimary',
			    			value: true
			    		});
			    		
			    		leadRec.commitLine
			    		({
			    			sublistId: 'salesteam'
			    		});
			    		
			    		var addressSubrecord = leadRec.getCurrentSublistSubrecord
			    		({
			    			sublistId: 'addressbook',
			    			fieldId: 'addressbookaddress',
			    		});
			    		
			    		addressSubrecord.setValue
			    		({
			    			fieldId: 'country',
			    			value: country
			    		}),
			    		
			    		addressSubrecord.setValue({
			    			fieldId: 'addr1',
			    			value: addy
			    		}),
			    		addressSubrecord.setValue({
			    			fieldId: 'city',
			    			value: city
			    		}),
			    		addressSubrecord.setValue({
			    			fieldId: 'state',
			    			value: state
			    		}),
			    		addressSubrecord.setValue({
			    			fieldId: 'zip',
			    			value: zip
			    		});
			    		
			    		leadRec.commitLine({
			    			sublistId: 'addressbook'
			    		});
			    		
			    		var leadId = leadRec.save();
			    		
	    			} 
	    			catch (error)
	    			{
	    				log.debug('ERROR', error.SuiteScriptError);
	    			}
	    		}
	    		
	    		var duplicateContacts = search.duplicates({
	    			type: search.Type.CONTACT,
	    			fields : {
	    				email: email
	    			}
	    		});
	    		
	    		if(duplicateContacts.length == null || duplicateContacts.length == 0)
	    		{
		    		var contactRec = record.create
		    		({
		    			type: record.Type.CONTACT,
		    			isDynamic: true,
		    		});
		    		
		    		contactRec.setValue({
		    			fieldId:'firstname',
		    			value: firstname
		    		}),
		    		contactRec.setValue({
		    			fieldId: 'lastname',
		    			value: lastname
		    		}),
		    		contactRec.setValue({
		    			fieldId: 'company',
		    			value: leadId
		    		}),
		    		contactRec.setValue({
		    			fieldId: 'email',
		    			value: email
		    		}),
		    		contactRec.setValue({
		    			fieldId: 'phone',
		    			value: phone
		    		}),
		    		contactRec.setValue({
		    			fieldId: 'title',
		    			value: title
		    		}),
		    		contactRec.setValue({
		    			fieldId: 'contactsource',
		    			value: cSource
		    		}),
		    		contactRec.setValue({
		    			fieldId: 'custentityswx_lead_id',
		    			value: leadid
		    		});
		    		
		    		var contactId = contactRec.save();
	    		}

	    		leads.push(leadId + '-' + companyName);
	    		contacts.push(contactId + '-' + firstname + ' ' + lastname);

	    		
	    		var params = {};
	    			params['leads'] = leads.toString();
	    			params['contacts'] = contacts.toString();
	    		
	    		var id = record.submitFields({
	    			type: 'customrecord_lsc_leads',
	    			id: recs[y],
	    			values: {
	    				custrecord40: leadId,
	    				custrecord41: contactId
	    			},
	    			options: {
	    				enableSourcing: false,
	    				ignoreMandatoryFields: true
	    			}
	    		});

	    	}
			
			
			context.response.sendRedirect({
				type: 'SUITELET',
				identifier: 'customscript_aux_sl_bulk_lead_processor',
				id: 'customdeploy_aux_sl_bulk_lead_processor',
				parameters: params
				
			});
		}
				
			
				context.response.writePage(form);
	}

    return {
        onRequest: onRequest
    };
    
});


