import * as WorkspaceAPI from 'https://cdn.jsdelivr.net/npm/trimble-connect-workspace-api@latest/+esm';
import { saveToCloud, loadFromCloud } from './firebase-sync.js';
// Global memory store
window.projectSequenceData = {};
window.trimbleProjectId = null; // Will be set when API connects

// Global sync function to easily trigger saves
window.syncCloud = () => {
    if (window.trimbleProjectId) {
        saveToCloud(window.trimbleProjectId, window.projectSequenceData);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const btnCreate = document.getElementById('btn-create');
    const modal = document.getElementById('plan-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnConfirmCreate = document.getElementById('btn-confirm-create');
    const inputPlanName = document.getElementById('input-plan-name');
    const planContainer = document.getElementById('plan-container');

    
    window.createSubPlanHTML = function(planName, catName, catColor, txtColor, items = []) {
        let itemsHTML = items.map(item => `
            <div class="assembly-row" onclick="highlightObject('${item.modelId}', ${item.runtimeId})" style="cursor: pointer; padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 12px; color: #444; display: flex; align-items: center;">
                📄 ${item.name} (${item.weight} kg)
            </div>
        `).join('');

        return `
            <div class="summary-wrapper" style="margin-bottom: 6px;" data-category="${catName}">
                
                <!-- Added onclick to toggle collapse -->
                <div class="sub-plan-row" onclick="toggleCategoryCollapse(this)" style="background-color: ${catColor}; color: ${txtColor}; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 4px; cursor: pointer;">
                    <span class="category-title"><span class="cat-icon" style="font-family: monospace; font-size: 14px;">></span> ☰ ${catName} (${items.length})</span>
                    <button class="kebab-btn" style="color: inherit; opacity: 0.7; background: transparent; border: none; cursor: pointer; font-size: 18px;" onclick="toggleMenu(event, this)">⋮</button>
                </div>
                
                <div class="dropdown-menu">
                    <div class="dropdown-item" onclick="handleMenuAction('Assign Multiple Assemblies', this, '${planName}', '${catName}')">➕ Assign Multiple Assemblies</div>
                    <div class="dropdown-item" onclick="handleMenuAction('Assign Picked Assemblies In Order', this, '${planName}', '${catName}')">➕ Assign Picked Assemblies In Order</div>
                    <div class="dropdown-item" onclick="handleMenuAction('Edit', this, '${planName}', '${catName}')">✏️ Edit</div>
                    <div class="dropdown-item danger" onclick="handleMenuAction('Delete Sub Plan', this, '${planName}', '${catName}')">🗑️ Delete</div>
                </div>
                
                <!-- Added display: none to collapse by default -->
                <div class="assembly-list" style="display: none; background: #fafafa; padding-left: 15px; border-left: 3px solid ${catColor}; margin-left: 10px; border-bottom-left-radius: 4px;">
                    ${itemsHTML}
                </div>
            </div>
        `;
    };
    // 1. UI Builder Function
    window.buildPlanUI = function(planName) {
        window.projectSequenceData[planName] = {};

        const categories = [
            { name: "Column", color: "#92d050" },
            { name: "Beam", color: "#2f5597", textColor: "#fff" },
            { name: "Roof Brace", color: "#ffc000" },
            { name: "Girt", color: "#ff00ff" },
            { name: "Purlin", color: "#a6caf0", textColor: "#000" }
        ];

        let subPlansHTML = '';
        categories.forEach(cat => {
            const txtColor = cat.textColor || '#000';
            window.projectSequenceData[planName][cat.name] = [];
            subPlansHTML += window.createSubPlanHTML(planName, cat.name, cat.color, txtColor, []);
        });

        const newPlanHTML = `
            <div class="plan-details" data-plan="${planName}" style="margin-bottom: 10px; background: #fff; border-radius: 4px; border: 1px solid #ddd; overflow: visible;">
                
                <div class="summary-wrapper" style="position: relative; padding: 10px 15px; background-color: #efefef; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; color: #333;">
                    <div style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1;" onclick="togglePlanCollapse(this)">
                        <span class="collapse-icon" style="font-family: monospace; font-size: 14px; color: #666;">v</span>
                        <span class="summary-content" style="font-weight: 500;">☰ ${planName}</span>
                    </div>
                    
                    <button class="kebab-btn" style="color: #666; font-size: 18px; opacity: 0.7; border: none; background: transparent; cursor: pointer;" onclick="toggleMenu(event, this)">⋮</button>
                    
                    <div class="dropdown-menu">
                        <div class="dropdown-item" onclick="handleMenuAction('Add Custom Category', this, '${planName}')">✨ Add Custom Category</div>
                        <div class="dropdown-item" onclick="handleMenuAction('Edit', this, '${planName}')">✏️ Edit</div>
                        <div class="dropdown-item danger" onclick="handleMenuAction('Delete Plan', this, '${planName}')">🗑️ Delete</div>
                    </div>
                </div>

                <div class="sub-plan-list" style="padding: 10px; background-color: #ffffff; display: flex; flex-direction: column; gap: 8px;">
                    ${subPlansHTML}
                </div>
            </div>
        `;
        
        planContainer.insertAdjacentHTML('beforeend', newPlanHTML);
    };

    // Initialize first plan
    window.buildPlanUI("Phase 1");

    // Modal UI logic
    // Modal UI logic - Upgraded to reset the modal state
    btnCreate.addEventListener('click', () => { 
        const modalContent = modal.querySelector('.modal-content');
        
        // 1. Reset the modal width back to normal
        if (modalContent) {
            modalContent.style.width = ""; 
            modalContent.style.maxWidth = "400px"; // Adjust this if your original modal was a different size
        }

        // 2. Restore the original title
        const titleEl = modalContent.querySelector('h4');
        if (titleEl) titleEl.innerText = "Create New Plan";

        // 3. Un-hide the input box and the confirm button
        if (inputPlanName) inputPlanName.style.display = '';
        if (btnConfirmCreate) btnConfirmCreate.style.display = '';

        // 4. Hide the report table if it exists
        const tableDiv = document.getElementById('report-table');
        if (tableDiv) tableDiv.style.display = 'none';

        // 5. Show the modal and focus the input
        modal.style.display = 'flex'; 
        inputPlanName.focus(); 
    });
    btnCloseModal.addEventListener('click', () => { modal.style.display = 'none'; inputPlanName.value = ''; });
    btnConfirmCreate.addEventListener('click', () => {
        const planName = inputPlanName.value.trim() || "Untitled Plan";
        modal.style.display = 'none';
        inputPlanName.value = '';
        window.buildPlanUI(planName);
        window.syncCloud();
    });

    // --- GLOBAL RENDER FUNCTION ---
// Place this outside of any other functions so the Import button can always see it!
window.renderAssemblyList = (container, plan, category, items) => {
    container.innerHTML = items.map((item, index) => {
        // Convert YYYY-MM-DD to DD-MM-YYYY for display
        const parts = item.erectionDate ? item.erectionDate.split('-') : ['','',''];
        const displayDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';

        return `
        <div class="assembly-row" 
             draggable="true" 
             data-index="${index}" 
             data-plan="${plan}" 
             data-category="${category}"
             ondragstart="handleDragStart(event)" 
             ondragover="handleDragOver(event)" 
             ondrop="handleDrop(event)"
             ondragend="handleDragEnd(event)"
             onclick="handleRowClick(event, '${item.modelId}', '${item.runtimeId}')" 
             oncontextmenu="handleRightClick(event)"
             style="cursor: grab; padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 12px; color: #444; display: flex; align-items: center; gap: 8px; transition: background-color 0.2s;">
            
            <!-- Name & Weight -->
            <div style="flex: 1 1 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;" title="${item.name} (${item.weight} kg)">
                📄 <span style="font-weight: bold; margin-right: 5px;">[${index + 1}]</span>${item.name} (${item.weight} kg)
            </div>
            
            <!-- Date -->
            <div style="color: #888; font-family: monospace; white-space: nowrap; flex: 0 0 auto;">
                ${displayDate}
            </div>
        </div>
        `;
    }).join('');
};
// --- GLOBAL TOAST NOTIFICATION ---
window.showToast = (message, type = 'info') => {
    // 1. Check if the container exists; if not, create it
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. Create the toast element
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerText = message;

    // 3. Add it to the screen
    container.appendChild(toast);

    // 4. Trigger the slide-in animation
    setTimeout(() => toast.classList.add('show'), 10);

    // 5. Automatically remove it after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        // Wait for the fade-out animation to finish before deleting the element
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
};

    // Report Functionality
    const btnReport = document.getElementById('btn-report');
    if(btnReport) {
        btnReport.addEventListener('click', () => {
            
            // 1. Build the detailed HTML with sticky headers and a scrollable div
            let reportHTML = `
                <div style="font-family: sans-serif; margin-top: 10px;">
                    <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                            <thead style="position: sticky; top: 0; background-color: #f4f5f7; z-index: 1; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                                <tr>
                                    <th style="padding: 10px; border-bottom: 1px solid #ccc;">Phase</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ccc;">Category</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ccc;">Assembly</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ccc;">Weight</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ccc;">Date</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            let totalWeight = 0;
            let totalItems = 0;

            // 2. Loop through every individual item
            for (const [planName, categories] of Object.entries(window.projectSequenceData)) {
                for (const [catName, items] of Object.entries(categories)) {
                    items.forEach(item => {
                        totalItems++;
                        totalWeight += parseFloat(item.weight) || 0;
                        
                        // Format the date neatly
                        let displayDate = "-";
                        if (item.erectionDate) {
                            const parts = item.erectionDate.split('-');
                            displayDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : item.erectionDate;
                        }

                        reportHTML += `
                                <tr style="background-color: #fff; border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px 10px;">${planName}</td>
                                    <td style="padding: 8px 10px;">${catName}</td>
                                    <td style="padding: 8px 10px; font-weight: bold;">${item.name}</td>
                                    <td style="padding: 8px 10px;">${item.weight} kg</td>
                                    <td style="padding: 8px 10px; color: #666;">${displayDate}</td>
                                </tr>
                        `;
                    });
                }
            }

            // 3. Add footer with Totals and close tags
            reportHTML += `
                            </tbody>
                            <tfoot style="position: sticky; bottom: 0; background-color: #f4f5f7; font-weight: bold; box-shadow: 0 -1px 2px rgba(0,0,0,0.1);">
                                <tr>
                                    <td colspan="3" style="padding: 10px; border-top: 1px solid #ccc;">Total Items: ${totalItems}</td>
                                    <td colspan="2" style="padding: 10px; border-top: 1px solid #ccc; text-align: right;">Total Weight: ${totalWeight.toFixed(1)} kg</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;

            // 4. Inject into your existing modal logic
            const modalContent = modal.querySelector('.modal-content');
            
            // Make the modal wider so the 5 columns look good
            modalContent.style.width = "90%";
            modalContent.style.maxWidth = "700px";

            // Hide the default modal inputs/buttons
            const titleEl = modalContent.querySelector('h4');
            if(titleEl) titleEl.innerText = "Detailed Assembly Report";
            
            const inputEl = modalContent.querySelector('input');
            if(inputEl) inputEl.style.display = 'none';
            
            // Specifically target the create button to hide it, so we don't accidentally hide the close (✕) button
            const btnCreate = document.getElementById('btn-confirm-create');
            if(btnCreate) btnCreate.style.display = 'none';
            
            // Append the table to your existing div
            let tableDiv = document.getElementById('report-table');
            if (!tableDiv) {
                tableDiv = document.createElement('div');
                tableDiv.id = 'report-table';
                modalContent.appendChild(tableDiv);
            }
            
            tableDiv.innerHTML = reportHTML;
            tableDiv.style.display = 'block';
            modal.style.display = 'flex';
        });
    }

    const btnImport = document.getElementById('btn-import');

if (btnImport) {
    btnImport.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    if (typeof importedData !== 'object' || importedData === null) {
                        throw new Error("Invalid data format");
                    }

                    // 1. Clear the UI
                    const container = document.getElementById('plan-container');
                    container.innerHTML = ''; 

                    // 2. Rebuild Plans
                    for (const planName in importedData) {
                        
                        // Build HTML framework
                        window.buildPlanUI(planName);
                        
                        // Restore the data array for this specific phase
                        window.projectSequenceData[planName] = importedData[planName];
                        
                        // 3. Render the lists (FIXED: Removed "window." prefix)
                        for (const catName in window.projectSequenceData[planName]) {
                            const listContainer = document.querySelector(`.plan-details[data-plan="${planName}"] .summary-wrapper[data-category="${catName}"] .assembly-list`);
                            
                            if (listContainer) {
                                // Calls your local function directly!
                                renderAssemblyList(listContainer, planName, catName, window.projectSequenceData[planName][catName]);
                            } 
                        }
                    }

                    // 4. Update the numerical counts
                    for (const planName in window.projectSequenceData) {
                        for (const catName in window.projectSequenceData[planName]) {
                            const wrapper = document.querySelector(`.plan-details[data-plan="${planName}"] .summary-wrapper[data-category="${catName}"]`);
                            if (wrapper) {
                                const titleSpan = wrapper.querySelector('.category-title');
                                const iconElement = wrapper.querySelector('.cat-icon');
                                const currentIcon = iconElement ? iconElement.innerText : '>';
                                const newCount = window.projectSequenceData[planName][catName].length;
                                
                                if (titleSpan) {
                                    titleSpan.innerHTML = `<span class="cat-icon" style="font-family: monospace; font-size: 14px;">${currentIcon}</span> ☰ ${catName} (${newCount})`;
                                }
                            }
                        }
                    }
                    window.syncCloud(); // ADD THIS HERE TO SAVE IMPORTED DATA TO CLOUD
                    window.showToast("Import Successful!", "success");

                } catch (error) {
                    window.showToast("Failed to import data. Please ensure it is a valid sequence JSON file.", "error");
                    console.error("IMPORT CRASHED AT:", error);
                }
            };
            
            reader.readAsText(file);
        });
        
        fileInput.click();
    });
}

    // Export Functionality
    const btnExport = document.getElementById('btn-export');
    if(btnExport) {
        btnExport.addEventListener('click', () => {
            // NEW WAY:
if (Object.keys(window.projectSequenceData).length === 0) {
    window.showToast("No sequence data found!", "error");
    return;
}
            const dataStr = JSON.stringify(window.projectSequenceData, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = "sequencing_data.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    // API Connection
    try {
        window.tcAPI = await WorkspaceAPI.connect(window.parent, () => {}, 3000);
        
        // Grab the active Project ID from Trimble Connect
        const projectInfo = await window.tcAPI.project.getProject();
        window.trimbleProjectId = projectInfo.id;
        
    } catch (e) {
        console.error("Running offline for UI testing.");
        window.trimbleProjectId = "offline-test-project"; // Prevents crashes if testing locally
    }
});


// --- GLOBAL MENU FUNCTIONS ---

window.toggleMenu = (event, btn) => {
    event.preventDefault(); 
    event.stopPropagation(); 
    const wrapper = btn.closest('.summary-wrapper');
    const targetMenu = wrapper.querySelector('.dropdown-menu');
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        if (menu !== targetMenu) menu.classList.remove('show');
    });
    if (targetMenu) targetMenu.classList.toggle('show');
};

