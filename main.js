var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var jschardet = require('jschardet');
var util = require('util');
var iconvlite = require('iconv-lite');

var options = {
    baseUrl: 'http://www.cnae.ibge.gov.br/',
    url: 'estrutura.asp',
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
    'tabelabusca': 'CNAE_202@CNAE 2.2 - Subclasses@0@cnaefiscal@0',
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

var x = 0;

var saveData = function(item){
  var path = util.format('%s/%s.json', "CNAE", item.subclasse.replace("/", "").replace("-",""));
  fs.writeFileSync(path, iconvlite.encode(JSON.stringify(item), 'UTF-8'));
}

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

                item.atividades.push(capitalize(descricao));
            });

            var subclasseCnae = ({
              secao: item.classe.grupo.divisao.secao.codigo,
              divisao: item.classe.grupo.divisao.codigo,
              grupo: item.classe.grupo.codigo,
              classe: item.classe.codigo,
              subclasse: item.codigo,
              descricao: capitalize(item.descricao),
              atividades: item.atividades,
              compreende: item.compreende,
              compreendeTambem: item.compreendeTambem,
              naoCompreende: item.naoCompreende
            });

            //console.log(subclasseCnae);
            
            x++;
            console.log(x);
            
            //saveData(subclasseCnae);

            // var compreende = $("td[width='95%']").text();
            // console.log($("td[width='95%']"));
            // console.log(item.href);

        }
        else
        {
            
            console.log("error atividades", error);
            
        }
        
//        var stop = new Date().getTime();
//                    while(new Date().getTime() < stop + 1000) {
//                        ;
//                    }
    });

};

var scrapSubclasses = function(item) {
console.log(new Date());
                    
    var stop = new Date().getTime();
    while(new Date().getTime() < stop + 1000) {
                            ;
    }
                    
    request({ url:item.href, encoding: null }, function(error, response, html) {
        if (response.statusCode != 200) {
            html = iconv.decode(html, jschardet.detect(html).encoding);
        console.log("error: ", item.href);
        }
        if(!error) {
            console.log("ok: ", new Date());
            html = iconv.decode(html, jschardet.detect(html).encoding);

            var $ = cheerio.load(html);

            var compreende = $("td[width='95%']").eq(0).text().trim();
            var compreendeTambem = $("td[width='95%']").eq(1).text().trim();
            var naoCompreende = $("td[width='95%']").eq(2).text().trim();



            $("td[width='105']").each(function() {

                var parent = $(this).parent();
                
                var data = parent.children().eq(1).find("a");
                var descricaoEl = parent.children().eq(2);

                var subclasse = {
                    classe: item,
                    codigo: data.text(),
                    descricao: descricaoEl.text().capitalize(),
                    href: options.baseUrl + "pesquisa.asp?TabelaBusca=CNAE_202@CNAE%202.2%20-%20Subclasses@0@cnaefiscal@0&source=subclasse&pesquisa=" + data.text().replace("-","").replace("/",""),
                    compreende: capitalize(compreende),
                    compreendeTambem : capitalize(compreendeTambem),
                    naoCompreende: capitalize(naoCompreende),
                    atividades: []
                };

                // console.log(subclasse);

                item.subclasses.push(subclasse);
                
                scrapAtividades(subclasse);

                // var subclasseCnae = ({
                //   _id: subclasse.codigo,
                //   Secao: item.grupo.divisao.secao.codigo,
                //   Divisao: item.grupo.divisao.codigo,
                //   Grupo: item.grupo.codigo,
                //   Classe: item.codigo,
                //   Subclasse: subclasse.codigo,
                //   Descricao: capitalize(subclasse.descricao)
                // });
            });
        }
        else
        {
            
            console.log("error subclasses", error);
            
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

                    // console.log(classe.grupo.divisao.secao.codigo + " " +
                    //             classe.grupo.divisao.codigo + " " +
                    //             classe.grupo.codigo + " " +
                    //             classe.codigo + " " +
                    //             classe.descricao);
                }
            });
        }
        else
        {
            
            console.log("error classes", error);
            
        }
    });

};

var scrapGrupos = function(item) {
    var stop = new Date().getTime();
    while(new Date().getTime() < stop + 2000) {
                            ;
    }
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

//                     console.log(grupo.divisao.secao.codigo + " " +
//                                 grupo.divisao.codigo + " " +
//                                 grupo.codigo + " " +
//                                 grupo.descricao);
                }
            });
        }
        else
        {
            
            console.log("error grupos", error);
            
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

//                     console.log(divisao.secao.codigo + " " +
//                                 divisao.codigo + " " +
//                                 divisao.descricao);
                }

            });
        }
        else
        {
            
            console.log("error divisoes", error);
            
        }
    });

};

var scrapSecoes = function () {

    // console.log('scrapSecoes');

    options.headers['Content-Length'] = Buffer.byteLength("sourcepage=index&pesquisa=&tabelabusca=CNAE_202%40CNAE+2.2+-+Subclasses%400%40cnaefiscal%400&tipoordenacao=C");

    request.post(options, function(error, response, html) {
        if (response.statusCode != 200) {
        console.log(response.statusCode);
        }
            
        // console.log('return');
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

//                     console.log(secao.codigo + " " +
//                                 secao.descricao);
                }
            });
        }
        else {
          // console.log(request, options, error);
          console.log("error secoes", error);
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

//var time = 60000;
//var stop = new Date().getTime();
//   while(new Date().getTime() < stop + time) {
//       ;
//   }
//
//var readline = require('readline');
//
//var rl = readline.createInterface({
//  input: process.stdin,
//  output: process.stdout
//});
//
//rl.question("What do you think of node.js? ", function(answer) {
//  // TODO: Log the answer in a database
//  console.log("Thank you for your valuable feedback:", answer);
//
//  rl.close();
//});

//function sleep(time, callback) {
//    var stop = new Date().getTime();
//    while(new Date().getTime() < stop + time) {
//        ;
//    }
//    callback();
//}