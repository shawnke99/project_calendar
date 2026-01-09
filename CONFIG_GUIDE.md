# 系統配置指南

## 概述

系統配置檔案 `js/config.js` 集中管理所有可調整的設定，方便維運人員根據實際需求調整系統行為。

## 配置檔案結構

### 1. 顏色配置

#### 環境顏色調色盤
```javascript
environmentColors: [
    '#dc2626', '#ef4444', '#f87171', '#fca5a5',  // 紅色系
    '#1e3a8a', '#1e40af', '#3b82f6', '#60a5fa',  // 藍色系
    ...
]
```
- **說明**：環境的顏色列表，系統會依序分配
- **擴展**：可以添加更多顏色以支援更多環境
- **建議**：使用對比明顯的顏色，避免相近顏色

#### 梯次顏色調色盤
```javascript
batchColors: [
    '#dc2626', '#ef4444', '#f87171', '#fca5a5',  // 紅色系
    '#1e3a8a', '#1e40af', '#3b82f6', '#60a5fa',  // 藍色系
    ...
]
```
- **說明**：執行梯次的顏色列表
- **擴展**：可以添加更多顏色以支援更多梯次

#### 狀態顏色對應
```javascript
statusColors: {
    '進行中': '#1e40af',
    '待開始': '#dc2626',
    ...
}
```
- **說明**：狀態與顏色的固定對應關係
- **擴展**：可以添加新的狀態及其對應顏色
- **建議**：使用語義化顏色（藍色=進行中，紅色=待開始等）

### 2. 狀態優先級

```javascript
statusPriority: {
    '進行中': 1,
    '測試中': 2,
    ...
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
- **必填欄位**：environment（環境名稱）、purpose（環境目的）、task（工作內容）、startDate（驗證起日）
- **選填欄位**：endDate（驗證迄日）、batch（執行梯次）、status（狀態）
- **擴展欄位**：intermediateFile（中介檔）、dataBaseDate（資料基準日）、kingdomFreezeDate（京城封版日）、kingdomTransferDate（京城傳送中介檔日）、remark（備注說明）

### 4. 月曆顯示設定

```javascript
calendar: {
    maxDisplayTasks: 3,        // 每個日期格子最多顯示的任務數
    maxTasksInBlock: 2,       // 每個環境區塊最多顯示的工作項目數
    dayMinHeight: 120,        // 日期格子的最小高度（px）
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
    consistent: true           // 是否為相同名稱使用相同顏色
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
    hoverEffect: true          // 任務條懸停效果
}
```

### 10. 效能設定

```javascript
performance: {
    virtualScroll: false,      // 是否啟用虛擬滾動
    maxTasksPerPage: 1000,     // 每頁最多渲染的任務數
    lazyLoad: false            // 是否啟用懶加載
}
```

### 11. 除錯設定

```javascript
debug: {
    enabled: false,            // 是否啟用除錯模式
    logLevel: 'info',          // 日誌級別
    showConsoleLogs: false     // 是否顯示控制台日誌
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
8. **中介檔** (intermediateFile)
   - 關鍵字：中介檔、中介檔欄位、中介檔案、intermediate、file

9. **資料基準日** (dataBaseDate)
   - 關鍵字：資料基準日、基準日、data base date、資料基準日期

10. **京城封版日** (kingdomFreezeDate)
    - 關鍵字：京城封版日、封版日、freeze date、封版日期

11. **京城傳送中介檔日** (kingdomTransferDate)
    - 關鍵字：京城傳送中介檔日、傳送中介檔日、傳送日、transfer date、傳送日期

12. **備注說明** (remark)
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
   - 當任務數量 > 1000 時，考慮啟用 `virtualScroll`
   - 調整 `maxTasksPerPage` 以平衡效能和顯示

4. **除錯模式**
   - 開發時啟用 `debug.enabled = true`
   - 生產環境關閉除錯模式

5. **配置備份**
   - 修改配置前先備份
   - 使用版本控制管理配置變更

## 配置驗證

修改配置後，建議：
1. 清除瀏覽器快取
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