window.handleMenuAction = async (action, element, planName, categoryName) => {
    
    // 1. ASSIGNMENT LOGIC
    // 1. ASSIGNMENT LOGIC
    if (action === 'Assign Multiple Assemblies' || action === 'Assign Picked Assemblies In Order') {
        
        if (!window.tcAPI) {
            window.showToast("API not connected.", "error");
            return;
        }
        
        const selection = await window.tcAPI.viewer.getSelection();
        
        if (!selection || selection.length === 0) {
            window.showToast("Please select assemblies in the 3D viewer first!", "info");
            return;
        }

        let currentItems = window.projectSequenceData[planName][categoryName] || [];
        
        // --- THE FIX: Correctly mapping IDs and fetching getObjectProperties ---
        const detailsMap = {};
        
        for (const modelGroup of selection) {
            const currentModelId = modelGroup.modelId;
            
            // Extract the IDs exactly how your screenshot shows they are stored
            let ids = modelGroup.objectRuntimeIds || modelGroup.objectIds || [];
            if (ids.length === 0 && modelGroup.objects && Array.isArray(modelGroup.objects)) {
                ids = modelGroup.objects.map(o => o.runtimeId || o.objectRuntimeId || o.objectId || o.id);
            }
            
            if (ids.length > 0) {
                try {
                    // CRITICAL FIX: getObjectProperties requires (modelId, array of IDs)
                    const propsArray = await window.tcAPI.viewer.getObjectProperties(currentModelId, ids);
                    
                    propsArray.forEach(objProps => {
                        const objId = objProps.runtimeId || objProps.objectRuntimeId || objProps.objectId || objProps.id;
                        const key = `${currentModelId}-${objId}`;
                        
                        let partName = null;
                        let partWeight = null;
                        
                        // Search for the nested engineering properties
                        if (objProps.properties && Array.isArray(objProps.properties)) {
                            const allProps = objProps.properties.flatMap(cat => cat.properties || []);
                            
                            // Look for structural identifiers
                            const nameProp = allProps.find(p => 
                                p.name.toUpperCase() === "ASSEMBLY_POS" || 
                                p.name.toUpperCase() === "ASSEMBLY_MARK" || 
                                p.name === "Mark"
                            );
                            if (nameProp) partName = nameProp.value;
                            
                            // Look for structural weights
                            const weightProp = allProps.find(p => p.name.toUpperCase().includes("WEIGHT"));
                            if (weightProp) partWeight = parseFloat(weightProp.value);
                        }
                        
                        detailsMap[key] = { 
                            name: partName, 
                            weight: partWeight 
                        };
                    });
                } catch (e) {
                    console.error("Failed to fetch properties for model:", currentModelId, e);
                }
            }
        }
        
        // Loop through the selected models and format them into flat objects for our list
        // Create a default date (YYYY-MM-DD format)
        const today = new Date().toISOString().split('T')[0];

        // --- UPGRADED MULTI-SELECT & SORTING LOGIC ---
        let newlySelected = [];

        // 1. Gather all new items into a temporary array first
        for (const modelGroup of selection) {
            let ids = modelGroup.objectRuntimeIds || modelGroup.objectIds || [];
            if (ids.length === 0 && modelGroup.objects) {
                ids = modelGroup.objects.map(o => o.runtimeId || o.objectRuntimeId || o.objectId || o.id);
            }
            
            for (const id of ids) {
                const exists = currentItems.find(i => i.modelId === modelGroup.modelId && i.runtimeId === id);
                if (!exists) {
                    const lookupKey = `${modelGroup.modelId}-${id}`;
                    const detail = detailsMap[lookupKey] || {};
                    
                    newlySelected.push({
                        modelId: modelGroup.modelId,
                        runtimeId: id,
                        name: detail.name || `Part [${id}]`, 
                        weight: detail.weight ? detail.weight.toFixed(1) : "0.0",
                        erectionDate: today 
                    });
                }
            }
        }

        // 2. Apply Smart Sorting based on which menu button was clicked
        if (newlySelected.length > 0) {
            
            if (action === 'Assign Multiple Assemblies') {
                // Smart Sort: Orders them naturally by Name (C/1, C/2, C/10 instead of C/1, C/10, C/2)
                newlySelected.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

                // Ask the user which side of the area selection to start from
                if (newlySelected.length > 1) {
                    const firstPart = newlySelected[0].name;
                    const lastPart = newlySelected[newlySelected.length - 1].name;
                    
                    const startFromLast = confirm(
                        `You selected ${newlySelected.length} assemblies.\n\n` +
                        `Click OK to assign starting from the LAST column (${lastPart} ➔ ${firstPart}).\n` +
                        `Click Cancel to start from the FIRST column (${firstPart} ➔ ${lastPart}).`
                    );
                    
                    if (startFromLast) {
                        newlySelected.reverse();
                    }
                }
            } 
            // If action === 'Assign Picked Assemblies In Order', we do NOTHING to the array!
            // We trust the raw array to maintain the exact chronological order you manually clicked them in.

            // 3. Append the perfectly sorted items to your main UI list
            currentItems.push(...newlySelected);
        }
        
        window.projectSequenceData[planName][categoryName] = currentItems;
        
        // Visually update the UI List
        const wrapper = element.closest('.summary-wrapper');
        const titleSpan = wrapper.querySelector('.category-title');
        titleSpan.innerHTML = `<span class="cat-icon" style="font-family: monospace; font-size: 14px;">></span> ☰ ${categoryName} (${currentItems.length})`;

        const listContainer = wrapper.querySelector('.assembly-list');
        
        

        // Call the new helper function immediately
        window.renderAssemblyList(listContainer, planName, categoryName, currentItems);

        // Force the list to open automatically
        listContainer.style.display = 'block';
        wrapper.querySelector('.cat-icon').innerText = 'v';

    // 2. ADD A CUSTOM CATEGORY
    } else if (action === 'Add Custom Category') {
        const newCategoryName = prompt("Enter custom category (e.g., Slab, Stairs):");
        if (newCategoryName && newCategoryName.trim() !== "") {
            const cleanName = newCategoryName.trim();
            window.projectSequenceData[planName][cleanName] = [];
            const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            const newSubPlanHTML = window.createSubPlanHTML(planName, cleanName, randomColor, '#fff', []);
            element.closest('.plan-details').querySelector('.sub-plan-list').insertAdjacentHTML('beforeend', newSubPlanHTML);
        }

    // 3. EDIT LOGIC (Main Plan & Sub-Plan)
    } else if (action === 'Edit') {
        if (categoryName) {
            const newName = prompt(`Rename '${categoryName}' to:`, categoryName);
            if (newName && newName.trim() !== "" && newName !== categoryName) {
                const cleanName = newName.trim();
                window.projectSequenceData[planName][cleanName] = window.projectSequenceData[planName][categoryName];
                delete window.projectSequenceData[planName][categoryName];
                
                const titleSpan = element.closest('.summary-wrapper').querySelector('.category-title');
                const currentCount = window.projectSequenceData[planName][cleanName].length;
                titleSpan.innerHTML = `<span style="font-family: monospace; font-size: 14px;">></span> ☰ ${cleanName} (${currentCount})`;
                element.closest('.summary-wrapper').setAttribute('data-category', cleanName);
                
                const menuItems = element.closest('.dropdown-menu').querySelectorAll('.dropdown-item');
                menuItems.forEach(item => {
                    const originalClick = item.getAttribute('onclick');
                    if (originalClick) item.setAttribute('onclick', originalClick.replaceAll(`'${categoryName}'`, `'${cleanName}'`));
                });
            }
        } else {
            const newPlanName = prompt(`Rename plan '${planName}' to:`, planName);
            if (newPlanName && newPlanName.trim() !== "" && newPlanName !== planName) {
                const cleanPlanName = newPlanName.trim();
                window.projectSequenceData[cleanPlanName] = window.projectSequenceData[planName];
                delete window.projectSequenceData[planName];
                
                element.closest('.summary-wrapper').querySelector('.summary-content').innerText = `☰ ${cleanPlanName}`;
                const planDetails = element.closest('.plan-details');
                planDetails.setAttribute('data-plan', cleanPlanName);

                planDetails.querySelectorAll('.dropdown-item').forEach(btn => {
                    const originalClick = btn.getAttribute('onclick');
                    if (originalClick) btn.setAttribute('onclick', originalClick.replaceAll(`'${planName}'`, `'${cleanPlanName}'`));
                });
            }
        }

    // 4. DELETE ACTIONS
    } else if (action === 'Delete Plan') {
        if(confirm(`Are you sure you want to delete the entire '${planName}' plan?`)) {
            element.closest('.plan-details').remove();
            delete window.projectSequenceData[planName];
        }
    } else if (action === 'Delete Sub Plan') {
        if(confirm(`Remove this sub-plan?`)) {
            element.closest('.summary-wrapper').remove();
            delete window.projectSequenceData[planName][categoryName];
        }
    }
    
    element.closest('.dropdown-menu').classList.remove('show');
    window.syncCloud();
};

