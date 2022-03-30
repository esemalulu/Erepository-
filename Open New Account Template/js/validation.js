
$(document).ready(function () {
    //called when key is pressed in textbox
	//alert(document.getElementById("ismanual").value);    
    var form1 = "#open-account-form";
    $(form1).validate({
        ignore: [],
        rules: {
            custentity_clifrm_companyname: {
                required: true
            },
            custentity_clifrm_salutation: {
                required: false,
            },
            custentity_clifrm_firstname: {
                required: true,
            },
            custentity_clifrm_lastname: {
                required: true,
            },
            custentity_clifrm_title: {
                required: false,
            },
            custentity_clifrm_phone: {
                required: true,
                number: true
            },
            custentity_clifrm_email: {
                required: true,
                email: true
            },
            custentity_clifrm_billaddressee: {
                required: false,
            },
            custentity_clifrm_billaddr1: {
                required: true,
            },
            custentity_clifrm_billcity: {
                required: true,
            },
            custentity_clifrm_billstate: {
                required: true,
            },
            custentity_clifrm_billzip: {
                required: true,
                number: false
            },
            custentity_clifrm_billcountry: {
                required: true,
            },
            custentity_clifrm_billphone: {
                required: true,
                number: true
            },
            custentity_clifrm_billemail: {
                required: true,
                email: true
            },
            custentity_clifrm_paymentmethod: {
                required: true,
            },
            custentity_clifrm_agreedterms: {
                required: ( (document.getElementById("ismanual").value=='F')?true:false),
            }

        },
        errorClass: 'error',
        validClass: 'valid',
        errorElement: 'div',
        highlight: function (element, errorClass, validClass) {
            if ($(element).is("select")) {
                $(element).next(".sbHolder").addClass(errorClass).removeClass(validClass)
            } else if ($(element).is("input[type='checkbox']")) {
                $(element).next("label").addClass(errorClass).removeClass(validClass)
            } else {
                $(element).addClass(errorClass).removeClass(validClass);
            }
        },
        unhighlight: function (element, errorClass, validClass) {
            if ($(element).is("select")) {
                $(element).next(".sbHolder").removeClass(errorClass).addClass(validClass)
            } else if ($(element).is("input[type='checkbox']")) {
                $(element).next("label").removeClass(errorClass).addClass(validClass)
            } else {
                $(element).removeClass(errorClass).addClass(validClass);
            }
        },
        messages: {

        },
        errorPlacement: function (error, element) {
            //error.insertAfter(element);
        },
        submitHandler: function (form) { // for demo
            form.submit();
            $(form1 + ' .successmsg').fadeIn();
            setTimeout(function () {
                $(form1 + ' .successmsg').fadeOut();
                $(form1)[0].reset();
                $(form1 + " .valid").each(function () {
                    $(this).removeClass("valid")
                })
                $("select").each(function () {
                    $(this).selectbox("detach");
                    $(this)[0].selectedIndex = 0;
                    $(this).selectbox();
                })
                $('input[type="radio"], input[type="checkbox"]').attr('checked', false);
                //$(".customRadiobox").removeClass("checked");
            }, 3000)
            return false;
        }
    });
    $(form1 + " input[type='submit']").click(function () {
        //$(form1 + "input").blur()
        //$(this).focus()
        setTimeout(function () {
            var errorFirst = $("input.error").first()
                //var errorFirstOffset = $("input.error").first().offset().top - 50
                //$("html, body").animate({scrollTop:errorFirstOffset},800,function(){
            errorFirst.focus();
            //})
        }, 50)
    })

    $(form1 + ' select').on('change', function () {
        $(form1).validate().element(this);
    })
})