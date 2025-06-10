import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "ログイン成功",
          description: "Subbitへようこそ！",
        });
        
        // Use auth context to manage login state
        login(data);
        
        // Redirect to home page
        window.location.href = "/";
      } else {
        setError(data.error || "ログインに失敗しました");
      }
    } catch (error) {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            ログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Subbitアカウントにサインイン
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              アカウントにログイン
            </CardTitle>
            <CardDescription>
              ユーザー名とパスワードを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  ユーザー名またはメールアドレス
                </label>
                <Input
                  id="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="mt-1"
                  placeholder="ユーザー名またはメールアドレス"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pr-10"
                    placeholder="パスワードを入力"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? "ログイン中..." : "ログイン"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでないですか？{" "}
            <Link href="/register">
              <a className="font-medium text-blue-600 hover:text-blue-500">
                新規登録
              </a>
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            <Link href="/forgot-password">
              <a className="font-medium text-blue-600 hover:text-blue-500">
                パスワードを忘れた方
              </a>
            </Link>
          </p>
        </div>


      </div>
    </div>
  );
}