// Handle clicks outside dropdowns
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => menu.classList.remove('show'));
});

// --- TOGGLE CATEGORY COLLAPSE ---
window.toggleCategoryCollapse = (element) => {
    const wrapper = element.closest('.summary-wrapper');
    const assemblyList = wrapper.querySelector('.assembly-list');
    const icon = element.querySelector('.cat-icon');
    
    // Toggle the list visibility and the > / v arrow
    if (assemblyList.style.display === 'none' || assemblyList.style.display === '') {
        assemblyList.style.display = 'block';
        icon.innerText = 'v';
    } else {
        assemblyList.style.display = 'none';
        icon.innerText = '>';
    }
};
// --- HIGHLIGHT PART IN 3D VIEWER ---
window.highlightObject = async (modelId, runtimeId) => {
    if (!window.tcAPI) return;
    
    // Convert the ID to a strict integer
    const exactPartId = parseInt(runtimeId, 10);
    
    try {
        // THE FIX: Wrap the payload in the 'modelObjectIds' property exactly as the sample code does
        const selector = {
            modelObjectIds: [
                {
                    modelId: modelId,
                    objectRuntimeIds: [exactPartId]
                }
            ]
        };
        
        // Pass the properly formatted selector and use "set" to replace any current selections
        await window.tcAPI.viewer.setSelection(selector, "set");
        
    } catch (error) {
        console.error("Failed to highlight object:", error);
    }
};
// ==========================================
// DRAG AND DROP REORDERING LOGIC
// ==========================================

