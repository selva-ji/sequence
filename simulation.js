// ==========================================
// 4D SIMULATION CONTROLLER (simulation.js)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    const btnPlay = document.getElementById('sim-btn-play');
    const btnPrev = document.getElementById('sim-btn-prev');
    const btnNext = document.getElementById('sim-btn-next');
    const speedSlider = document.getElementById('sim-speed');
    const speedLabel = document.getElementById('sim-speed-label');
    const progressSlider = document.getElementById('sim-progress');
    
    let isPlaying = false;
    let simulationTimer = null;
    let playbackSpeed = 200; 
    let sortedSequenceList = []; 
    let currentIndex = 0;

    // --- HELPER: Build API Selector ---
    function buildSelectorArray(items) {
        const modelMap = {};
        items.forEach(item => {
            if (item.modelId && item.runtimeId) {
                if (!modelMap[item.modelId]) modelMap[item.modelId] = [];
                modelMap[item.modelId].push(parseInt(item.runtimeId, 10)); 
            }
        });
        
        return Object.keys(modelMap).map(modelId => {
            return { modelId: modelId, objectRuntimeIds: modelMap[modelId] };
        });
    }

    // --- 1. DATA PREPARATION ---
    function prepareSimulationData() {
        sortedSequenceList = [];
        let globalOrder = 0; // Tracks their exact order in the UI lists
        
        for (const plan in window.projectSequenceData) {
            for (const category in window.projectSequenceData[plan]) {
                const items = window.projectSequenceData[plan][category];
                items.forEach(item => {
                    if (item.erectionDate) {
                        // Attach the UI order so we can break date ties!
                        sortedSequenceList.push({ ...item, sequenceOrder: globalOrder++ });
                    }
                });
            }
        }
        
        // Sort by Date FIRST. If dates match, sort by UI Sequence Order.
        sortedSequenceList.sort((a, b) => {
            const dateA = new Date(a.erectionDate);
            const dateB = new Date(b.erectionDate);
            if (dateA.getTime() === dateB.getTime()) {
                return a.sequenceOrder - b.sequenceOrder;
            }
            return dateA - dateB;
        });
        
        if (sortedSequenceList.length > 0) {
            document.getElementById('sim-start-date').value = sortedSequenceList[0].erectionDate;
            document.getElementById('sim-end-date').value = sortedSequenceList[sortedSequenceList.length - 1].erectionDate;
            progressSlider.max = sortedSequenceList.length - 1;
        }
    }

    // --- 2. PROGRESSIVE VISIBILITY & UI UPDATE ---
    async function updateSimulationUI(index) {
        if (sortedSequenceList.length === 0 || index < 0 || index >= sortedSequenceList.length) return;
        
        const item = sortedSequenceList[index];
        
        // Format date for display
        const parts = item.erectionDate.split('-');
        const displayDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : item.erectionDate;

        // Update UI Panel text
        document.getElementById('sim-active-part').innerText = item.name;
        document.getElementById('sim-active-weight').innerText = `${item.weight} kg`;
        document.getElementById('sim-active-date').innerText = displayDate;
        progressSlider.value = index;

        // --- THE MAGIC: HIDE FUTURE, SHOW PAST ---
        if (window.tcAPI) {
            const erectedItems = sortedSequenceList.slice(0, index + 1);
            const futureItems = sortedSequenceList.slice(index + 1);

            try {
                // We MUST wrap the array in { modelObjectIds: ... } for setObjectState
                if (futureItems.length > 0) {
                    const futureSelector = { modelObjectIds: buildSelectorArray(futureItems) };
                    await window.tcAPI.viewer.setObjectState(futureSelector, { visible: false });
                }
                
                if (erectedItems.length > 0) {
                    const erectedSelector = { modelObjectIds: buildSelectorArray(erectedItems) };
                    await window.tcAPI.viewer.setObjectState(erectedSelector, { visible: true });
                }

            } catch (e) {
                console.error("Visibility API Error:", e);
                
                // Absolute fallback just in case
                if (futureItems.length > 0) {
                    await window.tcAPI.viewer.setVisibility({ modelObjectIds: buildSelectorArray(futureItems) }, false);
                }
                if (erectedItems.length > 0) {
                    await window.tcAPI.viewer.setVisibility({ modelObjectIds: buildSelectorArray(erectedItems) }, true);
                }
            }

            // Finally, highlight the single active part so it flashes in the viewer
            if (window.highlightObject) {
                window.highlightObject(item.modelId, item.runtimeId);
            }
        }
    }

    // --- 3. PLAYBACK CONTROLS ---
    function playSimulation() {
        prepareSimulationData();
        if (sortedSequenceList.length === 0) return window.showToast("No sequence data found.");

        if (currentIndex >= sortedSequenceList.length - 1) {
            currentIndex = 0; // Restart if at the end
        }

        isPlaying = true;
        btnPlay.innerHTML = "⏸ Pause";
        btnPlay.style.background = "#ea4335"; 

        clearInterval(simulationTimer);
        // Call it immediately once, then loop
        updateSimulationUI(currentIndex);
        simulationTimer = setInterval(simulationTick, playbackSpeed);
    }

    function pauseSimulation() {
        isPlaying = false;
        btnPlay.innerHTML = "▶ Play";
        btnPlay.style.background = "#4285f4"; 
        clearInterval(simulationTimer);
    }

    function simulationTick() {
        if (currentIndex < sortedSequenceList.length - 1) {
            currentIndex++;
            updateSimulationUI(currentIndex);
        } else {
            pauseSimulation();
        }
    }

    // --- 4. EVENT LISTENERS ---
    btnPlay.addEventListener('click', () => isPlaying ? pauseSimulation() : playSimulation());

    btnPrev.addEventListener('click', () => {
        pauseSimulation();
        prepareSimulationData();
        if (currentIndex > 0) updateSimulationUI(--currentIndex);
    });

    btnNext.addEventListener('click', () => {
        pauseSimulation();
        prepareSimulationData();
        if (currentIndex < sortedSequenceList.length - 1) updateSimulationUI(++currentIndex);
    });

    progressSlider.addEventListener('input', (e) => {
        pauseSimulation();
        prepareSimulationData();
        currentIndex = parseInt(e.target.value, 10);
        updateSimulationUI(currentIndex);
    });

    speedSlider.addEventListener('input', (e) => {
        playbackSpeed = e.target.value;
        speedLabel.innerText = `${playbackSpeed} ms`;
        if (isPlaying) {
            clearInterval(simulationTimer);
            simulationTimer = setInterval(simulationTick, playbackSpeed);
        }
    });
});