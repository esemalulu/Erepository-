/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 ���� 2013     Tea
 *
 */
function teaTest(){
	try{
		scheduled();
		}catch(err){
		alert(err.message);
	}	
	
} ;

function teaHello(){
	alert('Hello World');		
} ;

function copyRecTest(){
	var id=nlapiGetRecordId();
	var mastRec=nlapiLoadRecord('opportunity', id);
	//var oppNo=mastRec.getFieldValue('tranid');
	var titleName=mastRec.getFieldValue('title');
	try{
	var newOpp = nlapiCopyRecord('opportunity', id);
	newOpp.setFieldValue('custbody_plan_master_opportunity', id);
	newOpp.setFieldValue('title', titleName+'_Repl');
	var newid=nlapiSubmitRecord(newOpp, true);	
	}catch(err){
		alert(err.message);
	}	
}

function searchTest() {
	// type 'Reporting_Calendar_Weekly'  id 'customrecord_wkly_calendar'
	// custrecord_weekend_day Date      
	// YearMo custrecord_yearmo Free-Form Text 
	var replDate='8/1/2013';
	var endDate='9/1/2014';
	var ym='13-09';
	var filters=new Array();
	filters[0] = new nlobjSearchFilter('custrecord_weekend_day',null,'within',replDate,endDate);
	filters[1] = new nlobjSearchFilter('custrecord_yearmo',null,'is',ym);
	
	var columns = new Array();
	columns[0]= new nlobjSearchColumn('custrecord_weekend_day');
	columns[1]= new nlobjSearchColumn('custrecord_yearmo');
	var search=nlapiCreateSearch('customrecord_wkly_calendar', filters, columns);
	var resultSet=search.runSearch();
	var cc=0;
	var aa=resultSet.forEachResult(function(searchResult)
			{
		cc += 1;
		return true;      
		});
	alert(cc);
}

function dateTest(){
	var replDate='9/1/2013';
	var discDate='8/1/2014';
	//var yms=new Array();
	//yms=getYMs(nlapiStringToDate(replDate),nlapiStringToDate(discDate));
	var month454=new Array();
	month454=getMonth454(replDate,discDate);
	var l=month454.length;
	var i=0;
	for(i=0;i<l;i++){
	  alert(month454[i][0]+'---'+month454[i][1].toString());	
	}
}

// Get ym format like: yy-mm from  a date
function getYm(myDateStr){
	var mydate=nlapiStringToDate(myDateStr);
	var yyyy=mydate.getFullYear();
	var mm=mydate.getMonth()+1;
	var mms=mm.toString();
	if(mm<10){
		mms='0'+mms;
	}
	var yys=yyyy.toString().substring(2, 4);
	var ym=yys+'-'+mms;
	return ym;
}

//----getYMs Between replDate with discDate
function getYMs(replDate,discDate){	
	var yms= new Array();
	var yy1=nlapiStringToDate(replDate).getFullYear();
	var mm1=nlapiStringToDate(replDate).getMonth()+1;
	var yy2=nlapiStringToDate(discDate).getFullYear();
	var mm2=nlapiStringToDate(discDate).getMonth()+1;
	var yys=yy1.toString().substring(2, 4);	
	var mms=mm1.toString();
	var ym='';
	var k=0;
	var i=1;
	
	while(yy2>yy1){
		for(i=mm1;i<=12;i++){
			if(i<10){
				mms='0'+i.toString();
			}else{mms=i.toString();}
			ym=yys+'-'+mms;
			yms[k]=ym;
			k++;
			} //end for
		mm1=1;
		yy1++;
		yys=yy1.toString().substring(2, 4);	
		}//end while
	for(i=mm1;i<=mm2;i++){
		if(i<10){
			mms='0'+i.toString();
		}else{mms=i.toString();}
		ym=yys+'-'+mms;
		yms[k]=ym;
		k++;
	}	
	return yms;	
}