let draggedItemInfo = null;

window.handleDragStart = (e) => {
    const target = e.currentTarget;
    
    // 1. Store the exact index and location of the item we picked up
    draggedItemInfo = {
        index: parseInt(target.getAttribute('data-index'), 10),
        plan: target.getAttribute('data-plan'),
        category: target.getAttribute('data-category')
    };
    
    // 2. Visual feedback: make the dragged item slightly transparent
    setTimeout(() => target.style.opacity = '0.4', 0);
    e.dataTransfer.effectAllowed = 'move';
};

window.handleDragOver = (e) => {
    // This is required to allow the drop action
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    
    // Add a slight hover effect to the row we are dragging over
    const target = e.currentTarget;
    target.style.backgroundColor = '#eefdf2';
};

window.handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    
    // Clean up any lingering hover colors
    const rows = document.querySelectorAll('.assembly-row');
    rows.forEach(row => row.style.backgroundColor = 'transparent');
};

window.handleDrop = (e) => {
    e.preventDefault();
    if (!draggedItemInfo) return;

    const target = e.currentTarget;
    target.style.backgroundColor = 'transparent';

    const fromIndex = draggedItemInfo.index;
    const toIndex = parseInt(target.getAttribute('data-index'), 10);
    const targetPlan = target.getAttribute('data-plan');
    const targetCategory = target.getAttribute('data-category');

    // Security check: Only allow sorting within the exact same sub-plan category
    if (targetPlan === draggedItemInfo.plan && targetCategory === draggedItemInfo.category) {
        
        // If it wasn't dropped in the exact same spot...
        if (fromIndex !== toIndex) {
            
            // 1. Get the current array from your master data object
            const currentItems = window.projectSequenceData[targetPlan][targetCategory];
            
            // 2. Remove the dragged item from its old position
            const [movedItem] = currentItems.splice(fromIndex, 1);
            
            // 3. Insert it into the new position
            currentItems.splice(toIndex, 0, movedItem);
            
            // 4. Re-render the UI immediately to show the new order
            const wrapper = target.closest('.summary-wrapper');
            const listContainer = wrapper.querySelector('.assembly-list');
            window.renderAssemblyList(listContainer, targetPlan, targetCategory, currentItems);

            window.syncCloud();
        }
    }
    
    draggedItemInfo = null;
};

