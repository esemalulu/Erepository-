
/**
 * This script disabled fields based on the Source value selected during the Field Changed event.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function fieldChanged_DisableFieldsBasedOnSource(stType, stName, iLineNum){

    /* Clear values and disable fields based on selected source */
    if (stName == 'custrecord_renewal_tran_form_source')
    {
        disableFields();

        /* clear all fields */
        for(i in RENEWAL_TRAN_FORM_MAP_FIELDS){
            if(RENEWAL_TRAN_FORM_MAP_FIELDS[i] != '' && RENEWAL_TRAN_FORM_MAP_FIELDS[i] != null && RENEWAL_TRAN_FORM_MAP_FIELDS[i] != undefined){
                nlapiSetFieldValue(RENEWAL_TRAN_FORM_MAP_FIELDS[i],'',false,true);
            }
        }
    }

    setFieldValues();    

}

/**
 * This script disabled fields based on the Source value selected during the Page Init event.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function pageInit_DisableFields(){

    disableFields();
    setFieldValues();    

}


/**
 * This script hides fields based on the Source value selected.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function beforeLoad_HideFields(type,form){

    if(type == 'view'){
        
        /* Hide all fields */
        for(i in RENEWAL_TRAN_FORM_MAP_FIELDS){
            if(RENEWAL_TRAN_FORM_MAP_FIELDS[i] != '' && RENEWAL_TRAN_FORM_MAP_FIELDS[i] != null && RENEWAL_TRAN_FORM_MAP_FIELDS[i] != undefined){
                form.getField(RENEWAL_TRAN_FORM_MAP_FIELDS[i]).setDisplayType('hidden');
            }
        }
        /* This is always hidden. This field should only be shown on list views. */
        form.getField('custrecord_renewal_tran_form_value').setDisplayType('hidden');
        
        var stSource = nlapiGetFieldValue('custrecord_renewal_tran_form_source');
        var stValue = null;
        /* Show only the one selected. */
        if(stSource != null && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != null && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != '' && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != undefined){
            if (RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != '' && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != null && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != undefined) {
                form.getField(RENEWAL_TRAN_FORM_MAP_FIELDS[stSource]).setDisplayType('normal');
            }
        }
    }
    
}

function setFieldValues(){
    
    /* Set the value to the value field for display purposes. */
    var stSource = nlapiGetFieldValue('custrecord_renewal_tran_form_source');
    var stValue = null;
    switch(stSource){
        case RENEWAL_TRAN_FORM_SOURCE_CLASS:
        case RENEWAL_TRAN_FORM_SOURCE_LOCATION:
        case RENEWAL_TRAN_FORM_SOURCE_DEPARTMENT:
        case RENEWAL_TRAN_FORM_SOURCE_CHANNEL:
            stValue = nlapiGetFieldText(RENEWAL_TRAN_FORM_MAP_FIELDS[stSource]);
            break;
        case RENEWAL_TRAN_FORM_SOURCE_SUBSIDIARY:
            stValue = nlapiGetFieldValue(RENEWAL_TRAN_FORM_MAP_FIELDS[stSource]);
            break;
    }
    if(stValue != null && stValue != undefined && stValue != ''){
        nlapiSetFieldValue('custrecord_renewal_tran_form_value',stValue,false,true);
    }else{
        nlapiSetFieldValue('custrecord_renewal_tran_form_value','',false,true);
    }
}

function disableFields(){
    
    var stSource = nlapiGetFieldValue('custrecord_renewal_tran_form_source');

    /* Disable and hide all fields */
    for(i in RENEWAL_TRAN_FORM_MAP_FIELDS){
        if(RENEWAL_TRAN_FORM_MAP_FIELDS[i] != '' && RENEWAL_TRAN_FORM_MAP_FIELDS[i] != null && RENEWAL_TRAN_FORM_MAP_FIELDS[i] != undefined){
            nlapiDisableField(RENEWAL_TRAN_FORM_MAP_FIELDS[i],true);
            document.getElementById(RENEWAL_TRAN_FORM_MAP_FIELDS[i] + '_fs').parentNode.parentNode.style.display = 'none';
        }
    }
    document.getElementById('custrecord_renewal_tran_form_value_fs').parentNode.parentNode.style.display = 'none';
    
    /* Enable only the one selected. */
    if(stSource != null && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != null && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != '' && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != undefined){
        if(RENEWAL_TRAN_FORM_MAP_FIELDS[stSource]!=null && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != '' && RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] != undefined){
            nlapiDisableField(RENEWAL_TRAN_FORM_MAP_FIELDS[stSource],false);
            document.getElementById(RENEWAL_TRAN_FORM_MAP_FIELDS[stSource] + '_fs').parentNode.parentNode.style.display = '';
        }
    }
    
}