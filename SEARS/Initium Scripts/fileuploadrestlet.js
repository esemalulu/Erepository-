//The restlet that will need to be uploaded to NetSuite for the gulp plugin to run.

function writeFile (data) {
  var files = nlapiSearchRecord('file', null, [new nlobjSearchFilter('name', null, 'is', data.name)], [new nlobjSearchColumn('folder')]) || [];

  var newFileNumber;

  var path = data.path.split(/[\/\\]/);

  //Remove filename
  path.pop();

  var folder;

  var file = nlapiCreateFile(data.name, 'PLAINTEXT', data.content);
  if(files.length === 1) {
    folder = files[0].getValue('folder');

    //Otherwise if the uploaded path is more than just filename
  } else if(path.length > 0 && files.length > 1) {

    var folderName = path.pop();

    for(var i = 0; i < files.length; i++) {
      if(files[i].getText('folder') === folderName) {
        folder = files[i].getValue('folder');
      }
    }
  }

  file.setFolder(folder);
  newFileNumber = nlapiSubmitFile(file);

  nlapiLogExecution('DEBUG', 'uploaded', data.path.toString());
  return newFileNumber;
}
