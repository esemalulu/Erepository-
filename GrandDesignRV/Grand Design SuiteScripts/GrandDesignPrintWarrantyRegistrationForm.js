// Acct: 1215293

function TestPrintout()
{
	var html = PrintWarrantyRegistrationForm(null, nlapiGetRecordId());
	window.open(html);
}

/**
 * Print warranty registration given either sales order Id or unit retail customer Id.
 * @param salesOrderId
 * @param unitRetailCustomerId
 * @returns {String}
 */
function PrintWarrantyRegistrationForm(salesOrderId, unitRetailCustomerId)
{	
	// We do this if statement in order to utilize both the RVS default code which is in the else part for internal sales orders
	// and we also have an external print on the unit retail customer form.  This if statement was added because of the case 4239.
	// JRB 7-25-2014
	
	//The above case (4239) is an ARBOC case. Grand Design never wants to use the RVS printout, so the 'if' statement below was commented out,
	//along with all of the code for the standard RVS Warranty Registration printout, on the second half of this file.
	//BrianS 7-6-2015
//	if (salesOrderId == null)
//	{
		var unit = null;
		var salesOrder = null;
		var dealer = null;
		var unitRetailCustomer = null;
		//nlapiLogExecution('debug', 'PrintWarrantyRegistrationForm', 'unitRetailCustomerId = ' + unitRetailCustomerId);
		if(unitRetailCustomerId == null) //Printing internally from a sales order
		{
			// get the data first
			salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
			
			var dealerId = salesOrder.getFieldValue('entity');
			var unitId = salesOrder.getFieldValue('custbodyrvsunit');
			
			dealer = nlapiLoadRecord('customer', dealerId);
			
			if(unitId != null && unitId != '')
				unit = nlapiLoadRecord('customrecordrvsunit', unitId);	
		}
		else //dealer portal, printing from Unit Retail Customer
		{
			
			unitRetailCustomer = nlapiLoadRecord('customrecordrvsunitretailcustomer', unitRetailCustomerId);
			var unitId = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_unit');
			unit = nlapiLoadRecord('customrecordrvsunit', unitId);
			
			var salesOrderId = unit.getFieldValue('custrecordunit_salesorder');
			if(salesOrderId != null && salesOrderId != '')
				salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
			
			var dealerId = unit.getFieldValue('custrecordunit_dealer');
			if(dealerId != null && dealerId != '')
				dealer = nlapiLoadRecord('customer', dealerId);		
		}				
		var seriesId = '';
		var model = '';
		var modelId = '';
		var modelYear = '';
		var make = '';
		if(salesOrder != null)
		{		
		
			seriesId = salesOrder.getFieldValue('custbodyrvsseries');	
			modelId = salesOrder.getFieldValue('custbodyrvsmodel');
			model = ConvertNSFieldToString(salesOrder.getFieldText('custbodyrvsmodel'));
			make = ConvertNSFieldToString(salesOrder.getFieldText('custbodyrvsseries'));
		}
				
		var dealerName = '';
		var dealerCity = '';
		var dealerState ='';
		var dealerTelephoneNo ='';
		if(dealer != null)
		{
			dealerName = ConvertNSFieldToString(dealer.getFieldValue('entityid'));	
			dealerCity = ConvertNSFieldToString(dealer.getFieldValue('billcity'));
			dealerState = ConvertNSFieldToString(dealer.getFieldValue('billstate'));
			dealerTelephoneNo = ConvertNSFieldToString(dealer.getFieldValue('phone'));
		}
	
		var dateofPurchase = '';
		var serialNumber = '';
		if(unit != null)
		{
			serialNumber = ConvertNSFieldToString(unit.getFieldValue('name'));
			dateofPurchase = ConvertNSFieldToString(unit.getFieldValue('custrecordunit_retailpurchaseddate'));
			if(dateofPurchase == null)
				dateofPurchase = '';		
			
			//If series and model are not set based on Sales Order, use Unit
			if(seriesId == null || seriesId == '')
			{
				seriesId = unit.getFieldValue('custrecordunit_series');	
				make = unit.getFieldText('custrecordunit_series');	
			}
				
			if(model == null || model == '')
			{
				modelId = unit.getFieldValue('custrecordunit_model');
				model = ConvertNSFieldToString(unit.getFieldText('custrecordunit_model'));
			}
				
		}
		
		if(modelId != null && modelId != '')
		{
			modelYear = nlapiLookupField('assemblyitem', modelId, 'custitemrvsmodelyear', true);
		}
		
		var sellingPerson = '';
		var firstName = '';
		var middleName = '';
		var lastName = '';
		var ownerAddress = '';
		var ownerCity = '';
		var ownerState = '';
		var ownerZip = '';
		var ownerCountry = '';
		var ownerPhone = '';
		var ownerEmail = '';
		var ownerNameText = '';
		var ownerSpouse = '';
		var dateOfBirth = '';
		var noFrameDamage = 'F';
		var noFrameRustCorrossion = 'F';
		var couplerPinBox = 'F';
		var breakawaySwitchFunctional = 'F';
		var sevenWayPigtail = 'F';
		var landingLegs = 'F';
		var axleUBolts = 'F';
		var hangersShackles = 'F';
		var noDamageWeartoTiresWheels = 'F';
		var allLugNutsTorqued = 'F';
		var safetyChains = 'F';
		var regulatorPressure = 'F';
		var tankTransferSwitch = 'F';
		var	bottlesProperlySecured = 'F';
		var lineConnections = 'F';
		var applianceConnections = 'F';
		var lpDropPressure = 'F';
		var flooringMaterial = 'F';
		var floorRegisters = 'F';
		var wallPanelTrim = 'F';
		var wallPanelsDefect = 'F';
		var ceilingPanelTrim = 'F';
		var ceilingPanelDefect = 'F';
		var cabinetDoors = 'F';
		var cabinetDrawerFronts = 'F';
		var drawersFunction = 'F';
		var passthruDoors = 'F';
		var foldingBiFoldDoors = 'F';
		var closetRodsSecure = 'F';
		var shelvesProperly = 'F';
		var countertopsDefect = 'F';
		var dinetteTable = 'F';
		var dinetteConverts = 'F';
		var allFurniture = 'F';
		var sofaConversion = 'F';
		var windowsScreensFunction = 'F';
		var windowTreatmentsSecure = 'F';
		var blindShadesAdjusted = 'F';
		var furnaceFunction = 'F';
		var furnaceBurnOff = 'F';
		var acFunction = 'F';
		var thermostat = 'F';
		var refrigerator = 'F';
		var iceMaker = 'F';
		var rangeOven = 'F';
		var rangeHood = 'F';
		var microwave = 'F';
		var waterHeaterFunctions = 'F';
		var waterHeaterByPass = 'F';
		var Fireplace = 'F';
		var tvsFunction = 'F';
		var radioStereo = 'F';
		var vcrDVDBluRay = 'F';
		var homeStereo = 'F';
		var allSpeakers = 'F';
		var allRemotes = 'F';
		var allSoftGoods = 'F';
		var tirePressureSet = 'F';
		var lpTanksShut = 'F';
		var allDoorsWindowsLatched = 'F';
		var terminationSystem = 'F';
		var terminationHandles = 'F';
		var lowPoint = 'F';
		var tankVent = 'F';
		var noExternalBlack = 'F';
		var waterControl = 'F';
		var gravityFill = 'F';
		var exteriorWater = 'F';
		var showersFaucets = 'F';
		var waterPump = 'F';
		var toiletFunctions = 'F';
		var faucetShower = 'F';
		var waterLines = 'F';
		var showerTub = 'F';
		var showerDoor = 'F';
		var allLights = 'F';
		var allOutlets = 'F';
		var allWallSwitches = 'F';
		var powerDisconnect = 'F';
		var allAccessible = 'F';
		var fuseBreaker = 'F';
		var gfiCircuits = 'F';
		var chassisMain = 'F';
		var autoReset = 'F';
		var generator = 'F';
		var wireBundles = 'F';
		var tankMonitor = 'F';
		var powerCenter = 'F';
		var powerFans = 'F';
		var fireExtinguisher = 'F';
		var smokeDetector = 'F';
		var lpCOTwo = 'F';
		var underbellySecure = 'F';
		var lpBottle = 'F';
		var lpLines = 'F';
		var batteryTray = 'F';
		var wireLooms = 'F';
		var fedTags = 'F';
		var tireLabel = 'F';
		var stateSeal = 'F';
		var stepsOperate = 'F';
		var grabHandle = 'F';
		var entryDoor = 'F';
		var baggageDoors = 'F';
		var rampDoor = 'F';
		var noDamage = 'F';
		var awningsFunction = 'F';
		var allExteriorLights = 'F';
		var outletsFunction = 'F';
		var spareTire = 'F';
		var ladderProperly = 'F';
		var roofAttachments = 'F';
		var roofMoldings = 'F';
		var cornerMoldings = 'F';
		var skirtMetal = 'F';
		var windowsSecured = 'F';
		var roomsFunction = 'F';
		var roomsSeal = 'F';
		var hydraulicValves = 'F';
		var reservoirFluid = 'F';
		var undersideCable = 'F';
		var manualOverride = 'F';
		var signedCopy = 'F';
		
		var dsFront = '';
		var dsCenter = '';
		var dsRear = '';
		var odsFront = '';
		var odsCenter = '';
		var odsRear = '';
		var startTime = '';
		var startInWaterCol = '';
		var endTime = '';
		var endInWaterCol = '';
		var testLocation = '';
			
		
		if(unitRetailCustomer != null)
		{
			var sellingPersonId = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_dealsalesrp');
			if(sellingPersonId != null && sellingPersonId != '')
			{
				sellingPerson = nlapiLookupField('contact', sellingPersonId, 'entityid');
				
				if(sellingPerson == null)
					sellingPerson = '';
			}
			
			firstName = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_firstname'));
			
			middleName = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_middlename'));
			
			lastName = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_lastname'));
			
			if(middleName != '')
				owner = firstName + ' ' + middleName + ' ' + lastName;
			else
				owner = firstName + ' ' + lastName;	
			
			//This nameText variable displays in the Owner's Name field on the printout. This variable was added to allow blank warranties to be printed
			ownerNameText = lastName + ',&nbsp;' + middleName + ',&nbsp;' + firstName + '&nbsp;';
			if(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_firstname') == 'blankcustomer') ownerNameText = '&nbsp;';
			
			var ownerAddress1 = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_address1'));
			
			var ownerAddress2 = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_address2'));
			
			ownerEmail = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_email'));
			if(ownerEmail == null)
				ownerEmail = '';
			
			ownerAddress = ownerAddress1;
			if(ownerAddress2 != '') //append address 2
				ownerAddress += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + ownerAddress2;
			
			dateOfBirth = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordcunitretailcustomer_dob'));		

			ownerSpouse = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_spouse'));		

			ownerCity = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_city'));		
			
			ownerState = ConvertNSFieldToString(unitRetailCustomer.getFieldText('custrecordunitretailcustomer_state'));	
			
			ownerZip = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_zipcode'));
			
			ownerCountry = ConvertNSFieldToString(unitRetailCustomer.getFieldText('custrecordunitretailcustomer_country'));
			
			ownerPhone = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_phone'));
			
			dsFront = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_dsfront'));
			
			dsCenter = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_dscenter'));
			
			dsRear = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_dsrear'));
			
			odsFront = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_odsfront'));
			
			odsCenter = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_odscenter'));
			
			odsRear = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_odsrear'));
			
			startTime = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_starttime'));
	
			startInWaterCol = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_startiwc'));
			
			endTime = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_endtime'));
			
			endInWaterCol = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_endiwc'));
			
			testLocation = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_testloc'));
			
			noFrameDamage = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_framedamage');
			noFrameRustCorrossion = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_framerust');
			couplerPinBox = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_couplerpin');
			safetyChains = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_safetychain');
			breakawaySwitchFunctional = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_breakaway');
			sevenWayPigtail = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_pigtail');
			landingLegs = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_landinglegs');
			axleUBolts = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_axleubolt');
			hangersShackles = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_hangers');
			noDamageWeartoTiresWheels = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_weartotires');
			allLugNutsTorqued = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_lugsnuts');
			underbellySecure = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_underbelly');
			lpBottle = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_bottletray');
			lpLines = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_lplines');
			batteryTray = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_batterytray');
			wireLooms = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_wirelooms');
			fedTags = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_fedtags');
			tireLabel = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_tirelabel');
			stateSeal = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_stateseal');
			stepsOperate = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_stepsoper');
			grabHandle = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_grabhandle');
			entryDoor = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_entrydoor');
			baggageDoors = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_baggagedoor');
			rampDoor = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_rampdoor');
			noDamage = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_damageext');
			awningsFunction = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_awning');
			allExteriorLights = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_extlights');
			outletsFunction = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_outlets');
			spareTire = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_sparetire');
			ladderProperly = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_ladder');
			roofAttachments = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_roofattach');
			roofMoldings = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_roofmolding');
			cornerMoldings = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_cornermold');
			skirtMetal = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_skirtmetal');
			windowsSecured = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_winsecure');
			roomsFunction = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_roomsfunct');
			roomsSeal = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_roomsseal');
			hydraulicValves = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_hydraulic');
			reservoirFluid = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_reservoir');
			undersideCable = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_underside');
			manualOverride = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_manover');
			regulatorPressure = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_regpressure');
			tankTransferSwitch = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_tanktrans');
			bottlesProperlySecured = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_bottles');
			lineConnections = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_lineconnect');
			applianceConnections = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_appconn');
			lpDropPressure = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_lpdrop');
			terminationSystem = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_termsystem');
			terminationHandles = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_termhandle');
			lowPoint = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_lowpoint');
			tankVent = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_tankvent');
			noExternalBlack = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_extblack');
			waterControl = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_watercont');
			gravityFill = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_gravity');
			exteriorWater = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_extwater');
			showersFaucets = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_showers');
			waterPump = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_waterpump');
			toiletFunctions = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_toilet');
			faucetShower = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_faucetshow');
			waterLines = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_waterline');
			showerTub = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_showertub');
			showerDoor = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_showerdoor');
			allLights = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_alllight');
			allOutlets = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_outletfunct');
			allWallSwitches = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_wallswitch');
			powerDisconnect = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_powerdisc');
			allAccessible = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_accesswire');
			fuseBreaker = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_fusepanel');
			gfiCircuits = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_gfi');
			chassisMain = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_chassis');
			autoReset = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_autoreset');
			generator = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_genfunction');
			wireBundles = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_wirebundle');
			tankMonitor = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_tankmonitor');
			powerCenter = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_powercenter');
			powerFans = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_powerfans');
			fireExtinguisher = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_fireext');
			smokeDetector = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_smokedetect');
			lpCOTwo = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_lpco2');
			flooringMaterial = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_flooringmat');
			floorRegisters = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_floorreg');
			wallPanelTrim = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_wallpanel');
			wallPanelsDefect = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_wallpandef');
			ceilingPanelTrim = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_ceilingpan');
			ceilingPanelDefect = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_paneldef');
			cabinetDrawerFronts = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_cabdrawf');
			cabinetDoors = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_cabdoors');
			drawersFunction = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_drawfunct');
			passthruDoors = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_passthru');
			foldingBiFoldDoors = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_foldingdoor');
			closetRodsSecure = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_closetrod');
			shelvesProperly = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_shelvealign');
			countertopsDefect = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_countertop');
			dinetteTable = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_dinette');
			dinetteConverts = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_dinconvert');
			allFurniture = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_allfurn');
			sofaConversion = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_sofaconv');
			windowsScreensFunction = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_windows');
			windowTreatmentsSecure = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_windtreat');
			blindShadesAdjusted = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_blindshade');
			furnaceFunction = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_furnace');
			furnaceBurnOff = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_furnburn');
			acFunction = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_acfunction');
			thermostat = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_thermostat');
			refrigerator = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_reffunct');
			iceMaker = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_icemaker');
			rangeOven = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_rangeoven');
			rangeHood = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_rangehood');
			microwave = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_microfunct');
			waterHeaterFunctions = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_waterheater');
			waterHeaterByPass = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_waterbypass');
			Fireplace = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_fireplace');
			tvsFunction = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_tvfunction');
			radioStereo = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_radiostereo');
			vcrDVDBluRay = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_vcr');
			homeStereo = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_homestereo');
			allSpeakers = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_allspeak');
			allRemotes = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_allremotes');
			allSoftGoods = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_softgood');
			tirePressureSet = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_tirepress');
			lpTanksShut = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_lptank');
			allDoorsWindowsLatched = unitRetailCustomer.getFieldValue('custrecordunitretailcust_pdi_alldoorwind');
			signedCopy = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_custverific');
			
		}
		
		//Process PDI Checklist
		var checkedCheckbox = '<td style="border: 1px solid #000000;width:30px;white-space:nowrap;">&nbsp;&nbsp;&nbsp;X</td>';
		var unCheckedCheckbox = '<td style="border: 1px solid #000000;width:30px;white-space:nowrap;">&nbsp;</td>';
		var checkedCheckboxtwo = '<td style="border: 1px solid #000000;width=3%;white-space:nowrap;">&nbsp;&nbsp;&nbsp;X</td>';
		var unCheckedCheckboxtwo = '<td style="border: 1px solid #000000;width=3%;white-space:nowrap;">&nbsp;</td>';
		
		if(noFrameDamage == 'T'){ noFrameDamage = checkedCheckbox;} else { noFrameDamage = unCheckedCheckbox;}
		if(noFrameRustCorrossion == 'T'){ noFrameRustCorrossion = checkedCheckbox;} else { noFrameRustCorrossion = unCheckedCheckbox;}
		if(couplerPinBox == 'T'){ couplerPinBox = checkedCheckbox;} else { couplerPinBox = unCheckedCheckbox;}
		if(safetyChains == 'T'){ safetyChains = checkedCheckbox;} else { safetyChains = unCheckedCheckbox;}
		if(breakawaySwitchFunctional == 'T'){ breakawaySwitchFunctional = checkedCheckbox;} else { breakawaySwitchFunctional = unCheckedCheckbox;}
		if(sevenWayPigtail == 'T'){ sevenWayPigtail = checkedCheckbox;} else { sevenWayPigtail = unCheckedCheckbox;}
		if(landingLegs == 'T'){ landingLegs = checkedCheckbox;} else { landingLegs = unCheckedCheckbox;}
		if(axleUBolts == 'T'){ axleUBolts = checkedCheckbox;} else { axleUBolts = unCheckedCheckbox;}
		if(hangersShackles == 'T'){ hangersShackles = checkedCheckbox;} else { hangersShackles = unCheckedCheckbox;}
		if(noDamageWeartoTiresWheels == 'T'){ noDamageWeartoTiresWheels = checkedCheckbox;} else { noDamageWeartoTiresWheels = unCheckedCheckbox;}
		if(allLugNutsTorqued == 'T'){ allLugNutsTorqued = checkedCheckbox;} else { allLugNutsTorqued = unCheckedCheckbox;}
		if(regulatorPressure == 'T'){ regulatorPressure = checkedCheckbox;} else { regulatorPressure = unCheckedCheckbox;}
		if(tankTransferSwitch == 'T'){ tankTransferSwitch = checkedCheckbox;} else { tankTransferSwitch = unCheckedCheckbox;}
		if(bottlesProperlySecured == 'T'){ bottlesProperlySecured = checkedCheckbox;} else { bottlesProperlySecured = unCheckedCheckbox;}
		if(lineConnections == 'T'){ lineConnections = checkedCheckbox;} else { lineConnections = unCheckedCheckbox;}
		if(applianceConnections == 'T'){ applianceConnections = checkedCheckbox;} else { applianceConnections = unCheckedCheckbox;}
		if(lpDropPressure == 'T'){ lpDropPressure = checkedCheckbox;} else { lpDropPressure = unCheckedCheckbox;}
		if(flooringMaterial == 'T'){ flooringMaterial = checkedCheckbox;} else { flooringMaterial = unCheckedCheckbox;}
		if(floorRegisters == 'T'){ floorRegisters = checkedCheckbox;} else { floorRegisters = unCheckedCheckbox;}
		if(wallPanelTrim == 'T'){ wallPanelTrim = checkedCheckbox;} else { wallPanelTrim = unCheckedCheckbox;}
		if(wallPanelsDefect == 'T'){ wallPanelsDefect = checkedCheckbox;} else { wallPanelsDefect = unCheckedCheckbox;}
		if(ceilingPanelTrim == 'T'){ ceilingPanelTrim = checkedCheckbox;} else { ceilingPanelTrim = unCheckedCheckbox;}
		if(ceilingPanelDefect == 'T'){ ceilingPanelDefect = checkedCheckbox;} else { ceilingPanelDefect = unCheckedCheckbox;}
		if(cabinetDoors == 'T'){ cabinetDoors = checkedCheckbox;} else { cabinetDoors = unCheckedCheckbox;}
		if(cabinetDrawerFronts == 'T'){ cabinetDrawerFronts = checkedCheckbox;} else { cabinetDrawerFronts = unCheckedCheckbox;}
		if(drawersFunction == 'T'){ drawersFunction = checkedCheckbox;} else { drawersFunction = unCheckedCheckbox;}
		if(passthruDoors == 'T'){ passthruDoors = checkedCheckbox;} else { passthruDoors = unCheckedCheckbox;}
		if(foldingBiFoldDoors == 'T'){ foldingBiFoldDoors = checkedCheckbox;} else { foldingBiFoldDoors = unCheckedCheckbox;}
		if(closetRodsSecure == 'T'){ closetRodsSecure = checkedCheckbox;} else { closetRodsSecure = unCheckedCheckbox;}
		if(shelvesProperly == 'T'){ shelvesProperly = checkedCheckbox;} else { shelvesProperly = unCheckedCheckbox;}
		if(countertopsDefect == 'T'){ countertopsDefect = checkedCheckbox;} else { countertopsDefect = unCheckedCheckbox;}
		if(dinetteTable == 'T'){ dinetteTable = checkedCheckbox;} else { dinetteTable = unCheckedCheckbox;}
		if(dinetteConverts == 'T'){ dinetteConverts = checkedCheckbox;} else { dinetteConverts = unCheckedCheckbox;}
		if(allFurniture == 'T'){ allFurniture = checkedCheckbox;} else { allFurniture = unCheckedCheckbox;}
		if(sofaConversion == 'T'){ sofaConversion = checkedCheckbox;} else { sofaConversion = unCheckedCheckbox;}
		if(windowsScreensFunction == 'T'){ windowsScreensFunction = checkedCheckbox;} else { windowsScreensFunction = unCheckedCheckbox;}
		if(windowTreatmentsSecure == 'T'){ windowTreatmentsSecure = checkedCheckbox;} else { windowTreatmentsSecure = unCheckedCheckbox;}
		if(blindShadesAdjusted == 'T'){ blindShadesAdjusted = checkedCheckbox;} else { blindShadesAdjusted = unCheckedCheckbox;}
		if(furnaceFunction == 'T'){ furnaceFunction = checkedCheckbox;} else {furnaceFunction = unCheckedCheckbox;}
		if(furnaceBurnOff == 'T'){ furnaceBurnOff = checkedCheckbox;} else { furnaceBurnOff = unCheckedCheckbox;}
		if(acFunction == 'T'){ acFunction = checkedCheckbox;} else { acFunction = unCheckedCheckbox;}
		if(thermostat == 'T'){ thermostat = checkedCheckbox;} else { thermostat = unCheckedCheckbox;}
		if(refrigerator == 'T'){ refrigerator = checkedCheckbox;} else { refrigerator = unCheckedCheckbox;}
		if(iceMaker == 'T'){ iceMaker = checkedCheckbox;} else { iceMaker = unCheckedCheckbox;}
		if(rangeOven == 'T'){ rangeOven = checkedCheckbox;} else { rangeOven = unCheckedCheckbox;}
		if(rangeHood == 'T'){ rangeHood = checkedCheckbox;} else { rangeHood = unCheckedCheckbox;}
		if(microwave == 'T'){ microwave = checkedCheckbox;} else { microwave = unCheckedCheckbox;}
		if(waterHeaterFunctions == 'T'){ waterHeaterFunctions = checkedCheckbox;} else { waterHeaterFunctions = unCheckedCheckbox;}
		if(waterHeaterByPass == 'T'){ waterHeaterByPass = checkedCheckbox;} else { waterHeaterByPass = unCheckedCheckbox;}
		if(Fireplace == 'T'){ Fireplace = checkedCheckbox;} else { Fireplace = unCheckedCheckbox;}
		if(tvsFunction == 'T'){ tvsFunction = checkedCheckbox;} else { tvsFunction = unCheckedCheckbox;}
		if(radioStereo == 'T'){ radioStereo = checkedCheckbox;} else { radioStereo = unCheckedCheckbox;}
		if(vcrDVDBluRay == 'T'){ vcrDVDBluRay = checkedCheckbox;} else { vcrDVDBluRay = unCheckedCheckbox;}
		if(homeStereo == 'T'){ homeStereo = checkedCheckbox;} else { homeStereo = unCheckedCheckbox;}
		if(allSpeakers == 'T'){ allSpeakers = checkedCheckbox;} else { allSpeakers = unCheckedCheckbox;}
		if(allRemotes == 'T'){ allRemotes = checkedCheckbox;} else { allRemotes = unCheckedCheckbox;}
		if(allSoftGoods == 'T'){ allSoftGoods = checkedCheckbox;} else { allSoftGoods = unCheckedCheckbox;}
		if(tirePressureSet == 'T'){ tirePressureSet = checkedCheckbox;} else { tirePressureSet = unCheckedCheckbox;}
		if(lpTanksShut == 'T'){ lpTanksShut = checkedCheckbox;} else { lpTanksShut = unCheckedCheckbox;}
		if(allDoorsWindowsLatched == 'T'){ allDoorsWindowsLatched = checkedCheckbox;} else { allDoorsWindowsLatched = unCheckedCheckbox;}
		if(terminationSystem == 'T'){ terminationSystem = checkedCheckbox;} else { terminationSystem = unCheckedCheckbox;}
		if(terminationHandles == 'T'){ terminationHandles = checkedCheckbox;} else { terminationHandles = unCheckedCheckbox;}
		if(lowPoint == 'T'){ lowPoint = checkedCheckbox;} else { lowPoint = unCheckedCheckbox;}
		if(tankVent == 'T'){ tankVent = checkedCheckbox;} else { tankVent = unCheckedCheckbox;}
		if(noExternalBlack == 'T'){ noExternalBlack = checkedCheckbox;} else { noExternalBlack = unCheckedCheckbox;}
		if(waterControl == 'T'){ waterControl = checkedCheckbox;} else { waterControl = unCheckedCheckbox;}
		if(gravityFill == 'T'){ gravityFill = checkedCheckbox;} else { gravityFill = unCheckedCheckbox;}
		if(exteriorWater == 'T'){ exteriorWater = checkedCheckbox;} else { exteriorWater = unCheckedCheckbox;}
		if(showersFaucets == 'T'){ showersFaucets = checkedCheckbox;} else { showersFaucets = unCheckedCheckbox;}
		if(waterPump == 'T'){ waterPump = checkedCheckbox;} else { waterPump = unCheckedCheckbox;}
		if(toiletFunctions == 'T'){ toiletFunctions = checkedCheckbox;} else { toiletFunctions = unCheckedCheckbox;}
		if(faucetShower == 'T'){ faucetShower = checkedCheckbox;} else { faucetShower = unCheckedCheckbox;}
		if(waterLines == 'T'){ waterLines = checkedCheckbox;} else { waterLines = unCheckedCheckbox;}
		if(showerTub == 'T'){ showerTub = checkedCheckbox;} else { showerTub = unCheckedCheckbox;}
		if(showerDoor == 'T'){ showerDoor = checkedCheckbox;} else { showerDoor = unCheckedCheckbox;}
		if(allLights == 'T'){ allLights = checkedCheckbox;} else { allLights = unCheckedCheckbox;}
		if(allOutlets == 'T'){ allOutlets = checkedCheckbox;} else { allOutlets = unCheckedCheckbox;}
		if(allWallSwitches == 'T'){ allWallSwitches = checkedCheckbox;} else { allWallSwitches = unCheckedCheckbox;}
		if(powerDisconnect == 'T'){ powerDisconnect = checkedCheckbox;} else { powerDisconnect = unCheckedCheckbox;}
		if(allAccessible == 'T'){ allAccessible = checkedCheckbox;} else { allAccessible = unCheckedCheckbox;}
		if(fuseBreaker == 'T'){ fuseBreaker = checkedCheckbox;} else { fuseBreaker = unCheckedCheckbox;}
		if(gfiCircuits == 'T'){ gfiCircuits = checkedCheckbox;} else { gfiCircuits = unCheckedCheckbox;}
		if(chassisMain == 'T'){ chassisMain = checkedCheckbox;} else { chassisMain = unCheckedCheckbox;}
		if(autoReset == 'T'){ autoReset = checkedCheckbox;} else { autoReset = unCheckedCheckbox;}
		if(generator == 'T'){ generator = checkedCheckbox;} else { generator = unCheckedCheckbox;}
		if(wireBundles == 'T'){ wireBundles = checkedCheckbox;} else { wireBundles = unCheckedCheckbox;}
		if(tankMonitor == 'T'){ tankMonitor = checkedCheckbox;} else { tankMonitor = unCheckedCheckbox;}
		if(powerCenter == 'T'){ powerCenter = checkedCheckbox;} else { powerCenter = unCheckedCheckbox;}
		if(powerFans == 'T'){ powerFans = checkedCheckbox;} else { powerFans = unCheckedCheckbox;}
		if(fireExtinguisher == 'T'){ fireExtinguisher = checkedCheckbox;} else { fireExtinguisher = unCheckedCheckbox;}
		if(smokeDetector == 'T'){ smokeDetector = checkedCheckbox;} else { smokeDetector = unCheckedCheckbox;}
		if(lpCOTwo == 'T'){ lpCOTwo = checkedCheckbox;} else { lpCOTwo = unCheckedCheckbox;}
		if(underbellySecure == 'T'){ underbellySecure = checkedCheckbox;} else { underbellySecure = unCheckedCheckbox;}
		if(lpBottle == 'T'){ lpBottle = checkedCheckbox;} else { lpBottle = unCheckedCheckbox;}
		if(lpLines == 'T'){ lpLines = checkedCheckbox;} else { lpLines = unCheckedCheckbox;}
		if(batteryTray == 'T'){ batteryTray = checkedCheckbox;} else { batteryTray = unCheckedCheckbox;}
		if(wireLooms == 'T'){ wireLooms = checkedCheckbox;} else { wireLooms = unCheckedCheckbox;}
		if(fedTags == 'T'){ fedTags = checkedCheckbox;} else { fedTags = unCheckedCheckbox;}
		if(tireLabel == 'T'){ tireLabel = checkedCheckbox;} else { tireLabel = unCheckedCheckbox;}
		if(stateSeal == 'T'){ stateSeal = checkedCheckbox;} else { stateSeal = unCheckedCheckbox;}
		if(stepsOperate == 'T'){ stepsOperate = checkedCheckbox;} else { stepsOperate = unCheckedCheckbox;}
		if(grabHandle == 'T'){ grabHandle = checkedCheckbox;} else { grabHandle = unCheckedCheckbox;}
		if(entryDoor == 'T'){ entryDoor = checkedCheckbox;} else { entryDoor = unCheckedCheckbox;}
		if(baggageDoors == 'T'){ baggageDoors = checkedCheckbox;} else { baggageDoors = unCheckedCheckbox;}
		if(rampDoor == 'T'){ rampDoor = checkedCheckbox;} else { rampDoor = unCheckedCheckbox;}
		if(noDamage == 'T'){ noDamage = checkedCheckbox;} else { noDamage = unCheckedCheckbox;}
		if(awningsFunction == 'T'){ awningsFunction = checkedCheckbox;} else { awningsFunction = unCheckedCheckbox;}
		if(allExteriorLights == 'T'){ allExteriorLights = checkedCheckbox;} else { allExteriorLights = unCheckedCheckbox;}
		if(outletsFunction == 'T'){ outletsFunction = checkedCheckbox;} else { outletsFunction = unCheckedCheckbox;}
		if(spareTire == 'T'){ spareTire = checkedCheckbox;} else { spareTire = unCheckedCheckbox;}
		if(ladderProperly == 'T'){ ladderProperly = checkedCheckbox;} else { ladderProperly = unCheckedCheckbox;}
		if(roofAttachments == 'T'){ roofAttachments = checkedCheckbox;} else { roofAttachments = unCheckedCheckbox;}
		if(roofMoldings == 'T'){ roofMoldings = checkedCheckbox;} else { roofMoldings = unCheckedCheckbox;}
		if(cornerMoldings == 'T'){ cornerMoldings = checkedCheckbox;} else { cornerMoldings = unCheckedCheckbox;}
		if(skirtMetal == 'T'){ skirtMetal = checkedCheckbox;} else { skirtMetal = unCheckedCheckbox;}
		if(windowsSecured == 'T'){ windowsSecured = checkedCheckbox;} else { windowsSecured = unCheckedCheckbox;}
		if(roomsFunction == 'T'){ roomsFunction = checkedCheckbox;} else { roomsFunction = unCheckedCheckbox;}
		if(roomsSeal == 'T'){ roomsSeal = checkedCheckbox;} else { roomsSeal = unCheckedCheckbox;}
		if(hydraulicValves == 'T'){ hydraulicValves = checkedCheckbox;} else { hydraulicValves = unCheckedCheckbox;}
		if(reservoirFluid == 'T'){ reservoirFluid = checkedCheckbox;} else { reservoirFluid = unCheckedCheckbox;}
		if(undersideCable == 'T'){ undersideCable = checkedCheckbox;} else { undersideCable = unCheckedCheckbox;}
		if(manualOverride == 'T'){ manualOverride = checkedCheckbox;} else { manualOverride = unCheckedCheckbox;}
		if(signedCopy == 'T'){ signedCopy = checkedCheckboxtwo;} else { signedCopy = unCheckedCheckboxtwo;}
		
		
	//	var companyInfo = nlapiLoadConfiguration('companyinformation');
	//	var companyName = companyInfo.getFieldValue('companyname');
	//	var companyAddress1 = companyInfo.getFieldValue('address1');
	//	var companyCity = companyInfo.getFieldValue('city'); 
	//	var companyState = companyInfo.getFieldText('state'); 
	//	var companyZip = companyInfo.getFieldValue('zip'); 
	//	var companyPhone = companyInfo.getFieldValue('phone'); 
		
	//	var headerAddressHTML = 
	//			'<table width="100%" cellpadding="0">' +
	//				'<tr>' + 
	//					'<td>' + 
	//						companyName +
	//					'</td>' +
	//				'</tr>' +  
	//				'<tr>' + 
	//					'<td>' + 
	//						companyAddress1 +
	//					'</td>' +
	//				'</tr>' +  
	//				'<tr>' + 
	//					'<td>' + 
	//						companyCity + ', ' + companyState + ' ' + companyZip +
	//					'</td>' +
	//				'</tr>' +  
	//				'<tr>' + 
	//					'<td>' + 
	//						companyPhone +
	//					'</td>' +
	//				'</tr>' +  
	//			'</table>';
	//	
		var headerHTML =
			'<table width="100%" cellpadding="0">' +
				'<tr>' +
					'<td align="center" style="font-size:10pt;">Grand Design RV, LLC</td>' +
				'</tr>' +
				'<tr>' +
					'<td align="center" style="font-size:13pt;"><span padding="0" margin="0" style="border-bottom:1px solid black;">Warranty Registration</span></td>' +
				'</tr>' +
			'</table>';
	
		var dealerInformationHTML = 
			'<table width="100%" cellpadding="0" border="1">' +
	//			'<tr>' + 
	//				'<td style="width:50%; border-right-style:solid; border-right-width:1px; border-right-color:black;">' +   
	//				'</td>' +
	//				'<td style="width:50%;">' + 
	//					'&nbsp;' +  
	//				'</td>' +
	//			'</tr>' +  
	//			'<tr>' + 
	//				'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
	//				'</td>' +
	//				'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
	//					'&nbsp;' +  
	//				'</td>' +
	//			'</tr>' +  
				'<tr>' + 
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
						'&nbsp; Owner\'s Name: (Last, Middle, First) &nbsp; &nbsp; Co-Owner:' +  
					'</td>' +
					'<td>' + 
						'&nbsp; Dealership Name' +  
					'</td>' +
				'</tr>' +  
				'<tr>' + 
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
					//Changed to accommodate a blank printout that does not show commas in between first, middle, last names	
					//'&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;' + lastName + ',&nbsp;' + middleName + ',&nbsp;' + firstName + '&nbsp;' + 
						'&nbsp;&nbsp;&nbsp;' + ownerNameText + '&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;' + ownerSpouse +
					'</td>' +
					'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
						'<table cellpadding="0">' + 
							'<tr>' + 
								'<td style="width:60px;">' + 
									'&nbsp;' + 
								'</td>' + 
								'<td>' + 
									dealerName +
								'</td>' + 
							'</tr>' + 
						'</table>' +   
					'</td>' +
				'</tr>' + 
				'<tr>' + 
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
						'&nbsp; Mailing Address:' +  
					'</td>' +
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
					'&nbsp; Dealership City &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Dealership State' +  
				'</td>' +
				'</tr>' +  
				'<tr>' + 
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
						'&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;' +  ownerAddress +
					'</td>' +
					'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
					'<table cellpadding="0" style="width:100%">' + 
					'<tr>' + 
						'<td style="width:180px">' + 
							'&nbsp; &nbsp; &nbsp; &nbsp;' + dealerCity + 
						'</td>' + 
						'<td style="width:130px;">' + 
							dealerState +
						'</td>' + 
					'</tr>' + 
				'</table>' +   
					'</td>' +
				'</tr>' + 
				'<tr>' + 
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
						'&nbsp; City &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; State/Province &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Zip' +  
					'</td>' +
					'<td>' +  
						'<table cellpadding="0">' + 
						'<tr>' + 					
							'<td>' +
								'&nbsp; Unit Serial Number' +
							'</td>' + 
						'</tr>' + 
					'</table>' + 										
					'</td>' +
				'</tr>' +  
				'<tr>' + 
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
						'<table cellpadding="0">' + 
							'<tr>' + 						
								'<td style="width:165px;">&nbsp; &nbsp; &nbsp; &nbsp;' + 
									ownerCity +
								'</td>' + 
								'<td style="width:110px;">' + 
									ownerState + 
								'</td>' + 
								'<td style="width:40px;">' + 
									ownerZip + 
								'</td>' + 
							'</tr>' + 
						'</table>' +   
					'</td>' +
					'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
						'<table cellpadding="0">' + 
							'<tr>' + 
								'<td style="width:60px;">' + 
									'&nbsp;' + 
								'</td>' +
								'<td>' +  
									serialNumber +
								'</td>' + 
							'</tr>' + 
						'</table>' + 
					'</td>' +
				'</tr>' + 
				'<tr>' + 
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
						'&nbsp; Country &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Telephone No.' +  
					'</td>' +
					'<td>' + 
						'<table cellpadding="0">' + 
						'<tr>' + 					
							'<td style="width:120px;">&nbsp; Make' +
							'</td>' + 
							'<td style="width:168px;">Model' + 
							'</td>' +
							'<td style="width:50px;">Year' + 
							'</td>' + 
						'</tr>' + 
						'</table>' + 	
					'</td>' +
				'</tr>' +  
				'<tr>' + 
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
						'<table cellpadding="0" style="width:100%">' + 
							'<tr>' + 
								'<td style="width:165px">' + 
									'&nbsp; &nbsp; &nbsp; &nbsp;' + ownerCountry + 
								'</td>' + 
								'<td style="width:145px;">' + 
									ownerPhone +
								'</td>' + 
							'</tr>' + 
						'</table>' + 
					'</td>' +
				'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
				'<table cellpadding="0">' + 
					'<tr>' + 
						'<td>' + 
							'<table cellpadding="0">' + 
							'<tr>' + 							
								'<td style="width:120px;">&nbsp;' +  
									make +
								'</td>' + 
								'<td style="width:170px;">' + 
									model + 
								'</td>' +
								'<td style="width:50px;">' + 
									modelYear + 
								'</td>' + 
							'</tr>' + 
							'</table>' + 
						'</td>' + 
					'</tr>' + 
				'</table>' +   
			'</td>' +
				'</tr>' + 
/**************************************************************************************************************/			
				
				'<tr>' + 
					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
					'&nbsp; Email &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Date of Birth:'+ 
					'</td>'+
					
					'<td>' +  
						'<table cellpadding="0">' + 
						'<tr>' + 					
							'<td style="width:150px;">&nbsp; Date of Purchase' +
							'</td>' + 
							'<td style="width:188px;">Dealership Salesperson' + 
							'</td>' + 
						'</tr>' + 
						'</table>' + 										
					'</td>' +
				'</tr>' +  
			'<tr>' + 
				'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
					'<table cellpadding="0" style="width:100%">' + 
						'<tr>' + 
							'<td>' + 
								'&nbsp;' + ownerEmail+ '&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;' + dateOfBirth+ 
							'</td>' + 
						'</tr>' + 
					'</table>' + 
				'</td>' +
				'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
					'<table cellpadding="0">' + 
					'<tr>' + 							
						'<td style="width:150px;">&nbsp; &nbsp;' +  
							dateofPurchase +
						'</td>' + 
						'<td style="width:188px;">' + 
							sellingPerson + 
						'</td>' +
					'</tr>' + 
					'</table>' + 
				'</td>' +
			'</tr>' + 
/**************************************************************************************************************/
				
			'</table>'; 
		
		
		var pdiHTMLHeader = '<table style="font-size:10pt" width="100%" cellpadding="0">' + 
								'<tr>' + 
									'<td align="center" style="font-size:16px;">' + 
										'<span padding="0" margin="0" style="border-bottom:1px solid black;">New Vehicle Pre-Delivery Inspection Check List</span>' +
									'</td>' +
								'</tr>' + 
								'<tr>' + 
									'<td style="font-weight:bold;font-size:11px">' + 
										'Dealer: The following items must be checked, tested &amp; recorded (where indicated) &amp; verified as fully functional &amp; acceptable prior to retail delivery. Please submit electronically with Retail Warranty Registration form &amp; retain the original signed copy at the dealership.' +
									'</td>' +
								'</tr>' + 
							'</table>';
			
		//PDI Printing
	//	var pdiMainTable = '';
	//	
	//	pdiMainTable = '<table cellpadding="0"  width="100%">';
	//					'<tr>' +
	//						'<td>';
		
		
	//	
	//	pdiMainTable += pdiHTMLHeader;
	//	pdiMainTable += '</td></tr>';
			
		var pdiCheckListTable1 = '<table style="font-size:8pt" cellpadding="0" width="100%">' +
									'<tr>' +
										'<td style="font-size:9pt">' +
											'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Chassis/Frame</span></b>' +
										'</td>' + 
										'<td style="font-size:9pt">' +
											'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">LP Gas System</span></b>' +
										'</td>' + 
										'<td style="font-size:9pt">' +
											'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Interior</span></b>' +
										'</td>' + 
									'</tr>' +
									'<tr>' +
										'<td>' +
											'<table cellpadding="0" style="border-spacing: 2px;">' +
												'<tr>' +
													noFrameDamage + 
													'<td>&nbsp;No Frame Damage</td>' +
												'</tr>' +
												'<tr>' +
													noFrameRustCorrossion +
													'<td>&nbsp;No Frame Rust/Corrosion</td>' +
												'</tr>' +
												'<tr>' +
													couplerPinBox +
													'<td>&nbsp;Coupler/Pin Box Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													safetyChains + 
													'<td>&nbsp;Safety Chains Correct Size &amp; Rating</td>' +
												'</tr>' +
												'<tr>' +
													breakawaySwitchFunctional + 
													'<td>&nbsp;Breakaway Switch Functional</td>' +
												'</tr>' +									
												'<tr>' +
													sevenWayPigtail + 
													'<td>&nbsp;7-Way Pigtail Wire Cable OK</td>' +
												'</tr>' +
												'<tr>' +
													landingLegs + 
													'<td>&nbsp;Landing Legs/Jacks Function Properly</td>' +
												'</tr>' +
												'<tr>' +
													axleUBolts + 
													'<td>&nbsp;Axle U-Bolts Properly Torqued(max. 70 ft./lbs.)</td>' +
												'</tr>' +
												'<tr>' +
													hangersShackles + 
													'<td>&nbsp;Hangers/Shackles Torqued Properly(max. 50 ft./lbs.)</td>' +
												'</tr>' +
												'<tr>' +
													noDamageWeartoTiresWheels + 
													'<td>&nbsp;No Damage/Wear to Tires/Wheels</td>' +
												'</tr>' +
												'<tr>' +
													allLugNutsTorqued + 
													'<td>&nbsp;All Lugs Nuts Torqued</td>' +
												'</tr>' +
												'<tr>' +
													'<td colspan="2">' +
														'<table border="1">' +
															'<tr>' +
															'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;"><b><i>Record Here</i></b></td>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">Front</td>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">Center</td>' +
																'<td style="border-bottom: 1px solid #000000;">Rear</td>' +
															'</tr>' +
															'<tr>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">DS</td>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">' +
																	dsFront +
																'</td>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">' +
																	dsCenter +
																'</td>' +
																'<td style="border-bottom: 1px solid #000000;">' +
																	dsRear +
																'</td>' +
															'</tr>' +
															'<tr>' +
																'<td style="border-right: 1px solid #000000;">ODS</td>' +
																'<td style="border-right: 1px solid #000000;">' +
																	odsFront +
																'</td>' +
																'<td style="border-right: 1px solid #000000;">' +
																	odsCenter +
																'</td>' +
																'<td>' +
																	odsRear +
																'</td>' +
															'</tr>' +
														'</table>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													underbellySecure +
													'<td>&nbsp;Underbelly Secure and Intact</td>' +
												'</tr>' +
												'<tr>' +
													lpBottle +
													'<td>&nbsp;LP Bottle Tray(s) and Straps Secure</td>' +
												'</tr>' +
												'<tr>' +
													lpLines +
													'<td>&nbsp;LP Lines Undamaged and Secured</td>' +
												'</tr>' +
												'<tr>' +
													batteryTray +
													'<td>&nbsp;Battery Tray/Box Secure and Vented</td>' +
												'</tr>' +
												'<tr>' +
													wireLooms +
													'<td>&nbsp;Wire Looms Undamaged and Secure</td>' +
												'</tr>' +																						
												'<tr>' +
													'<td style="font-size:10pt" colspan="2">' +
														'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Body/Exterior</span></b>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													fedTags +
													'<td>&nbsp;Fed Tags Present w/Correct VIN</td>' +
												'</tr>' +
												'<tr>' +
													tireLabel +
													'<td>&nbsp;Tire Label Present w/Correct Tire Size</td>' +
												'</tr>' +
												'<tr>' +
													stateSeal +
													'<td>&nbsp;State Seal/RVIA Seal Present</td>' +
												'</tr>' +
												'<tr>' +
													stepsOperate +
													'<td>&nbsp;Steps Operate Properly</td>' +
												'</tr>' +
												'<tr>' +
													grabHandle +
													'<td>&nbsp;Grab Handle Secured Properly</td>' +
												'</tr>' +
												'<tr>' +
													entryDoor +
													'<td>&nbsp;Entry Door(s) Operate Properly</td>' +
												'</tr>' +
												'<tr>' +
													baggageDoors +
													'<td>&nbsp;Baggage Doors Operate Properly</td>' +
												'</tr>' +
												'<tr>' +
													rampDoor +
													'<td>&nbsp;Ramp Door Operates Properly</td>' +
												'</tr>' +
												'<tr>' +
													noDamage +
													'<td>&nbsp;No Damage Present On Exterior</td>' +
												'</tr>' +
												'<tr>' +
													awningsFunction +
													'<td>&nbsp;Awning(s) Function Properly</td>' +
												'</tr>' +
												'<tr>' +
													allExteriorLights +
													'<td>&nbsp;All Exterior Lights Function Properly</td>' +
												'</tr>' +
												'<tr>' +
													outletsFunction +
													'<td>&nbsp;Outlets Function Properly</td>' +
												'</tr>' +
												'<tr>' +
													spareTire +
													'<td>&nbsp;Spare Tire Properly Secured</td>' +
												'</tr>' +
												'<tr>' +
													ladderProperly +
													'<td>&nbsp;Ladder Properly Secured</td>' +
												'</tr>' +
												'<tr>' +
													roofAttachments +
													'<td>&nbsp;Roof Attachments Secured/Sealed</td>' +
												'</tr>' +
												'<tr>' +
													roofMoldings +
													'<td>&nbsp;Roof Moldings Secured &amp; Sealed</td>' +
												'</tr>' +
												'<tr>' +
													cornerMoldings +
													'<td>&nbsp;Corner Moldings Secured &amp; Sealed</td>' +
												'</tr>' +
												'<tr>' +
													skirtMetal +
													'<td>&nbsp;Skirt Metal/Fender Skirt Secured</td>' +
												'</tr>' +
												'<tr>' +
													windowsSecured +
													'<td>&nbsp;Windows Secured/Sealed</td>' +
												'</tr>' +
											 '</table>' +
										'</td>' + 
										'<td>' +
											'<table cellpadding="0">' +
												'<tr>' +
													regulatorPressure +
													'<td>&nbsp;Regular Pressure Set OK</td>' +
												'</tr>' +
												'<tr>' +
													tankTransferSwitch +
													'<td>&nbsp;Tank Transfer Switch Operates OK</td>' +
												'</tr>' +
												'<tr>' +
													bottlesProperlySecured +
													'<td>&nbsp;Bottles Properly Secured/Vented</td>' +
												'</tr>' +
												'<tr>' +
													lineConnections +
													'<td>&nbsp;Line Connections Exposed/Vented</td>' +
												'</tr>' +
												'<tr>' +
													applianceConnections +
													'<td>&nbsp;Appliance Connections Tight</td>' +
												'</tr>' +
												'<tr>' +
													lpDropPressure +
													'<td>&nbsp;LP Drop Pressure Test Complete</td>' +
												'</tr>' +
												'<tr>' +
													'<td colspan="2">' +
														'<table cellpadding="1" style="border: solid;">' +
															'<tr>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;"><b><i>Record Here</i></b></td>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Time&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>' +
																'<td style="border-bottom: 1px solid #000000;">&nbsp;&nbsp;In Water Col&nbsp;&nbsp;</td>' +
															'</tr>' +
															'<tr>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">Start</td>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">' +
																	startTime +
																'</td>' +
																'<td style="border-bottom: 1px solid #000000;">' +
																	startInWaterCol +
																'</td>' +
															'</tr>' +
															'<tr>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">End</td>' +
																'<td style="border-bottom: 1px solid #000000;border-right: 1px solid #000000;">' +
																	endTime +
																'</td>' +
																'<td style="border-bottom: 1px solid #000000;">' +
																	endInWaterCol +
																'</td>' +
															'</tr>' +
															'<tr>' +													
																'<td style="border-right: 1px solid #000000;">Test <br /> Location:</td>' +
																'<td>' +
																	testLocation +
																'</td>' + 
															'</tr>' +
														'</table>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													'<td style="font-size:10pt" colspan="2">' +
														'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Plumbing System (exterior)</span></b>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													terminationSystem +
													'<td>&nbsp;Termination System Function OK</td>' +
												'</tr>' +
												'<tr>' +
													terminationHandles +
													'<td>&nbsp;Termination Handles Labeled</td>' +
												'</tr>' +
												'<tr>' +
													lowPoint +
													'<td>&nbsp;Low Point Drain Operates Properly</td>' +
												'</tr>' +
												'<tr>' +
													tankVent +
													'<td>&nbsp;Tank Vent Lines Present</td>' +
												'</tr>' +
												'<tr>' +
													noExternalBlack +
													'<td>&nbsp;No External Black/Fresh Water Leaks</td>' +
												'</tr>' +
												'<tr>' +
													waterControl +
													'<td>&nbsp;Water Control Ctr. Valve Function OK</td>' +
												'</tr>' +
												'<tr>' +
													gravityFill +
													'<td>&nbsp;Gravity Fill Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													exteriorWater +
													'<td>&nbsp;Exterior Water Connection Function OK</td>' +
												'</tr>' +
												'<tr>' +
													showersFaucets +
													'<td>&nbsp;Showers/Faucets/Connections OK</td>' +
												'</tr>' +
												'<tr>' +
													'<td style="font-size:9pt" colspan="2">' +
														'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Plumbing System (interior)</span></b>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													waterPump +
													'<td>&nbsp;Water Pump Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													toiletFunctions +
													'<td>&nbsp;Toilet Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													faucetShower +
													'<td>&nbsp;Faucet &amp; Shower Fixture Function OK</td>' +
												'</tr>' +
												'<tr>' +
													waterLines +
													'<td>&nbsp;Water Lines &amp; P-Traps Tight</td>' +
												'</tr>' +
												'<tr>' +
													showerTub +
													'<td>&nbsp;Shower/Tub Properly Sealed</td>' +
												'</tr>' +
												'<tr>' +
													showerDoor +
													'<td>&nbsp;Shower Door Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													'<td style="font-size:9pt" colspan="2">' +
														'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Electrical</span></b>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													allLights +
													'<td>&nbsp;All Lights Function Properly</td>' +
												'</tr>' +
												'<tr>' +
													allOutlets +
													'<td>&nbsp;All Outlets Function Properly</td>' +
												'</tr>' +
												'<tr>' +
													allWallSwitches +
													'<td>&nbsp;All Wall Switches Function Properly</td>' +
												'</tr>' +
												'<tr>' +
													powerDisconnect +
													'<td>&nbsp;Power Disconnect Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													allAccessible +
													'<td>&nbsp;All Accessible Wire Connections Tight</td>' +
												'</tr>' +
												'<tr>' +
													fuseBreaker +
													'<td>&nbsp;Fuse/Breaker Panel Circuits Labeled</td>' +
												'</tr>' +
												'<tr>' +
													gfiCircuits +
													'<td>&nbsp;GFI Circuits Tested and OK</td>' +
												'</tr>' +
												'<tr>' +
													chassisMain +
													'<td>&nbsp;Chassis Main Ground Tight/Secure</td>' +
												'</tr>' +
												'<tr>' +
													autoReset +
													'<td>&nbsp;Auto Reset Breakers Secured &amp; Covered</td>' +
												'</tr>' +
												'<tr>' +
													generator +
													'<td>&nbsp;Generator Functions Properly(if appl.)</td>' +
												'</tr>' +
												'<tr>' +
													wireBundles +
													'<td>&nbsp;Wire Bundles Loomed Properly</td>' +
												'</tr>' +
												'<tr>' +
													tankMonitor +
													'<td>&nbsp;Tank Monitor Panel Function OK</td>' +
												'</tr>' +
												'<tr>' +
													powerCenter +
													'<td>&nbsp;Power Center Switch Function OK</td>' +
												'</tr>' +
												'<tr>' +
													powerFans +
													'<td>&nbsp;Power Fans (Vent/Ceiling) Operate OK</td>' +
												'</tr>' +
											'</table>' +
										'</td>' + 
										'<td>' +
											'<table cellpadding="0">' +
												'<tr>' +
													flooringMaterial +
													'<td>&nbsp;Flooring Material Defect Free</td>' +
												'</tr>' +
												'<tr>' +
													floorRegisters +
												'<td>&nbsp;Floor Registers Clean/Secure</td>' +
												'</tr>' +
												'<tr>' +
													wallPanelTrim +
													'<td>&nbsp;Wall Panel Trim/Tape Clean/Secure</td>' +
												'</tr>' +
												'<tr>' +
													wallPanelsDefect +
													'<td>&nbsp;Wall Panels Defect Free</td>' +
												'</tr>' +
												'<tr>' +
													ceilingPanelTrim +
													'<td>&nbsp;Ceiling Panel Trim/Tape Clean/Secure</td>' +
												'</tr>' +
												'<tr>' +
													ceilingPanelDefect +
													'<td>&nbsp;Ceiling Panel Defect Free</td>' +
												'</tr>' +
												'<tr>' +
													cabinetDoors +
													'<td>&nbsp;Cabinet Doors Aligned/Operate OK</td>' +
												'</tr>' +
												'<tr>' +
													cabinetDrawerFronts +
													'<td>&nbsp;Cabinet/Drawer Fronts Defect Free</td>' +
												'</tr>' +
												'<tr>' +
													drawersFunction +
													'<td>&nbsp;Drawers Function Properly and Latch</td>' +
												'</tr>' +
												'<tr>' +
													passthruDoors +
													'<td>&nbsp;Pass-Thru Doors Function/Latch OK</td>' +
												'</tr>' +
												'<tr>' +
													foldingBiFoldDoors +
													'<td>&nbsp;Folding/Bi-Fold Doors Function OK</td>' +
												'</tr>' +
												'<tr>' +
													closetRodsSecure +
													'<td>&nbsp;Closet Rods Secure</td>' +
												'</tr>' +
												'<tr>' +
													shelvesProperly +
													'<td>&nbsp;Shelves Properly Aligned/Secure</td>' +
												'</tr>' +
												'<tr>' +
													countertopsDefect +
													'<td>&nbsp;Countertops Defect Free/Sealed</td>' +
												'</tr>' +
												'<tr>' +
													dinetteTable +
													'<td>&nbsp;Dinette Table/Chairs Defect Free</td>' +
												'</tr>' +
												'<tr>' +
													dinetteConverts +
													'<td>&nbsp;Dinette Converts to Sleep Area OK</td>' +
												'</tr>' +
												'<tr>' +
													allFurniture +
													'<td>&nbsp;All Furniture Defect Free</td>' +
												'</tr>' +
												'<tr>' +
													sofaConversion +
													'<td>&nbsp;Sofa Conversion to Sleep Area OK</td>' +
												'</tr>' +
												'<tr>' +
													windowsScreensFunction +
													'<td>&nbsp;Windows/Screens Function Properly</td>' +
												'</tr>' +
												'<tr>' +
													windowTreatmentsSecure +
													'<td>&nbsp;Window Treatments Secure</td>' +
												'</tr>' +
												'<tr>' +
													blindShadesAdjusted +
													'<td>&nbsp;Blind/Shades Adjusted &amp; Function OK</td>' +
												'</tr>' +
												'<tr>' +
													allSoftGoods +
													'<td>&nbsp;All Soft Goods Present</td>' +
												'</tr>' +
												'<tr>' +
													'<td style="font-size:9pt" colspan="2">' +
														'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Appliances</span></b>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													furnaceFunction +
													'<td>&nbsp;Furnace Function/Air Distribution Ok</td>' +
												'</tr>' +
												'<tr>' +
													furnaceBurnOff +
													'<td>&nbsp;Furnace Burn-Off Completed</td>' +
												'</tr>' +
												'<tr>' +
													acFunction +
													'<td>&nbsp;A/C Function/Air Distribution OK</td>' +
												'</tr>' +
												'<tr>' +
													thermostat +
													'<td>&nbsp;Thermostat Operates Properly</td>' +
												'</tr>' +
												'<tr>' +
													refrigerator +
													'<td>&nbsp;Refrigerator Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													iceMaker +
													'<td>&nbsp;Ice Maker Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													rangeOven +
													'<td>&nbsp;Range/Oven Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													rangeHood +
													'<td>&nbsp;Range Hood Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													microwave +
													'<td>&nbsp;Microwave Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													waterHeaterFunctions +
													'<td>&nbsp;Water Heater Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													waterHeaterByPass +
													'<td>&nbsp;Water Heater By-Pass Function OK</td>' +
												'</tr>' +
												'<tr>' +
													Fireplace +
													'<td>&nbsp;Fireplace Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													'<td style="font-size:9pt" colspan="2">' +
														'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Electronics</span></b>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													tvsFunction +
													'<td>&nbsp;TV(s) Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													radioStereo +
													'<td>&nbsp;Radio/Stereo Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													vcrDVDBluRay +
													'<td>&nbsp;VCR/DVD/Blu Ray Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													homeStereo +
													'<td>&nbsp;Home Stereo Functions Properly</td>' +
												'</tr>' +
												'<tr>' +
													allSpeakers +
													'<td>&nbsp;All Speakers Functional</td>' +
												'</tr>' +
												'<tr>' +
													allRemotes +
													'<td>&nbsp;All Remotes Functional</td>' +
												'</tr>' +										
											'</table>' +
										'</td>' + 
									'</tr>' +								
								'</table>';
	   var pdiCheckListTable2 = '<table style="font-size:8pt" cellpadding="0" width="100%">' +
									'<tr>' +
										'<td>' +
											'<table cellpadding="0">' +
												'<tr>' +
													'<td style="font-size:9pt" colspan="2">' +
														'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Slide Out System(s)</span></b>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													roomsFunction +
													'<td>&nbsp;Rooms Function Properly (In/Out)</td>' +
												'</tr>' +
												'<tr>' +
													roomsSeal +
													'<td>&nbsp;Rooms Seal (In/Out) Properly</td>' +
												'</tr>' +
												'<tr>' +
													hydraulicValves +
													'<td>&nbsp;Hydraulic Valves Function Properly</td>' +
												'</tr>' +
												'<tr>' +
													reservoirFluid +
													'<td>&nbsp;Reservoir Fluid Level OK</td>' +
												'</tr>' +
												'<tr>' +
													undersideCable +
													'<td>&nbsp;Underside Cable Straps Operate OK</td>' +
												'</tr>' +
												'<tr>' +
													manualOverride +
													'<td>&nbsp;Manual Override Functions Properly</td>' +
												'</tr>' +
											'</table>' +	
										'</td>' +										
										'<td>' +
											'<table cellpadding="0">' +
												'<tr>' +
													'<td style="font-size:9pt" colspan="2">' +
														'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Life/Safety</span></b>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													fireExtinguisher +
													'<td>&nbsp;Fire Extinguisher Present/Fully Charged</td>' +
												'</tr>' +
												'<tr>' +
													smokeDetector +
													'<td>&nbsp;Smoke Detector Function Tests OK</td>' +
												'</tr>' +
												'<tr>' +
													lpCOTwo +
													'<td>&nbsp;LP/CO2 Detector Function Tested OK</td>' +
												'</tr>' +
											'</table>' +
										'</td>' +							
										'<td>' +
											'<table cellpadding="0">' +											
												'<tr>' +
													'<td style="font-size:9pt" colspan="2">' +
														'<b><span padding="0" margin="0" style="border-bottom:1px solid black;">Final Delivery Checks</span></b>' +
													'</td>' +
												'</tr>' +
												'<tr>' +
													tirePressureSet +
													'<td>&nbsp;Tire Pressure Set to Required PSI</td>' +
												'</tr>' +
												'<tr>' +
													lpTanksShut +
													'<td>&nbsp;LP Tanks Shut Off</td>' +
												'</tr>' +
												'<tr>' +
													allDoorsWindowsLatched +
													'<td>&nbsp;All Doors/Windows Latched/Secured</td>' +
												'</tr>' +
											'</table>' +
										'</td>' + 
									'</tr>' +
								'</table>';
								
		
		//Add more rows to pdiHTML
	//	pdiMainTable += '<tr><td>' + pdiCheckListTable + '</td></tr>' + '<tr><td>&nbsp;</td></tr>';
	//			
	//	//Finally close pdiHTM table
	//	pdiMainTable += '</table>';
	
		var footerHTML = 
			 '<table style="font-size:8pt" width="100%" cellpadding="0" border="1">' +
			 	'<tr>' +
			 		'<td colspan="2" align="center" style="font-weight:bold;">' +
			 			'Dealer: I certify that all of the above checks have been completed to RVIA or other applicable standards and that the customer has been provided a thorough and complete walk-through of their new vehicle.' +
			 		'</td>' +
			 	'</tr>' +
			 	'<tr>' +
		 			'<td colspan="2" align="right"><span padding="0" margin="0" style="border-bottom:1px solid black;"> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</span></td>' +
		 		'</tr>' +
		 		'<tr>' +
		 			signedCopy +
		 			'<td width="97%">Signed Copy on File at Dealership (Check) &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Dealer Signature &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Date</td>' +
		 		'</tr>' +
		 		'<tr>' +
		 			'<td colspan="2" align="center" style="font-weight:bold;">' +
		 				'NEW OWNER: I certify that this vehicle has been delivered to me in acceptable condition, that I understand the basic operation of this vehicle and have had all applicable warranties explained to me.' +
		 			'</td>' +
		 		'</tr>' +
		 		'<tr>' +
		 			'<td colspan="2" align="right"><span padding="0" margin="0" style="border-bottom:1px solid black;"> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</span></td>' +
		 		'</tr>' +
		 		'<tr>' +
		 			'<td colspan="2" align="right">Customer Signature &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Date &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</td>' +
		 		'</tr>' +
		 	'</table>' +
		 	'<table style="font-size:8pt" width="100%" cellpadding="0">' +
			'<tr>' + 
				'<td>' + 
					'&nbsp;' +
				'</td>' +
			'</tr>' +
			'<tr>' + 
				'<td>' + 
					'Please register the unit immediately following retail delivery in the Dealer Portal online. You may also email a scanned copy to <b><span padding="0" margin="0" style="border-bottom:1px solid black;"><i>registration@granddesignrv.com</i></span></b> or fax to <b><span padding="0" margin="0" style="border-bottom:1px solid black;"><i>574-825-8134</i></span></b>' +
				'</td>' +
			'</tr>' +
			'</table>';
			
		var html = 
		 	'<body size="letter" style="font-size:9pt;">' +
				'<table width="100%" cellpadding="0">' +
					'<tr>' + 
						'<td>' + 
							headerHTML +  
						'</td>' +
					'</tr>' +  
					'<tr>' + 
						'<td>' + 
							'&nbsp;' +  
						'</td>' +
					'</tr>' + 
					'<tr>' + 
						'<td>' + 
							dealerInformationHTML +  
						'</td>' +
					'</tr>' + 
					'<tr>' +
						'<td>&nbsp;</td>' +
					'</tr>' +
					'<tr>' +
						'<td>' +
							pdiHTMLHeader +
						'</td>' +
					'</tr>' +					
					'<tr>' + 
						'<td>' + 
							pdiCheckListTable1 +  
						'</td>' +
					'</tr>' + 
					'<tr>' + 
						'<td>' + 
							pdiCheckListTable2 +  
						'</td>' +
					'</tr>' + 
					'<tr>' +
						'<td>&nbsp;</td>' +
					'</tr>' +
					'<tr>' + 
						'<td>' + 
							footerHTML +  
						'</td>' +
					'</tr>' +  
				'</table>' +  
			'</body>';
			
		nlapiLogExecution('debug', 'Log; ', 'return HTML');
		
		return html; 
//	}
//	else
//	{
//		var unit = null;
//		var salesOrder = null;
//		var dealer = null;
//		var unitRetailCustomer = null;
//		if(salesOrderId != null) //Printing internally from a sales order
//		{
//			// get the data first
//			salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
//			
//			var dealerId = salesOrder.getFieldValue('entity');
//			var unitId = salesOrder.getFieldValue('custbodyrvsunit');
//			
//			dealer = nlapiLoadRecord('customer', dealerId);
//			
//			if(unitId != null && unitId != '')
//			{
//				unit = nlapiLoadRecord('customrecordrvsunit', unitId);	
//				
//				//Find current unit retail customer if there is one.
//				var cols = new Array();
//				cols[cols.length] = new nlobjSearchColumn('internalid');
//				cols[cols.length] = new nlobjSearchColumn('custrecordunitretailcustomer_currentcust');
//				
//				var filters = new Array();
//				filters[filters.length] = new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', unitId);
//				filters[filters.length] = new nlobjSearchFilter('custrecordunitretailcustomer_currentcust', null, 'is', 'T');
//				
//				var unitRetailResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, cols);			
//				if(unitRetailResults != null && unitRetailResults.length == 1)
//					unitRetailCustomer = nlapiLoadRecord('customrecordrvsunitretailcustomer', unitRetailResults[0].getId());
//			}
//				
//		}
//		else if(unitRetailCustomerId != null)//dealer portal, printing from Unit Retail Customer
//		{
//			unitRetailCustomer = nlapiLoadRecord('customrecordrvsunitretailcustomer', unitRetailCustomerId);
//			var unitId = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_unit');
//			unit = nlapiLoadRecord('customrecordrvsunit', unitId);
//			
//			var salesOrderId = unit.getFieldValue('custrecordunit_salesorder');
//			if(salesOrderId != null && salesOrderId != '')
//				salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
//			
//			var dealerId = unit.getFieldValue('custrecordunit_dealer');
//			if(dealerId != null && dealerId != '')
//				dealer = nlapiLoadRecord('customer', dealerId);		
//		}		
//		
//		var shipaddress1 = '';
//		var shipcity = '';
//		var shipstate = '';
//		var shipzip = '';
//		var seriesId = '';
//		var model = '';
//		if(salesOrder != null)
//		{
//			shipaddress1 = salesOrder.getFieldValue('shipaddr1');
//			if (shipaddress1 == null)
//				shipaddress1 = '';
//			else
//				shipaddress1 = nlapiEscapeXML(shipaddress1);
//			
//			shipcity = salesOrder.getFieldValue('shipcity');
//			if (shipcity == null)
//				shipcity = '';
//			else
//				shipcity = nlapiEscapeXML(shipcity);		
//			
//			shipstate = salesOrder.getFieldValue('shipstate');
//			if (shipstate == null)
//				shipstate = '';
//			else
//				shipstate = nlapiEscapeXML(shipstate);
//				
//			shipzip = salesOrder.getFieldValue('shipzip');
//			if (shipzip == null)
//				shipzip = '';
//			else
//				shipzip = nlapiEscapeXML(shipzip);
//			
//			seriesId = salesOrder.getFieldValue('custbodyrvsseries');	
//			model = nlapiEscapeXML(salesOrder.getFieldText('custbodyrvsmodel'));
//		}
//				
//		var dealerName = '';
//		if(dealer != null)
//		{
//			dealerName = nlapiEscapeXML(dealer.getFieldValue('entityid'));	
//			
//			//Unit with this Retail Customer has no sales order, get address info from the dealer
//			if(salesOrder == null)
//			{
//				var addressSulistType = 'addressbook';
//				var addressCount = dealer.getLineItemCount(addressSulistType);				
//				for(var i = 1; i <= addressCount; i++)
//				{
//					//var isBilling = dealer.getLineItemValue(addressSulistType, 'defaultbilling', i);
//					var isShipping = dealer.getLineItemValue(addressSulistType, 'defaultshipping', i);
//					if(isShipping == 'T') //dealer shipping address
//					{
//						shipaddress1 =  dealer.getLineItemValue(addressSulistType, 'addr1', i);
//						if (shipaddress1 == null)
//							shipaddress1 = '';
//						else
//							shipaddress1 = nlapiEscapeXML(shipaddress1);
//						
//						shipcity =  dealer.getLineItemValue(addressSulistType, 'city', i);
//						if (shipcity == null)
//							shipcity = '';
//						else
//							shipcity = nlapiEscapeXML(shipcity);		
//
//						shipstate =  dealer.getLineItemValue(addressSulistType, 'state', i);
//						if (shipstate == null)
//							shipstate = '';
//						else
//							shipstate = nlapiEscapeXML(shipstate);
//							
//						shipzip =  dealer.getLineItemValue(addressSulistType, 'zip', i);
//						if (shipzip == null)
//							shipzip = '';
//						else
//							shipzip = nlapiEscapeXML(shipzip);
//						
//						break;
//					}
//					
//				}			
//			}
//		}
//
//		var serialNumber = '';
//		var deliveryDate = '';
//		if(unit != null)
//		{
//			serialNumber = nlapiEscapeXML(unit.getFieldValue('name'));	
//			deliveryDate = ConvertNSFieldToString(unit.getFieldValue('custrecordunit_shipdate'));
//			
//			//If series and model are not set based on Sales Order, use Unit
//			if(seriesId == null || seriesId == '')
//				seriesId = unit.getFieldValue('custrecordunit_series');	
//			if(model == null || model == '')
//				model = nlapiEscapeXML(unit.getFieldText('custrecordunit_model'));
//		}
//		
//		var sellingPerson = '';
//		var unitRetailNameField = '';
//		var ownerTitle = '';
//		var ownerAddress = '';
//		var ownerCity = '';
//		var ownerState = '';
//		var ownerZip = '';
//		
//		var ownerPhone = '';
//		if(unitRetailCustomer != null)
//		{
//			var sellingPersonId = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_dealsalesrp');
//			if(sellingPersonId != null && sellingPersonId != '')
//			{
//				sellingPerson = nlapiLookupField('contact', sellingPersonId, 'entityid');
//				
//				if(sellingPerson == null)
//					sellingPerson = '';
//			}
//			
//			//We Change this code because we now have netsuite built-in name field. JBR 4-4-2014
//			unitRetailNameField = ConvertNSFieldToString(unitRetailCustomer.getFieldValue('name'));
//			if(unitRetailNameField == ConvertNSFieldToString(unitRetailCustomerId))
//				unitRetailNameField = '';
//			
//			ownerTitle = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_title');
//			if(ownerTitle == null)
//				ownerTitle = '';			
//			
//			var ownerAddress1 = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_address1');
//			if(ownerAddress1 == null)
//				ownerAddress1 = '';	
//			
//			var ownerAddress2 = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_address2');
//			if(ownerAddress2 == null)
//				ownerAddress2 = '';	
//			
//			ownerAddress = ownerAddress1;
//			if(ownerAddress2 != '') //append address 2
//				ownerAddress += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + ownerAddress2;
//			
//			ownerCity = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_city');
//			if(ownerCity == null)
//				ownerCity = '';			
//			
//			ownerState = unitRetailCustomer.getFieldText('custrecordunitretailcustomer_state');
//			if(ownerState == null)
//				ownerState = '';	
//			
//			ownerZip = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_zipcode');
//			if(ownerZip == null)
//				ownerZip = '';	
//			
//			ownerPhone = unitRetailCustomer.getFieldValue('custrecordunitretailcustomer_phone');
//			if(ownerPhone == null)
//				ownerPhone = '';	
//			
//		}
//		
//		var companyInfo = nlapiLoadConfiguration('companyinformation');
//		var companyName = companyInfo.getFieldValue('companyname');
//		var companyAddress1 = companyInfo.getFieldValue('address1');
//		var companyCity = companyInfo.getFieldValue('city'); 
//		var companyState = companyInfo.getFieldValue('state'); 
//		var companyZip = companyInfo.getFieldValue('zip'); 
//		var companyPhone = companyInfo.getFieldValue('phone'); 
//		
//		var headerAddressHTML = 
//				'<table width="100%" cellpadding="0">' +
//					'<tr>' + 
//						'<td>' + 
//							companyName +
//						'</td>' +
//					'</tr>' +  
//					'<tr>' + 
//						'<td>' + 
//							companyAddress1 +
//						'</td>' +
//					'</tr>' +  
//					'<tr>' + 
//						'<td>' + 
//							companyCity + ', ' + companyState + ' ' + companyZip +
//						'</td>' +
//					'</tr>' +  
//					'<tr>' + 
//						'<td>' + 
//							companyPhone +
//						'</td>' +
//					'</tr>' +  
//				'</table>';
//		
//		var headerHTML = 
//			'<table width="100%" cellpadding="0">' +
//				'<tr>' + 
//					'<td style="font-size:20pt; font-weight:bold; width:63%;">' + 
//						'<table width="100%" cellpadding="0">' +
//							'<tr>' + 
//								'<td align="center">' + 
//									'WARRANTY REGISTRATION' +  
//								'</td>' +
//							'</tr>' +  
//							'<tr>' + 
//								'<td align="center">' + 
//									'AND CUSTOMER DELIVERY FORM' +  
//								'</td>' +
//							'</tr>' +
//						'</table>' +
//					'</td>' +
//					'<td style="width:2%; font-weight:bold;">' + 
//						'&nbsp;' + 
//					'</td>' +
//					'<td style="width:35%; font-weight:bold;">' + 
//						headerAddressHTML + 
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td>' + 
//						'&nbsp;' +  
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td align="center" colspan="3">' + 
//						'<i>Dealer is to assure that this form is properly completed and returned</i>' +  
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td align="center" colspan="3">' + 
//						'<i>to ' + companyName + ' within fifteen (15) working days after delivery.</i>' +  
//					'</td>' +
//				'</tr>' + 
//			'</table>';
//			
//		var dealerInformationHTML = 
//			'<table width="100%" cellpadding="0" border="1">' +
//				'<tr>' + 
//					'<td style="width:50%; border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
//						'&nbsp; &nbsp; Selling Salesperson\'s Name' +  
//					'</td>' +
//					'<td style="width:50%;">' + 
//						'&nbsp;' +  
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ' + sellingPerson +  
//					'</td>' +
//					'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp;' +  
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
//						'&nbsp; &nbsp; Owner\'s Name' +  
//					'</td>' +
//					'<td>' + 
//						'&nbsp; &nbsp; Dealer\'s Name' +  
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;' + unitRetailNameField +  
//					'</td>' +
//					'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;' + dealerName +  
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
//						'&nbsp; &nbsp; Address' +  
//					'</td>' +
//					'<td>' + 
//						'&nbsp; &nbsp; Address' +  
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; ' +  ownerAddress +
//					'</td>' +
//					'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'<table cellpadding="0">' + 
//							'<tr>' + 
//								'<td style="width:60px;">' + 
//									'&nbsp;' + 
//								'</td>' + 
//								'<td>' + 
//									shipaddress1 +
//								'</td>' + 
//							'</tr>' + 
//						'</table>' +   
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
//						'&nbsp; &nbsp; City &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; State &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Zip' +  
//					'</td>' +
//					'<td>' + 
//						'&nbsp; &nbsp; City &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; State &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Zip' +  
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'<table cellpadding="0">' + 
//							'<tr>' + 
//								'<td style="width:30px;">' + 
//									'&nbsp;' + 
//								'</td>' + 
//								'<td style="width:170px;">' + 
//									ownerCity +
//								'</td>' + 
//								'<td style="width:70px;">' + 
//									ownerState + 
//								'</td>' + 
//								'<td style="width:50px;">' + 
//									ownerZip + 
//								'</td>' + 
//							'</tr>' + 
//						'</table>' +   
//					'</td>' +
//					'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'<table cellpadding="0">' + 
//							'<tr>' + 
//								'<td style="width:30px;">' + 
//									'&nbsp;' + 
//								'</td>' + 
//								'<td style="width:170px;">' + 
//									shipcity +
//								'</td>' + 
//								'<td style="width:70px;">' + 
//									shipstate + 
//								'</td>' + 
//								'<td style="width:50px;">' + 
//									shipzip + 
//								'</td>' + 
//							'</tr>' + 
//						'</table>' + 
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black;">' + 
//						'&nbsp; &nbsp; Delivery Date &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Phone Number (Daytime)' +  
//					'</td>' +
//					'<td>' + 
//						'&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Serial No. &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; Model &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;' +  
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//				'<td style="border-right-style:solid; border-right-width:1px; border-right-color:black; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//					'<table cellpadding="0" style="width:100%">' + 
//						'<tr>' + 
//							'<td style="width:50%">' + 
//								'&nbsp; &nbsp; &nbsp; &nbsp;' + deliveryDate + 
//							'</td>' + 
//							'<td style="width:50%;">' + 
//								'&nbsp; &nbsp; ' + ownerPhone +
//							'</td>' + 
//						'</tr>' + 
//					'</table>' + 
//				'</td>' +
//					'<td style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ' + serialNumber + '&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ' + model +  
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td colspan="2" style="font-size:8pt;" align="center">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' +
//				'<tr>' + 
//					'<td colspan="2" style="font-size:8pt;" align="center">' + 
//						'ALL ITEMS MUST BE MARKED OFF BY THE DEALER (1ST COLUMN) AND CUSTOMER (2ND COLUMN) IN THE PRESENSE OF BOTH,' +
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td colspan="2" style="font-size:8pt;" align="center">' + 
//						'INDICATING PERFORMANCE OR INSTRUCTION AS REQUIRED. PLEASE MARK EACH ITEM <b>OK</b> OR <b>NA</b> (NOT APPLICABLE).' +
//					'</td>' +
//				'</tr>' + 
//			'</table>'; 
//			
//		// build the registration options HTML
//		var regOptResults = nlapiSearchRecord('customrecordrvswarrantyregistrationoptn', 'customsearchwarrantyregoptionsearch', null, null);
//		
//		var optionsHTML = '';
//		if (regOptResults != null)
//		{
//			var resultsPerColumn = regOptResults.length/3;
//			
//			var optionsCol1HTML = GetOptionResultsColHTML(regOptResults, resultsPerColumn, 0); 
//			var optionsCol2HTML = GetOptionResultsColHTML(regOptResults, resultsPerColumn, 1);
//			var optionsCol3HTML = GetOptionResultsColHTML(regOptResults, resultsPerColumn, 2);
//			
//			optionsHTML = 
//				'<table width="100%" cellpadding="7" style="font-size:8pt;">' +
//					'<tr>' + 
//						'<td style="width:33%">' + 
//							optionsCol1HTML +
//						'</td>' +
//						'<td style="width:33%">' + 
//							optionsCol2HTML + 
//						'</td>' +
//						'<td style="width:34%">' + 
//							optionsCol3HTML + 
//						'</td>' +
//					'</tr>' +  
//				'</table>'; 
//		}
//			
//		var footerHTML = 
//			 '<table width="100%" cellpadding="0">' + 
//				'<tr>' + 
//					'<td colspan="3" align="center" style="font-weight:bold;">' + 
//						'DEALER INSTALLED OPTIONS:' +
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td colspan="3" align="center" style="font-weight:bold;">' + 
//						'(Dealer installed options are not covered under ' + companyName + '\'s limited warranties.)' +
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td colspan="3">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td style="width:10%; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp;' +
//					'</td>' +
//					'<td style="width:55%; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp;' + 
//					'</td>' +
//					'<td style="width:35%; border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp;' + 
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td colspan="3">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' +   
//				'<tr>' + 
//					'<td colspan="3" align="center" style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' +
//				'<tr>' + 
//					'<td colspan="3">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' +   
//				'<tr>' + 
//					'<td colspan="3" align="center" style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td colspan="3" align="center">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td colspan="3" style="font-weight:bold; font-size:8pt;">' + 
//						'<i>I RECEIVED A COPY OF THE ' + companyName.toUpperCase() + ' COMPANY LIMITED WARRANTY BEFORE I PURCHASED THIS VEHICLE AND I UNDERSTAND</i>' +
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td colspan="3" style="font-weight:bold; font-size:8pt;">' + 
//						'<i>THAT IT IS DESIGNED TO BE USED ONLY FOR RECREATIONAL CAMPING AND TRAVEL.</i>' +
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td colspan="3">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td colspan="3" style="font-weight:bold; font-size:8pt;">' + 
//						'<i>THE PURCHASER HAS INSPECTED OR BEEN GIVEN THE OPPORTUNITY TO INSPECT THE VEHICLE, SUPPLIED THE INFORMATION ABOUT</i>' +
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td colspan="3" style="font-weight:bold; font-size:8pt;">' + 
//						'<i>HIS/HER NAME AND ADDRESS, BEEN GIVEN THE OPPORTUNITY TO MAKE NOTATIONS IN THE SPACE PROVIDED AND OBSERVED OR</i>' +
//					'</td>' +
//				'</tr>' +
//				'<tr>' + 
//					'<td colspan="3" style="font-weight:bold; font-size:8pt;">' + 
//						'<i>RECEIVED SATISFACTORY EXPLANATIONS ABOUT ALL ITEMS LISTED ABOVE.</i>' +
//					'</td>' +
//				'</tr>' +
//				'<tr>' + 
//					'<td colspan="3">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' +  
//				'<tr>' + 
//					'<td colspan="3" style="border-bottom-style:solid; border-bottom-width:1px; border-bottom-color:black;">' + 
//						'&nbsp;' +
//					'</td>' +
//				'</tr>' + 
//				'<tr>' + 
//					'<td align="center" >' + 
//						'DATE' +
//					'</td>' +
//					'<td align="center" >' + 
//						'PURCHASER\'S SIGNATURE' +
//					'</td>' +
//					'<td align="center" >' + 
//						'DEALER\'S SIGNATURE' +
//					'</td>' +
//				'</tr>' +
//			'</table>';
//			
//		var html = 
//		 	'<body style="font-size:10pt; margin:0pt 0pt 0pt 0pt;">' +
//				'<table width="100%" cellpadding="0">' +
//					'<tr>' + 
//						'<td>' + 
//							headerHTML +  
//						'</td>' +
//					'</tr>' +  
//					'<tr>' + 
//						'<td>' + 
//							'&nbsp;' +  
//						'</td>' +
//					'</tr>' + 
//					'<tr>' + 
//						'<td>' + 
//							dealerInformationHTML +  
//						'</td>' +
//					'</tr>' +  
//					'<tr>' + 
//						'<td>' + 
//							optionsHTML +  
//						'</td>' +
//					'</tr>' +  
//					'<tr>' + 
//						'<td>' + 
//							footerHTML +  
//						'</td>' +
//					'</tr>' +  
//				'</table>' +  
//			'</body>';
//				
//		return html; 
//	}
}

function GetOptionResultsColHTML(regOptResults, resultsPerColumn, colNumber)
{
	var startIndex = resultsPerColumn * colNumber;
	var previousCategoryId = null;	
	
	if (startIndex > 0)
	{
		previousCategoryId = regOptResults[startIndex-1].getValue('custrecordwarrregoption_category');
	}
	
	var optionsColHTML = 
		'<table width="100%" cellpadding="0">';
	
	var endWhile = startIndex + resultsPerColumn;
	while (startIndex < endWhile)
	{
		var categoryId = regOptResults[startIndex].getValue('custrecordwarrregoption_category');
		var categoryName = nlapiEscapeXML(regOptResults[startIndex].getText('custrecordwarrregoption_category'));
		var categorySortOrder = regOptResults[startIndex].getValue('custrecordwarrregcategory_sortorder', 'custrecordwarrregoption_category');
		var optionName = nlapiEscapeXML(regOptResults[startIndex].getValue('name'));
		
		if (previousCategoryId == null || categoryId != previousCategoryId)
		{
			if (previousCategoryId != null)
			{
				optionsColHTML +=
					'<tr>' + 
						'<td style="font-weight:bold;" colspan="2">' +
							'&nbsp;' + 
						'</td>' +
					'</tr>';	
			}
			
			previousCategoryId = categoryId;
			
			optionsColHTML +=
				'<tr>' + 
					'<td style="font-weight:bold;" colspan="2">' +
						categorySortOrder + '. ' + categoryName + 
					'</td>' +
				'</tr>';	
		}
		
		optionsColHTML +=
			'<tr>' + 
				'<td style="width:43%;">' +
					'&nbsp; &nbsp; ____ ____ ' + 
				'</td>' +
				'<td style="width:57%;">' +
					optionName + 
				'</td>' +
			'</tr>';	
			
		startIndex++;
	} 	
	
	optionsColHTML += '</table>';	
	
	return optionsColHTML;
}
