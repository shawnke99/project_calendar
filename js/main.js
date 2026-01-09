/**
 * 主程式
 * 初始化應用程式並協調各模組
 */

// 全域變數
let excelReader;
let dataProcessor;
let calendar;

/**
 * 從任務範圍中計算最早的日期
 * @param {Map} taskRanges - 任務範圍映射
 * @returns {Date|null} 最早的日期，如果沒有則返回 null
 */
function getEarliestDateFromRanges(taskRanges) {
    const allDates = [];
    
    taskRanges.forEach(range => {
        if (range.startDate) {
            const date = new Date(range.startDate);
            date.setHours(0, 0, 0, 0);
            allDates.push(date);
        }
        if (range.endDate) {
            const date = new Date(range.endDate);
            date.setHours(0, 0, 0, 0);
            allDates.push(date);
        }
    });
    
    if (allDates.length === 0) {
        return null;
    }
    
    const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    earliestDate.setHours(0, 0, 0, 0);
    return new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
}

/**
 * 計算初始顯示日期
 * @returns {Date|null} 初始日期
 */
function calculateInitialDate() {
    const config = SystemConfig.calendar || {};
    
    // 1. 檢查 config 中的預設日期
    if (config.defaultDate) {
        if (typeof config.defaultDate === 'string') {
            return new Date(config.defaultDate);
        } else if (config.defaultDate instanceof Date) {
            return new Date(config.defaultDate);
        }
    }
    
    // 2. 使用 config 中的年份和月份
    if (config.defaultYear !== null && config.defaultYear !== undefined) {
        const year = config.defaultYear;
        const month = config.defaultMonth !== null && config.defaultMonth !== undefined 
            ? config.defaultMonth 
            : 0; // 預設1月
        return new Date(year, month, 1);
    }
    
    // 3. 從處理後的資料中找出最早日期
    const taskRanges = dataProcessor.getTaskRanges();
    const initialDate = getEarliestDateFromRanges(taskRanges);
    
    if (initialDate) {
        console.log('從資料中找出最早日期:', initialDate.toISOString().split('T')[0]);
        return initialDate;
    }
    
    // 4. 使用當前日期
    const currentDate = new Date();
    currentDate.setDate(1);
    console.log('使用當前日期:', currentDate.toISOString().split('T')[0]);
    return currentDate;
}

/**
 * 初始化應用程式
 */
async function init() {
    try {
        // 從 localStorage 載入設置
        loadSettingsFromStorage();

        // 初始化模組（傳入配置）
        excelReader = new ExcelReader(SystemConfig);
        dataProcessor = new DataProcessor(SystemConfig);
        calendar = new Calendar('calendarGrid', dataProcessor, SystemConfig);

        // 設定日曆實例給設置面板模組
        if (typeof setCalendarInstance === 'function') {
            setCalendarInstance(calendar);
        }

        // 設定事件監聽器
        setupEventListeners();

        // 初始化設置面板（生成動態選項）
        if (typeof generateTaskBarFieldOptions === 'function') {
            generateTaskBarFieldOptions();
        }

        // 載入 Excel 檔案
        await loadExcelFile();

    } catch (error) {
        showError(`初始化失敗: ${error.message}`);
        console.error('初始化錯誤:', error);
    }
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    // 月份切換按鈕
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            calendar.previousMonth();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            calendar.nextMonth();
        });
    }

    // 彈窗關閉
    const modal = document.getElementById('taskModal');
    const closeBtn = modal?.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    // ESC 鍵關閉彈窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });

    // 清除快取按鈕
    const clearCacheBtn = document.getElementById('clearCache');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            clearCacheAndReload();
        });
    }

    // 重新讀取 Excel 按鈕
    const reloadExcelBtn = document.getElementById('reloadExcel');
    if (reloadExcelBtn) {
        reloadExcelBtn.addEventListener('click', () => {
            reloadExcelFile();
        });
    }

    // 設置面板相關事件
    if (typeof setupSettingsPanel === 'function') {
        setupSettingsPanel();
    }
}

/**
 * 從 localStorage 載入設置
 * 注意：實際的設置面板邏輯已移至 settings-panel.js
 * 此函數在 settings-panel.js 中定義，如果該文件已載入則會覆蓋此函數
 */
function loadSettingsFromStorage() {
    // 如果 settings-panel.js 已載入，其 loadSettingsFromStorage 會覆蓋此函數
    // 此處保留作為後備實現
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
                    const defaultTaskBarFields = SystemConfig.taskDisplay?.taskBarFields || {};
                    SystemConfig.taskDisplay.taskBarFields[fieldKey] = 
                        defaultTaskBarFields.hasOwnProperty(fieldKey) 
                            ? defaultTaskBarFields[fieldKey] === true 
                            : false;
                }
            });
            
            console.log('已載入任務條顯示設定:', SystemConfig.taskDisplay.taskBarFields);
        }
    } catch (e) {
        console.warn('載入設置失敗:', e);
    }
}

