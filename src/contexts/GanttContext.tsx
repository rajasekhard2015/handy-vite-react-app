import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';

export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  color: string;
  isExpanded?: boolean;
  children?: Task[];
  parentId?: string;
  order: number;
  dependencies?: string[];
  resources?: string[];
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
}

export interface GanttState {
  tasks: Task[];
  selectedTaskId: string | null;
  viewMode: 'day' | 'week' | 'month';
  isMaximized: boolean;
  zoomLevel: number;
  draggedTask: Task | null;
  isResizing: boolean;
  resizeHandle: 'start' | 'end' | null;
}

type GanttAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'ADD_TASK_AT_POSITION'; payload: { task: Task; position: 'above' | 'below' | 'subtask'; targetTaskId: string } }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'SELECT_TASK'; payload: string | null }
  | { type: 'TOGGLE_TASK_EXPANSION'; payload: string }
  | { type: 'SET_VIEW_MODE'; payload: 'day' | 'week' | 'month' }
  | { type: 'TOGGLE_MAXIMIZE' }
  | { type: 'SET_ZOOM_LEVEL'; payload: number }
  | { type: 'START_DRAG'; payload: Task }
  | { type: 'END_DRAG' }
  | { type: 'REORDER_TASKS'; payload: { sourceIndex: number; destinationIndex: number } }
  | { type: 'MOVE_TASK_TO_PARENT'; payload: { taskId: string; newParentId: string | null; newIndex: number } }
  | { type: 'START_RESIZE'; payload: { taskId: string; handle: 'start' | 'end' } }
  | { type: 'END_RESIZE' }
  | { type: 'RESIZE_TASK'; payload: { taskId: string; newStartDate?: Date; newEndDate?: Date } };

const initialState: GanttState = {
  tasks: [
    {
      id: '1',
      name: 'Project Planning',
      startDate: new Date(2025, 6, 13),
      endDate: new Date(2025, 7, 10),
      progress: 25,
      color: '#6366f1',
      isExpanded: true,
      order: 0,
      priority: 'high',
      status: 'in-progress',
      children: [
        {
          id: '2',
          name: 'Requirements Analysis',
          startDate: new Date(2025, 6, 15),
          endDate: new Date(2025, 6, 22),
          progress: 100,
          color: '#22c55e',
          parentId: '1',
          order: 0,
          priority: 'high',
          status: 'completed'
        },
        {
          id: '3',
          name: 'System Design',
          startDate: new Date(2025, 6, 23),
          endDate: new Date(2025, 6, 30),
          progress: 75,
          color: '#3b82f6',
          parentId: '1',
          order: 1,
          priority: 'high',
          status: 'in-progress'
        },
        {
          id: '4',
          name: 'UI/UX Design',
          startDate: new Date(2025, 7, 1),
          endDate: new Date(2025, 7, 8),
          progress: 50,
          color: '#a855f7',
          parentId: '1',
          order: 2,
          priority: 'medium',
          status: 'in-progress'
        }
      ]
    },
    {
      id: '5',
      name: 'Project Milestone',
      startDate: new Date(2025, 7, 9),
      endDate: new Date(2025, 7, 9),
      progress: 0,
      color: '#000000',
      order: 1,
      priority: 'high',
      status: 'not-started'
    },
    {
      id: '6',
      name: 'Development Phase',
      startDate: new Date(2025, 6, 14),
      endDate: new Date(2025, 7, 20),
      progress: 30,
      color: '#ef4444',
      isExpanded: false,
      order: 2,
      priority: 'high',
      status: 'in-progress',
      children: [
        {
          id: '7',
          name: 'Backend Development',
          startDate: new Date(2025, 6, 17),
          endDate: new Date(2025, 7, 15),
          progress: 45,
          color: '#f59e0b',
          parentId: '6',
          order: 0,
          priority: 'high',
          status: 'in-progress'
        },
        {
          id: '8',
          name: 'Frontend Development',
          startDate: new Date(2025, 6, 20),
          endDate: new Date(2025, 7, 18),
          progress: 20,
          color: '#06b6d4',
          parentId: '6',
          order: 1,
          priority: 'high',
          status: 'in-progress'
        }
      ]
    }
  ],
  selectedTaskId: null,
  viewMode: 'day',
  isMaximized: false,
  zoomLevel: 1,
  draggedTask: null,
  isResizing: false,
  resizeHandle: null
};