//----GetMonth454
function getMonth454(replDate,discDate){
	var mon454=new Array();
	var yms=new Array();	
	yms=getYMs(replDate,discDate);
	var l=yms.length;
	
	for(var i=0;i<l;i++){
	   var filters=new Array();   
	   var columns=new Array();
	   filters[0] = new nlobjSearchFilter('custrecord_weekend_day',null,'within',replDate,discDate);
	   filters[1] = new nlobjSearchFilter('custrecord_yearmo',null,'is',yms[i]);	
	   columns[0]= new nlobjSearchColumn('custrecord_weekend_day');
	   columns[1]= new nlobjSearchColumn('custrecord_yearmo');
	   var search=nlapiCreateSearch('customrecord_wkly_calendar', filters, columns);
	   var resultSet=search.runSearch();
	   var cc=0;
	   var aa=resultSet.forEachResult(function(searchResult)
			    {
		          cc += 1;
		          return true;      
		        });
	   mon454[i]=new Array();
	   mon454[i][0]=yms[i];
	   mon454[i][1]=cc;	   
	   
	}
	return mon454;
}

function getReplRecId(){
	var id=nlapiGetRecordId();
	var filters= new nlobjSearchFilter('custbody_plan_master_opportunity',null, 'anyof',id);
	var columns = new Array();
	columns[0]= new nlobjSearchColumn('tranid');
	columns[1]= new nlobjSearchColumn('title');	
	var search=nlapiCreateSearch('opportunity', filters, columns);
	var resultSet=search.runSearch();
	var cc=0;
	var title='';
	var replId=0;
	var aa=resultSet.forEachResult(function(searchResult)
			{
		cc += 1;
		title=searchResult.getValue('title');
		replId=searchResult.getId();
		alert(replId);
		return true;      
		});
	alert(cc);
}

function getIdTest(){
	//var id=nlapiGetRecordId();
	var subcc=nlapiGetLineItemCount('item');
	//nlapiGetLineItemValue(type, fldnam, linenum)
	var i=1;
	var ros=0;
	for(i=1;i<=subcc;i++){
		ros=nlapiGetLineItemValue('item', 'custcol_planb_ros', i);
		nlapiSetLineItemValue('item', 'custcol_planb_modfill', i,ros*4);
	}
	
}

function windowsTest() {
	var url="https://system.sandbox.netsuite.com/core/media/media.nl?id=8411&c=1257897&h=fc57334ec0cc64863f47&_xt=.html";
	var wd=window.open(url, 'newwindow', 'height=200, width=400, top=100, left=100, toolbar=no, menubar=no, scrollbars=no,resizable=no,location=no, status=no');	
	//wd.close();
}

function contextTest(){
	var context = nlapiGetContext();
	   alert('exectionContext_'+ context.getExecutionContext());
	   alert('script_'+context.getScriptId());
	   alert('Deploy_'+context.getDeploymentId());
	        for(var i=1;i<1000;i++){
	   	   var id=nlapiGetRecordId();
	   	   var replId=getReplId(id);		
	   	   if ( context.getRemainingUsage() <= 980 )
	         {
	             var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
	             if ( status == 'QUEUED' ){
		               alert('queued') ;   
		               break; 
	         }
	      }
	        }
}

function getFieldChanged(type,name){
	switch (name){
	case 'probability':
	case 'custbody_planb_replenish_startdate':
	case 'custbody_planb_discontinuedate':
	case 'rate':		
	case 'custcol_planb_collection_qty':
	case 'custcol_planb_ld_unitcost':
	case 'custcol_planb_ros':
	case 'custcol_planb_storecount':
		nlapiSetFieldValue('custbody_need_update_repl_flag', 'yes');		
		break;	
	}	
	
}

function beforeSaveTest(){
	var needUpdate=nlapiGetFieldValue('custbody_need_update_repl_flag');
	if(needUpdate=='yes'){
		alert('need update is yes');
		return false;				
	}else{return true;}
	
}


//-----------Cancel this function
function getMappFieldId(){
	//custitem_mapto_forecast_field
	var filters= new nlobjSearchFilter('itemid',null,'is','RTL-OOD');
	var columns = new Array();
	columns[0]= new nlobjSearchColumn('itemid');
	columns[1]= new nlobjSearchColumn('custitem_mapto_forecast_field');	
	var search=nlapiCreateSearch('item', filters, columns);
	var resultSet=search.runSearch();
	var mapp='';
	var aa=resultSet.forEachResult(function(searchResult)
			{
		mapp=searchResult.getValue('custitem_mapto_forecast_field');
		alert( mapp);
		return true;      
		});	
}



