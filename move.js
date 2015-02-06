var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var jschardet = require("jschardet");
var mongoose = require('mongoose');

mongoose.connect("mongodb://localhost/tabela");
var cnaeSchema = new mongoose.Schema({
    _id: String,
    Secao: String,
    Divisao: Number,
    Grupo: Number,
    Classe: String,
    Subclasse: String,
    Descricao: String
}, {
    collection: "Tabela_Cnae",
    versionKey: false
});

var cnaeOldSchema = new mongoose.Schema({
    _id: String,
    Secao: String,
    Divisao: Number,
    Grupo: Number,
    Classe: String,
    Subclasse: String,
    Descricao: String
}, {
    collection: "Tabela_Cnae_copy",
    versionKey: false
});

var Cnae = mongoose.model('Cnae', cnaeSchema);
var CnaeCopy = mongoose.model('CnaeOld', cnaeOldSchema);

var count = 0;

CnaeCopy.find({ _id: /\d{4}-\d\/\d{2}$/ }, function (err, docs) {
	if (err) console.log(err);
	docs.forEach(function(item) {
		Cnae.findOne({ _id: item._id }, function (err, itemOne) {
			if (item.Descricao != itemOne.Descricao) {
				itemOne.Descricao = item.Descricao;
				itemOne.save(function(err, thor) {
                  if (err) return console.error(err);
                });
				console.log(item.Descricao + " " + itemOne.Descricao);
			}
		});
	});
});

console.log('end');
