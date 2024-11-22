import { Loader2 } from "lucide-react";
const LoadingSpinner = () => {
  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <Loader2
        className="h-10 w-10 animate-spin text-white"
        aria-label="Loading..."
      />
      ;
    </div>
  );
};

export default LoadingSpinner;
