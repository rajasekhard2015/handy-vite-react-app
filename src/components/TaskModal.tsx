import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Task } from '@/contexts/GanttContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, task }) => {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    progress: 0,
    color: '#3b82f6',
    notes: '',
    priority: 'medium',
    status: 'not-started',
    resources: '',
    dependencies: ''
  });

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        startDate: format(task.startDate, 'yyyy-MM-dd'),
        endDate: format(task.endDate, 'yyyy-MM-dd'),
        progress: task.progress,
        color: task.color,
        notes: task.notes || '',
        priority: task.priority || 'medium',
        status: task.status || 'not-started',
        resources: task.resources?.join(', ') || '',
        dependencies: task.dependencies?.join(', ') || ''
      });
    } else {
      setFormData({
        name: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        progress: 0,
        color: '#3b82f6',
        notes: '',
        priority: 'medium',
        status: 'not-started',
        resources: '',
        dependencies: ''
      });
    }
  }, [task, isOpen]);

  const handleSave = () => {
    const taskData: Partial<Task> = {
      name: formData.name,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      progress: formData.progress,
      color: formData.color,
      notes: formData.notes,
      priority: formData.priority as Task['priority'],
      status: formData.status as Task['status'],
      resources: formData.resources.split(',').map(r => r.trim()).filter(r => r),
      dependencies: formData.dependencies.split(',').map(d => d.trim()).filter(d => d)
    };
    onSave(taskData);
  };

  const handleCancel = () => {
    onClose();
  };

  const colorOptions = [
    { value: '#22c55e', label: 'Green' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#a855f7', label: 'Purple' },
    { value: '#ef4444', label: 'Red' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#6b7280', label: 'Gray' },
    { value: '#000000', label: 'Black' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white bg-primary px-4 py-2 -mx-6 -mt-6 mb-4">
            New Task
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="dependency">Dependency</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskId">ID</Label>
                <Input 
                  id="taskId" 
                  value="0"
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskName">Task Name</Label>
                <Input 
                  id="taskName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="New Task 8"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start</Label>
                <Input 
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End</Label>
                <Input 
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="progress">Progress %</Label>
                <Input 
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-started">Not Started</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
          
          <TabsContent value="dependency" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="dependencies">Dependencies (Task IDs, comma-separated)</Label>
              <Input 
                id="dependencies"
                value={formData.dependencies}
                onChange={(e) => setFormData({ ...formData, dependencies: e.target.value })}
                placeholder="task-1, task-2, task-3"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="resources" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="resources">Resources (comma-separated)</Label>
              <Input 
                id="resources"
                value={formData.resources}
                onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                placeholder="John Doe, Jane Smith, Development Team"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes about this task..."
                rows={6}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            OK
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          Tip: You can edit the "Start" beginning period to shift task end without the popup.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default TaskModal;