/**
 * 重新讀取 Excel 檔案（不重新載入頁面）
 */
async function reloadExcelFile() {
    const reloadBtn = document.getElementById('reloadExcel');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');

    try {
        // 禁用按鈕，防止重複點擊
        if (reloadBtn) {
            reloadBtn.disabled = true;
            reloadBtn.textContent = '載入中...';
        }

        // 顯示載入狀態
        if (loadingIndicator) {
            loadingIndicator.classList.add('active');
        }
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }

        // 重新讀取 Excel 檔案（使用快取清除參數）
        const filePath = SystemConfig.excelFile?.path || 'resource/範例_藍圖之對應時程環境規劃.xlsx';
        console.log('重新讀取 Excel 檔案:', filePath);
        
        const rawData = await excelReader.readExcel(filePath, true); // 使用快取清除

        if (!rawData || rawData.length === 0) {
            throw new Error('Excel 檔案中沒有找到資料');
        }

        // 重新處理資料
        dataProcessor.processData(rawData);

        // 重新設定初始顯示月份（根據資料中的最早日期）
        const initialDate = getEarliestDateFromRanges(dataProcessor.getTaskRanges());
        if (initialDate) {
            calendar.currentDate = new Date(initialDate);
        }

        // 重新渲染月曆
        setTimeout(() => {
            calendar.render();
            createEnvironmentFilters();
            createLegend();
        }, 200);

        console.log('Excel 檔案重新載入成功:', {
            records: rawData.length,
            environments: dataProcessor.getEnvironments().length
        });

    } catch (error) {
        const errorMsg = `重新載入 Excel 檔案失敗: ${error.message}\n\n請檢查：\n1. Excel 檔案是否存在於 resource/ 目錄\n2. 檔案格式是否正確\n3. 是否包含必要的欄位（環境、工作內容等）\n\n詳細錯誤請查看瀏覽器控制台（按 F12）`;
        showError(errorMsg);
        console.error('重新載入錯誤:', error);
    } finally {
        // 恢復按鈕狀態
        if (reloadBtn) {
            reloadBtn.disabled = false;
            reloadBtn.textContent = '📄 重新讀取';
        }

        // 隱藏載入狀態
        if (loadingIndicator) {
            loadingIndicator.classList.remove('active');
        }
    }
}

/**
 * 清除快取並重新載入頁面
 */
function clearCacheAndReload() {
    console.log('開始清除快取...');
    
    // 清除 localStorage
    try {
        const localStorageKeys = Object.keys(localStorage);
        localStorage.clear();
        console.log('已清除 localStorage，共清除', localStorageKeys.length, '個項目:', localStorageKeys);
    } catch (e) {
        console.warn('清除 localStorage 失敗:', e);
    }

    // 清除 sessionStorage（但保留 _cache_cleared_ 標記，避免影響 _nocache 處理）
    try {
        const sessionStorageKeys = Object.keys(sessionStorage);
        // 只清除非 _cache_cleared_ 的項目
        sessionStorageKeys.forEach(key => {
            if (!key.startsWith('_cache_cleared_')) {
                sessionStorage.removeItem(key);
            }
        });
        console.log('已清除 sessionStorage（保留 _nocache 標記），共清除', 
            sessionStorageKeys.filter(k => !k.startsWith('_cache_cleared_')).length, '個項目');
    } catch (e) {
        console.warn('清除 sessionStorage 失敗:', e);
    }

    // 生成時間戳
    const timestamp = new Date().getTime();
    
    // 添加禁用快取的 meta 標籤（如果還沒有）
    let noCacheMeta = document.querySelector('meta[http-equiv="Cache-Control"]');
    if (!noCacheMeta) {
        noCacheMeta = document.createElement('meta');
        noCacheMeta.setAttribute('http-equiv', 'Cache-Control');
        document.head.appendChild(noCacheMeta);
    }
    noCacheMeta.setAttribute('content', 'no-cache, no-store, must-revalidate');
    
    // 添加 Pragma meta 標籤
    let pragmaMeta = document.querySelector('meta[http-equiv="Pragma"]');
    if (!pragmaMeta) {
        pragmaMeta = document.createElement('meta');
        pragmaMeta.setAttribute('http-equiv', 'Pragma');
        document.head.appendChild(pragmaMeta);
    }
    pragmaMeta.setAttribute('content', 'no-cache');
    
    // 添加 Expires meta 標籤
    let expiresMeta = document.querySelector('meta[http-equiv="Expires"]');
    if (!expiresMeta) {
        expiresMeta = document.createElement('meta');
        expiresMeta.setAttribute('http-equiv', 'Expires');
        document.head.appendChild(expiresMeta);
    }
    expiresMeta.setAttribute('content', '0');

    console.log('清除快取完成，準備重新載入頁面（時間戳:', timestamp, '）...');
    
    // 使用時間戳重新載入，並更新所有 script 標籤的版本號
    // 注意：版本號會由 HTML 中的腳本根據 _nocache 參數自動更新
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('_nocache', timestamp);
    console.log('重新載入 URL:', currentUrl.toString());
    console.log('提示：所有文件的版本號將自動更新為時間戳，以確保清除快取');
    
    // 強制清除所有快取並重新載入
    // 使用 replace 確保瀏覽器不會使用快取
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
                console.log('已清除快取:', name);
            });
        }).then(() => {
            window.location.replace(currentUrl.toString());
        });
    } else {
        window.location.replace(currentUrl.toString());
    }
}

