"use client";
import "@daveyplate/better-auth-ui/css";
import "../styles/globals.css";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    return (
        <html lang="pt-BR">
            <body>
                <AuthUIProvider
                    authClient={authClient}
                    navigate={router.push}
                    replace={router.replace}
                    onSessionChange={() => router.refresh()}
                    Link={Link}
                >
                    {children}
                </AuthUIProvider>
            </body>
        </html>
    );
}
