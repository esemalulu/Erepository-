/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * Module Description
 *
 */
/**
 * Module Description
 *
 * Version	Date 			Author		Remarks
 * 1.0		23 June 2016 	mjpascual	Initial Development
 * 1.1		10 Jan 2017 	Balaraman	ClearD Booking Error Message Captured In Response. Reference: /*b*./ marked lines.
 */

/**
  * @NModuleScope Public
 * @NApiVersion 2.x
 */

define(['./NSUtil', 'N/http', 'N/https', 'N/url', 'N/runtime', 'N/search'],
/**
 * @param {format} nsutil
 * @param {runtime} nhttp
 */
function(nsutil, nhttp, nhttps, url, runtime, nsearch)
{
	var LibClearD = {};
	var LOG_TITLE = 'LibCLearD';

	var ST_CD_SUCCESS = '200';
	var ST_CD_TIMEOUT = '504';
	var ST_PASSWORD = null;
	var ST_TOKEN = null;
	var ARR_COORDINATES = [];  //[Latitude, Longitude]
	var OBJ_ADDRESS = {};
	
	var MAX_RETRIES  = 5;
	
	var CACHE = {};
	
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getConfigValues = function ()
	{
		var cacheKey = 'getConfigValues';

		var storeList = {"A1W3A6":"176","B0N2H0":"279","B1S1P4":"280","A0E1G0":"281","E2V3C7":"282","A0K3L0":"283","A0R1A0":"177","A1S1J1":"178","B4C2S4":"284","E5K1A2":"285","E1B4R9":"286","A1L1P9":"287","B4H3X2":"288","B0S1A0":"289","b2g2c1":"290","B4V2K7":"179","E3N3L4":"291","B0J3B0":"292","E4A1Y1":"293","E1N1B2":"294","E8C2X2":"295","A8A1X1":"296","E3Z2J7":"297","A2A2J7":"298","B0TIK0":"299","E7H2B6":"300","B0K1H0":"301","B0T1W0":"302","A2N2S4":"303","C1N4H8":"304","B1P5L2":"305","B0N2T0":"306","E7M5G5":"180","B5A4E5":"181","E3V3S9":"307","B9A3J9":"308","E7L3G5":"182","E9C1E3":"309","A0M1C0":"310","E8A1K3":"183","A0G3A0":"311","C0A1R0":"312","A0B2Y0":"313","E1X1A2":"314","E5C1A2":"315","A0E1W0":"316","A0E1K0":"184","B0W1G0":"317","A1Y1B6":"318","E8S2K2":"319","A0C1B0":"320","A0K1B0":"321","E1W1B2":"185","A0K4C0":"186","A0A1G0":"322","B0E1N0":"323","A0J1T0":"324","A0K4S0":"325","A5A1Y9":"326","A0H1E0":"327","B0E1A0":"328","A0K4P0":"329","E8G2K2":"330","E7P2N5":"331","E9G1N7":"332","E7A2H6":"333","A0K2A0":"187","A0N2C0":"334","A0H1S0":"335","A0N1J0":"188","A0K4A0":"189","A0N2H0":"336","E8J1R2":"337","A0A1P0":"190","E8B1H4":"338","A0H1M0":"191","C0B2B0":"339","A0L1K0":"340","E8E2W7":"341","E9B1S3":"342","L3T4X1":"343","K2A1H2":"344","G1M2S5":"345","N2C1W9":"346","K1K3B9":"347","L1J2K6":"348","G1V2L8":"349","J8Y3Y9":"350","K9J7C5":"351","N1G3E5":"352","K8P3E1":"353","N3R5V1":"354","L1V1B8":"355","J7Y3S7":"356","K6H6M2":"357","J3A1M1":"358","N7M6B1":"359","K7M7H4":"360","J2G8K3":"361","P1B2H3":"362","K6V3G9":"363","L6T3R5":"364","J6E2W4":"365","G8Y1V9":"366","J0N1P0":"367","P3A1Z3":"368","H4R1Y6":"369","G6V6Y8":"370","H1M3A3":"371","L3Y4Z1":"372","L9A4X5":"373","H7T1C7":"374","H8N1X1":"375","L4J4P8":"376","N4K6N7":"377","L8E2P2":"378","J7A3T2":"379","N7S6L7":"192","H9R5J2":"380","M1P4P5":"193","N5A6W6":"381","G5Y5L6":"382","J6A5N4":"383","G6S1C1":"384","K9A5H7":"385","J3V6J8":"386","M9W6K5":"387","L6H3H6":"388","M2J5A8":"389","L5M4Z5":"390","L7S2J8":"391","N6K1M6":"392","G2K1N4":"393","L9K1J3":"394","L7T4K1":"395","L4B4K1":"396","L4L8V1":"397","L4M0M5":"398","L3Y8P4":"194","J3V6J6":"399","H7N0A9":"400","H9R5Z5":"401","J6V1N9":"402","G2K1N8":"403","N6J2N4":"404","M1P5B7":"405","T2H2Z7":"406","K2C3S4":"407","K7M3X9":"195","T2L1K8":"408","T1Y7K5":"409","P3B4K6":"196","T5L5H1":"410","J2C6Y7":"411","S4V3B7":"412","J7H1S3":"413","J3P8B4":"414","L1N9W4":"415","G2G2V6":"416","N8W5S6":"417","R3G0G4":"418","T5G0Y3":"419","T2N1M6":"420","T5T3J7":"421","S4P4A5":"197","P7B2A5":"422","T6C4E4":"423","R2V3C9":"424","T2J3V1":"198","T2A2K2":"199","T6H4M7":"425","R2C4J2":"426","R2M5E5":"427","T4R1N9":"428","S4R5C9":"429","B3L2H8":"430","A1B1W3":"431","B3L1N3":"432","V3A7E9":"433","V3B5R5":"434","V7P1S1":"435","V5H2C2":"436","V2R1A3":"437","V3R7C1":"200","V2S5A1":"438","V5C3Z7":"201","K2C1N6":"439","L1N4K4":"202","K0M1K0":"440","N1H7G5":"203","K0L1A0":"441","L0K2A0":"442","K1T1N2":"443","N2L6K6":"204","M5B2C3":"444","K4A4C5":"205","K2P1M3":"445","L4A0N2":"206","K7H3A7":"207","L4H0R6":"208","N5Z3h9":"446","K2J1A2":"447","L7P1V4":"448","M4L3B6":"449","P0J1K0":"450","L9S1V3":"209","K2J5N1":"210","K1V9S1":"451","L4G0K3":"211","G8K1X8":"452","G4R1X7":"453","G8G1W1":"454","j9H6J5":"455","J3E1W1":"212","G3N1R5":"456","J0Z3B0":"457","J5Z2J1":"458","J8H1Y3":"459","J2K1J2":"460","J2N2L2":"461","G4V1R3":"462","G0C1J0":"463","G0C2K0":"464","G0N1G0":"465","J0Z3R0":"466","J8P7R5":"468","G7B1R4":"469","G8T9M7":"470","G1C1C2":"471","J7K2L8":"213","H2E1K8":"472","H1H2A8":"473","G0A4V0":"474","G1G3Y6":"475","J4H2X7":"476","J5A2J4":"214","J0B1R0":"477","J6K3A7":"215","J0E1M0":"478","J1G5G6":"216","G4T1C2":"479","G0A3L0":"480","G8P2Z4":"481","J0E2N0":"482","G6L2W3":"483","G0Y1G0":"484","J0X2M0":"485","J0H1A0":"486","J0S1H0":"487","G4W1a7":"488","J0X2Y0":"489","G5A1N5":"490","G3M2A2":"491","J0T2C0":"492","J1A2B6":"493","G0L4K0":"494","G5H3T4":"495","J0Y1X0":"496","J0B2H0":"497","J8E3J8":"498","G0T1E0":"499","J0Y2A0":"500","G3Z2W2":"501","G6E1M8":"502","G0C2B0":"503","J8L1K1":"217","J0T1T0":"504","J1X2B2":"505","G0C1K0":"506","J3M1J4":"507","J0E1V0":"508","G0R1S0":"509","J0K1S0":"510","J8B2N5":"511","G0J1E0":"512","J0X3B0":"513","G5J3a7":"218","G0T1K0":"514","G0X3H0":"515","G0T1Y0":"516","J0X1R0":"517","H2R2C4":"518","J2T3G4":"519","J2T4L1":"520","G7P2R8":"521","G9T2H2":"522","J0K1A0":"523","G4X2L1":"524","J9V1J6":"525","G0J1J0":"526","G3L4A8":"527","G0L3Y0":"528","G3H1R4":"529","G0G1P0":"530","J6S6N8":"531","J6Z1H3":"532","J7N1P4":"533","H1W1R4":"534","J0K3B0":"535","G0L2B0":"536","J7C2P2":"219","H1B5W1":"220","H7M4J5":"537","J6E3M3":"538","J0L1B0":"221","H7R3X2":"539","H9R3J1":"222","J9Z1K7":"540","J0Y1Z0":"541","G0R2V0":"542","G0C1Y0":"543","J0V1E0":"544","J0Y2M0":"545","G1C1W6":"546","J0K2S0":"547","J9T2J8":"548","J9P1T3":"549","G0R3G0":"550","J0V1R0":"551","G0N1E0":"552","G0L1E0":"553","J0X1W0":"554","G0C1V0":"555","J5W3C3":"556","J0N1H0":"557","J0S1K0":"558","J0L2L0":"559","G5T1M9":"560","J4B6B6":"561","G9H3W7":"562","J0S1R0":"563","J0B3E0":"564","J3G4J6":"565","J5T1R7":"566","J0K2M0":"567","J0L1C0":"568","G4X5M4":"569","G0J3K0":"570","J3X2E6":"571","J0R1R0":"572","G0E1T0":"573","H1G1K6":"574","G5B2G3":"575","J7V2N2":"576","G8M4H5":"577","J0K2T0":"578","J9X4K3":"579","G0S1Z0":"580","G0C1E0":"581","J0G1J0":"582","J0P1P0":"583","J0V1W0":"584","J6N1X7":"585","G0R3X0":"586","G7S2C5":"587","G0A1E0":"588","J7T1B7":"589","J7N1X6":"590","G0W2H0":"591","J2S5J1":"592","J0T2N0":"593","J4B8G9":"223","G0R3Y0":"594","J7V7W1":"595","G8H2A5":"596","J9E2J5":"597","G0R1Z0":"598","J7V3Y3":"224","J0X1K0":"599","G0E1G0":"600","J0L1T0":"601","G5C1L6":"602","G5L3E4":"603","G6G2S1":"604","J6T2M6":"605","J3E1G2":"225","J3N1T8":"606","G0L1B0":"607","G3E1S9":"608","J6W5M9":"609","J6X4H2":"610","H7A1Z6":"611","H1A4Y3":"612","J7V4W9":"613","G7X6N1":"614","J8T0B2":"226","M6H2A6":"227","L1S3M2":"615","L2V3Z9":"616","M4G2L1":"617","K0J2M0":"618","L4G1P2":"619","K1C1E6":"620","N8Y1Z1":"621","L0K1E0":"622","L9M1S7":"623","L9W5K2":"228","L3V7W7":"229","L4A1G9":"624","L0R2H0":"625","N0G1A0":"626","K0A1A0":"627","P0A1Z0":"628","K2L4b2":"629","N3W1B9":"630","N2L2R5":"631","L0N1S4":"632","L1C5M3":"633","P0A1X0":"634","N0P1A0":"635","M9P3B6":"230","K8A7H8":"636","N0C1B0":"637","N0E1M0":"638","N0G1R0":"639","L0M1G0":"640","L2G6B2":"641","N0R1A0":"642","N0B2R0":"643","N3B3J9":"644","P0T2W0":"645","P0H1H0":"646","K0A1W0":"647","L7J1X1":"648","N0G1L0":"649","N0M1L0":"650","N4N1P3":"651","P0P1S0":"652","N4L1Y1":"231","N0G2L0":"653","N0K1W0":"654","N0G2V0":"655","N0G2W0":"656","N2J3G9":"657","N0E1Y0":"658","L0E1N0":"659","K0J1B0":"660","K0J1T0":"661","N0L1M0":"662","P0L2B0":"663","L0K1A0":"664","P0H1Z0":"665","K0B1A0":"666","K0M1S0":"667","K0K1H0":"668","K0M2K0":"669","P0P1P0":"670","K0K1X0":"671","K0E1K0":"672","N0G1P0":"673","K0A1M0":"674","K0J1P0":"675","P0T2C0":"232","K0M1A0":"676","N0M2S0":"677","N0K1N0":"678","K0C1X0":"233","K0K2K0":"679","L4P1Y7":"680","N0A1N0":"681","N0G2H0":"682","N0B1T0":"683","P0K1N0":"684","N0R1G0":"685","N3L2M2":"686","P0T2A0":"687","N0J1P0":"688","P0H2M0":"689","L0G1W0":"690","P0P1N0":"691","L0E1R0":"692","L0E1E0":"693","N0E1A0":"694","N5Z1V8":"695","K0J2A0":"696","K0B1R0":"697","K0L1L0":"698","K7G1G2":"699","K6A1A2":"700","K0K2M0":"701","K7R1Z3":"702","L1A2T2":"703","L9L1H7":"234","L9P0A3":"704","P0M1Z0":"705","K0H2G0":"235","K0H1G0":"706","K0H2W0":"707","N0G2J0":"708","K0L2W0":"709","K0K2X0":"710","k0l1t0":"711","K0C1A0":"712","L0R2A0":"713","N0N1G0":"714","N4B2M1":"715","N8M2N1":"716","N0M1S1":"717","N9Y1C7":"718","N8H3A9":"719","N0N1R0":"720","N4X1C2":"721","N0H1W0":"722","N7G2P3":"723","N0P2L0":"724","N4G3P5":"725","N8A2A1":"236","N4S1C2":"726","K0L1C0":"727","K0K1S0":"728","L0L1P0":"729","K0M1N0":"730","N0A1H0":"731","K0K2C0":"732","L3K4G2":"733","K0K3J0":"734","K0H1S0":"735","N0M1T0":"736","N9G2A8":"237","K0C2K0":"737","P0C1H0":"738","N0M2N0":"739","L1T1P4":"238","K0E1E0":"740","K4M1B3":"741","P3P1P7":"239","N2M5P4":"742","N0L1G0":"240","L0S1N0":"743","L2A5M4":"744","L0R1b5":"745","L2H3K3":"241","P0J1E0":"746","N3Y2N3":"747","L2M3W4":"748","K0H2T0":"749","K0A1E0":"750","K0C2B0":"751","K0B1L0":"752","K2S0T2":"242","P0T2P0":"753","P0M2N0":"754","P0K1G0":"243","P0R1B0":"755","P0L1C0":"756","P0J1H0":"757","P2N3J5":"758","P0M2W0":"759","P5A1Y6":"760","P2B1P2":"761","P0R1L0":"762","P0A1C0":"763","P5N2G6":"764","M4H1C3":"244","P0L1V0":"765","K1B5R2":"245","K9H2W7":"766","L1H8J4":"246","L0G1M0":"767","P3A2T6":"768","M4B2K6":"769","P0M1K0":"770","L6M3G3":"247","P0T1M0":"771","P0T2S0":"772","P0T2E0":"773","M1R1P7":"774","P0S1K0":"775","L1G3T7":"776","L6A3Y7":"777","K2K1X7":"248","N0B2K0":"778","N5H1J6":"779","K0E1T0":"780","N3A1E3":"781","P0P2A0":"782","N0H2L0":"783","N0L1J0":"784","L1R2N2":"785","P0B1J0":"249","P0H1K0":"786","L0G1A0":"250","N2K3T6":"251","K0L2H0":"787","L9H1V5":"788","K0G1N0":"789","K2H5Y8":"790","M6P1Z3":"791","L9T1R3":"252","L8J1P8":"792","K0A2P0":"793","K0J1K0":"794","S0M0V0":"795","R7A5B6":"796","S0H2K0":"797","S0M2Y0":"798","S0K3V0":"799","S0J0E0":"800","R0B1M0":"801","S7H5M2":"253","R0B0E0":"802","S4R4A7":"803","R0C1B0":"804","S0L0Y0":"805","S0K2X0":"806","S0G4P0":"807","S0E0A0":"808","S0L2A0":"809","S0K1K0":"810","S4S0J9":"811","S7J4M4":"254","S0H0B0":"812","R7C1A5":"813","R7N2N3":"814","S4A0W9":"815","S0A1S0":"816","S9X1V4":"817","S0E1A0":"818","S0A2P0":"819","R6M1V2":"820","R0J1H0":"821","S0L2N0":"822","R0E1M0":"255","R1N0M6":"823","S0N2M0":"824","R5G1Y9":"825","R0L1Z0":"826","R8N1T1":"827","R0M2C0":"828","S4H0P1":"829","R6W1K2":"256","S0A0L0":"830","S0E0Y0":"831","S0G3N0":"832","S0K4L0":"833","S0A0X0":"834","R0J1E0":"835","S0K2M0":"836","S0A4J0":"837","S0C2B0":"838","R0G0J0":"839","r1a0y5":"840","S0A4T0":"841","S0L1R0":"842","S0K4T0":"843","R0K0X0":"844","R0E0C0":"845","S0K3R0":"846","R0J1W0":"847","S0K4V0":"848","S0N1A0":"849","S0N1H0":"850","S0G1A0":"851","S0N0T0":"852","S0H1X0":"853","S0A1N0":"854","S0G2B0":"855","S0C0R0":"856","S0G1S0":"857","R0K1G0":"858","P9N1M2":"859","P9A3C7":"860","S0E1H0":"861","S0A1W0":"862","S0A2A0":"863","P0T1C0":"864","P0V1C0":"865","S0K2Z0":"866","S0G5C0":"867","S0J2E0":"868","R0M0T0":"869","R0L1S0":"870","S0C2H0":"871","S0C0S0":"872","S0M1M0":"873","R0E1A0":"874","S0A2V0":"875","S0A3B0":"876","S0H2A0":"877","S0N1Z0":"878","R0J1Z0":"879","S0G2S0":"880","S0C1Y0":"881","S0J2M0":"882","R0C0A0":"883","S0E1M0":"884","S0N0J0":"885","R0L0Y0":"886","S0G4V0":"887","P0W1L0":"888","S0H3R0":"889","S0C0K0":"890","S0L1T0":"891","S0H0Z0":"892","R0G2V0":"893","S0M2T0":"894","S0K4P0":"895","S0L2C0":"896","R0J0P0":"897","S0H2W0":"898","R0M0C0":"899","R5H1G8":"900","R0C2Z0":"901","S0H0T0":"902","S0L0T0":"903","S0L1Z0":"904","S0J1A0":"905","R0C0Z0":"906","V9W7C5":"907","V9L5C7":"908","V1J3Z6":"909","V0B2G0":"910","V0N1V8":"911","V1L4B8":"912","V0A1H0":"913","V2A5C3":"914","V8J1K1":"915","V2G1C8":"916","v1e1e4":"917","V8G2N1":"918","V1R4A9":"919","V0J3A0":"920","V0X1W0":"921","V0H1H0":"922","V0H1T0":"257","V0J2N0":"923","V0K2E0":"258","V0X1N0":"924","V0K1A0":"925","V0J1E0":"926","V0K1V0":"927","V0H1Z0":"928","V0N2R0":"929","V0E1N0":"930","V0N3A0":"931","V0A1K0":"932","V0J2C0":"933","V0J1Z0":"934","V0J2J0":"935","V0N2L0":"259","V8K2V7":"936","V0J1P0":"937","V0C1J0":"938","V6K2G8":"939","V0N2M0":"940","V9P2G5":"941","T0C0P0":"942","V0G1Z0":"943","V0E2Z0":"944","V0J2E0":"945","V0G1M0":"946","V0H1J0":"947","V0E1M0":"948","V3W1A3":"260","V0S1N0":"949","V9G1B1":"950","T3K5K3":"261","T0E2M0":"951","V0N2H0":"952","V9B5E3":"262","V0R2P1":"263","T0L0K0":"953","V4V1P5":"264","V0C2W0":"954","T0G2B0":"955","T3P0C5":"956","T1H2J1":"957","T0M1B0":"958","T5W1A6":"959","X0E0P0":"960","V0N2J0":"961","X0E0N0":"962","V0C1V0":"963","Y0B1G0":"964","T0K1M0":"965","T0H3C0":"966","T0C0V0":"967","V0E1E0":"968","V0T1S0":"969","T8H0B8":"265","V0T1C0":"970","T0B4C0":"971","T0A3L0":"972","T0B2X0":"973","T3L2V7":"266","T4X1E5":"974","V0T1B0":"975","T0K0E0":"976","T1R0N3":"977","T4V3Z8":"267","T0K0K0":"268","T0J0Y0":"978","T7E1T3":"979","T9M1K6":"980","T4L1K4":"981","T0E2A0":"982","T4J1S1":"983","T4S1P3":"984","T0C2L0":"985","T8A3H9":"269","T1G1S2":"986","T9X1A2":"987","T9W1P7":"988","T9A1J5":"989","T7A1R5":"990","T4T1A3":"991","T0A3A1":"992","T0J1P0":"993","T0H1L0":"994","T4G1T4":"270","T0G1E0":"995","T7N1A4":"996","T6K4B5":"271","T9N2L9":"997","T0E1E0":"998","T0J2J0":"999","T0C2J0":"1000","T0H3N0":"1001","T9E6T2":"272","T0M2A0":"1002","T0E0Y0":"1003","T0H2M0":"1004","T0B3S0":"1005","T0K0G0":"1006","T0M1X0":"1007","T0K2K0":"1008","T0B4N0":"1009","X0E0R3":"1010","T0H1P0":"1011","T0H2H0":"1012","T3E7C4":"273","T0G2C0":"1013","T0H0C0":"1014","T0B2L0":"1015","T0B4J0":"1016","T0E1N0":"1017","T0A3C0":"1018","T0C1C0":"1019","T0C1B0":"1020","T0C0B0":"1021","T1S1B3":"1022","T9G1G2":"1023","T0J1X2":"1024","T8N5E2":"274","T0B1V0":"1025","T0J0B0":"1026","T4B3K3":"275","T0E0T0":"1027","T0B1A0":"1028","T0B0H0":"1029","T0A0M0":"1030","T0A1P0":"1031","T7X3Y1":"1032","T1C1Z2":"276","T0M0S0":"1033","T0G1K0":"1034","T6L6G3":"1035","T2X2X7":"1036","T0M0N0":"1037","T0M0J0":"1038","V0E2W0":"277","V8Z3E9":"278"};
		
		if (CACHE[cacheKey] == null)
		{
			var currentScript = runtime.getCurrentScript();
			var arrParamFlds = {
					url: 'custscript_sears_cleard_url',
					authUrl: 'custscript_sears_cleard_authurl',
					businessUnit: 'custscript_sears_cleard_business_unit',
					user: 'custscript_sears_cleard_username',
					pass: 'custscript_sears_cleard_passwd',
					locationMap: 'custscript_sears_cleard_locationmapping',
					stateidMap: 'custscript_sears_cleard_stateid',
					storeidMap: 'custscript_sears_cleard_store_map'
			};
			
			var PARAM = {};
			for (var fld in arrParamFlds)
			{
				PARAM[fld] = currentScript.getParameter({name: arrParamFlds[fld]});
			}
			PARAM["storeidMap"] = storeList;
			CACHE[cacheKey] = PARAM;
			log.audit('LibClearD.getConfigValues', JSON.stringify(CACHE[cacheKey]) );
		}
		
		return CACHE[cacheKey];
	};	
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getBusinessId = function ()
	{
		var PARAM = LibClearD.getConfigValues();
		
		return PARAM.businessUnit;
	};

	/**
	 * @memberOf LibClearD
	 */
	LibClearD.setUser = function (stUser, stPassword)
	{
		var PARAM = LibClearD.getConfigValues();
		
		ST_USERNAME = PARAM.user;
		ST_PASSWORD = PARAM.pass;
	};

	/**
	 * @memberOf LibClearD
	 */
	LibClearD.setAddress = function(stDoorNo, stStreet, stCity, stZip, stState, stCountry)
	{
		OBJ_ADDRESS.doorNumber = stDoorNo;
		OBJ_ADDRESS.street = stStreet;
		OBJ_ADDRESS.city = stCity;
		OBJ_ADDRESS.zip = stZip;
		OBJ_ADDRESS.idState = stState;
		OBJ_ADDRESS.country = stCountry;
	};

	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getStates = function ()
	{
		var PARAM = LibClearD.getConfigValues();
		
		var stLogTitle = [LOG_TITLE, 'getStates'].join('::');

		var stURL = PARAM.url + '/geocoder/states';
		log.debug(stLogTitle, 'stURL =' + stURL);
		var stMethod = "GET";
		var stToken = this.getToken();
		var objResponse = null;
		
		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};
		
		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}


		
		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			return this.getStates();
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));
		return objResponse;
	};

	//Requires Set User
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getToken = function()
	{
		var PARAM = LibClearD.getConfigValues();
		
		var stLogTitle = [LOG_TITLE, 'getToken'].join('::');
		
		var objResponse = null;
		
		if(!nsutil.isEmpty(ST_TOKEN))
		{
			log.debug(stLogTitle, 'stToken =' + ST_TOKEN);
			return ST_TOKEN;
		}

		log.debug(stLogTitle, 'ST_USERNAME = ' + PARAM.user + ' | ST_PASSWORD = ' + PARAM.pass);

		if (nsutil.isEmpty(PARAM.user) || nsutil.isEmpty(PARAM.pass))
		{
			throw 'Cannot get the token. Missing username and password';
		}

		var stURL = PARAM.authUrl +'username='+PARAM.user+'&password='+PARAM.pass;

		log.debug(stLogTitle, 'stURL = ' + PARAM.authUrl);

//		var stMethod = 'POST';
		var stMethod = 'GET';

//		var objHeaders =
//		{
//			'Content-Type' : 'application/x-www-form-urlencoded'
//		};
		// HTTP headers
		var objHeaders = new Array();
		objHeaders['Content-Type'] = 'application/json';

		try {
			if (PARAM.authUrl.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}


		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		if (!nsutil.isEmpty(objResponse) && objResponse.code == ST_CD_SUCCESS)
		{
			var objBody = JSON.parse(objResponse.body);
			var stToken = objBody.access_token;
			log.debug(stLogTitle, 'stToken =' + stToken);
			ST_TOKEN = stToken;
			return stToken;
		}

		return null;
	};

	//Requires Set User and Set Address
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getGeocode = function()
	{
		var stLogTitle = [LOG_TITLE, 'getGeocode'].join('::');
		var PARAM = LibClearD.getConfigValues()
		
		var objResponse = null;

		if (nsutil.isEmpty(OBJ_ADDRESS.zip) || nsutil.isEmpty(OBJ_ADDRESS.idState))
		{
			throw 'Zip code and State Id are required fields.';
		}

		log.debug(stLogTitle, 'OBJ_ADDRESS =' + JSON.stringify(OBJ_ADDRESS));

		var stURL =  url.format(PARAM.url+'/geocoder/addresses',
			{
				doorNumber : OBJ_ADDRESS.doorNumber,
				street : OBJ_ADDRESS.street,
				city : OBJ_ADDRESS.city,
				zip : OBJ_ADDRESS.zip,
				idState : OBJ_ADDRESS.idState,
				country : OBJ_ADDRESS.country
			});

		log.debug(stLogTitle, 'stURL =' + stURL);

		var stMethod = "GET";
		var stToken = this.getToken();

		if (nsutil.isEmpty(stToken))
		{
			throw 'Invalid Token. Please re-try again or contact your system administrator.';
		}

		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};

		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}
		
		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			this.getGeocode();
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		return objResponse;
	};

	//Requires Set User and Set Address
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getArrCoordinates = function()
	{
		var stLogTitle = [LOG_TITLE, 'getArrCoordinates'].join('::');

		var arrCoordinates = [];
		if(!nsutil.isEmpty(ARR_COORDINATES))
		{
			arrCoordinates = ARR_COORDINATES;
		}
		else
		{
			var objGeocodeResp = this.getGeocode();

			if(!nsutil.isEmpty(objGeocodeResp) && objGeocodeResp.code == ST_CD_SUCCESS)
			{
				var objGeoBody = JSON.parse(objGeocodeResp.body);
				var arrGeocodeBody = objGeoBody.geocodes;
				if(!nsutil.isEmpty(arrGeocodeBody))
				{
					var objGeoList = arrGeocodeBody[0];
					var arrGeoList = objGeoList.geocodeChoicesList;
					if(!nsutil.isEmpty(arrGeoList))
					{
						for (var intGeoListCnt = 0; intGeoListCnt < arrGeoList.length; intGeoListCnt++)
						{
							var objGeo = arrGeoList[intGeoListCnt];
							var flLatitude = nsutil.forceFloat(objGeo.latitude);
							var flLongitude = nsutil.forceFloat(objGeo.longitude);

							log.debug(stLogTitle, 'flLatitude =' + flLatitude + ' | flLongitude =' + flLongitude);

							if(flLatitude != -1 && flLongitude != -1 )
							{
								arrCoordinates.push(flLatitude);
								arrCoordinates.push(flLongitude);
								break;
							}
						}

						log.debug(stLogTitle, 'arrCoordinates =' + arrCoordinates);

					}
				}
			}
		}

		return arrCoordinates;
	};

	//Requires Set User
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getAvailability_v1 = function(stPostalCode, stStartDate, stDays, stVolume)
	{

		var PARAM = LibClearD.getConfigValues();
		var stLogTitle = [LOG_TITLE, 'getAvailability'].join('::');
		var objResponse = null;
		//making change to URL for timeslot
		var stURL =  url.format(PARAM.url+'/v1.1/timeslot/date-availabilities',//timeslot/date-availabilities
			{
				postalCode : stPostalCode,
				start : stStartDate,
				days : stDays,
				volume : stVolume
			});
		log.debug(stLogTitle, 'stURL =' + stURL);

		var stMethod = "GET";
		var stToken = this.getToken();

		if (nsutil.isEmpty(stToken))
		{
			throw 'Invalid Token. Please re-try again or contact your system administrator.';
		}

		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};
		
		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}
		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));
		
		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			this.getAvailability(stPostalCode, stStartDate, stDays, stVolume);
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		return objResponse;
	};
	
	// ADDED CMARGALLO 10/08/2016 START
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getAvailability = function(arrBigTicketItems, objLocation, businessUnitId, startDate, days,isShipToStore)
	{
		var PARAM = LibClearD.getConfigValues();
		var stLogTitle = [LOG_TITLE, 'getAvailability'].join('::');
		var objResponse = null;
		//making change to URL for timeslot
		var stURL =  url.format(PARAM.url+'/v1.1/timeslot/date-availabilities', {startDate : startDate, days : days});
		log.debug(stLogTitle, 'stURL =' + stURL);

		var stMethod = "POST";
		var stToken = this.getToken();

		if (nsutil.isEmpty(stToken))
		{
			throw 'Invalid Token. Please re-try again or contact your system administrator.';
		}

		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};
		
		log.debug(stLogTitle, 'objHeaders =' + JSON.stringify(objHeaders));
		var objRequest = {
			// "invoice": "string",
			"businesssUnitId" : businessUnitId,
			"tasks" : []
//		,
//			"customer" : {
//				"accountNumber" : "string",
//				"firstName" : "string",
//				"lastName" : "string",
//				"primaryPhone" : "string",
//				"secondaryPhone" : "string"
//			}
		};
		log.debug(stLogTitle, 'isShipToStore =' + isShipToStore);

		
		arrBigTicketItems.forEach(function(bigTicketItem){
			var taskData = {};
			taskData.location = JSON.parse( JSON.stringify(objLocation) );
			taskData.location.locationId = '0';
			taskData.item = bigTicketItem;
			if(isShipToStore == "T"){
				taskData.taskType = "CUSTOMER-PICK-UP";
			}
			objRequest.tasks.push(taskData);
		});
		
		log.debug(stLogTitle, 'objRequest =' + JSON.stringify(objRequest));
			log.debug(stLogTitle, "Connecting Cleard...");
		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders,
	                body : JSON.stringify(objRequest)
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders,
	                body : JSON.stringify(objRequest)
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}
		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));
		
		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			this.getAvailability(stPostalCode, stStartDate, stDays, stVolume);
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		return objResponse;
	};
	// ADDED CMARGALLO 10/08/2016 END
	
	
	//Requires Set User and Set Geocode
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getTimeslots = function(stPostalCode, stDate, stServiceTime, stVolume, stWeight)
	{
		var stLogTitle = [LOG_TITLE, 'getTimeslots'].join('::');
		var PARAM = LibClearD.getConfigValues();

		var stLatitude = '';
		var stLongitude = '';
		var objResponse = null;

		var arrCoordinates = this.getArrCoordinates();

		if(!nsutil.isEmpty(arrCoordinates))
		{
			stLatitude = arrCoordinates[0];
			stLongitude = arrCoordinates[1];
		}

		var stURL =  url.format(PARAM.url+'/v1.1/timeslot/date-availabilities',//timeslot/date-availabilities
			{
				date : stDate,
				postalCode : stPostalCode,
				latitude : stLatitude,
				longitude : stLongitude,
				serviceTime : stServiceTime,
				volume : stVolume,
				weight : stWeight
			});

		log.debug(stLogTitle, 'stURL =' + stURL);

		var stMethod = "GET";
		var stToken = this.getToken();

		if (nsutil.isEmpty(stToken))
		{
			throw 'Invalid Token. Please re-try again or contact your system administrator.';
		}

		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};

		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}
		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			this.getTimeslots(stPostalCode, stDate, stServiceTime, stVolume, stWeight);
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		return objResponse;
	};

	//Requires Set User
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.importOrder = function(orderInfo, numRetry)
	{
	    var stLogTitle = [LOG_TITLE, 'importOrder', numRetry].join('::');
	    var PARAM = LibClearD.getConfigValues();
	    
	    if (numRetry == null)
        {
	      numRetry = 0;
        }
	    var stURL = PARAM.url+'/v1.1/import/order'; //'/import/order';
	    var objResponse = null;

	    log.debug(stLogTitle, 'stURL =' + stURL);
	    log.debug(stLogTitle, 'orderInfo =' + JSON.stringify(orderInfo));

	    var stMethod = "POST";
	    var stToken = this.getToken();

	    if (nsutil.isEmpty(stToken))
	    {
	        throw 'Invalid Token. Please re-try again or contact your system administrator.';
	    }

	    var objHeaders =
	    {
	        'Content-Type' : 'application/json',
	        'Authorization' : 'bearer ' + stToken
	    };

	    log.debug(stLogTitle, "Connecting Cleard...");

	    try {
	        if (stURL.indexOf('https') == -1) {
	            objResponse = nhttp.request(
	            {
	                method : stMethod,
	                url : stURL,
	                body : JSON.stringify(orderInfo),
	                headers : objHeaders
	            });
	        } else {
	            objResponse = nhttps.request(
	            {
	                method : stMethod,
	                url : stURL,
	                body : JSON.stringify(orderInfo),
	                headers : objHeaders
	            });
	        }
	    } catch (error) {
	        log.debug(stLogTitle, 'Error Message : ' + error.toString());

	        if (error.name === 'SSS_CONNECTION_TIMEOUT') {
	            return this.importOrder(stToken, orderInfo);
	        }
	    }

	    log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

	    // if(objResponse.code == ST_CD_TIMEOUT)
	    // {
	    //  ST_TOKEN = null;
	    //  this.importOrder(orderInfo);
	    // }
	    
	    if (objResponse.code === 400 || numRetry >= MAX_RETRIES) {
	    	//return custom error result object tobe saved for custom column ClearD field 'custcol_cleard_booking_error'.
/*b*/	    bodyData = JSON.parse(objResponse['body']);

/*b*/	 	return {'success': false, 'message': bodyData.message};
	        //return false;
	    } else if (objResponse.code === 401) {
	        ST_TOKEN = null;
	        return this.importOrder(orderInfo, numRetry++);
	    } else if (objResponse.code === 504 || objResponse.code === 500) {
	        return this.importOrder(orderInfo, numRetry++);
	    }

	    return objResponse;	    
	};

	LibClearD.dummyImportOrder = function(orderInfo)
	{
		var arrReturn = {'message':'Successful!'};
		return {
			code: '200',
			body: JSON.stringify(arrReturn)
		};
	};


	//Requires Set User
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.cancelInvoice = function(invoiceNumber)
	{
		var PARAM = LibClearD.getConfigValues();
		var stLogTitle = [LOG_TITLE, 'cancelInvoice'].join('::');
		var objResponse = null;
		
		var stURL =  url.format(PARAM.url+'/import/cancel-invoice',
			{
				invoiceNumber : invoiceNumber,
				businessUnit : PARAM.businessUnit
			});

		log.debug(stLogTitle, 'stURL =' + stURL);
		log.debug(stLogTitle, 'invoiceNumber =' + JSON.stringify(invoiceNumber));

		var stMethod = "PUT";
		var stToken = this.getToken();

		if (nsutil.isEmpty(stToken))
		{
			throw 'Invalid Token. Please re-try again or contact your system administrator.';
		}

		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};

		log.debug(stLogTitle, 'objHeaders =' + JSON.stringify(objHeaders));
		
		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					body : JSON.stringify(invoiceNumber),
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					body : JSON.stringify(invoiceNumber),
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			this.cancelInvoice(invoiceNumber);
		}

		return objResponse;
	};

	LibClearD.dummyCancelInvoice = function(invoiceNumber)
	{
		var arrReturn = {'message':'Successful!'};
		return {
			code: '200',
			body: JSON.stringify(arrReturn)
		};
	};


	//Requires Set User
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.bookTimeslot = function(stPostalCode, stIdStop, stDate, objJSONRequest)
	{
		var PARAM = LibClearD.getConfigValues();
		var stLogTitle = [LOG_TITLE, 'bookTimeslot'].join('::');
		var objResponse = null;

		
		
		var stURL =  url.format(PARAM.url+'/timeslot/timeslots',
				{
					postalCode : stPostalCode,
					idStop : stIdStop,
					deliveryDate : stDate
				});

		log.debug(stLogTitle, 'stURL =' + stURL);
		log.debug(stLogTitle, 'objJSONRequest =' + JSON.stringify(objJSONRequest));

		var stMethod = "POST";
		var stToken = this.getToken();

		if (nsutil.isEmpty(stToken))
		{
			throw 'Invalid Token. Please re-try again or contact your system administrator.';
		}

		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};
		
		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					body : JSON.stringify(objJSONRequest),
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					body : JSON.stringify(objJSONRequest),
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			this.bookTimeslot(stPostalCode, stIdStop, stDate, objJSONRequest);
		}

		return objResponse;
	};

	//Requires Set User
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.reserveTimeslot = function(stPostalCode, objJSONRequest)
	{
		var stLogTitle = [LOG_TITLE, 'reserveTimeslot'].join('::');
		var objResponse = null;
		var PARAM = LibClearD.getConfigValues();

		var stURL =  url.format(PARAM.url+'/v1.1/timeslot/reservation');



		log.debug(stLogTitle, 'reservation stURL =' + stURL);
		log.debug(stLogTitle, 'reservation objJSONRequest =' + JSON.stringify(objJSONRequest));

		var stMethod = "POST";
		var stToken = this.getToken();

		if (nsutil.isEmpty(stToken))
		{
			throw 'Invalid Token. Please re-try again or contact your system administrator.';
		}

		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};

		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					body : objJSONRequest,
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					body : objJSONRequest,
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			this.reserveTimeslot(stIdDomain, objJSONRequest);
		}

		return objResponse;
	};


	//Requires Set User
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.bookReservedTimeslot = function(objJSONRequest)
	{
		var stLogTitle = [LOG_TITLE, 'bookReservedTimeslot'].join('::');
		var objResponse = null;
		var PARAM = LibClearD.getConfigValues();
		
		var stURL = PARAM.url+'/timeslot/booking';

		log.debug(stLogTitle, 'stURL =' + stURL);
		log.debug(stLogTitle, 'objJSONRequest =' + JSON.stringify(objJSONRequest));

		var stMethod = "PUT";
		var stToken = this.getToken();

		if (nsutil.isEmpty(stToken))
		{
			throw 'Invalid Token. Please re-try again or contact your system administrator.';
		}

		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};

		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					body : JSON.stringify(objJSONRequest),
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					body : JSON.stringify(objJSONRequest),
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			this.bookReservedTimeslot(objJSONRequest);
		}

		return objResponse;
	};



	//Requires Set User
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.cancelTimeslot = function(stIdDomain, objJSONRequest)
	{
		var stLogTitle = [LOG_TITLE, 'cancelTimeslot'].join('::');
		var objResponse = null;
		var PARAM = LibClearD.getConfigValues();

		var stURL =  url.format(PARAM.url+'/timeslot/cancellation',
			{
				idDomain : stIdDomain
			});

		log.debug(stLogTitle, 'stURL =' + stURL);
		log.debug(stLogTitle, 'objJSONRequest =' + JSON.stringify(objJSONRequest));

		var stMethod = "PUT";
		var stToken = this.getToken();

		if (nsutil.isEmpty(stToken))
		{
			throw 'Invalid Token. Please re-try again or contact your system administrator.';
		}

		var objHeaders =
		{
			'Content-Type' : 'application/json',
			'Authorization' : 'bearer ' + stToken
		};

		try {
			if (stURL.indexOf('https') == -1) {
				objResponse = nhttp.request(
				{
					method : stMethod,
					url : stURL,
					body : JSON.stringify(objJSONRequest),
					headers : objHeaders
				});
			} else {
				objResponse = nhttps.request(
				{
					method : stMethod,
					url : stURL,
					body : JSON.stringify(objJSONRequest),
					headers : objHeaders
				});
			}
		} catch (error) {
			log.debug(stLogTitle, 'Error Message : ' + error.toString());
		}

		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		if(objResponse.code == ST_CD_TIMEOUT)
		{
			ST_TOKEN = null;
			this.cancelTimeslot(stIdDomain, objJSONRequest);
		}

		return objResponse;
	};

	// --------------------------------------- DUMMY ----------------------------------
	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getDummyAvailability = function(stPostalCode, stStartDate, stDays, stVolume)
	{
		var  arrTest =
		[
		  {
		    "date": "2016-07-08T14:48:17.686Z",
		    "isAvailable": true
		  },
		  {
		    "date": "2016-07-09T14:48:17.686Z",
		    "isAvailable": false
		  },
		  {
		    "date": "2016-07-10T14:48:17.686Z",
		    "isAvailable": true
		  }
		];

		return {code:200, body: JSON.stringify(arrTest)};
	};

	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getDummyTimeslots = function(stIdDomain, stIdCarrier, stDate, stServiceTime, stVolume, stWeight)
	{
		var  arrTest =
		[
		  {
		    "insertionResults": [
		      {
		        "distance": 52.15,
		        "idRoute": 0,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 1,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 2,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 3,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 4,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 5,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 6,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 7,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 8,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 9,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 10,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 12,
		        "isNewVehicle": true,
		        "time": 56.929
		      }
		    ],
		    "timeWindow": {
		      "end": "1900-01-01T13:00:00",
		      "hardEnd": false,
		      "start": "1900-01-01T09:00:00"
		    }
		  },
		  {
		    "insertionResults": [
		      {
		        "distance": 52.15,
		        "idRoute": 0,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 1,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 2,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 3,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 4,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 5,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 6,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 7,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 8,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 9,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 10,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 12,
		        "isNewVehicle": true,
		        "time": 156.929
		      }
		    ],
		    "timeWindow": {
		      "end": "1900-01-01T15:00:00",
		      "hardEnd": false,
		      "start": "1900-01-01T11:00:00"
		    }
		  },
		  {
		    "insertionResults": [
		      {
		        "distance": 52.15,
		        "idRoute": 0,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 1,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 2,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 3,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 4,
		        "isNewVehicle": true,
		        "time": 56.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 5,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 6,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 7,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 8,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 9,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 10,
		        "isNewVehicle": true,
		        "time": 156.929
		      },
		      {
		        "distance": 52.15,
		        "idRoute": 12,
		        "isNewVehicle": true,
		        "time": 156.929
		      }
		    ],
		    "timeWindow": {
		      "end": "1900-01-01T17:00:00",
		      "hardEnd": false,
		      "start": "1900-01-01T13:00:00"
		    }
		  }
		];

		return {code:200, body: JSON.stringify(arrTest)};
	};

	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getDummyReserveTimeslot = function(stIdDomain, objJSONReserveRequest)
	{
		var  objResponse = {
		  "expiration": 0,
		  "idReservation": 0
		};

		return objResponse;
	};

	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getDummyCancelTimeslot = function(stIdDomain, objJSONReserveRequest)
	{
		var  objResponse = {
		  "idCancellation": 0,
		  "isCancel": true
		}

		return objResponse;
	};

	/**
	 * @memberOf LibClearD
	 */
	LibClearD.getDummyBookReservedTimeslot = function(stIdDomain, objJSONReserveRequest)
	{
		var  objResponse = {
		  "confirmationDateTime": "2016-07-08T14:48:17.712Z",
		  "idConfirmation": 0
		}

		return objResponse;
	};


	return LibClearD;
});