// ==========================================
// ROW SELECTION & DATE EDITING LOGIC
// ==========================================

let lastClickedIndex = -1;

// 1. Handle standard clicks and multi-selection (Shift/Ctrl)
window.handleRowClick = (e, modelId, runtimeId) => {
    // Keep your existing 3D viewer highlight working!
    window.highlightObject(modelId, runtimeId);

    const target = e.currentTarget;
    const allRows = Array.from(target.parentElement.querySelectorAll('.assembly-row'));
    const currentIndex = allRows.indexOf(target);

    if (e.ctrlKey) {
        // Toggle single row
        target.classList.toggle('selected-row');
    } else if (e.shiftKey && lastClickedIndex > -1) {
        // Select a range between last clicked and current
        const start = Math.min(lastClickedIndex, currentIndex);
        const end = Math.max(lastClickedIndex, currentIndex);
        allRows.forEach((r, i) => {
            if (i >= start && i <= end) r.classList.add('selected-row');
        });
    } else {
        // Clear all others and select only this one
        allRows.forEach(r => r.classList.remove('selected-row'));
        target.classList.add('selected-row');
        lastClickedIndex = currentIndex;
    }

    // Apply the light blue color to selected rows
    allRows.forEach(r => {
        r.style.backgroundColor = r.classList.contains('selected-row') ? '#e8f0fe' : 'transparent';
    });
};

