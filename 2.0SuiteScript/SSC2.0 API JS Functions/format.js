/**
 * SuiteScript format module
 *
 * @module N/format
 * @suiteScriptVersion 2.x
 *
 */
function format() {
        
    /**
     * Parse a value from the appropriate preference formatted-value to a raw value.
     *
     * @param {Object} options
     * @param {string} options.value the data you wish to parse
     * @param {string} options.type the field type i.e. DATE, CURRENCY, INTEGER
     *
     * @throws MISSING_REQD_ARGUMENT if either value or type is missing
     *
     * @return {Date|string|number} If parseable, the parsed value. If not or given an invalid Type, the value passed in options.value
     *
     * @since 2015.2
     */    
    this.parse = function(options) {};    
    
    /**
     * Parse a value from the raw value to its appropriate preference formatted-value.
     *
     * @param {Object} options
     * @param {Date|string|number} options.value the data you wish to format
     * @param {string} options.type the field type i.e. DATE, CURRENCY, INTEGER
     *
     * @throws MISSING_REQD_ARGUMENT if either value or type is missing
     *
     * @return {string} If formattable, the formatted value. If not or given an invalid Type, the value passed in options.value
     *
     * @since 2015.2
     */    
    this.format = function(options) {};    
    
    /**
     * Enum for field types.
     * @enum {string}
     */    
    function formatType() {
        this.DATE = 'date';
        this.TIME = 'time';
        this.TIMETRACK = 'timetrack';
        this.TIMEOFDAY = 'timeofday';
        this.DATETIME = 'datetime';
        this.DATETIMETZ = 'datetimetz';
        this.INTEGER = 'integer';
        this.POSINTEGER = 'posinteger';
        this.PERCENT = 'percent';
        this.RATE = 'rate';
        this.RATEHIGHPRECISION = 'ratehighprecision';
        this.FLOAT = 'float';
        this.POSFLOAT = 'posfloat';
        this.NONNEGFLOAT = 'nonnegfloat';
        this.POSCURRENCY = 'poscurrency';
        this.NONNEGCURRENCY = 'nonnegcurrency';
        this.CURRENCY = 'currency';
        this.CURRENCY2 = 'currency2';
        this.URL = 'url';
        this.CHECKBOX = 'checkbox';
        this.CCNUMBER = 'ccnumber';
        this.PHONE = 'phone';
        this.FULLPHONE = 'fullphone';
        this.IDENTIFIER = 'identifier';
        this.FUNCTION = 'function';
        this.MMYYDATE = 'mmyydate';
        this.CCEXPDATE = 'ccexpdate';
        this.CCVALIDFROM = 'ccvalidfrom';
        this.COLOR = 'color';
    }    
    this.Type = formatType;    
    
}