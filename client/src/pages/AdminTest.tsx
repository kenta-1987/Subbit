import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Users, Video, BarChart3, Settings } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: string;
  createdAt: string;
  storageUsed: number;
  monthlyUploads: number;
}

interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
}

export default function AdminTest() {
  const [users, setUsers] = useState<User[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch users
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const userData = await usersResponse.json();
        setUsers(userData);
      }

      // Fetch revenue stats
      const revenueResponse = await fetch('/api/admin/revenue');
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        setRevenueStats(revenueData);
      }
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const headers = [
      'ID',
      'ユーザー名',
      'メールアドレス',
      'プラン',
      'サブスクリプション状況',
      'プラン終了日',
      '登録日',
      'ストレージ使用量(MB)',
      '月間アップロード数'
    ];
    
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.id,
        `"${user.username}"`,
        `"${user.email}"`,
        user.plan,
        user.subscriptionStatus,
        user.currentPeriodEnd || '未設定',
        new Date(user.createdAt).toLocaleDateString('ja-JP'),
        Math.round(user.storageUsed / 1024 / 1024),
        user.monthlyUploads
      ].join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatBytes = (bytes: number) => {
    return Math.round(bytes / 1024 / 1024) + ' MB';
  };

  const formatCurrency = (amountInCents: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amountInCents / 100);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'starter': return 'bg-blue-100 text-blue-800';
      case 'creator': return 'bg-purple-100 text-purple-800';
      case 'business': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">管理者ダッシュボード</h1>
        
        {/* タブナビゲーション */}
        <div className="flex space-x-4 mb-6">
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            ユーザー管理
          </Button>
          <Button
            variant={activeTab === "videos" ? "default" : "outline"}
            onClick={() => setActiveTab("videos")}
            className="flex items-center gap-2"
          >
            <Video className="h-4 w-4" />
            動画管理
          </Button>
          <Button
            variant={activeTab === "revenue" ? "default" : "outline"}
            onClick={() => setActiveTab("revenue")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            財務統計
          </Button>
          <Button
            variant={activeTab === "settings" ? "default" : "outline"}
            onClick={() => setActiveTab("settings")}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            設定
          </Button>
        </div>

        {/* ユーザー管理タブ */}
        {activeTab === "users" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ユーザー一覧</CardTitle>
              <Button onClick={downloadCSV} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                CSVダウンロード
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>読み込み中...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>ユーザー名</TableHead>
                        <TableHead>メールアドレス</TableHead>
                        <TableHead>プラン</TableHead>
                        <TableHead>登録日</TableHead>
                        <TableHead>ストレージ使用量</TableHead>
                        <TableHead>月間アップロード数</TableHead>
                        <TableHead>サブスクリプション状況</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge className={getPlanColor(user.plan)}>
                              {user.plan.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>{formatBytes(user.storageUsed)}</TableCell>
                          <TableCell>{user.monthlyUploads}</TableCell>
                          <TableCell>
                            <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                              {user.subscriptionStatus === 'active' ? 'アクティブ' : '非アクティブ'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* その他のタブ */}
        {activeTab === "videos" && (
          <Card>
            <CardHeader>
              <CardTitle>動画管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p>アップロードされた動画の管理機能（実装予定）</p>
            </CardContent>
          </Card>
        )}

        {activeTab === "revenue" && (
          <div className="space-y-6">
            {/* 財務統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総売上</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {revenueStats ? formatCurrency(revenueStats.totalRevenue) : '読み込み中...'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    すべての成功した支払いの合計
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">今月の売上</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {revenueStats ? formatCurrency(revenueStats.monthlyRevenue) : '読み込み中...'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">アクティブ契約数</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {revenueStats ? revenueStats.activeSubscriptions : '読み込み中...'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    有料プランの契約者数
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 詳細な財務情報 */}
            <Card>
              <CardHeader>
                <CardTitle>財務詳細</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">累計売上</span>
                    <span className="text-lg font-bold">
                      {revenueStats ? formatCurrency(revenueStats.totalRevenue) : '---'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">今月の売上</span>
                    <span className="text-lg font-bold">
                      {revenueStats ? formatCurrency(revenueStats.monthlyRevenue) : '---'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">アクティブサブスクリプション</span>
                    <span className="text-lg font-bold">
                      {revenueStats ? `${revenueStats.activeSubscriptions}件` : '---'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium">月平均売上（概算）</span>
                    <span className="text-lg font-bold">
                      {revenueStats && revenueStats.activeSubscriptions > 0 
                        ? formatCurrency(Math.round(revenueStats.totalRevenue / Math.max(1, new Date().getMonth() + 1)))
                        : '---'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle>システム設定</CardTitle>
            </CardHeader>
            <CardContent>
              <p>システム設定管理（実装予定）</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}