//-----Check the opp is a master opp or not
function isMasterOpp(oppId){
	var mastRec=nlapiLoadRecord('opportunity', oppId);
	var mastId=mastRec.getFieldValue('custbody_plan_master_opportunity');
	if(mastId==null){
		return true;
	}else{return false;}
}

//------Get all ReplId-------------
function getReplId(oppId){
	var replId=new Array();
	var filters= new nlobjSearchFilter('custbody_plan_master_opportunity',null, 'anyof',oppId);
	var columns = new Array();
	columns[0]= new nlobjSearchColumn('tranid');
	columns[1]= new nlobjSearchColumn('title');	
	var search=nlapiCreateSearch('opportunity', filters, columns);
	var resultSet=search.runSearch();
	var i=0;
	var aa=resultSet.forEachResult(function(searchResult)
			{
		replId[i]=searchResult.getId();
		i += 1;
		return true;      
		});
	return replId;
}

//------Delete All Repl
function delReplRec(replOppId) {
	try{
		nlapiDeleteRecord('opportunity', replOppId);
		return true;
	}catch(err){
		alert(err.message);
		return false;
	}
}
//------------
function createAllReplRec(oppId){
	
	var mastRec=nlapiLoadRecord('opportunity', oppId);
	//var oppNo=mastRec.getFieldValue('tranid');
	var titleName=mastRec.getFieldValue('title');
	var confidence=mastRec.getFieldValue('probability');
	var replDate=mastRec.getFieldValue('custbody_planb_replenish_startdate');
	var discDate=mastRec.getFieldValue('custbody_planb_discontinuedate');
	var projAmount=mastRec.getFieldValue('projectedtotal');
	
	//----if replDate is null or discDate is null, alter....
	if(replDate==null || discDate==null){
		alert('Sorry, Replenishment Start Date or Discontinue Date cannot be blank!');		
	}else{
	
	var chargeRate=new Array();	
//	chargeRate[0]=new Array();
//	chargeRate[0][0]='custbody_planb_openorder_discpct';
//	chargeRate[0][1]=mastRec.getFieldValue('custbody_planb_openorder_discpct');	
//	
//	chargeRate[1]=new Array();
//	chargeRate[1][0]='custbody_planb_openorder_discamt';
//	chargeRate[1][1]=mastRec.getFieldValue('custbody_planb_openorder_discamt');
//		
//	chargeRate[2]=new Array();
//	chargeRate[2][0]='custbody_planb_advertiseamt';
//	chargeRate[2][1]=mastRec.getFieldValue('custbody_planb_advertiseamt');
//	
//	chargeRate[3]=new Array();
//	chargeRate[3][0]='custbody_planb_rebateamt';
//	chargeRate[3][1]=mastRec.getFieldValue('custbody_planb_rebateamt');
	
	chargeRate[0]=new Array();
	chargeRate[0][0]='custbody_planb_rec_advertisepct';
	chargeRate[0][1]=mastRec.getFieldValue('custbody_planb_rec_advertisepct');	
	
	chargeRate[1]=new Array();
	chargeRate[1][0]='custbody_planb_rebatepct';
	chargeRate[1][1]=mastRec.getFieldValue('custbody_planb_rebatepct');	
	
	chargeRate[2]=new Array();
	chargeRate[2][0]='custbody_planb_defective_pct';
	chargeRate[2][1]=mastRec.getFieldValue('custbody_planb_defective_pct');	
	
	chargeRate[3]=new Array();
	chargeRate[3][0]='custbody_planb_freight_pct';
	chargeRate[3][1]=mastRec.getFieldValue('custbody_planb_freight_pct');	
	
//	custbody_planb_advertiseamt_recur
//	custbody_planb_rebateamt_recurring
//	custbodyplanb_defective_amt
//	custbody_planb_freight_amt
//	custbody_planb_total_opening_discounts
//	weightedtotal
//	custbody_proj_replenish_total
//	custbody_planb_total_recurring_disc
//	custbody_proj_replenish_totalweighted
//	
	
	//----Get Month 454----
	var month454=new Array();
	month454=getMonth454(replDate, discDate);
	var ym='';
	var ym454=0;
	var replAmount=0;
	var replNormalAmount=0;
	var replChargeAmount=0;
	
	//-----create repl one by one
	
	var createdRec=new Array();
	var createdReplRec=new Array();
		
		
	for(var i=0;i<month454.length;i++){
		   ym=month454[i][0];
		   ym454=month454[i][1];
		//---create repl record one by one
		//-----one by one create would take too long time, if weeks is the same, just copy, to save time
		var existReplId=0;
		var existReplAmount=0;
		var existNormalAmount=0;
		var existChargeAmount=0;
		for(var k=0;k<createdRec.length;k++){
			if(createdRec[k][0]==ym454){
				existReplId=createdRec[k][1];
				existNormalAmount=createdRec[k][2];
				existChargeAmount=createdRec[k][3];
				existReplAmount=existNormalAmount-existChargeAmount;
				break;
			}
		}//end for
		try{
		   if(existReplId>0){
			//----copy from this createdRec Directly			
			copyReplRec(existReplId,titleName,ym,ym454,confidence,existNormalAmount);
			replNormalAmount=replNormalAmount+existNormalAmount;
			replChargeAmount=replChargeAmount+existChargeAmount;
		   }else{		
		     // if no exist repl rec, create one---
			createdReplRec=createReplRec(oppId,titleName,ym,ym454,confidence,chargeRate);
			//-----record this createdRec
			var j=createdRec.length;
			createdRec[j]=new Array();
			createdRec[j]=createdReplRec;
			replNormalAmount=replNormalAmount+createdReplRec[2];
			replChargeAmount=replChargeAmount+createdReplRec[3];			
		    }
	       }catch(err){
		      alert('MainCreateReplRec__'+err.message);
		      break;
	       }
	}
	
	
	//----update total repl amount
	var cRate=0;
	if(confidence==null){cRate=0;}else{
		cRate=parseFloat(confidence);
		}
	
	try{
		replAmount=replNormalAmount-replChargeAmount;
	var rangeHigh=parseFloat(replNormalAmount)+parseFloat(projAmount);
	nlapiSetFieldValue('custbody_proj_replenish_total', replNormalAmount);
	nlapiSetFieldValue('custbody_proj_replenish_totalweighted', replNormalAmount*cRate/100);
	nlapiSetFieldValue('custbody_planb_total_recurring_disc', -replChargeAmount);	
	
	nlapiSetFieldValue('rangehigh', rangeHigh);
	}catch(err){
		alert('MainCreateReplRec_rangeHigh_'+err.message);
	}
	//wd.close();
	}//end if repl or disd blank
}

