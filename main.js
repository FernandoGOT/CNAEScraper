var express = require('express');
var fs = require('fs');
var deferred = require('deferred');
var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var jschardet = require("jschardet");
var mongoose = require('mongoose');

var options = {
    baseUrl: 'http://www.cnae.ibge.gov.br/',
    url: 'http://www.cnae.ibge.gov.br/estrutura.asp',
    headers: {
        'Referer': 'http://www.cnae.ibge.gov.br',
        'Origin': 'http://www.cnae.ibge.gov.br',
        'Content-Type': 'html/text; charset=utf-8'
    },
    encoding: null
};

var form = {
    'sourcepage':'index',
    'pesquisa':'',
    'tabelabusca': 'CNAE_201@CNAE 2.1 - Subclasses@0@cnaefiscal@0',
    'tipoordenacao':'C'
};

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
capitalize = function(text) {
    text = text.trim();
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

var secoes = [];

mongoose.connect("mongodb://localhost/tabelas");
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
var Cnae = mongoose.model('Cnae', cnaeSchema);

var scrapAtividades = function(item) {

    request({ url:item.href, encoding: null }, function(error, response, html) {
        if(!error) {

            html = iconv.decode(html, 'windows-1252');

            var $ = cheerio.load(html);
            var i = 0;

            $("td[width='70'][height='16']").each(function() {

                var parent = $(this).parent();

                var data = parent.children().eq(1).find("a");
                var descricao = parent.children().eq(1).text();
                if (descricao.indexOf(";") > 0) {
                    var descricoes = descricao.split(";");
                    descricao = descricoes[1].trim() + " " + descricoes[0].trim();
                }

                i++;

                var atividade = new Cnae({
                    _id: item.codigo + '-' + i,
                    Secao: item.classe.grupo.divisao.secao.codigo,
                    Divisao: item.classe.grupo.divisao.codigo,
                    Grupo: item.classe.grupo.codigo,
                    Classe: item.classe.codigo,
                    Subclasse: item.codigo,
                    Descricao: capitalize(descricao)
                });

                atividade.save(function(err, thor) {
                  if (err) return console.error(err);
                  console.dir(thor._id + " " + thor.Descricao);
                });
            });
        }
    });

};

var scrapSubclasses = function(item) {

    request({ url:item.href, encoding: null }, function(error, response, html) {
        if(!error) {
            html = iconv.decode(html, jschardet.detect(html).encoding);

            var $ = cheerio.load(html);

            $("td[width='105']").each(function() {

                var parent = $(this).parent();

                var data = parent.children().eq(1).find("a");
                var descricaoEl = parent.children().eq(2);

                var subclasse = {
                    classe: item,
                    codigo: data.text(),
                    descricao: descricaoEl.text().capitalize(),
                    href: options.baseUrl + "pesquisa.asp?TabelaBusca=CNAE_201@CNAE%202.1%20-%20Subclasses@0@cnaefiscal@0&source=subclasse&pesquisa=" + data.text().replace("-","").replace("/",""),
                    atividades: []
                };

                item.subclasses.push(subclasse);
                scrapAtividades(subclasse);
            });
        }
    });

};

var scrapClasses = function(item) {

    request({ url:item.href, encoding: null }, function(error, response, html) {
        if(!error) {
            html = iconv.decode(html, jschardet.detect(html).encoding);

            var $ = cheerio.load(html);

            $("td[width='100']").each(function() {

                var parent = $(this).parent();

                var data = parent.children().eq(1).find("a");
                var descricaoEl = parent.children().eq(2);

                var ccodigo = data.text();
                ccodigo = ccodigo.substr(1, 2) + '.' + ccodigo.substr(2,4);

                var classe = {
                    grupo: item,
                    codigo: ccodigo,
                    descricao: descricaoEl.text().capitalize(),
                    href: options.baseUrl + data.attr("href"),
                    subclasses: []
                };

                if (classe.codigo.length == 7) {
                    item.classes.push(classe);
                    scrapSubclasses(classe);

                    /*console.log(classe.grupo.divisao.secao.codigo + " " +
                                classe.grupo.divisao.codigo + " " +
                                classe.grupo.codigo + " " +
                                classe.codigo + " " +
                                classe.descricao);*/
                }
            });
        }
    });

};

var scrapGrupos = function(item) {

    request({ url:item.href, encoding: null }, function(error, response, html) {
        if(!error) {
            html = iconv.decode(html, jschardet.detect(html).encoding);

            var $ = cheerio.load(html);

            $("td[width='105']").each(function() {

                var parent = $(this).parent();

                var data = parent.children().eq(1).find("a");
                var descricaoEl = parent.children().eq(2);

                var grupo = {
                    divisao: item,
                    codigo: data.text(),
                    descricao: descricaoEl.text().capitalize(),
                    href: options.baseUrl + data.attr("href"),
                    classes: []
                };

                if (grupo.codigo.length == 3) {
                    item.grupos.push(grupo);
                    scrapClasses(grupo);

                    /*console.log(grupo.divisao.secao.codigo + " " +
                                grupo.divisao.codigo + " " +
                                grupo.codigo + " " +
                                grupo.descricao);*/
                }
            });
        }
    });

};

var scrapDivisoes = function(item) {

    request({ url:item.href, encoding: null }, function(error, response, html) {
        if(!error) {
            html = iconv.decode(html, jschardet.detect(html).encoding);

            var $ = cheerio.load(html);

            $("td[width='105']").each(function() {

                var parent = $(this).parent();

                var data = parent.children().eq(1).find("a");
                var descricaoEl = parent.children().eq(2);

                var divisao = {
                    secao: item,
                    codigo: data.text(),
                    descricao: descricaoEl.text().capitalize(),
                    href: options.baseUrl + data.attr("href"),
                    grupos: []
                };

                if (divisao.codigo.length == 2) {
                    item.divisoes.push(divisao);
                    scrapGrupos(divisao);

                    /*console.log(divisao.secao.codigo + " " +
                                divisao.codigo + " " +
                                divisao.descricao);*/
                }

            });
        }
    });

};

var scrapSecoes = function () {

    request.post(options, function(error, response, html){
        if(!error) {
            html = iconv.decode(html, jschardet.detect(html).encoding);

            var $ = cheerio.load(html);

            $("tr").each(function() {

                var data = $(this).children().first().find("a");
                var descricaoElement = $(this).children().eq(2);

                var secao = {
                    codigo: data.text(),
                    descricao: descricaoElement.text().capitalize(),
                    href: options.baseUrl + data.attr("href"),
                    divisoes: []
                };

                if (secao.codigo.length == 1) {
                    secoes.push(secao);
                    scrapDivisoes(secao);

                    /*console.log(secao.codigo + " " +
                                secao.descricao);*/
                }
            });
        }
    }).form(form);

};


scrapSecoes();



    // To write to the system we will use the built in 'fs' library.
    // In this example we will pass 3 parameters to the writeFile function
    // Parameter 1 :  output.json - this is what the created filename will be called
    // Parameter 2 :  JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make our JSON easier to read
    // Parameter 3 :  callback function - a callback function to let us know the status of our function
/*
    fs.writeFile('output.json', JSON.stringify(json, null, 4), function(err){

        console.log('File successfully written! - Check your project directory for the output.json file');

    })
*/
    // Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.
    //res.send('Check your console!')

//exports = module.exports = app;