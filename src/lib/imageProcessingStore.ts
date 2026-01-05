import { create } from 'zustand';

interface ImageProcessingState {
  totalImages: number;
  processedImages: number;
  processingActive: boolean;
  setTotalImages: (count: number) => void;
  incrementProcessed: () => void;
  reset: () => void;
}

export const useImageProcessingStore = create<ImageProcessingState>((set) => ({
  totalImages: 0,
  processedImages: 0,
  processingActive: false,
  setTotalImages: (count) => set({ totalImages: count, processedImages: 0, processingActive: count > 0 }),
  incrementProcessed: () => set((state) => {
    const newProcessed = state.processedImages + 1;
    return {
      processedImages: newProcessed,
      processingActive: newProcessed < state.totalImages,
    };
  }),
  reset: () => set({ totalImages: 0, processedImages: 0, processingActive: false }),
}));
