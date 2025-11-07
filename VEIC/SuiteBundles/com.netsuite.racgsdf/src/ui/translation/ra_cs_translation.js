/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 */
var translatedStrings = {
    /**
     * The new SS2 main script generates a readily usable JSON object,
     * while the old SS1 main script generates an xml string that still needs to be parsed.
     * This code should be able to handle both scenarios until the old SS1 main script is completely removed.
     */
    init : function() {
        this.defaultMap = defaultDictionary;
        this.prefMap = preferenceDictionary;
    },
    loadMap : function(xmlString) {
        var safari = (navigator.userAgent.search('Safari') != -1) ? true : false;
        var ie = (navigator.userAgent.search('MSIE') != -1 || navigator.userAgent.search('Trident') != -1) ? true : false;
        var xml, map = {};
        if (!ie) {
            xml = new DOMParser().parseFromString(xmlString, "text/xml");
        } else {
            xml = new ActiveXObject("Microsoft.XMLDOM");
            xml.async = "false";
            xml.loadXML(xmlString);
        }
        var data = xml.getElementsByTagName('data');
        var count = data.length;
        for ( var i = 0; i < count; i++) {
            if(safari){
                try
                {
                    map[data[i].attributes.name.value] = data[i].getElementsByTagName('value')[0].childNodes[0].nodeValue;
                }
                catch(err)
                {
                    map[data[i].attributes.name.value] = '';
                }
            }
            else if (ie){
                map[data[i].attributes[0].text] = data[i].text;
            }
            else {
                map[data[i].attributes.name.value] = data[i].children[0].textContent;
            }
        }
        return map;
    },
    getText : function(key) {
        if (this.prefMap[key] === '' || this.defaultMap[key] === '') {
            return '';
        }
        return this.prefMap[key] || this.defaultMap[key] || key;
    }
};
translatedStrings.init();