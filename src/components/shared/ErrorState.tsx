import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
}

export function ErrorState({
  message = "Failed to load clinical data.",
}: ErrorStateProps) {
  const queryClient = useQueryClient();
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
      <AlertCircle className="w-10 h-10 text-[#E8403A] mb-3" />
      <p className="text-[#F1F3F7] font-medium mb-1">Error loading data</p>
      <p className="text-[#9CA3AF] text-sm mb-4 max-w-xs">{message}</p>
      <button
        onClick={() => queryClient.invalidateQueries()}
        className="flex items-center gap-2 px-4 py-2 bg-[#1E2333] border border-[#2A3044] rounded text-sm text-[#F1F3F7] hover:bg-[#2A3044] transition-colors duration-150"
        aria-label="Retry loading data"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}
