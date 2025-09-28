MLjson = [];
let currentEditIndex = null;
let tempTags = [];
let statusTimeout;


function setStatus(msg, type) {
    var r = document.querySelector(':root');
    if (type == 'a') {
        r.style.setProperty('--color01', 'rgba(15, 35, 3, 0.9)');
        r.style.setProperty('--color02', 'rgb(104, 184, 57)');
    } else if (type == 'b') {
        r.style.setProperty('--color01', 'rgba(32, 2, 2, 0.9)');
        r.style.setProperty('--color02', 'rgba(179, 28, 28, 1)');
    } else if (type == 'c') {
        r.style.setProperty('--color01', 'rgba(33, 32, 36, 0.9)');
        r.style.setProperty('--color02', 'rgba(159, 154, 174, 1)');
    }

    const status = document.getElementById("status");
    document.getElementById("statustext").textContent = '• '+msg;
    console.log(msg);
    status.classList.remove("status-hide", "status-visible");
    void status.offsetWidth;
    status.classList.add("status-visible");

    if (statusTimeout) clearTimeout(statusTimeout);

    statusTimeout = setTimeout(() => {
        status.classList.remove("status-visible");
        status.classList.add("status-hide");
    }, 6000);
}


async function updateTags(){
    for (let i=0; i<MLjson.length; i++){
        for (let e=0; e<MLjson[i].tags.length ; e++){
            MLjson[i].tags[e].checked = document.getElementById(MLjson[i].id_workshop+":"+e).checked;
        }
    }
    console.log("tags updated!")
}

async function displayMods(){
    let MLdisplay = "";
    for (let i=0; i<MLjson.length; i++){
        let MLTags = "";
        for (let e=0; e<MLjson[i].tags.length ; e++){
            MLTags +=`
                <div class="cbx">
                    <input type="checkbox" id="${MLjson[i].id_workshop+":"+e}" name="interest" value="${MLjson[i].id_workshop+":"+e}" ${MLjson[i].tags[e].checked ? "checked":""}/>
                    <label class="lbl_modcard-element" for="${MLjson[i].id_workshop+":"+e}">${MLjson[i].tags[e].type}: ${MLjson[i].tags[e].name}</label>
                 </div>
            `
        }
        MLdisplay +=`
            <div class="card_modcard">
                <img src="${MLjson[i].preview}" alt="${MLjson[i].name}" class="img_modcard" />
                <button class="btn_edittags" title="Edit tags" onclick="openTagsEditor(${i})"><svg width="10px" height="10px"><use href="#ico_left"></use></svg></button>
                <p class="lbl_modcard-title" >${MLjson[i].name}</p>
                <p class="lbl_modcard-element" >Workshop ID: ${MLjson[i].id_workshop}</p>
                <div class="card_modcard-cbx">
                    ${MLTags}
                </div>
                <div class="card_modcard_buttons">
                    <button class="btn_modcard" title="Move left" onclick="moveMod(${MLjson[i].id_workshop}, -1)"><svg width="30px" height="30px"><use href="#ico_left"></use></svg></button>
                    <button class="btn_modcard" title="Open Steam page" onclick="window.open('${MLjson[i].link}', '_blank')"><svg width="30px" height="30px"><use href="#ico_steam"></use></svg></button>
                    <button class="btn_modcard" title="Delete mod" onclick="deleteMod(${MLjson[i].id_workshop})" ><svg width="30px" height="30px"><use href="#ico_delete"></use></svg></button>
                    <button class="btn_modcard" title="Add next to this mod" onClick="addMod('addNext', ${MLjson[i].id_workshop})"><svg width="30px" height="30px"><use href="#ico_next"></use></svg></button>
                    <button class="btn_modcard" title="Move right" onclick="moveMod(${MLjson[i].id_workshop}, 1)"><svg width="30px" height="30px"><use href="#ico_right"></use></svg></button>
                </div>
            </div>
        `;

        
    }
    console.log("Mods displayed succesfully")
    document.getElementById("modlistcontent").innerHTML = MLdisplay;
    
    for (let i = 0; i < MLjson.length; i++) {
        for (let e = 0; e < MLjson[i].tags.length; e++) {
            const cb = document.getElementById(`${MLjson[i].id_workshop}:${e}`);
            if (cb) {
                cb.onchange = function () {
                    updateTags();
                    saveToLocalStorage();
                };
            }
        }
    }
    
}

