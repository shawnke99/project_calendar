/**
 * 月曆渲染模組
 * 負責渲染月曆視圖和任務顯示
 */

class Calendar {
    constructor(containerId, dataProcessor, config = SystemConfig) {
        this.container = document.getElementById(containerId);
        this.dataProcessor = dataProcessor;
        this.config = config;
        this.currentDate = new Date();
        this.filteredEnvironments = config.filter?.defaultFilter || 'all';
        
        // 虛擬滾動相關屬性
        this.virtualScrollEnabled = this.config.performance?.virtualScroll === true;
        this.virtualScrollBuffer = this.config.performance?.virtualScrollBuffer || 7;
        this.visibleDayElements = new Map(); // 儲存可見的日期元素
        this.observer = null; // IntersectionObserver 實例
        
        // 應用 dayMinHeight 配置到 CSS
        this.applyDayMinHeight();
        
        // 如果啟用虛擬滾動，設置觀察器
        if (this.virtualScrollEnabled) {
            this.setupVirtualScroll();
        }
    }
    
    /**
     * 應用日期格子最小高度配置
     */
    applyDayMinHeight() {
        const dayMinHeight = this.config.calendar?.dayMinHeight || 130;
        // 設置 CSS 變數或直接設置樣式
        if (this.container) {
            const style = document.createElement('style');
            style.id = 'calendar-day-min-height-style';
            // 移除舊的樣式（如果存在）
            const oldStyle = document.getElementById('calendar-day-min-height-style');
            if (oldStyle) {
                oldStyle.remove();
            }
            style.textContent = `.calendar-day { min-height: ${dayMinHeight}px !important; }`;
            document.head.appendChild(style);
        }
    }