//----create repl record one by one
function createReplRec(oppId,titleName,ym,ym454,confidence,chargeRate){
	var createdRec=new Array();
	var replAmount=0;
	var ddate=ym.substring(3,5)+'/01/20'+ym.substring(0,2);
	//var mmyy=ym.substring(3,5)+ym.substring(0,2);
		//try{
		var newOpp = nlapiCopyRecord('opportunity', oppId);
		newOpp.setFieldValue('custbody_plan_master_opportunity', oppId);
		//newOpp.setFieldValue('title', titleName+'_Repl_'+mmyy);
		newOpp.setFieldValue('title', titleName);
		newOpp.setFieldValue('probability', confidence);
		newOpp.setFieldValue('expectedclosedate',ddate);
		newOpp.setFieldValue('custbody23','T');
		 
		//-----update sub line record---
		var subcc=newOpp.getLineItemCount('item');
		var i=1;
		var normalAmount=0;
		//----update normal item first
		for(i=1;i<=subcc;i++){
			var itemId=newOpp.getLineItemValue('item', 'item', i);	
			var ros=newOpp.getLineItemValue('item', 'custcol_planb_ros', i);	
			var colQty=newOpp.getLineItemValue('item', 'custcol_planb_collection_qty', i);
			var storeCount=newOpp.getLineItemValue('item', 'custcol_planb_storecount', i);
			var wsPrice=newOpp.getLineItemValue('item', 'rate', i);
			var landCost=newOpp.getLineItemValue('item', 'custcol_planb_ld_unitcost', i);
			var lineQty=Math.round(colQty*storeCount*ros*ym454);
			var lineWkQty=Math.round(colQty*storeCount*ros);			
			try{
				   newOpp.setLineItemValue('item', 'custcol_planb_modfill', i,ros*ym454);
				   newOpp.setLineItemValue('item','quantity',i,lineQty);
				   newOpp.setLineItemValue('item','amount',i,lineQty*wsPrice);
				   newOpp.setLineItemValue('item','costestimate',i,lineQty*landCost);
				   newOpp.setLineItemValue('item', 'custcol_plan_wklyrepl_qty', i,lineWkQty);	
				   normalAmount=normalAmount+lineQty*wsPrice;		
			}catch(err){
				alert('setLineItemvalue__'+err.message);
				break;
			  }
					
			}//end for
		
		
			//------Tea 20130731 from Laura, neednot put charge item into this subline, but need cacutelate in body field
			
			/*-----cancle charge line------
			//---if item is not in map table, then update quantity and amount etc
			//---if item is in map table, do nothing first
			if(!isChargeItem(itemId) && ros>0){
				try{
			   newOpp.setLineItemValue('item', 'custcol_planb_modfill', i,ros*ym454);
			   newOpp.setLineItemValue('item','quantity',i,lineQty);
			   newOpp.setLineItemValue('item','amount',i,colQty*storeCount*ros*ym454*wsPrice);
			   newOpp.setLineItemValue('item','costestimate',i,colQty*storeCount*ros*ym454*landCost);
			   newOpp.setLineItemValue('item', 'custcol_plan_wklyrepl_qty', i,lineWkQty);	
			   normalAmount=normalAmount+colQty*storeCount*ros*ym454*wsPrice;		
				}catch(err){alert('setLineItemvalue__'+err.message);
				break;
				}
			}else{
				//-----then 1\delete all line for old Charge, then insert new line if the Charge fee is not null				
				try{
					//remove the line
					newOpp.removeLineItem('item', i);
					i--;
					subcc=subcc-1;
					}catch(err){
						alert('removeLineItem__'+err.message);
						break;
						}
			}
		}
		
		
		//-----insert new line
		//--get current line count 
		subcc=newOpp.getLineItemCount('item');	
		var chargeAmount=0;
		replAmount=normalAmount;
		//----Check the chargeRate, if value is null, do nothing, if not null, insert new line
		for(i=0;i<chargeRate.length;i++){
			var fieldId=chargeRate[i][0];
			var pRate=chargeRate[i][1];				
			var cRate=0;			
			if(pRate==null){cRate=0;}else{
				cRate=parseFloat(pRate);
				}
			if (cRate>0){
			   var chargeMap=new Array();
			   try{
			   chargeMap=getChargeMap(fieldId);
			   }catch(err){alert('getChargeMap___'+err.message);
			   break;}
			   if(chargeMap.length>0){
				   var itemId=chargeMap[1];
				   var amountType=chargeMap[2];
				   var replFlag=chargeMap[3];
				   if(replFlag!='F'){
					   if(amountType=='amount'){
						   chargeAmount=cRate;
					   }else{
						   chargeAmount=0-normalAmount*cRate/100;
					   }
					   
					   //---insert a new line
					   subcc=subcc+1;						
					   newOpp.insertLineItem('item', subcc);
					   newOpp.setCurrentLineItemValue('item', 'item', itemId);
					   newOpp.setCurrentLineItemValue('item', 'amount',chargeAmount);
					   newOpp.setCurrentLineItemValue('item', 'custcol_planb_collection_qty',1);
					   newOpp.setCurrentLineItemValue('item', 'custcol_planb_storecount',1);
					   newOpp.setCurrentLineItemValue('item', 'custcol_planb_modfill', 1);
					   newOpp.setCurrentLineItemValue('item', 'quantity', 1);
					   var itemRec=nlapiLoadRecord('otherchargeitem', itemId);
					   var desc=itemRec.getFieldValue('salesdescription');					   
					   newOpp.setCurrentLineItemValue('item', 'description', desc);
					   newOpp.commitLineItem('item');
					   replAmount=replAmount+chargeAmount;
					}// endif flag=yes
				   else{
					   //----update the main body field 'blank'
					   newOpp.setFieldValue(fieldId,null);
				   }
			   }//---end has map.length>0
			}//end cRate
		}//--for
		 
		---------------------end charge sub line----------------------------*/		
		
		//----update project amount
		
		//----update charge amount---
		var chargeAmount=0;
		//----Check the chargeRate, if value is null, do nothing, if not null, update the amount by percentage
		for(i=0;i<chargeRate.length;i++){
			var fieldId=chargeRate[i][0];
			var pRate=chargeRate[i][1];				
			var cRate=0;			
			if(pRate==null){cRate=0;}else{
				cRate=parseFloat(pRate);
				}
			if (cRate>0){
				//----
				switch(fieldId){
				  case "custbody_planb_rec_advertisepct":
					  newOpp.setFieldValue('custbody_planb_advertiseamt_recur', -normalAmount*cRate/100);
					  chargeAmount=chargeAmount+normalAmount*cRate/100;
					  break;
				  case "custbody_planb_rebatepct":
					  newOpp.setFieldValue('custbody_planb_rebateamt_recurring', -normalAmount*cRate/100);
					  chargeAmount=chargeAmount+normalAmount*cRate/100;
					  break;
				  case "custbody_planb_defective_pct":
					  newOpp.setFieldValue('custbodyplanb_defective_amt', -normalAmount*cRate/100);
					  chargeAmount=chargeAmount+normalAmount*cRate/100;
					  break;
				  case "custbody_planb_freight_pct":
					  newOpp.setFieldValue('custbody_planb_freight_amt', -normalAmount*cRate/100);
					  chargeAmount=chargeAmount+normalAmount*cRate/100;
					  break;					
				}//---end switch
			}//---end if cRate>0
		}//---end for charge
		
		//--------update disorder body charge amount and total
		newOpp.setFieldValue('custbody_planb_openorder_discpct', null);
		newOpp.setFieldValue('custbody_planb_openorder_discamt', null);
		newOpp.setFieldValue('custbody_planb_advertiseamt', null);
		newOpp.setFieldValue('custbody_planb_rebateamt', null);		

		//----------------------------------------		
		
		if(confidence==null){cRate=0;}else{
		cRate=parseFloat(confidence);
		}
		
		replAmount=normalAmount-chargeAmount;
		
		newOpp.setFieldValue('projectedtotal', normalAmount);
		newOpp.setFieldValue('custbody_planb_total_opening_discounts', -chargeAmount);
		newOpp.setFieldValue('weightedtotal', normalAmount*cRate/100);
		
		newOpp.setFieldValue('custbody_proj_replenish_total', null);
		newOpp.setFieldValue('custbody_proj_replenish_totalweighted', null);
		newOpp.setFieldValue('custbody_planb_total_recurring_disc', null);		
		
		newOpp.setFieldValue('rangelow', replAmount);
		newOpp.setFieldValue('rangehigh', normalAmount);
		//alert(normalAmount*cRate/100);
		try{
		    var newid=nlapiSubmitRecord(newOpp, true);	
		    createdRec[0]=ym454;
		    createdRec[1]=newid;
		    createdRec[2]=normalAmount;
		    createdRec[3]=chargeAmount;
		}catch(err){alert('submitRec_CreateNewRepl_'+err.message);
			  createdRec[0]=ym454;
		    createdRec[1]=0;
		    createdRec[2]=normalAmount;
		    createdRec[3]=chargeAmount;
		}
		//}catch(err){
		//	alert('createReplRec__'+err.message);
		//}
	return createdRec;
}

