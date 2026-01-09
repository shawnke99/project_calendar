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
    }

    /**
     * 渲染月曆
     */
    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // 更新月份顯示
        this.updateMonthDisplay(year, month);

        // 取得當月任務
        const tasksForMonth = this.dataProcessor.getTasksForMonth(year, month);
        const taskRanges = this.dataProcessor.getTaskRanges();

        // 清空月曆
        this.container.innerHTML = '';

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
            dayElements.push({ date: new Date(cellDate), element: dayElement });
        }

        // 渲染跨日期的任務條
        this.renderSpanningTasks(dayElements, taskRanges, year, month);
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
        const calendarGrid = startElement.closest('.calendar-grid');
        if (!calendarGrid) return;
        
        // 建立任務條容器
        const taskBar = document.createElement('div');
        taskBar.className = 'spanning-task-bar';
        taskBar.style.backgroundColor = this.addAlpha(taskRange.environmentData.color, 0.15);
        taskBar.style.borderLeft = `4px solid ${taskRange.environmentData.color}`;
        
        // 使用絕對定位，相對於日曆網格定位
        taskBar.style.position = 'absolute';
        taskBar.style.zIndex = '5';
        
        // 計算跨日期任務條的寬度和位置
        const gridGap = this.config.calendar?.gridGap || 2;
        
        // 使用 setTimeout 確保 DOM 已渲染
        setTimeout(() => {
            // 獲取起始格子和結束格子的位置和尺寸
            const startCellRect = startElement.getBoundingClientRect();
            const endIndex = startIndex + spanDays - 1;
            const endElement = endIndex < dayElements.length ? dayElements[endIndex].element : null;
            const endCellRect = endElement ? endElement.getBoundingClientRect() : null;
            const gridRect = calendarGrid.getBoundingClientRect();
            
            // 計算相對於日曆網格的左邊距
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
                
                // 計算垂直位置
                const taskBarHeight = 24;
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
                        
                        calendarGrid.appendChild(secondSegment);
                    }
                }
                
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
            } else {
                // 不跨週：正常計算
                const totalWidth = (cellWidth * spanDays) + (gridGap * (spanDays - 1));
                
                // 計算垂直位置
                const taskBarHeight = 24;
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
        }, 200);
        
        // 取得任務條欄位顯示配置
        const taskBarFields = this.config.taskDisplay?.taskBarFields || {};
        
        // 動態顯示所有配置的欄位
        this.renderTaskBarFields(taskBar, taskRange, taskBarFields);
        
        // 點擊事件 - 使用 addEventListener 確保事件正確綁定
        taskBar.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            console.log('點擊任務條:', taskRange.rangeId);
            
            // 顯示該範圍的所有任務詳情
            if (!taskRange.tasks || taskRange.tasks.length === 0) {
                console.warn('任務範圍沒有任務:', taskRange);
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
        calendarGrid.appendChild(taskBar);
        
        // 在跨越的所有日期格子上添加佔位符（避免點擊穿透，並保持垂直空間）
        setTimeout(() => {
            const barHeight = 24; // 固定高度
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
                    placeholder.style.height = `${barHeight}px`;
                    placeholder.style.marginTop = '2px';
                    placeholder.style.marginBottom = '2px';
                    placeholder.style.visibility = 'hidden'; // 隱藏但佔用空間
                    otherTasksContainer.appendChild(placeholder);
                }
            }
        }, 250);
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

        // 注意：跨日期的任務會在 renderSpanningTasks 中處理
        // 這裡只顯示單日任務或作為備用顯示
        // 實際的跨日期任務條會在 render() 方法的最後階段添加

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
     */
    renderTaskBarFields(taskBar, taskRange, taskBarFields) {
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
                    // 顯示第一個任務的內容
                    if (taskRange.tasks && taskRange.tasks.length > 0) {
                        displayText = taskRange.tasks[0].content || '';
                        badgeColor = '#8b5cf6'; // 紫色
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
     */
    updateMonthDisplay(year, month) {
        const monthDisplay = document.getElementById('currentMonth');
        if (monthDisplay) {
            monthDisplay.textContent = `${year}年${month + 1}月`;
        }
        
        // 更新非工作日說明
        this.updateNonWorkingDaysInfo(year, month);
    }

    /**
     * 更新非工作日說明區塊
     * @param {number} year - 年份
     * @param {number} month - 月份
     */
    updateNonWorkingDaysInfo(year, month) {
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

        // 取得當月所有日期
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // 收集當月的非工作日（只包含自訂的非工作日，不包含週末）
        const nonWorkingDaysList = [];
        const processedDates = new Set();

        // 檢查自訂非工作日
        if (nonWorkingConfig.customDays && Array.isArray(nonWorkingConfig.customDays)) {
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
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
                            day: day
                        });
                        break; // 找到匹配就跳出，避免重複
                    }
                }
            }
        }

        // 按日期排序
        nonWorkingDaysList.sort((a, b) => a.day - b.day);

        // 如果沒有非工作日，顯示提示
        if (nonWorkingDaysList.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'non-working-days-empty';
            emptyMsg.textContent = '本月無特殊非工作日';
            emptyMsg.style.color = '#999';
            emptyMsg.style.fontStyle = 'italic';
            emptyMsg.style.padding = '10px';
            container.appendChild(emptyMsg);
            return;
        }

        // 建立非工作日列表
        const listContainer = document.createElement('div');
        listContainer.className = 'non-working-days-list';

        nonWorkingDaysList.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'non-working-day-item';

            // 日期顯示
            const dateSpan = document.createElement('span');
            dateSpan.className = 'non-working-day-date';
            dateSpan.textContent = `${month + 1}月${item.day}日`;
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

        container.appendChild(listContainer);
    }

    /**
     * 切換到上一個月
     */
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }

    /**
     * 切換到下一個月
     */
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
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
        const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
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
            console.error('找不到彈窗元素');
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
     * 格式化日期
     * @param {Date} date - 日期物件
     * @returns {string} 格式化後的日期字串
     */
    formatDate(date) {
        if (!date) return DataProcessor.UNSPECIFIED_STATUS;
        const d = new Date(date);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
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