// 2. Inject the custom popup menu HTML into the document if it doesn't exist yet
if (!document.getElementById('date-edit-popup')) {
    const popup = document.createElement('div');
    popup.id = 'date-edit-popup';
    // Styling matched to "image_6d4b5a.png"
    popup.style.cssText = 'display:none; position:absolute; background:white; border:1px solid #ccc; box-shadow:0 2px 10px rgba(0,0,0,0.1); padding:10px; border-radius:5px; z-index:1000; flex-direction:column; gap:8px; font-family:sans-serif;';
    // Update your popup innerHTML:
    popup.innerHTML = `
        <div style="display:flex; gap:5px; align-items:center;">
            <input type="date" id="popup-date" style="font-size:12px; padding:3px 5px;">
            <input type="number" id="popup-increment" value="1" style="width:30px; font-size:12px;">
            <button id="popup-update-btn">✏️</button>
        </div>
        <div style="border-top:1px solid #eee; margin: 5px 0;"></div>
        <div id="move-options" style="display:flex; flex-direction:column; gap:4px;">
            <button id="popup-move-category" style="cursor:pointer; background:none; border:none; text-align:left; font-size:12px;">📂 Move to Sub-Category</button>
            <button id="popup-move-phase" style="cursor:pointer; background:none; border:none; text-align:left; font-size:12px;">🌐 Move to Phase</button>
        </div>
        <div style="border-top:1px solid #eee; margin: 5px 0;"></div>
        <button id="popup-delete-btn" style="cursor:pointer; color:#d93025; background:none; border:none; font-size:12px;">🗑️ Delete</button>
    `;
    document.body.appendChild(popup);
    
    // Hide the popup if the user clicks anywhere else on the screen
    document.addEventListener('click', (e) => {
        if (!popup.contains(e.target)) popup.style.display = 'none';
    });
}

