
var apiKey = '44PIEUWZ59SS4GD3DKCFLL71O';
var apiSecret = 'n9oUMTSBrcpHCDjBrgSdvbUaAEjw0lNEM1UcjRyDaXo';

//PROD Header
var PBASE64ACCESS = nlapiEncrypt(apiKey+':'+apiSecret, 'base64');
//HEader Encryption Value
PBASE64ACCESS = 'NjU3M1M0NEI2RkI5UTk2NUVISkJBNUU3TTpkQ09wdVpFRVFmWUNHYVpiS3Q2U255YWVyUGhONytWVXJoSWVkVm9ZVE1B';
var pheaders = {};
pheaders['CAN-RefreshToken'] = PBASE64ACCESS;
pheaders['Accepts'] = 'application/json';
alert(JSON.stringify(pheaders));

var getRefreshTokenUrl = 'https://devconnect.lrsus.com/rest/v3/oauth/token';

var altUrl = 'https://devconnect-lrsus.rhcloud.com/';

var nginxUrl = 'https://rest.lrsus.com/rest/v3/oauth/token';

//Request 20 min access token
var refres = nlapiRequestURL(nginxUrl, null, pheaders,null,'GET');

alert(refres);