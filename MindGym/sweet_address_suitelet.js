/**
 * Display UI for participant data entry task.
 *
 * @method participantDataEntryUI
 * @param {Object} request
 * @param {Object} response
 */
function addressSelectAddressUI(request, response)
{
  try {
    
    echoHeader();
    
    // Body
    echo('<script type="text/javascript">');
    echo('function submitForm() {');
    echo('var address = window.opener.document.getElementById("custcol_bo_address");');
    echo('address.value = "2 Kensington Square, London, W8 5EP, United Kingdom";');
    echo('window.close();');
    echo('}');
    echo('</script>');
    
    echo('<select id="address">');
    echo('<option value="-1">- New -</option>');
    echo('<option value="100">2 Kensington Square</option>');
    echo('<option value="101">40 Seaforth Cresent</option>');
    echo('</select>');
    echo('<input type="button" value="Ok" onClick="javascript:submitForm()">')
    
    echoFooter();
    
  } catch (e) {
  
    // Write error to screen
    if (e instanceof nlobjError) {
      response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
    } else {
      response.write('Error: ' + e.toString());
    }
  }
}

/**
 * A simple alias to response.writeLine
 *
 * @method echo
 * @param {String} string
 */
function echo(string)
{
  response.writeLine(string);
}

/**
 * Outputs the html header
 *
 * @method echoHeader
 */
function echoHeader()
{
  echo('<html><head>');
  echo('<title>Select Address</title>');
  echo('</head>');
  echo('<body>');
}

/**
 * Outputs the html footer
 *
 * @method echoFooter
 */
function echoFooter()
{
  echo('</body>');
  echo('</html>');
}
