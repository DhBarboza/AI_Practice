"use client";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import LoginButton from "./components/LoginButton";
import LogoutButton from "./components/LogoutButton";

export default function Home() {
    const [session, setSession] = useState<any>(null);
    useEffect(() => {
        authClient.getSession().then(setSession);
    }, []);

    return (
        <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="p-8 rounded shadow bg-white flex flex-col items-center gap-4">
                <h1 className="text-2xl font-bold">Hello World</h1>
                {session?.user ? (
                    <>
                        <div className="text-gray-700">
                            Logado como{" "}
                            <b>{session.user.email || session.user.name}</b>
                        </div>
                        <LogoutButton />
                    </>
                ) : (
                    <>
                        <div className="text-gray-500">
                            Você não está logado.
                        </div>
                        <LoginButton />
                    </>
                )}
            </div>
        </main>
    );
}
