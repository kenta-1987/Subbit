import { useState } from "react";
import { create } from "zustand";

interface VideoState {
  videoId: number | null;
  setVideoId: (id: number) => void;
  reset: () => void;
}

const useVideoState = create<VideoState>((set) => ({
  videoId: null,
  setVideoId: (id) => set({ videoId: id }),
  reset: () => set({ videoId: null })
}));

export default useVideoState;
