import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function Register() {
  const [step, setStep] = useState(1); // 1: Email registration, 2: Email verification
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  // Password validation
  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "パスワードは8文字以上で入力してください";
    }

    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);

    const conditions = [hasLowercase, hasUppercase, hasNumber, hasSymbol];
    const metConditions = conditions.filter(Boolean).length;

    if (metConditions < 3) {
      return "パスワードは大文字、小文字、数字、記号のうち少なくとも3つを含む必要があります";
    }

    return null;
  };

  const getPasswordStrength = (password: string) => {
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);

    return {
      hasLowercase,
      hasUppercase,
      hasNumber,
      hasSymbol,
      length: password.length >= 8
    };
  };

  const handleEmailRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationToken(data.verificationToken); // In production, this would be sent via email
        setStep(2);
        toast({
          title: "登録メール送信完了",
          description: "メールアドレスに認証リンクを送信しました。",
        });
      } else {
        setError(data.error || "登録に失敗しました");
      }
    } catch (error) {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    // Check password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: verificationToken,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "登録完了",
          description: "ユーザー登録が完了しました。ログインページに移動します。",
        });
        // Redirect to login page or home
        window.location.href = "/";
      } else {
        setError(data.error || "認証に失敗しました");
      }
    } catch (error) {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            ユーザー登録
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Subbitで動画字幕編集を始めましょう
          </p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                メールアドレス登録
              </CardTitle>
              <CardDescription>
                メールアドレスとユーザー名を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailRegistration} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    メールアドレス
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    ユーザー名
                  </label>
                  <Input
                    id="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="mt-1"
                    placeholder="ユーザー名を入力"
                    minLength={3}
                    maxLength={50}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    3-50文字で入力してください
                  </p>
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
                  {loading ? "送信中..." : "認証メールを送信"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                メール認証とパスワード設定
              </CardTitle>
              <CardDescription>
                認証メールを確認し、パスワードを設定してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>開発環境用メモ:</strong><br />
                  認証トークン: <code className="bg-blue-100 px-1 rounded">{verificationToken}</code><br />
                  本番環境では、このトークンはメールで送信されます。
                </p>
              </div>

              <form onSubmit={handleEmailVerification} className="space-y-4">
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

                  {/* Password strength indicator */}
                  {formData.password && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-gray-600">パスワード要件:</div>
                      <div className="space-y-1">
                        <div className={`text-xs flex items-center gap-1 ${passwordStrength.length ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className={`w-3 h-3 rounded-full ${passwordStrength.length ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          8文字以上
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${passwordStrength.hasLowercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className={`w-3 h-3 rounded-full ${passwordStrength.hasLowercase ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          小文字 (a-z)
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${passwordStrength.hasUppercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className={`w-3 h-3 rounded-full ${passwordStrength.hasUppercase ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          大文字 (A-Z)
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className={`w-3 h-3 rounded-full ${passwordStrength.hasNumber ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          数字 (0-9)
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${passwordStrength.hasSymbol ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className={`w-3 h-3 rounded-full ${passwordStrength.hasSymbol ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          記号 (!@#$%^&*)
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        上記のうち少なくとも3つを満たす必要があります
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    パスワード確認
                  </label>
                  <div className="mt-1 relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="pr-10"
                      placeholder="パスワードを再入力"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
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
                  {loading ? "登録中..." : "ユーザー登録完了"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            すでにアカウントをお持ちですか？{" "}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              ログイン
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}