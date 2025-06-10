import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Video, Settings, BarChart3 } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  monthlyUploads: number;
  currentPeriodEnd: string | null;
}

interface Video {
  id: number;
  filename: string;
  status: string;
  fileSize: number;
  userId: number;
  createdAt: string;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  // Fetch videos
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["/api/admin/videos"],
    retry: false,
  });

  // Update user plan mutation
  const updateUserPlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: number; plan: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, { plan });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "更新完了",
        description: "ユーザープランを更新しました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "プランの更新に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"),
        variant: "destructive"
      });
    }
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/videos/${videoId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      toast({
        title: "削除完了",
        description: "動画を削除しました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "動画の削除に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"),
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatFileSize = (bytes: number) => {
    const MB = bytes / (1024 * 1024);
    return `${MB.toFixed(1)} MB`;
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "free": return "bg-gray-100 text-gray-800";
      case "starter": return "bg-blue-100 text-blue-800";
      case "creator": return "bg-purple-100 text-purple-800";
      case "pro": return "bg-gold-100 text-gold-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "canceled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
          <p className="text-gray-600 mt-2">ユーザーと動画を管理</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6">
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>ユーザー管理</span>
          </Button>
          <Button
            variant={activeTab === "videos" ? "default" : "outline"}
            onClick={() => setActiveTab("videos")}
            className="flex items-center space-x-2"
          >
            <Video className="h-4 w-4" />
            <span>動画管理</span>
          </Button>
          <Button
            variant={activeTab === "stats" ? "default" : "outline"}
            onClick={() => setActiveTab("stats")}
            className="flex items-center space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span>統計</span>
          </Button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>ユーザー一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">読み込み中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>ユーザー名</TableHead>
                      <TableHead>メール</TableHead>
                      <TableHead>プラン</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>月間アップロード</TableHead>
                      <TableHead>期間終了</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email || "未設定"}</TableCell>
                        <TableCell>
                          <Badge className={getPlanBadgeColor(user.plan)}>
                            {user.plan.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(user.subscriptionStatus)}>
                            {user.subscriptionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.monthlyUploads}</TableCell>
                        <TableCell>
                          {user.currentPeriodEnd ? formatDate(user.currentPeriodEnd) : "なし"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.plan}
                            onValueChange={(value) => 
                              updateUserPlanMutation.mutate({ userId: user.id, plan: value })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="starter">Starter</SelectItem>
                              <SelectItem value="creator">Creator</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Videos Tab */}
        {activeTab === "videos" && (
          <Card>
            <CardHeader>
              <CardTitle>動画一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {videosLoading ? (
                <div className="text-center py-8">読み込み中...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>ファイル名</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>ファイルサイズ</TableHead>
                      <TableHead>ユーザーID</TableHead>
                      <TableHead>作成日</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.map((video: Video) => (
                      <TableRow key={video.id}>
                        <TableCell>{video.id}</TableCell>
                        <TableCell className="font-medium">{video.filename}</TableCell>
                        <TableCell>
                          <Badge className={video.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                            {video.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(video.fileSize)}</TableCell>
                        <TableCell>{video.userId}</TableCell>
                        <TableCell>{formatDate(video.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteVideoMutation.mutate(video.id)}
                            disabled={deleteVideoMutation.isPending}
                          >
                            削除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>総ユーザー数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{users.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>総動画数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{videos.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>有料ユーザー</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {users.filter((user: User) => user.plan !== "free").length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}