# 系統配置指南

## 概述

系統配置檔案 `js/config.js` 集中管理所有可調整的設定，方便維運人員根據實際需求調整系統行為。

## 配置檔案結構

### 1. 顏色配置

#### 環境顏色調色盤
```javascript
environmentColors: [
    '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',  // 深紅色系
    '#ef4444', '#f87171', '#fca5a5', '#fee2e2'   // 亮紅色系
]
```
- **說明**：環境的顏色列表，系統會依序分配
- **擴展**：可以添加更多顏色以支援更多環境
- **建議**：使用對比明顯的顏色，避免相近顏色

#### 特定環境固定顏色
```javascript
environmentSpecificColors: {
    'IT準備': '#16537e',
    '平測切轉環境': '#10b981',
    '資轉驗證環境': '#dc2626'
}
```
- **說明**：特定環境的固定顏色（優先使用）
- **用途**：確保重要環境使用固定顏色，便於識別

#### 梯次顏色調色盤
```javascript
batchColors: [
    '#dbeafe',  // 淺藍色 - 第一梯次
    '#93c5fd',  // 中淺藍色 - 第二梯次
    '#3b82f6',  // 中藍色 - 第三梯次
    '#1e40af',  // 深藍色 - 第四梯次
    '#c4b5fd',  // 淺紫色 - 第五梯次
    '#7c3aed'   // 深紫色 - 第六梯次
]
```
- **說明**：執行梯次的顏色列表
- **擴展**：可以添加更多顏色以支援更多梯次

#### 狀態顏色對應
```javascript
statusColors: {
    '未開始': '#9ca3af',  // 灰色
    '準備中': '#3b82f6',  // 藍色
    '驗證中': '#ef4444',  // 紅色
    '已完成': '#10b981'   // 綠色
}
```
- **說明**：狀態與顏色的固定對應關係
- **擴展**：可以添加新的狀態及其對應顏色
- **建議**：使用語義化顏色（藍色=進行中，紅色=待開始等）

### 2. 狀態優先級

```javascript
statusPriority: {
    '未開始': 1,
    '準備中': 2,
    '驗證中': 3,
    '已完成': 4
}
```
- **說明**：用於任務排序，數字越小優先級越高
- **用途**：在月曆中，優先級高的任務會顯示在前面

### 3. Excel 欄位映射

```javascript
fieldMapping: {
    environment: ['環境名稱', '環境名', '環境', ...],
    purpose: ['環境目的', '目的', '用途', ...],
    ...
}
```
- **說明**：定義 Excel 欄位名稱的關鍵字匹配規則
- **擴展**：可以添加更多關鍵字以支援不同的欄位命名方式
- **匹配順序**：完全匹配 > 部分匹配

**支援的欄位**：
- **必填欄位**：environment（環境名稱）、task（工作內容）、startDate（驗證起日）
- **選填欄位**：purpose（環境目的）、endDate（驗證迄日）、batch（執行梯次）、status（狀態）
- **擴展欄位**：businessDate（營業日）、intermediateFile（中介檔）、dataBaseDate（資料基準日）、kingdomFreezeDate（京城封版日）、kingdomTransferDate（京城傳送中介檔日）、remark（備注說明）

**重要說明**：
- 環境目的會根據「環境名稱 + 執行梯次」來決定，同一環境的不同梯次可以有不同的目的
- 如果 Excel 中沒有「環境目的」欄位，系統會使用「未指定目的」作為預設值

### 4. 月曆顯示設定

```javascript
calendar: {
    maxDisplayTasks: 3,        // 每個日期格子最多顯示的任務數
    maxTasksInBlock: 2,       // 每個環境區塊最多顯示的工作項目數
    dayMinHeight: 130,        // 日期格子的最小高度（px）
    taskBarHeight: 18,        // 跨日期任務條的高度（px）
    gridGap: 2,               // 格子間距（px）
    // 預設顯示日期區間
    defaultYear: null,        // 預設年份（null = 自動使用資料中的最早年份）
    defaultMonth: null,       // 預設月份（0-11，null = 自動使用資料中的最早月份）
    defaultDate: null         // 預設日期（Date物件或字串，例如 '2024-01-01'）
}
```

**預設日期設定說明**：
- `defaultDate`：最高優先級，如果設定則直接使用
- `defaultYear` + `defaultMonth`：次優先級，如果設定則使用指定的年月
- 自動計算：如果都為 null，系統會自動從資料中找出最早的日期作為初始顯示月份

### 5. 圖例顯示設定

```javascript
legend: {
    showEnvironment: true,     // 是否顯示環境圖例
    showBatch: true,           // 是否顯示梯次圖例
    showStatus: true,          // 是否顯示狀態圖例
    maxItemsPerRow: 4          // 每行最多顯示的圖例項目數
}
```

### 6. 篩選設定

```javascript
filter: {
    defaultFilter: 'all',      // 預設篩選（'all' 或環境名稱）
    showAllButton: true        // 是否顯示「全部顯示」按鈕
}
```

