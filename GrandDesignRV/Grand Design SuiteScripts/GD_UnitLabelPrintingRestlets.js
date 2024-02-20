/**
 * Description: This script contains logic for Unit Label Printing Restlet.
 * @author ibrahima
 */

/**
 * Returns json array object of units for label printing based on the specified Serial Number(s)
 */
 function GetLabelPrintingUnitInfoBySerialNumber(datain)
 {
 nlapiLogExecution('DEBUG', 'GetLabelPrintingUnitInfoBySerialNumber Start', '');

	 var jsonObjectArray = new Array();

	 if(IsDefined(datain))
	 {
		 var filters = new Array();

		 if(IsDefined(datain.vinNumber) && datain.vinNumber != '')
		 {
 //			nlapiLogExecution('DEBUG', 'Vin #', datain.vinNumber);
			 filters[filters.length] = new nlobjSearchFilter('name', null, 'contains', datain.vinNumber);
		 }
		 else if(IsDefined(datain.fromSerialNumber) && trim(datain.fromSerialNumber) != '')
		 {
 //			nlapiLogExecution('DEBUG', 'From Serial', datain.fromSerialNumber);
			 //set filters
			 if(IsDefined(datain.toSerialNumber) && trim(datain.toSerialNumber) != '') //both start and end serial numbers are set.
			 {
				 var index = filters.length;
				 filters[index ] = new nlobjSearchFilter('formulanumeric', null, 'greaterthanorequalto', trim(datain.fromSerialNumber));
				 filters[index].setFormula('TO_NUMBER({custrecordunit_serialnumber})');

				 index = filters.length;
				 filters[index ] = new nlobjSearchFilter('formulanumeric', null, 'lessthanorequalto', trim(datain.toSerialNumber));
				 filters[index].setFormula('TO_NUMBER({custrecordunit_serialnumber})');
			 }
			 else //only start serial number, filter by one serial number
			 {
				 var index = filters.length;
				 filters[index ] = new nlobjSearchFilter('formulanumeric', null, 'equalto', trim(datain.fromSerialNumber));
				 filters[index].setFormula('TO_NUMBER({custrecordunit_serialnumber})');
			 }
		 }

		 if(filters.length > 0) //At least one filter is set, continue
		 {
 //			var companyInfo = nlapiLoadConfiguration('companyinformation');
 //			var companyName = ConvertNSFieldToString(companyInfo.getFieldValue('companyname'));
 //			var companyAddress1 = ConvertNSFieldToString(companyInfo.getFieldValue('address1'));
 //			var companyCity = ConvertNSFieldToString(companyInfo.getFieldValue('city'));
 //			var companyState = ConvertNSFieldToString(companyInfo.getFieldText('state'));
 //			var companyZip = ConvertNSFieldToString(companyInfo.getFieldValue('zip'));

			 //Gets company info using suitelet that is available without login.
			 //We use this workaround because NS doesn't allow roles that don't have
			 //admin priviledges to see company information and our Restlet user is not admin.
			 var companyInfo = GetCompanyInfoJSON();
			 var companyName = companyInfo.name;
			 var companyAddress1 = companyInfo.address1;
			 var companyCity = companyInfo.city;
			 var companyState = companyInfo.state;
			 var companyZip = companyInfo.zip;

			 var columns = new Array();
			 columns.push(new nlobjSearchColumn('custitemrvs_uvwminweight', 'custrecordunit_model'));
			 columns.push(new nlobjSearchColumn('custitemrvs_uvwmaxweight', 'custrecordunit_model'));
			 columns.push(new nlobjSearchColumn('custitemrvs_hitchminweight', 'custrecordunit_model'));
			 columns.push(new nlobjSearchColumn('custitemrvs_hitchmaxweight', 'custrecordunit_model'));
			 columns.push(new nlobjSearchColumn('custitemrvsmodelextlength', 'custrecordunit_model'));
			 columns.push(new nlobjSearchColumn('custrecordunit_dealer'));
			 columns.push(new nlobjSearchColumn('custrecordunit_freshwatercapacity'));
			 columns.push(new nlobjSearchColumn('custrecordunit_waterheatercapacity'));
			 columns.push(new nlobjSearchColumn('custrecordunit_wastewatercapacity'));

			 /*
			  custrecordunit_freshwatercapacity
			  custrecordunit_waterheatercapacity
			  custrecordunit_wastewatercapacity
			  1 gal -> KG = 3.79KG
			 */

			 //start processing results.
			 var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchunitsforlabelprinting', filters, columns);

			 if (results != null && results.length > 0)
			 {
				 for (var i=0; i<results.length; i++)
				 {
					 var resultObject = results[i];

					 var unitObject = {};
					 var dealerID = resultObject.getValue('custrecordunit_dealer');

					 var dealerRecord = nlapiLoadRecord('customer', dealerID);
					 var defaultShippingAddressIndex = dealerRecord.findLineItemValue('addressbook', 'defaultshipping', 'T');
					 var shipToCountry = dealerRecord.getLineItemValue('addressbook', 'country', defaultShippingAddressIndex);

					 var tireSize = ConvertNSFieldToString(resultObject.getValue('custrecordunit_tire'));
					 var psi = ConvertNSFieldToInt(resultObject.getValue('custrecordunit_psi'));
					 var kpa = Math.round(ConvertPSIToKPA(psi));
					 var rims = ConvertNSFieldToString(resultObject.getValue('custrecordunit_rim'));

					 var mfgDateFull = nlapiStringToDate(resultObject.getValue('custrecordunit_actualofflinedate'));
					 var mfgDate = "";
					 if (mfgDateFull != null)
						 mfgDate = (mfgDateFull.getMonth() + 1) + '/' + mfgDateFull.getFullYear();

					 var gvwrLb = ConvertNSFieldToInt(resultObject.getValue('custrecordunit_gvwrlbs'));
					 var gvwrKg = Math.round(ConvertLbToKG(gvwrLb));

					 var gawrLb = ConvertNSFieldToInt(resultObject.getValue('custrecordunit_gawrsingleaxle'));
					 var gawrKg = Math.round(ConvertLbToKG(gawrLb));

					 var trailerType = ConvertNSFieldToString(resultObject.getText('custrecordunit_typeofvehicle'));
					 var singleOrDualAxle = 'SINGLE';

					 var freshWaterCapacityGal = ConvertNSFieldToInt(resultObject.getValue('custrecordunit_freshwatercapacity'));
					 var uvwLb = ConvertNSFieldToInt(resultObject.getValue('custrecordunit_uvw'));
					 var lpGasCapacityLb = ConvertNSFieldToInt(resultObject.getValue('custrecordunit_lpgasweight'));

					 var waterHeaterCapacityGal = ConvertNSFieldToInt(resultObject.getValue('custrecordunit_waterheatercapacity'));
					 var freshWaterCapacityLb = ConvertGalToLb(freshWaterCapacityGal);
					 var waterHeaterCapacityLb = ConvertGalToLb(waterHeaterCapacityGal);

					 /** Begin Case 7686 changes **/
					  var uvwMinWeightLb = ConvertNSFieldToInt(resultObject.getValue('custitemrvs_uvwminweight', 'custrecordunit_model'));
					 var uvwMinWeightKg = Math.round(ConvertLbToKG(uvwMinWeightLb));

					 var uvwMaxWeightLb = ConvertNSFieldToInt(resultObject.getValue('custitemrvs_uvwmaxweight', 'custrecordunit_model'));
					 var uvwMaxWeightKg = Math.round(ConvertLbToKG(uvwMaxWeightLb));

					 var hitchMinWeightLb = ConvertNSFieldToInt(resultObject.getValue('custitemrvs_hitchminweight', 'custrecordunit_model'));
					 var hitchMinWeightKg = Math.round(ConvertLbToKG(hitchMinWeightLb));

					 var hitchMaxWeightLb = ConvertNSFieldToInt(resultObject.getValue('custitemrvs_hitchmaxweight', 'custrecordunit_model'));
					 var hitchMaxWeightKg = Math.round(ConvertLbToKG(hitchMaxWeightLb));
					 /** End Case 7686 changes **/

					 // Pulling Ext. Length per Grand Design's request since they use RVS version.
					 var extLength = ConvertNSFieldToString(resultObject.getValue('custitemrvsmodelextlength', 'custrecordunit_model'));
					 var overallLengthStr = '';
					 if (extLength != '')
						 overallLengthStr = 'Recreational vehicle overall length ' + extLength + ' as manufactured.';

					 //	Cargo Capacity (Lbs)	[Unit.GVWR] - [Unit.UVW] - [Unit.LPGasWeight] - [Unit.WaterHeaterCapacity]
					 //	Water Capacity (Lbs)	([Unit.FreshWaterCapacity] * 8.3) + [Unit.WaterHeaterCapacity]
					 // *** 10/2/2013 - NAH Per a phone call from Grand Design we are no longer including fresh water capacity, and hot water capacity in the cargo capacity calculations
					 var cargoCapacityLb = Math.round(gvwrLb - uvwLb - lpGasCapacityLb); //  - freshWaterCapacityLb - waterHeaterCapacityLb
					 var cargoCapacityKg = Math.round(ConvertLbToKG(cargoCapacityLb));

					 var waterCapacityLB = Math.round(ConvertGalToLb(freshWaterCapacityGal) + waterHeaterCapacityLb);
					 var waterCapacityKG = Math.round(ConvertLbToKG(waterCapacityLB));

					 var coldWaterFullWeight = Math.round(ConvertGalToLb(resultObject.getValue('custrecordunit_freshwatercapacity')));
					 coldWaterFullWeight = Math.round(ConvertLbToKG(coldWaterFullWeight));

					 var hotWaterFullWeight = Math.round(ConvertGalToLb(resultObject.getValue('custrecordunit_waterheatercapacity')));
					 hotWaterFullWeight = Math.round(ConvertLbToKG(hotWaterFullWeight));

					 var wasteWaterFullWeight = Math.round(ConvertGalToLb(resultObject.getValue('custrecordunit_wastewatercapacity')));
					 wasteWaterFullWeight = Math.round(ConvertLbToKG(wasteWaterFullWeight));

					 unitObject['InternalId'] = resultObject.getId();
					 unitObject['freshWaterFullWeight'] = coldWaterFullWeight;
					 unitObject['hotWaterFullWeight'] = hotWaterFullWeight;
					 unitObject['wasteWaterFullWeight'] = wasteWaterFullWeight;
					 unitObject['shipTo'] = shipToCountry;
					 unitObject['VIN'] = resultObject.getValue('name');
					 unitObject['SerialNumber'] = resultObject.getValue('custrecordunit_serialnumber');
					 unitObject['Model'] = resultObject.getValue('itemid', 'custrecordunit_model');
					 unitObject['FrontSize'] = tireSize;
					 unitObject['FrontPSI'] = psi;
					 unitObject['FrontKPA'] = kpa;
					 unitObject['RearSize'] = tireSize;
					 unitObject['RearPSI'] = psi;
					 unitObject['RearKPA'] = kpa;
					 unitObject['SpareSize'] = tireSize;
					 unitObject['SparePSI'] = psi;
					 unitObject['SpareKPA'] = kpa;
					 unitObject['HasSpare'] = true;
					 unitObject['CompanyLine1'] = companyName;
					 unitObject['CompanyLine2'] = companyAddress1;
					 unitObject['CompanyLine3'] = companyCity + ', ' + companyState + ' ' + companyZip;
					 unitObject['ManufactureDate'] = mfgDate;
					 unitObject['GVWR_LB'] = gvwrLb;
					 unitObject['GVWR_KG'] = gvwrKg;
					 unitObject['GAWR_LB'] = gawrLb;
					 unitObject['GAWR_KG'] = gawrKg;
					 unitObject['UVW_LB'] = uvwLb;
					 unitObject['UVW_KG'] = Math.round(ConvertLbToKG(uvwLb));
					 unitObject['Rims'] = rims;
					 unitObject['TrailerType'] = trailerType;
					 unitObject['SingleOrDualAxle'] = singleOrDualAxle;
					 unitObject['CargoCapacityLB'] = cargoCapacityLb;
					 unitObject['CargoCapacityKG'] = cargoCapacityKg;
					 unitObject['WaterCapacityLB'] = waterCapacityLB;
					 unitObject['WaterCapacityKG'] = waterCapacityKG;

					 /** Begin Case 7686 changes **/
					 unitObject['UVWMINWEIGHT_LB'] = uvwMinWeightLb;
					 unitObject['UVWMINWEIGHT_KG'] = uvwMinWeightKg;
					 unitObject['UVWMAXWEIGHT_LB'] = uvwMaxWeightLb;
					 unitObject['UVWMAXWEIGHT_KG'] = uvwMaxWeightKg;
					 unitObject['HITCHMINWEIGHT_LB'] = hitchMinWeightLb;
					 unitObject['HITCHMINWEIGHT_KG'] = hitchMinWeightKg;
					 unitObject['HITCHMAXWEIGHT_LB'] = hitchMaxWeightLb;
					 unitObject['HITCHMAXWEIGHT_KG'] = hitchMaxWeightKg;
					 /** End Case 7686 changes **/
					 unitObject['RvOverallLength'] = overallLengthStr;

					 jsonObjectArray[jsonObjectArray.length] = unitObject;
				 }
			 }
		 }
	 }

 nlapiLogExecution('DEBUG', 'GetLabelPrintingUnitInfoBySerialNumber End', '');
	 return jsonObjectArray;
 }

 /**
  * Gets company information as a json object using suitelet.
  * We use suitelet to get this info because company information is only
  * available for admins and our user that requests Restlet is not admin.
  * @returns
  */
 function GetCompanyInfoJSON()
 {
	 var header = new Array();
	 header['User-Agent-x'] = 'SuiteScript-Call';
	 header['Content-Type'] = 'text/plain';
	 header['Method'] = 'GET';
	 //The last parameter in this line indicates that we need the external url and
	 //not the internal because we want to use the restlet without logging in.
	 var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptsuitelet_companyinfo', 'customdeploycompanyinfosuiteletdeploy', true);
	 var companyInfoResponse = nlapiRequestURL(suiteletURL, null, header);
	 var companyInfo = JSON.parse(companyInfoResponse.getBody());

	 return companyInfo;
 }


 /**
  * Updates unit weight given unit vin # and the weight to be set.
  * @param datain
  * @returns {Boolean}
  */
 function UpdateUnitWeight(datain)
 {
 nlapiLogExecution('DEBUG', 'UpdateUnitWeight Start', '');

	 if(IsDefined(datain) && IsDefined(datain.vin))
	 {
		 var hitchWeight = 0;
		 if(IsDefined(datain.hitchWeight) && !isNaN(parseFloat(datain.hitchWeight)))
			 hitchWeight = parseFloat(datain.hitchWeight);

		 var leftWeight = 0;
		 if(IsDefined(datain.leftWeight) && !isNaN(parseFloat(datain.leftWeight)))
			 leftWeight = parseFloat(datain.leftWeight);

		 var rightWeight = 0;
		 if(IsDefined(datain.rightWeight) && !isNaN(parseFloat(datain.rightWeight)))
			 rightWeight = parseFloat(datain.rightWeight);

		 var weight = 0;
		 //Weight is not provided, calculate it based on hitch, left, and right weight
		 if(!IsDefined(datain.weight) || (IsDefined(datain.weight) && !isNaN(parseFloat(datain.weight)) && parseFloat(datain.weight) == 0))
		 {
			 weight = hitchWeight + leftWeight + rightWeight;
		 }
		 else //weight is specified
		 {
			 weight = parseFloat(datain.weight);
		 }

		 var filters = new Array();
		 filters[filters.length] = new nlobjSearchFilter('name', null, 'contains', trim(datain.vin));
		 var results = nlapiSearchRecord('customrecordrvsunit', 'customsearchunitsforlabelprinting', filters);
		 if(results != null && results.length == 1) //vin is unique, there should be only one record.
		 {
			 var maxTryCount = 1000;
			 var curTryCount = 0;
			 while(curTryCount < maxTryCount) {
				 //We will update unit fields that are specified and also update production status to be completed and set completed date to be today's date.
				 var fields = ['custrecordunit_actualshipweight', 'custrecordunit_leftweight', 'custrecordunit_rightweight', 'custrecordunit_hitchweight', 'custrecordunit_status', 'custrecordunit_datecompleted', 'custrecordunit_uvw', 'custrecordrvs_weightdiscrepancyreason'];
				 var values = [weight, leftWeight, rightWeight, hitchWeight, UNIT_STATUS_COMPLETE, getTodaysDate(), weight, datain.weightDiscrepancyReason];
				 try {
					 nlapiSubmitField(results[0].getRecordType(), results[0].getId(), fields, values, false);
					 break;
				 }
				 catch(err){
					 nlapiLogExecution('debug', 'err message', JSON.stringify(err));
					 if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
						 curTryCount++;
						 continue;
					 }
					 throw err;
				 }
			 }
		 }
	 }

 nlapiLogExecution('DEBUG', 'UpdateUnitWeight End', '');
 }

 /**
  * Creates weight label record given json object with the recordtype specified and returns internal id of the created record.
  * @returns
  */
 function CreateWeightLabelRecord(datain)
 {
	 var recordId = '';
	 var err = new Object();
	 // Validate if mandatory record type is set in the request
	 if (!datain.recordtype)
	 {
		 err.status = "failed";
		 err.message= "missing recordtype";
		 return err.message;
	 }

	 //nlapiLogExecution('DEBUG','Creating Tracking Number', 'Track # Name: ' + datain.name);
	  record = nlapiCreateRecord(datain.recordtype);
	 for (var fieldname in datain)
	 {
		  if (datain.hasOwnProperty(fieldname))
		  {
			  if (fieldname != 'recordtype' && fieldname != 'id')
			  {
				  var value = datain[fieldname];
				  if (value && typeof value != 'object') // ignore other type of parameters
				  {
					  record.setFieldValue(fieldname, value);
				  }
			  }
		  }
	 }

	 recordId = nlapiSubmitRecord(record);

	 return recordId.toString();
 }

 /**
  * Gets a list of all Locations for weight label.
  */
 function GetWeightLabelLocations()
 {
	 var results = nlapiSearchRecord('location', 'customsearchrvsweightlabelunitlocations');

	 return CreateJSONArrayFromSearchResults(results);
 }

 /**
  * Gets a list of all weight label bays
  */
 function GetWeightLabelBays()
 {
	 var results = nlapiSearchRecord('customrecordrvsweightlabelbay', 'customsearchgd_weightlabelbay');

	 return CreateJSONArrayFromSearchResults(results);
 }

 /**
  * Gets a list of all weight label bays
  */
 function GetMostRecentLogByBayWithWinWedgeNumber(datain)
 {
	 var jsonArray = null;
	 if(IsDefined(datain) && IsDefined(datain.bayId))
	 {
		 var filters = new Array();
		 filters[filters.length] = new nlobjSearchFilter('custrecordweightlabellog_bay', null, 'anyof', trim(datain.bayId));
		 filters[filters.length] = new nlobjSearchFilter('custrecordweightlabellog_winwedgenumber', null, 'isnotempty');

		 var results = nlapiSearchRecord('customrecordrvsweightlabellog', 'customsearchrvsweightlabellog', filters); //This saved search is sorted by created desc (most recent one at the top
		 jsonArray = CreateJSONArrayFromSearchResults(results, 1);	//return the first result only. 1 is equivalent to sql statement select top(1)

	 }
	 return jsonArray;
 }