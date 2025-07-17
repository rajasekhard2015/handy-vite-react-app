import React, { useState, useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, MoreHorizontal, Calendar, User, Clock } from 'lucide-react';
import { useGantt, Task, getTaskPosition, calculateTaskDuration } from '@/contexts/GanttContext';
import { format, eachDayOfInterval, startOfDay, addDays } from 'date-fns';

interface DraggableTaskRowProps {
  task: Task;
  level: number;
  timelineStart: Date;
  timelineEnd: Date;
  dayWidth: number;
  onEditTask: (task: Task) => void;
}

const DraggableTaskRow: React.FC<DraggableTaskRowProps> = ({
  task,
  level,
  timelineStart,
  timelineEnd,
  dayWidth,
  onEditTask
}) => {
  const { state, dispatch } = useGantt();
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'start' | 'end' | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const startDragX = useRef<number>(0);
  const originalTask = useRef<Task | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const isParent = task.children && task.children.length > 0;
  const position = getTaskPosition(task, timelineStart, dayWidth * state.zoomLevel);
  const isSelected = state.selectedTaskId === task.id;

  const toggleExpansion = () => {
    dispatch({ type: 'TOGGLE_TASK_EXPANSION', payload: task.id });
  };

  const handleTaskSelect = () => {
    dispatch({ type: 'SELECT_TASK', payload: task.id });
  };

  // Timeline drag handlers
  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.task-bar')) {
      e.preventDefault();
      setIsDraggingTimeline(true);
      startDragX.current = e.clientX;
      originalTask.current = { ...task };
      document.addEventListener('mousemove', handleTimelineMouseMove);
      document.addEventListener('mouseup', handleTimelineMouseUp);
    }
  }, [task]);

  const handleTimelineMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingTimeline || !originalTask.current) return;

    const deltaX = e.clientX - startDragX.current;
    const daysDelta = Math.round(deltaX / (dayWidth * state.zoomLevel));
    
    if (daysDelta !== 0) {
      const newStartDate = addDays(originalTask.current.startDate, daysDelta);
      const newEndDate = addDays(originalTask.current.endDate, daysDelta);
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          id: task.id,
          updates: { startDate: newStartDate, endDate: newEndDate }
        }
      });
    }
  }, [isDraggingTimeline, dayWidth, state.zoomLevel, task.id, dispatch]);

  const handleTimelineMouseUp = useCallback(() => {
    setIsDraggingTimeline(false);
    originalTask.current = null;
    document.removeEventListener('mousemove', handleTimelineMouseMove);
    document.removeEventListener('mouseup', handleTimelineMouseUp);
  }, [handleTimelineMouseMove]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: 'start' | 'end') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    startDragX.current = e.clientX;
    originalTask.current = { ...task };
    dispatch({ type: 'START_RESIZE', payload: { taskId: task.id, handle } });
    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp);
  }, [task, dispatch]);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !originalTask.current || !resizeHandle) return;

    const deltaX = e.clientX - startDragX.current;
    const daysDelta = Math.round(deltaX / (dayWidth * state.zoomLevel));
    
    if (daysDelta !== 0) {
      let newStartDate = originalTask.current.startDate;
      let newEndDate = originalTask.current.endDate;
      
      if (resizeHandle === 'start') {
        newStartDate = addDays(originalTask.current.startDate, daysDelta);
        // Ensure start date doesn't go past end date
        if (newStartDate >= originalTask.current.endDate) {
          newStartDate = addDays(originalTask.current.endDate, -1);
        }
      } else {
        newEndDate = addDays(originalTask.current.endDate, daysDelta);
        // Ensure end date doesn't go before start date
        if (newEndDate <= originalTask.current.startDate) {
          newEndDate = addDays(originalTask.current.startDate, 1);
        }
      }
      
      dispatch({
        type: 'RESIZE_TASK',
        payload: { taskId: task.id, newStartDate, newEndDate }
      });
    }
  }, [isResizing, resizeHandle, dayWidth, state.zoomLevel, task.id, dispatch]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
    originalTask.current = null;
    dispatch({ type: 'END_RESIZE' });
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', handleResizeMouseUp);
  }, [dispatch, handleResizeMouseMove]);

  const getPriorityBadgeColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'secondary';
      case 'in-progress': return 'default';
      case 'on-hold': return 'outline';
      case 'not-started': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`border-b border-border flex group ${isSelected ? 'bg-accent/20' : ''} ${isDragging ? 'z-50' : ''}`}
      >
        {/* Task Table Columns */}
        <div className="flex border-r border-border bg-card">
          <div className="w-6 border-r border-border h-14 flex items-center justify-center">
            <div
              className="cursor-grab active:cursor-grabbing hover:bg-muted/50 rounded p-1"
              {...attributes}
              {...listeners}
            >
              <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            </div>
          </div>
          
          <div 
            className="w-64 border-r border-border px-3 py-2 flex items-center cursor-pointer hover:bg-accent/50"
            onClick={handleTaskSelect}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            {isParent && (
              <Button
                variant="ghost"
                size="sm"
                className="w-4 h-4 p-0 mr-2 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpansion();
                }}
              >
                {task.isExpanded ? 
                  <ChevronDown className="w-3 h-3" /> : 
                  <ChevronRight className="w-3 h-3" />
                }
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate mb-1" title={task.name}>
                {task.name}
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={getStatusBadgeColor(task.status)} className="text-xs h-4">
                  {task.status}
                </Badge>
                <Badge variant={getPriorityBadgeColor(task.priority)} className="text-xs h-4">
                  {task.priority}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="w-28 border-r border-border px-3 py-2 flex items-center">
            <span className="text-xs text-muted-foreground">
              {format(task.startDate, 'MMM dd, yyyy')}
            </span>
          </div>
          
          <div className="w-28 border-r border-border px-3 py-2 flex items-center">
            <span className="text-xs text-muted-foreground">
              {format(task.endDate, 'MMM dd, yyyy')}
            </span>
          </div>
          
          <div className="w-20 border-r border-border px-3 py-2 flex items-center">
            <span className="text-xs text-muted-foreground font-medium">
              {calculateTaskDuration(task.startDate, task.endDate)}d
            </span>
          </div>
          
          <div className="w-32 border-r border-border px-3 py-2 flex items-center">
            <div className="flex flex-wrap gap-1 max-w-full">
              {task.resources && task.resources.length > 0 ? (
                task.resources.slice(0, 2).map((resource, index) => (
                  <Badge key={index} variant="secondary" className="text-xs px-1 py-0" title={resource}>
                    {resource.length > 8 ? `${resource.slice(0, 8)}...` : resource}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
              {task.resources && task.resources.length > 2 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{task.resources.length - 2}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="w-32 border-r border-border px-3 py-2 flex items-center">
            <div className="flex flex-wrap gap-1 max-w-full">
              {task.dependencies && task.dependencies.length > 0 ? (
                task.dependencies.slice(0, 2).map((dep, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1 py-0" title={dep}>
                    {dep.length > 8 ? `${dep.slice(0, 8)}...` : dep}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
              {task.dependencies && task.dependencies.length > 2 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{task.dependencies.length - 2}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="w-16 px-2 py-2 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onEditTask(task);
              }}
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Timeline Column */}
        <div className="flex-1 relative h-14 bg-background" ref={timelineRef}>
          <div 
            className={`absolute top-3 h-8 rounded flex items-center justify-between px-2 shadow-sm border cursor-move transition-all duration-200 task-bar group/task ${isSelected ? 'ring-2 ring-primary' : ''}`}
            style={{
              left: position.left,
              width: position.width,
              backgroundColor: task.color,
              transform: isDraggingTimeline ? 'scale(1.02)' : 'scale(1)',
              zIndex: isDraggingTimeline ? 50 : 1
            }}
            onMouseDown={handleTimelineMouseDown}
          >
            {/* Resize handle - Start */}
            <div
              className="absolute left-0 top-0 w-2 h-full cursor-w-resize bg-white/20 opacity-0 group-hover/task:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeStart(e, 'start')}
            />
            
            {/* Task content */}
            <div className="flex items-center justify-between w-full min-w-0">
              {position.width > 80 && (
                <span className="text-xs text-white font-medium truncate mr-2">
                  {task.name}
                </span>
              )}
              
              <div className="flex items-center gap-1 shrink-0">
                {task.progress > 0 && (
                  <Badge variant="secondary" className="text-xs h-4 bg-white/20 text-white">
                    {task.progress}%
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Progress bar */}
            {task.progress > 0 && (
              <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300">
                <div 
                  className="h-full bg-white/60 transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            )}
            
            {/* Resize handle - End */}
            <div
              className="absolute right-0 top-0 w-2 h-full cursor-e-resize bg-white/20 opacity-0 group-hover/task:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeStart(e, 'end')}
            />
          </div>
        </div>
      </div>
      
      {/* Render children if expanded */}
      {isParent && task.isExpanded && task.children?.map(child => (
        <DraggableTaskRow
          key={child.id}
          task={child}
          level={level + 1}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
          dayWidth={dayWidth}
          onEditTask={onEditTask}
        />
      ))}
    </>
  );
};

export default DraggableTaskRow;