(function($){
	$(".custom-select").selectbox({hide_duplicate_option:true});	
	
	$("#bill-phone-number , #phone-number , #post-code").keypress(function (e) {
     //if the letter is not digit then display error and don't type anything
     if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57)) {
        //display error message
        //$("#errmsg").html("Digits Only").show().fadeOut("slow");
               return false;
    }
   });
})(jQuery);