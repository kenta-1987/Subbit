import { useState, useEffect } from "react";

interface User {
  id: number;
  username: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  monthlyUploads: number;
}

interface Video {
  id: number;
  filename: string;
  status: string;
  fileSize: number;
}

export default function AdminSimple() {
  const [users, setUsers] = useState<User[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
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
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }

      // Fetch videos
      const videosResponse = await fetch('/api/admin/videos');
      if (videosResponse.ok) {
        const videosData = await videosResponse.json();
        setVideos(videosData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: number, plan: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      if (response.ok) {
        // Refresh data
        fetchData();
        alert('プランを更新しました');
      } else {
        alert('更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('エラーが発生しました');
    }
  };

  const deleteVideo = async (videoId: number) => {
    if (!confirm('本当に削除しますか？')) return;

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh data
        fetchData();
        alert('動画を削除しました');
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('エラーが発生しました');
    }
  };

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">管理者ダッシュボード</h1>

      {/* Tab Navigation */}
      <div className="mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 mr-2 rounded ${
            activeTab === "users" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          ユーザー管理 ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-4 py-2 mr-2 rounded ${
            activeTab === "videos" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          動画管理 ({videos.length})
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 rounded ${
            activeTab === "stats" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          統計
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">ユーザー一覧</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">ID</th>
                  <th className="border border-gray-300 px-4 py-2">ユーザー名</th>
                  <th className="border border-gray-300 px-4 py-2">メール</th>
                  <th className="border border-gray-300 px-4 py-2">プラン</th>
                  <th className="border border-gray-300 px-4 py-2">ステータス</th>
                  <th className="border border-gray-300 px-4 py-2">月間アップロード</th>
                  <th className="border border-gray-300 px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="border border-gray-300 px-4 py-2">{user.id}</td>
                    <td className="border border-gray-300 px-4 py-2">{user.username}</td>
                    <td className="border border-gray-300 px-4 py-2">{user.email || "未設定"}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        user.plan === "pro" ? "bg-gold-100 text-gold-800" :
                        user.plan === "creator" ? "bg-purple-100 text-purple-800" :
                        user.plan === "starter" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {user.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        user.subscriptionStatus === "active" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {user.subscriptionStatus}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">{user.monthlyUploads}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <select
                        value={user.plan}
                        onChange={(e) => updateUserPlan(user.id, e.target.value)}
                        className="border rounded px-2 py-1"
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="creator">Creator</option>
                        <option value="pro">Pro</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === "videos" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">動画一覧</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">ID</th>
                  <th className="border border-gray-300 px-4 py-2">ファイル名</th>
                  <th className="border border-gray-300 px-4 py-2">ステータス</th>
                  <th className="border border-gray-300 px-4 py-2">ファイルサイズ</th>
                  <th className="border border-gray-300 px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id}>
                    <td className="border border-gray-300 px-4 py-2">{video.id}</td>
                    <td className="border border-gray-300 px-4 py-2">{video.filename}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        video.status === "completed" ? "bg-green-100 text-green-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {video.status}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {(video.fileSize / (1024 * 1024)).toFixed(1)} MB
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        onClick={() => deleteVideo(video.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">総ユーザー数</h3>
            <div className="text-3xl font-bold text-blue-600">{users.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">総動画数</h3>
            <div className="text-3xl font-bold text-green-600">{videos.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">有料ユーザー</h3>
            <div className="text-3xl font-bold text-purple-600">
              {users.filter(user => user.plan !== "free").length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}