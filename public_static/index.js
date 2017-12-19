/**
 * Created by piyush0 on 22/05/17.
 */

const {ipcRenderer} = require('electron');

const MAX_DISPLAY_SIZE = 50;

let deleteReadySnipId = null;
let editReadySnip = null;
let modalTitle = null;
let modalLanguage = null;
let modalCode = null;
let codes = [];
let editBlock = '<td> <p data-placement="top" data-toggle="tooltip" title="Edit"><button onclick="readyToEdit(this)" class="btn btn-primary btn-xs" data-title="Edit" data-toggle="modal"data-target="#edit"><span class="glyphicon glyphicon-pencil"></span></button></p></td> ';
let deleteBlock = '<td> <p data-placement="top" data-toggle="tooltip" title="Delete"><button onclick="readyToDelete(this)" class="btn btn-danger btn-xs" data-title="Delete" data-toggle="modal"data-target="#delete"><span class="glyphicon glyphicon-trash"></span></button> </p> </td>';
let copyBlock = '<td> <p data-placement="top"<button onclick="runAnalysis(this)" class="btn btn-primary btn-xs" data-title="Copy"><span class="glyphicon glyphicon-play"></span></button></p> </td> '
let _viewBlock = '<td> <p data-placement="top"<button onclick="viewAnalysis(this)" class="btn btn-primary btn-xs disabled" data-title="Copy"><span class="glyphicon glyphicon-copy"></span></button></p> </td> '
let viewBlock = '<p data-placement="top"<button onclick="viewAnalysis(this)" class="btn btn-primary btn-xs" data-title="Copy"><span class="glyphicon glyphicon-copy"></span></button></p> '
let pruneBlock = '<td> <p data-placement="top"<button onclick="runPrune(this)" class="btn btn-primary btn-xs" data-title="Copy"><span class="glyphicon glyphicon-copy"></span></button></p> </td> '
window.onload = function () {
    ipcRenderer.send('get-snips');
};

function htmlEscape(text){  
    return text.replace(/[ <>"&]/g, function(match, pos, orginalText){  
        switch(match){  
            case " ":
                return "&nbsp";
            case "<":  
                return "&lt";  
            case ">":  
                return "&gt";  
            case "&":  
                return "&amp";  
            case "\"":  
                return "&quot";  
        }  
    })  
}  

ipcRenderer.on('all-snips', function (event, data) {
    const table = document.getElementById("tablebody");
    const searchBox = document.getElementById("srch-term");
    searchBox.oninput = search
    table.innerHTML = "";

    for (let i = 0; i < data.length; i++) {
        codes[i] = data[i].code;
        if (data[i].code.length > MAX_DISPLAY_SIZE) {
            data[i].code = data[i].code.substring(0, MAX_DISPLAY_SIZE);
            data[i].code += " and More... "
        }

        table.innerHTML += "<tr id=" + data[i].id + ">" +
            "<td>" + data[i].title + "</td>" +
            "<td>" + data[i].language + "</td>" +
            "<td id=" + i + '>' + "<pre>" + htmlEscape(data[i].code) + "</pre>" + "</td>" + editBlock + deleteBlock + copyBlock + _viewBlock + pruneBlock + "</tr>"
    }
    for (let i = 0; i < data.length; i++) {
        ipcRenderer.send('check-analysis', data[i].id);
    }
});

ipcRenderer.on('analysis-done', function(event, snipId) {
    let element = document.getElementById(snipId);
    element.removeChild(element.lastElementChild.previousElementSibling);
    let tmp = document.createElement('td');
    tmp.innerHTML = viewBlock;
    //element.appendChild(tmp);
    element.insertBefore(tmp, element.lastElementChild);
});

function search(event) {
    ipcRenderer.send('search-snip', event.srcElement.value);
}

function copyToClip(element) {
    element = element.parentNode.parentNode;
    let code = codes[element.firstChild.nextSibling.nextSibling.id];
    ipcRenderer.send('copy-to-clip', code);
}

function runAnalysis(element) {
    element = element.parentNode.parentNode;
    ipcRenderer.send('run-analysis', element.id, element.firstChild.innerHTML);
}

function viewAnalysis(element) {
    element = element.parentNode.parentNode;
    ipcRenderer.send('show-analysis', element.id);
}

function runPrune(element) {
    element = element.parentNode.parentNode;
    ipcRenderer.send('run-prune', element.id, element.firstChild.innerHTML);
}

function readyToDelete(element) {
    element = element.parentNode.parentNode.parentNode;
    deleteReadySnipId = element.id;
}

function readyToEdit(element) {
    element = element.parentNode.parentNode.parentNode;

    editReadySnip = {
        id: element.id,
        title: element.firstChild.innerHTML,
        language: element.firstChild.nextSibling.innerHTML,
        code: codes[element.firstChild.nextSibling.nextSibling.id]
    };


    modalTitle = document.getElementById("title");
    modalLanguage = document.getElementById("language");
    modalCode = ace.edit("editor");

    modalTitle.setAttribute("value", editReadySnip.title);
    modalLanguage.setAttribute("value", editReadySnip.language);
    modalCode.setValue(editReadySnip.code);
}

function editSnip() {
    const snip = {
        "id": editReadySnip.id,
        "title": modalTitle.value,
        "language": modalLanguage.value,
        "code": modalCode.getValue()
    };

    ipcRenderer.send('new-snip-add', JSON.stringify(snip))
}

function deleteSnip() {
    ipcRenderer.send('delete-snip', deleteReadySnipId);
}

function newSnip() {
    ipcRenderer.send('new-snip');
}