// 3. Handle the Right-Click
window.handleRightClick = (e) => {
    e.preventDefault(); // Stop standard browser right-click menu
    
    const target = e.currentTarget;
    
    // If the user right-clicks a row that isn't selected, select it automatically
    if (!target.classList.contains('selected-row')) {
        const allRows = target.parentElement.querySelectorAll('.assembly-row');
        allRows.forEach(r => {
            r.classList.remove('selected-row');
            r.style.backgroundColor = 'transparent';
        });
        target.classList.add('selected-row');
        target.style.backgroundColor = '#e8f0fe';
    }

    // Position and show the popup exactly where the mouse is
    const popup = document.getElementById('date-edit-popup');
    popup.style.display = 'flex';
    popup.style.left = `${e.pageX}px`;
    popup.style.top = `${e.pageY}px`;
    
    // Attach the exact plan and category names to the popup so it knows what to update
    popup.setAttribute('data-plan', target.getAttribute('data-plan'));
    popup.setAttribute('data-category', target.getAttribute('data-category'));
    
    // Auto-fill the date picker with the clicked row's date
    const index = parseInt(target.getAttribute('data-index'), 10);
    const plan = target.getAttribute('data-plan');
    const category = target.getAttribute('data-category');
    document.getElementById('popup-date').value = window.projectSequenceData[plan][category][index].erectionDate || '';
};

// 4. Execute the Bulk Update
document.getElementById('popup-update-btn').onclick = () => {
    const popup = document.getElementById('date-edit-popup');
    const plan = popup.getAttribute('data-plan');
    const category = popup.getAttribute('data-category');
    
    const startDateStr = document.getElementById('popup-date').value;
    const increment = parseInt(document.getElementById('popup-increment').value, 10) || 0;
    
    if (!startDateStr) return;
    
    // Create a Date object from the input so we can do math on it
    let currentDate = new Date(startDateStr);
    const items = window.projectSequenceData[plan][category];
    
    // Loop through the UI to find which ones are highlighted
    const allRows = document.querySelectorAll(`.assembly-row[data-plan="${plan}"][data-category="${category}"]`);
    allRows.forEach((row) => {
        if (row.classList.contains('selected-row')) {
            const idx = parseInt(row.getAttribute('data-index'), 10);
            
            // Save the date in standard YYYY-MM-DD format
            items[idx].erectionDate = currentDate.toISOString().split('T')[0];
            
            // Add the increment amount (e.g., +1 day) for the next selected item
            currentDate.setDate(currentDate.getDate() + increment);
        }
    });
    
    popup.style.display = 'none';
    
    // Instantly re-render the list to show the new dates
    const listContainer = allRows[0].parentElement;
    window.renderAssemblyList(listContainer, plan, category, items);

    window.syncCloud();
};