async function addMod(action, actid) {
    id = "";
    if (action == 'readActID'){
        id = actid
    } else { id = document.getElementById("workshopId").value.trim(); }
    console.log("id: "+id)
    if (!/^\d+$/.test(id)) {
        setStatus("Error: Enter a valid Workshop ID.", 'b');
        return;
    } else if (MLjson.some(item => item.id_workshop === id)){
        setStatus("Error: This mod is already in the list.", 'b');
        return;
    }

    const modget = await getWorkshopDetails(id);
    if (!modget) return;
    if (modget.consumer_app_id != "108600"){
        setStatus("Error: This mod is not for Project Zomboid", 'b');
        return;
    }

    let desc = modget.description || modget.file_description || "...";
    let regex = /(mod\s*id|map\s*folder)\s*[:=]\s*([^\n\r,;]+)/gi;
    let matches = [...desc.matchAll(regex)];
    let mods = [];
    let maps = [];

    for (let match of matches) {
        let type = match[1].toLowerCase().includes("mod") ? "Mod" : "Map";
        let name = match[2].trim();

        if (type === "Mod") {
            mods.push({ 'name': name, 'type': type+' ID', 'checked' : true});
        } else {
            maps.push({ 'name': name, 'type': type+' Folder', 'checked' : true});
        }
    }
    let tags = [...mods, ...maps];

    const newEntry = {
        'id_workshop': id,
        'name': modget.title,
        'link': `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`,
        'preview' : modget.preview_url,
        'tags': tags,
    }
    if (action == 'addNext') {
        const index = MLjson.findIndex(mod => mod.id_workshop === actid.toString().trim());
        if (index !== -1) {
            MLjson.splice(index + 1, 0, newEntry);
        }
    } else { MLjson.push(newEntry); }
    
    if (action != 'readActID') { setStatus("Mod added successfuly!", 'a'); }
    
    

    updateTags();  
    displayMods();
    saveToLocalStorage();
}



async function getWorkshopDetails(idRaw){
    console.log("Consultando Steam API...");
    try {
        const body = new URLSearchParams();
        body.append("itemcount", "1");
        body.append("publishedfileids[0]", idRaw);
        
        const proxy = "https://cors-anywhere.herokuapp.com/"; // CORS Anywhere
        const url = proxy + "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/"; // Steam API - Workshop

        const res = await fetch(url, { method: "POST", body });
        const data = await res.json();
        const d = data?.response?.publishedfiledetails?.[0];
        if (!d || d.result !== 1) throw new Error("Invalid or private ID");

        
        return d;
    } catch (err) {
        console.error(err);
        setStatus("Error: " + err.message, 'b');
        onclick=window.open("https://cors-anywhere.herokuapp.com/corsdemo");

    }
}

async function getCollectionWorkshopIDs(collectionId) {
    setStatus("Consultando Steam API para la colección...",'c');
    try {
        const body = new URLSearchParams();
        body.append("collectioncount", "1");
        body.append("publishedfileids[0]", collectionId);

        const proxy = "https://cors-anywhere.herokuapp.com/";
        const url = proxy + "https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/";

        const res = await fetch(url, { method: "POST", body });
        const data = await res.json();
        const collection = data?.response?.collectiondetails?.[0];

        if (!collection || collection.result != 1) throw new Error("Invalid or private collection ID");

        if (!Array.isArray(collection.children)) {
            setStatus("No children found in collection.", 'b');
            return [];
        }

        const workshopIDs = collection.children
            .filter(child => child.filetype == 0)
            .map(child => child.publishedfileid);

        return workshopIDs;
    } catch (err) {
        console.error(err);
        setStatus("Error: " + err.message, 'b');
        window.open("https://cors-anywhere.herokuapp.com/corsdemo");
        return [];
    }
}


function deleteMod(id) {
    console.log( id.toString() );
    const index = MLjson.findIndex(mod => mod.id_workshop === id.toString());
    if (index !== -1) {
        MLjson.splice(index, 1);
    }
    updateTags();  
    displayMods();
    saveToLocalStorage();
}

function moveMod(id, direction) {
    const index = MLjson.findIndex(mod => mod.id_workshop === id.toString());
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= MLjson.length) return;

    const [mod] = MLjson.splice(index, 1);
    MLjson.splice(newIndex, 0, mod);

    updateTags();  
    displayMods();
    saveToLocalStorage();
}


function importJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.style.display = "none";


    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);

    input.onchange = () => {
        const archivo = input.files[0];
        if (!archivo) return;
        const lector = new FileReader();
        lector.onload = (e) => {
            try {
                MLjson = JSON.parse(e.target.result);
                console.log("Loading Json:", MLjson);
                saveToLocalStorage();
                displayMods();
            } catch (err) {
            setStatus("Error parsing Json:"+ err, 'b');
                return;
            }
        };
        lector.readAsText(archivo);
        setStatus("Json loaded successfuly!", 'a')
    };

}

