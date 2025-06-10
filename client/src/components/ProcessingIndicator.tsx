import { Progress } from "@/components/ui/progress";

interface ProcessingIndicatorProps {
  filename: string;
  progress: number;
}

export default function ProcessingIndicator({ 
  filename, 
  progress 
}: ProcessingIndicatorProps) {
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-neutral-600 font-medium">{filename}</span>
        <span className="text-neutral-500">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-4" />
    </div>
  );
}
