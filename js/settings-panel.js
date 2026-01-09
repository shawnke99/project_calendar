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
        checkbox.dataset.fieldType = 'taskBar';
        checkbox.checked = isChecked;

        const span = document.createElement('span');
        span.textContent = displayName;

        label.appendChild(checkbox);
        label.appendChild(span);
        optionsContainer.appendChild(label);
    });

    console.log(`已生成 ${allFields.length} 個任務條欄位選項`);
}

/**
 * 生成懸停下拉層欄位選項
 */
function generateHoverDropdownFieldOptions() {
    const optionsContainer = document.getElementById('hoverDropdownFieldsOptions');
    if (!optionsContainer) {
        console.warn('找不到懸停下拉層欄位選項容器');
        return;
    }

    // 清空現有選項
    optionsContainer.innerHTML = '';

    // 取得欄位顯示名稱映射
    const fieldDisplayNames = SystemConfig.fieldDisplayNames || {};
    
    // 取得當前配置（用於讀取 checkbox 的 checked 狀態）
    const hoverDropdownFields = SystemConfig.taskDisplay?.hoverDropdownFields || {};

    // 取得所有可用的欄位
    // 關鍵：必須使用 config 中定義的完整 hoverDropdownFields 配置（包含所有可能的欄位）
    // 即使某些欄位的值為 false，也要生成對應的 checkbox
    const fieldMapping = SystemConfig.fieldMapping || {};
    
    // 優先使用 config 中定義的完整 hoverDropdownFields 配置
    // 這確保所有在 config 中定義的欄位都會生成 checkbox
    let allFields = [];
    if (SystemConfig.taskDisplay?.hoverDropdownFields && Object.keys(SystemConfig.taskDisplay.hoverDropdownFields).length > 0) {
        // 使用 config 中定義的所有欄位（包括值為 false 的欄位）
        allFields = Object.keys(SystemConfig.taskDisplay.hoverDropdownFields);
    } else {
        // 如果 config 中沒有定義，則使用 fieldMapping 中的所有欄位
        allFields = Object.keys(fieldMapping);
    }

    if (allFields.length === 0) {
        console.warn('沒有找到可用的欄位');
        return;
    }

    // 為每個欄位創建 checkbox
    allFields.forEach(fieldKey => {
        const displayName = fieldDisplayNames[fieldKey] || fieldKey;
        const isChecked = hoverDropdownFields[fieldKey] === true;

        const label = document.createElement('label');
        label.className = 'settings-option';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `hover${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
        checkbox.dataset.fieldKey = fieldKey;
        checkbox.dataset.fieldType = 'hoverDropdown';
        checkbox.checked = isChecked;

        const span = document.createElement('span');
        span.textContent = displayName;

        label.appendChild(checkbox);
        label.appendChild(span);
        optionsContainer.appendChild(label);
    });

    console.log(`已生成 ${allFields.length} 個懸停下拉層欄位選項`);
}

/**
 * 更新設置面板的 checkbox 狀態
 */
function updateSettingsCheckboxes() {
    // 先生成選項（如果還沒有生成）
    generateTaskBarFieldOptions();
    generateHoverDropdownFieldOptions();

    // 取得當前配置
    const taskBarFields = SystemConfig.taskDisplay?.taskBarFields || {};
    const hoverDropdownFields = SystemConfig.taskDisplay?.hoverDropdownFields || {};
    const fieldMapping = SystemConfig.fieldMapping || {};
    const allFields = Object.keys(fieldMapping);

    // 更新任務條欄位的 checkbox 狀態
    allFields.forEach(fieldKey => {
        const checkboxId = `show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.checked = taskBarFields[fieldKey] === true;
        }
    });

    // 更新懸停下拉層欄位的 checkbox 狀態
    // 方法：直接從 DOM 中查找所有 hoverDropdown 類型的 checkbox
    const hoverCheckboxes = document.querySelectorAll('input[type="checkbox"][data-field-type="hoverDropdown"]');
    hoverCheckboxes.forEach(checkbox => {
        const fieldKey = checkbox.dataset.fieldKey;
        if (fieldKey && hoverDropdownFields.hasOwnProperty(fieldKey)) {
            checkbox.checked = hoverDropdownFields[fieldKey] === true;
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
    if (!SystemConfig.taskDisplay.hoverDropdownFields) {
        SystemConfig.taskDisplay.hoverDropdownFields = {};
    }

    // 從所有 checkbox 讀取任務條欄位狀態
    allFields.forEach(fieldKey => {
        const checkboxId = `show${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            SystemConfig.taskDisplay.taskBarFields[fieldKey] = checkbox.checked === true;
        }
    });

    // 從所有 checkbox 讀取懸停下拉層欄位狀態
    // 關鍵：先保存當前的 config 值，以便處理 DOM 中沒有 checkbox 的欄位
    const currentHoverDropdownFields = JSON.parse(JSON.stringify(SystemConfig.taskDisplay?.hoverDropdownFields || {}));
    
    // 方法：直接從 DOM 中查找所有 hoverDropdown 類型的 checkbox
    const hoverCheckboxes = document.querySelectorAll('input[type="checkbox"][data-field-type="hoverDropdown"]');
    
    // 先清空，然後從 DOM 讀取
    SystemConfig.taskDisplay.hoverDropdownFields = {};
    
    hoverCheckboxes.forEach(checkbox => {
        const fieldKey = checkbox.dataset.fieldKey;
        if (fieldKey) {
            SystemConfig.taskDisplay.hoverDropdownFields[fieldKey] = checkbox.checked === true;
        }
    });
    
    // 如果 config 中有定義但 DOM 中沒有對應的 checkbox，使用保存的 config 值
    // 這確保所有在 config 中定義的欄位都被保存
    Object.keys(currentHoverDropdownFields).forEach(fieldKey => {
        // 如果 DOM 中沒有這個欄位的 checkbox，使用保存的 config 值
        if (!SystemConfig.taskDisplay.hoverDropdownFields.hasOwnProperty(fieldKey)) {
            SystemConfig.taskDisplay.hoverDropdownFields[fieldKey] = currentHoverDropdownFields[fieldKey];
        }
    });

    // 保存到 localStorage
    try {
        // 確保 hoverDropdownFields 不是空對象
        if (!SystemConfig.taskDisplay.hoverDropdownFields || Object.keys(SystemConfig.taskDisplay.hoverDropdownFields).length === 0) {
            console.warn('hoverDropdownFields 為空，無法保存');
            console.warn('當前 hoverDropdownFields 狀態:', SystemConfig.taskDisplay.hoverDropdownFields);
            console.warn('DOM 中的 checkbox 數量:', document.querySelectorAll('input[type="checkbox"][data-field-type="hoverDropdown"]').length);
        } else {
            const savedData = JSON.stringify(SystemConfig.taskDisplay.hoverDropdownFields);
            localStorage.setItem('hoverDropdownFields', savedData);
            console.log('已保存懸停下拉層顯示設定:', SystemConfig.taskDisplay.hoverDropdownFields);
            console.log('保存的 JSON 字串:', savedData);
            
            // 驗證保存是否成功
            const verify = localStorage.getItem('hoverDropdownFields');
            if (verify === savedData) {
                console.log('✓ 驗證成功：hoverDropdownFields 已正確保存到 localStorage');
            } else {
                console.error('✗ 驗證失敗：hoverDropdownFields 保存後讀取的值不一致');
                console.error('保存的值:', savedData);
                console.error('讀取的值:', verify);
            }
        }
        
        // 確保 taskBarFields 不是空對象
        if (!SystemConfig.taskDisplay.taskBarFields || Object.keys(SystemConfig.taskDisplay.taskBarFields).length === 0) {
            console.warn('taskBarFields 為空，無法保存');
        } else {
            localStorage.setItem('taskBarFields', JSON.stringify(SystemConfig.taskDisplay.taskBarFields));
            console.log('已保存任務條顯示設定:', SystemConfig.taskDisplay.taskBarFields);
        }
    } catch (e) {
        console.warn('保存設置失敗:', e);
        console.error('保存失敗的詳細資訊:', {
            taskBarFields: SystemConfig.taskDisplay?.taskBarFields,
            hoverDropdownFields: SystemConfig.taskDisplay?.hoverDropdownFields,
            error: e
        });
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
 * @param {string} fieldType - 欄位類型 ('taskBar' 或 'hoverDropdown')
 * @returns {boolean} 預設值
 */
function getDefaultFieldValue(fieldKey, fieldType = 'taskBar') {
    if (fieldType === 'hoverDropdown') {
        // 從 config 中讀取懸停下拉層的預設值
        // 注意：在初始化時，SystemConfig.taskDisplay.hoverDropdownFields 可能還沒有被設置
        // 所以我們需要確保能夠從原始 config 中讀取
        // 由於 SystemConfig 是全局對象，我們假設它已經包含了完整的配置
        let defaultHoverDropdownFields = SystemConfig.taskDisplay?.hoverDropdownFields;
        
        // 如果還沒有初始化，嘗試直接從 SystemConfig 的原始結構中讀取
        // 但由於我們無法直接訪問原始 config，我們使用一個備份機制
        if (!defaultHoverDropdownFields || Object.keys(defaultHoverDropdownFields).length === 0) {
            // 如果還沒有初始化，返回 false（預設值）
            // 這會在 loadSettingsFromStorage 中被正確初始化
            return false;
        }
        
        // 如果 config 中有定義該欄位的預設值，使用它
        if (defaultHoverDropdownFields.hasOwnProperty(fieldKey)) {
            return defaultHoverDropdownFields[fieldKey] === true;
        }
        
        // 如果 config 中沒有定義，預設為 false
        return false;
    } else {
        // 從 config 中讀取任務條的預設值
        const defaultTaskBarFields = SystemConfig.taskDisplay?.taskBarFields || {};
        
        // 如果 config 中有定義該欄位的預設值，使用它
        if (defaultTaskBarFields.hasOwnProperty(fieldKey)) {
            return defaultTaskBarFields[fieldKey] === true;
        }
        
        // 如果 config 中沒有定義，預設為 false
        return false;
    }
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
    
    // 重置任務條欄位
    SystemConfig.taskDisplay.taskBarFields = {};
    allFields.forEach(fieldKey => {
        SystemConfig.taskDisplay.taskBarFields[fieldKey] = getDefaultFieldValue(fieldKey, 'taskBar');
    });

    // 重置懸停下拉層欄位
    // 使用 config 中定義的完整 hoverDropdownFields 配置
    const configHoverFields = SystemConfig.taskDisplay?.hoverDropdownFields || {};
    const hoverFields = Object.keys(configHoverFields).length > 0
        ? Object.keys(configHoverFields)
        : allFields;
    SystemConfig.taskDisplay.hoverDropdownFields = {};
    hoverFields.forEach(fieldKey => {
        SystemConfig.taskDisplay.hoverDropdownFields[fieldKey] = getDefaultFieldValue(fieldKey, 'hoverDropdown');
    });

    // 清除 localStorage 中的設置
    try {
        localStorage.removeItem('taskBarFields');
        localStorage.removeItem('hoverDropdownFields');
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
        // 載入任務條欄位設定
        const savedTaskBarFields = localStorage.getItem('taskBarFields');
        if (savedTaskBarFields) {
            const fields = JSON.parse(savedTaskBarFields);
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
                    SystemConfig.taskDisplay.taskBarFields[fieldKey] = getDefaultFieldValue(fieldKey, 'taskBar');
                }
            });
            
            console.log('已載入任務條顯示設定:', SystemConfig.taskDisplay.taskBarFields);
        }

        // 載入懸停下拉層欄位設定
        if (!SystemConfig.taskDisplay) {
            SystemConfig.taskDisplay = {};
        }
        
        // 關鍵：先保存 config 中的原始預設值（在讀取 localStorage 之前）
        // 這樣即使 localStorage 中沒有保存的設置，我們也能使用預設值
        const originalConfigHoverFields = SystemConfig.taskDisplay?.hoverDropdownFields || {};
        
        // 先檢查是否有保存的設置
        const savedHoverDropdownFields = localStorage.getItem('hoverDropdownFields');
        
        if (savedHoverDropdownFields) {
            // 如果有保存的設置，優先載入保存的設置
            try {
                const fields = JSON.parse(savedHoverDropdownFields);
                
                // 取得 config 中定義的欄位列表（用於確保所有欄位都有值）
                const configHoverFields = originalConfigHoverFields;
                const hoverFields = Object.keys(configHoverFields).length > 0
                    ? Object.keys(configHoverFields)
                    : Object.keys(SystemConfig.fieldMapping || {});
                
                // 初始化 hoverDropdownFields（先使用保存的設置）
                SystemConfig.taskDisplay.hoverDropdownFields = {};
                
                // 先載入保存的設置
                Object.keys(fields).forEach(fieldKey => {
                    SystemConfig.taskDisplay.hoverDropdownFields[fieldKey] = fields[fieldKey] === true;
                });
                
                // 確保所有在 config 中定義的欄位都有值（如果保存的設置中沒有，使用預設值）
                hoverFields.forEach(fieldKey => {
                    if (!SystemConfig.taskDisplay.hoverDropdownFields.hasOwnProperty(fieldKey)) {
                        // 如果保存的設置中沒有這個欄位，使用 config 的預設值
                        SystemConfig.taskDisplay.hoverDropdownFields[fieldKey] = configHoverFields[fieldKey] === true;
                    }
                });
                
                console.log('已載入懸停下拉層顯示設定（從 localStorage）:', SystemConfig.taskDisplay.hoverDropdownFields);
            } catch (e) {
                console.warn('解析懸停下拉層設定失敗:', e);
                // 如果解析失敗，使用 config 的預設值
                SystemConfig.taskDisplay.hoverDropdownFields = JSON.parse(JSON.stringify(originalConfigHoverFields));
                console.log('使用預設的懸停下拉層顯示設定（解析失敗）:', SystemConfig.taskDisplay.hoverDropdownFields);
            }
        } else {
            // 如果沒有保存的設置，使用 config 的預設值
            const configHoverFields = originalConfigHoverFields;
            const hoverFields = Object.keys(configHoverFields).length > 0
                ? Object.keys(configHoverFields)
                : Object.keys(SystemConfig.fieldMapping || {});
            
            // 初始化 hoverDropdownFields（使用 config 的預設值）
            SystemConfig.taskDisplay.hoverDropdownFields = {};
            hoverFields.forEach(fieldKey => {
                if (configHoverFields.hasOwnProperty(fieldKey)) {
                    SystemConfig.taskDisplay.hoverDropdownFields[fieldKey] = configHoverFields[fieldKey] === true;
                } else {
                    SystemConfig.taskDisplay.hoverDropdownFields[fieldKey] = getDefaultFieldValue(fieldKey, 'hoverDropdown');
                }
            });
            
            console.log('使用預設的懸停下拉層顯示設定（無保存的設置）:', SystemConfig.taskDisplay.hoverDropdownFields);
        }
    } catch (e) {
        console.warn('載入設置失敗:', e);
    }
}