/**
 * 載入 Excel 檔案
 */
async function loadExcelFile() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');

    try {
        // 顯示載入狀態
        if (loadingIndicator) {
            loadingIndicator.classList.add('active');
        }
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }

        // 讀取 Excel 檔案
        // 從配置中取得檔案路徑
        const filePath = SystemConfig.excelFile?.path || 'resource/範例_藍圖之對應時程環境規劃.xlsx';
        const fileName = SystemConfig.excelFile?.name || '範例_藍圖之對應時程環境規劃.xlsx';
        
        console.log('載入 Excel 檔案:', filePath);
        console.log('檔案名稱:', fileName);
        
        // 使用快取清除參數，確保讀取最新檔案
        const rawData = await excelReader.readExcel(filePath, true);
        
        // 檢查資料年份
        if (rawData && rawData.length > 0) {
            const firstRecord = rawData[0];
            if (firstRecord.startDate) {
                const firstYear = new Date(firstRecord.startDate).getFullYear();
                console.log('資料年份檢查: 第一筆資料的年份為', firstYear, '年');
            }
        }

        if (!rawData || rawData.length === 0) {
            throw new Error('Excel 檔案中沒有找到資料');
        }

        // 處理資料
        dataProcessor.processData(rawData);

        // 設定初始顯示月份（優先順序：config設定 > 資料中的最早日期 > 當前日期）
        const initialDate = calculateInitialDate();
        
        if (initialDate) {
            // 確保設定正確的日期
            calendar.currentDate = new Date(initialDate);
            console.log('設定初始日期為:', calendar.currentDate.toISOString().split('T')[0]);
            console.log('當前月份:', calendar.currentDate.getFullYear(), '年', calendar.currentDate.getMonth() + 1, '月');
        }

        // 渲染月曆（使用 setTimeout 確保 DOM 已準備好）
        setTimeout(() => {
            calendar.render();
        }, 200);

        // 建立環境篩選器
        createEnvironmentFilters();

        // 建立圖例
        createLegend();

        console.log('資料載入成功:', {
            records: rawData.length,
            environments: dataProcessor.getEnvironments().length
        });

    } catch (error) {
        const errorMsg = `載入 Excel 檔案失敗: ${error.message}\n\n請檢查：\n1. Excel 檔案是否存在於 resource/ 目錄\n2. 檔案格式是否正確\n3. 是否包含必要的欄位（環境、工作內容等）\n\n詳細錯誤請查看瀏覽器控制台（按 F12）`;
        showError(errorMsg);
        console.error('載入錯誤:', error);
        console.error('錯誤堆疊:', error.stack);
    } finally {
        // 隱藏載入狀態
        if (loadingIndicator) {
            loadingIndicator.classList.remove('active');
        }
    }
}

/**
 * 建立環境篩選器
 */
function createEnvironmentFilters() {
    const filterContainer = document.getElementById('environmentFilters');
    if (!filterContainer) return;

    // 清除現有篩選器（保留「全部顯示」按鈕）
    const allBtn = filterContainer.querySelector('[data-env="all"]');
    filterContainer.innerHTML = '';
    if (allBtn) {
        filterContainer.appendChild(allBtn);
    }

    // 取得所有環境
    const environments = dataProcessor.getEnvironments();

    environments.forEach(env => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = env.name;
        btn.dataset.env = env.name;
        btn.style.borderLeftColor = env.color;
        btn.style.borderLeftWidth = '4px';

        btn.addEventListener('click', () => {
            // 更新按鈕狀態
            filterContainer.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');

            // 更新篩選
            calendar.setFilter(env.name);
        });

        filterContainer.appendChild(btn);
    });

    // 「全部顯示」按鈕事件
    const allButton = filterContainer.querySelector('[data-env="all"]');
    if (allButton) {
        allButton.addEventListener('click', () => {
            filterContainer.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            allButton.classList.add('active');
            calendar.setFilter('all');
        });
    }
}

/**
 * 建立圖例
 */
