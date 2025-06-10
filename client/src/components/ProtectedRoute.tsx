import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'wouter';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerified?: boolean;
}

export default function ProtectedRoute({ children, requireEmailVerified = true }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Lock className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="mt-4">ログインが必要です</CardTitle>
              <CardDescription>
                この機能を利用するにはログインが必要です
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Link href="/login">
                  <Button className="w-full flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    ログイン
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    新規登録
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-center text-gray-600">
                アカウントをお持ちでない場合は、まず新規登録を行ってください
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (requireEmailVerified && user && !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <Lock className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle className="mt-4">メール認証が必要です</CardTitle>
              <CardDescription>
                この機能を利用するにはメールアドレスの認証が必要です
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                登録時に送信された認証メールを確認し、アカウントを有効化してください。
              </p>
              <Button 
                onClick={() => window.location.href = '/register'} 
                className="w-full"
              >
                認証手続きを完了する
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}