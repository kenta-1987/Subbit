import { useState } from "react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, X, Eye, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportVideo } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { ExportSettings } from "@shared/schema";

interface ExportSectionProps {
  videoId: number | null;
  onCancel: () => void;
  onExportComplete: () => void;
  onHome?: () => void;
}

export default function ExportSection({
  videoId,
  onCancel,
  onExportComplete,
  onHome
}: ExportSectionProps) {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<ExportSettings>({
    format: "mp4",
    quality: "medium",
    resolution: "original",
    defaultFont: "NotoSansJP",
    backgroundStyle: "semi-transparent",
    position: "bottom",
    accessibilityMode: false
  });
  
  const handleChange = (setting: keyof ExportSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => exportVideo(videoId!, settings),
    onSuccess: (data) => {
      // Create download link
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "エクスポート完了",
        description: "動画のエクスポートが完了しました",
      });
      
      onExportComplete();
    },
    onError: (error) => {
      toast({
        title: "エクスポートエラー",
        description: error instanceof Error ? error.message : "動画のエクスポート中にエラーが発生しました",
        variant: "destructive"
      });
    }
  });
  
  const handleExport = () => {
    if (!videoId) {
      toast({
        title: "エラー",
        description: "動画が選択されていません",
        variant: "destructive"
      });
      return;
    }
    
    exportMutation.mutate();
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-md p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl font-semibold">エクスポート設定</CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">動画設定</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">ファイル形式</label>
                <Select
                  value={settings.format}
                  onValueChange={(value) => handleChange("format", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="形式を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="mov">MOV</SelectItem>
                    <SelectItem value="avi">AVI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">品質</label>
                <Select
                  value={settings.quality}
                  onValueChange={(value) => handleChange("quality", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="品質を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低 (小さいファイルサイズ)</SelectItem>
                    <SelectItem value="medium">中 (推奨)</SelectItem>
                    <SelectItem value="high">高 (大きいファイルサイズ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-1">解像度</label>
                <Select
                  value={settings.resolution}
                  onValueChange={(value) => handleChange("resolution", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="解像度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">元の解像度を維持</SelectItem>
                    <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                    <SelectItem value="720p">720p (1280x720)</SelectItem>
                    <SelectItem value="480p">480p (854x480)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">テロップスタイルについて</h4>
              <p className="text-sm text-blue-700">
                テロップの色、サイズ、位置はプレビュー画面で編集したスタイルがそのまま適用されます。<br/>
                エクスポート前にプレビューでスタイルを確認してください。
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between space-x-2 mt-6 px-0 pb-0">
        {onHome && (
          <Button variant="outline" onClick={onHome}>
            <Home className="h-4 w-4 mr-1" />
            ホーム
          </Button>
        )}
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            キャンセル
          </Button>
          <Button 
            className="bg-accent hover:bg-amber-600 text-neutral-800"
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-1" />
            エクスポート開始
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
