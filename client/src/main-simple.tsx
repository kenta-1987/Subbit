import { createRoot } from "react-dom/client";

function SimpleApp() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Subbit - テスト画面</h1>
      <p>アプリケーションが正常に読み込まれました。</p>
      <button onClick={() => alert("動作確認完了")}>
        クリックテスト
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<SimpleApp />);