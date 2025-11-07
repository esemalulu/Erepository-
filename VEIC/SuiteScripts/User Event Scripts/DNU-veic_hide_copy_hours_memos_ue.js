/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 define([], function () {

    function beforeLoad(context) {
      try{

	const dialogHtmlField = context.form.addField({
            id: 'custpage_jqueryui_hide_copy_hours_and_memos',
            type: 'inlinehtml',
            label: 'Dialog HTML Field'
        });
        dialogHtmlField.defaultValue = '<b>hi</b/>'; 
        var x = '<scr';
        x+= 'ipt>debugger; setInterval(function(){try{var l = jQuery(\'label:contains("Copy Hours and Memos")\');if(l.length > 0){l.parent().find("span:first").hide();l.css("color", "white").text(".");}}catch(ex){console.log(ex);}}, 100);</sc';
        x+= 'ript>';
        dialogHtmlField.defaultValue += x;
        
      }catch(e){
        log.error("ERROR ON "+e.lineNumber,e)
      }
    }




    return {
        beforeLoad: beforeLoad
    }
});