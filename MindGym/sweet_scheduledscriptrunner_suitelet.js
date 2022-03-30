
/**
 * Tool to run scheduled scripts immediately. Useful for debugging.
 *
 * @param {Object} request
 * @param {Object} response
 */
function scheduledScriptRunner(request, response)
{
  echoHeader();

  echo('<h1>Run script</h1>');
  
  echo('<div id="main">');
  
  // Has form been submitted?
  if ((request.getMethod() == 'POST') && (request.getParameter('scheduled_script') != null)) {
    var valid = true;
    var errorMsg = null;
    
    // Set script id
    var scriptId = request.getParameter('scheduled_script');
    if (scriptId == 'manual') {
      scriptId = request.getParameter('script_id');
    }
    
    // Validate input
    if (!scriptId || scriptId.length < 1) {
      errorMsg = 'Error: Script Id is missing.';
      valid = false;
    }
    
    // Schedule script
    if (valid) {
      var success = true;
      var errorMsg = null;
      var scheduleReturn = 'Undefined';
      var params = null;
      
      // Get params
      var useParams = request.getParameter('use_params');
      if (useParams == 'T') {
        echo('<!-- Use params -->');
        paramNames = request.getParameterValues('param_names[]');
        paramValues = request.getParameterValues('param_values[]');
        
        if (paramValues.length > 0 && paramNames.length == paramValues.length) {
          params = new Array();
          echo('<!-- Populate params -->');
          var i = 0, n = paramNames.length;
          for (;i < n; i++) {
            echo('<!-- paramNames[' + i + ']=' + paramNames[i] + '-->');
            echo('<!-- paramValues[' + i + ']=' + paramValues[i] + '-->');
            params[paramNames[i]] = paramValues[i];
          }
          echo('<!-- params.length=' + params.length + '-->');
        }
      }
      
      try {
        scheduleReturn = nlapiScheduleScript(scriptId, null, params);
      } catch (e) {
        success = false;
        if (e instanceof nlobjError) {
          errorMsg = 'Error: (' + e.getCode() + ') ' + e.getDetails();
        } else {
          errorMsg = 'Error: ' + e.toString();
        }
      }
      
      if (scheduleReturn == null) {
        success = false;
        errorMsg = 'Error: Failed to start script. The script might already be running. Make sure the script deployment status is either "not scheduled" or "complete" and try again.';
      }
      
      var retryText = success ? 'Run again' : 'Try again';
      var messageText = success ? 'Successfully started script.' : errorMsg;
    
      echo('<div id="message-box">');
      echo('<p>' + messageText + '</p>');
      echo('<form method="POST" action="">');
      echo('<input type="hidden" name="scheduled_script" value="' + scriptId + '" />');
      echo('<input type="submit" value="' + retryText + '" />');
      echo('</form>');
      echo('</div>');
    } else {
      echo('<div id="message-box">' + errorMsg + '</div>');
    }
  }
  
  echo('<table class="script-table">');
    echo('<thead>');
    echo('<tr>');
    echo('<th class="name">Name</th>');
    echo('<th class="desc">Description</th>');
    echo('<th class="start">Start</th>');
    echo('<th class="log">Log</th>');
    echo('</tr>');
    echo('</thead>');
    
    echo('<tbody>');
    
    echo('<tr>');
    echo('<td>Update item pricing in foreign currencies</td>');
    echo('<td>Update item pricing in foreign currencies based on daily foreign exchange rates. Items must have Use Base Currency enabled and Base Currency selected.</td>');
    echo('<td>');
    echo('<form method="POST" action="">');
    echo('<input type="hidden" name="scheduled_script" value="customscript_item_updateprices_scheduled" />');
    echo('<input type="submit" value="Start" />');
    echo('</form>');
    echo('</td>');
    echo('<td><a target="_blank" href="/app/common/scripting/script.nl?id=81">View log</a></td>');
    echo('</tr>');

    echo('<tr>');
    echo('<td>Schedule email campaigns</td>');
    echo('<td>Schedule email campaigns (e.g. eprompts) based on jobs. Note this script will queue the email but not send them out.</td>');
    echo('<td>');
    echo('<form method="POST" action="">');
    echo('<input type="hidden" name="scheduled_script" value="customscript_emailcampaign_scheduled" />');
    echo('<input type="submit" value="Start" />');
    echo('</form>');
    echo('</td>');
    echo('<td><a target="_blank" href="/app/common/scripting/script.nl?id=85">View log</a></td>');
    echo('</tr>');
    
    echo('<tr>');
    echo('<td>Send email campaigns</td>');
    echo('<td>Send out scheduled email campaigns (e.g. eprompts).</td>');
    echo('<td>');
    echo('<form method="POST" action="">');
    echo('<input type="hidden" name="scheduled_script" value="customscript_mailmanager_scheduled" />');
    echo('<input type="submit" value="Start" />');
    echo('</form>');
    echo('</td>');
    echo('<td><a target="_blank" href="/app/common/scripting/script.nl?id=88">View log</a></td>');
    echo('</tr>');
    
    echo('<tr>');
    echo('<td>Fulfill sales order items for delivered jobs</td>');
    echo('<td>Fulfill sales order items based on jobs where the job has been marked as delivered.</td>');
    echo('<td>');
    echo('<form method="POST" action="">');
    echo('<input type="hidden" name="scheduled_script" value="customscript_so_fulfillment_scheduled" />');
    echo('<input type="submit" value="Start" />');
    echo('</form>');
    echo('</td>');
    echo('<td><a target="_blank" href="/app/common/scripting/script.nl?id=90">View log</a></td>');
    echo('</tr>');
    
    echo('<tr>');
    echo('<td>Update job statuses</td>');
    echo('<td>Update job statuses. Use offset provided from script execution log to process more than 1,000 records.</td>');
    echo('<td>');
    echo('<form method="POST" action="">');
    echo('<input type="hidden" name="scheduled_script" value="customscript_looptest" />');
    echo('<input type="submit" value="Start" />');
    echo('<input type="hidden" name="use_params" value="T" />');
    echo('<input type="hidden" name="param_names[]" value="custscript_offset" />');
    echo('<input type="text" name="param_values[]" value="" />');
    echo('</form>');
    echo('</td>');
    echo('<td><a target="_blank" href="/app/common/scripting/script.nl?id=93">View log</a></td>');
    echo('</tr>');
    
    echo('</tbody>');
  echo('</table>');
  
  echo('<h3>Custom script</h3>');
  echo('<form method="POST" action="">');
  echo('<p>Use this to run a custom script by entering the script id.</p>');
  echo('<input type="hidden" name="scheduled_script" value="manual" />');
  echo('Script id:&nbsp;');
  echo('<input type="text" name="script_id" length="80" />');
  echo('<input type="submit" value="Start" />');
  echo('</form>');
  
  echo('</div>');

  echoFooter();
}

/**
 * Outputs the html header
 *
 * @method echoHeader
 */
function echoHeader()
{
  echo('<html><head>');
  echo('<title>The Mind Gym - Run script</title>');
  echo('<link rel="stylesheet" type="text/css" media="screen" href="https://netsuite.themindgym.com/css/suitelet_layout.css" />');
  
  echo('<style type="text/css"><!--');
  echo('table.script-table { border-collapse: collapse; }');
  echo('table.script-table th.name { width: 300px; }');
  echo('table.script-table th.desc { width: 400px; }');
  echo('table.script-table th { text-align: left; }');
  echo('table.script-table td { vertical-align: top; }');
  echo('table.script-table td, table.script-table th { padding: 6px; border: 1px dotted #cccccc; }');
  echo('//-->');
  echo('</style');
  
  echo('</head>');
}

/**
 * Outputs the html footer
 *
 * @method echoFooter
 */
function echoFooter()
{
  echo('</div>');
  echo('</body></html>');
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
