/**
 * Payment Script
 *
 */
/**
 * Constants
 */
var US_SUBSIDIARY_ID = '3';
var SG_SUBSIDIARY_ID = '4';
var UAE_SUBSIDIARY_ID = '5';


/**
 * Before loading Payment form
 *
 * @return {Void}
 */
function localform_pageInit(type) {

nlapiSetFieldValue('undepfunds','F');
var subsidiary = nlapiGetFieldValue('subsidiary');
switch(subsidiary){

case US_SUBSIDIARY_ID:
  nlapiSetFieldValue('account', '137');
  break;

case SG_SUBSIDIARY_ID:
  nlapiSetFieldValue('account', '446');
  break;

case UAE_SUBSIDIARY_ID:
  nlapiSetFieldValue('account', '445');
  break;

}

}

/**
 * SaveRecord hook
 *
 * @return {Boolean}
 */
function localform_saveRecord() {

}


/**
 * FieldChanged hook
 *
 * @return {Void}
 */
function localform_fieldChanged(type, name, linenum) {

if(name == 'subsidiary'){
var subsidiary = nlapiGetFieldValue('subsidiary');

switch(subsidiary){

case US_SUBSIDIARY_ID:
nlapiSetFieldValue('account', '137');
break;

case SG_SUBSIDIARY_ID:
nlapiSetFieldValue('account', '446');
break;

case UAE_SUBSIDIARY_ID:
nlapiSetFieldValue('account', '445');
break;

}


}

}

