/**
 * 資料處理模組
 * 負責處理和組織 Excel 資料，建立階層結構
 */

class DataProcessor {
    // 靜態常數：狀態映射表（將各種可能的狀態名稱映射到標準狀態）
    static STATUS_MAP = {
        // 映射到「未開始」
        '待開始': '未開始',
        '未指定': '未開始',
        '規劃中': '未開始',
        // 映射到「準備中」
        '進行中': '準備中',
        '準備中': '準備中',
        '前置準備中': '準備中',
        'IT前置準備中': '準備中',
        // 映射到「驗證中」
        '測試中': '驗證中',
        '測試進行中': '驗證中',
        '測試中': '驗證中',
        'User測試進行中': '驗證中',
        // 映射到「已完成」
        '完成': '已完成',
        '已驗證': '已完成'
    };

    // 靜態常數：標準狀態列表
    static STANDARD_STATUSES = ['未開始', '準備中', '驗證中', '已完成'];

    // 預設狀態
    static DEFAULT_STATUS = '未開始';
    
    // 其他預設值常數
    static DEFAULT_PURPOSE = '未指定目的';
    static DEFAULT_BATCH = '未指定梯次';
    static UNSPECIFIED_STATUS = '未指定';

    constructor(config = SystemConfig) {
        this.config = config;
        this.environments = new Map(); // 環境資料
        this.tasksByDate = new Map(); // 按日期分組的任務
        this.taskRanges = new Map(); // 任務範圍映射
        this.colorMap = new Map(); // 環境顏色對應
        this.batchColorMap = new Map(); // 梯次顏色對應
        this.statusColorMap = new Map(); // 狀態顏色對應
        
        // 從配置載入顏色調色盤
        this.environmentColorPalette = [...(config.environmentColors || [])];
        this.batchColorPalette = [...(config.batchColors || [])];
        this.statusColors = {...(config.statusColors || {})};
        
        this.environmentColorIndex = 0;
        this.batchColorIndex = 0;
    }

    /**
     * 標準化狀態名稱（將各種可能的狀態名稱映射到標準狀態）
     * @param {string} status - 原始狀態名稱
     * @returns {string} 標準化後的狀態名稱
     */
    normalizeStatus(status) {
        if (!status) {
            return DataProcessor.DEFAULT_STATUS;
        }

        // 如果狀態在映射表中，使用映射後的值
        if (DataProcessor.STATUS_MAP[status]) {
            return DataProcessor.STATUS_MAP[status];
        }

        // 如果不在映射表中，檢查是否為標準狀態之一
        if (DataProcessor.STANDARD_STATUSES.includes(status)) {
            return status;
        }

        // 如果既不在映射表，也不是標準狀態，預設為「未開始」
        return DataProcessor.DEFAULT_STATUS;
    }

