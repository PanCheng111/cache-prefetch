'use strict';

const {app, BrowserWindow, ipcMain, globalShortcut, clipboard} = require('electron');

const path = require('path');
const url = require('url');
// const db = require('./mongohandler');
const db = require('./nehandler');
const fs = require("fs");  
const child = require('child_process');
const parser = require('node-c-parser');

let mainWindow = null;
let snipWindow = null;
let analysisWindow = null;
let loadingWindow = null;

let currentInfo = null;

app.on('ready', function () {
    const screen = require('electron').screen;
    registerShortcut();
    const {width, height} = screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow({width, height});

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public_static', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    //mainWindow.webContents.openDevTools()

    require('./menu')
});

function registerShortcut() {
    const ret = globalShortcut.register('CommandOrControl+N', () => {
        newSnip();
    });

    if (!ret) {
        console.log('registration failed')
    }

    // Check whether a shortcut is registered.
    console.log(globalShortcut.isRegistered('CommandOrControl+N'))

}

function newSnip() {
    snipWindow = new BrowserWindow({
        height: 578,
        width: 800,
        frame: false,

    });

    snipWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public_static', 'snip.html'),
        protocol: 'file:',
        slashes: true
    }));
}

function newAnalysis(data) {
    analysisWindow = new BrowserWindow({
        height: 578,
        width: 800,
        frame: true,

    });
    
    currentInfo = data;

    analysisWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public_static', 'analysis.html'),
        protocol: 'file:',
        slashes: true
    }));
    //analysisWindow.webContents.openDevTools();
}


function sendAllSnips() {
    db.allSnips(function (snips) {
        let result = [];
        for (let i = 0; i < snips.length; i++) {
            result.push({
                title: snips[i].title,
                language: snips[i].language,
                id: snips[i]._id.toString(),
                code: snips[i].code
            })
        }
        mainWindow.webContents.send('all-snips', result);
    })
}

function checkAnalysis(snipId) {
    db.searchAnalysis(snipId, function(result) {
        if (result != null) mainWindow.webContents.send("analysis-done", snipId);
    })
}
function addAnalysis(snipId, info) {
    db.insertAnalysis({
        snipId: snipId,
        info: info
    }, function() {
        console.log("analysis-done, snipId=" + snipId);
        mainWindow.webContents.send("analysis-done", snipId);
    });
}

