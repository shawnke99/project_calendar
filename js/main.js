/**
 * 主程式
 * 初始化應用程式並協調各模組
 */

// 全域變數
let excelReader;
let dataProcessor;
let calendar;
let currentFilter = SystemConfig.filter?.defaultFilter || 'all';

/**
 * 初始化應用程式
 */
async function init() {
    try {
        // 初始化模組（傳入配置）
        excelReader = new ExcelReader(SystemConfig);
        dataProcessor = new DataProcessor(SystemConfig);
        calendar = new Calendar('calendarGrid', dataProcessor, SystemConfig);

        // 設定事件監聽器
        setupEventListeners();

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
        const filePath = 'resource/範例_藍圖之對應時程環境規劃.xlsx';
        console.log('重新讀取 Excel 檔案:', filePath);
        
        const rawData = await excelReader.readExcel(filePath, true); // 使用快取清除

        if (!rawData || rawData.length === 0) {
            throw new Error('Excel 檔案中沒有找到資料');
        }

        // 重新處理資料
        dataProcessor.processData(rawData);

        // 重新設定初始顯示月份（根據資料中的最早日期）
        const taskRanges = dataProcessor.getTaskRanges();
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
        
        if (allDates.length > 0) {
            const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
            earliestDate.setHours(0, 0, 0, 0);
            const initialDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
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
    // 清除 localStorage
    try {
        localStorage.clear();
        console.log('已清除 localStorage');
    } catch (e) {
        console.warn('清除 localStorage 失敗:', e);
    }

    // 清除 sessionStorage
    try {
        sessionStorage.clear();
        console.log('已清除 sessionStorage');
    } catch (e) {
        console.warn('清除 sessionStorage 失敗:', e);
    }

    // 強制重新載入頁面（不使用快取）
    const timestamp = new Date().getTime();
    window.location.href = window.location.pathname + '?nocache=' + timestamp;
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
        // 使用範例檔案作為系統預設資料來源
        const filePath = 'resource/範例_藍圖之對應時程環境規劃.xlsx';
        
        console.log('載入 Excel 檔案:', filePath);
        console.log('檔案路徑確認: 使用範例_藍圖之對應時程環境規劃.xlsx 作為資料來源');
        
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
        const config = SystemConfig.calendar || {};
        let initialDate = null;
        
        // 1. 檢查 config 中的預設日期
        if (config.defaultDate) {
            if (typeof config.defaultDate === 'string') {
                initialDate = new Date(config.defaultDate);
            } else if (config.defaultDate instanceof Date) {
                initialDate = new Date(config.defaultDate);
            }
        } else if (config.defaultYear !== null && config.defaultYear !== undefined) {
            // 2. 使用 config 中的年份和月份
            const year = config.defaultYear;
            const month = config.defaultMonth !== null && config.defaultMonth !== undefined 
                ? config.defaultMonth 
                : 0; // 預設1月
            initialDate = new Date(year, month, 1);
        } else {
            // 3. 從處理後的資料中找出最早日期（使用 taskRanges）
            const taskRanges = dataProcessor.getTaskRanges();
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
            
            if (allDates.length > 0) {
                const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
                earliestDate.setHours(0, 0, 0, 0);
                initialDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
                console.log('從資料中找出最早日期:', initialDate.toISOString().split('T')[0]);
            } else {
                // 4. 使用當前日期
                initialDate = new Date();
                initialDate.setDate(1);
                console.log('使用當前日期:', initialDate.toISOString().split('T')[0]);
            }
        }
        
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
            currentFilter = env.name;
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
            currentFilter = 'all';
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
            label.textContent = `${env.name} - ${env.purpose}`;

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