function exportJson() {
    updateTags();
    const jsonString = JSON.stringify(MLjson, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Project Zomboid Modlist.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus("Json exported successfuly!", 'a');
}

function copyWorkshopID() {
    clipboard = "";
    for (let i=0; i<MLjson.length; i++){
        clipboard += MLjson[i].id_workshop + "; ";
    }
    navigator.clipboard.writeText(clipboard);
    setStatus("Workshop IDs copied to clipboard", 'a')
}

function copyModID() {
    clipboard = "";
    for (let i=0; i<MLjson.length; i++){
        for (let e=0; e<MLjson[i].tags.length ; e++){
            if (MLjson[i].tags[e].type === "Mod ID" && MLjson[i].tags[e].checked){
                clipboard += MLjson[i].tags[e].name + "; ";
            }
        }
    }
    navigator.clipboard.writeText(clipboard);
    setStatus("Mod IDs copied to clipboard", 'a')
}

function copyMapID() {
    clipboard = "";
    for (let i=0; i<MLjson.length; i++){
        for (let e=0; e<MLjson[i].tags.length ; e++){
            if (MLjson[i].tags[e].type === "Map Folder" && MLjson[i].tags[e].checked){
                clipboard += MLjson[i].tags[e].name + "; ";
            }
        }
    }
    navigator.clipboard.writeText(clipboard);
    setStatus("Map Folders copied to clipboard", 'a')
}

function clearAll(warn) {
    if (warn){
        ask = confirm("Are you sure you want to clear the entire modlist? This action cannot be undone.")
    } else { ask = true }
    if (ask) {
        MLjson = [];
        displayMods();
        saveToLocalStorage();
        setStatus("Mod list cleared!", 'a');
    }
}

async function importCollection() {
    document.getElementById('overlay_Collection').hidden = true;
    const id = document.getElementById("collectionId").value.trim();
    if (!/^\d+$/.test(id)) {
        setStatus("Error: Enter a valid Collection ID.", 'b');
        return;
    }
    if (MLjson.length > 0){
        ask = confirm("Importing a collection will override your current modlist. Are you sure you want to continue? This action cannot be undone.")
        if (ask){ clearAll(); } else { return; }
    }
    const idlist = await getCollectionWorkshopIDs(parseInt(id));
    if (!idlist){return;}
    setStatus("Loading collection... Wait until it's finished",'c')
    for (let i=0; i<idlist.length; i++){
        await addMod('readActID',idlist[i])
    }
    setStatus("Collection loaded succesfully!",'a')
    saveToLocalStorage();
}




function openTagsEditor(index) {
    currentEditIndex = index;
    tempTags = MLjson[index].tags.map(tag => ({...tag}));
    displayTagEditor();
    document.getElementById('overlay_TagEditor').hidden = false;
}

function displayTagEditor() {
    let TDisplay = "";
    for (let i = 0; i < tempTags.length; i++) {
        TDisplay += `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <div class="cbx">
                    <input type="checkbox" id="tag-cb-${i}" ${tempTags[i].checked ? "checked" : ""} />
                    <label for="tag-cb-${i}"></label>
                </div>
                <select class="dropdown" id="tag-type-${i}">
                    <option class="dropdown_opt" value="Mod ID" ${tempTags[i].type === "Mod ID" ? "selected" : ""}>Mod ID</option>
                    <option class="dropdown_opt" value="Map Folder" ${tempTags[i].type === "Map Folder" ? "selected" : ""}>Map Folder</option>
                </select>
                <input type="text" class="txt_tagseditor" id="tag-name-${i}" value="${tempTags[i].name.replace(/"/g, "&quot;")}" />
                <button class="btn_modcard" type="button" onclick="removeTagEditorTag(${i})"><svg width="20px" height="20px"><use href="#ico_delete"></use></svg></button>
            </div>
        `;
    }
    document.getElementById('tagEditorList').innerHTML = TDisplay;

    for (let i = 0; i < tempTags.length; i++) {
        document.getElementById(`tag-cb-${i}`).onchange = function() {
            tempTags[i].checked = this.checked;
        };
        document.getElementById(`tag-type-${i}`).onchange = function() {
            tempTags[i].type = this.value;
        };
        document.getElementById(`tag-name-${i}`).oninput = function() {
            tempTags[i].name = this.value;
        };
    }
}

function removeTagEditorTag(idx) {
    tempTags.splice(idx, 1);
    displayTagEditor();
}

document.getElementById('addTagBtn').onclick = function() {
    tempTags.push({checked: true, type: 'Mod ID', name: ''});
    displayTagEditor();
};

document.getElementById('doneTagEditBtn').onclick = function() {
    if (currentEditIndex !== null) {
        MLjson[currentEditIndex].tags = tempTags.map(tag => ({...tag}));
        displayMods();
        saveToLocalStorage();
        setStatus("Tags updated!", 'a');
    }
    document.getElementById('overlay_TagEditor').hidden = true;
};



function loadFromLocalStorage() {
    const saved = localStorage.getItem("modlist");
    if (saved) {
        try {
            MLjson = JSON.parse(saved);
            displayMods();
        } catch (err) {
            setStatus("Error loading saved modlist:"+ err, 'b');
        }
    }
}

function saveToLocalStorage() {
    localStorage.setItem("modlist", JSON.stringify(MLjson));
    console.log("Saved to local storage")
}

document.addEventListener("DOMContentLoaded", () => {
    loadFromLocalStorage();
});