function parse_statistics(snipId, filename) {
    var data=fs.readFileSync(filename,"utf-8");  
    var lines=data.split("\n");
    var line_cnt = 0;
    var DLmwIndex = 0;
    var info = {}; 
    info.functionInfo = [];
    info.linesInfo = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.indexOf("---------") != -1) line_cnt ++;
        else {
            let tokens = line.split(/\s+/);
            switch (line_cnt) {
                case 1:
                    if (tokens[0] == "I1") info.I1Cache = tokens.slice(2).join("");
                    if (tokens[0] == "D1") info.D1Cache = tokens.slice(2).join("");
                    if (tokens[0] == "LL") info.LLCache = tokens.slice(2).join("");
                    break;
                case 3:
                    if (tokens.length > 8) {
                        info.Ir = tokens[0];
                        info.I1mr = tokens[1];
                        info.ILmr = tokens[2];
                        info.Dr = tokens[3];
                        info.D1mr = tokens[4];
                        info.DLmr = tokens[5];
                        info.Dw = tokens[6];
                        info.D1mw = tokens[7];
                        info.DLmw = tokens[8];
                    }
                    break;
                case 5:
                    if (tokens.length > 8) {
                        let item = {};let index = 0;
                        if (tokens[0] == "") index = 1;
                        item.Ir = tokens[index];
                        item.I1mr = tokens[index + 1];
                        item.ILmr = tokens[index + 2];
                        item.Dr = tokens[index + 3];
                        item.D1mr = tokens[index + 4];
                        item.DLmr = tokens[index + 5];
                        item.Dw = tokens[index + 6];
                        item.D1mw = tokens[index + 7];
                        item.DLmw = tokens[index + 8];
                        item.functionName = tokens.slice(index + 9).join("");
                        info.functionInfo.push(item);
                    }
                    break;
                case 7:
                    if (tokens.length > 8) {
                        if (tokens[0] == "Ir" || tokens[1] == "Ir") {
                            DLmwIndex = line.indexOf("DLmw") + 6;
                            break;
                        }
                        let item = {}; let index = 0;
                        if (tokens[0] == "") index = 1;
                        item.Ir = tokens[index];
                        item.I1mr = tokens[index + 1];
                        item.ILmr = tokens[index + 2];
                        item.Dr = tokens[index + 3];
                        item.D1mr = tokens[index + 4];
                        item.DLmr = tokens[index + 5];
                        item.Dw = tokens[index + 6];
                        item.D1mw = tokens[index + 7];
                        item.DLmw = tokens[index + 8];
                        item.context = line.slice(DLmwIndex);
                        info.linesInfo.push(item);
                    }
                    break;
            }
        }
    }
    //console.log(JSON.stringify(info));
    addAnalysis(snipId, info);

}
function run_cachegrind(snipId, snipName) {
    let execName = snipName.split('.')[0];
    loadingWindow = new BrowserWindow({
        height: 578 * 0.5,
        width: 800 * 0.5,
        frame: false,
    });

    loadingWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'public_static', 'loading.html'),
        protocol: 'file:',
        slashes: true
    }));

    child.exec(`gcc ${snipName} -o ${execName} -g`, function(err, stdout, stderr) {
        if (err) {
            console.log('compile error\n');
        }
        else {
            console.log("compile success.\n");
            child.exec(`valgrind --tool=cachegrind --cachegrind-out-file=cachegrind_${execName}.txt ./${execName}`, function(err, stdout, stderr) {
                if (err) {
                    console.log("cachegrind err: " + err);
                }
                else {
                    console.log("cachegrind success !\n");
                    child.exec(`cg_annotate cachegrind_${execName}.txt $PWD/${snipName} > cachegrind_${execName}.out`, function(err, stdout, stderr) {
                        if (err) {
                            console.log('cg_annotate error!\n');
                        }
                        else {
                            console.log('cg_annotate success!\n');
                            loadingWindow.close();
                            parse_statistics(snipId, `cachegrind_${execName}.out`);
                        }
                    });
                    
                }
            });
        }
    })
    
}

function dfs_walk(cur) {
    //console.log(cur);
    if (cur.children == undefined) {
        return;
    }
    if (cur.title == "primary_expr") {
        console.log("primary_expr: " + JSON.stringify(cur.children));
        return;
    }
    for (let i = 0; i < cur.children.length; i++) {
        dfs_walk(cur.children[i]);
    }
}