### 7. 日期格式設定

```javascript
dateFormat: {
    display: 'YYYY年MM月DD日',     // 顯示格式
    input: ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM-DD-YYYY', 'MM/DD/YYYY']  // 輸入格式
}
```

### 8. 顏色生成策略

```javascript
colorStrategy: {
    mode: 'repeat',            // 'repeat'（重複使用）或 'generate'（動態生成）
    consistent: true            // 是否為相同名稱使用相同顏色
}
```

**模式說明**：
- `repeat`：當顏色不夠用時，重複使用調色盤中的顏色
- `generate`：當顏色不夠用時，動態生成新顏色（使用 HSL 色彩空間）

### 9. 任務顯示設定

```javascript
taskDisplay: {
    showSpanningTasks: true,   // 是否顯示跨日期任務條
    showPlaceholders: true,    // 是否在非開始日期顯示佔位符
    hoverEffect: true,         // 任務條懸停效果
    // 任務條上顯示的欄位（預設值）
    taskBarFields: {
        environment: true,      // 環境名稱（建議保持為 true）
        batch: true,            // 執行梯次
        status: true,           // 狀態
        purpose: true,          // 環境目的
        businessDate: false,    // 營業日
        task: false,            // 工作內容
        startDate: false,       // 開始日期
        endDate: false,         // 結束日期
        // ... 其他欄位
    },
    // 任務條欄位顏色配置（用於圖例說明）
    taskBarFieldColors: {
        purpose: '#6366f1',     // 紫色
        businessDate: '#f59e0b', // 橙色
        // ... 其他欄位顏色
    }
}
```

**說明**：
- `taskBarFields`：定義任務條上顯示的欄位預設值，用戶可以通過「顯示設定」面板修改
- `taskBarFieldColors`：定義各欄位在圖例中顯示的顏色

### 10. 欄位顯示名稱映射

```javascript
fieldDisplayNames: {
    environment: '環境名稱',
    purpose: '環境目的',
    batch: '執行梯次',
    status: '狀態',
    businessDate: '營業日',
    // ... 其他欄位
}
```
- **說明**：用於「顯示設定」面板中顯示的欄位名稱
- **用途**：提供用戶友好的欄位名稱顯示

### 11. 效能設定

```javascript
performance: {
    virtualScroll: false,      // 是否啟用虛擬滾動（當任務很多時，只渲染可見區域的日期格子）
    virtualScrollBuffer: 7     // 虛擬滾動緩衝區（在可見區域前後額外渲染的日期格子數量，預設為一週）
}
```

- **`virtualScroll`**：啟用後，系統會使用 IntersectionObserver 來監控可見區域，只渲染可見的日期格子，提高大量任務時的渲染效能。
- **`virtualScrollBuffer`**：設定在可見區域前後額外渲染的日期格子數量，預設為 7（一週），確保滾動時的流暢體驗。

### 12. 除錯設定

```javascript
debug: {
    enabled: false,            // 是否啟用除錯模式
    logLevel: 'info',          // 日誌級別
    showConsoleLogs: false     // 是否顯示控制台日誌
}
```

### 13. 非工作日設定

```javascript
nonWorkingDays: {
    enabled: true,             // 是否啟用非工作日標記
    backgroundColor: '#f5f5f5', // 非工作日背景顏色
    includeWeekends: true,     // 週末是否視為非工作日
    customDays: [              // 自訂非工作日列表
        { date: '2026-01-01', description: '元旦' },
        // ... 其他假日
    ]
}
```

## 常見調整場景

### 場景 1：設定預設顯示月份

**方法 1：使用 defaultDate**
```javascript
calendar: {
    defaultDate: '2024-01-01'  // 直接指定日期
}
```

**方法 2：使用 defaultYear 和 defaultMonth**
```javascript
calendar: {
    defaultYear: 2024,
    defaultMonth: 0  // 0 = 1月, 11 = 12月
}
```

**方法 3：自動計算（預設）**
```javascript
calendar: {
    defaultYear: null,   // 自動從資料中找出最早日期
    defaultMonth: null
}
```

### 場景 2：新增環境

如果環境數量超過調色盤顏色數：

**方法 1：擴展調色盤**
```javascript
environmentColors: [
    // ... 原有顏色
    '#新顏色1', '#新顏色2', ...
]
```

**方法 2：啟用動態生成**
```javascript
colorStrategy: {
    mode: 'generate',  // 改為動態生成
    consistent: true
}
```

### 場景 3：新增狀態

```javascript
statusColors: {
    // ... 原有狀態
    '新狀態': '#顏色代碼'
}

statusPriority: {
    // ... 原有優先級
    '新狀態': 優先級數字
}
```

### 場景 4：調整 Excel 欄位映射

如果 Excel 欄位名稱不同：

```javascript
fieldMapping: {
    environment: ['環境名稱', '您的欄位名稱', ...],
    // ... 其他欄位
}
```

