/**
 * 設置面板模組
 * 負責管理顯示設定的 UI 和邏輯
 */

// 全局變數引用（由 main.js 設置）
let calendarInstance = null;

/**
 * 設定日曆實例（由 main.js 調用）
 * @param {Calendar} calendar - 日曆實例
 */
function setCalendarInstance(calendar) {
    calendarInstance = calendar;
}

/**
 * 設定設置面板的事件監聽器
 */
function setupSettingsPanel() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const applySettingsBtn = document.getElementById('applySettings');
    const resetSettingsBtn = document.getElementById('resetSettings');
    
    // 打開設置面板
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('打開設置面板');
            settingsPanel.classList.add('active');
            updateSettingsCheckboxes();
        });
    } else {
        console.warn('設置按鈕或面板元素不存在:', { settingsBtn, settingsPanel });
    }

    // 關閉設置面板
    if (closeSettingsBtn && settingsPanel) {
        closeSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            settingsPanel.classList.remove('active');
        });
    }

    // 點擊面板外部關閉
    if (settingsPanel) {
        settingsPanel.addEventListener('click', (e) => {
            if (e.target === settingsPanel) {
                e.preventDefault();
                settingsPanel.classList.remove('active');
            }
        });
    }

    // ESC 鍵關閉設置面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsPanel?.classList.contains('active')) {
            settingsPanel.classList.remove('active');
        }
    });

    // 套用設置
    if (applySettingsBtn) {
        applySettingsBtn.addEventListener('click', () => {
            applySettings();
            if (settingsPanel) {
                settingsPanel.classList.remove('active');
            }
        });
    }

    // 重置設置
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            resetSettings();
        });
    }
}

/**
 * 生成任務條欄位選項
 */
function generateTaskBarFieldOptions() {
    const optionsContainer = document.getElementById('taskBarFieldsOptions');
    if (!optionsContainer) {
        console.warn('找不到任務條欄位選項容器');
        return;
    }

    // 清空現有選項
    optionsContainer.innerHTML = '';

    // 取得欄位顯示名稱映射
    const fieldDisplayNames = SystemConfig.fieldDisplayNames || {};
    
    // 取得當前配置
    const taskBarFields = SystemConfig.taskDisplay?.taskBarFields || {};

    // 取得所有可用的欄位（從 fieldMapping 中）
    const fieldMapping = SystemConfig.fieldMapping || {};
    const allFields = Object.keys(fieldMapping);

    if (allFields.length === 0) {
        console.warn('沒有找到可用的欄位');
        return;
    }

    // 為每個欄位創建 checkbox
    allFields.forEach(fieldKey => {
        const displayName = fieldDisplayNames[fieldKey] || fieldKey;
        const isChecked = taskBarFields[fieldKey] === true;

        const label = document.createElement('label');
        label.className = 'settings-option';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
        checkbox.dataset.fieldKey = fieldKey;
        checkbox.checked = isChecked;

        const span = document.createElement('span');
        span.textContent = displayName;

        label.appendChild(checkbox);
        label.appendChild(span);
        optionsContainer.appendChild(label);
    });

    console.log(`已生成 ${allFields.length} 個欄位選項`);
}

/**
 * 更新設置面板的 checkbox 狀態
 */
