import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize,
  MoreHorizontal,
  FileText,
  Download,
  Upload
} from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import TaskModal from './TaskModal';

interface Task {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  color: string;
  isExpanded?: boolean;
  children?: Task[];
  parentId?: number;
}

const GanttChart = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      name: "Example",
      startDate: new Date(2025, 6, 13),
      endDate: new Date(2025, 7, 10),
      progress: 0,
      color: "#6b7280",
      isExpanded: true,
      children: [
        {
          id: 2,
          name: "Example Task 1",
          startDate: new Date(2025, 6, 15),
          endDate: new Date(2025, 6, 22),
          progress: 100,
          color: "#22c55e",
          parentId: 1
        },
        {
          id: 3,
          name: "Example Task 2",
          startDate: new Date(2025, 6, 23),
          endDate: new Date(2025, 6, 30),
          progress: 75,
          color: "#3b82f6",
          parentId: 1
        },
        {
          id: 4,
          name: "Example Task 3",
          startDate: new Date(2025, 7, 1),
          endDate: new Date(2025, 7, 8),
          progress: 50,
          color: "#a855f7",
          parentId: 1
        }
      ]
    },
    {
      id: 5,
      name: "Example Milestone",
      startDate: new Date(2025, 7, 9),
      endDate: new Date(2025, 7, 9),
      progress: 0,
      color: "#000000"
    },
    {
      id: 6,
      name: "New Task 6",
      startDate: new Date(2025, 6, 14),
      endDate: new Date(2025, 6, 16),
      progress: 0,
      color: "#6b7280",
      isExpanded: false
    },
    {
      id: 7,
      name: "New Task 7",
      startDate: new Date(2025, 6, 17),
      endDate: new Date(2025, 6, 19),
      progress: 0,
      color: "#3b82f6"
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Generate timeline dates
  const startDate = new Date(2025, 6, 13); // July 13, 2025
  const endDate = new Date(2025, 7, 10); // August 10, 2025
  const timelineDates = eachDayOfInterval({ start: startDate, end: endDate });

  const toggleTaskExpansion = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, isExpanded: !task.isExpanded }
        : task
    ));
  };

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
      // Edit existing task
      setTasks(tasks.map(task => 
        task.id === selectedTask.id 
          ? { ...task, ...taskData }
          : task
      ));
    } else {
      // Add new task
      const newTask: Task = {
        id: Math.max(...tasks.map(t => t.id)) + 1,
        name: taskData.name || 'New Task',
        startDate: taskData.startDate || new Date(),
        endDate: taskData.endDate || addDays(new Date(), 1),
        progress: taskData.progress || 0,
        color: taskData.color || '#3b82f6'
      };
      setTasks([...tasks, newTask]);
    }
    setIsModalOpen(false);
  };

  const getTaskPosition = (task: Task) => {
    const dayWidth = 48; // Width of each day column
    const startOffset = Math.max(0, Math.floor((task.startDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, Math.floor((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    return {
      left: startOffset * dayWidth,
      width: duration * dayWidth - 4
    };
  };

  const renderTask = (task: Task, level = 0) => {
    const position = getTaskPosition(task);
    const isParent = task.children && task.children.length > 0;
    
    return (
      <React.Fragment key={task.id}>
        <div className="border-b border-border flex">
          {/* Task List Column */}
          <div className="w-80 border-r border-border bg-card">
            <div 
              className="flex items-center h-12 px-4 hover:bg-accent/50 cursor-pointer"
              style={{ paddingLeft: `${level * 24 + 16}px` }}
            >
              <span className="w-8 text-sm text-muted-foreground">{task.id}</span>
              {isParent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-4 h-4 p-0 mr-2"
                  onClick={() => toggleTaskExpansion(task.id)}
                >
                  {task.isExpanded ? 
                    <ChevronDown className="w-3 h-3" /> : 
                    <ChevronRight className="w-3 h-3" />
                  }
                </Button>
              )}
              <span className="flex-1 text-sm">{task.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="w-4 h-4 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => handleEditTask(task)}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* Timeline Column */}
          <div className="flex-1 relative h-12 bg-background">
            <div 
              className="absolute top-2 h-8 rounded flex items-center justify-between px-2 shadow-sm border"
              style={{
                left: position.left,
                width: position.width,
                backgroundColor: task.color
              }}
            >
              {position.width > 60 && (
                <span className="text-xs text-white font-medium truncate">
                  {task.name}
                </span>
              )}
              {task.progress > 0 && position.width > 40 && (
                <Badge variant="secondary" className="text-xs h-4">
                  {task.progress}%
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Render children if expanded */}
        {isParent && task.isExpanded && task.children?.map(child => 
          renderTask(child, level + 1)
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="w-full h-screen bg-background flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={handleAddTask}>
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Open (.gantt file)
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Save As (.gantt file)
            </Button>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import / Export
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="today"
                className="rounded border-border"
              />
              <Label htmlFor="today" className="text-sm">Today</Label>
            </div>
            <select className="text-sm border border-border rounded px-2 py-1 bg-background">
              <option>All Tasks</option>
            </select>
            <select className="text-sm border border-border rounded px-2 py-1 bg-background">
              <option>Project View</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-b border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAddTask}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm">
              Expand all
            </Button>
            <Button variant="outline" size="sm">
              Collapse all
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm">
              <ZoomIn className="w-4 h-4 mr-1" />
              Zoom in
            </Button>
            <Button variant="outline" size="sm">
              <ZoomOut className="w-4 h-4 mr-1" />
              Zoom out
            </Button>
            <Button variant="outline" size="sm">
              <Maximize className="w-4 h-4 mr-1" />
              Zoom to fit
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Headers */}
        <div className="w-full">
          {/* Column Headers */}
          <div className="border-b border-border flex bg-muted/50">
            <div className="w-80 border-r border-border bg-card flex">
              <div className="w-12 flex items-center justify-center border-r border-border">
                <span className="text-xs font-medium">ID</span>
              </div>
              <div className="flex-1 flex items-center px-4">
                <span className="text-xs font-medium">Task Name</span>
              </div>
            </div>
            <div className="flex-1 bg-background">
              {/* Date Headers */}
              <div className="flex border-b border-border">
                <div className="w-48 text-center py-2 text-xs font-medium">2025-07-13</div>
                <div className="w-48 text-center py-2 text-xs font-medium">2025-07-20</div>
                <div className="w-48 text-center py-2 text-xs font-medium">2025-07-27</div>
                <div className="w-48 text-center py-2 text-xs font-medium">2025-08-03</div>
              </div>
              
              {/* Day Numbers */}
              <div className="flex border-b border-border bg-muted/30">
                {timelineDates.map((date, index) => (
                  <div 
                    key={index} 
                    className="w-12 text-center py-1 text-xs border-r border-border last:border-r-0"
                  >
                    {format(date, 'd')}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Tasks */}
          <div className="overflow-auto max-h-[calc(100vh-200px)]">
            {tasks.map(task => renderTask(task))}
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

export default GanttChart;