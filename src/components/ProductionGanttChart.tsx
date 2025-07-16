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
  List
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

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return state.tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [state.tasks, searchTerm, filterStatus, filterPriority]);

  const handleAddTask = () => {
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
      dispatch({ type: 'ADD_TASK', payload: newTask });
    }
    setIsModalOpen(false);
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
            <Button onClick={handleAddTask} className="bg-primary hover:bg-primary/90">
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full">
          {/* Column Headers */}
          <div className="border-b border-border flex bg-muted/50">
            <div className="w-80 border-r border-border bg-card">
              <div className="h-12 flex items-center px-4 font-medium text-sm">
                <div className="w-10 mr-4">ID</div>
                <div className="flex-1">Task Name</div>
                <div className="w-16 text-center">Actions</div>
              </div>
            </div>
            <div className="flex-1 bg-background">
              {renderDateHeaders()}
            </div>
          </div>
          
          {/* Tasks List */}
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
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
                  <DraggableTaskRow
                    key={task.id}
                    task={task}
                    level={0}
                    timelineStart={timelineStart}
                    timelineEnd={timelineEnd}
                    dayWidth={dayWidth}
                    onEditTask={handleEditTask}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
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