function find_prefetch(ast, snipId, snipName) {
    db.searchAnalysis(snipId, function(data) {
        let info = data.info;
        //console.log(JSON.stringify(info));
        let functionInfo = info.functionInfo;
        let mostImportFunction = functionInfo[0];
        let functionName = mostImportFunction.functionName.split(/:|\(/)[1];
        console.log("most import function: " + functionName);
        let astFunctionList = ast.children;
        console.log("ast function list length = " + astFunctionList.length);

        for (let i = 0; i < astFunctionList.length; i++) {
            let node = astFunctionList[i].children[0].children[1];
            if (i > 0) node = astFunctionList[i].children[0].children[0].children[1];
            console.log("cur node = " + node.title + ", func_name = " + node.children[0].children[0].lexeme);
            if (node.children[0].children[0].lexeme == functionName) {
                node = astFunctionList[i].children[0].children[2];
                if (i > 0) node = astFunctionList[i].children[0].children[0].children[2];
                dfs_walk(node);
            }
        }

        let lineData = fs.readFileSync(snipName, 'utf-8');
        let lines = lineData.split("\n");
        let ret = "";
        for (let i = 0; i < lines.length; i++) {
            let context = lines[i];
            if (context == undefined) continue;
            if (context.indexOf("if(array[mid] < key)") != -1) {
                let space_cnt = context.indexOf("if(array[mid] < key)");
                let space = "";
                for (let j = 0; j < space_cnt; j++) space += " ";
                ret += space + "//#ifdef DO_PREFETCH\n";
                ret += space + "__builtin_prefetch (&array[(mid + 1 + high)/2], 0, 1);\n"
                ret += space + "__builtin_prefetch (&array[(low + mid - 1)/2], 0, 1);\n"
                ret += space + "//#endif\n"
            }
            ret += context + "\n";
        }
        let saveName = snipName.split('.')[0] + "_pref.cpp";
        fs.writeFileSync(saveName, ret);
        let snip = {
            title: saveName,
            language: "C/C++",
            code: ret
        }
        db.searchSnip(saveName, function(data) {
            console.log(JSON.stringify(data));
            if (data.length > 0) {
                db.updateSnip(data[0]._id, {
                    title: snip.title,
                    language: snip.language,
                    code: snip.code
                }, function () {
                    sendAllSnips();
                });
            }
            else {
                db.insertSnip(snip, function () {
                    sendAllSnips();
                    // if (snipWindow) {
                    //     snipWindow.close();
                    // }
                })
            }
        });

    })
}

function run_prune(snipId, snipName) {
    parser.lexer.cppUnit.clearPreprocessors(snipName, function(err, codeText) {
       if (err) {
           console.log("Error occured during preprocessor removal.\n" + err);
       }
       else {
            let tokens = parser.lexer.lexUnit.tokenize(codeText);
            let tree = parser.parse(tokens);
            console.log("parse AST success!");
            find_prefetch(tree, snipId, snipName);
       }
    });
}

/* IPC's */

ipcMain.on('new-snip', function (event, arg) {
   newSnip();
});

ipcMain.on('get-snips', function () {
    sendAllSnips()
});

ipcMain.on('delete-snip', function (event, arg) {
    db.deleteSnip(arg, function () {
        sendAllSnips()
    })
});


ipcMain.on('edit-snip', function (event, arg) {
    db.findSnip(arg, function (result) {
        editSnip(result)
    })
});

ipcMain.on('close-snip-win', function (event, arg) {
    if (snipWindow) {
        snipWindow.close();
    }
});

ipcMain.on('new-snip-add', function (event, arg) {

    let snip = JSON.parse(arg);

    fs.writeFileSync(snip.title, snip.code);

    if (snip.id) {
        db.updateSnip(snip.id, {
            title: snip.title,
            language: snip.language,
            code: snip.code
        }, function () {
            sendAllSnips();
        });
    }
    else {
        db.insertSnip(snip, function () {
            sendAllSnips();
            if (snipWindow) {
                snipWindow.close();
            }
        })
    }
});

ipcMain.on('copy-to-clip', function (event, code) {
    clipboard.writeText(code);
});

ipcMain.on('search-snip', function (event, arg) {
    db.searchSnip(arg,function (result) {
        mainWindow.webContents.send('all-snips', result);
    })
})

ipcMain.on('check-analysis', function(event, snipId) {
    checkAnalysis(snipId);
});

ipcMain.on('run-analysis', function(event, snipId, snipName) {
    run_cachegrind(snipId, snipName);
});

ipcMain.on('show-analysis', function(event, snipId) {
    console.log("show-analysis, snipId=" + snipId);
    db.searchAnalysis(snipId, function(data) {
        let info = data.info;
        //console.log(JSON.stringify(info));
        newAnalysis(info);
    })
});

ipcMain.on('get-analysis-data', function(event) {
    analysisWindow.webContents.send('put-analysis-data', currentInfo);
});

ipcMain.on('run-prune', function(event, snipId, snipName) {
    run_prune(snipId, snipName);
});

module.exports = {sendAllSnips, newSnip}