// 5. Execute the Delete Action
document.getElementById('popup-delete-btn').onclick = () => {
    const popup = document.getElementById('date-edit-popup');
    const plan = popup.getAttribute('data-plan');
    const category = popup.getAttribute('data-category');
    
    let items = window.projectSequenceData[plan][category];
    
    // Find all selected indexes
    const selectedIndexes = [];
    document.querySelectorAll(`.assembly-row[data-plan="${plan}"][data-category="${category}"]`).forEach(row => {
        if (row.classList.contains('selected-row')) {
            selectedIndexes.push(parseInt(row.getAttribute('data-index'), 10));
        }
    });
    
    // Filter the items array to keep only the ones that were NOT selected
    window.projectSequenceData[plan][category] = items.filter((_, index) => !selectedIndexes.includes(index));
    
    popup.style.display = 'none';
    
    // Safely find the list container by its Plan and Category names
    const planDetails = document.querySelector(`.plan-details[data-plan="${plan}"]`);
    const wrapper = planDetails.querySelector(`.summary-wrapper[data-category="${category}"]`);
    const listContainer = wrapper.querySelector('.assembly-list');
    
    // Re-render
    window.renderAssemblyList(listContainer, plan, category, window.projectSequenceData[plan][category]);
    
    // Update the title count (e.g., Column (4) -> Column (3))
    const titleSpan = wrapper.querySelector('.category-title');
    titleSpan.innerHTML = `<span class="cat-icon" style="font-family: monospace; font-size: 14px;">v</span> ☰ ${category} (${window.projectSequenceData[plan][category].length})`;

    window.syncCloud();
};

window.moveItems = (targetPlan, targetCategory) => {
    const popup = document.getElementById('date-edit-popup');
    const sourcePlan = popup.getAttribute('data-plan');
    const sourceCategory = popup.getAttribute('data-category');
    
    // STRICT FIX 1: Only grab selected rows from the specific SOURCE plan and category
    const rows = document.querySelectorAll(`.assembly-row.selected-row[data-plan="${sourcePlan}"][data-category="${sourceCategory}"]`);
    const indices = Array.from(rows).map(r => parseInt(r.getAttribute('data-index'), 10)).sort((a, b) => b - a);
    
    // Move items in the data object
    indices.forEach(idx => {
        const item = window.projectSequenceData[sourcePlan][sourceCategory].splice(idx, 1)[0];
        window.projectSequenceData[targetPlan][targetCategory].push(item);
    });

    // Helper to update both the List AND the Count Title at the same time
    const renderAndUpdateCount = (p, c) => {
        // STRICT FIX 2: Look for the specific category INSIDE the specific Plan container
        const wrapper = document.querySelector(`.plan-details[data-plan="${p}"] .summary-wrapper[data-category="${c}"]`);
        
        if (wrapper) {
            // 1. Re-render the list inside it
            const listContainer = wrapper.querySelector('.assembly-list');
            window.renderAssemblyList(listContainer, p, c, window.projectSequenceData[p][c]);
            
            // 2. Safely grab the current v or > icon
            const iconElement = wrapper.querySelector('.cat-icon');
            const currentIcon = iconElement ? iconElement.innerText : '>';
            
            // 3. Update the Title Count
            const titleSpan = wrapper.querySelector('.category-title');
            const newCount = window.projectSequenceData[p][c].length;
            titleSpan.innerHTML = `<span class="cat-icon" style="font-family: monospace; font-size: 14px;">${currentIcon}</span> ☰ ${c} (${newCount})`;
        } else {
            console.warn(`Could not find UI container for Plan: ${p}, Category: ${c}`);
        }
    };

    // Execute for both where the item came from, and where it went!
    renderAndUpdateCount(sourcePlan, sourceCategory);
    renderAndUpdateCount(targetPlan, targetCategory);
    
    popup.style.display = 'none';

    window.syncCloud();
};

// Hook up the Move buttons
document.getElementById('popup-move-category').onclick = () => {
    const plan = document.getElementById('date-edit-popup').getAttribute('data-plan');
    const categories = Object.keys(window.projectSequenceData[plan]);
    const target = prompt("Type destination category name:\n" + categories.join(", "));
    if (target && window.projectSequenceData[plan][target]) window.moveItems(plan, target);
};

document.getElementById('popup-move-phase').onclick = () => {
    const plans = Object.keys(window.projectSequenceData);
    const targetPlan = prompt("Type destination Phase name:\n" + plans.join(", "));
    if (targetPlan && window.projectSequenceData[targetPlan]) {
        const targetCat = prompt("Type destination Sub-Category:\n" + Object.keys(window.projectSequenceData[targetPlan]).join(", "));
        if (targetCat && window.projectSequenceData[targetPlan][targetCat]) window.moveItems(targetPlan, targetCat);
    }
};
