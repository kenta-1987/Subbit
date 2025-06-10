import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, Video, Upload, Edit, Download, CreditCard, Menu, LogOut, User, UserPlus, LogIn, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import logoPath from "@assets/IMG_5122.png";
import iconPath from "@assets/5509AC6B-A729-41CC-AE02-5841DAB2F315.png";

// Type for user object
type UserType = {
  id: number;
  username: string;
  email: string;
  plan: string;
};

export default function AppHeader() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const typedUser = user as UserType;
  const userMenuRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setHelpOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between min-h-[3rem]">
        {/* 左: ハンバーガーメニュー */}
        <div className="relative flex items-center" ref={helpMenuRef}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setHelpOpen(!helpOpen)}
            className="h-8 w-8 p-0 flex items-center justify-center"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {helpOpen && (
            <div className="absolute left-0 top-full mt-2 w-48 bg-white border rounded-md shadow-lg z-[60]">
              {!isAuthenticated && (
                <>
                  <Link href="/register" className="flex items-center px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setHelpOpen(false)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    新規登録
                  </Link>
                  <Link href="/login" className="flex items-center px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setHelpOpen(false)}>
                    <LogIn className="h-4 w-4 mr-2" />
                    ログイン
                  </Link>
                  <div className="border-t my-1"></div>
                </>
              )}
              <Link href="/plans" className="flex items-center px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setHelpOpen(false)}>
                <CreditCard className="h-4 w-4 mr-2" />
                料金プラン
              </Link>
              <Link href="/help" className="flex items-center px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setHelpOpen(false)}>
                <HelpCircle className="h-4 w-4 mr-2" />
                ヘルプ
              </Link>
            </div>
          )}
        </div>

        {/* 中央: ロゴ */}
        <div className="flex items-center justify-center flex-1">
          <Link href="/">
            <div className="flex items-center hover:opacity-80 cursor-pointer">
              <img src={logoPath} alt="Subbit" className="h-12 object-contain" />
            </div>
          </Link>
        </div>

        {/* 右: ユーザーメニューまたはログイン・新規登録 */}
        <nav className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <div className="relative flex items-center" ref={userMenuRef}>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 h-8"
              >
                <User className="h-4 w-4" />
                <span>{typedUser?.username}</span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {typedUser?.plan?.toUpperCase() || 'PRO'}
                </span>
              </Button>
              
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-md shadow-lg z-[60]">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium">{typedUser?.username}</p>
                    <p className="text-xs text-gray-500">{typedUser?.email}</p>
                  </div>
                  <Link href="/dashboard" className="flex items-center px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    ダッシュボード
                  </Link>
                  <Link href="/profile" className="flex items-center px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>
                    <User className="h-4 w-4 mr-2" />
                    プロフィール
                  </Link>
                  <Link href="/plans" className="flex items-center px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    プラン変更
                  </Link>
                  <button 
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 w-full text-left text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  ログイン
                </Button>
              </Link>
              
              <Link href="/register">
                <Button size="sm">
                  新規登録
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}