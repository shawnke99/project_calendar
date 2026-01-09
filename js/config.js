/**
 * 系統配置檔案
 * 用於管理顏色、狀態、欄位映射等設定
 */

const SystemConfig = {
    // 特定環境的固定顏色（優先使用）
    environmentSpecificColors: {
        'IT準備': '#16537e',  // 灰色
        '平測切轉環境': '#10b981',  // 綠色
        '資轉驗證環境': '#dc2626'   // 紅色（可選，如果沒有指定則使用調色盤）
    },

    // 環境顏色調色盤（以紅色系為主，確保與梯次顏色差異明顯）
    // 系統會自動循環使用這些顏色，無需重複定義
    environmentColors: [
        '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',  // 深紅色系
        '#ef4444', '#f87171', '#fca5a5', '#fee2e2'   // 亮紅色系
    ],

    // 梯次顏色調色盤（淺到深的藍、紫色系，確保視覺區別明顯）
    batchColors: [
        '#dbeafe',  // 淺藍色 - 第一梯次
        '#93c5fd',  // 中淺藍色 - 第二梯次
        '#3b82f6',  // 中藍色 - 第三梯次
        '#1e40af',  // 深藍色 - 第四梯次
        '#c4b5fd',  // 淺紫色 - 第五梯次
        '#7c3aed'   // 深紫色 - 第六梯次
    ],

    // 狀態顏色對應（限定為4個狀態）
    statusColors: {
        '未開始': '#9ca3af',           // 灰色
        '準備中': '#3b82f6',     // 藍色
        '驗證中': '#ef4444',   // 紅色
        '已完成': '#10b981'            // 綠色
    },

    // 狀態優先級（用於排序和顯示）
    statusPriority: {
        '未開始': 1,
        '準備中': 2,
        '驗證中': 3,
        '已完成': 4
    },

    // Excel 欄位映射關鍵字（可擴展）
    // 系統會按照以下順序匹配欄位：完全匹配 > 部分匹配
    fieldMapping: {
        // 必填欄位
        environment: ['環境名稱', '環境名', '環境', 'env', 'environment', 'environment name'],
        purpose: ['環境目的', '目的', '用途', 'purpose', 'goal', '環境用途'],
        task: ['工作內容', '工作', '任務', '工作項目', '內容', 'task', 'work', 'item', '項目', '工作項'],
        startDate: ['驗證起日', '開始日期', '開始', '起始日期', '開始時間', 'start', 'start date', 'startdate', '起日', '驗證開始日'],
        // 選填欄位
        endDate: ['驗證迄日', '結束日期', '結束', '完成日期', '結束時間', 'end', 'end date', 'enddate', '迄日', '驗證結束日', 'finish'],
        batch: ['執行梯次', '梯次', '批次', 'batch', 'phase', '執行批次', '階段'],
        status: ['狀態', '進度', '完成狀態', 'status', 'progress', '任務狀態', '工作狀態'],
        // 擴展欄位
        intermediateFile: ['中介檔', '中介檔欄位', '中介檔案', 'intermediate', 'file', 'intermediate file', '中介檔名稱'],
        dataBaseDate: ['資料基準日', '資料基準日', '基準日', 'data base date', 'data base', '資料基準日期', '基準日期'],
        kingdomFreezeDate: ['京城封版日', '京城封版日', '封版日', 'freeze date', 'freeze', '封版日期', '京城封版日期'],
        kingdomTransferDate: ['京城傳送中介檔日', '京城傳送中介檔日', '傳送中介檔日', '傳送日', 'transfer date', 'transfer', '傳送日期', '京城傳送日期'],
        businessDate: ['營業日', '營業日期', 'business date', 'business', '營業日日期', 'business day'],
        remark: ['備注說明', '備註說明', '備注', '備註', '說明', 'remark', 'note', 'comment', '備注說明欄位', '備註說明欄位', '備註欄', '備注欄']
    },

    // Excel 檔案路徑設定
    excelFile: {
        // Excel 檔案路徑（相對於網站根目錄）
        path: 'resource/範例_藍圖之對應時程環境規劃.xlsx',
        // 檔案名稱（用於顯示和除錯）
        name: '範例_藍圖之對應時程環境規劃.xlsx'
    },

    // 月曆顯示設定
    calendar: {
        maxDisplayTasks: 3,           // 每個日期格子最多顯示的任務數
        maxTasksInBlock: 3,            // 每個環境區塊最多顯示的工作項目數
        dayMinHeight: 130,             // 日期格子的最小高度
        taskBarHeight: 18,             // 跨日期任務條的高度
        gridGap: 2,                    // 格子間距（px）
        // 多月份顯示設定
        monthsToDisplay: 2,            // 同時顯示的月份數量（1-12，預設為 1，多月份時會上下排列）
        // 預設顯示日期區間（如果資料中沒有日期，或需要指定初始顯示月份）
        defaultYear: null,             // 預設年份（null = 自動使用資料中的最早年份）
        defaultMonth: null,            // 預設月份（0-11，null = 自動使用資料中的最早月份）
        // 或使用固定日期
        defaultDate: null              // 預設日期（Date物件或字串，例如 '2024-01-01'，null = 自動計算）
    },

    // 圖例顯示設定
    legend: {
        showEnvironment: true,          // 顯示環境圖例
        showBatch: true,                // 顯示梯次圖例
        showStatus: true,               // 顯示狀態圖例
        maxItemsPerRow: 4               // 每行最多顯示的圖例項目數
    },

    // 篩選設定
    filter: {
        defaultFilter: 'all',           // 預設篩選（'all' 或環境名稱）
        showAllButton: true             // 顯示「全部顯示」按鈕
    },

    // 日期格式設定
    dateFormat: {
        display: 'YYYY年MM月DD日',     // 顯示格式
        input: ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM-DD-YYYY', 'MM/DD/YYYY']  // 輸入格式
    },

    // 顏色生成策略
    colorStrategy: {
        // 當顏色不夠用時的處理方式：'repeat'（重複使用）或 'generate'（動態生成）
        mode: 'repeat',
        // 是否為相同名稱的環境/梯次使用相同顏色
        consistent: true
    },

    // 任務顯示設定
    taskDisplay: {
        // 是否顯示跨日期任務條
        showSpanningTasks: true,
        // 是否在非開始日期顯示佔位符
        showPlaceholders: true,
        // 任務條懸停效果
        hoverEffect: true,
        // 任務條上顯示的欄位（第一層日曆顯示）
        // 所有 fieldMapping 中的欄位都可以在這裡配置是否顯示
        // 環境名稱預設總是顯示（作為主要識別），但可以通過此配置控制其他欄位
        // 注意：這裡定義的是預設值，當用戶點擊「重置為預設」時會使用這些值
        // 如果 fieldMapping 中有新欄位但這裡沒有定義，預設值為 false
        taskBarFields: {
            environment: true,      // 環境名稱（建議保持為 true，因為是主要識別）
            batch: true,            // 執行梯次
            status: true,           // 狀態
            businessDate: false,    // 營業日
            purpose: true,         // 環境目的
            task: false,            // 工作內容
            startDate: false,       // 開始日期
            endDate: false,         // 結束日期
            dataBaseDate: false,    // 資料基準日
            kingdomFreezeDate: false, // 京城封版日
            kingdomTransferDate: false, // 京城傳送中介檔日
            intermediateFile: false, // 中介檔
            remark: false           // 備注說明
        },
        // 任務條欄位顏色配置（用於圖例說明）
        taskBarFieldColors: {
            environment: null,      // 使用環境的顏色（動態）
            purpose: '#6366f1',     // 紫色
            batch: null,            // 使用梯次的顏色（動態）
            status: null,           // 使用狀態的顏色（動態）
            task: '#8b5cf6',       // 紫色
            startDate: '#10b981',  // 綠色
            endDate: '#ef4444',     // 紅色
            businessDate: '#f59e0b', // 橙色
            dataBaseDate: '#06b6d4', // 青色
            kingdomFreezeDate: '#06b6d4', // 青色
            kingdomTransferDate: '#06b6d4', // 青色
            intermediateFile: '#64748b', // 灰色
            remark: '#64748b'       // 灰色
        }
    },

    // 欄位顯示名稱映射（用於設置面板）
    fieldDisplayNames: {
        environment: '環境名稱',
        purpose: '環境目的',
        task: '工作內容',
        startDate: '開始日期',
        endDate: '結束日期',
        batch: '執行梯次',
        status: '狀態',
        intermediateFile: '中介檔',
        dataBaseDate: '資料基準日',
        kingdomFreezeDate: '京城封版日',
        kingdomTransferDate: '京城傳送中介檔日',
        businessDate: '營業日',
        remark: '備注說明'
    },

    // 效能設定
    performance: {
        // 是否啟用虛擬滾動（當任務很多時）
        virtualScroll: false,
        // 每頁最多渲染的任務數
        maxTasksPerPage: 1000,
        // 是否啟用懶加載
        lazyLoad: false
    },


    // 除錯設定
    debug: {
        enabled: false,                 // 是否啟用除錯模式
        logLevel: 'info',              // 日誌級別：'debug', 'info', 'warn', 'error'
        showConsoleLogs: false         // 是否顯示控制台日誌
    },

    // 非工作日設定
    nonWorkingDays: {
        // 是否啟用非工作日標記
        enabled: true,
        // 非工作日背景顏色（微調）
        backgroundColor: '#f5f5f5',
        // 週末是否視為非工作日
        includeWeekends: true,
        // 自訂非工作日列表（日期範圍或單一日期）
        customDays: [
            // 格式：{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', description: '說明' }
            // 或：{ date: 'YYYY-MM-DD', description: '說明' }
            // 2026年台灣國定假日範例
            { date: '2026-01-01', description: '元旦' },
            { date: '2026-02-08', description: '農曆除夕' },
            { date: '2026-02-09', description: '農曆正月初一' },
            { date: '2026-02-10', description: '農曆正月初二' },
            { date: '2026-02-11', description: '農曆正月初三' },
            { date: '2026-02-12', description: '農曆正月初四' },
            { date: '2026-02-13', description: '農曆正月初五' },
            { date: '2026-02-28', description: '和平紀念日' },
            { date: '2026-04-04', description: '兒童節' },
            { date: '2026-04-05', description: '清明節' },
            { date: '2026-05-01', description: '勞動節' },
            { date: '2026-06-10', description: '端午節' },
            { date: '2026-09-17', description: '中秋節' },
            { date: '2026-10-10', description: '國慶日' },
            { date: '2026-10-11', description: '國慶日補假' }
        ]
    }
};

// 匯出配置（如果使用模組系統）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemConfig;
}

