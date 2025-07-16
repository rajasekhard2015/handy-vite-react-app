// Update this page (the content is just a fallback if you fail to update the page)

import { GanttProvider } from '@/contexts/GanttContext';
import ProductionGanttChart from '@/components/ProductionGanttChart';

const Index = () => {
  return (
    <GanttProvider>
      <div className="w-full h-screen">
        <ProductionGanttChart />
      </div>
    </GanttProvider>
  );
};

export default Index;