    /**
     * 處理原始資料
     * @param {Array} rawData - Excel 讀取的原始資料
     */
    processData(rawData) {
        this.environments.clear();
        this.tasksByDate.clear();
        this.taskRanges = new Map();
        this.rangeGroups = new Map();
        this.colorMap.clear();
        this.environmentColorIndex = 0;
        this.batchColorIndex = 0;

        if (!rawData || rawData.length === 0) {
            throw new Error('沒有可處理的資料');
        }

        // 第一階段：建立環境結構
        // 收集所有「環境名稱 + 執行梯次」的目的映射
        const environmentBatchPurposes = new Map(); // key: "環境名稱_執行梯次" -> 目的
        
        rawData.forEach(record => {
            const envName = record.environment;
            const batch = record.batch || DataProcessor.DEFAULT_BATCH;
            const key = `${envName}_${batch}`;
            
            if (record.purpose && 
                record.purpose !== DataProcessor.DEFAULT_PURPOSE &&
                record.purpose.trim() !== '') {
                // 如果還沒有記錄，或者新目的與當前不同，則更新（使用最新的）
                if (!environmentBatchPurposes.has(key) || 
                    environmentBatchPurposes.get(key) !== record.purpose) {
                    const oldPurpose = environmentBatchPurposes.get(key);
                    environmentBatchPurposes.set(key, record.purpose);
                    if (oldPurpose && this.config.debug?.enabled && this.config.debug?.showConsoleLogs) {
                        console.log(`環境 "${envName}" 梯次 "${batch}" 的環境目的將更新: "${oldPurpose}" -> "${record.purpose}"`);
                    }
                }
            }
        });
        
        // 建立環境結構（環境目的將在建立任務範圍時根據「環境+梯次」來決定）
        rawData.forEach(record => {
            const envName = record.environment;
            if (!this.environments.has(envName)) {
                // 先使用預設目的，實際目的會在建立任務範圍時根據「環境+梯次」來決定
                this.environments.set(envName, {
                    name: envName,
                    purpose: DataProcessor.DEFAULT_PURPOSE, // 預設值，實際值在 rangeData 中
                    tasks: [],
                    color: this.getColorForEnvironment(envName)
                });
                
                if (this.config.debug?.enabled && this.config.debug?.showConsoleLogs) {
                    console.log(`建立環境 "${envName}"`);
                }
            }

            const environment = this.environments.get(envName);
            // 標準化狀態名稱（限定為4個標準狀態）
            const normalizedStatus = this.normalizeStatus(record.status);
            
            environment.tasks.push({
                content: record.task,
                startDate: record.startDate,
                endDate: record.endDate,
                status: normalizedStatus,
                batch: record.batch || DataProcessor.DEFAULT_BATCH,
                // 已知欄位（如果存在）
                dataBaseDate: record.dataBaseDate || null,
                kingdomFreezeDate: record.kingdomFreezeDate || null,
                kingdomTransferDate: record.kingdomTransferDate || null,
                businessDate: record.businessDate || null,
                remark: record.remark || '',
                // 動態欄位（所有未映射的欄位）
                customFields: record.customFields || {}
            });
        });

        // 第二階段：建立任務範圍映射（用於跨日期顯示）
        // 按「環境+梯次+狀態」分組，而不是按工作項目
        this.taskRanges = new Map(); // 任務範圍映射，key: rangeId, value: {environment, batch, status, dateRange, ...}
        this.rangeGroups = new Map(); // 按環境+梯次+狀態分組
        
        this.environments.forEach((env, envName) => {
            env.tasks.forEach((task, taskIndex) => {
                if (!task.startDate) {
                    console.warn('任務缺少開始日期:', task);
                    return;
                }

                const endDate = task.endDate || task.startDate;
                const dateRange = this.getDateRange(task.startDate, endDate);
                
                if (!dateRange || dateRange.length === 0) {
                    console.warn('無法產生日期範圍:', {startDate: task.startDate, endDate});
                    return;
                }
                
                const batch = task.batch || DataProcessor.DEFAULT_BATCH;
                const status = task.status || DataProcessor.UNSPECIFIED_STATUS;
                
                // 建立範圍ID：環境+梯次+狀態
                const rangeId = `${envName}_${batch}_${status}`;
                
                // 根據「環境名稱 + 執行梯次」取得對應的目的
                const envBatchKey = `${envName}_${batch}`;
                const purpose = environmentBatchPurposes.get(envBatchKey) || 
                               env.purpose || 
                               DataProcessor.DEFAULT_PURPOSE;
                
                // 建立環境資料副本，並設置正確的目的
                const environmentData = {
                    name: envName,
                    purpose: purpose,
                    color: env.color
                };
                
                // 如果這個範圍已存在，合併日期範圍和任務
                if (this.rangeGroups.has(rangeId)) {
                    const existingRange = this.rangeGroups.get(rangeId);
                    // 合併日期範圍
                    const combinedRange = this.mergeDateRanges(existingRange.dateRange, dateRange);
                    existingRange.dateRange = combinedRange;
                    existingRange.dateKeys = combinedRange.map(d => this.getDateKey(d));
                    existingRange.startDate = new Date(Math.min(existingRange.startDate.getTime(), task.startDate.getTime()));
                    existingRange.endDate = new Date(Math.max(existingRange.endDate.getTime(), endDate.getTime()));
                    // 添加任務到列表
                    existingRange.tasks.push(task);
                    // 更新環境資料（確保 environmentData 反映正確的環境目的）
                    existingRange.environmentData = environmentData;
                } else {
                    // 建立新的範圍
                    const rangeData = {
                        rangeId: rangeId,
                        environment: envName,
                        environmentData: environmentData, // 使用根據「環境+梯次」決定的目的
                        batch: batch,
                        batchColor: this.getColorForBatch(batch),
                        status: status,
                        statusColor: this.getColorForStatus(status),
                        startDate: new Date(task.startDate),
                        endDate: new Date(endDate),
                        dateRange: dateRange,
                        dateKeys: dateRange.map(d => this.getDateKey(d)),
                        tasks: [task] // 儲存所有相關任務
                    };
                    this.rangeGroups.set(rangeId, rangeData);
                    this.taskRanges.set(rangeId, rangeData);
                }
            });
        });

        // 按日期分組任務（用於點擊查看詳情）
        this.rangeGroups.forEach((rangeData) => {
            rangeData.dateRange.forEach(date => {
                const dateKey = this.getDateKey(date);
                if (!this.tasksByDate.has(dateKey)) {
                    this.tasksByDate.set(dateKey, []);
                }

                // 檢查是否已存在相同的範圍（避免重複）
                const existing = this.tasksByDate.get(dateKey).find(item => item.rangeId === rangeData.rangeId);
                if (!existing) {
                    // 添加範圍資訊到日期
                    this.tasksByDate.get(dateKey).push({
                        rangeId: rangeData.rangeId,
                        environment: rangeData.environment,
                        environmentData: rangeData.environmentData,
                        batch: rangeData.batch,
                        batchColor: rangeData.batchColor,
                        status: rangeData.status,
                        statusColor: rangeData.statusColor,
                        tasks: rangeData.tasks,
                        isFirstDay: date.getTime() === rangeData.startDate.getTime()
                    });
                }
            });
        });

        // 排序每個日期的任務
        this.tasksByDate.forEach((tasks, dateKey) => {
            tasks.sort((a, b) => {
                // 先按狀態優先級排序（如果配置中有定義）
                if (this.config.statusPriority) {
                    const priorityA = this.config.statusPriority[a.status] || 99;
                    const priorityB = this.config.statusPriority[b.status] || 99;
                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }
                }
                // 再按環境名稱排序
                if (a.environment !== b.environment) {
                    return a.environment.localeCompare(b.environment);
                }
                // 最後按第一個任務內容排序
                const taskA = a.tasks && a.tasks.length > 0 ? a.tasks[0].content : '';
                const taskB = b.tasks && b.tasks.length > 0 ? b.tasks[0].content : '';
                return taskA.localeCompare(taskB);
            });
        });
    }

    /**
     * 取得環境的顏色
     * @param {string} envName - 環境名稱
     * @returns {string} 顏色代碼
     */
    getColorForEnvironment(envName) {
        // 優先檢查特定環境的固定顏色
        if (this.config.environmentSpecificColors && this.config.environmentSpecificColors[envName]) {
            const specificColor = this.config.environmentSpecificColors[envName];
            this.colorMap.set(envName, specificColor);
            return specificColor;
        }
        
        // 如果配置要求一致性，且已存在則返回相同顏色
        if (this.config.colorStrategy?.consistent && this.colorMap.has(envName)) {
            return this.colorMap.get(envName);
        }

        // 如果調色盤用完了，根據策略處理
        if (this.environmentColorIndex >= this.environmentColorPalette.length) {
            if (this.config.colorStrategy?.mode === 'generate') {
                // 動態生成顏色
                const color = this.generateColor(this.environmentColorIndex);
                this.colorMap.set(envName, color);
                this.environmentColorIndex++;
                return color;
            } else {
                // 重複使用顏色（預設）
                const color = this.environmentColorPalette[this.environmentColorIndex % this.environmentColorPalette.length];
                this.colorMap.set(envName, color);
                this.environmentColorIndex++;
                return color;
            }
        }

        const color = this.environmentColorPalette[this.environmentColorIndex % this.environmentColorPalette.length];
        this.colorMap.set(envName, color);
        this.environmentColorIndex++;
        return color;
    }

    /**
     * 動態生成顏色（當調色盤不夠用時）
     * @param {number} index - 顏色索引
     * @returns {string} 顏色代碼
     */
    generateColor(index) {
        // 使用 HSL 色彩空間生成均勻分布的顏色
        const hue = (index * 137.508) % 360; // 使用黃金角度確保顏色分布均勻
        const saturation = 60 + (index % 3) * 10; // 60-80%
        const lightness = 50 + (index % 2) * 10; // 50-60%
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    /**
     * 取得梯次的顏色
     * @param {string} batch - 梯次名稱
     * @returns {string} 顏色代碼
     */
    getColorForBatch(batch) {
        if (!batch || batch === DataProcessor.DEFAULT_BATCH) {
            return '#9e9e9e'; // 灰色
        }
        
        // 如果配置要求一致性，且已存在則返回相同顏色
        if (this.config.colorStrategy?.consistent && this.batchColorMap.has(batch)) {
            return this.batchColorMap.get(batch);
        }

        // 如果調色盤用完了，根據策略處理
        if (this.batchColorIndex >= this.batchColorPalette.length) {
            if (this.config.colorStrategy?.mode === 'generate') {
                const color = this.generateColor(this.batchColorIndex + 1000); // 偏移避免與環境顏色衝突
                this.batchColorMap.set(batch, color);
                this.batchColorIndex++;
                return color;
            } else {
                const color = this.batchColorPalette[this.batchColorIndex % this.batchColorPalette.length];
                this.batchColorMap.set(batch, color);
                this.batchColorIndex++;
                return color;
            }
        }

        const color = this.batchColorPalette[this.batchColorIndex % this.batchColorPalette.length];
        this.batchColorMap.set(batch, color);
        this.batchColorIndex++;
        return color;
    }

    /**
     * 取得狀態的顏色
     * @param {string} status - 狀態名稱
     * @returns {string} 顏色代碼
     */
    getColorForStatus(status) {
        const normalizedStatus = this.normalizeStatus(status);
        return this.statusColors[normalizedStatus] || '#9ca3af';
    }

    /**
     * 取得所有梯次列表
     * @returns {Array} 梯次陣列
     */
    getBatches() {
        return Array.from(this.batchColorMap.keys());
    }

    /**
     * 取得所有狀態列表（只返回標準狀態）
     * @returns {Array} 狀態陣列
     */
    getStatuses() {
        // 只返回標準的4個狀態
        return DataProcessor.STANDARD_STATUSES.filter(status => this.statusColors[status]);
    }

    /**
     * 取得梯次顏色對應
     * @returns {Map} 梯次名稱到顏色的映射
     */
    getBatchColorMap() {
        return this.batchColorMap;
    }

    /**
     * 取得狀態顏色對應
     * @returns {Object} 狀態名稱到顏色的映射
     */
    getStatusColorMap() {
        return this.statusColors;
    }

    /**
     * 取得日期範圍內的所有日期
     * @param {Date} startDate - 開始日期
     * @param {Date} endDate - 結束日期
     * @returns {Array<Date>} 日期陣列
     */
    getDateRange(startDate, endDate) {
        const dates = [];
        const current = new Date(startDate);
        const end = new Date(endDate);

        // 確保時間設為 00:00:00
        current.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    /**
     * 取得日期的字串鍵值
     * @param {Date} date - 日期物件
     * @returns {string} YYYY-MM-DD 格式的字串
     */
    getDateKey(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 取得指定日期的任務
     * @param {Date} date - 日期
     * @returns {Array} 任務陣列
     */
    getTasksForDate(date) {
        const dateKey = this.getDateKey(date);
        return this.tasksByDate.get(dateKey) || [];
    }

    /**
     * 取得指定月份的任務
     * @param {number} year - 年份
     * @param {number} month - 月份 (0-11)
     * @returns {Map} 日期到任務的映射
     */
    getTasksForMonth(year, month) {
        const result = new Map();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateKey = this.getDateKey(date);
            if (this.tasksByDate.has(dateKey)) {
                result.set(dateKey, this.tasksByDate.get(dateKey));
            }
        }

        return result;
    }

    /**
     * 取得任務範圍資訊
     * @returns {Map} 任務ID到任務範圍的映射
     */
    getTaskRanges() {
        return this.taskRanges || new Map();
    }

    /**
     * 合併兩個日期範圍
     * @param {Array<Date>} range1 - 第一個日期範圍
     * @param {Array<Date>} range2 - 第二個日期範圍
     * @returns {Array<Date>} 合併後的日期範圍
     */
    mergeDateRanges(range1, range2) {
        const allDates = new Set();
        range1.forEach(d => allDates.add(this.getDateKey(d)));
        range2.forEach(d => allDates.add(this.getDateKey(d)));
        
        const sortedDates = Array.from(allDates)
            .map(key => {
                const [year, month, day] = key.split('-').map(Number);
                return new Date(year, month - 1, day);
            })
            .sort((a, b) => a.getTime() - b.getTime());
        
        return sortedDates;
    }

    /**
     * 取得所有環境列表
     * @returns {Array} 環境陣列
     */
    getEnvironments() {
        return Array.from(this.environments.values());
    }

    /**
     * 取得環境顏色對應
     * @returns {Map} 環境名稱到顏色的映射
     */
    getColorMap() {
        return this.colorMap;
    }

    /**
     * 篩選任務（依環境）
     * @param {Array} tasks - 任務陣列
     * @param {string|Array} filterEnvironments - 要顯示的環境（'all' 或環境名稱陣列）
     * @returns {Array} 篩選後的任務
     */
    filterTasksByEnvironment(tasks, filterEnvironments) {
        if (filterEnvironments === 'all' || !filterEnvironments) {
            return tasks;
        }

        const filterSet = Array.isArray(filterEnvironments) 
            ? new Set(filterEnvironments) 
            : new Set([filterEnvironments]);

        return tasks.filter(item => filterSet.has(item.environment));
    }
}

