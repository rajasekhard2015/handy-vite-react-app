import React, { useState, useMemo } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  RotateCcw,
  Download,
  Upload,
  FileText,
  Calendar,
  Filter,
  Settings,
  Grid,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  GripVertical,
  MoreVertical,
  Info,
  Copy,
  Milestone
} from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

import { useGantt, Task } from '@/contexts/GanttContext';
import DraggableTaskRow from './DraggableTaskRow';
import TaskModal from './TaskModal';

const ProductionGanttChart = () => {
  const { state, dispatch } = useGantt();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isTableVisible, setIsTableVisible] = useState(true);
  
  // Column widths state
  const [columnWidths, setColumnWidths] = useState({
    taskName: 264,
    startDate: 112,
    endDate: 112,
    duration: 80,
    resources: 128,
    dependency: 128,
    actions: 64
  });
  
  // Table-chart divider state
  const [tableWidth, setTableWidth] = useState(750);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Task | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Context menu state
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    taskName: true,
    startDate: true,
    endDate: true,
    duration: true,
    progress: false,
    dependency: true,
    resources: true,
    color: false
  });

  // Column filters state
  const [columnFilters, setColumnFilters] = useState<Record<string, {
    type: 'equal' | 'greater' | 'greaterEqual' | 'less' | 'lessEqual' | 'notEqual';
    value: string;
  }>>({});

  // Task action state
  const [taskActionType, setTaskActionType] = useState<'add-above' | 'add-below' | 'add-subtask' | null>(null);
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate timeline dates based on view mode
  const { timelineStart, timelineEnd, timelineDates, dayWidth } = useMemo(() => {
    const today = new Date();
    let start: Date, end: Date, width: number;
    
    switch (state.viewMode) {
      case 'week':
        start = startOfWeek(today);
        end = addDays(start, 84); // 12 weeks
        width = 24;
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(addDays(start, 365)); // 12 months
        width = 8;
        break;
      default: // day
        start = new Date(2025, 6, 13);
        end = new Date(2025, 7, 31);
        width = 48;
    }
    
    const dates = eachDayOfInterval({ start, end });
    return { 
      timelineStart: start, 
      timelineEnd: end, 
      timelineDates: dates, 
      dayWidth: width 
    };
  }, [state.viewMode]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = state.tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [state.tasks, searchTerm, filterStatus, filterPriority, sortConfig]);

  const handleAddNewTask = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (selectedTask) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { id: selectedTask.id, updates: taskData }
      });
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        name: taskData.name || 'New Task',
        startDate: taskData.startDate || new Date(),
        endDate: taskData.endDate || addDays(new Date(), 1),
        progress: taskData.progress || 0,
        color: taskData.color || '#3b82f6',
        order: state.tasks.length,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'not-started',
        notes: taskData.notes,
        ...taskData
      };
      
      if (taskActionType && targetTaskId) {
        const position = taskActionType.replace('add-', '') as 'above' | 'below' | 'subtask';
        dispatch({ 
          type: 'ADD_TASK_AT_POSITION', 
          payload: { task: newTask, position, targetTaskId } 
        });
      } else {
        dispatch({ type: 'ADD_TASK', payload: newTask });
      }
    }
    setIsModalOpen(false);
    setTaskActionType(null);
    setTargetTaskId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = filteredTasks.findIndex(task => task.id === active.id);
      const newIndex = filteredTasks.findIndex(task => task.id === over.id);
      
      dispatch({
        type: 'REORDER_TASKS',
        payload: { sourceIndex: oldIndex, destinationIndex: newIndex }
      });
    }
  };

  const toggleMaximize = () => {
    dispatch({ type: 'TOGGLE_MAXIMIZE' });
  };

  const handleZoomIn = () => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: state.zoomLevel + 0.2 });
  };

  const handleZoomOut = () => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: state.zoomLevel - 0.2 });
  };

  const handleZoomReset = () => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: 1 });
  };

  const handleViewModeChange = (mode: 'day' | 'week' | 'month') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  const toggleTableVisibility = () => {
    setIsTableVisible(!isTableVisible);
  };

  // Column sorting
  const handleSort = (key: keyof Task) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Column resize handlers
  const handleColumnResize = (columnKey: string, newWidth: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: Math.max(60, newWidth) // Minimum width of 60px
    }));
  };

  // Table-chart divider handlers
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    setIsDraggingDivider(true);
    const startX = e.clientX;
    const startWidth = tableWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(300, Math.min(1200, startWidth + deltaX));
      setTableWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingDivider(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    setContextMenuTask(task);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleTaskInformation = () => {
    if (contextMenuTask) {
      handleEditTask(contextMenuTask);
    }
    setContextMenuTask(null);
  };

  const handleDeleteTask = () => {
    if (contextMenuTask) {
      dispatch({ type: 'DELETE_TASK', payload: contextMenuTask.id });
    }
    setContextMenuTask(null);
  };

  const handleAddTask = (type: 'add-above' | 'add-below' | 'add-subtask') => {
    if (contextMenuTask) {
      setTaskActionType(type);
      setTargetTaskId(contextMenuTask.id);
      setSelectedTask(null);
      setIsModalOpen(true);
    }
    setContextMenuTask(null);
  };

  const handleDuplicateTask = () => {
    if (contextMenuTask) {
      const duplicatedTask: Task = {
        ...contextMenuTask,
        id: `task-${Date.now()}`,
        name: `${contextMenuTask.name} (Copy)`,
        order: state.tasks.length
      };
      dispatch({ type: 'ADD_TASK', payload: duplicatedTask });
    }
    setContextMenuTask(null);
  };

  // Column visibility handlers
  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey as keyof typeof prev]
    }));
  };

  // Column filter handlers
  const handleColumnFilter = (columnKey: string, filterType: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: { type: filterType as any, value }
    }));
  };

  // Auto-fit column handlers
  const handleAutoFitColumn = (columnKey: string) => {
    // Calculate the maximum content width for the column
    let maxWidth = 60; // minimum width
    
    filteredTasks.forEach(task => {
      const content = getColumnContent(task, columnKey);
      const estimatedWidth = content.length * 8 + 24; // rough estimation
      maxWidth = Math.max(maxWidth, estimatedWidth);
    });
    
    handleColumnResize(columnKey, Math.min(maxWidth, 300)); // cap at 300px
  };

  const handleAutoFitAllColumns = () => {
    Object.keys(columnWidths).forEach(columnKey => {
      handleAutoFitColumn(columnKey);
    });
  };

  const getColumnContent = (task: Task, columnKey: string): string => {
    switch (columnKey) {
      case 'taskName': return task.name;
      case 'startDate': return format(task.startDate, 'MMM dd, yyyy');
      case 'endDate': return format(task.endDate, 'MMM dd, yyyy');
      case 'duration': return `${Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`;
      case 'resources': return task.resources?.join(', ') || 'Unassigned';
      case 'dependency': return task.dependencies?.join(', ') || 'None';
      default: return '';
    }
  };

  // Render sort icon
  const renderSortIcon = (columnKey: keyof Task) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-3 h-3 ml-1 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-3 h-3 ml-1 text-primary" /> : 
      <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
  };

  // Render column header with dropdown
  const renderColumnHeader = (title: string, columnKey: string, sortKey?: keyof Task) => (
    <div 
      className="border-r border-border h-12 flex items-center px-3 text-xs font-medium shrink-0 relative group"
      style={{ width: columnWidths[columnKey as keyof typeof columnWidths] }}
    >
      <div className="flex items-center justify-between w-full">
        <div 
          className="flex items-center cursor-pointer hover:text-primary"
          onClick={() => sortKey && handleSort(sortKey)}
        >
          <span>{title}</span>
          {sortKey && renderSortIcon(sortKey)}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleAutoFitColumn(columnKey)}>
              Autofit this column
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAutoFitAllColumns}>
              Autofit all columns
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {sortKey && (
              <>
                <DropdownMenuItem onClick={() => handleSort(sortKey)}>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Sort Ascending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { handleSort(sortKey); setSortConfig(prev => ({ ...prev, direction: 'desc' })); }}>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Sort Descending
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Settings className="w-4 h-4 mr-2" />
                Columns
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {Object.entries(visibleColumns).map(([key, visible]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={visible}
                    onCheckedChange={() => toggleColumnVisibility(key)}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuItem>Equal</DropdownMenuItem>
                <DropdownMenuItem>Greater Than</DropdownMenuItem>
                <DropdownMenuItem>Greater Than Or Equal</DropdownMenuItem>
                <DropdownMenuItem>Less Than</DropdownMenuItem>
                <DropdownMenuItem>Less Than Or Equal</DropdownMenuItem>
                <DropdownMenuItem>Not Equal</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Column resize handle */}
      <div 
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-primary/20 group-hover:bg-primary/10"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = columnWidths[columnKey as keyof typeof columnWidths];
          const handleMouseMove = (e: MouseEvent) => {
            const newWidth = startWidth + (e.clientX - startX);
            handleColumnResize(columnKey, newWidth);
          };
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      />
    </div>
  );

  const renderDateHeaders = () => {
    const headerHeight = state.viewMode === 'day' ? 'h-16' : 'h-12';
    
    return (
      <div className={`border-b border-border bg-muted/30 ${headerHeight}`}>
        {state.viewMode === 'day' && (
          <>
            {/* Week headers */}
            <div className="flex border-b border-border h-8">
              <div className="w-48 text-center py-1 text-xs font-medium border-r border-border">
                {format(timelineStart, 'MMM yyyy')}
              </div>
              {Array.from({ length: Math.ceil(timelineDates.length / 7) }, (_, i) => (
                <div key={i} className="w-48 text-center py-1 text-xs font-medium border-r border-border">
                  Week {i + 1}
                </div>
              ))}
            </div>
            
            {/* Day headers */}
            <div className="flex h-8">
              {timelineDates.map((date, index) => (
                <div 
                  key={index} 
                  className={`text-center py-1 text-xs border-r border-border last:border-r-0 ${
                    date.getDay() === 0 || date.getDay() === 6 ? 'bg-muted/50' : ''
                  }`}
                  style={{ width: dayWidth * state.zoomLevel }}
                >
                  <div className="font-medium">{format(date, 'dd')}</div>
                  <div className="text-muted-foreground">{format(date, 'EEE')}</div>
                </div>
              ))}
            </div>
          </>
        )}
        
        {state.viewMode === 'week' && (
          <div className="flex h-12">
            {Array.from({ length: Math.ceil(timelineDates.length / 7) }, (_, i) => (
              <div key={i} className="w-48 text-center py-2 text-xs font-medium border-r border-border">
                <div>Week {i + 1}</div>
                <div className="text-muted-foreground">
                  {format(addDays(timelineStart, i * 7), 'MMM dd')}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {state.viewMode === 'month' && (
          <div className="flex h-12">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="w-24 text-center py-2 text-xs font-medium border-r border-border">
                {format(addDays(timelineStart, i * 30), 'MMM yyyy')}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full bg-background flex flex-col transition-all duration-300 ${
      state.isMaximized ? 'fixed inset-0 z-50' : 'h-screen'
    }`}>
      {/* Main Toolbar */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={handleAddNewTask} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Open Project
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            
            <Separator orientation="vertical" className="h-6 mx-2" />
            
            <Button
              variant={state.isMaximized ? "default" : "outline"}
              onClick={toggleMaximize}
            >
              {state.isMaximized ? (
                <Minimize className="w-4 h-4 mr-2" />
              ) : (
                <Maximize className="w-4 h-4 mr-2" />
              )}
              {state.isMaximized ? 'Minimize' : 'Maximize'}
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Mode Selector */}
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant={state.viewMode === 'day' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange('day')}
                className="rounded-r-none"
              >
                Day
              </Button>
              <Button
                variant={state.viewMode === 'week' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange('week')}
                className="rounded-none"
              >
                Week
              </Button>
              <Button
                variant={state.viewMode === 'month' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange('month')}
                className="rounded-l-none"
              >
                Month
              </Button>
            </div>

            {/* Filters */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-b border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-1" />
              Edit Selected
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleTableVisibility}
              className="bg-background"
            >
              {isTableVisible ? (
                <PanelLeftClose className="w-4 h-4 mr-1" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 mr-1" />
              )}
              {isTableVisible ? 'Hide Table' : 'Show Table'}
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4 mr-1" />
              Zoom In
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4 mr-1" />
              Zoom Out
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset Zoom
            </Button>
            
            <Badge variant="outline" className="ml-2">
              Zoom: {Math.round(state.zoomLevel * 100)}%
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Table Panel */}
          <ResizablePanel 
            defaultSize={35} 
            minSize={20} 
            maxSize={60}
            className={`${!isTableVisible ? 'hidden' : ''}`}
          >
            <div className="h-full flex flex-col">
              {/* Table Column Headers */}
              <div className="border-b border-border bg-muted/50">
                <div className="flex bg-card">
                  <div className="w-6 border-r border-border h-12 flex items-center justify-center text-xs font-medium shrink-0">
                    #
                  </div>
                  
                  {/* Use new column header components */}
                  {renderColumnHeader("Task Name", "taskName", "name")}
                  {renderColumnHeader("Start Date", "startDate", "startDate")}
                  {renderColumnHeader("End Date", "endDate", "endDate")}
                  {renderColumnHeader("Duration", "duration")}
                  {renderColumnHeader("Resources", "resources")}
                  {renderColumnHeader("Dependency", "dependency")}
                  
                  {/* Actions Column */}
                  <div 
                    className="h-12 flex items-center justify-center text-xs font-medium shrink-0"
                    style={{ width: columnWidths.actions }}
                  >
                    Actions
                  </div>
                </div>
              </div>
              
              {/* Table Tasks List */}
              <div className="flex-1 overflow-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredTasks.map(task => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredTasks.map(task => (
                      <ContextMenu key={task.id}>
                        <ContextMenuTrigger asChild>
                          <div className="flex border-b border-border hover:bg-muted/20 cursor-pointer" onContextMenu={(e) => handleContextMenu(e, task)}>
                            <div className="w-6 border-r border-border py-2 flex items-center justify-center text-xs shrink-0">
                              {filteredTasks.indexOf(task) + 1}
                            </div>
                            <div 
                              className="border-r border-border py-2 px-3 text-sm shrink-0"
                              style={{ width: columnWidths.taskName }}
                            >
                              {task.name}
                            </div>
                            <div 
                              className="border-r border-border py-2 px-3 text-sm shrink-0"
                              style={{ width: columnWidths.startDate }}
                            >
                              {format(task.startDate, 'MMM dd, yyyy')}
                            </div>
                            <div 
                              className="border-r border-border py-2 px-3 text-sm shrink-0"
                              style={{ width: columnWidths.endDate }}
                            >
                              {format(task.endDate, 'MMM dd, yyyy')}
                            </div>
                            <div 
                              className="border-r border-border py-2 px-3 text-sm shrink-0"
                              style={{ width: columnWidths.duration }}
                            >
                              {Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                            </div>
                            <div 
                              className="border-r border-border py-2 px-3 text-sm shrink-0"
                              style={{ width: columnWidths.resources }}
                            >
                              {task.resources?.join(', ') || 'Unassigned'}
                            </div>
                            <div 
                              className="border-r border-border py-2 px-3 text-sm shrink-0"
                              style={{ width: columnWidths.dependency }}
                            >
                              {task.dependencies?.join(', ') || 'None'}
                            </div>
                            <div 
                              className="py-2 px-2 text-sm shrink-0 flex items-center gap-1"
                              style={{ width: columnWidths.actions }}
                            >
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditTask(task)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                          <ContextMenuItem onClick={handleTaskInformation}>
                            <Info className="w-4 h-4 mr-2" />
                            Task Information
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => handleAddTask('add-above')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task Above
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleAddTask('add-below')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task Below
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleAddTask('add-subtask')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Subtask
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={handleDuplicateTask}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate Task
                          </ContextMenuItem>
                          <ContextMenuItem>
                            <Milestone className="w-4 h-4 mr-2" />
                            Convert to Milestone
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={handleDeleteTask} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Task
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </ResizablePanel>
          
          {/* Resizable Handle */}
          {isTableVisible && (
            <ResizableHandle withHandle />
          )}
          
          {/* Chart Panel */}
          <ResizablePanel 
            defaultSize={isTableVisible ? 65 : 100} 
            minSize={40}
          >
            <div className="h-full flex flex-col">
              {/* Chart Headers */}
              <div className="border-b border-border bg-muted/50">
                {renderDateHeaders()}
              </div>
              
              {/* Chart Timeline */}
              <div className="flex-1 overflow-auto">
                {filteredTasks.map(task => (
                  <DraggableTaskRow
                    key={task.id}
                    task={task}
                    level={0}
                    timelineStart={timelineStart}
                    timelineEnd={timelineEnd}
                    dayWidth={dayWidth}
                    onEditTask={handleEditTask}
                    isTableVisible={false} // Only show chart part
                    columnWidths={columnWidths}
                    tableWidth={0}
                  />
                ))}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <div className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Total Tasks: {filteredTasks.length}</span>
            <span>Selected: {state.selectedTaskId ? '1' : '0'}</span>
            <span>View: {state.viewMode}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Drag tasks to reorder • Drag timeline bars to move • Drag edges to resize</span>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={selectedTask}
      />
    </div>
  );
};

export default ProductionGanttChart;