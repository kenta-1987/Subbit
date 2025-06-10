import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  Upload, 
  Clock, 
  Star, 
  TrendingUp, 
  Calendar,
  Play,
  Edit,
  Download,
  Trash2,
  Eye,
  Settings
} from "lucide-react";
import { Link } from "wouter";
import { PLAN_CONFIGS } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const currentPlan = PLAN_CONFIGS[user.plan as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS.free;
  const usagePercentage = ((user.monthlyUploads || 0) / currentPlan.monthlyUploads) * 100;
  const storageUsed = user.storageUsed || 0;
  const storagePercentage = (storageUsed / currentPlan.storageLimit) * 100;
  
  const formatStorageSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  // Mock data for recent videos - in production this would come from API
  const recentVideos = [
    {
      id: 1,
      title: "商品紹介動画.mp4",
      duration: "2:30",
      status: "completed",
      uploadedAt: "2024-06-01",
      thumbnail: null,
      views: 45
    },
    {
      id: 2,
      title: "チュートリアル.mov",
      duration: "5:15",
      status: "processing",
      uploadedAt: "2024-06-01",
      thumbnail: null,
      views: 0
    },
    {
      id: 3,
      title: "プレゼンテーション.mp4",
      duration: "10:20",
      status: "completed",
      uploadedAt: "2024-05-30",
      thumbnail: null,
      views: 128
    }
  ];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">完了</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">処理中</Badge>;
      case "failed":
        return <Badge variant="destructive">失敗</Badge>;
      default:
        return <Badge variant="outline">不明</Badge>;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
            <p className="text-gray-600 mt-2">動画管理と使用状況を確認</p>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 月間アップロード状況 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">月間アップロード</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user.monthlyUploads}</div>
                <p className="text-xs text-muted-foreground">
                  / {currentPlan.monthlyUploads} 回
                </p>
                <Progress value={usagePercentage} className="mt-2" />
              </CardContent>
            </Card>

            {/* ストレージ使用量 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ストレージ使用量</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatStorageSize(storageUsed)}</div>
                <p className="text-xs text-muted-foreground">
                  / {formatStorageSize(currentPlan.storageLimit)}
                </p>
                <Progress value={storagePercentage} className="mt-2" />
              </CardContent>
            </Card>

            {/* 現在のプラン */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">現在のプラン</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentPlan.name}</div>
                <p className="text-xs text-muted-foreground">
                  {currentPlan.price === 0 ? "無料" : `月額 ¥${currentPlan.price.toLocaleString()}`}
                </p>
              </CardContent>
            </Card>

            {/* 動画数 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">動画数</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentVideos.length}</div>
                <p className="text-xs text-muted-foreground">
                  作成済み動画
                </p>
              </CardContent>
            </Card>

            {/* 総再生回数 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総再生回数</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recentVideos.reduce((sum, video) => sum + video.views, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  合計ビュー数
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 最近の動画 */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>最近の動画</CardTitle>
                    <Link href="/">
                      <Button size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        新しい動画をアップロード
                      </Button>
                    </Link>
                  </div>
                  <CardDescription>
                    最新のアップロード動画と処理状況
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentVideos.map((video) => (
                      <div key={video.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="w-16 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                          <Video className="h-6 w-6 text-gray-400" />
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{video.title}</h4>
                            {getStatusBadge(video.status)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {video.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(video.uploadedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {video.views} 回再生
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {video.status === "completed" && (
                            <>
                              <Button variant="ghost" size="sm">
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {recentVideos.length === 0 && (
                      <div className="text-center py-8">
                        <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">動画がありません</h3>
                        <p className="text-gray-500 mb-4">最初の動画をアップロードして字幕編集を始めましょう</p>
                        <Link href="/">
                          <Button>
                            <Upload className="h-4 w-4 mr-2" />
                            動画をアップロード
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* サイドバー */}
            <div className="space-y-6">
              {/* アカウント情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">アカウント情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">ユーザー名</label>
                    <p className="text-sm text-gray-900">{user.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">メールアドレス</label>
                    <p className="text-sm text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">プラン</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{currentPlan.name}</span>
                      <Badge variant="outline">{user.subscriptionStatus}</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Link href="/profile">
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        プロフィール設定
                      </Button>
                    </Link>
                    <Link href="/plans">
                      <Button variant="outline" size="sm" className="w-full">
                        <Star className="h-4 w-4 mr-2" />
                        プランを変更
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* 使用制限 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">使用制限</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>月間アップロード</span>
                      <span>{user.monthlyUploads}/{currentPlan.monthlyUploads}</span>
                    </div>
                    <Progress value={usagePercentage} />
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>最大動画時間: {Math.floor(currentPlan.maxDuration / 60)}分</p>
                    <p>ウォーターマーク: {currentPlan.hasWatermark ? "あり" : "なし"}</p>
                  </div>

                  {usagePercentage > 80 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        月間制限に近づいています。プランのアップグレードをご検討ください。
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}