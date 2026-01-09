/**
 * Excel 讀取模組
 * 負責讀取和解析 Excel 檔案
 */

class ExcelReader {
    // 預設值常數
    static DEFAULT_PURPOSE = '未指定目的';
    static DEFAULT_ENVIRONMENT = '未命名環境';
    static DEFAULT_STATUS = '未開始';
    static UNSPECIFIED_STATUS = '未指定';

    constructor(config = SystemConfig) {
        this.rawData = null;
        this.config = config;
    }

    /**
     * 統一的錯誤處理方法
     * @param {string} operation - 操作名稱
     * @param {Error} error - 錯誤物件
     * @returns {Error} 格式化的錯誤訊息
     */
    handleError(operation, error) {
        const message = `${operation}失敗: ${error.message}`;
        if (this.config.debug?.showConsoleLogs) {
            console.error(message, error);
        }
        return new Error(message);
    }

    /**
     * 讀取 Excel 檔案
     * @param {File|string} file - 檔案物件或檔案路徑
     * @returns {Promise<Array>} 解析後的資料陣列
     */
    async readExcel(file, useCacheBust = false) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof file === 'string') {
                    // 如果是路徑，使用 fetch 讀取
                    this.readExcelFromPath(file, useCacheBust)
                        .then(resolve)
                        .catch(reject);
                } else if (file instanceof File) {
                    // 如果是 File 物件，使用 FileReader
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const result = this.parseWorkbook(workbook);
                            this.rawData = result;
                            resolve(result);
                        } catch (error) {
                            reject(this.handleError('解析 Excel 檔案', error));
                        }
                    };
                    reader.onerror = () => reject(new Error('讀取檔案失敗'));
                    reader.readAsArrayBuffer(file);
                } else {
                    reject(new Error('不支援的檔案格式'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 從路徑讀取 Excel 檔案
     * @param {string} filePath - 檔案路徑
     * @returns {Promise<Array>}
     */
    async readExcelFromPath(filePath, useCacheBust = false) {
        try {
            // 如果需要清除快取，添加時間戳
            let finalPath = filePath;
            if (useCacheBust) {
                const separator = filePath.includes('?') ? '&' : '?';
                finalPath = `${filePath}${separator}t=${new Date().getTime()}`;
            }
            
            const response = await fetch(finalPath);
            if (!response.ok) {
                throw new Error(`無法載入檔案: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const result = this.parseWorkbook(workbook);
            this.rawData = result;
            return result;
        } catch (error) {
            throw this.handleError('讀取 Excel 檔案', error);
        }
    }

    /**
     * 解析 Workbook
     * @param {Object} workbook - XLSX workbook 物件
     * @returns {Array} 解析後的資料
     */
    parseWorkbook(workbook) {
        const result = [];
        const sheetName = workbook.SheetNames[0]; // 使用第一個工作表
        const worksheet = workbook.Sheets[sheetName];
        
        // 將工作表轉換為 JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, // 使用陣列格式
            defval: '' // 空值預設為空字串
        });

        console.log('Excel 資料行數:', jsonData.length);
        console.log('前 5 行資料:', jsonData.slice(0, 5));

        if (jsonData.length < 1) {
            throw new Error('Excel 檔案為空');
        }

        // 找出標題列（可能是第一列或前幾列）
        let headerRowIndex = 0;
        let headers = [];
        
        // 嘗試找到標題列（包含最多非空欄位的列）
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            const row = jsonData[i];
            const nonEmptyCount = row ? row.filter(cell => cell && String(cell).trim() !== '').length : 0;
            if (nonEmptyCount > headers.length) {
                headers = row.map(h => String(h || '').trim());
                headerRowIndex = i;
            }
        }

        // 如果還是找不到標題，使用第一列
        if (headers.length === 0 || headers.every(h => h === '')) {
            headers = jsonData[0].map(h => String(h || '').trim());
            headerRowIndex = 0;
        }

        console.log('找到的標題列（第', headerRowIndex + 1, '列）:', headers);
        
        // 找出關鍵欄位的索引
        const headerMap = this.mapHeaders(headers);
        console.log('欄位映射:', headerMap);

        // 如果找不到關鍵欄位，嘗試更寬鬆的匹配
        if (!headerMap.environment && !headerMap.task) {
            console.warn('無法自動識別欄位，嘗試使用前幾列作為資料');
            // 嘗試將前幾列作為資料處理
            for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 10, jsonData.length); i++) {
                const row = jsonData[i];
                if (this.isEmptyRow(row)) continue;
                
                // 嘗試從不同位置提取資料
                const record = this.parseRowFlexible(row, headers, headerMap);
                if (record) {
                    result.push(record);
                }
            }
        } else {
            // 處理資料列（從標題列之後開始）
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (this.isEmptyRow(row)) continue;

                const record = this.parseRow(row, headerMap, headers);
                if (record) {
                    result.push(record);
                }
            }
        }

        console.log('解析後的資料筆數:', result.length);
        if (result.length > 0) {
            console.log('第一筆資料範例:', result[0]);
        }

        if (result.length === 0) {
            throw new Error('Excel 檔案中沒有找到有效資料。請檢查：\n1. 是否包含「環境」或「工作」相關欄位\n2. 資料是否在正確的工作表中\n3. 標題列是否正確');
        }

        return result;
    }

    /**
     * 映射標題欄位
     * @param {Array} headers - 標題陣列
     * @returns {Object} 欄位索引對應
     */
    mapHeaders(headers) {
        const map = {};
        const fieldMapping = this.config.fieldMapping || {};
        
        if (this.config.debug?.showConsoleLogs) {
            console.log('開始映射欄位，標題列:', headers);
        }
        
        // 使用配置中的欄位映射關鍵字（按優先級排序）
        // 必填欄位優先，選填欄位次之，擴展欄位最後
        const mappingOrder = [
            // 必填欄位（優先匹配）
            'environment', 'purpose', 'task', 'startDate',
            // 選填欄位
            'endDate', 'batch', 'status',
            // 擴展欄位
            'intermediateFile', 'dataBaseDate', 'kingdomFreezeDate', 
            'kingdomTransferDate', 'remark'
        ];
        
        // 第一輪：完全匹配
        for (let index = 0; index < headers.length; index++) {
            const header = headers[index];
            if (!header || header === '') continue;
            
            const headerStr = String(header).trim();
            const headerLower = headerStr.toLowerCase();
            
            for (const fieldKey of mappingOrder) {
                if (map[fieldKey] !== undefined) continue;
                
                const keywords = fieldMapping[fieldKey] || [];
                for (const keyword of keywords) {
                    if (headerStr === keyword || headerLower === keyword.toLowerCase()) {
                        map[fieldKey] = index;
                        if (this.config.debug?.showConsoleLogs) {
                            console.log(`找到${fieldKey}: 索引 ${index}, 值: "${headerStr}"`);
                        }
                        break;
                    }
                }
            }
        }
        
        // 第二輪：部分匹配
        for (let index = 0; index < headers.length; index++) {
            const header = headers[index];
            if (!header || header === '') continue;
            
            const headerStr = String(header).trim();
            const headerLower = headerStr.toLowerCase();
            
            for (const fieldKey of mappingOrder) {
                if (map[fieldKey] !== undefined) continue;
                
                const keywords = fieldMapping[fieldKey] || [];
                for (const keyword of keywords) {
                    const keywordLower = keyword.toLowerCase();
                    if (headerLower.includes(keywordLower) || keywordLower.includes(headerLower)) {
                        map[fieldKey] = index;
                        if (this.config.debug?.showConsoleLogs) {
                            console.log(`找到${fieldKey}: 索引 ${index}, 值: "${headerStr}" (部分匹配)`);
                        }
                        break;
                    }
                }
            }
        }

        // 如果環境名稱沒找到，嘗試從其他位置找
        if (!map.environment) {
            for (let index = 0; index < headers.length; index++) {
                const header = headers[index];
                if (!header || header === '') continue;
                const headerStr = String(header).trim();
                const headerLower = headerStr.toLowerCase();
                if (headerLower.includes('環境') && !headerLower.includes('目的')) {
                    map.environment = index;
                    if (this.config.debug?.showConsoleLogs) {
                        console.log(`備用找到環境名稱: 索引 ${index}, 值: "${headerStr}"`);
                    }
                    break;
                }
            }
        }

        if (this.config.debug?.showConsoleLogs) {
            console.log('最終欄位映射:', map);
        }
        return map;
    }

    /**
     * 解析單一資料列
     * @param {Array} row - 資料列
     * @param {Object} headerMap - 欄位映射
     * @param {Array} headers - 標題陣列
     * @returns {Object|null} 解析後的記錄
     */
    parseRow(row, headerMap, headers) {
        const record = {};
        record.customFields = {}; // 儲存所有未映射的欄位

        // 環境名稱與目的（可能在同一欄位或分開）
        if (headerMap.environment !== undefined) {
            const envValue = String(row[headerMap.environment] || '').trim();
            if (envValue) {
                // 檢查是否包含目的（用分隔符號分開）
                const parts = envValue.split(/[：:]/);
                record.environment = parts[0].trim();
                if (parts.length > 1) {
                    record.purpose = parts.slice(1).join(':').trim();
                }
            }
        }

        // 環境目的（如果分開的欄位）
        if (headerMap.purpose !== undefined && !record.purpose) {
            record.purpose = String(row[headerMap.purpose] || '').trim();
        }

        // 如果還是沒有目的，設為預設值
        if (!record.purpose) {
            record.purpose = ExcelReader.DEFAULT_PURPOSE;
        }

        // 執行梯次
        if (headerMap.batch !== undefined) {
            record.batch = String(row[headerMap.batch] || '').trim();
        }

        // 工作內容
        if (headerMap.task !== undefined) {
            record.task = String(row[headerMap.task] || '').trim();
        }

        // 開始日期
        if (headerMap.startDate !== undefined) {
            record.startDate = this.parseDate(row[headerMap.startDate]);
        }

        // 結束日期
        if (headerMap.endDate !== undefined) {
            record.endDate = this.parseDate(row[headerMap.endDate]);
        }

        // 狀態
        if (headerMap.status !== undefined) {
            record.status = String(row[headerMap.status] || '').trim();
        } else {
            record.status = ExcelReader.DEFAULT_STATUS; // 預設為「未開始」
        }

        // 已知的擴展欄位（如果存在）
        if (headerMap.dataBaseDate !== undefined) {
            record.dataBaseDate = this.parseDate(row[headerMap.dataBaseDate]);
        }

        if (headerMap.kingdomFreezeDate !== undefined) {
            record.kingdomFreezeDate = this.parseDate(row[headerMap.kingdomFreezeDate]);
        }

        if (headerMap.kingdomTransferDate !== undefined) {
            record.kingdomTransferDate = this.parseDate(row[headerMap.kingdomTransferDate]);
        }

        if (headerMap.remark !== undefined) {
            record.remark = String(row[headerMap.remark] || '').trim();
        }

        // 動態讀取所有未映射的欄位（包括空值）
        const mappedIndices = new Set(Object.values(headerMap).filter(idx => idx !== undefined));
        for (let index = 0; index < headers.length && index < row.length; index++) {
            if (!mappedIndices.has(index)) {
                const header = String(headers[index] || '').trim();
                if (header) {
                    const value = row[index];
                    // 嘗試判斷是否為日期
                    if (value instanceof Date) {
                        record.customFields[header] = value;
                    } else if (typeof value === 'number' && value > 25569) {
                        // 可能是 Excel 日期序列號
                        record.customFields[header] = this.parseDate(value);
                    } else {
                        // 一般文字或數字（包括空值）
                        const strValue = String(value || '').trim();
                        // 即使為空也保存，以便顯示所有欄位
                        record.customFields[header] = strValue || '';
                    }
                }
            }
        }
        
        // 同時保存已知欄位到 customFields（確保所有欄位都顯示）
        if (headerMap.dataBaseDate !== undefined) {
            const header = headers[headerMap.dataBaseDate] || '資料基準日';
            record.customFields[header] = record.dataBaseDate || '';
        }
        if (headerMap.kingdomFreezeDate !== undefined) {
            const header = headers[headerMap.kingdomFreezeDate] || '京城封版日';
            record.customFields[header] = record.kingdomFreezeDate || '';
        }
        if (headerMap.kingdomTransferDate !== undefined) {
            const header = headers[headerMap.kingdomTransferDate] || '京城傳送中介檔日';
            record.customFields[header] = record.kingdomTransferDate || '';
        }
        if (headerMap.remark !== undefined) {
            const header = headers[headerMap.remark] || '備注說明';
            record.customFields[header] = record.remark || '';
        }

        // 驗證必要欄位（放寬條件：只要有環境或工作內容其中一個即可）
        if (!record.environment && !record.task) {
            return null;
        }

        // 如果缺少環境名稱，嘗試從工作內容推斷或使用預設值
        if (!record.environment) {
            record.environment = ExcelReader.DEFAULT_ENVIRONMENT;
        }

        // 如果缺少工作內容，使用環境名稱作為工作內容
        if (!record.task) {
            record.task = record.environment;
        }

        return record;
    }

    /**
     * 解析日期
     * @param {*} dateValue - 日期值（可能是 Excel 序列號、字串或 Date 物件）
     * @returns {Date|null}
     */
    parseDate(dateValue) {
        if (!dateValue) return null;

        // 如果是 Date 物件
        if (dateValue instanceof Date) {
            return dateValue;
        }

        // 如果是 Excel 序列號（數字）
        if (typeof dateValue === 'number') {
            // Excel 日期從 1900-01-01 開始計算
            const excelEpoch = new Date(1899, 11, 30);
            const days = dateValue;
            const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
            return date;
        }

        // 如果是字串，嘗試解析
        if (typeof dateValue === 'string') {
            const trimmed = dateValue.trim();
            if (!trimmed) return null;

            // 嘗試多種日期格式
            const dateFormats = [
                /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, // YYYY-MM-DD 或 YYYY/MM/DD
                /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, // MM-DD-YYYY 或 MM/DD/YYYY
            ];

            for (const format of dateFormats) {
                const match = trimmed.match(format);
                if (match) {
                    let year, month, day;
                    if (match[1].length === 4) {
                        // YYYY-MM-DD 格式
                        year = parseInt(match[1]);
                        month = parseInt(match[2]) - 1;
                        day = parseInt(match[3]);
                    } else {
                        // MM-DD-YYYY 格式
                        month = parseInt(match[1]) - 1;
                        day = parseInt(match[2]);
                        year = parseInt(match[3]);
                    }
                    return new Date(year, month, day);
                }
            }

            // 使用 Date 解析
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }

        return null;
    }

    /**
     * 彈性解析資料列（當無法自動識別欄位時使用）
     * @param {Array} row - 資料列
     * @param {Array} headers - 標題陣列
     * @param {Object} headerMap - 欄位映射
     * @returns {Object|null} 解析後的記錄
     */
    parseRowFlexible(row, headers, headerMap) {
        const record = {};
        
        // 嘗試從不同位置提取資料
        // 假設：第一列可能是環境，第二列可能是工作內容
        if (row.length > 0 && row[0]) {
            const firstCell = String(row[0]).trim();
            if (firstCell) {
                // 檢查是否包含環境相關關鍵字
                if (firstCell.includes('環境') || firstCell.length < 20) {
                    const parts = firstCell.split(/[：:]/);
                    record.environment = parts[0].trim();
                    if (parts.length > 1) {
                        record.purpose = parts.slice(1).join(':').trim();
                    } else {
                        record.purpose = ExcelReader.DEFAULT_PURPOSE;
                    }
                }
            }
        }

        // 第二列可能是工作內容
        if (row.length > 1 && row[1]) {
            const secondCell = String(row[1]).trim();
            if (secondCell) {
                record.task = secondCell;
            }
        }

        // 嘗試找日期欄位
        for (let i = 0; i < row.length; i++) {
            const cell = row[i];
            if (!cell) continue;
            
            const date = this.parseDate(cell);
            if (date && !isNaN(date.getTime())) {
                if (!record.startDate) {
                    record.startDate = date;
                } else if (!record.endDate) {
                    record.endDate = date;
                }
            }
        }

        // 驗證必要欄位
        if (!record.environment || !record.task) {
            return null;
        }

        if (!record.purpose) {
            record.purpose = ExcelReader.DEFAULT_PURPOSE;
        }

        record.status = ExcelReader.UNSPECIFIED_STATUS;

        return record;
    }

    /**
     * 檢查是否為空列
     * @param {Array} row - 資料列
     * @returns {boolean}
     */
    isEmptyRow(row) {
        return !row || row.every(cell => !cell || String(cell).trim() === '');
    }

    /**
     * 取得原始資料
     * @returns {Array|null}
     */
    getRawData() {
        return this.rawData;
    }
}

