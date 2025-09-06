import {
    Button,
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { formatDate } from "@/utils/dateUtils";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

function DashboardPage() {
    const { signout, logoutAllDevices, user, isLoading } = useAuthStore();

    if (!user) return;

    const handleLogout = async () => {
        await signout();
    };

    const handleLogoutFromAllDevices = async () => {
        await logoutAllDevices();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="m-4 w-full max-w-lg animate-border rounded-xl border border-transparent shadow-xl backdrop-blur-xl backdrop-filter [background:conic-gradient(from_var(--border-angle),theme(colors.slate.600/.48)_80%,theme(colors.purple.500)_86%,theme(colors.purple.300)_90%,theme(colors.purple.500)_94%,theme(colors.slate.600/.48))_border-box]"
        >
            <Card className="border-transparent bg-black font-poppins">
                <CardHeader>
                    <CardTitle className="text-center text-2xl font-bold text-white">
                        Dashboard
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Profile Information */}
                    <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                        <h3 className="text-lg font-semibold text-purple-400">
                            Profile Information
                        </h3>
                        <p className="text-sm text-white">
                            <span className="font-bold">User Name:</span>{" "}
                            {user.username}
                        </p>
                        <p className="text-sm text-white">
                            <span className="font-bold">Email:</span> {user.email}
                        </p>
                    </div>

                    {/* Account Activity */}
                    <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                        <h3 className="text-lg font-semibold text-purple-400">
                            Account Activity
                        </h3>
                        <p className="text-sm text-white">
                            <span className="font-bold">Joined:</span>{" "}
                            {formatDate(new Date(user.createdAt))}
                        </p>
                        <p className="text-sm text-white">
                            <span className="font-bold">Last Login:</span>{" "}
                            {formatDate(new Date(user.lastLogin))}
                        </p>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                    <Button
                        onClick={handleLogout}
                        className={`w-full bg-purple-500 transition-colors hover:bg-purple-600 ${
                            isLoading ? "pointer-events-none opacity-50" : ""
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                                Signing Out...
                            </>
                        ) : (
                            "Sign Out"
                        )}
                    </Button>
                    <Button
                        onClick={handleLogoutFromAllDevices}
                        className={`w-full bg-red-500 transition-colors hover:bg-red-600 ${
                            isLoading ? "pointer-events-none opacity-50" : ""
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                                Signing Out from All Devices...
                            </>
                        ) : (
                            "Sign Out from All Devices"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

export default DashboardPage;