function updateSettingsCheckboxes() {
    // 先生成選項（如果還沒有生成）
    generateTaskBarFieldOptions();

    // 取得當前配置
    const taskBarFields = SystemConfig.taskDisplay?.taskBarFields || {};
    const fieldMapping = SystemConfig.fieldMapping || {};
    const allFields = Object.keys(fieldMapping);

    // 更新每個 checkbox 的狀態
    allFields.forEach(fieldKey => {
        const checkboxId = `show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.checked = taskBarFields[fieldKey] === true;
        }
    });
}

/**
 * 套用設置
 */
function applySettings() {
    // 取得所有欄位
    const fieldMapping = SystemConfig.fieldMapping || {};
    const allFields = Object.keys(fieldMapping);

    if (allFields.length === 0) {
        console.warn('沒有可用的欄位');
        return;
    }

    // 更新配置
    if (!SystemConfig.taskDisplay) {
        SystemConfig.taskDisplay = {};
    }
    if (!SystemConfig.taskDisplay.taskBarFields) {
        SystemConfig.taskDisplay.taskBarFields = {};
    }

    // 從所有 checkbox 讀取狀態
    allFields.forEach(fieldKey => {
        const checkboxId = `show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            SystemConfig.taskDisplay.taskBarFields[fieldKey] = checkbox.checked === true;
        }
    });

    // 保存到 localStorage
    try {
        localStorage.setItem('taskBarFields', JSON.stringify(SystemConfig.taskDisplay.taskBarFields));
        console.log('已保存任務條顯示設定:', SystemConfig.taskDisplay.taskBarFields);
    } catch (e) {
        console.warn('保存設置失敗:', e);
    }

    // 重新渲染月曆
    if (calendarInstance) {
        calendarInstance.render();
    } else {
        console.warn('日曆實例不存在，無法重新渲染');
    }

    // 更新圖例（如果 createLegend 函數存在）
    if (typeof createLegend === 'function') {
        createLegend();
    }
}

/**
 * 取得欄位的預設值（從 config 中讀取）
 * @param {string} fieldKey - 欄位鍵值
 * @returns {boolean} 預設值
 */
function getDefaultFieldValue(fieldKey) {
    // 從 config 中讀取預設值
    const defaultTaskBarFields = SystemConfig.taskDisplay?.taskBarFields || {};
    
    // 如果 config 中有定義該欄位的預設值，使用它
    if (defaultTaskBarFields.hasOwnProperty(fieldKey)) {
        return defaultTaskBarFields[fieldKey] === true;
    }
    
    // 如果 config 中沒有定義，預設為 false
    return false;
}

/**
 * 重置設置為預設值
 */
function resetSettings() {
    // 重置為預設值
    if (!SystemConfig.taskDisplay) {
        SystemConfig.taskDisplay = {};
    }
    
    // 取得所有欄位
    const fieldMapping = SystemConfig.fieldMapping || {};
    const allFields = Object.keys(fieldMapping);
    
    SystemConfig.taskDisplay.taskBarFields = {};
    
    // 從 config 中讀取預設值
    allFields.forEach(fieldKey => {
        SystemConfig.taskDisplay.taskBarFields[fieldKey] = getDefaultFieldValue(fieldKey);
    });

    // 清除 localStorage 中的設置
    try {
        localStorage.removeItem('taskBarFields');
    } catch (e) {
        console.warn('清除設置失敗:', e);
    }

    // 更新 checkbox
    updateSettingsCheckboxes();

    // 重新渲染月曆
    if (calendarInstance) {
        calendarInstance.render();
    } else {
        console.warn('日曆實例不存在，無法重新渲染');
    }

    // 更新圖例（如果 createLegend 函數存在）
    if (typeof createLegend === 'function') {
        createLegend();
    }
}

/**
 * 從 localStorage 載入設置
 */
function loadSettingsFromStorage() {
    try {
        const savedFields = localStorage.getItem('taskBarFields');
        if (savedFields) {
            const fields = JSON.parse(savedFields);
            if (!SystemConfig.taskDisplay) {
                SystemConfig.taskDisplay = {};
            }
            
            // 取得所有欄位的預設值
            const fieldMapping = SystemConfig.fieldMapping || {};
            const allFields = Object.keys(fieldMapping);
            
            // 初始化 taskBarFields
            SystemConfig.taskDisplay.taskBarFields = {};
            
            // 載入保存的設置，或使用預設值
            allFields.forEach(fieldKey => {
                if (fields.hasOwnProperty(fieldKey)) {
                    SystemConfig.taskDisplay.taskBarFields[fieldKey] = fields[fieldKey] === true;
                } else {
                    // 使用預設值（從 config 中讀取）
                    SystemConfig.taskDisplay.taskBarFields[fieldKey] = getDefaultFieldValue(fieldKey);
                }
            });
            
            console.log('已載入任務條顯示設定:', SystemConfig.taskDisplay.taskBarFields);
        }
    } catch (e) {
        console.warn('載入設置失敗:', e);
    }
}
