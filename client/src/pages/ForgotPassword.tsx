import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);

    try {
      const response = await fetch("/api/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSent(true);
        toast({
          title: "メール送信完了",
          description: "パスワードリセット用のメールを送信しました",
        });
      } else {
        toast({
          title: "エラー",
          description: data.error || "メール送信に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "ネットワークエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mail className="h-6 w-6 text-blue-600" />
              メール送信完了
            </CardTitle>
            <CardDescription>
              パスワードリセット用のリンクをメールで送信しました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>{email}</strong> にパスワードリセット用のリンクを送信しました。
                メールを確認してリンクをクリックしてください。
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-gray-600 space-y-2">
              <p>メールが届かない場合：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>迷惑メールフォルダを確認してください</li>
                <li>数分待ってから再度お試しください</li>
                <li>メールアドレスが正しいか確認してください</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  ログインに戻る
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                onClick={() => setSent(false)}
                className="flex-1"
              >
                再送信
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>パスワードを忘れた場合</CardTitle>
          <CardDescription>
            登録したメールアドレスにパスワードリセット用のリンクを送信します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "送信中..." : "リセットリンクを送信"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
              <ArrowLeft className="h-4 w-4 inline mr-1" />
              ログインに戻る
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}