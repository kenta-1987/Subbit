import { useState, useEffect, useRef } from "react";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Pencil, 
  Trash2,
  Sparkles,
  Loader2,
  Download,
  Copy,
  Palette,
  Upload,
  Languages
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CaptionData, PLAN_CONFIGS } from "@shared/schema";
import { updateCaption, deleteCaption, generateAICaptions } from "@/lib/api";
import { formatTimeInput, parseTimeInput } from "@/lib/videoUtils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface EditorPanelProps {
  captions: CaptionData[];
  selectedCaption: CaptionData | null;
  onSelectCaption: (caption: CaptionData) => void;
  videoId: number | null;
  onEditChange?: (color: string, size: string, hasBackground?: boolean) => void;
}

export default function EditorPanel({
  captions,
  selectedCaption,
  onSelectCaption,
  videoId,
  onEditChange
}: EditorPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("srt");
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  
  // Get user plan and check if styling is restricted
  const userPlan = (user as any)?.plan || 'free';
  const currentPlan = PLAN_CONFIGS[userPlan as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS.free;
  const isFreePlan = userPlan === 'free';
  
  // Bulk edit states
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkSettings, setBulkSettings] = useState({
    fontSize: isFreePlan ? "medium" : "small",
    color: isFreePlan ? "#FFFFFF" : "#FFFFFF",
    hasBackground: isFreePlan ? false : true
  });
  
  // CSV upload states
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Translation states
  const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);

  // Speaker detection states
  const [speakerDetectionEnabled, setSpeakerDetectionEnabled] = useState(false);
  const [isDetectingSpeakers, setIsDetectingSpeakers] = useState(false);
  const [speakerSettingsOpen, setSpeakerSettingsOpen] = useState(false);
  const [showSpeakerNames, setShowSpeakerNames] = useState(true);
  const [speakers, setSpeakers] = useState<{
    id: string;
    name: string;
    color: string;
    fontSize: string;
  }[]>([]);

  
  // Form state - デフォルトを小・白色・背景ありに設定
  const [editedCaption, setEditedCaption] = useState<{
    text: string;
    startTime: string;
    endTime: string;
    fontSize: string;
    color: string;
    hasBackground: boolean;
  }>({
    text: "",
    startTime: "00:00:00",
    endTime: "00:00:00",
    fontSize: "small",
    color: "#FFFFFF",
    hasBackground: true
  });

  // デフォルト設定：文字小、白色
  const defaultCaptionStyle = {
    hasBackground: true,
    size: "small",
    color: "#FFFFFF"
  };
  
  // Update form when selected caption changes
  useEffect(() => {
    if (selectedCaption) {
      setEditedCaption({
        text: selectedCaption.text,
        startTime: formatTimeInput(selectedCaption.startTime),
        endTime: formatTimeInput(selectedCaption.endTime),
        fontSize: selectedCaption.fontSize,
        color: selectedCaption.color,
        hasBackground: (selectedCaption as any).hasBackground ?? true
      });
    }
  }, [selectedCaption]);
  
  // Update caption mutation
  const updateMutation = useMutation({
    mutationFn: (captionData: { id: number, data: Partial<CaptionData> }) => 
      updateCaption(captionData.id, captionData.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/captions', videoId] });
      toast({
        title: "更新完了",
        description: "テロップが更新されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "テロップの更新に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"),
        variant: "destructive"
      });
    }
  });
  
  // Delete caption mutation
  const deleteMutation = useMutation({
    mutationFn: (captionId: number) => deleteCaption(captionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/captions', videoId] });
      toast({
        title: "削除完了",
        description: "テロップが削除されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "テロップの削除に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"),
        variant: "destructive"
      });
    }
  });
  
  // Handle form changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditedCaption(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    const processedValue = name === 'hasBackground' ? value === 'true' : value;
    
    setEditedCaption(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // リアルタイムプレビュー更新
    if (onEditChange && selectedCaption) {
      const newColor = name === 'color' ? value : editedCaption.color;
      const newSize = name === 'fontSize' ? value : editedCaption.fontSize;
      const newHasBackground = name === 'hasBackground' ? value === 'true' : editedCaption.hasBackground;
      onEditChange(newColor, newSize, newHasBackground);
    }
  };
  
  // Handle save
  const handleSave = () => {
    if (!selectedCaption) return;
    
    try {
      const startTimeMs = parseTimeInput(editedCaption.startTime);
      const endTimeMs = parseTimeInput(editedCaption.endTime);
      
      if (startTimeMs >= endTimeMs) {
        toast({
          title: "時間エラー",
          description: "終了時間は開始時間より後にしてください",
          variant: "destructive"
        });
        return;
      }
      
      updateMutation.mutate({
        id: selectedCaption.id,
        data: {
          text: editedCaption.text,
          startTime: startTimeMs,
          endTime: endTimeMs,
          fontSize: editedCaption.fontSize,
          color: editedCaption.color
        }
      });
    } catch (error) {
      toast({
        title: "入力エラー",
        description: "時間形式が正しくありません。HH:MM:SS形式で入力してください",
        variant: "destructive"
      });
    }
  };
  
  // Handle delete
  const handleDelete = (captionId: number) => {
    if (window.confirm("このテロップを削除してもよろしいですか？")) {
      deleteMutation.mutate(captionId);
    }
  };
  
  // AIによるテロップ自動生成（話者検出機能付き）
  const handleGenerateAICaptions = () => {
    console.log("🔥🔥🔥 handleGenerateAICaptions 関数が呼び出されました");
    console.log("🔥🔥🔥 videoId:", videoId);
    console.log("🔥🔥🔥 speakerDetectionEnabled:", speakerDetectionEnabled);
    
    if (!videoId) {
      toast({
        title: "エラー",
        description: "動画が選択されていません",
        variant: "destructive"
      });
      return;
    }
    
    const message = speakerDetectionEnabled 
      ? "AIを使って動画のテロップを自動生成します（話者検出機能付き）。現在のテロップはすべて置き換えられます。"
      : "AIを使って動画のテロップを自動生成しますか？現在のテロップはすべて置き換えられます。";
    
    console.log("🔥🔥🔥 確認ダイアログを表示:", message);
    
    if (window.confirm(message)) {
      console.log("🔥🔥🔥 ユーザーが確認、API呼び出し開始");
      setIsGeneratingCaptions(true);
      
      console.log("🔥🔥🔥 generateAICaptions を呼び出し中...", {
        videoId,
        enableSpeakerDetection: speakerDetectionEnabled,
        language: 'ja'
      });
      
      generateAICaptions(videoId, undefined, {
        enableSpeakerDetection: speakerDetectionEnabled,
        language: 'ja'
      } as any)
        .then((captions) => {
          queryClient.invalidateQueries({ queryKey: ['/api/captions', videoId] });
          
          // If speaker detection was enabled, initialize speaker settings
          if (speakerDetectionEnabled) {
            const uniqueSpeakers = new Set<string>();
            captions.forEach((caption: any) => {
              const match = caption.text.match(/^話者(\d+)：/);
              if (match) {
                uniqueSpeakers.add(match[1]);
              }
            });
            
            const speakerColors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];
            const detectedSpeakers = Array.from(uniqueSpeakers).map((speakerId, index) => ({
              id: speakerId,
              name: `話者${speakerId}`,
              color: speakerColors[index % speakerColors.length],
              fontSize: "medium"
            }));
            
            setSpeakers(detectedSpeakers);
          }
          
          const successMessage = speakerDetectionEnabled 
            ? "AIによって話者識別付きテロップが生成されました"
            : "AIによって自動生成されたテロップが追加されました";
          toast({
            title: "テロップ生成完了",
            description: successMessage,
            variant: "default"
          });
        })
        .catch((error) => {
          toast({
            title: "テロップの自動生成に失敗しました",
            description: error instanceof Error ? error.message : "不明なエラーが発生しました",
            variant: "destructive"
          });
        })
        .finally(() => {
          setIsGeneratingCaptions(false);
        });
    }
  };

  // 字幕翻訳機能
  const handleTranslateCaptions = async () => {
    if (!videoId) {
      toast({
        title: "エラー",
        description: "動画が選択されていません",
        variant: "destructive"
      });
      return;
    }

    if (captions.length === 0) {
      toast({
        title: "エラー", 
        description: "翻訳する字幕がありません。まず字幕を生成してください。",
        variant: "destructive"
      });
      return;
    }

    setIsTranslating(true);
    
    try {
      const response = await fetch(`/api/videos/${videoId}/translate-captions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetLanguage: selectedLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/captions', videoId] });
      
      toast({
        title: "翻訳完了",
        description: result.message,
      });
      
      setTranslateDialogOpen(false);
      
    } catch (error) {
      toast({
        title: "翻訳失敗",
        description: "字幕の翻訳に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"),
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Speaker detection function with caption generation
  const handleSpeakerDetection = async () => {
    if (!videoId) {
      toast({
        title: "エラー",
        description: "動画が選択されていません",
        variant: "destructive"
      });
      return;
    }

    const message = "既存のテロップに話者識別機能を適用して、話者別の色分けでテロップを再生成します。現在のテロップはすべて置き換えられます。";
    
    if (!window.confirm(message)) {
      return;
    }

    setIsDetectingSpeakers(true);
    
    try {
      // Use the same caption generation endpoint with speaker detection enabled
      const captions = await generateAICaptions(videoId, undefined, {
        enableSpeakerDetection: true,
        language: 'ja'
      } as any);
      
      queryClient.invalidateQueries({ queryKey: ['/api/captions', videoId] });
      
      // Auto-enable speaker detection UI
      setSpeakerDetectionEnabled(true);
      
      // Initialize speakers based on detected speakers in captions
      const uniqueSpeakers = new Set<string>();
      captions.forEach((caption: any) => {
        const match = caption.text.match(/^話者(\d+)：/);
        if (match) {
          uniqueSpeakers.add(match[1]);
        }
      });
      
      const speakerColors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];
      const detectedSpeakers = Array.from(uniqueSpeakers).map((speakerId, index) => ({
        id: speakerId,
        name: `話者${speakerId}`,
        color: speakerColors[index % speakerColors.length],
        fontSize: "medium"
      }));
      
      setSpeakers(detectedSpeakers);
      
      toast({
        title: "話者識別完了",
        description: "話者識別付きテロップが生成されました",
      });
      
    } catch (error) {
      toast({
        title: "話者識別失敗",
        description: "話者識別に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"),
        variant: "destructive",
      });
    } finally {
      setIsDetectingSpeakers(false);
    }
  };

  // Update speaker settings
  const updateSpeakerSettings = (speakerId: string, field: string, value: string) => {
    setSpeakers(prev => prev.map(speaker => 
      speaker.id === speakerId ? { ...speaker, [field]: value } : speaker
    ));
  };

  // Get current speaker from caption text
  const getCurrentSpeaker = (text: string): string => {
    const match = text.match(/^([^：:]+)[：:]/);
    if (match) {
      const speakerName = match[1];
      const speaker = speakers.find(s => s.name === speakerName);
      return speaker ? speaker.id : speakers[0]?.id || "";
    }
    return speakers[0]?.id || "";
  };

  // Handle speaker change for individual caption
  const handleSpeakerChange = (speakerId: string) => {
    const speaker = speakers.find(s => s.id === speakerId);
    if (!speaker || !editedCaption) return;

    let newText = editedCaption.text;
    
    // Remove existing speaker prefix if any
    const hasPrefix = newText.includes('：') || newText.includes(':');
    if (hasPrefix) {
      newText = newText.replace(/^[^：:]+[：:]/, '').trim();
    }
    
    // Add new speaker prefix if showSpeakerNames is enabled
    if (showSpeakerNames) {
      newText = `${speaker.name}： ${newText}`;
    }
    
    setEditedCaption({
      ...editedCaption,
      text: newText,
      color: speaker.color
    });
  };

  // Export captions
  const handleExportCaptions = () => {
    setExportDialogOpen(true);
  };

  // Generate export content
  const generateExportContent = (format: string) => {
    const formatTime = (ms: number) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    };

    if (format === 'txt') {
      return captions.map(caption => 
        `${formatTime(caption.startTime)} - ${formatTime(caption.endTime)}\n${caption.text}`
      ).join('\n\n');
    } else if (format === 'csv') {
      const header = "開始時間,終了時間,テキスト,フォントサイズ,色\n";
      const rows = captions.map(caption => 
        `"${formatTime(caption.startTime)}","${formatTime(caption.endTime)}","${caption.text}","${caption.fontSize}","${caption.color}"`
      ).join('\n');
      return header + rows;
    }
    return '';
  };

  // Download export file
  const downloadExport = () => {
    const content = generateExportContent(exportFormat);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `captions.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "✅ テロップを出力しました",
      description: `${exportFormat.toUpperCase()}形式でダウンロードされました`,
    });
    setExportDialogOpen(false);
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const content = generateExportContent(exportFormat);
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "✅ クリップボードにコピーしました",
        description: "テロップ内容をコピーしました",
      });
      setExportDialogOpen(false);
    });
  };

  // Bulk edit functionality
  const handleBulkEdit = async () => {
    if (captions.length === 0) return;
    
    try {
      // Force Free plan settings if user is on Free plan
      const finalSettings = isFreePlan ? {
        fontSize: "medium",
        color: "#FFFFFF", 
        hasBackground: false
      } : bulkSettings;
      
      const promises = captions.map(caption => 
        updateCaption(caption.id, {
          text: caption.text,
          startTime: caption.startTime,
          endTime: caption.endTime,
          fontSize: finalSettings.fontSize,
          color: finalSettings.color,
          hasBackground: finalSettings.hasBackground
        })
      );
      
      await Promise.all(promises);
      
      // Invalidate and refetch caption data
      queryClient.invalidateQueries({ queryKey: ['/api/captions', videoId] });
      
      toast({
        title: "一括変更完了",
        description: `${captions.length}個のテロップを一括変更しました`,
      });
      setBulkEditOpen(false);
    } catch (error) {
      toast({
        title: "一括変更失敗",
        description: "テロップの一括変更に失敗しました",
        variant: "destructive",
      });
    }
  };

  // CSV upload functionality
  const handleCsvUpload = async () => {
    if (!csvFile || !videoId) return;
    
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const header = lines[0];
      
      // Parse CSV header to ensure correct format
      if (!header.includes('開始時間') || !header.includes('終了時間') || !header.includes('テキスト')) {
        toast({
          title: "❌ CSVフォーマットエラー",
          description: "正しいCSV形式でアップロードしてください",
          variant: "destructive",
        });
        return;
      }
      
      // Delete existing captions
      for (const caption of captions) {
        await deleteCaption(caption.id);
      }
      
      // Parse and create new captions
      const newCaptions = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const matches = line.match(/"([^"]*)"/g);
        if (matches && matches.length >= 3) {
          const startTime = matches[0].replace(/"/g, '');
          const endTime = matches[1].replace(/"/g, '');
          const text = matches[2].replace(/"/g, '');
          const fontSize = matches[3]?.replace(/"/g, '') || 'small';
          const color = matches[4]?.replace(/"/g, '') || '#FFFFFF';
          
          const startMs = parseTimeInput(startTime);
          const endMs = parseTimeInput(endTime);
          
          newCaptions.push({
            videoId,
            startTime: startMs,
            endTime: endMs,
            text,
            fontSize,
            color,
            hasBackground: true
          });
        }
      }
      
      // Create new captions via API
      const createCaptionPromises = newCaptions.map(caption => 
        fetch('/api/captions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(caption)
        })
      );
      
      await Promise.all(createCaptionPromises);
      queryClient.invalidateQueries({ queryKey: ['/api/videos', videoId, 'captions'] });
      
      toast({
        title: "✅ CSVアップロード完了",
        description: `${newCaptions.length}個のテロップを読み込みました`,
      });
      setCsvUploadOpen(false);
      setCsvFile(null);
    } catch (error) {
      toast({
        title: "❌ CSVアップロード失敗",
        description: "CSVファイルの処理に失敗しました",
        variant: "destructive",
      });
    }
  };

  // Drag handlers for dialog
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - dialogPosition.x,
      y: e.clientY - dialogPosition.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setDialogPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  
  return (
    <Card className="editor-panel w-full md:w-2/5 bg-white rounded-lg shadow-md overflow-hidden">
      <CardHeader className="border-b border-neutral-200 p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <CardTitle className="font-medium text-base sm:text-lg whitespace-nowrap">テロップ編集</CardTitle>
          <div className="flex flex-col gap-2">
            {/* 話者検出設定 */}
            <div className="p-2 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="speakerDetection"
                  checked={speakerDetectionEnabled}
                  onChange={(e) => setSpeakerDetectionEnabled(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="speakerDetection" className="text-sm font-medium">
                  🎤 話者識別機能
                </label>
                {speakerDetectionEnabled && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    有効
                  </span>
                )}
              </div>
              
              {speakerDetectionEnabled && (
                <div className="flex items-center gap-2 pl-6">
                  <input
                    type="checkbox"
                    id="showSpeakerNames"
                    checked={showSpeakerNames}
                    onChange={(e) => setShowSpeakerNames(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="showSpeakerNames" className="text-xs text-gray-600">
                    話者名を表示（話者1:など）
                  </label>
                </div>
              )}
              
              <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                ⚠️ 話者識別は完全に話者を判別できるものではありません。必要に応じてテロップ編集から修正をしてください。
              </div>
            </div>

            <Button 
              onClick={handleGenerateAICaptions} 
              variant="outline" 
              disabled={isGeneratingCaptions || !videoId}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 text-sm px-3 py-2 w-full"
            >
              {isGeneratingCaptions ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {speakerDetectionEnabled ? "話者検出中..." : "生成中..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {speakerDetectionEnabled ? "🎤 AI話者識別生成" : "🎵 AIテロップ生成"}
                </>
              )}
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setBulkEditOpen(true)}
                variant="outline"
                disabled={captions.length === 0}
                className="flex items-center gap-2 text-sm px-3 py-2"
              >
                <Palette className="h-4 w-4" />
                一括変更
              </Button>
              
              <Button
                onClick={() => setTranslateDialogOpen(true)}
                variant="outline"
                disabled={captions.length === 0}
                className="flex items-center gap-2 text-sm px-3 py-2"
              >
                <Languages className="h-4 w-4" />
                翻訳
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleSpeakerDetection}
                variant="outline"
                disabled={captions.length === 0 || isDetectingSpeakers}
                className="flex items-center gap-2 text-sm px-3 py-2"
              >
                {isDetectingSpeakers ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                話者判別
              </Button>
              
              {speakerDetectionEnabled && speakers.length > 0 ? (
                <Button
                  onClick={() => setSpeakerSettingsOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2 text-sm px-3 py-2"
                >
                  <Palette className="h-4 w-4" />
                  話者設定
                </Button>
              ) : (
                <div className="text-sm px-3 py-2 text-gray-400">
                  {speakers.length > 0 ? "設定可能" : ""}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setCsvUploadOpen(true)}
                variant="outline"
                className="flex items-center gap-2 text-sm px-3 py-2"
              >
                <Upload className="h-4 w-4" />
                CSV
              </Button>
              
              <Button
                onClick={handleExportCaptions}
                variant="outline"
                disabled={captions.length === 0}
                className="flex items-center gap-2 text-sm px-3 py-2"
              >
                <Download className="h-4 w-4" />
                出力
              </Button>
            </div>
            

          </div>
        </div>
      </CardHeader>
      

      
      {/* Caption list */}
      <div className="h-96 overflow-y-auto">
        {captions.map(caption => (
          <div key={caption.id}>
            <div 
              className={`p-4 border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer ${
                selectedCaption?.id === caption.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => onSelectCaption(caption)}
            >
              <div className="flex justify-between mb-2">
                <span className="text-xs text-neutral-500">
                  {formatTimeInput(caption.startTime)} - {formatTimeInput(caption.endTime)}
                </span>
                <div className="space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-neutral-400 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCaption(caption);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-neutral-400 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(caption.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-neutral-700">{caption.text}</p>
            </div>
            
            {/* Inline edit form - shows right below selected caption */}
            {selectedCaption?.id === caption.id && (
              <div className="p-4 border-b border-neutral-200 bg-blue-50">
                <h4 className="font-medium mb-3 text-blue-900">テロップを編集</h4>
                
                {isFreePlan && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                    <p className="text-sm text-yellow-800">
                      Freeプランでは字幕スタイルが固定されています（白文字・中サイズ・背景なし）
                    </p>
                  </div>
                )}
                
                {/* 話者選択 */}
                {speakerDetectionEnabled && speakers.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-600 mb-1">話者</label>
                    <Select
                      value={getCurrentSpeaker(editedCaption.text)}
                      onValueChange={handleSpeakerChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="話者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {speakers.map((speaker) => (
                          <SelectItem key={speaker.id} value={speaker.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: speaker.color }}
                              />
                              {speaker.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-600 mb-1">テキスト</label>
                  <Textarea
                    rows={3}
                    name="text"
                    value={editedCaption.text}
                    onChange={handleInputChange}
                    className="w-full border border-neutral-300 rounded p-2 focus:border-primary"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">開始時間</label>
                    <Input
                      type="text"
                      name="startTime"
                      value={editedCaption.startTime}
                      onChange={handleInputChange}
                      placeholder="00:00:00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">終了時間</label>
                    <Input
                      type="text"
                      name="endTime"
                      value={editedCaption.endTime}
                      onChange={handleInputChange}
                      placeholder="00:00:00"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">サイズ</label>
                    <Select
                      value={editedCaption.fontSize}
                      onValueChange={(value) => handleSelectChange("fontSize", value)}
                      disabled={isFreePlan}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="サイズを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">小</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="large">大</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-600 mb-1">色</label>
                    <Select
                      value={editedCaption.color}
                      onValueChange={(value) => handleSelectChange("color", value)}
                      disabled={isFreePlan}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="色を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="#FFFFFF">白</SelectItem>
                        <SelectItem value="#000000">黒</SelectItem>
                        <SelectItem value="#FF0000">赤</SelectItem>
                        <SelectItem value="#FF69B4">ピンク</SelectItem>
                        <SelectItem value="#808080">グレー</SelectItem>
                        <SelectItem value="#FFFF00">黄</SelectItem>
                        <SelectItem value="#0000FF">青</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-600 mb-1">背景</label>
                  <Select
                    value={editedCaption.hasBackground ? "true" : "false"}
                    onValueChange={(value) => handleSelectChange("hasBackground", value)}
                    disabled={isFreePlan}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="背景を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">半透明黒背景あり</SelectItem>
                      <SelectItem value="false">背景なし</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Speaker selection (only show when speaker detection is enabled) */}
                {speakerDetectionEnabled && speakers.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-600 mb-1">話者</label>
                    <Select
                      value={getCurrentSpeaker(editedCaption.text)}
                      onValueChange={(speakerId) => handleSpeakerChange(speakerId)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="話者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {speakers.map((speaker) => (
                          <SelectItem key={speaker.id} value={speaker.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: speaker.color }}
                              />
                              {speaker.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        保存中...
                      </>
                    ) : (
                      "保存"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset form and deselect caption
                      if (selectedCaption) {
                        setEditedCaption({
                          text: selectedCaption.text,
                          startTime: formatTimeInput(selectedCaption.startTime),
                          endTime: formatTimeInput(selectedCaption.endTime),
                          fontSize: selectedCaption.fontSize,
                          color: selectedCaption.color,
                          hasBackground: (selectedCaption as any).hasBackground ?? true
                        });
                      }
                      onSelectCaption(caption); // This will deselect if same caption is clicked
                    }}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {captions.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            テロップが見つかりません。生成中または処理エラーが発生した可能性があります。
          </div>
        )}
      </div>




      {/* 一括変更ダイアログ */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>テロップ一括変更</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isFreePlan && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                <p className="text-sm text-yellow-800">
                  Freeプランでは字幕スタイルが固定されています（白文字・中サイズ・背景なし）
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">文字サイズ</label>
              <Select 
                value={bulkSettings.fontSize} 
                onValueChange={(value) => setBulkSettings(prev => ({...prev, fontSize: value}))}
                disabled={isFreePlan}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">小</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="large">大</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">文字色</label>
              <Select 
                value={bulkSettings.color} 
                onValueChange={(value) => setBulkSettings(prev => ({...prev, color: value}))}
                disabled={isFreePlan}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="#FFFFFF">白</SelectItem>
                  <SelectItem value="#000000">黒</SelectItem>
                  <SelectItem value="#FF0000">赤</SelectItem>
                  <SelectItem value="#00FF00">緑</SelectItem>
                  <SelectItem value="#0000FF">青</SelectItem>
                  <SelectItem value="#FFFF00">黄色</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="bulkBackground"
                checked={bulkSettings.hasBackground}
                onChange={(e) => setBulkSettings(prev => ({...prev, hasBackground: e.target.checked}))}
                disabled={isFreePlan}
                className="w-4 h-4"
              />
              <label htmlFor="bulkBackground" className="text-sm font-medium">
                背景を表示する
              </label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleBulkEdit}>
                {captions.length}個のテロップを変更
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* エクスポートダイアログ */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>テロップ出力</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">出力形式</label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="txt">TXT形式</SelectItem>
                  <SelectItem value="csv">CSV形式</SelectItem>
                  <SelectItem value="srt">SRT形式</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-1">プレビュー:</p>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono h-32 overflow-y-auto">
                {exportFormat === 'txt' && captions.length > 0 && (
                  <>
                    {captions.slice(0, 2).map(caption => (
                      <div key={caption.id} className="mb-2">
                        {`${Math.floor(caption.startTime/1000/60).toString().padStart(2,'0')}:${Math.floor((caption.startTime/1000)%60).toString().padStart(2,'0')} - ${Math.floor(caption.endTime/1000/60).toString().padStart(2,'0')}:${Math.floor((caption.endTime/1000)%60).toString().padStart(2,'0')}`}<br/>
                        {caption.text}
                      </div>
                    ))}
                    {captions.length > 2 && '...'}
                  </>
                )}
                {exportFormat === 'csv' && captions.length > 0 && (
                  <>
                    <div>開始時間,終了時間,テキスト,フォントサイズ,色</div>
                    {captions.slice(0, 2).map(caption => (
                      <div key={caption.id}>
                        "{Math.floor(caption.startTime/1000/60).toString().padStart(2,'0')}:{Math.floor((caption.startTime/1000)%60).toString().padStart(2,'0')}","{Math.floor(caption.endTime/1000/60).toString().padStart(2,'0')}:{Math.floor((caption.endTime/1000)%60).toString().padStart(2,'0')}","{caption.text}","{caption.fontSize}","{caption.color}"
                      </div>
                    ))}
                    {captions.length > 2 && '...'}
                  </>
                )}
                {exportFormat === 'srt' && captions.length > 0 && (
                  <>
                    {captions.slice(0, 2).map((caption, index) => (
                      <div key={caption.id} className="mb-2">
                        {index + 1}<br/>
                        {`${Math.floor(caption.startTime/1000/60/60).toString().padStart(2,'0')}:${Math.floor(caption.startTime/1000/60%60).toString().padStart(2,'0')}:${Math.floor((caption.startTime/1000)%60).toString().padStart(2,'0')},000 --> ${Math.floor(caption.endTime/1000/60/60).toString().padStart(2,'0')}:${Math.floor(caption.endTime/1000/60%60).toString().padStart(2,'0')}:${Math.floor((caption.endTime/1000)%60).toString().padStart(2,'0')},000`}<br/>
                        {caption.text}
                      </div>
                    ))}
                    {captions.length > 2 && '...'}
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={copyToClipboard}>
                クリップボードにコピー
              </Button>
              <Button onClick={downloadExport}>
                ダウンロード
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSVアップロードダイアログ */}
      <Dialog open={csvUploadOpen} onOpenChange={setCsvUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>CSVテロップアップロード</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="mb-2">CSVファイルの形式:</p>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                開始時間,終了時間,テキスト,フォントサイズ,色<br/>
                "00:00:01","00:00:03","こんにちは","small","#FFFFFF"<br/>
                "00:00:05","00:00:07","世界","medium","#FF0000"
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">CSVファイルを選択</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            
            {csvFile && (
              <div className="text-sm text-green-600">
                選択されたファイル: {csvFile.name}
              </div>
            )}
            
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-sm text-amber-800">
                ⚠️ 既存のテロップはすべて削除され、CSVファイルの内容に置き換えられます。
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setCsvUploadOpen(false)}>
                キャンセル
              </Button>
              <Button 
                onClick={handleCsvUpload}
                disabled={!csvFile}
              >
                アップロード
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 翻訳ダイアログ */}
      <Dialog open={translateDialogOpen} onOpenChange={setTranslateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              字幕翻訳
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                翻訳先言語を選択
              </label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="言語を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">日本語（校正・修正）</SelectItem>
                  <SelectItem value="en">英語 (English)</SelectItem>
                  <SelectItem value="zh">中国語簡体字 (简体中文)</SelectItem>
                  <SelectItem value="zh-TW">中国語繁体字 (繁體中文)</SelectItem>
                  <SelectItem value="ko">韓国語 (한국어)</SelectItem>
                  <SelectItem value="es">スペイン語 (Español)</SelectItem>
                  <SelectItem value="fr">フランス語 (Français)</SelectItem>
                  <SelectItem value="de">ドイツ語 (Deutsch)</SelectItem>
                  <SelectItem value="pt">ポルトガル語 (Português)</SelectItem>
                  <SelectItem value="ru">ロシア語 (Русский)</SelectItem>
                  <SelectItem value="ar">アラビア語 (العربية)</SelectItem>
                  <SelectItem value="hi">ヒンディー語 (हिन्दी)</SelectItem>
                  <SelectItem value="th">タイ語 (ไทย)</SelectItem>
                  <SelectItem value="vi">ベトナム語 (Tiếng Việt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                現在の字幕を選択した言語に翻訳します。
                <br />
                翻訳対象: {captions.length}件の字幕
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setTranslateDialogOpen(false)}
                disabled={isTranslating}
              >
                キャンセル
              </Button>
              <Button 
                onClick={handleTranslateCaptions}
                disabled={isTranslating}
                className="flex items-center gap-2"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    翻訳中...
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4" />
                    翻訳開始
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Speaker Settings Dialog */}
      <Dialog open={speakerSettingsOpen} onOpenChange={setSpeakerSettingsOpen}>
        <DialogContent className="max-w-sm w-[90vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>話者設定</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            
            {/* Show speaker names toggle */}
            <div className="p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">話者名を表示</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSpeakerNames}
                    onChange={(e) => setShowSpeakerNames(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full relative transition-colors ${showSpeakerNames ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${showSpeakerNames ? 'translate-x-5' : ''}`}></div>
                  </div>
                </label>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                オフにすると「話者1：」などの話者名なしでテロップが表示されます
              </p>
            </div>
            {speakers.map((speaker, index) => (
              <div key={speaker.id} className="p-3 border rounded-lg">
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium">話者名</label>
                    <Input
                      value={speaker.name}
                      onChange={(e) => updateSpeakerSettings(speaker.id, 'name', e.target.value)}
                      placeholder={`話者${index + 1}`}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium">文字色</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="color"
                        value={speaker.color}
                        onChange={(e) => updateSpeakerSettings(speaker.id, 'color', e.target.value)}
                        className="w-10 h-8 rounded border"
                      />
                      <Input
                        value={speaker.color}
                        onChange={(e) => updateSpeakerSettings(speaker.id, 'color', e.target.value)}
                        placeholder="#000000"
                        className="flex-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium">文字サイズ</label>
                    <Select 
                      value={speaker.fontSize} 
                      onValueChange={(value) => updateSpeakerSettings(speaker.id, 'fontSize', value)}
                    >
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">小</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="large">大</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="p-2 bg-gray-100 rounded text-xs">
                    プレビュー: <span style={{ color: speaker.color, fontSize: speaker.fontSize === 'small' ? '12px' : speaker.fontSize === 'medium' ? '14px' : '16px' }}>
                      {speaker.name}: サンプルテキスト
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex justify-end gap-2 pt-3 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setSpeakerSettingsOpen(false)} className="text-sm h-8">
                キャンセル
              </Button>
              <Button onClick={async () => {
                try {
                  // Apply speaker settings to captions
                  const promises = captions.map(async (caption, index) => {
                    // Assign speakers based on the detection pattern
                    const speakerIndex = index % speakers.length;
                    const speaker = speakers[speakerIndex];
                    
                    if (speaker) {
                      // Check if the text already has speaker prefix
                      const hasPrefix = caption.text.includes('：') || caption.text.includes(':');
                      let updatedText = caption.text;
                      
                      if (showSpeakerNames) {
                        if (!hasPrefix) {
                          updatedText = `${speaker.name}：${caption.text}`;
                        } else {
                          // Replace existing speaker prefix
                          updatedText = caption.text.replace(/^[^：:]+[：:]/, `${speaker.name}：`);
                        }
                      } else {
                        // Remove speaker prefix if it exists
                        if (hasPrefix) {
                          updatedText = caption.text.replace(/^[^：:]+[：:]/, '').trim();
                        }
                        // If no prefix exists, keep the text as is
                      }
                      
                      await updateCaption(caption.id, {
                        text: updatedText,
                        color: speaker.color,
                        fontSize: speaker.fontSize,
                        startTime: caption.startTime,
                        endTime: caption.endTime,
                        hasBackground: caption.hasBackground
                      });
                    }
                  });
                  
                  await Promise.all(promises);
                  queryClient.invalidateQueries({ queryKey: ['/api/captions', videoId] });
                  
                  setSpeakerSettingsOpen(false);
                  toast({
                    title: "話者設定を保存しました",
                    description: "字幕に話者情報が反映されます",
                  });
                } catch (error) {
                  toast({
                    title: "保存に失敗しました",
                    description: "話者設定の保存に失敗しました",
                    variant: "destructive",
                  });
                }
              }} className="text-sm h-8">
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
