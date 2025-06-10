import { Link } from "wouter";

export default function AppFooter() {
  return (
    <footer className="bg-neutral-600 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="font-medium">Subbit</p>
          </div>
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
            <div className="flex space-x-4">
              <Link href="/login">
                <a className="text-sm text-neutral-300 hover:text-white border border-neutral-500 hover:border-neutral-300 px-3 py-1 rounded transition-colors">
                  ログイン
                </a>
              </Link>
              <Link href="/register">
                <a className="text-sm text-neutral-300 hover:text-white border border-neutral-500 hover:border-neutral-300 px-3 py-1 rounded transition-colors">
                  ユーザー登録
                </a>
              </Link>
              <Link href="/admin">
                <a className="text-sm text-neutral-300 hover:text-white border border-neutral-500 hover:border-neutral-300 px-3 py-1 rounded transition-colors">
                  管理者ログイン
                </a>
              </Link>
            </div>
            <div className="text-sm text-neutral-300 text-center">
              <div className="flex flex-wrap justify-center gap-4 mb-2">
                <Link href="/terms">
                  <a className="hover:text-white">特定商取引法</a>
                </Link>
                <Link href="/privacy">
                  <a className="hover:text-white">プライバシーポリシー</a>
                </Link>
              </div>
              <p>© {new Date().getFullYear()} 合同会社アイディアリアル. All rights reserved.</p>
              <p><a href="https://www.ideareal.co.jp" target="_blank" rel="noopener noreferrer" className="hover:text-white">www.ideareal.co.jp</a></p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
