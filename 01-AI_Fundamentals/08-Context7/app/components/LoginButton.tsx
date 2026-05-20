"use client";
import { authClient } from "@/lib/auth-client";
import GitHubIcon from "./GitHubIcon";

export default function LoginButton() {
    return (
        <button
            type="button"
            className="flex items-center gap-2 bg-black text-white hover:bg-gray-800 px-4 py-2 rounded shadow"
            onClick={async () => {
                await authClient.signIn.social({ provider: "github" });
            }}
        >
            <GitHubIcon /> Entrar com GitHub
        </button>
    );
}
