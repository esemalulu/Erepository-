/**
 * Grand Design specific scripts related to the program custom record.
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Jun 2016     nathanah
 *
 */

/**
 * Auto-populate the program with units if needed.
 * 
 * @appliedtorecord customrecordrvsprogram
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function GD_Program_BeforeSubmit(type)
{
	// if we are creating or copying the program, auto-populate with Program Units if the auto-populate box is checked and this is a Dealer or Salesman Spiff program type
	
	if (type == 'create' || type == 'copy')
	{
		var autoPopulate = nlapiGetFieldValue('custrecordgd_program_autopopulateunits');
		var programTypeId = nlapiGetFieldValue('custrecordprogram_type');
		
		if (autoPopulate == 'T' && (programTypeId == GD_PROGRAMTYPE_SALESMENSPIFF || programTypeId == GD_PROGRAMTYPE_DEALERSPIFF))
		{
			// find any units with this criteria:
			// - For the dealer on the program
			// - For the series on the program (if one is set)
			// - With Retail Sold Date between the program start and end dates
			// - No Retail Sold Date and the order has been invoiced
			
			var dealerId = nlapiGetFieldValue('custrecordprogram_dealer');
			var incentiveAmount = ConvertNSFieldToFloat(nlapiGetFieldValue('custrecordgd_program_incentiveamt'));
			var startDate = nlapiGetFieldValue('custrecordprogram_startdate');
			var endDate = nlapiGetFieldValue('custrecordprogram_enddate');
			var seriesId = nlapiGetFieldValue('custrecordgd_program_series') || '';
			var modelIds = nlapiGetFieldValues('custrecordgd_program_model') || '';
			var yearId = nlapiGetFieldValue('custrecordgd_program_year') || '';
            var modelType = nlapiGetFieldValue('custrecord_gd_program_model_type') || '';

			var unitFilters = 
				[ 
             	  	 ['custrecordunit_dealer', 'anyof', dealerId ],
            	  'AND',
            	     ['custrecordunit_salesorder.mainline', 'is', 'T'],
                  'AND',
	            	  [
	            	   	[
	            	   		['custrecordunit_retailpurchaseddate', 'isnotempty', "" ],
	            	   		'AND',
	            	   		['custrecordunit_retailpurchaseddate', 'within', startDate, endDate]
	            	   	],
	            	   	'OR',
	            	   	[
	            	   		['custrecordunit_retailpurchaseddate', 'isempty', "" ],
	            	   		'AND',
	            	   		['custrecordunit_salesorder.status', 'is', SALESORDER_SRCHFILTER_BILLED]
	            	   	]
	            	  ]
             	];			
			
			
			//If a series, year, or model are set on the program, add filters for them.
			if (seriesId != '')
			{
				unitFilters.push('AND');
				unitFilters.push(['custrecordunit_series', 'anyof', seriesId]);
			}
			if(yearId != '')
			{
				unitFilters.push('AND');
				unitFilters.push(['custrecordunit_modelyear', 'anyof', yearId]);
			}
			if(modelIds != '')
			{
				unitFilters.push('AND');
				unitFilters.push(['custrecordunit_model', 'anyof', modelIds]);
			}
          if(modelType != '')
			{
				unitFilters.push('AND');
				unitFilters.push(['custrecordunit_model.custitemrvsmodeltype', 'anyof', modelType]);
			}

			var unitSearch = nlapiSearchRecord('customrecordrvsunit', null, unitFilters, null);
			if (unitSearch != null)
			{
				// take the units and add them to the Program Unit sublist
				// we need make sure that the unit isn't already in the list units on the program
				var existingUnitsArray = new HashTable();
				
				var lineCount = nlapiGetLineItemCount('recmachcustrecordprogramunit_program');
				for (var i=1; i<=lineCount; i++)
				{
					existingUnitsArray.setItem(nlapiGetLineItemValue('recmachcustrecordprogramunit_program', 'custrecordprogramunit_unit', i), nlapiGetLineItemValue('recmachcustrecordprogramunit_program', 'custrecordprogramunit_unit', i));
				}
				
				for (var i=0; i<unitSearch.length; i++)
				{
					var unitId = unitSearch[i].getId();
					
					if (!existingUnitsArray.hasItem(unitId))
					{
						nlapiSelectNewLineItem('recmachcustrecordprogramunit_program');
						nlapiSetCurrentLineItemValue('recmachcustrecordprogramunit_program', 'custrecordprogramunit_unit', unitId, false, false);
						nlapiSetCurrentLineItemValue('recmachcustrecordprogramunit_program', 'custrecordprogramunit_incentiveamount', incentiveAmount, false, false);
						nlapiCommitLineItem('recmachcustrecordprogramunit_program');
					}
				}
			}
		}
	}
}