//----copy repl record from the exist repl one if the ym454 is same
function copyReplRec(oppId,titleName,ym,ym454,confidence,existReplAmount){
	var ddate=ym.substring(3,5)+'/01/20'+ym.substring(0,2);
	var mmyy=ym.substring(3,5)+ym.substring(0,2);
	
		var newOpp = nlapiCopyRecord('opportunity', oppId);
		//newOpp.setFieldValue('title', titleName+'_Repl_'+mmyy);
		newOpp.setFieldValue('title', titleName);
		newOpp.setFieldValue('expectedclosedate',ddate);
		newOpp.setFieldValue('probability', confidence);
		//newOpp.setFieldValue('custbody_proj_replenish_total', null);
		var cRate=0;
		if(confidence==null){cRate=0;}else{
			cRate=parseFloat(confidence);
			}
		newOpp.setFieldValue('weightedtotal', existReplAmount*cRate/100);
		try{
		    var newid=nlapiSubmitRecord(newOpp, true);	
			}catch(err){alert('submitRec_CopyRepl_'+err.message);
				
				}
}

//-----------Get the Charge map----------------

function getChargeMap(fieldId){
	//customrecord_oppcharge_item_map 
	//custrecord_chgitemmap_field_id
	//custrecord_chgitemmap_item
	//custrecord_chgitemmap_amttype
	//custrecord_chgitemmap_recur_flag
	var charge=new Array();
	var columns=new Array();
	var filters = new nlobjSearchFilter('custrecord_chgitemmap_field_id',null,'is',fieldId);	
	columns[0]= new nlobjSearchColumn('custrecord_chgitemmap_item');
	columns[1]= new nlobjSearchColumn('custrecord_chgitemmap_amttype');
	columns[2]= new nlobjSearchColumn('custrecord_chgitemmap_recur_flag');
	var search=nlapiCreateSearch('customrecord_oppcharge_item_map', filters, columns);
	var resultSet=search.runSearch();
	var aa=resultSet.forEachResult(function(searchResult)
	      {
		      charge[0]=fieldId;
		      charge[1]=searchResult.getValue('custrecord_chgitemmap_item');
		      charge[2]=searchResult.getValue('custrecord_chgitemmap_amttype');
		      charge[3]=searchResult.getValue('custrecord_chgitemmap_recur_flag');	
		      return true;      
		      });
	return charge;  	
}

