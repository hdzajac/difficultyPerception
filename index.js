var express = require("express");
var app     = express();
var path    = require("path");


app.use(express.static(__dirname + '/resources'));

app.get('/',function(req,res){
    res.sendFile(path.join(__dirname+'/index.html'));
    //__dirname : It will resolve to your project folder.
});

app.get('/form',function(req,res){
    res.sendFile(path.join(__dirname+'/pages/form.html'));
    //__dirname : It will resolve to your project folder.
});

app.get('/game',function(req,res){
    res.sendFile(path.join(__dirname+'/pages/game.html'));
    //__dirname : It will resolve to your project folder.
});

app.get('/question',function(req,res){
    res.sendFile(path.join(__dirname+'/pages/question.html'));
    //__dirname : It will resolve to your project folder.
});

app.get('/finish',function(req,res){
    res.sendFile(path.join(__dirname+'/pages/finish.html'));
    //__dirname : It will resolve to your project folder.
});


app.listen(3000);

console.log("Running at Port 3000");