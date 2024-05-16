/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/log", "N/sftp"], function (log, sftp)
{

    /**
     * Suitelet to create a Sales Order in NetSuite
     */
    function onRequest(context)
    {
        var prodHostKey  = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQCU45aP5tj1ACzA5+bWtouckYt6q9LEN1Jl1UhRl+1MOCkQChSyZX+p02lM1R4Djm1lP5OyBYPqQxbYzyN+HHDnNq8sWH33BWrfIcuLDuy6q1qnePdv6i1xFyYT6HfIZT2PskAltwSIjHKhVaVVCYs+FEc6p6kzFiQRPrIUr4VtV8LaBzmzPfshRBNgFEHjlxb+T4obeErkmx9la6A8kmWjQAyhviqn+tvPtbY7YTP4FljllVsmMHEAoYbt0eKDXqMnwEhCj6wSsaDFXDGS+9J4Tjx3yjLCmmhIzazAPAsftKhYgA7ZKole53C0vciM9cpUgowVuZ1F1DSlmAh+aoG5';
        try{
            var connection = sftp.createConnection({
                username: 'a1fug2i3', //v6g1nl3l
                passwordGuid: '2e41539c890e4660a89cb4ac7ffcc1f1',//'bbfc228190bc42dbbbe18335c1597848',//'906df5c125134d659b4447ce47a682ec', // 5880485058ec4836b3befbe694dbe8cc // tee1nee9173#
                url: 'safetrans.wellsfargo.com',
                hostKey: prodHostKey,
                directory: '/',
                port: 22,
                hostKeyType: "rsa"
            });
            log.debug('execute','SFTP Connection established successfully! MaxTimeOutLimit:'+connection.MAX_TRANSFER_TIMEOUT +',MaxFileSizeLimit: '+connection.MAX_FILE_SIZE);
        }
        catch(ex)
        {
            log.error('SFTP Error', 'Unable to establish connection: '+ex);
        }
    }


    return {
        onRequest: onRequest
    }
});