function createLegend() {
    const legendContainer = document.getElementById('legend');
    if (!legendContainer) return;

    legendContainer.innerHTML = '';
    const config = SystemConfig.legend || {};

    // 環境圖例
    if (config.showEnvironment !== false) {
        const envSection = document.createElement('div');
        envSection.className = 'legend-section-group';
        envSection.setAttribute('data-type', 'environment');
        const envTitle = document.createElement('h4');
        envTitle.textContent = '環境';
        envSection.appendChild(envTitle);

        const environments = dataProcessor.getEnvironments();
        environments.forEach(env => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';

            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = env.color;

            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = `${env.name}`;

            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            envSection.appendChild(legendItem);
        });
        legendContainer.appendChild(envSection);
    }

    // 梯次圖例
    if (config.showBatch !== false) {
        const batches = dataProcessor.getBatches();
        if (batches.length > 0) {
            const batchSection = document.createElement('div');
            batchSection.className = 'legend-section-group';
            batchSection.setAttribute('data-type', 'batch');
            const batchTitle = document.createElement('h4');
            batchTitle.textContent = '執行梯次';
            batchSection.appendChild(batchTitle);

            const batchColorMap = dataProcessor.getBatchColorMap();
            batches.forEach(batch => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';

                const colorBox = document.createElement('div');
                colorBox.className = 'legend-color';
                colorBox.style.backgroundColor = batchColorMap.get(batch);

                const label = document.createElement('span');
                label.className = 'legend-label';
                label.textContent = batch;

                legendItem.appendChild(colorBox);
                legendItem.appendChild(label);
                batchSection.appendChild(legendItem);
            });
            legendContainer.appendChild(batchSection);
        }
    }

    // 狀態圖例
    if (config.showStatus !== false) {
        const statusSection = document.createElement('div');
        statusSection.className = 'legend-section-group';
        statusSection.setAttribute('data-type', 'status');
        const statusTitle = document.createElement('h4');
        statusTitle.textContent = '狀態';
        statusSection.appendChild(statusTitle);

        const statusColorMap = dataProcessor.getStatusColorMap();
        Object.entries(statusColorMap).forEach(([status, color]) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';

            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = color;

            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = status;

            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            statusSection.appendChild(legendItem);
        });
        legendContainer.appendChild(statusSection);
    }

    // 顯示設定欄位圖例（顯示在任務條上的欄位及其顏色）
    const taskBarFields = SystemConfig.taskDisplay?.taskBarFields || {};
    const taskBarFieldColors = SystemConfig.taskDisplay?.taskBarFieldColors || {};
    const fieldDisplayNames = SystemConfig.fieldDisplayNames || {};
    const enabledFields = Object.entries(taskBarFields)
        .filter(([fieldKey, enabled]) => enabled === true && fieldKey !== 'environment' && fieldKey !== 'batch' && fieldKey !== 'status')
        .map(([fieldKey]) => fieldKey);

    if (enabledFields.length > 0) {
        const fieldSection = document.createElement('div');
        fieldSection.className = 'legend-section-group';
        fieldSection.setAttribute('data-type', 'taskBarFields');
        const fieldTitle = document.createElement('h4');
        fieldTitle.textContent = '任務條顯示欄位';
        fieldSection.appendChild(fieldTitle);

        enabledFields.forEach(fieldKey => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';

            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            
            // 取得欄位顏色
            let fieldColor = taskBarFieldColors[fieldKey];
            
            // 如果沒有配置顏色，使用預設顏色
            if (!fieldColor) {
                // 根據欄位類型設置預設顏色
                switch(fieldKey) {
                    case 'businessDate':
                        fieldColor = '#f59e0b'; // 橙色
                        break;
                    case 'dataBaseDate':
                    case 'kingdomFreezeDate':
                    case 'kingdomTransferDate':
                        fieldColor = '#06b6d4'; // 青色
                        break;
                    case 'intermediateFile':
                    case 'remark':
                        fieldColor = '#64748b'; // 灰色
                        break;
                    case 'startDate':
                        fieldColor = '#10b981'; // 綠色
                        break;
                    case 'endDate':
                        fieldColor = '#ef4444'; // 紅色
                        break;
                    case 'purpose':
                        fieldColor = '#6366f1'; // 紫色
                        break;
                    case 'task':
                        fieldColor = '#8b5cf6'; // 紫色
                        break;
                    default:
                        fieldColor = '#64748b'; // 預設灰色
                }
            }
            
            colorBox.style.backgroundColor = fieldColor;

            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = fieldDisplayNames[fieldKey] || fieldKey;

            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            fieldSection.appendChild(legendItem);
        });
        legendContainer.appendChild(fieldSection);
    }
}

/**
 * 顯示錯誤訊息
 * @param {string} message - 錯誤訊息
 */
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    console.error(message);
}

// 當頁面載入完成時初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

