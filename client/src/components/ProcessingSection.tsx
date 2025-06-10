import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProcessingIndicator from "./ProcessingIndicator";
import ProcessingSteps from "./ProcessingSteps";
import { getVideoStatus } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface ProcessingSectionProps {
  videoId: number | null;
  onProcessingComplete: () => void;
  onCancel: () => void;
}

export default function ProcessingSection({
  videoId,
  onProcessingComplete,
  onCancel
}: ProcessingSectionProps) {
  const { toast } = useToast();
  
  // Fetch video status with error handling
  const { data: videoStatus, error, isError } = useQuery({
    queryKey: ['/api/videos/status', videoId],
    queryFn: () => getVideoStatus(videoId!),
    enabled: !!videoId,
    refetchInterval: 2000, // Poll every 2 seconds
    retry: 3, // リトライを3回まで
    retryDelay: 1000 // 1秒後にリトライ
  });

  useEffect(() => {
    if (isError && error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "動画の処理状況の取得に失敗しました。",
        variant: "destructive"
      });
    }

    if (videoStatus?.status === "completed") {
      onProcessingComplete();
    }
  }, [videoStatus, error, isError, toast, onProcessingComplete]);

  const handleCancel = async () => {
    // In a real app, we would cancel the processing on the server
    onCancel();
  };

  // Determine current processing step
  const getCurrentStep = () => {
    if (!videoStatus) return 1;
    
    switch (videoStatus.currentStep) {
      case "uploading":
        return 1;
      case "transcribing":
        return 2;
      case "generating":
        return 3;
      default:
        return 1;
    }
  };

  return (
    <Card className="bg-white shadow-md p-6 mb-8">
      <CardContent className="p-0">
        <h2 className="text-2xl font-semibold mb-4">処理中...</h2>
        
        <ProcessingIndicator 
          filename={videoStatus?.filename || "動画ファイル"} 
          progress={videoStatus?.progress || 0} 
        />
        
        <div className="border rounded-lg p-4 bg-neutral-50">
          <h3 className="font-medium mb-2 flex items-center">
            <i className="fas fa-robot text-primary mr-2"></i>
            AI処理ステータス
          </h3>
          
          <ProcessingSteps currentStep={getCurrentStep()} />
          
          <div className="mt-4 text-sm text-neutral-500">
            <p>処理には動画の長さに応じて数分から数十分かかる場合があります。</p>
          </div>
        </div>
        
        <Button variant="outline" className="mt-6" onClick={handleCancel}>
          <X className="h-4 w-4 mr-1" />
          キャンセル
        </Button>
      </CardContent>
    </Card>
  );
}
