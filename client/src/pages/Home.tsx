import { useState } from "react";
import UploadSection from "@/components/UploadSection";
import ProcessingSection from "@/components/ProcessingSection";
import EditorWorkspace from "@/components/EditorWorkspace";
import ExportSection from "@/components/ExportSection";
import VideoPreview from "@/components/VideoPreview";
import ProtectedRoute from "@/components/ProtectedRoute";
import useVideoState from "@/hooks/useVideoState";

export type AppView = "upload" | "processing" | "editor" | "preview" | "export";

export default function Home() {
  const [currentView, setCurrentView] = useState<AppView>("upload");
  const videoState = useVideoState();
  
  return (
    <ProtectedRoute>
      <main className="container mx-auto px-4 py-6">
        {currentView === "upload" && (
          <UploadSection 
            onUploadStart={() => setCurrentView("processing")} 
          />
        )}
        
        {currentView === "processing" && (
          <ProcessingSection 
            videoId={videoState.videoId}
            onProcessingComplete={() => setCurrentView("editor")}
            onCancel={() => {
              videoState.reset();
              setCurrentView("upload");
            }}
          />
        )}
        
        {currentView === "editor" && (
          <EditorWorkspace 
            videoId={videoState.videoId}
            onExport={() => setCurrentView("export")}
            onHome={() => {
              videoState.reset();
              setCurrentView("upload");
            }}
          />
        )}
        
        {currentView === "export" && (
          <ExportSection 
            videoId={videoState.videoId}
            onCancel={() => setCurrentView("editor")}
            onExportComplete={() => setCurrentView("editor")}
            onHome={() => {
              videoState.reset();
              setCurrentView("upload");
            }}
          />
        )}
        
        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2025 <a href="https://www.ideareal.co.jp" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">合同会社アイディアリアル</a>. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </ProtectedRoute>
  );
}