    /**
     * 設置虛擬滾動觀察器
     */
    setupVirtualScroll() {
        if (!this.virtualScrollEnabled) return;
        
        // 使用 IntersectionObserver 來檢測可見區域
        // 計算緩衝區高度（基於日期格子的最小高度）
        const dayMinHeight = this.config.calendar?.dayMinHeight || 150;
        const bufferHeight = this.virtualScrollBuffer * dayMinHeight;
        
        const options = {
            root: null, // 使用視窗作為根
            rootMargin: `${bufferHeight}px`, // 緩衝區（上下各緩衝）
            threshold: 0.01
        };
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const dayElement = entry.target;
                const dateKey = dayElement.getAttribute('data-date-key');
                
                if (entry.isIntersecting) {
                    // 元素進入可見區域，標記為可見
                    if (!this.visibleDayElements.has(dateKey)) {
                        this.visibleDayElements.set(dateKey, true);
                        // 觸發任務渲染（如果需要）
                        this.ensureDayContentRendered(dayElement, dateKey);
                    }
                }
                // 注意：我們不清理離開可見區域的元素，以保持更好的用戶體驗
            });
        }, options);
    }

    /**
     * 確保日期格子的內容已渲染（用於虛擬滾動）
     */
    ensureDayContentRendered(dayElement, dateKey) {
        // 如果已經有任務容器，表示已渲染，跳過
        if (dayElement.querySelector('.tasks-container')) {
            return;
        }
        
        // 虛擬滾動模式下，任務內容會在正常的渲染流程中處理
        // 這裡主要是標記元素為可見，實際渲染由 renderTasksInDayCells 等方法處理
    }
    
    /**
     * 清理虛擬滾動觀察器
     */
    cleanupVirtualScroll() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.visibleDayElements.clear();
    }

    /**
     * 渲染月曆
     */
    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthsToDisplay = this.config.calendar?.monthsToDisplay || 1;

        // 更新月份顯示
        this.updateMonthDisplay(year, month, monthsToDisplay);

        // 取得任務範圍
        const taskRanges = this.dataProcessor.getTaskRanges();

        // 清理虛擬滾動觀察器（如果存在）
        if (this.virtualScrollEnabled) {
            this.cleanupVirtualScroll();
        }

        // 清空月曆
        this.container.innerHTML = '';
        
        // 重新設置虛擬滾動觀察器（如果啟用）
        if (this.virtualScrollEnabled) {
            this.setupVirtualScroll();
        }
        
        // 清除多月份容器的樣式類別
        this.container.className = 'calendar-grid';
        if (monthsToDisplay > 1) {
            this.container.classList.add(`months-${monthsToDisplay}`);
            this.container.classList.add('layout-vertical'); // 固定使用縱向佈局
        }

        // 單月份顯示：使用原來的簡單結構
        if (monthsToDisplay === 1) {
            // 取得當月任務
            const tasksForMonth = this.dataProcessor.getTasksForMonth(year, month);
            
            // 計算當月第一天和最後一天
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const firstDayOfWeek = firstDay.getDay(); // 0 = 星期日
            const daysInMonth = lastDay.getDate();

            // 計算需要顯示的日期範圍（包含上個月的尾幾天和下個月的頭幾天）
            const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDayOfWeek);

            // 建立日期格子
            const dayElements = [];
            for (let i = 0; i < totalCells; i++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + i);
                // 確保時間設為 00:00:00 避免時區問題
                cellDate.setHours(0, 0, 0, 0);

                const dayElement = this.createDayElement(cellDate, year, month, tasksForMonth);
                this.container.appendChild(dayElement);
                dayElements.push({ date: new Date(cellDate), element: dayElement, year: year, month: month });
                
                // 如果啟用虛擬滾動，觀察日期格子
                if (this.virtualScrollEnabled && this.observer) {
                    this.observer.observe(dayElement);
                }
            }

            // 渲染跨日期的任務條（單月份）- 檢查是否啟用
            if (this.config.taskDisplay?.showSpanningTasks !== false) {
                this.renderSpanningTasks(dayElements, taskRanges, year, month);
            } else {
                // 如果禁用跨日期任務條，則在日期格子內顯示任務
                this.renderTasksInDayCells(dayElements, taskRanges, year, month);
            }
        } else {
            // 多月份顯示：使用新的結構
            const allDayElements = [];
            for (let m = 0; m < monthsToDisplay; m++) {
                const currentYear = new Date(year, month + m, 1).getFullYear();
                const currentMonth = new Date(year, month + m, 1).getMonth();
                
                // 取得當月任務
                const tasksForMonth = this.dataProcessor.getTasksForMonth(currentYear, currentMonth);
                
                // 建立月份容器
                const monthContainer = document.createElement('div');
                monthContainer.className = 'month-container';
                monthContainer.setAttribute('data-year', currentYear);
                monthContainer.setAttribute('data-month', currentMonth);
                
                // 建立月份標題
                const monthTitle = document.createElement('div');
                monthTitle.className = 'month-title';
                monthTitle.textContent = `${currentYear}年${currentMonth + 1}月`;
                monthContainer.appendChild(monthTitle);
                
                // 建立月份網格
                const monthGrid = document.createElement('div');
                monthGrid.className = 'month-grid';
                
                // 計算當月第一天和最後一天
                const firstDay = new Date(currentYear, currentMonth, 1);
                const lastDay = new Date(currentYear, currentMonth + 1, 0);
                const firstDayOfWeek = firstDay.getDay(); // 0 = 星期日
                const daysInMonth = lastDay.getDate();

                // 計算需要顯示的日期範圍（包含上個月的尾幾天和下個月的頭幾天）
                const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
                const startDate = new Date(firstDay);
                startDate.setDate(startDate.getDate() - firstDayOfWeek);

                // 建立日期格子
                const dayElements = [];
                for (let i = 0; i < totalCells; i++) {
                    const cellDate = new Date(startDate);
                    cellDate.setDate(startDate.getDate() + i);
                    // 確保時間設為 00:00:00 避免時區問題
                    cellDate.setHours(0, 0, 0, 0);

                    const dayElement = this.createDayElement(cellDate, currentYear, currentMonth, tasksForMonth);
                    monthGrid.appendChild(dayElement);
                    dayElements.push({ date: new Date(cellDate), element: dayElement, year: currentYear, month: currentMonth });
                    
                    // 如果啟用虛擬滾動，觀察日期格子
                    if (this.virtualScrollEnabled && this.observer) {
                        this.observer.observe(dayElement);
                    }
                }
                
                monthContainer.appendChild(monthGrid);
                this.container.appendChild(monthContainer);
                allDayElements.push(...dayElements);
            }

            // 渲染跨日期的任務條（多月份）- 檢查是否啟用
            if (this.config.taskDisplay?.showSpanningTasks !== false) {
                this.renderSpanningTasksForMultipleMonths(allDayElements, taskRanges, year, month, monthsToDisplay);
            } else {
                // 如果禁用跨日期任務條，則在日期格子內顯示任務
                this.renderTasksInDayCellsForMultipleMonths(allDayElements, taskRanges, year, month, monthsToDisplay);
            }
        }
    }

    /**
     * 渲染跨日期的任務條（支援多月份）
     * @param {Array} allDayElements - 所有月份的日期元素陣列
     * @param {Map} taskRanges - 任務範圍映射
     * @param {number} startYear - 起始年份
     * @param {number} startMonth - 起始月份
     * @param {number} monthsToDisplay - 顯示的月份數量
     */
    renderSpanningTasksForMultipleMonths(allDayElements, taskRanges, startYear, startMonth, monthsToDisplay) {
        const displayedRanges = new Set(); // 記錄已顯示的範圍
        const dayTaskCounts = new Map(); // 追蹤每個日期格子中已放置的任務條數量
        
        // 計算顯示的月份範圍
        const displayMonths = [];
        for (let m = 0; m < monthsToDisplay; m++) {
            const currentYear = new Date(startYear, startMonth + m, 1).getFullYear();
            const currentMonth = new Date(startYear, startMonth + m, 1).getMonth();
            displayMonths.push({ year: currentYear, month: currentMonth });
        }
        
        // 過濾出在顯示月份範圍內的任務範圍
        let monthTaskRanges = Array.from(taskRanges.values()).filter(taskRange => {
            if (!taskRange.dateRange || taskRange.dateRange.length === 0) return false;
            
            // 檢查日期範圍是否與任何顯示月份有交集
            const hasDateInDisplayMonths = taskRange.dateRange.some(date => {
                return displayMonths.some(displayMonth => {
                    return date.getFullYear() === displayMonth.year && date.getMonth() === displayMonth.month;
                });
            });
            
            return hasDateInDisplayMonths;
        });
        
        // 應用環境篩選
        if (this.filteredEnvironments !== 'all' && this.filteredEnvironments) {
            const filterSet = Array.isArray(this.filteredEnvironments) 
                ? new Set(this.filteredEnvironments) 
                : new Set([this.filteredEnvironments]);
            
            monthTaskRanges = monthTaskRanges.filter(taskRange => {
                return filterSet.has(taskRange.environment);
            });
        }

        monthTaskRanges.forEach(taskRange => {
            if (displayedRanges.has(taskRange.rangeId)) return;
            if (!taskRange.dateRange || taskRange.dateRange.length === 0) return;
            
            // 找出任務範圍在顯示月份範圍內的日期
            const visibleDates = taskRange.dateRange.filter(date => {
                if (!date) return false;
                return displayMonths.some(displayMonth => {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    return d.getFullYear() === displayMonth.year && d.getMonth() === displayMonth.month;
                });
            });
            
            if (visibleDates.length === 0) return;
            
            // 按月份分組處理任務條
            displayMonths.forEach(displayMonth => {
                const monthDates = visibleDates.filter(date => {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    return d.getFullYear() === displayMonth.year && d.getMonth() === displayMonth.month;
                });
                
                if (monthDates.length === 0) return;
                
                // 找出該月份內的開始和結束日期
                const startDate = new Date(monthDates[0]);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(monthDates[monthDates.length - 1]);
                endDate.setHours(0, 0, 0, 0);
                
                // 在 allDayElements 中查找該月份對應的日期元素
                const monthDayElements = allDayElements.filter(d => {
                    return d.year === displayMonth.year && d.month === displayMonth.month;
                });
                
                // 在該月份的日期元素中查找對應的索引
                const startIndex = monthDayElements.findIndex(d => {
                    const dDate = new Date(d.date);
                    dDate.setHours(0, 0, 0, 0);
                    const sDate = new Date(startDate);
                    sDate.setHours(0, 0, 0, 0);
                    return dDate.getTime() === sDate.getTime();
                });
                
                const endIndex = monthDayElements.findIndex(d => {
                    const dDate = new Date(d.date);
                    dDate.setHours(0, 0, 0, 0);
                    const eDate = new Date(endDate);
                    eDate.setHours(0, 0, 0, 0);
                    return dDate.getTime() === eDate.getTime();
                });
                
                if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                    // 計算在 allDayElements 中的實際索引
                    const firstMonthIndex = allDayElements.findIndex(d => 
                        d.year === displayMonth.year && d.month === displayMonth.month
                    );
                    const actualStartIndex = firstMonthIndex + startIndex;
                    const actualEndIndex = firstMonthIndex + endIndex;
                    
                    const spanDays = actualEndIndex - actualStartIndex + 1;
                    
                    // 計算這個任務條應該放在哪一層（垂直位置）
                    let maxTaskCount = 0;
                    for (let i = actualStartIndex; i <= actualEndIndex; i++) {
                        const count = dayTaskCounts.get(i) || 0;
                        maxTaskCount = Math.max(maxTaskCount, count);
                    }
                    
                    // 將這個任務條放在 maxTaskCount 層
                    const taskBarIndex = maxTaskCount;
                    
                    // 更新這個日期範圍內所有日期的任務條計數
                    for (let i = actualStartIndex; i <= actualEndIndex; i++) {
                        dayTaskCounts.set(i, maxTaskCount + 1);
                    }
                    
                    // 使用該月份的日期元素來創建任務條
                    this.createSpanningTaskBar(taskRange, actualStartIndex, spanDays, allDayElements, taskBarIndex);
                }
            });
            
            displayedRanges.add(taskRange.rangeId);
        });
    }

    /**
     * 渲染跨日期的任務條
     * @param {Array} dayElements - 日期元素陣列
     * @param {Map} taskRanges - 任務範圍映射
     * @param {number} year - 年份
     * @param {number} month - 月份
     */
    renderSpanningTasks(dayElements, taskRanges, year, month) {
        const displayedRanges = new Set(); // 記錄已顯示的範圍
        const dayTaskCounts = new Map(); // 追蹤每個日期格子中已放置的任務條數量（用於垂直堆疊）
        
        // 過濾出當前月份的任務範圍
        let monthTaskRanges = Array.from(taskRanges.values()).filter(taskRange => {
            if (!taskRange.dateRange || taskRange.dateRange.length === 0) return false;
            
            // 檢查日期範圍是否與當前月份有交集
            const hasDateInMonth = taskRange.dateRange.some(date => {
                return date.getFullYear() === year && date.getMonth() === month;
            });
            
            return hasDateInMonth;
        });
        
        // 應用環境篩選
        if (this.filteredEnvironments !== 'all' && this.filteredEnvironments) {
            const filterSet = Array.isArray(this.filteredEnvironments) 
                ? new Set(this.filteredEnvironments) 
                : new Set([this.filteredEnvironments]);
            
            monthTaskRanges = monthTaskRanges.filter(taskRange => {
                return filterSet.has(taskRange.environment);
            });
        }

        // 應用任務數量限制（如果啟用）
        const enableTaskLimits = this.config.calendar?.enableTaskLimits !== false;
        if (enableTaskLimits) {
            // 應用 maxDisplayTasks 限制（跨日期任務條的總數）
            const maxDisplayTasks = this.config.calendar?.maxDisplayTasks;
            if (maxDisplayTasks && maxDisplayTasks > 0) {
                // 按日期分組，限制每個日期顯示的任務條數量
                const tasksByDate = new Map();
                monthTaskRanges.forEach(taskRange => {
                    if (!taskRange.dateRange || taskRange.dateRange.length === 0) return;
                    taskRange.dateRange.forEach(date => {
                        const dateKey = this.dataProcessor.getDateKey(date);
                        if (!tasksByDate.has(dateKey)) {
                            tasksByDate.set(dateKey, []);
                        }
                        if (!tasksByDate.get(dateKey).includes(taskRange.rangeId)) {
                            tasksByDate.get(dateKey).push(taskRange.rangeId);
                        }
                    });
                });
                
                // 過濾出符合限制的任務範圍
                const allowedRangeIds = new Set();
                tasksByDate.forEach((rangeIds, dateKey) => {
                    const limitedRangeIds = rangeIds.slice(0, maxDisplayTasks);
                    limitedRangeIds.forEach(rangeId => allowedRangeIds.add(rangeId));
                });
                
                monthTaskRanges = monthTaskRanges.filter(taskRange => {
                    return allowedRangeIds.has(taskRange.rangeId);
                });
            }
        }

        monthTaskRanges.forEach(taskRange => {
            if (displayedRanges.has(taskRange.rangeId)) return;
            if (!taskRange.dateRange || taskRange.dateRange.length === 0) return;
            
            // 找出任務範圍在當前月份顯示的日期
            const visibleDates = taskRange.dateRange.filter(date => {
                if (!date) return false;
                const d = new Date(date);
                d.setHours(0, 0, 0, 0);
                return d.getFullYear() === year && d.getMonth() === month;
            });
            
            if (visibleDates.length === 0) return;
            
            // 找出開始和結束日期
            const startDate = new Date(visibleDates[0]);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(visibleDates[visibleDates.length - 1]);
            endDate.setHours(0, 0, 0, 0);
            
            // 在 dayElements 中查找對應的索引（使用日期比較）
            const startIndex = dayElements.findIndex(d => {
                const dDate = new Date(d.date);
                dDate.setHours(0, 0, 0, 0);
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                return dDate.getTime() === sDate.getTime();
            });
            
            const endIndex = dayElements.findIndex(d => {
                const dDate = new Date(d.date);
                dDate.setHours(0, 0, 0, 0);
                const eDate = new Date(endDate);
                eDate.setHours(0, 0, 0, 0);
                return dDate.getTime() === eDate.getTime();
            });
            
            if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                displayedRanges.add(taskRange.rangeId);
                const spanDays = endIndex - startIndex + 1;
                
                // 計算這個任務條應該放在哪一層（垂直位置）
                // 找出這個日期範圍內所有日期中，已放置任務條數量的最大值
                let maxTaskCount = 0;
                for (let i = startIndex; i <= endIndex; i++) {
                    const count = dayTaskCounts.get(i) || 0;
                    maxTaskCount = Math.max(maxTaskCount, count);
                }
                
                // 將這個任務條放在 maxTaskCount 層
                const taskBarIndex = maxTaskCount;
                
                // 更新這個日期範圍內所有日期的任務條計數
                for (let i = startIndex; i <= endIndex; i++) {
                    dayTaskCounts.set(i, maxTaskCount + 1);
                }
                
                this.createSpanningTaskBar(taskRange, startIndex, spanDays, dayElements, taskBarIndex);
            } else {
                // 除錯資訊
                if (this.config.debug?.showConsoleLogs) {
                    console.warn('無法找到日期索引:', {
                        rangeId: taskRange.rangeId,
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0],
                        startIndex,
                        endIndex,
                        dayElementsLength: dayElements.length,
                        firstDayElement: dayElements[0] ? new Date(dayElements[0].date).toISOString().split('T')[0] : 'none',
                        visibleDatesCount: visibleDates.length
                    });
                }
            }
        });
    }

    /**
     * 建立跨日期的任務條
     * @param {Object} taskRange - 任務範圍資訊
     * @param {number} startIndex - 開始索引
     * @param {number} spanDays - 跨越天數
     * @param {Array} dayElements - 日期元素陣列
     * @param {number} taskBarIndex - 任務條的垂直層級索引（用於堆疊）
     */
    createSpanningTaskBar(taskRange, startIndex, spanDays, dayElements, taskBarIndex = 0) {
        const startElement = dayElements[startIndex].element;
        // 在多月份顯示時，任務條應該相對於月份網格定位
        const monthGrid = startElement.closest('.month-grid');
        const calendarGrid = startElement.closest('.calendar-grid');
        const targetContainer = monthGrid || calendarGrid;
        if (!targetContainer) return;
        
        // 建立任務條容器
        const taskBar = document.createElement('div');
        taskBar.className = 'spanning-task-bar';
        taskBar.style.backgroundColor = this.addAlpha(taskRange.environmentData.color, 0.15);
        taskBar.style.borderLeft = `4px solid ${taskRange.environmentData.color}`;
        
        // 使用絕對定位，相對於日曆網格定位
        taskBar.style.position = 'absolute';
        taskBar.style.zIndex = '5';
        // 為了讓下拉層正確定位，任務條本身也需要是 relative（但實際定位由 absolute 控制）
        // 這裡保持 absolute，下拉層會相對於任務條定位
        
        // 應用懸停效果（如果啟用）
        if (this.config.taskDisplay?.hoverEffect !== false) {
            taskBar.classList.add('hover-enabled');
        }
        
        // 計算跨日期任務條的寬度和位置
        const gridGap = this.config.calendar?.gridGap || 2;
        
        // 使用 setTimeout 確保 DOM 已渲染
        setTimeout(() => {
            // 獲取起始格子和結束格子的位置和尺寸
            const startCellRect = startElement.getBoundingClientRect();
            const endIndex = startIndex + spanDays - 1;
            const endElement = endIndex < dayElements.length ? dayElements[endIndex].element : null;
            const endCellRect = endElement ? endElement.getBoundingClientRect() : null;
            const gridRect = targetContainer.getBoundingClientRect();
            
            // 計算相對於目標容器的左邊距
            const leftOffset = startCellRect.left - gridRect.left;
            
            // 計算單個格子的寬度
            const cellWidth = startCellRect.width;
            
            // 檢查任務是否跨週（檢查起始格子和結束格子是否在同一行）
            const startRow = Math.floor(startIndex / 7);
            const endRow = Math.floor(endIndex / 7);
            const isCrossWeek = startRow !== endRow;
            
            if (isCrossWeek && endCellRect) {
                // 跨週情況：計算從起始格子到該行結束的寬度
                const startCol = startIndex % 7; // 起始格子在本行的列位置（0-6）
                const daysToEndOfRow = 7 - startCol; // 從起始格子到行結束的天數
                
                // 第一段：從起始格子到該行結束
                const firstSegmentWidth = (cellWidth * daysToEndOfRow) + (gridGap * (daysToEndOfRow - 1));
                
                // 計算垂直位置（使用配置值）
                const taskBarHeight = this.config.calendar?.taskBarHeight || 24;
                const taskBarMargin = 2;
                const taskBarSpacing = 2;
                const tasksContainer = startElement.querySelector('.tasks-container');
                let topOffset = taskBarIndex * (taskBarHeight + taskBarSpacing) + taskBarMargin;
                
                if (tasksContainer) {
                    const containerRect = tasksContainer.getBoundingClientRect();
                    const cellTop = containerRect.top - gridRect.top;
                    topOffset = cellTop + topOffset;
                } else {
                    const dayPadding = 8;
                    const dayNumberHeight = 28;
                    topOffset = dayPadding + dayNumberHeight + 6 + topOffset;
                }
                
                // 設定第一段任務條的位置和寬度
                taskBar.style.left = `${leftOffset}px`;
                taskBar.style.top = `${topOffset}px`;
                taskBar.style.width = `${firstSegmentWidth}px`;
                
                // 如果還有剩餘天數，創建第二段（下一行開始到結束格子）
                const remainingDays = spanDays - daysToEndOfRow;
                if (remainingDays > 0 && endElement) {
                    const nextRowStartIndex = (startRow + 1) * 7;
                    const nextRowStartElement = dayElements[nextRowStartIndex]?.element;
                    
                    if (nextRowStartElement) {
                        const nextRowStartRect = nextRowStartElement.getBoundingClientRect();
                        const nextRowLeftOffset = nextRowStartRect.left - gridRect.left;
                        const secondSegmentWidth = (cellWidth * remainingDays) + (gridGap * (remainingDays - 1));
                        
                        // 計算下一行的 top 位置
                        const nextRowTopOffset = endCellRect.top - gridRect.top;
                        const nextRowTasksContainer = endElement.querySelector('.tasks-container');
                        let nextRowTop = taskBarIndex * (taskBarHeight + taskBarSpacing) + taskBarMargin;
                        
                        if (nextRowTasksContainer) {
                            const nextRowContainerRect = nextRowTasksContainer.getBoundingClientRect();
                            nextRowTop = nextRowContainerRect.top - gridRect.top + taskBarIndex * (taskBarHeight + taskBarSpacing) + taskBarMargin;
                        } else {
                            const dayPadding = 8;
                            const dayNumberHeight = 28;
                            nextRowTop = nextRowTopOffset + dayPadding + dayNumberHeight + 6 + taskBarIndex * (taskBarHeight + taskBarSpacing) + taskBarMargin;
                        }
                        
                        // 創建第二段任務條
                        const secondSegment = taskBar.cloneNode(true);
                        secondSegment.style.left = `${nextRowLeftOffset}px`;
                        secondSegment.style.top = `${nextRowTop}px`;
                        secondSegment.style.width = `${secondSegmentWidth}px`;
                        secondSegment.style.zIndex = '5';
                        
                        // 添加點擊事件
                        secondSegment.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            
                            const tasks = taskRange.tasks.map(task => ({
                                environment: taskRange.environment,
                                environmentData: taskRange.environmentData,
                                task: task,
                                batch: taskRange.batch,
                                batchColor: taskRange.batchColor,
                                status: taskRange.status,
                                statusColor: taskRange.statusColor
                            }));
                            
                            this.showRangeDetails(taskRange, tasks);
                        });
                        
                        targetContainer.appendChild(secondSegment);
                    }
                }
                
                if (this.config.debug?.showConsoleLogs && this.config.debug?.logLevel === 'debug') {
                    console.log('跨週任務條位置計算:', {
                        isCrossWeek: true,
                        startRow,
                        endRow,
                        startCol,
                        daysToEndOfRow,
                        remainingDays,
                        firstSegmentWidth,
                        leftOffset,
                        topOffset,
                        taskBarIndex,
                        rangeId: taskRange.rangeId
                    });
                }
            } else {
                // 不跨週：正常計算
                const totalWidth = (cellWidth * spanDays) + (gridGap * (spanDays - 1));
                
                // 計算垂直位置（使用配置值）
                const taskBarHeight = this.config.calendar?.taskBarHeight || 24;
                const taskBarMargin = 2;
                const taskBarSpacing = 2;
                const tasksContainer = startElement.querySelector('.tasks-container');
                let topOffset = taskBarIndex * (taskBarHeight + taskBarSpacing) + taskBarMargin;
                
                if (tasksContainer) {
                    const containerRect = tasksContainer.getBoundingClientRect();
                    const cellTop = containerRect.top - gridRect.top;
                    topOffset = cellTop + topOffset;
                } else {
                    const dayPadding = 8;
                    const dayNumberHeight = 28;
                    topOffset = dayPadding + dayNumberHeight + 6 + topOffset;
                }
                
                // 設定任務條的位置和寬度
                taskBar.style.left = `${leftOffset}px`;
                taskBar.style.top = `${topOffset}px`;
                taskBar.style.width = `${totalWidth}px`;
                
                if (this.config.debug?.showConsoleLogs && this.config.debug?.logLevel === 'debug') {
                    console.log('任務條位置計算:', {
                        leftOffset,
                        topOffset,
                        totalWidth,
                        spanDays,
                        gridGap,
                        cellWidth,
                        taskBarIndex,
                        rangeId: taskRange.rangeId,
                        startDate: taskRange.startDate ? new Date(taskRange.startDate).toISOString().split('T')[0] : 'none',
                        endDate: taskRange.endDate ? new Date(taskRange.endDate).toISOString().split('T')[0] : 'none'
                    });
                }
            }
        }, 200);
        
        // 取得任務條欄位顯示配置
        const taskBarFields = this.config.taskDisplay?.taskBarFields || {};
        
        // 動態顯示所有配置的欄位（傳入 targetContainer 以便下拉層可以正確定位）
        this.renderTaskBarFields(taskBar, taskRange, taskBarFields, targetContainer);
        
        // 創建懸停下拉層（如果啟用 hoverEffect）
        if (this.config.taskDisplay?.hoverEffect !== false) {
            this.createHoverDropdown(taskBar, taskRange, targetContainer);
        }
        
        // 點擊事件 - 使用 addEventListener 確保事件正確綁定
        taskBar.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (this.config.debug?.showConsoleLogs) {
                console.log('點擊任務條:', taskRange.rangeId);
            }
            
            // 顯示該範圍的所有任務詳情
            if (!taskRange.tasks || taskRange.tasks.length === 0) {
                if (this.config.debug?.showConsoleLogs) {
                    console.warn('任務範圍沒有任務:', taskRange);
                }
                return;
            }
            
            const tasks = taskRange.tasks.map(task => ({
                environment: taskRange.environment,
                environmentData: taskRange.environmentData,
                task: task,
                batch: taskRange.batch,
                batchColor: taskRange.batchColor,
                status: taskRange.status,
                statusColor: taskRange.statusColor
            }));
            
            this.showRangeDetails(taskRange, tasks);
        });
        
        // 將任務條添加到日曆網格層級（而不是單個日期格子），這樣才能跨越多個格子
        targetContainer.appendChild(taskBar);
        
        // 在跨越的所有日期格子上添加佔位符（避免點擊穿透，並保持垂直空間）
        // 檢查是否啟用佔位符顯示
        if (this.config.taskDisplay?.showPlaceholders !== false) {
            setTimeout(() => {
                const taskBarHeight = this.config.calendar?.taskBarHeight || 24;
                for (let i = startIndex; i < startIndex + spanDays && i < dayElements.length; i++) {
                    const dayElement = dayElements[i].element;
                    const otherTasksContainer = dayElement.querySelector('.tasks-container');
                    if (otherTasksContainer) {
                        // 檢查是否已經有相同層級的佔位符
                        const existingPlaceholders = otherTasksContainer.querySelectorAll('.task-placeholder');
                        let placeholderIndex = taskBarIndex;
                        
                        // 如果已經有佔位符，檢查是否需要添加新的
                        if (existingPlaceholders.length > taskBarIndex) {
                            // 已經有足夠的佔位符，跳過
                            continue;
                        }
                        
                        // 添加佔位符以保持垂直空間
                        const placeholder = document.createElement('div');
                        placeholder.className = 'task-placeholder';
                        placeholder.style.height = `${taskBarHeight}px`;
                        placeholder.style.marginTop = '2px';
                        placeholder.style.marginBottom = '2px';
                        placeholder.style.visibility = 'hidden'; // 隱藏但佔用空間
                        otherTasksContainer.appendChild(placeholder);
                    }
                }
            }, 250);
        }
    }

    /**
     * 建立日期元素
     * @param {Date} date - 日期
     * @param {number} currentYear - 當前年份
     * @param {number} currentMonth - 當前月份
     * @param {Map} tasksForMonth - 當月任務映射
     * @returns {HTMLElement} 日期元素
     */
    createDayElement(date, currentYear, currentMonth, tasksForMonth) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';

        const dateKey = this.dataProcessor.getDateKey(date);
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = this.isToday(date);
        const isNonWorkingDay = this.isNonWorkingDay(date);

        if (!isCurrentMonth) {
            dayDiv.classList.add('other-month');
        }
        if (isToday) {
            dayDiv.classList.add('today');
        }
        if (isNonWorkingDay) {
            dayDiv.classList.add('non-working-day');
            // 設定非工作日背景顏色
            const nonWorkingConfig = this.config.nonWorkingDays || {};
            if (nonWorkingConfig.backgroundColor) {
                dayDiv.style.backgroundColor = nonWorkingConfig.backgroundColor;
            }
            // 添加非工作日說明作為 title
            const description = this.getNonWorkingDayDescription(date);
            if (description) {
                dayDiv.title = description;
            }
        }

        // 日期數字
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayDiv.appendChild(dayNumber);

        // 任務容器
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks-container';

        // 取得當日任務
        const tasks = tasksForMonth.get(dateKey) || [];
        const filteredTasks = this.dataProcessor.filterTasksByEnvironment(tasks, this.filteredEnvironments);

        // 如果禁用跨日期任務條，任務會在這裡顯示
        // 如果啟用跨日期任務條，跨日期的任務會在 renderSpanningTasks 中處理

        dayDiv.appendChild(tasksContainer);

        // 點擊顯示詳情
        if (filteredTasks.length > 0) {
            dayDiv.style.cursor = 'pointer';
            dayDiv.onclick = () => this.showDayDetails(date, filteredTasks);
        }

        return dayDiv;
    }


    /**
     * 渲染任務條上的欄位（根據配置動態顯示）
     * @param {HTMLElement} taskBar - 任務條元素
     * @param {Object} taskRange - 任務範圍資訊
     * @param {Object} taskBarFields - 欄位顯示配置
     * @param {HTMLElement} targetContainer - 目標容器（用於下拉層定位）
     */
    renderTaskBarFields(taskBar, taskRange, taskBarFields, targetContainer) {
        // 環境名稱（特殊處理：主要識別，樣式不同）
        if (taskBarFields.environment !== false) {
            const envName = document.createElement('span');
            envName.textContent = taskRange.environment;
            envName.style.fontWeight = '700';
            envName.style.color = taskRange.environmentData.color;
            envName.style.marginRight = '8px';
            envName.style.fontSize = '0.75em';
            taskBar.appendChild(envName);
        }

        // 處理其他欄位（按配置順序）
        const fieldOrder = [
            'purpose', 'batch', 'status', 'task', 
            'startDate', 'endDate', 'businessDate',
            'dataBaseDate', 'kingdomFreezeDate', 'kingdomTransferDate',
            'intermediateFile', 'remark'
        ];

        fieldOrder.forEach(fieldKey => {
            if (taskBarFields[fieldKey] !== true) return;

            let value = null;
            let displayText = '';
            let badgeColor = null;

            // 根據欄位類型取得值
            switch (fieldKey) {
                case 'purpose':
                    value = taskRange.environmentData?.purpose;
                    displayText = value || '';
                    badgeColor = '#6366f1'; // 紫色
                    break;
                case 'batch':
                    value = taskRange.batch;
                    if (value && value !== DataProcessor.DEFAULT_BATCH) {
                        displayText = value;
                        badgeColor = taskRange.batchColor;
                    }
                    break;
                case 'status':
                    value = taskRange.status;
                    if (value) {
                        displayText = value;
                        badgeColor = taskRange.statusColor;
                    }
                    break;
                case 'task':
                    // 顯示工作項目（工作內容）- 只在 hover 時以層疊方式顯示
                    if (taskRange.tasks && taskRange.tasks.length > 0) {
                        const taskContents = taskRange.tasks
                            .map(task => task.content || task.task || '')
                            .filter(content => content && content.trim() !== '')
                            .filter((value, index, self) => self.indexOf(value) === index); // 去重
                        
                        if (taskContents.length > 0 && this.config.taskDisplay?.hoverEffect !== false) {
                            // 創建工作項目容器（層疊顯示，預設隱藏）
                            const taskContainer = document.createElement('div');
                            taskContainer.className = 'task-items-container task-items-dropdown';
                            taskContainer.style.display = 'none'; // 預設隱藏
                            taskContainer.style.position = 'absolute';
                            taskContainer.style.top = '100%';
                            taskContainer.style.left = '0';
                            taskContainer.style.zIndex = '20';
                            taskContainer.style.marginTop = '4px';
                            taskContainer.style.padding = '8px';
                            taskContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
                            taskContainer.style.borderRadius = '8px';
                            taskContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                            taskContainer.style.minWidth = '200px';
                            taskContainer.style.maxWidth = '400px';
                            taskContainer.style.flexWrap = 'wrap';
                            taskContainer.style.gap = '6px';
                            taskContainer.style.alignItems = 'flex-start';
                            taskContainer.style.opacity = '0';
                            taskContainer.style.transform = 'translateY(-5px)';
                            taskContainer.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                            
                            // 為每個工作項目創建小標籤
                            taskContents.forEach((content) => {
                                const taskChip = document.createElement('span');
                                taskChip.className = 'task-item-chip';
                                taskChip.textContent = content;
                                taskChip.style.backgroundColor = '#8b5cf6';
                                taskChip.style.color = '#ffffff';
                                taskChip.style.padding = '4px 10px';
                                taskChip.style.borderRadius = '12px';
                                taskChip.style.fontSize = '0.7em';
                                taskChip.style.fontWeight = '500';
                                taskChip.style.whiteSpace = 'nowrap';
                                taskChip.style.display = 'inline-block';
                                taskChip.title = content; // 懸停顯示完整內容
                                taskContainer.appendChild(taskChip);
                            });
                            
                            // 將下拉層添加到日曆網格容器（而不是任務條），這樣可以正確定位
                            // 先將容器添加到任務條作為標記，然後移動到網格容器
                            taskBar.setAttribute('data-task-container-id', `task-container-${taskRange.rangeId}`);
                            targetContainer.appendChild(taskContainer);
                            
                            // 添加 hover 事件監聽器
                            const updateDropdownPosition = () => {
                                const taskBarRect = taskBar.getBoundingClientRect();
                                const container = targetContainer || taskBar.closest('.month-grid') || taskBar.closest('.calendar-grid');
                                if (container) {
                                    const gridRect = container.getBoundingClientRect();
                                    // 下拉層應該在任務條下方，左對齊
                                    taskContainer.style.left = `${taskBarRect.left - gridRect.left}px`;
                                    taskContainer.style.top = `${taskBarRect.bottom - gridRect.top + 4}px`;
                                }
                            };
                            
                            taskBar.addEventListener('mouseenter', () => {
                                updateDropdownPosition();
                                taskContainer.style.display = 'flex';
                                // 使用 requestAnimationFrame 確保樣式已應用
                                requestAnimationFrame(() => {
                                    taskContainer.style.opacity = '1';
                                    taskContainer.style.transform = 'translateY(0)';
                                });
                            });
                            
                            taskBar.addEventListener('mouseleave', () => {
                                taskContainer.style.opacity = '0';
                                taskContainer.style.transform = 'translateY(-5px)';
                                // 動畫完成後隱藏
                                setTimeout(() => {
                                    if (taskContainer.style.opacity === '0') {
                                        taskContainer.style.display = 'none';
                                    }
                                }, 200);
                            });
                            
                            // 當滑鼠移到下拉層時，保持顯示
                            taskContainer.addEventListener('mouseenter', () => {
                                updateDropdownPosition();
                                taskContainer.style.opacity = '1';
                                taskContainer.style.transform = 'translateY(0)';
                            });
                            
                            taskContainer.addEventListener('mouseleave', () => {
                                taskContainer.style.opacity = '0';
                                taskContainer.style.transform = 'translateY(-5px)';
                                setTimeout(() => {
                                    if (taskContainer.style.opacity === '0') {
                                        taskContainer.style.display = 'none';
                                    }
                                }, 200);
                            });
                            
                            return; // 跳過後續的 badge 創建邏輯
                        }
                    }
                    break;
                case 'startDate':
                    if (taskRange.startDate) {
                        displayText = this.formatDate(taskRange.startDate);
                        badgeColor = '#10b981'; // 綠色
                    }
                    break;
                case 'endDate':
                    if (taskRange.endDate) {
                        displayText = this.formatDate(taskRange.endDate);
                        badgeColor = '#ef4444'; // 紅色
                    }
                    break;
                case 'businessDate':
                    // 從任務中取得營業日
                    if (taskRange.tasks && taskRange.tasks.length > 0) {
                        const businessDates = taskRange.tasks
                            .map(task => task.businessDate)
                            .filter(date => date !== null && date !== undefined);
                        
                        if (businessDates.length > 0) {
                            const earliestDate = businessDates.reduce((earliest, current) => {
                                return current < earliest ? current : earliest;
                            });
                            displayText = this.formatDate(earliestDate);
                            badgeColor = '#f59e0b'; // 橙色
                        }
                    }
                    break;
                case 'dataBaseDate':
                case 'kingdomFreezeDate':
                case 'kingdomTransferDate':
                    // 從任務中取得日期欄位
                    if (taskRange.tasks && taskRange.tasks.length > 0) {
                        const dates = taskRange.tasks
                            .map(task => task[fieldKey])
                            .filter(date => date !== null && date !== undefined);
                        
                        if (dates.length > 0) {
                            const earliestDate = dates.reduce((earliest, current) => {
                                return current < earliest ? current : earliest;
                            });
                            displayText = this.formatDate(earliestDate);
                            badgeColor = '#06b6d4'; // 青色
                        }
                    }
                    break;
                case 'intermediateFile':
                case 'remark':
                    // 文字欄位
                    if (taskRange.tasks && taskRange.tasks.length > 0) {
                        const values = taskRange.tasks
                            .map(task => task[fieldKey])
                            .filter(val => val && val !== '');
                        
                        if (values.length > 0) {
                            displayText = values[0];
                            badgeColor = '#64748b'; // 灰色
                        }
                    }
                    break;
            }

            // 如果有值，創建標籤
            if (displayText && badgeColor) {
                const badge = document.createElement('span');
                badge.className = 'task-bar-badge';
                badge.textContent = displayText;
                badge.style.backgroundColor = badgeColor;
                badge.style.color = this.getContrastTextColor(badgeColor);
                badge.style.padding = '2px 6px';
                badge.style.borderRadius = '4px';
                badge.style.fontSize = '0.65em';
                badge.style.fontWeight = '600';
                badge.style.marginRight = '4px';
                badge.title = this.getFieldDisplayName(fieldKey) + ': ' + displayText;
                taskBar.appendChild(badge);
            }
        });
    }

    /**
     * 取得欄位的顯示名稱
     * @param {string} fieldKey - 欄位鍵值
     * @returns {string} 顯示名稱
     */
    getFieldDisplayName(fieldKey) {
        const fieldDisplayNames = this.config.fieldDisplayNames || {};
        return fieldDisplayNames[fieldKey] || fieldKey;
    }

    /**
     * 創建懸停下拉層（顯示詳細資訊）
     * @param {HTMLElement} taskBar - 任務條元素
     * @param {Object} taskRange - 任務範圍資訊
     * @param {HTMLElement} targetContainer - 目標容器（用於下拉層定位）
     */
    createHoverDropdown(taskBar, taskRange, targetContainer) {
        const hoverDropdownFields = this.config.taskDisplay?.hoverDropdownFields || {};
        
        // 檢查是否有任何欄位需要顯示
        const hasFieldsToShow = Object.keys(hoverDropdownFields).some(key => hoverDropdownFields[key] === true);
        if (!hasFieldsToShow) return;
        
        // 創建下拉層容器
        const dropdown = document.createElement('div');
        dropdown.className = 'task-hover-dropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.zIndex = '20';
        dropdown.style.marginTop = '4px';
        dropdown.style.padding = '12px';
        dropdown.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
        dropdown.style.backdropFilter = 'blur(10px)';
        dropdown.style.borderRadius = '8px';
        dropdown.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)';
        dropdown.style.minWidth = '250px';
        dropdown.style.maxWidth = '450px';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-5px)';
        dropdown.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        dropdown.style.display = 'none'; // 預設隱藏
        dropdown.style.flexDirection = 'column';
        dropdown.style.gap = '8px';
        
        // 將下拉層添加到目標容器
        const container = targetContainer || taskBar.closest('.month-grid') || taskBar.closest('.calendar-grid');
        if (container) {
            container.appendChild(dropdown);
        } else {
            return; // 如果找不到容器，不創建下拉層
        }
        
        // 創建資訊區塊
        const createInfoRow = (label, value, color = null) => {
            if (!value && value !== 0) return null;
            
            const row = document.createElement('div');
            row.className = 'dropdown-info-row';
            row.style.display = 'flex';
            row.style.alignItems = 'flex-start';
            row.style.gap = '8px';
            row.style.padding = '4px 0';
            
            const labelSpan = document.createElement('span');
            labelSpan.className = 'dropdown-label';
            labelSpan.textContent = label + '：';
            labelSpan.style.fontWeight = '600';
            labelSpan.style.color = '#666';
            labelSpan.style.minWidth = '80px';
            labelSpan.style.flexShrink = '0';
            row.appendChild(labelSpan);
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'dropdown-value';
            valueSpan.textContent = value;
            valueSpan.style.color = color || '#333';
            valueSpan.style.flex = '1';
            valueSpan.style.wordBreak = 'break-word';
            row.appendChild(valueSpan);
            
            return row;
        };
        
        // 顯示工作項目
        if (hoverDropdownFields.task && taskRange.tasks && taskRange.tasks.length > 0) {
            const taskContents = taskRange.tasks
                .map(task => task.content || task.task || '')
                .filter(content => content && content.trim() !== '')
                .filter((value, index, self) => self.indexOf(value) === index); // 去重
            
            if (taskContents.length > 0) {
                const taskSection = document.createElement('div');
                taskSection.className = 'dropdown-section';
                taskSection.style.marginBottom = '4px';
                
                const taskLabel = document.createElement('div');
                taskLabel.textContent = this.getFieldDisplayName('task') + '：';
                taskLabel.style.fontWeight = '600';
                taskLabel.style.color = '#666';
                taskLabel.style.marginBottom = '6px';
                taskLabel.style.fontSize = '0.85em';
                taskSection.appendChild(taskLabel);
                
                const taskChipsContainer = document.createElement('div');
                taskChipsContainer.style.display = 'flex';
                taskChipsContainer.style.flexWrap = 'wrap';
                taskChipsContainer.style.gap = '6px';
                
                taskContents.forEach((content) => {
                    const taskChip = document.createElement('span');
                    taskChip.className = 'task-item-chip';
                    taskChip.textContent = content;
                    taskChip.style.backgroundColor = '#8b5cf6';
                    taskChip.style.color = '#ffffff';
                    taskChip.style.padding = '4px 10px';
                    taskChip.style.borderRadius = '12px';
                    taskChip.style.fontSize = '0.75em';
                    taskChip.style.fontWeight = '500';
                    taskChip.style.whiteSpace = 'nowrap';
                    taskChip.style.display = 'inline-block';
                    taskChip.title = content;
                    taskChipsContainer.appendChild(taskChip);
                });
                
                taskSection.appendChild(taskChipsContainer);
                dropdown.appendChild(taskSection);
            }
        }
        
        // 顯示開始日期
        if (hoverDropdownFields.startDate && taskRange.startDate) {
            const row = createInfoRow(
                this.getFieldDisplayName('startDate'),
                this.formatDate(taskRange.startDate),
                '#10b981'
            );
            if (row) dropdown.appendChild(row);
        }
        
        // 顯示結束日期
        if (hoverDropdownFields.endDate && taskRange.endDate) {
            const row = createInfoRow(
                this.getFieldDisplayName('endDate'),
                this.formatDate(taskRange.endDate),
                '#ef4444'
            );
            if (row) dropdown.appendChild(row);
        }
        
        // 顯示營業日
        if (hoverDropdownFields.businessDate && taskRange.tasks && taskRange.tasks.length > 0) {
            const businessDates = taskRange.tasks
                .map(task => task.businessDate)
                .filter(date => date)
                .filter((value, index, self) => {
                    const dateStr = value instanceof Date ? this.formatDateForComparison(value) : String(value);
                    return self.findIndex(d => {
                        const dStr = d instanceof Date ? this.formatDateForComparison(d) : String(d);
                        return dStr === dateStr;
                    }) === index;
                });
            
            if (businessDates.length > 0) {
                const displayDates = businessDates.map(date => {
                    if (date instanceof Date) {
                        return this.formatDate(date);
                    } else if (typeof date === 'string') {
                        try {
                            return this.formatDate(new Date(date));
                        } catch {
                            return date;
                        }
                    }
                    return String(date);
                }).join('、');
                
                const row = createInfoRow(
                    this.getFieldDisplayName('businessDate'),
                    displayDates,
                    '#f59e0b'
                );
                if (row) dropdown.appendChild(row);
            }
        }
        
        // 顯示資料基準日
        if (hoverDropdownFields.dataBaseDate && taskRange.tasks && taskRange.tasks.length > 0) {
            const dataBaseDates = taskRange.tasks
                .map(task => task.dataBaseDate)
                .filter(date => date)
                .filter((value, index, self) => {
                    const dateStr = value instanceof Date ? this.formatDateForComparison(value) : String(value);
                    return self.findIndex(d => {
                        const dStr = d instanceof Date ? this.formatDateForComparison(d) : String(d);
                        return dStr === dateStr;
                    }) === index;
                });
            
            if (dataBaseDates.length > 0) {
                const displayDates = dataBaseDates.map(date => {
                    if (date instanceof Date) {
                        return this.formatDate(date);
                    } else if (typeof date === 'string') {
                        try {
                            return this.formatDate(new Date(date));
                        } catch {
                            return date;
                        }
                    }
                    return String(date);
                }).join('、');
                
                const row = createInfoRow(
                    this.getFieldDisplayName('dataBaseDate'),
                    displayDates,
                    '#06b6d4'
                );
                if (row) dropdown.appendChild(row);
            }
        }
        
        // 顯示京城封版日
        if (hoverDropdownFields.kingdomFreezeDate && taskRange.tasks && taskRange.tasks.length > 0) {
            const freezeDates = taskRange.tasks
                .map(task => task.kingdomFreezeDate)
                .filter(date => date)
                .filter((value, index, self) => {
                    const dateStr = value instanceof Date ? this.formatDateForComparison(value) : String(value);
                    return self.findIndex(d => {
                        const dStr = d instanceof Date ? this.formatDateForComparison(d) : String(d);
                        return dStr === dateStr;
                    }) === index;
                });
            
            if (freezeDates.length > 0) {
                const displayDates = freezeDates.map(date => {
                    if (date instanceof Date) {
                        return this.formatDate(date);
                    } else if (typeof date === 'string') {
                        try {
                            return this.formatDate(new Date(date));
                        } catch {
                            return date;
                        }
                    }
                    return String(date);
                }).join('、');
                
                const row = createInfoRow(
                    this.getFieldDisplayName('kingdomFreezeDate'),
                    displayDates,
                    '#06b6d4'
                );
                if (row) dropdown.appendChild(row);
            }
        }
        
        // 顯示京城傳送中介檔日
        if (hoverDropdownFields.kingdomTransferDate && taskRange.tasks && taskRange.tasks.length > 0) {
            const transferDates = taskRange.tasks
                .map(task => task.kingdomTransferDate)
                .filter(date => date)
                .filter((value, index, self) => {
                    const dateStr = value instanceof Date ? this.formatDateForComparison(value) : String(value);
                    return self.findIndex(d => {
                        const dStr = d instanceof Date ? this.formatDateForComparison(d) : String(d);
                        return dStr === dateStr;
                    }) === index;
                });
            
            if (transferDates.length > 0) {
                const displayDates = transferDates.map(date => {
                    if (date instanceof Date) {
                        return this.formatDate(date);
                    } else if (typeof date === 'string') {
                        try {
                            return this.formatDate(new Date(date));
                        } catch {
                            return date;
                        }
                    }
                    return String(date);
                }).join('、');
                
                const row = createInfoRow(
                    this.getFieldDisplayName('kingdomTransferDate'),
                    displayDates,
                    '#06b6d4'
                );
                if (row) dropdown.appendChild(row);
            }
        }
        
        // 顯示中介檔
        if (hoverDropdownFields.intermediateFile && taskRange.tasks && taskRange.tasks.length > 0) {
            const files = taskRange.tasks
                .map(task => task.intermediateFile)
                .filter(file => file && file.trim() !== '')
                .filter((value, index, self) => self.indexOf(value) === index);
            
            if (files.length > 0) {
                const row = createInfoRow(
                    this.getFieldDisplayName('intermediateFile'),
                    files.join('、'),
                    '#64748b'
                );
                if (row) dropdown.appendChild(row);
            }
        }
        
        // 顯示備注說明
        if (hoverDropdownFields.remark && taskRange.tasks && taskRange.tasks.length > 0) {
            const remarks = taskRange.tasks
                .map(task => task.remark)
                .filter(remark => remark && remark.trim() !== '')
                .filter((value, index, self) => self.indexOf(value) === index);
            
            if (remarks.length > 0) {
                const row = createInfoRow(
                    this.getFieldDisplayName('remark'),
                    remarks.join('、'),
                    '#64748b'
                );
                if (row) dropdown.appendChild(row);
            }
        }
        
        // 如果沒有任何內容，不顯示下拉層
        if (dropdown.children.length === 0) {
            dropdown.remove();
            return;
        }
        
        // 添加 hover 事件監聽器
        const updateDropdownPosition = () => {
            const taskBarRect = taskBar.getBoundingClientRect();
            const gridRect = container.getBoundingClientRect();
            // 下拉層應該在任務條下方，左對齊
            dropdown.style.left = `${taskBarRect.left - gridRect.left}px`;
            dropdown.style.top = `${taskBarRect.bottom - gridRect.top + 4}px`;
        };
        
        taskBar.addEventListener('mouseenter', () => {
            updateDropdownPosition();
            dropdown.style.display = 'flex';
            requestAnimationFrame(() => {
                dropdown.style.opacity = '1';
                dropdown.style.transform = 'translateY(0)';
            });
        });
        
        taskBar.addEventListener('mouseleave', () => {
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-5px)';
            setTimeout(() => {
                if (dropdown.style.opacity === '0') {
                    dropdown.style.display = 'none';
                }
            }, 200);
        });
        
        // 當滑鼠移到下拉層時，保持顯示
        dropdown.addEventListener('mouseenter', () => {
            updateDropdownPosition();
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0)';
        });
        
        dropdown.addEventListener('mouseleave', () => {
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-5px)';
            setTimeout(() => {
                if (dropdown.style.opacity === '0') {
                    dropdown.style.display = 'none';
                }
            }, 200);
        });
    }

    /**
     * 為顏色添加透明度
     * @param {string} color - 顏色代碼
     * @param {number} alpha - 透明度 (0-1)
     * @returns {string} rgba 顏色
     */
    addAlpha(color, alpha) {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }

    /**
     * 計算顏色的亮度（用於決定文字顏色）
     * @param {string} color - 顏色代碼（hex格式）
     * @returns {number} 亮度值 (0-255)
     */
    getLuminance(color) {
        if (!color || !color.startsWith('#')) {
            return 128; // 預設中等亮度
        }
        
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        
        // 使用相對亮度公式 (WCAG)
        // L = 0.2126 * R + 0.7152 * G + 0.0722 * B
        return (0.2126 * r + 0.7152 * g + 0.0722 * b);
    }

    /**
     * 根據背景顏色取得對比文字顏色（白色或黑色）
     * @param {string} backgroundColor - 背景顏色代碼
     * @returns {string} 文字顏色（'#ffffff' 或 '#000000'）
     */
    getContrastTextColor(backgroundColor) {
        const luminance = this.getLuminance(backgroundColor);
        // 如果亮度大於 128（淺色背景），使用黑色文字；否則使用白色文字
        return luminance > 128 ? '#000000' : '#ffffff';
    }

    /**
     * 判斷是否為非工作日
     * @param {Date} date - 日期
     * @returns {boolean} 是否為非工作日
     */
    isNonWorkingDay(date) {
        const nonWorkingConfig = this.config.nonWorkingDays || {};
        
        // 如果未啟用非工作日功能，返回 false
        if (!nonWorkingConfig.enabled) {
            return false;
        }

        // 檢查是否為週末
        if (nonWorkingConfig.includeWeekends !== false) {
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) { // 星期日或星期六
                return true;
            }
        }

        // 檢查自訂非工作日
        if (nonWorkingConfig.customDays && Array.isArray(nonWorkingConfig.customDays)) {
            const dateStr = this.formatDateForComparison(date);
            
            for (const customDay of nonWorkingConfig.customDays) {
                // 單一日期
                if (customDay.date) {
                    if (this.isDateInRange(dateStr, customDay.date, customDay.date)) {
                        return true;
                    }
                }
                // 日期範圍
                if (customDay.start && customDay.end) {
                    if (this.isDateInRange(dateStr, customDay.start, customDay.end)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * 取得非工作日說明
     * @param {Date} date - 日期
     * @returns {string|null} 非工作日說明
     */
    getNonWorkingDayDescription(date) {
        const nonWorkingConfig = this.config.nonWorkingDays || {};
        
        if (!nonWorkingConfig.enabled || !nonWorkingConfig.customDays) {
            const dayOfWeek = date.getDay();
            if (nonWorkingConfig.includeWeekends !== false && (dayOfWeek === 0 || dayOfWeek === 6)) {
                return dayOfWeek === 0 ? '星期日' : '星期六';
            }
            return null;
        }

        const dateStr = this.formatDateForComparison(date);
        const dayOfWeek = date.getDay();
        
        // 檢查週末
        if (nonWorkingConfig.includeWeekends !== false && (dayOfWeek === 0 || dayOfWeek === 6)) {
            // 先檢查是否有自訂說明
            for (const customDay of nonWorkingConfig.customDays) {
                let matches = false;
                if (customDay.date) {
                    matches = this.isDateInRange(dateStr, customDay.date, customDay.date);
                } else if (customDay.start && customDay.end) {
                    matches = this.isDateInRange(dateStr, customDay.start, customDay.end);
                }
                if (matches && customDay.description) {
                    return customDay.description;
                }
            }
            // 如果沒有自訂說明，返回週末說明
            return dayOfWeek === 0 ? '星期日' : '星期六';
        }

        // 檢查自訂非工作日
        for (const customDay of nonWorkingConfig.customDays) {
            let matches = false;
            
            if (customDay.date) {
                matches = this.isDateInRange(dateStr, customDay.date, customDay.date);
            } else if (customDay.start && customDay.end) {
                matches = this.isDateInRange(dateStr, customDay.start, customDay.end);
            }
            
            if (matches && customDay.description) {
                return customDay.description;
            }
        }

        return null;
    }

    /**
     * 格式化日期用於比較（YYYY-MM-DD）
     * @param {Date|string} date - 日期物件或字串
     * @returns {string} 格式化後的日期字串
     */
    formatDateForComparison(date) {
        if (typeof date === 'string') {
            return date;
        }
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 檢查日期是否在範圍內
     * @param {string} dateStr - 日期字串（YYYY-MM-DD）
     * @param {string} startStr - 開始日期字串（YYYY-MM-DD）
     * @param {string} endStr - 結束日期字串（YYYY-MM-DD）
     * @returns {boolean} 是否在範圍內
     */
    isDateInRange(dateStr, startStr, endStr) {
        return dateStr >= startStr && dateStr <= endStr;
    }

    /**
     * 檢查是否為今天
     * @param {Date} date - 日期
     * @returns {boolean}
     */
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    /**
     * 更新月份顯示
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {number} monthsToDisplay - 顯示的月份數量
     */
    updateMonthDisplay(year, month, monthsToDisplay = 1) {
        const monthDisplay = document.getElementById('currentMonth');
        if (monthDisplay) {
            if (monthsToDisplay === 1) {
                monthDisplay.textContent = `${year}年${month + 1}月`;
            } else {
                // 計算最後一個月份
                const lastMonthDate = new Date(year, month + monthsToDisplay - 1, 1);
                const lastYear = lastMonthDate.getFullYear();
                const lastMonth = lastMonthDate.getMonth();
                
                if (year === lastYear) {
                    // 同一年
                    monthDisplay.textContent = `${year}年${month + 1}月 - ${lastMonth + 1}月`;
                } else {
                    // 跨年
                    monthDisplay.textContent = `${year}年${month + 1}月 - ${lastYear}年${lastMonth + 1}月`;
                }
            }
        }
        
        // 更新非工作日說明（顯示所有顯示的月份）
        this.updateNonWorkingDaysInfo(year, month, monthsToDisplay);
    }

    /**
     * 更新非工作日說明區塊
     * @param {number} year - 起始年份
     * @param {number} month - 起始月份
     * @param {number} monthsToDisplay - 顯示的月份數量
     */
    updateNonWorkingDaysInfo(year, month, monthsToDisplay = 1) {
        const container = document.getElementById('nonWorkingDaysInfo');
        if (!container) return;

        const nonWorkingConfig = this.config.nonWorkingDays || {};
        
        // 如果未啟用非工作日功能，隱藏區塊
        if (!nonWorkingConfig.enabled) {
            container.innerHTML = '';
            container.parentElement.style.display = 'none';
            return;
        }

        container.parentElement.style.display = 'block';
        container.innerHTML = '';

        // 收集所有顯示月份的非工作日（只包含自訂的非工作日，不包含週末）
        const nonWorkingDaysList = [];
        const processedDates = new Set();

        // 遍歷所有顯示的月份
        for (let m = 0; m < monthsToDisplay; m++) {
            const currentYear = new Date(year, month + m, 1).getFullYear();
            const currentMonth = new Date(year, month + m, 1).getMonth();
            
            // 取得當月所有日期
            const firstDay = new Date(currentYear, currentMonth, 1);
            const lastDay = new Date(currentYear, currentMonth + 1, 0);
            const daysInMonth = lastDay.getDate();

            // 檢查自訂非工作日
            if (nonWorkingConfig.customDays && Array.isArray(nonWorkingConfig.customDays)) {
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(currentYear, currentMonth, day);
                    date.setHours(0, 0, 0, 0);
                    const dateStr = this.formatDateForComparison(date);
                    
                    // 檢查是否在自訂非工作日列表中
                    for (const customDay of nonWorkingConfig.customDays) {
                        let matches = false;
                        
                        if (customDay.date) {
                            matches = this.isDateInRange(dateStr, customDay.date, customDay.date);
                        } else if (customDay.start && customDay.end) {
                            matches = this.isDateInRange(dateStr, customDay.start, customDay.end);
                        }
                        
                        if (matches && !processedDates.has(dateStr)) {
                            processedDates.add(dateStr);
                            const description = customDay.description || '非工作日';
                            nonWorkingDaysList.push({
                                date: date,
                                dateStr: dateStr,
                                description: description,
                                year: currentYear,
                                month: currentMonth,
                                day: day
                            });
                            break; // 找到匹配就跳出，避免重複
                        }
                    }
                }
            }
        }

        // 按日期排序（先按年份，再按月份，最後按日期）
        nonWorkingDaysList.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if (a.month !== b.month) return a.month - b.month;
            return a.day - b.day;
        });

        // 如果沒有非工作日，顯示提示
        if (nonWorkingDaysList.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'non-working-days-empty';
            if (monthsToDisplay === 1) {
                emptyMsg.textContent = '本月無特殊非工作日';
            } else {
                emptyMsg.textContent = `此${monthsToDisplay}個月無特殊非工作日`;
            }
            emptyMsg.style.color = '#999';
            emptyMsg.style.fontStyle = 'italic';
            emptyMsg.style.padding = '10px';
            container.appendChild(emptyMsg);
            return;
        }

        // 建立非工作日列表
        const listContainer = document.createElement('div');
        listContainer.className = 'non-working-days-list';

        // 按月份分組顯示（如果顯示多個月份）
        if (monthsToDisplay > 1) {
            const monthsMap = new Map();
            
            // 按月份分組
            nonWorkingDaysList.forEach(item => {
                const monthKey = `${item.year}-${item.month}`;
                if (!monthsMap.has(monthKey)) {
                    monthsMap.set(monthKey, {
                        year: item.year,
                        month: item.month,
                        items: []
                    });
                }
                monthsMap.get(monthKey).items.push(item);
            });
            
            // 按月份順序顯示
            const sortedMonths = Array.from(monthsMap.values()).sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });
            
            sortedMonths.forEach(monthData => {
                // 月份標題
                const monthHeader = document.createElement('div');
                monthHeader.className = 'non-working-days-month-header';
                monthHeader.textContent = `${monthData.year}年${monthData.month + 1}月`;
                monthHeader.style.fontWeight = '600';
                monthHeader.style.color = '#1e3a8a';
                monthHeader.style.marginTop = '15px';
                monthHeader.style.marginBottom = '8px';
                monthHeader.style.paddingBottom = '6px';
                monthHeader.style.borderBottom = '2px solid #e5e7eb';
                if (sortedMonths.indexOf(monthData) === 0) {
                    monthHeader.style.marginTop = '0';
                }
                listContainer.appendChild(monthHeader);
                
                // 該月份的非工作日
                monthData.items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'non-working-day-item';

                    // 日期顯示（包含年份和月份）
                    const dateSpan = document.createElement('span');
                    dateSpan.className = 'non-working-day-date';
                    dateSpan.textContent = `${item.month + 1}月${item.day}日`;
                    dateSpan.style.fontWeight = '600';
                    dateSpan.style.color = '#333';
                    dateSpan.style.marginRight = '12px';
                    dateSpan.style.minWidth = '60px';
                    dateSpan.style.display = 'inline-block';

                    // 說明顯示
                    const descSpan = document.createElement('span');
                    descSpan.className = 'non-working-day-description';
                    descSpan.textContent = item.description;
                    descSpan.style.color = '#666';

                    itemDiv.appendChild(dateSpan);
                    itemDiv.appendChild(descSpan);
                    listContainer.appendChild(itemDiv);
                });
            });
        } else {
            // 單月份顯示，不需要月份標題
            nonWorkingDaysList.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'non-working-day-item';

                // 日期顯示
                const dateSpan = document.createElement('span');
                dateSpan.className = 'non-working-day-date';
                dateSpan.textContent = `${item.month + 1}月${item.day}日`;
                dateSpan.style.fontWeight = '600';
                dateSpan.style.color = '#333';
                dateSpan.style.marginRight = '12px';
                dateSpan.style.minWidth = '60px';
                dateSpan.style.display = 'inline-block';

                // 說明顯示
                const descSpan = document.createElement('span');
                descSpan.className = 'non-working-day-description';
                descSpan.textContent = item.description;
                descSpan.style.color = '#666';

                itemDiv.appendChild(dateSpan);
                itemDiv.appendChild(descSpan);
                listContainer.appendChild(itemDiv);
            });
        }

        container.appendChild(listContainer);
    }

    /**
     * 切換到上一個月
     */
    previousMonth() {
        const monthsToDisplay = this.config.calendar?.monthsToDisplay || 1;
        this.currentDate.setMonth(this.currentDate.getMonth() - monthsToDisplay);
        this.render();
    }

    /**
     * 切換到下一個月
     */
    nextMonth() {
        const monthsToDisplay = this.config.calendar?.monthsToDisplay || 1;
        this.currentDate.setMonth(this.currentDate.getMonth() + monthsToDisplay);
        this.render();
    }

    /**
     * 設定環境篩選
     * @param {string|Array} environments - 要顯示的環境
     */
    setFilter(environments) {
        this.filteredEnvironments = environments;
        this.render();
    }

    /**
     * 顯示日期詳情
     * @param {Date} date - 日期
     * @param {Array} tasks - 任務陣列
     */
    showDayDetails(date, tasks) {
        const dateStr = this.formatDate(date);
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = dateStr + ' 的任務詳情';
        
        // 按範圍（環境+梯次+狀態）分組
        const rangesByKey = new Map();
        tasks.forEach(item => {
            const rangeKey = `${item.environment}_${item.batch}_${item.status}`;
            if (!rangesByKey.has(rangeKey)) {
                rangesByKey.set(rangeKey, {
                    environment: item.environment,
                    environmentData: item.environmentData,
                    batch: item.batch,
                    batchColor: item.batchColor,
                    status: item.status,
                    statusColor: item.statusColor,
                    tasks: []
                });
            }
            if (item.tasks) {
                rangesByKey.get(rangeKey).tasks.push(...item.tasks);
            } else if (item.task) {
                rangesByKey.get(rangeKey).tasks.push(item.task);
            }
        });
        
        let html = '';
        rangesByKey.forEach((rangeData) => {
            html += `
                <div class="modal-section">
                    <h3 style="color: ${rangeData.environmentData.color};">${rangeData.environment}</h3>
                    <p><strong>環境目的：</strong>${rangeData.environmentData.purpose}</p>
                    <p><strong>執行梯次：</strong><span class="detail-badge" style="background-color: ${rangeData.batchColor}; color: ${this.getContrastTextColor(rangeData.batchColor)}; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">${rangeData.batch}</span></p>
                    <p><strong>狀態：</strong><span class="detail-badge" style="background-color: ${rangeData.statusColor}; color: ${this.getContrastTextColor(rangeData.statusColor)}; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">${rangeData.status}</span></p>
                    <h4 style="margin-top: 15px; margin-bottom: 10px; color: #666; font-size: 0.95em;">工作項目：</h4>
                    <ul class="task-list">
                        ${rangeData.tasks.map(task => this.generateTaskDetailHTML(task)).join('')}
                    </ul>
                </div>
            `;
        });

        modalBody.innerHTML = html;
        modal.classList.add('active');
    }

    /**
     * 顯示任務範圍詳情（用於跨日期任務條點擊）
     * @param {Object} taskRange - 任務範圍資訊
     * @param {Array} tasks - 任務陣列
     */
    showRangeDetails(taskRange, tasks) {
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalTitle || !modalBody) {
            if (this.config.debug?.showConsoleLogs) {
                console.error('找不到彈窗元素');
            }
            return;
        }

        modalTitle.textContent = taskRange.environment;
        modalTitle.style.color = taskRange.environmentData.color;
        
        let html = `
            <div class="modal-section">
                <h3 style="color: ${taskRange.environmentData.color};">${taskRange.environment}</h3>
                <p><strong>環境目的：</strong>${taskRange.environmentData.purpose}</p>
                <p><strong>執行梯次：</strong><span class="detail-badge" style="background-color: ${taskRange.batchColor}; color: ${this.getContrastTextColor(taskRange.batchColor)}; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">${taskRange.batch}</span></p>
                <p><strong>狀態：</strong><span class="detail-badge" style="background-color: ${taskRange.statusColor}; color: ${this.getContrastTextColor(taskRange.statusColor)}; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">${taskRange.status}</span></p>
                <p><strong>日期範圍：</strong>${this.formatDate(taskRange.startDate)} 至 ${this.formatDate(taskRange.endDate)}</p>
                <h4 style="margin-top: 15px; margin-bottom: 10px; color: #666; font-size: 0.95em;">工作項目：</h4>
                <ul class="task-list">
                    ${tasks.map(item => this.generateTaskDetailHTML(item.task)).join('')}
                </ul>
            </div>
        `;

        modalBody.innerHTML = html;
        modal.classList.add('active');
    }


    /**
     * 格式化日期（使用配置的格式）
     * @param {Date|string} date - 日期物件或字串
     * @returns {string} 格式化後的日期字串
     */
    formatDate(date) {
        if (!date) return '';
        
        // 如果是字串，轉換為 Date 物件
        let d = date;
        if (!(date instanceof Date)) {
            d = new Date(date);
            if (isNaN(d.getTime())) return '';
        }
        
        const format = this.config.dateFormat?.display || 'YYYY年MM月DD日';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return format
            .replace(/YYYY/g, year)
            .replace(/MM/g, month)
            .replace(/DD/g, day)
            .replace(/Y/g, year)
            .replace(/M/g, String(d.getMonth() + 1))
            .replace(/D/g, String(d.getDate()));
    }

    /**
     * 在日期格子內渲染任務（當禁用跨日期任務條時使用）
     * @param {Array} dayElements - 日期元素陣列
     * @param {Map} taskRanges - 任務範圍映射
     * @param {number} year - 年份
     * @param {number} month - 月份
     */
    renderTasksInDayCells(dayElements, taskRanges, year, month) {
        // 過濾出當前月份的任務範圍
        let monthTaskRanges = Array.from(taskRanges.values()).filter(taskRange => {
            if (!taskRange.dateRange || taskRange.dateRange.length === 0) return false;
            
            // 檢查日期範圍是否與當前月份有交集
            const hasDateInMonth = taskRange.dateRange.some(date => {
                return date.getFullYear() === year && date.getMonth() === month;
            });
            
            return hasDateInMonth;
        });
        
        // 應用環境篩選
        if (this.filteredEnvironments !== 'all' && this.filteredEnvironments) {
            const filterSet = Array.isArray(this.filteredEnvironments) 
                ? new Set(this.filteredEnvironments) 
                : new Set([this.filteredEnvironments]);
            
            monthTaskRanges = monthTaskRanges.filter(taskRange => {
                return filterSet.has(taskRange.environment);
            });
        }

        // 為每個日期格子添加任務
        dayElements.forEach((dayElement, index) => {
            const date = dayElement.date;
            const dateKey = this.dataProcessor.getDateKey(date);
            const tasksContainer = dayElement.element.querySelector('.tasks-container');
            
            if (!tasksContainer) return;

            // 找出該日期範圍內的任務
            let tasksForThisDate = monthTaskRanges.filter(taskRange => {
                if (!taskRange.dateRange || taskRange.dateRange.length === 0) return false;
                return taskRange.dateRange.some(d => {
                    const dKey = this.dataProcessor.getDateKey(d);
                    return dKey === dateKey;
                });
            });

            // 應用 maxTasksInBlock 限制（按環境分組）
            const maxTasksInBlock = this.config.calendar?.maxTasksInBlock;
            if (maxTasksInBlock && maxTasksInBlock > 0) {
                const tasksByEnvironment = new Map();
                tasksForThisDate.forEach(taskRange => {
                    const envName = taskRange.environment;
                    if (!tasksByEnvironment.has(envName)) {
                        tasksByEnvironment.set(envName, []);
                    }
                    tasksByEnvironment.get(envName).push(taskRange);
                });
                
                // 限制每個環境的任務數
                tasksForThisDate = [];
                tasksByEnvironment.forEach((envTasks, envName) => {
                    const limitedTasks = envTasks.slice(0, maxTasksInBlock);
                    tasksForThisDate.push(...limitedTasks);
                });
            }

            // 應用 maxDisplayTasks 限制（總任務數）
            const maxDisplayTasks = this.config.calendar?.maxDisplayTasks;
            if (maxDisplayTasks && maxDisplayTasks > 0) {
                tasksForThisDate = tasksForThisDate.slice(0, maxDisplayTasks);
            }

            // 為每個任務創建顯示元素
            tasksForThisDate.forEach(taskRange => {
                const taskItem = document.createElement('div');
                taskItem.className = 'day-task-item';
                taskItem.style.backgroundColor = this.addAlpha(taskRange.environmentData.color, 0.15);
                taskItem.style.borderLeft = `3px solid ${taskRange.environmentData.color}`;
                taskItem.style.padding = '4px 6px';
                taskItem.style.marginBottom = '4px';
                taskItem.style.borderRadius = '3px';
                taskItem.style.fontSize = '0.75em';
                taskItem.style.cursor = 'pointer';
                
                // 顯示環境名稱
                const envName = document.createElement('span');
                envName.textContent = taskRange.environment;
                envName.style.fontWeight = '600';
                envName.style.color = taskRange.environmentData.color;
                envName.style.marginRight = '6px';
                taskItem.appendChild(envName);
                
                // 顯示其他資訊（如果配置了）
                const taskBarFields = this.config.taskDisplay?.taskBarFields || {};
                if (taskBarFields.batch && taskRange.batch) {
                    const batch = document.createElement('span');
                    batch.textContent = taskRange.batch;
                    batch.style.marginRight = '4px';
                    batch.style.fontSize = '0.85em';
                    taskItem.appendChild(batch);
                }
                
                // 顯示工作項目（工作內容）- 使用現代化的標籤樣式
                if (taskBarFields.task && taskRange.tasks && taskRange.tasks.length > 0) {
                    const taskContents = taskRange.tasks
                        .map(task => task.content || task.task || '')
                        .filter(content => content && content.trim() !== '')
                        .filter((value, index, self) => self.indexOf(value) === index); // 去重
                    
                    if (taskContents.length > 0) {
                        // 創建工作項目容器（允許換行）
                        const taskContainer = document.createElement('div');
                        taskContainer.className = 'task-items-container';
                        taskContainer.style.display = 'flex';
                        taskContainer.style.flexWrap = 'wrap';
                        taskContainer.style.gap = '4px';
                        taskContainer.style.marginTop = '4px';
                        taskContainer.style.alignItems = 'center';
                        
                        // 為每個工作項目創建小標籤
                        taskContents.forEach((content) => {
                            const taskChip = document.createElement('span');
                            taskChip.className = 'task-item-chip';
                            taskChip.textContent = content;
                            taskChip.style.backgroundColor = '#8b5cf6';
                            taskChip.style.color = '#ffffff';
                            taskChip.style.padding = '3px 8px';
                            taskChip.style.borderRadius = '12px';
                            taskChip.style.fontSize = '0.7em';
                            taskChip.style.fontWeight = '500';
                            taskChip.style.whiteSpace = 'nowrap';
                            taskChip.style.maxWidth = '100%';
                            taskChip.style.overflow = 'hidden';
                            taskChip.style.textOverflow = 'ellipsis';
                            taskChip.style.display = 'inline-block';
                            taskChip.title = content; // 懸停顯示完整內容
                            taskContainer.appendChild(taskChip);
                        });
                        
                        taskItem.appendChild(taskContainer);
                    }
                }
                
                // 點擊事件
                taskItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tasks = taskRange.tasks.map(task => ({
                        environment: taskRange.environment,
                        environmentData: taskRange.environmentData,
                        task: task,
                        batch: taskRange.batch,
                        batchColor: taskRange.batchColor,
                        status: taskRange.status,
                        statusColor: taskRange.statusColor
                    }));
                    this.showRangeDetails(taskRange, tasks);
                });
                
                tasksContainer.appendChild(taskItem);
            });
        });
    }

    /**
     * 在日期格子內渲染任務（多月份，當禁用跨日期任務條時使用）
     * @param {Array} allDayElements - 所有月份的日期元素陣列
     * @param {Map} taskRanges - 任務範圍映射
     * @param {number} startYear - 起始年份
     * @param {number} startMonth - 起始月份
     * @param {number} monthsToDisplay - 顯示的月份數量
     */
    renderTasksInDayCellsForMultipleMonths(allDayElements, taskRanges, startYear, startMonth, monthsToDisplay) {
        // 計算顯示的月份範圍
        const displayMonths = [];
        for (let m = 0; m < monthsToDisplay; m++) {
            const currentYear = new Date(startYear, startMonth + m, 1).getFullYear();
            const currentMonth = new Date(startYear, startMonth + m, 1).getMonth();
            displayMonths.push({ year: currentYear, month: currentMonth });
        }
        
        // 過濾出在顯示月份範圍內的任務範圍
        let monthTaskRanges = Array.from(taskRanges.values()).filter(taskRange => {
            if (!taskRange.dateRange || taskRange.dateRange.length === 0) return false;
            
            const hasDateInDisplayMonths = taskRange.dateRange.some(date => {
                return displayMonths.some(displayMonth => {
                    return date.getFullYear() === displayMonth.year && date.getMonth() === displayMonth.month;
                });
            });
            
            return hasDateInDisplayMonths;
        });
        
        // 應用環境篩選
        if (this.filteredEnvironments !== 'all' && this.filteredEnvironments) {
            const filterSet = Array.isArray(this.filteredEnvironments) 
                ? new Set(this.filteredEnvironments) 
                : new Set([this.filteredEnvironments]);
            
            monthTaskRanges = monthTaskRanges.filter(taskRange => {
                return filterSet.has(taskRange.environment);
            });
        }

        // 為每個日期格子添加任務
        allDayElements.forEach((dayElement) => {
            const date = dayElement.date;
            const dateKey = this.dataProcessor.getDateKey(date);
            const tasksContainer = dayElement.element.querySelector('.tasks-container');
            
            if (!tasksContainer) return;

            // 找出該日期範圍內的任務
            let tasksForThisDate = monthTaskRanges.filter(taskRange => {
                if (!taskRange.dateRange || taskRange.dateRange.length === 0) return false;
                return taskRange.dateRange.some(d => {
                    const dKey = this.dataProcessor.getDateKey(d);
                    return dKey === dateKey;
                });
            });

            // 按「環境+梯次」分組，合併同一組的所有工作項目
            const tasksByEnvBatch = new Map();
            tasksForThisDate.forEach(taskRange => {
                const groupKey = `${taskRange.environment}_${taskRange.batch || 'default'}`;
                if (!tasksByEnvBatch.has(groupKey)) {
                    tasksByEnvBatch.set(groupKey, {
                        environment: taskRange.environment,
                        batch: taskRange.batch,
                        environmentData: taskRange.environmentData,
                        batchColor: taskRange.batchColor,
                        allTasks: [] // 合併所有工作項目
                    });
                }
                // 合併該 taskRange 的所有工作項目
                if (taskRange.tasks && taskRange.tasks.length > 0) {
                    tasksByEnvBatch.get(groupKey).allTasks.push(...taskRange.tasks);
                }
            });

            // 應用任務數量限制（如果啟用）
            const enableTaskLimits = this.config.calendar?.enableTaskLimits !== false;
            let groupedTasks = Array.from(tasksByEnvBatch.values());
            
            if (enableTaskLimits) {
                // 應用 maxTasksInBlock 限制（每個環境+梯次區塊最多顯示的工作項目數）
                const maxTasksInBlock = this.config.calendar?.maxTasksInBlock;
                if (maxTasksInBlock && maxTasksInBlock > 0) {
                    groupedTasks = groupedTasks.map(group => {
                        const limitedTasks = group.allTasks.slice(0, maxTasksInBlock);
                        return {
                            ...group,
                            allTasks: limitedTasks
                        };
                    });
                }

                // 應用 maxDisplayTasks 限制（總區塊數）
                const maxDisplayTasks = this.config.calendar?.maxDisplayTasks;
                if (maxDisplayTasks && maxDisplayTasks > 0) {
                    groupedTasks = groupedTasks.slice(0, maxDisplayTasks);
                }
            }

            // 為每個環境+梯次組創建顯示元素
            groupedTasks.forEach(group => {
                const taskItem = document.createElement('div');
                taskItem.className = 'day-task-item';
                taskItem.style.backgroundColor = this.addAlpha(group.environmentData.color, 0.15);
                taskItem.style.borderLeft = `3px solid ${group.environmentData.color}`;
                taskItem.style.padding = '4px 6px';
                taskItem.style.marginBottom = '4px';
                taskItem.style.borderRadius = '3px';
                taskItem.style.fontSize = '0.75em';
                taskItem.style.cursor = 'pointer';
                
                // 顯示環境名稱
                const envName = document.createElement('span');
                envName.textContent = group.environment;
                envName.style.fontWeight = '600';
                envName.style.color = group.environmentData.color;
                envName.style.marginRight = '6px';
                taskItem.appendChild(envName);
                
                // 顯示其他資訊（如果配置了）
                const taskBarFields = this.config.taskDisplay?.taskBarFields || {};
                if (taskBarFields.batch && group.batch) {
                    const batch = document.createElement('span');
                    batch.textContent = group.batch;
                    batch.style.marginRight = '4px';
                    batch.style.fontSize = '0.85em';
                    taskItem.appendChild(batch);
                }
                
                // 顯示工作項目（工作內容）- 顯示該環境+梯次下的所有工作項目，使用現代化的標籤樣式
                if (group.allTasks && group.allTasks.length > 0) {
                    const taskContents = group.allTasks
                        .map(task => task.content || task.task || '')
                        .filter(content => content && content.trim() !== '')
                        .filter((value, index, self) => self.indexOf(value) === index); // 去重
                    
                    if (taskContents.length > 0) {
                        // 創建工作項目容器（允許換行）
                        const taskContainer = document.createElement('div');
                        taskContainer.className = 'task-items-container';
                        taskContainer.style.display = 'flex';
                        taskContainer.style.flexWrap = 'wrap';
                        taskContainer.style.gap = '4px';
                        taskContainer.style.marginTop = '4px';
                        taskContainer.style.alignItems = 'center';
                        
                        // 為每個工作項目創建小標籤
                        taskContents.forEach((content) => {
                            const taskChip = document.createElement('span');
                            taskChip.className = 'task-item-chip';
                            taskChip.textContent = content;
                            taskChip.style.backgroundColor = '#8b5cf6';
                            taskChip.style.color = '#ffffff';
                            taskChip.style.padding = '3px 8px';
                            taskChip.style.borderRadius = '12px';
                            taskChip.style.fontSize = '0.7em';
                            taskChip.style.fontWeight = '500';
                            taskChip.style.whiteSpace = 'nowrap';
                            taskChip.style.maxWidth = '100%';
                            taskChip.style.overflow = 'hidden';
                            taskChip.style.textOverflow = 'ellipsis';
                            taskChip.style.display = 'inline-block';
                            taskChip.title = content; // 懸停顯示完整內容
                            taskContainer.appendChild(taskChip);
                        });
                        
                        taskItem.appendChild(taskContainer);
                    }
                }
                
                // 點擊事件 - 使用合併後的任務資料
                taskItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // 建立一個臨時的 taskRange 物件用於顯示詳情
                    const tempTaskRange = {
                        environment: group.environment,
                        batch: group.batch,
                        environmentData: group.environmentData,
                        batchColor: group.batchColor,
                        tasks: group.allTasks
                    };
                    const tasks = group.allTasks.map(task => ({
                        environment: group.environment,
                        environmentData: group.environmentData,
                        task: task,
                        batch: group.batch,
                        batchColor: group.batchColor,
                        status: task.status || '未指定',
                        statusColor: this.dataProcessor.getColorForStatus(task.status || '未指定')
                    }));
                    this.showRangeDetails(tempTaskRange, tasks);
                });
                
                tasksContainer.appendChild(taskItem);
            });
        });
    }

    /**
     * 生成任務詳情 HTML（共用方法）
     * @param {Object} task - 任務物件
     * @returns {string} 任務詳情 HTML
     */
    generateTaskDetailHTML(task) {
        let detailInfo = '';
        
        // 顯示所有欄位（包括空值）
        if (task.customFields && Object.keys(task.customFields).length > 0) {
            // 按欄位名稱排序，確保顯示順序一致
            const sortedFields = Object.entries(task.customFields).sort((a, b) => {
                return a[0].localeCompare(b[0], 'zh-TW');
            });
            
            sortedFields.forEach(([fieldName, fieldValue]) => {
                // 顯示所有欄位，即使值為空
                let displayValue = '';
                if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
                    displayValue = '<span style="color: #999; font-style: italic;">（無資料）</span>';
                } else if (fieldValue instanceof Date) {
                    displayValue = this.formatDate(fieldValue);
                } else {
                    displayValue = String(fieldValue);
                }
                detailInfo += `<br><small><strong>${fieldName}：</strong>${displayValue}</small>`;
            });
        } else {
                            // 如果沒有 customFields，顯示已知欄位（包括空值）
                            const knownFields = [
                                { key: 'dataBaseDate', label: '資料基準日' },
                                { key: 'kingdomFreezeDate', label: '京城封版日' },
                                { key: 'kingdomTransferDate', label: '京城傳送中介檔日' },
                                { key: 'businessDate', label: '營業日' },
                                { key: 'remark', label: '備注說明' }
                            ];
            
            knownFields.forEach(field => {
                const value = task[field.key];
                let displayValue = '';
                if (!value || value === '') {
                    displayValue = '<span style="color: #999; font-style: italic;">（無資料）</span>';
                } else if (value instanceof Date) {
                    displayValue = this.formatDate(value);
                } else {
                    displayValue = String(value);
                }
                detailInfo += `<br><small><strong>${field.label}：</strong>${displayValue}</small>`;
            });
        }
        
        return `
            <li>
                <strong>${task.content}</strong><br>
                ${task.startDate ? `<small>開始日期：${this.formatDate(task.startDate)}</small>` : '<small>開始日期：<span style="color: #999; font-style: italic;">（無資料）</span></small>'}
                ${task.endDate ? `<br><small>結束日期：${this.formatDate(task.endDate)}</small>` : '<br><small>結束日期：<span style="color: #999; font-style: italic;">（無資料）</span></small>'}
                ${detailInfo}
            </li>
        `;
    }
}