### 場景 5：調整顯示數量

如果任務太多導致顯示擁擠：

```javascript
calendar: {
    maxDisplayTasks: 2,      // 減少顯示數量
    maxTasksInBlock: 1       // 減少每個區塊的任務數
}
```

### 場景 6：隱藏圖例

```javascript
legend: {
    showEnvironment: false,   // 隱藏環境圖例
    showBatch: false,         // 隱藏梯次圖例
    showStatus: true          // 只顯示狀態圖例
}
```

### 場景 7：調整任務條顯示欄位預設值

```javascript
taskDisplay: {
    taskBarFields: {
        environment: true,    // 環境名稱（建議保持為 true）
        batch: true,          // 執行梯次
        status: true,         // 狀態
        purpose: true,        // 環境目的
        businessDate: true,   // 營業日（改為顯示）
        // ... 其他欄位
    }
}
```

## Excel 欄位完整列表

### 必填欄位

1. **環境名稱** (environment)
   - 關鍵字：環境名稱、環境名、環境、env、environment
   - 用途：第一階層分組

2. **工作內容** (task)
   - 關鍵字：工作內容、工作、任務、工作項目、內容、task、work、item、項目
   - 用途：第二階層顯示

3. **驗證起日** (startDate)
   - 關鍵字：驗證起日、開始日期、開始、起始日期、開始時間、start、起日
   - 用途：計算日期範圍

### 選填欄位

4. **環境目的** (purpose)
   - 關鍵字：環境目的、目的、用途、purpose、goal
   - 預設值：未指定目的
   - **重要**：環境目的會根據「環境名稱 + 執行梯次」來決定

5. **驗證迄日** (endDate)
   - 關鍵字：驗證迄日、結束日期、結束、完成日期、結束時間、end、迄日
   - 預設值：使用驗證起日

6. **執行梯次** (batch)
   - 關鍵字：執行梯次、梯次、批次、batch、phase
   - 預設值：未指定梯次

7. **狀態** (status)
   - 關鍵字：狀態、進度、完成狀態、status、progress
   - 預設值：未指定

### 擴展欄位

8. **營業日** (businessDate)
   - 關鍵字：營業日、營業日期、business date、business

9. **中介檔** (intermediateFile)
   - 關鍵字：中介檔、中介檔欄位、中介檔案、intermediate、file

10. **資料基準日** (dataBaseDate)
    - 關鍵字：資料基準日、基準日、data base date、資料基準日期

11. **京城封版日** (kingdomFreezeDate)
    - 關鍵字：京城封版日、封版日、freeze date、封版日期

12. **京城傳送中介檔日** (kingdomTransferDate)
    - 關鍵字：京城傳送中介檔日、傳送中介檔日、傳送日、transfer date、傳送日期

13. **備注說明** (remark)
    - 關鍵字：備注說明、備註說明、備注、備註、說明、remark、note、comment

## 最佳實踐

1. **顏色管理**
   - 定期檢查顏色是否足夠
   - 使用語義化顏色（狀態顏色）
   - 確保顏色對比度足夠（可讀性）

2. **日期設定**
   - 如果資料固定在某個時間範圍，建議設定 `defaultYear` 和 `defaultMonth`
   - 如果資料時間範圍會變動，使用自動計算（設為 null）

3. **效能優化**
   - 當任務數量很多時，考慮啟用 `virtualScroll` 以提高渲染效能
   - 調整 `virtualScrollBuffer` 以平衡效能和滾動流暢度（較大的緩衝區會渲染更多元素，但滾動更流暢）

4. **除錯模式**
   - 開發時啟用 `debug.enabled = true`
   - 生產環境關閉除錯模式

5. **配置備份**
   - 修改配置前先備份
   - 使用版本控制管理配置變更

## 配置驗證

修改配置後，建議：
1. 清除瀏覽器快取（點擊「清除快取」按鈕）
2. 重新載入頁面
3. 檢查控制台是否有錯誤
4. 驗證功能是否正常運作

## 疑難排解

### 問題：顏色不夠用
**解決**：擴展調色盤或啟用動態生成模式

### 問題：欄位無法識別
**解決**：在 `fieldMapping` 中添加對應的關鍵字

### 問題：顯示效能差
**解決**：調整 `performance` 設定或減少顯示數量

### 問題：配置不生效
**解決**：
1. 確認配置檔案已正確載入
2. 清除瀏覽器快取
3. 檢查 JavaScript 錯誤

### 問題：預設月份不正確
**解決**：
1. 檢查 `calendar.defaultDate`、`defaultYear`、`defaultMonth` 設定
2. 確認資料中是否有有效的日期欄位
3. 啟用除錯模式查看日誌

### 問題：環境目的顯示錯誤
**解決**：
1. 確認環境目的會根據「環境名稱 + 執行梯次」來決定
2. 檢查 Excel 中是否有正確的「環境目的」欄位
3. 確認同一環境的不同梯次是否有不同的目的
