import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';

export function InstallPrompt() {
  const { isInstallable, installPWA } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-sm">アプリをインストール</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
        スマホのホーム画面に追加して、いつでも簡単にアクセス
      </p>
      <div className="flex gap-2">
        <Button
          onClick={installPWA}
          size="sm"
          className="flex-1"
        >
          インストール
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDismissed(true)}
        >
          後で
        </Button>
      </div>
    </div>
  );
}