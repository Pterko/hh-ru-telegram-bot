/**
 * Created by Pter on 12.04.2016.
 */

var hh = require('./hhApi');

//hh.getAccessTokenByCode("S8V6A57IJ2BFUISBS22EEQ18ATNEQMU63VQN08SGH0G2O1NJDNFQJPL1ELGGS93S",function(err,json){
//    console.log(err);
//    console.log(json);
//});

hh.getMyResumes("TMLK78R727MHKJP6JODLPTSEPNBRBB9BVVH1292686K0OVOPRBNLM3QAMV6O2RDR",function(err,json){
    console.log(err);
    console.log(json.items);
})