//------is Charge item-----
function isChargeItem(itemId){
	var filters= new nlobjSearchFilter('custrecord_chgitemmap_item',null,'anyof',itemId);	
	var columns= new nlobjSearchColumn('custrecord_chgitemmap_field_id');
	var search=nlapiCreateSearch('customrecord_oppcharge_item_map', filters, columns);
	var resultSet=search.runSearch();
	var i=0;
	var aa=resultSet.forEachResult(function(searchResult)
	      {
		      i += 1;
		      return true;
		      });
	if(i>0){return true;}else{return false;}
}

//-----test
function chargeItemTest(){
	var id='custbody_planb_openorder_discpct';
	var aa=new Array();
	aa=getChargeMap(id);
	if(aa.length>0){
		alert(aa[3]);
	}else{alert('0');
	}
}

//--------------LT DELETE ONLY TEST  ----------
function deleteReplManually(){
	var id=nlapiGetRecordId();
	var replId=new Array();
	var i=0;
	var hasDelAll=1;
	
	replId=getReplId(id);
	
			
				for(i=0;i<replId.length;i++){
					if(!delReplRec(replId[i])){
						hasDelAll=hasDelAll*0;
					}
				}
}
//--------------updateReplManually()----------
function updateReplManually(){
	var id=nlapiGetRecordId();
	var replId=new Array();
	var i=0;
	var hasDelAll=1;
	
	replId=getReplId(id);
	
	//----Check the opportunity is a master? 
	if(isMasterOpp(id)){
		//----Check the master opp has repl there already?
		if(replId.length==0){
			//----if no repl, then create, if has repl already, ask if update
			//----Create repl opp
			createAllReplRec(id);
			
		}else{
			//----update-----
			if(confirm('The Repl records is there already, do you want to recreate them manually?')){
				//delete the exist repl				
				for(i=0;i<replId.length;i++){
					if(!delReplRec(replId[i])){
						hasDelAll=hasDelAll*0;
					}
				}
				if(hasDelAll==0){
					alert('Sorry, Cannot delete all of the repl records, please try again later...');
				}else{
					//-----create repl opp
					createAllReplRec(id);					
				}									
			}// end confirm				
		}// end has repl Rec	
	}else{
		alert('Sorry, this is not a master record, cannot create repl record for it.');
	}//--end isMaster	
}
