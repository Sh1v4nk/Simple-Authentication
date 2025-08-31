import { Loader2 } from "lucide-react";
const LoadingSpinner = () => {
    return (
        <div>
            <Loader2
                className="h-12 w-12 animate-spin text-white"
                aria-label="Loading..."
            />
            ;
        </div>
    );
};

export default LoadingSpinner;
