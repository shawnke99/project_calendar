/**
 * 系統配置檔案
 * 用於管理顏色、狀態、欄位映射等設定
 */

const SystemConfig = {
    // 特定環境的固定顏色（優先使用）
    environmentSpecificColors: {
        '平測切轉環境': '#10b981',  // 綠色
        '資轉驗證環境': '#dc2626'   // 紅色（可選，如果沒有指定則使用調色盤）
    },

    // 環境顏色調色盤（以紅色系為主，確保與梯次顏色差異明顯）
    environmentColors: [
        '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',  // 深紅色系
        '#ef4444', '#f87171', '#fca5a5', '#fee2e2',  // 亮紅色系
        '#991b1b', '#7f1d1d', '#dc2626', '#b91c1c',  // 深紅色系（重複）
        '#f87171', '#fca5a5', '#ef4444', '#fee2e2',  // 亮紅色系（重複）
        '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',  // 深紅色系（重複）
        '#ef4444', '#f87171', '#fca5a5', '#fee2e2',  // 亮紅色系（重複）
        '#991b1b', '#7f1d1d', '#dc2626', '#b91c1c',  // 深紅色系（重複）
        '#f87171', '#fca5a5', '#ef4444', '#fee2e2'   // 亮紅色系（重複）
    ],

    // 梯次顏色調色盤（以藍色系為主，與環境顏色形成明顯對比）
    batchColors: [
        '#1e3a8a', '#1e40af', '#2563eb', '#3b82f6',  // 深藍色系
        '#60a5fa', '#93c5fd', '#dbeafe', '#eff6ff',  // 亮藍色系
        '#1e40af', '#2563eb', '#1e3a8a', '#3b82f6',  // 深藍色系（重複）
        '#93c5fd', '#dbeafe', '#60a5fa', '#eff6ff',  // 亮藍色系（重複）
        '#1e3a8a', '#1e40af', '#2563eb', '#3b82f6',  // 深藍色系（重複）
        '#60a5fa', '#93c5fd', '#dbeafe', '#eff6ff',  // 亮藍色系（重複）
        '#1e40af', '#2563eb', '#1e3a8a', '#3b82f6',  // 深藍色系（重複）
        '#93c5fd', '#dbeafe', '#60a5fa', '#eff6ff'   // 亮藍色系（重複）
    ],

    // 狀態顏色對應（限定為4個狀態）
    statusColors: {
        '未開始': '#9ca3af',           // 灰色
        'IT前置準備中': '#3b82f6',     // 藍色
        'User測試進行中': '#ef4444',   // 紅色
        '已完成': '#10b981'            // 綠色
    },

    // 狀態優先級（用於排序和顯示）
    statusPriority: {
        '未開始': 1,
        'IT前置準備中': 2,
        'User測試進行中': 3,
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
        remark: ['備注說明', '備註說明', '備注', '備註', '說明', 'remark', 'note', 'comment', '備注說明欄位', '備註說明欄位', '備註欄', '備注欄']
    },

    // 月曆顯示設定
    calendar: {
        maxDisplayTasks: 3,           // 每個日期格子最多顯示的任務數
        maxTasksInBlock: 2,            // 每個環境區塊最多顯示的工作項目數
        dayMinHeight: 120,             // 日期格子的最小高度
        taskBarHeight: 18,             // 跨日期任務條的高度
        gridGap: 2,                    // 格子間距（px）
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
        hoverEffect: true
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
    }
};

// 匯出配置（如果使用模組系統）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemConfig;
}