function ganttReducer(state: GanttState, action: GanttAction): GanttState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    
    case 'ADD_TASK_AT_POSITION':
      return {
        ...state,
        tasks: addTaskAtPosition(state.tasks, action.payload.task, action.payload.position, action.payload.targetTaskId)
      };
    
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: updateTaskRecursively(state.tasks, action.payload.id, action.payload.updates)
      };
    
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: deleteTaskRecursively(state.tasks, action.payload)
      };
    
    case 'SELECT_TASK':
      return { ...state, selectedTaskId: action.payload };
    
    case 'TOGGLE_TASK_EXPANSION':
      return {
        ...state,
        tasks: updateTaskRecursively(state.tasks, action.payload, { 
          isExpanded: !findTaskById(state.tasks, action.payload)?.isExpanded 
        })
      };
    
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    
    case 'TOGGLE_MAXIMIZE':
      return { ...state, isMaximized: !state.isMaximized };
    
    case 'SET_ZOOM_LEVEL':
      return { ...state, zoomLevel: Math.max(0.5, Math.min(3, action.payload)) };
    
    case 'START_DRAG':
      return { ...state, draggedTask: action.payload };
    
    case 'END_DRAG':
      return { ...state, draggedTask: null };
    
    case 'REORDER_TASKS':
      const reorderedTasks = [...state.tasks];
      const [removed] = reorderedTasks.splice(action.payload.sourceIndex, 1);
      reorderedTasks.splice(action.payload.destinationIndex, 0, removed);
      return { ...state, tasks: reorderedTasks };
    
    case 'START_RESIZE':
      return { 
        ...state, 
        isResizing: true, 
        resizeHandle: action.payload.handle,
        selectedTaskId: action.payload.taskId
      };
    
    case 'END_RESIZE':
      return { ...state, isResizing: false, resizeHandle: null };
    
    case 'RESIZE_TASK':
      return {
        ...state,
        tasks: updateTaskRecursively(state.tasks, action.payload.taskId, {
          startDate: action.payload.newStartDate,
          endDate: action.payload.newEndDate
        })
      };
    
    default:
      return state;
  }
}

// Helper functions
function updateTaskRecursively(tasks: Task[], taskId: string, updates: Partial<Task>): Task[] {
  return tasks.map(task => {
    if (task.id === taskId) {
      return { ...task, ...updates };
    }
    if (task.children) {
      return { ...task, children: updateTaskRecursively(task.children, taskId, updates) };
    }
    return task;
  });
}

function findTaskById(tasks: Task[], taskId: string): Task | undefined {
  for (const task of tasks) {
    if (task.id === taskId) return task;
    if (task.children) {
      const found = findTaskById(task.children, taskId);
      if (found) return found;
    }
  }
  return undefined;
}

function addTaskAtPosition(tasks: Task[], newTask: Task, position: 'above' | 'below' | 'subtask', targetTaskId: string): Task[] {
  const newTasks = [...tasks];
  
  function insertTask(taskList: Task[], level: number = 0): Task[] {
    for (let i = 0; i < taskList.length; i++) {
      if (taskList[i].id === targetTaskId) {
        const targetTask = taskList[i];
        
        if (position === 'subtask') {
          // Add as a child
          const updatedTask = {
            ...targetTask,
            children: [...(targetTask.children || []), { ...newTask, parentId: targetTaskId }],
            isExpanded: true
          };
          taskList[i] = updatedTask;
          return taskList;
        } else if (position === 'above') {
          // Insert above the target task
          taskList.splice(i, 0, newTask);
          return taskList;
        } else if (position === 'below') {
          // Insert below the target task
          taskList.splice(i + 1, 0, newTask);
          return taskList;
        }
      }
      
      // Check children
      if (taskList[i].children) {
        const updatedChildren = insertTask(taskList[i].children!, level + 1);
        taskList[i] = { ...taskList[i], children: updatedChildren };
      }
    }
    return taskList;
  }
  
  return insertTask(newTasks);
}

function deleteTaskRecursively(tasks: Task[], taskId: string): Task[] {
  return tasks.filter(task => {
    if (task.id === taskId) return false;
    if (task.children) {
      task.children = deleteTaskRecursively(task.children, taskId);
    }
    return true;
  });
}

// Context
const GanttContext = createContext<{
  state: GanttState;
  dispatch: React.Dispatch<GanttAction>;
} | null>(null);

export const GanttProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(ganttReducer, initialState);

  return (
    <GanttContext.Provider value={{ state, dispatch }}>
      {children}
    </GanttContext.Provider>
  );
};

export const useGantt = () => {
  const context = useContext(GanttContext);
  if (!context) {
    throw new Error('useGantt must be used within a GanttProvider');
  }
  return context;
};

// Utility functions
export const calculateTaskDuration = (startDate: Date, endDate: Date): number => {
  return differenceInDays(endDate, startDate) + 1;
};

export const getTaskPosition = (task: Task, timelineStart: Date, dayWidth: number) => {
  const startOffset = Math.max(0, differenceInDays(task.startDate, timelineStart));
  const duration = calculateTaskDuration(task.startDate, task.endDate);
  
  return {
    left: startOffset * dayWidth,
    width: Math.max(dayWidth * 0.5, duration * dayWidth - 4)
  };
};

export const formatTaskDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const getTaskStatusColor = (status: Task['status']): string => {
  switch (status) {
    case 'completed': return '#22c55e';
    case 'in-progress': return '#3b82f6';
    case 'on-hold': return '#f59e0b';
    case 'not-started': return '#6b7280';
    default: return '#6b7280';
  }
};

export const getPriorityColor = (priority: Task['priority']): string => {
  switch (priority) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
};